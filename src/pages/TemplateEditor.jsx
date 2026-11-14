// Word-like editor for a contract template. The page is rendered once as editable HTML
// (fields and gender words are locked chips), then read back into the template's block
// model on save, so the layout keeps every paragraph's spacing, indents and alignment.
import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import DocRenderer, { LENGTHS, LENGTH_CM, fieldLength } from '../components/DocRenderer';
import { PageSheets, paginate } from '../components/pages';
import { loadOriginal, loadTemplate, resetTemplateEdit, saveTemplateEdit, useTemplates } from '../templates';
import { Button, ErrorNote, Field, Input, Spinner } from '../components/ui';

const SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 36];
const TO_ALIGN = { start: 'start', end: 'end', center: 'center', justify: 'both' };
const ALIGN_OF = { left: 'start', start: 'start', right: 'end', end: 'end', center: 'center', both: 'justify', distribute: 'justify' };
const BLACK = /^rgba?\(0, 0, 0(, 1)?\)$/;

// ---------- DOM → template blocks ----------
function textRun(t, el, para, font) {
  const cs = getComputedStyle(el);
  const size = Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2; // px → pt, to the half point
  const b = Number(cs.fontWeight) >= 600;
  const i = cs.fontStyle === 'italic';
  let u = false, rtl = false;
  for (let n = el; n && n !== para; n = n.parentElement) {
    if (n.tagName === 'U' || getComputedStyle(n).textDecorationLine.includes('underline')) u = true;
    if (n.style.direction === 'rtl') rtl = true; // a run's own mirroring, not the paragraph's direction
  }
  const bg = el !== para && el.style.backgroundColor;
  const r = { t, size, sizeCs: size, ...font };
  if (b) Object.assign(r, { b: true, bCs: true });
  if (i) Object.assign(r, { i: true, iCs: true });
  if (u) r.u = true;
  if (rtl) r.rtl = true;
  if (!BLACK.test(cs.color)) r.color = cs.color;
  if (bg) r.highlight = bg;
  if (cs.textTransform === 'uppercase') r.caps = true;
  if (cs.verticalAlign === 'super') r.vertAlign = 'superscript';
  if (cs.verticalAlign === 'sub') r.vertAlign = 'subscript';
  return r;
}

const sameStyle = (a, b) => a.t !== undefined && b.t !== undefined && JSON.stringify({ ...a, t: 0 }) === JSON.stringify({ ...b, t: 0 });

function parseRuns(para, font) {
  const runs = [];
  const walk = (node) => {
    for (const c of node.childNodes) {
      if (c.nodeType === Node.TEXT_NODE) { if (c.nodeValue) runs.push(textRun(c.nodeValue, c.parentElement, para, font)); }
      else if (c.nodeType === Node.ELEMENT_NODE) {
        if (c.dataset.marker !== undefined) continue;
        if (c.dataset.run) { runs.push(JSON.parse(c.dataset.run)); continue; }
        if (c.tagName === 'BR') { if (c !== para.lastChild) runs.push({ t: '\n' }); continue; }
        walk(c);
      }
    }
  };
  walk(para);
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && sameStyle(last, r)) last.t += r.t; else merged.push({ ...r });
  }
  // an empty paragraph is drawn with one no-break space; don't store it as text
  const filler = para.childNodes.length === 1 && para.firstChild.nodeType === Node.TEXT_NODE && para.textContent === ' ';
  return filler ? [] : merged;
}

function parseParagraph(el, base) {
  // the Word font name only sets line spacing now (one font is drawn), so new text keeps the paragraph's
  const first = base.runs.find((r) => r.t?.trim()) || base.mark || {};
  const font = Object.fromEntries(['font', 'fontCs'].filter((k) => first[k]).map((k) => [k, first[k]]));
  const p = { ...base, type: 'p', runs: parseRuns(el, font) };
  p.bidi = el.style.direction === 'rtl';
  if (el.dataset.pb === '') p.pb = true; else delete p.pb; // "f" is a page break kept in Word's own text
  if (el.style.textAlign && el.style.textAlign !== ALIGN_OF[base.jc]) p.jc = TO_ALIGN[el.style.textAlign] || base.jc;
  if (!el.querySelector('[data-marker]')) delete p.marker; // a line split off a list item has no bullet of its own
  return p;
}

