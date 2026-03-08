import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppTab {
  id: string
  path: string
  label: string
  icon?: string
  isDirty?: boolean
  meta?: Record<string, unknown>
}

interface TabsContextType {
  tabs: AppTab[]
  activeTabId: string | null

  openTab: (tab: Omit<AppTab, 'id'> & { id?: string }) => void
  newTab: () => void
  closeTab: (id: string) => void
  closeOtherTabs: (id: string) => void
  closeAllTabs: () => void
  setActiveTab: (id: string) => void
  setTabDirty: (id: string, dirty: boolean) => void
  updateTabLabel: (id: string, label: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

// ─── Path → Label mapping ───────────────────────────────────────────────────

const PATH_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/projecten': 'Projecten',
  '/klanten': 'Klanten',
  '/offertes': 'Offertes',
  '/facturen': 'Facturen',
  '/werkbonnen': 'Werkbonnen',
  '/leveringsbonnen': 'Leveringsbonnen',
  '/taken': 'Taken',
  '/planning': 'Planning',
  '/email': 'Email',
  '/instellingen': 'Instellingen',
  '/offertes/nieuw': 'Nieuwe offerte',
  '/facturen/nieuw': 'Nieuwe factuur',
  '/projecten/nieuw': 'Nieuw project',
  '/werkbonnen/nieuw': 'Nieuwe werkbon',
}

function labelForPath(path: string): string {
  // Exact match first
  if (PATH_LABELS[path]) return PATH_LABELS[path]

  // Pattern matches for detail pages
  if (path.match(/^\/offertes\/[^/]+\/bewerken/)) return 'Offerte'
  if (path.match(/^\/offertes\//)) return 'Offerte'
  if (path.match(/^\/facturen\//)) return 'Factuur'
  if (path.match(/^\/projecten\//)) return 'Project'
  if (path.match(/^\/werkbonnen\//)) return 'Werkbon'
  if (path.match(/^\/klanten\//)) return 'Klant'
  if (path.match(/^\/leveringsbonnen\//)) return 'Leveringsbon'

  // Fallback: capitalize first segment
  const segment = path.split('/').filter(Boolean)[0]
  return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Tab'
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'forgedesk_tabs'
const ACTIVE_KEY = 'forgedesk_active_tab'

function loadTabs(): AppTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadActiveTabId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

function saveTabs(tabs: AppTab[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
}

function saveActiveTabId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id)
  } else {
    localStorage.removeItem(ACTIVE_KEY)
  }
}

let tabCounter = Date.now()
function nextTabId(): string {
  return `tab-${++tabCounter}`
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<AppTab[]>(() => {
    const stored = loadTabs()
    if (stored.length > 0) return stored
    // Always start with at least one tab
    const initial: AppTab = { id: nextTabId(), path: '/', label: 'Dashboard', isDirty: false }
    saveTabs([initial])
    return [initial]
  })

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const stored = loadActiveTabId()
    const tabsList = loadTabs()
    if (stored && tabsList.some((t: AppTab) => t.id === stored)) return stored
    return tabsList.length > 0 ? tabsList[0].id : null
  })

  const navigate = useNavigate()
  const location = useLocation()

  // Ref to prevent infinite loops between location change and navigate
  const isNavigatingRef = useRef(false)
  const isSwitchingTabRef = useRef(false)

  // ── Track location changes → update active tab's path ──────────────
  useEffect(() => {
    if (isSwitchingTabRef.current) {
      isSwitchingTabRef.current = false
      return
    }
    if (!activeTabId) return

    const currentPath = location.pathname
    setTabs(prev => {
      const tab = prev.find((t: AppTab) => t.id === activeTabId)
      if (!tab || tab.path === currentPath) return prev

      const next = prev.map((t: AppTab) =>
        t.id === activeTabId
          ? { ...t, path: currentPath, label: labelForPath(currentPath) }
          : t
      )
      saveTabs(next)
      return next
    })
  }, [location.pathname, activeTabId])

  // ── Persist active tab id ──────────────────────────────────────────
  useEffect(() => {
    saveActiveTabId(activeTabId)
  }, [activeTabId])

  // ── Open a specific tab (for detail pages opened from lists) ───────
  const openTab = useCallback(
    (tab: Omit<AppTab, 'id'> & { id?: string }) => {
      const id = tab.id ?? tab.path
      setTabs(prev => {
        const existing = prev.find((t: AppTab) => t.id === id)
        if (existing) {
          setActiveTabId(id)
          isSwitchingTabRef.current = true
          navigate(existing.path)
          return prev
        }
        const newTab: AppTab = { ...tab, id, isDirty: false }
        const next = [...prev, newTab]
        saveTabs(next)
        setActiveTabId(id)
        isSwitchingTabRef.current = true
        navigate(newTab.path)
        return next
      })
    },
    [navigate]
  )

  // ── New blank tab (like Cmd+T in a browser) ────────────────────────
  const newTab = useCallback(() => {
    const id = nextTabId()
    const tab: AppTab = { id, path: '/', label: 'Dashboard', isDirty: false }
    setTabs(prev => {
      const next = [...prev, tab]
      saveTabs(next)
      return next
    })
    setActiveTabId(id)
    isSwitchingTabRef.current = true
    navigate('/')
  }, [navigate])

  // ── Close tab ──────────────────────────────────────────────────────
  const closeTab = useCallback(
    (id: string) => {
      setTabs(prev => {
        const idx = prev.findIndex((t: AppTab) => t.id === id)
        if (idx === -1) return prev

        const tab = prev[idx]
        if (tab.isDirty) {
          const confirmed = window.confirm(
            'Er zijn onopgeslagen wijzigingen. Weet je zeker dat je dit tabblad wilt sluiten?'
          )
          if (!confirmed) return prev
        }

        const next = prev.filter((t: AppTab) => t.id !== id)

        // Never go to zero tabs — create a fresh one
        if (next.length === 0) {
          const fresh: AppTab = { id: nextTabId(), path: '/', label: 'Dashboard', isDirty: false }
          const result = [fresh]
          saveTabs(result)
          setActiveTabId(fresh.id)
          isSwitchingTabRef.current = true
          navigate('/')
          return result
        }

        saveTabs(next)

        // If we closed the active tab, activate an adjacent one
        if (activeTabId === id) {
          const newIdx = Math.min(idx, next.length - 1)
          const newActive = next[newIdx]
          setActiveTabId(newActive.id)
          isSwitchingTabRef.current = true
          navigate(newActive.path)
        }

        return next
      })
    },
    [activeTabId, navigate]
  )

  const closeOtherTabs = useCallback(
    (id: string) => {
      setTabs(prev => {
        const hasDirty = prev.some((t: AppTab) => t.id !== id && t.isDirty)
        if (hasDirty) {
          const confirmed = window.confirm(
            'Sommige tabbladen hebben onopgeslagen wijzigingen. Toch sluiten?'
          )
          if (!confirmed) return prev
        }
        const next = prev.filter((t: AppTab) => t.id === id)
        saveTabs(next)
        setActiveTabId(id)
        return next
      })
    },
    []
  )

  const closeAllTabs = useCallback(() => {
    setTabs(prev => {
      const hasDirty = prev.some((t: AppTab) => t.isDirty)
      if (hasDirty) {
        const confirmed = window.confirm(
          'Er zijn onopgeslagen wijzigingen. Weet je zeker dat je alle tabbladen wilt sluiten?'
        )
        if (!confirmed) return prev
      }
      const fresh: AppTab = { id: nextTabId(), path: '/', label: 'Dashboard', isDirty: false }
      saveTabs([fresh])
      setActiveTabId(fresh.id)
      isSwitchingTabRef.current = true
      navigate('/')
      return [fresh]
    })
  }, [navigate])

  // ── Switch to existing tab ─────────────────────────────────────────
  const setActiveTabFn = useCallback(
    (id: string) => {
      setActiveTabId(id)
      setTabs(prev => {
        const tab = prev.find((t: AppTab) => t.id === id)
        if (tab) {
          isSwitchingTabRef.current = true
          navigate(tab.path)
        }
        return prev
      })
    },
    [navigate]
  )

  const setTabDirty = useCallback((id: string, dirty: boolean) => {
    setTabs(prev => {
      const next = prev.map((t: AppTab) => (t.id === id ? { ...t, isDirty: dirty } : t))
      saveTabs(next)
      return next
    })
  }, [])

  const updateTabLabel = useCallback((id: string, label: string) => {
    setTabs(prev => {
      const next = prev.map((t: AppTab) => (t.id === id ? { ...t, label } : t))
      saveTabs(next)
      return next
    })
  }, [])

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      saveTabs(next)
      return next
    })
  }, [])

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        newTab,
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
