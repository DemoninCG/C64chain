#!/usr/bin/env node
/**
 * build.mjs — stitch data/*.json into a single validated tree and emit
 *   public/tree.json       flat node map + child id lists (consumed by the viewer)
 *   public/tree.dot        Graphviz digraph
 *   public/tree.mmd        Mermaid mindmap (shallow, for pasting into docs)
 *   docs/TREE.md           full indented outline
 *   public/tree.meta.json  stats for the viewer header
 *
 * No dependencies. Run: node scripts/build.mjs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.resolve(process.env.DATA_DIR ?? path.join(ROOT, 'data'));
const PUBLIC = path.resolve(process.env.PUBLIC_DIR ?? path.join(ROOT, 'public'));
const DOCS = path.resolve(process.env.DOCS_DIR ?? path.join(ROOT, 'docs'));

/* `org` and `site` were added 2026-10-04 to split the overloaded `facility`.
 * `org` is a company (it owns things); `site` is a place that produces nothing
 * (a cleanroom bay, a pipeline, a landfill); `facility` keeps actual production
 * - plants, quarries, mines, works. The point is that `owned by` and `at` stop
 * being one relation, which they were whenever a subsidiary and a cleanroom bay
 * were both "facility". See docs/RELATIONS.md 3.3. */
const VALID_KINDS = new Set(['part', 'process', 'material', 'facility', 'tool', 'note', 'org', 'site']);

/* The ten relations that are STORED on an edge. Mirrors the `stored` flag on
 * each entry in data/_relation_schema.json `relations`. `made by` is derived
 * from `produces` and must never appear here. */
const STORED_RELATIONS = new Set([
  'contains', 'made of', 'made from', 'step', 'consumes',
  'produces', 'uses', 'at', 'owned by', 'about',
]);
const ENTITY_LIKE = new Set(['part', 'material']);
// Categories answer "what industry made this", not "where does it sit in the
// machine". The machine-position distinction is structural and lives in the
// spine (c64.peripherals, c64.extras, c64.bottoms-out), which is why there is
// deliberately no `peripherals` bucket here: it only ever held one node, and a
// legend row reading "1" misleads rather than informs.
const VALID_CATEGORIES = new Set([
  'silicon', 'passives', 'board', 'plastics', 'metals', 'magnetics',
  'interconnect', 'power', 'assembly', 'optics', 'fluids', 'energy',
  'packaging', 'logistics', 'computing', 'industry',
]);

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ------------------------------------------------------------------ load */

const files = (await readdir(DATA)).filter((f) => f.endsWith('.json')).sort();
if (!files.length) {
  console.error('no data files');
  process.exit(1);
}

const docs = [];
for (const f of files) {
  const text = await readFile(path.join(DATA, f), 'utf8');
  try {
    docs.push({ file: f, doc: JSON.parse(text) });
  } catch (e) {
    err(`${f}: invalid JSON — ${e.message}`);
  }
}

/* ----------------------------------------------- collect definitions */

const defs = new Map(); // id -> the winning node object
const dupes = new Map(); // id -> every definition offered, so we can pick the richest
/** @type {{id:string, file:string, line:string}[]} */
const refSites = [];

function define(node, file, where) {
  if (!node || typeof node !== 'object') {
    err(`${file} ${where}: expected a node object, got ${typeof node}`);
    return;
  }
  if (!node.id) {
    err(`${file} ${where}: node with name "${node.name ?? '?'}" has no id`);
    return;
  }
  node.__file = file;
  if (!defs.has(node.id)) defs.set(node.id, node);
  if (!dupes.has(node.id)) dupes.set(node.id, []);
  dupes.get(node.id).push(node);
}

const pointers = []; // {id, text, file} — a shared entry that was a gloss, not a node
const published = new Set(); // ids defined in a `nodes`/`shared` map, i.e. offered for reuse

// Optional alias table so fragments can disagree about an id without us having
// to rewrite whole files. data/_aliases.json maps "wrong.id" -> "right.id".
// Loaded here because both reference resolution and stub synthesis consult it.
const aliases = {};
try {
  Object.assign(aliases, JSON.parse(await readFile(path.join(DATA, '_aliases.json'), 'utf8')));
} catch { /* no alias table */ }
const aliasHits = [];

/* Curated corrections: node id -> kind. Hand-reviewed, not pattern-matched --
 * see the file for why a regex was not good enough.
 *
 * `note` is the kind for commentary: an aside about the supply chain rather than
 * a thing in it. It is not an entity, and the components-only view routes
 * through it exactly as it routes through a process, so a note with real
 * children loses nothing and a bare note survives as a chip. This replaced an
 * earlier `editorial` boolean, which had the fatal flaw that hiding a container
 * hides its contents. */
