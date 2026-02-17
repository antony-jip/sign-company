import React, { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Pencil,
  Inbox,
  Send,
  FileEdit,
  Trash2,
  Star,
  Tag,
  Paperclip,
  Loader2,
  Clock,
  ArrowUpDown,
  SlidersHorizontal,
  Archive,
} from 'lucide-react'
import { getEmails, getKlanten, createKlant, updateEmail, deleteEmail, createEmail } from '@/services/supabaseService'
import { formatDateTime, cn, truncate } from '@/lib/utils'
import { toast } from 'sonner'
import { EmailReader } from './EmailReader'
import { ContactSidebar } from './ContactSidebar'
import { EmailCompose } from './EmailCompose'
import { demoEmails, demoContacts, getContactByEmail, extractEmailAddress } from '@/data/email-demo-data'
import type { EmailContact } from '@/data/email-demo-data'
import type { Email, Klant } from '@/types'

type EmailFolder = 'inbox' | 'verzonden' | 'concepten' | 'gepland' | 'prullenbak'
type SortField = 'datum' | 'van' | 'onderwerp'
type SortDir = 'asc' | 'desc'
type FilterType = 'alle' | 'ongelezen' | 'met-ster' | 'bijlagen'

interface FolderConfig {
  id: EmailFolder
  label: string
  icon: React.ElementType
}

const folders: FolderConfig[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'verzonden', label: 'Verzonden', icon: Send },
  { id: 'gepland', label: 'Gepland', icon: Clock },
  { id: 'concepten', label: 'Concepten', icon: FileEdit },
  { id: 'prullenbak', label: 'Prullenbak', icon: Trash2 },
]

const labelConfig: { name: string; color: string }[] = [
  { name: 'offerte', color: 'bg-blue-400' },
  { name: 'klant', color: 'bg-emerald-400' },
  { name: 'project', color: 'bg-violet-400' },
  { name: 'leverancier', color: 'bg-amber-400' },
]

function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim() : from
}

