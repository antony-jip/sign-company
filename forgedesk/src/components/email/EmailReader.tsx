import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { sanitizeEmailHTML } from '@/lib/sanitize'
import { Button } from '@/components/ui/button'
import { AIContentEditableToolbar } from '@/components/ui/AIContentEditableToolbar'
import {
  ArrowLeft, Trash2, Pin, Archive, MailOpen,
  ChevronUp, ChevronDown, Reply, ReplyAll, Forward,
  Paperclip, Send, Bold, Italic, Underline,
  List, ListOrdered, Link2, Sparkles, Loader2, Download,
  Undo2, Redo2, X, Clock, Tag,
} from 'lucide-react'
import { EmailActionsPopover } from './EmailActionsPopover'
import { cn } from '@/lib/utils'
import type { Email, EmailAttachment } from '@/types'
import { extractSenderName, extractSenderEmail, formatShortDate, getAvatarColor, getAvatarRingColor, getAvatarStyle, SNOOZE_OPTIONS, labelColors } from './emailHelpers'
import { hapticLight, hapticMedium } from '@/utils/haptic'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { callForgie } from '@/services/forgieService'
import { downloadEmailAttachment, downloadAllEmailAttachments } from '@/services/gmailService'
import { uploadEmailBijlage } from '@/services/storageService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { EmailReaderAIToolbar } from './EmailReaderAIToolbar'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmailList(value: string): boolean {
  if (!value.trim()) return false
  return value.split(/[,;\s]+/).filter(Boolean).every(e => EMAIL_REGEX.test(e.trim()))
}

// Format file size human-readable
function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageAttachment(filename: string, contentType?: string): boolean {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  return (
    (contentType || '').toLowerCase().startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'].includes(ext)
  )
}