let fixes = { kind: {}, note: [] };
try {
  const raw = JSON.parse(await readFile(path.join(DATA, '_fixes.json'), 'utf8'));
  fixes = {
    kind: Object.fromEntries(Object.entries(raw.kind ?? {}).filter(([k]) => !k.startsWith('_'))),
    note: [...(raw.note ?? []), ...(raw.editorial ?? [])].filter((k) => !k.startsWith('_')),
  };
} catch { /* no fixes table */ }

/* Ingredient synonyms: prose ingredient name -> node id, so that a recorded
 * `inputs` entry can become a real link instead of free text. */
let ingredients = {};
try {
  ingredients = JSON.parse(await readFile(path.join(DATA, '_ingredients.json'), 'utf8')).map ?? {};
} catch { /* no ingredient table */ }

for (const { file, doc } of docs) {
  // a document may be a bare node (the spine file), or a wrapper with
  // root / roots / nodes / shared.
  if (doc.id && doc.name && !doc.root && !doc.roots) define(doc, file, 'document');
  if (doc.root) define(doc.root, file, 'root');
  if (Array.isArray(doc.roots)) doc.roots.forEach((n, i) => define(n, file, `roots[${i}]`));
  if (doc.nodes && typeof doc.nodes === 'object') {
    for (const [id, n] of Object.entries(doc.nodes)) {
      define(n, file, `nodes.${id}`);
      published.add(n?.id ?? id);
    }
  }
  if (doc.shared && typeof doc.shared === 'object') {
    for (const [id, n] of Object.entries(doc.shared)) {
      // Some fragments use `shared` as a pointer registry: id -> one-line gloss,
      // advertising an id that other files may reference. If the real node turns
      // up elsewhere the gloss is redundant; if it does not, we still need the
      // reference to resolve, so we synthesise an honest stub.
      if (typeof n === 'string') pointers.push({ id, text: n, file });
      else { define(n, file, `shared.${id}`); published.add(n.id ?? id); }
    }
  }
}

/* ------------------------------------------- walk: index inline nodes
   Inline children are definitions too (they can be referenced by id), and
   string children are reference sites.                                       */

const visited = new Set();

function walk(node, file) {
  if (visited.has(node)) return;
  visited.add(node);
  const kids = node.children;
  if (kids === undefined) return;
  if (!Array.isArray(kids)) {
    err(`${node.id} (${file}): "children" must be an array, got ${typeof kids}`);
    return;
  }
  const out = [];
  for (const kid of kids) {
    if (typeof kid === 'string') {
      refSites.push({ id: kid, parent: node.id, file });
      out.push(kid); // resolved later, in place
    } else if (kid && typeof kid === 'object') {
      if (kid.id) {
        kid.__file = file;
        if (!defs.has(kid.id)) defs.set(kid.id, kid);
        if (!dupes.has(kid.id)) dupes.set(kid.id, []);
        dupes.get(kid.id).push(kid);
      }
      walk(kid, file);
      out.push(kid.id ?? kid);
    } else {
      err(`${node.id} (${file}): child is ${typeof kid}, must be object or id string`);
    }
  }
  node.children = out;
}

for (const [id, node] of [...defs]) walk(node, node.__file);

/* ------------------------------------- pick the richest duplicate definition
 * Two fragments defining the same id used to mean "first file wins", which
 * silently threw away a whole subtree if a placeholder happened to sort first.
 * Now the definition carrying the most content wins, and a collision is
 * reported loudly enough that it cannot be missed.
 *
 * This runs while children are still inline objects, so "how much content"
 * means a real deep count rather than a direct-children count.               */

const sizeCache = new WeakMap();
function sizeOf(node) {
  if (sizeCache.has(node)) return sizeCache.get(node);
  let n = 0;
  for (const c of node.children ?? []) n += typeof c === 'string' ? 1 : 1 + sizeOf(c);
  sizeCache.set(node, n);
  return n;
}

const collisions = [];
for (const [id, list] of dupes) {
  if (list.length < 2) continue;
  const sized = list.map((n) => ({ n, s: sizeOf(n) })).sort((a, b) => b.s - a.s);
  defs.set(id, sized[0].n);
  const lost = sized.slice(1).filter((x) => x.s > 0);
  const line = `${id}: ${list.length} definitions — keeping ${sized[0].s} nodes from ${sized[0].n.__file}` +
    (lost.length ? `, DISCARDING ${lost.map((x) => `${x.s} nodes from ${x.n.__file}`).join(' + ')}` : '');
  collisions.push(line);
  warn(line);
}

