#!/usr/bin/env node
/**
 * analyse.mjs — structural diagnostics for the tree. Answers four questions
 * that decide what a "components and materials only" view would actually cost:
 *
 *   1. how many nodes are physical entities vs. process/tool/facility?
 *   2. how deeply does an entity -> process -> entity alternation run, i.e. how
 *      much of the graph disappears if you hide non-entity nodes?
 *   3. how many near-duplicate names exist (the subagent artefact)?
 *   4. how much of the recorded `inputs` information is already linkable to a
 *      real node but recorded only as free text?
 *
 * Read-only. Writes nothing.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodes: N, meta } = JSON.parse(await readFile(path.join(ROOT, 'public/tree.json'), 'utf8'));

const ENTITY = new Set(['part', 'material']);
const NONENTITY = new Set(['process', 'tool', 'facility']);
const kids = (id) => (N[id]?.children ?? []).filter((c) => N[c]);

/* ---------------------------------------------------- 1. kind census */
const kindCount = {};
for (const n of Object.values(N)) kindCount[n.kind] = (kindCount[n.kind] ?? 0) + 1;
const entity = kindCount.part + kindCount.material;

console.log('\n=== 1. what is actually a node ===');
for (const [k, v] of Object.entries(kindCount).sort((a, b) => b[1] - a[1])) {
  const pct = ((v / meta.nodes) * 100).toFixed(1);
  const tag = ENTITY.has(k) ? '  entity  ' : NONENTITY.has(k) ? '  process-ish' : '';
  console.log(`  ${String(v).padStart(5)}  ${pct.padStart(5)}%  ${k.padEnd(9)}${tag}`);
}
console.log(`  ${String(entity).padStart(5)}  ${((entity / meta.nodes) * 100).toFixed(1).padStart(5)}%  TOTAL entity (part + material)`);

/* --------------------------------- 2. entity -> process -> entity depth */
// Walk down from each entity, counting how many non-entity hops you must pass
// through before the next entity. This is what a hidden-process projection has
// to bridge in order to stay connected.
const memoAlternation = new Map();
function alternation(id) {
  if (memoAlternation.has(id)) return memoAlternation.get(id);
  memoAlternation.set(id, 0); // cycle guard
  let best = 0;
  for (const c of kids(id)) {
    const step = NONENTITY.has(N[c].kind) ? 1 : 0;
    best = Math.max(best, step + alternation(c));
  }
  memoAlternation.set(id, best);
  return best;
}

let entityWithChild = 0;
let entityBehindProcess = 0;
let pureEntityChain = 0;
for (const n of Object.values(N)) {
  if (!ENTITY.has(n.kind)) continue;
  const ch = kids(n.id);
  if (!ch.length) continue;
  entityWithChild++;
  if (ch.some((c) => NONENTITY.has(N[c].kind))) entityBehindProcess++;
  else pureEntityChain++;
}

const altHist = {};
for (const n of Object.values(N)) {
  if (!ENTITY.has(n.kind)) continue;
  const a = alternation(n.id);
  altHist[a] = (altHist[a] ?? 0) + 1;
}

console.log('\n=== 2. cost of hiding processes ===');
console.log(`  entity nodes that have children:            ${entityWithChild}`);
console.log(`  ... whose children are entities:            ${pureEntityChain}`);
console.log(`  ... that must pass through a process first: ${entityBehindProcess}`);
console.log('  deepest run of consecutive process hops below an entity:');
for (const [k, v] of Object.entries(altHist).sort((a, b) => b[0] - a[0]).slice(0, 8)) {
  console.log(`      ${String(k).padStart(2)} process hops : ${String(v).padStart(4)} entity nodes`);
}

