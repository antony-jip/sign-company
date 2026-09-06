import type { Klant, Offerte } from '@/types'

interface PoortOpties {
  checkVerplicht: boolean
  drempel: number
}

/**
 * Eén poort voor "mag deze offerte de deur uit": PO-nummer verplicht per klant
 * en de collega-check boven een drempelbedrag. Gebruikt door de editor, de
 * pipeline (slepen, status-select) en de preview (markeer als verzonden),
 * zodat geen enkele weg de controle omzeilt. Geeft de melding terug, of null.
 */
export function verzendBlokkade(
  offerte: Pick<Offerte, 'subtotaal' | 'klant_referentie' | 'check_status'>,
  klant: Pick<Klant, 'po_verplicht'> | null | undefined,
  opties: PoortOpties,
): string | null {
  if (klant?.po_verplicht && !(offerte.klant_referentie ?? '').trim()) {
    return 'Deze klant wil altijd een referentie op de offerte'
  }
  const status = offerte.check_status
  if (opties.checkVerplicht && (offerte.subtotaal ?? 0) > opties.drempel && status !== 'akkoord' && status !== 'verstuurd') {
    const bedrag = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(opties.drempel)
    return `Boven ${bedrag} gaat een offerte pas de deur uit na een collega-check`
  }
  return null
}
