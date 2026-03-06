import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import type { Taak } from '@/types'
import type { SortDirection } from '@/types'

type SortField = 'titel' | 'status' | 'prioriteit' | 'toegewezen_aan' | 'deadline'

interface ProjectTasksTableProps {
  taken: Taak[]
}

const prioriteitWaarde: Record<string, number> = {
  kritiek: 4,
  hoog: 3,
  medium: 2,
  laag: 1,
}

const statusWaarde: Record<string, number> = {
  todo: 1,
  bezig: 2,
  review: 3,
  klaar: 4,
}

const statusLabels: Record<string, string> = {
  todo: 'Todo',
  bezig: 'Bezig',
  review: 'Review',
  klaar: 'Klaar',
}

export function ProjectTasksTable({ taken }: ProjectTasksTableProps) {
  const [sortField, setSortField] = useState<SortField>('deadline')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedTaken = useMemo(() => {
    return [...taken].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'titel':
          comparison = a.titel.localeCompare(b.titel, 'nl')
          break
        case 'status':
          comparison = (statusWaarde[a.status] || 0) - (statusWaarde[b.status] || 0)
          break
        case 'prioriteit':
          comparison = (prioriteitWaarde[a.prioriteit] || 0) - (prioriteitWaarde[b.prioriteit] || 0)
          break
        case 'toegewezen_aan':
          comparison = a.toegewezen_aan.localeCompare(b.toegewezen_aan, 'nl')
          break
        case 'deadline':
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [taken, sortField, sortDirection])

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

  if (taken.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">Geen taken gevonden</p>
        <p className="text-sm mt-1">Er zijn nog geen taken voor dit project.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border dark:border-border">
            {[
              { field: 'titel' as SortField, label: 'Titel' },
              { field: 'status' as SortField, label: 'Status' },
              { field: 'prioriteit' as SortField, label: 'Prioriteit' },
              { field: 'toegewezen_aan' as SortField, label: 'Toegewezen aan' },
              { field: 'deadline' as SortField, label: 'Deadline' },
            ].map(({ field, label }) => (
              <th key={field} className="text-left py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  onClick={() => handleSort(field)}
                >
                  {label}
                  <SortIcon field={field} />
                </Button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTaken.map((taak) => {
            const isOverdue = new Date(taak.deadline) < new Date() && taak.status !== 'klaar'

            return (
              <tr
                key={taak.id}
                className="border-b border-border dark:border-border hover:bg-background dark:hover:bg-foreground/80/50 transition-colors duration-150"
              >
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-sm text-foreground">{taak.titel}</p>
                    {taak.beschrijving && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {taak.beschrijving}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge className={getStatusColor(taak.status)}>
                    {statusLabels[taak.status] || taak.status}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge className={getPriorityColor(taak.prioriteit)}>
                    {taak.prioriteit.charAt(0).toUpperCase() + taak.prioriteit.slice(1)}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-foreground">{taak.toegewezen_aan}</span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-sm ${
                      isOverdue
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : 'text-foreground'
                    }`}
                  >
                    {formatDate(taak.deadline)}
                    {isOverdue && (
                      <span className="ml-1 text-xs text-red-500">(verlopen)</span>
                    )}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
