import { useEffect, useMemo, useState } from 'react'
import type { EmailLijstItem } from '@/lib/mail/types'
import { getKlantenGedeeld, getLeveranciersGedeeld } from '../EmailActionsPopover'
import { extractSenderEmail, GENERIEKE_MAILDOMEINEN } from '../emailHelpers'
import type { SplitTab } from './mapConfig'
import type { KoppelingChipInfo } from './koppelingChips'

/**
 * Split-inbox (schakelaar `mail_split_inbox`): Aanvragen, Klanten,
 * Leveranciers, Overig. Klant = afzender bekend bij een klant of een
 * koppeling aan klant/project/offerte; leverancier = afzender komt voor in de
 * leveranciers-tabel. Adressen en domeinen laden we één keer.
 */
export interface AdresIndex {
  adressen: Set<string>
  domeinen: Set<string>
}

function bouwIndex(paren: Array<{ email?: string | null; website?: string | null }>): AdresIndex {
  const adressen = new Set<string>()
  const domeinen = new Set<string>()
  for (const p of paren) {
    const adres = (p.email || '').trim().toLowerCase()
    if (adres.includes('@')) {
      adressen.add(adres)
      const domein = adres.split('@')[1]
      if (domein && !GENERIEKE_MAILDOMEINEN.includes(domein)) domeinen.add(domein)
    }
    const site = (p.website || '').toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '')
    if (site && site.includes('.')) domeinen.add(site)
  }
  return { adressen, domeinen }
}

export function hoortBij(index: AdresIndex, afzender: string): boolean {
  const adres = extractSenderEmail(afzender).trim().toLowerCase()
  if (!adres.includes('@')) return false
  if (index.adressen.has(adres)) return true
  const domein = adres.split('@')[1]
  return !!domein && index.domeinen.has(domein)
}

export function classificeer(
  item: EmailLijstItem,
  klanten: AdresIndex,
  leveranciers: AdresIndex,
  chip: KoppelingChipInfo | null | undefined,
): SplitTab {
  if (item.is_aanvraag && !item.aanvraag_verborgen) return 'aanvragen'
  if (chip && (chip.soort === 'klant' || chip.soort === 'project' || chip.soort === 'offerte')) return 'klanten'
  if (hoortBij(klanten, item.van)) return 'klanten'
  if (hoortBij(leveranciers, item.van)) return 'leveranciers'
  return 'overig'
}

const LEEG: AdresIndex = { adressen: new Set(), domeinen: new Set() }

export function useAdresIndexen(actief: boolean): { klanten: AdresIndex; leveranciers: AdresIndex; geladen: boolean } {
  const [klanten, zetKlanten] = useState<AdresIndex>(LEEG)
  const [leveranciers, zetLeveranciers] = useState<AdresIndex>(LEEG)
  const [geladen, zetGeladen] = useState(false)
  useEffect(() => {
    if (!actief) return
    let actueel = true
    Promise.all([getKlantenGedeeld(), getLeveranciersGedeeld()]).then(([k, l]) => {
      if (!actueel) return
      const klantParen: Array<{ email?: string | null; website?: string | null }> = []
      for (const klant of k) {
        klantParen.push({ email: klant.email, website: klant.website })
        for (const c of klant.contactpersonen || []) klantParen.push({ email: c.email })
      }
      zetKlanten(bouwIndex(klantParen))
      zetLeveranciers(bouwIndex(l.map((x) => ({ email: x.email, website: x.website }))))
      zetGeladen(true)
    }).catch(() => { if (actueel) zetGeladen(true) })
    return () => { actueel = false }
  }, [actief])
  return useMemo(() => ({ klanten, leveranciers, geladen }), [klanten, leveranciers, geladen])
}
