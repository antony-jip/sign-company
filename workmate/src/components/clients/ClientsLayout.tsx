import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus, Search, LayoutGrid, List, Loader2, ArrowUpDown, Download, FileText, Users } from 'lucide-react'
import { cn, getStatusColor } from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import { getKlanten, getProjecten, deleteKlant } from '@/services/supabaseService'
import type { Klant, Project } from '@/types'
import { TableSkeleton } from '@/components/shared/SkeletonLoaders'
import { ClientCard } from './ClientCard'
import { AddEditClient } from './AddEditClient'
import { logger } from '../../utils/logger'

type ViewMode = 'grid' | 'list'
type StatusFilter = 'alle' | 'actief' | 'inactief' | 'prospect'
type SortField = 'bedrijfsnaam' | 'contactpersoon' | 'stad' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

export function ClientsLayout() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Open new client dialog via ?nieuw=true (from Command Palette)
  useEffect(() => {
    if (searchParams.get('nieuw') === 'true') {
      setAddDialogOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('bedrijfsnaam')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

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
    fetchData()
  }, [fetchData])

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

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        (k) =>
          k.bedrijfsnaam.toLowerCase().includes(query) ||
          k.contactpersoon.toLowerCase().includes(query) ||
          k.email.toLowerCase().includes(query) ||
          k.telefoon.toLowerCase().includes(query) ||
          k.stad.toLowerCase().includes(query) ||
          k.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'bedrijfsnaam':
          cmp = a.bedrijfsnaam.localeCompare(b.bedrijfsnaam, 'nl')
          break
        case 'contactpersoon':
          cmp = a.contactpersoon.localeCompare(b.contactpersoon, 'nl')
          break
        case 'stad':
          cmp = (a.stad || '').localeCompare(b.stad || '', 'nl')
          break
        case 'status':
          cmp = a.status.localeCompare(b.status, 'nl')
          break
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [klanten, searchQuery, statusFilter, sortField, sortDir])

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
    toast.success(`Klant "${klant.bedrijfsnaam}" opgeslagen`)
    fetchData()
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">
            Klanten
          </h1>
          <Badge variant="secondary" className="text-sm font-medium">
            {filteredKlanten.length}
          </Badge>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Nieuwe Klant
        </Button>
      </div>

      {/* Search + Export + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Zoek op naam, email, stad, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Export buttons */}
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-r-none border-r-0 h-9"
              onClick={() => {
                const headers = ['Bedrijfsnaam', 'Contactpersoon', 'Email', 'Telefoon', 'Adres', 'Postcode', 'Stad', 'Website', 'KvK', 'BTW', 'Status', 'Tags']
                const rows = filteredKlanten.map((k) => ({
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
                exportCSV(`klanten-${new Date().toISOString().split('T')[0]}`, headers, rows)
              }}
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-l-none h-9"
              onClick={() => {
                const headers = ['Bedrijfsnaam', 'Contactpersoon', 'Email', 'Telefoon', 'Adres', 'Postcode', 'Stad', 'Website', 'KvK', 'BTW', 'Status', 'Tags']
                const rows = filteredKlanten.map((k) => ({
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
                exportExcel(`klanten-${new Date().toISOString().split('T')[0]}`, headers, rows, 'Klanten')
              }}
            >
              <FileText className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </div>
        <div className="flex items-center border rounded-md bg-background">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode('grid')}
            title="Rasterweergave"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="rounded-l-none"
            onClick={() => setViewMode('list')}
            title="Lijstweergave"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter pills + Sort toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Status filter pills */}
        <div className="flex items-center gap-1.5">
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
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  statusFilter === f
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
                  ? 'text-blue-700 dark:text-blue-300 font-medium'
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

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : filteredKlanten.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3">
              <Users className="h-7 w-7 text-primary/40" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {searchQuery || statusFilter !== 'alle'
                ? 'Geen klanten gevonden'
                : 'Nog geen opdrachtgevers'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {searchQuery || statusFilter !== 'alle'
                ? 'Probeer andere zoektermen of filters.'
                : 'Voeg je eerste klant toe — winkels, horeca, bedrijven die signing nodig hebben.'}
            </p>
            {(searchQuery || statusFilter !== 'alle') && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('alle')
                }}
              >
                Filters wissen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* ==================== GRID VIEW ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredKlanten.map((klant) => (
            <ClientCard
              key={klant.id}
              klant={klant}
              projectCount={projectCounts[klant.id] || 0}
            />
          ))}
        </div>
      ) : (
        /* ==================== LIST VIEW ==================== */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                    Bedrijfsnaam
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Contactpersoon
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3 hidden xl:table-cell">
                    Telefoon
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    Stad
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                    Projecten
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredKlanten.map((klant) => (
                  <tr
                    key={klant.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/klanten/${klant.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {klant.bedrijfsnaam.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {klant.bedrijfsnaam}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {klant.contactpersoon}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {klant.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {klant.telefoon}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {klant.stad}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('capitalize text-xs', getStatusColor(klant.status))}>
                        {klant.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary" className="text-xs">
                        {projectCounts[klant.id] || 0}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add client dialog */}
      <AddEditClient
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSaved={handleClientSaved}
      />
    </div>
  )
}
