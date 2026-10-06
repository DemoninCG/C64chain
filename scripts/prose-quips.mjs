#!/usr/bin/env node
/**
 * prose-quips.mjs -- find editorial quips in description/note text.
 *
 * Companion to metalang.mjs (which covers authoring-process language).
 * This covers the six prose-quip classes from the 2026-10 sample review:
 *   1. structural self-label   "The leaf:", "true bottom", "final leaf"
 *   2. convergence talk         "deliberate convergence point", "all hang off"
 *   3. existence justification  "included because", "belongs in this tree"
 *   4. brief/correction meta    "CORRECTION TO THE BRIEF" in description
 *   5. poetic closer            "most extraordinary", "quite literally", "So the X began"
 *   6. cross-branch pointer     "see the foil branch", "same machine as"
 *
 * Read-only. Reads data/*.json directly (fragments are source of truth).
 * Never auto-edits: the quip is interleaved with facts, so a person decides.
 */
import { readFileSync, readdirSync } from 'node:fs';

const DATA = 'data';
const files = readdirSync(DATA).filter((f) => /^\d.*\.json$/.test(f)).sort();

function collect() {
  const out = [];
  const seen = new Set();
  const walk = (v, file) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { for (const x of v) walk(x, file); return; }
    if (seen.has(v)) return;
    seen.add(v);
    if (typeof v.id === 'string') out.push({ ...v, file });
    for (const [k, x] of Object.entries(v)) {
      if (k === 'id' || k === 'file') continue;
      walk(x, file);
    }
  };
  for (const f of files) walk(JSON.parse(readFileSync(`${DATA}/${f}`, 'utf8')), f);
  return out;
}
const N = Object.fromEntries(collect().map((n) => [n.id, n]));

// [regex, label, class]
const PATTERNS = [
  [/(?:^|[.?!] )the leaf(?::| is | of |,| for | in )/i, 'the-leaf prefix', 'structural'],
  [/\btrue bottom\b/i, 'true-bottom', 'structural'],
  [/\bfinal leaf\b/i, 'final-leaf', 'structural'],
  [/\bbottom of .* branch\b/i, 'bottom-of-branch', 'structural'],
  [/\bdescribed properly\b/i, 'described-properly', 'structural'],
  [/\bdeliberate convergence\b/i, 'deliberate-convergence', 'convergence'],
  [/\bconvergence (?:node|point)\b/i, 'convergence-node', 'convergence'],
  [/\ball hang off\b/i, 'hang-off', 'convergence'],
  [/\ball meet\b|\bbranches .* meet\b|\bmeet in it\b/i, 'branches-meet', 'convergence'],
  [/\bincluded because\b/i, 'included-because', 'justification'],
  [/\bbelongs in this tree\b/i, 'belongs-in-tree', 'justification'],
  [/\bthis node is here because\b/i, 'node-here-because', 'justification'],
  [/\bown branch is short because\b/i, 'branch-short-because', 'justification'],
  [/\bcannot honestly stop\b/i, 'cannot-honestly-stop', 'justification'],
  [/\bCORRECTION TO THE BRIEF\b/, 'correction-to-brief', 'correction'],
  [/\bmost extraordinary\b/i, 'most-extraordinary', 'poetic'],
  [/\bone of the great ones\b/i, 'one-of-great-ones', 'poetic'],
  [/\bsatisfying (?:way|loop)\b/i, 'satisfying-way', 'poetic'],
  [/\bgenuine shared endpoint\b/i, 'genuine-shared', 'poetic'],
  [/\bquite literally\b/i, 'quite-literally', 'poetic'],
  [/\bbeautiful and rather grim\b/i, 'beautiful-grim', 'poetic'],
  [/\bhandful of dark potatoes\b/i, 'dark-potatoes', 'poetic'],
  [/\bcarpet of red mud\b/i, 'red-mud', 'poetic'],
  [/\bSo the [^.]* (?:began|came out of)\b/i, 'so-the-X-began', 'poetic'],
  [/\bsee the .* branch\b/i, 'see-branch', 'pointer'],
  [/\bsame machine as\b/i, 'same-machine', 'pointer'],
];

const FIELDS = ['description', 'note'];

const fileIdx = process.argv.indexOf('--file');
const ONLY = fileIdx > 0 ? process.argv[fileIdx + 1] : null;
const inScope = (n) => !ONLY || (n.file ?? '') === ONLY || (n.file ?? '').endsWith(`/${ONLY}`);

