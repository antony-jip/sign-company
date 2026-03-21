import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getAutofillSuggestions } from '@/utils/autofillUtils'
import { getMateriaalSuggesties } from '@/services/supabaseService'

export interface DbSuggestion {
  text: string
  meta: string // e.g. "12-02 — Bakkerij Jansen"
}

interface AutofillInputProps {
  field: string              // 'omschrijving' | 'materiaal' | 'layout' | 'montage'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Highlights the matching portion of text in bold.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>

  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length)

  return (
    <>
      {before}
      <span className="font-bold">{match}</span>
      {after}
    </>
  )
}

export function AutofillInput({
  field,
  value,
  onChange,
  placeholder,
  className,
}: AutofillInputProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [dbSuggestions, setDbSuggestions] = useState<DbSuggestion[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Update localStorage suggestions when value changes
  useEffect(() => {
    if (value && value.length >= 1) {
      const results = getAutofillSuggestions(field, value)
      setSuggestions(results)
    } else {
      setSuggestions([])
    }
  }, [field, value])

  // Fetch database suggestions for materiaal field (debounced)
  useEffect(() => {
    if (field !== 'materiaal' || !value || value.length < 2) {
      setDbSuggestions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      getMateriaalSuggesties(value)
        .then((results) => {
          setDbSuggestions(
            results.map((r) => ({
              text: r.materiaal,
              meta: `${new Date(r.laatst_gebruikt).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })}${r.project_naam ? ` — ${r.project_naam}` : ''}`,
            }))
          )
        })
        .catch(() => setDbSuggestions([]))
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [field, value])

  // Merge: DB suggestions first, then localStorage (deduped)
  const allSuggestions = (() => {
    const dbTexts = new Set(dbSuggestions.map((s) => s.text.toLowerCase()))
    const localFiltered = suggestions.filter((s) => !dbTexts.has(s.toLowerCase()))
    const merged: Array<{ text: string; meta?: string }> = [
      ...dbSuggestions.map((s) => ({ text: s.text, meta: s.meta })),
      ...localFiltered.map((s) => ({ text: s })),
    ]
    return merged.slice(0, 5)
  })()

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      onChange(suggestion)
      setShowDropdown(false)
      setFocusedIndex(-1)
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || allSuggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % allSuggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) =>
          (prev - 1 + allSuggestions.length) % allSuggestions.length
        )
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        selectSuggestion(allSuggestions[focusedIndex].text)
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
        setFocusedIndex(-1)
      }
    },
    [showDropdown, allSuggestions, focusedIndex, selectSuggestion]
  )

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const shouldShowDropdown = showDropdown && allSuggestions.length > 0

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setShowDropdown(true)
          setFocusedIndex(-1)
        }}
        onFocus={() => {
          if (value && value.length >= 1 && allSuggestions.length > 0) {
            setShowDropdown(true)
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {shouldShowDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-card border border-[#E6E4E0] dark:border-border rounded-lg shadow-lg max-h-48 overflow-auto">
          {allSuggestions.map((suggestion, i) => (
            <button
              key={suggestion.text}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 text-sm transition-colors',
                i === focusedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted dark:hover:bg-muted'
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                selectSuggestion(suggestion.text)
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">
                  <HighlightMatch text={suggestion.text} query={value} />
                </span>
                {suggestion.meta && (
                  <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">{suggestion.meta}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
