import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { EmailBody, EmailLijstItem } from '@/lib/mail/types'
import { haalBody, bodyUitGeheugen } from '@/lib/mail/bodyRepository'
import { callForgie, type ForgieResult } from '@/services/forgieService'
import { extractSenderName } from '@/components/email/emailHelpers'
import { logger } from '@/utils/logger'

const MAX_CONTEXT_TEKENS = 12000
const MAX_THREAD_TEKENS = 8000
const MAX_THREAD_BERICHTEN = 12

/** Actiepunten uit een aanvraag, als het endpoint ze ooit meegeeft; anders alleen de samenvatting. */
export interface Actiepunt {
  label: string
  waarde: string
}

type SamenvattingResultaat = ForgieResult & { actiepunten?: Actiepunt[] | string[] }

function alsPlatteTekst(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

function tekstVan(item: EmailLijstItem, body: EmailBody | null): string {
  if (body?.tekst?.trim()) return body.tekst.trim()
  if (body?.html) return alsPlatteTekst(body.html)
  return (item.body_text || '').trim()
}

/** Dezelfde context als de oude reader gaf: afzender, onderwerp, bijlagen, tekst. */
export function bouwAntwoordContext(item: EmailLijstItem, body: EmailBody | null): string {
  const ruw = tekstVan(item, body)
  const tekst = ruw.length > MAX_CONTEXT_TEKENS ? `${ruw.slice(0, MAX_CONTEXT_TEKENS)}\n\n[hier is de mail afgekapt]` : ruw
  const bijlagen = (item.attachment_meta ?? []).filter((b) => !b.isInlineCid).map((b) => b.filename)
  return [
    `Afzender: ${extractSenderName(item.van)}`,
    `Onderwerp: ${item.onderwerp}`,
    bijlagen.length > 0 ? `Meegestuurde bijlagen: ${bijlagen.join(', ')}` : 'Meegestuurde bijlagen: geen',
    '',
    tekst,
  ].join('\n')
}

/** Chronologische thread-tekst, zoals ProjectDetail hem aan summarize-thread geeft. */
export async function bouwThreadTekst(berichten: EmailLijstItem[]): Promise<string> {
  const keuze = berichten.slice(-MAX_THREAD_BERICHTEN)
  const bodies = await Promise.all(keuze.map((b) => bodyUitGeheugen(b.id) ?? haalBody(b.id, 'nu').catch(() => null)))
  return keuze
    .map((m, i) => {
      const datum = new Date(m.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
      const afzender = extractSenderName(m.van) || m.van
      return `[${datum}] ${afzender}\nOnderwerp: ${m.onderwerp || '(geen)'}\n${tekstVan(m, bodies[i]).replace(/\s+/g, ' ')}`
    })
    .join('\n\n---\n\n')
    .slice(0, MAX_THREAD_TEKENS)
}

function normaliseerActiepunten(ruw: SamenvattingResultaat['actiepunten']): Actiepunt[] {
  if (!Array.isArray(ruw)) return []
  return ruw
    .map((p) => (typeof p === 'string' ? { label: '', waarde: p } : p))
    .filter((p): p is Actiepunt => !!p && typeof p.waarde === 'string' && p.waarde.trim() !== '')
}

interface DaanArgs {
  berichten: EmailLijstItem[]
  geselecteerd: EmailLijstItem | null
  body: EmailBody | null
  onConcept: (voorstel: string) => void
  /** Verandert deze sleutel, dan hoort de samenvatting bij een ander gesprek en gaat hij weg. */
  sleutel: string
}

export interface DaanStand {
  bezig: boolean
  samenvatten: boolean
  concept: boolean
  samenvatting: string | null
  actiepunten: Actiepunt[]
  fout: string | null
  vatSamen: () => void
  schrijfConcept: () => void
  sluitSamenvatting: () => void
}

/**
 * De samenvatting hoort bij één gesprek. Hij stond in de vaste kop en bleef
 * daardoor boven elke volgende mail hangen; nu wist hij zichzelf zodra je een
 * ander gesprek opent, en tekent de reader hem in het scrollgebied.
 */
export function useDaan({ berichten, geselecteerd, body, onConcept, sleutel }: DaanArgs): DaanStand {
  const [samenvatten, zetSamenvatten] = useState(false)
  const [concept, zetConcept] = useState(false)
  const [samenvatting, zetSamenvatting] = useState<string | null>(null)
  const [actiepunten, zetActiepunten] = useState<Actiepunt[]>([])
  const [fout, zetFout] = useState<string | null>(null)

  const vorigeSleutel = useRef(sleutel)
  useEffect(() => {
    if (vorigeSleutel.current === sleutel) return
    vorigeSleutel.current = sleutel
    zetSamenvatting(null)
    zetActiepunten([])
    zetFout(null)
  }, [sleutel])

  const sluitSamenvatting = useCallback(() => {
    zetSamenvatting(null)
    zetActiepunten([])
  }, [])

  const vatSamen = useCallback(async () => {
    if (samenvatten) return
    zetSamenvatten(true)
    zetFout(null)
    try {
      const tekst = await bouwThreadTekst(berichten)
      if (!tekst.trim()) throw new Error('Er is nog geen tekst om samen te vatten')
      const res = (await callForgie('summarize-thread', tekst)) as SamenvattingResultaat
      zetSamenvatting((res?.result || '').trim() || null)
      zetActiepunten(normaliseerActiepunten(res?.actiepunten))
      if (!res?.result) throw new Error('Daan gaf geen samenvatting terug')
    } catch (e) {
      const melding = e instanceof Error ? e.message : 'Onbekende fout'
      logger.error('Samenvatten mislukt:', e)
      zetFout(`Daan kon de thread niet samenvatten: ${melding}`)
      toast.error(`Daan kon de thread niet samenvatten: ${melding}`)
    } finally {
      zetSamenvatten(false)
    }
  }, [berichten, samenvatten])

  const schrijfConcept = useCallback(async () => {
    if (concept || !geselecteerd) return
    zetConcept(true)
    zetFout(null)
    try {
      const res = await callForgie('generate-reply', bouwAntwoordContext(geselecteerd, body))
      const voorstel = (res?.result || '').trim()
      if (!voorstel) throw new Error('Daan gaf geen tekst terug')
      onConcept(voorstel)
    } catch (e) {
      const melding = e instanceof Error ? e.message : 'Onbekende fout'
      logger.error('Concept door Daan mislukt:', e)
      zetFout(`Daan kon geen concept schrijven: ${melding}`)
      toast.error(`Daan kon geen concept schrijven: ${melding}`)
    } finally {
      zetConcept(false)
    }
  }, [body, concept, geselecteerd, onConcept])

  return {
    bezig: samenvatten || concept,
    samenvatten,
    concept,
    samenvatting,
    actiepunten,
    fout,
    vatSamen: () => { void vatSamen() },
    schrijfConcept: () => { void schrijfConcept() },
    sluitSamenvatting,
  }
}

const KNOP =
  'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-petrol/[0.06] hover:text-petrol disabled:opacity-50 disabled:hover:bg-transparent'

/** De twee acties van Daan, plus een foutregel. Hoort in de kop van de reader. */
export function DaanKnoppen({ daan, compact }: { daan: DaanStand; compact?: boolean }) {
  return (
    <div className={cn('text-[13px]', compact && 'text-[12px]')}>
      <div className="flex flex-wrap items-center gap-1">
        <Sparkles className="mr-0.5 h-3.5 w-3.5 text-[#9B8EC4]" aria-hidden />
        <button type="button" onClick={daan.vatSamen} disabled={daan.bezig} className={KNOP}>
          {daan.samenvatten ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Samenvatten
        </button>
        <span className="text-border" aria-hidden>·</span>
        <button type="button" onClick={daan.schrijfConcept} disabled={daan.bezig} className={KNOP}>
          {daan.concept ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Concept door Daan
        </button>
      </div>

      {daan.fout && (
        <p role="alert" className="mt-2 rounded-lg border border-[#F5C4B4] bg-[#FDE8E4] px-3 py-2 text-[12px] text-[#C0451A] dark:border-[#C0451A]/40 dark:bg-[#C0451A]/15 dark:text-[#F18060]">
          {daan.fout}
        </p>
      )}
    </div>
  )
}

/** De samenvatting zelf. Hoort in het scrollgebied, zodat hij met de mail meeschuift. */
export function DaanSamenvatting({ daan, compact }: { daan: DaanStand; compact?: boolean }) {
  if (!daan.samenvatting) return null
  return (
    <div className={cn('relative rounded-lg border border-border bg-muted/30 px-3.5 py-3 pr-9', compact ? 'text-[12px]' : 'text-[13px]')}>
      <button
        type="button"
        onClick={daan.sluitSamenvatting}
        aria-label="Samenvatting sluiten"
        className="absolute top-2 right-2 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Samenvatting door Daan</p>
      <p className="whitespace-pre-wrap leading-[1.55] text-foreground">{daan.samenvatting}</p>
      {daan.actiepunten.length > 0 && (
        <ul className="mt-2.5 space-y-1 border-t border-border pt-2.5">
          {daan.actiepunten.map((p, i) => (
            <li key={i} className="flex gap-2">
              {p.label && <span className="w-[88px] flex-shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.label}</span>}
              <span className="text-foreground">{p.waarde}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
