import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import {
  AlertTriangle,
  ArrowRight,
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  type LucideIcon,
} from 'lucide-react'
import { PortaalAlerts } from './PortaalAlerts'
import { AanDeSlagSectie } from './AanDeSlagSectie'
import { VandaagBlok } from './VandaagBlok'
import { OpvolgenBlok } from './OpvolgenBlok'
import { KpiStrip } from './KpiStrip'
import { RightRail } from './RightRail'
import { usePortaalHerinnering } from '@/hooks/usePortaalHerinnering'
import { useWeather, type WeatherIconKey } from '@/hooks/useWeather'
import { DashboardDataProvider, useDashboardData } from '@/contexts/DashboardDataContext'
import { formatCurrency } from '@/lib/utils'

const WEATHER_ICONS: Record<WeatherIconKey, LucideIcon> = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  'cloud-fog': CloudFog,
  'cloud-drizzle': CloudDrizzle,
  'cloud-rain': CloudRain,
  'cloud-snow': CloudSnow,
  'cloud-lightning': CloudLightning,
}

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

  const weather = useWeather()
  const WeatherIcon = weather ? WEATHER_ICONS[weather.iconKey] : null

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

              {weather && WeatherIcon && (
                <div
                  className="hidden md:flex flex-col justify-center px-7 py-7 sm:px-8 w-[220px] relative overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* drifting cloud silhouettes — rustig parallax-effect */}
                  <svg
                    className="hero-cloud-a absolute pointer-events-none"
                    style={{ top: '18%', left: 0, width: '140%', height: 'auto', opacity: 0.05 }}
                    viewBox="0 0 200 60"
                    aria-hidden
                  >
                    <g fill="#FFFFFF">
                      <ellipse cx="40" cy="38" rx="32" ry="20" />
                      <ellipse cx="78" cy="28" rx="34" ry="22" />
                      <ellipse cx="118" cy="32" rx="30" ry="20" />
                      <ellipse cx="152" cy="38" rx="26" ry="18" />
                    </g>
                  </svg>
                  <svg
                    className="hero-cloud-b absolute pointer-events-none"
                    style={{ top: '55%', left: 0, width: '110%', height: 'auto', opacity: 0.035 }}
                    viewBox="0 0 200 60"
                    aria-hidden
                  >
                    <g fill="#FFFFFF">
                      <ellipse cx="50" cy="35" rx="36" ry="22" />
                      <ellipse cx="100" cy="28" rx="42" ry="24" />
                      <ellipse cx="150" cy="36" rx="34" ry="22" />
                    </g>
                  </svg>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <WeatherIcon
                        className="w-8 h-8 flex-shrink-0"
                        strokeWidth={1.4}
                        style={{ color: weather.isRaining ? '#9DD3DA' : '#F5C460' }}
                      />
                      <p className="font-heading font-bold text-white text-[40px] leading-none">
                        <span className="font-mono">{weather.temperature}</span>
                        <span className="text-white/60 text-[24px] font-normal">°</span>
                      </p>
                    </div>
                    <p
                      className="text-[14px] text-white/80"
                      style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                    >
                      {weather.label}
                    </p>
                  </div>
                </div>
              )}
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
