import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import supabase, { isSupabaseConfigured } from '@/services/supabaseClient'
import { logger } from '@/utils/logger'

export type StapId = 'account' | 'klanten' | 'logo' | 'bedrijf' | 'email' | 'project' | 'team'

export interface AanDeSlagStap {
  id: StapId
  klaar: boolean
}

export interface AanDeSlagStatus {
  isLoading: boolean
  stappen: Record<StapId, boolean>
  klaarCount: number
  totaal: number
  verplichtKlaarCount: number
  totaalVerplicht: number
  alleVerplichtKlaar: boolean
  verborgen: boolean
  dismiss: () => Promise<void>
}

const VERPLICHTE_STAPPEN: StapId[] = ['klanten', 'logo', 'bedrijf', 'email', 'project']
const ALLE_STAPPEN: StapId[] = ['account', 'klanten', 'logo', 'bedrijf', 'email', 'project', 'team']

async function countRows(tabel: string, filterUser?: string): Promise<number> {
  if (!supabase) return 0
  let q = supabase.from(tabel).select('id', { count: 'exact', head: true })
  if (filterUser) q = q.eq('user_id', filterUser)
  const { count, error } = await q
  if (error) {
    logger.warn(`[AanDeSlag] count ${tabel}:`, error.message)
    return 0
  }
  return count ?? 0
}

export function useAanDeSlagStatus(): AanDeSlagStatus {
  const { user, organisatie } = useAuth()
  const { profile, updateUserProfile } = useAppSettings()

  const [isLoading, setIsLoading] = useState(true)
  const [klantenCount, setKlantenCount] = useState(0)
  const [projectenCount, setProjectenCount] = useState(0)
  const [medewerkersCount, setMedewerkersCount] = useState(0)
  const [emailSettingsCount, setEmailSettingsCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const laad = async () => {
      if (!isSupabaseConfigured() || !user?.id) {
        if (!cancelled) setIsLoading(false)
        return
      }
      try {
        const [klanten, projecten, medewerkers, emailSettings] = await Promise.all([
          countRows('klanten'),
          countRows('projecten'),
          countRows('medewerkers'),
          countRows('user_email_settings', user.id),
        ])
        if (cancelled) return
        setKlantenCount(klanten)
        setProjectenCount(projecten)
        setMedewerkersCount(medewerkers)
        setEmailSettingsCount(emailSettings)
      } catch (err) {
        logger.error('[AanDeSlag] laad faalde:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    laad()
    return () => { cancelled = true }
  }, [user?.id, organisatie?.id])

  const kvkKlaar = !!(organisatie?.kvk_nummer?.trim() || profile?.kvk_nummer?.trim())
  const btwKlaar = !!(organisatie?.btw_nummer?.trim() || profile?.btw_nummer?.trim())
  const ibanKlaar = !!profile?.iban?.trim()

  const stappen: Record<StapId, boolean> = {
    // Account + bedrijfsgegevens zijn in de onboarding al gedaan. Ze staan hier
    // afgevinkt zodat de gebruiker met voortgang begint, niet op nul.
    account: true,
    klanten: klantenCount > 0,
    logo: !!organisatie?.logo_url?.trim(),
    bedrijf: kvkKlaar && btwKlaar && ibanKlaar,
    email: emailSettingsCount > 0,
    project: projectenCount > 0,
    team: medewerkersCount > 1,
  }

  const klaarCount = Object.values(stappen).filter(Boolean).length
  const verplichtKlaarCount = VERPLICHTE_STAPPEN.filter(id => stappen[id]).length
  const alleVerplichtKlaar = verplichtKlaarCount === VERPLICHTE_STAPPEN.length
  // Niet automatisch verbergen bij alles-klaar: de sectie toont dan eerst een
  // afrondmoment, dat de gebruiker zelf wegklikt (dat zet de vlag pas).
  const verborgen = !!profile?.dashboard_aan_de_slag_verborgen

  const dismiss = useCallback(async () => {
    try {
      await updateUserProfile({ dashboard_aan_de_slag_verborgen: true } as Parameters<typeof updateUserProfile>[0])
    } catch (err) {
      logger.error('[AanDeSlag] dismiss faalde:', err)
    }
  }, [updateUserProfile])

  return {
    isLoading,
    stappen,
    klaarCount,
    totaal: ALLE_STAPPEN.length,
    verplichtKlaarCount,
    totaalVerplicht: VERPLICHTE_STAPPEN.length,
    alleVerplichtKlaar,
    verborgen,
    dismiss,
  }
}
