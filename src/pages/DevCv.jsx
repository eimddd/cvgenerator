// Development-only preview of the CV template with sample data.
import { useState } from 'react';
import CvDocument, { CV_TEMPLATES } from '../components/cv/CvDocument';

const SAMPLE = {
  fr: {
    lang: 'fr', color: '#1e3a5f',
    personal: { full_name: 'Salma Benali', title: 'Assistante administrative', phone: '+212 6 12 34 56 78', email: 'salma.benali@example.com', address: 'Hay Al Massira, Fquih Ben Salah', birth_date: '12/03/1996', nationality: 'Marocaine', marital: 'Célibataire', license: 'B', birth_place: 'Fquih Ben Salah', photo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%2394a3b8"/><circle cx="5" cy="3.8" r="2" fill="%23e2e8f0"/><path d="M1.5 10c.5-2.6 1.8-3.8 3.5-3.8s3 1.2 3.5 3.8z" fill="%23e2e8f0"/></svg>' },
    profile: 'Assistante organisée avec cinq ans d’expérience en gestion de dossiers, accueil et suivi administratif.',
    experience: [
      { role: 'Assistante de direction', company: 'Cabinet Atlas Conseil', city: 'Béni Mellal', start: '2021', current: true, description: 'Gestion de l’agenda et des courriers\nPréparation des contrats et des factures\nAccueil des clients' },
      { role: 'Secrétaire', company: 'Notaire Me Idrissi', city: 'Fquih Ben Salah', start: '2018', end: '2021', description: 'Saisie et classement des actes' },
    ],
    education: [{ degree: 'Licence en gestion', school: 'Université Sultan Moulay Slimane', city: 'Béni Mellal', start: '2015', end: '2018' }],
    skills: ['Word, Excel', 'Rédaction administrative', 'Accueil', 'Classement'],
    languages: [{ name: 'Arabe', level: 'native' }, { name: 'Français', level: 'C1' }, { name: 'Anglais', level: 'B1' }],
    interests: ['Lecture', 'Bénévolat'],
    certificates: [{ name: 'Certificat bureautique avancée', issuer: 'OFPPT', year: '2020' }],
    references: [{ name: 'Karim Idrissi', role: 'Directeur', company: 'Atlas Conseil', phone: '+212 6 00 00 00 00' }],
  },
};
SAMPLE.ar = {
  ...SAMPLE.fr, lang: 'ar', color: '#0f5e59',
  personal: { ...SAMPLE.fr.personal, full_name: 'سلمى بنعلي', title: 'مساعدة إدارية', address: 'حي المسيرة، الفقيه بن صالح', nationality: 'مغربية', marital: 'عازبة', license: 'ب' },
  profile: 'مساعدة إدارية منظمة بخبرة خمس سنوات في تدبير الملفات والاستقبال والتتبع الإداري.',
  experience: [{ role: 'مساعدة المدير', company: 'مكتب أطلس للاستشارة', city: 'بني ملال', start: '2021', current: true, description: 'تدبير المواعيد والمراسلات\nإعداد العقود والفواتير' }],
  education: [{ degree: 'إجازة في التدبير', school: 'جامعة السلطان مولاي سليمان', city: 'بني ملال', start: '2015', end: '2018' }],
  skills: ['وورد وإكسل', 'التحرير الإداري', 'الاستقبال'],
  languages: [{ name: 'العربية', level: 'native' }, { name: 'الفرنسية', level: 'C1' }, { name: 'الإنجليزية', level: 'B1' }],
  interests: ['القراءة', 'العمل التطوعي'],
};

export default function DevCv() {
  const [lang, setLang] = useState('fr');
  const [template, setTemplate] = useState(new URLSearchParams(location.search).get('t') || 'simple');
  return (
    <div className="p-4">
      <div className="mb-3 flex gap-2">{['fr', 'ar'].map((l) => <button key={l} onClick={() => setLang(l)} className="rounded border px-2">{l}</button>)}{Object.keys(CV_TEMPLATES).map((x) => <button key={x} onClick={() => setTemplate(x)} className="rounded border px-2">{x}</button>)}</div>
      <div id="dev-page"><CvDocument data={{ ...SAMPLE[lang], template }} /></div>
    </div>
  );
}
