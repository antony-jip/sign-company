import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Search, Pencil, Inbox, Send, FileEdit, Trash2,
  Loader2, Archive, RefreshCw, CheckCheck, X,
} from 'lucide-react'
import { sendEmail as sendEmailViaApi } from '@/services/gmailService'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { EmailReader } from './EmailReader'
import { EmailCompose } from './EmailCompose'
import { EmailListItem } from './EmailListItem'
import type { Email } from '@/types'
import { logger } from '../../utils/logger'
import { useEmailData } from './hooks/useEmailData'
import { useEmailActions } from './hooks/useEmailActions'
import { useEmailSelection } from './hooks/useEmailSelection'
import { useEmailFilters } from './hooks/useEmailFilters'
import { useEmailKeyboard } from './hooks/useEmailKeyboard'
import type { EmailFolder, FilterType, FontSize, ViewMode } from './emailTypes'
import { extractSenderEmail } from './emailHelpers'
import { KEYBOARD_SHORTCUTS } from './emailHelpers'

// Folder config
const folderTabs: { id: EmailFolder; label: string; icon: React.ElementType }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'verzonden', label: 'Verzonden', icon: Send },
  { id: 'concepten', label: 'Concepten', icon: FileEdit },
  { id: 'prullenbak', label: 'Prullenbak', icon: Trash2 },
]

// Filter config
const filters: { id: FilterType; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'ongelezen', label: 'Ongelezen' },
  { id: 'met-ster', label: 'Met ster' },
  { id: 'bijlagen', label: 'Bijlagen' },
]

