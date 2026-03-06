import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  UserPlus,
  Check,
  Mail,
  Phone,
  Building2,
  Banknote,
  MessageSquare,
  Calendar,
  Newspaper,
  AlertCircle,
  Users,
  Link2,
  ExternalLink,
  ArrowLeft,
  Globe,
  MapPin,
  Hash,
  Tag,
  FileText,
  Loader2,
  Sparkles,
  FolderPlus,
  ListPlus,
  FileSignature,
  TrendingUp,
  ArrowRight,
  Zap,
} from 'lucide-react'
import { getInitials, cn } from '@/lib/utils'
import type { EmailContact } from '@/utils/emailUtils'

export interface ConversationParticipant {
  name: string
  email: string
  role: 'van' | 'aan'
}

export interface AddCustomerData {
  bedrijfsnaam: string
  contactpersoon: string
  email: string
  telefoon: string
  adres: string
  postcode: string
  stad: string
  land: string
  website: string
  kvk_nummer: string
  btw_nummer: string
  status: 'actief' | 'inactief' | 'prospect'
  tags: string[]
  notities: string
  nieuwsbrief: boolean
}

export interface QuickProjectData {
  naam: string
  beschrijving: string
  klant_id?: string
}

export interface QuickDealData {
  titel: string
  beschrijving: string
  verwachte_waarde: number
  klant_id: string
}

export interface QuickTaskData {
  titel: string
  beschrijving: string
}

interface ContactSidebarProps {
  contact: EmailContact | null
  senderName: string
  senderEmail: string
  senderCompany?: string
  emailSubject?: string
  participants?: ConversationParticipant[]
  onAddCustomer: (email: string, data?: AddCustomerData) => void
  onSubscribeNewsletter: (email: string) => void
  onCreateProject?: (data: QuickProjectData) => void
  onCreateTask?: (data: QuickTaskData) => void
  onCreateDeal?: (data: QuickDealData) => void
  onNavigateToOfferte?: (klantId?: string) => void
  /** ID of the klant that was just created from this email (for chaining actions) */
  recentlyCreatedKlantId?: string | null
  width?: number
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-primary', 'bg-emerald-500', 'bg-[#4A442D]', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-accent', 'bg-pink-500',
  ]
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[index]
}

function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    klant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    prospect: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    leverancier: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    partner: 'bg-wm-pale/30 text-accent dark:bg-accent/30 dark:text-wm-light',
    klacht: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    overheid: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
    particulier: 'bg-muted text-foreground/70 dark:bg-foreground/80 dark:text-muted-foreground/50',
  }
  return colors[tag] || 'bg-muted text-muted-foreground dark:bg-foreground/80 dark:text-muted-foreground/60'
}

function getDealStatusColor(status: string): string {
  const colors: Record<string, string> = {
    won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    lost: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  }
  return colors[status] || 'bg-muted text-muted-foreground'
}

function getDealStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    won: 'Gewonnen',
    open: 'Open',
    pending: 'In afwachting',
    lost: 'Verloren',
  }
  return labels[status] || status
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'email': return <Mail className="w-3 h-3" />
    case 'call': return <Phone className="w-3 h-3" />
    case 'meeting': return <Calendar className="w-3 h-3" />
    default: return <MessageSquare className="w-3 h-3" />
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case 'email': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
    case 'call': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
    case 'meeting': return 'bg-wm-pale/30 text-accent dark:bg-accent/30 dark:text-primary'
    default: return 'bg-muted text-muted-foreground'
  }
}

// ─── Compact Input Row ──────────────────────────────────────────────
function FormField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </Label>
      {children}
    </div>
  )
}

