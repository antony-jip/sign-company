import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight, Hammer, FileSignature, Banknote,
  ListChecks, Send, Loader2, CheckCircle2, Mail,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile, getMedewerkers, updateMedewerker } from '@/services/supabaseService'
import { toast } from 'sonner'

const highlights = [
  { icon: Hammer, label: 'Projecten', desc: 'Bekijk en werk mee aan projecten' },
  { icon: FileSignature, label: 'Offertes', desc: 'Maak en verstuur offertes' },
  { icon: Banknote, label: 'Facturen', desc: 'Factureer klanten' },
  { icon: ListChecks, label: 'Taken', desc: 'Beheer je taken en planning' },
  { icon: Send, label: 'Email', desc: 'Stuur emails vanuit doen.' },
]

export function TeamWelkomPagina() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stap, setStap] = useState<'intro' | 'profiel' | 'email'>('intro')
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [functie, setFunctie] = useState('')
  const [telefoon, setTelefoon] = useState('')

  // Email setup
  const [emailAdres, setEmailAdres] = useState('')
  const [emailWachtwoord, setEmailWachtwoord] = useState('')
  const [saving, setSaving] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)

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

      // Update matching medewerker record with real name
      try {
        const medewerkers = await getMedewerkers()
        const match = medewerkers.find(m => m.email === user.email)
        if (match) {
          await updateMedewerker(match.id, { naam: fullName, telefoon: telefoon.trim() })
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
      // Skip email setup
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
    <div className="min-h-screen flex items-center justify-center p-5 bg-[#FEFDFB]">
      <div className="w-full max-w-xl">

        {/* ── Stap 1: Intro ── */}
        {stap === 'intro' && (
          <div className="text-center">
            <div className="mb-6">
              <span className="text-[40px] font-extrabold text-[#1A1A1A] tracking-[-0.04em]">
                doen<span className="text-[#F15025]">.</span>
              </span>
            </div>

            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
              Welkom bij het team!
            </h1>
            <p className="text-[15px] text-[#6B6B66] mb-8 max-w-md mx-auto leading-relaxed">
              Je bent uitgenodigd om samen te werken in doen. — het platform waar jullie team projecten, offertes en facturen beheert.
            </p>

            <div className="grid grid-cols-1 gap-2 mb-8 text-left max-w-sm mx-auto">
              {highlights.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[#F8F7F5] transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-[#1A535C]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-[18px] h-[18px] text-[#1A535C]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">{label}</p>
                    <p className="text-[11px] text-[#9B9B95]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setStap('profiel')}
              className="h-11 px-8 rounded-xl font-semibold text-[14px] bg-[#1A535C] hover:bg-[#1A535C]/90 text-white gap-2 group"
            >
              Aan de slag
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        )}

        {/* ── Stap 2: Profiel ── */}
        {stap === 'profiel' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#1A535C]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-[#1A535C]">
                  {voornaam ? voornaam[0].toUpperCase() : '?'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Stel je voor</h2>
              <p className="text-sm text-[#9B9B95]">Zodat je team weet wie je bent</p>
            </div>

            <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Voornaam *</Label>
                    <Input
                      value={voornaam}
                      onChange={(e) => setVoornaam(e.target.value)}
                      placeholder="Jan"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Achternaam</Label>
                    <Input
                      value={achternaam}
                      onChange={(e) => setAchternaam(e.target.value)}
                      placeholder="de Vries"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Functie</Label>
                  <Input
                    value={functie}
                    onChange={(e) => setFunctie(e.target.value)}
                    placeholder="Bijv. Projectleider, Monteur, Administratie..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Telefoonnummer</Label>
                  <Input
                    value={telefoon}
                    onChange={(e) => setTelefoon(e.target.value)}
                    placeholder="06-12345678"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleSaveProfile}
                disabled={!voornaam.trim() || saving}
                className="h-11 px-6 rounded-xl font-semibold text-[14px] bg-[#1A535C] hover:bg-[#1A535C]/90 text-white gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Doorgaan
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Stap 3: E-mail koppelen ── */}
        {stap === 'email' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#6A5A8A]/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-[#6A5A8A]" />
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                Welkom, {voornaam}!
              </h2>
              <p className="text-sm text-[#9B9B95]">
                Koppel je e-mailadres om mails te versturen vanuit doen.
              </p>
            </div>

            <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">E-mailadres</Label>
                  <Input
                    type="email"
                    value={emailAdres}
                    onChange={(e) => setEmailAdres(e.target.value)}
                    placeholder="jouw.naam@bedrijf.nl"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">App-wachtwoord</Label>
                  <Input
                    type="password"
                    value={emailWachtwoord}
                    onChange={(e) => setEmailWachtwoord(e.target.value)}
                    placeholder="App-specifiek wachtwoord"
                  />
                  <p className="text-[11px] text-[#9B9B95]">
                    Voor Gmail: maak een app-wachtwoord aan via Google Account &gt; Beveiliging &gt; App-wachtwoorden
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-[#1A535C]/[0.04]">
                  <CheckCircle2 className="w-4 h-4 text-[#1A535C] flex-shrink-0" />
                  <p className="text-[12px] text-[#1A535C]">
                    Elk teamlid kan een eigen e-mailadres koppelen. Mails worden verstuurd vanuit jouw adres.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-4">
              <Button
                variant="ghost"
                onClick={handleSkipEmail}
                className="text-[13px] text-[#9B9B95] hover:text-[#6B6B66]"
              >
                Later instellen
              </Button>
              <Button
                onClick={handleSaveEmail}
                disabled={emailSaving}
                className="h-11 px-6 rounded-xl font-semibold text-[14px] bg-[#F15025] hover:bg-[#F15025]/90 text-white gap-2"
              >
                {emailSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {emailAdres.trim() ? 'Koppelen en starten' : 'Starten zonder e-mail'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
