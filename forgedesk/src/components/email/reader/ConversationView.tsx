import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, X, UserPlus, Reply, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email } from '@/types'
import type { EmailBody, EmailKoppeling, EmailLijstItem, KoppelingSoort } from '@/lib/mail/types'
import { useMail, useThread } from '@/lib/mail/hooks'
import { mailStore } from '@/lib/mail/mailStore'
import { getEmail } from '@/services/emailService'
import { getKoppelingenVoorEmail, koppel as koppelService, ontkoppel as ontkoppelService } from '@/services/koppelingService'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { useAuth } from '@/contexts/AuthContext'
import { EmailActionsPopover, useAfzenderStatus } from '@/components/email/EmailActionsPopover'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { useFunctie } from '@/hooks/useFunctie'
import { extractSenderEmail } from '@/components/email/emailHelpers'
import { Bericht, type AntwoordModus } from './Bericht'
import { BodyFrame } from './BodyFrame'
import { bepaalOpenBerichten, deelnemersLabel, deelnemersVan, sorteerOudNaarNieuw } from './thread'
import { chipsVoor, SOORT_LABEL, type KoppelingChip } from './koppelingen'

/**
 * Contract met de shell (docs/mail-ombouw/CONTRACT.md, golf 2 reader):
 *
 *   <ConversationView
 *     emailId={string}                       // geselecteerde mail; hele thread, deze uitgeklapt
 *     onSluiten={() => void}
 *     onAntwoord={(modus, mail, body, voorstel?) => void}
 *                                             // voorstel: tekst van Daan ("Concept door Daan") die de
 *                                             // shell als eigen html in het antwoord-document zet
 *     onVolgende={() => void} onVorige={() => void}   // optioneel, pijltjes in de kop
 *     voet={ReactNode}                        // slot onder het laatste bericht (inline Composer)
 *     onKoppel={(soort, doelId) => void}      // optioneel; anders koppelingService direct
 *     compact={boolean}                       // mobiel
 *   />
 */
export interface ConversationViewProps {
  emailId: string
  onSluiten: () => void
  onAntwoord: (modus: AntwoordModus, mail: EmailLijstItem, body: EmailBody | null, voorstel?: string) => void
  onVolgende?: () => void
  onVorige?: () => void
  voet?: ReactNode
  onKoppel?: (soort: KoppelingSoort, doelId: string) => void
  compact?: boolean
}

/** EmailLijstItem heeft geen `inhoud`; de bestaande afzender-hooks verwachten een Email. */
function alsEmail(item: EmailLijstItem, body: EmailBody | null): Email {
  return { ...item, inhoud: body?.html || body?.tekst || '' } as unknown as Email
}

