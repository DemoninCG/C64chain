#!/usr/bin/env node
/**
 * project.mjs — simulate hiding every process/tool/facility node and promoting
 * grandchildren in their place, then report what survives.
 *
 * This is a dry run of a VIEW-TIME projection. It changes nothing on disk; it
 * answers whether a components-and-materials-only view is actually coherent,
 * or whether it shreds the supply chains into unusable fragments.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodes: N } = JSON.parse(await readFile(path.join(ROOT, 'public/tree.json'), 'utf8'));

const ENTITY = new Set(['part', 'material']);
const HIDE = new Set(['process', 'tool', 'facility']);
const root = 'c64';
const raw = process.argv[2] ?? root;

/** Collapse every hidden node out of the tree: a hidden node's entity
 *  descendants are re-parented onto its entity parent. */
function project(id) {
  const out = new Map();          // entity id -> Set of entity ids (contracted edges)
  const stack = [[id, null]];
  const seen = new Set();
  while (stack.length) {
    const [cur, viaProc] = stack.pop();
    if (seen.has(cur + '|' + viaProc)) continue;
    seen.add(cur + '|' + viaProc);
    if (HIDE.has(N[cur].kind)) {
      // transparent: push its children, carrying the process we passed through
      for (const c of N[cur].children ?? []) if (N[c]) stack.push([c, cur]);
      continue;
    }
    if (viaProc && id !== cur) {
      if (!out.has(cur)) out.set(cur, new Set());
      out.get(cur).add(viaProc);
    }
    for (const c of N[cur].children ?? []) if (N[c]) stack.push([c, null]);
  }
  return out;
}

/** Walk the projected graph: entity children stay direct, hidden children are
 *  entered and SKIPPED — but recursively, because process->process->entity runs
 *  up to 10 hops deep. A projection that only bridges one hidden level silently
 *  deletes the deep supply chains, which is exactly the case to check. */
function walkProjected(id, depth = 0, acc = { edges: 0, maxDepth: 0, nodes: new Set(), depth: new Map() }) {
  if (acc.depth.has(id)) return acc;
  acc.depth.set(id, depth);
  acc.nodes.add(id);
  acc.maxDepth = Math.max(acc.maxDepth, depth);

  const descend = (cur, d) => {
    for (const c of N[cur].children ?? []) {
      if (!N[c]) continue;
      if (HIDE.has(N[c].kind)) { acc.edges++; descend(c, d); }
      else { acc.edges++; walkProjected(c, d + 1, acc); }
    }
  };
  descend(id, depth);
  return acc;
}

const asIs = walkProjected(root);
const hiddenTotal = [...Object.values(N)].filter((n) => HIDE.has(n.kind)).length;

console.log(`\n=== entity-only projection of "${raw}" ===`);
console.log(`  nodes in full tree:              ${Object.keys(N).length}`);
console.log(`  nodes of kind process/tool/facility (would be hidden): ${hiddenTotal}`);
console.log(`  entity nodes reachable before projection: ${asIs.nodes.size}`);
console.log(`  contracted entity->entity edges:          ${asIs.edges}`);
console.log(`  max depth before projection:               ${asIs.maxDepth}`);

// after projection, how many entity nodes does the tree actually expose?
const projected = walkProjected(root);
const projectedEntities = [...projected.nodes].filter((id) => ENTITY.has(N[id].kind));
console.log(`  entity nodes reachable AFTER projection:  ${projectedEntities.length}`);

/* Does each top-level branch still reach a raw material? */
const TERMINAL_OK = /sand|quartz|ore|reservoir|seam|air|water|brine|log|clay|rock|bauxite|cassiterite|galena|sphalerite|peat|stump/i;
const branches = N[root].children ?? [];
console.log('\n  branch reachability to a raw-material terminus:');
for (const b of branches) {
  const res = walkProjected(b);
  const ents = [...res.nodes].filter((id) => ENTITY.has(N[id].kind));
  const terms = ents.filter((id) => TERMINAL_OK.test(N[id].name) || TERMINAL_OK.test(id));
  const orphans = ents.filter((id) => (N[id].children ?? []).filter((c) => N[c] && !HIDE.has(N[c].kind)).length === 0
    && !TERMINAL_OK.test(N[id].name));
  console.log(`    ${(N[b].name ?? b).slice(0, 42).padEnd(44)} entities=${String(ents.length).padStart(4)}  rawTermini=${String(terms.length).padStart(3)}  leafEntities=${String(orphans.length).padStart(4)}`);
}

/* Where do the well-known starting materials land in the projection? */
const probes = ['bauxite', 'quartz', 'crude', 'sphalerite', 'cassiterite', 'galena', 'laterite', 'iron ore', 'hematite', 'natural gas'];
console.log('\n  do the headline raw materials survive as leaves of the projection?');
const allProjected = new Set();
for (const b of branches) for (const id of walkProjected(b).nodes) allProjected.add(id);
for (const p of probes) {
  const hits = [...allProjected].filter((id) => ENTITY.has(N[id].kind) && new RegExp(p, 'i').test(N[id].name));
  console.log(`    ${p.padEnd(14)} ${String(hits.length).padStart(3)} entity node(s)  e.g. ${hits.slice(0, 2).map((h) => h).join(', ') || '—'}`);
}

/* How big would the entity-only tree be if we counted only what's displayed? */
const displayed = [...projected.nodes].filter((id) => !HIDE.has(N[id].kind)).length;
console.log(`\n  displayed nodes in entity-only view: ${displayed} of ${Object.keys(N).length} (${((displayed / Object.keys(N).length) * 100).toFixed(0)}%)`);
console.log(`  hidden but still described (kept in data): ${hiddenTotal}`);
console.log('');