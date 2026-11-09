import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { deleteCv, getClient, getCv, listCvs, saveCv, PAGE_SIZE } from '../lib/db';
import CvDocument, { ACCENTS, CV_TEMPLATES, CV_TEXT, FIXED_COLOURS, LEVELS } from '../components/cv/CvDocument';
import { EDUCATION_LEVELS, GenderChoice, NationalityInput, genderOf, nationalityFor, INTEREST_SUGGESTIONS, SKILL_SUGGESTIONS, Suggestions, JobTitleInput, LicencePicker, degreeText, licenceText, parseLicence, rememberJobTitles } from '../components/cv/cvFields';
import PhotoCropper from '../components/cv/PhotoCropper';
import { ClientPicker } from '../components/clients';
import { FitToWidth, PrintPortal, printDocument } from '../components/print';
import { Button, DateInput, Empty, ErrorNote, Field, Input, PageHeader, Select, Spinner, Textarea, formatDate } from '../components/ui';

const A4_PX = (210 / 25.4) * 96;
const LANG_NAMES = { fr: 'Français', ar: 'العربية', en: 'English' };

const blankExp = () => ({ role: '', company: '', city: '', start: '', end: '', current: false, description: '' });
const blankEdu = () => ({ level: '', field: '', degree: '', school: '', city: '', start: '', end: '', description: '' });
// an older CV only has the typed degree: show it as the spécialité until a level is picked
const specialty = (e) => (e.field ?? e.degree ?? '');
// what every new CV starts with, in its own language
const START = {
  fr: { nationality: 'Marocain', languages: ['Arabe', 'Français', 'Anglais'] },
  ar: { nationality: 'مغربي', languages: ['العربية', 'الفرنسية', 'الإنجليزية'] },
  en: { nationality: 'Moroccan', languages: ['Arabic', 'French', 'English'] },
};
export const emptyCv = (lang = 'fr') => ({
  lang, color: ACCENTS[0], template: 'essentiel',
  personal: { full_name: '', title: '', phone: '', email: '', address: '', birth_date: '', birth_place: '', gender: 'm', nationality: START[lang].nationality, marital: '', license: '', photo: '' },
  profile: '', experience: [blankExp()], education: [blankEdu()], skills: [], languages: START[lang].languages.map((name, i) => ({ name, level: i ? 'moyen' : 'native' })), certificates: [], interests: [], references: [],
});

function personalFromClient(c) {
  return { full_name: c.full_name || '', phone: c.phone || '', email: c.email || '', address: c.address || '', birth_date: c.birth_date || '', nationality: c.nationality || '' };
}

