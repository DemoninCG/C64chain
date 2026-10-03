/**
 * restore.mjs — put back six nodes that scripts/applyproposals.mjs destroyed
 * as collateral damage, and repair the lookup tables.
 *
 * What went wrong: when a merge loser is stored *inline* under its parent,
 * excising the loser's object also excised every node nested inside it. The
 * applier appended the loser's child ids to the survivor, but in these two
 * fragments the children were not held in a `children` key, so nothing was
 * adopted and the child definitions vanished with the parent. Eight `inputs`
 * references then pointed at ids that no longer existed.
 *
 * The node objects are recovered from git HEAD (commit 77dc066). Note this is
 * the pre-QA-pass text, not the text the QA agents last wrote, so the six are
 * flagged in data/_restored.json for review against the agents' intent.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const TMP = 'C:/Users/corba/AppData/Local/Temp/opencode';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function skipString(text, i) {
  i++;
  while (i < text.length) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '"') return i;
    i++;
  }
  return i;
}
function nodeSpan(text, id) {
  const needle = `"${id}"`;
  const hits = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at < 0) break;
    from = at + needle.length;
    if (!/"id"\s*:\s*$/.test(text.slice(Math.max(0, at - 12), at))) continue;
    let i = at - 1, d = 0;
    for (; i >= 0; i--) { const c = text[i]; if (c === '}') d++; else if (c === '{') { if (d === 0) break; d--; } }
    let dd = 0, j = i;
    for (; j < text.length; j++) { const c = text[j]; if (c === '{') dd++; else if (c === '}') { dd--; if (dd === 0) break; } }
    let open = i, k = i - 1;
    while (k >= 0 && /\s/.test(text[k])) k--;
    if (text[k] === ':' && text[k - 1] === '"') {
      let q = k - 2;
      while (q >= 0 && text[q] !== '"') q--;
      if (q >= 0 && text.slice(q + 1, k - 1) === id) open = q;
    }
    hits.push({ start: open, end: j + 1 });
  }
  return hits.length === 1 ? hits[0] : null;
}
function topLevelKeys(text) {
  const out = [];
  let i = 0, depth = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      const s = i, e = skipString(text, i);
      const str = text.slice(s, e + 1);
      i = e + 1;
      if (depth !== 1) continue;
      let k = i;
      while (k < text.length && /\s/.test(text[k])) k++;
      if (text[k] !== ':') continue;
      k++;
      while (k < text.length && /\s/.test(text[k])) k++;
      const key = JSON.parse(str);
      if (text[k] === '[' || text[k] === '{') {
        let d = 0, j = k;
        for (; j < text.length; j++) {
          if (text[j] === '"') { j = skipString(text, j); continue; }
          if (text[j] === '[' || text[j] === '{') d++;
          else if (text[j] === ']' || text[j] === '}') { d--; if (d === 0) { j++; break; } }
        }
        out.push({ key, start: k, end: j, text: text.slice(k, j) });
        i = j; continue;
      }
      /* A string value must be skipped as a unit. Scanning to the next comma
         instead desynchronises the walk on the first comma *inside* the text --
         and descriptions are full of them -- so every later key is missed. */
      if (text[k] === '"') {
        const e = skipString(text, k);
        out.push({ key, start: k, end: e + 1, text: text.slice(k, e + 1) });
        i = e + 1; continue;
      }
      let j = k;
      while (j < text.length && !/[,\n}]/.test(text[j])) j++;
      out.push({ key, start: k, end: j, text: text.slice(k, j) });
      i = j; continue;
    }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    i++;
  }
  return out;
}
function arraysContaining(text, value) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') { i = skipString(text, i); i++; continue; }
    if (c !== '[') { i++; continue; }
    const start = i;
    let d = 0, j = i;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (ch === '"') { j = skipString(text, j); continue; }
      if (ch === '[') d++;
      else if (ch === ']') { d--; if (d === 0) { j++; break; } }
    }
    const lit = text.slice(start, j);
    const elems = lit.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    if (elems.some((s) => { try { return JSON.parse(s) === value; } catch { return false; } }))
      out.push({ start, end: j, text: lit });
    i = j;
  }
  return out;
}

/* ---------- 1. file each lost node, then link it to a living parent --------
 * Two separate, simple edits rather than one clever one: put the node object in
 * the fragment's `shared` map or `roots` array, then add its *id* to the
 * parent's `children`. Splicing a whole object into a children array in place
 * proved fragile -- re-indenting 11 KB of nested node reliably unbalances a
 * bracket somewhere -- and the tree does not care which of the two forms a
 * child takes. Linking by id also cannot orphan the node. */
