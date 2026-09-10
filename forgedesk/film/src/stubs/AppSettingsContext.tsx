import type { ReactNode } from 'react'
export function AppSettingsProvider({ children }: { children: ReactNode }) { return <>{children}</> }
export function useAppSettings() {
  return { settings: {}, werkbonBriefpapier: null, forgieEnabled: true }
}
