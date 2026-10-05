/* Commodore 64 production process tree — viewer.
 * No dependencies. Consumes the flat node map emitted by scripts/build.mjs.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------------ state */

const N = {};                 // id -> node
const parents = {};           // id -> [parent ids]
let META = {};
let ROOT = 'c64';
let haystack = new Map();     // id -> lowercased searchable text

const collapsed = new Set();
let selected = null;
let view = 'tree';
let depthLimit = 3;
let query = '';
let matches = new Set();      // ids matching query
let pathIds = new Set();      // matches + all their ancestors
let forceOpen = new Set();    // ancestors of the selected node, always expanded
let catOff = new Set();
let kindOff = new Set();
let confOff = new Set();
let scopeOff = new Set();     // chain/context/alternate toggles (Wave 5 scope policy; default all on)
let dimUnrelated = false;
let markShared = true;
let vis = [];                 // visible instances, pre-order
let byKey = new Map();        // instance key -> instance
let layoutByKey = new Map();  // instance key -> {x, y} in SVG user units
let cam = { x: 0, y: 0, k: 1 };

const ROW = 26;
const BOXH = 21;
const CHARW = 6.35;           // px per char at 12px system font
const SUBW = 5.6;

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
// and the tree is only painted at the very bottom of the file, so that no
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
  // Wave 5 scope policy (chain/context/alternate; catalogue blessed terminal for
  // context/alternate; gate on load-bearing chain). Default all on (show all) so
  // hiding a container never hides contents unexpectedly (README scaffolding note).
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

// Wave 5: refinement only for the dendrogram (legacy children + typed
// contains/made of, like build refinedKids). Dendrogram survives migration
// (refinement edges ARE the tree); flow/context never expand (detail-panel
// cross-links followed without expanding, otherwise +consumes explodes 27->53k
// on hubs like gold 3014x; progressive one-subtree expansion required).
const REFT = new Set(['contains', 'made of']);
const kidsOf = (n) => {
  const out = (n.children ?? []).map((c) => N[c]).filter(Boolean);
  for (const e of n.edges ?? []) {
    if (e && REFT.has(e.rel) && N[e.to] && !out.some((k) => k.id === e.to)) out.push(N[e.to]);
  }
  return out;
};

const ENTITY = new Set(['part', 'material']);
const PROCESSISH = new Set(['process', 'tool', 'facility']);
let projection = 'full';      // 'full' | 'entities'
let showChips = true;         // dead-end process nodes, shown as leaves on their parent
let showEditorial = false;

const passes = (n) => {
  if (catOff.has(n.category)) return false;
  if (kindOff.has(n.kind)) return false;
  if (confOff.has(n.confidence ?? 'unspecified')) return false;
  if (scopeOff.has(n.scope ?? 'chain')) return false;
  return true;
};

/* Does anything below this node survive the projection? */
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
  // Entity-only view needs fresh subtree answers for the node count this call.
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

  /* A hidden process node is not simply dropped and is not simply shown.
   * projectEntity emits an entity and, for each child:
   *   - entity child        -> projected normally
   *   - process child       -> promoted: the top-most entities beneath it are
   *                            lifted to sit where the process was, at the same
   *                            depth, so the chain stays connected and flat
   *   - process with nothing material below -> kept as a dimmed chip
   */
  function chip(n, depth, pkey) {
    const inst = mk(n, depth, pkey, true);
    vis.push(inst); // mk() only builds the object; a chip still has to be rendered
    return inst;
  }

  function promote(n, depth, pkey) {
    const out = [];
    // A process the search explicitly matched stays reachable as a chip, or the
    // search would silently drop it from a view that only draws entities.
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
  buildVisible();
  const depthSlider = $('#depthSlider');
  depthSlider.max = Math.max(4, META.maxDepth);
  $('#depthOut').textContent = depthLimit;

  const leaves = vis.filter((v) => !v.open).length;
  const distinct = new Set(vis.map((v) => v.id)).size;
  $('#status').innerHTML =
    `showing <b>${vis.length.toLocaleString()}</b> rows · <b>${distinct.toLocaleString()}</b> unique` +
    (distinct < META.nodes ? ` of ${META.nodes.toLocaleString()}` : '') +
    ` · ${leaves.toLocaleString()} end points · selected <b>${esc(selected ?? '—')}</b>`;

  if (view === 'outline') renderOutline();
  else renderTree();
}