/* Now that the winners are settled, flatten inline children down to id lists. */
for (const node of new Set(defs.values())) {
  node.children = (node.children ?? [])
    .map((k) => (typeof k === 'string' ? k : k?.id))
    .filter(Boolean);
}

/* ---------------------------------------------- resolve pointer glosses
 * A `shared` entry that was a string is an advertisement for an id, not a
 * definition. If the real node exists elsewhere the gloss is redundant. If it
 * does not, we synthesise a stub so the cross-reference still resolves and
 * still shows the author gloss — and we shout about it, because a stub is a
 * hole in the tree, not a finished branch.                              */

const ACRONYMS = new Map(Object.entries({
  abs: 'ABS', pvc: 'PVC', cpu: 'CPU', rosin: 'Rosin', ptfe: 'PTFE',
  pcb: 'PCB', emc: 'EMC', sic: 'SiC', tft: 'TFT', hdmi: 'HDMI',
}));
const CATEGORY_HINT = [
  [/^chem\.(abs|pvc|rubber|polyester|epoxy|polystyrene|nylon|san|acrylic)/, 'plastics'],
  [/^chem\./, 'fluids'],
  [/^metal\./, 'metals'],
  [/^facility\.(power|steam|electricity|coal|oil|compressed-air)/, 'energy'],
  [/^facility\./, 'industry'],
  [/^logistics\./, 'logistics'],
];
function stubName(id) {
  const last = id.split('.').pop();
  return ACRONYMS.get(last) ?? last.replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
const stubCategory = (id) => CATEGORY_HINT.find(([re]) => re.test(id))?.[1] ?? 'computing';

const stubs = [];
for (const p of pointers) {
  if (defs.has(p.id)) continue;
  // A gloss whose id has an alias pointing at something real is not a hole.
  const target = aliases[p.id];
  if (target && defs.has(target)) {
    const label = `${p.id} → ${target}`;
    if (!aliasHits.includes(label)) aliasHits.push(label);
    continue;
  }
  const node = {
    id: p.id,
    name: stubName(p.id),
    description: p.text,
    kind: 'material',
    category: stubCategory(p.id),
    confidence: 'low',
    note: `Placeholder. ${p.file} published this id as a cross-reference target but did not write the subtree behind it. Everything that references "${p.id}" currently dead-ends here.`,
  };
  defs.set(p.id, node);
  published.add(p.id);
  stubs.push(`${p.id} (from ${p.file})`);
}

/* ------------------------------------------------------------- resolve */

for (const site of refSites) {
  if (defs.has(site.id)) continue;
  const target = aliases[site.id];
  if (!target || !defs.has(target)) continue;
  const p = defs.get(site.parent);
  if (!p) continue;
  const i = (p.children ?? []).indexOf(site.id);
  if (i < 0) continue;
  const was = site.id;
  p.children[i] = target;
  site.id = target; // keep the ref record in step, or it still looks dangling
  // Report the *wrong* id, not the rewritten one, or the log reads
  // "metal.silica.tcs -> metal.silica.tcs", which tells you nothing.
  const label = `${was} → ${target}`;
  if (!aliasHits.includes(label)) aliasHits.push(label);
}

/* -------------------------------------------------- retyped notes ------ */
const noteSet = new Set(fixes.note);
// Some flagged ids (the generated catalogue) may not exist yet at this point.
const notePending = new Set();
let kindFixed = 0;
for (const [id, kind] of Object.entries(fixes.kind)) {
  const n = defs.get(id);
  if (!n) { warn(`fixes: "${id}" is not a node in this tree, skipping kind fix`); continue; }
  if (n.kind !== kind) {
    warn(`fixes: ${id} retyped ${n.kind} -> ${kind}`);
    n.kind = kind;
    kindFixed++;
  }
}
for (const id of noteSet) {
  const n = defs.get(id);
  if (n) n.kind = 'note';
  else notePending.add(id);
}

/* ---------------------------------------------- dangling references */

const dangling = [];
for (const { id, parent, file } of refSites) {
  if (!defs.has(id)) dangling.push({ id, parent, file });
}
for (const { id, parent, file } of dangling) {
  const near = closest(id);
  err(`${file}: node "${parent}" references unknown id "${id}"${near ? ` — did you mean "${near}"?` : ''}`);
}

function closest(id) {
  let best = null;
  let bestScore = Infinity;
  for (const known of defs.keys()) {
    const s = dist(id, known);
    if (s < bestScore) { bestScore = s; best = known; }
  }
  return bestScore <= Math.max(3, id.length * 0.34) ? best : null;
}
function dist(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/* ---------------------------------------------- resolve `inputs` -> `from`
 * `children` means "contains / breaks down into". `from` means "is made of".
 * They are different relations and conflating them is what left the rainbow
 * badge listing "ABS bezel surface" as prose while a perfectly good ABS node
 * sat in the tree unlinked. Ingredients never become children: the ABS subtree
 * is ~80 nodes and a child edge per part would multiply it into thousands.
 */
/* Strip a parenthetical before normalising, so "Rosin flux (RMA)" answers to the
 * input string "rosin flux".
 *
 * The two scripts that reason about this normalisation disagreed, and the
 * disagreement hid real work. build.mjs used to reduce a parenthetical to spaces
 * and keep the words inside it, so "Hydrochloric acid (32-37%)" normalised to
 * "hydrochloric acid 32 37" and could never be reached by the input string
 * "hydrochloric acid". scripts/ingredients.mjs strips the parenthetical first, so
 * it believed such an input was resolved and never listed it. Net effect: 210
 * entity-like node names carry a parenthetical, and 59 `from` edges across 27
 * distinct input strings were unreachable and invisible to the one tool whose
 * job is to list unreachable ones. Making the two agree is the fix; adding 27
 * rows to data/_ingredients.json would have papered over it.
 *
 * Collisions are safe. If two names differ only inside a parenthetical they
 * normalise to the same key, the key goes into nameAmbiguous, and build refuses
 * to link it rather than picking one. A refusal is counted and reported; a
 * silent wrong link is not. */
const normKey = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '')
  .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

/* Name fallback, but only when it is unambiguous, and matched on the node's
 * NAME only.
 *
 * Two failures found during the QA pass, both from over-eager matching:
 *
 *  1. Ambiguity. With ~2,700 nodes, "chlorine" matches several. Picking the
 *     first is a coin flip that any unrelated edit can silently re-roll.
 *     Ambiguous names are left as prose and reported.
 *  2. The id-tail index (matching the last dotted segment of an id, so that
 *     "metal.copper.foil" answers to "foil") was far worse. It captured generic
 *     substance words tree-wide: a porcelain bushing's "quartz" resolved to
 *     silicon-furnace lump, and TV panel glass's "quartz sand" to
 *     semiconductor-grade sand. 38 wrong links across five fragments. Removed.
 *
 * A missing link is recoverable; a wrong one silently misleads. */
const nameIndex = new Map();       // normalised name -> id   (unique only)
const nameAmbiguous = new Map();  // normalised name -> [ids]
for (const [id, n] of defs) {
  if (!n.name || !ENTITY_LIKE.has(n.kind)) continue;
  const k = normKey(n.name);
  if (!k) continue;
  if (nameIndex.has(k)) nameAmbiguous.set(k, [nameIndex.get(k), id]);
  else nameIndex.set(k, id);
}
for (const k of nameAmbiguous.keys()) nameIndex.delete(k);

const ingredientStats = { exact: 0, byName: 0, byTable: 0, prose: 0, ambiguous: 0 };
const ingredientUnresolved = [];
const ambiguousLinks = [];
/* Precedence is id -> table -> name, and the middle step used to be last.
 *
 * data/_ingredients.json calls itself "the explicit, reviewable part", so a
 * reviewed row must be able to say something an automatic name match disagrees
 * with. Name-first meant it could not: widening the name index (see normKey
 * above) silently overrode nine rows, two of which were deliberate corrections
 * from the QA pass - "boric acid" and "kaolin", both of which had been pointed at
 * the wrong node on purpose. A silent override of a reviewed decision is the same
 * class of defect as a silent wrong link, so the table now wins.
 *
 * Reordering exposed three rows that were themselves sloppy, and those are fixed
 * in the table rather than reverted: "epichlorohydrin" pointed at the epoxy
 * PROCESS instead of the substance, "natural rubber" at the elastomer mixture
 * rather than the rubber, and "nitrogen" at atmospheric air. */
const tableShadowed = [];
for (const [id, n] of defs) {
  // Phase 0 (Wave 3 §5-62): a note has no supply edges. Skipping kind:note here
  // closes 6 of the 21 note leaks with one line; the 15 children-holders stay
  // manual Wave 4.2. Only 11/115 notes carry inputs at all.
  if (n.kind === 'note') { n.from = []; continue; }
  const from = new Set();
  for (const raw of n.inputs ?? []) {
    const s = String(raw).trim();
    if (!s) continue;
    if (defs.has(s)) { from.add(s); ingredientStats.exact++; continue; }
    const k = normKey(s);
    const t = ingredients[k];
    if (t && defs.has(t)) {
      from.add(t); ingredientStats.byTable++;
      if (!nameAmbiguous.has(k) && nameIndex.has(k) && nameIndex.get(k) !== t) {
        tableShadowed.push(`${k}\t${t}\t${nameIndex.get(k)}`);
      }
      continue;
    }
    if (nameAmbiguous.has(k)) {
      ingredientStats.ambiguous++;
      if (ambiguousLinks.length < 300) {
        ambiguousLinks.push(`${id}\t"${s}"\t${nameAmbiguous.get(k).join(' | ')}`);
      }
      continue;
    }
    if (nameIndex.has(k)) { from.add(nameIndex.get(k)); ingredientStats.byName++; continue; }
    ingredientStats.prose++;
    if (ingredientUnresolved.length < 400) ingredientUnresolved.push(`${id}\t${s}`);
  }
  from.delete(id);
  n.from = [...from];
}

/* ------------------------------------------------------------ validate */

for (const [id, node] of defs) {
  if (!node.name) err(`${id}: missing "name"`);
  if (!node.description) warn(`${id}: missing "description"`);
  else if (node.description.length < 30) warn(`${id}: "description" is very short (${node.description.length} chars)`);
  if (!node.kind) err(`${id}: missing "kind"`);
  else if (!VALID_KINDS.has(node.kind)) err(`${id}: kind "${node.kind}" not in [${[...VALID_KINDS]}]`);
  if (!node.category) err(`${id}: missing "category"`);
  else if (!VALID_CATEGORIES.has(node.category)) err(`${id}: category "${node.category}" not in [${[...VALID_CATEGORIES]}]`);
  if (node.confidence && !['high', 'medium', 'low'].includes(node.confidence)) {
    err(`${id}: confidence "${node.confidence}" must be high|medium|low`);
  }
  if (node.inputs !== undefined && !Array.isArray(node.inputs)) err(`${id}: "inputs" must be an array`);
  if (node.from !== undefined && !Array.isArray(node.from)) err(`${id}: "from" must be an array`);
  else for (const f of node.from ?? []) if (!defs.has(f)) err(`${id}: "from" references unknown id "${f}"`);
  if (node.facts !== undefined && !Array.isArray(node.facts)) err(`${id}: "facts" must be an array`);
  if (node.sources !== undefined && !Array.isArray(node.sources)) err(`${id}: "sources" must be an array`);
}

/* -------------------------------------------------------- cycle detect */

const childIds = (id) => (defs.get(id)?.children ?? []).filter((c) => defs.has(c));
const state = new Map(); // 0 unvisited 1 on stack 2 done
const cycles = [];
(function dfs(id, stack) {
  const s = state.get(id) ?? 0;
  if (s === 1) {
    cycles.push([...stack.slice(stack.indexOf(id)), id]);
    return;
  }
  if (s === 2) return;
  state.set(id, 1);
  stack.push(id);
  for (const c of childIds(id)) dfs(c, stack);
  stack.pop();
  state.set(id, 2);
})('c64', []);
for (const cyc of cycles) warn(`cycle in tree: ${cyc.join(' -> ')} (breaking it)`);
for (const cyc of cycles) {
  const parent = cyc[cyc.length - 2];
  const node = defs.get(parent);
  if (node) node.children = node.children.filter((c) => c !== cyc[cyc.length - 1]);
}

/* -------------------------------------------------- unreached from c64 */

function reachable(start) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const c of childIds(id)) stack.push(c);
    // Phase 0 (Wave 3 §5-76): walk `from` as well as `children`.
    // `from` is derived from `inputs` above, so a published node referenced only
    // via inputs (chem.glass-fiber 18 inbound, chem.silane 14) is linked, not
    // unlinked. Walking children only mis-catalogued both.
    for (const f of defs.get(id)?.from ?? []) if (defs.has(f)) stack.push(f);
  }
  return seen;
}

