/**
 * The loop registry — the ceiling on how many frames a route may run.
 *
 * `PARTICLE_BUDGET` counts what is *drawn*; this counts what is *drawn with* —
 * how many `requestAnimationFrame` chains a route is allowed to keep alive at
 * once. They are different budgets and both are needed: a single loop can draw
 * a thousand particles, and four loops drawing sixteen particles each will
 * still keep a phone's little core awake all evening.
 *
 * The ceiling is `LOOP_BUDGET.idles` (three), because the route's one WebGL
 * scene is the fourth frame and the material side already refuses to mount a
 * second one. What matters more than the number is that exceeding it is
 * **refused and named**: `start()` returns `null` and records the name, so a
 * component that quietly added a fourth loop shows up as a refusal the tests can
 * read rather than as a phone that gets warm.
 *
 * The class is deliberately not React-aware. It is a plain object with a size,
 * a cap and a report, which means `scripts/test-motion.mjs` can run the whole
 * admission policy in Node — no renderer, no DOM, no clock.
 */
import { LOOP_BUDGET } from './budget.ts'

export type LoopKind = 'idle' | 'interaction'

export interface LoopReport {
  /** Names currently holding a slot, in the order they were admitted. */
  active: string[]
  /** Names that were turned away, in the order they asked. */
  refused: string[]
  /** The cap those names were measured against. */
  cap: number
}

export class LoopRegistry {
  private readonly live = new Map<string, LoopKind>()
  private readonly refusedNames = new Set<string>()

  /**
   * The cap, as a field rather than a constructor parameter property.
   *
   * Not style: Node's type-stripping — which is how `scripts/test-motion.mjs`
   * imports this file, with no build step — refuses parameter properties
   * outright (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). Anything the test scripts
   * import has to be syntax that erases cleanly.
   */
  readonly cap: number

  constructor(cap: number = LOOP_BUDGET.idles) {
    this.cap = cap
  }

  get size(): number {
    return this.live.size
  }

  /**
   * Ask for a slot. Returns the release function, or `null` if there is none.
   *
   * A duplicate name is refused rather than shared: two components registering
   * `'atmosphere'` is a mistake — the same canvas driven twice, or two canvases
   * claiming the same identity — and the second one silently attaching to the
   * first would hide it. Refusing names it instead.
   *
   * `kind` is recorded because an interaction response is a different promise
   * from idle weather: an interaction may be faster than the six-second floor,
   * and a reader of `active()` should be able to see which kind is running.
   */
  start(name: string, kind: LoopKind = 'idle'): (() => void) | null {
    if (this.live.has(name) || this.live.size >= this.cap) {
      this.refusedNames.add(name)
      return null
    }
    this.live.set(name, kind)
    return () => {
      this.live.delete(name)
    }
  }

  report(): LoopReport {
    return {
      active: [...this.live.keys()],
      refused: [...this.refusedNames],
      cap: this.cap,
    }
  }

  /** Test and teardown hook. The app itself never needs to empty the room. */
  clear(): void {
    this.live.clear()
    this.refusedNames.clear()
  }
}

/**
 * The route's registry.
 *
 * Module-level, and that is a decision rather than laziness: it is a ceiling on
 * the *screen*, not on a component tree, so it has to outlive any one component
 * and be shared by every loop the screen mounts. `useMotionLoop` registers on
 * mount and releases on unmount; a loop that forgets to release shows up in
 * `report().active` in the tests, which is exactly the leak this exists to catch.
 */
export const routeLoops = new LoopRegistry()
