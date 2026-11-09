import { fieldLabel, fieldNumbers } from './DocRenderer';
import { DateInput } from './ui';

const T = { details: 'معلومات العقد', male: 'ذكر', female: 'أنثى', party: 'الطرف' };
const isDate = (key) => /date|birth$|_birth|day$/.test(key) && !/words/.test(key);

function FieldInput({ field, value, onChange, active, onFocus, dir }) {
  const date = field.kind === 'date' || isDate(field.key) || (/تاريخ|^date/i.test(field.label || '') && !/بالحروف|lettres/i.test(field.label));
  const common = {
    id: `f-${field.key}`,
    dir,
    value: value ?? '',
    onChange: (e) => onChange(field.key, e.target.value),
    onFocus: () => onFocus(field.key),
    className: `w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 ${active ? 'border-brand' : 'border-slate-300'} ${!value ? 'bg-amber-50/40' : ''}`,
    placeholder: date ? 'يوم/شهر/سنة' : undefined,
  };
  if (date) return <DateInput {...common} className={`${common.className} text-right`} onChange={(v) => onChange(field.key, v)} warning="تاريخ غير صحيح (يوم/شهر/سنة)" />;
  return field.type === 'textarea' ? <textarea rows={4} {...common} /> : <input {...common} />;
}

export default function ContractForm({ template, values, onChange, activeField, onFocusField }) {
  const set = (key, v) => onChange({ ...values, [key]: v });
  // numbered like the document ("الخانة 1", "الخانة 2"…) so a field can't be mixed up with another
  const nums = fieldNumbers(template);
  const byNumber = (a, b) => (nums.get(a.key) ?? 1e9) - (nums.get(b.key) ?? 1e9);
  const parties = [...new Set(template.fields.filter((f) => f.party).map((f) => f.party))].sort();
  const others = template.fields.filter((f) => !f.party);

  const block = (title, fields, extra) => (
    <section key={title} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-brand">{title}</h3>
        {extra}
      </div>
      <div className="space-y-3">
        {[...fields].sort(byNumber).map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{fieldLabel(nums.get(f.key))}</span>
            <FieldInput field={f} value={values[f.key]} onChange={set} active={activeField === f.key} onFocus={onFocusField} dir={template.lang === 'ar' ? 'rtl' : 'auto'} />
          </label>
        ))}
      </div>
    </section>
  );

  return (
    <div className="space-y-4 font-[family-name:var(--font-arabic)]" dir="rtl">
      {parties.map((p, i) => {
        const fields = template.fields.filter((f) => f.party === p && f.type !== 'gender');
        const hasGender = template.fields.some((f) => f.key === `${p}_gender`);
        const g = values[`${p}_gender`] || 'm';
        const extra = hasGender && (
          <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs">
            {[['m', T.male], ['f', T.female]].map(([v, label]) => (
              <button key={v} type="button" onClick={() => set(`${p}_gender`, v)} className={`px-2.5 py-1 ${g === v ? 'bg-brand text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</button>
            ))}
          </div>
        );
        return block(template.parties[p] || `${T.party} ${i + 1}`, fields, extra);
      })}
      {others.length > 0 && block(T.details, others)}
    </div>
  );
}
