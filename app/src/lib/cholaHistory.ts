/**
 * History of the Cholas — researched two-epoch historical & archaeological canon.
 *
 * Bridges two distinct, clearly dated historical horizons without conflating them
 * (per docs/sangam-theme-canon.md §6):
 *
 *   1. **Early / Sangam-Age Cholas (c. 3rd c. BCE – 3rd c. CE)** — attested in
 *      Puranānūṟu, Pattinappālai, Porunārāṟṟuppaṭai, Akanānūṟu and Silappatikāram,
 *      and grounded in Tamil Nadu State Department of Archaeology (TNSDA) and
 *      Archaeological Survey of India (ASI) excavations at Kaveripoompattinam
 *      (Puhar), Uraiyur, Kodumanal, Keezhadi, Porunthal and Arikamedu.
 *   2. **Imperial / Medieval Cholas (c. 848 – 1279 CE)** — attested in copper-plate
 *      charters (Thiruvalangadu, Leiden, Anbil), stone inscriptions (Uttaramerur,
 *      Thanjavur Rajarajeswaram), solid lost-wax (*madhuchishtavidhana* / *cire perdue*)
 *      copper-alloy bronzes, and trans-oceanic maritime records.
 *
 * Every chapter pairs historical statecraft, martial ethics, hydraulic engineering,
 * and trade prosperity with verified couplets from Thiruvalluvar's *Poruḷpāl* and
 * *Aṟத்துப்பால்* so readers move seamlessly between history and Stoic reflection.
 */

export type CholaPillarId = 'archaeology' | 'bronzes' | 'weapons' | 'wealth'

export interface BilingualText {
  readonly en: string
  readonly ta: string
}

export interface CholaFactItem {
  readonly id: string
  readonly title: BilingualText
  readonly period: BilingualText
  readonly evidenceKind: 'Archaeology' | 'Epigraphy' | 'Sangam corpus' | 'Metallurgy'
  readonly body: BilingualText
}

export interface CholaPillar {
  readonly id: CholaPillarId
  readonly layerKey: 'chola-archaeology' | 'chola-bronze' | 'chola-weapons' | 'chola-wealth'
  readonly eyebrow: BilingualText
  readonly title: BilingualText
  readonly era: BilingualText
  readonly summary: BilingualText
  readonly stoicBridge: BilingualText
  /** Verified Kural numbers from data/kurals.js. */
  readonly kuralNumbers: readonly [number, number]
  readonly highlights: readonly BilingualText[]
  readonly records: readonly CholaFactItem[]
}

export interface CholaTimelineEntry {
  readonly id: string
  readonly span: BilingualText
  readonly rulerOrPhase: BilingualText
  readonly epoch: 'sangam' | 'imperial'
  readonly capital: BilingualText
  readonly note: BilingualText
  readonly source: string
}

