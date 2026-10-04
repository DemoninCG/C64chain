#!/usr/bin/env node
/**
 * audit.mjs — measure every mechanical rule in docs/CHECKLIST.md.
 *
 *   node scripts/audit.mjs                 # whole tree
 *   node scripts/audit.mjs --file 60-metals.json
 *
 * FAIL means a rule is objectively broken and is safe to fix mechanically.
 * WARN means it needs judgement. Neither can check the important questions --
 * is this a thing or a sentence, is this altitude right, is this merge correct.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodes: N, meta } = JSON.parse(await readFile(path.join(ROOT, 'public/tree.json'), 'utf8'));

const argv = process.argv.slice(2);
const fileArg = argv.includes('--file') ? argv[argv.indexOf('--file') + 1] : null;

const ENTITY = new Set(['part', 'material']);
const PROCESSISH = new Set(['process', 'tool', 'facility', 'note', 'org', 'site']);
// `org` and `site` split the overloaded `facility` on 2026-10-04 (RELATIONS.md
// 3.3): an org is a company, a site is a place that produces nothing, and
// `facility` keeps actual production. The split exists so `owned by` and `at`
// stop being the same relation.
const VALID_KIND = new Set(['part', 'process', 'material', 'facility', 'tool', 'note', 'org', 'site']);
const VALID_CAT = new Set(['silicon', 'passives', 'board', 'plastics', 'metals', 'magnetics',
  'interconnect', 'power', 'assembly', 'optics', 'fluids', 'energy', 'packaging',
  'logistics', 'computing', 'industry']);

// category is expected to describe the industry; a kind/category clash is a signal
/* R3: which kinds an industry category may plausibly contain.
 *
 * The rule exists to catch a node filed under an industry that could not have
 * produced it -- not to enumerate every legal combination. An earlier, stricter
 * table flagged 33 nodes that are all correct: an assembly line contains
 * fixtures, machines and a burn-in oven room; a packaging line runs tools; a
 * `note` is commentary and is legal anywhere. Those were linter gaps, not
 * defects, and they were noise enough to hide the 17 real findings underneath.
 *
 * What stays forbidden is the genuinely contradictory case: `assembly` may not
 * contain a `material`, because assembly consumes materials rather than making
 * them. Everything added below is justified by a node that actually exists. */
const CAT_OK = {
  energy: new Set(['facility', 'process', 'org', 'site']),
  computing: new Set(['part', 'material', 'note']),
  logistics: new Set(['process', 'facility', 'note', 'org', 'site']),
  packaging: new Set(['part', 'material', 'process', 'tool', 'note']),
  assembly: new Set(['process', 'part', 'tool', 'facility', 'note', 'org', 'site']),
  /* Extended 2026-10-03 (TODO §1b): every set below is exactly the kinds
   * observed in that category across the 2,454-node tree, plus `note` (legal
   * anywhere). The suspicious small-count cells were read by hand first:
   * hk-pcb under board, tower fill under fluids, the crystal cleanroom under
   * passives, hk-injection under plastics, fuse glass under power, channel
   * switching under power, and the mill/mix-house/dies/presses under
   * magnetics are all legitimate. So the extension turns up no WARNs by
   * construction — its value is as a tripwire: any kind/category pair never
   * before observed now fires, instead of sitting in the 94% nobody checks. */
  board: new Set(['material', 'process', 'facility', 'note', 'part', 'tool', 'org', 'site']),
  fluids: new Set(['material', 'process', 'facility', 'tool', 'part', 'note', 'org', 'site']),
  industry: new Set(['note', 'material', 'tool', 'part', 'facility', 'process', 'org', 'site']),
  interconnect: new Set(['process', 'note', 'material', 'part', 'tool']),
  magnetics: new Set(['material', 'facility', 'tool', 'process', 'part', 'note']),
  metals: new Set(['material', 'process', 'facility', 'tool', 'part', 'note', 'org', 'site']),
  optics: new Set(['material', 'part', 'process', 'tool', 'note']),
  passives: new Set(['material', 'process', 'part', 'tool', 'note', 'facility', 'org', 'site']),
  plastics: new Set(['facility', 'material', 'process', 'tool', 'note', 'part', 'org', 'site']),
  power: new Set(['facility', 'tool', 'part', 'material', 'note', 'process', 'org', 'site']),
  silicon: new Set(['facility', 'part', 'process', 'note', 'material', 'tool']),
};

// cross-cutting services: must never be a `children` edge (CHECKLIST 1a)
const UTIL_NAMES = [
  'Water for a factory', 'Electricity at the factory wall', 'Ultrapure water for the fab',
  'Ordinary industrial water', 'Natural gas: the gas field', 'Petroleum: light sour crude oil',
];

const parents = {};
for (const [id, n] of Object.entries(N)) for (const c of n.children ?? []) (parents[c] ??= []).push(id);

const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(the|a|an|of|and|for|from|to|in|at|its|their|with|for the \w+)$/g, '').replace(/\s+/g, ' ').trim();

