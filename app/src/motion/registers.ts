/**
 * The five registers — the thinai as a *motion grammar*, not as a theme.
 *
 * `lib/thinai.ts` established the mapping from feeling to landscape and is
 * already used by the twelve situation doors. This file takes the next step: it
 * gives each landscape a tempo, an easing and an amplitude, so a surface does
 * not have to invent its own timing. A contributor who wants a thing to move
 * asks two questions — *which route am I on* and *what is happening* — and the
 * register answers with numbers that are already in the budget.
 *
 * The registers come from two places in the record, and the distinction matters:
 *
 *   - **Tempo** is the landscape's hour and its drum. Each thinai had its own
 *     parai (Veriyattupparai, Thontakapparai, Erukot parai, Nellari parai,
 *     Valipparipparai — spellings vary by source) and its own pann, and the
 *     moods those carry are the moods the app is in: the sudden union of
 *     kurinji, the held waiting of mullai, the regular alternation of marutham,
 *     the long tidal breathe of neytal, the dry stops of palai.
 *   - **Amplitude** is the doctrine's weather law (`L3`): translate ≤ 2 % of the
 *     object's own size. The registers may not exceed it; the numbers below are
 *     what each landscape actually uses, and `test-motion.mjs` fails any
 *     register that drifts above the ceiling or below the six-second floor.
 *
 * Register is applied **by state, not by screen** (§5 of the motion plan): a
 * route has a base register, and a state — loading, thinking, empty, offline —
 * overrides it. That is why `registerFor` takes both.
 *
 * Sources: the thinai attribute tables (*Sangam landscape*, Wikipedia and
 * Grokipedia), the pann/drum mapping (*Music of Tamil Nadu*, *Pann*), and the
 * performance forms in `docs/sangam-motion-plan.md` §3.3.
 */
import type { WeatherRegister } from '../lib/thinai.ts'
import { IDLE_PERIOD_SECONDS_MIN } from './budget.ts'

/** The same five landscapes the doors already speak. One vocabulary, two uses. */
export type MotionRegister = WeatherRegister

export interface RegisterMotion {
  /**
   * The beat a loop in this register moves on, in seconds.
   *
   * Not a duration for one animation — a *beat*: the slowest thing in the
   * register is about four beats, the fastest about one.
   */
  beatSeconds: number
  /** The house easing token this register is allowed to use. */
  easing: string
  /** Idle travel, as a fraction of the object's own size. Ceiling: 0.02 (L3). */
  amplitude: number
  /** The drum the beat is taken from. */
  drum: string
  /** The mode. Phase D's opt-in sound layer uses the same mapping. */
  pann: string
  /** One line, present tense — what this register feels like, for the playbook. */
  feel: string
}

export const REGISTER_MOTION: Record<MotionRegister, RegisterMotion> = {
  /**
   * Union. The verse arriving, a friend arriving, honey found on the rock.
   * Quick attack, springy settle, upward — the veriyattam leap, cooled down to
   * an interface: one beat and then stillness, never a bounce that repeats.
   */
  kurinji: {
    beatSeconds: 6.5,
    easing: '--ease-spring',
    amplitude: 0.02,
    drum: 'Veriyattupparai',
    pann: 'kurinji pann',
    feel: 'quick attack, springy settle, upward — something has arrived',
  },
  /**
   * Patient waiting. The forest at dusk: the jasmine opens, the first rain is
   * coming and has not come, the cattle are not back yet. Always even and held,
   * with no acceleration anywhere in the curve — nothing in mullai hurries.
   */
  mullai: {
    beatSeconds: 11,
    easing: '--ease-out',
    amplitude: 0.01,
    drum: 'Thontakapparai',
    pann: 'mullai pann',
    feel: 'even and held, no acceleration — the wait, not the answer',
  },
  /**
   * The fields and the river plain. Regular alternation, back and forth, gently
   * argumentative: the paddy moves as one field and not as a thousand plants,
   * and the heron lifts and settles. The register for anything scanned,
   * filtered, listed or compared.
   */
  marutham: {
    beatSeconds: 8,
    easing: '--ease-in-out',
    amplitude: 0.012,
    drum: 'Erukot parai',
    pann: 'cevvali',
    feel: 'regular alternation, back and forth — the browsed field',
  },
  /**
   * The shore. A long tidal breathe — in over many seconds, out over many
   * seconds, never decisive — because the things in this register are the
   * things being sent away: a recitation, a shared kural, a letter. Movement
   * here recedes rather than stops.
   */
  neytal: {
    beatSeconds: 14,
    easing: '--ease-in-out',
    amplitude: 0.016,
    drum: 'Nellari parai',
    pann: 'neithal pann',
    feel: 'a long tidal breathe, receding — something sent away',
  },
  /**
   * The parched passage. Dry, irregular, with abrupt stops: a dust devil turns
   * twice and dies, heat shimmers over the dry well. The register is *not*
   * allowed to be fast (the floor below is why) — palai's harshness is in the
   * irregularity and the stop, not in speed.
   */
  palai: {
    beatSeconds: 7,
    easing: 'linear',
    amplitude: 0.008,
    drum: 'Valipparipparai',
    pann: 'palai pann',
    feel: 'dry and irregular, with abrupt stops — nothing to hold on to',
  },
}

