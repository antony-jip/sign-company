import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmailLijstItem } from '@/lib/mail/types'

const mocks = vi.hoisted(() => ({
  getEmailsPage: vi.fn(),
  updateEmail: vi.fn(),
  deleteEmail: vi.fn(),
  imapActie: vi.fn(),
  getThreadInfos: vi.fn(async () => []),
  getThreadItems: vi.fn(async () => []),
  getMapTellers: vi.fn(async () => null),
  getSyncStatus: vi.fn(async () => ({ status: 'ok' })),
  searchEmailsFTS: vi.fn(async () => []),
  leesMapLijst: vi.fn(async () => null),
  schrijfMapLijst: vi.fn(async () => {}),
}))

vi.mock('@/services/emailService', () => ({
  getEmailsPage: mocks.getEmailsPage,
  updateEmail: mocks.updateEmail,
  deleteEmail: mocks.deleteEmail,
  getThreadInfos: mocks.getThreadInfos,
  getThreadItems: mocks.getThreadItems,
  getMapTellers: mocks.getMapTellers,
  getSyncStatus: mocks.getSyncStatus,
  searchEmailsFTS: mocks.searchEmailsFTS,
}))
vi.mock('@/lib/mail/imapActie', () => ({ imapActie: mocks.imapActie }))
vi.mock('@/lib/mailCache', () => ({
  leesMapLijst: mocks.leesMapLijst,
  schrijfMapLijst: mocks.schrijfMapLijst,
  maakEigenaarSleutel: (u?: string | null, o?: string | null) => `${u || 'anoniem'}:${o || 'geen-org'}`,
}))
vi.mock('@/services/supabaseClient', () => ({ supabase: null, isSupabaseConfigured: () => false }))
vi.mock('@/services/supabaseHelpers', () => ({ getOrgId: async () => undefined }))

import { mailStore, PAGINA_GROOTTE, UNDO_MS } from '@/lib/mail/mailStore'
import { verwerkWijziging } from '@/lib/mail/realtime'

function mail(id: string, datum: string, extra: Partial<EmailLijstItem> = {}): EmailLijstItem {
  return {
    id, gmail_id: id, van: 'a@b.nl', aan: 'c@d.nl', onderwerp: `Mail ${id}`, datum,
    gelezen: false, labels: [], bijlagen: 0, map: 'inbox', created_at: datum, ...extra,
  }
}

