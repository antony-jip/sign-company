import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, Command, Users, FolderKanban, FileText, Receipt,
  ClipboardCheck, File, Mail, Wrench, ChevronRight, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getKlanten,
  getProjecten,
  getOffertes,
  getFacturen,
  getTaken,
  getDocumenten,
  getEmails,
  getWerkbonnen,
} from '@/services/supabaseService'
import type { Klant, Project, Offerte, Factuur, Taak, Document, Email, Werkbon } from '@/types'
import { logger } from '../../utils/logger'

interface SearchResult {
  id: string
  type: 'klant' | 'project' | 'offerte' | 'factuur' | 'werkbon' | 'taak' | 'document' | 'email'
  title: string
  subtitle?: string
  status?: string
  route: string
}

interface SearchCategory {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  results: SearchResult[]
  total: number
}

const MAX_PER_CATEGORY = 4

// Cache data across renders to avoid refetching on every keystroke
let dataCache: {
  klanten: Klant[]
  projecten: Project[]
  offertes: Offerte[]
  facturen: Factuur[]
  taken: Taak[]
  documenten: Document[]
  emails: Email[]
  werkbonnen: Werkbon[]
  loadedAt: number
} | null = null

const CACHE_TTL = 60_000 // 1 minute

async function loadAllData() {
  if (dataCache && Date.now() - dataCache.loadedAt < CACHE_TTL) {
    return dataCache
  }

  const [klanten, projecten, offertes, facturen, taken, documenten, emails, werkbonnen] =
    await Promise.all([
      getKlanten(),
      getProjecten(),
      getOffertes(),
      getFacturen(),
      getTaken(),
      getDocumenten(),
      getEmails(),
      getWerkbonnen(),
    ])

  dataCache = { klanten, projecten, offertes, facturen, taken, documenten, emails, werkbonnen, loadedAt: Date.now() }
  return dataCache
}

