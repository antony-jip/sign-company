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

interface ContactSidebarProps {
  contact: EmailContact | null
  senderName: string
  senderEmail: string
  senderCompany?: string
  participants?: ConversationParticipant[]
  onAddCustomer: (email: string, data?: AddCustomerData) => void
  onSubscribeNewsletter: (email: string) => void
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
    particulier: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }
  return colors[tag] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

function getDealStatusColor(status: string): string {
  const colors: Record<string, string> = {
    won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    lost: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
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
    default: return 'bg-gray-100 text-gray-600'
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

  const update = useCallback((field: keyof AddCustomerData, value: any) => {
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
                form.status === 'inactief' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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

// ═════════════════════════════════════════════════════════════════════
// ─── Main ContactSidebar ─────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

export function ContactSidebar({
  contact,
  senderName,
  senderEmail,
  senderCompany,
  participants = [],
  onAddCustomer,
  onSubscribeNewsletter,
  width,
}: ContactSidebarProps) {
  const [showAddForm, setShowAddForm] = useState(false)

  const uniqueParticipants = participants.length > 0
    ? participants
    : [{ name: senderName, email: senderEmail, role: 'van' as const }]

  const linkedDeal = contact?.deals?.find((d) => d.status === 'open' || d.status === 'pending')

  const handleSaveContact = useCallback((data: AddCustomerData) => {
    onAddCustomer(data.email, data)
    if (data.nieuwsbrief) {
      onSubscribeNewsletter(data.email)
    }
    setShowAddForm(false)
  }, [onAddCustomer, onSubscribeNewsletter])

  // ── Show Add Contact Form ──
  if (showAddForm) {
    return (
      <div
        className="flex-shrink-0 flex flex-col bg-muted/30"
        style={{ width: width ?? 290 }}
      >
        <AddContactForm
          senderName={senderName}
          senderEmail={senderEmail}
          onSave={handleSaveContact}
          onCancel={() => setShowAddForm(false)}
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
                onClick={() => setShowAddForm(true)}
                className="w-full gap-2 bg-primary hover:bg-wm-hover text-white"
                size="sm"
              >
                <UserPlus className="w-4 h-4" />
                Toevoegen aan klanten
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md px-3 py-2 text-sm font-medium">
                <Check className="w-4 h-4" />
                Klant in bestand
              </div>
            )}

            {(!contact || !contact.subscribedNewsletter) ? (
              <Button
                onClick={() => onSubscribeNewsletter(senderEmail)}
                variant="outline"
                className="w-full gap-2"
                size="sm"
              >
                <Newspaper className="w-4 h-4" />
                Abonneren nieuwsbrief
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-md px-3 py-2 text-sm">
                <Check className="w-4 h-4" />
                Geabonneerd op nieuwsbrief
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
                    <span className="w-5 h-5 rounded-md bg-gray-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3 h-3 text-gray-500" />
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
            <div className="text-center py-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Nieuw contact</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  Dit emailadres is nog niet bekend in uw klantenbestand.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
