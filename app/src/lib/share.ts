/**
 * Sharing — native share sheet when available, copy-to-clipboard otherwise.
 *
 * The shared text always uses the standard two-line couplet (never a re-cut),
 * followed by the simple meaning and a deep link that opens the reader on that
 * kural. Nothing else is attached: no tracking parameters, no identifiers.
 */
import type { Kural } from './types'

export function kuralUrl(n: number): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/kural/${n}`
}

export function kuralShareText(kural: Kural): string {
  return `${kural.ta[0]}\n${kural.ta[1]}\n\n${kural.s}\n\n${kuralUrl(kural.n)}`
}

export type ShareOutcome = 'shared' | 'copied' | 'failed'

export async function shareKural(kural: Kural): Promise<ShareOutcome> {
  const url = kuralUrl(kural.n)
  const text = `${kural.ta[0]}\n${kural.ta[1]}\n\n${kural.s}`

  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: `குறள் ${kural.n}`, text, url })
      return 'shared'
    }
  } catch {
    // The reader dismissed the sheet, or the platform refused it — fall through
    // to the clipboard so the action never dead-ends.
  }

  try {
    await navigator.clipboard.writeText(`${text}\n\n${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
