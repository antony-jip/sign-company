import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, ExternalLink, MapPin, Phone, Mail, Pencil, Plus, type LucideIcon } from 'lucide-react'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { avatarTint } from '@/utils/avatarTint'
import type { Klant, Project, Contactpersoon } from '@/types'

interface KlantCardProps {
  klant: Klant
  project: Project
  contactpersonen: Contactpersoon[]
  onContactpersoonChange: (cpId: string | null) => Promise<void>
  onContactpersoonAdd: (cp: Contactpersoon) => Promise<void>
  onContactpersoonEdit?: (cp: Contactpersoon) => Promise<void>
  onEditKlant?: () => void
  onMail?: () => void
}

function getInitial(name?: string | null): string {
  return (name || '?').trim().charAt(0).toUpperCase() || '?'
}

export function KlantCard({ klant, project, contactpersonen, onContactpersoonChange, onContactpersoonAdd, onContactpersoonEdit, onEditKlant, onMail }: KlantCardProps) {
  const { navigateWithTab } = useNavigateWithTab()
  const [showNieuwCp, setShowNieuwCp] = useState(false)
  const [nieuwCpNaam, setNieuwCpNaam] = useState('')
  const [nieuwCpEmail, setNieuwCpEmail] = useState('')
  const [nieuwCpTelefoon, setNieuwCpTelefoon] = useState('')
  const [nieuwCpFunctie, setNieuwCpFunctie] = useState('')
  const [saving, setSaving] = useState(false)
  const [editCpOpen, setEditCpOpen] = useState(false)
  const [editNaam, setEditNaam] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editTelefoon, setEditTelefoon] = useState('')
  const [editFunctie, setEditFunctie] = useState('')

  const projectCp = project.contactpersoon_id
    ? contactpersonen.find(c => c.id === project.contactpersoon_id)
    : null
  const displayEmail = projectCp?.email || klant.email
  const displayTelefoon = projectCp?.telefoon || klant.telefoon
  const adresLabel = klant.adres
    ? `${klant.adres}${klant.postcode || klant.stad ? `, ${[klant.postcode, klant.stad].filter(Boolean).join(' ')}` : ''}`
    : null
  const mapsUrl = adresLabel ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresLabel)}` : null
  // Per-klant kleur · dezelfde tint als in de lijstweergaven, zodat een klant
  // overal in de app dezelfde identiteitskleur heeft.
  const klantKleur = avatarTint(klant.bedrijfsnaam || klant.contactpersoon || '').fg

  const handleMail = () => {
    if (!displayEmail) return
    if (onMail) {
      onMail()
      return
    }
    navigateWithTab({
      path: `/email/compose?to=${encodeURIComponent(displayEmail)}`,
      label: 'Nieuwe email',
      id: `/email/compose-${displayEmail}`,
    })
  }

  const openEditCp = () => {
    if (!projectCp) return
    setEditNaam(projectCp.naam || '')
    setEditEmail(projectCp.email || '')
    setEditTelefoon(projectCp.telefoon || '')
    setEditFunctie(projectCp.functie || '')
    setEditCpOpen(true)
  }

  const handleSaveCp = async () => {
    if (!projectCp || !onContactpersoonEdit || saving) return
    if (!editNaam.trim()) {
      toast.error('Naam mag niet leeg zijn')
      return
    }
    setSaving(true)
    try {
      await onContactpersoonEdit({
        ...projectCp,
        naam: editNaam.trim(),
        email: editEmail.trim(),
        telefoon: editTelefoon.trim(),
        functie: editFunctie.trim(),
      })
      setEditCpOpen(false)
      toast.success('Contactpersoon bijgewerkt')
    } catch (err) {
      logger.error('Kon contactpersoon niet bijwerken:', err)
      toast.error('Kon contactpersoon niet bijwerken')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCp = async () => {
    if (!nieuwCpNaam.trim() || saving) return
    setSaving(true)
    try {
      const newCp: Contactpersoon = {
        id: crypto.randomUUID(),
        naam: nieuwCpNaam.trim(),
        email: nieuwCpEmail.trim(),
        telefoon: nieuwCpTelefoon.trim(),
        functie: nieuwCpFunctie.trim(),
        is_primair: (klant.contactpersonen?.length || 0) === 0,
      }
      await onContactpersoonAdd(newCp)
      setShowNieuwCp(false)
      setNieuwCpNaam(''); setNieuwCpEmail(''); setNieuwCpTelefoon(''); setNieuwCpFunctie('')
      toast.success(`${newCp.naam} toegevoegd`)
    } catch (err) {
      logger.error('Kon contactpersoon niet aanmaken:', err)
      toast.error('Kon contactpersoon niet aanmaken')
    } finally {
      setSaving(false)
    }
  }

  const InfoRow = ({ icon: Icon, label, href, mono }: { icon: LucideIcon; label: string; href?: string; mono?: boolean }) => {
    const content = (
      <>
        <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className={`flex-1 min-w-0 truncate text-[13px] text-foreground ${mono ? 'font-mono' : ''}`}>{label}</span>
        {href && (
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </>
    )
    if (!href) {
      return <div className="flex items-center gap-2.5 px-2 py-1.5">{content}</div>
    }
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[rgba(26,83,92,0.05)] transition-colors"
      >
        {content}
      </a>
    )
  }

  return (
    <div className="doen-slate-surface rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-heading text-[15px] font-bold text-foreground">
          Klant<span className="text-flame">.</span>
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[rgba(26,83,92,0.05)] transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEditKlant && (
              <DropdownMenuItem onClick={onEditKlant}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Klant bewerken
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to={`/klanten/${klant.id}`}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Klant openen
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Klant identiteit */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex items-center justify-center h-10 w-10 rounded-xl text-white text-[15px] font-extrabold flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${klantKleur} 0%, ${klantKleur} 55%, #F15025 240%)`,
            boxShadow: `0 2px 8px ${klantKleur}40`,
          }}
        >
          {getInitial(klant.bedrijfsnaam || klant.contactpersoon)}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to={`/klanten/${klant.id}`}
            className="text-[16px] font-bold text-foreground hover:text-petrol transition-colors truncate block leading-tight"
          >
            {klant.bedrijfsnaam || klant.contactpersoon}
          </Link>
          {klant.debiteurennummer && (
            <p className="font-mono text-[11px] text-muted-foreground mt-1 tracking-tight">
              Deb. {klant.debiteurennummer}
            </p>
          )}
        </div>
      </div>

      {/* Info rows */}
      <div className="-mx-2 mb-3">
        {adresLabel && (
          <InfoRow icon={MapPin} label={adresLabel} href={mapsUrl || undefined} />
        )}
        {displayTelefoon && (
          <InfoRow icon={Phone} label={displayTelefoon} href={`tel:${displayTelefoon}`} mono />
        )}
        {displayEmail && (
          <button
            onClick={handleMail}
            className="w-full group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[rgba(26,83,92,0.05)] transition-colors text-left"
          >
            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1 min-w-0 truncate text-[13px] text-foreground">{displayEmail}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Contactpersoon */}
      <div className="border-t border-[rgba(26,83,92,0.1)] pt-4">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-2">Contactpersoon</h4>
        <div className="relative">
          <Select
            value={project.contactpersoon_id || ''}
            onValueChange={async (v) => {
              const cpId = v && v !== '__none__' ? v : null
              try {
                await onContactpersoonChange(cpId)
                const cp = cpId ? contactpersonen.find(c => c.id === cpId) : null
                toast.success(cp ? `Contactpersoon: ${cp.naam}` : 'Contactpersoon verwijderd')
              } catch (err) {
                logger.error('Kon contactpersoon niet wijzigen:', err)
              }
            }}
          >
            <SelectTrigger className="w-full h-auto py-2.5 pl-9 pr-3 rounded-lg border-[rgba(26,83,92,0.12)] bg-card dark:bg-card text-[13px] font-medium text-foreground">
              <SelectValue placeholder="Selecteer contactpersoon…" />
            </SelectTrigger>
            <SelectContent>
              {projectCp && <SelectItem value="__none__">Geen contactpersoon</SelectItem>}
              {contactpersonen.map((cp) => (
                <SelectItem key={cp.id} value={cp.id}>{cp.naam}{cp.functie ? ` · ${cp.functie}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Mini cp-avatar links in select */}
          {projectCp && (
            <div
              className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold pointer-events-none z-10"
              style={{ background: 'linear-gradient(135deg, #3A6B8C 0%, #2A5580 100%)' }}
            >
              {getInitial(projectCp.naam)}
            </div>
          )}
        </div>

        {/* Inline-edit blok voor geselecteerde contactpersoon */}
        {projectCp && onContactpersoonEdit && editCpOpen && (
          <div className="mt-3 space-y-1.5">
            <input
              value={editNaam}
              onChange={(e) => setEditNaam(e.target.value)}
              placeholder="Naam"
              autoFocus
              className="w-full text-[12px] text-foreground placeholder:text-muted-foreground bg-card border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-card focus:border-petrol focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
            />
            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full text-[12px] text-foreground placeholder:text-muted-foreground bg-card border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-card focus:border-petrol focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
            />
            <div className="flex gap-1.5">
              <input
                value={editTelefoon}
                onChange={(e) => setEditTelefoon(e.target.value)}
                placeholder="Telefoon"
                className="flex-1 min-w-0 text-[12px] text-foreground placeholder:text-muted-foreground bg-card border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-card focus:border-petrol focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
              />
              <input
                value={editFunctie}
                onChange={(e) => setEditFunctie(e.target.value)}
                placeholder="Functie"
                className="flex-1 min-w-0 text-[12px] text-foreground placeholder:text-muted-foreground bg-card border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-card focus:border-petrol focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setEditCpOpen(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuleren
              </button>
              <button
                disabled={!editNaam.trim() || saving}
                onClick={handleSaveCp}
                className="text-[11px] font-semibold text-white bg-flame hover:bg-[#D94520] transition-colors px-3 py-1 rounded-md disabled:opacity-40"
              >
                {saving ? 'Bezig…' : 'Opslaan'}
              </button>
            </div>
          </div>
        )}

        {/* Mail-button · petrol full-width met duotone icon */}
        <button
          onClick={handleMail}
          disabled={!displayEmail}
          className="group w-full mt-3 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-petrol text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(20,62,71,0.18)] hover:bg-[#0F3D44] hover:shadow-[0_4px_16px_rgba(20,62,71,0.28)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <Mail className="h-4 w-4" strokeWidth={1.75} />
          Mail contactpersoon
        </button>

        {/* Bewerk-link · toont alleen als een cp geselecteerd is */}
        {projectCp && onContactpersoonEdit && !editCpOpen && (
          <button
            onClick={openEditCp}
            className="w-full mt-2 inline-flex items-center gap-1.5 text-[12px] text-foreground/70 hover:text-foreground transition-colors text-left px-2 py-1"
          >
            <Pencil className="h-3 w-3 flex-shrink-0" strokeWidth={2} />
            Bewerk {projectCp.naam}
          </button>
        )}

        {/* Nieuw contactpersoon · collapsed default */}
        {!showNieuwCp ? (
          <button
            onClick={() => setShowNieuwCp(true)}
            className="w-full mt-2 inline-flex items-center gap-1.5 text-[12px] text-foreground/70 hover:text-foreground transition-colors text-left px-2 py-1"
          >
            <Plus className="h-3 w-3 flex-shrink-0" strokeWidth={2} />
            Nieuw contactpersoon
          </button>
        ) : (
          <div className="mt-3 space-y-1.5">
            <input
              value={nieuwCpNaam}
              onChange={(e) => setNieuwCpNaam(e.target.value)}
              placeholder="Naam"
              autoFocus
              className="w-full text-[12px] text-foreground placeholder:text-muted-foreground bg-card border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-card focus:border-petrol focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
            />
            <input
              value={nieuwCpEmail}
              onChange={(e) => setNieuwCpEmail(e.target.value)}
              placeholder="Email"
              className="w-full text-[12px] text-foreground placeholder:text-muted-foreground bg-card border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-card focus:border-petrol focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
            />
            <div className="flex gap-1.5">
              <input
                value={nieuwCpTelefoon}
                onChange={(e) => setNieuwCpTelefoon(e.target.value)}
                placeholder="Telefoon"
                className="flex-1 min-w-0 text-[12px] text-foreground placeholder:text-muted-foreground bg-[var(--surface-soft)] border border-[var(--surface-soft-border)] rounded-lg px-3 py-2 outline-none focus:bg-card focus:border-[var(--amber)] focus:ring-[3px] focus:ring-[rgba(204,138,63,0.18)] transition-colors"
              />
              <input
                value={nieuwCpFunctie}
                onChange={(e) => setNieuwCpFunctie(e.target.value)}
                placeholder="Functie"
                className="flex-1 min-w-0 text-[12px] text-foreground placeholder:text-muted-foreground bg-[var(--surface-soft)] border border-[var(--surface-soft-border)] rounded-lg px-3 py-2 outline-none focus:bg-card focus:border-[var(--amber)] focus:ring-[3px] focus:ring-[rgba(204,138,63,0.18)] transition-colors"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => { setShowNieuwCp(false); setNieuwCpNaam(''); setNieuwCpEmail(''); setNieuwCpTelefoon(''); setNieuwCpFunctie('') }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuleren
              </button>
              <button
                disabled={!nieuwCpNaam.trim() || saving}
                onClick={handleAddCp}
                className="text-[11px] font-semibold text-white bg-petrol hover:bg-[#237580] transition-colors px-3 py-1 rounded-md disabled:opacity-40"
              >
                {saving ? 'Bezig…' : 'Toevoegen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
