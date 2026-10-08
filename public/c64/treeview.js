import { wrapText } from './textmode.js';
import { toScreenText } from './petscii.js';
import { C } from './palette.js';
import { catColor } from './flowview.js';

export function childLines(simpleName, textW, maxLines = 4) {
  const lines = wrapText(String(simpleName ?? '?'), textW);
  if (lines.length <= maxLines) return lines;
  const out = lines.slice(0, maxLines);
  out[maxLines - 1] = out[maxLines - 1].slice(0, Math.max(0, textW - 3)) + '...';
  return out;
}

export function layoutChildren(kids, textW, maxLines = 4) {
  return kids.map((k) => {
    const lines = childLines(k.simple_name, textW, maxLines);
    return { id: k.id, kind: k.kind, routed: !!k.routed, lines, h: lines.length + 2 };
  });
}

export function visibleWindow(boxes, startIdx, maxRows, gap = 1) {
  const visible = [];
  let used = 0;
  let i = Math.max(0, startIdx);
  for (; i < boxes.length; i++) {
    const need = boxes[i].h + (visible.length ? gap : 0);
    if (used + need > maxRows) break;
    used += need;
    visible.push({ ...boxes[i], index: i });
  }
  return {
    visible,
    usedRows: used,
    hasMoreAbove: startIdx > 0,
    hasMoreBelow: i < boxes.length,
  };
}

export function clampStart(startIdx, total) {
  if (total <= 0) return 0;
  return Math.min(Math.max(0, startIdx), total - 1);
}

export const EDGE_MODES = [
  { id: 'contains', label: 'CONTAINS', desc: 'parts breakdown', rels: ['contains'] },
  { id: 'supply', label: 'SUPPLY CHAIN', desc: 'supply links', rels: ['contains', 'made of', 'made from', 'step', 'consumes'], def: true, chain: true },
  { id: 'materials', label: 'MATERIALS', desc: 'what it is made of', rels: ['made of', 'made from', 'consumes'], chain: true },
  { id: 'context', label: 'CONTEXT', desc: 'equipment, places, notes', rels: ['uses', 'at', 'owned by', 'about'] },
  { id: 'all', label: 'ALL', desc: 'everything but produces', rels: ['contains', 'made of', 'made from', 'step', 'consumes', 'uses', 'at', 'owned by', 'about'], chain: true },
];

export const PROVENANCE_LABEL = {
  raw: 'RAW MATERIAL',
  complete: 'SUPPLY KNOWLEDGE COMPLETE',
  incomplete: 'SUPPLY KNOWLEDGE GAP',
};

// End of line means no onward connections at all: legacy children, typed
// edges, resolved ingredient links, or a derived producer. Checking children
// alone mislabels nodes whose only links are typed edges.
export function hasConnections(n) {
  return !!((n.children ?? []).length || (n.edges ?? []).length
    || (n.from ?? []).length || (n.made_by ?? []).length);
}

export const KIND_COLOR = {
  part: 7,
  material: 13,
  process: 12,
  facility: 8,
  tool: 10,
  note: 4,
  site: 9,
  org: 14,
};

export function kindColor(kind) {
  return KIND_COLOR[kind] ?? 12;
}

export function nodeContent(n, iw) {
  const L = [];
  const S = (s) => toScreenText(String(s ?? ''));
  const push = (t, fg) => L.push({ t, fg });
  for (const ln of wrapText(S(n.name ?? n.id), iw)) push(ln, C.YELLOW);
  push(S(n.kind ?? '?').slice(0, iw), C.CYAN);
  const cc = catColor(n.category);
  for (const ln of wrapText(S(`${n.category ?? '?'} - ${n.subcat ?? 'other'}`), iw)) push(ln, cc);
  push('SEP', C.GREY);
  push('DESC:', C.GREY);
  for (const ln of wrapText(S(n.description ?? '(NO DESCRIPTION)'), iw)) push(ln, C.LTBLUE);
  if (!hasConnections(n)) {
    // Provenance decides the end-of-line label: a connectionless node is a
    // raw endpoint only when reviewed as one. Unflagged nodes keep it neutral.
    // Wrapped: the longest label is 41 chars, the panel fits 26 per row.
    const label = PROVENANCE_LABEL[n.provenance] ? `END OF LINE: ${PROVENANCE_LABEL[n.provenance]}` : 'END OF LINE';
    for (const ln of wrapText(S(label), iw)) push(ln, C.GREY);
  }
  return L;
}

const ENTITY = new Set(['part', 'material']);

// Route-through only looks *through* operations. A facility/site/org/note is a
// destination, not a window: expanding one (e.g. the generated catalogue with
// hundreds of adopted materials) flattens its whole subtree into the parent.
const LIFT_KINDS = new Set(['process', 'tool']);

// Route-through only follows compositional links. Flow-sequence (step) and
// context (uses/at/owned by/about) links are shown as direct connections where
// the mode includes them, but looking through them fans out across the whole
// industrial graph (e.g. root/all hit 239 rows).
const LIFT_LINKS = new Set(['contains', 'made of', 'made from', 'consumes']);

export function modeById(id) {
  return EDGE_MODES.find((m) => m.id === id) ?? EDGE_MODES.find((m) => m.def);
}

