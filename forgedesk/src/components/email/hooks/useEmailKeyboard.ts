import { useEffect, useState, useRef } from 'react'
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

  // Store callbacks and data in refs to avoid re-registering the event listener
  const callbacksRef = useRef({ onSelectEmail, onToggleStar, onTogglePin, onArchive, onDelete, onCompose, onReply, onForward, onShowSnooze })
  callbacksRef.current = { onSelectEmail, onToggleStar, onTogglePin, onArchive, onDelete, onCompose, onReply, onForward, onShowSnooze }

  const emailsRef = useRef(filteredEmails)
  emailsRef.current = filteredEmails

  const focusedRef = useRef(focusedIndex)
  focusedRef.current = focusedIndex

  useEffect(() => {
    if (viewMode !== 'idle') return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const emails = emailsRef.current
      const idx = focusedRef.current
      const cb = callbacksRef.current

      switch (e.key) {
        case 'j':
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, emails.length - 1))
          break
        case 'k':
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'o':
        case 'Enter':
          e.preventDefault()
          if (idx >= 0 && idx < emails.length) cb.onSelectEmail(emails[idx])
          break
        case 's':
          e.preventDefault()
          if (idx >= 0 && idx < emails.length) cb.onToggleStar(emails[idx])
          break
        case 'p':
          e.preventDefault()
          if (idx >= 0 && idx < emails.length) cb.onTogglePin(emails[idx])
          break
        case 'e':
          e.preventDefault()
          if (idx >= 0 && idx < emails.length) cb.onArchive(emails[idx])
          break
        case '#':
          e.preventDefault()
          if (idx >= 0 && idx < emails.length) cb.onDelete(emails[idx])
          break
        case 'c':
          e.preventDefault()
          cb.onCompose()
          break
        case 'r':
          e.preventDefault()
          if (idx >= 0 && idx < emails.length) cb.onReply(emails[idx])
          break
        case 'f':
          e.preventDefault()
          if (idx >= 0 && idx < emails.length) cb.onForward(emails[idx])
          break
        case 'z':
          e.preventDefault()
          if (idx >= 0 && idx < emails.length) cb.onShowSnooze(emails[idx].id)
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
  }, [viewMode]) // Only re-register when viewMode changes

  return {
    focusedIndex,
    setFocusedIndex,
    showShortcuts,
    setShowShortcuts,
  }
}
