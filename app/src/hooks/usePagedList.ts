/**
 * usePagedList — render long lists a page at a time as the sentinel scrolls into
 * view. The shipped reader reveals 24 kurals per step; the same cadence keeps the
 * browse list smooth on a mid-range phone.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export const PAGE_SIZE = 24

export interface PagedList<T> {
  visible: T[]
  hasMore: boolean
  /** Attach to the sentinel element at the end of the list. */
  sentinelRef: (node: HTMLElement | null) => void
  reset: () => void
}

export function usePagedList<T>(items: readonly T[], pageSize = PAGE_SIZE): PagedList<T> {
  const [count, setCount] = useState(pageSize)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // A new result set starts from the first page again.
  const signature = useMemo(() => `${items.length}:${items[0] === undefined ? '' : JSON.stringify(items[0])}`, [items])
  useEffect(() => {
    setCount(pageSize)
  }, [signature, pageSize])

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [])

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect()
      if (!node || typeof IntersectionObserver === 'undefined') return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setCount((current) => current + pageSize)
          }
        },
        { rootMargin: '400px 0px' },
      )
      observer.observe(node)
      observerRef.current = observer
    },
    [pageSize],
  )

  return {
    visible: items.slice(0, count),
    hasMore: items.length > count,
    sentinelRef,
    reset: () => setCount(pageSize),
  }
}