export const CHOLA_PILLARS: readonly CholaPillar[] = [
  {
    id: 'archaeology',
    layerKey: 'chola-archaeology',
    eyebrow: {
      en: 'Epoch I · Sangam Excavations & Early Polity',
      ta: 'முற்காலச் சோழர் · சங்க காலத் தொல்லியல்',
    },
    title: {
      en: 'Sangam Cholas & Excavated Archaeology',
      ta: 'சங்க காலச் சோழரும் தொல்லியல் சான்றுகளும்',
    },
    era: {
      en: 'c. 3rd century BCE – 3rd century CE',
      ta: 'பொ.ஆ.மு. 3-ஆம் நூற்றாண்டு – பொ.ஆ. 3-ஆம் நூற்றாண்டு',
    },
    summary: {
      en: 'From inland Uraiyur and the harbour metropolis of Kaveripoompattinam (Puhar), early Chola sovereigns harnessed the Kaveri delta, built the stone diversion dam at Kallanai, and traded across the Indian Ocean and Mediterranean world.',
      ta: 'உறையூரையும் காவிரிப்பூம்பட்டினம் (புகார்) துறைமுகப் பெருநகரையும் தலைநகரங்களாகக் கொண்டு, முற்காலச் சோழர் காவிரிப் பாசனத்தைக் கல்லணையால் ஒழுங்குபடுத்திக் கடல் கடந்த வாணிபத்தில் சிறந்து விளங்கினர்.',
    },
    stoicBridge: {
      en: 'In Puranānūṟu 212–223, Sangam Chola king Kopperuncholan chose dignified philosophical fast (vaṭakkiruttal) over fratricidal civil war, keeping a place beside him for poet Pisirandaiyar — whom Parimelalagar cites directly on Kural 785 as the supreme exemplar of soul-friendship.',
      ta: 'புறநானூறு (212–223) போற்றும் கோப்பெருஞ்சோழன் உள்நாட்டுப் போரைத் தவிர்த்து அறநெறிப் பெருமிதத்தோடு வடக்கிருந்தான்; நேரில் காணாமலேயே உயிர்நட்பு பூண்ட பிசிராந்தையார் வரலாற்றையே பரிமேலழகர் குறள் 785-க்குச் சான்றாக்குகிறார்.',
    },
    kuralNumbers: [737, 785],
    highlights: [
      {
        en: 'Puhar (Kilaiyur & Vanagiri): ASI excavated a massive Sangam-era fired-brick boat wharf with wooden mooring poles and a brick water-inlet reservoir.',
        ta: 'புகார் (கிளையூர், வானகிரி): சங்க காலச் சுடுமண் படகுத் துறையும் மரக் கட்டுத்தறிகளும் நீர்நிலை மதகும் அகழாய்வில் கண்டறியப்பட்டன.',
      },
      {
        en: 'Uraiyur brick dyeing vats: excavated vats corroborate Sangam poems and the Periplus on ultra-fine Chola cotton muslins (argarik).',
        ta: 'உறையூர் சாயத் தொட்டிகள்: சங்க இலக்கியமும் பெரிப்ளஸ் நூலும் போற்றும் நுண்ணிய பருத்தி நெசவுக்குச் சுடுமண் சாயத் தொட்டிகள் சான்றாகின்றன.',
      },
      {
        en: 'Karikala Chola & Kallanai (Grand Anicut): stone hydraulic engineering across the Kaveri converting seasonal floods into sustained Marutham harvests.',
        ta: 'கரிகால் பெருவளத்தானும் கல்லணையும்: காவிரியின் வெள்ளத்தை வளமான மருத நில வேளாண்மையாய் மாற்றிய பண்டைய நீரியல் சாதனை.',
      },
    ],
    records: [
      {
        id: 'puhar-wharf',
        title: {
          en: 'Kaveripoompattinam (Puhar) Harbour & Wharf',
          ta: 'காவிரிப்பூம்பட்டினம் (புகார்) படகுத் துறை',
        },
        period: { en: 'Sangam era · c. 3rd–1st c. BCE', ta: 'சங்க காலம் · பொ.ஆ.மு. 3–1 நூற்.' },
        evidenceKind: 'Archaeology',
        body: {
          en: 'ASI excavations (S. R. Rao, K. V. Soundara Rajan) at Kilaiyur uncovered an I-shaped fired-brick wharf (18.28 × 7.62 m) pierced by stout wooden mooring posts alongside Vanagiri’s semicircular brick sluice channel — matching Pattinappālai’s account of deep-draught ships berthed without lowering sail.',
          ta: 'கிளையூரில் இந்தியத் தொல்லியல் துறை நடத்திய ஆய்வில் மரக் கட்டுத்தறிகளுடன் கூடிய பெரிய சுடுமண் படகுத் துறையும் (18.28 × 7.62 மீ), வானகிரியில் அரைவட்ட நீர்வரத்துக் கால்வாயும் கண்டறியப்பட்டன; இது பட்டினப்பாலை கூறும் புகார் துறைமுகச் சிறப்போடு ஒத்துப்போகிறது.',
        },
      },
      {
        id: 'uraiyur-textiles',
        title: {
          en: 'Uraiyur Stratigraphy, Tamili Script & Dyeing Vats',
          ta: 'உறையூர் அகழாய்வு: தமிழி எழுத்தும் சாயத் தொட்டிகளும்',
        },
        period: { en: 'c. 3rd c. BCE – 2nd c. CE', ta: 'பொ.ஆ.மு. 3 நூற். – பொ.ஆ. 2 நூற்.' },
        evidenceKind: 'Archaeology',
        body: {
          en: 'Excavations at ancient Uraiyur (Tiruchirappalli) yielded Black-and-Red Ware, Rouletted Ware, Tamil-Brahmi (Tamili) inscribed potsherds, and rectangular fired-brick dyeing vats confirming industrial cotton weaving celebrated in Sangam verse as thin as shed snake-skin or steam.',
          ta: 'திருச்சிராப்பள்ளி உறையூர் அகழாய்வில் கருப்பு-சிவப்புப் பானை ஓடுகள், ரௌலட்டட் மட்கலன்கள், தமிழி எழுத்துப் பொறித்த ஓடுகள் மற்றும் செவ்வகச் சுடுமண் சாயத் தொட்டிகள் கிடைத்துள்ளன; பாம்பு உரித்த தோல் போன்ற நுண்ணிய ஆடை நெய்ததற்கு இவை நேர் சான்று.',
        },
      },
      {
        id: 'kodumanal-keezhadi',
        title: {
          en: 'Kodumanal, Keezhadi & Crucible Steel (Ukku)',
          ta: 'கொடுமணல், கீழடி மற்றும் எஃகு (உருக்கு) தொழில்நுட்பம்',
        },
        period: { en: 'c. 6th–1st c. BCE', ta: 'பொ.ஆ.மு. 6–1 நூற்.' },
        evidenceKind: 'Archaeology',
        body: {
          en: 'TNSDA excavations at Kodumanal and Keezhadi revealed urban brick masonry, over a thousand Tamili graffiti/inscribed sherds, spindle whorls, carnelian-beryl bead workshops, and refractory clay crucibles used to smelt high-carbon Wootz steel (ukku / எஃகு) exported across the ancient world.',
          ta: 'தமிழ்நாடு தொல்லியல் துறையின் கொடுமணல் மற்றும் கீழடி அகழாய்வுகளில் செங்கல் கட்டுமானங்கள், தமிழிப் பொறிப்புகள், நூற்புத் தக்களிகள், மணிக்கல் பட்டறைகள் மற்றும் உலகப் புகழ்பெற்ற உயர்-கரிம உருக்கு எஃகு (Wootz) உருக்கும் மண் குகைகள் கண்டறியப்பட்டுள்ளன.',
        },
      },
      {
        id: 'kallanai-karikala',
        title: {
          en: 'Karikala Chola, Venni & the Kallanai Dam',
          ta: 'கரிகாலன், வெண்ணிப் போர் மற்றும் கல்லணை',
        },
        period: { en: 'Early Chola · Sangam corpus', ta: 'முற்காலச் சோழர் · சங்க இலக்கியம்' },
        evidenceKind: 'Sangam corpus',
        body: {
          en: 'Celebrated in Porunārāṟṟuppaṭai and Pattinappālai, Karikala united the Tamil plain after Venni, cleared forest into irrigated farmland, raised flood embankments along the Kaveri, and laid the stone foundation of Kallanai (Grand Anicut, ~329 m long) to divert water across the delta.',
          ta: 'பொருநராற்றுப்படையும் பட்டினப்பாலையும் போற்றும் கரிகால் பெருவளத்தான் வெண்ணிப் போரில் வென்று, காடுகளைத் திருத்தி நாடாக்கிக் காவிரிக்குக் கரை எடுத்து, டெல்டா பாசனத்திற்காகக் கல்லணையின் (சுமார் 329 மீ நீளம்) அடித்தளத்தை அமைத்தான்.',
        },
      },
    ],
  },
  {
    id: 'bronzes',
    layerKey: 'chola-bronze',
    eyebrow: {
      en: 'Epoch II · Imperial Statecraft & Sacred Metallurgy',
      ta: 'பிற்காலப் பேரரசு · செப்புத் திருமேனிகளும் ஆட்சியும்',
    },
    title: {
      en: 'Imperial Chola Bronzes, Governance & Architecture',
      ta: 'சோழர் செப்புத் திருமேனிகளும் குடவோலை ஆட்சியும்',
    },
    era: {
      en: 'c. 848 – 1279 CE (Imperial Chola Era)',
      ta: 'பொ.ஆ. 848 – 1279 (பிற்காலச் சோழப் பேரரசு)',
    },
    summary: {
      en: 'Rising again at Thanjavur under Vijayalaya and reaching continental scale under Sembiyan Mahadevi, Rajaraja I, and Rajendra I, the Imperial Cholas paired local assembly governance (kuḍavōlai) and granite architecture with solid lost-wax bronzes unequalled in world art.',
      ta: 'விசயாலயன் தஞ்சையைக் கைப்பற்றியது முதல் செம்பியன் மாதேவி, முதலாம் இராசராசன், முதலாம் இராசேந்திரன் காலங்களில் சோழப் பேரரசு குடவோலை உள்ளாட்சி, கற்றளிச் சிற்பம், மெழுகு-உருக்குச் செப்புத் திருமேனிகள் ஆகியவற்றில் உலகின் உச்சத்தைத் தொட்டது.',
    },
    stoicBridge: {
      en: 'In Nataraja’s cosmic dance, fierce dynamic motion (tāṇḍava) surrounds an utterly still, serene countenance — the exact visual counterpart of the Stoic inner citadel and Valluvar’s impartial sovereign sceptre (செங்கோன்மை, Ch. 55).',
      ta: 'நடராசப் பெருமானின் ஆனந்தத் தாண்டவத்தில் சுற்றிலும் சுடர்விடும் இயக்கத்தின் நடுவே முகத்தில் தவழும் அசைவற்ற அமைதி, வள்ளுவர் கூறும் நடுவுநிலைமைக்கும் செங்கோன்மைக்கும் (அதிகாரம் 55) இணையான தத்துவப் படிமமாகும்.',
    },
    kuralNumbers: [381, 541],
    highlights: [
      {
        en: 'Cire perdue (Madhuchishtavidhana): every authentic Chola bronze is solid-cast from a hand-modelled beeswax core whose clay mould is broken forever — making every sculpture unique.',
        ta: 'மதுச்சிஷ்ட விதானம் (மெழுகு-உருக்கு முறை): தேன்மெழுகுப் படிமத்தின் மேல் களிமண் பூசி உருக்கி வார்த்து அச்சை உடைப்பதால், ஒவ்வொரு சோழர் செப்புச் சிலையும் உலகில் ஒரேயொரு தனிப் படைப்பாகும்.',
      },
      {
        en: 'Uttaramerur stone inscriptions (919 & 921 CE): codify village sabha committees chosen via palm-leaf pot-ballot (kuḍavōlai), mandatory property declarations, and audit disqualifications.',
        ta: 'உத்திரமேரூர் கல்வெட்டுகள் (பொ.ஆ. 919, 921): குடவோலை முறைத் தேர்வு, சொத்து விவரக் கணக்கு, தவறுவோர் தகுதிநீக்கம் ஆகிய உள்ளாட்சி விதிகளைத் துல்லியமாய்ப் பதிவு செய்கின்றன.',
      },
      {
        en: 'Thanjavur Rajarajeswaram (1010 CE) & Gangaikonda Cholapuram: all-granite vimanas, systematic land revenue surveys, and meticulous epigraphic public accountability.',
        ta: 'தஞ்சைப் பெரிய கோவிலும் (பொ.ஆ. 1010) கங்கைகொண்ட சோழபுரமும்: கருங்கல் விமானக் கட்டுமான நுட்பத்திற்கும் துல்லியமான நில அளவை மற்றும் கல்வெட்டு ஆவணப்படுத்தலுக்கும் சான்றாக நிற்கின்றன.',
      },
    ],
    records: [
      {
        id: 'cire-perdue-bronze',
        title: {
          en: 'Lost-Wax Bronze Casting (Madhuchishtavidhana)',
          ta: 'மெழுகு-உருக்குச் செப்புத் திருமேனி நுட்பம்',
        },
        period: { en: 'Imperial Chola · 9th–13th c. CE', ta: 'சோழப் பேரரசு · பொ.ஆ. 9–13 நூற்.' },
        evidenceKind: 'Metallurgy',
        body: {
          en: 'Sculptors (sthapatis) modelled the deity in beeswax mixed with dammar resin (kungiliyam) and oil, coated it in graded Kaveri alluvial clay layers, drained the wax by heating, poured molten copper-rich alloy through runners, and chiselled away the baked mould — peak examples flourishing under Aditya I, Sembiyan Mahadevi, and Rajaraja I.',
          ta: 'தேன்மெழுகும் குங்கிலியமும் கலந்த கலவையில் படிமம் வடித்து, காவிரி வண்டல் மண்ணால் பல அடுக்குக் கவசமிட்டு, சூடுபடுத்தி மெழுகை வெளியேற்றி, உருகிய செப்புக் கலவையை ஊற்றி, ஆறியபின் மண் அச்சை உடைத்து எடுக்கும் இம்முறையில் செம்பியன் மாதேவி மற்றும் இராசராசன் காலப் படைப்புகள் உலகப் புகழ் பெற்றன.',
        },
      },
      {
        id: 'uttaramerur-sabha',
        title: {
          en: 'Uttaramerur Inscriptions & Kuḍavōlai Governance',
          ta: 'உத்திரமேரூர் கல்வெட்டும் குடவோலை முறையும்',
        },
        period: { en: 'Parantaka I · 919 & 921 CE', ta: 'முதலாம் பராந்தகன் · பொ.ஆ. 919 & 921' },
        evidenceKind: 'Epigraphy',
        body: {
          en: 'Carved directly on the Vaikunda Perumal temple walls under Parantaka I, two constitutional inscriptions define 30 village wards, candidate ethics and learning qualifications, selection of palm-leaf tickets from a pot (kuḍavōlai) for tank, garden and gold-testing committees (vāriyam), and strict debarment for misappropriating public funds.',
          ta: 'முதலாம் பராந்தகன் காலத்திய வைகுந்தப் பெருமாள் கோவில் கல்வெட்டுகள் 30 குடும்புகள், வேட்பாளர் கல்வி-நன்னடத்தைத் தகுதிகள், ஏரி வாரியம்·தோட்ட வாரியம்·பொன் வாரியம் ஆகியவற்றிற்குப் பனையோலைச் சீட்டுக் குடவோலைத் தேர்வு, பொதுக் கணக்கு ஒப்படைக்காவிட்டால் தகுதிநீக்கம் ஆகியவற்றை வரையறுக்கின்றன.',
        },
      },
      {
        id: 'rajaraja-thanjavur',
        title: {
          en: 'Rajaraja I: Rajarajeswaram & Imperial Land Survey',
          ta: 'முதலாம் இராசராசன்: தஞ்சைப் பெருவுடையார் கோவிலும் நில அளவையும்',
        },
        period: { en: '985 – 1014 CE', ta: 'பொ.ஆ. 985 – 1014' },
        evidenceKind: 'Epigraphy',
        body: {
          en: 'Completed c. 1010 CE, Thanjavur’s ~66-metre granite vimana encodes imperial statecraft on stone: over 80 inscriptions inventory every bronze icon’s exact height and jewel weight in kalanju, alongside revenue shares audited across Valanadu provinces measured by the royal rod ulagalanda kol.',
          ta: 'பொ.ஆ. 1010 அளவில் நிறைவுற்ற தஞ்சைப் பெரிய கோவிலின் 216 அடி கருங்கல் விமானம் வெறும் கலைப்படைப்பு மட்டுமன்று; ஒவ்வொரு செப்புத் திருமேனியின் உயரமும் ஆபரணங்களின் கழஞ்சு எடையும் ‘உலகளந்த கோல்’ நில அளவைக் கணக்குகளும் 80-க்கும் மேற்பட்ட கல்வெட்டுகளில் பொறிக்கப்பட்டுள்ளன.',
        },
      },
      {
        id: 'rajendra-gangaikonda',
        title: {
          en: 'Rajendra I: Gangaikonda Cholapuram & Cholaganga',
          ta: 'முதலாம் இராசேந்திரன்: கங்கைகொண்ட சோழபுரமும் சோழகங்கமும்',
        },
        period: { en: '1014 – 1044 CE', ta: 'பொ.ஆ. 1014 – 1044' },
        evidenceKind: 'Epigraphy',
        body: {
          en: 'Founding a new capital at Gangaikonda Cholapuram after his northern campaign to the Ganga, Rajendra I excavated the vast Cholaganga reservoir ("liquid pillar of victory") rather than a dry triumphal arch — sustaining thousands of acres of farmland for centuries.',
          ta: 'கங்கைப் படையெடுப்புக்குப் பின் கங்கைகொண்ட சோழபுரத்தை நிறுவிய முதலாம் இராசேந்திரன், வெறும் வெற்றித் தூணுக்குப் பதிலாகப் பல்லாயிரம் ஏக்கர் நிலம் செழிக்கச் ‘சோழகங்கம்’ எனும் நீர்மயமான வெற்றித் தூணை (பேரேரியை) உருவாக்கினான்.',
        },
      },
    ],
  },
  {
    id: 'weapons',
    layerKey: 'chola-weapons',
    eyebrow: {
      en: 'Martial Craft · Sangam Iron to Imperial Fleets',
      ta: 'படைக்கலன்களும் கடற்படையும் · எஃகு முதல் கலம் வரை',
    },
    title: {
      en: 'Chola Period Weapons, Regiments & Maritime Power',
      ta: 'சோழர் கால ஆயுதங்கள், படைப்பிரிவுகள் மற்றும் கடற்படை',
    },
    era: {
      en: 'Sangam Iron-Steel Tradition through 13th c. CE',
      ta: 'சங்க கால இரும்பு-எஃகு மரபு முதல் பொ.ஆ. 13-ஆம் நூற். வரை',
    },
    summary: {
      en: 'Forged from high-carbon Tamil crucible steel (ukku / எஃகு), Chola armouries fielded leaf-bladed Vēl spears, double-edged Vāḷ swords, tanged arrows, bossed tiger shields, war elephants, sworn Vēḷaikkārar bodyguards, and blue-water Kalam fleets reaching Southeast Asia.',
      ta: 'உயர்-கரிமத் தமிழ் உருக்கு எஃகால் (Wootz) வார்க்கப்பட்ட இலைவடிவ வேல், இருபுறம் கூர்மையான வாள், அம்புகள், புலிப் பொறித்த கேடகம், போர் யானைகள், வேலைக்காரர் படை மற்றும் கடாரம் வரை சென்ற கலம் கடற்படை ஆகியவை சோழர் வலிமையின் தூண்களாக விளங்கின.',
    },
    stoicBridge: {
      en: 'Thiruvalluvar names crucible steel directly in Kural 773: fearless courage in battle is valour, yet generous mercy toward an opponent in distress is its tempered steel edge (ஊராண்மை மற்றதன் எஃகு).',
      ta: 'போர்க்களத்தில் அஞ்சாமை பேராண்மை; ஆனால் வீழ்ந்த பகைவர்க்கும் அருள் செய்யும் பண்பே அதன் கூர்மையான ‘எஃகு’ என்று வள்ளுவர் (குறள் 773) தமிழ் உருக்கு எஃகையே அறத்தின் உவமையாக்குகிறார்.',
    },
    kuralNumbers: [773, 761],
    highlights: [
      {
        en: 'Vēl (spear) & Vāḷ (crucible-steel sword): archaeological iron blades from Kodumanal/Adichanallur continue into Chola battle sculptures and hero-stones.',
        ta: 'வேலும் வாளும்: கொடுமணல், ஆதிச்சநல்லூர் இரும்பு-எஃகுப் படைக்கல மரபு பிற்காலச் சோழர் நடுகற்களிலும் சிற்பங்களிலும் தொடர்கிறது.',
      },
      {
        en: 'Kaikkōḷar, Vēḷaikkārar & Villigal: specialized standing regiments documented by exact unit title in Thanjavur temple inscriptions.',
        ta: 'கைக்கோளர், வேலைக்காரர், வில்லிகள்: தஞ்சைக் கல்வெட்டுகளில் பெயர் குறித்துப் பதிவு செய்யப்பட்ட சிறப்புப் படைப் பிரிவுகள்.',
      },
      {
        en: '1025 CE Kadaram / Srivijaya Naval Expedition: Rajendra I’s ocean-going fleets crossed the Bay of Bengal in one coordinated monsoon campaign.',
        ta: 'பொ.ஆ. 1025 கடாரம் படையெடுப்பு: வங்காள விரிகுடாவைக் கடந்து தென்கிழக்காசியத் துறைமுகங்களை வென்ற முதலாம் இராசேந்திரனின் கடற்படைச் சாதனை.',
      },
    ],
    records: [
      {
        id: 'vel-and-val',
        title: {
          en: 'Vēl (Leaf Spear) & Vāḷ (WootzUkku Sword)',
          ta: 'வேல் மற்றும் உருக்கு எஃகு வாள்',
        },
        period: { en: 'Sangam archaeology & Chola epigraphy', ta: 'சங்கத் தொல்லியல் & சோழர் கல்வெட்டு' },
        evidenceKind: 'Archaeology',
        body: {
          en: 'Excavated Tamil iron lances (vēl) feature socketed or tanged mid-ribbed leaf blades built to pierce hide armour, while double-edged straight and slightly curved vāḷ swords paired with waist daggers (churika / உடைவாள்) exploited high-carbon crucible steel’s resilience.',
          ta: 'புதைபொருள் ஆய்வில் கிடைத்துள்ள நடுவரம்பு கொண்ட இலைவடிவ இரும்பு வேல்களும், இருபுறமும் கூர்மையான நேர் வாட்களும் இடுப்பில் அணியும் உடைவாட்களும் (சுரிகை) தமிழ் உருக்கு எஃகின் வலிமையையும் வளையும் தன்மையையும் கொண்டவை.',
        },
      },
      {
        id: 'vil-ketakam-mazhu',
        title: {
          en: 'Vil-Ambu (Archery), Kēṭakam Shield & War Elephants',
          ta: 'வில்-அம்பு, புலிப் பொறித்த கேடகம் மற்றும் களிறு',
        },
        period: { en: 'Sangam to Imperial Chola', ta: 'சங்க காலம் முதல் சோழப் பேரரசு வரை' },
        evidenceKind: 'Epigraphy',
        body: {
          en: 'Tanged iron arrowheads (ambu) occur across Kodumanal and Keezhadi strata; Imperial inscriptions name dedicated bowmen corps (Anukka Villigal), circular lacquered oxhide-and-bronze shields (kēṭakam / tōl), battle-axes (mazhu), and armoured war-elephant divisions (kuñjaramallar).',
          ta: 'கொடுமணல், கீழடி அகழாய்வுகளில் இரும்பு அம்பு முனைகள் கிடைத்துள்ளன; சோழர் கல்வெட்டுகள் ‘அணுக்க வில்லிகள்’, தோல்-வெண்கலக் கேடகப் படையினர், மழுப்படை மற்றும் ‘குஞ்சரமல்லர்’ எனும் யானைப்படையினரைக் குறிப்பிடுகின்றன.',
        },
      },
      {
        id: 'regiments-velaikkarar',
        title: {
          en: 'Thirty-One Regiments: Kaikkōḷar & Vēḷaikkārar',
          ta: 'முப்பத்தோரு படைப்பிரிவுகள்: கைக்கோளரும் வேலைக்காரரும்',
        },
        period: { en: 'Rajaraja I – Kulottunga I (10th–12th c. CE)', ta: 'பொ.ஆ. 10–12 நூற்றாண்டுகள்' },
        evidenceKind: 'Epigraphy',
        body: {
          en: 'Thanjavur inscriptions enumerate over thirty named regiments — including Perundanattu Kaikkōḷar, Sirudanattu Vēḷaikkārar, and Parantaka Kongavalar — who managed their own temple endowments, civic guilds, and sworn royal guard duties.',
          ta: 'தஞ்சைப் பெரிய கோவில் கல்வெட்டுகள் பெருந்தனத்துக் கைக்கோளர், சிறுதனத்து வேலைக்காரர் உள்ளிட்ட முப்பதுக்கும் மேற்பட்ட படைப்பிரிவுகளையும், அவர்கள் கோவில்களுக்கும் அறச்செயல்களுக்கும் அளித்த கொடைகளையும் பதிவு செய்கின்றன.',
        },
      },
      {
        id: 'kadaram-navy',
        title: {
          en: 'Kalam Fleets & the 1025 CE Kadaram Expedition',
          ta: 'கலம் கடற்படையும் பொ.ஆ. 1025 கடார வெற்றியும்',
        },
        period: { en: 'Rajendra Chola I · c. 1025 CE', ta: 'முதலாம் இராசேந்திரன் · பொ.ஆ. 1025' },
        evidenceKind: 'Epigraphy',
        body: {
          en: 'Building on Sangam maritime navigation (nāvāy, kalam, vaṅkam), Rajendra I dispatched a multi-ship fleet across the turbulent Bay of Bengal ("alai kadal naduvul பல கலம் செலுத்தி"), securing Palembang (Srivijaya), Pannai, Malaiyur, Ilamuridesam, and Kadaram (Kedah) along the Malacca Strait.',
          ta: '“அலைகடல் நடுவுள் பல கலம் செலுத்தி” என மெய்க்கீர்த்தி போற்றுமாறு, முதலாம் இராசேந்திரனின் கடற்படை வங்காள விரிகுடாவைக் கடந்து ஸ்ரீவிஜயம், பண்ணை, மலையூர், இளமுரிதேசம், கடாரம் (கெடா) ஆகிய துறைமுகங்களை வென்று கடல் வாணிப வழியைப் பாதுகாத்தது.',
        },
      },
    ],
  },
  {
    id: 'wealth',
    layerKey: 'chola-wealth',
    eyebrow: {
      en: 'Material Prosperity · Gems, Coins & Merchant Guilds',
      ta: 'வளமும் வாணிபமும் · மணிக்கற்கள், காசுகள், வணிகக் குழுக்கள்',
    },
    title: {
      en: 'Agrarian Richness, Numismatics & Maritime Trade',
      ta: 'வேளாண் வளம், நாணயங்கள் மற்றும் கடல் கடந்த வணிகம்',
    },
    era: {
      en: 'Indo-Roman Sangam Trade to Song-China Embassies',
      ta: 'இந்தோ-உரோமானிய வாணிபம் முதல் சீனத் தூதுக்குழுக்கள் வரை',
    },
    summary: {
      en: 'Chola wealth united an unfailing irrigated rice delta with high-value global trade: Kodumanal carnelian and beryl gems, Gulf of Mannar pearls, square Sangam tiger copper coins, stamped gold Kāsu, and self-governing merchant guilds spanning Sumatra to Quanzhou.',
      ta: 'வளமான காவிரி நெற்களஞ்சியத்தோடு கொடுமணல் மணிக்கற்கள், மன்னார் முத்துக்கள், சங்க காலப் சதுரப் புலிக் காசுகள், தங்கக் காசுகள் மற்றும் சுமத்திரா முதல் சீனா வரை பரவிய ஐந்நூற்றுவர் வணிகக் குழுக்கள் சோழர் செல்வத்தின் அடித்தளமாய் அமைந்தன.',
    },
    stoicBridge: {
      en: 'For Valluvar (Kurals 385 & 731), wealth is never idle hoarding: true sovereignty generates prosperity ethically, guards public reserves, and channels surplus into tanks, learning, and famine-free civic life.',
      ta: 'செல்வம் என்பது பதுக்கி வைப்பதன்று; அறவழியில் ஈட்டி, காத்து, ஏரிகளுக்கும் கல்விக்கும் குடிமக்கள் நலனுக்கும் வகுத்து வழங்குவதே சிறந்த அரசு என்பது வள்ளுவரின் (குறள் 385, 731) பொருளியல் அறம்.',
    },
    kuralNumbers: [385, 731],
    highlights: [
      {
        en: 'Square copper standing-tiger coins (Puhar & Uraiyur) to stamped gold Kāsu & silver Kahavanu standards under Uttama Chola and Rajaraja I.',
        ta: 'புகார், உறையூர் சதுரப் புலிச் செப்புக் காசுகள் முதல் உத்தம சோழன், இராசராசன் காலத் தங்கக் காசுகள் வரை நீளும் நாணய மரபு.',
      },
      {
        en: 'Kodumanal bead workshops & Mannar pearls: carnelian, quartz, amethyst, beryl, and natural pearls exported for Roman gold aurei and Southeast Asian camphor.',
        ta: 'கொடுமணல் சூதுபவளம், பச்சைக் கல் (Beryl) மற்றும் மன்னார் முத்துக்கள்: உரோமானியத் தங்க நாணயங்களையும் தென்கிழக்காசிய நறுமணப் பொருட்களையும் ஈர்த்த வாணிபம்.',
      },
      {
        en: 'Ainnūṟṟuvar (Five Hundred) & Maṇigrāmam guilds: Tamil merchant inscriptions at Lobu Tua / Barus (Sumatra, 1088 CE) and diplomatic missions to Song China (1015, 1033, 1077 CE).',
        ta: 'ஐந்நூற்றுவர் மற்றும் மணிக்கிராமம் வணிகக் குழுக்கள்: சுமத்திராவின் பாரூஸ் தமிழ்க் கல்வெட்டும் (பொ.ஆ. 1088) சீனச் சாங் அரசவைத் தூதுக்குழுக்களும் (1015, 1033, 1077).',
      },
    ],
    records: [
      {
        id: 'tiger-coins-kasu',
        title: {
          en: 'Sangam Square Tiger Coins to Imperial Gold Kāsu',
          ta: 'சங்க காலச் சதுரப் புலிக் காசுகளும் சோழர் பொற்காசுகளும்',
        },
        period: { en: '3rd c. BCE – 12th c. CE', ta: 'பொ.ஆ.மு. 3 நூற். – பொ.ஆ. 12 நூற்.' },
        evidenceKind: 'Archaeology',
        body: {
          en: 'Die-struck rectangular copper coins recovered from Kaveripoompattinam and the Amaravati/Kaveri beds display the standing Chola tiger with raised tail on the obverse and elephant/railing motifs on the reverse; Imperial Cholas later issued standardized gold mādai and kāsu calibrated against the kalanju gold-seed weight.',
          ta: 'காவிரிப்பூம்பட்டினத்திலும் காவிரிப்படுகையிலும் கிடைத்த சதுரச் செப்புக் காசுகளில் வால் உயர்த்திய புலிச் சின்னமும் மறுபுறம் யானை வடிவமும் உள்ளன; பிற்காலச் சோழர்கள் கழஞ்சு எடைத் தரத்தில் பொன் மாடை மற்றும் காசுகளை வெளியிட்டனர்.',
        },
      },
      {
        id: 'gems-pearls-arikamedu',
        title: {
          en: 'Carnelian, Beryl, Pearls & Indo-Roman Trade',
          ta: 'மணிக்கற்கள், முத்துக்கள் மற்றும் கடல் வாணிபம்',
        },
        period: { en: 'Sangam era · Kodumanal, Puhar & Arikamedu', ta: 'சங்க காலம் · கொடுமணல், புகார், அரிக்கமேடு' },
        evidenceKind: 'Archaeology',
        body: {
          en: 'TNSDA’s Kodumanal excavations recovered urn hoards of 782 etched and plain carnelian beads alongside quartz and beryl drills, while Arikamedu yielded Mediterranean wine amphorae and Arretine stamps — confirming Sangam poems describing Yavana ships bringing gold and departing laden with pepper, pearls, and gems.',
          ta: 'கொடுமணல் அகழாய்வில் ஒரே தாழியில் 782 சூதுபவள மணிகளும் பளிங்கு-பச்சைக்கல் பட்டறைகளும் கிடைத்தன; அரிக்கமேட்டில் கிடைத்த உரோமானிய ஆம்போரா சாடிகள், யவனர் பொன் சுமந்து வந்து மிளகும் முத்தும் ஏற்றிச் சென்ற சங்கப் பாடல்களுக்குச் சான்றளிக்கின்றன.',
        },
      },
      {
        id: 'kumizhi-sluice',
        title: {
          en: 'Kumizhi Thoombu Sluices & Kaveri Agrarian Wealth',
          ta: 'குமிழித் தூம்பும் காவிரி வேளாண் பொறியியலும்',
        },
        period: { en: 'Early to Imperial Chola', ta: 'முற்காலம் முதல் பிற்காலச் சோழர் வரை' },
        evidenceKind: 'Archaeology',
        body: {
          en: 'Chola hydraulic engineers installed two-vent granite Kumizhi Thoombu sluices on deep irrigation tanks: raising the upper plug released clear irrigation water into field channels while bottom hydro-pressure flushed silt out automatically — preserving tank capacity across generations.',
          ta: 'ஏரிகளின் ஆழத்தில் அமைக்கப்பட்ட கருங்கல் ‘குமிழித் தூம்பு’ வழியாகப் பாசனத்திற்குத் தெளிந்த நீரை அனுப்பும் அதே வேளையில், அடிமட்ட நீர் அழுத்தத்தால் வண்டல் சேற்றையும் தானாக வெளியேற்றி ஏரிகளின் கொள்ளளவைச் சோழர் பொறியாளர்கள் பாதுகாத்தனர்.',
        },
      },
      {
        id: 'merchant-guilds-china',
        title: {
          en: 'Ainnūṟṟuvar Guilds, Barus & Song-Dynasty Embassies',
          ta: 'ஐந்நூற்றுவர் வணிகக் குழுவும் சீனத் தொடர்பும்',
        },
        period: { en: '1015 – 1279 CE', ta: 'பொ.ஆ. 1015 – 1279' },
        evidenceKind: 'Epigraphy',
        body: {
          en: 'The 1088 CE Tamil stone inscription at Lobu Tua (Barus, Sumatra) records the Tisaiyāyirattu Ainnūṟṟuvar merchant guild endowing local trade welfare, while Chinese Song Annals (Song Shi) chronicle Chola diplomatic missions (Zhu-nian) bearing pearls, ivory, and glassware in 1015, 1033, and 1077 CE.',
          ta: 'சுமத்திராவின் லோபு துவா (பாரூஸ்) தமிழ்க் கல்வெட்டு (பொ.ஆ. 1088) ‘திசையாயிரத்து ஐந்நூற்றுவர்’ வணிகக் குழுவின் அறக்கொடையைப் பேசுகிறது; சீனாவின் ‘சாங் ஷி’ வரலாற்றுக் குறிப்புகள் பொ.ஆ. 1015, 1033, 1077 ஆகிய ஆண்டுகளில் முத்துக்களுடன் சென்ற சோழர் தூதுக்குழுக்களைப் பதிவு செய்துள்ளன.',
        },
      },
    ],
  },
]

