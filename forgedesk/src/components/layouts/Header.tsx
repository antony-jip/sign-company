import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, FolderKanban, FileText, Users, ClipboardCheck,
  Receipt, Mail, Search, X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { NotificatieCenter } from '@/components/notifications/NotificatieCenter'
import { GlobalSearch } from '@/components/shared/GlobalSearch'

interface QuickAddItem {
  label: string
  icon: LucideIcon
  path: string
  color: string
}

const quickAddItems: QuickAddItem[] = [
  { label: 'Nieuw Project', icon: FolderKanban, path: '/projecten/nieuw', color: '#7EB5A6' },
  { label: 'Nieuwe Offerte', icon: FileText, path: '/offertes/nieuw', color: '#9B8EC4' },
  { label: 'Nieuwe Klant', icon: Users, path: '/klanten?nieuw=true', color: '#8BAFD4' },
  { label: 'Nieuw Werkbon', icon: ClipboardCheck, path: '/werkbonnen/nieuw', color: '#D4836A' },
  { label: 'Nieuwe Factuur', icon: Receipt, path: '/facturen/nieuw', color: '#E8866A' },
  { label: 'Nieuwe Email', icon: Mail, path: '/email?compose=true', color: '#8BAFD4' },
]

export function Header() {
  const { language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const quickAddRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!quickAddOpen) return
    function handleClick(e: MouseEvent) {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) setQuickAddOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setQuickAddOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [quickAddOpen])

  const toggleLanguage = () => setLanguage(language === 'nl' ? 'en' : 'nl')

  return (
    <header className="h-14 border-b border-border/40 bg-card/60 backdrop-blur-sm flex items-center justify-between px-3 md:px-5 flex-shrink-0 z-10">
      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-x-0 top-0 h-12 z-20 bg-background border-b border-border/50 flex items-center gap-2 px-3 md:hidden">
          <GlobalSearch className="flex flex-1" compact />
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg flex-shrink-0" onClick={() => setMobileSearchOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Left: Quick-add button */}
      <div className="flex items-center gap-2">
        <div className="w-9 md:hidden flex-shrink-0" /> {/* Spacer for mobile hamburger */}
        <div ref={quickAddRef} className="relative" style={{ zIndex: 50 }}>
          <button
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className={cn(
              'h-9 px-3 rounded-[10px] flex items-center gap-2 transition-all duration-200 text-[13px] font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md',
              quickAddOpen && 'ring-2 ring-primary/20'
            )}
          >
            <Plus className={cn('w-4 h-4 transition-transform duration-200', quickAddOpen && 'rotate-45')} />
            <span className="hidden sm:inline">Nieuw</span>
          </button>

          {/* Quick-add dropdown */}
          {quickAddOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden animate-scale-in">
              <div className="px-3 py-2 border-b border-border/40">
                <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Snel aanmaken</span>
              </div>
              <div className="py-1">
                {quickAddItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      setQuickAddOpen(false)
                      navigate(item.path)
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] text-foreground/80 hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}18` }}
                    >
                      <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Search bar (desktop) */}
      <GlobalSearch className="hidden md:flex flex-1 max-w-xl mx-6" />

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5 md:gap-1">
        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 md:hidden rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Zoeken"
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* Keyboard shortcut hint (desktop) */}
        <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground/40 mr-1">
          <kbd className="px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 font-mono text-[10px]">⌘K</kbd>
        </div>

        {/* Language toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
          onClick={toggleLanguage}
          title={language === 'nl' ? 'Switch to English' : 'Wissel naar Nederlands'}
        >
          <span className="text-[10px] font-bold">{language.toUpperCase()}</span>
        </Button>

        {/* Notifications */}
        <NotificatieCenter />
      </div>
    </header>
  )
}
