import React, { useState, useMemo, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  Mail, Calendar, Settings,
  Receipt, CheckSquare, ClipboardCheck,
  LogOut, ChevronDown, Menu, X,
  Plus, Moon, Sun, Monitor, CreditCard,
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
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', color: '#CC8A3F' },
  { label: 'Projecten', icon: FolderKanban, path: '/projecten', color: '#7EB5A6' },
  { label: 'Klanten', icon: Users, path: '/klanten', color: '#8BAFD4' },
  { label: 'Offertes', icon: FileText, path: '/offertes', color: '#9B8EC4' },
  { label: 'Facturen', icon: Receipt, path: '/facturen', color: '#E8866A' },
  { label: 'Taken', icon: CheckSquare, path: '/taken', color: '#C4A882' },
  { label: 'Werkbonnen', icon: ClipboardCheck, path: '/werkbonnen', color: '#D4836A' },
  { label: 'Planning', icon: Calendar, path: '/planning', color: '#7EB5A6' },
  { label: 'Email', icon: Mail, path: '/email', color: '#8BAFD4' },
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
  const userMenuRef = useRef<HTMLDivElement>(null)
  const quickAddRef = useRef<HTMLDivElement>(null)

  // Filter nav items
  const visibleItems = useMemo(() => {
    const sidebarItems = settings?.sidebar_items
    if (!Array.isArray(sidebarItems) || sidebarItems.length === 0) return navItems
    const normalized = sidebarItems.map((s: string) => s === 'Kalender' ? 'Planning' : s)
    return navItems.filter(item => normalized.includes(item.label) || item.label === 'Dashboard')
  }, [settings?.sidebar_items])

  // Close dropdowns on click outside / escape
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
    <>
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm flex-shrink-0 z-30">
        <div className="flex items-center h-14 px-4 md:px-5">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 mr-5 flex-shrink-0">
            <div className="sidebar-logo-mark flex-shrink-0" style={{ width: 32, height: 32, fontSize: 14 }}>F</div>
            <span className="hidden sm:block text-[15px] font-extrabold tracking-[-0.04em]">
              FORGE<span className="font-medium text-muted-foreground">desk</span>
            </span>
          </NavLink>

          {/* Quick-add button */}
          <div ref={quickAddRef} className="relative mr-3">
            <button
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              className={cn(
                'h-8 w-8 rounded-[10px] flex items-center justify-center transition-all duration-200',
                'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md',
                quickAddOpen && 'ring-2 ring-primary/20',
              )}
            >
              <Plus className={cn('w-4 h-4 transition-transform duration-200', quickAddOpen && 'rotate-45')} />
            </button>
            {quickAddOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden animate-scale-in">
                <div className="px-3 py-2 border-b border-border/40">
                  <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Snel aanmaken</span>
                </div>
                <div className="py-1">
                  {quickAddItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => { setQuickAddOpen(false); navigate(item.path) }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: `${item.color}18` }}>
                        <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary nav items — desktop */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1">
            {visibleItems.map((item) => {
              const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-200',
                    isActive
                      ? 'font-semibold'
                      : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40',
                  )}
                  style={isActive ? {
                    background: `${item.color}12`,
                    color: item.color,
                  } : undefined}
                >
                  <Icon className="w-4 h-4" style={isActive ? { color: item.color } : undefined} />
                  {item.label}
                </NavLink>
              )
            })}

            {/* Instellingen */}
            <NavLink
              to="/instellingen"
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-200',
                location.pathname.startsWith('/instellingen')
                  ? 'font-semibold bg-muted/60 text-foreground'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40',
              )}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden xl:inline">Instellingen</span>
            </NavLink>
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Search — desktop */}
            <GlobalSearch className="hidden md:flex w-44 lg:w-48 mr-2" compact />

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-[10px] flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 transition-all duration-200"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <NotificatieCenter />

            <div className="hidden md:block w-px h-5 bg-border/50 mx-1" />

            {/* User dropdown — desktop */}
            <div ref={userMenuRef} className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  'flex items-center gap-2 px-1.5 py-1.5 rounded-[10px] transition-all duration-200',
                  'hover:bg-muted/40',
                  userMenuOpen && 'bg-muted/40',
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center ring-2 ring-border/20">
                  <span className="text-white text-[11px] font-bold">{userInitial}</span>
                </div>
                <span className="hidden xl:block text-[13px] font-medium text-foreground max-w-[100px] truncate">{userName}</span>
                <ChevronDown className={cn('hidden xl:block w-3 h-3 text-muted-foreground/50 transition-transform', userMenuOpen && 'rotate-180')} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden animate-scale-in">
                  <div className="px-4 py-3 border-b border-border/40">
                    <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
                  </div>
                  <div className="py-1.5">
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/instellingen') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      Profiel
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/instellingen?tab=abonnement') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      Abonnement
                    </button>
                  </div>
                  <div className="border-t border-border/40 py-1.5">
                    <button
                      onClick={() => { setUserMenuOpen(false); setLayoutMode('sidebar') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors"
                    >
                      <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                      Zijbalk navigatie
                    </button>
                  </div>
                  <div className="border-t border-border/40 py-1.5">
                    <button
                      onClick={() => { setUserMenuOpen(false); logout() }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
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
              {visibleItems.map((item) => {
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200',
                      isActive ? 'font-semibold' : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40',
                    )}
                    style={isActive ? { background: `${item.color}12`, color: item.color } : undefined}
                  >
                    <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: isActive ? `${item.color}18` : 'transparent' }}>
                      <Icon className="w-4 h-4" style={isActive ? { color: item.color } : undefined} />
                    </div>
                    {item.label}
                  </NavLink>
                )
              })}
              <NavLink
                to="/instellingen"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors',
                  location.pathname.startsWith('/instellingen') ? 'text-foreground bg-muted/60' : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40',
                )}
              >
                <div className="w-7 h-7 rounded-[8px] flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                Instellingen
              </NavLink>
            </nav>
            {user && (
              <div className="border-t border-border/40 px-3 py-3">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center ring-2 ring-border/20">
                    <span className="text-white text-[11px] font-bold">{userInitial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={logout}>
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