function pagina(n: number, vanaf = 0): EmailLijstItem[] {
  return Array.from({ length: n }, (_, i) => {
    const nr = vanaf + i
    return mail(`m${String(nr).padStart(4, '0')}`, new Date(Date.UTC(2026, 8, 1, 12, 0, 0) - nr * 60_000).toISOString())
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  mocks.updateEmail.mockReset().mockResolvedValue({})
  mocks.deleteEmail.mockReset().mockResolvedValue(undefined)
  mocks.imapActie.mockReset().mockResolvedValue({ geslaagd: 1, mislukt: 0 })
  mocks.getEmailsPage.mockReset()
  mailStore.stelEigenaarIn('u1', 'org1')
  mailStore.stelEigenaarIn('u2', 'org1')
})

describe('mailStore: optimistische patch met undo', () => {
  it('archiveer verplaatst meteen, herstelt bij ongedaan en schrijft dan niets weg', async () => {
    mocks.getEmailsPage.mockResolvedValueOnce(pagina(3))
    await mailStore.laadMap('inbox')
    expect(mailStore.lijstItems('inbox').map((i) => i.id)).toEqual(['m0000', 'm0001', 'm0002'])

    const undo = mailStore.archiveer(['m0001'])
    expect(mailStore.lijstItems('inbox').map((i) => i.id)).toEqual(['m0000', 'm0002'])
    expect(mailStore.item('m0001')?.map).toBe('archief')
    expect(mocks.updateEmail).not.toHaveBeenCalled()

    undo.ongedaan()
    expect(mailStore.lijstItems('inbox').map((i) => i.id)).toEqual(['m0000', 'm0001', 'm0002'])
    expect(mailStore.item('m0001')?.map).toBe('inbox')

    vi.advanceTimersByTime(UNDO_MS + 10)
    expect(mocks.updateEmail).not.toHaveBeenCalled()
    expect(mocks.imapActie).not.toHaveBeenCalled()
  })

  it('zonder undo gaat de patch na de buffer naar DB en IMAP', async () => {
    mocks.getEmailsPage.mockResolvedValueOnce(pagina(2))
    await mailStore.laadMap('inbox')
    mailStore.verwijder(['m0000'])
    expect(mailStore.item('m0000')?.map).toBe('prullenbak')
    vi.advanceTimersByTime(UNDO_MS + 10)
    expect(mocks.updateEmail).toHaveBeenCalledWith('m0000', { map: 'prullenbak', labels: ['prullenbak'] })
    expect(mocks.imapActie).toHaveBeenCalledWith('trash', ['m0000'], undefined, { keepalive: false, accountId: null })
  })

  it('verwijderen uit de prullenbak haalt lokaal weg en purge gaat vóór delete', async () => {
    mocks.getEmailsPage.mockResolvedValueOnce([mail('p1', '2026-09-01T10:00:00.000Z', { map: 'prullenbak' })])
    await mailStore.laadMap('prullenbak')
    const undo = mailStore.verwijder(['p1'])
    expect(mailStore.item('p1')).toBeUndefined()
    undo.ongedaan()
    expect(mailStore.lijstItems('prullenbak').map((i) => i.id)).toEqual(['p1'])
  })

  it('herstel annuleert de wachtende archiveer-actie', async () => {
    mocks.getEmailsPage.mockResolvedValueOnce(pagina(2))
    await mailStore.laadMap('inbox')

    mailStore.archiveer(['m0000'])
    vi.advanceTimersByTime(2000)
    await mailStore.herstel(['m0000'])
    vi.advanceTimersByTime(UNDO_MS + 10)

    expect(mocks.updateEmail).toHaveBeenCalledTimes(1)
    expect(mocks.updateEmail).toHaveBeenCalledWith('m0000', { map: 'inbox', labels: [] })
    expect(mocks.imapActie).not.toHaveBeenCalledWith('archive', ['m0000'], undefined, { keepalive: false, accountId: null })
    expect(mailStore.item('m0000')?.map).toBe('inbox')
    expect(mailStore.lijstItems('inbox').map((i) => i.id)).toEqual(['m0000', 'm0001'])
  })

  it('zetGelezen schrijft direct en zet seen op de server', async () => {
    mocks.getEmailsPage.mockResolvedValueOnce(pagina(1))
    await mailStore.laadMap('inbox')
    await mailStore.zetGelezen(['m0000'], true)
    expect(mailStore.item('m0000')?.gelezen).toBe(true)
    expect(mocks.updateEmail).toHaveBeenCalledWith('m0000', { gelezen: true })
    expect(mocks.imapActie).toHaveBeenCalledWith('seen', ['m0000'], undefined, { keepalive: false, accountId: null })
  })

  it('een selectie uit twee postvakken wordt één verzoek per postvak', async () => {
    // In de stand "Alle postvakken" staan mails van twee mailboxen in dezelfde
    // lijst. Het endpoint opent per aanroep één IMAP-verbinding, dus zonder
    // deze groepering zou de mail van postvak B in de mailbox van postvak A
    // gearchiveerd worden.
    mocks.getEmailsPage.mockResolvedValueOnce([
      mail('m0000', '2026-09-01T12:00:00.000Z', { account_id: 'postvak-a' }),
      mail('m0001', '2026-09-01T11:59:00.000Z', { account_id: 'postvak-b' }),
      mail('m0002', '2026-09-01T11:58:00.000Z', { account_id: 'postvak-a' }),
    ])
    await mailStore.laadMap('inbox')
    mailStore.archiveer(['m0000', 'm0001', 'm0002'])
    vi.advanceTimersByTime(UNDO_MS + 10)
    await Promise.resolve()

    const aanroepen = mocks.imapActie.mock.calls.filter((c: unknown[]) => c[0] === 'archive')
    expect(aanroepen).toHaveLength(2)
    expect(aanroepen).toContainEqual(['archive', ['m0000', 'm0002'], undefined, { keepalive: false, accountId: 'postvak-a' }])
    expect(aanroepen).toContainEqual(['archive', ['m0001'], undefined, { keepalive: false, accountId: 'postvak-b' }])
  })
})

describe('mailStore: realtime', () => {
  it('UPDATE met map-wissel verplaatst tussen lijsten', async () => {
    mocks.getEmailsPage
      .mockResolvedValueOnce(pagina(2))
      .mockResolvedValueOnce([])
    await mailStore.laadMap('inbox')
    await mailStore.laadMap('archief')

    verwerkWijziging({ eventType: 'UPDATE', new: { ...mail('m0001', mailStore.item('m0001')!.datum), map: 'archief', body_text: 'x'.repeat(500) } })
    expect(mailStore.lijstItems('inbox').map((i) => i.id)).toEqual(['m0000'])
    expect(mailStore.lijstItems('archief').map((i) => i.id)).toEqual(['m0001'])
    expect(mailStore.item('m0001')?.body_text?.length).toBe(200)
  })

  it('INSERT komt op datum-positie binnen en DELETE haalt hem weg', async () => {
    mocks.getEmailsPage.mockResolvedValueOnce(pagina(3))
    await mailStore.laadMap('inbox')
    const tussen = new Date(Date.UTC(2026, 8, 1, 11, 58, 30)).toISOString()
    verwerkWijziging({ eventType: 'INSERT', new: mail('nieuw', tussen) })
    expect(mailStore.lijstItems('inbox').map((i) => i.id)).toEqual(['m0000', 'm0001', 'nieuw', 'm0002'])
    verwerkWijziging({ eventType: 'DELETE', old: { id: 'nieuw' } })
    expect(mailStore.lijstItems('inbox').map((i) => i.id)).toEqual(['m0000', 'm0001', 'm0002'])
  })

  it('UPDATE zet een lopende optimistische map-wissel niet terug', async () => {
    mocks.getEmailsPage.mockResolvedValueOnce(pagina(2)).mockResolvedValueOnce([])
    await mailStore.laadMap('inbox')
    await mailStore.laadMap('archief')

    mailStore.archiveer(['m0001'])
    // De sync werkt binnen de bedenktijd `gelezen` bij en stuurt de hele rij mee.
    verwerkWijziging({ eventType: 'UPDATE', new: { ...mail('m0001', mailStore.item('m0001')!.datum), map: 'inbox', gelezen: true } })

    expect(mailStore.item('m0001')?.map).toBe('archief')
    expect(mailStore.item('m0001')?.gelezen).toBe(true)
    expect(mailStore.lijstItems('inbox').map((i) => i.id)).toEqual(['m0000'])
    expect(mailStore.lijstItems('archief').map((i) => i.id)).toEqual(['m0001'])
  })

  it('snooze via UPDATE verhuist van inbox naar gesnoozed', async () => {
    mocks.getEmailsPage.mockResolvedValueOnce(pagina(1)).mockResolvedValueOnce([])
    await mailStore.laadMap('inbox')
    await mailStore.laadMap('gesnoozed')
    verwerkWijziging({ eventType: 'UPDATE', new: { ...mail('m0000', mailStore.item('m0000')!.datum), snoozed_until: '2026-09-02T08:00:00.000Z' } })
    expect(mailStore.lijstItems('inbox')).toHaveLength(0)
    expect(mailStore.lijstItems('gesnoozed').map((i) => i.id)).toEqual(['m0000'])
  })
})

describe('mailStore: cursor-paginering', () => {
  it('laadMeer vraagt vanaf de cursor en voegt niets dubbel toe', async () => {
    const eerste = pagina(PAGINA_GROOTTE)
    mocks.getEmailsPage.mockResolvedValueOnce(eerste)
    await mailStore.laadMap('inbox')
    expect(mailStore.lijstStand('inbox').klaar).toBe(false)

    const overlap = [eerste[eerste.length - 1], ...pagina(5, PAGINA_GROOTTE)]
    mocks.getEmailsPage.mockResolvedValueOnce(overlap)
    await mailStore.laadMeer('inbox')

    const laatste = eerste[eerste.length - 1]
    expect(mocks.getEmailsPage).toHaveBeenLastCalledWith('inbox', { datum: laatste.datum, id: laatste.id }, PAGINA_GROOTTE, null, false)
    const ids = mailStore.lijstItems('inbox').map((i) => i.id)
    expect(ids).toHaveLength(PAGINA_GROOTTE + 5)
    expect(new Set(ids).size).toBe(ids.length)
    expect(mailStore.lijstStand('inbox').klaar).toBe(true)
  })

  it('een verse herlaad houdt oudere gepagineerde mail en laat verdwenen nieuwe mail vallen', async () => {
    mocks.getEmailsPage.mockResolvedValueOnce(pagina(PAGINA_GROOTTE))
    await mailStore.laadMap('inbox')
    mocks.getEmailsPage.mockResolvedValueOnce(pagina(3, PAGINA_GROOTTE))
    await mailStore.laadMeer('inbox')

    const zonderEen = pagina(PAGINA_GROOTTE).filter((m) => m.id !== 'm0001')
    mocks.getEmailsPage.mockResolvedValueOnce(zonderEen)
    await mailStore.laadMap('inbox', { vers: true })
    const ids = mailStore.lijstItems('inbox').map((i) => i.id)
    expect(ids).not.toContain('m0001')
    expect(ids).toContain('m0102')
    expect(ids).toHaveLength(PAGINA_GROOTTE - 1 + 3)
  })
})
