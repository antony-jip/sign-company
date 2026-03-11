import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Link2,
  Copy,
  ExternalLink,
  CheckCircle2,
  RotateCcw,
  Eye,
  Clock,
  FileText,
  Image,
  Receipt,
  Upload,
  BellRing,
  CreditCard,
  Loader2,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  getAllPortalen,
  getNotificaties,
} from '@/services/supabaseService'
import type { ProjectPortaal, PortaalItem, Notificatie } from '@/types'
import { formatDate } from '@/lib/utils'
import { usePortaalHerinnering } from '@/hooks/usePortaalHerinnering'

type PortaalEnriched = ProjectPortaal & {
  project_naam?: string
  klant_naam?: string
  klant_id?: string
  items?: PortaalItem[]
}

type FilterType = 'alle' | 'wacht' | 'revisie' | 'afgerond'

function getPortaalStatus(items: PortaalItem[]): { label: string; color: string; icon: typeof CheckCircle2 } {
  if (items.length === 0) return { label: 'Leeg', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: Clock }
  const hasRevisie = items.some(i => i.status === 'revisie')
  if (hasRevisie) return { label: 'Revisie gevraagd', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: RotateCcw }
  const allDone = items.every(i => ['goedgekeurd', 'betaald', 'vervangen'].includes(i.status))
  if (allDone) return { label: 'Afgerond', color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', icon: CheckCircle2 }
  return { label: 'Wacht op reactie', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: Clock }
}

function getItemSamenvatting(items: PortaalItem[]): string {
  const types: Record<string, { total: number; done: number }> = {}
  for (const item of items) {
    const t = item.type
    if (!types[t]) types[t] = { total: 0, done: 0 }
    types[t].total++
    if (['goedgekeurd', 'betaald'].includes(item.status)) types[t].done++
  }
  const labels: Record<string, string> = { offerte: 'offerte', tekening: 'tekening', factuur: 'factuur', bericht: 'bericht' }
  return Object.entries(types).map(([t, { total, done }]) => {
    const label = labels[t] || t
    const plural = total > 1 ? (label === 'bericht' ? 'berichten' : label + 'en') : label
    const check = done === total && total > 0 ? ' ✓' : done > 0 ? ` (${done}/${total} ✓)` : ''
    return `${total} ${plural}${check}`
  }).join(' · ')
}

function getLaatsteActiviteit(items: PortaalItem[]): { text: string; date: string } | null {
  // Collect all reacties across items
  const allReacties: { type: string; klant_naam: string | null; created_at: string; bericht: string | null }[] = []
  for (const item of items) {
    if (item.reacties) {
      for (const r of item.reacties) {
        allReacties.push(r as { type: string; klant_naam: string | null; created_at: string; bericht: string | null })
      }
    }
  }
  if (allReacties.length === 0) return null
  allReacties.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const last = allReacties[0]
  const actie = last.type === 'goedkeuring' ? 'Goedgekeurd' : last.type === 'revisie' ? 'Revisie gevraagd' : 'Bericht'
  const naam = last.klant_naam || 'Klant'
  return { text: `${actie} door ${naam}`, date: last.created_at }
}

function formatTijdGeleden(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)
  if (diffHours < 1) return 'Zojuist'
  if (diffHours < 24) return `${diffHours} uur geleden`
  if (diffDays === 1) return 'Gisteren'
  return `${diffDays} dagen geleden`
}

function matchesFilter(portaal: PortaalEnriched, filter: FilterType): boolean {
  const items = portaal.items || []
  if (filter === 'alle') return true
  const status = getPortaalStatus(items)
  if (filter === 'wacht') return status.label === 'Wacht op reactie'
  if (filter === 'revisie') return status.label === 'Revisie gevraagd'
  if (filter === 'afgerond') return status.label === 'Afgerond'
  return true
}

