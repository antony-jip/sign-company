import { useMemo } from 'react'
import type { Email } from '@/types'
import type { EmailFolder, FilterType, NoReplyRange } from '../emailTypes'
import { parseSearchQuery } from '../emailHelpers'
import { extractSenderEmail } from '../emailHelpers'

interface FolderTab {
  id: EmailFolder
  label: string
}

const folderIds: EmailFolder[] = ['inbox', 'verzonden', 'concepten', 'gepland', 'gesnoozed', 'prullenbak']

function getNoReplyEmails(emails: Email[], allEmails: Email[], range: NoReplyRange): Email[] {
  const now = new Date()
  const rangeDays: Record<NoReplyRange, [number, number]> = {
    '0-3': [0, 3],
    '4-7': [4, 7],
    '8-30': [8, 30],
  }
  const [minDays, maxDays] = rangeDays[range]

  // Build a set of email addresses we've sent emails to
  const sentToAddresses = new Set<string>()
  allEmails.filter(e => e.map === 'verzonden').forEach(e => {
    const addr = extractSenderEmail(e.aan).toLowerCase()
    if (addr) sentToAddresses.add(addr)
  })

  // Build a set of addresses that have replied (inbox emails from those addresses)
  const repliedAddresses = new Map<string, Date>()
  allEmails.filter(e => e.map === 'inbox').forEach(e => {
    const addr = extractSenderEmail(e.van).toLowerCase()
    const existing = repliedAddresses.get(addr)
    const emailDate = new Date(e.datum)
    if (!existing || emailDate > existing) {
      repliedAddresses.set(addr, emailDate)
    }
  })

  return emails.filter(e => {
    if (e.map !== 'verzonden') return false
    const sentDate = new Date(e.datum)
    const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceSent < minDays || daysSinceSent > maxDays) return false

    const toAddr = extractSenderEmail(e.aan).toLowerCase()
    const lastReply = repliedAddresses.get(toAddr)
    // No reply at all, or last reply was before we sent
    return !lastReply || lastReply < sentDate
  })
}

export function useEmailFilters(
  emails: Email[],
  selectedFolder: EmailFolder,
  searchQuery: string,
  filter: FilterType,
  noReplyRange?: NoReplyRange,
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
      'geen-antwoord': getNoReplyEmails(emails, emails, noReplyRange || '0-3').length,
    }
  }, [emails, selectedFolder, noReplyRange])

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
      case 'geen-antwoord': filtered = getNoReplyEmails(filtered, emails, noReplyRange || '0-3'); break
    }

    // Sort: pinned first, then by date (pre-compute timestamps)
    const withTs = filtered.map(e => ({ e, ts: new Date(e.datum).getTime() }))
    withTs.sort((a, b) => {
      if (a.e.pinned && !b.e.pinned) return -1
      if (!a.e.pinned && b.e.pinned) return 1
      return b.ts - a.ts
    })
    return withTs.map(x => x.e)
  }, [emails, selectedFolder, searchQuery, filter, noReplyRange])

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
      threadEmails.sort((a, b) => Date.parse(b.datum) - Date.parse(a.datum))
      const head = threadEmails[0]
      result.push({ ...head, threadCount: threadEmails.length, isThreadHead: true })
    })

    standalone.forEach((email) => {
      result.push({ ...email, threadCount: 1 })
    })

    // Re-sort combined list (pre-compute timestamps)
    const tsMap = new Map<string, number>()
    result.forEach(e => tsMap.set(e.id, new Date(e.datum).getTime()))
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return (tsMap.get(b.id) || 0) - (tsMap.get(a.id) || 0)
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
