#!/usr/bin/env node
/**
 * patch.mjs — byte-preserving node field editor.
 *
 *   node scripts/patch.mjs <file.json> <nodeId> <key> <value>
 *   node scripts/patch.mjs <file.json> --get <nodeId> <key>
 *
 * Why this exists: JSON.parse + JSON.stringify round-trips reformat the whole
 * file, which turns a one-line edit into a full-file diff. The QA pass learned
 * this twice. This locates the target node's braces in the RAW text and
 * rewrites only the one string value, so every other byte is untouched —
 * including compact one-line `facts` arrays and original spacing.
 *
 * Refuses rather than guesses: if the node id is absent or ambiguous, it exits
 * non-zero without writing.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [file, nodeId, mode, key, ...rest] = process.argv.slice(2);
const usage = 'usage: node scripts/patch.mjs <file.json> <nodeId> get <key>\n'
  + '       node scripts/patch.mjs <file.json> <nodeId> set <key> <value>';
if (!file || !nodeId || !mode || !key) {
  console.error(usage);
  process.exit(2);
}

const raw = readFileSync(file, 'utf8');

/* --- locate the node's DEFINITION, exactly ---------------------------------
 * Two bugs lived here, both found by an agent whose edits landed in the wrong
 * node while the tool reported success.
 *
 * 1. The backward brace-walk counted `{` and `}` characters that appear INSIDE
 *    string values, so for a node preceded by any description containing a
 *    brace the computed slice began at an earlier sibling.
 * 2. Matching the bare quoted id also matched a reference to it in a `children`
 *    or `inputs` array, making an ordinary node look like a duplicate id.
 *
 * So: one forward pass that is string-aware, recording every object's span as
 * it opens and closes, and matching only an "id" KEY at object depth. */
function findNodeSlices(text, id) {
  const spans = new Map();                 // object start -> { start, end }
  const stack = [];
  const hits = [];                         // positions of the target id VALUE
  let pendingKey = null;
  let i = 0;

  const readString = (from) => {
    let e = from + 1;
    while (e < text.length) {
      if (text[e] === '\\') { e += 2; continue; }
      if (text[e] === '"') return e + 1;
      e++;
    }
    return -1;
  };

  while (i < text.length) {
    const c = text[i];

    if (c === '"') {
      const raw = text.slice(i, readString(i));
      const after = i + raw.length;
      let j = after;
      while (j < text.length && /\s/.test(text[j])) j++;

      if (text[j] === ':') {
        // this string is a KEY; the value comes next
        try { pendingKey = JSON.parse(raw); } catch { pendingKey = null; }
        i = j + 1;
        continue;
      }
      // this string is a value (or an array element)
      if (pendingKey === 'id' && stack.length) {
        try { if (JSON.parse(raw) === id) hits.push(stack[stack.length - 1].start); } catch { /* not an id */ }
      }
      pendingKey = null;
      i = after;
      continue;
    }

    if (c === '{' || c === '[') {
      stack.push({ start: i, end: -1 });
      pendingKey = null;
      i++;
      continue;
    }

    if (c === '}' || c === ']') {
      const top = stack.pop();
      if (top && top.end < 0) { top.end = i + 1; spans.set(top.start, top); }
      pendingKey = null;
      i++;
      continue;
    }

    i++;
  }
  for (const s of stack) if (s.end < 0) { s.end = text.length; spans.set(s.start, s); }

  const slices = [];
  const seen = new Set();
  for (const objStart of hits) {
    const s = spans.get(objStart);
    if (!s || seen.has(s.start)) continue;
    seen.add(s.start);
    slices.push({ start: s.start, end: s.end, text: text.slice(s.start, s.end) });
  }
  return slices;
}

const slices = findNodeSlices(raw, nodeId);
if (slices.length === 0) {
  console.error(`patch: node "${nodeId}" not found in ${file} — nothing written`);
  process.exit(1);
}
if (slices.length > 1) {
  console.error(`patch: node "${nodeId}" appears ${slices.length} times (duplicate ids?) — nothing written`);
  process.exit(1);
}

