import type { Project } from '@/types'

const FASES = [
  { key: 'gepland', label: 'Gepland' },
  { key: 'actief', label: 'Actief' },
  { key: 'in-review', label: 'Review' },
  { key: 'te-factureren', label: 'Factureren' },
  { key: 'afgerond', label: 'Afgerond' },
] as const

const FASE_COLORS: Record<string, string> = {
  gepland: '#8A7A4A',
  actief: '#1A535C',
  'in-review': '#3A6B8C',
  'te-factureren': '#2D6B48',
  afgerond: '#1A535C',
}

function faseIndex(status: string): number {
  const idx = FASES.findIndex(f => f.key === status)
  if (idx >= 0) return idx
  if (status === 'te-plannen') return 0
  if (status === 'on-hold') return 1
  if (status === 'gefactureerd') return 4
  return 1
}

interface ProjectFaseBarProps {
  status: Project['status']
  onStatusChange: (status: Project['status']) => void
}

export function ProjectFaseBar({ status, onStatusChange }: ProjectFaseBarProps) {
  const currentIdx = faseIndex(status)

  return (
    <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)] px-5 py-4">
      <div className="flex items-center gap-1">
        {FASES.map((fase, i) => {
          const isActive = i === currentIdx
          const isPast = i < currentIdx
          const color = FASE_COLORS[fase.key] || '#6B6B66'

          return (
            <button
              key={fase.key}
              onClick={() => onStatusChange(fase.key as Project['status'])}
              className="flex-1 group relative"
            >
              {/* Bar segment */}
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: isPast || isActive ? color : '#EBEBEB',
                  opacity: isPast ? 0.4 : 1,
                }}
              />
              {/* Label */}
              <p
                className="text-[10px] mt-1.5 text-center transition-colors truncate"
                style={{
                  color: isActive ? color : isPast ? '#9B9B95' : '#9B9B95',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {fase.label}
                {isActive && <span className="text-[#F15025]">.</span>}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
