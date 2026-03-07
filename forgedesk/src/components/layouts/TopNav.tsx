import React, { useState, useMemo, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  Mail, Calendar, PiggyBank, Settings,
  Receipt, BarChart3, Wrench, UsersRound,
  CheckSquare, Briefcase, Files, Newspaper,
  Calculator, LogOut, User,
  ChevronDown, MoreHorizontal, Menu, X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { Button } from '@/components/ui/button'
import { NotificatieCenter } from '@/components/notifications/NotificatieCenter'
import { GlobalSearch } from '@/components/shared/GlobalSearch'

interface NavItem {
  label: string
  icon: LucideIcon
  path: string
}

const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Projecten', icon: FolderKanban, path: '/projecten' },
  { label: 'Klanten', icon: Users, path: '/klanten' },
  { label: 'Offertes', icon: FileText, path: '/offertes' },
  { label: 'Facturen', icon: Receipt, path: '/facturen' },
  { label: 'Taken', icon: CheckSquare, path: '/taken' },
  { label: 'Planning', icon: Calendar, path: '/planning' },
  { label: 'Deals', icon: Briefcase, path: '/deals' },
  { label: 'Werkbonnen', icon: CheckSquare, path: '/werkbonnen' },
  { label: 'Email', icon: Mail, path: '/email' },
  { label: 'Financieel', icon: PiggyBank, path: '/financieel' },
]

const moreNavItems: NavItem[] = [
  { label: 'Nacalculatie', icon: Calculator, path: '/nacalculatie' },
  { label: 'Nieuwsbrieven', icon: Newspaper, path: '/nieuwsbrieven' },
  { label: 'Documenten', icon: Files, path: '/documenten' },
  { label: 'Rapportages', icon: BarChart3, path: '/rapportages' },
  { label: 'Team', icon: UsersRound, path: '/team' },
]

export function TopNav() {
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const { settings } = useAppSettings()
  const { setLayoutMode } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Filter nav items based on sidebar_items setting
  const sidebarItems = settings?.sidebar_items
  const filterItem = (item: NavItem) => {
    if (item.label === 'Dashboard' || item.label === 'Instellingen') return true
    if (!Array.isArray(sidebarItems) || sidebarItems.length === 0) return true
    const normalized = sidebarItems.map((s: string) => s === 'Kalender' ? 'Planning' : s)
    return normalized.includes(item.label)
  }

  const visiblePrimary = useMemo(() => primaryNavItems.filter(filterItem), [sidebarItems])
  const visibleMore = useMemo(() => moreNavItems.filter(filterItem), [sidebarItems])

  // Is a "more" item currently active?
  const moreItemActive = visibleMore.some((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') { setMoreOpen(false); setUserMenuOpen(false); setMobileOpen(false) }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const userInitial = (
    user?.user_metadata?.voornaam?.[0] || user?.email?.[0] || 'U'
  ).toUpperCase()

  const userName = user?.user_metadata?.voornaam
    ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
    : user?.email?.split('@')[0] || 'Gebruiker'

  return (
    <>
      <header className="border-b border-border/50 wm-glass flex-shrink-0" style={{ position: 'relative', zIndex: 30 }}>
        {/* Main nav row */}
        <div className="flex items-center h-14 px-4 md:px-6">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 mr-6 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent via-primary to-wm-pale flex items-center justify-center shadow-md shadow-primary/20">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
                <path d="M7 9h2" />
                <path d="M15 9h2" />
                <path d="M10 12h4" />
              </svg>
            </div>
            <span className="hidden sm:block text-sm font-bold text-foreground tracking-tight font-display">
              Sign Company
            </span>
          </NavLink>

          {/* Primary nav items — desktop */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {visiblePrimary.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            {/* More dropdown */}
            {visibleMore.length > 0 && (
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                    moreOpen || moreItemActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  Meer
                  <ChevronDown className={cn('w-3 h-3 transition-transform', moreOpen && 'rotate-180')} />
                </button>

                {moreOpen && (
                  <div className="absolute left-0 top-full mt-2 w-52 bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/10 z-50 overflow-hidden py-1">
                    {visibleMore.map((item) => {
                      const isActive = item.path === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(item.path)
                      const Icon = item.icon
                      return (
                        <button
                          key={item.path}
                          onClick={() => { navigate(item.path); setMoreOpen(false) }}
                          className={cn(
                            'flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors',
                            isActive
                              ? 'text-primary bg-primary/5 font-medium'
                              : 'text-foreground/80 hover:bg-muted/50'
                          )}
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {item.label}
                        </button>
                      )
                    })}
                    <div className="border-t border-border/40 mt-1 pt-1">
                      <button
                        onClick={() => { navigate('/instellingen'); setMoreOpen(false) }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        Instellingen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search — desktop */}
          <GlobalSearch className="hidden md:flex w-44 lg:w-52 mr-3" compact />

          {/* Right actions */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
              onClick={() => setLanguage(language === 'nl' ? 'en' : 'nl')}
              title={language === 'nl' ? 'Switch to English' : 'Wissel naar Nederlands'}
            >
              <span className="text-[10px] font-bold">{language.toUpperCase()}</span>
            </Button>

            <NotificatieCenter />

            <div className="hidden md:block w-px h-5 bg-border/60 mx-1" />

            {/* User dropdown */}
            <div ref={userMenuRef} className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  'flex items-center gap-2 px-1.5 py-1 rounded-lg transition-all duration-200',
                  'hover:bg-muted/60',
                  userMenuOpen && 'bg-muted/60'
                )}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/10">
                  <span className="text-white text-[10px] font-semibold">{userInitial}</span>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60">
                    <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/instellingen') }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      Profiel
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/instellingen') }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Instellingen
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); setLayoutMode('sidebar') }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <Menu className="w-4 h-4 text-muted-foreground" />
                      Zijbalk navigatie
                    </button>
                  </div>
                  <div className="border-t border-border/60 py-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); logout() }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Uitloggen
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border/40 bg-card/95 backdrop-blur-sm max-h-[70vh] overflow-y-auto">
            <nav className="py-2 px-3 space-y-0.5">
              {[...visiblePrimary, ...visibleMore].map((item) => {
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'text-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                )
              })}
              <NavLink
                to="/instellingen"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  location.pathname.startsWith('/instellingen')
                    ? 'text-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Settings className="w-4 h-4" />
                Instellingen
              </NavLink>
            </nav>
            {/* Mobile user section */}
            {user && (
              <div className="border-t border-border/40 px-3 py-3">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/10">
                    <span className="text-white text-xs font-semibold">{userInitial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-red-500"
                    onClick={logout}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  )
}