const rootId = defs.has('c64') ? 'c64' : defs.keys().next().value;
let seen = reachable(rootId);

/* --------------------------------------------------- unlinked nodes
 * Two different mistakes hide under "not reachable", and they deserve
 * different treatment:
 *
 *  - a fragment published a canonical node in its `nodes`/`shared` map for other
 *    fragments to reference, but nothing ended up referencing it. That is not a
 *    bug, just an unlinked entry in a catalogue — adopt it so the content is
 *    visible instead of silently dropped.
 *  - a fragment defined a node inline and never linked it into its own tree.
 *    That is a genuine authoring error and stays a warning.               */

function majorityCategory(ids) {
  const tally = new Map();
  for (const id of ids) {
    const c = defs.get(id)?.category ?? 'computing';
    tally.set(c, (tally.get(c) ?? 0) + 1);
  }
  return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'computing';
}

let adopted = null;
const strays = [];
for (const id of [...defs.keys()]) {
  if (seen.has(id)) continue;
  if (!published.has(id)) { strays.push(id); continue; }
  (adopted ??= []).push(id);
}
if (adopted?.length) {
  adopted.sort();
  const node = {
    id: 'unlinked.catalogue',
    name: 'Published but unlinked materials',
    description: `These ${adopted.length} nodes were written as canonical, reusable subtrees — a fragment's "made from" chains in full detail — but no other branch ended up referencing them, so nothing linked them into the tree. They are collected here rather than deleted. Where a component subtree inlines its own shorter version of the same material chain, this is the long one.`,
    kind: 'facility',
    category: majorityCategory(adopted),
    era: '1980s',
    confidence: 'medium',
    note: 'Generated by scripts/build.mjs. Nothing in children points here; from-links may still reference these nodes (reachability walks both).',
    children: adopted,
  };
  defs.set(node.id, node);
  
  const host = defs.has('c64.bottoms-out') ? defs.get('c64.bottoms-out') : defs.get(rootId);
  host.children = [...(host.children ?? []), node.id];
  seen = reachable(rootId);
}
for (const id of notePending) {
  if (defs.has(id)) { defs.get(id).kind = 'note'; notePending.delete(id); }
  else warn(`fixes: note id "${id}" matched no node`);
}
const orphans = [...defs.keys()].filter((id) => !seen.has(id));
// Only report what is still unreachable after adoption: adopting a parent can
// make its descendants reachable, and warning about them would be noise.
for (const id of orphans) warn(`"${id}" (${defs.get(id).__file ?? 'generated'}) is defined but never linked into the tree`);

