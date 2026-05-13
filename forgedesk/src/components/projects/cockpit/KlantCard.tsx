import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, ChevronDown, MoreHorizontal, ExternalLink } from 'lucide-react'
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
  onMail?: () => void
}

function getInitial(name?: string | null): string {
  return (name || '?').trim().charAt(0).toUpperCase() || '?'
}

export function KlantCard({ klant, project, contactpersonen, onContactpersoonChange, onContactpersoonAdd, onMail }: KlantCardProps) {
  const { navigateWithTab } = useNavigateWithTab()
  const [showNieuwCp, setShowNieuwCp] = useState(false)
  const [nieuwCpNaam, setNieuwCpNaam] = useState('')
  const [nieuwCpEmail, setNieuwCpEmail] = useState('')
  const [nieuwCpTelefoon, setNieuwCpTelefoon] = useState('')
  const [nieuwCpFunctie, setNieuwCpFunctie] = useState('')
  const [saving, setSaving] = useState(false)

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

  const InfoRow = ({ icon: Icon, label, href, mono }: { icon: typeof MapPin; label: string; href?: string; mono?: boolean }) => {
    const content = (
      <>
        <Icon className="h-3.5 w-3.5 text-[#9B9B95] flex-shrink-0" />
        <span className={`flex-1 min-w-0 truncate text-[13px] text-[#1A1A1A] ${mono ? 'font-mono' : ''}`}>{label}</span>
        {href && (
          <ExternalLink className="h-3 w-3 text-[#9B9B95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
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
        className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--cream-bg)] transition-colors"
      >
        {content}
      </a>
    )
  }

  return (
    <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(130,100,60,0.04)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.08em]">Klant</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 rounded-md flex items-center justify-center text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[var(--cream-bg)] transition-colors">
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
          className="flex items-center justify-center h-9 w-9 rounded-lg text-white text-[14px] font-bold flex-shrink-0"
          style={{ background: 'var(--m-klant)' }}
        >
          {getInitial(klant.bedrijfsnaam || klant.contactpersoon)}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to={`/klanten/${klant.id}`}
            className="text-[16px] font-semibold text-[#1A1A1A] hover:text-[var(--m-klant)] transition-colors truncate block leading-tight"
          >
            {klant.bedrijfsnaam || klant.contactpersoon}
          </Link>
          {klant.debiteurennummer && (
            <p className="font-mono text-[11px] text-[#9B9B95] mt-1">Deb.nr · {klant.debiteurennummer}</p>
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
            className="w-full group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--cream-bg)] transition-colors text-left"
          >
            <Mail className="h-3.5 w-3.5 text-[#9B9B95] flex-shrink-0" />
            <span className="flex-1 min-w-0 truncate text-[13px] text-[#1A1A1A]">{displayEmail}</span>
            <ExternalLink className="h-3 w-3 text-[#9B9B95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Contactpersoon */}
      <div className="border-t border-[#EBEBEB] pt-4">
        <h4 className="text-[11px] font-semibold text-[#9B9B95] uppercase tracking-[0.08em] mb-2">Contactpersoon</h4>
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
            className="w-full text-[13px] font-medium text-[#1A1A1A] bg-[var(--surface-soft)] hover:bg-white border border-[var(--surface-soft-border)] rounded-lg pl-9 pr-9 py-2.5 outline-none cursor-pointer transition-colors appearance-none focus:bg-white focus:border-[var(--amber)] focus:ring-[3px] focus:ring-[rgba(204,138,63,0.18)]"
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
              style={{ background: 'var(--m-klant)' }}
            >
              {getInitial(projectCp.naam)}
            </div>
          )}
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9B95] pointer-events-none" />
        </div>

        {/* Mail-button — petrol full-width */}
        <button
          onClick={handleMail}
          disabled={!displayEmail}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1A535C] text-white text-[13px] font-semibold hover:bg-[#237580] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Mail className="h-3.5 w-3.5" />
          Mail contactpersoon
        </button>

        {/* Nieuw contactpersoon — collapsed default */}
        {!showNieuwCp ? (
          <button
            onClick={() => setShowNieuwCp(true)}
            className="w-full mt-2 text-[12px] text-[#6B6B66] hover:text-[#1A1A1A] transition-colors text-left px-2 py-1"
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
              className="w-full text-[12px] text-[#1A1A1A] placeholder:text-[#9B9B95] bg-[var(--surface-soft)] border border-[var(--surface-soft-border)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[var(--amber)] focus:ring-[3px] focus:ring-[rgba(204,138,63,0.18)] transition-colors"
            />
            <input
              value={nieuwCpEmail}
              onChange={(e) => setNieuwCpEmail(e.target.value)}
              placeholder="Email"
              className="w-full text-[12px] text-[#1A1A1A] placeholder:text-[#9B9B95] bg-[var(--surface-soft)] border border-[var(--surface-soft-border)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[var(--amber)] focus:ring-[3px] focus:ring-[rgba(204,138,63,0.18)] transition-colors"
            />
            <div className="flex gap-1.5">
              <input
                value={nieuwCpTelefoon}
                onChange={(e) => setNieuwCpTelefoon(e.target.value)}
                placeholder="Telefoon"
                className="flex-1 min-w-0 text-[12px] text-[#1A1A1A] placeholder:text-[#9B9B95] bg-[var(--surface-soft)] border border-[var(--surface-soft-border)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[var(--amber)] focus:ring-[3px] focus:ring-[rgba(204,138,63,0.18)] transition-colors"
              />
              <input
                value={nieuwCpFunctie}
                onChange={(e) => setNieuwCpFunctie(e.target.value)}
                placeholder="Functie"
                className="flex-1 min-w-0 text-[12px] text-[#1A1A1A] placeholder:text-[#9B9B95] bg-[var(--surface-soft)] border border-[var(--surface-soft-border)] rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[var(--amber)] focus:ring-[3px] focus:ring-[rgba(204,138,63,0.18)] transition-colors"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => { setShowNieuwCp(false); setNieuwCpNaam(''); setNieuwCpEmail(''); setNieuwCpTelefoon(''); setNieuwCpFunctie('') }}
                className="text-[11px] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors"
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
