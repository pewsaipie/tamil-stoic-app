import { useMemo } from 'react'
import { cx, pad, vibrate } from '../lib/util'

export default function Favorites({ open, onClose, favs, kurals, chapters, sections, onFav, reactions, onReact, onOpenReader, onStatus }) {
  const favKurals = useMemo(() => favs
    .map((n) => kurals.find((k) => k.n === n))
    .filter(Boolean), [favs, kurals])

  return (
    <div className={cx('favs-drawer', open && 'open')} role="dialog" aria-modal="true" aria-hidden={!open} aria-label="Favorites">
      <div className="favs-scrim" onClick={() => { vibrate(4); onClose() }} />
      <div className="favs-panel">
        <div className="favs-head">
          <h2>Saved · என்னுடையவை</h2>
          <button type="button" className="reader-close" onClick={onClose} aria-label="Close saved">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>Close
          </button>
        </div>
        {favKurals.length === 0 ? (
          <div className="empty">
            <p>No saved kurals yet. Tap the ♡ on any card to save it here.</p>
          </div>
        ) : (
          <ul className="favs-list">
            {favKurals.map((k) => {
              const ch = chapters.find((c) => c.n === k.ch)
              const sec = sections.find((s) => s.id === k.sec)
              const r = reactions[k.n] || {}
              return (
                <li key={k.n} className="favs-item">
                  <div className="favs-meta">
                    <button className="favs-jump" onClick={() => {
                      const i = kurals.findIndex((x) => x.n === k.n)
                      if (i >= 0) onOpenReader(i)
                    }}>
                      #{pad(k.n)} · {ch ? ch.ta : ''}
                    </button>
                    <button className={cx('fav-toggle', 'small', 'active')} aria-pressed={true} onClick={() => onFav(k.n)}
                            aria-label="Remove from saved">♥</button>
                  </div>
                  <p className="favs-ta">
                    <span className="line">{k.ta[0]}</span>
                    <span className="line">{k.ta[1]}</span>
                  </p>
                  <p className="favs-simple">{k.s}</p>
                  <div className="reactions small" role="group">
                    {[['pray', '🙏'], ['fire', '🔥'], ['think', '💭']].map(([kind, emoji]) => (
                      <button key={kind} className={cx('reaction', 'small', r._pressed?.[kind] && 'active')}
                              aria-label={`React ${emoji}`} onClick={() => onReact(kind, k.n)}>
                        <span className="emoji">{emoji}</span><span className="count">{r[kind] || 0}</span>
                      </button>
                    ))}
                  </div>
                  <div className="kural-foot">
                    <span className="section-tag">{sec ? sec.ta + ' · ' + sec.en : ''}</span>
                    <span>திருக்குறள் {pad(k.n)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