const JOBS = [
  { id: 'metal.pine-resin', objFile: `${TMP}/lost-metal.pine-resin.json`, container: 'shared', hostFile: 'data/60-metals.json', parent: 'chem.rosin', parentFile: 'data/70-petrochem.json' },
  { id: 'metal.rosin.activator', objFile: `${TMP}/lost-metal.rosin.activator.json`, container: 'shared', hostFile: 'data/60-metals.json', parent: 'chem.rosin', parentFile: 'data/70-petrochem.json' },
  { id: 'c64.case.other-polymers.methanol', objFile: `${TMP}/lost-c64.case.other-polymers.methanol.json`, container: 'roots', hostFile: 'data/40-chassis.json', parent: 'c64.case.other-polymers', parentFile: 'data/40-chassis.json' },
  { id: 'c64.case.tooling.p20', objFile: `${TMP}/lost-c64.case.tooling.p20.json`, container: 'roots', hostFile: 'data/40-chassis.json', parent: 'c64.case.tooling', parentFile: 'data/40-chassis.json' },
  { id: 'c64.case.abs-resin.phthalo-blue', objFile: `${TMP}/lost-c64.case.abs-resin.phthalo-blue.json`, container: 'roots', hostFile: 'data/40-chassis.json', parent: 'chem.abs', parentFile: 'data/70-petrochem.json' },
];

const cache = new Map();
const load = (f) => { if (!cache.has(f)) cache.set(f, readFileSync(f, 'utf8')); return cache.get(f); };
const save = (f, t) => cache.set(f, t);

/** Append one element (an id string, or a whole node object carrying a `raw`
 *  field holding its source text) to a node's `children` array.
 *  Indent is read from the array's own first line and its own last line: an
 *  unanchored /\n(\s*)\]/ matches a "]" belonging to a NESTED array, which is
 *  how an 85 KB array of child objects ended up with unbalanced brackets. */
function appendToChildren(file, parentId, childId) {
  const pt = load(file);
  const pspan = nodeSpan(pt, parentId);
  if (!pspan) throw new Error(`parent ${parentId} not found in ${file}`);
  const ptext = pt.slice(pspan.start, pspan.end);
  const ce = topLevelKeys(ptext).find((k) => k.key === 'children');
  if (!ce) throw new Error(`no children key on ${parentId} in ${file}`);
  if (ce.text.includes(JSON.stringify(childId))) return false;

  /* Insert immediately before the array's closing bracket instead of rebuilding
     the whole array. Rebuilding meant re-deriving the indentation, and getting
     that wrong unbalances brackets in a 16 KB array of nested nodes. A missing
     or stray comma is the only thing that can go wrong here, and both are
     decided by looking at the character actually before the bracket. */
  const abs = pspan.start + ce.start;
  const closeAbs = abs + ce.text.length - 1;
  const before = pt.slice(abs, closeAbs);
  const multiline = /\n/.test(before);
  const closeIndent = multiline ? (pt.slice(0, closeAbs).match(/\n([ \t]*)$/)?.[1] ?? '') : '';
  const needsComma = before.trimEnd().endsWith('[') ? '' : ',';
  const lead = multiline ? `\n${closeIndent}` : '';
  const tail = multiline ? `\n${closeIndent}` : '';
  save(file, pt.slice(0, closeAbs) + needsComma + lead + JSON.stringify(childId) + tail + pt.slice(closeAbs));
  return true;
}

/** How many times `id` is *defined* (as an "id" key), as opposed to merely
 *  referenced. nodeSpan() cannot answer this: an id that also appears in some
 *  node's `inputs` makes it report an ambiguous match. */
function definitionsOf(text, id) {
  return (text.match(new RegExp(`"id"\\s*:\\s*"${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"`, 'g')) ?? []).length;
}

