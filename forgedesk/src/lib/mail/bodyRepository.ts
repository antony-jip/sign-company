import { useCallback, useEffect, useState } from 'react'
import type { EmailBody, EmailLijstItem } from './types'
import { mailStore } from './mailStore'
import { splitsCitaat } from './quoted'
import { getEmailBodiesUitTabel } from '@/services/emailService'
import { readEmailFromIMAP, prefetchEmailBodies } from '@/services/gmailService'
import { leesBodies, bewaarBodies } from '@/lib/mailCache'

export type BodyPrioriteit = 'nu' | 'zichtbaar' | 'later'

const RANG: Record<BodyPrioriteit, number> = { nu: 0, zichtbaar: 1, later: 2 }
const MAX_GELIJKTIJDIG = 3
const BATCH = 20

const IMAP_MAP: Record<string, string> = {
  inbox: 'INBOX', verzonden: 'verzonden', concepten: 'concepten', prullenbak: 'prullenbak', gepland: 'gepland', archief: 'archief',
}

interface Taak {
  id: string
  prioriteit: BodyPrioriteit
  gestart: boolean
  belofte: Promise<EmailBody>
  klaar: (body: EmailBody) => void
  mislukt: (fout: Error) => void
}

const geheugen = new Map<string, EmailBody>()
const taken = new Map<string, Taak>()
/**
 * Wat niet op te halen was, met het tijdstip erbij. Zonder deze markering ging
 * een onhaalbare body bij elke storemutatie opnieuw de wachtrij in, en dat is
 * per keer een IndexedDB-lees, twee queries en een IMAP-ronde. De markering
 * vervalt na een minuut, of eerder als de gebruiker zelf "Opnieuw" kiest.
 */
const mislukkingen = new Map<string, { op: number; reden: string }>()
const MISLUKT_WACHTTIJD_MS = 60_000
let actief = 0

/** De reden zolang de wachttijd loopt, anders null (en de markering vervalt). */
function recentMislukt(emailId: string): string | null {
  const eerder = mislukkingen.get(emailId)
  if (!eerder) return null
  if (Date.now() - eerder.op >= MISLUKT_WACHTTIJD_MS) {
    mislukkingen.delete(emailId)
    return null
  }
  return eerder.reden
}

/** Handmatig opnieuw proberen: zonder id de hele lijst. */
export function vergeetMislukt(emailId?: string): void {
  if (emailId) mislukkingen.delete(emailId)
  else mislukkingen.clear()
}

export function bodyUitGeheugen(emailId: string): EmailBody | undefined {
  return geheugen.get(emailId)
}

/** Het geciteerde deel afsplitsen als de server dat nog niet deed. */
function metCitaat(body: EmailBody): EmailBody {
  if (body.quotedHtml !== null || !body.html) return body
  const { eigen, geciteerd } = splitsCitaat(body.html)
  return geciteerd ? { ...body, html: eigen, quotedHtml: geciteerd } : body
}

function bewaar(bodies: EmailBody[], eigenaar: string): void {
  if (bodies.length === 0) return
  void bewaarBodies(
    bodies.map((b) => ({ id: b.emailId, html: b.html || '', tekst: b.tekst, quotedHtml: b.quotedHtml })),
    eigenaar,
  )
}

export function haalBody(emailId: string, prioriteit: BodyPrioriteit): Promise<EmailBody> {
  const bekend = geheugen.get(emailId)
  if (bekend) return Promise.resolve(bekend)
  const lopend = taken.get(emailId)
  if (lopend) {
    if (RANG[prioriteit] < RANG[lopend.prioriteit]) lopend.prioriteit = prioriteit
    return lopend.belofte
  }
  // Prioriteit 'nu' is een gebruiker die deze mail wil openen; die mag nooit
  // op de negatieve markering van een eerdere achtergrondpoging stuklopen.
  if (prioriteit === 'nu') mislukkingen.delete(emailId)
  const eerderMislukt = recentMislukt(emailId)
  if (eerderMislukt) return Promise.reject(new Error(eerderMislukt))
  let klaar!: Taak['klaar']
  let mislukt!: Taak['mislukt']
  const belofte = new Promise<EmailBody>((resolve, reject) => { klaar = resolve; mislukt = reject })
  taken.set(emailId, { id: emailId, prioriteit, gestart: false, belofte, klaar, mislukt })
  pomp()
  return belofte
}

export function prefetchBodies(ids: string[], prioriteit: 'zichtbaar' | 'later'): void {
  for (const id of ids) {
    if (geheugen.has(id) || taken.has(id) || recentMislukt(id)) continue
    void haalBody(id, prioriteit).catch(() => {})
  }
}

/**
 * Eén wachtrij: de geselecteerde mail gaat vóór wat in beeld staat, en dat
 * gaat vóór de rest. Per beurt gaat een batch van dezelfde prioriteit mee,
 * omdat IndexedDB en email_bodies goedkoper zijn per twintig dan per één.
 */
function pomp(): void {
  while (actief < MAX_GELIJKTIJDIG) {
    const wachtend = [...taken.values()].filter((t) => !t.gestart)
    if (wachtend.length === 0) return
    wachtend.sort((a, b) => RANG[a.prioriteit] - RANG[b.prioriteit])
    const kop = wachtend[0]
    const batch = wachtend.filter((t) => t.prioriteit === kop.prioriteit).slice(0, BATCH)
    for (const t of batch) t.gestart = true
    actief += 1
    void verwerk(batch).finally(() => {
      actief -= 1
      pomp()
    })
  }
}

