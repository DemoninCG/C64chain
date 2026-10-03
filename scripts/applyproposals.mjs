#!/usr/bin/env node
/**
 * applyproposals.mjs — apply data/_proposals/*.json merges.
 *
 *   node scripts/applyproposals.mjs            # dry run, writes nothing
 *   node scripts/applyproposals.mjs --apply    # do it
 *
 * Rules it enforces, from docs/CHECKLIST.md rule 5:
 *   "Merge by re-pointing every `children` and `from` reference at the survivor,
 *    then deleting the loser. Do not delete a node that still has references."
 *
 * How it stays byte-preserving: it never round-trips a file through
 * JSON.stringify. It works on the raw text. A node is located by its id, its
 * braces are matched, and exactly three things are rewritten:
 *   1. every other occurrence of the loser's id becomes the survivor's id
 *      (one pass, so chained merges resolve in a single edit)
 *   2. the loser's `children` are appended to the survivor's
 *   3. the loser's object text is excised, along with its slot in the parent's
 *      children array
 *
 * Refuses rather than guesses: a merge whose loser still has references after
 * re-pointing, or whose survivor is inside the loser's own subtree, aborts
 * without writing.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const dataDir = 'data';

/* ---------- load the built tree (authoritative node list) ----------------- */
const { nodes: N } = JSON.parse(readFileSync('public/tree.json', 'utf8'));

/* ---------- helpers on raw text ------------------------------------------ */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Find the { ... } object whose "id" is `id`. Returns null if not exactly one. */
function nodeSpan(text, id) {
  const needle = `"${id}"`;
  const hits = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at < 0) break;
    // must be the value of an "id" key, not a mention inside prose
    const before = text.slice(Math.max(0, at - 12), at);
    if (!/"id"\s*:\s*$/.test(before)) { from = at + needle.length; continue; }
    from = at + needle.length;

    let i = at - 1, depth = 0;
    for (; i >= 0; i--) {
      const c = text[i];
      if (c === '}') depth++;
      else if (c === '{') { if (depth === 0) break; depth--; }
    }
    if (i < 0) continue;
    let d = 0, j = i;
    for (; j < text.length; j++) {
      const c = text[j];
      if (c === '{') d++;
      else if (c === '}') { d--; if (d === 0) break; }
    }

    /* Some fragments keep nodes in a flat map -- "my.id": { ... } -- rather
       than nested under `children`. Excising just the object would leave the
       key dangling ("my.id": <next key>), so take the key with it. */
    let open = i;
    let k = i - 1;
    while (k >= 0 && /\s/.test(text[k])) k--;
    if (text[k] === ':' && text[k - 1] === '"') {
      let q = k - 2;                       // step inside the closing quote...
      while (q >= 0 && text[q] !== '"') q--;  // ...then walk back to the opening one
      if (q >= 0 && text.slice(q + 1, k - 1) === id) open = q;
    }

    hits.push({ start: open, end: j + 1, idAt: at });
  }
  return hits.length === 1 ? hits[0] : (hits.length === 0 ? null : { ambiguous: true, count: hits.length });
}

/** Top-level keys of a node object, with the extent of each value.
 *  A plain regex is not enough: several nodes use the word "children" (or
 *  "inputs") inside their own description text, and matching that would hand
 *  back a fragment of a sentence instead of the real value. This walks the
 *  text respecting strings and escapes. */
function topLevelKeys(text) {
  const out = [];
  let i = 0, depth = 0;
  const skipString = (j) => {
    j++;
    while (j < text.length) {
      if (text[j] === '\\') { j += 2; continue; }
      if (text[j] === '"') return j;
      j++;
    }
    return j;
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      const s = i;
      const e = skipString(i);
      const str = text.slice(s, e + 1);
      i = e + 1;
      if (depth !== 1) continue;
      let k = i;
      while (k < text.length && /\s/.test(text[k])) k++;
      if (text[k] !== ':') continue;
      k++;
      while (k < text.length && /\s/.test(text[k])) k++;
      const key = JSON.parse(str);
      if (text[k] === '[' || text[k] === '{') {
        let d = 0, j = k;
        for (; j < text.length; j++) {
          if (text[j] === '"') { j = skipString(j); continue; }
          if (text[j] === '[' || text[j] === '{') d++;
          else if (text[j] === ']' || text[j] === '}') { d--; if (d === 0) { j++; break; } }
        }
        out.push({ key, start: k, end: j, text: text.slice(k, j) });
        i = j; continue;
      }
      /* A string value must be skipped as a unit. Scanning to the next comma
         instead desynchronises the walk on the first comma *inside* the text --
         and descriptions are full of them -- so `children` is never found and
         the survivor silently adopts nothing. */
      if (text[k] === '"') {
        const e = skipString(text, k);
        out.push({ key, start: k, end: e + 1, text: text.slice(k, e + 1) });
        i = e + 1; continue;
      }
      let j = k;
      while (j < text.length && !/[,\n}]/.test(text[j])) j++;
      out.push({ key, start: k, end: j, text: text.slice(k, j) });
      i = j; continue;
    }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    i++;
  }
  return out;
}

