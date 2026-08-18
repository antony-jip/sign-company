import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTabs } from '@/contexts/TabsContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface OpenTabOptions {
  path: string
  label: string
  icon?: string
  id?: string
  meta?: Record<string, unknown>
}

export function useNavigateWithTab() {
  const navigate = useNavigate()
  const { openTab } = useTabs()
  // De tabbalk is een desktop-idioom en staat onder md verborgen. Het systeem
  // eronder liet zich daar niet verbergen: het bepaalde nog wél waar je heen
  // ging, op basis van tabbladen die je niet kon zien, sluiten of herkennen.
  // Op een telefoon is navigeren dus gewoon navigeren.
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const navigateWithTab = useCallback(
    (options: OpenTabOptions) => {
      if (!isDesktop) {
        navigate(options.path)
        return
      }
      openTab({
        id: options.id ?? options.path,
        path: options.path,
        label: options.label,
        icon: options.icon,
        meta: options.meta,
      })
    },
    [openTab, navigate, isDesktop]
  )

  // For simple navigations that don't need a tab (e.g. sub-routes, modals)
  const navigateSimple = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  return { navigateWithTab, navigateSimple }
}
