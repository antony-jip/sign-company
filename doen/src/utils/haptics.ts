/**
 * Lichte haptische feedback waar het toestel het ondersteunt (Android/Chrome).
 * iOS Safari negeert navigator.vibrate; dan is het een stille no-op.
 */
export function tik(patroon: number | number[] = 10): void {
  if (typeof navigator === 'undefined') return
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }
  if (typeof nav.vibrate !== 'function') return
  try {
    nav.vibrate(patroon)
  } catch {
    /* genegeerd */
  }
}
