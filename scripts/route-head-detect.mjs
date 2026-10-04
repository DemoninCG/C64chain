/* route-head detector, v3. READ-ONLY.
 *
 * v2 gated on inbound traffic and missed 7 of the 14 instances agents had already
 * reported by hand: metal.sodium has 2 inbound and is still a ghost that must
 * die, while si.litho has 10 and is a legitimate node. Traffic conflates
 * "important" with "wrong", so it is not a gate.
 *
 * v3 drops the threshold and sorts the findings into two classes with different
 * meanings, and states plainly which of its own results are probably wrong.
 * The output is an INVENTORY WITH REASONS for a central decision, not a verdict.
 * A heuristic that pretends to a binary answer would be worse than useless here,
 * because a wrong "this is fine" is invisible and a wrong "this is broken" costs
 * one reading.
 *
 * The one thing v2 got right and v3 keeps: colon items that match the node's own
 * children mean a family/index node. Same punctuation as a stage description,
 * opposite meaning, and only the children table tells them apart.
 */
import { readFileSync, readdirSync } from 'node:fs';
const ROOT = 'C:/My Things/itemShop/other/C64chain/';
const N = JSON.parse(readFileSync(`${ROOT}public/tree.json`, 'utf8')).nodes;

const own = new Map();
for (const f of readdirSync(`${ROOT}data`).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
  const t = readFileSync(`${ROOT}data/${f}`, 'utf8');
  for (const m of t.matchAll(/"id"\s*:\s*"([^"]+)"/g)) if (!own.has(m[1])) own.set(m[1], f.replace('.json', ''));
}
const BUSY = new Set(['70-petrochem', '55-chem-gaps', '90-peripherals', '40-chassis', '50-power']);

const inbound = new Map();
for (const id of Object.keys(N)) for (const rel of ['children', 'from']) for (const c of N[id][rel] ?? []) {
  if (!N[c]) continue;
  if (!inbound.has(c)) inbound.set(c, []);
  inbound.get(c).push(id);
}
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');

/* CLASS 1 -- family / product index. A material named `Substance: comma-list`.
 *
 * v3 required the list items to match the node's own children, which caught
 * metal.aluminum ("ingot, foil, sheet" -- those ARE its children) and missed
 * metal.copper, metal.nickel, metal.gold, metal.tin and metal.sodium, whose lists
 * are APPLICATIONS ("track, winding wire, contacts") rather than members. Both are
 * indexes and both must go; the list type only changes the fix, not the verdict,
 * so it is recorded as a sub-label instead of used as a filter.
 */
const cls1 = [];
for (const id of Object.keys(N)) {
  const n = N[id];
  const name = String(n.name ?? '');
  if (!name.includes(':')) continue;
  const items = name.split(':').slice(1).join(':').split(',').map((s) => s.trim()).filter(Boolean);
  if (items.length < 2) continue;
  const kids = new Set((n.children ?? []).map((c) => norm(N[c]?.name ?? c)));
  const matched = items.filter((it) => { const t = norm(it); return t.length >= 3 && [...kids].some((k) => k.includes(t) || t.includes(k)); }).length;
  const areMembers = matched >= Math.ceil(items.length / 2);
  cls1.push({ id, n, ins: (inbound.get(id) ?? []).length, items: items.length, flavour: areMembers ? 'members' : 'applications' });
}

/* CLASS 1b -- an organisation or place whose name is a geography or a list rather
 * than an entity. `facility.foundries` is the known instance: Wave 0 promoted it
 * to `org`, and because `owned by` stores `*->org` that made it HARDER to
 * dissolve. Lexically it is nearly invisible -- "The Commodore supply-chain
 * geography" has no colon and no list -- so this class is seeded from the reports
 * rather than detected, and that is stated rather than hidden. */
const SEEDED = ['facility.foundries'];
const cls1b = SEEDED.filter((id) => N[id]).map((id) => ({ id, n: N[id], ins: (inbound.get(id) ?? []).length, items: 0, flavour: 'seeded: a list of places typed org' }));

/* CLASS 2 -- a process standing where a substance should be. On a `process` node a
 * colon almost always introduces the route or the stages, never the substance.
 * This WILL include legitimate stage-grouping nodes such as si.litho
 * ("Photolithography: coat, bake, expose, develop"), which is a real grouping
 * node but not a category error. Expect false positives; read the reason. */
const cls2 = [];
for (const id of Object.keys(N)) {
  const n = N[id];
  if (n.kind !== 'process') continue;
  const name = String(n.name ?? '');
  const head = name.split(':')[0].trim();
  const why = [];
  if (/plant|refinery|smelter|works\b/i.test(name)) why.push('named as a plant');
  else if (name.includes(':')) why.push('process name leads with a substance then describes a route');
  if (why.length) cls2.push({ id, n, ins: (inbound.get(id) ?? []).length, head, why: why.join('; ') });
}