/** Index just past the closing quote of the string starting at i. */
function skipString(text, i) {
  i++;
  while (i < text.length) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '"') return i;
    i++;
  }
  return i;
}

/** Every JSON array literal in `text` that contains `value` as an element. */
function arraysContaining(text, value) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') { i = skipString(text, i); i++; continue; }
    if (c !== '[') { i++; continue; }
    const start = i;
    let d = 0, j = i;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (ch === '"') { j = skipString(text, j); continue; }
      if (ch === '[') d++;
      else if (ch === ']') { d--; if (d === 0) { j++; break; } }
    }
    const lit = text.slice(start, j);
    const elems = lit.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    if (elems.some((s) => { try { return JSON.parse(s) === value; } catch { return false; } }))
      out.push({ start, end: j, text: lit });
    i = j;
  }
  return out;
}

/** The node's `children` ids, or [] if it has none. */
function childrenOf(nodeText) {
  const e = topLevelKeys(nodeText).find((k) => k.key === 'children');
  if (!e || !e.text.startsWith('[')) return [];
  try { return JSON.parse(e.text); } catch { return []; }
}

/** Remove one element from a JSON array literal, tidying commas and whitespace. */
function dropFromArray(arrText, value) {
  const m = arrText.match(/^(\[\s*)([\s\S]*?)(\s*\])$/);
  if (!m) return null;
  const items = m[2].split(',').map((s) => s.trim()).filter(Boolean);
  const kept = items.filter((s) => JSON.parse(s) !== value);
  if (kept.length === items.length) return null;           // not there
  if (!kept.length) return m[1] + m[3];                    // emptied
  const multiline = /\n/.test(m[2]);
  const inner = multiline
    ? '\n' + kept.map((s) => m[1].match(/^\[(\s*)/)[1] + '  ' + s).join(',\n') + '\n' + m[1].match(/^\[(\s*)/)[1].replace(/^\s*/, '')
    : kept.join(', ');
  return m[1] + inner + m[3];
}

/** Excise an object's text plus the comma/whitespace that held it in place. */
function excise(text, span) {
  let { start, end } = span;
  const after = text.slice(end);
  const m = after.match(/^(\s*),/);
  if (m) return { text: text.slice(0, start) + m[1] + after.slice(m[0].length), start, end: start + m[1].length };
  const before = text.slice(0, start);
  const m2 = before.match(/,\s*$/);
  if (m2) return { text: before.slice(0, m2.index) + after, start: m2.index, end };
  return { text: text.slice(0, start) + after, start, end: start };
}

/* ---------- load proposals ----------------------------------------------- */
const propDir = `${dataDir}/_proposals`;
const propFiles = readdirSync(propDir).filter((f) => f.endsWith('.json')).sort();
const raw = [];
for (const f of propFiles) {
  const j = JSON.parse(readFileSync(`${propDir}/${f}`, 'utf8'));
  for (const m of j.merges ?? []) raw.push({ ...m, prop: f, why: m.why ?? '' });
}

const parentOf = new Map();
for (const [id, n] of Object.entries(N)) {
  for (const c of n.children ?? []) parentOf.set(c, id);
  for (const i of n.inputs ?? []) if (!parentOf.has(i)) parentOf.set(i, id);
}
const ancestorsOf = (id) => {
  const out = new Set();
  for (let p = parentOf.get(id); p; p = parentOf.get(p)) { if (out.has(p)) break; out.add(p); }
  return out;
};

/* ---------- filter to merges that are still actionable -------------------- */
const alreadyDone = [];
const voidProposals = [];
const declined = [];
const candidates = [];
for (const m of raw) {
  if (!N[m.from]) { alreadyDone.push(m); continue; }          // agent applied it
  if (m.from === m.to) { alreadyDone.push(m); continue; }
  /* An explicit decline is a decision, not an oversight, so it is honoured and
     reported rather than deleted from the proposal file. A proposing agent
     marks a merge as a judgement call; the integrator records the ruling. */
  if (m.declined) { declined.push(m); continue; }
  /* A proposal whose TARGET no longer exists is not applicable, and must never
     fall through to the candidate list: `metal.rosin` was itself merged into
     `chem.rosin`, which left the reciprocal proposal "chem.rosin -> metal.rosin"
     pointing at nothing. Applying it would have deleted the survivor. */
  if (!N[m.to]) { voidProposals.push(m); continue; }
  if (ancestorsOf(m.to).has(m.from)) { alreadyDone.push(m); continue; }
  candidates.push(m);
}

/* ---------- arbitrate reciprocal merges ----------------------------------- */
/* Two agents can each propose merging into the other. The CHECKLIST keep-rule
 * (rule 5: richer description and facts first) decides it, not the file order.
 *
 * Order of the comparison, and why. `confidence` leads: it is an explicit
 * editorial judgement about how well sourced a node is, whereas description
 * length is a proxy that two equally good nodes can differ on by a dozen
 * characters -- and a real arbitration once turned on a 15-character gap and
 * silently discarded a `confidence: high` subtree. Description and facts are
 * then summed (a fact is worth roughly a paragraph), and children count last. */
const CONF = { high: 3, medium: 2, low: 1 };
const score = (id) => {
  const n = N[id];
  const factsLen = (n.facts ?? []).reduce((a, f) => a + `${f.label ?? ''} ${f.value ?? ''}`.length, 0);
  return [
    CONF[n.confidence] ?? 0,
    (n.description ?? '').length + factsLen,
    (n.children ?? []).length,
  ];
};
const byTarget = new Map(candidates.map((m) => [m.from, m.to]));
const dropped = [];
const decided = [];
const pairSeen = new Set();
for (const m of candidates) {
  if (byTarget.has(m.to) && byTarget.get(m.to) === m.from) {          // a -> b and b -> a
    const pair = [m.from, m.to].sort();
    const pk = pair.join('|');
    if (pairSeen.has(pk)) continue;                                 // already arbitrated
    pairSeen.add(pk);
    const [a, b] = [m, candidates.find((x) => x.from === m.to && x.to === m.from)].sort((x, y) => {
      const sa = score(x.from), sb = score(y.from);
      for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i];
      return 0;
    });
    const winner = a.from, loser = b.from;                            // richer one survives
    decided.push({ from: loser, to: winner, why: `reciprocal merge with ${winner}; keep-rule chose it (confidence ${N[winner].confidence ?? '-'} vs ${N[loser].confidence ?? '-'}, description+facts ${score(winner)[1]} vs ${score(loser)[1]})`, prop: m.prop });
    dropped.push(b);
    continue;
  }
  decided.push(m);
}

/* One loser proposed for two different survivors is an unresolvable conflict.
   Same loser and same survivor twice is just a duplicate -- keep one. */
const seenLoser = new Map();
const conflicting = [];
for (const m of decided) {
  const prev = seenLoser.get(m.from);
  if (!prev) { seenLoser.set(m.from, m); continue; }
  if (prev.to !== m.to) conflicting.push([prev, m]);
  else dropped.push(m);
}
for (const [x, y] of conflicting) dropped.push(y);

/* ---------- resolve chains, then check for cycles ------------------------- */
const tmap = new Map(decided.map((m) => [m.from, m.to]));
function resolve(id, seen = new Set()) {
  if (seen.has(id)) return null;
  seen.add(id);
  const t = tmap.get(id);
  return t ? resolve(t, seen) : id;
}
const plan = [];
const plannedFrom = new Set();
for (const m of decided) {
  if (plannedFrom.has(m.from)) continue;                 // same loser seen twice
  const fin = resolve(m.from);
  if (fin === null) { dropped.push(m); continue; }        // cycle
  plannedFrom.add(m.from);
  if (fin === m.from) continue;                           // chained away; the root handles it
  if (N[m.from] && fin && ancestorsOf(fin).has(m.from)) { dropped.push(m); continue; }
  plan.push({ ...m, to: fin });
}

/* ---------- report -------------------------------------------------------- */
console.log('='.repeat(78));
console.log(APPLY ? 'APPLYING PROPOSED MERGES' : 'DRY RUN — nothing written');
console.log('='.repeat(78));
console.log(`proposed              ${raw.length}`);
console.log(`already applied by agent / self-merge / would eat the tree: ${alreadyDone.length}`);
if (voidProposals.length) {
  console.log(`void (target no longer exists): ${voidProposals.length}`);
  for (const m of voidProposals) console.log(`  [${m.prop}] ${m.from} -> ${m.to}   (target "${m.to}" is gone)`);
}
console.log(`dropped as reciprocal-duplicate: ${dropped.length}`);
if (declined.length) {
  console.log(`declined on review: ${declined.length}`);
  for (const m of declined) console.log(`  [${m.prop}] ${m.from} -> ${m.to}   (${m.why ?? 'no reason recorded'})`);
}
console.log(`merges to apply       ${plan.length}`);
if (plan.length) {
  const files = new Set(plan.map((m) => N[m.from].file));
  console.log(`nodes to delete       ${plan.length} across ${files.size} file(s)`);
  const s = new Set(plan.map((m) => m.to));
  console.log(`survivors             ${s.size}`);
  /* List them. A dry run that only prints counts is useless when the question
     is "what is left?", which is the only reason to run a dry run. */
  console.log('\nmerges this run would apply:');
  for (const m of plan.sort((a, b) => a.prop.localeCompare(b.prop) || a.from.localeCompare(b.from))) {
    console.log(`  [${m.prop}] ${m.from}`);
    console.log(`      -> ${m.to}   (${N[m.to].name})`);
  }
}

if (!APPLY) { console.log('\n(dry run: rerun with --apply)\n'); process.exit(0); }

/* ---------- apply, deepest losers first ----------------------------------- */
const depth = (id) => ancestorsOf(id).size;
plan.sort((a, b) => depth(b.from) - depth(a.from));   // children before parents

const files = readdirSync(dataDir).filter((f) => /^\d.*\.json$/.test(f));
const cache = new Map(files.map((f) => [f, readFileSync(`${dataDir}/${f}`, 'utf8')]));
const get = (f) => cache.get(f);
const set = (f, t) => cache.set(f, t);

const provenance = [];
const problems = [];
const done = new Set();
const skipped = [];

/* Validate after every merge so a break names the merge that caused it,
   rather than surfacing 200 edits later with no clue. */
const touched = new Set();
function check(f, where) {
  if (!touched.has(f)) return true;
  try { JSON.parse(get(f)); return true; } catch (e) {
    const msg = String(e.message);
    const at = Number(/position (\d+)/.exec(msg)?.[1] ?? -1);
    const t = get(f);
    problems.push(`${f}: invalid JSON after ${where} — ${msg}`);
    if (at >= 0) problems.push(`    context: ...${JSON.stringify(t.slice(Math.max(0, at - 160), at + 160))}...`);
    return false;
  }
}

for (const m of plan) {
  if (done.has(m.from)) { skipped.push(m); continue; }        // an earlier merge already ate it
  const loserFile = N[m.from].file;
  const winFile = N[m.to].file;
  let t = get(loserFile);
  if (t === undefined) { problems.push(`no such fragment: ${loserFile}`); continue; }
  touched.clear();

  const span = nodeSpan(t, m.from);
  if (!span || span.ambiguous) { problems.push(`${m.from}: ${span ? `id appears ${span.count}x` : 'not found in ' + loserFile}`); continue; }
  const loserText = t.slice(span.start, span.end);

  // 1. survivor adopts the loser's children
  const kids = childrenOf(loserText).filter((c) => c !== m.to);
  if (kids.length) {
    let wt = get(winFile);
    const wspan = nodeSpan(wt, m.to);
    if (!wspan || wspan.ambiguous) problems.push(`${m.to}: survivor not locatable in ${winFile}`);
    else {
      const wText = wt.slice(wspan.start, wspan.end);
      const ce = topLevelKeys(wText).find((k) => k.key === 'children');
      /* A nested survivor has no `children` key of its own in the source file --
         build.mjs derives it from whichever parent's array names it. So fall
         back to the array that actually references the survivor. */
      let target = ce ?? null;
      if (!target) {
        const holders = arraysContaining(wt, m.to);
        if (holders.length === 1) target = holders[0];
        else if (holders.length > 1) problems.push(`${m.to}: ${holders.length} arrays reference it; not adopting the loser's children (needs a human call)`);
      }
      if (!target) { /* cannot find where to put them; references still re-point */ }
      else {
        const have = new Set(JSON.parse(target.text));
        const add = kids.filter((c) => !have.has(c));
        if (add.length) {
          const merged = [...have, ...add];
          const indent = target.text.match(/\[\s*\n(\s*)/)?.[1] ?? '      ';
          const closeInd = target.text.match(/\n(\s*)\]/) ? target.text.match(/\n(\s*)\]/)[1] : indent.slice(0, 2);
          const rep = /\n/.test(target.text)
            ? `[\n${merged.map((c) => `${indent}${JSON.stringify(c)}`).join(',\n')}\n${closeInd}]`
            : `[${merged.map((c) => JSON.stringify(c)).join(', ')}]`;
          const base = wt.slice(0, wspan.start) + wText.slice(wspan.end);
          wt = base.slice(0, target.start) + rep + base.slice(target.end);
          set(winFile, wt);
          touched.add(winFile);
        }
      }
    }
  }

  // 2. re-point every OTHER occurrence of the loser's id across all fragments
  const token = new RegExp(`"${esc(m.from)}"`, 'g');
  for (const f of files) {
    let ft = get(f);
    const lspan = f === loserFile ? nodeSpan(ft, m.from) : null;
    ft = ft.replace(token, (match, off, whole) => {
      // leave the loser's own "id" alone; we are about to cut that object out
      if (lspan && off >= lspan.start && off < lspan.end) return match;
      if (lspan && whole.slice(Math.max(0, off - 12), off).match(/"id"\s*:\s*$/) && f === loserFile) return match;
      return `"${m.to}"`;
    });
    set(f, ft);
    if (ft !== get(f) || f === loserFile) touched.add(f);
  }
  if (!check(winFile, `${m.from} -> ${m.to} (re-pointing references)`)) break;

  // 3. excise the loser
  const after = get(loserFile);
  const span2 = nodeSpan(after, m.from);
  if (!span2 || span2.ambiguous) { problems.push(`${m.from}: vanished before excision`); continue; }
  set(loserFile, excise(after, span2).text);
  touched.add(loserFile);
  done.add(m.from);
  if (!check(loserFile, `${m.from} -> ${m.to} (excising the loser)`)) break;

  const ln = N[m.from], wn = N[m.to];
  provenance.push({
    loser: m.from, loserName: ln.name, loserFile,
    survivor: m.to, survivorName: wn.name, survivorFile: winFile,
    proposal: m.prop, why: m.why,
    loserDescription: ln.description ?? null,
    loserFacts: ln.facts ?? null,
  });
}

