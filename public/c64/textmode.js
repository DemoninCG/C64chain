import { PALETTE_RGB } from './palette.js';
import { buildFontBytes } from './petscii.js';

export const COLS = 80;
export const ROWS = 45;
export const CELL = 8;
export const FB_W = 640;
export const FB_H = 360;

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_chars;
uniform sampler2D u_colors;
uniform sampler2D u_font;
uniform sampler2D u_pal;
void main() {
  vec2 px = v_uv * vec2(640.0, 360.0);
  vec2 cell = floor(px / 8.0);
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= 80.0 || cell.y >= 45.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 ic = floor(mod(px, 8.0));
  vec2 tuv = (cell + 0.5) / vec2(80.0, 45.0);
  float chr = floor(texture2D(u_chars, tuv).r * 255.0 + 0.5);
  vec4 cc = texture2D(u_colors, tuv);
  float fgi = floor(cc.r * 255.0 + 0.5);
  float bgi = floor(cc.g * 255.0 + 0.5);
  float gx = mod(chr, 16.0);
  float gy = floor(chr / 16.0);
  vec2 fuv = (vec2(gx * 8.0, gy * 8.0) + ic + 0.5) / 128.0;
  float bit = texture2D(u_font, fuv).r;
  vec3 fg = texture2D(u_pal, vec2((fgi + 0.5) / 16.0, 0.5)).rgb;
  vec3 bg = texture2D(u_pal, vec2((bgi + 0.5) / 16.0, 0.5)).rgb;
  vec3 col = mix(bg, fg, step(0.5, bit));
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

export class TextMode {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = FB_W;
    canvas.height = FB_H;
    this.chars = new Uint8Array(COLS * ROWS);
    this.fgs = new Uint8Array(COLS * ROWS);
    this.bgs = new Uint8Array(COLS * ROWS);
    this.dirty = true;
    this.gl = null;
    this.glError = null;
    try {
      const gl = canvas.getContext('webgl', {
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: true,
      });
      if (!gl) throw new Error('webgl unavailable');
      this.gl = gl;
      this.initGL();
    } catch (e) {
      this.glError = e;
    }
    this.fit();
    window.addEventListener('resize', () => this.fit());
  }

  initGL() {
    const gl = this.gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    this.prog = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const mkTex = (w, h, data) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return t;
    };

    const blank = new Uint8Array(COLS * ROWS * 4);
    this.texChars = mkTex(COLS, ROWS, blank);
    this.texColors = mkTex(COLS, ROWS, blank);

    const pal = new Uint8Array(16 * 4);
    for (let i = 0; i < 16; i++) {
      pal[i * 4] = PALETTE_RGB[i][0];
      pal[i * 4 + 1] = PALETTE_RGB[i][1];
      pal[i * 4 + 2] = PALETTE_RGB[i][2];
      pal[i * 4 + 3] = 255;
    }
    this.texPal = mkTex(16, 1, pal);

    const fontBytes = buildFontBytes();
    this.texFont = mkTex(128, 128, fontBytes);

    const setSampler = (name, unit, tex) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(prog, name), unit);
    };
    setSampler('u_chars', 0, this.texChars);
    setSampler('u_colors', 1, this.texColors);
    setSampler('u_font', 2, this.texFont);
    setSampler('u_pal', 3, this.texPal);

    gl.viewport(0, 0, FB_W, FB_H);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
  }

  fit() {
    const vw = window.innerWidth || FB_W;
    const vh = window.innerHeight || FB_H;
    const s = Math.min(vw / FB_W, vh / FB_H);
    const w = Math.max(1, Math.floor(FB_W * s));
    const h = Math.max(1, Math.floor(FB_H * s));
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  idx(x, y) {
    return y * COLS + x;
  }

  clear(fg = 14, bg = 6) {
    this.chars.fill(32);
    this.fgs.fill(fg);
    this.bgs.fill(bg);
    this.dirty = true;
  }

  set(x, y, code, fg, bg) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const i = y * COLS + x;
    this.chars[i] = code & 255;
    if (fg !== undefined) this.fgs[i] = fg & 15;
    if (bg !== undefined) this.bgs[i] = bg & 15;
    this.dirty = true;
  }

  text(x, y, str, fg, bg, maxW) {
    let cx = x;
    const n = maxW !== undefined ? Math.min(str.length, maxW) : str.length;
    for (let i = 0; i < n; i++) {
      const code = str.charCodeAt(i);
      this.set(cx++, y, code, fg, bg);
      if (cx >= COLS) break;
    }
  }

  fillRect(x, y, w, h, code, fg, bg) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) this.set(x + i, y + j, code, fg, bg);
    }
  }

  present() {
    if (!this.gl) return false;
    const gl = this.gl;
    if (this.dirty) {
      const n = COLS * ROWS;
      const dc = new Uint8Array(n * 4);
      const dl = new Uint8Array(n * 4);
      for (let i = 0; i < n; i++) {
        dc[i * 4] = this.chars[i];
        dc[i * 4 + 3] = 255;
        dl[i * 4] = this.fgs[i];
        dl[i * 4 + 1] = this.bgs[i];
        dl[i * 4 + 3] = 255;
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texChars);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, COLS, ROWS, gl.RGBA, gl.UNSIGNED_BYTE, dc);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.texColors);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, COLS, ROWS, gl.RGBA, gl.UNSIGNED_BYTE, dl);
      this.dirty = false;
    }
    gl.viewport(0, 0, FB_W, FB_H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }
}

export function wrapText(str, width) {
  const words = String(str ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + (cur ? ' ' : '') + w).length <= width) {
      cur = cur ? cur + ' ' + w : w;
    } else {
      if (cur) lines.push(cur);
      if (w.length > width) {
        for (let i = 0; i < w.length; i += width) lines.push(w.slice(i, i + width));
        cur = '';
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}
