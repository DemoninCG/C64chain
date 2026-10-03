#!/usr/bin/env node
/**
 * metalang.mjs — find prose about the BUILD rather than about the node.
 *
 * The QA pass left process commentary in node text: "Retyped from facility to
 * note", "this pass does not own", "CHECKLIST rule 2 keeps a note with real
 * children intact", "the audit's warning is accepted deliberately". None of that
 * belongs in a description of a substance or a part, and it is actively harmful:
 * a reader cannot tell which sentences are facts about the C64 and which are
 * notes to the next maintainer.
 *
 * Two classes, because they need opposite treatment:
 *
 *   DELETE  the sentence is about the authoring process -- what a pass did, which
 *          checklist rule applied, how a merge was arbitrated. It carries no
 *          information about the node.
 *
 *   REWRITE the sentence is a statement of confidence, written in first person:
 *          "I could not confirm which dopant gas a 1982 plant used". The
 *          uncertainty is worth keeping -- the brief allows confidence levels --
 *          but it should read "Not established: ...", not "I could not ...".
 *
 * Detects candidates only. It does not rewrite: the commentary is interleaved
 * with real content, and deleting it mechanically takes the facts with it.
 *
 * IMPORTANT -- the DELETE class is a REVIEW AID, not a work list. Six distinct
 * false-positive classes have been found in this tree, all of them real content
 * that a regex cannot tell from build commentary:
 *
 *   "coupling agent", "complexing agent"   -> a chemistry reagent
 *   "on heating the agent flashes"          -> the chlorinated blowing agent
 *   "flexible moulded-in stubs"             -> an injection-moulding term
 *   "the pass criterion"                    -> factory test acceptance
 *   "the pass element", "pass transistor"   -> a linear regulator's series pass
 *   "MOS was merged into CBM"               -> corporate history
 *   "in this tree"                          -> ordinary orienting prose
 *
 * Each was found by an agent reading a flagged sentence and noticing it was
 * wrong. That is the intended use: the tool points at a sentence, a person
 * decides. A human who can be fooled by "the agent flashes" will not be helped
 * by a broader pattern; they will be misled by one.
 *
 * The REWRITE class is much safer -- first-person grammar is unambiguous -- and
 * the JUDGEMENT class exists precisely because "in this tree" cannot be split.
 *
 * The patterns are deliberately narrow. An earlier version matched the bare
 * word "agent" and reported 47 hits, of which every one was a coupling agent, a
 * complexing agent or a glass agent.
 */
import { readFileSync, readdirSync } from 'node:fs';

/* Read the fragments, not public/tree.json.
 *
 * An earlier version read the built tree, which made this check lie: after an
 * agent patched data/*.json but before build.mjs regenerated the tree, this
 * script reported the OLD text, so a clean file looked unfixed and the agent
 * kept working on it. The fragments are the source of truth for the text being
 * edited, so read them directly and the check needs no rebuild first. It also
 * means one agent rebuilding the tree cannot change what another agent sees. */
const DATA = 'data';
const files = readdirSync(DATA).filter((f) => /^\d.*\.json$/.test(f)).sort();

/** Every node in the fragments, with the file it came from. Fragment layout
 *  varies -- nested roots, a flat `nodes` map, a `shared` map, a `root` object
 *  -- so walk generically and take any object that defines an id. */
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

