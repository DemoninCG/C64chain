// Dev-only: rasterize Natural Earth 110m country polygons onto the intro
// mini-map text grids, so the shapes come from real coordinates instead of
// hand-drawn art. Run: node scripts/rasterize-intro-maps.mjs
import { readFileSync } from 'node:fs';

const SRC = 'C:/Users/corba/AppData/Local/Temp/opencode/ne110.geojson';
const geo = JSON.parse(readFileSync(SRC, 'utf8'));

function polysOf(names) {
  const set = new Set(names);
  const polys = [];
  for (const f of geo.features) {
    if (!set.has(f.properties?.NAME)) continue;
    const g = f.geometry;
    if (g.type === 'Polygon') polys.push(g.coordinates);
    else if (g.type === 'MultiPolygon') for (const p of g.coordinates) polys.push(p);
  }
  return polys;
}

function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function onLand(lon, lat, polys) {
  for (const poly of polys) {
    if (!inRing(lon, lat, poly[0])) continue;
    let hole = false;
    for (let k = 1; k < poly.length; k++) {
      if (inRing(lon, lat, poly[k])) { hole = true; break; }
    }
    if (!hole) return true;
  }
  return false;
}

const PINS = {
  tana: [28.40, 70.43],
  oslo: [10.75, 59.91],
  springfield: [-123.02, 44.05],
  hemlock: [-83.96, 43.42],
  stpeters: [-90.60, 38.78],
  norristown: [-75.34, 40.12],
  hongkong: [114.17, 22.32],
  ina: [137.95, 35.83],
};

function rasterize(name, countries, bbox, pinNames, IW = 22) {
  const [lon0, lon1, lat0, lat1] = bbox;
  const latMid = ((lat0 + lat1) / 2) * Math.PI / 180;
  const kx = Math.cos(latMid);
  const x0 = lon0 * kx, x1 = lon1 * kx;
  const IH = Math.max(4, Math.round(IW * (lat1 - lat0) / (x1 - x0)));
  const polys = polysOf(countries);
  const toLonLat = (c, r) => {
    const fx = (c + 0.5) / IW, fy = (r + 0.5) / IH;
    return [(x0 + fx * (x1 - x0)) / kx, lat1 - fy * (lat1 - lat0)];
  };
  const toCell = (lon, lat) => {
    const fx = ((lon * kx - x0) / (x1 - x0)) * IW - 0.5;
    const fy = ((lat1 - lat) / (lat1 - lat0)) * IH - 0.5;
    return [Math.round(fx), Math.round(fy)];
  };
  const grid = [];
  for (let r = 0; r < IH; r++) {
    let row = '';
    for (let c = 0; c < IW; c++) {
      const [lon, lat] = toLonLat(c, r);
      row += onLand(lon, lat, polys) ? '#' : ' ';
    }
    grid.push(row);
  }
  const pins = {};
  for (const pn of pinNames) {
    const [lon, lat] = PINS[pn];
    let [c, r] = toCell(lon, lat);
    c = Math.max(0, Math.min(IW - 1, c));
    r = Math.max(0, Math.min(IH - 1, r));
    let snap = '';
    if (grid[r][c] !== '#') {
      let best = null, bd = 1e9;
      for (let rr = 0; rr < IH; rr++) {
        for (let cc = 0; cc < IW; cc++) {
          if (grid[rr][cc] !== '#') continue;
          const d = (cc - c) ** 2 + (rr - r) ** 2;
          if (d < bd) { bd = d; best = [cc, rr]; }
        }
      }
      if (best) { snap = ` raw=(${c},${r})`; c = best[0]; r = best[1]; }
    }
    pins[pn] = [c, r, snap];
  }
  // Trim leading/trailing all-sea rows so maps shrink-wrap their land.
  let top = 0, bot = IH - 1;
  while (top <= bot && !grid[top].includes('#')) top++;
  while (bot >= top && !grid[bot].includes('#')) bot--;
  const trimmed = grid.slice(top, bot + 1);
  for (const pn of Object.keys(pins)) pins[pn][1] -= top;
  console.log(`\n### ${name} IW=${IW} IH=${trimmed.length} bbox=[${bbox}]`);
  for (const row of grid) console.log('|' + row.replace(/ /g, '.') + '|');
  for (const [pn, [c, r, snap]] of Object.entries(pins)) {
    console.log(`pin ${pn}: x=${c} y=${r}${snap}`);
  }
  console.log('art:');
  for (const row of trimmed) console.log(`      '${row}',`);
}

rasterize('norway', ['Norway'], [4, 32, 57.5, 71.5], ['tana', 'oslo'], 18);
rasterize('usa', ['United States of America'], [-125.5, -66.5, 24, 49.5], ['springfield', 'hemlock', 'stpeters', 'norristown'], 26);
rasterize('asia', ['China', 'Japan', 'North Korea', 'South Korea', 'Taiwan', 'Mongolia', 'Russia', 'Vietnam', 'Philippines', 'Laos'], [102, 146, 16, 47], ['hongkong', 'ina']);
