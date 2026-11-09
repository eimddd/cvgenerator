// Renders a contract template (extracted from Word) with the form values filled in.
// Measurements are in points so the page matches the Word layout at print time.
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

// Every contract uses one clear Arabic web font, so it looks and prints the same on any PC.
const fontStack = () => 'var(--font-contract)';

// Word's "single" line height relative to font size, per font (measured in Word).
const LINE = {
  'Traditional Arabic': 1.5, 'Simplified Arabic': 1.65, 'Sakkal Majalla': 1.388, Calibri: 1.219, Tahoma: 1.2,
  Andalus: 1.144, 'Arabic Typesetting': 1.125, Cambria: 1.181, 'DecoType Naskh Variants': 1.181, 'Segoe UI': 1.331,
};
const SINGLE = 1.163;

const ALIGN = { left: 'start', start: 'start', right: 'end', end: 'end', center: 'center', both: 'justify', distribute: 'justify', lowKashida: 'justify', mediumKashida: 'justify', highKashida: 'justify' };

function runStyle(r, text) {
  const ar = r.rtl || ARABIC.test(text);
  const font = ar ? r.fontCs || r.font : r.font;
  const size = ar ? r.sizeCs || r.size : r.size;
  const bold = ar ? r.bCs ?? r.b : r.b;
  const italic = ar ? r.iCs ?? r.i : r.i;
  return {
    fontFamily: fontStack(font, ar),
    fontSize: size ? `${size}pt` : undefined,
    fontWeight: bold ? 700 : undefined,
    fontStyle: italic ? 'italic' : undefined,
    textDecoration: r.u ? 'underline' : undefined,
    textTransform: r.caps ? 'uppercase' : undefined,
    color: r.color,
    backgroundColor: r.highlight ? (r.highlight === 'yellow' ? '#ff0' : r.highlight) : undefined,
    verticalAlign: r.vertAlign === 'superscript' ? 'super' : r.vertAlign === 'subscript' ? 'sub' : undefined,
  };
}

// Writing-line length of an empty field, on screen and on paper (set per field in the template editor).
export const LENGTHS = { short: 'قصير', medium: 'متوسط', long: 'طويل', full: 'سطر كامل' };
export const LENGTH_CM = { short: '3cm', medium: '5.5cm', long: '9cm', full: '100%' };

// Smart default when the template doesn't say: names are long (up to four words), addresses take
// a full line, dates and ID numbers are short.
export function fieldLength(f) {
  if (!f) return 'medium';
  if (f.length) return f.length;
  const s = `${f.key} ${f.label || ''}`;
  if (/address|words|الساكن|العنوان|عنوان|القاطن|المقيم|بالحروف/.test(s)) return 'full'; // amounts in words are long too
  if (/_name|name$|الاسم|(ال|ل)سيد|المسمى|المسماة|الشريك|البائع|المشتري|الموكل|الوكيل/.test(s)) return 'long';
  if (/chassis|الإطار|الهيكل/.test(s)) return 'medium'; // a 17-character frame number
  if (/date|cin|birth|_day|phone|تاريخ|التاريخ|رقم|البطاقة|بطاقة|سنة|يوم|عمر|الهاتف|بالأرقام|ر ب ت و/.test(s)) return 'short';
  return 'medium';
}

