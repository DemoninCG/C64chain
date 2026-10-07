/* Commodore 64 production process tree — viewer.
 * No dependencies. Consumes the flat node map emitted by scripts/build.mjs.
 *
 * Two views of the same data:
 *   flow    stratified supply flow. Every unique node is drawn ONCE, in a
 *           column (tier) by BFS depth from the C64: raw materials left, the
 *           finished machine right. Edges are supply links (children + typed
 *           contains/made of/made from/step/consumes + from + made_by).
 *           The most-reused inputs (electricity, water, coke, ...) are lifted
 *           onto a utility rail so they stop covering the flow in crossings.
 *   outline indented prose outline (refinement edges only).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------------ state */

const N = {};                 // id -> node
const parents = {};           // id -> [parent ids] (refinement children only)
let META = {};
let ROOT = 'c64';
let haystack = new Map();     // id -> lowercased searchable text

const collapsed = new Set();
let selected = null;
let view = 'flow';
let depthLimit = 3;
let query = '';
let matches = new Set();      // ids matching query
let pathIds = new Set();      // matches + all their ancestors
let forceOpen = new Set();    // ancestors of the selected node, always expanded
let catOff = new Set();
let kindOff = new Set();
let confOff = new Set();
let scopeOff = new Set();     // chain/context/alternate toggles (default all on)
let dimUnrelated = false;
let markShared = true;
let groupFlow = true;         // continent (category x tier cells) vs all nodes
let expandedCells = new Set(); // band keys (`${tier}|${category}`) opened in place
let hubRailOn = true;         // lift top hubs onto a utility rail
let flowLabels = false;       // label every dot in all-nodes mode
let vis = [];                 // outline rows, pre-order
let byKey = new Map();        // outline instance key -> instance
let layoutByKey = new Map();  // outline instance key -> {x, y}
let flowPos = new Map();      // node id -> {x, y} in SVG user units
let flowCellOf = new Map();   // node id -> cell key (grouped mode)
let flowCellPos = new Map();  // cell key -> {x, y}
let flowBounds = { w: 1, h: 1 };
let cam = { x: 0, y: 0, k: 1 };

const ROW = 26;
const BOXH = 21;
const CHARW = 6.35;           // px per char at 12px system font
const SUBW = 5.6;

/* Flow geometry. Columns run raw (left) -> C64 (right). */
const F_COLW_ALL = 120;       // px per tier, all-nodes mode
const F_PITCH_ALL = 16;       // px per node within a tier
const F_COLW_GRP = 210;       // px per tier, grouped mode
const F_CELLH = 56;           // px per category cell within a tier
const F_RAILH = 84;           // reserved height for the hub rail
const F_PAD = 40;
const HUB_N = 8;              // hubs lifted to the rail
const HUB_MIN_INDEG = 6;

const CAT_COLOR = {
  silicon: '#7aa2f7', passives: '#9ece6a', board: '#e0af68', plastics: '#bb9af7',
  metals: '#f7768e', magnetics: '#ff9e64', interconnect: '#7dcfff', power: '#ff007c',
  assembly: '#73daca', optics: '#c0caf5', fluids: '#2ac3de', energy: '#e0af68',
  packaging: '#a9b1d6', logistics: '#9aa5ce', computing: '#ff007c',
  peripherals: '#ff007c', industry: '#565f89',
};
const colorOf = (c) => CAT_COLOR[c] ?? '#565f89';

const KIND_LABEL = {
  part: 'part', process: 'process', material: 'material',
  facility: 'facility', tool: 'tool',
};

const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, kids = []) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) e.setAttribute(k, v);
  for (const c of [].concat(kids)) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------------ boot */

const res = await fetch('/tree.json');
if (!res.ok) {
  document.body.innerHTML = '<p style="padding:40px;font:14px system-ui">tree.json not found — run <code>npm run build</code> first.</p>';
  throw new Error('no tree');
}
const payload = await res.json();
Object.assign(N, payload.nodes);
META = payload.meta;
ROOT = META.root ?? 'c64';

for (const [id, n] of Object.entries(N)) {
  const ps = parents[id] ?? (parents[id] = []);
  for (const c of n.children) if (N[c]) (parents[c] ??= []).push(id);
}

for (const [id, n] of Object.entries(N)) {
  haystack.set(id, `${n.name} ${n.id} ${n.description ?? ''} ${(n.inputs ?? []).join(' ')} ${n.kind} ${n.category} ${n.scope ?? 'chain'}`.toLowerCase());
}

// NB: no rendering happens here. Everything below this point is declarations,
// and the views are only painted at the very bottom of the file, so that no
// `const` helper can be in its temporal dead zone when boot runs.

/* ------------------------------------------------------------------ chrome */

function buildStats() {
  const s = [
    [META.nodes, 'nodes'],
    [META.maxDepth, 'levels deep'],
    [META.leaves, 'end points'],
    [Object.keys(META.byCategory ?? {}).length, 'industries'],
    [META.sources?.length ?? 0, 'data files'],
  ];
  $('#stats').innerHTML = s
    .map(([v, l]) => `<div class="stat"><b>${Number(v).toLocaleString()}</b><span>${l}</span></div>`)
    .join('');
}

function buildLegend() {
  const by = META.byCategory ?? {};
  const keys = Object.keys(by).sort((a, b) => by[b] - by[a]);
  $('#legend').innerHTML = keys
    .map((k) => `<div class="l" data-cat="${k}" title="toggle ${k}">
        <i class="sw" style="background:${colorOf(k)}"></i>${k}<span class="n">${by[k]}</span></div>`)
    .join('');
  $('#legend').onclick = (e) => {
    const l = e.target.closest('.l');
    if (!l) return;
    const c = l.dataset.cat;
    catOff.has(c) ? catOff.delete(c) : catOff.add(c);
    l.classList.toggle('off', catOff.has(c));
    render();
  };
}

function buildKindChips() {
  const by = META.byKind ?? {};
  const keys = Object.keys(by).sort((a, b) => by[b] - by[a]);
  $('#kindFilter').innerHTML = keys
    .map((k) => `<span class="c" data-kind="${k}" title="toggle">${KIND_LABEL[k] ?? k} <b>${by[k]}</b></span>`)
    .join('');
  $('#kindFilter').onclick = (e) => {
    const c = e.target.closest('.c');
    if (!c) return;
    const k = c.dataset.kind;
    kindOff.has(k) ? kindOff.delete(k) : kindOff.add(k);
    c.classList.toggle('off', kindOff.has(k));
    render();
  };
}

function buildConfChips() {
  const by = META.byEra ? {} : {};
  for (const n of Object.values(N)) by[n.confidence ?? 'unspecified'] = (by[n.confidence ?? 'unspecified'] ?? 0) + 1;
  const keys = Object.keys(by).sort();
  $('#confFilter').innerHTML = keys
    .map((k) => `<span class="c" data-conf="${k}" title="toggle">${k} <b>${by[k]}</b></span>`)
    .join('');
  $('#confFilter').onclick = (e) => {
    const c = e.target.closest('.c');
    if (!c) return;
    const k = c.dataset.conf;
    confOff.has(k) ? confOff.delete(k) : confOff.add(k);
    c.classList.toggle('off', confOff.has(k));
    render();
  };
}

