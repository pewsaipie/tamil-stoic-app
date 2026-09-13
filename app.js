const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const profileKey = 'tamilStoicProfile';
const savedKey = 'tamilStoicSavedQuotes';
const feedbackKey = 'tamilStoicFeedback';
let quotes = [];
let currentQuote = null;
let feedIndex = 0;
let activeFilter = 'all';
let profile = JSON.parse(localStorage.getItem(profileKey) || '{"themes":[],"mood":"","language":"both","translationMode":"easy"}');
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
    const firstResponse = await fetch('/api/quotes?limit=100&offset=0');
    if (!firstResponse.ok) throw new Error(`API ${firstResponse.status}`);
    const firstPayload = await firstResponse.json();
    const total = firstPayload.meta?.total || firstPayload.data?.length || 0;
    const offsets = Array.from({length: Math.ceil(total / 100)}, (_, index) => index * 100).slice(1);
    const remaining = await Promise.all(offsets.map(offset => fetch(`/api/quotes?limit=100&offset=${offset}`)));
    if (remaining.some(response => !response.ok)) throw new Error('Unable to load all quote pages');
    const payloads = [firstPayload, ...await Promise.all(remaining.map(response => response.json()))];
    quotes = payloads.flatMap(payload => Array.isArray(payload.data) ? payload.data : []);
    if (!quotes.length) throw new Error('No published quotes');
    const corpusStatus = firstPayload.meta?.corpus_status || '';
    setApiStatus('ok', corpusStatus.includes('pending') ? 'Cited draft library connected' : 'Quote library connected');
    $('#feed-count').textContent = total;
    $('#result-count').textContent = `${quotes.length} passages`;
    renderRecommendation(true);
    renderResults();
    renderSaved();
    populateAdhikarams();
    renderKuralList();
  } catch (error) {
    setApiStatus('error', 'Quote library unavailable');
    $('#quote-card').innerHTML = `<div class="empty-state"><strong>We could not reach the quote API.</strong><br>Check your connection or run this site with <code>npm run dev</code> so Netlify Functions are available.</div>`;
    $('#feed-count').textContent = '—';
    console.error(error);
  }
}

