import React, { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TopNav } from './TopNav'
import { MobileBottomNav } from './MobileBottomNav'
import { ForgieChatWidget } from '@/components/forgie/ForgieChatWidget'
import { FloatingQuickActions } from '@/components/dashboard/FloatingQuickActions'
import { FloatingEmailButton } from '@/components/shared/FloatingEmailButton'
import { TrialBanner } from '@/components/shared/TrialBanner'
import { InkoopAILimietBanner } from '@/components/shared/InkoopAILimietBanner'
import { TabBar } from '@/components/layouts/TabBar'
import { useSidebar } from '@/contexts/SidebarContext'
import { useTabShortcuts } from '@/hooks/useTabShortcuts'
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
  // /email renders its own pill topbar on mobile — skip the global TopNav there.
  const hideTopNav = !isDesktop && location.pathname.startsWith('/email')
  // Email-module verbreedt naar edge-to-edge (geen 1400px cap) zodat de
  // folder-rail tegen de viewport-rand kan plakken.
  const isEmailRoute = location.pathname.startsWith('/email')
  useTabShortcuts()

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
            {isEmailRoute ? (
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
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 pb-20 md:pb-6 page-content-enter">
                  <Outlet />
                </div>
              </div>
            )}
          </main>
          <MobileBottomNav />
        </div>
        <FloatingQuickActions />
        <FloatingEmailButton />
        <ForgieChatWidget />
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
          <Header />
          <TabBar />
          <main className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 min-h-0 p-3 sm:p-4 md:p-6 pb-20 md:pb-6 w-full max-w-full overflow-y-auto overflow-x-hidden page-content-enter">
              <Outlet />
            </div>
          </main>
          <MobileBottomNav />
        </div>
      </div>
      <FloatingQuickActions />
      <FloatingEmailButton />
      <ForgieChatWidget />
    </>
  )
}
