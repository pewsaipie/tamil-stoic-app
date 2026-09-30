/**
 * Button — the app's three visual tiers.
 *
 *   primary   filled accent, glow on hover
 *   secondary glass, accent border
 *   ghost     transparent, accent on hover
 *
 * Every size clears the 44px touch target, and the press animation is gated on
 * the reader's reduced-motion preference.
 */
import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../lib/cn'
import { useReducedMotion } from '../../hooks/useReader'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Leading icon (Lucide component or any node). */
  icon?: ReactNode
  children?: ReactNode
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent border border-transparent shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-glow)]',
  secondary: 'bg-glass text-accent-text border border-accent/60 hover:bg-accent/10',
  ghost: 'bg-transparent text-muted border border-transparent hover:text-accent-text',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-4 text-sm gap-2',
  md: 'min-h-[44px] px-5 text-[15px] gap-2',
  lg: 'min-h-[52px] px-6 text-base gap-3',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, children, className, disabled, ...rest },
  ref,
) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      whileTap={reducedMotion || disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-pill)] font-medium',
        'transition-[color,background-color,border-color,box-shadow] duration-[var(--dur)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </motion.button>
  )
})
