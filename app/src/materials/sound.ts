/**
 * Sound, synthesised — because the material world is not silent, and because
 * shipping audio files would break two promises at once: the install size, and
 * "no runtime services" (a cracked seal is not worth 200 KB of mp3).
 *
 * Every sound here is built from oscillators and noise at the moment it is
 * played, so it costs bytes only as code. They are deliberately quiet, they are
 * off until the reader asks for them, and they follow the same material logic
 * as the geometry: **wax cracks**, **paper rustles**, **brass rings**. A wax
 * seal that broke with a paper sound would undo the illusion the picture just
 * built.
 *
 * The audio context is created lazily and only inside a real user gesture —
 * every browser requires it, and a suspended context that never plays is a
 * resource leak with extra steps.
 */

export type SoundName =
  | 'wax-crack'
  | 'leaf-rustle'
  | 'thud'
  | 'bead'
  | 'bell'
  | 'ignite'
  | 'puff'

let context: AudioContext | null = null
let master: GainNode | null = null
let enabled = false
/** Cached noise buffer — one second of it covers every sound in the app. */
let noiseBuffer: AudioBuffer | null = null

type AudioContextConstructor = typeof AudioContext

function audioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null
  const candidate =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  return candidate ?? null
}

export function soundSupported(): boolean {
  return audioContextConstructor() !== null
}

export function setSoundEnabled(value: boolean): void {
  enabled = value
  if (!value && context && context.state === 'running') {
    void context.suspend().catch(() => undefined)
  } else if (value && context && context.state === 'suspended') {
    void context.resume().catch(() => undefined)
  }
}

export function isSoundEnabled(): boolean {
  return enabled
}

/**
 * Warm the audio graph up.
 *
 * Call this **inside** the user gesture that will eventually make a sound, not
 * at the moment the sound plays. A wax seal cracks 400 ms after the press, and
 * 400 ms later the browser no longer considers you to be inside a gesture — so
 * a context created at crack time starts suspended and the seal breaks in
 * silence. Creating it on the press and *using* it later is the fix.
 */
export function primeSound(): void {
  if (!enabled) return
  ensureContext()
}

/**
 * Create (or resume) the audio graph. Must be called from a user gesture the
 * first time; every call after that is free.
 */
function ensureContext(): AudioContext | null {
  if (!enabled) return null
  const Constructor = audioContextConstructor()
  if (!Constructor) return null

  if (!context) {
    try {
      context = new Constructor()
    } catch {
      return null
    }
    master = context.createGain()
    // Deliberately restrained: these are cues, not a soundtrack.
    master.gain.value = 0.16
    master.connect(context.destination)
  }
  if (context.state === 'suspended') void context.resume().catch(() => undefined)
  return context
}

function getNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const length = ctx.sampleRate
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i += 1) {
    // Slightly brown noise: white noise reads as a hiss, and every material
    // here is soft, so the spectrum is tilted down before anything else
    // happens to it.
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = white * 0.55 + last * 3.2
  }
  noiseBuffer = buffer
  return buffer
}

/**
 * A filtered burst of noise — the basis of every non-tonal sound here.
 * `sweep` bends the filter over the sound's life, which is what separates a
 * crack (bright, closing fast) from a rustle (dark, long).
 */
function noiseBurst(
  ctx: AudioContext,
  {
    duration,
    attack,
    startFrequency,
    endFrequency,
    q,
    gain,
    type = 'bandpass',
  }: {
    duration: number
    attack: number
    startFrequency: number
    endFrequency: number
    q: number
    gain: number
    type?: BiquadFilterType
  },
): void {
  const now = ctx.currentTime
  const source = ctx.createBufferSource()
  source.buffer = getNoise(ctx)
  source.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(startFrequency, now)
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), now + duration)

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.exponentialRampToValueAtTime(gain, now + attack)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  source.connect(filter)
  filter.connect(envelope)
  envelope.connect(master as GainNode)
  source.start(now)
  source.stop(now + duration + 0.02)
}

