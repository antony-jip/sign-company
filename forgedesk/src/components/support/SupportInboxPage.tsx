import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Send, Loader2, Check, RotateCcw, Search, ChevronLeft, LifeBuoy, Megaphone, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSupportInbox } from '@/hooks/useSupportInbox'
import { ADMIN_ORG_ID } from '@/services/supportChatService'

type StatusFilter = 'alle' | 'open' | 'afgerond'
type LeftTab = 'gesprekken' | 'accounts'

function formatTijd(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function SupportInboxPage() {
  const { organisatieId } = useAuth()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const {
    inbox, accounts, activeGesprek, berichten, sending, attentie,
    openGesprek, sluitGesprek, loadAccounts, reply, stuurUpdate, broadcast, zetStatus,
  } = useSupportInbox('support-page')

  const [leftTab, setLeftTab] = useState<LeftTab>('gesprekken')
  const [zoek, setZoek] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [antwoord, setAntwoord] = useState('')
  const [composeOrg, setComposeOrg] = useState<{ id: string; naam: string } | null>(null)
  const [broadcastMode, setBroadcastMode] = useState(false)
  const [composeText, setComposeText] = useState('')
  const threadEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadAccounts() }, [loadAccounts])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [berichten])

  const rechtsActief = !!activeGesprek || !!composeOrg || broadcastMode

  // Welk org-id heeft al een open gesprek (voor de accounts-lijst).
  const orgMetGesprek = useMemo(() => {
    const m = new Map<string, typeof inbox[number]>()
    inbox.forEach(g => { if (!m.has(g.organisatie_id)) m.set(g.organisatie_id, g) })
    return m
  }, [inbox])

  const gefilterdeGesprekken = useMemo(() => {
    const term = zoek.trim().toLowerCase()
    return inbox.filter(g => {
      if (statusFilter !== 'alle' && g.status !== statusFilter) return false
      if (!term) return true
      return g.org_naam.toLowerCase().includes(term) || (g.laatste_bericht?.bericht.toLowerCase().includes(term) ?? false)
    })
  }, [inbox, zoek, statusFilter])

  const gefilterdeAccounts = useMemo(() => {
    const term = zoek.trim().toLowerCase()
    if (!term) return accounts
    return accounts.filter(a => a.naam.toLowerCase().includes(term))
  }, [accounts, zoek])

  const kiesGesprek = useCallback((g: typeof inbox[number]) => {
    setComposeOrg(null); setBroadcastMode(false)
    openGesprek(g)
  }, [openGesprek])

  const kiesAccount = useCallback((acc: { id: string; naam: string }) => {
    const bestaand = orgMetGesprek.get(acc.id)
    if (bestaand) { kiesGesprek(bestaand); return }
    setBroadcastMode(false)
    sluitGesprek()
    setComposeText('')
    setComposeOrg(acc)
  }, [orgMetGesprek, kiesGesprek, sluitGesprek])

  const startBroadcast = useCallback(() => {
    setComposeOrg(null)
    sluitGesprek()
    setComposeText('')
    setBroadcastMode(true)
  }, [sluitGesprek])

  const handleReply = useCallback(async () => {
    const tekst = antwoord.trim()
    if (!tekst || sending) return
    setAntwoord('')
    try { await reply(tekst) } catch { setAntwoord(tekst) }
  }, [antwoord, sending, reply])

  const handleCompose = useCallback(async () => {
    const tekst = composeText.trim()
    if (!tekst || sending || !composeOrg) return
    const naam = composeOrg.naam
    try {
      await stuurUpdate(composeOrg.id, tekst)
      setComposeText('')
      setComposeOrg(null)
      toast.success(<>Bericht verstuurd naar {naam}<span style={{ color: '#F15025' }}>.</span></>)
    } catch {
      toast.error('Versturen mislukt')
    }
  }, [composeText, sending, composeOrg, stuurUpdate])

  const handleBroadcast = useCallback(async () => {
    const tekst = composeText.trim()
    if (!tekst || sending) return
    try {
      const n = await broadcast(tekst)
      setComposeText('')
      setBroadcastMode(false)
      toast.success(<>Verstuurd naar {n} account{n === 1 ? '' : 's'}<span style={{ color: '#F15025' }}>.</span></>)
    } catch {
      toast.error('Broadcast mislukt')
    }
  }, [composeText, sending, broadcast])

  if (organisatieId && organisatieId !== ADMIN_ORG_ID) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* ── Linkerpaneel: accounts/gesprekken ── */}
      <div className={cn(
        'flex flex-col min-h-0 border-border/60 w-full md:w-[340px] md:border-r',
        rechtsActief ? 'hidden md:flex' : 'flex'
      )}>
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[15px] font-bold text-foreground flex items-center gap-2">
              Support<span className="text-flame">.</span>
              {attentie > 0 && (
                <span className="inline-flex items-center justify-center text-white font-bold"
                  style={{ minWidth: 18, height: 18, padding: '0 5px', fontSize: 10, borderRadius: 999, backgroundColor: '#F15025' }}>
                  {attentie}
                </span>
              )}
            </h1>
            <button
              onClick={startBroadcast}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-md border transition-colors',
                broadcastMode ? 'bg-petrol text-white border-petrol' : 'text-petrol border-border/60 hover:bg-muted/50'
              )}
              title="Bericht naar alle accounts"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Broadcast
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-3 p-0.5 rounded-lg bg-muted/50">
            {([['gesprekken', 'Gesprekken'], ['accounts', 'Accounts']] as [LeftTab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setLeftTab(key)}
                className={cn(
                  'flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-colors',
                  leftTab === key ? 'bg-card text-petrol shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <input
              type="text"
              value={zoek}
              onChange={e => setZoek(e.target.value)}
              placeholder={leftTab === 'accounts' ? 'Zoek account…' : 'Zoek op klant of bericht…'}
              className="w-full pl-8 pr-3 py-2 text-[13px] text-foreground bg-muted/50 rounded-lg outline-none border border-border/60 focus:border-petrol placeholder:text-muted-foreground/70"
            />
          </div>

          {leftTab === 'gesprekken' && (
            <div className="flex items-center gap-1.5 mt-3">
              {(['alle', 'open', 'afgerond'] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors capitalize',
                    statusFilter === s ? 'bg-petrol text-white border-petrol' : 'text-muted-foreground border-border/60 hover:bg-muted/50'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {leftTab === 'gesprekken' ? (
            gefilterdeGesprekken.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[12px] text-muted-foreground/70 px-4 py-10 text-center">
                {inbox.length === 0 ? 'Nog geen support-gesprekken.' : 'Geen gesprekken voor dit filter.'}
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {gefilterdeGesprekken.map(g => {
                  const wacht = g.status === 'open' && g.laatste_bericht?.afzender === 'klant'
                  const actief = activeGesprek?.id === g.id
                  return (
                    <li key={g.id}>
                      <button
                        onClick={() => kiesGesprek(g)}
                        className={cn(
                          'w-full text-left px-4 py-3 transition-colors',
                          actief ? 'bg-muted/60' : 'hover:bg-muted/40',
                          g.status === 'afgerond' && 'opacity-55'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5 min-w-0">
                            {wacht && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#F15025' }} />}
                            <span className="truncate">{g.org_naam}</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">{formatTijd(g.laatste_bericht_op)}</span>
                        </div>
                        <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                          {g.laatste_bericht ? `${g.laatste_bericht.afzender === 'admin' ? 'Jij: ' : ''}${g.laatste_bericht.bericht}` : 'Geen berichten'}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )
          ) : (
            gefilterdeAccounts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[12px] text-muted-foreground/70 px-4 py-10 text-center">
                Geen accounts gevonden.
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {gefilterdeAccounts.map(acc => {
                  const heeftGesprek = orgMetGesprek.has(acc.id)
                  const actief = composeOrg?.id === acc.id || activeGesprek?.organisatie_id === acc.id
                  return (
                    <li key={acc.id}>
                      <button
                        onClick={() => kiesAccount(acc)}
                        className={cn('w-full text-left px-4 py-3 flex items-center gap-2.5 transition-colors', actief ? 'bg-muted/60' : 'hover:bg-muted/40')}
                      >
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1A535C12' }}>
                          <Building2 className="w-3.5 h-3.5" style={{ color: '#1A535C' }} />
                        </span>
                        <span className="text-[13px] font-medium text-foreground truncate flex-1">{acc.naam}</span>
                        {heeftGesprek && <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">gesprek</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )
          )}
        </div>
      </div>

      {/* ── Rechterpaneel: chat / compose / broadcast ── */}
      <div className={cn('flex-1 flex-col min-w-0', rechtsActief ? 'flex' : 'hidden md:flex')}>
        {broadcastMode ? (
          <ComposePane
            titel="Broadcast naar alle accounts"
            subtitel="Iedere klant krijgt dit bericht + een notificatie"
            icon={<Megaphone className="w-4 h-4 text-flame" />}
            value={composeText}
            onChange={setComposeText}
            onSend={handleBroadcast}
            onBack={() => setBroadcastMode(false)}
            sending={sending}
            showBack={isMobile}
          />
        ) : composeOrg ? (
          <ComposePane
            titel={composeOrg.naam}
            subtitel="Nieuw bericht — klant krijgt een notificatie"
            icon={<Building2 className="w-4 h-4 text-petrol" />}
            value={composeText}
            onChange={setComposeText}
            onSend={handleCompose}
            onBack={() => setComposeOrg(null)}
            sending={sending}
            showBack={isMobile}
          />
        ) : activeGesprek ? (
          <>
            <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-3 border-b border-border/60 flex-shrink-0 bg-card">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={sluitGesprek} className="md:hidden flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground" style={{ width: 24, height: 24 }} title="Terug">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-foreground truncate leading-tight">{activeGesprek.org_naam}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{activeGesprek.status === 'open' ? 'Open gesprek' : 'Afgerond'}</p>
                </div>
              </div>
              {activeGesprek.status === 'open' ? (
                <button onClick={() => zetStatus('afgerond')} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-md transition-opacity hover:opacity-90" style={{ backgroundColor: '#F15025' }}>
                  <Check className="w-3.5 h-3.5" /> Gesprek afronden
                </button>
              ) : (
                <button onClick={() => zetStatus('open')} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-petrol rounded-md border border-border/60 transition-colors hover:bg-muted/50">
                  <RotateCcw className="w-3.5 h-3.5" /> Heropenen
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-6 py-4 space-y-3">
              {berichten.map(b =>
                b.afzender === 'admin' ? (
                  <div key={b.id} className="flex justify-end">
                    <div className="max-w-[72%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-petrol text-white rounded-2xl rounded-br-md shadow-sm">{b.bericht}</div>
                  </div>
                ) : (
                  <div key={b.id} className="flex justify-start">
                    <div className="max-w-[72%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-white dark:bg-card text-foreground border border-border/60 shadow-sm rounded-2xl rounded-bl-md">{b.bericht}</div>
                  </div>
                )
              )}
              <div ref={threadEndRef} />
            </div>

            <div className="flex-shrink-0 p-3 md:px-6 md:py-4 border-t border-border/60 bg-card">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <input
                  type="text"
                  value={antwoord}
                  onChange={e => setAntwoord(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
                  placeholder="Typ je antwoord…"
                  disabled={sending}
                  className="flex-1 px-3.5 py-2.5 text-[13px] text-foreground bg-muted/50 rounded-lg outline-none border border-border/60 focus:border-petrol placeholder:text-muted-foreground/70"
                />
                <button onClick={handleReply} disabled={!antwoord.trim() || sending} className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-flame text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <LifeBuoy className="w-10 h-10 text-muted-foreground/25 mb-3" />
            <p className="text-[13px] font-medium text-foreground/70">Kies een gesprek of account</p>
            <p className="text-[12px] text-muted-foreground/60 mt-1">Of stuur met Broadcast een bericht naar iedereen.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ComposePane({ titel, subtitel, icon, value, onChange, onSend, onBack, sending, showBack }: {
  titel: string
  subtitel: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onBack: () => void
  sending: boolean
  showBack: boolean
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-border/60 flex-shrink-0 bg-card">
        {showBack && (
          <button onClick={onBack} className="flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground" style={{ width: 24, height: 24 }} title="Terug">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/60">{icon}</span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-foreground truncate leading-tight">{titel}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{subtitel}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Typ je bericht…"
            rows={6}
            className="w-full px-3.5 py-3 text-[13px] text-foreground bg-muted/50 rounded-lg outline-none border border-border/60 focus:border-petrol placeholder:text-muted-foreground/70 resize-none"
          />
        </div>
      </div>
      <div className="flex-shrink-0 p-3 md:px-6 md:py-4 border-t border-border/60 bg-card">
        <div className="max-w-2xl mx-auto flex justify-end">
          <button
            onClick={onSend}
            disabled={!value.trim() || sending}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white rounded-lg bg-flame shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Versturen
          </button>
        </div>
      </div>
    </>
  )
}
