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
  Loader2,
  ListTodo,
  CalendarPlus,
  Reply,
  Send,
  FileText,
  Wrench,
  Plus,
  BellRing,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  getAllPortalen,
  getNotificaties,
  createTaak,
  createPortaalItem,
  getMedewerkers,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { ProjectPortaal, PortaalItem, Notificatie, Medewerker } from '@/types'
import { formatDate } from '@/lib/utils'
import { usePortaalHerinnering } from '@/hooks/usePortaalHerinnering'

type PortaalEnriched = ProjectPortaal & {
  project_naam?: string
  klant_naam?: string
  klant_id?: string
  items?: PortaalItem[]
}

type FilterType = 'alle' | 'wacht' | 'revisie' | 'afgerond'

// ── Helpers ──

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

function getDagLabel(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Vandaag'
  if (date.toDateString() === yesterday.toDateString()) return 'Gisteren'
  return formatDate(dateString)
}

// ── Unified Activity Item ──

interface ActiviteitItem {
  id: string
  type: 'goedkeuring' | 'revisie' | 'bericht' | 'bekeken' | 'herinnering'
  klant_naam: string
  project_naam: string
  project_id: string
  klant_id?: string
  portaal_id?: string
  item_titel: string
  bericht: string | null
  created_at: string
}

