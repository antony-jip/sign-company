import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { confirm } from '@/components/shared/ConfirmDialog'
import { wisTabSnapshots } from '@/hooks/useTabSnapshot'

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
  // Editors registreren een stille save-functie voor hun tab; die wordt
  // automatisch geflusht vóórdat je van tab wisselt (of 'm sluit).
  registerTabSaver: (id: string, saver: (() => Promise<void> | void) | null) => void
  updateTabLabel: (id: string, label: string) => void
  setActiveTabLabel: (label: string) => void
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

// Een tabpad bewaart óók de querystring: sub-tabs, filters en zoektermen
// leven daarin. Zonder search kom je op /facturen terug in plaats van op
// /facturen?tab=inkoop. Voor het label telt alleen het pad zelf.
export function pathnameVan(path: string): string {
  const q = path.indexOf('?')
  return q === -1 ? path : path.slice(0, q)
}

function labelForPath(fullPath: string): string {
  const path = pathnameVan(fullPath)
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

const STORAGE_KEY = 'doen_tabs'
const ACTIVE_KEY = 'doen_active_tab'

function loadTabs(): AppTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
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

  // `useNavigate` returns a new reference whenever `location.pathname` changes
  // in react-router-dom 6.30 (non-data routers). Pinning it in a ref keeps the
  // tab callbacks below referentially stable, otherwise every navigation
  // recreates them — and consumers that rebuild on those refs spiral into an
  // infinite update loop on /facturen.
  const navigateRef = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])

  // Keep a ref so async callbacks can read current tabs without stale closures
  const tabsRef = useRef(tabs)
  useEffect(() => { tabsRef.current = tabs }, [tabs])

  const activeTabIdRef = useRef(activeTabId)
  useEffect(() => { activeTabIdRef.current = activeTabId }, [activeTabId])

  // Ref to prevent infinite loops between location change and navigate
  const isNavigatingRef = useRef(false)
  const isSwitchingTabRef = useRef(false)

  // Waar de browser nú staat, inclusief querystring. Wissel je naar een
  // tabblad dat toevallig op hetzelfde pad staat, dan volgt er geen
  // location-wijziging; zonder deze vergelijking bleef de skip-vlag hangen
  // en sloeg het tabblad daarna zijn eerstvolgende navigatie niet meer op.
  const huidigPadRef = useRef(location.pathname + location.search)
  huidigPadRef.current = location.pathname + location.search

  // ── Stille save-functies per tab (alleen de actieve tab is gemount) ──
  const saversRef = useRef<Map<string, () => Promise<void> | void>>(new Map())
  const registerTabSaver = useCallback(
    (id: string, saver: (() => Promise<void> | void) | null) => {
      if (!id) return
      if (saver) saversRef.current.set(id, saver)
      else saversRef.current.delete(id)
    },
    [],
  )

  // Sla de huidige actieve tab stil op als 'ie onopgeslagen wijzigingen heeft,
  // vóórdat we ervan wegwisselen. Bij een fout blijft de tab dirty staan.
  const flushActiveTabSaver = useCallback(async () => {
    const id = activeTabIdRef.current
    if (!id) return
    const tab = tabsRef.current.find((t: AppTab) => t.id === id)
    if (!tab?.isDirty) return
    const saver = saversRef.current.get(id)
    if (!saver) return
    try {
      await saver()
    } catch {
      /* save mislukt · dirty blijft staan zodat niets stil verdwijnt */
    }
  }, [])

  // ── Track location changes → update active tab's path ──────────────
  useEffect(() => {
    if (isSwitchingTabRef.current) {
      isSwitchingTabRef.current = false
      return
    }
    if (!activeTabId) return

    const currentPath = location.pathname + location.search
    setTabs(prev => {
      const tab = prev.find((t: AppTab) => t.id === activeTabId)
      if (!tab || tab.path === currentPath) return prev

      // Blijf je binnen dezelfde pagina en verandert alleen de querystring
      // (sub-tab, filter), dan houdt het tabblad zijn eigen label: een
      // detailpagina heet dan nog steeds naar zijn record en niet "Project".
      const zelfdePagina = pathnameVan(tab.path) === pathnameVan(currentPath)
      const next = prev.map((t: AppTab) =>
        t.id === activeTabId
          ? { ...t, path: currentPath, label: zelfdePagina ? t.label : labelForPath(currentPath) }
          : t
      )
      saveTabs(next)
      return next
    })
  }, [location.pathname, location.search, activeTabId])

  // ── Persist active tab id ──────────────────────────────────────────
  useEffect(() => {
    saveActiveTabId(activeTabId)
  }, [activeTabId])

  // ── Open a specific tab (for detail pages opened from lists) ───────
  const openTab = useCallback(
    async (tab: Omit<AppTab, 'id'> & { id?: string }) => {
      const id = tab.id ?? tab.path
      if (id !== activeTabIdRef.current) await flushActiveTabSaver()
      const prev = tabsRef.current
      const existing = prev.find((t: AppTab) => t.id === id)

      if (existing) {
        // Het opgeslagen pad is een herinnering aan waar dit tabblad stond, en
        // die is waardevol zolang het om dezelfde pagina gaat: de querystring
        // draagt sub-tab, filter en zoekterm.
        //
        // Maar dat pad drift. Zolang een tabblad actief is schrijft de
        // location-sync hierboven élke navigatie erin — ook een sprong naar een
        // andere module via de nav, die niet via openTab loopt. Het tabblad van
        // project X kon zo pad '/projecten' krijgen. Tikte je daarna project X
        // aan vanuit de lijst, dan stond je al op dat pad en gebeurde er
        // helemaal niets: het project ging niet open, zonder enige melding.
        // Precies de projecten die je eerder had geopend waren stuk.
        //
        // Wijst het opgeslagen pad naar een andere pagina dan gevraagd, dan is
        // de vraag leidend en de herinnering verouderd.
        const doelPad = pathnameVan(existing.path) === pathnameVan(tab.path)
          ? existing.path
          : tab.path

        if (doelPad !== existing.path) {
          const hersteld = prev.map((t: AppTab) => (t.id === id ? { ...t, path: doelPad } : t))
          saveTabs(hersteld)
          setTabs(hersteld)
        }

        setActiveTabId(id)
        if (doelPad !== huidigPadRef.current) {
          isSwitchingTabRef.current = true
          // Wisselen van tabblad is geen navigatie: met een push zou elke
          // tabklik in de browsergeschiedenis komen en zou "terug" je naar de
          // pagina van een ánder tabblad sturen.
          navigateRef.current(doelPad, { replace: true })
        }
        return
      }

      const newTab: AppTab = { ...tab, id, isDirty: false }
      const next = [...prev, newTab]
      saveTabs(next)
      setTabs(next)
      isSwitchingTabRef.current = true
      setActiveTabId(id)
      navigateRef.current(newTab.path)
    },
    [flushActiveTabSaver]
  )

  // ── New blank tab (like Cmd+T in a browser) ────────────────────────
  const newTab = useCallback(async () => {
    await flushActiveTabSaver()
    const id = nextTabId()
    const tab: AppTab = { id, path: '/', label: 'Dashboard', isDirty: false }
    const next = [...tabsRef.current, tab]
    saveTabs(next)
    setTabs(next)
    isSwitchingTabRef.current = true
    setActiveTabId(id)
    navigateRef.current('/')
  }, [flushActiveTabSaver])

  // ── Close tab ──────────────────────────────────────────────────────
  const closeTab = useCallback(
    async (id: string) => {
      // Sluit je de actieve tab, sla 'm dan eerst stil op (auto-save).
      if (id === activeTabIdRef.current) await flushActiveTabSaver()

      const prev = tabsRef.current
      const idx = prev.findIndex((t: AppTab) => t.id === id)
      if (idx === -1) return

      const tab = prev[idx]
      if (tab.isDirty) {
        const confirmed = await confirm({
          title: 'Onopgeslagen wijzigingen',
          message: 'Er zijn onopgeslagen wijzigingen. Weet je zeker dat je dit tabblad wilt sluiten?',
          confirmLabel: 'Sluiten',
          variant: 'destructive',
        })
        if (!confirmed) return
      }

      const next = tabsRef.current.filter((t: AppTab) => t.id !== id)
      wisTabSnapshots(id)

      // Never go to zero tabs — create a fresh one
      if (next.length === 0) {
        const fresh: AppTab = { id: nextTabId(), path: '/', label: 'Dashboard', isDirty: false }
        const result = [fresh]
        saveTabs(result)
        setTabs(result)
        isSwitchingTabRef.current = true
        setActiveTabId(fresh.id)
        navigateRef.current('/')
        return
      }

      saveTabs(next)
      setTabs(next)

      // If we closed the active tab, activate an adjacent one
      if (activeTabIdRef.current === id) {
        const currentIdx = tabsRef.current.findIndex((t: AppTab) => t.id === id)
        const newIdx = Math.min(currentIdx, next.length - 1)
        const newActive = next[newIdx]
        isSwitchingTabRef.current = true
        setActiveTabId(newActive.id)
        navigateRef.current(newActive.path)
      }
    },
    [flushActiveTabSaver]
  )

  const closeOtherTabs = useCallback(
    async (id: string) => {
      const prev = tabsRef.current
      const hasDirty = prev.some((t: AppTab) => t.id !== id && t.isDirty)
      if (hasDirty) {
        const confirmed = await confirm({
          title: 'Onopgeslagen wijzigingen',
          message: 'Sommige tabbladen hebben onopgeslagen wijzigingen. Toch sluiten?',
          confirmLabel: 'Sluiten',
          variant: 'destructive',
        })
        if (!confirmed) return
      }
      prev.forEach((t: AppTab) => { if (t.id !== id) wisTabSnapshots(t.id) })
      const next = tabsRef.current.filter((t: AppTab) => t.id === id)
      saveTabs(next)
      setActiveTabId(id)
      setTabs(next)
    },
    []
  )

  const closeAllTabs = useCallback(async () => {
    const prev = tabsRef.current
    const hasDirty = prev.some((t: AppTab) => t.isDirty)
    if (hasDirty) {
      const confirmed = await confirm({
        title: 'Onopgeslagen wijzigingen',
        message: 'Er zijn onopgeslagen wijzigingen. Weet je zeker dat je alle tabbladen wilt sluiten?',
        confirmLabel: 'Alles sluiten',
        variant: 'destructive',
      })
      if (!confirmed) return
    }
    prev.forEach((t: AppTab) => wisTabSnapshots(t.id))
    const fresh: AppTab = { id: nextTabId(), path: '/', label: 'Dashboard', isDirty: false }
    saveTabs([fresh])
    setTabs([fresh])
    isSwitchingTabRef.current = true
    setActiveTabId(fresh.id)
    navigateRef.current('/')
  }, [])

  // ── Switch to existing tab ─────────────────────────────────────────
  const setActiveTabFn = useCallback(
    async (id: string) => {
      if (id === activeTabIdRef.current) return
      await flushActiveTabSaver()
      const tab = tabsRef.current.find((t: AppTab) => t.id === id)
      setActiveTabId(id)
      if (tab && tab.path !== huidigPadRef.current) {
        isSwitchingTabRef.current = true
        navigateRef.current(tab.path, { replace: true })
      }
    },
    [flushActiveTabSaver]
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

  // Detailpagina's zetten hiermee de recordnaam als tab-label zodra hun data
  // geladen is; navigatie binnen de tab reset het label eerst via labelForPath
  const setActiveTabLabel = useCallback((label: string) => {
    const id = activeTabIdRef.current
    if (!id || !label.trim()) return
    setTabs(prev => {
      const tab = prev.find((t: AppTab) => t.id === id)
      if (!tab || tab.label === label) return prev
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

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      openTab,
      newTab,
      closeTab,
      closeOtherTabs,
      closeAllTabs,
      setActiveTab: setActiveTabFn,
      setTabDirty,
      registerTabSaver,
      updateTabLabel,
      setActiveTabLabel,
      reorderTabs,
    }),
    [
      tabs,
      activeTabId,
      openTab,
      newTab,
      closeTab,
      closeOtherTabs,
      closeAllTabs,
      setActiveTabFn,
      setTabDirty,
      registerTabSaver,
      updateTabLabel,
      setActiveTabLabel,
      reorderTabs,
    ],
  )

  return (
    <TabsContext.Provider value={value}>
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
