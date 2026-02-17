import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Sun, Moon, Bell, Globe, User, Settings, LogOut,
  ChevronDown, X, Command
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/projecten': 'Projecten',
  '/klanten': 'Klanten',
  '/offertes': 'Offertes',
  '/documenten': 'Documenten',
  '/email': 'Email',
  '/kalender': 'Kalender',
  '/financieel': 'Financieel',
  '/ai': 'AI Assistent',
  '/instellingen': 'Instellingen',
}

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname]
  const baseRoute = '/' + pathname.split('/')[1]
  return routeTitles[baseRoute] || 'Workmate'
}

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const userMenuRef = React.useRef<HTMLDivElement>(null)
  const notificationRef = React.useRef<HTMLDivElement>(null)

  const pageTitle = getPageTitle(location.pathname)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
        setNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const toggleLanguage = () => {
    setLanguage(language === 'nl' ? 'en' : 'nl')
  }

  const userInitial = (
    user?.user_metadata?.voornaam?.[0] || user?.email?.[0] || 'U'
  ).toUpperCase()

  const userName = user?.user_metadata?.voornaam
    ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
    : user?.email?.split('@')[0] || 'Gebruiker'

  return (
    <header className="h-16 border-b border-border/50 wm-glass flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10">
      {/* Left: Page title */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 md:hidden" />
        <div>
          <h1 className="text-lg font-semibold text-foreground truncate">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Center: Search bar */}
      <form
        onSubmit={handleSearch}
        className="hidden md:flex items-center flex-1 max-w-md mx-8 relative"
      >
        <div
          className={cn(
            'flex items-center w-full rounded-xl border transition-all duration-300',
            searchFocused
              ? 'border-primary/40 bg-background shadow-lg shadow-primary/5 ring-2 ring-primary/10'
              : 'border-border/60 bg-muted/40 hover:bg-muted/60'
          )}
        >
          <Search className="w-4 h-4 text-muted-foreground ml-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Zoeken..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground px-3 py-2.5"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mr-2.5 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Zoekopdracht wissen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="mr-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/40">
              <Command className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">K</span>
            </div>
          )}
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
          onClick={toggleLanguage}
          title={language === 'nl' ? 'Switch to English' : 'Wissel naar Nederlands'}
        >
          <span className="text-xs font-bold">{language.toUpperCase()}</span>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Donkere modus' : 'Lichte modus'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </Button>

        {/* Notifications */}
        <div ref={notificationRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 wm-notification-dot"
            onClick={() => {
              setNotificationOpen(!notificationOpen)
              setUserMenuOpen(false)
            }}
            title="Notificaties"
          >
            <Bell className="w-4 h-4" />
          </Button>

          {/* Notification dropdown */}
          {notificationOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden animate-scale-in">
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Notificaties
                </h3>
                <button
                  onClick={() => setNotificationOpen(false)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Alles gelezen
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-muted/50 border-l-2 border-primary transition-colors cursor-pointer">
                  <p className="text-sm text-foreground font-medium">
                    Nieuwe offerte goedgekeurd
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Klant De Vries B.V. heeft offerte #2024-015 goedgekeurd
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    2 minuten geleden
                  </p>
                </div>
                <div className="px-4 py-3 hover:bg-muted/50 border-l-2 border-transparent transition-colors cursor-pointer">
                  <p className="text-sm text-foreground/80">
                    Project deadline nadert
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Project &quot;Lichtreclame Bakkerij Jansen&quot; deadline over 2 dagen
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    1 uur geleden
                  </p>
                </div>
                <div className="px-4 py-3 hover:bg-muted/50 border-l-2 border-transparent transition-colors cursor-pointer">
                  <p className="text-sm text-foreground/80">
                    3 nieuwe emails ontvangen
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Je hebt ongelezen berichten in je inbox
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    3 uur geleden
                  </p>
                </div>
              </div>
              <div className="px-4 py-2.5 border-t border-border/60">
                <button
                  onClick={() => {
                    setNotificationOpen(false)
                    navigate('/instellingen')
                  }}
                  className="text-sm text-primary hover:underline font-medium w-full text-center"
                >
                  Alle notificaties bekijken
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="hidden md:block w-px h-6 bg-border/60 mx-1.5" />

        {/* User dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen)
              setNotificationOpen(false)
            }}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200',
              'hover:bg-muted/60',
              userMenuOpen && 'bg-muted/60'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/10">
              <span className="text-white text-xs font-semibold">
                {userInitial}
              </span>
            </div>
            <span className="hidden lg:block text-sm font-medium text-foreground max-w-[120px] truncate">
              {userName}
            </span>
            <ChevronDown className={cn(
              'hidden lg:block w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
              userMenuOpen && 'rotate-180'
            )} />
          </button>

          {/* User dropdown menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden animate-scale-in">
              <div className="px-4 py-3 border-b border-border/60">
                <p className="text-sm font-medium text-foreground truncate">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {user?.email}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/instellingen')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 transition-colors"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  Profiel
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/instellingen')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Instellingen
                </button>
              </div>

              <div className="border-t border-border/60 py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    logout()
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Uitloggen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
