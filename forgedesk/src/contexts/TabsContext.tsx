import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppTab {
  id: string
  path: string
  label: string
  icon?: string
  isDirty?: boolean
  /** Extra metadata – e.g. entity id, entity type */
  meta?: Record<string, unknown>
}

interface TabsContextType {
  tabs: AppTab[]
  activeTabId: string | null

  openTab: (tab: Omit<AppTab, 'id'> & { id?: string }) => void
  closeTab: (id: string) => void
  closeOtherTabs: (id: string) => void
  closeAllTabs: () => void
  setActiveTab: (id: string) => void
  setTabDirty: (id: string, dirty: boolean) => void
  updateTabLabel: (id: string, label: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

// ─── Storage helpers ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'forgedesk_tabs'

function loadTabs(): AppTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTabs(tabs: AppTab[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<AppTab[]>(loadTabs)
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const stored = loadTabs()
    return stored.length > 0 ? stored[stored.length - 1].id : null
  })

  const navigate = useNavigate()
  const location = useLocation()

  // Persist whenever tabs change
  const updateTabs = useCallback((updater: (prev: AppTab[]) => AppTab[]) => {
    setTabs(prev => {
      const next = updater(prev)
      saveTabs(next)
      return next
    })
  }, [])

  const openTab = useCallback(
    (tab: Omit<AppTab, 'id'> & { id?: string }) => {
      const id = tab.id ?? tab.path
      setTabs(prev => {
        const existing = prev.find(t => t.id === id)
        if (existing) {
          // Tab already open – just activate
          setActiveTabId(id)
          if (existing.path !== location.pathname) {
            navigate(existing.path)
          }
          saveTabs(prev)
          return prev
        }
        const newTab: AppTab = { ...tab, id, isDirty: false }
        const next = [...prev, newTab]
        saveTabs(next)
        setActiveTabId(id)
        navigate(newTab.path)
        return next
      })
    },
    [navigate, location.pathname]
  )

  const closeTab = useCallback(
    (id: string) => {
      setTabs(prev => {
        const idx = prev.findIndex(t => t.id === id)
        if (idx === -1) return prev

        const tab = prev[idx]
        if (tab.isDirty) {
          const confirmed = window.confirm(
            'Er zijn onopgeslagen wijzigingen. Weet je zeker dat je dit tabblad wilt sluiten?'
          )
          if (!confirmed) return prev
        }

        const next = prev.filter(t => t.id !== id)
        saveTabs(next)

        // If we closed the active tab, activate an adjacent one
        if (activeTabId === id) {
          if (next.length > 0) {
            const newIdx = Math.min(idx, next.length - 1)
            const newActive = next[newIdx]
            setActiveTabId(newActive.id)
            navigate(newActive.path)
          } else {
            setActiveTabId(null)
            navigate('/')
          }
        }

        return next
      })
    },
    [activeTabId, navigate]
  )

  const closeOtherTabs = useCallback(
    (id: string) => {
      setTabs(prev => {
        const hasDirty = prev.some(t => t.id !== id && t.isDirty)
        if (hasDirty) {
          const confirmed = window.confirm(
            'Sommige tabbladen hebben onopgeslagen wijzigingen. Toch sluiten?'
          )
          if (!confirmed) return prev
        }
        const next = prev.filter(t => t.id === id)
        saveTabs(next)
        setActiveTabId(id)
        return next
      })
    },
    []
  )

  const closeAllTabs = useCallback(() => {
    setTabs(prev => {
      const hasDirty = prev.some(t => t.isDirty)
      if (hasDirty) {
        const confirmed = window.confirm(
          'Er zijn onopgeslagen wijzigingen. Weet je zeker dat je alle tabbladen wilt sluiten?'
        )
        if (!confirmed) return prev
      }
      saveTabs([])
      setActiveTabId(null)
      navigate('/')
      return []
    })
  }, [navigate])

  const setActiveTabFn = useCallback(
    (id: string) => {
      setActiveTabId(id)
      setTabs(prev => {
        const tab = prev.find(t => t.id === id)
        if (tab && tab.path !== location.pathname) {
          navigate(tab.path)
        }
        return prev
      })
    },
    [navigate, location.pathname]
  )

  const setTabDirty = useCallback((id: string, dirty: boolean) => {
    updateTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, isDirty: dirty } : t))
    )
  }, [updateTabs])

  const updateTabLabel = useCallback((id: string, label: string) => {
    updateTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, label } : t))
    )
  }, [updateTabs])

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    updateTabs(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [updateTabs])

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        closeTab,
        closeOtherTabs,
        closeAllTabs,
        setActiveTab: setActiveTabFn,
        setTabDirty,
        updateTabLabel,
        reorderTabs,
      }}
    >
      {children}
    </TabsContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTabs() {
  const context = useContext(TabsContext)
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabsProvider')
  }
  return context
}
