/**
 * The sealed leaf — today's couplet before it is opened.
 *
 * A rolled ola leaf with a wax seal carrying the kural number. It is an
 * invitation, never a lock: the whole surface is one button, and
 * "open without the ceremony" sits beside it for anyone who would rather just
 * read. The ceremony can be switched off altogether in Reading settings.
 *
 * The leaf is drawn in CSS and SVG — no image asset, no network, and nothing
 * that changes the couplet's two-line structure once it is revealed.
 */
import { motion } from 'framer-motion'
import { taNumeral } from '../../lib/shareCard'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'

export interface SealedLeafProps {
  kuralNumber: number
  /** `instant` skips the animation — used by "open without the ceremony". */
  onOpen: (options?: { instant?: boolean }) => void
  reducedMotion: boolean
  className?: string
}

/**
 * The wax seal. `var(--accent)` over `var(--on-accent)` is one of the pairs
 * `test-tokens.mjs` measures, so the numeral stays legible in every theme.
 */
function WaxSeal({ number }: { number: number }) {
  const scallops = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2
    return { cx: 32 + Math.cos(angle) * 26, cy: 32 + Math.sin(angle) * 26, key: index }
  })

  return (
    <svg
      viewBox="0 0 64 64"
      width="76"
      height="76"
      aria-hidden="true"
      className="drop-shadow-[0_2px_6px_var(--accent-glow)]"
    >
      {scallops.map((dot) => (
        <circle key={dot.key} cx={dot.cx} cy={dot.cy} r="3.4" fill="var(--accent)" opacity="0.85" />
      ))}
      <circle cx="32" cy="32" r="23" fill="var(--accent)" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="var(--on-accent)" strokeWidth="0.9" opacity="0.45" />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fontSize="14"
        fontWeight={600}
        fill="var(--on-accent)"
        fontFamily="var(--font-tamil)"
      >
        {taNumeral(number)}
      </text>
    </svg>
  )
}

export function SealedLeaf({ kuralNumber, onOpen, reducedMotion, className }: SealedLeafProps) {
  const t = useT()

  return (
    <div className={cn('text-center', className)}>
      <motion.button
        type="button"
        onClick={() => onOpen()}
        aria-expanded={false}
        aria-controls="daily-couplet"
        whileTap={reducedMotion ? undefined : { scale: 0.985 }}
        className={cn(
          'relative block w-full cursor-pointer overflow-hidden border border-line bg-surface',
          'rounded-[var(--radius-lg)] p-6 text-center sm:p-8',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        )}
      >
        {/* Rolled-leaf shading and the fibre of the palm leaf. Both sit under
            the text and use only verified surface tokens, so contrast holds. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.04) 45%, rgba(0,0,0,0.10) 100%)',
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 7px)',
          }}
        />

        <span className="relative flex flex-col items-center gap-[var(--space-4)]">
          <WaxSeal number={kuralNumber} />

          <span className="flex flex-col gap-[var(--space-2)]">
            <span lang="ta" className="block text-xs tracking-wide text-muted uppercase">
              {t('ritual.sealed.eyebrow', "Today's couplet")}
            </span>
            <span className="block text-xl text-ink">
              {t('ritual.sealed.title', 'The leaf is still sealed')}
            </span>
            <span className="block text-sm text-muted">
              {t('ritual.sealed.hint', 'Tap to unroll it')}
            </span>
          </span>

          <span className="sr-only">
            {t(
              'ritual.sealed.sr',
              'Today’s couplet is sealed behind a palm leaf. Activate to unroll it and read.',
            )}
          </span>
        </span>
      </motion.button>

      <p className="mt-[var(--space-3)] mb-0">
        <button
          type="button"
          onClick={() => onOpen({ instant: true })}
          className="inline-flex min-h-[44px] items-center text-sm text-muted underline decoration-dotted underline-offset-4 hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t('ritual.sealed.skip', 'Open without the ceremony')}
        </button>
      </p>
    </div>
  )
}
