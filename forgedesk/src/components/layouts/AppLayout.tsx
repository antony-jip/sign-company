import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TopNav } from './TopNav'
import { MobileBottomNav } from './MobileBottomNav'
import { ForgieChatWidget } from '@/components/forgie/ForgieChatWidget'
import { FloatingQuickActions } from '@/components/dashboard/FloatingQuickActions'
import { TabBar } from '@/components/layouts/TabBar'
import { useSidebar } from '@/contexts/SidebarContext'
import { useTabShortcuts } from '@/hooks/useTabShortcuts'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff } from 'lucide-react'

function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 flex-shrink-0">
      <WifiOff className="h-4 w-4" />
      Je bent offline — wijzigingen worden niet opgeslagen
    </div>
  )
}

export function AppLayout() {
  const { layoutMode } = useSidebar()
  useTabShortcuts()

  if (layoutMode === 'topnav') {
    return (
      <>
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#F8F7F5]">
          <OfflineBanner />
          <TopNav />
          <TabBar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ position: 'relative', zIndex: 0 }}>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 pb-20 md:pb-6 w-full max-w-full overflow-hidden page-content-enter">
              <Outlet />
            </div>
          </main>
          <MobileBottomNav />
        </div>
        <FloatingQuickActions />
        <ForgieChatWidget />
      </>
    )
  }

  return (
    <>
      <div className="flex h-[100dvh] overflow-hidden bg-[#F8F7F5]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <OfflineBanner />
          <Header />
          <TabBar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 w-full max-w-full overflow-hidden page-content-enter">
              <Outlet />
            </div>
          </main>
          <MobileBottomNav />
        </div>
      </div>
      <FloatingQuickActions />
      <ForgieChatWidget />
    </>
  )
}
