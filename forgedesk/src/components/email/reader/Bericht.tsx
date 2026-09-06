import { forwardRef, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Reply, ReplyAll, Forward, Pin, MailOpen, Mail, Paperclip, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmailBody, EmailLijstItem } from '@/lib/mail/types'
import { mailStore } from '@/lib/mail/mailStore'
import { bodyUitGeheugen, haalBody } from '@/lib/mail/bodyRepository'
import { extractSenderEmail, extractSenderName, formatShortDate, getAvatarStyle, ontvangerLabel } from '@/components/email/emailHelpers'
import { kortePreview } from './thread'

export type AntwoordModus = 'antwoord' | 'allen' | 'doorsturen'

export interface BerichtProps {
  bericht: EmailLijstItem
  open: boolean
  geselecteerd: boolean
  compact?: boolean
  onToggle: () => void
  onAntwoord: (modus: AntwoordModus, body: EmailBody | null) => void
  /** Het meer-menu, door de conversatie aangeleverd zodat het bericht zelf geen menu-logica draagt. */
  meer?: (body: EmailBody | null) => ReactNode
  /** Bijlagentegels, direct onder de kop. */
  bijlagen?: ReactNode
  /** De body-weergave; krijgt de geladen body. */
  inhoud: (body: EmailBody | null, laden: boolean, fout: string | undefined, opnieuw: () => void) => ReactNode
  /** Onder de body, alleen bij een open bericht (Daan, aanvraagkaart). */
  onder?: (body: EmailBody | null) => ReactNode
}

/**
 * Zoals useBody, maar met een Opnieuw-knop: bodyRepository vergeet een
 * mislukte taak, dus een tweede haalBody op dezelfde id probeert het echt
 * opnieuw. Een gesloten bericht laadt niets.
 */
function useBerichtBody(emailId: string | null): { body: EmailBody | null; laden: boolean; fout?: string; opnieuw: () => void } {
  const [poging, zetPoging] = useState(0)
  const [stand, zetStand] = useState<{ id: string | null; body: EmailBody | null; laden: boolean; fout?: string }>(() => ({
    id: emailId,
    body: emailId ? bodyUitGeheugen(emailId) ?? null : null,
    laden: !!emailId && !bodyUitGeheugen(emailId),
  }))
  useEffect(() => {
    if (!emailId) { zetStand({ id: null, body: null, laden: false }); return }
    const bekend = bodyUitGeheugen(emailId)
    if (bekend) { zetStand({ id: emailId, body: bekend, laden: false }); return }
    let actueel = true
    zetStand({ id: emailId, body: null, laden: true })
    haalBody(emailId, 'nu')
      .then((body) => { if (actueel) zetStand({ id: emailId, body, laden: false }) })
      .catch((e: Error) => { if (actueel) zetStand({ id: emailId, body: null, laden: false, fout: e.message }) })
    return () => { actueel = false }
  }, [emailId, poging])
  const opnieuw = useCallback(() => zetPoging((n) => n + 1), [])
  if (stand.id !== emailId) return { body: null, laden: !!emailId, opnieuw }
  return { body: stand.body, laden: stand.laden, fout: stand.fout, opnieuw }
}

function volledigeDatum(datum: string): string {
  const d = new Date(datum)
  if (Number.isNaN(d.getTime())) return datum
  return d.toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function HoverActie({ label, onClick, actief, children }: { label: string; onClick: () => void; actief?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-petrol/[0.06] hover:text-petrol',
        actief && 'text-petrol',
      )}
    >
      {children}
    </button>
  )
}

