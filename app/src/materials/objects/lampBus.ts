/**
 * The lamp's signal — the seam between the DOM timer and the 3D room.
 *
 * The sit-timer ticks four times a second. Putting that in the Zustand store
 * would re-render every subscriber in the app on every tick, for a number that
 * exactly two things care about: the lamp in the table scene, and the timer's
 * own readout.
 *
 * So it is a bus, not state: `SitTimer` publishes, the scene reads inside
 * `useFrame` — sixty times a second, on the render thread's own schedule, with
 * no React work at all in between.
 */

export interface LampSignal {
  /** The reader has lit the lamp and the minute is running. */
  lit: boolean
  /** 1 = a full bowl of oil, 0 = the minute is spent. */
  burn: number
}

let signal: LampSignal = { lit: false, burn: 1 }
const listeners = new Set<(next: LampSignal) => void>()

export function publishLamp(next: Partial<LampSignal>): void {
  signal = { ...signal, ...next }
  for (const listener of listeners) listener(signal)
}

export function readLamp(): LampSignal {
  return signal
}

export function subscribeLamp(listener: (next: LampSignal) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