function buildScopeChips() {
  const by = {};
  for (const n of Object.values(N)) by[n.scope ?? 'chain'] = (by[n.scope ?? 'chain'] ?? 0) + 1;
  const keys = Object.keys(by).sort();
  $('#scopeFilter').innerHTML = keys
    .map((k) => `<span class="c" data-scope="${k}" title="toggle">${k} <b>${by[k]}</b></span>`)
    .join('');
  $('#scopeFilter').onclick = (e) => {
    const c = e.target.closest('.c');
    if (!c) return;
    const k = c.dataset.scope;
    scopeOff.has(k) ? scopeOff.delete(k) : scopeOff.add(k);
    c.classList.toggle('off', scopeOff.has(k));
    render();
  };
}

/* -------------------------------------------------------------- filtering */

// Refinement edges for the outline (legacy children + typed contains/made of).
const REFT = new Set(['contains', 'made of']);
const kidsOf = (n) => {
  const out = (n.children ?? []).map((c) => N[c]).filter(Boolean);
  for (const e of n.edges ?? []) {
    if (e && REFT.has(e.rel) && N[e.to] && !out.some((k) => k.id === e.to)) out.push(N[e.to]);
  }
  return out;
};

// Supply edges for the flow: everything the node depends on. Children are the
// refinement backbone; typed edges + from + made_by are the supply line.
const SUPPLY_RELS = new Set(['contains', 'made of', 'made from', 'step', 'consumes']);
function flowSuccIds(id) {
  const n = N[id];
  if (!n) return [];
  const out = new Set();
  for (const c of n.children ?? []) if (N[c]) out.add(c);
  for (const e of n.edges ?? []) if (e && e.to && SUPPLY_RELS.has(e.rel) && N[e.to]) out.add(e.to);
  for (const f of n.from ?? []) if (N[f]) out.add(f);
  // made_by is derived from produces and points at the producer process: the
  // node cannot exist without it, so it is a supply edge too.
  for (const p of n.made_by ?? []) if (N[p]) out.add(p);
  out.delete(id);
  return [...out];
}

const ENTITY = new Set(['part', 'material']);
let projection = 'full';      // 'full' | 'entities' — applies to the outline only
let showChips = true;
let showEditorial = false;

const passes = (n) => {
  if (catOff.has(n.category)) return false;
  if (kindOff.has(n.kind)) return false;
  if (confOff.has(n.confidence ?? 'unspecified')) return false;
  if (scopeOff.has(n.scope ?? 'chain')) return false;
  return true;
};
const shown = (n, filtering) => {
  if (!n || !passes(n)) return false;
  if (n.editorial && !showEditorial && !filtering) return false;
  return true;
};

/* The filtered supply graph: adjacency restricted to shown nodes. */
function flowGraph() {
  const filtering = query && pathIds.size > 0;
  const ids = Object.values(N).filter((n) => shown(n, filtering)).map((n) => n.id);
  const keep = new Set(ids);
  const succ = new Map();
  const par = new Map();
  for (const id of ids) { succ.set(id, []); par.set(id, []); }
  for (const id of ids) {
    for (const s of flowSuccIds(id)) {
      if (!keep.has(s)) continue;
      succ.get(id).push(s);
      par.get(s).push(id);
    }
  }
  return { ids, succ, par };
}

/* BFS tiers from the root over the filtered supply graph. Shortest-path (not
 * longest-path): the graph has genuine industrial cycles (energy/material
 * loops), on which longest-path relaxation diverges to thousands of phantom
 * tiers. BFS is bounded, balanced and deterministic. Cycle edges simply draw
 * as dashed returns. Unreachable nodes are omitted, same as the outline. */
function flowTiers(succ) {
  const depth = new Map();
  if (!succ.has(ROOT)) return { depth, maxD: 0 };
  depth.set(ROOT, 0);
  const q = [ROOT];
  while (q.length) {
    const id = q.shift();
    for (const s of succ.get(id)) {
      if (!depth.has(s)) { depth.set(s, depth.get(id) + 1); q.push(s); }
    }
  }
  let maxD = 0;
  for (const d of depth.values()) maxD = Math.max(maxD, d);
  return { depth, maxD };
}

function flowIndeg(par) {
  const m = new Map();
  for (const [id, ps] of par) m.set(id, ps.length);
  return m;
}

/* Order nodes within each tier to cut crossings: barycentric sweeps against
 * the previous tier (dependents), then the next (dependencies), with id
 * tiebreaks so the result is deterministic. */
function orderTiers(layers, par, succ, order) {
  const posOf = (m, id) => m.get(id) ?? -1;
  for (let sweep = 0; sweep < 3; sweep++) {
    for (let L = 1; L < layers.length; L++) {
      const prev = order;
      const arr = layers[L].slice().sort((a, b) => {
        const pa = par.get(a).filter((p) => posOf(prev, p) >= 0);
        const pb = par.get(b).filter((p) => posOf(prev, p) >= 0);
        const ma = pa.length ? pa.reduce((s, p) => s + posOf(prev, p), 0) / pa.length : 1e9;
        const mb = pb.length ? pb.reduce((s, p) => s + posOf(prev, p), 0) / pb.length : 1e9;
        return ma - mb || (a < b ? -1 : 1);
      });
      layers[L] = arr;
      arr.forEach((id, i) => order.set(id, i + L * 1e6));
    }
    for (let L = layers.length - 2; L >= 0; L--) {
      const prev = order;
      const arr = layers[L].slice().sort((a, b) => {
        const sa = succ.get(a).filter((s) => posOf(prev, s) >= 0);
        const sb = succ.get(b).filter((s) => posOf(prev, s) >= 0);
        const ma = sa.length ? sa.reduce((s, p) => s + posOf(prev, p), 0) / sa.length : 1e9;
        const mb = sb.length ? sb.reduce((s, p) => s + posOf(prev, p), 0) / sb.length : 1e9;
        return ma - mb || (a < b ? -1 : 1);
      });
      layers[L] = arr;
      arr.forEach((id, i) => order.set(id, i + L * 1e6));
    }
  }
}

/* Upstream + downstream closure of one node (cycle-safe via visited sets).
 * Returns {nodes:Set, edges:Set<"a>b">}. */
function lineageOf(id, succ, par) {
  const nodes = new Set([id]);
  const edges = new Set();
  const up = [id];
  while (up.length) {
    const cur = up.pop();
    for (const s of succ.get(cur) ?? []) {
      edges.add(`${cur}>${s}`);
      if (!nodes.has(s)) { nodes.add(s); up.push(s); }
    }
  }
  const dn = [id];
  const seenDn = new Set([id]);
  while (dn.length) {
    const cur = dn.pop();
    for (const p of par.get(cur) ?? []) {
      edges.add(`${p}>${cur}`);
      nodes.add(p);
      if (!seenDn.has(p)) { seenDn.add(p); dn.push(p); }
    }
  }
  return { nodes, edges };
}

/* Does anything below this node survive the projection? (outline only) */
const hasEntityMemo = new Map();
function hasEntityBelow(id) {
  if (hasEntityMemo.has(id)) return hasEntityMemo.get(id);
  const n = N[id];
  if (!n) return false;
  let found = false;
  for (const k of kidsOf(n)) {
    if (ENTITY.has(k.kind) || hasEntityBelow(k.id)) { found = true; break; }
  }
  hasEntityMemo.set(id, found);
  return found;
}

