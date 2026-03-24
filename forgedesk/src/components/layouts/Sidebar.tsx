import React, { useEffect, useRef, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderKanban, Users, FileText,
  Mail, Calendar, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X, CheckCircle,
  Receipt, ClipboardCheck, Globe, Upload,
  Moon, Sun, CreditCard, PiggyBank,
  LayoutDashboard,
  type LucideIcon
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
  { label: 'Projecten', icon: FolderKanban, path: '/projecten', color: '#1A535C' },
  { label: 'Offertes', icon: FileText, path: '/offertes', color: '#F15025' },
  { label: 'Facturen', icon: Receipt, path: '/facturen', color: '#2D6B48' },
  { label: 'Klanten', icon: Users, path: '/klanten', color: '#3A6B8C' },
  { label: 'Werkbonnen', icon: ClipboardCheck, path: '/werkbonnen', color: '#C44830' },
]

const PLANNING_ITEMS: NavItem[] = [
  { label: 'Planning', icon: Calendar, path: '/planning', color: '#9A5A48' },
  { label: 'Taken', icon: CheckCircle, path: '/taken', color: '#5A5A55' },
]

const COMMUNICATIE_ITEMS: NavItem[] = [
  { label: 'Email', icon: Mail, path: '/email', color: '#6A5A8A' },
  { label: 'Portaal', icon: Globe, path: '/portalen', color: '#6A5A8A' },
]

const BEHEER_ITEMS: NavItem[] = [
  { label: 'Financieel', icon: PiggyBank, path: '/financieel', color: '#2D6B48' },
]

const IMPORTEREN_ITEM: NavItem = { label: 'Importeren', icon: Upload, path: '/importeren', color: '#1A535C' }
const SETTINGS_ITEM: NavItem = { label: 'Instellingen', icon: Settings, path: '/instellingen', color: '#5A5A55' }

const NAV_GROUPS: NavGroup[] = [
  { section: 'WERK', items: WERK_ITEMS },
  { section: 'PLANNING', items: PLANNING_ITEMS },
  { section: 'COMMUNICATIE', items: COMMUNICATIE_ITEMS },
  { section: 'BEHEER', items: BEHEER_ITEMS },
]

// Flat list for rail mode (all items in order, no Dashboard)
const ALL_NAV_ITEMS: NavItem[] = [...WERK_ITEMS, ...PLANNING_ITEMS, ...COMMUNICATIE_ITEMS, ...BEHEER_ITEMS, IMPORTEREN_ITEM]

// Light background colors per module for active/badge states
const MODULE_LIGHT: Record<string, string> = {
  '#1A535C': '#E2F0F0',
  '#F15025': '#FDE8E2',
  '#2D6B48': '#E4F0EA',
  '#3A6B8C': '#E5ECF6',
  '#C44830': '#FAE5E0',
  '#9A5A48': '#F2E8E5',
  '#5A5A55': '#EEEEED',
  '#6A5A8A': '#EEE8F5',
}

const MODULE_TEXT: Record<string, string> = {
  '#F15025': '#C03A18',
  '#2D6B48': '#2D6B48',
  '#5A5A55': '#4A4A45',
  '#6A5A8A': '#5A4A78',
}

// Bright icon tints for dark sidebar — every module gets a vibrant, readable variant
const ICON_BRIGHT: Record<string, string> = {
  '#1A535C': '#7EC8D0', // Petrol → bright teal
  '#F15025': '#FF8A6A', // Flame → bright coral
  '#2D6B48': '#6CC98A', // Green → bright mint
  '#3A6B8C': '#7AAED4', // Blue → bright sky
  '#C44830': '#F0826A', // Werkbonnen → bright salmon
  '#9A5A48': '#D4927E', // Terracotta → bright warm
  '#5A5A55': '#A8A8A2', // Grey → bright silver
  '#6A5A8A': '#A896CC', // Purple → bright lavender
}

