import { C, UI } from './palette.js';
import { BOX, SOLID, toScreenText } from './petscii.js';
import { TextMode, COLS, ROWS, wrapText } from './textmode.js';
import { childLines, layoutTreeBoxes, planTreePanel, groupRouted, groupRails, trunkSpan, visibleWindow, clampStart, ensureCursorVisible, connectionsOf, nodeContent } from './treeview.js';
import { renderElements, stepCursor, cellFromXY, elementAt } from './periodictable.js';
import { INTRO_STEPS, INTRO_CHAIN, INTRO_KEY, renderIntro, chainTrail } from './intro.js';
import { CAT_ORDER, catColor, FLOW_ZOOMS, FLOW_NODE_H, FLOW_COL_GAP, FLOW_ROW_GAP, buildFlowGraph, computeTiers, layoutFlow, edgeCellsFor, clampCam, centreFor, nearestToCentre, flowLabel } from './flowview.js';

const LEFT = { x: 1, y: 1, w: 78, h: 42 };

const state = {
  selected: 'c64',
  nodes: {},
  meta: null,
  parents: {},
  cursor: true,
  err: '',
  path: [],
  treeCursor: 0,
  treeScroll: 0,
  nodeScroll: 0,
  tab: 'tree',
  elCur: { p: 4, g: 8 },
  flow: { x: 0, y: 0, zoom: 1, init: false },
  intro: { active: false, step: 0 },
};

let tm = null;
let backHit = null;
let treeChildHits = [];
let flowHits = [];
let flowDrag = null;
let flowCache = null;
let viewTreeHit = null;
let minimapGeom = null;
let nodeBox = null;
let tabHits = [];
let animating = false;
let animFrame = null;
let introHits = null;

function U(s) {
  return toScreenText(s);
}

function box(x, y, w, h, fg, bg, title) {
  tm.set(x, y, BOX.TL, fg, bg);
  tm.set(x + w - 1, y, BOX.TR, fg, bg);
  tm.set(x, y + h - 1, BOX.BL, fg, bg);
  tm.set(x + w - 1, y + h - 1, BOX.BR, fg, bg);
  for (let i = 1; i < w - 1; i++) {
    tm.set(x + i, y, BOX.H, fg, bg);
    tm.set(x + i, y + h - 1, BOX.H, fg, bg);
  }
  for (let j = 1; j < h - 1; j++) {
    tm.set(x, y + j, BOX.V, fg, bg);
    tm.set(x + w - 1, y + j, BOX.V, fg, bg);
  }
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) tm.set(x + i, y + j, 32, fg, bg);
  }
  if (title) {
    const t = ' ' + U(title).slice(0, w - 4) + ' ';
    tm.text(x + 2, y, t, C.YELLOW, bg);
  }
}

// Note-node frame: solid sides and corners like box(), but the top and
// bottom borders run dashed (2 on, 1 off) so commentary stands apart from
// things without changing the footprint.
function dashBox(x, y, w, h, fg, bg) {
  tm.set(x, y, BOX.TL, fg, bg);
  tm.set(x + w - 1, y, BOX.TR, fg, bg);
  tm.set(x, y + h - 1, BOX.BL, fg, bg);
  tm.set(x + w - 1, y + h - 1, BOX.BR, fg, bg);
  for (let i = 1; i < w - 1; i++) {
    const dash = (i % 3 !== 0);
    tm.set(x + i, y, dash ? BOX.H : 32, fg, bg);
    tm.set(x + i, y + h - 1, dash ? BOX.H : 32, fg, bg);
  }
  for (let j = 1; j < h - 1; j++) {
    tm.set(x, y + j, BOX.V, fg, bg);
    tm.set(x + w - 1, y + j, BOX.V, fg, bg);
  }
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) tm.set(x + i, y + j, 32, fg, bg);
  }
}

// Commodore rainbow, left to right. BLUE is swapped for LTBLUE so the last
// band stays visible against the blue panel background.
const RAINBOW = [C.RED, C.ORANGE, C.YELLOW, C.GREEN, C.LTBLUE];

function rainbowBox(x, y, w, h) {
  const bg = UI.BG;
  const band = (i) => RAINBOW[Math.min(RAINBOW.length - 1, Math.floor((i / w) * RAINBOW.length))];
  for (let i = 0; i < w; i++) {
    const fg = band(i);
    tm.set(x + i, y, i === 0 ? BOX.TL : i === w - 1 ? BOX.TR : BOX.H, fg, bg);
    tm.set(x + i, y + h - 1, i === 0 ? BOX.BL : i === w - 1 ? BOX.BR : BOX.H, fg, bg);
  }
  for (let j = 1; j < h - 1; j++) {
    tm.set(x, y + j, BOX.V, band(0), bg);
    tm.set(x + w - 1, y + j, BOX.V, band(w - 1), bg);
  }
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) tm.set(x + i, y + j, 32, band(i), bg);
  }
}

function centerText(y, str, fg, bg) {
  const s = U(str).slice(0, COLS);
  const x = Math.max(0, Math.floor((COLS - s.length) / 2));
  tm.text(x, y, s, fg, bg);
}

function renderTitle() {
  tm.fillRect(0, 0, COLS, 1, 32, C.WHITE, UI.BG);
  let tx = 2;
  for (const color of RAINBOW) {
    tm.set(tx++, 0, SOLID, color, UI.BG);
  }
  tx += 1;
  const title = 'C64 SUPPLY CHAIN';
  tm.text(tx, 0, title, C.WHITE, UI.BG);
  tabHits = [];
  const tabs = [
    { id: 'tree', label: '[TREE]' },
    { id: 'flow', label: '[FLOW]' },
    { id: 'elements', label: '[ELEMENTS]' },
    { id: 'intro', label: '[INTRO]' },
  ];
  let x = COLS - 2;
  for (let i = tabs.length - 1; i >= 0; i--) {
    const t = tabs[i];
    const on = t.id === 'intro' ? state.intro.active : (!state.intro.active && state.tab === t.id);
    x -= t.label.length;
    tm.text(x, 0, U(t.label), on ? C.BLACK : C.LTBLUE, on ? C.LTGREY : UI.BG);
    tabHits.push({ x0: x, x1: x + t.label.length - 1, y: 0, id: t.id });
    x -= 1;
  }
}

const TREE = {
  tx: 2, ty: 4, tw: 26,
  trunkX: 34,
  cx0: 36, cw: 42,
  pathY: 2,
  statY: 3,
  kidsY: 4,
  nx: 2, nw: 26,
};

// Flow viewport: left column (selected + map) keeps the tree tab's 26-wide
// footprint; the world window takes everything to its right.
const FLOWVIEW = { vx0: 29, vy0: 3, vw: 49, vh: 39 };
// Viewport background. The rails stay C64 BLUE; the world window goes BLACK
// so category colours read against it instead of the panel.
const FLOW_BG = C.BLACK;
const FLOW_LEFT_W = 26;

// The only connection set the C64 viewer speaks now: the classic "supply
// chain" mode (children + contains/made of/made from/step/consumes +
// from/made_by). Both tabs share it, so every flow edge is also a tree
// connection and BFS parents always resolve to walkable trails.
const SUPPLY_RELS = new Set(['contains', 'made of', 'made from', 'step', 'consumes']);

function kidsFor(id) {
  const node = state.nodes[id];
  if (!node) return [];
  // Supply links only (locked: the F2 edge menu is gone). Children are the
  // refinement backbone; typed edges + from/made_by are the supply line.
  // Keeping one fixed connection set is what lets the flow tab rebuild the
  // click path as a structural root-to-node trail instead of click history.
  const conns = groupRouted(connectionsOf(node, state.nodes, SUPPLY_RELS, { chain: true }))
    .filter((c) => c.id !== 'unlinked.catalogue');
  return conns.map(({ id, routed, via }) => ({
    id,
    simple_name: state.nodes[id]?.simple_name ?? state.nodes[id]?.name ?? id,
    kind: state.nodes[id]?.kind,
    routed,
    via: routed ? via : null,
  }));
}

function treeKids() {
  return kidsFor(state.selected);
}

