import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Check, ChevronDown, Search, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Medewerker } from '@/types'

const AVATAR_PALETTE = [
  { bg: '#E8F2EC', text: '#3A7D52' },
  { bg: '#E8EEF9', text: '#3A5A9A' },
  { bg: '#F5F2E8', text: '#8A7A4A' },
  { bg: '#F0EFEC', text: '#6B6B66' },
  { bg: '#EDE8F4', text: '#6A5A8A' },
]

function getInitials(naam: string): string {
  return naam.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarStyle(index: number) {
  const p = AVATAR_PALETTE[index % AVATAR_PALETTE.length]
  return { backgroundColor: p.bg, color: p.text }
}

interface Props {
  medewerkers: Medewerker[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allLabel?: string
  className?: string
}

export function MedewerkerFilterCombobox({
  medewerkers,
  value,
  onChange,
  placeholder = 'Zoek medewerker…',
  allLabel = 'Iedereen',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const actief = useMemo(
    () => medewerkers.filter((m) => m.status === 'actief'),
    [medewerkers]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actief
    return actief.filter((m) => m.naam.toLowerCase().includes(q))
  }, [actief, query])

  const selected = actief.find((m) => m.naam === value)
  const selectedIndex = selected ? actief.findIndex((m) => m.id === selected.id) : -1

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery('') }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'h-7 inline-flex items-center gap-1.5 rounded-md border border-[#E0DED8] bg-white px-2 text-[13px] text-[#6B6B66] hover:border-[#1A535C]/40 focus:outline-none focus:border-[#1A535C]/40 transition-colors',
            className
          )}
        >
          {selected ? (
            <>
              <span
                className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={getAvatarStyle(selectedIndex)}
              >
                {getInitials(selected.naam)}
              </span>
              <span className="truncate max-w-[100px]">{selected.naam}</span>
            </>
          ) : (
            <>
              <Users className="h-3.5 w-3.5 text-[#9B9B95]" />
              <span>{allLabel}</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 text-[#9B9B95]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9B95]" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-8 pl-7 text-[13px]"
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto -mx-1 px-1">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className={cn(
              'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-left hover:bg-[#F3F2F0] transition-colors',
              value === '' && 'bg-[#1A535C]/[0.06] text-[#1A535C] font-semibold'
            )}
          >
            <Users className="h-4 w-4 text-[#9B9B95]" />
            <span className="flex-1">{allLabel}</span>
            {value === '' && <Check className="h-3.5 w-3.5 text-[#1A535C]" />}
          </button>
          {filtered.length === 0 && query && (
            <div className="px-2 py-6 text-center text-[12px] text-[#9B9B95]">Geen resultaat</div>
          )}
          {filtered.map((m) => {
            const idx = actief.findIndex((x) => x.id === m.id)
            const isSelected = m.naam === value
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m.naam); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-left hover:bg-[#F3F2F0] transition-colors',
                  isSelected && 'bg-[#1A535C]/[0.06] text-[#1A535C] font-semibold'
                )}
              >
                <span
                  className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={getAvatarStyle(idx)}
                >
                  {getInitials(m.naam)}
                </span>
                <span className="flex-1 truncate">{m.naam}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#1A535C]" />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
