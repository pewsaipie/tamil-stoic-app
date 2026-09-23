export function pad(n) {
  if (n < 10) return `00${n}`
  if (n < 100) return `0${n}`
  return String(n)
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function highlight(text, q) {
  const safe = escapeHtml(text)
  if (!q) return safe
  try {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return safe.replace(re, '<mark>$1</mark>')
  } catch {
    return safe
  }
}

export function formatDate(d) {
  try {
    return d.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return d.toDateString()
  }
}

// Stable hash for reflection picking.
export function hashIndex(seed, mod) {
  let h = 2166136261
  const s = String(seed)
  for (let i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0
  return h % Math.max(1, mod)
}

// Class name helper
export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

// Vibration fallback (no-op if unsupported)
export function vibrate(ms = 8) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(ms) } catch { /* ignore */ }
  }
}