function trackedName() {
  const n = state.nodes[state.selected];
  return n?.simple_name ?? n?.name ?? state.selected;
}

function renderLeft() {
  box(LEFT.x, LEFT.y, LEFT.w, LEFT.h, UI.FRAME_FG, UI.BG, 'TREE');
  treeChildHits = [];
  backHit = null;
  nodeBox = null;
  const ix1 = LEFT.x + LEFT.w - 2;
  const iy1 = LEFT.y + LEFT.h - 2;
  const n = state.nodes[state.selected];
  if (!n) {
    tm.text(LEFT.x + 1, TREE.pathY, U(state.err || 'LOADING...'), C.LTRED, UI.BG, LEFT.w - 2);
    return;
  }
  const tName = U(trackedName());
  const kids = treeKids();

  const crumbs = [...state.path.map((id) => U(state.nodes[id]?.simple_name ?? id)), tName].join('>');
  const maxCrumb = ix1 - 9;
  const tail = crumbs.length > maxCrumb ? crumbs.slice(crumbs.length - maxCrumb) : crumbs;
  tm.text(LEFT.x + 1, TREE.pathY, U('[BACK]'), C.BLACK, C.LTGREY);
  backHit = { x0: LEFT.x + 1, x1: LEFT.x + 6, y: TREE.pathY };
  tm.text(LEFT.x + 8, TREE.pathY, tail, C.GREY, UI.BG, maxCrumb);

  const connLine = U(`${kids.length} CONN`);
  tm.text(TREE.cx0, TREE.statY, connLine, C.GREY, UI.BG, 12);

  const nameLines = childLines(tName, TREE.tw - 4, 3);
  const th = nameLines.length + 2;
  const tMid = TREE.ty + Math.floor((th - 1) / 2);
  if (state.selected === (state.meta?.root ?? 'c64')) rainbowBox(TREE.tx, TREE.ty, TREE.tw, th);
  else if (n.kind === 'note') dashBox(TREE.tx, TREE.ty, TREE.tw, th, catColor(n.category), UI.BG);
  else box(TREE.tx, TREE.ty, TREE.tw, th, catColor(n.category), UI.BG);
  nameLines.forEach((ln, i) => {
    tm.text(TREE.tx + 2, TREE.ty + 1 + i, ln, C.WHITE, UI.BG, TREE.tw - 4);
  });

  const nodeNy = TREE.ty + th + 1;
  const nodeNh = iy1 - nodeNy + 1;
  if (nodeNh >= 4) {
    box(TREE.nx, nodeNy, TREE.nw, nodeNh, UI.FRAME_FG, UI.BG, 'NODE');
    const nix = TREE.nx + 1;
    const niw = TREE.nw - 2;
    const ny0 = nodeNy + 1;
    const nmax = nodeNy + nodeNh - 2 - ny0 + 1;
    const L = nodeContent(n, niw);
    state.nodeScroll = Math.min(Math.max(0, state.nodeScroll), Math.max(0, L.length - nmax));
    const nwin = L.slice(state.nodeScroll, state.nodeScroll + nmax);
    let ny = ny0;
    for (const row of nwin) {
      if (row.t === 'SEP') {
        for (let i = 0; i < niw; i++) tm.set(nix + i, ny, BOX.H, C.GREY, UI.BG);
      } else {
        tm.text(nix, ny, row.t, row.fg, UI.BG, niw);
      }
      ny++;
    }
    if (state.nodeScroll > 0) tm.text(nix + niw - 5, ny0, U('^MORE'), C.GREY, UI.BG, 6);
    if (state.nodeScroll + nmax < L.length) tm.text(nix + niw - 5, ny0 + nmax - 1, U('vMORE'), C.GREY, UI.BG, 6);
    nodeBox = { x0: TREE.nx, x1: TREE.nx + TREE.nw - 1, y0: nodeNy, y1: nodeNy + nodeNh - 1 };
  }

  if (!kids.length) {
    tm.text(TREE.cx0, TREE.kidsY + 2, U('(END OF LINE)'), C.GREY, UI.BG, TREE.cw - 2);
    return;
  }

  const textW = TREE.cw - 4;
  const subW = textW - 2;
  const boxes = layoutTreeBoxes(kids, textW);
  const maxRows = iy1 - TREE.kidsY + 1;
  state.treeScroll = clampStart(state.treeScroll, boxes.length);
  const win = visibleWindow(boxes, state.treeScroll, maxRows, 1);

  let y = TREE.kidsY;
  const drawn = [];
  const drawnById = new Map();
  for (const b of planTreePanel(kids, win.visible, TREE.cx0, TREE.cw)) {
    const isCur = b.index === state.treeCursor;
    const btw = b.grouped ? subW : textW;
    const bc = catColor(state.nodes[b.id]?.category);
    if (b.kind === 'note') dashBox(b.bx, y, b.bw, b.h, bc, UI.BG);
    else box(b.bx, y, b.bw, b.h, bc, UI.BG);
    b.lines.forEach((ln, i) => {
      tm.text(b.bx + 2, y + 1 + i, ln, isCur ? C.WHITE : C.GREY, UI.BG, btw);
    });
    const mid = y + Math.floor(b.h / 2);
    const d = { ...b, y, mid };
    drawn.push(d);
    drawnById.set(b.id, d);
    treeChildHits.push({ y0: y, y1: y + b.h - 1, id: b.id, index: b.index, x0: b.bx, x1: b.bx + b.bw - 1 });
    y += b.h + 1;
  }

  if (win.hasMoreAbove) tm.text(ix1 - 5, TREE.kidsY, U('^MORE'), C.GREY, UI.BG, 6);
  if (win.hasMoreBelow) tm.text(ix1 - 5, iy1, U('vMORE'), C.GREY, UI.BG, 6);

  const { lo, hi: hiAnchor } = trunkSpan(tMid, drawn);
  // The trunk serves direct connections only: extend past the window only
  // when a direct box waits below. Grouped children belong to their
  // parent's rail, so a window ending mid-group still terminates here.
  const lastVis = win.visible.length ? win.visible[win.visible.length - 1].index : -1;
  const moreDirectBelow = boxes.slice(lastVis + 1).some((b) => !b.sub);
  const hi = moreDirectBelow ? iy1 : hiAnchor;
  for (let r = lo; r <= hi; r++) tm.set(TREE.trunkX, r, BOX.V, C.GREY, UI.BG);
  for (let x = TREE.tx + TREE.tw; x < TREE.trunkX; x++) tm.set(x, tMid, BOX.H, C.GREY, UI.BG);
  tm.set(TREE.trunkX, tMid, BOX.X, C.GREY, UI.BG);
  for (const d of drawn) {
    if (d.grouped) continue;
    for (let x = TREE.trunkX + 1; x < TREE.cx0; x++) tm.set(x, d.mid, BOX.H, C.GREY, UI.BG);
    tm.set(TREE.trunkX, d.mid, BOX.X, C.GREY, UI.BG);
  }
  // Routed boxes hang off their parent process: a rail drops from the
  // parent's bottom-left corner (or the window top when the parent has
  // scrolled out), with a junction into each grouped child.
  const { rails, links } = groupRails(drawn, drawnById, TREE.kidsY, TREE.cx0);
  for (const r of rails) {
    for (let y = r.y0; y <= r.y1; y++) tm.set(r.x, y, BOX.V, C.GREY, UI.BG);
  }
  for (const l of links) {
    tm.set(l.x, l.y, BOX.X, C.GREY, UI.BG);
    tm.set(l.x + 1, l.y, BOX.H, C.GREY, UI.BG);
  }
}

// ------------------------------------------------------------ flow view
// See flowview.js for the layout contract. The left rail holds the selected
// node, a jump button, and a condensed whole-world map; the widened world
// window takes everything to its right. Only the selected node's direct
// edges are drawn: with 15 tiers and up to 514 nodes in one tier, drawing
// everything would be solid overlapping lines in text mode.