for (const job of JOBS) {
  const objText = readFileSync(job.objFile, 'utf8');
  const host = job.hostFile;
  const alreadyDefined = definitionsOf(load(host), job.id) > 0;

  /* (a) file the node object in the fragment's shared map or roots array */
  let ht = load(host);
  if (alreadyDefined) {
    console.log(`${job.id}: already defined in ${host}, only checking the link`);
  } else if (job.container === 'shared') {
    const at = ht.search(/"shared"\s*:\s*\{/);
    if (at < 0) { console.log(`${job.id}: no "shared" map in ${host} — ABORT`); process.exit(1); }
    const brace = ht.indexOf('{', at);
    const indent = ht.slice(0, brace).match(/(\n)([ \t]*)$/)?.[2] ?? '  ';
    ht = `${ht.slice(0, brace + 1)}\n${indent}  ${JSON.stringify(job.id)}: ${objText.replace(/\n[ \t]*/g, `\n${indent}    `)},${ht.slice(brace + 1)}`;
  } else {
    const at = ht.search(/"roots"\s*:\s*\[/);
    if (at < 0) { console.log(`${job.id}: no "roots" array in ${host} — ABORT`); process.exit(1); }
    const bracket = ht.indexOf('[', at);
    const indent = ht.slice(0, bracket).match(/(\n)([ \t]*)$/)?.[2] ?? '  ';
    ht = `${ht.slice(0, bracket + 1)}\n${indent}  ${objText.replace(/\n[ \t]*/g, `\n${indent}  `)},${ht.slice(bracket + 1)}`;
  }
  save(host, ht);

  /* (b) link it: the parent has to name it or the node exists but is orphaned.
     This runs even when the object was already filed, because that is exactly
     the state a previous interrupted run leaves behind. */
  const linked = appendToChildren(job.parentFile, job.parent, job.id);
  console.log(`${job.id}: ${alreadyDefined ? 'already filed in' : `filed into`} ${host} ${job.container}; ${linked ? 'linked under' : 'already linked under'} ${job.parent}`);
}

/* ---------- 2. repair the lookup tables ----------------------------------- */
const aliasPath = 'data/_aliases.json';
let at2 = readFileSync(aliasPath, 'utf8');
const aliasFixes = [
  ['"facility.natural-gas": "facility.power.natural-gas"', '"facility.natural-gas": "chem.natural-gas"'],
  ['"chem.nitrogen": "chem.fab-chemicals.process-gases.nitrogen.cryogenic-air.atmospheric-air"', '"chem.nitrogen": "facility.nitrogen.atmospheric-air"'],
];
for (const [from, to] of aliasFixes) {
  if (!at2.includes(from)) { console.log(`alias: pattern not found, skipped: ${from}`); continue; }
  at2 = at2.replace(from, to);
  console.log(`alias: ${from}  ->  ${to}`);
}
writeFileSync(aliasPath, at2);

const ingPath = 'data/_ingredients.json';
let it = readFileSync(ingPath, 'utf8');
/* These must be arrays of PAIRS, not an array of strings. `for (const
   [from, to] of list)` over a list of strings destructures each string into its
   first two CHARACTERS -- so from='"' and to='n', and `text.replace` then
   rewrites the first quote in the file with an n. That is how
   data/_ingredients.json was destroyed. */
const ingFix = [
  ['"nitrogen": "chem.fab-chemicals.process-gases.nitrogen.cryogenic-air.atmospheric-air"', '"nitrogen": "facility.nitrogen.atmospheric-air"'],
];
for (const [from, to] of ingFix) {
  if (!it.includes(from)) { console.log(`ingredient: pattern not found, skipped: ${from}`); continue; }
  it = it.replace(from, to);
  console.log(`ingredient: ${from}  ->  ${to}`);
}
writeFileSync(ingPath, it);

/* ---------- 3. write everything, refusing invalid JSON -------------------- */
for (const [f, t] of cache) {
  try {
    JSON.parse(t);
  } catch (e) {
    const at = Number(/position (\d+)/.exec(String(e.message))?.[1] ?? -1);
    console.error(`\n${f}: INVALID — ${e.message}`);
    if (at >= 0) {
      console.error(`  context: ${JSON.stringify(t.slice(Math.max(0, at - 700), at + 200))}`);
      const bad = [...t].map((c, ix) => [c, ix]).filter(([c]) => c.charCodeAt(0) < 32 && !'\n\t\r'.includes(c));
      console.error(`  raw control chars in file: ${bad.length}${bad.length ? `, first at ${bad[0][1]}` : ''}`);
      if (bad.length) console.error(`  around it: ${JSON.stringify(t.slice(bad[0][1] - 120, bad[0][1] + 120))}`);
    }
    process.exit(1);
  }
  writeFileSync(f, t);
  console.log(`wrote ${f}`);
}

writeFileSync('data/_restored.json', JSON.stringify({
  $comment: 'Nodes destroyed as collateral damage by scripts/applyproposals.mjs and recovered from git HEAD. The text is the pre-QA-pass version, so each needs a look against what the QA agent last intended before it is trusted.',
  restored: JOBS.map((j) => ({ id: j.id, hostFile: j.hostFile ?? j.parentFile, parent: j.parent, recoveredFrom: 'HEAD (77dc066)' })),
}, null, 2) + '\n');
console.log('wrote data/_restored.json');