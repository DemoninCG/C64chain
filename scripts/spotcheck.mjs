#!/usr/bin/env node
/** spotcheck.mjs — verify specific ingredient links resolve to the RIGHT node. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { nodes: N } = JSON.parse(await readFile(path.join(ROOT, 'public/tree.json'), 'utf8'));

const CASES = [
  { node: /porcelain/, input: 'quartz', want: /silica-sand|quartzite|quartz/ },
  { node: /funnel-glass|crt\.panel/, input: 'quartz sand', want: /silica-sand|quartzite/ },
  { node: /cleanroom\.prefilter/, input: 'silica', want: /silica-sand/ },
  { node: /harmful|hazardous-waste\.trichloroethene/, input: 'chlorine', want: /chlorine/ },
  { node: /lime|limestone/, input: 'limestone', want: /limestone/ },
];

console.log('\n=== ingredient link spot-check ===');
for (const c of CASES) {
  const host = Object.entries(N).find(([id, n]) =>
    c.node.test(id) && (n.inputs ?? []).some((s) => s.toLowerCase() === c.input));
  if (!host) { console.log(`  ?  no node matching ${c.node} with input "${c.input}"`); continue; }
  const [id, n] = host;
  const targets = (n.from ?? []).map((f) => N[f] ? `${N[f].name} [${f}]` : f);
  const hit = (n.from ?? []).some((f) => c.want.test(f) || c.want.test(N[f]?.name ?? ''));
  console.log(`  ${hit ? 'OK ' : '?? '} ${c.input.padEnd(14)} ${id.slice(0, 46).padEnd(46)} -> ${targets.join(' | ') || '(nothing)'}`);
}

// did any si.* node capture a generic ingredient name?
const si = Object.keys(N).filter((id) => id.startsWith('si.'));
const hijack = [];
for (const n of Object.values(N)) {
  for (const f of n.from ?? []) if (si.includes(f)) hijack.push(`${n.id} -> ${f}`);
}
console.log(`\n  links landing on si.* nodes from elsewhere: ${hijack.length}`);
for (const h of hijack.slice(0, 10)) console.log(`    ${h}`);
console.log('');