function getFlowLayout() {
  const key = `supply|${state.flow.zoom}`;
  if (flowCache && flowCache.key === key && flowCache.n === Object.keys(state.nodes).length) return flowCache;
  const { succ, par } = buildFlowGraph(state.nodes, SUPPLY_RELS, true);
  const root = state.meta?.root ?? 'c64';
  const { depth, parent, maxD } = computeTiers(succ, root);
  const zoom = FLOW_ZOOMS[state.flow.zoom] ?? FLOW_ZOOMS[1];
  const { pos, headers, worldW, worldH, byTier, xOf } = layoutFlow(state.nodes, depth, maxD, {
    nodeW: zoom.nodeW, nodeH: FLOW_NODE_H, colGap: FLOW_COL_GAP, rowGap: FLOW_ROW_GAP,
  });
  repairCanonicalParents(depth, parent, par, root);
  flowCache = { key, n: Object.keys(state.nodes).length, succ, par, depth, parent, maxD, pos, headers, worldW, worldH, byTier, xOf, nodeW: zoom.nodeW };
  return flowCache;
}

// Prefer the shallowest predecessor the tree panel actually lists as a
// canonical parent. Route-through lifting can swallow a process/tool link
// (marked seen during the lift but never emitted as a row), leaving a BFS
// parent whose step has no visible row. Each repair is verified to still
// reach the root, so trails stay acyclic.
function repairCanonicalParents(depth, parent, predecessors, root) {
  const listers = new Map();
  for (const [pid] of depth) {
    const node = state.nodes[pid];
    if (!node) continue;
    for (const c of groupRouted(connectionsOf(node, state.nodes, SUPPLY_RELS, { chain: true }))) {
      if (c.id === 'unlinked.catalogue') continue;
      if (!listers.has(c.id)) listers.set(c.id, new Set());
      listers.get(c.id).add(pid);
    }
  }
  for (const [id, par0] of [...parent]) {
    if (listers.get(id)?.has(par0)) continue;
    let best = null;
    for (const cand of predecessors.get(id) ?? []) {
      if (cand === id || !depth.has(cand)) continue;
      if (!listers.get(id)?.has(cand)) continue;
      if (best === null || depth.get(cand) < depth.get(best)) best = cand;
    }
    if (best === null) continue;
    const seen = new Set([id, best]);
    let cur = best;
    let ok = best === root;
    while (!ok) {
      const nx = parent.get(cur);
      if (!nx || seen.has(nx)) break;
      if (nx === root) { ok = true; break; }
      seen.add(nx);
      cur = nx;
      if (seen.size > 600) break;
    }
    if (ok) parent.set(id, best);
  }
}

function clampFlowCam() {
  const L = getFlowLayout();
  const c = clampCam(state.flow.x, state.flow.y, L.worldW, L.worldH, FLOWVIEW.vw, FLOWVIEW.vh);
  state.flow.x = c.x;
  state.flow.y = c.y;
}

function flowCentreOn(id) {
  const L = getFlowLayout();
  const c = centreFor(id, L.pos, FLOWVIEW.vw, FLOWVIEW.vh, L.worldW, L.worldH);
  if (c) { state.flow.x = c.x; state.flow.y = c.y; }
}

// Rebuild the click-history trail as the structural root-to-node trail from
// the BFS parents, so BACK walks up the tree instead of replaying clicks and
// the tree tab opens on the node's real position. Only valid because both
// tabs share the locked supply connection set: every BFS parent link is also
// a listed tree connection.
function setCanonicalPath(id) {
  const L = getFlowLayout();
  const root = state.meta?.root ?? 'c64';
  if (!id || !state.nodes[id]) return;
  if (id === root) { state.path = []; return; }
  // Degraded trails clear instead of going stale: a wrong breadcrumb is
  // worse than a short one. The repair pass above makes this unreachable in
  // practice (every BFS parent is verified or replaced).
  const trail = [];
  const seen = new Set([id]);
  let cur = id;
  while (cur !== root) {
    const p = L.parent?.get(cur);
    if (!p || seen.has(p)) { state.path = []; return; }
    trail.unshift(p);
    seen.add(p);
    cur = p;
    if (trail.length > 500) { state.path = []; return; }
  }
  state.path = trail;
}

function flowGoTree() {
  state.treeCursor = 0;
  state.treeScroll = 0;
  setTab('tree');
}

function flowPan(dx, dy) {
  const L = getFlowLayout();
  const c = clampCam(state.flow.x + dx, state.flow.y + dy, L.worldW, L.worldH, FLOWVIEW.vw, FLOWVIEW.vh);
  state.flow.x = c.x;
  state.flow.y = c.y;
  render();
}

function flowZoom(d) {
  const nz = Math.min(FLOW_ZOOMS.length - 1, Math.max(0, state.flow.zoom + d));
  if (nz === state.flow.zoom) return;
  state.flow.zoom = nz;
  flowCache = null;
  // Keep the selection under the viewport when the box width changes.
  if (state.selected) flowCentreOn(state.selected);
  clampFlowCam();
  render();
}

function flowSelectCentre() {
  const L = getFlowLayout();
  const id = nearestToCentre(L.pos, state.flow.x, state.flow.y, FLOWVIEW.vw, FLOWVIEW.vh);
  if (id) { setCanonicalPath(id); track(id, false); }
}

function inFlowView(sx, sy) {
  return sx >= FLOWVIEW.vx0 && sx < FLOWVIEW.vx0 + FLOWVIEW.vw && sy >= FLOWVIEW.vy0 && sy < FLOWVIEW.vy0 + FLOWVIEW.vh;
}

function flowBoxAt(sx, sy, w, h, fg, bg, isRoot) {
  if (w < 2 || h < 2) return;
  const put = (x, y, code, f) => { if (inFlowView(x, y)) tm.set(x, y, code, f, bg); };
  if (isRoot) {
    const RAIN = [C.RED, C.ORANGE, C.YELLOW, C.GREEN, C.LTBLUE];
    const band = (i) => RAIN[Math.min(RAIN.length - 1, Math.floor((i / w) * RAIN.length))];
    for (let i = 0; i < w; i++) {
      put(sx + i, sy, i === 0 ? BOX.TL : i === w - 1 ? BOX.TR : BOX.H, band(i));
      put(sx + i, sy + h - 1, i === 0 ? BOX.BL : i === w - 1 ? BOX.BR : BOX.H, band(i));
    }
    for (let j = 1; j < h - 1; j++) {
      put(sx, sy + j, BOX.V, band(0), bg);
      put(sx + w - 1, sy + j, BOX.V, band(w - 1), bg);
    }
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) if (inFlowView(sx + i, sy + j)) tm.set(sx + i, sy + j, 32, fg, bg);
    return;
  }
  put(sx, sy, BOX.TL, fg); put(sx + w - 1, sy, BOX.TR, fg);
  put(sx, sy + h - 1, BOX.BL, fg); put(sx + w - 1, sy + h - 1, BOX.BR, fg);
  for (let i = 1; i < w - 1; i++) { put(sx + i, sy, BOX.H, fg); put(sx + i, sy + h - 1, BOX.H, fg); }
  for (let j = 1; j < h - 1; j++) { put(sx, sy + j, BOX.V, fg); put(sx + w - 1, sy + j, BOX.V, fg); }
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) if (inFlowView(sx + i, sy + j)) tm.set(sx + i, sy + j, 32, fg, bg);
}

// Viewport twin of dashBox(): note frames stay dashed inside the pannable
// world too. Same 2-on-1-off top/bottom rhythm, clipped to the window.
function flowDashBoxAt(sx, sy, w, h, fg, bg) {
  if (w < 2 || h < 2) return;
  const put = (x, y, code, f) => { if (inFlowView(x, y)) tm.set(x, y, code, f, bg); };
  put(sx, sy, BOX.TL, fg); put(sx + w - 1, sy, BOX.TR, fg);
  put(sx, sy + h - 1, BOX.BL, fg); put(sx + w - 1, sy + h - 1, BOX.BR, fg);
  for (let i = 1; i < w - 1; i++) {
    const dash = (i % 3 !== 0);
    put(sx + i, sy, dash ? BOX.H : 32, fg);
    put(sx + i, sy + h - 1, dash ? BOX.H : 32, fg);
  }
  for (let j = 1; j < h - 1; j++) { put(sx, sy + j, BOX.V, fg); put(sx + w - 1, sy + j, BOX.V, fg); }
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) if (inFlowView(sx + i, sy + j)) tm.set(sx + i, sy + j, 32, fg, bg);
}

