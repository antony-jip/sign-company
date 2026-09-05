import { useAppSettings } from '@/contexts/AppSettingsContext'
import { functieAan, functieGetal } from '@/lib/functies'

/** Staat een functie-schakelaar aan voor deze organisatie? Zie src/lib/functies.ts. */
export function useFunctie(sleutel: string): boolean {
  const { settings } = useAppSettings()
  return functieAan(settings.functies, sleutel)
}

export function useFunctieGetal(sleutel: string): number {
  const { settings } = useAppSettings()
  return functieGetal(settings.functies, sleutel)
}
