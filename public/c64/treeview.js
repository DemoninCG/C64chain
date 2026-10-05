import { wrapText } from './textmode.js';
import { toScreenText } from './petscii.js';
import { C } from './palette.js';

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
  push(S(n.id).slice(0, iw), C.GREY);
  push(S(`${n.kind ?? '?'} * ${n.category ?? '?'}`).slice(0, iw), C.CYAN);
  push('SEP', C.GREY);
  push('DESC:', C.GREY);
  for (const ln of wrapText(S(n.description ?? '(NO DESCRIPTION)'), iw)) push(ln, C.LTBLUE);
  if (!(n.children ?? []).length) {
    push('END OF LINE: RAW', C.GREY);
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
          out.push({ id: t, via: 'routed', routed: true });
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
