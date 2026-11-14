// The fixed values a CV offers (nationalities, education levels, language names, skill and
// interest suggestions) in French, English and Arabic, kept in the same order so a value can
// follow the CV when its language is switched. Text the person typed is never touched.

// ---------- nationalities: "French masc.|French fem.|English|Arabic masc." ----------
// The Arabic feminine adds ة to every word ending in ي ("كوري جنوبي" → "كورية جنوبية").
const COMMON = `Marocain|Marocaine|Moroccan|مغربي;Algérien|Algérienne|Algerian|جزائري;Tunisien|Tunisienne|Tunisian|تونسي;Mauritanien|Mauritanienne|Mauritanian|موريتاني;Sénégalais|Sénégalaise|Senegalese|سنغالي;Français|Française|French|فرنسي;Espagnol|Espagnole|Spanish|إسباني`;
const OTHERS = `Afghan|Afghane|Afghan|أفغاني;Albanais|Albanaise|Albanian|ألباني;Allemand|Allemande|German|ألماني;Américain|Américaine|American|أمريكي;Andorran|Andorrane|Andorran|أندوري;Angolais|Angolaise|Angolan|أنغولي;Antiguais|Antiguaise|Antiguan|أنتيغي;Argentin|Argentine|Argentine|أرجنتيني;Arménien|Arménienne|Armenian|أرميني;Australien|Australienne|Australian|أسترالي;Autrichien|Autrichienne|Austrian|نمساوي;Azerbaïdjanais|Azerbaïdjanaise|Azerbaijani|أذربيجاني;Bahaméen|Bahaméenne|Bahamian|باهامي;Bahreïnien|Bahreïnienne|Bahraini|بحريني;Bangladais|Bangladaise|Bangladeshi|بنغلاديشي;Barbadien|Barbadienne|Barbadian|باربادوسي;Belge|Belge|Belgian|بلجيكي;Bélizien|Bélizienne|Belizean|بليزي;Béninois|Béninoise|Beninese|بنيني;Bhoutanais|Bhoutanaise|Bhutanese|بوتاني;Biélorusse|Biélorusse|Belarusian|بيلاروسي;Birman|Birmane|Burmese|ميانماري;Bolivien|Bolivienne|Bolivian|بوليفي;Bosnien|Bosnienne|Bosnian|بوسني;Botswanais|Botswanaise|Motswana|بوتسواني;Brésilien|Brésilienne|Brazilian|برازيلي;Britannique|Britannique|British|بريطاني;Brunéien|Brunéienne|Bruneian|بروناوي;Bulgare|Bulgare|Bulgarian|بلغاري;Burkinabè|Burkinabè|Burkinabe|بوركيني;Burundais|Burundaise|Burundian|بوروندي;Cambodgien|Cambodgienne|Cambodian|كمبودي;Camerounais|Camerounaise|Cameroonian|كاميروني;Canadien|Canadienne|Canadian|كندي;Cap-Verdien|Cap-Verdienne|Cape Verdean|رأس أخضري;Centrafricain|Centrafricaine|Central African|أفريقي أوسطي;Chilien|Chilienne|Chilean|تشيلي;Chinois|Chinoise|Chinese|صيني;Chypriote|Chypriote|Cypriot|قبرصي;Colombien|Colombienne|Colombian|كولومبي;Comorien|Comorienne|Comorian|قمري;Congolais|Congolaise|Congolese|كونغولي;Costaricien|Costaricienne|Costa Rican|كوستاريكي;Croate|Croate|Croatian|كرواتي;Cubain|Cubaine|Cuban|كوبي;Danois|Danoise|Danish|دنماركي;Djiboutien|Djiboutienne|Djiboutian|جيبوتي;Dominicain|Dominicaine|Dominican|دومينيكاني;Dominiquais|Dominiquaise|Dominican (Dominica)|دومينيكي;Égyptien|Égyptienne|Egyptian|مصري;Émirien|Émirienne|Emirati|إماراتي;Équatorien|Équatorienne|Ecuadorian|إكوادوري;Érythréen|Érythréenne|Eritrean|إريتري;Estonien|Estonienne|Estonian|إستوني;Eswatinien|Eswatinienne|Swazi|إسواتيني;Éthiopien|Éthiopienne|Ethiopian|إثيوبي;Fidjien|Fidjienne|Fijian|فيجي;Finlandais|Finlandaise|Finnish|فنلندي;Gabonais|Gabonaise|Gabonese|غابوني;Gambien|Gambienne|Gambian|غامبي;Géorgien|Géorgienne|Georgian|جورجي;Ghanéen|Ghanéenne|Ghanaian|غاني;Grec|Grecque|Greek|يوناني;Grenadien|Grenadienne|Grenadian|غرينادي;Guatémaltèque|Guatémaltèque|Guatemalan|غواتيمالي;Guinéen|Guinéenne|Guinean|غيني;Bissau-Guinéen|Bissau-Guinéenne|Bissau-Guinean|غيني بيساوي;Équato-Guinéen|Équato-Guinéenne|Equatorial Guinean|غيني استوائي;Guyanien|Guyanienne|Guyanese|غياني;Haïtien|Haïtienne|Haitian|هايتي;Hondurien|Hondurienne|Honduran|هندوراسي;Hongrois|Hongroise|Hungarian|مجري;Indien|Indienne|Indian|هندي;Indonésien|Indonésienne|Indonesian|إندونيسي;Irakien|Irakienne|Iraqi|عراقي;Iranien|Iranienne|Iranian|إيراني;Irlandais|Irlandaise|Irish|إيرلندي;Islandais|Islandaise|Icelandic|آيسلندي;Israélien|Israélienne|Israeli|إسرائيلي;Italien|Italienne|Italian|إيطالي;Ivoirien|Ivoirienne|Ivorian|إيفواري;Jamaïcain|Jamaïcaine|Jamaican|جامايكي;Japonais|Japonaise|Japanese|ياباني;Jordanien|Jordanienne|Jordanian|أردني;Kazakh|Kazakhe|Kazakh|كازاخستاني;Kényan|Kényane|Kenyan|كيني;Kirghize|Kirghize|Kyrgyz|قيرغيزي;Kiribatien|Kiribatienne|I-Kiribati|كيريباتي;Kosovar|Kosovare|Kosovar|كوسوفي;Koweïtien|Koweïtienne|Kuwaiti|كويتي;Laotien|Laotienne|Lao|لاوسي;Lésothien|Lésothienne|Mosotho|ليسوتي;Letton|Lettone|Latvian|لاتفي;Libanais|Libanaise|Lebanese|لبناني;Libérien|Libérienne|Liberian|ليبيري;Libyen|Libyenne|Libyan|ليبي;Liechtensteinois|Liechtensteinoise|Liechtensteiner|ليختنشتايني;Lituanien|Lituanienne|Lithuanian|ليتواني;Luxembourgeois|Luxembourgeoise|Luxembourgish|لوكسمبورغي;Macédonien|Macédonienne|Macedonian|مقدوني;Malaisien|Malaisienne|Malaysian|ماليزي;Malawien|Malawienne|Malawian|مالاوي;Maldivien|Maldivienne|Maldivian|مالديفي;Malgache|Malgache|Malagasy|مدغشقري;Malien|Malienne|Malian|مالي;Maltais|Maltaise|Maltese|مالطي;Marshallais|Marshallaise|Marshallese|مارشالي;Mauricien|Mauricienne|Mauritian|موريشيوسي;Mexicain|Mexicaine|Mexican|مكسيكي;Micronésien|Micronésienne|Micronesian|ميكرونيزي;Moldave|Moldave|Moldovan|مولدوفي;Monégasque|Monégasque|Monegasque|موناكي;Mongol|Mongole|Mongolian|منغولي;Monténégrin|Monténégrine|Montenegrin|مونتينيغري;Mozambicain|Mozambicaine|Mozambican|موزمبيقي;Namibien|Namibienne|Namibian|ناميبي;Nauruan|Nauruane|Nauruan|ناوروي;Néerlandais|Néerlandaise|Dutch|هولندي;Néo-Zélandais|Néo-Zélandaise|New Zealander|نيوزيلندي;Népalais|Népalaise|Nepalese|نيبالي;Nicaraguayen|Nicaraguayenne|Nicaraguan|نيكاراغوي;Nigérian|Nigériane|Nigerian|نيجيري;Nigérien|Nigérienne|Nigerien|نيجري;Nord-Coréen|Nord-Coréenne|North Korean|كوري شمالي;Norvégien|Norvégienne|Norwegian|نرويجي;Omanais|Omanaise|Omani|عماني;Ougandais|Ougandaise|Ugandan|أوغندي;Ouzbek|Ouzbèke|Uzbek|أوزبكي;Pakistanais|Pakistanaise|Pakistani|باكستاني;Palaosien|Palaosienne|Palauan|بالاوي;Palestinien|Palestinienne|Palestinian|فلسطيني;Panaméen|Panaméenne|Panamanian|بنمي;Papouasien|Papouasienne|Papua New Guinean|بابواني;Paraguayen|Paraguayenne|Paraguayan|باراغوياني;Péruvien|Péruvienne|Peruvian|بيروفي;Philippin|Philippine|Filipino|فلبيني;Polonais|Polonaise|Polish|بولندي;Portugais|Portugaise|Portuguese|برتغالي;Qatarien|Qatarienne|Qatari|قطري;Roumain|Roumaine|Romanian|روماني;Russe|Russe|Russian|روسي;Rwandais|Rwandaise|Rwandan|رواندي;Saint-Lucien|Saint-Lucienne|Saint Lucian|سانت لوسي;Salomonais|Salomonaise|Solomon Islander|سليماني;Salvadorien|Salvadorienne|Salvadoran|سلفادوري;Samoan|Samoane|Samoan|ساموي;Santoméen|Santoméenne|São Toméan|ساو تومي;Saoudien|Saoudienne|Saudi|سعودي;Serbe|Serbe|Serbian|صربي;Seychellois|Seychelloise|Seychellois|سيشيلي;Sierra-Léonais|Sierra-Léonaise|Sierra Leonean|سيراليوني;Singapourien|Singapourienne|Singaporean|سنغافوري;Slovaque|Slovaque|Slovak|سلوفاكي;Slovène|Slovène|Slovenian|سلوفيني;Somalien|Somalienne|Somali|صومالي;Soudanais|Soudanaise|Sudanese|سوداني;Sud-Africain|Sud-Africaine|South African|جنوب أفريقي;Sud-Coréen|Sud-Coréenne|South Korean|كوري جنوبي;Sud-Soudanais|Sud-Soudanaise|South Sudanese|جنوب سوداني;Sri-Lankais|Sri-Lankaise|Sri Lankan|سريلانكي;Suédois|Suédoise|Swedish|سويدي;Suisse|Suisse|Swiss|سويسري;Surinamais|Surinamaise|Surinamese|سورينامي;Syrien|Syrienne|Syrian|سوري;Tadjik|Tadjike|Tajik|طاجيكي;Tanzanien|Tanzanienne|Tanzanian|تنزاني;Tchadien|Tchadienne|Chadian|تشادي;Tchèque|Tchèque|Czech|تشيكي;Thaïlandais|Thaïlandaise|Thai|تايلندي;Timorais|Timoraise|Timorese|تيموري;Togolais|Togolaise|Togolese|توغولي;Tonguien|Tonguienne|Tongan|تونغي;Trinidadien|Trinidadienne|Trinidadian|ترينيدادي;Turc|Turque|Turkish|تركي;Turkmène|Turkmène|Turkmen|تركمانستاني;Tuvaluan|Tuvaluane|Tuvaluan|توفالي;Ukrainien|Ukrainienne|Ukrainian|أوكراني;Uruguayen|Uruguayenne|Uruguayan|أوروغواياني;Vanuatuan|Vanuatuane|Ni-Vanuatu|فانواتي;Vénézuélien|Vénézuélienne|Venezuelan|فنزويلي;Vietnamien|Vietnamienne|Vietnamese|فيتنامي;Yéménite|Yéménite|Yemeni|يمني;Zambien|Zambienne|Zambian|زامبي;Zimbabwéen|Zimbabwéenne|Zimbabwean|زيمبابوي`;
const arFem = (m) => m.split(' ').map((w) => (w.endsWith('ي') ? `${w}ة` : w)).join(' ');
const row = (s) => { const [frM, frF, en, arM] = s.split('|'); return { fr: [frM, frF], en: [en, en], ar: [arM, arFem(arM)] }; };
const common = COMMON.split(';').map(row);
const others = OTHERS.split(';').map(row);
const LOCALE = { fr: 'fr', en: 'en', ar: 'ar' };
// [masculine, feminine] pairs in one language: the common ones first, then alphabetical
export const nationalityList = (lang) => [...common, ...[...others].sort((a, b) => a[lang][0].localeCompare(b[lang][0], LOCALE[lang]))].map((n) => n[lang]);
export const NATIONALITY_COUNT = common.length + others.length;

