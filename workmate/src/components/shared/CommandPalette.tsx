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
  Receipt,
  Briefcase,
  ClipboardList,
  Clock,
} from 'lucide-react'
import { getOffertes, getKlanten, getProjecten, getDeals, getFacturen, getWerkbonnen } from '@/services/supabaseService'
import type { Offerte, Klant, Project, Deal, Factuur, Werkbon } from '@/types'
import { useRecentItems, trackRecentItem } from '@/hooks/useRecentItems'
import type { RecentItem } from '@/hooks/useRecentItems'
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
  { id: 'nav-kalender', label: 'Kalender', subtitle: 'Navigatie', icon: <Calendar className="w-4 h-4" />, path: '/kalender', category: 'Navigatie' },
  { id: 'nav-documenten', label: 'Documenten', subtitle: 'Navigatie', icon: <Files className="w-4 h-4" />, path: '/documenten', category: 'Navigatie' },
  { id: 'nav-taken', label: 'Taken', subtitle: 'Navigatie', icon: <CheckSquare className="w-4 h-4" />, path: '/taken', category: 'Navigatie' },
  { id: 'nav-financieel', label: 'Financieel', subtitle: 'Navigatie', icon: <PiggyBank className="w-4 h-4" />, path: '/financieel', category: 'Navigatie' },
  { id: 'nav-nieuwsbrieven', label: 'Nieuwsbrieven', subtitle: 'Navigatie', icon: <Newspaper className="w-4 h-4" />, path: '/nieuwsbrieven', category: 'Navigatie' },
  { id: 'nav-instellingen', label: 'Instellingen', subtitle: 'Navigatie', icon: <Settings className="w-4 h-4" />, path: '/instellingen', category: 'Navigatie' },
]

const actionItems: CommandItem[] = [
  { id: 'act-nieuwe-offerte', label: 'Nieuwe Offerte', subtitle: 'Actie', icon: <Plus className="w-4 h-4" />, path: '/offertes/nieuw', category: 'Acties' },
  { id: 'act-nieuw-project', label: 'Nieuw Project', subtitle: 'Actie', icon: <Plus className="w-4 h-4" />, path: '/projecten/nieuw', category: 'Acties' },
  { id: 'act-nieuwe-klant', label: 'Nieuwe Klant', subtitle: 'Actie', icon: <Plus className="w-4 h-4" />, path: '/klanten?nieuw=true', category: 'Acties' },
  { id: 'act-nieuwe-factuur', label: 'Nieuwe Factuur', subtitle: 'Actie', icon: <Plus className="w-4 h-4" />, path: '/facturen?nieuw=true', category: 'Acties' },
  { id: 'act-nieuwe-taak', label: 'Nieuwe Taak', subtitle: 'Actie', icon: <Plus className="w-4 h-4" />, path: '/taken?nieuw=true', category: 'Acties' },
  { id: 'act-nieuwe-deal', label: 'Nieuwe Deal', subtitle: 'Actie', icon: <Plus className="w-4 h-4" />, path: '/deals?nieuw=true', category: 'Acties' },
  { id: 'act-nieuwe-werkbon', label: 'Nieuwe Werkbon', subtitle: 'Actie', icon: <Plus className="w-4 h-4" />, path: '/werkbonnen/nieuw', category: 'Acties' },
]

