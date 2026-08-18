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
import { MobileTabBar } from '@/components/layouts/MobileTabBar'
import { useSidebar } from '@/contexts/SidebarContext'
import { useTabShortcuts } from '@/hooks/useTabShortcuts'
import { prefetchCore } from '@/lib/coreData'
import { prefetchTopRoutes } from '@/lib/routePrefetch'
import { chatHeartbeat } from '@/services/websiteChatService'
import { WebsiteMeldingPopup } from '@/components/notifications/WebsiteMeldingPopup'
import { cn } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useScrollHerstel } from '@/hooks/useScrollHerstel'
import { useOfflineWachtrij } from '@/hooks/useOfflineWachtrij'
import { useFeatureAan } from '@/contexts/FeatureFlagsContext'
import { bannerTekst } from '@/utils/offlineWachtrijRegels'
import { WifiOff, UploadCloud } from 'lucide-react'

function OfflineBanner() {
  const isOnline = useOnlineStatus()
  // De wachtrij is leeg en de hook doet niets zolang de vlag niet aanstaat.
  const stand = useOfflineWachtrij()
  const wachtrijAan = useFeatureAan('offline_queue')

  if (!wachtrijAan) {
    // Ongewijzigd gedrag zonder vlag. De tekst is voor werkbon-feedback en
    // maatjes al te somber (die wórden bewaard), maar dat corrigeren zonder
    // vlag zou een wijziging zijn die niet terug te draaien is met SQL.
    if (isOnline) return null
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 flex-shrink-0">
        <WifiOff className="h-4 w-4" />
        Je bent offline. Wijzigingen worden niet opgeslagen
      </div>
    )
  }

  const tekst = bannerTekst(isOnline, stand)
  if (!tekst) return null
  // Een wachtrij die loopt is geen storing: alleen een vastgelopen item of
  // geen verbinding verdient de rode balk.
  const alarm = stand.vast > 0 || !isOnline
  return (
    <div
      className={cn(
        'px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 flex-shrink-0',
        alarm ? 'bg-destructive text-destructive-foreground' : 'bg-[#1A535C] text-white',
      )}
    >
      {isOnline ? <UploadCloud className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      {tekst}
    </div>
  )
}

export function AppLayout() {
  const { layoutMode } = useSidebar()
  const location = useLocation()
  // De paginascroller van de gewone (niet full-bleed) routes: daar leven de
  // lijsten waar je uit wegklikt en weer in terugkomt.
  const paginaScroller = useRef<HTMLDivElement>(null)
  useScrollHerstel(paginaScroller)
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
  // Taken is een werkscherm waar je de hele dag in zit · daar kost elke extra
  // balk bovenaan rust en ruimte. De tabbalk vervalt er; navigeren gaat via de
  // zijbalk en de paginakop draagt de titel al.
  const hideTabBar = location.pathname === '/taken' || location.pathname.startsWith('/taken/')
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
                  {!hideTabBar && <TabBar />}
                </div>
                <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden page-content-enter p-0">
                  <Outlet />
                </div>
              </>
            ) : (
              <div ref={paginaScroller} className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
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
          {/* Buiten <main>, dus de balk hoort bij de flex-kolom en overlapt de
              content niet — geen fixed-positie die om extra bodempadding vraagt. */}
          <MobileTabBar />
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
            {/* Kopbalk en tabbalk: altijd zichtbaar. De kopbalk draagt de
                paginatitel, globale zoek en meldingen; die stonden eerder
                achter een hover-strook van een paar pixels en waren daardoor
                praktisch onvindbaar. */}
            <div className="flex-shrink-0 bg-background">
              <Header />
              {!hideTabBar && <TabBar />}
            </div>

            <main className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div
                ref={isFullBleed ? undefined : paginaScroller}
                className={cn(
                  'flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden page-content-enter',
                  isFullBleed ? 'p-0' : 'p-4 md:p-8',
                )}
              >
                <Outlet />
              </div>
            </main>
          </div>
          <MobileTabBar />
        </div>
      </div>
      <FloatingQuickActions />
      <FloatingEmailButton />
      <ForgieChatWidget />
      <WebsiteMeldingPopup />
    </>
  )
}