function buildVisible() {
  vis = [];
  let uid = 0;
  const filtering = query && pathIds.size > 0;
  const projecting = projection === 'entities';
  if (projecting) hasEntityMemo.clear();

  function mk(n, depth, pkey, chip) {
    return {
      id: n.id, n, depth, uid: uid++, pid: pkey, key: `${pkey}/${n.id}`,
      kids: [], expandable: false, open: false, chip: !!chip,
      shared: (parents[n.id]?.length ?? 0) > 1,
    };
  }

  function visit(n, depth, pkey) {
    if (!passes(n)) return null;
    if (n.editorial && !showEditorial && !filtering) return null;
    if (projecting && !ENTITY.has(n.kind)) return null;
    if (filtering && !pathIds.has(n.id)) return null;
    const kids = kidsOf(n);
    const inst = mk(n, depth, pkey);
    const forced = filtering || forceOpen.has(n.id);
    const open = kids.length > 0 && (forced || (!collapsed.has(n.id) && depth < depthLimit));
    inst.open = open;
    vis.push(inst);
    if (open) inst.kids = kids.map((k) => visit(k, depth + 1, inst.key)).filter(Boolean);
    if (!inst.kids.length) inst.open = false;
    return inst;
  }

  function chip(n, depth, pkey) {
    const inst = mk(n, depth, pkey, true);
    vis.push(inst);
    return inst;
  }

  function promote(n, depth, pkey) {
    const out = [];
    if (filtering && pathIds.has(n.id)) out.push(chip(n, depth, pkey));
    for (const k of kidsOf(n)) {
      if (!passes(k)) continue;
      if (k.editorial && !showEditorial && !filtering) continue;
      if (ENTITY.has(k.kind)) {
        const e = projectEntity(k, depth, pkey);
        if (e) out.push(e);
      } else out.push(...promote(k, depth, pkey));
    }
    return out;
  }

  function projectEntity(n, depth, pkey) {
    if (filtering && !pathIds.has(n.id)) return null;
    const kids = kidsOf(n);
    const inst = mk(n, depth, pkey);
    const forced = filtering || forceOpen.has(n.id);
    const open = kids.length > 0 && (forced || (!collapsed.has(n.id) && depth < depthLimit));
    inst.open = open;
    vis.push(inst);

    const out = [];
    for (const k of kids) {
      if (!passes(k)) continue;
      if (k.editorial && !showEditorial && !filtering) continue;
      if (ENTITY.has(k.kind)) {
        const e = projectEntity(k, depth + 1, inst.key);
        if (e) out.push(e);
      } else {
        const lifted = promote(k, depth + 1, inst.key);
        if (lifted.length) out.push(...lifted);
        else if (showChips && !(k.editorial && !showEditorial)) out.push(chip(k, depth + 1, inst.key));
      }
    }
    inst.kids = out;
    inst.expandable = kids.length > 0;
    if (!inst.kids.length) inst.open = false;
    return inst;
  }

  if (projecting) {
    const rootInst = projectEntity(N[ROOT], 0, '');
    if (!rootInst) vis = [];
  } else visit(N[ROOT], 0, '');
  byKey = new Map(vis.map((v) => [v.key, v]));
  return vis;
}

/* ----------------------------------------------------------------- render */

function render() {
  const depthSlider = $('#depthSlider');
  depthSlider.max = Math.max(4, META.maxDepth);
  $('#depthOut').textContent = depthLimit;

  if (view === 'outline') {
    buildVisible();
    const leaves = vis.filter((v) => !v.open).length;
    const distinct = new Set(vis.map((v) => v.id)).size;
    $('#status').innerHTML =
      `showing <b>${vis.length.toLocaleString()}</b> rows · <b>${distinct.toLocaleString()}</b> unique` +
      (distinct < META.nodes ? ` of ${META.nodes.toLocaleString()}` : '') +
      ` · ${leaves.toLocaleString()} end points · selected <b>${esc(selected ?? '—')}</b>`;
    renderOutline();
  } else {
    renderFlow();
  }
  syncChrome();
}

function syncChrome() {
  const outline = view === 'outline';
  $('#depthSlider').disabled = !outline;
  $('#fitAll').disabled = outline;
}

/* --------------------------------------------------------------- flow view */

function catRank(counts) {
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
}

function renderFlow() {
  const svg = $('#canvas');
  svg.replaceChildren();
  $('#outline').hidden = true;
  svg.hidden = false;

  const { ids, succ, par } = flowGraph();
  flowPos = new Map();
  flowCellOf = new Map();
  flowCellPos = new Map();

  if (!succ.has(ROOT)) {
    $('#status').innerHTML = 'flow · nothing passes the current filters';
    flowBounds = { w: 600, h: 200 };
    const g = el('g', { id: 'g', transform: `translate(${cam.x} ${cam.y}) scale(${cam.k})` });
    const t = el('text', { x: 40, y: 60, class: 'fempty' });
    t.textContent = 'Nothing passes the current filters — loosen a category or kind toggle.';
    g.appendChild(t);
    svg.appendChild(g);
    svg.dataset.w = 600;
    svg.dataset.h = 200;
    applyTransform();
    buildHubs(new Map());
    return;
  }

  const { depth, maxD } = flowTiers(succ);
  const indeg = flowIndeg(par);
  const placed = ids.filter((id) => depth.has(id));

  // Hubs: most-consumed inputs. Lifted to the rail when enabled.
  const hubs = hubRailOn
    ? placed.filter((id) => id !== ROOT && (indeg.get(id) ?? 0) >= HUB_MIN_INDEG)
      .sort((a, b) => (indeg.get(b) ?? 0) - (indeg.get(a) ?? 0) || (a < b ? -1 : 1))
      .slice(0, HUB_N)
    : [];
  const hubSet = new Set(hubs);

  // Lineage of the selection, for emphasis.
  let lin = null;
  if (selected && succ.has(selected)) lin = lineageOf(selected, succ, par);

  let edgeCount = 0;
  const g = el('g', { id: 'g', transform: `translate(${cam.x} ${cam.y}) scale(${cam.k})` });
  const linksG = el('g');
  const nodesG = el('g');

  if (groupFlow) edgeCount = renderFlowGrouped(g, linksG, nodesG, { placed, succ, par, depth, maxD, indeg, hubSet, lin });
  else edgeCount = renderFlowAll(g, linksG, nodesG, { placed, succ, par, depth, maxD, indeg, hubSet, hubs, lin });

  g.appendChild(linksG);
  g.appendChild(nodesG);
  svg.appendChild(g);
  svg.dataset.w = flowBounds.w;
  svg.dataset.h = flowBounds.h;
  applyTransform();

  $('#status').innerHTML =
    `flow · <b>${placed.length.toLocaleString()}</b> nodes · <b>${edgeCount.toLocaleString()}</b> links` +
    ` · <b>${maxD + 1}</b> tiers · ${groupFlow
      ? `grouped by category${expandedCells.size ? ` · ${expandedCells.size} band${expandedCells.size > 1 ? 's' : ''} open` : ''}`
      : 'all nodes'}` +
    (hubSet.size ? ` · ${hubSet.size} hubs on rail` : '') +
    ` · selected <b>${esc(selected ?? '—')}</b>`;

  buildHubs(indeg);
}

/* Continent: one cell per (tier, category). Edges aggregated with widths.
 * Returns the number of drawn links. */
