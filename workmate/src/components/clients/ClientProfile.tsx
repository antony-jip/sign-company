import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
  getProjectenByKlant,
  getEmails,
  getDocumenten,
  getOffertes,
  getFacturen,
  getDealsByKlant,
  updateKlant,
} from '@/services/supabaseService'
import { AddEditClient } from './AddEditClient'
import type { Klant, Project, Email, Document as DocType, Offerte, Contactpersoon, Factuur, Deal } from '@/types'

function getStatusBarColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-green-500'
    case 'gepland': return 'bg-primary'
    case 'in-review': return 'bg-amber-500'
    case 'afgerond': return 'bg-emerald-500'
    case 'on-hold': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
}

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'actief': return 'border-l-green-500'
    case 'gepland': return 'border-l-primary'
    case 'in-review': return 'border-l-amber-500'
    case 'afgerond': return 'border-l-emerald-500'
    case 'on-hold': return 'border-l-red-500'
    default: return 'border-l-gray-400'
  }
}

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
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
  const [clientOffertes, setClientOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('projecten')
  const [notitie, setNotitie] = useState('')
  const [savingNotitie, setSavingNotitie] = useState(false)
  // Contact person form
  const [editingContact, setEditingContact] = useState<Contactpersoon | null>(null)
  const [contactForm, setContactForm] = useState({ naam: '', functie: '', email: '', telefoon: '' })

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    Promise.all([
      getKlant(id),
      getProjectenByKlant(id),
      getEmails(),
      getDocumenten(),
      getOffertes(),
      getFacturen().catch(() => []),
      getDealsByKlant(id).catch(() => []),
    ]).then(([klantData, projecten, allEmails, allDocs, allOffertes, allFacturen, deals]) => {
      setKlant(klantData)
      setClientProjecten(projecten)
      setNotitie(klantData?.notities || '')
      if (klantData) {
        const email = klantData.email.toLowerCase()
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
      setIsLoading(false)
    })
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
    const updated = (klant.contactpersonen || []).filter((c) => c.id !== contactId)
    try {
      const updatedKlant = await updateKlant(klant.id, { contactpersonen: updated })
      setKlant(updatedKlant)
      toast.success('Contactpersoon verwijderd')
    } catch {
      toast.error('Fout bij verwijderen')
    }
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
        <p className="text-lg text-gray-500 dark:text-gray-400">
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
  const tabs = [
    { key: 'projecten', label: 'Projecten', count: clientProjecten.length, icon: FolderKanban },
    { key: 'deals', label: 'Deals', count: clientDeals.length, icon: CreditCard },
    { key: 'offertes', label: 'Offertes', count: clientOffertes.length, icon: FileText },
    { key: 'facturen', label: 'Facturen', count: clientFacturen.length, icon: Receipt },
    { key: 'communicatie', label: 'Communicatie', count: clientEmails.length, icon: Mail },
    { key: 'documenten', label: 'Documenten', count: clientDocumenten.length, icon: FileIcon },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
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
            <h1 className="text-2xl font-bold text-accent dark:text-primary font-display">
              {klant.bedrijfsnaam}
            </h1>
            <Badge className={cn('capitalize', getStatusColor(klant.status))}>
              {klant.status}
            </Badge>
            <button
              onClick={() => setEditDialogOpen(true)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Bewerken"
            >
              <Pencil className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aangemaakt op: {formatDate(klant.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toevoegen dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-to-r from-accent to-primary hover:from-accent hover:to-wm-hover shadow-lg shadow-primary/25 border-0">
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
                onClick={() => navigate(`/offertes/nieuw?klant=${id}`)}
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

      {/* ── Info Cards Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Contactpersonen */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Contactpersonen ({contactpersonen.length})
            </CardTitle>
            <button
              onClick={openAddContact}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Contactpersoon toevoegen"
            >
              <Plus className="w-4 h-4 text-gray-400 hover:text-blue-500" />
            </button>
          </CardHeader>
          <CardContent className="pt-0">
            {contactpersonen.length > 0 ? (
              <div className="space-y-2">
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
                        {cp.email || cp.telefoon || cp.functie || '—'}
                      </p>
                    </div>
                    <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                ))}
                {contactpersonen.length > 2 && (
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

        {/* Contact info */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" />
              Adresgegevens
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {klant.adres && <p className="text-sm text-foreground">{klant.adres}</p>}
            <p className="text-sm text-foreground">
              {[klant.postcode, klant.stad].filter(Boolean).join(' ')}
            </p>
            {klant.land && <p className="text-sm text-muted-foreground">{klant.land}</p>}
            {klant.telefoon && (
              <p className="text-sm text-foreground">{klant.telefoon}</p>
            )}
            {klant.website && (
              <a
                href={klant.website.startsWith('http') ? klant.website : `https://${klant.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline block mt-1"
              >
                {klant.website}
              </a>
            )}
          </CardContent>
        </Card>

        {/* Financieel */}
        <Card className="border-gray-200 dark:border-gray-800">
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
                <p className="text-sm font-medium text-foreground">{klant.btw_nummer}</p>
              </div>
            )}
            {klant.kvk_nummer && (
              <div>
                <p className="text-xs text-muted-foreground">KvK</p>
                <p className="text-sm font-medium text-foreground">{klant.kvk_nummer}</p>
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
        <Card className="border-gray-200 dark:border-gray-800">
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
                  <FolderKanban className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">Geen projecten voor deze klant</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Omschrijving</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">PM</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Deadline</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waarde</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Downloads</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {clientProjecten
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((project) => {
                          const isOverdue = new Date(project.eind_datum) < new Date() && project.status !== 'afgerond'
                          const daysLeft = Math.ceil((new Date(project.eind_datum).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                          return (
                            <tr
                              key={project.id}
                              className={cn(
                                'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors border-l-4',
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
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDate(project.start_datum)}
                                  </p>
                                </div>
                              </td>

                              {/* PM */}
                              <td className="py-3 px-4 hidden md:table-cell">
                                {project.team_leden.length > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-wm-pale/30 dark:bg-accent/30 flex items-center justify-center flex-shrink-0">
                                      <span className="text-[10px] font-semibold text-accent dark:text-primary">
                                        {project.team_leden[0].charAt(0).toUpperCase()}
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
                                  'text-sm',
                                  isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-foreground'
                                )}>
                                  {formatDate(project.eind_datum)}
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
                                      { Veld: 'Start', Waarde: formatDate(project.start_datum) },
                                      { Veld: 'Deadline', Waarde: formatDate(project.eind_datum) },
                                    ]
                                    exportCSV(project.naam.replace(/\s+/g, '-').toLowerCase(), headers, rows)
                                  }}
                                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-flex"
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
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">Geen offertes voor deze klant</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nummer</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Titel</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Totaal</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Geldig tot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {clientOffertes.map((offerte) => (
                        <tr
                          key={offerte.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/offertes/${offerte.id}`)}
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
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
                            <span className="text-sm text-muted-foreground">
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
                  <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">Geen deals voor deze klant</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Titel</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fase</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waarde</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Kans</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {clientDeals.map((deal) => (
                        <tr
                          key={deal.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
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
                  <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">Geen facturen voor deze klant</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nummer</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Titel</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Totaal</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Datum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {clientFacturen.map((factuur) => (
                        <tr key={factuur.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{factuur.nummer}</span>
                          </td>
                          <td className="py-3 px-4 text-sm">{factuur.titel}</td>
                          <td className="py-3 px-4">
                            <Badge className={cn('text-xs capitalize',
                              factuur.status === 'betaald' ? 'bg-emerald-100 text-emerald-700' :
                              factuur.status === 'vervallen' ? 'bg-red-100 text-red-700' :
                              factuur.status === 'verzonden' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            )}>
                              {factuur.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-semibold">{formatCurrency(factuur.totaal)}</td>
                          <td className="py-3 px-4 hidden md:table-cell text-sm text-muted-foreground">{formatDate(factuur.factuurdatum)}</td>
                        </tr>
                      ))}
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
                    <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
                                <div className="flex items-center gap-1 text-xs text-gray-400">
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
                    <FileIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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
                              {doc.map} &middot; {formatDate(doc.updated_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
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
                  Alle Contactpersonen ({contactpersonen.length})
                </CardTitle>
                <Button size="sm" onClick={openAddContact}>
                  <Plus className="w-4 h-4 mr-1" />
                  Toevoegen
                </Button>
              </CardHeader>
              <CardContent>
                {contactpersonen.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Nog geen contactpersonen toegevoegd</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={openAddContact}>
                      <Plus className="w-4 h-4 mr-1" />
                      Eerste contactpersoon toevoegen
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
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
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {cp.email}
                                </span>
                              )}
                              {cp.telefoon && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {cp.telefoon}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditContact(cp)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Bewerken"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(cp.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
          <Card className="border-gray-200 dark:border-gray-800">
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
          <Card className="border-gray-200 dark:border-gray-800">
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
          <Card className="border-gray-200 dark:border-gray-800">
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
                      Deadline: formatDate(p.eind_datum),
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
    </div>
  )
}
