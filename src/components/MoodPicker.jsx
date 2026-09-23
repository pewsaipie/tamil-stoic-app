import { MOODS } from '../data/content'
import { cx, vibrate } from '../lib/util'

export default function MoodPicker({ active, onPick }) {
  return (
    <div className="moods" role="group" aria-label="How are you arriving today?">
      {MOODS.map((m) => (
        <button
          key={m.id}
          type="button"
          className={cx('mood', active === m.id && 'active')}
          aria-pressed={active === m.id}
          onClick={() => { vibrate(6); onPick(m.id) }}
        >
          <span className="mood-emoji" aria-hidden="true">{m.emoji}</span>
          <span className="mood-en">{m.en}</span>
        </button>
      ))}
    </div>
  )
}
