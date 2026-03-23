import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { checkEnVerstuurHerinneringen } from '@/services/portaalNotificatieService'

/**
 * Hook that checks for portaal items waiting > N days without reaction
 * and sends reminder emails. Runs once per session (on mount).
 * N = herinnering_na_dagen from portaal_instellingen (default 3, 0 = disabled)
 * Max 1 reminder per item. Only for offerte/tekening types.
 *
 * Thin wrapper around checkEnVerstuurHerinneringen() from portaalNotificatieService.
 */
export function usePortaalHerinnering() {
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current || !user?.id) return
    hasRun.current = true

    // Async, niet-blokkerend
    checkEnVerstuurHerinneringen({
      userId: user.id,
      bedrijfsNaam: profile?.bedrijfsnaam || '',
      logoUrl: profile?.logo_url || '',
    }).then(result => {
      if (result.verstuurd > 0) {
        console.log(`[portaal-herinnering] ${result.verstuurd} herinnering(en) verstuurd`)
      }
      if (result.errors.length > 0) {
        console.warn('[portaal-herinnering] fouten:', result.errors)
      }
    }).catch(err =>
      console.warn('Herinnering check mislukt:', err)
    )
  }, [user?.id, profile?.bedrijfsnaam, profile?.logo_url])
}
