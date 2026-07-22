import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import {
  UserPlus,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  Download,
  Upload,
  FileText,
  Users,
  MoreHorizontal,
  Eye,
  Pencil,
  FolderPlus,
  Receipt,
  Mail,
  Trash2,
  CheckSquare,
  X,
} from 'lucide-react'
import { AlertCircle, Activity, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarTint } from '@/utils/avatarTint'
import { exportCSV, exportExcel } from '@/lib/export'
import { getKlanten, getProjectCountsByKlant, deleteKlant, updateKlant } from '@/services/supabaseService'
import { getCached, fetchQuery } from '@/lib/queryCache'
import type { Klant } from '@/types'
import { klantStatusConfig } from '@/types'
import { ClientCard } from './ClientCard'
import { AddEditClient } from './AddEditClient'
import { logger } from '../../utils/logger'
import { SkeletonTable } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { PaginationControls } from '@/components/ui/pagination-controls'
// ModuleHeader removed · using DOEN inline header
import { confirm } from '@/components/shared/ConfirmDialog'
import { vierMijlpaal, markeerEenmalig } from '@/lib/mijlpaal'

type ViewMode = 'grid' | 'list'
type StatusFilter = 'alle' | 'actief' | 'inactief' | 'prospect' | 'met-aandacht'
type SortField = 'bedrijfsnaam' | 'contactpersoon' | 'stad' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

const KLANT_STATUS_HEX: Record<string, string> = {
  actief: '#2D6B48',
  prospect: '#3A5A9A',
  inactief: '#8A7A4A',
}
const KLANT_STATUS_LABELS: Record<string, string> = {
  actief: 'Actief',
  prospect: 'Prospect',
  inactief: 'Inactief',
}
const KLANT_STATUS_OPTIES: Array<'actief' | 'prospect' | 'inactief'> = ['actief', 'prospect', 'inactief']
function klantStatusHex(s?: string): string {
  return KLANT_STATUS_HEX[s || ''] ?? '#5A5A55'
}
function klantNeedsAttention(k: Klant): boolean {
  const ks = k.klant_status || 'normaal'
  return ks === 'niet_helpen' || ks === 'geblokkeerd'
}