/* ------------------------------------------------------------- stats */

// memoized longest-path depth. Safe now that cycles have been broken, and
// necessary because shared subtrees (copper, ABS, aluminium) are reached many
// times over -- naive recursion would be exponential.
const depthOf = new Map();
let maxDepth = 0;
function depth(id) {
  const cached = depthOf.get(id);
  if (cached !== undefined) return cached;
  let best = 0;
  for (const c of childIds(id)) best = Math.max(best, depth(c) + 1);
  depthOf.set(id, best);
  if (best > maxDepth) maxDepth = best;
  return best;
}
depth(rootId);

// reconstruct one deepest path for the report
const deepestPath = [];
(() => {
  let cur = rootId;
  deepestPath.push(cur);
  for (;;) {
    let next = null;
    let deepest = -1;
    for (const c of childIds(cur)) {
      if (depth(c) > deepest) { deepest = depth(c); next = c; }
    }
    if (!next) break;
    deepestPath.push(next);
    cur = next;
  }
})();
const depthOfNode = (id) => depth(id);

const byKind = {};
const byCategory = {};
const byEra = {};
const leafCount = [...seen].filter((id) => childIds(id).length === 0).length;
const descChars = [...seen].reduce((n, id) => n + (defs.get(id).description?.length ?? 0), 0);
for (const id of seen) {
  const n = defs.get(id);
  byKind[n.kind ?? '?'] = (byKind[n.kind ?? '?'] ?? 0) + 1;
  byCategory[n.category ?? '?'] = (byCategory[n.category ?? '?'] ?? 0) + 1;
  const e = n.era ?? 'unspecified';
  byEra[e] = (byEra[e] ?? 0) + 1;
}

