import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Users,
  Mail,
  Calendar,
  Files,
  CheckSquare,
  PiggyBank,
  Newspaper,
  Settings,
  Plus,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { getOffertes, getKlanten, getProjecten } from '@/services/supabaseService'
import type { Offerte, Klant, Project } from '@/types'
import { logger } from '../../utils/logger'

interface CommandItem {
  id: string
  label: string
  subtitle: string
  icon: React.ReactNode
  path: string
  category: string
}

const navigationItems: CommandItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', subtitle: 'Navigatie', icon: <LayoutDashboard className="w-4 h-4" />, path: '/', category: 'Navigatie' },
  { id: 'nav-projecten', label: 'Projecten', subtitle: 'Navigatie', icon: <FolderKanban className="w-4 h-4" />, path: '/projecten', category: 'Navigatie' },
  { id: 'nav-offertes', label: 'Offertes', subtitle: 'Navigatie', icon: <FileText className="w-4 h-4" />, path: '/offertes', category: 'Navigatie' },
  { id: 'nav-klanten', label: 'Klanten', subtitle: 'Navigatie', icon: <Users className="w-4 h-4" />, path: '/klanten', category: 'Navigatie' },
  { id: 'nav-email', label: 'Email', subtitle: 'Navigatie', icon: <Mail className="w-4 h-4" />, path: '/email', category: 'Navigatie' },
  { id: 'nav-planning', label: 'Planning', subtitle: 'Navigatie', icon: <Calendar className="w-4 h-4" />, path: '/planning', category: 'Navigatie' },
  { id: 'nav-documenten', label: 'Documenten', subtitle: 'Navigatie', icon: <Files className="w-4 h-4" />, path: '/documenten', category: 'Navigatie' },
  { id: 'nav-taken', label: 'Taken', subtitle: 'Navigatie', icon: <CheckSquare className="w-4 h-4" />, path: '/taken', category: 'Navigatie' },
  { id: 'nav-financieel', label: 'Financieel', subtitle: 'Navigatie', icon: <PiggyBank className="w-4 h-4" />, path: '/financieel', category: 'Navigatie' },
  { id: 'nav-nieuwsbrieven', label: 'Nieuwsbrieven', subtitle: 'Navigatie', icon: <Newspaper className="w-4 h-4" />, path: '/nieuwsbrieven', category: 'Navigatie' },
  { id: 'nav-instellingen', label: 'Instellingen', subtitle: 'Navigatie', icon: <Settings className="w-4 h-4" />, path: '/instellingen', category: 'Navigatie' },
]

const actionItems: CommandItem[] = [
  { id: 'act-nieuwe-offerte', label: 'Nieuwe Offerte', subtitle: 'Actie', icon: <Plus className="w-4 h-4" />, path: '/offertes/nieuw', category: 'Acties' },
  { id: 'act-nieuw-project', label: 'Nieuw Project', subtitle: 'Actie', icon: <Plus className="w-4 h-4" />, path: '/projecten/nieuw', category: 'Acties' },
]

function mapOffertesToItems(offertes: Offerte[]): CommandItem[] {
  return offertes.map((o) => ({
    id: `offerte-${o.id}`,
    label: `${o.nummer} - ${o.titel}`,
    subtitle: o.klant_naam || 'Offerte',
    icon: <FileText className="w-4 h-4" />,
    path: `/offertes/${o.id}/bewerken`,
    category: 'Offertes',
  }))
}

function mapKlantenToItems(klanten: Klant[]): CommandItem[] {
  return klanten.map((k) => ({
    id: `klant-${k.id}`,
    label: k.bedrijfsnaam,
    subtitle: k.contactpersoon || 'Klant',
    icon: <Users className="w-4 h-4" />,
    path: `/klanten/${k.id}`,
    category: 'Klanten',
  }))
}

function mapProjectenToItems(projecten: Project[]): CommandItem[] {
  return projecten.map((p) => ({
    id: `project-${p.id}`,
    label: p.naam,
    subtitle: p.klant_naam || 'Project',
    icon: <FolderKanban className="w-4 h-4" />,
    path: `/projecten/${p.id}`,
    category: 'Projecten',
  }))
}