export default function Cvs() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => listCvs({ q: q.trim() }).then((r) => { setRows(r); setPage(0); setMore(r.length === PAGE_SIZE); }).catch(setError), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function loadMore() {
    const r = await listCvs({ q: q.trim(), page: page + 1 }).catch(setError);
    if (r) { setRows([...rows, ...r]); setPage(page + 1); setMore(r.length === PAGE_SIZE); }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <PageHeader title="CV" subtitle="CV des clients en français, arabe ou anglais." actions={<Button variant="primary" onClick={() => navigate('/cvs/new')}>+ Nouveau CV</Button>} />
      <div className="mb-4 max-w-md"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom" /></div>
      <ErrorNote error={error} />
      {!rows ? <Spinner /> : !rows.length ? <Empty title="Aucun CV pour le moment"><Link to="/cvs/new" className="font-medium text-brand">Créer le premier CV</Link></Empty> : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3 text-start">Date</th><th className="px-4 py-3 text-start">CV</th><th className="px-4 py-3 text-start">Langue</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/cvs/${r.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-ink" dir="auto">{r.title || r.clients?.full_name}</td>
                  <td className="px-4 py-3 text-slate-500">{LANG_NAMES[r.lang]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {more && <div className="border-t border-slate-100 p-3 text-center"><Button onClick={loadMore}>Afficher plus</Button></div>}
        </div>
      )}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-brand">{title}</h3>{action}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ListEditor({ items, onChange, render, make, addLabel }) {
  const move = (i, d) => { const a = [...items]; [a[i], a[i + d]] = [a[i + d], a[i]]; onChange(a); };
  return (
    <>
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex justify-end gap-1 text-xs text-slate-400">
            <button type="button" disabled={!i} onClick={() => move(i, -1)} className="rounded px-1.5 hover:bg-white disabled:opacity-30" aria-label="Monter">↑</button>
            <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded px-1.5 hover:bg-white disabled:opacity-30" aria-label="Descendre">↓</button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded px-1.5 text-red-500 hover:bg-white">Retirer</button>
          </div>
          {render(it, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      <Button onClick={() => onChange([...items, make()])} className="w-full">{addLabel}</Button>
    </>
  );
}

export function CvEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [record, setRecord] = useState(null);
  const [client, setClient] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [fit, setFit] = useState(null); // one-page fit step measured on the preview, reused for printing

  useEffect(() => {
    (async () => {
      try {
        if (id) {
          const cv = await getCv(id);
          setRecord(cv); setClient(cv.clients); setData({ ...emptyCv(cv.lang), ...cv.data, lang: cv.lang });
        } else {
          const d = emptyCv();
          const cid = params.get('client');
          if (cid) { const c = await getClient(cid); setClient(c); d.personal = { ...d.personal, ...personalFromClient(c) }; }
          setData(d);
        }
      } catch (e) { setError(e); }
    })();
  }, [id, params]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patch = (p) => { setData((d) => ({ ...d, ...p })); setDirty(true); };
  const setP = (k) => (e) => patch({ personal: { ...data.personal, [k]: e.target.value } });

  function chooseClient(c) {
    setClient(c); setDirty(true);
    setData((d) => ({ ...d, personal: { ...d.personal, ...Object.fromEntries(Object.entries(personalFromClient(c)).filter(([k, v]) => v && !d.personal[k])) } }));
  }

  const save = useCallback(async () => {
    if (!client) { setError('Choisissez le client concerné avant d’enregistrer.'); return; }
    setSaving(true); setError(null);
    try {
      const saved = await saveCv({ id: record?.id, client_id: client.id, lang: data.lang, title: `CV — ${data.personal.full_name || client.full_name}`, data });
      setRecord(saved); setDirty(false);
      // job titles not in the list are suggested next time; a failure here must not block the CV
      rememberJobTitles([data.personal.title, ...data.experience.map((e) => e.role)]).catch(() => {});
      if (!record) navigate(`/cvs/${saved.id}`, { replace: true });
    } catch (e) { setError(e); }
    setSaving(false);
  }, [client, data, record, navigate]);

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  async function remove() {
    if (!confirm('Supprimer définitivement ce CV ?')) return;
    try { await deleteCv(record.id); navigate('/cvs'); } catch (e) { setError(e); }
  }

  if (!data) return <div className="px-5 py-8"><ErrorNote error={error} />{!error && <Spinner />}</div>;
  const t = CV_TEXT[data.lang];
  const p = data.personal;
  const fileName = `CV ${p.full_name || ''}`.trim();
  const dir = data.lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="flex min-h-screen flex-col">
      <div className="no-print sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <Link to="/cvs" className="text-sm text-slate-500 hover:text-brand">← CV</Link>
        <h1 className="min-w-0 flex-1 truncate font-semibold text-ink" dir="auto">{p.full_name || 'Nouveau CV'}</h1>
        <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm">
          {Object.entries(LANG_NAMES).map(([v, label]) => (
            <button key={v} type="button" onClick={() => patch({ lang: v })} className={`px-3 py-1.5 ${data.lang === v ? 'bg-brand text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</button>
          ))}
        </div>
        <select aria-label="Modèle de CV" value={data.template || 'simple'} onChange={(e) => patch({ template: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">
          {Object.entries(CV_TEMPLATES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <div className={`flex items-center gap-1.5 ${FIXED_COLOURS.includes(data.template) ? 'hidden' : ''}`}>
          {ACCENTS.map((c) => (
            <button key={c} type="button" onClick={() => patch({ color: c })} style={{ background: c }} className={`h-6 w-6 rounded-full ${data.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} aria-label={`Couleur ${c}`} />
          ))}
          <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-slate-400" title="Autre couleur">
            <input type="color" value={data.color} onChange={(e) => patch({ color: e.target.value })} className="absolute -inset-2 h-10 w-10 cursor-pointer opacity-0" />
            <span className="flex h-full items-center justify-center text-xs text-slate-500">+</span>
          </label>
        </div>
        <div className="w-60"><ClientPicker value={client?.id} onChange={chooseClient} placeholder="Client concerné…" /></div>
        <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : dirty || !record ? 'Enregistrer' : 'Enregistré ✓'}</Button>
        <Button onClick={() => printDocument(fileName)}>Imprimer</Button>
        <Button onClick={() => printDocument(fileName)} title="Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF »">PDF</Button>
        {record && <Button variant="ghost" className="text-red-600" onClick={remove}>Supprimer</Button>}
      </div>
      {error && <div className="px-5 pt-4"><ErrorNote error={error} /></div>}
      <div className="grid flex-1 gap-5 p-5 lg:grid-cols-[minmax(340px,440px)_1fr]">
        <div className="no-print space-y-4 lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto lg:pe-1" dir={dir}>
          <Section title={t.personal}>
            <div className="flex items-center gap-3">
              {p.photo ? <img src={p.photo} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-slate-100" />}
              <div className="space-y-1 text-sm">
                <label className="cursor-pointer font-medium text-brand hover:underline">
                  {p.photo ? 'Changer la photo' : 'Ajouter une photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) setPhotoFile(f); }} />
                </label>
                {p.photo && <button type="button" onClick={() => patch({ personal: { ...p, photo: '' } })} className="block text-xs text-slate-500 hover:text-red-600">Retirer la photo</button>}
              </div>
            </div>
            <Field label="Nom complet"><Input value={p.full_name} onChange={setP('full_name')} /></Field>
            <Field label="Titre / poste recherché"><JobTitleInput value={p.title} onChange={(title) => patch({ personal: { ...p, title } })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Téléphone"><Input dir="ltr" value={p.phone} onChange={setP('phone')} /></Field>
              <Field label="E-mail"><Input dir="ltr" value={p.email} onChange={setP('email')} /></Field>
            </div>
            <Field label="Adresse"><Input value={p.address} onChange={setP('address')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.born}><DateInput placeholder="JJ/MM/AAAA" value={p.birth_date} onChange={(birth_date) => patch({ personal: { ...p, birth_date } })} /></Field>
              <Field label={t.birthplace}><Input value={p.birth_place || ''} onChange={setP('birth_place')} /></Field>
              <Field label={t.nationality}>
                {data.lang === 'fr' ? <NationalityInput value={p.nationality} gender={genderOf(p)} onChange={(nationality) => patch({ personal: { ...p, nationality } })} /> : <Input value={p.nationality} onChange={setP('nationality')} />}
              </Field>
              <Field label="Sexe"><GenderChoice value={genderOf(p)} onChange={(gender) => patch({ personal: { ...p, gender, nationality: nationalityFor(p.nationality, gender) } })} /></Field>
              <Field label={t.marital}>
                <Select value={p.marital} onChange={setP('marital')}>
                  <option value="">—</option>
                  {[...t.maritals, ...(p.marital && !t.maritals.includes(p.marital) ? [p.marital] : [])].map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
            </div>
            <Field label={t.license}>
              <LicencePicker value={p.licences || parseLicence(p.license)} onChange={(licences) => patch({ personal: { ...p, licences, license: licenceText(licences) } })} />
            </Field>
          </Section>
          <Section title={t.profile}>
            <Textarea rows={4} value={data.profile} onChange={(e) => patch({ profile: e.target.value })} placeholder="Quelques lignes de présentation" />
          </Section>
          <Section title={t.experience}>
            <ListEditor
              items={data.experience} onChange={(experience) => patch({ experience })} make={blankExp} addLabel="+ Ajouter une expérience"
              render={(e, up) => (
                <div className="grid grid-cols-2 gap-2">
                  <JobTitleInput className="col-span-2" placeholder="Poste" value={e.role} onChange={(role) => up({ role })} />
                  <Input placeholder="Entreprise" value={e.company} onChange={(ev) => up({ company: ev.target.value })} />
                  <Input placeholder="Ville" value={e.city} onChange={(ev) => up({ city: ev.target.value })} />
                  <DateInput allowYear placeholder="Début (ex : 2019)" value={e.start} onChange={(start) => up({ start })} warning="Année ou JJ/MM/AAAA" />
                  <DateInput allowYear placeholder="Fin" disabled={e.current} value={e.end} onChange={(end) => up({ end })} warning="Année ou JJ/MM/AAAA" />
                  <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={e.current} onChange={(ev) => up({ current: ev.target.checked })} /> {t.present}</label>
                  <textarea dir="auto" rows={3} className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Missions (une par ligne)" value={e.description} onChange={(ev) => up({ description: ev.target.value })} />
                </div>
              )}
            />
          </Section>
          <Section title={t.education}>
            <ListEditor
              items={data.education} onChange={(education) => patch({ education })} make={blankEdu} addLabel="+ Ajouter une formation"
              render={(e, up) => (
                <div className="grid grid-cols-2 gap-2">
                  {/* level + spécialité make the degree shown on the CV; older CVs keep their typed degree as the spécialité */}
                  <Select value={e.level || ''} onChange={(ev) => up({ level: ev.target.value, field: specialty(e), degree: degreeText(ev.target.value, specialty(e)) })}>
                    <option value="">Niveau d’études…</option>
                    {EDUCATION_LEVELS.map(([group, levels]) => <optgroup key={group} label={group}>{levels.map((lv) => <option key={lv} value={lv}>{lv}</option>)}</optgroup>)}
                  </Select>
                  <Input placeholder="Filière / spécialité (ex : Sciences Physiques)" value={specialty(e)} onChange={(ev) => up({ field: ev.target.value, degree: degreeText(e.level, ev.target.value) })} />
                  <Input placeholder="École / établissement" value={e.school} onChange={(ev) => up({ school: ev.target.value })} />
                  <Input placeholder="Ville" value={e.city} onChange={(ev) => up({ city: ev.target.value })} />
                  <DateInput allowYear placeholder="Début" value={e.start} onChange={(start) => up({ start })} warning="Année ou JJ/MM/AAAA" />
                  <DateInput allowYear placeholder="Fin" value={e.end} onChange={(end) => up({ end })} warning="Année ou JJ/MM/AAAA" />
                  <textarea dir="auto" rows={2} className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Détails (optionnel)" value={e.description} onChange={(ev) => up({ description: ev.target.value })} />
                </div>
              )}
            />
          </Section>
          <Section title={t.skills}>
            <Textarea rows={4} value={data.skills.join('\n')} onChange={(e) => patch({ skills: e.target.value.split('\n') })} placeholder="Une compétence par ligne" />
            {data.lang === 'fr' && <Suggestions options={SKILL_SUGGESTIONS} chosen={data.skills} onAdd={(x) => patch({ skills: [...data.skills.filter((s) => s.trim()), x] })} />}
          </Section>
          <Section title={t.languages}>
            <ListEditor
              items={data.languages} onChange={(languages) => patch({ languages })} make={() => ({ name: '', level: 'moyen' })} addLabel="+ Ajouter une langue"
              render={(l, up) => (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Langue" list="cv-languages" value={l.name} onChange={(ev) => up({ name: ev.target.value })} />
                  <Select value={l.level} onChange={(ev) => up({ level: ev.target.value })}>
                    {/* a CV made before keeps its CEFR level as an extra choice */}
                    {[...LEVELS, ...(LEVELS.includes(l.level) ? [] : [l.level])].map((lv) => <option key={lv} value={lv}>{t.levels[lv]}{LEVELS.includes(lv) ? '' : ` (${lv})`}</option>)}
                  </Select>
                </div>
              )}
            />
          </Section>
          <Section title={t.certificates}>
            <ListEditor
              items={data.certificates || []} onChange={(certificates) => patch({ certificates })} make={() => ({ name: '', issuer: '', year: '' })} addLabel="+ Ajouter un certificat"
              render={(c, up) => (
                <div className="grid grid-cols-2 gap-2">
                  <Input className="col-span-2" placeholder="Certificat" value={c.name} onChange={(ev) => up({ name: ev.target.value })} />
                  <Input placeholder="Organisme" value={c.issuer} onChange={(ev) => up({ issuer: ev.target.value })} />
                  <Input placeholder="Année" value={c.year} onChange={(ev) => up({ year: ev.target.value })} />
                </div>
              )}
            />
          </Section>
          <Section title={t.interests}>
            <Input value={data.interests.join(', ')} onChange={(e) => patch({ interests: e.target.value.split(',').map((s) => s.trimStart()) })} placeholder="Séparés par des virgules" />
            {data.lang === 'fr' && <Suggestions options={INTEREST_SUGGESTIONS} chosen={data.interests} onAdd={(x) => patch({ interests: [...data.interests.filter((s) => s.trim()), x] })} />}
          </Section>
          <Section title={t.references}>
            <ListEditor
              items={data.references || []} onChange={(references) => patch({ references })} make={() => ({ name: '', role: '', company: '', phone: '', email: '' })} addLabel="+ Ajouter une référence"
              render={(r, up) => (
                <div className="grid grid-cols-2 gap-2">
                  <Input className="col-span-2" placeholder="Nom" value={r.name} onChange={(ev) => up({ name: ev.target.value })} />
                  <Input placeholder="Fonction" value={r.role} onChange={(ev) => up({ role: ev.target.value })} />
                  <Input placeholder="Entreprise" value={r.company} onChange={(ev) => up({ company: ev.target.value })} />
                  <Input dir="ltr" placeholder="Téléphone" value={r.phone} onChange={(ev) => up({ phone: ev.target.value })} />
                  <Input dir="ltr" placeholder="E-mail" value={r.email} onChange={(ev) => up({ email: ev.target.value })} />
                </div>
              )}
            />
          </Section>
        </div>
        <div className="min-w-0">
          <FitToWidth pageWidthPx={A4_PX}><CvDocument data={data} onFit={setFit} /></FitToWidth>
          <datalist id="cv-languages">{['Arabe', 'Amazighe', 'Tamazight', 'Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien', 'Portugais', 'Turc', 'Chinois'].map((x) => <option key={x} value={x} />)}</datalist>
        </div>
      </div>
      {photoFile && <PhotoCropper file={photoFile} onClose={() => setPhotoFile(null)} onDone={(photo) => { patch({ personal: { ...p, photo } }); setPhotoFile(null); }} />}
      <PrintPortal css="@page { size: A4; margin: 0; }">
        <CvDocument data={data} fit={fit} />
      </PrintPortal>
    </div>
  );
}