/* ------------------------------------------------------------ outputs */

function strip(node) {
  const o = { id: node.id, file: node.__file };
  for (const k of ['name', 'description', 'kind', 'category', 'era', 'confidence', 'note']) {
    if (node[k] !== undefined) o[k] = node[k];
  }
    for (const k of ['inputs', 'facts', 'places', 'sources']) {
    if (Array.isArray(node[k]) && node[k].length) o[k] = node[k];
  }
  if (Array.isArray(node.from) && node.from.length) o.from = node.from;
  /* Typed edges. `children` and `from` are the two UNTYPED relations this
   * migration is replacing, and while it runs a node may carry either or both.
   * A node is migrated when it has no `children` and no `from`.
   *
   * This is what makes an agent's write permission mean anything: an untyped
   * array cannot record that an edge is `consumes` rather than `made of`, so a
   * broadly-permitted agent editing only `children`/`from` has no way to state
   * its decision. Once edges are typed, every rule in the schema becomes an
   * exact assertion on data instead of an inference through a classifier.
   *
   * STORED_RELATIONS duplicates data/_relation_schema.json `relations`, filtered
   * to the stored ones. `made by` is deliberately absent: it is DERIVED from
   * `produces` and is never stored, so naming it here is an error, not a
   * no-op. build.mjs does not read the schema, so this list must be kept in step
   * with it by hand -- `relate.mjs audit` fails if the two disagree. */
  if (node.edges !== undefined && node.edges !== null) {
    const eid = node.id;
    if (!Array.isArray(node.edges)) {
      err(`${eid}: "edges" must be an array, got ${typeof node.edges} (${JSON.stringify(node.edges).slice(0, 60)})`);
    } else if (node.edges.length) {
      o.edges = node.edges.map((e) => {
        if (!e || typeof e.to !== 'string') err(`${eid}: an edges entry has no "to" string`);
        if (typeof e.rel !== 'string') err(`${eid}: edge to ${e?.to} has no "rel" string`);
        if (!STORED_RELATIONS.has(e.rel)) {
          err(`${eid}: edge to ${e.to} uses relation "${e.rel}", which is not one of the ${STORED_RELATIONS.size} stored relations`);
        }
        const out = { to: e.to, rel: e.rel };
        if (e.step !== undefined) out.step = e.step;
        return out;
      });
    }
  }
  o.children = node.children ?? [];
  return o;
}

