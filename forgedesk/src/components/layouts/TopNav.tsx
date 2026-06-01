import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  Mail, Calendar, Settings,
  Receipt, CheckSquare, ClipboardCheck, Inbox,
  LogOut, ChevronDown, Menu, X, Search,
  Plus, Moon, Sun, Monitor, CreditCard, Sparkles, PiggyBank, BookOpen,
  Pin, PinOff,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { Button } from '@/components/ui/button'
import { NotificatieCenter } from '@/components/notifications/NotificatieCenter'
import { GlobalSearch } from '@/components/shared/GlobalSearch'
import { DarkModeToggle } from '@/components/shared/DarkModeToggle'

interface NavItem {
  label: string
  icon: LucideIcon
  path: string
  color: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', color: '#1A535C' },
  { label: 'Projecten', icon: FolderKanban, path: '/projecten', color: '#7EB5A6' },
  { label: 'Klanten', icon: Users, path: '/klanten', color: '#8BAFD4' },
  { label: 'Offertes', icon: FileText, path: '/offertes', color: '#9B8EC4' },
  { label: 'Facturen', icon: Receipt, path: '/facturen', color: '#E8866A' },
  { label: 'Inkoopfacturen', icon: Inbox, path: '/inkoopfacturen', color: '#C44830' },
  { label: 'Taken', icon: CheckSquare, path: '/taken', color: '#C4A882' },
  { label: 'Werkbonnen', icon: ClipboardCheck, path: '/werkbonnen', color: '#D4836A' },
  { label: 'Planning', icon: Calendar, path: '/planning', color: '#7EB5A6' },
  { label: 'Email', icon: Mail, path: '/email', color: '#8BAFD4' },
  { label: 'Financieel', icon: PiggyBank, path: '/financieel', color: '#2D6B48' },
]

// Meest gebruikte modules staan los in de balk; de rest komt onder "Overig".
const PRIMARY_LABELS = ['Dashboard', 'Projecten', 'Taken', 'Offertes', 'Planning', 'Werkbonnen', 'Email']

const quickAddItems = [
  { label: 'Nieuw Project', icon: FolderKanban, path: '/projecten/nieuw', color: '#7EB5A6' },
  { label: 'Nieuwe Offerte', icon: FileText, path: '/offertes/nieuw', color: '#9B8EC4' },
  { label: 'Nieuwe Klant', icon: Users, path: '/klanten?nieuw=true', color: '#8BAFD4' },
  { label: 'Nieuw Werkbon', icon: ClipboardCheck, path: '/werkbonnen/nieuw', color: '#D4836A' },
  { label: 'Nieuwe Factuur', icon: Receipt, path: '/facturen/nieuw', color: '#E8866A' },
  { label: 'Nieuwe Email', icon: Mail, path: '/email?compose=true', color: '#8BAFD4' },
]

