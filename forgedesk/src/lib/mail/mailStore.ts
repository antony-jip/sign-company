import type { EmailLijstItem, MailMap, Postvak, PostvakKeuze, SyncStatus, ThreadInfo } from './types'
import { MAIL_MAPPEN } from './types'
import { getPostvakken } from '@/services/postvakService'
import { wijsToe as wijsToeInDb } from '@/services/teamInboxService'
import {
  eersteRegelVoor, getRegels, isGezien, laatLos, markeerGezien, neemInBehandeling,
  regelsBeschikbaar, vergeetGezien, zorgVoorGezien,
  type MailRegel,
} from '@/services/mailRegelService'
import { koppel as koppelAan } from '@/services/koppelingService'
import {
  getEmailsPage, searchEmailsFTS, getMapTellers, getThreadInfos, getThreadItems, getSyncStatus,
  updateEmail, deleteEmail,
  type EmailPageCursor,
} from '@/services/emailService'
import { imapActie, type ImapActie } from './imapActie'
import { leesMapLijst, schrijfMapLijst, maakEigenaarSleutel } from '@/lib/mailCache'
import { supabase } from '@/services/supabaseClient'
import { getOrgId } from '@/services/supabaseHelpers'

export type LijstSleutel = MailMap | 'zoek'

export interface LijstStand {
  ids: string[]
  cursor: EmailPageCursor | null
  laden: boolean
  klaar: boolean
  geladen: boolean
  fout?: string
}

export interface MailState {
  versie: number
  items: ReadonlyMap<string, EmailLijstItem>
  lijsten: ReadonlyMap<LijstSleutel, LijstStand>
  threads: ReadonlyMap<string, ThreadInfo>
  threadLeden: ReadonlyMap<string, { ids: string[]; laden: boolean }>
  tellers: Record<MailMap, number>
  sync: SyncStatus
  postvakken: Postvak[]
  actiefPostvak: PostvakKeuze
}

/** Welk postvak de gebruiker het laatst koos; per apparaat, niet per sessie. */
export const POSTVAK_VOORKEUR = 'doen_mail_postvak'

export type Undo = { ongedaan: () => void; klaarOver: number }

export const PAGINA_GROOTTE = 100
export const ZOEK_GROOTTE = 50
export const UNDO_MS = 5000
const CACHE_GROOTTE = 100
const CACHE_DEBOUNCE_MS = 500

const ARCHIEF_PATCH = { map: 'archief', labels: ['archief'] }
const PRULLENBAK_PATCH = { map: 'prullenbak', labels: ['prullenbak'] }
const MAP_LABELS = new Set(['inbox', 'archief', 'prullenbak'])

function legeTellers(): Record<MailMap, number> {
  return Object.fromEntries(MAIL_MAPPEN.map((m) => [m, 0])) as Record<MailMap, number>
}

function legeStand(): LijstStand {
  return { ids: [], cursor: null, laden: false, klaar: false, geladen: false }
}

/** Nieuwste eerst, en bij gelijke datum de hoogste id: dezelfde volgorde als de keyset-query. */
export function vergelijkNieuwsteEerst(a: EmailLijstItem, b: EmailLijstItem): number {
  const d = (b.datum || '').localeCompare(a.datum || '')
  return d !== 0 ? d : b.id.localeCompare(a.id)
}

/**
 * In welke lijsten een mail thuishoort. Spiegelt pasMapFilterToe in
 * emailService: een gesnoozde mail zit in Gesnoozed en niet in Inbox, de
 * Sales-vlaggen staan los van de map.
 */
export function mappenVoor(item: EmailLijstItem): MailMap[] {
  const uit: MailMap[] = []
  if (item.snoozed_until) uit.push('gesnoozed')
  else if (item.map === 'gepland') uit.push('ingepland')
  else if ((MAIL_MAPPEN as string[]).includes(item.map)) uit.push(item.map as MailMap)
  if (item.wacht_op_reactie) uit.push(item.beantwoord ? 'beantwoord' : 'opvolgen')
  return uit
}

type Luisteraar = () => void
type Wachtend = {
  timer: ReturnType<typeof setTimeout>
  flush: (keepalive?: boolean) => void
  /** Laat deze ids vallen: niet wegschrijven, niet herstellen. */
  annuleer: (ids: string[]) => void
  /** Velden die optimistisch gezet zijn en dus nog niet op de server staan. */
  velden: string[]
}