const settingsItems: CommandItem[] = [
  { id: 'set-profiel', label: 'Profiel', subtitle: 'Uw persoonlijke gegevens', icon: <Settings className="w-4 h-4" />, path: '/instellingen?tab=profiel', category: 'Instellingen' },
  { id: 'set-bedrijf', label: 'Bedrijfsgegevens', subtitle: 'Bedrijfsinformatie en logo', icon: <Settings className="w-4 h-4" />, path: '/instellingen?tab=bedrijf', category: 'Instellingen' },
  { id: 'set-huisstijl', label: 'Huisstijl', subtitle: 'Document styling en briefpapier', icon: <Settings className="w-4 h-4" />, path: '/instellingen?tab=huisstijl', category: 'Instellingen' },
  { id: 'set-calculatie', label: 'Calculatie', subtitle: 'Producten, marges en eenheden', icon: <Settings className="w-4 h-4" />, path: '/instellingen?tab=calculatie', category: 'Instellingen' },
  { id: 'set-aanpassingen', label: 'Aanpassingen', subtitle: 'Pipeline, statussen en workflows', icon: <Settings className="w-4 h-4" />, path: '/instellingen?tab=aanpassingen', category: 'Instellingen' },
  { id: 'set-meldingen', label: 'Meldingen', subtitle: 'E-mail en pushnotificaties', icon: <Settings className="w-4 h-4" />, path: '/instellingen?tab=meldingen', category: 'Instellingen' },
  { id: 'set-integraties', label: 'Integraties', subtitle: 'Koppelingen met externe diensten', icon: <Settings className="w-4 h-4" />, path: '/instellingen?tab=integraties', category: 'Instellingen' },
  { id: 'set-beveiliging', label: 'Beveiliging', subtitle: 'Wachtwoord en sessies', icon: <Settings className="w-4 h-4" />, path: '/instellingen?tab=beveiliging', category: 'Instellingen' },
  { id: 'set-weergave', label: 'Weergave', subtitle: 'Thema, taal en lay-out', icon: <Settings className="w-4 h-4" />, path: '/instellingen?tab=weergave', category: 'Instellingen' },
]

