import { useState, useCallback } from 'react'
import { Download, Loader2 } from 'lucide-react'

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
  onVragenStellen: () => void
}

function formatBedrag(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag)
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    verstuurd: { bg: '#FDE8E4', color: '#C44830', label: 'te betalen.' },
    betaald: { bg: '#E8F2EC', color: '#2D6B48', label: 'betaald.' },
    goedgekeurd: { bg: '#E8F2EC', color: '#2D6B48', label: 'betaald.' },
  }
  const s = map[status] || map.verstuurd
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <span style={{ color: '#F15025', fontSize: 8 }}>●</span>
      {s.label}
    </span>
  )
}

export function PortaalFeedItemFactuur({
  item,
  token,
  onVragenStellen,
}: PortaalFeedItemFactuurProps) {
  const isBetaald = ['betaald', 'goedgekeurd'].includes(item.status)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadPDF = useCallback(async () => {
    const factuurId = item.factuur_id
    if (!factuurId || !token) return
    setIsDownloading(true)
    try {
      // Haal factuur data op via het portaal endpoint
      const resp = await fetch(`/api/factuur-portaal?token=${encodeURIComponent(token)}&factuur_id=${encodeURIComponent(factuurId)}`)
      if (!resp.ok) throw new Error('Factuur ophalen mislukt')
      const data = await resp.json()

      // Genereer PDF in huisstijl
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
      alert('PDF downloaden mislukt. Probeer het opnieuw.')
    } finally {
      setIsDownloading(false)
    }
  }, [item.factuur_id, item.mollie_payment_url, token])

  return (
    <div>
      <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: '#2D6B48' }} />
      <div
        className="rounded-b-[10px] bg-white"
        style={{ border: '0.5px solid #E8E6E1' }}
      >
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <p
              className="font-semibold"
              style={{ fontSize: 15, color: '#191919' }}
            >
              {item.titel}
            </p>
            <StatusBadge status={item.status} />
          </div>

          {item.bedrag != null && (
            <p
              className="mt-2 text-lg font-medium"
              style={{ color: '#191919', fontFamily: "'DM Mono', monospace" }}
            >
              {formatBedrag(item.bedrag)}
            </p>
          )}

          {item.omschrijving && (
            <p className="mt-1 text-sm" style={{ color: '#5A5A55' }}>
              {item.omschrijving}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: '#F0EEEA' }}>
          {!isBetaald && item.mollie_payment_url && (
            <a
              href={item.mollie_payment_url}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#1A535C' }}
            >
              <span style={{ color: '#F15025', marginRight: 4 }}>Betalen</span>
            </a>
          )}
          {item.factuur_id && token && (
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F4F2EE] disabled:opacity-50"
              style={{ backgroundColor: '#FAF9F7', border: '0.5px solid #E8E6E1', color: '#5A5A55' }}
            >
              {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              PDF
            </button>
          )}
          <button
            onClick={onVragenStellen}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F4F2EE]"
            style={{ backgroundColor: '#FAF9F7', border: '0.5px solid #E8E6E1', color: '#5A5A55' }}
          >
            Vragen stellen
          </button>
        </div>
      </div>
    </div>
  )
}
