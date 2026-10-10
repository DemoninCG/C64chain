import { C, UI } from './palette.js';
import { BOX, SOLID, toScreenText } from './petscii.js';
import { wrapText } from './textmode.js';
import { catColor } from './flowview.js';

// Intro tour: quartzite -> 6510 -> C64, per docs/SILICON-CHAIN.md.
// The chain builds incrementally: step 1 shows one node box (quarry) with
// only the Norway map; each step adds one or two boxes connected by lines,
// and the USA / E-Asia maps appear only when the story reaches them.
// Text is minimal on purpose: one caption line per step, no step counters,
// route rails, confidence notes, tree lines or stat blocks.

export const INTRO_KEY = 'c64-intro-seen-v1';

// The full chain in order. Boxes are drawn cumulatively: step N shows
// CHAIN[0..count). Labels are fixed shorts (<=7 chars for the 11-wide
// boxes); fb is the fallback category for the border colour when the live
// node is missing so a data refactor cannot bleach the chain.
export const INTRO_CHAIN = [
  { id: 'metal.quartzite.quarry', label: 'QUARRY', fb: 'metals' },
  { id: 'metal.quartzite', label: 'QUARTZ', fb: 'metals' },
  { id: 'metal.silica.submerged-arc-furnace', label: 'FURNACE', fb: 'metals' },
  { id: 'metal.silica.mgsi', label: 'MG-SI', fb: 'metals' },
  { id: 'metal.silica.tcs', label: 'TCS', fb: 'metals' },
  { id: 'metal.silica.polysilicon', label: 'POLY', fb: 'metals' },
  { id: 'metal.silica.czochralski', label: 'CZ', fb: 'semiconductors' },
  { id: 'si.ingot', label: 'INGOT', fb: 'semiconductors' },
  { id: 'si.wafer', label: 'WAFER', fb: 'semiconductors' },
  { id: 'mb.cpu.front-end', label: 'FAB', fb: 'semiconductors' },
  { id: 'mb.cpu', label: '6510', fb: 'semiconductors' },
  { id: 'c64', label: 'C64', fb: 'board' },
];

// One step per chain node: each step adds exactly one box (count =
// stepIdx + 1). Title line is full location, hyphen, material/process;
// description runs a few full sentences below it.
export const INTRO_STEPS = [
  {
    title: 'Austertana (Tana), Norway - Quartzite quarry',
    caption: 'Bench quarry in metamorphosed sandstone: drill and blast, jaw-crush, wash, then hand and optical sorters pull the iron-stained lumps. Only the cleanest rock feeds the furnace.',
    count: 1, map: 'norway', pin: 'tana',
  },
  {
    title: 'Austertana (Tana), Norway - High-grade quartzite',
    caption: 'The sorted output is 97-99% silicon dioxide with iron oxide under 0.05%. Beach sand is never used; only this quarried rock will do for chemical silicon.',
    count: 2, map: 'norway', pin: 'tana',
  },
  {
    title: 'Springfield, Oregon - Submerged-arc furnace',
    caption: 'Quartz, coal and woodchips drop between graphite electrodes into an 1800-2000 C bath. Carbothermic reduction strips the oxygen: SiO2 plus carbon becomes silicon plus carbon monoxide.',
    count: 3, map: 'usa', pin: 'springfield',
  },
  {
    title: 'Springfield, Oregon - Metallurgical silicon',
    caption: 'The furnace taps grey-black silicon at 98.5-99.5% purity with boron at 5-20 parts per million. Only the low-boron lots can continue toward electronics.',
    count: 4, map: 'usa', pin: 'springfield',
  },
  {
    title: 'Hemlock, Michigan - Trichlorosilane',
    caption: 'Metallurgical silicon meets hydrogen chloride gas in a 290-320 C fluid bed. The money molecule condenses out: trichlorosilane, purified only by volatility differences.',
    count: 5, map: 'usa', pin: 'hemlock',
  },
  {
    title: 'Hemlock, Michigan - Polysilicon',
    caption: 'Fractionation distills boron down near one part per billion then the Siemens process grows silicon onto white-hot rods. The sawn 9N chunks charge the crystal puller.',
    count: 6, map: 'usa', pin: 'hemlock',
  },
  {
    title: 'St Peters, Missouri - Czochralski crystal',
    caption: 'A two-kilo charge melts at 1414 C in a silica crucible under argon. A slow pull freezes a single 75-150 mm boule. St Peters stands in as a representative merchant source.',
    count: 7, map: 'usa', pin: 'stpeters',
  },
  {
    title: 'St Peters, Missouri - CZ silicon ingot',
    caption: 'The boule is boron-doped p-type silicon; the seed end is lopped off. It is sawn into slices, then lapped and polished into wafers further down the line.',
    count: 8, map: 'usa', pin: 'stpeters',
  },
  {
    title: 'St Peters, Missouri - Polished wafer',
    caption: 'The finished substrate is a 100 mm wafer a few hundred microns thick with a polished mirror face. Every die in the finished computer starts as a slice of this disc.',
    count: 9, map: 'usa', pin: 'stpeters',
  },
  {
    title: 'Norristown, Pennsylvania - NMOS front end',
    caption: 'Ten mask levels over a six-to-eight-week cycle: LOCOS isolation, double polysilicon gates, self-aligned source and drain, aluminium metal, sealed under glass and nitride.',
    count: 10, map: 'usa', pin: 'norristown',
  },
  {
    title: 'Norristown, Pennsylvania - MOS 6510',
    caption: 'A 6502 core plus an 8-bit I/O port, ticking at 1.022727 MHz and seated at U7. It is diffused, probed and packaged at 950 Rittenhouse Road under one roof.',
    count: 11, map: 'usa', pin: 'norristown',
  },
  {
    title: 'Hong Kong - Commodore 64',
    caption: 'The FR-4 board is populated and the breadbin boxed on the Hong Kong line. One Finnmark mountainside, ten thousand kilometres, twelve stops: a home computer.',
    count: 12, map: 'asia', pin: 'hongkong',
  },
];

