/**
 * The material preference, as React state.
 *
 * `quality.ts` and `preference.ts` are deliberately pure — they know nothing
 * about React, so the tier matrix can be tested without a DOM. This hook is the
 * only place that turns them into something a component can subscribe to, which
 * keeps the read-once-per-mount behaviour of the rest of the app (see the note
 * in `SealedLeaf` about never re-deciding mid-press).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  decideTier,
  reportCapabilities,
  type CapabilityReport,
  type MaterialTier,
  type TierDecision,
} from './quality.ts'
import {
  readMaterialsMode,
  readSoundEnabled,
  writeMaterialsMode,
  writeSoundEnabled,
  type StoredMaterialMode,
} from './preference.ts'
import { setSoundEnabled } from './sound.ts'
import { isForcedColoursActive, subscribeForcedColours } from './forcedColours.ts'
import { useReducedMotion } from '../hooks/useReader.ts'

export interface MaterialsState {
  mode: StoredMaterialMode
  setMode: (mode: StoredMaterialMode) => void
  tier: MaterialTier
  decision: TierDecision
  capabilities: CapabilityReport
  sound: boolean
  setSound: (enabled: boolean) => void
}

export function useMaterials(): MaterialsState {
  const [mode, setModeState] = useState<StoredMaterialMode>(() => readMaterialsMode())
  const [sound, setSoundState] = useState<boolean>(() => readSoundEnabled())
  const reducedMotion = useReducedMotion()

  // Capabilities are probed once. A probe creates and releases a WebGL context,
  // which is not something to do on every render.
  const capabilities = useMemo(() => reportCapabilities(), [])

  /**
   * Forced colours is the one capability that must not be frozen at mount.
   *
   * It is a live OS setting: a reader can turn it on with the app open, on a
   * phone by covering the screen with a hand, and a scene that keeps rendering a
   * warm lamp into a frame the platform has just declared high-contrast is not
   * respecting a preference, it is overriding one. So the probe result is
   * replaced here rather than trusted, and the whole app re-tiers through this
   * hook because it is the only reader of `decideTier`.
   */
  const [forcedColors, setForcedColors] = useState<boolean>(() => isForcedColoursActive())

  useEffect(() => subscribeForcedColours(setForcedColors), [])

  const decision = useMemo(
    () =>
      decideTier(mode, {
        ...capabilities,
        forcedColors,
        reducedMotion: capabilities.reducedMotion || reducedMotion,
      }),
    [mode, capabilities, forcedColors, reducedMotion],
  )

  const setMode = useCallback((next: StoredMaterialMode) => {
    writeMaterialsMode(next)
    setModeState(next)
  }, [])

  const setSound = useCallback((enabled: boolean) => {
    writeSoundEnabled(enabled)
    setSoundEnabled(enabled)
    setSoundState(enabled)
  }, [])

  // Keep the synthesiser in step with the stored preference on boot, so a
  // reader who turned sound on last week does not have to turn it on again.
  useEffect(() => {
    setSoundEnabled(readSoundEnabled())
  }, [])

  return { mode, setMode, tier: decision.tier, decision, capabilities, sound, setSound }
}
