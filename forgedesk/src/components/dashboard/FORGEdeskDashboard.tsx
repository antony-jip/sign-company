import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import {
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
import { DashboardDataProvider } from '@/contexts/DashboardDataContext'

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

const PLAYFUL_OCHTEND = [
  'Goedemorgen — zin om wat te doen?',
  'Wat ga jij vandaag doen?',
  'Welke is jouw eerste win vandaag?',
  'Slim begin — wat staat bovenaan?',
  'Eerst koffie, dan de wereld?',
  'Frisse start, frisse blik.',
  'Mooie dag om iets af te maken.',
]
const PLAYFUL_MIDDAG = [
  'Goedemiddag — nog energie voor één klus?',
  'Halverwege de dag — hoe staan we ervoor?',
  'Tijd voor het volgende?',
  'Wat krijgt vanmiddag jouw aandacht?',
  'Eén klus van de lijst, kom op.',
  'Productieve middag op de planning?',
]
const PLAYFUL_AVOND = [
  'Goedenavond — afronden of doortrekken?',
  'Laatste klusje voor je gaat?',
  'Was \'t een goede dag?',
  'Pak je nog één taakje mee?',
  'Tijd om rustig af te ronden.',
]
const PLAYFUL_GENERIC = [
  'Klaar voor de volgende stap?',
  'Zin om wat te doen?',
  'Eén ding tegelijk, kom op.',
  'Wat wil je vandaag écht afmaken?',
  'Welke klus krijgt jouw aandacht?',
]

function pickPlayfulGreeting(): string {
  const hour = new Date().getHours()
  const bucket =
    hour < 12 ? PLAYFUL_OCHTEND :
    hour < 18 ? PLAYFUL_MIDDAG :
    PLAYFUL_AVOND
  const pool = [...bucket, ...PLAYFUL_GENERIC]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function FORGEdeskDashboard() {
  return (
    <DashboardDataProvider>
      <FORGEdeskDashboardInner />
    </DashboardDataProvider>
  )
}

function FORGEdeskDashboardInner() {
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const userName = profile?.voornaam || user?.user_metadata?.voornaam || user?.email?.split('@')[0] || ''

  usePortaalHerinnering()

  const weather = useWeather()
  const WeatherIcon = weather ? WEATHER_ICONS[weather.iconKey] : null

  const { verb } = useMemo(() => getDagdeel(), [])

  const [playfulGreeting] = useState<string>(() => pickPlayfulGreeting())
  const [greetingVisible, setGreetingVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setGreetingVisible(false), 5000)
    return () => clearTimeout(t)
  }, [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateCaps = dateStr.toUpperCase()

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* ── Main column ── */}
        <main className="flex-1 min-w-0 space-y-5">
          {/* ── Hero — petrol-gradient card met omzet-overlay rechts ── */}
          <section
            className="relative rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #143E47 0%, #1A535C 55%, #2A6E78 100%)' }}
          >
            {/* Rustige Flame-orbs die langzaam over de banner drijven —
                vult de open vlakke ruimte op brede schermen subtiel op. */}
            <div
              className="hero-orb-a absolute pointer-events-none rounded-full"
              aria-hidden
              style={{
                top: '-30%',
                left: '38%',
                width: '420px',
                height: '420px',
                background: 'radial-gradient(closest-side, rgba(241,80,37,0.18), rgba(241,80,37,0) 70%)',
              }}
            />
            <div
              className="hero-orb-b absolute pointer-events-none rounded-full"
              aria-hidden
              style={{
                bottom: '-40%',
                left: '58%',
                width: '520px',
                height: '520px',
                background: 'radial-gradient(closest-side, rgba(157,211,218,0.14), rgba(157,211,218,0) 70%)',
              }}
            />
            <div className="relative flex flex-col md:flex-row">
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
                <p
                  aria-hidden={!greetingVisible}
                  className="text-[14px] sm:text-[15px] text-white/70 mt-3"
                  style={{
                    fontFamily: '"Instrument Serif", serif',
                    fontStyle: 'italic',
                    opacity: greetingVisible ? 1 : 0,
                    transition: 'opacity 800ms ease-out',
                    minHeight: '1.2em',
                  }}
                >
                  {playfulGreeting}
                </p>
              </div>

              {weather && WeatherIcon && (
                <div
                  className="hidden md:flex flex-col justify-center px-7 py-6 sm:px-8 w-[260px] relative overflow-hidden"
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
                    <div className="flex items-center gap-3 mb-1">
                      <WeatherIcon
                        className="w-8 h-8 flex-shrink-0"
                        strokeWidth={1.4}
                        style={{ color: weather.isRaining ? '#9DD3DA' : '#F5C460' }}
                      />
                      <p className="font-heading font-bold text-white text-[36px] leading-none">
                        <span className="font-mono">{weather.temperature}</span>
                        <span className="text-white/60 text-[22px] font-normal">°</span>
                      </p>
                    </div>
                    <p
                      className="text-[13px] text-white/80"
                      style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                    >
                      {weather.label}
                    </p>

                    {(weather.forecast?.length ?? 0) >= 2 && (
                      <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
                          {weather.forecast!.slice(1).map((day, idx) => {
                            const Icon = WEATHER_ICONS[day.iconKey]
                            const tint = day.isRaining ? '#9DD3DA' : '#F5C460'
                            const dateObj = new Date(day.date + 'T00:00:00')
                            const dagNaam = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][dateObj.getDay()]
                            const dagLabel = idx === 0
                              ? 'Morgen'
                              : idx === 1
                                ? 'Overmorgen'
                                : `${dagNaam} ${dateObj.getDate()}`
                            return (
                              <div key={day.date} className="min-w-[72px] flex-shrink-0">
                                <p className="text-[10px] uppercase tracking-wider text-white/55 font-mono whitespace-nowrap">
                                  {dagLabel}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.6} style={{ color: tint }} />
                                  <span className="text-[15px] text-white font-mono">
                                    {day.tempMax}<span className="text-white/55 text-[11px]">°</span>
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

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
