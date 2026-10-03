/**
 * Reading settings — the same six groups the shipped reader offers (text size,
 * line spacing, colour, interface language, reading layers, motion) plus high
 * contrast, in a Radix dialog so focus trapping, Escape and `aria-modal` come
 * from the platform rather than from hand-rolled code.
 *
 * Nothing here changes the couplet's structure: type size, spacing, colour and
 * contrast scale the type around the two fixed lines.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { LAYER_LABELS, LAYER_ORDER, type LayerKey } from '../../lib/types'
import { useReaderStore } from '../../store/appStore'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'

const TEXT_SIZES = [
  { value: 'standard', label: 'Standard' },
  { value: 'large', label: 'Large' },
  { value: 'x-large', label: 'Extra large' },
] as const

const SPACINGS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'relaxed', label: 'Relaxed' },
] as const

const THEMES = [
  { value: 'palm', label: 'Palm-leaf day' },
  { value: 'night', label: 'Sangam clay' },
  { value: 'system', label: 'Follow system' },
] as const

const LANGUAGES = [
  { value: 'en', label: 'English', lang: 'en' },
  { value: 'ta', label: 'தமிழ்', lang: 'ta' },
] as const

function ChoiceGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string
  value: T
  options: readonly { value: T; label: string; lang?: string }[]
  onChange: (value: T) => void
}) {
  return (
    <section className="space-y-2">
      <h3 className="m-0 text-sm text-muted">{legend}</h3>
      <div role="group" aria-label={legend} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="chip"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            lang={option.lang}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}

export interface SettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const fontSize = useReaderStore((state) => state.fontSize)
  const setFontSize = useReaderStore((state) => state.setFontSize)
  const lineSpacing = useReaderStore((state) => state.lineSpacing)
  const setLineSpacing = useReaderStore((state) => state.setLineSpacing)
  const theme = useReaderStore((state) => state.theme)
  const setTheme = useReaderStore((state) => state.setTheme)
  const uiLanguage = useReaderStore((state) => state.uiLanguage)
  const setUiLanguage = useReaderStore((state) => state.setUiLanguage)
  const layers = useReaderStore((state) => state.layers)
  const toggleLayer = useReaderStore((state) => state.toggleLayer)
  const reduceMotion = useReaderStore((state) => state.reduceMotion)
  const setReduceMotion = useReaderStore((state) => state.setReduceMotion)
  const highContrast = useReaderStore((state) => state.highContrast)
  const setHighContrast = useReaderStore((state) => state.setHighContrast)
  const t = useT()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-[var(--z-overlay)] max-h-[90dvh] overflow-y-auto',
            'sm:inset-x-auto sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2',
            'sm:w-[min(560px,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2',
            'glass-panel grain p-5 pb-[calc(var(--space-6)+env(safe-area-inset-bottom))] sm:p-6',
          )}
        >
          <div className="mb-[var(--space-4)] flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-xs tracking-wide text-muted uppercase">
                {t('settings.eyebrow', 'Make this reader yours')}
              </p>
              <Dialog.Title className="m-0 text-xl text-ink">
                {t('settings.title', 'Reading settings')}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close reading settings"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <X size={18} strokeWidth={1.6} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="space-y-[var(--space-5)]">
            <ChoiceGroup
              legend={t('settings.textSize', 'Text size')}
              value={fontSize}
              options={TEXT_SIZES}
              onChange={setFontSize}
            />
            <ChoiceGroup
              legend={t('settings.spacing', 'Line spacing')}
              value={lineSpacing}
              options={SPACINGS}
              onChange={setLineSpacing}
            />
            <ChoiceGroup
              legend={t('settings.colour', 'Colour')}
              value={theme}
              options={THEMES}
              onChange={setTheme}
            />
            <ChoiceGroup
              legend={`${t('settings.language', 'Interface language')} · இடைமுக மொழி`}
              value={uiLanguage}
              options={LANGUAGES}
              onChange={setUiLanguage}
            />

            <fieldset className="space-y-2 border-0 p-0">
              <legend className="text-sm text-muted">{t('settings.layers', 'Reading layers')}</legend>
              {LAYER_ORDER.map((layer: LayerKey) => (
                <label key={layer} className="flex min-h-[44px] items-center gap-3 text-[15px]">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--accent)]"
                    checked={layers[layer]}
                    onChange={() => toggleLayer(layer)}
                  />
                  <span>
                    {t(`settings.layer.${layer}`, LAYER_LABELS[layer].en)}
                  </span>
                  {layer === 'tamil' ? (
                    <span lang="ta" className="text-muted">
                      குறள்
                    </span>
                  ) : null}
                </label>
              ))}
              <p className="m-0 text-xs text-muted">
                {t(
                  'settings.coupletNote',
                  'The Tamil couplet always keeps its standard two lines — four சீர் on top, three below — whatever size, spacing or contrast you choose.',
                )}
              </p>
            </fieldset>

            <label className="flex min-h-[44px] items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={reduceMotion}
                onChange={(event) => setReduceMotion(event.target.checked)}
              />
              <span>{t('settings.motion', 'Reduce motion')}</span>
            </label>

            <label className="flex min-h-[44px] items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={highContrast}
                onChange={(event) => setHighContrast(event.target.checked)}
              />
              <span>{t('settings.contrast', 'Higher contrast')}</span>
            </label>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