function searchData(
  data: NonNullable<typeof dataCache>,
  query: string,
): SearchCategory[] {
  const q = query.toLowerCase().trim()
  const categories: SearchCategory[] = []

  // 1. Klanten
  const klantResults = data.klanten
    .filter((k) =>
      k.bedrijfsnaam.toLowerCase().includes(q) ||
      (k.contactpersoon || '').toLowerCase().includes(q) ||
      (k.email || '').toLowerCase().includes(q)
    )
  if (klantResults.length > 0) {
    categories.push({
      key: 'klanten',
      label: 'Klanten',
      icon: <Users className="w-3.5 h-3.5" />,
      color: 'text-blue-500',
      total: klantResults.length,
      results: klantResults.slice(0, MAX_PER_CATEGORY).map((k) => ({
        id: k.id,
        type: 'klant',
        title: k.bedrijfsnaam,
        subtitle: k.contactpersoon || k.email || undefined,
        route: `/klanten/${k.id}`,
      })),
    })
  }

  // 2. Projecten
  const projectResults = data.projecten
    .filter((p) =>
      p.naam.toLowerCase().includes(q) ||
      (p.klant_naam || '').toLowerCase().includes(q) ||
      (p.beschrijving || '').toLowerCase().includes(q)
    )
  if (projectResults.length > 0) {
    categories.push({
      key: 'projecten',
      label: 'Projecten',
      icon: <FolderKanban className="w-3.5 h-3.5" />,
      color: 'text-emerald-500',
      total: projectResults.length,
      results: projectResults.slice(0, MAX_PER_CATEGORY).map((p) => ({
        id: p.id,
        type: 'project',
        title: p.naam,
        subtitle: p.klant_naam || undefined,
        status: p.status,
        route: `/projecten/${p.id}`,
      })),
    })
  }

  // 3. Offertes
  const offerteResults = data.offertes
    .filter((o) =>
      (o.nummer || '').toLowerCase().includes(q) ||
      o.titel.toLowerCase().includes(q) ||
      (o.klant_naam || '').toLowerCase().includes(q)
    )
  if (offerteResults.length > 0) {
    categories.push({
      key: 'offertes',
      label: 'Offertes',
      icon: <FileText className="w-3.5 h-3.5" />,
      color: 'text-primary',
      total: offerteResults.length,
      results: offerteResults.slice(0, MAX_PER_CATEGORY).map((o) => ({
        id: o.id,
        type: 'offerte',
        title: o.nummer ? `${o.nummer} — ${o.titel}` : o.titel,
        subtitle: o.klant_naam || undefined,
        status: o.status,
        route: `/offertes/${o.id}/preview`,
      })),
    })
  }

  // 4. Facturen
  const factuurResults = data.facturen
    .filter((f) =>
      (f.nummer || '').toLowerCase().includes(q) ||
      (f.klant_naam || '').toLowerCase().includes(q) ||
      String(f.totaal || '').includes(q)
    )
  if (factuurResults.length > 0) {
    categories.push({
      key: 'facturen',
      label: 'Facturen',
      icon: <Receipt className="w-3.5 h-3.5" />,
      color: 'text-violet-500',
      total: factuurResults.length,
      results: factuurResults.slice(0, MAX_PER_CATEGORY).map((f) => ({
        id: f.id,
        type: 'factuur',
        title: f.nummer ? `${f.nummer}` : 'Factuur',
        subtitle: f.klant_naam || undefined,
        status: f.status,
        route: `/facturen/${f.id}`,
      })),
    })
  }

  // 5. Werkbonnen
  const werkbonResults = data.werkbonnen
    .filter((w) =>
      (w.werkbon_nummer || '').toLowerCase().includes(q) ||
      (w.omschrijving || '').toLowerCase().includes(q) ||
      (w.locatie_adres || '').toLowerCase().includes(q)
    )
  if (werkbonResults.length > 0) {
    categories.push({
      key: 'werkbonnen',
      label: 'Werkbonnen',
      icon: <Wrench className="w-3.5 h-3.5" />,
      color: 'text-orange-500',
      total: werkbonResults.length,
      results: werkbonResults.slice(0, MAX_PER_CATEGORY).map((w) => ({
        id: w.id,
        type: 'werkbon',
        title: w.werkbon_nummer || 'Werkbon',
        subtitle: w.omschrijving || w.locatie_adres || undefined,
        status: w.status,
        route: `/werkbonnen/${w.id}`,
      })),
    })
  }

  // 6. Taken
  const taakResults = data.taken
    .filter((t) =>
      t.titel.toLowerCase().includes(q) ||
      (t.beschrijving || '').toLowerCase().includes(q)
    )
  if (taakResults.length > 0) {
    categories.push({
      key: 'taken',
      label: 'Taken',
      icon: <ClipboardCheck className="w-3.5 h-3.5" />,
      color: 'text-amber-500',
      total: taakResults.length,
      results: taakResults.slice(0, MAX_PER_CATEGORY).map((t) => ({
        id: t.id,
        type: 'taak',
        title: t.titel,
        subtitle: t.toegewezen_aan || undefined,
        status: t.status,
        route: t.project_id ? `/projecten/${t.project_id}` : '/taken',
      })),
    })
  }

  // 7. Documenten
  const documentResults = data.documenten
    .filter((d) =>
      d.naam.toLowerCase().includes(q) ||
      (d.map || '').toLowerCase().includes(q)
    )
  if (documentResults.length > 0) {
    categories.push({
      key: 'documenten',
      label: 'Documenten',
      icon: <File className="w-3.5 h-3.5" />,
      color: 'text-sky-500',
      total: documentResults.length,
      results: documentResults.slice(0, MAX_PER_CATEGORY).map((d) => ({
        id: d.id,
        type: 'document',
        title: d.naam,
        subtitle: d.map || undefined,
        route: '/documenten',
      })),
    })
  }

  // 8. Emails
  const emailResults = data.emails
    .filter((e) =>
      (e.onderwerp || '').toLowerCase().includes(q) ||
      (e.van || '').toLowerCase().includes(q) ||
      (e.aan || '').toLowerCase().includes(q)
    )
  if (emailResults.length > 0) {
    categories.push({
      key: 'emails',
      label: 'Emails',
      icon: <Mail className="w-3.5 h-3.5" />,
      color: 'text-rose-500',
      total: emailResults.length,
      results: emailResults.slice(0, MAX_PER_CATEGORY).map((e) => ({
        id: e.id,
        type: 'email',
        title: e.onderwerp || '(Geen onderwerp)',
        subtitle: e.van || undefined,
        route: '/email',
      })),
    })
  }

  return categories
}

const statusLabels: Record<string, string> = {
  gepland: 'Gepland', actief: 'Actief', 'in-review': 'In review',
  afgerond: 'Afgerond', 'on-hold': 'On-hold', 'te-factureren': 'Te factureren',
  concept: 'Concept', verzonden: 'Verzonden', bekeken: 'Bekeken',
  goedgekeurd: 'Goedgekeurd', afgewezen: 'Afgewezen', verlopen: 'Verlopen',
  gefactureerd: 'Gefactureerd', betaald: 'Betaald', openstaand: 'Openstaand',
  todo: 'Todo', bezig: 'Bezig', review: 'Review', klaar: 'Klaar',
  ingepland: 'Ingepland', onderweg: 'Onderweg', ter_plaatse: 'Ter plaatse',
  afgerond_werkbon: 'Afgerond', vervallen: 'Vervallen', gecrediteerd: 'Gecrediteerd',
  ingediend: 'Ingediend',
}

function getStatusBadgeColor(status?: string): string {
  if (!status) return ''
  switch (status) {
    case 'actief': case 'bezig': case 'onderweg': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    case 'goedgekeurd': case 'klaar': case 'betaald': case 'afgerond': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    case 'concept': case 'todo': case 'gepland': return 'bg-muted text-foreground/70 dark:bg-foreground/80/40 dark:text-muted-foreground/50'
    case 'verzonden': case 'review': case 'in-review': case 'bekeken': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    case 'afgewezen': case 'verlopen': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    default: return 'bg-muted text-muted-foreground'
  }
}

