import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  Mail,
  MailOpen,
  Paperclip,
  Inbox,
  Clock,
  Archive,
  Send,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Tag,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Undo2,
  Redo2,
  Type,
  X,
  FileText,
  CalendarClock,
  Quote,
} from 'lucide-react'
import { formatDateTime, getInitials, cn } from '@/lib/utils'
import type { Email } from '@/types'

interface EmailReaderProps {
  email: Email | null
  onToggleStar?: (email: Email) => void
  onToggleRead?: (email: Email) => void
  onDelete?: (email: Email) => void
  onReply?: (email: Email) => void
  onForward?: (email: Email) => void
  onArchive?: (email: Email) => void
  onBack?: () => void
}

function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim() : from
}

function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
    'bg-teal-500', 'bg-orange-500',
  ]
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[index]
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileTypeColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return 'bg-red-500'
    case 'doc': case 'docx': return 'bg-blue-600'
    case 'xls': case 'xlsx': return 'bg-green-600'
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return 'bg-purple-500'
    case 'zip': case 'rar': return 'bg-yellow-600'
    default: return 'bg-gray-500'
  }
}

function getFileExt(name: string): string {
  return (name.split('.').pop() || 'FILE').toUpperCase().substring(0, 4)
}

const replyTemplates = [
  {
    id: 'bedankt',
    label: 'Bedankt voor uw bericht',
    content: 'Beste [naam],\n\nBedankt voor uw bericht. Wij hebben uw verzoek in goede orde ontvangen en nemen zo spoedig mogelijk contact met u op.\n\nMet vriendelijke groet,',
  },
  {
    id: 'terugkomen',
    label: 'We komen erop terug',
    content: 'Beste [naam],\n\nBedankt voor uw bericht. Wij zullen uw verzoek intern bespreken en komen zo spoedig mogelijk bij u terug.\n\nMet vriendelijke groet,',
  },
  {
    id: 'offerte',
    label: 'Offerte in bijlage',
    content: 'Beste [naam],\n\nIn de bijlage vindt u onze offerte voor [projectnaam]. Graag lichten wij deze persoonlijk toe in een gesprek.\n\nMocht u vragen hebben, neem dan gerust contact op.\n\nMet vriendelijke groet,',
  },
  {
    id: 'planning',
    label: 'Planning bevestiging',
    content: 'Beste [naam],\n\nHierbij bevestig ik onze afspraak op [datum] om [tijd].\n\nLocatie: [locatie]\n\nMocht u moeten verzetten, laat het dan tijdig weten.\n\nMet vriendelijke groet,',
  },
  {
    id: 'akkoord',
    label: 'Akkoord & start project',
    content: 'Beste [naam],\n\nBedankt voor uw goedkeuring. Wij gaan direct aan de slag met [projectnaam].\n\nU hoort van ons zodra we verdere updates hebben.\n\nMet vriendelijke groet,',
  },
]

const mergeFields = [
  { id: 'naam', label: 'Naam', value: '[naam]' },
  { id: 'bedrijf', label: 'Bedrijf', value: '[bedrijf]' },
  { id: 'datum', label: 'Datum vandaag', value: '[datum]' },
  { id: 'projectnaam', label: 'Projectnaam', value: '[projectnaam]' },
  { id: 'offerte_nummer', label: 'Offertenummer', value: '[offerte_nummer]' },
  { id: 'mijn_naam', label: 'Mijn naam', value: '[mijn_naam]' },
  { id: 'telefoon', label: 'Telefoonnummer', value: '[telefoon]' },
]

