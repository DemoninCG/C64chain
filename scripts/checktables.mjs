#!/usr/bin/env node
/** checktables.mjs — validate the three curated tables in data/ against the tree. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodes: N } = JSON.parse(await readFile(path.join(ROOT, 'public/tree.json'), 'utf8'));

const read = async (f) => {
  try {
    return JSON.parse(await readFile(path.join(ROOT, 'data', f), 'utf8'));
  } catch (e) {
    console.log(`  ${f}: UNPARSEABLE — ${e.message}`);
    return null;
  }
};

const ing = await read('_ingredients.json');
const al = await read('_aliases.json');
const fx = await read('_fixes.json');

console.log('\n=== _ingredients.json ===');
if (ing) {
  const map = Object.fromEntries(Object.entries(ing.map ?? {}).filter(([k]) => !k.startsWith('_')));
  const dead = Object.entries(map).filter(([, v]) => !N[v]);
  console.log(`  mappings: ${Object.keys(map).length}`);
  console.log(`  pointing at ids that DO NOT EXIST: ${dead.length}`);
  for (const [k, v] of dead) console.log(`      ${k.padEnd(28)} -> ${v}`);
}

console.log('\n=== _aliases.json ===');
if (al) {
  const keys = Object.keys(al).filter((k) => !k.startsWith('$'));
  const dead = keys.filter((k) => !N[al[k]]);
  console.log(`  mappings: ${keys.length} | targets missing: ${dead.length}`);
  for (const k of dead) console.log(`      ${k} -> ${al[k]}`);
  const selfMap = keys.filter((k) => al[k] === k);
  if (selfMap.length) console.log(`  identity mappings (target == key): ${selfMap.join(', ')}`);
}

console.log('\n=== _fixes.json ===');
if (fx) {
  const kinds = Object.entries(fx.kind ?? {}).filter(([k]) => !k.startsWith('_'));
  const missing = kinds.filter(([id]) => !N[id]);
  console.log(`  kind retypes: ${kinds.length} | ids not in tree: ${missing.length}`);
  for (const [id, want] of missing) console.log(`      ${id} -> ${want}`);
  const notes = (fx.note ?? []).filter((id) => !N[id]);
  console.log(`  note ids: ${(fx.note ?? []).length} | ids not in tree: ${notes.length}`);
  for (const id of notes) console.log(`      ${id}`);
  // does a fix contradict what the fragment now says?
  for (const [id, want] of kinds) {
    if (N[id] && N[id].kind !== want) {
      console.log(`      CONFLICT ${id}: fix says "${want}", fragment now says "${N[id].kind}"`);
    }
  }
}
console.log('');