async function shareQuote(quote) {
  const easy = quote.english.easy_text || quote.english.text;
  const text = `${quote.tamil.text}\n\n${easy}\n\n— ${quote.work.title}, ${quote.source_locator}\n${quote.provenance.url}`;
  try { if (navigator.share) await navigator.share({ title: `Tamil Stoic · ${quote.source_locator}`, text }); else { await navigator.clipboard.writeText(text); toast('Quote and citation copied to clipboard.'); } } catch (error) { if (error.name !== 'AbortError') toast('Copy was not available.'); }
}
function quoteCard(quote, compact = false) {
  const item = document.createElement('article');
  item.className = compact ? 'result-card' : 'quote-card';
  const header = document.createElement('div'); header.className = 'quote-header';
  const source = document.createElement('span'); source.className = 'source'; source.textContent = `${quote.work.title} · ${quote.provenance.locator.split(', ').pop()}`;
  const actions = document.createElement('div'); actions.className = 'quote-actions';
  const save = document.createElement('button'); save.className = `icon-button ${savedIds.has(quote.id) ? 'saved' : ''}`; save.setAttribute('aria-label', savedIds.has(quote.id) ? 'Remove saved passage' : 'Save passage'); save.textContent = savedIds.has(quote.id) ? '♥' : '♡'; save.addEventListener('click', (event) => { event.stopPropagation(); toggleSaved(quote); });
  const share = document.createElement('button'); share.className = 'icon-button'; share.setAttribute('aria-label', 'Share quote'); share.textContent = '↗'; share.addEventListener('click', event => { event.stopPropagation(); shareQuote(quote); });
  actions.append(save, share); header.append(source, actions); item.append(header);
  const tamil = document.createElement('p'); tamil.className = 'quote-tamil'; tamil.lang = 'ta'; tamil.textContent = quote.tamil.text; tamil.hidden = profile.language === 'en'; item.append(tamil);
  const rule = document.createElement('div'); rule.className = 'quote-rule'; item.append(rule);
  const english = document.createElement('p'); english.className = 'quote-english'; english.textContent = `“${profile.translationMode === 'source' ? quote.english.text : (quote.english.easy_text || quote.english.text)}”`; english.hidden = profile.language === 'ta'; item.append(english);
  if (!compact) {
    const context = document.createElement('div'); context.className = 'quote-context'; context.textContent = quote.editorial_summary || 'A reviewed passage from the Tamil Stoic source library.'; item.append(context);
    const footer = document.createElement('div'); footer.className = 'quote-footer';
    const author = document.createElement('span'); author.textContent = `${quote.work.author} · ${quote.english.translator}`;
    const sourceLink = document.createElement('a'); sourceLink.href = quote.provenance.url; sourceLink.target = '_blank'; sourceLink.rel = 'noreferrer'; sourceLink.textContent = 'View source ↗'; footer.append(author, sourceLink); item.append(footer);
  } else { const small = document.createElement('small'); small.textContent = `${quote.work.author} · ${quote.themes.slice(0,2).join(' · ')}`; item.append(small); item.addEventListener('click', () => { showQuote(quote); window.location.hash = 'feed'; }); }
  return item;
}
function enableQuoteSwipe(card) {
  let startX = 0;
  card.addEventListener('touchstart', event => { startX = event.changedTouches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', event => { const delta = event.changedTouches[0].clientX - startX; if (Math.abs(delta) < 55) return; feedIndex += delta < 0 ? 1 : -1; if (feedIndex < 0) feedIndex = rankedQuotes().length - 1; renderRecommendation(); toast(delta < 0 ? 'Next passage' : 'Previous passage'); }, { passive: true });
  card.addEventListener('keydown', event => { if (event.key === 'ArrowRight') { feedIndex += 1; renderRecommendation(); } if (event.key === 'ArrowLeft') { feedIndex = Math.max(0, feedIndex - 1); renderRecommendation(); } });
}
function showQuote(quote) { currentQuote = quote; const card = quoteCard(quote); card.tabIndex = 0; card.setAttribute('aria-label', 'Quote card. Swipe left or right for another passage.'); enableQuoteSwipe(card); $('#quote-card').replaceChildren(card); $('#recommendation-heading').textContent = profile.themes.length || profile.mood ? 'Selected for your practice' : 'A place to begin'; }
function renderRecommendation(reset = false) { if (!quotes.length) return; const list = rankedQuotes(); if (reset) feedIndex = 0; const quote = list[feedIndex % list.length]; showQuote(quote); }
function toggleSaved(quote) { if (savedIds.has(quote.id)) { savedIds.delete(quote.id); toast('Removed from your saved passages.'); } else { savedIds.add(quote.id); toast('Saved for your return.'); } saveSaved(); if (currentQuote?.id === quote.id) showQuote(quote); }
function renderSaved() { const container = $('#saved-list'); if (!quotes.length) return; const saved = quotes.filter(q => savedIds.has(q.id)); container.replaceChildren(); if (!saved.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Save a passage and it will appear here.'; container.append(empty); return; } saved.forEach(quote => { const item = quoteCard(quote, true); const remove = document.createElement('button'); remove.className = 'remove-save'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Remove passage'); remove.addEventListener('click', () => toggleSaved(quote)); item.append(remove); container.append(item); }); }
function renderResults() { const query = ($('#search').value || '').toLowerCase().trim(); const filtered = quotes.filter(q => { const haystack = [q.tamil.text, q.english.text, q.work.title, q.work.author, q.themes.join(' ')].join(' ').toLowerCase(); return (!query || haystack.includes(query)) && (activeFilter === 'all' || q.themes.includes(activeFilter)); }); $('#result-count').textContent = `${filtered.length} passage${filtered.length === 1 ? '' : 's'}`; const container = $('#results'); container.replaceChildren(); if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'No reviewed passage matches that search yet.'; container.append(empty); return; } filtered.forEach(q => container.append(quoteCard(q, true))); }