const all = Object.values(N).filter((n) => !fileArg || n.file === fileArg);
const rows = [];
const add = (rule, level, msg, ids = []) => rows.push({ rule, level, msg, ids });

/* -- R1 cross-cutting services must not be children ------------------------ */
// A branch root has to hold its own canonical utility once, or nothing can reach
// it — that ownership edge is legitimate. Only *ingredient* edges are defects.
const UTIL_OWNERS = new Set([
  'c64.bottoms-out', 'chem', 'industry', 'metal', 'unlinked.catalogue',
  'facility.power', 'facility.water', 'facility.gases', 'facility.steam',
  'facility.compressed-air', 'facility.hazardous-waste',
]);
const utilIds = new Set(Object.entries(N)
  .filter(([, v]) => UTIL_NAMES.includes(v.name))
  .map(([k]) => k));
let utilBad = 0;
for (const id of utilIds) {
  const bad = (parents[id] ?? []).filter((p) => !UTIL_OWNERS.has(p));
  if (bad.length) {
    utilBad += bad.length;
    add('1a', 'FAIL', `${N[id].name}: ${bad.length} ingredient edge(s) should be "from"`, bad);
  }
}

/* -- R2 kind vocabulary and note classification ---------------------------- */
for (const n of all) {
  if (!VALID_KIND.has(n.kind)) add('2', 'FAIL', `${n.id}: kind "${n.kind}" not in vocabulary`);
  if (/^(why|where|how|what|when|who|which)\b/i.test(n.name) && (n.children ?? []).length === 0 && n.kind !== 'note') {
    add('2', 'WARN', `${n.id}: question-framed leaf is kind "${n.kind}" — note?`, [n.id]);
  }
}

/* -- R3 category ---------------------------------------------------------- */

/* Coverage, stated out loud. R3 can only fire for a category that appears in
 * CAT_OK, and CAT_OK lists five of the sixteen categories in use -- so at the
 * time of writing about 94% of the tree sits in a category whose kind
 * combinations are never checked at all. That is how three non-metals (pine
 * resin, turpentine, a ros in flux activator) sat under category "metals" for
 * the whole QA pass without a warning. Reported as a NOTE rather than left
 * implicit, so widening CAT_OK is a visible piece of work rather than something
 * nobody knows is missing.
 */
const catTotals = new Map();
for (const n of all) catTotals.set(n.category, (catTotals.get(n.category) ?? 0) + 1);
const unchecked = [...catTotals.entries()].filter(([c]) => !CAT_OK[c]);
const uncheckedNodes = unchecked.reduce((a, [, n]) => a + n, 0);
if (unchecked.length) {
  add('3', 'NOTE', `r3 covers ${Object.keys(CAT_OK).length} of ${catTotals.size} categories; `
    + `${uncheckedNodes} node(s) in ${unchecked.length} categories are never category-checked `
    + `(${unchecked.map(([c, n]) => `${c}:${n}`).join(', ')})`, []);
}

for (const n of all) {
  if (!VALID_CAT.has(n.category)) { add('3', 'FAIL', `${n.id}: category "${n.category}" not permitted`); continue; }
  const ok = CAT_OK[n.category];
  if (ok && !ok.has(n.kind)) add('3', 'WARN', `${n.id}: kind "${n.kind}" under category "${n.category}"`, [n.id]);
}

/* -- R4 duplicates -------------------------------------------------------- */
const groups = new Map();
for (const n of Object.values(N)) {
  const k = norm(n.name);
  if (k.length < 8) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(n);
}
for (const [k, list] of groups) {
  if (list.length < 2) continue;
  add('4', 'WARN', `duplicate name "${list[0].name}" x${list.length}`, list.map((n) => n.id));
}
for (const n of all) {
  // WARN not FAIL: the name is objectively relative, but renaming it can collide
  // with an existing node, which is a judgement call.
  if (/\bfor the [a-z ]{3,}$/i.test(n.name)) add('4', 'WARN', `${n.id}: name is relative to another node`, [n.id]);
}

/* Childless processes that were reviewed and deliberately kept.
 *
 * The rule below used to read "a process with no children is commentary, fold
 * it into the parent". That is wrong, and it was costing real content: every
 * one of the 13 it still flags is a documented, named industrial process of
 * 229-985 characters, several with a facts table. `chem.silicone.rochow` is
 * the Rochow process -- the entire reason silicone is made the way it is.
 * Folding it into `chem.silicone` would delete the fact that the process has
 * a name.
 *
 * The distinction that matters is "adds nothing" vs "is the end of its branch",
 * and no mechanical test separates them: the genuinely commentary-like childless
 * nodes were already removed by the QA pass, which is why there is not one
 * childless process left in the tree with a description under 200 characters.
 *
 * So the rule now asks a question instead of giving an instruction, and the
 * keepers are listed here with the reason, in the same spirit as UTIL_OWNERS
 * above: an exemption that is written down rather than one that is silent. */