function formatShortDate(dateStr: string, isScheduled?: boolean): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) {
    const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24))
    if (futureDays === 0) {
      return `Vandaag ${date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
    }
    if (futureDays === 1) {
      return `Morgen ${date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
    }
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  if (diffDays === 0) {
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Gisteren'
  if (diffDays < 7) {
    return date.toLocaleDateString('nl-NL', { weekday: 'short' })
  }
  return date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}

function getLabelColor(label: string): string {
  switch (label) {
    case 'offerte': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
    case 'klant': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
    case 'project': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
    case 'leverancier': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

export function EmailLayout() {
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeDefaults, setComposeDefaults] = useState<{
    to?: string
    subject?: string
    body?: string
  }>({})
  const [emails, setEmails] = useState<Email[]>([])
  const [contacts, setContacts] = useState<EmailContact[]>(demoContacts)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('datum')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState<FilterType>('alle')
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

  // Load emails - fallback to demo data if empty
  useEffect(() => {
    Promise.all([
      getEmails().catch(() => []),
      getKlanten().catch(() => []),
    ])
      .then(([emailData, klantData]) => {
        // Use demo data if no real emails
        if (emailData.length === 0) {
          setEmails(demoEmails)
        } else {
          setEmails(emailData)
        }
        setKlanten(klantData)

        // Mark contacts as customer if they exist in klanten
        if (klantData.length > 0) {
          setContacts((prev) =>
            prev.map((c) => {
              const isKlant = klantData.some((k: Klant) => k.email === c.email)
              return isKlant ? { ...c, isCustomer: true } : c
            })
          )
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const unreadCount = useMemo(
    () => emails.filter((e) => e.map === 'inbox' && !e.gelezen).length,
    [emails]
  )

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    folders.forEach((f) => {
      if (f.id === 'inbox') {
        counts[f.id] = emails.filter((e) => e.map === 'inbox' && !e.gelezen).length
      } else if (f.id === 'concepten') {
        counts[f.id] = emails.filter((e) => e.map === 'concepten').length
      } else if (f.id === 'gepland') {
        counts[f.id] = emails.filter((e) => e.map === 'gepland').length
      } else {
        counts[f.id] = 0
      }
    })
    return counts
  }, [emails])

  const filteredEmails = useMemo(() => {
    let filtered = emails.filter((e) => e.map === selectedFolder)

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.onderwerp.toLowerCase().includes(q) ||
          e.van.toLowerCase().includes(q) ||
          e.aan.toLowerCase().includes(q) ||
          e.inhoud.toLowerCase().includes(q)
      )
    }

    // Filter
    switch (filter) {
      case 'ongelezen':
        filtered = filtered.filter((e) => !e.gelezen)
        break
      case 'met-ster':
        filtered = filtered.filter((e) => e.starred)
        break
      case 'bijlagen':
        filtered = filtered.filter((e) => e.bijlagen > 0)
        break
    }

    // Label filter
    if (selectedLabel) {
      filtered = filtered.filter((e) => e.labels.includes(selectedLabel))
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'datum':
          cmp = new Date(a.datum).getTime() - new Date(b.datum).getTime()
          break
        case 'van':
          cmp = extractSenderName(a.van).localeCompare(extractSenderName(b.van))
          break
        case 'onderwerp':
          cmp = a.onderwerp.localeCompare(b.onderwerp)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [emails, selectedFolder, searchQuery, filter, selectedLabel, sortField, sortDir])

  // Contact for selected email
  const selectedContact = useMemo(() => {
    if (!selectedEmail) return null
    const emailAddr = selectedEmail.map === 'verzonden' || selectedEmail.map === 'concepten'
      ? selectedEmail.aan
      : selectedEmail.van
    return getContactByEmail(emailAddr) || null
  }, [selectedEmail])

  const selectedSenderName = useMemo(() => {
    if (!selectedEmail) return ''
    const from = selectedEmail.map === 'verzonden' || selectedEmail.map === 'concepten'
      ? selectedEmail.aan
      : selectedEmail.van
    return extractSenderName(from)
  }, [selectedEmail])

  const selectedSenderEmail = useMemo(() => {
    if (!selectedEmail) return ''
    const from = selectedEmail.map === 'verzonden' || selectedEmail.map === 'concepten'
      ? selectedEmail.aan
      : selectedEmail.van
    return extractEmailAddress(from)
  }, [selectedEmail])

  const selectedSenderCompany = useMemo(() => {
    return selectedContact?.company
  }, [selectedContact])

  // Handlers
  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email)
    if (!email.gelezen) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, gelezen: true } : e))
      )
      if (!email.id.startsWith('demo-')) {
        updateEmail(email.id, { gelezen: true }).catch(() => {})
      }
    }
  }

  const handleToggleStar = (email: Email) => {
    const newStarred = !email.starred
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, starred: newStarred } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, starred: newStarred } : prev
    )
    if (!email.id.startsWith('demo-')) {
      updateEmail(email.id, { starred: newStarred }).catch(() => {})
    }
  }

  const handleToggleRead = (email: Email) => {
    const newGelezen = !email.gelezen
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, gelezen: newGelezen } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, gelezen: newGelezen } : prev
    )
    if (!email.id.startsWith('demo-')) {
      updateEmail(email.id, { gelezen: newGelezen }).catch(() => {})
    }
  }

  const handleArchive = (email: Email) => {
    setEmails((prev) => prev.filter((e) => e.id !== email.id))
    if (selectedEmail?.id === email.id) setSelectedEmail(null)
    toast.success('Email gearchiveerd')
  }

  const handleDelete = (email: Email) => {
    if (email.map === 'prullenbak') {
      setEmails((prev) => prev.filter((e) => e.id !== email.id))
      if (!email.id.startsWith('demo-')) {
        deleteEmail(email.id).catch(() => {})
      }
    } else {
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e
        )
      )
      if (!email.id.startsWith('demo-')) {
        updateEmail(email.id, { map: 'prullenbak', labels: ['prullenbak'] }).catch(() => {})
      }
    }
    if (selectedEmail?.id === email.id) setSelectedEmail(null)
    toast.success('Email verwijderd')
  }

  const handleReply = (email: Email) => {
    const senderEmail = email.van.match(/<([^>]+)>/)?.[1] || email.van
    setComposeDefaults({
      to: senderEmail,
      subject: `Re: ${email.onderwerp}`,
      body: `\n\n---\nOp ${formatDateTime(email.datum)} schreef ${extractSenderName(email.van)}:\n\n${email.inhoud}`,
    })
    setComposeOpen(true)
  }

  const handleForward = (email: Email) => {
    setComposeDefaults({
      to: '',
      subject: `Fwd: ${email.onderwerp}`,
      body: `\n\n---\nDoorgestuurd bericht\nVan: ${email.van}\nDatum: ${formatDateTime(email.datum)}\nOnderwerp: ${email.onderwerp}\n\n${email.inhoud}`,
    })
    setComposeOpen(true)
  }

  const handleCompose = () => {
    setComposeDefaults({})
    setComposeOpen(true)
  }

  const handleSendEmail = (data: { to: string; subject: string; body: string; scheduledAt?: string }) => {
    const isScheduled = !!data.scheduledAt
    const newEmail: Omit<Email, 'id' | 'created_at'> = {
      user_id: '',
      gmail_id: '',
      van: 'ik@signcompany.nl',
      aan: data.to,
      onderwerp: data.subject,
      inhoud: data.body,
      datum: isScheduled ? data.scheduledAt! : new Date().toISOString(),
      gelezen: true,
      starred: false,
      labels: isScheduled ? ['gepland'] : ['verzonden'],
      bijlagen: 0,
      map: isScheduled ? 'gepland' : 'verzonden',
      scheduled_at: data.scheduledAt,
    }
    createEmail(newEmail)
      .then((saved) => {
        setEmails((prev) => [saved, ...prev])
        if (isScheduled) {
          toast.success('Email ingepland', { description: `Wordt verzonden op ${formatDateTime(data.scheduledAt!)}` })
        } else {
          toast.success('Email verzonden')
        }
      })
      .catch(() => {
        toast.error('Email kon niet worden verzonden')
      })
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const handleAddCustomer = (email: string) => {
    const contact = contacts.find((c) => c.email === email)
    if (!contact) return

    // Update local contact state
    setContacts((prev) =>
      prev.map((c) => (c.email === email ? { ...c, isCustomer: true } : c))
    )

    // Try to create in Supabase
    createKlant({
      user_id: '',
      bedrijfsnaam: contact.company || contact.name,
      contactpersoon: contact.name,
      email: contact.email,
      telefoon: contact.phone || '',
      adres: '',
      postcode: '',
      stad: '',
      land: 'Nederland',
      website: '',
      kvk_nummer: '',
      btw_nummer: '',
      status: 'actief',
      tags: contact.tags,
      notities: contact.notes || '',
    }).catch(() => {})

    toast.success('Contact toegevoegd aan klantenbestand!')
  }

  const handleSubscribeNewsletter = (email: string) => {
    setContacts((prev) => {
      const existing = prev.find((c) => c.email === email)
      if (existing) {
        return prev.map((c) => (c.email === email ? { ...c, subscribedNewsletter: true } : c))
      }
      return prev
    })
    toast.success('Contact geabonneerd op nieuwsbrief!')
  }

  const handleFolderChange = (folder: EmailFolder) => {
    setSelectedFolder(folder)
    setSelectedEmail(null)
    setFilter('alle')
    setSelectedLabel(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Email</h1>
      </div>

      {isLoading ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Emails laden...</p>
          </div>
        </Card>
      ) : (
      <Card className="flex-1 flex overflow-hidden">
        {/* Left panel - Folders */}
        <div className="w-52 border-r flex-shrink-0 flex flex-col">
          <div className="p-3">
            <Button
              onClick={handleCompose}
              className="w-full gap-2"
              size="sm"
            >
              <Pencil className="w-4 h-4" />
              Opstellen
            </Button>
          </div>

          <Separator />

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {folders.map((folder) => {
                const isActive = selectedFolder === folder.id
                const Icon = folder.icon
                const count = folderCounts[folder.id]

                return (
                  <button
                    key={folder.id}
                    onClick={() => handleFolderChange(folder.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive && 'text-blue-600 dark:text-blue-400')} />
                    <span className="flex-1 text-left">{folder.label}</span>
                    {count > 0 && (
                      <Badge className="bg-blue-600 text-white text-[10px] px-1.5 min-w-[20px] h-5 flex items-center justify-center">
                        {count}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>

            <Separator className="my-2" />

            <div className="p-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                Labels
              </p>
              {labelConfig.map((label) => (
                <button
                  key={label.name}
                  onClick={() => {
                    setSelectedLabel(selectedLabel === label.name ? null : label.name)
                    setSelectedFolder('inbox')
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
                    selectedLabel === label.name
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${label.color}`} />
                  <span className="capitalize">{label.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Middle panel - Email list */}
        <div className="w-80 lg:w-96 border-r flex-shrink-0 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek emails..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Filter & Sort toolbar */}
          <div className="px-3 py-2 border-b flex items-center gap-1 overflow-x-auto">
            {(['alle', 'ongelezen', 'met-ster', 'bijlagen'] as FilterType[]).map((f) => {
              const labels: Record<FilterType, string> = {
                alle: 'Alle',
                ongelezen: 'Ongelezen',
                'met-ster': 'Met ster',
                bijlagen: 'Bijlagen',
              }
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    filter === f
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {labels[f]}
                </button>
              )
            })}
          </div>

          {/* Sort options */}
          <div className="px-3 py-1.5 border-b flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowUpDown className="w-3 h-3" />
            <span>Sorteer:</span>
            {([
              { field: 'datum' as SortField, label: 'Datum' },
              { field: 'van' as SortField, label: 'Afzender' },
              { field: 'onderwerp' as SortField, label: 'Onderwerp' },
            ]).map(({ field, label }) => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={cn(
                  'px-1.5 py-0.5 rounded transition-colors',
                  sortField === field
                    ? 'text-blue-700 dark:text-blue-300 font-medium'
                    : 'hover:text-foreground'
                )}
              >
                {label}
                {sortField === field && (
                  <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
          </div>

          {/* Email list */}
          <ScrollArea className="flex-1">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                {selectedFolder === 'gepland' ? (
                  <>
                    <Clock className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Geen ingeplande emails</p>
                    <p className="text-xs mt-1">Plan een email in via de opstelknop.</p>
                  </>
                ) : filter !== 'alle' ? (
                  <>
                    <SlidersHorizontal className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Geen resultaten</p>
                    <p className="text-xs mt-1">Probeer een ander filter.</p>
                  </>
                ) : (
                  <>
                    <Inbox className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Geen emails</p>
                    <p className="text-xs mt-1">Deze map is leeg.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id
                  const isUnread = !email.gelezen
                  const displayName = email.map === 'verzonden' || email.map === 'concepten'
                    ? extractSenderName(email.aan)
                    : extractSenderName(email.van)

                  return (
                    <div
                      key={email.id}
                      onClick={() => handleSelectEmail(email)}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-muted/50',
                        isUnread && 'border-l-2 border-l-blue-500'
                      )}
                    >
                      {/* Unread dot + Star */}
                      <div className="flex flex-col items-center gap-1.5 pt-0.5">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleStar(email)
                          }}
                          className="flex-shrink-0"
                        >
                          {email.starred ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <Star className="w-4 h-4 text-gray-300 group-hover:text-gray-400 dark:text-gray-600" />
                          )}
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'text-sm truncate',
                              isUnread ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                            )}
                          >
                            {displayName}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0 flex items-center gap-1">
                            {email.scheduled_at && email.map === 'gepland' && (
                              <Clock className="w-3 h-3 text-purple-500" />
                            )}
                            {formatShortDate(email.scheduled_at || email.datum, !!email.scheduled_at)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            'text-sm truncate mt-0.5',
                            isUnread ? 'font-semibold' : 'text-foreground'
                          )}
                        >
                          {email.onderwerp}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {truncate(email.inhoud.replace(/\n/g, ' '), 80)}
                        </p>

                        {/* Labels + attachment indicator */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {email.labels.filter((l) => l !== 'verzonden' && l !== 'prullenbak' && l !== 'gepland').slice(0, 2).map((label) => (
                            <Badge
                              key={label}
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 h-4 ${getLabelColor(label)}`}
                            >
                              {label}
                            </Badge>
                          ))}
                          <div className="flex-1" />
                          {email.bijlagen > 0 && (
                            <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right panel - Email reader + Contact sidebar */}
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 min-w-0">
            <EmailReader
              email={selectedEmail}
              onToggleStar={handleToggleStar}
              onToggleRead={handleToggleRead}
              onDelete={handleDelete}
              onReply={handleReply}
              onForward={handleForward}
              onArchive={handleArchive}
            />
          </div>

          {/* Contact sidebar - only visible when email selected */}
          {selectedEmail && (
            <ContactSidebar
              contact={selectedContact}
              senderName={selectedSenderName}
              senderEmail={selectedSenderEmail}
              senderCompany={selectedSenderCompany}
              onAddCustomer={handleAddCustomer}
              onSubscribeNewsletter={handleSubscribeNewsletter}
            />
          )}
        </div>
      </Card>
      )}

      {/* Compose dialog */}
      <EmailCompose
        open={composeOpen}
        onOpenChange={setComposeOpen}
        defaultTo={composeDefaults.to}
        defaultSubject={composeDefaults.subject}
        defaultBody={composeDefaults.body}
        onSend={handleSendEmail}
      />
    </div>
  )
}
