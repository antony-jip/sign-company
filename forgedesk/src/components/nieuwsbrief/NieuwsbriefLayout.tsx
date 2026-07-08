import { useEffect, useState, useCallback, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { Newspaper, Plus, Trash2, Send, Clock, FileText, Search, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { ADMIN_USER_ID } from '@/services/supportChatService'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge, statusColor } from '@/components/shared/StatusBadge'
import {
  getNieuwsbrieven,
  maakConcept,
  verwijderNieuwsbrief,
  type Nieuwsbrief,
} from '@/services/nieuwsbriefService'
import { NieuwsbriefEditor } from './NieuwsbriefEditor'
import { NieuwsbriefStats } from './NieuwsbriefStats'
import { NIEUWSBRIEF_BASIS_TEMPLATE } from './nieuwsbriefTemplate'

type Filter = 'alle' | 'concept' | 'gepland' | 'verzonden'

const STATUS_LABEL: Record<Nieuwsbrief['status'], string> = {
  concept: 'Concept',
  gepland: 'Gepland',
  verzonden: 'Verzonden',
}

function rijDatum(n: Nieuwsbrief): string {
  if (n.status === 'gepland' && n.gepland_op) return formatDateTime(n.gepland_op)
  if (n.status === 'verzonden' && n.verzonden_op) return formatDate(n.verzonden_op)
  return formatDate(n.updated_at || n.created_at)
}

function rijIcon(status: Nieuwsbrief['status']) {
  if (status === 'verzonden') return Send
  if (status === 'gepland') return Clock
  return FileText
}

export function NieuwsbriefLayout() {
  const { user } = useAuth()
  const isEigenaar = user?.id === ADMIN_USER_ID

  const [nieuwsbrieven, setNieuwsbrieven] = useState<Nieuwsbrief[]>([])
  const [laden, setLaden] = useState(true)
  const [bezig, setBezig] = useState(false)
  const [actief, setActief] = useState<Nieuwsbrief | null>(null)
  const [filter, setFilter] = useState<Filter>('alle')
  const [zoek, setZoek] = useState('')

  const laad = useCallback(async () => {
    try {
      setNieuwsbrieven(await getNieuwsbrieven())
    } catch (err) {
      toast.error('Kon nieuwsbrieven niet laden')
      console.error('[nieuwsbrief] laden mislukt:', err)
    } finally {
      setLaden(false)
    }
  }, [])

  useEffect(() => {
    if (isEigenaar) laad()
  }, [isEigenaar, laad])

  const tellingen = useMemo(() => ({
    alle: nieuwsbrieven.length,
    concept: nieuwsbrieven.filter(n => n.status === 'concept').length,
    gepland: nieuwsbrieven.filter(n => n.status === 'gepland').length,
    verzonden: nieuwsbrieven.filter(n => n.status === 'verzonden').length,
  }), [nieuwsbrieven])

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return nieuwsbrieven
      .filter(n => filter === 'alle' || n.status === filter)
      .filter(n => !q || (n.onderwerp || '').toLowerCase().includes(q))
  }, [nieuwsbrieven, filter, zoek])

  const handleNieuw = useCallback(async () => {
    setBezig(true)
    try {
      const concept = await maakConcept('', NIEUWSBRIEF_BASIS_TEMPLATE)
      setNieuwsbrieven(prev => [concept, ...prev])
      setActief(concept)
    } catch (err) {
      toast.error('Kon concept niet aanmaken')
      console.error('[nieuwsbrief] concept aanmaken mislukt:', err)
    } finally {
      setBezig(false)
    }
  }, [])

  const handleGewijzigd = useCallback((n: Nieuwsbrief) => {
    setNieuwsbrieven(prev => prev.map(x => (x.id === n.id ? n : x)))
    setActief(prev => (prev && prev.id === n.id ? n : prev))
  }, [])

  const handleTerug = useCallback(() => {
    setActief(null)
    laad()
  }, [laad])

  const handleVerwijder = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const vorige = nieuwsbrieven
    setNieuwsbrieven(prev => prev.filter(n => n.id !== id))
    try {
      await verwijderNieuwsbrief(id)
    } catch (err) {
      setNieuwsbrieven(vorige)
      toast.error('Kon niet verwijderen')
      console.error('[nieuwsbrief] verwijderen mislukt:', err)
    }
  }, [nieuwsbrieven])

  if (!isEigenaar) return <Navigate to="/" replace />

  if (actief) {
    return actief.status === 'verzonden'
      ? <NieuwsbriefStats nieuwsbrief={actief} onTerug={handleTerug} />
      : <NieuwsbriefEditor nieuwsbrief={actief} onTerug={handleTerug} onGewijzigd={handleGewijzigd} />
  }

  const heeftFilter = filter !== 'alle' || zoek.trim().length > 0

  const tegel = (key: Filter, Icon: typeof Newspaper, label: string, sub: string, kleur: string) => {
    const actiefTegel = filter === key
    return (
      <button
        type="button"
        onClick={() => setFilter(key)}
        aria-pressed={actiefTegel}
        className={cn(
          'group doen-stat-tile relative rounded-xl px-5 py-4 text-left transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame/30 focus-visible:ring-offset-2',
          actiefTegel && 'doen-stat-tile-active',
        )}
      >
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.75} style={{ color: kleur }} />
            <span className="font-heading text-[14px] font-bold text-foreground">
              {label}<span className="text-flame">.</span>
            </span>
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-[28px] font-bold leading-none text-foreground tabular-nums">
            {tellingen[key]}
          </span>
          <span
            className="truncate text-[13px] text-muted-foreground"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            · {sub}
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col -m-3 sm:-m-4 md:-m-6">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 px-4 py-4 md:px-8 md:py-8">

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-4">
                <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-foreground">
                  Nieuwsbrief<span className="text-flame">.</span>
                </h1>
                <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground/70">{gefilterd.length}</span>
                  {heeftFilter && `/${nieuwsbrieven.length}`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleNieuw}
                disabled={bezig}
                className="inline-flex items-center gap-2 rounded-xl bg-flame px-3 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] active:translate-y-0 active:bg-[#D03A18] disabled:opacity-60 md:pl-4 md:pr-5"
              >
                <Plus className="h-4 w-4 opacity-80" />
                <span className="hidden md:inline">Nieuwe nieuwsbrief</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {tegel('alle', Layers, 'Alle', 'nieuwsbrieven', '#1A535C')}
              {tegel('concept', FileText, 'Concept', 'in bewerking', statusColor('concept'))}
              {tegel('gepland', Clock, 'Gepland', 'staat klaar', statusColor('gepland'))}
              {tegel('verzonden', Send, 'Verzonden', 'de deur uit', statusColor('verzonden'))}
            </div>
          </div>

          <div className="doen-slate-surface rounded-2xl p-4">
            <div className="relative max-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={zoek}
                onChange={e => setZoek(e.target.value)}
                placeholder="Zoek op onderwerp..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/10 dark:focus:border-white/25 dark:focus:ring-white/10"
              />
            </div>
          </div>

          {laden ? (
            <div className="doen-slate-surface space-y-3 rounded-2xl p-5">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-lg bg-muted" />
                  <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : gefilterd.length === 0 ? (
            <div className="doen-slate-surface rounded-2xl">
              <EmptyState
                module="default"
                title={heeftFilter ? 'Geen nieuwsbrieven gevonden' : 'Nog geen nieuwsbrieven'}
                description={heeftFilter
                  ? 'Pas je zoekopdracht of filter aan.'
                  : 'Stel je eerste nieuwsbrief op en verstuur ’m naar je contacten.'}
              />
            </div>
          ) : (
            <div className="doen-slate-surface rounded-2xl" style={{ clipPath: 'inset(0 round 16px)' }}>
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: 'hsl(var(--card))', backdropFilter: 'blur(4px)' }}>
                  <tr className="border-b border-border">
                    <th className="py-3.5 pl-5 pr-4 text-left">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Onderwerp</span>
                    </th>
                    <th className="hidden w-40 py-3.5 pr-4 text-left sm:table-cell">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Status</span>
                    </th>
                    <th className="hidden w-28 py-3.5 pr-4 text-right md:table-cell">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Ontvangers</span>
                    </th>
                    <th className="w-40 py-3.5 pr-5 text-right">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Datum</span>
                    </th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {gefilterd.map(n => {
                    const Icon = rijIcon(n.status)
                    const kleur = statusColor(n.status)
                    return (
                      <tr
                        key={n.id}
                        onClick={() => setActief(n)}
                        className="doen-row group cursor-pointer border-b border-border transition-colors duration-200 last:border-0 hover:bg-petrol/[0.04] dark:hover:bg-white/[0.03]"
                        style={{ ['--row-accent' as string]: kleur }}
                      >
                        <td className="py-3 pl-5 pr-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${kleur}14`, color: kleur }}
                            >
                              <Icon className="h-4 w-4" strokeWidth={1.9} />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-[15px] font-semibold text-[#1A4A52] transition-colors group-hover:text-petrol dark:text-foreground">
                                {n.onderwerp || 'Zonder onderwerp'}
                              </div>
                              <div className="truncate text-[13px] text-muted-foreground sm:hidden">
                                {STATUS_LABEL[n.status]} · {rijDatum(n)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden pr-4 sm:table-cell">
                          <StatusBadge status={n.status} label={STATUS_LABEL[n.status]} />
                        </td>
                        <td className="hidden pr-4 text-right md:table-cell">
                          <span className="font-mono text-sm tabular-nums text-foreground/80">
                            {n.aantal_ontvangers ?? '—'}
                          </span>
                        </td>
                        <td className="pr-5 text-right">
                          <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                            {rijDatum(n)}
                          </span>
                        </td>
                        <td className="pr-3 text-right">
                          <button
                            type="button"
                            onClick={e => handleVerwijder(e, n.id)}
                            aria-label="Verwijderen"
                            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-[#C0451A] group-hover:opacity-100 dark:hover:text-[#FF8866]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
