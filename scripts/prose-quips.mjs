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

/* --grammar: AI-dash-grammar detector mode.
 *
 * Scope is mechanical: only the spaced hyphen " - " (the normalize-text
 * rendering of an em/en-dash) and ";" are flagged. Unspaced hyphens --
 * ranges (3-12 m), part numbers (901226-01), compounds (iron-stained),
 * tolerances (+/-1 C) -- can never match and must never be touched.
 * Existing parentheses and quoted testimony are out of scope.
 * Function labels tell the agent which rigid rewrite applies:
 *   pair       enclosing aside      -> brackets: X (aside) Y
 *   appendage  " - plus/and/with "  -> comma: X, and Y
 *   trailing   dash runs to "."     -> full stop + new sentence
 *   which      " - which/where... " -> comma+which, or split to "This..."
 *   ie         " - i.e./e.g. "      -> "(i.e. gloss)"
 *   semicolon  ";" joining clauses  -> full stop (lists with commas: keep)
 */
if (process.argv.includes('--grammar')) {
  const rows = [];
  for (const [id, n] of Object.entries(N)) {
    if (!inScope(n)) continue;
    for (const field of FIELDS) {
      const text = n[field];
      if (!text) continue;
      const dashes = (text.match(/ - /g) || []).length;
      const semis = (text.match(/;/g) || []).length;
      if (!dashes && !semis) continue;
      const funcs = new Set();
      if (/ - (i\.e\.|e\.g\.)/i.test(text)) funcs.add('ie');
      if (/ - (plus|and|with) /i.test(text)) funcs.add('appendage');
      if (/ - (which|where|who|whose) /i.test(text)) funcs.add('which');
      const sents = text.split(/(?<=[.!?])\s+/);
      for (const s of sents) {
        const k = (s.match(/ - /g) || []).length;
        if (k >= 2) funcs.add('pair');
        else if (k === 1) funcs.add('trailing');
      }
      if (semis) funcs.add('semicolon');
      rows.push({ id, file: n.file, batch: batchOf(n), field, dashes, semis, funcs: [...funcs] });
    }
  }
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ grammar: rows }, null, 2));
    process.exit(0);
  }
  const totD = rows.reduce((a, r) => a + r.dashes, 0);
  const totS = rows.reduce((a, r) => a + r.semis, 0);
  console.log(`\n=== grammar (spaced dash + semicolon)${ONLY ? ` -- ${ONLY}` : ''} ===`);
  console.log(`\ntotal: ${rows.length} field(s) across ${new Set(rows.map((r) => r.id)).size} node(s); " - " uses: ${totD}; ";" uses: ${totS}`);
  const byFunc = {};
  for (const r of rows) for (const f of r.funcs) byFunc[f] = (byFunc[f] ?? 0) + 1;
  console.log('by function: ' + Object.entries(byFunc).sort((a, b) => b[1] - a[1]).map(([f, c]) => `${f}=${c}`).join(' '));
  const byBatch = {};
  for (const r of rows) byBatch[r.batch] = (byBatch[r.batch] ?? 0) + 1;
  console.log('by batch: ' + Object.entries(byBatch).sort((a, b) => b[1] - a[1]).map(([b, c]) => `${b}=${c}`).join(' '));
  const byFile = {};
  for (const r of rows) byFile[r.file] = (byFile[r.file] ?? 0) + 1;
  console.log('by fragment: ' + Object.entries(byFile).sort((a, b) => b[1] - a[1]).map(([f, c]) => `${f.replace('.json', '')}=${c}`).join(' '));
  if (process.argv.includes('--list')) {
    console.log(`\n########## GRAMMAR HITS ##########`);
    for (const r of rows) {
      const n = N[r.id];
      const text = n[r.field] ?? '';
      const at = text.indexOf(' - ');
      const semiAt = text.indexOf(';');
      const anchor = at >= 0 ? at : semiAt;
      const from = Math.max(0, anchor - 100);
      console.log(`\n  ${r.id} [${r.batch}/${r.file}] .${r.field} [${r.funcs.join('+')}] d=${r.dashes} s=${r.semis}`);
      console.log(`    "...${text.slice(from, anchor + 140).replace(/\n/g, ' ')}..."`);
    }
  }
  if (process.argv.includes('--gramcal')) {
    const CAL2 = [
      'c64.mainboard', 'mb.cia.mask', 'mb.sid.revisions', 'mb.cpu',
      'mb.ram.mask', 'mb.sid', 'mb.ram.cell', 'mb.pla.vs-pal',
      'mb.discretes.test', 'si.front-end', 'si.emc.resin',
      'c64.packaging.foam-caps', 'mb.ram', 'mb.cpu.fab.assembly',
      'mb.cpu.mask-set', 'mb.cpu.fab.cleanroom', 'metal.aluminum.ingot',
      'mb.cia.tod', 'c64.io-panel', 'mb.pla.array',
    ];
    console.log(`\n########## GRAMMAR CALIBRATION SET (20) ##########`);
    for (const id of CAL2) {
      const n = N[id];
      if (!n) { console.log(`\n  ${id}: NOT FOUND`); continue; }
      console.log(`\n### ${id} [${n.file}] kind=${n.kind} cat=${n.category}`);
      console.log(`DESC: ${n.description ?? '(none)'}`);
      console.log(`NOTE: ${n.note ?? '(none)'}`);
    }
  }
  process.exit(0);
}

