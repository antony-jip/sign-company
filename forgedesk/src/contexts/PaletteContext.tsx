import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// ================================================================
// APP THEMES — 2 thema's: Normaal (licht) en Dark
// Accentkleuren wisselen subtiel via paletten
// ================================================================

export interface AppTheme {
  id: string
  naam: string
  beschrijving: string
  isDark: boolean
  preview: { bg: string; sidebar: string; card: string; accent: string }
  vars: Record<string, string>
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'normaal',
    naam: 'Normaal',
    beschrijving: 'Warm & neutraal',
    isDark: false,
    preview: { bg: '#F4F3F0', sidebar: '#FBFAF7', card: '#FFFFFF', accent: '#1A535C' },
    vars: {},
  },
  {
    id: 'dark',
    naam: 'Dark',
    beschrijving: 'Diep donker',
    isDark: true,
    preview: { bg: '#141413', sidebar: '#191918', card: '#1E1E1C', accent: '#6BAF7C' },
    vars: {},
  },
]

// Accent palettes — only change subtle accent colors
export interface AccentPalette {
  id: string
  naam: string
  sidebarActive: string
  gradientStart: string
  gradientEnd: string
  ring: string
}

export const ACCENT_PALETTES: AccentPalette[] = [
  { id: 'petrol', naam: 'Petrol', sidebarActive: '186 52% 23%', gradientStart: '#1A535C', gradientEnd: '#E2F0F0', ring: '186 52% 23%' },
  { id: 'flame', naam: 'Flame', sidebarActive: '12 87% 57%', gradientStart: '#F15025', gradientEnd: '#FDE8E2', ring: '12 87% 57%' },
  { id: 'sage', naam: 'Sage', sidebarActive: '145 22% 45%', gradientStart: '#2D6B48', gradientEnd: '#E4F0EA', ring: '145 22% 45%' },
  { id: 'ocean', naam: 'Ocean', sidebarActive: '210 40% 45%', gradientStart: '#3A6B8C', gradientEnd: '#E5ECF6', ring: '210 40% 45%' },
  { id: 'terracotta', naam: 'Terracotta', sidebarActive: '15 45% 50%', gradientStart: '#9A5A48', gradientEnd: '#F2E8E5', ring: '15 45% 50%' },
  { id: 'slate', naam: 'Slate', sidebarActive: '220 15% 40%', gradientStart: '#5A5A55', gradientEnd: '#EEEEED', ring: '220 15% 40%' },
]

// Keep PALETTES export for backwards compatibility
export const PALETTES: never[] = []

const THEME_STORAGE_KEY = 'forgedesk_app_theme'
const ACCENT_STORAGE_KEY = 'forgedesk_accent'

interface PaletteContextType {
  appThemeId: string
  appTheme: AppTheme
  setAppThemeId: (id: string) => void
  accentId: string
  accent: AccentPalette
  setAccentId: (id: string) => void
  // Backwards-compat stubs
  paletteId: string
  palette: null
  setPaletteId: (id: string) => void
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined)

const ALL_THEME_VARS = [
  '--background', '--foreground', '--card', '--card-foreground',
  '--popover', '--popover-foreground', '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
  '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
  '--border', '--input', '--ring',
  '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
  '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
  '--wm-sidebar-bg', '--wm-sidebar-hover', '--wm-sidebar-active',
  '--wm-shadow-color', '--wm-glass', '--wm-glass-border',
  '--wm-hover', '--wm-light', '--wm-pale',
  '--wm-gradient-start', '--wm-gradient-mid', '--wm-gradient-end', '--wm-glow',
]

function applyAppTheme(theme: AppTheme, accent: AccentPalette) {
  const root = document.documentElement

  root.removeAttribute('data-theme')

  if (theme.isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }

  for (const key of ALL_THEME_VARS) {
    root.style.removeProperty(key)
  }

  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }

  // Apply accent palette
  root.style.setProperty('--sidebar-primary', accent.sidebarActive)
  root.style.setProperty('--wm-sidebar-active', accent.sidebarActive)
  root.style.setProperty('--ring', accent.ring)
  root.style.setProperty('--wm-gradient-start', accent.gradientStart)
  root.style.setProperty('--wm-gradient-end', accent.gradientEnd)
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [appThemeId, setAppThemeIdState] = useState<string>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'standaard' || stored === 'snow' || stored === 'sand' || stored === 'glass') return 'normaal'
    if (stored === 'midnight' || stored === 'dusk' || stored === 'zwart') return 'dark'
    return stored || 'normaal'
  })

  const [accentId, setAccentIdState] = useState<string>(() => {
    return localStorage.getItem(ACCENT_STORAGE_KEY) || 'petrol'
  })

  const appTheme = APP_THEMES.find((t) => t.id === appThemeId) || APP_THEMES[0]
  const accent = ACCENT_PALETTES.find((a) => a.id === accentId) || ACCENT_PALETTES[0]

  const setAppThemeId = useCallback((id: string) => {
    localStorage.setItem(THEME_STORAGE_KEY, id)
    localStorage.setItem('forgedesk_theme', APP_THEMES.find((t) => t.id === id)?.isDark ? 'dark' : 'light')
    setAppThemeIdState(id)
  }, [])

  const setAccentId = useCallback((id: string) => {
    localStorage.setItem(ACCENT_STORAGE_KEY, id)
    setAccentIdState(id)
  }, [])

  useEffect(() => {
    applyAppTheme(appTheme, accent)
  }, [appTheme, accent])

  return (
    <PaletteContext.Provider value={{
      appThemeId,
      appTheme,
      setAppThemeId,
      accentId,
      accent,
      setAccentId,
      paletteId: '',
      palette: null,
      setPaletteId: () => {},
    }}>
      {children}
    </PaletteContext.Provider>
  )
}

export function usePalette() {
  const context = useContext(PaletteContext)
  if (!context) {
    throw new Error('usePalette must be used within a PaletteProvider')
  }
  return context
}
