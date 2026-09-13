const QUOTES = require('../../data/quotes-100.json');

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
    owner: 'Original translator credited in the Project Madurai bilingual etext',
    status: 'source-published-pending-rights-review',
    human_reviewed: false,
    ai_assisted: false,
    source_url: 'https://www.projectmadurai.org/pm_etexts/utf8/pmuni0017.html',
    note: 'English translation is reproduced from the cited Project Madurai bilingual etext; verify per-file translation terms before production use.'
  }
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return response(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for published quotes.', request_id: event.headers?.['x-nf-request-id'] || 'local' } });
  const params = event.queryStringParameters || {};
  const id = params.id || event.path.split('/').pop();
  if (id && id !== 'quotes') {
    const quote = QUOTES.find((item) => item.id === id);
    return quote ? response(200, { data: serializeQuote(quote), meta: { api_version: '1.0', corpus_status: 'project-madurai-bilingual-pending-review', generated_at: new Date().toISOString() } }) : response(404, { error: { code: 'NOT_FOUND', message: 'Published quote not found.', request_id: event.headers?.['x-nf-request-id'] || 'local' } });
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
  return response(200, { data: page.map(serializeQuote), page: { next_cursor: nextOffset === null ? null : String(nextOffset), has_more: nextOffset !== null }, meta: { api_version: '1.0', corpus_status: 'project-madurai-bilingual-pending-review', total: filtered.length, generated_at: new Date().toISOString() } });
};
