// "Ajouter un contrat": turns a Word file, a PDF or pasted text into a template, entirely in the
// browser. Files are only read here and never uploaded; just the resulting text blocks get saved.
import { readDocx } from '../../scripts/docx-model.mjs';

const A4 = { width: 595.3, height: 841.9, margins: { top: 56, right: 56, bottom: 56, left: 56 } };
const AR = /[؀-ۿݐ-ݿ]/g;
const LATIN = /[A-Za-zÀ-ÿ0-9]/g;
const count = (s, re) => (s.match(re) || []).length;
const isRtl = (s) => count(s, AR) > 0 && count(s, AR) >= count(s, /[A-Za-zÀ-ÿ]/g);
const round = (n) => Math.round(n * 2) / 2;

function run(t, { size = 12, b = false, i = false } = {}) {
  const r = { t, size, sizeCs: size };
  if (b) Object.assign(r, { b: true, bCs: true });
  if (i) Object.assign(r, { i: true, iCs: true });
  return r;
}
function paragraph(runs, props = {}) {
  const bidi = isRtl(runs.map((r) => r.t).join(''));
  return { type: 'p', bidi, jc: 'start', runs: bidi ? runs.map((r) => ({ ...r, rtl: true })) : runs, ...props };
}

// every paragraph, including those inside tables and text boxes
const allParagraphs = (blocks) => blocks.flatMap((b) => (b.type === 'p' ? [b] : b.type === 'box' ? allParagraphs(b.blocks) : b.type === 'table' ? b.rows.flat().flatMap((c) => allParagraphs(c.blocks)) : []));

function template(blocks, page, warning) {
  const text = allParagraphs(blocks).flatMap((b) => b.runs).map((r) => r.t || '').join(' ');
  if (!text.trim()) throw new Error('No text was found in this file.');
  const first = allParagraphs(blocks).map((b) => b.runs.map((r) => r.t || '').join('').trim()).find(Boolean) || '';
  return { template: { id: 'new', title: first.length <= 60 ? first : '', category: '', lang: isRtl(text) ? 'ar' : 'fr', page, parties: {}, fields: [], blocks }, warning };
}

// ---------- pasted text ----------
export function importText(text) {
  const blocks = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).map((l) => {
    const size = isRtl(l) ? 14 : 12;
    return l ? paragraph([run(l, { size })], { line: 300 }) : { type: 'p', runs: [], line: 300 };
  });
  while (blocks.length && !blocks[blocks.length - 1].runs.length) blocks.pop();
  return template(blocks, A4);
}

// ---------- Word (.docx) ----------
export async function importDocx(buffer) {
  const { page, blocks, mediaCount } = await readDocx(buffer);
  return template(blocks, page, mediaCount ? 'This file contains pictures or logos: they were not imported.' : undefined);
}

// ---------- PDF ----------
async function openPdf(buffer) {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs.getDocument({ data: buffer }).promise;
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] || 0; };

// PDF items come in visual order: a run written the other way round (a French name in an Arabic
// line, an Arabic word in a French line) has to be flipped back to reading order.
export function readingOrder(items, rtl) {
  const strong = (it) => (count(it.str, AR) ? 'ar' : count(it.str, LATIN) ? 'lat' : null);
  const other = rtl ? 'lat' : 'ar';
  const out = [];
  for (let i = 0; i < items.length; i++) {
    if (strong(items[i]) !== other) { out.push(items[i]); continue; }
    let j = i;
    for (let k = i + 1; k < items.length; k++) {
      const s = strong(items[k]);
      if (s === other) j = k; else if (s) break;
    }
    out.push(...items.slice(i, j + 1).reverse());
    i = j;
  }
  return out;
}

function pdfLine(group) {
  const text = group.items.map((i) => i.str).join('');
  const rtl = isRtl(text);
  const sorted = readingOrder([...group.items].sort((a, b) => (rtl ? b.x - a.x : a.x - b.x)), rtl);
  const runs = [];
  let prev = null;
  for (const it of sorted) {
    // no space character in the PDF, but a visible gap between two pieces
    const gap = prev && (it.x > prev.x ? it.x - (prev.x + prev.w) : prev.x - (it.x + it.w));
    const space = prev && gap > it.size * 0.18 && !/\s$/.test(prev.str) && !/^\s/.test(it.str) ? ' ' : '';
    const last = runs[runs.length - 1];
    if (last && last.size === it.size && !!last.b === it.b && !!last.i === it.i) last.t += space + it.str;
    else runs.push(run(space + it.str, it));
    prev = it;
  }
  const zeroWidth = group.items.some((i) => i.w === 0 && count(i.str, AR));
  return { runs, text, rtl, zeroWidth, y: group.y, x0: Math.min(...group.items.map((i) => i.x)), x1: Math.max(...group.items.map((i) => i.x + i.w)), size: median(group.items.map((i) => i.size)), bold: sorted.every((i) => i.b || !i.str.trim()) };
}

async function pageLines(page) {
  await page.getOperatorList(); // loads the fonts, whose names say bold / italic
  const font = (n) => (page.commonObjs.has(n) ? page.commonObjs.get(n).name || '' : '');
  const { items } = await page.getTextContent();
  const groups = [];
  for (const it of items) {
    if (!it.str) continue;
    const size = round(Math.abs(it.transform[3]) || it.height);
    const name = font(it.fontName);
    const piece = { str: it.str, x: it.transform[4], w: it.width, y: it.transform[5], size, b: /bold|black/i.test(name), i: /italic|oblique/i.test(name) };
    const g = groups.find((l) => Math.abs(l.y - piece.y) < Math.max(2, size * 0.4));
    if (g) g.items.push(piece); else groups.push({ y: piece.y, items: [piece] });
  }
  return groups.filter((g) => g.items.some((i) => i.str.trim())).sort((a, b) => b.y - a.y).map(pdfLine);
}

