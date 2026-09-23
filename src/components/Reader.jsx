import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { copyKuralText, shareKural } from '../lib/share'
import { cx, pad, vibrate } from '../lib/util'
import { withTransition } from '../state'
import { useTheme } from '../ThemeProvider'

const SWIPE_THRESHOLD = 60
const SWIPE_VELOCITY = 0.35

export default function Reader({
  open, startIndex, kurals, chapters, sections,
  favs, onFav, reactions, onReact, onClose, onStatus,
}) {
  const [idx, setIdx] = useState(startIndex)
  const [dx, setDx] = useState(0)
  const touchStart = useRef(null)
  const { theme } = useTheme()

  useEffect(() => { if (open) setIdx(startIndex) }, [startIndex, open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeWithTransition()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx])

  const closeWithTransition = () => {
    vibrate(4)
    withTransition(onClose)
  }

  const goTo = useCallback((n) => {
    vibrate(6)
    setIdx(Math.max(0, Math.min(kurals.length - 1, n)))
    window.location.hash = `kural-${kurals[Math.max(0, Math.min(kurals.length - 1, n))].n}`
  }, [kurals])

  const next = useCallback(() => { if (idx < kurals.length - 1) goTo(idx + 1) }, [idx, kurals.length, goTo])
  const prev = useCallback(() => { if (idx > 0) goTo(idx - 1) }, [idx, goTo])

  // Touch handlers
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now(), dx0: dx }
  }
  const onTouchMove = (e) => {
    if (!touchStart.current) return
    const t = e.touches[0]
    const dX = t.clientX - touchStart.current.x
    setDx(dX)
  }
  const onTouchEnd = (e) => {
    if (!touchStart.current) return
    const endX = (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].clientX) || 0
    const dX = endX - touchStart.current.x
    const dt = Date.now() - touchStart.current.t
    const vel = Math.abs(dX) / Math.max(1, dt)
    if (Math.abs(dX) > SWIPE_THRESHOLD || vel > SWIPE_VELOCITY) {
      if (dX < 0) next()
      else prev()
    }
    setDx(0)
    touchStart.current = null
  }

  const kural = kurals[idx]
  const chapter = useMemo(() => kural && chapters.find((c) => c.n === kural.ch), [chapters, kural])
  const section = useMemo(() => kural && sections.find((s) => s.id === kural.sec), [sections, kural])
  const isFav = kural && favs.includes(kural.n)
  const kuralReactions = kural ? (reactions[kural.n] || {}) : {}

  const onShare = async () => {
    if (!kural) return
    try {
      const r = await shareKural(kural, { chapter, section, theme })
      onStatus && onStatus(r === 'shared' ? 'Shared!' : r === 'downloaded' ? 'Downloaded' : '')
      setTimeout(() => onStatus && onStatus(''), 1500)
    } catch { /* ignore */ }
  }
  const onCopy = async () => {
    if (!kural) return
    const ok = await copyKuralText(kural, { chapter })
    onStatus && onStatus(ok ? 'Copied!' : 'Copy failed')
    setTimeout(() => onStatus && onStatus(''), 1500)
  }

  return (
    <div className={cx('reader', open && 'open')} data-state={open ? 'reader open' : 'reader closed'} role="dialog" aria-modal="true" aria-hidden={!open}
         aria-label="Kural reader" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="reader-scrim" onClick={closeWithTransition} />
      <div className="reader-card">
        <button type="button" className="reader-close" onClick={closeWithTransition} aria-label="Close reader">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          Close
        </button>

        <div className="reader-track" style={{ transform: `translateX(${dx}px)` }}>
          {kural && (
            <>
              <div className="reader-progress" aria-hidden="true">
                <span>#{pad(kural.n)}</span><span>of {kurals.length}</span>
              </div>
              <div className="reader-meta">
                <span className="section-tag">{section ? section.ta + ' · ' + section.en : ''}</span>
                <span className="kural-chapter">{chapter ? chapter.ta + ' · ' + chapter.en : ''}</span>
              </div>
              <p className="kural-ta reader-ta">
                <span className="line">{kural.ta[0]}</span>
                <span className="line">{kural.ta[1]}</span>
              </p>
              <p className="kural-translit">{kural.tr[0]} —<br />{kural.tr[1]}</p>
              <hr className="kural-divider" />
              <div className="block-label en-label">English translation</div>
              <blockquote className="kural-en">
                <span className="line">{kural.en[0]}</span>
                {kural.en[1] ? <span className="line">{kural.en[1]}</span> : null}
                <span className="source">— G. U. Pope (1886)</span>
              </blockquote>
              <div className="block-label simple-label">Simple meaning</div>
              <div className="kural-simple">{kural.s}</div>

              <div className="reactions reader-reactions" role="group" aria-label="React">
                {[['pray', '🙏'], ['fire', '🔥'], ['think', '💭']].map(([kind, emoji]) => (
                  <button key={kind} className={cx('reaction', kuralReactions._pressed?.[kind] && 'active')}
                          aria-label={`React ${emoji}`} onClick={() => onReact(kind, kural.n)}>
                    <span className="emoji">{emoji}</span>
                    <span className="count">{kuralReactions[kind] || 0}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="reader-nav">
          <button className="reader-prev" onClick={prev} disabled={idx === 0} aria-label="Previous kural">← முன்</button>
          <button className="reader-fav" aria-pressed={!!isFav}
                  onClick={() => kural && onFav(kural.n)}>
            {isFav ? '♥ Saved' : '♡ Save'}
          </button>
          <button className="reader-share" onClick={onShare} aria-label="Share this kural">Share</button>
          <button className="reader-copy" onClick={onCopy} aria-label="Copy text">Copy</button>
          <button className="reader-next" onClick={next} disabled={idx === kurals.length - 1} aria-label="Next kural">அடுத்து →</button>
        </div>

        {idx > 0 && <button className="reader-hotspot left" onClick={prev} aria-hidden="true" tabIndex={-1} />}
        {idx < kurals.length - 1 && <button className="reader-hotspot right" onClick={next} aria-hidden="true" tabIndex={-1} />}
      </div>
    </div>
  )
}
