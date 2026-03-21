import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { BackButton } from '@/components/shared/BackButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  FileText,
  FolderKanban,
  Calendar,
  Clock,
  Tag,
  StickyNote,
  User,
  Users,
  Hash,
  FileIcon,
  Star,
  Paperclip,
  Plus,
  Download,
  Trash2,
  CreditCard,
  MessageSquare,
  MoreHorizontal,
  ChevronDown,
  CalendarPlus,
  Receipt,
  Upload,
  History,
  ArrowRightLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  cn,
  getStatusColor,
  getPriorityColor,
  formatDate,
  formatCurrency,
  formatDateTime,
} from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import {
  getKlant,
  getKlanten,
  getProjectenByKlant,
  getEmails,
  getDocumenten,
  getOffertes,
  getFacturen,
  getDealsByKlant,
  getTijdregistraties,
  updateKlant,
} from '@/services/supabaseService'
import { AddEditClient } from './AddEditClient'
import { KlantHistorieTab } from './KlantHistorieTab'
import {
  getContactpersonen as getImportedContactpersonen,
  createContactpersoon as createImportedContactpersoon,
  deleteContactpersoon as deleteImportedContactpersoon,
  type ImportContactpersoon,
} from '@/services/importService'
import type { Klant, Project, Email, Document as DocType, Offerte, Contactpersoon, Vestiging, Factuur, Deal, Tijdregistratie } from '@/types'

function getStatusBarColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-green-500'
    case 'gepland': return 'bg-primary'
    case 'in-review': return 'bg-amber-500'
    case 'afgerond': return 'bg-emerald-500'
    case 'on-hold': return 'bg-red-500'
    default: return 'bg-muted-foreground/40'
  }
}

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'actief': return 'border-l-green-500'
    case 'gepland': return 'border-l-primary'
    case 'in-review': return 'border-l-amber-500'
    case 'afgerond': return 'border-l-emerald-500'
    case 'on-hold': return 'border-l-red-500'
    default: return 'border-l-muted-foreground/40'
  }
}

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
  'te-factureren': 'Te factureren',
}

