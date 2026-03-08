import { useEffect } from 'react'
import { useTabs } from '@/contexts/TabsContext'

/**
 * Keyboard shortcuts for tab management:
 * - Cmd/Ctrl + W: Close active tab
 * - Cmd/Ctrl + Tab: Switch to next tab
 * - Cmd/Ctrl + Shift + Tab: Switch to previous tab
 * - Cmd/Ctrl + 1-8: Switch to tab by index
 * - Cmd/Ctrl + 9: Switch to last tab
 */
export function useTabShortcuts() {
  const { tabs, activeTabId, setActiveTab, closeTab, newTab } = useTabs()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      // Cmd+T – new tab
      if (e.key === 't') {
        e.preventDefault()
        newTab()
        return
      }

      // Cmd+W – close active tab
      if (e.key === 'w' && activeTabId) {
        e.preventDefault()
        closeTab(activeTabId)
        return
      }

      // Cmd+Tab / Cmd+Shift+Tab – cycle tabs
      if (e.key === 'Tab' && tabs.length > 1 && activeTabId) {
        e.preventDefault()
        const idx = tabs.findIndex(t => t.id === activeTabId)
        if (e.shiftKey) {
          const prev = idx <= 0 ? tabs.length - 1 : idx - 1
          setActiveTab(tabs[prev].id)
        } else {
          const next = idx >= tabs.length - 1 ? 0 : idx + 1
          setActiveTab(tabs[next].id)
        }
        return
      }

      // Cmd+1..8 – jump to tab by index
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= 8 && tabs.length > 0) {
        e.preventDefault()
        const targetIdx = num - 1
        if (targetIdx < tabs.length) {
          setActiveTab(tabs[targetIdx].id)
        }
        return
      }

      // Cmd+9 – last tab
      if (e.key === '9' && tabs.length > 0) {
        e.preventDefault()
        setActiveTab(tabs[tabs.length - 1].id)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tabs, activeTabId, setActiveTab, closeTab, newTab])
}
