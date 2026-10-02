#!/usr/bin/env node
/**
 * build.mjs — stitch data/*.json into a single validated tree and emit
 *   public/tree.json       flat node map + child id lists (consumed by the viewer)
 *   public/tree.dot        Graphviz digraph
 *   public/tree.mmd        Mermaid mindmap (shallow, for pasting into docs)
 *   docs/TREE.md           full indented outline
 *   public/tree.meta.json  stats for the viewer header
 *
 * No dependencies. Run: node scripts/build.mjs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.resolve(process.env.DATA_DIR ?? path.join(ROOT, 'data'));
const PUBLIC = path.resolve(process.env.PUBLIC_DIR ?? path.join(ROOT, 'public'));
const DOCS = path.resolve(process.env.DOCS_DIR ?? path.join(ROOT, 'docs'));

const VALID_KINDS = new Set(['part', 'process', 'material', 'facility', 'tool']);
const VALID_CATEGORIES = new Set([
  'silicon', 'passives', 'board', 'plastics', 'metals', 'magnetics',
  'interconnect', 'power', 'assembly', 'optics', 'fluids', 'energy',
  'packaging', 'logistics', 'computing', 'peripherals', 'industry',
]);

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ------------------------------------------------------------------ load */

const files = (await readdir(DATA)).filter((f) => f.endsWith('.json')).sort();
if (!files.length) {
  console.error('no data files');
  process.exit(1);
}

const docs = [];
for (const f of files) {
  const text = await readFile(path.join(DATA, f), 'utf8');
  try {
    docs.push({ file: f, doc: JSON.parse(text) });
  } catch (e) {
    err(`${f}: invalid JSON — ${e.message}`);
  }
}

/* ----------------------------------------------- collect definitions */

const defs = new Map(); // id -> the winning node object
const dupes = new Map(); // id -> every definition offered, so we can pick the richest
/** @type {{id:string, file:string, line:string}[]} */
const refSites = [];

function define(node, file, where) {
  if (!node || typeof node !== 'object') {
    err(`${file} ${where}: expected a node object, got ${typeof node}`);
    return;
  }
  if (!node.id) {
    err(`${file} ${where}: node with name "${node.name ?? '?'}" has no id`);
    return;
  }
  node.__file = file;
  if (!defs.has(node.id)) defs.set(node.id, node);
  if (!dupes.has(node.id)) dupes.set(node.id, []);
  dupes.get(node.id).push(node);
}

const pointers = []; // {id, text, file} — a shared entry that was a gloss, not a node
const published = new Set(); // ids defined in a `nodes`/`shared` map, i.e. offered for reuse

// Optional alias table so fragments can disagree about an id without us having
// to rewrite whole files. data/_aliases.json maps "wrong.id" -> "right.id".
// Loaded here because both reference resolution and stub synthesis consult it.
const aliases = {};
try {
  Object.assign(aliases, JSON.parse(await readFile(path.join(DATA, '_aliases.json'), 'utf8')));
} catch { /* no alias table */ }
const aliasHits = [];

for (const { file, doc } of docs) {
  // a document may be a bare node (the spine file), or a wrapper with
  // root / roots / nodes / shared.
  if (doc.id && doc.name && !doc.root && !doc.roots) define(doc, file, 'document');
  if (doc.root) define(doc.root, file, 'root');
  if (Array.isArray(doc.roots)) doc.roots.forEach((n, i) => define(n, file, `roots[${i}]`));
  if (doc.nodes && typeof doc.nodes === 'object') {
    for (const [id, n] of Object.entries(doc.nodes)) {
      define(n, file, `nodes.${id}`);
      published.add(n?.id ?? id);
    }
  }
  if (doc.shared && typeof doc.shared === 'object') {
    for (const [id, n] of Object.entries(doc.shared)) {
      // Some fragments use `shared` as a pointer registry: id -> one-line gloss,
      // advertising an id that other files may reference. If the real node turns
      // up elsewhere the gloss is redundant; if it does not, we still need the
      // reference to resolve, so we synthesise an honest stub.
      if (typeof n === 'string') pointers.push({ id, text: n, file });
      else { define(n, file, `shared.${id}`); published.add(n.id ?? id); }
    }
  }
}

