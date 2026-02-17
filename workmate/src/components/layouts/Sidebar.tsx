import React, { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText, Files,
  Mail, Calendar, PiggyBank, Bot, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Projecten', icon: FolderKanban, path: '/projecten' },
  { label: 'Klanten', icon: Users, path: '/klanten' },
  { label: 'Offertes', icon: FileText, path: '/offertes' },
  { label: 'Documenten', icon: Files, path: '/documenten' },
  { label: 'Email', icon: Mail, path: '/email', badge: 3 },
  { label: 'Kalender', icon: Calendar, path: '/kalender' },
  { label: 'Financieel', icon: PiggyBank, path: '/financieel' },
  { label: 'AI Assistent', icon: Bot, path: '/ai' },
  { label: 'Instellingen', icon: Settings, path: '/instellingen' },
]

export function Sidebar() {
  const { isCollapsed, toggleSidebar, setCollapsed } = useSidebar()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileOpen])

  // Close mobile sidebar on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && mobileOpen) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileOpen])

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0',
          isCollapsed ? 'justify-center' : 'gap-3'
        )}
      >
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">W</span>
        </div>
        {!isCollapsed && (
          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
            Workmate
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
          const Icon = item.icon

          const linkContent = (
            <NavLink
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 flex-shrink-0 transition-colors duration-200',
                isActive && 'text-blue-600 dark:text-blue-400'
              )} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {item.badge && item.badge > 0 && (
                <span
                  className={cn(
                    'bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center leading-none',
                    isCollapsed
                      ? 'absolute -top-1 -right-1 w-4 h-4 text-[10px]'
                      : 'ml-auto min-w-[20px] h-5 px-1.5'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          )

          if (isCollapsed) {
            return (
              <div key={item.path} className="relative group">
                {linkContent}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                </div>
              </div>
            )
          }

          return <React.Fragment key={item.path}>{linkContent}</React.Fragment>
        })}
      </nav>

      {/* User section and collapse toggle */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2 flex-shrink-0">
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 dark:text-blue-300 text-xs font-semibold">
                {(user.user_metadata?.voornaam?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.user_metadata?.voornaam
                  ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
                  : user.email?.split('@')[0] || 'Gebruiker'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
              onClick={logout}
              title="Uitloggen"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}

        {isCollapsed && user && (
          <div className="relative group flex justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center cursor-pointer">
              <span className="text-blue-700 dark:text-blue-300 text-xs font-semibold">
                {(user.user_metadata?.voornaam?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
              {user.user_metadata?.voornaam || user.email?.split('@')[0] || 'Gebruiker'}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200',
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
      {/* Mobile hamburger button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden bg-white dark:bg-gray-900 shadow-md border border-gray-200 dark:border-gray-700"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Sluit menu' : 'Open menu'}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex-shrink-0',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