export const CHOLA_TIMELINE: readonly CholaTimelineEntry[] = [
  {
    id: 'sangam-chiefdoms',
    span: { en: 'c. 300 BCE – 100 CE', ta: 'பொ.ஆ.மு. 300 – பொ.ஆ. 100' },
    rulerOrPhase: {
      en: 'Early Sangam Cholas · Ilamchetchenni & Karikala Chola',
      ta: 'சங்க காலச் சோழர் · இளஞ்சேட்சென்னி & கரிகால் பெருவளத்தான்',
    },
    epoch: 'sangam',
    capital: { en: 'Uraiyur & Kaveripoompattinam (Puhar)', ta: 'உறையூர் & காவிரிப்பூம்பட்டினம் (புகார்)' },
    note: {
      en: 'Unification after Venni; construction of the Kallanai diversion dam; brick wharf at Puhar, textile dyeing vats at Uraiyur, and brisk Indo-Roman maritime trade.',
      ta: 'வெண்ணிப் போர் வெற்றி, கல்லணை கட்டுமானம், புகார் படகுத் துறை, உறையூர் நெசவு மற்றும் இந்தோ-உரோமானியக் கடல் வாணிபம்.',
    },
    source: 'Pattinappālai, Porunārāṟṟuppaṭai, ASI Puhar & Uraiyur reports',
  },
  {
    id: 'kopperuncholan',
    span: { en: 'c. 1st – 3rd c. CE', ta: 'பொ.ஆ. 1 – 3 நூற்றாண்டு' },
    rulerOrPhase: {
      en: 'Kopperuncholan, Nalankilli, Nedunkilli & Perunarkilli',
      ta: 'கோப்பெருஞ்சோழன், நலங்கிள்ளி, நெடுங்கிள்ளி & பெருநற்கிள்ளி',
    },
    epoch: 'sangam',
    capital: { en: 'Uraiyur & Puhar', ta: 'உறையூர் & புகார்' },
    note: {
      en: 'Poet-kings and patrons of the Sangam assembly; Kopperuncholan and Pisirandaiyar immortalize Tamil Stoic equanimity and friendship in Puranānūṟu 212–223.',
      ta: 'புலவர்களைப் போற்றிய காவலர்கள்; புறநானூற்றில் (212–223) கோப்பெருஞ்சோழனும் பிசிராந்தையாரும் அறப்பெருமிதத்திற்கும் நட்பிற்கும் சான்றாயினர்.',
    },
    source: 'Puranānūṟu 27–47, 212–223; Parimelalagar on Kural 785',
  },
  {
    id: 'vijayalaya-parantaka',
    span: { en: 'c. 848 – 955 CE', ta: 'பொ.ஆ. 848 – 955' },
    rulerOrPhase: {
      en: 'Vijayalaya, Aditya I & Parantaka I',
      ta: 'விசயாலயன், முதலாம் ஆதித்தன் & முதலாம் பராந்தகன்',
    },
    epoch: 'imperial',
    capital: { en: 'Thanjavur (Tanjai)', ta: 'தஞ்சாவூர்' },
    note: {
      en: 'Capture of Thanjavur; chain of early granite temples along the Kaveri banks; Uttaramerur stone inscriptions (919 & 921 CE) establishing kuḍavōlai village governance.',
      ta: 'தஞ்சை மீட்பு, காவிரிக்கரை கற்றளிகள், குடவோலை உள்ளாட்சி விதிகளை வகுத்த உத்திரமேரூர் கல்வெட்டுகள் (பொ.ஆ. 919 & 921).',
    },
    source: 'Anbil plates; ASI Uttaramerur inscriptions',
  },
  {
    id: 'sembiyan-mahadevi',
    span: { en: 'c. 940 – 1001 CE', ta: 'பொ.ஆ. 940 – 1001' },
    rulerOrPhase: {
      en: 'Queen Sembiyan Mahadevi & Uttama Chola',
      ta: 'செம்பியன் மாதேவியார் & உத்தம சோழன்',
    },
    epoch: 'imperial',
    capital: { en: 'Thanjavur & Konerirajapuram', ta: 'தஞ்சாவூர் & கோனேரிராசபுரம்' },
    note: {
      en: 'Six decades of cultural patronage rebuilding brick shrines in granite while preserving older inscriptions verbatim, and commissioning the most slender, expressive cire perdue bronzes.',
      ta: 'பழைய கல்வெட்டுகளைப் படியெடுத்துப் பாதுகாத்துக் கற்றளிகள் எழுப்பியதோடு, ஈடுஇணையற்ற மெழுகு-உருக்குச் செப்புத் திருமேனிகளை வார்ப்பித்த பொற்காலம்.',
    },
    source: 'Konerirajapuram inscriptions; Government Museum Chennai bronzes',
  },
  {
    id: 'rajaraja-i',
    span: { en: '985 – 1014 CE', ta: 'பொ.ஆ. 985 – 1014' },
    rulerOrPhase: {
      en: 'Rajaraja Chola I (Arulmozhivarman)',
      ta: 'முதலாம் இராசராச சோழன் (அருண்மொழிவர்மன்)',
    },
    epoch: 'imperial',
    capital: { en: 'Thanjavur', ta: 'தஞ்சாவூர்' },
    note: {
      en: 'Consecration of Rajarajeswaram (1010 CE), comprehensive Valanadu land revenue survey, preservation of Tirumurai hymns, naval expeditions across Sri Lanka and the Maldives, and first mission to Song China.',
      ta: 'தஞ்சைப் பெருவுடையார் கோவில் (பொ.ஆ. 1010), துல்லியமான நில அளவை, திருமுறை மீட்பு, இலங்கை-மாலத்தீவு கடற்படை வெற்றிகள் மற்றும் சீனத் தூதுக்குழு.',
    },
    source: 'South Indian Inscriptions Vol. II (Thanjavur); Leiden plates',
  },
  {
    id: 'rajendra-kulottunga',
    span: { en: '1014 – 1279 CE', ta: 'பொ.ஆ. 1014 – 1279' },
    rulerOrPhase: {
      en: 'Rajendra I, Kulottunga I & Later Cholas through Rajendra III',
      ta: 'முதலாம் இராசேந்திரன், முதலாம் குலோத்துங்கன் – மூன்றாம் இராசேந்திரன்',
    },
    epoch: 'imperial',
    capital: { en: 'Gangaikonda Cholapuram & Darasuram', ta: 'கங்கைகொண்ட சோழபுரம் & தாராசுரம்' },
    note: {
      en: 'Foundation of Gangaikonda Cholapuram & Cholaganga tank, 1025 CE trans-oceanic Kadaram/Srivijaya expedition, Kulottunga’s abolition of tolls (Sungam Tavirtta), Darasuram Airavatesvara sculpture, and flourishing Ainnūṟṟuvar trade guilds.',
      ta: 'கங்கைகொண்ட சோழபுரம் & சோழகங்கம் பேரேரி, பொ.ஆ. 1025 கடாரம் கடற்படை வெற்றி, சுங்கம் தவிர்த்த குலோத்துங்கன் ஆட்சி, தாராசுரம் சிற்பக் கலை மற்றும் கடல் கடந்த வணிகக் குழுக்கள்.',
    },
    source: 'Thiruvalangadu plates; Thanjavur prasasti; Song Shi annals',
  },
]
