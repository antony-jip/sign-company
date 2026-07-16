import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TopNav } from './TopNav'
import { ForgieChatWidget } from '@/components/forgie/ForgieChatWidget'
import { FloatingQuickActions } from '@/components/dashboard/FloatingQuickActions'
import { FloatingEmailButton } from '@/components/shared/FloatingEmailButton'
import { TrialBanner } from '@/components/shared/TrialBanner'
import { InkoopAILimietBanner } from '@/components/shared/InkoopAILimietBanner'
import { TabBar } from '@/components/layouts/TabBar'
import { useSidebar } from '@/contexts/SidebarContext'
import { useTabShortcuts } from '@/hooks/useTabShortcuts'
import { prefetchCore } from '@/lib/coreData'
import { prefetchTopRoutes } from '@/lib/routePrefetch'
import { chatHeartbeat } from '@/services/websiteChatService'
import { WebsiteMeldingPopup } from '@/components/notifications/WebsiteMeldingPopup'
import { cn } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff } from 'lucide-react'

function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 flex-shrink-0">
      <WifiOff className="h-4 w-4" />
      Je bent offline. Wijzigingen worden niet opgeslagen
    </div>
  )
}

export function AppLayout() {
  const { layoutMode } = useSidebar()
  const location = useLocation()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  // /email renders its own pill topbar on mobile · skip the global TopNav there.
  const hideTopNav = !isDesktop && location.pathname.startsWith('/email')
  // Email-module verbreedt naar edge-to-edge (geen 1400px cap) zodat de
  // folder-rail tegen de viewport-rand kan plakken.
  const isEmailRoute = location.pathname.startsWith('/email')
  // App-achtige, scherm-vullende views: geen paginapadding (edge-to-edge),
  // consistent in topnav- én sidebar-modus.
  const isFullBleed = ['/email', '/planning', '/taken', '/montage', '/kalender', '/support', '/visualizer'].some(
    (p) => location.pathname === p || location.pathname.startsWith(p + '/'),
  )
  useTabShortcuts()

  useEffect(() => {
    // Warm de kern-datasets en de route-chunks van de top-modules één
    // keer op de achtergrond, zodat navigatie noch op data noch op een
    // chunk-download hoeft te wachten. Tijdens idle, zodat de
    // dashboard-load niet vertraagt.
    const warm = () => { prefetchCore(); prefetchTopRoutes() }
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const id = ric ? ric(warm, { timeout: 1500 }) : window.setTimeout(warm, 600)
    return () => {
      const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback
      if (ric && cic) cic(id as number)
      else window.clearTimeout(id as number)
    }
  }, [])

  useEffect(() => {
    // Aanwezigheid voor de website-chat (signcompany.nl): zolang de app
    // zichtbaar openstaat geldt de org als online. Verborgen tab = na
    // ±3 min offline, dan valt de widget terug op het aanvraagformulier.
    const slag = () => { if (!document.hidden) chatHeartbeat() }
    slag()
    const id = window.setInterval(slag, 60_000)
    document.addEventListener('visibilitychange', slag)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', slag)
    }
  }, [])

  const [stickyHeader, setStickyHeader] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.localStorage.getItem('doen_topnav_sticky') === '1'
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setStickyHeader(window.localStorage.getItem('doen_topnav_sticky') === '1')
    window.addEventListener('storage', sync)
    window.addEventListener('doen-sticky-changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('doen-sticky-changed', sync)
    }
  }, [])

  // Auto-hide search header (Header) in sidebar layout: the tab strip stays
  // permanently visible, but the search/header row slides in only when the
  // mouse reaches the top edge. A short close-delay avoids flicker.
  const [topHovered, setTopHovered] = useState(false)
  const topCloseTimer = useRef<number | null>(null)
  const openTop = () => {
    if (topCloseTimer.current) { window.clearTimeout(topCloseTimer.current); topCloseTimer.current = null }
    setTopHovered(true)
  }
  const closeTop = () => {
    if (topCloseTimer.current) window.clearTimeout(topCloseTimer.current)
    topCloseTimer.current = window.setTimeout(() => setTopHovered(false), 180)
  }
  useEffect(() => () => { if (topCloseTimer.current) window.clearTimeout(topCloseTimer.current) }, [])

  if (layoutMode === 'topnav') {
    return (
      <>
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
          <OfflineBanner />
          <TrialBanner />
          <InkoopAILimietBanner variant="globaal" />
          <main className="flex-1 overflow-hidden flex flex-col min-h-0" style={{ position: 'relative', zIndex: 0 }}>
            {isFullBleed ? (
              <>
                <div className="flex-shrink-0">
                  {!hideTopNav && <TopNav />}
                  <TabBar />
                </div>
                <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden page-content-enter p-0">
                  <Outlet />
                </div>
              </>
            ) : (
              <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
                <div className={cn('bg-background', stickyHeader && 'sticky top-0 z-30')}>
                  {!hideTopNav && <TopNav />}
                  <TabBar />
                </div>
                <div className="w-full px-4 md:px-8 py-6 md:py-8 pb-8 page-content-enter">
                  <Outlet />
                </div>
              </div>
            )}
          </main>
        </div>
        <FloatingQuickActions />
        <FloatingEmailButton />
        <ForgieChatWidget />
        <WebsiteMeldingPopup />
      </>
    )
  }

  return (
    <>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 w-0 overflow-hidden">
          <OfflineBanner />
          <TrialBanner />
          <InkoopAILimietBanner variant="globaal" />
          <div className="relative flex-1 flex flex-col min-h-0">
            {/* Tabbalk: altijd zichtbaar bovenaan */}
            <div className="flex-shrink-0 bg-background">
              <TabBar />
            </div>

            <main className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className={cn(
                'flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden page-content-enter',
                isFullBleed ? 'p-0' : 'p-4 md:p-8',
              )}>
                <Outlet />
              </div>
            </main>

            {/* Hover-trigger aan de bovenrand (smal, gecentreerd): opent de verborgen zoekbalk */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-2.5 w-40 z-40 flex justify-center"
              onMouseEnter={openTop}
            >
              <div
                className={cn(
                  'mt-1 h-1 w-20 rounded-full bg-foreground/15 transition-opacity duration-200',
                  topHovered ? 'opacity-0' : 'opacity-100',
                )}
              />
            </div>

            {/* Auto-hide zoekbalk (Header), glijdt bij hover over de tabs in beeld */}
            <div
              className={cn(
                'absolute top-0 inset-x-0 z-30 bg-background border-b border-border/60 transition-transform duration-300 ease-out',
                topHovered
                  ? 'translate-y-0 shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
                  : '-translate-y-full pointer-events-none',
              )}
              onMouseEnter={openTop}
              onMouseLeave={closeTop}
            >
              <Header />
            </div>
          </div>
        </div>
      </div>
      <FloatingQuickActions />
      <FloatingEmailButton />
      <ForgieChatWidget />
      <WebsiteMeldingPopup />
    </>
  )
}
