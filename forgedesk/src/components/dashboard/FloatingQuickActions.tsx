import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, FilePlus, UserPlus, FolderPlus, CheckSquare, Mail, X, ChevronLeft } from 'lucide-react'
import { NieuweKlantModal } from '@/components/quick-actions/NieuweKlantModal'
import { NieuwProjectModal } from '@/components/quick-actions/NieuwProjectModal'
import { NieuweTaakModal } from '@/components/quick-actions/NieuweTaakModal'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { cn } from '@/lib/utils'

export type QuickActionId = 'project' | 'klant' | 'offerte' | 'taak' | 'mail'
export type QuickActionsPosition = 'bottom-right' | 'bottom-right-hover' | 'right-edge' | 'hidden'

type ModalType = 'offerte' | 'klant' | 'project' | 'taak' | null

interface QuickAction {
  id: QuickActionId
  label: string
  icon: React.ElementType
  color: string
}

// Single source of truth voor alle beschikbare snelkoppelingen.
// WeergaveTab importeert dit zodat de toggle-lijst altijd in sync is met de FAB.
export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'project', label: 'Nieuw project', icon: FolderPlus, color: '#1A535C' },
  { id: 'klant', label: 'Nieuwe klant', icon: UserPlus, color: '#3A6B8C' },
  { id: 'offerte', label: 'Nieuwe offerte', icon: FilePlus, color: '#F15025' },
  { id: 'taak', label: 'Nieuwe taak', icon: CheckSquare, color: '#5A5A55' },
  { id: 'mail', label: 'Nieuwe mail', icon: Mail, color: '#7BABC7' },
]

const DEFAULT_ITEMS: QuickActionId[] = ['project', 'klant', 'offerte', 'taak']

export function FloatingQuickActions() {
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = useAppSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  const enabled = settings.quick_actions_enabled ?? true
  const position: QuickActionsPosition = settings.quick_actions_position ?? 'bottom-right'
  const hideOnMobile = location.pathname.startsWith('/email')

  // Filter de master-lijst op de items die in settings aanstaan.
  // Behoud de volgorde uit QUICK_ACTIONS zodat het visueel consistent is.
  const visibleActions = useMemo(() => {
    const allowed: string[] = Array.isArray(settings.quick_action_items)
      ? settings.quick_action_items
      : DEFAULT_ITEMS
    return QUICK_ACTIONS.filter(a => allowed.includes(a.id))
  }, [settings.quick_action_items])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  function handleAction(id: QuickActionId) {
    setIsOpen(false)
    if (id === 'mail') {
      navigate('/email')
      return
    }
    if (id === 'offerte') {
      navigate('/offertes/nieuw')
      return
    }
    setActiveModal(id as ModalType)
  }

  // Niets renderen als de FAB volledig uit staat of er geen acties over zijn.
  if (!enabled || position === 'hidden' || visibleActions.length === 0) {
    return (
      <>

        <NieuweKlantModal open={activeModal === 'klant'} onOpenChange={open => !open && setActiveModal(null)} />
        <NieuwProjectModal open={activeModal === 'project'} onOpenChange={open => !open && setActiveModal(null)} />
        <NieuweTaakModal open={activeModal === 'taak'} onOpenChange={open => !open && setActiveModal(null)} />
      </>
    )
  }

  const isRightEdge = position === 'right-edge'
  const isHoverCorner = position === 'bottom-right-hover'

  return (
    <>
      {/* Click-away overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9997]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {isRightEdge ? (
        // ─── Right-edge positie: subtiele verticale strip op rechter rand ───
        // Compact pinnetje dat uitschuift bij hover. Buttons zijn verticaal
        // gestapeld en altijd zichtbaar zodra de strip geopend is.
        <div
          className={cn(
            'fixed z-[9998] right-0 top-1/2 -translate-y-1/2 group/fab',
            hideOnMobile && 'hidden md:block',
          )}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div
            className={cn(
              'flex items-center transition-all duration-200',
              isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-14px)] hover:translate-x-0',
            )}
            onMouseEnter={() => setIsOpen(true)}
          >
            {/* Pinnetje (handle) */}
            <div
              className="flex items-center justify-center cursor-pointer"
              style={{
                width: 14,
                height: 56,
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8,
                background: 'linear-gradient(135deg, #F15025 0%, #D4453A 100%)',
                boxShadow: '-2px 0 8px rgba(241, 80, 37, 0.25)',
              }}
            >
              <ChevronLeft className="w-3 h-3 text-white" />
            </div>
            {/* Action stack */}
            <div
              className="flex flex-col gap-2 py-3 px-2.5"
              style={{
                background: '#FFFFFF',
                border: '0.5px solid #E6E4E0',
                borderRight: 'none',
                borderTopLeftRadius: 12,
                borderBottomLeftRadius: 12,
                boxShadow: '-4px 0 16px rgba(100, 80, 40, 0.10)',
              }}
            >
              {visibleActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    className="flex items-center justify-center transition-transform duration-150 hover:scale-110"
                    title={action.label}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: action.color,
                      boxShadow: '0 2px 6px rgba(100, 80, 40, 0.15)',
                    }}
                  >
                    <Icon className="w-[18px] h-[18px] text-white" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        // ─── Bottom-right posities (klassiek + hover-corner) ───
        <div
          className={cn(
            'fixed z-[9998] flex flex-col-reverse items-end gap-2 transition-opacity duration-200',
            isHoverCorner && !isOpen && 'opacity-30 hover:opacity-100',
            hideOnMobile && 'hidden md:flex',
          )}
          style={{ right: 16, bottom: 76 }}
        >
          {/* Quick action buttons — only visible when open */}
          {isOpen && (
            <div className="flex flex-col-reverse items-end gap-2 mb-2">
              {visibleActions.map((action, i) => {
                const Icon = action.icon
                return (
                  <div
                    key={action.id}
                    className="flex items-center gap-2 animate-slide-up-spring"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                  >
                    <span
                      className="whitespace-nowrap select-none"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: '#191919',
                        backgroundColor: '#FFFFFF',
                        border: '0.5px solid #E6E4E0',
                        borderRadius: 6,
                        padding: '4px 10px',
                        boxShadow: '0 2px 8px rgba(100, 80, 40, 0.08)',
                      }}
                    >
                      {action.label}
                    </span>
                    <button
                      onClick={() => handleAction(action.id)}
                      className="flex items-center justify-center flex-shrink-0 transition-transform duration-150 hover:scale-105"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: action.color,
                        boxShadow: '0 2px 8px rgba(100, 80, 40, 0.15)',
                      }}
                    >
                      <Icon className="w-[18px] h-[18px] text-white" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Main "+" FAB */}
          <button
            onClick={() => setIsOpen(prev => !prev)}
            className="flex items-center justify-center transition-all duration-200"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #F15025 0%, #D4453A 100%)',
              boxShadow: '0 2px 12px rgba(241, 80, 37, 0.3)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(241, 80, 37, 0.4)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(241, 80, 37, 0.3)'
            }}
          >
            {isOpen ? (
              <X className="w-5 h-5 text-white transition-transform duration-200" />
            ) : (
              <Plus className="w-5 h-5 text-white transition-transform duration-200" />
            )}
          </button>
        </div>
      )}

      {/* Modals */}
      <NieuweKlantModal open={activeModal === 'klant'} onOpenChange={open => !open && setActiveModal(null)} />
      <NieuwProjectModal open={activeModal === 'project'} onOpenChange={open => !open && setActiveModal(null)} />
      <NieuweTaakModal open={activeModal === 'taak'} onOpenChange={open => !open && setActiveModal(null)} />
    </>
  )
}
