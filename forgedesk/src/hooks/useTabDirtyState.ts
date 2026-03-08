import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTabs } from '@/contexts/TabsContext'

/**
 * Marks the current tab as dirty/clean based on unsaved changes.
 * Call setDirty(true) when form data changes, setDirty(false) after saving.
 */
export function useTabDirtyState() {
  const { tabs, setTabDirty } = useTabs()
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

  // Clean up on unmount – if dirty, leave it dirty (will prompt on close)
  useEffect(() => {
    return () => {
      // intentionally no cleanup – dirty state persists
    }
  }, [])

  return { setDirty, isDirty: dirtyRef.current, tabId }
}