export const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase().trim();
const allNationalities = [...common, ...others];
const findNationalityRow = (value) => allNationalities.find((n) => Object.values(n).some((pair) => pair.some((f) => norm(f) === norm(value))));
// the same nationality in another language and gender; anything not in the list is kept as typed
export function nationalityIn(value, lang, gender) {
  const n = findNationalityRow(value);
  return n ? n[lang][gender === 'f' ? 1 : 0] : value;
}
// older CVs have no Homme/Femme: read it from the nationality when its two forms differ
export function genderFromNationality(value) {
  const n = findNationalityRow(value);
  if (!n) return 'm';
  return Object.values(n).some(([m, f]) => m !== f && norm(f) === norm(value)) ? 'f' : 'm';
}

// ---------- education levels (Moroccan system, in order) ----------
export const EDUCATION = {
  fr: [
    ['Enseignement primaire', ['Niveau 1ère année primaire', 'Niveau 2ème année primaire', 'Niveau 3ème année primaire', 'Niveau 4ème année primaire', 'Niveau 5ème année primaire', 'Niveau 6ème année primaire', 'Certificat d’études primaires']],
    ['Enseignement collégial', ['Niveau 1ère année collège', 'Niveau 2ème année collège', 'Niveau 3ème année collège', 'Brevet d’enseignement collégial']],
    ['Enseignement secondaire qualifiant', ['Niveau Tronc commun', 'Niveau 1ère année Baccalauréat', 'Niveau 2ème année Baccalauréat', 'Baccalauréat']],
    ['Formation professionnelle (OFPPT)', ['Spécialisation', 'Qualification', 'Technicien', 'Technicien Spécialisé']],
    ['Enseignement supérieur', ['Bac+1', 'Bac+2 (DEUG / DUT / BTS / DTS)', 'Licence (Bac+3)', 'Licence Professionnelle (Bac+3)', 'Master (Bac+5)', 'Master Spécialisé (Bac+5)', 'Diplôme d’Ingénieur (Bac+5)', 'Doctorat (Bac+8)']],
  ],
  en: [
    ['Primary school', ['Primary school, year 1', 'Primary school, year 2', 'Primary school, year 3', 'Primary school, year 4', 'Primary school, year 5', 'Primary school, year 6', 'Primary school certificate']],
    ['Middle school', ['Middle school, year 1', 'Middle school, year 2', 'Middle school, year 3', 'Middle school certificate']],
    ['Secondary school', ['Common core (secondary)', 'Baccalaureate, year 1', 'Baccalaureate, year 2', 'Baccalaureate']],
    ['Vocational training (OFPPT)', ['Specialisation', 'Qualification', 'Technician', 'Specialised Technician']],
    ['Higher education', ['Bac+1', 'Bac+2 (DEUG / DUT / BTS / DTS)', 'Bachelor’s degree (Bac+3)', 'Professional bachelor’s degree (Bac+3)', 'Master’s degree (Bac+5)', 'Specialised master’s degree (Bac+5)', 'Engineering degree (Bac+5)', 'Doctorate (Bac+8)']],
  ],
  ar: [
    ['التعليم الابتدائي', ['مستوى السنة الأولى ابتدائي', 'مستوى السنة الثانية ابتدائي', 'مستوى السنة الثالثة ابتدائي', 'مستوى السنة الرابعة ابتدائي', 'مستوى السنة الخامسة ابتدائي', 'مستوى السنة السادسة ابتدائي', 'شهادة الدروس الابتدائية']],
    ['التعليم الإعدادي', ['مستوى السنة الأولى إعدادي', 'مستوى السنة الثانية إعدادي', 'مستوى السنة الثالثة إعدادي', 'شهادة السلك الإعدادي']],
    ['التعليم الثانوي التأهيلي', ['مستوى الجذع المشترك', 'مستوى الأولى باكالوريا', 'مستوى الثانية باكالوريا', 'الباكالوريا']],
    ['التكوين المهني (OFPPT)', ['التخصص', 'التأهيل', 'تقني', 'تقني متخصص']],
    ['التعليم العالي', ['باكالوريا +1', 'باكالوريا +2 (DEUG / DUT / BTS / DTS)', 'الإجازة (باكالوريا +3)', 'الإجازة المهنية (باكالوريا +3)', 'الماستر (باكالوريا +5)', 'الماستر المتخصص (باكالوريا +5)', 'دبلوم مهندس (باكالوريا +5)', 'الدكتوراه (باكالوريا +8)']],
  ],
};
const flatLevels = (lang) => EDUCATION[lang].flatMap(([, levels]) => levels);
// what the CV shows, e.g. "Baccalauréat – Sciences Physiques"
export const degreeText = (level, field) => [level, field?.trim()].filter(Boolean).join(' – ');

