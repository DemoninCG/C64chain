#!/usr/bin/env node
/**
 * standalone.mjs — assemble a self-contained copy of the C64 text-mode
 * viewer for static hosting (e.g. drop the output folder into a repo
 * served by Cloudflare Pages).
 *
 * Copies public/c64/* verbatim plus the built public/tree.json next to
 * index.html, which the viewer already tries as `./tree.json` (see
 * loadTree() in public/c64/c64.js). No other build output is needed at
 * runtime: tree.meta.json / tree.dot / tree.mmd are never fetched.
 *
 * Usage: node scripts/standalone.mjs [outdir]
 * Outdir precedence: CLI arg > STANDALONE_DIR env > c64-standalone/.
 * Run `npm run build` first — tree.json is a git-ignored build artifact.
 */

import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public', 'c64');
const TREE = path.join(ROOT, 'public', 'tree.json');
const OUT = path.resolve(process.argv[2] ?? process.env.STANDALONE_DIR ?? path.join(ROOT, 'c64-standalone'));

try {
  const s = await stat(SRC);
  if (!s.isDirectory()) throw new Error('not a directory');
} catch {
  console.error(`  source viewer not found: ${SRC}`);
  process.exit(1);
}
try {
  const t = await stat(TREE);
  if (!t.isFile()) throw new Error('not a file');
} catch {
  console.error('  public/tree.json not found — run `npm run build` first.');
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
await cp(SRC, OUT, { recursive: true });
await cp(TREE, path.join(OUT, 'tree.json'));

const files = (await readdir(OUT)).sort();
let bytes = 0;
for (const f of files) bytes += (await stat(path.join(OUT, f))).size;
console.log(`\n  standalone viewer -> ${OUT}`);
console.log(`  ${files.length} files, ${(bytes / 1e6).toFixed(2)} MB`);
console.log(`  ${files.join(', ')}`);
console.log('\n  serve over HTTP to test (ES modules block file://), e.g.:');
console.log(`  npx serve ${path.relative(ROOT, OUT) || '.'}   or   node scripts/serve.mjs\n`);