const DELETE = [
  [/\bthis pass\b/i, 'this pass'],
  /* "the pass" needs authoring context, and only just. Three unrelated senses
     turned up in this tree and each one is real content:
       - "the pass criterion"                 (factory test acceptance)
       - "the pass element / pass transistor" (series-pass device in a regulator)
       - "MOS was merged into CBM"            (corporate history, see below)
     So require an authoring verb next to it rather than excluding senses one
     at a time. */
  [/\bthe pass (?:did|does|do|left|finds?|found|removed|deleted|changed|rewrote|owned)\b/i, 'the pass'],
  [/\bCHECKLIST\b/, 'CHECKLIST'],
  [/\brule \d+\b/, 'rule N'],
  [/\bthe audit(?:'s)?\b/i, 'the audit'],
  [/\bRetyped from\b/i, 'Retyped from'],
  [/\bretyped (?:from|as|to)\b/i, 'retyped'],
  [/\bdoes not own\b/i, 'does not own'],
  [/\bthis fragment\b/i, 'this fragment'],
  [/\bthe fragment\b/i, 'the fragment'],
  [/\bnot authoritative\b/i, 'not authoritative'],
  [/\bDo not treat\b/i, 'Do not treat'],
  [/\bUNRESOLVED CONFLICT\b/, 'UNRESOLVED CONFLICT'],
  [/\bRESOLVED \d{4}-\d{2}-\d{2}\b/, 'RESOLVED <date>'],
  [/\b(?:QA |the |this |other )agents\b/i, 'agents'],
  [/\bQA pass\b/i, 'QA'],
  [/\bstub (?:node|id)\b|\bstubs?\b(?=\s+(?:node|id|reference))/i, 'stubs'],
  /* "merged into" is deliberately NOT matched. This tree is full of corporate
     history, and "MOS Technology was merged into CBM on 1 January 1981" is a
     sourced fact from the US Tax Court record, not tree mechanics. An agent
     caught that deleting it would have removed the reason the chips were still
     stamped with the MOS logo until 1989. Match the unambiguous phrases only. */
  [/\bthe merge\b|\bmerge proposal\b|\bkeep-rule\b|\bpath-local\b/i, 'merge vocabulary'],
  [/\bdangling (?:id|ids|reference)\b/i, 'dangling refs'],
  [/\bname is relative\b/i, 'name is relative'],
  [/\bstub node|\bstubs\b/i, 'stubs'],
  [/\bnodes? in (?:this|the) tree\b|\belsewhere in the tree\b/i, 'the tree'],
  [/\bcanonical published node\b/i, 'merge vocabulary'],
  [/\bwas folded (?:in|into)\b/i, 'merge vocabulary'],
];

/* Match first-person GRAMMAR, not the letter I.
 *
 * A bare \bI\b is unusable here. This tree is full of electronics notation
 * where I is the symbol for current ("I = 3 A", "the I/V curve"), plus "Class
 * I", "Type I" and Roman numerals -- and 277 of the nodes are silicon. So the
 * pattern requires a first-person verb or possessive after the I, which is what
 * actually marks prose as written by a person rather than a circuit.
 *
 * The raw \bI\b count is still reported below, as information only: it shows how
 * much of the tree would be noise if the naive pattern were used. */
const REWRITE = [
  [/\bI (?:could|couldn't|did|do|does|have|has|had|was|were|am|read|finds?|found|saw|think|believe|would|will|assume|assumed|expect|note|noted|left|made|make|treat|treated)\b/i, 'first person'],
  [/\bI'?m\b/i, 'first person'],
  [/\bmy (?:own|earlier|previous|first)\b/i, 'first person'],
];

/* Quoted testimony is exempt. This tree quotes people at length -- "I had no
   formal budget accountability", "It takes a very tough person to say I'm not
   shipping these because they're not as good as they could be" -- and that is
   the most valuable text in several notes, not build commentary.

   Two attempts failed before this one. Blanket /"[^"]*"/ missed single-quoted
   testimony. Then /'[^']{12,}'/ mis-read the apostrophe in "Winterble's answer
   was direct: 'I had no..." as an opening delimiter and blanked the wrong
   span. And a /'[^']*'/ cannot span a quote that itself contains an apostrophe,
   which the Winterble quote does twice.

   So do not blank anything. Decide per match: walk the text counting quote
   delimiters, treating an apostrophe as a delimiter only when it is not
   between two word characters, and skip any match that falls inside a quote. */
const isQuoteDelimiter = (t, i) => {
  const c = t[i];
  if (c === '"') return true;
  if (c !== "'") return false;
  const prev = t[i - 1] ?? ' ';
  const next = t[i + 1] ?? ' ';
  return !(/[A-Za-z0-9]/.test(prev) && /[A-Za-z0-9]/.test(next));
};
const insideQuote = (t, upto) => {
  let q = false;
  for (let i = 0; i < upto; i++) if (isQuoteDelimiter(t, i)) q = !q;
  return q;
};

/* JUDGEMENT, not DELETE. Measured: of 59 "in this tree" occurrences, 49 are
   ordinary orienting prose -- "the same petrochemical chain as everything else
   on this tree", "the largest single industrial electricity draw anywhere in
   this tree" -- and only about 10 are editorialising about the tree's
   construction ("the most extraordinary leaf in this tree", "the only reason
   potassium is in this tree"). A regex cannot tell those apart, so this class
   is reported for a human to read and is never safe to strip mechanically. */
const JUDGEMENT = [
  [/\bthis tree\b/i, 'this tree'],
  [/\bthe rest of (?:this|the) tree\b/i, 'rest of the tree'],
  [/\bleaf of this tree\b|\bleaf in this tree\b/i, 'leaf of this tree'],
  [/\bbranch of this tree\b/i, 'branch of this tree'],
];

const FIELDS = ['description', 'note'];

/* --file narrows the report to one fragment, so an agent working on a single
   file can list its own work without seeing anyone else's. */
const fileIdx = process.argv.indexOf('--file');
const ONLY = fileIdx > 0 ? process.argv[fileIdx + 1] : null;
const inScope = (n) => !ONLY || (n.file ?? '') === ONLY || (n.file ?? '').endsWith(`/${ONLY}`);

const del = [];
const rew = [];
const jud = [];
const also = [];

for (const [id, n] of Object.entries(N)) {
  if (!inScope(n)) continue;
  for (const field of FIELDS) {
    const text = n[field];
    if (!text) continue;
    const grab = (re, outsideQuotes) => {
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
      let m;
      while ((m = g.exec(text)) !== null) {
        if (outsideQuotes && insideQuote(text, m.index)) continue;   // quoted testimony
        const at = m.index;
        const start = Math.max(0, text.lastIndexOf('.', at - 1) + 1);
        let end = text.indexOf('.', at);
        end = end < 0 ? text.length : end + 1;
        return text.slice(start, end).trim().slice(0, 170);
      }
      return null;
    };
    for (const [re, label] of DELETE) {
      const s = grab(re);
      if (s) { del.push({ id, file: n.file, field, label, sentence: s }); break; }
    }
    for (const [re, label] of REWRITE) {
      const s = grab(re, true);            // first-person test ignores quoted testimony
      if (s) { rew.push({ id, file: n.file, field, label, sentence: s }); break; }
    }
    for (const [re, label] of JUDGEMENT) {
      const s = grab(re);
      if (s) { jud.push({ id, file: n.file, field, label, sentence: s }); break; }
    }
  }
}

const tally = (list, title) => {
  console.log(`\n${title}: ${list.length} field(s) across ${new Set(list.map((h) => h.id)).size} node(s)`);
  const byLabel = {};
  for (const h of list) (byLabel[h.label] ??= []).push(h);
  for (const [label, l] of Object.entries(byLabel).sort((a, b) => b[1].length - a[1].length))
    console.log(`  ${String(l.length).padStart(4)}  ${label}`);
  const byFile = {};
  for (const h of list) byFile[h.file] = (byFile[h.file] ?? 0) + 1;
  console.log('  by fragment: ' + Object.entries(byFile).sort((a, b) => b[1] - a[1]).map(([f, c]) => `${f.replace('.json', '')}=${c}`).join(' '));
};

/* --json emits the findings so another script can act on them without
   re-deriving the patterns by hand, which is how a work list and the tool
   silently drift apart. */
if (process.argv.includes('--json')) {
  const slim = (h) => ({ id: h.id, file: h.file, field: h.field, label: h.label, sentence: h.sentence });
  console.log(JSON.stringify({
    delete: del.map(slim), rewrite: rew.map(slim), judgement: jud.map(slim),
  }, null, 2));
  process.exit(0);
}

console.log(`=== build-process language in node text${ONLY ? ` — ${ONLY}` : ''} ===`);
tally(del, 'DELETE  (about the authoring process, carries no node information)');
tally(rew, 'REWRITE (confidence statements, first person)');
tally(jud, 'JUDGEMENT (mostly legitimate prose -- read, do not strip)');

const all = [...del, ...rew, ...jud];
const byFileAll = {};
for (const h of all) byFileAll[h.file] = (byFileAll[h.file] ?? 0) + 1;
console.log(`\ntotal: ${all.length} field(s) across ${new Set(all.map((h) => h.id)).size} nodes in ${Object.keys(byFileAll).length} fragments`);
const safe = [...del, ...rew];
const byFileSafe = {};
for (const h of safe) byFileSafe[h.file] = (byFileSafe[h.file] ?? 0) + 1;
console.log(`unambiguous subset (DELETE + REWRITE): ${safe.length} across ${new Set(safe.map((h) => h.id)).size} nodes`);
console.log('  by fragment: ' + Object.entries(byFileSafe).sort((a, b) => b[1] - a[1]).map(([f, c]) => `${f.replace('.json', '').replace(/^\d\d-/, '')}=${c}`).join(' '));

/* FYI only. A bare \bI\b would match current as a symbol, "Class I", "Type I"
   and Roman numerals, so it is not used as a detection. The ratio below is the
   argument for why. */
let rawI = 0;
for (const n of Object.values(N)) {
  if (!inScope(n)) continue;
  for (const f of FIELDS) {
    const t = n[f];
    if (!t) continue;
    rawI += (t.match(/\bI\b/g) ?? []).length;
  }
}
const firstPerson = rew.length;
console.log(`\nbare "I" occurrences in scope: ${rawI}, of which ${firstPerson} sit in first-person grammar.`
  + ` The other ${rawI - firstPerson} are current notation, class/type numbers or numerals -- which is why a bare \\bI\\b is not a detector.`);

/* --list prints the work itself: one line per field, with the sentence to act
   on and enough of its neighbours to delete it without damaging the rest. */
if (process.argv.includes('--list')) {
  for (const [cls, list] of [['DELETE', del], ['REWRITE', rew]]) {
    console.log(`\n########## ${cls} ##########`);
    for (const h of list) {
      const node = N[h.id];
      const text = node[h.field] ?? '';
      const at = text.indexOf(h.sentence);
      const from = Math.max(0, at - 60);
      console.log(`\n  ${h.id}  .${h.field}   [${h.label}]`);
      console.log(`    ...${text.slice(from, at + h.sentence.length + 40)}...`);
    }
  }
  console.log(`\n########## JUDGEMENT — DO NOT TOUCH, listed only so you know they were considered ##########`);
  for (const h of jud) console.log(`  ${h.id}  .${h.field}   "${h.sentence.slice(0, 110)}"`);
}

if (process.argv.includes('--samples')) {
  console.log('\n=== DELETE samples ===');
  for (const h of del.slice(0, 20)) console.log(`  [${h.field}] ${h.id}  (${h.label})\n      "${h.sentence}"`);
  console.log('\n=== REWRITE samples ===');
  for (const h of rew.slice(0, 20)) console.log(`  [${h.field}] ${h.id}\n      "${h.sentence}"`);
  console.log('\n=== JUDGEMENT samples (do not strip these without reading) ===');
  for (const h of jud.slice(0, 12)) console.log(`  [${h.field}] ${h.id}\n      "${h.sentence}"`);
}