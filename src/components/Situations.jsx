import { SITUATIONS } from '../data/content'
import { cx, vibrate } from '../lib/util'

const THEME_MAP = {
  wisdom: ['ஞானம்', 'Wisdom'],
  learning: ['கல்வி', 'Learning'],
  gratitude: ['நன்றி', 'Gratitude'],
  patience: ['பொறுமை', 'Patience'],
  anger: ['சினம்', 'Anger'],
  truth: ['மெய்', 'Truth'],
  calm: ['அமைதி', 'Calm'],
  impermanence: ['நிலையாமை', 'Impermanence'],
  compassion: ['இரக்கம்', 'Compassion'],
  effort: ['ஊழ்', 'Fate & Effort'],
  equality: ['சமத்துவம்', 'Equality'],
  family: ['குடும்பம்', 'Family'],
  friendship: ['நட்பு', 'Friendship'],
  governance: ['ஆட்சி', 'Governance'],
  wealth: ['செல்வம்', 'Wealth'],
  love: ['காதல்', 'Love'],
}

function themeLabel(id) {
  const v = THEME_MAP[id] || [id, id]
  return `${v[0]} · ${v[1]}`
}

export default function Situations({ active, moodFilter, onPick }) {
  const items = moodFilter && moodFilter.situations
    ? SITUATIONS.filter((s) => moodFilter.situations.includes(s.id))
    : SITUATIONS
  return (
    <section className="situations" aria-labelledby="situations-title">
      <div className="section-head">
        <h2 id="situations-title">Open the right door · சூழ்நிலை</h2>
        <p className="section-sub">Where are you today? Pick the door that fits, and let Valluvar speak to it.</p>
      </div>
      <div className="situations-grid" role="list">
        {items.map((s) => (
          <button
            key={s.id}
            type="button" role="listitem"
            className={cx('situation', active === s.id && 'active')}
            data-situation={s.id}
            data-theme={s.theme}
            aria-pressed={active === s.id}
            onClick={() => { vibrate(6); onPick(s.id) }}
          >
            <span className="situation-ta">{s.ta}</span>
            <span className="situation-en">{s.en}</span>
            <span className="situation-theme">{themeLabel(s.theme)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
