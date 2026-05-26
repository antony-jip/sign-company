import React, { useEffect, useRef, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, LogOut, Menu, X,
  Moon, Sun, CreditCard, PanelTop,
  LayoutDashboard, CircleUserRound, BookOpen,
  Hammer, FileText, Building2, Wrench, Wand2, Banknote, Inbox,
  TrendingUp, Calendar, ListChecks, Send, Globe, SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar, RAIL_WIDTH, EXPANDED_WIDTH } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { Button } from '@/components/ui/button'

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
  { label: 'Visualizer', icon: Wand2, path: '/visualizer', color: '#9A5A48' },
]

const FINANCIEEL_ITEMS: NavItem[] = [
  { label: 'Facturen', icon: Banknote, path: '/facturen', color: '#2D6B48' },
  { label: 'Inkoopfacturen', icon: Inbox, path: '/inkoopfacturen', color: '#C44830' },
  { label: 'Financieel', icon: TrendingUp, path: '/financieel', color: '#2D6B48' },
]

const PLANNING_ITEMS: NavItem[] = [
  { label: 'Planning', icon: Calendar, path: '/planning', color: '#9A5A48' },
  { label: 'Taken', icon: ListChecks, path: '/taken', color: '#5A5A55' },
]

const COMMUNICATIE_ITEMS: NavItem[] = [
  { label: 'Email', icon: Send, path: '/email', color: '#6A5A8A' },
  { label: 'Portaal', icon: Globe, path: '/portalen', color: '#6A5A8A' },
]

const SETTINGS_ITEM: NavItem = { label: 'Instellingen', icon: SlidersHorizontal, path: '/instellingen', color: '#5A5A55' }

const NAV_GROUPS: NavGroup[] = [
  { section: 'WERK', items: WERK_ITEMS },
  { section: 'FINANCIEEL', items: FINANCIEEL_ITEMS },
  { section: 'PLANNING', items: PLANNING_ITEMS },
  { section: 'COMMUNICATIE', items: COMMUNICATIE_ITEMS },
]