function renderFlowGrouped(g, linksG, nodesG, ctx) {
  const { placed, succ, depth, maxD, hubSet, lin } = ctx;
  const xOf = (d) => F_PAD + (maxD - d) * F_COLW_GRP;

  // cells
  const cells = new Map(); // key `${d}|${cat}` -> {key, d, cat, members:[], expanded}
  for (const id of placed) {
    if (hubSet.has(id)) continue;
    const key = `${depth.get(id)}|${N[id].category}`;
    if (!cells.has(key)) cells.set(key, { key, d: depth.get(id), cat: N[id].category, members: [] });
    cells.get(key).members.push(id);
  }
  for (const k of [...expandedCells]) if (!cells.has(k)) expandedCells.delete(k);
  const byTier = new Map();
  for (const cell of cells.values()) {
    cell.expanded = expandedCells.has(cell.key);
    cell.members.sort();
    if (!byTier.has(cell.d)) byTier.set(cell.d, []);
    byTier.get(cell.d).push(cell);
  }
  const catOrder = catRank(META.byCategory ?? {});
  for (const arr of byTier.values()) {
    arr.sort((a, b) => (catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat)) || (a.cat < b.cat ? -1 : 1));
  }

  // Top-aligned columns; an expanded band takes one row per member plus a header.
  const F_PITCH_EXP = 14;
  const F_HEAD_EXP = 26;
  const cellH = (cell) => cell.expanded
    ? F_HEAD_EXP + cell.members.length * F_PITCH_EXP + 8
    : F_CELLH;
  let maxColH = F_RAILH;
  for (const [d, arr] of byTier) {
    let y = F_RAILH;
    for (const cell of arr) {
      const h = cellH(cell);
      const p = { x: xOf(d), y: y + h / 2 };
      flowCellPos.set(cell.key, p);
      for (const m of cell.members) flowCellOf.set(m, cell.key);
      if (cell.expanded) {
        cell.members.forEach((m, i) => flowPos.set(m, {
          x: xOf(d), y: y + F_HEAD_EXP + i * F_PITCH_EXP + F_PITCH_EXP / 2,
        }));
      } else {
        for (const m of cell.members) flowPos.set(m, p);
      }
      y += h + 8;
    }
    maxColH = Math.max(maxColH, y);
  }
  // hub rail positions: spread along the rail so same-tier hubs never stack
  const rail = layoutHubRail([...hubSet], depth, xOf);
  for (const [h, p] of rail.pos) flowPos.set(h, p);

  const H = maxColH + F_PAD;
  const W = Math.max(F_PAD * 2 + (maxD + 1) * F_COLW_GRP, rail.right + F_PAD + 240);
  flowBounds = { w: W, h: H };

  // Edges: aggregated between collapsed cells, per-node for expanded members.
  const isExp = (id) => expandedCells.has(flowCellOf.get(id) ?? '');
  const agg = new Map(); // "ck1>ck2" -> count
  const expEdges = [];
  let edgeCount = 0;
  for (const id of placed) {
    for (const s of succ.get(id) ?? []) {
      if (!depth.has(s)) continue;
      edgeCount++;
      if (hubSet.has(id) || hubSet.has(s)) continue;
      if (isExp(id) || isExp(s)) { expEdges.push([id, s]); continue; }
      const a = flowCellOf.get(id);
      const b = flowCellOf.get(s);
      if (!a || !b || a === b) continue;
      agg.set(`${a}>${b}`, (agg.get(`${a}>${b}`) ?? 0) + 1);
    }
  }
  for (const [k, n] of agg) {
    const [a, b] = k.split('>');
    const p = flowCellPos.get(a);
    const q = flowCellPos.get(b);
    if (!p || !q) continue;
    const hot = lin && lin.nodes.has(cellMember(a, cells)) && lin.nodes.has(cellMember(b, cells));
    const dx = Math.max(24, Math.abs(q.x - p.x) * 0.5);
    // Supply runs right-to-left (C64 at right); cubic handles either direction.
    linksG.appendChild(el('path', {
      class: `fedge${hot ? ' hot' : ''}${lin && dimUnrelated && !hot ? ' faint' : ''}`,
      d: `M${p.x} ${p.y} C${p.x - dx} ${p.y} ${q.x + dx} ${q.y} ${q.x} ${q.y}`,
      'stroke-width': (1 + Math.log10(n)).toFixed(2),
      opacity: hot ? 0.9 : 0.28,
    }));
  }
  // per-node edges touching expanded bands (member to cell centre or member)
  for (const [a, b] of expEdges) {
    const p = flowPos.get(a);
    const q = flowPos.get(b);
    if (!p || !q) continue;
    const hot = lin && lin.edges.has(`${a}>${b}`);
    const isBack = (depth.get(b) ?? 0) <= (depth.get(a) ?? 0);
    const dx = Math.max(18, Math.abs(q.x - p.x) * 0.45);
    linksG.appendChild(el('path', {
      class: `fedge${isBack ? ' back' : ''}${hot ? ' hot' : ''}${lin && dimUnrelated && !hot ? ' faint' : ''}`,
      d: `M${p.x} ${p.y} C${p.x - dx} ${p.y} ${q.x + dx} ${q.y} ${q.x} ${q.y}`,
      opacity: hot ? 0.95 : isBack ? 0.22 : 0.3,
    }));
  }
  // hub droplines + hub upstream edges (already counted above; drawn from the rail here)
  drawHubLinks(linksG, ctx);

  // hub nodes
  for (const h of hubSet) drawFlowNode(nodesG, h, ctx, { r: 9, hub: true });
  // cells (containers first, so expanded members draw on top of their band)
  const expMembers = [];
  for (const [key, cell] of cells) {
    const p = flowCellPos.get(key);
    const w = F_COLW_GRP - 26;
    const h = cell.expanded ? cellH(cell) - 8 : F_CELLH - 12;
    const hasSel = selected && flowCellOf.get(selected) === key;
    const hasMatch = [...matches].some((m) => flowCellOf.get(m) === key);
    const onLin = lin && cell.members.some((m) => lin.nodes.has(m));
    const cls = ['fcell'];
    if (hasSel) cls.push('sel');
    else if (hasMatch) cls.push('match');
    if (lin && dimUnrelated && !onLin && !hasSel) cls.push('faint');
    if (cell.expanded) cls.push('open');
    const gg = el('g', { class: cls.join(' '), 'data-cell': key, transform: `translate(${p.x - w / 2} ${p.y - h / 2})` });
    gg.appendChild(el('rect', { class: 'box', width: w, height: h, rx: 7, fill: colorOf(cell.cat), opacity: cell.expanded ? 0.08 : 0.16 }));
    gg.appendChild(el('rect', { x: 0, y: 0, width: 3.5, height: h, fill: colorOf(cell.cat) }));
    if (cell.expanded) {
      const t1 = el('text', { x: 10, y: 17, class: 't1' });
      t1.textContent = `${cell.cat} · ${cell.members.length} nodes · tier ${maxD - cell.d}`;
      gg.appendChild(t1);
    } else {
      const t1 = el('text', { x: 10, y: 19, class: 't1' });
      t1.textContent = cell.cat;
      const t2 = el('text', { x: 10, y: 35, class: 't2' });
      t2.textContent = `${cell.members.length} nodes · tier ${maxD - cell.d}`;
      gg.appendChild(t1);
      gg.appendChild(t2);
    }
    const title = el('title');
    title.textContent = cell.expanded
      ? `${cell.cat} — ${cell.members.length} nodes shown. Double-click to collapse.`
      : `${cell.cat} — ${cell.members.length} nodes. Double-click to expand in place.`;
    gg.appendChild(title);
    // hit area carries one member id so a click selects something real
    gg.appendChild(el('rect', { x: 0, y: 0, width: w, height: h, fill: 'transparent', 'data-id': cell.members[0] }));
    nodesG.appendChild(gg);
    if (cell.expanded) expMembers.push(...cell.members);
  }
  for (const m of expMembers) drawFlowNode(nodesG, m, ctx, { r: 4, forceLabel: true });
  return edgeCount;
}