// Mini-map grids. Shapes are rasterized from real coordinates, not
// hand-drawn: Natural Earth 110m admin boundaries
// (nvkelso/natural-earth-vector ne_110m_admin_0_countries.geojson),
// equirectangular projection with cos(mid-lat) correction, one cell per
// character, leading/trailing all-sea rows trimmed. Regenerate with
// `node scripts/rasterize-intro-maps.mjs` (Norway IW=18, USA IW=26,
// E Asia IW=22). Norway is the tall one and fills the lower-left space;
// the wider USA grid separates its four stops.

// '#' = land, ' ' = sea. Rows are exactly the map's width; a map's height
// is its art length (frame = art + 2 in both axes).
export const INTRO_MAPS = {
  norway: {
    title: 'NORWAY',
    art: [
      '               #  ',
      '             #### ',
      '          ####  # ',
      '         #####    ',
      '        #         ',
      '       #          ',
      '      ##          ',
      '      #           ',
      '     ##           ',
      '     #            ',
      '    ##            ',
      '   ##             ',
      '  ###             ',
      ' ####             ',
      ' ####             ',
      ' #####            ',
      ' ####             ',
      ' ####             ',
      ' ####             ',
      ' ##               ',
    ],
    pins: {
      tana: { x: 15, y: 1, label: 'TANA' },
      oslo: { x: 4, y: 17, label: 'OSLO', ref: true },
    },
  },
  usa: {
    title: 'U.S.A.',
    art: [
      ' #############            ',
      ' #################      # ',
      ' ##################   ####',
      '###################  ###  ',
      ' #######################  ',
      ' ######################   ',
      ' #####################    ',
      '  ####################    ',
      '   ##################     ',
      '     ###############      ',
      '         ##########       ',
      '           ##      #      ',
      '                   #      ',
    ],
    pins: {
      springfield: { x: 1, y: 2, label: 'SPRINGFIELD OR' },
      hemlock: { x: 18, y: 3, label: 'HEMLOCK MI' },
      stpeters: { x: 15, y: 5, label: 'ST PETERS MO' },
      norristown: { x: 22, y: 5, label: 'NORRISTOWN PA' },
    },
  },
  asia: {
    title: 'EAST ASIA',
    art: [
      '##################    ',
      '#################   # ',
      '###############    ## ',
      '##############     #  ',
      '########    #      #  ',
      '######## #  ##    #   ',
      '#########   ##   ##   ',
      '#########     #       ',
      '##########    #       ',
      '##########            ',
      '##########            ',
      '#########             ',
      '#########             ',
      '######## #            ',
      '######                ',
      '##                    ',
      '## #                  ',
      ' ##      #            ',
    ],
    pins: {
      hongkong: { x: 6, y: 13, label: 'HONG KONG' },
      ina: { x: 17, y: 6, label: 'INA JP', ref: true },
    },
  },
};

export const INTRO_MAP_ORDER = ['norway', 'usa', 'asia'];

