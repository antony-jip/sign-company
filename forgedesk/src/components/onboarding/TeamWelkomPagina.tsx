import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile, getMedewerkers, updateMedewerker, createMedewerker } from '@/services/supabaseService'
import { updatePassword } from '@/services/authService'
import { usePasswordCheck } from '@/lib/usePasswordCheck'
import { firstBlockingError } from '@/lib/passwordValidation'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { ParticleField } from './ParticleField'
import { toast } from 'sonner'

const MONO = { fontFamily: '"DM Mono", ui-monospace, monospace' } as const
const HEADING_STYLE = { fontSize: '34px', letterSpacing: '-0.5px', lineHeight: 1.1, fontWeight: 800 } as const

const highlights = ['Projecten', 'Offertes', 'Facturen', 'Taken']

function Wordmark() {
  return (
    <div className="inline-flex items-baseline gap-[1px] font-heading">
      <span className="text-[17px] font-bold tracking-tight text-ink">doen</span>
      <span className="text-[17px] font-bold text-flame leading-none">.</span>
    </div>
  )
}

export function TeamWelkomPagina() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stap, setStap] = useState<'intro' | 'wachtwoord' | 'profiel' | 'email'>('intro')
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [functie, setFunctie] = useState('')
  const [telefoon, setTelefoon] = useState('')

  const [wachtwoord, setWachtwoord] = useState('')
  const [wachtwoordBevestiging, setWachtwoordBevestiging] = useState('')
  const [wachtwoordSaving, setWachtwoordSaving] = useState(false)
  const passwordCheck = usePasswordCheck(wachtwoord)

  const [emailAdres, setEmailAdres] = useState('')
  const [emailWachtwoord, setEmailWachtwoord] = useState('')
  const [saving, setSaving] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)

  const handleSaveWachtwoord = async () => {
    const blocker = firstBlockingError(passwordCheck)
    if (blocker) { toast.error(blocker); return }
    if (wachtwoord !== wachtwoordBevestiging) {
      toast.error('Wachtwoorden komen niet overeen')
      return
    }
    setWachtwoordSaving(true)
    try {
      await updatePassword(wachtwoord)
      setStap('profiel')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wachtwoord instellen mislukt')
    } finally {
      setWachtwoordSaving(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id || !voornaam.trim()) return
    setSaving(true)
    try {
      const fullName = `${voornaam.trim()} ${achternaam.trim()}`.trim()
      await updateProfile(user.id, {
        voornaam: voornaam.trim(),
        achternaam: achternaam.trim(),
        functie: functie.trim(),
        telefoon: telefoon.trim(),
      } as Parameters<typeof updateProfile>[1])

      try {
        const medewerkers = await getMedewerkers()
        const match = medewerkers.find(m => m.user_id === user.id || m.email === user.email)
        if (match && !match.id.startsWith('profile-')) {
          await updateMedewerker(match.id, { naam: fullName, telefoon: telefoon.trim(), user_id: user.id })
        } else if (!match) {
          await createMedewerker({ naam: fullName, email: user.email || '', telefoon: telefoon.trim(), status: 'actief', user_id: user.id } as Parameters<typeof createMedewerker>[0])
        }
      } catch { /* non-critical */ }

      setStap('email')
    } catch {
      toast.error('Kon profiel niet opslaan')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmail = async () => {
    if (!emailAdres.trim()) {
      navigate('/')
      return
    }
    setEmailSaving(true)
    try {
      const res = await fetch('/api/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          gmail_address: emailAdres.trim(),
          app_password: emailWachtwoord.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('E-mail gekoppeld!')
      navigate('/')
    } catch {
      toast.error('Kon e-mail niet koppelen. Je kunt dit later instellen bij Instellingen.')
      navigate('/')
    } finally {
      setEmailSaving(false)
    }
  }

  const handleSkipEmail = () => {
    navigate('/')
  }

  return (
    <div className="relative min-h-screen p-6 bg-[#F8F7F5] overflow-hidden">
      <ParticleField />
      <div className="relative z-10 w-full max-w-2xl mx-auto pt-10 pb-16">
        <div className="mb-10">
          <Wordmark />
        </div>

        {/* ── Stap 1: Intro ── */}
        {stap === 'intro' && (
          <>
            <h1 className="font-heading text-ink mb-3" style={HEADING_STYLE}>
              Welkom bij het team<span className="text-flame">.</span>
            </h1>
            <p className="text-[15px] text-text-sec mb-8 max-w-lg" style={{ lineHeight: 1.55 }}>
              Je bent uitgenodigd om samen te werken in doen. — het platform waar jullie team projecten, offertes en facturen beheert.
            </p>
            <ul className="space-y-2 mb-10">
              {highlights.map((label) => (
                <li key={label} className="text-[15px] text-ink">
                  {label}<span className="text-flame">.</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-start gap-2 mb-12">
              <Button
                onClick={() => setStap('wachtwoord')}
                className="h-11 px-6 rounded-lg bg-flame hover:bg-flame-text text-white font-semibold text-[14px] shadow-sm hover:shadow-md transition-all group"
              >
                Aan de slag
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <span className="text-[11px] uppercase tracking-wider text-muted-hex" style={MONO}>± 1 min</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-hex" style={MONO}>
              uitnodiging ontvangen<span className="text-flame">.</span>
              <span className="mx-1.5 text-muted-hex/60">∙</span>
              team klaar voor jou<span className="text-flame">.</span>
            </p>
          </>
        )}

        {/* ── Stap 2: Wachtwoord ── */}
        {stap === 'wachtwoord' && (
          <>
            <h1 className="font-heading text-ink mb-3" style={HEADING_STYLE}>
              Kies een wachtwoord<span className="text-flame">.</span>
            </h1>
            <p className="text-[15px] text-text-sec mb-8 max-w-lg" style={{ lineHeight: 1.55 }}>
              Je gebruikt dit straks om in te loggen bij doen.
            </p>
            <div className="max-w-md space-y-4 mb-8">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-ink">Wachtwoord</Label>
                <Input
                  type="password"
                  value={wachtwoord}
                  onChange={(e) => setWachtwoord(e.target.value)}
                  placeholder="Kies een sterk wachtwoord"
                  autoFocus
                  className="h-11 rounded-lg"
                />
                <PasswordStrengthMeter check={passwordCheck} hasInput={wachtwoord.length > 0} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-ink">Wachtwoord bevestigen</Label>
                <Input
                  type="password"
                  value={wachtwoordBevestiging}
                  onChange={(e) => setWachtwoordBevestiging(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveWachtwoord() }}
                  placeholder="Herhaal je wachtwoord"
                  className="h-11 rounded-lg"
                />
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 mb-12">
              <Button
                onClick={handleSaveWachtwoord}
                disabled={wachtwoordSaving || !wachtwoord || !wachtwoordBevestiging}
                className="h-11 px-6 rounded-lg bg-flame hover:bg-flame-text text-white font-semibold text-[14px] shadow-sm hover:shadow-md transition-all group"
              >
                {wachtwoordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Doorgaan
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <span className="text-[11px] uppercase tracking-wider text-muted-hex" style={MONO}>± 30 sec</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-hex" style={MONO}>
              stap 2 van 4<span className="text-flame">.</span>
              <span className="mx-1.5 text-muted-hex/60">∙</span>
              wachtwoord vereist<span className="text-flame">.</span>
            </p>
          </>
        )}

        {/* ── Stap 3: Profiel ── */}
        {stap === 'profiel' && (
          <>
            <h1 className="font-heading text-ink mb-3" style={HEADING_STYLE}>
              Stel je voor<span className="text-flame">.</span>
            </h1>
            <p className="text-[15px] text-text-sec mb-8 max-w-lg" style={{ lineHeight: 1.55 }}>
              Zodat je team weet wie je bent.
            </p>
            <div className="max-w-md space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-ink">Voornaam *</Label>
                  <Input
                    value={voornaam}
                    onChange={(e) => setVoornaam(e.target.value)}
                    placeholder="Jan"
                    autoFocus
                    className="h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-ink">Achternaam</Label>
                  <Input
                    value={achternaam}
                    onChange={(e) => setAchternaam(e.target.value)}
                    placeholder="de Vries"
                    className="h-11 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-ink">Functie</Label>
                <Input
                  value={functie}
                  onChange={(e) => setFunctie(e.target.value)}
                  placeholder="Bijv. Projectleider, Monteur, Administratie..."
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-ink">Telefoonnummer</Label>
                <Input
                  value={telefoon}
                  onChange={(e) => setTelefoon(e.target.value)}
                  placeholder="06-12345678"
                  className="h-11 rounded-lg"
                />
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 mb-12">
              <Button
                onClick={handleSaveProfile}
                disabled={!voornaam.trim() || saving}
                className="h-11 px-6 rounded-lg bg-flame hover:bg-flame-text text-white font-semibold text-[14px] shadow-sm hover:shadow-md transition-all group"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Doorgaan
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <span className="text-[11px] uppercase tracking-wider text-muted-hex" style={MONO}>± 1 min</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-hex" style={MONO}>
              stap 3 van 4<span className="text-flame">.</span>
              <span className="mx-1.5 text-muted-hex/60">∙</span>
              bijna klaar<span className="text-flame">.</span>
            </p>
          </>
        )}

        {/* ── Stap 4: E-mail koppelen ── */}
        {stap === 'email' && (
          <>
            <h1 className="font-heading text-ink mb-3" style={HEADING_STYLE}>
              Email koppelen<span className="text-flame">.</span>
            </h1>
            <p className="text-[15px] text-text-sec mb-8 max-w-lg" style={{ lineHeight: 1.55 }}>
              Koppel je e-mailadres om mails te versturen vanuit doen.
            </p>
            <div className="max-w-md space-y-4 mb-6">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-ink">E-mailadres</Label>
                <Input
                  type="email"
                  value={emailAdres}
                  onChange={(e) => setEmailAdres(e.target.value)}
                  placeholder="jouw.naam@bedrijf.nl"
                  autoFocus
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-ink">App-wachtwoord</Label>
                <Input
                  type="password"
                  value={emailWachtwoord}
                  onChange={(e) => setEmailWachtwoord(e.target.value)}
                  placeholder="App-specifiek wachtwoord"
                  className="h-11 rounded-lg"
                />
                <p className="text-[11px] text-muted-hex">
                  Voor Gmail: maak een app-wachtwoord aan via Google Account &gt; Beveiliging &gt; App-wachtwoorden
                </p>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-petrol-light">
                <CheckCircle2 className="w-4 h-4 text-petrol flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-petrol leading-snug">
                  Elk teamlid kan een eigen e-mailadres koppelen. Mails worden verstuurd vanuit jouw adres.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 mb-12">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveEmail}
                  disabled={emailSaving}
                  className="h-11 px-6 rounded-lg bg-flame hover:bg-flame-text text-white font-semibold text-[14px] shadow-sm hover:shadow-md transition-all group"
                >
                  {emailSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {emailAdres.trim() ? 'Koppelen en starten' : 'Starten zonder e-mail'}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkipEmail}
                  className="text-[13px] text-text-sec hover:text-ink"
                >
                  Later instellen
                </Button>
              </div>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-hex" style={MONO}>
              stap 4 van 4<span className="text-flame">.</span>
              <span className="mx-1.5 text-muted-hex/60">∙</span>
              klaar zo<span className="text-flame">.</span>
            </p>
          </>
        )}

      </div>
    </div>
  )
}
