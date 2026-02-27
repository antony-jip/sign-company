import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Send,
  Paperclip,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarClock,
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
  Quote,
  X,
  Type,
  ArrowLeft,
  FileSignature,
  Undo,
  Users,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { generateEmailDraft } from '@/services/aiService'
import { getKlanten } from '@/services/supabaseService'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import { logger } from '../../utils/logger'
import type { Klant } from '@/types'

interface EmailComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  onSend?: (data: { to: string; subject: string; body: string; scheduledAt?: string }) => void
}

const emailTemplates: Record<string, { onderwerp: string; body: string }> = {
  none: { onderwerp: '', body: '' },
  'offerte-followup': {
    onderwerp: 'Opvolging offerte',
    body: `Beste [naam],

Graag volg ik onze offerte [nummer] op die wij op [datum] hebben verstuurd.

Heeft u de offerte kunnen bekijken? Wij horen graag of u nog vragen heeft of dat we verdere toelichting kunnen geven.

Mocht u interesse hebben, dan plannen we graag een afspraak in om de details te bespreken.

Met vriendelijke groet,
[uw naam]`,
  },
  'project-update': {
    onderwerp: 'Project update',
    body: `Beste [naam],

Hierbij een update over de voortgang van uw project [projectnaam].

Wat is er bereikt:
- [punt 1]
- [punt 2]
- [punt 3]

Volgende stappen:
- [stap 1]
- [stap 2]

Verwachte opleverdatum: [datum]

Heeft u vragen? Neem gerust contact op.

Met vriendelijke groet,
[uw naam]`,
  },
  welkomstbericht: {
    onderwerp: 'Welkom bij Sign Company',
    body: `Beste [naam],

Welkom bij Sign Company! Wij zijn verheugd om met u samen te werken.

Uw contactpersoon is [naam contactpersoon], bereikbaar via [telefoonnummer] en [emailadres].

De volgende stappen zijn:
1. Kennismakingsgesprek inplannen
2. Wensen en eisen inventariseren
3. Ontwerp voorstel opstellen

Wij kijken uit naar een prettige samenwerking!

Met vriendelijke groet,
[uw naam]`,
  },
  betaalherinnering: {
    onderwerp: 'Herinnering: openstaande factuur',
    body: `Beste [naam],

Uit onze administratie blijkt dat de volgende factuur nog niet is voldaan:

Factuurnummer: [nummer]
Factuurdatum: [datum]
Bedrag: [bedrag]
Vervaldatum: [vervaldatum]

Wij verzoeken u vriendelijk het openstaande bedrag binnen 7 dagen te voldoen op rekeningnummer [IBAN] o.v.v. het factuurnummer.

Mocht de betaling reeds zijn verricht, dan kunt u deze herinnering als niet verzonden beschouwen.

Met vriendelijke groet,
[uw naam]`,
  },
}

const mergeFields = [
  { id: 'naam', label: 'Naam', value: '[naam]' },
  { id: 'bedrijf', label: 'Bedrijf', value: '[bedrijf]' },
  { id: 'datum', label: 'Datum', value: '[datum]' },
  { id: 'projectnaam', label: 'Projectnaam', value: '[projectnaam]' },
  { id: 'offerte_nummer', label: 'Offertenummer', value: '[offerte_nummer]' },
  { id: 'mijn_naam', label: 'Mijn naam', value: '[mijn_naam]' },
  { id: 'telefoon', label: 'Telefoonnummer', value: '[telefoon]' },
]

interface Signature {
  id: string
  naam: string
  inhoud: string
}

const DEFAULT_SIGNATURES: Signature[] = [
  {
    id: 'zakelijk',
    naam: 'Zakelijk',
    inhoud: `Met vriendelijke groet,

[mijn_naam]
[bedrijf]
[telefoon]`,
  },
  {
    id: 'informeel',
    naam: 'Informeel',
    inhoud: `Groeten,

[mijn_naam]`,
  },
  {
    id: 'offerte',
    naam: 'Offerte',
    inhoud: `Met vriendelijke groet,

[mijn_naam]
[bedrijf]
[telefoon]

P.S. Heeft u vragen over deze offerte? Bel ons gerust!`,
  },
]