// ---------- language names, skills, interests ----------
const LANGUAGES = {
  fr: ['Arabe', 'Amazighe', 'Tamazight', 'Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien', 'Portugais', 'Turc', 'Chinois'],
  en: ['Arabic', 'Amazigh', 'Tamazight', 'French', 'English', 'Spanish', 'German', 'Italian', 'Portuguese', 'Turkish', 'Chinese'],
  ar: ['العربية', 'الأمازيغية', 'تمازيغت', 'الفرنسية', 'الإنجليزية', 'الإسبانية', 'الألمانية', 'الإيطالية', 'البرتغالية', 'التركية', 'الصينية'],
};
export const LANGUAGE_NAMES = LANGUAGES;
export const SKILLS = {
  fr: ['Travail en équipe', 'Sérieux', 'Ponctuel', 'Motivé', 'Dynamique', 'Sens de l’organisation', 'Sens des responsabilités', 'Gestion du stress', 'Gestion du temps', 'Rigueur', 'Autonomie', 'Esprit d’initiative', 'Capacité d’adaptation', 'Polyvalence', 'Honnêteté', 'Patience', 'Discrétion', 'Bonne présentation', 'Sens de l’écoute', 'Esprit d’équipe', 'Accueil et conseil des clients', 'Communication et relation client', 'Techniques de vente', 'Gestion de la caisse', 'Gestion des conflits', 'Respect des règles d’hygiène et de sécurité', 'Informatique et bureautique : Word, Excel', 'Maîtrise d’Internet et des réseaux sociaux', 'Permis de conduire et véhicule'],
  en: ['Teamwork', 'Reliable', 'Punctual', 'Motivated', 'Dynamic', 'Well organised', 'Sense of responsibility', 'Stress management', 'Time management', 'Attention to detail', 'Independent', 'Initiative', 'Adaptability', 'Versatility', 'Honesty', 'Patience', 'Discretion', 'Good presentation', 'Good listener', 'Team spirit', 'Welcoming and advising customers', 'Communication and customer relations', 'Sales techniques', 'Cash handling', 'Conflict management', 'Health and safety rules', 'Computer and office skills: Word, Excel', 'Internet and social media', 'Driving licence and own vehicle'],
  ar: ['العمل ضمن فريق', 'الجدية', 'احترام المواعيد', 'الحماس للعمل', 'الحيوية', 'حسن التنظيم', 'تحمل المسؤولية', 'التحكم في الضغط', 'حسن تدبير الوقت', 'الدقة في العمل', 'الاستقلالية', 'روح المبادرة', 'القدرة على التكيف', 'تعدد المهارات', 'الأمانة', 'الصبر', 'الكتمان', 'حسن المظهر', 'حسن الإصغاء', 'روح الفريق', 'استقبال الزبناء وإرشادهم', 'التواصل والعلاقة مع الزبناء', 'تقنيات البيع', 'تدبير الصندوق', 'حل النزاعات', 'احترام قواعد النظافة والسلامة', 'الإعلاميات والمكتبيات: Word، Excel', 'التحكم في الإنترنت ووسائل التواصل الاجتماعي', 'رخصة السياقة ووسيلة نقل'],
};
export const INTERESTS = {
  fr: ['Sport', 'Football', 'Lecture', 'Voyage', 'Musique', 'Cuisine', 'Informatique', 'Bénévolat', 'Dessin', 'Natation', 'Randonnée', 'Photographie', 'Cinéma', 'Jeux d’échecs', 'Couture', 'Jardinage'],
  en: ['Sport', 'Football', 'Reading', 'Travel', 'Music', 'Cooking', 'Computing', 'Volunteering', 'Drawing', 'Swimming', 'Hiking', 'Photography', 'Cinema', 'Chess', 'Sewing', 'Gardening'],
  ar: ['الرياضة', 'كرة القدم', 'القراءة', 'السفر', 'الموسيقى', 'الطبخ', 'الإعلاميات', 'العمل التطوعي', 'الرسم', 'السباحة', 'المشي في الطبيعة', 'التصوير الفوتوغرافي', 'السينما', 'الشطرنج', 'الخياطة', 'البستنة'],
};