/**
 * The base register of each route, keyed by the path `App.tsx` declares.
 *
 * Two routes share `marutham` on purpose: Chapters and Saved are both *lists
 * the reader moves through*, and the register belongs to the activity rather
 * than to the screen. Credits is `mullai` — a page of names is a quiet, even,
 * held thing, and it must not borrow palai, which belongs to states and not to
 * places: the empty shelf, the broken connection, the search that found
 * nothing. Those can happen on any route, which is exactly why `registerFor`
 * takes a state as well as a path.
 */
export const ROUTE_REGISTER: Record<string, MotionRegister> = {
  '/': 'kurinji',
  '/chapters': 'marutham',
  '/saved': 'marutham',
  '/ask': 'mullai',
  '/credits': 'mullai',
  '/kural/:number': 'kurinji',
}

/** Everyday landscape, for a path nobody mapped: deliberate, not broken. */
export const DEFAULT_REGISTER: MotionRegister = 'marutham'

/** The states a reader passes through, in the app's own words. */
export type MotionState =
  | 'loading'
  | 'thinking'
  | 'arrived'
  | 'browsing'
  | 'sharing'
  | 'empty'
  | 'offline'
  | 'error'

/**
 * State overrides route. A state missing from this table keeps the route's own
 * register — `browsing` is written down anyway, because it is the state the two
 * marutham routes are *for*, and a reader of this file should be able to see
 * that rather than infer it.
 */
export const REGISTER_BY_STATE: Partial<Record<MotionState, MotionRegister>> = {
  loading: 'mullai',
  thinking: 'mullai',
  arrived: 'kurinji',
  browsing: 'marutham',
  sharing: 'neytal',
  empty: 'palai',
  offline: 'palai',
  error: 'palai',
}

/**
 * Which register a screen is in.
 *
 * `pathname` is whatever the router reports, so `/kural/1330` must find the
 * `/kural/:number` entry. Matching is done on the declared patterns rather than
 * on string prefixes so that adding `/kural/:number/notes` later cannot silently
 * inherit the wrong landscape: the longest matching pattern wins.
 */
export function registerForPath(pathname: string, routes = ROUTE_REGISTER): MotionRegister {
  const clean = pathname.replace(/\/+$/, '') || '/'
  let best: { length: number; register: MotionRegister } | null = null

  for (const [pattern, register] of Object.entries(routes)) {
    const expression = new RegExp(
      `^${pattern
        .split('/')
        .map((segment) => (segment.startsWith(':') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('/')}$`,
    )
    if (!expression.test(clean)) continue
    if (!best || pattern.length > best.length) best = { length: pattern.length, register }
  }

  return best?.register ?? DEFAULT_REGISTER
}

/** State first, then route: a screen knows *where* it is, a state knows *how*. */
export function registerFor(pathname: string, state?: MotionState): MotionRegister {
  if (state && REGISTER_BY_STATE[state]) return REGISTER_BY_STATE[state] as MotionRegister
  return registerForPath(pathname)
}

/** Every register, in the order §5 of the motion plan introduces them. */
export const MOTION_REGISTERS: readonly MotionRegister[] = [
  'kurinji',
  'mullai',
  'marutham',
  'neytal',
  'palai',
]

/**
 * A register's beat may not be faster than the weather floor.
 *
 * This is the law that keeps the grammar from overriding the budget: a
 * contributor cannot give neytal a two-second beat because the sea feels quick
 * today. It is checked here, at module load, and again in `test-motion.mjs` —
 * the first because a wrong constant should fail loudly in development, the
 * second because a wrong constant should never reach a reader.
 */
for (const register of MOTION_REGISTERS) {
  const motion = REGISTER_MOTION[register]
  if (motion.beatSeconds < IDLE_PERIOD_SECONDS_MIN) {
    throw new Error(
      `motion register ${register} has a ${motion.beatSeconds}s beat, below the ${IDLE_PERIOD_SECONDS_MIN}s weather floor`,
    )
  }
  if (motion.amplitude > 0.02) {
    throw new Error(`motion register ${register} travels ${motion.amplitude} of its own size, above the 2% ceiling`)
  }
}
