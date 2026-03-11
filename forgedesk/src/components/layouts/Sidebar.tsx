import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  Mail, Calendar, PiggyBank, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X, CheckSquare,
  Receipt, BarChart3, Clock, Wrench, UsersRound,
  ClipboardCheck, ShoppingCart, Warehouse,
  Briefcase, UserPlus, Files, Newspaper,
  Upload, Bot, Calculator, TrendingUp, PackageCheck,
  CalendarCheck, Sparkles, Wand2, Link2,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
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

// Module accent colors for icon glows
const MODULE_COLORS: Record<string, string> = {
  '/': '#5A8264',
  '/klanten': '#8BAFD4',
  '/offertes': '#9B8EC4',
  '/inkoopoffertes': '#9B8EC4',
  '/facturen': '#E8866A',
  '/projecten': '#7EB5A6',
  '/taken': '#C4A882',
  '/werkbonnen': '#D4836A',
  '/visualizer': '#9B8EC4',
  '/planning': '#7EB5A6',
  '/email': '#8BAFD4',
  '/forgie': '#9B8EC4',
  '/nieuwsbrieven': '#8BAFD4',
  '/portalen': '#9B8EC4',
  '/financieel': '#C4A882',
  '/documenten': '#8A8680',
  '/rapportages': '#7EB5A6',
  '/team': '#8BAFD4',
  '/instellingen': '#8A8680',
}

const navSections: NavSection[] = [
  {
    section: 'Overzicht',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    section: 'Verkoop',
    items: [
      { label: 'Klanten', icon: Users, path: '/klanten' },
      { label: 'Offertes', icon: FileText, path: '/offertes' },
      { label: 'Inkoopoffertes', icon: ShoppingCart, path: '/inkoopoffertes' },
      { label: 'Facturen', icon: Receipt, path: '/facturen' },
    ],
  },
  {
    section: 'Productie',
    items: [
      { label: 'Projecten', icon: FolderKanban, path: '/projecten' },
      { label: 'Taken', icon: CheckSquare, path: '/taken' },
      { label: 'Werkbonnen', icon: ClipboardCheck, path: '/werkbonnen' },
      { label: 'Visualizer', icon: Wand2, path: '/visualizer' },
    ],
  },
  {
    section: 'Planning',
    items: [
      { label: 'Planning', icon: Calendar, path: '/planning' },
    ],
  },
  {
    section: 'Communicatie',
    items: [
      { label: 'Email', icon: Mail, path: '/email' },
      { label: 'Portalen', icon: Link2, path: '/portalen' },
      { label: 'Forgie', icon: Sparkles, path: '/forgie' },
      { label: 'Nieuwsbrieven', icon: Newspaper, path: '/nieuwsbrieven' },
    ],
  },
  {
    section: 'Financieel',
    items: [
      { label: 'Financieel', icon: PiggyBank, path: '/financieel' },
    ],
  },
  {
    section: 'Beheer',
    items: [
      { label: 'Documenten', icon: Files, path: '/documenten' },
      { label: 'Rapportages', icon: BarChart3, path: '/rapportages' },
      { label: 'Team', icon: UsersRound, path: '/team' },
      { label: 'Instellingen', icon: Settings, path: '/instellingen' },
    ],
  },
]

