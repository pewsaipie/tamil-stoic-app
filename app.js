const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const profileKey = 'tamilStoicProfile';
const savedKey = 'tamilStoicSavedQuotes';
const feedbackKey = 'tamilStoicFeedback';
let quotes = [];
let currentQuote = null;
let feedIndex = 0;
let activeFilter = 'all';
let profile = JSON.parse(localStorage.getItem(profileKey) || '{"themes":[],"mood":"","language":"both"}');
let savedIds = new Set(JSON.parse(localStorage.getItem(savedKey) || '[]'));
let feedback = JSON.parse(localStorage.getItem(feedbackKey) || '{}');

const toast = (message) => { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => node.classList.remove('show'), 2600); };
const saveProfile = () => localStorage.setItem(profileKey, JSON.stringify(profile));
const saveSaved = () => { savedIds = new Set(savedIds); localStorage.setItem(savedKey, JSON.stringify([...savedIds])); updateSavedCount(); renderSaved(); };
const updateSavedCount = () => { $('#saved-count').textContent = savedIds.size; };
const escapeText = (value) => String(value ?? '');

function scoreQuote(quote) {
  const themes = [...(profile.themes || [])];
  let score = 0;
  quote.themes.forEach(theme => { if (themes.includes(theme)) score += 10; });
  if (profile.mood && quote.themes.includes(profile.mood)) score += 8;
  if (feedback[quote.id] === 'helpful') score += 3;
  if (feedback[quote.id] === 'not-for-me') score -= 8;
  if (savedIds.has(quote.id)) score += 1;
  return score;
}
function rankedQuotes() { return [...quotes].sort((a,b) => scoreQuote(b) - scoreQuote(a)); }

function setApiStatus(kind, text) { const status = $('.api-status'); status.className = `api-status ${kind}`; $('#status-text').textContent = text; }
async function loadQuotes() {
  try {
    const responses = await Promise.all([fetch('/api/quotes?limit=50&offset=0'), fetch('/api/quotes?limit=50&offset=50')]);
    if (responses.some(response => !response.ok)) throw new Error(`API ${responses.find(response => !response.ok)?.status}`);
    const payloads = await Promise.all(responses.map(response => response.json()));
    quotes = payloads.flatMap(payload => Array.isArray(payload.data) ? payload.data : []);
    if (!quotes.length) throw new Error('No published quotes');
    const corpusStatus = payloads[0].meta?.corpus_status || '';
    setApiStatus('ok', corpusStatus.includes('pending') ? 'Cited draft library connected' : 'Quote library connected');
    $('#feed-count').textContent = payloads[0].meta?.total ?? quotes.length;
    $('#result-count').textContent = `${quotes.length} passages`;
    renderRecommendation(true);
    renderResults();
    renderSaved();
  } catch (error) {
    setApiStatus('error', 'Quote library unavailable');
    $('#quote-card').innerHTML = `<div class="empty-state"><strong>We could not reach the quote API.</strong><br>Check your connection or run this site with <code>npm run dev</code> so Netlify Functions are available.</div>`;
    $('#feed-count').textContent = '—';
    console.error(error);
  }
}

function quoteCard(quote, compact = false) {
  const item = document.createElement('article');
  item.className = compact ? 'result-card' : 'quote-card';
  const header = document.createElement('div'); header.className = 'quote-header';
  const source = document.createElement('span'); source.className = 'source'; source.textContent = `${quote.work.title} · ${quote.provenance.locator.split(', ').pop()}`;
  const actions = document.createElement('div'); actions.className = 'quote-actions';
  const save = document.createElement('button'); save.className = `icon-button ${savedIds.has(quote.id) ? 'saved' : ''}`; save.setAttribute('aria-label', savedIds.has(quote.id) ? 'Remove saved passage' : 'Save passage'); save.textContent = savedIds.has(quote.id) ? '♥' : '♡'; save.addEventListener('click', (event) => { event.stopPropagation(); toggleSaved(quote); });
  actions.append(save); header.append(source, actions); item.append(header);
  const tamil = document.createElement('p'); tamil.className = 'quote-tamil'; tamil.lang = 'ta'; tamil.textContent = quote.tamil.text; tamil.hidden = profile.language === 'en'; item.append(tamil);
  const rule = document.createElement('div'); rule.className = 'quote-rule'; item.append(rule);
  const english = document.createElement('p'); english.className = 'quote-english'; english.textContent = `“${quote.english.text}”`; english.hidden = profile.language === 'ta'; item.append(english);
  if (!compact) {
    const context = document.createElement('div'); context.className = 'quote-context'; context.textContent = quote.editorial_summary || 'A reviewed passage from the Tamil Stoic source library.'; item.append(context);
    const footer = document.createElement('div'); footer.className = 'quote-footer';
    const author = document.createElement('span'); author.textContent = `${quote.work.author} · ${quote.english.translator}`;
    const sourceLink = document.createElement('a'); sourceLink.href = quote.provenance.url; sourceLink.target = '_blank'; sourceLink.rel = 'noreferrer'; sourceLink.textContent = 'View source ↗'; footer.append(author, sourceLink); item.append(footer);
  } else { const small = document.createElement('small'); small.textContent = `${quote.work.author} · ${quote.themes.slice(0,2).join(' · ')}`; item.append(small); item.addEventListener('click', () => { showQuote(quote); window.location.hash = 'feed'; }); }
  return item;
}
function showQuote(quote) { currentQuote = quote; $('#quote-card').replaceChildren(quoteCard(quote)); $('#recommendation-heading').textContent = profile.themes.length || profile.mood ? 'Selected for your practice' : 'A place to begin'; }
function renderRecommendation(reset = false) { if (!quotes.length) return; const list = rankedQuotes(); if (reset) feedIndex = 0; const quote = list[feedIndex % list.length]; showQuote(quote); }
function toggleSaved(quote) { if (savedIds.has(quote.id)) { savedIds.delete(quote.id); toast('Removed from your saved passages.'); } else { savedIds.add(quote.id); toast('Saved for your return.'); } saveSaved(); if (currentQuote?.id === quote.id) showQuote(quote); }
function renderSaved() { const container = $('#saved-list'); if (!quotes.length) return; const saved = quotes.filter(q => savedIds.has(q.id)); container.replaceChildren(); if (!saved.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Save a passage and it will appear here.'; container.append(empty); return; } saved.forEach(quote => { const item = quoteCard(quote, true); const remove = document.createElement('button'); remove.className = 'remove-save'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Remove passage'); remove.addEventListener('click', () => toggleSaved(quote)); item.append(remove); container.append(item); }); }
function renderResults() { const query = ($('#search').value || '').toLowerCase().trim(); const filtered = quotes.filter(q => { const haystack = [q.tamil.text, q.english.text, q.work.title, q.work.author, q.themes.join(' ')].join(' ').toLowerCase(); return (!query || haystack.includes(query)) && (activeFilter === 'all' || q.themes.includes(activeFilter)); }); $('#result-count').textContent = `${filtered.length} passage${filtered.length === 1 ? '' : 's'}`; const container = $('#results'); container.replaceChildren(); if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'No reviewed passage matches that search yet.'; container.append(empty); return; } filtered.forEach(q => container.append(quoteCard(q, true))); }

