import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Eye,
  MousePointer2,
  Mail,
  Search,
  Clock,
  CheckCheck,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import type { Email } from '@/types'

interface EmailTrackingProps {
  emails: Email[]
}

interface TrackingStats {
  totalSent: number
  totalOpened: number
  totalClicked: number
  openRate: number
  clickRate: number
}

function getTrackingStatus(email: Email): 'delivered' | 'opened' | 'clicked' | 'not_tracked' {
  if (!email.tracking) return 'not_tracked'
  if (email.tracking.clicks > 0) return 'clicked'
  if (email.tracking.opens > 0) return 'opened'
  return 'delivered'
}

function getStatusConfig(status: ReturnType<typeof getTrackingStatus>) {
  switch (status) {
    case 'clicked':
      return { label: 'Geklikt', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', icon: MousePointer2 }
    case 'opened':
      return { label: 'Geopend', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: Eye }
    case 'delivered':
      return { label: 'Afgeleverd', color: 'bg-muted text-muted-foreground dark:bg-foreground/80 dark:text-muted-foreground/60', icon: CheckCheck }
    case 'not_tracked':
      return { label: 'Niet gevolgd', color: 'bg-muted text-muted-foreground', icon: AlertCircle }
  }
}

export function EmailTracking({ emails }: EmailTrackingProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const sentEmails = useMemo(() =>
    emails.filter((e) => e.map === 'verzonden').sort((a, b) =>
      new Date(b.datum).getTime() - new Date(a.datum).getTime()
    ),
    [emails]
  )

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return sentEmails
    const q = searchQuery.toLowerCase()
    return sentEmails.filter((e) =>
      e.onderwerp.toLowerCase().includes(q) ||
      e.aan.toLowerCase().includes(q)
    )
  }, [sentEmails, searchQuery])

  const stats: TrackingStats = useMemo(() => {
    const tracked = sentEmails.filter((e) => e.tracking)
    const totalSent = sentEmails.length
    const totalOpened = tracked.filter((e) => e.tracking && e.tracking.opens > 0).length
    const totalClicked = tracked.filter((e) => e.tracking && e.tracking.clicks > 0).length
    return {
      totalSent,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    }
  }, [sentEmails])

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Verzonden</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Geopend</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalOpened}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <MousePointer2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">Geklikt</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalClicked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Open rate</span>
            </div>
            <p className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Click rate</span>
            </div>
            <p className="text-2xl font-bold">{stats.clickRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoek verzonden emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tracking list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Verzonden emails tracking</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Geen verzonden emails</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmails.map((email) => {
                  const status = getTrackingStatus(email)
                  const config = getStatusConfig(status)
                  const StatusIcon = config.icon

                  return (
                    <div key={email.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{email.onderwerp}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Aan: {email.aan} — {formatDateTime(email.datum)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {email.tracking && email.tracking.opens > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="w-3 h-3" />
                            {email.tracking.opens}×
                          </div>
                        )}
                        {email.tracking && email.tracking.clicks > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MousePointer2 className="w-3 h-3" />
                            {email.tracking.clicks}×
                          </div>
                        )}
                        <Badge variant="secondary" className={cn('text-[10px] gap-1', config.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
