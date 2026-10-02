#!/usr/bin/env node
/**
 * inspect.mjs — per-file quality report for data/*.json.
 * Run: node scripts/inspect.mjs [file.json ...]
 * Without arguments, reports every file.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');

const all = (await readdir(DATA)).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();
const want = process.argv.slice(2);
const files = want.length ? all.filter((f) => want.some((w) => f.includes(w))) : all;

const rows = [];
let grand = 0;

for (const f of files) {
  let doc;
  try {
    doc = JSON.parse(await readFile(path.join(DATA, f), 'utf8'));
  } catch (e) {
    rows.push({ f, status: `PARSE ERROR: ${e.message.slice(0, 60)}` });
    continue;
  }

  const roots = [];
  if (doc.id && doc.name && !doc.root) roots.push(doc);
  if (doc.root) roots.push(doc.root);
  if (Array.isArray(doc.roots)) roots.push(...doc.roots);
  for (const n of Object.values(doc.nodes ?? {})) roots.push(n);
  for (const n of Object.values(doc.shared ?? {})) roots.push(n);

  let count = 0, maxD = 0, leaves = 0, chars = 0, short = 0, noSrc = 0, low = 0, med = 0;
  const ids = new Set();
  const cats = new Set();
  const kinds = new Set();
  const refs = new Set();
  const seen = new Set();

  function walk(n, d) {
    if (!n || typeof n !== 'object' || seen.has(n)) return;
    seen.add(n);
    count++;
    maxD = Math.max(maxD, d);
    ids.add(n.id);
    if (n.category) cats.add(n.category);
    if (n.kind) kinds.add(n.kind);
    const dl = (n.description ?? '').length;
    chars += dl;
    if (dl < 60) short++;
    if (!n.sources?.length) noSrc++;
    if (n.confidence === 'low') low++;
    if (n.confidence === 'medium') med++;
    const kids = (n.children ?? []).filter((c) => typeof c === 'object');
    if (!kids.length) leaves++;
    for (const c of n.children ?? []) {
      if (typeof c === 'string') refs.add(c);
      else walk(c, d + 1);
    }
  }
  roots.forEach((r) => walk(r, 0));

  grand += count;
  rows.push({
    f, status: 'ok', count, maxD, leaves, short, noSrc, low, med,
    roots: roots.map((r) => r.id).join(' '),
    cats: [...cats].join(','), kinds: [...kinds].join(','),
    avgDesc: Math.round(chars / Math.max(1, count)),
    refs: [...refs].filter((r) => !ids.has(r)).length,
    external: [...refs].filter((r) => !ids.has(r)),
  });
}

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
console.log(
  `\n  ${pad('file', 22)}${lpad('nodes', 6)}${lpad('depth', 7)}${lpad('leaves', 8)}` +
  `${lpad('avgdesc', 9)}${lpad('<60ch', 7)}${lpad('no-src', 8)}${lpad('low', 5)}${lpad('med', 5)}${lpad('extRefs', 8)}  roots`
);
console.log('  ' + '-'.repeat(140));
for (const r of rows) {
  if (r.status !== 'ok') { console.log(`  ${pad(r.f, 22)}  ${r.status}`); continue; }
  console.log(
    `  ${pad(r.f, 22)}${lpad(r.count, 6)}${lpad(r.maxD, 7)}${lpad(r.leaves, 8)}` +
    `${lpad(r.avgDesc, 9)}${lpad(r.short, 7)}${lpad(r.noSrc, 8)}${lpad(r.low, 5)}${lpad(r.med, 5)}${lpad(r.refs, 8)}  ${r.roots}`
  );
  if (r.external.length) console.log(`     external refs: ${r.external.join(' ')}`);
  console.log(`     categories: ${r.cats}\n     kinds: ${r.kinds}`);
}
console.log(`\n  total nodes across fragments: ${grand.toLocaleString()}\n`);