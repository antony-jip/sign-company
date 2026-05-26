import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, ExternalLink, ChevronDown } from 'lucide-react'
import {
  MapPin as PhMapPin,
  Phone as PhPhone,
  EnvelopeSimple as PhEnvelope,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Klant, Project, Contactpersoon } from '@/types'

interface KlantCardProps {
  klant: Klant
  project: Project
  contactpersonen: Contactpersoon[]
  onContactpersoonChange: (cpId: string | null) => Promise<void>
  onContactpersoonAdd: (cp: Contactpersoon) => Promise<void>
  onContactpersoonEdit?: (cp: Contactpersoon) => Promise<void>
  onMail?: () => void
}

function getInitial(name?: string | null): string {
  return (name || '?').trim().charAt(0).toUpperCase() || '?'
}

export function KlantCard({ klant, project, contactpersonen, onContactpersoonChange, onContactpersoonAdd, onContactpersoonEdit, onMail }: KlantCardProps) {
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

  const InfoRow = ({ icon: Icon, label, href, mono }: { icon: PhosphorIcon; label: string; href?: string; mono?: boolean }) => {
    const content = (
      <>
        <span className="doen-duo-icon flex-shrink-0">
          <Icon size={14} weight="duotone" />
        </span>
        <span className={`flex-1 min-w-0 truncate text-[13px] text-foreground ${mono ? 'font-mono' : ''}`}>{label}</span>
        {href && (
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </>
    )
    if (!href) {
      return <div className="flex items-center gap-2.5 px-2 py-2">{content}</div>
    }
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/60 transition-colors"
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
          Klant
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/60 transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/klanten/${klant.id}`}>Klant openen</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Klant identiteit */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex items-center justify-center h-10 w-10 rounded-xl text-white text-[15px] font-extrabold flex-shrink-0 shadow-[0_2px_8px_rgba(58,107,140,0.25)]"
          style={{
            background: 'linear-gradient(135deg, #3A6B8C 0%, #2A5580 50%, #F15025 200%)',
          }}
        >
          {getInitial(klant.bedrijfsnaam || klant.contactpersoon)}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to={`/klanten/${klant.id}`}
            className="text-[16px] font-bold text-foreground hover:text-[#1A535C] transition-colors truncate block leading-tight"
          >
            {klant.bedrijfsnaam || klant.contactpersoon}
          </Link>
          {klant.debiteurennummer && (
            <p className="font-mono text-[11px] text-muted-foreground mt-1">
              Deb. {klant.debiteurennummer}
            </p>
          )}
        </div>
      </div>

      {/* Info rows */}
      <div className="-mx-2 mb-3">
        {adresLabel && (
          <InfoRow icon={PhMapPin} label={adresLabel} href={mapsUrl || undefined} />
        )}
        {displayTelefoon && (
          <InfoRow icon={PhPhone} label={displayTelefoon} href={`tel:${displayTelefoon}`} mono />
        )}
        {displayEmail && (
          <button
            onClick={handleMail}
            className="w-full group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/60 transition-colors text-left"
          >
            <span className="doen-duo-icon flex-shrink-0">
              <PhEnvelope size={14} weight="duotone" />
            </span>
            <span className="flex-1 min-w-0 truncate text-[13px] text-foreground">{displayEmail}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Contactpersoon */}
      <div className="border-t border-[rgba(26,83,92,0.1)] pt-4">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-2">Contactpersoon</h4>
        <div className="relative">
          <select
            value={project.contactpersoon_id || ''}
            onChange={async (e) => {
              const cpId = e.target.value || null
              try {
                await onContactpersoonChange(cpId)
                const cp = cpId ? contactpersonen.find(c => c.id === cpId) : null
                toast.success(cp ? `Contactpersoon: ${cp.naam}` : 'Contactpersoon verwijderd')
              } catch (err) {
                logger.error('Kon contactpersoon niet wijzigen:', err)
              }
            }}
            className="w-full text-[13px] font-medium text-foreground bg-white hover:bg-white border border-[rgba(26,83,92,0.12)] rounded-lg pl-9 pr-9 py-2.5 outline-none cursor-pointer transition-colors appearance-none focus:bg-white focus:border-[#1A535C] focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)]"
          >
            <option value="">Selecteer contactpersoon…</option>
            {contactpersonen.map((cp) => (
              <option key={cp.id} value={cp.id}>{cp.naam}{cp.functie ? ` · ${cp.functie}` : ''}</option>
            ))}
          </select>
          {/* Mini cp-avatar links in select */}
          {projectCp && (
            <div
              className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #3A6B8C 0%, #2A5580 100%)' }}
            >
              {getInitial(projectCp.naam)}
            </div>
          )}
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Inline-edit blok voor geselecteerde contactpersoon */}
        {projectCp && onContactpersoonEdit && editCpOpen && (
          <div className="mt-3 space-y-1.5">
            <input
              value={editNaam}
              onChange={(e) => setEditNaam(e.target.value)}
              placeholder="Naam"
              autoFocus
              className="w-full text-[12px] text-foreground placeholder:text-muted-foreground bg-white border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[#1A535C] focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
            />
            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full text-[12px] text-foreground placeholder:text-muted-foreground bg-white border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[#1A535C] focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
            />
            <div className="flex gap-1.5">
              <input
                value={editTelefoon}
                onChange={(e) => setEditTelefoon(e.target.value)}
                placeholder="Telefoon"
                className="flex-1 min-w-0 text-[12px] text-foreground placeholder:text-muted-foreground bg-white border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[#1A535C] focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
              />
              <input
                value={editFunctie}
                onChange={(e) => setEditFunctie(e.target.value)}
                placeholder="Functie"
                className="flex-1 min-w-0 text-[12px] text-foreground placeholder:text-muted-foreground bg-white border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[#1A535C] focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
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
                className="text-[11px] font-semibold text-white bg-[#F15025] hover:bg-[#D94520] transition-colors px-3 py-1 rounded-md disabled:opacity-40"
              >
                {saving ? 'Bezig…' : 'Opslaan'}
              </button>
            </div>
          </div>
        )}

        {/* Mail-button — petrol full-width met duotone icon */}
        <button
          onClick={handleMail}
          disabled={!displayEmail}
          className="group w-full mt-3 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1A535C] text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(20,62,71,0.18)] hover:bg-[#0F3D44] hover:shadow-[0_4px_16px_rgba(20,62,71,0.28)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <PhEnvelope size={15} weight="duotone" />
          Mail contactpersoon
        </button>

        {/* Bewerk-link — toont alleen als een cp geselecteerd is */}
        {projectCp && onContactpersoonEdit && !editCpOpen && (
          <button
            onClick={openEditCp}
            className="w-full mt-2 text-[12px] text-foreground/70 hover:text-foreground transition-colors text-left px-2 py-1"
          >
            ✎ Bewerk {projectCp.naam}
          </button>
        )}

        {/* Nieuw contactpersoon — collapsed default */}
        {!showNieuwCp ? (
          <button
            onClick={() => setShowNieuwCp(true)}
            className="w-full mt-2 text-[12px] text-foreground/70 hover:text-foreground transition-colors text-left px-2 py-1"
          >
            + Nieuw contactpersoon
          </button>
        ) : (
          <div className="mt-3 space-y-1.5">
            <input
              value={nieuwCpNaam}
              onChange={(e) => setNieuwCpNaam(e.target.value)}
              placeholder="Naam"
              autoFocus
              className="w-full text-[12px] text-foreground placeholder:text-muted-foreground bg-white border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[#1A535C] focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
            />
            <input
              value={nieuwCpEmail}
              onChange={(e) => setNieuwCpEmail(e.target.value)}
              placeholder="Email"
              className="w-full text-[12px] text-foreground placeholder:text-muted-foreground bg-white border border-[rgba(26,83,92,0.12)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[#1A535C] focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] transition-colors"
            />
            <div className="flex gap-1.5">
              <input
                value={nieuwCpTelefoon}
                onChange={(e) => setNieuwCpTelefoon(e.target.value)}
                placeholder="Telefoon"
                className="flex-1 min-w-0 text-[12px] text-foreground placeholder:text-muted-foreground bg-[var(--surface-soft)] border border-[var(--surface-soft-border)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[var(--amber)] focus:ring-[3px] focus:ring-[rgba(204,138,63,0.18)] transition-colors"
              />
              <input
                value={nieuwCpFunctie}
                onChange={(e) => setNieuwCpFunctie(e.target.value)}
                placeholder="Functie"
                className="flex-1 min-w-0 text-[12px] text-foreground placeholder:text-muted-foreground bg-[var(--surface-soft)] border border-[var(--surface-soft-border)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[var(--amber)] focus:ring-[3px] focus:ring-[rgba(204,138,63,0.18)] transition-colors"
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
                className="text-[11px] font-semibold text-white bg-[#1A535C] hover:bg-[#237580] transition-colors px-3 py-1 rounded-md disabled:opacity-40"
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
