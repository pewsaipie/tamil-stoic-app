/**
 * GlassCard — the app's primary surface: backdrop blur, a hairline border, an
 * inner top-edge highlight and an optional 4% paper-grain overlay.
 */
import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  /** Softer elevation for secondary surfaces (list rows, tiles). */
  quiet?: boolean
  /** Paper grain overlay — on by default for hero-scale surfaces. */
  grain?: boolean
  as?: ElementType
  children?: ReactNode
}

export function GlassCard({
  quiet = false,
  grain = false,
  as: Tag = 'div',
  className,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <Tag
      className={cn('glass-panel', grain && 'grain', quiet && 'glass-panel--quiet', className)}
      {...rest}
    >
      <div className="relative z-[1]">{children}</div>
    </Tag>
  )
}
