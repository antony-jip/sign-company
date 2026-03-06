import { useMemo } from 'react'
import type { Email } from '@/types'
import type { EmailFolder, FilterType } from '../emailTypes'
import { parseSearchQuery } from '../emailHelpers'

interface FolderTab {
  id: EmailFolder
  label: string
}

const folderIds: EmailFolder[] = ['inbox', 'verzonden', 'concepten', 'gepland', 'gesnoozed', 'prullenbak']

export function useEmailFilters(
  emails: Email[],
  selectedFolder: EmailFolder,
  searchQuery: string,
  filter: FilterType,
) {
  // Folder counts
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    folderIds.forEach((id) => {
      if (id === 'inbox') {
        counts[id] = emails.filter((e) => e.map === 'inbox' && !e.gelezen).length
      } else if (id === 'concepten') {
        counts[id] = emails.filter((e) => e.map === 'concepten').length
      } else if (id === 'gepland') {
        counts[id] = emails.filter((e) => e.map === 'gepland').length
      } else if (id === 'gesnoozed') {
        counts[id] = emails.filter((e) => e.snoozed_until).length
      } else {
        counts[id] = 0
      }
    })
    return counts
  }, [emails])

  // Filter counts for current folder
  const filterCounts = useMemo(() => {
    const folderEmails = selectedFolder === 'gesnoozed'
      ? emails.filter((e) => e.snoozed_until)
      : emails.filter((e) => e.map === selectedFolder)
    return {
      alle: folderEmails.length,
      ongelezen: folderEmails.filter((e) => !e.gelezen).length,
      'met-ster': folderEmails.filter((e) => e.starred).length,
      vastgepind: folderEmails.filter((e) => e.pinned).length,
      bijlagen: folderEmails.filter((e) => e.bijlagen > 0).length,
    }
  }, [emails, selectedFolder])

  // Filtered + sorted emails with advanced search operators
  const filteredEmails = useMemo(() => {
    let filtered = selectedFolder === 'gesnoozed'
      ? emails.filter((e) => e.snoozed_until)
      : emails.filter((e) => e.map === selectedFolder && !e.snoozed_until)

    if (searchQuery.trim()) {
      const { text, operators } = parseSearchQuery(searchQuery)

      // Apply text search
      if (text) {
        const q = text.toLowerCase()
        filtered = filtered.filter(
          (e) =>
            e.onderwerp.toLowerCase().includes(q) ||
            e.van.toLowerCase().includes(q) ||
            e.aan.toLowerCase().includes(q) ||
            e.inhoud.toLowerCase().includes(q)
        )
      }

      // Apply operator filters
      if (operators.from) {
        const from = operators.from.toLowerCase()
        filtered = filtered.filter((e) => e.van.toLowerCase().includes(from))
      }
      if (operators.to) {
        const to = operators.to.toLowerCase()
        filtered = filtered.filter((e) => e.aan.toLowerCase().includes(to))
      }
      if (operators.subject) {
        const subj = operators.subject.toLowerCase()
        filtered = filtered.filter((e) => e.onderwerp.toLowerCase().includes(subj))
      }
      if (operators.has) {
        const has = operators.has.toLowerCase()
        if (has === 'bijlage' || has === 'attachment') {
          filtered = filtered.filter((e) => e.bijlagen > 0)
        }
        if (has === 'ster' || has === 'star') {
          filtered = filtered.filter((e) => e.starred)
        }
      }
      if (operators.label) {
        const label = operators.label.toLowerCase()
        filtered = filtered.filter((e) => e.labels.some((l) => l.toLowerCase() === label))
      }
      if (operators.before) {
        const before = new Date(operators.before)
        if (!isNaN(before.getTime())) {
          filtered = filtered.filter((e) => new Date(e.datum) < before)
        }
      }
      if (operators.after) {
        const after = new Date(operators.after)
        if (!isNaN(after.getTime())) {
          filtered = filtered.filter((e) => new Date(e.datum) > after)
        }
      }
    }

    switch (filter) {
      case 'ongelezen': filtered = filtered.filter((e) => !e.gelezen); break
      case 'met-ster': filtered = filtered.filter((e) => e.starred); break
      case 'vastgepind': filtered = filtered.filter((e) => e.pinned); break
      case 'bijlagen': filtered = filtered.filter((e) => e.bijlagen > 0); break
    }

    // Sort: pinned first, then by date
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.datum).getTime() - new Date(a.datum).getTime()
    })
  }, [emails, selectedFolder, searchQuery, filter])

  // Thread grouping
  const threadedEmails = useMemo(() => {
    const threads = new Map<string, Email[]>()
    const standalone: Email[] = []

    filteredEmails.forEach((email) => {
      const threadId = email.thread_id
      if (threadId) {
        const existing = threads.get(threadId) || []
        existing.push(email)
        threads.set(threadId, existing)
      } else {
        standalone.push(email)
      }
    })

    // Return emails with thread info attached
    const result: (Email & { threadCount?: number; isThreadHead?: boolean })[] = []

    threads.forEach((threadEmails) => {
      // Sort thread by date, latest first
      threadEmails.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
      const head = threadEmails[0]
      result.push({ ...head, threadCount: threadEmails.length, isThreadHead: true })
    })

    standalone.forEach((email) => {
      result.push({ ...email, threadCount: 1 })
    })

    // Re-sort combined list
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.datum).getTime() - new Date(a.datum).getTime()
    })

    return result
  }, [filteredEmails])

  return {
    folderCounts,
    filterCounts,
    filteredEmails,
    threadedEmails,
  }
}