const flat = {};
for (const id of seen) flat[id] = strip(defs.get(id));

const meta = {
  generated: new Date().toISOString(),
  root: rootId,
  nodes: seen.size,
  maxDepth,
  leaves: leafCount,
  deepestPath,
  byKind,
  byCategory,
  byEra,
  sources: files,
  descriptionsChars: descChars,
};
meta.avgChildren = +((seen.size - leafCount) / seen.size).toFixed(2);

await writeFile(path.join(PUBLIC, 'tree.json'), JSON.stringify({ meta, nodes: flat }));
await writeFile(path.join(PUBLIC, 'tree.meta.json'), JSON.stringify(meta, null, 2));

/* graphviz */
const esc = (s) => String(s).replace(/[\\{}<>|"]/g, (c) => '\\' + c).replace(/\n/g, ' ');
const CAT_COLOR = {
  silicon: '#7aa2f7', passives: '#9ece6a', board: '#e0af68', plastics: '#bb9af7',
  metals: '#f7768e', magnetics: '#ff9e64', interconnect: '#7dcfff', power: '#ff007c',
  assembly: '#73daca', optics: '#c0caf5', fluids: '#2ac3de', energy: '#e0af68',
  packaging: '#a9b1d6', logistics: '#9aa5ce', computing: '#ff007c',
  peripherals: '#ff007c', industry: '#565f89',
};
const dot = [
  'digraph c64 {',
  '  rankdir=LR;',
  '  splines=ortho;',
  '  node [shape=box style="rounded,filled" fontname="Helvetica" fontsize=9 penwidth=0.6];',
  '  edge [color="#333644" arrowsize=0.5 penwidth=0.5];',
  ...[...seen].map((id) => {
    const n = defs.get(id);
    const fill = CAT_COLOR[n.category] ?? '#565f89';
    return `  "${id}" [label="${esc(n.name)}" fillcolor="${fill}22" color="${fill}" tooltip="${esc((n.description ?? '').slice(0, 300))}"];`;
  }),
  ...[...seen].flatMap((id) => childIds(id).map((c) => `  "${id}" -> "${c}";`)),
  '}',
];
await writeFile(path.join(PUBLIC, 'tree.dot'), dot.join('\n'));

/* mermaid (top 3 levels only — deeper explodes mermaid) */
const mmd = ['mindmap', '  root((C64))'];
(function mm(id, d) {
  if (d > 3) return;
  for (const c of childIds(id)) {
    const n = defs.get(c);
    mmd.push(`${'  '.repeat(d + 1)}${n.name.replace(/[()\[\]{}]/g, '')}`);
    mm(c, d + 1);
  }
})(rootId, 1);
await writeFile(path.join(PUBLIC, 'tree.mmd'), mmd.join('\n'));

/* markdown outline — DFS pre-order, so a parent always precedes its children */
const md = [
  `# Production tree — Commodore 64`,
  ``,
  `${seen.size} nodes, max depth ${maxDepth}, ${leafCount} leaves.`,
  `Generated ${meta.generated} by \`scripts/build.mjs\`. Do not edit by hand.`,
  ``,
];
{
  const emitted = new Set();
  (function outline(id, d) {
    if (emitted.has(id)) {
      md.push(`${'  '.repeat(d)}- *${defs.get(id).name}* \`${id}\` *(seen above)*`);
      return;
    }
    emitted.add(id);
    const n = defs.get(id);
    const conf = n.confidence && n.confidence !== 'high' ? ` _(${n.confidence})_` : '';
    md.push(`${'#'.repeat(Math.min(6, d + 1))} ${n.name} \`${id}\`${conf}`);
    if (n.description) md.push('', n.description.replace(/\n/g, ' '), '');
    for (const c of childIds(id)) outline(c, d + 1);
  })(rootId, 0);
}
await writeFile(path.join(DOCS, 'TREE.md'), md.join('\n'));

/* ------------------------------------------------------------- report */

console.log(`\n  sources   ${files.length} files`);
console.log(`  nodes     ${seen.size}  (${leafCount} leaves, ${orphans.length} unreachable)`);
console.log(`  depth     ${maxDepth}`);
console.log(`  deepest   ${deepestPath.map((i) => defs.get(i)?.name ?? i).join('  ->  ')}`);
console.log(`  bytes     tree.json ${(JSON.stringify(flat).length / 1e6).toFixed(2)} MB`);
console.log('\n  categories');
for (const [k, v] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(13)} ${String(v).padStart(5)}`);
}
console.log('\n  kinds');
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(13)} ${String(v).padStart(5)}`);
}

