/**
 * Speech state shared by every Listen control (cards, focus reader, and later
 * Ask Valluvar). One store, so two cards can never disagree about what is
 * playing, and the "Stop" label always matches reality.
 */
import { create } from 'zustand'
import {
  currentSpeaking,
  primeVoices,
  speechSupported,
  stopSpeech,
  toggleSpeech,
  type SpeechFailure,
} from '../lib/speech'
import type { Kural } from '../lib/types'
import { useReaderStore } from './appStore'

interface SpeechState {
  speakingN: number | null
  supported: boolean
  /** Speak the couplet, or stop it when it is already speaking. */
  toggle: (kural: Kural) => void
  stop: () => void
}

function noticeFor(failure: SpeechFailure): { message: string; tone: 'info' | 'danger' } {
  switch (failure.kind) {
    case 'unsupported':
      return { message: 'Audio is not available in this browser.', tone: 'danger' }
    case 'blocked':
      return { message: 'Audio was blocked by the browser — tap Listen again to allow it.', tone: 'danger' }
    case 'no-tamil-voice':
      return {
        message:
          'No Tamil voice is installed on this device — reading the transliteration instead. Install a Tamil voice to hear the original script.',
        tone: 'info',
      }
    case 'failed':
    default:
      return {
        message: "Audio couldn't play on this device. It may lack a Tamil voice.",
        tone: 'danger',
      }
  }
}

export const useSpeechStore = create<SpeechState>((set) => ({
  speakingN: currentSpeaking(),
  supported: speechSupported(),

  toggle: (kural) => {
    primeVoices()
    toggleSpeech(kural, {
      onStateChange: (speakingN) => set({ speakingN }),
      onNotice: (failure) => {
        const { message, tone } = noticeFor(failure)
        useReaderStore.getState().pushToast(message, tone)
      },
    })
  },

  stop: () => {
    stopSpeech()
    set({ speakingN: null })
  },
}))

export const selectIsSpeaking = (n: number) => (state: SpeechState): boolean =>
  state.speakingN === n
