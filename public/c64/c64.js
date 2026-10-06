import { C, UI } from './palette.js';
import { BOX, SOLID, toScreenText } from './petscii.js';
import { TextMode, COLS, ROWS, wrapText } from './textmode.js';
import { childLines, layoutTreeBoxes, planTreePanel, groupRouted, groupRails, trunkSpan, visibleWindow, clampStart, ensureCursorVisible, connectionsOf, EDGE_MODES, modeById, kindColor, nodeContent } from './treeview.js';
import { renderElements, stepCursor, cellFromXY, elementAt } from './periodictable.js';

const LEFT = { x: 1, y: 1, w: 78, h: 38 };
const BOTTOM = { x: 1, y: 40, w: 78, h: 4 };

const state = {
  selected: 'c64',
  projection: 'full',
  showChips: true,
  showEditorial: false,
  dim: false,
  nodes: {},
  meta: null,
  parents: {},
  cursor: true,
  err: '',
  path: [],
  treeCursor: 0,
  treeScroll: 0,
  nodeScroll: 0,
  edgeMode: 'supply',
  edgeMenu: false,
  edgeCursor: EDGE_MODES.findIndex((m) => m.def),
  tab: 'tree',
  elCur: { p: 4, g: 8 },
};

let tm = null;
let toggleHits = [];
let backHit = null;
let treeChildHits = [];
let nodeBox = null;
let edgeHit = null;
let menuHits = [];
let tabHits = [];
let animating = false;
let animFrame = null;

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
  tm.fillRect(0, 0, COLS, 1, 32, C.YELLOW, UI.BG);
  tm.text(2, 0, '**** C64 SUPPLY CHAIN ****', C.YELLOW, UI.BG);
  tabHits = [];
  const tabs = [
    { id: 'tree', label: '[TREE]' },
    { id: 'elements', label: '[ELEMENTS]' },
  ];
  let x = COLS - 2;
  for (let i = tabs.length - 1; i >= 0; i--) {
    const t = tabs[i];
    const on = state.tab === t.id;
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

function kidsFor(id) {
  const node = state.nodes[id];
  if (!node) return [];
  const mode = modeById(state.edgeMode);
  // Same backlog-container exclusion as the tree panel: keep it out of the
  // view (nothing routes through a facility, so no grouped children are
  // orphaned by this).
  const conns = groupRouted(connectionsOf(node, state.nodes, new Set(mode.rels), { chain: !!mode.chain }))
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
  else box(TREE.tx, TREE.ty, TREE.tw, th, kindColor(n.kind), UI.BG);
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
    box(b.bx, y, b.bw, b.h, kindColor(b.kind), UI.BG);
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

function renderBottom() {
  box(BOTTOM.x, BOTTOM.y, BOTTOM.w, BOTTOM.h, UI.FRAME_FG, UI.BG, 'SETTINGS');
  toggleHits = [];
  const y = BOTTOM.y + 1;
  const items = [
    { key: 'projection', label: `VIEW:${state.projection === 'full' ? 'FULL' : 'ENT'}`, hint: 'F1' },
    { key: 'showChips', label: `CHIPS:${state.showChips ? 'ON' : 'OFF'}`, hint: 'F3' },
    { key: 'showEditorial', label: `COMMENT:${state.showEditorial ? 'ON' : 'OFF'}`, hint: 'F5' },
    { key: 'dim', label: `DIM:${state.dim ? 'ON' : 'OFF'}`, hint: 'F7' },
  ];
  let x = BOTTOM.x + 2;
  for (const it of items) {
    const s = `[${it.hint} ${it.label}]`;
    if (x + s.length > BOTTOM.x + BOTTOM.w - 2) break;
    const on = it.key === 'projection' ? true : state[it.key];
    tm.text(x, y, U(s), on ? C.BLACK : C.LTBLUE, on ? C.LTGREY : UI.BG);
    toggleHits.push({ x0: x, x1: x + s.length - 1, y, key: it.key });
    x += s.length + 1;
  }
  const st = state.cursor ? String.fromCharCode(SOLID) : ' ';
  tm.text(2, ROWS - 1, U(state.tab === 'elements' ? 'ARROWS=CURSOR ENTER=SHOW IN TREE TAB=TREE PANEL' : 'UP/DN=CURSOR ENTER=OPEN LEFT=BACK 0=ROOT []=SCROLL'), C.GREY, UI.BG);
  tm.set(COLS - 3, ROWS - 1, st.charCodeAt(0), C.YELLOW, UI.BG);

  const ey = BOTTOM.y + 2;
  const mode = modeById(state.edgeMode);
  const es = `[F2 EDGE:${mode.label} v]`;
  tm.text(BOTTOM.x + 2, ey, U(es), C.BLACK, C.LTGREY);
  edgeHit = { x0: BOTTOM.x + 2, x1: BOTTOM.x + 2 + es.length - 1, y: ey };
}

const MENU = { w: 42, h: 8 };

function menuXY() {
  return { x: Math.floor((COLS - MENU.w) / 2), y: Math.floor((ROWS - MENU.h) / 2) };
}

function renderMenu() {
  menuHits = [];
  const { x, y } = menuXY();
  box(x, y, MENU.w, MENU.h, UI.FRAME_FG, C.BLUE, 'EDGE TYPES');
  EDGE_MODES.forEach((m, i) => {
    const ry = y + 1 + i;
    const isCur = i === state.edgeCursor;
    const isOn = m.id === state.edgeMode;
    tm.text(x + 2, ry, isCur ? '>' : ' ', C.YELLOW, C.BLUE);
    tm.text(x + 4, ry, U(m.label), isCur ? C.WHITE : C.LTBLUE, C.BLUE, MENU.w - 6);
    const tag = m.def ? U('(DEFAULT)') : U(m.desc);
    tm.text(x + MENU.w - 2 - tag.length, ry, tag, C.GREY, C.BLUE, tag.length);
    if (isOn) tm.set(x + MENU.w - 3 - tag.length - 1, ry, '*'.charCodeAt(0), C.YELLOW, C.BLUE);
    menuHits.push({ y: ry, mode: m.id });
  });
  tm.text(x + 2, y + MENU.h - 2, U('UP/DN CHOOSE ENTER ESC'), C.GREY, C.BLUE);
}

function openEdgeMenu() {
  state.edgeCursor = EDGE_MODES.findIndex((m) => m.id === state.edgeMode);
  state.edgeMenu = true;
  render();
}

function closeEdgeMenu() {
  state.edgeMenu = false;
  render();
}

function pickEdgeMode(id) {
  if (!EDGE_MODES.some((m) => m.id === id)) return;
  state.edgeMode = id;
  state.edgeMenu = false;
  state.treeCursor = 0;
  state.treeScroll = 0;
  render();
}

function render() {
  tm.clear(UI.BODY_FG, UI.BG);
  renderTitle();
  if (state.tab === 'elements') {
    renderElements(tm, state.elCur);
  } else {
    renderLeft();
  }
  renderBottom();
  if (state.edgeMenu) renderMenu();
  tm.present();
}

// Tab switching never touches selected/path/cursors, so the tree panel is
// exactly where the user left it when they switch back.
function setTab(t) {
  if (t !== 'tree' && t !== 'elements') return;
  if (animating && animFrame !== null) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
    animating = false;
  }
  state.tab = t;
  state.edgeMenu = false;
  render();
}

function jumpToEvidence() {
  const el = elementAt(state.elCur.p, state.elCur.g);
  if (!el || !el.ev || !state.nodes[el.ev]) return;
  state.tab = 'tree';
  state.edgeMenu = false;
  track(el.ev);
}

function track(id, push = true) {
  if (animating) return;
  if (!id || !state.nodes[id]) return;
  if (id === state.selected) {
    state.treeCursor = 0;
    state.treeScroll = 0;
    state.nodeScroll = 0;
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
  const fg = isRoot ? null : kindColor(n?.kind);
  animateBoxMove(s, dst, { fg, isRoot, tName, total: animDuration(s, dst), reverse: false });
}

function startBackAnimation(srcRect, dstRect, departingNode) {
  const tName = U(trackedName());
  // The flying box is the departing child, never the rainbow root frame.
  const fg = kindColor(departingNode?.kind);
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

function toggle(key) {
  if (key === 'projection') state.projection = state.projection === 'full' ? 'entities' : 'full';
  else if (key === 'showChips') state.showChips = !state.showChips;
  else if (key === 'showEditorial') state.showEditorial = !state.showEditorial;
  else if (key === 'dim') state.dim = !state.dim;
  render();
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
    if (e.key === 'Tab') { e.preventDefault(); setTab(state.tab === 'tree' ? 'elements' : 'tree'); return; }
    if (animating) return;
    if (state.tab === 'elements') {
      if (e.key === 'ArrowUp') { e.preventDefault(); state.elCur = stepCursor(state.elCur, -1, 0); render(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); state.elCur = stepCursor(state.elCur, 1, 0); render(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); state.elCur = stepCursor(state.elCur, 0, -1); render(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); state.elCur = stepCursor(state.elCur, 0, 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); jumpToEvidence(); }
      return;
    }
    if (e.key === 'F2') { e.preventDefault(); state.edgeMenu ? closeEdgeMenu() : openEdgeMenu(); return; }
    if (state.edgeMenu) {
      if (e.key === 'ArrowUp') { e.preventDefault(); state.edgeCursor = (state.edgeCursor + EDGE_MODES.length - 1) % EDGE_MODES.length; render(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); state.edgeCursor = (state.edgeCursor + 1) % EDGE_MODES.length; render(); }
      else if (e.key === 'Enter') { e.preventDefault(); pickEdgeMode(EDGE_MODES[state.edgeCursor].id); }
      else if (e.key === 'Escape') { e.preventDefault(); closeEdgeMenu(); }
      return;
    }    if (e.key === 'F1') { e.preventDefault(); toggle('projection'); }
    else if (e.key === 'F3') { e.preventDefault(); toggle('showChips'); }
    else if (e.key === 'F5') { e.preventDefault(); toggle('showEditorial'); }
    else if (e.key === 'F7') { e.preventDefault(); toggle('dim'); }
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
  tm.canvas.addEventListener('click', (e) => {
    const c = cellFromEvent(e);
    for (const t of tabHits) {
      if (c.y === t.y && c.x >= t.x0 && c.x <= t.x1) { setTab(t.id); return; }
    }
    if (animating) return;
    if (state.edgeMenu) {
      for (const m of menuHits) {
        const { x } = menuXY();
        if (c.y === m.y && c.x >= x && c.x < x + MENU.w) { pickEdgeMode(m.mode); return; }
      }
      closeEdgeMenu();
      return;
    }
    if (state.tab === 'tree' && edgeHit && c.y === edgeHit.y && c.x >= edgeHit.x0 && c.x <= edgeHit.x1) { openEdgeMenu(); return; }
    if (state.tab === 'elements') {
      const cell = cellFromXY(c.x, c.y);
      if (cell) { state.elCur = cell; render(); }
      return;
    }
    if (backHit && c.y === backHit.y && c.x >= backHit.x0 && c.x <= backHit.x1) { goBack(); return; }
    for (const t of treeChildHits) {
      if (c.y >= t.y0 && c.y <= t.y1 && c.x >= (t.x0 ?? TREE.cx0) && c.x <= (t.x1 ?? TREE.cx0 + TREE.cw - 1)) {
        state.treeCursor = t.index;
        track(t.id);
        return;
      }
    }
    for (const t of toggleHits) {
      if (c.y === t.y && c.x >= t.x0 && c.x <= t.x1) { toggle(t.key); return; }
    }
  });
  tm.canvas.addEventListener('wheel', (e) => {
    if (animating) return;
    if (state.tab === 'elements') return;
    const c = cellFromEvent(e);
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
  render();
  setInterval(() => { state.cursor = !state.cursor; renderBottom(); tm.present(); }, 530);
}

boot();
