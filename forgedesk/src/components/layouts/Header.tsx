import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { Button } from '@/components/ui/button'
import { NotificatieCenter } from '@/components/notifications/NotificatieCenter'
import { GlobalSearch } from '@/components/shared/GlobalSearch'

const ROUTE_NAMES: Record<string, string> = {
  '': 'Dashboard',
  'projecten': 'Projecten',
  'offertes': 'Offertes',
  'facturen': 'Facturen',
  'klanten': 'Klanten',
  'werkbonnen': 'Werkbonnen',
  'planning': 'Planning',
  'taken': 'Taken',
  'email': 'Email',
  'portalen': 'Portaal',
  'instellingen': 'Instellingen',
  'forgie': 'Daan',
  'cockpit': 'Cockpit',
  'documenten': 'Documenten',
  'visualizer': 'Visualizer',
}

function isUuid(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export function Header() {
  const location = useLocation()
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    const onScroll = () => setScrolled(main.scrollTop > 8)
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  // Breadcrumb
  const segments = location.pathname.split('/').filter(Boolean)
  const moduleSlug = segments[0] || ''
  const moduleName = ROUTE_NAMES[moduleSlug] || moduleSlug.charAt(0).toUpperCase() + moduleSlug.slice(1)
  const subPage = segments.length > 1 && !isUuid(segments[1])
    ? segments[1].charAt(0).toUpperCase() + segments[1].slice(1).replace(/-/g, ' ')
    : null

  // User avatar
  const voornaam = profile?.voornaam || user?.user_metadata?.voornaam || ''
  const achternaam = profile?.achternaam || user?.user_metadata?.achternaam || ''
  const initials = voornaam && achternaam
    ? `${voornaam[0]}${achternaam[0]}`.toUpperCase()
    : (voornaam?.[0] || user?.email?.[0] || 'U').toUpperCase()

  return (
    <header
      className="h-11 flex items-center justify-between px-5 flex-shrink-0 z-10 transition-all duration-200 relative bg-[#FFFFFF] border-b border-[#EBEBEB]"
      style={{ boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.04)' : 'none' }}
    >
      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-x-0 top-0 h-11 z-20 flex items-center gap-2 px-3 md:hidden bg-[#FFFFFF] border-b border-[#EBEBEB]">
          <GlobalSearch className="flex flex-1" compact />
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-[#9B9B95] hover:text-[#1A1A1A]" onClick={() => setMobileSearchOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[13px] font-semibold text-[#1A1A1A]">
          {moduleName}<span className="text-[#F15025]">.</span>
        </span>
        {subPage && (
          <>
            <span className="text-[13px] text-[#EBEBEB] mx-0.5">/</span>
            <span className="text-[13px] font-normal text-[#9B9B95] truncate">
              {subPage}
            </span>
          </>
        )}
      </div>

      {/* Center: Search bar (desktop) — compact */}
      <div className="hidden md:flex flex-1 justify-center mx-8">
        <GlobalSearch className="w-full max-w-xs" />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 md:hidden rounded-lg text-[#9B9B95] hover:text-[#1A1A1A]"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Zoeken"
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <NotificatieCenter />

        {/* User avatar */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 bg-[#1A535C]">
          <span className="font-semibold leading-none text-[10px] text-white">{initials}</span>
        </div>
      </div>
    </header>
  )
}
