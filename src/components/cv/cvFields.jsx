// Form pieces for the CV editor: education level, job title autocomplete, driving licence.
import { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { inputClass } from '../ui';

// ---------- education level (Moroccan system, in order) ----------
export const EDUCATION_LEVELS = [
  ['Enseignement primaire', ['Niveau 1ère année primaire', 'Niveau 2ème année primaire', 'Niveau 3ème année primaire', 'Niveau 4ème année primaire', 'Niveau 5ème année primaire', 'Niveau 6ème année primaire', 'Certificat d’études primaires']],
  ['Enseignement collégial', ['Niveau 1ère année collège', 'Niveau 2ème année collège', 'Niveau 3ème année collège', 'Brevet d’enseignement collégial']],
  ['Enseignement secondaire qualifiant', ['Niveau Tronc commun', 'Niveau 1ère année Baccalauréat', 'Niveau 2ème année Baccalauréat', 'Baccalauréat']],
  ['Formation professionnelle (OFPPT)', ['Spécialisation', 'Qualification', 'Technicien', 'Technicien Spécialisé']],
  ['Enseignement supérieur', ['Bac+1', 'Bac+2 (DEUG / DUT / BTS / DTS)', 'Licence (Bac+3)', 'Licence Professionnelle (Bac+3)', 'Master (Bac+5)', 'Master Spécialisé (Bac+5)', 'Diplôme d’Ingénieur (Bac+5)', 'Doctorat (Bac+8)']],
];
// what the CV shows, e.g. "Baccalauréat – Sciences Physiques"
export const degreeText = (level, field) => [level, field?.trim()].filter(Boolean).join(' – ');

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
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase().trim();
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
// "masculine|feminine"; the CV shows the form matching Homme / Femme
const COMMON_NATIONALITIES = ['Marocain|Marocaine', 'Algérien|Algérienne', 'Tunisien|Tunisienne', 'Mauritanien|Mauritanienne', 'Sénégalais|Sénégalaise', 'Français|Française', 'Espagnol|Espagnole'];
const OTHER_NATIONALITIES = `Afghan|Afghane;Albanais|Albanaise;Allemand|Allemande;Américain|Américaine;Andorran|Andorrane;Angolais|Angolaise;Antiguais|Antiguaise;Argentin|Argentine;Arménien|Arménienne;Australien|Australienne;Autrichien|Autrichienne;Azerbaïdjanais|Azerbaïdjanaise;Bahaméen|Bahaméenne;Bahreïnien|Bahreïnienne;Bangladais|Bangladaise;Barbadien|Barbadienne;Belge|Belge;Bélizien|Bélizienne;Béninois|Béninoise;Bhoutanais|Bhoutanaise;Biélorusse|Biélorusse;Birman|Birmane;Bolivien|Bolivienne;Bosnien|Bosnienne;Botswanais|Botswanaise;Brésilien|Brésilienne;Britannique|Britannique;Brunéien|Brunéienne;Bulgare|Bulgare;Burkinabè|Burkinabè;Burundais|Burundaise;Cambodgien|Cambodgienne;Camerounais|Camerounaise;Canadien|Canadienne;Cap-Verdien|Cap-Verdienne;Centrafricain|Centrafricaine;Chilien|Chilienne;Chinois|Chinoise;Chypriote|Chypriote;Colombien|Colombienne;Comorien|Comorienne;Congolais|Congolaise;Costaricien|Costaricienne;Croate|Croate;Cubain|Cubaine;Danois|Danoise;Djiboutien|Djiboutienne;Dominicain|Dominicaine;Dominiquais|Dominiquaise;Égyptien|Égyptienne;Émirien|Émirienne;Équatorien|Équatorienne;Érythréen|Érythréenne;Estonien|Estonienne;Eswatinien|Eswatinienne;Éthiopien|Éthiopienne;Fidjien|Fidjienne;Finlandais|Finlandaise;Gabonais|Gabonaise;Gambien|Gambienne;Géorgien|Géorgienne;Ghanéen|Ghanéenne;Grec|Grecque;Grenadien|Grenadienne;Guatémaltèque|Guatémaltèque;Guinéen|Guinéenne;Bissau-Guinéen|Bissau-Guinéenne;Équato-Guinéen|Équato-Guinéenne;Guyanien|Guyanienne;Haïtien|Haïtienne;Hondurien|Hondurienne;Hongrois|Hongroise;Indien|Indienne;Indonésien|Indonésienne;Irakien|Irakienne;Iranien|Iranienne;Irlandais|Irlandaise;Islandais|Islandaise;Israélien|Israélienne;Italien|Italienne;Ivoirien|Ivoirienne;Jamaïcain|Jamaïcaine;Japonais|Japonaise;Jordanien|Jordanienne;Kazakh|Kazakhe;Kényan|Kényane;Kirghize|Kirghize;Kiribatien|Kiribatienne;Kosovar|Kosovare;Koweïtien|Koweïtienne;Laotien|Laotienne;Lésothien|Lésothienne;Letton|Lettone;Libanais|Libanaise;Libérien|Libérienne;Libyen|Libyenne;Liechtensteinois|Liechtensteinoise;Lituanien|Lituanienne;Luxembourgeois|Luxembourgeoise;Macédonien|Macédonienne;Malaisien|Malaisienne;Malawien|Malawienne;Maldivien|Maldivienne;Malgache|Malgache;Malien|Malienne;Maltais|Maltaise;Marshallais|Marshallaise;Mauricien|Mauricienne;Mexicain|Mexicaine;Micronésien|Micronésienne;Moldave|Moldave;Monégasque|Monégasque;Mongol|Mongole;Monténégrin|Monténégrine;Mozambicain|Mozambicaine;Namibien|Namibienne;Nauruan|Nauruane;Néerlandais|Néerlandaise;Néo-Zélandais|Néo-Zélandaise;Népalais|Népalaise;Nicaraguayen|Nicaraguayenne;Nigérian|Nigériane;Nigérien|Nigérienne;Nord-Coréen|Nord-Coréenne;Norvégien|Norvégienne;Omanais|Omanaise;Ougandais|Ougandaise;Ouzbek|Ouzbèke;Pakistanais|Pakistanaise;Palaosien|Palaosienne;Palestinien|Palestinienne;Panaméen|Panaméenne;Papouasien|Papouasienne;Paraguayen|Paraguayenne;Péruvien|Péruvienne;Philippin|Philippine;Polonais|Polonaise;Portugais|Portugaise;Qatarien|Qatarienne;Roumain|Roumaine;Russe|Russe;Rwandais|Rwandaise;Saint-Lucien|Saint-Lucienne;Salomonais|Salomonaise;Salvadorien|Salvadorienne;Samoan|Samoane;Santoméen|Santoméenne;Saoudien|Saoudienne;Serbe|Serbe;Seychellois|Seychelloise;Sierra-Léonais|Sierra-Léonaise;Singapourien|Singapourienne;Slovaque|Slovaque;Slovène|Slovène;Somalien|Somalienne;Soudanais|Soudanaise;Sud-Africain|Sud-Africaine;Sud-Coréen|Sud-Coréenne;Sud-Soudanais|Sud-Soudanaise;Sri-Lankais|Sri-Lankaise;Suédois|Suédoise;Suisse|Suisse;Surinamais|Surinamaise;Syrien|Syrienne;Tadjik|Tadjike;Tanzanien|Tanzanienne;Tchadien|Tchadienne;Tchèque|Tchèque;Thaïlandais|Thaïlandaise;Timorais|Timoraise;Togolais|Togolaise;Tonguien|Tonguienne;Trinidadien|Trinidadienne;Turc|Turque;Turkmène|Turkmène;Tuvaluan|Tuvaluane;Ukrainien|Ukrainienne;Uruguayen|Uruguayenne;Vanuatuan|Vanuatuane;Vénézuélien|Vénézuélienne;Vietnamien|Vietnamienne;Yéménite|Yéménite;Zambien|Zambienne;Zimbabwéen|Zimbabwéenne`.split(';');
export const NATIONALITIES = [...COMMON_NATIONALITIES, ...OTHER_NATIONALITIES.sort((x, y) => x.localeCompare(y, 'fr'))].map((n) => n.split('|'));
const findNationality = (value) => NATIONALITIES.find((n) => n.some((form) => norm(form) === norm(value || '')));
// older CVs have no Homme/Femme: read it from the nationality when the two forms differ
export const genderOf = (p) => p.gender || (findNationality(p.nationality)?.[1] === p.nationality && findNationality(p.nationality)?.[0] !== p.nationality ? 'f' : 'm');
export const nationalityFor = (value, gender) => { const n = findNationality(value); return n ? n[gender === 'f' ? 1 : 0] : value; };

// A list you can search by typing. What's typed only counts if it is in the list.
export function NationalityInput({ value, gender, onChange }) {
  const [draft, setDraft] = useState(null);
  const form = (n) => n[gender === 'f' ? 1 : 0];
  const q = norm(draft || '');
  const items = NATIONALITIES.filter((n) => !q || norm(n[0]).includes(q) || norm(n[1]).includes(q)).map(form);
  const leave = () => { if (draft !== null && findNationality(draft)) onChange(form(findNationality(draft))); setDraft(null); };
  return <SuggestInput value={draft ?? value} onType={setDraft} onChoose={(t) => { onChange(t); setDraft(null); }} onLeave={leave} items={items} />;
}

export function GenderChoice({ value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm" role="group" aria-label="Sexe">
      {[['m', 'Homme'], ['f', 'Femme']].map(([v, label]) => (
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
            {l && <input dir="ltr" inputMode="numeric" maxLength={4} placeholder="Année" aria-label={`Année du permis ${cat}`} value={l.year} onChange={(e) => set(cat, { year: e.target.value.replace(/\D/g, '') })} className="mt-1 w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs" />}
          </div>
        );
      })}
    </div>
  );
}

