import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Sun, Moon, Bell, Globe, User, Settings, LogOut,
  ChevronDown, X
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
  // Exact match first
  if (routeTitles[pathname]) return routeTitles[pathname]
  // Prefix match for nested routes
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

  // Close menus when clicking outside or pressing Escape
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
    // Search functionality placeholder - can be extended later
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
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Left: Page title */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Spacer for mobile hamburger */}
        <div className="w-10 md:hidden" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Center: Search bar */}
      <form
        onSubmit={handleSearch}
        className={cn(
          'hidden md:flex items-center flex-1 max-w-md mx-8 relative transition-all duration-200',
        )}
      >
        <div
          className={cn(
            'flex items-center w-full bg-gray-100 dark:bg-gray-800 rounded-lg border-2 transition-all duration-200',
            searchFocused
              ? 'border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-900 shadow-sm'
              : 'border-transparent'
          )}
        >
          <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Zoeken..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mr-2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Zoekopdracht wissen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={toggleLanguage}
          title={language === 'nl' ? 'Switch to English' : 'Wissel naar Nederlands'}
        >
          <span className="text-xs font-bold">{language.toUpperCase()}</span>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            className="w-9 h-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative"
            onClick={() => {
              setNotificationOpen(!notificationOpen)
              setUserMenuOpen(false)
            }}
            title="Notificaties"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* Notification dropdown */}
          {notificationOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Notificaties
                </h3>
                <button
                  onClick={() => setNotificationOpen(false)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Alles gelezen
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-blue-500 transition-colors cursor-pointer">
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    Nieuwe offerte goedgekeurd
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Klant De Vries B.V. heeft offerte #2024-015 goedgekeurd
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    2 minuten geleden
                  </p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent transition-colors cursor-pointer">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Project deadline nadert
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Project &quot;Lichtreclame Bakkerij Jansen&quot; deadline over 2 dagen
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    1 uur geleden
                  </p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent transition-colors cursor-pointer">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    3 nieuwe emails ontvangen
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Je hebt ongelezen berichten in je inbox
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    3 uur geleden
                  </p>
                </div>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setNotificationOpen(false)
                    navigate('/instellingen')
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium w-full text-center"
                >
                  Alle notificaties bekijken
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen)
              setNotificationOpen(false)
            }}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors duration-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              userMenuOpen && 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <span className="text-blue-700 dark:text-blue-300 text-xs font-semibold">
                {userInitial}
              </span>
            </div>
            <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
              {userName}
            </span>
            <ChevronDown className={cn(
              'hidden lg:block w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
              userMenuOpen && 'rotate-180'
            )} />
          </button>

          {/* User dropdown menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {user?.email}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/instellingen')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Profiel
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/instellingen')
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Instellingen
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    logout()
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
