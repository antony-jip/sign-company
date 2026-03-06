import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bell,
  AlertTriangle,
  Clock,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  TrendingUp,
  Timer,
  ArrowRight,
  Loader2,
  Phone,
} from 'lucide-react'
import { getOffertes } from '@/services/supabaseService'
import type { Offerte } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { logger } from '../../utils/logger'

interface FollowUpItem {
  offerte: Offerte
  daysOffset: number
}

interface ExpiringQuote {
  offerte: Offerte
  daysUntilExpiry: number
}

function daysBetween(dateA: Date, dateB: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate())
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate())
  return Math.floor((utcB - utcA) / msPerDay)
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1).trimEnd() + '\u2026'
}

function getPriorityIndicator(prioriteit?: string): { dot: string; label: string } {
  switch (prioriteit) {
    case 'urgent':
      return { dot: 'bg-red-500', label: 'Urgent' }
    case 'hoog':
      return { dot: 'bg-orange-500', label: 'Hoog' }
    case 'medium':
      return { dot: 'bg-yellow-500', label: 'Medium' }
    case 'laag':
      return { dot: 'bg-green-500', label: 'Laag' }
    default:
      return { dot: 'bg-muted-foreground/40', label: '' }
  }
}

function FollowUpItemRow({
  item,
  accent,
}: {
  key?: string | number
  item: FollowUpItem
  accent: 'red' | 'orange' | 'blue'
}) {
  const accentStyles = {
    red: {
      border: 'border-l-red-500',
      bg: 'bg-red-50/50 dark:bg-red-950/20',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    },
    orange: {
      border: 'border-l-orange-500',
      bg: 'bg-orange-50/50 dark:bg-orange-950/20',
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    },
    blue: {
      border: 'border-l-blue-500',
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
  }

  const styles = accentStyles[accent]
  const priority = getPriorityIndicator(item.offerte.prioriteit)
  const daysAbs = Math.abs(item.daysOffset)

  const daysLabel =
    accent === 'red'
      ? `${daysAbs} ${daysAbs === 1 ? 'dag' : 'dagen'} achterstallig`
      : accent === 'orange'
        ? 'Vandaag'
        : `Over ${daysAbs} ${daysAbs === 1 ? 'dag' : 'dagen'}`

  return (
    <Link
      to={`/offertes/${item.offerte.id}/bewerken`}
      className={cn(
        'block rounded-xl border-l-[3px] p-3 transition-all duration-200',
        'hover:shadow-sm hover:scale-[1.01]',
        styles.border,
        styles.bg,
        'backdrop-blur-sm'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {priority.dot && (
              <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', priority.dot)} />
            )}
            <p className="text-sm font-medium text-foreground dark:text-white truncate">
              {item.offerte.klant_naam || 'Onbekende klant'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
            {item.offerte.nummer} &middot; {formatCurrency(item.offerte.totaal)}
          </p>
          {item.offerte.follow_up_notitie && (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-1 italic leading-relaxed">
              &ldquo;{truncateText(item.offerte.follow_up_notitie, 60)}&rdquo;
            </p>
          )}
          {item.offerte.contact_pogingen != null && item.offerte.contact_pogingen > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Phone className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground/60">
                {item.offerte.contact_pogingen}x contact
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', styles.badge)}>
            {daysLabel}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/50 dark:text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}

function ExpiringQuoteRow({ item }: { key?: string | number; item: ExpiringQuote }) {
  const isExpired = item.daysUntilExpiry < 0
  const daysAbs = Math.abs(item.daysUntilExpiry)

  return (
    <Link
      to={`/offertes/${item.offerte.id}/bewerken`}
      className={cn(
        'flex items-center gap-3 rounded-xl p-2.5 transition-all duration-200',
        'hover:shadow-sm hover:scale-[1.01]',
        isExpired
          ? 'bg-red-50/60 dark:bg-red-950/20'
          : 'bg-amber-50/60 dark:bg-amber-950/20',
        'backdrop-blur-sm'
      )}
    >
      <FileWarning
        className={cn(
          'h-4 w-4 flex-shrink-0',
          isExpired
            ? 'text-red-500 dark:text-red-400'
            : 'text-amber-500 dark:text-amber-400'
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground/70 dark:text-muted-foreground/50 leading-snug">
          {isExpired ? (
            <>
              Offerte <span className="font-semibold">{item.offerte.nummer}</span> is{' '}
              <span className="text-red-600 dark:text-red-400 font-medium">
                {daysAbs} {daysAbs === 1 ? 'dag' : 'dagen'} verlopen
              </span>
            </>
          ) : item.daysUntilExpiry === 0 ? (
            <>
              Offerte <span className="font-semibold">{item.offerte.nummer}</span>{' '}
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                verloopt vandaag
              </span>
            </>
          ) : (
            <>
              Offerte <span className="font-semibold">{item.offerte.nummer}</span> verloopt over{' '}
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {daysAbs} {daysAbs === 1 ? 'dag' : 'dagen'}
              </span>
            </>
          )}
        </p>
      </div>
      <ArrowRight className="h-3 w-3 text-muted-foreground/50 dark:text-muted-foreground flex-shrink-0" />
    </Link>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>
      <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 text-center">{message}</p>
    </div>
  )
}

export function SalesFollowUpWidget() {
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('achterstallig')

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setLoading(true)
        const data = await getOffertes()
        if (!cancelled) setOffertes(data)
      } catch (error) {
        logger.error('Error loading offertes for follow-up widget:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const {
    overdueItems,
    todayItems,
    upcomingItems,
    expiringQuotes,
    totalActionItems,
    openCount,
    openValue,
    conversionRate,
    avgResponseDays,
  } = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const overdue: FollowUpItem[] = []
    const todayFollowUps: FollowUpItem[] = []
    const upcoming: FollowUpItem[] = []
    const expiring: ExpiringQuote[] = []

    for (const offerte of offertes) {
      // Follow-up categorization
      if (
        offerte.follow_up_datum &&
        offerte.follow_up_status !== 'afgerond'
      ) {
        const followUpDate = new Date(offerte.follow_up_datum)
        const followUpDay = new Date(
          followUpDate.getFullYear(),
          followUpDate.getMonth(),
          followUpDate.getDate()
        )
        const diff = daysBetween(today, followUpDay)

        if (diff < 0) {
          overdue.push({ offerte, daysOffset: diff })
        } else if (diff === 0) {
          todayFollowUps.push({ offerte, daysOffset: 0 })
        } else if (diff <= 7) {
          upcoming.push({ offerte, daysOffset: diff })
        }
      }

      // Expiring quotes: geldig_tot within 7 days or past, status still open
      if (
        (offerte.status === 'verzonden' || offerte.status === 'bekeken') &&
        offerte.geldig_tot
      ) {
        const expiryDate = new Date(offerte.geldig_tot)
        const expiryDay = new Date(
          expiryDate.getFullYear(),
          expiryDate.getMonth(),
          expiryDate.getDate()
        )
        const daysUntilExpiry = daysBetween(today, expiryDay)

        if (daysUntilExpiry <= 7) {
          expiring.push({ offerte, daysUntilExpiry })
        }
      }
    }

    // Sort: overdue most overdue first, upcoming soonest first
    overdue.sort((a, b) => a.daysOffset - b.daysOffset)
    upcoming.sort((a, b) => a.daysOffset - b.daysOffset)
    expiring.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

    // Stats calculations
    const openOffertes = offertes.filter(
      (o) => o.status === 'verzonden' || o.status === 'bekeken'
    )
    const openCountVal = openOffertes.length
    const openValueVal = openOffertes.reduce((sum, o) => sum + o.totaal, 0)

    // Conversion rate this month
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const thisMonthOffertes = offertes.filter((o) => {
      const created = new Date(o.created_at)
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear
    })
    const thisMonthDecided = thisMonthOffertes.filter(
      (o) => o.status === 'goedgekeurd' || o.status === 'afgewezen'
    )
    const thisMonthApproved = thisMonthOffertes.filter((o) => o.status === 'goedgekeurd')
    const conversionRateVal =
      thisMonthDecided.length > 0
        ? Math.round((thisMonthApproved.length / thisMonthDecided.length) * 100)
        : thisMonthApproved.length > 0
          ? 100
          : 0

    // Average response time: days between created_at and updated_at for goedgekeurd offertes
    const approvedOffertes = offertes.filter((o) => o.status === 'goedgekeurd')
    let avgDays = 0
    if (approvedOffertes.length > 0) {
      const totalDays = approvedOffertes.reduce((sum, o) => {
        const created = new Date(o.created_at)
        const updated = new Date(o.updated_at)
        return sum + Math.max(0, daysBetween(created, updated))
      }, 0)
      avgDays = Math.round(totalDays / approvedOffertes.length)
    }

    const totalActions = overdue.length + todayFollowUps.length + expiring.length

    return {
      overdueItems: overdue,
      todayItems: todayFollowUps,
      upcomingItems: upcoming,
      expiringQuotes: expiring,
      totalActionItems: totalActions,
      openCount: openCountVal,
      openValue: openValueVal,
      conversionRate: conversionRateVal,
      avgResponseDays: avgDays,
    }
  }, [offertes])

  const hasFollowUps = overdueItems.length > 0 || todayItems.length > 0 || upcomingItems.length > 0
  const hasExpiringQuotes = expiringQuotes.length > 0
  const hasContent = hasFollowUps || hasExpiringQuotes

  // Auto-select the most relevant tab
  useEffect(() => {
    if (overdueItems.length > 0) {
      setActiveTab('achterstallig')
    } else if (todayItems.length > 0) {
      setActiveTab('vandaag')
    } else if (upcomingItems.length > 0) {
      setActiveTab('komend')
    }
  }, [overdueItems.length, todayItems.length, upcomingItems.length])

  return (
    <Card className="rounded-2xl border border-border/60 dark:border-border/40 shadow-sm backdrop-blur-sm bg-white/80 dark:bg-foreground/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold text-foreground dark:text-white">
              Opvolging & Follow-ups
            </span>
          </div>
          {!loading && totalActionItems > 0 && (
            <Badge
              variant="destructive"
              className="h-6 min-w-[24px] flex items-center justify-center text-xs font-bold rounded-full px-2"
            >
              {totalActionItems}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
          </div>
        ) : !hasContent ? (
          <EmptyState message="Alles is bijgewerkt! Geen openstaande follow-ups of verlopende offertes." />
        ) : (
          <>
            {/* Follow-up tabs */}
            {hasFollowUps && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3 h-9 bg-muted/80 dark:bg-foreground/80/60 rounded-xl p-0.5">
                  <TabsTrigger
                    value="achterstallig"
                    className={cn(
                      'text-xs rounded-lg data-[state=active]:shadow-sm transition-all',
                      overdueItems.length > 0
                        ? 'data-[state=active]:bg-red-50 data-[state=active]:text-red-700 dark:data-[state=active]:bg-red-900/40 dark:data-[state=active]:text-red-300'
                        : 'data-[state=active]:bg-white dark:data-[state=active]:bg-foreground/70'
                    )}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Achterstallig</span>
                    <span className="sm:hidden">Late</span>
                    {overdueItems.length > 0 && (
                      <span className="ml-1 text-[10px] bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                        {overdueItems.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="vandaag"
                    className={cn(
                      'text-xs rounded-lg data-[state=active]:shadow-sm transition-all',
                      todayItems.length > 0
                        ? 'data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 dark:data-[state=active]:bg-orange-900/40 dark:data-[state=active]:text-orange-300'
                        : 'data-[state=active]:bg-white dark:data-[state=active]:bg-foreground/70'
                    )}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Vandaag
                    {todayItems.length > 0 && (
                      <span className="ml-1 text-[10px] bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                        {todayItems.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="komend"
                    className={cn(
                      'text-xs rounded-lg data-[state=active]:shadow-sm transition-all',
                      upcomingItems.length > 0
                        ? 'data-[state=active]:bg-primary/10 data-[state=active]:text-accent dark:data-[state=active]:bg-primary/20 dark:data-[state=active]:text-wm-light'
                        : 'data-[state=active]:bg-white dark:data-[state=active]:bg-foreground/70'
                    )}
                  >
                    <CalendarClock className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Komend</span>
                    <span className="sm:hidden">7d</span>
                    {upcomingItems.length > 0 && (
                      <span className="ml-1 text-[10px] bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                        {upcomingItems.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="achterstallig" className="mt-3">
                  {overdueItems.length === 0 ? (
                    <EmptyState message="Geen achterstallige follow-ups!" />
                  ) : (
                    <ScrollArea className="max-h-[240px]">
                      <div className="space-y-2 pr-2">
                        {overdueItems.map((item) => (
                          <FollowUpItemRow
                            key={item.offerte.id}
                            item={item}
                            accent="red"
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="vandaag" className="mt-3">
                  {todayItems.length === 0 ? (
                    <EmptyState message="Geen follow-ups voor vandaag." />
                  ) : (
                    <ScrollArea className="max-h-[240px]">
                      <div className="space-y-2 pr-2">
                        {todayItems.map((item) => (
                          <FollowUpItemRow
                            key={item.offerte.id}
                            item={item}
                            accent="orange"
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="komend" className="mt-3">
                  {upcomingItems.length === 0 ? (
                    <EmptyState message="Geen follow-ups in de komende 7 dagen." />
                  ) : (
                    <ScrollArea className="max-h-[240px]">
                      <div className="space-y-2 pr-2">
                        {upcomingItems.map((item) => (
                          <FollowUpItemRow
                            key={item.offerte.id}
                            item={item}
                            accent="blue"
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {/* Expiring quotes alert section */}
            {hasExpiringQuotes && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-px flex-1 bg-secondary dark:bg-foreground/70" />
                  <span className="text-[11px] font-medium text-muted-foreground/60 dark:text-muted-foreground uppercase tracking-wider flex-shrink-0">
                    Verlopende offertes
                  </span>
                  <div className="h-px flex-1 bg-secondary dark:bg-foreground/70" />
                </div>
                <ScrollArea className="max-h-[160px]">
                  <div className="space-y-1.5 pr-2">
                    {expiringQuotes.map((item) => (
                      <ExpiringQuoteRow key={item.offerte.id} item={item} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}

        {/* Quick stats row */}
        {!loading && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border dark:border-border">
            <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-background/80 dark:bg-foreground/80/40 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-[11px] text-muted-foreground dark:text-muted-foreground/60">Open</span>
              </div>
              <span className="text-sm font-bold text-foreground dark:text-white">
                {openCount}
              </span>
              <span className="text-[10px] text-muted-foreground/60 dark:text-muted-foreground leading-tight text-center">
                {formatCurrency(openValue)}
              </span>
            </div>

            <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-background/80 dark:bg-foreground/80/40 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-[11px] text-muted-foreground dark:text-muted-foreground/60">Conversie</span>
              </div>
              <span className="text-sm font-bold text-foreground dark:text-white">
                {conversionRate}%
              </span>
              <span className="text-[10px] text-muted-foreground/60 dark:text-muted-foreground leading-tight text-center">
                deze maand
              </span>
            </div>

            <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-background/80 dark:bg-foreground/80/40 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                <Timer className="h-3 w-3 text-[#4A442D]" />
                <span className="text-[11px] text-muted-foreground dark:text-muted-foreground/60">Gem. reactie</span>
              </div>
              <span className="text-sm font-bold text-foreground dark:text-white">
                {avgResponseDays}d
              </span>
              <span className="text-[10px] text-muted-foreground/60 dark:text-muted-foreground leading-tight text-center">
                goedgekeurd
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
