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

const CLEAN_FRAG_SRC = `
// Pass 1: crisp 640x360 text frame, no post. Rendered once per edit into
// an offscreen texture; the post pass upscales from here.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform sampler2D u_chars;
uniform sampler2D u_colors;
uniform sampler2D u_font;
uniform sampler2D u_pal;
vec3 cleanAt(vec2 uv) {
  vec2 px = uv * vec2(640.0, 360.0);
  vec2 cell = floor(px / 8.0);
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= 80.0 || cell.y >= 45.0) {
    return vec3(0.0);
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
  return mix(bg, fg, step(0.5, bit));
}
void main() {
  // FBO textures store row 0 at the bottom while the on-screen pass reads
  // uv.y = 0 as the top, so flip on write to keep the frame upright.
  gl_FragColor = vec4(cleanAt(vec2(v_uv.x, 1.0 - v_uv.y)), 1.0);
}
`;

const POST_FRAG_SRC = `
// Pass 2: upscale-then-shade NTSC / VHS post.
// The canvas backing store already matches the displayed size (see fit()),
// so this runs per OUTPUT pixel: the clean 640x360 frame is sampled with
// NEAREST-style texel centres for the sharp luma path and with hardware
// bilinear for the smooth chroma-bleed path, while grain, wave offsets,
// scanlines and vignette are all evaluated at full output resolution.
// Stages mirror the old single-pass chain: edge wave -> tracking
// displacement -> sharp-luma / bleeding-chroma (YIQ) split -> saturation
// boost -> luma-only noise -> sharpened luma -> scanlines / head-switch.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform sampler2D u_clean;
uniform float u_time;
uniform float u_on;
uniform float u_sat;
uniform float u_luma;
uniform float u_bleed;
uniform float u_wave;
uniform float u_track;
uniform float u_sharp;
uniform float u_scan;

vec3 rgb2yiq(vec3 c) {
  return vec3(
    dot(c, vec3(0.299, 0.587, 0.114)),
    dot(c, vec3(0.596, -0.274, -0.322)),
    dot(c, vec3(0.211, -0.523, 0.312)));
}
vec3 yiq2rgb(vec3 c) {
  return vec3(
    c.x + 0.956 * c.y + 0.621 * c.z,
    c.x - 0.272 * c.y - 0.647 * c.z,
    c.x - 1.106 * c.y + 1.703 * c.z);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
// Sine-free animated grain. fract(sin(dot())) folds x/y together along one
// direction and quantizes into diagonal bands; this hash has no directional
// correlation, and the per-frame seed re-mixes the field so frames read as
// independent grain rather than a sliding window of a single field.
float grain(vec2 px, float seed) {
  vec3 p3 = fract(vec3(px.xyx) * 0.1031 + seed);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z) - 0.5;
}
// Crisp path: exact texel centre, so flat blocks stay flat at any upscale.
vec3 cleanNearest(vec2 uv) {
  vec2 sp = clamp(uv, 0.0, 1.0) * vec2(640.0, 360.0);
  vec2 tc = (floor(sp) + 0.5) / vec2(640.0, 360.0);
  return texture2D(u_clean, tc).rgb;
}
// Smooth path: hardware bilinear ramps across edges instead of stepping.
vec3 cleanLinear(vec2 uv) {
  return texture2D(u_clean, clamp(uv, 0.0, 1.0)).rgb;
}
void main() {
  vec2 uv0 = v_uv;
  if (u_on < 0.5) {
    gl_FragColor = vec4(cleanNearest(uv0), 1.0);
    return;
  }
  float t = u_time;
  vec2 uv = uv0;
  // 1. VHS edge wave (~2 source px peak, sub-pixel smooth at output res).
  float wob = sin(uv.y * 57.0 + t * 4.2) * 0.0 + sin(uv.y * 12.0 - t * 1.7) * 0.0;
  uv.x += (wob / 640.0) * u_wave;
  // 2. Tracking: slow rolling band + rare thin glitch line + head switch.
  //    Frame counter wraps so hash inputs stay in mediump-friendly range.
  float trackY = 1.0 - fract(t * 0.07 + 0.3);
  float bd = uv.y - trackY;
  float band = exp(-bd * bd * 1800.0);
  float frame = mod(floor(t * 20.0), 50.0);
  float gy = hash12(vec2(frame, 1.7));
  float gate = step(0.62, hash12(vec2(frame, 9.2)));
  float glitch = (1.0 - step(0.002, abs(uv.y - gy))) * gate;
  float head = step(0.972, uv0.y);
  float disp = glitch * 0.0;
  vec2 suv = vec2(clamp(uv.x + disp * u_track, 0.0, 1.0), clamp(uv.y, 0.0, 1.0));
  // 3. Sharp luma (nearest) vs bleeding chroma (bilinear wide blur, smeared
  //    right like composite). Tap offsets stay in source-px units so the look
  //    matches at any window size.
  vec2 px1 = vec2(1.0 / 640.0, 0.0);
  vec3 c0 = cleanNearest(suv);
  vec3 cL1 = cleanNearest(suv - px1);
  vec3 cR1 = cleanNearest(suv + px1);
  vec3 bL3 = cleanLinear(suv - 3.0 * px1);
  vec3 bL2 = cleanLinear(suv - 2.0 * px1);
  vec3 bL1 = cleanLinear(suv - px1);
  vec3 b0 = cleanLinear(suv);
  vec3 bR1 = cleanLinear(suv + px1);
  vec3 bR2 = cleanLinear(suv + 2.0 * px1);
  vec3 bR3 = cleanLinear(suv + 3.0 * px1);
  vec3 y0 = rgb2yiq(c0);
  vec3 yL1 = rgb2yiq(cL1);
  vec3 yR1 = rgb2yiq(cR1);
  vec2 bleed = rgb2yiq(bL3).yz * 0.10 + rgb2yiq(bL2).yz * 0.16 + rgb2yiq(bL1).yz * 0.20
             + rgb2yiq(b0).yz * 0.22
             + rgb2yiq(bR1).yz * 0.15 + rgb2yiq(bR2).yz * 0.10 + rgb2yiq(bR3).yz * 0.07;
  vec2 chroma = mix(y0.yz, bleed, clamp(u_bleed, 0.0, 1.0));
  // 4. VHS sharpening on luma only (unsharp from 1-source-px neighbours).
  float yBlur = (yL1.x + yR1.x) * 0.5;
  float ySharp = clamp(y0.x + (y0.x - yBlur) * u_sharp * 1.5, 0.0, 1.0);
  // 5. Saturation boost (sample is hotter than raw viewer blues).
  vec3 rgb = yiq2rgb(vec3(ySharp, chroma * u_sat));
  // 6. Luma noise only, per OUTPUT pixel (gl_FragCoord): equal RGB addition
  //    leaves I/Q untouched, so still no chroma noise at the higher res.
  //    Coords wrap to stay precise in mediump.
  float gframe = mod(floor(t * 60.0), 61.0);
  float n = grain(mod(gl_FragCoord.xy, 1024.0), fract(gframe * 0.61803) * 4.0);
  float nAmp = u_luma * (1.0 + band * 2.0 * u_track + glitch * 3.0 * u_track + head * 2.5);
  rgb += vec3(nAmp * n * 1.0);
  // 7. Scanlines: one smooth sine cycle per emulated source row.
  rgb *= 1.0 - u_scan * (0.5 + 0.5 * sin(suv.y * 2261.9));
  vec2 vd = uv0 - 0.5;
  rgb *= 1.0 - 0.16 * dot(vd, vd);
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
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

// NTSC/VHS post chain tunables. Defaults target ntsc_sample.png:
// hotter saturation, luma-only grain, full chroma bleed, gentle wave,
// full tracking, medium sharpen, faint scanlines. `on` is the master
// bypass (u_on<0.5 renders the clean framebuffer).
export const NTSC_DEFAULTS = {
  on: 1, sat: 1.38, luma: 0.085, bleed: 1.0,
  wave: 1.0, track: 1.0, sharp: 0.6, scan: 0.1,
};

function fxFromQuery() {
  const out = {};
  try {
    const q = new URLSearchParams(window.location?.search ?? '');
    if (q.has('ntsc')) out.on = q.get('ntsc') === '0' ? 0 : 1;
    for (const k of ['sat', 'luma', 'bleed', 'wave', 'track', 'sharp', 'scan']) {
      if (q.has(k)) {
        const v = Number(q.get(k));
        if (Number.isFinite(v)) out[k] = v;
      }
    }
    if (q.has('on')) out.on = Number(q.get('on')) ? 1 : 0;
  } catch { /* non-browser / blocked URL: keep defaults */ }
  return out;
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
    this.fx = { ...NTSC_DEFAULTS, ...fxFromQuery() };
    this.uLoc = null;
    this.progClean = null;
    this.progPost = null;
    this.fbClean = null;
    this.texClean = null;
    this.t0 = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
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
    const linkProg = (fsSrc) => {
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error('link: ' + gl.getProgramInfoLog(prog));
      }
      return prog;
    };
    this.progClean = linkProg(CLEAN_FRAG_SRC);
    this.progPost = linkProg(POST_FRAG_SRC);
    this.locClean = gl.getAttribLocation(this.progClean, 'a_pos');
    this.locPost = gl.getAttribLocation(this.progPost, 'a_pos');

    this.quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const mkTex = (w, h, data, linear = false) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      const filt = linear ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data ?? null);
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

    // Offscreen clean frame: LINEAR so the post pass gets smooth chroma
    // ramps between texels; the sharp luma path samples exact texel
    // centres instead, which reads back the unblended texel.
    this.texClean = mkTex(FB_W, FB_H, null, true);
    this.fbClean = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbClean);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texClean, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('clean framebuffer incomplete');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Data textures live on units 0-3 for the clean program; the clean
    // frame lives on unit 4 for the post program. Units are fixed once.
    gl.useProgram(this.progClean);
    gl.uniform1i(gl.getUniformLocation(this.progClean, 'u_chars'), 0);
    gl.uniform1i(gl.getUniformLocation(this.progClean, 'u_colors'), 1);
    gl.uniform1i(gl.getUniformLocation(this.progClean, 'u_font'), 2);
    gl.uniform1i(gl.getUniformLocation(this.progClean, 'u_pal'), 3);
    gl.useProgram(this.progPost);
    gl.uniform1i(gl.getUniformLocation(this.progPost, 'u_clean'), 4);

    this.uLoc = {};
    for (const n of ['u_time', 'u_on', 'u_sat', 'u_luma', 'u_bleed', 'u_wave', 'u_track', 'u_sharp', 'u_scan']) {
      this.uLoc[n] = gl.getUniformLocation(this.progPost, n);
    }

    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
  }

  bindQuad(loc) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  renderClean() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbClean);
    gl.viewport(0, 0, FB_W, FB_H);
    gl.useProgram(this.progClean);
    this.bindQuad(this.locClean);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texChars);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texColors);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texFont);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.texPal);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  setFX(partial) {
    Object.assign(this.fx, partial ?? {});
  }

  toggleFX() {
    this.fx.on = this.fx.on ? 0 : 1;
    return this.fx.on;
  }

  fit() {
    // CSS box keeps the 16:9 stage fit; the backing store below is what the
    // post shader actually shades at, so effects resolve per displayed pixel
    // instead of per emulated pixel. DPR capped at 2 and the frame capped at
    // 1920x1080: beyond that the analog look stops changing and only the
    // per-output-pixel cost keeps growing.
    const vw = window.innerWidth || FB_W;
    const vh = window.innerHeight || FB_H;
    const s = Math.min(vw / FB_W, vh / FB_H);
    const cssW = Math.max(1, Math.floor(FB_W * s));
    const cssH = Math.max(1, Math.floor(FB_H * s));
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = Math.min(1, 1920 / (cssW * dpr), 1080 / (cssH * dpr));
    const outW = Math.max(FB_W, Math.round(cssW * dpr * k));
    const outH = Math.max(FB_H, Math.round(cssH * dpr * k));
    if (this.canvas.width !== outW || this.canvas.height !== outH) {
      this.canvas.width = outW;
      this.canvas.height = outH;
    }
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
      this.renderClean();
      this.dirty = false;
    }
    // Post runs at the full backing-store size set by fit().
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.progPost);
    this.bindQuad(this.locPost);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.texClean);
    const now = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000 - this.t0;
    const L = this.uLoc ?? {};
    const f = this.fx;
    if (L.u_time) gl.uniform1f(L.u_time, now);
    if (L.u_on) gl.uniform1f(L.u_on, f.on ? 1 : 0);
    if (L.u_sat) gl.uniform1f(L.u_sat, +f.sat);
    if (L.u_luma) gl.uniform1f(L.u_luma, +f.luma);
    if (L.u_bleed) gl.uniform1f(L.u_bleed, +f.bleed);
    if (L.u_wave) gl.uniform1f(L.u_wave, +f.wave);
    if (L.u_track) gl.uniform1f(L.u_track, +f.track);
    if (L.u_sharp) gl.uniform1f(L.u_sharp, +f.sharp);
    if (L.u_scan) gl.uniform1f(L.u_scan, +f.scan);
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
