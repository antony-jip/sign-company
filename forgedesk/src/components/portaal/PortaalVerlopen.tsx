import { useState } from 'react'
import { Clock, Building2, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PortaalVerlopenProps {
  token: string
  bedrijfsnaam: string
  telefoon?: string
  email?: string
  logoUrl?: string
}

export function PortaalVerlopen({ token, bedrijfsnaam, telefoon, email, logoUrl }: PortaalVerlopenProps) {
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
    <div className="min-h-screen bg-[#F8F7F5] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {logoUrl && (
          <img src={logoUrl} alt={bedrijfsnaam} className="h-10 w-auto mx-auto object-contain" />
        )}
        <div className="w-16 h-16 rounded-full bg-[#FDE8E4] flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-[#C0451A]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.3px] text-[#1A1A1A] mb-2">
            Deze link is verlopen<span className="text-[#F15025]">.</span>
          </h1>
          <p className="text-[#6B6B66]">
            Neem contact op met {bedrijfsnaam || 'het bedrijf'} voor een nieuwe link, of vraag er hieronder een aan.
          </p>
        </div>

        <div className="bg-[#FFFFFF] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 text-left">
          {verzonden ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[#2D6B48] mx-auto" />
              <p className="text-sm text-[#6B6B66]">
                Als het e-mailadres bekend is, ontvangt u binnenkort een nieuwe link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAanvragen} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  Uw e-mailadres
                </label>
                <input
                  type="email"
                  value={aanvraagEmail}
                  onChange={(e) => setAanvraagEmail(e.target.value)}
                  placeholder="naam@bedrijf.nl"
                  className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:ring-2 focus:ring-[#1A535C] focus:border-transparent"
                  required
                />
              </div>
              {fout && <p className="text-sm text-[#C0451A]">{fout}</p>}
              <Button
                type="submit"
                className="w-full bg-[#F15025] text-white hover:bg-[#D9481F]"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Nieuwe link aanvragen
              </Button>
            </form>
          )}
        </div>

        {(bedrijfsnaam || telefoon || email) && (
          <div className="bg-[#FFFFFF] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 text-left space-y-3">
            <div className="flex items-center gap-2 text-[#1A1A1A] font-medium">
              <Building2 className="w-4 h-4 text-[#6B6B66]" />
              <span>{bedrijfsnaam || 'Contactgegevens'}</span>
            </div>
            {telefoon && (
              <p className="text-sm text-[#6B6B66]">
                Tel: <a href={`tel:${telefoon}`} className="text-[#1A535C] hover:underline">{telefoon}</a>
              </p>
            )}
            {email && (
              <p className="text-sm text-[#6B6B66]">
                Email: <a href={`mailto:${email}`} className="text-[#1A535C] hover:underline">{email}</a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
