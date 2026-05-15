import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { PortaalAlerts } from './PortaalAlerts'
import { AanDeSlagSectie } from './AanDeSlagSectie'
import { VandaagBlok } from './VandaagBlok'
import { OpvolgenBlok } from './OpvolgenBlok'
import { TeFacturerenBlok } from './TeFacturerenBlok'
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

  const { verb } = useMemo(() => getDagdeel(), [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateCaps = dateStr.toUpperCase()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
      {/* ── Hero — petrol-gradient card ── */}
      <section
        className="rounded-2xl px-8 py-8 sm:px-10 sm:py-10 overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #143E47 0%, #1A535C 55%, #2A6E78 100%)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F15025]" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70 font-mono">
            {dateCaps}
          </span>
        </div>
        <h1
          className="font-heading font-bold leading-[1.05] text-[32px] sm:text-[44px] text-white"
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

      {/* ── Tijdslagen-grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <VandaagBlok />
        </div>
        <div className="lg:col-span-5">
          <OpvolgenBlok />
        </div>
        <div className="lg:col-span-12">
          <TeFacturerenBlok />
        </div>
      </div>

      {/* ── Onboarding-checklist (alleen tijdens setup) ── */}
      <AanDeSlagSectie />
    </div>
  )
}
