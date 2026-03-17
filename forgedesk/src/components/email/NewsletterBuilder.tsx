import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
// Select components available if needed:
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  Code,
  Eye,
  Send,
  Save,
  Trash2,
  Plus,
  FileText,
  Users,
  Loader2,
  Copy,
  Download,
  Palette,
  Layout,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Edit3,
  Globe,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import {
  getNieuwsbrieven,
  createNieuwsbrief,
  updateNieuwsbrief,
  deleteNieuwsbrief,
  getKlanten,
} from '@/services/supabaseService'
import { sendEmail } from '@/services/gmailService'
import { nieuwsbriefWrapperTemplate } from '@/services/emailTemplateService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Nieuwsbrief, Klant } from '@/types'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'

// ============ HTML TEMPLATES ============

const TEMPLATE_BASIS: string = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color:#1e3a5f;padding:30px 40px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">Uw Bedrijfsnaam</h1>
        <p style="color:#a3c1e0;margin:8px 0 0;font-size:14px;">Nieuwsbrief</p>
      </td>
    </tr>
    <!-- Inhoud -->
    <tr>
      <td style="padding:40px;">
        <h2 style="color:#1e3a5f;margin:0 0 16px;font-size:22px;">Beste lezer,</h2>
        <p style="color:#333333;font-size:16px;line-height:1.6;margin:0 0 16px;">
          Welkom bij onze nieuwsbrief! Hier vindt u het laatste nieuws over onze producten en diensten.
        </p>
        <p style="color:#333333;font-size:16px;line-height:1.6;margin:0 0 24px;">
          Wij houden u graag op de hoogte van alle ontwikkelingen. Neem gerust contact met ons op als u vragen heeft.
        </p>
        <!-- Call to Action -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="background-color:#1e3a5f;border-radius:6px;">
              <a href="#" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Meer informatie
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #e9ecef;">
        <p style="color:#6c757d;font-size:13px;margin:0 0 8px;">
          &copy; 2026 Uw Bedrijfsnaam. Alle rechten voorbehouden.
        </p>
        <p style="color:#6c757d;font-size:12px;margin:0;">
          <a href="#" style="color:#1e3a5f;text-decoration:underline;">Uitschrijven</a> |
          <a href="#" style="color:#1e3a5f;text-decoration:underline;">Online bekijken</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

const TEMPLATE_PRODUCT: string = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color:#2d7d46;padding:30px 40px;text-align:center;">
        <p style="color:#a8e6c1;margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Nieuw product</p>
        <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">Product Aankondiging</h1>
      </td>
    </tr>
    <!-- Product afbeelding -->
    <tr>
      <td style="padding:0;">
        <div style="background-color:#e9ecef;height:280px;display:flex;align-items:center;justify-content:center;text-align:center;">
          <p style="color:#6c757d;font-size:16px;margin:0;padding:40px;">
            &#128247; Plaats hier uw productafbeelding<br>
            <span style="font-size:13px;">(Aanbevolen: 600x280px)</span>
          </p>
        </div>
      </td>
    </tr>
    <!-- Product details -->
    <tr>
      <td style="padding:40px;">
        <h2 style="color:#2d7d46;margin:0 0 12px;font-size:24px;">Productnaam</h2>
        <p style="color:#333333;font-size:16px;line-height:1.6;margin:0 0 20px;">
          Beschrijf hier uw nieuwe product. Vermeld de belangrijkste kenmerken en voordelen die uw klanten zullen aanspreken.
        </p>
        <!-- Kenmerken -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr>
            <td style="padding:12px 16px;background-color:#f0faf3;border-left:4px solid #2d7d46;">
              <strong style="color:#2d7d46;">&#10003;</strong>
              <span style="color:#333;margin-left:8px;">Kenmerk 1 - Beschrijving</span>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td style="padding:12px 16px;background-color:#f0faf3;border-left:4px solid #2d7d46;">
              <strong style="color:#2d7d46;">&#10003;</strong>
              <span style="color:#333;margin-left:8px;">Kenmerk 2 - Beschrijving</span>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td style="padding:12px 16px;background-color:#f0faf3;border-left:4px solid #2d7d46;">
              <strong style="color:#2d7d46;">&#10003;</strong>
              <span style="color:#333;margin-left:8px;">Kenmerk 3 - Beschrijving</span>
            </td>
          </tr>
        </table>
        <!-- Prijs & CTA -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;text-align:center;">
          <tr>
            <td>
              <p style="color:#6c757d;font-size:14px;margin:0 0 8px;">Vanaf</p>
              <p style="color:#2d7d46;font-size:32px;font-weight:bold;margin:0 0 16px;">&euro; 0,00</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#2d7d46;border-radius:6px;">
              <a href="#" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Offerte aanvragen
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #e9ecef;">
        <p style="color:#6c757d;font-size:13px;margin:0 0 8px;">
          &copy; 2026 Uw Bedrijfsnaam. Alle rechten voorbehouden.
        </p>
        <p style="color:#6c757d;font-size:12px;margin:0;">
          <a href="#" style="color:#2d7d46;text-decoration:underline;">Uitschrijven</a> |
          <a href="#" style="color:#2d7d46;text-decoration:underline;">Online bekijken</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

