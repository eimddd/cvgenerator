// Usage: node scripts/build-templates.mjs <dir with models/cNNN.json>
// Applies the specs in scripts/specs/*.mjs to the extracted Word layouts and writes
// src/templates/generated/<id>.json plus index.json. Every `find` must match.
//
// Replacement mini-language (inside the replacement string):
//   {key}            a form field (label comes from fields.js or spec.labels)
//   {p1?masc|fem}    text that follows the gender of party p1 (field p1_gender)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMON_LABELS } from '../src/templates/fields.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(process.argv[2], 'models');
const outDir = path.join(here, '..', 'src', 'templates', 'generated');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const specs = {};
for (const f of fs.readdirSync(path.join(here, 'specs')).sort().filter((f) => !f.startsWith('_'))) {
  Object.assign(specs, (await import('./specs/' + f)).default);
}
// blank models imported from molhaka.com: fields are found automatically (see autoSpec)
const importedFile = path.join(here, 'imported.json');
if (fs.existsSync(importedFile)) {
  // a hand-written spec (filled-in samples) takes precedence over automatic detection
  for (const t of JSON.parse(fs.readFileSync(importedFile, 'utf8'))) specs[t.id] ??= { title: t.title, category: t.category, auto: true };
}

const OBJ = '￼'; // stands in for a field run so finds never match across it

function paragraphs(blocks, out = []) {
  for (const b of blocks) {
    if (b.type === 'p') out.push(b);
    else if (b.type === 'box') paragraphs(b.blocks, out);
    else if (b.type === 'table') b.rows.forEach((r) => r.forEach((c) => paragraphs(c.blocks, out)));
  }
  return out;
}
const runText = (r) => (r.t !== undefined ? r.t : OBJ);
// non-breaking spaces look like spaces in the text dumps, so match them as spaces
const paraText = (p) => p.runs.map(runText).join('').replace(/ /g, ' ');

function parseReplacement(str, fmt, fields) {
  const runs = [];
  const re = /\{(\w+)(?:\?([^|}]*)\|([^}]*))?\}/g;
  let last = 0; let m;
  while ((m = re.exec(str))) {
    if (m.index > last) runs.push({ ...fmt, t: str.slice(last, m.index) });
    if (m[2] !== undefined) { runs.push({ ...fmt, g: m[1], m: m[2], f: m[3] }); fields.add(m[1] + '_gender'); }
    else { runs.push({ ...fmt, field: m[1] }); fields.add(m[1]); }
    last = re.lastIndex;
  }
  if (last < str.length) runs.push({ ...fmt, t: str.slice(last) });
  return runs;
}

// split runs so that a boundary exists at character offset `at`; returns run index starting there
function splitAt(p, at) {
  let pos = 0;
  for (let i = 0; i < p.runs.length; i++) {
    const r = p.runs[i]; const len = runText(r).length;
    if (at === pos) return i;
    if (at < pos + len) {
      if (r.t === undefined) throw new Error('cannot split a field run');
      p.runs.splice(i, 1, { ...r, t: r.t.slice(0, at - pos) }, { ...r, t: r.t.slice(at - pos) });
      return i + 1;
    }
    pos += len;
  }
  return p.runs.length;
}

function formatOf(r) {
  const { t, field, g, m, f, ...fmt } = r; return fmt;
}

// "تبتدىء من......" must become "تبتدىء من {date}", but "ب......" stays "ب{city}"
function needsSpaceBefore(before) {
  const prev = before.slice(-1);
  if (prev === ')') return true;
  if (!/\p{L}/u.test(prev)) return false;
  const word = before.match(/[\p{L}ـ]+$/u)[0];
  return !['ب', 'بـ', 'ل', 'لل', 'بال', 'و', 'ال'].includes(word) && !word.endsWith('ـ');
}

function applySub(paras, find, repl, fields, id) {
  for (const p of paras) {
    const text = paraText(p);
    let s = -1; let len = 0;
    if (find instanceof RegExp) { const m = text.match(find); if (m) { s = m.index; len = m[0].length; } }
    else { s = text.indexOf(find); len = find.length; }
    if (s < 0) continue;
    // a field dropped where a blank touched the next word must not glue onto it
    const next = text[s + len];
    if (repl.endsWith('}') && next && next !== OBJ && /[\p{L}\p{N}]/u.test(next)) repl += ' ';
    if (repl.startsWith('{') && needsSpaceBefore(text.slice(0, s))) repl = ' ' + repl;
    const i = splitAt(p, s); const j = splitAt(p, s + len);
    const fmt = formatOf(p.runs[i] || p.runs[i - 1] || {});
    const runs = parseReplacement(repl, fmt, fields);
    // a dotted blank keeps its original dots, printed when the field is left empty
    const matched = text.slice(s, s + len);
    if (/^[.… ]+$/.test(matched)) for (const r of runs) if (r.field) r.blank = matched;
    p.runs.splice(i, j - i, ...runs);
    p.runs = p.runs.filter((r) => r.t === undefined || r.t !== '');
    return;
  }
  // say how far the text did match, to make typos in specs easy to spot
  let best = 0; let where = '';
  if (typeof find === 'string') {
    for (const p of paras) {
      const t = paraText(p);
      for (let k = find.length; k > best; k--) if (t.includes(find.slice(0, k))) { best = k; where = t.slice(t.indexOf(find.slice(0, k)) + k, t.indexOf(find.slice(0, k)) + k + 30); break; }
    }
  }
  if (typeof find !== 'string') throw new Error(`${id}: no blank left for ${repl} (pattern ${find})`);
  throw new Error(`${id}: not found: ${find}\n  matched up to: …${find.slice(Math.max(0, best - 20), best)}⟦ spec has: ${JSON.stringify(find.slice(best, best + 30))} | doc has: ${JSON.stringify(where)}`);
}

