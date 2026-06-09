import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
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
  startOfDay,
  getISOWeek,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string | undefined | null
  onChange: (value: string) => void
  /** Custom trigger node. Mutually exclusive with `asInput`. */
  trigger?: React.ReactNode
  /** Render a default trigger styled like the app's <Input>. */
  asInput?: boolean
  /** Placeholder text when no date selected (asInput mode). */
  placeholder?: string
  /** className for the asInput trigger button. */
  className?: string
  /** Disable the trigger (asInput mode). */
  disabled?: boolean
  /** Minimum selectable date (YYYY-MM-DD). */
  min?: string
  /** Maximum selectable date (YYYY-MM-DD). */
  max?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  contentClassName?: string
  weekStartsOn?: 0 | 1
}

export function DatePicker({
  value,
  onChange,
  trigger,
  asInput,
  placeholder = 'Kies datum',
  className,
  disabled,
  min,
  max,
  align = 'start',
  side = 'bottom',
  contentClassName,
  weekStartsOn = 1,
}: DatePickerProps) {
  const selected = value ? parseISO(value) : null
  const minDate = min ? startOfDay(parseISO(min)) : null
  const maxDate = max ? startOfDay(parseISO(max)) : null
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
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  const weekDayLabels = (() => {
    const base = startOfWeek(today, { weekStartsOn })
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return format(d, 'EEEEEE', { locale: nl })
    })
  })()

  const isOutOfRange = (d: Date): boolean => {
    const day = startOfDay(d)
    if (minDate && day < minDate) return true
    if (maxDate && day > maxDate) return true
    return false
  }

  const handleSelect = (d: Date) => {
    if (isOutOfRange(d)) return
    onChange(format(d, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleToday = () => {
    if (isOutOfRange(today)) {
      setViewMonth(startOfMonth(today))
      return
    }
    onChange(format(today, 'yyyy-MM-dd'))
    setViewMonth(startOfMonth(today))
    setOpen(false)
  }

  const monthLabel = format(viewMonth, 'LLLL yyyy', { locale: nl })
  const displayValue = selected && isValid(selected)
    ? format(selected, 'd MMM yyyy', { locale: nl })
    : ''
  const footerLabel = selected && isValid(selected)
    ? format(selected, 'EEE d MMMM yyyy', { locale: nl })
    : ''
  const numberFont = { fontFamily: 'Inter, system-ui, sans-serif' }

  const renderedTrigger = trigger ?? (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3.5 py-2.5 text-[13px] ring-offset-background transition-all duration-150 hover:border-text-tertiary/50 focus-visible:outline-none focus-visible:border-petrol dark:focus-visible:border-petrol-light focus-visible:ring-2 focus-visible:ring-petrol/[0.12] focus-visible:shadow-[0_0_0_2px_rgba(26,83,92,0.12)] disabled:cursor-not-allowed disabled:opacity-50',
        !displayValue && 'text-muted-foreground',
        asInput && className,
      )}
    >
      <span className="truncate">{displayValue || placeholder}</span>
      <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
    </button>
  )

  return (
    <Popover open={open} onOpenChange={(o) => { if (disabled && o) return; setOpen(o) }}>
      <PopoverTrigger asChild>{renderedTrigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn('w-[280px] p-3 rounded-2xl border-border shadow-lg', contentClassName)}
      >
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-heading font-bold lowercase tracking-tight text-[16px] leading-none text-foreground">
            {monthLabel}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, -1))}
              className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] hover:text-foreground transition-colors"
              aria-label="Vorige maand"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="h-7 px-2.5 inline-flex items-center rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] hover:text-foreground transition-colors"
            >
              vandaag
            </button>
            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] hover:text-foreground transition-colors"
              aria-label="Volgende maand"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[24px_repeat(7,1fr)] gap-0.5 mb-1">
          <div className="text-[10px] font-medium text-muted-foreground/50 text-center self-center">wk</div>
          {weekDayLabels.map((label, i) => (
            <div
              key={i}
              className="text-[11px] font-medium text-muted-foreground text-center"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="space-y-0.5">
          {weeks.map((week) => (
            <div key={week[0].toISOString()} className="grid grid-cols-[24px_repeat(7,1fr)] gap-0.5">
              <div className="flex items-center justify-center text-[10px] font-mono tabular-nums text-muted-foreground/45">
                {getISOWeek(week[0])}
              </div>
              {week.map((d) => {
                const inMonth = isSameMonth(d, viewMonth)
                const isToday = isSameDay(d, today)
                const isSelected = !!(selected && isValid(selected) && isSameDay(d, selected))
                const outOfRange = isOutOfRange(d)
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => handleSelect(d)}
                    disabled={outOfRange}
                    className={cn(
                      'group relative box-border min-w-0 appearance-none h-8 rounded-lg flex items-center justify-center transition-colors',
                      outOfRange
                        ? 'text-muted-foreground/35 cursor-not-allowed'
                        : isSelected
                          ? 'bg-petrol text-white font-medium dark:bg-petrol-light dark:text-petrol'
                          : isToday
                            ? 'text-[#F15025] font-semibold hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06]'
                            : !inMonth
                              ? 'text-muted-foreground/40 hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06]'
                              : 'text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06]',
                    )}
                  >
                    <span className="text-[13px] leading-none tabular-nums" style={numberFont}>
                      {format(d, 'd')}
                    </span>
                    {isToday && (
                      <span
                        aria-hidden
                        className={cn(
                          'absolute bottom-1 h-1 w-1 rounded-full',
                          isSelected ? 'bg-white dark:bg-petrol' : 'bg-[#F15025]',
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {footerLabel && (
          <div className="mt-2.5 pt-2.5 border-t border-border">
            <span className="text-[12px] font-medium text-petrol dark:text-petrol-light">
              {footerLabel}<span className="text-primary"> .</span>
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