const SIGNATURES_STORAGE_KEY = 'workmate_email_signatures'

function loadSavedSignatures(): Signature[] {
  try {
    const saved = localStorage.getItem(SIGNATURES_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function saveSignatures(sigs: Signature[]) {
  localStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(sigs))
}

const UNDO_SEND_SECONDS = 5

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
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return 'bg-primary'
    case 'zip': case 'rar': return 'bg-yellow-600'
    default: return 'bg-gray-500'
  }
}

function getFileExt(name: string): string {
  return (name.split('.').pop() || 'FILE').toUpperCase().substring(0, 4)
}

export function EmailCompose({
  open,
  onOpenChange,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSend,
}: EmailComposeProps) {
  const { emailHandtekening, bedrijfsnaam } = useAppSettings()

  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [template, setTemplate] = useState('none')
  const [isSending, setIsSending] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false)
  const [scheduleOption, setScheduleOption] = useState<string>('now')
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('09:00')

  // Contact autocomplete
  const [contacts, setContacts] = useState<Klant[]>([])
  const [contactSuggestions, setContactSuggestions] = useState<Klant[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)

  // Signatures
  const [selectedSignature, setSelectedSignature] = useState<string>('zakelijk')
  const [showSignatureDropdown, setShowSignatureDropdown] = useState(false)
  const [savedSignatures, setSavedSignatures] = useState<Signature[]>(() => loadSavedSignatures())
  const [editingSignature, setEditingSignature] = useState<Signature | null>(null)
  const [editSigNaam, setEditSigNaam] = useState('')
  const [editSigInhoud, setEditSigInhoud] = useState('')
  const signatureRef = useRef<HTMLDivElement>(null)
  const allSignatures = useMemo(() => {
    const custom: Signature[] = emailHandtekening
      ? [{ id: 'custom', naam: 'Mijn handtekening', inhoud: emailHandtekening }]
      : []
    return [...custom, ...savedSignatures, ...DEFAULT_SIGNATURES]
  }, [emailHandtekening, savedSignatures])

  // Undo send
  const [undoTimer, setUndoTimer] = useState<number | null>(null)
  const [undoCountdown, setUndoCountdown] = useState(0)
  const undoCallbackRef = useRef<(() => void) | null>(null)

  // File upload
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ContentEditable editor
  const editorRef = useRef<HTMLDivElement>(null)
  const [editorEmpty, setEditorEmpty] = useState(true)
  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false, strikethrough: false,
  })

  // Merge fields
  const [showMergeFields, setShowMergeFields] = useState(false)
  const mergeFieldRef = useRef<HTMLDivElement>(null)

  const scheduleDropdownRef = useRef<HTMLDivElement>(null)

  // Set initial editor content when panel opens
  useEffect(() => {
    if (open && editorRef.current) {
      const timer = setTimeout(() => {
        if (!editorRef.current) return
        if (defaultBody) {
          editorRef.current.innerHTML = defaultBody.replace(/\n/g, '<br>')
        } else {
          // Use selected signature
          const sig = allSignatures.find(s => s.id === selectedSignature)
          if (sig) {
            editorRef.current.innerHTML = `<br><br>--<br>${sig.inhoud.replace(/\n/g, '<br>')}`
          } else if (emailHandtekening) {
            editorRef.current.innerHTML = `<br><br>--<br>${emailHandtekening.replace(/\n/g, '<br>')}`
          }
        }
        setEditorEmpty(!editorRef.current.innerText?.trim())
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, defaultBody, emailHandtekening, selectedSignature, allSignatures])

  // Sync state when defaults change (reply/forward)
  useEffect(() => {
    setTo(defaultTo)
    setSubject(defaultSubject)
  }, [defaultTo, defaultSubject])

  // Load contacts for autocomplete
  useEffect(() => {
    let cancelled = false
    getKlanten().then((data) => {
      if (!cancelled) setContacts(data || [])
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Filter contact suggestions based on "to" input
  useEffect(() => {
    if (!to.trim() || to.includes('@') && to.endsWith('.')) {
      setContactSuggestions([])
      setShowSuggestions(false)
      return
    }
    const q = to.toLowerCase()
    const matches = contacts.filter((k) => {
      const contactEmails = k.contactpersonen?.map(c => c.email).filter(Boolean) || []
      const contactNames = k.contactpersonen?.map(c => c.naam).filter(Boolean) || []
      return (
        k.bedrijfsnaam.toLowerCase().includes(q) ||
        contactNames.some(n => n.toLowerCase().includes(q)) ||
        contactEmails.some(e => e.toLowerCase().includes(q))
      )
    }).slice(0, 5)
    setContactSuggestions(matches)
    setShowSuggestions(matches.length > 0)
  }, [to, contacts])

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showScheduleDropdown && !showMergeFields && !showSuggestions && !showSignatureDropdown) return
    function handleClickOutside(e: MouseEvent) {
      if (showScheduleDropdown && scheduleDropdownRef.current && !scheduleDropdownRef.current.contains(e.target as Node)) {
        setShowScheduleDropdown(false)
      }
      if (showMergeFields && mergeFieldRef.current && !mergeFieldRef.current.contains(e.target as Node)) {
        setShowMergeFields(false)
      }
      if (showSuggestions && suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
      if (showSignatureDropdown && signatureRef.current && !signatureRef.current.contains(e.target as Node)) {
        setShowSignatureDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showScheduleDropdown, showMergeFields, showSuggestions, showSignatureDropdown])

  // Undo send countdown
  useEffect(() => {
    if (undoCountdown <= 0) return
    const interval = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // Timer expired, actually send
          undoCallbackRef.current?.()
          undoCallbackRef.current = null
          setUndoTimer(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [undoCountdown > 0 ? 1 : 0]) // only re-run when starting/stopping

  const handleSelectContact = useCallback((klant: Klant) => {
    const email = klant.contactpersonen?.[0]?.email || ''
    if (email) {
      setTo(email)
    }
    setShowSuggestions(false)
  }, [])

  const handleSignatureChange = useCallback((sigId: string) => {
    setSelectedSignature(sigId)
    const sig = allSignatures.find(s => s.id === sigId)
    if (sig && editorRef.current) {
      // Remove old signature (everything after --\n) and add new one
      const currentHtml = editorRef.current.innerHTML
      const sigSeparator = currentHtml.indexOf('--<br>')
      const bodyPart = sigSeparator >= 0 ? currentHtml.substring(0, sigSeparator) : currentHtml
      const newSigHtml = `--<br>${sig.inhoud.replace(/\n/g, '<br>')}`
      editorRef.current.innerHTML = `${bodyPart}${newSigHtml}`
      setEditorEmpty(!editorRef.current.innerText?.trim())
    }
    setShowSignatureDropdown(false)
  }, [allSignatures])

  const handleSaveSignature = useCallback(() => {
    if (!editSigNaam.trim() || !editSigInhoud.trim()) return
    const isNew = !editingSignature || !savedSignatures.find(s => s.id === editingSignature.id)
    const sig: Signature = {
      id: isNew ? `sig-${Date.now()}` : editingSignature!.id,
      naam: editSigNaam.trim(),
      inhoud: editSigInhoud.trim(),
    }
    const updated = isNew
      ? [...savedSignatures, sig]
      : savedSignatures.map(s => s.id === sig.id ? sig : s)
    setSavedSignatures(updated)
    saveSignatures(updated)
    setEditingSignature(null)
    setEditSigNaam('')
    setEditSigInhoud('')
    toast.success(isNew ? 'Handtekening opgeslagen' : 'Handtekening bijgewerkt')
  }, [editingSignature, editSigNaam, editSigInhoud, savedSignatures])

  const handleDeleteSignature = useCallback((id: string) => {
    const updated = savedSignatures.filter(s => s.id !== id)
    setSavedSignatures(updated)
    saveSignatures(updated)
    if (selectedSignature === id) setSelectedSignature('zakelijk')
    toast.success('Handtekening verwijderd')
  }, [savedSignatures, selectedSignature])

  const handleUndoSend = useCallback(() => {
    if (undoTimer) {
      clearTimeout(undoTimer)
      setUndoTimer(null)
    }
    setUndoCountdown(0)
    undoCallbackRef.current = null
    toast.success('Verzending geannuleerd')
  }, [undoTimer])

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
      setEditorEmpty(!editorRef.current.innerText?.trim())
    }
  }, [])

  const insertLink = useCallback(() => {
    const url = prompt('Voer de URL in:', 'https://')
    if (url) execFormat('createLink', url)
  }, [execFormat])

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

  const handleTemplateChange = (value: string) => {
    setTemplate(value)
    if (value !== 'none' && emailTemplates[value] && editorRef.current) {
      const tmpl = emailTemplates[value]
      if (tmpl.onderwerp && !subject) setSubject(tmpl.onderwerp)
      const signature = emailHandtekening ? `\n\n--\n${emailHandtekening}` : ''
      const fullBody = tmpl.body + signature
      editorRef.current.innerHTML = fullBody.replace(/\n/g, '<br>')
      setEditorEmpty(false)
    }
  }

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
        break
      case 'tomorrow-9':
        setScheduledAt(`${tomorrowStr}T09:00`)
        break
      case 'tomorrow-14':
        setScheduledAt(`${tomorrowStr}T14:00`)
        break
      case 'next-monday': {
        const monday = getNextMonday()
        const mondayStr = monday.toISOString().split('T')[0]
        setScheduledAt(`${mondayStr}T09:00`)
        break
      }
      case 'custom':
        if (customDate && customTime) {
          setScheduledAt(`${customDate}T${customTime}`)
        } else {
          setScheduledAt('')
        }
        break
    }
    if (option !== 'custom') {
      setShowScheduleDropdown(false)
    }
  }

  const handleAiGenerate = async () => {
    try {
      const draft = await generateEmailDraft({
        onderwerp: subject || undefined,
        doel: subject || 'zakelijke email',
      })
      if (editorRef.current) {
        editorRef.current.innerText = draft
        setEditorEmpty(false)
      }
      toast.success('AI tekst gegenereerd')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI generatie mislukt')
    }
  }

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return

    const body = editorRef.current?.innerText || ''
    const sendData = { to: to.trim(), subject: subject.trim(), body, scheduledAt: scheduledAt || undefined }

    // If scheduled, send immediately (no undo)
    if (scheduledAt) {
      setIsSending(true)
      try {
        onSend?.(sendData)
        resetAndClose()
      } catch (error) {
        logger.error('Verzenden mislukt:', error)
      } finally {
        setIsSending(false)
      }
      return
    }

    // Undo send: start countdown
    setUndoCountdown(UNDO_SEND_SECONDS)
    undoCallbackRef.current = () => {
      try {
        onSend?.(sendData)
        resetAndClose()
      } catch (error) {
        logger.error('Verzenden mislukt:', error)
      }
    }
    const timer = window.setTimeout(() => {
      undoCallbackRef.current?.()
      undoCallbackRef.current = null
      setUndoTimer(null)
      setUndoCountdown(0)
    }, UNDO_SEND_SECONDS * 1000)
    setUndoTimer(timer)
  }

  const resetAndClose = () => {
    setTo(defaultTo)
    setCc('')
    setShowCc(false)
    setSubject(defaultSubject)
    setTemplate('none')
    setScheduledAt('')
    setShowScheduleDropdown(false)
    setScheduleOption('now')
    setCustomDate('')
    setCustomTime('09:00')
    setAttachments([])
    setShowMergeFields(false)
    setEditorEmpty(true)
    if (editorRef.current) editorRef.current.innerHTML = ''
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetAndClose}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-base font-semibold">
          {defaultTo ? (defaultSubject?.startsWith('Re:') ? 'Beantwoorden' : defaultSubject?.startsWith('Fwd:') ? 'Doorsturen' : 'Nieuwe email') : 'Nieuwe email'}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-accent hover:text-accent hover:bg-wm-pale/20 dark:hover:bg-primary/20"
            onClick={handleAiGenerate}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Genereren
          </Button>
        </div>
      </div>

      {/* ── Form ── */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* Template selector */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium w-20 flex-shrink-0">Template</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecteer template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen template</SelectItem>
                <SelectItem value="offerte-followup">Offerte follow-up</SelectItem>
                <SelectItem value="project-update">Project update</SelectItem>
                <SelectItem value="welkomstbericht">Welkomstbericht</SelectItem>
                <SelectItem value="betaalherinnering">Betaalherinnering</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* To field with autocomplete */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-between w-20 flex-shrink-0">
              <Label className="text-sm font-medium">Aan</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-[10px] text-muted-foreground"
                onClick={() => setShowCc(!showCc)}
              >
                CC {showCc ? <ChevronUp className="w-2.5 h-2.5 ml-0.5" /> : <ChevronDown className="w-2.5 h-2.5 ml-0.5" />}
              </Button>
            </div>
            <div className="relative flex-1" ref={suggestionsRef}>
              <Input
                ref={toInputRef}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onFocus={() => { if (contactSuggestions.length > 0) setShowSuggestions(true) }}
                placeholder="email@voorbeeld.nl of zoek contacten..."
                type="text"
                className="h-9"
              />
              {showSuggestions && contactSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-md border bg-popover shadow-lg z-50 max-h-48 overflow-y-auto">
                  {contactSuggestions.map((klant) => {
                    const contact = klant.contactpersonen?.[0]
                    const email = contact?.email || ''
                    const naam = contact?.naam || klant.bedrijfsnaam
                    return (
                      <button
                        key={klant.id}
                        onClick={() => handleSelectContact(klant)}
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-3"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                          {getInitials(naam)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{naam}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {klant.bedrijfsnaam}{email ? ` — ${email}` : ''}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CC field */}
          {showCc && (
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium w-20 flex-shrink-0">CC</Label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@voorbeeld.nl" type="email" className="h-9" />
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium w-20 flex-shrink-0">Onderwerp</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Onderwerp van de email..." className="h-9" />
          </div>

          <Separator />

          {/* Body - Rich Editor */}
          <div className="border rounded-lg overflow-hidden">
            {/* Merge fields toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/20">
              <div className="relative" ref={mergeFieldRef}>
                <button
                  onClick={() => setShowMergeFields(!showMergeFields)}
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

            {/* ContentEditable - full width */}
            <div className="relative">
              {editorEmpty && (
                <div className="absolute top-3 left-4 text-sm text-muted-foreground pointer-events-none select-none">
                  Schrijf uw bericht hier...
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                onMouseUp={updateFormatState}
                onKeyUp={updateFormatState}
                className="min-h-[240px] max-h-[500px] overflow-y-auto px-4 py-3 text-sm leading-relaxed focus:outline-none"
                suppressContentEditableWarning
              />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="px-3 py-2 border-t bg-muted/10">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-muted rounded-md text-xs">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 ${getFileTypeColor(file.name)}`}>
                        {getFileExt(file.name)}
                      </div>
                      <span className="font-medium max-w-[120px] truncate">{file.name}</span>
                      <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                      <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
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
          </div>
        </div>
      </ScrollArea>

      {/* ── Undo send bar ── */}
      {undoCountdown > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <Send className="w-4 h-4" />
            Email wordt verzonden in {undoCountdown}s...
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
            onClick={handleUndoSend}
          >
            <Undo className="w-3.5 h-3.5" />
            Ongedaan maken
          </Button>
        </div>
      )}

      {/* ── Footer / Actions ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
        <div className="flex items-center gap-2">
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
            className="gap-1.5 text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-4 h-4" />
            Bijlage
          </Button>
          {attachments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {attachments.length} bestand{attachments.length > 1 ? 'en' : ''}
            </span>
          )}
          <Separator orientation="vertical" className="h-5 mx-1" />
          {/* Signature selector */}
          <div className="relative" ref={signatureRef}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setShowSignatureDropdown(!showSignatureDropdown)}
            >
              <FileSignature className="w-4 h-4" />
              Handtekening
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showSignatureDropdown && !editingSignature && (
              <div className="absolute left-0 bottom-full mb-2 w-64 rounded-md border bg-popover p-1 shadow-lg z-50">
                <button
                  onClick={() => { setSelectedSignature('none'); setShowSignatureDropdown(false) }}
                  className={cn('w-full text-left px-3 py-2 text-sm rounded hover:bg-accent', selectedSignature === 'none' && 'bg-accent font-medium')}
                >
                  Geen handtekening
                </button>
                {allSignatures.map((sig) => {
                  const isSaved = savedSignatures.some(s => s.id === sig.id)
                  return (
                    <div key={sig.id} className={cn('flex items-center rounded hover:bg-accent group', selectedSignature === sig.id && 'bg-accent font-medium')}>
                      <button
                        onClick={() => handleSignatureChange(sig.id)}
                        className="flex-1 text-left px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <FileSignature className="w-3.5 h-3.5 text-muted-foreground" />
                          {sig.naam}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5 ml-5.5">{sig.inhoud.split('\n')[0]}</p>
                      </button>
                      {isSaved && (
                        <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSignature(sig); setEditSigNaam(sig.naam); setEditSigInhoud(sig.inhoud) }}
                            className="p-1 rounded hover:bg-muted" title="Bewerken"
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSignature(sig.id) }}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950" title="Verwijderen"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="border-t mt-1 pt-1">
                  <button
                    onClick={() => { setEditingSignature({ id: '', naam: '', inhoud: '' }); setEditSigNaam(''); setEditSigInhoud('') }}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent text-primary font-medium flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nieuwe handtekening
                  </button>
                </div>
              </div>
            )}
            {editingSignature && (
              <div className="absolute left-0 bottom-full mb-2 w-72 rounded-md border bg-popover p-3 shadow-lg z-50">
                <h4 className="text-sm font-semibold mb-2">{editingSignature.id ? 'Handtekening bewerken' : 'Nieuwe handtekening'}</h4>
                <input
                  value={editSigNaam}
                  onChange={(e) => setEditSigNaam(e.target.value)}
                  placeholder="Naam (bijv. Zakelijk)"
                  className="w-full text-sm border rounded px-2 py-1.5 mb-2 bg-background"
                />
                <textarea
                  value={editSigInhoud}
                  onChange={(e) => setEditSigInhoud(e.target.value)}
                  placeholder="Handtekening tekst..."
                  rows={4}
                  className="w-full text-sm border rounded px-2 py-1.5 mb-2 bg-background resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setEditingSignature(null); setEditSigNaam(''); setEditSigInhoud('') }}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleSaveSignature}
                    disabled={!editSigNaam.trim() || !editSigInhoud.trim()}
                    className="text-xs bg-primary text-primary-foreground rounded px-3 py-1 font-medium disabled:opacity-50"
                  >
                    Opslaan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetAndClose}>
            Annuleren
          </Button>
          <div className="relative" ref={scheduleDropdownRef}>
            <div className="flex">
              <Button
                onClick={handleSend}
                disabled={!to.trim() || !subject.trim() || isSending}
                size="sm"
                className="gap-2 rounded-r-none"
              >
                {scheduledAt ? (
                  <><Clock className="w-4 h-4" />{isSending ? 'Inplannen...' : 'Inplannen'}</>
                ) : (
                  <><Send className="w-4 h-4" />{isSending ? 'Verzenden...' : 'Verzenden'}</>
                )}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="rounded-l-none border-l border-l-primary-foreground/20 px-2"
                onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                type="button"
              >
                <CalendarClock className="w-4 h-4" />
              </Button>
            </div>
            {showScheduleDropdown && (
              <div className="absolute right-0 bottom-full mb-2 w-72 rounded-md border bg-popover p-2 shadow-md z-50">
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
                    <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Volgende week maandag 09:00</div>
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
    </div>
  )
}
