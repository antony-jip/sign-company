import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Search, LayoutGrid, List, Loader2 } from 'lucide-react'
import { cn, getStatusColor } from '@/lib/utils'
import { getKlanten, getProjecten, deleteKlant } from '@/services/supabaseService'
import type { Klant, Project } from '@/types'
import { ClientCard } from './ClientCard'
import { AddEditClient } from './AddEditClient'

type ViewMode = 'grid' | 'list'
type StatusFilter = 'alle' | 'actief' | 'inactief' | 'prospect'

export function ClientsLayout() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([getKlanten(), getProjecten()])
      .then(([k, p]) => {
        setKlanten(k)
        setProjecten(p)
      })
      .catch(console.error)
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

  // Filtered clients
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

    return result
  }, [klanten, searchQuery, statusFilter])

  function handleClientSaved(klant: Klant) {
    setAddDialogOpen(false)
    toast.success(`Klant "${klant.bedrijfsnaam}" opgeslagen`)
    fetchData()
  }

  async function handleDeleteClient(id: string) {
    try {
      await deleteKlant(id)
      toast.success('Klant verwijderd')
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Fout bij verwijderen van klant')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
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

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Zoek op naam, email, stad, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            <SelectItem value="actief">Actief</SelectItem>
            <SelectItem value="inactief">Inactief</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filteredKlanten.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {searchQuery || statusFilter !== 'alle'
                ? 'Geen klanten gevonden met de huidige filters.'
                : 'Nog geen klanten toegevoegd.'}
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
