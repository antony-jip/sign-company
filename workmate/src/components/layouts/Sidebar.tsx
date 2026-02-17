import React, { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, FileText, Files,
  Mail, Calendar, PiggyBank, Bot, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X, CheckSquare, Newspaper, Upload,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Projecten', icon: FolderKanban, path: '/projecten' },
  { label: 'Taken', icon: CheckSquare, path: '/taken' },
  { label: 'Klanten', icon: Users, path: '/klanten' },
  { label: 'Offertes', icon: FileText, path: '/offertes' },
  { label: 'Documenten', icon: Files, path: '/documenten' },
  { label: 'Email', icon: Mail, path: '/email' },
  { label: 'Nieuwsbrieven', icon: Newspaper, path: '/nieuwsbrieven' },
  { label: 'Kalender', icon: Calendar, path: '/kalender' },
  { label: 'Financieel', icon: PiggyBank, path: '/financieel' },
  { label: 'Importeren', icon: Upload, path: '/importeren' },
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
          'flex items-center h-16 px-4 border-b border-white/[0.06] flex-shrink-0',
          isCollapsed ? 'justify-center' : 'gap-3'
        )}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <span className="text-lg font-bold text-white tracking-tight">
            Workmate
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item, index) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
          const Icon = item.icon

          const linkContent = (
            <NavLink
              to={item.path}
              className={cn(
                'wm-sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group',
                isActive
                  ? 'active text-white bg-white/[0.08]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]',
                isCollapsed && 'justify-center px-2'
              )}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <Icon className={cn(
                'w-[18px] h-[18px] flex-shrink-0 transition-all duration-200',
                isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'
              )} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )

          if (isCollapsed) {
            return (
              <div key={item.path} className="relative group">
                {linkContent}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none border border-white/10">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900" />
                </div>
              </div>
            )
          }

          return <React.Fragment key={item.path}>{linkContent}</React.Fragment>
        })}
      </nav>

      {/* User section and collapse toggle */}
      <div className="border-t border-white/[0.06] p-3 space-y-2 flex-shrink-0">
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors duration-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 ring-2 ring-white/10">
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
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200"
              onClick={logout}
              title="Uitloggen"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}

        {isCollapsed && user && (
          <div className="relative group flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center cursor-pointer ring-2 ring-white/10">
              <span className="text-white text-xs font-semibold">
                {(user.user_metadata?.voornaam?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none border border-white/10">
              {user.user_metadata?.voornaam || user.email?.split('@')[0] || 'Gebruiker'}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900" />
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full text-gray-500 hover:text-white hover:bg-white/[0.04] transition-colors duration-200',
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
        className="fixed top-3 left-3 z-50 md:hidden wm-glass shadow-lg border border-white/10"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Sluit menu' : 'Open menu'}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
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
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
