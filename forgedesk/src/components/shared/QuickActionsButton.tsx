import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, Mail, FileText, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppSettings } from '@/contexts/AppSettingsContext'

const ALL_ACTIONS = [
  { id: 'project', label: 'Nieuw project', icon: FolderKanban, route: '/projecten/nieuw', color: '#8BAFD4' },
  { id: 'mail', label: 'Nieuwe mail', icon: Mail, route: '/email/compose', color: '#7BABC7' },
  { id: 'offerte', label: 'Nieuwe offerte', icon: FileText, route: '/offertes/nieuw', color: '#E8866A' },
  { id: 'klant', label: 'Nieuwe klant', icon: Users, route: '/klanten', color: '#6B9FCC' },
]

export function QuickActionsButton() {
  const navigate = useNavigate()
  const { forgieEnabled, quickActionsEnabled, quickActionItems } = useAppSettings()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleActions = ALL_ACTIONS.filter(a => quickActionItems.includes(a.id))

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen])

  if (!quickActionsEnabled || visibleActions.length === 0) return null

  const bottomPosition = forgieEnabled ? 100 : 24

  return (
    <div
      ref={containerRef}
      className="hidden md:block"
      style={{ position: 'fixed', bottom: bottomPosition, right: 24, zIndex: 9998 }}
    >
      {/* Fan-out menu items */}
      <AnimatePresence>
        {isOpen && visibleActions.map((action, index) => {
          const Icon = action.icon
          return (
            <motion.button
              key={action.id}
              className="absolute right-0 flex items-center gap-3 group"
              style={{ bottom: (index + 1) * 52 }}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 22,
                delay: index * 0.05,
              }}
              onClick={() => {
                navigate(action.route)
                setIsOpen(false)
              }}
            >
              {/* Label */}
              <span className="text-[13px] font-medium text-foreground bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {action.label}
              </span>
              {/* Icon circle */}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: action.color }}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
            </motion.button>
          )
        })}
      </AnimatePresence>

      {/* Main + button */}
      <motion.button
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl hover:shadow-2xl border border-white/20 transition-shadow"
        onClick={() => setIsOpen(!isOpen)}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        title="Snelkoppelingen"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>
    </div>
  )
}