// a value from one of the parallel lists, in the target language (unknown values stay as typed)
function inList(lists, value, to) {
  for (const list of Object.values(lists)) {
    const i = list.findIndex((x) => norm(x) === norm(value));
    if (i >= 0) return lists[to][i];
  }
  return value;
}
const LEVEL_LISTS = { fr: flatLevels('fr'), en: flatLevels('en'), ar: flatLevels('ar') };

// The CV in another language: every fixed value follows; typed text stays as it is.
// maritals: { fr: [...], en: [...], ar: [...] } from CV_TEXT, in the same order.
export function switchCvLang(data, to, maritals) {
  const p = data.personal || {};
  const gender = p.gender || genderFromNationality(p.nationality);
  return {
    ...data,
    lang: to,
    personal: { ...p, nationality: p.nationality && nationalityIn(p.nationality, to, gender), marital: p.marital && inList(maritals, p.marital, to) },
    education: (data.education || []).map((e) => {
      if (!e.level) return e;
      const level = inList(LEVEL_LISTS, e.level, to);
      return { ...e, level, degree: degreeText(level, e.field ?? '') };
    }),
    languages: (data.languages || []).map((l) => ({ ...l, name: inList(LANGUAGES, l.name, to) })),
    skills: (data.skills || []).map((s) => inList(SKILLS, s, to)),
    interests: (data.interests || []).map((s) => inList(INTERESTS, s, to)),
  };
}
