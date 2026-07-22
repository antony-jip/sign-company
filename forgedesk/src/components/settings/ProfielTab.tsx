import { useState, useEffect, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Phone, Sparkles, CheckCircle, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getProfile, updateProfile } from '@/services/supabaseService'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'

export function ProfielTab() {
  const { user } = useAuth()
  const { refreshProfile } = useAppSettings()
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [functie, setFunctie] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const profile = await getProfile(user.id)
      if (profile) {
        setVoornaam(profile.voornaam || '')
        setAchternaam(profile.achternaam || '')
        setFunctie(profile.functie || '')
        setTelefoon(profile.telefoon || '')
        setEmail(profile.email || user.email || '')
      } else {
        setEmail(user.email || '')
        setVoornaam(user.user_metadata?.voornaam || '')
        setAchternaam(user.user_metadata?.achternaam || '')
      }
    } catch (err) {
      logger.error('Fout bij laden profiel:', err)
      toast.error('Kon profiel niet laden')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Gebruiker niet gevonden')
      return
    }
    try {
      setIsSaving(true)
      await updateProfile(user.id, {
        voornaam,
        achternaam,
        functie,
        telefoon,
      })
      await refreshProfile()
      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err: any) {
      logger.error('Fout bij opslaan profiel:', err)
      const msg = err?.message || err?.details || 'Onbekende fout'
      toast.error(`Kon profiel niet opslaan: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  const initials = useMemo(() => {
    const v = (voornaam.trim()[0] || '').toUpperCase()
    const a = (achternaam.trim()[0] || '').toUpperCase()
    return (v + a) || '·'
  }, [voornaam, achternaam])

  const volledigeNaam = `${voornaam} ${achternaam}`.trim()

  const completionFields = [
    { key: 'voornaam', value: voornaam },
    { key: 'achternaam', value: achternaam },
    { key: 'functie', value: functie },
    { key: 'telefoon', value: telefoon },
  ]
  const completed = completionFields.filter(f => f.value.trim().length > 0).length
  const completionPct = Math.round((completed / completionFields.length) * 100)

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 6) return 'Goedenacht'
    if (hour < 12) return 'Goedemorgen'
    if (hour < 18) return 'Goedemiddag'
    return 'Goedenavond'
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-6">
      {/* ── Left column: form ─────────────────────────────────────────── */}
      <div className="doen-slate-surface rounded-2xl p-6 md:p-8 space-y-7">
        {/* Hero: avatar + greeting */}
        <div className="flex items-start gap-5">
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-[28px] font-extrabold text-white shadow-[0_4px_16px_rgba(26,83,92,0.25)] select-none"
              style={{
                background: 'linear-gradient(135deg, #1A535C 0%, #2D6B72 45%, #F15025 130%)',
              }}
            >
              {initials}
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-card shadow-sm flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#2D6B48] doen-pulse" aria-hidden />
            </span>
          </div>
          <div className="doen-subtitel min-w-0 flex-1 pt-1">
            <p
              className="text-[14px] text-foreground/70"
            >
              {greeting}<span className="text-flame">·</span>
            </p>
            <h2 className="text-[24px] font-extrabold tracking-[-0.3px] text-foreground mt-0.5 truncate">
              {volledigeNaam || 'Jouw naam'}<span className="text-flame">.</span>
            </h2>
            <p className="text-[13px] text-foreground/70 truncate">
              {functie || 'Voeg je functie toe'} <span className="text-muted-foreground/70">·</span> {email}
            </p>
          </div>
        </div>

        {/* Completeness bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70">Profiel</span>
            <span className="text-[13px] font-mono tabular-nums text-petrol font-semibold">
              {completionPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${completionPct}%`,
                background: completionPct === 100
                  ? 'linear-gradient(90deg, #2D6B48, #1A535C)'
                  : 'linear-gradient(90deg, #1A535C, #F15025)',
              }}
            />
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="voornaam" className="text-[12px] font-semibold uppercase tracking-widest text-foreground/70">Voornaam</Label>
              <Input id="voornaam" value={voornaam} onChange={(e) => setVoornaam(e.target.value)} className="bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="achternaam" className="text-[12px] font-semibold uppercase tracking-widest text-foreground/70">Achternaam</Label>
              <Input id="achternaam" value={achternaam} onChange={(e) => setAchternaam(e.target.value)} className="bg-card" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="functie" className="text-[12px] font-semibold uppercase tracking-widest text-foreground/70">Functie</Label>
            <Input id="functie" value={functie} onChange={(e) => setFunctie(e.target.value)} placeholder="Bijv. Eigenaar, Projectleider, Verkoper" className="bg-card" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-semibold uppercase tracking-widest text-foreground/70">Email</Label>
              <Input id="email" value={email} readOnly disabled className="bg-background text-foreground/70 cursor-not-allowed" />
              <p className="text-[12px] text-muted-foreground">Email kan niet worden gewijzigd</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefoon" className="text-[12px] font-semibold uppercase tracking-widest text-foreground/70">Telefoon</Label>
              <Input id="telefoon" value={telefoon} onChange={(e) => setTelefoon(e.target.value)} className="bg-card" />
            </div>
          </div>
        </div>

        <div className="doen-subtitel flex items-center justify-between pt-4 border-t border-[rgba(26,83,92,0.08)]">
          <p
            className="text-[12px] text-muted-foreground"
          >
            wijzigingen zijn direct zichtbaar in jouw verzonden offertes en emails.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-2 bg-flame text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[#D03A18] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>

      {/* ── Right column: live identity preview ───────────────────────── */}
      <aside className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} style={{ color: '#F15025' }} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70">
            Hoe anderen je zien
          </span>
        </div>

        {/* Visitekaart preview */}
        <div
          className="doen-slate-surface rounded-2xl p-5 relative overflow-hidden"
          style={{ minHeight: 220 }}
        >
          {/* Decorative flame-dot pattern (subtle) */}
          <div
            aria-hidden
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #F15025 0%, transparent 70%)' }}
          />
          <div className="relative flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-extrabold text-white select-none"
              style={{
                background: 'linear-gradient(135deg, #1A535C 0%, #2D6B72 50%, #F15025 130%)',
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-foreground truncate">
                {volledigeNaam || 'Jouw naam'}<span className="text-flame">.</span>
              </p>
              {functie && (
                <p className="text-[12px] text-foreground/70 truncate">{functie}</p>
              )}
            </div>
          </div>

          <div className="relative space-y-2 text-[12px]">
            <div className="flex items-center gap-2 text-foreground/80">
              <Mail className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} style={{ color: '#1A535C' }} />
              <span className="truncate font-mono">{email || 'jouw@email.nl'}</span>
            </div>
            {telefoon ? (
              <div className="flex items-center gap-2 text-foreground/80">
                <Phone className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} style={{ color: '#1A535C' }} />
                <span className="truncate font-mono">{telefoon}</span>
              </div>
            ) : (
              <div className="doen-subtitel flex items-center gap-2/70">
                <Phone className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} style={{ color: '#C0BDB8' }} />
                <span className="italic">geen telefoonnummer</span>
              </div>
            )}
          </div>

          <div className="relative mt-4 pt-3 border-t border-[rgba(26,83,92,0.1)] flex items-center gap-2">
            <User className="doen-subtitel h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} style={{ color: 'hsl(var(--muted-foreground))' }} />
            <p
              className="text-[11px] text-muted-foreground"
            >
              afzender · offertes, facturen en mails
            </p>
          </div>
        </div>

        {/* Checklist */}
        <div className="doen-slate-surface rounded-2xl p-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70 mb-2">
            Voltooien
          </p>
          {completionFields.map(f => {
            const labels: Record<string, string> = {
              voornaam: 'Voornaam',
              achternaam: 'Achternaam',
              functie: 'Functie',
              telefoon: 'Telefoonnummer',
            }
            const done = f.value.trim().length > 0
            return (
              <div key={f.key} className="flex items-center gap-2.5 text-[13px]">
                {done ? (
                  <CheckCircle className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.75} style={{ color: '#2D6B48' }} />
                ) : (
                  <span className="w-[18px] h-[18px] rounded-full bg-muted flex-shrink-0" />
                )}
                <span className={done ? 'text-foreground/80 line-through decoration-muted-foreground/80' : 'text-foreground font-medium'}>
                  {labels[f.key]}
                </span>
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
