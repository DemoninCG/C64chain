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
const PROCESSISH = new Set(['process', 'tool', 'facility', 'note']);
const VALID_KIND = new Set(['part', 'process', 'material', 'facility', 'tool', 'note']);
const VALID_CAT = new Set(['silicon', 'passives', 'board', 'plastics', 'metals', 'magnetics',
  'interconnect', 'power', 'assembly', 'optics', 'fluids', 'energy', 'packaging',
  'logistics', 'computing', 'industry']);

// category is expected to describe the industry; a kind/category clash is a signal
const CAT_OK = {
  energy: new Set(['facility', 'process']),
  computing: new Set(['part', 'material']),
  logistics: new Set(['process', 'facility']),
  packaging: new Set(['part', 'material', 'process']),
  assembly: new Set(['process']),
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

/* -- R5 altitude and bare processes --------------------------------------- */
for (const n of all) {
  if (n.kind === 'process' && (n.children ?? []).length === 0 && !n.from?.length) {
    add('5', 'WARN', `${n.id}: bare process — fold into the parent description`, [n.id]);
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
const byLevel = { FAIL: [], WARN: [] };
for (const r of rows) byLevel[r.level].push(r);

console.log(`\n=== audit${fileArg ? ` of ${fileArg}` : ''} ===`);
console.log(`  ${all.length} nodes examined\n`);

for (const level of ['FAIL', 'WARN']) {
  const list = byLevel[level];
  const grouped = new Map();
  for (const r of list) grouped.set(`${r.rule}|${r.msg}`, (grouped.get(`${r.rule}|${r.msg}`) ?? 0) + 1);
  console.log(`  ${level}  ${list.length} occurrence(s), ${grouped.size} distinct`);
  const sorted = [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sorted.slice(0, 18)) {
    const [rule, msg] = key.split('|');
    console.log(`      [r${rule}] ${count > 1 ? `x${count} ` : ''}${msg.slice(0, 150)}`);
  }
  if (sorted.length > 18) console.log(`      ... and ${sorted.length - 18} more distinct`);
  console.log('');
}

const failures = byLevel.FAIL.length;
console.log(`  RESULT: ${failures === 0 ? 'PASS (no mechanical failures)' : `FAIL — ${failures} to fix`}`);
console.log(`  ${meta.nodes} nodes, depth ${meta.maxDepth}\n`);
process.exit(failures === 0 ? 0 : 1);