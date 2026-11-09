// Reads a .docx and returns a layout model: page setup + blocks of paragraphs/tables
// with runs carrying the exact text and formatting Word uses.
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: false,
  parseTagValue: false,
});

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

// --- preserveOrder helpers ---------------------------------------------------
const tagOf = (node) => (node ? Object.keys(node).find((k) => k !== ':@') : undefined);
const kids = (node) => (node && node[tagOf(node)]) || [];
const attrs = (node) => (node && node[':@']) || {};
const find = (list, tag) => (list || []).find((n) => tagOf(n) === tag);
const findAll = (list, tag) => (list || []).filter((n) => tagOf(n) === tag);
const val = (list, tag) => { const n = find(list, tag); return n ? attrs(n)['w:val'] : undefined; };
const onOff = (list, tag) => {
  const n = find(list, tag);
  if (!n) return undefined;
  const v = attrs(n)['w:val'];
  return !(v === '0' || v === 'false' || v === 'none');
};

// --- run / paragraph property readers --------------------------------------
function readRPr(rPr, theme) {
  if (!rPr) return {};
  const p = {};
  const f = find(rPr, 'w:rFonts');
  if (f) {
    const a = attrs(f);
    const latin = a['w:ascii'] || a['w:hAnsi'] || (a['w:asciiTheme'] && theme[a['w:asciiTheme']]);
    const cs = a['w:cs'] || (a['w:cstheme'] && theme[a['w:cstheme']]);
    if (latin) p.font = latin;
    if (cs) p.fontCs = cs;
  }
  const sz = val(rPr, 'w:sz'); if (sz) p.size = +sz / 2;
  const szCs = val(rPr, 'w:szCs'); if (szCs) p.sizeCs = +szCs / 2;
  for (const [tag, key] of [['w:b', 'b'], ['w:bCs', 'bCs'], ['w:i', 'i'], ['w:iCs', 'iCs'], ['w:rtl', 'rtl'], ['w:caps', 'caps']]) {
    const v = onOff(rPr, tag); if (v !== undefined) p[key] = v;
  }
  const u = val(rPr, 'w:u'); if (u) p.u = u !== 'none';
  const color = val(rPr, 'w:color'); if (color && color !== 'auto' && color !== '000000') p.color = '#' + color;
  const hl = val(rPr, 'w:highlight'); if (hl && hl !== 'none') p.highlight = hl;
  const va = val(rPr, 'w:vertAlign'); if (va === 'superscript' || va === 'subscript') p.vertAlign = va;
  return p;
}

function readPPr(pPr) {
  if (!pPr) return {};
  const p = {};
  const jc = val(pPr, 'w:jc'); if (jc) p.jc = jc;
  const bidi = onOff(pPr, 'w:bidi'); if (bidi !== undefined) p.bidi = bidi;
  const sp = find(pPr, 'w:spacing');
  if (sp) {
    const a = attrs(sp);
    if (a['w:before'] !== undefined) p.before = +a['w:before'] / 20;
    if (a['w:after'] !== undefined) p.after = +a['w:after'] / 20;
    if (a['w:line'] !== undefined) { p.line = +a['w:line']; p.lineRule = a['w:lineRule'] || 'auto'; }
  }
  const ind = find(pPr, 'w:ind');
  if (ind) {
    const a = attrs(ind);
    const start = a['w:start'] ?? a['w:left']; const end = a['w:end'] ?? a['w:right'];
    if (start !== undefined) p.indStart = +start / 20;
    if (end !== undefined) p.indEnd = +end / 20;
    if (a['w:firstLine'] !== undefined) p.indFirst = +a['w:firstLine'] / 20;
    if (a['w:hanging'] !== undefined) p.indFirst = -(+a['w:hanging']) / 20;
  }
  const style = val(pPr, 'w:pStyle'); if (style) p.style = style;
  const ctx = onOff(pPr, 'w:contextualSpacing'); if (ctx !== undefined) p.contextual = ctx;
  const numPr = find(pPr, 'w:numPr');
  if (numPr) {
    const numId = val(kids(numPr), 'w:numId');
    if (numId && numId !== '0') p.num = { id: numId, lvl: +(val(kids(numPr), 'w:ilvl') || 0) };
  }
  const tabs = find(pPr, 'w:tabs');
  if (tabs) p.tabs = findAll(kids(tabs), 'w:tab').map((t) => ({ pos: +attrs(t)['w:pos'] / 20, val: attrs(t)['w:val'] })).filter((t) => t.val !== 'clear');
  return p;
}

