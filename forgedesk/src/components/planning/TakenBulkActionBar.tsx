import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Search,
  Trash2,
  User2,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Medewerker, Taak } from '@/types'

type TaakStatus = Taak['status']

interface Props {
  count: number
  medewerkers: Medewerker[]
  busy: boolean
  onMove: (newDate: string) => void | Promise<void>
  onAssign: (naam: string) => void | Promise<void>
  onStatus: (status: TaakStatus) => void | Promise<void>
  onDelete: () => void
  onClear: () => void
}

const STATUS_OPTIONS: { value: TaakStatus; label: string; dot: string }[] = [
  { value: 'todo', label: 'Todo', dot: '#B0ADA8' },
  { value: 'bezig', label: 'Bezig', dot: '#4A7AC7' },
  { value: 'review', label: 'Review', dot: '#C49A30' },
  { value: 'klaar', label: 'Klaar', dot: '#3A7D52' },
]

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function TakenBulkActionBar({
  count,
  medewerkers,
  busy,
  onMove,
  onAssign,
  onStatus,
  onDelete,
  onClear,
}: Props) {
  const [moveOpen, setMoveOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [moveDate, setMoveDate] = useState('')
  const [assignQuery, setAssignQuery] = useState('')

  const actief = useMemo(
    () => medewerkers.filter((m) => m.status === 'actief'),
    [medewerkers]
  )

  const filteredMedewerkers = useMemo(() => {
    const q = assignQuery.trim().toLowerCase()
    if (!q) return actief
    return actief.filter((m) => m.naam.toLowerCase().includes(q))
  }, [actief, assignQuery])

  async function submitMove(date: string) {
    if (!date) return
    setMoveOpen(false)
    setMoveDate('')
    await onMove(date)
  }

  async function submitAssign(naam: string) {
    setAssignOpen(false)
    setAssignQuery('')
    await onAssign(naam)
  }

  async function submitStatus(status: TaakStatus) {
    setStatusOpen(false)
    await onStatus(status)
  }

  const today = new Date()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)

  const barButtonClass = 'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-white ring-1 ring-[#1A535C]/20 text-[#1A535C] hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="flex-shrink-0 bg-[#1A535C]/[0.06] ring-1 ring-[#1A535C]/10 px-5 py-2.5 flex items-center gap-3">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-[#1A535C] text-white flex items-center justify-center text-xs font-bold">{count}</span>
        <span className="text-sm font-semibold text-[#1A535C]">
          {count} taak{count === 1 ? '' : 'en'} geselecteerd
        </span>
      </div>
      <div className="flex-1" />

      <Popover open={moveOpen} onOpenChange={(o) => { setMoveOpen(o); if (!o) setMoveDate('') }}>
        <PopoverTrigger asChild>
          <button disabled={busy} className={barButtonClass}>
            <CalendarIcon className="w-3 h-3" />
            Verplaatsen
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-3">
          <div className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-wider mb-2">Nieuwe deadline</div>
          <div className="flex flex-col gap-1 mb-3">
            <button onClick={() => submitMove(toDateStr(today))} className="text-left text-[13px] px-2 py-1.5 rounded-md hover:bg-[#F3F2F0] transition-colors">Vandaag</button>
            <button onClick={() => submitMove(toDateStr(tomorrow))} className="text-left text-[13px] px-2 py-1.5 rounded-md hover:bg-[#F3F2F0] transition-colors">Morgen</button>
            <button onClick={() => submitMove(toDateStr(nextWeek))} className="text-left text-[13px] px-2 py-1.5 rounded-md hover:bg-[#F3F2F0] transition-colors">Volgende week</button>
          </div>
          <div className="pt-2 border-t border-[#F0EFEC]">
            <Input
              type="date"
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
              className="h-8 text-[13px]"
            />
            <button
              onClick={() => submitMove(moveDate)}
              disabled={!moveDate}
              className="mt-2 w-full h-8 rounded-md bg-[#1A535C] text-white text-[12px] font-semibold hover:bg-[#1A535C]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Toepassen
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={assignOpen} onOpenChange={(o) => { setAssignOpen(o); if (!o) setAssignQuery('') }}>
        <PopoverTrigger asChild>
          <button disabled={busy} className={barButtonClass}>
            <User2 className="w-3 h-3" />
            Toewijzen
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9B95]" />
            <Input
              autoFocus
              value={assignQuery}
              onChange={(e) => setAssignQuery(e.target.value)}
              placeholder="Zoek medewerker…"
              className="h-8 pl-7 text-[13px]"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto -mx-1 px-1">
            <button
              onClick={() => submitAssign('')}
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-left hover:bg-[#F3F2F0] transition-colors"
            >
              <Users className="h-4 w-4 text-[#9B9B95]" />
              <span>Niet toegewezen</span>
            </button>
            {filteredMedewerkers.length === 0 && assignQuery && (
              <div className="px-2 py-6 text-center text-[12px] text-[#9B9B95]">Geen resultaat</div>
            )}
            {filteredMedewerkers.map((m) => (
              <button
                key={m.id}
                onClick={() => submitAssign(m.naam)}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-left hover:bg-[#F3F2F0] transition-colors"
              >
                <span className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 bg-[#F0EFEC] text-[#6B6B66]">
                  {m.naam.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                </span>
                <span className="flex-1 truncate">{m.naam}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={statusOpen} onOpenChange={setStatusOpen}>
        <PopoverTrigger asChild>
          <button disabled={busy} className={barButtonClass}>
            <CheckCircle2 className="w-3 h-3" />
            Status
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => submitStatus(opt.value)}
              className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-left hover:bg-[#F3F2F0] transition-colors"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.dot }} />
              <span>{opt.label}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <button
        onClick={onDelete}
        disabled={busy}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-white ring-1 ring-[#C03A18]/20 text-[#C03A18] hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Trash2 className="w-3 h-3" />
        Verwijderen
      </button>
      <button onClick={onClear} className="p-1.5 rounded-lg text-[#1A535C] hover:bg-white/40 transition-all" title="Deselecteer alles">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
