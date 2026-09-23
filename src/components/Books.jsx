import { useMemo } from 'react'
import { cx, vibrate } from '../lib/util'

export default function Books({ sections, kurals, active, onPick }) {
  const counts = useMemo(() => {
    const c = { all: kurals.length }
    for (const k of kurals) c[k.sec] = (c[k.sec] || 0) + 1
    return c
  }, [kurals])
  const icon = { 1: '◈', 2: '❖', 3: '✿' }
  const desc = {
    1: 'On virtue, right conduct, and the inner life. (அறம்)',
    2: 'On kingship, wealth, work, friendship, and the world. (பொருள்)',
    3: 'On love, longing, and the life of the heart. (காமம்)',
  }
  return (
    <section className="books" aria-labelledby="books-title">
      <div className="section-head">
        <h2 id="books-title">The three books · முப்பால்</h2>
        <p className="section-sub">Thirukkural is arranged in three books. Tap one to walk through it.</p>
      </div>
      <div className="books-grid" role="list">
        <button
          type="button" role="listitem"
          className={cx('book-card', 'book-all', active === 'all' && 'active')}
          aria-pressed={active === 'all'}
          onClick={() => { vibrate(); onPick('all') }}
        >
          <span className="book-icon" aria-hidden="true">✺</span>
          <span className="book-ta">முப்பாலும்</span>
          <span className="book-en">All three books</span>
          <span className="book-desc">Walk the whole path — all {counts.all} couplets.</span>
          <span className="book-count">{counts.all} kurals</span>
        </button>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button" role="listitem"
            className={cx('book-card', `book-${s.id}`, Number(active) === s.id && 'active')}
            aria-pressed={Number(active) === s.id}
            onClick={() => { vibrate(); onPick(s.id) }}
          >
            <span className="book-icon" aria-hidden="true">{icon[s.id]}</span>
            <span className="book-ta">{s.ta}</span>
            <span className="book-en">{s.en}</span>
            <span className="book-desc">{desc[s.id]}</span>
            <span className="book-count">{counts[s.id] || 0} kurals</span>
          </button>
        ))}
      </div>
    </section>
  )
}