interface GlobalSearchProps {
  className?: string
  compact?: boolean
}

export function GlobalSearch({ className, compact }: GlobalSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<SearchCategory[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [focused, setFocused] = useState(false)

  // All flat results for keyboard navigation
  const allResults = useMemo(() => {
    return categories.flatMap((c) => c.results)
  }, [categories])

  // Debounce
  useEffect(() => {
    if (query.length < 2) {
      setDebouncedQuery('')
      setCategories([])
      return
    }
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setCategories([])
      return
    }

    let cancelled = false
    async function doSearch() {
      setIsLoading(true)
      try {
        const data = await loadAllData()
        if (cancelled) return
        const results = searchData(data, debouncedQuery)
        setCategories(results)
        setActiveIndex(-1)
      } catch (err) {
        logger.error('Zoekfout:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    doSearch()
    return () => { cancelled = true }
  }, [debouncedQuery])

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('[data-global-search]')
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.route)
    setIsOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }, [navigate])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
      return
    }

    if (!isOpen || allResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : allResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < allResults.length) {
        handleSelect(allResults[activeIndex])
      }
    }
  }, [isOpen, allResults, activeIndex, handleSelect])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0) return
    const el = document.querySelector(`[data-search-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const showDropdown = isOpen && (query.length >= 2)
  const totalResults = categories.reduce((sum, c) => sum + c.total, 0)

  let flatIndex = -1

  return (
    <div className={cn('relative', className)} data-global-search>
      {/* Search input */}
      <div
        className={cn(
          'flex items-center w-full border transition-all duration-300',
          compact ? 'rounded-lg' : 'rounded-xl',
          focused
            ? 'border-primary/40 bg-background shadow-lg shadow-primary/5 ring-2 ring-primary/10'
            : 'border-border/60 bg-muted/40 hover:bg-muted/60'
        )}
      >
        <Search className={cn('text-muted-foreground flex-shrink-0', compact ? 'w-3.5 h-3.5 ml-2.5' : 'w-4 h-4 ml-3')} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Zoeken..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length >= 2) setIsOpen(true)
          }}
          onFocus={() => {
            setFocused(true)
            if (query.length >= 2) setIsOpen(true)
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground',
            compact ? 'text-xs px-2 py-1.5' : 'text-sm px-3 py-2.5'
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={() => { setQuery(''); setIsOpen(false); setCategories([]) }}
            className={cn('p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors', compact ? 'mr-2' : 'mr-2.5')}
          >
            <X className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
          </button>
        ) : (
          <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/40', compact ? 'mr-2' : 'mr-2.5')}>
            <Command className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">K</span>
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/10 z-50 overflow-hidden max-h-[420px] overflow-y-auto"
        >
          {isLoading && categories.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Zoeken...</span>
            </div>
          ) : categories.length === 0 && debouncedQuery ? (
            <div className="py-8 text-center">
              <Search className="w-5 h-5 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Geen resultaten voor &lsquo;{debouncedQuery}&rsquo;
              </p>
            </div>
          ) : (
            <>
              {/* Results header */}
              {totalResults > 0 && (
                <div className="px-3 py-2 border-b border-border/40">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {totalResults} resultaat{totalResults !== 1 ? 'en' : ''}
                  </span>
                </div>
              )}

              {categories.map((category) => (
                <div key={category.key}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/20">
                    <span className={category.color}>{category.icon}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {category.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 ml-auto">
                      {category.total}
                    </span>
                  </div>

                  {/* Results */}
                  {category.results.map((result) => {
                    flatIndex++
                    const myIndex = flatIndex
                    return (
                      <button
                        key={result.id}
                        data-search-index={myIndex}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSelect(result)
                        }}
                        onMouseEnter={() => setActiveIndex(myIndex)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                          myIndex === activeIndex
                            ? 'bg-primary/8 dark:bg-primary/12'
                            : 'hover:bg-muted/40'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        {result.status && (
                          <span className={cn(
                            'text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
                            getStatusBadgeColor(result.status)
                          )}>
                            {statusLabels[result.status] || result.status}
                          </span>
                        )}
                        <ChevronRight className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                      </button>
                    )
                  })}

                  {/* "View all" link */}
                  {category.total > MAX_PER_CATEGORY && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault()
                        const routes: Record<string, string> = {
                          klanten: '/klanten',
                          projecten: '/projecten',
                          offertes: '/offertes',
                          facturen: '/facturen',
                          werkbonnen: '/werkbonnen',
                          taken: '/taken',
                          documenten: '/documenten',
                          emails: '/email',
                        }
                        navigate(routes[category.key] || '/')
                        setIsOpen(false)
                        setQuery('')
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      Bekijk alle {category.total} resultaten
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
