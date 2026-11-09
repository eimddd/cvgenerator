import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteContract, getContract, saveContract } from '../lib/db';
import { loadTemplate } from '../templates';
import DocRenderer, { pageCss } from '../components/DocRenderer';
import ContractForm from '../components/ContractForm';
import { FitToWidth, PrintPortal, printDocument } from '../components/print';
import { Button, ErrorNote, Spinner } from '../components/ui';
import { useBlankPrint } from '../components/ContractPreview';

const PT_TO_PX = 96 / 72;

// the people named in the contract, in form order (hand-made templates use p1_name, the others a name label)
function names(template, values) {
  return template.fields.filter((f) => /_name$/.test(f.key) || /الاسم|السيد/.test(f.label)).map((f) => values[f.key]?.trim()).filter(Boolean);
}

function contractTitle(template, values) {
  const n = names(template, values).slice(0, 2);
  return n.length ? `${template.title} — ${n.join(' / ')}` : template.title;
}

// every filled value is searchable in History (names, ID numbers, plates, addresses…)
function searchText(template, values) {
  const filled = template.fields.filter((f) => f.type !== 'gender').map((f) => values[f.key]?.trim()).filter(Boolean);
  return [template.title, template.category, ...filled].join(' · ');
}

export default function ContractEditor() {
  const { id, templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [record, setRecord] = useState(null);
  const [values, setValues] = useState({});
  const [active, setActive] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);
  const [printBlank, blankPortal] = useBlankPrint();

  useEffect(() => {
    (async () => {
      try {
        if (id) {
          const c = await getContract(id);
          setRecord(c); setValues(c.values || {});
          setTemplate(await loadTemplate(c.template_id));
        } else {
          setTemplate(await loadTemplate(templateId));
        }
      } catch (e) { setError(e); }
    })();
  }, [id, templateId]);

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (v) => { setValues(v); setDirty(true); };

  const save = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      const saved = await saveContract({
        id: record?.id, template_id: template.id, template_title: template.title,
        category: template.category, lang: template.lang, title: contractTitle(template, values), values,
        search_text: searchText(template, values),
      });
      setRecord(saved); setDirty(false); setSavedAt(new Date());
      if (!record) navigate(`/contracts/${saved.id}`, { replace: true });
    } catch (e) { setError(e); }
    setSaving(false);
  }, [record, template, values, navigate]);

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  async function remove() {
    if (!confirm('حذف هذا العقد نهائياً؟')) return;
    try { await deleteContract(record.id); navigate('/contracts/history'); } catch (e) { setError(e); }
  }

  function focusField(key) {
    setActive(key);
    const el = document.getElementById(`f-${key}`);
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  if (!template) return <div className="px-5 py-8"><ErrorNote error={error} />{!error && <Spinner />}</div>;
  const fileName = contractTitle(template, values);
  const missing = template.fields.filter((f) => f.type !== 'gender' && !f.optional && !values[f.key]).length;

  return (
    <div className="flex min-h-screen flex-col font-[family-name:var(--font-arabic)]" dir="rtl">
      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={record ? '/contracts/history' : '/contracts'} className="text-sm text-slate-500 hover:text-brand">→ {record ? 'السجل' : 'النماذج'}</Link>
          <h1 className="min-w-0 flex-1 truncate font-semibold text-ink">{template.title}</h1>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ…' : dirty || !record ? 'حفظ' : 'تم الحفظ ✓'}</Button>
          <Button onClick={() => printDocument(fileName)}>طباعة</Button>
          <Button onClick={() => printDocument(fileName)} title="في نافذة الطباعة اختر «حفظ بصيغة PDF»">PDF</Button>
          <Button onClick={() => printBlank(template)} title="العقد بنقط مكان المعلومات، للملء باليد">نسخة فارغة</Button>
          <Button variant="ghost" onClick={() => (!dirty || confirm('لم يتم حفظ التغييرات. المتابعة؟')) && navigate(`/contracts/templates/${template.id}/edit`)}>تعديل النموذج</Button>
          {record && <Button variant="ghost" onClick={remove} className="text-red-600">حذف</Button>}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {missing ? `${missing} خانة فارغة — ستُطبع نقطاً.` : 'كل الخانات مملوءة.'}
          {savedAt && ` · حُفظ على الساعة ${savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
        </div>
      </div>
      {error && <div className="px-5 pt-4"><ErrorNote error={error} /></div>}
      <div className="grid flex-1 gap-5 p-5 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="no-print lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pe-1">
          <ContractForm template={template} values={values} onChange={update} activeField={active} onFocusField={setActive} />
        </div>
        <div className="min-w-0" dir="ltr">
          <FitToWidth pageWidthPx={template.page.width * PT_TO_PX}>
            <DocRenderer template={template} values={values} mode="screen" activeField={active} onFieldClick={focusField} />
          </FitToWidth>
        </div>
      </div>
      {blankPortal || (
        <PrintPortal css={pageCss(template)}>
          <DocRenderer template={template} values={values} mode="print" />
        </PrintPortal>
      )}
    </div>
  );
}
