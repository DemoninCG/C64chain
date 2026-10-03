#!/usr/bin/env node
/**
 * proposals.mjs — read data/_proposals/*.json and report what applying them
 * would actually do, without writing anything.
 *
 *   node scripts/proposals.mjs          # dry run (default, writes nothing)
 *
 * Cross-fragment merges arrive from QA agents that each owned exactly one
 * fragment, so they could only *propose*. This resolves the proposal set into
 * final merge groups and refuses to hide the awkward cases:
 *
 *   - missing endpoints        a `from`/`to` id that is not in the built tree
 *   - self-merge               source === target
 *   - ancestor merge           source is an ancestor of target (would eat the tree)
 *   - chained merges            source -> T where T itself merges into U; resolved to U
 *   - forked sources           two same-named nodes that merge into DIFFERENT targets
 *                              (a real editorial conflict, never silently resolved)
 *   - fan-out targets          two sources merging into one target (fine, but listed)
 */
import { readFileSync, readdirSync } from 'node:fs';

const { nodes: N } = JSON.parse(readFileSync('public/tree.json', 'utf8'));

/* ---- ancestry, so we can catch an ancestor being merged into its own kid --- */
const parentOf = new Map();
for (const [id, n] of Object.entries(N)) {
  for (const c of n.children ?? []) parentOf.set(c, id);
  for (const i of n.inputs ?? []) if (!parentOf.has(i)) parentOf.set(i, id);
}
const ancestorsOf = (id) => {
  const out = new Set();
  for (let p = parentOf.get(id); p; p = parentOf.get(p)) {
    if (out.has(p)) break;            // guard a pre-existing cycle
    out.add(p);
  }
  return out;
};

/* ---- load proposals ------------------------------------------------------ */
const dir = 'data/_proposals';
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const merges = [];
for (const f of files) {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
  for (const m of j.merges ?? []) merges.push({ ...m, prop: f, why: m.why ?? '' });
}
const renames = [];
for (const f of files) {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
  for (const r of j.renames ?? []) renames.push({ ...r, prop: f });
}

const problems = [];
const P = (kind, msg, detail) => problems.push({ kind, msg, detail });

/* ---- validate endpoints -------------------------------------------------- */
for (const m of merges) {
  for (const side of ['from', 'to']) {
    if (!N[m[side]]) P('missing endpoint', `${m.prop}: merge "${m[side]}" is not in the tree`, m);
  }
  if (m.from && m.from === m.to) P('self-merge', `${m.prop}: ${m.from} -> itself`, m);
  if (N[m.from] && N[m.to] && ancestorsOf(m.to).has(m.from))
    P('ancestor merge', `${m.prop}: ${m.from} is an ancestor of ${m.to}`, m);
}

const valid = merges.filter((m) => N[m.from] && N[m.to] && m.from !== m.to
  && !ancestorsOf(m.to).has(m.from));

/* ---- resolve chains: source -> T where T also merges -> U ---------------- */
const target = new Map(valid.map((m) => [m.from, m.to]));
function finalTarget(id, seen = new Set()) {
  if (seen.has(id)) return { id, cycle: true };
  seen.add(id);
  const t = target.get(id);
  return t ? finalTarget(t, seen) : { id, cycle: false };
}
const chained = valid.filter((m) => target.has(m.to) && finalTarget(m.to).id !== m.to);
for (const c of chained) {
  P('chained merge', `${c.prop}: ${c.from} -> ${c.to} -> ${finalTarget(c.to).id}`, c);
}

/* ---- group by final target ---------------------------------------------- */
const groups = new Map();
for (const m of valid) {
  const t = finalTarget(m.from);
  if (t.cycle) { P('cycle', `${m.prop}: ${m.from} has a cyclic merge chain`, m); continue; }
  if (!groups.has(t.id)) groups.set(t.id, []);
  groups.get(t.id).push(m);
}

/* ---- forked sources: same name, different final target ------------------- */
const byName = new Map();
for (const m of valid) {
  const nm = (N[m.from]?.name ?? '').toLowerCase();
  if (!nm) continue;
  if (!byName.has(nm)) byName.set(nm, new Map());
  const t = finalTarget(m.from).id;
  if (!byName.get(nm).has(t)) byName.get(nm).set(t, []);
  byName.get(nm).get(t).push(m.from);
}
const forks = [];
for (const [nm, byTarget] of byName)
  if (byTarget.size > 1) forks.push({ name: nm, targets: [...byTarget.keys()], sources: byTarget });

/* ---- report -------------------------------------------------------------- */
const line = (s = '') => console.log(s);
line('='.repeat(78));
line('PROPOSAL DRY RUN — nothing written');
line('='.repeat(78));
line(`proposal files : ${files.length}`);
line(`merges proposed: ${merges.length}  (well-formed ${valid.length}, rejected ${merges.length - valid.length})`);
line(`renames        : ${renames.length}`);
line(`final groups   : ${groups.size}  (=> ${valid.length} source nodes would be deleted)`);

line('\n' + '-'.repeat(78));
line('PROBLEMS');
line('-'.repeat(78));
if (!problems.length) line('  none');
for (const p of problems) {
  line(`  [${p.kind}] ${p.msg}`);
  if (p.kind === 'missing endpoint' || p.kind === 'ancestor merge' || p.kind === 'self-merge')
    line(`      why: ${(p.detail.why ?? '').slice(0, 150)}`);
}

line('\n' + '-'.repeat(78));
line(`FORKED SOURCES — same name, different canonical target (${forks.length})`);
line('  These are genuine editorial conflicts. Each needs a human ruling.');
line('-'.repeat(78));
for (const f of forks) {
  line(`  "${f.name}"`);
  for (const t of f.targets) {
    line(`      -> ${t}`);
    line(`         ${f.sources.get(t).length} source(s): ${f.sources.get(t).slice(0, 3).join(', ')}${f.sources.get(t).length > 3 ? ' ...' : ''}`);
  }
  line('');
}

line('-'.repeat(78));
line('RENAMES PROPOSED');
line('-'.repeat(78));
for (const r of renames) {
  line(`  [${r.prop}] ${r.id}`);
  line(`      name: ${JSON.stringify(r.name)}  ${r.why ? `(${r.why})` : ''}`);
}
line('');