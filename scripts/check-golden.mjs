/* Check GOLDEN-IDEA.md against the schema: every declared relation must appear in
 * the document's tables, and the document must not name a relation the schema
 * does not declare. This exists because the document shipped for a day naming
 * only ten of eleven relations and giving `step` the opposite direction to the
 * schema -- and an agent caught it by reading the two side by side. */
import { readFileSync } from 'node:fs';
const ROOT = 'C:/My Things/itemShop/other/C64chain/';
const S = JSON.parse(readFileSync(`${ROOT}data/_relation_schema.json`, 'utf8'));
const doc = readFileSync(`${ROOT}docs/GOLDEN-IDEA.md`, 'utf8');

const declared = Object.keys(S.relations);
const missing = declared.filter((r) => !doc.includes('| `' + r + '`'));
/* Only the FIRST column of a table row inside section 3 is a relation name. Two
 * earlier versions of this check matched too widely and reported `material`,
 * `process`, `facility` and `org` as invented relations -- they are kinds, and
 * they appear both in the "stored on" column of section 3 and as row leaders in
 * the section 2 kinds table. A checker that cries wolf gets ignored, which is
 * worse than having none, so the check is now scoped to the one section that can
 * legitimately contain a relation name. */
const sec3 = doc.slice(doc.indexOf('## 3. The eleven relations'), doc.indexOf('## 4.'));
const named = [...sec3.matchAll(/^\|\s*`([a-z][a-z ]{2,12}?)`\s*\|/gm)].map((m) => m[1]);
const invented = [...new Set(named)].filter((x) => !declared.includes(x));

console.log('\n=== GOLDEN-IDEA.md vs data/_relation_schema.json ===');
console.log(`  relations declared in schema : ${declared.length}`);
console.log(`  missing from the document    : ${missing.length ? missing.join(', ') : 'none'}`);
console.log(`  named but not declared       : ${invented.length ? invented.join(', ') : 'none'}`);

/* the `step` direction, which was backwards in the document */
const stepStored = S.relations.step.stored.join(', ');
const stepOk = doc.includes('`part→process`') || doc.includes('`part -> process`');
console.log(`\n  schema stores step on        : ${stepStored}`);
console.log(`  document says part->process  : ${stepOk ? 'yes' : 'NO -- still backwards'}`);

/* every kind named in the schema's VALID_KINDS should appear in the document */
const kinds = ['part', 'process', 'material', 'tool', 'facility', 'site', 'org', 'note'];
const kindMissing = kinds.filter((k) => !doc.includes('`' + k + '`'));
console.log(`  kinds missing from document  : ${kindMissing.length ? kindMissing.join(', ') : 'none'}`);

const ok = !missing.length && !invented.length && stepOk && !kindMissing.length;
console.log(`\n  ${ok ? 'CONSISTENT' : 'INCONSISTENT — fix before dispatching more agents'}`);