import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { HeaderNav } from './HeaderNav'
import { TopNav } from './TopNav'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { isCollapsed, layoutMode } = useSidebar()

  if (layoutMode === 'topnav') {
    return (
      <div className="flex flex-col h-screen overflow-hidden wm-mesh-gradient">
        <TopNav />
        <main className="flex-1 overflow-y-auto" style={{ position: 'relative', zIndex: 0 }}>
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden wm-mesh-gradient">
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out'
        )}
      >
        <Header />
        <HeaderNav />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
