import { FONT_BASIC } from './font8x8.js';

export const SPACE = 32;

export const BOX = {
  TL: 176,
  TR: 174,
  BL: 173,
  BR: 189,
  H: 192,
  V: 221,
  LT: 193,
  RT: 194,
  TT: 195,
  BT: 196,
  X: 197,
};

export const SOLID = 160;

const BOX_SET = new Set(Object.values(BOX).concat([SOLID]));

function drawBoxGlyph(ctx, code, x0, y0) {
  ctx.fillStyle = '#000';
  ctx.fillRect(x0, y0, 8, 8);
  ctx.fillStyle = '#fff';
  const hFull = () => ctx.fillRect(x0, y0 + 3, 8, 2);
  const vFull = () => ctx.fillRect(x0 + 3, y0, 2, 8);
  const hRight = () => ctx.fillRect(x0 + 3, y0 + 3, 5, 2);
  const hLeft = () => ctx.fillRect(x0, y0 + 3, 5, 2);
  const vDown = () => ctx.fillRect(x0 + 3, y0 + 3, 2, 5);
  const vUp = () => ctx.fillRect(x0 + 3, y0, 2, 5);
  switch (code) {
    case BOX.H: hFull(); break;
    case BOX.V: vFull(); break;
    case BOX.TL: hRight(); vDown(); break;
    case BOX.TR: hLeft(); vDown(); break;
    case BOX.BL: hRight(); vUp(); break;
    case BOX.BR: hLeft(); vUp(); break;
    case BOX.LT: vFull(); hRight(); break;
    case BOX.RT: vFull(); hLeft(); break;
    case BOX.TT: hFull(); vDown(); break;
    case BOX.BT: hFull(); vUp(); break;
    case BOX.X: hFull(); vFull(); break;
    case SOLID: ctx.fillRect(x0, y0, 8, 8); break;
    default: break;
  }
}

function drawBitmapGlyph(ctx, code, x0, y0) {
  const rows = FONT_BASIC[code] ?? null;
  ctx.fillStyle = '#000';
  ctx.fillRect(x0, y0, 8, 8);
  if (!rows) return;
  ctx.fillStyle = '#fff';
  for (let y = 0; y < 8; y++) {
    const bits = rows[y] & 0xff;
    if (!bits) continue;
    for (let x = 0; x < 8; x++) {
      if (bits & (1 << x)) ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
}

function paintBoxBytes(data, code, gx, gy) {
  const px = (x, y, w, h) => {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const ox = gx + x + i;
        const oy = gy + y + j;
        const o = (oy * 128 + ox) * 4;
        data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = 255;
      }
    }
  };
  const hFull = () => px(0, 3, 8, 2);
  const vFull = () => px(3, 0, 2, 8);
  const hRight = () => px(3, 3, 5, 2);
  const hLeft = () => px(0, 3, 5, 2);
  const vDown = () => px(3, 3, 2, 5);
  const vUp = () => px(3, 0, 2, 5);
  switch (code) {
    case BOX.H: hFull(); break;
    case BOX.V: vFull(); break;
    case BOX.TL: hRight(); vDown(); break;
    case BOX.TR: hLeft(); vDown(); break;
    case BOX.BL: hRight(); vUp(); break;
    case BOX.BR: hLeft(); vUp(); break;
    case BOX.LT: vFull(); hRight(); break;
    case BOX.RT: vFull(); hLeft(); break;
    case BOX.TT: hFull(); vDown(); break;
    case BOX.BT: hFull(); vUp(); break;
    case BOX.X: hFull(); vFull(); break;
    case SOLID: px(0, 0, 8, 8); break;
    default: break;
  }
}

export function buildFontBytes() {
  const data = new Uint8Array(128 * 128 * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  for (let code = 0; code < 256; code++) {
    const gx = (code % 16) * 8;
    const gy = Math.floor(code / 16) * 8;
    if (BOX_SET.has(code)) {
      paintBoxBytes(data, code, gx, gy);
      continue;
    }
    if (code < 32 || code > 126) continue;
    const rows = FONT_BASIC[code];
    if (!rows) continue;
    for (let y = 0; y < 8; y++) {
      const bits = rows[y] & 0xff;
      if (!bits) continue;
      for (let x = 0; x < 8; x++) {
        if (bits & (1 << x)) {
          const o = ((gy + y) * 128 + (gx + x)) * 4;
          data[o] = 255; data[o + 1] = 255; data[o + 2] = 255;
        }
      }
    }
  }
  return data;
}

export function buildFontCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  const bytes = buildFontBytes();
  const img = ctx.createImageData(128, 128);
  img.data.set(bytes);
  ctx.putImageData(img, 0, 0);
  return cv;
}

const SANITIZE_MAP = {
  '—': '-', '–': '-', '→': '>', '›': '>', '‹': '<', '←': '<',
  '…': '.', '⚙': '*', '▚': '*', '▾': 'v', '▸': '>', '+': '+',
  '“': '"', '”': '"', '‘': "'", '’': "'", '´': "'", '`': "'",
  'é': 'e', 'è': 'e', 'ê': 'e', 'ü': 'u', 'ö': 'o', 'ä': 'a',
  'É': 'E', 'È': 'E', 'Ü': 'U', 'Ö': 'O', 'Ä': 'A',
};

export function toScreenCode(ch) {
  if (SANITIZE_MAP[ch] !== undefined) ch = SANITIZE_MAP[ch];
  const code = ch.charCodeAt(0);
  if (code === 10 || code === 13) return SPACE;
  if (code >= 32 && code <= 126) return code;
  return 63;
}

export function toScreenText(s) {
  s = String(s ?? '');
  let out = '';
  for (const ch of s) {
    const mapped = SANITIZE_MAP[ch] !== undefined ? SANITIZE_MAP[ch] : ch;
    for (const c of mapped) {
      const code = c.charCodeAt(0);
      out += (code >= 32 && code <= 126) ? c : '?';
    }
  }
  return out;
}
