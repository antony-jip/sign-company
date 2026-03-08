import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, ChevronLeft, ChevronRight, FileText, FolderOpen, Receipt, ClipboardList } from 'lucide-react'
import { useTabs, AppTab } from '@/contexts/TabsContext'
import { cn } from '@/lib/utils'

// ─── New Tab Menu Items ─────────────────────────────────────────────────────

const NEW_TAB_OPTIONS = [
  { label: 'Nieuwe offerte', path: '/offertes/nieuw', icon: FileText },
  { label: 'Nieuwe factuur', path: '/facturen/nieuw', icon: Receipt },
  { label: 'Nieuw project', path: '/projecten/nieuw', icon: FolderOpen },
  { label: 'Nieuwe werkbon', path: '/werkbonnen/nieuw', icon: ClipboardList },
]

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
        'tab-bar-item group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 transition-all duration-150 whitespace-nowrap max-w-[180px] min-w-[100px] select-none',
        isActive
          ? 'bg-background text-foreground border-border/70 shadow-sm z-10'
          : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground'
      )}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      title={tab.label}
    >
      {tab.isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-blush)] flex-shrink-0" />
      )}
      <span className="truncate flex-1 text-left">{tab.label}</span>
      <span
        className={cn(
          'flex-shrink-0 rounded-sm p-0.5 transition-opacity',
          isActive
            ? 'opacity-60 hover:opacity-100 hover:bg-muted'
            : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-muted'
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

// ─── New Tab Dropdown ───────────────────────────────────────────────────────

function NewTabDropdown({ onClose }: { onClose: () => void }) {
  const { openTab } = useTabs()
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

  return (
    <div
      ref={menuRef}
      className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
    >
      {NEW_TAB_OPTIONS.map(opt => (
        <button
          key={opt.path}
          className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
          onClick={() => {
            openTab({ path: opt.path, label: opt.label })
            onClose()
          }}
        >
          <opt.icon className="w-3.5 h-3.5 text-muted-foreground" />
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── TabBar ──────────────────────────────────────────────────────────────────

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    tabId: string
  } | null>(null)
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const [showNewTabMenu, setShowNewTabMenu] = useState(false)

  // Check if scrolling is needed
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

  // Scroll active tab into view
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

  return (
    <>
      <div className="tab-bar flex items-end bg-muted/30 border-b border-border/50 px-1 pt-1 relative">
        {/* Scroll left */}
        {showScrollButtons && (
          <button
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Tabs container */}
        <div
          ref={scrollRef}
          className="tab-bar-scroll flex items-end gap-0.5 flex-1 overflow-x-auto"
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
        </div>

        {/* Scroll right */}
        {showScrollButtons && (
          <button
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* New tab button */}
        <div className="relative flex-shrink-0">
          <button
            className="p-1.5 mb-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-md transition-colors"
            onClick={() => setShowNewTabMenu(prev => !prev)}
            title="Nieuw tabblad"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {showNewTabMenu && (
            <NewTabDropdown onClose={() => setShowNewTabMenu(false)} />
          )}
        </div>
      </div>

      {/* Context menu */}
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
