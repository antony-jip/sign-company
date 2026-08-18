import React, { createContext, useContext, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Inert wrapper: het thema (licht/donker) wordt volledig beheerd door
  // PaletteContext (leest doen_app_theme, zet .dark, volgt OS-voorkeur).
  // Deze provider forceert niets meer, zodat dark mode werkt.
  const noop = () => {}

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: noop, setTheme: noop }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
