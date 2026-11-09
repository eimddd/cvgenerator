import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { listContracts, PAGE_SIZE, KEEP_DAYS } from '../lib/db';
import { useTemplates } from '../templates';
import ContractPreview, { EyeIcon } from '../components/ContractPreview';
import { Button, Empty, ErrorNote, Input, PageHeader, Select, Spinner, formatDate } from '../components/ui';

// "New contract" and "History" share this tab bar.
function Tabs() {
  const tab = ({ isActive }) => `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`;
  return (
    <div className="mb-6 inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <NavLink to="/contracts" end className={tab}>عقد جديد</NavLink>
      <NavLink to="/contracts/history" className={tab}>السجل</NavLink>
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
    <div className="mx-auto max-w-7xl px-5 py-8 font-[family-name:var(--font-arabic)]" dir="rtl">
      <Tabs />
      <PageHeader title="سجل العقود" subtitle={`العقود المحفوظة من الأحدث إلى الأقدم. تُحذف تلقائياً مع معطياتها بعد ${KEEP_DAYS} يوماً.`} />

      <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2"><Input value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="بحث: الاسم، رقم البطاقة، نوع العقد…" /></div>
        <Select value={f.category} onChange={(e) => set('category', e.target.value)}>
          <option value="">كل الأصناف</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={f.templateId} onChange={(e) => set('templateId', e.target.value)}>
          <option value="">كل أنواع العقود</option>
          {templateOptions.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </Select>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <input type="date" aria-label="من" value={f.from} onChange={(e) => set('from', e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          <span>←</span>
          <input type="date" aria-label="إلى" value={f.to} onChange={(e) => set('to', e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
        </div>
        {filtered && <button type="button" onClick={() => setF(NO_FILTERS)} className="text-start text-sm text-brand hover:underline lg:col-span-5">مسح عوامل التصفية</button>}
      </div>

      <ErrorNote error={error} />
      {!rows ? <Spinner /> : !rows.length ? (
        <Empty title={filtered ? 'لا يوجد عقد يطابق هذا البحث' : 'لا توجد عقود محفوظة'}>
          {!filtered && <Link to="/contracts" className="font-medium text-brand">تحرير عقد جديد</Link>}
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start">التاريخ</th>
                <th className="px-4 py-3 text-start">العقد</th>
                <th className="hidden px-4 py-3 text-start lg:table-cell">الصنف</th>
                <th className="px-4 py-3 text-start">يُحذف في</th>
                <th className="w-12 px-2 py-3"><span className="sr-only">معاينة</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/contracts/${r.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{r.title}</td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{r.category}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(addDays(r.created_at, KEEP_DAYS))}</td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(r.id); }} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-brand" title="معاينة" aria-label="معاينة العقد"><EyeIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {more && <div className="border-t border-slate-100 p-3 text-center"><Button onClick={loadMore}>عرض المزيد</Button></div>}
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
    <div className="mx-auto max-w-6xl px-5 py-8 font-[family-name:var(--font-arabic)]" dir="rtl">
      <Tabs />
      <PageHeader title="تحرير عقد جديد" subtitle={`اختر نوع العقد من بين ${templates.length} نموذجاً، ثم املأ المعلومات.`} actions={<Button variant="primary" onClick={() => navigate('/contracts/import')}>+ Ajouter un contrat</Button>} />
      <div className="mb-6 w-full max-w-md"><Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن نموذج (مثال: كراء، سيارة، وكالة…)" /></div>
      {!groups.length && <Empty title="لا يوجد نموذج بهذا الاسم" />}
      <div className="space-y-8">
        {groups.map(([cat, list]) => (
          <section key={cat}>
            <h2 className="mb-3 text-sm font-semibold text-slate-500">{cat} <span className="font-normal">({list.length})</span></h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <div key={t.id} className="flex items-stretch rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand hover:shadow">
                  <button type="button" onClick={() => navigate(`/contracts/new/${t.id}`)} className="min-w-0 flex-1 px-4 py-3 text-start">
                    <div className="font-medium text-ink">{t.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{t.fieldCount} خانة</div>
                  </button>
                  <button type="button" onClick={() => setPreview(t.id)} className="px-3 text-slate-400 hover:text-brand" title="معاينة" aria-label={`معاينة ${t.title}`}><EyeIcon /></button>
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
