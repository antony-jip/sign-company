import { useState, useEffect, useRef, useCallback } from 'react'
import supabase from '@/services/supabaseClient'
import {
  getSupportInbox,
  getSupportAttentie,
  getSupportThread,
  verstuurSupportAntwoord,
  zetSupportStatus,
  getSupportAccounts,
  verstuurUpdateNaarAccount,
  verstuurBroadcast,
  type InboxGesprek,
  type SupportGesprek,
  type SupportBericht,
  type SupportAccount,
} from '@/services/supportChatService'
import {
  SUPPORT_PAGINA_GROOTTE,
  voegGesprekkenSamen,
  heeftMeerGesprekken,
  herlaadLimiet,
} from '@/utils/supportInbox'

// Volledige admin-inbox: lijst, actief gesprek, thread, realtime en acties.
export function useSupportInbox(channelName: string) {
  const [inbox, setInbox] = useState<InboxGesprek[]>([])
  const [totaal, setTotaal] = useState(0)
  const [attentie, setAttentie] = useState(0)
  const [laadtMeer, setLaadtMeer] = useState(false)
  const [accounts, setAccounts] = useState<SupportAccount[]>([])
  const [activeGesprek, setActiveGesprek] = useState<SupportGesprek | null>(null)
  const [berichten, setBerichten] = useState<SupportBericht[]>([])
  const [sending, setSending] = useState(false)
  const activeIdRef = useRef<string | null>(null)
  const geladenRef = useRef(0)
  const laadtMeerRef = useRef(false)

  useEffect(() => { activeIdRef.current = activeGesprek?.id ?? null }, [activeGesprek])

  const reload = useCallback(async () => {
    const pagina = await getSupportInbox(herlaadLimiet(geladenRef.current), 0).catch(() => null)
    if (!pagina) return
    geladenRef.current = pagina.gesprekken.length
    setInbox(pagina.gesprekken)
    setTotaal(pagina.totaal)
    setAttentie(pagina.attentie)
  }, [])

  const laadMeer = useCallback(async () => {
    if (laadtMeerRef.current) return
    laadtMeerRef.current = true
    setLaadtMeer(true)
    try {
      const pagina = await getSupportInbox(SUPPORT_PAGINA_GROOTTE, geladenRef.current).catch(() => null)
      if (!pagina) return
      setInbox(prev => {
        const samen = voegGesprekkenSamen(prev, pagina.gesprekken)
        geladenRef.current = samen.length
        return samen
      })
      setTotaal(pagina.totaal)
      setAttentie(pagina.attentie)
    } finally {
      laadtMeerRef.current = false
      setLaadtMeer(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_berichten' },
        (payload) => {
          const nieuw = payload.new as SupportBericht
          reload()
          if (activeIdRef.current === nieuw.gesprek_id) {
            setBerichten(prev => (prev.some(b => b.id === nieuw.id) ? prev : [...prev, nieuw]))
          }
        }
      )
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [channelName, reload])

  const openGesprek = useCallback(async (g: InboxGesprek | SupportGesprek) => {
    setActiveGesprek(g as SupportGesprek)
    setBerichten([])
    const res = await getSupportThread(g.id).catch(() => null)
    if (res) {
      setActiveGesprek(res.gesprek)
      setBerichten(res.berichten)
    }
  }, [])

  const openGesprekById = useCallback(async (id: string) => {
    setBerichten([])
    const res = await getSupportThread(id).catch(() => null)
    if (res) {
      setActiveGesprek(res.gesprek)
      setBerichten(res.berichten)
    }
  }, [])

  const sluitGesprek = useCallback(() => setActiveGesprek(null), [])

  const loadAccounts = useCallback(async () => {
    setAccounts(await getSupportAccounts().catch(() => []))
  }, [])

  const stuurUpdate = useCallback(async (orgId: string, tekst: string) => {
    setSending(true)
    try {
      const res = await verstuurUpdateNaarAccount(orgId, tekst)
      await openGesprekById(res.gesprek_id)
      reload()
    } finally {
      setSending(false)
    }
  }, [openGesprekById, reload])

  const broadcast = useCallback(async (tekst: string): Promise<number> => {
    setSending(true)
    try {
      const r = await verstuurBroadcast(tekst)
      reload()
      return r.verstuurd
    } finally {
      setSending(false)
    }
  }, [reload])

  const reply = useCallback(async (tekst: string) => {
    if (!activeGesprek) return
    setSending(true)
    try {
      const res = await verstuurSupportAntwoord(activeGesprek.id, tekst)
      setBerichten(prev => (prev.some(b => b.id === res.bericht.id) ? prev : [...prev, res.bericht]))
      reload()
    } finally {
      setSending(false)
    }
  }, [activeGesprek, reload])

  const zetStatus = useCallback(async (status: 'open' | 'afgerond') => {
    if (!activeGesprek || activeGesprek.status === status) return
    const res = await zetSupportStatus(activeGesprek.id, status).catch(() => null)
    if (res) {
      setActiveGesprek(res.gesprek)
      reload()
    }
  }, [activeGesprek, reload])

  return {
    inbox,
    totaal,
    heeftMeer: heeftMeerGesprekken(inbox.length, totaal),
    laadtMeer,
    laadMeer,
    accounts,
    activeGesprek,
    berichten,
    sending,
    attentie,
    openGesprek,
    openGesprekById,
    sluitGesprek,
    loadAccounts,
    reply,
    stuurUpdate,
    broadcast,
    zetStatus,
    reload,
  }
}

// Lichtgewicht: alleen het attentie-aantal voor de sidebar-badge.
export function useSupportAttentie(channelName: string, enabled: boolean): number {
  const [attentie, setAttentie] = useState(0)

  const load = useCallback(async () => {
    setAttentie(await getSupportAttentie().catch(() => 0))
  }, [])

  useEffect(() => {
    if (enabled) load()
  }, [enabled, load])

  useEffect(() => {
    if (!enabled || !supabase) return
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_berichten' },
        () => load()
      )
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [channelName, enabled, load])

  return enabled ? attentie : 0
}