// Condensed whole-world map for the flow tab's left rail. One character per
// tier horizontally (raw left, C64 right, matching the world); vertically the
// world height is squashed into the box. Each cell takes the colour of the
// category with the most nodes in its bucket. BROWN is used by no category,
// so the viewport-centre marker flashing in BROWN can never be mistaken for
// data. Clicking a cell recentres the world window on that tier/height.
function renderMinimap(mapX, mapY, maxW, mapH) {
  minimapGeom = null;
  if (mapH < 5) return;
  const L = getFlowLayout();
  const { pos, maxD, worldH, xOf, nodeW } = L;
  if (!pos.size) return;
  // Shrink-wrap the panel to the tier count: one character per tier plus the
  // two border columns, instead of the full left-rail width.
  const mw = Math.min(maxD + 1, maxW - 2);
  if (mw <= 0) return;
  const mapW = mw + 2;
  box(mapX, mapY, mapW, mapH, UI.FRAME_FG, UI.BG, 'MAP');
  const ix0 = mapX + 1;
  const iy0 = mapY + 1;
  const ih = mapH - 2;
  if (ih <= 0) return;
  const xOff = 0;
  // Bucket counts: mw columns x ih rows, per category.
  const buckets = [];
  for (let i = 0; i < mw * ih; i++) buckets.push(null);
  for (const [, p] of pos) {
    const mx = (maxD - p.tier) - xOff;
    if (mx < 0 || mx >= mw) continue;
    const my = Math.min(ih - 1, Math.max(0, Math.floor(((p.y + p.h / 2) / worldH) * ih)));
    const b = buckets[my * mw + mx] ?? (buckets[my * mw + mx] = {});
    b[p.cat] = (b[p.cat] ?? 0) + 1;
  }
  const rank = new Map(CAT_ORDER.map((c, i) => [c, i]));
  for (let my = 0; my < ih; my++) {
    for (let mx = 0; mx < mw; mx++) {
      const b = buckets[my * mw + mx];
      if (!b) continue;
      let best = null;
      let bestN = -1;
      for (const [cat, cnt] of Object.entries(b)) {
        const r = rank.has(cat) ? rank.get(cat) : 999;
        const br = best === null ? 1000 : rank.has(best) ? rank.get(best) : 999;
        if (cnt > bestN || (cnt === bestN && r < br)) { best = cat; bestN = cnt; }
      }
      if (best !== null) tm.set(ix0 + mx, iy0 + my, 32, C.BLACK, catColor(best));
    }
  }
  // Viewport-centre marker, flashing with the shared text cursor.
  const ccx = state.flow.x + FLOWVIEW.vw / 2;
  const ccy = state.flow.y + FLOWVIEW.vh / 2;
  let tier = 0;
  let bestD = Infinity;
  for (let d = 0; d <= maxD; d++) {
    const centre = xOf(d) + nodeW / 2;
    const dist = Math.abs(centre - ccx);
    if (dist < bestD) { bestD = dist; tier = d; }
  }
  const mmx = (maxD - tier) - xOff;
  const mmy = Math.min(ih - 1, Math.max(0, Math.floor((ccy / worldH) * ih)));
  if (state.cursor && mmx >= 0 && mmx < mw) {
    tm.set(ix0 + mmx, iy0 + mmy, SOLID, C.BROWN, C.BROWN);
  }
  minimapGeom = { x0: ix0, y0: iy0, mw, mh: ih, maxD, worldH, xOf, nodeW };
}

function flowGoMap(mx, my) {
  const g = minimapGeom;
  if (!g) return;
  const tier = g.maxD - mx;
  if (tier < 0 || tier > g.maxD) return;
  const wx = g.xOf(tier) + g.nodeW / 2;
  const wy = ((my + 0.5) / g.mh) * g.worldH;
  const c = clampCam(wx - FLOWVIEW.vw / 2, wy - FLOWVIEW.vh / 2, getFlowLayout().worldW, g.worldH, FLOWVIEW.vw, FLOWVIEW.vh);
  state.flow.x = c.x;
  state.flow.y = c.y;
  render();
}