const slice = slices[0];

/* --- locate a key at DEPTH 1 of this node ---------------------------------
 * A node's text includes its whole subtree, so a plain /"note":/ matches the
 * FIRST child's note, not the node's own -- which for `patch <file> chem set
 * note ...` silently rewrote a descendant. One agent lost 53 edits to this.
 * Keys are therefore found by walking the text with string and brace tracking
 * and keeping only the ones at this object's own depth. */
function skipStr(text, i) {
  i++;
  while (i < text.length) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '"') return i;
    i++;
  }
  return i;
}
function findKey(text, k) {
  let i = 0, depth = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      const s = i, e = skipStr(text, i);
      if (depth === 1) {
        let j = e + 1;
        while (j < text.length && /\s/.test(text[j])) j++;
        if (text[j] === ':' && JSON.parse(text.slice(s, e + 1)) === k) {
          let v = j + 1;
          while (v < text.length && /\s/.test(text[v])) v++;
          if (text[v] === '"') return { start: v, end: skipStr(text, v) + 1 };
          if (text[v] === '[' || text[v] === '{') {
            let d = 0, q = v;
            for (; q < text.length; q++) {
              if (text[q] === '"') { q = skipStr(text, q); continue; }
              if (text[q] === '[' || text[q] === '{') d++;
              else if (text[q] === ']' || text[q] === '}') { d--; if (d === 0) { q++; break; } }
            }
            return { start: v, end: q };
          }
          let q = v;
          while (q < text.length && !/[,\n}]/.test(text[q])) q++;
          return { start: v, end: q };
        }
      }
      i = e + 1;
      continue;
    }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    i++;
  }
  return null;
}

/* --- read mode ----------------------------------------------------------- */
function readField(sliceText, k) {
  const at = findKey(sliceText, k);
  if (!at) return undefined;
  const raw2 = sliceText.slice(at.start, at.end);
  return raw2.startsWith('"') ? JSON.parse(raw2) : raw2;
}

if (mode === 'get') {
  console.log(JSON.stringify(readField(slice.text, key) ?? null));
  process.exit(0);
}
if (mode !== 'set') {
  console.error(`patch: unknown mode "${mode}"\n${usage}`);
  process.exit(2);
}

/* --- write mode ---------------------------------------------------------- */
const value = rest.join(' ');
if (value === undefined) {
  console.error('patch: no value given — nothing written');
  process.exit(2);
}
const encoded = JSON.stringify(value);

/* If the key is present but its value is not a plain string, replacing it with
   one is a type change, not an edit. Appending a second `"key":` line instead
   would leave the file parsing (JSON takes the last one) while the original
   survives in the source — so refuse instead and let a human decide. */
const at = findKey(slice.text, key);
if (at && !slice.text.slice(at.start, at.end).startsWith('"')) {
  console.error(`patch: ${nodeId}.${key} exists but is not a string — refusing to add a second "${key}" key. Nothing written.`);
  process.exit(1);
}

let newSlice;
if (at) {
  // replace the value in place, at its own depth-1 position
  newSlice = `${slice.text.slice(0, at.start)}${encoded}${slice.text.slice(at.end)}`;
} else {
  // insert before the closing brace, matching the indentation of its siblings
  const closeAt = slice.text.lastIndexOf('}');
  const head = slice.text.slice(0, closeAt);
  const lastComma = head.trimEnd().endsWith(',') ? '' : ',';
  const indentMatch = head.match(/\n(\s*)"[^"]+"\s*:\s*$/);
  const indent = indentMatch ? indentMatch[1] : '      ';
  newSlice = `${head.trimEnd()}${lastComma}\n${indent}"${key}": ${encoded}\n${indent.slice(0, -2)}}`;
}

const out = raw.slice(0, slice.start) + newSlice + raw.slice(slice.end);
JSON.parse(out); // refuse to write invalid JSON
writeFileSync(file, out);
console.log(`patched ${file}: ${nodeId}.${key} (${slice.text.length} -> ${newSlice.length} bytes in that node)`);