// ---------- quick picks for skills and interests (French CVs) ----------
export const SKILL_SUGGESTIONS = [
  'Travail en équipe', 'Sérieux', 'Ponctuel', 'Motivé', 'Dynamique', 'Sens de l’organisation', 'Sens des responsabilités',
  'Gestion du stress', 'Gestion du temps', 'Rigueur', 'Autonomie', 'Esprit d’initiative', 'Capacité d’adaptation', 'Polyvalence',
  'Honnêteté', 'Patience', 'Discrétion', 'Bonne présentation', 'Sens de l’écoute', 'Esprit d’équipe',
  'Accueil et conseil des clients', 'Communication et relation client', 'Techniques de vente', 'Gestion de la caisse',
  'Gestion des conflits', 'Respect des règles d’hygiène et de sécurité', 'Informatique et bureautique : Word, Excel',
  'Maîtrise d’Internet et des réseaux sociaux', 'Permis de conduire et véhicule',
];
export const INTEREST_SUGGESTIONS = ['Sport', 'Football', 'Lecture', 'Voyage', 'Musique', 'Cuisine', 'Informatique', 'Bénévolat', 'Dessin', 'Natation', 'Randonnée', 'Photographie', 'Cinéma', 'Jeux d’échecs', 'Couture', 'Jardinage'];

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
