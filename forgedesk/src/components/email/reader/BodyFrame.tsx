import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saniteerVoorIframe } from '@/lib/sanitize'
import { platteTekstNaarHtml } from '@/components/email/emailHelpers'
import { useTheme } from '@/contexts/ThemeContext'
import { Skeleton } from '@/components/ui/skeleton'
import type { EmailBody } from '@/lib/mail/types'

export const AFZENDERS_SLEUTEL = 'doen_mail_afbeeldingen_afzenders'

const EXTERNE_AFBEELDING = /(?:<img[^>]+src\s*=\s*["']?\s*(?:https?:)?\/\/|url\(\s*["']?(?:https?:)?\/\/|<[^>]+background\s*=\s*["']?(?:https?:)?\/\/)/i

/** Heeft deze mail plaatjes van buiten? Zo niet, dan is een blokkeerbalk alleen ruis. */
export function heeftExterneAfbeeldingen(html: string | null): boolean {
  return !!html && EXTERNE_AFBEELDING.test(html)
}

export function leesVertrouwdeAfzenders(): string[] {
  try {
    const ruw = localStorage.getItem(AFZENDERS_SLEUTEL)
    const lijst = ruw ? JSON.parse(ruw) : []
    return Array.isArray(lijst) ? lijst.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function vertrouwAfzender(email: string): void {
  const sleutel = email.trim().toLowerCase()
  if (!sleutel) return
  const lijst = leesVertrouwdeAfzenders()
  if (lijst.includes(sleutel)) return
  try { localStorage.setItem(AFZENDERS_SLEUTEL, JSON.stringify([...lijst, sleutel])) } catch { /* privémodus */ }
}

export function isVertrouwdeAfzender(email: string): boolean {
  return leesVertrouwdeAfzenders().includes(email.trim().toLowerCase())
}

export interface BodyFrameProps {
  body: EmailBody | null
  laden: boolean
  fout?: string
  opnieuw: () => void
  /** E-mailadres van de afzender, voor "Altijd laden van deze afzender". */
  afzender: string
  /** Schakelaar mail_afbeeldingen_blokkeren. */
  blokkeren: boolean
  afbeeldingenGeladen: boolean
  onAfbeeldingenLaden: () => void
  toonCitaat: boolean
  onToonCitaat: (aan: boolean) => void
  compact?: boolean
}

function bronHtml(body: EmailBody, metCitaat: boolean): string {
  if (body.html) return metCitaat && body.quotedHtml ? `${body.html}${body.quotedHtml}` : body.html
  return body.tekst ? platteTekstNaarHtml(body.tekst) : ''
}

/**
 * De mail in een eigen document: sandbox zonder scripts, eigen stylesheet
 * van de mail blijft binnen het frame en lekt niet naar de app. Hoogte via
 * het contentDocument (same-origin) met een ResizeObserver; het
 * postMessage-bericht `doen-mail-hoogte` uit sanitize.ts wordt ook
 * gehonoreerd, zodat de meting meegaat als de sandbox ooit scripts toelaat.
 */
export function BodyFrame({ body, laden, fout, opnieuw, afzender, blokkeren, afbeeldingenGeladen, onAfbeeldingenLaden, toonCitaat, onToonCitaat, compact }: BodyFrameProps) {
  const { theme } = useTheme()
  const donker = theme === 'dark'
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [hoogte, zetHoogte] = useState(120)

  const vertrouwd = useMemo(() => (afzender ? isVertrouwdeAfzender(afzender) : false), [afzender])
  const extern = heeftExterneAfbeeldingen(body?.html ?? null)
  const afbeeldingenLaden = !blokkeren || vertrouwd || afbeeldingenGeladen
  const toonBalk = blokkeren && extern && !afbeeldingenLaden

  const srcDoc = useMemo(() => {
    if (!body) return null
    return saniteerVoorIframe(bronHtml(body, toonCitaat), { afbeeldingenLaden, donker })
  }, [body, toonCitaat, afbeeldingenLaden, donker])

  const meet = useCallback(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc?.documentElement) return
    const h = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0)
    if (h > 0) zetHoogte((huidig) => (Math.abs(huidig - h) > 2 ? h : huidig))
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !srcDoc) return
    let observer: ResizeObserver | null = null
    const opgeladen = () => {
      meet()
      const doc = iframe.contentDocument
      if (!doc) return
      if ('ResizeObserver' in window) {
        observer = new ResizeObserver(meet)
        observer.observe(doc.documentElement)
        if (doc.body) observer.observe(doc.body)
      }
      for (const img of Array.from(doc.images)) img.addEventListener('load', meet)
    }
    iframe.addEventListener('load', opgeladen)
    const onBericht = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return
      if (e.data?.type === 'doen-mail-hoogte' && typeof e.data.hoogte === 'number') zetHoogte(e.data.hoogte)
    }
    window.addEventListener('message', onBericht)
    return () => {
      iframe.removeEventListener('load', opgeladen)
      window.removeEventListener('message', onBericht)
      observer?.disconnect()
    }
  }, [srcDoc, meet])

  if (fout && !body) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Kon de mail niet ophalen · <button type="button" onClick={opnieuw} className="font-semibold text-petrol hover:underline">Opnieuw</button>
      </p>
    )
  }

  if (!body || !srcDoc) {
    if (!laden) return <p className="text-[13px] text-muted-foreground">Geen inhoud.</p>
    return (
      <div className="space-y-2.5 py-1" aria-busy>
        <Skeleton className="h-3.5 w-[70%]" />
        <Skeleton className="h-3.5 w-[92%]" />
        <Skeleton className="h-3.5 w-[85%]" />
        <Skeleton className="h-3.5 w-[40%]" />
      </div>
    )
  }

  return (
    <div>
      {toonBalk && (
        <div className={cn('mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground', compact && 'text-[11px]')}>
          <ImageOff className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Externe afbeeldingen geblokkeerd</span>
          <span aria-hidden>·</span>
          <button type="button" onClick={onAfbeeldingenLaden} className="font-semibold text-petrol hover:underline">Laden</button>
          {afzender && (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => { vertrouwAfzender(afzender); onAfbeeldingenLaden() }}
                className="font-semibold text-petrol hover:underline"
              >
                Altijd laden van deze afzender
              </button>
            </>
          )}
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="Bericht"
        sandbox="allow-same-origin allow-popups"
        srcDoc={srcDoc}
        scrolling="no"
        style={{ height: `${hoogte}px`, colorScheme: donker ? 'dark' : 'light' }}
        className="block w-full border-0 bg-transparent"
      />
      {body.quotedHtml && (
        <button
          type="button"
          onClick={() => onToonCitaat(!toonCitaat)}
          aria-expanded={toonCitaat}
          aria-label={toonCitaat ? 'Citaat verbergen' : 'Citaat tonen'}
          title={toonCitaat ? 'Citaat verbergen' : 'Citaat tonen'}
          className="mt-2 inline-flex h-6 items-center rounded-full border border-border px-2.5 font-mono text-[12px] leading-none tracking-[2px] text-muted-foreground transition-colors hover:bg-petrol/[0.06] hover:text-petrol"
        >
          ···
        </button>
      )}
    </div>
  )
}
