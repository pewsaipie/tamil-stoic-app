/**
 * Ask Valluvar — the intent taxonomy (c10).
 *
 * This file is data, and it is shared by three consumers:
 *
 *   1. `scripts/train-intent.mjs` — turns the keyword sets and templates below
 *      into the training corpus for the classifier, then quantises the model;
 *   2. `src/lib/intentClassifier.ts` — the runtime that scores a reader's words
 *      against that model;
 *   3. `src/lib/askValluvar.ts` — which turns the winning intent into an answer:
 *      a couplet drawn from the intent's chapters, with the chapter named.
 *
 * Every intent points at **chapters of the corpus itself** (`chapters: number[]`),
 * never at a hand-picked list of couplets, so the answer can only ever quote
 * Thirukkural text that is already in the app's data — and the chapter name that
 * comes with it is the corpus's own Tamil and English name for that chapter.
 *
 * Two intents are special and never answer with a couplet: `crisis` (self-harm,
 * suicidal thoughts) and `abuse` (violence, assault). They route to the support
 * card instead — see `src/lib/askValluvar.ts` and `docs/ask-valluvar.md`.
 */

export interface AskIntent {
  id: string
  /** Tamil label shown in the reply header. */
  ta: string
  /** English label, used by the English interface. */
  en: string
  /** Chapters whose couplets can answer this intent. Empty = never a couplet. */
  chapters: number[]
  /** Tamil-script trigger words (the core keyword shown back to the reader). */
  keywords: string[]
  /** Romanised Tamil and English trigger words — how most readers type. */
  romanised: string[]
  /** Whole sentences a reader might actually write, in either script. */
  examples: string[]
  /** How the reply opens, before the couplet. */
  framing: { ta: string; en: string }
}

/**
 * Sentence frames the trainer combines with each keyword. Words carry the
 * meaning; frames teach the model that a keyword can arrive inside a sentence —
 * "எனக்கு கோபம் வருகிறது", "enakku kovam varudhu", "i feel angry".
 */
export const TAMIL_FRAMES = [
  '{kw}',
  'எனக்கு {kw} இருக்கிறது',
  'எனக்கு {kw} வருகிறது',
  'என் {kw}',
  '{kw} ஆக இருக்கிறேன்',
  '{kw} ஆக இருக்கிறது',
  '{kw} பற்றி யோசிக்கிறேன்',
  '{kw} தான் பிரச்சனை',
]

export const ROMAN_FRAMES = [
  '{kw}',
  'enakku {kw} irukku',
  'enakku {kw} varudhu',
  'i am {kw}',
  'i feel {kw}',
  'feeling {kw}',
  '{kw} problem',
  '{kw} irukku',
]

