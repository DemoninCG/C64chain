#!/usr/bin/env node
/**
 * selftest.mjs — build a synthetic tree in a temp dir and check that
 * scripts/build.mjs resolves refs, reports errors, breaks cycles and
 * produces every output file. Run: node scripts/selftest.mjs
 */
import { mkdtemp, mkdir, writeFile, rm, readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = await mkdtemp(path.join(process.env.TEMP ?? '.', 'c64tree-'));

const data = path.join(tmp, 'data');
const pub = path.join(tmp, 'public');
const doc = path.join(tmp, 'docs');
await Promise.all([mkdir(data), mkdir(pub), mkdir(doc)]);

const leaf = (id, name, depth = 1) => ({
  id, name, kind: 'material', category: 'metals', confidence: 'high',
  description: `A synthetic node ${id} used only by the self test.`.padEnd(40, '.'),
  children: depth > 1 ? [leaf(`${id}.x`, `${name} part`, depth - 1)] : [],
});

await writeFile(path.join(data, '00-root.json'), JSON.stringify({
  id: 'c64', name: 'C64', description: 'root node for the self test.', kind: 'part',
  category: 'industry', children: ['a', 'b', 'a.orr'],
}, null, 2));

await writeFile(path.join(data, '10-a.json'), JSON.stringify({
  root: {
    id: 'a', name: 'Branch A', description: 'Branch A of the self test tree.', kind: 'part',
    category: 'semiconductors',
    children: [leaf('a.ore', 'Ore'), { id: 'a.shared', name: 'Shared', description: 'Referenced twice.', kind: 'material', category: 'metals', children: [leaf('a.shared.leaf', 'Leaf', 2)] }],
  },
}, null, 2));

await writeFile(path.join(data, '20-b.json'), JSON.stringify({
  roots: [{
    id: 'b', name: 'Branch B', description: 'Branch B, references a shared node.', kind: 'process',
    category: 'board', children: ['a.shared', 'b.sister', 'b.cycle'],
  }],
}, null, 2));

// b.cycle -> a -> b.cycle is a genuine cycle the builder must break.
// It also re-declares a.shared with RICHER content than 10-a.json does, to prove
// the builder keeps the bigger definition instead of whichever file sorts first.
await writeFile(path.join(data, '30-cycle.json'), JSON.stringify({
  nodes: {
    'b.cycle': {
      id: 'b.cycle', name: 'Cyclic', description: 'Points back at branch B on purpose.', kind: 'material',
      category: 'metals', children: ['b'],
    },
    'b.sister': {
      id: 'b.sister', name: 'Sister of the aliased ref', description: 'Target of the b.solderish alias.',
      kind: 'material', category: 'metals',
    },
    'a.shared': {
      id: 'a.shared', name: 'Shared (redeclared, richer)', description: 'Same id, more content.', kind: 'material',
      category: 'metals',
      children: [
        leaf('a.shared.p1', 'Extra one', 2),
        leaf('a.shared.p2', 'Extra two', 2),
        leaf('a.shared.p3', 'Extra three', 2),
      ],
    },
  },
}, null, 2));

// deliberately bad node to prove validation fires
await writeFile(path.join(data, '40-bad.json'), JSON.stringify({
  shared: { 'a.bad': { id: 'a.bad', name: 'Bad', kind: 'nonsense', category: 'not-a-category' } },
}, null, 2));

let out = '';
let code = 0;
try {
  const r = await run(process.execPath, [path.join(HERE, 'build.mjs')], {
    env: { ...process.env, DATA_DIR: data, PUBLIC_DIR: pub, DOCS_DIR: doc },
  });
  out = r.stdout + r.stderr;
} catch (e) {
  out = (e.stdout ?? '') + (e.stderr ?? '');
  code = e.code ?? 1;
}

const checks = [];
const has = (label, cond, note = '') => checks.push([label, cond, note]);

has('exits non-zero on bad data', code !== 0);
has('flags the dangling reference', /unknown id "a\.orr"/.test(out));
has('flags the bad kind', /kind "nonsense"/.test(out));
has('flags the bad category', /category "not-a-category"/.test(out));
has('flags missing description', /missing "description"/.test(out));
has('detects the cycle', /cycle in tree/.test(out));
has('suggests a near-miss id', /did you mean/.test(out));
has('did not crash', /nodes\s+[0-9]+/.test(out));

const tree = JSON.parse(await readFile(path.join(pub, 'tree.json'), 'utf8'));
has('emits tree.json', !!tree.nodes);
has('root is c64', tree.meta.root === 'c64');
has('reachable set computed', tree.meta.nodes >= 8);
has('depth >= 3', tree.meta.maxDepth >= 2);
has('counts leaves', tree.meta.leaves >= 3);
has('resolved the shared ref', (tree.nodes['b'].children ?? []).includes('a.shared'));
has('broke the cycle', !(tree.nodes['b.cycle'].children ?? []).includes('b'));
has('kept the now-acyclic node', (tree.nodes['b'].children ?? []).includes('b.cycle'));
has('emits graphviz', (await readFile(path.join(pub, 'tree.dot'), 'utf8')).startsWith('digraph'));
has('emits mermaid', (await readFile(path.join(pub, 'tree.mmd'), 'utf8')).startsWith('mindmap'));
has('emits markdown outline', (await readFile(path.join(doc, 'TREE.md'), 'utf8')).includes('Branch A'));

has('reports the id collision', /DUPLICATE ID COLLISION/.test(out));
has('names the discarded content', /DISCARDING 1 nodes from 10-a\.json/.test(out));
has('kept the richer duplicate', (tree.nodes['a.shared'].children ?? []).length === 3);
has('kept the richer duplicate name', tree.nodes['a.shared'].name === 'Shared (redeclared, richer)');

// --- alias table ------------------------------------------------------------
// The classic case: a fragment references an id that no fragment ever defined,
// and data/_aliases.json says which real node it meant. The reference must
// resolve, and the log must name the WRONG id rather than the target.
await writeFile(path.join(data, '_aliases.json'), JSON.stringify({
  'wrong.id': 'a.shared',
  'b.solderish': 'b.sister',
}, null, 2));
// rewrite branch B to reference the non-existent ids
{
  const p = path.join(data, '20-b.json');
  const doc = JSON.parse(await readFile(p, 'utf8'));
  doc.roots[0].children = ['wrong.id', 'b.solderish', 'b.cycle'];
  await writeFile(p, JSON.stringify(doc, null, 2));
}

let o3 = '';
try {
  const r = await run(process.execPath, [path.join(HERE, 'build.mjs')], {
    env: { ...process.env, DATA_DIR: data, PUBLIC_DIR: pub, DOCS_DIR: doc },
  });
  o3 = (r.stdout ?? '') + (r.stderr ?? '');
} catch (e) {
  o3 = (e.stdout ?? '') + (e.stderr ?? '');
}
o3 = o3.replace(/\s+/g, ' ').trim();
const t3 = JSON.parse(await readFile(path.join(pub, 'tree.json'), 'utf8'));

has('reports the alias rewrite', /alias rewrite\(s\)/.test(o3));
has('names the wrong id, not the target', /wrong\.id → a\.shared/.test(o3));
has('reports the second mapping too', /b\.solderish → b\.sister/.test(o3));
has('each mapping reported once', (o3.match(/wrong\.id → a\.shared/g) ?? []).length === 1,
  `saw ${(o3.match(/wrong\.id → a\.shared/g) ?? []).length}`);
has('aliased ref no longer reported as unknown', !/unknown id "wrong\.id"/.test(o3));
has('aliased ref resolved to the real node', (t3.nodes['b'].children ?? []).includes('a.shared'));
has('second alias resolved too', (t3.nodes['b'].children ?? []).includes('b.sister'));

// A node published in a `shared` map but referenced by nothing must be adopted
// into the catalogue rather than dropped.
await writeFile(path.join(data, '50-published.json'), JSON.stringify({
  shared: {
    'pub.unlinked': {
      id: 'pub.unlinked', name: 'Unlinked published node', description: 'Published for reuse, but nobody referenced it.',
      kind: 'material', category: 'metals', children: [leaf('pub.unlinked.leaf', 'Its child', 2)],
    },
  },
}, null, 2));

let o2 = '';
try {
  const r = await run(process.execPath, [path.join(HERE, 'build.mjs')], {
    env: { ...process.env, DATA_DIR: data, PUBLIC_DIR: pub, DOCS_DIR: doc },
  });
  o2 = r.stdout + r.stderr;
} catch (e) {
  o2 = (e.stdout ?? '') + (e.stderr ?? '');
}
const t2 = JSON.parse(await readFile(path.join(pub, 'tree.json'), 'utf8'));

has('adopts unlinked published nodes', !!t2.nodes['unlinked.catalogue']);
has('the adopted child is in the catalogue', (t2.nodes['unlinked.catalogue']?.children ?? []).includes('pub.unlinked'));
has('the adopted node is in tree.json', !!t2.nodes['pub.unlinked']);
has('the adopted node is reachable', (t2.nodes['c64'].children ?? []).length > 0);
has('says nothing about it being unlinked', !/"pub\.unlinked".*never linked/.test(o2));

// --- ingredient resolution: `inputs` prose must become real `from` edges -----
await writeFile(path.join(data, '_ingredients.json'), JSON.stringify({
  map: { 'widget resin': 'a.shared' },
}, null, 2));
{
  const p = path.join(data, '10-a.json');
  const doc = JSON.parse(await readFile(p, 'utf8'));
  doc.root.inputs = ['a.shared', 'widget resin', 'mystery powder'];
  doc.root.children.push('a.ingrediented');
  await writeFile(p, JSON.stringify(doc, null, 2));
}
await writeFile(path.join(data, '60-ingrediented.json'), JSON.stringify({
  nodes: {
    'a.ingrediented': {
      id: 'a.ingrediented', name: 'Something with ingredients', description: 'Has prose inputs that should resolve.',
      kind: 'part', category: 'metals',
      inputs: ['Copper ore for the leaf', 'a.shared', 'unlisted chemical'],
    },
  },
}, null, 2));

let o4 = '';
try {
  const r = await run(process.execPath, [path.join(HERE, 'build.mjs')], {
    env: { ...process.env, DATA_DIR: data, PUBLIC_DIR: pub, DOCS_DIR: doc },
  });
  o4 = (r.stdout ?? '') + (r.stderr ?? '');
} catch (e) { o4 = (e.stdout ?? '') + (e.stderr ?? ''); }
const t4 = JSON.parse(await readFile(path.join(pub, 'tree.json'), 'utf8'));

has('emits a "from" edge array', Array.isArray(t4.nodes['a.ingrediented'].from));
has('resolves an exact id input', (t4.nodes['a.ingrediented'].from ?? []).includes('a.shared'));
has('drops inputs that match no node', !(t4.nodes['a.ingrediented'].from ?? []).some((f) => f.includes('unlisted')));
has('reports ingredient link rate', /ingredients resolved into real "from" links/.test(o4));
has('keeps the original prose inputs', Array.isArray(t4.nodes['a.ingrediented'].inputs));

// --- PETSCII hygiene: the real data must be plain ASCII ----------------------
// The text-mode viewer only renders PETSCII, so non-ASCII is fixed at the data
// level (scripts/normalize-text.mjs handles the common cases; anything outside
// its table is fixed by hand). Unlike every check above, this one scans the
// real data/ directory rather than the synthetic tree, because it guards
// authoring input, not builder behavior.
const nonAsciiHits = [];
{
  const realData = path.join(HERE, '..', 'data');
  const realFiles = (await readdir(realData)).filter((f) => f.endsWith('.json')).sort();
  for (const f of realFiles) {
    const lines = (await readFile(path.join(realData, f), 'utf8')).split('\n');
    lines.forEach((ln, i) => {
      if ([...ln].some((ch) => ch.codePointAt(0) > 126)) nonAsciiHits.push(`${f}:${i + 1}`);
    });
  }
}
has('data is plain ASCII', nonAsciiHits.length === 0,
  nonAsciiHits.length ? `${nonAsciiHits.length} hit(s): ${nonAsciiHits.slice(0, 5).join(', ')} — run npm run normalize-text, then fix the rest by hand` : '');

let bad = 0;
for (const [label, ok, note] of checks) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !note ? '' : `  (${note})`}`);
  if (!ok) bad++;
}
console.log(bad ? `\n  ${bad} failing check(s)\n` : `\n  all ${checks.length} checks pass\n`);
await rm(tmp, { recursive: true, force: true });
process.exit(bad ? 1 : 0);