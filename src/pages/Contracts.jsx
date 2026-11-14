import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { listContracts, PAGE_SIZE, KEEP_DAYS } from '../lib/db';
import { useTemplates } from '../templates';
import ContractPreview, { EyeIcon } from '../components/ContractPreview';
import { Button, Empty, ErrorNote, Input, PageHeader, Select, Spinner, formatDate } from '../components/ui';
import { useSession } from '../lib/auth';
import { timeAgo, useRecentTemplates } from '../lib/recent';

// The 9 templates used last, newest first; hidden until a contract has been used.
function Recent({ templates }) {
  const navigate = useNavigate();
  const used = useRecentTemplates(useSession()?.user?.id);
  const byId = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const cards = used.filter((r) => byId.has(r.id)).slice(0, 9); // a deleted template drops out
  if (!cards.length) return null;
  return (
    <section className="mb-8" aria-labelledby="recent-title">
      <h2 id="recent-title" className="mb-3 text-sm font-semibold text-ink">Recent</h2>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((r) => {
          const t = byId.get(r.id);
          return (
            <button key={r.id} type="button" onClick={() => navigate(`/contracts/new/${t.id}`)}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-start shadow-sm transition hover:border-brand hover:shadow">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6" /></svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink" dir="auto">{t.title}</span>
                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                  <span className="truncate" dir="auto">{t.category}</span>
                  <span aria-hidden="true">·</span>
                  <time className="shrink-0" dateTime={new Date(r.at).toISOString()} title={new Date(r.at).toLocaleString('en-GB')}>{timeAgo(r.at)}</time>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// "New contract" and "History" share this tab bar.
function Tabs() {
  const tab = ({ isActive }) => `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`;
  return (
    <div className="mb-6 inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <NavLink to="/contracts" end className={tab}>New contract</NavLink>
      <NavLink to="/contracts/history" className={tab}>History</NavLink>
    </div>
  );
}

const addDays = (iso, n) => new Date(new Date(iso).getTime() + n * 864e5).toISOString();
const NO_FILTERS = { q: '', category: '', templateId: '', from: '', to: '' };

export function ContractHistory() {
  const navigate = useNavigate();
  const { templates, categories } = useTemplates();
  const [f, setF] = useState(NO_FILTERS);
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const set = (k, v) => setF((old) => ({ ...old, [k]: v, ...(k === 'category' ? { templateId: '' } : {}) }));

  const query = useMemo(() => ({ q: f.q.trim(), category: f.category, templateId: f.templateId, from: f.from, to: f.to }), [f]);

  useEffect(() => {
    const t = setTimeout(() => {
      setError(null);
      listContracts({ ...query, page: 0 }).then((r) => { setRows(r); setPage(0); setMore(r.length === PAGE_SIZE); }).catch(setError);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function loadMore() {
    const r = await listContracts({ ...query, page: page + 1 }).catch(setError);
    if (!r) return;
    setRows([...rows, ...r]); setPage(page + 1); setMore(r.length === PAGE_SIZE);
  }

  const templateOptions = templates.filter((t) => !f.category || t.category === f.category);
  const filtered = Object.entries(f).some(([k, v]) => v && v !== NO_FILTERS[k]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <Tabs />
      <PageHeader title="Contract history" subtitle={`Saved contracts, newest first. Each one is deleted automatically, with its details, after ${KEEP_DAYS} days.`} />

      <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2"><Input value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="Search: name, ID number, contract type…" /></div>
        <Select value={f.category} onChange={(e) => set('category', e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={f.templateId} onChange={(e) => set('templateId', e.target.value)}>
          <option value="">All contract types</option>
          {templateOptions.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </Select>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <input type="date" aria-label="From" value={f.from} onChange={(e) => set('from', e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          <span>→</span>
          <input type="date" aria-label="To" value={f.to} onChange={(e) => set('to', e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
        </div>
        {filtered && <button type="button" onClick={() => setF(NO_FILTERS)} className="text-start text-sm text-brand hover:underline lg:col-span-5">Clear filters</button>}
      </div>

      <ErrorNote error={error} />
      {!rows ? <Spinner /> : !rows.length ? (
        <Empty title={filtered ? 'No contract matches this search' : 'No saved contracts'}>
          {!filtered && <Link to="/contracts" className="font-medium text-brand">Write a new contract</Link>}
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start">Date</th>
                <th className="px-4 py-3 text-start">Contract</th>
                <th className="hidden px-4 py-3 text-start lg:table-cell">Category</th>
                <th className="px-4 py-3 text-start">Deleted on</th>
                <th className="w-12 px-2 py-3"><span className="sr-only">Preview</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/contracts/${r.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-ink" dir="auto">{r.title}</td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{r.category}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(addDays(r.created_at, KEEP_DAYS))}</td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(r.id); }} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-brand" title="Preview" aria-label="Preview contract"><EyeIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {more && <div className="border-t border-slate-100 p-3 text-center"><Button onClick={loadMore}>Show more</Button></div>}
        </div>
      )}
      {preview && <ContractPreview contractId={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

export default function NewContract() {
  const navigate = useNavigate();
  const { templates, categories } = useTemplates();
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState(null);

  const shown = templates.filter((t) => !q || `${t.title} ${t.category}`.includes(q.trim()));
  const groups = categories.map((c) => [c, shown.filter((t) => t.category === c)]).filter(([, list]) => list.length);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Tabs />
      <PageHeader title="New contract" subtitle={`Choose one of ${templates.length} templates, then fill in the details.`} actions={<Button variant="primary" onClick={() => navigate('/contracts/import')}>+ Add a contract</Button>} />
      {!q && <Recent templates={templates} />}
      <div className="mb-6 w-full max-w-md"><Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates (Arabic, e.g. كراء، سيارة، وكالة)" /></div>
      {!groups.length && <Empty title="No template with this name" />}
      <div className="space-y-8">
        {groups.map(([cat, list]) => (
          <section key={cat}>
            <h2 className="mb-3 text-sm font-semibold text-slate-500" dir="auto">{cat} <span className="font-normal">({list.length})</span></h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <div key={t.id} className="flex items-stretch rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand hover:shadow">
                  <button type="button" onClick={() => navigate(`/contracts/new/${t.id}`)} className="min-w-0 flex-1 px-4 py-3 text-start">
                    <div className="font-medium text-ink" dir="auto">{t.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{t.fieldCount} fields</div>
                  </button>
                  <button type="button" onClick={() => setPreview(t.id)} className="px-3 text-slate-400 hover:text-brand" title="Preview" aria-label={`Preview ${t.title}`}><EyeIcon /></button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {preview && <ContractPreview templateId={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
