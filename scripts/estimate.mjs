#!/usr/bin/env node
/** estimate.mjs — size the QA pass. Read-only; prints the counts the
 *  end-state projection in the README and the review plan are based on. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodes: N, meta } = JSON.parse(await readFile(path.join(ROOT, 'public/tree.json'), 'utf8'));
const all = Object.values(N);

const parents = {};
for (const [id, n] of Object.entries(N)) for (const c of n.children ?? []) (parents[c] ??= []).push(id);

console.log('\n=== definitions vs rendered instances ===');
console.log(`  unique node definitions        ${all.length}`);
let inst = 0;
const seen = new Set();
(function w(id) { if (!N[id]) return; inst++; for (const c of N[id].children ?? []) w(c); })('c64');
console.log(`  child edges in the whole tree  ${inst - 1}`);
console.log(`  mean children per node         ${meta.avgChildren}`);

console.log('\n=== are the utilities duplicates? ===');
const byName = (nm) => Object.entries(N).filter(([, v]) => v.name === nm);
for (const nm of ['Water for a factory', 'Electricity at the factory wall', 'Natural gas: the gas field', 'Petroleum: light sour crude oil']) {
  const ids = byName(nm).map(([k]) => k);
  for (const id of ids) {
    console.log(`  "${nm}" -> 1 definition, referenced by ${(parents[id] ?? []).length} parents`);
  }
}
console.log('  => already single nodes. The defect is the EDGE TYPE, not the count.');

console.log('\n=== cross-cutting edges that should be `from`, not `children` ===');
const UTIL = ['Water for a factory', 'Electricity at the factory wall', 'Ultrapure water for the fab',
  'Ordinary industrial water', 'Natural gas: the gas field', 'Petroleum: light sour crude oil',
  'Compressed air for the plant', 'Inert nitrogen for the plant'];
let relocatable = 0;
const utilIds = new Set();
for (const nm of UTIL) for (const [id] of byName(nm)) {
  if ((parents[id] ?? []).length <= 1) continue;
  utilIds.add(id);
  relocatable += parents[id].length;
}
console.log(`  utility nodes                  ${utilIds.size}`);
console.log(`  child edges to relocate        ${relocatable}`);

console.log('\n=== candidates for removal ===');
const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(the|a|an|of|and|for|from|to|in|at|its|their|with)\b/g, ' ').replace(/\s+/g, ' ').trim();
const groups = new Map();
for (const n of all) {
  const k = norm(n.name);
  if (k.length < 8) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(n.id);
}
const dupGroups = [...groups.values()].filter((v) => v.length > 1);
const removable = dupGroups.reduce((s, v) => s + v.length - 1, 0);
console.log(`  near-duplicate groups          ${dupGroups.length}`);
console.log(`  nodes involved                 ${dupGroups.reduce((s, v) => s + v.length, 0)}`);
console.log(`  removable if each collapses    ${removable}`);

const bare = all.filter((n) => n.kind === 'process' && (n.children ?? []).length === 0 && !n.from?.length).length;
const thin = all.filter((n) => (n.description ?? '').length < 120).length;
const qLeaf = all.filter((n) => /^(why|where|how|what|when|who)\b/i.test(n.name) && (n.children ?? []).length === 0).length;
const qBox = all.filter((n) => /^(why|where|how|what|when|who)\b/i.test(n.name) && (n.children ?? []).length > 0).length;
console.log(`  bare processes (fold up)       ${bare}`);
console.log(`  thin descriptions (<120 ch)    ${thin}`);
console.log(`  question-framed leaves         ${qLeaf}   -> kind: note`);
console.log(`  question-framed containers     ${qBox}   -> judgement needed`);

console.log('\n=== projection ===');
const flat = [];
(function w(id, d) {
  if (!N[id]) return;
  flat.push({ id, d });
  for (const c of N[id].children ?? []) w(c, d + 1);
})('c64');
const ENTITY = new Set(['part', 'material']);
console.log(`  full tree, max depth           ${Math.max(...flat.map((f) => f.d))}`);
console.log(`  entity nodes                   ${all.filter((n) => ENTITY.has(n.kind)).length}`);

console.log('\n=== end-state projection ===');
const LOW = removable + Math.round(bare * 0.45);
const HIGH = LOW - removable + Math.round(bare * 0.25);
console.log(`  certain removals (dedup)       -${removable}`);
console.log(`  likely removals (bare folded)  -${Math.round(bare * 0.25)} .. -${Math.round(bare * 0.45)}`);
console.log(`  likely additions (splits, links, missing branches)`);
console.log(`    the two uncovered branches   +40 .. +120`);
console.log(`  => unique nodes: ${all.length - HIGH} .. ${all.length - LOW + 160}`);
console.log('     (lower bound assumes no additions at all)');
console.log('');