/* --titles: name-grammar detector mode. Classes 1-3 are rule candidates;
 * class 4 (gerund processes) is listed for the conservative central pass only.
 * question-names on kind=note are blessed by CHECKLIST and never flagged;
 * parens (formulas/grades/part numbers) are never flagged.
 */
if (process.argv.includes('--titles')) {
  const rows = [];
  for (const [id, n] of Object.entries(N)) {
    if (!inScope(n)) continue;
    if (typeof n.name !== 'string') continue;
    const cls = new Set();
    if (n.name.includes(':')) cls.add('colon');
    if (n.kind !== 'note' && / for /i.test(n.name)) cls.add('for-rel');
    if (/^the /i.test(n.name)) cls.add('the-opener');
    if (n.kind === 'process' && /^[A-Z][a-z]+ing\b/.test(n.name)) cls.add('gerund');
    if (n.kind !== 'note' && /^(why|how|what|where)\b/i.test(n.name)) cls.add('question');
    if (!cls.size) continue;
    rows.push({ id, file: n.file, kind: n.kind, name: n.name, simple: n.simple_name ?? '(none)', cls: [...cls] });
  }
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ titles: rows }, null, 2));
    process.exit(0);
  }
  console.log(`\n=== title classes${ONLY ? ` -- ${ONLY}` : ''} ===`);
  console.log(`\ntotal: ${rows.length} node(s)`);
  const byCls = {};
  for (const r of rows) for (const c of r.cls) byCls[c] = (byCls[c] ?? 0) + 1;
  console.log('by class: ' + Object.entries(byCls).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(' '));
  if (process.argv.includes('--list')) {
    console.log(`\n########## TITLE HITS ##########`);
    for (const r of rows) {
      console.log(`\n  ${r.id} [${r.file}] kind=${r.kind} [${r.cls.join('+')}]`);
      console.log(`    name:   "${r.name}"`);
      console.log(`    simple: "${r.simple}"`);
    }
  }
  if (process.argv.includes('--titlecal')) {
    const CAL3 = [
      'metal.cobalt', 'metal.iron.burden', 'c64.connector-jacks.moulding',
      'metal.banded-iron-formation', 'metal.ferrite.dopants', 'metal.zinc.chloride',
      'mb.color-ram.cell.load', 'metal.gold.contact-jewel',
      'metal.potassium', 'metal.dms.fe-silicon', 'metal.copper.wire',
      'mb.vic.process', 'chem.fab-chemicals.dopants.diborane.hydride-feed',
      'metal.manganese.smelter-electricity', 'facility.foundries.hong-kong',
      'facility.foundries.subcontract-network', 'mb.logic.cmos.litho',
      'c64.keyboard.switches', 'mb.photo', 'mb.sid.process',
    ];
    console.log(`\n########## TITLE CALIBRATION SET (20) ##########`);
    for (const id of CAL3) {
      const n = N[id];
      if (!n) { console.log(`\n  ${id}: NOT FOUND`); continue; }
      console.log(`\n### ${id} [${n.file}] kind=${n.kind} cat=${n.category}`);
      console.log(`NAME: ${n.name}`);
      console.log(`SIMPLE: ${n.simple_name ?? '(none)'}`);
      console.log(`DESC: ${(n.description ?? '(none)').slice(0, 400)}`);
    }
  }
  process.exit(0);
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
