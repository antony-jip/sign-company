import { Check } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { Taak, Medewerker } from '@/types'

interface TaskChecklistViewProps {
  taken: Taak[]
  medewerkers: Medewerker[]
  onStatusChange: (taakId: string, status: Taak['status']) => void
  onTaskClick?: (taak: Taak) => void
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  todo:   { label: 'Todo',   cls: 'badge-grijs' },
  bezig:  { label: 'Bezig',  cls: 'badge-blauw' },
  review: { label: 'Review', cls: 'badge-paars' },
  klaar:  { label: 'Klaar',  cls: 'badge-petrol' },
}

// Deterministic color from name
function avatarGradient(name: string): string {
  const colors = [
    'from-[#7EB5A6] to-[#5E9586]',
    'from-[#9B8EC4] to-[#7B6EA4]',
    'from-[#C4A882] to-[#A48862]',
    'from-[#8BAFD4] to-[#6B8FB4]',
    'from-[#E8866A] to-[#C8664A]',
    'from-[#D4836A] to-[#B4634A]',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function formatDeadline(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
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
              'flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[hsl(35,15%,97%)] transition-all group cursor-pointer',
              isDone && 'opacity-30'
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
                'flex-shrink-0 rounded-md border-[1.5px] transition-all flex items-center justify-center',
                isDone
                  ? 'bg-mod-projecten border-mod-projecten text-white'
                  : 'border-sand hover:border-petrol hover:bg-mod-projecten-light'
              )}
              style={{ width: 18, height: 18 }}
            >
              {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>

            {/* Task name */}
            <span className={cn(
              'flex-1 text-[12px] font-medium truncate min-w-0',
              isDone && 'line-through text-muted-foreground'
            )}>
              {taak.titel}
            </span>

            {/* Status badge */}
            {!isDone && (
              <span className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0',
                badge.cls
              )}>
                {badge.label}
              </span>
            )}

            {/* Deadline */}
            {taak.deadline && (
              <span className={cn(
                'text-[10px] font-mono flex-shrink-0',
                isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground/40'
              )}>
                {formatDeadline(taak.deadline)}
              </span>
            )}

            {/* Assigned avatar */}
            {taak.toegewezen_aan && (
              <div
                className={`h-5 w-5 rounded-full bg-gradient-to-br ${avatarGradient(taak.toegewezen_aan)} flex items-center justify-center flex-shrink-0`}
                title={taak.toegewezen_aan}
              >
                <span className="text-white text-[7px] font-bold">{getInitials(taak.toegewezen_aan)}</span>
              </div>
            )}
          </div>
        )
      })}
      {taken.length === 0 && (
        <div className="text-center py-8 text-muted-foreground/30 text-[11px]">
          Nog geen taken
        </div>
      )}
    </div>
  )
}
