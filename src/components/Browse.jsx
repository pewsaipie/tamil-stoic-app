import { useEffect } from 'react'
import { copyKuralText, shareKural } from '../lib/share'
import { cx, pad, vibrate } from '../lib/util'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  )
}

export default function Browse({
  kurals, chapters, sections, themes,
  favs, onFav, reactions, onReact,
  book, chapter, theme, situation, query, shown, visible, results,
  onSetBook, onSetChapter, onSetTheme, onSetQuery, onClear,
  onOpenReader, onStatus, sentinelRef,
  showTranslit, onToggleTranslit,
  showTranslation, onToggleTranslation,
  showMeaning, onToggleMeaning,
}) {
  useEffect(() => {
    // Sync input value to external state when needed
    const el = document.getElementById('search')
    if (el && el.value !== query) el.value = query
  }, [query])

  const chById = {}
  chapters.forEach((c) => { chById[c.n] = c })
  const secById = {}
  sections.forEach((s) => { secById[s.id] = s })

  return (
    <section className="browse" id="browse" aria-labelledby="browse-title">
      <div className="browse-head">
        <h2 id="browse-title">Browse · அதிகாரங்கள்</h2>
        <p className="section-sub">Search a number or word, pick a chapter, or wander.</p>
      </div>

      <div className="show-toggles" role="group" aria-label="Show/hide sections">
        <label><input type="checkbox" checked={showTranslit} onChange={(e) => onToggleTranslit(e.target.checked)} /> Transliteration</label>
        <label><input type="checkbox" checked={showTranslation} onChange={(e) => onToggleTranslation(e.target.checked)} /> Translation</label>
        <label><input type="checkbox" checked={showMeaning} onChange={(e) => onToggleMeaning(e.target.checked)} /> Simple meaning</label>
      </div>

      <div className="controls" id="controls">
        <div className="controls-inner">
          <div className="search-wrap">
            <SearchIcon />
            <input
              id="search" type="search"
              placeholder="Search number or words — எ.கா. 151, பொறுத்தல், patience, anger…"
              autoComplete="off"
              defaultValue={query}
              className={cx((query || '').trim() && 'has-value')}
              aria-label="Search kurals"
              onInput={(e) => onSetQuery(e.target.value)}
            />
          </div>
          <div className="chapter-wrap">
            <label htmlFor="chapter" className="chapter-label">Chapter · அதிகாரம்</label>
            <select
              id="chapter" className={cx('chapter-select', chapter !== 'all' && 'has-value')}
              aria-label="Filter by chapter"
              value={chapter}
              onChange={(e) => onSetChapter(e.target.value)}
            >
              <option value="all">அனைத்து அதிகாரங்கள் · All 133 chapters</option>
              {sections.map((s) => (
                <optgroup key={s.id} label={`${s.ta} · ${s.en}`}>
                  {chapters.filter((c) => c.sec === s.id).map((c) => (
                    <option key={c.n} value={c.n}>{c.n}. {c.ta} — {c.en}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button" className="clear-btn" id="clear-filters"
              hidden={!(chapter !== 'all' || book !== 'all' || situation || (query || '').trim() || theme !== 'all')}
              aria-label="Clear filters"
              onClick={() => { vibrate(); onClear() }}
            >Clear</button>
          </div>
          <div className="chips" role="tablist" aria-label="Filter by theme">
            <button className={cx('chip', theme === 'all' && 'active')} data-theme="all" role="tab"
                    aria-selected={theme === 'all'} onClick={() => onSetTheme('all')}>
              <span className="chip-ta">அனைத்தும்</span>All<span className="count">{kurals.length}</span>
            </button>
            {themes.map((t) => (
              <button key={t.id}
                      className={cx('chip', theme === t.id && 'active')}
                      data-theme={t.id} role="tab" aria-selected={theme === t.id}
                      onClick={() => onSetTheme(t.id)}>
                <span className="chip-ta">{t.ta}</span>{t.en}
                <span className="count">{kurals.filter((k) => k.th === t.id).length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="result-line" aria-live="polite">
        <span>
          Showing {visible.length} of {results.length} kurals
          {results.length !== kurals.length ? ` (filtered from ${kurals.length})` : ''}
        </span>
        <span>{results.length > 0 ? `#${pad(results[0].n)} – #${pad(results[results.length - 1].n)}` : ''}</span>
      </div>

      <div id="kural-list" aria-live="polite">
        {results.length === 0 ? (
          <div className="empty">
            <p className="kural-ta">தேடலில் எதுவும் கிடைக்கவில்லை</p>
            <p>Nothing found. Try a kural number (e.g. <b>151</b>) or another word, or press Clear.</p>
          </div>
        ) : visible.map((k, listIdx) => {
          const ch = chById[k.ch]
          const sec = secById[k.sec]
          return (
            <KuralCardSlim
              key={k.n} kural={k} chapter={ch} section={sec}
              query={query}
              fav={favs.includes(k.n)} onFav={() => onFav(k.n)}
              onShare={async () => {
                try {
                  const r = await shareKural(k, { chapter: ch, section: sec })
                  onStatus && onStatus(r === 'shared' ? 'Shared!' : r === 'downloaded' ? 'Downloaded' : '')
                  setTimeout(() => onStatus && onStatus(''), 1500)
                } catch { /* ignore */ }
              }}
              onCopy={async () => {
                const ok = await copyKuralText(k, { chapter: ch })
                onStatus && onStatus(ok ? 'Copied!' : 'Copy failed')
                setTimeout(() => onStatus && onStatus(''), 1500)
              }}
              onOpenReader={() => onOpenReader(listIdx)}
              reactions={reactions[k.n] || {}}
              onReact={(kind) => onReact(kind, k.n)}
            />
          )
        })}
      </div>

      <div id="sentinel" className="sentinel" ref={sentinelRef} aria-hidden="true"
           style={{ display: results.length > visible.length ? 'flex' : 'none' }}>
        <div className="spinner" />
        <span>Loading more…</span>
      </div>

      <div className="chapter-map" id="chapter-map" aria-label="All 133 chapters">
        <h3 className="map-title">All chapters · அனைத்து அதிகாரங்கள்</h3>
        <div id="chapter-map-body">
          {sections.map((s) => {
            const chs = chapters.filter((c) => c.sec === s.id)
            return (
              <div key={s.id} className="map-section">
                <h4 className="map-section-title">
                  <span className="map-section-ta">{s.ta}</span>
                  <span className="map-section-en">{s.en} · {chs.length} chapters</span>
                </h4>
                <div className="map-grid">
                  {chs.map((c) => (
                    <button
                      key={c.n} type="button"
                      className={cx('map-cell', String(chapter) === String(c.n) && 'active')}
                      data-chapter={c.n}
                      title={`${c.ta} — ${c.en}`}
                      aria-pressed={String(chapter) === String(c.n)}
                      onClick={() => {
                        vibrate(6)
                        onSetChapter(String(c.n))
                        onSetTheme('all')
                        const el = document.getElementById('kural-list')
                        if (el && typeof el.scrollIntoView === 'function') {
                          el.scrollIntoView({ block: 'start', behavior: 'smooth' })
                        }
                      }}
                    >
                      <span className="map-num">{c.n}.</span>
                      <span className="map-ta">{c.ta}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function KuralCardSlim({ kural, chapter, section, query, fav, onFav, onShare, onCopy, onOpenReader, reactions, onReact }) {
  const q = query && !/^\d+$/.test(query) ? query : ''
  const enLines = '<span class="line">' + escapeHtml(k.en[0]) + '</span>' +
    (k.en[1] ? '<span class="line">' + escapeHtml(k.en[1]) + '</span>' : '')
  const ta0 = highlight(k.ta[0], q)
  const ta1 = highlight(k.ta[1], q)
  const simple = highlight(k.s, q)
  return (
    <article className={cx('kural-card', fav && 'is-fav')} id={`kural-${kural.n}`}>
      <div className="kural-meta">
        <a className="kural-num" href={`#kural-${kural.n}`} title={`Link to kural ${pad(kural.n)}`}>#{pad(kural.n)}</a>
        <span className="kural-chapter">{chapter ? chapter.ta : ''}<span className="ch-en">{chapter ? ' · ' + chapter.en : ''}</span></span>
        <span className="kural-theme">{themeLabel(kural.th)}</span>
        <span className="kural-actions">
          <button className="icon-btn" aria-label="Open in reader" title="Read full-screen" onClick={onOpenReader}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v16H4zM13 4h7v16h-7z" /></svg>
          </button>
          <button className={cx('icon-btn', 'fav', fav && 'active')} aria-pressed={fav} aria-label={fav ? 'Remove from favorites' : 'Add to favorites'} title="Favorite" onClick={onFav}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z" /></svg>
          </button>
          <button className="icon-btn" aria-label="Share kural" title="Share" onClick={onShare}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
          </button>
          <button className="icon-btn" aria-label="Copy kural text" title="Copy text" onClick={onCopy}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          </button>
        </span>
      </div>
      <p className="kural-ta">
        <span className="line" dangerouslySetInnerHTML={{ __html: ta0 }} />
        <span className="line" dangerouslySetInnerHTML={{ __html: ta1 }} />
      </p>
      <p className="kural-translit">{escapeHtml(kural.tr[0])} —<br />{escapeHtml(kural.tr[1])}</p>
      <hr className="kural-divider" />
      <div className="block-label en-label">English translation</div>
      <blockquote className="kural-en" dangerouslySetInnerHTML={{ __html: enLines + '<span class="source">— G. U. Pope (1886)</span>' }} />
      <div className="block-label simple-label" style={{ marginTop: 16 }}>Simple meaning</div>
      <div className="kural-simple" dangerouslySetInnerHTML={{ __html: simple }} />
      <div className="reactions" role="group" aria-label="React">
        {[['pray', '🙏'], ['fire', '🔥'], ['think', '💭']].map(([kind, emoji]) => (
          <button key={kind}
                  className={cx('reaction', reactions._pressed?.[kind] && 'active')}
                  aria-label={`React ${emoji}`} onClick={() => onReact(kind)}>
            <span className="emoji">{emoji}</span><span className="count">{reactions[kind] || 0}</span>
          </button>
        ))}
      </div>
      <div className="kural-foot">
        <span className="section-tag">{section ? section.ta + ' · ' + section.en : ''}</span>
        <span>திருக்குறள் {pad(kural.n)}</span>
      </div>
    </article>
  )
}

function themeLabel(th) {
  const MAP = {
    wisdom: 'Wisdom', learning: 'Learning', gratitude: 'Gratitude', patience: 'Patience',
    anger: 'Anger', truth: 'Truth', calm: 'Calm', impermanence: 'Impermanence',
    compassion: 'Compassion', effort: 'Fate & Effort', equality: 'Equality',
    family: 'Family', friendship: 'Friendship', governance: 'Governance',
    wealth: 'Wealth', love: 'Love',
  }
  return MAP[th] || th
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function highlight(text, q) {
  const safe = escapeHtml(text)
  if (!q) return safe
  try {
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi')
    return safe.replace(re, '<mark>$1</mark>')
  } catch { return safe }
}