function mapOffertesToItems(offertes: Offerte[]): CommandItem[] {
  return offertes.map((o) => ({
    id: `offerte-${o.id}`,
    label: `${o.nummer} - ${o.titel}`,
    subtitle: o.klant_naam || 'Offerte',
    icon: <FileText className="w-4 h-4" />,
    path: `/offertes/${o.id}`,
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

function mapDealsToItems(deals: Deal[]): CommandItem[] {
  return deals.map((d) => ({
    id: `deal-${d.id}`,
    label: d.titel,
    subtitle: `${d.status} — €${d.verwachte_waarde.toLocaleString('nl-NL')}`,
    icon: <Briefcase className="w-4 h-4" />,
    path: `/deals/${d.id}`,
    category: 'Deals',
  }))
}

function mapFacturenToItems(facturen: Factuur[]): CommandItem[] {
  return facturen.map((f) => ({
    id: `factuur-${f.id}`,
    label: `${f.nummer} - ${f.titel}`,
    subtitle: f.klant_naam || `€${f.totaal.toLocaleString('nl-NL')}`,
    icon: <Receipt className="w-4 h-4" />,
    path: `/facturen`,
    category: 'Facturen',
  }))
}

function mapWerkbonnenToItems(werkbonnen: Werkbon[]): CommandItem[] {
  return werkbonnen.map((w) => ({
    id: `werkbon-${w.id}`,
    label: w.werkbon_nummer,
    subtitle: w.locatie_adres || 'Werkbon',
    icon: <ClipboardList className="w-4 h-4" />,
    path: `/werkbonnen/${w.id}`,
    category: 'Werkbonnen',
  }))
}

const RECENT_TYPE_ICONS: Record<RecentItem['type'], React.ReactNode> = {
  klant: <Users className="w-4 h-4" />,
  project: <FolderKanban className="w-4 h-4" />,
  offerte: <FileText className="w-4 h-4" />,
  deal: <Briefcase className="w-4 h-4" />,
  factuur: <Receipt className="w-4 h-4" />,
  werkbon: <ClipboardList className="w-4 h-4" />,
  pagina: <Clock className="w-4 h-4" />,
}

function mapRecentToItems(items: RecentItem[]): CommandItem[] {
  return items.map((r, i) => ({
    id: `recent-${i}-${r.path}`,
    label: r.label,
    subtitle: r.subtitle,
    icon: RECENT_TYPE_ICONS[r.type] || <Clock className="w-4 h-4" />,
    path: r.path,
    category: 'Recent',
  }))
}

export function CommandPalette() {
  const navigate = useNavigate()
  const recentItems = useRecentItems()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const [offerteItems, setOfferteItems] = useState<CommandItem[]>([])
  const [klantItems, setKlantItems] = useState<CommandItem[]>([])
  const [projectItems, setProjectItems] = useState<CommandItem[]>([])
  const [dealItems, setDealItems] = useState<CommandItem[]>([])
  const [factuurItems, setFactuurItems] = useState<CommandItem[]>([])
  const [werkbonItems, setWerkbonItems] = useState<CommandItem[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Load data on mount
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)
      try {
        const [offertes, klanten, projecten, deals, facturen, werkbonnen] = await Promise.all([
          getOffertes(),
          getKlanten(),
          getProjecten(),
          getDeals(),
          getFacturen(),
          getWerkbonnen(),
        ])
        if (!cancelled) {
          setOfferteItems(mapOffertesToItems(offertes))
          setKlantItems(mapKlantenToItems(klanten))
          setProjectItems(mapProjectenToItems(projecten))
          setDealItems(mapDealsToItems(deals))
          setFactuurItems(mapFacturenToItems(facturen))
          setWerkbonItems(mapWerkbonnenToItems(werkbonnen))
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

  // Map recent items for display
  const recentCommandItems = useMemo(() => mapRecentToItems(recentItems), [recentItems])

  // Build filtered results
  const filteredResults = useMemo(() => {
    const q = query.toLowerCase().trim()

    if (!q) {
      // Show recent items (if any), then navigation + actions
      return [...recentCommandItems, ...navigationItems, ...actionItems]
    }

    const matchItem = (item: CommandItem) =>
      item.label.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q)

    const matchRecent = recentCommandItems.filter(matchItem)
    const matchNav = navigationItems.filter(matchItem)
    const matchActions = actionItems.filter(matchItem)
    const matchSettings = settingsItems.filter(matchItem)
    const matchOffertes = offerteItems.filter(matchItem)
    const matchKlanten = klantItems.filter(matchItem)
    const matchProjecten = projectItems.filter(matchItem)
    const matchDeals = dealItems.filter(matchItem)
    const matchFacturen = factuurItems.filter(matchItem)
    const matchWerkbonnen = werkbonItems.filter(matchItem)

    return [
      ...matchRecent,
      ...matchNav,
      ...matchActions,
      ...matchSettings,
      ...matchOffertes,
      ...matchKlanten,
      ...matchProjecten,
      ...matchDeals,
      ...matchFacturen,
      ...matchWerkbonnen,
    ]
  }, [query, recentCommandItems, offerteItems, klantItems, projectItems, dealItems, factuurItems, werkbonItems])

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
      // Track navigatable items (not actions/navigation) as recent
      const categoryToType: Record<string, RecentItem['type']> = {
        Klanten: 'klant',
        Projecten: 'project',
        Offertes: 'offerte',
        Deals: 'deal',
        Facturen: 'factuur',
        Werkbonnen: 'werkbon',
      }
      const type = categoryToType[item.category]
      if (type) {
        trackRecentItem({
          path: item.path,
          label: item.label,
          subtitle: item.subtitle,
          type,
        })
      }
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
        className="relative w-full max-w-xl mx-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900"
        style={{
          animation: 'commandPaletteSlideIn 150ms ease-out forwards',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Zoek offertes, klanten, projecten..."
            className="flex-1 py-4 text-base bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            autoComplete="off"
            spellCheck={false}
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 text-gray-400 dark:text-gray-500 animate-spin flex-shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex-shrink-0">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Geen resultaten gevonden voor &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {filteredResults.length === 0 && isLoading && (
            <div className="px-4 py-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-gray-400 dark:text-gray-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                Gegevens laden...
              </span>
            </div>
          )}

          {groupedResults.map((group, groupIndex) => (
            <div key={group.category}>
              {/* Category header */}
              <div className="px-4 pt-3 pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
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
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
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
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }
                      `}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      {item.subtitle !== item.category && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
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
                <div className="mx-4 my-2 border-t border-gray-100 dark:border-gray-800" />
              )}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
              &uarr;
            </kbd>
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
              &darr;
            </kbd>
            Navigeer
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
              Enter
            </kbd>
            Openen
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
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
