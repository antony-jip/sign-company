import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchEmailsFromIMAP, classificeerAanvragen, backfillEmailsFromIMAP, authenticateGmail } from '@/services/gmailService'
import { mailStore } from '@/lib/mail/mailStore'
import type { MailMap } from '@/lib/mail/types'
import { logger } from '@/utils/logger'

const IMAP_MAP: Partial<Record<MailMap, string>> = {
  inbox: 'INBOX', verzonden: 'verzonden', archief: 'archief', prullenbak: 'prullenbak',
}

/**
 * Welke postvakken deze ronde meedoen: het gekozen postvak, of bij "Alle
 * postvakken" ze allemaal. Kent de store er geen (nog niet geladen, of een
 * database zonder migratie 245), dan één ronde zonder account_id en dat is
 * precies het gedrag van vandaag.
 */
function teSyncenPostvakken(): Array<string | undefined> {
  const gekozen = mailStore.actiefAccountId()
  if (gekozen) return [gekozen]
  const alle = mailStore.getPostvakkenLokaal()
  return alle.length > 1 ? alle.map((p) => p.id) : [undefined]
}

/**
 * Het stukje sync dat bij de shell hoort: één snelle IMAP-ronde bij het
 * openen en bij de ververs-knop, een stille ronde als je na een minuut
 * terugkomt, aanvraagherkenning na een ronde en op de desktop de rustige
 * historie-backfill. Geen polling: de cron en realtime doen de rest.
 */
export function useMailSync(actieveMap: MailMap, isDesktop: boolean, ingelogd: boolean) {
  const [bezig, zetBezig] = useState(false)
  const [laatsteSync, zetLaatsteSync] = useState<number | null>(null)
  const [mailboxGekoppeld, zetMailboxGekoppeld] = useState<boolean | null>(null)
  const mapRef = useRef(actieveMap)
  mapRef.current = actieveMap
  const aanvraagBezig = useRef(false)
  const backfillGedaan = useRef(false)

  useEffect(() => {
    if (!ingelogd) return
    let actueel = true
    authenticateGmail()
      .then((ok) => { if (actueel) zetMailboxGekoppeld(ok) })
      .catch(() => { if (actueel) zetMailboxGekoppeld(null) })
    return () => { actueel = false }
  }, [ingelogd])

  const herkenAanvragen = useCallback(async () => {
    if (aanvraagBezig.current) return
    aanvraagBezig.current = true
    try {
      const uitkomst = await classificeerAanvragen().catch(() => null)
      if (uitkomst?.aanvragen) await mailStore.ververs('inbox')
    } finally {
      aanvraagBezig.current = false
    }
  }, [])

  const backfill = useCallback(async () => {
    if (backfillGedaan.current || !isDesktop) return
    backfillGedaan.current = true
    let opgehaald = 0
    try {
      // Elk postvak apart: zonder account_id haalt het endpoint altijd de
      // historie van het standaardpostvak op, en dan blijft postvak 2 leeg.
      for (const postvak of teSyncenPostvakken()) {
        for (const map of ['inbox', 'verzonden']) {
          for (let i = 0; i < 8; i++) {
            const r = await backfillEmailsFromIMAP(map, postvak)
            opgehaald += r.synced || 0
            if (r.done || r.pending) break
            await new Promise((rust) => setTimeout(rust, 1500))
          }
        }
      }
      if (opgehaald > 0) logger.log(`[Mail] Backfill: ${opgehaald} oudere mails binnengehaald`)
    } catch (err) {
      logger.warn('[Mail] Backfill gestopt:', err instanceof Error ? err.message : err)
    }
  }, [isDesktop])

  const sync = useCallback(async (opties?: { stil?: boolean; map?: MailMap }) => {
    const map = opties?.map ?? mapRef.current
    const imapMap = IMAP_MAP[map] ?? 'INBOX'
    if (!opties?.stil) zetBezig(true)
    try {
      // Ook hier per postvak: staat de lijst op "Alle postvakken", dan haalt
      // de ververs-knop anders alleen het standaardpostvak op.
      for (const postvak of teSyncenPostvakken()) {
        await fetchEmailsFromIMAP(imapMap, undefined, undefined, undefined, true, postvak)
      }
      zetLaatsteSync(Date.now())
      await mailStore.ververs(map)
      void mailStore.laadSyncStatus()
      if (imapMap === 'INBOX') void herkenAanvragen()
      return true
    } catch (err) {
      logger.warn('[Mail] Sync mislukt:', err instanceof Error ? err.message : err)
      void mailStore.laadSyncStatus()
      return false
    } finally {
      if (!opties?.stil) zetBezig(false)
    }
  }, [herkenAanvragen])

  const gestart = useRef(false)
  useEffect(() => {
    if (!ingelogd || gestart.current) return
    gestart.current = true
    void sync({ stil: true, map: 'inbox' }).then(() => { void backfill() })
  }, [ingelogd, sync, backfill])

  // Terug in beeld na een minuut (desktop) of een kwart minuut (mobiel): stil verversen.
  const verborgenSinds = useRef<number | null>(null)
  useEffect(() => {
    const onZichtbaarheid = () => {
      if (document.visibilityState === 'hidden') { verborgenSinds.current = Date.now(); return }
      const sinds = verborgenSinds.current
      verborgenSinds.current = null
      const drempel = isDesktop ? 60_000 : 15_000
      if (!sinds || Date.now() - sinds < drempel) return
      void sync({ stil: true })
    }
    document.addEventListener('visibilitychange', onZichtbaarheid)
    return () => document.removeEventListener('visibilitychange', onZichtbaarheid)
  }, [sync, isDesktop])

  return { sync, bezig, laatsteSync, mailboxGekoppeld }
}