/* ------------------------------------------- 3. near-duplicate names */
const norm = (s) => s.toLowerCase()
  .replace(/\bfor the [a-z ]+$/i, '')      // "Copper ore for the leaf"
  .replace(/\(.*?\)/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(the|a|an|of|and|for|from|to|in|at|its|their|with)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();

const byNorm = new Map();
for (const n of Object.values(N)) {
  const k = norm(n.name);
  if (k.length < 8) continue; // ignore short/generic labels
  if (!byNorm.has(k)) byNorm.set(k, []);
  byNorm.get(k).push(n.id);
}
const dupGroups = [...byNorm.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
const dupNodes = dupGroups.reduce((s, [, v]) => s + v.length, 0);

console.log('\n=== 3. near-duplicate names (subagent artefact) ===');
console.log(`  normalised-name groups with >1 node: ${dupGroups.length}`);
console.log(`  nodes involved:                      ${dupNodes}  (${((dupNodes / meta.nodes) * 100).toFixed(1)}% of tree)`);
for (const [k, v] of dupGroups.slice(0, 14)) {
  console.log(`      [${v.length}] ${k}`);
  for (const id of v.slice(0, 3)) console.log(`            ${id}`);
}

// looser pass: one name contained in another
let contained = 0;
const names = Object.values(N).map((n) => ({ id: n.id, k: norm(n.name) })).filter((x) => x.k.length > 10);
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    if (names[i].id === names[j].id) continue;
    if (names[i].k.includes(names[j].k) || names[j].k.includes(names[i].k)) { contained++; break; }
  }
}
console.log(`  nodes whose normalised name is a substring of another's: ${contained}`);

/* --------------------------------------- 4. unlinked `inputs` records */
const ids = new Set(Object.keys(N));
const nameToId = new Map();
for (const n of Object.values(N)) {
  const k = norm(n.name);
  if (k.length >= 8 && !nameToId.has(k)) nameToId.set(k, n.id);
}

let totalInputs = 0;
let byId = 0;
let byNormName = 0;
let unresolved = 0;
const unresolvedSamples = [];
for (const n of Object.values(N)) {
  for (const raw of n.inputs ?? []) {
    totalInputs++;
    const s = String(raw).trim();
    if (ids.has(s)) { byId++; continue; }
    const k = norm(s);
    if (k.length >= 8 && nameToId.has(k)) { byNormName++; continue; }
    // also try the last dotted segment of an id-like string
    const tail = s.split('.').pop();
    const kt = norm(tail);
    if (kt.length >= 8 && nameToId.has(kt)) { byNormName++; continue; }
    unresolved++;
    if (unresolvedSamples.length < 30) unresolvedSamples.push(`${n.id}  ->  "${s}"`);
  }
}
const linkable = byId + byNormName;

console.log('\n=== 4. `inputs` that are recorded but not linked ===');
console.log(`  total input records:                 ${totalInputs}`);
console.log(`  already an exact node id:            ${byId}`);
console.log(`  resolvable by normalised name:       ${byNormName}`);
console.log(`  NOT resolvable (prose only):         ${unresolved}`);
console.log(`  => link rate ${((linkable / totalInputs) * 100).toFixed(1)}%  (${linkable}/${totalInputs})`);
console.log('  samples of the unresolvable ones:');
for (const s of unresolvedSamples.slice(0, 18)) console.log(`      ${s}`);

/* ------------------------------------- 5. low-confidence inventory */
const low = Object.values(N).filter((n) => n.confidence === 'low');
const med = Object.values(N).filter((n) => n.confidence === 'medium');
const byFile = {};
for (const n of low) byFile[n.file ?? '?'] = (byFile[n.file ?? '?'] ?? 0) + 1;
console.log('\n=== 5. confidence inventory ===');
console.log(`  high     ${meta.nodes - low.length - med.length}`);
console.log(`  medium   ${med.length}`);
console.log(`  low      ${low.length}`);
console.log('  low-confidence nodes by fragment:');
for (const [f, v] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) {
  console.log(`      ${String(v).padStart(4)}  ${f}`);
}
console.log('  every low-confidence node:');
for (const n of low) console.log(`      [${n.file ?? '?'}] ${n.id}\n            ${n.name}`);

console.log('');