/* ------------------------------------------- walk: index inline nodes
   Inline children are definitions too (they can be referenced by id), and
   string children are reference sites.                                       */

const visited = new Set();

function walk(node, file) {
  if (visited.has(node)) return;
  visited.add(node);
  const kids = node.children;
  if (kids === undefined) return;
  if (!Array.isArray(kids)) {
    err(`${node.id} (${file}): "children" must be an array, got ${typeof kids}`);
    return;
  }
  const out = [];
  for (const kid of kids) {
    if (typeof kid === 'string') {
      refSites.push({ id: kid, parent: node.id, file });
      out.push(kid); // resolved later, in place
    } else if (kid && typeof kid === 'object') {
      if (kid.id) {
        kid.__file = file;
        if (!defs.has(kid.id)) defs.set(kid.id, kid);
        if (!dupes.has(kid.id)) dupes.set(kid.id, []);
        dupes.get(kid.id).push(kid);
      }
      walk(kid, file);
      out.push(kid.id ?? kid);
    } else {
      err(`${node.id} (${file}): child is ${typeof kid}, must be object or id string`);
    }
  }
  node.children = out;
}

for (const [id, node] of [...defs]) walk(node, node.__file);

/* ------------------------------------- pick the richest duplicate definition
 * Two fragments defining the same id used to mean "first file wins", which
 * silently threw away a whole subtree if a placeholder happened to sort first.
 * Now the definition carrying the most content wins, and a collision is
 * reported loudly enough that it cannot be missed.
 *
 * This runs while children are still inline objects, so "how much content"
 * means a real deep count rather than a direct-children count.               */

const sizeCache = new WeakMap();
function sizeOf(node) {
  if (sizeCache.has(node)) return sizeCache.get(node);
  let n = 0;
  for (const c of node.children ?? []) n += typeof c === 'string' ? 1 : 1 + sizeOf(c);
  sizeCache.set(node, n);
  return n;
}

const collisions = [];
for (const [id, list] of dupes) {
  if (list.length < 2) continue;
  const sized = list.map((n) => ({ n, s: sizeOf(n) })).sort((a, b) => b.s - a.s);
  defs.set(id, sized[0].n);
  const lost = sized.slice(1).filter((x) => x.s > 0);
  const line = `${id}: ${list.length} definitions — keeping ${sized[0].s} nodes from ${sized[0].n.__file}` +
    (lost.length ? `, DISCARDING ${lost.map((x) => `${x.s} nodes from ${x.n.__file}`).join(' + ')}` : '');
  collisions.push(line);
  warn(line);
}

/* Now that the winners are settled, flatten inline children down to id lists. */
for (const node of new Set(defs.values())) {
  node.children = (node.children ?? [])
    .map((k) => (typeof k === 'string' ? k : k?.id))
    .filter(Boolean);
}

/* ---------------------------------------------- resolve pointer glosses
 * A `shared` entry that was a string is an advertisement for an id, not a
 * definition. If the real node exists elsewhere the gloss is redundant. If it
 * does not, we synthesise a stub so the cross-reference still resolves and
 * still shows the author gloss — and we shout about it, because a stub is a
 * hole in the tree, not a finished branch.                              */