export function Sidebar() {
  const { isCollapsed, toggleSidebar, sidebarWidth, setSidebarWidth, collapsedWidth } = useSidebar()
  const { user, logout } = useAuth()
  const { settings } = useAppSettings()
  const location = useLocation()

  // Filter navigatie op basis van instellingen — Instellingen is altijd zichtbaar
  const filteredNavSections = useMemo(() => {
    const sidebarItems = settings?.sidebar_items
    // Als sidebar_items niet is ingesteld of leeg is, toon alles
    if (!Array.isArray(sidebarItems) || sidebarItems.length === 0) return navSections
    // Migratie: 'Kalender' → 'Planning'
    const normalized = sidebarItems.map((s: string) =>
      s === 'Kalender' ? 'Planning' : s
    )
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => normalized.includes(item.label) || item.label === 'Instellingen'
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [settings.sidebar_items])
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  // Drag-to-resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      setSidebarWidth(e.clientX)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [setSidebarWidth])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileOpen])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && mobileOpen) setMobileOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileOpen])

  const renderNavItem = (item: NavItem, index: number) => {
    const isActive =
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.path)
    const Icon = item.icon
    const modColor = MODULE_COLORS[item.path] || '#8A8680'
    const isForgie = item.path === '/forgie'

    const link = (
      <NavLink
        to={item.path}
        className={cn(
          'flex items-center gap-2.5 py-[8px] px-[10px] rounded-[10px] text-[13px] font-medium transition-all duration-200 relative group',
          isActive
            ? 'font-semibold text-foreground'
            : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
          isCollapsed && 'justify-center px-2',
          isForgie && !isActive && 'sidebar-forgie mx-1 my-0.5'
        )}
        style={isActive ? {
          background: `${modColor}0C`,
          boxShadow: `inset 0 0 0 1px ${modColor}15`,
        } : undefined}
      >
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[3px] transition-all duration-300"
            style={{ background: modColor, boxShadow: `0 0 12px ${modColor}50` }}
          />
        )}
        <div
          className={cn(
            'w-[28px] h-[28px] rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all duration-200',
            isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'
          )}
          style={{
            background: isActive ? `${modColor}20` : 'transparent',
            boxShadow: isActive ? `0 0 16px ${modColor}18` : 'none',
          }}
        >
          <Icon className="w-[15px] h-[15px]" style={isActive ? { color: modColor } : undefined} />
        </div>
        {!isCollapsed && <span className="truncate">{item.label}</span>}
        {isForgie && !isCollapsed && (
          <span className="ml-auto text-[9px] font-bold uppercase tracking-[0.06em] text-[#9B8EC4] bg-[#9B8EC4]/12 px-1.5 py-0.5 rounded-full">AI</span>
        )}
      </NavLink>
    )

    if (isCollapsed) {
      return (
        <div key={item.path} className="relative group">
          {link}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
            {item.label}
          </div>
        </div>
      )
    }

    return <React.Fragment key={item.path}>{link}</React.Fragment>
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 px-4 flex-shrink-0',
          isCollapsed ? 'justify-center' : 'gap-[10px]'
        )}
      >
        <div className="sidebar-logo-mark">
          F
        </div>
        {!isCollapsed && (
          <span className="text-[16px] font-extrabold tracking-[-0.04em]">
            FORGE<span className="font-medium text-muted-foreground">desk</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-thin">
        {filteredNavSections.map((section, sectionIndex) => (
          <div key={section.section}>
            {/* Section label (only when expanded) */}
            {!isCollapsed && (
              <div className="wm-sidebar-section">
                {section.section}
              </div>
            )}
            {/* Divider for collapsed mode */}
            {isCollapsed && sectionIndex > 0 && (
              <div className="mx-2 my-2 border-t border-border/40" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item, i) =>
                renderNavItem(item, i)
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-border/50 p-3 space-y-2 flex-shrink-0">
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage to-blush flex items-center justify-center flex-shrink-0 ring-2 ring-primary/10">
              <span className="text-white text-xs font-semibold">
                {(user.user_metadata?.voornaam?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.user_metadata?.voornaam
                  ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
                  : user.email?.split('@')[0] || 'Gebruiker'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors duration-200 rounded-lg"
              onClick={logout}
              title="Uitloggen"
              aria-label="Uitloggen"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {isCollapsed && user && (
          <div className="relative group flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage to-blush flex items-center justify-center cursor-pointer ring-2 ring-primary/10">
              <span className="text-white text-xs font-semibold">
                {(user.user_metadata?.voornaam?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 wm-tooltip opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
              {user.user_metadata?.voornaam || user.email?.split('@')[0] || 'Gebruiker'}
            </div>
          </div>
        )}

        <div className={cn('flex items-center gap-1', isCollapsed ? 'flex-col' : '')}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'flex-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-200 h-8 text-xs',
              isCollapsed && 'px-0 justify-center w-full'
            )}
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Sidebar uitklappen' : 'Sidebar inklappen'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Inklappen
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )

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

      {/* Mobile sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 flex flex-col w-64 wm-sidebar z-50 transform transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0 relative" style={{ width: isCollapsed ? collapsedWidth : sidebarWidth }}>
        <aside
          className="flex flex-col h-screen wm-sidebar w-full transition-[width] duration-200 ease-in-out"
        >
          {sidebarContent}
        </aside>

        {/* Drag handle */}
        {!isCollapsed && (
          <div
            onMouseDown={handleMouseDown}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-30 group"
          >
            <div className="w-px h-full mx-auto bg-transparent group-hover:bg-primary/30 transition-colors duration-150" />
          </div>
        )}
      </div>
    </>
  )
}