const MARKER = /^\s*(?:[-•*✓❖]|\d{1,2}[.)-]|[أبجد][.)-])\s/;

export function linesToBlocks(pages) {
  const all = pages.flat();
  const left = Math.min(...all.map((l) => l.x0)), right = Math.max(...all.map((l) => l.x1));
  const gaps = pages.flatMap((p) => p.slice(1).map((l, i) => p[i].y - l.y)).filter((g) => g > 0);
  const lineGap = median(gaps) || 16;
  const bodySize = median(all.map((l) => l.size)) || 12;
  const line = Math.round(Math.min(420, Math.max(240, ((lineGap / bodySize) * 240) / 1.163)));
  const centered = (l) => Math.abs((l.x0 - left) - (right - l.x1)) < 14 && l.x0 - left > 30;
  const blocks = [];
  for (const page of pages) {
    let prev = null, cur = null;
    for (const l of page) {
      const gap = prev ? prev.y - l.y : 0;
      // the previous line stopped early even though this line's first word would have fitted on it
      const firstWord = ((l.x1 - l.x0) / Math.max(1, l.text.length)) * (l.text.trim().split(/\s/)[0].length + 1);
      const prevShort = prev && (prev.rtl ? prev.x0 - left : right - prev.x1) > firstWord + 6;
      const fresh = !cur || gap > lineGap * 1.35 || Math.abs(l.size - prev.size) > 0.5 || l.bold !== prev.bold || prevShort || centered(l) || centered(prev) || MARKER.test(l.text);
      if (fresh) {
        cur = paragraph(l.runs, { line, ...(centered(l) ? { jc: 'center' } : {}), ...(prev && gap > lineGap * 1.35 ? { before: Math.min(30, round(gap - lineGap)) } : {}) });
        blocks.push(cur);
      } else {
        cur.runs.push({ ...l.runs[0], t: ` ${l.runs[0].t}` }, ...l.runs.slice(1));
        if (cur.jc === 'start') cur.jc = 'both';
      }
      prev = l;
    }
  }
  return blocks;
}

export async function importPdf(buffer, onProgress) {
  const pdf = await openPdf(buffer);
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) pages.push(await pageLines(await pdf.getPage(n)));
  const lines = pages.flat();
  const chars = lines.reduce((sum, l) => sum + l.text.replace(/\s/g, '').length, 0);
  // Word stores some Arabic letters in display order (lam-alef reversed, final ya as a zero-width piece):
  // such a text layer has scrambled words, so read the rendered page instead
  const scrambled = lines.some((l) => l.zeroWidth || /اال|اإل|األ|اآل/.test(l.text));
  if (chars / pdf.numPages >= 25 && !scrambled) {
    const v = (await pdf.getPage(1)).getViewport({ scale: 1 });
    return template(linesToBlocks(pages), { ...A4, width: v.width, height: v.height });
  }
  return ocrPdf(pdf, onProgress, scrambled);
}

// ---------- scanned PDF: free text recognition, in the browser ----------
async function ocrPdf(pdf, onProgress, scrambled) {
  const { createWorker } = await import('tesseract.js');
  let current = 1;
  onProgress?.('Loading text recognition (first time only)…');
  const worker = await createWorker(['ara', 'fra', 'eng'], 1, {
    logger: (m) => { if (m.status === 'recognizing text') onProgress?.(`Reading text: page ${current} of ${pdf.numPages} (${Math.round(m.progress * 100)}%)`); },
  });
  const pages = [];
  try {
    for (current = 1; current <= pdf.numPages; current++) {
      const page = await pdf.getPage(current);
      const viewport = page.getViewport({ scale: 3 }); // about 216 dpi, enough for typed text
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      canvas.width = 0; // frees the page image straight away
      // same shape as a PDF text line (points, y going up), so paragraphs are rebuilt the same way
      pages.push((data.blocks || []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines)).filter((l) => l.text.trim()).map((l) => {
        const text = l.text.replace(/[‎‏]/g, '').trim();
        const rtl = isRtl(text);
        const size = rtl ? 14 : 12;
        return { runs: [run(text, { size })], text, rtl, size, bold: false, x0: l.bbox.x0 / 3, x1: l.bbox.x1 / 3, y: (viewport.height - l.bbox.y1) / 3 };
      }));
    }
  } finally {
    await worker.terminate();
  }
  return template(linesToBlocks(pages), A4, `${scrambled ? 'This PDF’s text can’t be read directly' : 'This PDF is a scanned image'}: the text was recognised automatically and may contain mistakes (bold is not kept). Check every line before saving.`);
}

// ---------- entry point for an uploaded file ----------
const MAX_MB = 25;
export async function importFile(file, onProgress) {
  if (file.size > MAX_MB * 1048576) throw new Error(`File too large (${MAX_MB} MB maximum).`);
  const name = file.name.toLowerCase();
  if (name.endsWith('.doc')) throw new Error('The old .doc format is not supported: open the file in Word, save it as .docx, then try again.');
  if (!name.endsWith('.docx') && !name.endsWith('.pdf')) throw new Error('Choose a Word (.docx) or PDF file.');
  const buffer = await file.arrayBuffer();
  return name.endsWith('.pdf') ? importPdf(buffer, onProgress) : importDocx(buffer);
}
