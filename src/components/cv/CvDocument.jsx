// A4 CV templates: "simple" (Modern Simple), "professional", and three simple layouts copied
// from the office's Word CVs (diagonal, curves, framed). French, English and Arabic (mirrored
// for RTL). Empty sections are never shown.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './cv.css';
import './cv-office.css';
import './cv-fit.css';

export const CV_TEXT = {
  fr: {
    profile: 'Profil', experience: 'Expérience professionnelle', education: 'Formation', skills: 'Compétences', languages: 'Langues',
    certificates: 'Certificats', interests: 'Centres d’intérêt', references: 'Références', contact: 'Contact', personal: 'Informations',
    born: 'Né(e) le', birthplace: 'Lieu de naissance', address: 'Adresse', nationality: 'Nationalité', marital: 'Situation familiale', license: 'Permis de conduire', present: 'Aujourd’hui',
    levels: { A1: 'Débutant', A2: 'Élémentaire', B1: 'Intermédiaire', B2: 'Intermédiaire avancé', C1: 'Avancé', C2: 'Maîtrise', native: 'Langue maternelle', debutant: 'Débutant', moyen: 'Moyen', bien: 'Bien', tres_bien: 'Très bien', courant: 'Courant' },
    maritals: ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'],
  },
  en: {
    profile: 'Profile', experience: 'Work experience', education: 'Education', skills: 'Skills', languages: 'Languages',
    certificates: 'Certificates', interests: 'Interests', references: 'References', contact: 'Contact', personal: 'Personal details',
    born: 'Date of birth', birthplace: 'Place of birth', address: 'Address', nationality: 'Nationality', marital: 'Marital status', license: 'Driving licence', present: 'Present',
    levels: { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper intermediate', C1: 'Advanced', C2: 'Proficient', native: 'Native', debutant: 'Beginner', moyen: 'Intermediate', bien: 'Good', tres_bien: 'Very good', courant: 'Fluent' },
    maritals: ['Single', 'Married', 'Divorced', 'Widowed'],
  },
  ar: {
    profile: 'نبذة شخصية', experience: 'الخبرة المهنية', education: 'الدراسة والتكوين', skills: 'المهارات', languages: 'اللغات',
    certificates: 'الشهادات', interests: 'الاهتمامات', references: 'المراجع', contact: 'معلومات الاتصال', personal: 'معلومات شخصية',
    born: 'تاريخ الازدياد', birthplace: 'مكان الازدياد', address: 'العنوان', nationality: 'الجنسية', marital: 'الحالة العائلية', license: 'رخصة السياقة', present: 'إلى الآن',
    levels: { A1: 'مبتدئ', A2: 'أساسي', B1: 'متوسط', B2: 'فوق المتوسط', C1: 'متقدم', C2: 'متمكن', native: 'اللغة الأم', debutant: 'مبتدئ', moyen: 'متوسط', bien: 'جيد', tres_bien: 'جيد جدا', courant: 'بطلاقة' },
    maritals: ['أعزب / عزباء', 'متزوج(ة)', 'مطلق(ة)', 'أرمل(ة)'],
  },
};
// the levels offered in the form; CVs made before keep their CEFR level (A1…C2)
export const LEVELS = ['native', 'debutant', 'moyen', 'bien', 'tres_bien', 'courant'];
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_PCT = { debutant: 20, A1: 17, A2: 33, moyen: 45, B1: 50, bien: 62, B2: 67, tres_bien: 78, C1: 83, courant: 90, C2: 100, native: 100 };
export const ACCENTS = ['#1e3a5f', '#0f766e', '#7c3aed', '#be123c', '#c2410c', '#334155'];
export const CV_TEMPLATES = { essentiel: 'Essential (side column)', horizon: 'Horizon', simple: 'Modern Simple', professional: 'Professional', diagonal: 'Blue diagonal', curves: 'Blue-grey curves', framed: 'Classic framed' };
// these copy a Word CV's own colours, so the accent picker doesn't apply
export const FIXED_COLOURS = ['diagonal', 'curves', 'framed'];

const ICONS = {
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
};
const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cv-icon">
    <path d={d} />
  </svg>
);