export function ClientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [klant, setKlant] = useState<Klant | null>(null)
  const [clientProjecten, setClientProjecten] = useState<Project[]>([])
  const [clientEmails, setClientEmails] = useState<Email[]>([])
  const [clientDocumenten, setClientDocumenten] = useState<DocType[]>([])
  const [clientFacturen, setClientFacturen] = useState<Factuur[]>([])
  const [clientDeals, setClientDeals] = useState<Deal[]>([])
  const [clientTijdregistraties, setClientTijdregistraties] = useState<Tijdregistratie[]>([])
  const [clientOffertes, setClientOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('projecten')
  const [notitie, setNotitie] = useState('')
  const [savingNotitie, setSavingNotitie] = useState(false)
  // Contact person form
  const [editingContact, setEditingContact] = useState<Contactpersoon | null>(null)
  const [contactForm, setContactForm] = useState({ naam: '', functie: '', email: '', telefoon: '' })
  const csvFileRef = useRef<HTMLInputElement>(null)
  // Imported contactpersonen (from CSV import)
  const [importedContacts, setImportedContacts] = useState<ImportContactpersoon[]>([])
  // Vestiging form
  const [vestigingDialogOpen, setVestigingDialogOpen] = useState(false)
  const [editingVestiging, setEditingVestiging] = useState<Vestiging | null>(null)
  const [vestigingForm, setVestigingForm] = useState({ naam: '', adres: '', postcode: '', stad: '', land: 'Nederland' })
  // Move contactpersoon to another company
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [movingContact, setMovingContact] = useState<Contactpersoon | null>(null)
  const [moveSearch, setMoveSearch] = useState('')
  const [moveKlanten, setMoveKlanten] = useState<Klant[]>([])
  const [selectedMoveKlant, setSelectedMoveKlant] = useState<Klant | null>(null)
  const [moveLoading, setMoveLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      getKlant(id),
      getProjectenByKlant(id),
      getEmails(),
      getDocumenten(),
      getOffertes(),
      getFacturen().catch(() => []),
      getDealsByKlant(id).catch(() => []),
      getTijdregistraties().catch(() => []),
    ]).then(([klantData, projecten, allEmails, allDocs, allOffertes, allFacturen, deals, allTijd]) => {
      if (cancelled) return
      setKlant(klantData)
      setClientProjecten(projecten)
      setNotitie(klantData?.notities || '')
      if (klantData) {
        const email = (klantData.email || '').toLowerCase()
        setClientEmails(
          allEmails.filter(
            (e) =>
              (e.van?.toLowerCase()?.includes(email) ?? false) ||
              (e.aan?.toLowerCase()?.includes(email) ?? false)
          )
        )
        setClientOffertes(
          allOffertes.filter((o) => o.klant_id === id)
        )
      }
      setClientDocumenten(allDocs.filter((d) => d.klant_id === id))
      setClientFacturen(allFacturen.filter((f) => f.klant_id === id))
      setClientDeals(deals)
      const projectIds = new Set(projecten.map((p) => p.id))
      setClientTijdregistraties(allTijd.filter((t) => projectIds.has(t.project_id)))
      // Load imported contacts
      setImportedContacts(getImportedContactpersonen(id))
      setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [id])

  async function handleSaveNotitie() {
    if (!klant) return
    setSavingNotitie(true)
    try {
      const updated = await updateKlant(klant.id, { notities: notitie })
      setKlant(updated)
      toast.success('Notitie opgeslagen')
    } catch {
      toast.error('Fout bij opslaan notitie')
    } finally {
      setSavingNotitie(false)
    }
  }

  function openAddContact() {
    setEditingContact(null)
    setContactForm({ naam: '', functie: '', email: '', telefoon: '' })
    setContactDialogOpen(true)
  }

  function openEditContact(contact: Contactpersoon) {
    setEditingContact(contact)
    setContactForm({
      naam: contact.naam,
      functie: contact.functie,
      email: contact.email,
      telefoon: contact.telefoon,
    })
    setContactDialogOpen(true)
  }

  async function handleSaveContact() {
    if (!klant || !contactForm.naam.trim()) return
    const currentContacts = klant.contactpersonen || []

    if (editingContact) {
      // Update existing
      const updated = currentContacts.map((c) =>
        c.id === editingContact.id
          ? { ...c, naam: contactForm.naam.trim(), functie: contactForm.functie.trim(), email: contactForm.email.trim(), telefoon: contactForm.telefoon.trim() }
          : c
      )
      try {
        const updatedKlant = await updateKlant(klant.id, { contactpersonen: updated })
        setKlant(updatedKlant)
        toast.success('Contactpersoon bijgewerkt')
      } catch {
        toast.error('Fout bij bijwerken')
      }
    } else {
      // Add new
      const newContact: Contactpersoon = {
        id: crypto.randomUUID(),
        naam: contactForm.naam.trim(),
        functie: contactForm.functie.trim(),
        email: contactForm.email.trim(),
        telefoon: contactForm.telefoon.trim(),
        is_primair: currentContacts.length === 0,
      }
      try {
        const updatedKlant = await updateKlant(klant.id, {
          contactpersonen: [...currentContacts, newContact],
        })
        setKlant(updatedKlant)
        toast.success('Contactpersoon toegevoegd')
      } catch {
        toast.error('Fout bij toevoegen')
      }
    }
    setContactDialogOpen(false)
  }

  async function handleDeleteContact(contactId: string) {
    if (!klant) return
    const contact = (klant.contactpersonen || []).find((c) => c.id === contactId)
    const naam = contact?.naam || 'deze contactpersoon'
    if (!window.confirm(`Weet je zeker dat je ${naam} wilt verwijderen?`)) return
    const updated = (klant.contactpersonen || []).filter((c) => c.id !== contactId)
    try {
      const updatedKlant = await updateKlant(klant.id, { contactpersonen: updated })
      setKlant(updatedKlant)
      toast.success('Contactpersoon verwijderd')
    } catch {
      toast.error('Fout bij verwijderen')
    }
  }

  // ── Move contactpersoon to another company ──
  async function openMoveDialog(contact: Contactpersoon) {
    setMovingContact(contact)
    setMoveSearch('')
    setSelectedMoveKlant(null)
    setMoveDialogOpen(true)
    try {
      const allKlanten = await getKlanten()
      setMoveKlanten(allKlanten.filter((k) => k.id !== klant?.id))
    } catch {
      toast.error('Fout bij ophalen bedrijven')
    }
  }

  async function handleMoveContact() {
    if (!klant || !movingContact || !selectedMoveKlant) return
    setMoveLoading(true)
    try {
      // Remove from current company
      const currentContacts = (klant.contactpersonen || []).filter((c) => c.id !== movingContact.id)
      // Add to new company
      const targetContacts = [...(selectedMoveKlant.contactpersonen || []), movingContact]
      await Promise.all([
        updateKlant(klant.id, { contactpersonen: currentContacts }),
        updateKlant(selectedMoveKlant.id, { contactpersonen: targetContacts }),
      ])
      // Reload current klant
      const refreshed = await getKlant(klant.id)
      setKlant(refreshed)
      toast.success(`${movingContact.naam} verplaatst naar ${selectedMoveKlant.bedrijfsnaam}`)
      setMoveDialogOpen(false)
    } catch {
      toast.error('Fout bij verplaatsen contactpersoon')
    } finally {
      setMoveLoading(false)
    }
  }

  // ── Vestiging CRUD ──
  function openAddVestiging() {
    setEditingVestiging(null)
    setVestigingForm({ naam: '', adres: '', postcode: '', stad: '', land: 'Nederland' })
    setVestigingDialogOpen(true)
  }

  function openEditVestiging(v: Vestiging) {
    setEditingVestiging(v)
    setVestigingForm({ naam: v.naam, adres: v.adres, postcode: v.postcode, stad: v.stad, land: v.land || 'Nederland' })
    setVestigingDialogOpen(true)
  }

  async function handleSaveVestiging() {
    if (!klant || !vestigingForm.naam.trim()) return
    const current = klant.vestigingen || []

    if (editingVestiging) {
      const updated = current.map((v) =>
        v.id === editingVestiging.id ? { ...v, ...vestigingForm } : v
      )
      try {
        const updatedKlant = await updateKlant(klant.id, { vestigingen: updated })
        setKlant(updatedKlant)
        toast.success('Vestiging bijgewerkt')
      } catch {
        toast.error('Fout bij bijwerken')
      }
    } else {
      const newVestiging: Vestiging = {
        id: crypto.randomUUID(),
        ...vestigingForm,
      }
      try {
        const updatedKlant = await updateKlant(klant.id, {
          vestigingen: [...current, newVestiging],
        })
        setKlant(updatedKlant)
        toast.success('Vestiging toegevoegd')
      } catch {
        toast.error('Fout bij toevoegen')
      }
    }
    setVestigingDialogOpen(false)
  }

  async function handleDeleteVestiging(vestigingId: string) {
    if (!klant) return
    const v = (klant.vestigingen || []).find((x) => x.id === vestigingId)
    if (!window.confirm(`Weet je zeker dat je vestiging "${v?.naam}" wilt verwijderen?`)) return
    const updated = (klant.vestigingen || []).filter((x) => x.id !== vestigingId)
    try {
      const updatedKlant = await updateKlant(klant.id, { vestigingen: updated })
      setKlant(updatedKlant)
      toast.success('Vestiging verwijderd')
    } catch {
      toast.error('Fout bij verwijderen')
    }
  }

  function downloadContactpersonenTemplate() {
    const header = 'naam;functie;email;telefoon;is_primair'
    const voorbeeldRijen = [
      'Jan de Vries;Directeur;jan@bedrijf.nl;+31 6 12345678;ja',
      'Petra Jansen;Inkoper;petra@bedrijf.nl;+31 6 87654321;nee',
    ]
    const csv = [header, ...voorbeeldRijen].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contactpersonen-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !klant) return

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)

    if (lines.length < 2) {
      toast.error('CSV bestand is leeg of heeft geen data rijen')
      if (csvFileRef.current) csvFileRef.current.value = ''
      return
    }

    // Detect separator: if header contains tabs, use tab; if semicolons, use semicolon; else comma
    const headerLine = lines[0]
    const separator = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ','

    const headers = headerLine.split(separator).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))

    // Map headers to fields
    const naamIdx = headers.findIndex((h) => h === 'naam' || h === 'name' || h === 'volledige naam')
    const functieIdx = headers.findIndex((h) => h === 'functie' || h === 'function' || h === 'rol' || h === 'title' || h === 'job title')
    const emailIdx = headers.findIndex((h) => h === 'email' || h === 'e-mail' || h === 'emailadres')
    const telefoonIdx = headers.findIndex((h) => h === 'telefoon' || h === 'phone' || h === 'telefoonnummer' || h === 'tel')
    const primairIdx = headers.findIndex((h) => h === 'is_primair' || h === 'primair' || h === 'primary')

    if (naamIdx === -1) {
      toast.error('CSV moet minimaal een kolom "naam" bevatten')
      if (csvFileRef.current) csvFileRef.current.value = ''
      return
    }

    const currentContacts = klant.contactpersonen || []
    const nieuwContacten: Contactpersoon[] = []
    let skipped = 0

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map((v) => v.trim().replace(/^["']|["']$/g, ''))
      const naam = values[naamIdx]?.trim()
      if (!naam) { skipped++; continue }

      const primairValue = primairIdx >= 0 ? values[primairIdx]?.toLowerCase() : ''
      const isPrimair = ['ja', 'yes', 'true', '1', 'x'].includes(primairValue)

      nieuwContacten.push({
        id: crypto.randomUUID(),
        naam,
        functie: functieIdx >= 0 ? values[functieIdx]?.trim() || '' : '',
        email: emailIdx >= 0 ? values[emailIdx]?.trim() || '' : '',
        telefoon: telefoonIdx >= 0 ? values[telefoonIdx]?.trim() || '' : '',
        is_primair: currentContacts.length === 0 && nieuwContacten.length === 0 ? true : isPrimair,
      })
    }

    if (nieuwContacten.length === 0) {
      toast.error('Geen geldige contactpersonen gevonden in het bestand')
      if (csvFileRef.current) csvFileRef.current.value = ''
      return
    }

    try {
      const updatedKlant = await updateKlant(klant.id, {
        contactpersonen: [...currentContacts, ...nieuwContacten],
      })
      setKlant(updatedKlant)
      toast.success(`${nieuwContacten.length} contactperso${nieuwContacten.length === 1 ? 'on' : 'nen'} geïmporteerd${skipped > 0 ? ` (${skipped} overgeslagen)` : ''}`)
    } catch {
      toast.error('Fout bij importeren contactpersonen')
    }

    if (csvFileRef.current) csvFileRef.current.value = ''
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!klant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-lg text-muted-foreground dark:text-muted-foreground/60">
          Klant niet gevonden
        </p>
        <Button variant="outline" onClick={() => navigate('/klanten')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar klanten
        </Button>
      </div>
    )
  }

  function handleKlantSaved(updatedKlant: Klant) {
    setKlant(updatedKlant)
  }

  const contactpersonen = klant.contactpersonen || []
  const vestigingen = klant.vestigingen || []
  const tabs = [
    { key: 'projecten', label: 'Projecten', count: clientProjecten.length, icon: FolderKanban },
    { key: 'deals', label: 'Deals', count: clientDeals.length, icon: CreditCard },
    { key: 'offertes', label: 'Offertes', count: clientOffertes.length, icon: FileText },
    { key: 'facturen', label: 'Facturen', count: clientFacturen.length, icon: Receipt },
    { key: 'tijdregistratie', label: 'Uren', count: clientTijdregistraties.length, icon: Clock },
    { key: 'communicatie', label: 'Communicatie', count: clientEmails.length, icon: Mail },
    { key: 'documenten', label: 'Documenten', count: clientDocumenten.length, icon: FileIcon },
    { key: 'historie', label: 'Historie', count: 0, icon: History },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <BackButton fallbackPath="/klanten" />
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/klanten')}
          className="mt-1 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-accent dark:text-primary font-display">
              {klant.bedrijfsnaam}
            </h1>
            <Badge className={cn('capitalize', getStatusColor(klant.status))}>
              {klant.status}
            </Badge>
            <button
              onClick={() => setEditDialogOpen(true)}
              className="p-1 rounded hover:bg-muted dark:hover:bg-muted transition-colors"
              title="Bewerken"
            >
              <Pencil className="w-4 h-4 text-muted-foreground/60" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aangemaakt op: <span className="font-mono">{formatDate(klant.created_at)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toevoegen dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Toevoegen
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => navigate(`/projecten/nieuw?klant=${id}`)}
              >
                <FolderKanban className="w-4 h-4 text-primary" />
                Project
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => navigate(`/offertes/nieuw?klant_id=${id}`)}
              >
                <FileText className="w-4 h-4 text-blue-500" />
                Offerte
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => navigate(`/facturen?klant=${id}`)}
              >
                <Receipt className="w-4 h-4 text-emerald-500" />
                Factuur
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => navigate(`/kalender?nieuw=true&klant=${id}`)}
              >
                <CalendarPlus className="w-4 h-4 text-green-500" />
                Afspraak
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => openAddContact()}
              >
                <Users className="w-4 h-4 text-amber-500" />
                Contactpersoon
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Bewerken
          </Button>
        </div>
      </div>

      {/* ── Klant Labels + Waarschuwingen ── */}
      {(klant.klant_labels || []).length > 0 && (
        <div className="space-y-2">
          {/* Waarschuwing banners */}
          {(klant.klant_labels || []).includes('niet_helpen') && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span className="text-sm font-medium">Let op: deze klant heeft het label &quot;Niet helpen&quot;</span>
            </div>
          )}
          {(klant.klant_labels || []).includes('vooruit_betalen') && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span className="text-sm font-medium">Let op: deze klant moet vooruit betalen</span>
            </div>
          )}
          {(klant.klant_labels || []).includes('wanbetaler') && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span className="text-sm font-medium">Let op: deze klant staat geregistreerd als wanbetaler</span>
            </div>
          )}
          {/* Label badges */}
          <div className="flex flex-wrap gap-1.5">
            {(klant.klant_labels || []).map((label) => {
              const colors: Record<string, string> = {
                vooruit_betalen: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                niet_helpen: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                voorrang: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                grote_klant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                wanbetaler: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
              }
              const labels: Record<string, string> = {
                vooruit_betalen: 'Vooruit betalen',
                niet_helpen: 'Niet helpen',
                voorrang: 'Voorrang klant',
                grote_klant: 'Grote klant',
                wanbetaler: 'Wanbetaler',
              }
              return (
                <Badge key={label} className={colors[label] || 'bg-muted text-foreground/70'}>
                  {labels[label] || label}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Gepinde Notitie ── */}
      {klant.gepinde_notitie && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{klant.gepinde_notitie}</p>
        </div>
      )}

      {/* ── Info Cards Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Contactpersonen */}
        <Card className="border-border dark:border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Contactpersonen ({contactpersonen.length + importedContacts.length})
            </CardTitle>
            <button
              onClick={openAddContact}
              className="p-1 rounded hover:bg-muted dark:hover:bg-muted transition-colors"
              title="Contactpersoon toevoegen"
            >
              <Plus className="w-4 h-4 text-muted-foreground/60 hover:text-blue-500" />
            </button>
          </CardHeader>
          <CardContent className="pt-0">
            {(contactpersonen.length + importedContacts.length) > 0 ? (
              <div className="space-y-2">
                {/* Regular contactpersonen */}
                {contactpersonen.slice(0, 2).map((cp) => (
                  <div
                    key={cp.id}
                    className="flex items-center justify-between group cursor-pointer"
                    onClick={() => openEditContact(cp)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {cp.naam}
                        {cp.is_primair && (
                          <span className="ml-1.5 text-[10px] text-blue-500 font-normal">primair</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cp.email || cp.telefoon || cp.functie || '\u2014'}
                      </p>
                    </div>
                    <Pencil className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                ))}
                {/* Imported contactpersonen (show up to 2 total) */}
                {contactpersonen.length < 2 && importedContacts.slice(0, 2 - contactpersonen.length).map((ic) => (
                  <div key={ic.id} className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ic.naam}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ic.email || ic.telefoon || '\u2014'}
                    </p>
                  </div>
                ))}
                {(contactpersonen.length + importedContacts.length) > 2 && (
                  <button
                    onClick={() => setActiveTab('contactpersonen')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Bekijk alle contactpersonen
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Show primary contact from klant */}
                <p className="text-sm font-medium text-foreground">{klant.contactpersoon}</p>
                <p className="text-xs text-muted-foreground">{klant.email}</p>
                <button
                  onClick={openAddContact}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 block"
                >
                  + Contactpersoon toevoegen
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact info + Vestigingen */}
        <Card className="border-border dark:border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" />
              {vestigingen.length > 0 ? `Vestigingen (${vestigingen.length})` : 'Adresgegevens'}
            </CardTitle>
            <button
              onClick={openAddVestiging}
              className="p-1 rounded hover:bg-muted dark:hover:bg-muted transition-colors"
              title="Vestiging toevoegen"
            >
              <Plus className="w-4 h-4 text-muted-foreground/60 hover:text-green-500" />
            </button>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {/* Hoofdvesttiging */}
            <div>
              {klant.adres && <p className="text-sm text-foreground">{klant.adres}</p>}
              <p className="text-sm text-foreground">
                {[klant.postcode, klant.stad].filter(Boolean).join(' ')}
              </p>
              {vestigingen.length === 0 && klant.land && <p className="text-sm text-muted-foreground">{klant.land}</p>}
            </div>
            {/* Extra vestigingen */}
            {vestigingen.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between group cursor-pointer border-t border-border/50 pt-2"
                onClick={() => openEditVestiging(v)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{v.naam}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[v.adres, v.postcode, v.stad].filter(Boolean).join(', ')}
                  </p>
                </div>
                <Pencil className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Financieel */}
        <Card className="border-border dark:border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Financieel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {klant.btw_nummer && (
              <div>
                <p className="text-xs text-muted-foreground">BTW</p>
                <p className="text-sm font-medium font-mono text-foreground">{klant.btw_nummer}</p>
              </div>
            )}
            {klant.kvk_nummer && (
              <div>
                <p className="text-xs text-muted-foreground">KvK</p>
                <p className="text-sm font-medium font-mono text-foreground">{klant.kvk_nummer}</p>
              </div>
            )}
            {!klant.btw_nummer && !klant.kvk_nummer && (
              <p className="text-sm text-muted-foreground">Geen financiele gegevens</p>
            )}
            <button
              onClick={() => setEditDialogOpen(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Bewerk financiele gegevens
            </button>
          </CardContent>
        </Card>

        {/* Opmerking / Quick note */}
        <Card className="border-border dark:border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              Opmerking
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-foreground line-clamp-3">
              {klant.notities || <span className="text-muted-foreground italic">Geen opmerkingen</span>}
            </p>
            <button
              onClick={() => setActiveTab('notities')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 block"
            >
              Bewerk opmerking
            </button>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left: Tabs + Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Tab bar */}
          <div className="flex items-center gap-1 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.key
                      ? 'bg-primary text-white shadow-md shadow-primary/25'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-background text-muted-foreground'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ════════ PROJECTEN TAB ════════ */}
          {activeTab === 'projecten' && (
            <Card>
              {clientProjecten.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <FolderKanban className="w-12 h-12 text-muted-foreground/50 dark:text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Geen projecten voor deze klant</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border dark:border-border">
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Status</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Omschrijving</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label hidden md:table-cell">PM</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label hidden lg:table-cell">Deadline</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Waarde</th>
                        <th className="text-center py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Downloads</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border">
                      {clientProjecten
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((project) => {
                          const isOverdue = new Date(project.eind_datum ?? "") < new Date() && project.status !== 'afgerond'
                          const daysLeft = Math.ceil((new Date(project.eind_datum ?? "").getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                          return (
                            <tr
                              key={project.id}
                              className={cn(
                                'hover:bg-background dark:hover:bg-muted/50 cursor-pointer transition-colors border-l-4',
                                getStatusBorderColor(project.status)
                              )}
                              onClick={() => navigate(`/projecten/${project.id}`)}
                            >
                              {/* Status */}
                              <td className="py-3 px-4">
                                <Badge className={cn('text-xs', getStatusColor(project.status))}>
                                  {statusLabels[project.status] || project.status}
                                </Badge>
                              </td>

                              {/* Omschrijving */}
                              <td className="py-3 px-4">
                                <div>
                                  <p className="text-sm font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    {project.naam}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                    {formatDate(project.start_datum ?? "")}
                                  </p>
                                </div>
                              </td>

                              {/* PM */}
                              <td className="py-3 px-4 hidden md:table-cell">
                                {project.team_leden?.length > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-wm-pale/30 dark:bg-accent/30 flex items-center justify-center flex-shrink-0">
                                      <span className="text-[10px] font-semibold text-accent dark:text-primary">
                                        {project.team_leden[0]?.charAt(0)?.toUpperCase()}
                                      </span>
                                    </div>
                                    <span className="text-sm text-foreground truncate max-w-[120px]">
                                      {project.team_leden[0]}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </td>

                              {/* Deadline */}
                              <td className="py-3 px-4 hidden lg:table-cell">
                                <span className={cn(
                                  'text-sm font-mono',
                                  isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-foreground'
                                )}>
                                  {formatDate(project.eind_datum ?? "")}
                                </span>
                                {project.status !== 'afgerond' && (
                                  <p className={cn(
                                    'text-[10px] mt-0.5',
                                    isOverdue ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground'
                                  )}>
                                    {isOverdue ? `${Math.abs(daysLeft)}d verlopen` : `${daysLeft}d resterend`}
                                  </p>
                                )}
                              </td>

                              {/* Waarde */}
                              <td className="py-3 px-4 text-right">
                                <span className="text-sm font-semibold text-foreground">
                                  {formatCurrency(project.budget)}
                                </span>
                              </td>

                              {/* Downloads */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const headers = ['Veld', 'Waarde']
                                    const rows = [
                                      { Veld: 'Project', Waarde: project.naam },
                                      { Veld: 'Klant', Waarde: klant!.bedrijfsnaam },
                                      { Veld: 'Status', Waarde: statusLabels[project.status] || project.status },
                                      { Veld: 'Budget', Waarde: formatCurrency(project.budget) },
                                      { Veld: 'Besteed', Waarde: formatCurrency(project.besteed) },
                                      { Veld: 'Voortgang', Waarde: project.voortgang + '%' },
                                      { Veld: 'Start', Waarde: formatDate(project.start_datum ?? "") },
                                      { Veld: 'Deadline', Waarde: formatDate(project.eind_datum ?? "") },
                                    ]
                                    exportCSV(project.naam.replace(/\s+/g, '-').toLowerCase(), headers, rows)
                                  }}
                                  className="p-1.5 rounded-md hover:bg-muted dark:hover:bg-muted transition-colors inline-flex"
                                  title="Download CSV"
                                >
                                  <FileText className="w-4 h-4 text-muted-foreground hover:text-blue-600" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ════════ OFFERTES TAB ════════ */}
          {activeTab === 'offertes' && (
            <Card>
              {clientOffertes.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/50 dark:text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Geen offertes voor deze klant</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border dark:border-border">
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Nummer</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Titel</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Status</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Totaal</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label hidden md:table-cell">Geldig tot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border">
                      {clientOffertes.map((offerte) => (
                        <tr
                          key={offerte.id}
                          className="hover:bg-background dark:hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/offertes/${offerte.id}/bewerken`, { state: { from: `/klanten/${id}` } })}
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium font-mono text-blue-600 dark:text-blue-400">
                              {offerte.nummer}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-foreground">{offerte.titel}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={cn('text-xs capitalize', getStatusColor(offerte.status))}>
                              {offerte.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-semibold text-foreground">
                              {formatCurrency(offerte.totaal)}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <span className="text-sm text-muted-foreground font-mono">
                              {formatDate(offerte.geldig_tot)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ════════ DEALS TAB ════════ */}
          {activeTab === 'deals' && (
            <Card>
              {clientDeals.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <CreditCard className="w-12 h-12 text-muted-foreground/50 dark:text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Geen deals voor deze klant</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border dark:border-border">
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Titel</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Fase</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Status</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Waarde</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label hidden md:table-cell">Kans</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border">
                      {clientDeals.map((deal) => (
                        <tr
                          key={deal.id}
                          className="hover:bg-background dark:hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/deals/${deal.id}`)}
                        >
                          <td className="py-3 px-4 text-sm font-medium">{deal.titel}</td>
                          <td className="py-3 px-4 text-sm capitalize text-muted-foreground">{deal.fase}</td>
                          <td className="py-3 px-4">
                            <Badge className={cn('text-xs capitalize',
                              deal.status === 'gewonnen' ? 'bg-emerald-100 text-emerald-700' :
                              deal.status === 'verloren' ? 'bg-red-100 text-red-700' :
                              deal.status === 'on-hold' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            )}>
                              {deal.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-semibold">{formatCurrency(deal.verwachte_waarde)}</td>
                          <td className="py-3 px-4 text-right text-sm text-muted-foreground hidden md:table-cell">{deal.kans_percentage || 50}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ════════ FACTUREN TAB ════════ */}
          {activeTab === 'facturen' && (
            <Card>
              {clientFacturen.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground/50 dark:text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Geen facturen voor deze klant</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border dark:border-border">
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Nummer</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Titel</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Status</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label">Totaal</th>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-[#8a8680] uppercase tracking-label hidden md:table-cell">Datum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border">
                      {clientFacturen.map((factuur) => (
                        <tr key={factuur.id} className="hover:bg-background dark:hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium font-mono text-blue-600 dark:text-blue-400">{factuur.nummer}</span>
                          </td>
                          <td className="py-3 px-4 text-sm">{factuur.titel}</td>
                          <td className="py-3 px-4">
                            <Badge className={cn('text-xs capitalize',
                              factuur.status === 'betaald' ? 'bg-emerald-100 text-emerald-700' :
                              factuur.status === 'vervallen' ? 'bg-red-100 text-red-700' :
                              factuur.status === 'verzonden' ? 'bg-blue-100 text-blue-700' :
                              'bg-muted text-foreground/70'
                            )}>
                              {factuur.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-semibold">{formatCurrency(factuur.totaal)}</td>
                          <td className="py-3 px-4 hidden md:table-cell text-sm text-muted-foreground font-mono">{formatDate(factuur.factuurdatum)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}


          {/* ════════ TIJDREGISTRATIE TAB ════════ */}
          {activeTab === 'tijdregistratie' && (
            <Card>
              {clientTijdregistraties.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <Clock className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nog geen uren geregistreerd</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        {['Datum', 'Project', 'Medewerker', 'Uren', 'Beschrijving'].map((h) => (
                          <th key={h} className="px-4 py-2 text-left text-[11px] font-bold text-[#8a8680] uppercase tracking-label">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {clientTijdregistraties
                        .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
                        .map((t) => (
                        <tr key={t.id} className="hover:bg-muted/50">
                          <td className="px-4 py-2.5 text-sm">{t.datum}</td>
                          <td className="px-4 py-2.5 text-sm">{t.project_naam || '-'}</td>
                          <td className="px-4 py-2.5 text-sm">{t.medewerker_naam || '-'}</td>
                          <td className="px-4 py-2.5 text-sm font-medium">{(t.duur_minuten / 60).toFixed(1)}u</td>
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">{t.omschrijving || '-'}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 font-semibold">
                        <td className="px-4 py-2.5 text-sm" colSpan={3}>Totaal</td>
                        <td className="px-4 py-2.5 text-sm">{(clientTijdregistraties.reduce((s, t) => s + t.duur_minuten, 0) / 60).toFixed(1)}u</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ════════ COMMUNICATIE TAB ════════ */}
          {activeTab === 'communicatie' && (
            <div className="space-y-2">
              {clientEmails.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Mail className="w-12 h-12 text-muted-foreground/50 dark:text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Geen emailcommunicatie gevonden</p>
                  </CardContent>
                </Card>
              ) : (
                clientEmails.map((email) => (
                  <Card
                    key={email.id}
                    className={cn(
                      'cursor-pointer hover:shadow-md transition-shadow',
                      !email.gelezen && 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
                    )}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted dark:bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Mail className="w-4 h-4 text-muted-foreground dark:text-muted-foreground/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(
                              'text-sm truncate',
                              !email.gelezen
                                ? 'font-semibold text-foreground'
                                : 'font-medium text-muted-foreground'
                            )}>
                              {email.onderwerp}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {email.starred && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              )}
                              {email.bijlagen > 0 && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                                  <Paperclip className="w-3.5 h-3.5" />
                                  {email.bijlagen}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Van: {email.van} &middot; {formatDateTime(email.datum)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                            {email.inhoud}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ════════ DOCUMENTEN TAB ════════ */}
          {activeTab === 'documenten' && (
            <div>
              {clientDocumenten.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileIcon className="w-12 h-12 text-muted-foreground/50 dark:text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Geen documenten gevonden</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clientDocumenten.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                            <FileIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.naam}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {doc.map} &middot; <span className="font-mono">{formatDate(doc.updated_at)}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border dark:border-border">
                          <Badge className={cn('text-xs capitalize', getStatusColor(doc.status))}>
                            {doc.status}
                          </Badge>
                          {doc.tags.length > 0 && (
                            <div className="flex gap-1">
                              {doc.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════ CONTACTPERSONEN TAB (hidden tab) ════════ */}
          {activeTab === 'contactpersonen' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Alle Contactpersonen ({contactpersonen.length + importedContacts.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <input
                    ref={csvFileRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    className="hidden"
                    onChange={handleCsvImport}
                  />
                  <Button size="sm" variant="outline" onClick={downloadContactpersonenTemplate}>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Template
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => csvFileRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Importeer CSV
                  </Button>
                  <Button size="sm" onClick={openAddContact}>
                    <Plus className="w-4 h-4 mr-1" />
                    Toevoegen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(contactpersonen.length + importedContacts.length) === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Nog geen contactpersonen</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={openAddContact}>
                        <Plus className="w-4 h-4 mr-1" />
                        Toevoegen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border dark:divide-border">
                    {/* Regular contactpersonen */}
                    {contactpersonen.map((cp) => (
                      <div key={cp.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              {cp.naam.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                              {cp.naam}
                              {cp.is_primair && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Primair</Badge>
                              )}
                              {cp.functie && (
                                <span className="text-xs text-muted-foreground font-normal">({cp.functie})</span>
                              )}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {cp.email && (
                                <a href={`mailto:${cp.email}`} className="flex items-center gap-1 hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                                  <Mail className="w-3 h-3" />
                                  {cp.email}
                                </a>
                              )}
                              {cp.telefoon && (
                                <a href={`tel:${cp.telefoon}`} className="flex items-center gap-1 hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                                  <Phone className="w-3 h-3" />
                                  {cp.telefoon}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditContact(cp)}
                            className="p-1.5 rounded-md hover:bg-muted dark:hover:bg-muted transition-colors"
                            title="Bewerken"
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </button>
                          <button
                            onClick={() => openMoveDialog(cp)}
                            className="p-1.5 rounded-md hover:bg-muted dark:hover:bg-muted transition-colors"
                            title="Verplaats naar ander bedrijf"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(cp.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Imported contactpersonen */}
                    {importedContacts.map((ic) => (
                      <div key={ic.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {ic.naam.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                              {ic.naam}
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Import</Badge>
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {ic.email && (
                                <a href={`mailto:${ic.email}`} className="flex items-center gap-1 hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                                  <Mail className="w-3 h-3" />
                                  {ic.email}
                                </a>
                              )}
                              {ic.telefoon && (
                                <a href={`tel:${ic.telefoon}`} className="flex items-center gap-1 hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                                  <Phone className="w-3 h-3" />
                                  {ic.telefoon}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              if (window.confirm(`${ic.naam} verwijderen?`)) {
                                deleteImportedContactpersoon(ic.id)
                                setImportedContacts((prev) => prev.filter((c) => c.id !== ic.id))
                                toast.success('Contactpersoon verwijderd')
                              }
                            }}
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ════════ HISTORIE TAB ════════ */}
          {activeTab === 'historie' && (
            <KlantHistorieTab klantId={klant.id} klantNaam={klant.bedrijfsnaam} />
          )}

          {/* ════════ NOTITIES TAB (hidden tab) ════════ */}
          {activeTab === 'notities' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="w-4 h-4" />
                  Notities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={notitie}
                  onChange={(e) => setNotitie(e.target.value)}
                  placeholder="Notities over deze klant..."
                  rows={8}
                  className="min-h-[200px]"
                />
                <Button onClick={handleSaveNotitie} disabled={savingNotitie} size="sm">
                  {savingNotitie ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-80 flex-shrink-0 space-y-4">
          {/* Notities */}
          <Card className="border-border dark:border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-500" />
                Notities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Textarea
                value={notitie}
                onChange={(e) => setNotitie(e.target.value)}
                placeholder="Notities over deze klant..."
                rows={5}
                className="text-sm"
              />
              <Button onClick={handleSaveNotitie} disabled={savingNotitie} size="sm" className="w-full">
                {savingNotitie ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="border-border dark:border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-green-500" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {klant.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {klant.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Geen tags toegevoegd</p>
              )}
            </CardContent>
          </Card>

          {/* Export */}
          <Card className="border-border dark:border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-500" />
                Exporteren
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 justify-start"
                onClick={() => {
                  const headers = ['Veld', 'Waarde']
                  const rows = [
                    { Veld: 'Bedrijfsnaam', Waarde: klant.bedrijfsnaam },
                    { Veld: 'Contactpersoon', Waarde: klant.contactpersoon },
                    { Veld: 'Email', Waarde: klant.email },
                    { Veld: 'Telefoon', Waarde: klant.telefoon },
                    { Veld: 'Adres', Waarde: [klant.adres, klant.postcode, klant.stad].filter(Boolean).join(', ') },
                    { Veld: 'KvK', Waarde: klant.kvk_nummer },
                    { Veld: 'BTW', Waarde: klant.btw_nummer },
                    { Veld: 'Status', Waarde: klant.status },
                    { Veld: 'Tags', Waarde: klant.tags.join(', ') },
                  ]
                  exportCSV(klant.bedrijfsnaam.replace(/\s+/g, '-').toLowerCase(), headers, rows)
                }}
              >
                <Download className="w-4 h-4" />
                Klantgegevens CSV
              </Button>
              {clientProjecten.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 justify-start"
                  onClick={() => {
                    const headers = ['Project', 'Status', 'Budget', 'Besteed', 'Voortgang', 'Deadline']
                    const rows = clientProjecten.map((p) => ({
                      Project: p.naam,
                      Status: statusLabels[p.status] || p.status,
                      Budget: p.budget,
                      Besteed: p.besteed,
                      Voortgang: p.voortgang + '%',
                      Deadline: formatDate(p.eind_datum ?? ""),
                    }))
                    exportExcel(
                      `${klant.bedrijfsnaam.replace(/\s+/g, '-').toLowerCase()}-projecten`,
                      headers,
                      rows,
                      'Projecten'
                    )
                  }}
                >
                  <FileText className="w-4 h-4" />
                  Projecten Excel
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <AddEditClient
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        klant={klant}
        onSaved={handleKlantSaved}
      />

      {/* Contact person dialog */}
      {/* Vestiging dialog */}
      <Dialog open={vestigingDialogOpen} onOpenChange={setVestigingDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingVestiging ? 'Vestiging bewerken' : 'Vestiging toevoegen'}
            </DialogTitle>
            <DialogDescription>
              {editingVestiging
                ? 'Pas de gegevens van de vestiging aan.'
                : 'Voeg een extra vestiging toe aan dit bedrijf.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vest-naam">Naam <span className="text-red-500">*</span></Label>
              <Input
                id="vest-naam"
                value={vestigingForm.naam}
                onChange={(e) => setVestigingForm((f) => ({ ...f, naam: e.target.value }))}
                placeholder="Bijv. Vestiging Amsterdam, Productiehal Zuid"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vest-adres">Adres</Label>
              <Input
                id="vest-adres"
                value={vestigingForm.adres}
                onChange={(e) => setVestigingForm((f) => ({ ...f, adres: e.target.value }))}
                placeholder="Straatnaam 123"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vest-postcode">Postcode</Label>
                <Input
                  id="vest-postcode"
                  value={vestigingForm.postcode}
                  onChange={(e) => setVestigingForm((f) => ({ ...f, postcode: e.target.value }))}
                  placeholder="1234 AB"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="vest-stad">Stad</Label>
                <Input
                  id="vest-stad"
                  value={vestigingForm.stad}
                  onChange={(e) => setVestigingForm((f) => ({ ...f, stad: e.target.value }))}
                  placeholder="Amsterdam"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {editingVestiging && (
              <Button
                variant="destructive"
                onClick={() => { handleDeleteVestiging(editingVestiging.id); setVestigingDialogOpen(false) }}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Verwijderen
              </Button>
            )}
            <Button variant="outline" onClick={() => setVestigingDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSaveVestiging} disabled={!vestigingForm.naam.trim()}>
              {editingVestiging ? 'Bijwerken' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Contactpersoon bewerken' : 'Contactpersoon toevoegen'}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? 'Pas de gegevens van de contactpersoon aan.'
                : 'Voeg een nieuwe contactpersoon toe aan dit bedrijf.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cp-naam">Naam <span className="text-red-500">*</span></Label>
                <Input
                  id="cp-naam"
                  value={contactForm.naam}
                  onChange={(e) => setContactForm((f) => ({ ...f, naam: e.target.value }))}
                  placeholder="Volledige naam"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-functie">Functie</Label>
                <Input
                  id="cp-functie"
                  value={contactForm.functie}
                  onChange={(e) => setContactForm((f) => ({ ...f, functie: e.target.value }))}
                  placeholder="Bijv. Directeur, Inkoper"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cp-email">Email</Label>
                <Input
                  id="cp-email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@bedrijf.nl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-telefoon">Telefoon</Label>
                <Input
                  id="cp-telefoon"
                  type="tel"
                  value={contactForm.telefoon}
                  onChange={(e) => setContactForm((f) => ({ ...f, telefoon: e.target.value }))}
                  placeholder="+31 6 12345678"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSaveContact} disabled={!contactForm.naam.trim()}>
              {editingContact ? 'Bijwerken' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move contactpersoon dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Verplaats {movingContact?.naam || 'contactpersoon'} naar ander bedrijf
            </DialogTitle>
            <DialogDescription>
              Zoek een bedrijf om deze contactpersoon naartoe te verplaatsen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Zoek bedrijf..."
              value={moveSearch}
              onChange={(e) => {
                setMoveSearch(e.target.value)
                setSelectedMoveKlant(null)
              }}
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {moveKlanten
                .filter((k) =>
                  k.bedrijfsnaam.toLowerCase().includes(moveSearch.toLowerCase())
                )
                .slice(0, 8)
                .map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setSelectedMoveKlant(k)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      selectedMoveKlant?.id === k.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted dark:hover:bg-muted'
                    )}
                  >
                    <p className="font-medium">{k.bedrijfsnaam}</p>
                    {k.contactpersoon && (
                      <p className={cn(
                        'text-xs',
                        selectedMoveKlant?.id === k.id
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}>{k.contactpersoon}</p>
                    )}
                  </button>
                ))}
              {moveKlanten.filter((k) =>
                k.bedrijfsnaam.toLowerCase().includes(moveSearch.toLowerCase())
              ).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Geen bedrijven gevonden
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleMoveContact}
              disabled={!selectedMoveKlant || moveLoading}
            >
              {moveLoading ? 'Verplaatsen...' : 'Verplaatsen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
