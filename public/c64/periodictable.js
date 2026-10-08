import { C, UI } from './palette.js';
import { BOX, toScreenText } from './petscii.js';
import { ELEMENTS } from './elements.js';

// Geometry of the static table inside the 80x45 grid. Cells are 4 wide x 2
// tall (atomic number over symbol); the f-block sits one blank row below the
// main table, starting under group 4.
export const EL_GEOM = { ox: 4, oy: 5, cw: 4, ch: 2, fGap: 1 };

const byCell = new Map(ELEMENTS.map((e) => [`${e.p},${e.g}`, e]));

export function elementAt(p, g) {
  return byCell.get(`${p},${g}`) ?? null;
}

export function isCell(p, g) {
  return byCell.has(`${p},${g}`);
}

// One step in a cardinal direction, skipping the table gaps (periods 1-3
// have no groups 3-12, the f-block has no groups 1-3/18). Sticks at the edge.
export function stepCursor(cur, dp, dg) {
  let { p, g } = cur;
  for (let i = 0; i < 24; i++) {
    p += dp;
    g += dg;
    if (p < 1 || p > 9 || g < 1 || g > 18) return cur;
    if (isCell(p, g)) return { p, g };
  }
  return cur;
}

function cellY(p) {
  const { oy, ch, fGap } = EL_GEOM;
  if (p <= 7) return oy + (p - 1) * ch;
  return oy + 7 * ch + fGap + (p - 8) * ch;
}

// Inverse of the layout above: grid cell -> {p,g} or null (gap / no element).
export function cellFromXY(x, y) {
  const { ox, oy, cw, ch, fGap } = EL_GEOM;
  const g = Math.floor((x - ox) / cw) + 1;
  if (g < 1 || g > 18 || x < ox) return null;
  const yrel = y - oy;
  if (yrel < 0) return null;
  let p;
  if (yrel < 7 * ch) {
    p = Math.floor(yrel / ch) + 1;
  } else if (yrel < 7 * ch + fGap) {
    return null;
  } else {
    const frel = yrel - 7 * ch - fGap;
    if (frel >= 2 * ch) return null;
    p = Math.floor(frel / ch) + 8;
  }
  return isCell(p, g) ? { p, g } : null;
}

export const STATUS_STYLE = {
  pure: { fg: C.BLACK, bg: C.LTGREEN, label: 'PURE ELEMENT' },
  comp: { fg: C.BLACK, bg: C.YELLOW, label: 'IN COMPOUNDS' },
  absent: { fg: C.GREY, bg: UI.BG, label: 'NOT IN TREE' },
};

export function elementCounts() {
  const c = { pure: 0, comp: 0, absent: 0 };
  for (const e of ELEMENTS) c[e.st]++;
  return c;
}

function elBox(grid, x, y, w, h, fg, bg, title) {
  grid.set(x, y, BOX.TL, fg, bg);
  grid.set(x + w - 1, y, BOX.TR, fg, bg);
  grid.set(x, y + h - 1, BOX.BL, fg, bg);
  grid.set(x + w - 1, y + h - 1, BOX.BR, fg, bg);
  for (let i = 1; i < w - 1; i++) {
    grid.set(x + i, y, BOX.H, fg, bg);
    grid.set(x + i, y + h - 1, BOX.H, fg, bg);
  }
  for (let j = 1; j < h - 1; j++) {
    grid.set(x, y + j, BOX.V, fg, bg);
    grid.set(x + w - 1, y + j, BOX.V, fg, bg);
  }
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) grid.set(x + i, y + j, 32, fg, bg);
  }
  if (title) {
    const t = ' ' + toScreenText(title).slice(0, w - 4) + ' ';
    grid.text(x + 2, y, t, C.YELLOW, bg);
  }
}

// Draws the whole tab. `grid` is {text,set} - the live TextMode in the
// viewer, or a stub in tests. boxH is the outer panel height. `nodes` is
// the built node map (id -> node); the evidence line shows the node's
// human name (simple_name, then name), falling back to the id when the
// node is missing so a dangling ev still reads as something.
export function renderElements(grid, cursor, boxH = 38, nodes = {}) {
  const U = (s) => toScreenText(s);
  elBox(grid, 1, 1, 78, boxH, UI.FRAME_FG, UI.BG, 'ELEMENTS');
  const counts = elementCounts();
  let tx = 3;
  const seg = (label, fg, bg) => {
    grid.text(tx, 2, U(' ' + label + ' '), fg, bg);
    tx += label.length + 3;
  };
  seg(`PURE ${counts.pure}`, C.BLACK, C.LTGREEN);
  seg(`IN COMPOUNDS ${counts.comp}`, C.BLACK, C.YELLOW);
  seg(`ABSENT ${counts.absent}`, C.GREY, UI.BG);
  grid.text(tx, 2, U('(OF 118)'), C.GREY, UI.BG);

  const { ox, cw } = EL_GEOM;
  for (const e of ELEMENTS) {
    const st = STATUS_STYLE[e.st];
    const isCur = cursor.p === e.p && cursor.g === e.g;
    const fg = isCur ? C.WHITE : st.fg;
    const bg = isCur ? C.RED : st.bg;
    const cx = ox + (e.g - 1) * cw;
    const cy = cellY(e.p);
    grid.text(cx, cy, U(String(e.z).padStart(3) + ' '), fg, bg, cw);
    grid.text(cx, cy + 1, U(e.s.length > 1 ? e.s + '  ' : ' ' + e.s + '  '), fg, bg, cw);
  }
  grid.text(2, cellY(8), U('LA'), C.GREY, UI.BG, 2);
  grid.text(2, cellY(9), U('AC'), C.GREY, UI.BG, 2);

  const dy = cellY(9) + 2 + 1;
  const el = elementAt(cursor.p, cursor.g);
  if (el) {
    const st = STATUS_STYLE[el.st];
    grid.text(4, dy, U(`${el.z} ${el.s} ${el.n} - ${st.label}`), C.YELLOW, UI.BG);
    const evNode = el.ev ? nodes[el.ev] : null;
    const evLabel = el.ev ? (evNode?.simple_name ?? evNode?.name ?? el.ev) : null;
    grid.text(4, dy + 1, U(evLabel ? `E.G. ${evLabel}` : 'NO NODE MENTIONS IT'), C.LTBLUE, UI.BG, 72);
  }
}
