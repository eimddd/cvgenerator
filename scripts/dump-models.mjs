// Usage: node scripts/dump-models.mjs <dir with cNNN.docx + map.json>
// Writes models/cNNN.json and text/cNNN.txt next to the inputs, prints a summary.
import fs from 'node:fs';
import path from 'node:path';
import { readDocx } from './docx-model.mjs';

const dir = process.argv[2];
const map = JSON.parse(fs.readFileSync(path.join(dir, 'map.json'), 'utf8').replace(/^﻿/, ''));
fs.mkdirSync(path.join(dir, 'models'), { recursive: true });
fs.mkdirSync(path.join(dir, 'text'), { recursive: true });

const fonts = {};
const flat = (blocks, out = []) => {
  for (const b of blocks) {
    if (b.type === 'p') out.push(b);
    else if (b.type === 'box') flat(b.blocks, out);
    else if (b.type === 'table') b.rows.forEach((r) => r.forEach((c) => flat(c.blocks, out)));
  }
  return out;
};

for (const { id, rel: relRaw, pages } of map) {
  const rel = relRaw?.value ?? relRaw;
  const model = await readDocx(fs.readFileSync(path.join(dir, 'docx', id + '.docx')));
  fs.writeFileSync(path.join(dir, 'models', id + '.json'), JSON.stringify(model));
  const paras = flat(model.blocks);
  const lines = paras.map((p, i) => `${String(i).padStart(3)}| ${p.runs.map((r) => r.t).join('').replace(/\t/g, '→').replace(/\n/g, '↵')}`);
  fs.writeFileSync(path.join(dir, 'text', id + '.txt'), `# ${rel}\n` + lines.join('\n'));
  for (const p of paras) for (const r of p.runs) { const f = /[؀-ۿ]/.test(r.t) ? r.fontCs : r.font; if (f && r.t.trim()) fonts[f] = (fonts[f] || 0) + r.t.length; }
  const tables = model.blocks.filter((b) => b.type === 'table').length;
  const boxes = model.blocks.filter((b) => b.type === 'box').length;
  const chars = paras.reduce((n, p) => n + p.runs.reduce((m, r) => m + r.t.length, 0), 0);
  console.log([id, pages + 'p', chars + 'ch', tables ? 'T' + tables : '', boxes ? 'B' + boxes : '', model.mediaCount ? 'IMG' + model.mediaCount : '', rel].filter(Boolean).join(' '));
}
console.log('\nFONTS', Object.entries(fonts).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}:${n}`).join(', '));
