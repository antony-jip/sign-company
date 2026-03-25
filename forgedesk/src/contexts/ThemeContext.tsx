import React, { createContext, useContext, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Forceer light mode — dark mode is uitgeschakeld
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('dark')
    root.classList.add('light')
    localStorage.removeItem('doen_theme')
  }, [])

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
