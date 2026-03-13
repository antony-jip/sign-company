import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
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
  CheckCircle2,
  X,
  Pin,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getRowAccentClass } from '@/utils/statusColors'
import { exportCSV, exportExcel } from '@/lib/export'
import { getKlanten, getProjecten, deleteKlant, updateKlant } from '@/services/supabaseService'
import type { Klant, Project } from '@/types'
import { AddEditClient } from './AddEditClient'
import { logger } from '../../utils/logger'
import { SkeletonTable } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

type StatusFilter = 'alle' | 'actief' | 'inactief' | 'prospect'
type SortField = 'bedrijfsnaam' | 'stad' | 'projecten'
type SortDir = 'asc' | 'desc'

const statusOpties: { value: StatusFilter; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'actief', label: 'Actief' },
  { value: 'inactief', label: 'Inactief' },
  { value: 'prospect', label: 'Prospect' },
]

const statusLabels: Record<string, string> = {
  actief: 'Actief',
  inactief: 'Inactief',
  prospect: 'Prospect',
}

function getKlantStatusDotColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-[var(--color-sage-text)]'
    case 'prospect': return 'bg-[var(--color-cream-text)]'
    case 'inactief': return 'bg-[var(--color-blush-text)]'
    default: return 'bg-[var(--color-cream-text)]'
  }
}

function getKlantStatusBorderColor(status: string): string {
  switch (status) {
    case 'actief': return 'border-l-[var(--color-sage-border)]'
    case 'prospect': return 'border-l-[var(--color-cream-border)]'
    case 'inactief': return 'border-l-[var(--color-blush-border)]'
    default: return 'border-l-[var(--color-cream-border)]'
  }
}

function getKlantStatusCellBg(status: string): string {
  switch (status) {
    case 'actief': return 'bg-[var(--color-sage)]/50'
    case 'prospect': return 'bg-[var(--color-cream)]/50'
    case 'inactief': return 'bg-[var(--color-blush)]/50'
    default: return 'bg-muted/30'
  }
}