function renderFlow() {
  box(LEFT.x, LEFT.y, LEFT.w, LEFT.h, UI.FRAME_FG, UI.BG, 'FLOW');
  flowHits = [];
  backHit = null;
  viewTreeHit = null;
  minimapGeom = null;
  nodeBox = null;
  const ix1 = LEFT.x + LEFT.w - 2;
  const iy1 = LEFT.y + LEFT.h - 2;
  const n = state.nodes[state.selected];
  if (!n || !Object.keys(state.nodes).length) {
    tm.text(LEFT.x + 1, TREE.pathY, U(state.err || 'LOADING...'), C.LTRED, UI.BG, LEFT.w - 2);
    return;
  }
  const tName = U(trackedName());
  const crumbs = [...state.path.map((id) => U(state.nodes[id]?.simple_name ?? id)), tName].join('>');
  const maxCrumb = ix1 - 9;
  const tail = crumbs.length > maxCrumb ? crumbs.slice(crumbs.length - maxCrumb) : crumbs;
  tm.text(LEFT.x + 1, TREE.pathY, U('[BACK]'), C.BLACK, C.LTGREY);
  backHit = { x0: LEFT.x + 1, x1: LEFT.x + 6, y: TREE.pathY };
  tm.text(LEFT.x + 8, TREE.pathY, tail, C.GREY, UI.BG, maxCrumb);

  const nameLines = childLines(tName, TREE.tw - 4, 3);
  const th = nameLines.length + 2;
  if (state.selected === (state.meta?.root ?? 'c64')) rainbowBox(TREE.tx, TREE.ty, TREE.tw, th);
  else if (n.kind === 'note') dashBox(TREE.tx, TREE.ty, TREE.tw, th, catColor(n.category), UI.BG);
  else box(TREE.tx, TREE.ty, TREE.tw, th, catColor(n.category), UI.BG);
  nameLines.forEach((ln, i) => {
    tm.text(TREE.tx + 2, TREE.ty + 1 + i, ln, C.WHITE, UI.BG, TREE.tw - 4);
  });

  // Left rail: jump button + condensed whole-world map. The old NODE prose
  // panel lives in the tree tab; here the column is navigation only.
  const btnY = TREE.ty + th + 1;
  const btnLabel = U('[VIEW NODE IN TREE]');
  tm.text(TREE.tx + 2, btnY, btnLabel, C.BLACK, C.LTGREY, btnLabel.length);
  viewTreeHit = { x0: TREE.tx + 2, x1: TREE.tx + 2 + btnLabel.length - 1, y: btnY };

  const L = getFlowLayout();
  clampFlowCam();
  const { pos, headers } = L;
  const cx = state.flow.x; const cy = state.flow.y;
  const toSx = (wx) => FLOWVIEW.vx0 + (wx - cx);
  const toSy = (wy) => FLOWVIEW.vy0 + (wy - cy);

  renderMinimap(TREE.tx, btnY + 2, FLOW_LEFT_W, iy1 - (btnY + 2) + 1);

  const zoom = FLOW_ZOOMS[state.flow.zoom] ?? FLOW_ZOOMS[1];

  if (!pos.size) {
    tm.text(FLOWVIEW.vx0, FLOWVIEW.vy0 + 2, U('(NO NODES IN THIS MODE)'), C.GREY, FLOW_BG, FLOWVIEW.vw);
    return;
  }

  // Black out the world window first; everything below draws onto it.
  tm.fillRect(FLOWVIEW.vx0, FLOWVIEW.vy0, FLOWVIEW.vw, FLOWVIEW.vh, 32, C.GREY, FLOW_BG);

  // The canonical trail to the root: selected node up through its BFS parents.
  // This is the same trail BACK walks and the tree tab opens on, so the view
  // and the navigation never disagree about where the node sits.
  const edgeFg = C.YELLOW;
  const drawEdgeCells = (cells) => {
    for (const c of cells) {
      const sx = toSx(c.x); const sy = toSy(c.y);
      if (!inFlowView(sx, sy)) continue;
      const code = c.c === 'v' ? BOX.V : c.c === 'x' ? BOX.X : BOX.H;
      tm.set(sx, sy, code, edgeFg, FLOW_BG);
    }
  };
  const trail = [...state.path, state.selected];
  for (let i = 0; i + 1 < trail.length; i++) {
    const a = pos.get(trail[i]);
    const b = pos.get(trail[i + 1]);
    if (!a || !b) continue;
    drawEdgeCells(edgeCellsFor(a, b));
  }

  // Headers: high-level category band (solid colour) then low-level subcat.
  for (const h of headers) {
    const sx = toSx(h.x); const sy = toSy(h.y);
    if (sy < FLOWVIEW.vy0 || sy >= FLOWVIEW.vy0 + FLOWVIEW.vh) continue;
    if (sx + h.w <= FLOWVIEW.vx0 || sx >= FLOWVIEW.vx0 + FLOWVIEW.vw) continue;
    if (h.kind === 'cat') {
      const bg = catColor(h.cat);
      for (let i = 0; i < h.w; i++) {
        const x = sx + i;
        if (x < FLOWVIEW.vx0 || x >= FLOWVIEW.vx0 + FLOWVIEW.vw) continue;
        tm.set(x, sy, 32, C.BLACK, bg);
      }
      const full = U(h.label).slice(0, h.w);
      const off = Math.max(0, FLOWVIEW.vx0 - sx);
      const vis = Math.min(full.length - off, FLOWVIEW.vx0 + FLOWVIEW.vw - Math.max(sx, FLOWVIEW.vx0));
      if (vis > 0) tm.text(Math.max(sx, FLOWVIEW.vx0), sy, full.slice(off, off + vis), C.BLACK, bg, vis);
    } else {
      const full = U('-' + h.label).slice(0, h.w);
      const off = Math.max(0, FLOWVIEW.vx0 - sx);
      const vis = Math.min(full.length - off, FLOWVIEW.vx0 + FLOWVIEW.vw - Math.max(sx, FLOWVIEW.vx0));
      if (vis > 0) tm.text(Math.max(sx, FLOWVIEW.vx0), sy, full.slice(off, off + vis), catColor(h.cat), FLOW_BG, vis);
    }
  }

  // Nodes: only the intersecting few are drawn (the world can be ~2000 rows).
  for (const [id, p] of pos) {
    const sx = toSx(p.x); const sy = toSy(p.y);
    if (sx + p.w <= FLOWVIEW.vx0 || sx >= FLOWVIEW.vx0 + FLOWVIEW.vw) continue;
    if (sy + p.h <= FLOWVIEW.vy0 || sy >= FLOWVIEW.vy0 + FLOWVIEW.vh) continue;
    const node = state.nodes[id];
    if (!node) continue;
    const isSel = id === state.selected;
    const isRoot = id === (state.meta?.root ?? 'c64');
    const fg = isSel ? C.WHITE : isRoot ? C.YELLOW : catColor(node.category);
    if (node.kind === 'note') {
      // Commentary keeps its dashed frame here too; a selected note goes
      // dashed-white so both signals survive.
      flowDashBoxAt(sx, sy, p.w, p.h, isSel ? C.WHITE : catColor(node.category), FLOW_BG);
    } else {
      flowBoxAt(sx, sy, p.w, p.h, isSel ? C.WHITE : catColor(node.category), FLOW_BG, isRoot && !isSel);
      if (isSel) {
        // Selection gets a bright frame on top of the category colour.
        flowBoxAt(sx, sy, p.w, p.h, C.WHITE, FLOW_BG, false);
      }
    }
    const label = flowLabel(node, p.w - 4);
    const lx = sx + 2;
    const ly = sy + 1;
    if (ly >= FLOWVIEW.vy0 && ly < FLOWVIEW.vy0 + FLOWVIEW.vh) {
      const off = Math.max(0, FLOWVIEW.vx0 - lx);
      const vis = Math.min(label.length - off, FLOWVIEW.vx0 + FLOWVIEW.vw - Math.max(lx, FLOWVIEW.vx0));
      if (vis > 0) tm.text(Math.max(lx, FLOWVIEW.vx0), ly, U(label).slice(off, off + vis), isSel ? C.WHITE : C.GREY, FLOW_BG, vis);
    }
    void fg;
    flowHits.push({ x0: Math.max(sx, FLOWVIEW.vx0), x1: Math.min(sx + p.w - 1, FLOWVIEW.vx0 + FLOWVIEW.vw - 1), y0: Math.max(sy, FLOWVIEW.vy0), y1: Math.min(sy + p.h - 1, FLOWVIEW.vy0 + FLOWVIEW.vh - 1), id });
  }

  // Coordinates overlay the world at the top-left corner: the tier/node
  // counts are gone (tiers read off the map width), so position + zoom is all
  // that stays. Drawn last so the text wins over any node behind it.
  const coord = U(`X${cx},Y${cy} ${zoom.label}`);
  tm.text(FLOWVIEW.vx0, FLOWVIEW.vy0, coord, C.GREY, FLOW_BG, Math.min(coord.length, FLOWVIEW.vw));

  // Edge-of-world hints, same vocabulary as the tree panel.
  if (cy > 0) tm.text(FLOWVIEW.vx0 + FLOWVIEW.vw - 6, FLOWVIEW.vy0, U('^MORE'), C.GREY, FLOW_BG, 6);
  if (cy + FLOWVIEW.vh < L.worldH) tm.text(FLOWVIEW.vx0 + FLOWVIEW.vw - 6, FLOWVIEW.vy0 + FLOWVIEW.vh - 1, U('vMORE'), C.GREY, FLOW_BG, 6);
  if (cx > 0) tm.text(FLOWVIEW.vx0, FLOWVIEW.vy0 + FLOWVIEW.vh - 1, U('<MORE'), C.GREY, FLOW_BG, 6);
  if (cx + FLOWVIEW.vw < L.worldW) tm.text(FLOWVIEW.vx0 + FLOWVIEW.vw - 6, FLOWVIEW.vy0 + FLOWVIEW.vh - 1, U('MORE>'), C.GREY, FLOW_BG, 6);
}

function renderBottom() {
  // Footer is key hints plus the version number only. The old F1/F3/F5/F7
  // settings toggles were never wired to any render path, so the whole
  // SETTINGS box went away and every tab grew into the freed rows.
  // Hidden during the intro: its key line already lives inside the frame,
  // and first-time viewers get just the one thing to focus on.
  if (state.intro.active) return;
  const help = state.tab === 'elements'
    ? 'ARROWS=CURSOR ENTER=SHOW TAB=SWITCH'
    : state.tab === 'flow'
      ? 'ARROWS=PAN ENTER=SELECT 0=ROOT +/-=ZOOM T=TREE'
      : 'UP/DN=CURSOR ENTER=OPEN LEFT=BACK 0=ROOT []=SCROLL';
  tm.text(2, ROWS - 1, U(help), C.GREY, UI.BG);
  tm.text(COLS - 8, ROWS - 1, U('v1.0.0'), C.LTBLUE, UI.BG);
}

function isIntroSeen() {
  try {
    return window.localStorage?.getItem(INTRO_KEY) === '1';
  } catch {
    // Storage blocked (private mode): show the tour; it will show again
    // next visit, which beats hiding it forever.
    return false;
  }
}

function markIntroSeen() {
  try {
    window.localStorage?.setItem(INTRO_KEY, '1');
  } catch { /* private mode: tour simply shows again next visit */ }
}

function startIntro(step = 0) {
  if (animating && animFrame !== null) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
    animating = false;
  }
  state.intro.active = true;
  state.intro.step = Math.min(INTRO_STEPS.length - 1, Math.max(0, step));
  render();
}

function exitIntro(markSeen = true) {
  if (markSeen) markIntroSeen();
  state.intro.active = false;
  introHits = null;
  render();
}