function Run({ r, values, mode, activeField, onFieldClick }) {
  if (mode === 'edit' && r.g) {
    return <span contentEditable={false} data-run={JSON.stringify(r)} className="doc-gender" style={runStyle(r, r.m)}>{r.m}</span>;
  }
  if (r.g) {
    const text = values[r.g + '_gender'] === 'f' ? r.f : r.m;
    return <span style={runStyle(r, text)}>{text}</span>;
  }
  if (r.field) {
    const v = mode === 'edit' || mode === 'blank' ? '' : (values[r.field] ?? '').toString();
    const style = runStyle(r, v || 'x');
    const active = activeField === r.field ? ' doc-field-active' : '';
    const click = onFieldClick && (() => onFieldClick(r.field));
    // typed text sits on the line and wraps freely, so nothing is ever cut off
    if (v) return mode === 'screen' ? <bdi style={style} className={`doc-filled${active}`} onClick={click}>{v}</bdi> : <bdi style={style}>{v}</bdi>;
    // 'print' leaves optional gaps out; the blank copy draws every line, to fill in by pen
    if (mode === 'print' && r.optional) return null;
    const line = <span className="doc-line" style={{ width: LENGTH_CM[r.len] }}>{' '}</span>;
    if (mode === 'print' || mode === 'blank') return <span style={style}>{line}</span>;
    const { label, optional, num, len, ...run } = r;
    return (
      <span
        style={style}
        className={`doc-blank${active}`}
        onClick={click}
        {...(mode === 'edit' ? { contentEditable: false, 'data-run': JSON.stringify(run), 'data-key': r.field } : {})}
      >
        <sup className="doc-num" aria-label={label}>{num}</sup>{line}
      </span>
    );
  }
  // a right-to-left run mirrors neutral characters such as brackets, as in Word
  const bidi = r.rtl ? { direction: 'rtl', unicodeBidi: 'embed' } : null;
  return <span style={{ ...runStyle(r, r.t), ...bidi }}>{r.t}</span>;
}

function Paragraph({ p, index, ...rest }) {
  const first = p.runs.find((r) => (r.t ?? 'x').trim()) || p.mark || {};
  const sample = first.t || (first.field ? 'x' : '');
  const ar = p.bidi || ARABIC.test(sample);
  const font = (ar ? first.fontCs || first.font : first.font) || p.mark?.fontCs || p.mark?.font;
  const size = (ar ? first.sizeCs || first.size : first.size) || p.mark?.sizeCs || p.mark?.size || 12;
  let lineHeight;
  if (p.line && p.lineRule && p.lineRule !== 'auto') lineHeight = `${p.line / 20}pt`;
  else lineHeight = ((p.line || 240) / 240) * (LINE[font] || SINGLE);
  const empty = !p.runs.some((r) => r.field || r.g || (r.t && r.t.replace(/[\f]/g, '')));
  const style = {
    direction: p.bidi ? 'rtl' : 'ltr',
    textAlign: ALIGN[p.jc] || 'start',
    textAlignLast: p.jc === 'distribute' ? 'justify' : undefined,
    paddingTop: p.before ? `${p.before}pt` : undefined,
    paddingBottom: p.after ? `${p.after}pt` : undefined,
    paddingInlineStart: p.indStart ? `${Math.max(0, p.indStart)}pt` : undefined,
    paddingInlineEnd: p.indEnd ? `${Math.max(0, p.indEnd)}pt` : undefined,
    textIndent: p.indFirst ? `${p.indFirst}pt` : undefined,
    lineHeight,
    fontSize: `${size}pt`,
    fontFamily: fontStack(font, ar),
    breakBefore: p.runs[0]?.t?.startsWith('\f') ? 'page' : undefined,
  };
  // list bullet/number sits in the hanging indent, like Word's marker + tab
  const hanging = p.indFirst < 0 ? -p.indFirst : 0;
  const marker = p.marker && (
    <span data-marker="" contentEditable={rest.mode === 'edit' ? false : undefined} style={{ ...runStyle(p.marker, p.marker.t), textDecoration: 'none', display: 'inline-block', minWidth: hanging ? `${hanging}pt` : undefined, textIndent: 0 }}>
      {p.marker.t}{hanging ? '' : ' '}
    </span>
  );
  return (
    <p className="doc-p" style={style} data-b={rest.mode === 'edit' ? index : undefined}>
      {marker}
      {empty && !marker ? ' ' : p.runs.map((r, i) => <Run key={i} r={r} {...rest} />)}
    </p>
  );
}

