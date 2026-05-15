import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { formatCurrency } from '@/lib/utils'

interface OpvolgenItem {
  id: string
  klantNaam: string
  nummer: string
  bedrag: number
  dagen: number
}

function daysSince(dateStr: string): number {
  const sent = new Date(dateStr).getTime()
  if (Number.isNaN(sent)) return 0
  const diff = Date.now() - sent
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function OpvolgenBlok() {
  const navigate = useNavigate()
  const { offertes } = useDashboardData()

  const items = useMemo<OpvolgenItem[]>(() => {
    return offertes
      .filter(o => o.wacht_op_reactie === true && o.verstuurd_op)
      .map(o => ({
        id: o.id,
        klantNaam: o.klant_naam || 'Klant',
        nummer: o.nummer,
        bedrag: o.totaal || 0,
        dagen: daysSince(o.verstuurd_op as string),
      }))
      .sort((a, b) => b.dagen - a.dagen)
  }, [offertes])

  const totaalBedrag = useMemo(() => items.reduce((s, i) => s + i.bedrag, 0), [items])

  return (
    <section
      className="rounded-xl bg-white p-6 sm:p-8"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <header className="flex items-baseline justify-between gap-4 mb-5">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A55]">
            Opvolgen
          </h2>
          <span
            className="text-[14px] text-[#9B9B95] truncate"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            — wacht op antwoord
          </span>
        </div>
        {items.length > 0 && (
          <span className="font-mono text-[12px] text-[#9B9B95] flex-shrink-0">
            {formatCurrency(totaalBedrag)} in de pijplijn
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-[#9B9B95] py-2">Geen offertes wachten op reactie.</p>
      ) : (
        <ul className="divide-y divide-[#EBEBEB]">
          {items.map(item => {
            const urgent = item.dagen >= 15
            const middle = item.dagen >= 8 && item.dagen < 15
            const ageColor = urgent ? '#F15025' : middle ? '#6B6B66' : '#9B9B95'

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/offertes/${item.id}`)}
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
          onClick={() => navigate('/offertes')}
          className="text-sm text-[#1A535C] hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Alle offertes →
        </button>
      </div>
    </section>
  )
}