// First step index (0-based into INTRO_STEPS) at which a pin lights up.
// Reference pins (Oslo, Ina) are orientation only and never gate progress.
const PIN_FIRST_STEP = {
  tana: 0,
  springfield: 2,
  hemlock: 4,
  stpeters: 6,
  norristown: 9,
  hongkong: 11,
};

// Maps appear only when the story reaches them: Norway from the start,
// the USA with the furnace step, E Asia with the final assembly step.
function mapVisible(mapKey, stepIdx) {
  if (mapKey === 'norway') return true;
  if (mapKey === 'usa') return stepIdx >= 2;
  if (mapKey === 'asia') return stepIdx >= 11;
  return false;
}

function stepPin(stepIdx) {
  const s = INTRO_STEPS[stepIdx];
  return s && s.pin ? s.pin : null;
}

function pinVisited(pin, stepIdx) {
  const first = PIN_FIRST_STEP[pin];
  if (first === undefined) return true;
  return stepIdx >= first;
}

function introBox(grid, x, y, w, h, fg, bg, title, titleFg = null) {
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
    grid.text(x + 2, y, t, titleFg ?? C.YELLOW, bg);
  }
}

// Chain geometry: two snake rows of 11x3 boxes, 2-cell gaps. Row 1 runs
// left->right (chain indices 0-5); row 2 runs right->left (indices 6-11)
// so the wrap link is a single vertical cell at the shared right edge.
const CHAIN_W = 11;
const CHAIN_H = 3;
const CHAIN_GAP = 2;
const CHAIN_Y1 = 7;
const CHAIN_Y2 = 11;
const PER_ROW = 6;
const ROW1_X = (i) => 2 + i * (CHAIN_W + CHAIN_GAP);
const ROW2_X = (k) => 67 - k * (CHAIN_W + CHAIN_GAP);

function chainPos(idx) {
  if (idx < PER_ROW) return { x: ROW1_X(idx), y: CHAIN_Y1, dir: 1 };
  return { x: ROW2_X(idx - PER_ROW), y: CHAIN_Y2, dir: -1 };
}

// Draw one mini-map. Pins: current = single flashing box, prior steps =
// steady asterisks, future steps = not drawn at all. Reference pins stay
// dim dots.
function drawMiniMap(grid, mapKey, mx, my, mw, mh, stepIdx, cursorOn, withPins = true) {
  const def = INTRO_MAPS[mapKey];
  const step = INTRO_STEPS[stepIdx];
  const active = step && step.map === mapKey;
  const frameFg = active ? C.YELLOW : C.GREY;
  introBox(grid, mx, my, mw, mh, frameFg, UI.BG, def.title);
  const ix0 = mx + 1;
  const iy0 = my + 1;
  const iw = mw - 2;
  const ih = mh - 2;
  const artW = def.art[0].length;
  // Sea first so land blocks read as a silhouette.
  grid.fillRect(ix0, iy0, iw, ih, 32, C.GREY, C.BLACK);
  for (let r = 0; r < ih; r++) {
    const row = (def.art[r] ?? '').padEnd(artW, ' ').slice(0, artW);
    for (let c = 0; c < iw; c++) {
      if (row[c] === '#') grid.set(ix0 + c, iy0 + r, 32, C.BLACK, C.GREY);
      else grid.set(ix0 + c, iy0 + r, 46, C.LTBLUE, C.BLACK);
    }
  }
  if (withPins) drawMapPins(grid, mapKey, mx, my, mw, mh, stepIdx, cursorOn);
}

// Pins and reference dots for one map. Drawn after the white route path so
// markers always win over the line.
function drawMapPins(grid, mapKey, mx, my, mw, mh, stepIdx, cursorOn) {
  const def = INTRO_MAPS[mapKey];
  const ix0 = mx + 1;
  const iy0 = my + 1;
  const iw = mw - 2;
  const ih = mh - 2;
  const cur = stepPin(stepIdx);
  for (const [name, p] of Object.entries(def.pins)) {
    const sx = ix0 + p.x;
    const sy = iy0 + p.y;
    if (sx < ix0 || sx >= ix0 + iw || sy < iy0 || sy >= iy0 + ih) continue;
    if (p.ref) {
      grid.set(sx, sy, 46, C.GREY, C.GREY);
      continue;
    }
    const isCur = cur === name;
    const seen = pinVisited(name, stepIdx);
    if (isCur) {
      // Current location: a single-character box, flashing with the shared
      // text cursor. No halo: the white route path already leads into it.
      const fg = cursorOn ? C.YELLOW : C.RED;
      grid.set(sx, sy, SOLID, fg, fg);
    } else if (seen) {
      grid.set(sx, sy, 42, C.YELLOW, C.BLACK);
    }
    // Future steps draw nothing: the tour reveals pins as it reaches them.
  }
}

