import React, { useState } from 'react'
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
}

function isUuid(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export function Header() {
  const location = useLocation()
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

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
      className="h-12 flex items-center justify-between px-3 md:px-5 flex-shrink-0 z-10 bg-white"
      style={{ borderBottom: '0.5px solid #E6E4E0' }}
    >
      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-x-0 top-0 h-12 z-20 bg-white flex items-center gap-2 px-3 md:hidden" style={{ borderBottom: '0.5px solid #E6E4E0' }}>
          <GlobalSearch className="flex flex-1" compact />
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg flex-shrink-0" onClick={() => setMobileSearchOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-[13px] font-semibold" style={{ color: '#191919' }}>
          {moduleName}
        </span>
        {subPage && (
          <>
            <span className="text-[13px] mx-1" style={{ color: '#5A5A55' }}>/</span>
            <span className="text-[13px] font-normal truncate" style={{ color: '#5A5A55' }}>
              {subPage}
            </span>
          </>
        )}
      </div>

      {/* Center: Search bar (desktop) */}
      <GlobalSearch className="hidden md:flex flex-1 max-w-md mx-6 min-w-[200px]" />

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
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

        {/* Notifications */}
        <NotificatieCenter />

        {/* User avatar */}
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 30,
            height: 30,
            backgroundColor: '#F4F2EE',
          }}
        >
          <span
            className="font-semibold leading-none"
            style={{ fontSize: 11, color: '#5A5A55' }}
          >
            {initials}
          </span>
        </div>
      </div>
    </header>
  )
}
