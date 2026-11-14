// "Ajouter un contrat": read a file or pasted text here, then review it in the template editor.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, ErrorNote, PageHeader, Textarea } from '../components/ui';

export default function ImportContract() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [over, setOver] = useState(false);

  async function run(read) {
    setBusy('Reading the document…'); setError(null);
    try {
      const lib = await import('../lib/importContract'); // PDF and text-recognition code only loads here
      navigate('/contracts/templates/new/edit', { state: await read(lib) });
    } catch (e) {
      setError(e?.message ? e : new Error('This file could not be read.'));
      setBusy('');
    }
  }
  function onFile(file) {
    if (file) run((lib) => lib.importFile(file, setBusy));
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link to="/contracts" className="text-sm text-slate-500 hover:text-brand">← Contracts</Link>
      <PageHeader title="Add a contract" subtitle="Import a file or paste the text, then check it and create the fields to fill in before saving." />
      <ErrorNote error={error} />
      {busy ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-600" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />{busy}
        </div>
      ) : (
        <div className="space-y-4">
          <label
            className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed bg-white px-6 py-10 text-center transition ${over ? 'border-brand bg-brand-soft' : 'border-slate-300 hover:border-brand'}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}
          >
            <svg viewBox="0 0 24 24" className="mb-3 h-10 w-10 text-brand" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M12 17v-6m-3 3 3-3 3 3" />
            </svg>
            <span className="font-semibold text-ink">Choose a Word (.docx) or PDF file</span>
            <span className="mt-1 text-sm text-slate-500">or drag it here. Arabic, French or English, scanned documents included.</span>
            <span className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm">Browse…</span>
            <input type="file" accept=".docx,.pdf,.doc" className="sr-only" onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; onFile(f); }} />
          </label>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink">Or paste the contract text</h2>
            <Textarea dir="auto" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the text here…" />
            <div className="mt-3 flex justify-end"><Button variant="primary" disabled={!text.trim()} onClick={() => run((lib) => lib.importText(text))}>Continue</Button></div>
          </div>
          <p className="flex items-start gap-2 text-xs text-slate-500">
            <svg viewBox="0 0 20 20" className="mt-px h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true"><path d="M10 1.5 3 4.5v5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9v-5l-7-3Z" /></svg>
            The file is read in your browser: it is never uploaded or kept. Only the template text is saved.
          </p>
        </div>
      )}
    </div>
  );
}
