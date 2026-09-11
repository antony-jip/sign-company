import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  ContactKnoppen,
  KlantKop,
  MogelijkGemaaktDoor,
  Paneel,
  StatusWoord,
  STATUS_KLEUR,
  invoerVeld,
  knopPetrol,
} from '@/components/klantpagina/Klantstijl'

interface PortaalVerlopenProps {
  token: string
  bedrijfsnaam: string
  telefoon?: string
  email?: string
  logoUrl?: string
  kopKleur?: string
}

export function PortaalVerlopen({ token, bedrijfsnaam, telefoon, email, logoUrl, kopKleur }: PortaalVerlopenProps) {
  const [aanvraagEmail, setAanvraagEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [verzonden, setVerzonden] = useState(false)
  const [fout, setFout] = useState('')

  async function handleAanvragen(e: React.FormEvent) {
    e.preventDefault()
    if (!aanvraagEmail.trim()) return

    setLoading(true)
    setFout('')

    try {
      const response = await fetch('/api/portaal-link-aanvragen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: aanvraagEmail.trim() }),
      })

      const data = await response.json()
      if (!response.ok) {
        setFout(data.error || 'Er ging iets mis')
        return
      }

      setVerzonden(true)
    } catch (err) {
      setFout('Verbinding mislukt. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <KlantKop kleur={kopKleur} logoUrl={logoUrl} bedrijfsnaam={bedrijfsnaam} breedte="max-w-[760px]" />
      <main className="mx-auto max-w-[760px] space-y-6 px-4 py-10 md:px-8 md:py-14">
        <Paneel>
          {verzonden ? (
            <>
              <p><StatusWoord kleur={STATUS_KLEUR.goed} groot>Aanvraag verstuurd</StatusWoord></p>
              <p className="mt-2 text-sm text-[#6B6B66]">
                Als het e-mailadres bij ons bekend is, ontvangt u binnenkort een nieuwe link.
              </p>
            </>
          ) : (
            <>
              <p><StatusWoord kleur={STATUS_KLEUR.aandacht} groot>Deze link is verlopen</StatusWoord></p>
              <p className="mt-2 text-sm text-[#6B6B66]">
                Vraag hieronder een nieuwe link aan, of neem contact op met {bedrijfsnaam || 'het bedrijf'}.
              </p>
              <form onSubmit={handleAanvragen} className="mt-6 space-y-3">
                <label htmlFor="portaal-link-email" className="block text-sm font-medium text-[#1A1A1A]">
                  Uw e-mailadres
                </label>
                <input
                  id="portaal-link-email"
                  type="email"
                  value={aanvraagEmail}
                  onChange={(e) => setAanvraagEmail(e.target.value)}
                  placeholder="naam@bedrijf.nl"
                  autoComplete="email"
                  className={invoerVeld}
                  required
                />
                {fout && <p className="text-sm text-[#C0451A]">{fout}</p>}
                <button type="submit" disabled={loading} className={`${knopPetrol} h-12 w-full text-base`}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Nieuwe link aanvragen
                </button>
              </form>
            </>
          )}
        </Paneel>

        {(telefoon || email) && (
          <Paneel>
            <p className="font-semibold text-[#1A1A1A]">Liever direct contact?</p>
            <p className="mt-0.5 text-sm text-[#6B6B66]">{bedrijfsnaam || 'Het bedrijf'} helpt u graag verder.</p>
            <div className="mt-4">
              <ContactKnoppen telefoon={telefoon} email={email} />
            </div>
          </Paneel>
        )}

        <div className="pt-4">
          <MogelijkGemaaktDoor />
        </div>
      </main>
    </div>
  )
}
