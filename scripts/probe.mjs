#!/usr/bin/env node
/**
 * probe.mjs — print an annotated view of one supply line, for comparing the
 * tree as it is against the tree as we want it.
 *
 *   node scripts/probe.mjs <nodeId> [maxDepth]
 *
 * Every node is annotated with the defects the QA pass will have to judge:
 *   [Q]      question-framed name -- may be commentary, may be a real node
 *   [dup:n]  this normalised name appears on n other nodes (possible duplicate)
 *   [from:n] n resolved ingredient links
 *   [bare]   a process with no children and no ingredients: a dead end
 *   [thin]   description under 120 chars
 *   [nocat]  no category, or a category that does not match its kind
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodes: N } = JSON.parse(await readFile(path.join(ROOT, 'public/tree.json'), 'utf8'));

const start = process.argv[2];
const MAX = Number(process.argv[3] ?? 14);
if (!start || !N[start]) {
  console.error(`unknown node: ${start}`);
  console.error('try one of:\n  ' + Object.keys(N).filter((i) => /^(c64\.|mb\.|metal\.|chem\.)/.test(i)).slice(0, 12).join('\n  '));
  process.exit(1);
}

const KIND = { part: 'PART', material: 'MATL', process: 'proc', tool: 'TOOL', facility: 'FACL', note: 'NOTE' };
const norm = (s) => String(s).toLowerCase().replace(/\bfor the [a-z ]+$/i, '')
  .replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(the|a|an|of|and|for|from|to|in|at|its|their|with)\b/g, ' ').replace(/\s+/g, ' ').trim();

const nameCount = new Map();
for (const n of Object.values(N)) {
  const k = norm(n.name);
  if (k.length >= 8) nameCount.set(k, (nameCount.get(k) ?? 0) + 1);
}

const EXPECTED_CAT = {
  part: new Set(['silicon', 'interconnect', 'board', 'passives', 'computing', 'peripherals', 'magnetics', 'power']),
  material: new Set(['metals', 'plastics', 'silicon', 'passives', 'fluids', 'magnetics', 'optics', 'board', 'energy']),
};

function flags(n) {
  const f = [];
  if (/^(why|where|how|what|when|who|which|is|are|was|were|did|does|do|can|could|should)\b/i.test(n.name)) f.push('Q');
  const k = norm(n.name);
  if (k.length >= 8 && (nameCount.get(k) ?? 0) > 1) f.push(`dup:${nameCount.get(k)}`);
  if (n.from?.length) f.push(`from:${n.from.length}`);
  const kids = (n.children ?? []).length;
  if (n.kind === 'process' && kids === 0 && !n.from?.length) f.push('bare');
  if ((n.description ?? '').length < 120) f.push('thin');
  if (!n.category) f.push('nocat');
  else if (EXPECTED_CAT[n.kind] && !EXPECTED_CAT[n.kind].has(n.category)) f.push(`cat?${n.category}`);
  return f;
}

let total = 0;
const tally = new Map();

function walk(id, d, prefix, isLast) {
  const n = N[id];
  if (!n) return;
  total++;
  const f = flags(n);
  for (const x of f) {
    const key = x.startsWith('dup') ? 'dup' : x.split(':')[0];
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const branch = prefix + (isLast ? '`-- ' : '|-- ');
  console.log(`${branch}${(KIND[n.kind] ?? '????').padEnd(4)} ${n.name}${f.length ? '   ' + f.map((x) => `[${x}]`).join(' ') : ''}`);
  const kids = n.children ?? [];
  const nextPrefix = prefix + (isLast ? '    ' : '|   ');
  kids.forEach((c, i) => walk(c, d + 1, nextPrefix, i === kids.length - 1));
  void d;
}

console.log(`\n=== ${start} ===`);
console.log(`    ${N[start].kind} · ${N[start].category} · ${(N[start].children ?? []).length} children`);
console.log(`    ${(N[start].description ?? '').slice(0, 200)}\n`);
walk(start, 0, '', true);

console.log(`\n    ${total} nodes in this line`);
console.log(`    defects: ${[...tally].map(([k, v]) => `${k}=${v}`).join('  ')}`);
if (N[start].from?.length) {
  console.log(`    ingredients: ${N[start].from.map((f) => N[f]?.name ?? f).join(', ')}`);
}
console.log('');