function Table({ t, index, ...rest }) {
  const total = t.grid.reduce((a, b) => a + b, 0) || 1;
  return (
    <table className="doc-table" dir={t.bidi ? 'rtl' : 'ltr'} data-b={rest.mode === 'edit' ? index : undefined}>
      <colgroup>{t.grid.map((w, i) => <col key={i} style={{ width: `${(w / total) * 100}%` }} />)}</colgroup>
      <tbody>
        {t.rows.map((row, i) => (
          <tr key={i}>
            {row.map((c, j) => {
              if (c.vMerge === 'continue') return null;
              let rowSpan = 1;
              if (c.vMerge === 'restart') {
                for (let k = i + 1; k < t.rows.length && t.rows[k][j]?.vMerge === 'continue'; k++) rowSpan++;
              }
              const bordered = c.borders ?? t.borders;
              return (
                <td key={j} colSpan={c.span} rowSpan={rowSpan} className={bordered ? 'doc-td doc-td-border' : 'doc-td'} data-cell={rest.mode === 'edit' ? `${i},${j}` : undefined}>
                  <Blocks blocks={c.blocks} {...rest} />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Word's "don't add space between paragraphs of the same style" (list items mostly)
function applyContextualSpacing(blocks) {
  return blocks.map((b, i) => {
    if (b.type !== 'p') return b;
    const prev = blocks[i - 1]; const next = blocks[i + 1];
    const samePrev = b.contextual && prev?.type === 'p' && prev.style === b.style;
    const sameNext = next?.type === 'p' && next.contextual && next.style === b.style;
    return samePrev || sameNext ? { ...b, before: samePrev ? 0 : b.before, after: sameNext ? 0 : b.after } : b;
  });
}

function Blocks({ blocks, ...rest }) {
  return applyContextualSpacing(blocks).map((b, i) => {
    if (b.type === 'p') return <Paragraph key={i} index={i} p={b} {...rest} />;
    if (b.type === 'table') return <Table key={i} index={i} t={b} {...rest} />;
    if (b.type === 'box') return <div key={i} className="doc-box" data-b={rest.mode === 'edit' ? i : undefined}><Blocks blocks={b.blocks} {...rest} /></div>;
    return null;
  });
}

// Fields are numbered in the order they first appear in the document (gender toggles excluded).
export function fieldNumbers(template) {
  const keys = new Set(template.fields.filter((f) => f.type !== 'gender').map((f) => f.key));
  const n = new Map();
  const walk = (blocks) => blocks.forEach((b) => {
    if (b.type === 'p') b.runs.forEach((r) => { if (r.field && keys.has(r.field) && !n.has(r.field)) n.set(r.field, n.size + 1); });
    else if (b.type === 'box') walk(b.blocks);
    else if (b.type === 'table') b.rows.forEach((row) => row.forEach((c) => walk(c.blocks)));
  });
  walk(template.blocks);
  return n;
}
export const fieldLabel = (n) => `الخانة ${n}`;

// mode: 'screen' shows empty fields by number; 'print' prints them as dotted gaps;
// 'blank' prints every gap as dots; 'edit' is the template editor (fields are locked chips).
export default function DocRenderer({ template, values = {}, mode = 'screen', activeField, onFieldClick }) {
  const { page } = template;
  const byKey = Object.fromEntries(template.fields.map((f) => [f.key, f]));
  const nums = fieldNumbers(template);
  const withLabels = (blocks) =>
    blocks.map((b) => {
      if (b.type === 'p') return { ...b, runs: b.runs.map((r) => (r.field ? { ...r, num: nums.get(r.field), label: fieldLabel(nums.get(r.field)), len: fieldLength(byKey[r.field]), optional: byKey[r.field]?.optional } : r)) };
      if (b.type === 'box') return { ...b, blocks: withLabels(b.blocks) };
      if (b.type === 'table') return { ...b, rows: b.rows.map((row) => row.map((c) => ({ ...c, blocks: withLabels(c.blocks) }))) };
      return b;
    });
  const m = page.margins;
  return (
    <div
      className="doc-page"
      style={{
        width: `${page.width}pt`,
        minHeight: `${page.height}pt`,
        padding: `${m.top}pt ${m.right}pt ${m.bottom}pt ${m.left}pt`,
        '--doc-margins': `${m.top}pt ${m.right}pt ${m.bottom}pt ${m.left}pt`,
      }}
    >
      <Blocks blocks={withLabels(template.blocks)} values={values} mode={mode} activeField={activeField} onFieldClick={onFieldClick} />
    </div>
  );
}

// @page rule for the template, injected while the editor is open.
export function pageCss(template) {
  const { width, height, margins: m } = template.page;
  return `@page { size: ${width}pt ${height}pt; margin: ${m.top}pt ${m.right}pt ${m.bottom}pt ${m.left}pt; }`;
}