// Flat list for rail mode
const ALL_NAV_ITEMS: NavItem[] = [...WERK_ITEMS, ...FINANCIEEL_ITEMS, ...PLANNING_ITEMS, ...COMMUNICATIE_ITEMS]

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
  const { isCollapsed, toggleSidebar, setLayoutMode } = useSidebar()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { settings } = useAppSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userPopoverOpen, setUserPopoverOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ left: number; bottom: number } | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const userPopoverRef = useRef<HTMLDivElement>(null)
  const userButtonRef = useRef<HTMLButtonElement>(null)

  const isItemVisible = useMemo(() => {
    const sidebarItems = settings?.sidebar_items
    if (!Array.isArray(sidebarItems) || sidebarItems.length === 0) return () => true
    const normalized = sidebarItems.map((s: string) => s === 'Kalender' ? 'Planning' : s)
    return (label: string) => normalized.includes(label) || label === 'Instellingen'
  }, [settings?.sidebar_items])

  const filteredNavItems = useMemo(() => ALL_NAV_ITEMS.filter(i => isItemVisible(i.label)), [isItemVisible])

  const filteredGroups = useMemo(() => {
    return NAV_GROUPS
      .map(g => ({ ...g, items: g.items.filter(i => isItemVisible(i.label)) }))
      .filter(g => g.items.length > 0)
  }, [isItemVisible])

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
      <NavLink
        key={item.path}
        to={item.path}
        className="relative flex flex-col items-center justify-center w-full py-2.5 gap-1 group/rail"
      >
        {/* Hover bg */}
        <div className="doen-sidebar-item-hover" style={{ borderRadius: '12px', insetInline: '8px' }} />

        {active && (
          <div className="absolute inset-x-[8px] inset-y-0.5 rounded-[12px] doen-sidebar-active-pill" />
        )}

        {active && <div className="doen-sidebar-flame-accent" />}

        <div
          className={cn(
            'relative z-10 transition-all duration-300 ease-out',
            !active && 'group-hover/rail:scale-110',
          )}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} color={item.color} />
        </div>

        <span
          className={cn(
            'relative z-10 text-center leading-tight transition-all duration-300',
            active ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium group-hover/rail:text-foreground',
          )}
          style={{ fontSize: '9px' }}
        >
          {item.label}
        </span>
      </NavLink>
    )
  }

  // ── Rail divider ──
  const railDivider = (key: string) => (
    <div key={key} className="w-6 mx-auto my-2.5" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)' }} />
  )

  // ── Expanded item ──
  const renderExpandedItem = (item: NavItem, isBottom = false) => {
    const active = isActivePath(item.path)
    const Icon = item.icon

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'relative flex items-center gap-3 py-[9px] px-4 mx-2 rounded-[11px] group/nav',
          isBottom ? 'text-[13px]' : 'text-[13.5px]',
        )}
      >
        {/* Hover sweep background */}
        <div className="doen-sidebar-item-hover" />

        {/* Active pill */}
        {active && (
          <div className="absolute inset-0 rounded-[12px] doen-sidebar-active-pill" />
        )}

        {/* Flame left accent */}
        {active && <div className="doen-sidebar-flame-accent" style={{ left: '4px' }} />}

        {/* Icon — rounded container with module color tint */}
        <div
          className={cn(
            'relative z-10 w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all duration-300',
            !active && 'group-hover/nav:brightness-105',
          )}
          style={{
            backgroundColor: active
              ? `${item.color}22`
              : `${item.color}12`,
          }}
        >
          <Icon
            className="h-[17px] w-[17px]"
            strokeWidth={active ? 2.25 : 1.75}
            color={item.color}
          />
        </div>

        {/* Label */}
        <span className={cn(
          'relative z-10 truncate transition-all duration-300 tracking-[-0.01em]',
          active ? 'text-foreground font-semibold' : 'text-foreground/70 font-medium group-hover/nav:text-foreground',
        )}>
          {item.label}
        </span>

        {/* Active dot */}
        {active && (
          <div className="relative z-10 ml-auto doen-sidebar-active-dot" />
        )}
      </NavLink>
    )
  }

  // ── Sidebar content ──
  const sidebarContent = (forMobile = false) => {
    const collapsed = forMobile ? false : isCollapsed

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
            <img src="/logos/doen-app-icon.svg" alt="doen." className="h-16 w-16 transition-transform duration-300 group-hover/logo:scale-105" />
          ) : (
            <img src="/logos/doen-logo.svg" alt="doen." className="h-6 transition-transform duration-300 group-hover/logo:translate-x-0.5" />
          )}
        </NavLink>

        {/* Separator */}
        <div className={cn(collapsed ? 'mx-4' : 'mx-5')}>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.07) 20%, rgba(0,0,0,0.07) 80%, transparent 100%)' }} />
        </div>

        {/* Main navigation — scrollt bij overflow (veel items / kleine viewport) */}
        <nav className="flex-1 flex flex-col justify-start pt-4 overflow-y-auto min-h-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-0">
              {filteredNavItems.filter(i => WERK_ITEMS.some(w => w.path === i.path)).map(renderRailItem)}
              {railDivider('div-1')}
              {filteredNavItems.filter(i => FINANCIEEL_ITEMS.some(f => f.path === i.path)).map(renderRailItem)}
              {railDivider('div-2')}
              {filteredNavItems.filter(i => PLANNING_ITEMS.some(p => p.path === i.path)).map(renderRailItem)}
              {railDivider('div-3')}
              {filteredNavItems.filter(i => COMMUNICATIE_ITEMS.some(c => c.path === i.path)).map(renderRailItem)}
            </div>
          ) : (
            <div className="px-0">
              {filteredGroups.map((group, gi) => (
                <div key={group.section} className={gi > 0 ? 'mt-7' : ''}>
                  <div className="doen-sidebar-section">{group.section}</div>
                  <div className="space-y-[1px]">
                    {group.items.map(item => renderExpandedItem(item))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom section — pushed to bottom */}
        <div className={cn(
          'flex-shrink-0',
          collapsed ? 'pb-4 pt-2 flex flex-col items-center gap-1' : 'pb-4 pt-2 space-y-[2px]',
        )}>
          {/* Divider */}
          <div className={cn('mb-3', collapsed ? 'w-6 mx-auto' : 'mx-5')}>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0.05) 80%, transparent 100%)' }} />
          </div>

          {/* Instellingen — Importeren leeft nu onder Instellingen → Importeren */}
          {collapsed ? renderRailItem(SETTINGS_ITEM) : renderExpandedItem(SETTINGS_ITEM, true)}

          {/* Collapse toggle */}
          {!forMobile && (
            collapsed ? (
              <button
                onClick={toggleSidebar}
                className="w-9 h-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-all duration-300 mt-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={toggleSidebar}
                className="flex items-center gap-2 h-8 px-4 mx-2 rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-all duration-300 mt-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">Inklappen</span>
              </button>
            )
          )}

          {/* User avatar */}
          {user && (
            <div ref={userPopoverRef} className={cn('relative mt-1', collapsed ? 'flex justify-center' : '')}>
              <button
                ref={userButtonRef}
                onClick={() => setUserPopoverOpen(!userPopoverOpen)}
                className={cn(
                  'flex items-center transition-all duration-300 rounded-[12px] hover:bg-black/[0.04]',
                  collapsed ? 'w-11 h-11 justify-center' : 'gap-3 h-[52px] px-4 mx-2 w-[calc(100%-16px)]',
                )}
              >
                <div
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 doen-sidebar-avatar"
                  style={{ background: 'linear-gradient(145deg, rgba(26,83,92,0.12), rgba(26,83,92,0.04))' }}
                >
                  <span className="text-[13px] font-bold text-[#1A535C]">{userInitial}</span>
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-foreground text-[13px] font-medium truncate leading-tight">{userName}</p>
                    <p className="text-muted-foreground text-[10px] truncate leading-tight mt-0.5">{user.email}</p>
                  </div>
                )}
              </button>

              {/* User popover */}
              {userPopoverOpen && popoverPos && (
                <div
                  data-user-popover
                  className="fixed z-50 w-56 overflow-hidden rounded-[14px] bg-popover border border-border shadow-[0_16px_48px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)]"
                  style={{
                    left: popoverPos.left,
                    bottom: popoverPos.bottom,
                  }}
                >
                  <div className="px-4 py-3.5 border-b border-border">
                    <p className="text-[13px] font-semibold text-foreground truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/instellingen') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-foreground/70 hover:text-foreground hover:bg-muted transition-all duration-200"
                    >
                      <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} color="#9B9B95" />
                      Profiel
                    </button>
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/instellingen?tab=abonnement') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-foreground/70 hover:text-foreground hover:bg-muted transition-all duration-200"
                    >
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      Abonnement
                    </button>
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/kennisbank') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-foreground/70 hover:text-foreground hover:bg-muted transition-all duration-200"
                    >
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      Kennisbank
                    </button>
                  </div>

                  <div className="py-1 border-t border-border">
                    <button
                      onClick={() => { setUserPopoverOpen(false); setLayoutMode('topnav') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-foreground/70 hover:text-foreground hover:bg-muted transition-all duration-200"
                    >
                      <PanelTop className="w-4 h-4 text-muted-foreground" />
                      Top navigatie
                    </button>
                  </div>

                  <div className="py-1 border-t border-border">
                    <button
                      onClick={() => { setUserPopoverOpen(false); logout() }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-[#F15025] hover:bg-[#F15025]/[0.06] transition-all duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      Uitloggen
                    </button>
                  </div>
                </div>
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

      {/* Desktop sidebar — only rendered on md+ to prevent mobile layout issues */}
      {isDesktop && (
        <aside
          className="flex flex-col flex-shrink-0 h-screen doen-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
          style={{ width: isCollapsed ? RAIL_WIDTH : EXPANDED_WIDTH }}
        >
          {sidebarContent(false)}
        </aside>
      )}
    </>
  )
}
