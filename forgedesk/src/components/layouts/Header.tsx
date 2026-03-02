import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Sun, Moon, User, Settings, LogOut,
  ChevronDown, Monitor, Search, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { Button } from '@/components/ui/button'
import { NotificatieCenter } from '@/components/notifications/NotificatieCenter'
import { GlobalSearch } from '@/components/shared/GlobalSearch'

const routeMeta: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard' },
  '/projecten': { title: 'Projecten', subtitle: 'Lichtreclames, gevelbelettering & meer' },
  '/klanten': { title: 'Klanten', subtitle: 'Opdrachtgevers & contactpersonen' },
  '/offertes': { title: 'Offertes', subtitle: 'Van aanvraag tot akkoord' },
  '/facturen': { title: 'Facturen', subtitle: 'Facturatie & betalingen' },
  '/documenten': { title: 'Documenten' },
  '/email': { title: 'Email', subtitle: 'Klantcommunicatie' },
  '/kalender': { title: 'Kalender', subtitle: 'Afspraken & deadlines' },
  '/montage': { title: 'Montage Planning', subtitle: 'Installaties & plaatsingen' },
  '/tijdregistratie': { title: 'Tijdregistratie', subtitle: 'Uren per project' },
  '/financieel': { title: 'Financieel', subtitle: 'Omzet & kosten' },
  '/rapportages': { title: 'Rapportages' },
  '/nacalculatie': { title: 'Nacalculatie' },
  '/team': { title: 'Team', subtitle: 'Monteurs & medewerkers' },
  '/ai': { title: 'AI Assistent' },
  '/instellingen': { title: 'Instellingen' },
  '/werkbonnen': { title: 'Werkbonnen', subtitle: 'Productie & uren' },
  '/taken': { title: 'Taken', subtitle: 'Productie & opvolging' },
  '/deals': { title: 'Deals', subtitle: 'Verkoopkansen' },
  '/voorraad': { title: 'Voorraad', subtitle: 'Vinyl, dibond, LED & meer' },
  '/leads': { title: 'Lead Capture', subtitle: 'Inkomende aanvragen' },
  '/bestelbonnen': { title: 'Bestelbonnen', subtitle: 'Inkoop bij leveranciers' },
  '/leveringsbonnen': { title: 'Leveringsbonnen', subtitle: 'Ontvangst & levering' },
  '/forecast': { title: 'Forecast', subtitle: 'Omzetprognose' },
  '/nieuwsbrieven': { title: 'Nieuwsbrieven', subtitle: 'Klantcommunicatie' },
  '/importeren': { title: 'Importeren', subtitle: 'Data importeren' },
  '/booking': { title: 'Booking', subtitle: 'Afspraken & planning' },
}

function getPageMeta(pathname: string): { title: string; subtitle?: string } {
  if (routeMeta[pathname]) return routeMeta[pathname]
  const baseRoute = '/' + pathname.split('/')[1]
  return routeMeta[baseRoute] || { title: 'Sign Company' }
}

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const { setLayoutMode } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const userMenuRef = React.useRef<HTMLDivElement>(null)

  const pageMeta = getPageMeta(location.pathname)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

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
    <header className="h-14 md:h-16 border-b border-border/50 wm-glass flex items-center justify-between px-3 md:px-6 flex-shrink-0 z-10">
      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-x-0 top-0 h-14 z-20 bg-background border-b border-border/50 flex items-center gap-2 px-3 md:hidden">
          <GlobalSearch className="flex flex-1" compact />
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg flex-shrink-0"
            onClick={() => setMobileSearchOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Left: Page title + subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 md:hidden" />
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-semibold text-foreground truncate font-display leading-tight">
            {pageMeta.title}
          </h1>
          {pageMeta.subtitle && (
            <p className="text-[11px] text-muted-foreground/70 truncate hidden sm:block">
              {pageMeta.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center: Search bar (desktop) */}
      <GlobalSearch className="hidden md:flex flex-1 max-w-md mx-8" />

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5 md:gap-1">
        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 md:hidden rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Zoeken"
        >
          <Search className="w-4 h-4" />
        </Button>
        {/* Language toggle (hidden on small mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex w-8 h-8 md:w-9 md:h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
          onClick={toggleLanguage}
          title={language === 'nl' ? 'Switch to English' : 'Wissel naar Nederlands'}
          aria-label={language === 'nl' ? 'Switch to English' : 'Wissel naar Nederlands'}
        >
          <span className="text-xs font-bold">{language.toUpperCase()}</span>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 md:w-9 md:h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Donkere modus' : 'Lichte modus'}
          aria-label={theme === 'light' ? 'Donkere modus' : 'Lichte modus'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </Button>

        {/* Notifications */}
        <NotificatieCenter />

        {/* Separator */}
        <div className="hidden md:block w-px h-6 bg-border/60 mx-1.5" />

        {/* User dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen)
            }}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200',
              'hover:bg-muted/60',
              userMenuOpen && 'bg-muted/60'
            )}
            aria-label="Gebruikersmenu"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/10">
              <span className="text-white text-[10px] md:text-xs font-semibold">
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
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    setLayoutMode('topnav')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 transition-colors"
                >
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  Top navigatie
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
