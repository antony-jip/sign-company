import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTabs } from '@/contexts/TabsContext'

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

  const navigateWithTab = useCallback(
    (options: OpenTabOptions) => {
      openTab({
        id: options.id ?? options.path,
        path: options.path,
        label: options.label,
        icon: options.icon,
        meta: options.meta,
      })
    },
    [openTab]
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
