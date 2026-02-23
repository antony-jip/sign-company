import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { isCollapsed } = useSidebar()

  return (
    <div className="flex h-screen overflow-hidden wm-mesh-gradient">
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out'
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full animate-fade-in-up">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
