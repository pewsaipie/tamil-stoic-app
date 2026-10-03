/**
 * BottomNav — the reader's two primary destinations (Today, Chapters).
 * Fixed to the bottom on phones, hidden in print. Touch targets clear 44 px.
 */
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Home } from 'lucide-react'
import { cn } from '../../lib/cn'

const ITEMS = [
  { to: '/', label: 'இன்று', en: "Today", icon: Home, match: (path: string) => path === '/' },
  {
    to: '/chapters',
    label: 'அத்தியாயங்கள்',
    en: 'Chapters',
    icon: BookOpen,
    match: (path: string) => path.startsWith('/chapters') || path.startsWith('/kural'),
  },
] as const

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'no-print sticky bottom-0 z-[var(--z-nav)] mt-[var(--space-6)] w-full',
        'border-t border-line bg-glass backdrop-blur-xl',
      )}
    >
      <ul className="mx-auto flex max-w-[var(--content-max)] list-none items-stretch justify-around p-0">
        {ITEMS.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs no-underline',
                  active ? 'text-accent-text' : 'text-muted hover:text-ink',
                )}
              >
                <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
                <span lang="ta">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
