import { C } from './palette.js';
import { toScreenText } from './petscii.js';

// Stratified flow view for the C64 text-mode visualizer (80x45 cells).
//
// The classic SVG viewer draws the whole supply graph at once with
// semi-transparent overlapping edges. That does not survive the jump to
// PETSCII text mode: ~2,100 reachable nodes in 15 tiers cannot overlap and stay
// readable. So this view makes three different trade-offs:
//
//   1. Category bands are always expanded. Every node sits inside its low-level
//      subcat block, which sits inside its color-determining high-level
//      category band (12 highers, one C64 palette colour each). All nodes are
//      visible by scrolling; nothing is hidden behind a collapsed band.
//   2. The world is zoomed in. The viewport shows a small slice (about 1-2
//      tiers, a handful of nodes). The user pans with the arrow keys, the
//      mouse wheel, or click-drag, jumps via the left-rail minimap, and zooms
//      (+/-) by changing the node box width, not a pixel scale, because the
//      font cannot scale.
//   3. Edges show the canonical trail, not the neighbourhood. Only the links
//      from the selected node up through its BFS parents to the root are
//      drawn, in solid opaque PETSCII lines. That is the same trail BACK
//      walks and the tree tab opens on, and with ~2,100 nodes in play it is
//      the only edge set that stays legible.
//
// Layout: x runs raw-materials (left) -> C64 (right), exactly like the
// classic flow. y stacks nodes within a tier grouped by category then subcat.
// World coordinates are in text cells, 1:1 with the screen once panned.

export const CAT_ORDER = [
  'semiconductors', 'board', 'passives', 'interconnect', 'electric', 'displays',
  'metals', 'fluids', 'inorganics', 'petrochem', 'polymers', 'industry',
];

// 12 highers -> 12 readable colours on BLUE. Matches docs/CATEGORIES.md:
// YELLOW, GREEN, LT-GREEN, CYAN, ORANGE, LT-RED, GREY, LT-BLUE, WHITE,
// PURPLE, RED, LT-GREY.
export const CAT_COLOR = {
  semiconductors: C.YELLOW,
  board: C.GREEN,
  passives: C.LTGREEN,
  interconnect: C.CYAN,
  electric: C.ORANGE,
  displays: C.LTRED,
  metals: C.GREY,
  fluids: C.LTBLUE,
  inorganics: C.WHITE,
  petrochem: C.PURPLE,
  polymers: C.RED,
  industry: C.LTGREY,
};

export function catColor(cat) {
  return CAT_COLOR[cat] ?? C.GREY;
}

export const FLOW_ZOOMS = [
  { nodeW: 12, label: 'NARROW' },
  { nodeW: 18, label: 'NORMAL' },
  { nodeW: 26, label: 'WIDE' },
];
export const FLOW_NODE_H = 3;
export const FLOW_COL_GAP = 6;
export const FLOW_ROW_GAP = 1;

const EXCLUDED = new Set(['unlinked.catalogue']);

// Supply successors for the flow. Children are the refinement backbone and are
// always included (same as the tree panel); typed edges are filtered by the
// active edge-mode rel set; `from`/`made_by` are included only when the mode
// chains through ingredients (supply/materials/all).
export function flowSuccIds(node, nodes, relSet, chain) {
  if (!node) return [];
  const out = new Set();
  for (const c of node.children ?? []) {
    if (c === node.id) continue;
    if (nodes[c] && !EXCLUDED.has(c)) out.add(c);
  }
  for (const e of node.edges ?? []) {
    if (!e || typeof e.to !== 'string') continue;
    if (!relSet.has(e.rel)) continue;
    if (e.to === node.id) continue;
    if (nodes[e.to] && !EXCLUDED.has(e.to)) out.add(e.to);
  }
  if (chain) {
    for (const f of node.from ?? []) {
      if (f === node.id) continue;
      if (nodes[f] && !EXCLUDED.has(f)) out.add(f);
    }
    for (const p of node.made_by ?? []) {
      if (p === node.id) continue;
      if (nodes[p] && !EXCLUDED.has(p)) out.add(p);
    }
  }
  return [...out];
}

export function buildFlowGraph(nodes, relSet, chain) {
  const ids = Object.keys(nodes).filter((id) => !EXCLUDED.has(id));
  const succ = new Map();
  const par = new Map();
  for (const id of ids) { succ.set(id, []); par.set(id, []); }
  for (const id of ids) {
    const n = nodes[id];
    if (!n) continue;
    for (const s of flowSuccIds(n, nodes, relSet, chain)) {
      if (!succ.has(s)) continue;
      succ.get(id).push(s);
      par.get(s).push(id);
    }
  }
  return { ids, succ, par };
}

