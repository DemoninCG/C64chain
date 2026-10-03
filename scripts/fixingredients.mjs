/**
 * fixingredients.mjs — repair data/_ingredients.json.
 *
 * Two rounds of correction, both driven by scripts/ingredients.mjs rather than
 * by reading the table.
 *
 * Round 1, targets deleted by the QA pass and by the cross-fragment merge, which
 * re-pointed fragment references but never the lookup tables.
 *
 * Round 2, found by `ingredients.mjs links`, which flags a mapping whose target
 * never mentions the substance being looked up. This is the only check that
 * catches the failure mode that matters, because these links all resolve
 * cleanly to a real node and are invisible to every build and audit check:
 *
 *   "borax"      -> E-glass fibre      (the boron goes into the glass)
 *   "soda ash"   -> rock salt          (Na2CO3 is not NaCl)
 *   "barite"     -> barium carbonate   (BaSO4 is not BaCO3)
 *   "kaolin"     -> bauxite            (a clay, not the ore covering it)
 *   "polystyrene"-> ABS                (backwards: ABS contains it)
 *   "polyphenylene sulfide" -> polyester (different polymer entirely)
 *
 * Some mappings are REMOVED rather than repointed, because no node for the
 * substance exists and inventing a target is how the errors above happened.
 * The input string stays on the node as free text; it just stops asserting a
 * false provenance. Those substances are logged as coverage gaps in
 * docs/TODO.md.
 *
 * Refuses to write if any proposed target is not a node in the built tree.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const { nodes: N } = JSON.parse(readFileSync('public/tree.json', 'utf8'));

const FIXES = {
  // --- round 1: targets deleted during the QA pass / the merge ---------------
  // chemically wrong: the boron source is not the glass it goes into
  'borax': 'chem.glass-fiber.borax',
  'boric acid': 'chem.glass-fiber.borax.acid',
  // kaolin is a clay, not a bauxite; bauxite is its parent ore, not a synonym
  'kaolin': 'metal.bauxite.kaolinite',
  'clay': 'metal.bentonite',
  // soda ash is Na2CO3, not NaCl
  'soda ash': 'metal.soda-ash',
  'hydrogen': 'facility.gases.hydrogen',
  'polypropylene': 'chem.propylene.polymerisation',
  // there is no canonical tungsten-metal node; wolframite/scheelite is the
  // closest honest answer, and the gap is noted in the file's $note
  'tungsten wire': 'metal.molybdenum.scheelite',

  // --- round 2: found by `ingredients.mjs links` -----------------------------
  'barite': 'metal.barite',                                  // BaSO4, not BaCO3
  // TiCl4 is the catalyst, not a product of the ethylene plant
  'titanium tetrachloride': 'chem.ethylene.polyethylene.hdpe.ziegler-natta.titanium-catalyst',
};

/** Removed outright: wrong target AND no node for the substance exists. */
const REMOVE = [
  ['polystyrene', 'pointed at ABS, which contains it rather than being made from it'],
  ['polyphenylene sulfide', 'an arylenethioether, not a polyester; no PPS node exists'],
  ['chrome alum', 'no chrome alum node exists'],
];

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

const removed = [];
for (const [k, why] of REMOVE) {
  if (doc.map[k] === undefined) { console.log(`  skip "${k}": already absent`); continue; }
  const was = N[doc.map[k]]?.name ?? doc.map[k];
  removed.push({ key: k, was, why });
  delete doc.map[k];
}

const notes = [
  'Tungsten still has no canonical metal node: "tungsten wire" points at the wolframite/scheelite branch, which is the ore it would be drawn from, not the metal itself. Review that mapping if a tungsten node is ever added.',
  'No node exists for polystyrene as a substance, for polyphenylene sulfide, or for chrome alum, so those input strings are left unresolved rather than mapped to a near neighbour.',
  'Several entries still point at `process` nodes, which inverts the `from` relation: it reads as "this substance is made of this procedure". Fixing those properly needs material nodes for the substances, not a better mapping.',
];
doc.$note = notes.join(' ');

writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`applied ${applied.length} corrections:`);
for (const a of applied) console.log(`  "${a.key}": ${a.from} -> ${a.to}   (was "${a.wasName}")`);
console.log(`\nremoved ${removed.length} mappings that had no honest target:`);
for (const r of removed) console.log(`  "${r.key}" -> ${r.was}  because ${r.why}`);
console.log(`\nmappings now: ${Object.keys(doc.map).length}`);