// --- styles ------------------------------------------------------------------
function readStyles(stylesXml, theme) {
  const out = { defaults: { r: {}, p: {} }, para: {}, char: {} };
  if (!stylesXml) return out;
  const root = kids(find(parser.parse(stylesXml), 'w:styles'));
  const dd = find(root, 'w:docDefaults');
  if (dd) {
    const rPrD = find(kids(dd), 'w:rPrDefault'); if (rPrD) out.defaults.r = readRPr(kids(find(kids(rPrD), 'w:rPr')), theme);
    const pPrD = find(kids(dd), 'w:pPrDefault'); if (pPrD) out.defaults.p = readPPr(kids(find(kids(pPrD), 'w:pPr')));
  }
  const raw = {};
  for (const s of findAll(root, 'w:style')) {
    const a = attrs(s); const k = kids(s);
    raw[a['w:styleId']] = { type: a['w:type'], def: a['w:default'] === '1', basedOn: val(k, 'w:basedOn'), r: readRPr(kids(find(k, 'w:rPr')), theme), p: readPPr(kids(find(k, 'w:pPr'))) };
  }
  const resolve = (id, seen = new Set()) => {
    const s = raw[id]; if (!s || seen.has(id)) return { r: {}, p: {} };
    seen.add(id);
    const base = s.basedOn ? resolve(s.basedOn, seen) : { r: {}, p: {} };
    return { r: { ...base.r, ...s.r }, p: { ...base.p, ...s.p } };
  };
  for (const id of Object.keys(raw)) {
    const target = raw[id].type === 'character' ? out.char : out.para;
    target[id] = resolve(id);
    if (raw[id].type === 'paragraph' && raw[id].def) out.defaultPara = id;
  }
  return out;
}

function readTheme(themeXml) {
  const t = {};
  if (!themeXml) return t;
  const latin = (tag) => { const m = themeXml.match(new RegExp(`<a:${tag}>[\\s\\S]*?<a:latin typeface="([^"]*)"`)); return m && m[1]; };
  const cs = (tag) => { const m = themeXml.match(new RegExp(`<a:${tag}>[\\s\\S]*?<a:cs typeface="([^"]*)"`)); return m && m[1]; };
  t.minorHAnsi = latin('minorFont'); t.majorHAnsi = latin('majorFont');
  t.minorBidi = cs('minorFont') || 'Arial'; t.majorBidi = cs('majorFont') || 'Arial';
  return t;
}

