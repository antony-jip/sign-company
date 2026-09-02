import { useCallback, useState } from 'react'
import { Download, FileText, ExternalLink, Loader2 } from 'lucide-react'

interface PubliekeOfferteRegel {
  id?: string
  beschrijving?: string
  aantal?: number
  eenheidsprijs?: number
  btw_percentage?: number
  korting_percentage?: number
  totaal?: number
  soort?: 'prijs' | 'tekst'
  is_optioneel?: boolean
  extra_velden?: unknown
  detail_regels?: unknown
  prijs_varianten?: unknown
  actieve_variant_id?: string
}

interface PubliekeOfferteRespons {
  offerte: {
    id?: string
    nummer?: string
    titel?: string
    status?: string
    subtotaal?: number
    btw_bedrag?: number
    totaal?: number
    aangepast_totaal?: number | null
    geldig_tot?: string
    notities?: string | null
    voorwaarden?: string | null
    intro_tekst?: string | null
    outro_tekst?: string | null
    klant_id?: string
    created_at?: string
    updated_at?: string
  }
  items?: PubliekeOfferteRegel[]
  bedrijf?: Record<string, string | null> | null
  klant?: Record<string, string | null> | null
  docStyle?: Record<string, unknown> | null
}

interface PortaalFeedItemOfferteProps {
  item: {
    id: string
    titel: string
    omschrijving?: string | null
    status: string
    bedrag?: number | null
    bedrag_excl?: number | null
    offerte_publiek_token?: string | null
    bestanden?: { url: string; bestandsnaam: string }[]
    created_at: string
  }
  token: string
  klantNaam: string
  kanGoedkeuren: boolean
  onReactie: () => void
  onVragenStellen?: () => void
}

function formatBedrag(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag)
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    verstuurd: { color: '#3A5A9A', label: 'verstuurd' },
    geaccepteerd: { color: '#3A7D52', label: 'geaccepteerd' },
    goedgekeurd: { color: '#3A7D52', label: 'geaccepteerd' },
    betaald: { color: '#3A7D52', label: 'betaald' },
  }
  const s = map[status] || map.verstuurd
  return (
    <span className="inline-flex items-baseline text-xs font-semibold flex-shrink-0" style={{ color: s.color }}>
      {s.label}<span style={{ color: '#F15025' }}>.</span>
    </span>
  )
}