export const Bericht = forwardRef<HTMLDivElement, BerichtProps>(function Bericht(
  { bericht, open, geselecteerd, compact, onToggle, onAntwoord, meer, bijlagen, inhoud, onder },
  ref,
) {
  const { body, laden, fout, opnieuw } = useBerichtBody(open ? bericht.id : null)
  const naam = extractSenderName(bericht.van) || bericht.from_name || bericht.van
  const adres = extractSenderEmail(bericht.van)
  const avatar = getAvatarStyle(naam)
  const initiaal = (naam || adres || '?').trim().charAt(0).toUpperCase()
  const aantalBijlagen = (bericht.attachment_meta || []).filter((a) => !a.isInlineCid).length

  const togglePin = () => { void mailStore.pin([bericht.id], !bericht.pinned) }
  const toggleGelezen = () => { void mailStore.zetGelezen([bericht.id], !bericht.gelezen) }

  if (!open) {
    return (
      <div
        ref={ref}
        data-bericht={bericht.id}
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className={cn(
          'group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 transition-colors hover:bg-petrol/[0.03]',
          !bericht.gelezen && 'border-l-2 border-l-petrol',
        )}
      >
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
          style={{ background: avatar.bg, color: avatar.text }}
          aria-hidden
        >
          {initiaal}
        </span>
        <span className={cn('w-[140px] flex-shrink-0 truncate text-[13px]', bericht.gelezen ? 'text-foreground/80' : 'font-semibold text-foreground')}>
          {naam}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{kortePreview(bericht)}</span>
        {aantalBijlagen > 0 && <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />}
        <span className="flex-shrink-0 font-mono text-[11px] text-muted-foreground" title={volledigeDatum(bericht.datum)}>
          {formatShortDate(bericht.datum)}
        </span>
      </div>
    )
  }

  return (
    <article
      ref={ref}
      data-bericht={bericht.id}
      className={cn(
        'group rounded-xl border bg-background',
        geselecteerd ? 'border-petrol/40' : 'border-border',
      )}
    >
      <header
        className={cn('flex items-start gap-3', compact ? 'px-3 pt-3' : 'px-5 pt-4')}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label="Bericht inklappen"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
          style={{ background: avatar.bg, color: avatar.text }}
        >
          {initiaal}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <button type="button" onClick={onToggle} className="min-w-0 truncate text-left text-[14px] font-semibold text-foreground">
              {naam}
            </button>
            {adres && adres !== naam && !compact && (
              <span className="min-w-0 truncate text-[12px] text-muted-foreground">{adres}</span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="truncate">aan {ontvangerLabel(bericht.aan || '') || 'mij'}</span>
            {(bericht.cc_addresses?.length || 0) > 0 && (
              <span className="flex-shrink-0">· cc {bericht.cc_addresses!.length}</span>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <time
            dateTime={bericht.datum}
            title={volledigeDatum(bericht.datum)}
            className="font-mono text-[11px] text-muted-foreground"
          >
            {compact ? formatShortDate(bericht.datum) : volledigeDatum(bericht.datum)}
          </time>
          {!compact && (
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <HoverActie label="Beantwoorden" onClick={() => onAntwoord('antwoord', body)}><Reply className="h-3.5 w-3.5" strokeWidth={1.75} /></HoverActie>
              <HoverActie label="Allen beantwoorden" onClick={() => onAntwoord('allen', body)}><ReplyAll className="h-3.5 w-3.5" strokeWidth={1.75} /></HoverActie>
              <HoverActie label="Doorsturen" onClick={() => onAntwoord('doorsturen', body)}><Forward className="h-3.5 w-3.5" strokeWidth={1.75} /></HoverActie>
              <HoverActie label={bericht.pinned ? 'Losmaken' : 'Vastpinnen'} onClick={togglePin} actief={!!bericht.pinned}><Pin className={cn('h-3.5 w-3.5', bericht.pinned && 'fill-current')} strokeWidth={1.75} /></HoverActie>
              <HoverActie label={bericht.gelezen ? 'Markeer als ongelezen' : 'Markeer als gelezen'} onClick={toggleGelezen}>
                {bericht.gelezen ? <Mail className="h-3.5 w-3.5" strokeWidth={1.75} /> : <MailOpen className="h-3.5 w-3.5" strokeWidth={1.75} />}
              </HoverActie>
            </div>
          )}
          {meer?.(body)}
        </div>
      </header>

      {bijlagen}

      <div className={cn(compact ? 'px-3 pb-3 pt-3' : 'px-5 pb-5 pt-4')}>
        {laden && !body ? (
          <div className="flex items-center gap-2 py-6 text-[12px] text-muted-foreground" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Bericht ophalen
          </div>
        ) : null}
        {inhoud(body, laden, fout, opnieuw)}
        {onder?.(body)}
      </div>
    </article>
  )
})
