// Content definitions shared across components.
export const SITUATIONS = [
  { id: 'anger',      ta: 'கோபம் வந்தபோது',         en: "When I'm angry",             theme: 'anger' },
  { id: 'patience',   ta: 'பொறுமை தேவை',           en: 'When I need patience',       theme: 'patience' },
  { id: 'grief',      ta: 'துன்பத்தில்',            en: "When I'm grieving",          theme: 'impermanence' },
  { id: 'fear',       ta: 'பயம் வருகிறது',          en: "When I'm afraid",            theme: 'calm' },
  { id: 'starting',   ta: 'புதிதாக தொடங்கும்போது',  en: 'Starting something new',     theme: 'effort' },
  { id: 'friends',    ta: 'நண்பர்களை நினைத்து',    en: 'Thinking of friends',        theme: 'friendship' },
  { id: 'family',     ta: 'குடும்பத்தில்',          en: 'With family',                theme: 'family' },
  { id: 'wealth',     ta: 'பொருள் தேடும்போது',      en: 'Money & work',               theme: 'wealth' },
  { id: 'words',      ta: 'பேசும் முன்',            en: 'Before I speak',             theme: 'truth' },
  { id: 'love',       ta: 'காதலில்',                en: 'In love',                    theme: 'love' },
  { id: 'learning',   ta: 'கற்கும்போது',            en: 'When learning',              theme: 'learning' },
  { id: 'wisdom',     ta: 'ஞானம் தேடி',             en: 'Looking for wisdom',         theme: 'wisdom' },
  { id: 'gratitude',  ta: 'நன்றி சொல்ல',            en: 'Feeling grateful',           theme: 'gratitude' },
  { id: 'compassion', ta: 'இரக்கம் வேண்டி',         en: 'Wanting kindness',           theme: 'compassion' },
  { id: 'equality',   ta: 'சமத்துவம்',              en: 'On equality',                theme: 'equality' },
  { id: 'governance', ta: 'ஆட்சி நினைவில்',         en: 'On leadership',              theme: 'governance' },
]

export const MOODS = [
  { id: 'heavy',   emoji: '😮‍💨', en: 'Heavy',    situations: ['grief', 'fear', 'anger', 'words'] },
  { id: 'fired',   emoji: '😤',  en: 'Fired up',  situations: ['anger', 'words'] },
  { id: 'curious', emoji: '🤔',  en: 'Curious',   situations: ['wisdom', 'learning', 'starting', 'truth', 'gratitude'] },
  { id: 'open',    emoji: '🥰',  en: 'Open',      situations: ['love', 'friends', 'family', 'compassion', 'patience'] },
]

// Reflection prompts (one per kural, chosen by stable hash).
export const REFLECTIONS = [
  { ta: 'சிந்திக்க', en: 'Sit with this for 30 seconds.' },
  { ta: 'இன்று இதை எப்படி வாழ்வது?', en: 'How could you live this today?' },
  { ta: 'ஒரு நினைவு', en: 'Call to mind one time this was true for you.' },
  { ta: 'ஒரு சிறு செயல்', en: 'What is one small action it asks of you?' },
  { ta: 'மௌனம்', en: 'Breathe once before moving on.' },
  { ta: 'யாரிடம் இதைச் சொல்வீர்கள்?', en: 'Who in your life needs to hear this today?' },
  { ta: 'எதிரில் இது', en: 'How would this change the next thing you do?' },
  { ta: 'ஏற்றல்', en: 'Where are you pushing against what is?' },
]
