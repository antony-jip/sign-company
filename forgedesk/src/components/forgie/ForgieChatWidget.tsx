import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Send, X, RotateCcw, Loader2, LifeBuoy, ChevronLeft, Check, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  sendForgieChat,
  getForgieHistory,
  clearForgieHistory,
  type ForgieChatMessage,
  type ForgieActie,
} from '@/services/forgieChatService'
import {
  ADMIN_USER_ID,
  getEigenOpenGesprek,
  verstuurSupportBericht,
  verstuurKlantEmail,
  getSupportInbox,
  getSupportThread,
  verstuurSupportAntwoord,
  zetSupportStatus,
  type SupportBericht,
  type SupportGesprek,
  type InboxGesprek,
} from '@/services/supportChatService'
import supabase from '@/services/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { renderForgieMarkdown } from '@/utils/forgieMarkdown'
import { DaanActiePlan } from './DaanActiePlan'

type WidgetMessage = ForgieChatMessage & { acties?: ForgieActie[] }
type WidgetView = 'daan' | 'support'

function DaanAvatar() {
  return (
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-petrol flex items-center justify-center mt-0.5">
      <span className="text-white text-[10px] font-extrabold">D</span>
    </div>
  )
}

const SUGGESTIE_CHIPS = [
  'Wat staat er open?',
  'Omzet deze maand',
  'Openstaande facturen',
  'Projecten in uitvoering',
]

