import React, { createContext, useContext, useState, ReactNode } from 'react'

const DEFAULT_WIDTH = 220
const MIN_WIDTH = 180
const MAX_WIDTH = 360
const COLLAPSED_WIDTH = 64

export type LayoutMode = 'sidebar' | 'topnav'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  setCollapsed: (collapsed: boolean) => void
  sidebarWidth: number
  setSidebarWidth: (width: number) => void
  minWidth: number
  maxWidth: number
  collapsedWidth: number
  layoutMode: LayoutMode
  setLayoutMode: (mode: LayoutMode) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('workmate_sidebar_collapsed')
    return stored === 'true'
  })

  const [sidebarWidth, setSidebarWidthState] = useState(() => {
    const stored = localStorage.getItem('workmate_sidebar_width')
    const parsed = stored ? parseInt(stored, 10) : NaN
    return !isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH ? parsed : DEFAULT_WIDTH
  })

  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    const stored = localStorage.getItem('workmate_layout_mode')
    return stored === 'topnav' ? 'topnav' : 'sidebar'
  })

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      localStorage.setItem('workmate_sidebar_collapsed', String(!prev))
      return !prev
    })
  }

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed)
    localStorage.setItem('workmate_sidebar_collapsed', String(collapsed))
  }

  const setSidebarWidth = (width: number) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
    setSidebarWidthState(clamped)
    localStorage.setItem('workmate_sidebar_width', String(clamped))
  }

  const setLayoutMode = (mode: LayoutMode) => {
    setLayoutModeState(mode)
    localStorage.setItem('workmate_layout_mode', mode)
  }

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      toggleSidebar,
      setCollapsed,
      sidebarWidth,
      setSidebarWidth,
      minWidth: MIN_WIDTH,
      maxWidth: MAX_WIDTH,
      collapsedWidth: COLLAPSED_WIDTH,
      layoutMode,
      setLayoutMode,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
