import { useState } from 'react'
import { FileText, Download, Loader2, Eye } from 'lucide-react'
import { Kaart, StatusWoord, STATUS_KLEUR, invoerVeld, knopPetrol, knopPrimair, tekstLink } from '@/components/klantpagina/Klantstijl'

interface PortaalFeedItemTekeningProps {
  item: {
    id: string
    titel: string
    omschrijving?: string | null
    label?: string | null
    status: string
    bestanden?: { id: string; url: string; bestandsnaam: string; mime_type?: string | null; grootte?: number | null; thumbnail_url?: string | null }[]
    created_at: string
  }
  token: string
  klantNaam: string
  kanGoedkeuren: boolean
  onReactie: () => void
  onVragenStellen?: () => void
  onImageClick?: (url: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'goedgekeurd') return <StatusWoord kleur={STATUS_KLEUR.goed}>Goedgekeurd</StatusWoord>
  if (status === 'revisie') return <StatusWoord kleur={STATUS_KLEUR.wacht}>Revisie gevraagd</StatusWoord>
  return <StatusWoord kleur={STATUS_KLEUR.open}>Ter goedkeuring</StatusWoord>
}

export function PortaalFeedItemTekening({
  item,
  token,
  klantNaam,
  kanGoedkeuren,
  onReactie,
  onVragenStellen,
  onImageClick,
}: PortaalFeedItemTekeningProps) {
  const [loading, setLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'goedkeuren' | 'revisie' | null>(null)
  const [revisieTekst, setRevisieTekst] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; tekst: string } | null>(null)
  const isAfgehandeld = ['goedgekeurd', 'revisie'].includes(item.status)
  const images = (item.bestanden || []).filter(b => b.mime_type?.startsWith('image/'))
  const pdfFiles = (item.bestanden || []).filter(b => b.mime_type === 'application/pdf' || b.bestandsnaam?.toLowerCase().endsWith('.pdf'))
  const otherFiles = (item.bestanden || []).filter(b => !b.mime_type?.startsWith('image/') && b.mime_type !== 'application/pdf' && !b.bestandsnaam?.toLowerCase().endsWith('.pdf'))

  async function handleAction(type: 'goedkeuring' | 'revisie') {
    setLoading(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: item.id,
          type,
          klant_naam: klantNaam || undefined,
          // De server weigert een revisie zonder toelichting. Voorheen stuurde
          // deze knop er geen mee, dus "Ja, revisie" gaf altijd een foutmelding.
          bericht: type === 'revisie' ? revisieTekst.trim() : undefined,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Actie mislukt')
      }
      setConfirmAction(null)
      setRevisieTekst('')
      setFeedback({
        type: 'success',
        tekst: type === 'goedkeuring' ? 'Uw goedkeuring is ontvangen.' : 'Uw revisieverzoek is verstuurd.',
      })
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

  const annuleren = (
    <button
      type="button"
      onClick={() => setConfirmAction(null)}
      disabled={loading}
      className="text-sm font-medium text-[#6B6B66] transition-colors hover:text-[#1A1A1A] disabled:opacity-50"
    >
      Annuleren
    </button>
  )

  const vragenKnop = onVragenStellen && (
    <button type="button" onClick={onVragenStellen} className={tekstLink}>
      Vragen stellen
    </button>
  )

  let acties: React.ReactNode = vragenKnop || undefined
  if (!isAfgehandeld && kanGoedkeuren) {
    if (confirmAction === 'goedkeuren') {
      acties = (
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-3">
          <p className="w-full text-sm text-[#1A1A1A] sm:w-auto sm:flex-1">Tekening goedkeuren?</p>
          <button type="button" onClick={() => handleAction('goedkeuring')} disabled={loading} className={knopPrimair}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Ja, goedkeuren
          </button>
          {annuleren}
        </div>
      )
    } else if (confirmAction === 'revisie') {
      acties = (
        <div className="w-full space-y-3">
          <label htmlFor={`revisie-${item.id}`} className="block text-sm font-medium text-[#1A1A1A]">
            Wat moet er anders?
          </label>
          <textarea
            id={`revisie-${item.id}`}
            value={revisieTekst}
            onChange={(e) => setRevisieTekst(e.target.value)}
            placeholder="Bijvoorbeeld: de letters mogen 10 cm hoger"
            rows={3}
            className={`${invoerVeld} resize-none`}
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <button
              type="button"
              onClick={() => handleAction('revisie')}
              disabled={loading || !revisieTekst.trim()}
              className={knopPetrol}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Revisie versturen
            </button>
            {annuleren}
          </div>
        </div>
      )
    } else {
      acties = (
        <>
          <button type="button" onClick={() => setConfirmAction('goedkeuren')} className={knopPrimair}>
            Goedkeuren
          </button>
          <button type="button" onClick={() => setConfirmAction('revisie')} className={tekstLink}>
            Revisie aanvragen
          </button>
          {vragenKnop}
        </>
      )
    }
  }

  return (
    <Kaart etiket="Tekening" status={<StatusBadge status={item.status} />} acties={acties}>
      <h3 className="break-words text-[17px] font-semibold leading-snug tracking-[-0.2px] text-[#1A1A1A]">
        {item.titel}
      </h3>
      {item.label && <p className="mt-0.5 font-mono text-xs text-[#9B9B95]">{item.label}</p>}
      {item.omschrijving && <p className="mt-1 text-sm text-[#6B6B66]">{item.omschrijving}</p>}

      {images.length === 1 && (
        <button
          type="button"
          onClick={() => onImageClick?.(images[0].url)}
          aria-label={`${images[0].bestandsnaam} groter bekijken`}
          className="mt-4 block w-full overflow-hidden rounded-lg bg-[#F8F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]"
        >
          <img
            src={images[0].thumbnail_url || images[0].url}
            alt={images[0].bestandsnaam}
            loading="lazy"
            className="mx-auto max-h-[380px] w-full object-contain transition-opacity hover:opacity-90"
          />
        </button>
      )}
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onImageClick?.(img.url)}
              aria-label={`${img.bestandsnaam} groter bekijken`}
              className="overflow-hidden rounded-lg bg-[#F8F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]"
            >
              <img
                src={img.thumbnail_url || img.url}
                alt={img.bestandsnaam}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-opacity hover:opacity-90"
              />
            </button>
          ))}
        </div>
      )}

      {pdfFiles.length > 0 && (
        <ul className="mt-4 space-y-2">
          {pdfFiles.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg bg-[#F8F7F5] px-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-[#C0451A]" />
              <span className="min-w-0 flex-1 truncate text-sm text-[#1A1A1A]">{f.bestandsnaam}</span>
              {f.grootte != null && (
                <span className="hidden font-mono text-[11px] text-[#9B9B95] sm:inline">{formatFileSize(f.grootte)}</span>
              )}
              <a href={f.url} target="_blank" rel="noopener noreferrer" className={tekstLink}>
                <Eye className="h-3.5 w-3.5" />
                Bekijken
              </a>
              <a
                href={f.url}
                download={f.bestandsnaam}
                aria-label={`${f.bestandsnaam} downloaden`}
                className="rounded p-1 text-[#9B9B95] transition-colors hover:text-[#1A535C]"
              >
                <Download className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {otherFiles.length > 0 && (
        <ul className="mt-3 space-y-1">
          {otherFiles.map((f) => (
            <li key={f.id}>
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1.5 text-sm text-[#1A535C] underline-offset-4 hover:underline"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{f.bestandsnaam}</span>
                {f.grootte != null && (
                  <span className="font-mono text-[11px] text-[#9B9B95]">{formatFileSize(f.grootte)}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}

      {feedback && (
        <p className={`mt-4 text-sm font-medium ${feedback.type === 'success' ? 'text-[#3A7D52]' : 'text-[#C0451A]'}`}>
          {feedback.tekst}
        </p>
      )}
    </Kaart>
  )
}
