import { C, UI } from './palette.js';
import { BOX, SOLID, toScreenText } from './petscii.js';
import { TextMode, COLS, ROWS, wrapText } from './textmode.js';
import { childLines, layoutChildren, visibleWindow, clampStart, ensureCursorVisible, connectionsOf, EDGE_MODES, modeById, kindColor, nodeContent } from './treeview.js';

const LEFT = { x: 1, y: 1, w: 48, h: 38 };
const RIGHT = { x: 51, y: 1, w: 28, h: 38 };
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
};

let tm = null;
let toggleHits = [];
let childHits = [];
let backHit = null;
let treeChildHits = [];
let edgeHit = null;
let menuHits = [];

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

function centerText(y, str, fg, bg) {
  const s = U(str).slice(0, COLS);
  const x = Math.max(0, Math.floor((COLS - s.length) / 2));
  tm.text(x, y, s, fg, bg);
}

function renderTitle() {
  tm.fillRect(0, 0, COLS, 1, 32, C.YELLOW, UI.BG);
  tm.text(2, 0, '**** C64 SUPPLY CHAIN ****', C.YELLOW, UI.BG);
}

const TREE = {
  tx: 2, ty: 4, tw: 20, th: 6,
  trunkX: 24,
  cx0: 26, cw: 22,
  pathY: 2,
  statY: 3,
  kidsY: 4,
};

function treeKids() {
  const n = state.nodes[state.selected];
  if (!n) return [];
  const mode = modeById(state.edgeMode);
  return connectionsOf(n, state.nodes, new Set(mode.rels), { chain: !!mode.chain }).map(({ id, routed }) => ({
    id,
    simple_name: state.nodes[id]?.simple_name ?? state.nodes[id]?.name ?? id,
    kind: state.nodes[id]?.kind,
    routed,
  }));
}

function trackedName() {
  const n = state.nodes[state.selected];
  return n?.simple_name ?? n?.name ?? state.selected;
}

function renderLeft() {
  box(LEFT.x, LEFT.y, LEFT.w, LEFT.h, UI.FRAME_FG, UI.BG, 'TREE');
  treeChildHits = [];
  backHit = null;
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
  const tMid = TREE.ty + Math.floor((TREE.th - 1) / 2);
  box(TREE.tx, TREE.ty, TREE.tw, TREE.th, kindColor(n.kind), UI.BG);
  nameLines.forEach((ln, i) => {
    tm.text(TREE.tx + 2, TREE.ty + 1 + i, ln, C.WHITE, UI.BG, TREE.tw - 4);
  });
  tm.text(TREE.tx + 2, TREE.ty + TREE.th - 2, connLine, C.GREY, UI.BG, TREE.tw - 4);

  if (!kids.length) {
    tm.text(TREE.cx0, TREE.kidsY + 2, U('(END OF LINE)'), C.GREY, UI.BG, TREE.cw - 2);
    return;
  }

  const textW = TREE.cw - 4;
  const boxes = layoutChildren(kids, textW, 3);
  const maxRows = iy1 - TREE.kidsY + 1;
  state.treeScroll = clampStart(state.treeScroll, boxes.length);
  const win = visibleWindow(boxes, state.treeScroll, maxRows, 1);

  let y = TREE.kidsY;
  const drawn = [];
  for (const b of win.visible) {
    const isCur = b.index === state.treeCursor;
    box(TREE.cx0, y, TREE.cw, b.h, kindColor(b.kind), UI.BG);
    b.lines.forEach((ln, i) => {
      tm.text(TREE.cx0 + 2, y + 1 + i, ln, isCur ? C.WHITE : C.GREY, UI.BG, textW);
    });
    if (b.routed) tm.set(TREE.cx0 + TREE.cw - 2, y, '*'.charCodeAt(0), C.YELLOW, UI.BG);
    const mid = y + Math.floor(b.h / 2);
    drawn.push({ ...b, y, mid });
    treeChildHits.push({ y0: y, y1: y + b.h - 1, id: b.id, index: b.index });
    y += b.h + 1;
  }

  if (win.hasMoreAbove) tm.text(ix1 - 5, TREE.kidsY, U('^MORE'), C.GREY, UI.BG, 6);
  if (win.hasMoreBelow) tm.text(ix1 - 5, iy1, U('vMORE'), C.GREY, UI.BG, 6);

  const lo = Math.min(tMid, drawn[0].mid);
  const hi = Math.max(tMid, drawn[drawn.length - 1].mid);
  for (let r = lo; r <= hi; r++) tm.set(TREE.trunkX, r, BOX.V, C.GREY, UI.BG);
  for (let x = TREE.tx + TREE.tw; x < TREE.trunkX; x++) tm.set(x, tMid, BOX.H, C.GREY, UI.BG);
  tm.set(TREE.trunkX, tMid, BOX.X, C.GREY, UI.BG);
  for (const d of drawn) {
    for (let x = TREE.trunkX + 1; x < TREE.cx0; x++) tm.set(x, d.mid, BOX.H, C.GREY, UI.BG);
    tm.set(TREE.trunkX, d.mid, BOX.X, C.GREY, UI.BG);
  }
}

function nodeChildren(id) {
  const n = state.nodes[id];
  if (!n) return [];
  return (n.children ?? []).filter((c) => state.nodes[c]);
}

