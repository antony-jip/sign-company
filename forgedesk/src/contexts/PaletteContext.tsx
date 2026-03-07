import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// ================================================================
// APP THEMES — 4 vaste thema's, elk met eigen kleurenpalet
// Geen aparte kleurenpicker meer — consistentie boven keuze.
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
  // ────────────────────────────────────────────
  // 1. NORMAAL — Warm neutral, white cards, pastel accents, black buttons
  //    Exact match van de HTML mockup (#F4F3F0)
  // ────────────────────────────────────────────
  {
    id: 'normaal',
    naam: 'Normaal',
    beschrijving: 'Warm & neutraal — zoals de mockup',
    isDark: false,
    preview: { bg: '#F4F3F0', sidebar: '#FBFAF7', card: '#FFFFFF', accent: '#5A8264' },
    vars: {}, // Uses CSS :root defaults from index.css
  },

  // ────────────────────────────────────────────
  // 2. DARK — Deep dark, same vibe but inverted
  // ────────────────────────────────────────────
  {
    id: 'dark',
    naam: 'Dark',
    beschrijving: 'Diep donker — dezelfde sfeer',
    isDark: true,
    preview: { bg: '#141413', sidebar: '#191918', card: '#1E1E1C', accent: '#6BAF7C' },
    vars: {}, // Uses .dark block from index.css
  },

  // ────────────────────────────────────────────
  // 3. GLASS — Apple-style frosted glass, cool blue-grey
  // ────────────────────────────────────────────
  {
    id: 'glass',
    naam: 'Glass',
    beschrijving: 'Apple-stijl — frosted glass & clean',
    isDark: false,
    preview: { bg: '#EAEDF2', sidebar: '#E0E3EC', card: '#ffffffcc', accent: '#5B7FA3' },
    vars: {
      '--background': '225 14% 93%',
      '--foreground': '220 14% 10%',
      '--card': '225 12% 98%',
      '--card-foreground': '220 14% 10%',
      '--popover': '225 12% 98%',
      '--popover-foreground': '220 14% 10%',
      '--primary': '210 30% 35%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '225 10% 90%',
      '--secondary-foreground': '220 14% 10%',
      '--muted': '225 8% 90%',
      '--muted-foreground': '220 8% 40%',
      '--accent': '225 12% 88%',
      '--accent-foreground': '220 14% 10%',
      '--border': '225 6% 86%',
      '--input': '225 6% 86%',
      '--ring': '210 30% 50%',
      '--sidebar-background': '225 12% 90%',
      '--sidebar-foreground': '220 8% 42%',
      '--sidebar-primary': '210 30% 45%',
      '--sidebar-primary-foreground': '0 0% 10%',
      '--sidebar-accent': '225 12% 93%',
      '--sidebar-accent-foreground': '0 0% 10%',
      '--sidebar-border': '225 8% 84%',
      '--sidebar-ring': '210 30% 50%',
      '--wm-sidebar-bg': '225 12% 90%',
      '--wm-sidebar-hover': '225 8% 86%',
      '--wm-sidebar-active': '210 30% 45%',
      '--wm-shadow-color': '225 15% 50%',
      '--wm-glass': 'rgba(255, 255, 255, 0.50)',
      '--wm-glass-border': 'rgba(255, 255, 255, 0.55)',
      '--wm-hover': '210 30% 50%',
      '--wm-light': '210 35% 65%',
      '--wm-pale': '210 40% 90%',
      '--wm-gradient-start': '#3D5F80',
      '--wm-gradient-mid': '#8BAEC8',
      '--wm-gradient-end': '#D0E4F0',
      '--wm-glow': '0 0 40px rgba(91, 127, 163, 0.12)',
    },
  },

  // ────────────────────────────────────────────
  // 4. ZWART — OLED black, max contrast, bold
  // ────────────────────────────────────────────
  {
    id: 'zwart',
    naam: 'Zwart',
    beschrijving: 'OLED zwart — stoer & bold',
    isDark: true,
    preview: { bg: '#000000', sidebar: '#0A0A0A', card: '#111111', accent: '#FFFFFF' },
    vars: {
      '--background': '0 0% 0%',
      '--foreground': '0 0% 95%',
      '--card': '0 0% 7%',
      '--card-foreground': '0 0% 93%',
      '--popover': '0 0% 7%',
      '--popover-foreground': '0 0% 93%',
      '--primary': '0 0% 100%',
      '--primary-foreground': '0 0% 0%',
      '--secondary': '0 0% 12%',
      '--secondary-foreground': '0 0% 80%',
      '--muted': '0 0% 12%',
      '--muted-foreground': '0 0% 45%',
      '--accent': '0 0% 14%',
      '--accent-foreground': '0 0% 93%',
      '--destructive': '0 62% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '0 0% 14%',
      '--input': '0 0% 14%',
      '--ring': '0 0% 60%',
      '--sidebar-background': '0 0% 4%',
      '--sidebar-foreground': '0 0% 50%',
      '--sidebar-primary': '0 0% 85%',
      '--sidebar-primary-foreground': '0 0% 5%',
      '--sidebar-accent': '0 0% 10%',
      '--sidebar-accent-foreground': '0 0% 90%',
      '--sidebar-border': '0 0% 12%',
      '--sidebar-ring': '0 0% 60%',
      '--wm-sidebar-bg': '0 0% 4%',
      '--wm-sidebar-hover': '0 0% 8%',
      '--wm-sidebar-active': '0 0% 85%',
      '--wm-shadow-color': '0 0% 0%',
      '--wm-glass': 'rgba(0, 0, 0, 0.92)',
      '--wm-glass-border': 'rgba(255, 255, 255, 0.08)',
      '--wm-hover': '0 0% 70%',
      '--wm-light': '0 0% 55%',
      '--wm-pale': '0 0% 15%',
      '--wm-gradient-start': '#333333',
      '--wm-gradient-mid': '#666666',
      '--wm-gradient-end': '#999999',
      '--wm-glow': '0 0 40px rgba(255, 255, 255, 0.05)',
    },
  },
]