function introGo(step) {
  state.intro.step = Math.min(INTRO_STEPS.length - 1, Math.max(0, step));
  render();
}

function introNext() {
  if (state.intro.step >= INTRO_STEPS.length - 1) exitIntro(true);
  else introGo(state.intro.step + 1);
}

function introPrev() {
  if (state.intro.step > 0) introGo(state.intro.step - 1);
}

function introViewNode(id) {
  // Clicking a chain box (or V) leaves the tour and opens that node in the
  // tree on its chain trail: BACK climbs toward the C64 through the same
  // stops, and drilling back down re-traverses them. Never the old
  // C64-direct push, which skipped every stop in between.
  const step = INTRO_STEPS[state.intro.step];
  const vis = INTRO_CHAIN.slice(0, step?.count ?? 0);
  const target = (id && state.nodes[id])
    ? id
    : [...vis].reverse().find((c) => state.nodes[c.id])?.id ?? vis[vis.length - 1]?.id;
  exitIntro(true);
  if (!target || !state.nodes[target]) return;
  const L = getFlowLayout();
  state.tab = 'tree';
  state.path = chainTrail(target, {
    chainIds: INTRO_CHAIN.map((c) => c.id),
    root: state.meta?.root ?? 'c64',
    has: (nid) => !!state.nodes[nid],
    kidIds: (nid) => kidsFor(nid).map((k) => k.id),
    succ: L.succ,
    parent: L.parent,
  });
  state.selected = target;
  state.treeCursor = 0;
  state.treeScroll = 0;
  state.nodeScroll = 0;
  render();
}

function renderIntroPanel() {
  introHits = renderIntro(tm, state.intro.step, state.nodes, state.cursor);
  treeChildHits = [];
  flowHits = [];
  backHit = null;
  viewTreeHit = null;
  minimapGeom = null;
  nodeBox = null;
}

function render() {
  tm.clear(UI.BODY_FG, UI.BG);
  if (state.intro.active) {
    // No header, no tabs, no footer: first-time viewers focus on the one
    // thing. Stale tab targets are cleared so blank-chrome clicks do nothing.
    // The header [INTRO] tab replays the tour, which hides the header again.
    tabHits = [];
    renderIntroPanel();
  } else {
    renderTitle();
    if (state.tab === 'elements') {
      renderElements(tm, state.elCur, LEFT.h, state.nodes);
    } else if (state.tab === 'flow') {
      renderFlow();
    } else {
      renderLeft();
    }
  }
  renderBottom();
  tm.present();
}

// Tab switching never touches selected/path/cursors, so the tree panel is
// exactly where the user left it when they switch back. Entering flow centres
// the viewport on the selection (first visit centres the root).
function setTab(t) {
  if (t === 'intro') { startIntro(0); return; }
  if (t !== 'tree' && t !== 'elements' && t !== 'flow') return;
  if (animating && animFrame !== null) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
    animating = false;
  }
  state.tab = t;
  if (t === 'flow') {
    if (!state.flow.init) {
      state.flow.init = true;
      flowCentreOn(state.selected ?? state.meta?.root ?? 'c64');
    } else if (state.selected) {
      const L = getFlowLayout();
      if (!L.pos.has(state.selected)) flowCentreOn(state.meta?.root ?? 'c64');
    }
    clampFlowCam();
  }
  render();
}

function jumpToEvidence() {
  const el = elementAt(state.elCur.p, state.elCur.g);
  if (!el || !el.ev || !state.nodes[el.ev]) return;
  if (state.tab === 'elements') {
    state.tab = 'flow';
    state.flow.init = true;
    setCanonicalPath(el.ev);
    track(el.ev, false, { centreFlow: true });
  } else {
    state.tab = 'tree';
    track(el.ev);
  }
}

function track(id, push = true, opts = {}) {
  if (animating) return;
  if (!id || !state.nodes[id]) return;
  if (id === state.selected) {
    state.treeCursor = 0;
    state.treeScroll = 0;
    state.nodeScroll = 0;
    if (state.tab === 'flow' && (opts.centreFlow || push === 'centre')) flowCentreOn(id);
    render();
    return;
  }
  const src = push && state.tab === 'tree'
    ? treeChildHits.find((t) => t.id === id) ?? null
    : null;
  if (push) state.path.push(state.selected);
  state.selected = id;
  state.treeCursor = 0;
  state.treeScroll = 0;
  state.nodeScroll = 0;
  if (state.tab === 'flow' && opts.centreFlow) flowCentreOn(id);
  if (src) startTrackAnimation(src);
  else render();
}

function animDuration(s, dst) {
  const dy = Math.abs(s.y0 - dst.y0);
  const dx = Math.abs(s.x0 - dst.x0);
  return Math.min(750, Math.max(320, 320 + dy * 8 + dx * 2));
}

function drawAnimBase(tName) {
  box(LEFT.x, LEFT.y, LEFT.w, LEFT.h, UI.FRAME_FG, UI.BG, 'TREE');
  const ix1 = LEFT.x + LEFT.w - 2;
  const crumbs = [...state.path.map((pid) => U(state.nodes[pid]?.simple_name ?? pid)), tName].join('>');
  const maxCrumb = ix1 - 9;
  const tail = crumbs.length > maxCrumb ? crumbs.slice(crumbs.length - maxCrumb) : crumbs;
  tm.text(LEFT.x + 1, TREE.pathY, U('[BACK]'), C.BLACK, C.LTGREY);
  tm.text(LEFT.x + 8, TREE.pathY, tail, C.GREY, UI.BG, maxCrumb);
}

function drawAnimBox(x0, y0, x1, y1, fg, isRoot) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  if (w < 2 || h < 2) return;
  if (isRoot) rainbowBox(x0, y0, w, h);
  else box(x0, y0, w, h, fg, UI.BG);
}

// Shared box-flight driver. Forward (drill-down): left/top expand first,
// then right/bottom shrink. Reverse (step-up): right/bottom expand first,
// then left/top slide home. Empty box throughout; caller sets state before
// calling so the breadcrumb already shows the destination.
function animateBoxMove(s, dst, { fg, isRoot, tName, total, reverse = false }) {
  animating = true;
  treeChildHits = [];
  backHit = null;
  nodeBox = null;
  const t0 = performance.now();
  function frame(now) {
    if (!animating) return;
    const t = Math.min(1, (now - t0) / total);
    let r;
    if (!reverse) {
      if (t < 0.5) {
        const k = t / 0.5;
        r = {
          x0: Math.round(s.x0 + (dst.x0 - s.x0) * k),
          y0: Math.round(s.y0 + (dst.y0 - s.y0) * k),
          x1: s.x1,
          y1: s.y1,
        };
      } else {
        const k = (t - 0.5) / 0.5;
        r = {
          x0: dst.x0,
          y0: dst.y0,
          x1: Math.round(s.x1 + (dst.x1 - s.x1) * k),
          y1: Math.round(s.y1 + (dst.y1 - s.y1) * k),
        };
      }
    } else {
      if (t < 0.5) {
        const k = t / 0.5;
        r = {
          x0: s.x0,
          y0: s.y0,
          x1: Math.round(s.x1 + (dst.x1 - s.x1) * k),
          y1: Math.round(s.y1 + (dst.y1 - s.y1) * k),
        };
      } else {
        const k = (t - 0.5) / 0.5;
        r = {
          x0: Math.round(s.x0 + (dst.x0 - s.x0) * k),
          y0: Math.round(s.y0 + (dst.y0 - s.y0) * k),
          x1: dst.x1,
          y1: dst.y1,
        };
      }
    }
    tm.clear(UI.BODY_FG, UI.BG);
    renderTitle();
    drawAnimBase(tName);
    drawAnimBox(r.x0, r.y0, r.x1, r.y1, fg, isRoot);
    renderBottom();
    tm.present();
    if (t < 1) {
      animFrame = requestAnimationFrame(frame);
    } else {
      animating = false;
      animFrame = null;
      render();
    }
  }
  animFrame = requestAnimationFrame(frame);
}

