import React, { useMemo, useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { MoreHorizontal, X, LogOut, CreditCard, BookOpen, SlidersHorizontal, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { prefetchRoute } from '@/lib/routePrefetch'
import { hapticLight } from '@/utils/haptic'
import { openDaan, DAAN_ONGELEZEN_EVENT } from '@/lib/daanWidget'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useSupportAttentie } from '@/hooks/useSupportInbox'
import { ADMIN_USER_ID } from '@/services/supportChatService'
import {
  MOBIELE_NAV_MAX, MOBIELE_MENU_KANDIDATEN, SETTINGS_ITEM, SUPPORT_ITEM,
  mobieleMenuItems, type NavItem,
} from '@/lib/navigatie'

function isPadActief(pathname: string, pad: string) {
  return pad === '/' ? pathname === '/' : pathname.startsWith(pad)
}

/**
 * Vaste navigatie onderaan het scherm, op elke mobiele route — ook in de
 * mailmodule, die haar eigen topbalk heeft en je anders in een doodlopende
 * straat zet. Welke modules erin staan bepaalt de gebruiker zelf
 * (Instellingen > Voorkeuren > Navigatie); wat niet past valt in "Meer".
 */
export function MobileTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { settings, forgieEnabled } = useAppSettings()
  const isSupportAdmin = user?.id === ADMIN_USER_ID
  const supportAttentie = useSupportAttentie('support-mobile-nav', isSupportAdmin)
  const [meerOpen, setMeerOpen] = useState(false)

  const gekozen = useMemo(
    () => mobieleMenuItems(settings.mobiel_menu_items),
    [settings.mobiel_menu_items],
  )

  // Daan en Meer zijn er altijd en kosten samen twee vakjes: Daan omdat hij
  // op mobiel nergens anders meer woont, Meer omdat instellingen, abonnement
  // en uitloggen daar zitten. Wat overblijft zijn MOBIELE_NAV_MAX modules.
  const { balkItems, meerItems } = useMemo(() => {
    // Staat Daan uit, dan valt zijn vakje vrij voor een module.
    const plekken = forgieEnabled ? MOBIELE_NAV_MAX : MOBIELE_NAV_MAX + 1
    const gekozenLabels = new Set(gekozen.map((i) => i.label))
    const rest: NavItem[] = [
      ...gekozen.slice(plekken),
      ...MOBIELE_MENU_KANDIDATEN.filter((i) => !gekozenLabels.has(i.label)),
    ]
    if (isSupportAdmin) rest.push(SUPPORT_ITEM)
    return { balkItems: gekozen.slice(0, plekken), meerItems: rest }
  }, [gekozen, isSupportAdmin, forgieEnabled])

  useEffect(() => { setMeerOpen(false) }, [location.pathname])

  // De widget bezit zijn eigen bulletje; hij roept het om zodra het verandert.
  const [daanOngelezen, setDaanOngelezen] = useState(false)
  useEffect(() => {
    const luister = (e: Event) => setDaanOngelezen(!!(e as CustomEvent).detail)
    window.addEventListener(DAAN_ONGELEZEN_EVENT, luister)
    return () => window.removeEventListener(DAAN_ONGELEZEN_EVENT, luister)
  }, [])

  // Zolang het paneel openstaat mag de pagina eronder niet meescrollen.
  useEffect(() => {
    if (!meerOpen) return
    const vorige = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = vorige }
  }, [meerOpen])

  const meerActief = meerItems.some((i) => isPadActief(location.pathname, i.path))
    || isPadActief(location.pathname, SETTINGS_ITEM.path)

  const userInitial = (user?.user_metadata?.voornaam?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const userName = user?.user_metadata?.voornaam
    ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
    : user?.email?.split('@')[0] || 'Gebruiker'

  return (
    <>
      <nav
        className="md:hidden flex-shrink-0 flex items-stretch bg-card border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Hoofdnavigatie"
      >
        {balkItems.map((item) => {
          const isActive = isPadActief(location.pathname, item.path)
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onPointerDown={() => prefetchRoute(item.path)}
              onClick={() => hapticLight()}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'tap-press relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 h-[56px] px-1 transition-colors duration-150',
                isActive ? 'text-petrol dark:text-foreground' : 'text-petrol/50 dark:text-foreground/50',
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-[2px] bg-flame" />
              )}
              <Icon className="w-[21px] h-[21px]" style={isActive ? { color: item.color } : undefined} />
              <span className="text-[10px] font-semibold tracking-[-0.01em] leading-none truncate max-w-full">
                {item.label}
              </span>
            </NavLink>
          )
        })}

        {forgieEnabled && (
          <button
            type="button"
            onClick={() => { hapticLight(); openDaan() }}
            aria-label="Daan openen"
            className="tap-press relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 h-[56px] px-1 text-petrol/50 dark:text-foreground/50 transition-colors duration-150"
          >
            <span
              className="w-[26px] h-[26px] rounded-[9px] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1A535C 0%, #2A6B75 100%)' }}
            >
              <MessageSquare className="w-[15px] h-[15px] text-white" />
            </span>
            {daanOngelezen && (
              <span className="absolute top-1.5 right-[28%] w-[7px] h-[7px] rounded-full bg-flame ring-2 ring-card" />
            )}
            <span className="text-[10px] font-semibold tracking-[-0.01em] leading-none">Daan</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => { hapticLight(); setMeerOpen(true) }}
          aria-expanded={meerOpen}
          aria-label="Meer modules"
          className={cn(
            'tap-press relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 h-[56px] px-1 transition-colors duration-150',
            meerActief ? 'text-petrol dark:text-foreground' : 'text-petrol/50 dark:text-foreground/50',
          )}
        >
          {meerActief && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-[2px] bg-flame" />
          )}
          <MoreHorizontal className="w-[21px] h-[21px]" />
          {supportAttentie > 0 && (
            <span className="absolute top-2 right-[26%] w-[7px] h-[7px] rounded-full bg-flame" />
          )}
          <span className="text-[10px] font-semibold tracking-[-0.01em] leading-none">Meer</span>
        </button>
      </nav>

      {meerOpen && createPortal(
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in-0 duration-150"
            onClick={() => setMeerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-card rounded-t-[20px] border-t border-border max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
              <span className="text-[15px] font-bold text-foreground">Meer<span className="text-flame">.</span></span>
              <button
                type="button"
                onClick={() => setMeerOpen(false)}
                aria-label="Sluiten"
                className="tap-press w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-3 pb-3">
              <div className="grid grid-cols-4 gap-1">
                {meerItems.map((item) => {
                  const isActive = isPadActief(location.pathname, item.path)
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => hapticLight()}
                      className={cn(
                        'tap-press flex flex-col items-center gap-1.5 py-3 px-1 rounded-[14px] transition-colors',
                        isActive ? 'bg-flame/[0.08]' : 'active:bg-muted/60',
                      )}
                    >
                      <span
                        className="w-11 h-11 rounded-[13px] flex items-center justify-center flex-shrink-0"
                        style={{ background: `${item.color}14` }}
                      >
                        <Icon className="w-[19px] h-[19px]" style={{ color: item.color }} />
                      </span>
                      <span className="text-[11px] font-medium text-foreground/80 leading-tight text-center truncate max-w-full">
                        {item.label}
                      </span>
                      {item.path === SUPPORT_ITEM.path && supportAttentie > 0 && (
                        <span className="sr-only">{supportAttentie} openstaand</span>
                      )}
                    </NavLink>
                  )
                })}
              </div>

              <div className="h-px bg-border/60 my-3" />

              <button
                type="button"
                onClick={() => { setMeerOpen(false); navigate(SETTINGS_ITEM.path) }}
                className="tap-press flex items-center gap-3 w-full px-3 py-3 rounded-[12px] text-[14px] font-medium text-foreground active:bg-muted/60"
              >
                <SlidersHorizontal className="w-[18px] h-[18px] text-muted-foreground" />
                Instellingen
              </button>
              <button
                type="button"
                onClick={() => { setMeerOpen(false); navigate('/instellingen?tab=abonnement') }}
                className="tap-press flex items-center gap-3 w-full px-3 py-3 rounded-[12px] text-[14px] font-medium text-foreground active:bg-muted/60"
              >
                <CreditCard className="w-[18px] h-[18px] text-muted-foreground" />
                Abonnement
              </button>
              <button
                type="button"
                onClick={() => { setMeerOpen(false); navigate('/kennisbank') }}
                className="tap-press flex items-center gap-3 w-full px-3 py-3 rounded-[12px] text-[14px] font-medium text-foreground active:bg-muted/60"
              >
                <BookOpen className="w-[18px] h-[18px] text-muted-foreground" />
                Kennisbank
              </button>

              {user && (
                <>
                  <div className="h-px bg-border/60 my-3" />
                  <div className="flex items-center gap-3 px-3 py-2">
                    <span className="w-10 h-10 rounded-[11px] flex items-center justify-center bg-petrol text-white font-bold text-[14px] flex-shrink-0">
                      {userInitial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-foreground truncate leading-tight">{userName}</p>
                      <p className="text-[12px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setMeerOpen(false); logout() }}
                      aria-label="Uitloggen"
                      className="tap-press w-10 h-10 rounded-[11px] flex items-center justify-center text-flame active:bg-flame/[0.08]"
                    >
                      <LogOut className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
