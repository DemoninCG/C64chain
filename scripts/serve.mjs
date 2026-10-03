#!/usr/bin/env node
/** Minimal zero-dep static server for public/.
 *  Usage: node scripts/serve.mjs [port]
 *  Port precedence: CLI arg > PORT env > 5173.
 *
 *  If the preferred port is busy it walks upward rather than dying with a raw
 *  EADDRINUSE stack trace — a leftover server from an earlier session used to
 *  make `npm start` look broken. The URL it actually bound is always printed.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const argv = process.argv.slice(2).find((a) => /^\d+$/.test(a));
const PREFERRED = Number(argv ?? process.env.PORT ?? 5173);
const MAX_TRIES = 20;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
  '.mmd': 'text/plain; charset=utf-8',
  '.dot': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = path.join(PUBLIC, path.normalize(rel).replace(/^([/\\])+/, ''));
    if (!file.startsWith(PUBLIC)) { res.writeHead(403).end('nope'); return; }
    const s = await stat(file);
    if (!s.isFile()) throw new Error('not a file');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
      'content-length': body.length,
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('404');
  }
});

// Exactly one error listener for the whole process. Registering a fresh one per
// retry makes them stack up, so a second port failure re-enters the handler and
// spawns more binds until Node throws ERR_SERVER_ALREADY_LISTEN.
let attempts = 0;
const nextPort = () => PREFERRED + attempts;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && attempts < MAX_TRIES) {
    attempts++;
    console.log(`  port ${nextPort() - 1} is busy, trying ${nextPort()}...`);
    server.listen(nextPort());
    return;
  }
  console.error(`\n  Could not bind a port (tried ${attempts + 1}, all busy).`);
  console.error(`  Another copy of the server may already be running — try the URL it printed earlier.`);
  console.error(`  Or pass an explicit one:  node scripts/serve.mjs 8080\n`);
  process.exit(1);
});

// No per-listen callback on purpose: `listen(port, cb)` registers cb as a
// 'listening' listener, and after an EADDRINUSE the callback from the failed
// attempt is still attached -- so it fires on the *next* successful bind and
// reports the wrong port. Reading server.address() is always truthful.
server.on('listening', () => {
  const { port } = server.address();
  if (port !== PREFERRED) console.log(`  (port ${PREFERRED} was unavailable)`);
  console.log(`\n  tech tree  ->  http://localhost:${port}\n  serving    ${PUBLIC}\n  Ctrl-C to stop\n`);
});

server.listen(PREFERRED);