import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { CalculatieProduct } from '@/types'

interface Props {
  value: string
  onSelectProduct: (product: CalculatieProduct) => void
  onVrijeNaam: (naam: string) => void
  producten: CalculatieProduct[]
  placeholder?: string
}

export function ProductCatalogusCombobox({
  value,
  onSelectProduct,
  onVrijeNaam,
  producten,
  placeholder = 'Zoek of typ product...',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const skipBlurCommitRef = useRef(false)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const filtered = useMemo(() => {
    const actief = producten.filter((p) => p.actief)
    const q = query.trim().toLowerCase()
    if (!q) return actief
    return actief.filter((p) => p.naam.toLowerCase().includes(q))
  }, [producten, query])

  useEffect(() => {
    setHighlighted(-1)
  }, [query])

  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlighted}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlighted, open])

  const commitSelect = useCallback((p: CalculatieProduct) => {
    skipBlurCommitRef.current = true
    onSelectProduct(p)
    setOpen(false)
    setHighlighted(-1)
  }, [onSelectProduct])

  const commitVrijeNaam = useCallback((naam: string) => {
    skipBlurCommitRef.current = true
    onVrijeNaam(naam)
    setOpen(false)
    setHighlighted(-1)
  }, [onVrijeNaam])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted >= 0 && highlighted < filtered.length) {
        commitSelect(filtered[highlighted])
      } else {
        commitVrijeNaam(query)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setHighlighted(-1)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const handleBlur = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false
      setOpen(false)
      return
    }
    if (query !== value) {
      onVrijeNaam(query)
    }
    setOpen(false)
  }

  const showFallback = filtered.length === 0 && query.trim().length > 0

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverPrimitive.Anchor asChild>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onPointerDown={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-8 text-sm text-left w-full"
        />
      </PopoverPrimitive.Anchor>
      <PopoverContent
        align="start"
        sideOffset={2}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (inputRef.current && e.target instanceof Node && inputRef.current.contains(e.target)) {
            e.preventDefault()
          }
        }}
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-1"
      >
        <div ref={listRef} className="max-h-[260px] overflow-y-auto">
          {filtered.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              data-idx={idx}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlighted(idx)}
              onClick={() => commitSelect(p)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded-md text-[13px] hover:bg-[#F3F2F0] transition-colors',
                highlighted === idx && 'bg-[#1A535C]/[0.06] text-[#1A535C]'
              )}
            >
              {p.naam}
            </button>
          ))}
          {showFallback && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitVrijeNaam(query)}
              className="w-full text-left px-2 py-1.5 rounded-md text-[12px] text-muted-foreground hover:bg-[#F3F2F0] transition-colors"
            >
              Gebruik &lsquo;{query}&rsquo; als vrije naam
            </button>
          )}
          {filtered.length === 0 && !showFallback && (
            <div className="px-2 py-6 text-center text-[12px] text-muted-foreground">
              Geen producten in catalogus
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
