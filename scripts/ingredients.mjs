#!/usr/bin/env node
/**
 * ingredients.mjs — audit how `inputs` resolve to nodes.
 *
 *   node scripts/ingredients.mjs links        existing table entries
 *   node scripts/ingredients.mjs unresolved  inputs that resolve to nothing
 *   node scripts/ingredients.mjs --top 40     how many of each to list
 *
 * Why this exists separately from scripts/checktables.mjs: checktables asks
 * "does this target exist?". That question is too weak on its own. The worst
 * bugs found during the QA pass all resolved *cleanly* to a real node and were
 * invisible to every build and audit check --
 *
 *   "borax"      -> E-glass fibre      (the boron goes into the glass)
 *   "boric acid" -> E-glass fibre      (same)
 *   "soda ash"   -> rock salt          (Na2CO3 is not NaCl)
 *   "kaolin"     -> bauxite            (a clay, not the ore that covers it)
 *
 * All four passed every mechanical check. `links` below looks for that shape:
 * a target that exists, is the right sort of node, and whose own name says
 * nothing about the substance being looked up.
 *
 * `unresolved` exists because build.mjs matches an input to a node name only
 * on an EXACT normalised match. "naphtha" therefore fails to find "Naphtha
 * feedstock", and the near-miss is invisible. This mode proposes the near
 * misses so they can be reviewed as a list instead of hunted for by hand.
 */
import { readFileSync } from 'node:fs';

const { nodes: N } = JSON.parse(readFileSync('public/tree.json', 'utf8'));
const mode = process.argv[2] ?? 'links';
const topIdx = process.argv.indexOf('--top');
const TOP = topIdx > 0 ? Number(process.argv[topIdx + 1]) : 40;

/* build.mjs uses the same normalisation, so a proposal here is one build could
   actually accept if the name were added to the index. */
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'for', 'from', 'to', 'in', 'on', 'at',
  'its', 'their', 'with', 'or', 'per', 'as', 'is', 'it', 'that', 'which', 'by', 'into']);
const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '')
  .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));

/** build.mjs only falls back to the name index for entity-like kinds. */
const ENTITY_LIKE = new Set(['part', 'material']);
const candidates = Object.values(N).filter((n) => ENTITY_LIKE.has(n.kind) && n.name);

if (mode === 'links') {
  const table = JSON.parse(readFileSync('data/_ingredients.json', 'utf8')).map;
  const missing = [];
  const suspicious = [];

  for (const [key, target] of Object.entries(table)) {
    const n = N[target];
    if (!n) { missing.push({ key, target }); continue; }

    const keyWords = tokens(key);
    if (!keyWords.length) continue;
    const say = `${n.name} ${n.description ?? ''}`.toLowerCase();
    if (keyWords.some((w) => say.includes(w))) continue;      // target acknowledges the substance

    // Target says nothing about the key. Rank how far apart they are: a target
    // that is a process rather than a substance is the worst case, because the
    // link then silently asserts a substance is made of a procedure.
    const kindPenalty = ENTITY_LIKE.has(n.kind) ? 0 : 2;
    const overlap = keyWords.filter((w) => say.includes(w)).length;
    suspicious.push({ key, target, kind: n.kind, name: n.name, overlap, rank: kindPenalty + keyWords.length - overlap });
  }

  console.log('=== ingredient mappings that point at a node which does not exist ===');
  if (!missing.length) console.log('  none');
  for (const m of missing) console.log(`  "${m.key}" -> ${m.target}`);

  console.log(`\n=== mappings whose target never mentions the substance (${suspicious.length}) ===`);
  console.log('  Ranked worst-first. A `process` target is the serious case: it asserts');
  console.log('  that a substance is made of a procedure.');
  for (const s of suspicious.sort((a, b) => b.rank - a.rank).slice(0, TOP)) {
    const flag = !ENTITY_LIKE.has(s.kind) ? '  <-- target is a ' + s.kind : '';
    console.log(`  "${s.key}" -> ${s.target}  "${s.name}" (${s.kind})${flag}`);
  }
  console.log(`\n  ${suspicious.length - TOP} more not shown; raise with --top\n`);
  process.exit(missing.length ? 1 : 0);
}