const TEMPLATE_EVENEMENT: string = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color:#7c3aed;padding:40px;text-align:center;">
        <p style="color:#c4b5fd;margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:2px;">U bent uitgenodigd</p>
        <h1 style="color:#ffffff;margin:0 0 8px;font-size:30px;font-weight:bold;">Evenement Naam</h1>
        <p style="color:#ddd6fe;margin:0;font-size:16px;">Ondertitel of slogan van het evenement</p>
      </td>
    </tr>
    <!-- Datum & Locatie -->
    <tr>
      <td style="padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding:24px 20px 24px 40px;text-align:center;border-bottom:1px solid #e9ecef;">
              <p style="color:#7c3aed;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Datum</p>
              <p style="color:#333;font-size:18px;font-weight:bold;margin:0;">15 maart 2026</p>
              <p style="color:#6c757d;font-size:14px;margin:4px 0 0;">14:00 - 18:00 uur</p>
            </td>
            <td width="50%" style="padding:24px 40px 24px 20px;text-align:center;border-bottom:1px solid #e9ecef;border-left:1px solid #e9ecef;">
              <p style="color:#7c3aed;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Locatie</p>
              <p style="color:#333;font-size:18px;font-weight:bold;margin:0;">Locatienaam</p>
              <p style="color:#6c757d;font-size:14px;margin:4px 0 0;">Straat 123, Stad</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Beschrijving -->
    <tr>
      <td style="padding:40px;">
        <h2 style="color:#333;margin:0 0 16px;font-size:20px;">Over dit evenement</h2>
        <p style="color:#333333;font-size:16px;line-height:1.6;margin:0 0 16px;">
          Beschrijf hier het evenement. Wat kunnen bezoekers verwachten? Waarom moeten ze komen? Voeg alle relevante details toe die uw gasten moeten weten.
        </p>
        <!-- Programma -->
        <h3 style="color:#7c3aed;margin:24px 0 12px;font-size:18px;">Programma</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
              <strong style="color:#7c3aed;">14:00</strong>
              <span style="color:#333;margin-left:16px;">Ontvangst met koffie en thee</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
              <strong style="color:#7c3aed;">14:30</strong>
              <span style="color:#333;margin-left:16px;">Presentatie / Workshop</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
              <strong style="color:#7c3aed;">16:00</strong>
              <span style="color:#333;margin-left:16px;">Pauze</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;">
              <strong style="color:#7c3aed;">16:30</strong>
              <span style="color:#333;margin-left:16px;">Netwerken en borrel</span>
            </td>
          </tr>
        </table>
        <!-- CTA -->
        <table cellpadding="0" cellspacing="0" style="margin:32px auto 0;text-align:center;">
          <tr>
            <td style="background-color:#7c3aed;border-radius:6px;">
              <a href="#" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Meld u aan
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #e9ecef;">
        <p style="color:#6c757d;font-size:13px;margin:0 0 8px;">
          &copy; 2026 Uw Bedrijfsnaam. Alle rechten voorbehouden.
        </p>
        <p style="color:#6c757d;font-size:12px;margin:0;">
          <a href="#" style="color:#7c3aed;text-decoration:underline;">Uitschrijven</a> |
          <a href="#" style="color:#7c3aed;text-decoration:underline;">Online bekijken</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

const TEMPLATES: { id: string; naam: string; beschrijving: string; icon: React.ReactNode; html: string }[] = [
  {
    id: 'basis',
    naam: 'Basis Nieuwsbrief',
    beschrijving: 'Eenvoudige nieuwsbrief met header, inhoud en footer',
    icon: <FileText className="h-5 w-5" />,
    html: TEMPLATE_BASIS,
  },
  {
    id: 'product',
    naam: 'Product Aankondiging',
    beschrijving: 'Productaankondiging met afbeelding, kenmerken en prijs',
    icon: <Palette className="h-5 w-5" />,
    html: TEMPLATE_PRODUCT,
  },
  {
    id: 'evenement',
    naam: 'Evenement Uitnodiging',
    beschrijving: 'Uitnodiging voor een evenement met programma en locatie',
    icon: <Globe className="h-5 w-5" />,
    html: TEMPLATE_EVENEMENT,
  },
]

// ============ HTML SNIPPETS ============

interface HtmlSnippet {
  label: string
  icon: React.ReactNode
  snippet: string
}