// --- numbering (bullets and numbered lists) ---------------------------------
// Symbol/Wingdings bullets live in the private-use area; show them as plain glyphs.
const BULLETS = { '': '•', '': '▪', '': '➢', '': '✓', '': '❖', '': '□', '': '➢', o: 'o' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const ABJAD = 'أبجدهوزحطيكلمنسعفصقرشتثخذضظغ';
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

function readNumbering(numXml, theme) {
  const none = { levels: () => null, marker: () => null };
  if (!numXml) return none;
  const root = kids(find(parser.parse(numXml), 'w:numbering'));
  const abstract = {};
  for (const a of findAll(root, 'w:abstractNum')) {
    abstract[attrs(a)['w:abstractNumId']] = Object.fromEntries(findAll(kids(a), 'w:lvl').map((l) => {
      const k = kids(l); const pp = readPPr(kids(find(k, 'w:pPr')));
      return [+attrs(l)['w:ilvl'], {
        fmt: val(k, 'w:numFmt') || 'decimal', text: val(k, 'w:lvlText') ?? '', start: +(val(k, 'w:start') || 1),
        ind: { indStart: pp.indStart, indEnd: pp.indEnd, indFirst: pp.indFirst }, rPr: readRPr(kids(find(k, 'w:rPr')), theme),
      }];
    }));
  }
  const nums = {};
  for (const n of findAll(root, 'w:num')) nums[attrs(n)['w:numId']] = abstract[val(kids(n), 'w:abstractNumId')];
  const counters = {};
  return {
    levels: (id, lvl) => nums[id]?.[lvl],
    marker(id, lvl, def) {
      if (def.fmt === 'none') return null;
      if (def.fmt === 'bullet') return BULLETS[def.text] || def.text || '•';
      const c = (counters[id] ||= {});
      c[lvl] = (c[lvl] ?? nums[id][lvl].start - 1) + 1;
      for (const k of Object.keys(c)) if (+k > lvl) delete c[k];
      return def.text.replace(/%(\d)/g, (_, d) => {
        const L = +d - 1; const v = c[L] ?? nums[id][L]?.start ?? 1; const f = nums[id][L]?.fmt;
        if (f === 'upperRoman') return ROMAN[v] || v; if (f === 'lowerRoman') return (ROMAN[v] || String(v)).toLowerCase();
        if (f === 'upperLetter') return ALPHA[v - 1]?.toUpperCase() || v; if (f === 'lowerLetter') return ALPHA[v - 1] || v;
        if (f === 'arabicAbjad' || f === 'arabicAlpha') return ABJAD[v - 1] || v;
        return v;
      });
    },
  };
}

// --- body --------------------------------------------------------------------
function textOfRun(rKids) {
  let s = '';
  for (const n of rKids) {
    const tag = tagOf(n);
    if (tag === 'w:t') s += kids(n).map((x) => x['#text'] ?? '').join('');
    else if (tag === 'w:tab' || tag === 'w:ptab') s += '\t';
    else if (tag === 'w:br' || tag === 'w:cr') s += attrs(n)['w:type'] === 'page' ? '\f' : '\n';
    else if (tag === 'w:noBreakHyphen') s += '‑';
    else if (tag === 'w:sym') s += String.fromCharCode(parseInt(attrs(n)['w:char'], 16) & 0xfff ? parseInt(attrs(n)['w:char'], 16) : 32);
  }
  return s;
}

function collectRuns(list, ctx, base, out, extra) {
  for (const n of list) {
    const tag = tagOf(n);
    if (tag === 'w:r') {
      const k = kids(n);
      const rPr = kids(find(k, 'w:rPr'));
      const charStyle = val(rPr, 'w:rStyle');
      const props = { ...base, ...(charStyle ? ctx.styles.char[charStyle]?.r : {}), ...readRPr(rPr, ctx.theme) };
      const t = textOfRun(k);
      if (t) out.push({ t, ...props });
      // text boxes anchored in this run
      for (const tb of findTextBoxes(k)) extra.push(tb);
    } else if (['w:hyperlink', 'w:smartTag', 'w:ins', 'w:fldSimple', 'w:sdt', 'w:sdtContent', 'w:customXml'].includes(tag)) {
      collectRuns(kids(n), ctx, base, out, extra);
    }
  }
}

function findTextBoxes(list) {
  const found = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      const tag = tagOf(n);
      if (tag === 'mc:Fallback') continue; // the Choice branch has the same content
      if (tag === 'w:txbxContent') { found.push(kids(n)); continue; }
      if (Array.isArray(n[tag])) walk(n[tag]);
    }
  };
  walk(list);
  return found.map((body) => ({ body }));
}

function mergeRuns(runs) {
  const out = [];
  for (const r of runs) {
    const prev = out[out.length - 1];
    if (prev) {
      const { t: _a, ...pa } = prev; const { t: _b, ...pb } = r;
      if (JSON.stringify(pa) === JSON.stringify(pb)) { prev.t += r.t; continue; }
    }
    out.push({ ...r });
  }
  return out;
}

function readParagraph(pNode, ctx) {
  const k = kids(pNode);
  const own = readPPr(kids(find(k, 'w:pPr')));
  const styleId = own.style || ctx.styles.defaultPara;
  const st = ctx.styles.para[styleId] || { r: {}, p: {} };
  const p = { ...ctx.styles.defaults.p, ...st.p, ...own };
  const baseR = { ...ctx.styles.defaults.r, ...st.r };
  const runs = []; const extra = [];
  collectRuns(k, ctx, baseR, runs, extra);
  const block = { type: 'p', ...p, runs: mergeRuns(runs) };
  // the style only matters for contextual spacing (no gap between same-style paragraphs)
  if (p.contextual) block.style = styleId; else delete block.style;
  delete block.num;
  if (p.num) {
    const lvl = ctx.numbering.levels(p.num.id, p.num.lvl);
    if (lvl) {
      // list levels carry their own indent unless the paragraph overrides it
      for (const k of ['indStart', 'indEnd', 'indFirst']) if (own[k] === undefined && lvl.ind[k] !== undefined) block[k] = lvl.ind[k];
      const marker = ctx.numbering.marker(p.num.id, p.num.lvl, lvl);
      if (marker) block.marker = { t: marker, ...baseR, ...lvl.rPr };
    }
  }
  // paragraph mark formatting decides the height of empty lines
  const markR = { ...baseR, ...readRPr(kids(find(kids(find(k, 'w:pPr')), 'w:rPr')), ctx.theme) };
  block.mark = { size: markR.size, sizeCs: markR.sizeCs, font: markR.font, fontCs: markR.fontCs };
  const blocks = [block];
  for (const tb of extra) blocks.push({ type: 'box', blocks: readBody(tb.body, ctx) });
  return blocks;
}

