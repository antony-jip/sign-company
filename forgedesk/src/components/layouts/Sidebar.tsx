import React, { useEffect, useRef, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  Mail, Calendar, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X, CheckSquare,
  Receipt, ClipboardCheck, Sparkles,
  Moon, Sun, Monitor, CreditCard,
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
}

interface NavSection {
  section: string
  items: NavItem[]
}

const MODULE_COLORS: Record<string, string> = {
  '/': '#CC8A3F',
  '/klanten': '#8BAFD4',
  '/offertes': '#9B8EC4',
  '/facturen': '#E8866A',
  '/projecten': '#7EB5A6',
  '/taken': '#C4A882',
  '/werkbonnen': '#D4836A',
  '/planning': '#7EB5A6',
  '/email': '#8BAFD4',
  '/forgie': '#9B8EC4',
  '/instellingen': '#8A8680',
}

// Flat list for rail mode
const RAIL_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Projecten', icon: FolderKanban, path: '/projecten' },
  { label: 'Klanten', icon: Users, path: '/klanten' },
  { label: 'Offertes', icon: FileText, path: '/offertes' },
  { label: 'Facturen', icon: Receipt, path: '/facturen' },
  { label: 'Taken', icon: CheckSquare, path: '/taken' },
  { label: 'Werkbonnen', icon: ClipboardCheck, path: '/werkbonnen' },
  { label: 'Planning', icon: Calendar, path: '/planning' },
  { label: 'Email', icon: Mail, path: '/email' },
]

// Grouped sections for expanded mode
const NAV_SECTIONS: NavSection[] = [
  {
    section: 'Overzicht',
    items: [{ label: 'Dashboard', icon: LayoutDashboard, path: '/' }],
  },
  {
    section: 'Verkoop',
    items: [
      { label: 'Klanten', icon: Users, path: '/klanten' },
      { label: 'Offertes', icon: FileText, path: '/offertes' },
      { label: 'Facturen', icon: Receipt, path: '/facturen' },
    ],
  },
  {
    section: 'Productie',
    items: [
      { label: 'Projecten', icon: FolderKanban, path: '/projecten' },
      { label: 'Taken', icon: CheckSquare, path: '/taken' },
      { label: 'Werkbonnen', icon: ClipboardCheck, path: '/werkbonnen' },
    ],
  },
  {
    section: 'Planning',
    items: [{ label: 'Planning', icon: Calendar, path: '/planning' }],
  },
  {
    section: 'Communicatie',
    items: [
      { label: 'Email', icon: Mail, path: '/email' },
      { label: 'Daan', icon: Sparkles, path: '/forgie' },
    ],
  },
]