function startTrackAnimation(src) {
  const tName = U(trackedName());
  const th = childLines(tName, TREE.tw - 4, 3).length + 2;
  const dst = { x0: TREE.tx, y0: TREE.ty, x1: TREE.tx + TREE.tw - 1, y1: TREE.ty + th - 1 };
  const s = { x0: src.x0, y0: src.y0, x1: src.x1, y1: src.y1 };
  const n = state.nodes[state.selected];
  const isRoot = state.selected === (state.meta?.root ?? 'c64');
  const fg = isRoot ? null : catColor(n?.category);
  animateBoxMove(s, dst, { fg, isRoot, tName, total: animDuration(s, dst), reverse: false });
}

function startBackAnimation(srcRect, dstRect, departingNode) {
  const tName = U(trackedName());
  // The flying box is the departing child, never the rainbow root frame.
  const fg = catColor(departingNode?.category);
  animateBoxMove(srcRect, dstRect, { fg, isRoot: false, tName, total: animDuration(srcRect, dstRect), reverse: true });
}

function startRootBlank() {
  const tName = U(trackedName());
  animating = true;
  treeChildHits = [];
  backHit = null;
  nodeBox = null;
  const t0 = performance.now();
  const total = 100;
  function frame(now) {
    if (!animating) return;
    const t = Math.min(1, (now - t0) / total);
    tm.clear(UI.BODY_FG, UI.BG);
    renderTitle();
    drawAnimBase(tName);
    renderBottom();
    tm.present();
    if (t < 1) {
      animFrame = requestAnimationFrame(frame);
    } else {
      animating = false;
      animFrame = null;
      render();
    }
  }
  animFrame = requestAnimationFrame(frame);
}

function goBack() {
  if (animating) return;
  const prev = state.path[state.path.length - 1];
  if (prev === undefined || !state.nodes[prev]) {
    if (state.path.length) state.path.pop();
    render();
    return;
  }
  if (state.tab === 'flow') {
    state.path.pop();
    state.selected = prev;
    state.treeCursor = 0;
    state.treeScroll = 0;
    state.nodeScroll = 0;
    flowCentreOn(prev);
    render();
    return;
  }
  const departingId = state.selected;
  const departingNode = state.nodes[departingId];
  // Source: the current top-left selected frame for the departing node.
  const srcName = U(departingNode?.simple_name ?? departingNode?.name ?? departingId);
  const srcTh = childLines(srcName, TREE.tw - 4, 3).length + 2;
  const srcRect = { x0: TREE.tx, y0: TREE.ty, x1: TREE.tx + TREE.tw - 1, y1: TREE.ty + srcTh - 1 };
  // Destination: where the departing node sits in the parent's connection
  // list. The view always opens at the top, so pre-scroll the parent state
  // until the target is in view, then fly the box home to it.
  const parentKids = kidsFor(prev);
  const idx = parentKids.findIndex((k) => k.id === departingId);
  if (idx < 0) {
    state.path.pop();
    state.selected = prev;
    state.treeCursor = 0;
    state.treeScroll = 0;
    state.nodeScroll = 0;
    render();
    return;
  }
  const textW = TREE.cw - 4;
  const boxes = layoutTreeBoxes(parentKids, textW);
  const maxRows = (LEFT.y + LEFT.h - 2) - TREE.kidsY + 1;
  const scroll = ensureCursorVisible(idx, 0, boxes, maxRows, 1);
  const win = visibleWindow(boxes, scroll, maxRows, 1);
  let y = TREE.kidsY;
  let dstRect = null;
  for (const b of planTreePanel(parentKids, win.visible, TREE.cx0, TREE.cw)) {
    if (b.index === idx) {
      dstRect = { x0: b.bx, y0: y, x1: b.bx + b.bw - 1, y1: y + b.h - 1 };
      break;
    }
    y += b.h + 1;
  }
  if (!dstRect) {
    state.path.pop();
    state.selected = prev;
    state.treeCursor = 0;
    state.treeScroll = 0;
    state.nodeScroll = 0;
    render();
    return;
  }
  state.path.pop();
  state.selected = prev;
  state.treeCursor = idx;
  state.treeScroll = scroll;
  state.nodeScroll = 0;
  startBackAnimation(srcRect, dstRect, departingNode);
}

function goRoot() {
  if (animating) return;
  const root = state.meta?.root ?? 'c64';
  if (state.tab === 'flow') {
    state.path = [];
    state.selected = root;
    state.treeCursor = 0;
    state.treeScroll = 0;
    state.nodeScroll = 0;
    flowCentreOn(root);
    render();
    return;
  }
  if (state.selected === root && state.path.length === 0) {
    state.treeCursor = 0;
    state.treeScroll = 0;
    state.nodeScroll = 0;
    render();
    return;
  }
  state.path = [];
  state.selected = root;
  state.treeCursor = 0;
  state.treeScroll = 0;
  state.nodeScroll = 0;
  startRootBlank();
}

function moveCursor(d) {
  if (animating) return;
  const total = treeKids().length;
  if (!total) return;
  state.treeCursor = Math.min(total - 1, Math.max(0, state.treeCursor + d));
  const boxes = layoutTreeBoxes(treeKids(), TREE.cw - 4);
  state.treeScroll = ensureCursorVisible(
    state.treeCursor, state.treeScroll, boxes, (LEFT.y + LEFT.h - 2) - TREE.kidsY + 1, 1,
  );
  render();
}

function scrollTree(d) {
  if (animating) return;
  const total = treeKids().length;
  if (!total) return;
  state.treeScroll = clampStart(state.treeScroll + d, total);
  render();
}

function enterCursor() {
  if (animating) return;
  const kids = treeKids();
  if (kids[state.treeCursor]) track(kids[state.treeCursor].id);
}

