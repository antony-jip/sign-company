import { useMemo, useRef, useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Check, ChevronDown, Search, UserPlus, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Medewerker } from '@/types'
import { getAvatarStyleForMedewerker } from '@/utils/medewerkerAvatar'

type MedewerkerRol = Medewerker['rol']
type ValueKind = 'id' | 'naam'
type Trigger = 'pill' | 'input' | 'avatar-stack'

interface CommonProps {
  medewerkers: Medewerker[]
  isLoading?: boolean
  valueKind?: ValueKind
  rolFilter?: MedewerkerRol[] | ((m: Medewerker) => boolean)
  includeInactief?: boolean
  placeholder?: string
  allLabel?: string
  trigger?: Trigger
  popoverAlign?: 'start' | 'center' | 'end'
  popoverWidth?: number
  disabled?: boolean
  error?: boolean
  className?: string
  id?: string
}

interface SingleProps extends CommonProps {
  mode: 'single'
  value: string | null
  onChange: (next: string | null) => void
}

interface MultiProps extends CommonProps {
  mode: 'multi'
  value: string[]
  onChange: (next: string[]) => void
}

export type MedewerkerSelectorProps = SingleProps | MultiProps

function getInitials(naam: string): string {
  if (!naam || !naam.trim()) return '?'
  return naam
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function matchesKey(m: Medewerker, key: string, kind: ValueKind): boolean {
  return kind === 'id' ? m.id === key : m.naam === key
}

function valueOf(m: Medewerker, kind: ValueKind): string {
  return kind === 'id' ? m.id : m.naam
}

function applyRolFilter(
  list: Medewerker[],
  filter: MedewerkerRol[] | ((m: Medewerker) => boolean) | undefined
): Medewerker[] {
  if (!filter) return list
  if (typeof filter === 'function') return list.filter(filter)
  return list.filter((m) => filter.includes(m.rol))
}

export function MedewerkerSelector(props: MedewerkerSelectorProps) {
  const {
    mode,
    medewerkers,
    isLoading = false,
    valueKind = 'naam',
    rolFilter,
    includeInactief = false,
    placeholder,
    allLabel,
    trigger = 'pill',
    popoverAlign = 'end',
    popoverWidth,
    disabled,
    error,
    className,
    id,
  } = props

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const pool = useMemo(() => {
    let list = medewerkers
    if (!includeInactief) list = list.filter((m) => m.status === 'actief')
    list = applyRolFilter(list, rolFilter)
    return list
  }, [medewerkers, includeInactief, rolFilter])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pool
    return pool.filter((m) => m.naam.toLowerCase().includes(q))
  }, [pool, query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(Math.max(0, filtered.length - 1))
  }, [filtered.length, activeIndex])

  const isSelected = (m: Medewerker): boolean => {
    if (mode === 'single') return props.value !== null && matchesKey(m, props.value, valueKind)
    return props.value.some((v) => matchesKey(m, v, valueKind))
  }

  const handleToggle = (m: Medewerker) => {
    const key = valueOf(m, valueKind)
    if (props.mode === 'single') {
      props.onChange(isSelected(m) ? null : key)
      setOpen(false)
      return
    }
    const next = props.value.includes(key)
      ? props.value.filter((v) => v !== key)
      : [...props.value, key]
    props.onChange(next)
  }

  const handleClearAll = () => {
    if (props.mode === 'single') {
      props.onChange(null)
      setOpen(false)
    } else {
      props.onChange([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filtered[activeIndex]
      if (target) handleToggle(target)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const selectedSingle =
    mode === 'single' && props.value
      ? pool.find((m) => matchesKey(m, props.value as string, valueKind)) ?? null
      : null

  const selectedMulti =
    mode === 'multi'
      ? (props.value as string[])
          .map((v) => pool.find((m) => matchesKey(m, v, valueKind)))
          .filter((m): m is Medewerker => Boolean(m))
      : []

  const orphanMultiValues =
    mode === 'multi'
      ? (props.value as string[]).filter(
          (v) => !pool.some((m) => matchesKey(m, v, valueKind))
        )
      : []

  const orphanSingleValue =
    mode === 'single' && props.value !== null && !selectedSingle ? props.value : null

  const triggerBaseClasses =
    trigger === 'input'
      ? 'h-9 w-full justify-between rounded-md border border-[#E0DED8] bg-white px-3 text-[13px]'
      : 'h-7 rounded-md border border-[#E0DED8] bg-white px-2 text-[13px]'

  const renderTriggerContent = () => {
    if (mode === 'single') {
      if (selectedSingle) {
        return (
          <>
            <span
              className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
              style={getAvatarStyleForMedewerker(selectedSingle, pool)}
            >
              {getInitials(selectedSingle.naam)}
            </span>
            <span className="truncate max-w-[120px]">{selectedSingle.naam}</span>
          </>
        )
      }
      if (orphanSingleValue) {
        return (
          <>
            <span className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold bg-[#F0EFEC] text-[#9B9B95] shrink-0">
              {getInitials(orphanSingleValue)}
            </span>
            <span className="truncate max-w-[120px] text-[#9B9B95] italic" title="Niet meer actief">
              {orphanSingleValue}
            </span>
          </>
        )
      }
      return (
        <>
          <Users className="h-3.5 w-3.5 text-[#9B9B95] shrink-0" />
          <span>{allLabel ?? placeholder ?? 'Niet toegewezen'}</span>
        </>
      )
    }

    const totalSelected = selectedMulti.length + orphanMultiValues.length
    if (totalSelected === 0) {
      return (
        <>
          <Users className="h-3.5 w-3.5 text-[#9B9B95] shrink-0" />
          <span>{placeholder ?? 'Toewijzen…'}</span>
        </>
      )
    }
    const avatarSlice = selectedMulti.slice(0, 3)
    const overflow = totalSelected - avatarSlice.length
    return (
      <>
        <div className="flex items-center -space-x-1.5 shrink-0">
          {avatarSlice.map((m) => (
            <span
              key={m.id}
              className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold ring-1 ring-white"
              style={getAvatarStyleForMedewerker(m, pool)}
              title={m.naam}
            >
              {getInitials(m.naam)}
            </span>
          ))}
        </div>
        {overflow > 0 && (
          <span className="text-[11px] font-mono tabular-nums text-[#6B6B66]">+{overflow}</span>
        )}
      </>
    )
  }

  const contentWidthStyle = popoverWidth ? { width: popoverWidth } : undefined

  const renderAvatarStackContent = () => {
    if (mode === 'multi') {
      const totalSelected = selectedMulti.length + orphanMultiValues.length
      if (totalSelected === 0) {
        return <UserPlus className="w-3.5 h-3.5 text-[#C0BDB8] group-hover:text-[#9B9B95] transition-colors" />
      }
      const avatarSlice = selectedMulti.slice(0, 3)
      const overflow = totalSelected - avatarSlice.length
      return (
        <div className="flex items-center -space-x-1.5">
          {avatarSlice.map((m) => (
            <span
              key={m.id}
              title={m.naam}
              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ring-2 ring-white select-none"
              style={getAvatarStyleForMedewerker(m, pool)}
            >
              {getInitials(m.naam)}
            </span>
          ))}
          {overflow > 0 && (
            <span className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-mono font-medium bg-[#F0EFEC] text-[#6B6B66] ring-2 ring-white">
              +{overflow}
            </span>
          )}
        </div>
      )
    }
    if (selectedSingle) {
      return (
        <span
          title={selectedSingle.naam}
          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ring-2 ring-white"
          style={getAvatarStyleForMedewerker(selectedSingle, pool)}
        >
          {getInitials(selectedSingle.naam)}
        </span>
      )
    }
    if (orphanSingleValue) {
      return (
        <span
          title={`${orphanSingleValue} (niet meer actief)`}
          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#F0EFEC] text-[#9B9B95] uppercase ring-2 ring-white"
        >
          {getInitials(orphanSingleValue)}
        </span>
      )
    }
    return <UserPlus className="w-3.5 h-3.5 text-[#C0BDB8] group-hover:text-[#9B9B95] transition-colors" />
  }

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        {trigger === 'avatar-stack' ? (
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              'flex items-center gap-1 group rounded-lg px-1 py-0.5 hover:bg-[#F8F7F5] transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
              className
            )}
          >
            {renderAvatarStackContent()}
          </button>
        ) : (
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:border-[#1A535C]/40 hover:border-[#1A535C]/40 disabled:opacity-60 disabled:cursor-not-allowed',
              triggerBaseClasses,
              error && 'border-[#C03A18]/60',
              className
            )}
          >
            {renderTriggerContent()}
            <ChevronDown className="h-3 w-3 text-[#9B9B95] shrink-0 ml-auto" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align={popoverAlign} className="w-64 p-2" style={contentWidthStyle}>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9B95]" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Zoek medewerker…'}
            className="h-8 pl-7 text-[13px]"
          />
        </div>
        <div ref={listRef} className="max-h-[260px] overflow-y-auto -mx-1 px-1">
          {isLoading && pool.length === 0 && (
            <div className="px-2 py-6 text-center text-[12px] text-[#9B9B95]">Laden…</div>
          )}
          {mode === 'single' && allLabel !== undefined && (
            <button
              type="button"
              onClick={() => { props.onChange(null); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-left hover:bg-[#F3F2F0] transition-colors',
                props.value === null && 'bg-[#1A535C]/[0.06] text-[#1A535C] font-semibold'
              )}
            >
              <Users className="h-4 w-4 text-[#9B9B95]" />
              <span className="flex-1">{allLabel}</span>
              {props.value === null && <Check className="h-3.5 w-3.5 text-[#1A535C]" />}
            </button>
          )}
          {mode === 'multi' && selectedMulti.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[#9B9B95] text-left hover:bg-[#F3F2F0] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span className="flex-1">Deselecteer alles</span>
            </button>
          )}
          {filtered.length === 0 && query && (
            <div className="px-2 py-6 text-center text-[12px] text-[#9B9B95]">Geen resultaat</div>
          )}
          {filtered.map((m, i) => {
            const selected = isSelected(m)
            const active = i === activeIndex
            return (
              <button
                key={m.id}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleToggle(m)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-left transition-colors',
                  active && 'bg-[#F3F2F0]',
                  selected && 'bg-[#1A535C]/[0.06] text-[#1A535C] font-semibold'
                )}
              >
                <span
                  className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={getAvatarStyleForMedewerker(m, pool)}
                >
                  {getInitials(m.naam)}
                </span>
                <span className="flex-1 truncate">{m.naam}</span>
                {selected && <Check className="h-3.5 w-3.5 text-[#1A535C]" />}
              </button>
            )
          })}
          {orphanMultiValues.length > 0 && mode === 'multi' && (
            <div className="mt-1 pt-1 border-t border-[#F0EFEC]">
              {orphanMultiValues.map((v) => (
                <button
                  key={`orphan-${v}`}
                  type="button"
                  onClick={() => props.onChange((props.value as string[]).filter((x) => x !== v))}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-left text-[#9B9B95] italic hover:bg-[#F3F2F0] transition-colors"
                  title="Niet meer actief — klik om te verwijderen"
                >
                  <span className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-[#F0EFEC] text-[#9B9B95] flex-shrink-0">
                    {getInitials(v)}
                  </span>
                  <span className="flex-1 truncate">{v}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
