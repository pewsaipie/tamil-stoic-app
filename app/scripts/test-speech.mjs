/**
 * Device-TTS regression suite (ports scripts/test-speech.mjs from the shipped
 * reader). Each persona is a fake engine that misbehaves the way real ones do;
 * the module under test is the exact file the app imports.
 *
 *   npm run test:speech
 */
import { resetSpeechForTests, toggleSpeech } from '../src/lib/speech.ts'

let failed = 0
function check(condition, message) {
  if (condition) console.log('  ✓', message)
  else {
    console.error('  ✗ FAIL:', message)
    failed += 1
  }
}

const KURAL = {
  n: 151,
  ta: ['அதிகாரம் அளித்தார் பெருமை', 'அகல்வதுகொல் யான்பொறை'],
  tr: ['Adhikaram Aliththaar Perumai', 'Agalvadhukol Yaanporai'],
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class FakeUtterance {
  constructor(text) {
    this.text = text
    this.lang = ''
    this.voice = null
    this.rate = 1
    this.onend = null
    this.onerror = null
  }
}

function installEngine({ voices = [], speaking = false, pending = false, failWith = null, dropFirstSpeak = false } = {}) {
  const calls = { speak: [], cancel: 0, resume: 0 }
  let state = { speaking, pending }

  class Engine {
    getVoices() {
      return voices
    }
    speak(utterance) {
      calls.speak.push(utterance)
      if (dropFirstSpeak && calls.speak.length === 1) return // Chrome's silent drop
      state = { speaking: true, pending: false }
      if (failWith) {
        setTimeout(() => utterance.onerror?.({ error: failWith }), 0)
      }
    }
    cancel() {
      calls.cancel += 1
      state = { speaking: false, pending: false }
    }
    resume() {
      calls.resume += 1
    }
    get speaking() {
      return state.speaking
    }
    get pending() {
      return state.pending
    }
    addEventListener() {}
  }

  globalThis.window = {
    speechSynthesis: new Engine(),
    SpeechSynthesisUtterance: FakeUtterance,
    setTimeout,
    clearTimeout,
  }
  return calls
}

const voice = (lang, name = lang) => ({ lang, name, default: false, localService: true, voiceURI: name })

function collect() {
  const notices = []
  const states = []
  return {
    notices,
    states,
    handlers: {
      onStateChange: (n) => states.push(n),
      onNotice: (failure) => notices.push(failure.kind),
    },
  }
}

/* ---------------------------------------------------------------- personas */

console.log('persona: a device with a Tamil voice')
{
  installEngine({ voices: [voice('ta-IN'), voice('en-IN')] })
  resetSpeechForTests()
  const { notices, states, handlers } = collect()
  toggleSpeech(KURAL, handlers)
  await wait(20)
  check(states.includes(151), 'the store reports the kural as speaking')
  check(notices.length === 0, 'no notice is raised when a Tamil voice exists')
  check(globalThis.window.speechSynthesis.speaking === true, 'the engine is speaking')
  resetSpeechForTests()
}

console.log('persona: no Tamil voice installed (most Windows/iOS devices)')
{
  const calls = installEngine({ voices: [voice('en-GB'), voice('en-IN')] })
  resetSpeechForTests()
  const first = collect()
  toggleSpeech(KURAL, first.handlers)
  await wait(20)
  check(first.notices.includes('no-tamil-voice'), 'the reader is told once about the fallback')
  check(
    calls.speak[0]?.text.includes('Adhikaram'),
    'the transliteration is read instead of staying silent',
  )
  check(
    String(calls.speak[0]?.voice?.lang).toLowerCase() === 'en-in',
    'an Indian English voice is preferred',
  )

  // Same session, second kural: the notice belongs to the device, not the verse.
  toggleSpeech(KURAL, first.handlers) // stop
  const second = collect()
  toggleSpeech(KURAL, second.handlers)
  await wait(20)
  check(!second.notices.includes('no-tamil-voice'), 'the explanation is not repeated')
}

console.log('persona: Chrome drops a speak() issued right after cancel()')
{
  const calls = installEngine({ voices: [voice('ta-IN')], dropFirstSpeak: true })
  resetSpeechForTests()
  const { handlers } = collect()
  toggleSpeech(KURAL, handlers)
  await wait(250)
  check(calls.speak.length === 2, 'the dropped utterance is retried exactly once')
  check(globalThis.window.speechSynthesis.speaking === true, 'speech starts on the retry')
}

console.log('persona: an Android engine that fails the Tamil voice it advertised')
{
  const calls = installEngine({ voices: [voice('ta-IN')], failWith: 'language-unavailable' })
  resetSpeechForTests()
  toggleSpeech(KURAL, collect().handlers)
  await wait(60)
  check(calls.speak.length === 2, 'the engine retries once')
  check(calls.speak[1]?.text.includes('Adhikaram'), 'the retry reads the transliteration')
}

console.log('persona: a blocked (not-allowed) engine')
{
  installEngine({ voices: [voice('ta-IN')], failWith: 'not-allowed' })
  resetSpeechForTests()
  const { notices, handlers } = collect()
  toggleSpeech(KURAL, handlers)
  await wait(30)
  check(notices.includes('blocked'), 'a blocked engine raises the "tap again" notice')
}

console.log('persona: no speech engine at all')
{
  globalThis.window = { setTimeout, clearTimeout }
  resetSpeechForTests()
  const { notices, handlers } = collect()
  toggleSpeech(KURAL, handlers)
  check(notices.includes('unsupported'), 'the reader is told audio is unavailable')
}

console.log('persona: toggling off while speaking')
{
  const calls = installEngine({ voices: [voice('ta-IN')] })
  resetSpeechForTests()
  const { states, handlers } = collect()
  toggleSpeech(KURAL, handlers)
  await wait(10)
  toggleSpeech(KURAL, handlers)
  check(states[states.length - 1] === null, 'tapping Listen again stops the recitation')
  check(calls.cancel >= 1, 'the engine is told to cancel')
}

console.log('persona: a stale error from a cancelled utterance')
{
  const calls = installEngine({ voices: [voice('ta-IN')] })
  resetSpeechForTests()
  const { states, handlers } = collect()
  toggleSpeech(KURAL, handlers)
  await wait(10)
  const first = calls.speak[0]
  toggleSpeech(KURAL, handlers) // stop
  // Chrome delivers the cancelled utterance's error after the fact.
  first?.onerror?.({ error: 'interrupted' })
  await wait(20)
  check(states[states.length - 1] === null, "the late 'interrupted' error cannot revive the UI")
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll speech personas passed.')
