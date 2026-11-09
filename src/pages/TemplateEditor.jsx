// Word-like editor for a contract template. The page is rendered once as editable HTML
// (fields and gender words are locked chips), then read back into the template's block
// model on save, so the layout keeps every paragraph's spacing, indents and alignment.
import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import DocRenderer, { LENGTHS, LENGTH_CM, fieldLength } from '../components/DocRenderer';
import { loadOriginal, loadTemplate, resetTemplateEdit, saveTemplateEdit, useTemplates } from '../templates';
import { Button, ErrorNote, Input, Spinner } from '../components/ui';

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
const KIND_NAMES = { name: 'اسم', date: 'تاريخ', id: 'رقم بطاقة', address: 'عنوان', amount: 'مبلغ', free: 'نص حر' };
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

function Tool({ onClick, title, children, active }) {
  // mousedown + preventDefault keeps the text selection in the page
  return (
    <button type="button" title={title} aria-label={title} onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`min-w-9 rounded-md border px-2 py-1.5 text-sm ${active ? 'border-brand bg-brand-soft text-brand' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
      {children}
    </button>
  );
}

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
    doc.classList.add('doc-editing');
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
  const changed = () => { setDirty(true); setNotice(''); const n = renumber(); if (picked) setPickedNum(n.get(picked) ?? null); };

  const exec = (cmd) => { if (selection()) { document.execCommand(cmd); changed(); } };
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
    if (!range) return;
    paragraphsIn(doc(), range).forEach((el) => { el.style[prop] = value; });
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
    if (!text.trim()) { setNotice('حدد أولاً الجزء من النص الذي تريد تحويله إلى خانة.'); return; }
    const para = (n) => (n.nodeType === Node.TEXT_NODE ? n.parentElement : n).closest('p');
    if (para(range.startContainer) !== para(range.endContainer) || range.cloneContents().querySelector('[data-run]')) {
      setNotice('حدد نصاً داخل سطر واحد لا يحتوي على خانة أخرى.');
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
    if (isImported && (!title.trim() || !category.trim())) { setError(new Error('أدخل عنوان العقد وصنفه قبل الحفظ.')); return; }
    setSaving(true); setError(null);
    try {
      const blocks = parseBlocks(doc(), template.blocks);
      const fields = keptFields([...template.fields, ...added], blocks, lengths, kinds);
      const next = { ...template, blocks, fields, ...(isImported ? { title: title.trim(), category: category.trim(), fieldCount: fields.length } : {}) };
      if (isNew) next.id = `u${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      await saveTemplateEdit(next);
      setDirty(false);
      if (isNew) { navigate(`/contracts/templates/${next.id}/edit`, { replace: true }); setSaving(false); return; }
      setTemplate(next); setNotice('تم حفظ النموذج. العقود الجديدة ستستعمل هذه النسخة.');
    } catch (e) { setError(e); }
    setSaving(false);
  }

  async function removeImported() {
    if (!confirm('حذف هذا النموذج نهائياً؟ لن تُفتح بعد ذلك العقود المحفوظة التي تستعمله.')) return;
    try { await resetTemplateEdit(id); setDirty(false); navigate('/contracts'); } catch (e) { setError(e); }
  }

  async function reset() {
    if (!confirm('الرجوع إلى النموذج الأصلي وحذف كل التعديلات؟')) return;
    try { await resetTemplateEdit(id); setTemplate(await loadOriginal(id)); setNotice('تم الرجوع إلى النموذج الأصلي.'); } catch (e) { setError(e); }
  }

  if (!template) return <div className="px-5 py-8"><ErrorNote error={error} />{!error && <Spinner />}</div>;

  return (
    <div className="flex min-h-screen flex-col font-[family-name:var(--font-arabic)]" dir="rtl">
      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={isNew ? '/contracts/import' : `/contracts/new/${id}`} className="text-sm text-slate-500 hover:text-brand">→ {isNew ? 'رجوع' : 'العقد'}</Link>
          <h1 className="min-w-0 flex-1 truncate font-semibold text-ink">{isNew ? 'مراجعة العقد المستورد' : `تعديل النموذج: ${title || template.title}`}</h1>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ…' : dirty || isNew ? 'حفظ النموذج' : 'محفوظ ✓'}</Button>
          {!isImported && <Button variant="ghost" onClick={reset}>الرجوع إلى الأصل</Button>}
          {isImported && !isNew && <Button variant="ghost" className="text-red-600" onClick={removeImported}>حذف النموذج</Button>}
          {!isNew && <Button variant="ghost" onClick={() => navigate(`/contracts/new/${id}`)}>تحرير عقد بهذا النموذج</Button>}
        </div>
        {isImported && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input aria-label="عنوان العقد" placeholder="عنوان العقد" dir="auto" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
            <Input aria-label="الصنف" placeholder="الصنف (اختر أو اكتب صنفاً جديداً)" dir="auto" list="template-categories" value={category} onChange={(e) => { setCategory(e.target.value); setDirty(true); }} />
            <datalist id="template-categories">{categories.filter(Boolean).map((c) => <option key={c} value={c} />)}</datalist>
          </div>
        )}
        {location.state?.warning && <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">{location.state.warning}</div>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5" dir="rtl">
          <Tool title="غامق (Ctrl+B)" onClick={() => exec('bold')}><b>B</b></Tool>
          <Tool title="مائل (Ctrl+I)" onClick={() => exec('italic')}><i>I</i></Tool>
          <Tool title="تسطير (Ctrl+U)" onClick={() => exec('underline')}><u>U</u></Tool>
          <select aria-label="حجم الخط" defaultValue="" onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { fontSize(+e.target.value); e.target.value = ''; }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="" disabled>حجم الخط</option>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <Tool title="من اليمين إلى اليسار (عربية)" onClick={() => paragraphStyle('direction', 'rtl')}>RTL ←</Tool>
          <Tool title="من اليسار إلى اليمين (فرنسية / إنجليزية)" onClick={() => paragraphStyle('direction', 'ltr')}>→ LTR</Tool>
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <Tool title="محاذاة إلى البداية" onClick={() => paragraphStyle('textAlign', 'start')}>بداية</Tool>
          <Tool title="توسيط" onClick={() => paragraphStyle('textAlign', 'center')}>وسط</Tool>
          <Tool title="محاذاة إلى النهاية" onClick={() => paragraphStyle('textAlign', 'end')}>نهاية</Tool>
          <Tool title="ضبط" onClick={() => paragraphStyle('textAlign', 'justify')}>ضبط</Tool>
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <Tool title="تحويل النص المحدد إلى خانة منقطة" onClick={makeField} active>Transformer en champ</Tool>
          <select aria-label="نوع الخانة" disabled={!picked} value={kinds[picked] || 'free'} onMouseDown={(e) => e.stopPropagation()} onChange={(e) => setKind(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-40">
            {Object.entries(KIND_NAMES).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          </select>
          <span className={`text-xs ${picked ? 'text-slate-600' : 'text-slate-400'}`}>{picked ? `طول الخانة ${pickedNum}:` : 'طول الخانة (انقر على خانة):'}</span>
          {Object.entries(LENGTHS).map(([len, name]) => (
            <Tool key={len} title={`طول الخانة: ${name}`} active={picked && lengths[picked] === len} onClick={() => setLength(len)}>{name}</Tool>
          ))}
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <Tool title="تراجع (Ctrl+Z)" onClick={() => exec('undo')}>↶</Tool>
          <Tool title="إعادة (Ctrl+Y)" onClick={() => exec('redo')}>↷</Tool>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {notice || 'اكتب أو احذف مباشرة في الصفحة كما في Word. حدد نصاً ثم «Transformer en champ» لإنشاء خانة، وانقر على خانة لتغيير نوعها وطولها.'}
        </div>
      </div>
      {error && <div className="px-5 pt-4"><ErrorNote error={error} /></div>}
      <div className="flex-1 overflow-x-auto p-5" dir="ltr">
        <div ref={page} onClick={pick} onInput={changed} onKeyDown={onKeyDown} onPaste={onPaste} />
      </div>
    </div>
  );
}
