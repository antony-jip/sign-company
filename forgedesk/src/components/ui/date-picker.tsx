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
  const monoFont = { fontFamily: '"DM Mono", ui-monospace, monospace' }

  const renderedTrigger = trigger ?? (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3.5 py-2.5 text-[13px] ring-offset-background transition-all duration-150 hover:border-text-tertiary/50 focus-visible:outline-none focus-visible:border-[#1A535C] focus-visible:ring-2 focus-visible:ring-[rgba(26,83,92,0.12)] focus-visible:shadow-[0_0_0_2px_rgba(26,83,92,0.12)] disabled:cursor-not-allowed disabled:opacity-50',
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
        className={cn('w-[356px] p-4 rounded-2xl border-border shadow-lg', contentClassName)}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-heading font-extrabold lowercase tracking-tight text-[22px] leading-none text-foreground">
            {monthLabel}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, -1))}
              className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-border text-foreground/70 hover:bg-primary/10 hover:text-foreground transition-colors"
              aria-label="Vorige maand"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="h-9 px-4 inline-flex items-center rounded-xl border border-border text-[13px] font-medium text-foreground/80 hover:bg-primary/10 hover:text-foreground transition-colors"
            >
              vandaag
            </button>
            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-border text-foreground/70 hover:bg-primary/10 hover:text-foreground transition-colors"
              aria-label="Volgende maand"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {weekDayLabels.map((label, i) => (
            <div
              key={i}
              className="text-[12px] font-medium text-muted-foreground text-center"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
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
                  'group relative box-border min-w-0 appearance-none h-10 rounded-lg border flex items-center justify-center transition-colors',
                  outOfRange
                    ? 'border-border/50 text-muted-foreground/40 cursor-not-allowed'
                    : isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isToday
                        ? 'border-border text-primary hover:bg-primary hover:text-primary-foreground'
                        : !inMonth
                          ? 'border-border text-muted-foreground/50 hover:bg-primary/10'
                          : 'border-border text-foreground hover:bg-primary/10',
                )}
              >
                <span className="text-[15px] leading-none" style={monoFont}>
                  {format(d, 'd')}
                </span>
                {isToday && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute bottom-1.5 h-1 w-1 rounded-full',
                      isSelected ? 'bg-primary-foreground' : 'bg-primary group-hover:bg-primary-foreground',
                    )}
                  />
                )}
              </button>
            )
          })}
        </div>

        {footerLabel && (
          <div className="mt-3.5 pt-3 border-t border-border">
            <span className="text-[13px] font-medium text-petrol dark:text-petrol-light">
              {footerLabel}<span className="text-primary"> .</span>
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
