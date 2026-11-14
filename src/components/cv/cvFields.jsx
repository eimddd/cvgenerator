// Form pieces for the CV editor: job title autocomplete, nationality, driving licence, suggestions.
// The lists in each CV language live in cvLang.js.
import { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { inputClass } from '../ui';
import { genderFromNationality, nationalityIn, nationalityList, norm } from './cvLang';

export { EDUCATION, degreeText, SKILLS, INTERESTS, LANGUAGE_NAMES, switchCvLang } from './cvLang';

// ---------- job titles ----------
// Common job titles in Morocco, grouped under search words so "vend" also finds "Conseiller commercial".
const JOB_GROUPS = {
  'vente vendre commerce commercial magasin boutique': ['Vendeur', 'Vendeuse', 'Conseiller commercial', 'Conseillère commerciale', 'Commercial', 'Commerciale', 'Commercial terrain', 'Délégué commercial', 'Déléguée commerciale', 'Attaché commercial', 'Attachée commerciale', 'Chef de rayon', 'Chef de vente', 'Responsable commercial', 'Directeur commercial', 'Vendeur en boutique', 'Vendeuse en boutique', 'Conseiller de vente', 'Conseillère de vente', 'Animateur des ventes', 'Animatrice commerciale', 'Promoteur des ventes', 'Promotrice des ventes', 'Merchandiseur', 'Télévendeur', 'Télévendeuse', 'Représentant commercial', 'Responsable de magasin', 'Gérant de magasin', 'Gérante de magasin', 'Magasinier vendeur'],
  'caisse caissier supermarché grande surface': ['Caissier', 'Caissière', 'Hôte de caisse', 'Hôtesse de caisse', 'Employé de libre-service', 'Employée de libre-service', 'Mise en rayon', 'Chef de caisse'],
  'client accueil centre appel call center relation téléconseiller': ['Téléconseiller', 'Téléconseillère', 'Conseiller client', 'Conseillère clientèle', 'Chargé de clientèle', 'Chargée de clientèle', 'Agent d’accueil', 'Hôtesse d’accueil', 'Hôte d’accueil', 'Réceptionniste', 'Standardiste', 'Superviseur centre d’appels', 'Chargé du service après-vente', 'Agent du service client'],
  'administratif bureau secrétariat assistant': ['Secrétaire', 'Secrétaire de direction', 'Secrétaire médicale', 'Secrétaire juridique', 'Assistant administratif', 'Assistante administrative', 'Assistant de direction', 'Assistante de direction', 'Agent administratif', 'Agente administrative', 'Employé de bureau', 'Employée de bureau', 'Opérateur de saisie', 'Opératrice de saisie', 'Archiviste', 'Office manager', 'Assistant RH', 'Assistante RH', 'Chargé de recrutement', 'Responsable des ressources humaines', 'Gestionnaire de paie'],
  'comptabilité finance banque assurance gestion': ['Comptable', 'Aide-comptable', 'Assistant comptable', 'Assistante comptable', 'Chef comptable', 'Expert-comptable', 'Contrôleur de gestion', 'Auditeur', 'Auditrice', 'Trésorier', 'Gestionnaire', 'Agent de recouvrement', 'Chargé de recouvrement', 'Conseiller bancaire', 'Conseillère bancaire', 'Chargé de clientèle bancaire', 'Guichetier', 'Guichetière', 'Agent d’assurance', 'Courtier en assurance', 'Analyste financier', 'Directeur financier', 'Fiscaliste'],
  'enseignement école professeur éducation formation': ['Enseignant', 'Enseignante', 'Professeur', 'Professeure', 'Professeur de langue arabe', 'Professeur de français', 'Professeur d’anglais', 'Professeur de mathématiques', 'Professeur de physique-chimie', 'Professeur des sciences de la vie et de la terre', 'Professeur d’informatique', 'Instituteur', 'Institutrice', 'Éducateur', 'Éducatrice', 'Éducatrice de la petite enfance', 'Animateur', 'Animatrice', 'Formateur', 'Formatrice', 'Surveillant', 'Surveillante', 'Surveillant général', 'Directeur d’école', 'Directrice d’école', 'Assistante maternelle', 'Moniteur', 'Monitrice', 'Moniteur d’auto-école', 'Professeur particulier', 'Coach'],
  'santé médical hôpital clinique soins': ['Infirmier', 'Infirmière', 'Infirmier polyvalent', 'Aide-soignant', 'Aide-soignante', 'Sage-femme', 'Médecin', 'Médecin généraliste', 'Pharmacien', 'Pharmacienne', 'Préparateur en pharmacie', 'Préparatrice en pharmacie', 'Vendeur en pharmacie', 'Technicien de laboratoire', 'Technicienne de laboratoire', 'Kinésithérapeute', 'Dentiste', 'Assistant dentaire', 'Assistante dentaire', 'Opticien', 'Ambulancier', 'Délégué médical', 'Déléguée médicale', 'Auxiliaire de vie', 'Garde-malade', 'Psychologue', 'Orthophoniste', 'Diététicien', 'Diététicienne', 'Radiologue', 'Technicien en radiologie'],
  'informatique digital web réseau développement technologie': ['Développeur web', 'Développeuse web', 'Développeur informatique', 'Développeur full stack', 'Développeur mobile', 'Technicien informatique', 'Technicien réseau', 'Administrateur réseau', 'Administrateur systèmes', 'Ingénieur informatique', 'Ingénieur logiciel', 'Analyste programmeur', 'Chef de projet informatique', 'Support informatique', 'Technicien helpdesk', 'Infographiste', 'Graphiste', 'Designer graphique', 'Web designer', 'Community manager', 'Chargé de marketing digital', 'Monteur vidéo', 'Photographe', 'Data analyst', 'Testeur logiciel'],
  'industrie usine production câblage automobile textile': ['Opérateur de production', 'Opératrice de production', 'Opérateur machine', 'Opératrice câblage', 'Opérateur câblage', 'Agent de production', 'Ouvrier', 'Ouvrière', 'Ouvrier spécialisé', 'Chef d’équipe', 'Chef de ligne', 'Contrôleur qualité', 'Contrôleuse qualité', 'Technicien qualité', 'Technicien de maintenance', 'Technicien méthodes', 'Ingénieur de production', 'Ingénieur qualité', 'Ingénieur industriel', 'Responsable de production', 'Couturier', 'Couturière', 'Piqueuse', 'Coupeur', 'Repasseur', 'Repasseuse', 'Conducteur de ligne', 'Régleur', 'Soudeur', 'Tourneur', 'Fraiseur', 'Chaudronnier', 'Ajusteur', 'Emballeur', 'Emballeuse'],
  'bâtiment chantier btp construction travaux': ['Maçon', 'Aide-maçon', 'Ouvrier de bâtiment', 'Manœuvre', 'Carreleur', 'Plâtrier', 'Peintre en bâtiment', 'Plombier', 'Électricien', 'Électricien de bâtiment', 'Menuisier', 'Menuisier aluminium', 'Ferronnier', 'Ferrailleur', 'Charpentier', 'Coffreur', 'Chef de chantier', 'Conducteur de travaux', 'Ingénieur génie civil', 'Technicien génie civil', 'Dessinateur', 'Dessinateur projeteur', 'Architecte', 'Topographe', 'Métreur', 'Grutier', 'Conducteur d’engins', 'Étancheur', 'Vitrier', 'Frigoriste', 'Technicien en climatisation'],
  'mécanique garage automobile voiture': ['Mécanicien', 'Mécanicien automobile', 'Mécanicien poids lourds', 'Électricien automobile', 'Tôlier', 'Carrossier', 'Peintre automobile', 'Vulcanisateur', 'Laveur de voitures', 'Réceptionnaire après-vente', 'Chef d’atelier', 'Technicien automobile', 'Diagnosticien automobile'],
  'transport logistique chauffeur livraison stock entrepôt': ['Chauffeur', 'Chauffeur poids lourds', 'Chauffeur livreur', 'Chauffeur de taxi', 'Chauffeur de bus', 'Chauffeur personnel', 'Livreur', 'Livreuse', 'Coursier', 'Magasinier', 'Magasinière', 'Cariste', 'Préparateur de commandes', 'Préparatrice de commandes', 'Gestionnaire de stock', 'Agent logistique', 'Responsable logistique', 'Agent de transit', 'Déclarant en douane', 'Transitaire', 'Agent d’exploitation', 'Dispatcheur', 'Manutentionnaire', 'Docker'],
  'hôtellerie restauration restaurant café hôtel cuisine tourisme': ['Serveur', 'Serveuse', 'Chef de rang', 'Maître d’hôtel', 'Barman', 'Barista', 'Cuisinier', 'Cuisinière', 'Chef cuisinier', 'Commis de cuisine', 'Aide-cuisinier', 'Plongeur', 'Pâtissier', 'Pâtissière', 'Boulanger', 'Boulangère', 'Boucher', 'Pizzaïolo', 'Réceptionniste d’hôtel', 'Femme de chambre', 'Valet de chambre', 'Gouvernante', 'Concierge', 'Bagagiste', 'Guide touristique', 'Agent de voyages', 'Agente de voyages', 'Gérant de café', 'Gérant de restaurant', 'Traiteur'],
  'sécurité gardiennage surveillance': ['Agent de sécurité', 'Agente de sécurité', 'Gardien', 'Gardien de nuit', 'Vigile', 'Agent de surveillance', 'Agent de prévention', 'Chef de poste sécurité', 'Maître-chien', 'Agent de sûreté aéroportuaire'],
  'nettoyage propreté ménage entretien maison': ['Agent de nettoyage', 'Agente de nettoyage', 'Agent d’entretien', 'Femme de ménage', 'Aide ménagère', 'Technicien de surface', 'Jardinier', 'Jardinière', 'Agent de propreté', 'Nounou', 'Baby-sitter', 'Cuisinière à domicile', 'Gouvernante de maison'],
  'agriculture ferme élevage agricole': ['Agriculteur', 'Agricultrice', 'Ouvrier agricole', 'Ouvrière agricole', 'Technicien agricole', 'Ingénieur agronome', 'Éleveur', 'Berger', 'Conducteur de tracteur', 'Arboriculteur', 'Cueilleur', 'Cueilleuse', 'Ouvrière de conditionnement', 'Vétérinaire', 'Technicien vétérinaire'],
  'beauté coiffure esthétique bien-être': ['Coiffeur', 'Coiffeuse', 'Esthéticienne', 'Maquilleuse', 'Prothésiste ongulaire', 'Masseur', 'Masseuse', 'Hammamiste', 'Conseillère en beauté'],
  'artisanat métier manuel': ['Artisan', 'Artisane', 'Tapissier', 'Ébéniste', 'Bijoutier', 'Cordonnier', 'Tailleur', 'Brodeuse', 'Tisserand', 'Potier', 'Zelligeur', 'Sculpteur sur bois', 'Électronicien', 'Réparateur de téléphones', 'Horloger', 'Imprimeur', 'Sérigraphe'],
  'juridique droit justice': ['Avocat', 'Avocate', 'Juriste', 'Notaire', 'Adoul', 'Clerc de notaire', 'Huissier de justice', 'Assistant juridique', 'Assistante juridique', 'Greffier', 'Conseiller juridique', 'Écrivain public'],
  'ingénieur technique électricité énergie': ['Ingénieur', 'Ingénieure', 'Ingénieur électrique', 'Ingénieur mécanique', 'Ingénieur électromécanique', 'Ingénieur des procédés', 'Ingénieur commercial', 'Technicien', 'Technicienne', 'Technicien électromécanique', 'Technicien électrique', 'Technicien en électronique', 'Technicien solaire', 'Électromécanicien', 'Automaticien', 'Dessinateur industriel'],
  'marketing communication média': ['Chargé de communication', 'Chargée de communication', 'Responsable marketing', 'Chef de produit', 'Assistant marketing', 'Journaliste', 'Rédacteur', 'Rédactrice', 'Traducteur', 'Traductrice', 'Interprète', 'Attaché de presse', 'Animateur radio', 'Chargé d’événementiel'],
  'direction management gérant responsable': ['Directeur', 'Directrice', 'Directeur général', 'Gérant', 'Gérante', 'Responsable d’agence', 'Chef d’agence', 'Responsable administratif et financier', 'Responsable des achats', 'Acheteur', 'Chef de projet', 'Coordinateur', 'Coordinatrice', 'Superviseur', 'Superviseuse', 'Manager', 'Entrepreneur', 'Auto-entrepreneur'],
  'stage débutant étudiant': ['Stagiaire', 'Étudiant', 'Étudiante', 'Apprenti', 'Apprentie', 'Jeune diplômé', 'Jeune diplômée'],
};
const BASE = Object.entries(JOB_GROUPS).flatMap(([tags, titles]) => titles.map((title) => ({ title, words: norm(title).split(/[\s-]+/), tags: tags.split(' ') })));
export const JOB_TITLE_COUNT = new Set(BASE.map((j) => j.title)).size;

// titles the office typed that weren't in the list (shared by everyone, kept in Supabase)
let custom = null;
const loadCustom = () => (custom ??= supabase.from('job_titles').select('title').limit(2000).then(({ data }) => (data || []).map((r) => r.title), () => []));

export async function rememberJobTitles(titles) {
  const known = new Set([...BASE.map((j) => norm(j.title)), ...(await loadCustom()).map(norm)]);
  const fresh = [...new Set(titles.map((t) => t?.trim()).filter((t) => t && t.length > 2 && !known.has(norm(t))))];
  if (!fresh.length) return;
  await supabase.from('job_titles').upsert(fresh.map((title) => ({ title })), { onConflict: 'title', ignoreDuplicates: true });
  custom = null; // reload next time, with these and other people's additions
}

export function suggestJobTitles(q, extra = []) {
  const n = norm(q);
  if (n.length < 2) return [];
  const all = [...BASE, ...extra.map((title) => ({ title, words: norm(title).split(/[\s-]+/), tags: [] }))];
  const score = (j) => {
    const t = norm(j.title);
    if (t === n) return -1;
    if (t.startsWith(n)) return 0;
    if (j.words.some((w) => w.startsWith(n))) return 1;
    if (t.includes(n)) return 2;
    if (j.tags.some((w) => norm(w).startsWith(n) || n.startsWith(norm(w).slice(0, 4)))) return 3;
    return 9;
  };
  const seen = new Set();
  // name matches shortest first; related jobs (search words) in the list's own order
  return all.map((j, i) => [score(j), j.title, i]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || (a[0] < 3 ? a[1].length - b[1].length : a[2] - b[2]))
    .map(([, t]) => t).filter((t) => !seen.has(t) && seen.add(t)).slice(0, 12);
}

// Text input with a list of suggestions (arrow keys + Enter, or click).
function SuggestInput({ value, onType, onChoose, onLeave, items, placeholder, className = '', onOpen }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const listId = useId();
  const box = useRef(null);
  const shown = open ? items : [];
  const choose = (t) => { onChoose(t); setOpen(false); };
  function onKeyDown(e) {
    if (!shown.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((hi + 1) % shown.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((hi - 1 + shown.length) % shown.length); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(shown[hi]); }
    else if (e.key === 'Escape') setOpen(false);
  }
  return (
    <div ref={box} className={`relative ${className}`} onBlur={(e) => { if (!box.current.contains(e.relatedTarget)) { setOpen(false); onLeave?.(); } }}>
      <input
        dir="auto" value={value || ''} placeholder={placeholder} className={inputClass} autoComplete="off"
        role="combobox" aria-expanded={shown.length > 0} aria-controls={listId} aria-autocomplete="list"
        onChange={(e) => { onType(e.target.value); setOpen(true); setHi(0); }} onFocus={() => { setOpen(true); onOpen?.(); }} onKeyDown={onKeyDown}
      />
      {shown.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {shown.map((t, i) => (
            <li key={t} role="option" aria-selected={i === hi}>
              <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(t)} onMouseEnter={() => setHi(i)}
                className={`block w-full px-3 py-1.5 text-start ${i === hi ? 'bg-brand-soft text-brand' : 'text-slate-700'}`}>{t}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function JobTitleInput({ value, onChange, placeholder, className = '' }) {
  const [extra, setExtra] = useState([]);
  useEffect(() => { loadCustom().then(setExtra); }, []);
  const items = suggestJobTitles(value || '', extra).filter((t) => t !== value);
  return <SuggestInput value={value} onType={onChange} onChoose={onChange} items={items} placeholder={placeholder} className={className} />;
}

// ---------- nationality ----------
export const genderOf = (p) => p.gender || genderFromNationality(p.nationality);
export const nationalityFor = (value, gender, lang = 'fr') => nationalityIn(value, lang, gender);

// A list in the CV's language you can search by typing. What's typed only counts if it is in the list.
export function NationalityInput({ value, gender, lang = 'fr', onChange }) {
  const [draft, setDraft] = useState(null);
  const form = (n) => n[gender === 'f' ? 1 : 0];
  const list = nationalityList(lang);
  const q = norm(draft || '');
  const items = list.filter((n) => !q || norm(n[0]).includes(q) || norm(n[1]).includes(q)).map(form);
  const match = (t) => list.find((n) => n.some((x) => norm(x) === norm(t)));
  const leave = () => { if (draft !== null && match(draft)) onChange(form(match(draft))); setDraft(null); };
  return <SuggestInput value={draft ?? value} onType={setDraft} onChoose={(t) => { onChange(t); setDraft(null); }} onLeave={leave} items={items} />;
}

export function GenderChoice({ value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm" role="group" aria-label="Gender">
      {[['m', 'Male'], ['f', 'Female']].map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`flex-1 px-3 py-2 ${value === v ? 'bg-brand text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</button>
      ))}
    </div>
  );
}

// ---------- driving licence ----------
export const LICENCE_CATEGORIES = ['A1', 'A', 'B', 'C', 'D', 'EB', 'EC', 'ED'];
// "B (2015), C (2019)": what every CV template prints after "Permis de conduire :"
export const licenceText = (list) => LICENCE_CATEGORIES.map((c) => list.find((l) => l.cat === c)).filter(Boolean).map((l) => (l.year?.trim() ? `${l.cat} (${l.year.trim()})` : l.cat)).join(', ');
// older CVs typed the licence freely ("B", "B (2015), C"): read the categories back
export const parseLicence = (s) => (s || '').split(/[,;/]|\bet\b/).map((x) => x.trim().match(/^(?:permis\s+)?(A1|A|B|C|D|EB|EC|ED)\b\s*(?:[(–-]\s*(\d{4})\)?)?/i)).filter(Boolean).map((m) => ({ cat: m[1].toUpperCase(), year: m[2] || '' }));

export function LicencePicker({ value, onChange }) {
  const set = (cat, patch) => {
    const has = value.find((l) => l.cat === cat);
    const next = patch === null ? value.filter((l) => l.cat !== cat) : has ? value.map((l) => (l.cat === cat ? { ...l, ...patch } : l)) : [...value, { cat, year: '', ...patch }];
    onChange(next);
  };
  return (
    <div className="grid grid-cols-4 gap-2">
      {LICENCE_CATEGORIES.map((cat) => {
        const l = value.find((x) => x.cat === cat);
        return (
          <div key={cat} className={`rounded-lg border px-2 py-1.5 ${l ? 'border-brand bg-brand-soft/60' : 'border-slate-200'}`}>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={!!l} onChange={(e) => set(cat, e.target.checked ? {} : null)} className="h-4 w-4 accent-brand" />{cat}
            </label>
            {l && <input dir="ltr" inputMode="numeric" maxLength={4} placeholder="Year" aria-label={`Year of licence ${cat}`} value={l.year} onChange={(e) => set(cat, { year: e.target.value.replace(/\D/g, '') })} className="mt-1 w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs" />}
          </div>
        );
      })}
    </div>
  );
}

// Click a suggestion to add it; already chosen ones are hidden.
export function Suggestions({ options, chosen, onAdd }) {
  const have = new Set(chosen.map((x) => norm(x)));
  const left = options.filter((o) => !have.has(norm(o)));
  if (!left.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
      {left.map((o) => (
        <button key={o} type="button" onClick={() => onAdd(o)} className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-brand hover:bg-brand-soft hover:text-brand">+ {o}</button>
      ))}
    </div>
  );
}
