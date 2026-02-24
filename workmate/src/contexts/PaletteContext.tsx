import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface ColorPalette {
  id: string
  naam: string
  beschrijving: string
  preview: string[] // 3 hex colors for the preview swatch
  light: {
    primary: string      // HSL values e.g. "163 36% 52%"
    accent: string
    ring: string
    sidebarActive: string
    wmHover: string
    wmLight: string
    wmPale: string
    // Hex values for gradients/non-Tailwind
    gradientStart: string
    gradientMid: string
    gradientEnd: string
    glow: string
  }
  dark: {
    primary: string
    accent: string
    ring: string
    wmHover: string
    wmLight: string
  }
}

export const PALETTES: ColorPalette[] = [
  {
    id: 'terracotta',
    naam: 'Terracotta',
    beschrijving: 'Warm & modern — de Sign Company stijl',
    preview: ['#8B4A2F', '#D4714A', '#F5DDD0'],
    light: {
      primary: '18 58% 56%',
      accent: '16 50% 36%',
      ring: '18 58% 56%',
      sidebarActive: '18 58% 56%',
      wmHover: '18 55% 48%',
      wmLight: '18 56% 68%',
      wmPale: '20 76% 90%',
      gradientStart: '#8B4A2F',
      gradientMid: '#D4714A',
      gradientEnd: '#F5DDD0',
      glow: '0 0 40px rgba(212, 113, 74, 0.15)',
    },
    dark: {
      primary: '18 62% 62%',
      accent: '16 45% 42%',
      ring: '18 62% 62%',
      wmHover: '18 55% 55%',
      wmLight: '18 56% 72%',
    },
  },
  {
    id: 'jade',
    naam: 'Jade',
    beschrijving: 'Botanisch groen — fris & natuurlijk',
    preview: ['#386150', '#58B09C', '#CAF7E2'],
    light: {
      primary: '163 36% 52%',
      accent: '155 27% 31%',
      ring: '163 36% 52%',
      sidebarActive: '163 36% 52%',
      wmHover: '163 33% 45%',
      wmLight: '163 46% 66%',
      wmPale: '146 76% 88%',
      gradientStart: '#386150',
      gradientMid: '#58B09C',
      gradientEnd: '#CAF7E2',
      glow: '0 0 40px rgba(88, 176, 156, 0.15)',
    },
    dark: {
      primary: '163 40% 58%',
      accent: '155 32% 38%',
      ring: '163 40% 58%',
      wmHover: '163 36% 50%',
      wmLight: '163 46% 70%',
    },
  },
  {
    id: 'ocean',
    naam: 'Ocean',
    beschrijving: 'Diepzee blauw — kalm & professioneel',
    preview: ['#384F65', '#5B8DB8', '#CAE8F7'],
    light: {
      primary: '207 37% 54%',
      accent: '210 28% 31%',
      ring: '207 37% 54%',
      sidebarActive: '207 37% 54%',
      wmHover: '207 37% 47%',
      wmLight: '198 46% 66%',
      wmPale: '200 76% 88%',
      gradientStart: '#384F65',
      gradientMid: '#5B8DB8',
      gradientEnd: '#CAE8F7',
      glow: '0 0 40px rgba(91, 141, 184, 0.15)',
    },
    dark: {
      primary: '207 42% 60%',
      accent: '210 33% 38%',
      ring: '207 42% 60%',
      wmHover: '207 40% 53%',
      wmLight: '198 46% 72%',
    },
  },
  {
    id: 'amber',
    naam: 'Amber',
    beschrijving: 'Warm goud — luxe & krachtig',
    preview: ['#655038', '#B89858', '#F7EDCA'],
    light: {
      primary: '40 43% 53%',
      accent: '30 28% 31%',
      ring: '40 43% 53%',
      sidebarActive: '40 43% 53%',
      wmHover: '40 40% 47%',
      wmLight: '48 46% 66%',
      wmPale: '45 76% 88%',
      gradientStart: '#655038',
      gradientMid: '#B89858',
      gradientEnd: '#F7EDCA',
      glow: '0 0 40px rgba(184, 152, 88, 0.15)',
    },
    dark: {
      primary: '40 48% 59%',
      accent: '30 33% 38%',
      ring: '40 48% 59%',
      wmHover: '40 44% 52%',
      wmLight: '48 46% 72%',
    },
  },
  {
    id: 'berry',
    naam: 'Berry',
    beschrijving: 'Rijk paars — creatief & gedurfd',
    preview: ['#503865', '#9C58B0', '#F0CAF7'],
    light: {
      primary: '287 37% 52%',
      accent: '281 28% 31%',
      ring: '287 37% 52%',
      sidebarActive: '287 37% 52%',
      wmHover: '287 35% 45%',
      wmLight: '287 46% 66%',
      wmPale: '290 76% 88%',
      gradientStart: '#503865',
      gradientMid: '#9C58B0',
      gradientEnd: '#F0CAF7',
      glow: '0 0 40px rgba(156, 88, 176, 0.15)',
    },
    dark: {
      primary: '287 42% 58%',
      accent: '281 33% 38%',
      ring: '287 42% 58%',
      wmHover: '287 38% 52%',
      wmLight: '287 46% 72%',
    },
  },
  {
    id: 'coral',
    naam: 'Coral',
    beschrijving: 'Warm terracotta — aards & stoer',
    preview: ['#654238', '#B07258', '#F7DFCA'],
    light: {
      primary: '18 37% 52%',
      accent: '13 28% 31%',
      ring: '18 37% 52%',
      sidebarActive: '18 37% 52%',
      wmHover: '18 35% 45%',
      wmLight: '18 46% 66%',
      wmPale: '20 76% 88%',
      gradientStart: '#654238',
      gradientMid: '#B07258',
      gradientEnd: '#F7DFCA',
      glow: '0 0 40px rgba(176, 114, 88, 0.15)',
    },
    dark: {
      primary: '18 42% 58%',
      accent: '13 33% 38%',
      ring: '18 42% 58%',
      wmHover: '18 38% 52%',
      wmLight: '18 46% 72%',
    },
  },
  {
    id: 'slate',
    naam: 'Slate',
    beschrijving: 'Koel staal — minimaal & modern',
    preview: ['#3D5565', '#6B8FA3', '#CAEAF7'],
    light: {
      primary: '200 24% 53%',
      accent: '204 25% 32%',
      ring: '200 24% 53%',
      sidebarActive: '200 24% 53%',
      wmHover: '200 24% 46%',
      wmLight: '198 38% 68%',
      wmPale: '200 76% 88%',
      gradientStart: '#3D5565',
      gradientMid: '#6B8FA3',
      gradientEnd: '#CAEAF7',
      glow: '0 0 40px rgba(107, 143, 163, 0.15)',
    },
    dark: {
      primary: '200 29% 59%',
      accent: '204 30% 39%',
      ring: '200 29% 59%',
      wmHover: '200 27% 52%',
      wmLight: '198 38% 74%',
    },
  },
  {
    id: 'rose',
    naam: 'Rosé',
    beschrijving: 'Zacht roze — elegant & warm',
    preview: ['#653850', '#B0587D', '#F7CADF'],
    light: {
      primary: '336 37% 52%',
      accent: '330 28% 31%',
      ring: '336 37% 52%',
      sidebarActive: '336 37% 52%',
      wmHover: '336 35% 45%',
      wmLight: '336 46% 66%',
      wmPale: '338 76% 88%',
      gradientStart: '#653850',
      gradientMid: '#B0587D',
      gradientEnd: '#F7CADF',
      glow: '0 0 40px rgba(176, 88, 125, 0.15)',
    },
    dark: {
      primary: '336 42% 58%',
      accent: '330 33% 38%',
      ring: '336 42% 58%',
      wmHover: '336 38% 52%',
      wmLight: '336 46% 72%',
    },
  },
  {
    id: 'forest',
    naam: 'Forest',
    beschrijving: 'Diep bosgroen — natuurlijk & sterk',
    preview: ['#3D6538', '#6B9C58', '#D4F7CA'],
    light: {
      primary: '103 28% 48%',
      accent: '109 27% 31%',
      ring: '103 28% 48%',
      sidebarActive: '103 28% 48%',
      wmHover: '103 28% 41%',
      wmLight: '103 46% 66%',
      wmPale: '107 76% 88%',
      gradientStart: '#3D6538',
      gradientMid: '#6B9C58',
      gradientEnd: '#D4F7CA',
      glow: '0 0 40px rgba(107, 156, 88, 0.15)',
    },
    dark: {
      primary: '103 33% 54%',
      accent: '109 32% 38%',
      ring: '103 33% 54%',
      wmHover: '103 30% 47%',
      wmLight: '103 46% 72%',
    },
  },
]

