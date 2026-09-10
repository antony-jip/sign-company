import type { ReactNode } from 'react'
export interface AppTab { id: string; path: string; title: string }
export function pathnameVan(path: string) { return path }
export function TabsProvider({ children }: { children: ReactNode }) { return <>{children}</> }
export function useTabs() {
  return { tabs: [] as AppTab[], activeTabId: null, openTab: () => {}, closeTab: () => {}, setActiveTab: () => {} }
}