// BFS tiers from the root. Shortest-path, not longest-path: the graph has
// genuine industrial cycles (energy/material loops) on which longest-path
// relaxation diverges. Same choice as the classic viewer. Also records the
// BFS parent of every node: the canonical incoming link, used to rebuild the
// click-history path as a structural root-to-node trail.
export function computeTiers(succ, root) {
  const depth = new Map();
  const parent = new Map();
  if (!succ.has(root)) return { depth, parent, maxD: 0 };
  depth.set(root, 0);
  const q = [root];
  while (q.length) {
    const id = q.shift();
    const d = depth.get(id);
    for (const s of succ.get(id) ?? []) {
      if (!depth.has(s)) { depth.set(s, d + 1); parent.set(s, id); q.push(s); }
    }
  }
  let maxD = 0;
  for (const d of depth.values()) maxD = Math.max(maxD, d);
  return { depth, parent, maxD };
}

function subOf(nodes, id) {
  return nodes[id]?.subcat ?? 'other';
}

export function layoutFlow(nodes, depth, maxD, opts = {}) {
  const nodeW = opts.nodeW ?? 18;
  const nodeH = opts.nodeH ?? FLOW_NODE_H;
  const colGap = opts.colGap ?? FLOW_COL_GAP;
  const rowGap = opts.rowGap ?? FLOW_ROW_GAP;
  const padX = opts.padX ?? 2;
  const padY = opts.padY ?? 2;
  const colStep = nodeW + colGap;
  const xOf = (d) => padX + (maxD - d) * colStep;

  // tier -> cat -> sub -> [ids]
  const tiers = new Map();
  for (const [id, d] of depth) {
    const n = nodes[id];
    if (!n) continue;
    const cat = n.category ?? 'industry';
    const sub = subOf(nodes, id);
    if (!tiers.has(d)) tiers.set(d, new Map());
    const byCat = tiers.get(d);
    if (!byCat.has(cat)) byCat.set(cat, new Map());
    const bySub = byCat.get(cat);
    if (!bySub.has(sub)) bySub.set(sub, []);
    bySub.get(sub).push(id);
  }
  // Deterministic order inside every block.
  for (const byCat of tiers.values()) {
    for (const arr of byCat.values()) {
      for (const list of arr.values()) {
        list.sort((a, b) => {
          const na = nodes[a]?.simple_name ?? nodes[a]?.name ?? a;
          const nb = nodes[b]?.simple_name ?? nodes[b]?.name ?? b;
          return na < nb ? -1 : na > nb ? 1 : a < b ? -1 : 1;
        });
      }
    }
  }

  const pos = new Map();
  const headers = [];
  const byTier = new Map();
  let worldH = padY * 2;
  for (let d = 0; d <= maxD; d++) {
    const byCat = tiers.get(d);
    if (!byCat) { byTier.set(d, []); continue; }
    const x = xOf(d);
    let y = padY;
    const order = [];
    for (const cat of CAT_ORDER) {
      const bySub = byCat.get(cat);
      if (!bySub) continue;
      headers.push({ x, y, w: nodeW, h: 1, kind: 'cat', cat, tier: d, label: cat });
      y += 1 + rowGap;
      const subs = [...bySub.keys()].sort();
      for (const sub of subs) {
        const list = bySub.get(sub);
        headers.push({ x, y, w: nodeW, h: 1, kind: 'sub', cat, sub, tier: d, label: sub });
        y += 1;
        for (const id of list) {
          pos.set(id, { x, y, w: nodeW, h: nodeH, tier: d, cat, sub });
          order.push(id);
          y += nodeH + rowGap;
        }
        y += rowGap;
      }
    }
    byTier.set(d, order);
    worldH = Math.max(worldH, y + padY);
  }
  // No trailing gap after the leftmost column: columns + inner gaps + pads.
  const worldW = padX * 2 + (maxD + 1) * nodeW + Math.max(0, maxD) * colGap;
  return { pos, headers, worldW, worldH, byTier, colStep, xOf };
}

export function selectedEdges(selected, succ, par) {
  return {
    out: [...(succ.get(selected) ?? [])],
    inp: [...(par.get(selected) ?? [])],
  };
}