/* CLASS 3 -- a material named as a bare element or family with almost no traffic.
 * Low traffic does NOT make these safe: metal.sodium has 2 inbound and is still a
 * node that should not exist. */
const cls3 = [];
for (const id of Object.keys(N)) {
  const n = N[id];
  if (n.kind !== 'material') continue;
  const name = String(n.name ?? '');
  if (!/^[A-Z][a-z]+(\s\w+)?:/.test(name)) continue;
  const ins = (inbound.get(id) ?? []).length;
  const items = name.split(':').slice(1).join(':').split(',').filter((s) => s.trim()).length;
  if (items >= 2 && ins < 12) cls3.push({ id, n, ins, items });
}

const show = (title, rows, note) => {
  rows.sort((a, b) => b.ins - a.ins);
  console.log(`\n  ${title}  (${rows.length})`);
  if (note) console.log(`    ${note}`);
  console.log('    in  kind      fragment              node');
  for (const r of rows) {
    const frag = own.get(r.id) ?? '?';
    console.log(`   ${String(r.ins).padStart(3)}  ${r.n.kind.padEnd(9)} ${frag.padEnd(20)} ${r.id.slice(0, 38).padEnd(40)} ${BUSY.has(frag) ? '[BUSY] ' : '       '}${String(r.n.name).slice(0, 42)}`);
  }
};

console.log(`\n=== ROUTE-HEAD DETECTOR v3 (read-only) ===`);
show('CLASS 1  family / product index -- a material named "Substance: list"', cls1,
  'flavour=members means the list IS its children (delete the node, retarget its members). flavour=applications means the list is what the substance is used for (delete the node, but the edges need real targets).');
show('CLASS 1b seeded -- entities that are lists, not entities', cls1b, 'Not detectable lexically. Seeded from an agent report; stated rather than hidden.');
show('CLASS 2  a process standing where a substance belongs', cls2,
  'Expect false positives. si.litho is in here and is a legitimate stage grouping.');
show('CLASS 3  bare element/family material, little traffic', cls3,
  'Low traffic is not a defence. metal.sodium has 2 inbound and should still die.');

const all = new Map();
for (const r of [...cls1, ...cls1b, ...cls2, ...cls3]) all.set(r.id, r);
const clsOf = new Map();
for (const r of cls1) clsOf.set(r.id, '1');
for (const r of cls1b) clsOf.set(r.id, '1b');
for (const r of cls2) clsOf.set(r.id, clsOf.get(r.id) ?? '2');
for (const r of cls3) clsOf.set(r.id, clsOf.get(r.id) ?? '3');
const KNOWN = ['chem.abs', 'chem.pvc', 'chem.epoxy', 'chem.photoresist', 'chem.ethylene', 'chem.crude', 'metal.copper', 'metal.nickel', 'metal.gold', 'metal.aluminum', 'metal.sodium', 'facility.foundries', 'metal.tin', 'metal.zinc', 'chem.styrene', 'chem.polyester', 'metal.solder', 'metal.chromium', 'metal.steel', 'metal.polyamide'];
const missed = KNOWN.filter((k) => !all.has(k));
console.log(`\n  SANITY CHECK vs ${KNOWN.length} hand-reported instances: found ${KNOWN.length - missed.length}, missed ${missed.length}`);
if (missed.length) {
  for (const m of missed) {
    const n = N[m];
    if (!n) { console.log(`    ${m}: NOT IN TREE`); continue; }
    console.log(`    ${m.padEnd(24)} kind=${String(n.kind).padEnd(9)} in=${String((inbound.get(m) ?? []).length).padStart(3)}  "${String(n.name).slice(0, 46)}"`);
  }
}
const perClass = {};
for (const c of clsOf.values()) perClass[c] = (perClass[c] ?? 0) + 1;
console.log(`  class breakdown: ${Object.entries(perClass).sort().map(([k, v]) => `${k}:${v}`).join('  ')}`);
const busy = [...all.keys()].filter((k) => BUSY.has(own.get(k) ?? ''));
console.log(`\n  ${all.size} distinct nodes flagged. ${busy.length} sit in a file an agent is examining right now:`);
const byBusy = {};
for (const k of busy) (byBusy[own.get(k)] ??= []).push(k);
for (const [f, ks] of Object.entries(byBusy)) console.log(`    ${f.padEnd(18)} ${ks.length}  ${ks.join(', ')}`);
console.log('\n  Nothing in data/ was touched.');