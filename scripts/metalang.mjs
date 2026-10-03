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
 * The patterns are deliberately narrow. An earlier version matched the bare
 * word "agent" and reported 47 hits, of which every one was a coupling agent, a
 * complexing agent or a glass agent.
 */
import { readFileSync } from 'node:fs';
const N = JSON.parse(readFileSync('public/tree.json', 'utf8')).nodes;

const DELETE = [
  [/\bthis pass\b/i, 'this pass'],
  [/\bthe pass\b/i, 'the pass'],
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
  [/\b(?:QA |this |the )agents?\b/i, 'agents'],
  [/\bthe merge\b|\bmerged into\b|\bmerge proposal\b|\bkeep-rule\b|\bpath-local\b/i, 'merge vocabulary'],
  [/\bdangling (?:id|ids|reference)\b/i, 'dangling refs'],
  [/\bname is relative\b/i, 'name is relative'],
  [/\bstub node|\bstubs\b/i, 'stubs'],
  [/\bnodes? in (?:this|the) tree\b|\belsewhere in the tree\b/i, 'the tree'],
  [/\bcanonical published node\b/i, 'merge vocabulary'],
  [/\bwas folded (?:in|into)\b/i, 'merge vocabulary'],
];

const REWRITE = [
  [/\bI could not\b/i, 'I could not'],
  [/\bI have not\b/i, 'I have not'],
  [/\bI was unable\b/i, 'I was unable'],
  [/\bI am not confident\b/i, 'I am not confident'],
  [/\bwe could not\b/i, 'we could not'],
];

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
const del = [];
const rew = [];
const jud = [];

for (const [id, n] of Object.entries(N)) {
  for (const field of FIELDS) {
    const text = n[field];
    if (!text) continue;
    const grab = (re) => {
      const m = text.match(re);
      if (!m) return null;
      const at = m.index;
      const start = Math.max(0, text.lastIndexOf('.', at - 1) + 1);
      let end = text.indexOf('.', at);
      end = end < 0 ? text.length : end + 1;
      return text.slice(start, end).trim().slice(0, 170);
    };
    for (const [re, label] of DELETE) {
      const s = grab(re);
      if (s) { del.push({ id, file: n.file, field, label, sentence: s }); break; }
    }
    for (const [re, label] of REWRITE) {
      const s = grab(re);
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

console.log('=== build-process language in node text ===');
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

if (process.argv.includes('--samples')) {
  console.log('\n=== DELETE samples ===');
  for (const h of del.slice(0, 20)) console.log(`  [${h.field}] ${h.id}  (${h.label})\n      "${h.sentence}"`);
  console.log('\n=== REWRITE samples ===');
  for (const h of rew.slice(0, 20)) console.log(`  [${h.field}] ${h.id}\n      "${h.sentence}"`);
  console.log('\n=== JUDGEMENT samples (do not strip these without reading) ===');
  for (const h of jud.slice(0, 12)) console.log(`  [${h.field}] ${h.id}\n      "${h.sentence}"`);
}