export function CommandPalette() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const [offerteItems, setOfferteItems] = useState<CommandItem[]>([])
  const [klantItems, setKlantItems] = useState<CommandItem[]>([])
  const [projectItems, setProjectItems] = useState<CommandItem[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Load data on mount
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)
      try {
        const [offertes, klanten, projecten] = await Promise.all([
          getOffertes(),
          getKlanten(),
          getProjecten(),
        ])
        if (!cancelled) {
          setOfferteItems(mapOffertesToItems(offertes))
          setKlantItems(mapKlantenToItems(klanten))
          setProjectItems(mapProjectenToItems(projecten))
        }
      } catch (error) {
        logger.error('CommandPalette: failed to load data', error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  // Build filtered results
  const filteredResults = useMemo(() => {
    const q = query.toLowerCase().trim()

    if (!q) {
      // Show navigation + actions when no query
      return [...navigationItems, ...actionItems]
    }

    const matchNav = navigationItems.filter(
      (item) => item.label.toLowerCase().includes(q)
    )
    const matchActions = actionItems.filter(
      (item) => item.label.toLowerCase().includes(q)
    )
    const matchOffertes = offerteItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    )
    const matchKlanten = klantItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    )
    const matchProjecten = projectItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    )

    return [...matchNav, ...matchActions, ...matchOffertes, ...matchKlanten, ...matchProjecten]
  }, [query, offerteItems, klantItems, projectItems])

  // Group results by category for rendering
  const groupedResults = useMemo(() => {
    const groups: { category: string; items: CommandItem[] }[] = []
    const categoryMap = new Map<string, CommandItem[]>()

    for (const item of filteredResults) {
      const existing = categoryMap.get(item.category)
      if (existing) {
        existing.push(item)
      } else {
        const arr = [item]
        categoryMap.set(item.category, arr)
        groups.push({ category: item.category, items: arr })
      }
    }

    return groups
  }, [filteredResults])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredResults])

  const open = useCallback(() => {
    setIsOpen(true)
    setQuery('')
    setSelectedIndex(0)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [])

  const selectItem = useCallback(
    (item: CommandItem) => {
      close()
      navigate(item.path)
    },
    [close, navigate]
  )

  // Keyboard shortcut: Cmd+K / Ctrl+K to toggle, Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen((prev) => {
          if (prev) {
            // Closing
            setQuery('')
            setSelectedIndex(0)
            return false
          }
          // Opening
          setQuery('')
          setSelectedIndex(0)
          return true
        })
        return
      }

      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, close])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal is rendered before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex)
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  // Arrow key navigation within the modal
  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev < filteredResults.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredResults.length - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredResults[selectedIndex]
      if (item) {
        selectItem(item)
      }
    }
  }

  // Calculate flat index for an item in grouped results
  function getFlatIndex(groupIndex: number, itemIndex: number): number {
    let flat = 0
    for (let g = 0; g < groupIndex; g++) {
      flat += groupedResults[g].items.length
    }
    return flat + itemIndex
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]"
      style={{
        animation: 'commandPaletteFadeIn 150ms ease-out forwards',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
        style={{
          animation: 'commandPaletteBackdropIn 150ms ease-out forwards',
        }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl shadow-lg border border-border dark:border-border overflow-hidden bg-card"
        style={{
          animation: 'commandPaletteSlideIn 150ms ease-out forwards',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border dark:border-border">
          <Search className="w-5 h-5 text-muted-foreground/60 dark:text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Zoek offertes, klanten, projecten..."
            className="flex-1 py-4 text-base bg-transparent outline-none text-foreground dark:text-white placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 text-muted-foreground/60 dark:text-muted-foreground animate-spin flex-shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground/60 dark:text-muted-foreground bg-muted dark:bg-muted rounded-md border border-border dark:border-border flex-shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results area */}
        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto overscroll-contain py-2"
          role="listbox"
        >
          {filteredResults.length === 0 && !isLoading && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">
                Geen resultaten gevonden voor &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {filteredResults.length === 0 && isLoading && (
            <div className="px-4 py-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-muted-foreground/60 dark:text-muted-foreground animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground dark:text-muted-foreground/60">
                Gegevens laden...
              </span>
            </div>
          )}

          {groupedResults.map((group, groupIndex) => (
            <div key={group.category}>
              {/* Category header */}
              <div className="px-4 pt-3 pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 dark:text-muted-foreground">
                  {group.category}
                </span>
              </div>

              {/* Items */}
              {group.items.map((item, itemIndex) => {
                const flatIndex = getFlatIndex(groupIndex, itemIndex)
                const isSelected = flatIndex === selectedIndex

                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) {
                        itemRefs.current.set(flatIndex, el)
                      } else {
                        itemRefs.current.delete(flatIndex)
                      }
                    }}
                    role="option"
                    aria-selected={isSelected}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg cursor-pointer
                      transition-colors duration-75
                      ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-foreground/70 dark:text-muted-foreground/50 hover:bg-background dark:hover:bg-muted/50'
                      }
                    `}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                  >
                    <div
                      className={`
                        flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                        ${
                          isSelected
                            ? 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400'
                            : 'bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground/60'
                        }
                      `}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      {item.subtitle !== item.category && (
                        <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className={`
                        w-4 h-4 flex-shrink-0 transition-opacity duration-75
                        ${isSelected ? 'opacity-100 text-blue-400 dark:text-blue-500' : 'opacity-0'}
                      `}
                    />
                  </div>
                )
              })}

              {/* Divider between groups (not after last) */}
              {groupIndex < groupedResults.length - 1 && (
                <div className="mx-4 my-2 border-t border-border dark:border-border" />
              )}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border dark:border-border bg-background dark:bg-muted/50">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60 dark:text-muted-foreground">
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-secondary dark:bg-foreground/70 text-2xs font-semibold text-muted-foreground dark:text-muted-foreground/60">
              &uarr;
            </kbd>
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-secondary dark:bg-foreground/70 text-2xs font-semibold text-muted-foreground dark:text-muted-foreground/60">
              &darr;
            </kbd>
            Navigeer
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60 dark:text-muted-foreground">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-secondary dark:bg-foreground/70 text-2xs font-semibold text-muted-foreground dark:text-muted-foreground/60">
              Enter
            </kbd>
            Openen
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60 dark:text-muted-foreground">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-secondary dark:bg-foreground/70 text-2xs font-semibold text-muted-foreground dark:text-muted-foreground/60">
              Esc
            </kbd>
            Sluiten
          </span>
        </div>
      </div>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes commandPaletteFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes commandPaletteBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes commandPaletteSlideIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