function loadPreferences() { $$('#theme-chips button').forEach(button => button.classList.toggle('selected', profile.themes.includes(button.dataset.theme))); $('#mood').value = profile.mood || ''; $('#language').value = profile.language || 'both'; }
function applyPreferences() { profile.themes = $$('#theme-chips button.selected').map(button => button.dataset.theme); profile.mood = $('#mood').value; profile.language = $('#language').value; saveProfile(); $('#preference-message').textContent = profile.themes.length ? `Prioritising ${profile.themes.length} theme${profile.themes.length > 1 ? 's' : ''} for you.` : 'Your feed is open to the full library.'; feedIndex = 0; renderRecommendation(true); renderResults(); toast('Your feed has been updated.'); }
$$('#theme-chips button').forEach(button => button.addEventListener('click', () => button.classList.toggle('selected')));
$('#apply-preferences').addEventListener('click', applyPreferences);
$('#clear-preferences').addEventListener('click', () => { profile = { themes: [], mood: '', language: 'both' }; saveProfile(); loadPreferences(); applyPreferences(); });
$('#mood').addEventListener('change', applyPreferences);
$('#language').addEventListener('change', applyPreferences);
$('#next-quote').addEventListener('click', () => { feedIndex += 1; renderRecommendation(); toast('Here is another passage from your library.'); });
$$('[data-feedback]').forEach(button => button.addEventListener('click', () => { if (!currentQuote) return; feedback[currentQuote.id] = button.dataset.feedback; localStorage.setItem(feedbackKey, JSON.stringify(feedback)); $('#feedback-note').textContent = button.dataset.feedback === 'helpful' ? 'We will show more like this.' : 'We will adjust your feed.'; if (button.dataset.feedback === 'not-for-me') { feedIndex += 1; setTimeout(() => renderRecommendation(), 180); } }));
$('#search-button').addEventListener('click', renderResults);
$('#search').addEventListener('input', renderResults);
$('#search').addEventListener('keydown', event => { if (event.key === 'Enter') renderResults(); });
$$('.filter').forEach(button => button.addEventListener('click', () => { $$('.filter').forEach(b => b.classList.remove('active')); button.classList.add('active'); activeFilter = button.dataset.filter; renderResults(); }));
$('#export-saved').addEventListener('click', () => { const saved = quotes.filter(q => savedIds.has(q.id)); if (!saved.length) { toast('Save a passage before exporting.'); return; } const text = saved.map(q => `${q.work.title} · ${q.provenance.locator}\n${q.tamil.text}\n“${q.english.text}”\nSource: ${q.provenance.url}`).join('\n\n'); const url = URL.createObjectURL(new Blob([`Tamil Stoic — saved passages\n\n${text}`], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'tamil-stoic-saved-passages.txt'; link.click(); URL.revokeObjectURL(url); toast('Your saved passages were exported.'); });
let deferredInstallPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; $('#install-app').hidden = false; });
$('#install-app').addEventListener('click', async () => { if (!deferredInstallPrompt) { toast('Use your browser menu and choose “Add to Home screen”.'); return; } deferredInstallPrompt.prompt(); const result = await deferredInstallPrompt.userChoice; if (result.outcome === 'accepted') toast('Tamil Stoic was added to your home screen.'); deferredInstallPrompt = null; $('#install-app').hidden = true; });
window.addEventListener('appinstalled', () => { $('#install-app').hidden = true; toast('Tamil Stoic is ready on your home screen.'); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(error => console.info('Offline shell unavailable:', error.message));
window.addEventListener('offline', () => { setApiStatus('error', 'Offline · showing saved library'); toast('You are offline. Saved passages remain available.'); });
window.addEventListener('online', () => { setApiStatus('ok', 'Quote library connected'); toast('Connection restored.'); });
loadPreferences(); updateSavedCount(); loadQuotes();
