import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Pencil,
  Inbox,
  Send,
  FileEdit,
  Trash2,
  Star,
  StarOff,
  Tag,
  Paperclip,
} from 'lucide-react'
import { mockEmails } from '@/data/mockData'
import { formatDateTime } from '@/lib/utils'
import { cn, truncate } from '@/lib/utils'
import { EmailReader } from './EmailReader'
import { EmailCompose } from './EmailCompose'
import type { Email } from '@/types'

type EmailFolder = 'inbox' | 'verzonden' | 'concepten' | 'prullenbak'

interface FolderConfig {
  id: EmailFolder
  label: string
  icon: React.ElementType
}

const folders: FolderConfig[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'verzonden', label: 'Verzonden', icon: Send },
  { id: 'concepten', label: 'Concepten', icon: FileEdit },
  { id: 'prullenbak', label: 'Prullenbak', icon: Trash2 },
]

function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim() : from
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Gisteren'
  if (diffDays < 7) {
    return date.toLocaleDateString('nl-NL', { weekday: 'short' })
  }
  return date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
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
  const [emails, setEmails] = useState<Email[]>(mockEmails)

  const unreadCount = useMemo(
    () => emails.filter((e) => e.map === 'inbox' && !e.gelezen).length,
    [emails]
  )

  const filteredEmails = useMemo(() => {
    let filtered = emails.filter((e) => e.map === selectedFolder)

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

    // Sort by date descending
    return [...filtered].sort(
      (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
    )
  }, [emails, selectedFolder, searchQuery])

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email)
    // Mark as read
    if (!email.gelezen) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, gelezen: true } : e))
      )
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
  }

  const handleToggleRead = (email: Email) => {
    const newGelezen = !email.gelezen
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, gelezen: newGelezen } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, gelezen: newGelezen } : prev
    )
  }

  const handleDelete = (email: Email) => {
    if (email.map === 'prullenbak') {
      setEmails((prev) => prev.filter((e) => e.id !== email.id))
    } else {
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e
        )
      )
    }
    if (selectedEmail?.id === email.id) {
      setSelectedEmail(null)
    }
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Email</h1>
      </div>

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
                const count =
                  folder.id === 'inbox' ? unreadCount : undefined

                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolder(folder.id)
                      setSelectedEmail(null)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive && 'text-blue-600 dark:text-blue-400')} />
                    <span className="flex-1 text-left">{folder.label}</span>
                    {count !== undefined && count > 0 && (
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
              {['klant', 'project', 'offerte', 'leverancier'].map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span className="capitalize">{label}</span>
                </div>
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

          {/* Email list */}
          <ScrollArea className="flex-1">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Inbox className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Geen emails</p>
                <p className="text-xs mt-1">Deze map is leeg.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id
                  const isUnread = !email.gelezen

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
                      {/* Star */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleStar(email)
                        }}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {email.starred ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Star className="w-4 h-4 text-gray-300 group-hover:text-gray-400 dark:text-gray-600" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'text-sm truncate',
                              isUnread ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                            )}
                          >
                            {extractSenderName(email.van)}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">
                            {formatShortDate(email.datum)}
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
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {truncate(email.inhoud.replace(/\n/g, ' '), 80)}
                          </p>
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

        {/* Right panel - Email reader */}
        <div className="flex-1 min-w-0">
          <EmailReader
            email={selectedEmail}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onDelete={handleDelete}
            onReply={handleReply}
            onForward={handleForward}
          />
        </div>
      </Card>

      {/* Compose dialog */}
      <EmailCompose
        open={composeOpen}
        onOpenChange={setComposeOpen}
        defaultTo={composeDefaults.to}
        defaultSubject={composeDefaults.subject}
        defaultBody={composeDefaults.body}
      />
    </div>
  )
}
