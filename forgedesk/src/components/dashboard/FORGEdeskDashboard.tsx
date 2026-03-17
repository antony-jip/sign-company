import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { PortaalAlerts } from './PortaalAlerts'
import { usePortaalHerinnering } from '@/hooks/usePortaalHerinnering'
import { ActionBlock } from './ActionBlock'
import { MoneyBlock } from './MoneyBlock'
import { WeekStripWidget } from './WeekStripWidget'
import { WeatherWidget } from './WeatherWidget'
import { MontagePlanningWidget } from './MontagePlanningWidget'
import { VisualizerDashboardWidget } from './VisualizerDashboardWidget'
import { CalendarMiniWidget } from './CalendarMiniWidget'
import { TeFacturerenWidget } from './TeFacturerenWidget'
import { ClockWidget } from './ClockWidget'
import { NotitieWidget } from './NotitieWidget'
import { InboxPreviewWidget } from './InboxPreviewWidget'
import { NieuwsWidget } from './NieuwsWidget'
import { StatisticsCards } from './StatisticsCards'
import { RecenteActiviteitWidget } from './RecenteActiviteitWidget'
import { TodayPlanningWidget } from './TodayPlanningWidget'
import { PriorityTasks } from './PriorityTasks'
import { OpenstaandeOffertesWidget } from './OpenstaandeOffertesWidget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  GripVertical,
  Plus,
  BarChart3,
  Activity,
  CalendarDays,
  CheckSquare,
  FileText,
  Cloud,
  Wrench,
  Sparkles,
  Calendar,
  Receipt,
  Clock,
  StickyNote,
  Mail,
  Newspaper,
  EyeOff,
  type LucideIcon,
} from 'lucide-react'
import { getFacturen } from '@/services/supabaseService'
import type { Factuur } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { logger } from '../../utils/logger'
import { useDashboardLayout, type DashboardWidgetId, type WidgetSize } from '@/hooks/useDashboardLayout'

// ============ GREETINGS ============

const GREETINGS: { greeting: string; timeOfDay: 'morning' | 'afternoon' | 'evening' }[] = [
  { greeting: 'Goedemorgen', timeOfDay: 'morning' },
  { greeting: 'Bonjour', timeOfDay: 'morning' },
  { greeting: 'Buenos días', timeOfDay: 'morning' },
  { greeting: 'Buongiorno', timeOfDay: 'morning' },
  { greeting: 'Goedemiddag', timeOfDay: 'afternoon' },
  { greeting: 'Bon après-midi', timeOfDay: 'afternoon' },
  { greeting: 'Buenas tardes', timeOfDay: 'afternoon' },
  { greeting: 'Buon pomeriggio', timeOfDay: 'afternoon' },
  { greeting: 'Goedenavond', timeOfDay: 'evening' },
  { greeting: 'Bonsoir', timeOfDay: 'evening' },
  { greeting: 'Buenas noches', timeOfDay: 'evening' },
  { greeting: 'Buonasera', timeOfDay: 'evening' },
]

function getPlayfulGreeting(): string {
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const options = GREETINGS.filter(g => g.timeOfDay === timeOfDay)
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return options[dayOfYear % options.length].greeting
}

// ============ WIDGET REGISTRY ============

interface WidgetDef {
  component: React.FC
  label: string
  icon: LucideIcon
  defaultSize: WidgetSize
  description: string
  noCard?: boolean // Some widgets render their own Card wrapper
}

export const WIDGET_REGISTRY: Record<DashboardWidgetId, WidgetDef> = {
  statistieken: { component: StatisticsCards, label: 'Statistieken', icon: BarChart3, defaultSize: 'large', description: 'Openstaand, projecten, offertes, hit rate', noCard: true },
  activiteit: { component: RecenteActiviteitWidget, label: 'Recente activiteit', icon: Activity, defaultSize: 'medium', description: 'Laatste goedkeuringen, verzendingen en betalingen', noCard: true },
  planning: { component: TodayPlanningWidget, label: 'Planning vandaag', icon: CalendarDays, defaultSize: 'medium', description: 'Taken, events en montages voor vandaag', noCard: true },
  taken: { component: PriorityTasks, label: 'Prioriteit taken', icon: CheckSquare, defaultSize: 'medium', description: 'Top 5 taken op prioriteit', noCard: true },
  offertes: { component: OpenstaandeOffertesWidget, label: 'Openstaande offertes', icon: FileText, defaultSize: 'medium', description: 'Recente openstaande offertes', noCard: true },
  weer: { component: WeatherWidget, label: 'Weer', icon: Cloud, defaultSize: 'medium', description: 'Actueel weer en 4-daagse voorspelling', noCard: true },
  montage: { component: MontagePlanningWidget, label: 'Montage planning', icon: Wrench, defaultSize: 'large', description: 'Weekplanning montage-afspraken', noCard: true },
  visualizer: { component: VisualizerDashboardWidget, label: 'Visualizer', icon: Sparkles, defaultSize: 'large', description: 'AI visualizer statistieken', noCard: true },
  kalender: { component: CalendarMiniWidget, label: 'Mini kalender', icon: Calendar, defaultSize: 'medium', description: 'Compacte maandkalender met events', noCard: true },
  te_factureren: { component: TeFacturerenWidget, label: 'Te factureren', icon: Receipt, defaultSize: 'medium', description: 'Goedgekeurde offertes om te factureren', noCard: true },
  klok: { component: ClockWidget, label: 'Klok', icon: Clock, defaultSize: 'small', description: 'Digitale klok met datum' },
  notities: { component: NotitieWidget, label: 'Notities', icon: StickyNote, defaultSize: 'medium', description: 'Snelle notities en memo\'s' },
  inbox: { component: InboxPreviewWidget, label: 'Inbox', icon: Mail, defaultSize: 'medium', description: 'Recente emails uit je inbox' },
  nieuws: { component: NieuwsWidget, label: 'Nieuws', icon: Newspaper, defaultSize: 'medium', description: 'Laatste nieuwskoppen' },
}

