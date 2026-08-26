import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getAppSettings, updateAppSettings, getProfile, updateProfile } from '@/services/supabaseService'
import type { AppSettings, Profile, PipelineStap } from '@/types'
import { getDefaultAppSettings } from '@/services/supabaseService'
import { logger } from '../utils/logger'
import { HANDTEKENING_BREEDTE_STANDAARD } from '@/utils/handtekening'
import { DEFAULT_OFFERTE_LEVERTIJD, DEFAULT_OFFERTE_BETALINGSCONDITIE } from '@/utils/defaults'

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
  offerteStartNummer: number
  offerteGeldigheidDagen: number
  autoFollowUp: boolean
  followUpDagen: number
  pipelineStappen: PipelineStap[]
  emailHandtekening: string
  handtekeningAfbeelding: string
  handtekeningAfbeeldingGrootte: number
  handtekeningAfbeeldingLink: string
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
  anthropicApiKey: string
  // Factuur instellingen
  factuurPrefix: string
  factuurStartNummer: number
  creditnotaDoornummeren: boolean
  creditnotaPrefix: string
  factuurBetaaltermijnDagen: number
  factuurVoorwaarden: string
  factuurIntroTekst: string
  factuurOutroTekst: string
  // Offerte teksten
  offerteIntroTekst: string
  offerteOutroTekst: string
  offerteLevertijd: string
  offerteBetalingsconditie: string
  // Offerte layout
  offerteToonM2: boolean
  // Werkbon instellingen
  werkbonMonteurUren: boolean
  werkbonMonteurOpmerkingen: boolean
  werkbonMonteurFotos: boolean
  werkbonKlantHandtekening: boolean
  werkbonBriefpapier: boolean
  werkbonPrefix: string
  werkbonCanvasVersie: number
  // Email
  emailFetchLimit: number
  // Daan
  forgieEnabled: boolean
  // Quick Actions
  quickActionsEnabled: boolean
  quickActionItems: string[]
  // Communicatie supertab (fase 3 feature flag)
  doenCommunicatieTabEnabled: boolean
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined)

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { user, organisatie } = useAuth()
  const [settings, setSettings] = useState<AppSettings>(() => getDefaultAppSettings(''))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [eigenaarBedrijf, setEigenaarBedrijf] = useState<Partial<Profile> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) {
        if (!cancelled) setIsLoading(false)
        return
      }
      try {
        if (!cancelled) setIsLoading(true)
        const [settingsData, profileData] = await Promise.all([
          getAppSettings(user.id),
          getProfile(user.id),
        ])
        if (!cancelled) {
          setSettings(settingsData)
          if (profileData) setProfile(profileData)
        }
      } catch (err) {
        logger.error('Error loading app settings:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  // Bedrijfsgegevens op documenten komen van de organisatie-eigenaar (net als
  // de publieke endpoints doen), niet van de ingelogde gebruiker: een teamlid
  // met leeg profiel mag geen factuur zonder KvK/btw/IBAN produceren.
  const eigenaarId = organisatie?.eigenaar_id
  useEffect(() => {
    let cancelled = false
    async function laadEigenaarBedrijf() {
      if (!user?.id || !eigenaarId || eigenaarId === user.id) {
        if (!cancelled) setEigenaarBedrijf(null)
        return
      }
      try {
        const eigenaar = await getProfile(eigenaarId)
        if (!cancelled && eigenaar) {
          setEigenaarBedrijf({
            logo_url: eigenaar.logo_url,
            bedrijfsnaam: eigenaar.bedrijfsnaam,
            bedrijfs_adres: eigenaar.bedrijfs_adres,
            bedrijfs_telefoon: eigenaar.bedrijfs_telefoon,
            bedrijfs_email: eigenaar.bedrijfs_email,
            bedrijfs_website: eigenaar.bedrijfs_website,
            kvk_nummer: eigenaar.kvk_nummer,
            btw_nummer: eigenaar.btw_nummer,
            iban: eigenaar.iban,
          })
        }
      } catch (err) {
        logger.error('Kon bedrijfsgegevens van organisatie-eigenaar niet laden:', err)
      }
    }
    laadEigenaarBedrijf()
    return () => { cancelled = true }
  }, [user?.id, eigenaarId])

  const handleUpdateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    if (!user?.id) return
    try {
      // Per-user velden (handtekening, sidebar_items, afzender_naam) worden
      // door updateAppSettings doorgesluisd naar profiles. Vernieuw profile
      // ook in state als zo'n veld in de update zit.
      const perUserKeys = ['email_handtekening', 'handtekening_afbeelding', 'handtekening_afbeelding_grootte', 'handtekening_afbeelding_link', 'afzender_naam', 'sidebar_items', 'mobiel_menu_items', 'dashboard_blokken']
      const heeftPerUserUpdate = perUserKeys.some(k => k in updates)
      const updated = await updateAppSettings(user.id, updates)
      setSettings(updated)
      if (heeftPerUserUpdate) {
        const freshProfile = await getProfile(user.id)
        if (freshProfile) setProfile(freshProfile)
      }
    } catch (err) {
      logger.error('Error updating settings:', err)
      throw err
    }
  }, [user?.id])

  const handleUpdateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user?.id) return
    try {
      const updated = await updateProfile(user.id, updates)
      setProfile(updated)
    } catch (err) {
      logger.error('Error updating profile:', err)
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

  // Anthropic key is server-side only (ANTHROPIC_API_KEY in env, not exposed to frontend)
  const anthropicApiKey = ''

  // Sinds migratie 091 staan sidebar_items per-user op profiles, sinds 169
  // ook mobiel_menu_items. Merge ze hier in het settings-object zodat
  // consumers (Sidebar, TopNav, MobileTabBar) uit één plek kunnen lezen.
  // mobiel_menu_items mag bewust leeg zijn, dus alleen undefined (kolom
  // ontbreekt nog) valt terug op de default; null en [] gaan door.
  // useMemo omdat consumers `settings` als effect-dependency gebruiken: een
  // vers object bij elke render zou die effects elke keer opnieuw aftrappen.
  const mergedSettings: AppSettings = React.useMemo(() => ({
    ...settings,
    ...(profile?.sidebar_items != null ? { sidebar_items: profile.sidebar_items } : {}),
    ...(profile && 'mobiel_menu_items' in profile ? { mobiel_menu_items: profile.mobiel_menu_items } : {}),
    ...(profile && 'dashboard_blokken' in profile ? { dashboard_blokken: profile.dashboard_blokken } : {}),
  }), [settings, profile])

  const documentProfiel = profile && eigenaarBedrijf ? { ...profile, ...eigenaarBedrijf } : profile

  const value: AppSettingsContextType = {
    settings: mergedSettings,
    profile: documentProfiel,
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
    offerteStartNummer: settings.offerte_volgnummer ?? 1,
    offerteGeldigheidDagen: settings.offerte_geldigheid_dagen ?? 30,
    autoFollowUp: settings.auto_follow_up ?? true,
    followUpDagen: settings.follow_up_dagen ?? 7,
    pipelineStappen: settings.pipeline_stappen || [],
    // Handtekening-velden staan sinds migratie 091 op profiles (per-user).
    // Fallback op settings voor rijen die nog niet gebackfilld zijn.
    // `||` ipv `??` zodat een lege string (DEFAULT '' uit migratie 091) ook
    // doorvalt naar de oude org-brede waarde in app_settings.
    emailHandtekening: (profile?.email_handtekening?.trim() ? profile.email_handtekening : null) || settings.email_handtekening || '',
    handtekeningAfbeelding: profile?.handtekening_afbeelding || settings.handtekening_afbeelding || '',
    handtekeningAfbeeldingGrootte: profile?.handtekening_afbeelding_grootte || settings.handtekening_afbeelding_grootte || HANDTEKENING_BREEDTE_STANDAARD,
    handtekeningAfbeeldingLink: profile?.handtekening_afbeelding_link || settings.handtekening_afbeelding_link || '',
    primaireKleur: settings.primaire_kleur || '#1A535C',
    secundaireKleur: settings.secundaire_kleur || '#7c3aed',
    toonConversieRate: settings.toon_conversie_rate ?? true,
    toonDagenOpen: settings.toon_dagen_open ?? true,
    toonFollowUpIndicatoren: settings.toon_follow_up_indicatoren ?? true,
    bedrijfsnaam: documentProfiel?.bedrijfsnaam || '',
    bedrijfsAdres: documentProfiel?.bedrijfs_adres || '',
    kvkNummer: documentProfiel?.kvk_nummer || '',
    btwNummer: documentProfiel?.btw_nummer || '',
    logoUrl: documentProfiel?.logo_url || '',
    anthropicApiKey,
    // Factuur instellingen
    factuurPrefix: settings.factuur_prefix ?? '',
    factuurStartNummer: settings.factuur_volgnummer ?? 1,
    creditnotaDoornummeren: settings.creditnota_doornummeren ?? false,
    creditnotaPrefix: settings.creditnota_prefix || 'CN',
    factuurBetaaltermijnDagen: settings.factuur_betaaltermijn_dagen ?? 30,
    factuurVoorwaarden: settings.factuur_voorwaarden || 'Betaling binnen 30 dagen na factuurdatum.',
    factuurIntroTekst: settings.factuur_intro_tekst || '',
    factuurOutroTekst: settings.factuur_outro_tekst || '',
    // Offerte teksten
    offerteIntroTekst: settings.offerte_intro_tekst || '',
    offerteOutroTekst: settings.offerte_outro_tekst || '',
    offerteLevertijd: settings.offerte_levertijd || DEFAULT_OFFERTE_LEVERTIJD,
    offerteBetalingsconditie: settings.offerte_betalingsconditie || DEFAULT_OFFERTE_BETALINGSCONDITIE,
    // Offerte layout
    offerteToonM2: settings.offerte_toon_m2 ?? true,
    // Werkbon instellingen
    werkbonMonteurUren: settings.werkbon_monteur_uren ?? true,
    werkbonMonteurOpmerkingen: settings.werkbon_monteur_opmerkingen ?? true,
    werkbonMonteurFotos: settings.werkbon_monteur_fotos ?? true,
    werkbonKlantHandtekening: settings.werkbon_klant_handtekening ?? true,
    werkbonBriefpapier: settings.werkbon_briefpapier ?? true,
    werkbonPrefix: settings.werkbon_prefix || 'WB',
    werkbonCanvasVersie: settings?.werkbon_canvas_versie ?? 0,
    // Email
    emailFetchLimit: settings.email_fetch_limit ?? 200,
    // Daan
    forgieEnabled: settings.forgie_enabled ?? true,
    // Quick Actions
    quickActionsEnabled: settings.quick_actions_enabled ?? true,
    quickActionItems: Array.isArray(settings.quick_action_items) ? settings.quick_action_items : ['project', 'mail', 'offerte', 'klant'],
    // Communicatie supertab feature flag
    doenCommunicatieTabEnabled: settings.doen_communicatie_tab_enabled ?? false,
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
