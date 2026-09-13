const QUOTES = [
  {
    id: 'pm-000629',
    tamil: { text: 'இன்பம் விழையான் இடும்பை இயல்பென்பான்\nதுன்பம் உறுதல் இலன்.', script: 'Tamil', transliteration: null },
    english: { text: 'He who does not chase after pleasure, will not be shaken by the arrival of pain.', type: 'literary', translator: 'Tamil Stoic editorial team' },
    work: { title: 'திருக்குறள் (Thirukkural)', author: 'Thiruvalluvar', era: 'Sangam / post-Sangam', genre: 'Ethical literature' },
    themes: ['patience-and-endurance', 'desire-and-non-attachment'],
    editorial_summary: 'A reflection on meeting pleasure and pain with an even mind.',
    reflection_prompt: 'Where could you practice steadiness today?',
    provenance: { provider: 'Project Madurai', locator: 'Thirukkural, Kural 629', url: 'https://www.projectmadurai.org/pm_etexts/utf8/pmuni0001.html', license: 'Verify source and translation terms before production use', last_verified_at: '2026-09-13T00:00:00Z' },
    review: { status: 'draft', confidence: 'medium', version: 1 }
  },
  {
    id: 'pm-000621',
    tamil: { text: 'இடுக்கண் வருங்கால் நகுக அதனை\nஅடுத்தூர்வது அஃதொப்பது இல்.', script: 'Tamil', transliteration: null },
    english: { text: 'When adversity arrives, smile; there is nothing like it to overcome it.', type: 'literary', translator: 'Tamil Stoic editorial team' },
    work: { title: 'திருக்குறள் (Thirukkural)', author: 'Thiruvalluvar', era: 'Sangam / post-Sangam', genre: 'Ethical literature' },
    themes: ['courage-and-fear', 'patience-and-endurance'],
    editorial_summary: 'Courage can change our relationship with difficulty before it changes the difficulty itself.',
    reflection_prompt: 'What would a brave response look like in one small moment?',
    provenance: { provider: 'Project Madurai', locator: 'Thirukkural, Kural 621', url: 'https://www.projectmadurai.org/', license: 'Verify source and translation terms before production use', last_verified_at: '2026-09-13T00:00:00Z' },
    review: { status: 'draft', confidence: 'medium', version: 1 }
  },
  {
    id: 'pm-000467',
    tamil: { text: 'எண்ணித் துணிக கருமம் துணிந்தபின்\nஎண்ணுவம் என்பது இழுக்கு.', script: 'Tamil', transliteration: null },
    english: { text: 'Act after thinking; to think after acting is a mistake.', type: 'literary', translator: 'Tamil Stoic editorial team' },
    work: { title: 'திருக்குறள் (Thirukkural)', author: 'Thiruvalluvar', era: 'Sangam / post-Sangam', genre: 'Ethical literature' },
    themes: ['self-knowledge', 'discipline-and-restraint', 'work-craft-and-duty'],
    editorial_summary: 'Deliberation belongs before action, not as regret after it.',
    reflection_prompt: 'What deserves ten quiet seconds of thought before you act?',
    provenance: { provider: 'Project Madurai', locator: 'Thirukkural, Kural 467', url: 'https://www.projectmadurai.org/', license: 'Verify source and translation terms before production use', last_verified_at: '2026-09-13T00:00:00Z' },
    review: { status: 'draft', confidence: 'medium', version: 1 }
  },
  {
    id: 'pm-000039',
    tamil: { text: 'அறத்தான் வருவதே இன்பம்\nமற்றெல்லாம் புறத்த புகழும் இல.', script: 'Tamil', transliteration: null },
    english: { text: 'Joy flows from virtue; all else is only praise from without.', type: 'literary', translator: 'Tamil Stoic editorial team' },
    work: { title: 'திருக்குறள் (Thirukkural)', author: 'Thiruvalluvar', era: 'Sangam / post-Sangam', genre: 'Ethical literature' },
    themes: ['truth-and-integrity', 'joy-gratitude-and-celebration'],
    editorial_summary: 'A good life is measured by the character behind an action, not its applause.',
    reflection_prompt: 'Which good action would still matter if nobody saw it?',
    provenance: { provider: 'Project Madurai', locator: 'Thirukkural, Kural 39', url: 'https://www.projectmadurai.org/', license: 'Verify source and translation terms before production use', last_verified_at: '2026-09-13T00:00:00Z' },
    review: { status: 'draft', confidence: 'medium', version: 1 }
  },
  {
    id: 'pm-000192',
    tamil: { text: 'யாதும் ஊரே யாவரும் கேளிர்.', script: 'Tamil', transliteration: 'Yādhum ūrē yāvarum kēḷir' },
    english: { text: 'Every place is my town; everyone is my kin.', type: 'literary', translator: 'Tamil Stoic editorial team' },
    work: { title: 'புறநானூறு (Purananuru)', author: 'Kaniyan Poongundranar', era: 'Sangam', genre: 'Sangam poetry' },
    themes: ['friendship-and-community', 'nature-and-interdependence'],
    editorial_summary: 'A radical widening of belonging beyond one home or one group.',
    reflection_prompt: 'Where can you make someone feel they belong today?',
    provenance: { provider: 'Project Madurai', locator: 'Purananuru, poem 192', url: 'https://www.projectmadurai.org/', license: 'Verify source and translation terms before production use', last_verified_at: '2026-09-13T00:00:00Z' },
    review: { status: 'draft', confidence: 'medium', version: 1 }
  },
  {
    id: 'pm-000428',
    tamil: { text: 'அஞ்சுவது அஞ்சாமை பேதைமை அஞ்சுவது\nஅஞ்சல் அறிவார் தொழில்.', script: 'Tamil', transliteration: null },
    english: { text: 'Not fearing what ought to be feared is foolishness; to fear what is worthy is wisdom.', type: 'literary', translator: 'Tamil Stoic editorial team' },
    work: { title: 'திருக்குறள் (Thirukkural)', author: 'Thiruvalluvar', era: 'Sangam / post-Sangam', genre: 'Ethical literature' },
    themes: ['courage-and-fear', 'self-knowledge'],
    editorial_summary: 'Wisdom distinguishes courage from carelessness.',
    reflection_prompt: 'What deserves your attention, and what only borrows it?',
    provenance: { provider: 'Project Madurai', locator: 'Thirukkural, Kural 428', url: 'https://www.projectmadurai.org/', license: 'Verify source and translation terms before production use', last_verified_at: '2026-09-13T00:00:00Z' },
    review: { status: 'draft', confidence: 'medium', version: 1 }
  }
];

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
};
const response = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const serializeQuote = (quote) => ({
  ...quote,
  translation_rights: {
    owner: 'Tamil Stoic editorial team',
    status: 'seed-demo',
    human_reviewed: false,
    ai_assisted: false,
    note: 'Replace with a separately licensed, human-proofread translation before production corpus release.'
  }
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return response(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for published quotes.', request_id: event.headers?.['x-nf-request-id'] || 'local' } });
  const params = event.queryStringParameters || {};
  const id = params.id || event.path.split('/').pop();
  if (id && id !== 'quotes') {
    const quote = QUOTES.find((item) => item.id === id);
    return quote ? response(200, { data: serializeQuote(quote), meta: { api_version: '1.0', corpus_status: 'draft-seed', generated_at: new Date().toISOString() } }) : response(404, { error: { code: 'NOT_FOUND', message: 'Published quote not found.', request_id: event.headers?.['x-nf-request-id'] || 'local' } });
  }
  const query = String(params.q || '').toLowerCase().trim();
  const category = String(params.category || '').toLowerCase().trim();
  const work = String(params.work || '').toLowerCase().trim();
  const filtered = QUOTES.filter((quote) => {
    const haystack = [quote.tamil.text, quote.english.text, quote.work.title, quote.work.author, quote.themes.join(' ')].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (!category || quote.themes.includes(category)) && (!work || quote.work.title.toLowerCase().includes(work));
  });
  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 50);
  const offset = Math.max(Number(params.offset) || 0, 0);
  const page = filtered.slice(offset, offset + limit);
  const nextOffset = offset + limit < filtered.length ? offset + limit : null;
  return response(200, { data: page.map(serializeQuote), page: { next_cursor: nextOffset === null ? null : String(nextOffset), has_more: nextOffset !== null }, meta: { api_version: '1.0', corpus_status: 'draft-seed', total: filtered.length, generated_at: new Date().toISOString() } });
};