const lines = (text) => (text || '').split('\n').map((l) => l.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
const period = (e, t) => [e.start, e.current ? t.present : e.end].filter(Boolean).join(' – ');
const levelPct = (lv) => LEVEL_PCT[lv] ?? 50;
const levelText = (lv, t) => `${t.levels[lv] || ''}${CEFR.includes(lv) ? ` · ${lv}` : ''}`;

function Description({ text }) {
  const items = lines(text);
  if (!items.length) return null;
  if (items.length === 1) return <p className="cv-desc">{items[0]}</p>;
  return <ul className="cv-bullets">{items.map((l, i) => <li key={i}>{l}</li>)}</ul>;
}

// Only what was filled in, so every template hides empty sections the same way.
function clean(data) {
  const has = (...v) => v.some((x) => x && String(x).trim());
  return {
    p: data.personal || {},
    profile: (data.profile || '').trim(),
    exp: (data.experience || []).filter((e) => has(e.role, e.company)),
    edu: (data.education || []).filter((e) => has(e.degree, e.school)),
    skills: (data.skills || []).map((s) => s.trim()).filter(Boolean),
    langs: (data.languages || []).filter((l) => has(l.name)),
    certs: (data.certificates || []).filter((c) => has(c.name)),
    interests: (data.interests || []).map((s) => s.trim()).filter(Boolean),
    refs: (data.references || []).filter((r) => has(r.name)),
  };
}

function Entries({ items, title, sub }) {
  return items.map((e, i) => (
    <article key={i} className="cv-entry">
      <div className="cv-entry-head">
        <h4>{title(e)}</h4>
        <span className="cv-when">{e._period}</span>
      </div>
      {sub(e) && <div className="cv-where">{sub(e)}</div>}
      <Description text={e.description} />
    </article>
  ));
}

function MainSections({ c, t }) {
  const exp = c.exp.map((e) => ({ ...e, _period: period(e, t) }));
  const edu = c.edu.map((e) => ({ ...e, _period: period(e, t) }));
  const place = (org, city) => [org, city].filter(Boolean).join(' · ');
  return (
    <>
      {c.profile && <section><h3>{t.profile}</h3><p className="cv-desc">{c.profile}</p></section>}
      {exp.length > 0 && <section><h3>{t.experience}</h3><Entries items={exp} title={(e) => e.role || e.company} sub={(e) => place(e.role ? e.company : '', e.city)} /></section>}
      {edu.length > 0 && <section><h3>{t.education}</h3><Entries items={edu} title={(e) => e.degree || e.school} sub={(e) => place(e.degree ? e.school : '', e.city)} /></section>}
    </>
  );
}

function Certificates({ c, t }) {
  if (!c.certs.length) return null;
  return (
    <section>
      <h3>{t.certificates}</h3>
      {c.certs.map((x, i) => (
        <div key={i} className="cv-cert"><strong>{x.name}</strong><span>{[x.issuer, x.year].filter(Boolean).join(' · ')}</span></div>
      ))}
    </section>
  );
}

function References({ c, t }) {
  if (!c.refs.length) return null;
  return (
    <section>
      <h3>{t.references}</h3>
      <div className="cv-refs">
        {c.refs.map((r, i) => (
          <div key={i} className="cv-ref">
            <strong>{r.name}</strong>
            {(r.role || r.company) && <span>{[r.role, r.company].filter(Boolean).join(' · ')}</span>}
            {r.phone && <bdi dir="ltr">{r.phone}</bdi>}
            {r.email && <bdi dir="ltr">{r.email}</bdi>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Contact({ p }) {
  return (
    <>
      {p.phone && <div className="cv-contact"><Icon d={ICONS.phone} /><bdi dir="ltr">{p.phone}</bdi></div>}
      {p.email && <div className="cv-contact"><Icon d={ICONS.mail} /><bdi dir="ltr">{p.email}</bdi></div>}
      {p.address && <div className="cv-contact"><Icon d={ICONS.pin} /><span>{p.address}</span></div>}
    </>
  );
}

const details = (p, t) => [[t.born, p.birth_date], [t.birthplace, p.birth_place], [t.nationality, p.nationality], [t.marital, p.marital], [t.license, p.license]].filter(([, v]) => v);

function Simple({ c, t }) {
  const { p } = c;
  const facts = details(p, t);
  const side = c.skills.length || c.langs.length || c.certs.length || c.interests.length || facts.length;
  return (
    <>
      <header className="cvs-header">
        <div className="cvs-id">
          {p.photo && <img src={p.photo} alt="" className="cvs-photo" />}
          <div>
            <h1>{p.full_name || ' '}</h1>
            {p.title && <div className="cvs-title">{p.title}</div>}
          </div>
        </div>
        {(p.phone || p.email || p.address) && <div className="cvs-contacts"><Contact p={p} /></div>}
      </header>
      <div className={side ? 'cvs-body' : 'cvs-body cvs-single'}>
        <main className="cvs-main">
          <MainSections c={c} t={t} />
          <References c={c} t={t} />
        </main>
        {side ? (
          <aside className="cvs-side">
            {c.skills.length > 0 && <section><h3>{t.skills}</h3><ul className="cvs-tags">{c.skills.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
            {c.langs.length > 0 && (
              <section>
                <h3>{t.languages}</h3>
                {c.langs.map((l, i) => (
                  <div key={i} className="cv-lang">
                    <div className="cv-lang-row"><strong>{l.name}</strong><span>{levelText(l.level, t)}</span></div>
                    <div className="cv-bar"><i style={{ width: `${levelPct(l.level)}%` }} /></div>
                  </div>
                ))}
              </section>
            )}
            <Certificates c={c} t={t} />
            {facts.length > 0 && <section><h3>{t.personal}</h3>{facts.map(([k, v]) => <div key={k} className="cv-fact"><span>{k}</span><strong>{v}</strong></div>)}</section>}
            {c.interests.length > 0 && <section><h3>{t.interests}</h3><p className="cv-desc">{c.interests.join(' · ')}</p></section>}
          </aside>
        ) : null}
      </div>
    </>
  );
}

function Professional({ c, t }) {
  const { p } = c;
  const facts = details(p, t);
  return (
    <>
      <aside className="cvp-side">
        {p.photo ? <img src={p.photo} alt="" className="cvp-photo" /> : <div className="cvp-monogram">{(p.full_name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}</div>}
        {(p.phone || p.email || p.address) && <section><h3>{t.contact}</h3><Contact p={p} /></section>}
        {facts.length > 0 && <section><h3>{t.personal}</h3>{facts.map(([k, v]) => <div key={k} className="cv-fact"><span>{k}</span><strong>{v}</strong></div>)}</section>}
        {c.skills.length > 0 && <section><h3>{t.skills}</h3><ul className="cvp-skills">{c.skills.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
        {c.langs.length > 0 && (
          <section>
            <h3>{t.languages}</h3>
            {c.langs.map((l, i) => (
              <div key={i} className="cv-lang">
                <div className="cv-lang-row"><strong>{l.name}</strong><span>{levelText(l.level, t)}</span></div>
                <div className="cv-bar"><i style={{ width: `${levelPct(l.level)}%` }} /></div>
              </div>
            ))}
          </section>
        )}
        {c.interests.length > 0 && <section><h3>{t.interests}</h3><ul className="cvp-skills">{c.interests.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
      </aside>
      <main className="cvp-main">
        <header className="cvp-header">
          <h1>{p.full_name || ' '}</h1>
          {p.title && <div className="cvp-title">{p.title}</div>}
        </header>
        <MainSections c={c} t={t} />
        <Certificates c={c} t={t} />
        <References c={c} t={t} />
      </main>
    </>
  );
}

// ---------- the three layouts copied from the office's Word CVs ----------
// French headings exactly as written in those CVs; other languages use CV_TEXT.
const WORDING = {
  diagonal: { profile: 'Profil', education: 'Formation', experience: 'Experiences professionnelles', contact: 'Contact', personal: 'Informations professionnelles', skills: 'Compétences', languages: 'Langues', born: 'Date de naissance', marital: 'État civil' },
  curves: { profile: 'PROFIL', education: 'FORMATION', experience: 'EXPERIENCES PROFESSIONNELLES', skills: 'COMPETENCES', languages: 'Langues', interests: 'CENTRES D’INTÉRÊTS', certificates: 'CERTIFICATS', references: 'RÉFÉRENCES', born: 'Né le', marital: 'Situation familiale' },
  framed: { profile: 'Profile', education: 'Formation et Diplôme', experience: 'Expériences', skills: 'Compétences', languages: 'Langues', interests: 'Centre D’intérêt', born: 'Né le', marital: 'Situation familial' },
};
const words = (template, lang) => (lang === 'fr' ? { ...CV_TEXT.fr, ...WORDING[template] } : CV_TEXT[lang] || CV_TEXT.fr);
const join = (...v) => v.filter((x) => x && String(x).trim()).join(', ');
const when = (e, t) => (period(e, t) ? ` (${period(e, t)})` : '');
const mailLabel = (email) => (/@gmail\./i.test(email || '') ? 'Gmail' : 'E-mail');

// "Bleu diagonal": navy and light-blue diagonal header, round photo, grey sidebar, Cambria headings.
function Diagonal({ c, t }) {
  const { p } = c;
  const facts = details(p, t);
  const item = (title, org, city, period, desc, i) => (
    <article key={i} className="cvz-item">
      <h4>❖ {title}</h4>
      {(org || city || period) && <div className="cvz-sub"><b><i>{org}</i></b>{org && city ? ', ' : ''}<b>{city}</b>{period && <span className="cvz-when"> | {period}</span>}</div>}
      <Description text={desc} />
    </article>
  );
  return (
    <>
      <svg className="cvz-shapes" viewBox="0 0 595 220" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="291,0 595,0 595,146 212,101 212,47.5" fill="#e1e9f6" />
        <polygon points="0,0 291,0 0,175" fill="#1f3863" />
      </svg>
      {p.photo && <img src={p.photo} alt="" className="cvz-photo" />}
      <h1 className="cvz-name">{p.full_name || ' '}</h1>
      <aside className="cvz-side">
        {(p.phone || p.email || p.address) && <section><h3>{t.contact}</h3><Contact p={p} /></section>}
        {facts.length > 0 && <section><h3>{t.personal}</h3><ul className="cvz-facts">{facts.map(([k, v]) => <li key={k}>{k}<strong>{v}</strong></li>)}</ul></section>}
        {c.skills.length > 0 && <section><h3>{t.skills}</h3><ul className="cvz-skills">{c.skills.map((x, i) => <li key={i}>{x}<i /></li>)}</ul></section>}
        {c.langs.length > 0 && <section><h3>{t.languages}</h3>{c.langs.map((l, i) => <div key={i} className="cvz-lang"><span>{l.name}</span><i style={{ width: `${levelPct(l.level) * 0.78}pt` }} /></div>)}</section>}
      </aside>
      <main className="cvz-main">
        {p.title && <div className="cvz-title">{p.title}</div>}
        {c.profile && <section><h3>{t.profile}</h3><p className="cvz-profile">{c.profile}</p></section>}
        {c.edu.length > 0 && <section><h3>{t.education}</h3>{c.edu.map((e, i) => item(e.degree || e.school, e.degree ? e.school : '', e.city, period(e, t), e.description, i))}</section>}
        {c.exp.length > 0 && <section><h3>{t.experience}</h3>{c.exp.map((e, i) => item(e.role || e.company, e.role ? e.company : '', e.city, period(e, t), e.description, i))}</section>}
        {c.interests.length > 0 && <section><h3>{t.interests}</h3><ul>{c.interests.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
        {c.certs.length > 0 && <section><h3>{t.certificates}</h3><ul>{c.certs.map((x, i) => <li key={i}>{join(x.name, x.issuer, x.year)}</li>)}</ul></section>}
        {c.refs.length > 0 && <section><h3>{t.references}</h3><ul>{c.refs.map((r, i) => <li key={i}>{join(r.name, r.role, r.company, r.phone)}</li>)}</ul></section>}
      </main>
    </>
  );
}

// Smooth SVG path through points (Catmull-Rom), for the side curves.
function curve(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] || pts[i], pts[i], pts[i + 1], pts[i + 2] || pts[i + 1]];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}
// band centre lines measured on the Word CV, as [x, y] in points on an A4 page
const CURVES = {
  fill: [[0, 95], [22, 150], [36, 250], [34, 350], [26, 450], [13, 550], [0, 610]],
  inner: [[0, 40], [6, 60], [29.5, 150], [43, 250], [41.5, 350], [33, 450], [20.5, 550], [6, 650], [0, 680]],
  navy: [[38, 90], [44, 150], [54, 250], [52.5, 350], [45.5, 450], [34, 550], [26, 650], [21, 700]],
  outer: [[39.5, 0], [48.5, 60], [61, 150], [68.5, 250], [67, 350], [60.5, 450], [51, 550], [40.5, 650], [28.5, 750], [26, 842]],
};

// "Courbes bleu-gris": navy and grey curves down the left, centred navy name, grey title bars.
function Curves({ c, t }) {
  const { p } = c;
  const sec = (title, items) => items.length > 0 && <section><h3 className="cvm-bar">{title}</h3><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></section>;
  return (
    <>
      <svg className="cvm-curves" viewBox="0 0 80 842" preserveAspectRatio="none" aria-hidden="true">
        <path d={`${curve(CURVES.fill)} Z`} fill="#244060" />
        <path d={curve(CURVES.inner)} stroke="#7e7e7e" strokeWidth="14" fill="none" />
        <path d={curve(CURVES.navy)} stroke="#244060" strokeWidth="9" fill="none" />
        <path d={curve(CURVES.outer)} stroke="#7e7e7e" strokeWidth="21" fill="none" />
      </svg>
      <div className="cvm-body">
        <h1 className="cvm-name">{p.full_name || ' '}</h1>
        {p.title && <div className="cvm-title">{p.title}</div>}
        <div className="cvm-info">
          {p.marital && <div><b>{t.marital}</b> : {p.marital}</div>}
          {p.phone && <div>✆ <bdi dir="ltr">{p.phone}</bdi></div>}
          {p.email && <div><b>{mailLabel(p.email)}</b> : <bdi dir="ltr">{p.email}</bdi></div>}
          {p.birth_date && <div><b>{t.born} :</b> {p.birth_date}</div>}
          {p.birth_place && <div><b>{t.birthplace} :</b> {p.birth_place}</div>}
          {p.nationality && <div><b>{t.nationality} :</b> {p.nationality}</div>}
          {p.license && <div><b>{t.license} :</b> {p.license}</div>}
          {p.address && <div><b>{t.address} : {p.address}</b></div>}
        </div>
        {c.profile && <section><h3 className="cvm-bar">{t.profile}</h3><p className="cvm-profile">{c.profile}</p></section>}
        {sec(t.education, c.edu.map((e) => `${join(e.degree, e.school, e.city)}${when(e, t)}.`))}
        {sec(t.experience, c.exp.flatMap((e) => [`${join(e.role, e.company, e.city)}${when(e, t)}`, ...lines(e.description)]))}
        {sec(t.skills, c.skills)}
        {sec(t.languages, c.langs.map((l) => `${l.name} : ${t.levels[l.level] || ''}`))}
        {sec(t.interests, c.interests)}
        {sec(t.certificates, c.certs.map((x) => join(x.name, x.issuer, x.year)))}
        {sec(t.references, c.refs.map((r) => join(r.name, r.role, r.company, r.phone)))}
      </div>
    </>
  );
}

// "Classique encadré": black frame lines, dark-red italic name and titles over a navy rule, ✓ lists.
function Framed({ c, t }) {
  const { p } = c;
  const rows = [[t.born, p.birth_date], [t.birthplace, p.birth_place], ['GSM', p.phone, 'cva-gsm'], [mailLabel(p.email), p.email], [t.address, p.address], [t.marital, p.marital], [t.nationality, p.nationality], [t.license, p.license]].filter(([, v]) => v);
  const sec = (title, items) => items.length > 0 && <section><h3 className="cva-h">{title}</h3><ul className="cva-ticks">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></section>;
  return (
    <>
      <div className="cva-frame" aria-hidden="true" />
      <h1 className="cva-name">{p.full_name || ' '}</h1>
      <div className="cva-top">
        <table className="cva-info"><tbody>{rows.map(([k, v, cls]) => <tr key={k}><td>{k}</td><td>:</td><td className={cls}><bdi>{v}</bdi></td></tr>)}</tbody></table>
        {p.photo && <img src={p.photo} alt="" className="cva-photo" />}
      </div>
      {p.title && <div className="cva-title">{p.title}</div>}
      {c.profile && <section><h3 className="cva-profile-h">{t.profile}</h3><p className="cva-profile">{c.profile}</p></section>}
      {sec(t.education, c.edu.map((e) => `${join(e.degree, e.school, e.city)}${when(e, t)}`))}
      {sec(t.experience, c.exp.flatMap((e) => [`${join(e.role, e.company, e.city)}${when(e, t)}`, ...lines(e.description)]))}
      {sec(t.skills, c.skills)}
      {sec(t.languages, c.langs.map((l) => <><span className="cva-lang">{l.name}</span> : {t.levels[l.level] || ''}</>))}
      {sec(t.interests, c.interests)}
      {sec(t.certificates, c.certs.map((x) => join(x.name, x.issuer, x.year)))}
      {sec(t.references, c.refs.map((r) => join(r.name, r.role, r.company, r.phone)))}
    </>
  );
}

const OFFICE = { diagonal: Diagonal, curves: Curves, framed: Framed };

// ---------- "simple" templates for people with little experience: always one full A4 page ----------
const FIT_WORDING = { experience: 'Expériences professionnelles', personal: 'Informations personnelles', born: 'Date de naissance', interests: 'Centres d’intérêt', marital: 'Situation familiale' };
const fitWords = (lang) => (lang === 'fr' ? { ...CV_TEXT.fr, ...FIT_WORDING } : CV_TEXT[lang] || CV_TEXT.fr);
const personalRows = (p, t) => [[t.born, p.birth_date], [t.birthplace, p.birth_place], [t.marital, p.marital], [t.nationality, p.nationality], [t.license, p.license]].filter(([, v]) => v);
const contactRows = (p, t) => [['GSM', p.phone, 'ltr'], ['E-mail', p.email, 'ltr'], [t.address, p.address]].filter(([, v]) => v);
const Dots = ({ lv }) => <span className="cvn-dots" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= Math.round(levelPct(lv) / 20) ? 'on' : ''} />)}</span>;

function FitEntries({ items, t, title, sub }) {
  return items.map((e, i) => (
    <article key={i} className="cvn-entry">
      <div className="cvn-when">{period(e, t)}</div>
      <div>
        <h4>{title(e)}</h4>
        {sub(e) && <div className="cvn-where">{sub(e)}</div>}
        <Description text={e.description} />
      </div>
    </article>
  ));
}
const place = (org, city) => [org, city].filter(Boolean).join(' · ');
const EduExp = ({ c, t }) => (
  <>
    {c.edu.length > 0 && <section><h3>{t.education}</h3><FitEntries items={c.edu} t={t} title={(e) => e.degree || e.school} sub={(e) => place(e.degree ? e.school : '', e.city)} /></section>}
    {c.exp.length > 0 && <section><h3>{t.experience}</h3><FitEntries items={c.exp} t={t} title={(e) => e.role || e.company} sub={(e) => place(e.role ? e.company : '', e.city)} /></section>}
  </>
);
const MoreSections = ({ c, t }) => (
  <>
    {c.certs.length > 0 && <section><h3>{t.certificates}</h3><ul className="cvn-ticks">{c.certs.map((x, i) => <li key={i}>{join(x.name, x.issuer, x.year)}</li>)}</ul></section>}
    {c.refs.length > 0 && <section><h3>{t.references}</h3><ul className="cvn-ticks">{c.refs.map((r, i) => <li key={i}>{join(r.name, r.role, r.company)} {r.phone && <bdi dir="ltr">{r.phone}</bdi>}</li>)}</ul></section>}
  </>
);
const initials = (name) => (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// "Essentiel": tinted side column (photo, contact, personal info, languages, skills), main column for the rest.
function Essentiel({ c, t }) {
  const { p } = c;
  const rows = personalRows(p, t);
  const contact = contactRows(p, t);
  return (
    <div className="cvn-wrap cvn-cols">
      <aside className="cvn-side">
        {p.photo ? <img src={p.photo} alt="" className="cvn-photo" /> : p.full_name && <div className="cvn-photo cvn-initials">{initials(p.full_name)}</div>}
        {contact.length > 0 && <section><h3>{t.contact}</h3>{contact.map(([k, v, dir]) => <div key={k} className="cvn-row"><span>{k}</span><bdi dir={dir}>{v}</bdi></div>)}</section>}
        {rows.length > 0 && <section><h3>{t.personal}</h3>{rows.map(([k, v]) => <div key={k} className="cvn-row"><span>{k}</span><strong>{v}</strong></div>)}</section>}
        {c.langs.length > 0 && <section><h3>{t.languages}</h3>{c.langs.map((l, i) => <div key={i} className="cvn-lang"><div><strong>{l.name}</strong><small>{t.levels[l.level]}</small></div><Dots lv={l.level} /></div>)}</section>}
        {c.skills.length > 0 && <section><h3>{t.skills}</h3><ul className="cvn-ticks">{c.skills.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
      </aside>
      <main className="cvn-main">
        <header className="cvn-head">
          <h1>{p.full_name || ' '}</h1>
          {p.title && <div className="cvn-title">{p.title}</div>}
        </header>
        {c.profile && <section><h3>{t.profile}</h3><p className="cvn-profile">{c.profile}</p></section>}
        <EduExp c={c} t={t} />
        {c.interests.length > 0 && <section><h3>{t.interests}</h3><ul className="cvn-chips">{c.interests.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
        <MoreSections c={c} t={t} />
      </main>
    </div>
  );
}

// "Horizon": one column; header with photo, a grid of personal details, then skills, languages and interests side by side.
function Horizon({ c, t }) {
  const { p } = c;
  const rows = [...contactRows(p, t), ...personalRows(p, t)];
  const trio = [c.skills.length > 0, c.langs.length > 0, c.interests.length > 0].filter(Boolean).length;
  return (
    <div className="cvn-wrap cvh">
      <header className="cvh-head">
        <div>
          <h1>{p.full_name || ' '}</h1>
          {p.title && <div className="cvn-title">{p.title}</div>}
        </div>
        {p.photo && <img src={p.photo} alt="" className="cvh-photo" />}
      </header>
      {rows.length > 0 && <div className="cvh-info">{rows.map(([k, v, dir]) => <div key={k}><span>{k}</span><bdi dir={dir}>{v}</bdi></div>)}</div>}
      {c.profile && <section><h3>{t.profile}</h3><p className="cvn-profile">{c.profile}</p></section>}
      <EduExp c={c} t={t} />
      {trio > 0 && (
        <div className="cvh-trio" style={{ gridTemplateColumns: `repeat(${trio}, 1fr)` }}>
          {c.skills.length > 0 && <section><h3>{t.skills}</h3><ul className="cvn-ticks">{c.skills.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
          {c.langs.length > 0 && <section><h3>{t.languages}</h3>{c.langs.map((l, i) => <div key={i} className="cvh-lang"><div><strong>{l.name}</strong><small>{t.levels[l.level]}</small></div><div className="cv-bar"><i style={{ width: `${levelPct(l.level)}%` }} /></div></div>)}</section>}
          {c.interests.length > 0 && <section><h3>{t.interests}</h3><ul className="cvn-chips">{c.interests.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
        </div>
      )}
      <MoreSections c={c} t={t} />
    </div>
  );
}

const FIT = { essentiel: Essentiel, horizon: Horizon };
// [font size, spacing] from roomiest to tightest; the roomiest one that still fits one A4 page wins
export const FIT_STEPS = [[1.2, 2.6], [1.17, 2.35], [1.14, 2.1], [1.12, 1.9], [1.1, 1.7], [1.08, 1.55], [1.06, 1.4], [1.04, 1.27], [1.02, 1.13], [1, 1], [0.97, 0.9], [0.94, 0.82], [0.91, 0.74], [0.88, 0.67], [0.85, 0.6], [0.82, 0.55]];
const fitVars = (i) => ({ '--fs': FIT_STEPS[i][0], '--sp': FIT_STEPS[i][1] });

// The fit is measured on the visible preview and handed to the hidden print copy as { step, main }:
// step = font/spacing level for the page, main = extra spacing so the main column reaches the side column's end.
function Fitted({ data, fit, onFit }) {
  const page = useRef(null);
  const [measured, setMeasured] = useState({ step: 9, main: null });
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => { document.fonts?.ready.then(() => setFontsReady(true)); }, []);
  const result = fit || measured;
  useLayoutEffect(() => {
    const el = page.current;
    const main = el?.querySelector('.cvn-main');
    if (fit) { main?.style.setProperty('--msp', fit.main ?? ''); return; }
    if (!el?.offsetHeight) return; // hidden (the print copy without a measured fit yet)
    const content = el.firstElementChild;
    main?.style.removeProperty('--msp');
    // A4 height from the page's own width, so the preview's zoom doesn't matter (the page itself grows with its content)
    const a4 = (el.offsetWidth * 297) / 210 - 2;
    const fits = (i) => { Object.entries(fitVars(i)).forEach(([k, v]) => el.style.setProperty(k, v)); return content.offsetHeight <= a4; };
    let lo = 0, hi = FIT_STEPS.length - 1;
    if (fits(hi)) while (lo < hi) { const mid = (lo + hi) >> 1; if (fits(mid)) hi = mid; else lo = mid + 1; }
    else lo = hi; // too much text even at the tightest step: it runs onto a second page
    fits(lo);
    // two columns: open up the shorter main column's spacing (never its text size) to line up with the side
    let mainSp = null;
    const side = el.querySelector('.cvn-side');
    if (main && side && main.offsetHeight < side.offsetHeight - 4) {
      const base = FIT_STEPS[lo][1];
      let a = base, b = base * 2.5; // capped so a nearly empty main column doesn't spread its few sections down the page
      for (let k = 0; k < 14; k++) { const m = (a + b) / 2; main.style.setProperty('--msp', m); if (main.offsetHeight <= side.offsetHeight) a = m; else b = m; }
      mainSp = String(Math.round(a * 1000) / 1000);
      main.style.setProperty('--msp', mainSp);
    }
    const next = { step: lo, main: mainSp };
    setMeasured(next); onFit?.(next);
  }, [data, fit, onFit, fontsReady]);
  const Layout = FIT[data.template];
  const ar = data.lang === 'ar';
  return (
    <div ref={page} className={`cv-page cvn cvn-${data.template} ${ar ? 'cv-ar' : ''}`} dir={ar ? 'rtl' : 'ltr'} style={{ '--accent': data.color || ACCENTS[0], ...fitVars(result.step) }}>
      <Layout c={clean(data)} t={fitWords(data.lang)} />
    </div>
  );
}

export default function CvDocument({ data, fit, onFit }) {
  if (FIT[data.template]) return <Fitted data={data} fit={fit} onFit={onFit} />;
  const Office = OFFICE[data.template];
  if (Office) {
    const ar = data.lang === 'ar';
    return (
      <div className={`cv-page cvo cvo-${data.template} ${ar ? 'cv-ar' : ''}`} dir={ar ? 'rtl' : 'ltr'}>
        <Office c={clean(data)} t={words(data.template, data.lang)} />
      </div>
    );
  }
  const t = CV_TEXT[data.lang] || CV_TEXT.fr;
  const c = clean(data);
  const pro = data.template === 'professional';
  return (
    <div
      className={`cv-page ${pro ? 'cvp' : 'cvs'} ${data.lang === 'ar' ? 'cv-ar' : ''}`}
      dir={data.lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ '--accent': data.color || ACCENTS[0] }}
    >
      {pro ? <Professional c={c} t={t} /> : <Simple c={c} t={t} />}
    </div>
  );
}