const isEmpty = (b) => b.type === 'p' && !paraText(b).trim();

// Blank models (imported from molhaka.com): every dotted blank or "(...)" becomes a
// field labelled with the words just before it (or after it, at a line start).
// a date written "…/…/…" is one blank, not three
const BLANK = /(?:[.…]+\s*\/\s*){1,2}[.…]+|(?:\.\.|…)(?:[.…]| [.…])*|\((?:\.\.\.|…)\)/g;
function autoSpec(blocks, lang) {
  const sub = []; const labels = {};
  const words = (s) => s.replace(/[.…:：/()\-–]+/g, ' ').split(/\s+/).filter(Boolean);
  const STOP = /[.،,؛;)(\n\t￼]|\s{3,}|…|\.\./;
  for (const p of paragraphs(blocks)) {
    const text = paraText(p);
    for (const m of text.matchAll(BLANK)) {
      const head = text.slice(0, m.index);
      const before = head.split(STOP).pop();
      const after = text.slice(m.index + m[0].length).split(STOP)[0];
      // one-word labels such as "و" or "في" say nothing: widen to the words before
      let label = words(before).length > 1 ? words(before).slice(-5).join(' ') : words(head).slice(-4).join(' ');
      if (!label) label = words(after).slice(0, 4).join(' ');
      if (!label) label = lang === 'ar' ? 'خانة' : 'Champ';
      // every blank is its own field: two parties' "رقم البطاقة" are different values
      const key = `f${sub.length + 1}`;
      const dupes = Object.values(labels).filter((l) => l === label || l.startsWith(label + ' (')).length;
      labels[key] = dupes ? `${label} (${dupes + 1})` : label;
      sub.push([new RegExp(BLANK.source), `{${key}}`]);
    }
  }
  // no dotted blanks: some models write the placeholder itself, e.g. "(الاسم الكامل)" or "[Nom Prénom]"
  if (!sub.length) {
    const PH = /[([]([^()[\]\d]{3,40})[)\]]/;
    for (const p of paragraphs(blocks)) {
      for (const m of paraText(p).matchAll(new RegExp(PH.source, 'g'))) {
        if (words(m[1]).length > 6) continue;
        // each placeholder is its own field: "[Nom Prénom]" can be two different people
        const label = m[1].trim();
        const key = `f${Object.keys(labels).length + 1}`;
        const same = Object.values(labels).filter((l) => l === label || l.startsWith(label + ' (')).length;
        labels[key] = same ? `${label} (${same + 1})` : label;
        sub.push([m[0], `{${key}}`]);
      }
    }
  }
  // Partly filled samples: real ID numbers, full dates and names after "السيد/السيدة"
  // become fields too, so nobody's personal data stays in the printed text.
  const DATA = [
    [/\b[A-Z]{1,2} ?\d{4,7}\b/g, lang === 'ar' ? 'رقم البطاقة الوطنية' : 'N° CIN'],
    [/\b\d{1,2}[/-]\d{1,2}[/-](?:19|20)\d\d\b|\b(?:19|20)\d\d\/\d{1,2}\/\d{1,2}\b/g, lang === 'ar' ? 'التاريخ' : 'Date'],
    [/(?<=(?:الساكن|الساكنة|والساكن|والساكنة)\s*بـ?\s*:?\s*)[^.،\n\t￼:]{4,90}?(?=\s*(?:[.،]|$))/g, lang === 'ar' ? 'العنوان' : 'Adresse'],
    [/(?<=(?:السيد|السيدة|المسمى|المسماة)\s*:?\s*)[؀-ۿ]+(?:\s+[؀-ۿ]+){1,3}(?=\s*(?:،|,|\s(?:الحامل|الحاملة|والحامل|والحاملة|المزداد|المزدادة|الساكن|الساكنة|والساكن|والساكنة|مغربي|مغربية)))/g, lang === 'ar' ? 'الاسم الكامل' : 'Nom'],
  ];
  let n = 0;
  for (const p of paragraphs(blocks)) {
    const text = paraText(p);
    for (const [re, label] of DATA) {
      for (const m of text.matchAll(re)) {
        if (/[.…]{2}/.test(m[0])) continue; // already a dotted blank
        const key = `d${++n}`;
        labels[key] = label + (Object.values(labels).includes(label) ? ` (${n})` : '');
        sub.push([m[0], `{${key}}`]);
      }
    }
  }
  return { sub, labels };
}

