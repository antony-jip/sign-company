import { useCallback, useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Kaart, StatusWoord, STATUS_KLEUR, invoerVeld, knopPrimair, tekstLink } from '@/components/klantpagina/Klantstijl'

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
  bijlage_url?: string | null
  bijlage_type?: string | null
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
    type?: string
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

function StatusBadge({ status, isOpdrachtbevestiging }: { status: string; isOpdrachtbevestiging: boolean }) {
  if (status === 'betaald') return <StatusWoord kleur={STATUS_KLEUR.goed}>Betaald</StatusWoord>
  if (status === 'geaccepteerd' || status === 'goedgekeurd') {
    return <StatusWoord kleur={STATUS_KLEUR.goed}>{isOpdrachtbevestiging ? 'Bevestigd' : 'Geaccepteerd'}</StatusWoord>
  }
  return <StatusWoord kleur={STATUS_KLEUR.open}>{isOpdrachtbevestiging ? 'Ter bevestiging' : 'Ter beoordeling'}</StatusWoord>
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
  const [naam, setNaam] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; tekst: string } | null>(null)
  const isAfgehandeld = ['goedgekeurd', 'geaccepteerd', 'betaald'].includes(item.status)
  const isOpdrachtbevestiging = item.type === 'opdrachtbevestiging'
  const [pdfBezig, setPdfBezig] = useState(false)
  const [pdfFout, setPdfFout] = useState<string | null>(null)
  const offerteToken = item.offerte_publiek_token

  // Een offerte met eigen pagina krijgt dáár akkoord: met de keuzes uit de
  // opties, naam en handtekening. Zelfde tabblad, zodat "Terug naar portaal"
  // op die pagina werkt. Een opdrachtbevestiging of een los geüploade offerte
  // heeft geen akkoordpagina en wordt hieronder in het portaal bevestigd.
  const offertePaginaUrl = offerteToken
    ? `/offerte-bekijken/${offerteToken}?terug=${encodeURIComponent(`/portaal/${token}`)}`
    : null
  const akkoordOpOffertepagina = !!offertePaginaUrl && !isOpdrachtbevestiging
  const toonAkkoordKnop = !isAfgehandeld && kanGoedkeuren

  // De portaalnaam komt uit localStorage en kan een halve invoer zijn ("J"):
  // de naambalk in het portaal verdwijnt na de eerste letter. Dan vragen we
  // hier alsnog een volledige naam, anders blijft de knop voorgoed uit.
  const portaalNaamBruikbaar = klantNaam.trim().length >= 2
  const naamVoorAkkoord = (portaalNaamBruikbaar ? klantNaam : naam).trim()

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
        bijlage_url: regel.bijlage_url || undefined,
        bijlage_type: regel.bijlage_type || undefined,
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
    if (naamVoorAkkoord.length < 2) return
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
          klant_naam: naamVoorAkkoord,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Akkoord geven lukte niet')
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

  const vragenKnop = onVragenStellen && (
    <button type="button" onClick={onVragenStellen} className={tekstLink}>
      Vragen stellen
    </button>
  )

  const pdfKnop = offerteToken && (
    <button type="button" onClick={handleDownloadPDF} disabled={pdfBezig} className={tekstLink}>
      {pdfBezig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      PDF downloaden
    </button>
  )

  // Staat de akkoordknop er, dan opent die al de offerte; een tweede link
  // ernaast zou hetzelfde doen.
  const bekijkLink = offertePaginaUrl && !(akkoordOpOffertepagina && toonAkkoordKnop) ? (
    <a href={offertePaginaUrl} className={tekstLink}>
      <FileText className="h-4 w-4" />
      Offerte bekijken
    </a>
  ) : !offertePaginaUrl && item.bestanden && item.bestanden.length > 0 ? (
    <a href={item.bestanden[0].url} target="_blank" rel="noopener noreferrer" className={tekstLink}>
      <FileText className="h-4 w-4" />
      Offerte bekijken
    </a>
  ) : null

  let acties: React.ReactNode
  if (toonAkkoordKnop && akkoordOpOffertepagina) {
    acties = (
      <>
        <a href={offertePaginaUrl!} className={knopPrimair}>
          Bekijken en akkoord geven
        </a>
        {pdfKnop}
        {vragenKnop}
      </>
    )
  } else if (toonAkkoordKnop && confirmOpen) {
    acties = (
      <div className="w-full space-y-3">
        <p className="text-sm text-[#1A1A1A]">
          {isOpdrachtbevestiging ? 'Opdracht bevestigen?' : `Akkoord geven op ${item.titel}?`}
        </p>
        {!portaalNaamBruikbaar && (
          <input
            type="text"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Voor- en achternaam"
            aria-label="Uw naam"
            autoComplete="name"
            autoFocus
            className={`${invoerVeld} max-w-xs`}
          />
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="button"
            onClick={handleAccepteren}
            disabled={loading || naamVoorAkkoord.length < 2}
            className={knopPrimair}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isOpdrachtbevestiging ? 'Ja, bevestigen' : 'Ja, akkoord geven'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            disabled={loading}
            className="text-sm font-medium text-[#6B6B66] transition-colors hover:text-[#1A1A1A] disabled:opacity-50"
          >
            Annuleren
          </button>
        </div>
      </div>
    )
  } else if (toonAkkoordKnop) {
    acties = (
      <>
        <button type="button" onClick={() => setConfirmOpen(true)} className={knopPrimair}>
          {isOpdrachtbevestiging ? 'Opdracht bevestigen' : 'Akkoord geven'}
        </button>
        {bekijkLink}
        {pdfKnop}
        {vragenKnop}
      </>
    )
  } else if (bekijkLink || pdfKnop || vragenKnop) {
    acties = (
      <>
        {bekijkLink}
        {pdfKnop}
        {vragenKnop}
      </>
    )
  }

  return (
    <Kaart
      etiket={isOpdrachtbevestiging ? 'Opdrachtbevestiging' : 'Offerte'}
      status={<StatusBadge status={item.status} isOpdrachtbevestiging={isOpdrachtbevestiging} />}
      acties={acties}
    >
      <h3 className="break-words text-[17px] font-semibold leading-snug tracking-[-0.2px] text-[#1A1A1A]">
        {item.omschrijving || item.titel}
      </h3>
      {item.omschrijving && (
        <p className="mt-0.5 font-mono text-xs text-[#9B9B95]">{item.titel}</p>
      )}

      {(item.bedrag_excl ?? item.bedrag) != null && (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <p className="font-mono text-xl font-semibold text-[#1A1A1A]">
            {formatBedrag((item.bedrag_excl ?? item.bedrag) as number)}
          </p>
          <p className="text-xs text-[#9B9B95]">
            excl. btw
            {item.bedrag != null && item.bedrag_excl != null && item.bedrag !== item.bedrag_excl
              ? ` · ${formatBedrag(item.bedrag)} incl. btw`
              : ''}
          </p>
        </div>
      )}

      {pdfFout && <p className="mt-3 text-sm font-medium text-[#C0451A]">{pdfFout}</p>}

      {item.bestanden && item.bestanden.length > 0 && (
        <ul className="mt-3 space-y-1">
          {item.bestanden.map((b, i) => (
            <li key={i}>
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1 text-sm text-[#1A535C] underline-offset-4 hover:underline"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{b.bestandsnaam}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {feedback && (
        <p className={`mt-3 text-sm font-medium ${feedback.type === 'success' ? 'text-[#3A7D52]' : 'text-[#C0451A]'}`}>
          {feedback.tekst}
        </p>
      )}
    </Kaart>
  )
}