const TERMINAL_PROCS = new Map([
  ['facility.water.ion-exchange', 'a named unit operation on the ultrapure water train'],
  ['chem.fab-chemicals.process-gases.nitrogen.cryogenic-air', 'cryogenic air separation is the named process that makes the nitrogen'],
  ['c64.case.abs-resin.c8-aromatics-separation', 'UOP Parex, a named swing adsorption unit with a facts table'],
  ['chem.silicone.rochow', 'the Rochow direct process: the named reaction that makes silicone'],
  ['chem.ethylene.polyethylene.hdpe.ziegler-natta.titanium-catalyst.tetrachloride', '985 characters on chlorinating rutile and distilling TiCl4 out at 136 C'],
  ['chem.ethylene.quench.gas-quench', 'gas rather than liquid quench, with the acetylene consequence'],
  ['metal.hall-heroult.pot-lining', 'carbon lining 400-600 mm thick, four facts, three materials'],
  ['peripheral.tv.crt.gun.blackening', 'flame blacking is a manufacturing step with its own reagents'],
  ['peripheral.tv.crt.phosphor.zns.so2', 'double-contact sulphuric acid plant, with a facts table'],
]);

/* -- R5 altitude and bare processes --------------------------------------- */
for (const n of all) {
  if (n.kind === 'process' && (n.children ?? []).length === 0 && !n.from?.length) {
    const keep = TERMINAL_PROCS.get(n.id);
    if (keep) add('5', 'NOTE', `${n.id}: childless process, reviewed and kept — ${keep}`, [n.id]);
    else add('5', 'WARN', `${n.id}: childless process — keep it if it names a real operation, otherwise fold it into the parent`, [n.id]);
  }
  if ((n.description ?? '').length < 120) add('5', 'WARN', `${n.id}: thin description (${(n.description ?? '').length} ch)`, [n.id]);
}

/* -- R6 naming ------------------------------------------------------------- */
for (const n of all) {
  if (/[.!]$/.test(n.name)) add('6', 'WARN', `${n.id}: name ends with punctuation`, [n.id]);
  if (/\b(above|below|earlier|previous section|the other)\b/i.test(n.name)) {
    add('6', 'WARN', `${n.id}: name refers to context outside itself`, [n.id]);
  }
}

/* -- R7 structure integrity ------------------------------------------------ */
for (const n of all) {
  if (!n.name) add('7', 'FAIL', `${n.id}: no name`);
  if (!n.description) add('7', 'FAIL', `${n.id}: no description`);
  for (const c of n.children ?? []) if (!N[c]) add('7', 'FAIL', `${n.id}: dangling child "${c}"`);
  for (const f of n.from ?? []) if (!N[f]) add('7', 'FAIL', `${n.id}: dangling from "${f}"`);
  if (n.confidence && !['high', 'medium', 'low'].includes(n.confidence)) {
    add('7', 'FAIL', `${n.id}: confidence "${n.confidence}" invalid`);
  }
}

/* -- summary -------------------------------------------------------------- */
const byLevel = { FAIL: [], WARN: [], NOTE: [] };
for (const r of rows) byLevel[r.level].push(r);

console.log(`\n=== audit${fileArg ? ` of ${fileArg}` : ''} ===`);
console.log(`  ${all.length} nodes examined\n`);

/* NOTE is for findings that were reviewed and deliberately accepted. They are
   reported so the decision stays visible, but they are not warnings and must
   not affect the exit code -- otherwise a recorded exemption reads as an
   outstanding defect. */
for (const level of ['FAIL', 'WARN', 'NOTE']) {
  const list = byLevel[level];
  if (!list?.length) continue;
  const grouped = new Map();
  for (const r of list) grouped.set(`${r.rule}|${r.msg}`, (grouped.get(`${r.rule}|${r.msg}`) ?? 0) + 1);
  console.log(`  ${level}  ${list.length} occurrence(s), ${grouped.size} distinct`);
  const sorted = [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  /* --all lists every distinct finding. Without it the report silently hides
     rules that fall outside the top 18 by count, which is how 17 warnings from
     rules other than r3 went unnoticed. */
  const cap = argv.includes('--all') ? sorted.length : 18;
  for (const [key, count] of sorted.slice(0, cap)) {
    const [rule, msg] = key.split('|');
    console.log(`      [r${rule}] ${count > 1 ? `x${count} ` : ''}${msg.slice(0, 170)}`);
  }
  if (sorted.length > cap) console.log(`      ... and ${sorted.length - cap} more distinct (use --all)`);
  console.log('');
}

const failures = byLevel.FAIL.length;
console.log(`  RESULT: ${failures === 0 ? 'PASS (no mechanical failures)' : `FAIL — ${failures} to fix`}`);
console.log(`  ${meta.nodes} nodes, depth ${meta.maxDepth}\n`);
process.exit(failures === 0 ? 0 : 1);