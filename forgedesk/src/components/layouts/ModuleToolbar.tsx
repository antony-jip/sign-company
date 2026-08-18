import { useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Elke module tekende zijn eigen tweede balk, met zijn eigen titel erin. Boven
// Taken stond dus twee keer "Taken." en ging er 44px aan een regel op die de
// header al zei. Een module hangt zijn gereedschap nu in de header zelf.
//
// De header rendert altijd vóór de module — hij is een broer hoger in de boom —
// dus tegen de tijd dat dit layout-effect draait bestaat het doel. useLayout-
// Effect en niet useEffect, zodat de knoppen er staan vóór de eerste paint.
// ─────────────────────────────────────────────────────────────────────────────

export const MODULE_TOOLBAR_ID = 'doen-module-toolbar'

export function ModuleToolbar({ children }: { children: ReactNode }) {
  const [doel, setDoel] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    setDoel(document.getElementById(MODULE_TOOLBAR_ID))
  }, [])

  if (!doel) return null
  return createPortal(children, doel)
}
