import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, CalendarClock, X, AlertCircle, Check, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { cancelIngeplandBericht } from '@/services/emailService'
import type { IngeplandBericht } from '@/types'
import type { ComposerDocument } from '@/lib/mail/types'
import { logger } from '@/utils/logger'
import { cn } from '@/lib/utils'
import { documentVoorNieuw, parseOntvangers } from './composer'
import { platteTekstNaarHtml, lijktOpHtml } from './emailHelpers'
import { getIngeplandRijen } from './shell/outboxService'

function formatScheduledAt(iso: string): string {
  const d = new Date(iso)
  const nu = new Date()
  const morgen = new Date(nu)
  morgen.setDate(morgen.getDate() + 1)
  const tijd = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === nu.toDateString()) return `Vandaag ${tijd}`
  if (d.toDateString() === morgen.toDateString()) return `Morgen ${tijd}`
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + tijd
}

const STATUS_LABEL: Record<string, string> = {
  wachtend: 'Wachtend',
  verwerken: 'Bezig met versturen',
  verzenden: 'Bezig met versturen',
  verzonden: 'Verzonden',
  geannuleerd: 'Geannuleerd',
  mislukt: 'Mislukt',
}

/** Een ingepland bericht terug in de composer: annuleren en opnieuw plannen bij verzenden. */
export function documentUitIngepland(b: IngeplandBericht): ComposerDocument {
  const html = b.html || (b.body ? (lijktOpHtml(b.body) ? b.body : platteTekstNaarHtml(b.body)) : '')
  return documentVoorNieuw({
    aan: parseOntvangers(b.ontvanger || ''),
    cc: parseOntvangers(b.cc || ''),
    onderwerp: b.onderwerp || '',
    html,
    handtekening: false,
    verzendOp: b.scheduled_at,
    bijlagen: [],
  })
}

interface Props {
  onBewerk: (document: ComposerDocument, bericht: IngeplandBericht) => void
}

/**
 * Nieuwste boven. Standaard alleen wat nog wacht of onderweg is; mislukt en
 * afgehandeld achter "Toon alles". Geen poll: verversen bij focus en na een
 * actie.
 */
