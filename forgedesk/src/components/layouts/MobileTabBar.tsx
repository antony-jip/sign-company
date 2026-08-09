import React, { useMemo, useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { MoreHorizontal, X, LogOut, CreditCard, BookOpen, SlidersHorizontal, MessageSquare, ChevronRight } from 'lucide-react'
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
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px] animate-in fade-in-0 duration-150"
            onClick={() => setMeerOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-label="Meer"
            className="relative bg-card rounded-t-[22px] max-h-[86vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_40px_rgba(26,83,92,0.14)]"
          >
            {/* Greep · zegt zonder woorden dat dit paneel weg kan */}
            <button
              type="button"
              onClick={() => setMeerOpen(false)}
              aria-label="Sluiten"
              className="flex-shrink-0 w-full pt-2.5 pb-1 flex justify-center"
            >
              <span className="h-1 w-9 rounded-full bg-foreground/15" />
            </button>

            {/* Wie ben je · identiteit bovenaan, zoals in Instellingen */}
            {user && (
              <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-2 pb-4">
                <span className="w-11 h-11 rounded-[13px] flex items-center justify-center bg-petrol text-white font-bold text-[15px] flex-shrink-0">
                  {userInitial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold tracking-[-0.01em] text-foreground truncate leading-tight">
                    {userName}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMeerOpen(false)}
                  aria-label="Sluiten"
                  className="tap-press w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/60"
                >
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>
            )}

            <div className="overflow-y-auto px-3 pb-4">
              {meerItems.length > 0 && (
                <>
                  <p className="px-2 pb-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Modules
                  </p>
                  <div className="grid grid-cols-4 gap-x-1 gap-y-3">
                    {meerItems.map((item) => {
                      const isActive = isPadActief(location.pathname, item.path)
                      const Icon = item.icon
                      const telling = item.path === SUPPORT_ITEM.path ? supportAttentie : 0
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.path === '/'}
                          onClick={() => hapticLight()}
                          className="tap-press flex flex-col items-center gap-1.5 py-1 px-0.5 rounded-[14px]"
                        >
                          <span
                            className="relative w-[52px] h-[52px] rounded-[16px] flex items-center justify-center flex-shrink-0 transition-shadow"
                            style={{
                              background: `${item.color}14`,
                              boxShadow: isActive ? `inset 0 0 0 1.5px ${item.color}` : undefined,
                            }}
                          >
                            <Icon className="w-[21px] h-[21px]" style={{ color: item.color }} />
                            {telling > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-flame text-white text-[10px] font-bold font-mono tabular-nums flex items-center justify-center ring-2 ring-card">
                                {telling}
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] font-medium text-foreground/75 leading-tight text-center truncate max-w-full">
                            {item.label}
                            <span className={isActive ? 'text-flame' : 'text-transparent'}>.</span>
                          </span>
                        </NavLink>
                      )
                    })}
                  </div>
                </>
              )}

              <p className="px-2 pt-6 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Account
              </p>

              {([
                { label: 'Instellingen', icon: SlidersHorizontal, naar: SETTINGS_ITEM.path },
                { label: 'Abonnement', icon: CreditCard, naar: '/instellingen?tab=abonnement' },
                { label: 'Kennisbank', icon: BookOpen, naar: '/kennisbank' },
              ]).map((rij) => {
                const RijIcon = rij.icon
                return (
                  <button
                    key={rij.label}
                    type="button"
                    onClick={() => { setMeerOpen(false); navigate(rij.naar) }}
                    className="tap-press flex items-center gap-3.5 w-full px-2 py-3 rounded-[12px] text-[15px] text-foreground active:bg-muted/50 transition-colors"
                  >
                    <RijIcon className="w-[19px] h-[19px] text-muted-foreground flex-shrink-0" strokeWidth={1.8} />
                    <span className="flex-1 text-left">{rij.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  </button>
                )
              })}

              {user && (
                <button
                  type="button"
                  onClick={() => { setMeerOpen(false); logout() }}
                  className="tap-press flex items-center gap-3.5 w-full px-2 py-3 mt-1 rounded-[12px] text-[15px] font-medium text-flame active:bg-flame/[0.07] transition-colors"
                >
                  <LogOut className="w-[19px] h-[19px] flex-shrink-0" strokeWidth={1.8} />
                  <span className="flex-1 text-left">Uitloggen</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