if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 40)) console.log(`    ! ${w}`);
  if (warnings.length > 40) console.log(`    ... ${warnings.length - 40} more`);
}
if (aliasHits.length) {
  console.log(`\n  ${aliasHits.length} alias rewrite(s) from data/_aliases.json:`);
  for (const a of aliasHits.slice(0, 30)) console.log(`    ~ ${a}`);
  if (aliasHits.length > 30) console.log(`    ... ${aliasHits.length - 30} more`);
}
if (collisions.length) {
  console.log(`\n  ${collisions.length} DUPLICATE ID COLLISION(S) — content was thrown away:`);
  for (const c of collisions) console.log(`    X ${c}`);
}
{
  const tot = ingredientStats.exact + ingredientStats.byName + ingredientStats.byTable
    + ingredientStats.prose + ingredientStats.ambiguous;
  const linked = tot - ingredientStats.prose - ingredientStats.ambiguous;
  console.log(`\n  ingredients resolved into real "from" links: ${linked}/${tot}` +
    `  (${((linked / tot) * 100).toFixed(1)}%)`);
  console.log(`    exact id ${ingredientStats.exact} · by unique name ${ingredientStats.byName} · via _ingredients.json ${ingredientStats.byTable}`);
  console.log(`    refused: ${ingredientStats.ambiguous} ambiguous name(s), ${ingredientStats.prose} unresolved`);
  /* A row in data/_ingredients.json whose key also normalises to some node's
     name, where the two disagree. The table wins, so this row is a deliberate
     override of an automatic match -- which is allowed, but only on purpose, so
     it is reported rather than left for someone to trip over. */
  if (tableShadowed.length) {
    const uniq = [...new Set(tableShadowed)];
    console.log(`    ${uniq.length} _ingredients.json row(s) override a node name (the table wins):`);
    for (const row of uniq.slice(0, 20)) console.log(`      ${row.replace(/\t/g, '  ->  ')}`);
    if (uniq.length > 20) console.log(`      ... and ${uniq.length - 20} more`);
  }
  console.log(`  nodes given a "from" edge: ${[...defs.values()].filter((n) => n.from?.length).length}`);
}
if (kindFixed) console.log(`\n  ${kindFixed} node(s) retyped by data/_fixes.json`);
{
  const notes = [...defs.values()].filter((n) => n.kind === 'note');
  if (notes.length) {
    console.log(`  ${notes.length} node(s) are kind "note" (commentary: not an entity, routed through by the components-only view)`);
  }
}
if (stubs.length) {
  console.log(`\n  ${stubs.length} PLACEHOLDER STUB(S) — advertised ids with no subtree written:`);
  for (const s of stubs) console.log(`    ? ${s}`);
}
if (errors.length) {
  console.log(`\n  ${errors.length} ERROR(s):`);
  for (const e of errors.slice(0, 60)) console.log(`    x ${e}`);
  if (errors.length > 60) console.log(`    ... ${errors.length - 60} more`);
  console.log('');
  process.exit(2);
}
console.log('\n  ok\n');