async function loadTree() {
  const urls = ['../tree.json', './tree.json', '/tree.json'];
  let lastErr = null;
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${u}`);
      const payload = await r.json();
      state.nodes = payload.nodes ?? {};
      state.meta = payload.meta ?? null;
      state.parents = {};
      for (const [id, n] of Object.entries(state.nodes)) {
        for (const c of n.children ?? []) {
          if (!state.nodes[c]) continue;
          (state.parents[c] ??= []).push(id);
        }
      }
      if (!state.nodes[state.selected] && state.meta) state.selected = state.meta.root ?? Object.keys(state.nodes)[0];
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  state.err = 'TREE.JSON NOT FOUND - RUN NPM RUN BUILD';
  throw lastErr;
}

function cellFromEvent(e) {
  const r = tm.canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * 640;
  const py = ((e.clientY - r.top) / r.height) * 360;
  return { x: Math.floor(px / 8), y: Math.floor(py / 8) };
}

function wireInput() {
  window.addEventListener('keydown', (e) => {
    // Intro tour owns the keyboard while it is up: every other component
    // is hidden, so no tree/flow/elements key may fire underneath it.
    if (state.intro.active) {
      if (e.key === 'Tab') { e.preventDefault(); introNext(); return; }
      if (animating) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); introNext(); }
      else if (e.key === 'b' || e.key === 'B' || e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') { e.preventDefault(); introPrev(); }
      else if (e.key === 's' || e.key === 'S' || e.key === 'Escape' || e.key === 'q' || e.key === 'Q') { e.preventDefault(); exitIntro(true); }
      else if (e.key === 'v' || e.key === 'V') { e.preventDefault(); introViewNode(); }
      else if (e.key === 'i' || e.key === 'I') { e.preventDefault(); markIntroSeen(); render(); }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      setTab(state.tab === 'tree' ? 'flow' : state.tab === 'flow' ? 'elements' : 'tree');
      return;
    }
    if (animating) return;
    if (state.tab === 'elements') {
      if (e.key === 'ArrowUp') { e.preventDefault(); state.elCur = stepCursor(state.elCur, -1, 0); render(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); state.elCur = stepCursor(state.elCur, 1, 0); render(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); state.elCur = stepCursor(state.elCur, 0, -1); render(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); state.elCur = stepCursor(state.elCur, 0, 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); jumpToEvidence(); }
      return;
    }
    if (state.tab === 'flow') {
      if (e.key === 'ArrowUp') { e.preventDefault(); flowPan(0, e.shiftKey ? -16 : -4); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); flowPan(0, e.shiftKey ? 16 : 4); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); flowPan(e.shiftKey ? -16 : -4, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); flowPan(e.shiftKey ? 16 : 4, 0); }
      else if (e.key === 'Enter') { e.preventDefault(); flowSelectCentre(); }
      else if (e.key === 'Backspace' || e.key === 'b') { e.preventDefault(); goBack(); }
      else if (e.key === '0') { goRoot(); }
      else if (e.key === 't' || e.key === 'T') { e.preventDefault(); flowGoTree(); }
      else if (e.key === 'PageUp') { e.preventDefault(); flowPan(0, -16); }
      else if (e.key === 'PageDown') { e.preventDefault(); flowPan(0, 16); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); flowZoom(1); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); flowZoom(-1); }
      return;
    }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor(1); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); enterCursor(); }
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'b') { e.preventDefault(); goBack(); }
    else if (e.key === '0') { goRoot(); }
    else if (e.key === 'PageUp') { e.preventDefault(); scrollTree(-5); }
    else if (e.key === 'PageDown') { e.preventDefault(); scrollTree(5); }
    else if (e.key === '[') { e.preventDefault(); state.nodeScroll = Math.max(0, state.nodeScroll - 5); render(); }
    else if (e.key === ']') { e.preventDefault(); state.nodeScroll = state.nodeScroll + 5; render(); }
    else if (e.key >= '1' && e.key <= '9') { const k = treeKids(); if (k[Number(e.key) - 1]) track(k[Number(e.key) - 1].id); }
  });
  let suppressClick = false;
  tm.canvas.addEventListener('pointerdown', (e) => {
    if (state.intro.active) return;
    if (state.tab !== 'flow' || e.button !== 0) return;
    const c = cellFromEvent(e);
    if (!inFlowView(c.x, c.y)) return;
    flowDrag = { x: e.clientX, y: e.clientY, ox: state.flow.x, oy: state.flow.y, moved: false };
  });
  tm.canvas.addEventListener('pointermove', (e) => {
    if (state.intro.active) return;
    if (!flowDrag) return;
    const r = tm.canvas.getBoundingClientRect();
    const dxCells = Math.round(((flowDrag.x - e.clientX) / r.width) * 80);
    const dyCells = Math.round(((flowDrag.y - e.clientY) / r.height) * 45);
    if (!flowDrag.moved && Math.abs(e.clientX - flowDrag.x) < 4 && Math.abs(e.clientY - flowDrag.y) < 4) return;
    flowDrag.moved = true;
    const L = getFlowLayout();
    const c = clampCam(flowDrag.ox + dxCells, flowDrag.oy + dyCells, L.worldW, L.worldH, FLOWVIEW.vw, FLOWVIEW.vh);
    state.flow.x = c.x;
    state.flow.y = c.y;
    render();
  });
  const endFlowDrag = () => {
    if (flowDrag?.moved) suppressClick = true;
    flowDrag = null;
  };
  tm.canvas.addEventListener('pointerup', endFlowDrag);
  tm.canvas.addEventListener('pointercancel', endFlowDrag);
  tm.canvas.addEventListener('click', (e) => {
    const c = cellFromEvent(e);
    for (const t of tabHits) {
      if (c.y === t.y && c.x >= t.x0 && c.x <= t.x1) { setTab(t.id); return; }
    }
    if (suppressClick) { suppressClick = false; return; }
    if (animating) return;
    // Intro consumes all clicks while up (other components are hidden).
    if (state.intro.active && introHits) {
      if (c.y === introHits.skip.y && c.x >= introHits.skip.x0 && c.x <= introHits.skip.x1) { exitIntro(true); return; }
      if (c.y === introHits.next.y && c.x >= introHits.next.x0 && c.x <= introHits.next.x1) { introNext(); return; }
      if (c.y === introHits.back.y && c.x >= introHits.back.x0 && c.x <= introHits.back.x1) { introPrev(); return; }
      for (const b of introHits.chain ?? []) {
        if (c.y >= b.y0 && c.y <= b.y1 && c.x >= b.x0 && c.x <= b.x1) { introViewNode(b.id); return; }
      }
      return;
    }
    if (state.tab === 'elements') {
      const cell = cellFromXY(c.x, c.y);
      if (cell) { state.elCur = cell; render(); }
      return;
    }
    if (backHit && c.y === backHit.y && c.x >= backHit.x0 && c.x <= backHit.x1) { goBack(); return; }
    if (state.tab === 'flow') {
      if (viewTreeHit && c.y === viewTreeHit.y && c.x >= viewTreeHit.x0 && c.x <= viewTreeHit.x1) { flowGoTree(); return; }
      if (minimapGeom && c.y >= minimapGeom.y0 && c.y < minimapGeom.y0 + minimapGeom.mh
        && c.x >= minimapGeom.x0 && c.x < minimapGeom.x0 + minimapGeom.mw) {
        flowGoMap(c.x - minimapGeom.x0, c.y - minimapGeom.y0);
        return;
      }
      for (const t of flowHits) {
        if (c.y >= t.y0 && c.y <= t.y1 && c.x >= t.x0 && c.x <= t.x1) {
          setCanonicalPath(t.id);
          track(t.id, false);
          return;
        }
      }
      return;
    }
    for (const t of treeChildHits) {
      if (c.y >= t.y0 && c.y <= t.y1 && c.x >= (t.x0 ?? TREE.cx0) && c.x <= (t.x1 ?? TREE.cx0 + TREE.cw - 1)) {
        state.treeCursor = t.index;
        track(t.id);
        return;
      }
    }
  });
  tm.canvas.addEventListener('wheel', (e) => {
    if (animating) return;
    if (state.intro.active) return;
    if (state.tab === 'elements') return;
    const c = cellFromEvent(e);
    if (state.tab === 'flow') {
      if (c.x >= LEFT.x && c.x < LEFT.x + LEFT.w && c.y >= LEFT.y && c.y < LEFT.y + LEFT.h) {
        flowPan(e.deltaX > 0 ? 4 : e.deltaX < 0 ? -4 : 0, e.deltaY > 0 ? 4 : e.deltaY < 0 ? -4 : 0);
      }
      return;
    }
    if (nodeBox && c.x >= nodeBox.x0 && c.x <= nodeBox.x1 && c.y >= nodeBox.y0 && c.y <= nodeBox.y1) {
      state.nodeScroll = Math.max(0, state.nodeScroll + (e.deltaY > 0 ? 3 : -3));
      render();
    } else if (c.x >= LEFT.x && c.x < LEFT.x + LEFT.w && c.y >= LEFT.y && c.y < LEFT.y + LEFT.h) {
      scrollTree(e.deltaY > 0 ? 2 : -2);
    }
  }, { passive: true });
}

async function boot() {
  const canvas = document.getElementById('c64');
  const crash = document.getElementById('crash');
  tm = new TextMode(canvas);
  if (tm.glError) {
    crash.hidden = false;
    crash.textContent = 'WEBGL UNAVAILABLE: ' + tm.glError.message;
    return;
  }
  renderTitle();
  tm.text(2, 3, U('LOADING TREE.JSON...'), C.YELLOW, UI.BG);
  tm.present();
  try {
    await loadTree();
  } catch (e) {
    state.err = String(e?.message ?? e);
  }
  wireInput();
  // First visit: open on the quartz-to-C64 tour instead of the tree. The
  // flag is set on skip/finish; [INTRO] replays the tour later. Set the flag
  // before the first render so there is no tree flash-through.
  if (!isIntroSeen()) {
    state.intro.active = true;
    state.intro.step = 0;
  }
  render();
  // The flow tab's minimap marker and the intro pins flash with the shared
  // text cursor, so the blink tick re-renders the whole panel there (layout
  // is cached) and just the footer elsewhere.
  setInterval(() => {
    state.cursor = !state.cursor;
    if ((state.tab === 'flow' || state.intro.active) && !animating) render();
    else { renderBottom(); tm.present(); }
  }, 530);
}

boot();