function formatTijd(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Klant-support: gesprek met het doen.-team ──
function SupportKlantView({ isOpen, onAdminReply }: { isOpen: boolean; onAdminReply: () => void }) {
  const [loading, setLoading] = useState(true)
  const [gesprekId, setGesprekId] = useState<string | null>(null)
  const [berichten, setBerichten] = useState<SupportBericht[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const isOpenRef = useRef(isOpen)

  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  useEffect(() => {
    let active = true
    async function load() {
      const res = await getEigenOpenGesprek().catch(() => null)
      if (!active) return
      if (res) {
        setGesprekId(res.gesprek.id)
        setBerichten(res.berichten)
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!supabase || !gesprekId) return
    const channel = supabase
      .channel(`support-${gesprekId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_berichten', filter: `gesprek_id=eq.${gesprekId}` },
        (payload) => {
          const nieuw = payload.new as SupportBericht
          setBerichten(prev => (prev.some(b => b.id === nieuw.id) ? prev : [...prev, nieuw]))
          if (nieuw.afzender === 'admin') {
            setOffline(false)
            if (!isOpenRef.current) onAdminReply()
          }
        }
      )
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [gesprekId, onAdminReply])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [berichten, loading])

  const handleSend = useCallback(async () => {
    const tekst = input.trim()
    if (!tekst || sending) return
    setInput('')
    setSending(true)
    setFout(null)
    try {
      const res = await verstuurSupportBericht(tekst)
      if (!gesprekId) setGesprekId(res.gesprek_id)
      setBerichten(prev => (prev.some(b => b.id === res.bericht.id) ? prev : [...prev, res.bericht]))
      if (res.offline) setOffline(true)
    } catch (e) {
      setInput(tekst)
      setFout(e instanceof Error ? e.message : 'Versturen mislukt')
    } finally {
      setSending(false)
    }
  }, [input, sending, gesprekId])

  const handleEmail = useCallback(async () => {
    const adres = emailInput.trim()
    if (!adres || !gesprekId || emailSending) return
    setEmailSending(true)
    setFout(null)
    try {
      await verstuurKlantEmail(gesprekId, adres)
      setEmailSent(true)
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Versturen mislukt')
    } finally {
      setEmailSending(false)
    }
  }, [emailInput, gesprekId, emailSending])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ backgroundColor: 'hsl(var(--card))' }}>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/60" />
          </div>
        ) : (
          <>
            {berichten.length === 0 && (
              <div className="px-3.5 py-2.5 text-[13px] leading-relaxed bg-white dark:bg-card text-foreground border border-border/60 shadow-sm rounded-2xl rounded-bl-md">
                Stel hier je vraag aan het doen.<span className="text-flame">.</span>team. We reageren zo snel mogelijk.
              </div>
            )}
            {berichten.map(b =>
              b.afzender === 'klant' ? (
                <div key={b.id} className="flex justify-end">
                  <div className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-petrol text-white rounded-2xl rounded-br-md shadow-sm">
                    {b.bericht}
                  </div>
                </div>
              ) : (
                <div key={b.id} className="flex flex-col items-start">
                  <span className="text-[10px] text-muted-foreground/70 mb-1 pl-1">doen.<span className="text-flame">.</span>team</span>
                  <div className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-white dark:bg-card text-foreground border border-border/60 shadow-sm rounded-2xl rounded-bl-md">
                    {b.bericht}
                  </div>
                </div>
              )
            )}
            {offline && (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-2">
                <p className="text-[12px] text-foreground leading-relaxed">
                  We zijn er nu even niet<span className="text-flame">.</span> Laat je e-mail achter, dan nemen we contact met je op — of wacht gerust, we chatten hier verder zodra we terug zijn.
                </p>
                {emailSent ? (
                  <p className="text-[12px] font-medium text-petrol">Bedankt, we nemen contact op<span className="text-flame">.</span></p>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEmail() } }}
                      placeholder="jouw@email.nl"
                      disabled={emailSending}
                      className="flex-1 px-3 py-2 text-[13px] text-foreground bg-card rounded-lg outline-none border border-border/60 focus:border-petrol placeholder:text-muted-foreground/70"
                    />
                    <button
                      onClick={handleEmail}
                      disabled={!emailInput.trim() || emailSending}
                      className="flex-shrink-0 flex items-center justify-center h-9 px-3 rounded-lg bg-flame text-white text-[12px] font-semibold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Stuur'}
                    </button>
                  </div>
                )}
              </div>
            )}
            {fout && <p className="text-[11px] text-flame px-1">{fout}</p>}
          </>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex-shrink-0 p-3 border-t border-border/60 bg-card">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Typ je bericht…"
            disabled={sending}
            className="flex-1 px-3 py-2 text-[13px] text-foreground bg-muted/50 rounded-lg outline-none border border-border/60 focus:border-petrol placeholder:text-muted-foreground/70"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-flame text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  )
}

export function ForgieChatWidget() {
  const { forgieEnabled } = useAppSettings()
  const { user } = useAuth()
  // Support wordt door één persoon beheerd (auth-user), niet de hele org.
  const isAdminOrg = user?.id === ADMIN_USER_ID
  const isMobile = useMediaQuery('(max-width: 767px)')

  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<WidgetView>('daan')
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  // Admin support-inbox state
  const [inbox, setInbox] = useState<InboxGesprek[]>([])
  const [activeGesprek, setActiveGesprek] = useState<SupportGesprek | null>(null)
  const [threadBerichten, setThreadBerichten] = useState<SupportBericht[]>([])
  const [supportInput, setSupportInput] = useState('')
  const [supportSending, setSupportSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supportThreadEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isOpenRef = useRef(isOpen)
  const activeGesprekIdRef = useRef<string | null>(null)
  const viewRef = useRef(view)

  const supportAttentie = inbox.filter(g => g.status === 'open' && g.laatste_bericht?.afzender === 'klant').length
  const showUnread = hasUnread || (isAdminOrg && supportAttentie > 0)

  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])
  useEffect(() => { activeGesprekIdRef.current = activeGesprek?.id ?? null }, [activeGesprek])
  useEffect(() => { viewRef.current = view }, [view])

  // Op mobiel is alleen de Support-inbox beschikbaar (Daan blijft desktop-only).
  useEffect(() => {
    if (isMobile && isAdminOrg) setView('support')
  }, [isMobile, isAdminOrg])

  // Klant: bulletje bij Daan zodra support een bericht stuurt — ook bij gesloten paneel
  // of nieuw gesprek. RLS scopet de stream op de eigen organisatie.
  useEffect(() => {
    if (isAdminOrg || !supabase) return
    const channel = supabase
      .channel('support-klant-bulletje')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_berichten' },
        (payload) => {
          const nieuw = payload.new as { afzender?: string }
          if (nieuw.afzender === 'admin' && (!isOpenRef.current || viewRef.current !== 'support')) {
            setHasUnread(true)
          }
        }
      )
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [isAdminOrg])

  const markUnread = useCallback(() => setHasUnread(true), [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load Daan history when opened for the first time
  useEffect(() => {
    if (!isOpen || historyLoaded || view !== 'daan') return
    async function load() {
      const hist = await getForgieHistory().catch(() => [])
      setMessages(hist)
      setHistoryLoaded(true)
    }
    load()
  }, [isOpen, historyLoaded, view])

  useEffect(() => {
    if (isOpen && view === 'daan') scrollToBottom()
  }, [messages, isOpen, view, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false)
      if (view === 'daan') setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, view])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen])

  // Heartbeat: markeer de support-beheerder als 'online' zolang de app open is.
  useEffect(() => {
    if (!isAdminOrg || !supabase || !user?.id) return
    const ping = () => {
      supabase!
        .from('support_presence')
        .upsert({ gebruiker_id: user.id, laatste_actief: new Date().toISOString() })
        .then(() => {}, () => {})
    }
    ping()
    const iv = setInterval(ping, 60000)
    return () => clearInterval(iv)
  }, [isAdminOrg, user?.id])

  // ── Admin: inbox laden + realtime ──
  const loadInbox = useCallback(async () => {
    const lijst = await getSupportInbox().catch(() => [])
    setInbox(lijst)
  }, [])

  useEffect(() => {
    if (!isAdminOrg) return
    loadInbox()
  }, [isAdminOrg, loadInbox])

  useEffect(() => {
    if (!isAdminOrg || !supabase) return
    const channel = supabase
      .channel('support-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_berichten' },
        (payload) => {
          const nieuw = payload.new as SupportBericht
          loadInbox()
          if (activeGesprekIdRef.current === nieuw.gesprek_id) {
            setThreadBerichten(prev => (prev.some(b => b.id === nieuw.id) ? prev : [...prev, nieuw]))
          }
          if (nieuw.afzender === 'klant' && !isOpenRef.current) setHasUnread(true)
        }
      )
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [isAdminOrg, loadInbox])

  useEffect(() => {
    if (view === 'support' && isAdminOrg) {
      supportThreadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [threadBerichten, view, isAdminOrg])

  const openGesprek = useCallback(async (g: InboxGesprek) => {
    setActiveGesprek(g)
    setThreadBerichten([])
    const res = await getSupportThread(g.id).catch(() => null)
    if (res) setThreadBerichten(res.berichten)
  }, [])

  const handleAfronden = useCallback(async () => {
    if (!activeGesprek || activeGesprek.status === 'afgerond') return
    try {
      const res = await zetSupportStatus(activeGesprek.id, 'afgerond')
      setActiveGesprek(res.gesprek)
      loadInbox()
    } catch {
      // stil falen — gebruiker kan opnieuw proberen
    }
  }, [activeGesprek, loadInbox])

  const handleAdminReply = useCallback(async () => {
    const tekst = supportInput.trim()
    if (!tekst || supportSending || !activeGesprek) return
    setSupportInput('')
    setSupportSending(true)
    try {
      const res = await verstuurSupportAntwoord(activeGesprek.id, tekst)
      setThreadBerichten(prev => (prev.some(b => b.id === res.bericht.id) ? prev : [...prev, res.bericht]))
      loadInbox()
    } catch {
      setSupportInput(tekst)
    } finally {
      setSupportSending(false)
    }
  }, [supportInput, supportSending, activeGesprek, loadInbox])

  // ── Daan-chat ──
  const handleSend = useCallback(async (text?: string) => {
    const question = (text || input).trim()
    if (!question || loading) return

    setInput('')
    const userMsg: ForgieChatMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const result = await sendForgieChat(question, messages)
      const forgieMsg: WidgetMessage = { role: 'forgie', content: result.answer, acties: result.acties }
      setMessages(prev => [...prev, forgieMsg])
      if (!isOpen) setHasUnread(true)
    } catch (err) {
      const errorMsg: ForgieChatMessage = {
        role: 'forgie',
        content: err instanceof Error ? err.message : 'Er ging iets mis. Probeer het opnieuw.',
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages, isOpen])

  const handleClear = useCallback(async () => {
    await clearForgieHistory().catch(() => {})
    setMessages([])
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleSupportKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdminReply()
    }
  }, [handleAdminReply])

  if (!forgieEnabled) return null

  const inSupport = view === 'support'

  return (
    <>
      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'fixed z-[9999] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200',
            isAdminOrg ? 'flex' : 'hidden md:flex',
          )}
          style={isMobile ? {
            inset: 0,
            borderRadius: 0,
            border: 'none',
            overflow: 'hidden',
          } : {
            right: 16,
            bottom: 80,
            width: inSupport && isAdminOrg ? 'min(760px, calc(100vw - 2rem))' : 'min(440px, calc(100vw - 2rem))',
            maxHeight: 'min(80vh, 760px)',
            borderRadius: 12,
            border: '0.5px solid #E6E4E0',
            boxShadow: '0 8px 32px rgba(120, 90, 50, 0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Header — petrol */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-petrol) 0%, var(--color-petrol-dark) 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              {/* Terug-knop alleen bij klant-support (admin houdt de lijst zichtbaar) */}
              {inSupport && !isAdminOrg && (
                <button
                  onClick={() => setView('daan')}
                  className="flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ width: 26, height: 26, color: 'rgba(255,255,255,0.7)' }}
                  title="Terug"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="relative flex items-center justify-center w-[34px] h-[34px] rounded-xl bg-white/10">
                {inSupport ? (
                  <LifeBuoy className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-white text-sm font-extrabold">D</span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-flame ring-2 ring-petrol" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">
                  {inSupport ? <>Support<span className="text-flame">.</span></> : <>Daan<span className="text-flame">.</span></>}
                </h2>
                <p className="text-[10px] text-white/55 leading-tight">
                  {inSupport ? (isAdminOrg ? 'klantvragen' : 'het doen.-team') : 'je digitale collega'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Medewerker spreken — klant, in het petrol-gedeelte met flame-hartje */}
              {!inSupport && !isAdminOrg && (
                <button
                  onClick={() => setView('support')}
                  className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Praat met een medewerker"
                >
                  <Heart className="w-3 h-3 text-flame" fill="currentColor" />
                  <span className="text-[11px] font-medium text-white whitespace-nowrap">Medewerker spreken</span>
                </button>
              )}
              {!inSupport && messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.4)' }}
                  title="Nieuw gesprek"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.4)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Admin tab-strip — verborgen op mobiel (Daan is desktop-only) */}
          {isAdminOrg && (
            <div className="hidden md:flex items-stretch flex-shrink-0 border-b border-border/60 bg-card">
              <button
                onClick={() => setView('daan')}
                className={cn(
                  'flex-1 py-2 text-[12px] font-semibold transition-colors',
                  view === 'daan' ? 'text-petrol border-b-2 border-petrol' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Daan
              </button>
              <button
                onClick={() => { setView('support'); setActiveGesprek(null) }}
                className={cn(
                  'relative flex-1 py-2 text-[12px] font-semibold transition-colors',
                  view === 'support' ? 'text-petrol border-b-2 border-petrol' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Support
                {supportAttentie > 0 && (
                  <span
                    className="absolute top-1 ml-1 inline-flex items-center justify-center text-white font-bold"
                    style={{ minWidth: 16, height: 16, padding: '0 4px', fontSize: 10, borderRadius: 999, backgroundColor: '#F15025' }}
                  >
                    {supportAttentie}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* ── Body ── */}
          {inSupport && !isAdminOrg && (
            <SupportKlantView isOpen={isOpen} onAdminReply={markUnread} />
          )}

          {inSupport && isAdminOrg && (
            <div className="flex-1 flex min-h-0" style={{ backgroundColor: 'hsl(var(--card))' }}>
              {/* Linkerpaneel — gesprekkenlijst (full-width op mobiel, vast op desktop) */}
              <div className={cn(
                'flex-shrink-0 overflow-y-auto border-border/60 w-full md:w-[244px] md:border-r',
                activeGesprek ? 'hidden md:block' : 'block'
              )}>
                {inbox.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground/70 px-4 py-10 text-center">
                    Nog geen support-gesprekken.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {inbox.map(g => {
                      const wacht = g.status === 'open' && g.laatste_bericht?.afzender === 'klant'
                      const actief = activeGesprek?.id === g.id
                      return (
                        <li key={g.id}>
                          <button
                            onClick={() => openGesprek(g)}
                            className={cn(
                              'w-full text-left px-3 py-2.5 transition-colors',
                              actief ? 'bg-muted/60' : 'hover:bg-muted/40',
                              g.status === 'afgerond' && 'opacity-55'
                            )}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 min-w-0">
                                {wacht && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#F15025' }} />}
                                <span className="truncate">{g.org_naam}</span>
                              </span>
                              <span className="text-[9px] text-muted-foreground/70 flex-shrink-0">
                                {formatTijd(g.laatste_bericht_op)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {g.laatste_bericht
                                ? `${g.laatste_bericht.afzender === 'admin' ? 'Jij: ' : ''}${g.laatste_bericht.bericht}`
                                : 'Geen berichten'}
                            </p>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Rechterpaneel — actief gesprek (op mobiel alleen zichtbaar bij open gesprek) */}
              <div className={cn('flex-1 flex-col min-w-0', activeGesprek ? 'flex' : 'hidden md:flex')}>
                {activeGesprek ? (
                  <>
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60 flex-shrink-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          onClick={() => setActiveGesprek(null)}
                          className="md:hidden flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          style={{ width: 24, height: 24 }}
                          title="Terug naar gesprekken"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[13px] font-semibold text-foreground truncate">{activeGesprek.org_naam}</span>
                      </div>
                      {activeGesprek.status === 'open' ? (
                        <button
                          onClick={handleAfronden}
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white rounded-md transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#F15025' }}
                        >
                          <Check className="w-3 h-3" />
                          Gesprek afronden
                        </button>
                      ) : (
                        <span className="flex-shrink-0 text-[10px] font-medium text-muted-foreground/70 px-2 py-1 rounded-md bg-muted/60">
                          Afgerond
                        </span>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                      {threadBerichten.map(b =>
                        b.afzender === 'admin' ? (
                          <div key={b.id} className="flex justify-end">
                            <div className="max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-petrol text-white rounded-2xl rounded-br-md shadow-sm">
                              {b.bericht}
                            </div>
                          </div>
                        ) : (
                          <div key={b.id} className="flex justify-start">
                            <div className="max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-white dark:bg-card text-foreground border border-border/60 shadow-sm rounded-2xl rounded-bl-md">
                              {b.bericht}
                            </div>
                          </div>
                        )
                      )}
                      <div ref={supportThreadEndRef} />
                    </div>
                    <div className="flex-shrink-0 p-3 border-t border-border/60 bg-card">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={supportInput}
                          onChange={e => setSupportInput(e.target.value)}
                          onKeyDown={handleSupportKeyDown}
                          placeholder="Typ je antwoord…"
                          disabled={supportSending}
                          className="flex-1 px-3 py-2 text-[13px] text-foreground bg-muted/50 rounded-lg outline-none border border-border/60 focus:border-petrol placeholder:text-muted-foreground/70"
                        />
                        <button
                          onClick={handleAdminReply}
                          disabled={!supportInput.trim() || supportSending}
                          className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-flame text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          {supportSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <LifeBuoy className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-[12px] text-muted-foreground/70">Kies een gesprek om te reageren.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!inSupport && (
            <>
              {/* Daan chat area */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ backgroundColor: 'hsl(var(--card))' }}>
                {/* Welcome / suggestions */}
                {messages.length === 0 && !loading && (
                  <div className="space-y-4 pt-2">
                    <div className="flex gap-2.5 items-start">
                      <DaanAvatar />
                      <div className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed bg-white dark:bg-card text-foreground border border-border/60 shadow-sm rounded-2xl rounded-bl-md">
                        Hoi, ik ben <strong>Daan</strong>. Stel me een vraag over je klanten, projecten, offertes of facturen, of vraag me iets aan te maken.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5" style={{ paddingLeft: 32 }}>
                      {SUGGESTIE_CHIPS.map(chip => (
                        <button
                          key={chip}
                          onClick={() => handleSend(chip)}
                          className="transition-colors"
                          style={{
                            padding: '4px 10px',
                            fontSize: 10,
                            color: '#5A5A55',
                            border: '0.5px solid #E6E4E0',
                            borderRadius: 999,
                            backgroundColor: 'transparent',
                          }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = '#F4F2EE' }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'transparent' }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg, i) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={i} className="flex justify-end">
                        <div className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-petrol text-white rounded-2xl rounded-br-md shadow-sm">
                          {msg.content}
                        </div>
                      </div>
                    )
                  }
                  const hasActies = !!msg.acties && msg.acties.length > 0
                  return (
                    <div key={i} className="space-y-3">
                      {msg.content?.trim() && (
                        <div className="flex gap-2.5 justify-start">
                          <DaanAvatar />
                          <div className="max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed bg-white dark:bg-card text-foreground border border-border/60 shadow-sm rounded-2xl rounded-bl-md">
                            {renderForgieMarkdown(msg.content, () => setIsOpen(false))}
                          </div>
                        </div>
                      )}
                      {hasActies && (
                        <div className="flex gap-2.5 justify-start">
                          <DaanAvatar />
                          <div className="min-w-0 flex-1">
                            <DaanActiePlan acties={msg.acties!} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex gap-2.5 justify-start">
                    <DaanAvatar />
                    <div className="px-3.5 py-2.5 bg-white dark:bg-card border border-border/60 shadow-sm rounded-2xl rounded-bl-md">
                      <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                        Daan denkt na…
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="flex-shrink-0 p-3 border-t border-border/60 bg-card">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Zeg het tegen Daan…"
                    disabled={loading}
                    className="flex-1 px-3 py-2 text-[13px] text-foreground bg-muted/50 rounded-lg outline-none border border-border/60 focus:border-petrol placeholder:text-muted-foreground/70"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-flame text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FAB (Floating Action Button) ── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'fixed z-[9999] flex items-center justify-center transition-all duration-200',
          // Op mobiel boven de tabbar (h-14 + safe-area); desktop 16px vanaf de rand.
          'bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] md:bottom-4',
          isAdminOrg ? 'flex' : 'hidden md:flex',
        )}
        style={{
          right: 16,
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: '#1A535C',
          boxShadow: isOpen
            ? '0 2px 8px rgba(26, 83, 92, 0.2)'
            : '0 2px 12px rgba(26, 83, 92, 0.3)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(26, 83, 92, 0.4)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = isOpen
            ? '0 2px 8px rgba(26, 83, 92, 0.2)'
            : '0 2px 12px rgba(26, 83, 92, 0.3)'
        }}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <MessageSquare className="w-[22px] h-[22px] text-white" />
            {showUnread && (
              <span
                className="absolute -top-1 -right-1 rounded-full animate-pulse"
                style={{ width: 10, height: 10, backgroundColor: '#F15025', border: '2px solid #FFFFFF' }}
              />
            )}
          </>
        )}
      </button>
    </>
  )
}