function cellMember(cellKey, cells) {
  const c = cells.get(cellKey);
  return c ? c.members[0] : null;
}

/* Region: every node as a dot in its tier column. Returns link count. */
function renderFlowAll(g, linksG, nodesG, ctx) {
  const { placed, succ, depth, maxD, hubSet, hubs, lin } = ctx;
  const xOf = (d) => F_PAD + (maxD - d) * F_COLW_ALL;

  const layers = Array.from({ length: maxD + 1 }, () => []);
  for (const id of placed) {
    if (hubSet.has(id)) continue;
    layers[depth.get(id)].push(id);
  }
  for (const arr of layers) arr.sort();
  const order = new Map();
  layers.forEach((arr, L) => arr.forEach((id, i) => order.set(id, i + L * 1e6)));
  orderTiers(layers, ctx.par, succ, order);

  const tallest = Math.max(1, ...layers.map((a) => a.length));
  const yOf = (L, i) => F_RAILH + (tallest - layers[L].length) * F_PITCH_ALL / 2 + i * F_PITCH_ALL + F_PITCH_ALL / 2;
  layers.forEach((arr, L) => arr.forEach((id, i) => flowPos.set(id, { x: xOf(L), y: yOf(L, i) })));
  const rail = layoutHubRail(hubs, depth, xOf);
  for (const [h, p] of rail.pos) flowPos.set(h, p);

  flowBounds = { w: Math.max(F_PAD * 2 + (maxD + 1) * F_COLW_ALL + 130, rail.right + F_PAD + 250), h: F_RAILH + tallest * F_PITCH_ALL + F_PAD };

  let edgeCount = 0;
  for (const id of placed) {
    const p = flowPos.get(id);
    if (!p) continue;
    for (const s of succ.get(id) ?? []) {
      const q = flowPos.get(s);
      if (!q) continue;
      edgeCount++;
      if (hubSet.has(id) || hubSet.has(s)) continue; // drawn as droplines
      const isBack = depth.get(s) <= depth.get(id);
      const hot = lin && lin.edges.has(`${id}>${s}`);
      const dx = Math.max(18, Math.abs(q.x - p.x) * 0.45);
      linksG.appendChild(el('path', {
        class: `fedge${isBack ? ' back' : ''}${hot ? ' hot' : ''}${lin && dimUnrelated && !hot ? ' faint' : ''}`,
        d: `M${p.x} ${p.y} C${p.x - dx} ${p.y} ${q.x + dx} ${q.y} ${q.x} ${q.y}`,
        opacity: hot ? 0.95 : isBack ? 0.22 : 0.3,
      }));
    }
  }
  drawHubLinks(linksG, ctx); // rail drawing only; links counted in the loop above

  for (const id of placed) drawFlowNode(nodesG, id, ctx, {});
  return edgeCount;
}

/* Hub rail links: droplines from each hub to its dependents, plus the hub's
 * own upstream edges from its rail position. Drawing only — every link was
 * already counted by the caller. */
function drawHubLinks(linksG, ctx) {
  const { succ, par, lin } = ctx;
  for (const [h, p] of flowPos) {
    if (!isHub(h, ctx)) continue;
    for (const dep of par.get(h) ?? []) {
      const qq = flowPos.get(dep);
      if (!qq) continue;
      const hot = lin && lin.edges.has(`${dep}>${h}`);
      linksG.appendChild(el('path', {
        class: `fdrop${hot ? ' hot' : ''}${lin && dimUnrelated && !hot ? ' faint' : ''}`,
        d: `M${qq.x} ${qq.y} L${p.x} ${p.y}`,
        opacity: hot ? 0.8 : 0.16,
      }));
    }
    for (const s of succ.get(h) ?? []) {
      const q = flowPos.get(s);
      if (!q) continue;
      const hot = lin && lin.edges.has(`${h}>${s}`);
      const dx = Math.max(18, Math.abs(q.x - p.x) * 0.45);
      linksG.appendChild(el('path', {
        class: `fedge${hot ? ' hot' : ''}${lin && dimUnrelated && !hot ? ' faint' : ''}`,
        d: `M${p.x} ${p.y} C${p.x - dx} ${p.y} ${q.x + dx} ${q.y} ${q.x} ${q.y}`,
        opacity: hot ? 0.9 : 0.3,
      }));
    }
  }
}

function isHub(id, ctx) {
  return ctx.hubSet.has(id);
}

/* Rail layout: hubs sharing a tier would otherwise land on the exact same
 * point (stacked dots, overprinted labels). Sort by tier and enforce a
 * minimum horizontal gap, alternating two rows so long labels clear each
 * other. Returns {pos: Map, right: maxX}. */
const HUB_GAP = 200;
function layoutHubRail(hubs, depth, xOf) {
  const pos = new Map();
  const rows = [F_RAILH * 0.32, F_RAILH * 0.68];
  const sorted = hubs.slice().sort((a, b) => (depth.get(a) - depth.get(b)) || (a < b ? -1 : 1));
  let prevX = -Infinity;
  let right = 0;
  sorted.forEach((h, i) => {
    const x = Math.max(xOf(depth.get(h)), prevX + HUB_GAP);
    const p = { x, y: rows[i % 2] };
    pos.set(h, p);
    prevX = x;
    right = Math.max(right, x);
  });
  return { pos, right };
}

function drawFlowNode(nodesG, id, ctx, { r = 5, hub = false, forceLabel = false }) {
  const p = flowPos.get(id);
  if (!p) return;
  const n = N[id];
  const { lin } = ctx;
  const onLin = lin && lin.nodes.has(id);
  const cls = ['fnd'];
  if (selected === id) cls.push('sel');
  else if (matches.has(id)) cls.push('match');
  if (hub) cls.push('hub');
  if (lin && dimUnrelated && !onLin && selected !== id) cls.push('faint');
  const gg = el('g', { class: cls.join(' '), 'data-id': id, transform: `translate(${p.x} ${p.y})` });
  const c = colorOf(n.category);
  if (markShared && (ctx.indeg.get(id) ?? 0) > 1 && !hub) {
    gg.appendChild(el('circle', { r: r + 3, fill: 'none', stroke: c, 'stroke-width': 1, 'stroke-dasharray': '2 2', opacity: 0.8 }));
  }
  gg.appendChild(el('circle', { class: 'dot', r, fill: id === ROOT ? '#ff007c' : c, stroke: '#0b0d13', 'stroke-width': 1 }));
  const showText = flowLabels || hub || forceLabel || selected === id || matches.has(id) || id === ROOT;
  if (showText) {
    const t = el('text', { x: r + 5, y: 4 });
    const label = n.simple_name ?? n.name;
    t.textContent = label.length > 34 ? `${label.slice(0, 33)}…` : label;
    gg.appendChild(t);
  }
  const title = el('title');
  title.textContent = `${n.name} — ${n.kind} · ${n.category} · used ${(ctx.indeg.get(id) ?? 0)}×`;
  gg.appendChild(title);
  const hit = el('circle', { r: Math.max(9, r + 2), fill: 'transparent', 'data-id': id });
  gg.appendChild(hit);
  nodesG.appendChild(gg);
}

