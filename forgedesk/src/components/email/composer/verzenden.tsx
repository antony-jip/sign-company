import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ComposerDocument } from '@/lib/mail/types'
import { getKlant, getOfferte, getProject } from '@/services/supabaseService'
import { getEmail } from '@/services/emailService'
import { downloadEmailAttachment, sendEmail as sendEmailViaApi } from '@/services/gmailService'
import { uploadBijlagenMetLinkFallback, valideerBijlagen } from '@/utils/groteBijlagen'
import { inlineLokaleAfbeeldingen } from '@/utils/mailAfbeeldingen'
import { sendInBackground } from '@/utils/sendInBackground'
import { logger } from '@/utils/logger'
import { MailStatusToast } from '@/components/shared/MailStatusToast'
import { bestandSleutel, koppelingVan, ontvangersNaarString, splitsCitaat, vulVelden, type VeldWaarden } from './document'

// ─── Velden uit de koppelingen ───────────────────────────────────

/**
 * Waarden voor `{{contactpersoon}}` en consorten. Eerst de koppelingen
 * (klant, project, offerte), dan wat de eerste ontvanger-chip meebrengt.
 * Onbekend blijft leeg; vulVelden maakt er dan niets van.
 */
export async function waardenUitKoppelingen(doc: ComposerDocument): Promise<VeldWaarden> {
  const waarden: VeldWaarden = {}
  const eerste = doc.aan[0]
  if (eerste?.naam) waarden.contactpersoon = eerste.naam
  if (eerste?.bedrijf) waarden.bedrijfsnaam = eerste.bedrijf

  let klantId = koppelingVan(doc, 'klant')
  const projectId = koppelingVan(doc, 'project')
  const offerteId = koppelingVan(doc, 'offerte')

  try {
    if (projectId) {
      const project = await getProject(projectId)
      if (project) {
        waarden.project_naam = project.naam
        klantId = klantId || project.klant_id
      }
    }
    if (offerteId) {
      const offerte = await getOfferte(offerteId)
      if (offerte) {
        waarden.offerte_nummer = offerte.nummer
        klantId = klantId || offerte.klant_id
      }
    }
    if (klantId) {
      const klant = await getKlant(klantId)
      if (klant) {
        waarden.bedrijfsnaam = klant.bedrijfsnaam || waarden.bedrijfsnaam
        waarden.contactpersoon = klant.contactpersoon || waarden.contactpersoon
      }
    }
  } catch (err) {
    logger.warn('Koppelingen voor velden laden mislukt:', err)
  }
  return waarden
}

// ─── Payload ─────────────────────────────────────────────────────

export type VerzendBijlage = { filename: string; storagePath?: string; size?: number; content?: string; encoding?: 'base64'; cleanupAfter?: boolean }

export interface VerzendContext {
  /** File-objecten achter bijlagen met bron 'upload', op naam::grootte. */
  bestanden: Map<string, File>
  /** Handtekening als HTML, zonder de witregels ervoor. */
  handtekeningHtml: string
  /** Platte tekst van de editor, voor de tekstversie van de mail. */
  tekst: string
}

export interface VerzendPayload {
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  html: string
  attachments?: VerzendBijlage[]
}

/**
 * Van document naar wat send-email verwacht. Bijlagen: uploads gaan via
 * Storage (boven de 25 MB als downloadlink), storage-bestanden op pad,
 * originele bijlagen van een doorgestuurde mail worden zoals nu via IMAP
 * opgehaald en als base64 meegegeven; send-email kent nog geen verwijzing
 * op emailId.
 */
export async function bouwVerzending(doc: ComposerDocument, ctx: VerzendContext): Promise<VerzendPayload> {
  const waarden = await waardenUitKoppelingen(doc)
  const { eigen, citaat } = splitsCitaat(doc.html)

  const uploads: File[] = []
  const attachments: VerzendBijlage[] = []
  for (const b of doc.bijlagen) {
    if (b.bron === 'upload') {
      const file = ctx.bestanden.get(bestandSleutel(b.naam, b.grootte))
      if (file) uploads.push(file)
      else toast.warning(`Bijlage "${b.naam}" is niet meer beschikbaar en gaat niet mee`)
    } else if (b.bron === 'storage' && b.pad) {
      attachments.push({ filename: b.naam, storagePath: b.pad, size: b.grootte, cleanupAfter: false })
    } else if (b.bron === 'origineel' && b.emailId) {
      try {
        const bron = await getEmail(b.emailId)
        const uid = Number(bron?.gmail_id)
        if (!bron || Number.isNaN(uid)) throw new Error('Bronmail niet gevonden')
        const folder = (bron as { imap_folder?: string | null }).imap_folder || 'INBOX'
        const opgehaald = await downloadEmailAttachment(uid, folder, b.naam)
        if (opgehaald?.content) attachments.push({ filename: opgehaald.filename || b.naam, content: opgehaald.content, encoding: 'base64' })
        else throw new Error('Lege bijlage')
      } catch (err) {
        logger.warn(`Originele bijlage "${b.naam}" ophalen mislukt:`, err)
        toast.warning(`Originele bijlage "${b.naam}" kon niet worden opgehaald`)
      }
    }
  }

  let linksHtml = ''
  let linksText = ''
  if (uploads.length) {
    const fout = valideerBijlagen(uploads)
    if (fout) throw new Error(fout)
    const payload = await uploadBijlagenMetLinkFallback(uploads)
    attachments.push(...(payload.attachments ?? []))
    linksHtml = payload.linksHtml
    linksText = payload.linksText
  }

  // Een foto die de browser aan een blob:-verwijzing hing wordt hier
  // alsnog ingesloten; de server maakt er een cid-bijlage van.
  const bericht = await inlineLokaleAfbeeldingen(vulVelden(eigen, waarden))
  const handtekening = doc.handtekening && ctx.handtekeningHtml ? `<br><br>${ctx.handtekeningHtml}` : ''
  const html = `${bericht}${handtekening}${linksHtml}${vulVelden(citaat, waarden)}`

  return {
    to: ontvangersNaarString(doc.aan),
    cc: doc.cc.length ? ontvangersNaarString(doc.cc) : undefined,
    bcc: doc.bcc.length ? ontvangersNaarString(doc.bcc) : undefined,
    subject: vulVelden(doc.onderwerp, waarden),
    body: `${vulVelden(ctx.tekst, waarden)}${linksText}`,
    html,
    attachments: attachments.length ? attachments : undefined,
  }
}

