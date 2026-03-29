import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Eye, AlertTriangle, AlertCircle, Clock, Mail, CheckCircle2, Truck,
  Banknote, Wallet, CalendarCheck, RotateCcw, MessageSquare, BellRing,
  Search, Check, Trash2, Filter, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  getNotificaties,
  markNotificatieGelezen,
  markAlleNotificatiesGelezen,
  deleteNotificatie,
} from '@/services/supabaseService'
import type { Notificatie } from '@/types'
import { cn } from '@/lib/utils'

// --- Type config (zelfde als NotificatieCenter) ---

const typeConfig: Record<
  Notificatie['type'],
  { icon: React.ElementType; colorClass: string; bgClass: string; label: string; categorie: string }
> = {
  offerte_bekeken:     { icon: Eye, colorClass: 'text-blue-600', bgClass: 'bg-blue-100', label: 'Offerte bekeken', categorie: 'offertes' },
  offerte_verlopen:    { icon: AlertTriangle, colorClass: 'text-amber-600', bgClass: 'bg-amber-100', label: 'Offerte verlopen', categorie: 'offertes' },
  offerte_geaccepteerd:{ icon: CheckCircle2, colorClass: 'text-green-600', bgClass: 'bg-green-100', label: 'Offerte geaccepteerd', categorie: 'offertes' },
  offerte_wijziging:   { icon: AlertCircle, colorClass: 'text-blue-600', bgClass: 'bg-blue-100', label: 'Offerte wijziging', categorie: 'offertes' },
  factuur_vervallen:   { icon: AlertCircle, colorClass: 'text-red-600', bgClass: 'bg-red-100', label: 'Factuur vervallen', categorie: 'systeem' },
  deadline_nadert:     { icon: Clock, colorClass: 'text-orange-600', bgClass: 'bg-orange-100', label: 'Deadline nadert', categorie: 'systeem' },
  nieuwe_email:        { icon: Mail, colorClass: 'text-blue-600', bgClass: 'bg-blue-100', label: 'Nieuwe email', categorie: 'systeem' },
  taak_voltooid:       { icon: CheckCircle2, colorClass: 'text-green-600', bgClass: 'bg-green-100', label: 'Taak voltooid', categorie: 'systeem' },
  montage_gepland:     { icon: Truck, colorClass: 'text-accent', bgClass: 'bg-wm-pale/30', label: 'Montage gepland', categorie: 'systeem' },
  betaling_ontvangen:  { icon: Banknote, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-100', label: 'Betaling ontvangen', categorie: 'systeem' },
  budget_waarschuwing: { icon: Wallet, colorClass: 'text-orange-600', bgClass: 'bg-orange-100', label: 'Budget waarschuwing', categorie: 'systeem' },
  booking_nieuw:       { icon: CalendarCheck, colorClass: 'text-purple-600', bgClass: 'bg-purple-100', label: 'Nieuwe booking', categorie: 'systeem' },
  algemeen:            { icon: Bell, colorClass: 'text-muted-foreground', bgClass: 'bg-muted', label: 'Algemeen', categorie: 'systeem' },
  portaal_goedkeuring: { icon: CheckCircle2, colorClass: 'text-green-600', bgClass: 'bg-green-100', label: 'Portaal goedkeuring', categorie: 'portaal' },
  portaal_revisie:     { icon: RotateCcw, colorClass: 'text-amber-600', bgClass: 'bg-amber-100', label: 'Portaal revisie', categorie: 'portaal' },
  portaal_bericht:     { icon: MessageSquare, colorClass: 'text-blue-600', bgClass: 'bg-blue-100', label: 'Portaal bericht', categorie: 'portaal' },
  portaal_bekeken:     { icon: Eye, colorClass: 'text-muted-foreground', bgClass: 'bg-muted', label: 'Portaal bekeken', categorie: 'portaal' },
  portaal_herinnering: { icon: BellRing, colorClass: 'text-orange-600', bgClass: 'bg-orange-100', label: 'Portaal herinnering', categorie: 'portaal' },
}

type FilterType = 'alle' | 'ongelezen' | 'portaal' | 'offertes' | 'systeem'

const filters: { key: FilterType; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'ongelezen', label: 'Ongelezen' },
  { key: 'portaal', label: 'Portaal' },
  { key: 'offertes', label: 'Offertes' },
  { key: 'systeem', label: 'Systeem' },
]

function formatDatum(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getDagGroep(dateString: string): string {
  const date = new Date(dateString)
  const nu = new Date()
  const vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())
  const gisteren = new Date(vandaag.getTime() - 86_400_000)
  const weekGeleden = new Date(vandaag.getTime() - 7 * 86_400_000)

  if (date >= vandaag) return 'Vandaag'
  if (date >= gisteren) return 'Gisteren'
  if (date >= weekGeleden) return 'Eerder deze week'
  return 'Ouder'
}

