import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Eye, CheckCircle2, AlertCircle, Receipt } from 'lucide-react'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { formatCurrency } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

type EventType = 'offerte_verstuurd' | 'offerte_bekeken' | 'akkoord' | 'wijziging' | 'factuur_betaald'

interface PortaalEvent {
  id: string
  type: EventType
  klant: string
  detail?: string
  date: Date
  href: string
}

const STYLES: Record<EventType, { label: string; icon: typeof Send; color: string; bg: string }> = {
  offerte_verstuurd: { label: 'Offerte verstuurd', icon: Send, color: '#1A535C', bg: 'rgba(26,83,92,0.08)' },
  offerte_bekeken: { label: 'Offerte bekeken', icon: Eye, color: '#8A7A4A', bg: '#F5F2E8' },
  akkoord: { label: 'Akkoord ontvangen', icon: CheckCircle2, color: '#3A7D52', bg: '#E8F2EC' },
  wijziging: { label: 'Wijziging gevraagd', icon: AlertCircle, color: '#F15025', bg: '#FDE8E4' },
  factuur_betaald: { label: 'Factuur betaald', icon: Receipt, color: '#3A7D52', bg: '#E8F2EC' },
}

export function ActiviteitLog() {
  const navigate = useNavigate()
  const { offertes, facturen } = useDashboardData()

  const events = useMemo<PortaalEvent[]>(() => {
    const out: PortaalEvent[] = []

    offertes.forEach(o => {
      const klant = o.klant_naam || 'Onbekend'
      const href = `/offertes/${o.id}`

      if (o.verstuurd_op) {
        out.push({
          id: `vz-${o.id}`,
          type: 'offerte_verstuurd',
          klant,
          detail: o.nummer,
          date: new Date(o.verstuurd_op),
          href,
        })
      }
      if (o.bekeken_door_klant && o.eerste_bekeken_op) {
        out.push({
          id: `bk-${o.id}`,
          type: 'offerte_bekeken',
          klant,
          detail: o.nummer,
          date: new Date(o.eerste_bekeken_op),
          href,
        })
      }
      if (o.akkoord_op) {
        out.push({
          id: `ak-${o.id}`,
          type: 'akkoord',
          klant,
          detail: o.nummer,
          date: new Date(o.akkoord_op),
          href,
        })
      }
      if (o.wijziging_ingediend_op) {
        out.push({
          id: `wj-${o.id}`,
          type: 'wijziging',
          klant,
          detail: o.nummer,
          date: new Date(o.wijziging_ingediend_op),
          href,
        })
      }
    })

    facturen.forEach(f => {
      if (f.status === 'betaald' && f.betaaldatum) {
        out.push({
          id: `bt-${f.id}`,
          type: 'factuur_betaald',
          klant: f.klant_naam || 'Onbekend',
          detail: formatCurrency(f.totaal || 0),
          date: new Date(f.betaaldatum),
          href: `/facturen/${f.id}`,
        })
      }
    })

    return out.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6)
  }, [offertes, facturen])

  return (
    <section
      className="rounded-xl bg-white p-6 sm:p-7 h-full"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <header className="flex items-baseline justify-between gap-4 mb-5">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A55]">
            Activiteit
          </h2>
          <span
            className="text-[14px] text-[#9B9B95]"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            — portaal-logs
          </span>
        </div>
      </header>

      {events.length === 0 ? (
        <p className="text-sm text-[#9B9B95] py-2">Nog geen activiteit.</p>
      ) : (
        <ul className="space-y-1">
          {events.map(e => {
            const style = STYLES[e.type]
            const Icon = style.icon
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => navigate(e.href)}
                  className="group w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-[#F8F7F5] transition-colors text-left focus-visible:outline-none focus-visible:bg-[#F8F7F5]"
                >
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: style.bg }}
                    aria-hidden
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: style.color }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-[#1A1A1A] truncate">
                      <span className="font-medium">{style.label}</span>
                      <span className="text-[#6B6B66]"> — {e.klant}</span>
                    </span>
                    {e.detail && (
                      <span className="block text-[11px] font-mono text-[#9B9B95] truncate">
                        {e.detail}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-mono text-[#9B9B95] flex-shrink-0">
                    {formatDistanceToNow(e.date, { addSuffix: false, locale: nl })}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