/* Most-reused strip: the inputs the whole machine converges on. */
function buildHubs(indeg) {
  const box = $('#hubs');
  if (!box) return;
  const top = [...indeg.entries()]
    .filter(([id]) => id !== ROOT && N[id])
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 12);
  box.innerHTML = top
    .map(([id, c]) => `<span class="c${selected === id ? ' on' : ''}" data-hub="${id}" title="${esc(N[id].name)}">${esc((N[id].simple_name ?? N[id].name).slice(0, 22))} <b>${c}×</b></span>`)
    .join('');
  box.onclick = (e) => {
    const c = e.target.closest('[data-hub]');
    if (!c) return;
    select(c.dataset.hub, { reveal: true });
  };
}

function renderOutline() {
  $('#canvas').hidden = true;
  const box = $('#outline');
  box.hidden = false;
  box.replaceChildren();

  let related = null;
  if (dimUnrelated && selected) {
    related = new Set([selected]);
    const st = [selected];
    while (st.length) {
      const id = st.pop();
      for (const p of parents[id] ?? []) if (!related.has(p)) { related.add(p); st.push(p); }
      for (const c of N[id]?.children ?? []) if (!related.has(c)) { related.add(c); st.push(c); }
    }
  }

  const frag = document.createDocumentFragment();
  for (const inst of vis) {
    const n = inst.n;
    const row = document.createElement('div');
    row.className = 'orow';
    if (selected === inst.id) row.classList.add('sel');
    if (related && !related.has(inst.id)) row.classList.add('faint');
    row.style.paddingLeft = `${6 + inst.depth * 15}px`;
    row.dataset.uid = inst.uid;

    const tw = document.createElement('span');
    tw.className = 'tw';
    tw.textContent = inst.expandable ? (inst.open ? '▾' : '▸') : '';
    row.appendChild(tw);

    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = colorOf(n.category);
    row.appendChild(sw);

    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = n.name;
    row.appendChild(nm);

    const id = document.createElement('span');
    id.className = 'id';
    id.textContent = n.id;
    row.appendChild(id);

    const d = document.createElement('span');
    d.className = 'd';
    d.textContent = n.description ?? '';
    row.appendChild(d);

    if (inst.expandable && !inst.open) {
      const cnt = document.createElement('span');
      cnt.className = 'cnt';
      cnt.textContent = `+${n.children.length}`;
      row.appendChild(cnt);
    }
    frag.appendChild(row);
  }
  box.appendChild(frag);
  const sel = box.querySelector('.orow.sel');
  if (sel) sel.scrollIntoView({ block: 'center' });
}

/* ------------------------------------------------------------------ panel */

function ancestry(id) {
  const out = [];
  const seen = new Set([id]);
  const walk = (cur, trail) => {
    const ps = (parents[cur] ?? []).filter((p) => N[p]);
    if (!ps.length) out.push(trail);
    for (const p of ps) if (!seen.has(p)) walk(p, [...trail, p]);
  };
  walk(id, [id]);
  const best = out.sort((a, b) => b.length - a.length)[0] ?? [id];
  return best;
}