// Breadcrumb for opening a chain node in the tree/flow tabs: the chain
// stops from the C64 down to the node, bridged where the tree needs
// intermediate hops. Stops the tree cannot hang anything under are skipped
// (front-end above wafer: the tree holds both as siblings under the CPU,
// so wafer attaches under the CPU instead). Every hop is a listed tree
// connection, so BACK climbs toward the C64 through the same stops and
// drilling back down re-traverses them. Pure so the viewer (DOM) and node
// self-tests share it; the viewer passes its live lookups in opts:
// { chainIds, root, has(id), kidIds(id), succ: Map, parent: Map }.
export function chainTrail(targetId, opts) {
  const { chainIds, root, has, kidIds, succ, parent } = opts;
  const canon = (id) => {
    if (id === root) return [];
    if (!has(id)) return null;
    const t = [];
    const seen = new Set([id]);
    let cur = id;
    while (cur !== root) {
      const p = parent?.get(cur);
      if (p === undefined || p === null || seen.has(p) || !has(p)) return null;
      t.unshift(p);
      seen.add(p);
      cur = p;
      if (t.length > 600) return null;
    }
    return t;
  };
  const bridge = (fromId, toId) => {
    if (fromId === toId) return [fromId];
    const prev = new Map([[fromId, null]]);
    const q = [fromId];
    while (q.length) {
      const cur = q.shift();
      for (const nxt of succ?.get(cur) ?? []) {
        if (prev.has(nxt) || !has(nxt)) continue;
        prev.set(nxt, cur);
        if (nxt === toId) {
          const path = [toId];
          let c = toId;
          let p = prev.get(c);
          while (p !== null && p !== undefined) {
            path.unshift(p);
            c = p;
            p = prev.get(c);
          }
          return path;
        }
        q.push(nxt);
      }
    }
    return null;
  };
  if (!has(targetId)) return [];
  if (targetId === root) return [];
  const idx = chainIds.indexOf(targetId);
  if (idx < 0) return canon(targetId) ?? [];
  const trail = [targetId];
  let cur = targetId;
  const stops = [];
  for (let k = idx + 1; k < chainIds.length; k++) stops.push(chainIds[k]);
  if (stops[stops.length - 1] !== root) stops.push(root);
  for (const A of stops) {
    if (cur === root) break;
    if (!has(A)) continue;
    if (kidIds(A).includes(cur)) {
      trail.unshift(A);
      cur = A;
      continue;
    }
    const span = bridge(A, cur);
    if (span) {
      for (let k = span.length - 2; k >= 0; k--) trail.unshift(span[k]);
      cur = A;
      continue;
    }
    // Unconnectable stop: skip it and keep climbing from where we are.
  }
  if (trail[0] !== root || new Set(trail).size !== trail.length) {
    return canon(targetId) ?? [];
  }
  return trail.slice(0, -1);
}

// Fixed visit order for the route path. Only pins at or before the current
// step are drawn; the path connects them in this order, crossing maps,
// gaps and ocean alike.
const PATH_ORDER = [
  { pin: 'tana', map: 'norway' },
  { pin: 'springfield', map: 'usa' },
  { pin: 'hemlock', map: 'usa' },
  { pin: 'stpeters', map: 'usa' },
  { pin: 'norristown', map: 'usa' },
  { pin: 'hongkong', map: 'asia' },
];

// Screen position of a pin. mapGeom maps mapKey -> frame origin {x, y}.
function pinScreen(mapGeom, mapKey, pinName) {
  const g = mapGeom[mapKey];
  const p = INTRO_MAPS[mapKey]?.pins[pinName];
  if (!g || !p) return null;
  return { x: g.x + 1 + p.x, y: g.y + 1 + p.y };
}

