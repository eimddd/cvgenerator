// Lists digit runs and Latin words left in the fixed text of generated templates,
// to catch personal data (ID numbers, dates, plates) that should have become fields.
import fs from 'node:fs';
const dir = 'src/templates/generated';
const only = process.argv.slice(2);
const walk = (blocks, out) => { for (const b of blocks) { if (b.type === 'p') out.push(b.runs.map((r) => r.t ?? '¤').join('')); else if (b.type === 'box') walk(b.blocks, out); else if (b.type === 'table') b.rows.forEach((r) => r.forEach((c) => walk(c.blocks, out))); } return out; };
for (const f of fs.readdirSync(dir).filter((f) => /^c\d+\w*\.json$/.test(f))) {
  const id = f.replace('.json', '');
  if (only.length && !only.includes(id)) continue;
  const t = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
  const hits = new Set();
  for (const line of walk(t.blocks, [])) for (const m of line.match(/[0-9][0-9.,/\-]{2,}|[A-Z]{1,3} ?[0-9]+|\b[A-Z][A-Za-z]{2,}\b/g) || []) hits.add(m);
  if (hits.size) console.log(id, [...hits].join(' | '));
}

// dotted blanks that did not become fields
for (const f of fs.readdirSync(dir).filter((f) => /^c\d+\w*\.json$/.test(f))) {
  const t = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
  const left = walk(t.blocks, []).filter((l) => /(?:\.\.|…)/.test(l));
  if (left.length) console.log('DOTS', f, left.map((l) => l.trim().slice(0, 80)).join(' ¦ '));
}
