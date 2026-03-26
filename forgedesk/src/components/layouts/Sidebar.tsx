import React, { useEffect, useRef, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderKanban, Users, FileText,
  Mail, Calendar, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X, CheckCircle,
  Receipt, ClipboardCheck, Globe, Upload,
  Moon, Sun, CreditCard, PiggyBank, PanelTop,
  LayoutDashboard, Sparkles, BookOpen,
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
  { label: 'Visualizer', icon: Sparkles, path: '/visualizer', color: '#9A5A48' },
]

const IMPORTEREN_ITEM: NavItem = { label: 'Importeren', icon: Upload, path: '/importeren', color: '#1A535C' }
const SETTINGS_ITEM: NavItem = { label: 'Instellingen', icon: Settings, path: '/instellingen', color: '#5A5A55' }

const NAV_GROUPS: NavGroup[] = [
  { section: 'WERK', items: WERK_ITEMS },
  { section: 'PLANNING', items: PLANNING_ITEMS },
  { section: 'COMMUNICATIE', items: COMMUNICATIE_ITEMS },
  { section: 'BEHEER', items: BEHEER_ITEMS },
]

// Flat list for rail mode
const ALL_NAV_ITEMS: NavItem[] = [...WERK_ITEMS, ...PLANNING_ITEMS, ...COMMUNICATIE_ITEMS, ...BEHEER_ITEMS, IMPORTEREN_ITEM]

