import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react'
import { PortaalAlerts } from './PortaalAlerts'
import { AanDeSlagSectie } from './AanDeSlagSectie'
import { VandaagBlok } from './VandaagBlok'
import { OpvolgenBlok } from './OpvolgenBlok'
import { KpiStrip } from './KpiStrip'
import { RightRail } from './RightRail'
import { usePortaalHerinnering } from '@/hooks/usePortaalHerinnering'
import { DashboardDataProvider, useDashboardData } from '@/contexts/DashboardDataContext'
import { formatCurrency } from '@/lib/utils'

function getDagdeel(): { greet: string; verb: string } {
  const hour = new Date().getHours()
  if (hour < 12) return { greet: 'Goeiemorgen', verb: 'beginnen' }
  if (hour < 18) return { greet: 'Goedemiddag', verb: 'doen' }
  return { greet: 'Goeienavond', verb: 'afronden' }
}

export function FORGEdeskDashboard() {
  return (
    <DashboardDataProvider>
      <FORGEdeskDashboardInner />
    </DashboardDataProvider>
  )
}

function FORGEdeskDashboardInner() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const userName = profile?.voornaam || user?.user_metadata?.voornaam || user?.email?.split('@')[0] || ''

  usePortaalHerinnering()

  const { facturen } = useDashboardData()

  const verlopenFacturen = useMemo(() => {
    const now = new Date()
    const verlopen = facturen.filter(
      f => (f.status === 'verzonden' || f.status === 'vervallen') && new Date(f.vervaldatum) < now,
    )
    return {
      count: verlopen.length,
      bedrag: verlopen.reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0),
    }
  }, [facturen])

  const omzetMaand = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const inDeze = facturen
      .filter(f => {
        const d = new Date(f.factuurdatum || f.created_at)
        return d >= monthStart && d < monthEnd
      })
      .reduce((s, f) => s + (f.totaal || 0), 0)

    const inVorige = facturen
      .filter(f => {
        const d = new Date(f.factuurdatum || f.created_at)
        return d >= prevMonthStart && d < monthStart
      })
      .reduce((s, f) => s + (f.totaal || 0), 0)

    const trend = inVorige > 0 ? Math.round(((inDeze - inVorige) / inVorige) * 100) : null
    const monthLabel = now.toLocaleDateString('nl-NL', { month: 'long' }).toUpperCase()

    return { bedrag: inDeze, trend, monthLabel }
  }, [facturen])

  const { verb } = useMemo(() => getDagdeel(), [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateCaps = dateStr.toUpperCase()

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* ── Main column ── */}
        <main className="flex-1 min-w-0 space-y-5">
          {/* ── Hero — petrol-gradient card met omzet-overlay rechts ── */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #143E47 0%, #1A535C 55%, #2A6E78 100%)' }}
          >
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 px-7 py-7 sm:px-9 sm:py-9">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F15025]" aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70 font-mono">
                    {dateCaps}
                  </span>
                </div>
                <h1
                  className="font-heading font-bold leading-[1.05] text-[28px] sm:text-[38px] text-white"
                  style={{ letterSpacing: '-1.5px' }}
                >
                  Klaar om te{' '}
                  <span
                    style={{
                      fontFamily: '"Instrument Serif", serif',
                      fontStyle: 'italic',
                      fontWeight: 400,
                    }}
                  >
                    {verb}
                  </span>
                  {userName ? `, ${userName}` : ''}
                  <span style={{ color: '#F15025' }}>.</span>
                </h1>
              </div>

              <div
                className="hidden md:flex flex-col justify-center px-7 py-7 sm:px-8 w-[260px]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderLeft: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-white/60 font-mono">
                    Omzet — {omzetMaand.monthLabel}
                  </span>
                  {omzetMaand.trend !== null && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-white/80">
                      <TrendingUp className="w-3 h-3" />
                      {omzetMaand.trend > 0 ? '+' : ''}
                      {omzetMaand.trend}%
                    </span>
                  )}
                </div>
                <p className="font-heading font-bold text-white text-[28px] leading-none">
                  <span className="text-[18px] text-white/60 mr-1">€</span>
                  <span className="font-mono">
                    {formatCurrency(omzetMaand.bedrag).replace(/^€\s*/, '')}
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* ── Alerts ── */}
          {verlopenFacturen.count > 0 && (
            <button
              type="button"
              onClick={() => navigate('/facturen')}
              className="w-full flex items-center gap-3 px-5 py-3 rounded-xl bg-[#FDE8E4] hover:bg-[#FBDDD6] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F15025]/40 focus-visible:ring-offset-2"
              aria-label={`${verlopenFacturen.count} verlopen facturen openen`}
            >
              <AlertTriangle className="h-4 w-4 text-[#F15025] flex-shrink-0" />
              <span className="flex-1 text-sm text-[#1A1A1A]">
                <span className="font-semibold">{verlopenFacturen.count} facturen verlopen</span>
                <span className="text-[#6B6B66]"> · </span>
                <span className="font-mono text-[#6B6B66]">{formatCurrency(verlopenFacturen.bedrag)}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-[#6B6B66] flex-shrink-0" />
            </button>
          )}

          <PortaalAlerts />

          {/* ── KPI-strip ── */}
          <KpiStrip />

          {/* ── Vandaag (links) | Opvolgen (rechts) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7">
              <VandaagBlok />
            </div>
            <div className="lg:col-span-5">
              <OpvolgenBlok />
            </div>
          </div>

          {/* ── Onboarding (alleen tijdens setup) ── */}
          <AanDeSlagSectie />
        </main>

        {/* ── Right rail ── */}
        <RightRail />
      </div>
    </div>
  )
}