if (mode === 'unresolved') {
  /* Replicate build.mjs's three-step resolution so this lists only what really
     fails, rather than every input that is not itself a node id. Getting this
     wrong matters: a shortlist polluted with already-resolved strings would
     send an agent to "fix" links that are working.
       1. the string is a node id
       2. it normalises to exactly one node NAME (entity-like kinds only)
       3. it is a key in data/_ingredients.json
     Anything past all three is genuinely unresolved. */
  const table = JSON.parse(readFileSync('data/_ingredients.json', 'utf8')).map;
  const tableKeys = new Set(Object.keys(table).map(norm));

  const nameIndex = new Map();
  const nameAmbiguous = new Set();
  for (const c of candidates) {
    const k = norm(c.name);
    if (nameIndex.has(k)) nameAmbiguous.add(k); else nameIndex.set(k, c);
  }

  const unresolved = new Map();
  for (const [id, n] of Object.entries(N)) {
    for (const i of n.inputs ?? []) {
      if (typeof i !== 'string') continue;
      if (N[i]) continue;                                       // (1) is an id
      const k = norm(i);
      if (tableKeys.has(k)) continue;                            // (3) via the table
      if (!nameAmbiguous.has(k) && nameIndex.has(k)) continue;   // (2) unique name
      if (!unresolved.has(i)) unresolved.set(i, []);
      unresolved.get(i).push(id);
    }
  }

  const rows = [];
  for (const [input, users] of unresolved) {
    const keyWords = tokens(input);
    if (!keyWords.length) continue;
    const scored = [];
    for (const c of candidates) {
      const cn = norm(c.name);
      const say = `${c.name} ${c.description ?? ''}`.toLowerCase();
      const hit = keyWords.filter((w) => say.includes(w)).length;
      if (!hit) continue;
      // An exact prefix of the node name is the strongest signal, because that
      // is the case build.mjs's exact-match name fallback would accept if it
      // were widened to a containment test.
      const prefix = cn.startsWith(norm(input)) || cn.includes(norm(input));
      scored.push({ c, hit, prefix, score: hit / keyWords.length + (prefix ? 1 : 0) });
    }
    if (!scored.length) continue;
    scored.sort((a, b) => b.score - a.score);
    rows.push({ input, users: users.length, best: scored[0], runners: scored.length });
  }
  rows.sort((a, b) => b.best.score - a.best.score || b.users - a.users);

  /* --clean keeps only unambiguous rows: exactly one candidate node.
   * --strict tightens that further, and the tightening matters. Reviewed by
   * hand, --clean is only about 40% correct: "liquefaction" matched Hydrogen,
   * "soil" matched the barite mud system, "sunlight" matched EPDM, "dyes"
   * matched a BOPP film. Having exactly one candidate is weak evidence, because
   * a rare word is by definition rare in node names too.
   *
   * --strict keeps only rows where the node's NAME begins with the whole input
   * string (so the input is a proper name for the node, not a word that happens
   * to appear in its description) and the name does not read as a mixture or a
   * procedure. That subset reviewed at roughly 80% correct, which is high enough
   * to act on and low enough that the residue still needs reading. */
  const CLEAN = process.argv.includes('--clean');
  const STRICT = process.argv.includes('--strict');
  const mixtureName = (name) => /\b(and|or)\b|\/|,|\bmixtures?\b|\bsystem\b/i.test(name);
  const strictOk = (r) => r.runners === 1 && r.best.prefix
    && !mixtureName(r.best.c.name) && r.best.c.kind === 'material';
  const shown = STRICT ? rows.filter(strictOk) : CLEAN ? rows.filter((r) => r.runners === 1) : rows;

  console.log(`=== ${unresolved.size} input strings that resolve by none of build's three routes ===`);
  console.log(`=== ${rows.length} have a plausible node; ${rows.filter((r) => r.runners === 1).length} are unambiguous;`);
  console.log(`=== ${rows.filter(strictOk).length} pass --strict ===\n`);
  console.log('  Ranked by match strength. "[prefix]" means the node name contains the whole');
  console.log('  input string -- exactly the near-miss build.mjs cannot see.\n');
  if (CLEAN) console.log('  --clean: single candidate only. Not safe to apply unreviewed.\n');
  if (STRICT) console.log('  --strict: single candidate + node name contains the input + material +');
  if (STRICT) console.log('            name is not a mixture. Act on these; read the residue by hand.\n');
  for (const r of shown.slice(0, TOP)) {
    console.log(`  "${r.input}"  x${r.users}${r.best.prefix ? '  [prefix]' : ''}`);
    console.log(`      -> ${r.best.c.id}  "${r.best.c.name}" (${r.best.c.kind}, ${r.best.c.file})`);
    if (r.runners > 1) console.log(`      ${r.runners - 1} other candidate(s)`);
  }
  console.log(`\n  ${shown.length - TOP} more not shown; raise with --top`);
  console.log(`  ${unresolved.size - rows.length} have no plausible node at all\n`);
  process.exit(0);
}

console.error('usage: node scripts/ingredients.mjs [links|unresolved] [--top N]');
process.exit(2);