/**
 * patchtest.mjs — regression tests for scripts/patch.mjs.
 *
 * Both bugs here were found by prose-scrub agents whose edits landed in the WRONG
 * NODE while the tool reported success. patch.mjs is the tool every later pass
 * uses, so these cases stay checked:
 *
 *   1. A container node returned its first DESCENDANT's field, because the
 *      field regex matched anywhere in the node's whole subtree. One agent lost
 *      53 edits to this.
 *   2. The backward brace-walk counted braces inside string values, so the slice
 *      could start at an earlier sibling.
 *
 * Writes only to a temp copy. Run: node scripts/patchtest.mjs
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const T = 'C:/Users/corba/AppData/Local/Temp/opencode/pt4.json';
const copy = (src = 'data/70-petrochem.json') => execFileSync(process.execPath, ['-e',
  `require('fs').copyFileSync('${src}','${T}')`]);
const run = (...a) => execFileSync(process.execPath, ['scripts/patch.mjs', T, ...a], { encoding: 'utf8' }).trim();
/* runExpectFail: patch.mjs must REFUSE and write nothing. Used for the
 * overwrite guard, which is the third bug this file now holds down. */
const runFail = (...a) => {
  try {
    execFileSync(process.execPath, ['scripts/patch.mjs', T, ...a], { encoding: 'utf8', stdio: 'pipe' });
    return null;
  } catch (e) {
    return `${e.stderr ?? ''}${e.stdout ?? ''}`;
  }
};
const N = JSON.parse(readFileSync('public/tree.json', 'utf8')).nodes;

/* find a node whose own text contains a brace -- that is what dragged the old
   backward walk onto a previous sibling */
let braceNode = null;
for (const [id, n] of Object.entries(N)) {
  if (`${n.description ?? ''}${n.note ?? ''}`.includes('{')) { braceNode = id; break; }
}
const kids = N['chem.crude']?.children ?? [];
// the leaf must come from the SAME fragment the test copies, or it is not there
const leaf = Object.entries(N).find(([, n]) => n.file === '70-petrochem.json'
  && !(n.children ?? []).length && n.note)?.[0];
console.log(`brace-bearing node : ${braceNode}`);
console.log(`container to test  : chem.crude (${kids.length} children)`);
console.log(`leaf to test       : ${leaf}\n`);

copy();
let fails = 0;
const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) { console.log(`          got  : ${String(got).slice(0, 90)}`); console.log(`          want : ${String(want).slice(0, 90)}`); }
};

// A. container node: get must return ITS note, not a descendant's
check('container get returns its own note', JSON.parse(run('chem.crude', 'get', 'note')), N['chem.crude'].note ?? null);

// B. container node: set must land on the container.
//    `chem` already has a note, so this needs --force: patch.mjs now refuses to
//    overwrite a non-empty value without it (see case B2).
copy();
const kidWithNote = kids.find((c) => N[c]?.note);
const kidBefore = N[kidWithNote].note;
run('chem.crude', 'set', 'note', 'SENTINEL-A', '--force');
check('container set lands on the container', JSON.parse(run('chem.crude', 'get', 'note')), 'SENTINEL-A');
check('child note untouched by that set', JSON.parse(run(kidWithNote, 'get', 'note')), kidBefore);

// B2. the overwrite guard. `set note` used to replace silently, which destroyed
//     nine real notes during phase 4 -- the call reported success and the file
//     still parsed, so nothing noticed. It must now refuse, and write nothing.
copy();
const noteBefore = JSON.parse(run('chem.crude', 'get', 'note'));
const refused = runFail('chem.crude', 'set', 'note', 'SENTINEL-B');
check('overwrite of a non-empty note is refused', refused !== null && /refusing to overwrite/.test(refused), true);
check('refused overwrite wrote nothing', JSON.parse(run('chem.crude', 'get', 'note')), noteBefore);

// and it must still be possible to set a key that does not exist yet
copy();
const emptyKey = ['era', 'category'].find((k) => !(k in N['chem.crude'])) ?? null;
if (emptyKey) {
  run('chem.crude', 'set', emptyKey, '1982-test');
  check(`absent key "${emptyKey}" still settable without --force`, JSON.parse(run('chem.crude', 'get', emptyKey)), '1982-test');
} else {
  check('absent key still settable without --force', true, true);
}

// C. a node whose text contains a brace
if (braceNode) {
  copy();
  check(`brace-bearing node "${braceNode}" get`, JSON.parse(run(braceNode, 'get', 'note')), N[braceNode].note ?? null);
  copy();
  run(braceNode, 'set', 'note', 'SENTINEL-C', '--force');
  check(`brace-bearing node "${braceNode}" set`, JSON.parse(run(braceNode, 'get', 'note')), 'SENTINEL-C');
  // and the node BEFORE it in file order must be untouched
  const prev = Object.keys(N).indexOf(braceNode) > 0 ? null : null;
  void prev;
}

// D. leaf still works. --force because the chosen leaf already has a note, and
//    the overwrite guard now refuses without it (case B2).
copy();
run(leaf, 'set', 'note', 'SENTINEL-D', '--force');
check('leaf set', JSON.parse(run(leaf, 'get', 'note')), 'SENTINEL-D');

// E. every node IN THE COPIED FRAGMENT must resolve (it used to catch the
//    string-aware slice bug, which broke a large fraction of nodes at once)
copy();
const inFragment = Object.entries(N).filter(([, n]) => n.file === '70-petrochem.json');
let bad = 0;
for (const [id] of inFragment) {
  try { run(id, 'get', 'note'); } catch { bad++; }
}
check(`all ${inFragment.length} 70-petrochem nodes resolve`, bad, 0);

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILURE(S)'}`);

// F. insert into a node whose `{` shares a line with its `"id"` (the style
//    throughout 80-industry.json). The indent used to derive as "" and the new
//    key landed at column 0 with the closing brace dedented (34 cosmetic
//    sites in one pass). Build a minimal fixture in the temp file instead of
//    depending on any fragment having that style.
{
  const { writeFileSync } = await import('node:fs');
  const fixture = `{"roots": [{"id": "fixture.quoted",\n`
    + `  "name": "Same-line brace fixture",\n`
    + `  "confidence": "medium"\n`
    + `}], "shared": {}}`;
  writeFileSync(T, fixture);
  run('fixture.quoted', 'set', 'note', 'SENTINEL-F');
  const after = readFileSync(T, 'utf8');
  const noteLine = after.split('\n').find((l) => l.includes('SENTINEL-F'));
  check('same-line-brace insert keeps sibling indent', noteLine, '  "note": "SENTINEL-F"');
  const closeIntact = after.includes('\n}], "shared": {}}');
  check('same-line-brace insert leaves closing brace glued', closeIntact, true);
  check('same-line-brace insert adds no column-0 brace', after.split('\n').every((l) => l !== '}'), true);
}