export function connectionsOf(node, nodes, relSet, opts = {}) {
  const { chain = false } = opts;
  const out = [];
  const seen = new Set();
  if (node && typeof node.id === 'string') seen.add(node.id);

  const emit = (id, via, routed) => {
    if (!nodes[id] || seen.has(id)) return false;
    seen.add(id);
    out.push({ id, via, routed: !!routed });
    return true;
  };

  const traverseFrom = (n) => {
    const links = [];
    for (const c of n.children ?? []) links.push(c);
    for (const e of n.edges ?? []) {
      if (e && typeof e.to === 'string' && LIFT_LINKS.has(e.rel)) links.push(e.to);
    }
    if (chain) for (const f of n.from ?? []) links.push(f);
    return links;
  };

  const lift = (startId) => {
    if (!LIFT_KINDS.has(nodes[startId]?.kind)) return;
    const stack = [startId];
    const done = new Set([startId]);
    while (stack.length) {
      const id = stack.pop();
      const n = nodes[id];
      if (!n) continue;
      for (const t of traverseFrom(n)) {
        if (!nodes[t] || seen.has(t) || done.has(t)) continue;
        done.add(t);
        if (ENTITY.has(nodes[t].kind)) {
          seen.add(t);
          out.push({ id: t, via: startId, routed: true });
        } else if (LIFT_KINDS.has(nodes[t].kind)) {
          seen.add(t);
          stack.push(t);
        }
      }
    }
  };

  if (!node) return out;
  const directFlow = [];
  for (const c of node.children ?? []) {
    if (emit(c, 'child', false) && !ENTITY.has(nodes[c].kind)) directFlow.push(c);
  }
  for (const e of node.edges ?? []) {
    if (!e || typeof e.to !== 'string' || !relSet.has(e.rel)) continue;
    if (emit(e.to, e.rel, false) && !ENTITY.has(nodes[e.to].kind)) directFlow.push(e.to);
  }
  if (chain) for (const f of node.from ?? []) emit(f, 'from', false);
  for (const id of directFlow) lift(id);
  if (chain) {
    for (const p of node.made_by ?? []) {
      if (!nodes[p] || seen.has(p)) continue;
      if (emit(p, 'made by', false) && !ENTITY.has(nodes[p].kind)) lift(p);
    }
  }
  return out;
}

// Order connections so entities routed through a process list directly under
// that process. Routed orphans (parent not listed) keep relative order at end.
export function groupRouted(conns) {
  const out = [];
  const placed = new Set();
  for (const c of conns) {
    if (c.routed) continue;
    out.push(c);
    for (const r of conns) {
      if (r.routed && !placed.has(r.id) && r.via === c.id) {
        out.push(r);
        placed.add(r.id);
      }
    }
  }
  for (const r of conns) if (r.routed && !placed.has(r.id)) out.push(r);
  return out;
}

// Lay out child boxes, narrowing ones routed under a listed parent process so
// the tree panel can indent them. Marks narrowed boxes with sub = true.
export function layoutTreeBoxes(kids, textW, indent = 2) {
  const boxes = layoutChildren(kids, textW, 3);
  const ids = new Set(kids.map((k) => k.id));
  boxes.forEach((b, i) => {
    if (kids[i].via && ids.has(kids[i].via)) {
      const lines = childLines(kids[i].simple_name, textW - indent, 3);
      b.lines = lines;
      b.h = lines.length + 2;
      b.sub = true;
    }
  });
  return boxes;
}

// Draw plan for the visible tree-panel boxes: routed boxes under a listed
// parent process stay indented even when the parent has scrolled out of view,
// so a group reads the same while scrolling.
export function planTreePanel(kids, visible, cx0, cw, indent = 2) {
  return visible.map((b) => {
    const via = kids[b.index]?.via ?? null;
    const grouped = !!b.sub;
    return {
      ...b,
      via,
      grouped,
      bx: grouped ? cx0 + indent : cx0,
      bw: grouped ? cw - indent : cw,
    };
  });
}

// Vertical span of the main connection trunk: it ends at the last directly
// connected box, never inside a routed group hanging off a parent process.
export function trunkSpan(tMid, drawn) {
  const anchors = drawn.filter((d) => !d.grouped);
  return {
    lo: Math.min(tMid, drawn[0].mid),
    hi: Math.max(tMid, ...anchors.map((d) => d.mid)),
  };
}

// Rail segments plus junctions linking grouped boxes to their parent
// process. A parent scrolled out above leaves its rail starting at the
// window top, so the group stays visibly attached while scrolling.
export function groupRails(drawn, byId, topY, x) {
  const rails = [];
  const links = [];
  for (const d of drawn) {
    if (!d.grouped) continue;
    const p = byId.get(d.via);
    rails.push({ x, y0: p ? p.y + p.h : topY, y1: d.mid });
    links.push({ x, y: d.mid });
  }
  return { rails, links };
}

export function ensureCursorVisible(cursor, startIdx, boxes, maxRows, gap = 1) {
  let start = clampStart(startIdx, boxes.length);
  if (cursor < 0 || cursor >= boxes.length) return start;
  if (start > cursor) return cursor;
  for (;;) {
    const w = visibleWindow(boxes, start, maxRows, gap);
    if (w.visible.some((v) => v.index === cursor)) return start;
    start++;
    if (start >= boxes.length) return clampStart(cursor, boxes.length);
  }
}