// Bepaal label + kleur voor een bijlage op basis van content type / extensie
function getAttachmentVisual(filename: string, contentType?: string): { label: string; bg: string } {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  const ct = (contentType || '').toLowerCase()
  if (ct.includes('pdf') || ext === 'pdf') return { label: 'PDF', bg: 'bg-red-500/90' }
  if (ct.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'].includes(ext))
    return { label: 'IMG', bg: 'bg-violet-500/90' }
  if (ct.includes('word') || ['doc', 'docx'].includes(ext)) return { label: 'DOC', bg: 'bg-blue-500/90' }
  if (ct.includes('sheet') || ct.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext))
    return { label: 'XLS', bg: 'bg-emerald-500/90' }
  if (ct.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return { label: 'PPT', bg: 'bg-orange-500/90' }
  if (ct.includes('zip') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { label: 'ZIP', bg: 'bg-amber-600/90' }
  if (ct.includes('text') || ['txt', 'md', 'log'].includes(ext)) return { label: 'TXT', bg: 'bg-slate-500/90' }
  return { label: ext.toUpperCase().slice(0, 3) || 'FILE', bg: 'bg-slate-500/90' }
}

interface EmailReaderProps {
  email: Email | null
  threadEmails?: Email[]
  isLoadingBody?: boolean
  emailIndex?: number
  emailTotal?: number
  allEmails?: Email[]
  imapFolder?: string
  // Optionele inline image-bytes (base64) per filename, vooraf opgehaald
  // door /api/read-email. Wanneer aanwezig slaat de reader de tweede
  // IMAP-roundtrip over voor thumbnails.
  prefetchedAttachmentBytes?: Record<string, string>
  // Optionele signed Storage URLs per filename, uit de persistent
  // attachment-cache (sprint 3). Snelste pad: direct als img src,
  // geen decode-stap nodig.
  prefetchedAttachmentUrls?: Record<string, string>
  onTogglePin?: (email: Email) => void
  onSnooze?: (email: Email, hours: number) => void
  onUnsnooze?: (email: Email) => void
  onToggleLabel?: (email: Email, label: string) => void
  onToggleRead?: (email: Email) => void
  onDelete?: (email: Email) => void
  onArchive?: (email: Email) => void
  onBack?: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  onSendReply?: (data: { to: string; cc?: string; bcc?: string; subject: string; body: string; html?: string; scheduledAt?: string; attachments?: Array<{ filename: string; storagePath?: string; content?: string; encoding?: 'base64'; size?: number }> }) => void
  onSelectEmail?: (email: Email) => void
  onOpenContextPanel?: (panel: 'klant' | 'project' | 'taak' | 'koppel') => void
}

export function EmailReader({
  email,
  threadEmails,
  isLoadingBody,
  emailIndex,
  emailTotal,
  allEmails,
  imapFolder = 'INBOX',
  prefetchedAttachmentBytes,
  prefetchedAttachmentUrls,
  onTogglePin,
  onSnooze,
  onUnsnooze,
  onToggleLabel,
  onToggleRead,
  onDelete,
  onArchive,
  onBack,
  onNavigate,
  onSendReply,
  onSelectEmail,
  onOpenContextPanel,
}: EmailReaderProps) {
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, bedrijfsnaam } = useAppSettings()

  const [replyMode, setReplyMode] = useState<'reply' | 'reply-all' | 'forward' | null>(null)
  const [replyTo, setReplyTo] = useState('')
  const [replyCc, setReplyCc] = useState('')
  const [replyBcc, setReplyBcc] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [showQuotedText, setShowQuotedText] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [forgieLoading, setForgieLoading] = useState(false)
  const [replyAttachments, setReplyAttachments] = useState<File[]>([])

  // Blob-URLs voor image-thumbnails op user-uploaded reply-bijlagen
  const replyImagePreviewUrls = useMemo(() => {
    const map = new Map<File, string>()
    replyAttachments.forEach((file) => {
      if (file.type.startsWith('image/')) {
        map.set(file, URL.createObjectURL(file))
      }
    })
    return map
  }, [replyAttachments])
  useEffect(() => {
    return () => {
      replyImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [replyImagePreviewUrls])
  // Originele bijlagen die meegestuurd worden bij forward (los van user uploads)
  const [forwardOriginalAttachments, setForwardOriginalAttachments] = useState<EmailAttachment[]>([])
  // Schedule send menu state
  const [showScheduleMenu, setShowScheduleMenu] = useState(false)
  const [showCustomSchedule, setShowCustomSchedule] = useState(false)
  const [customScheduleDate, setCustomScheduleDate] = useState('')
  const [customScheduleTime, setCustomScheduleTime] = useState('09:00')
  const editorRef = useRef<HTMLDivElement>(null)
  const emailBodyRef = useRef<HTMLDivElement>(null)
  const replyFileInputRef = useRef<HTMLInputElement>(null)

  // Summary state
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(true)

  // Build signature HTML
  const signatureHtml = useMemo(() => {
    const imgHeight = handtekeningAfbeeldingGrootte ?? 64
    const imgMaxWidth = Math.round(imgHeight * 2.5)
    const parts: string[] = []
    if (emailHandtekening) {
      parts.push(emailHandtekening.replace(/\n/g, '<br>'))
    }
    if (handtekeningAfbeelding) {
      parts.push(`<img src="${handtekeningAfbeelding}" alt="Logo" style="max-height:${imgHeight}px;max-width:${imgMaxWidth}px;object-fit:contain;" />`)
    }
    if (!parts.length && bedrijfsnaam) {
      parts.push(bedrijfsnaam)
    }
    return parts.length ? `<br><br>--<br>${parts.join('<br>')}` : ''
  }, [emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, bedrijfsnaam])

  // Track per-attachment download state (alleen visueel — losse spinner per bijlage)
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false)
  const snoozeMenuRef = useRef<HTMLDivElement | null>(null)
  const [labelMenuOpen, setLabelMenuOpen] = useState(false)
  const labelMenuRef = useRef<HTMLDivElement | null>(null)
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)

  // Sluit het snooze-menu bij klik buiten het popover-bereik
  useEffect(() => {
    if (!snoozeMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!snoozeMenuRef.current?.contains(e.target as Node)) setSnoozeMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [snoozeMenuOpen])

  // Sluit het label-menu bij klik buiten het popover-bereik
  useEffect(() => {
    if (!labelMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!labelMenuRef.current?.contains(e.target as Node)) setLabelMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [labelMenuOpen])

  // Sluit het acties-menu bij klik buiten het popover-bereik
  useEffect(() => {
    if (!actionsMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(e.target as Node)) setActionsMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [actionsMenuOpen])
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [previewAtt, setPreviewAtt] = useState<{ filename: string; url: string; contentType: string } | null>(null)
  // Cache van blob-URLs voor image-thumbnails per filename. Wordt gevuld bij open van email
  // voor alle image-bijlagen, en wordt gerevoked bij email-switch / unmount.
  const [attachmentThumbnails, setAttachmentThumbnails] = useState<Record<string, string>>({})
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false)

  // ─── Auto-fetch image-thumbnails voor ontvangen bijlagen ───
  // Snelste pad: prefetchedAttachmentBytes uit /api/read-email (server stuurde
  // image-bytes < 5 MB al inline mee). Anders: bulk-call naar
  // /api/email-attachment met all=true die de hele mail één keer parsed.
  useEffect(() => {
    if (!email?.attachment_meta?.length) {
      setAttachmentThumbnails({})
      setThumbnailsLoading(false)
      return
    }
    const imageAtts = email.attachment_meta.filter((a) => isImageAttachment(a.filename, a.contentType))
    if (!imageAtts.length) {
      setAttachmentThumbnails({})
      setThumbnailsLoading(false)
      return
    }

    let cancelled = false
    const createdUrls: string[] = []

    const decodeToBlobUrl = (base64: string, contentType: string): string | null => {
      try {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: contentType || 'image/jpeg' })
        return URL.createObjectURL(blob)
      } catch {
        return null
      }
    }

    // Pad 0: signed Storage URLs uit de persistent cache (sprint 3). Snelst
    // van allemaal — direct als <img src>, geen decode-stap. URL.revokeObjectURL
    // is een no-op voor https-URLs dus we hoeven hier niets te cleanen.
    const initial: Record<string, string> = {}
    if (prefetchedAttachmentUrls) {
      for (const att of imageAtts) {
        const url = prefetchedAttachmentUrls[att.filename]
        if (url) initial[att.filename] = url
      }
    }

    // Pad A: bytes zijn al binnen via read-email. Decoderen is sync en snel —
    // toon thumbnails direct, zonder roundtrip B.
    if (prefetchedAttachmentBytes && Object.keys(prefetchedAttachmentBytes).length > 0) {
      for (const att of imageAtts) {
        if (initial[att.filename]) continue
        const b64 = prefetchedAttachmentBytes[att.filename]
        if (!b64) continue
        const url = decodeToBlobUrl(b64, att.contentType)
        if (url) {
          createdUrls.push(url)
          initial[att.filename] = url
        }
      }
    }

    if (Object.keys(initial).length > 0) {
      setAttachmentThumbnails(initial)
      setThumbnailsLoading(false)
      // Als pad 0 + A samen alle images dekken: klaar. Anders verder naar
      // bulk-fetch B voor het verschil.
      if (Object.keys(initial).length === imageAtts.length) {
        return () => {
          cancelled = true
          createdUrls.forEach((url) => URL.revokeObjectURL(url))
          setAttachmentThumbnails({})
        }
      }
    }

    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      setThumbnailsLoading(false)
      return () => {
        cancelled = true
        createdUrls.forEach((url) => URL.revokeObjectURL(url))
        setAttachmentThumbnails({})
      }
    }

    // Pad B: bulk-fetch fallback voor wanneer prefetch niet beschikbaar is
    // (cached body, of images > 5 MB die de server niet inline meestuurt).
    setThumbnailsLoading(true)
    const fetchThumbs = async () => {
      try {
        const results = await downloadAllEmailAttachments(uid, imapFolder)
        if (cancelled) return
        const next: Record<string, string> = { ...initial }
        for (const result of results) {
          if (!isImageAttachment(result.filename, result.contentType)) continue
          if (next[result.filename]) continue
          if (result.storage_url) {
            next[result.filename] = result.storage_url
          } else if (result.content) {
            const url = decodeToBlobUrl(result.content, result.contentType || 'image/jpeg')
            if (url) {
              createdUrls.push(url)
              next[result.filename] = url
            }
          }
        }
        if (!cancelled) setAttachmentThumbnails(next)
      } catch (err) {
        logger.warn('Bulk-thumbnail fetch mislukt:', err)
      } finally {
        if (!cancelled) setThumbnailsLoading(false)
      }
    }
    fetchThumbs()

    return () => {
      cancelled = true
      createdUrls.forEach((url) => URL.revokeObjectURL(url))
      setAttachmentThumbnails({})
      setThumbnailsLoading(false)
    }
    // attachmentThumbnails opzettelijk weggelaten — de effect lifecycle hoort
    // aan de email/meta gekoppeld te zijn, niet aan tussentijdse updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email?.id, email?.attachment_meta?.length, imapFolder, prefetchedAttachmentBytes, prefetchedAttachmentUrls])

  // ─── Draft persistence ───
  const draftKey = email ? `email-draft-${email.id}` : null

  const saveDraft = useCallback(() => {
    if (!draftKey || !editorRef.current || !replyMode) return
    const content = editorRef.current.innerHTML
    if (!content || content === `<br>${signatureHtml}` || content === '<br>') return
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        mode: replyMode,
        to: replyTo,
        cc: replyCc,
        bcc: replyBcc,
        subject: replySubject,
        html: content,
      }))
    } catch { /* sessionStorage vol — negeer */ }
  }, [draftKey, replyMode, replyTo, replyCc, replyBcc, replySubject, signatureHtml])

  const clearDraft = useCallback(() => {
    if (draftKey) sessionStorage.removeItem(draftKey)
  }, [draftKey])

  const loadDraft = useCallback((emailId: string): { mode: 'reply' | 'reply-all' | 'forward'; to: string; cc: string; bcc: string; subject: string; html: string } | null => {
    try {
      const raw = sessionStorage.getItem(`email-draft-${emailId}`)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }, [])

  // Sla draft op wanneer de gebruiker wegnavigeet (replyMode sluit)
  const prevReplyModeRef = useRef(replyMode)
  useEffect(() => {
    if (prevReplyModeRef.current && !replyMode) {
      saveDraft()
    }
    prevReplyModeRef.current = replyMode
  }, [replyMode, saveDraft])

  // Reset reply state and summary when email changes
  useEffect(() => {
    // Sla eventueel lopend concept op voordat we wisselen
    if (prevReplyModeRef.current && editorRef.current) {
      saveDraft()
    }
    setReplyMode(null)
    setShowQuotedText(false)
    setSummary(null)
    setSummaryLoading(false)
    setSummaryExpanded(true)
    setSnoozeMenuOpen(false)
    setLabelMenuOpen(false)
    setPreviewAtt((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [email?.id])

  const handleDownloadAttachment = useCallback(async (filename: string) => {
    if (!email) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlage niet ophalen — geen geldig email-id')
      return
    }
    setDownloadingAttachment(filename)
    try {
      const result = await downloadEmailAttachment(uid, imapFolder, filename)
      const a = document.createElement('a')
      a.download = result.filename || filename
      if (result.storage_url) {
        // Cache-hit: signed URL direct gebruiken, geen base64-decode
        a.href = result.storage_url
      } else if (result.content) {
        const binary = atob(result.content)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: result.contentType || 'application/octet-stream' })
        a.href = URL.createObjectURL(blob)
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      } else {
        throw new Error('Geen content of storage_url ontvangen')
      }
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      logger.error('Bijlage downloaden mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Bijlage downloaden mislukt')
    } finally {
      setDownloadingAttachment(null)
    }
  }, [email, imapFolder])

  const handlePreviewAttachment = useCallback(async (att: EmailAttachment) => {
    if (!email) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlage niet ophalen — geen geldig email-id')
      return
    }
    setPreviewLoading(att.filename)
    try {
      const result = await downloadEmailAttachment(uid, imapFolder, att.filename)
      const contentType = result.contentType || att.contentType || 'application/octet-stream'
      let url: string
      if (result.storage_url) {
        url = result.storage_url
      } else if (result.content) {
        const binary = atob(result.content)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: contentType })
        url = URL.createObjectURL(blob)
      } else {
        throw new Error('Geen content of storage_url ontvangen')
      }
      setPreviewAtt((prev) => {
        if (prev && prev.url.startsWith('blob:')) URL.revokeObjectURL(prev.url)
        return { filename: result.filename || att.filename, url, contentType }
      })
    } catch (err) {
      logger.error('Preview ophalen mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Preview ophalen mislukt')
    } finally {
      setPreviewLoading(null)
    }
  }, [email, imapFolder])

  const closePreview = useCallback(() => {
    setPreviewAtt((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [])

  const handleDownloadAllAttachments = useCallback(async () => {
    if (!email?.attachment_meta?.length) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlagen niet ophalen — geen geldig email-id')
      return
    }
    setDownloadingAll(true)
    let success = 0
    try {
      const results = await downloadAllEmailAttachments(uid, imapFolder)
      const expected = email.attachment_meta.length
      for (const result of results) {
        try {
          const binary = atob(result.content)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          const blob = new Blob([bytes], { type: result.contentType || 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = result.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          success++
          // Korte pauze zodat de browser elke download apart kan verwerken
          await new Promise((r) => setTimeout(r, 200))
        } catch (err) {
          logger.error(`Download-decode mislukt voor ${result.filename}:`, err)
        }
      }
      if (success === expected) {
        toast.success(`${success} bijlage${success > 1 ? 'n' : ''} gedownload`)
      } else {
        toast.warning(`${success}/${expected} bijlagen gedownload`)
      }
    } catch (err) {
      logger.error('Bulk-download mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Bijlagen downloaden mislukt')
    } finally {
      setDownloadingAll(false)
    }
  }, [email, imapFolder])

  // ESC sluit preview
  useEffect(() => {
    if (!previewAtt) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewAtt, closePreview])

  // Cleanup preview URL bij unmount
  useEffect(() => {
    return () => {
      setPreviewAtt((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return null
      })
    }
  }, [])

  const handleSummarize = useCallback(async () => {
    if (!email || summaryLoading) return
    setSummaryLoading(true)
    setSummaryExpanded(true)
    try {
      const text = email.inhoud?.replace(/<[^>]*>/g, '').slice(0, 2000) || ''
      const response = await callForgie('summarize', text)
      if (response?.result) setSummary(response.result)
    } catch (err) {
      logger.error('Fout bij samenvatten email:', err)
      toast.error('Daan kon dit niet verwerken. Probeer het opnieuw.')
    } finally {
      setSummaryLoading(false)
    }
  }, [email, summaryLoading])

  const handleReply = useCallback((mode: 'reply' | 'reply-all' | 'forward') => {
    if (!email) return

    // Check of er een opgeslagen concept is voor deze email
    const draft = loadDraft(email.id)
    const hasDraft = draft && draft.mode === mode

    setReplyMode(mode)
    setReplyAttachments([])
    setShowCcBcc(false)

    if (hasDraft) {
      setReplyTo(draft.to)
      setReplyCc(draft.cc)
      setReplyBcc(draft.bcc)
      setReplySubject(draft.subject)
      if (draft.cc || draft.bcc) setShowCcBcc(true)
    } else {
      setReplyCc('')
      setReplyBcc('')
      const subjectPrefix = mode === 'forward' ? 'Fwd: ' : 'Re: '
      setReplySubject(email.onderwerp.startsWith(subjectPrefix) ? email.onderwerp : `${subjectPrefix}${email.onderwerp}`)
      if (mode === 'forward') {
        setReplyTo('')
      } else {
        setReplyTo(extractSenderEmail(email.van))
      }
    }

    if (mode === 'forward' && email.attachment_meta && email.attachment_meta.length > 0) {
      setForwardOriginalAttachments(email.attachment_meta)
    } else {
      setForwardOriginalAttachments([])
    }

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = hasDraft ? draft.html : `<br>${signatureHtml}`
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editorRef.current, 0)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
        editorRef.current.focus()
      }
      if (hasDraft) toast.info('Concept hersteld')
    }, 50)
  }, [email, signatureHtml, loadDraft])

  const buildReplyPayload = useCallback(async () => {
    if (!email || !editorRef.current) return null
    if (!replyTo.trim()) {
      toast.error('Vul een ontvanger in')
      return null
    }
    if (!isValidEmailList(replyTo)) {
      toast.error('Ongeldig emailadres in "Aan"')
      return null
    }
    if (replyCc && !isValidEmailList(replyCc)) {
      toast.error('Ongeldig emailadres in "CC"')
      return null
    }
    if (replyBcc && !isValidEmailList(replyBcc)) {
      toast.error('Ongeldig emailadres in "BCC"')
      return null
    }
    const html = editorRef.current.innerHTML
    if (!html.replace(/<[^>]*>/g, '').trim()) {
      toast.error('Bericht is leeg')
      return null
    }
    const subject = replySubject || email.onderwerp
    // Strip base64 data URIs uit de geciteerde tekst zodat de JSON payload
    // binnen Vercel's 4.5MB limiet blijft. Inline images in het origineel
    // zijn niet nodig in het antwoord — de ontvanger heeft het origineel al.
    const inhoudZonderInlineImages = (email.inhoud || '').replace(
      /<img([^>]*)src="data:image\/[^"]*"([^>]*)>/gi,
      '<img$1src=""$2 alt="[afbeelding]" style="display:none">'
    )
    const quotedOriginal = `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:0;color:#666;"><p>Op ${formatShortDate(email.datum)} schreef ${extractSenderName(email.van)}:</p>${inhoudZonderInlineImages}</div>`

    // Forward: haal originele bijlagen op uit IMAP (base64)
    let originalAttachments: Array<{ filename: string; content: string; encoding: 'base64' }> = []
    if (replyMode === 'forward' && forwardOriginalAttachments.length > 0) {
      const uid = Number(email.gmail_id || email.id)
      if (!Number.isNaN(uid)) {
        toast.info(`Originele bijlage${forwardOriginalAttachments.length > 1 ? 'n' : ''} ophalen...`)
        try {
          const fetched = await Promise.all(
            forwardOriginalAttachments.map((att) =>
              downloadEmailAttachment(uid, imapFolder, att.filename).catch((e) => {
                logger.warn(`Bijlage "${att.filename}" ophalen mislukt:`, e)
                return null
              })
            )
          )
          originalAttachments = fetched
            .filter((r): r is NonNullable<typeof r> => r !== null && !!r.content)
            .map((r) => ({
              filename: r.filename,
              content: r.content,
              encoding: 'base64' as const,
            }))
          if (originalAttachments.length < forwardOriginalAttachments.length) {
            toast.warning(`${forwardOriginalAttachments.length - originalAttachments.length} bijlage(n) konden niet worden opgehaald`)
          }
        } catch (err) {
          logger.warn('Originele bijlagen ophalen mislukt:', err)
          toast.warning('Originele bijlagen niet ingesloten — verzend zonder')
        }
      }
    }

    // User uploads: via Supabase Storage
    let userAttachments: Array<{ filename: string; storagePath: string; size: number }> = []
    if (replyAttachments.length) {
      const totalSize = replyAttachments.reduce((s, f) => s + f.size, 0)
      if (totalSize > 18 * 1024 * 1024) {
        toast.error('Bijlagen zijn te groot (max 18MB).', { duration: 8000 })
        return null
      }
      try {
        userAttachments = await Promise.all(
          replyAttachments.map(file => uploadEmailBijlage(file))
        )
      } catch (err) {
        logger.error('Bijlage upload mislukt:', err)
        toast.error(err instanceof Error ? err.message : 'Bijlage uploaden mislukt')
        return null
      }
    }

    const attachmentPayload: Array<{ filename: string; storagePath?: string; content?: string; encoding?: 'base64'; size?: number }> = [
      ...originalAttachments,
      ...userAttachments,
    ]

    return {
      to: replyTo,
      cc: replyCc || undefined,
      bcc: replyBcc || undefined,
      subject,
      body: editorRef.current.innerText,
      html: html + quotedOriginal,
      attachments: attachmentPayload.length > 0 ? attachmentPayload : undefined,
    }
  }, [email, replyMode, replySubject, replyTo, replyCc, replyBcc, replyAttachments, forwardOriginalAttachments, imapFolder])

  const handleSend = useCallback(async () => {
    if (!onSendReply) return
    setIsSending(true)
    try {
      const payload = await buildReplyPayload()
      if (!payload) return
      await onSendReply(payload)
      clearDraft()
      setReplyMode(null)
      setReplyAttachments([])
      setForwardOriginalAttachments([])
      toast.success('Email verzonden')
    } catch (err) {
      logger.error('Fout bij verzenden email:', err)
      toast.error('Verzenden mislukt')
    } finally {
      setIsSending(false)
    }
  }, [onSendReply, buildReplyPayload])

  const handleScheduleSend = useCallback(async (scheduledAt: string, label: string) => {
    if (!onSendReply) return
    setIsSending(true)
    setShowScheduleMenu(false)
    try {
      const payload = await buildReplyPayload()
      if (!payload) return
      await onSendReply({ ...payload, scheduledAt })
      clearDraft()
      setReplyMode(null)
      setReplyAttachments([])
      setForwardOriginalAttachments([])
      toast.success(`Email ingepland: ${label}`)
    } catch (err) {
      logger.error('Email schedule failed:', err)
      toast.error('Inplannen mislukt')
    } finally {
      setIsSending(false)
    }
  }, [onSendReply, buildReplyPayload])

  const handleForgieWrite = useCallback(async () => {
    if (!email || !editorRef.current) return
    setForgieLoading(true)
    try {
      const context = `Oorspronkelijk bericht van ${extractSenderName(email.van)}: ${email.onderwerp}\n\n${email.inhoud?.replace(/<[^>]*>/g, '').slice(0, 500)}`
      const response = await callForgie('generate-reply', context)
      if (response?.result && editorRef.current) {
        editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${signatureHtml}`
      }
    } catch (err) {
      logger.error('Fout bij genereren antwoord:', err)
      toast.error('Daan kon geen antwoord genereren')
    } finally {
      setForgieLoading(false)
    }
  }, [email, signatureHtml])

  // Generate reply from reader: opens reply mode first, then generates
  const handleGenerateReplyFromReader = useCallback(async () => {
    if (!email) return
    // First open reply mode
    handleReply('reply')
    // Wait for editor to mount, then generate
    setForgieLoading(true)
    try {
      const context = `Oorspronkelijk bericht van ${extractSenderName(email.van)}: ${email.onderwerp}\n\n${email.inhoud?.replace(/<[^>]*>/g, '').slice(0, 500)}`
      const response = await callForgie('generate-reply', context)
      if (response?.result) {
        // Editor should be mounted by now
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${signatureHtml}`
          }
        }, 100)
      }
    } catch (err) {
      logger.error('Fout bij genereren antwoord vanuit reader:', err)
      toast.error('Daan kon geen antwoord genereren')
    } finally {
      setForgieLoading(false)
    }
  }, [email, handleReply, signatureHtml])

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [])

  // Keyboard shortcuts for reader mode
  useEffect(() => {
    if (!email || replyMode) return
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+S → summarize
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        handleSummarize()
      }
      // Cmd+Shift+R → generate reply
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        handleGenerateReplyFromReader()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [email, replyMode, handleSummarize, handleGenerateReplyFromReader])

  // Memoize sender data — avoid recalculating on every render
  const senderName = useMemo(() => email ? extractSenderName(email.van) : '', [email?.van])
  const senderEmail = useMemo(() => email ? extractSenderEmail(email.van) : '', [email?.van])
  const avatarColor = useMemo(() => getAvatarColor(senderName), [senderName])
  const avatarRingColor = useMemo(() => getAvatarRingColor(senderName), [senderName])
  const avatarStyle = useMemo(() => getAvatarStyle(senderName), [senderName])

  const sanitizedBody = useMemo(() => {
    if (!email?.inhoud) return ''
    let processed = sanitizeEmailHTML(email.inhoud)
    const sigMarkers = ['Met vriendelijke groet', 'Kind regards', 'Best regards', 'Regards,', 'Groeten,', 'Mvg,', 'Met hartelijke groet']
    for (const marker of sigMarkers) {
      const idx = processed.indexOf(marker)
      if (idx > processed.length * 0.3) {
        processed = processed.slice(0, idx) + '<div class="email-sig-dim">' + processed.slice(idx) + '</div>'
        break
      }
    }
    if (!processed.includes('email-sig-dim')) {
      const dashIdx = processed.indexOf('<br>--<br>')
      if (dashIdx > processed.length * 0.3) {
        processed = processed.slice(0, dashIdx) + '<div class="email-sig-dim">' + processed.slice(dashIdx) + '</div>'
      }
    }
    return processed
  }, [email?.inhoud])

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground/80 h-full">
        <p className="text-[14px]">Selecteer een email om te lezen</p>
      </div>
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INLINE REPLY FORM — gerenderd boven de email body wanneer replyMode actief is.
  // Body blijft zichtbaar eronder; geen mode-switch meer (was: full-screen takeover).
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const inlineReplyForm = replyMode ? (
    <div className="bg-white">
          {/* ─── Compose fields (iOS-style: hairlines, ruime padding, duidelijke labels) ─── */}
          <div className="bg-white flex-shrink-0">
            {/* Aan field */}
            <div className="flex items-center px-5 md:px-7 py-3 border-b border-black/[0.06]">
              <span className="text-[13px] text-muted-foreground flex-shrink-0 mr-3 font-normal">Aan</span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[15px] text-foreground min-w-0 placeholder:text-muted-foreground/80"
                  placeholder="ontvanger@voorbeeld.nl"
                />
              </div>
              {!showCcBcc && (
                <button
                  onClick={() => setShowCcBcc(true)}
                  className="text-[13px] text-muted-foreground hover:text-foreground/70 ml-2 flex-shrink-0 transition-colors"
                >
                  Cc/Bcc
                </button>
              )}
              {/* Reply-mode segmented control — iOS-style pill */}
              <div className="hidden md:flex items-center ml-3 flex-shrink-0 bg-[#F2F2F2] rounded-[8px] p-[2px]">
                <button
                  onClick={() => {
                    setReplyMode('reply')
                    setReplyTo(extractSenderEmail(email.van))
                  }}
                  className={cn(
                    'flex items-center justify-center w-7 h-6 rounded-[6px] transition-all duration-200',
                    replyMode === 'reply'
                      ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]'
                      : 'text-muted-foreground hover:text-foreground/70',
                  )}
                  title="Beantwoorden"
                >
                  <Reply className="h-[14px] w-[14px]" />
                </button>
                <button
                  onClick={() => {
                    setReplyMode('reply-all')
                    setReplyTo(extractSenderEmail(email.van))
                  }}
                  className={cn(
                    'flex items-center justify-center w-7 h-6 rounded-[6px] transition-all duration-200',
                    replyMode === 'reply-all'
                      ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]'
                      : 'text-muted-foreground hover:text-foreground/70',
                  )}
                  title="Allen beantwoorden"
                >
                  <ReplyAll className="h-[14px] w-[14px]" />
                </button>
                <button
                  onClick={() => {
                    setReplyMode('forward')
                    setReplyTo('')
                  }}
                  className={cn(
                    'flex items-center justify-center w-7 h-6 rounded-[6px] transition-all duration-200',
                    replyMode === 'forward'
                      ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]'
                      : 'text-muted-foreground hover:text-foreground/70',
                  )}
                  title="Doorsturen"
                >
                  <Forward className="h-[14px] w-[14px]" />
                </button>
              </div>
            </div>

            {/* CC / BCC fields */}
            {showCcBcc && (
              <>
                <div className="flex items-center px-5 md:px-7 py-3 border-b border-black/[0.06]">
                  <span className="text-[13px] text-muted-foreground flex-shrink-0 mr-3">Cc</span>
                  <input
                    type="text"
                    value={replyCc}
                    onChange={(e) => setReplyCc(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[15px] text-foreground min-w-0 placeholder:text-muted-foreground/80"
                    placeholder="cc@voorbeeld.nl"
                  />
                </div>
                <div className="flex items-center px-5 md:px-7 py-3 border-b border-black/[0.06]">
                  <span className="text-[13px] text-muted-foreground flex-shrink-0 mr-3">Bcc</span>
                  <input
                    type="text"
                    value={replyBcc}
                    onChange={(e) => setReplyBcc(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[15px] text-foreground min-w-0 placeholder:text-muted-foreground/80"
                    placeholder="bcc@voorbeeld.nl"
                  />
                </div>
              </>
            )}

            {/* Subject */}
            <div className="flex items-center px-5 md:px-7 py-3 border-b border-black/[0.06]">
              <span className="text-[13px] text-muted-foreground flex-shrink-0 mr-3">Onderwerp</span>
              <input
                type="text"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[15px] text-foreground min-w-0 placeholder:text-muted-foreground/80"
                placeholder="Onderwerp..."
              />
            </div>

            {/* AI suggestion-chip — iOS-style: zachte achtergrond, sparkles in flame */}
            <div className="flex items-center px-5 md:px-7 py-2.5 border-b border-black/[0.06]">
              <button
                onClick={handleForgieWrite}
                disabled={forgieLoading}
                className={cn(
                  'tap-press inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-[13px] font-medium transition-all duration-200',
                  forgieLoading
                    ? 'bg-[#F2F2F2] text-muted-foreground'
                    : 'bg-[#F15025]/[0.08] text-[#C0451A] hover:bg-[#F15025]/[0.14] active:scale-[0.97]',
                )}
              >
                {forgieLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Schrijf mijn e-mail
              </button>
            </div>
          </div>

          {/* ─── Editor + toolbar ─── */}
          <div className="bg-white">
            {/* Editor */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[360px] md:min-h-[calc(100dvh-380px)] py-5 px-4 md:px-6 text-[15px] leading-[1.7] text-foreground outline-none [&_img]:max-w-[400px] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/80 empty:before:pointer-events-none"
              data-placeholder="Schrijf je antwoord..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <AIContentEditableToolbar editorRef={editorRef} />

            {/* ─── Attachments ─── */}
            {(replyAttachments.length > 0 || forwardOriginalAttachments.length > 0) && (
              <div className="flex flex-wrap gap-2 px-4 md:px-5 py-2.5 border-t border-border bg-background">
                {/* Doorgestuurde originelen — met visual icon en "doorgestuurd" hint */}
                {forwardOriginalAttachments.map((att, i) => {
                  const visual = getAttachmentVisual(att.filename, att.contentType)
                  return (
                    <div
                      key={`fwd-${att.filename}-${i}`}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-[#1A535C]/20 text-[12px] text-foreground/70"
                      title={`Doorgestuurd: ${att.filename}`}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0',
                        visual.bg,
                      )}>
                        {visual.label}
                      </div>
                      <span className="max-w-[180px] truncate">{att.filename}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{formatFileSize(att.size)}</span>
                      <button
                        onClick={() => setForwardOriginalAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-[#C0451A] transition-colors"
                        title="Verwijderen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
                {/* User uploaded files */}
                {replyAttachments.map((file, i) => {
                  const previewUrl = replyImagePreviewUrls.get(file)
                  return (
                    <div key={i} className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-border text-[12px] text-foreground/70">
                      {previewUrl ? (
                        <img src={previewUrl} alt={file.name} className="w-6 h-6 rounded object-cover flex-shrink-0" />
                      ) : (
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="max-w-[180px] truncate">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{(file.size / 1024).toFixed(0)}KB</span>
                      <button
                        onClick={() => setReplyAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-[#C0451A] transition-colors"
                        title="Verwijderen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ─── Toolbar (sticky bottom — iOS-style frosted material) ─── */}
            <div className="sticky bottom-0 z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0 pl-3 pr-3 md:pl-5 md:pr-3 py-2.5 border-t border-black/[0.06] bg-card/85 backdrop-blur-xl shadow-[0_-1px_0_rgba(0,0,0,0.02),0_-8px_24px_-12px_rgba(0,0,0,0.08)]">
              <div className="flex items-center">
                <div className="flex items-center gap-px mr-2">
                  <button onClick={() => execCommand('undo')} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-muted-foreground/80 hover:text-foreground/70 hover:bg-muted transition-colors duration-150" title="Ongedaan maken"><Undo2 className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('redo')} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-muted-foreground/80 hover:text-foreground/70 hover:bg-muted transition-colors duration-150" title="Opnieuw"><Redo2 className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-muted mr-2" />
                <div className="flex items-center gap-px">
                  <button onClick={() => execCommand('bold')} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-muted transition-colors duration-150" title="Vet"><Bold className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('italic')} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-muted transition-colors duration-150" title="Cursief"><Italic className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('underline')} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-muted transition-colors duration-150" title="Onderstrepen"><Underline className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-muted mx-1" />
                <div className="flex items-center gap-px">
                  <button onClick={() => execCommand('insertUnorderedList')} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-muted transition-colors duration-150" title="Lijst"><List className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('insertOrderedList')} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-muted transition-colors duration-150" title="Genummerde lijst"><ListOrdered className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-muted mx-1" />
                <div className="flex items-center gap-px">
                  <button onClick={() => { const url = prompt('URL:'); if (url) execCommand('createLink', url) }} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-muted transition-colors duration-150" title="Link"><Link2 className="h-4 w-4" /></button>
                  <button onClick={() => replyFileInputRef.current?.click()} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-muted transition-colors duration-150" title="Bijlage"><Paperclip className="h-4 w-4" /></button>
                  <input
                    ref={replyFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (files.length) setReplyAttachments(prev => [...prev, ...files])
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end md:justify-start">
                <button
                  onClick={() => setReplyMode(null)}
                  className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground/80 hover:text-[#C0451A] hover:bg-[#C0451A]/[0.06] transition-colors duration-150"
                  title="Annuleren"
                >
                  <Trash2 className="h-[18px] w-[18px] md:h-4 md:w-4" />
                </button>
                <span className="text-[10px] text-muted-foreground/80 hidden md:block">
                  {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter
                </span>
                <div className="relative">
                  <button
                    className="h-10 w-10 md:h-9 md:w-9 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-[#1A535C] hover:bg-[#1A535C]/[0.08] transition-colors duration-150 disabled:opacity-50"
                    onClick={() => setShowScheduleMenu(s => !s)}
                    disabled={isSending}
                    title="Inplannen"
                  >
                    <Clock className="h-[18px] w-[18px] md:h-4 md:w-4" />
                  </button>
                  {showScheduleMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setShowScheduleMenu(false); setShowCustomSchedule(false) }} />
                      <div className="absolute bottom-full right-0 mb-2 w-[220px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] z-50 py-1.5 overflow-hidden">
                        <p className="px-3.5 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Inplannen</p>
                        {[
                          { label: 'Over 1 uur', getDate: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d } },
                          { label: 'Vanmiddag 14:00', getDate: () => { const d = new Date(); d.setHours(14, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); return d } },
                          { label: 'Morgen 9:00', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d } },
                          { label: 'Maandag 9:00', getDate: () => { const d = new Date(); const day = d.getDay(); const daysUntilMon = day === 0 ? 1 : day === 1 ? 7 : 8 - day; d.setDate(d.getDate() + daysUntilMon); d.setHours(9, 0, 0, 0); return d } },
                        ].map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => handleScheduleSend(opt.getDate().toISOString(), opt.label)}
                            className="w-full px-3.5 py-2.5 text-left text-[13px] text-foreground hover:bg-background transition-colors duration-150 flex items-center justify-between"
                          >
                            <span>{opt.label}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {opt.getDate().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </button>
                        ))}
                        <div className="border-t border-border mt-1 pt-1">
                          {!showCustomSchedule ? (
                            <button
                              onClick={() => {
                                setShowCustomSchedule(true)
                                const tomorrow = new Date()
                                tomorrow.setDate(tomorrow.getDate() + 1)
                                setCustomScheduleDate(tomorrow.toISOString().split('T')[0])
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-[13px] text-[#1A535C] hover:bg-background transition-colors duration-150 flex items-center gap-2"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              Kies datum en tijd...
                            </button>
                          ) : (
                            <div className="px-3.5 py-2.5 space-y-2">
                              <input
                                type="date"
                                value={customScheduleDate}
                                onChange={e => setCustomScheduleDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-2.5 py-1.5 text-[13px] text-foreground bg-background rounded-lg border border-border outline-none focus:border-[#1A535C] transition-colors font-mono"
                              />
                              <input
                                type="time"
                                value={customScheduleTime}
                                onChange={e => setCustomScheduleTime(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-[13px] text-foreground bg-background rounded-lg border border-border outline-none focus:border-[#1A535C] transition-colors font-mono"
                              />
                              <button
                                onClick={() => {
                                  if (!customScheduleDate) { toast.error('Kies een datum'); return }
                                  const dt = new Date(`${customScheduleDate}T${customScheduleTime}:00`)
                                  if (dt <= new Date()) { toast.error('Kies een moment in de toekomst'); return }
                                  const label = dt.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + customScheduleTime
                                  handleScheduleSend(dt.toISOString(), label)
                                  setShowCustomSchedule(false)
                                }}
                                className="w-full py-1.5 rounded-lg bg-[#1A535C] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                              >
                                Inplannen
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  className="tap-press h-10 md:h-9 px-5 md:px-6 rounded-[10px] text-[14px] md:text-[13px] font-semibold text-white bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_12px_rgba(241,80,37,0.35)] hover:-translate-y-px active:translate-y-0 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
                  onClick={() => { hapticMedium(); handleSend() }}
                  disabled={isSending}
                >
                  <Send className="h-4 w-4 md:h-3.5 md:w-3.5" />
                  {isSending ? 'Verzenden...' : 'Verzenden'}
                </button>
              </div>
            </div>

          </div>
    </div>
  ) : null

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // READING MODE — shows email body with reply buttons
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="flex flex-col h-full min-w-0">
        {/* Top action bar — sticky, grouped */}
        <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between px-2 md:px-5 h-12 border-b border-black/[0.06] flex-shrink-0 bg-card/85 backdrop-blur-xl sticky top-0 z-10">
          {/* Left: Back + email-acties (markeer + organize) */}
          <div className="flex items-center gap-0.5"><Button
              variant="ghost"
              size="sm"
              className="tap-press h-10 md:h-8 w-10 md:w-auto px-0 md:px-3 gap-1.5 text-foreground/70 hover:text-foreground hover:bg-muted"
              onClick={() => { hapticLight(); onBack?.() }}
            >
              <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-[14px] hidden md:inline">Terug</span>
            </Button>
            <div className="w-px h-5 bg-border mx-1.5 hidden md:block" />
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="tap-press h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-foreground/70 hover:bg-muted transition-colors duration-150" onClick={() => { hapticLight(); if (email) onArchive?.(email) }}>
                <Archive className="h-[18px] w-[18px] md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Archiveren</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="tap-press h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-[#C0451A] hover:bg-[#C0451A]/[0.06] transition-colors duration-150" onClick={() => { hapticMedium(); if (email) onDelete?.(email) }}>
                <Trash2 className="h-[18px] w-[18px] md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Verwijderen</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="tap-press h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-foreground/70 hover:bg-muted transition-colors duration-150" onClick={() => { hapticLight(); if (email) onToggleRead?.(email) }}>
                <MailOpen className="h-[18px] w-[18px] md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Markeer als ongelezen</TooltipContent></Tooltip>
            <div className="w-px h-5 bg-border mx-1.5 hidden md:block" />
            <div ref={snoozeMenuRef} className="relative">
              <Tooltip><TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'tap-press h-10 w-10 md:h-8 md:w-8 transition-colors duration-150',
                    email?.snoozed_until
                      ? 'text-[#1A535C] hover:bg-[#1A535C]/[0.08]'
                      : 'text-muted-foreground hover:text-foreground/70 hover:bg-muted',
                  )}
                  onClick={() => { hapticLight(); setSnoozeMenuOpen((v) => !v) }}
                >
                  <Clock className="h-[18px] w-[18px] md:h-4 md:w-4" />
                </Button>
              </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">{email?.snoozed_until ? 'Gesnoozed' : 'Snooze'}</TooltipContent></Tooltip>
              {snoozeMenuOpen && email && (
                <div className="absolute top-full right-0 mt-1 min-w-[180px] bg-white rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-border py-1 z-50">
                  {email.snoozed_until && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setSnoozeMenuOpen(false); onUnsnooze?.(email) }}
                        className="w-full text-left px-3 py-2 text-[13px] text-[#C0451A] hover:bg-muted transition-colors duration-150"
                      >
                        Niet meer snoozen
                      </button>
                      <div className="border-t border-border my-1" />
                    </>
                  )}
                  {SNOOZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => { setSnoozeMenuOpen(false); onSnooze?.(email, opt.hours) }}
                      className="w-full text-left px-3 py-2 text-[13px] text-foreground/70 hover:bg-muted transition-colors duration-150"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div ref={labelMenuRef} className="relative">
              <Tooltip><TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'tap-press h-10 w-10 md:h-8 md:w-8 transition-colors duration-150',
                    (email?.labels?.length ?? 0) > 0
                      ? 'text-[#1A535C] hover:bg-[#1A535C]/[0.08]'
                      : 'text-muted-foreground hover:text-foreground/70 hover:bg-muted',
                  )}
                  onClick={() => { hapticLight(); setLabelMenuOpen((v) => !v) }}
                >
                  <Tag className="h-[18px] w-[18px] md:h-4 md:w-4" />
                </Button>
              </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Labels</TooltipContent></Tooltip>
              {labelMenuOpen && email && (
                <div className="absolute top-full right-0 mt-1 min-w-[180px] bg-white rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-border py-1 z-50">
                  {Object.entries(labelColors).map(([label, color]) => {
                    const active = email.labels?.includes(label) ?? false
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onToggleLabel?.(email, label)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-foreground/70 hover:bg-muted transition-colors duration-150"
                      >
                        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', color)} />
                        <span className="flex-1 text-left capitalize">{label}</span>
                        {active && <span className="text-[11px] text-[#1A535C]">●</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: AI + Primary reply + Navigation */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 md:h-8 md:w-auto px-0 md:px-3 gap-1.5 text-[13px] text-foreground/70 hover:text-[#1A535C] hover:bg-[#1A535C]/[0.06] rounded-[10px] transition-colors duration-150"
              onClick={handleSummarize}
              disabled={summaryLoading}
              title="Samenvatten (⌘⇧S)"
            >
              {summaryLoading ? <Loader2 className="h-[18px] w-[18px] md:h-3.5 md:w-3.5 animate-spin" /> : <Sparkles className="h-[18px] w-[18px] md:h-3.5 md:w-3.5" />}
              <span className="hidden md:inline">Samenvatten</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 md:h-8 px-2.5 md:px-3 gap-1.5 text-[13px] text-foreground/70 hover:text-[#F15025] hover:bg-[#F15025]/[0.06] rounded-[10px] transition-colors duration-150 disabled:opacity-50"
              onClick={handleGenerateReplyFromReader}
              disabled={forgieLoading}
              title="Beantwoord met AI (⌘⇧R)"
            >
              {forgieLoading ? <Loader2 className="h-[18px] w-[18px] md:h-3.5 md:w-3.5 animate-spin" /> : <Sparkles className="h-[18px] w-[18px] md:h-3.5 md:w-3.5" />}
              <span>Beantwoord</span>
            </Button>
            {emailIndex !== undefined && emailTotal !== undefined && (
              <span className="hidden md:contents">
                <div className="w-px h-5 bg-border mx-2" />
                <span className="text-[12px] text-muted-foreground font-mono tabular-nums">{emailIndex + 1}/{emailTotal}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-[10px]" onClick={() => onNavigate?.('prev')} disabled={emailIndex <= 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-[10px]" onClick={() => onNavigate?.('next')} disabled={emailIndex >= emailTotal - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </span>
            )}

            {/* Acties-popover: Klant/Taak/Koppel renderen inline (morph),
                Project blijft Dialog via onOpenContextPanel callback. */}
            {onOpenContextPanel && (
              <EmailActionsPopover
                email={email}
                onOpenProjectDialog={() => onOpenContextPanel('project')}
              />
            )}
          </div>
        </div>
        </TooltipProvider>

        {/* Scrollable email content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="w-full">
            {/* Header: subject + sender + reply actions */}
            {/* In reply-mode collapsen we naar één compacte regel — sender + onderwerp
                staan toch al in de Aan/Ond-velden van het formulier eronder. */}
            {replyMode ? (
              <div className="flex items-center gap-3 px-5 md:px-7 py-3 border-b border-black/[0.06]">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatarStyle.bg }}>
                  <span className="text-[11px] font-semibold leading-none tracking-tight" style={{ color: avatarStyle.text }}>{senderName[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                  <span className="text-[14px] font-semibold text-foreground truncate flex-shrink-0 tracking-[-0.01em]">{senderName}</span>
                  <span className="text-[13px] text-muted-foreground truncate">· {email.onderwerp || '(geen onderwerp)'}</span>
                </div>
                <span className="text-[12px] text-muted-foreground tabular-nums whitespace-nowrap flex-shrink-0">{formatShortDate(email.datum)}</span>
              </div>
            ) : (
              <div className="px-4 md:px-8 py-5 border-b border-border">
                {/* Subject row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="font-heading text-[22px] md:text-[20px] font-bold text-foreground leading-snug tracking-[-0.3px]">
                    {email.onderwerp || '(geen onderwerp)'}
                  </h1>
                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                    <span className="text-[11px] text-muted-foreground/80 font-mono tabular-nums whitespace-nowrap">{formatShortDate(email.datum)}</span>
                    <button
                      onClick={() => onTogglePin?.(email)}
                      title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
                      className={cn(
                        'p-1 rounded-[10px] transition-colors duration-150',
                        email.pinned
                          ? 'text-[#1A535C] hover:bg-[#1A535C]/10'
                          : 'text-muted-foreground/80 hover:text-[#1A535C] hover:bg-muted',
                      )}
                    >
                      <Pin className={cn('h-3.5 w-3.5', email.pinned && 'fill-[#1A535C] -rotate-45')} />
                    </button>
                  </div>
                </div>

                {/* Sender info — larger avatar with accent ring */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.03]" style={{ backgroundColor: avatarStyle.bg }}>
                    <span className="text-[14px] font-bold leading-none" style={{ color: avatarStyle.text }}>{senderName[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col md:flex-row md:items-baseline md:gap-2 min-w-0">
                      <span className="text-[14px] font-semibold text-foreground leading-snug truncate">{senderName}</span>
                      <span className="text-[12px] text-muted-foreground truncate leading-snug">{senderEmail}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">aan {email.aan}</div>
                  </div>
                </div>

                {/* Reply/Forward — primary on mobile is dominant, secondaries flank */}
                <div className="flex items-stretch md:items-center gap-2 md:gap-1.5">
                  <button onClick={() => { hapticLight(); handleReply('reply') }}
                    className="tap-press flex-1 md:flex-none flex items-center justify-center gap-1.5 h-10 md:h-9 px-4 md:px-4 rounded-[10px] text-[14px] md:text-[13px] font-semibold text-white bg-[#1A535C] hover:bg-[#0F3C44] shadow-sm transition-colors duration-150"
                    title="Beantwoorden (r)">
                    <Reply className="h-4 w-4" />
                    <span>Beantwoorden</span>
                  </button>
                  <button onClick={() => { hapticLight(); handleReply('reply-all') }}
                    className="tap-press flex items-center justify-center gap-1.5 h-10 md:h-8 w-10 md:w-auto md:px-3 rounded-[10px] text-[12px] font-medium text-muted-foreground hover:text-foreground/80 hover:bg-muted transition-colors duration-150"
                    title="Allen beantwoorden"
                    aria-label="Allen beantwoorden">
                    <ReplyAll className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    <span className="hidden md:inline">Allen</span>
                  </button>
                  <button onClick={() => { hapticLight(); handleReply('forward') }}
                    className="tap-press flex items-center justify-center gap-1.5 h-10 md:h-8 w-10 md:w-auto md:px-3 rounded-[10px] text-[12px] font-medium text-muted-foreground hover:text-foreground/80 hover:bg-muted transition-colors duration-150"
                    title="Doorsturen (f)"
                    aria-label="Doorsturen">
                    <Forward className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    <span className="hidden md:inline">Doorsturen</span>
                  </button>
                </div>
              </div>
            )}

            {/* Inline reply form — verschijnt boven body wanneer replyMode actief is */}
            {inlineReplyForm}

            {/* Email body content area */}
            <div className="px-4 md:px-8 py-6">
              {/* ── Thread navigation strip ──
                  Toon alle berichten in dezelfde conversatie. De huidige is
                  gehighlight, klik op een ander bericht om dat te openen. */}
              {threadEmails && threadEmails.length > 1 && (
                <div className="mb-6 rounded-xl border border-border bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
                    <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                      Gesprek · {threadEmails.length} berichten
                    </span>
                  </div>
                  <div className="divide-y divide-[#F0EFEC]">
                    {threadEmails.map((tEmail) => {
                      const isCurrent = tEmail.id === email.id
                      const senderShort = extractSenderName(tEmail.van)
                      return (
                        <button
                          key={tEmail.id}
                          type="button"
                          onClick={() => {
                            if (!isCurrent && onSelectEmail) onSelectEmail(tEmail)
                          }}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
                            isCurrent
                              ? 'bg-[#1A535C]/[0.06]'
                              : 'hover:bg-background cursor-pointer',
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isCurrent ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#1A535C]" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#D4D2CE]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                'text-[13px] truncate',
                                isCurrent ? 'font-semibold text-foreground' : 'text-[#3A3A36]',
                              )}>
                                {senderShort}
                              </span>
                              <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                                {formatShortDate(tEmail.datum)}
                              </span>
                            </div>
                            {!isCurrent && tEmail.body_text && (
                              <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                                {tEmail.body_text.replace(/\s+/g, ' ').slice(0, 120)}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Summary block ── */}
              {(summary || summaryLoading) && (
                <div className="mb-6 rounded-xl overflow-hidden bg-background">
                  <button
                    onClick={() => setSummaryExpanded(e => !e)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#9B8EC4]" />
                      <span className="text-[12px] font-semibold text-foreground/55">Samenvatting</span>
                    </div>
                    <ChevronDown className={cn('h-3.5 w-3.5 text-foreground/25 transition-transform', summaryExpanded ? '' : '-rotate-90')} />
                  </button>
                  {summaryExpanded && (
                    <div className="px-4 pb-3">
                      {summaryLoading ? (
                        <div className="flex items-center gap-2 text-[12px] text-foreground/40">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Samenvatten...</span>
                        </div>
                      ) : (
                        <p className="text-[13px] leading-relaxed text-foreground/70">{summary}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Email body — readable, clean hierarchy */}
              {isLoadingBody ? (
                <div className="space-y-3 py-2">
                  <div className="h-4 bg-muted rounded w-full animate-pulse" />
                  <div className="h-4 bg-muted rounded w-[90%] animate-pulse" />
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-[85%] animate-pulse" />
                </div>
              ) : (
                <div ref={emailBodyRef} className="min-w-0 max-w-full">
                  <div className="max-md:overflow-x-auto max-md:max-w-full">
                    <div
                      className="text-left text-[14px] leading-[1.75] text-foreground/80 break-words
                        [&>*:first-child]:!mt-0
                        [&_body]:!m-0 [&_body]:!p-0
                        [&_table]:!ml-0 [&_table]:max-w-full max-md:[&_table]:!w-full
                        [&_td]:break-words [&_th]:break-words
                        [&_div]:!ml-0 [&_div]:max-w-full
                        [&_p]:!ml-0 [&_p]:mb-2
                        [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:my-3
                        [&_a]:text-[#1A535C] [&_a]:no-underline [&_a]:hover:underline [&_a]:underline-offset-2 [&_a]:transition-colors [&_a]:break-all
                        [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-[14px] [&_blockquote]:text-muted-foreground [&_blockquote]:my-3
                        [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:!ml-0
                        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:!ml-0
                        [&_h3]:text-[14px] [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:!ml-0
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:!ml-0
                        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:!ml-0
                        [&_li]:mb-0.5
                        [&_.email-sig-dim]:text-muted-foreground [&_.email-sig-dim]:text-[13px]"
                      dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                    />
                  </div>
                  <EmailReaderAIToolbar containerRef={emailBodyRef} />
                </div>
              )}

              {/* Attachments — image-grid + losse rij-cards voor non-images */}
              {email.attachment_meta && email.attachment_meta.length > 0 && (() => {
                const imageAtts = email.attachment_meta.filter((a) => isImageAttachment(a.filename, a.contentType))
                const fileAtts = email.attachment_meta.filter((a) => !isImageAttachment(a.filename, a.contentType))
                return (
                <div className="mt-6 pt-5 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-muted-foreground">
                      {email.attachment_meta.length} bijlage{email.attachment_meta.length > 1 ? 'n' : ''}
                    </span>
                    {email.attachment_meta.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDownloadAllAttachments}
                        disabled={downloadingAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-foreground/70 hover:text-foreground/80 hover:bg-muted disabled:opacity-60 disabled:cursor-wait transition-colors duration-150"
                        title="Alle bijlagen downloaden"
                      >
                        {downloadingAll ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Alles downloaden
                      </button>
                    )}
                  </div>

                  {imageAtts.length > 0 && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 mb-3">
                      {imageAtts.map((att, i) => {
                        const isPreviewing = previewLoading === att.filename
                        const isDownloading = downloadingAttachment === att.filename
                        const thumbUrl = attachmentThumbnails[att.filename]
                        return (
                          <div
                            key={`img-${att.filename}-${i}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => handlePreviewAttachment(att)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handlePreviewAttachment(att)
                              }
                            }}
                            className={cn(
                              'group/att relative flex flex-col rounded-xl overflow-hidden bg-background hover:bg-muted transition-colors duration-150 cursor-pointer text-left',
                              (isDownloading || isPreviewing) && 'opacity-60 cursor-wait',
                            )}
                            title={`Preview ${att.filename}`}
                          >
                            <div className="relative aspect-square w-full bg-[#EFEEEA] flex items-center justify-center">
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={att.filename}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : thumbnailsLoading ? (
                                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-violet-500/90 text-white text-[10px] font-bold flex items-center justify-center">
                                  IMG
                                </div>
                              )}
                              {(isPreviewing || isDownloading) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                                </div>
                              )}
                              {!isPreviewing && !isDownloading && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownloadAttachment(att.filename)
                                  }}
                                  className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-card/85 hover:bg-white opacity-0 group-hover/att:opacity-100 transition-opacity duration-150 shadow-sm"
                                  title={`Download ${att.filename}`}
                                  aria-label={`Download ${att.filename}`}
                                >
                                  <Download className="h-3.5 w-3.5 text-foreground/70" />
                                </button>
                              )}
                            </div>
                            <div className="px-2.5 py-2 min-w-0">
                              <div className="text-[12px] text-foreground/70 truncate" title={att.filename}>
                                {att.filename}
                              </div>
                              <div className="text-[11px] text-muted-foreground">{formatFileSize(att.size)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {fileAtts.length > 0 && (
                    <div className="flex flex-wrap gap-2.5">
                      {fileAtts.map((att, i) => {
                        const visual = getAttachmentVisual(att.filename, att.contentType)
                        const isDownloading = downloadingAttachment === att.filename
                        const isPreviewing = previewLoading === att.filename
                        return (
                          <div
                            key={`file-${att.filename}-${i}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => handlePreviewAttachment(att)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handlePreviewAttachment(att)
                              }
                            }}
                            className={cn(
                              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-background hover:bg-muted transition-colors duration-150 cursor-pointer group/att text-left max-w-[280px]',
                              (isDownloading || isPreviewing) && 'opacity-60 cursor-wait',
                            )}
                            title={`Preview ${att.filename}`}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-lg text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0',
                              visual.bg,
                            )}>
                              {visual.label}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[13px] text-foreground/70 group-hover/att:text-foreground/80 transition-colors duration-150 block truncate">
                                {att.filename}
                              </span>
                              <span className="text-[11px] text-muted-foreground">{formatFileSize(att.size)}</span>
                            </div>
                            {isPreviewing || isDownloading ? (
                              <Loader2 className="h-3.5 w-3.5 text-[#1A535C]/60 animate-spin ml-1 flex-shrink-0" />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownloadAttachment(att.filename)
                                }}
                                className="ml-1 p-1 rounded hover:bg-[#E8E7E4] flex-shrink-0"
                                title={`Download ${att.filename}`}
                                aria-label={`Download ${att.filename}`}
                              >
                                <Download className="h-3.5 w-3.5 text-muted-foreground/80 group-hover/att:text-foreground/70 transition-colors duration-150" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                )
              })()}

              {/* Fallback: count > 0 maar geen metadata (auto-fetch faalde,
                  bv. IMAP timeout of geen verbinding). EmailLayout doet bij
                  het openen al een targeted fetchAttachmentMeta, dus dit pad
                  is zeldzaam. */}
              {(!email.attachment_meta || email.attachment_meta.length === 0) && email.bijlagen > 0 && (
                <div className="mt-6 pt-5 border-t border-border">
                  {isLoadingBody ? (
                    <p className="text-[12px] text-muted-foreground inline-flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Bijlagen worden geladen.
                    </p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">
                      {email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''} kon{email.bijlagen > 1 ? 'den' : ''} niet worden geladen. Probeer het zo opnieuw.
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {previewAtt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onClick={closePreview}
          >
            <div
              className="relative max-w-[92vw] max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border">
                <p className="text-[14px] font-medium text-foreground/80 truncate min-w-0">
                  {previewAtt.filename}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(previewAtt.filename)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    title="Downloaden"
                    aria-label="Downloaden"
                  >
                    <Download className="h-4 w-4 text-foreground/70" />
                  </button>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    title="Sluiten"
                    aria-label="Sluiten"
                  >
                    <X className="h-4 w-4 text-foreground/70" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-background flex items-center justify-center min-w-[320px] min-h-[320px]">
                {previewAtt.contentType.startsWith('image/') ? (
                  <img
                    src={previewAtt.url}
                    alt={previewAtt.filename}
                    className="max-w-full max-h-[82vh] object-contain"
                  />
                ) : previewAtt.contentType.includes('pdf') ? (
                  <iframe
                    src={previewAtt.url}
                    title={previewAtt.filename}
                    className="w-[82vw] h-[82vh] border-0 bg-white"
                  />
                ) : (
                  <div className="p-10 text-center">
                    <p className="text-[14px] text-foreground/70 mb-4">
                      Geen preview beschikbaar voor dit bestandstype.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(previewAtt.filename)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A535C] text-white text-[13px] hover:bg-[#16454D] transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download bestand
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