export function PortalenOverzicht() {
  const navigate = useNavigate()
  const [portalen, setPortalen] = useState<PortaalEnriched[]>([])
  const [notificaties, setNotificaties] = useState<Notificatie[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('alle')

  // Automatische herinnering check
  usePortaalHerinnering()

  const fetchData = useCallback(async () => {
    try {
      const [p, n] = await Promise.all([getAllPortalen(), getNotificaties()])
      setPortalen(p)
      setNotificaties(n)
    } catch (err) {
      console.error('Fout bij ophalen portalen:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/portaal/${token}`)
    toast.success('Portaallink gekopieerd')
  }

  const filtered = portalen.filter(p => matchesFilter(p, filter))

  // Activiteit stream: all reacties across all portalen, sorted by date
  const allActiviteit: { type: string; klant_naam: string; project_naam: string; item_titel: string; bericht: string | null; created_at: string; project_id: string }[] = []
  for (const portaal of portalen) {
    for (const item of portaal.items || []) {
      if (item.reacties) {
        for (const r of item.reacties) {
          allActiviteit.push({
            type: (r as { type: string }).type,
            klant_naam: (r as { klant_naam: string | null }).klant_naam || portaal.klant_naam || 'Klant',
            project_naam: portaal.project_naam || '',
            item_titel: item.titel,
            bericht: (r as { bericht: string | null }).bericht,
            created_at: (r as { created_at: string }).created_at,
            project_id: portaal.project_id,
          })
        }
      }
    }
  }
  allActiviteit.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Group activity by day
  const activiteitByDay: Record<string, typeof allActiviteit> = {}
  for (const a of allActiviteit.slice(0, 20)) {
    const date = new Date(a.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    let key: string
    if (date.toDateString() === today.toDateString()) key = 'Vandaag'
    else if (date.toDateString() === yesterday.toDateString()) key = 'Gisteren'
    else key = formatDate(a.created_at)
    if (!activiteitByDay[key]) activiteitByDay[key] = []
    activiteitByDay[key].push(a)
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'alle', label: 'Alle' },
    { key: 'wacht', label: 'Wacht op reactie' },
    { key: 'revisie', label: 'Revisie gevraagd' },
    { key: 'afgerond', label: 'Afgerond' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Klantportalen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {portalen.length} portaal{portalen.length !== 1 ? 's' : ''} actief
          </p>
        </div>
        <Button onClick={() => navigate('/projecten')} size="sm">
          + Nieuw portaal
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Portaal kaarten */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Link2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Geen portalen gevonden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(portaal => {
            const items = portaal.items || []
            const status = getPortaalStatus(items)
            const StatusIcon = status.icon
            const laatsteActiviteit = getLaatsteActiviteit(items)
            const samenvatting = getItemSamenvatting(items)
            const isVerlopen = new Date(portaal.verloopt_op) < new Date()

            return (
              <Card key={portaal.id} className="border-border/80 hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {portaal.klant_naam || 'Onbekend'}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground truncate">
                          {portaal.project_naam || 'Project'}
                        </span>
                      </div>

                      {/* Status + laatste activiteit */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className={`${status.color} text-[10px] px-1.5 flex items-center gap-0.5`}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {status.label}
                        </Badge>
                        {isVerlopen && !portaal.actief && (
                          <Badge className="bg-gray-100 text-gray-500 text-[10px]">Verlopen</Badge>
                        )}
                      </div>

                      {/* Laatste activiteit */}
                      {laatsteActiviteit && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {laatsteActiviteit.text} — {formatTijdGeleden(laatsteActiviteit.date)}
                        </p>
                      )}

                      {/* Item samenvatting */}
                      {samenvatting && (
                        <p className="text-[11px] text-muted-foreground/70 mt-1">{samenvatting}</p>
                      )}
                    </div>

                    {/* Acties */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => navigate(`/projecten/${portaal.project_id}`)}
                      >
                        Bekijk
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyLink(portaal.token)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <a
                        href={`${window.location.origin}/portaal/${portaal.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center h-7 px-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Activiteit stream */}
      {allActiviteit.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activiteit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(activiteitByDay).map(([dag, items]) => (
              <div key={dag}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{dag}</h4>
                <div className="space-y-1.5">
                  {items.map((act, i) => {
                    const isGoedkeuring = act.type === 'goedkeuring'
                    const isRevisie = act.type === 'revisie'
                    const Icon = isGoedkeuring ? CheckCircle2 : isRevisie ? RotateCcw : Eye
                    const iconColor = isGoedkeuring ? 'text-green-500' : isRevisie ? 'text-amber-500' : 'text-blue-500'
                    const actieLabel = isGoedkeuring ? 'goedgekeurd' : isRevisie ? 'revisie gevraagd' : 'bericht gestuurd'

                    return (
                      <button
                        key={`${act.created_at}-${i}`}
                        onClick={() => navigate(`/projecten/${act.project_id}`)}
                        className="flex items-start gap-2.5 w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{act.klant_naam}</span>
                            {' — '}
                            {act.item_titel} {actieLabel}
                          </p>
                          {act.bericht && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">"{act.bericht}"</p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                          {formatTijdGeleden(act.created_at)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