export function ClientsLayout() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { navigateWithTab } = useNavigateWithTab()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingKlant, setEditingKlant] = useState<Klant | undefined>(undefined)

  // Deeplink vanuit de onboarding: open meteen het formulier voor de eerste klant.
  useEffect(() => {
    if (searchParams.get('nieuw') !== '1') return
    setEditingKlant(undefined)
    setAddDialogOpen(true)
    const rest = new URLSearchParams(searchParams)
    rest.delete('nieuw')
    setSearchParams(rest, { replace: true })
  }, [searchParams, setSearchParams])
  const [klanten, setKlanten] = useState<Klant[]>(() => getCached<Klant[]>('klanten') ?? [])
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>(() => getCached<Record<string, number>>('projectCounts') ?? {})
  const [loading, setLoading] = useState(() => getCached('klanten') === undefined)
  const [sortField, setSortField] = useState<SortField>('bedrijfsnaam')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [labelFilter, setLabelFilter] = useState<string>('alle')
  const [klantStatusFilter, setKlantStatusFilter] = useState<string>('alle')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50

  const fetchData = useCallback(() => {
    Promise.all([fetchQuery('klanten', getKlanten), fetchQuery('projectCounts', getProjectCountsByKlant)])
      .then(([k, counts]) => {
        setKlanten(k)
        setProjectCounts(counts)
      })
      .catch(logger.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    // Skeleton alleen bij de allereerste load (geen cache). Daarna tonen
    // we de gecachete lijst direct en revalideren stil op de achtergrond.
    if (getCached('klanten') === undefined) setLoading(true)
    Promise.all([fetchQuery('klanten', getKlanten), fetchQuery('projectCounts', getProjectCountsByKlant)])
      .then(([k, counts]) => {
        if (!cancelled) {
          setKlanten(k)
          setProjectCounts(counts)
        }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Count projects per client

  // Filtered + sorted clients
  const filteredKlanten = useMemo(() => {
    let result = [...klanten]

    // Status filter
    if (statusFilter === 'met-aandacht') {
      result = result.filter(klantNeedsAttention)
    } else if (statusFilter !== 'alle') {
      result = result.filter((k) => k.status === statusFilter)
    }

    // Label filter
    if (labelFilter !== 'alle') {
      result = result.filter((k) => (k.klant_labels || []).includes(labelFilter))
    }

    // Klant status filter
    if (klantStatusFilter !== 'alle') {
      result = result.filter((k) => (k.klant_status || 'normaal') === klantStatusFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        (k) =>
          (k.bedrijfsnaam || '').toLowerCase().includes(query) ||
          (k.contactpersoon || '').toLowerCase().includes(query) ||
          (k.email || '').toLowerCase().includes(query) ||
          (k.telefoon || '').toLowerCase().includes(query) ||
          (k.stad || '').toLowerCase().includes(query) ||
          (k.tags || []).some((tag) => tag.toLowerCase().includes(query)) ||
          (k.labels || []).some((l) => l.toLowerCase().includes(query))
      )
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'bedrijfsnaam':
          cmp = (a.bedrijfsnaam || '').localeCompare(b.bedrijfsnaam || '', 'nl')
          break
        case 'contactpersoon':
          cmp = (a.contactpersoon || '').localeCompare(b.contactpersoon || '', 'nl')
          break
        case 'stad':
          cmp = (a.stad || '').localeCompare(b.stad || '', 'nl')
          break
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '', 'nl')
          break
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [klanten, searchQuery, statusFilter, labelFilter, klantStatusFilter, sortField, sortDir])

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter, labelFilter, klantStatusFilter, sortField, sortDir])

  const totalPages = Math.ceil(filteredKlanten.length / PAGE_SIZE)
  const paginatedKlanten = useMemo(
    () => filteredKlanten.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredKlanten, currentPage]
  )

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function handleClientSaved(klant: Klant) {
    const wasEerste = !editingKlant && klanten.length === 0
    setAddDialogOpen(false)
    setEditingKlant(undefined)
    if (wasEerste && markeerEenmalig('eerste_klant')) {
      vierMijlpaal({
        titel: 'Je eerste klant staat erin',
        tekst: 'Vanaf hier maak je met een paar klikken een project, offerte of factuur voor deze klant.',
      })
    } else {
      toast.success(`Klant "${klant.bedrijfsnaam}" opgeslagen`)
    }
    fetchData()
  }

  function handleEditClient(klant: Klant) {
    setEditingKlant(klant)
    setAddDialogOpen(true)
  }

  async function handleDeleteClient(id: string) {
    const confirmed = await confirm({ message: 'Weet je zeker dat je deze klant wilt verwijderen? Dit kan niet ongedaan worden.', variant: 'destructive', confirmLabel: 'Verwijderen' })
    if (!confirmed) return
    try {
      await deleteKlant(id)
      toast.success('Klant verwijderd')
      fetchData()
    } catch (error) {
      logger.error(error)
      toast.error(error instanceof Error ? error.message : 'Fout bij verwijderen van klant')
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredKlanten.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredKlanten.map((k) => k.id)))
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    const confirmed = await confirm({
      message: `Weet je zeker dat je ${selectedIds.size} klant${selectedIds.size === 1 ? '' : 'en'} wilt verwijderen? Dit kan niet ongedaan worden.`,
      variant: 'destructive',
      confirmLabel: 'Verwijderen'
    })
    if (!confirmed) return
    const results = await Promise.allSettled([...selectedIds].map((id) => deleteKlant(id)))
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length
    if (succeeded > 0) toast.success(`${succeeded} klant${succeeded === 1 ? '' : 'en'} verwijderd`)
    if (failed > 0) toast.error(`${failed} klant${failed === 1 ? '' : 'en'} konden niet verwijderd worden (hebben nog projecten?)`)
    setSelectedIds(new Set())
    fetchData()
  }

  async function handleKlantStatusChange(klantId: string, newStatus: Klant['status']) {
    const vorige = klanten.find((k) => k.id === klantId)?.status
    if (vorige === newStatus) return
    setKlanten((prev) => prev.map((k) => (k.id === klantId ? { ...k, status: newStatus } : k)))
    try {
      await updateKlant(klantId, { status: newStatus })
    } catch (err) {
      logger.error('Klantstatus wijzigen mislukt:', err)
      setKlanten((prev) => prev.map((k) => (k.id === klantId ? { ...k, status: vorige } : k)))
      toast.error('Kon status niet wijzigen')
    }
  }

  async function handleBulkStatusChange(newStatus: Klant['status']) {
    if (selectedIds.size === 0) return
    const ids = [...selectedIds]
    setKlanten((prev) => prev.map((k) => (selectedIds.has(k.id) ? { ...k, status: newStatus } : k)))
    const results = await Promise.allSettled(ids.map((id) => updateKlant(id, { status: newStatus })))
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      toast.error(`${failed} klant${failed === 1 ? '' : 'en'} konden niet bijgewerkt worden`)
      fetchData()
    } else {
      toast.success(`${ids.length} klant${ids.length === 1 ? '' : 'en'} op ${KLANT_STATUS_LABELS[newStatus]} gezet`)
    }
    setSelectedIds(new Set())
  }

  const exportHeaders = ['Bedrijfsnaam', 'Contactpersoon', 'Email', 'Telefoon', 'Adres', 'Postcode', 'Stad', 'Website', 'Debiteurennummer', 'KvK', 'BTW', 'Status', 'Tags']
  function getExportRows() {
    return filteredKlanten.map((k) => ({
      Bedrijfsnaam: k.bedrijfsnaam,
      Contactpersoon: k.contactpersoon,
      Email: k.email,
      Telefoon: k.telefoon,
      Adres: k.adres,
      Postcode: k.postcode,
      Stad: k.stad,
      Website: k.website,
      Debiteurennummer: k.debiteurennummer,
      KvK: k.kvk_nummer,
      BTW: k.btw_nummer,
      Status: k.status,
      Tags: k.tags.join(', '),
    }))
  }

  function renderRowActions(klant: Klant) {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || 'Klant', id: `/klanten/${klant.id}` }) }}>
            <Eye className="w-3.5 h-3.5 mr-2" />
            Bekijken
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClient(klant) }}>
            <Pencil className="w-3.5 h-3.5 mr-2" />
            Bewerken
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {KLANT_STATUS_OPTIES.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={(e) => { e.stopPropagation(); handleKlantStatusChange(klant.id, s) }}
              className={cn(klant.status === s && 'font-semibold')}
            >
              <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: KLANT_STATUS_HEX[s] }} />
              {KLANT_STATUS_LABELS[s]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projecten/nieuw?klant_id=${klant.id}`) }}>
            <FolderPlus className="w-3.5 h-3.5 mr-2" />
            Project aanmaken
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/offertes/nieuw?klant_id=${klant.id}`) }}>
            <FileText className="w-3.5 h-3.5 mr-2" />
            Offerte maken
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/facturen/nieuw?klant_id=${klant.id}`) }}>
            <Receipt className="w-3.5 h-3.5 mr-2" />
            Factuur aanmaken
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigateWithTab({ path: `/email/compose?to=${encodeURIComponent(klant.email)}`, label: 'Nieuwe email', id: `/email/compose-${klant.email}` }) }}>
            <Mail className="w-3.5 h-3.5 mr-2" />
            Klant mailen
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); handleDeleteClient(klant.id) }}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Verwijderen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const kpiCounts = useMemo(() => ({
    metAandacht: klanten.filter(klantNeedsAttention).length,
    actief: klanten.filter((k) => k.status === 'actief').length,
    prospect: klanten.filter((k) => k.status === 'prospect').length,
    inactief: klanten.filter((k) => k.status === 'inactief').length,
  }), [klanten])

  return (
    <div className="h-full flex flex-col -m-3 sm:-m-4 md:-m-6">

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-4 py-4 md:px-8 md:py-8 space-y-6">

      {/* ── Header + KPI tiles ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-foreground">
              Klanten<span className="text-flame">.</span>
            </h1>
            <span className="text-[13px] text-muted-foreground font-mono tabular-nums">
              {filteredKlanten.length === klanten.length ? (
                <span className="font-medium text-foreground/70">{klanten.length}</span>
              ) : (
                <>
                  <span className="font-medium text-foreground/70">{filteredKlanten.length}</span>
                  <span className="text-muted-foreground/70">/</span>{klanten.length}
                </>
              )}
            </span>
          </div>
          <Button
            onClick={() => { setEditingKlant(undefined); setAddDialogOpen(true) }}
            className="inline-flex items-center gap-2 bg-flame text-white px-3 md:pl-4 md:pr-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[#D03A18] transition-all duration-200"
          >
            <UserPlus className="w-4 h-4 opacity-80" />
            <span className="hidden md:inline">Nieuwe klant</span>
          </Button>
        </div>

        {/* KPI tiles · clickable triage entry-points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { key: 'met-aandacht' as StatusFilter, label: 'Met aandacht',  sub: 'hier is iets mee', count: kpiCounts.metAandacht, Icon: AlertCircle },
            { key: 'actief'       as StatusFilter, label: 'Actief',        sub: 'hier loopt werk',            count: kpiCounts.actief,      Icon: Activity    },
            { key: 'prospect'     as StatusFilter, label: 'Prospect',      sub: 'nog binnen te halen',               count: kpiCounts.prospect,    Icon: UserPlus    },
            { key: 'inactief'     as StatusFilter, label: 'Inactief',      sub: 'rust',                              count: kpiCounts.inactief,    Icon: Moon        },
          ]).map((tile) => {
            const isActive = statusFilter === tile.key
            const TileIcon = tile.Icon
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => setStatusFilter(isActive ? 'alle' : tile.key)}
                className={cn(
                  'group doen-stat-tile relative rounded-xl px-5 py-4 text-left transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame/30 focus-visible:ring-offset-2',
                  isActive && 'doen-stat-tile-active'
                )}
                aria-pressed={isActive}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <TileIcon className={cn('h-[18px] w-[18px] flex-shrink-0', tile.key === 'actief' && 'doen-pulse')} strokeWidth={1.75} />
                    <span className="font-heading text-[14px] font-bold text-foreground">
                      {tile.label}<span className="text-flame">.</span>
                    </span>
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-cijfer font-bold text-[28px] leading-none text-foreground tabular-nums">
                    {tile.count}
                  </span>
                  <span className="doen-subtitel truncate">
                    {tile.sub}<span className="text-flame">.</span>
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
              placeholder="Zoek op naam, email, stad, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-petrol dark:focus:border-white/25 focus:ring-2 focus:ring-petrol/10 dark:focus:ring-white/10 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">/</kbd>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-background rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground/70')}
              title="Rasterweergave"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground/70')}
              title="Lijstweergave"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sort buttons */}
          <div className="hidden sm:flex items-center gap-1">
            {([
              { field: 'bedrijfsnaam' as SortField, label: 'Naam' },
              { field: 'stad' as SortField, label: 'Stad' },
              { field: 'status' as SortField, label: 'Status' },
              { field: 'created_at' as SortField, label: 'Datum' },
            ]).map(({ field, label }) => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={cn(
                  'px-2 py-1.5 rounded-lg text-xs transition-colors',
                  sortField === field
                    ? 'text-petrol dark:text-foreground font-semibold bg-petrol/[0.07] dark:bg-white/[0.06]'
                    : 'text-muted-foreground hover:text-foreground/70 hover:bg-background'
                )}
              >
                {label}
                {sortField === field && (
                  <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
          </div>

          {/* Import + Export */}
          <div className="hidden sm:flex items-center gap-1 ml-auto">
            <button
              onClick={() => navigate('/klanten/importeren')}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background px-3 py-2 rounded-lg transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
            <button
              onClick={() => exportCSV(`klanten-${new Date().toISOString().split('T')[0]}`, exportHeaders, getExportRows())}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background px-3 py-2 rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={() => exportExcel(`klanten-${new Date().toISOString().split('T')[0]}`, exportHeaders, getExportRows(), 'Klanten')}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background px-3 py-2 rounded-lg transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              Excel
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1 flex-1 flex-nowrap md:flex-wrap overflow-x-auto">
            {(['alle', 'actief', 'inactief', 'prospect', 'met-aandacht'] as StatusFilter[]).map((f) => {
              const labels: Record<StatusFilter, string> = {
                alle: 'Alle',
                actief: 'Actief',
                inactief: 'Inactief',
                prospect: 'Prospect',
                'met-aandacht': 'Met aandacht',
              }
              const counts: Record<StatusFilter, number> = {
                alle: klanten.length,
                actief: kpiCounts.actief,
                inactief: kpiCounts.inactief,
                prospect: kpiCounts.prospect,
                'met-aandacht': kpiCounts.metAandacht,
              }
              const isActive = statusFilter === f
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'relative text-[13px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all',
                    isActive
                      ? 'text-petrol dark:text-foreground font-semibold bg-petrol/[0.07] dark:bg-white/[0.06]'
                      : 'text-muted-foreground hover:text-foreground/70'
                  )}
                >
                  {labels[f]}
                  {counts[f] > 0 && <span className="ml-1 font-mono text-[11px] opacity-50">{counts[f]}</span>}
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-petrol dark:bg-[#5AABB5] rounded-full" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Label + status filters · één rij met groepslabels i.p.v. twee
            bijna identieke rijen (labels en status delen dezelfde termen) */}
        <div className="flex items-center gap-1 mt-3 flex-nowrap md:flex-wrap overflow-x-auto">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground/60 pr-1 flex-shrink-0">Status</span>
          {[
            { value: 'alle', label: 'Alle', color: undefined },
            ...Object.entries(klantStatusConfig).map(([key, cfg]) => ({
              value: key, label: cfg.label, color: cfg.color,
            })),
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setKlantStatusFilter(opt.value)}
              className={cn(
                'relative text-[13px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5',
                klantStatusFilter === opt.value
                  ? 'text-petrol dark:text-foreground font-semibold bg-petrol/[0.07] dark:bg-white/[0.06]'
                  : 'text-muted-foreground hover:text-foreground/70'
              )}
            >
              {opt.color && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
              )}
              {opt.label}
              {klantStatusFilter === opt.value && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-petrol dark:bg-[#5AABB5] rounded-full" />}
            </button>
          ))}

          <span className="w-px h-4 bg-border mx-2 flex-shrink-0" />

          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground/60 pr-1 flex-shrink-0">Labels</span>
          {[
            { value: 'alle', label: 'Alle' },
            { value: 'grote_klant', label: 'Grote klant' },
            { value: 'wanbetaler', label: 'Wanbetaler' },
            { value: 'vooruit_betalen', label: 'Vooruit betalen' },
            { value: 'niet_helpen', label: 'Niet helpen' },
            { value: 'voorrang', label: 'Voorrang' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLabelFilter(opt.value)}
              className={cn(
                'relative text-[13px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all',
                labelFilter === opt.value
                  ? 'text-petrol dark:text-foreground font-semibold bg-petrol/[0.07] dark:bg-white/[0.06]'
                  : 'text-muted-foreground hover:text-foreground/70'
              )}
            >
              {opt.label}
              {labelFilter === opt.value && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-petrol dark:bg-[#5AABB5] rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : filteredKlanten.length === 0 ? (
        <div className="doen-slate-surface rounded-2xl p-12 text-center">
          <EmptyState
            module="klanten"
            title={searchQuery || statusFilter !== 'alle' ? 'Geen klanten gevonden' : 'Nog geen klanten'}
            description={searchQuery || statusFilter !== 'alle'
              ? 'Probeer andere zoektermen of filters.'
              : 'Voeg je eerste klant toe. Winkels, horeca, bedrijven die signing nodig hebben.'}
            action={!searchQuery && statusFilter === 'alle' ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={() => { setEditingKlant(undefined); setAddDialogOpen(true) }}
                  className="inline-flex items-center gap-2 bg-flame text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#E04520] transition-colors"
                >
                  <UserPlus className="w-4 h-4 opacity-80" />
                  Eerste klant toevoegen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/importeren')}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Importeren uit Excel
                </Button>
              </div>
            ) : undefined}
          />
        </div>
      ) : viewMode === 'grid' ? (
        /* ==================== GRID VIEW ==================== */
        <>
        {selectedIds.size > 0 && (
          <div className="bg-petrol/[0.06] dark:bg-white/[0.05] rounded-xl ring-1 ring-petrol/10 dark:ring-white/10 px-5 py-3 flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-petrol text-white flex items-center justify-center text-xs font-bold">{selectedIds.size}</span>
              <span className="text-sm font-semibold text-petrol dark:text-foreground">{selectedIds.size} klant{selectedIds.size === 1 ? '' : 'en'} geselecteerd</span>
            </div>
            <button onClick={toggleSelectAll} className="text-xs font-semibold text-petrol dark:text-foreground px-2.5 py-1 rounded-md hover:bg-card/40 transition-all">
              {selectedIds.size === filteredKlanten.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>
            <div className="flex-1" />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-card ring-1 ring-petrol/15 text-petrol dark:text-foreground hover:shadow-sm transition-all">
                  Status wijzigen
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {KLANT_STATUS_OPTIES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => handleBulkStatusChange(s)}>
                    <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: KLANT_STATUS_HEX[s] }} />
                    {KLANT_STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-card ring-1 ring-[#C03A18]/20 text-[#C03A18] hover:shadow-sm transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Verwijder ({selectedIds.size})
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg text-petrol dark:text-foreground hover:bg-card/40 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {paginatedKlanten.map((klant) => (
            <ClientCard
              key={klant.id}
              klant={klant}
              projectCount={projectCounts[klant.id] || 0}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
              selected={selectedIds.has(klant.id)}
              onToggleSelect={() => toggleSelect(klant.id)}
            />
          ))}
        </div>
        </>
      ) : (
        /* ==================== LIST VIEW ==================== */
        <>
        {selectedIds.size > 0 && (
          <div className="bg-petrol/[0.06] dark:bg-white/[0.05] rounded-xl ring-1 ring-petrol/10 dark:ring-white/10 px-5 py-3 flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-petrol text-white flex items-center justify-center text-xs font-bold">{selectedIds.size}</span>
              <span className="text-sm font-semibold text-petrol dark:text-foreground">{selectedIds.size} klant{selectedIds.size === 1 ? '' : 'en'} geselecteerd</span>
            </div>
            <button onClick={toggleSelectAll} className="text-xs font-semibold text-petrol dark:text-foreground px-2.5 py-1 rounded-md hover:bg-card/40 transition-all">
              {selectedIds.size === filteredKlanten.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>
            <div className="flex-1" />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-card ring-1 ring-petrol/15 text-petrol dark:text-foreground hover:shadow-sm transition-all">
                  Status wijzigen
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {KLANT_STATUS_OPTIES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => handleBulkStatusChange(s)}>
                    <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: KLANT_STATUS_HEX[s] }} />
                    {KLANT_STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-card ring-1 ring-[#C03A18]/20 text-[#C03A18] hover:shadow-sm transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Verwijder ({selectedIds.size})
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg text-petrol dark:text-foreground hover:bg-card/40 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          className="doen-slate-surface rounded-2xl"
          style={{ clipPath: 'inset(0 round 16px)' }}
        >
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'hsl(var(--card))', backdropFilter: 'blur(4px)' }}>
                <tr className="border-b border-border">
                  <th className="py-3.5 pl-5 pr-3 w-10 text-left">
                    <Checkbox
                      checked={filteredKlanten.length > 0 && selectedIds.size === filteredKlanten.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecteer alles"
                      className="border-petrol/25 dark:border-white/20 rounded-sm transition-colors data-[state=checked]:bg-flame data-[state=checked]:border-flame data-[state=checked]:text-white"
                    />
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Bedrijfsnaam</span>
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Email</span>
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Telefoon</span>
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Stad</span>
                  </th>
                  <th className="text-center py-3.5 pr-4 w-[80px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Projecten</span>
                  </th>
                  <th className="w-10 py-3.5 pr-4" />
                </tr>
              </thead>
              <tbody>
                {paginatedKlanten.map((klant, i) => {
                  const stripeHex = klantNeedsAttention(klant) ? '#F15025' : klantStatusHex(klant.status)
                  return (
                  <tr
                    key={klant.id}
                    className={cn(
                      'doen-row border-b border-border last:border-0 cursor-pointer transition-all duration-200 group',
                      klantNeedsAttention(klant) && !selectedIds.has(klant.id) && 'bg-flame/[0.025]',
                      'hover:bg-petrol/[0.04] dark:hover:bg-white/[0.03]',
                      selectedIds.has(klant.id) && 'bg-petrol/[0.03] dark:bg-white/[0.05]'
                    )}
                    style={{ animationDelay: `${i * 25}ms` }}
                    onClick={() => navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || 'Klant', id: `/klanten/${klant.id}` })}
                  >
                    <td
                      className="py-3.5 pl-5 pr-3 align-middle"
                      style={{ boxShadow: `inset 2px 0 0 0 ${stripeHex}` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(klant.id)}
                        onCheckedChange={() => toggleSelect(klant.id)}
                        aria-label={`Selecteer ${klant.bedrijfsnaam}`}
                        className="border-petrol/25 dark:border-white/20 rounded-sm transition-colors group-hover:border-petrol/45 dark:group-hover:border-white/35 data-[state=checked]:bg-flame data-[state=checked]:border-flame data-[state=checked]:text-white"
                      />
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {(() => {
                          const tint = avatarTint(klant.bedrijfsnaam)
                          return (
                            <span
                              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold uppercase select-none"
                              style={{ backgroundColor: tint.bg, color: tint.fg }}
                            >
                              {klant.bedrijfsnaam.charAt(0)}
                            </span>
                          )
                        })()}
                        <div className="min-w-0">
                          <span className="text-[15px] font-semibold text-petrol dark:text-foreground group-hover:text-petrol dark:group-hover:text-foreground truncate block transition-colors">
                            {klant.bedrijfsnaam}
                          </span>
                          {(klant.klant_labels || []).length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {(klant.klant_labels || []).map((label) => {
                                const dotColors: Record<string, string> = {
                                  vooruit_betalen: 'bg-[#FEA060] dark:bg-[#FFB380]',
                                  niet_helpen: 'bg-[#C03A18] dark:bg-[#DA7B70]',
                                  voorrang: 'bg-[#2D6B48] dark:bg-[#4A9960]',
                                  grote_klant: 'bg-[#3A5A9A] dark:bg-[#7AA4CC]',
                                  wanbetaler: 'bg-[#C03A18] dark:bg-[#DA7B70]',
                                }
                                return (
                                  <span
                                    key={label}
                                    className={`w-1.5 h-1.5 rounded-full ${dotColors[label] || 'bg-[#C0BDB8] dark:bg-white/30'}`}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-[13px] text-muted-foreground truncate block">
                        {klant.email}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-[13px] text-muted-foreground font-mono">
                        {klant.telefoon}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-[13px] text-muted-foreground">
                        {klant.stad}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-center">
                      <span className="inline-flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums rounded-md px-2 py-0.5 bg-background text-foreground/70">
                        {projectCounts[klant.id] || 0}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                      {renderRowActions(klant)}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
        </>
      )}

      {/* Paginatie */}
      {!loading && filteredKlanten.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredKlanten.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Add/Edit client dialog */}
      <AddEditClient
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open)
          if (!open) setEditingKlant(undefined)
        }}
        onSaved={handleClientSaved}
        klant={editingKlant}
      />

      </div>
      </div>
    </div>
  )
}