class MailStore {
  private items = new Map<string, EmailLijstItem>()
  private lijsten = new Map<LijstSleutel, LijstStand>()
  private threads = new Map<string, ThreadInfo>()
  private threadLeden = new Map<string, { ids: string[]; laden: boolean }>()
  private tellers = legeTellers()
  private sync: SyncStatus = { status: 'ok' }
  private postvakken: Postvak[] = []
  private actiefPostvak: PostvakKeuze = 'alle'
  private postvakkenBelofte: Promise<Postvak[]> | null = null
  private regels: MailRegel[] = []
  private regelsBelofte: Promise<MailRegel[]> | null = null
  private versie = 0
  private snapshot: MailState | null = null
  private luisteraars = new Set<Luisteraar>()
  private eigenaar: string | null = null
  private eigenaarBelofte: Promise<string> | null = null
  private cacheTimers = new Map<MailMap, ReturnType<typeof setTimeout>>()
  private wachtend = new Map<string, Wachtend>()
  private zoekQuery = ''

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flushAlles({ keepalive: true }))
      try {
        const bewaard = localStorage.getItem(POSTVAK_VOORKEUR)
        if (bewaard) this.actiefPostvak = bewaard
      } catch { /* storage geblokkeerd */ }
    }
  }

  // ── useSyncExternalStore ──

  subscribe = (cb: Luisteraar): (() => void) => {
    this.luisteraars.add(cb)
    return () => { this.luisteraars.delete(cb) }
  }

  getVersie = (): number => this.versie

  getSnapshot = (): MailState => {
    if (this.snapshot && this.snapshot.versie === this.versie) return this.snapshot
    this.snapshot = {
      versie: this.versie,
      items: this.items,
      lijsten: this.lijsten,
      threads: this.threads,
      threadLeden: this.threadLeden,
      tellers: this.tellers,
      sync: this.sync,
      postvakken: this.postvakken,
      actiefPostvak: this.actiefPostvak,
    }
    return this.snapshot
  }

  private meld(): void {
    this.versie += 1
    for (const cb of this.luisteraars) cb()
  }

  // ── Eigenaar en reset ──

  /** Wie de mailbox is; wisselt de eigenaar, dan gaat alles leeg. */
  stelEigenaarIn(userId: string | null | undefined, organisatieId: string | null | undefined): void {
    const sleutel = maakEigenaarSleutel(userId, organisatieId)
    if (sleutel === this.eigenaar) return
    this.eigenaar = sleutel
    this.eigenaarBelofte = Promise.resolve(sleutel)
    this.reset()
  }

  reset(): void {
    this.flushAlles()
    this.items = new Map()
    this.lijsten = new Map()
    this.threads = new Map()
    this.threadLeden = new Map()
    this.tellers = legeTellers()
    this.sync = { status: 'ok' }
    this.zoekQuery = ''
    this.postvakken = []
    this.postvakkenBelofte = null
    this.regels = []
    this.regelsBelofte = null
    for (const t of this.cacheTimers.values()) clearTimeout(t)
    this.cacheTimers.clear()
    this.meld()
  }

  // ── Postvakken ──

  getPostvakkenLokaal(): Postvak[] {
    return this.postvakken
  }

  /** Het id waarop de lijst-query filtert; 'alle' of een onbekend postvak levert geen filter. */
  /**
   * "Alle postvakken" met meer dan één postvak: dan moet de lijstquery
   * `account_id` erbij halen, want zonder postvakfilter komt dat veld niet uit
   * emails_list_view. Met één postvak is dat een extra ronde voor niets.
   */
  private wilPostvakKolom(): boolean {
    return this.postvakken.length > 1 && this.actiefAccountId() === null
  }

  actiefAccountId(): string | null {
    if (this.actiefPostvak === 'alle') return null
    return this.postvakken.some((p) => p.id === this.actiefPostvak) ? this.actiefPostvak : null
  }

  actiefPostvakObject(): Postvak | null {
    const id = this.actiefAccountId()
    return id ? this.postvakken.find((p) => p.id === id) ?? null : null
  }

  async laadPostvakken(opnieuw = false): Promise<Postvak[]> {
    if (this.postvakkenBelofte && !opnieuw) return this.postvakkenBelofte
    this.postvakkenBelofte = getPostvakken()
      .then((lijst) => {
        this.postvakken = lijst
        // Een bewaard postvak dat niet meer bestaat valt terug op alles.
        if (this.actiefPostvak !== 'alle' && !lijst.some((p) => p.id === this.actiefPostvak)) {
          this.actiefPostvak = 'alle'
        }
        this.meld()
        return lijst
      })
      .catch(() => {
        this.postvakken = []
        return []
      })
    return this.postvakkenBelofte
  }

  // ── Regels ──

  async laadRegels(opnieuw = false): Promise<MailRegel[]> {
    if (this.regelsBelofte && !opnieuw) return this.regelsBelofte
    this.regelsBelofte = getRegels().then((lijst) => { this.regels = lijst; return lijst }).catch(() => [])
    return this.regelsBelofte
  }

  regelsLokaal(): MailRegel[] {
    return this.regels
  }

  /**
   * Regels op mail die ze nog niet gezien heeft. Draait bij het laden van de
   * inbox en bij elke realtime-INSERT; `doen_mail_regels_gezien` houdt bij wat
   * al langs is geweest, want de database heeft daar geen kolom voor.
   */
  /**
   * Twee instappunten (het laden van de inbox en een realtime-INSERT) kunnen
   * elkaar overlappen. Markeren gebeurt daarom synchroon vóór de eerste await,
   * en de ids van deze ronde worden geclaimd zodat de andere lus ze overslaat;
   * anders draait een regel twee keer en archiveert hij op IMAP dubbel.
   */
  async pasRegelsToe(items: EmailLijstItem[]): Promise<number> {
    if (!regelsBeschikbaar() || items.length === 0) return 0
    await zorgVoorGezien()
    const regels = await this.laadRegels()
    if (regels.length === 0) return 0

    const kandidaten: EmailLijstItem[] = []
    for (const item of items) {
      if (isGezien(item.id)) continue
      kandidaten.push(item)
    }
    const geclaimd = new Set(neemInBehandeling(kandidaten.map((i) => i.id)))
    if (geclaimd.size === 0) return 0
    markeerGezien(geclaimd)

    let toegepast = 0
    try {
      for (const item of kandidaten) {
        if (!geclaimd.has(item.id)) continue
        if (item.map !== 'inbox') continue
        const regel = eersteRegelVoor(regels, item, null)
        if (!regel) continue
        toegepast += 1
        await this.voerRegelUit(regel, item)
      }
    } finally {
      laatLos(geclaimd)
    }
    return toegepast
  }

  private async voerRegelUit(regel: MailRegel, item: EmailLijstItem): Promise<void> {
    const acties = regel.acties
    if (acties.markeerGelezen) await this.zetGelezen([item.id], true).catch(() => {})
    if (acties.label) await this.label([item.id], acties.label, true).catch(() => {})
    if (acties.toewijzenAan) await this.wijsToe([item.id], acties.toewijzenAan).catch(() => {})
    if (acties.projectId) {
      await koppelAan('project', acties.projectId, item.thread_id ? { threadId: item.thread_id } : { emailId: item.id }).catch(() => {})
    }
    if (acties.archiveren) {
      // Een wachtende buffer op deze mail (net verwijderd, net hersteld) zou
      // onze archivering zo weer overschrijven.
      this.annuleerWachtend([item.id])
      this.patch(item.id, ARCHIEF_PATCH)
      await this.schrijfWeg([item.id], ARCHIEF_PATCH)
      this.imap('archive', [item.id])
    }
  }

  /** "Nu toepassen": de laatste N mails uit de inbox opnieuw langs de regels. */
  async pasRegelsToeOpBestaande(aantal = 200): Promise<number> {
    if (!regelsBeschikbaar()) return 0
    await this.laadRegels(true)
    const pagina = await getEmailsPage('inbox', null, aantal, this.actiefAccountId()) as unknown as EmailLijstItem[]
    for (const rij of pagina) this.neemOp(rij)
    // Zonder de gezien-lijst: dit is een uitdrukkelijke opdracht van de gebruiker.
    await zorgVoorGezien()
    vergeetGezien(pagina.map((rij) => rij.id))
    return this.pasRegelsToe(pagina)
  }

  zetActiefPostvak(keuze: PostvakKeuze): void {
    if (keuze === this.actiefPostvak) return
    this.actiefPostvak = keuze
    try { localStorage.setItem(POSTVAK_VOORKEUR, keuze) } catch { /* storage geblokkeerd */ }
    // De maplijsten hangen aan het postvak: alles opnieuw ophalen. De items
    // blijven staan zodat een open leesvenster niet leegvalt.
    this.flushAlles()
    this.lijsten = new Map()
    this.tellers = legeTellers()
    this.zoekQuery = ''
    this.meld()
    void this.laadTellers()
  }

  /** user-id + organisatie-id, de sleutel waaronder IndexedDB rijen van deze mailbox bewaart. */
  eigenaarSleutel(): Promise<string> {
    if (this.eigenaarBelofte) return this.eigenaarBelofte
    this.eigenaarBelofte = (async () => {
      let userId: string | undefined
      try {
        const sessie = supabase ? (await supabase.auth.getSession()).data.session : null
        userId = sessie?.user?.id
      } catch { /* zonder sessie geen cache */ }
      const orgId = userId ? await getOrgId().catch(() => undefined) : undefined
      const sleutel = maakEigenaarSleutel(userId, orgId)
      this.eigenaar = sleutel
      return sleutel
    })()
    return this.eigenaarBelofte
  }

  // ── Lezen ──

  item(id: string): EmailLijstItem | undefined {
    return this.items.get(id)
  }

  lijstStand(sleutel: LijstSleutel): LijstStand {
    return this.lijsten.get(sleutel) ?? legeStand()
  }

  lijstItems(sleutel: LijstSleutel): EmailLijstItem[] {
    const stand = this.lijsten.get(sleutel)
    if (!stand) return []
    const uit: EmailLijstItem[] = []
    for (const id of stand.ids) {
      const item = this.items.get(id)
      if (item) uit.push(item)
    }
    return uit
  }

  threadItems(threadId: string): EmailLijstItem[] {
    const leden = this.threadLeden.get(threadId)
    const ids = leden ? leden.ids : [...this.items.values()].filter((i) => i.thread_id === threadId).map((i) => i.id)
    return ids
      .map((id) => this.items.get(id))
      .filter((i): i is EmailLijstItem => !!i)
      .sort((a, b) => -vergelijkNieuwsteEerst(a, b))
  }

  threadInfo(threadId: string): ThreadInfo | undefined {
    return this.threads.get(threadId)
  }

  // ── Lijsten laden ──

  private stand(sleutel: LijstSleutel): LijstStand {
    let s = this.lijsten.get(sleutel)
    if (!s) {
      s = legeStand()
      this.lijsten.set(sleutel, s)
    }
    return s
  }

  private zetStand(sleutel: LijstSleutel, deel: Partial<LijstStand>): void {
    this.lijsten.set(sleutel, { ...this.stand(sleutel), ...deel })
  }

  private neemOp(item: EmailLijstItem): EmailLijstItem {
    const bestaand = this.items.get(item.id)
    const samengevoegd = bestaand ? { ...bestaand, ...this.zonderWachtendeVelden(item.id, item) } : item
    this.items.set(item.id, samengevoegd)
    return samengevoegd
  }

  /**
   * Velden die nu in de undo-buffer staan zijn optimistisch gezet en staan dus
   * nog niet op de server. Een serverrij die er overheen gaat (realtime-UPDATE
   * van de sync, een ververs) zou de mail zichtbaar terugzetten in de lijst.
   */
  private zonderWachtendeVelden<T extends Partial<EmailLijstItem>>(id: string, deel: T): T {
    const velden = this.wachtend.get(id)?.velden
    if (!velden?.length) return deel
    const schoon = { ...deel }
    for (const veld of velden) delete (schoon as Record<string, unknown>)[veld]
    return schoon
  }

  /** Patch uit een serverrij: laat de velden staan waar een undo-actie op wacht. */
  patchVanServer(id: string, deel: Partial<EmailLijstItem>): void {
    this.patch(id, this.zonderWachtendeVelden(id, deel))
  }

  async laadMap(map: MailMap, opties?: { vers?: boolean }): Promise<void> {
    const stand = this.stand(map)
    if (stand.laden) return
    if (stand.geladen && !opties?.vers) return
    this.zetStand(map, { laden: true, fout: undefined })
    this.meld()

    if (!stand.geladen) await this.laadUitCache(map)

    try {
      const pagina = await getEmailsPage(map, null, PAGINA_GROOTTE, this.actiefAccountId(), this.wilPostvakKolom()) as unknown as EmailLijstItem[]
      const nieuw = pagina.map((i) => this.neemOp(i))
      // Een mail met een lopende undo-actie staat op de server nog in deze map;
      // die mag niet zichtbaar terugspringen in de lijst.
      const nieuweIds = nieuw.filter((i) => !this.wachtend.has(i.id) || mappenVoor(i).includes(map)).map((i) => i.id)
      const bekend = new Set(nieuweIds)
      const oudste = nieuw.length ? nieuw[nieuw.length - 1] : null
      const huidig = this.stand(map)
      // Wat we al hadden en ouder is dan deze pagina blijft staan: dat is
      // gepagineerd werk. Wat nieuwer is en niet meer terugkomt is weg.
      const behouden = oudste
        ? huidig.ids.filter((id) => {
            if (bekend.has(id)) return false
            const item = this.items.get(id)
            return !!item && vergelijkNieuwsteEerst(item, oudste) > 0
          })
        : []
      const ids = [...nieuweIds, ...behouden]
      const laatste = ids.length ? this.items.get(ids[ids.length - 1]) : undefined
      const volledig = pagina.length < PAGINA_GROOTTE
      this.zetStand(map, {
        ids,
        cursor: laatste ? { datum: laatste.datum, id: laatste.id } : null,
        klaar: behouden.length > 0 ? huidig.klaar : volledig,
        geladen: true,
        laden: false,
      })
      this.meld()
      void this.vulThreadInfo(nieuw)
      if (map === 'inbox') void this.pasRegelsToe(nieuw).catch(() => {})
      this.planCache(map)
    } catch (e) {
      this.zetStand(map, { laden: false, geladen: true, fout: e instanceof Error ? e.message : 'Laden mislukt' })
      this.meld()
    }
  }

  async laadMeer(map: MailMap): Promise<void> {
    const stand = this.stand(map)
    if (stand.laden || stand.klaar || !stand.geladen) return
    this.zetStand(map, { laden: true })
    this.meld()
    try {
      const pagina = await getEmailsPage(map, stand.cursor, PAGINA_GROOTTE, this.actiefAccountId(), this.wilPostvakKolom()) as unknown as EmailLijstItem[]
      const huidig = this.stand(map)
      const bekend = new Set(huidig.ids)
      const toegevoegd: EmailLijstItem[] = []
      for (const rij of pagina) {
        const item = this.neemOp(rij)
        if (bekend.has(item.id)) continue
        bekend.add(item.id)
        toegevoegd.push(item)
      }
      const ids = [...huidig.ids, ...toegevoegd.map((i) => i.id)]
      const laatste = pagina.length ? pagina[pagina.length - 1] : null
      this.zetStand(map, {
        ids,
        cursor: laatste ? { datum: laatste.datum, id: laatste.id } : huidig.cursor,
        klaar: pagina.length < PAGINA_GROOTTE,
        laden: false,
      })
      this.meld()
      void this.vulThreadInfo(toegevoegd)
    } catch (e) {
      this.zetStand(map, { laden: false, fout: e instanceof Error ? e.message : 'Laden mislukt' })
      this.meld()
    }
  }

  /** Verse eerste pagina plus tellers; voor de ververs-knop en na een reconnect. */
  async ververs(map: MailMap): Promise<void> {
    await Promise.all([this.laadMap(map, { vers: true }), this.laadTellers()])
  }

  async zoek(query: string, cursor?: string): Promise<void> {
    const schoon = query.trim()
    const offset = cursor ? Number(cursor) || 0 : 0
    if (!schoon) {
      this.zoekQuery = ''
      this.lijsten.set('zoek', { ...legeStand(), geladen: true, klaar: true })
      this.meld()
      return
    }
    this.zoekQuery = schoon
    const vorige = offset > 0 ? this.stand('zoek').ids : []
    this.zetStand('zoek', { laden: true, ids: vorige, geladen: true })
    this.meld()
    try {
      const rijen = await searchEmailsFTS(schoon, ZOEK_GROOTTE, offset) as unknown as EmailLijstItem[]
      if (this.zoekQuery !== schoon) return
      const bekend = new Set(vorige)
      const ids = [...vorige]
      for (const rij of rijen) {
        const item = this.neemOp(rij)
        if (!bekend.has(item.id)) { bekend.add(item.id); ids.push(item.id) }
      }
      this.zetStand('zoek', {
        ids,
        laden: false,
        klaar: rijen.length < ZOEK_GROOTTE,
        cursor: { datum: String(offset + rijen.length), id: '' },
      })
      this.meld()
    } catch (e) {
      this.zetStand('zoek', { laden: false, fout: e instanceof Error ? e.message : 'Zoeken mislukt' })
      this.meld()
    }
  }

  huidigeZoekQuery(): string {
    return this.zoekQuery
  }

  /** Offset voor de volgende zoekpagina, als string zoals zoek() hem verwacht. */
  zoekCursor(): string | undefined {
    const stand = this.lijsten.get('zoek')
    if (!stand || stand.klaar || !stand.cursor) return undefined
    return stand.cursor.datum
  }

  async laadThread(threadId: string): Promise<void> {
    const huidig = this.threadLeden.get(threadId)
    if (huidig?.laden) return
    this.threadLeden.set(threadId, { ids: huidig?.ids ?? [], laden: true })
    this.meld()
    try {
      const [leden, infos] = await Promise.all([getThreadItems(threadId), getThreadInfos([threadId])])
      for (const info of infos) this.threads.set(info.threadId, info)
      const ids = leden.map((rij) => this.neemOp(rij).id)
      this.threadLeden.set(threadId, { ids, laden: false })
      this.pasThreadTellersToe(leden.map((l) => l.id))
      this.meld()
    } catch {
      this.threadLeden.set(threadId, { ids: huidig?.ids ?? [], laden: false })
      this.meld()
    }
  }

  async laadTellers(): Promise<void> {
    const t = await getMapTellers(this.actiefAccountId()).catch(() => null)
    if (!t) return
    this.tellers = {
      ...this.tellers,
      inbox: t.inboxOngelezen,
      concepten: t.concepten,
      ingepland: t.gepland,
      gesnoozed: t.gesnoozed,
      opvolgen: t.opvolgen,
    }
    this.meld()
  }

  async laadSyncStatus(): Promise<void> {
    const s = await getSyncStatus().catch(() => null)
    if (!s) return
    this.sync = s
    this.meld()
  }

  private async vulThreadInfo(items: EmailLijstItem[]): Promise<void> {
    const threadIds = items.map((i) => i.thread_id).filter((t): t is string => !!t)
    if (threadIds.length === 0) return
    const infos = await getThreadInfos(threadIds).catch(() => [])
    if (infos.length === 0) return
    for (const info of infos) this.threads.set(info.threadId, info)
    this.pasThreadTellersToe(items.map((i) => i.id))
    this.meld()
  }

  private pasThreadTellersToe(ids: string[]): void {
    for (const id of ids) {
      const item = this.items.get(id)
      if (!item?.thread_id) continue
      const info = this.threads.get(item.thread_id)
      if (!info) continue
      if (item.threadAantal === info.aantal && item.threadOngelezen === info.ongelezen) continue
      this.items.set(id, { ...item, threadAantal: info.aantal, threadOngelezen: info.ongelezen })
    }
  }

  // ── Persistentie ──

  /** De cache is per postvak: anders zou een wissel de vorige lijst tonen. */
  private cacheMap(map: MailMap): string {
    const account = this.actiefAccountId()
    return account ? `${map}@${account}` : map
  }

  private async laadUitCache(map: MailMap): Promise<void> {
    const eigenaar = await this.eigenaarSleutel()
    const bewaard = await leesMapLijst<EmailLijstItem[]>(this.cacheMap(map), eigenaar).catch(() => null)
    if (!bewaard || bewaard.length === 0) return
    if (this.stand(map).geladen) return
    const ids = bewaard.map((i) => this.neemOp(i).id)
    const laatste = bewaard[bewaard.length - 1]
    this.zetStand(map, { ids, cursor: { datum: laatste.datum, id: laatste.id }, geladen: true, klaar: false })
    this.meld()
  }

  private planCache(map: MailMap): void {
    const bestaand = this.cacheTimers.get(map)
    if (bestaand) clearTimeout(bestaand)
    this.cacheTimers.set(map, setTimeout(() => {
      this.cacheTimers.delete(map)
      void this.schrijfCache(map)
    }, CACHE_DEBOUNCE_MS))
  }

  private async schrijfCache(map: MailMap): Promise<void> {
    const stand = this.lijsten.get(map)
    if (!stand?.geladen) return
    const eigenaar = await this.eigenaarSleutel()
    await schrijfMapLijst(this.cacheMap(map), eigenaar, this.lijstItems(map).slice(0, CACHE_GROOTTE)).catch(() => {})
  }

  private planCacheVoor(mappen: Iterable<MailMap>): void {
    for (const map of mappen) if (this.lijsten.get(map)?.geladen) this.planCache(map)
  }

  // ── Lokale mutaties (optimistisch en realtime) ──

  private voegInLijst(map: MailMap, item: EmailLijstItem): void {
    const stand = this.lijsten.get(map)
    if (!stand?.geladen) return
    if (stand.ids.includes(item.id)) return
    // Ouder dan wat we geladen hebben en de lijst is nog niet uit: dan komt
    // hij vanzelf met de volgende pagina, niet nu tussen de geladen mail.
    if (!stand.klaar && stand.cursor && vergelijkNieuwsteEerst(item, { datum: stand.cursor.datum, id: stand.cursor.id } as EmailLijstItem) > 0) return
    const ids = [...stand.ids]
    let plek = ids.length
    for (let i = 0; i < ids.length; i++) {
      const ander = this.items.get(ids[i])
      if (ander && vergelijkNieuwsteEerst(item, ander) < 0) { plek = i; break }
    }
    ids.splice(plek, 0, item.id)
    this.lijsten.set(map, { ...stand, ids })
  }

  private haalUitLijst(map: LijstSleutel, id: string): void {
    const stand = this.lijsten.get(map)
    if (!stand || !stand.ids.includes(id)) return
    this.lijsten.set(map, { ...stand, ids: stand.ids.filter((x) => x !== id) })
  }

  /** Zet een item neer en verplaatst hem tussen de maplijsten waar hij (niet meer) in hoort. */
  private plaats(item: EmailLijstItem, vorige?: EmailLijstItem): Set<MailMap> {
    const was = new Set(vorige ? mappenVoor(vorige) : [])
    const wordt = new Set(mappenVoor(item))
    const geraakt = new Set<MailMap>()
    for (const map of was) if (!wordt.has(map)) { this.haalUitLijst(map, item.id); geraakt.add(map) }
    for (const map of wordt) if (!was.has(map)) { this.voegInLijst(map, item); geraakt.add(map) }
    return geraakt
  }

  patch(id: string, deel: Partial<EmailLijstItem>): void {
    const vorige = this.items.get(id)
    if (!vorige) return
    const nieuw = { ...vorige, ...deel }
    this.items.set(id, nieuw)
    const geraakt = this.plaats(nieuw, vorige)
    if (vorige.gelezen !== nieuw.gelezen) this.verschuifThreadOngelezen(nieuw, nieuw.gelezen ? -1 : 1)
    this.planCacheVoor(geraakt.size ? geraakt : mappenVoor(nieuw))
    this.meld()
  }

  /** Voor realtime-INSERT en lokaal aangemaakte rijen (concept). */
  voegToe(item: EmailLijstItem): void {
    const vorige = this.items.get(item.id)
    if (vorige) { this.patchVanServer(item.id, item); return }
    // Kennen we hem niet meer maar wacht er wel een actie op, dan staat hij in
    // een lopende definitieve verwijdering. Een realtime-UPDATE die daar
    // doorheen komt mag hem niet zichtbaar terugzetten; de undo doet dat zelf,
    // die haalt de id eerst uit `wachtend`.
    if (this.wachtend.has(item.id)) return
    const opgenomen = this.neemOp(item)
    const geraakt = this.plaats(opgenomen)
    if (opgenomen.thread_id) {
      const info = this.threads.get(opgenomen.thread_id)
      if (info) {
        this.threads.set(opgenomen.thread_id, {
          ...info,
          aantal: info.aantal + 1,
          ongelezen: info.ongelezen + (opgenomen.gelezen ? 0 : 1),
          laatsteDatum: opgenomen.datum > info.laatsteDatum ? opgenomen.datum : info.laatsteDatum,
        })
        this.pasThreadTellersToe(this.threadLedenIds(opgenomen.thread_id))
      }
      const leden = this.threadLeden.get(opgenomen.thread_id)
      if (leden && !leden.ids.includes(opgenomen.id)) this.threadLeden.set(opgenomen.thread_id, { ...leden, ids: [...leden.ids, opgenomen.id] })
    }
    this.planCacheVoor(geraakt)
    this.meld()
    if (opgenomen.map === 'inbox') void this.pasRegelsToe([opgenomen]).catch(() => {})
  }

  verwijderLokaal(id: string): void {
    const item = this.items.get(id)
    if (!item) return
    this.items.delete(id)
    for (const sleutel of this.lijsten.keys()) this.haalUitLijst(sleutel, id)
    if (item.thread_id) {
      const leden = this.threadLeden.get(item.thread_id)
      if (leden) this.threadLeden.set(item.thread_id, { ...leden, ids: leden.ids.filter((x) => x !== id) })
      const info = this.threads.get(item.thread_id)
      if (info) {
        this.threads.set(item.thread_id, {
          ...info,
          aantal: Math.max(0, info.aantal - 1),
          ongelezen: Math.max(0, info.ongelezen - (item.gelezen ? 0 : 1)),
        })
        this.pasThreadTellersToe(this.threadLedenIds(item.thread_id))
      }
    }
    this.planCacheVoor(mappenVoor(item))
    this.meld()
  }

  private threadLedenIds(threadId: string): string[] {
    const leden = this.threadLeden.get(threadId)
    if (leden) return leden.ids
    return [...this.items.values()].filter((i) => i.thread_id === threadId).map((i) => i.id)
  }

  private verschuifThreadOngelezen(item: EmailLijstItem, delta: number): void {
    if (!item.thread_id) return
    const info = this.threads.get(item.thread_id)
    if (!info) return
    this.threads.set(item.thread_id, { ...info, ongelezen: Math.max(0, info.ongelezen + delta) })
    this.pasThreadTellersToe(this.threadLedenIds(item.thread_id))
  }

  // ── Acties richting server ──

  private schrijfWeg(ids: string[], deel: Record<string, unknown>): Promise<void> {
    return Promise.all(ids.map((id) => updateEmail(id, deel).catch(() => {}))).then(() => {})
  }

  private imap(actie: ImapActie, ids: string[], keepalive = false): void {
    void imapActie(actie, ids, undefined, { keepalive }).catch(() => {})
  }

  async zetGelezen(ids: string[], gelezen: boolean): Promise<void> {
    const echt = ids.filter((id) => this.items.get(id) && this.items.get(id)!.gelezen !== gelezen)
    if (echt.length === 0) return
    for (const id of echt) this.patch(id, { gelezen })
    if (gelezen) this.tellers = { ...this.tellers, inbox: Math.max(0, this.tellers.inbox - echt.filter((id) => this.items.get(id)?.map === 'inbox').length) }
    else this.tellers = { ...this.tellers, inbox: this.tellers.inbox + echt.filter((id) => this.items.get(id)?.map === 'inbox').length }
    this.meld()
    await this.schrijfWeg(echt, { gelezen })
    this.imap(gelezen ? 'seen' : 'unseen', echt)
  }

  /** Gedeeld postvak: wie dit gesprek oppakt. `null` geeft het weer vrij. */
  async wijsToe(ids: string[], sleutel: string | null): Promise<void> {
    const op = sleutel ? new Date().toISOString() : null
    for (const id of ids) this.patch(id, { toegewezen_aan: sleutel, toegewezen_op: op })
    await wijsToeInDb(ids, sleutel)
  }

  async pin(ids: string[], aan: boolean): Promise<void> {
    for (const id of ids) this.patch(id, { pinned: aan })
    await this.schrijfWeg(ids, { pinned: aan })
    this.imap(aan ? 'flagged' : 'unflagged', ids)
  }

  /** snoozed_until is een TEXT-kolom: altijd volledige ISO-UTC, anders vergelijkt de wekker-cron appels met peren. */
  async snooze(ids: string[], tot: string | null): Promise<void> {
    const iso = tot ? new Date(tot).toISOString() : null
    if (tot && Number.isNaN(Date.parse(tot))) throw new Error('Ongeldige snooze-tijd')
    for (const id of ids) this.patch(id, { snoozed_until: iso })
    await this.schrijfWeg(ids, { snoozed_until: iso })
  }

  async label(ids: string[], label: string, aan: boolean): Promise<void> {
    // Labelen heeft zelf geen undo-buffer, dus een wachtende archivering of
    // verwijdering moet er eerst uit: die schrijft anders vijf seconden later
    // zijn eigen `labels` terug, over het net gezette label heen. Doorschrijven
    // en niet annuleren, want in tegenstelling tot herstel() is dit niet de
    // tegenovergestelde actie: annuleren zou de mail in de UI gearchiveerd
    // laten staan terwijl de server hem in de inbox houdt.
    this.spoelWachtendDoor(ids)
    const perId = new Map<string, string[]>()
    for (const id of ids) {
      const item = this.items.get(id)
      if (!item) continue
      const huidig = item.labels || []
      const volgende = aan
        ? (huidig.includes(label) ? huidig : [...huidig, label])
        : huidig.filter((l) => l !== label)
      perId.set(id, volgende)
      this.patch(id, { labels: volgende })
    }
    await Promise.all([...perId].map(([id, labels]) => updateEmail(id, { labels }).catch(() => {})))
  }

  /** Terug naar Inbox vanuit archief of prullenbak. Zonder buffer: dit is zelf al de ongedaan-maak-actie. */
  async herstel(ids: string[]): Promise<void> {
    // Herstellen binnen de undo-buffer: eerst de wachtende archiveer- of
    // verwijderactie laten vallen, anders schrijft die vijf seconden later
    // alsnog het tegenovergestelde weg.
    this.annuleerWachtend(ids)
    const patches = new Map<string, { map: string; labels: string[] }>()
    for (const id of ids) {
      const item = this.items.get(id)
      if (!item) continue
      const labels = (item.labels || []).filter((l) => !MAP_LABELS.has(l))
      patches.set(id, { map: 'inbox', labels })
      this.patch(id, { map: 'inbox', labels })
    }
    await Promise.all([...patches].map(([id, deel]) => updateEmail(id, deel).catch(() => {})))
    void imapActie('move', [...patches.keys()], 'inbox').catch(() => {})
  }

  archiveer(ids: string[]): Undo {
    return this.metUndo(ids, ARCHIEF_PATCH, (echt, keepalive) => {
      void this.schrijfWeg(echt, ARCHIEF_PATCH)
      this.imap('archive', echt, keepalive)
    })
  }

  verwijder(ids: string[]): Undo {
    const inPrullenbak = ids.filter((id) => this.items.get(id)?.map === 'prullenbak')
    const naarPrullenbak = ids.filter((id) => this.items.get(id) && this.items.get(id)!.map !== 'prullenbak')
    const undos: Undo[] = []
    if (naarPrullenbak.length) {
      undos.push(this.metUndo(naarPrullenbak, PRULLENBAK_PATCH, (echt, keepalive) => {
        void this.schrijfWeg(echt, PRULLENBAK_PATCH)
        this.imap('trash', echt, keepalive)
      }))
    }
    if (inPrullenbak.length) {
      const bewaard = inPrullenbak.map((id) => this.items.get(id)!)
      for (const id of inPrullenbak) this.verwijderLokaal(id)
      undos.push(this.buffer(inPrullenbak, (nog, keepalive) => {
        // Eerst IMAP: purge wil de rij nog kunnen lezen om de map te controleren.
        void imapActie('purge', nog, undefined, { keepalive }).catch(() => {}).finally(() => {
          for (const id of nog) void deleteEmail(id).catch(() => {})
        })
      }, (nog) => {
        for (const item of bewaard) if (nog.includes(item.id)) this.voegToe(item)
      }))
    }
    if (undos.length === 1) return undos[0]
    const klaarOver = Math.max(0, ...undos.map((u) => u.klaarOver))
    return { ongedaan: () => undos.forEach((u) => u.ongedaan()), klaarOver }
  }

  private metUndo(ids: string[], deel: { map: string; labels: string[] }, flush: (ids: string[], keepalive: boolean) => void): Undo {
    const snapshots = new Map<string, { map: string; labels: string[] }>()
    for (const id of ids) {
      const item = this.items.get(id)
      if (!item) continue
      snapshots.set(id, { map: item.map, labels: item.labels || [] })
      this.patch(id, deel)
    }
    const echt = [...snapshots.keys()]
    return this.buffer(echt, (nog, keepalive) => flush(nog, keepalive), (nog) => {
      for (const id of nog) {
        const snap = snapshots.get(id)
        if (snap) this.patch(id, snap)
      }
    }, Object.keys(deel))
  }

  /**
   * Vijf seconden wachten voor de server iets hoort, zodat ongedaan maken
   * niets kost. Een tweede actie op dezelfde mail spoelt de eerste eerst
   * door, anders zou de late flush de nieuwe toestand overschrijven.
   * Flush en herstel krijgen alleen de ids die nog wachten: annuleerWachtend
   * kan er tussentijds een paar uit hebben gehaald.
   */
  private buffer(ids: string[], flush: (ids: string[], keepalive: boolean) => void, herstel: (ids: string[]) => void, velden: string[] = []): Undo {
    for (const id of ids) {
      const eerder = this.wachtend.get(id)
      if (eerder) { clearTimeout(eerder.timer); this.wachtend.delete(id); eerder.flush() }
    }
    const actief = new Set(ids)
    let afgehandeld = false
    const doe = (keepalive = false) => {
      if (afgehandeld) return
      afgehandeld = true
      clearTimeout(timer)
      const nog = [...actief]
      for (const id of nog) this.wachtend.delete(id)
      if (nog.length) flush(nog, keepalive)
    }
    const annuleer = (teAnnuleren: string[]) => {
      if (afgehandeld) return
      for (const id of teAnnuleren) if (actief.delete(id)) this.wachtend.delete(id)
      if (actief.size === 0) { afgehandeld = true; clearTimeout(timer) }
    }
    const timer = setTimeout(doe, UNDO_MS)
    const rij: Wachtend = { timer, flush: doe, annuleer, velden }
    for (const id of ids) this.wachtend.set(id, rij)
    return {
      klaarOver: Date.now() + UNDO_MS,
      ongedaan: () => {
        if (afgehandeld) return
        afgehandeld = true
        clearTimeout(timer)
        const nog = [...actief]
        for (const id of nog) this.wachtend.delete(id)
        if (nog.length) herstel(nog)
      },
    }
  }

  /**
   * Laat een wachtende actie voor deze mails vallen zonder hem weg te
   * schrijven. Nodig zodra iets het tegenovergestelde doet: zonder dit schrijft
   * de buffer van het archiveren vijf seconden later alsnog 'archief' weg,
   * over een herstel naar de inbox heen.
   */
  /**
   * Een actie zonder eigen undo-buffer laat de wachtende buffer eerst
   * doorschrijven, zoals `buffer()` dat doet als er een tweede actie op
   * dezelfde mail komt. Zonder dat overschrijft de late flush de wijziging.
   */
  private spoelWachtendDoor(ids: string[]): void {
    const rijen = new Set<Wachtend>()
    for (const id of ids) {
      const rij = this.wachtend.get(id)
      if (rij) rijen.add(rij)
    }
    for (const rij of rijen) { clearTimeout(rij.timer); rij.flush() }
  }

  annuleerWachtend(ids: string[]): void {
    const perRij = new Map<Wachtend, string[]>()
    for (const id of ids) {
      const rij = this.wachtend.get(id)
      if (!rij) continue
      const lijst = perRij.get(rij)
      if (lijst) lijst.push(id)
      else perRij.set(rij, [id])
    }
    for (const [rij, lijst] of perRij) rij.annuleer(lijst)
  }

  /**
   * Alle wachtende acties nu doorschrijven (bij verlaten van de pagina of de
   * module). Met `keepalive` overleeft het verzoek het tabblad; zonder dat
   * verdampte een archivering die binnen vijf seconden gevolgd werd door een
   * refresh.
   */
  flushAlles(opties?: { keepalive?: boolean }): void {
    const uniek = new Set(this.wachtend.values())
    this.wachtend.clear()
    for (const rij of uniek) { clearTimeout(rij.timer); rij.flush(opties?.keepalive) }
  }
}

export const mailStore = new MailStore()
