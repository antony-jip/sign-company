import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Search, Pencil, Inbox, Send, FileEdit, Trash2,
  Loader2, Archive, RefreshCw, CheckCheck, X, Mail,
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
  const [searchInput, setSearchInput] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const noopSnooze = useCallback(() => {}, [])
  const handleComposeEmpty = useCallback(() => handleCompose(), [handleCompose])

  const { focusedIndex, setFocusedIndex, showShortcuts, setShowShortcuts } = useEmailKeyboard({
    viewMode,
    filteredEmails: threadedEmails,
    onSelectEmail: handleSelectEmail,
    onToggleStar: handleToggleStar,
    onTogglePin: handleTogglePin,
    onArchive: handleArchive,
    onDelete: handleDelete,
    onCompose: handleComposeEmpty,
    onReply: handleReply,
    onForward: handleForward,
    onShowSnooze: noopSnooze,
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
    setSearchInput('')
    clearChecked()
    handleFolderLoad(folder)
  }, [clearChecked, handleFolderLoad])

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setSearchQuery(value), 200)
  }, [])

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

  const emailIndex = useMemo(
    () => selectedEmail ? threadedEmails.findIndex(e => e.id === selectedEmail.id) : -1,
    [selectedEmail, threadedEmails],
  )

  // Navigate to next email after delete/archive
  const navigateAfterAction = useCallback((action: (email: Email) => void) => (email: Email) => {
    action(email)
    const idx = threadedEmails.findIndex(e => e.id === email.id)
    const nextIdx = idx + 1 < threadedEmails.length ? idx + 1 : idx - 1
    if (nextIdx >= 0 && nextIdx < threadedEmails.length) {
      handleSelectEmail(threadedEmails[nextIdx])
    } else {
      handleBack()
    }
  }, [threadedEmails, handleSelectEmail, handleBack])

  const handleDeleteAndNavigate = useMemo(() => navigateAfterAction(handleDelete), [navigateAfterAction, handleDelete])
  const handleArchiveAndNavigate = useMemo(() => navigateAfterAction(handleArchive), [navigateAfterAction, handleArchive])

  // ─── FULL-SCREEN EMAIL READER ───
  if (viewMode === 'reading') {
    return (
      <div className="h-[calc(100vh-56px)] bg-card overflow-hidden">
        <EmailReader
          email={selectedEmail}
          isLoadingBody={isLoadingBody}
          emailIndex={emailIndex}
          emailTotal={threadedEmails.length}
          onToggleStar={handleToggleStar}
          onToggleRead={handleToggleRead}
          onDelete={handleDeleteAndNavigate}
          onArchive={handleArchiveAndNavigate}
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
      <div className="h-[calc(100vh-56px)] bg-card overflow-hidden">
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

  // Active folder label for header
  const activeFolder = folderTabs.find(f => f.id === selectedFolder)

  // ─── INBOX VIEW: sidebar + email list ───
  return (
    <div className="flex h-[calc(100vh-56px)] bg-background overflow-hidden">
      {/* ─── SIDEBAR ─── */}
      <div className="w-[240px] bg-card border-r border-foreground/[0.06] flex flex-col flex-shrink-0">
        <div className="p-3">
          <Button
            className="w-full h-10 rounded-lg gap-2 text-sm font-medium shadow-sm"
            onClick={() => handleCompose()}
          >
            <Pencil className="h-4 w-4" />
            Nieuwe email
          </Button>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {folderTabs.map(folder => {
            const isActive = selectedFolder === folder.id
            const count = folderCounts[folder.id]
            const Icon = folder.icon
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderChange(folder.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
                  isActive
                    ? 'bg-primary/[0.08] text-primary font-semibold'
                    : 'text-foreground/55 hover:bg-foreground/[0.04] hover:text-foreground/75',
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
                <span className="flex-1 text-left">{folder.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-medium',
                    folder.id === 'inbox' && isActive
                      ? 'bg-primary text-white'
                      : folder.id === 'inbox'
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/35',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          <div className="my-2 border-t border-foreground/[0.05]" />

          <button
            onClick={() => handleFolderChange('gepland' as EmailFolder)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-foreground/55 hover:bg-foreground/[0.04] hover:text-foreground/75 transition-all duration-150"
          >
            <Archive className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Archief</span>
          </button>
        </nav>

        {/* Sidebar footer — subtle branding */}
        <div className="px-4 py-3 border-t border-foreground/[0.05]">
          <div className="flex items-center gap-2 text-[11px] text-foreground/25">
            <Mail className="h-3 w-3" />
            <span>FORGEdesk Mail</span>
          </div>
        </div>
      </div>

      {/* ─── EMAIL LIST (full remaining width) ─── */}
      <div className="flex-1 bg-card flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-foreground/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Select all checkbox */}
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked }}
              onChange={toggleCheckAll}
              className="h-4 w-4 rounded border-foreground/20 cursor-pointer accent-primary"
            />

            {hasChecked ? (
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]" onClick={handleBulkArchive}>
                  <Archive className="h-3.5 w-3.5" /> Archief
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]" onClick={handleBulkDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> Verwijder
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]" onClick={handleBulkMarkRead}>
                  <CheckCheck className="h-3.5 w-3.5" /> Gelezen
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]" onClick={handleBulkMarkUnread}>
                  Ongelezen
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 bg-foreground/[0.03] rounded-lg p-0.5">
                {filters.map(f => {
                  const isActiveFilter = filter === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs transition-all duration-150',
                        isActiveFilter
                          ? 'bg-card text-foreground font-medium shadow-sm'
                          : 'text-foreground/45 hover:text-foreground/65',
                      )}
                    >
                      {f.label}
                      {f.id === 'ongelezen' && filterCounts.ongelezen > 0 && (
                        <span className={cn(
                          'ml-1 font-semibold',
                          isActiveFilter ? 'text-primary' : 'text-primary/60',
                        )}>{filterCounts.ongelezen}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            {/* Font size toggle */}
            <div className="flex items-center bg-foreground/[0.03] rounded-md p-0.5 mr-1">
              {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={cn(
                    'px-1.5 py-1 rounded transition-all duration-150',
                    fontSize === size
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-foreground/35 hover:text-foreground/55',
                  )}
                  title={size === 'small' ? 'Klein' : size === 'medium' ? 'Normaal' : 'Groot'}
                >
                  <span className={cn(
                    'font-semibold leading-none',
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
              className="h-8 w-8 text-foreground/35 hover:text-foreground/60 hover:bg-foreground/[0.04]"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/35 hover:text-foreground/60 hover:bg-foreground/[0.04]"
              onClick={() => handleRefresh(selectedFolder)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="flex items-center px-4 h-11 border-b border-foreground/[0.05] bg-foreground/[0.015]">
            <Search className="h-4 w-4 text-foreground/25 mr-3 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Zoeken in emails... (from: to: has: label:)"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/25"
              autoFocus
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearchQuery('') }} className="p-1 hover:bg-foreground/5 rounded">
                <X className="h-4 w-4 text-foreground/30" />
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
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
              <p className="text-sm text-foreground/30">Emails laden...</p>
            </div>
          ) : threadedEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-foreground/[0.03] flex items-center justify-center mb-4">
                <Inbox className="h-7 w-7 text-foreground/20" />
              </div>
              <h3 className="text-sm font-medium text-foreground/50 mb-1">
                {searchQuery ? 'Geen resultaten' : filter !== 'alle' ? 'Geen emails met dit filter' : 'Inbox is leeg'}
              </h3>
              <p className="text-xs text-foreground/30 max-w-[240px]">
                {searchQuery
                  ? `Geen emails gevonden voor "${searchQuery}"`
                  : filter !== 'alle'
                    ? 'Probeer een ander filter of bekijk alle emails'
                    : 'Nieuwe emails verschijnen hier automatisch'
                }
              </p>
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
                <div className="flex items-center justify-center py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-primary/40 mr-2" />
                  <span className="text-xs text-foreground/30">Meer laden...</span>
                </div>
              )}
              {threadedEmails.length < imapTotal && !isLoadingMore && (
                <button
                  onClick={() => loadMoreEmails(selectedFolder)}
                  className="w-full py-4 text-xs text-foreground/35 hover:text-primary hover:bg-primary/[0.02] transition-colors"
                >
                  Meer laden ({threadedEmails.length} van {imapTotal})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card rounded-xl shadow-2xl border border-foreground/10 p-6 w-[340px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-foreground">Sneltoetsen</h3>
              <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-foreground/5 rounded">
                <X className="h-4 w-4 text-foreground/40" />
              </button>
            </div>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-sm text-foreground/55">{s.action}</span>
                  <kbd className="px-2 py-1 bg-foreground/[0.04] border border-foreground/[0.08] rounded text-xs font-mono text-foreground/60">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
