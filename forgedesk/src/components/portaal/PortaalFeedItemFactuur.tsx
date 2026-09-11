import { useState, useCallback } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Kaart, StatusWoord, STATUS_KLEUR, knopPrimair, tekstLink } from '@/components/klantpagina/Klantstijl'

interface PortaalFeedItemFactuurProps {
  item: {
    id: string
    titel: string
    omschrijving?: string | null
    status: string
    bedrag?: number | null
    mollie_payment_url?: string | null
    factuur_id?: string | null
    created_at: string
  }
  token?: string
  onVragenStellen?: () => void
}

function formatBedrag(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag)
}

export function PortaalFeedItemFactuur({
  item,
  token,
  onVragenStellen,
}: PortaalFeedItemFactuurProps) {
  const isBetaald = ['betaald', 'goedgekeurd'].includes(item.status)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Klantportaal draait token-based (geen Supabase auth), dus de RLS-policy
  // op storage.buckets.facturen blokkeert directe downloads. Bewust on-the-fly
  // gegenereerd via /api/factuur-portaal · zelfde flow voor oude en nieuwe
  // facturen, geen Storage-fallback nodig hier.
  const handleDownloadPDF = useCallback(async () => {
    const factuurId = item.factuur_id
    if (!factuurId || !token) return
    setIsDownloading(true)
    setDownloadError(null)
    try {
      const resp = await fetch(`/api/factuur-portaal?token=${encodeURIComponent(token)}&factuur_id=${encodeURIComponent(factuurId)}`)
      if (!resp.ok) throw new Error('Factuur ophalen mislukt')
      const data = await resp.json()

      const { generateFactuurPDF } = await import('@/services/pdfService')

      const factuurData = {
        nummer: data.factuur.nummer || '',
        titel: data.factuur.titel || '',
        datum: data.factuur.factuurdatum || data.factuur.created_at || '',
        vervaldatum: data.factuur.vervaldatum || '',
        subtotaal: data.factuur.subtotaal || 0,
        btw_bedrag: data.factuur.btw_bedrag || 0,
        totaal: data.factuur.totaal || 0,
        notities: data.factuur.notities,
        betaalvoorwaarden: data.factuur.betaalvoorwaarden || data.factuur.voorwaarden,
        factuur_type: data.factuur.factuur_type,
        betaal_link: data.factuur.betaal_link || item.mollie_payment_url,
        factuur_bedrijfsnaam: data.factuur.factuur_bedrijfsnaam,
        factuur_tav: data.factuur.factuur_tav,
        factuur_adres: data.factuur.factuur_adres,
        factuur_postcode: data.factuur.factuur_postcode,
        factuur_plaats: data.factuur.factuur_plaats,
      }

      const pdfItems = (data.items || []).map((it: Record<string, unknown>, i: number) => ({
        id: (it.id as string) || `item-${i}`,
        offerte_id: '',
        beschrijving: (it.beschrijving as string) || '',
        aantal: (it.aantal as number) || 1,
        eenheidsprijs: (it.eenheidsprijs as number) || 0,
        btw_percentage: (it.btw_percentage as number) || 21,
        korting_percentage: (it.korting_percentage as number) || 0,
        totaal: (it.totaal as number) || 0,
        volgorde: i + 1,
        created_at: new Date().toISOString(),
      }))

      const bedrijfsProfiel = {
        bedrijfsnaam: data.bedrijf?.bedrijfsnaam || '',
        logo_url: data.bedrijf?.logo_url || '',
        primaireKleur: data.docStyle?.primaire_kleur || '#1A535C',
        iban: data.bedrijf?.iban || '',
      }

      const doc = generateFactuurPDF(
        factuurData,
        pdfItems,
        data.klant || {},
        bedrijfsProfiel as Parameters<typeof generateFactuurPDF>[3],
        data.docStyle || undefined,
      )

      doc.save(`Factuur-${data.factuur.nummer || 'download'}.pdf`)
    } catch (err) {
      console.error('Factuur PDF downloaden mislukt:', err)
      setDownloadError('PDF downloaden mislukt. Probeer het opnieuw of neem contact op.')
    } finally {
      setIsDownloading(false)
    }
  }, [item.factuur_id, item.mollie_payment_url, token])

  const kanBetalen = !isBetaald && !!item.mollie_payment_url
  const kanDownloaden = !!item.factuur_id && !!token
  const heeftActies = kanBetalen || kanDownloaden || !!onVragenStellen

  return (
    <Kaart
      etiket="Factuur"
      status={isBetaald
        ? <StatusWoord kleur={STATUS_KLEUR.goed}>Betaald</StatusWoord>
        : <StatusWoord kleur={STATUS_KLEUR.aandacht}>Te betalen</StatusWoord>}
      acties={heeftActies ? (
        <>
          {kanBetalen && (
            <a href={item.mollie_payment_url!} className={knopPrimair}>
              Betalen
            </a>
          )}
          {kanDownloaden && (
            <button type="button" onClick={handleDownloadPDF} disabled={isDownloading} className={tekstLink}>
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF downloaden
            </button>
          )}
          {onVragenStellen && (
            <button type="button" onClick={onVragenStellen} className={tekstLink}>
              Vragen stellen
            </button>
          )}
        </>
      ) : undefined}
    >
      <h3 className="break-words text-[17px] font-semibold leading-snug tracking-[-0.2px] text-[#1A1A1A]">
        {item.titel}
      </h3>
      {item.omschrijving && (
        <p className="mt-0.5 text-sm text-[#6B6B66]">{item.omschrijving}</p>
      )}
      {item.bedrag != null && (
        <p className="mt-3 font-mono text-xl font-semibold text-[#1A1A1A]">{formatBedrag(item.bedrag)}</p>
      )}
      {downloadError && (
        <p className="mt-3 text-sm font-medium text-[#C0451A]">{downloadError}</p>
      )}
    </Kaart>
  )
}
