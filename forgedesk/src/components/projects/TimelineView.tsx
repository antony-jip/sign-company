import React, { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils'
import type { Taak } from '@/types'

interface TimelineViewProps {
  taken: Taak[]
  projectStart: string
  projectEind: string
}

const statusKleuren: Record<string, string> = {
  todo: 'bg-muted-foreground/40 dark:bg-muted-foreground',
  bezig: 'bg-blue-500 dark:bg-blue-400',
  review: 'bg-yellow-500 dark:bg-yellow-400',
  klaar: 'bg-green-500 dark:bg-green-400',
}

const statusLabels: Record<string, string> = {
  todo: 'Todo',
  bezig: 'Bezig',
  review: 'Review',
  klaar: 'Klaar',
}

export function TimelineView({ taken, projectStart, projectEind }: TimelineViewProps) {
  const timeline = useMemo(() => {
    const start = new Date(projectStart).getTime()
    const eind = new Date(projectEind).getTime()
    const totalDuur = eind - start

    if (totalDuur <= 0) return { maanden: [], taken: [], start, eind, totalDuur }

    // Generate month labels for the x-axis
    const maanden: { label: string; positie: number }[] = []
    const startDatum = new Date(projectStart)
    const eindDatum = new Date(projectEind)

    const currentMonth = new Date(startDatum.getFullYear(), startDatum.getMonth(), 1)
    while (currentMonth <= eindDatum) {
      const monthStart = Math.max(currentMonth.getTime(), start)
      const positie = ((monthStart - start) / totalDuur) * 100

      maanden.push({
        label: currentMonth.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' }),
        positie: Math.min(positie, 100),
      })

      currentMonth.setMonth(currentMonth.getMonth() + 1)
    }

    // Compute bar positions for each task
    const takenBars = taken.map((taak) => {
      const taakStart = new Date(taak.created_at).getTime()
      const taakEind = new Date(taak.deadline ?? "").getTime()

      const left = Math.max(0, ((taakStart - start) / totalDuur) * 100)
      const right = Math.min(100, ((taakEind - start) / totalDuur) * 100)
      const width = Math.max(right - left, 1) // Minimum 1% width for visibility

      return {
        ...taak,
        left,
        width,
      }
    })

    return { maanden, taken: takenBars, start, eind, totalDuur }
  }, [taken, projectStart, projectEind])

  if (taken.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">Geen taken om weer te geven</p>
        <p className="text-sm mt-1">Voeg taken toe om de tijdlijn te vullen.</p>
      </div>
    )
  }

  // Today marker position
  const todayTime = new Date().getTime()
  const todayPositie =
    timeline.totalDuur > 0
      ? ((todayTime - timeline.start) / timeline.totalDuur) * 100
      : -1

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(statusKleuren).map(([status, kleur]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${kleur}`} />
            <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>
          </div>
        ))}
      </div>

      {/* Timeline chart */}
      <div className="border border-border dark:border-border rounded-lg overflow-hidden">
        {/* Month headers */}
        <div className="relative h-8 bg-background dark:bg-foreground/80/50 border-b border-border dark:border-border">
          {timeline.maanden.map((maand, index) => (
            <div
              key={index}
              className="absolute top-0 h-full flex items-center border-l border-border dark:border-border px-2"
              style={{ left: `${maand.positie}%` }}
            >
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {maand.label}
              </span>
            </div>
          ))}
        </div>

        {/* Task bars */}
        <div className="relative">
          {timeline.taken.map((taak, index) => (
            <div
              key={taak.id}
              className="relative h-10 border-b border-border dark:border-border last:border-b-0 group hover:bg-background dark:hover:bg-foreground/80/30 transition-colors duration-150"
            >
              {/* Month grid lines */}
              {timeline.maanden.map((maand, mi) => (
                <div
                  key={mi}
                  className="absolute top-0 h-full border-l border-border dark:border-border"
                  style={{ left: `${maand.positie}%` }}
                />
              ))}

              {/* Task bar */}
              <div
                className="absolute top-1.5 h-7 flex items-center rounded-md shadow-sm cursor-default"
                style={{
                  left: `${taak.left}%`,
                  width: `${taak.width}%`,
                  minWidth: '20px',
                }}
              >
                <div
                  className={`w-full h-full rounded-md ${
                    statusKleuren[taak.status] || 'bg-muted-foreground/40'
                  } opacity-80 hover:opacity-100 transition-opacity duration-150`}
                />
                {/* Label overlay */}
                <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate pointer-events-none drop-shadow-sm">
                  {taak.width > 8 ? taak.titel : ''}
                </span>
              </div>

              {/* Tooltip on hover */}
              <div className="absolute left-0 top-full z-20 hidden group-hover:block bg-card border border-border dark:border-border rounded-lg shadow-lg p-3 min-w-[200px] pointer-events-none">
                <p className="font-medium text-sm text-foreground">{taak.titel}</p>
                <div className="mt-1.5 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(taak.created_at)} - {formatDate(taak.deadline ?? "")}
                  </p>
                  <div className="flex gap-1.5">
                    <Badge className={`${getStatusColor(taak.status)} text-[10px] px-1.5 py-0`}>
                      {statusLabels[taak.status]}
                    </Badge>
                    <Badge className={`${getPriorityColor(taak.prioriteit)} text-[10px] px-1.5 py-0`}>
                      {taak.prioriteit}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{taak.toegewezen_aan}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Today marker */}
          {todayPositie >= 0 && todayPositie <= 100 && (
            <div
              className="absolute top-0 h-full w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: `${todayPositie}%` }}
            >
              <div className="absolute -top-6 -translate-x-1/2 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                Vandaag
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task list under timeline */}
      <div className="space-y-1">
        {timeline.taken.map((taak, index) => (
          <div
            key={taak.id}
            className="flex items-center gap-3 py-1 px-2 text-sm"
          >
            <div
              className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${
                statusKleuren[taak.status] || 'bg-muted-foreground/40'
              }`}
            />
            <span className="text-foreground font-medium flex-1 truncate">{taak.titel}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {taak.toegewezen_aan}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(taak.deadline ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
