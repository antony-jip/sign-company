import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export const RAIL_WIDTH = 88
export const EXPANDED_WIDTH = 244

export type LayoutMode = 'sidebar' | 'topnav'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  setCollapsed: (collapsed: boolean) => void
  layoutMode: LayoutMode
  setLayoutMode: (mode: LayoutMode) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('doen_sidebar_collapsed')
    return stored !== 'false' // Default to collapsed (rail mode)
  })

  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'topnav'
    const stored = localStorage.getItem('doen_layout_mode')
    return stored === 'topnav' ? 'topnav' : 'sidebar'
  })

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        setLayoutModeState('topnav')
      } else {
        const stored = localStorage.getItem('doen_layout_mode')
        setLayoutModeState(stored === 'topnav' ? 'topnav' : 'sidebar')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      localStorage.setItem('doen_sidebar_collapsed', String(!prev))
      return !prev
    })
  }

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed)
    localStorage.setItem('doen_sidebar_collapsed', String(collapsed))
  }

  const setLayoutMode = (mode: LayoutMode) => {
    setLayoutModeState(mode)
    localStorage.setItem('doen_layout_mode', mode)
  }

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      toggleSidebar,
      setCollapsed,
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