export function PortalenOverzicht() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [portalen, setPortalen] = useState<PortaalEnriched[]>([])
  const [notificaties, setNotificaties] = useState<Notificatie[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('alle')

  // Taak dialog state
  const [taakDialogOpen, setTaakDialogOpen] = useState(false)
  const [taakTitel, setTaakTitel] = useState('')
  const [taakBeschrijving, setTaakBeschrijving] = useState('')
  const [taakDeadline, setTaakDeadline] = useState('')
  const [taakToegewezen, setTaakToegewezen] = useState('')
  const [taakPrioriteit, setTaakPrioriteit] = useState<'laag' | 'medium' | 'hoog' | 'kritiek'>('medium')
  const [taakProjectId, setTaakProjectId] = useState('')
  const [taakKlantId, setTaakKlantId] = useState('')
  const [taakSaving, setTaakSaving] = useState(false)

  // Inline reply state
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)

  usePortaalHerinnering()

  const fetchData = useCallback(async () => {
    try {
      const [p, n, m] = await Promise.all([getAllPortalen(), getNotificaties(), getMedewerkers()])
      setPortalen(p)
      setNotificaties(n)
      setMedewerkers(m.filter(mw => mw.status === 'actief'))
    } catch (err) {
      console.error('Fout bij ophalen portalen:', err)
      toast.error('Portalen konden niet geladen worden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/portaal/${token}`)
    toast.success('Portaallink gekopieerd')
  }

  const filtered = portalen.filter(p => matchesFilter(p, filter))

  // ── Build unified activity stream ──
  const allActiviteit: ActiviteitItem[] = []

  // 1. Portaal reacties
  for (const portaal of portalen) {
    for (const item of portaal.items || []) {
      if (item.reacties) {
        for (const r of item.reacties) {
          const rx = r as { type: string; klant_naam: string | null; created_at: string; bericht: string | null }
          allActiviteit.push({
            id: `reactie-${rx.created_at}-${item.id}`,
            type: rx.type as ActiviteitItem['type'],
            klant_naam: rx.klant_naam || portaal.klant_naam || 'Klant',
            project_naam: portaal.project_naam || '',
            project_id: portaal.project_id,
            klant_id: portaal.klant_id,
            portaal_id: portaal.id,
            item_titel: item.titel,
            bericht: rx.bericht,
            created_at: rx.created_at,
          })
        }
      }
    }
  }

  // 2. Portaal notificaties (bekeken, herinnering)
  for (const n of notificaties) {
    if (['portaal_bekeken', 'portaal_herinnering'].includes(n.type)) {
      // Deduplicatie: check of er al een reactie is op zelfde tijdstip
      const isDup = allActiviteit.some(a =>
        Math.abs(new Date(a.created_at).getTime() - new Date(n.created_at).getTime()) < 5000
        && a.project_id === n.project_id
      )
      if (!isDup) {
        allActiviteit.push({
          id: `notif-${n.id}`,
          type: n.type === 'portaal_bekeken' ? 'bekeken' : 'herinnering',
          klant_naam: 'Klant',
          project_naam: n.bericht?.split(' — ').pop() || '',
          project_id: n.project_id || '',
          klant_id: n.klant_id,
          item_titel: n.titel,
          bericht: n.bericht,
          created_at: n.created_at,
        })
      }
    }
  }

  allActiviteit.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Group by day
  const activiteitByDay: Record<string, ActiviteitItem[]> = {}
  for (const a of allActiviteit.slice(0, 30)) {
    const key = getDagLabel(a.created_at)
    if (!activiteitByDay[key]) activiteitByDay[key] = []
    activiteitByDay[key].push(a)
  }

  // ── Taak aanmaken ──
  function openTaakDialog(projectId: string, klantId: string | undefined, titel: string, prioriteit: 'medium' | 'hoog' = 'medium') {
    setTaakProjectId(projectId)
    setTaakKlantId(klantId || '')
    setTaakTitel(titel)
    setTaakBeschrijving('')
    setTaakPrioriteit(prioriteit)
    setTaakToegewezen('')
    const d = new Date()
    d.setDate(d.getDate() + 3)
    setTaakDeadline(d.toISOString().split('T')[0])
    setTaakDialogOpen(true)
  }

  async function handleTaakAanmaken() {
    if (!taakTitel.trim()) { toast.error('Titel is verplicht'); return }
    setTaakSaving(true)
    try {
      await createTaak({
        user_id: user?.id,
        project_id: taakProjectId || undefined,
        klant_id: taakKlantId || undefined,
        titel: taakTitel.trim(),
        beschrijving: taakBeschrijving.trim(),
        status: 'todo',
        prioriteit: taakPrioriteit,
        toegewezen_aan: taakToegewezen,
        deadline: taakDeadline || undefined,
        geschatte_tijd: 0,
        bestede_tijd: 0,
      })
      toast.success('Taak aangemaakt')
      setTaakDialogOpen(false)
    } catch {
      toast.error('Kon taak niet aanmaken')
    } finally {
      setTaakSaving(false)
    }
  }

  // ── Inline reply ──
  async function handleReply(act: ActiviteitItem) {
    if (!replyText.trim() || !act.portaal_id || !user) return
    setReplySending(true)
    try {
      await createPortaalItem({
        user_id: user.id,
        project_id: act.project_id,
        portaal_id: act.portaal_id,
        type: 'bericht',
        titel: 'Reactie',
        omschrijving: replyText.trim(),
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })
      toast.success('Reactie verstuurd')
      setReplyOpenId(null)
      setReplyText('')
    } catch {
      toast.error('Kon reactie niet versturen')
    } finally {
      setReplySending(false)
    }
  }

  // ── Activity icon + color ──
  function getActIcon(type: ActiviteitItem['type']) {
    switch (type) {
      case 'goedkeuring': return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30' }
      case 'revisie': return { icon: RotateCcw, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' }
      case 'bericht': return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' }
      case 'bekeken': return { icon: Eye, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/30' }
      case 'herinnering': return { icon: BellRing, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' }
    }
  }

  function getActieLabel(type: ActiviteitItem['type']) {
    switch (type) {
      case 'goedkeuring': return 'goedgekeurd'
      case 'revisie': return 'revisie gevraagd'
      case 'bericht': return 'bericht gestuurd'
      case 'bekeken': return 'bekeken'
      case 'herinnering': return 'herinnering verstuurd'
    }
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
            const samenvatting = getItemSamenvatting(items)
            const hasGoedgekeurd = items.some(i => i.status === 'goedgekeurd')

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

                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className={`${status.color} text-2xs px-1.5 flex items-center gap-0.5`}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {status.label}
                        </Badge>
                      </div>

                      {samenvatting && (
                        <p className="text-xs text-muted-foreground/70 mt-1">{samenvatting}</p>
                      )}
                    </div>

                    {/* Acties */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => openTaakDialog(
                          portaal.project_id,
                          portaal.klant_id,
                          `Taak: ${portaal.project_naam || 'Project'}`
                        )}
                        title="Taak aanmaken"
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                      </Button>
                      {hasGoedgekeurd && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/werkbonnen?project_id=${portaal.project_id}&klant_id=${portaal.klant_id || ''}`)}
                          title="Werkbon aanmaken"
                        >
                          <Wrench className="h-3.5 w-3.5" />
                        </Button>
                      )}
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

      {/* ── Activiteit stream ── */}
      {allActiviteit.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activiteit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(activiteitByDay).map(([dag, items]) => (
              <div key={dag}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{dag}</h4>
                <div className="space-y-1">
                  {items.map((act) => {
                    const cfg = getActIcon(act.type)
                    const Icon = cfg.icon
                    const isReplyOpen = replyOpenId === act.id

                    return (
                      <div key={act.id}>
                        <div className="group flex items-start gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          </div>

                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => act.project_id && navigate(`/projecten/${act.project_id}`)}
                          >
                            <p className="text-sm text-foreground">
                              <span className="font-medium">{act.klant_naam}</span>
                              {' — '}
                              <span className="text-muted-foreground">{act.item_titel}</span>
                              {' '}
                              <span className="text-muted-foreground">{getActieLabel(act.type)}</span>
                            </p>
                            {act.bericht && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">"{act.bericht}"</p>
                            )}
                          </div>

                          {/* Tijd + quick actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Hover actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openTaakDialog(
                                  act.project_id,
                                  act.klant_id,
                                  act.type === 'revisie'
                                    ? `Revisie: ${act.item_titel}`
                                    : `${act.item_titel}`,
                                  act.type === 'revisie' ? 'hoog' : 'medium'
                                )}
                                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                title="Taak aanmaken"
                              >
                                <ListTodo className="h-3 w-3" />
                              </button>
                              {act.type === 'goedkeuring' && (
                                <button
                                  onClick={() => navigate(`/planning?project_id=${act.project_id}&titel=Montage: ${encodeURIComponent(act.project_naam)}`)}
                                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                  title="Inplannen"
                                >
                                  <CalendarPlus className="h-3 w-3" />
                                </button>
                              )}
                              {(act.type === 'revisie' || act.type === 'bericht') && act.portaal_id && (
                                <button
                                  onClick={() => {
                                    setReplyOpenId(isReplyOpen ? null : act.id)
                                    setReplyText('')
                                  }}
                                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                  title="Reageren"
                                >
                                  <Reply className="h-3 w-3" />
                                </button>
                              )}
                              {!act.project_id && (
                                <button
                                  onClick={() => navigate(`/projecten/nieuw${act.klant_id ? `?klant_id=${act.klant_id}` : ''}`)}
                                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                  title="Maak project"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <span className="text-2xs text-muted-foreground whitespace-nowrap ml-1">
                              {formatTijdGeleden(act.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Inline reply */}
                        {isReplyOpen && (
                          <div className="ml-9 mb-2 flex items-start gap-2">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Typ je reactie..."
                              rows={2}
                              className="flex-1 text-sm resize-none border-dashed"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.shiftKey) {
                                  e.preventDefault()
                                  handleReply(act)
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-8 px-3"
                              disabled={!replyText.trim() || replySending}
                              onClick={() => handleReply(act)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              {replySending ? '...' : 'Stuur'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {allActiviteit.length === 0 && portalen.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Eye className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nog geen activiteit van klanten</p>
          </CardContent>
        </Card>
      )}

      {/* ── Taak aanmaak dialog ── */}
      <Dialog open={taakDialogOpen} onOpenChange={setTaakDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Taak aanmaken
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Titel *</Label>
              <Input
                value={taakTitel}
                onChange={(e) => setTaakTitel(e.target.value)}
                placeholder="Wat moet er gebeuren?"
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Beschrijving</Label>
              <Textarea
                value={taakBeschrijving}
                onChange={(e) => setTaakBeschrijving(e.target.value)}
                placeholder="Extra details..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Deadline</Label>
                <Input
                  type="date"
                  value={taakDeadline}
                  onChange={(e) => setTaakDeadline(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioriteit</Label>
                <Select value={taakPrioriteit} onValueChange={(v: typeof taakPrioriteit) => setTaakPrioriteit(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laag">Laag</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hoog">Hoog</SelectItem>
                    <SelectItem value="kritiek">Kritiek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {medewerkers.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Toewijzen aan</Label>
                <Select value={taakToegewezen} onValueChange={setTaakToegewezen}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecteer medewerker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medewerkers.map(m => (
                      <SelectItem key={m.id} value={m.naam}>{m.naam}{m.functie ? ` — ${m.functie}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setTaakDialogOpen(false)}>Annuleren</Button>
            <Button size="sm" onClick={handleTaakAanmaken} disabled={taakSaving}>
              <ListTodo className="h-3.5 w-3.5 mr-1.5" />
              {taakSaving ? 'Opslaan...' : 'Taak aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