const ACRONYMS = new Map(Object.entries({
  abs: 'ABS', pvc: 'PVC', cpu: 'CPU', rosin: 'Rosin', ptfe: 'PTFE',
  pcb: 'PCB', emc: 'EMC', sic: 'SiC', tft: 'TFT', hdmi: 'HDMI',
}));
const CATEGORY_HINT = [
  [/^chem\.(abs|pvc|rubber|polyester|epoxy|polystyrene|nylon|san|acrylic)/, 'plastics'],
  [/^chem\./, 'fluids'],
  [/^metal\./, 'metals'],
  [/^facility\.(power|steam|electricity|coal|oil|compressed-air)/, 'energy'],
  [/^facility\./, 'industry'],
  [/^logistics\./, 'logistics'],
];
function stubName(id) {
  const last = id.split('.').pop();
  return ACRONYMS.get(last) ?? last.replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
const stubCategory = (id) => CATEGORY_HINT.find(([re]) => re.test(id))?.[1] ?? 'computing';

const stubs = [];
for (const p of pointers) {
  if (defs.has(p.id)) continue;
  // A gloss whose id has an alias pointing at something real is not a hole.
  const target = aliases[p.id];
  if (target && defs.has(target)) {
    const label = `${p.id} → ${target}`;
    if (!aliasHits.includes(label)) aliasHits.push(label);
    continue;
  }
  const node = {
    id: p.id,
    name: stubName(p.id),
    description: p.text,
    kind: 'material',
    category: stubCategory(p.id),
    confidence: 'low',
    note: `Placeholder. ${p.file} published this id as a cross-reference target but did not write the subtree behind it. Everything that references "${p.id}" currently dead-ends here.`,
  };
  defs.set(p.id, node);
  published.add(p.id);
  stubs.push(`${p.id} (from ${p.file})`);
}

/* ------------------------------------------------------------- resolve */

for (const site of refSites) {
  if (defs.has(site.id)) continue;
  const target = aliases[site.id];
  if (!target || !defs.has(target)) continue;
  const p = defs.get(site.parent);
  if (!p) continue;
  const i = (p.children ?? []).indexOf(site.id);
  if (i < 0) continue;
  const was = site.id;
  p.children[i] = target;
  site.id = target; // keep the ref record in step, or it still looks dangling
  // Report the *wrong* id, not the rewritten one, or the log reads
  // "metal.silica.tcs -> metal.silica.tcs", which tells you nothing.
  const label = `${was} → ${target}`;
  if (!aliasHits.includes(label)) aliasHits.push(label);
}

/* -------------------------------------------------- dangling references */

const dangling = [];
for (const { id, parent, file } of refSites) {
  if (!defs.has(id)) dangling.push({ id, parent, file });
}
for (const { id, parent, file } of dangling) {
  const near = closest(id);
  err(`${file}: node "${parent}" references unknown id "${id}"${near ? ` — did you mean "${near}"?` : ''}`);
}

function closest(id) {
  let best = null;
  let bestScore = Infinity;
  for (const known of defs.keys()) {
    const s = dist(id, known);
    if (s < bestScore) { bestScore = s; best = known; }
  }
  return bestScore <= Math.max(3, id.length * 0.34) ? best : null;
}
function dist(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/* ------------------------------------------------------------ validate */

for (const [id, node] of defs) {
  if (!node.name) err(`${id}: missing "name"`);
  if (!node.description) warn(`${id}: missing "description"`);
  else if (node.description.length < 30) warn(`${id}: "description" is very short (${node.description.length} chars)`);
  if (!node.kind) err(`${id}: missing "kind"`);
  else if (!VALID_KINDS.has(node.kind)) err(`${id}: kind "${node.kind}" not in [${[...VALID_KINDS]}]`);
  if (!node.category) err(`${id}: missing "category"`);
  else if (!VALID_CATEGORIES.has(node.category)) err(`${id}: category "${node.category}" not in [${[...VALID_CATEGORIES]}]`);
  if (node.confidence && !['high', 'medium', 'low'].includes(node.confidence)) {
    err(`${id}: confidence "${node.confidence}" must be high|medium|low`);
  }
  if (node.inputs !== undefined && !Array.isArray(node.inputs)) err(`${id}: "inputs" must be an array`);
  if (node.facts !== undefined && !Array.isArray(node.facts)) err(`${id}: "facts" must be an array`);
  if (node.sources !== undefined && !Array.isArray(node.sources)) err(`${id}: "sources" must be an array`);
}

/* -------------------------------------------------------- cycle detect */

const childIds = (id) => (defs.get(id)?.children ?? []).filter((c) => defs.has(c));
const state = new Map(); // 0 unvisited 1 on stack 2 done
const cycles = [];
(function dfs(id, stack) {
  const s = state.get(id) ?? 0;
  if (s === 1) {
    cycles.push([...stack.slice(stack.indexOf(id)), id]);
    return;
  }
  if (s === 2) return;
  state.set(id, 1);
  stack.push(id);
  for (const c of childIds(id)) dfs(c, stack);
  stack.pop();
  state.set(id, 2);
})('c64', []);
for (const cyc of cycles) warn(`cycle in tree: ${cyc.join(' -> ')} (breaking it)`);
for (const cyc of cycles) {
  const parent = cyc[cyc.length - 2];
  const node = defs.get(parent);
  if (node) node.children = node.children.filter((c) => c !== cyc[cyc.length - 1]);
}

/* -------------------------------------------------- unreached from c64 */

function reachable(start) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const c of childIds(id)) stack.push(c);
  }
  return seen;
}