export function IngeplandeBerichtenLijst({ onBewerk }: Props) {
  const [berichten, zetBerichten] = useState<IngeplandBericht[]>([])
  const [laden, zetLaden] = useState(true)
  const [annulerenId, zetAnnulerenId] = useState<string | null>(null)
  const [toonAlles, zetToonAlles] = useState(false)

  const laad = useCallback(async (stil = false) => {
    if (!stil) zetLaden(true)
    try {
      zetBerichten(await getIngeplandRijen())
    } catch (err) {
      logger.error('Ingeplande berichten ophalen mislukt:', err)
      if (!stil) toast.error('Kon ingeplande berichten niet laden')
    } finally {
      if (!stil) zetLaden(false)
    }
  }, [])

  useEffect(() => {
    void laad()
    const onFocus = () => { if (document.visibilityState === 'visible') void laad(true) }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [laad])

  const zichtbaar = useMemo(() => {
    const open = berichten.filter((b) => b.status === 'wachtend' || b.status === 'verwerken' || (b.status as string) === 'verzenden')
    return toonAlles ? berichten : open
  }, [berichten, toonAlles])
  const verborgen = berichten.length - zichtbaar.length

  const annuleer = useCallback(async (id: string) => {
    zetAnnulerenId(id)
    try {
      await cancelIngeplandBericht(id)
      zetBerichten((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'geannuleerd' } : b)))
      toast.success('Ingepland bericht geannuleerd')
    } catch (err) {
      logger.error('Annuleren mislukt:', err)
      toast.error('Annuleren mislukt')
    } finally {
      zetAnnulerenId(null)
    }
  }, [])

  const bewerk = useCallback(async (b: IngeplandBericht) => {
    try {
      await cancelIngeplandBericht(b.id)
      zetBerichten((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: 'geannuleerd' } : x)))
      onBewerk(documentUitIngepland(b), b)
    } catch (err) {
      logger.error('Bewerken mislukt:', err)
      toast.error('Kon het bericht niet openen')
    }
  }, [onBewerk])

  if (laden) {
    return (
      <div className="flex-1 px-6 py-5 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[86px] rounded-[14px] bg-petrol/[0.04] dark:bg-white/[0.04] animate-pulse" />)}
      </div>
    )
  }

  if (zichtbaar.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <CalendarClock className="h-6 w-6 text-petrol/60 dark:text-[#7FB5BF] mb-3" strokeWidth={1.8} />
        <p className="font-heading text-[15px] font-bold text-foreground">Niets ingepland<span className="text-flame">.</span></p>
        <p className="text-[12.5px] text-muted-foreground mt-1 max-w-[260px] leading-relaxed">Plan een bericht in vanuit Nieuw bericht of een antwoord, dan wacht het hier op zijn moment.</p>
        {verborgen > 0 && (
          <button type="button" onClick={() => zetToonAlles(true)} className="mt-3 text-[12px] text-petrol hover:underline">Toon afgehandeld ({verborgen})</button>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-5">
        <div className="flex items-center gap-2.5 mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-petrol/65 dark:text-foreground/60">
          <span className="font-semibold whitespace-nowrap">Ingepland<span className="text-flame tracking-normal">.</span></span>
          <span className="flex-1 h-px bg-gradient-to-r from-petrol/[0.14] to-transparent dark:from-white/10" aria-hidden />
          <span className="tabular-nums tracking-normal text-petrol/40 dark:text-foreground/40">{zichtbaar.length}</span>
          {(verborgen > 0 || toonAlles) && (
            <button type="button" onClick={() => zetToonAlles((v) => !v)} className="tracking-normal normal-case text-[11px] text-petrol hover:underline">
              {toonAlles ? 'Alleen wachtend' : `Toon mislukt en afgehandeld (${verborgen})`}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {zichtbaar.map((b) => {
            const wacht = b.status === 'wachtend'
            const bezig = annulerenId === b.id
            return (
              <div key={b.id} className={cn('relative overflow-hidden rounded-[14px] pl-5 pr-4 py-3 bg-card border border-black/[0.06] dark:border-white/[0.08]', !wacht && b.status !== 'verwerken' && 'opacity-70')}>
                <span className={cn('absolute left-0 inset-y-0 w-[3px]', b.status === 'verzonden' && 'bg-[#3A7D52]/70', b.status === 'mislukt' && 'bg-[#C0451A]/70', b.status === 'geannuleerd' && 'bg-muted-foreground/30', (b.status === 'verwerken' || (b.status as string) === 'verzenden') && 'bg-[#8A7A4A]/70', wacht && 'bg-petrol/60')} aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-petrol dark:text-[#7FB5BF] flex-shrink-0" />
                      <span className="text-[12px] font-mono tabular-nums text-petrol dark:text-[#7FB5BF] font-semibold">{formatScheduledAt(b.scheduled_at)}</span>
                      {!wacht && <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[b.status] || b.status}<span className="text-flame">.</span></span>}
                      {wacht && (b.retry_count ?? 0) > 0 && <span className="text-[11px] text-muted-foreground">poging {(b.retry_count ?? 0) + 1}</span>}
                    </div>
                    <p className="text-[13px] font-semibold text-foreground truncate">{b.onderwerp || '(geen onderwerp)'}</p>
                    <p className="text-[12.5px] text-muted-foreground truncate">Aan {b.ontvanger}</p>
                    {b.foutmelding && (
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-[#C0451A]">
                        <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" /><span>{b.foutmelding}</span>
                      </div>
                    )}
                    {b.status === 'verzonden' && b.verzonden_op && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#3A7D52]">
                        <Check className="h-3 w-3 flex-shrink-0" /><span>Verzonden op {new Date(b.verzonden_op).toLocaleString('nl-NL')}</span>
                      </div>
                    )}
                  </div>
                  {wacht && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => bewerk(b)} disabled={bezig} className="h-8 px-2.5 rounded-lg text-[12px] font-medium text-petrol hover:bg-petrol/[0.08] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50" title="Bewerken en opnieuw plannen">
                        <Pencil className="h-3.5 w-3.5" /> Bewerken
                      </button>
                      <button type="button" onClick={() => annuleer(b.id)} disabled={bezig} className="h-8 px-2.5 rounded-lg text-[12px] font-medium text-[#C0451A] hover:bg-[#C0451A]/[0.08] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50">
                        <X className="h-3.5 w-3.5" /> {bezig ? 'Annuleren' : 'Annuleren'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
