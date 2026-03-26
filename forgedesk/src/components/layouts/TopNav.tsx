import React, { useState, useMemo, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  Mail, Calendar, Settings,
  Receipt, CheckSquare, ClipboardCheck,
  LogOut, ChevronDown, Menu, X, Search,
  Plus, Moon, Sun, Monitor, CreditCard, Sparkles, PiggyBank, BookOpen,
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
  { label: 'Taken', icon: CheckSquare, path: '/taken', color: '#C4A882' },
  { label: 'Werkbonnen', icon: ClipboardCheck, path: '/werkbonnen', color: '#D4836A' },
  { label: 'Planning', icon: Calendar, path: '/planning', color: '#7EB5A6' },
  { label: 'Email', icon: Mail, path: '/email', color: '#8BAFD4' },
  { label: 'Financieel', icon: PiggyBank, path: '/financieel', color: '#2D6B48' },
  { label: 'Visualizer', icon: Sparkles, path: '/visualizer', color: '#9A5A48' },
]

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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const quickAddRef = useRef<HTMLDivElement>(null)

  const visibleItems = useMemo(() => {
    const sidebarItems = settings?.sidebar_items
    if (!Array.isArray(sidebarItems) || sidebarItems.length === 0) return navItems
    const normalized = sidebarItems.map((s: string) => s === 'Kalender' ? 'Planning' : s)
    return navItems.filter(item => normalized.includes(item.label) || item.label === 'Dashboard')
  }, [settings?.sidebar_items])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) setQuickAddOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') { setUserMenuOpen(false); setQuickAddOpen(false); setMobileOpen(false) }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEscape) }
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const userInitial = (user?.user_metadata?.voornaam?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const userName = user?.user_metadata?.voornaam
    ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
    : user?.email?.split('@')[0] || 'Gebruiker'

  return (
    <header className="flex-shrink-0" style={{ position: 'relative', zIndex: 30 }}>
      {/* ── Row 1: Utility bar ── */}
      <div className="flex items-center h-12 px-5 md:px-6 bg-[#1A535C]">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 mr-5 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center text-white font-extrabold text-[13px] flex-shrink-0">D</div>
          <span className="hidden sm:block text-[15px] font-extrabold tracking-[-0.04em] text-white">
            Doen<span className="text-[#F15025]">.</span>
          </span>
        </NavLink>

        {/* Quick-add button */}
        <div ref={quickAddRef} className="relative" style={{ zIndex: 40 }}>
          <button
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className={cn(
              'h-7 px-2.5 rounded-md flex items-center gap-1.5 transition-all duration-200 text-[12px] font-medium',
              'bg-[#F15025] text-white hover:bg-[#D94520]',
              quickAddOpen && 'ring-2 ring-white/20',
            )}
          >
            <Plus className={cn('w-3.5 h-3.5 transition-transform duration-200', quickAddOpen && 'rotate-45')} />
            <span className="hidden sm:inline">Nieuw</span>
          </button>
          {quickAddOpen && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-[#FFFFFF] border border-[#EBEBEB] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#EBEBEB]/40">
                <span className="text-[10px] font-semibold text-[#9B9B95] uppercase tracking-wider">Snel aanmaken</span>
              </div>
              <div className="py-1">
                {quickAddItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { setQuickAddOpen(false); navigate(item.path) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${item.color}15` }}>
                      <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search — desktop, compact centered */}
        <div className="hidden md:flex flex-1 justify-center mx-8">
          <GlobalSearch className="w-full max-w-xs" />
        </div>

        {/* Mobile search */}
        {mobileSearchOpen && (
          <div className="absolute inset-x-0 top-0 h-12 z-40 bg-[#1A535C] flex items-center gap-2 px-4 md:hidden">
            <GlobalSearch className="flex flex-1" />
            <button onClick={() => setMobileSearchOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="w-8 h-8 rounded-lg md:hidden flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <Search className="w-4 h-4" />
          </button>

          <NotificatieCenter />

          <div className="hidden md:block w-px h-5 bg-white/10 mx-1" />

          {/* User dropdown — desktop */}
          <div ref={userMenuRef} className="relative hidden md:block">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                'flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-lg transition-all duration-200',
                'hover:bg-white/10',
                userMenuOpen && 'bg-white/15',
              )}
            >
              <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{userInitial}</span>
              </div>
              <div className="hidden xl:block text-left min-w-0">
                <p className="text-[12px] font-semibold text-white truncate max-w-[100px] leading-tight">{userName}</p>
                <p className="text-[10px] text-white/50 truncate max-w-[100px]">{user?.email?.split('@')[0]}</p>
              </div>
              <ChevronDown className={cn('w-3 h-3 text-white/40 transition-transform hidden xl:block', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-[rgba(120,90,50,0.10)] z-50 overflow-hidden animate-scale-in">
                <div className="px-4 py-3.5 border-b border-border/40">
                  <p className="text-[14px] font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-[12px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="py-1.5">
                  <button onClick={() => { setUserMenuOpen(false); navigate('/instellingen') }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors">
                    <Settings className="w-4 h-4 text-muted-foreground" /> Profiel
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); navigate('/instellingen?tab=abonnement') }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors">
                    <CreditCard className="w-4 h-4 text-muted-foreground" /> Abonnement
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); navigate('/kennisbank') }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors">
                    <BookOpen className="w-4 h-4 text-muted-foreground" /> Kennisbank
                  </button>
                </div>
                <div className="border-t border-border/40 py-1.5">
                  <button onClick={() => { setUserMenuOpen(false); setLayoutMode('sidebar') }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors">
                    <Monitor className="w-4 h-4 text-muted-foreground" /> Zijbalk navigatie
                  </button>
                </div>
                <div className="border-t border-border/40 py-1.5">
                  <button onClick={() => { setUserMenuOpen(false); logout() }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-destructive hover:bg-destructive/5 transition-colors">
                    <LogOut className="w-4 h-4" /> Uitloggen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* ── Row 2: Navigation tabs — desktop ── */}
      <nav className="hidden lg:flex items-center gap-0.5 h-11 px-5 bg-[#F3F2F0] border-b border-[#EBEBEB] overflow-x-auto scrollbar-none">
        {visibleItems.map((item) => {
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-md transition-all duration-200 whitespace-nowrap flex-shrink-0',
                isActive
                  ? 'text-[#1A1A1A] font-semibold bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                  : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#FFFFFF]/50',
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? '' : 'opacity-50')} style={isActive ? { color: item.color } : undefined} />
              <span>{item.label}</span>
              {isActive && <span className="text-[#F15025] text-[13px] font-semibold -ml-0.5">.</span>}
            </NavLink>
          )
        })}

        {/* Separator + Instellingen */}
        <div className="flex-1" />
        <NavLink
          to="/instellingen"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-md transition-all duration-200 whitespace-nowrap flex-shrink-0',
            location.pathname.startsWith('/instellingen')
              ? 'text-[#1A1A1A] font-semibold bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#FFFFFF]/50',
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          {location.pathname.startsWith('/instellingen') && (
            <div className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-t-full bg-muted-foreground/40" />
          )}
        </NavLink>
      </nav>

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
                    'flex items-center gap-3 px-3 py-3 rounded-[12px] text-[14px] font-medium transition-all duration-200',
                    isActive ? 'font-semibold' : 'text-muted-foreground/60 hover:text-foreground',
                  )}
                  style={isActive ? { background: `${item.color}10`, color: item.color } : undefined}
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ background: isActive ? `${item.color}1A` : `${item.color}08` }}
                  >
                    <Icon className="w-[18px] h-[18px]" style={isActive ? { color: item.color } : { opacity: 0.4 }} />
                  </div>
                  {item.label}
                </NavLink>
              )
            })}

            <div className="h-px bg-border/30 my-2" />

            <NavLink
              to="/instellingen"
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-[12px] text-[14px] font-medium transition-colors',
                location.pathname.startsWith('/instellingen') ? 'text-foreground bg-muted/50' : 'text-muted-foreground/50 hover:text-foreground',
              )}
            >
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-muted/30">
                <Settings className="w-[18px] h-[18px]" style={{ opacity: 0.4 }} />
              </div>
              Instellingen
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