let kuralPage = 1;
let kuralPaal = 'all';
let kuralChapter = 'all';
function populateAdhikarams() { const select = $('#adhikaram-filter'); const seen = new Set(); quotes.forEach(q => { if (!seen.has(q.chapter?.number)) { seen.add(q.chapter?.number); const option = document.createElement('option'); option.value = q.chapter.number; option.textContent = `${q.chapter.number}. ${q.chapter.tamil} · ${q.chapter.english}`; select.append(option); } }); }
function filteredKurals() { const term = ($('#kural-search').value || '').toLowerCase().trim(); return quotes.filter(q => { const hay = [q.tamil.text, q.english.text, q.english.easy_text, q.source_locator, q.chapter?.tamil, q.chapter?.english].join(' ').toLowerCase(); return (!term || hay.includes(term)) && (kuralPaal === 'all' || q.paal?.id === kuralPaal) && (kuralChapter === 'all' || String(q.chapter?.number) === kuralChapter); }); }
function renderKuralList() { const all = filteredKurals(); const visible = all.slice(0, kuralPage * 50); $('#kural-count').textContent = `${all.length} of 1,330`; const list = $('#kural-list'); list.replaceChildren(); visible.forEach(q => list.append(quoteCard(q, true))); $('#load-more-kurals').hidden = visible.length >= all.length; }
function loadPreferences() { $$('#theme-chips button').forEach(button => button.classList.toggle('selected', profile.themes.includes(button.dataset.theme))); $('#mood').value = profile.mood || ''; $('#language').value = profile.language || 'both'; $('#translation-mode').value = profile.translationMode || 'easy'; }
function applyPreferences() { profile.themes = $$('#theme-chips button.selected').map(button => button.dataset.theme); profile.mood = $('#mood').value; profile.language = $('#language').value; profile.translationMode = $('#translation-mode').value; saveProfile(); $('#preference-message').textContent = profile.themes.length ? `Prioritising ${profile.themes.length} theme${profile.themes.length > 1 ? 's' : ''} for you.` : 'Your feed is open to the full library.'; feedIndex = 0; renderRecommendation(true); renderResults(); toast('Your feed has been updated.'); }
$$('#theme-chips button').forEach(button => button.addEventListener('click', () => button.classList.toggle('selected')));
$('#apply-preferences').addEventListener('click', applyPreferences);
$('#clear-preferences').addEventListener('click', () => { profile = { themes: [], mood: '', language: 'both', translationMode: 'easy' }; saveProfile(); loadPreferences(); applyPreferences(); });
$('#mood').addEventListener('change', applyPreferences);
$('#language').addEventListener('change', applyPreferences);
$('#translation-mode').addEventListener('change', applyPreferences);
$('#next-quote').addEventListener('click', () => { feedIndex += 1; renderRecommendation(); toast('Here is another passage from your library.'); });
$$('[data-feedback]').forEach(button => button.addEventListener('click', () => { if (!currentQuote) return; feedback[currentQuote.id] = button.dataset.feedback; localStorage.setItem(feedbackKey, JSON.stringify(feedback)); $('#feedback-note').textContent = button.dataset.feedback === 'helpful' ? 'We will show more like this.' : 'We will adjust your feed.'; if (button.dataset.feedback === 'not-for-me') { feedIndex += 1; setTimeout(() => renderRecommendation(), 180); } }));
$('#search-button').addEventListener('click', renderResults);
$('#search').addEventListener('input', renderResults);
$('#search').addEventListener('keydown', event => { if (event.key === 'Enter') renderResults(); });
$$('.filter').forEach(button => button.addEventListener('click', () => { $$('.filter').forEach(b => b.classList.remove('active')); button.classList.add('active'); activeFilter = button.dataset.filter; renderResults(); }));
$$('#paal-tabs button').forEach(button => button.addEventListener('click', () => { $$('#paal-tabs button').forEach(b => b.classList.remove('active')); button.classList.add('active'); kuralPaal = button.dataset.paal; kuralPage = 1; renderKuralList(); }));
$('#adhikaram-filter').addEventListener('change', event => { kuralChapter = event.target.value; kuralPage = 1; renderKuralList(); });
$('#kural-search').addEventListener('input', () => { kuralPage = 1; renderKuralList(); });
$('#load-more-kurals').addEventListener('click', () => { kuralPage += 1; renderKuralList(); });
$('#export-saved').addEventListener('click', () => { const saved = quotes.filter(q => savedIds.has(q.id)); if (!saved.length) { toast('Save a passage before exporting.'); return; } const text = saved.map(q => `${q.work.title} · ${q.provenance.locator}\n${q.tamil.text}\n“${q.english.text}”\nSource: ${q.provenance.url}`).join('\n\n'); const url = URL.createObjectURL(new Blob([`Tamil Stoic — saved passages\n\n${text}`], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'tamil-stoic-saved-passages.txt'; link.click(); URL.revokeObjectURL(url); toast('Your saved passages were exported.'); });
let deferredInstallPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; $('#install-app').hidden = false; });
$('#install-app').addEventListener('click', async () => { if (!deferredInstallPrompt) { toast('Use your browser menu and choose “Add to Home screen”.'); return; } deferredInstallPrompt.prompt(); const result = await deferredInstallPrompt.userChoice; if (result.outcome === 'accepted') toast('Tamil Stoic was added to your home screen.'); deferredInstallPrompt = null; $('#install-app').hidden = true; });
window.addEventListener('appinstalled', () => { $('#install-app').hidden = true; toast('Tamil Stoic is ready on your home screen.'); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(error => console.info('Offline shell unavailable:', error.message));
window.addEventListener('offline', () => { setApiStatus('error', 'Offline · showing saved library'); toast('You are offline. Saved passages remain available.'); });
window.addEventListener('online', () => { setApiStatus('ok', 'Quote library connected'); toast('Connection restored.'); });
loadPreferences(); updateSavedCount(); loadQuotes();
