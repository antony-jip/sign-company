import React, { useEffect, useRef, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  Mail, Calendar, PiggyBank, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X, CheckSquare,
  PenTool, Receipt, BarChart3, Clock, Wrench, UsersRound,
  ClipboardCheck, Truck, ShoppingCart, Warehouse,
  Briefcase, UserPlus,
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
      { label: 'Deals', icon: Briefcase, path: '/deals' },
      { label: 'Offertes', icon: FileText, path: '/offertes' },
      { label: 'Facturen', icon: Receipt, path: '/facturen' },
    ],
  },
  {
    section: 'Productie',
    items: [
      { label: 'Projecten', icon: FolderKanban, path: '/projecten' },
      { label: 'Taken', icon: CheckSquare, path: '/taken' },
      { label: 'Montage', icon: Wrench, path: '/montage' },
      { label: 'Werkbonnen', icon: ClipboardCheck, path: '/werkbonnen' },
    ],
  },
  {
    section: 'Planning',
    items: [
      { label: 'Planning', icon: Calendar, path: '/kalender' },
      { label: 'Tijdregistratie', icon: Clock, path: '/tijdregistratie' },
    ],
  },
  {
    section: 'Communicatie',
    items: [
      { label: 'Email', icon: Mail, path: '/email' },
      { label: 'Lead Capture', icon: UserPlus, path: '/leads' },
    ],
  },
  {
    section: 'Beheer',
    items: [
      { label: 'Voorraad', icon: Warehouse, path: '/voorraad' },
      { label: 'Bestelbonnen', icon: ShoppingCart, path: '/bestelbonnen' },
      { label: 'Leveranciers', icon: Truck, path: '/leveranciers' },
      { label: 'Financieel', icon: PiggyBank, path: '/financieel' },
      { label: 'Rapportages', icon: BarChart3, path: '/rapportages' },
      { label: 'Team', icon: UsersRound, path: '/team' },
      { label: 'Instellingen', icon: Settings, path: '/instellingen' },
    ],
  },
]

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar()
  const { user, logout } = useAuth()
  const { settings } = useAppSettings()
  const location = useLocation()

  // Filter navigatie op basis van instellingen — Instellingen is altijd zichtbaar
  const filteredNavSections = useMemo(() => {
    const sidebarItems = settings.sidebar_items
    // Als sidebar_items niet is ingesteld of leeg is, toon alles
    if (!sidebarItems || sidebarItems.length === 0) return navSections
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
            ? 'active text-white bg-white/[0.08]'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn(
          'w-[17px] h-[17px] flex-shrink-0 transition-colors duration-200',
          isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-400'
        )} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    )

    if (isCollapsed) {
      return (
        <div key={item.path} className="relative group">
          {link}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 wm-tooltip opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
            {item.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[hsl(42,28%,14%)]" />
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
          'flex items-center h-16 px-4 border-b border-white/[0.05] flex-shrink-0',
          isCollapsed ? 'justify-center' : 'gap-3'
        )}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent via-primary to-wm-pale flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
          <PenTool className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div>
            <span className="text-[15px] font-bold text-white tracking-tight font-display">
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
              <div className="mx-2 my-2 border-t border-white/[0.04]" />
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
      <div className="border-t border-white/[0.05] p-3 space-y-2 flex-shrink-0">
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors duration-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 ring-2 ring-white/[0.08]">
              <span className="text-white text-xs font-semibold">
                {(user.user_metadata?.voornaam?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.user_metadata?.voornaam
                  ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
                  : user.email?.split('@')[0] || 'Gebruiker'}
              </p>
              <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 rounded-lg"
              onClick={logout}
              title="Uitloggen"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {isCollapsed && user && (
          <div className="relative group flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center cursor-pointer ring-2 ring-white/[0.08]">
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
            'w-full text-gray-500 hover:text-white hover:bg-white/[0.04] transition-colors duration-200 h-8 text-xs',
            isCollapsed && 'px-0 justify-center'
          )}
          onClick={toggleSidebar}
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
        className="fixed top-3 left-3 z-50 md:hidden wm-glass-subtle shadow-lg border border-border/50 rounded-xl"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Sluit menu' : 'Open menu'}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" aria-hidden="true" />
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
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen wm-sidebar transition-all duration-300 ease-in-out flex-shrink-0',
          isCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
