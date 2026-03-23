import React, { useState, useEffect } from 'react'
import { Plus, FilePlus, UserPlus, FolderPlus, CheckSquare, X } from 'lucide-react'
import { NieuweOfferteModal } from '@/components/quick-actions/NieuweOfferteModal'
import { NieuweKlantModal } from '@/components/quick-actions/NieuweKlantModal'
import { NieuwProjectModal } from '@/components/quick-actions/NieuwProjectModal'
import { NieuweTaakModal } from '@/components/quick-actions/NieuweTaakModal'

type ModalType = 'offerte' | 'klant' | 'project' | 'taak' | null

interface QuickAction {
  id: ModalType
  label: string
  icon: React.ElementType
  color: string
}

const ACTIONS: QuickAction[] = [
  { id: 'taak', label: 'Taak', icon: CheckSquare, color: '#5A5A55' },
  { id: 'project', label: 'Project', icon: FolderPlus, color: '#1A535C' },
  { id: 'klant', label: 'Klant', icon: UserPlus, color: '#3A6B8C' },
  { id: 'offerte', label: 'Offerte', icon: FilePlus, color: '#F15025' },
]

export function FloatingQuickActions() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  function handleAction(type: ModalType) {
    setIsOpen(false)
    setActiveModal(type)
  }

  return (
    <>
      {/* Click-away overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9997]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB stack — positioned above Daan FAB (48px + 12px gap = 76px from bottom) */}
      <div
        className="fixed z-[9998] flex flex-col-reverse items-end gap-2"
        style={{ right: 16, bottom: 76 }}
      >
        {/* Quick action buttons — only visible when open */}
        {isOpen && (
          <div className="flex flex-col-reverse items-end gap-2 mb-2">
            {ACTIONS.map((action, i) => {
              const Icon = action.icon
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-2 animate-slide-up-spring"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                >
                  {/* Label */}
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
                  {/* Action button */}
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

      {/* Modals */}
      <NieuweOfferteModal open={activeModal === 'offerte'} onOpenChange={open => !open && setActiveModal(null)} />
      <NieuweKlantModal open={activeModal === 'klant'} onOpenChange={open => !open && setActiveModal(null)} />
      <NieuwProjectModal open={activeModal === 'project'} onOpenChange={open => !open && setActiveModal(null)} />
      <NieuweTaakModal open={activeModal === 'taak'} onOpenChange={open => !open && setActiveModal(null)} />
    </>
  )
}