// Manhattan edge cells in world coordinates. Anchors are box-edge midpoints.
// Normal case (a left gap exists): left edge of the right box to right edge
// of the left box via a mid-gap vertical. Overlapping/same-column case (cycles
// inside one tier): both anchors on the right edge via a detour column, so the
// line never cuts through a neighbouring box. Corners are 'x', straights are
// 'h'/'v'; the caller maps them to PETSCII BOX glyphs.
export function edgeCellsFor(a, b) {
  const cells = [];
  const ay = a.y + Math.floor(a.h / 2);
  const by = b.y + Math.floor(b.h / 2);
  // Identify left/right boxes by world x.
  let L = a; let R = b; let ly = ay; let ry = by;
  if (a.x < b.x) { L = a; R = b; ly = ay; ry = by; }
  else if (b.x < a.x) { L = b; R = a; ly = by; ry = ay; }
  else {
    // Same column: detour to the right of both boxes.
    const dx = Math.max(a.x + a.w, b.x + b.w) + 2;
    const ax = a.x + a.w; const bx = b.x + b.w;
    const x1 = Math.min(ax, dx); const x2 = Math.max(ax, dx);
    for (let x = x1; x <= x2; x++) cells.push({ x, y: ay, c: 'h' });
    const y1 = Math.min(ay, by); const y2 = Math.max(ay, by);
    for (let y = y1; y <= y2; y++) cells.push({ x: dx, y, c: 'v' });
    const bx1 = Math.min(bx, dx); const bx2 = Math.max(bx, dx);
    for (let x = bx1; x <= bx2; x++) cells.push({ x, y: by, c: 'h' });
    return markCorners(cells);
  }
  const rx = R.x; const lx = L.x + L.w;
  if (rx >= lx + 2) {
    const mid = Math.floor((rx + lx) / 2);
    const sx = (R === a) ? rx : lx;
    const sy = (R === a) ? ry : ly;
    const ex = (R === a) ? lx : rx;
    const ey = (R === a) ? ly : ry;
    // Horizontal from start to mid, vertical to end row, horizontal to end.
    const h1a = Math.min(sx, mid); const h1b = Math.max(sx, mid);
    for (let x = h1a; x <= h1b; x++) cells.push({ x, y: sy, c: 'h' });
    const v1 = Math.min(sy, ey); const v2 = Math.max(sy, ey);
    for (let y = v1; y <= v2; y++) cells.push({ x: mid, y, c: 'v' });
    const h2a = Math.min(mid, ex); const h2b = Math.max(mid, ex);
    for (let x = h2a; x <= h2b; x++) cells.push({ x, y: ey, c: 'h' });
    return markCorners(cells);
  }
  // Overlap without a gap: detour right.
  const dx = Math.max(a.x + a.w, b.x + b.w) + 2;
  for (let x = Math.min(a.x + a.w, dx); x <= Math.max(a.x + a.w, dx); x++) cells.push({ x, y: ay, c: 'h' });
  for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) cells.push({ x: dx, y, c: 'v' });
  for (let x = Math.min(b.x + b.w, dx); x <= Math.max(b.x + b.w, dx); x++) cells.push({ x, y: by, c: 'h' });
  return markCorners(cells);
}

function markCorners(cells) {
  const at = new Map(cells.map((c) => [`${c.x},${c.y}`, c]));
  const out = [];
  for (const c of cells) {
    const h = (dx, dy) => { const n = at.get(`${c.x + dx},${c.y + dy}`); return !!n; };
    const horiz = h(1, 0) || h(-1, 0);
    const vert = h(0, 1) || h(0, -1);
    if (horiz && vert) out.push({ x: c.x, y: c.y, c: 'x' });
    else if (vert && !horiz) out.push({ x: c.x, y: c.y, c: 'v' });
    else out.push({ x: c.x, y: c.y, c: 'h' });
  }
  // Dedupe (the three segments share the corner cells).
  const seen = new Set();
  return out.filter((c) => {
    const k = `${c.x},${c.y},${c.c}`;
    if (seen.has(`${c.x},${c.y}`)) {
      // Keep the corner mark over a straight mark.
      return false;
    }
    seen.add(`${c.x},${c.y}`);
    void k;
    return true;
  });
}

export function clampCam(x, y, worldW, worldH, vw, vh) {
  return {
    x: Math.max(0, Math.min(Math.max(0, worldW - vw), Math.round(x))),
    y: Math.max(0, Math.min(Math.max(0, worldH - vh), Math.round(y))),
  };
}

export function centreFor(id, pos, vw, vh, worldW, worldH) {
  const p = pos.get(id);
  if (!p) return null;
  const cx = p.x + Math.floor(p.w / 2) - Math.floor(vw / 2);
  const cy = p.y + Math.floor(p.h / 2) - Math.floor(vh / 2);
  return clampCam(cx, cy, worldW, worldH, vw, vh);
}

// Keyboard selection helper: the node whose centre is nearest the viewport
// centre. Lets an arrow-key panner press ENTER to grab whatever drifted under
// the crosshair without touching the mouse.
export function nearestToCentre(pos, camX, camY, vw, vh) {
  const cx = camX + vw / 2;
  const cy = camY + vh / 2;
  let best = null;
  let bestD = Infinity;
  for (const [id, p] of pos) {
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    const d = (px - cx) * (px - cx) + (py - cy) * (py - cy);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}

export function flowLabel(node, maxW) {
  const s = toScreenText(node?.simple_name ?? node?.name ?? '?');
  if (s.length <= maxW) return s;
  if (maxW <= 3) return s.slice(0, maxW);
  return s.slice(0, maxW - 1) + '.';
}