export function EmailLayout() {
  // Core state
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('alle')
  const [showSearch, setShowSearch] = useState(false)
  const [fontSize, setFontSize] = useState<FontSize>('medium')

  // Compose state
  const [composeDefaults, setComposeDefaults] = useState<{
    to?: string; subject?: string; body?: string
  }>({})

  // Refs
  const emailListRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hooks
  const {
    emails, setEmails, isLoading, isRefreshing, isLoadingBody,
    handleRefresh, handleFolderLoad, loadEmailBody, loadMoreEmails,
    imapTotal, isLoadingMore, user,
  } = useEmailData()

  const {
    handleToggleStar, handleToggleRead, handleArchive, handleDelete,
    handleTogglePin, handleSnooze, handleUnsnooze,
  } = useEmailActions({ setEmails, setSelectedEmail, setViewMode })

  const { folderCounts, filterCounts, filteredEmails, threadedEmails } = useEmailFilters(
    emails, selectedFolder, searchQuery, filter
  )

  const {
    checkedEmails, hasChecked, allChecked, someChecked,
    toggleCheckEmail, toggleCheckAll, clearChecked,
    handleBulkDelete, handleBulkArchive, handleBulkMarkRead, handleBulkMarkUnread,
  } = useEmailSelection({ filteredEmails, setEmails })

  const { focusedIndex, setFocusedIndex, showShortcuts, setShowShortcuts } = useEmailKeyboard({
    viewMode,
    filteredEmails: threadedEmails,
    onSelectEmail: (email) => handleSelectEmail(email),
    onToggleStar: handleToggleStar,
    onTogglePin: handleTogglePin,
    onArchive: handleArchive,
    onDelete: handleDelete,
    onCompose: () => handleCompose(),
    onReply: (email) => handleReply(email),
    onForward: (email) => handleForward(email),
    onShowSnooze: () => {},
  })

  // Polling: refresh every 60s or on window focus
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      handleRefresh(selectedFolder)
    }, 60000)

    const handleFocus = () => {
      handleRefresh(selectedFolder)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      window.removeEventListener('focus', handleFocus)
    }
  }, [selectedFolder, handleRefresh])

  // Handlers
  const handleSelectEmail = useCallback(async (email: Email) => {
    const withBody = await loadEmailBody(email, selectedFolder)
    if (!withBody.gelezen) {
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, gelezen: true } : e))
    }
    setSelectedEmail(withBody)
    setViewMode('reading')
    setFocusedIndex(threadedEmails.indexOf(email))
  }, [loadEmailBody, selectedFolder, setEmails, threadedEmails, setFocusedIndex])

  const handleCompose = useCallback((defaults?: { to?: string; subject?: string; body?: string }) => {
    setComposeDefaults(defaults || {})
    setViewMode('composing')
    setSelectedEmail(null)
  }, [])

  const handleReply = useCallback((email: Email) => {
    handleCompose({
      to: extractSenderEmail(email.van),
      subject: email.onderwerp.startsWith('Re: ') ? email.onderwerp : `Re: ${email.onderwerp}`,
      body: `\n\n---------- Oorspronkelijk bericht ----------\nVan: ${email.van}\nDatum: ${email.datum}\n\n${email.inhoud?.replace(/<[^>]*>/g, '') || ''}`,
    })
  }, [handleCompose])

  const handleForward = useCallback((email: Email) => {
    handleCompose({
      subject: email.onderwerp.startsWith('Fwd: ') ? email.onderwerp : `Fwd: ${email.onderwerp}`,
      body: `\n\n---------- Doorgestuurd bericht ----------\nVan: ${email.van}\nDatum: ${email.datum}\nOnderwerp: ${email.onderwerp}\n\n${email.inhoud?.replace(/<[^>]*>/g, '') || ''}`,
    })
  }, [handleCompose])

  const handleSendEmail = useCallback(async (data: { to: string; subject: string; body: string; html?: string; scheduledAt?: string }) => {
    try {
      await sendEmailViaApi(data.to, data.subject, data.body, {
        html: data.html,
        scheduledAt: data.scheduledAt,
      })
    } catch (err) {
      logger.error('Email verzenden mislukt:', err)
      throw err
    }
  }, [])

  const handleSendReply = useCallback(async (data: { to: string; subject: string; body: string; html?: string }) => {
    try {
      await sendEmailViaApi(data.to, data.subject, data.body, { html: data.html })
    } catch (err) {
      logger.error('Reply verzenden mislukt:', err)
      throw err
    }
  }, [])

  const handleFolderChange = useCallback((folder: EmailFolder) => {
    setSelectedFolder(folder)
    setSelectedEmail(null)
    setViewMode('idle')
    setFilter('alle')
    setSearchQuery('')
    clearChecked()
    handleFolderLoad(folder)
  }, [clearChecked, handleFolderLoad])

  const handleBack = useCallback(() => {
    setSelectedEmail(null)
    setViewMode('idle')
  }, [])

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    const currentIndex = selectedEmail ? threadedEmails.findIndex(e => e.id === selectedEmail.id) : -1
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (nextIndex >= 0 && nextIndex < threadedEmails.length) {
      handleSelectEmail(threadedEmails[nextIndex])
    }
  }, [selectedEmail, threadedEmails, handleSelectEmail])

  // Scroll handler for infinite loading
  const handleScroll = useCallback(() => {
    if (!emailListRef.current || isLoadingMore) return
    const { scrollTop, scrollHeight, clientHeight } = emailListRef.current
    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMoreEmails(selectedFolder)
    }
  }, [isLoadingMore, loadMoreEmails, selectedFolder])

  const emailIndex = selectedEmail ? threadedEmails.findIndex(e => e.id === selectedEmail.id) : -1

  // ─── FULL-SCREEN EMAIL READER ───
  // When reading an email, the reader takes over the entire screen.
  // Sidebar and list are completely hidden.
  if (viewMode === 'reading') {
    return (
      <div className="h-[calc(100vh-56px)] bg-white overflow-hidden">
        <EmailReader
          email={selectedEmail}
          isLoadingBody={isLoadingBody}
          emailIndex={emailIndex}
          emailTotal={threadedEmails.length}
          onToggleStar={handleToggleStar}
          onToggleRead={handleToggleRead}
          onDelete={(email) => {
            handleDelete(email)
            // After deleting, go to next email or back to list
            const nextIdx = emailIndex + 1 < threadedEmails.length ? emailIndex + 1 : emailIndex - 1
            if (nextIdx >= 0 && nextIdx < threadedEmails.length) {
              handleSelectEmail(threadedEmails[nextIdx])
            } else {
              handleBack()
            }
          }}
          onArchive={(email) => {
            handleArchive(email)
            const nextIdx = emailIndex + 1 < threadedEmails.length ? emailIndex + 1 : emailIndex - 1
            if (nextIdx >= 0 && nextIdx < threadedEmails.length) {
              handleSelectEmail(threadedEmails[nextIdx])
            } else {
              handleBack()
            }
          }}
          onBack={handleBack}
          onNavigate={handleNavigate}
          onSendReply={handleSendReply}
        />
      </div>
    )
  }

  // ─── FULL-SCREEN COMPOSE ───
  if (viewMode === 'composing') {
    return (
      <div className="h-[calc(100vh-56px)] bg-white overflow-hidden">
        <EmailCompose
          open={true}
          onOpenChange={(open) => { if (!open) handleBack() }}
          defaultTo={composeDefaults.to}
          defaultSubject={composeDefaults.subject}
          defaultBody={composeDefaults.body}
          onSend={handleSendEmail}
        />
      </div>
    )
  }

  // ─── INBOX VIEW: sidebar + email list ───
  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#F4F3F0] overflow-hidden">
      {/* ─── SIDEBAR ─── */}
      <div className="w-[280px] bg-white border-r border-border/50 flex flex-col flex-shrink-0">
        <div className="p-4">
          <Button
            className="w-full py-2.5 rounded-lg gap-2"
            onClick={() => handleCompose()}
          >
            <Pencil className="h-4 w-4" />
            Nieuw
          </Button>
        </div>

        <nav className="flex-1 px-2">
          {folderTabs.map(folder => {
            const isActive = selectedFolder === folder.id
            const count = folderCounts[folder.id]
            const Icon = folder.icon
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderChange(folder.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-100',
                  isActive
                    ? 'bg-[#F4F3F0] text-foreground font-medium'
                    : 'text-foreground/60 hover:bg-[#F4F3F0]/50',
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{folder.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                    folder.id === 'inbox' ? 'bg-primary text-white font-medium' : 'text-foreground/40',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          <button
            onClick={() => handleFolderChange('gepland' as EmailFolder)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground/60 hover:bg-[#F4F3F0]/50 transition-colors duration-100"
          >
            <Archive className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Archief</span>
          </button>
        </nav>
      </div>

      {/* ─── EMAIL LIST (full remaining width) ─── */}
      <div className="flex-1 bg-white flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked }}
              onChange={toggleCheckAll}
              className="h-3.5 w-3.5 rounded border-border cursor-pointer accent-primary"
            />

            {hasChecked ? (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-foreground/60" onClick={handleBulkArchive}>
                  <Archive className="h-3 w-3 mr-1" /> Archief
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-foreground/60" onClick={handleBulkDelete}>
                  <Trash2 className="h-3 w-3 mr-1" /> Verwijder
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-foreground/60" onClick={handleBulkMarkRead}>
                  <CheckCheck className="h-3 w-3 mr-1" /> Gelezen
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-foreground/60" onClick={handleBulkMarkUnread}>
                  Ongelezen
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {filters.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs transition-colors duration-100',
                      filter === f.id
                        ? 'bg-[#F4F3F0] text-foreground font-medium'
                        : 'text-foreground/40 hover:text-foreground/60',
                    )}
                  >
                    {f.label}
                    {f.id === 'ongelezen' && filterCounts.ongelezen > 0 && (
                      <span className="ml-1 text-primary font-medium">{filterCounts.ongelezen}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Font size toggle */}
            <div className="flex items-center border border-border/30 rounded-md overflow-hidden mr-1">
              {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={cn(
                    'px-1.5 py-1 text-foreground/40 transition-colors',
                    fontSize === size && 'bg-foreground/5 text-foreground/70',
                  )}
                  title={size === 'small' ? 'Klein' : size === 'medium' ? 'Normaal' : 'Groot'}
                >
                  <span className={cn(
                    'font-medium leading-none',
                    size === 'small' && 'text-[10px]',
                    size === 'medium' && 'text-xs',
                    size === 'large' && 'text-sm',
                  )}>A</span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-foreground/40"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-foreground/40"
              onClick={() => handleRefresh(selectedFolder)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="flex items-center px-4 py-2 border-b border-border/30 bg-foreground/[0.02]">
            <Search className="h-3.5 w-3.5 text-foreground/30 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoeken... (from: to: has: label:)"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/30"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="h-3.5 w-3.5 text-foreground/30" />
              </button>
            )}
          </div>
        )}

        {/* Email list */}
        <div
          ref={emailListRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
            </div>
          ) : threadedEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-foreground/30">
              <Inbox className="h-8 w-8 mb-2" />
              <p className="text-sm">Geen emails</p>
            </div>
          ) : (
            <>
              {threadedEmails.map((email, index) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isActive={selectedEmail?.id === email.id}
                  isChecked={checkedEmails.has(email.id)}
                  isFocused={focusedIndex === index}
                  fontSize={fontSize}
                  onSelect={handleSelectEmail}
                  onToggleStar={handleToggleStar}
                  onToggleCheck={toggleCheckEmail}
                />
              ))}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-foreground/30" />
                </div>
              )}
              {threadedEmails.length < imapTotal && !isLoadingMore && (
                <button
                  onClick={() => loadMoreEmails(selectedFolder)}
                  className="w-full py-3 text-xs text-foreground/40 hover:text-foreground/60"
                >
                  Meer laden ({threadedEmails.length}/{imapTotal})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowShortcuts(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-xl border border-border p-6 w-[320px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Sneltoetsen</h3>
              <button onClick={() => setShowShortcuts(false)}>
                <X className="h-4 w-4 text-foreground/40" />
              </button>
            </div>
            <div className="space-y-1.5">
              {KEYBOARD_SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60">{s.action}</span>
                  <kbd className="px-2 py-0.5 bg-foreground/5 rounded text-xs font-mono">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
