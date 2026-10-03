/**
 * Device speech (TTS) — a faithful port of the shipped reader's engine.
 *
 * The app never records or streams audio: it hands the couplet to the device's
 * own speech synthesiser, offline. The port keeps every hardening the vanilla
 * implementation earned against real engines:
 *
 *   - a token guard, because Chrome fires `interrupted` asynchronously for a
 *     cancelled utterance, after a replacement may already be playing;
 *   - a strong reference to the live utterance, because Chrome can garbage-
 *     collect one that nothing else holds, cutting speech short;
 *   - a start check + single retry, because Chrome can silently drop a `speak()`
 *     issued in the same tick as `cancel()` (the retry only ever *starts* speech
 *     that was dropped, never stops speech that began);
 *   - `speak()` called synchronously inside the click gesture, because iOS
 *     Safari refuses deferred speech;
 *   - a transliteration fallback with a one-time explanation, because most
 *     Windows, iOS and Android devices have no Tamil voice and would otherwise
 *     stay silent;
 *   - voice priming with short polling, because `getVoices()` is empty until the
 *     engine warms up and some WebViews never fire `voiceschanged`.
 */

export type SpeechFailure =
  | { kind: 'unsupported' }
  | { kind: 'blocked' }
  | { kind: 'no-tamil-voice' }
  | { kind: 'failed' }

export interface SpeechCallbacks {
  onStateChange: (speakingN: number | null) => void
  onNotice: (failure: SpeechFailure) => void
}

const VOICE_POLL_MS = [250, 800, 2000, 4000] as const

let voices: SpeechSynthesisVoice[] = []
let primed = false
let speakingN: number | null = null
let token = 0
let currentUtterance: SpeechSynthesisUtterance | null = null
let noTamilVoiceWarned = false
let callbacks: SpeechCallbacks | null = null

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null
  if (!('speechSynthesis' in window)) return null
  if (typeof window.SpeechSynthesisUtterance !== 'function') return null
  return window.speechSynthesis
}

export function speechSupported(): boolean {
  return synth() !== null
}

function loadVoices(engine: SpeechSynthesis): SpeechSynthesisVoice[] {
  try {
    voices = engine.getVoices() || []
  } catch {
    voices = []
  }
  return voices
}

/** Warm the voice list up; some engines stay empty until first speech. */
export function primeVoices(): void {
  const engine = synth()
  if (!engine || primed) return
  primed = true

  loadVoices(engine)
  if (voices.length === 0) {
    for (const ms of VOICE_POLL_MS) {
      window.setTimeout(() => loadVoices(engine), ms)
    }
  }

  const onVoices = (): void => {
    loadVoices(engine)
  }
  if (typeof engine.addEventListener === 'function') {
    try {
      engine.addEventListener('voiceschanged', onVoices)
    } catch {
      /* older engine */
    }
  }
  try {
    engine.onvoiceschanged = onVoices
  } catch {
    /* ignore */
  }
}

function voiceLangCode(voice?: SpeechSynthesisVoice | null): string {
  return String(voice?.lang ?? '')
    .toLowerCase()
    .replace('_', '-')
}

export function pickTamilVoice(engine?: SpeechSynthesis): SpeechSynthesisVoice | null {
  const list = voices.length > 0 ? voices : engine ? loadVoices(engine) : []
  for (const voice of list) {
    const code = voiceLangCode(voice)
    if (code === 'ta' || code.startsWith('ta-')) return voice
  }
  return null
}

/** Fallback narrator: Indian English first, then any English, then default. */
export function pickFallbackVoice(engine?: SpeechSynthesis): SpeechSynthesisVoice | null {
  const list = voices.length > 0 ? voices : engine ? loadVoices(engine) : []
  let firstEnglish: SpeechSynthesisVoice | null = null
  for (const voice of list) {
    const code = voiceLangCode(voice)
    if (!code.startsWith('en')) continue
    if (!firstEnglish) firstEnglish = voice
    if (code === 'en-in') return voice
  }
  return firstEnglish
}

function isVoiceMissingError(error: string): boolean {
  return (
    error === 'not-found' ||
    error === 'language-unavailable' ||
    error === 'language-not-supported' ||
    error === 'voice-unavailable' ||
    error === 'synthesis-unavailable'
  )
}

