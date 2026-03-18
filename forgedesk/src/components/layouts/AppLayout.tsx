import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TopNav } from './TopNav'
import { MobileBottomNav } from './MobileBottomNav'
import { ForgieChatWidget } from '@/components/forgie/ForgieChatWidget'
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
      <div className="flex flex-col h-[100dvh] overflow-hidden wm-mesh-gradient">
        <OfflineBanner />
        <TopNav />
        <TabBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ position: 'relative', zIndex: 0 }}>
          <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 w-full animate-fade-in-up">
            <Outlet />
          </div>
        </main>
        <MobileBottomNav />
        <ForgieChatWidget />
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden wm-mesh-gradient">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <OfflineBanner />
        <Header />
        <TabBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 w-full animate-fade-in-up">
            <Outlet />
          </div>
        </main>
        <MobileBottomNav />
      </div>
      <ForgieChatWidget />
    </div>
  )
}
