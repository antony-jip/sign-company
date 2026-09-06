import { useCallback, useState } from 'react'

/**
 * Voorkeuren van de mailmodule in localStorage (`doen_mail_<naam>`, per
 * gebruiker, zie CONTRACT.md sectie 7). Lezen en schrijven zijn beschermd:
 * een private tab of geblokkeerde storage mag de module nooit laten vallen.
 */
export const VOORKEUR = {
  dichtheid: 'doen_mail_dichtheid',
  railLabels: 'doen_mail_rail_labels',
  swipeLinks: 'doen_mail_swipe_links',
  klantkaart: 'doen_mail_klantkaart',
  paneelBreedte: 'doen_mail_paneel_breedte',
  focusModus: 'doen_email_focus_modus',
} as const

export type Dichtheid = 'comfortabel' | 'compact'
export type SwipeLinks = 'archiveren' | 'verwijderen'

export function leesVoorkeur(sleutel: string): string | null {
  try { return localStorage.getItem(sleutel) } catch { return null }
}

export function schrijfVoorkeur(sleutel: string, waarde: string): void {
  try { localStorage.setItem(sleutel, waarde) } catch { /* storage geblokkeerd */ }
}

export function useVoorkeur<T extends string>(sleutel: string, standaard: T, geldig: readonly T[]): [T, (v: T) => void] {
  const [waarde, zetWaarde] = useState<T>(() => {
    const bewaard = leesVoorkeur(sleutel)
    return bewaard && (geldig as readonly string[]).includes(bewaard) ? (bewaard as T) : standaard
  })
  const zet = useCallback((v: T) => {
    zetWaarde(v)
    schrijfVoorkeur(sleutel, v)
  }, [sleutel])
  return [waarde, zet]
}

export function useBoolVoorkeur(sleutel: string, standaard: boolean): [boolean, (v: boolean) => void] {
  const [waarde, zetWaarde] = useState<boolean>(() => {
    const bewaard = leesVoorkeur(sleutel)
    if (bewaard === 'true' || bewaard === 'aan') return true
    if (bewaard === 'false' || bewaard === 'uit') return false
    return standaard
  })
  const zet = useCallback((v: boolean) => {
    zetWaarde(v)
    schrijfVoorkeur(sleutel, v ? 'aan' : 'uit')
  }, [sleutel])
  return [waarde, zet]
}

export function useGetalVoorkeur(sleutel: string, standaard: number, min: number, max: number): [number, (v: number) => void] {
  const [waarde, zetWaarde] = useState<number>(() => {
    const n = parseInt(leesVoorkeur(sleutel) || '', 10)
    return Number.isFinite(n) && n >= min && n <= max ? n : standaard
  })
  const zet = useCallback((v: number) => {
    const begrensd = Math.max(min, Math.min(max, v))
    zetWaarde(begrensd)
    schrijfVoorkeur(sleutel, String(begrensd))
  }, [sleutel, min, max])
  return [waarde, zet]
}