// ─── Add Contact Form ───────────────────────────────────────────────
function AddContactForm({
  senderName,
  senderEmail,
  onSave,
  onCancel,
}: {
  senderName: string
  senderEmail: string
  onSave: (data: AddCustomerData) => void
  onCancel: () => void
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<AddCustomerData>({
    bedrijfsnaam: '',
    contactpersoon: senderName,
    email: senderEmail,
    telefoon: '',
    adres: '',
    postcode: '',
    stad: '',
    land: 'Nederland',
    website: '',
    kvk_nummer: '',
    btw_nummer: '',
    status: 'prospect',
    tags: [],
    notities: '',
    nieuwsbrief: false,
  })

  const availableTags = ['klant', 'prospect', 'leverancier', 'partner', 'particulier']

  const update = useCallback((field: keyof AddCustomerData, value: string | string[] | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }))
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      onSave(form)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <button
          onClick={onCancel}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">Contact toevoegen</h3>
          </div>
        </div>
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">

          {/* Avatar + Name preview */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0',
              getAvatarColor(form.contactpersoon || senderName)
            )}>
              {getInitials(form.contactpersoon || senderName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {form.contactpersoon || senderName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{form.email}</p>
            </div>
            <div className="flex-shrink-0">
              <Badge variant="secondary" className={cn(
                'text-[10px]',
                form.status === 'actief' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
                form.status === 'prospect' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                form.status === 'inactief' && 'bg-muted text-muted-foreground dark:bg-foreground/80 dark:text-muted-foreground/60',
              )}>
                {form.status}
              </Badge>
            </div>
          </div>

          {/* ── Persoonlijke gegevens ── */}
          <div>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3 text-primary" />
              </span>
              Persoonlijk
            </h4>
            <div className="space-y-2">
              <FormField icon={Users} label="Contactpersoon">
                <Input
                  value={form.contactpersoon}
                  onChange={e => update('contactpersoon', e.target.value)}
                  placeholder="Naam"
                  className="h-8 text-sm"
                />
              </FormField>
              <FormField icon={Mail} label="E-mailadres">
                <Input
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="email@voorbeeld.nl"
                  type="email"
                  className="h-8 text-sm"
                />
              </FormField>
              <FormField icon={Phone} label="Telefoon">
                <Input
                  value={form.telefoon}
                  onChange={e => update('telefoon', e.target.value)}
                  placeholder="+31 6 12345678"
                  type="tel"
                  className="h-8 text-sm"
                />
              </FormField>
            </div>
          </div>

          <Separator />

          {/* ── Bedrijfsgegevens ── */}
          <div>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3 h-3 text-amber-600" />
              </span>
              Bedrijf
            </h4>
            <div className="space-y-2">
              <FormField icon={Building2} label="Bedrijfsnaam">
                <Input
                  value={form.bedrijfsnaam}
                  onChange={e => update('bedrijfsnaam', e.target.value)}
                  placeholder="Bedrijfsnaam"
                  className="h-8 text-sm"
                />
              </FormField>
              <FormField icon={Globe} label="Website">
                <Input
                  value={form.website}
                  onChange={e => update('website', e.target.value)}
                  placeholder="www.voorbeeld.nl"
                  className="h-8 text-sm"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField icon={Hash} label="KVK">
                  <Input
                    value={form.kvk_nummer}
                    onChange={e => update('kvk_nummer', e.target.value)}
                    placeholder="12345678"
                    className="h-8 text-sm"
                  />
                </FormField>
                <FormField icon={Hash} label="BTW">
                  <Input
                    value={form.btw_nummer}
                    onChange={e => update('btw_nummer', e.target.value)}
                    placeholder="NL000000000B01"
                    className="h-8 text-sm"
                  />
                </FormField>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Adres ── */}
          <div>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3 h-3 text-blue-500" />
              </span>
              Adres
            </h4>
            <div className="space-y-2">
              <FormField icon={MapPin} label="Straat + huisnummer">
                <Input
                  value={form.adres}
                  onChange={e => update('adres', e.target.value)}
                  placeholder="Straatnaam 1"
                  className="h-8 text-sm"
                />
              </FormField>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <FormField icon={MapPin} label="Postcode">
                    <Input
                      value={form.postcode}
                      onChange={e => update('postcode', e.target.value)}
                      placeholder="1234 AB"
                      className="h-8 text-sm"
                    />
                  </FormField>
                </div>
                <div className="col-span-3">
                  <FormField icon={MapPin} label="Stad">
                    <Input
                      value={form.stad}
                      onChange={e => update('stad', e.target.value)}
                      placeholder="Amsterdam"
                      className="h-8 text-sm"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Status & Tags ── */}
          <div>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Tag className="w-3 h-3 text-emerald-500" />
              </span>
              Classificatie
            </h4>
            <div className="space-y-3">
              <FormField icon={Sparkles} label="Status">
                <Select value={form.status} onValueChange={v => update('status', v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="actief">Actief</SelectItem>
                    <SelectItem value="inactief">Inactief</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all',
                        form.tags.includes(tag)
                          ? getTagColor(tag)
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Nieuwsbrief ── */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Newspaper className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nieuwsbrief</p>
                <p className="text-[11px] text-muted-foreground">Abonneren op mailinglijst</p>
              </div>
            </div>
            <Switch
              checked={form.nieuwsbrief}
              onCheckedChange={v => update('nieuwsbrief', v)}
            />
          </div>

          {/* ── Notities ── */}
          <FormField icon={FileText} label="Notities">
            <Textarea
              value={form.notities}
              onChange={e => update('notities', e.target.value)}
              placeholder="Extra opmerkingen over dit contact..."
              className="text-sm min-h-[60px] resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="p-3 border-t bg-muted/10 space-y-2">
        <Button
          onClick={handleSave}
          disabled={!form.contactpersoon.trim() || !form.email.trim() || isSaving}
          className="w-full gap-2"
          size="sm"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Opslaan...</>
          ) : (
            <><Check className="w-4 h-4" />Contact opslaan</>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full text-muted-foreground"
          size="sm"
        >
          Annuleren
        </Button>
      </div>
    </div>
  )
}

// ─── Quick Project Form ─────────────────────────────────────────────
function QuickProjectForm({
  emailSubject,
  onSave,
  onCancel,
}: {
  emailSubject?: string
  onSave: (data: QuickProjectData) => void
  onCancel: () => void
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [naam, setNaam] = useState(emailSubject ? `Project: ${emailSubject}` : '')
  const [beschrijving, setBeschrijving] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      onSave({ naam, beschrijving })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-gradient-to-r from-blue-500/5 to-transparent">
        <button onClick={onCancel} className="p-1 rounded-md hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <h3 className="text-sm font-semibold text-foreground truncate">Project aanmaken</h3>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <FormField icon={FolderPlus} label="Projectnaam">
            <Input
              value={naam}
              onChange={e => setNaam(e.target.value)}
              placeholder="Bijv. Gevelreclame Bakkerij Jansen"
              className="h-8 text-sm"
              autoFocus
            />
          </FormField>
          <FormField icon={FileText} label="Omschrijving">
            <Textarea
              value={beschrijving}
              onChange={e => setBeschrijving(e.target.value)}
              placeholder="Korte beschrijving van het project..."
              className="text-sm min-h-[80px] resize-none"
              rows={3}
            />
          </FormField>
          <div className="bg-muted/50 rounded-lg p-2.5 text-[11px] text-muted-foreground">
            <Zap className="w-3 h-3 inline mr-1 text-amber-500" />
            Het project wordt automatisch gekoppeld aan de klant uit deze email.
          </div>
        </div>
      </ScrollArea>
      <div className="p-3 border-t bg-muted/10 space-y-2">
        <Button
          onClick={handleSave}
          disabled={!naam.trim() || isSaving}
          className="w-full gap-2"
          size="sm"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Aanmaken...</>
          ) : (
            <><FolderPlus className="w-4 h-4" />Project aanmaken</>
          )}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="w-full text-muted-foreground" size="sm">
          Annuleren
        </Button>
      </div>
    </div>
  )
}

