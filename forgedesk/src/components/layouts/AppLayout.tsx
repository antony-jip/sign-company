import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { HeaderNav } from './HeaderNav'
import { TopNav } from './TopNav'
import { MobileBottomNav } from './MobileBottomNav'
import { ForgieChatWidget } from '@/components/forgie/ForgieChatWidget'
import { TabBar } from '@/components/tabs/TabBar'
import { TrialBanner } from '@/components/shared/TrialBanner'
import { useSidebar } from '@/contexts/SidebarContext'
import { useTabShortcuts } from '@/hooks/useTabShortcuts'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { isCollapsed, layoutMode } = useSidebar()
  useTabShortcuts()

  if (layoutMode === 'topnav') {
    return (
      <div className="flex flex-col h-[100dvh] overflow-hidden wm-mesh-gradient">
        <TrialBanner />
        <TopNav />
        <TabBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ position: 'relative', zIndex: 0 }}>
          <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 max-w-[1600px] mx-auto w-full animate-fade-in-up">
            <Outlet />
          </div>
        </main>
        <MobileBottomNav />
        <ForgieChatWidget />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden wm-mesh-gradient">
      <TrialBanner />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div
          className={cn(
            'flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out'
          )}
        >
          <Header />
          <HeaderNav />
          <TabBar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 max-w-[1600px] mx-auto w-full animate-fade-in-up">
              <Outlet />
            </div>
          </main>
          <MobileBottomNav />
        </div>
      </div>
      <ForgieChatWidget />
    </div>
  )
}
