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

    return out.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 25)
  }, [offertes, facturen])

  return (
    <section
      className="rounded-xl p-5"
      style={{
        background: 'radial-gradient(ellipse 65% 50% at 0% 0%, rgba(26,83,92,0.04), transparent 70%), radial-gradient(ellipse 85% 65% at 100% 100%, rgba(241,80,37,0.055), transparent 65%), linear-gradient(180deg, #FFFFFF 0%, #F6F8F9 100%)',
        border: '1px solid rgba(26,83,92,0.08)',
        boxShadow: '0 1px 2px rgba(20,62,71,0.04), 0 8px 24px rgba(20,62,71,0.025)',
      }}
    >
      <header className="flex items-baseline justify-between gap-4 mb-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="font-heading text-[14px] font-bold text-foreground">
            Activiteit<span className="text-[#F15025]">.</span>
          </h2>
          <span
            className="text-[14px] text-muted-foreground"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            · portaal-logs
          </span>
        </div>
      </header>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Nog geen activiteit.</p>
      ) : (
        <ul className="space-y-1 max-h-[220px] overflow-y-auto pr-1 -mr-2">
          {events.map(e => {
            const style = STYLES[e.type]
            const Icon = style.icon
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => navigate(e.href)}
                  className="group w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-background transition-colors text-left focus-visible:outline-none focus-visible:bg-background"
                >
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: style.bg }}
                    aria-hidden
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: style.color }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-foreground truncate">
                      {style.label}
                    </span>
                    <span className="block text-[12px] text-foreground/70 truncate">
                      {e.klant}
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">
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
