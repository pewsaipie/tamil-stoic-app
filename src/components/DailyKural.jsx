import { useEffect, useMemo } from 'react'
import { REFLECTIONS } from '../data/content'
import { copyKuralText, shareKural } from '../lib/share'
import { cx, formatDate, hashIndex, pad, vibrate } from '../lib/util'
import { useTheme } from '../ThemeProvider'

export default function DailyKural({
  kurals, chapters, sections, initialIndex, setDailyIdx,
  favs, onFav, reactions, onReact, streak, onOpenReader, onStatus,
}) {
  const { theme } = useTheme()

  useEffect(() => { /* initial index is passed in; parent manages it */ }, [initialIndex])

  const kural = kurals[initialIndex]
  const chapter = useMemo(() => chapters.find((c) => c.n === kural.ch), [chapters, kural])
  const section = useMemo(() => sections.find((s) => s.id === kural.sec), [sections, kural])
  const reflection = useMemo(() => REFLECTIONS[hashIndex(kural.n, REFLECTIONS.length)], [kural])
  const isFav = favs.includes(kural.n)
  const kuralReactions = reactions[kural.n] || {}

  const shuffle = () => {
    vibrate(8)
    let next = Math.floor(Math.random() * kurals.length)
    if (kurals.length > 1 && next === initialIndex) next = (next + 1) % kurals.length
    setDailyIdx(next)
  }
  const onShare = async () => {
    onStatus && onStatus('Preparing image…')
    try {
      const result = await shareKural(kural, { chapter, section, theme })
      onStatus && onStatus(result === 'shared' ? 'Shared!' : result === 'downloaded' ? 'Downloaded' : '')
    } catch {
      onStatus && onStatus('Could not share')
    }
    setTimeout(() => onStatus && onStatus(''), 2000)
  }
  const onCopy = async () => {
    const ok = await copyKuralText(kural, { chapter })
    onStatus && onStatus(ok ? 'Copied!' : 'Copy failed')
    setTimeout(() => onStatus && onStatus(''), 1500)
  }

  return (
    <section className="daily" id="daily" aria-labelledby="daily-title">
      <div className="daily-inner">
        <div className="daily-eyebrow">
          <span className="dot" aria-hidden="true" />
          <span id="daily-title">Today's Kural · இன்றைய குறள்</span>
          <span className="daily-date">{formatDate(new Date())}</span>
          {streak > 0 && (
            <span className="streak" title={`${streak}-day reading streak`}>
              <span className="fire">🔥</span> {streak} day{streak === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="daily-card">
          <div className="daily-meta">
            <span className="daily-num">#{pad(kural.n)}</span>
            <span className="kural-chapter">
              {chapter ? chapter.ta : ''}
              {chapter ? <span className="ch-en"> · {chapter.en}</span> : null}
            </span>
            <span className="section-tag">{section ? `${section.ta} · ${section.en}` : ''}</span>
          </div>
          <p className="kural-ta daily-ta">
            <span className="line">{kural.ta[0]}</span>
            <span className="line">{kural.ta[1]}</span>
          </p>
          <p className="kural-translit">{kural.tr[0]} —<br />{kural.tr[1]}</p>
          <hr className="kural-divider" />
          <div className="block-label simple-label">Simple meaning</div>
          <div className="kural-simple">{kural.s}</div>

          {reflection && (
            <div className="reflection">
              <span className="q">{reflection.ta}</span>
              {reflection.en}
            </div>
          )}

          <div className="reactions" role="group" aria-label="React to today's kural">
            {[
              ['pray', '🙏'],
              ['fire', '🔥'],
              ['think', '💭'],
            ].map(([kind, emoji]) => (
              <button
                key={kind}
                className={cx('reaction', kuralReactions._pressed?.[kind] && 'active')}
                aria-label={`React ${emoji}`}
                onClick={() => onReact(kind, kural.n)}
              >
                <span className="emoji">{emoji}</span>
                <span className="count">{kuralReactions[kind] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="daily-actions">
          <button type="button" className="ghost-btn warm" onClick={shuffle}
                  aria-label="Show another kural">
            Another · வேறு ஒன்று
          </button>
          <button type="button" className="ghost-btn" onClick={onShare}>
            Share image · பகிர்
          </button>
          <button type="button" className="ghost-btn secondary" onClick={onCopy}>Copy text</button>
          <button type="button" className="ghost-btn secondary"
                  onClick={() => onOpenReader(initialIndex)}>
            Read · வாசி
          </button>
          <button type="button"
                  className={cx('ghost-btn secondary', isFav && 'active')}
                  aria-pressed={isFav}
                  onClick={() => onFav(kural.n)}>
            {isFav ? '♥ Favorited' : '♡ Favorite'}
          </button>
          <a href="#browse" className="ghost-link">Browse all →</a>
        </div>
      </div>
    </section>
  )
}