const STORAGE_KEY = 'workmate_palette'

interface PaletteContextType {
  paletteId: string
  palette: ColorPalette
  setPaletteId: (id: string) => void
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined)

function applyPalette(palette: ColorPalette, isDark: boolean) {
  const root = document.documentElement
  const colors = palette.light
  const darkColors = palette.dark

  // Light mode HSL vars (always set, used as base)
  root.style.setProperty('--primary', isDark ? darkColors.primary : colors.primary)
  root.style.setProperty('--accent', isDark ? darkColors.accent : colors.accent)
  root.style.setProperty('--ring', isDark ? darkColors.ring : colors.ring)
  root.style.setProperty('--wm-sidebar-active', colors.sidebarActive)
  root.style.setProperty('--wm-hover', isDark ? darkColors.wmHover : colors.wmHover)
  root.style.setProperty('--wm-light', isDark ? darkColors.wmLight : colors.wmLight)
  root.style.setProperty('--wm-pale', colors.wmPale)

  // Hex values for gradients & non-Tailwind CSS
  root.style.setProperty('--wm-gradient-start', colors.gradientStart)
  root.style.setProperty('--wm-gradient-mid', colors.gradientMid)
  root.style.setProperty('--wm-gradient-end', colors.gradientEnd)
  root.style.setProperty('--wm-glow', isDark
    ? colors.glow.replace('0.15', '0.08')
    : colors.glow
  )
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'terracotta'
    } catch {
      return 'terracotta'
    }
  })

  const palette = PALETTES.find((p) => p.id === paletteId) || PALETTES[0]

  const setPaletteId = useCallback((id: string) => {
    try { localStorage.setItem(STORAGE_KEY, id) } catch { /* storage unavailable */ }
    setPaletteIdState(id)
  }, [])

  // Apply palette whenever it changes or theme changes
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    applyPalette(palette, isDark)

    // Watch for theme class changes
    const observer = new MutationObserver(() => {
      const nowDark = document.documentElement.classList.contains('dark')
      applyPalette(palette, nowDark)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [palette])

  return (
    <PaletteContext.Provider value={{ paletteId, palette, setPaletteId }}>
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