export function parseBlocks(container, orig) {
  const out = [];
  let last = orig.find((b) => b.type === 'p') || { type: 'p', runs: [] };
  for (const node of container.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue.trim()) out.push({ ...last, runs: [{ t: node.nodeValue }] });
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const o = node.dataset.b !== undefined ? orig[+node.dataset.b] : null;
    if (node.tagName === 'TABLE' && o?.type === 'table') {
      const rows = o.rows.map((row) => row.map((c) => ({ ...c, blocks: c.vMerge === 'continue' ? c.blocks : [] })));
      node.querySelectorAll(':scope > tbody > tr > td[data-cell]').forEach((td) => {
        const [i, j] = td.dataset.cell.split(',').map(Number);
        rows[i][j].blocks = parseBlocks(td, o.rows[i][j].blocks);
      });
      out.push({ ...o, rows });
    } else if (node.classList.contains('doc-box') && o?.type === 'box') {
      out.push({ ...o, blocks: parseBlocks(node, o.blocks) });
    } else {
      last = parseParagraph(node, o?.type === 'p' ? o : last);
      out.push(last);
    }
  }
  return out;
}

// fields that are still in the text (a deleted field disappears from the form too)
function keptFields(fields, blocks, lengths, kinds) {
  const used = new Set();
  const walk = (bs) => bs.forEach((b) => {
    if (b.type === 'p') b.runs.forEach((r) => { if (r.field) used.add(r.field); if (r.g) used.add(r.g + '_gender'); });
    else if (b.type === 'box') walk(b.blocks);
    else if (b.type === 'table') b.rows.forEach((row) => row.forEach((c) => walk(c.blocks)));
  });
  walk(blocks);
  return fields.filter((f) => used.has(f.key)).map((f) => ({ ...f, ...(lengths[f.key] ? { length: lengths[f.key] } : {}), ...(kinds[f.key] ? { kind: kinds[f.key], label: KINDS[kinds[f.key]] } : {}) }));
}

// ---------- turning selected text into a field ----------
const KINDS = { name: 'الاسم الكامل', date: 'التاريخ', id: 'رقم البطاقة الوطنية', address: 'العنوان', amount: 'المبلغ', free: 'نص حر' };
// a first guess from the selected words; the type can be changed in the toolbar
export function guessKind(text) {
  const s = text.trim();
  if (!/[\p{L}\d]/u.test(s)) return 'free'; // a row of dots from a blank form
  if (/^\d{1,2}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{2,4}$/.test(s) || /^\d{4}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{1,2}$/.test(s)) return 'date';
  if (/^[A-Za-z]{1,2}\s?\d{3,8}$/.test(s)) return 'id';
  if (/(درهم|دراهم|dirhams?|dhs?|mad)\s*$/i.test(s) || /^\d[\d\s.,]*$/.test(s)) return 'amount';
  if ((/\d/.test(s) && s.split(/\s+/).length > 1) || /(شارع|زنقة|حي|تجزئة|rue|avenue|hay|lotissement|quartier)/i.test(s)) return 'address';
  if (s.split(/\s+/).length <= 5) return 'name';
  return 'free';
}

// ---------- editor ----------
const paragraphsIn = (root, range) => {
  const hit = [...root.querySelectorAll('p')].filter((el) => range.intersectsNode(el));
  const node = range.startContainer;
  return hit.length ? hit : [(node.nodeType === Node.TEXT_NODE ? node.parentElement : node).closest('p')].filter(Boolean);
};

