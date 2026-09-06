import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Phone, Mail, ChevronRight, UserPlus, X, Loader2, Link2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { EmailLijstItem } from '@/lib/mail/types'
import type { Klant, Project, Offerte, Taak, Email } from '@/types'
import { useBody } from '@/lib/mail/bodyRepository'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { getKlantIdByContactEmail } from '@/services/klantService'
import { getProjectenByKlant } from '@/services/projectService'
import { getOffertesByKlant } from '@/services/offerteService'
import { getEmailsMetAdres } from '@/services/emailService'
import { koppel } from '@/services/koppelingService'
import { supabase } from '@/services/supabaseClient'
import { getKlantenGedeeld } from '../EmailActionsPopover'
import { extractSenderEmail, extractSenderName, formatShortDate, getAvatarStyle, zoekKlantVoorAfzender } from '../emailHelpers'
import { SLEEP_TYPE } from '../EmailListItem'
import { vergeetKoppelingChips } from './koppelingChips'
import { KlantToevoegenDialog } from './KlantToevoegenDialog'

interface Props {
  mail: EmailLijstItem | null
  open: boolean
  onSluiten: () => void
  onZoekKlant: (klantId: string, label: string) => void
  onSelectMail: (id: string) => void
  eigenAdres?: string
}

const OFFERTE_STATUS: Record<string, string> = {
  concept: 'concept', verzonden: 'verstuurd', bekeken: 'bekeken', goedgekeurd: 'goedgekeurd', afgewezen: 'afgewezen', verlopen: 'verlopen', gefactureerd: 'gefactureerd', wijziging_gevraagd: 'wijziging',
}
const PROJECT_FASE: Record<string, string> = {
  gepland: 'gepland', 'te-plannen': 'te plannen', ingepland: 'ingepland', actief: 'in uitvoering', 'in-review': 'review', 'on-hold': 'on hold', 'akkoord-klant': 'akkoord', 'te-factureren': 'te factureren', gefactureerd: 'gefactureerd', afgerond: 'opgeleverd',
}
const STATUS_KLEUR: Record<string, string> = {
  concept: '#8A7A4A', gepland: '#8A7A4A', 'te-plannen': '#8A7A4A',
  verzonden: '#3A5A9A', bekeken: '#3A5A9A', actief: '#3A5A9A', ingepland: '#3A5A9A', 'in-review': '#3A5A9A',
  goedgekeurd: '#3A7D52', 'akkoord-klant': '#3A7D52', afgerond: '#3A7D52', gefactureerd: '#3A7D52',
  afgewezen: '#C0451A', verlopen: '#C0451A', 'on-hold': '#C0451A',
}

function Status({ code, label }: { code: string; label: string }) {
  return <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: STATUS_KLEUR[code] || '#6B6B66' }}>{label}<span className="text-flame">.</span></span>
}

function Kop({ tekst, actie }: { tekst: string; actie?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-5 mb-1.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tekst}</p>
      {actie}
    </div>
  )
}

/**
 * De rechterkolom: wie mailt er, wat loopt er (offertes, projecten, taken)
 * en wat is er eerder gemaild. Elke regel is een sprong; projectregels
 * nemen een gesleepte mail aan en koppelen hem aan dat project.
 */
