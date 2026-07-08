import React, { useEffect, useLayoutEffect, useRef, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut, Menu, X,
  Moon, Sun, CreditCard, PanelTop,
  LayoutDashboard, CircleUserRound, BookOpen,
  Hammer, FileText, Building2, Wrench, Wand2, Banknote, Inbox, Ruler,
  TrendingUp, Calendar, ListChecks, Mail, Globe, SlidersHorizontal, LifeBuoy, MessageSquare, Newspaper,
  Pin, PinOff, Pencil, Plus, LayoutGrid, Check, ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { prefetchRoute } from '@/lib/routePrefetch'
import { useSidebar, RAIL_WIDTH, EXPANDED_WIDTH } from '@/contexts/SidebarContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSupportAttentie } from '@/hooks/useSupportInbox'
import { ADMIN_USER_ID } from '@/services/supportChatService'
import { useAuth } from '@/contexts/AuthContext'
import { usePalette } from '@/contexts/PaletteContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

interface NavItem {
  label: string
  icon: LucideIcon
  path: string
  color: string
}

interface NavGroup {
  section: string
  items: NavItem[]
}

// Module colors per the DOEN design system
const WERK_ITEMS: NavItem[] = [
  { label: 'Projecten', icon: Hammer, path: '/projecten', color: '#1A535C' },
  { label: 'Offertes', icon: FileText, path: '/offertes', color: '#F15025' },
  { label: 'Klanten', icon: Building2, path: '/klanten', color: '#3A6B8C' },
  { label: 'Werkbonnen', icon: Wrench, path: '/werkbonnen', color: '#C44830' },
  { label: 'Maatjes', icon: Ruler, path: '/maatjes', color: '#F15025' },
  { label: 'Studio', icon: Wand2, path: '/visualizer', color: '#9A5A48' },
]

const FINANCIEEL_ITEMS: NavItem[] = [
  { label: 'Facturen', icon: Banknote, path: '/facturen', color: '#2D6B48' },
  { label: 'Inkoopfacturen', icon: Inbox, path: '/inkoopfacturen', color: '#C44830' },
  { label: 'Financieel', icon: TrendingUp, path: '/financieel', color: '#2D6B48' },
]

const PLANNING_ITEMS: NavItem[] = [
  { label: 'Planning', icon: Calendar, path: '/planning', color: '#9A5A48' },
  { label: 'Taken', icon: ListChecks, path: '/taken', color: 'hsl(var(--muted-foreground))' },
]

const COMMUNICATIE_ITEMS: NavItem[] = [
  { label: 'Email', icon: Mail, path: '/email', color: '#6A5A8A' },
  { label: 'Aanvragen', icon: MessageSquare, path: '/aanvragen', color: '#6A5A8A' },
  { label: 'Portaal', icon: Globe, path: '/portalen', color: '#6A5A8A' },
]

const SETTINGS_ITEM: NavItem = { label: 'Instellingen', icon: SlidersHorizontal, path: '/instellingen', color: 'hsl(var(--muted-foreground))' }
const SUPPORT_ITEM: NavItem = { label: 'Support', icon: LifeBuoy, path: '/support', color: '#F15025' }
// Owner-only: nieuwsbrief-module is persoonlijk voor de eigenaar (zie 149_nieuwsbrief.sql).
const NIEUWSBRIEF_ITEM: NavItem = { label: 'Nieuwsbrief', icon: Newspaper, path: '/nieuwsbrief', color: '#6A5A8A' }

const NAV_GROUPS: NavGroup[] = [
  { section: 'WERK', items: WERK_ITEMS },
  { section: 'FINANCIEEL', items: FINANCIEEL_ITEMS },
  { section: 'PLANNING', items: PLANNING_ITEMS },
  { section: 'COMMUNICATIE', items: COMMUNICATIE_ITEMS },
]

// Flat list for rail mode
const ALL_NAV_ITEMS: NavItem[] = [...WERK_ITEMS, ...FINANCIEEL_ITEMS, ...PLANNING_ITEMS, ...COMMUNICATIE_ITEMS]

// Mobiel is bewust lean: alleen het hoogstnodige voor de buitendienst
// (projecten, mail, maatje) plus Instellingen. De rest doe je op desktop.
// Geldt altijd op mobiel, los van de desktop-menukeuze.
const MOBIELE_NAV_LABELS = ['Projecten', 'Email', 'Maatjes']

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    setIsDesktop(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export function Sidebar() {
  const isDesktop = useIsDesktop()
  const { isCollapsed, setLayoutMode } = useSidebar()
  const { user, logout } = useAuth()
  const isSupportAdmin = user?.id === ADMIN_USER_ID
  const isEigenaar = user?.id === ADMIN_USER_ID
  const supportAttentie = useSupportAttentie('support-nav', isSupportAdmin)
  const { appThemeId, setAppThemeId } = usePalette()
  const isDarkTheme = appThemeId === 'dark'
  const { settings, updateSettings } = useAppSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  // Gepind = ingeklapt tot de smalle rail (met hover-peek als overlay).
  // Standaard NIET gepind = persistent uitgeklapte, gelabelde kolom waar de
  // content naast leeft (Linear/Notion-shell).
  const [isPinned, setIsPinned] = useState(() => {
    try { return localStorage.getItem('doen_sidebar_pinned') === 'true' } catch { return false }
  })
  const togglePinned = () => {
    setIsPinned(prev => {
      const next = !prev
      try { localStorage.setItem('doen_sidebar_pinned', String(next)) } catch { /* no-op */ }
      return next
    })
  }
  // Samenstelbaar menu: bewerk-modus + Overig mega-menu (vóór `expanded` i.v.m. gebruik).
  const [editMode, setEditMode] = useState(false)
  const [overigOpen, setOverigOpen] = useState(false)
  // Twee vaste standen, beide persistent met content ernaast:
  //  · niet gepind = uitgeklapte, gelabelde kolom
  //  · gepind      = enkel-iconen-rail (klapt NIET uit bij hover)
  const expanded = !isPinned
  const [userPopoverOpen, setUserPopoverOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ left: number; bottom: number } | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const userPopoverRef = useRef<HTMLDivElement>(null)
  const userButtonRef = useRef<HTMLButtonElement>(null)

  const isMobieleNav = useMediaQuery('(max-width: 767px)')
  const isItemVisible = useMemo(() => {
    const sidebarItems = settings?.sidebar_items
    const heeftVoorkeur = Array.isArray(sidebarItems) && sidebarItems.length > 0
    const normalized = heeftVoorkeur ? sidebarItems.map((s: string) => s === 'Kalender' ? 'Planning' : s) : []
    return (label: string) => {
      // Maatjes altijd zichtbaar (mobiel = kladblok, desktop = beheer).
      if (label === 'Maatjes') return true
      if (isMobieleNav) return MOBIELE_NAV_LABELS.includes(label) || label === 'Instellingen'
      if (!heeftVoorkeur) return true
      return normalized.includes(label) || label === 'Instellingen'
    }
  }, [settings?.sidebar_items, isMobieleNav])

  const filteredNavItems = useMemo(() => ALL_NAV_ITEMS.filter(i => isItemVisible(i.label)), [isItemVisible])

  const filteredGroups = useMemo(() => {
    return NAV_GROUPS
      .map(g => ({ ...g, items: g.items.filter(i => isItemVisible(i.label)) }))
      .filter(g => g.items.length > 0)
  }, [isItemVisible])

  // ── Glijdende actieve-indicator (expanded, desktop) ──
  // Eén frosted surface die met een spring tussen items glijdt i.p.v.
  // per item een eigen vlak. Posities via rects (robuust bij scroll en
  // de inklap-animatie van bewerk-modus); ResizeObserver hermeet.
  const navListRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>())
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null)

  const mainNavActivePath = useMemo(() => {
    const all = [...filteredGroups.flatMap(g => g.items), ...(isEigenaar ? [NIEUWSBRIEF_ITEM] : []), ...(isSupportAdmin ? [SUPPORT_ITEM] : [])]
    return all.find(i => (i.path === '/' ? location.pathname === '/' : location.pathname.startsWith(i.path)))?.path ?? null
  }, [filteredGroups, isSupportAdmin, isEigenaar, location.pathname])

  useLayoutEffect(() => {
    if (!expanded) return
    const wrap = navListRef.current
    const measure = () => {
      const el = mainNavActivePath ? itemRefs.current.get(mainNavActivePath) : null
      if (!wrap || !el) { setIndicator(null); return }
      const wrapRect = wrap.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      setIndicator({ top: elRect.top - wrapRect.top, height: elRect.height })
    }
    measure()
    if (!wrap || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [expanded, mainNavActivePath, filteredGroups, isSupportAdmin])

  // ── Samenstelbaar menu (editMode/overigOpen zijn hierboven gedeclareerd) ──
  // Items die niet in het hoofdmenu staan, gegroepeerd per sectie → "Overig".
  const overigGroups = useMemo(() => {
    if (isMobieleNav) return []
    return NAV_GROUPS
      .map(g => ({ ...g, items: g.items.filter(i => !isItemVisible(i.label)) }))
      .filter(g => g.items.length > 0)
  }, [isItemVisible, isMobieleNav])
  const heeftOverig = overigGroups.length > 0

  // Huidige selectie als concrete lijst (default = alles).
  const curatedLabels = useMemo(() => {
    const pref = settings?.sidebar_items
    if (Array.isArray(pref) && pref.length > 0) return pref.map((s: string) => s === 'Kalender' ? 'Planning' : s)
    return ALL_NAV_ITEMS.map(i => i.label)
  }, [settings?.sidebar_items])

  const removeFromMenu = (label: string) => {
    if (label === 'Maatjes') return
    updateSettings({ sidebar_items: curatedLabels.filter(l => l !== label) })
  }

  // Verwijder-animatie: eerst uitfaden/dichtklappen, dan pas echt uit selectie halen.
  const [removing, setRemoving] = useState<Set<string>>(() => new Set())
  const handleRemoveAnimated = (label: string) => {
    if (label === 'Maatjes') return
    setRemoving(prev => new Set(prev).add(label))
    setTimeout(() => {
      removeFromMenu(label)
      setRemoving(prev => { const n = new Set(prev); n.delete(label); return n })
    }, 260)
  }
  const addToMenu = (label: string) => {
    if (curatedLabels.includes(label)) return
    updateSettings({ sidebar_items: [...curatedLabels, label] })
  }

  // Overig sluiten bij navigatie of Escape.
  useEffect(() => { setOverigOpen(false); setEditMode(false) }, [location.pathname])
  useEffect(() => {
    if (!overigOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOverigOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overigOpen])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const handleClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) setMobileOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEscape) }
  }, [mobileOpen])

  useEffect(() => {
    if (!userPopoverOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const inAnchor = userPopoverRef.current?.contains(target)
      const inPopover = (target as HTMLElement)?.closest?.('[data-user-popover]')
      if (!inAnchor && !inPopover) setUserPopoverOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userPopoverOpen])

  useEffect(() => {
    if (!userPopoverOpen) { setPopoverPos(null); return }
    const updatePos = () => {
      const btn = userButtonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      if (isCollapsed) {
        setPopoverPos({ left: rect.right + 12, bottom: window.innerHeight - rect.bottom })
      } else {
        setPopoverPos({ left: rect.left, bottom: window.innerHeight - rect.top + 8 })
      }
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [userPopoverOpen, isCollapsed])

  const userInitial = (user?.user_metadata?.voornaam?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const userName = user?.user_metadata?.voornaam
    ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
    : user?.email?.split('@')[0] || 'Gebruiker'

  const isActivePath = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  // ── Rail item (collapsed) ──
  const renderRailItem = (item: NavItem) => {
    const active = isActivePath(item.path)
    const Icon = item.icon

    return (
      <TooltipProvider key={item.path} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to={item.path}
              onPointerEnter={() => prefetchRoute(item.path)}
              className="relative flex items-center justify-center w-full h-11 group/rail transition-transform duration-200 active:scale-[0.94]"
            >
              {/* Actief · petrol pill (zelfde canon als de e-mail-rail);
                  idle hover · lichtere petrol-tint squircle */}
              {active
                ? <div className="doen-sidebar-active-pill absolute rounded-[12px]" style={{ insetInline: '10px', insetBlock: '4px' }} />
                : <div className="doen-sidebar-item-hover" style={{ borderRadius: '12px', insetInline: '10px', insetBlock: '4px' }} />}

              {/* Flame accent ook in rail-mode · zelfde signatuur als expanded */}
              {active && <span className="doen-sidebar-flame-accent z-10" />}

              <div
                className={cn(
                  'relative z-10 transition-transform duration-300 ease-out',
                  !active && 'group-hover/rail:scale-110',
                )}
              >
                <Icon
                  className={cn(
                    'h-[19px] w-[19px] transition-colors duration-200',
                    active
                      ? 'text-white'
                      : 'text-[#8FA0A4] dark:text-[#6A8085] group-hover/rail:text-[var(--mc)]',
                  )}
                  style={active ? undefined : ({ ['--mc']: item.color } as React.CSSProperties)}
                  strokeWidth={active ? 2.2 : 1.6}
                />
              </div>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // ── Rail divider ──
  const railDivider = (key: string) => (
    <div key={key} className="w-6 mx-auto my-2.5 doen-sidebar-divider" />
  )

  // ── Expanded item ──
  // withIndicator: de actieve surface wordt door de glijdende indicator
  // gerenderd (desktop); het item tekent dan alleen nog zijn hover-sweep.
  const renderExpandedItem = (item: NavItem, isBottom = false, withIndicator = false) => {
    const active = isActivePath(item.path)
    const Icon = item.icon
    const isRemoving = removing.has(item.label)
    const ownActive = active && (isBottom || !withIndicator || indicator === null)

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onPointerEnter={() => prefetchRoute(item.path)}
        ref={withIndicator && !isBottom
          ? (el: HTMLAnchorElement | null) => {
              if (el) itemRefs.current.set(item.path, el)
              else itemRefs.current.delete(item.path)
            }
          : undefined}
        className={cn(
          'relative flex items-center gap-[11px] px-4 mx-2 rounded-[11px] group/nav overflow-hidden transition-all duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          isBottom ? 'text-[13px]' : 'text-[13px]',
          isRemoving ? 'max-h-0 py-0 opacity-0 -translate-x-2 pointer-events-none' : 'max-h-12 py-[8.5px]',
        )}
      >
        {/* Background · frosted surface when active, soft sweep on hover */}
        {ownActive
          ? <div className="doen-sidebar-active-surface" />
          : <div className="doen-sidebar-item-hover" />}

        {/* Flame accent bar (active) */}
        {ownActive && (
          <span className="doen-sidebar-flame-accent z-10" />
        )}

        {/* Icon · bare glyph; idle muted, active + hover in the module colour */}
        <Icon
          className={cn(
            'relative z-10 h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200',
            !active && 'text-petrol/50 dark:text-[#7FB5BF]/55 group-hover/nav:text-[var(--mc)]',
          )}
          style={active ? { color: item.color } : ({ ['--mc']: item.color } as React.CSSProperties)}
          strokeWidth={1.6}
        />

        {/* Label */}
        <span className={cn(
          'relative z-10 truncate transition-colors duration-200 tracking-[-0.01em]',
          active ? 'text-petrol dark:text-foreground font-semibold' : 'text-foreground/65 font-medium group-hover/nav:text-foreground/90',
        )}>
          {item.label}
        </span>

        {/* Bewerk-modus: verwijderen naar Overig */}
        {editMode && !isBottom && item.label !== 'Maatjes' && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveAnimated(item.label) }}
            title={`${item.label} naar Overig`}
            className="relative z-20 ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#C03A18]/10 text-[#C03A18] hover:bg-[#C03A18]/20 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </NavLink>
    )
  }

  // ── Sidebar content ──
  const sidebarContent = (forMobile = false) => {
    const collapsed = forMobile ? false : !expanded

    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <NavLink
          to="/"
          className={cn(
            'flex items-center flex-shrink-0 transition-all duration-300 group/logo',
            collapsed ? 'justify-center h-[68px] px-0' : 'gap-0 h-[68px] px-6',
          )}
        >
          {collapsed ? (
            <>
              <img src="/logos/doen-app-icon.svg" alt="doen." className="h-12 w-12 transition-transform duration-300 group-hover/logo:scale-105 dark:hidden" />
              <img src="/logos/doen-app-icon-wit.svg" alt="doen." className="h-12 w-12 transition-transform duration-300 group-hover/logo:scale-105 hidden dark:block" />
            </>
          ) : (
            <>
              <img src="/logos/doen-logo.svg" alt="doen." className="h-6 transition-transform duration-300 group-hover/logo:translate-x-0.5 dark:hidden" />
              <img src="/logos/doen-logo-wit.svg" alt="doen." className="h-6 transition-transform duration-300 group-hover/logo:translate-x-0.5 hidden dark:block" />
            </>
          )}
        </NavLink>

        {/* Separator */}
        <div className={cn(collapsed ? 'mx-3' : 'mx-5')}>
          <div className="doen-sidebar-divider" />
        </div>

        {/* Main navigation · scrollt bij overflow (veel items / kleine viewport) */}
        <nav className="flex-1 flex flex-col justify-start pt-4 overflow-y-auto overflow-x-hidden min-h-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-0">
              {filteredNavItems.filter(i => WERK_ITEMS.some(w => w.path === i.path)).map(renderRailItem)}
              {railDivider('div-1')}
              {filteredNavItems.filter(i => FINANCIEEL_ITEMS.some(f => f.path === i.path)).map(renderRailItem)}
              {railDivider('div-2')}
              {filteredNavItems.filter(i => PLANNING_ITEMS.some(p => p.path === i.path)).map(renderRailItem)}
              {railDivider('div-3')}
              {filteredNavItems.filter(i => COMMUNICATIE_ITEMS.some(c => c.path === i.path)).map(renderRailItem)}
              {isEigenaar && renderRailItem(NIEUWSBRIEF_ITEM)}
              {isSupportAdmin && (
                <>
                  {railDivider('div-support')}
                  <div className="relative w-full">
                    {renderRailItem(SUPPORT_ITEM)}
                    {supportAttentie > 0 && (
                      <span
                        className="absolute top-1 right-2 rounded-full pointer-events-none"
                        style={{ width: 8, height: 8, backgroundColor: '#F15025', border: '1.5px solid var(--background, #fff)' }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div
              ref={forMobile ? undefined : navListRef}
              className="relative px-0 animate-in fade-in duration-200"
            >
              {/* Glijdende actieve surface · spring-curve tussen items */}
              {!forMobile && indicator && (
                <div
                  aria-hidden
                  className="absolute left-2 right-2 pointer-events-none transition-[top,height] duration-[320ms] ease-[cubic-bezier(0.3,0.9,0.25,1)]"
                  style={{ top: indicator.top, height: indicator.height }}
                >
                  <div className="doen-sidebar-active-surface" />
                  <span className="doen-sidebar-flame-accent" />
                </div>
              )}
              {filteredGroups.map((group, gi) => (
                <div key={group.section} className={gi > 0 ? 'mt-7' : ''}>
                  <div className="doen-sidebar-section">{group.section}</div>
                  <div className="space-y-[1px]">
                    {group.items.map(item => renderExpandedItem(item, false, !forMobile))}
                  </div>
                </div>
              ))}
              {isEigenaar && (
                <div className="mt-7">
                  <div className="doen-sidebar-section">NIEUWSBRIEF</div>
                  <div className="space-y-[1px]">
                    {renderExpandedItem(NIEUWSBRIEF_ITEM, false, !forMobile)}
                  </div>
                </div>
              )}
              {isSupportAdmin && (
                <div className="mt-7">
                  <div className="doen-sidebar-section">SUPPORT</div>
                  <div className="space-y-[1px] relative">
                    {renderExpandedItem(SUPPORT_ITEM, false, !forMobile)}
                    {supportAttentie > 0 && (
                      <span
                        className="absolute right-5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center text-white font-bold pointer-events-none"
                        style={{ minWidth: 18, height: 18, padding: '0 5px', fontSize: 10, borderRadius: 999, backgroundColor: '#F15025' }}
                      >
                        {supportAttentie}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Overig · opent het mega-menu met niet-gekozen items */}
              {heeftOverig && (
                <div className="mt-7">
                  <div className="doen-sidebar-section">OVERIG</div>
                  <button
                    type="button"
                    onClick={() => setOverigOpen(v => !v)}
                    className="relative flex w-full items-center gap-[11px] py-[8.5px] px-4 mx-2 rounded-[11px] group/nav text-[13px]"
                  >
                    {overigOpen ? <div className="doen-sidebar-active-surface" /> : <div className="doen-sidebar-item-hover" />}
                    <LayoutGrid className="relative z-10 h-[18px] w-[18px] flex-shrink-0 text-petrol/50 dark:text-[#7FB5BF]/55 group-hover/nav:text-petrol transition-colors" strokeWidth={1.6} />
                    <span className="relative z-10 truncate font-medium tracking-[-0.01em] text-foreground/65 group-hover/nav:text-foreground/90">Overig</span>
                    <span className="relative z-10 ml-auto rounded-full bg-petrol/[0.07] px-1.5 text-[10px] font-mono tabular-nums text-petrol/60">{overigGroups.reduce((n, g) => n + g.items.length, 0)}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom section · pushed to bottom */}
        <div className={cn(
          'flex-shrink-0',
          collapsed ? 'pb-4 pt-2 flex flex-col items-center gap-1' : 'pb-4 pt-2 space-y-[2px]',
        )}>
          {/* Utilities · compacte icoon-rij (bewerken · Overig · vastzetten) */}
          {!forMobile && (collapsed ? (
            <div className="flex flex-col items-center gap-1">
              {heeftOverig && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setOverigOpen(v => !v)}
                        aria-pressed={overigOpen}
                        className={cn(
                          'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                          overigOpen ? 'text-petrol bg-petrol/[0.08]' : 'text-muted-foreground/45 hover:text-petrol hover:bg-black/[0.03]',
                        )}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Overig</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={togglePinned}
                      aria-pressed={isPinned}
                      className={cn(
                        'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                        isPinned ? 'text-petrol/70 hover:text-petrol' : 'text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-black/[0.03]',
                      )}
                    >
                      {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{isPinned ? 'Menu uitklappen' : 'Inklappen tot iconen'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 mx-4 mb-1">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setEditMode(v => !v)}
                      aria-pressed={editMode}
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                        editMode ? 'text-petrol bg-petrol/[0.08]' : 'text-muted-foreground/45 hover:text-foreground/80 hover:bg-black/[0.03]',
                      )}
                    >
                      {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-[15px] h-[15px]" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{editMode ? 'Klaar met aanpassen' : 'Menu aanpassen'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={togglePinned}
                      aria-pressed={isPinned}
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                        isPinned ? 'text-petrol/80 hover:text-petrol bg-petrol/[0.05]' : 'text-muted-foreground/45 hover:text-foreground/80 hover:bg-black/[0.03]',
                      )}
                    >
                      {isPinned ? <PinOff className="w-[15px] h-[15px]" /> : <Pin className="w-[15px] h-[15px]" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{isPinned ? 'Menu uitklappen' : 'Inklappen tot iconen'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}

          {/* Divider */}
          <div className={cn('mb-3', collapsed ? 'w-6 mx-auto' : 'mx-5')}>
            <div className="doen-sidebar-divider" />
          </div>

          {/* Instellingen · Importeren leeft nu onder Instellingen → Importeren */}
          {collapsed ? renderRailItem(SETTINGS_ITEM) : renderExpandedItem(SETTINGS_ITEM, true)}

          {/* User avatar */}
          {user && (
            <div ref={userPopoverRef} className={cn('relative mt-1', collapsed ? 'flex justify-center' : '')}>
              <button
                ref={userButtonRef}
                onClick={() => setUserPopoverOpen(!userPopoverOpen)}
                className={cn(
                  'flex items-center transition-all duration-300 rounded-[12px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
                  collapsed ? 'w-11 h-11 justify-center' : 'gap-2.5 h-11 px-3 mx-2 w-[calc(100%-16px)]',
                )}
              >
                <div
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 doen-sidebar-avatar"
                  style={{ background: 'linear-gradient(145deg, rgba(26,83,92,0.12), rgba(26,83,92,0.04))' }}
                >
                  <span className="text-[12px] font-bold text-petrol dark:text-[#7FB5BF]">{userInitial}</span>
                </div>
                {!collapsed && (
                  <p className="flex-1 min-w-0 text-left text-foreground text-[13px] font-medium truncate leading-tight">{userName}</p>
                )}
              </button>

              {/* User popover · via portal naar body, anders valt hij binnen de
                  stacking context van de aside (z-40) deels achter de content */}
              {userPopoverOpen && popoverPos && createPortal(
                <div
                  data-user-popover
                  className="fixed z-50 w-60 overflow-hidden rounded-[16px] bg-popover border border-border/70 shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] p-1.5"
                  style={{
                    left: popoverPos.left,
                    bottom: popoverPos.bottom,
                  }}
                >
                  <div className="flex items-center gap-2.5 px-2 py-2">
                    <span className="w-9 h-9 rounded-[9px] flex items-center justify-center bg-petrol text-white font-bold text-[14px] flex-shrink-0">{userInitial}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{userName}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  <div className="h-px bg-border/50 mx-2 my-1" />

                  <button
                    onClick={() => { setUserPopoverOpen(false); navigate('/instellingen') }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <SlidersHorizontal className="w-[17px] h-[17px] text-muted-foreground" /> Profiel
                  </button>
                  <button
                    onClick={() => { setUserPopoverOpen(false); navigate('/instellingen?tab=abonnement') }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <CreditCard className="w-[17px] h-[17px] text-muted-foreground" /> Abonnement
                  </button>
                  <button
                    onClick={() => { setUserPopoverOpen(false); navigate('/kennisbank') }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <BookOpen className="w-[17px] h-[17px] text-muted-foreground" /> Kennisbank
                  </button>
                  <button
                    onClick={() => setAppThemeId(isDarkTheme ? 'normaal' : 'dark')}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    {isDarkTheme
                      ? <Sun className="w-[17px] h-[17px] text-muted-foreground" />
                      : <Moon className="w-[17px] h-[17px] text-muted-foreground" />}
                    {isDarkTheme ? 'Lichte modus' : 'Donkere modus'}
                  </button>
                  <button
                    onClick={() => { setUserPopoverOpen(false); setLayoutMode('topnav') }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <PanelTop className="w-[17px] h-[17px] text-muted-foreground" /> Top navigatie
                  </button>

                  <div className="h-px bg-border/50 mx-2 my-1" />

                  <button
                    onClick={() => { setUserPopoverOpen(false); logout() }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-flame hover:bg-flame/[0.07] transition-colors"
                  >
                    <LogOut className="w-[17px] h-[17px]" /> Uitloggen
                  </button>
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-2.5 left-2.5 z-50 md:hidden shadow-lg border border-border/50 rounded-xl w-9 h-9"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Sluit menu' : 'Open menu'}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden" aria-hidden="true" />
      )}

      {/* Mobile sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 flex flex-col w-64 doen-sidebar z-50 transform transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent(true)}
      </aside>

      {/* Desktop sidebar · default persistente kolom (content leeft ernaast);
          gepind = ingeklapte rail met hover-peek als overlay. De reserveer-breedte
          beweegt mee zodat content inspringt wanneer de kolom uitgeklapt vast staat. */}
      {isDesktop && (
        <div
          className="flex-shrink-0 h-screen transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: isPinned ? RAIL_WIDTH : EXPANDED_WIDTH }}
        >
          <aside
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={cn(
              'fixed inset-y-0 left-0 z-40 flex flex-col h-screen doen-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden',
            )}
            style={{ width: expanded ? EXPANDED_WIDTH : RAIL_WIDTH }}
          >
            {sidebarContent(false)}
          </aside>
        </div>
      )}

      {/* Overig mega-menu · schuift uit naast de sidebar */}
      {isDesktop && (
        <>
          {overigOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/[0.04] animate-in fade-in duration-200"
              onClick={() => setOverigOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            className={cn(
              'fixed inset-y-0 z-40 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
              overigOpen ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0 pointer-events-none',
            )}
            style={{ left: expanded ? EXPANDED_WIDTH : RAIL_WIDTH }}
          >
            <div className="flex h-full w-[300px] flex-col overflow-y-auto border-l border-black/5 doen-sidebar-glass py-5 px-2.5">
              <div className="mb-3 flex items-center justify-between px-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Overig</span>
                <button
                  type="button"
                  onClick={() => setOverigOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-black/[0.04] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {overigGroups.map((group, gi) => (
                <div key={group.section} className={gi > 0 ? 'mt-5' : ''}>
                  <div className="doen-sidebar-section">{group.section}</div>
                  <div className="space-y-[1px]">
                    {group.items.map(item => {
                      const Icon = item.icon
                      return (
                        <div key={item.path} className="group/ov relative flex items-center rounded-[11px]">
                          <NavLink
                            to={item.path}
                            onClick={() => setOverigOpen(false)}
                            className="relative flex flex-1 items-center gap-[11px] py-[8.5px] px-4 rounded-[11px] group/nav"
                          >
                            <div className="doen-sidebar-item-hover" />
                            <Icon
                              className="relative z-10 h-[18px] w-[18px] flex-shrink-0 text-petrol/50 dark:text-[#7FB5BF]/55 group-hover/nav:text-[var(--mc)] transition-colors duration-200"
                              style={{ ['--mc']: item.color } as React.CSSProperties}
                              strokeWidth={1.6}
                            />
                            <span className="relative z-10 truncate text-[13px] font-medium tracking-[-0.01em] text-foreground/65 group-hover/nav:text-foreground/90">{item.label}</span>
                          </NavLink>
                          <button
                            type="button"
                            onClick={() => addToMenu(item.label)}
                            title={`${item.label} aan menu toevoegen`}
                            className="absolute right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full text-petrol/55 opacity-0 group-hover/ov:opacity-100 hover:bg-petrol/10 hover:text-petrol transition-all"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