function renderPanel(id) {
  const p = $('#panel');
  if (!id || !N[id]) {
    p.className = 'panel empty';
    p.innerHTML = '<p class="placeholder">Select a node to read how it was made.</p>';
    return;
  }
  const n = N[id];
  p.className = 'panel';

  const trail = ancestry(id);
  const crumbs = trail
    .map((t, i) => `${i ? '<i>›</i>' : ''}<a data-go="${t}" class="${t === id ? 'here' : ''}">${esc(N[t].name)}</a>`)
    .join(' ');

  const tag = (label, color, solid = false) =>
    `<span class="tag${solid ? ' solid' : ''}" style="${solid ? `background:${color}` : `color:${color}`}">${label}</span>`;

  const badges = [
    tag(n.kind ?? '?', colorOf(n.category), true),
    tag(n.category ?? '?'),
    tag(`scope: ${n.scope ?? 'chain'}`),
    n.provenance ? tag(`provenance: ${n.provenance}`, n.provenance === 'raw' ? '#9ece6a' : n.provenance === 'complete' ? '#7dcfff' : '#e0af68') : '',
    n.era ? tag(n.era) : '',
    n.confidence ? tag(`confidence: ${n.confidence}`, n.confidence === 'high' ? '#9ece6a' : n.confidence === 'medium' ? '#e0af68' : '#f7768e') : '',
    (parents[id]?.length ?? 0) > 1 ? tag(`used ${parents[id].length}×`, '#7dcfff') : '',
    `<span class="tag" style="color:#545d70">${esc(id)}</span>`,
  ].filter(Boolean).join('');

  const facts = Array.isArray(n.facts) && n.facts.length
    ? `<dl class="meta"><dt>specifics</dt><dd>${n.facts
        .map((f) => `<div><b style="color:#c8d0e0">${esc(f.label)}:</b> ${esc(f.value)}</div>`).join('')}</dd></dl>`
    : '';

  const inputs = Array.isArray(n.inputs) && n.inputs.length
    ? `<dl class="meta"><dt>from</dt><dd>${n.inputs.map(esc).join(' · ')}</dd></dl>` : '';

  const fromLinks = Array.isArray(n.from) && n.from.length
    ? `<div class="kids"><h4>made of — ${n.from.length} linked</h4><ol>${n.from
        .map((f) => N[f] ? `<li><a data-go="${f}"><i class="sw" style="background:${colorOf(N[f].category)}"></i>${esc(N[f].name)}<span class="c">${KIND_LABEL[N[f].kind] ?? N[f].kind}</span></a></li>` : '')
        .join('')}</ol></div>`
    : '';

  const places = Array.isArray(n.places) && n.places.length
    ? `<dl class="meta"><dt>where</dt><dd>${n.places.map(esc).join(' · ')}</dd></dl>` : '';

  const sources = Array.isArray(n.sources) && n.sources.length
    ? `<dl class="meta"><dt>sources</dt><dd>${n.sources
        .map((s) => /^https?:/.test(s) ? `<a href="${esc(s)}" target="_blank" rel="noopener" style="color:#7aa2f7">${esc(s.replace(/^https?:\/\//, '').slice(0, 58))}</a>` : esc(s))
        .join('<br>')}</dd></dl>` : '';

  const parents_ = parents[id] ?? [];
  const usedBy = parents_.filter((p) => N[p]);
  const from = n.file
    ? `<dl class="meta"><dt>fragment</dt><dd>${esc(n.file)} · used by ${usedBy.length
        ? usedBy.map((p) => `<a data-go="${p}" style="color:#7aa2f7;cursor:pointer">${esc(N[p].name)}</a>`).join(', ')
        : 'nothing (it is a root)'}</dd></dl>`
    : '';

  const kids = kidsOf(n);
  const hasConn = (n.children ?? []).length || (n.edges ?? []).length
    || (n.from ?? []).length || (n.made_by ?? []).length;
  const PROV_END = { raw: 'raw material', complete: 'supply knowledge complete', incomplete: 'supply knowledge gap' };
  const kidHtml = kids.length
    ? `<div class="kids"><h4>contains / made of — refinement, ${kids.length}</h4><ol>${kids
        .map((k) => `<li><a data-go="${k.id}"><i class="sw" style="background:${colorOf(k.category)}"></i>${esc(k.name)}<span class="c">${k.children?.length ?? 0}↓</span></a></li>`)
        .join('')}</ol></div>`
    : (hasConn ? '' : `<div class="kids"><h4>end of the line</h4><ol><li style="padding:4px 8px;color:#545d70">${esc(PROV_END[n.provenance] ?? 'nothing further modeled')}</li></ol></div>`);

  const edgeLi = (to, extra = '') => N[to]
    ? `<li><a data-go="${to}"><i class="sw" style="background:${colorOf(N[to].category)}"></i>${esc(N[to].name)}<span class="c">${esc(extra || (KIND_LABEL[N[to].kind] ?? N[to].kind))}</span></a></li>`
    : '';
  const grp = (title, items) => items.length
    ? `<div class="kids"><h4>${title} — ${items.length}</h4><ol>${items.join('')}</ol></div>`
    : '';
  const byRel = (rel) => (n.edges ?? []).filter((e) => e && e.rel === rel && N[e.to]);
  const flowHtml =
    grp('made from — flow', byRel('made from').map((e) => edgeLi(e.to, 'made from'))) +
    grp('step — flow (follows)', byRel('step').map((e) => edgeLi(e.to, 'step'))) +
    grp('consumes — flow in', byRel('consumes').map((e) => edgeLi(e.to, 'consumes'))) +
    grp('produces — flow out', byRel('produces').map((e) => edgeLi(e.to, `${e.role ?? 'product'}`))) +
    grp('how this is made — made by (derived from produces)', (n.made_by ?? []).filter((p) => N[p]).map((p) => edgeLi(p, 'made by')));
  const ctxHtml =
    grp('uses — context (equipment)', byRel('uses').map((e) => edgeLi(e.to, 'uses'))) +
    grp('at — context (where)', byRel('at').map((e) => edgeLi(e.to, 'at'))) +
    grp('owned by — context (who)', byRel('owned by').map((e) => edgeLi(e.to, 'owned by'))) +
    grp('about — context (note)', byRel('about').map((e) => edgeLi(e.to, 'about')));
  const refineTypedHtml =
    grp('contains — refinement', byRel('contains').map((e) => edgeLi(e.to, 'contains'))) +
    grp('made of — refinement', byRel('made of').map((e) => edgeLi(e.to, 'made of')));

  p.innerHTML = `
    <div class="crumbs">${crumbs}</div>
    <h2>${esc(n.name)}</h2>
    <div class="kindline">${badges}</div>
    <div class="desc">${esc(n.description ?? '')}</div>
    ${n.note ? `<div class="note">${esc(n.note)}</div>` : ''}
    ${facts}${inputs}${places}${sources}${fromLinks}
    ${refineTypedHtml}${flowHtml}${ctxHtml}
    ${kidHtml}
    <div class="act">
      <button data-act="reveal">reveal in flow</button>
      <button data-act="copy">copy id</button>
    </div>`;

  p.onclick = (e) => {
    const go = e.target.closest('[data-go]');
    if (go) return select(go.dataset.go, { reveal: true });
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'reveal') {
      select(id, { reveal: true });
    } else if (act === 'copy') {
      navigator.clipboard?.writeText(id);
      e.target.textContent = 'copied';
    }
  };
}

/* ------------------------------------------------------------- selection */

function revealTo(id) {
  const trail = ancestry(id);
  forceOpen = new Set(trail);
  for (const t of trail) collapsed.delete(t);
  if (query) {
    query = '';
    $('#search').value = '';
    matches = new Set();
    pathIds = new Set();
  }
  // The flow draws every node, so revealing never needs to raise depthLimit.
  // The outline keeps its ancestor chain force-open as before.
}

function select(id, opts = {}) {
  selected = id;
  if (opts.reveal) revealTo(id);
  render();
  renderPanel(id);
  if (opts.reveal) centreOn(id);
}

function flowCentre(id) {
  return flowPos.get(id) ?? flowCellPos.get(flowCellOf.get(id) ?? '') ?? null;
}

function centreOn(id) {
  if (view !== 'flow') {
    if (view === 'outline') {
      const row = $('#outline').querySelector('.orow.sel');
      row?.scrollIntoView({ block: 'center' });
    }
    return;
  }
  const p = typeof id === 'string' ? flowCentre(id) : null;
  if (!p) return;
  const svg = $('#canvas');
  const vp = svg.getBoundingClientRect();
  cam.x = vp.width / 2 - p.x * cam.k;
  cam.y = vp.height / 2 - p.y * cam.k;
  applyTransform();
}

function centreRoot() {
  if (view !== 'flow') {
    fit();
    return;
  }
  fit();
  if (flowPos.has(ROOT)) centreOn(ROOT);
}

/* Expand or collapse a grouped band in place: only that band's members become
 * individual nodes, everything else stays grouped. */
function toggleCell(key) {
  if (!groupFlow) return;
  expandedCells.has(key) ? expandedCells.delete(key) : expandedCells.add(key);
  render();
}

function updateProjNote() {
  const el_ = $('#projNote');
  if (!el_) return;
  el_.textContent = projection === 'entities'
    ? 'Outline shows components and materials only; processes are routed through. The flow always shows everything passing the kind filter, so processes stay visible there.'
    : 'Outline shows everything. The flow always shows the full supply graph passing the category/kind/scope filters.';
}

function applyTransform() {
  $('#canvas').querySelector('#g')?.setAttribute('transform', `translate(${cam.x} ${cam.y}) scale(${cam.k})`);
}

function expandToDepth(n) {
  depthLimit = n;
  collapsed.clear();
  forceOpen.clear();
  render();
  fit();
}

/* --------------------------------------------------------------- search */

function runSearch(q) {
  query = q.trim().toLowerCase();
  matches = new Set();
  pathIds = new Set();
  const box = $('#results');
  if (query.length < 2) {
    box.hidden = true;
    collapsed.clear();
    render();
    return;
  }
  const terms = query.split(/\s+/);
  const hits = [];
  for (const [id, hay] of haystack) {
    let score = 0;
    let ok = true;
    for (const t of terms) {
      const at = hay.indexOf(t);
      if (at < 0) { ok = false; break; }
      score += at === 0 ? 100 : at < N[id].name.length + 2 ? 40 : 10;
    }
    if (ok) { score -= (N[id].children?.length ?? 0) * 0.02; hits.push([id, score]); }
  }
  hits.sort((a, b) => b[1] - a[1]);
  for (const [id] of hits.slice(0, 400)) {
    matches.add(id);
    const seenChain = new Set();
    const up = [id];
    while (up.length) {
      const cur = up.pop();
      if (seenChain.has(cur)) continue;
      seenChain.add(cur);
      pathIds.add(cur);
      for (const p of parents[cur] ?? []) if (!seenChain.has(p)) up.push(p);
    }
  }
  if (!hits.length) {
    box.innerHTML = `<div class="none">nothing matches “${esc(q)}”</div>`;
    box.hidden = false;
    render();
    return;
  }
  box.innerHTML = hits.slice(0, 40).map(([id], i) => {
    const n = N[id];
    const trail = ancestry(id).slice(0, -1).map((t) => N[t].name).join(' › ');
    return `<div class="r${i === 0 ? ' sel' : ''}" data-id="${id}">
      <div class="nm">${hl(n.name, terms)}</div>
      <div class="pth">${esc(trail || 'root')} · ${hl((n.description ?? '').slice(0, 150), terms)}</div></div>`;
  }).join('') + (hits.length > 40 ? `<div class="none">…${hits.length - 40} more</div>` : '');
  box.hidden = false;
  render();
}

const hl = (s, terms) => {
  let out = esc(s);
  for (const t of terms) {
    if (!t) continue;
    out = out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  }
  return out;
};

/* ---------------------------------------------------------------- wiring */

function wire() {
  const svg = $('#canvas');
  // Pair-detection for band double-clicks. Each single click re-renders the
  // whole SVG, so the two clicks of a double-click land in different DOM
  // generations and the browser cannot pair them into a dblclick on the band.
  let lastBandClick = { key: null, t: 0 };

  svg.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; return; }
    const hit = e.target.closest('[data-id]');
    if (!hit) return;
    const cellG = e.target.closest('[data-cell]');
    if (cellG && groupFlow) {
      const key = cellG.dataset.cell;
      const now = performance.now();
      if (lastBandClick.key === key && now - lastBandClick.t < 450) {
        lastBandClick = { key: null, t: 0 };
        toggleCell(key);
        return;
      }
      lastBandClick = { key, t: now };
    }
    select(hit.dataset.id);
  });
  svg.addEventListener('dblclick', (e) => {
    // Fallback for browsers that do pair the clicks (e.g. when nothing
    // re-rendered between them). The manual pairing above handles the rest.
    const cell = e.target.closest('[data-cell]');
    if (cell && groupFlow) toggleCell(cell.dataset.cell);
  });

  $('#outline').addEventListener('click', (e) => {
    const row = e.target.closest('.orow');
    if (!row) return;
    const inst = vis[+row.dataset.uid];
    if (!inst) return;
    if (e.target.classList.contains('tw')) {
      collapsed.has(inst.id) ? collapsed.delete(inst.id) : collapsed.add(inst.id);
      render();
    } else select(inst.id);
  });

  // zoom + pan
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const vp = svg.getBoundingClientRect();
    const mx = e.clientX - vp.left;
    const my = e.clientY - vp.top;
    const k = Math.min(4, Math.max(0.08, cam.k * (e.deltaY < 0 ? 1.12 : 0.89)));
    cam.x = mx - (mx - cam.x) * (k / cam.k);
    cam.y = my - (my - cam.y) * (k / cam.k);
    cam.k = k;
    svg.querySelector('#g')?.setAttribute('transform', `translate(${cam.x} ${cam.y}) scale(${cam.k})`);
  }, { passive: false });

  let drag = null;
  let suppressClick = false;
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    suppressClick = false;
    drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      svg.classList.add('dragging');
      try { svg.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    }
    cam.x = drag.cx + dx;
    cam.y = drag.cy + dy;
    svg.querySelector('#g')?.setAttribute('transform', `translate(${cam.x} ${cam.y}) scale(${cam.k})`);
  });
  const endDrag = () => {
    if (drag?.moved) suppressClick = true;
    drag = null;
    svg.classList.remove('dragging');
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  // view switch
  document.querySelectorAll('[data-view]').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
      view = b.dataset.view;
      cam.y = 0;
      render();
      fit();
    };
  });

  // projection switch (outline only; the flow always shows the full graph)
  document.querySelectorAll('[data-proj]').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('[data-proj]').forEach((x) => x.classList.toggle('on', x === b));
      projection = b.dataset.proj;
      collapsed.clear();
      forceOpen.clear();
      render();
      fit();
      updateProjNote();
    };
  });
  $('#showChips').onchange = (e) => { showChips = e.target.checked; render(); };
  $('#showEditorial').onchange = (e) => { showEditorial = e.target.checked; render(); };
  $('#groupFlow').onchange = (e) => { groupFlow = e.target.checked; render(); fit(); };
  $('#hubRail').onchange = (e) => { hubRailOn = e.target.checked; render(); };
  $('#flowLabels').onchange = (e) => { flowLabels = e.target.checked; render(); };
  updateProjNote();

  // search
  const search = $('#search');
  search.addEventListener('input', () => runSearch(search.value));
  search.addEventListener('focus', () => { if (search.value.length >= 2) $('#results').hidden = false; });
  search.addEventListener('keydown', (e) => {
    const rows = [...$('#results').querySelectorAll('.r')];
    let i = rows.findIndex((r) => r.classList.contains('sel'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      i = Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
      rows.forEach((r, j) => r.classList.toggle('sel', j === i));
      rows[i]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = rows[i < 0 ? 0 : i];
      if (pick) {
        select(pick.dataset.id, { reveal: true });
        $('#results').hidden = true;
        search.blur();
      }
    } else if (e.key === 'Escape') {
      search.value = '';
      runSearch('');
      search.blur();
      $('#results').hidden = true;
    }
  });
  $('#results').addEventListener('click', (e) => {
    const r = e.target.closest('.r');
    if (!r) return;
    select(r.dataset.id, { reveal: true });
    $('#results').hidden = true;
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchwrap')) $('#results').hidden = true;
  });

  // controls
  $('#centreRoot').onclick = () => centreRoot();
  $('#fitAll').onclick = () => fit();
  $('#depthSlider').oninput = (e) => {
    depthLimit = +e.target.value;
    collapsed.clear();
    forceOpen.clear();
    render();
  };
  $('#dimUnrelated').onchange = (e) => { dimUnrelated = e.target.checked; render(); };
  $('#showRefs').onchange = (e) => { markShared = e.target.checked; render(); };

  // keyboard
  document.addEventListener('keydown', (e) => {
    if (e.target === search) return;
    switch (e.key) {
      case '/': e.preventDefault(); search.focus(); search.select(); break;
      case '?': e.preventDefault(); $('#hint').textContent =
        'click node = select + highlight its whole supply line · dbl-click a band = expand/collapse it in place · scroll = zoom · drag = pan · / = search · 0 = centre root · Esc = clear search'; break;
      case '0': centreRoot(); break;
      case 'Escape': search.value = ''; runSearch(''); break;
      case 'ArrowDown': case 'ArrowUp': case 'ArrowLeft': case 'ArrowRight': {
        if (view !== 'flow') break;
        e.preventDefault();
        const step = 80;
        if (e.key === 'ArrowDown') cam.y -= step;
        if (e.key === 'ArrowUp') cam.y += step;
        if (e.key === 'ArrowLeft') cam.x += step;
        if (e.key === 'ArrowRight') cam.x -= step;
        applyTransform();
        break;
      }
      case '+': case '=': cam.k = Math.min(4, cam.k * 1.15); applyTransform(); break;
      case '-': case '_': cam.k = Math.max(0.08, cam.k * 0.87); applyTransform(); break;
      default: break;
    }
  });

  window.addEventListener('resize', () => fit());
}

function fit() {
  const svg = $('#canvas');
  if (svg.hidden) return;
  if (view !== 'flow') return;
  const W = flowBounds.w || 1;
  const H = flowBounds.h || 1;
  const vp = svg.getBoundingClientRect();
  if (vp.width < 10 || vp.height < 10) return;
  // Fit the width; the flow is far taller than any viewport, so fitting the
  // height would shrink everything past legibility. Start at the raw end.
  const k = Math.min(1.5, Math.max(0.08, vp.width / (W + 60)));
  cam.k = k;
  cam.x = 24;
  cam.y = 16;
  void H;
  applyTransform();
}

/* ------------------------------------------------------------------ paint */

/* A blank canvas with a console full of nothing is the worst failure mode there
 * is, so every boot-time error gets written into the page as well. */
function crash(what, e) {
  const box = document.querySelector('#crash');
  if (!box) return;
  box.hidden = false;
  box.textContent += `${what}: ${e?.stack ?? e?.message ?? e}\n\n`;
}
addEventListener('error', (e) => crash('uncaught', e.error ?? e.message));
addEventListener('unhandledrejection', (e) => crash('unhandled rejection', e.reason));

buildStats();
buildLegend();
buildKindChips();
buildConfChips();
buildScopeChips();
wire();
render();
renderPanel(null);
fit();