function KopKnop({ label, onClick, disabled, children }: { label: string; onClick?: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-petrol/[0.06] hover:text-petrol disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

// Overgenomen uit EmailReader: staat de afzender al in doen.? Eén klik naar
// "Klant toevoegen". Bewust ook op mobiel zichtbaar.
function AfzenderBanner({ email, onOpenKlant }: { email: Email; onOpenKlant: () => void }) {
  const st = useAfzenderStatus(email)
  if (email.map === 'verzonden' || !st.senderEmail || !st.geladen || st.bekend) return null
  if (/noreply|no-reply|notification|mailer-daemon/i.test(st.senderEmail)) return null
  const naam = st.handtekening?.naam || st.senderName || st.senderEmail
  const firma = st.klant ? (st.klant.bedrijfsnaam || st.klant.contactpersoon) : null
  return (
    <button
      type="button"
      onClick={onOpenKlant}
      className="flex w-full items-center gap-2.5 rounded-[10px] border border-dashed border-petrol/30 bg-petrol/[0.04] px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:border-petrol/60 hover:bg-petrol/[0.08]"
    >
      <UserPlus className="h-3.5 w-3.5 flex-shrink-0 text-petrol" />
      <span className="min-w-0 flex-1 truncate">
        {firma
          ? <><span className="font-semibold">{naam}</span> staat nog niet als contactpersoon bij <span className="font-semibold">{firma}</span>.</>
          : <><span className="font-semibold">{naam}</span> staat nog niet in doen.{st.handtekeningBruikbaar && st.handtekening ? ` Handtekening: ${[st.handtekening.bedrijfsnaam, st.handtekening.functie, st.handtekening.mobiel || st.handtekening.telefoon].filter(Boolean).join(' · ')}` : ''}</>}
      </span>
      <span className="flex-shrink-0 font-semibold text-petrol">{firma ? 'Toevoegen als contactpersoon?' : 'Klant toevoegen'}</span>
    </button>
  )
}

function Chip({ chip, onOpen, onOntkoppel }: { chip: KoppelingChip; onOpen: () => void; onOntkoppel: () => void }) {
  return (
    <span className="inline-flex h-7 items-center overflow-hidden rounded-full border border-petrol/25 bg-petrol/[0.05] text-[12px] text-petrol">
      <button
        type="button"
        onClick={onOpen}
        disabled={!chip.pad}
        className="flex h-full items-center gap-1.5 pl-2.5 pr-1.5 transition-colors hover:bg-petrol/[0.08] disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-petrol/70">{SOORT_LABEL[chip.soort]}</span>
        <span className="max-w-[180px] truncate font-medium">{chip.label}</span>
      </button>
      <button
        type="button"
        onClick={onOntkoppel}
        aria-label={`${chip.label} ontkoppelen`}
        title="Ontkoppelen"
        className="flex h-full w-6 items-center justify-center text-petrol/60 transition-colors hover:bg-petrol/[0.1] hover:text-petrol"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

export function useKoppelingen(emailId: string | null, threadId: string | null | undefined) {
  const [chips, zetChips] = useState<KoppelingChip[]>([])
  const [versie, zetVersie] = useState(0)
  useEffect(() => {
    if (!emailId) { zetChips([]); return }
    let actueel = true
    getKoppelingenVoorEmail(emailId, threadId)
      .then((koppelingen: EmailKoppeling[]) => chipsVoor(koppelingen))
      .then((lijst) => { if (actueel) zetChips(lijst) })
      .catch((e) => logger.warn('Koppelingen ophalen mislukt:', e))
    return () => { actueel = false }
  }, [emailId, threadId, versie])
  const ververs = useCallback(() => zetVersie((n) => n + 1), [])
  return { chips, ververs }
}

export function ConversationView({ emailId, onSluiten, onAntwoord, onVolgende, onVorige, voet, onKoppel, compact }: ConversationViewProps) {
  const { user } = useAuth()
  const { navigateWithTab } = useNavigateWithTab()
  const mailUitStore = useMail(emailId)
  const threadId = mailUitStore?.thread_id || null
  const { berichten: threadBerichten, laden: threadLaden } = useThread(threadId)

  // Deep link of een mail buiten de geladen mappen: één keer ophalen en in de store zetten.
  const [ophalenMislukt, zetOphalenMislukt] = useState(false)
  useEffect(() => {
    if (mailUitStore) return
    let actueel = true
    zetOphalenMislukt(false)
    getEmail(emailId)
      .then((rij) => {
        if (!actueel) return
        if (rij) mailStore.voegToe(rij as unknown as EmailLijstItem)
        else zetOphalenMislukt(true)
      })
      .catch(() => { if (actueel) zetOphalenMislukt(true) })
    return () => { actueel = false }
  }, [emailId, mailUitStore])

  const berichten = useMemo(() => {
    if (!mailUitStore) return []
    const lijst = threadId && threadBerichten.length ? threadBerichten : [mailUitStore]
    const metSelectie = lijst.some((b) => b.id === mailUitStore.id) ? lijst : [...lijst, mailUitStore]
    return sorteerOudNaarNieuw(metSelectie)
  }, [mailUitStore, threadId, threadBerichten])

  // Open-stand: bij een nieuwe selectie opnieuw bepaald, daarna door de gebruiker.
  const [open, zetOpen] = useState<Set<string>>(() => bepaalOpenBerichten(berichten, emailId))
  const vorigeSleutel = useRef('')
  useEffect(() => {
    const sleutel = `${emailId}:${berichten.length}`
    if (vorigeSleutel.current === sleutel) return
    const wasNieuweSelectie = !vorigeSleutel.current.startsWith(`${emailId}:`)
    vorigeSleutel.current = sleutel
    if (wasNieuweSelectie) zetOpen(bepaalOpenBerichten(berichten, emailId))
    else zetOpen((huidig) => { const s = new Set(huidig); for (const id of bepaalOpenBerichten(berichten, emailId)) s.add(id); return s })
  }, [emailId, berichten])

  const toggle = useCallback((id: string) => {
    zetOpen((huidig) => {
      const volgende = new Set(huidig)
      if (volgende.has(id)) volgende.delete(id)
      else volgende.add(id)
      return volgende
    })
  }, [])

  // Naar het geselecteerde bericht scrollen zodra het in de lijst staat.
  const berichtRefs = useRef(new Map<string, HTMLDivElement>())
  const gescrolldNaar = useRef<string | null>(null)
  useEffect(() => {
    if (gescrolldNaar.current === emailId) return
    const el = berichtRefs.current.get(emailId)
    if (!el) return
    gescrolldNaar.current = emailId
    el.scrollIntoView({ block: berichten.length > 1 ? 'start' : 'nearest' })
  }, [emailId, berichten])

  const { chips, ververs: verversKoppelingen } = useKoppelingen(mailUitStore?.id ?? null, threadId)
  const [klantSignal, zetKlantSignal] = useState(0)
  const [koppelOpen, zetKoppelOpen] = useState(false)
  const [geselecteerdeBody, zetGeselecteerdeBody] = useState<EmailBody | null>(null)
  const blokkeerAfbeeldingen = useFunctie('mail_afbeeldingen_blokkeren')
  const [citaatOpen, zetCitaatOpen] = useState<Set<string>>(() => new Set())
  const [afbeeldingenGeladen, zetAfbeeldingenGeladen] = useState<Set<string>>(() => new Set())
  const zetInSet = useCallback((zet: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, aan: boolean) => {
    zet((huidig) => {
      if (huidig.has(id) === aan) return huidig
      const volgende = new Set(huidig)
      if (aan) volgende.add(id); else volgende.delete(id)
      return volgende
    })
  }, [])

  const handleKoppel = useCallback(async (soort: KoppelingSoort, doelId: string) => {
    if (!mailUitStore) return
    if (onKoppel) { onKoppel(soort, doelId); verversKoppelingen(); return }
    try {
      await koppelService(soort, doelId, threadId ? { threadId } : { emailId: mailUitStore.id })
      toast.success(`Gekoppeld aan ${SOORT_LABEL[soort].toLowerCase()}`)
      verversKoppelingen()
    } catch (e) {
      logger.error('Koppelen mislukt:', e)
      toast.error(e instanceof Error ? e.message : 'Koppelen mislukt')
    }
  }, [mailUitStore, onKoppel, threadId, verversKoppelingen])

  const handleOntkoppel = useCallback(async (chip: KoppelingChip) => {
    try {
      await ontkoppelService(chip.koppeling.id)
      verversKoppelingen()
    } catch (e) {
      logger.error('Ontkoppelen mislukt:', e)
      toast.error('Ontkoppelen mislukt')
    }
  }, [verversKoppelingen])

  const openChip = useCallback((chip: KoppelingChip) => {
    if (!chip.pad) return
    navigateWithTab({ path: chip.pad, label: chip.label, id: chip.pad.replace(/\/bewerken$/, '') })
  }, [navigateWithTab])

  const deelnemers = useMemo(() => deelnemersVan(berichten, user?.email), [berichten, user?.email])

  if (!mailUitStore) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-[13px] text-muted-foreground">
        {ophalenMislukt ? (
          <>
            <span>Deze mail is niet gevonden.</span>
            <button type="button" onClick={onSluiten} className="font-semibold text-petrol hover:underline">Terug</button>
          </>
        ) : (
          <><Loader2 className="h-4 w-4 animate-spin" /><span>Mail ophalen</span></>
        )}
      </div>
    )
  }

  const mail = mailUitStore
  const aantal = berichten.length
  const laatste = berichten[berichten.length - 1]

  return (
    <div className="doen-reader flex h-full min-h-0 flex-col bg-background">
      <header className={cn('flex-shrink-0 border-b border-border', compact ? 'px-3 py-2.5' : 'px-6 py-4')}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h1 className={cn('font-semibold tracking-[-0.3px] text-foreground', compact ? 'text-[15px] leading-tight' : 'text-[18px] leading-snug')}>
              {mail.onderwerp || '(geen onderwerp)'}
            </h1>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {deelnemersLabel(deelnemers)}
              {aantal > 1 && <> · {aantal} berichten</>}
              {threadLaden && aantal <= 1 && <> · thread laden</>}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-0.5">
            {!compact && (
              <>
                <KopKnop label="Vorige mail" onClick={onVorige}><ChevronUp className="h-4 w-4" /></KopKnop>
                <KopKnop label="Volgende mail" onClick={onVolgende}><ChevronDown className="h-4 w-4" /></KopKnop>
              </>
            )}
            <EmailActionsPopover email={alsEmail(mail, geselecteerdeBody)} openKlantSignal={klantSignal} onOpenProjectDialog={() => zetKoppelOpen(true)} />
            <KopKnop label="Sluiten" onClick={onSluiten}><X className="h-4 w-4" /></KopKnop>
          </div>
        </div>

        {(chips.length > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <Chip key={chip.koppeling.id} chip={chip} onOpen={() => openChip(chip)} onOntkoppel={() => handleOntkoppel(chip)} />
            ))}
          </div>
        )}

        <div className="mt-2.5 empty:hidden">
          <AfzenderBanner email={alsEmail(mail, geselecteerdeBody)} onOpenKlant={() => zetKlantSignal((n) => n + 1)} />
        </div>
      </header>

      <div className={cn('min-h-0 flex-1 overflow-y-auto', compact ? 'px-3 py-3' : 'px-6 py-4')}>
        <div className="space-y-2.5">
          {berichten.map((bericht) => (
            <Bericht
              key={bericht.id}
              ref={(el) => { if (el) berichtRefs.current.set(bericht.id, el); else berichtRefs.current.delete(bericht.id) }}
              bericht={bericht}
              open={open.has(bericht.id)}
              geselecteerd={bericht.id === emailId}
              compact={compact}
              onToggle={() => toggle(bericht.id)}
              onAntwoord={(modus, body) => onAntwoord(modus, bericht, body)}
              inhoud={(body, laden, fout, opnieuw) => (
                <BerichtInhoud body={body} onBody={bericht.id === emailId ? zetGeselecteerdeBody : undefined}>
                  <BodyFrame
                    body={body}
                    laden={laden}
                    fout={fout}
                    opnieuw={opnieuw}
                    afzender={extractSenderEmail(bericht.van)}
                    blokkeren={blokkeerAfbeeldingen}
                    afbeeldingenGeladen={afbeeldingenGeladen.has(bericht.id)}
                    onAfbeeldingenLaden={() => zetInSet(zetAfbeeldingenGeladen, bericht.id, true)}
                    toonCitaat={citaatOpen.has(bericht.id)}
                    onToonCitaat={(aan) => zetInSet(zetCitaatOpen, bericht.id, aan)}
                    compact={compact}
                  />
                </BerichtInhoud>
              )}
            />
          ))}
        </div>

        {voet && <div className="mt-4">{voet}</div>}

        {compact && !voet && laatste && (
          <div className="sticky bottom-0 mt-4 bg-background pb-[env(safe-area-inset-bottom)] pt-2">
            <button
              type="button"
              onClick={() => onAntwoord('antwoord', laatste, laatste.id === emailId ? geselecteerdeBody : null)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-flame text-[14px] font-semibold text-white"
            >
              <Reply className="h-4 w-4" strokeWidth={2} />
              Beantwoorden
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Geeft de body van het geselecteerde bericht door aan de kop (afzenderbanner, popover). */
function BerichtInhoud({ body, onBody, children }: { body: EmailBody | null; onBody?: (body: EmailBody | null) => void; children: ReactNode }) {
  useEffect(() => { onBody?.(body) }, [body, onBody])
  return <>{children}</>
}
