import { useState } from 'react'
import { Clock, Building2, Send, CheckCircle2, Loader2 } from 'lucide-react'

interface PortaalVerlopenProps {
  token: string
  bedrijfsnaam: string
  telefoon?: string
  email?: string
}

export function PortaalVerlopen({ token, bedrijfsnaam, telefoon, email }: PortaalVerlopenProps) {
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
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#F6F4EC] flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-[#9A8E6E]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-[-0.03em] mb-2">Link verlopen</h1>
          <p className="text-[#5A5A55] leading-relaxed">
            Deze portaallink is verlopen. U kunt hieronder een nieuwe link aanvragen.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#E8E8E3] p-6 text-left shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          {verzonden ? (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-10 h-10 text-[#5A8264] mx-auto" />
              <p className="text-sm text-[#333330] leading-relaxed">
                Als het e-mailadres bekend is, ontvangt u binnenkort een nieuwe link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAanvragen} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A5A55] uppercase tracking-wide mb-1.5">
                  Uw e-mailadres
                </label>
                <input
                  type="email"
                  value={aanvraagEmail}
                  onChange={(e) => setAanvraagEmail(e.target.value)}
                  placeholder="naam@bedrijf.nl"
                  className="w-full px-4 py-2.5 border border-[#E8E8E3] rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#C0C0BA] focus:outline-none focus:ring-2 focus:ring-[#5A8264] focus:border-transparent bg-[#FAFAF7]"
                  required
                />
              </div>
              {fout && <p className="text-sm text-[#D4856B]">{fout}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1A1A1A] hover:bg-[#333330] transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Nieuwe link aanvragen
              </button>
            </form>
          )}
        </div>

        {(bedrijfsnaam || telefoon || email) && (
          <div className="bg-white rounded-xl border border-[#E8E8E3] p-6 text-left space-y-3 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 text-[#1A1A1A] font-semibold text-sm">
              <Building2 className="w-4 h-4 text-[#8A8A85]" />
              <span>{bedrijfsnaam || 'Contactgegevens'}</span>
            </div>
            {telefoon && (
              <p className="text-sm text-[#5A5A55]">
                Tel: <a href={`tel:${telefoon}`} className="text-[#5D7A93] hover:text-[#1A1A1A] transition-colors">{telefoon}</a>
              </p>
            )}
            {email && (
              <p className="text-sm text-[#5A5A55]">
                Email: <a href={`mailto:${email}`} className="text-[#5D7A93] hover:text-[#1A1A1A] transition-colors">{email}</a>
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-[#C0C0BA]">
          Powered by <strong className="font-semibold text-[#8A8A85]">FORGE</strong><span className="text-[#8A8A85]">desk</span>
        </p>
      </div>
    </div>
  )
}
