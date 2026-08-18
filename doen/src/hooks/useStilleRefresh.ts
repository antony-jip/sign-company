import { useEffect, useRef } from 'react'

// Stille verversing van gedeelde lijstdata: bij terugkeer naar de tab en op
// een interval zolang de tab zichtbaar is. Met 25 gebruikers in één
// organisatie is data van een kwartier oud structureel verkeerd; dit haalt de
// brandstof onder de meeste last-write-wins-verrassingen vandaan zonder
// realtime-infrastructuur.
//
// `magVerversen` leest live component-state (open dialogen, actieve drag)
// zodat een verversing nooit middenin een bewerking valt. De callbacks worden
// per render ververst via een ref, dus de guard kijkt altijd naar de actuele
// state zonder dat het effect opnieuw hoeft te mounten.
export function useStilleRefresh(opties: {
  verversen: () => void | Promise<void>
  magVerversen?: () => boolean
  intervalMs?: number
}) {
  const { intervalMs = 60_000 } = opties
  const refs = useRef(opties)
  refs.current = opties

  useEffect(() => {
    let bezig = false
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      if (bezig) return
      if (refs.current.magVerversen && !refs.current.magVerversen()) return
      bezig = true
      try {
        await refs.current.verversen()
      } finally {
        bezig = false
      }
    }
    const opVisibility = () => { if (document.visibilityState === 'visible') void tick() }
    const opFocus = () => { void tick() }
    document.addEventListener('visibilitychange', opVisibility)
    window.addEventListener('focus', opFocus)
    const timer = setInterval(() => { void tick() }, intervalMs)
    return () => {
      document.removeEventListener('visibilitychange', opVisibility)
      window.removeEventListener('focus', opFocus)
      clearInterval(timer)
    }
  }, [intervalMs])
}
