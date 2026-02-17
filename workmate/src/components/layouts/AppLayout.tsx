import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { isCollapsed } = useSidebar()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out'
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
