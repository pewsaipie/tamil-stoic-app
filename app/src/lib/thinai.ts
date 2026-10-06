/**
 * Thinai — the five landscapes, as the app's motion grammar.
 *
 * The Sangam poets did not describe scenery: they codified **feeling as
 * ecology**. Every poem belongs to one of five thinai, and each carries a fixed
 * set of signifiers — hour, season, flower, fauna, water, work, god. That makes
 * the system usable as an interface grammar, because the states a reader passes
 * through are states the landscapes already have names for:
 *
 *   குறிஞ்சி  kurinji    union, joy             → meeting the verse, love, friends
 *   முல்லை   mullai     patient waiting, hope  → loading, thinking, restraint
 *   மருதம்   marutham   the household, friction→ anger, family, money, work
 *   நெய்தல்  neithal    pining, the tide       → grief, sending something away
 *   பாலை     palai      the hard passage       → fear, empty, offline, error
 *
 * `DOOR_WEATHER` is the argument, door by door. It lives in `lib/` rather than
 * inside the component so it can be asserted: `scripts/test-motion.mjs` fails if
 * a door has no landscape, a landscape has no weather, or the two fall out of
 * step.
 *
 * Sources: the thinai attribute tables (Wikipedia, *Sangam landscape*; Grokipedia),
 * and the landscape-mood codification of the Tolkappiyam. Weather per register is
 * drawn in `styles/ambient.css`.
 */

export type WeatherRegister = 'kurinji' | 'mullai' | 'marutham' | 'neytal' | 'palai'

export const WEATHER_REGISTERS: readonly WeatherRegister[] = [
  'kurinji',
  'mullai',
  'marutham',
  'neytal',
  'palai',
]

/**
 * Door id → landscape, by feeling rather than by keyword.
 *
 * A door missing from this table falls to `marutham` — the everyday
 * landscape — rather than to nothing: an unmapped door should look deliberate,
 * not broken.
 */
export const DOOR_WEATHER: Record<string, WeatherRegister> = {
  love: 'kurinji',
  friends: 'kurinji',
  wisdom: 'kurinji',
  patience: 'mullai',
  starting: 'mullai',
  learning: 'mullai',
  words: 'mullai',
  anger: 'marutham',
  family: 'marutham',
  wealth: 'marutham',
  grief: 'neytal',
  fear: 'palai',
}
