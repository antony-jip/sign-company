import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import {
  Loader2, Send, UserPlus, CheckCircle, Mail, Phone, ExternalLink, MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatDateTime } from '@/lib/utils'
import type { WebsiteChatGesprek, WebsiteChatBericht } from '@/types'
import {
  getChatGesprekken, getChatBerichten, stuurTeamBericht, markeerChatGelezen,
  sluitChatGesprek, getChatAanwezigheid, zetChatBeschikbaar,
} from '@/services/supabaseService'
import supabase from '@/services/supabaseClient'
import { VerwerkAanvraagDialog } from './VerwerkAanvraagDialog'

function contactLabel(g: WebsiteChatGesprek): string {
  return g.naam || g.email || g.telefoon || 'Bezoeker'
}

function isOngelezen(g: WebsiteChatGesprek): boolean {
  if (g.status !== 'open') return false
  if (!g.team_laatst_gelezen_op) return true
  return new Date(g.laatste_bericht_op).getTime() > new Date(g.team_laatst_gelezen_op).getTime()
}

export function WebsiteChatTab() {
  const [gesprekken, setGesprekken] = useState<WebsiteChatGesprek[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actiefId, setActiefId] = useState<string | null>(null)
  const [berichten, setBerichten] = useState<WebsiteChatBericht[]>([])
  const [concept, setConcept] = useState('')
  const [isVersturen, setIsVersturen] = useState(false)
  const [beschikbaar, setBeschikbaar] = useState(true)
  const [verwerkOpen, setVerwerkOpen] = useState(false)
  const loopRef = useRef<HTMLDivElement>(null)
  const actiefIdRef = useRef<string | null>(null)
  actiefIdRef.current = actiefId

  const actief = useMemo(() => gesprekken.find((g) => g.id === actiefId) || null, [gesprekken, actiefId])

  const laadGesprekken = useCallback(async () => {
    try {
      const data = await getChatGesprekken()
      setGesprekken(data)
    } catch (err) {
      logger.error('Chatgesprekken laden mislukt:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const laadBerichten = useCallback(async (gesprekId: string) => {
    try {
      const data = await getChatBerichten(gesprekId)
      if (actiefIdRef.current !== gesprekId) return
      // merge op id in plaats van vervangen: een snapshot die vóór een
      // realtime/optimistic insert startte mag dat bericht niet wegdrukken
      setBerichten((prev) => {
        const gezien = new Set(data.map((b) => b.id))
        const extra = prev.filter((b) => b.gesprek_id === gesprekId && !gezien.has(b.id))
        return [...data, ...extra].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      })
    } catch (err) {
      logger.error('Chatberichten laden mislukt:', err)
    }
  }, [])

  useEffect(() => {
    laadGesprekken()
    getChatAanwezigheid().then((a) => { if (a) setBeschikbaar(a.beschikbaar) }).catch(() => {})
  }, [laadGesprekken])

  useEffect(() => {
    if (!supabase) return
    // gesprekken zelf zitten bewust niet in de realtime-publication
    // (bezoeker_token); berichten-INSERTs zijn genoeg om de inbox te
    // verversen, statuswijzigingen vangt de 30s-poll op
    const channel = supabase
      .channel('website-chat-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'website_chat_berichten' }, (payload) => {
        const nieuw = payload.new as WebsiteChatBericht
        if (actiefIdRef.current && nieuw.gesprek_id === actiefIdRef.current) {
          setBerichten((prev) => prev.some((b) => b.id === nieuw.id) ? prev : [...prev, nieuw])
          markeerChatGelezen(nieuw.gesprek_id).catch(() => {})
        }
        laadGesprekken()
      })
      .subscribe()
    const interval = window.setInterval(() => {
      laadGesprekken()
      if (actiefIdRef.current) laadBerichten(actiefIdRef.current)
    }, 30_000)
    return () => {
      supabase?.removeChannel(channel)
      window.clearInterval(interval)
    }
  }, [laadGesprekken, laadBerichten])

  useEffect(() => {
    loopRef.current?.scrollTo({ top: loopRef.current.scrollHeight })
  }, [berichten])

  const openGesprek = useCallback(async (g: WebsiteChatGesprek) => {
    setActiefId(g.id)
    setBerichten([])
    laadBerichten(g.id)
    if (isOngelezen(g)) {
      try {
        await markeerChatGelezen(g.id)
        setGesprekken((prev) => prev.map((x) => x.id === g.id ? { ...x, team_laatst_gelezen_op: new Date().toISOString() } : x))
      } catch { /* stil */ }
    }
  }, [laadBerichten])

  const handleVersturen = useCallback(async () => {
    const tekst = concept.trim()
    if (!tekst || !actiefId || isVersturen) return
    setIsVersturen(true)
    try {
      const bericht = await stuurTeamBericht(actiefId, tekst)
      setBerichten((prev) => prev.some((b) => b.id === bericht.id) ? prev : [...prev, bericht])
      setConcept('')
    } catch (err) {
      logger.error('Chatbericht versturen mislukt:', err)
      toast.error('Versturen mislukt')
    } finally {
      setIsVersturen(false)
    }
  }, [concept, actiefId, isVersturen])

  const handleSluiten = useCallback(async () => {
    if (!actiefId) return
    try {
      await sluitChatGesprek(actiefId)
      setGesprekken((prev) => prev.map((g) => g.id === actiefId ? { ...g, status: 'gesloten' } : g))
      toast.success('Gesprek gesloten')
    } catch (err) {
      logger.error('Gesprek sluiten mislukt:', err)
      toast.error('Sluiten mislukt')
    }
  }, [actiefId])

  const handleBeschikbaar = useCallback(async (aan: boolean) => {
    setBeschikbaar(aan)
    try {
      await zetChatBeschikbaar(aan)
      toast.success(aan ? 'Chat staat aan op signcompany.nl' : 'Chat staat uit, bezoekers zien het aanvraagformulier')
    } catch (err) {
      logger.error('Beschikbaarheid zetten mislukt:', err)
    }
  }, [])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-4">
      <Card className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Switch checked={beschikbaar} onCheckedChange={handleBeschikbaar} />
          <div>
            <p className="text-sm font-medium">{beschikbaar ? 'Chat beschikbaar' : 'Chat uitgeschakeld'}</p>
            <p className="text-xs text-muted-foreground">
              {beschikbaar
                ? 'Bezoekers kunnen chatten zolang doen. openstaat; anders zien ze het aanvraagformulier.'
                : 'Bezoekers zien alleen het aanvraagformulier.'}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          {gesprekken.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
              <MessageCircle className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-semibold">Nog geen chats</p>
              <p className="text-xs text-muted-foreground">Gesprekken vanaf signcompany.nl verschijnen hier.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
              {gesprekken.map((g) => {
                const ongelezen = isOngelezen(g)
                return (
                  <button
                    key={g.id}
                    onClick={() => openGesprek(g)}
                    className={cn(
                      'w-full text-left px-4 py-3 transition-colors hover:bg-bg-hover',
                      actiefId === g.id && 'bg-muted/70',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm truncate', ongelezen ? 'font-bold' : 'font-medium')}>{contactLabel(g)}</p>
                      {ongelezen && <span className="h-2 w-2 rounded-full bg-[#F15025] flex-none" />}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{g.email || g.telefoon}</p>
                      <p className="text-xs text-muted-foreground/70 flex-none">{formatDateTime(g.laatste_bericht_op)}</p>
                    </div>
                    {g.status === 'gesloten' && <p className="text-xs text-muted-foreground/60 mt-0.5">gesloten</p>}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col min-h-[480px] max-h-[640px]">
          {!actief ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Kies een gesprek om te lezen en te antwoorden.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{contactLabel(actief)}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {actief.email && (
                      <a href={`mailto:${actief.email}`} className="inline-flex items-center gap-1 hover:underline">
                        <Mail className="h-3 w-3" />{actief.email}
                      </a>
                    )}
                    {actief.telefoon && (
                      <a href={`tel:${actief.telefoon}`} className="inline-flex items-center gap-1 hover:underline">
                        <Phone className="h-3 w-3" />{actief.telefoon}
                      </a>
                    )}
                    {actief.pagina_url && (
                      <a href={actief.pagina_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                        <ExternalLink className="h-3 w-3" />{actief.pagina_url.replace(/^https?:\/\/(www\.)?[^/]+/, '') || '/'}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-none">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setVerwerkOpen(true)}>
                    <UserPlus className="h-4 w-4" /> Verwerk
                  </Button>
                  {actief.status === 'open' && (
                    <Button variant="outline" size="sm" className="gap-1 text-[#F15025] border-[#F15025]/40 hover:bg-[#F15025]/5" onClick={handleSluiten}>
                      <CheckCircle className="h-4 w-4" /> Sluiten
                    </Button>
                  )}
                </div>
              </div>

              <div ref={loopRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {berichten.map((b) => (
                  <div
                    key={b.id}
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap',
                      b.rol === 'team'
                        ? 'ml-auto bg-[#1A535C] text-white rounded-br-md'
                        : 'mr-auto bg-muted text-foreground rounded-bl-md',
                    )}
                  >
                    {b.tekst}
                    <div className={cn('text-[10px] mt-1', b.rol === 'team' ? 'text-white/60' : 'text-muted-foreground/60')}>
                      {formatDateTime(b.created_at)}
                    </div>
                  </div>
                ))}
              </div>

              {actief.status === 'open' ? (
                <div className="border-t border-border p-3 flex gap-2 items-end">
                  <Textarea
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleVersturen()
                      }
                    }}
                    placeholder="Typ je antwoord…"
                    rows={2}
                    className="resize-none"
                  />
                  <Button onClick={handleVersturen} disabled={!concept.trim() || isVersturen} size="icon" className="flex-none bg-[#1A535C] hover:bg-[#1A535C]/90 text-white">
                    {isVersturen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
                  Dit gesprek is gesloten.
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {actief && (
        <VerwerkAanvraagDialog
          open={verwerkOpen}
          onOpenChange={setVerwerkOpen}
          bron={{
            naam: actief.naam,
            email: actief.email,
            telefoon: actief.telefoon,
            bericht: berichten.filter((b) => b.rol === 'bezoeker').map((b) => b.tekst).join('\n'),
          }}
        />
      )}
    </div>
  )
}