const index = [];
const warnings = [];
const skipped = [];
for (const [id, spec] of Object.entries(specs)) {
  const model = JSON.parse(fs.readFileSync(path.join(modelsDir, (spec.source || id) + '.json'), 'utf8'));
  let blocks = model.blocks;
  // keep only the first copy of the text (some files hold several filled-in copies)
  if (spec.cut !== undefined) {
    let n = 0; const kept = [];
    for (const b of blocks) { if (n >= spec.cut) break; kept.push(b); n += Math.max(1, paragraphs([b]).length); }
    blocks = kept;
  }
  if (spec.from !== undefined) {
    let n = 0; const kept = [];
    for (const b of blocks) { if (n >= spec.from) kept.push(b); n += Math.max(1, paragraphs([b]).length); }
    blocks = kept;
  }
  // drop page breaks that would start an empty page
  blocks = blocks.filter((b) => !(b.type === 'p' && /^[\f\s]*$/.test(paraText(b)) && paraText(b).includes('\f')));
  const fields = new Set();
  const paras = paragraphs(blocks);
  const original = paragraphs(model.blocks);
  for (const d of spec.drop || []) {
    // a number is the paragraph's line number in the text dump
    const victims = typeof d === 'number' ? [original[d]] : paras.filter((p) => (d instanceof RegExp ? d.test(paraText(p)) : paraText(p).includes(d)));
    if (!victims.length) throw new Error(`${id}: drop not found: ${d}`);
    blocks = blocks.filter((b) => !victims.includes(b));
  }
  if (spec.auto) {
    const all = paragraphs(blocks).map(paraText).join('');
    if (all.replace(/\s/g, '').length < 40) { skipped.push(`${id}: no text (scanned image)`); continue; }
    Object.assign(spec, autoSpec(blocks, /[؀-ۿ]/.test(all) ? 'ar' : 'fr'));
  }
  for (const [find, repl] of spec.sub || []) {
    // automatic finds can overlap (an address that contains a placeholder): the
    // overlapping text is already a field, so a miss there is harmless
    try { applySub(paragraphs(blocks), find, repl, fields, id); } catch (e) { if (!spec.auto) throw e; }
  }
  while (blocks.length && isEmpty(blocks[blocks.length - 1])) blocks.pop();
  while (blocks.length && isEmpty(blocks[0])) blocks.shift();

  // leftover personal data check: ID card numbers and dates still in the fixed text
  const rest = paragraphs(blocks).map(paraText).join('\n');
  for (const re of [/\b[A-Z]{1,2} ?\d{4,}\b/g, /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, /\b\d{4}\/\d{1,2}\/\d{1,2}\b/g]) {
    for (const m of rest.match(re) || []) if (!(spec.allow || []).includes(m)) warnings.push(`${id}: leftover "${m}"`);
  }

  const lang = spec.lang || (/[؀-ۿ]/.test(rest) ? 'ar' : 'fr');
  // contracts are Arabic only
  if (lang !== 'ar') { skipped.push(`${id}: not Arabic`); continue; }
  const common = (k) => COMMON_LABELS[k]?.[lang];
  const inText = new Set(paragraphs(blocks).flatMap((p) => p.runs.flatMap((r) => (r.field ? [r.field] : r.g ? [r.g + '_gender'] : []))));
  const fieldList = [...fields].filter((key) => inText.has(key)).map((key) => {
    const party = key.match(/^(p\d)_(.+)$/);
    const label = spec.labels?.[key] || common(key) || (party && (spec.labels?.['p_' + party[2]] || common('p_' + party[2])));
    if (!label) throw new Error(`${id}: no label for field ${key}`);
    return { key, label, ...(party ? { party: party[1] } : {}), ...(key.endsWith('_gender') ? { type: 'gender' } : {}), ...(spec.multiline?.includes(key) ? { type: 'textarea' } : {}), ...(spec.optional?.includes(key) ? { optional: true } : {}) };
  });
  const tpl = { id, title: spec.title, category: spec.category, lang, page: model.page, parties: spec.parties || {}, fields: fieldList, blocks };
  fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify(tpl));
  index.push({ id, title: spec.title, category: spec.category, lang, fieldCount: fieldList.length });
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 1));
console.log(`built ${index.length} templates`);
if (warnings.length) console.log('WARNINGS\n' + warnings.join('\n'));
if (skipped.length) console.log('SKIPPED\n' + skipped.join('\n'));
