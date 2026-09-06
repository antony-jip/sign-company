import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/services/supabaseClient'
import type { EmailKoppeling, EmailLijstItem, KoppelingSoort } from '@/lib/mail/types'

/**
 * De koppelingschip in de lijstrij: klantnaam of projectnaam van de eerste
 * koppeling. koppelingService kent alleen per-mail en per-doel lezen; voor
 * de zichtbare rijen halen we de rijen gebatcht op en lossen we de namen in
 * één ronde per soort op. Gemis gemeld in LOGBOEK (batch-lezer in de service).
 */
export interface KoppelingChipInfo {
  soort: KoppelingSoort
  label: string
  doelId: string
}

const VOORRANG: KoppelingSoort[] = ['klant', 'project', 'offerte', 'factuur', 'aanvraag', 'taak', 'lead']

const perMail = new Map<string, KoppelingChipInfo | null>()
const perThread = new Map<string, KoppelingChipInfo | null>()
const namen = new Map<string, string>()
let versie = 0
const luisteraars = new Set<() => void>()

function meld(): void {
  versie += 1
  for (const cb of luisteraars) cb()
}

/** Na koppelen of ontkoppelen: chips opnieuw laten laden. */
export function vergeetKoppelingChips(emailId?: string, threadId?: string | null): void {
  if (emailId) perMail.delete(emailId)
  if (threadId) perThread.delete(threadId)
  if (!emailId && !threadId) { perMail.clear(); perThread.clear() }
  meld()
}

async function laadNamen(soort: KoppelingSoort, ids: string[]): Promise<void> {
  if (!supabase || ids.length === 0) return
  const onbekend = ids.filter((id) => !namen.has(`${soort}:${id}`))
  if (onbekend.length === 0) return
  const tabel = soort === 'klant' ? 'klanten' : soort === 'project' ? 'projecten' : soort === 'offerte' ? 'offertes' : null
  if (!tabel) { for (const id of onbekend) namen.set(`${soort}:${id}`, soort); return }
  const kolommen = soort === 'klant' ? 'id, bedrijfsnaam, contactpersoon' : soort === 'project' ? 'id, naam, project_nummer' : 'id, nummer, titel'
  const { data } = await supabase.from(tabel).select(kolommen).in('id', onbekend)
  for (const rij of (data || []) as Array<Record<string, string | null>>) {
    const label = soort === 'klant'
      ? (rij.bedrijfsnaam || rij.contactpersoon || 'Klant')
      : soort === 'project'
        ? (rij.naam || rij.project_nummer || 'Project')
        : [rij.nummer, rij.titel].filter(Boolean).join(' ') || 'Offerte'
    namen.set(`${soort}:${rij.id}`, label)
  }
  for (const id of onbekend) if (!namen.has(`${soort}:${id}`)) namen.set(`${soort}:${id}`, soort)
}

function kies(koppelingen: EmailKoppeling[]): EmailKoppeling | null {
  if (koppelingen.length === 0) return null
  return [...koppelingen].sort((a, b) => VOORRANG.indexOf(a.soort) - VOORRANG.indexOf(b.soort))[0]
}

let lopend: Promise<void> | null = null
const wachtrij = new Set<string>()
const wachtrijThreads = new Set<string>()

async function verwerkWachtrij(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const ids = [...wachtrij].slice(0, 200)
  const threads = [...wachtrijThreads].slice(0, 200)
  for (const id of ids) wachtrij.delete(id)
  for (const t of threads) wachtrijThreads.delete(t)
  if (ids.length === 0 && threads.length === 0) return
  const delen: string[] = []
  if (ids.length) delen.push(`email_id.in.(${ids.join(',')})`)
  if (threads.length) delen.push(`thread_id.in.(${threads.map((t) => `"${t.replace(/["\\]/g, '')}"`).join(',')})`)
  const { data } = await supabase
    .from('email_koppelingen')
    .select('id, organisatie_id, user_id, email_id, thread_id, soort, doel_id, created_at')
    .or(delen.join(','))
    .order('created_at', { ascending: true })
  const rijen = (data || []) as EmailKoppeling[]
  const opMail = new Map<string, EmailKoppeling[]>()
  const opThread = new Map<string, EmailKoppeling[]>()
  for (const k of rijen) {
    if (k.email_id) opMail.set(k.email_id, [...(opMail.get(k.email_id) || []), k])
    if (k.thread_id) opThread.set(k.thread_id, [...(opThread.get(k.thread_id) || []), k])
  }
  const perSoort = new Map<KoppelingSoort, Set<string>>()
  for (const k of rijen) perSoort.set(k.soort, new Set([...(perSoort.get(k.soort) || []), k.doel_id]))
  await Promise.all([...perSoort].map(([soort, doelIds]) => laadNamen(soort, [...doelIds]).catch(() => {})))
  const naarInfo = (k: EmailKoppeling | null): KoppelingChipInfo | null =>
    k ? { soort: k.soort, doelId: k.doel_id, label: namen.get(`${k.soort}:${k.doel_id}`) || k.soort } : null
  for (const id of ids) perMail.set(id, naarInfo(kies(opMail.get(id) || [])))
  for (const t of threads) perThread.set(t, naarInfo(kies(opThread.get(t) || [])))
  meld()
}

function plan(): void {
  if (lopend) return
  lopend = new Promise<void>((klaar) => setTimeout(klaar, 60))
    .then(verwerkWachtrij)
    .catch(() => {})
    .finally(() => {
      lopend = null
      if (wachtrij.size || wachtrijThreads.size) plan()
    })
}

export function chipVoor(item: Pick<EmailLijstItem, 'id' | 'thread_id'>): KoppelingChipInfo | null | undefined {
  const opThread = item.thread_id ? perThread.get(item.thread_id) : undefined
  if (opThread) return opThread
  const opMail = perMail.get(item.id)
  if (opMail !== undefined) return opMail
  return opThread === null ? null : undefined
}

/** Chips voor de zichtbare rijen, gebatcht en gecachet. Geeft een Map op mail-id. */
export function useKoppelingChips(zichtbaar: Array<Pick<EmailLijstItem, 'id' | 'thread_id'>>): Map<string, KoppelingChipInfo> {
  const [, zetTick] = useState(0)
  useEffect(() => {
    const cb = () => zetTick((t) => t + 1)
    luisteraars.add(cb)
    return () => { luisteraars.delete(cb) }
  }, [])
  useEffect(() => {
    let nieuw = false
    for (const item of zichtbaar) {
      if (!perMail.has(item.id)) { wachtrij.add(item.id); nieuw = true }
      if (item.thread_id && !perThread.has(item.thread_id)) { wachtrijThreads.add(item.thread_id); nieuw = true }
    }
    if (nieuw) plan()
  }, [zichtbaar])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const uit = new Map<string, KoppelingChipInfo>()
    for (const item of zichtbaar) {
      const chip = chipVoor(item)
      if (chip) uit.set(item.id, chip)
    }
    return uit
  }, [zichtbaar, versie])
}
