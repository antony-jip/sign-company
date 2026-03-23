import {
  Send, Receipt, CreditCard, Check, Eye, RotateCcw, Clock, FileText, Paperclip
} from 'lucide-react'
import type { PortaalItem } from '@/types'

export const currencyFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })

export const statusConfig: Record<string, { label: string; color: string; icon: typeof Check }> = {
  verstuurd:   { label: 'Verstuurd',   color: 'badge-blauw',   icon: Send },
  bekeken:     { label: 'Bekeken',     color: 'badge-grijs',   icon: Eye },
  goedgekeurd: { label: 'Goedgekeurd', color: 'badge-petrol',  icon: Check },
  revisie:     { label: 'Revisie',     color: 'badge-flame',   icon: RotateCcw },
  betaald:     { label: 'Betaald',     color: 'badge-petrol',  icon: Check },
  vervangen:   { label: 'Vervangen',   color: 'text-muted-foreground bg-muted', icon: Clock },
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Vandaag'
  if (d.toDateString() === yesterday.toDateString()) return 'Gisteren'
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

// ── Timeline item renderers ──

export function BerichtBubble({ item }: { item: PortaalItem }) {
  const isVanBedrijf = item.afzender === 'bedrijf'

  if (item.bericht_type === 'foto' && item.foto_url) {
    return (
      <div className={`flex ${isVanBedrijf ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] ${isVanBedrijf ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`rounded-2xl overflow-hidden shadow-sm ${
            isVanBedrijf ? 'rounded-br-md' : 'rounded-bl-md'
          }`}>
            <img
              src={item.foto_url}
              alt={item.titel}
              className="max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(item.foto_url!, '_blank')}
            />
          </div>
          <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
            {isVanBedrijf ? 'Jij' : 'Klant'} · {formatTime(item.created_at)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isVanBedrijf ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isVanBedrijf ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
          isVanBedrijf
            ? 'bg-petrol text-white rounded-br-md'
            : 'bg-[#F4F2EE] text-foreground rounded-bl-md'
        }`}>
          {item.bericht_tekst || item.titel}
        </div>
        <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          {isVanBedrijf ? 'Jij' : 'Klant'} · {formatTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

export function OfferteCard({ item }: { item: PortaalItem }) {
  const st = statusConfig[item.status] || statusConfig.verstuurd
  const StatusIcon = st.icon

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="bg-white border border-mod-email-border rounded-2xl rounded-br-md overflow-hidden shadow-sm w-full">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-mod-email-light border-b border-mod-email-border">
            <Receipt className="h-3.5 w-3.5 text-mod-email-text" />
            <span className="text-[11px] font-semibold text-mod-email-text">Offerte</span>
          </div>
          <div className="px-3.5 py-2.5">
            <p className="text-[13px] font-medium text-foreground">{item.titel}</p>
            {item.bedrag != null && (
              <p className="text-[14px] font-bold font-mono text-foreground mt-0.5">
                {currencyFmt.format(item.bedrag)}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                <StatusIcon className="h-3 w-3" />
                {st.label}
              </span>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          Jij · {formatTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

export function FactuurCard({ item }: { item: PortaalItem }) {
  const st = statusConfig[item.status] || statusConfig.verstuurd
  const StatusIcon = st.icon

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="bg-white border border-mod-werkbonnen-border rounded-2xl rounded-br-md overflow-hidden shadow-sm w-full">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-mod-werkbonnen-light border-b border-mod-werkbonnen-border">
            <CreditCard className="h-3.5 w-3.5 text-mod-werkbonnen-text" />
            <span className="text-[11px] font-semibold text-mod-werkbonnen-text">Factuur</span>
          </div>
          <div className="px-3.5 py-2.5">
            <p className="text-[13px] font-medium text-foreground">{item.titel}</p>
            {item.bedrag != null && (
              <p className="text-[14px] font-bold font-mono text-foreground mt-0.5">
                {currencyFmt.format(item.bedrag)}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                <StatusIcon className="h-3 w-3" />
                {st.label}
              </span>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          Jij · {formatTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

export function TekeningCard({ item }: { item: PortaalItem }) {
  const st = statusConfig[item.status] || statusConfig.verstuurd
  const StatusIcon = st.icon
  const hasFiles = item.bestanden && item.bestanden.length > 0

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="bg-white border border-mod-klanten-border rounded-2xl rounded-br-md overflow-hidden shadow-sm w-full">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-mod-klanten-light border-b border-mod-klanten-border">
            <FileText className="h-3.5 w-3.5 text-mod-klanten-text" />
            <span className="text-[11px] font-semibold text-mod-klanten-text">Tekening</span>
          </div>
          <div className="px-3.5 py-2.5">
            <p className="text-[13px] font-medium text-foreground">{item.titel}</p>
            {item.omschrijving && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.omschrijving}</p>
            )}
            {hasFiles && (
              <div className="flex items-center gap-1 mt-2 text-[10px] text-mod-klanten-text">
                <Paperclip className="h-3 w-3" />
                {item.bestanden.length} bestand{item.bestanden.length !== 1 ? 'en' : ''}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                <StatusIcon className="h-3 w-3" />
                {st.label}
              </span>
            </div>
          </div>
          {/* Reacties (klant feedback) */}
          {item.reacties && item.reacties.length > 0 && (
            <div className="border-t border-mod-klanten-border px-3.5 py-2 bg-mod-klanten-light/30">
              {item.reacties.map((r) => (
                <div key={r.id} className="flex items-start gap-1.5 text-[11px]">
                  <span className={`font-medium ${r.type === 'goedkeuring' ? 'text-mod-projecten-text' : r.type === 'revisie' ? 'text-mod-planning-text' : 'text-foreground'}`}>
                    {r.klant_naam || 'Klant'}:
                  </span>
                  <span className="text-foreground/80">{r.bericht || (r.type === 'goedkeuring' ? 'Goedgekeurd' : 'Revisie gevraagd')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          Jij · {formatTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

export function TimelineItem({ item }: { item: PortaalItem }) {
  if (item.type === 'bericht') return <BerichtBubble item={item} />
  if (item.type === 'offerte') return <OfferteCard item={item} />
  if (item.type === 'factuur') return <FactuurCard item={item} />
  if (item.type === 'tekening') return <TekeningCard item={item} />
  return null
}
