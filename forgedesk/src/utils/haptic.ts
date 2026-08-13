// Vibration API werkt op Android en iOS PWA (geïnstalleerd vanaf iOS 16+).
// Stille fallback wanneer niet ondersteund — geen errors in console.
function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try { navigator.vibrate(pattern) } catch { /* swallow */ }
}

export const hapticLight = () => vibrate(8)
export const hapticMedium = () => vibrate(14)