const SETTINGS_ITEM: NavItem = { label: 'Instellingen', icon: Settings, path: '/instellingen' }

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
    return (label: string) => normalized.includes(label) || label === 'Dashboard' || label === 'Instellingen'
  }, [settings?.sidebar_items])

  const filteredRailItems = useMemo(() => RAIL_ITEMS.filter(i => isItemVisible(i.label)), [isItemVisible])

  const filteredSections = useMemo(() => {
    return NAV_SECTIONS
      .map(s => ({ ...s, items: s.items.filter(i => isItemVisible(i.label)) }))
      .filter(s => s.items.length > 0)
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

  // ── Rail item (collapsed) ──
  const renderRailItem = (item: NavItem) => {
    const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    const Icon = item.icon
    const modColor = MODULE_COLORS[item.path] || '#8A8680'

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'relative group flex flex-col items-center justify-center w-[62px] py-2 rounded-[14px] gap-1 mx-auto transition-all duration-200',
          isActive
            ? 'font-semibold'
            : 'text-muted-foreground/50 hover:text-foreground/80 hover:bg-muted/40',
        )}
        style={isActive ? {
          background: `${modColor}14`,
          boxShadow: `0 0 24px ${modColor}0C`,
        } : undefined}
      >
        {/* Active bar */}
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] rounded-r-[3px]"
            style={{ background: modColor, boxShadow: `0 0 12px ${modColor}50` }}
          />
        )}

        {/* Icon */}
        <div
          className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-all duration-200"
          style={{
            background: isActive ? `${modColor}1A` : 'transparent',
            boxShadow: isActive ? `0 0 20px ${modColor}12` : 'none',
          }}
        >
          <Icon className="w-[20px] h-[20px]" style={isActive ? { color: modColor } : undefined} />
        </div>

        {/* Label */}
        <span
          className={cn('text-[10px] leading-tight text-center', isActive ? 'font-semibold' : 'font-medium')}
          style={isActive ? { color: modColor } : undefined}
        >
          {item.label}
        </span>

        {/* Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
          {item.label}
        </div>
      </NavLink>
    )
  }

  // ── Expanded item ──
  const renderExpandedItem = (item: NavItem) => {
    const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    const Icon = item.icon
    const modColor = MODULE_COLORS[item.path] || '#8A8680'
    const isForgie = item.path === '/forgie'

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'relative flex items-center gap-2.5 py-[7px] px-[10px] rounded-[10px] text-sm font-medium transition-all duration-200 group',
          isActive
            ? 'font-semibold text-foreground'
            : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
          isForgie && !isActive && 'sidebar-forgie mx-1 my-0.5',
        )}
        style={isActive ? {
          background: `${modColor}0C`,
          boxShadow: `inset 0 0 0 1px ${modColor}15`,
        } : undefined}
      >
        {/* Active bar */}
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[3px]"
            style={{ background: modColor, boxShadow: `0 0 12px ${modColor}50` }}
          />
        )}

        {/* Icon */}
        <div
          className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{
            background: isActive ? `${modColor}20` : 'transparent',
            boxShadow: isActive ? `0 0 16px ${modColor}18` : 'none',
            opacity: isActive ? 1 : 0.5,
          }}
        >
          <Icon className="w-[15px] h-[15px]" style={isActive ? { color: modColor } : undefined} />
        </div>

        <span className="truncate">{item.label}</span>

        {isForgie && (
          <span className="ml-auto text-2xs font-bold uppercase tracking-[0.06em] text-[#9B8EC4] bg-[#9B8EC4]/12 px-1.5 py-0.5 rounded-full">AI</span>
        )}
      </NavLink>
    )
  }

  // ── Sidebar content ──
  const sidebarContent = (forMobile = false) => {
    const collapsed = forMobile ? false : isCollapsed

    return (
      <>
        {/* Logo */}
        <button
          onClick={forMobile ? undefined : toggleSidebar}
          className={cn(
            'flex items-center h-14 flex-shrink-0 transition-all duration-200',
            collapsed ? 'justify-center px-0' : 'gap-[10px] px-4',
            !forMobile && 'cursor-pointer hover:bg-muted/20',
          )}
        >
          <div className="sidebar-logo-mark flex-shrink-0">D</div>
          {!collapsed && (
            <span className="text-[16px] font-extrabold tracking-[-0.04em]">
              Doen.
            </span>
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {collapsed ? (
            // ── Rail mode: flat list, big icons ──
            <div className="flex flex-col items-center gap-0.5 px-[7px]">
              {filteredRailItems.map(renderRailItem)}
            </div>
          ) : (
            // ── Expanded mode: grouped sections ──
            <div className="px-2">
              {filteredSections.map((section, sectionIdx) => (
                <div key={section.section}>
                  <div className="wm-sidebar-section">{section.section}</div>
                  <div className="space-y-0.5">
                    {section.items.map(renderExpandedItem)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom section */}
        <div className={cn(
          'border-t border-border/40 flex-shrink-0',
          collapsed ? 'py-3 flex flex-col items-center gap-1.5' : 'py-2 px-2 space-y-0.5',
        )}>
          {/* Instellingen */}
          {collapsed ? renderRailItem(SETTINGS_ITEM) : renderExpandedItem(SETTINGS_ITEM)}

          {/* Quick toggles */}
          {collapsed ? (
            // Rail mode: small icon buttons
            !forMobile && (
              <div className="flex flex-col items-center gap-0.5">
                <button
                  onClick={toggleTheme}
                  className="w-9 h-8 flex items-center justify-center rounded-[8px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-all duration-200 group relative"
                  title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </div>
                </button>
                <button
                  onClick={toggleSidebar}
                  className="w-9 h-8 flex items-center justify-center rounded-[8px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-all duration-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )
          ) : (
            // Expanded mode: full buttons
            !forMobile && (
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center h-8 w-8 rounded-[8px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-all duration-200"
                  title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={toggleSidebar}
                  className="flex-1 flex items-center justify-center h-8 px-2 gap-1.5 rounded-[8px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-all duration-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Inklappen</span>
                </button>
              </div>
            )
          )}

          {/* User avatar */}
          {user && (
            <div ref={userPopoverRef} className={cn('relative', collapsed ? 'flex justify-center' : '')}>
              <button
                onClick={() => setUserPopoverOpen(!userPopoverOpen)}
                className={cn(
                  'flex items-center transition-all duration-200 rounded-[10px] hover:bg-muted/40',
                  collapsed ? 'w-10 h-10 justify-center' : 'gap-2.5 h-10 px-3 w-full',
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center flex-shrink-0 ring-2 ring-border/20">
                  <span className="text-white text-[11px] font-bold">{userInitial}</span>
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
                  'absolute z-50 w-56 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden animate-scale-in',
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
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      Profiel
                    </button>
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/instellingen?tab=abonnement') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      Abonnement
                    </button>
                  </div>

                  {/* Appearance & layout */}
                  <div className="border-t border-border/40 py-1.5">
                    {/* Dark mode toggle */}
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      {theme === 'dark' ? (
                        <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>

                    {/* Switch to top nav */}
                    <button
                      onClick={() => { setUserPopoverOpen(false); setLayoutMode('topnav') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                      Top navigatie
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
        className="fixed top-2.5 left-2.5 z-50 md:hidden wm-glass-subtle shadow-lg border border-border/50 rounded-xl w-9 h-9"
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
          'fixed inset-y-0 left-0 flex flex-col w-64 wm-sidebar z-50 transform transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 h-screen wm-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
        style={{ width: isCollapsed ? RAIL_WIDTH : EXPANDED_WIDTH }}
      >
        {sidebarContent(false)}
      </aside>
    </>
  )
}
