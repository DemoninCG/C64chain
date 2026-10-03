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

/* --- locate the node's DEFINITION ----------------------------------------
 * Only an occurrence that is the value of an "id" key counts. Matching the bare
 * quoted id also matches a reference to it in a `children` or `inputs` array,
 * which made a perfectly ordinary node look like a duplicate-id error. */
function findNodeSlices(text, id) {
  const needle = `"${id}"`;
  const slices = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at < 0) break;
    from = at + needle.length;
    if (!/"id"\s*:\s*$/.test(text.slice(Math.max(0, at - 12), at))) continue;   // a reference, not a definition
    // walk backwards to the '{' that opens this node object
    let i = at - 1;
    let depth = 0;
    for (; i >= 0; i--) {
      const c = text[i];
      if (c === '}') depth++;
      else if (c === '{') {
        if (depth === 0) break;
        depth--;
      }
    }
    if (i < 0) continue;
    const start = i;
    // forward to the matching '}'
    let d = 0;
    let j = start;
    for (; j < text.length; j++) {
      const c = text[j];
      if (c === '{') d++;
      else if (c === '}') { d--; if (d === 0) break; }
    }
    slices.push({ start, end: j + 1, text: text.slice(start, j + 1) });
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

/* --- read mode ----------------------------------------------------------- */
function readField(sliceText, k) {
  const re = new RegExp(`"${k}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")`);
  const m = sliceText.match(re);
  return m ? JSON.parse(m[1]) : undefined;
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
const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const existing = new RegExp(`"${esc}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")`);

/* If the key is present but its value is not a plain string, replacing it with
   one is a type change, not an edit. Appending a second `"key":` line instead
   would leave the file parsing (JSON takes the last one) while the original
   survives in the source — so refuse instead and let a human decide. */
const presentButNotString = new RegExp(`"${esc}"[ \\t\\r\\n]*:[ \\t\\r\\n]*[^"\\s]`).test(slice.text);
if (presentButNotString) {
  console.error(`patch: ${nodeId}.${key} exists but is not a string — refusing to add a second "${key}" key. Nothing written.`);
  process.exit(1);
}

let newSlice;
if (existing.test(slice.text)) {
  newSlice = slice.text.replace(existing, `"${key}": ${encoded}`);
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
