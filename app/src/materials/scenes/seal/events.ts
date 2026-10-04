/**
 * The one word the DOM and the scene share.
 *
 * Kept in its own module — with no imports — so the button that starts the
 * ceremony does not have to pull in three.js to say "begin". The scene is
 * lazy-loaded (it is ~135 KB of library), and a static import of anything that
 * reaches the renderer would defeat that on the very first paint.
 */

/** Fired on `window` by the DOM control to start the ceremony. */
export const SEAL_BEGIN_EVENT = 'tamil-stoic:seal-begin'

/** Ask the scene to begin. Safe to call when no scene is mounted. */
export function beginSeal(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SEAL_BEGIN_EVENT))
}
