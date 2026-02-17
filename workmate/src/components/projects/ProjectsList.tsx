import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, FolderKanban } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getPriorityColor,
} from '@/lib/utils'
import { mockProjecten, mockKlanten } from '@/data/mockData'
import type { SortDirection } from '@/types'

type SortField = 'naam' | 'deadline' | 'budget' | 'voortgang' | 'status'

const statusOpties = [
  { value: 'alle', label: 'Alle statussen' },
  { value: 'gepland', label: 'Gepland' },
  { value: 'actief', label: 'Actief' },
  { value: 'in-review', label: 'In review' },
  { value: 'afgerond', label: 'Afgerond' },
  { value: 'on-hold', label: 'On-hold' },
]

const prioriteitOpties = [
  { value: 'alle', label: 'Alle prioriteiten' },
  { value: 'laag', label: 'Laag' },
  { value: 'medium', label: 'Medium' },
  { value: 'hoog', label: 'Hoog' },
  { value: 'kritiek', label: 'Kritiek' },
]

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
}

const statusWaarde: Record<string, number> = {
  'on-hold': 1,
  gepland: 2,
  actief: 3,
  'in-review': 4,
  afgerond: 5,
}

function getKlantNaam(klantId: string): string {
  const klant = mockKlanten.find((k) => k.id === klantId)
  return klant ? klant.bedrijfsnaam : 'Onbekend'
}

export function ProjectsList() {
  const [zoekterm, setZoekterm] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [prioriteitFilter, setPrioriteitFilter] = useState('alle')
  const [sortField, setSortField] = useState<SortField>('naam')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const gefilterdeProjecten = useMemo(() => {
    let projecten = [...mockProjecten]

    // Search filter
    if (zoekterm.trim()) {
      const term = zoekterm.toLowerCase()
      projecten = projecten.filter(
        (p) =>
          p.naam.toLowerCase().includes(term) ||
          getKlantNaam(p.klant_id).toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== 'alle') {
      projecten = projecten.filter((p) => p.status === statusFilter)
    }

    // Priority filter
    if (prioriteitFilter !== 'alle') {
      projecten = projecten.filter((p) => p.prioriteit === prioriteitFilter)
    }

    // Sorting
    projecten.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'naam':
          comparison = a.naam.localeCompare(b.naam, 'nl')
          break
        case 'deadline':
          comparison = new Date(a.eind_datum).getTime() - new Date(b.eind_datum).getTime()
          break
        case 'budget':
          comparison = a.budget - b.budget
          break
        case 'voortgang':
          comparison = a.voortgang - b.voortgang
          break
        case 'status':
          comparison = (statusWaarde[a.status] || 0) - (statusWaarde[b.status] || 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return projecten
  }, [zoekterm, statusFilter, prioriteitFilter, sortField, sortDirection])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projecten</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {gefilterdeProjecten.length} van {mockProjecten.length} projecten
          </p>
        </div>
        <Button asChild>
          <Link to="/projecten/nieuw">
            <Plus className="mr-2 h-4 w-4" />
            Nieuw Project
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op projectnaam of klant..."
                value={zoekterm}
                onChange={(e) => setZoekterm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOpties.map((optie) => (
                  <SelectItem key={optie.value} value={optie.value}>
                    {optie.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={prioriteitFilter} onValueChange={setPrioriteitFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Prioriteit" />
              </SelectTrigger>
              <SelectContent>
                {prioriteitOpties.map((optie) => (
                  <SelectItem key={optie.value} value={optie.value}>
                    {optie.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {gefilterdeProjecten.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h3 className="text-lg font-medium text-foreground">Geen projecten gevonden</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Pas je zoekcriteria aan of maak een nieuw project aan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="text-left py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort('naam')}
                    >
                      Naam
                      <SortIcon field="naam" />
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Klant
                    </span>
                  </th>
                  <th className="text-left py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      <SortIcon field="status" />
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort('voortgang')}
                    >
                      Voortgang
                      <SortIcon field="voortgang" />
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort('deadline')}
                    >
                      Deadline
                      <SortIcon field="deadline" />
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4 hidden xl:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort('budget')}
                    >
                      Budget
                      <SortIcon field="budget" />
                    </Button>
                  </th>
                  <th className="text-left py-3 px-4 hidden sm:table-cell">
                    <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Prioriteit
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {gefilterdeProjecten.map((project) => {
                  const klantNaam = project.klant_naam || getKlantNaam(project.klant_id)
                  const isOverdue =
                    new Date(project.eind_datum) < new Date() && project.status !== 'afgerond'

                  return (
                    <tr
                      key={project.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                    >
                      {/* Naam */}
                      <td className="py-3 px-4">
                        <Link
                          to={`/projecten/${project.id}`}
                          className="font-medium text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors duration-150"
                        >
                          {project.naam}
                        </Link>
                      </td>

                      {/* Klant */}
                      <td className="py-3 px-4">
                        <span className="text-sm text-foreground">{klantNaam}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(project.status)}>
                          {statusLabels[project.status] || project.status}
                        </Badge>
                      </td>

                      {/* Voortgang */}
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={project.voortgang} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground font-medium w-8 text-right">
                            {project.voortgang}%
                          </span>
                        </div>
                      </td>

                      {/* Deadline */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span
                          className={`text-sm ${
                            isOverdue
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-foreground'
                          }`}
                        >
                          {formatDate(project.eind_datum)}
                          {isOverdue && (
                            <span className="block text-xs text-red-500 mt-0.5">Verlopen</span>
                          )}
                        </span>
                      </td>

                      {/* Budget */}
                      <td className="py-3 px-4 hidden xl:table-cell">
                        <span className="text-sm text-foreground font-medium">
                          {formatCurrency(project.budget)}
                        </span>
                      </td>

                      {/* Prioriteit */}
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <Badge className={getPriorityColor(project.prioriteit)}>
                          {project.prioriteit.charAt(0).toUpperCase() +
                            project.prioriteit.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