function setSpeaking(n: number | null): void {
  speakingN = n
  callbacks?.onStateChange(n)
}

export function stopSpeech(): void {
  token += 1
  currentUtterance = null
  const engine = synth()
  if (engine) {
    try {
      engine.cancel()
    } catch {
      /* the engine may already be idle */
    }
  }
  setSpeaking(null)
}

export function currentSpeaking(): number | null {
  return speakingN
}

function startSpeech(kural: KuralLike, runToken: number, useTranslit: boolean): void {
  const engine = synth()
  if (!engine) return
  const Utterance = window.SpeechSynthesisUtterance

  const voice = useTranslit ? null : pickTamilVoice(engine)
  let utterance: SpeechSynthesisUtterance

  if (voice) {
    utterance = new Utterance(`${kural.ta[0]} ${kural.ta[1]}`)
    utterance.voice = voice
    utterance.lang = voice.lang || 'ta-IN'
  } else {
    utterance = new Utterance(`${kural.tr[0]} ${kural.tr[1]}`)
    const fallback = pickFallbackVoice(engine)
    if (fallback) utterance.voice = fallback
    utterance.lang = fallback?.lang || 'en-IN'
    if (!noTamilVoiceWarned) {
      noTamilVoiceWarned = true
      callbacks?.onNotice({ kind: 'no-tamil-voice' })
    }
  }
  utterance.rate = 0.9
  currentUtterance = utterance

  const usedTamil = voice !== null
  let retried = false

  utterance.onend = () => {
    if (runToken !== token) return // superseded — newer speech owns the UI
    currentUtterance = null
    setSpeaking(null)
  }

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    if (runToken !== token) return // cancelled on purpose
    const error: string = typeof event?.error === 'string' ? event.error : ''
    if (error === 'interrupted' || error === 'canceled' || error === 'cancelled') return
    currentUtterance = null
    setSpeaking(null)
    if (usedTamil && isVoiceMissingError(error)) {
      // The engine advertised a Tamil voice but failed to use it (some Android
      // builds do). Self-heal by reading the transliteration instead.
      startSpeech(kural, runToken, true)
      return
    }
    callbacks?.onNotice(error === 'not-allowed' ? { kind: 'blocked' } : { kind: 'failed' })
  }

  setSpeaking(kural.n)

  try {
    engine.speak(utterance)
    try {
      engine.resume()
    } catch {
      /* harmless no-op when already running */
    }
  } catch {
    currentUtterance = null
    setSpeaking(null)
    callbacks?.onNotice({ kind: 'failed' })
    return
  }

  // Verify the engine actually took the call; only ever starts dropped speech.
  window.setTimeout(() => {
    if (runToken !== token) return
    if (speakingN !== kural.n || currentUtterance !== utterance) return
    if (engine.speaking === true || engine.pending === true) return
    if (retried) return
    retried = true
    try {
      engine.speak(utterance)
      try {
        engine.resume()
      } catch {
        /* ignore */
      }
    } catch {
      /* the next tap restarts cleanly */
    }
  }, 150)
}

interface KuralLike {
  n: number
  ta: [string, string]
  tr: [string, string]
}

/**
 * Speak a couplet, or stop if it is already speaking. Call this straight from
 * the click handler — never from an effect or a promise — so iOS keeps the
 * gesture context.
 */
export function toggleSpeech(kural: KuralLike, handlers: SpeechCallbacks): void {
  callbacks = handlers
  const engine = synth()
  if (!engine) {
    handlers.onNotice({ kind: 'unsupported' })
    return
  }

  const busy = engine.speaking === true || engine.pending === true
  if (speakingN === kural.n && busy) {
    stopSpeech()
    return
  }
  // `speakingN === n` with an idle engine means the previous run died without
  // firing onend (a known Web Speech quirk): restart instead of "stopping"
  // silence.

  token += 1
  const runToken = token
  currentUtterance = null
  if (busy) {
    try {
      engine.cancel()
    } catch {
      /* ignore */
    }
  }
  startSpeech(kural, runToken, false)
}

/** Test seam: reset module state between engine personas. */
export function resetSpeechForTests(): void {
  voices = []
  primed = false
  speakingN = null
  token += 1
  currentUtterance = null
  noTamilVoiceWarned = false
  callbacks = null
}