export function TopNav() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { settings } = useAppSettings()
  const { setLayoutMode } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [overigOpen, setOverigOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const quickAddRef = useRef<HTMLDivElement>(null)
  const overigRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  const visibleItems = useMemo(() => {
    const sidebarItems = settings?.sidebar_items
    if (!Array.isArray(sidebarItems) || sidebarItems.length === 0) return navItems
    const normalized = sidebarItems.map((s: string) => s === 'Kalender' ? 'Planning' : s)
    return navItems.filter(item => normalized.includes(item.label) || item.label === 'Dashboard')
  }, [settings?.sidebar_items])

  // Splits de zichtbare modules in een vaste primaire set + een "Overig"-rest.
  // Primair volgt de PRIMARY_LABELS-volgorde; Overig houdt de menu-volgorde aan.
  const primaryItems = useMemo(
    () => PRIMARY_LABELS.map((label) => visibleItems.find((i) => i.label === label)).filter(Boolean) as NavItem[],
    [visibleItems],
  )
  const overigItems = useMemo(() => visibleItems.filter((i) => !PRIMARY_LABELS.includes(i.label)), [visibleItems])
  const overigActive = overigItems.some((i) => location.pathname.startsWith(i.path))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) setQuickAddOpen(false)
      if (overigRef.current && !overigRef.current.contains(e.target as Node)) setOverigOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') { setUserMenuOpen(false); setQuickAddOpen(false); setOverigOpen(false); setMobileOpen(false) }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEscape) }
  }, [])

  useEffect(() => { setMobileOpen(false); setOverigOpen(false) }, [location.pathname])

  const updateIndicator = useCallback(() => {
    if (!navRef.current || !indicatorRef.current) return
    const activeLink = navRef.current.querySelector<HTMLElement>('[data-active="true"]')
    const target = activeLink?.querySelector<HTMLElement>('[data-tab-content]') ?? activeLink
    if (target) {
      const navRect = navRef.current.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      indicatorRef.current.style.width = `${targetRect.width}px`
      indicatorRef.current.style.transform = `translateX(${targetRect.left - navRect.left}px)`
      indicatorRef.current.style.opacity = '1'
    } else {
      indicatorRef.current.style.opacity = '0'
    }
  }, [])

  useEffect(() => {
    updateIndicator()
  }, [location.pathname, visibleItems, updateIndicator])

  useEffect(() => {
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [updateIndicator])

  const [stickyHeader, setStickyHeader] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('doen_topnav_sticky') === '1'
  })
  const toggleStickyHeader = useCallback(() => {
    setStickyHeader((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('doen_topnav_sticky', next ? '1' : '0')
        window.dispatchEvent(new Event('doen-sticky-changed'))
      }
      return next
    })
  }, [])

  const userInitial = (user?.user_metadata?.voornaam?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const userName = user?.user_metadata?.voornaam
    ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
    : user?.email?.split('@')[0] || 'Gebruiker'

  return (
    <header className="flex-shrink-0" style={{ position: 'relative', zIndex: 30 }}>
      {/* ── Row 1: Cohesieve balk (doen.-stijl) ── */}
      <div className="relative flex items-center gap-2.5 h-[56px] px-3.5 bg-card border-b border-border">
        {/* Logo */}
        <NavLink to="/" className="relative flex items-center flex-shrink-0 opacity-95 hover:opacity-100 transition-opacity">
          <img src="/logos/doen-logo.svg" alt="doen." className="h-[22px] dark:hidden" />
          <img
            src="/logos/doen-logo-wit.svg"
            alt="doen."
            className="h-[22px] hidden dark:block"
            style={{ filter: 'drop-shadow(0 0 16px rgba(241, 80, 37, 0.18))' }}
          />
        </NavLink>

        {/* Divider na logo */}
        <div className="hidden lg:block w-px h-[22px] bg-border flex-none" />

        {/* Quick-add — mobile only */}
        <div className="relative lg:hidden" style={{ zIndex: 40 }}>
          <button
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className={cn(
              'h-6 px-2 rounded-md flex items-center gap-1.5 transition-all duration-200 text-[11px] font-medium',
              'bg-black/[0.04] text-foreground/70 hover:bg-black/[0.06] hover:text-foreground',
              quickAddOpen && 'bg-black/[0.06] text-foreground',
            )}
          >
            <Plus className={cn('w-3 h-3 transition-transform duration-200', quickAddOpen && 'rotate-45')} />
            <span className="hidden sm:inline">Nieuw</span>
          </button>
          {quickAddOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 z-50 overflow-hidden rounded-[16px] bg-popover border border-border/70 shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] p-1.5">
              <div className="px-2.5 pt-1.5 pb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Snel aanmaken</span>
              </div>
              {quickAddItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { setQuickAddOpen(false); navigate(item.path) }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${item.color}15` }}>
                    <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  </div>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Module-nav: directe modules, actief = witte pill + flame-underline (glijdt mee) ── */}
        <nav ref={navRef} className="relative hidden lg:flex items-center gap-px flex-1 min-w-0">
          {/* Sliding highlight — witte pill (rand + schaduw) met flame-underline */}
          <div
            ref={indicatorRef}
            className="absolute top-1/2 -mt-[17px] left-0 h-[34px] rounded-[10px] bg-[hsl(38,20%,94%)] dark:bg-white/[0.07] transition-all duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ opacity: 0 }}
          >
            <span className="absolute left-[13px] right-[13px] -bottom-px h-[2px] rounded-[2px] bg-[#F15025]" />
          </div>

          {primaryItems.map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                data-active={isActive}
                className={cn(
                  'group relative flex items-center h-[34px] px-[13px] rounded-[10px] text-[13px] font-semibold tracking-[-0.1px] whitespace-nowrap transition-colors duration-150',
                  isActive
                    ? 'text-[#1A535C] dark:text-foreground'
                    : 'text-[#1A535C]/55 hover:text-[#1A535C] dark:text-foreground/55 dark:hover:text-foreground',
                )}
              >
                <span>{item.label}<span className={cn('transition-colors', isActive ? 'text-[#F15025]' : 'text-transparent group-hover:text-[#F15025]')}>.</span></span>
              </NavLink>
            )
          })}

          {/* Overig — minder gebruikte modules in een strak lijstje */}
          {overigItems.length > 0 && (
            <div ref={overigRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setOverigOpen((o) => !o)}
                data-active={overigActive}
                aria-expanded={overigOpen}
                className={cn(
                  'group relative flex items-center gap-1 h-[34px] px-[13px] rounded-[10px] text-[13px] font-semibold tracking-[-0.1px] whitespace-nowrap transition-colors duration-150',
                  overigActive
                    ? 'text-[#1A535C] dark:text-foreground'
                    : 'text-[#1A535C]/55 hover:text-[#1A535C] dark:text-foreground/55 dark:hover:text-foreground',
                )}
              >
                <span>Overig<span className={cn('transition-colors', overigActive ? 'text-[#F15025]' : 'text-transparent group-hover:text-[#F15025]')}>.</span></span>
                <ChevronDown className={cn('w-[13px] h-[13px] -ml-0.5 opacity-55 transition-transform duration-200', overigOpen && 'rotate-180')} />
              </button>

              {overigOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 z-50 overflow-hidden rounded-[16px] bg-popover border border-border/70 shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] p-1.5">
                  {overigItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path)
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setOverigOpen(false)}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13px] font-medium transition-colors',
                          isActive ? 'text-foreground bg-[hsl(38,20%,95.5%)] dark:bg-white/[0.06]' : 'text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06]',
                        )}
                      >
                        <Icon className="w-4 h-4" style={{ color: isActive ? item.color : undefined, opacity: isActive ? 1 : 0.6 }} />
                        <span>{item.label}<span className="text-[#F15025]">.</span></span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Mobile search */}
        {mobileSearchOpen && (
          <div className="absolute inset-x-0 top-0 h-[50px] z-40 bg-background flex items-center gap-2 px-4 md:hidden">
            <GlobalSearch className="flex flex-1" />
            <button onClick={() => setMobileSearchOpen(false)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/[0.04]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right cluster — search + icons + avatar (gap 5px) */}
        <div className="relative flex items-center gap-[5px] ml-auto md:ml-0">
          {/* Search — desktop */}
          <div className="hidden md:flex flex-shrink-0">
            <GlobalSearch className="w-[190px] xl:w-[230px]" />
          </div>

          <button
            onClick={() => setMobileSearchOpen(true)}
            className="w-7 h-7 rounded-md md:hidden flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-all"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <div className="order-3 md:order-none">
            <NotificatieCenter />
          </div>

          {/* Sticky-header pin — desktop */}
          <button
            type="button"
            onClick={toggleStickyHeader}
            className={cn(
              'tap-press hidden md:inline-flex items-center justify-center w-[34px] h-[34px] rounded-lg transition-colors duration-150 active:scale-[0.94]',
              stickyHeader
                ? 'text-[#F15025] bg-[#F15025]/10 hover:bg-[#F15025]/15 dark:bg-[#F15025]/15 dark:hover:bg-[#F15025]/20'
                : 'text-[#1A535C]/60 hover:text-[#1A535C] hover:bg-[hsl(38,20%,95.5%)] dark:text-foreground/65 dark:hover:text-foreground dark:hover:bg-white/[0.05]',
            )}
            title={stickyHeader ? 'Header losmaken' : 'Header vastpinnen'}
            aria-label={stickyHeader ? 'Header losmaken' : 'Header vastpinnen'}
            aria-pressed={stickyHeader}
          >
            {stickyHeader ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>

          {/* Dark-mode toggle — desktop */}
          <DarkModeToggle className="hidden md:inline-flex" />

          <div className="hidden md:block w-px h-[22px] bg-border mx-0.5" />

          {/* User dropdown — lichte warm-pill met petrol vierkant-avatar */}
          <div ref={userMenuRef} className="relative hidden md:block">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                'flex items-center gap-2 h-[34px] pl-[3px] pr-[9px] rounded-lg border transition-colors duration-150',
                userMenuOpen
                  ? 'bg-card border-border'
                  : 'bg-[hsl(38,20%,95.5%)] border-transparent hover:bg-card hover:border-border dark:bg-white/[0.05] dark:hover:bg-white/[0.08]',
              )}
            >
              <span className="w-[27px] h-[27px] rounded-[7px] flex items-center justify-center bg-[#1A535C] text-white font-bold text-[13px]">{userInitial}</span>
              <span className="hidden xl:block text-[13.5px] font-semibold text-[#1A535C] dark:text-foreground truncate max-w-[90px] leading-none">{userName}</span>
              <ChevronDown className={cn('w-[13px] h-[13px] text-[#1A535C]/60 dark:text-foreground/55 transition-transform hidden xl:block', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-60 z-50 overflow-hidden rounded-[16px] bg-popover border border-border/70 shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] p-1.5"
              >
                <div className="flex items-center gap-2.5 px-2 py-2">
                  <span className="w-9 h-9 rounded-[9px] flex items-center justify-center bg-[#1A535C] text-white font-bold text-[14px] flex-shrink-0">{userInitial}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
                  </div>
                </div>

                <div className="h-px bg-border/50 mx-2 my-1" />

                <button onClick={() => { setUserMenuOpen(false); navigate('/instellingen') }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors">
                  <Settings className="w-[17px] h-[17px] text-muted-foreground" /> Profiel
                </button>
                <button onClick={() => { setUserMenuOpen(false); navigate('/instellingen?tab=abonnement') }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors">
                  <CreditCard className="w-[17px] h-[17px] text-muted-foreground" /> Abonnement
                </button>
                <button onClick={() => { setUserMenuOpen(false); navigate('/kennisbank') }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors">
                  <BookOpen className="w-[17px] h-[17px] text-muted-foreground" /> Kennisbank
                </button>
                <button onClick={() => { setUserMenuOpen(false); setLayoutMode('sidebar') }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-foreground/75 hover:text-foreground hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors">
                  <Monitor className="w-[17px] h-[17px] text-muted-foreground" /> Zijbalk navigatie
                </button>

                <div className="h-px bg-border/50 mx-2 my-1" />

                <button onClick={() => { setUserMenuOpen(false); logout() }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium text-[#F15025] hover:bg-[#F15025]/[0.07] transition-colors">
                  <LogOut className="w-[17px] h-[17px]" /> Uitloggen
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <Button variant="ghost" size="icon" className="w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.04] lg:hidden order-2 md:order-none"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── Mobile nav dropdown ── */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border/40 bg-card/98 backdrop-blur-md max-h-[75vh] overflow-y-auto">
          <nav className="py-3 px-4 space-y-1">
            {visibleItems.map((item) => {
              const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-[12px] text-[14px] font-semibold tracking-[-0.01em] transition-all duration-200',
                    isActive ? '' : 'text-muted-foreground/60 hover:text-foreground',
                  )}
                  style={isActive ? { background: `${item.color}10`, color: item.color } : undefined}
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ background: isActive ? `${item.color}1A` : `${item.color}08` }}
                  >
                    <Icon className="w-[18px] h-[18px]" style={isActive ? { color: item.color } : { opacity: 0.4 }} />
                  </div>
                  <span>{item.label}<span className="text-[#F15025]">.</span></span>
                </NavLink>
              )
            })}

            <div className="h-px bg-border/30 my-2" />

            <NavLink
              to="/instellingen"
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-[12px] text-[14px] font-semibold tracking-[-0.01em] transition-colors',
                location.pathname.startsWith('/instellingen') ? 'text-foreground bg-muted/50' : 'text-muted-foreground/50 hover:text-foreground',
              )}
            >
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-muted/30">
                <Settings className="w-[18px] h-[18px]" style={{ opacity: 0.4 }} />
              </div>
              <span>Instellingen<span className="text-[#F15025]">.</span></span>
            </NavLink>
          </nav>

          {/* Mobile user section */}
          {user && (
            <div className="border-t border-border/40 px-4 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center ring-2 ring-border/20">
                  <span className="text-white text-[13px] font-bold">{userInitial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-[12px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMobileOpen(false); setLayoutMode('sidebar') }}
                  className="flex-1 flex items-center justify-center gap-2 h-9 rounded-[10px] border border-border/40 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Zijbalk
                </button>
                <button
                  onClick={logout}
                  className="flex items-center justify-center w-9 h-9 rounded-[10px] border border-border/40 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
