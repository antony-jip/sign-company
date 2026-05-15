import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { PortaalAlerts } from './PortaalAlerts'
import { usePortaalHerinnering } from '@/hooks/usePortaalHerinnering'
import { WeekStripWidget } from './WeekStripWidget'
import { WeatherWidget } from './WeatherWidget'
import { MontagePlanningWidget } from './MontagePlanningWidget'
import { CalendarMiniWidget } from './CalendarMiniWidget'
import { TeFacturerenWidget } from './TeFacturerenWidget'
import { ClockWidget } from './ClockWidget'
import { StatisticsCards } from './StatisticsCards'
import { RecenteActiviteitWidget } from './RecenteActiviteitWidget'
import { TodayPlanningWidget } from './TodayPlanningWidget'
import { PriorityTasks } from './PriorityTasks'
import { OpenstaandeOffertesWidget } from './OpenstaandeOffertesWidget'
import { AanDeSlagSectie } from './AanDeSlagSectie'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  BarChart3,
  Activity,
  CalendarDays,
  CheckSquare,
  FileText,
  Cloud,
  Wrench,
  Calendar,
  Receipt,
  Clock,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { DashboardDataProvider, useDashboardData } from '@/contexts/DashboardDataContext'
import { formatCurrency, cn } from '@/lib/utils'

// ============ GREETING ============

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Goeienacht'
  if (hour < 12) return 'Goeiemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goeienavond'
}

// ============ WIDGET REGISTRY (transitional — internal, not exported) ============

type WidgetSize = 1 | 2 | 3 | 4

interface WidgetDef {
  component: React.FC
  label: string
  icon: LucideIcon
  defaultSize: WidgetSize
  noCard?: boolean
}

const WIDGET_REGISTRY: Record<string, WidgetDef> = {
  statistieken: { component: StatisticsCards, label: 'Statistieken', icon: BarChart3, defaultSize: 4, noCard: true },
  planning: { component: TodayPlanningWidget, label: 'Planning vandaag', icon: CalendarDays, defaultSize: 2, noCard: true },
  taken: { component: PriorityTasks, label: 'Prioriteit taken', icon: CheckSquare, defaultSize: 2, noCard: true },
  montage: { component: MontagePlanningWidget, label: 'Montage planning', icon: Wrench, defaultSize: 3, noCard: true },
  weer: { component: WeatherWidget, label: 'Weer', icon: Cloud, defaultSize: 1, noCard: true },
  te_factureren: { component: TeFacturerenWidget, label: 'Te factureren', icon: Receipt, defaultSize: 2, noCard: true },
  kalender: { component: CalendarMiniWidget, label: 'Mini kalender', icon: Calendar, defaultSize: 1, noCard: true },
  klok: { component: ClockWidget, label: 'Klok', icon: Clock, defaultSize: 1 },
  activiteit: { component: RecenteActiviteitWidget, label: 'Recente activiteit', icon: Activity, defaultSize: 2, noCard: true },
  offertes: { component: OpenstaandeOffertesWidget, label: 'Openstaande offertes', icon: FileText, defaultSize: 2, noCard: true },
}

function getSizeClass(size: WidgetSize): string {
  switch (size) {
    case 4: return 'sm:col-span-2 lg:col-span-4'
    case 3: return 'sm:col-span-2 lg:col-span-3'
    case 2: return 'sm:col-span-2 lg:col-span-2'
    default: return ''
  }
}

// ============ MAIN COMPONENT ============

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
      f => (f.status === 'verzonden' || f.status === 'vervallen') && new Date(f.vervaldatum) < now
    )
    return {
      count: verlopen.length,
      bedrag: verlopen.reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0),
    }
  }, [facturen])

  const greeting = useMemo(() => getGreeting(), [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div className="space-y-8 sm:space-y-10 pb-12 overflow-x-hidden">
      {/* ── Hero header ── */}
      <div className="pt-2">
        <h1
          className="font-heading font-bold leading-[1.05] truncate text-[28px] sm:text-[40px]"
          style={{ letterSpacing: '-1.5px', color: '#1A1A1A' }}
        >
          {greeting}{userName ? `, ${userName}` : ''}<span className="text-[#F15025]">.</span>
        </h1>
        <p className="text-[13px] font-normal mt-2 text-[#9B9B95]">
          {formattedDate}
        </p>
      </div>

      {/* ── Aan de slag (alleen voor nieuwe gebruikers) ── */}
      <AanDeSlagSectie />

      {/* ── Week strip ── */}
      <div className="hidden md:block">
        <WeekStripWidget />
      </div>

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

      {/* ── Widget grid (transitional fixed-order render — drag/resize/hide removed) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {Object.entries(WIDGET_REGISTRY).map(([id, def], index) => {
          const WidgetComponent = def.component
          const size = def.defaultSize

          if (def.noCard) {
            return (
              <div
                key={id}
                className={cn(
                  'transition-all duration-300 ease-smooth animate-stagger-item',
                  getSizeClass(size),
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <WidgetComponent />
              </div>
            )
          }

          return (
            <div
              key={id}
              className={cn(
                'transition-all duration-300 ease-smooth animate-stagger-item',
                getSizeClass(size),
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card className="h-full overflow-hidden rounded-2xl bg-[#FEFDFB] hover:shadow-elevation-md transition-shadow duration-300" style={{ border: '0.5px solid hsl(35, 15%, 87%)' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em]">
                    <def.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{def.label}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WidgetComponent />
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