// White route path up to the current location: horizontal/vertical runs
// with corner bends, never diagonals. Each new segment tries both bend
// orders and keeps the one overlapping already-drawn path cells least
// (endpoints excluded: consecutive segments share a pin). Crosses maps,
// gaps and ocean alike. Endpoints are left for the pins to cover.
function drawPath(grid, mapGeom, stepIdx) {
  const pts = [];
  for (const { pin, map } of PATH_ORDER) {
    if (!pinVisited(pin, stepIdx)) break;
    if (!mapVisible(map, stepIdx)) continue;
    const s = pinScreen(mapGeom, map, pin);
    if (s) pts.push(s);
  }
  const occ = new Set();
  const key = (x, y) => `${x},${y}`;
  // L-route cells between a and b excluding both endpoints. hFirst runs
  // along a.y then down/up b.x; otherwise along a.x then b.y.
  const route = (a, b, hFirst) => {
    const cells = [];
    if (a.x === b.x) {
      const step = a.y < b.y ? 1 : -1;
      for (let y = a.y + step; y !== b.y; y += step) cells.push({ x: a.x, y, c: BOX.V });
      return cells;
    }
    if (a.y === b.y) {
      const step = a.x < b.x ? 1 : -1;
      for (let x = a.x + step; x !== b.x; x += step) cells.push({ x, y: a.y, c: BOX.H });
      return cells;
    }
    if (hFirst) {
      const step = a.x < b.x ? 1 : -1;
      for (let x = a.x + step; x !== b.x; x += step) cells.push({ x, y: a.y, c: BOX.H });
      cells.push({ x: b.x, y: a.y, c: BOX.X });
      const stepy = a.y < b.y ? 1 : -1;
      for (let y = a.y + stepy; y !== b.y; y += stepy) cells.push({ x: b.x, y, c: BOX.V });
    } else {
      const stepy = a.y < b.y ? 1 : -1;
      for (let y = a.y + stepy; y !== b.y; y += stepy) cells.push({ x: a.x, y, c: BOX.V });
      cells.push({ x: a.x, y: b.y, c: BOX.X });
      const step = a.x < b.x ? 1 : -1;
      for (let x = a.x + step; x !== b.x; x += step) cells.push({ x, y: b.y, c: BOX.H });
    }
    return cells;
  };
  const put = (x, y, code) => {
    if (x >= 1 && x <= 78 && y >= 1 && y <= 43) grid.set(x, y, code, C.WHITE, C.BLACK);
  };
  for (let s = 0; s + 1 < pts.length; s++) {
    const a = pts[s];
    const b = pts[s + 1];
    const hCells = route(a, b, true);
    const vCells = route(a, b, false);
    const score = (cells) => cells.reduce((n, cl) => n + (occ.has(key(cl.x, cl.y)) ? 1 : 0), 0);
    const cells = score(vCells) < score(hCells) ? vCells : hCells;
    for (const cl of cells) {
      put(cl.x, cl.y, cl.c);
      occ.add(key(cl.x, cl.y));
    }
  }
}

