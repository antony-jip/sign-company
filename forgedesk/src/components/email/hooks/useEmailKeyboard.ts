import { useEffect, useState, useCallback } from 'react'
import type { Email } from '@/types'
import type { ViewMode } from '../emailTypes'

interface UseEmailKeyboardProps {
  viewMode: ViewMode
  filteredEmails: Email[]
  onSelectEmail: (email: Email) => void
  onToggleStar: (email: Email) => void
  onTogglePin: (email: Email) => void
  onArchive: (email: Email) => void
  onDelete: (email: Email) => void
  onCompose: () => void
  onReply: (email: Email) => void
  onForward: (email: Email) => void
  onShowSnooze: (emailId: string) => void
}

export function useEmailKeyboard({
  viewMode,
  filteredEmails,
  onSelectEmail,
  onToggleStar,
  onTogglePin,
  onArchive,
  onDelete,
  onCompose,
  onReply,
  onForward,
  onShowSnooze,
}: UseEmailKeyboardProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    if (viewMode !== 'idle') return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      switch (e.key) {
        case 'j':
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, filteredEmails.length - 1))
          break
        case 'k':
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'o':
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            onSelectEmail(filteredEmails[focusedIndex])
          }
          break
        case 's':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            onToggleStar(filteredEmails[focusedIndex])
          }
          break
        case 'p':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            onTogglePin(filteredEmails[focusedIndex])
          }
          break
        case 'e':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            onArchive(filteredEmails[focusedIndex])
          }
          break
        case '#':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            onDelete(filteredEmails[focusedIndex])
          }
          break
        case 'c':
          e.preventDefault()
          onCompose()
          break
        case 'r':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            onReply(filteredEmails[focusedIndex])
          }
          break
        case 'f':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            onForward(filteredEmails[focusedIndex])
          }
          break
        case 'z':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            onShowSnooze(filteredEmails[focusedIndex].id)
          }
          break
        case '?':
          e.preventDefault()
          setShowShortcuts((prev) => !prev)
          break
        case 'Escape':
          e.preventDefault()
          setShowShortcuts(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, focusedIndex, filteredEmails, onSelectEmail, onToggleStar, onTogglePin, onArchive, onDelete, onCompose, onReply, onForward, onShowSnooze])

  return {
    focusedIndex,
    setFocusedIndex,
    showShortcuts,
    setShowShortcuts,
  }
}
