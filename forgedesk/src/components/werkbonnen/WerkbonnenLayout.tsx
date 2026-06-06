import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import {
  Plus, Search, ClipboardCheck, Trash2, Eye, FileText,
  Download, Loader2, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
// ModuleHeader removed — using DOEN inline header
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Wrench, Sun, Clipboard, Flag } from 'lucide-react'
import type { Werkbon, Klant, Project, Offerte } from '@/types'
import {
  getWerkbonnen, deleteWerkbon, getKlanten, getProjecten, getOffertes, getWerkbonItems,
} from '@/services/supabaseService'
import { getCached, setCached, fetchQuery } from '@/lib/queryCache'

type FilterStatus = 'alle' | 'concept' | 'definitief' | 'afgerond' | 'vandaag'

const STATUS_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
  concept: { label: 'Open', text: '#5A5A55', bg: '#EEEEED' },
  definitief: { label: 'In uitvoering', text: '#C03A18', bg: '#FDE8E2' },
  afgerond: { label: 'Afgetekend', text: '#1A535C', bg: '#E2F0F0' },
}

const WERKBON_STATUS_HEX: Record<string, string> = {
  concept: '#5A5A55',
  definitief: '#F15025',
  afgerond: '#2D6B48',
}
function werkbonStatusHex(s: string): string {
  return WERKBON_STATUS_HEX[s] ?? '#5A5A55'
}
function isToday(dateStr?: string | null): boolean {
  if (!dateStr) return false
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today || dateStr.startsWith(today)
}

