import { Check } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { Taak, Medewerker } from '@/types'

interface TaskChecklistViewProps {
  taken: Taak[]
  medewerkers: Medewerker[]
  onStatusChange: (taakId: string, status: Taak['status']) => void
  onTaskClick?: (taak: Taak) => void
}

const statusStyle: Record<string, { label: string; color: string }> = {
  todo:   { label: 'Todo',   color: '#8A7A4A' },
  bezig:  { label: 'Bezig',  color: '#3A5A9A' },
  review: { label: 'Review', color: '#6A5A8A' },
  klaar:  { label: 'Klaar',  color: '#3A7D52' },
}

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
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
}

export function TaskChecklistView({ taken, medewerkers, onStatusChange, onTaskClick }: TaskChecklistViewProps) {
  const sorted = [...taken].sort((a, b) => {
    if (a.status === 'klaar' && b.status !== 'klaar') return 1
    if (a.status !== 'klaar' && b.status === 'klaar') return -1
    return 0
  })

  const klaarCount = taken.filter(t => t.status === 'klaar').length
  const progress = taken.length > 0 ? (klaarCount / taken.length) * 100 : 0

  return (
    <div>
      {/* Progress bar */}
      {taken.length > 0 && (
        <div className="mb-3">
          <div className="h-1 rounded-full bg-[#EBEBEB] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: progress === 100 ? '#3A7D52' : '#1A535C',
              }}
            />
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {sorted.map((taak) => {
          const isDone = taak.status === 'klaar'
          const st = statusStyle[taak.status] || statusStyle.todo
          const isOverdue = taak.deadline && new Date(taak.deadline) < new Date() && !isDone

          return (
            <div
              key={taak.id}
              className={cn(
                'flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-[#F8F7F5] transition-all group cursor-pointer',
                isDone && 'opacity-35'
              )}
              onClick={() => onTaskClick?.(taak)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(taak.id, isDone ? 'todo' : 'klaar')
                }}
                className={cn(
                  'flex-shrink-0 rounded-md border-[1.5px] transition-all flex items-center justify-center',
                  isDone
                    ? 'bg-[#1A535C] border-[#1A535C] text-white'
                    : 'border-[#EBEBEB] hover:border-[#1A535C] hover:bg-[#E2F0F0]/30'
                )}
                style={{ width: 20, height: 20 }}
              >
                {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>

              <span className={cn(
                'flex-1 text-[13px] font-medium text-[#1A1A1A] truncate min-w-0',
                isDone && 'line-through !text-[#9B9B95]'
              )}>
                {taak.titel}
              </span>

              {!isDone && (
                <span className="text-[10px] font-medium flex-shrink-0" style={{ color: st.color }}>
                  {st.label}<span className="text-[#F15025]">.</span>
                </span>
              )}

              {taak.deadline && (
                <span className={cn(
                  'text-[10px] font-mono flex-shrink-0',
                  isOverdue ? 'text-[#C0451A] font-semibold' : 'text-[#9B9B95]'
                )}>
                  {formatDeadline(taak.deadline)}
                </span>
              )}

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
          <div className="text-center py-6 text-[#9B9B95] text-[12px]">
            Nog geen taken
          </div>
        )}
      </div>
    </div>
  )
}
