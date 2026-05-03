import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  format,
  parseISO,
  isValid,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string | undefined | null
  onChange: (value: string) => void
  trigger: React.ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  contentClassName?: string
  weekStartsOn?: 0 | 1
}

export function DatePicker({
  value,
  onChange,
  trigger,
  align = 'start',
  side = 'bottom',
  contentClassName,
  weekStartsOn = 1,
}: DatePickerProps) {
  const selected = value ? parseISO(value) : null
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    selected && isValid(selected) ? startOfMonth(selected) : startOfMonth(today),
  )

  useEffect(() => {
    if (open && selected && isValid(selected)) {
      setViewMonth(startOfMonth(selected))
    }
  }, [open, value])

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const weekDayLabels = (() => {
    const base = startOfWeek(today, { weekStartsOn })
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return format(d, 'EEEEE', { locale: nl })
    })
  })()

  const handleSelect = (d: Date) => {
    onChange(format(d, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleToday = () => {
    onChange(format(today, 'yyyy-MM-dd'))
    setViewMonth(startOfMonth(today))
    setOpen(false)
  }

  const monthLabel = format(viewMonth, 'LLLL yyyy', { locale: nl })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className={cn('w-[268px] p-3 rounded-xl border-[#E0DED8] shadow-lg', contentClassName)}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold text-[#1A1A1A] capitalize">{monthLabel}</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, -1))}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[#6B6B66] hover:bg-[#F3F2F0] transition-colors"
              aria-label="Vorige maand"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="h-7 px-2 inline-flex items-center text-[11px] font-medium rounded-md text-[#6B6B66] hover:text-[#1A535C] hover:bg-[#1A535C]/[0.06] transition-colors"
            >
              Vandaag
            </button>
            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[#6B6B66] hover:bg-[#F3F2F0] transition-colors"
              aria-label="Volgende maand"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {weekDayLabels.map((label, i) => (
            <div
              key={i}
              className="text-[10px] font-medium text-[#9B9B95] uppercase text-center py-1"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d) => {
            const inMonth = isSameMonth(d, viewMonth)
            const isToday = isSameDay(d, today)
            const isSelected = !!(selected && isValid(selected) && isSameDay(d, selected))
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => handleSelect(d)}
                className={cn(
                  'h-8 rounded-md text-[12px] tabular-nums transition-colors flex items-center justify-center',
                  isSelected
                    ? 'bg-[#1A535C] text-white font-semibold hover:bg-[#1A535C]/90'
                    : !inMonth
                      ? 'text-[#C5C2BD] hover:bg-[#F8F7F5]'
                      : isToday
                        ? 'text-[#1A535C] font-semibold ring-1 ring-inset ring-[#1A535C]/30 hover:bg-[#1A535C]/[0.06]'
                        : 'text-[#1A1A1A] hover:bg-[#F3F2F0]',
                )}
              >
                {format(d, 'd')}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