function getSizeClass(size: WidgetSize): string {
  switch (size) {
    case 'large': return 'lg:col-span-2'
    default: return ''
  }
}

// ============ MAIN COMPONENT ============

export function FORGEdeskDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const userName = profile?.voornaam || user?.user_metadata?.voornaam || user?.email?.split('@')[0] || ''
  const layout = useDashboardLayout()

  usePortaalHerinnering()

  const [verlopenFacturen, setVerlopenFacturen] = useState<{ count: number; bedrag: number }>({ count: 0, bedrag: 0 })

  useEffect(() => {
    let cancelled = false
    getFacturen()
      .then((facturen: Factuur[]) => {
        if (cancelled) return
        const now = new Date()
        const verlopen = facturen.filter(
          f => (f.status === 'verzonden' || f.status === 'vervallen') && new Date(f.vervaldatum) < now
        )
        setVerlopenFacturen({
          count: verlopen.length,
          bedrag: verlopen.reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0),
        })
      })
      .catch(logger.error)
    return () => { cancelled = true }
  }, [])

  const greeting = useMemo(() => getPlayfulGreeting(), [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const [showAddMenu, setShowAddMenu] = useState(false)
  const hiddenWidgets = layout.allWidgets.filter(id => layout.hidden.has(id))

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground/70 mb-1.5 font-mono">{formattedDate}</p>
          <h1 className="text-[32px] sm:text-[38px] font-extrabold tracking-[-0.04em] leading-[1.1] text-foreground">
            {greeting}{userName ? ', ' : ''}
            {userName && <span className="wm-gradient-text">{userName}</span>}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/offertes/nieuw')}
            className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-[12px] bg-foreground text-background shadow-elevation-sm hover:shadow-elevation-md hover:-translate-y-0.5 transition-all duration-300 ease-spring active:scale-[0.96]"
          >
            + Nieuwe offerte
          </button>
        </div>
      </div>

      {/* Verlopen facturen alert */}
      {verlopenFacturen.count > 0 && (
        <div
          onClick={() => navigate('/facturen')}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/8 dark:bg-destructive/10 text-destructive cursor-pointer hover:bg-destructive/12 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            <strong>{verlopenFacturen.count} facturen verlopen</strong> — {formatCurrency(verlopenFacturen.bedrag)} openstaand
          </span>
          <span className="ml-auto text-sm font-bold whitespace-nowrap hover:translate-x-0.5 transition-transform">
            Bekijk →
          </span>
        </div>
      )}

      <PortaalAlerts />

      {/* Configurable widget grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {layout.order.map((widgetId, index) => {
          const def = WIDGET_REGISTRY[widgetId]
          if (!def) return null

          const WidgetComponent = def.component
          const size = layout.sizes[widgetId] || def.defaultSize
          const isDragging = layout.draggedWidget === widgetId
          const isDragOver = layout.dragOverWidget === widgetId

          // Widgets that already render their own Card
          if (def.noCard) {
            return (
              <div
                key={widgetId}
                draggable
                onDragStart={(e) => layout.handleDragStart(e, widgetId)}
                onDragEnd={layout.handleDragEnd}
                onDragEnter={(e) => layout.handleDragEnter(e, widgetId)}
                onDragLeave={layout.handleDragLeave}
                onDragOver={layout.handleDragOver}
                onDrop={(e) => layout.handleDrop(e, widgetId)}
                className={cn(
                  'group/widget transition-all animate-stagger-item',
                  getSizeClass(size),
                  isDragging && 'opacity-40',
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {isDragOver && !isDragging && (
                  <div className="h-1 bg-primary/50 rounded-full mb-2 animate-pulse" />
                )}
                <WidgetComponent />
              </div>
            )
          }

          // New widgets that need a Card wrapper
          return (
            <div
              key={widgetId}
              draggable
              onDragStart={(e) => layout.handleDragStart(e, widgetId)}
              onDragEnd={layout.handleDragEnd}
              onDragEnter={(e) => layout.handleDragEnter(e, widgetId)}
              onDragLeave={layout.handleDragLeave}
              onDragOver={layout.handleDragOver}
              onDrop={(e) => layout.handleDrop(e, widgetId)}
              className={cn(
                'group/widget transition-all animate-stagger-item',
                getSizeClass(size),
                isDragging && 'opacity-40',
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {isDragOver && !isDragging && (
                <div className="h-1 bg-primary/50 rounded-full mb-2 animate-pulse" />
              )}
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-primary shadow-sm">
                        <def.icon className="h-4 w-4 text-white" />
                      </div>
                      <span>{def.label}</span>
                    </CardTitle>
                    <div className="flex items-center gap-1 opacity-0 group-hover/widget:opacity-100 transition-opacity">
                      <button
                        onClick={() => layout.toggleWidget(widgetId)}
                        className="p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors"
                        title="Verbergen"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                      <div className="cursor-grab active:cursor-grabbing p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors">
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <WidgetComponent />
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Add widget */}
      {hiddenWidgets.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Widget toevoegen</span>
          </button>
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-xl p-3 z-20 max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hiddenWidgets.map((id) => {
                    const def = WIDGET_REGISTRY[id]
                    if (!def) return null
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          layout.toggleWidget(id)
                          setShowAddMenu(false)
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex-shrink-0">
                          <def.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{def.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{def.description}</p>
                        </div>
                        <Plus className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
