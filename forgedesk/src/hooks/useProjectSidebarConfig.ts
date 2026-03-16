import { useLocalStorage } from './useLocalStorage'

export interface ProjectSidebarConfig {
  klant: boolean
  team: boolean
  voortgang: boolean
  montage: boolean
  werkbonnen: boolean
  facturen: boolean
  uitgaven: boolean
  offertes: boolean
  visualisaties: boolean
  fotos: boolean
  bestanden: boolean
}

const DEFAULT_CONFIG: ProjectSidebarConfig = {
  klant: true,
  team: true,
  voortgang: true,
  montage: true,
  werkbonnen: true,
  facturen: true,
  uitgaven: true,
  offertes: true,
  visualisaties: true,
  fotos: true,
  bestanden: true,
}

export function useProjectSidebarConfig() {
  const [config, setConfig] = useLocalStorage<ProjectSidebarConfig>(
    'forgedesk-project-sidebar-config',
    DEFAULT_CONFIG,
  )

  // Ensure all keys exist (in case new ones were added)
  const mergedConfig: ProjectSidebarConfig = { ...DEFAULT_CONFIG, ...config }

  const toggleBox = (key: keyof ProjectSidebarConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const setBoxVisible = (key: keyof ProjectSidebarConfig, visible: boolean) => {
    setConfig(prev => ({ ...prev, [key]: visible }))
  }

  return { config: mergedConfig, toggleBox, setBoxVisible }
}
