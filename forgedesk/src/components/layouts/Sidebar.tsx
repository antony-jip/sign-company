import React, { useEffect, useRef, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderKanban, Users, FileText,
  Mail, Calendar, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X, CheckCircle,
  Receipt, ClipboardCheck, Globe, Upload,
  Moon, Sun, CreditCard, PiggyBank,
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

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  // ── Rail item (collapsed) ──
  const renderRailItem = (item: NavItem) => {
    const active = isActive(item.path)
    const Icon = item.icon

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'relative flex flex-col items-center justify-center w-full py-2.5 gap-0.5 transition-all duration-200',
          active ? 'bg-opacity-100' : 'opacity-60 hover:opacity-100',
        )}
        style={active ? { backgroundColor: `rgba(26, 83, 92, 0.08)` } : undefined}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(244, 242, 238, 0.6)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
          }
        }}
      >
        {/* Active indicator — 3px left bar with gradient */}
        {active && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[20px]"
            style={{
              background: `linear-gradient(180deg, ${item.color} 0%, transparent 100%)`,
              borderRadius: '0 2px 2px 0',
            }}
          />
        )}

        {/* Icon */}
        <Icon
          className="w-[22px] h-[22px]"
          style={{ color: item.color }}
          strokeWidth={active ? 2.2 : 1.8}
        />

        {/* Label */}
        <span
          className={cn(
            'text-center leading-tight',
            active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
          )}
          style={{ fontSize: '10px' }}
        >
          {item.label}
        </span>
      </NavLink>
    )
  }

  // ── Rail divider ──
  const railDivider = (key: string) => (
    <div key={key} className="w-12 mx-auto" style={{ height: '0.5px', backgroundColor: '#E6E4E0' }} />
  )

  // ── Expanded item ──
  const renderExpandedItem = (item: NavItem) => {
    const active = isActive(item.path)
    const Icon = item.icon

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'relative flex items-center gap-2.5 py-[7px] px-3 rounded-lg text-[13px] transition-all duration-200',
          active
            ? 'font-semibold text-foreground'
            : 'font-medium text-muted-foreground hover:text-foreground',
        )}
        style={active
          ? { backgroundColor: `rgba(26, 83, 92, 0.08)` }
          : undefined
        }
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(244, 242, 238, 0.6)';
            (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
            (e.currentTarget as HTMLElement).style.transform = '';
          }
        }}
      >
        {/* Active indicator — gradient from module color to transparent */}
        {active && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px]"
            style={{
              background: `linear-gradient(180deg, ${item.color} 0%, transparent 100%)`,
              borderRadius: '0 2px 2px 0',
            }}
          />
        )}

        {/* Color dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: item.color }}
        />

        {/* Icon */}
        <Icon
          className="w-[16px] h-[16px] flex-shrink-0"
          style={{ color: item.color }}
          strokeWidth={active ? 2.2 : 1.8}
        />

        {/* Label */}
        <span className="truncate">{item.label}</span>
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
            collapsed ? 'justify-center h-14 px-0' : 'gap-2.5 h-14 px-4',
          )}
        >
          <img
            src="/beeldmerk.png"
            alt="doen."
            className={cn('flex-shrink-0 transition-all duration-200', collapsed ? 'w-8 h-8' : 'w-9 h-9')}
          />
        </NavLink>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {collapsed ? (
            // ── Rail mode: grouped with dividers ──
            <div className="flex flex-col items-center gap-0.5">
              {/* Werk group */}
              {filteredNavItems.filter(i => WERK_ITEMS.some(w => w.path === i.path)).map(renderRailItem)}
              {railDivider('div-1')}
              {/* Planning group */}
              {filteredNavItems.filter(i => PLANNING_ITEMS.some(p => p.path === i.path)).map(renderRailItem)}
              {railDivider('div-2')}
              {/* Communicatie group */}
              {filteredNavItems.filter(i => COMMUNICATIE_ITEMS.some(c => c.path === i.path)).map(renderRailItem)}
              {railDivider('div-3')}
              {/* Beheer group */}
              {filteredNavItems.filter(i => BEHEER_ITEMS.some(b => b.path === i.path)).map(renderRailItem)}
            </div>
          ) : (
            // ── Expanded mode: grouped with section headers ──
            <div className="px-2">
              {filteredGroups.map((group, idx) => (
                <div key={group.section}>
                  <div className="doen-sidebar-section">{group.section}</div>
                  <div className="space-y-0.5">
                    {group.items.map(renderExpandedItem)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Flex spacer to push bottom section down */}
        <div className="flex-1" />

        {/* Bottom section */}
        <div className={cn(
          'flex-shrink-0',
          collapsed ? 'py-3 flex flex-col items-center gap-1.5' : 'py-2 px-2 space-y-0.5',
        )}>
          {/* Divider above settings */}
          <div
            className={collapsed ? 'w-12 mb-2' : 'mx-2 mb-2'}
            style={{ height: '0.5px', backgroundColor: '#E6E4E0' }}
          />

          {/* Importeren */}
          {collapsed ? renderRailItem(IMPORTEREN_ITEM) : renderExpandedItem(IMPORTEREN_ITEM)}
          {/* Instellingen */}
          {collapsed ? renderRailItem(SETTINGS_ITEM) : renderExpandedItem(SETTINGS_ITEM)}

          {/* Collapse toggle (desktop only) */}
          {!forMobile && (
            collapsed ? (
              <button
                onClick={toggleSidebar}
                className="w-9 h-8 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center h-8 px-3 gap-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-all duration-200 w-full"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="text-[11px]">Inklappen</span>
              </button>
            )
          )}

          {/* User avatar */}
          {user && (
            <div ref={userPopoverRef} className={cn('relative', collapsed ? 'flex justify-center' : '')}>
              <button
                onClick={() => setUserPopoverOpen(!userPopoverOpen)}
                className={cn(
                  'flex items-center transition-all duration-200 rounded-lg hover:bg-muted/40',
                  collapsed ? 'w-10 h-10 justify-center' : 'gap-2.5 h-10 px-3 w-full',
                )}
              >
                <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F4F2EE' }}>
                  <span className="text-[11px] font-semibold" style={{ color: '#5A5A55' }}>{userInitial}</span>
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-medium text-foreground truncate leading-tight">{userName}</p>
                    <p className="text-[10px] text-muted-foreground/50 truncate">{user.email}</p>
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
