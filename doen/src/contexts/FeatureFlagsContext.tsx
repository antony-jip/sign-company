import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchQuery, getCached } from '@/lib/queryCache'
import { bepaalStand, veiligeFlags, type FeatureFlagRij, type FlagStand } from '@/lib/featureFlags'
import { haalFeatureFlags } from '@/services/featureFlagService'
import { logger } from '@/utils/logger'

// Org-brede serverwaarden worden hier op één plek geladen, net als
// app_settings in AppSettingsContext: één query bij het opstarten, daarna
// leest elke consument uit context. Wat hier bovenop komt is de queryCache,
// zodat een remount van de provider (org-wissel, hot reload) geen tweede
// request doet — de cache wordt gewist bij logout en org-wissel, zie
// lib/queryCache.ts.
//
// De sleutel bevat de organisatie omdat RLS per organisatie andere rijen
// teruggeeft; zonder dat zou de cache van organisatie A bij B belanden.
const cacheKey = (organisatieId: string | null) => `feature-flags:${organisatieId ?? 'geen'}`

interface FeatureFlagsContextType {
  // 'onbekend' is een echte stand, geen fout: de database heeft over deze
  // flag niets gezegd. Zie lib/featureFlags.ts.
  stand: (naam: string) => FlagStand
  // Nieuwe code: alleen aan bij een expliciete 'aan'.
  staatAan: (naam: string) => boolean
  // Bestaande code doven: alleen uit bij een expliciete 'uit'.
  staatUit: (naam: string) => boolean
  isLoading: boolean
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined)

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { organisatieId } = useAuth()
  const key = cacheKey(organisatieId ?? null)
  const [rijen, setRijen] = useState<FeatureFlagRij[]>(() => getCached<FeatureFlagRij[]>(key) ?? [])
  const [isLoading, setIsLoading] = useState(() => getCached(key) === undefined)

  useEffect(() => {
    let afgebroken = false
    const gecachet = getCached<FeatureFlagRij[]>(key)
    if (gecachet) {
      setRijen(gecachet)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    veiligeFlags(
      () => fetchQuery(key, haalFeatureFlags),
      (fout) => logger.error('Feature flags ophalen mislukt; alle flags blijven op onbekend', fout),
    ).then((data) => {
      if (afgebroken) return
      setRijen(data)
      setIsLoading(false)
    })
    return () => { afgebroken = true }
  }, [key])

  const value = useMemo<FeatureFlagsContextType>(() => {
    const stand = (naam: string) => bepaalStand(naam, rijen, organisatieId ?? null)
    return {
      stand,
      staatAan: (naam: string) => stand(naam) === 'aan',
      staatUit: (naam: string) => stand(naam) === 'uit',
      isLoading,
    }
  }, [rijen, organisatieId, isLoading])

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext)
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider')
  }
  return context
}

export function useFeatureAan(naam: string): boolean {
  return useFeatureFlags().staatAan(naam)
}

export function useFeatureUitgezet(naam: string): boolean {
  return useFeatureFlags().staatUit(naam)
}
