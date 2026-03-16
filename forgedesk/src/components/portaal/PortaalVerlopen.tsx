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
    } catch {
      setFout('Verbinding mislukt. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {logoUrl && (
          <img src={logoUrl} alt={bedrijfsnaam} className="h-10 w-auto mx-auto object-contain" />
        )}
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Deze link is verlopen</h1>
          <p className="text-gray-600">
            Neem contact op met {bedrijfsnaam || 'het bedrijf'} voor een nieuwe link, of vraag er hieronder een aan.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left">
          {verzonden ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
              <p className="text-sm text-gray-700">
                Als het e-mailadres bekend is, ontvangt u binnenkort een nieuwe link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAanvragen} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uw e-mailadres
                </label>
                <input
                  type="email"
                  value={aanvraagEmail}
                  onChange={(e) => setAanvraagEmail(e.target.value)}
                  placeholder="naam@bedrijf.nl"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              {fout && <p className="text-sm text-red-600">{fout}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
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
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left space-y-3">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Building2 className="w-4 h-4" />
              <span>{bedrijfsnaam || 'Contactgegevens'}</span>
            </div>
            {telefoon && (
              <p className="text-sm text-gray-600">
                Tel: <a href={`tel:${telefoon}`} className="text-blue-600 hover:underline">{telefoon}</a>
              </p>
            )}
            {email && (
              <p className="text-sm text-gray-600">
                Email: <a href={`mailto:${email}`} className="text-blue-600 hover:underline">{email}</a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
