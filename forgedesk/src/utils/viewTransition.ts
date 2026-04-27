import { flushSync } from 'react-dom'

type Direction = 'forward' | 'back'

interface DocumentWithVT extends Document {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> }
}

// Mobile-only iOS-style push/pop transition. Falls back to instant updates
// on desktop, when the API is missing (Firefox), or when prefers-reduced-motion
// is set. Direction is communicated via data-vt-direction on <html>, which
// the CSS keyframes in index.css read.
export function viewTransition(updater: () => void, direction: Direction = 'forward'): void {
  if (typeof document === 'undefined') {
    updater()
    return
  }

  const doc = document as DocumentWithVT
  const supported = typeof doc.startViewTransition === 'function'
  const isMobile = window.matchMedia('(max-width: 767px)').matches
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!supported || !isMobile || reduceMotion) {
    updater()
    return
  }

  document.documentElement.dataset.vtDirection = direction
  const transition = doc.startViewTransition!(() => {
    flushSync(() => updater())
  })
  transition.finished.finally(() => {
    delete document.documentElement.dataset.vtDirection
  })
}