export async function verstuurPayload(doc: ComposerDocument, payload: VerzendPayload): Promise<{ id?: string }> {
  const resp = await sendEmailViaApi(payload.to, payload.subject, payload.body, {
    cc: payload.cc,
    bcc: payload.bcc,
    html: payload.html,
    attachments: payload.attachments,
    scheduledAt: doc.verzendOp,
    wacht_op_reactie: doc.opvolgen,
    in_reply_to: doc.inReplyTo,
    references: doc.references,
    thread_id: doc.threadId,
  })
  return { id: (resp as { id?: string }).id }
}

// ─── Later verzenden ─────────────────────────────────────────────

export interface PlanOptie { label: string; datum: () => Date }

export function planOpties(nu = new Date()): PlanOptie[] {
  return [
    { label: 'Over 1 uur', datum: () => new Date(nu.getTime() + 60 * 60 * 1000) },
    { label: 'Vanavond 18:00', datum: () => { const d = new Date(nu); d.setHours(18, 0, 0, 0); if (d <= nu) d.setDate(d.getDate() + 1); return d } },
    { label: 'Morgen 09:00', datum: () => { const d = new Date(nu); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d } },
    { label: 'Maandag 09:00', datum: () => { const d = new Date(nu); const dag = d.getDay(); const tot = dag === 0 ? 1 : dag === 1 ? 7 : 8 - dag; d.setDate(d.getDate() + tot); d.setHours(9, 0, 0, 0); return d } },
  ]
}

/** "ma 09:00", of met datum als het verder weg is dan een week. */
export function planLabel(d: Date, nu = new Date()): string {
  const tijd = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  const dagen = (d.getTime() - nu.getTime()) / 86400000
  if (dagen < 6) return `${d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')} ${tijd}`
  return `${d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')} ${tijd}`
}

// ─── Undo-toast ──────────────────────────────────────────────────

interface UndoToastProps {
  seconden: number
  onder?: string
  onOngedaan: () => void
}

function UndoToast({ seconden, onder, onOngedaan }: UndoToastProps) {
  const [loopt, setLoopt] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setLoopt(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div className="min-w-[240px]">
      <div className="flex items-center justify-between gap-3">
        <MailStatusToast titel="Verzonden" onder={onder} />
        <button
          type="button"
          onClick={onOngedaan}
          className="flex-shrink-0 text-[12px] font-semibold text-petrol hover:text-flame transition-colors"
        >
          Ongedaan maken
        </button>
      </div>
      <div className="mt-2 h-[2px] w-full rounded-full bg-petrol/10 overflow-hidden">
        <div
          className="h-full bg-petrol/60 rounded-full"
          style={{ width: loopt ? '0%' : '100%', transition: `width ${seconden}s linear` }}
        />
      </div>
    </div>
  )
}

interface BedenktijdOpties {
  seconden: number
  onder?: string
  opvolgen?: boolean
  onOngedaan: () => void
}

/**
 * Verzenden met bedenktijd: eerst N seconden een toast met "Ongedaan maken",
 * pas daarna de echte verzending via sendInBackground (retry en outbox
 * blijven zo intact). 0 seconden = direct.
 */
export function verzendMetBedenktijd(task: () => Promise<void>, opties: BedenktijdOpties): void {
  const opvolgTekst = opties.opvolgen ? 'staat in Opvolgen' : opties.onder
  const start = () => sendInBackground(task, {
    loading: 'Versturen',
    success: 'Email verzonden',
    loadingRender: () => <MailStatusToast bezig titel="Versturen" onder={opties.onder} />,
    successRender: () => <MailStatusToast titel="Verzonden" onder={opvolgTekst} />,
  })

  if (opties.seconden <= 0) { start(); return }

  let timer: ReturnType<typeof setTimeout> | null = null
  const toastId = toast.custom(
    (id) => (
      <UndoToast
        seconden={opties.seconden}
        onder={opties.onder}
        onOngedaan={() => {
          if (timer) clearTimeout(timer)
          timer = null
          toast.dismiss(id)
          opties.onOngedaan()
        }}
      />
    ),
    { duration: Infinity },
  )
  timer = setTimeout(() => {
    timer = null
    toast.dismiss(toastId)
    start()
  }, opties.seconden * 1000)
}