function Tool({ onClick, title, children, active, disabled }) {
  // mousedown + preventDefault keeps the text selection in the page
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={active || undefined} disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm transition disabled:opacity-40 ${active ? 'bg-brand-soft text-brand' : 'text-slate-700 hover:bg-slate-100'}`}>
      {children}
    </button>
  );
}
const Group = ({ children, label }) => <div role="group" aria-label={label} className="flex items-center gap-0.5">{children}</div>;
const Sep = () => <span className="mx-1.5 h-6 w-px bg-slate-200" aria-hidden="true" />;
const Icon = ({ d }) => <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const ICONS = {
  left: 'M3 5h14M3 9h9M3 13h14M3 17h9',
  center: 'M3 5h14M5.5 9h9M3 13h14M5.5 17h9',
  right: 'M3 5h14M8 9h9M3 13h14M8 17h9',
  justify: 'M3 5h14M3 9h14M3 13h14M3 17h14',
  rtl: 'M9 3v11M13 3v11M8 3h6M9 3a3 3 0 0 0 0 6M17 17H5m0 0 2.5-2.5M5 17l2.5 2.5',
  ltr: 'M7 3v11M11 3v11M6 3h6M7 3a3 3 0 0 0 0 6M3 17h12m0 0-2.5-2.5M15 17l-2.5 2.5',
  undo: 'M7 5 3 9l4 4M3 9h9a5 5 0 0 1 0 10h-2',
  redo: 'm13 5 4 4-4 4M17 9H8a5 5 0 0 0 0 10h2',
  field: 'M3 15h14M5 12V5h4M5 8.5h3M12 12l1.6-7 1.6 7M12.6 9.6h2',
  pageBreak: 'M5 2v5h10V2M5 18v-5h10v5M2 10h3M8 10h4M15 10h3',
};
const KIND_LABELS = { name: 'Name', date: 'Date', id: 'ID card number (CIN)', address: 'Address', amount: 'Amount', free: 'Free text' };
const LENGTH_LABELS = { short: 'Short', medium: 'Medium', long: 'Long', full: 'Full line' };

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === 'new'; // just imported, not saved yet
  const isImported = isNew || id.startsWith('u');
  const { categories } = useTemplates();
  const page = useRef(null);
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [picked, setPicked] = useState(null); // field whose line length is being set
  const [lengths, setLengths] = useState({});
  const [kinds, setKinds] = useState({});
  const [added, setAdded] = useState([]); // fields created here since the last save
  const [pickedNum, setPickedNum] = useState(null);
  const [pages, setPages] = useState(1);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (!isNew) loadTemplate(id).then(setTemplate, setError);
    else if (location.state?.template) setTemplate(location.state.template);
    else navigate('/contracts/import', { replace: true });
  }, [id, isNew, location.state, navigate]);

  // drawn once; after that the browser owns the editable DOM until save
  useEffect(() => {
    if (!template || !page.current) return;
    page.current.innerHTML = renderToStaticMarkup(<DocRenderer template={template} mode="edit" />);
    const doc = page.current.firstElementChild;
    doc.contentEditable = 'true';
    doc.spellcheck = false;
    doc.classList.add('doc-editing', 'doc-paged');
    const repaginate = () => page.current && setPages(paginate(page.current.firstElementChild, template.page, true));
    repaginate();
    document.fonts?.ready.then(repaginate);
    setDirty(false); setPicked(null); setAdded([]);
    setTitle(template.title || ''); setCategory(template.category || '');
    setLengths(Object.fromEntries(template.fields.map((f) => [f.key, fieldLength(f)])));
    setKinds(Object.fromEntries(template.fields.filter((f) => f.kind).map((f) => [f.key, f.kind])));
  }, [template]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const doc = () => page.current?.firstElementChild;
  const selection = () => {
    const sel = getSelection();
    return sel.rangeCount && doc()?.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
  };
  // numbers follow the order of the fields in the text
  function renumber() {
    const seen = new Map();
    doc()?.querySelectorAll('[data-key]').forEach((el) => {
      if (!seen.has(el.dataset.key)) seen.set(el.dataset.key, seen.size + 1);
      el.querySelector('.doc-num').textContent = seen.get(el.dataset.key);
    });
    return seen;
  }
  const changed = () => {
    setDirty(true); setNotice('');
    const n = renumber(); if (picked) setPickedNum(n.get(picked) ?? null);
    setPages(paginate(doc(), template.page, true)); // text that no longer fits moves to the next page
  };

  // Word's "Page break": what follows the cursor starts on a new page (pressed again, the break is removed)
  function pageBreak() {
    const range = selection();
    if (!range) { setNotice('Click where the new page should start first.'); return; }
    let para = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
    while (para && para.parentElement !== doc()) para = para.parentElement;
    if (!para || para.tagName !== 'P') { setNotice('A page break can’t go inside a table or box: click in a normal paragraph.'); return; }
    if (para.dataset.pb !== undefined) {
      delete para.dataset.pb; para.style.breakBefore = '';
      // Word's own break is a "\f" at the start of the text (after any list marker)
      const walk = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
      let text = walk.nextNode();
      while (text?.parentElement.closest('[data-marker]')) text = walk.nextNode();
      if (text?.nodeValue.startsWith('\f')) text.nodeValue = text.nodeValue.slice(1);
      changed(); setNotice('Page break removed.');
      return;
    }
    const before = range.cloneRange();
    before.selectNodeContents(para);
    before.setEnd(range.startContainer, range.startOffset);
    if (before.toString().trim()) {
      document.execCommand('insertParagraph'); // split at the cursor, like Word
      para = para.nextElementSibling;
      delete para.dataset.pb;
    }
    para.dataset.pb = ''; para.style.breakBefore = 'page';
    changed(); setNotice('Page break added: this paragraph now starts a new page. Press Page break again here to remove it.');
  }

  const exec = (cmd) => { if (selection()) { document.execCommand(cmd); changed(); } else setNotice('Select some text in the contract first.'); };
  function fontSize(pt) {
    if (!selection()) return;
    document.execCommand('fontSize', false, '7'); // marks the selection, then replaced by a real size
    doc().querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement('span');
      span.style.fontSize = `${pt}pt`;
      span.append(...f.childNodes);
      f.replaceWith(span);
    });
    changed();
  }
  function paragraphStyle(prop, value) {
    const range = selection();
    if (!range) { setNotice('Click in the paragraph you want to change first.'); return; }
    paragraphsIn(doc(), range).forEach((el) => { el.style[prop] = value; });
    changed();
  }
  // left/right buttons as on screen; stored as start/end, which flip with the paragraph's direction
  function align(side) {
    const range = selection();
    if (!range) { setNotice('Click in the paragraph you want to change first.'); return; }
    paragraphsIn(doc(), range).forEach((el) => {
      const rtl = getComputedStyle(el).direction === 'rtl';
      el.style.textAlign = side === 'left' ? (rtl ? 'end' : 'start') : side === 'right' ? (rtl ? 'start' : 'end') : side;
    });
    changed();
  }

  function pick(e) {
    const chip = e.target.closest('[data-key]');
    if (!chip) return;
    const key = chip.dataset.key;
    doc().querySelectorAll('[data-key]').forEach((el) => el.classList.toggle('doc-field-active', el.dataset.key === key));
    setPicked(key);
    setPickedNum(renumber().get(key));
  }

  function makeField() {
    const range = selection();
    const text = range?.toString() || '';
    if (!text.trim()) { setNotice('First select, in the contract, the text to turn into a field (for example a name or a row of dots).'); return; }
    const para = (n) => (n.nodeType === Node.TEXT_NODE ? n.parentElement : n).closest('p');
    if (para(range.startContainer) !== para(range.endContainer) || range.cloneContents().querySelector('[data-run]')) {
      setNotice('Select text inside a single paragraph, with no other field in it.');
      return;
    }
    const start = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
    const { t, ...style } = textRun('x', start, para(start), {});
    const taken = new Set([...template.fields, ...added].map((f) => f.key));
    let n = 1;
    while (taken.has(`x${n}`)) n++;
    const key = `x${n}`;
    const kind = guessKind(text);
    const length = fieldLength({ key, label: KINDS[kind] });
    // same markup as DocRenderer's edit mode, so it saves and prints like any other field
    const chip = document.createElement('span');
    chip.contentEditable = 'false'; chip.className = 'doc-blank'; chip.dataset.key = key;
    chip.dataset.run = JSON.stringify({ field: key, ...style });
    chip.style.fontSize = `${style.size}pt`;
    chip.innerHTML = `<sup class="doc-num"></sup><span class="doc-line" style="width:${LENGTH_CM[length]}">\u00a0</span>`;
    // keeps the spaces around the selection, and Ctrl+Z still works
    const before = /^\s/.test(text) ? ' ' : '', after = /\s$/.test(text) ? ' ' : '';
    document.execCommand('insertHTML', false, before + chip.outerHTML + after);
    setAdded((a) => [...a, { key, label: KINDS[kind] }]);
    setKinds((k) => ({ ...k, [key]: kind }));
    setLengths((l) => ({ ...l, [key]: length }));
    changed();
    doc().querySelectorAll('[data-key]').forEach((el) => el.classList.toggle('doc-field-active', el.dataset.key === key));
    setPicked(key); setPickedNum(renumber().get(key));
  }
  function setKind(kind) {
    if (!picked) return;
    setKinds((k) => ({ ...k, [picked]: kind }));
    setLengthOf(picked, fieldLength({ key: picked, label: KINDS[kind] }));
  }
  function setLengthOf(key, len) {
    setLengths((l) => ({ ...l, [key]: len }));
    doc().querySelectorAll(`[data-key="${key}"] .doc-line`).forEach((el) => { el.style.width = LENGTH_CM[len]; });
    changed();
  }
  const setLength = (len) => picked && setLengthOf(picked, len);

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
  }
  // paste as plain text so outside formatting can't break the layout
  function onPaste(e) {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  }

  async function save() {
    if (isImported && (!title.trim() || !category.trim())) { setError(new Error('Enter the contract’s title and category before saving.')); return; }
    setSaving(true); setError(null);
    try {
      const blocks = parseBlocks(doc(), template.blocks);
      const fields = keptFields([...template.fields, ...added], blocks, lengths, kinds);
      const next = { ...template, blocks, fields, ...(isImported ? { title: title.trim(), category: category.trim(), fieldCount: fields.length } : {}) };
      if (isNew) next.id = `u${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      await saveTemplateEdit(next);
      setDirty(false);
      if (isNew) { navigate(`/contracts/templates/${next.id}/edit`, { replace: true }); setSaving(false); return; }
      setTemplate(next); setNotice('Template saved. New contracts will use this version.');
    } catch (e) { setError(e); }
    setSaving(false);
  }

  async function removeImported() {
    if (!confirm('Delete this template permanently? Saved contracts that use it can no longer be opened.')) return;
    try { await resetTemplateEdit(id); setDirty(false); navigate('/contracts'); } catch (e) { setError(e); }
  }

  async function reset() {
    if (!confirm('Go back to the original template and erase all your changes?')) return;
    try { await resetTemplateEdit(id); setTemplate(await loadOriginal(id)); setNotice('The original template has been restored.'); } catch (e) { setError(e); }
  }

  if (!template) return <div className="px-5 py-8"><ErrorNote error={error} />{!error && <Spinner />}</div>;

  const back = isNew ? '/contracts/import' : `/contracts/new/${id}`;
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="no-print border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <Link to={back} className="text-sm text-slate-500 hover:text-brand">← {isNew ? 'Back to import' : 'Back to contract'}</Link>
            <h1 className="mt-0.5 truncate text-lg font-semibold text-ink">{isNew ? 'Review imported contract' : 'Edit template'}</h1>
          </div>
          {!isImported && <Button variant="ghost" onClick={reset}>Restore original</Button>}
          {isImported && !isNew && <Button variant="danger" onClick={removeImported}>Delete template</Button>}
          {!isNew && <Button onClick={() => navigate(`/contracts/new/${id}`)}>Write a contract</Button>}
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : dirty || isNew ? 'Save template' : 'Saved ✓'}</Button>
        </div>
        {isImported && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Contract title"><Input dir="auto" placeholder="e.g. عقد كراء محل سكني" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} /></Field>
            <Field label="Category">
              <Input dir="auto" placeholder="Choose or type a category" list="template-categories" value={category} onChange={(e) => { setCategory(e.target.value); setDirty(true); }} />
            </Field>
            <datalist id="template-categories">{categories.filter(Boolean).map((c) => <option key={c} value={c} />)}</datalist>
          </div>
        )}
        {location.state?.warning && (
          <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            <span aria-hidden="true">⚠</span><span>{location.state.warning}</span>
          </div>
        )}
      </header>

      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-y-1 px-4 py-1.5">
          <Group label="History">
            <Tool title="Undo (Ctrl+Z)" onClick={() => exec('undo')}><Icon d={ICONS.undo} /></Tool>
            <Tool title="Redo (Ctrl+Y)" onClick={() => exec('redo')}><Icon d={ICONS.redo} /></Tool>
          </Group>
          <Sep />
          <Group label="Font">
            <select aria-label="Font size" title="Font size" defaultValue="" onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => { fontSize(+e.target.value); e.target.value = ''; }}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 hover:border-slate-400">
              <option value="" disabled>Size</option>
              {SIZES.map((s) => <option key={s} value={s}>{s} pt</option>)}
            </select>
            <span className="w-1" />
            <Tool title="Bold (Ctrl+B)" onClick={() => exec('bold')}><b className="font-serif text-[15px]">B</b></Tool>
            <Tool title="Italic (Ctrl+I)" onClick={() => exec('italic')}><i className="font-serif text-[15px]">I</i></Tool>
            <Tool title="Underline (Ctrl+U)" onClick={() => exec('underline')}><u className="font-serif text-[15px]">U</u></Tool>
          </Group>
          <Sep />
          <Group label="Alignment">
            <Tool title="Align left" onClick={() => align('left')}><Icon d={ICONS.left} /></Tool>
            <Tool title="Centre" onClick={() => align('center')}><Icon d={ICONS.center} /></Tool>
            <Tool title="Align right" onClick={() => align('right')}><Icon d={ICONS.right} /></Tool>
            <Tool title="Justify" onClick={() => align('justify')}><Icon d={ICONS.justify} /></Tool>
          </Group>
          <Sep />
          <Group label="Text direction">
            <Tool title="Right to left (Arabic)" onClick={() => paragraphStyle('direction', 'rtl')}><Icon d={ICONS.rtl} /></Tool>
            <Tool title="Left to right (French, English)" onClick={() => paragraphStyle('direction', 'ltr')}><Icon d={ICONS.ltr} /></Tool>
          </Group>
          <Sep />
          <Group label="Pages">
            <Tool title="Page break: start a new page at the cursor (press again to remove it)" onClick={pageBreak}>
              <Icon d={ICONS.pageBreak} /><span className="ms-1 hidden text-xs sm:inline">Page break</span>
            </Tool>
          </Group>
          <div className="ms-auto ps-3">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); makeField(); }}
              title="Turns the selected text into a dotted line to fill in"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#162d4a]">
              <Icon d={ICONS.field} /> Make it a field
            </button>
          </div>
        </div>

        <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-2 text-sm ${picked ? 'border-brand/20 bg-brand-soft/60' : 'border-slate-100 bg-slate-50'}`}>
          {picked ? (
            <>
              <span className="font-semibold text-brand">Field {pickedNum}</span>
              <label className="flex items-center gap-2 text-slate-600">Type
                <select value={kinds[picked] || 'free'} onMouseDown={(e) => e.stopPropagation()} onChange={(e) => setKind(e.target.value)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-ink">
                  {Object.entries(KIND_LABELS).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-2 text-slate-600">Length
                <div role="group" aria-label="Line length" className="flex overflow-hidden rounded-md border border-slate-300 bg-white">
                  {Object.keys(LENGTHS).map((len) => (
                    <button key={len} type="button" aria-pressed={lengths[picked] === len} onMouseDown={(e) => { e.preventDefault(); setLength(len); }}
                      className={`h-8 border-s border-slate-200 px-3 text-sm first:border-s-0 ${lengths[picked] === len ? 'bg-brand text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
                      {LENGTH_LABELS[len]}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-xs text-slate-500">To remove the field, select it in the text and press Delete.</span>
            </>
          ) : (
            <span className="text-slate-500">
              <b className="font-medium text-slate-700">To create a field:</b> select the text to replace (a name, a date, a row of dots…), then click <b className="font-medium text-brand">Make it a field</b>. Click an existing field to change its type and length.
            </span>
          )}
        </div>
        {notice && <div className="border-t border-slate-100 bg-white px-4 py-1.5 text-sm text-slate-700" role="status">{notice}</div>}
      </div>

      {error && <div className="px-5 pt-4"><ErrorNote error={error} /></div>}
      <div className="flex-1 overflow-x-auto p-5" dir="ltr">
        <div className="doc-pages" style={{ width: `${template.page.width}pt` }}>
          <PageSheets page={template.page} count={pages} />
          <div ref={page} onClick={pick} onInput={changed} onKeyDown={onKeyDown} onPaste={onPaste} />
        </div>
      </div>
    </div>
  );
}