export function MeldingenPage() {
  const [notificaties, setNotificaties] = useState<Notificatie[]>([])
  const [laden, setLaden] = useState(true)
  const [filter, setFilter] = useState<FilterType>('alle')
  const [zoekterm, setZoekterm] = useState('')
  const navigate = useNavigate()

  const laadNotificaties = useCallback(async () => {
    try {
      const data = await getNotificaties()
      setNotificaties(data || [])
    } catch (err) {
      // ignore
    } finally {
      setLaden(false)
    }
  }, [])

  useEffect(() => {
    laadNotificaties()
  }, [laadNotificaties])

  // Filter en zoek
  const gefilterd = notificaties.filter((n) => {
    // Filter
    if (filter === 'ongelezen' && n.gelezen) return false
    if (filter === 'portaal' && typeConfig[n.type]?.categorie !== 'portaal') return false
    if (filter === 'offertes' && typeConfig[n.type]?.categorie !== 'offertes') return false
    if (filter === 'systeem' && typeConfig[n.type]?.categorie !== 'systeem') return false
    // Zoek
    if (zoekterm) {
      const term = zoekterm.toLowerCase()
      return n.titel.toLowerCase().includes(term) || n.bericht.toLowerCase().includes(term)
    }
    return true
  })

  // Groepeer per dag
  const groepen: { label: string; items: Notificatie[] }[] = []
  const groepMap = new Map<string, Notificatie[]>()
  for (const n of gefilterd) {
    const label = getDagGroep(n.created_at)
    if (!groepMap.has(label)) groepMap.set(label, [])
    groepMap.get(label)!.push(n)
  }
  for (const [label, items] of groepMap) {
    groepen.push({ label, items })
  }

  const aantalOngelezen = notificaties.filter((n) => !n.gelezen).length

  async function handleMarkeerGelezen(id: string) {
    await markNotificatieGelezen(id)
    setNotificaties((prev) => prev.map((n) => n.id === id ? { ...n, gelezen: true } : n))
  }

  async function handleAllesGelezen() {
    await markAlleNotificatiesGelezen()
    setNotificaties((prev) => prev.map((n) => ({ ...n, gelezen: true })))
  }

  async function handleVerwijder(id: string) {
    await deleteNotificatie(id)
    setNotificaties((prev) => prev.filter((n) => n.id !== id))
  }

  function handleKlik(n: Notificatie) {
    if (!n.gelezen) handleMarkeerGelezen(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Meldingen</h1>
          <p className="text-sm text-muted-foreground">
            {aantalOngelezen > 0 ? `${aantalOngelezen} ongelezen` : 'Alle meldingen gelezen'}
          </p>
        </div>
        {aantalOngelezen > 0 && (
          <Button variant="outline" size="sm" onClick={handleAllesGelezen}>
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Alles als gelezen markeren
          </Button>
        )}
      </div>

      {/* Zoek + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoeken in meldingen..."
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            className="pl-9"
          />
          {zoekterm && (
            <button
              onClick={() => setZoekterm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {f.label}
              {f.key === 'ongelezen' && aantalOngelezen > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 rounded-full px-1 text-2xs">
                  {aantalOngelezen}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {laden ? (
        <Card className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Laden...</p>
        </Card>
      ) : gefilterd.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16">
          <Bell className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {zoekterm ? 'Geen meldingen gevonden' : filter !== 'alle' ? 'Geen meldingen in deze categorie' : 'Geen meldingen'}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groepen.map((groep) => (
            <div key={groep.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {groep.label}
              </h2>
              <Card className="divide-y divide-border overflow-hidden">
                {groep.items.map((n) => {
                  const config = typeConfig[n.type]
                  const Icon = config.icon

                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50 cursor-pointer',
                        !n.gelezen && 'bg-accent/30'
                      )}
                      onClick={() => handleKlik(n)}
                    >
                      <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', config.bgClass)}>
                        <Icon className={cn('h-4 w-4', config.colorClass)} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm', !n.gelezen ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
                            {n.titel}
                          </span>
                          {!n.gelezen && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.bericht}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/60">{formatDatum(n.created_at)}</span>
                          <span className={cn('rounded-full px-1.5 py-0.5 text-2xs font-medium', config.bgClass, config.colorClass)}>
                            {config.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.gelezen && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkeerGelezen(n.id) }}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Markeer als gelezen"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleVerwijder(n.id) }}
                          className="rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600"
                          title="Verwijderen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