const rootId = defs.has('c64') ? 'c64' : defs.keys().next().value;
let seen = reachable(rootId);

/* --------------------------------------------------- unlinked nodes
 * Two different mistakes hide under "not reachable", and they deserve
 * different treatment:
 *
 *  - a fragment published a canonical node in its `nodes`/`shared` map for other
 *    fragments to reference, but nothing ended up referencing it. That is not a
 *    bug, just an unlinked entry in a catalogue — adopt it so the content is
 *    visible instead of silently dropped.
 *  - a fragment defined a node inline and never linked it into its own tree.
 *    That is a genuine authoring error and stays a warning.               */

function majorityCategory(ids) {
  const tally = new Map();
  for (const id of ids) {
    const c = defs.get(id)?.category ?? 'computing';
    tally.set(c, (tally.get(c) ?? 0) + 1);
  }
  return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'computing';
}

let adopted = null;
const strays = [];
for (const id of [...defs.keys()]) {
  if (seen.has(id)) continue;
  if (!published.has(id)) { strays.push(id); continue; }
  (adopted ??= []).push(id);
}
if (adopted?.length) {
  adopted.sort();
  const node = {
    id: 'unlinked.catalogue',
    name: 'Published but unlinked materials',
    description: `These ${adopted.length} nodes were written as canonical, reusable subtrees — a fragment's "made from" chains in full detail — but no other branch ended up referencing them, so nothing linked them into the tree. They are collected here rather than deleted. Where a component subtree inlines its own shorter version of the same material chain, this is the long one.`,
    kind: 'facility',
    category: majorityCategory(adopted),
    era: '1980s',
    confidence: 'medium',
    note: 'Generated by scripts/build.mjs. Nothing in the tree points here; the connection exists only in prose, in each node\'s own branch.',
    children: adopted,
  };
  defs.set(node.id, node);
  const host = defs.has('c64.bottoms-out') ? defs.get('c64.bottoms-out') : defs.get(rootId);
  host.children = [...(host.children ?? []), node.id];
  seen = reachable(rootId);
}
const orphans = [...defs.keys()].filter((id) => !seen.has(id));
// Only report what is still unreachable after adoption: adopting a parent can
// make its descendants reachable, and warning about them would be noise.
for (const id of orphans) warn(`"${id}" (${defs.get(id).__file ?? 'generated'}) is defined but never linked into the tree`);

/* ------------------------------------------------------------- stats */