// Full-panel intro. Hides every other component: the caller clears the
// screen and draws only the title bar, this panel, and the footer.
// Returns click targets for the caller to store.
export function renderIntro(grid, stepIdx, nodes, cursorOn) {
  const U = (s) => toScreenText(s);
  const step = INTRO_STEPS[stepIdx] ?? INTRO_STEPS[0];
  const total = INTRO_STEPS.length;
  const count = Math.min(step.count, INTRO_CHAIN.length);
  const prevCount = stepIdx > 0
    ? Math.min(INTRO_STEPS[stepIdx - 1].count, INTRO_CHAIN.length)
    : 0;
  // The frame owns rows 1-43 now that the header and footer stay hidden
  // during the tour. Its title reads light blue to stand apart from the
  // yellow step title directly below it.
  introBox(grid, 1, 1, 78, 43, UI.FRAME_FG, UI.BG, 'QUARTZ TO COMMODORE', C.LTBLUE);
  // Title on the top line (location, hyphen, material/process), then up
  // to three lines of description. Title shares y2 with SKIP: 64 cols so
  // they never collide.
  grid.text(3, 2, U(step.title).slice(0, 64), C.YELLOW, UI.BG, 64);
  for (const [i, ln] of wrapText(U(step.caption), 74).slice(0, 3).entries()) {
    grid.text(3, 3 + i, ln, C.WHITE, UI.BG, 74);
  }
  const skipLabel = U('[SKIP]');
  grid.text(78 - 2 - skipLabel.length, 2, skipLabel, C.BLACK, C.LTGREY, skipLabel.length);
  const skipHit = { x0: 78 - 2 - skipLabel.length, x1: 78 - 3, y: 2 };

  // Incremental chain. Borders use the same category colours as the tree
  // and flow tabs (live category, static fallback); the boxes added this
  // step read white, earlier ones grey.
  const chainHits = [];
  const visible = INTRO_CHAIN.slice(0, count);
  visible.forEach((entry, idx) => {
    const { x, y } = chainPos(idx);
    const liveCat = nodes?.[entry.id]?.category ?? entry.fb;
    const fg = catColor(liveCat);
    introBox(grid, x, y, CHAIN_W, CHAIN_H, fg, UI.BG, null);
    const label = U(entry.label).slice(0, CHAIN_W - 4);
    const lx = x + 2 + Math.max(0, Math.floor(((CHAIN_W - 4) - label.length) / 2));
    grid.text(lx, y + 1, label, idx >= prevCount ? C.WHITE : C.GREY, UI.BG, label.length);
    chainHits.push({ x0: x, x1: x + CHAIN_W - 1, y0: y, y1: y + CHAIN_H - 1, id: entry.id });
  });
  // Links between consecutive visible boxes. Fresh links (touching a box
  // added this step) read yellow, older ones grey.
  const linkColor = (a, b) => (Math.max(a, b) >= prevCount ? C.YELLOW : C.GREY);
  for (let idx = 0; idx + 1 < count; idx++) {
    const A = chainPos(idx);
    const B = chainPos(idx + 1);
    const fg = linkColor(idx, idx + 1);
    if (A.y === B.y) {
      const y = A.y + 1;
      if (A.dir === 1) {
        const gx = A.x + CHAIN_W;
        grid.set(gx, y, BOX.H, fg, UI.BG);
        grid.text(gx + 1, y, U('>'), fg, UI.BG, 1);
      } else {
        const gx = B.x + CHAIN_W;
        grid.text(gx, y, U('<'), fg, UI.BG, 1);
        grid.set(gx + 1, y, BOX.H, fg, UI.BG);
      }
    }
  }
  // Snake wrap: bottom of row-1 box 5 to top of row-2 box 6, one cell.
  if (count > PER_ROW) {
    grid.set(72, CHAIN_Y1 + CHAIN_H, BOX.V, linkColor(PER_ROW - 1, PER_ROW), UI.BG);
  }

  // Maps appear only when the story reaches them, so the screen starts
  // mostly empty: Norway alone, then +USA, then +E Asia on the last step.
  // Norway's frame is tall and fills the lower-left space; the USA frame
  // is wider to separate its four stops. Layering: land first, then the
  // white route path, then pins on top.
  const MAP_Y = 15;
  const mapX = { norway: 2, usa: 24, asia: 54 };
  const mapGeom = {};
  for (const key of INTRO_MAP_ORDER) {
    if (!mapVisible(key, stepIdx)) continue;
    const mw = INTRO_MAPS[key].art[0].length + 2;
    const mh = INTRO_MAPS[key].art.length + 2;
    mapGeom[key] = { x: mapX[key], y: MAP_Y, w: mw, h: mh };
    drawMiniMap(grid, key, mapX[key], MAP_Y, mw, mh, stepIdx, cursorOn, false);
  }
  drawPath(grid, mapGeom, stepIdx);
  for (const key of INTRO_MAP_ORDER) {
    if (!mapVisible(key, stepIdx)) continue;
    drawMapPins(grid, key, mapX[key], MAP_Y, mapGeom[key].w, mapGeom[key].h, stepIdx, cursorOn);
  }

  // Controls: back / next-or-explore, plus the key line. Both live
  // inside the stretched frame; the chrome footer stays blank.
  const cy = 41;
  const backLabel = U('[< BACK]');
  const nextLabel = stepIdx >= total - 1 ? U('[EXPLORE >]') : U('[NEXT >]');
  grid.text(4, cy, backLabel, stepIdx <= 0 ? C.GREY : C.BLACK, stepIdx <= 0 ? UI.BG : C.LTGREY, backLabel.length);
  grid.text(4 + backLabel.length + 2, cy, nextLabel, C.BLACK, C.YELLOW, nextLabel.length);
  const keyLine = stepIdx >= total - 1
    ? U('ENTER=EXPLORE B=BACK V=VIEW S=SKIP')
    : U('SPACE=NEXT B=BACK V=VIEW S=SKIP');
  grid.text(3, cy + 1, keyLine.slice(0, 74), C.GREY, UI.BG, Math.min(keyLine.length, 74));
  return {
    skip: skipHit,
    back: { x0: 4, x1: 4 + backLabel.length - 1, y: cy, step: stepIdx - 1 },
    next: { x0: 4 + backLabel.length + 2, x1: 4 + backLabel.length + 2 + nextLabel.length - 1, y: cy },
    chain: chainHits,
  };
}
