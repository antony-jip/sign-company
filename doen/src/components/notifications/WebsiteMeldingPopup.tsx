import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MessageSquare, X } from 'lucide-react'
import { supabase } from '@/services/supabaseHelpers'
import { useAuth } from '@/contexts/AuthContext'
import type { Notificatie, WebsiteChatBericht } from '@/types'

interface Melding {
  kop: string
  titel: string
  tekst: string
  link: string
}

const MELDING_GELUID = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
  'oGAACBhYqFbF1fdH2LkZGMhHpxam51gIuUl5ORiH54cnBze4WOk5KPiIJ7dnR1eoKKkJCOioWAfHl4eXyDiY2NjImFgn98e3t9gIWJi4qIhoOBf39+f4KFiImIh4WDgYB/f3+BhIaHh4aFg4KBgH+AgYOFhoaGhYSDgoGAgIGChIWFhYWEg4KBgYCBgoOEhYWEhIOCgoGBgYGCg4SEhISEg4OCgoGBgYKDg4SEhIODgoKBgYGBgoODhISDg4OCgoKBgYGCgoODg4ODg4KCgoKBgYGCgoODg4ODgoKCgoKBgYGCgoODg4OCgoKCgoKBgQ=='

function speelGeluid() {
  try {
    const audio = new Audio(MELDING_GELUID)
    audio.volume = 0.45
    audio.play().catch(() => {})
  } catch {
    // negeer audio-fouten
  }
}

// MSN-stijl popup rechtsonder voor websitechats en -aanvragen: prominenter en
// langer zichtbaar dan de gewone notificatie-toast, zodat een wachtende
// bezoeker niet gemist wordt. NotificatieCenter dempt zijn eigen toast voor
// deze types; dit component is de enige geluidsbron ervoor.
export function WebsiteMeldingPopup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [melding, setMelding] = useState<Melding | null>(null)
  const timer = useRef<number | null>(null)
  const opAanvragen = location.pathname.startsWith('/aanvragen')
  const opAanvragenRef = useRef(opAanvragen)
  opAanvragenRef.current = opAanvragen

  const toon = useCallback((nieuw: Melding) => {
    setMelding(nieuw)
    speelGeluid()
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMelding(null), 30_000)
  }, [])

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  // Bron 1: bezoekersberichten in de websitechat (dekt ook de chatstart,
  // want elk gesprek begint met een bezoekersbericht)
  useEffect(() => {
    if (!supabase || !user?.id) return
    const channel = supabase
      .channel('website-melding-berichten')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'website_chat_berichten' }, async (payload) => {
        const bericht = payload.new as WebsiteChatBericht
        if (bericht.rol !== 'bezoeker') return
        if (opAanvragenRef.current) return
        let naam = ''
        try {
          const { data } = await supabase!
            .from('website_chat_gesprekken')
            .select('naam')
            .eq('id', bericht.gesprek_id)
            .maybeSingle()
          naam = data?.naam || ''
        } catch {
          // naam is nice-to-have; popup gaat ook zonder door
        }
        toon({
          kop: 'Websitechat',
          titel: naam ? `${naam} via signcompany.nl` : 'Bezoeker op signcompany.nl',
          tekst: bericht.tekst,
          link: '/aanvragen?tab=chat',
        })
      })
      .subscribe()
    return () => { supabase?.removeChannel(channel) }
  }, [user?.id, toon])

  // Bron 2: notificaties voor nieuwe aanvragen (komen niet via realtime op
  // website_aanvragen binnen; het website-endpoint zet een notificatie-rij)
  useEffect(() => {
    if (!supabase || !user?.id) return
    const channel = supabase
      .channel(`website-melding-aanvragen-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaties', filter: `user_id=eq.${user.id}` }, (payload) => {
        const notificatie = payload.new as Notificatie
        if (notificatie.type !== 'website_aanvraag') return
        toon({
          kop: 'Nieuwe aanvraag',
          titel: notificatie.titel,
          tekst: notificatie.bericht,
          link: notificatie.link || '/aanvragen',
        })
      })
      .subscribe()
    return () => { supabase?.removeChannel(channel) }
  }, [user?.id, toon])

  if (!melding) return null

  const open = () => {
    setMelding(null)
    navigate(melding.link)
  }

  return (
    <div className="fixed bottom-5 right-5 z-[110] animate-in slide-in-from-bottom-3 fade-in duration-300">
      <div className="w-[360px] max-w-[calc(100vw-40px)] overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center gap-2 bg-petrol px-4 py-2.5 text-white">
          <MessageSquare className="h-4 w-4" />
          <span className="text-[12px] font-semibold tracking-wide">{melding.kop}</span>
          <button
            type="button"
            aria-label="Melding sluiten"
            onClick={() => setMelding(null)}
            className="ml-auto rounded p-0.5 hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={open} className="block w-full px-4 py-3 text-left transition-colors hover:bg-muted">
          <p className="text-[13px] font-semibold text-foreground">{melding.titel}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">{melding.tekst}</p>
          <p className="mt-2 text-[12px] font-semibold text-flame">Open in Aanvragen</p>
        </button>
      </div>
    </div>
  )
}
