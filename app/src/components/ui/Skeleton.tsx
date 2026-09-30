/**
 * Skeletons — the app never shows a spinner. Shapes mirror the loaded layout so
 * there is no reflow when the corpus arrives.
 */
import { cn } from '../../lib/cn'

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />
}

export function SkeletonKuralCard() {
  return (
    <div
      className="glass-panel glass-panel--quiet space-y-4 p-6"
      role="status"
      aria-label="Loading today's Kural"
    >
      <SkeletonLine className="h-3 w-1/3" />
      <div className="space-y-2">
        <SkeletonLine className="h-5 w-11/12" />
        <SkeletonLine className="h-5 w-9/12" />
      </div>
      <SkeletonLine className="h-3 w-7/12" />
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-5/6" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="skeleton h-11 w-24 rounded-[var(--radius-pill)]" />
        <div className="skeleton h-11 w-24 rounded-[var(--radius-pill)]" />
        <div className="skeleton h-11 w-24 rounded-[var(--radius-pill)]" />
      </div>
    </div>
  )
}