// ─── Quick Task Form ────────────────────────────────────────────────
function QuickTaskForm({
  emailSubject,
  senderName,
  onSave,
  onCancel,
}: {
  emailSubject?: string
  senderName: string
  onSave: (data: QuickTaskData) => void
  onCancel: () => void
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [titel, setTitel] = useState(emailSubject ? `Opvolgen: ${emailSubject}` : '')
  const [beschrijving, setBeschrijving] = useState(
    `Opvolgen email van ${senderName}`
  )

  const handleSave = async () => {
    setIsSaving(true)
    try {
      onSave({ titel, beschrijving })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-gradient-to-r from-amber-500/5 to-transparent">
        <button onClick={onCancel} className="p-1 rounded-md hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <ListPlus className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <h3 className="text-sm font-semibold text-foreground truncate">Taak toevoegen</h3>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <FormField icon={ListPlus} label="Taak">
            <Input
              value={titel}
              onChange={e => setTitel(e.target.value)}
              placeholder="Bijv. Offerte uitbrengen voor..."
              className="h-8 text-sm"
              autoFocus
            />
          </FormField>
          <FormField icon={FileText} label="Toelichting">
            <Textarea
              value={beschrijving}
              onChange={e => setBeschrijving(e.target.value)}
              placeholder="Extra context..."
              className="text-sm min-h-[60px] resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </ScrollArea>
      <div className="p-3 border-t bg-muted/10 space-y-2">
        <Button
          onClick={handleSave}
          disabled={!titel.trim() || isSaving}
          className="w-full gap-2"
          size="sm"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Opslaan...</>
          ) : (
            <><ListPlus className="w-4 h-4" />Taak aanmaken</>
          )}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="w-full text-muted-foreground" size="sm">
          Annuleren
        </Button>
      </div>
    </div>
  )
}

