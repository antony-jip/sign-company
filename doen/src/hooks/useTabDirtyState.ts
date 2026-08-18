import { useEffect, useRef } from 'react'
import { useTabs } from '@/contexts/TabsContext'

/**
 * Marks the current tab as dirty/clean based on unsaved changes.
 * Call setDirty(true) when form data changes, setDirty(false) after saving.
 *
 * Optioneel: geef een `saver` mee (een stille opslag-functie die de huidige
 * invoer bewaart zonder te navigeren). Die wordt automatisch aangeroepen
 * vlak vóórdat de gebruiker van dit tabblad wegwisselt of het sluit, zodat
 * er niets stil verloren gaat. De saver mag pending debounced saves flushen.
 */
export function useTabDirtyState(saver?: () => Promise<void> | void) {
  const { activeTabId, setTabDirty, registerTabSaver } = useTabs()
  const dirtyRef = useRef(false)

  // Alleen het actieve tabblad is gemount, dus dat is per definitie het
  // tabblad van dit scherm. Zoeken op pad ging mis zodra twee tabbladen
  // hetzelfde pad hadden (twee nieuwe facturen) of het pad een querystring
  // kreeg — dan hoorde de dirty-vlag bij het verkeerde of bij geen tabblad.
  const tabId = activeTabId

  const setDirty = (dirty: boolean) => {
    dirtyRef.current = dirty
    if (tabId) {
      setTabDirty(tabId, dirty)
    }
  }

  // Hou de laatste saver in een ref, zodat we een stabiele wrapper kunnen
  // registreren die altijd de meest recente closure (met verse state) aanroept.
  const saverRef = useRef(saver)
  saverRef.current = saver

  useEffect(() => {
    if (!tabId || !saverRef.current) return
    registerTabSaver(tabId, () => saverRef.current?.())
    return () => registerTabSaver(tabId, null)
  }, [tabId, registerTabSaver])

  // Clean up on unmount – if dirty, leave it dirty (will prompt on close)
  useEffect(() => {
    return () => {
      // intentionally no cleanup – dirty state persists
    }
  }, [])

  return { setDirty, isDirty: dirtyRef.current, tabId }
}
