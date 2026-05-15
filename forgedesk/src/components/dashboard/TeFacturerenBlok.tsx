import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { formatCurrency } from '@/lib/utils'
import type { Factuur } from '@/types'

interface TeFacturerenItem {
  id: string
  klantId: string
  klantNaam: string
  nummer: string
  titel: string
  projectId?: string
  bedrag: number
  dagen: number
}

function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return 0
  const t = new Date(dateStr).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)))
}

export function TeFacturerenBlok() {
  const navigate = useNavigate()
  const { offertes, facturen } = useDashboardData()

  const items = useMemo<TeFacturerenItem[]>(() => {
    const gefactureerdeOfferteIds = new Set(
      facturen.filter((f: Factuur) => f.offerte_id).map((f: Factuur) => f.offerte_id),
    )
    return offertes
      .filter(o => o.status === 'goedgekeurd' && !gefactureerdeOfferteIds.has(o.id))
      .map(o => ({
        id: o.id,
        klantId: o.klant_id,
        klantNaam: o.klant_naam || 'Klant',
        nummer: o.nummer,
        titel: o.titel,
        projectId: o.project_id,
        bedrag: o.totaal || 0,
        dagen: daysSince(o.akkoord_op || o.created_at),
      }))
      .sort((a, b) => b.dagen - a.dagen)
  }, [offertes, facturen])

  const buildFactuurUrl = (item: TeFacturerenItem): string => {
    const params = new URLSearchParams({
      offerte_id: item.id,
      klant_id: item.klantId,
    })
    if (item.titel) params.set('titel', item.titel)
    if (item.projectId) params.set('project_id', item.projectId)
    return `/facturen/nieuw?${params.toString()}`
  }

  const totaalBedrag = useMemo(() => items.reduce((s, i) => s + i.bedrag, 0), [items])

  return (
    <section
      className="rounded-xl bg-white p-6 sm:p-8"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <header className="flex items-baseline justify-between gap-4 mb-5">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A55]">
            Klaar om te factureren
          </h2>
          <span
            className="text-[14px] text-[#9B9B95] truncate"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            — klaar om te versturen
          </span>
        </div>
        {items.length > 0 && (
          <span className="font-mono text-[12px] text-[#9B9B95] flex-shrink-0">
            {formatCurrency(totaalBedrag)} klaar
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-[#9B9B95] py-2">Niets klaar om te factureren.</p>
      ) : (
        <ul className="divide-y divide-[#EBEBEB]">
          {items.map(item => {
            const urgent = item.dagen >= 7
            const ageColor = urgent ? '#F15025' : '#9B9B95'

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(buildFactuurUrl(item))}
                  className="group w-full flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg hover:bg-[#F8F7F5] transition-colors text-left focus-visible:outline-none focus-visible:bg-[#F8F7F5]"
                >
                  <span className="flex-1 min-w-0 truncate text-sm text-[#1A1A1A] font-medium">
                    {item.klantNaam}
                  </span>
                  <span className="hidden sm:block font-mono text-[12px] text-[#6B6B66] w-24 flex-shrink-0">
                    {item.nummer}
                  </span>
                  <span className="font-mono text-sm text-[#1A1A1A] w-24 text-right flex-shrink-0">
                    {formatCurrency(item.bedrag)}
                  </span>
                  <span
                    className="text-sm w-20 text-right flex-shrink-0"
                    style={{ color: ageColor }}
                  >
                    {item.dagen} dagen
                    <span style={{ color: urgent ? '#F15025' : ageColor }}>.</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#9B9B95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-5 text-right">
        <button
          type="button"
          onClick={() => navigate('/facturen')}
          className="text-sm text-[#1A535C] hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Naar facturen →
        </button>
      </div>
    </section>
  )
}
