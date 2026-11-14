// A4 pages like Word. The document stays one flow of blocks (paragraphs, tables, boxes); this
// decides where each page ends by measuring the blocks, then either
//  - on screen: pushes the first block of each page down onto the next sheet (sheets are drawn
//    behind the text with a gap and "Page 1 / 2" under each), or
//  - for printing: marks the same blocks "break-before: page", so the printer breaks exactly there.
// A block never splits across pages (Word's "keep lines together"); only a block taller than a whole
// page overflows. shortcut: long tables move as a whole, split them by row if a contract ever needs it.

export const PAGE_GAP = 32; // px of grey between two sheets on screen
const PX = 96 / 72; // pt → px

// A paragraph that must start a new page: a Word page break ("\f") or the editor's Page break button.
const forcedBreak = (el) => el.dataset.pb !== undefined || getComputedStyle(el).breakBefore === 'page';

// Returns the number of pages. page: { width, height, margins } in points (the template's page).
export function paginate(doc, page, onScreen) {
  if (!doc) return 1;
  const blocks = [...doc.children];
  for (const el of blocks) {
    if (el.dataset.push !== undefined) { el.style.marginTop = ''; delete el.dataset.push; }
    el.classList.remove('pg-break');
  }
  // Enter inside a "page break" paragraph copies the mark onto the new line: keep it on the first only
  blocks.forEach((el, i) => {
    if (i && el.dataset.pb !== undefined && blocks[i - 1].dataset.pb !== undefined) { delete el.dataset.pb; el.style.breakBefore = ''; }
  });

  // A preview zoomed to fit its column rounds text differently, so lines would not match the printer:
  // measure at full size (undone before the screen repaints).
  const zoomed = [];
  for (let n = doc.parentElement; n; n = n.parentElement) if (n.style?.zoom && n.style.zoom !== '1') { zoomed.push([n, n.style.zoom]); n.style.zoom = '1'; }
  const box = doc.getBoundingClientRect();
  const top0 = page.margins.top * PX;
  const sheet = page.height * PX;
  const room = (page.height - page.margins.top - page.margins.bottom) * PX - 1; // 1px spare against rounding
  // measured before anything moves, relative to the top of the writing area of page 1
  const rects = blocks.map((el) => { const r = el.getBoundingClientRect(); return { top: r.top - box.top - top0, bottom: r.bottom - box.top - top0 }; });
  zoomed.forEach(([n, z]) => { n.style.zoom = z; });

  let start = 0; // where the current page's writing area begins, in the measured flow
  let pages = 1;
  let moved = 0;
  blocks.forEach((el, i) => {
    const { top, bottom } = rects[i];
    const full = bottom - start > room && top > start + 0.5; // doesn't fit, and isn't already first on its page
    if (!(i > 0 && forcedBreak(el)) && !full) return;
    start = top; pages++;
    if (onScreen) {
      const push = (pages - 1) * (sheet + PAGE_GAP) - (top + moved);
      el.style.marginTop = `${push}px`; el.dataset.push = '';
      moved += push;
    } else el.classList.add('pg-break');
  });
  if (onScreen) doc.style.minHeight = `${pages * sheet + (pages - 1) * PAGE_GAP}px`;
  return pages;
}

// The white A4 sheets behind the text, each numbered underneath.
export function PageSheets({ page, count }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="doc-sheet" aria-hidden="true" style={{ top: `calc(${i} * (${page.height}pt + ${PAGE_GAP}px))`, height: `${page.height}pt` }}>
      <span className="doc-sheet-num">Page {i + 1} / {count}</span>
    </div>
  ));
}
