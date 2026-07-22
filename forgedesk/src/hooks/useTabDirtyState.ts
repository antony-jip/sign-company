import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
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
  const { tabs, setTabDirty, registerTabSaver } = useTabs()
  const location = useLocation()
  const dirtyRef = useRef(false)

  // Find the tab that matches the current path
  const currentTab = tabs.find(t => t.path === location.pathname)
  const tabId = currentTab?.id ?? null

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
