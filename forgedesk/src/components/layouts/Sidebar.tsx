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
  CalendarCheck,
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
    items: [
      { label: 'Planning', icon: Calendar, path: '/kalender' },
    ],
  },
  {
    section: 'Communicatie',
    items: [
      { label: 'Email', icon: Mail, path: '/email' },
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

    const link = (
      <NavLink
        to={item.path}
        className={cn(
          'wm-sidebar-item flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative group',
          isActive
            ? 'active text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn(
          'w-[17px] h-[17px] flex-shrink-0 transition-colors duration-200',
          isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
        )} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
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
          'flex items-center h-16 px-4 border-b border-border/50 flex-shrink-0',
          isCollapsed ? 'justify-center' : 'gap-3'
        )}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent via-primary to-wm-pale flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="12" rx="2" />
            <path d="M8 20h8" />
            <path d="M12 16v4" />
            <path d="M7 9h2" />
            <path d="M15 9h2" />
            <path d="M10 12h4" />
          </svg>
        </div>
        {!isCollapsed && (
          <div>
            <span className="text-[15px] font-bold text-foreground tracking-tight font-display">
              Sign Company
            </span>
          </div>
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 ring-2 ring-primary/10">
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center cursor-pointer ring-2 ring-primary/10">
              <span className="text-white text-xs font-semibold">
                {(user.user_metadata?.voornaam?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 wm-tooltip opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
              {user.user_metadata?.voornaam || user.email?.split('@')[0] || 'Gebruiker'}
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-200 h-8 text-xs',
            isCollapsed && 'px-0 justify-center'
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

