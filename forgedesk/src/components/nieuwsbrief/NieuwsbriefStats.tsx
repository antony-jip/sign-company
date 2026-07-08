import { useEffect, useState } from 'react'
import { ArrowLeft, MailCheck, Eye, MousePointerClick, AlertTriangle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { getStats, type Nieuwsbrief, type NieuwsbriefStats as Stats } from '@/services/nieuwsbriefService'

interface Props {
  nieuwsbrief: Nieuwsbrief
  onTerug: () => void
}

function pct(deel: number, totaal: number): string {
  if (!totaal) return '—'
  return `${Math.round((deel / totaal) * 100)}%`
}

export function NieuwsbriefStats({ nieuwsbrief, onTerug }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    let actief = true
    getStats(nieuwsbrief.id)
      .then(s => { if (actief) setStats(s) })
      .catch(err => { toast.error('Kon statistieken niet laden'); console.error('[nieuwsbrief] stats mislukt:', err) })
      .finally(() => { if (actief) setLaden(false) })
    return () => { actief = false }
  }, [nieuwsbrief.id])

  const ontvangers = nieuwsbrief.aantal_ontvangers ?? 0
  const geenData = stats && stats.delivered + stats.opened + stats.clicked + stats.bounced + stats.complained === 0

  const tegels = [
    { key: 'delivered', label: 'Afgeleverd', Icon: MailCheck, kleur: '#3A7D52', waarde: stats?.delivered ?? 0, sub: `van ${ontvangers} verzonden`, rate: pct(stats?.delivered ?? 0, ontvangers) },
    { key: 'opened', label: 'Geopend', Icon: Eye, kleur: '#3A5A9A', waarde: stats?.opened ?? 0, sub: 'open rate', rate: pct(stats?.opened ?? 0, stats?.delivered || ontvangers) },
    { key: 'clicked', label: 'Geklikt', Icon: MousePointerClick, kleur: '#F15025', waarde: stats?.clicked ?? 0, sub: 'click rate', rate: pct(stats?.clicked ?? 0, stats?.delivered || ontvangers) },
    { key: 'bounced', label: 'Bounced', Icon: AlertTriangle, kleur: '#C0451A', waarde: stats?.bounced ?? 0, sub: 'niet bezorgd', rate: pct(stats?.bounced ?? 0, ontvangers) },
  ]

  return (
    <div className="flex h-full flex-col -m-3 sm:-m-4 md:-m-6">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 md:px-8">
        <button
          type="button"
          onClick={onTerug}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Terug"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-[22px] font-extrabold tracking-[-0.5px] text-foreground">
              {nieuwsbrief.onderwerp || 'Zonder onderwerp'}
            </h1>
            <StatusBadge status="verzonden" label="Verzonden" className="hidden sm:inline-flex" />
          </div>
          {nieuwsbrief.verzonden_op && (
            <p className="mt-0.5 font-mono text-[12px] tabular-nums text-muted-foreground">
              {formatDateTime(nieuwsbrief.verzonden_op)} · {ontvangers} ontvangers
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 px-4 py-6 md:px-8 md:py-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tegels.map(t => (
              <div key={t.key} className="doen-slate-surface rounded-xl px-5 py-4">
                <div className="mb-2 flex items-center gap-2">
                  <t.Icon className="h-[18px] w-[18px]" strokeWidth={1.75} style={{ color: t.kleur }} />
                  <span className="font-heading text-[14px] font-bold text-foreground">
                    {t.label}<span className="text-flame">.</span>
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-[28px] font-bold leading-none text-foreground tabular-nums">
                    {laden ? '—' : t.waarde}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-muted-foreground">{t.rate}</span>
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground" style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}>
                  {t.sub}
                </div>
              </div>
            ))}
          </div>

          {geenData && (
            <div className="doen-slate-surface flex items-start gap-3 rounded-xl p-4 text-[13px] text-muted-foreground">
              <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-petrol" />
              <span>
                Nog geen gegevens. Statistieken verschijnen zodra Resend events terugstuurt — zorg dat open- en click-tracking aanstaan en de webhook is ingesteld.
              </span>
            </div>
          )}

          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> Wat je verstuurde
            </div>
            <div className="doen-slate-surface overflow-hidden rounded-2xl" style={{ height: 520 }}>
              <iframe
                title="Verzonden nieuwsbrief"
                srcDoc={nieuwsbrief.html}
                className="h-full w-full border-0"
                sandbox=""
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
