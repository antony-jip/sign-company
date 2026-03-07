import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getAutofillSuggestions } from '@/utils/autofillUtils'

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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update suggestions when value changes
  useEffect(() => {
    if (value && value.length >= 1) {
      const results = getAutofillSuggestions(field, value)
      setSuggestions(results)
    } else {
      setSuggestions([])
    }
  }, [field, value])

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
      if (!showDropdown || suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) =>
          (prev - 1 + suggestions.length) % suggestions.length
        )
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        selectSuggestion(suggestions[focusedIndex])
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
        setFocusedIndex(-1)
      }
    },
    [showDropdown, suggestions, focusedIndex, selectSuggestion]
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

  const shouldShowDropdown = showDropdown && suggestions.length > 0

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
          if (value && value.length >= 1 && suggestions.length > 0) {
            setShowDropdown(true)
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {shouldShowDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border dark:border-border rounded-lg shadow-lg max-h-48 overflow-auto">
          {suggestions.map((suggestion, i) => (
            <button
              key={suggestion}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 text-sm transition-colors',
                i === focusedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted dark:hover:bg-foreground/80'
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                selectSuggestion(suggestion)
              }}
            >
              <HighlightMatch text={suggestion} query={value} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