/** A struck or plucked tone, for brass and beads. */
function tone(
  ctx: AudioContext,
  {
    frequency,
    duration,
    gain,
    attack,
    decay,
    partials = [],
  }: {
    frequency: number
    duration: number
    gain: number
    attack: number
    decay: number
    partials?: { ratio: number; gain: number }[]
  },
): void {
  const now = ctx.currentTime
  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.exponentialRampToValueAtTime(gain, now + attack)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  envelope.connect(master as GainNode)

  const fundamental = ctx.createOscillator()
  fundamental.type = 'sine'
  fundamental.frequency.value = frequency
  fundamental.connect(envelope)
  fundamental.start(now)
  fundamental.stop(now + duration)

  // A bell is defined by its inharmonic partials — a pure sine is a beep.
  for (const partial of partials) {
    const oscillator = ctx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency * partial.ratio
    const partialGain = ctx.createGain()
    partialGain.gain.value = partial.gain
    oscillator.connect(partialGain)
    partialGain.connect(envelope)
    oscillator.start(now)
    // Higher partials die first, which is what makes it decay like metal.
    oscillator.stop(now + duration * (0.35 + 0.65 / partial.ratio))
  }

  void decay
}

export interface PlayOptions {
  /** 0..1 — how hard the material was struck. */
  intensity?: number
}

/**
 * Play a material sound. Safe to call when sound is off, unsupported, or the
 * context is suspended: it simply does nothing.
 */
export function play(name: SoundName, options: PlayOptions = {}): void {
  const ctx = ensureContext()
  if (!ctx) return
  const intensity = Math.max(0.05, Math.min(1, options.intensity ?? 0.8))

  switch (name) {
    case 'wax-crack':
      // Two transients: the initial snap, then the tearing of the rest of the
      // seal a few milliseconds behind it. Wax is brittle, so both close fast.
      noiseBurst(ctx, {
        duration: 0.09,
        attack: 0.001,
        startFrequency: 3400,
        endFrequency: 900,
        q: 2.4,
        gain: 0.5 * intensity,
      })
      noiseBurst(ctx, {
        duration: 0.22,
        attack: 0.004,
        startFrequency: 1800,
        endFrequency: 320,
        q: 1.2,
        gain: 0.34 * intensity,
      })
      break

    case 'leaf-rustle':
      // Dry, wide, unhurried — a stiff leaf straightening out.
      noiseBurst(ctx, {
        duration: 0.85,
        attack: 0.05,
        startFrequency: 900,
        endFrequency: 2600,
        q: 0.7,
        gain: 0.2 * intensity,
        type: 'highpass',
      })
      noiseBurst(ctx, {
        duration: 1.15,
        attack: 0.12,
        startFrequency: 420,
        endFrequency: 150,
        q: 0.6,
        gain: 0.16 * intensity,
      })
      break

    case 'thud':
      // A chip landing on wood: a short low body with almost no top.
      tone(ctx, {
        frequency: 128,
        duration: 0.13,
        gain: 0.3 * intensity,
        attack: 0.002,
        decay: 0.11,
        partials: [{ ratio: 1.8, gain: 0.4 }],
      })
      noiseBurst(ctx, {
        duration: 0.05,
        attack: 0.001,
        startFrequency: 1400,
        endFrequency: 400,
        q: 1,
        gain: 0.14 * intensity,
      })
      break

    case 'bead':
      // Small wooden beads settling against one another.
      tone(ctx, {
        frequency: 720 + Math.random() * 160,
        duration: 0.1,
        gain: 0.22 * intensity,
        attack: 0.001,
        decay: 0.09,
        partials: [{ ratio: 2.7, gain: 0.25 }],
      })
      break

    case 'bell':
      // Brass: inharmonic partials at the ratios a real ghanta rings with.
      tone(ctx, {
        frequency: 528,
        duration: 2.4,
        gain: 0.3 * intensity,
        attack: 0.004,
        decay: 2.3,
        partials: [
          { ratio: 2.76, gain: 0.5 },
          { ratio: 5.4, gain: 0.24 },
          { ratio: 8.93, gain: 0.11 },
        ],
      })
      break

    case 'ignite':
      // A match: a scrape, then the flare.
      noiseBurst(ctx, {
        duration: 0.13,
        attack: 0.002,
        startFrequency: 2600,
        endFrequency: 600,
        q: 1.4,
        gain: 0.36 * intensity,
      })
      noiseBurst(ctx, {
        duration: 0.4,
        attack: 0.02,
        startFrequency: 780,
        endFrequency: 240,
        q: 0.8,
        gain: 0.2 * intensity,
      })
      break

    case 'puff':
      // Cupping a hand over the flame.
      noiseBurst(ctx, {
        duration: 0.28,
        attack: 0.01,
        startFrequency: 520,
        endFrequency: 180,
        q: 0.6,
        gain: 0.3 * intensity,
        type: 'lowpass',
      })
      break
  }
}

/** Release the audio graph. Called when the material world unmounts. */
export function disposeSound(): void {
  if (context) {
    void context.close().catch(() => undefined)
    context = null
    master = null
    noiseBuffer = null
  }
}