// Batch map from the approved plan (id-disjoint; 70 split alphabetically)
function batchOf(n) {
  const f = n.file ?? '';
  if (f.includes('60-metals') || f.includes('64-metals') || f.includes('55-chem')) return 'M-core';
  if (f.includes('61-metals') || f.includes('62-metals') || f.includes('63-metals')) return 'M-sat';
  if (f.includes('70-petrochem')) {
    const rest = (n.id ?? '').split('.').slice(1).join('.').toLowerCase();
    return rest < 'm' ? 'P-A' : 'P-B';
  }
  if (f.includes('10-silicon') || f.includes('35-logic')) return 'S-L';
  if (f.includes('20-board') || f.includes('31-pass') || f.includes('32-pass') || f.includes('33-pass')) return 'B-P';
  if (f.includes('40-chassis') || f.includes('50-power')) return 'C-P';
  return 'I-R';
}

const hits = [];
for (const [id, n] of Object.entries(N)) {
  if (!inScope(n)) continue;
  for (const field of FIELDS) {
    const text = n[field];
    if (!text) continue;
    // correction class fires on description only; the note copy is the right home
    for (const [re, label, cls] of PATTERNS) {
      if (cls === 'correction' && field !== 'description') continue;
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
      let m;
      let found = null;
      while ((m = g.exec(text)) !== null) {
        const at = m.index;
        const start = Math.max(0, text.lastIndexOf('.', at - 1) + 1);
        let end = text.indexOf('.', at);
        end = end < 0 ? text.length : end + 1;
        found = text.slice(start, end).trim().slice(0, 200);
        break;
      }
      if (found) { hits.push({ id, file: n.file, batch: batchOf(n), field, label, cls, sentence: found }); break; }
    }
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ hits }, null, 2));
  process.exit(0);
}

console.log(`=== prose quips in node text${ONLY ? ` -- ${ONLY}` : ''} ===`);
console.log(`\ntotal: ${hits.length} field(s) across ${new Set(hits.map((h) => h.id)).size} node(s)`);
const byCls = {};
for (const h of hits) (byCls[h.cls] ??= []).push(h);
for (const [cls, l] of Object.entries(byCls).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${cls} (${l.length}):`);
  const byLabel = {};
  for (const h of l) (byLabel[h.label] ??= []).push(h);
  for (const [label, ll] of Object.entries(byLabel).sort((a, b) => b[1].length - a[1].length))
    console.log(`  ${String(ll.length).padStart(4)}  ${label}`);
}
const byBatch = {};
for (const h of hits) byBatch[h.batch] = (byBatch[h.batch] ?? 0) + 1;
console.log('\nby batch: ' + Object.entries(byBatch).sort((a, b) => b[1] - a[1]).map(([b, c]) => `${b}=${c}`).join(' '));
const byFile = {};
for (const h of hits) byFile[h.file] = (byFile[h.file] ?? 0) + 1;
console.log('by fragment: ' + Object.entries(byFile).sort((a, b) => b[1] - a[1]).map(([f, c]) => `${f.replace('.json', '')}=${c}`).join(' '));

if (process.argv.includes('--list')) {
  console.log(`\n########## HITS ##########`);
  for (const h of hits) {
    console.log(`\n  ${h.id} [${h.batch}/${h.file}] .${h.field} [${h.label}/${h.cls}]`);
    console.log(`    "${h.sentence}"`);
  }
}

if (process.argv.includes('--calibration')) {
  // 25 raw-leaf-heavy ids for blind calibration; print full text for verdicts
  const CAL = [
    'metal.bif-banding', 'metal.abyssal-clay', 'metal.manganese.nodule-rock',
    'metal.manganese.oxide-phase', 'metal.bauxite.kaolinite', 'metal.ilmenite-sand',
    'metal.banded-iron-formation', 'metal.aluminum.ingot', 'metal.manganese.ore',
    'metal.ferromanganese', 'metal.manganese', 'metal.iron',
    'metal.limestone.bed', 'metal.salt-evaporite', 'metal.phosphate.rock',
    'metal.turpentine', 'metal.molybdenum', 'metal.vanadium',
    'metal.aluminum.foil', 'metal.aluminum.sheet', 'metal.salt-rock',
    'metal.sphalerite.massive-sulphide', 'metal.sphalerite.host',
    'metal.manganese.sintering', 'metal.manganese.nodule',
  ];
  console.log(`\n########## CALIBRATION SET (25) ##########`);
  for (const id of CAL) {
    const n = N[id];
    if (!n) { console.log(`\n  ${id}: NOT FOUND`); continue; }
    console.log(`\n### ${id} [${n.file}] kind=${n.kind} cat=${n.category}`);
    console.log(`DESC: ${n.description ?? '(none)'}`);
    console.log(`NOTE: ${n.note ?? '(none)'}`);
  }
}
