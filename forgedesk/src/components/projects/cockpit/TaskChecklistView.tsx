import { Check } from 'lucide-react'
import { cn, formatDate, getInitials } from '@/lib/utils'
import type { Taak, Medewerker } from '@/types'

interface TaskChecklistViewProps {
  taken: Taak[]
  medewerkers: Medewerker[]
  onStatusChange: (taakId: string, status: Taak['status']) => void
  onTaskClick?: (taak: Taak) => void
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  todo: { label: 'Todo', cls: 'bg-cream/60 text-cream-deep' },
  bezig: { label: 'Bezig', cls: 'bg-mist/60 text-mist-deep' },
  review: { label: 'Review', cls: 'bg-amber-100 text-amber-700' },
  klaar: { label: 'Klaar', cls: 'bg-sage/60 text-sage-deep' },
}

export function TaskChecklistView({ taken, medewerkers, onStatusChange, onTaskClick }: TaskChecklistViewProps) {
  // Sort: incomplete first (by priority), then completed
  const sorted = [...taken].sort((a, b) => {
    if (a.status === 'klaar' && b.status !== 'klaar') return 1
    if (a.status !== 'klaar' && b.status === 'klaar') return -1
    return 0
  })

  return (
    <div className="space-y-0.5">
      {sorted.map((taak) => {
        const isDone = taak.status === 'klaar'
        const badge = statusBadge[taak.status] || statusBadge.todo
        const isOverdue = taak.deadline && new Date(taak.deadline) < new Date() && !isDone

        return (
          <div
            key={taak.id}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(35,15%,97%)] transition-all duration-200 group cursor-pointer',
              isDone && 'opacity-35'
            )}
            onClick={() => onTaskClick?.(taak)}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange(taak.id, isDone ? 'todo' : 'klaar')
              }}
              className={cn(
                'flex-shrink-0 rounded border-2 transition-all duration-200 flex items-center justify-center',
                isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white scale-100'
                  : 'border-[hsl(35,15%,80%)] hover:border-emerald-400 hover:bg-emerald-50'
              )}
              style={{ width: 18, height: 18 }}
            >
              {isDone && <Check className="h-3 w-3" />}
            </button>

            {/* Task name */}
            <span className={cn(
              'flex-1 text-sm font-medium truncate min-w-0 transition-colors duration-200',
              isDone && 'line-through text-muted-foreground'
            )}>
              {taak.titel}
            </span>

            {/* Status badge */}
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold flex-shrink-0 transition-opacity',
              badge.cls
            )}>
              {badge.label}
            </span>

            {/* Deadline */}
            <span className={cn(
              'text-xs font-mono flex-shrink-0 w-16 text-right',
              isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground/50'
            )}>
              {taak.deadline ? formatDate(taak.deadline) : '—'}
            </span>

            {/* Assigned avatar */}
            <div className="flex-shrink-0 w-6">
              {taak.toegewezen_aan ? (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm" title={taak.toegewezen_aan}>
                  <span className="text-white text-[8px] font-bold">{getInitials(taak.toegewezen_aan)}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/25">—</span>
              )}
            </div>

            {/* Hours */}
            <span className="text-xs font-mono text-muted-foreground/50 flex-shrink-0 w-14 text-right">
              {(taak.bestede_tijd || 0) > 0 || (taak.geschatte_tijd || 0) > 0
                ? `${taak.bestede_tijd || 0}/${taak.geschatte_tijd || 0}u`
                : '—'
              }
            </span>
          </div>
        )
      })}
      {taken.length === 0 && (
        <div className="text-center py-10 text-muted-foreground/35 text-sm">
          Nog geen taken
        </div>
      )}
    </div>
  )
}