// Bright icon tints for dark sidebar
const ICON_BRIGHT: Record<string, string> = {
  '#1A535C': '#7EC8D0',
  '#F15025': '#FF8A6A',
  '#2D6B48': '#6CC98A',
  '#3A6B8C': '#7AAED4',
  '#C44830': '#F0826A',
  '#9A5A48': '#D4927E',
  '#5A5A55': '#A8A8A2',
  '#6A5A8A': '#A896CC',
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
        className="relative flex flex-col items-center justify-center w-full py-2.5 gap-1 group/rail"
      >
        {/* Hover bg */}
        <div className="doen-sidebar-item-hover" style={{ borderRadius: '12px', insetInline: '8px' }} />

        {active && (
          <div className="absolute inset-x-[8px] inset-y-0.5 rounded-[12px] doen-sidebar-active-pill" />
        )}

        {active && <div className="doen-sidebar-flame-accent" />}

        <div className="relative z-10">
          <Icon
            className={cn(
              'w-[22px] h-[22px] transition-all duration-300 ease-out',
              active && 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]',
              !active && 'group-hover/rail:scale-110',
            )}
            style={{ color: iconColor }}
            strokeWidth={active ? 2 : 1.6}
          />
        </div>

        <span
          className={cn(
            'relative z-10 text-center leading-tight transition-all duration-300',
            active ? 'text-white font-semibold' : 'text-white/40 font-medium group-hover/rail:text-white/75',
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
    <div key={key} className="w-6 mx-auto my-2.5" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />
  )

  // ── Expanded item ──
  const renderExpandedItem = (item: NavItem, isBottom = false) => {
    const active = isActivePath(item.path)
    const Icon = item.icon
    const iconColor = active ? '#FFFFFF' : brightIcon(item.color)

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'relative flex items-center gap-3.5 py-[10px] px-4 mx-2 rounded-[12px] group/nav',
          isBottom ? 'text-[13px]' : 'text-[14px]',
        )}
      >
        {/* Hover sweep background */}
        <div className="doen-sidebar-item-hover" />

        {/* Active pill */}
        {active && (
          <div className="absolute inset-0 rounded-[12px] doen-sidebar-active-pill" />
        )}

        {/* Flame left accent */}
        {active && <div className="doen-sidebar-flame-accent" style={{ left: '-8px' }} />}

        {/* Icon — rounded container with subtle bg */}
        <div
          className={cn(
            'relative z-10 w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 transition-all duration-300',
            active
              ? 'bg-white/[0.15] shadow-[0_0_12px_rgba(255,255,255,0.06)]'
              : 'bg-white/[0.06] group-hover/nav:bg-white/[0.10]',
          )}
        >
          <Icon
            className={cn(
              'w-[19px] h-[19px] transition-all duration-300 ease-out',
              active && 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]',
            )}
            style={{ color: iconColor }}
            strokeWidth={active ? 2 : 1.6}
          />
        </div>

        {/* Label */}
        <span className={cn(
          'relative z-10 truncate transition-all duration-300 tracking-[-0.01em]',
          active ? 'text-white font-semibold' : 'text-white/55 font-medium group-hover/nav:text-white/90',
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
            <span className="text-[22px] font-extrabold text-white tracking-tight transition-transform duration-300 group-hover/logo:scale-105">
              d<span className="text-[#F15025]" style={{ textShadow: '0 0 12px rgba(241, 80, 37, 0.4)' }}>.</span>
            </span>
          ) : (
            <span className="text-[24px] font-extrabold text-white tracking-[-0.03em] transition-transform duration-300 group-hover/logo:translate-x-0.5">
              doen<span className="text-[#F15025]" style={{ textShadow: '0 0 14px rgba(241, 80, 37, 0.5)' }}>.</span>
            </span>
          )}
        </NavLink>

        {/* Separator */}
        <div className={cn(collapsed ? 'mx-4' : 'mx-5')}>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.09) 20%, rgba(255,255,255,0.09) 80%, transparent 100%)' }} />
        </div>

        {/* Main navigation — NO scroll, flex-distributed */}
        <nav className="flex-1 flex flex-col justify-start pt-4 overflow-hidden">
          {collapsed ? (
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
            <div className="px-0">
              {filteredGroups.map((group, gi) => (
                <div key={group.section} className={gi > 0 ? 'mt-6' : ''}>
                  <div className="doen-sidebar-section">{group.section}</div>
                  <div className="space-y-[2px]">
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
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 20%, rgba(255,255,255,0.07) 80%, transparent 100%)' }} />
          </div>

          {/* Importeren */}
          {collapsed ? renderRailItem(IMPORTEREN_ITEM) : renderExpandedItem(IMPORTEREN_ITEM, true)}
          {/* Instellingen */}
          {collapsed ? renderRailItem(SETTINGS_ITEM) : renderExpandedItem(SETTINGS_ITEM, true)}

          {/* Collapse toggle */}
          {!forMobile && (
            collapsed ? (
              <button
                onClick={toggleSidebar}
                className="w-9 h-8 flex items-center justify-center rounded-[10px] text-white/20 hover:text-white/55 hover:bg-white/[0.05] transition-all duration-300 mt-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center h-8 px-4 mx-2 gap-2 rounded-[10px] text-white/20 hover:text-white/55 hover:bg-white/[0.05] transition-all duration-300 w-auto mt-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium tracking-wide">Inklappen</span>
              </button>
            )
          )}

          {/* User avatar */}
          {user && (
            <div ref={userPopoverRef} className={cn('relative mt-1', collapsed ? 'flex justify-center' : '')}>
              <button
                onClick={() => setUserPopoverOpen(!userPopoverOpen)}
                className={cn(
                  'flex items-center transition-all duration-300 rounded-[12px] hover:bg-white/[0.05]',
                  collapsed ? 'w-11 h-11 justify-center' : 'gap-3 h-[52px] px-4 mx-2 w-[calc(100%-16px)]',
                )}
              >
                <div
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0 doen-sidebar-avatar"
                  style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))' }}
                >
                  <span className="text-[12px] font-bold text-white/90">{userInitial}</span>
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white/85 text-[13px] font-medium truncate leading-tight">{userName}</p>
                    <p className="text-white/30 text-[10px] truncate leading-tight mt-0.5">{user.email}</p>
                  </div>
                )}
              </button>

              {/* User popover */}
              {userPopoverOpen && (
                <div className={cn(
                  'absolute z-50 w-56 overflow-hidden',
                  collapsed ? 'left-full bottom-0 ml-3' : 'left-2 bottom-full mb-2',
                )}
                  style={{
                    background: 'rgba(15, 58, 66, 0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '0.5px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="px-4 py-3.5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[13px] font-semibold text-white/90 truncate">{userName}</p>
                    <p className="text-[11px] text-white/40 truncate mt-0.5">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/instellingen') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                    >
                      <Settings className="w-4 h-4 text-white/40" />
                      Profiel
                    </button>
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/instellingen?tab=abonnement') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                    >
                      <CreditCard className="w-4 h-4 text-white/40" />
                      Abonnement
                    </button>
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/kennisbank') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                    >
                      <BookOpen className="w-4 h-4 text-white/40" />
                      Kennisbank
                    </button>
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/changelog') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                    >
                      <Sparkles className="w-4 h-4 text-white/40" />
                      What's new
                    </button>
                  </div>

                  <div className="py-1" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={() => { setUserPopoverOpen(false); setLayoutMode('topnav') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                    >
                      <PanelTop className="w-4 h-4 text-white/40" />
                      Top navigatie
                    </button>
                  </div>

                  <div className="py-1" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={() => { setUserPopoverOpen(false); logout() }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-[#F15025]/80 hover:text-[#F15025] hover:bg-[#F15025]/[0.06] transition-all duration-200"
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