function renderTree() {
  const svg = $('#canvas');
  svg.replaceChildren();
  $('#outline').hidden = true;
  svg.hidden = false;

  if (!vis.length) return;

  // per-depth column widths from the names actually on screen
  const maxName = [];
  for (const v of vis) maxName[v.depth] = Math.max(maxName[v.depth] ?? 0, v.n.name.length);
  const colX = [0];
  for (let d = 0; d < maxName.length; d++) {
    const chars = maxName[d] ?? 4;
    colX.push(colX[d] + (chars ? Math.min(340, Math.max(110, chars * CHARW + 46)) : 110));
  }

  // y placement
  const pos = new Map();
  let cursor = 0;
  function place(inst) {
    if (!inst.open || !inst.kids.length) {
      const p = { x: colX[inst.depth] ?? 0, y: cursor * ROW + ROW / 2 };
      pos.set(inst.uid, p);
      cursor++;
      return p;
    }
    const ps = inst.kids.map(place);
    const p = { x: colX[inst.depth] ?? 0, y: (ps[0].y + ps[ps.length - 1].y) / 2 };
    pos.set(inst.uid, p);
    return p;
  }
  place(vis[0]);

  const W = colX[colX.length - 1] + 360;
  const H = Math.max(cursor * ROW, 80);

  layoutByKey = new Map();
  for (const inst of vis) {
    const p = pos.get(inst.uid);
    if (p) layoutByKey.set(inst.key, p);
  }

  // If the caller asked for an anchor, correct the pan so that node lands back
  // on the pixel it was clicked at.
  if (anchorPending) {
    const p = layoutByKey.get(anchorPending.key);
    if (p) {
      cam.x = anchorPending.sx - p.x * cam.k;
      cam.y = anchorPending.sy - p.y * cam.k;
    }
    anchorPending = null;
  }

  const g = el('g', { id: 'g', transform: `translate(${cam.x} ${cam.y}) scale(${cam.k})` });

  // related set for dimming
  let related = null;
  if (dimUnrelated && selected && N[selected]) {
    related = new Set([selected]);
    const st = [selected];
    while (st.length) {
      const id = st.pop();
      for (const p of parents[id] ?? []) if (!related.has(p)) { related.add(p); st.push(p); }
    }
    const st2 = [selected];
    while (st2.length) {
      const id = st2.pop();
      for (const c of N[id]?.children ?? []) if (!related.has(c)) { related.add(c); st2.push(c); }
    }
  }

  const linksG = el('g');
  const nodesG = el('g');
  for (const inst of vis) {
    const p = pos.get(inst.uid);
    if (!inst.open || !inst.kids.length) continue;
    for (const k of inst.kids) {
      const q = pos.get(k.uid);
      // A child of a closed node is never laid out, so it has no position.
      // Skip it rather than dereferencing undefined -- this was crashing the
      // whole render and taking every process chip down with it.
      if (!p || !q) continue;
      const dx = Math.max(24, (q.x - p.x) * 0.5);
      const hot = related && (related.has(inst.id) && related.has(k.id));
      linksG.appendChild(el('path', {
        class: `lk${hot ? ' hot' : ''}`,
        d: `M${p.x + 2} ${p.y} C${p.x + dx} ${p.y} ${q.x - dx} ${q.y} ${q.x - 2} ${q.y}`,
      }));
    }
  }

  for (const inst of vis) {
    const p = pos.get(inst.uid);
    if (!p) continue;
    const n = inst.n;
    const name = (n.name.length > 52 ? `${n.name.slice(0, 51)}…` : n.name) + (inst.chip ? ' ⚙' : '');
    const w = name.length * CHARW + 26;
    const x = p.x;
    const y = p.y - BOXH / 2;
    const c = colorOf(n.category);
    const classes = ['nd'];
    if (selected === inst.id) classes.push('sel');
    if (matches.has(inst.id)) classes.push('match');
    if (related && !related.has(inst.id)) classes.push('faint');
    if (inst.chip) classes.push('chip');

    const gg = el('g', {
      class: classes.join(' '),
      'data-key': inst.key,
      transform: `translate(${x} ${p.y})`,
    });
    gg.appendChild(el('rect', { class: 'box', x: 0, y: -BOXH / 2, width: w, height: BOXH, rx: 5 }));
    gg.appendChild(el('rect', { class: 'accent', x: 0, y: -BOXH / 2, width: 3, height: BOXH, fill: c }));
    if (markShared && inst.shared) {
      gg.appendChild(el('rect', {
        class: 'box', x: 0.5, y: -BOXH / 2 + 0.5, width: w - 1, height: BOXH - 1, rx: 5,
        fill: 'none', stroke: c, 'stroke-dasharray': '2 3', opacity: 0.75,
      }));
    }
    const tx = el('text', { x: 9, y: 4, fill: c === '#565f89' ? '#a9b1d6' : '#d7deec' });
    tx.textContent = name;
    gg.appendChild(tx);

    if (inst.expandable) {
      const lx = w + 5;
      gg.appendChild(el('path', { class: 'tog', d: `M${lx - 5} -7 h10 a2 2 0 0 1 2 2 v10 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2 v-10 a2 2 0 0 1 2 -2 z` }));
      const tt = el('text', { class: 'tog', x: lx, y: 3.5, 'text-anchor': 'middle' });
      tt.textContent = inst.open ? '−' : String(inst.n.children.length);
      gg.appendChild(tt);
      // A real hit target for the badge. Hit-testing is done by asking which
      // element the pointer is over, never by comparing coordinates: the
      // viewport and SVG user units are different spaces once pan/zoom is
      // applied, so any arithmetic between them silently misfires.
      gg.appendChild(el('rect', {
        class: 'tog-hit', x: lx - 10, y: -11, width: 20, height: 22, rx: 4,
        fill: 'transparent', 'data-toggle': inst.key,
      }));
    }
    nodesG.appendChild(gg);
  }

  g.appendChild(linksG);
  g.appendChild(nodesG);
  svg.appendChild(g);
  svg.dataset.w = W;
  svg.dataset.h = H;

  applyTransform();
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

  // Resolved ingredient links — the `from` relation built by scripts/build.mjs.
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
  const kidHtml = kids.length
    ? `<div class="kids"><h4>contains / made of — refinement, ${kids.length}</h4><ol>${kids
        .map((k) => `<li><a data-go="${k.id}"><i class="sw" style="background:${colorOf(k.category)}"></i>${esc(k.name)}<span class="c">${k.children?.length ?? 0}↓</span></a></li>`)
        .join('')}</ol></div>`
    : '<div class="kids"><h4>end of the line</h4><ol><li style="padding:4px 8px;color:#545d70">raw material</li></ol></div>';

  // Wave 5 typed relations on dump-edges semantics (typed as stored, legacy by
  // mechanical disposition). Refinement above (dendrogram, progressive one-subtree
  // expansion, safe default); flow/context below as cross-links followed without
  // expanding (reveal ancestors, never subtree-expand, otherwise hubs explode).
  // made by derived from produces (viewer renders derived set as expandable
  // "how this is made" list, so expand-6510 survives; storing both would duplicate).
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
      ${kids.length ? '<button data-act="expand">expand subtree</button>' : ''}
      <button data-act="reveal">reveal in tree</button>
      <button data-act="copy">copy id</button>
    </div>`;

  p.onclick = (e) => {
    const go = e.target.closest('[data-go]');
    if (go) return select(go.dataset.go, { reveal: true });
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'expand') {
      expandSubtree(id);
      render();
    } else if (act === 'reveal') {
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
  // Deliberately does NOT raise depthLimit: raising it to reveal one deep node
  // would expand the entire 3,500-node tree and make the view unusable. The
  // ancestor chain is force-opened instead.
}

function select(id, opts = {}) {
  selected = id;
  if (opts.reveal) revealTo(id);
  render();
  renderPanel(id);
  if (opts.reveal) {
    const inst = vis.find((v) => v.id === id);
    if (inst) centreOn(inst);
  }
}

function centreOn(inst) {
  if (view !== 'tree') {
    const row = $('#outline').querySelector('.orow.sel');
    row?.scrollIntoView({ block: 'center' });
    return;
  }
  const p = layoutByKey.get(inst.key);
  if (!p) return;
  const svg = $('#canvas');
  const vp = svg.getBoundingClientRect();
  cam.x = Math.max(16, vp.width / 3 - p.x * cam.k);
  cam.y = vp.height / 2 - p.y * cam.k;
  applyTransform();
}

function centreRoot() {
  // Fit first, then centre. The root sits at the vertical midpoint of the whole
  // canvas, which on a deep tree is thousands of pixels below the viewport, so
  // fitting without panning to it would leave the button apparently inert.
  fit();
  const root = vis[0];
  if (root) centreOn(root);
}

/* Keep the node you just acted on exactly where it was on screen.
 *
 * Without this, opening a node near the bottom of a 8000px canvas re-centres
 * everything above it and the thing you clicked moves out from under the
 * cursor — which is what made the tree feel impossible to track. */
let anchorPending = null;
function anchorTo(inst) {
  if (view !== 'tree' || !inst) return;
  const p = layoutByKey.get(inst.key);
  if (!p) return;
  anchorPending = { key: inst.key, sx: p.x * cam.k + cam.x, sy: p.y * cam.k + cam.y };
}

function updateProjNote() {
  const chips = N ? Object.keys(N).length : 0;
  $('#projNote').textContent = projection === 'entities'
    ? 'Processes are routed through, so components stay connected to their raw materials. A process with nothing material below it is kept as a chip rather than dropped.'
    : 'Everything is shown: components, materials, processes, tools and facilities.';
  void chips;
}

function applyTransform() {
  $('#canvas').querySelector('#g')?.setAttribute('transform', `translate(${cam.x} ${cam.y}) scale(${cam.k})`);
}

function expandSubtree(id) {
  // Wave 5 progressive one-subtree expansion, refinement only (never flow:
  // +consumes explodes on hubs; flow links in detail panel reveal without expanding).
  const st = [id];
  let maxd = 0;
  while (st.length) {
    const cur = st.pop();
    collapsed.delete(cur);
    for (const k of kidsOf(N[cur] ?? {})) st.push(k.id);
  }
  const d = (x) => { let r = 0; const s = [[x, 0]]; const seen = new Set(); while (s.length) { const [c, dd] = s.pop(); if (seen.has(c)) continue; seen.add(c); r = Math.max(r, dd); for (const k of kidsOf(N[c] ?? {})) s.push([k.id, dd + 1]); } return r; };
  maxd = d(id);
  depthLimit = Math.max(depthLimit, maxd + 1);
  const inst = vis.find((v) => v.id === id);
  if (inst) inst.open = true;
  for (const v of vis) v.open = true;
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
    // Walk the whole ancestor chain, not just the direct parent: the reveal has
    // to start at the root or nothing renders.
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

  // node clicks — badge vs body, decided by element, not by arithmetic
  svg.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; return; }
    const badge = e.target.closest('[data-toggle]');
    if (badge) {
      const inst = byKey.get(badge.dataset.toggle);
      if (!inst?.expandable) return;
      // Decide from what the user can SEE, not from the collapsed set. The two
      // can disagree — a node can be shut by the depth limit without being in
      // `collapsed` — and asking `collapsed` first made the first click on a
      // depth-limited node silently do nothing.
      if (inst.open) {
        collapsed.add(inst.id);
      } else {
        collapsed.delete(inst.id);
        depthLimit = Math.max(depthLimit, inst.depth + 1);
        const sl = $('#depthSlider');
        sl.max = Math.max(4, META.maxDepth);
        sl.value = Math.min(depthLimit, +sl.max);
      }
      anchorTo(inst);
      render();
      return;
    }
    const g = e.target.closest('g.nd');
    if (!g) return;
    const inst = byKey.get(g.dataset.key);
    if (inst) select(inst.id);
  });
  svg.addEventListener('dblclick', (e) => {
    const g = e.target.closest('g.nd');
    if (!g) return;
    const inst = vis[+g.dataset.uid];
    if (inst?.expandable) {
      collapsed.delete(inst.id);
      depthLimit = Math.max(depthLimit, inst.depth + 1);
      render();
    }
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
    const k = Math.min(4, Math.max(0.12, cam.k * (e.deltaY < 0 ? 1.12 : 0.89)));
    cam.x = mx - (mx - cam.x) * (k / cam.k);
    cam.y = my - (my - cam.y) * (k / cam.k);
    cam.k = k;
    svg.querySelector('#g')?.setAttribute('transform', `translate(${cam.x} ${cam.y}) scale(${cam.k})`);
  }, { passive: false });

  let drag = null;
  let suppressClick = false;
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    // Any new press clears a stale suppress flag. Without this, a drag whose
    // trailing click never arrives leaves the latch set and the user's next
    // real click is silently swallowed.
    suppressClick = false;
    drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    // Only become a drag past a few pixels, so a click stays a click. Pointer
    // capture is taken late, and only for real drags, so it can never retarget
    // the click that follows.
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
      if (view === 'tree') fit();
    };
  });

  // projection switch
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
  $('#expandAll').onclick = () => { depthLimit = 99; collapsed.clear(); forceOpen.clear(); render(); fit(); };
  $('#collapseAll').onclick = () => expandToDepth(1);
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
    const cur = vis.findIndex((v) => v.id === selected);
    const inst = vis[cur] ?? vis[0];
    switch (e.key) {
      case '/': e.preventDefault(); search.focus(); search.select(); break;
      case '?': e.preventDefault(); $('#hint').textContent =
        'click node = select · click the +n badge = expand/collapse · dbl-click = open that level · scroll = zoom · drag = pan · / = search · 0 = centre root · Esc = clear search'; break;
      case '0': centreRoot(); break;
      case 'Escape': search.value = ''; runSearch(''); break;
      case 'ArrowDown': e.preventDefault(); if (vis[Math.min(vis.length - 1, cur + 1)]) { select(vis[Math.max(0, Math.min(vis.length - 1, cur + 1))].id, { reveal: true }); } break;
      case 'ArrowUp': e.preventDefault(); if (vis[Math.max(0, cur - 1)]) select(vis[Math.max(0, cur - 1)].id, { reveal: true }); break;
      case 'ArrowRight':
        e.preventDefault();
        if (inst?.expandable && !inst.open) { collapsed.delete(inst.id); render(); select(inst.id); }
        else if (inst?.kids[0]) select(inst.kids[0].id);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (inst?.open) { collapsed.add(inst.id); render(); }
        else { const p = vis.find((v) => v.key === inst?.pid); if (p) select(p.id); }
        break;
      case 'Enter': case ' ':
        if (inst?.expandable) {
          e.preventDefault();
          collapsed.has(inst.id) ? collapsed.delete(inst.id) : collapsed.add(inst.id);
          render();
        }
        break;
      default: break;
    }
  });

  window.addEventListener('resize', () => { if (view === 'tree') fit(); });
}

function fit() {
  const svg = $('#canvas');
  if (svg.hidden) return;
  const W = +svg.dataset.w || 1;
  const vp = svg.getBoundingClientRect();
  // Fit the width, but never zoom out past legibility: a deep tree is 8000px
  // tall, and scaling to fit all of it would make every label 1px high.
  const k = Math.min(1, Math.max(0.5, vp.width / (W + 80)));
  cam.k = k;
  cam.x = 24;
  cam.y = 24;
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
expandToDepth(depthLimit);
renderPanel(null);
render();