const HTML_SNIPPETS: HtmlSnippet[] = [
  {
    label: 'H1',
    icon: <span className="font-bold text-xs">H1</span>,
    snippet: `<h1 style="color:#1e3a5f;margin:0 0 16px;font-size:28px;font-weight:bold;">Koptekst</h1>`,
  },
  {
    label: 'H2',
    icon: <span className="font-bold text-xs">H2</span>,
    snippet: `<h2 style="color:#1e3a5f;margin:0 0 12px;font-size:22px;font-weight:bold;">Subkoptekst</h2>`,
  },
  {
    label: 'Paragraaf',
    icon: <FileText className="h-3.5 w-3.5" />,
    snippet: `<p style="color:#333333;font-size:16px;line-height:1.6;margin:0 0 16px;">Uw tekst hier.</p>`,
  },
  {
    label: 'Afbeelding',
    icon: <Layout className="h-3.5 w-3.5" />,
    snippet: `<img src="https://via.placeholder.com/600x300" alt="Beschrijving" style="width:100%;height:auto;display:block;" />`,
  },
  {
    label: 'Knop',
    icon: <Globe className="h-3.5 w-3.5" />,
    snippet: `<table cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr>
    <td style="background-color:#1e3a5f;border-radius:6px;">
      <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">Knoptekst</a>
    </td>
  </tr>
</table>`,
  },
  {
    label: 'Scheidingslijn',
    icon: <span className="text-xs">---</span>,
    snippet: `<hr style="border:0;border-top:1px solid #e9ecef;margin:24px 0;" />`,
  },
  {
    label: 'Tabel',
    icon: <Layout className="h-3.5 w-3.5" />,
    snippet: `<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
  <tr style="background-color:#f8f9fa;">
    <th style="text-align:left;padding:10px 12px;border:1px solid #e9ecef;color:#333;">Kolom 1</th>
    <th style="text-align:left;padding:10px 12px;border:1px solid #e9ecef;color:#333;">Kolom 2</th>
  </tr>
  <tr>
    <td style="padding:10px 12px;border:1px solid #e9ecef;color:#555;">Data 1</td>
    <td style="padding:10px 12px;border:1px solid #e9ecef;color:#555;">Data 2</td>
  </tr>
</table>`,
  },
]

// ============ STATUS HELPERS ============

function getStatusBadgeVariant(status: Nieuwsbrief['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'verzonden':
      return 'default'
    case 'gepland':
      return 'secondary'
    case 'concept':
    default:
      return 'outline'
  }
}

function getStatusLabel(status: Nieuwsbrief['status']): string {
  switch (status) {
    case 'concept':
      return 'Concept'
    case 'gepland':
      return 'Gepland'
    case 'verzonden':
      return 'Verzonden'
    default:
      return status
  }
}

function getStatusIcon(status: Nieuwsbrief['status']) {
  switch (status) {
    case 'concept':
      return <Edit3 className="h-3.5 w-3.5" />
    case 'gepland':
      return <Clock className="h-3.5 w-3.5" />
    case 'verzonden':
      return <CheckCircle2 className="h-3.5 w-3.5" />
    default:
      return null
  }
}

// ============ EDITOR STATE ============

interface EditorState {
  naam: string
  onderwerp: string
  html_inhoud: string
  ontvangers: string[]
  status: Nieuwsbrief['status']
}

const EMPTY_EDITOR: EditorState = {
  naam: '',
  onderwerp: '',
  html_inhoud: '',
  ontvangers: [],
  status: 'concept',
}

// ============ MAIN COMPONENT ============