export function WerkbonnenLayout() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const [werkbonnen, setWerkbonnen] = useState<Werkbon[]>(() => getCached<Werkbon[]>('werkbonnen') ?? [])
  const [klanten, setKlanten] = useState<Klant[]>(() => getCached<Klant[]>('klanten') ?? [])
  const [projecten, setProjecten] = useState<Project[]>(() => getCached<Project[]>('projecten') ?? [])
  const [offertes, setOffertes] = useState<Offerte[]>(() => getCached<Offerte[]>('offertes') ?? [])
  const [itemCounts, setItemCounts] = useState<Record<string, number>>(() => getCached<Record<string, number>>('werkbonItemCounts') ?? {})
  const [isLoading, setIsLoading] = useState(() => getCached('werkbonnen') === undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearch = useDeferredValue(searchQuery)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Werkbon | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        if (getCached('werkbonnen') === undefined) setIsLoading(true)
        const [wbs, kl, pr, off] = await Promise.all([
          fetchQuery('werkbonnen', getWerkbonnen),
          fetchQuery('klanten', getKlanten),
          fetchQuery('projecten', getProjecten),
          fetchQuery('offertes', getOffertes),
        ])
        if (cancelled) return
        setWerkbonnen(wbs)
        setKlanten(kl)
        setProjecten(pr)
        setOffertes(off)
        // Lijst staat; skeleton mag weg. De item-tellingen vullen stil bij.
        setIsLoading(false)

        // Tel items per werkbon
        const counts: Record<string, number> = {}
        for (const wb of wbs) {
          try {
            const items = await getWerkbonItems(wb.id)
            if (cancelled) return
            counts[wb.id] = items.length
          } catch (err) {
            counts[wb.id] = 0
          }
        }
        setItemCounts(counts)
        setCached('werkbonItemCounts', counts)
      } catch (err) {
        logger.error('Load werkbonnen failed:', err)
        if (!cancelled) toast.error('Fout bij laden werkbonnen')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const getKlantNaam = useCallback((klantId: string) => {
    return klanten.find((k) => k.id === klantId)?.bedrijfsnaam || '-'
  }, [klanten])

  const getProjectNaam = useCallback((projectId?: string) => {
    if (!projectId) return '-'
    return projecten.find((p) => p.id === projectId)?.naam || '-'
  }, [projecten])

  const getOfferteNummer = useCallback((offerteId?: string) => {
    if (!offerteId) return '-'
    return offertes.find((o) => o.id === offerteId)?.nummer || '-'
  }, [offertes])

  const gefilterd = useMemo(() => {
    let result = [...werkbonnen]
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase()
      result = result.filter((wb) =>
        wb.werkbon_nummer.toLowerCase().includes(q) ||
        getKlantNaam(wb.klant_id).toLowerCase().includes(q) ||
        getProjectNaam(wb.project_id).toLowerCase().includes(q) ||
        (wb.titel || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus === 'vandaag') {
      result = result.filter((wb) => isToday(wb.datum))
    } else if (filterStatus !== 'alle') {
      result = result.filter((wb) => wb.status === filterStatus)
    }
    result.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    return result
  }, [werkbonnen, deferredSearch, filterStatus, getKlantNaam, getProjectNaam])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: werkbonnen.length }
    for (const wb of werkbonnen) {
      counts[wb.status] = (counts[wb.status] || 0) + 1
    }
    return counts
  }, [werkbonnen])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteWerkbon(deleteTarget.id)
      setWerkbonnen((prev) => prev.filter((wb) => wb.id !== deleteTarget.id))
      toast.success(<>Werkbon verwijderd<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('Delete werkbon failed:', err)
      toast.error('Fout bij verwijderen werkbon')
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  function toggleWerkbonSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === gefilterd.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(gefilterd.map(wb => wb.id)))
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    const ids = [...selectedIds]
    const results = await Promise.allSettled(ids.map((id) => deleteWerkbon(id)))
    const succeeded = ids.filter((_, i) => results[i].status === 'fulfilled')
    const failed = ids.filter((_, i) => results[i].status === 'rejected')
    if (succeeded.length > 0) {
      const deletedSet = new Set(succeeded)
      setWerkbonnen((prev) => prev.filter((wb) => !deletedSet.has(wb.id)))
      toast.success(`${succeeded.length} werkbon${succeeded.length === 1 ? '' : 'nen'} verwijderd`)
    }
    if (failed.length > 0) {
      toast.error(`${failed.length} werkbon${failed.length === 1 ? '' : 'nen'} kon niet verwijderd worden`)
    }
    setSelectedIds(new Set())
    setBulkDeleteDialogOpen(false)
  }

  const handleExportCSV = useCallback(() => {
    const header = 'Nummer,Klant,Project,Offerte,Datum,Status,Items\n'
    const rows = gefilterd.map((wb) =>
      `${wb.werkbon_nummer},"${getKlantNaam(wb.klant_id)}","${getProjectNaam(wb.project_id)}","${getOfferteNummer(wb.offerte_id)}",${wb.datum},${wb.status},${itemCounts[wb.id] || 0}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `werkbonnen-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV geëxporteerd')
  }, [gefilterd, getKlantNaam, getProjectNaam, getOfferteNummer, itemCounts])

  const vandaagCount = useMemo(() => werkbonnen.filter((wb) => isToday(wb.datum)).length, [werkbonnen])

  if (isLoading) {
    return (
      <div className="h-full flex flex-col -m-3 sm:-m-4 md:-m-6">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-4 py-4 md:px-8 md:py-8 space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-4">
                  <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-foreground">
                    Werkbonnen<span className="text-[#F15025]">.</span>
                  </h1>
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-10 w-36 rounded-xl" />
              </div>
              {/* KPI tile skeletons */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="doen-slate-surface rounded-xl px-5 py-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-1.5 w-1.5 rounded-full" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Skeleton className="h-7 w-10" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Toolbar card skeleton */}
            <div className="doen-slate-surface rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-5">
                <Skeleton className="h-9 w-[280px] rounded-lg" />
                <div className="hidden sm:flex items-center gap-1 ml-auto">
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-lg" />
                ))}
              </div>
            </div>
            {/* Table skeleton */}
            <div className="doen-slate-surface rounded-2xl" style={{ clipPath: 'inset(0 round 16px)' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col -m-3 sm:-m-4 md:-m-6">

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-4 py-4 md:px-8 md:py-8 space-y-6">

      {/* ── Header + KPI tiles ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-foreground">
              Werkbonnen<span className="text-[#F15025]">.</span>
            </h1>
            <span className="text-[13px] text-muted-foreground font-mono tabular-nums">
              {gefilterd.length === werkbonnen.length ? (
                <span className="font-medium text-foreground/70">{werkbonnen.length}</span>
              ) : (
                <>
                  <span className="font-medium text-foreground/70">{gefilterd.length}</span>
                  <span className="text-muted-foreground/70">/</span>{werkbonnen.length}
                </>
              )}
            </span>
          </div>
          <button
            onClick={() => navigate('/werkbonnen/nieuw')}
            className="inline-flex items-center gap-2 bg-[#F15025] text-white px-3 md:pl-4 md:pr-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[#D03A18] transition-all duration-200"
          >
            <Plus className="w-4 h-4 opacity-80" />
            <span className="hidden md:inline">Nieuwe werkbon</span>
          </button>
        </div>

        {/* KPI tiles — clickable triage entry-points */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { key: 'definitief' as FilterStatus, label: 'In uitvoering', sub: 'lopende werkbonnen',  count: statusCounts['definitief'] || 0, Icon: Wrench,    pulse: true  },
            { key: 'vandaag'    as FilterStatus, label: 'Vandaag',       sub: 'ingepland vandaag',   count: vandaagCount,                    Icon: Sun,       pulse: false },
            { key: 'concept'    as FilterStatus, label: 'Open',          sub: 'wacht op uitvoering', count: statusCounts['concept'] || 0,    Icon: Clipboard, pulse: false },
            { key: 'afgerond'   as FilterStatus, label: 'Afgetekend',    sub: 'klaar.',              count: statusCounts['afgerond'] || 0,   Icon: Flag,      pulse: false },
          ]).map((tile) => {
            const isActive = filterStatus === tile.key
            const TileIcon = tile.Icon
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => setFilterStatus(isActive ? 'alle' : tile.key)}
                className={cn(
                  'group doen-slate-surface relative rounded-xl px-5 py-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F15025]/30 focus-visible:ring-offset-2',
                  isActive && 'doen-slate-surface-active'
                )}
                aria-pressed={isActive}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <TileIcon className={cn('h-[18px] w-[18px] flex-shrink-0', tile.pulse && 'doen-pulse')} strokeWidth={1.75} />
                    <span className="font-heading text-[14px] font-bold text-foreground">
                      {tile.label}<span className="text-[#F15025]">.</span>
                    </span>
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading font-bold text-[28px] leading-none text-foreground tabular-nums">
                    {tile.count}
                  </span>
                  <span
                    className="text-[13px] text-muted-foreground truncate"
                    style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                  >
                    · {tile.sub}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Toolbar card ── */}
      <div className="doen-slate-surface rounded-2xl p-5">
        <div className="flex items-center gap-5">
          {/* Search with keyboard hint */}
          <div className="relative max-w-[280px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Zoek op nummer, klant, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">/</kbd>
          </div>

          {/* Export */}
          <div className="hidden sm:flex items-center gap-1 ml-auto">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background px-3 py-2 rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1 flex-1 flex-nowrap md:flex-wrap overflow-x-auto">
            {(['alle', 'vandaag', 'concept', 'definitief', 'afgerond'] as const).map((status) => {
              const labels: Record<string, string> = { alle: 'Alle', vandaag: 'Vandaag', concept: 'Open', definitief: 'In uitvoering', afgerond: 'Afgetekend' }
              const count = status === 'vandaag' ? vandaagCount : (statusCounts[status] || 0)
              const isActive = filterStatus === status
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    'relative text-[13px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all',
                    isActive
                      ? 'text-[#1A535C] font-semibold bg-[#1A535C]/[0.07]'
                      : 'text-muted-foreground hover:text-foreground/70'
                  )}
                >
                  {labels[status]}
                  {count > 0 && <span className="ml-1 font-mono text-[11px] opacity-50">{count}</span>}
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#1A535C] rounded-full" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 px-5 py-3 bg-[#1A535C]/[0.06] rounded-xl ring-1 ring-[#1A535C]/10">
          <span className="text-sm text-foreground font-medium">
            <span className="font-mono font-bold text-[#1A535C]">{selectedIds.size}</span> geselecteerd
          </span>
          <button
            onClick={toggleSelectAll}
            className="text-xs font-medium text-[#1A535C] hover:underline transition-colors"
          >
            {selectedIds.size === gefilterd.length ? 'Deselecteer alles' : 'Selecteer alles'}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setBulkDeleteDialogOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C03A18] bg-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Verwijderen
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-white/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {gefilterd.length === 0 ? (
        <div className="doen-slate-surface rounded-2xl p-12 text-center">
          <EmptyState
            module="werkbonnen"
            title="Nog geen werkbonnen"
            description="Maak een werkbon aan vanuit een offerte of handmatig."
          />
        </div>
      ) : (
        <div
          className="doen-slate-surface rounded-2xl"
          style={{ clipPath: 'inset(0 round 16px)' }}
        >
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'hsl(var(--card))', backdropFilter: 'blur(4px)' }}>
                <tr className="border-b border-border">
                  <th className="w-[44px] py-3.5 pl-5 pr-0">
                    <Checkbox
                      checked={gefilterd.length > 0 && selectedIds.size === gefilterd.length}
                      onCheckedChange={toggleSelectAll}
                      className="border-[#1A4A52]/25 rounded-[5px] transition-colors data-[state=checked]:bg-[#F15025] data-[state=checked]:border-[#F15025] data-[state=checked]:text-white"
                    />
                  </th>
                  <th className="text-left py-3.5 pl-2 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Nummer</span>
                  </th>
                  <th className="text-left py-3.5 pr-4 w-[160px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Klant</span>
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Offerte / Project</span>
                  </th>
                  <th className="text-right py-3.5 pr-4 w-[90px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Datum</span>
                  </th>
                  <th className="text-left py-3.5 pr-4 w-[150px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Status</span>
                  </th>
                  <th className="text-center py-3.5 pr-4 w-[70px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Items</span>
                  </th>
                  <th className="w-[80px] py-3.5 pr-4" />
                </tr>
              </thead>
              <tbody>
                {gefilterd.map((wb, i) => {
                  const cfg = STATUS_CONFIG[wb.status] || STATUS_CONFIG.concept
                  const offerteRef = getOfferteNummer(wb.offerte_id)
                  const projectRef = getProjectNaam(wb.project_id)
                  const ref = offerteRef !== '-' ? offerteRef : projectRef
                  const stripeHex = werkbonStatusHex(wb.status)
                  const attention = wb.status === 'definitief'
                  return (
                    <tr
                      key={wb.id}
                      className={cn(
                        'doen-row border-b border-border last:border-0 cursor-pointer transition-all duration-200 group',
                        attention && !selectedIds.has(wb.id) && 'bg-[rgba(241,80,37,0.025)]',
                        'hover:bg-background',
                        selectedIds.has(wb.id) && 'bg-[#1A535C]/[0.03]',
                      )}
                      style={{ animationDelay: `${i * 25}ms` }}
                      onClick={() => navigateWithTab({ path: `/werkbonnen/${wb.id}`, label: wb.werkbon_nummer || 'Werkbon', id: `/werkbonnen/${wb.id}` })}
                    >
                      <td
                        className="py-3.5 pl-5 pr-0"
                        style={{ boxShadow: `inset 2px 0 0 0 ${stripeHex}` }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds.has(wb.id)}
                          onCheckedChange={() => toggleWerkbonSelection(wb.id)}
                          className="border-[#1A4A52]/25 rounded-[5px] transition-colors group-hover:border-[#1A4A52]/45 data-[state=checked]:bg-[#F15025] data-[state=checked]:border-[#F15025] data-[state=checked]:text-white"
                        />
                      </td>
                      <td className="py-3.5 pl-2 pr-4">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-[15px] font-semibold text-[#1A4A52] dark:text-foreground group-hover:text-[#1A535C] transition-colors">{wb.werkbon_nummer}</span>
                          </div>
                          {wb.titel && <p className="text-[11px] text-muted-foreground/70 truncate max-w-[240px] mt-0.5">{wb.titel}</p>}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {(() => {
                            const naam = getKlantNaam(wb.klant_id)
                            const c = naam.charCodeAt(0) % 5
                            const avatarColors = [
                              'bg-[hsl(var(--status-green-bg))] text-[#3A7D52]',
                              'bg-[hsl(var(--status-blue-bg))] text-[#3A5A9A]',
                              'bg-[hsl(var(--status-amber-bg))] text-[#8A7A4A]',
                              'bg-muted text-foreground/70',
                              'bg-[hsl(var(--status-violet-bg))] text-[#6A5A8A]',
                            ]
                            return (
                              <span className={cn('flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold uppercase select-none', avatarColors[c])}>
                                {naam.charAt(0)}
                              </span>
                            )
                          })()}
                          <span className="text-[13px] text-muted-foreground truncate block leading-tight">{getKlantNaam(wb.klant_id)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-[13px] text-muted-foreground truncate block">{ref}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <span className="text-[12px] font-mono tabular-nums text-muted-foreground/80">
                          {new Date(wb.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '')}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <StatusBadge
                          status={wb.status}
                          label={cfg.label}
                          color={wb.status === 'definitief' ? '#F15025' : undefined}
                        />
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className="inline-flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums rounded-md px-2 py-0.5 bg-background text-foreground/70">
                          {itemCounts[wb.id] || 0}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            className="p-1.5 rounded-lg hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
                            onClick={() => navigateWithTab({ path: `/werkbonnen/${wb.id}`, label: wb.werkbon_nummer || 'Werkbon', id: `/werkbonnen/${wb.id}` })}
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-[hsl(var(--status-flame-bg))] transition-all opacity-0 group-hover:opacity-100"
                            onClick={() => { setDeleteTarget(wb); setDeleteDialogOpen(true) }}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#C03A18]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
      )}

      {/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Werkbonnen verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je {selectedIds.size} werkbon{selectedIds.size === 1 ? '' : 'nen'} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Werkbon verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je werkbon {deleteTarget?.werkbon_nummer} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      </div>
    </div>
  )
}
