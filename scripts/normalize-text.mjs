#!/usr/bin/env node
/**
 * normalize-text.mjs — replace common non-ASCII characters with plain-ASCII
 * equivalents across data/*.json. The C64 text-mode viewer is PETSCII-only,
 * so these are fixed at the data level instead of papered over at render
 * time. Run: node scripts/normalize-text.mjs (or npm run normalize-text)
 * Enforced by scripts/selftest.mjs ("data is plain ASCII").
 *
 * The table covers the offenders AI-authored prose actually produces (dashes,
 * quotes, ellipsis, math signs, units, section marks, accented Latin). It is
 * deliberately not exhaustive — anything outside the table is fixed by hand.
 *
 * No dependencies.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.resolve(process.env.DATA_DIR ?? path.join(ROOT, 'data'));

const MAP = {
  '—': '-', '–': '-', '−': '-',
  '‘': "'", '’': "'", '‚': "'", '‛': "'",
  '“': '"', '”': '"', '„': '"',
  '…': '...',
  '·': '.', '•': '-',
  '±': '+/-',
  '°': 'deg',
  'µ': 'u',
  '×': 'x', '÷': '/',
  '§': 'Sec. ',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
  'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
  'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ã': 'A', 'Å': 'A',
  'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ø': 'o',
  'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O', 'Õ': 'O', 'Ø': 'O',
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
  'ç': 'c', 'Ç': 'C', 'ñ': 'n', 'Ñ': 'N',
  'ō': 'o', 'Ō': 'O',
  'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE', 'ß': 'ss',
};

const re = new RegExp(`[${Object.keys(MAP).join('')}]`, 'g');

const files = (await readdir(DATA)).filter((f) => f.endsWith('.json')).sort();
let touched = 0;
let replaced = 0;
const byChar = new Map();
for (const f of files) {
  const p = path.join(DATA, f);
  const text = await readFile(p, 'utf8');
  let n = 0;
  const next = text.replace(re, (ch) => {
    n++;
    byChar.set(ch, (byChar.get(ch) ?? 0) + 1);
    return MAP[ch];
  });
  if (!n) continue;
  await writeFile(p, next);
  console.log(`  ${f}: ${n} replacement(s)`);
  touched++;
  replaced += n;
}
if (touched) {
  console.log(`\n  fixed ${replaced} character(s) in ${touched} file(s):`);
  for (const [ch, n] of [...byChar].sort((a, b) => b[1] - a[1])) {
    console.log(`    U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} ${JSON.stringify(ch)} x${n} -> ${JSON.stringify(MAP[ch])}`);
  }
  console.log('');
} else {
  console.log('\n  nothing to normalize\n');
}
