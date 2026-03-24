import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { cn } from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import { getKlanten, getProjecten, deleteKlant } from '@/services/supabaseService'
import type { Klant, Project } from '@/types'
import { klantStatusConfig } from '@/types'
import { ClientCard } from './ClientCard'
import { AddEditClient } from './AddEditClient'
import { logger } from '../../utils/logger'
import { SkeletonTable } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
// ModuleHeader removed — using DOEN inline header
import { confirm } from '@/components/shared/ConfirmDialog'

type ViewMode = 'grid' | 'list'
type StatusFilter = 'alle' | 'actief' | 'inactief' | 'prospect'
type SortField = 'bedrijfsnaam' | 'contactpersoon' | 'stad' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

export function ClientsLayout() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingKlant, setEditingKlant] = useState<Klant | undefined>(undefined)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('bedrijfsnaam')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [labelFilter, setLabelFilter] = useState<string>('alle')
  const [klantStatusFilter, setKlantStatusFilter] = useState<string>('alle')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([getKlanten(), getProjecten()])
      .then(([k, p]) => {
        setKlanten(k)
        setProjecten(p)
      })
      .catch(logger.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getKlanten(), getProjecten()])
      .then(([k, p]) => {
        if (!cancelled) {
          setKlanten(k)
          setProjecten(p)
        }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Count projects per client
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    projecten.forEach((p) => {
      counts[p.klant_id] = (counts[p.klant_id] || 0) + 1
    })
    return counts
  }, [projecten])

  // Filtered + sorted clients
  const filteredKlanten = useMemo(() => {
    let result = [...klanten]

    // Status filter
    if (statusFilter !== 'alle') {
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

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function handleClientSaved(klant: Klant) {
    setAddDialogOpen(false)
    setEditingKlant(undefined)
    toast.success(`Klant "${klant.bedrijfsnaam}" opgeslagen`)
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

  const exportHeaders = ['Bedrijfsnaam', 'Contactpersoon', 'Email', 'Telefoon', 'Adres', 'Postcode', 'Stad', 'Website', 'KvK', 'BTW', 'Status', 'Tags']
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
            className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-[#9B9B95]" />
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
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${klant.email}` }}>
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

  return (
    <div className="h-full flex flex-col bg-[#F8F7F5] -m-3 sm:-m-4 md:-m-6">
      {/* Inline keyframes for pulse + stagger */}
      <style>{`
        @keyframes doen-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes doen-fade-up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .doen-pulse { animation: doen-pulse 2.5s ease-in-out infinite }
        .doen-row { animation: doen-fade-up .35s cubic-bezier(.22,1,.36,1) both }
      `}</style>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-8 py-8 space-y-6 max-w-[1400px]">

      {/* ── Header + Stats ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-[#1A1A1A]">
              Klanten<span className="text-[#F15025]">.</span>
            </h1>
            <span className="text-[13px] text-[#9B9B95] font-mono tabular-nums">
              <span className="font-medium text-[#6B6B66]">{filteredKlanten.length}</span>
              <span className="text-[#C0BDB8]">/</span>{klanten.length}
            </span>
          </div>
          <Button
            onClick={() => { setEditingKlant(undefined); setAddDialogOpen(true) }}
            className="inline-flex items-center gap-2 bg-[#F15025] text-white pl-4 pr-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[#D03A18] transition-all duration-200"
          >
            <UserPlus className="w-4 h-4 opacity-80" />
            Nieuwe klant
          </Button>
        </div>

        {/* Quick stats — compact inline badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {klanten.filter((k) => k.status === 'actief').length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#E8F2EC] text-[#2D6B48]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D6B48] doen-pulse" />
              <span className="font-mono">{klanten.filter((k) => k.status === 'actief').length}</span> actief
            </span>
          )}
          {klanten.filter((k) => k.status === 'prospect').length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#E8EEF9] text-[#3A5A9A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3A5A9A]" />
              <span className="font-mono">{klanten.filter((k) => k.status === 'prospect').length}</span> prospect
            </span>
          )}
          {klanten.filter((k) => k.status === 'inactief').length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#F5F2E8] text-[#8A7A4A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8A7A4A]" />
              <span className="font-mono">{klanten.filter((k) => k.status === 'inactief').length}</span> inactief
            </span>
          )}
        </div>
      </div>

      {/* ── Toolbar card ── */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03]">
        <div className="flex items-center gap-5">
          {/* Search with keyboard hint */}
          <div className="relative max-w-[280px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B95]" />
            <input
              type="text"
              placeholder="Zoek op naam, email, stad, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-2 text-sm bg-[#F8F7F5] border border-[#EBEBEB] rounded-lg text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#9B9B95] bg-[#F0EFEC] rounded border border-[#E5E4E0]">/</kbd>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-[#F8F7F5] rounded-lg p-0.5 border border-[#EBEBEB]">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-white shadow-sm text-[#1A1A1A]' : 'text-[#9B9B95] hover:text-[#6B6B66]')}
              title="Rasterweergave"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-white shadow-sm text-[#1A1A1A]' : 'text-[#9B9B95] hover:text-[#6B6B66]')}
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
                    ? 'text-[#1A535C] font-semibold bg-[#1A535C]/[0.07]'
                    : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F8F7F5]'
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
              className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
            <button
              onClick={() => exportCSV(`klanten-${new Date().toISOString().split('T')[0]}`, exportHeaders, getExportRows())}
              className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={() => exportExcel(`klanten-${new Date().toISOString().split('T')[0]}`, exportHeaders, getExportRows(), 'Klanten')}
              className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              Excel
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#F0EFEC]">
          <div className="flex items-center gap-1 flex-wrap flex-1">
            {(['alle', 'actief', 'inactief', 'prospect'] as StatusFilter[]).map((f) => {
              const labels: Record<StatusFilter, string> = {
                alle: 'Alle',
                actief: 'Actief',
                inactief: 'Inactief',
                prospect: 'Prospect',
              }
              const counts: Record<StatusFilter, number> = {
                alle: klanten.length,
                actief: klanten.filter((k) => k.status === 'actief').length,
                inactief: klanten.filter((k) => k.status === 'inactief').length,
                prospect: klanten.filter((k) => k.status === 'prospect').length,
              }
              const isActive = statusFilter === f
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'relative text-[13px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all',
                    isActive
                      ? 'text-[#1A535C] font-semibold bg-[#1A535C]/[0.07]'
                      : 'text-[#9B9B95] hover:text-[#6B6B66]'
                  )}
                >
                  {labels[f]}
                  {counts[f] > 0 && <span className="ml-1 font-mono text-[11px] opacity-50">{counts[f]}</span>}
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#1A535C] rounded-full" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Label filter row */}
        <div className="flex items-center gap-1 mt-3 flex-wrap">
          {[
            { value: 'alle', label: 'Alle labels' },
            { value: 'vooruit_betalen', label: 'Vooruit betalen' },
            { value: 'niet_helpen', label: 'Niet helpen' },
            { value: 'voorrang', label: 'Voorrang' },
            { value: 'grote_klant', label: 'Grote klant' },
            { value: 'wanbetaler', label: 'Wanbetaler' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLabelFilter(opt.value)}
              className={cn(
                'relative text-[13px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all',
                labelFilter === opt.value
                  ? 'text-[#1A535C] font-semibold bg-[#1A535C]/[0.07]'
                  : 'text-[#9B9B95] hover:text-[#6B6B66]'
              )}
            >
              {opt.label}
              {labelFilter === opt.value && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#1A535C] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Klant status filter row */}
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {[
            { value: 'alle', label: 'Alle statussen', color: undefined },
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
                  ? 'text-[#1A535C] font-semibold bg-[#1A535C]/[0.07]'
                  : 'text-[#9B9B95] hover:text-[#6B6B66]'
              )}
            >
              {opt.color && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
              )}
              {opt.label}
              {klantStatusFilter === opt.value && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#1A535C] rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : filteredKlanten.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 ring-1 ring-black/[0.03] text-center">
          <EmptyState
            module="klanten"
            title={searchQuery || statusFilter !== 'alle' ? 'Geen klanten gevonden' : 'Nog geen klanten'}
            description={searchQuery || statusFilter !== 'alle'
              ? 'Probeer andere zoektermen of filters.'
              : 'Voeg je eerste klant toe — winkels, horeca, bedrijven die signing nodig hebben.'}
          />
        </div>
      ) : viewMode === 'grid' ? (
        /* ==================== GRID VIEW ==================== */
        <>
        {selectedIds.size > 0 && (
          <div className="bg-[#1A535C]/[0.06] rounded-xl ring-1 ring-[#1A535C]/10 px-5 py-3 flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#1A535C] text-white flex items-center justify-center text-xs font-bold">{selectedIds.size}</span>
              <span className="text-sm font-semibold text-[#1A535C]">{selectedIds.size} klant{selectedIds.size === 1 ? '' : 'en'} geselecteerd</span>
            </div>
            <button onClick={toggleSelectAll} className="text-xs font-semibold text-[#1A535C] px-2.5 py-1 rounded-md hover:bg-white/40 transition-all">
              {selectedIds.size === filteredKlanten.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>
            <div className="flex-1" />
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-white ring-1 ring-[#C03A18]/20 text-[#C03A18] hover:shadow-sm transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Verwijder ({selectedIds.size})
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg text-[#1A535C] hover:bg-white/40 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredKlanten.map((klant) => (
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
          <div className="bg-[#1A535C]/[0.06] rounded-xl ring-1 ring-[#1A535C]/10 px-5 py-3 flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#1A535C] text-white flex items-center justify-center text-xs font-bold">{selectedIds.size}</span>
              <span className="text-sm font-semibold text-[#1A535C]">{selectedIds.size} klant{selectedIds.size === 1 ? '' : 'en'} geselecteerd</span>
            </div>
            <button onClick={toggleSelectAll} className="text-xs font-semibold text-[#1A535C] px-2.5 py-1 rounded-md hover:bg-white/40 transition-all">
              {selectedIds.size === filteredKlanten.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>
            <div className="flex-1" />
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-white ring-1 ring-[#C03A18]/20 text-[#C03A18] hover:shadow-sm transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Verwijder ({selectedIds.size})
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg text-[#1A535C] hover:bg-white/40 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] overflow-hidden">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b-2 border-[#F0EFEC]">
                  <th className="py-3.5 pl-5 pr-3 w-10 text-left">
                    <Checkbox
                      checked={filteredKlanten.length > 0 && selectedIds.size === filteredKlanten.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecteer alles"
                    />
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Bedrijfsnaam</span>
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Email</span>
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Telefoon</span>
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Stad</span>
                  </th>
                  <th className="text-center py-3.5 pr-4 w-[80px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Projecten</span>
                  </th>
                  <th className="w-10 py-3.5 pr-4" />
                </tr>
              </thead>
              <tbody>
                {filteredKlanten.map((klant, i) => (
                  <tr
                    key={klant.id}
                    className={cn(
                      'doen-row border-b border-[#F0EFEC] last:border-0 cursor-pointer transition-all duration-200 group',
                      'hover:bg-[#F8F7F4]',
                      selectedIds.has(klant.id) && 'bg-[#1A535C]/[0.03]'
                    )}
                    style={{ animationDelay: `${i * 25}ms` }}
                    onClick={() => navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || 'Klant', id: `/klanten/${klant.id}` })}
                  >
                    <td className="py-3.5 pl-5 pr-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(klant.id)}
                        onCheckedChange={() => toggleSelect(klant.id)}
                        aria-label={`Selecteer ${klant.bedrijfsnaam}`}
                      />
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {(() => {
                          const c = klant.bedrijfsnaam.charCodeAt(0) % 5
                          const avatarColors = [
                            'bg-[#E8F2EC] text-[#3A7D52]',
                            'bg-[#E8EEF9] text-[#3A5A9A]',
                            'bg-[#F5F2E8] text-[#8A7A4A]',
                            'bg-[#F0EFEC] text-[#6B6B66]',
                            'bg-[#EDE8F4] text-[#6A5A8A]',
                          ]
                          return (
                            <span className={cn('flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold uppercase select-none', avatarColors[c])}>
                              {klant.bedrijfsnaam.charAt(0)}
                            </span>
                          )
                        })()}
                        <div className="min-w-0">
                          <span className="text-[15px] font-semibold text-[#1A1A1A] group-hover:text-[#1A535C] truncate block transition-colors">
                            {klant.bedrijfsnaam}
                          </span>
                          {(klant.klant_labels || []).length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {(klant.klant_labels || []).map((label) => {
                                const dotColors: Record<string, string> = {
                                  vooruit_betalen: 'bg-[#FEA060]',
                                  niet_helpen: 'bg-[#C03A18]',
                                  voorrang: 'bg-[#2D6B48]',
                                  grote_klant: 'bg-[#3A5A9A]',
                                  wanbetaler: 'bg-[#C03A18]',
                                }
                                return (
                                  <span
                                    key={label}
                                    className={`w-1.5 h-1.5 rounded-full ${dotColors[label] || 'bg-[#C0BDB8]'}`}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-[13px] text-[#9B9B95] truncate block">
                        {klant.email}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-[13px] text-[#9B9B95] font-mono">
                        {klant.telefoon}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-[13px] text-[#6B6B66]">
                        {klant.stad}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-center">
                      <span className="inline-flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums rounded-md px-2 py-0.5 bg-[#F5F4F1] text-[#6B6B66]">
                        {projectCounts[klant.id] || 0}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                      {renderRowActions(klant)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        </>
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
