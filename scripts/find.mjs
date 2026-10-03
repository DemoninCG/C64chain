#!/usr/bin/env node
/** find.mjs — locate a node by substring, for repairing the curated tables. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodes: N } = JSON.parse(await readFile(path.join(ROOT, 'public/tree.json'), 'utf8'));

for (const q of process.argv.slice(2)) {
  const re = new RegExp(q, 'i');
  const hits = Object.entries(N)
    .filter(([id, n]) => re.test(id) || re.test(n.name ?? ''))
    .slice(0, 10);
  console.log(`\n=== ${q} — ${hits.length} hit(s)`);
  for (const [id, n] of hits) {
    console.log(`  ${(n.kind + '        ').slice(0, 9)} ${(n.children ?? []).length}k  ${id}\n        ${(n.name ?? '').slice(0, 70)}`);
  }
}
console.log('');