// ─── Quick Deal Form ────────────────────────────────────────────────
function QuickDealForm({
  emailSubject,
  senderName,
  senderCompany,
  onSave,
  onCancel,
}: {
  emailSubject?: string
  senderName: string
  senderCompany?: string
  onSave: (data: Omit<QuickDealData, 'klant_id'>) => void
  onCancel: () => void
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [titel, setTitel] = useState(
    emailSubject || (senderCompany ? `Deal ${senderCompany}` : `Deal ${senderName}`)
  )
  const [beschrijving, setBeschrijving] = useState('')
  const [waarde, setWaarde] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      onSave({
        titel,
        beschrijving,
        verwachte_waarde: parseFloat(waarde) || 0,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-gradient-to-r from-emerald-500/5 to-transparent">
        <button onClick={onCancel} className="p-1 rounded-md hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <h3 className="text-sm font-semibold text-foreground truncate">Deal aanmaken</h3>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <FormField icon={TrendingUp} label="Dealnaam">
            <Input
              value={titel}
              onChange={e => setTitel(e.target.value)}
              placeholder="Bijv. Lichtreclame Restaurant De Smit"
              className="h-8 text-sm"
              autoFocus
            />
          </FormField>
          <FormField icon={Banknote} label="Verwachte waarde">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">&euro;</span>
              <Input
                value={waarde}
                onChange={e => setWaarde(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="0,00"
                className="h-8 text-sm pl-7"
                type="text"
                inputMode="decimal"
              />
            </div>
          </FormField>
          <FormField icon={FileText} label="Omschrijving">
            <Textarea
              value={beschrijving}
              onChange={e => setBeschrijving(e.target.value)}
              placeholder="Korte omschrijving van de deal..."
              className="text-sm min-h-[60px] resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </ScrollArea>
      <div className="p-3 border-t bg-muted/10 space-y-2">
        <Button
          onClick={handleSave}
          disabled={!titel.trim() || isSaving}
          className="w-full gap-2"
          size="sm"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Aanmaken...</>
          ) : (
            <><TrendingUp className="w-4 h-4" />Deal aanmaken</>
          )}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="w-full text-muted-foreground" size="sm">
          Annuleren
        </Button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// ─── Main ContactSidebar ─────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

export function ContactSidebar({
  contact,
  senderName,
  senderEmail,
  senderCompany,
  emailSubject,
  participants = [],
  onAddCustomer,
  onSubscribeNewsletter,
  onCreateProject,
  onCreateTask,
  onCreateDeal,
  onNavigateToOfferte,
  recentlyCreatedKlantId,
  width,
}: ContactSidebarProps) {
  type SidebarView = 'main' | 'addContact' | 'addProject' | 'addTask' | 'addDeal'
  const [view, setView] = useState<SidebarView>('main')

  const uniqueParticipants = participants.length > 0
    ? participants
    : [{ name: senderName, email: senderEmail, role: 'van' as const }]

  const linkedDeal = contact?.deals?.find((d) => d.status === 'open' || d.status === 'pending')

  const handleSaveContact = useCallback((data: AddCustomerData) => {
    onAddCustomer(data.email, data)
    if (data.nieuwsbrief) {
      onSubscribeNewsletter(data.email)
    }
    setView('main')
  }, [onAddCustomer, onSubscribeNewsletter])

  const handleSaveProject = useCallback((data: QuickProjectData) => {
    onCreateProject?.({ ...data, klant_id: recentlyCreatedKlantId || undefined })
    setView('main')
  }, [onCreateProject, recentlyCreatedKlantId])

  const handleSaveTask = useCallback((data: QuickTaskData) => {
    onCreateTask?.(data)
    setView('main')
  }, [onCreateTask])

  const handleSaveDeal = useCallback((data: Omit<QuickDealData, 'klant_id'>) => {
    if (recentlyCreatedKlantId) {
      onCreateDeal?.({ ...data, klant_id: recentlyCreatedKlantId })
    }
    setView('main')
  }, [onCreateDeal, recentlyCreatedKlantId])

  const containerProps = {
    className: "flex-shrink-0 flex flex-col bg-muted/30",
    style: { width: width ?? 290 },
  }

  // ── Sub-views ──
  if (view === 'addContact') {
    return (
      <div {...containerProps}>
        <AddContactForm
          senderName={senderName}
          senderEmail={senderEmail}
          onSave={handleSaveContact}
          onCancel={() => setView('main')}
        />
      </div>
    )
  }

  if (view === 'addProject') {
    return (
      <div {...containerProps}>
        <QuickProjectForm
          emailSubject={emailSubject}
          onSave={handleSaveProject}
          onCancel={() => setView('main')}
        />
      </div>
    )
  }

  if (view === 'addTask') {
    return (
      <div {...containerProps}>
        <QuickTaskForm
          emailSubject={emailSubject}
          senderName={senderName}
          onSave={handleSaveTask}
          onCancel={() => setView('main')}
        />
      </div>
    )
  }

  if (view === 'addDeal') {
    return (
      <div {...containerProps}>
        <QuickDealForm
          emailSubject={emailSubject}
          senderName={senderName}
          senderCompany={senderCompany}
          onSave={handleSaveDeal}
          onCancel={() => setView('main')}
        />
      </div>
    )
  }

  // ── Normal Sidebar View ──
  return (
    <div
      className="flex-shrink-0 flex flex-col bg-muted/30"
      style={{ width: width ?? 290 }}
    >
      <ScrollArea className="flex-1">
        <div className="p-4">

          {/* ── MENSEN IN DEZE CONVERSATIE ── */}
          <div className="mb-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3 text-primary" />
              </span>
              {uniqueParticipants.length} mensen in deze conversatie
            </h4>
            <div className="space-y-2.5">
              {uniqueParticipants.map((p) => (
                <div key={p.email} className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${getAvatarColor(p.name)}`}>
                    {getInitials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-3" />

          {/* ── GEKOPPELDE LEAD ── */}
          {linkedDeal && (
            <>
              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Link2 className="w-3 h-3 text-blue-500" />
                  </span>
                  Gekoppelde lead
                </h4>
                <div className="bg-background rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-foreground truncate flex-1">{linkedDeal.name}</span>
                    <button className="text-muted-foreground hover:text-blue-600 transition-colors ml-2 flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{linkedDeal.value}</span>
                    <Badge variant="secondary" className={`text-[10px] ${getDealStatusColor(linkedDeal.status)}`}>
                      {getDealStatusLabel(linkedDeal.status)}
                    </Badge>
                  </div>
                  {senderCompany && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      {senderCompany}
                    </div>
                  )}
                </div>
              </div>
              <Separator className="my-3" />
            </>
          )}

          {/* ── CONTACT DETAILS ── */}
          <div className="mb-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-3 h-3 text-primary" />
              </span>
              Contactgegevens
            </h4>

            <div className="text-center mb-3">
              <div className="flex justify-center mb-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base ${getAvatarColor(senderName)}`}>
                  {getInitials(senderName)}
                </div>
              </div>
              <h3 className="font-semibold text-foreground text-sm">{senderName}</h3>
              <p className="text-xs text-muted-foreground">{senderEmail}</p>
              {senderCompany && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {senderCompany}
                </p>
              )}
            </div>

            {contact?.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-foreground hover:text-blue-600 transition-colors mb-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {contact.phone}
              </a>
            )}

            <a href={`mailto:${senderEmail}`} className="flex items-center gap-2 text-sm text-foreground hover:text-blue-600 transition-colors">
              <Mail className="w-4 h-4 text-muted-foreground" />
              {senderEmail}
            </a>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 mb-4">
            {(!contact || !contact.isCustomer) ? (
              <Button
                onClick={() => setView('addContact')}
                className="w-full gap-2 bg-primary hover:bg-wm-hover text-white"
                size="sm"
              >
                <UserPlus className="w-4 h-4" />
                Contactpersoon toevoegen
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md px-3 py-2 text-sm font-medium">
                <Check className="w-4 h-4" />
                Klant in bestand
              </div>
            )}

            {/* ── Snelle acties: Project / Taak / Offerte / Deal ── */}
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                onClick={() => setView('addProject')}
                variant="outline"
                className="gap-1.5 text-[12px] h-8 px-2"
                size="sm"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                Project
              </Button>
              <Button
                onClick={() => setView('addTask')}
                variant="outline"
                className="gap-1.5 text-[12px] h-8 px-2"
                size="sm"
              >
                <ListPlus className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                Taak
              </Button>
              <Button
                onClick={() => onNavigateToOfferte?.(recentlyCreatedKlantId || undefined)}
                variant="outline"
                className="gap-1.5 text-[12px] h-8 px-2"
                size="sm"
              >
                <FileSignature className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                Offerte
              </Button>
              <Button
                onClick={() => setView('addDeal')}
                variant="outline"
                className="gap-1.5 text-[12px] h-8 px-2"
                size="sm"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                Deal
              </Button>
            </div>

            {(!contact || !contact.subscribedNewsletter) ? (
              <Button
                onClick={() => onSubscribeNewsletter(senderEmail)}
                variant="ghost"
                className="w-full gap-2 text-muted-foreground text-xs h-7"
                size="sm"
              >
                <Newspaper className="w-3.5 h-3.5" />
                Abonneren nieuwsbrief
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-300 rounded-md px-3 py-1 text-[11px]">
                <Check className="w-3 h-3" />
                Geabonneerd
              </div>
            )}
          </div>

          {contact ? (
            <>
              {contact.tags.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-3 h-3 text-amber-500" />
                    </span>
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className={`text-[10px] font-medium ${getTagColor(tag)}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator className="my-3" />

              {contact.deals && contact.deals.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Banknote className="w-3 h-3 text-emerald-500" />
                    </span>
                    Deals ({contact.deals.length})
                  </h4>
                  <div className="space-y-2">
                    {contact.deals.map((deal, i) => (
                      <div key={i} className="bg-background rounded-lg border p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground truncate">{deal.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{deal.value}</span>
                          <Badge variant="secondary" className={`text-[10px] ${getDealStatusColor(deal.status)}`}>
                            {getDealStatusLabel(deal.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contact.activities && contact.activities.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3 h-3 text-blue-500" />
                    </span>
                    Activiteiten
                  </h4>
                  <div className="space-y-0">
                    {contact.activities.map((activity, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div>
                          <p className="text-xs text-foreground">{activity.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(activity.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contact.notes && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-muted-foreground/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                    </span>
                    Notities
                  </h4>
                  <p className="text-xs text-muted-foreground bg-background border rounded-lg p-2.5">{contact.notes}</p>
                </div>
              )}

              {contact.addedDate && (
                <div className="text-[10px] text-muted-foreground text-center mt-4 pt-3 border-t">
                  In bestand sinds {new Date(contact.addedDate).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-center py-2">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Nieuw contact</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    Dit emailadres is nog niet bekend in uw klantenbestand.
                  </p>
                </div>
              </div>

              {/* ── Suggested flow for new email inquiry ── */}
              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3 h-3 text-primary" />
                  </span>
                  Aanvraag verwerken
                </h4>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setView('addContact')}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors text-left group"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">1</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Klant toevoegen</p>
                      <p className="text-[10px] text-muted-foreground">Sla contactgegevens op</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                  <button
                    onClick={() => setView('addProject')}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-dashed border-border/60 hover:border-blue-300 hover:bg-blue-500/[0.03] transition-colors text-left group"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-blue-500">2</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Project aanmaken</p>
                      <p className="text-[10px] text-muted-foreground">Start een nieuw project</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </button>
                  <button
                    onClick={() => onNavigateToOfferte?.()}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-dashed border-border/60 hover:border-primary/30 hover:bg-primary/[0.03] transition-colors text-left group"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">3</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Offerte maken</p>
                      <p className="text-[10px] text-muted-foreground">Stuur een prijsopgave</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
