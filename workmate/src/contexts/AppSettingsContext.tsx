import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getAppSettings, updateAppSettings, getProfile, updateProfile } from '@/services/supabaseService'
import type { AppSettings, Profile, PipelineStap } from '@/types'
import { getDefaultAppSettings } from '@/services/supabaseService'

interface AppSettingsContextType {
  settings: AppSettings
  profile: Profile | null
  isLoading: boolean
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
  updateUserProfile: (updates: Partial<Profile>) => Promise<void>
  refreshSettings: () => Promise<void>
  refreshProfile: () => Promise<void>
  // Convenience getters
  valutaSymbool: string
  valuta: string
  standaardBtw: number
  offertePrefix: string
  offerteGeldigheidDagen: number
  autoFollowUp: boolean
  followUpDagen: number
  pipelineStappen: PipelineStap[]
  emailHandtekening: string
  primaireKleur: string
  secundaireKleur: string
  toonConversieRate: boolean
  toonDagenOpen: boolean
  toonFollowUpIndicatoren: boolean
  bedrijfsnaam: string
  bedrijfsAdres: string
  kvkNummer: string
  btwNummer: string
  logoUrl: string
  openaiApiKey: string
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined)

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AppSettings>(() => getDefaultAppSettings(''))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadSettings = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const [settingsData, profileData] = await Promise.all([
        getAppSettings(user.id),
        getProfile(user.id),
      ])
      setSettings(settingsData)
      if (profileData) setProfile(profileData)
    } catch (err) {
      console.error('Error loading app settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleUpdateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    if (!user?.id) return
    try {
      const updated = await updateAppSettings(user.id, updates)
      setSettings(updated)
    } catch (err) {
      console.error('Error updating settings:', err)
      throw err
    }
  }, [user?.id])

  const handleUpdateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user?.id) return
    try {
      const updated = await updateProfile(user.id, updates)
      setProfile(updated)
    } catch (err) {
      console.error('Error updating profile:', err)
      throw err
    }
  }, [user?.id])

  const refreshSettings = useCallback(async () => {
    if (!user?.id) return
    const data = await getAppSettings(user.id)
    setSettings(data)
  }, [user?.id])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    const data = await getProfile(user.id)
    if (data) setProfile(data)
  }, [user?.id])

  // OpenAI key is now server-side only (OPENAI_API_KEY in env, not exposed to frontend)
  const openaiApiKey = ''

  const value: AppSettingsContextType = {
    settings,
    profile,
    isLoading,
    updateSettings: handleUpdateSettings,
    updateUserProfile: handleUpdateProfile,
    refreshSettings,
    refreshProfile,
    // Convenience getters
    valutaSymbool: settings.valuta_symbool || '\u20AC',
    valuta: settings.valuta || 'EUR',
    standaardBtw: settings.standaard_btw ?? 21,
    offertePrefix: settings.offerte_prefix || 'OFF',
    offerteGeldigheidDagen: settings.offerte_geldigheid_dagen ?? 30,
    autoFollowUp: settings.auto_follow_up ?? true,
    followUpDagen: settings.follow_up_dagen ?? 7,
    pipelineStappen: settings.pipeline_stappen || [],
    emailHandtekening: settings.email_handtekening || '',
    primaireKleur: settings.primaire_kleur || '#2563eb',
    secundaireKleur: settings.secundaire_kleur || '#7c3aed',
    toonConversieRate: settings.toon_conversie_rate ?? true,
    toonDagenOpen: settings.toon_dagen_open ?? true,
    toonFollowUpIndicatoren: settings.toon_follow_up_indicatoren ?? true,
    bedrijfsnaam: profile?.bedrijfsnaam || '',
    bedrijfsAdres: profile?.bedrijfs_adres || '',
    kvkNummer: profile?.kvk_nummer || '',
    btwNummer: profile?.btw_nummer || '',
    logoUrl: profile?.logo_url || '',
    openaiApiKey,
  }

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider')
  }
  return context
}
