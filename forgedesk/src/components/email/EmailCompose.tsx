import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Send, Paperclip, Sparkles, ArrowLeft, X, Loader2,
  Bold, Italic, Underline, List, ListOrdered, Link2,
  ChevronDown, Image, Trash2, Clock, Settings,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getKlanten, getEmailTemplates, createEmailTemplate, deleteEmailTemplate, type EmailTemplate } from '@/services/supabaseService'
import { uploadEmailBijlage } from '@/services/storageService'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import type { Klant, Email } from '@/types'
import { callForgie, type ForgieAction } from '@/services/forgieService'
import { logger } from '../../utils/logger'
import { AIContentEditableToolbar } from '@/components/ui/AIContentEditableToolbar'
import { Switch } from '@/components/ui/switch'
import { getWachtendeEmailNaarAdres } from '@/services/emailService'

export interface ComposeActions {
  forgieWrite: () => void
  forgieRewrite: (action: ForgieAction, label: string) => void
}

interface EmailComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  onSend?: (data: { to: string; subject: string; body: string; html?: string; scheduledAt?: string; wacht_op_reactie?: boolean; attachments?: Array<{ filename: string; storagePath: string; size: number }> }) => void
  allEmails?: Email[]
  onToChange?: (to: string) => void
  onRegisterActions?: (actions: ComposeActions) => void
  onForgieLoadingChange?: (loading: boolean) => void
}

const mergeFields = [
  { id: 'naam', label: 'Naam', value: '[naam]' },
  { id: 'bedrijf', label: 'Bedrijf', value: '[bedrijf]' },
  { id: 'datum', label: 'Datum', value: '[datum]' },
  { id: 'projectnaam', label: 'Projectnaam', value: '[projectnaam]' },
  { id: 'offerte_nummer', label: 'Offertenummer', value: '[offerte_nummer]' },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmailList(value: string): boolean {
  if (!value.trim()) return false
  return value.split(/[,;\s]+/).filter(Boolean).every(e => EMAIL_REGEX.test(e.trim()))
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExt(name: string): string {
  return (name.split('.').pop() || 'FILE').toUpperCase().substring(0, 4)
}

function getFileTypeColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return 'bg-red-500'
    case 'doc': case 'docx': return 'bg-blue-600'
    case 'xls': case 'xlsx': return 'bg-green-600'
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return 'bg-[#1A535C]'
    default: return 'bg-[#9B9B95]'
  }
}