export function Sidebar() {
  const { isCollapsed, toggleSidebar, setLayoutMode } = useSidebar()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { settings } = useAppSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userPopoverOpen, setUserPopoverOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const userPopoverRef = useRef<HTMLDivElement>(null)

  // Filter helpers
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

  // Close mobile on navigate
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Close mobile on outside click / escape
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

  // Close user popover on outside click
  useEffect(() => {
    if (!userPopoverOpen) return
    const handleClick = (e: MouseEvent) => {
      if (userPopoverRef.current && !userPopoverRef.current.contains(e.target as Node)) setUserPopoverOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userPopoverOpen])

  const userInitial = (user?.user_metadata?.voornaam?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const userName = user?.user_metadata?.voornaam
    ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
    : user?.email?.split('@')[0] || 'Gebruiker'

  const isActivePath = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const brightIcon = (color: string) => ICON_BRIGHT[color] || '#FFFFFF'

  // ── Rail item (collapsed) ──
  const renderRailItem = (item: NavItem) => {
    const active = isActivePath(item.path)
    const Icon = item.icon
    const iconColor = active ? '#FFFFFF' : brightIcon(item.color)

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className="relative flex flex-col items-center justify-center w-full py-2 gap-0.5 group/rail"
      >
        {/* Active pill background */}
        <div
          className={cn(
            'absolute inset-x-2 inset-y-0 rounded-[10px] transition-all duration-200',
            active
              ? 'doen-sidebar-active-pill opacity-100'
              : 'opacity-0 group-hover/rail:opacity-100 group-hover/rail:bg-white/[0.06]',
          )}
        />

        {/* Flame left accent for active */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ backgroundColor: '#F15025' }} />
        )}

        {/* Icon */}
        <div className="relative z-10">
          <Icon
            className={cn('w-[20px] h-[20px] transition-all duration-200', active && 'drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]')}
            style={{ color: iconColor }}
            strokeWidth={active ? 2.2 : 1.7}
          />
        </div>

        {/* Label */}
        <span
          className={cn(
            'relative z-10 text-center leading-tight transition-all duration-200',
            active ? 'text-white font-semibold' : 'text-white/50 font-medium group-hover/rail:text-white/80',
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
    <div key={key} className="w-8 mx-auto my-1.5" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
  )

  // ── Expanded item ──
  const renderExpandedItem = (item: NavItem) => {
    const active = isActivePath(item.path)
    const Icon = item.icon
    const iconColor = active ? '#FFFFFF' : brightIcon(item.color)

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className="relative flex items-center gap-2.5 py-[7px] px-2.5 mx-1 rounded-[10px] text-[13px] group/nav"
      >
        {/* Background layer */}
        <div
          className={cn(
            'absolute inset-0 rounded-[10px] transition-all duration-200',
            active
              ? 'doen-sidebar-active-pill opacity-100'
              : 'opacity-0 group-hover/nav:opacity-100 group-hover/nav:bg-white/[0.06]',
          )}
        />

        {/* Flame left accent for active */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ backgroundColor: '#F15025' }} />
        )}

        {/* Icon container */}
        <div
          className={cn(
            'relative z-10 w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all duration-200',
            active ? 'bg-white/20 shadow-[0_0_12px_rgba(255,255,255,0.1)]' : 'bg-white/[0.07] group-hover/nav:bg-white/[0.12]',
          )}
        >
          <Icon
            className={cn('w-[15px] h-[15px] transition-all duration-200', active && 'drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]')}
            style={{ color: iconColor }}
            strokeWidth={active ? 2.2 : 1.7}
          />
        </div>

        {/* Label */}
        <span className={cn(
          'relative z-10 truncate transition-all duration-200',
          active ? 'text-white font-semibold' : 'text-white/70 font-medium group-hover/nav:text-white/95',
        )}>
          {item.label}
        </span>

        {/* Active glow indicator dot */}
        {active && (
          <div className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-[#F15025] shadow-[0_0_6px_#F15025]" />
        )}
      </NavLink>
    )
  }

  // ── Sidebar content ──
  const sidebarContent = (forMobile = false) => {
    const collapsed = forMobile ? false : isCollapsed

    return (
      <>
        {/* Logo — navigates to dashboard */}
        <NavLink
          to="/"
          className={cn(
            'flex items-center flex-shrink-0 transition-all duration-200',
            collapsed ? 'justify-center h-[56px] px-0' : 'gap-0 h-[56px] px-5',
          )}
        >
          {collapsed ? (
            <span className="text-[18px] font-extrabold text-white tracking-tight">d<span style={{ color: '#F15025' }}>.</span></span>
          ) : (
            <span className="text-[20px] font-extrabold text-white tracking-[-0.03em]">doen<span style={{ color: '#F15025' }}>.</span></span>
          )}
        </NavLink>

        {/* Thin separator under logo */}
        <div className={cn('mx-3 mb-1', collapsed && 'mx-4')} style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {collapsed ? (
            // ── Rail mode ──
            <div className="flex flex-col items-center gap-0">
              {filteredNavItems.filter(i => WERK_ITEMS.some(w => w.path === i.path)).map(renderRailItem)}
              {railDivider('div-1')}
              {filteredNavItems.filter(i => PLANNING_ITEMS.some(p => p.path === i.path)).map(renderRailItem)}
              {railDivider('div-2')}
              {filteredNavItems.filter(i => COMMUNICATIE_ITEMS.some(c => c.path === i.path)).map(renderRailItem)}
              {railDivider('div-3')}
              {filteredNavItems.filter(i => BEHEER_ITEMS.some(b => b.path === i.path)).map(renderRailItem)}
            </div>
          ) : (
            // ── Expanded mode ──
            <div className="px-1">
              {filteredGroups.map((group) => (
                <div key={group.section}>
                  <div className="doen-sidebar-section">{group.section}</div>
                  <div className="space-y-[2px]">
                    {group.items.map(renderExpandedItem)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom section */}
        <div className={cn(
          'flex-shrink-0',
          collapsed ? 'py-3 flex flex-col items-center gap-1' : 'py-2 px-1 space-y-[2px]',
        )}>
          {/* Divider */}
          <div className={cn('mb-2', collapsed ? 'w-8 mx-auto' : 'mx-3')} style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

          {/* Importeren */}
          {collapsed ? renderRailItem(IMPORTEREN_ITEM) : renderExpandedItem(IMPORTEREN_ITEM)}
          {/* Instellingen */}
          {collapsed ? renderRailItem(SETTINGS_ITEM) : renderExpandedItem(SETTINGS_ITEM)}

          {/* Collapse toggle (desktop only) */}
          {!forMobile && (
            collapsed ? (
              <button
                onClick={toggleSidebar}
                className="w-8 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200 mt-1"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center h-7 px-2.5 mx-1 gap-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200 w-auto mt-1"
              >
                <ChevronLeft className="w-3 h-3" />
                <span className="text-[10px] font-medium">Inklappen</span>
              </button>
            )
          )}

          {/* User avatar */}
          {user && (
            <div ref={userPopoverRef} className={cn('relative mt-1', collapsed ? 'flex justify-center' : '')}>
              <button
                onClick={() => setUserPopoverOpen(!userPopoverOpen)}
                className={cn(
                  'flex items-center transition-all duration-200 rounded-[10px] hover:bg-white/[0.06]',
                  collapsed ? 'w-10 h-10 justify-center' : 'gap-2.5 h-11 px-3 mx-1 w-[calc(100%-8px)]',
                )}
              >
                <div
                  className="w-[28px] h-[28px] rounded-full flex items-center justify-center flex-shrink-0 ring-[1.5px] ring-white/20"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))' }}
                >
                  <span className="text-[10px] font-bold text-white">{userInitial}</span>
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white/90 text-[12px] font-medium truncate leading-tight">{userName}</p>
                    <p className="text-white/40 text-[10px] truncate leading-tight">{user.email}</p>
                  </div>
                )}
              </button>

              {/* User popover */}
              {userPopoverOpen && (
                <div className={cn(
                  'absolute z-50 w-56 bg-card border border-border/60 rounded-xl shadow-2xl shadow-[rgba(120,90,50,0.10)] overflow-hidden animate-scale-in',
                  collapsed ? 'left-full bottom-0 ml-3' : 'left-0 bottom-full mb-2',
                )}>
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-border/40">
                    <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                  </div>

                  {/* Quick actions */}
                  <div className="py-1.5">
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/instellingen') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/40 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      Profiel
                    </button>
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/instellingen?tab=abonnement') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/40 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      Abonnement
                    </button>
                  </div>

                  {/* Appearance & layout */}
                  <div className="border-t border-border/40 py-1.5">
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/40 transition-colors"
                    >
                      {theme === 'dark' ? (
                        <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-border/40 py-1.5">
                    <button
                      onClick={() => { setUserPopoverOpen(false); logout() }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Uitloggen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </>
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

      {/* Mobile sidebar (always expanded) */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 flex flex-col w-64 doen-sidebar z-50 transform transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 h-screen doen-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
        style={{ width: isCollapsed ? RAIL_WIDTH : EXPANDED_WIDTH }}
      >
        {sidebarContent(false)}
      </aside>
    </>
  )
}
