#!/usr/bin/env node
/**
 * ambig.mjs — how many ingredient links are resolved by NAME, and how many of
 * those names are shared by more than one node?
 *
 * The name fallback is the fragile part of `from` resolution: the tree has ~2,700
 * nodes, so a name that matches two of them is a coin flip, and deleting an
 * unrelated node anywhere can silently redirect a link in a different fragment.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodes: N } = JSON.parse(await readFile(path.join(ROOT, 'public/tree.json'), 'utf8'));

const normKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const ids = new Set(Object.keys(N));

// mirror build.mjs: entity-ish nodes get indexed by name and by last id segment
const index = new Map(); // key -> Set of ids
for (const [id, n] of Object.entries(N)) {
  if (!n.name) continue;
  const k = normKey(n.name);
  if (k.length >= 8) {
    if (!index.has(k)) index.set(k, new Set());
    index.get(k).add(id);
  }
  const tail = normKey(id.split('.').pop());
  if (tail.length >= 6) {
    if (!index.has(tail)) index.set(tail, new Set());
    index.get(tail).add(id);
  }
}

let exact = 0, byName = 0, ambiguous = 0, unresolvable = 0;
const ambExamples = [];
for (const n of Object.values(N)) {
  for (const raw of n.inputs ?? []) {
    const s = String(raw).trim();
    if (!s) continue;
    if (ids.has(s)) { exact++; continue; }
    const set = index.get(normKey(s));
    if (set && set.size === 1) byName++;
    else if (set && set.size > 1) {
      ambiguous++;
      if (ambExamples.length < 12) ambExamples.push(`${n.id}  "${s}"  -> ${[...set].join(' | ')}`);
    } else unresolvable++;
  }
}

console.log('\n=== ingredient link resolution ===');
console.log(`  exact id                 ${exact}`);
console.log(`  by name, unambiguous     ${byName}`);
console.log(`  by name, AMBIGUOUS       ${ambiguous}`);
console.log(`  unresolved               ${unresolvable}`);
console.log(`  -> ${((ambiguous / Math.max(1, exact + byName + ambiguous + unresolvable)) * 100).toFixed(1)}% of all ingredient strings resolve to a COIN FLIP`);
if (ambExamples.length) {
  console.log('\n  examples:');
  for (const e of ambExamples) console.log(`    ${e}`);
}
console.log('');