export function ClientsLayout() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingKlant, setEditingKlant] = useState<Klant | undefined>(undefined)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('bedrijfsnaam')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
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

  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    projecten.forEach((p) => {
      counts[p.klant_id] = (counts[p.klant_id] || 0) + 1
    })
    return counts
  }, [projecten])

  const filteredKlanten = useMemo(() => {
    let result = [...klanten]

    if (statusFilter !== 'alle') {
      result = result.filter((k) => k.status === statusFilter)
    }

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

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'bedrijfsnaam':
          cmp = (a.bedrijfsnaam || '').localeCompare(b.bedrijfsnaam || '', 'nl')
          break
        case 'stad':
          cmp = (a.stad || '').localeCompare(b.stad || '', 'nl')
          break
        case 'projecten':
          cmp = (projectCounts[a.id] || 0) - (projectCounts[b.id] || 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [klanten, searchQuery, statusFilter, sortField, sortDir, projectCounts])

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'bedrijfsnaam' ? 'asc' : 'desc')
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

  async function handleStatusChange(klantId: string, newStatus: Klant['status']) {
    try {
      const updated = await updateKlant(klantId, { status: newStatus })
      setKlanten((prev) => prev.map((k) => (k.id === updated.id ? updated : k)))
      toast.success(`Status gewijzigd naar ${statusLabels[newStatus]}`)
    } catch (error) {
      logger.error('Fout bij statuswijziging:', error)
      toast.error('Kon status niet wijzigen')
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

  async function handleBulkStatusChange(newStatus: Klant['status']) {
    if (selectedIds.size === 0) return
    try {
      const updates = await Promise.all(
        [...selectedIds].map((id) => updateKlant(id, { status: newStatus }))
      )
      setKlanten((prev) =>
        prev.map((k) => {
          const updated = updates.find((u) => u.id === k.id)
          return updated || k
        })
      )
      toast.success(`${selectedIds.size} klant${selectedIds.size === 1 ? '' : 'en'} gewijzigd naar ${statusLabels[newStatus]}`)
      setSelectedIds(new Set())
    } catch (error) {
      logger.error('Fout bij bulk statuswijziging:', error)
      toast.error('Kon status niet wijzigen')
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

  return (
    <div className="h-full flex flex-col mod-strip mod-strip-klanten">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/40 bg-background flex-shrink-0 rounded-t-2xl">
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

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-5 p-4 sm:p-6">

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="relative overflow-hidden rounded-xl border shadow-sm" style={{ background: 'linear-gradient(135deg, var(--color-mist, #E6EAF0), #d4e0eb)', borderColor: 'var(--color-mist-border, #c4cdd6)' }}>
          <div className="relative flex items-center gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: '#5D7A93', color: 'white' }}>
                <span className="text-[11px] font-bold">{selectedIds.size}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold" style={{ color: '#5D7A93' }}>
                  {selectedIds.size} {selectedIds.size === 1 ? 'klant' : 'klanten'} geselecteerd
                </span>
                <span className="text-[10px] font-medium" style={{ color: '#5D7A93', opacity: 0.6 }}>
                  van {filteredKlanten.length} totaal
                </span>
              </div>
            </div>

            <button
              onClick={toggleSelectAll}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all hover:bg-white/40"
              style={{ color: '#5D7A93' }}
            >
              {selectedIds.size === filteredKlanten.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12px] font-semibold shadow-sm transition-all hover:shadow-md bg-white/90 backdrop-blur-sm border" style={{ color: '#5D7A93', borderColor: 'var(--color-mist-border, #c4cdd6)' }}>
                  <ArrowUpDown className="w-3 h-3" />
                  Status wijzigen
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {statusOpties.filter(s => s.value !== 'alle').map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={() => handleBulkStatusChange(s.value as Klant['status'])}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getKlantStatusDotColor(s.value))} />
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 h-8"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Verwijder ({selectedIds.size})
            </Button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-7 w-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/40"
              style={{ color: '#5D7A93' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, email, stad, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap flex-1 overflow-x-auto scrollbar-hide">
          {statusOpties.map((optie) => {
            const count = optie.value === 'alle'
              ? klanten.length
              : klanten.filter((k) => k.status === optie.value).length
            if (optie.value !== 'alle' && count === 0) return null
            return (
              <button
                key={optie.value}
                onClick={() => setStatusFilter(optie.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all duration-150',
                  statusFilter === optie.value
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )}
              >
                {optie.label}
                {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            )
          })}
        </div>

        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => navigate('/klanten/importeren')}
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            Import
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => exportCSV(`klanten-${new Date().toISOString().split('T')[0]}`, exportHeaders, getExportRows())}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => exportExcel(`klanten-${new Date().toISOString().split('T')[0]}`, exportHeaders, getExportRows(), 'Klanten')}
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : filteredKlanten.length === 0 ? (
        <Card className="border-dashed border-black/[0.06]">
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
      ) : (
        <div className="rounded-xl border border-black/[0.06] bg-card/80 backdrop-blur-sm overflow-hidden -mx-3 sm:mx-0 shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={filteredKlanten.length > 0 && selectedIds.size === filteredKlanten.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecteer alles"
                  />
                </th>
                <th className="text-left py-2.5 px-4 w-[110px]">
                  <span className="text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Status</span>
                </th>
                <th className="text-left py-2.5 px-4">
                  <button
                    onClick={() => handleSort('bedrijfsnaam')}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#8a8680] uppercase tracking-label hover:text-foreground transition-colors"
                  >
                    Bedrijfsnaam
                    {sortField === 'bedrijfsnaam' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-left py-2.5 px-4 hidden md:table-cell">
                  <span className="text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Contactpersoon</span>
                </th>
                <th className="text-left py-2.5 px-4 hidden lg:table-cell">
                  <span className="text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Email</span>
                </th>
                <th className="text-left py-2.5 px-4 hidden lg:table-cell">
                  <button
                    onClick={() => handleSort('stad')}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#8a8680] uppercase tracking-label hover:text-foreground transition-colors"
                  >
                    Stad
                    {sortField === 'stad' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="text-center py-2.5 px-4 hidden xl:table-cell">
                  <button
                    onClick={() => handleSort('projecten')}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#8a8680] uppercase tracking-label hover:text-foreground transition-colors mx-auto"
                  >
                    Projecten
                    {sortField === 'projecten' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="w-10 py-2.5 px-2" />
              </tr>
            </thead>
            <tbody className="row-stagger">
              {filteredKlanten.map((klant) => (
                <tr
                  key={klant.id}
                  className={cn(
                    'border-b border-border/30 last:border-0 hover:bg-[#F4F3F0]/50 dark:hover:bg-muted/20 cursor-pointer transition-all duration-150 group border-l-2',
                    getKlantStatusBorderColor(klant.status),
                    selectedIds.has(klant.id) && 'bg-[#8BAFD4]/5'
                  )}
                  onClick={() => navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || 'Klant', id: `/klanten/${klant.id}` })}
                >
                  {/* Checkbox */}
                  <td className="w-10 px-3 py-3">
                    <Checkbox
                      checked={selectedIds.has(klant.id)}
                      onCheckedChange={() => toggleSelect(klant.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Selecteer ${klant.bedrijfsnaam}`}
                    />
                  </td>

                  {/* Status — inline changeable */}
                  <td className="py-0 px-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'w-full h-full py-3 px-4 flex items-center gap-1.5 transition-colors border-l-[3px]',
                            getKlantStatusBorderColor(klant.status),
                            getKlantStatusCellBg(klant.status),
                            'hover:brightness-95 dark:hover:brightness-110'
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getKlantStatusDotColor(klant.status))} />
                          <span className="text-xs font-medium text-foreground">
                            {statusLabels[klant.status] || klant.status}
                          </span>
                          <ChevronDown className="w-3 h-3 text-muted-foreground/40 ml-auto" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        {statusOpties.filter(s => s.value !== 'alle').map((s) => (
                          <DropdownMenuItem
                            key={s.value}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (s.value !== klant.status) {
                                handleStatusChange(klant.id, s.value as Klant['status'])
                              }
                            }}
                            className={cn(
                              'flex items-center gap-2 text-xs',
                              s.value === klant.status && 'font-semibold'
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getKlantStatusDotColor(s.value))} />
                            {s.label}
                            {s.value === klant.status && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>

                  {/* Bedrijfsnaam + labels + pin */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#8BAFD4]/15 dark:bg-[#8BAFD4]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-[#8BAFD4]">
                          {klant.bedrijfsnaam.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-foreground truncate block">
                            {klant.bedrijfsnaam}
                          </span>
                          {klant.gepinde_notitie && (
                            <Pin className="w-3 h-3 text-amber-500/60 flex-shrink-0" />
                          )}
                        </div>
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

                  {/* Contactpersoon */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[13px] text-muted-foreground">
                      {klant.contactpersoon}
                    </span>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[13px] text-muted-foreground">
                      {klant.email}
                    </span>
                  </td>

                  {/* Stad */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[13px] text-muted-foreground">
                      {klant.stad}
                    </span>
                  </td>

                  {/* Projecten count */}
                  <td className="px-4 py-3 text-center hidden xl:table-cell">
                    <Badge variant="secondary" className="text-xs font-mono">
                      {projectCounts[klant.id] || 0}
                    </Badge>
                  </td>

                  {/* Quick actions + Menu */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-0.5 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || 'Klant', id: `/klanten/${klant.id}` })
                        }}
                        className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                        title="Bekijken"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/projecten/nieuw?klant_id=${klant.id}`)
                        }}
                        className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                        title="Project aanmaken"
                      >
                        <FolderPlus className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {klant.email && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `mailto:${klant.email}`
                          }}
                          className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                          title="Klant mailen"
                        >
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}

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
                          {klant.email && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${klant.email}` }}>
                              <Mail className="w-3.5 h-3.5 mr-2" />
                              Klant mailen
                            </DropdownMenuItem>
                          )}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
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
