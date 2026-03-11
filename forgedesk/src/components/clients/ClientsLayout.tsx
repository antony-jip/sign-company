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
import { cn, getStatusColor } from '@/lib/utils'
import { getRowAccentClass } from '@/utils/statusColors'
import { exportCSV, exportExcel } from '@/lib/export'
import { getKlanten, getProjecten, deleteKlant } from '@/services/supabaseService'
import type { Klant, Project } from '@/types'
import { ClientCard } from './ClientCard'
import { AddEditClient } from './AddEditClient'
import { logger } from '../../utils/logger'
import { SkeletonTable } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

type ViewMode = 'grid' | 'list'
type StatusFilter = 'alle' | 'actief' | 'inactief' | 'prospect'
type SortField = 'bedrijfsnaam' | 'contactpersoon' | 'stad' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

export function ClientsLayout() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingKlant, setEditingKlant] = useState<Klant | undefined>(undefined)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('bedrijfsnaam')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [labelFilter, setLabelFilter] = useState<string>('alle')
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
          (k.tags || []).some((tag) => tag.toLowerCase().includes(query))
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
  }, [klanten, searchQuery, statusFilter, labelFilter, sortField, sortDir])

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
    const confirmed = window.confirm('Weet je zeker dat je deze klant wilt verwijderen? Dit kan niet ongedaan worden.')
    if (!confirmed) return
    try {
      await deleteKlant(id)
      toast.success('Klant verwijderd')
      fetchData()
    } catch (error) {
      logger.error(error)
      toast.error('Fout bij verwijderen van klant')
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
    const confirmed = window.confirm(
      `Weet je zeker dat je ${selectedIds.size} klant${selectedIds.size === 1 ? '' : 'en'} wilt verwijderen? Dit kan niet ongedaan worden.`
    )
    if (!confirmed) return
    try {
      await Promise.all([...selectedIds].map((id) => deleteKlant(id)))
      toast.success(`${selectedIds.size} klant${selectedIds.size === 1 ? '' : 'en'} verwijderd`)
      setSelectedIds(new Set())
      fetchData()
    } catch (error) {
      logger.error(error)
      toast.error('Fout bij verwijderen van klanten')
    }
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || klant.voornaam || 'Klant', id: `/klanten/${klant.id}` }) }}>
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
    <div className="space-y-6 mod-strip mod-strip-klanten">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #8BAFD4, #6A8DB8)' }}>
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="page-title text-foreground truncate">Klanten</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {filteredKlanten.length} van {klanten.length} klanten
            </p>
          </div>
        </div>
        <Button onClick={() => { setEditingKlant(undefined); setAddDialogOpen(true) }} className="flex-shrink-0 shadow-sm" size="sm">
          <UserPlus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Nieuwe Klant</span>
        </Button>
      </div>

      {/* Toolbar: Search + Export + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, email, stad, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Import button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 hidden sm:flex"
            onClick={() => navigate('/klanten/importeren')}
          >
            <Upload className="w-4 h-4" />
            Importeren
          </Button>
          {/* Export buttons */}
          <div className="hidden sm:flex items-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-r-none border-r-0 h-9"
              onClick={() => exportCSV(`klanten-${new Date().toISOString().split('T')[0]}`, exportHeaders, getExportRows())}
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-l-none h-9"
              onClick={() => exportExcel(`klanten-${new Date().toISOString().split('T')[0]}`, exportHeaders, getExportRows(), 'Klanten')}
            >
              <FileText className="w-4 h-4" />
              Excel
            </Button>
          </div>
          {/* View toggle */}
          <div className="inline-flex items-center rounded-xl border border-black/[0.06] bg-muted p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg transition-all',
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setViewMode('grid')}
              title="Rasterweergave"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg transition-all',
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setViewMode('list')}
              title="Lijstweergave"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter pills + Sort toolbar */}
      <div className="flex flex-col gap-3">
        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
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
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200',
                  statusFilter === f
                    ? 'bg-primary/12 text-accent dark:bg-primary/20 dark:text-wm-light ring-1 ring-primary/25 shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {labels[f]}
                {counts[f] > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">{counts[f]}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Label filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
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
                'px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                labelFilter === opt.value
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Sort toolbar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowUpDown className="w-3 h-3" />
          <span>Sorteer:</span>
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
                'px-1.5 py-0.5 rounded transition-colors',
                sortField === field
                  ? 'text-accent dark:text-wm-light font-medium'
                  : 'hover:text-foreground'
              )}
            >
              {label}
              {sortField === field && (
                <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} van {filteredKlanten.length} geselecteerd
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={toggleSelectAll}
          >
            {selectedIds.size === filteredKlanten.length ? 'Deselecteer alles' : 'Selecteer alles'}
          </Button>
          <div className="flex-1" />
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleBulkDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Verwijder ({selectedIds.size})
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : filteredKlanten.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            module="klanten"
            title={searchQuery || statusFilter !== 'alle' ? 'Geen klanten gevonden' : 'Nog geen klanten'}
            description={searchQuery || statusFilter !== 'alle'
              ? 'Probeer andere zoektermen of filters.'
              : 'Voeg je eerste klant toe — winkels, horeca, bedrijven die signing nodig hebben.'}
            action={
              (searchQuery || statusFilter !== 'alle') ? (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('alle')
                  }}
                >
                  Filters wissen
                </Button>
              ) : (
                <Button onClick={() => { setEditingKlant(undefined); setAddDialogOpen(true) }} size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nieuwe Klant
                </Button>
              )
            }
          />
        </Card>
      ) : viewMode === 'grid' ? (
        /* ==================== GRID VIEW ==================== */
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
      ) : (
        /* ==================== LIST VIEW ==================== */
        <Card className="rounded-xl border-black/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={filteredKlanten.length > 0 && selectedIds.size === filteredKlanten.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecteer alles"
                    />
                  </th>
                  <th className="text-left text-[11px] font-bold text-[#8a8680] uppercase tracking-label px-4 py-3">
                    Bedrijfsnaam
                  </th>
                  <th className="text-left text-[11px] font-bold text-[#8a8680] uppercase tracking-label px-4 py-3 hidden md:table-cell">
                    Contactpersoon
                  </th>
                  <th className="text-left text-[11px] font-bold text-[#8a8680] uppercase tracking-label px-4 py-3 hidden lg:table-cell">
                    Email
                  </th>
                  <th className="text-left text-[11px] font-bold text-[#8a8680] uppercase tracking-label px-4 py-3 hidden xl:table-cell">
                    Telefoon
                  </th>
                  <th className="text-left text-[11px] font-bold text-[#8a8680] uppercase tracking-label px-4 py-3 hidden lg:table-cell">
                    Stad
                  </th>
                  <th className="text-left text-[11px] font-bold text-[#8a8680] uppercase tracking-label px-4 py-3">
                    Status
                  </th>
                  <th className="text-center text-[11px] font-bold text-[#8a8680] uppercase tracking-label px-4 py-3">
                    Projecten
                  </th>
                  <th className="text-right text-[11px] font-bold text-[#8a8680] uppercase tracking-label px-2 py-3 w-12">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 row-stagger">
                {filteredKlanten.map((klant) => (
                  <tr
                    key={klant.id}
                    className={cn(
                      "hover:bg-[#F4F3F0]/60 cursor-pointer transition-colors group border-l-2",
                      selectedIds.has(klant.id) && "bg-primary/5",
                      getRowAccentClass(klant.status)
                    )}
                    onClick={() => navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || klant.voornaam || 'Klant', id: `/klanten/${klant.id}` })}
                  >
                    <td className="w-10 px-3 py-3">
                      <Checkbox
                        checked={selectedIds.has(klant.id)}
                        onCheckedChange={() => toggleSelect(klant.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Selecteer ${klant.bedrijfsnaam}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#8BAFD4]/15 dark:bg-[#8BAFD4]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-[#8BAFD4]">
                            {klant.bedrijfsnaam.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground truncate block">
                            {klant.bedrijfsnaam}
                          </span>
                          {(klant.klant_labels || []).length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {(klant.klant_labels || []).map((label) => {
                                const dotColors: Record<string, string> = {
                                  vooruit_betalen: 'bg-orange-500',
                                  niet_helpen: 'bg-red-500',
                                  voorrang: 'bg-green-500',
                                  grote_klant: 'bg-blue-500',
                                  wanbetaler: 'bg-red-500',
                                }
                                return (
                                  <span
                                    key={label}
                                    className={`w-1.5 h-1.5 rounded-full ${dotColors[label] || 'bg-muted-foreground/40'}`}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {klant.contactpersoon}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {klant.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {klant.telefoon}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {klant.stad}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('capitalize text-xs', getStatusColor(klant.status))}>
                        {klant.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {projectCounts[klant.id] || 0}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-right">
                      {renderRowActions(klant)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
  )
}
