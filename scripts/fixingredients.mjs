/**
 * fixingredients.mjs — repair data/_ingredients.json.
 *
 * Two separate sources of wrongness, both caught by scripts/spotcheck and a
 * name-vs-target comparison rather than by the build:
 *
 *  1. Targets deleted by the QA pass and by the cross-fragment merge, which
 *     re-pointed fragment references but never the lookup tables.
 *  2. Targets that were always chemically wrong — "borax" and "boric acid"
 *     pointing at E-glass fibre, "soda ash" at rock salt, "kaolin" at bauxite.
 *     These resolve cleanly, so no mechanical check would ever have caught them.
 *
 * Refuses to write if any proposed target is not a node in the built tree.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const { nodes: N } = JSON.parse(readFileSync('public/tree.json', 'utf8'));

const FIXES = {
  // chemically wrong: the boron source is not the glass it goes into
  'borax': 'chem.glass-fiber.borax',
  'boric acid': 'chem.glass-fiber.borax.acid',
  // kaolin is a clay, not a bauxite; bauxite is its parent ore, not a synonym
  'kaolin': 'metal.bauxite.kaolinite',
  'clay': 'metal.bentonite',
  // soda ash is Na2CO3, not NaCl
  'soda ash': 'metal.soda-ash',
  // targets deleted during the QA pass / the merge
  'hydrogen': 'facility.gases.hydrogen',
  'polypropylene': 'chem.propylene.polymerisation',
  // there is no canonical tungsten-metal node; wolframite/scheelite is the
  // closest honest answer, and the gap is noted in the file's $note
  'tungsten wire': 'metal.molybdenum.scheelite',
};

const path = 'data/_ingredients.json';
const doc = JSON.parse(readFileSync(path, 'utf8'));

const bad = Object.entries(FIXES).filter(([, v]) => !N[v]);
if (bad.length) {
  console.error('refusing to write — these targets are not in the tree:');
  for (const [k, v] of bad) console.error(`  "${k}" -> ${v}`);
  process.exit(1);
}

const applied = [];
for (const [k, v] of Object.entries(FIXES)) {
  const before = doc.map[k];
  if (before === undefined) { console.log(`  skip "${k}": not in the table`); continue; }
  if (before === v) { console.log(`  skip "${k}": already ${v}`); continue; }
  applied.push({ key: k, from: before, to: v, wasName: N[before]?.name ?? '(deleted)' });
  doc.map[k] = v;
}

doc.$note = `${doc.$note ?? ''} Tungsten still has no canonical metal node: "tungsten wire" points at the wolframite/scheelite branch, which is the ore it would be drawn from, not the metal itself. Review that mapping if a tungsten node is ever added.`.trim();

writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`applied ${applied.length} corrections:`);
for (const a of applied) console.log(`  "${a.key}": ${a.from} -> ${a.to}`);
console.log(`  (was: ${applied.map((a) => `"${a.wasName}"`).join(', ')})`);
console.log(`mappings now: ${Object.keys(doc.map).length}`);