function readTable(tNode, ctx) {
  const k = kids(tNode);
  const tblPr = kids(find(k, 'w:tblPr'));
  const bidi = onOff(tblPr, 'w:bidiVisual');
  const borders = find(tblPr, 'w:tblBorders');
  const hasBorders = !!borders && kids(borders).some((b) => attrs(b)['w:val'] && attrs(b)['w:val'] !== 'none' && attrs(b)['w:val'] !== 'nil');
  const grid = findAll(kids(find(k, 'w:tblGrid')), 'w:gridCol').map((g) => +attrs(g)['w:w'] / 20);
  const rows = findAll(k, 'w:tr').map((tr) => findAll(kids(tr), 'w:tc').map((tc) => {
    const tcPr = kids(find(kids(tc), 'w:tcPr'));
    const span = +(val(tcPr, 'w:gridSpan') || 1);
    const vMerge = find(tcPr, 'w:vMerge');
    const cb = find(tcPr, 'w:tcBorders');
    const cellBorders = cb ? kids(cb).some((b) => attrs(b)['w:val'] && !['none', 'nil'].includes(attrs(b)['w:val'])) : undefined;
    const w = find(tcPr, 'w:tcW');
    return {
      span,
      vMerge: vMerge ? (attrs(vMerge)['w:val'] === 'restart' ? 'restart' : 'continue') : undefined,
      borders: cellBorders,
      width: w && attrs(w)['w:type'] === 'dxa' ? +attrs(w)['w:w'] / 20 : undefined,
      blocks: readBody(kids(tc), ctx),
    };
  }));
  return { type: 'table', bidi, borders: hasBorders, grid, rows };
}

function readBody(list, ctx) {
  const blocks = [];
  for (const n of list) {
    const tag = tagOf(n);
    if (tag === 'w:p') blocks.push(...readParagraph(n, ctx));
    else if (tag === 'w:tbl') blocks.push(readTable(n, ctx));
    else if (tag === 'w:sdt') blocks.push(...readBody(kids(find(kids(n), 'w:sdtContent')), ctx));
  }
  return blocks;
}

export async function readDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const xml = (p) => zip.file(p)?.async('string');
  const theme = readTheme(await xml('word/theme/theme1.xml'));
  const styles = readStyles(await xml('word/styles.xml'), theme);
  const doc = parser.parse(await xml('word/document.xml'));
  const body = kids(find(kids(find(doc, 'w:document')), 'w:body'));
  const ctx = { theme, styles, numbering: readNumbering(await xml('word/numbering.xml'), theme) };
  const blocks = readBody(body, ctx);

  const sect = find(body, 'w:sectPr');
  const page = { width: 595.3, height: 841.9, margins: { top: 72, right: 72, bottom: 72, left: 72 } };
  if (sect) {
    const sk = kids(sect);
    const pgSz = find(sk, 'w:pgSz'); if (pgSz) { page.width = +attrs(pgSz)['w:w'] / 20; page.height = +attrs(pgSz)['w:h'] / 20; }
    const pgMar = find(sk, 'w:pgMar');
    if (pgMar) { const a = attrs(pgMar); page.margins = { top: +a['w:top'] / 20, right: +a['w:right'] / 20, bottom: +a['w:bottom'] / 20, left: +a['w:left'] / 20 }; }
    if (onOff(sk, 'w:bidi')) page.bidi = true;
  }
  const media = Object.keys(zip.files).filter((f) => f.startsWith('word/media/'));
  return { page, blocks, mediaCount: media.length };
}

export const isArabic = (s) => ARABIC.test(s);