export function EmailReader({
  email,
  onToggleStar,
  onToggleRead,
  onDelete,
  onReply,
  onForward,
  onArchive,
  onBack,
}: EmailReaderProps) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyMode, setReplyMode] = useState<'reply' | 'reply-all' | 'forward'>('reply')
  const [showReplyModeDropdown, setShowReplyModeDropdown] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set([0]))
  const [editorEmpty, setEditorEmpty] = useState(true)
  const [forwardTo, setForwardTo] = useState('')

  // File upload
  const [attachments, setAttachments] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  // Scheduling
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleOption, setScheduleOption] = useState('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('09:00')

  // Dropdowns
  const [showTemplates, setShowTemplates] = useState(false)
  const [showMergeFields, setShowMergeFields] = useState(false)

  // Format state
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  })

  // Refs
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scheduleRef = useRef<HTMLDivElement>(null)
  const templateRef = useRef<HTMLDivElement>(null)
  const mergeFieldRef = useRef<HTMLDivElement>(null)
  const replyModeRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSchedule && scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) {
        setShowSchedule(false)
      }
      if (showTemplates && templateRef.current && !templateRef.current.contains(e.target as Node)) {
        setShowTemplates(false)
      }
      if (showMergeFields && mergeFieldRef.current && !mergeFieldRef.current.contains(e.target as Node)) {
        setShowMergeFields(false)
      }
      if (showReplyModeDropdown && replyModeRef.current && !replyModeRef.current.contains(e.target as Node)) {
        setShowReplyModeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSchedule, showTemplates, showMergeFields, showReplyModeDropdown])

  // Focus editor when reply opens
  useEffect(() => {
    if (replyOpen && editorRef.current) {
      const timer = setTimeout(() => editorRef.current?.focus(), 80)
      return () => clearTimeout(timer)
    }
  }, [replyOpen])

  // Format commands
  const updateFormatState = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
    })
  }, [])

  const execFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    updateFormatState()
  }, [updateFormatState])

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText?.trim()
      setEditorEmpty(!text)
    }
  }, [])

  const insertLink = useCallback(() => {
    const url = prompt('Voer de URL in:', 'https://')
    if (url) {
      execFormat('createLink', url)
    }
  }, [execFormat])

  // Templates
  const applyTemplate = useCallback((content: string) => {
    if (editorRef.current) {
      editorRef.current.innerText = content
      setEditorEmpty(false)
    }
    setShowTemplates(false)
    editorRef.current?.focus()
  }, [])

  // Merge fields
  const insertMergeField = useCallback((value: string) => {
    editorRef.current?.focus()
    document.execCommand('insertText', false, value)
    setShowMergeFields(false)
    setEditorEmpty(false)
  }, [])

  // File upload
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
    e.target.value = ''
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files)])
    }
  }, [])

  // Scheduling
  const getNextMonday = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    return nextMonday
  }

  const handleScheduleSelect = (option: string) => {
    setScheduleOption(option)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    switch (option) {
      case 'now':
        setScheduledAt('')
        setShowSchedule(false)
        break
      case 'tomorrow-9':
        setScheduledAt(`${tomorrowStr}T09:00`)
        setShowSchedule(false)
        break
      case 'tomorrow-14':
        setScheduledAt(`${tomorrowStr}T14:00`)
        setShowSchedule(false)
        break
      case 'next-monday': {
        const monday = getNextMonday()
        const mondayStr = monday.toISOString().split('T')[0]
        setScheduledAt(`${mondayStr}T09:00`)
        setShowSchedule(false)
        break
      }
      case 'custom':
        if (customDate && customTime) {
          setScheduledAt(`${customDate}T${customTime}`)
        }
        break
    }
  }

  // Open reply
  const openReply = useCallback((mode: 'reply' | 'reply-all' | 'forward') => {
    setReplyMode(mode)
    setReplyOpen(true)
    setForwardTo('')
    if (mode === 'forward' && email && editorRef.current) {
      setTimeout(() => {
        if (editorRef.current) {
          const fwdHeader = `\n\n---------- Doorgestuurd bericht ----------\nVan: ${email.van}\nDatum: ${formatDateTime(email.datum)}\nOnderwerp: ${email.onderwerp}\nAan: ${email.aan}\n\n${email.inhoud}`
          editorRef.current.innerText = fwdHeader
          setEditorEmpty(false)
        }
      }, 100)
    }
  }, [email])

  // Close reply
  const closeReply = useCallback(() => {
    setReplyOpen(false)
    setAttachments([])
    setScheduledAt('')
    setScheduleOption('now')
    setCustomDate('')
    setCustomTime('09:00')
    setShowSchedule(false)
    setShowTemplates(false)
    setShowMergeFields(false)
    setShowReplyModeDropdown(false)
    setForwardTo('')
    setEditorEmpty(true)
    setIsDragOver(false)
    if (editorRef.current) editorRef.current.innerHTML = ''
  }, [])

  // Send
  const handleSend = useCallback(() => {
    const content = editorRef.current?.innerText?.trim()
    if (!content && attachments.length === 0) return
    if (replyMode === 'forward') {
      onForward?.(email!)
    } else {
      onReply?.(email!)
    }
    closeReply()
  }, [email, replyMode, attachments, onReply, onForward, closeReply])

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="w-10 h-10 opacity-30" />
        </div>
        <p className="text-lg font-medium">Selecteer een email</p>
        <p className="text-sm mt-1 text-center max-w-xs">Kies een bericht uit de lijst om de inhoud te bekijken.</p>
      </div>
    )
  }

  const senderName = extractSenderName(email.van)
  const senderInitials = getInitials(senderName)
  const visibleLabels = email.labels.filter((l) => l !== 'verzonden' && l !== 'prullenbak' && l !== 'gepland')

  const toggleMessage = (index: number) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const replyModeLabels = {
    reply: { icon: Reply, label: `Beantwoorden aan ${senderName}` },
    'reply-all': { icon: ReplyAll, label: 'Allen beantwoorden' },
    forward: { icon: Forward, label: 'Doorsturen' },
  }
  const currentMode = replyModeLabels[replyMode]
  const ModeIcon = currentMode.icon

  return (
    <div className="flex flex-col h-full">
      {/* ── Top Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </button>
          )}
          {onBack && <Separator orientation="vertical" className="h-5 mx-1" />}
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => onArchive?.(email)}>
            <Archive className="w-3.5 h-3.5" />
            Archief
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => onDelete?.(email)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Verwijderen
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => onToggleRead?.(email)}>
            {email.gelezen ? (
              <><MailOpen className="w-3.5 h-3.5" /> Markeer als ongelezen</>
            ) : (
              <><Mail className="w-3.5 h-3.5" /> Markeer als gelezen</>
            )}
          </Button>
        </div>
      </div>

      {/* ── Subject Header ── */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground leading-tight">{email.onderwerp}</h2>
            <div className="flex items-center gap-2 mt-2">
              {visibleLabels.map((label) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className={`text-xs uppercase tracking-wider font-semibold px-2 py-0.5 ${getLabelColor(label)}`}
                >
                  {label}
                </Badge>
              ))}
              <button className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                <Tag className="w-3 h-3" />
                Label toevoegen
              </button>
            </div>
          </div>
          <button
            onClick={() => onToggleStar?.(email)}
            className="mt-1 flex-shrink-0"
            title={email.starred ? 'Ster verwijderen' : 'Ster toevoegen'}
          >
            {email.starred ? (
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            ) : (
              <Star className="w-5 h-5 text-gray-300 hover:text-yellow-400 transition-colors" />
            )}
          </button>
        </div>
        {email.scheduled_at && email.map === 'gepland' && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-purple-700 dark:text-purple-300">
              Ingepland voor verzending op <strong>{formatDateTime(email.scheduled_at)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Thread / Conversation View ── */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {[email].map((msg, index) => {
            const msgSenderName = extractSenderName(msg.van)
            const msgSenderInitials = getInitials(msgSenderName)
            const isExpanded = expandedMessages.has(index)

            return (
              <div key={msg.id + '-' + index} className="group">
                <div
                  className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleMessage(index)}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${getAvatarColor(msgSenderName)}`}>
                    {msgSenderInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{msgSenderName}</span>
                      <span className="text-xs text-muted-foreground">
                        &lt;{extractSenderEmail(msg.van)}&gt;
                      </span>
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {msg.inhoud.split('\n')[0].substring(0, 100)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{formatDateTime(msg.datum)}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-4">
                    <div className="ml-12 mb-4 text-xs text-muted-foreground">Aan: {msg.aan}</div>
                    <div className="ml-12 prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{msg.inhoud}</div>
                    </div>
                    {msg.bijlagen > 0 && (
                      <div className="ml-12 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {msg.bijlagen} bijlage{msg.bijlagen > 1 ? 'n' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: msg.bijlagen }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors">
                              <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">PDF</div>
                              <div>
                                <span className="text-xs font-medium">Bijlage {i + 1}</span>
                                <p className="text-[10px] text-muted-foreground">PDF document</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="ml-12 mt-4 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); openReply('reply') }}
                      >
                        <Reply className="w-3.5 h-3.5" />
                        Beantwoorden
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); openReply('reply-all') }}
                      >
                        <ReplyAll className="w-3.5 h-3.5" />
                        Allen beantwoorden
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); openReply('forward') }}
                      >
                        <Forward className="w-3.5 h-3.5" />
                        Doorsturen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* ── Reply Editor ── */}
      <div className="border-t flex-shrink-0">
        {!replyOpen ? (
          <div className="p-4">
            <button
              onClick={() => openReply('reply')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-sm text-muted-foreground"
            >
              <Reply className="w-4 h-4" />
              Klik hier om te antwoorden...
            </button>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-lg mx-3 mb-3 mt-2 border overflow-hidden transition-colors',
              isDragOver ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20' : 'border-border'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Reply header: mode selector */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
              <div className="relative" ref={replyModeRef}>
                <button
                  onClick={() => setShowReplyModeDropdown(!showReplyModeDropdown)}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-blue-600 transition-colors"
                >
                  <ModeIcon className="w-4 h-4" />
                  {currentMode.label}
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                {showReplyModeDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg z-50">
                    <button
                      onClick={() => { setReplyMode('reply'); setShowReplyModeDropdown(false) }}
                      className={cn('w-full text-left px-3 py-2 text-sm rounded hover:bg-accent flex items-center gap-2', replyMode === 'reply' && 'bg-accent')}
                    >
                      <Reply className="w-4 h-4" /> Beantwoorden
                    </button>
                    <button
                      onClick={() => { setReplyMode('reply-all'); setShowReplyModeDropdown(false) }}
                      className={cn('w-full text-left px-3 py-2 text-sm rounded hover:bg-accent flex items-center gap-2', replyMode === 'reply-all' && 'bg-accent')}
                    >
                      <ReplyAll className="w-4 h-4" /> Allen beantwoorden
                    </button>
                    <button
                      onClick={() => { openReply('forward'); setShowReplyModeDropdown(false) }}
                      className={cn('w-full text-left px-3 py-2 text-sm rounded hover:bg-accent flex items-center gap-2', replyMode === 'forward' && 'bg-accent')}
                    >
                      <Forward className="w-4 h-4" /> Doorsturen
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Forward: Aan field */}
            {replyMode === 'forward' && (
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20">
                <Label className="text-xs font-medium text-muted-foreground w-8">Aan:</Label>
                <Input
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  placeholder="email@voorbeeld.nl"
                  className="h-7 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
                />
              </div>
            )}

            {/* Toolbar: Template + Merge fields */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/20">
              <div className="relative" ref={templateRef}>
                <button
                  onClick={() => { setShowTemplates(!showTemplates); setShowMergeFields(false) }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded hover:bg-accent transition-colors',
                    showTemplates && 'bg-accent'
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Template kiezen
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showTemplates && (
                  <div className="absolute left-0 top-full mt-1 w-64 rounded-md border bg-popover p-1 shadow-lg z-50">
                    {replyTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t.content)}
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Separator orientation="vertical" className="h-4 mx-0.5" />

              <div className="relative" ref={mergeFieldRef}>
                <button
                  onClick={() => { setShowMergeFields(!showMergeFields); setShowTemplates(false) }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded hover:bg-accent transition-colors',
                    showMergeFields && 'bg-accent'
                  )}
                >
                  <Type className="w-3.5 h-3.5" />
                  Veld invoegen
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showMergeFields && (
                  <div className="absolute left-0 top-full mt-1 w-52 rounded-md border bg-popover p-1 shadow-lg z-50">
                    {mergeFields.map(f => (
                      <button
                        key={f.id}
                        onClick={() => insertMergeField(f.value)}
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors flex items-center justify-between"
                      >
                        <span>{f.label}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{f.value}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ContentEditable editor - FULL WIDTH, NO SIDE GAPS */}
            <div className="relative">
              {editorEmpty && (
                <div className="absolute top-3 left-4 text-sm text-muted-foreground pointer-events-none select-none">
                  Schrijf je antwoord...
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                onMouseUp={updateFormatState}
                onKeyUp={updateFormatState}
                className="min-h-[160px] max-h-[360px] overflow-y-auto px-4 py-3 text-sm leading-relaxed focus:outline-none"
                suppressContentEditableWarning
              />
            </div>

            {/* Drag & Drop overlay */}
            {isDragOver && (
              <div className="px-4 py-3 text-center text-sm text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 border-t border-blue-200">
                Sleep bestanden hier om toe te voegen
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="px-3 py-2 border-t bg-muted/10">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-muted rounded-md text-xs group/file">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 ${getFileTypeColor(file.name)}`}>
                        {getFileExt(file.name)}
                      </div>
                      <span className="font-medium max-w-[120px] truncate">{file.name}</span>
                      <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        title="Verwijderen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formatting toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1 border-t bg-muted/30 flex-wrap">
              <button onClick={() => execFormat('undo')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Ongedaan maken">
                <Undo2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => execFormat('redo')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Opnieuw">
                <Redo2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <button
                onClick={() => execFormat('bold')}
                className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.bold && 'bg-accent text-foreground')}
                title="Vet (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => execFormat('italic')}
                className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.italic && 'bg-accent text-foreground')}
                title="Cursief (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => execFormat('underline')}
                className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.underline && 'bg-accent text-foreground')}
                title="Onderstrepen (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => execFormat('strikeThrough')}
                className={cn('p-1.5 rounded hover:bg-accent transition-colors', activeFormats.strikethrough && 'bg-accent text-foreground')}
                title="Doorhalen"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <button onClick={() => execFormat('insertUnorderedList')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Opsommingslijst">
                <List className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => execFormat('insertOrderedList')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Genummerde lijst">
                <ListOrdered className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <button onClick={() => execFormat('justifyLeft')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Links uitlijnen">
                <AlignLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => execFormat('justifyCenter')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Centreren">
                <AlignCenter className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => execFormat('justifyRight')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Rechts uitlijnen">
                <AlignRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <button onClick={() => execFormat('formatBlock', 'blockquote')} className="p-1.5 rounded hover:bg-accent transition-colors" title="Citaat">
                <Quote className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={insertLink} className="p-1.5 rounded hover:bg-accent transition-colors" title="Link invoegen">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/10">
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.svg,.zip,.rar,.txt,.csv"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Bijlage
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs" onClick={closeReply}>
                  Annuleren
                </Button>

                {/* Schedule + Send split button */}
                <div className="relative" ref={scheduleRef}>
                  <div className="flex">
                    <Button
                      size="sm"
                      className="gap-1.5 rounded-r-none"
                      onClick={handleSend}
                      disabled={editorEmpty && attachments.length === 0}
                    >
                      {scheduledAt ? (
                        <><Clock className="w-3.5 h-3.5" /> Inplannen</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Verstuur</>
                      )}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="rounded-l-none border-l border-l-primary-foreground/20 px-1.5"
                      onClick={() => setShowSchedule(!showSchedule)}
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {showSchedule && (
                    <div className="absolute right-0 bottom-full mb-2 w-72 rounded-md border bg-popover p-2 shadow-lg z-50">
                      <div className="space-y-1">
                        <button
                          type="button"
                          className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'now' && 'bg-accent font-medium')}
                          onClick={() => handleScheduleSelect('now')}
                        >
                          <div className="flex items-center gap-2"><Send className="w-4 h-4" /> Nu verzenden</div>
                        </button>
                        <button
                          type="button"
                          className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'tomorrow-9' && 'bg-accent font-medium')}
                          onClick={() => handleScheduleSelect('tomorrow-9')}
                        >
                          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Morgen 09:00</div>
                        </button>
                        <button
                          type="button"
                          className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'tomorrow-14' && 'bg-accent font-medium')}
                          onClick={() => handleScheduleSelect('tomorrow-14')}
                        >
                          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Morgen 14:00</div>
                        </button>
                        <button
                          type="button"
                          className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'next-monday' && 'bg-accent font-medium')}
                          onClick={() => handleScheduleSelect('next-monday')}
                        >
                          <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Volgende maandag 09:00</div>
                        </button>

                        <div className="border-t my-1" />

                        <button
                          type="button"
                          className={cn('w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent', scheduleOption === 'custom' && 'bg-accent font-medium')}
                          onClick={() => handleScheduleSelect('custom')}
                        >
                          <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Aangepaste datum/tijd</div>
                        </button>

                        {scheduleOption === 'custom' && (
                          <div className="px-3 py-2 space-y-2">
                            <div>
                              <Label className="text-xs">Datum</Label>
                              <Input
                                type="date"
                                value={customDate}
                                onChange={(e) => {
                                  setCustomDate(e.target.value)
                                  if (e.target.value && customTime) setScheduledAt(`${e.target.value}T${customTime}`)
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Tijd</Label>
                              <Input
                                type="time"
                                value={customTime}
                                onChange={(e) => {
                                  setCustomTime(e.target.value)
                                  if (customDate && e.target.value) setScheduledAt(`${customDate}T${e.target.value}`)
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scheduled indicator */}
            {scheduledAt && (
              <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
                  <Clock className="w-3.5 h-3.5" />
                  Ingepland: <strong>{formatDateTime(scheduledAt)}</strong>
                </div>
                <button
                  onClick={() => { setScheduledAt(''); setScheduleOption('now') }}
                  className="text-xs text-purple-600 hover:text-purple-800 dark:hover:text-purple-200 font-medium"
                >
                  Annuleren
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