function rond(taak: Taak, body: EmailBody): void {
  const compleet = metCitaat(body)
  geheugen.set(taak.id, compleet)
  taken.delete(taak.id)
  mislukkingen.delete(taak.id)
  taak.klaar(compleet)
}

function faal(taak: Taak, reden: string): void {
  taken.delete(taak.id)
  mislukkingen.set(taak.id, { op: Date.now(), reden })
  taak.mislukt(new Error(reden))
}

async function verwerk(batch: Taak[]): Promise<void> {
  const eigenaar = await mailStore.eigenaarSleutel()
  let open = new Map(batch.map((t) => [t.id, t]))

  const bewaard = await leesBodies([...open.keys()], eigenaar).catch(() => new Map())
  for (const [id, rij] of bewaard) {
    const taak = open.get(id)
    if (!taak) continue
    rond(taak, { emailId: id, html: rij.html || null, tekst: rij.tekst ?? null, quotedHtml: rij.quotedHtml ?? null })
    open.delete(id)
  }
  if (open.size === 0) return

  open = await uitTabel(open, eigenaar)
  if (open.size === 0) return

  // Wat de database niet heeft moet van de mailserver komen. Voor 'later'
  // stoppen we hier: een IMAP-ronde voor mail die misschien nooit opengaat
  // is precies wat de oude lijst traag maakte.
  const prioriteit = batch[0].prioriteit
  if (prioriteit === 'later') {
    for (const taak of open.values()) faal(taak, 'Nog niet opgehaald')
    return
  }

  // Per map én per postvak: de prefetch opent een IMAP-verbinding, en zonder
  // postvak is dat altijd het standaardpostvak. Dan haalt hij uid's op uit de
  // verkeerde mailbox.
  const perMap = new Map<string, { map: string; accountId?: string; ids: string[] }>()
  for (const id of open.keys()) {
    const item = mailStore.item(id)
    const map = imapMapVoor(item)
    const accountId = item?.account_id || undefined
    const sleutel = `${map}\u0000${accountId || ''}`
    const groep = perMap.get(sleutel) || { map, accountId, ids: [] }
    groep.ids.push(id)
    perMap.set(sleutel, groep)
  }
  await Promise.all([...perMap.values()].map((g) => prefetchEmailBodies(g.map, g.ids.length, g.accountId)))
  open = await uitTabel(open, eigenaar)
  if (open.size === 0) return

  if (prioriteit !== 'nu') {
    for (const taak of open.values()) faal(taak, 'Nog niet opgehaald')
    return
  }
  for (const taak of open.values()) {
    const item = mailStore.item(taak.id)
    const uid = item ? Number(item.uid ?? item.gmail_id) : NaN
    if (!item || !Number.isFinite(uid) || uid <= 0) { faal(taak, 'Geen uid bekend'); continue }
    try {
      const detail = await readEmailFromIMAP(uid, imapMapVoor(item), item.account_id || undefined)
      const body: EmailBody = { emailId: taak.id, html: detail.bodyHtml || null, tekst: detail.bodyText || null, quotedHtml: null }
      if (!body.html && !body.tekst) { faal(taak, 'Lege mail'); continue }
      const compleet = metCitaat(body)
      bewaar([compleet], eigenaar)
      rond(taak, compleet)
    } catch (e) {
      faal(taak, e instanceof Error ? e.message : 'Ophalen mislukt')
    }
  }
}

async function uitTabel(open: Map<string, Taak>, eigenaar: string): Promise<Map<string, Taak>> {
  const rijen = await getEmailBodiesUitTabel([...open.keys()]).catch(() => [])
  const teBewaren: EmailBody[] = []
  for (const rij of rijen) {
    const taak = open.get(rij.emailId)
    if (!taak || (!rij.html && !rij.tekst)) continue
    const compleet = metCitaat(rij)
    teBewaren.push(compleet)
    rond(taak, compleet)
    open.delete(rij.emailId)
  }
  bewaar(teBewaren, eigenaar)
  return open
}

function imapMapVoor(item: EmailLijstItem | undefined): string {
  if (!item) return 'INBOX'
  if (item.imap_folder) return item.imap_folder
  return IMAP_MAP[item.map] || 'INBOX'
}

export function useBody(emailId: string | null): { body: EmailBody | null; laden: boolean; fout?: string; opnieuw: () => void } {
  const [poging, zetPoging] = useState(0)
  const [stand, zetStand] = useState<{ id: string | null; body: EmailBody | null; laden: boolean; fout?: string }>(() => ({
    id: emailId,
    body: emailId ? geheugen.get(emailId) ?? null : null,
    laden: !!emailId && !geheugen.has(emailId),
  }))
  const opnieuw = useCallback(() => {
    if (!emailId) return
    vergeetMislukt(emailId)
    zetPoging((n) => n + 1)
  }, [emailId])
  useEffect(() => {
    if (!emailId) { zetStand({ id: null, body: null, laden: false }); return }
    const bekend = geheugen.get(emailId)
    if (bekend) { zetStand({ id: emailId, body: bekend, laden: false }); return }
    let actueel = true
    zetStand({ id: emailId, body: null, laden: true })
    haalBody(emailId, 'nu')
      .then((body) => { if (actueel) zetStand({ id: emailId, body, laden: false }) })
      .catch((e: Error) => { if (actueel) zetStand({ id: emailId, body: null, laden: false, fout: e.message }) })
    return () => { actueel = false }
  }, [emailId, poging])
  if (stand.id !== emailId) return { body: null, laden: !!emailId, opnieuw }
  return { body: stand.body, laden: stand.laden, fout: stand.fout, opnieuw }
}
