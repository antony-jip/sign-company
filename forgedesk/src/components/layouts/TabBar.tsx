import React, { useRef, useState, useEffect, useCallback } from 'react'
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTabs, AppTab } from '@/contexts/TabsContext'
import { cn } from '@/lib/utils'

// ─── Tab Item ────────────────────────────────────────────────────────────────

function TabItem({
  tab,
  isActive,
  onActivate,
  onClose,
  onContextMenu,
}: {
  tab: AppTab
  isActive: boolean
  onActivate: () => void
  onClose: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  return (
    <button
      className={cn(
        'tab-bar-item group relative flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold tracking-[-0.01em] transition-colors duration-150 whitespace-nowrap max-w-[200px] min-w-[80px] select-none rounded-md',
        isActive
          ? 'bg-[#1A535C]/[0.07] text-[#1A535C]'
          : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.04]'
      )}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      title={tab.label}
    >
      {tab.isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#F15025] flex-shrink-0" />
      )}
      <span className="truncate flex-1 text-left">{tab.label}</span>
      <span
        className={cn(
          'flex-shrink-0 rounded p-0.5 transition-all hover:bg-black/[0.08]',
          isActive
            ? 'opacity-50 hover:opacity-100'
            : 'opacity-0 group-hover:opacity-50 hover:!opacity-100'
        )}
        onClick={onClose}
        role="button"
        tabIndex={-1}
      >
        <X className="w-3 h-3" />
      </span>
    </button>
  )
}

// ─── Context Menu ────────────────────────────────────────────────────────────

function TabContextMenu({
  x,
  y,
  tabId,
  onClose,
}: {
  x: number
  y: number
  tabId: string
  onClose: () => void
}) {
  const { closeTab, closeOtherTabs, closeAllTabs } = useTabs()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const items = [
    { label: 'Sluiten', action: () => closeTab(tabId) },
    { label: 'Andere sluiten', action: () => closeOtherTabs(tabId) },
    { label: 'Alle sluiten', action: () => closeAllTabs() },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {items.map(item => (
        <button
          key={item.label}
          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
          onClick={() => {
            item.action()
            onClose()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ─── TabBar ──────────────────────────────────────────────────────────────────

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, newTab } = useTabs()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    tabId: string
  } | null>(null)
  const [showScrollButtons, setShowScrollButtons] = useState(false)

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current
    if (el) {
      setShowScrollButtons(el.scrollWidth > el.clientWidth)
    }
  }, [])

  useEffect(() => {
    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [checkOverflow, tabs.length])

  useEffect(() => {
    if (!scrollRef.current || !activeTabId) return
    const activeEl = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTabId])

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === 'left' ? -200 : 200,
        behavior: 'smooth',
      })
    }
  }

  if (tabs.length <= 1) return null

  return (
    <>
      <div
        className="tab-bar flex items-center gap-0.5 px-2 py-1 bg-card border-b border-border"
      >
        {/* Scroll left */}
        {showScrollButtons && (
          <button
            className="flex-shrink-0 w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-black/[0.04] flex items-center justify-center transition-colors"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Tabs (with inline new-tab button right after the last tab) */}
        <div
          ref={scrollRef}
          className="tab-bar-scroll flex items-center gap-0.5 flex-1 overflow-x-auto"
          onScroll={checkOverflow}
        >
          {tabs.map(tab => (
            <div key={tab.id} data-tab-id={tab.id}>
              <TabItem
                tab={tab}
                isActive={tab.id === activeTabId}
                onActivate={() => setActiveTab(tab.id)}
                onClose={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id })
                }}
              />
            </div>
          ))}

          <button
            className="flex-shrink-0 w-6 h-6 rounded-md text-muted-foreground hover:text-[#F15025] hover:bg-[#F15025]/[0.08] flex items-center justify-center transition-colors ml-0.5"
            onClick={newTab}
            title="Nieuw tabblad (Cmd+T)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scroll right */}
        {showScrollButtons && (
          <button
            className="flex-shrink-0 w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-black/[0.04] flex items-center justify-center transition-colors"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabId={contextMenu.tabId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
