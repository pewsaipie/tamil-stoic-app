/**
 * Listen — device TTS for a couplet. The label follows the shared speech store,
 * so a card that is playing says "Stop" and no other card can claim to be.
 */
import { Volume2, Square } from 'lucide-react'
import { Button, type ButtonProps } from '../ui/Button'
import { selectIsSpeaking, useSpeechStore } from '../../store/speechStore'
import type { Kural } from '../../lib/types'

export interface ListenButtonProps {
  kural: Kural
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  /** Icon-only (focus reader) vs labelled (cards). */
  compact?: boolean
  className?: string
}

export function ListenButton({ kural, variant = 'secondary', size = 'sm', compact = false, className }: ListenButtonProps) {
  const speaking = useSpeechStore(selectIsSpeaking(kural.n))
  const toggle = useSpeechStore((state) => state.toggle)
  const label = speaking ? 'Stop' : 'Listen'

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => toggle(kural)}
      aria-label={`${label}${compact ? ` kural ${kural.n}` : ''}`}
      aria-pressed={speaking}
      icon={
        speaking ? (
          <Square size={17} strokeWidth={1.6} />
        ) : (
          <Volume2 size={17} strokeWidth={1.6} />
        )
      }
    >
      {compact ? <span className="sr-only">{label}</span> : label}
    </Button>
  )
}