/* ---------- report + write ---------------------------------------------- */
console.log(`\napplied ${provenance.length}/${plan.length} merges`);
if (skipped.length) console.log(`skipped ${skipped.length}: the id was already removed by an earlier merge in this same run`);
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S) — aborting before writing:`);
  for (const p of problems.slice(0, 40)) console.log('  ' + p);
  process.exit(1);
}

for (const [f, t] of cache) {
  try { JSON.parse(t); } catch (e) {                 // refuse to write invalid JSON
    const at = Number(/position (\d+)/.exec(String(e.message))?.[1] ?? -1);
    console.error(`\n${f}: invalid JSON — ${e.message}`);
    if (at >= 0) console.error(`  context: ...${JSON.stringify(t.slice(Math.max(0, at - 200), at + 200))}...`);
    process.exit(1);
  }
  writeFileSync(`${dataDir}/${f}`, t);
}
/* ACCUMULATE, never overwrite. This file is the audit trail for every node a
   merge has deleted, so a second run must add to it rather than replace it --
   an earlier version overwrote it and silently discarded 158 records. */
const mergedPath = `${dataDir}/_merged.json`;
let history = [];
if (existsSync(mergedPath)) {
  try { history = JSON.parse(readFileSync(mergedPath, 'utf8')).merges ?? []; } catch { history = []; }
}
const seenLosers = new Set(history.map((m) => m.loser));
const fresh = provenance.filter((m) => !seenLosers.has(m.loser));
if (fresh.length !== provenance.length) {
  console.log(`  note: ${provenance.length - fresh.length} record(s) already in the merge history, not duplicated`);
}
writeFileSync(mergedPath, JSON.stringify({
  $comment: 'Content of every node deleted by a cross-fragment merge, kept for the record so a merge is never a silent loss. Written by scripts/applyproposals.mjs, which appends to this file rather than replacing it.',
  merges: [...history, ...fresh],
}, null, 2) + '\n');

console.log(`wrote ${cache.size} fragment(s) + data/_merged.json (${fresh.length} new deletions recorded, ${history.length + fresh.length} total)`);