function renderRight() {
  box(RIGHT.x, RIGHT.y, RIGHT.w, RIGHT.h, UI.FRAME_FG, UI.BG, 'NODE');
  childHits = [];
  const ix = RIGHT.x + 1;
  const iw = RIGHT.w - 2;
  const y0 = RIGHT.y + 1;
  const maxRows = RIGHT.y + RIGHT.h - 2 - y0 + 1;
  const n = state.nodes[state.selected];
  if (!n) {
    tm.text(ix, y0, U(state.err || 'LOADING...'), C.LTRED, UI.BG, iw);
    return;
  }
  const kids = nodeChildren(state.selected).map((id) => ({
    id,
    simple_name: state.nodes[id]?.simple_name ?? state.nodes[id]?.name ?? id,
  }));
  const L = nodeContent(n, kids, iw);
  state.nodeScroll = Math.min(Math.max(0, state.nodeScroll), Math.max(0, L.length - maxRows));
  const win = L.slice(state.nodeScroll, state.nodeScroll + maxRows);
  let y = y0;
  let span = null;
  const flushSpan = () => {
    if (span) childHits.push({ y0: span.y0, y1: y - 1, id: span.id });
    span = null;
  };
  for (const row of win) {
    if (row.t === 'SEP') {
      for (let i = 0; i < iw; i++) tm.set(ix + i, y, BOX.H, C.GREY, UI.BG);
    } else {
      tm.text(ix, y, row.t, row.fg, UI.BG, iw);
    }
    if (row.kid !== (span?.id ?? null) || row.kid === null) flushSpan();
    if (row.kid !== null && span === null) span = { id: row.kid, y0: y };
    y++;
  }
  flushSpan();
  if (state.nodeScroll > 0) tm.text(ix + iw - 5, y0, U('^MORE'), C.GREY, UI.BG, 6);
  if (state.nodeScroll + maxRows < L.length) tm.text(ix + iw - 5, y0 + maxRows - 1, U('vMORE'), C.GREY, UI.BG, 6);
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
  tm.text(2, ROWS - 1, U('UP/DN=CURSOR ENTER=OPEN LEFT=BACK 0=ROOT []=SCROLL'), C.GREY, UI.BG);
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
  renderLeft();
  renderRight();
  renderBottom();
  if (state.edgeMenu) renderMenu();
  tm.present();
}

function track(id, push = true) {
  if (!id || !state.nodes[id]) return;
  if (id === state.selected) {
    state.treeCursor = 0;
    state.treeScroll = 0;
    state.nodeScroll = 0;
    render();
    return;
  }
  if (push) state.path.push(state.selected);
  state.selected = id;
  state.treeCursor = 0;
  state.treeScroll = 0;
  state.nodeScroll = 0;
  render();
}

function goBack() {
  const prev = state.path.pop();
  if (prev === undefined || !state.nodes[prev]) {
    render();
    return;
  }
  state.selected = prev;
  state.treeCursor = 0;
  state.treeScroll = 0;
  state.nodeScroll = 0;
  render();
}

function goRoot() {
  state.path = [];
  state.selected = state.meta?.root ?? 'c64';
  state.treeCursor = 0;
  state.treeScroll = 0;
  state.nodeScroll = 0;
  render();
}

function moveCursor(d) {
  const total = treeKids().length;
  if (!total) return;
  state.treeCursor = Math.min(total - 1, Math.max(0, state.treeCursor + d));
  const boxes = layoutChildren(treeKids(), TREE.cw - 4, 3);
  state.treeScroll = ensureCursorVisible(
    state.treeCursor, state.treeScroll, boxes, (LEFT.y + LEFT.h - 2) - TREE.kidsY + 1, 1,
  );
  render();
}

function scrollTree(d) {
  const total = treeKids().length;
  if (!total) return;
  state.treeScroll = clampStart(state.treeScroll + d, total);
  render();
}

function enterCursor() {
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
    if (state.edgeMenu) {
      for (const m of menuHits) {
        const { x } = menuXY();
        if (c.y === m.y && c.x >= x && c.x < x + MENU.w) { pickEdgeMode(m.mode); return; }
      }
      closeEdgeMenu();
      return;
    }
    if (edgeHit && c.y === edgeHit.y && c.x >= edgeHit.x0 && c.x <= edgeHit.x1) { openEdgeMenu(); return; }
    if (backHit && c.y === backHit.y && c.x >= backHit.x0 && c.x <= backHit.x1) { goBack(); return; }
    for (const t of treeChildHits) {
      if (c.y >= t.y0 && c.y <= t.y1 && c.x >= TREE.cx0 && c.x < TREE.cx0 + TREE.cw) {
        state.treeCursor = t.index;
        track(t.id);
        return;
      }
    }
    for (const t of toggleHits) {
      if (c.y === t.y && c.x >= t.x0 && c.x <= t.x1) { toggle(t.key); return; }
    }
    for (const ch of childHits) {
      if (c.y >= ch.y0 && c.y <= ch.y1 && c.x >= RIGHT.x && c.x < RIGHT.x + RIGHT.w) { track(ch.id); return; }
    }
  });
  tm.canvas.addEventListener('wheel', (e) => {
    const c = cellFromEvent(e);
    if (c.x >= LEFT.x && c.x < LEFT.x + LEFT.w && c.y >= LEFT.y && c.y < LEFT.y + LEFT.h) {
      scrollTree(e.deltaY > 0 ? 2 : -2);
    } else if (c.x >= RIGHT.x && c.x < RIGHT.x + RIGHT.w && c.y >= RIGHT.y && c.y < RIGHT.y + RIGHT.h) {
      state.nodeScroll = Math.max(0, state.nodeScroll + (e.deltaY > 0 ? 3 : -3));
      render();
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