// Keep PALETTES export for backwards compatibility but empty
export const PALETTES: never[] = []

const THEME_STORAGE_KEY = 'forgedesk_app_theme'

interface PaletteContextType {
  appThemeId: string
  appTheme: AppTheme
  setAppThemeId: (id: string) => void
  // Backwards-compat stubs
  paletteId: string
  palette: null
  setPaletteId: (id: string) => void
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined)

// All CSS variable keys that themes may override
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

function applyAppTheme(theme: AppTheme) {
  const root = document.documentElement

  // Set data-theme for CSS overrides (e.g. glass frosted effects)
  if (theme.id === 'normaal' || theme.id === 'dark') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme.id)
  }

  // Set dark/light class
  if (theme.isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }

  // Clear all previous theme var overrides
  for (const key of ALL_THEME_VARS) {
    root.style.removeProperty(key)
  }

  // Apply theme-specific CSS vars
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [appThemeId, setAppThemeIdState] = useState<string>(() => {
    // Migrate old theme keys
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'standaard') return 'normaal'
    if (stored === 'snow') return 'glass'
    if (stored === 'midnight' || stored === 'dusk') return 'dark'
    if (stored === 'sand') return 'normaal'
    return stored || 'normaal'
  })

  const appTheme = APP_THEMES.find((t) => t.id === appThemeId) || APP_THEMES[0]

  const setAppThemeId = useCallback((id: string) => {
    localStorage.setItem(THEME_STORAGE_KEY, id)
    localStorage.setItem('forgedesk_theme', APP_THEMES.find((t) => t.id === id)?.isDark ? 'dark' : 'light')
    setAppThemeIdState(id)
  }, [])

  // Apply theme on mount and changes
  useEffect(() => {
    applyAppTheme(appTheme)
  }, [appTheme])

  return (
    <PaletteContext.Provider value={{
      appThemeId,
      appTheme,
      setAppThemeId,
      // Backwards-compat stubs
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