export const ASK_INTENTS: readonly AskIntent[] = [
  {
    id: 'anger',
    ta: 'சினம்',
    en: 'Anger',
    chapters: [31, 32, 16],
    keywords: ['கோபம்', 'கோப', 'சினம்', 'எரிச்சல்', 'கடுப்பு', 'கோபமா', 'வெறுப்பு'],
    romanised: ['kovam', 'kobam', 'sinam', 'erichal', 'kaduppu', 'angry', 'anger', 'rage', 'furious', 'irritated'],
    examples: ['எனக்கு கோபம் வருகிறது', 'enakku romba kovam varudhu', 'I get angry very fast'],
    framing: { ta: 'சினம் அடங்குவது பற்றி வள்ளுவர்:', en: 'Valluvar on mastering anger:' },
  },
  {
    id: 'fear',
    ta: 'பயம்',
    en: 'Fear and worry',
    chapters: [63, 60, 48],
    keywords: ['பயம்', 'அச்சம்', 'கவலை', 'பதற்றம்', 'நடுக்கம்', 'தயக்கம்'],
    romanised: ['bayam', 'payam', 'acham', 'kavala', 'kavalai', 'padhatram', 'fear', 'afraid', 'scared', 'anxiety', 'anxious', 'tension', 'worried', 'worry'],
    examples: ['எனக்கு பயமாக இருக்கிறது', 'enakku bayama irukku', 'I am anxious about everything'],
    framing: { ta: 'அச்சத்தை வெல்வது பற்றி வள்ளுவர்:', en: 'Valluvar on standing firm in fear:' },
  },
  {
    id: 'grief',
    ta: 'துக்கம்',
    en: 'Grief and loss',
    chapters: [34, 117, 120, 35],
    keywords: ['துக்கம்', 'சோகம்', 'இழப்பு', 'அழுகை', 'வேதனை', 'துயரம்', 'இறப்பு'],
    romanised: ['dukkam', 'thukkam', 'sogam', 'izhappu', 'azhugai', 'vedhanai', 'grief', 'grieving', 'sad', 'sadness', 'loss', 'passed away', 'died', 'death in family'],
    examples: ['என் அம்மா இறந்து விட்டார்', 'someone close to me passed away', 'I have been crying for days'],
    framing: { ta: 'துன்பத்தின் நிலையாமை பற்றி வள்ளுவர்:', en: 'Valluvar on bearing loss:' },
  },
  {
    id: 'loneliness',
    ta: 'தனிமை',
    en: 'Loneliness',
    chapters: [120, 116, 53, 79],
    keywords: ['தனிமை', 'தனியாக', 'யாரும் இல்லை', 'தோழமை'],
    romanised: ['thanimai', 'thaniya', 'lonely', 'loneliness', 'alone', 'no one', 'nobody', 'friend illa'],
    examples: ['நான் மிகவும் தனியாக இருக்கிறேன்', 'I feel lonely even in a crowd', 'yaarum illa maathiri irukku'],
    framing: { ta: 'தனிமையிலும் துணை பற்றி வள்ளுவர்:', en: 'Valluvar on company and kinship:' },
  },
  {
    id: 'hope',
    ta: 'நம்பிக்கை',
    en: 'Hope in trouble',
    chapters: [63, 60, 61, 49],
    keywords: ['நம்பிக்கை', 'விடிவு', 'சோர்வு', 'ஊக்கம்', 'மனஉறுதி'],
    romanised: ['nambikkai', 'vidivu', 'sorvu', 'ooham', 'hope', 'hopeless', 'give up', 'giving up', 'tired of trying', 'morale'],
    examples: ['எனக்கு நம்பிக்கை இல்லை', 'I feel like giving up', 'ellame mudinja maathiri irukku'],
    framing: { ta: 'இடுக்கண் வரும்போது வள்ளுவர்:', en: 'Valluvar on not sinking in trouble:' },
  },
  {
    id: 'failure',
    ta: 'தோல்வி',
    en: 'Failure and setback',
    chapters: [63, 62, 67, 38],
    keywords: ['தோல்வி', 'தோற்றேன்', 'முடியவில்லை', 'தடை'],
    romanised: ['tholvi', 'thotten', 'mudiyala', 'failure', 'failed', 'fail', 'setback', 'rejected', 'did not work'],
    examples: ['நான் தோல்வி அடைந்தேன்', 'I failed my exam again', 'ennala mudiyala'],
    framing: { ta: 'முயற்சி தளராமை பற்றி வள்ளுவர்:', en: 'Valluvar on effort that does not fail you:' },
  },
  {
    id: 'procrastination',
    ta: 'சோம்பல்',
    en: 'Sloth and delay',
    chapters: [61, 60, 54],
    keywords: ['சோம்பல்', 'தள்ளிப்போடு', 'ஒத்திவைப்பு', 'மடி'],
    romanised: ['sombal', 'thallipodu', 'othivaippu', 'madi', 'procrastinate', 'procrastination', 'lazy', 'laziness', 'putting off', 'delay', 'cannot start'],
    examples: ['நான் எப்போதும் தள்ளிப் போடுகிறேன்', 'I keep procrastinating my work', 'sombal pidichirukku'],
    framing: { ta: 'மடியின்மை பற்றி வள்ளுவர்:', en: 'Valluvar on doing it now:' },
  },
  {
    id: 'work',
    ta: 'உழைப்பு',
    en: 'Work and effort',
    chapters: [62, 104, 67, 60],
    keywords: ['வேலை', 'உழைப்பு', 'பணிச்சுமை', 'முயற்சி'],
    romanised: ['vela', 'velai', 'uzhaippu', 'panichumai', 'muyarchi', 'work', 'job', 'office', 'workload', 'hard work', 'busy'],
    examples: ['என் வேலை மிகவும் கடினமாக உள்ளது', 'too much work pressure', 'vela pressure jaasthi'],
    framing: { ta: 'உழைப்பின் வலிமை பற்றி வள்ளுவர்:', en: 'Valluvar on the worth of one’s own effort:' },
  },
  {
    id: 'study',
    ta: 'கல்வி',
    en: 'Study and exams',
    chapters: [40, 42, 43],
    keywords: ['படிப்பு', 'தேர்வு', 'கல்வி', 'மாணவர்', 'பாடம்'],
    romanised: ['padipu', 'thervu', 'kalvi', 'maanavar', 'paadam', 'study', 'exam', 'exams', 'college', 'school', 'marks', 'learning'],
    examples: ['எனக்கு படிப்பில் கவனம் இல்லை', 'I am scared of my exams', 'padippu mudiyala'],
    framing: { ta: 'கல்வியின் பெருமை பற்றி வள்ளுவர்:', en: 'Valluvar on learning:' },
  },
  {
    id: 'money',
    ta: 'பணம்',
    en: 'Money and hardship',
    chapters: [105, 76, 107, 106],
    keywords: ['பணம்', 'கடன்', 'வறுமை', 'செலவு', 'வருமானம்'],
    romanised: ['panam', 'kadan', 'varumai', 'selavu', 'varumanam', 'money', 'debt', 'loan', 'poor', 'poverty', 'salary', 'expenses', 'no money'],
    examples: ['எனக்கு பணப் பிரச்சனை', 'I am in debt and cannot sleep', 'kadan jaasthi'],
    framing: { ta: 'வறுமையையும் பொருளையும் பற்றி வள்ளுவர்:', en: 'Valluvar on hardship and substance:' },
  },
  {
    id: 'greed',
    ta: 'பேராசை',
    en: 'Greed and craving',
    chapters: [18, 37, 101],
    keywords: ['பேராசை', 'ஆசை', 'பொறாமை இல்லை', 'வெஃகுதல்'],
    romanised: ['perasai', 'aasai', 'greed', 'greedy', 'craving', 'wanting more', 'covet', 'never satisfied'],
    examples: ['எனக்கு எப்போதும் ஆசை அதிகம்', 'I always want more than I have', 'perasai than'],
    framing: { ta: 'ஆசையை அறுப்பது பற்றி வள்ளுவர்:', en: 'Valluvar on curbing desire:' },
  },
  {
    id: 'friendship',
    ta: 'நட்பு',
    en: 'Friendship',
    chapters: [79, 81, 53],
    keywords: ['நட்பு', 'நண்பன்', 'தோழன்', 'தோழி', 'சிநேகம்'],
    romanised: ['natpu', 'nanban', 'thozhan', 'thozhi', 'snegam', 'friend', 'friends', 'friendship', 'best friend'],
    examples: ['எனக்கு நல்ல நண்பர்கள் வேண்டும்', 'how do I find true friends', 'nanban illa'],
    framing: { ta: 'நட்பின் அளவு பற்றி வள்ளுவர்:', en: 'Valluvar on friendship:' },
  },
  {
    id: 'betrayal',
    ta: 'துரோகம்',
    en: 'Betrayal and bad company',
    chapters: [82, 83, 46, 89],
    keywords: ['துரோகம்', 'மோசடி', 'ஏமாற்றம்', 'கெட்ட நட்பு'],
    romanised: ['drogam', 'throgam', 'mosadi', 'emosanam', 'ketta natpu', 'betrayal', 'betrayed', 'cheated', 'backstabbed', 'used me', 'bad company'],
    examples: ['என் நண்பன் என்னை ஏமாற்றினான்', 'my friend betrayed me', 'nanban mosadi pannitaan'],
    framing: { ta: 'தீ நட்பை அறிவது பற்றி வள்ளுவர்:', en: 'Valluvar on false friends:' },
  },
  {
    id: 'love',
    ta: 'காதல்',
    en: 'Love',
    chapters: [113, 112, 109, 111],
    keywords: ['காதல்', 'காதலி', 'காதலன்', 'அன்பு'],
    romanised: ['kadhal', 'kadhali', 'kadhalan', 'anbu', 'love', 'in love', 'crush', 'girlfriend', 'boyfriend'],
    examples: ['எனக்கு ஒருவர் மீது காதல்', 'I am in love and confused', 'kadhal sollanum'],
    framing: { ta: 'காதலின் சிறப்பு பற்றி வள்ளுவர்:', en: 'Valluvar on love:' },
  },
  {
    id: 'separation',
    ta: 'பிரிவு',
    en: 'Separation and missing someone',
    chapters: [116, 120, 121, 123],
    keywords: ['பிரிவு', 'ஏக்கம்', 'நினைவு', 'மிஸ்'],
    romanised: ['pirivu', 'yekkam', 'ninaivu', 'miss', 'missing', 'miss him', 'miss her', 'far away', 'distance'],
    examples: ['அவளை மிகவும் மிஸ் பண்றேன்', 'I miss my home town', 'pirivu thaangala'],
    framing: { ta: 'பிரிவின் துயரம் பற்றி வள்ளுவர்:', en: 'Valluvar on separation:' },
  },
  {
    id: 'family',
    ta: 'குடும்பம்',
    en: 'Family and home',
    chapters: [5, 7, 53, 103],
    keywords: ['குடும்பம்', 'அம்மா', 'அப்பா', 'வீடு', 'பிள்ளை', 'தம்பி', 'அக்கா'],
    romanised: ['kudumbam', 'amma', 'appa', 'veedu', 'pillai', 'thambi', 'akka', 'family', 'mother', 'father', 'home', 'son', 'daughter', 'parents', 'house'],
    examples: ['என் குடும்பத்தில் பிரச்சனை', 'my parents do not understand me', 'veetla sandai'],
    framing: { ta: 'இல்வாழ்க்கை பற்றி வள்ளுவர்:', en: 'Valluvar on home and family:' },
  },
  {
    id: 'marriage',
    ta: 'திருமணம்',
    en: 'Marriage and partnership',
    chapters: [6, 5, 113],
    keywords: ['திருமணம்', 'மனைவி', 'கணவன்', 'கல்யாணம்', 'துணை'],
    romanised: ['thirumanam', 'manaivi', 'kanavan', 'kalyanam', 'thunai', 'marriage', 'married', 'wife', 'husband', 'spouse', 'partner'],
    examples: ['என் திருமண வாழ்க்கை சரியில்லை', 'we fight all the time at home', 'manaivi purinjikala'],
    framing: { ta: 'வாழ்க்கைத் துணைநலம் பற்றி வள்ளுவர்:', en: 'Valluvar on the worth of a partner:' },
  },
  {
    id: 'gratitude',
    ta: 'நன்றி',
    en: 'Gratitude',
    chapters: [11, 101],
    keywords: ['நன்றி', 'நன்றியுள்ள', 'உதவி செய்தவர்'],
    romanised: ['nandri', 'nanri', 'gratitude', 'grateful', 'thankful', 'thanks', 'helped me'],
    examples: ['என் நண்பன் செய்த உதவிக்கு நன்றி', 'I want to be more grateful', 'nandri solla'],
    framing: { ta: 'செய்ந்நன்றி அறிதல் பற்றி வள்ளுவர்:', en: 'Valluvar on gratitude:' },
  },
  {
    id: 'patience',
    ta: 'பொறுமை',
    en: 'Patience',
    chapters: [16, 12, 44],
    keywords: ['பொறுமை', 'காத்திருக்க', 'அமைதி', 'சாந்தம்'],
    romanised: ['porumai', 'kaathirukka', 'amaidhi', 'santham', 'patience', 'patient', 'waiting', 'wait for it', 'calm down'],
    examples: ['எனக்கு பொறுமை இல்லை', 'I cannot wait for anything', 'porumai illa'],
    framing: { ta: 'பொறையுடைமை பற்றி வள்ளுவர்:', en: 'Valluvar on forbearance:' },
  },
  {
    id: 'envy',
    ta: 'பொறாமை',
    en: 'Envy and comparison',
    chapters: [17, 18],
    keywords: ['பொறாமை', 'அழுக்காறு', 'போட்டி'],
    romanised: ['poramai', 'azhukkaaru', 'potti', 'envy', 'envious', 'jealous', 'jealousy', 'compare', 'comparing', 'others are better'],
    examples: ['மற்றவர்களை பார்த்து பொறாமை வருகிறது', 'I keep comparing myself with others', 'poramai paduren'],
    framing: { ta: 'அழுக்காற்றை விடுவது பற்றி வள்ளுவர்:', en: 'Valluvar on envy:' },
  },
  {
    id: 'gossip',
    ta: 'புறங்கூறல்',
    en: 'Gossip and careless words',
    chapters: [19, 20, 65],
    keywords: ['புறங்கூறல்', 'வதந்தி', 'பேச்சு', 'வம்பு'],
    romanised: ['purakooral', 'vathandhi', 'pechu', 'vambu', 'gossip', 'rumour', 'rumor', 'talking behind', 'backbiting'],
    examples: ['என்னை பற்றி வதந்தி பரப்புகிறார்கள்', 'people talk behind my back', 'vambu pesuraanga'],
    framing: { ta: 'புறங்கூறாமை பற்றி வள்ளுவர்:', en: 'Valluvar on speech:' },
  },
  {
    id: 'truth',
    ta: 'வாய்மை',
    en: 'Truth and honesty',
    chapters: [30, 29, 66, 28],
    keywords: ['உண்மை', 'பொய்', 'நேர்மை', 'நாணயம்'],
    romanised: ['unmai', 'poi', 'nermai', 'naanayam', 'truth', 'honest', 'honesty', 'lying', 'lie', 'integrity'],
    examples: ['நான் எப்போதும் உண்மையை சொல்ல வேண்டும்', 'someone lied to me', 'poi solla vendiyathu vanthuduchu'],
    framing: { ta: 'வாய்மை பற்றி வள்ளுவர்:', en: 'Valluvar on truth:' },
  },
  {
    id: 'decision',
    ta: 'முடிவெடுத்தல்',
    en: 'Decisions and confusion',
    chapters: [47, 51, 49, 48],
    keywords: ['முடிவு', 'குழப்பம்', 'சந்தேகம்', 'எது சரி'],
    romanised: ['mudivu', 'kuzhappam', 'sandhegam', 'decision', 'decide', 'confused', 'confusion', 'which one', 'cannot decide', 'doubt'],
    examples: ['என்ன முடிவு எடுக்க வேண்டும் என்று தெரியவில்லை', 'I am confused about my career', 'mudivu edukka mudiyala'],
    framing: { ta: 'ஆராய்ந்து செயல் பற்றி வள்ளுவர்:', en: 'Valluvar on deciding well:' },
  },
  {
    id: 'leadership',
    ta: 'தலைமை',
    en: 'Leadership and responsibility',
    chapters: [39, 55, 58, 64],
    keywords: ['தலைமை', 'பொறுப்பு', 'ஆட்சி', 'நிர்வாகம்'],
    romanised: ['thalaivai', 'poruppu', 'aatchi', 'nirvagam', 'leadership', 'leader', 'manager', 'boss', 'responsibility', 'team', 'in charge'],
    examples: ['நான் என் குழுவை எப்படி வழிநடத்துவது', 'my team does not listen to me', 'thalaivai kashdam'],
    framing: { ta: 'செங்கோன்மை பற்றி வள்ளுவர்:', en: 'Valluvar on leading with justice:' },
  },
  {
    id: 'habit',
    ta: 'பழக்க அடிமை',
    en: 'Drink, gambling and habit',
    chapters: [93, 94, 61],
    keywords: ['குடி', 'மது', 'சூது', 'போதை', 'புகை'],
    romanised: ['kudi', 'madhu', 'suthu', 'pothe', 'pugai', 'drink', 'drinking', 'alcohol', 'liquor', 'gambling', 'betting', 'addiction', 'addicted', 'substance'],
    examples: ['எனக்கு மது பழக்கம் போகவில்லை', 'I want to stop drinking', 'kudiyai nirutha mudiyala'],
    framing: { ta: 'கள்ளுண்ணாமை பற்றி வள்ளுவர்:', en: 'Valluvar on drink and gambling:' },
  },
  {
    id: 'health',
    ta: 'உடல்நலம்',
    en: 'Health',
    chapters: [95, 60, 34],
    keywords: ['உடம்பு', 'நோய்', 'உடல்நலம்', 'மருந்து'],
    romanised: ['udambu', 'nooi', 'udalanalam', 'marundhu', 'health', 'illness', 'sick', 'ill', 'hospital', 'unwell', 'fever'],
    examples: ['என் உடம்பு சரியில்லை', 'I have been unwell for weeks', 'udambu sari illa'],
    framing: { ta: 'மருந்தும் மனவுறுதியும் பற்றி வள்ளுவர்:', en: 'Valluvar on health and remedy:' },
  },
  {
    id: 'impermanence',
    ta: 'நிலையாமை',
    en: 'Change and impermanence',
    chapters: [34, 35, 36, 1],
    keywords: ['நிலையாமை', 'மாற்றம்', 'மரணம்', 'காலம் ஓடுகிறது'],
    romanised: ['nilaiyamai', 'maatram', 'maranam', 'change', 'impermanence', 'everything changes', 'time passes', 'mortality'],
    examples: ['எல்லாம் மாறிக்கொண்டே இருக்கிறது', 'life feels temporary', 'ellame maarudhu'],
    framing: { ta: 'நிலையாமை பற்றி வள்ளுவர்:', en: 'Valluvar on impermanence:' },
  },
  {
    id: 'faith',
    ta: 'இறை நம்பிக்கை',
    en: 'Faith',
    chapters: [1, 2, 3, 36],
    keywords: ['கடவுள்', 'இறை', 'பக்தி', 'வழிபாடு', 'ஆன்மா'],
    romanised: ['kadavul', 'irai', 'iraivan', 'bakthi', 'vazhipadu', 'aanma', 'god', 'faith', 'prayer', 'pray', 'spiritual', 'divine'],
    examples: ['எனக்கு இறை நம்பிக்கை குறைகிறது', 'I cannot pray anymore', 'irai paakala'],
    framing: { ta: 'இறை வாழ்த்து பற்றி வள்ளுவர்:', en: 'Valluvar on the divine:' },
  },
  {
    id: 'giving',
    ta: 'ஈகை',
    en: 'Giving and service',
    chapters: [23, 22, 25, 9],
    keywords: ['தானம்', 'ஈகை', 'உதவி', 'கொடை'],
    romanised: ['dhanam', 'igai', 'udhavi', 'kodai', 'giving', 'give', 'charity', 'donate', 'help others', 'generosity', 'serve'],
    examples: ['மற்றவர்களுக்கு உதவ வேண்டும் என்று நினைக்கிறேன்', 'I want to give back', 'udhavi panna aasai'],
    framing: { ta: 'ஈகை பற்றி வள்ளுவர்:', en: 'Valluvar on giving:' },
  },
  {
    id: 'compassion',
    ta: 'இரக்கம்',
    en: 'Compassion',
    chapters: [25, 32, 33, 26],
    keywords: ['இரக்கம்', 'பரிவு', 'கருணை', 'அன்பு'],
    romanised: ['irakkam', 'parivu', 'karunai', 'compassion', 'kindness', 'kind', 'mercy', 'empathy'],
    examples: ['எனக்கு இரக்கம் அதிகம்', 'I cannot watch others suffer', 'karunai kammi illa'],
    framing: { ta: 'அருளுடைமை பற்றி வள்ளுவர்:', en: 'Valluvar on compassion:' },
  },
  {
    id: 'equality',
    ta: 'சமத்துவம்',
    en: 'Fairness and equality',
    chapters: [12, 58],
    keywords: ['சமத்துவம்', 'நீதி', 'பாகுபாடு', 'அநீதி'],
    romanised: ['samathuvam', 'needhi', 'paguupadu', 'aneedhi', 'equality', 'fairness', 'fair', 'justice', 'unfair', 'discrimination', 'caste'],
    examples: ['என் அலுவலகத்தில் பாகுபாடு', 'I face discrimination at work', 'aneedhi nadakudhu'],
    framing: { ta: 'நடுவு நிலைமை பற்றி வள்ளுவர்:', en: 'Valluvar on even justice:' },
  },
  {
    id: 'insult',
    ta: 'மானம்',
    en: 'Insult and honour',
    chapters: [97, 98, 102, 52],
    keywords: ['அவமானம்', 'மரியாதை', 'மானம்', 'இகழ்ச்சி'],
    romanised: ['avamaanam', 'mariyathai', 'maanam', 'igazhchi', 'insult', 'insulted', 'disrespected', 'humiliated', 'shamed'],
    examples: ['என்னை அவமானப்படுத்திவிட்டார்கள்', 'I was insulted in front of everyone', 'avamaanam thaangala'],
    framing: { ta: 'மானம் பற்றி வள்ளுவர்:', en: 'Valluvar on honour:' },
  },
  {
    id: 'selfworth',
    ta: 'தன்னம்பிக்கை',
    en: 'Self-worth and confidence',
    chapters: [60, 98, 100, 96],
    keywords: ['தன்னம்பிக்கை', 'திறமை', 'மதிப்பு', 'பயன் இல்லை'],
    romanised: ['thannambikkai', 'thiramai', 'mathippu', 'confident', 'confidence', 'self worth', 'not good enough', 'useless', 'worthless', 'no talent'],
    examples: ['எனக்கு தன்னம்பிக்கை இல்லை', 'I feel useless at everything', 'naan onnum illa'],
    framing: { ta: 'ஊக்கம் உடைமை பற்றி வள்ளுவர்:', en: 'Valluvar on your own worth:' },
  },
  {
    id: 'forgiveness',
    ta: 'மன்னிப்பு',
    en: 'Forgiveness',
    chapters: [16, 31, 32],
    keywords: ['மன்னிப்பு', 'மன்னிக்க', 'பகை', 'காயம்'],
    romanised: ['mannippu', 'mannikka', 'pagai', 'kaayam', 'forgive', 'forgiveness', 'forgave', 'grudge', 'revenge'],
    examples: ['எனக்கு துரோகம் செய்தவரை மன்னிக்க முடியவில்லை', 'I cannot forgive him', 'mannikka mudiyala'],
    framing: { ta: 'மன்னிப்பும் பொறையும் பற்றி வள்ளுவர்:', en: 'Valluvar on forgiveness:' },
  },
  {
    id: 'time',
    ta: 'காலம்',
    en: 'Time and timing',
    chapters: [49, 54, 50],
    keywords: ['நேரம்', 'காலம்', 'தாமதம்', 'தவறிய வாய்ப்பு'],
    romanised: ['neram', 'kaalam', 'thaamadham', 'time', 'timing', 'late', 'too late', 'no time', 'wasted time'],
    examples: ['எனக்கு நேரம் போதவில்லை', 'I think I am already too late', 'neram illa'],
    framing: { ta: 'காலம் அறிதல் பற்றி வள்ளுவர்:', en: 'Valluvar on knowing the hour:' },
  },
  {
    // The out-of-scope class. A classifier trained only on in-scope text answers
    // *every* sentence confidently, because it has never been shown what "not a
    // Thirukkural question" looks like. Greetings, small talk, and unrelated
    // questions belong here, and the app answers them with a question of its own
    // (“here is what you can ask me”) rather than with scripture.
    id: 'smalltalk',
    ta: 'வணக்கம்',
    en: 'Not a question about my situation',
    chapters: [],
    // Deliberately no lexicon entries: greetings and filler are the *model's* job
    // (they are trained below), while the lexicon stays reserved for words that
    // actually identify a subject. A three-letter pleasantry must never outrank
    // `திருமணம்` just because it matched exactly.
    // Distinctive *phrases*, not filler: multi-word entries can only match as a
    // whole, so `good morning` is caught while a stray `சரி` inside a real question
    // still belongs to the subject it appears in.
    keywords: ['எப்படி இருக்கிறீர்கள்', 'யார் நீங்கள்', 'என்ன பண்ணுறீங்க', 'நேரம் என்ன', 'வானிலை எப்படி', 'ஜோக் சொல்லுங்க'],
    romanised: [
      'what is the meaning of life',
      'meaning of life',
      'tell me a joke',
      'what is the weather',
      'who is the prime minister',
      'good morning',
      'good night',
      'how are you doing today',
    ],
    examples: [
      'hello',
      'hi',
      'vanakkam',
      'how are you',
      'நலமா',
      'சரி',
      'ok',
      'what is the meaning of life',
      'meaning of life',
      'tell me a joke',
      'good morning',
      'who are you',
      'what is the weather today',
      'test 123',
      'asdf qwerty',
    ],
    framing: { ta: '', en: '' },
  },
  {
    id: 'crisis',
    ta: 'உதவி தேவை',
    en: 'Support needed now',
    chapters: [],
    keywords: [
      'தற்கொலை',
      'தற்கொலை செய்ய',
      'சாக வேண்டும்',
      'சாகணும்',
      'வாழ முடியாது',
      'வாழ விருப்பமில்லை',
      'வாழ்க்கை வேண்டாம்',
      'என்னை கொல்ல',
      'காயப்படுத்த',
      'தாங்க முடியாது',
      'இறந்து விட',
    ],
    romanised: [
      'suicide',
      'suicidal',
      'kill myself',
      'end my life',
      'want to die',
      'wanna die',
      'better off dead',
      'no reason to live',
      'self harm',
      'harm myself',
      'cut myself',
      'cannot take it anymore',
      'life not worth',
    ],
    examples: ['நான் சாக வேண்டும் என்று நினைக்கிறேன்', 'I want to end my life', 'I cannot take this anymore'],
    framing: { ta: '', en: '' },
  },
  {
    id: 'abuse',
    ta: 'பாதுகாப்பு',
    en: 'Safety',
    chapters: [],
    keywords: [
      'அடிக்கிறான்',
      'அடிக்கிறார்',
      'வன்முறை',
      'துஷ்பிரயோகம்',
      'பாலியல் தொல்லை',
      'பயமுறுத்துகிறான்',
      'மிரட்டல்',
    ],
    romanised: [
      'abuse',
      'abusive',
      'domestic violence',
      'beats me',
      'hits me',
      'hitting me',
      'afraid of him',
      'molest',
      'molested',
      'rape',
      'threatens me',
      'violence at home',
    ],
    examples: ['வீட்டில் என்னை அடிக்கிறார்கள்', 'someone is threatening me', 'veetla adikuraanga'],
    framing: { ta: '', en: '' },
  },
]

/** Support intents answer with help lines, never with a couplet alone. */
export const SUPPORT_INTENTS = new Set(['crisis', 'abuse'])

/** Intents that are not questions about a situation: they get a question back. */
export const FALLBACK_INTENTS = new Set(['smalltalk'])

export function intentById(id: string): AskIntent | undefined {
  return ASK_INTENTS.find((intent) => intent.id === id)
}

/** The catalogues used to train the classifier, intent by intent. */
export function trainingExamples(intent: AskIntent): { text: string; intent: string }[] {
  const rows: { text: string; intent: string }[] = []
  for (const keyword of intent.keywords) {
    for (const frame of TAMIL_FRAMES) rows.push({ text: frame.replace('{kw}', keyword), intent: intent.id })
  }
  for (const keyword of intent.romanised) {
    for (const frame of ROMAN_FRAMES) rows.push({ text: frame.replace('{kw}', keyword), intent: intent.id })
  }
  for (const example of intent.examples) rows.push({ text: example, intent: intent.id })
  return rows
}