export function Klantkaart({ mail, open, onSluiten, onZoekKlant, onSelectMail, eigenAdres }: Props) {
  const { navigateWithTab } = useNavigateWithTab()
  const afzenderEmail = mail ? extractSenderEmail(mail.van).toLowerCase() : ''
  const afzenderNaam = mail ? extractSenderName(mail.van) : ''
  const isEigen = !!eigenAdres && afzenderEmail === eigenAdres.toLowerCase()
  const contactEmail = isEigen && mail ? (mail.to_addresses?.[0]?.email || extractSenderEmail(mail.aan)).toLowerCase() : afzenderEmail
  const contactNaam = isEigen && mail ? (mail.to_addresses?.[0]?.name || extractSenderName(mail.aan)) : afzenderNaam

  const [klant, zetKlant] = useState<Klant | null>(null)
  const [laden, zetLaden] = useState(false)
  const [offertes, zetOffertes] = useState<Offerte[]>([])
  const [projecten, zetProjecten] = useState<Project[]>([])
  const [taken, zetTaken] = useState<Taak[]>([])
  const [mails, zetMails] = useState<Email[]>([])
  const [dialoog, zetDialoog] = useState(false)
  const [sleeptOver, zetSleeptOver] = useState<string | null>(null)
  const { body } = useBody(open && mail && !klant ? mail.id : null)

  useEffect(() => {
    if (!open || !contactEmail || contactEmail.length < 3) { zetKlant(null); return }
    let actueel = true
    zetLaden(true)
    ;(async () => {
      try {
        const klanten = await getKlantenGedeeld()
        let treffer = klanten.find((k) => k.email?.toLowerCase() === contactEmail || k.contactpersonen?.some((c) => c.email?.toLowerCase() === contactEmail))
        if (!treffer) {
          const id = await getKlantIdByContactEmail(contactEmail).catch(() => null)
          if (id) treffer = klanten.find((k) => k.id === id)
        }
        if (!treffer) treffer = zoekKlantVoorAfzender(klanten, contactEmail) || undefined
        if (actueel) zetKlant(treffer || null)
      } finally {
        if (actueel) zetLaden(false)
      }
    })()
    return () => { actueel = false }
  }, [open, contactEmail])

  useEffect(() => {
    if (!open || !klant) { zetOffertes([]); zetProjecten([]); zetTaken([]); return }
    let actueel = true
    Promise.all([getOffertesByKlant(klant.id).catch(() => []), getProjectenByKlant(klant.id).catch(() => [])]).then(async ([o, p]) => {
      if (!actueel) return
      zetOffertes(o.filter((x) => !['afgewezen', 'verlopen', 'gefactureerd'].includes(x.status)))
      const lopend = p.filter((x) => !['afgerond', 'gefactureerd'].includes(x.status))
      zetProjecten(lopend)
      if (!supabase) return
      const projectIds = p.map((x) => x.id)
      const delen = [`klant_id.eq.${klant.id}`]
      if (projectIds.length) delen.push(`project_id.in.(${projectIds.join(',')})`)
      const { data } = await supabase
        .from('taken')
        .select('id, titel, status, deadline, project_id, klant_id, toegewezen_aan, created_at, updated_at')
        .or(delen.join(','))
        .neq('status', 'klaar')
        .or('is_sjabloon.is.null,is_sjabloon.eq.false')
        .order('deadline', { ascending: true, nullsFirst: false })
        .limit(6)
      if (actueel) zetTaken((data || []) as Taak[])
    })
    return () => { actueel = false }
  }, [open, klant])

  useEffect(() => {
    if (!open || !contactEmail) { zetMails([]); return }
    let actueel = true
    getEmailsMetAdres(contactEmail, 5).then((m) => { if (actueel) zetMails(m) }).catch(() => {})
    return () => { actueel = false }
  }, [open, contactEmail])

  const dropOpProject = useCallback(async (e: React.DragEvent, project: Project) => {
    e.preventDefault()
    zetSleeptOver(null)
    const ruw = e.dataTransfer.getData(SLEEP_TYPE)
    if (!ruw) return
    try {
      const { emailId, threadId } = JSON.parse(ruw) as { emailId: string; threadId: string | null }
      await koppel('project', project.id, threadId ? { threadId } : { emailId })
      vergeetKoppelingChips(emailId, threadId)
      toast.success(`Gekoppeld aan ${project.naam}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Koppelen mislukt')
    }
  }, [])

  const avatar = useMemo(() => getAvatarStyle(klant?.bedrijfsnaam || contactNaam || contactEmail), [klant, contactNaam, contactEmail])
  const inhoud = body?.html || body?.tekst || mail?.body_text || ''

  if (!open) return null

  return (
    <aside
      className={cn(
        'absolute inset-y-0 right-0 z-30 hidden w-[340px] max-w-[85vw] flex-col border-l border-border bg-card lg:flex',
        'shadow-[-14px_0_36px_rgba(13,52,60,0.10)] overflow-hidden',
        'motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:duration-200',
      )}
      aria-label="Klantkaart"
    >
      <div className="flex items-center justify-between px-4 h-[52px] border-b border-border/70">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Klantkaart</p>
        <button type="button" onClick={onSluiten} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Klantkaart sluiten" title="Klantkaart sluiten">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!mail ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-[13px] text-muted-foreground leading-relaxed">Open een mail, dan staat hier wie het is en wat er loopt.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="flex items-start gap-3 pt-4">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 text-[14px] font-bold" style={{ backgroundColor: avatar.bg, color: avatar.text }}>
              {(klant?.bedrijfsnaam || contactNaam || contactEmail)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {laden ? (
                <Loader2 className="h-4 w-4 animate-spin text-petrol/50 mt-1" />
              ) : klant ? (
                <>
                  <button type="button" onClick={() => navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || klant.contactpersoon })} className="text-left font-heading text-[15px] font-bold text-foreground tracking-[-0.01em] hover:text-petrol transition-colors truncate block max-w-full">
                    {klant.bedrijfsnaam || klant.contactpersoon}
                  </button>
                  <p className="text-[12px] text-muted-foreground truncate">{klant.contactpersoon}{klant.status && klant.status !== 'actief' ? ` · ${klant.status}` : ''}</p>
                </>
              ) : (
                <>
                  <p className="font-heading text-[15px] font-bold text-foreground tracking-[-0.01em] truncate">{contactNaam || contactEmail}</p>
                  <p className="text-[12px] text-muted-foreground">Onbekende afzender</p>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-1.5 text-[12.5px]">
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-foreground/75 hover:text-petrol transition-colors min-w-0">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /><span className="truncate">{contactEmail}</span>
              </a>
            )}
            {klant?.telefoon && (
              <a href={`tel:${klant.telefoon}`} className="flex items-center gap-2 text-foreground/75 hover:text-petrol transition-colors">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /><span>{klant.telefoon}</span>
              </a>
            )}
            {klant?.stad && (
              <p className="flex items-center gap-2 text-foreground/75"><Building2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /><span className="truncate">{[klant.adres, klant.stad].filter(Boolean).join(', ')}</span></p>
            )}
          </div>

          {!klant && !laden && contactEmail && (
            <button type="button" onClick={() => zetDialoog(true)} className="mt-3 w-full h-9 rounded-lg inline-flex items-center justify-center gap-2 text-[12.5px] font-semibold text-petrol bg-petrol/[0.08] hover:bg-petrol/[0.14] transition-colors">
              <UserPlus className="h-3.5 w-3.5" /> Toevoegen als klant
            </button>
          )}
          {klant && (
            <button type="button" onClick={() => onZoekKlant(klant.id, klant.bedrijfsnaam || klant.contactpersoon)} className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-petrol hover:underline underline-offset-2">
              <Search className="h-3 w-3" /> Alle mail van dit bedrijf
            </button>
          )}

          {klant && (
            <>
              <Kop tekst="Open offertes" />
              {offertes.length === 0 ? <p className="text-[12px] text-muted-foreground">Geen open offertes</p> : offertes.slice(0, 5).map((o) => (
                <button key={o.id} type="button" onClick={() => navigateWithTab({ path: `/offertes/${o.id}/bewerken`, label: o.nummer })} className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-background rounded-lg px-1.5 -mx-1.5 transition-colors group">
                  <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0">{o.nummer}</span>
                  <span className="text-[12.5px] text-foreground/85 truncate flex-1">{o.titel}</span>
                  <span className="font-mono text-[11.5px] tabular-nums text-foreground/80">{formatCurrency(o.totaal)}</span>
                  <Status code={o.status} label={OFFERTE_STATUS[o.status] || o.status} />
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-petrol flex-shrink-0" />
                </button>
              ))}

              <Kop tekst="Lopende projecten" actie={<span className="text-[10px] text-muted-foreground/70 inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> sleep een mail hierheen</span>} />
              {projecten.length === 0 ? <p className="text-[12px] text-muted-foreground">Geen lopende projecten</p> : projecten.slice(0, 6).map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => navigateWithTab({ path: `/projecten/${pr.id}`, label: pr.naam })}
                  onDragOver={(e) => { if (e.dataTransfer.types.includes(SLEEP_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'link'; zetSleeptOver(pr.id) } }}
                  onDragLeave={() => zetSleeptOver((s) => (s === pr.id ? null : s))}
                  onDrop={(e) => dropOpProject(e, pr)}
                  className={cn('w-full flex items-center gap-2 py-1.5 text-left rounded-lg px-1.5 -mx-1.5 transition-colors group', sleeptOver === pr.id ? 'bg-petrol/[0.12] ring-2 ring-petrol/50' : 'hover:bg-background')}
                >
                  {pr.project_nummer && <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0">{pr.project_nummer}</span>}
                  <span className="text-[12.5px] text-foreground/85 truncate flex-1">{pr.naam}</span>
                  <Status code={pr.status} label={PROJECT_FASE[pr.status] || pr.status} />
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-petrol flex-shrink-0" />
                </button>
              ))}

              <Kop tekst="Open taken" />
              {taken.length === 0 ? <p className="text-[12px] text-muted-foreground">Geen open taken</p> : taken.map((t) => (
                <button key={t.id} type="button" onClick={() => navigateWithTab({ path: t.project_id ? `/projecten/${t.project_id}?tab=taken` : '/taken', label: t.titel })} className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-background rounded-lg px-1.5 -mx-1.5 transition-colors group">
                  <span className="text-[12.5px] text-foreground/85 truncate flex-1">{t.titel}</span>
                  {t.deadline && <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{formatShortDate(t.deadline)}</span>}
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-petrol flex-shrink-0" />
                </button>
              ))}
            </>
          )}

          <Kop tekst="Laatste mail van dit adres" />
          {mails.length === 0 ? <p className="text-[12px] text-muted-foreground">Nog geen eerdere mail</p> : mails.map((m) => (
            <button key={m.id} type="button" onClick={() => onSelectMail(m.id)} className={cn('w-full flex items-center gap-2 py-1.5 text-left hover:bg-background rounded-lg px-1.5 -mx-1.5 transition-colors', m.id === mail.id && 'bg-petrol/[0.06]')}>
              <span className="text-[12.5px] text-foreground/85 truncate flex-1">{m.onderwerp || '(geen onderwerp)'}</span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground flex-shrink-0">{formatShortDate(m.datum)}</span>
            </button>
          ))}
        </div>
      )}

      <KlantToevoegenDialog
        open={dialoog}
        onSluiten={() => zetDialoog(false)}
        afzenderNaam={contactNaam}
        afzenderEmail={contactEmail}
        inhoud={inhoud}
        onAangemaakt={(k) => { zetKlant(k); if (mail) { void koppel('klant', k.id, mail.thread_id ? { threadId: mail.thread_id } : { emailId: mail.id }).then(() => vergeetKoppelingChips(mail.id, mail.thread_id)).catch(() => {}) } }}
      />
    </aside>
  )
}
