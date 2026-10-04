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
/* `--force` is a flag, not part of the value. It has to be taken out of `rest`
 * before the value is assembled, or `set note "x" --force` stores the literal
 * string "x --force". */
const FORCE = process.argv.includes('--force');
let value = rest.filter((a) => a !== '--force').join(' ');

/* `@path` reads the value from a file, trimmed. This exists because a shell eats
 * the double quotes inside a JSON literal: `set edges '[{"to":"x"}]'` arrives
 * with the quotes stripped, which used to be written as the string
 * `[{to:x}]`. That is a shell problem, not a patch problem, and it hits every
 * agent that tries to add a typed edge. Passing the file sidesteps the shell
 * entirely. */
if (value.startsWith('@')) {
  const p = value.slice(1);
  try {
    value = readFileSync(p, 'utf8').trim();
  } catch (e) {
    console.error(`patch: cannot read value from "${p}": ${e.message}`);
    process.exit(2);
  }
}
if (value === undefined) {
  console.error('patch: no value given — nothing written');
  process.exit(2);
}
let encoded = JSON.stringify(value);

/* A value that is valid JSON is stored AS THAT JSON, not as a string of it.
 * Fifth bug in this tool, and it matters more than the other four combined,
 * because it is what makes write-permission safe. `set edges
 * '[{"to":"x","rel":"consumes"}]'` used to write the eight-character type
 * `string` holding `[{"to":"x",...}]`. The file still parsed, patch reported
 * success, and build silently ignored the key -- so an agent could add a typed
 * edge, be told it worked, and leave no trace in public/tree.json. Silent drops
 * are the failure mode most damaging to a delegated pass, because the agent
 * cannot detect them and neither can the gate.
 *
 * Only object and array literals are unwrapped. A bare number or `true` stays a
 * string, because `set era 1982` should not become a number and `set note true`
 * should stay prose. To write those as JSON, pass them already quoted. */
const trimmed = value.trim();
if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') encoded = JSON.stringify(parsed, null, 2);
  } catch {
    console.error(`patch: value starts with "${trimmed[0]}" but is not valid JSON. Nothing written.`);
    console.error(`       If you meant the literal text, quote it: set key '"${value}"'`);
    process.exit(2);
  }
}

/* If the key is present but its value is not a plain string, replacing it with
   one is a type change, not an edit. Appending a second `"key":` line instead
   would leave the file parsing (JSON takes the last one) while the original
   survives in the source — so refuse instead and let a human decide. */
const at = findKey(slice.text, key);
if (at && !slice.text.slice(at.start, at.end).startsWith('"')) {
  console.error(`patch: ${nodeId}.${key} exists but is not a string — refusing to add a second "${key}" key. Nothing written.`);
  process.exit(1);
}

/* Third bug in this tool, and the quietest. `set note` REPLACES the existing
 * string; it does not append. An agent adding one sentence of uncertainty to a
 * note that already explained something wiped the explanation — and because the
 * call reports success and the file still parses, nothing noticed. Nine notes
 * were destroyed this way during the phase 4 pass and only a byte-count
 * comparison caught it.
 *
 * Overwriting is sometimes what you want, so it is still possible, but it now
 * has to be asked for: `... set note "..." --force`. Without the flag, a
 * non-empty existing value is refused outright. A refusal is recoverable; a
 * silent overwrite is not. */
if (at && !FORCE) {
  let current = null;
  try { current = JSON.parse(slice.text.slice(at.start, at.end)); } catch { current = null; }
  if (typeof current === 'string' && current.trim() !== '' && current !== value) {
    console.error(`patch: ${nodeId}.${key} already has ${current.length} chars — refusing to overwrite.`);
    console.error(`       existing: ${current.slice(0, 200)}`);
    console.error(`       nothing written. Append with the edit tool, or pass --force to overwrite deliberately.`);
    process.exit(1);
  }
}

let newSlice;
if (at) {
  // replace the value in place, at its own depth-1 position
  newSlice = `${slice.text.slice(0, at.start)}${encoded}${slice.text.slice(at.end)}`;
} else {
  /* Insert before the closing brace, at the indentation the node already uses.
   *
   * Fourth bug in this tool, and the quietest yet. The indent used to come from
   * `head.match(/\n(\s*)"[^"]+"\s*:\s*$/)`. That regex can never match: `head`
   * ends at the node's own closing brace, so its last non-whitespace character
   * is whatever closed the previous property - a `]`, a `}`, a digit, a quote -
   * and never the colon of a key. So the match always failed, every insert used
   * the six-space fallback, a key landed at six spaces among siblings at
   * fourteen, and `indent.slice(0, -2)` then dedented the node's closing brace
   * by two as well. The result still parsed, so nothing noticed until an agent
   * read back the file and found the braces had moved.
   *
   * Both indents are now read off lines that certainly exist: the node's own
   * `"id"` line for its keys, and the closing-brace line for the brace. */
  const closeAt = slice.text.lastIndexOf('}');
  const head = slice.text.slice(0, closeAt);
  const lastComma = head.trimEnd().endsWith(',') ? '' : ',';

  const lineStartOf = (idx) => slice.text.lastIndexOf('\n', idx - 1) + 1;
  const idAt = slice.text.indexOf(`"${nodeId}"`);
  /* Fifth bug. When the node's `{` shares a line with its `"id"` (the style
   * throughout 80-industry.json), there is no `\n` before the id *inside the
   * slice*, so lastIndexOf returned -1, keyIndent came out as "", and every
   * inserted key landed at column 0 with the closing brace dedented to match
   * (34 cosmetic sites in one pass; values correct, files parsing, audits
   * green — which is why nobody noticed). Fix: prefer the indent of the first
   * key that starts its own line inside the slice; fall back to the id line's
   * indent in the full file. */
  const ownLineKey = slice.text.match(/\n([ \t]*)"[A-Za-z0-9_-]+"\s*:/);
  let keyIndent;
  if (ownLineKey) keyIndent = ownLineKey[1];
  else {
    const fileIdAt = slice.start + Math.max(0, idAt);
    keyIndent = raw.slice(raw.lastIndexOf('\n', fileIdAt - 1) + 1).match(/^[ \t]*/)[0];
  }

  const closeLine = lineStartOf(closeAt);
  const between = slice.text.slice(closeLine, closeAt);
  const closeIndent = /^[ \t]*$/.test(between) ? between : keyIndent.slice(0, -2);

  newSlice = `${head.trimEnd()}${lastComma}\n${keyIndent}"${key}": ${encoded}\n${closeIndent}}`;
}

const out = raw.slice(0, slice.start) + newSlice + raw.slice(slice.end);
JSON.parse(out); // refuse to write invalid JSON
writeFileSync(file, out);
console.log(`patched ${file}: ${nodeId}.${key} (${slice.text.length} -> ${newSlice.length} bytes in that node)`);
