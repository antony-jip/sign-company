import React, { useCallback } from 'react'
import { updateEmail, deleteEmail } from '@/services/supabaseService'
import type { Email } from '@/types'
import { calculateSnoozeDate } from '../emailHelpers'
import { toast } from 'sonner'

interface UseEmailActionsProps {
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>
  setSelectedEmail: React.Dispatch<React.SetStateAction<Email | null>>
  setViewMode: (mode: 'idle' | 'reading' | 'composing') => void
}

export function useEmailActions({ setEmails, setSelectedEmail, setViewMode }: UseEmailActionsProps) {
  const handleToggleStar = useCallback((email: Email) => {
    const newStarred = !email.starred
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, starred: newStarred } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, starred: newStarred } : prev
    )
    updateEmail(email.id, { starred: newStarred }).catch(() => {})
  }, [setEmails, setSelectedEmail])

  const handleToggleRead = useCallback((email: Email) => {
    const newGelezen = !email.gelezen
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, gelezen: newGelezen } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, gelezen: newGelezen } : prev
    )
    updateEmail(email.id, { gelezen: newGelezen }).catch(() => {})
  }, [setEmails, setSelectedEmail])

  const handleArchive = useCallback((email: Email) => {
    setEmails((prev) => prev.filter((e) => e.id !== email.id))
    setSelectedEmail(null)
    setViewMode('idle')
    toast.success('Email gearchiveerd')
  }, [setEmails, setSelectedEmail, setViewMode])

  const handleDelete = useCallback((email: Email) => {
    if (email.map === 'prullenbak') {
      setEmails((prev) => prev.filter((e) => e.id !== email.id))
      deleteEmail(email.id).catch(() => {})
    } else {
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e
        )
      )
      updateEmail(email.id, { map: 'prullenbak', labels: ['prullenbak'] }).catch(() => {})
    }
    setSelectedEmail(null)
    setViewMode('idle')
    toast.success('Email verwijderd')
  }, [setEmails, setSelectedEmail, setViewMode])

  const handleTogglePin = useCallback((email: Email) => {
    const newPinned = !email.pinned
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, pinned: newPinned } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, pinned: newPinned } : prev
    )
    updateEmail(email.id, { pinned: newPinned } as Partial<Email>).catch(() => {})
    toast.success(newPinned ? 'Email vastgepind' : 'Pin verwijderd')
  }, [setEmails, setSelectedEmail])

  const handleSnooze = useCallback((email: Email, hours: number) => {
    const snoozeDate = calculateSnoozeDate(hours)
    const snoozedUntil = snoozeDate.toISOString()
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, snoozed_until: snoozedUntil } : e))
    )
    updateEmail(email.id, { snoozed_until: snoozedUntil } as Partial<Email>).catch(() => {})
    setSelectedEmail(null)
    setViewMode('idle')
    toast.success('Email gesnoozed')
  }, [setEmails, setSelectedEmail, setViewMode])

  const handleUnsnooze = useCallback((email: Email) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, snoozed_until: undefined, map: 'inbox' } : e))
    )
    updateEmail(email.id, { snoozed_until: null }).catch(() => {})
    toast.success('Snooze verwijderd')
  }, [setEmails])

  // Label management
  const handleAddLabel = useCallback((email: Email, label: string) => {
    const newLabels = [...(email.labels || []), label]
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, labels: newLabels } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, labels: newLabels } : prev
    )
    updateEmail(email.id, { labels: newLabels }).catch(() => {})
  }, [setEmails, setSelectedEmail])

  const handleRemoveLabel = useCallback((email: Email, label: string) => {
    const newLabels = (email.labels || []).filter((l) => l !== label)
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, labels: newLabels } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, labels: newLabels } : prev
    )
    updateEmail(email.id, { labels: newLabels }).catch(() => {})
  }, [setEmails, setSelectedEmail])

  return {
    handleToggleStar,
    handleToggleRead,
    handleArchive,
    handleDelete,
    handleTogglePin,
    handleSnooze,
    handleUnsnooze,
    handleAddLabel,
    handleRemoveLabel,
  }
}