export function NewsletterBuilder() {
  const { bedrijfsnaam, primaireKleur, emailHandtekening, logoUrl } = useAppSettings()
  // Data state
  const [nieuwsbrieven, setNieuwsbrieven] = useState<Nieuwsbrief[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // UI state
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR)
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>('desktop')
  const [newEmail, setNewEmail] = useState('')

  // Send progress state
  const [sendProgress, setSendProgress] = useState<{
    sending: boolean
    current: number
    total: number
    failed: string[]
  } | null>(null)

  // Collapsible contacts state
  const [contactsExpanded, setContactsExpanded] = useState(false)
  const [expandedKlantIds, setExpandedKlantIds] = useState<Set<string>>(new Set())

  // Dialog state
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [previewSendDialogOpen, setPreviewSendDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [previewEmail, setPreviewEmail] = useState('')

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ============ DATA LOADING ============

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [nieuwsbrievenData, klantenData] = await Promise.all([
        getNieuwsbrieven(),
        getKlanten(),
      ])
      setNieuwsbrieven(nieuwsbrievenData)
      setKlanten(klantenData)
    } catch (err) {
      logger.error('Fout bij ophalen gegevens:', err)
      toast.error('Kon gegevens niet laden. Probeer het opnieuw.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ============ EDITOR HELPERS ============

  const openNewEditor = useCallback(() => {
    setEditingId(null)
    setEditor(EMPTY_EDITOR)
    setView('editor')
    setTemplateDialogOpen(true)
  }, [])

  const openEditEditor = useCallback((nieuwsbrief: Nieuwsbrief) => {
    setEditingId(nieuwsbrief.id)
    setEditor({
      naam: nieuwsbrief.naam,
      onderwerp: nieuwsbrief.onderwerp,
      html_inhoud: nieuwsbrief.html_inhoud,
      ontvangers: nieuwsbrief.ontvangers || [],
      status: nieuwsbrief.status,
    })
    setView('editor')
  }, [])

  const closeEditor = useCallback(() => {
    setView('list')
    setEditingId(null)
    setEditor(EMPTY_EDITOR)
    setNewEmail('')
  }, [])

  const updateEditorField = useCallback(<K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setEditor((prev) => ({ ...prev, [key]: value }))
  }, [])

  // ============ RECIPIENT MANAGEMENT ============

  const addAllKlantEmails = useCallback(() => {
    const aktieveKlanten = klanten.filter((k) => k.status === 'actief' && k.email)
    const emails = aktieveKlanten.map((k) => k.email)
    setEditor((prev) => {
      const combined = Array.from(new Set([...prev.ontvangers, ...emails]))
      return { ...prev, ontvangers: combined }
    })
    toast.success(`${emails.length} e-mailadressen van actieve klanten toegevoegd`)
  }, [klanten])

  const addEmail = useCallback(() => {
    const email = newEmail.trim().toLowerCase()
    if (!email) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Ongeldig e-mailadres')
      return
    }

    setEditor((prev) => {
      if (prev.ontvangers.includes(email)) {
        toast.warning('Dit e-mailadres is al toegevoegd')
        return prev
      }
      return { ...prev, ontvangers: [...prev.ontvangers, email] }
    })
    setNewEmail('')
  }, [newEmail])

  const removeEmail = useCallback((email: string) => {
    setEditor((prev) => ({
      ...prev,
      ontvangers: prev.ontvangers.filter((e) => e !== email),
    }))
  }, [])

  const clearAllEmails = useCallback(() => {
    setEditor((prev) => ({ ...prev, ontvangers: [] }))
  }, [])

  const addAllContactEmails = useCallback(() => {
    const emails: string[] = []
    klanten
      .filter((k) => k.status === 'actief' && k.contactpersonen?.length > 0)
      .forEach((k) => {
        k.contactpersonen.forEach((cp) => {
          if (cp.email) emails.push(cp.email)
        })
      })
    setEditor((prev) => {
      const combined = Array.from(new Set([...prev.ontvangers, ...emails]))
      return { ...prev, ontvangers: combined }
    })
    toast.success(`${emails.length} e-mailadressen van contactpersonen toegevoegd`)
  }, [klanten])

  const toggleKlantExpanded = useCallback((klantId: string) => {
    setExpandedKlantIds((prev) => {
      const next = new Set(prev)
      if (next.has(klantId)) {
        next.delete(klantId)
      } else {
        next.add(klantId)
      }
      return next
    })
  }, [])

  // ============ HTML SNIPPET INSERTION ============

  const insertSnippet = useCallback((snippet: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      updateEditorField('html_inhoud', editor.html_inhoud + '\n' + snippet)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = editor.html_inhoud.substring(0, start)
    const after = editor.html_inhoud.substring(end)
    const newContent = before + snippet + after

    updateEditorField('html_inhoud', newContent)

    // Restore cursor position after snippet
    requestAnimationFrame(() => {
      textarea.focus()
      const newPos = start + snippet.length
      textarea.setSelectionRange(newPos, newPos)
    })
  }, [editor.html_inhoud, updateEditorField])

  // ============ TAB KEY HANDLING ============

  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const spaces = '  '
      const before = editor.html_inhoud.substring(0, start)
      const after = editor.html_inhoud.substring(end)

      updateEditorField('html_inhoud', before + spaces + after)

      requestAnimationFrame(() => {
        const newPos = start + spaces.length
        textarea.setSelectionRange(newPos, newPos)
      })
    }
  }, [editor.html_inhoud, updateEditorField])

  // ============ SAVE / SEND / DELETE ============

  const handleSave = useCallback(async () => {
    if (!editor.naam.trim()) {
      toast.error('Vul een naam in voor de nieuwsbrief')
      return
    }
    if (!editor.onderwerp.trim()) {
      toast.error('Vul een onderwerp in')
      return
    }

    try {
      setIsSaving(true)

      if (editingId) {
        const updated = await updateNieuwsbrief(editingId, {
          naam: editor.naam,
          onderwerp: editor.onderwerp,
          html_inhoud: editor.html_inhoud,
          ontvangers: editor.ontvangers,
          status: 'concept',
        })
        setNieuwsbrieven((prev) =>
          prev.map((n) => (n.id === editingId ? { ...n, ...updated } : n))
        )
        toast.success('Nieuwsbrief opgeslagen als concept')
      } else {
        const created = await createNieuwsbrief({
          user_id: '',
          naam: editor.naam,
          onderwerp: editor.onderwerp,
          html_inhoud: editor.html_inhoud,
          ontvangers: editor.ontvangers,
          status: 'concept',
        })
        setNieuwsbrieven((prev) => [created, ...prev])
        setEditingId(created.id)
        toast.success('Nieuwsbrief aangemaakt als concept')
      }
    } catch (err) {
      logger.error('Fout bij opslaan:', err)
      toast.error('Kon de nieuwsbrief niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [editor, editingId])

  const handleSend = useCallback(async () => {
    if (editor.ontvangers.length === 0) {
      toast.error('Voeg minstens 1 ontvanger toe')
      return
    }
    if (!editor.html_inhoud.trim()) {
      toast.error('De nieuwsbrief heeft geen inhoud')
      return
    }

    try {
      setIsSaving(true)
      const now = new Date().toISOString()

      // Save to DB first
      if (editingId) {
        const updated = await updateNieuwsbrief(editingId, {
          naam: editor.naam,
          onderwerp: editor.onderwerp,
          html_inhoud: editor.html_inhoud,
          ontvangers: editor.ontvangers,
          status: 'verzonden',
          verzonden_op: now,
        })
        setNieuwsbrieven((prev) =>
          prev.map((n) => (n.id === editingId ? { ...n, ...updated } : n))
        )
      } else {
        const created = await createNieuwsbrief({
          user_id: '',
          naam: editor.naam,
          onderwerp: editor.onderwerp,
          html_inhoud: editor.html_inhoud,
          ontvangers: editor.ontvangers,
          status: 'verzonden',
          verzonden_op: now,
        })
        setNieuwsbrieven((prev) => [created, ...prev])
      }

      // Actually send emails to all recipients
      const recipients = editor.ontvangers
      const failed: string[] = []
      setSendProgress({ sending: true, current: 0, total: recipients.length, failed: [] })

      for (let i = 0; i < recipients.length; i++) {
        setSendProgress({ sending: true, current: i + 1, total: recipients.length, failed: [...failed] })
        try {
          const { html: wrappedHtml } = nieuwsbriefWrapperTemplate({
            inhoud: editor.html_inhoud,
            bedrijfsnaam: bedrijfsnaam || undefined,
            primaireKleur: primaireKleur || undefined,
            handtekening: emailHandtekening || undefined,
            logoUrl: logoUrl || undefined,
          })
          await sendEmail(recipients[i], editor.onderwerp, '', { html: wrappedHtml })
        } catch (err) {
          logger.error(`Fout bij verzenden naar ${recipients[i]}:`, err)
          failed.push(recipients[i])
        }
      }

      setSendProgress(null)

      if (failed.length === 0) {
        toast.success(`Nieuwsbrief verzonden naar ${recipients.length} ontvanger(s)`)
      } else if (failed.length === recipients.length) {
        toast.error('Alle e-mails zijn mislukt. Controleer uw verbinding en probeer het opnieuw.')
      } else {
        toast.warning(
          `Verzonden naar ${recipients.length - failed.length} van ${recipients.length} ontvangers. Mislukt: ${failed.join(', ')}`
        )
      }

      setSendDialogOpen(false)
      closeEditor()
    } catch (err) {
      logger.error('Fout bij verzenden:', err)
      toast.error('Kon de nieuwsbrief niet verzenden')
      setSendProgress(null)
    } finally {
      setIsSaving(false)
    }
  }, [editor, editingId, closeEditor])

  const handleSendPreview = useCallback(async () => {
    const email = previewEmail.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(email)) {
      toast.error('Ongeldig e-mailadres')
      return
    }

    try {
      setIsSaving(true)
      const { html: wrappedHtml } = nieuwsbriefWrapperTemplate({
        inhoud: editor.html_inhoud,
        bedrijfsnaam: bedrijfsnaam || undefined,
        primaireKleur: primaireKleur || undefined,
        handtekening: emailHandtekening || undefined,
        logoUrl: logoUrl || undefined,
      })
      await sendEmail(email, 'Preview: ' + editor.onderwerp, '', { html: wrappedHtml })
      toast.success(`Voorbeeld verzonden naar ${email}`)
      setPreviewSendDialogOpen(false)
      setPreviewEmail('')
    } catch (err) {
      logger.error('Fout bij verzenden preview:', err)
      toast.error('Kon het voorbeeld niet verzenden. Probeer het opnieuw.')
    } finally {
      setIsSaving(false)
    }
  }, [previewEmail, editor.onderwerp, editor.html_inhoud])

  const handleDelete = useCallback(async () => {
    if (!deleteTargetId) return

    try {
      await deleteNieuwsbrief(deleteTargetId)
      setNieuwsbrieven((prev) => prev.filter((n) => n.id !== deleteTargetId))
      toast.success('Nieuwsbrief verwijderd')

      if (editingId === deleteTargetId) {
        closeEditor()
      }
    } catch (err) {
      logger.error('Fout bij verwijderen:', err)
      toast.error('Kon de nieuwsbrief niet verwijderen')
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTargetId(null)
    }
  }, [deleteTargetId, editingId, closeEditor])

  const confirmDelete = useCallback((id: string) => {
    setDeleteTargetId(id)
    setDeleteDialogOpen(true)
  }, [])

  // ============ TEMPLATE SELECTION ============

  const applyTemplate = useCallback((html: string) => {
    updateEditorField('html_inhoud', html)
    setTemplateDialogOpen(false)
  }, [updateEditorField])

  // ============ COPY / DOWNLOAD ============

  const copyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editor.html_inhoud)
      toast.success('HTML gekopieerd naar klembord')
    } catch {
      toast.error('Kon niet naar klembord kopieren')
    }
  }, [editor.html_inhoud])

  const downloadHtml = useCallback(() => {
    const blob = new Blob([editor.html_inhoud], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${editor.naam || 'nieuwsbrief'}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('HTML-bestand gedownload')
  }, [editor.html_inhoud, editor.naam])

  // ============ COMPUTED VALUES ============

  const verzondenNieuwsbrieven = nieuwsbrieven.filter((n) => n.status === 'verzonden')
  const conceptNieuwsbrieven = nieuwsbrieven.filter((n) => n.status === 'concept' || n.status === 'gepland')

  // ============ RENDER: LOADING ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Nieuwsbrieven laden...</p>
        </div>
      </div>
    )
  }

  // ============ RENDER: EDITOR VIEW ============

  if (view === 'editor') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={closeEditor}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Terug
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-xl font-semibold">
              {editingId ? 'Nieuwsbrief bewerken' : 'Nieuwe nieuwsbrief'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewSendDialogOpen(true)}
              disabled={!editor.html_inhoud.trim()}
            >
              <Eye className="h-4 w-4 mr-1" />
              Voorbeeld versturen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Opslaan als concept
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!editor.naam.trim() || !editor.onderwerp.trim()) {
                  toast.error('Vul eerst de naam en het onderwerp in')
                  return
                }
                if (editor.ontvangers.length === 0) {
                  toast.error('Voeg minstens 1 ontvanger toe')
                  return
                }
                setSendDialogOpen(true)
              }}
              disabled={isSaving}
            >
              <Send className="h-4 w-4 mr-1" />
              Versturen
            </Button>
          </div>
        </div>

        {/* Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel - Editor */}
          <div className="space-y-4">
            {/* Basic Fields */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="naam">Naam</Label>
                  <Input
                    id="naam"
                    placeholder="Bijv. Maandelijkse nieuwsbrief januari"
                    value={editor.naam}
                    onChange={(e) => updateEditorField('naam', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onderwerp">Onderwerp</Label>
                  <Input
                    id="onderwerp"
                    placeholder="Het onderwerp dat ontvangers zien in hun inbox"
                    value={editor.onderwerp}
                    onChange={(e) => updateEditorField('onderwerp', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recipients */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Ontvangers
                    {editor.ontvangers.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {editor.ontvangers.length}
                      </Badge>
                    )}
                  </CardTitle>
                  {editor.ontvangers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllEmails}
                      className="text-muted-foreground hover:text-destructive h-7 text-xs"
                    >
                      Alles wissen
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={addAllKlantEmails}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Alle actieve klanten toevoegen ({klanten.filter((k) => k.status === 'actief' && k.email).length})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={addAllContactEmails}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Alle contactpersonen toevoegen ({klanten.filter((k) => k.status === 'actief' && k.contactpersonen?.length > 0).reduce((sum, k) => sum + k.contactpersonen.filter((cp) => cp.email).length, 0)})
                </Button>

                {/* Collapsible section: klanten with their contact persons */}
                <div className="border rounded-lg">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors"
                    onClick={() => setContactsExpanded(!contactsExpanded)}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Klanten &amp; contactpersonen
                    </span>
                    {contactsExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {contactsExpanded && (
                    <div className="border-t max-h-60 overflow-y-auto">
                      {klanten
                        .filter((k) => k.status === 'actief' && k.contactpersonen?.length > 0)
                        .map((klant) => (
                          <div key={klant.id} className="border-b last:border-b-0">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-accent/30 transition-colors"
                              onClick={() => toggleKlantExpanded(klant.id)}
                            >
                              <span className="font-medium truncate">{klant.bedrijfsnaam}</span>
                              <span className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                                <Badge variant="secondary" className="text-2xs h-4 px-1">
                                  {klant.contactpersonen.filter((cp) => cp.email).length}
                                </Badge>
                                {expandedKlantIds.has(klant.id) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </span>
                            </button>
                            {expandedKlantIds.has(klant.id) && (
                              <div className="bg-muted/30 px-3 py-1">
                                {klant.contactpersonen
                                  .filter((cp) => cp.email)
                                  .map((cp) => (
                                    <div
                                      key={cp.id}
                                      className="flex items-center justify-between py-1 text-xs"
                                    >
                                      <div className="truncate mr-2">
                                        <span className="font-medium">{cp.naam}</span>
                                        {cp.functie && (
                                          <span className="text-muted-foreground ml-1">({cp.functie})</span>
                                        )}
                                        <span className="text-muted-foreground block">{cp.email}</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-2xs px-2 flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditor((prev) => {
                                            if (prev.ontvangers.includes(cp.email)) {
                                              toast.warning('Dit e-mailadres is al toegevoegd')
                                              return prev
                                            }
                                            return { ...prev, ontvangers: [...prev.ontvangers, cp.email] }
                                          })
                                        }}
                                        disabled={editor.ontvangers.includes(cp.email)}
                                      >
                                        {editor.ontvangers.includes(cp.email) ? (
                                          <CheckCircle2 className="h-3 w-3" />
                                        ) : (
                                          <Plus className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      {klanten.filter((k) => k.status === 'actief' && k.contactpersonen?.length > 0).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-3">
                          Geen actieve klanten met contactpersonen
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="E-mailadres toevoegen..."
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addEmail()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon" onClick={addEmail}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {editor.ontvangers.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {editor.ontvangers.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-sm group"
                      >
                        <span className="truncate mr-2">{email}</span>
                        <button
                          onClick={() => removeEmail(email)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {editor.ontvangers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Nog geen ontvangers toegevoegd
                  </p>
                )}
              </CardContent>
            </Card>

            {/* HTML Editor */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    HTML Editor
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTemplateDialogOpen(true)}
                      className="h-7 text-xs"
                    >
                      <Layout className="h-3.5 w-3.5 mr-1" />
                      Template
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyHtml}
                      className="h-7 text-xs"
                      disabled={!editor.html_inhoud}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Kopieren
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadHtml}
                      className="h-7 text-xs"
                      disabled={!editor.html_inhoud}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Quick Insert Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {HTML_SNIPPETS.map((snippet) => (
                    <Button
                      key={snippet.label}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => insertSnippet(snippet.snippet)}
                    >
                      {snippet.icon}
                      <span className="ml-1">{snippet.label}</span>
                    </Button>
                  ))}
                </div>

                {/* Code Editor Textarea */}
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={editor.html_inhoud}
                    onChange={(e) => updateEditorField('html_inhoud', e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Plak of schrijf uw HTML hier..."
                    className={cn(
                      'font-mono text-sm min-h-[400px] resize-y',
                      'bg-[#1e1e2e] text-[#cdd6f4] border-[#313244]',
                      'placeholder:text-[#585b70]',
                      'focus-visible:ring-1 focus-visible:ring-[#89b4fa]',
                      'leading-relaxed p-4'
                    )}
                    spellCheck={false}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Preview */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Voorbeeld
                  </CardTitle>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <button
                      className={cn(
                        'px-3 py-1 rounded text-xs font-medium transition-colors',
                        previewWidth === 'desktop'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => setPreviewWidth('desktop')}
                    >
                      Desktop
                    </button>
                    <button
                      className={cn(
                        'px-3 py-1 rounded text-xs font-medium transition-colors',
                        previewWidth === 'mobile'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => setPreviewWidth('mobile')}
                    >
                      Mobiel
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'border rounded-lg overflow-hidden bg-white mx-auto transition-all duration-300',
                    previewWidth === 'desktop' ? 'w-full' : 'w-[375px]'
                  )}
                >
                  {editor.html_inhoud ? (
                    <iframe
                      srcDoc={editor.html_inhoud}
                      title="Nieuwsbrief voorbeeld"
                      className="w-full border-0"
                      style={{ minHeight: '500px', height: '600px' }}
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Eye className="h-10 w-10 mx-auto opacity-30" />
                        <p className="text-sm">Schrijf HTML om een voorbeeld te zien</p>
                        <p className="text-xs text-muted-foreground">
                          Of kies een template om te beginnen
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============ DIALOGS ============ */}

        {/* Template Selection Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Kies een template</DialogTitle>
              <DialogDescription>
                Begin met een vooraf ontworpen template of start met een lege nieuwsbrief.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-colors group"
                  onClick={() => applyTemplate(template.html)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      {template.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{template.naam}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.beschrijving}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              <Separator />
              <button
                className="w-full text-left p-4 rounded-lg border border-dashed hover:border-primary/50 hover:bg-accent/50 transition-colors"
                onClick={() => {
                  applyTemplate('')
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <Code className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Lege nieuwsbrief</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Begin helemaal vanaf nul met uw eigen HTML
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Send Confirmation Dialog */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwsbrief versturen</DialogTitle>
              <DialogDescription>
                Weet u zeker dat u deze nieuwsbrief wilt versturen? Dit kan niet ongedaan worden gemaakt.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Onderwerp:</span>
                  <span className="font-medium">{editor.onderwerp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ontvangers:</span>
                  <span className="font-medium">{editor.ontvangers.length} personen</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Na verzenden wordt de status gewijzigd naar &apos;Verzonden&apos; en kan de nieuwsbrief niet meer bewerkt worden.</p>
              </div>
            </div>
            {sendProgress && sendProgress.sending && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verzenden: {sendProgress.current} van {sendProgress.total}...</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                  />
                </div>
                {sendProgress.failed.length > 0 && (
                  <p className="text-xs text-destructive">
                    {sendProgress.failed.length} mislukt: {sendProgress.failed.join(', ')}
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={sendProgress?.sending}>
                Annuleren
              </Button>
              <Button onClick={handleSend} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Versturen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Send Dialog */}
        <Dialog open={previewSendDialogOpen} onOpenChange={setPreviewSendDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Voorbeeld versturen</DialogTitle>
              <DialogDescription>
                Stuur een testversie van de nieuwsbrief naar een e-mailadres om het resultaat te controleren.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="preview-email">E-mailadres</Label>
                <Input
                  id="preview-email"
                  type="email"
                  placeholder="test@voorbeeld.nl"
                  value={previewEmail}
                  onChange={(e) => setPreviewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSendPreview()
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewSendDialogOpen(false)
                  setPreviewEmail('')
                }}
              >
                Annuleren
              </Button>
              <Button onClick={handleSendPreview} disabled={!previewEmail.trim() || isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Voorbeeld versturen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============ RENDER: LIST VIEW ============

  return (
    <div className="space-y-6 mod-strip mod-strip-nieuwsbrieven">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Nieuwsbrieven
          </h1>
          <p className="text-muted-foreground mt-1">
            Maak en verstuur HTML nieuwsbrieven naar uw klanten
          </p>
        </div>
        <Button onClick={openNewEditor}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Nieuwsbrief
        </Button>
      </div>

      {/* Tabs for Concepts and Sent */}
      <Tabs defaultValue="concepten" className="space-y-4">
        <TabsList>
          <TabsTrigger value="concepten" className="gap-1.5">
            <Edit3 className="h-3.5 w-3.5" />
            Concepten
            {conceptNieuwsbrieven.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                {conceptNieuwsbrieven.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verzonden" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verzonden
            {verzondenNieuwsbrieven.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                {verzondenNieuwsbrieven.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Concepten Tab */}
        <TabsContent value="concepten" className="space-y-3">
          {conceptNieuwsbrieven.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Geen concepten</h3>
                <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
                  U heeft nog geen nieuwsbrief concepten. Maak uw eerste nieuwsbrief aan om te beginnen.
                </p>
                <Button onClick={openNewEditor}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe Nieuwsbrief
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {conceptNieuwsbrieven.map((nieuwsbrief) => (
                <Card
                  key={nieuwsbrief.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => openEditEditor(nieuwsbrief)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{nieuwsbrief.naam}</h3>
                          <Badge
                            variant={getStatusBadgeVariant(nieuwsbrief.status)}
                            className="flex items-center gap-1 flex-shrink-0"
                          >
                            {getStatusIcon(nieuwsbrief.status)}
                            {getStatusLabel(nieuwsbrief.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {nieuwsbrief.onderwerp}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {nieuwsbrief.ontvangers?.length || 0} ontvangers
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {formatDate(nieuwsbrief.updated_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditEditor(nieuwsbrief)
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            confirmDelete(nieuwsbrief.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Verzonden Tab */}
        <TabsContent value="verzonden" className="space-y-3">
          {verzondenNieuwsbrieven.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Send className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Nog geen verzonden nieuwsbrieven</h3>
                <p className="text-muted-foreground text-sm text-center max-w-sm">
                  Nieuwsbrieven die u verstuurt verschijnen hier met de verzenddatum en details.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {verzondenNieuwsbrieven.map((nieuwsbrief) => (
                <Card key={nieuwsbrief.id} className="group">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{nieuwsbrief.naam}</h3>
                          <Badge
                            variant={getStatusBadgeVariant(nieuwsbrief.status)}
                            className="flex items-center gap-1 flex-shrink-0"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verzonden
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {nieuwsbrief.onderwerp}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {nieuwsbrief.ontvangers?.length || 0} ontvangers
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Verzonden op <span className="font-mono">{nieuwsbrief.verzonden_op ? formatDateTime(nieuwsbrief.verzonden_op) : formatDate(nieuwsbrief.updated_at)}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => confirmDelete(nieuwsbrief.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwsbrief verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u deze nieuwsbrief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteTargetId(null)
              }}
            >
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
