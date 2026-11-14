// Self-check for switching a CV's language: node scripts/check-cv-lang.mjs
import assert from 'node:assert/strict';
import { EDUCATION, INTERESTS, LANGUAGE_NAMES, NATIONALITY_COUNT, SKILLS, nationalityIn, nationalityList, switchCvLang } from '../src/components/cv/cvLang.js';

const maritals = { fr: ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'], en: ['Single', 'Married', 'Divorced', 'Widowed'], ar: ['أعزب / عزباء', 'متزوج(ة)', 'مطلق(ة)', 'أرمل(ة)'] };

// parallel lists must line up, or values would land on the wrong item
for (const lists of [SKILLS, INTERESTS, LANGUAGE_NAMES]) assert.equal(new Set(Object.values(lists).map((l) => l.length)).size, 1);
assert.deepEqual(EDUCATION.en.map(([, l]) => l.length), EDUCATION.fr.map(([, l]) => l.length));
assert.deepEqual(EDUCATION.ar.map(([, l]) => l.length), EDUCATION.fr.map(([, l]) => l.length));
for (const lang of ['fr', 'en', 'ar']) {
  const list = nationalityList(lang);
  assert.equal(list.length, NATIONALITY_COUNT);
  assert.equal(list[0][0], { fr: 'Marocain', en: 'Moroccan', ar: 'مغربي' }[lang]);
  assert.equal(new Set(list.map(([m]) => m)).size, list.length, `duplicate nationality in ${lang}`);
}
assert.equal(nationalityIn('Sénégalaise', 'ar', 'f'), 'سنغالية');
assert.equal(nationalityIn('كوري جنوبي', 'ar', 'f'), 'كورية جنوبية');
assert.equal(nationalityIn('مغربية', 'fr', 'f'), 'Marocaine');
assert.equal(nationalityIn('Martian', 'fr', 'm'), 'Martian');

const fr = {
  lang: 'fr',
  personal: { full_name: 'Salma Benali', gender: 'f', nationality: 'Marocaine', marital: 'Marié(e)', title: 'Assistante' },
  profile: 'Texte libre',
  education: [{ level: 'Baccalauréat', field: 'Sciences Physiques', degree: 'Baccalauréat – Sciences Physiques' }, { level: '', field: '', degree: 'Licence en gestion' }],
  languages: [{ name: 'Arabe', level: 'native' }, { name: 'Français', level: 'moyen' }, { name: 'Wolof', level: 'bien' }],
  skills: ['Travail en équipe', 'Soudure TIG'],
  interests: ['Lecture', 'Pêche'],
};
const ar = switchCvLang(fr, 'ar', maritals);
assert.equal(ar.lang, 'ar');
assert.equal(ar.personal.nationality, 'مغربية');
assert.equal(ar.personal.marital, 'متزوج(ة)');
assert.equal(ar.personal.title, 'Assistante'); // typed text stays
assert.equal(ar.profile, 'Texte libre');
assert.equal(ar.education[0].degree, 'الباكالوريا – Sciences Physiques');
assert.equal(ar.education[1].degree, 'Licence en gestion');
assert.deepEqual(ar.languages.map((l) => l.name), ['العربية', 'الفرنسية', 'Wolof']);
assert.deepEqual(ar.skills, ['العمل ضمن فريق', 'Soudure TIG']);
assert.deepEqual(ar.interests, ['القراءة', 'Pêche']);
const en = switchCvLang(ar, 'en', maritals);
assert.equal(en.personal.nationality, 'Moroccan');
assert.equal(en.education[0].level, 'Baccalaureate');
assert.deepEqual(switchCvLang(en, 'fr', maritals).personal, fr.personal); // a round trip gives back the original
console.log('cv language switch: all checks passed');
