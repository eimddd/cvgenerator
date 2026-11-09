// Development-only gallery to check every contract template against the Word original.
import { useEffect, useState } from 'react';
import { templates, loadTemplate } from '../templates';
import DocRenderer from '../components/DocRenderer';

export default function DevTemplates() {
  const [id, setId] = useState(() => new URLSearchParams(location.search).get('t') || templates[0]?.id);
  const [tpl, setTpl] = useState(null);
  const [filled, setFilled] = useState(false);
  useEffect(() => { loadTemplate(id).then(setTpl); }, [id]);
  const values = filled && tpl ? Object.fromEntries(tpl.fields.map((f) => [f.key, f.type === 'gender' ? 'm' : f.label])) : {};
  return (
    <div className="flex gap-4 p-4">
      <div className="w-72 shrink-0 space-y-1 text-sm" dir="rtl">
        <label className="flex gap-2"><input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} /> filled</label>
        {templates.map((t) => (
          <button key={t.id} onClick={() => setId(t.id)} className={`block w-full text-right ${t.id === id ? 'font-bold text-blue-700' : ''}`}>{t.id} {t.title}</button>
        ))}
      </div>
      <div id="dev-page">{tpl && <DocRenderer template={tpl} values={values} mode={filled ? 'screen' : 'print'} />}</div>
    </div>
  );
}
