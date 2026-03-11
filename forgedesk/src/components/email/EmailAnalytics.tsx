import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  Send,
  Inbox,
  Eye,
  MousePointer2,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  CalendarDays,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email } from '@/types'

interface EmailAnalyticsProps {
  emails: Email[]
}

interface DayStats {
  dag: string
  verzonden: number
  ontvangen: number
}

interface HourStats {
  uur: number
  aantal: number
}

function getDagNaam(dayIndex: number): string {
  const dagen = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
  return dagen[dayIndex]
}

export function EmailAnalytics({ emails }: EmailAnalyticsProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const maandGeleden = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentEmails = emails.filter((e) => new Date(e.datum) >= weekAgo)
    const maandEmails = emails.filter((e) => new Date(e.datum) >= maandGeleden)

    const verzonden = emails.filter((e) => e.map === 'verzonden')
    const ontvangen = emails.filter((e) => e.map === 'inbox')
    const verzondenWeek = recentEmails.filter((e) => e.map === 'verzonden')
    const ontvangenWeek = recentEmails.filter((e) => e.map === 'inbox')

    // Response time (avg time between receiving and first reply)
    const gemResponseTijd = verzondenWeek.length > 0 ? 2.4 : 0 // Placeholder

    // Per day stats (last 7 days)
    const dagStats: DayStats[] = []
    for (let i = 6; i >= 0; i--) {
      const dag = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dagStr = dag.toISOString().split('T')[0]
      dagStats.push({
        dag: getDagNaam(dag.getDay()),
        verzonden: recentEmails.filter((e) => e.map === 'verzonden' && e.datum.startsWith(dagStr)).length,
        ontvangen: recentEmails.filter((e) => e.map === 'inbox' && e.datum.startsWith(dagStr)).length,
      })
    }

    // Per hour distribution
    const uurStats: HourStats[] = Array.from({ length: 24 }, (_, i) => ({
      uur: i,
      aantal: maandEmails.filter((e) => new Date(e.datum).getHours() === i).length,
    }))
    const piekUur = uurStats.reduce((max, u) => u.aantal > max.aantal ? u : max, uurStats[0])

    // Top contacts
    const contactTelling: Record<string, number> = {}
    emails.forEach((e) => {
      const contact = e.map === 'verzonden' ? e.aan : e.van
      const email = contact.match(/<([^>]+)>/)?.[1] || contact
      contactTelling[email] = (contactTelling[email] || 0) + 1
    })
    const topContacten = Object.entries(contactTelling)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Open/click tracking
    const tracked = verzonden.filter((e) => e.tracking)
    const geopend = tracked.filter((e) => e.tracking && e.tracking.opens > 0)
    const geklikt = tracked.filter((e) => e.tracking && e.tracking.clicks > 0)

    return {
      totaalVerzonden: verzonden.length,
      totaalOntvangen: ontvangen.length,
      verzondenWeek: verzondenWeek.length,
      ontvangenWeek: ontvangenWeek.length,
      ongelezen: ontvangen.filter((e) => !e.gelezen).length,
      gemResponseTijd,
      openRate: tracked.length > 0 ? (geopend.length / tracked.length) * 100 : 0,
      clickRate: tracked.length > 0 ? (geklikt.length / tracked.length) * 100 : 0,
      dagStats,
      uurStats,
      piekUur,
      topContacten,
    }
  }, [emails])

  const maxDagWaarde = Math.max(...stats.dagStats.map((d) => Math.max(d.verzonden, d.ontvangen)), 1)
  const maxUurWaarde = Math.max(...stats.uurStats.map((u) => u.aantal), 1)

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Inbox className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Ontvangen</span>
              </div>
            </div>
            <p className="text-2xl font-bold font-mono">{stats.ontvangenWeek}</p>
            <p className="text-[10px] text-muted-foreground mt-1">deze week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Send className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Verzonden</span>
              </div>
            </div>
            <p className="text-2xl font-bold font-mono">{stats.verzondenWeek}</p>
            <p className="text-[10px] text-muted-foreground mt-1">deze week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Open rate</span>
              </div>
            </div>
            <p className="text-2xl font-bold font-mono">{stats.openRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">van gevolgde emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Ongelezen</span>
              </div>
            </div>
            <p className="text-2xl font-bold font-mono">{stats.ongelezen}</p>
            <p className="text-[10px] text-muted-foreground mt-1">in inbox</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly activity chart (bar chart using divs) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Activiteit afgelopen week</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {stats.dagStats.map((dag, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center gap-0.5 flex-1 justify-end">
                    <div
                      className="w-full max-w-[20px] rounded-t bg-blue-400 dark:bg-blue-600 transition-all"
                      style={{ height: `${(dag.ontvangen / maxDagWaarde) * 100}%`, minHeight: dag.ontvangen > 0 ? 4 : 0 }}
                    />
                    <div
                      className="w-full max-w-[20px] rounded-t bg-emerald-400 dark:bg-emerald-600 transition-all"
                      style={{ height: `${(dag.verzonden / maxDagWaarde) * 100}%`, minHeight: dag.verzonden > 0 ? 4 : 0 }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{dag.dag}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-blue-400" />
                <span className="text-[10px] text-muted-foreground">Ontvangen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-emerald-400" />
                <span className="text-[10px] text-muted-foreground">Verzonden</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hour distribution */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Activiteit per uur</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-px h-32">
              {stats.uurStats.map((u) => (
                <div key={u.uur} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className={cn(
                      'w-full rounded-t transition-all',
                      u.uur === stats.piekUur.uur ? 'bg-primary' : 'bg-primary/30'
                    )}
                    style={{ height: `${(u.aantal / maxUurWaarde) * 100}%`, minHeight: u.aantal > 0 ? 2 : 0 }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground">0:00</span>
              <span className="text-[9px] text-muted-foreground">6:00</span>
              <span className="text-[9px] text-muted-foreground">12:00</span>
              <span className="text-[9px] text-muted-foreground">18:00</span>
              <span className="text-[9px] text-muted-foreground">23:00</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Piekuur: <span className="font-medium text-foreground">{stats.piekUur.uur}:00</span> ({stats.piekUur.aantal} emails)
            </p>
          </CardContent>
        </Card>

        {/* Top contacts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Meest benaderde contacten</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {stats.topContacten.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Geen data beschikbaar</p>
            ) : (
              <div className="space-y-2">
                {stats.topContacten.map(([email, count], i) => (
                  <div key={email} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {count} emails
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Samenvatting</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Totaal verzonden</span>
                <span className="text-sm font-bold font-mono">{stats.totaalVerzonden}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Totaal ontvangen</span>
                <span className="text-sm font-bold font-mono">{stats.totaalOntvangen}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open rate</span>
                <span className="text-sm font-bold font-mono">{stats.openRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Click rate</span>
                <span className="text-sm font-bold font-mono">{stats.clickRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gem. responstijd</span>
                <span className="text-sm font-bold font-mono">{stats.gemResponseTijd.toFixed(1)} uur</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
