import React, { useEffect, useRef, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  Mail, Calendar, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X, CheckSquare,
  Receipt, ClipboardCheck,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar, RAIL_WIDTH, EXPANDED_WIDTH } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  icon: LucideIcon
  path: string
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
  '/instellingen': '#8A8680',
}

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

const SETTINGS_ITEM: NavItem = { label: 'Instellingen', icon: Settings, path: '/instellingen' }

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar()
  const { user, logout } = useAuth()
  const { settings } = useAppSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userPopoverOpen, setUserPopoverOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const userPopoverRef = useRef<HTMLDivElement>(null)

  // Filter nav items op basis van instellingen
  const filteredItems = useMemo(() => {
    const sidebarItems = settings?.sidebar_items
    if (!Array.isArray(sidebarItems) || sidebarItems.length === 0) return RAIL_ITEMS
    const normalized = sidebarItems.map((s: string) => s === 'Kalender' ? 'Planning' : s)
    return RAIL_ITEMS.filter(item => normalized.includes(item.label) || item.label === 'Dashboard')
  }, [settings?.sidebar_items])

  // Close mobile on navigate
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Close mobile on outside click
  useEffect(() => {
    if (!mobileOpen) return
    function handleClick(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) setMobileOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [mobileOpen])

  // Close user popover on outside click
  useEffect(() => {
    if (!userPopoverOpen) return
    function handleClick(e: MouseEvent) {
      if (userPopoverRef.current && !userPopoverRef.current.contains(e.target as Node)) setUserPopoverOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userPopoverOpen])

  const userInitial = (user?.user_metadata?.voornaam?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const userName = user?.user_metadata?.voornaam
    ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
    : user?.email?.split('@')[0] || 'Gebruiker'

  const renderNavItem = (item: NavItem) => {
    const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    const Icon = item.icon
    const modColor = MODULE_COLORS[item.path] || '#8A8680'

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'relative group transition-all duration-200',
          isCollapsed
            ? 'flex flex-col items-center justify-center w-[60px] h-[52px] rounded-[12px] gap-0.5 mx-auto'
            : 'flex items-center gap-2.5 h-10 px-3 rounded-[10px] mx-2',
          isActive
            ? 'font-semibold'
            : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40',
        )}
        style={isActive ? {
          background: `${modColor}12`,
          boxShadow: `0 0 20px ${modColor}10`,
        } : undefined}
      >
        {/* Active indicator bar */}
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-[3px] transition-all duration-300"
            style={{
              height: isCollapsed ? 20 : 18,
              background: modColor,
              boxShadow: `0 0 12px ${modColor}50`,
            }}
          />
        )}

        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center flex-shrink-0 transition-all duration-200',
            isCollapsed ? 'w-8 h-8 rounded-[10px]' : 'w-7 h-7 rounded-[8px]',
          )}
          style={{
            background: isActive ? `${modColor}18` : 'transparent',
            boxShadow: isActive ? `0 0 16px ${modColor}15` : 'none',
          }}
        >
          <Icon
            className={cn(isCollapsed ? 'w-[18px] h-[18px]' : 'w-[16px] h-[16px]')}
            style={isActive ? { color: modColor } : undefined}
          />
        </div>

        {/* Label */}
        {isCollapsed ? (
          <span className={cn(
            'text-[10px] font-medium leading-tight text-center',
            isActive ? 'font-semibold' : '',
          )} style={isActive ? { color: modColor } : undefined}>
            {item.label}
          </span>
        ) : (
          <span className={cn(
            'text-[13px] font-medium truncate',
            isActive ? 'font-semibold' : '',
          )} style={isActive ? { color: modColor } : undefined}>
            {item.label}
          </span>
        )}

        {/* Tooltip (collapsed only, for items) */}
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
            {item.label}
          </div>
        )}
      </NavLink>
    )
  }

  const sidebarContent = (forMobile = false) => {
    const collapsed = forMobile ? false : isCollapsed

    return (
      <>
        {/* Logo */}
        <button
          onClick={forMobile ? undefined : toggleSidebar}
          className={cn(
            'flex items-center h-14 flex-shrink-0 transition-all duration-200',
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-4',
            !forMobile && 'cursor-pointer hover:bg-muted/30'
          )}
        >
          <div className="sidebar-logo-mark flex-shrink-0">F</div>
          {!collapsed && (
            <span className="text-[15px] font-extrabold tracking-[-0.04em]">
              FORGE<span className="font-medium text-muted-foreground">desk</span>
            </span>
          )}
        </button>

        {/* Navigation */}
        <nav className={cn(
          'flex-1 py-2 overflow-y-auto scrollbar-none',
          collapsed ? 'px-1' : 'px-0',
        )}>
          <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center')}>
            {forMobile ? (
              // Mobile: always expanded style
              RAIL_ITEMS.filter(item => {
                const sidebarItems = settings?.sidebar_items
                if (!Array.isArray(sidebarItems) || sidebarItems.length === 0) return true
                return sidebarItems.includes(item.label) || item.label === 'Dashboard'
              }).map(item => {
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
                const Icon = item.icon
                const modColor = MODULE_COLORS[item.path] || '#8A8680'
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2.5 h-10 px-3 mx-2 rounded-[10px] transition-all duration-200',
                      isActive ? 'font-semibold' : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40',
                    )}
                    style={isActive ? { background: `${modColor}12` } : undefined}
                  >
                    <div className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                      style={{ background: isActive ? `${modColor}18` : 'transparent' }}>
                      <Icon className="w-4 h-4" style={isActive ? { color: modColor } : undefined} />
                    </div>
                    <span className="text-[13px] font-medium" style={isActive ? { color: modColor } : undefined}>
                      {item.label}
                    </span>
                  </NavLink>
                )
              })
            ) : (
              filteredItems.map(renderNavItem)
            )}
          </div>
        </nav>

        {/* Bottom section */}
        <div className={cn(
          'border-t border-border/40 flex-shrink-0',
          collapsed ? 'py-2 px-1 flex flex-col items-center gap-1' : 'py-2 px-0 space-y-0.5',
        )}>
          {/* Instellingen */}
          {renderNavItem(SETTINGS_ITEM)}

          {/* Toggle button (desktop only) */}
          {!forMobile && (
            <button
              onClick={toggleSidebar}
              className={cn(
                'flex items-center justify-center transition-all duration-200 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 rounded-[10px]',
                collapsed ? 'w-10 h-8 mx-auto' : 'h-8 px-3 mx-2 gap-2',
              )}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : (
                <>
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Inklappen</span>
                </>
              )}
            </button>
          )}

          {/* User avatar */}
          {user && (
            <div ref={userPopoverRef} className={cn('relative', collapsed ? 'flex justify-center' : 'mx-2')}>
              <button
                onClick={() => setUserPopoverOpen(!userPopoverOpen)}
                className={cn(
                  'flex items-center transition-all duration-200 rounded-[10px] hover:bg-muted/40',
                  collapsed ? 'w-10 h-10 justify-center' : 'gap-2.5 h-10 px-3 w-full',
                )}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center flex-shrink-0 ring-2 ring-border/30">
                  <span className="text-white text-[10px] font-bold">{userInitial}</span>
                </div>
                {!collapsed && (
                  <span className="text-[12px] font-medium text-muted-foreground truncate">{userName}</span>
                )}
              </button>

              {/* User popover */}
              {userPopoverOpen && (
                <div className={cn(
                  'absolute z-50 w-52 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden',
                  collapsed ? 'left-full bottom-0 ml-3' : 'left-0 bottom-full mb-2',
                )}>
                  <div className="px-4 py-3 border-b border-border/40">
                    <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setUserPopoverOpen(false); navigate('/instellingen') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      Profiel
                    </button>
                  </div>
                  <div className="border-t border-border/40 py-1">
                    <button
                      onClick={() => { setUserPopoverOpen(false); logout() }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
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
        className="hidden md:flex flex-col flex-shrink-0 h-screen wm-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: isCollapsed ? RAIL_WIDTH : EXPANDED_WIDTH }}
      >
        {sidebarContent(false)}
      </aside>
    </>
  )
}