export function PortaalFeedItemOfferte({
  item,
  token,
  klantNaam,
  kanGoedkeuren,
  onReactie,
  onVragenStellen,
}: PortaalFeedItemOfferteProps) {
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; tekst: string } | null>(null)
  const isAfgehandeld = ['goedgekeurd', 'geaccepteerd', 'betaald'].includes(item.status)
  const [pdfBezig, setPdfBezig] = useState(false)
  const [pdfFout, setPdfFout] = useState<string | null>(null)
  const offerteToken = item.offerte_publiek_token

  // Het portaal draait token-based zonder Supabase-sessie, dus de PDF wordt hier
  // in de browser gebouwd uit /api/offerte-publiek. Die respons is al gefilterd
  // op klantvelden, zodat calculatieregels en interne notities niet meereizen.
  const handleDownloadPDF = useCallback(async () => {
    if (!offerteToken) return
    setPdfBezig(true)
    setPdfFout(null)
    try {
      const respons = await fetch(`/api/offerte-publiek?token=${encodeURIComponent(offerteToken)}`)
      if (!respons.ok) throw new Error('Offerte ophalen mislukt')
      const data = (await respons.json()) as PubliekeOfferteRespons
      const offerte = data.offerte || {}
      const regels = data.items || []
      const bedrijf = data.bedrijf || {}
      const docStyle = data.docStyle || null

      const { generateOffertePDF } = await import('@/services/pdfService')

      const offerteData = {
        id: offerte.id || '',
        user_id: '',
        klant_id: offerte.klant_id || '',
        nummer: offerte.nummer || '',
        titel: offerte.titel || '',
        status: offerte.status || 'verzonden',
        subtotaal: offerte.subtotaal ?? 0,
        btw_bedrag: offerte.btw_bedrag ?? 0,
        totaal: offerte.aangepast_totaal ?? offerte.totaal ?? 0,
        geldig_tot: offerte.geldig_tot || '',
        notities: offerte.notities || '',
        voorwaarden: offerte.voorwaarden || '',
        intro_tekst: offerte.intro_tekst || '',
        outro_tekst: offerte.outro_tekst || '',
        versie: 1,
        created_at: offerte.created_at || new Date().toISOString(),
        updated_at: offerte.updated_at || new Date().toISOString(),
      }

      const pdfRegels = regels.map((regel, index) => ({
        id: regel.id || `item-${index}`,
        offerte_id: offerte.id || '',
        beschrijving: regel.beschrijving || '',
        aantal: regel.aantal ?? 1,
        eenheidsprijs: regel.eenheidsprijs ?? 0,
        btw_percentage: regel.btw_percentage ?? 21,
        korting_percentage: regel.korting_percentage ?? 0,
        totaal: regel.totaal ?? 0,
        volgorde: index + 1,
        soort: regel.soort,
        extra_velden: regel.extra_velden,
        detail_regels: regel.detail_regels,
        prijs_varianten: regel.prijs_varianten,
        actieve_variant_id: regel.actieve_variant_id,
        is_optioneel: regel.is_optioneel,
        created_at: new Date().toISOString(),
      }))

      const bedrijfsProfiel = {
        bedrijfsnaam: bedrijf.bedrijfsnaam || '',
        bedrijfs_adres: bedrijf.bedrijfs_adres || '',
        bedrijfs_telefoon: bedrijf.bedrijfs_telefoon || '',
        bedrijfs_email: bedrijf.bedrijfs_email || '',
        bedrijfs_website: bedrijf.bedrijfs_website || '',
        kvk_nummer: bedrijf.kvk_nummer || '',
        btw_nummer: bedrijf.btw_nummer || '',
        iban: bedrijf.iban || '',
        logo_url: bedrijf.logo_url || '',
        primaireKleur: (docStyle?.primaire_kleur as string | undefined) || '#1A535C',
      }

      const doc = await generateOffertePDF(
        offerteData as Parameters<typeof generateOffertePDF>[0],
        pdfRegels as Parameters<typeof generateOffertePDF>[1],
        (data.klant || {}) as Parameters<typeof generateOffertePDF>[2],
        bedrijfsProfiel as Parameters<typeof generateOffertePDF>[3],
        (docStyle as Parameters<typeof generateOffertePDF>[4]) || undefined,
      )

      doc.save(`Offerte-${offerte.nummer || 'download'}.pdf`)
    } catch (err) {
      console.error('Offerte PDF downloaden mislukt:', err)
      setPdfFout('PDF downloaden mislukt. Probeer het opnieuw of neem contact op.')
    } finally {
      setPdfBezig(false)
    }
  }, [offerteToken])

  async function handleAccepteren() {
    setLoading(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: item.id,
          type: 'goedkeuring',
          klant_naam: klantNaam || undefined,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Kon niet accepteren')
      }
      setConfirmOpen(false)
      setFeedback({ type: 'success', tekst: 'Uw akkoord is ontvangen. Bedankt voor uw vertrouwen.' })
      onReactie()
    } catch (err) {
      setFeedback({
        type: 'error',
        tekst: err instanceof Error ? err.message : 'Er ging iets mis. Probeer het opnieuw of neem contact op.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Card header accent */}
      <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: '#F15025' }} />
      <div
        className="rounded-b-[10px] bg-white"
        style={{ border: '0.5px solid #E8E6E1' }}
      >
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="font-semibold truncate"
                style={{ fontSize: 15, color: 'hsl(var(--foreground))' }}
              >
                {item.titel}
              </p>
              {item.omschrijving && (
                <p className="mt-0.5 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {item.omschrijving}
                </p>
              )}
            </div>
            <StatusBadge status={item.status} />
          </div>

          {(item.bedrag_excl ?? item.bedrag) != null && (
            <div className="mt-2">
              <p
                className="text-lg font-medium"
                style={{ color: 'hsl(var(--foreground))', fontFamily: "'DM Mono', monospace" }}
              >
                {formatBedrag((item.bedrag_excl ?? item.bedrag) as number)}
                <span className="ml-1.5 text-xs font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  excl. btw
                </span>
              </p>
              {item.bedrag != null && item.bedrag_excl != null && item.bedrag !== item.bedrag_excl && (
                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {formatBedrag(item.bedrag)} incl. btw
                </p>
              )}
            </div>
          )}

          {/* Offerte bekijken link */}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
            {offerteToken ? (
              <a
                href={`/offerte-bekijken/${offerteToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm hover:opacity-70 transition-opacity"
                style={{ color: '#1A535C' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Offerte bekijken
              </a>
            ) : item.bestanden && item.bestanden.length > 0 ? (
              <a
                href={item.bestanden[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm hover:opacity-70 transition-opacity"
                style={{ color: '#1A535C' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Offerte bekijken
              </a>
            ) : null}

            {offerteToken && (
              <button
                onClick={handleDownloadPDF}
                disabled={pdfBezig}
                className="inline-flex items-center gap-1.5 mt-2 text-sm hover:opacity-70 transition-opacity disabled:opacity-50"
                style={{ color: '#1A535C' }}
              >
                {pdfBezig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                PDF downloaden
              </button>
            )}
          </div>

          {pdfFout && (
            <p className="mt-2 text-sm font-medium" style={{ color: '#C0451A' }}>
              {pdfFout}
            </p>
          )}

          {/* Bestanden */}
          {item.bestanden && item.bestanden.length > 0 && (
            <div className="mt-3 space-y-1">
              {item.bestanden.map((b, i) => (
                <a
                  key={i}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-1 text-sm hover:opacity-70 transition-opacity"
                  style={{ color: '#1A535C' }}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{b.bestandsnaam}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {feedback && (
          <p
            className="px-5 pb-3 text-sm font-medium"
            style={{ color: feedback.type === 'success' ? '#3A7D52' : '#C0451A' }}
          >
            {feedback.tekst}
          </p>
        )}

        {/* Actions */}
        {!isAfgehandeld && kanGoedkeuren && (
          <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: '#F0EEEA' }}>
            {confirmOpen ? (
              <div className="flex items-center gap-2 w-full">
                <p className="text-sm flex-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Weet u zeker dat u deze offerte wilt accepteren?
                </p>
                <button
                  onClick={handleAccepteren}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#1A535C' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Ja, accepteren
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg text-sm transition-colors hover:bg-background"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  Annuleren
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#1A535C' }}
                >
                  Accepteren
                </button>
                {onVragenStellen && (
                  <button
                    onClick={onVragenStellen}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted"
                    style={{ backgroundColor: 'hsl(var(--background))', border: '0.5px solid #E8E6E1', color: 'hsl(var(--muted-foreground))' }}
                  >
                    Vragen stellen
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
