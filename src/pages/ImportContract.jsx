// "Ajouter un contrat": read a file or pasted text here, then review it in the template editor.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, ErrorNote, PageHeader, Textarea } from '../components/ui';

export default function ImportContract() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);

  async function run(read) {
    setBusy('جارٍ قراءة النص…'); setError(null);
    try {
      const lib = await import('../lib/importContract'); // PDF and text-recognition code only loads here
      navigate('/contracts/templates/new/edit', { state: await read(lib) });
    } catch (e) {
      setError(e?.message ? e : new Error('تعذرت قراءة هذا الملف.'));
      setBusy('');
    }
  }
  function onFile(file) {
    if (file) run((lib) => lib.importFile(file, setBusy));
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 font-[family-name:var(--font-arabic)]" dir="rtl">
      <Link to="/contracts" className="text-sm text-slate-500 hover:text-brand">→ النماذج</Link>
      <PageHeader title="Ajouter un contrat" subtitle="ارفع ملفاً أو الصق النص، ثم راجعه وحدد الخانات قبل الحفظ. يُقرأ الملف في متصفحك فقط ولا يُرفع أو يُحفظ؛ يُحفظ النص وحده." />
      <ErrorNote error={error} />
      {busy ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600" role="status">{busy}</div>
      ) : (
        <div className="space-y-4">
          <label
            className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center hover:border-brand"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
          >
            <span className="block font-semibold text-ink">اختر ملف Word ‏(‎.docx) أو PDF</span>
            <span className="mt-1 block text-sm text-slate-500">أو اسحبه إلى هنا. العربية والفرنسية والإنجليزية، والملفات الممسوحة أيضاً.</span>
            <input type="file" accept=".docx,.pdf,.doc" className="sr-only" onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; onFile(f); }} />
          </label>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-brand">أو الصق النص</h2>
            <Textarea dir="auto" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="الصق نص العقد هنا…" />
            <div className="mt-3"><Button variant="primary" disabled={!text.trim()} onClick={() => run((lib) => lib.importText(text))}>متابعة</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
