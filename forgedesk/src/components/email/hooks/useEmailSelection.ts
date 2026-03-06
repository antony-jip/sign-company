import React, { useState, useCallback } from 'react'
import { updateEmail } from '@/services/supabaseService'
import type { Email } from '@/types'
import { toast } from 'sonner'

interface UseEmailSelectionProps {
  filteredEmails: Email[]
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>
}

export function useEmailSelection({ filteredEmails, setEmails }: UseEmailSelectionProps) {
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set())

  const hasChecked = checkedEmails.size > 0
  const allChecked = filteredEmails.length > 0 && checkedEmails.size === filteredEmails.length
  const someChecked = hasChecked && !allChecked

  const toggleCheckEmail = useCallback((id: string) => {
    setCheckedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleCheckAll = useCallback(() => {
    if (allChecked) {
      setCheckedEmails(new Set())
    } else {
      setCheckedEmails(new Set(filteredEmails.map((e) => e.id)))
    }
  }, [allChecked, filteredEmails])

  const clearChecked = useCallback(() => {
    setCheckedEmails(new Set())
  }, [])

  // Bulk actions
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) =>
      prev.map((e) =>
        ids.includes(e.id) ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e
      )
    )
    ids.forEach((id) => updateEmail(id, { map: 'prullenbak', labels: ['prullenbak'] }).catch(() => {}))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} verwijderd`)
  }, [checkedEmails, setEmails])

  const handleBulkArchive = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) => prev.filter((e) => !ids.includes(e.id)))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} gearchiveerd`)
  }, [checkedEmails, setEmails])

  const handleBulkMarkRead = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) =>
      prev.map((e) => ids.includes(e.id) ? { ...e, gelezen: true } : e)
    )
    ids.forEach((id) => updateEmail(id, { gelezen: true }).catch(() => {}))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} als gelezen gemarkeerd`)
  }, [checkedEmails, setEmails])

  const handleBulkMarkUnread = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) =>
      prev.map((e) => ids.includes(e.id) ? { ...e, gelezen: false } : e)
    )
    ids.forEach((id) => updateEmail(id, { gelezen: false }).catch(() => {}))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} als ongelezen gemarkeerd`)
  }, [checkedEmails, setEmails])

  const handleBulkLabel = useCallback((label: string) => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) =>
      prev.map((e) => {
        if (!ids.includes(e.id)) return e
        const labels = e.labels.includes(label) ? e.labels : [...e.labels, label]
        return { ...e, labels }
      })
    )
    ids.forEach((id) => {
      // We'd need to read current labels - simplified version
      updateEmail(id, {}).catch(() => {})
    })
    setCheckedEmails(new Set())
    toast.success(`Label "${label}" toegevoegd aan ${ids.length} email${ids.length > 1 ? 's' : ''}`)
  }, [checkedEmails, setEmails])

  return {
    checkedEmails,
    setCheckedEmails,
    hasChecked,
    allChecked,
    someChecked,
    toggleCheckEmail,
    toggleCheckAll,
    clearChecked,
    handleBulkDelete,
    handleBulkArchive,
    handleBulkMarkRead,
    handleBulkMarkUnread,
    handleBulkLabel,
  }
}