// memoized longest-path depth. Safe now that cycles have been broken, and
// necessary because shared subtrees (copper, ABS, aluminium) are reached many
// times over -- naive recursion would be exponential.
const depthOf = new Map();
let maxDepth = 0;
function depth(id) {
  const cached = depthOf.get(id);
  if (cached !== undefined) return cached;
  let best = 0;
  for (const c of childIds(id)) best = Math.max(best, depth(c) + 1);
  depthOf.set(id, best);
  if (best > maxDepth) maxDepth = best;
  return best;
}
depth(rootId);

// reconstruct one deepest path for the report
const deepestPath = [];
(() => {
  let cur = rootId;
  deepestPath.push(cur);
  for (;;) {
    let next = null;
    let deepest = -1;
    for (const c of childIds(cur)) {
      if (depth(c) > deepest) { deepest = depth(c); next = c; }
    }
    if (!next) break;
    deepestPath.push(next);
    cur = next;
  }
})();
const depthOfNode = (id) => depth(id);

const byKind = {};
const byCategory = {};
const byEra = {};
const leafCount = [...seen].filter((id) => childIds(id).length === 0).length;
const descChars = [...seen].reduce((n, id) => n + (defs.get(id).description?.length ?? 0), 0);
for (const id of seen) {
  const n = defs.get(id);
  byKind[n.kind ?? '?'] = (byKind[n.kind ?? '?'] ?? 0) + 1;
  byCategory[n.category ?? '?'] = (byCategory[n.category ?? '?'] ?? 0) + 1;
  const e = n.era ?? 'unspecified';
  byEra[e] = (byEra[e] ?? 0) + 1;
}

/* ------------------------------------------------------------ outputs */

function strip(node) {
  const o = { id: node.id, file: node.__file };
  for (const k of ['name', 'description', 'kind', 'category', 'era', 'confidence', 'note']) {
    if (node[k] !== undefined) o[k] = node[k];
  }
  for (const k of ['inputs', 'facts', 'places', 'sources']) {
    if (Array.isArray(node[k]) && node[k].length) o[k] = node[k];
  }
  o.children = node.children ?? [];
  return o;
}

const flat = {};
for (const id of seen) flat[id] = strip(defs.get(id));

const meta = {
  generated: new Date().toISOString(),
  root: rootId,
  nodes: seen.size,
  maxDepth,
  leaves: leafCount,
  deepestPath,
  byKind,
  byCategory,
  byEra,
  sources: files,
  descriptionsChars: descChars,
};
meta.avgChildren = +((seen.size - leafCount) / seen.size).toFixed(2);

await writeFile(path.join(PUBLIC, 'tree.json'), JSON.stringify({ meta, nodes: flat }));
await writeFile(path.join(PUBLIC, 'tree.meta.json'), JSON.stringify(meta, null, 2));

