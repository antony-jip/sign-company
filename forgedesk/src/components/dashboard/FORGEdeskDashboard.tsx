import React, { useMemo, useState, useEffect, useRef } from 'react'
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
  Columns3,
  type LucideIcon,
} from 'lucide-react'
import { getFacturen } from '@/services/supabaseService'
import type { Factuur } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { logger } from '../../utils/logger'
import { useDashboardLayout, type DashboardWidgetId, type WidgetSize } from '@/hooks/useDashboardLayout'

// ============ GREETING ============

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Goeiemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goeienavond'
}

// ============ WIDGET REGISTRY ============

interface WidgetDef {
  component: React.FC
  label: string
  icon: LucideIcon
  defaultSize: WidgetSize
  description: string
  noCard?: boolean
  fixedSize?: boolean // true = no resize control (e.g. statistieken)
}

export const WIDGET_REGISTRY: Record<DashboardWidgetId, WidgetDef> = {
  statistieken: { component: StatisticsCards, label: 'Statistieken', icon: BarChart3, defaultSize: 4, description: 'Openstaand, projecten, offertes, hit rate', noCard: true, fixedSize: true },
  activiteit: { component: RecenteActiviteitWidget, label: 'Recente activiteit', icon: Activity, defaultSize: 2, description: 'Laatste goedkeuringen, verzendingen en betalingen', noCard: true },
  planning: { component: TodayPlanningWidget, label: 'Planning vandaag', icon: CalendarDays, defaultSize: 2, description: 'Taken, events en montages voor vandaag', noCard: true },
  taken: { component: PriorityTasks, label: 'Prioriteit taken', icon: CheckSquare, defaultSize: 2, description: 'Top 5 taken op prioriteit', noCard: true },
  offertes: { component: OpenstaandeOffertesWidget, label: 'Openstaande offertes', icon: FileText, defaultSize: 2, description: 'Recente openstaande offertes', noCard: true },
  weer: { component: WeatherWidget, label: 'Weer', icon: Cloud, defaultSize: 1, description: 'Actueel weer en 4-daagse voorspelling', noCard: true },
  montage: { component: MontagePlanningWidget, label: 'Montage planning', icon: Wrench, defaultSize: 3, description: 'Weekplanning montage-afspraken', noCard: true },
  visualizer: { component: VisualizerDashboardWidget, label: 'Visualizer', icon: Sparkles, defaultSize: 2, description: 'AI visualizer statistieken', noCard: true },
  kalender: { component: CalendarMiniWidget, label: 'Mini kalender', icon: Calendar, defaultSize: 1, description: 'Compacte maandkalender met events', noCard: true },
  te_factureren: { component: TeFacturerenWidget, label: 'Te factureren', icon: Receipt, defaultSize: 2, description: 'Goedgekeurde offertes om te factureren', noCard: true },
  klok: { component: ClockWidget, label: 'Klok', icon: Clock, defaultSize: 1, description: 'Digitale klok met datum' },
  notities: { component: NotitieWidget, label: 'Notities', icon: StickyNote, defaultSize: 1, description: 'Snelle notities en memo\'s' },
  inbox: { component: InboxPreviewWidget, label: 'Inbox', icon: Mail, defaultSize: 2, description: 'Recente emails uit je inbox' },
  nieuws: { component: NieuwsWidget, label: 'Nieuws', icon: Newspaper, defaultSize: 2, description: 'Laatste nieuwskoppen' },
}

function getSizeClass(size: WidgetSize): string {
  switch (size) {
    case 4: return 'md:col-span-2 lg:col-span-4'
    case 3: return 'md:col-span-2 lg:col-span-3'
    case 2: return 'md:col-span-2 lg:col-span-2'
    default: return ''
  }
}

// ============ RESIZE CONTROL ============

const SIZE_OPTIONS: { value: WidgetSize; label: string; indicator: string }[] = [
  { value: 1, label: 'Smal', indicator: '▪' },
  { value: 2, label: 'Half', indicator: '▪▪' },
  { value: 3, label: 'Breed', indicator: '▪▪▪' },
  { value: 4, label: 'Volledig', indicator: '▪▪▪▪' },
]

function WidgetResizeControl({
  currentSize,
  onResize,
}: {
  currentSize: WidgetSize
  onResize: (size: WidgetSize) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick) }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors"
        title="Breedte aanpassen"
      >
        <Columns3 className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-elevation-md py-1 min-w-[140px]"
          onClick={e => e.stopPropagation()}
        >
          {SIZE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onResize(opt.value); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors',
                currentSize === opt.value
                  ? 'bg-muted font-semibold text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <span className="font-mono text-[10px] w-10 tracking-tight">{opt.indicator}</span>
              <span>{opt.label} ({opt.value === 1 ? '25%' : opt.value === 2 ? '50%' : opt.value === 3 ? '75%' : '100%'})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
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

  const greeting = useMemo(() => getGreeting(), [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const [showAddMenu, setShowAddMenu] = useState(false)
  const hiddenWidgets = layout.allWidgets.filter(id => layout.hidden.has(id))

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1
          className="font-heading text-[20px] font-bold leading-tight"
          style={{ letterSpacing: '-0.8px', color: 'hsl(25, 15%, 12%)' }}
        >
          {greeting}{userName ? `, ${userName}.` : '.'}
        </h1>
        <p className="text-[13px] font-normal mt-1" style={{ color: 'hsl(25, 10%, 45%)' }}>
          {formattedDate}
        </p>
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

      {/* Configurable widget grid — 4 columns on lg+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {layout.order.map((widgetId, index) => {
          const def = WIDGET_REGISTRY[widgetId]
          if (!def) return null

          const WidgetComponent = def.component
          const size = layout.sizes[widgetId] || def.defaultSize
          const isDragging = layout.draggedWidget === widgetId
          const isDragOver = layout.dragOverWidget === widgetId
          const showResize = !def.fixedSize

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
                  'group/widget relative transition-all duration-300 ease-smooth animate-stagger-item',
                  getSizeClass(size),
                  isDragging && 'opacity-40',
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {isDragOver && !isDragging && (
                  <div className="h-1 bg-primary/50 rounded-full mb-2 animate-pulse" />
                )}
                {showResize && (
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/widget:opacity-100 transition-opacity">
                    <WidgetResizeControl
                      currentSize={size}
                      onResize={(s) => layout.resizeWidget(widgetId, s)}
                    />
                  </div>
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
                'group/widget transition-all duration-300 ease-smooth animate-stagger-item',
                getSizeClass(size),
                isDragging && 'opacity-40',
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {isDragOver && !isDragging && (
                <div className="h-1 bg-primary/50 rounded-full mb-2 animate-pulse" />
              )}
              <Card className="h-full overflow-hidden rounded-2xl bg-[#FEFDFB]" style={{ border: '0.5px solid hsl(35, 15%, 87%)' }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em]">
                      <def.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{def.label}</span>
                    </CardTitle>
                    <div className="flex items-center gap-1 opacity-0 group-hover/widget:opacity-100 transition-opacity">
                      {showResize && (
                        <WidgetResizeControl
                          currentSize={size}
                          onResize={(s) => layout.resizeWidget(widgetId, s)}
                        />
                      )}
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