export function EmailCompose({
  open,
  onOpenChange,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSend,
  allEmails = [],
  onToChange,
  onRegisterActions,
  onForgieLoadingChange,
}: EmailComposeProps) {
  const navigate = useNavigate()
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, bedrijfsnaam } = useAppSettings()

  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [isSending, setIsSending] = useState(false)
  const [template, setTemplate] = useState('none')
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [showMergeFields, setShowMergeFields] = useState(false)
  const [dbTemplates, setDbTemplates] = useState<EmailTemplate[]>([])
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  // Contacts autocomplete
  const [contacts, setContacts] = useState<Klant[]>([])
  const [suggestions, setSuggestions] = useState<Klant[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const toInputRef = useRef<HTMLInputElement>(null)

  // Sales Inbox v1: toggle + compose-hint (skipt bij meer-dan-1 ontvanger)
  const [wachtOpReactie, setWachtOpReactie] = useState(false)
  const [hintMail, setHintMail] = useState<{ id: string; datum: string } | null>(null)

  // Files
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Editor
  const editorRef = useRef<HTMLDivElement>(null)

  // Daan AI
  const [forgieLoading, setForgieLoading] = useState(false)

  // Schedule send
  const [showScheduleMenu, setShowScheduleMenu] = useState(false)
  const [showCustomSchedule, setShowCustomSchedule] = useState(false)
  const [customScheduleDate, setCustomScheduleDate] = useState('')
  const [customScheduleTime, setCustomScheduleTime] = useState('09:00')

  // Auto-save timer
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Initialize editor with signature
  useEffect(() => {
    if (open && editorRef.current) {
      const timer = setTimeout(() => {
        if (!editorRef.current) return
        if (defaultBody) {
          editorRef.current.innerHTML = `<br>${signatureHtml}${defaultBody.replace(/\n/g, '<br>')}`
        } else {
          editorRef.current.innerHTML = signatureHtml || '<br>'
        }
        // Place cursor at start
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editorRef.current, 0)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
        editorRef.current.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open, defaultBody, signatureHtml])

  useEffect(() => {
    setTo(defaultTo)
    setSubject(defaultSubject)
  }, [defaultTo, defaultSubject])

  // Load contacts + templates
  useEffect(() => {
    if (open) {
      getKlanten().then(setContacts).catch(() => {})
      getEmailTemplates().then(setDbTemplates).catch(() => {})
    }
  }, [open])

  // Auto-save concept every 30s
  useEffect(() => {
    if (open) {
      autoSaveRef.current = setInterval(() => {
        // Could save to localStorage or Supabase
        logger.log('Auto-save concept')
      }, 30000)
      return () => {
        if (autoSaveRef.current) clearInterval(autoSaveRef.current)
      }
    }
  }, [open])

  const handleToChange = useCallback((value: string) => {
    setTo(value)
    if (value.length >= 2 && contacts.length > 0) {
      const q = value.toLowerCase()
      const matches = contacts.filter(k =>
        k.bedrijfsnaam?.toLowerCase().includes(q) ||
        k.contactpersoon?.toLowerCase().includes(q) ||
        k.email?.toLowerCase().includes(q)
      ).slice(0, 5)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }, [contacts])

  const handleSelectContact = useCallback((klant: Klant) => {
    setTo(klant.email || '')
    setShowSuggestions(false)
  }, [])

  const handleTemplateSelect = useCallback((key: string) => {
    const tmpl = dbTemplates.find(t => t.id === key)
    if (tmpl && editorRef.current) {
      if (tmpl.onderwerp) setSubject(tmpl.onderwerp)
      editorRef.current.innerHTML = `${tmpl.body.replace(/\n/g, '<br>')}${signatureHtml}`
    }
    setTemplate(key)
    setShowTemplateMenu(false)
  }, [signatureHtml, dbTemplates])

  const handleSaveAsTemplate = useCallback(async () => {
    if (!newTemplateName.trim()) { toast.error('Vul een naam in'); return }
    const body = editorRef.current?.innerText || ''
    if (!body.trim() || body.trim() === '--') { toast.error('Schrijf eerst een bericht'); return }
    try {
      const created = await createEmailTemplate({
        naam: newTemplateName.trim(),
        onderwerp: subject,
        body: editorRef.current?.innerHTML?.replace(signatureHtml, '') || body,
      })
      setDbTemplates(prev => [...prev, created])
      setNewTemplateName('')
      setShowSaveTemplate(false)
      toast.success('Template opgeslagen')
    } catch {
      toast.error('Template opslaan mislukt')
    }
  }, [newTemplateName, subject, signatureHtml])

  const handleDeleteTemplate = useCallback(async (id: string) => {
    try {
      await deleteEmailTemplate(id)
      setDbTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('Template verwijderd')
    } catch {
      toast.error('Template verwijderen mislukt')
    }
  }, [])

  const handleMergeFieldInsert = useCallback((value: string) => {
    document.execCommand('insertText', false, value)
    setShowMergeFields(false)
    editorRef.current?.focus()
  }, [])

  const handleForgieWrite = useCallback(async () => {
    if (!editorRef.current) return
    setForgieLoading(true)
    try {
      const context = `Onderwerp: ${subject}\nAan: ${to}`
      const response = await callForgie('generate-reply', context)
      if (response?.result && editorRef.current) {
        editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${signatureHtml}`
      }
    } catch (err) {
      logger.error('AI email generation failed:', err)
      toast.error('Daan kon geen email genereren')
    } finally {
      setForgieLoading(false)
    }
  }, [subject, to, signatureHtml])

  // AI rewrite actions
  const handleForgieRewrite = useCallback(async (action: ForgieAction, label: string) => {
    if (!editorRef.current) return
    const currentText = editorRef.current.innerText?.trim()
    if (!currentText || currentText === '--') {
      toast.error('Schrijf eerst iets om te herschrijven')
      return
    }
    setForgieLoading(true)
    try {
      const response = await callForgie(action, currentText, `Onderwerp: ${subject}`)
      if (response?.result && editorRef.current) {
        editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${signatureHtml}`
      }
      toast.success(label)
    } catch (err) {
      logger.error('AI rewrite failed:', err)
      toast.error('Herschrijven mislukt')
    } finally {
      setForgieLoading(false)
    }
  }, [subject, signatureHtml])

  // Report state to parent for context sidebar
  useEffect(() => { onToChange?.(to) }, [to, onToChange])
  useEffect(() => { onForgieLoadingChange?.(forgieLoading) }, [forgieLoading, onForgieLoadingChange])
  useEffect(() => {
    onRegisterActions?.({ forgieWrite: handleForgieWrite, forgieRewrite: handleForgieRewrite })
  }, [onRegisterActions, handleForgieWrite, handleForgieRewrite])

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [])

  const buildAttachmentPayload = useCallback(async () => {
    if (!attachments.length) return undefined

    const totalFileBytes = attachments.reduce((sum, f) => sum + f.size, 0)
    const totalMB = totalFileBytes / (1024 * 1024)
    if (totalMB > 18) {
      toast.error(`Bijlagen zijn te groot (${totalMB.toFixed(1)}MB). Maximum is ca. 18MB per mail.`, { duration: 8000 })
      return undefined
    }

    // Upload naar Supabase Storage — payload bevat alleen paden
    try {
      return await Promise.all(
        attachments.map(async (file) => {
          const result = await uploadEmailBijlage(file)
          return { filename: result.filename, storagePath: result.storagePath, size: result.size }
        })
      )
    } catch (err) {
      logger.error('Bijlage upload mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Bijlage uploaden mislukt')
      return undefined
    }
  }, [attachments])

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      toast.error('Vul een ontvanger in')
      return
    }
    if (!isValidEmailList(to)) {
      toast.error('Ongeldig emailadres in "Aan"')
      return
    }
    if (cc && !isValidEmailList(cc)) {
      toast.error('Ongeldig emailadres in "CC"')
      return
    }
    if (bcc && !isValidEmailList(bcc)) {
      toast.error('Ongeldig emailadres in "BCC"')
      return
    }
    if (!subject.trim()) {
      toast.error('Vul een onderwerp in')
      return
    }
    setIsSending(true)
    try {
      const html = editorRef.current?.innerHTML || ''
      const body = editorRef.current?.innerText || ''

      const attachmentPayload = await buildAttachmentPayload()
      await onSend?.({ to, subject, body, html, wacht_op_reactie: wachtOpReactie, attachments: attachmentPayload })
      toast.success(wachtOpReactie ? 'Email verzonden — toegevoegd aan Opvolgen' : 'Email verzonden')
      setAttachments([])
      setWachtOpReactie(false)
      setHintMail(null)
      onOpenChange(false)
    } catch (err) {
      logger.error('Email send failed:', err)
      toast.error('Verzenden mislukt')
    } finally {
      setIsSending(false)
    }
  }, [to, subject, onSend, onOpenChange, buildAttachmentPayload, wachtOpReactie])

  const handleScheduleSend = useCallback(async (scheduledAt: string, label: string) => {
    if (!to.trim()) { toast.error('Vul een ontvanger in'); return }
    if (!subject.trim()) { toast.error('Vul een onderwerp in'); return }
    setIsSending(true)
    setShowScheduleMenu(false)
    try {
      const html = editorRef.current?.innerHTML || ''
      const body = editorRef.current?.innerText || ''
      const attachmentPayload = await buildAttachmentPayload()
      await onSend?.({ to, subject, body, html, scheduledAt, wacht_op_reactie: wachtOpReactie, attachments: attachmentPayload })
      toast.success(`Email ingepland: ${label}`)
      setAttachments([])
      setWachtOpReactie(false)
      setHintMail(null)
      onOpenChange(false)
    } catch (err) {
      logger.error('Email schedule failed:', err)
      toast.error('Inplannen mislukt')
    } finally {
      setIsSending(false)
    }
  }, [to, subject, onSend, onOpenChange, buildAttachmentPayload, wachtOpReactie])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    setAttachments(prev => [...prev, ...files])
  }, [])

  if (!open) return null

  return (
    <div className="flex flex-col h-full bg-white min-w-0 [&:focus-visible]:shadow-none">
        {/* Header — minimal, just back link */}
        <div className="flex items-center px-6 h-11 flex-shrink-0">
          <button
            className="flex items-center gap-1.5 text-[13px] text-[#9B9B95] hover:text-[#6B6B66] transition-colors duration-150"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Terug
          </button>
        </div>

        {/* Compose form */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6">
            {/* Aan field */}
            <div className="relative">
              <div className="flex items-center border-b border-[#EBEBEB] py-3 focus-within:border-[#1A535C] transition-colors duration-150">
                <input
                  ref={toInputRef}
                  type="email"
                  value={to}
                  onChange={(e) => handleToChange(e.target.value)}
                  onFocus={() => to.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200)
                    // Sales Inbox compose-hint: skip bij multi-recipient (cold-acquisitie is 1-op-1).
                    if (to.includes(',') || !to.trim()) { setHintMail(null); return }
                    getWachtendeEmailNaarAdres(to)
                      .then((mail) => setHintMail(mail ? { id: mail.id, datum: mail.datum } : null))
                      .catch(() => setHintMail(null))
                  }}
                  className="flex-1 bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9B9B95] min-w-0"
                  placeholder="Aan..."
                />
                {!showCcBcc && (
                  <button
                    onClick={() => setShowCcBcc(true)}
                    className="text-[12px] text-[#9B9B95] hover:text-[#1A535C] flex-shrink-0 ml-3 transition-colors duration-150"
                  >
                    CC / BCC
                  </button>
                )}
              </div>
              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-80 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] z-50 py-1 overflow-hidden">
                  {suggestions.map(klant => (
                    <button
                      key={klant.id}
                      onClick={() => handleSelectContact(klant)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[#F8F7F5] flex items-center gap-2.5 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#1A535C]/8 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-[#1A535C]">{getInitials(klant.bedrijfsnaam || klant.contactpersoon || '')}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[#1A1A1A] truncate">{klant.bedrijfsnaam || klant.contactpersoon}</div>
                        <div className="text-[11px] text-[#9B9B95] truncate">{klant.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CC/BCC */}
            {showCcBcc && (
              <>
                <div className="flex items-center border-b border-[#EBEBEB] py-3 focus-within:border-[#1A535C] transition-colors duration-150">
                  <input
                    type="email"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9B9B95] min-w-0"
                    placeholder="CC..."
                  />
                </div>
                <div className="flex items-center border-b border-[#EBEBEB] py-3 focus-within:border-[#1A535C] transition-colors duration-150">
                  <input
                    type="email"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9B9B95] min-w-0"
                    placeholder="BCC..."
                  />
                </div>
              </>
            )}

            {/* Sales Inbox compose-hint */}
            {hintMail && !wachtOpReactie && (() => {
              const dagen = Math.max(0, Math.round((Date.now() - Date.parse(hintMail.datum)) / 86400000))
              return (
                <div className="my-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-[12px] text-blue-900 dark:text-blue-200 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Vorige mail naar dit adres wordt al opgevolgd ({dagen === 0 ? 'vandaag' : `${dagen} ${dagen === 1 ? 'dag' : 'dagen'} geleden`}).</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wachtOpReactie}
                      onChange={(e) => setWachtOpReactie(e.target.checked)}
                      className="h-3 w-3 rounded border-blue-300 cursor-pointer accent-[#1A535C]"
                    />
                    <span>Ook deze opvolgen?</span>
                  </label>
                </div>
              )
            })()}

            {/* Onderwerp */}
            <div className="border-b border-[#EBEBEB] py-3 focus-within:border-[#1A535C] transition-colors duration-150">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9B9B95]"
                placeholder="Onderwerp..."
              />
            </div>

            {/* Tools — subtle text links */}
            <div className="flex items-center gap-4 py-3">
              <div className="relative">
                <button
                  onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                  className="text-[12px] text-[#9B9B95] hover:text-[#6B6B66] transition-colors"
                >
                  Template
                </button>
                {showTemplateMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setShowTemplateMenu(false); setShowSaveTemplate(false) }} />
                    <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] z-50 py-1.5 overflow-hidden max-h-[360px] overflow-y-auto">
                      {dbTemplates.length > 0 ? (
                        dbTemplates.map(tmpl => (
                          <button
                            key={tmpl.id}
                            onClick={() => handleTemplateSelect(tmpl.id)}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors truncate"
                          >
                            {tmpl.naam}
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-[12px] text-[#9B9B95]">Geen templates — maak er een aan in Instellingen</p>
                      )}
                      <div className="border-t border-[#EBEBEB] mt-1 pt-1">
                        {!showSaveTemplate ? (
                          <button
                            onClick={() => setShowSaveTemplate(true)}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-[#1A535C] hover:bg-[#F8F7F5] transition-colors"
                          >
                            + Huidig bericht opslaan als template
                          </button>
                        ) : (
                          <div className="px-3 py-2 space-y-2">
                            <input
                              type="text"
                              value={newTemplateName}
                              onChange={e => setNewTemplateName(e.target.value)}
                              placeholder="Naam van template..."
                              className="w-full px-2.5 py-1.5 text-[13px] bg-[#F8F7F5] rounded-lg border border-[#EBEBEB] outline-none focus:border-[#1A535C]"
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveAsTemplate() }}
                            />
                            <button
                              onClick={handleSaveAsTemplate}
                              className="w-full py-1.5 rounded-lg bg-[#1A535C] text-white text-[12px] font-medium hover:opacity-90"
                            >
                              Opslaan
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setShowTemplateMenu(false)
                            onOpenChange(false)
                            navigate('/instellingen?tab=email&sub=templates')
                          }}
                          className="w-full text-left px-4 py-2.5 text-[13px] text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F8F7F5] transition-colors flex items-center gap-2"
                        >
                          <Settings className="h-3 w-3" />
                          Templates beheren
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowMergeFields(!showMergeFields)}
                  className="text-[12px] text-[#9B9B95] hover:text-[#6B6B66] transition-colors"
                >
                  Veld invoegen
                </button>
                {showMergeFields && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMergeFields(false)} />
                    <div className="absolute left-0 top-full mt-2 w-44 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] z-50 py-1.5 overflow-hidden">
                      {mergeFields.map(field => (
                        <button
                          key={field.id}
                          onClick={() => handleMergeFieldInsert(field.value)}
                          className="w-full text-left px-4 py-2.5 text-[13px] text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors"
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleForgieWrite}
                disabled={forgieLoading}
                className="flex items-center gap-1.5 text-[12px] text-[#F15025] hover:underline transition-colors duration-150 disabled:opacity-40"
              >
                {forgieLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Schrijf mijn e-mail
              </button>
            </div>

            {/* Editor — open canvas, no borders */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className={cn(
                'min-h-[400px] px-0 py-4 text-[15px] leading-[1.75] text-[#1A1A1A] border-none outline-none ring-0 [&_img]:max-w-[200px]',
                isDragging && 'ring-2 ring-[#1A535C]/20 ring-inset rounded-xl bg-[#1A535C]/[0.02]',
              )}
              data-placeholder="Schrijf je bericht..."
              style={{ caretColor: '#1A535C', boxShadow: 'none', outline: 'none' }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />

            {/* AI Text Selection Toolbar */}
            <AIContentEditableToolbar editorRef={editorRef} />

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 py-4">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F8F7F5] text-[14px] group">
                    <div className={cn('w-6 h-6 rounded text-white text-[8px] font-bold flex items-center justify-center', getFileTypeColor(file.name))}>
                      {getFileExt(file.name)}
                    </div>
                    <span className="text-[#6B6B66] max-w-[150px] truncate text-[13px]">{file.name}</span>
                    <span className="text-[#9B9B95] text-[11px]">{formatFileSize(file.size)}</span>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-[#9B9B95] hover:text-[#1A1A1A]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar — formatting + send */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0 px-3 md:px-6 py-2.5 border-t border-[#EBEBEB] flex-shrink-0">
          <div className="flex items-center gap-0.5">
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => execCommand('bold')} title="Vet"><Bold className="h-4 w-4" /></button>
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => execCommand('italic')} title="Cursief"><Italic className="h-4 w-4" /></button>
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => execCommand('underline')} title="Onderstrepen"><Underline className="h-4 w-4" /></button>
            <div className="w-px h-4 bg-[#EBEBEB] mx-1.5" />
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => execCommand('insertUnorderedList')} title="Lijst"><List className="h-4 w-4" /></button>
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => { const url = prompt('URL:'); if (url) execCommand('createLink', url) }} title="Link"><Link2 className="h-4 w-4" /></button>
            <div className="w-px h-4 bg-[#EBEBEB] mx-1.5" />
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => fileInputRef.current?.click()} title="Bijlage">
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf,.doc,.docx"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end md:justify-start">
            {/* Sales Inbox v1: opvolg-toggle */}
            <label className="inline-flex items-center gap-1.5 text-[12px] text-[#67645E] cursor-pointer select-none" title="Vlag deze mail om op te volgen">
              <Switch checked={wachtOpReactie} onCheckedChange={setWachtOpReactie} />
              <span>Opvolgen</span>
            </label>
            <span className="text-[11px] text-[#9B9B95] font-mono hidden sm:block">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
            </span>
            {/* Schedule button */}
            <div className="relative">
              <button
                className="h-9 w-9 flex items-center justify-center rounded-lg text-[#1A535C] bg-[#1A535C]/[0.08] hover:bg-[#1A535C]/[0.14] transition-colors duration-150 disabled:opacity-50"
                onClick={() => setShowScheduleMenu(s => !s)}
                disabled={isSending}
                title="Inplannen"
              >
                <Clock className="h-4 w-4" />
              </button>
              {showScheduleMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setShowScheduleMenu(false); setShowCustomSchedule(false) }} />
                  <div className="absolute bottom-full right-0 mb-2 w-[220px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] z-50 py-1.5 overflow-hidden">
                    <p className="px-3.5 py-1.5 text-[11px] uppercase tracking-wider text-[#9B9B95] font-medium">Inplannen</p>
                    {[
                      { label: 'Over 1 uur', getDate: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d } },
                      { label: 'Vanmiddag 14:00', getDate: () => { const d = new Date(); d.setHours(14, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); return d } },
                      { label: 'Morgen 9:00', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d } },
                      { label: 'Maandag 9:00', getDate: () => { const d = new Date(); const day = d.getDay(); const daysUntilMon = day === 0 ? 1 : day === 1 ? 7 : 8 - day; d.setDate(d.getDate() + daysUntilMon); d.setHours(9, 0, 0, 0); return d } },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => handleScheduleSend(opt.getDate().toISOString(), opt.label)}
                        className="w-full px-3.5 py-2.5 text-left text-[13px] text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors duration-150 flex items-center justify-between"
                      >
                        <span>{opt.label}</span>
                        <span className="text-[11px] text-[#9B9B95] font-mono">
                          {opt.getDate().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-[#EBEBEB] mt-1 pt-1">
                      {!showCustomSchedule ? (
                        <button
                          onClick={() => {
                            setShowCustomSchedule(true)
                            // Default to tomorrow
                            const tomorrow = new Date()
                            tomorrow.setDate(tomorrow.getDate() + 1)
                            setCustomScheduleDate(tomorrow.toISOString().split('T')[0])
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-[13px] text-[#1A535C] hover:bg-[#F8F7F5] transition-colors duration-150 flex items-center gap-2"
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
                            className="w-full px-2.5 py-1.5 text-[13px] text-[#1A1A1A] bg-[#F8F7F5] rounded-lg border border-[#EBEBEB] outline-none focus:border-[#1A535C] transition-colors font-mono"
                          />
                          <input
                            type="time"
                            value={customScheduleTime}
                            onChange={e => setCustomScheduleTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-[13px] text-[#1A1A1A] bg-[#F8F7F5] rounded-lg border border-[#EBEBEB] outline-none focus:border-[#1A535C] transition-colors font-mono"
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
            {/* Send button */}
            <button
              className="px-5 py-2 rounded-lg text-[13px] font-medium text-white bg-[#1A535C] hover:opacity-90 active:opacity-85 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
              onClick={handleSend}
              disabled={isSending}
            >
              <Send className="h-3.5 w-3.5" />
              {isSending ? 'Verzenden...' : 'Versturen'}
            </button>
          </div>
        </div>
    </div>
  )
}