/* graphviz */
const esc = (s) => String(s).replace(/[\\{}<>|"]/g, (c) => '\\' + c).replace(/\n/g, ' ');
const CAT_COLOR = {
  silicon: '#7aa2f7', passives: '#9ece6a', board: '#e0af68', plastics: '#bb9af7',
  metals: '#f7768e', magnetics: '#ff9e64', interconnect: '#7dcfff', power: '#ff007c',
  assembly: '#73daca', optics: '#c0caf5', fluids: '#2ac3de', energy: '#e0af68',
  packaging: '#a9b1d6', logistics: '#9aa5ce', computing: '#ff007c',
  peripherals: '#ff007c', industry: '#565f89',
};
const dot = [
  'digraph c64 {',
  '  rankdir=LR;',
  '  splines=ortho;',
  '  node [shape=box style="rounded,filled" fontname="Helvetica" fontsize=9 penwidth=0.6];',
  '  edge [color="#333644" arrowsize=0.5 penwidth=0.5];',
  ...[...seen].map((id) => {
    const n = defs.get(id);
    const fill = CAT_COLOR[n.category] ?? '#565f89';
    return `  "${id}" [label="${esc(n.name)}" fillcolor="${fill}22" color="${fill}" tooltip="${esc((n.description ?? '').slice(0, 300))}"];`;
  }),
  ...[...seen].flatMap((id) => childIds(id).map((c) => `  "${id}" -> "${c}";`)),
  '}',
];
await writeFile(path.join(PUBLIC, 'tree.dot'), dot.join('\n'));

/* mermaid (top 3 levels only — deeper explodes mermaid) */
const mmd = ['mindmap', '  root((C64))'];
(function mm(id, d) {
  if (d > 3) return;
  for (const c of childIds(id)) {
    const n = defs.get(c);
    mmd.push(`${'  '.repeat(d + 1)}${n.name.replace(/[()\[\]{}]/g, '')}`);
    mm(c, d + 1);
  }
})(rootId, 1);
await writeFile(path.join(PUBLIC, 'tree.mmd'), mmd.join('\n'));

/* markdown outline — DFS pre-order, so a parent always precedes its children */
const md = [
  `# Production tree — Commodore 64`,
  ``,
  `${seen.size} nodes, max depth ${maxDepth}, ${leafCount} leaves.`,
  `Generated ${meta.generated} by \`scripts/build.mjs\`. Do not edit by hand.`,
  ``,
];
{
  const emitted = new Set();
  (function outline(id, d) {
    if (emitted.has(id)) {
      md.push(`${'  '.repeat(d)}- *${defs.get(id).name}* \`${id}\` *(seen above)*`);
      return;
    }
    emitted.add(id);
    const n = defs.get(id);
    const conf = n.confidence && n.confidence !== 'high' ? ` _(${n.confidence})_` : '';
    md.push(`${'#'.repeat(Math.min(6, d + 1))} ${n.name} \`${id}\`${conf}`);
    if (n.description) md.push('', n.description.replace(/\n/g, ' '), '');
    for (const c of childIds(id)) outline(c, d + 1);
  })(rootId, 0);
}
await writeFile(path.join(DOCS, 'TREE.md'), md.join('\n'));

/* ------------------------------------------------------------- report */

console.log(`\n  sources   ${files.length} files`);
console.log(`  nodes     ${seen.size}  (${leafCount} leaves, ${orphans.length} unreachable)`);
console.log(`  depth     ${maxDepth}`);
console.log(`  deepest   ${deepestPath.map((i) => defs.get(i)?.name ?? i).join('  ->  ')}`);
console.log(`  bytes     tree.json ${(JSON.stringify(flat).length / 1e6).toFixed(2)} MB`);
console.log('\n  categories');
for (const [k, v] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(13)} ${String(v).padStart(5)}`);
}
console.log('\n  kinds');
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(13)} ${String(v).padStart(5)}`);
}

if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 40)) console.log(`    ! ${w}`);
  if (warnings.length > 40) console.log(`    ... ${warnings.length - 40} more`);
}
if (aliasHits.length) {
  console.log(`\n  ${aliasHits.length} alias rewrite(s) from data/_aliases.json:`);
  for (const a of aliasHits.slice(0, 30)) console.log(`    ~ ${a}`);
  if (aliasHits.length > 30) console.log(`    ... ${aliasHits.length - 30} more`);
}
if (collisions.length) {
  console.log(`\n  ${collisions.length} DUPLICATE ID COLLISION(S) — content was thrown away:`);
  for (const c of collisions) console.log(`    X ${c}`);
}
if (stubs.length) {
  console.log(`\n  ${stubs.length} PLACEHOLDER STUB(S) — advertised ids with no subtree written:`);
  for (const s of stubs) console.log(`    ? ${s}`);
}
if (errors.length) {
  console.log(`\n  ${errors.length} ERROR(s):`);
  for (const e of errors.slice(0, 60)) console.log(`    x ${e}`);
  if (errors.length > 60) console.log(`    ... ${errors.length - 60} more`);
  console.log('');
  process.exit(2);
}
console.log('\n  ok\n');