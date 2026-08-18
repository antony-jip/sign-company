import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'

type BetaalStatus = 'laden' | 'betaald' | 'in_verwerking' | 'onbekend'

interface BedrijfInfo {
  nummer?: string
  bedrijfsnaam?: string
  logoUrl?: string
}

const MAX_POLLS = 4

export function BetaaldPagina() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const factuurId = searchParams.get('factuur_id')
  const [status, setStatus] = useState<BetaalStatus>(token ? 'laden' : 'onbekend')
  const [info, setInfo] = useState<BedrijfInfo>({})

  useEffect(() => {
    if (!token) return
    let cancelled = false
    let polls = 0

    // Mollie redirect kan eerder landen dan de webhook die de factuur op
    // betaald zet — daarom kort pollen voordat we een eindstatus tonen.
    async function check() {
      try {
        const resp = await fetch(`/api/factuur-portaal?betaal_token=${encodeURIComponent(token!)}`)
        if (!resp.ok) throw new Error('factuur ophalen mislukt')
        const json = await resp.json()
        if (cancelled) return
        setInfo({
          nummer: json.factuur?.nummer,
          bedrijfsnaam: json.bedrijf?.bedrijfsnaam,
          logoUrl: json.bedrijf?.logo_url,
        })
        if (json.bedrijf?.bedrijfsnaam) document.title = json.bedrijf.bedrijfsnaam
        if (json.factuur?.status === 'betaald') {
          setStatus('betaald')
          return
        }
        polls += 1
        if (polls >= MAX_POLLS) {
          setStatus('in_verwerking')
        } else {
          setTimeout(() => { if (!cancelled) check() }, 2500)
        }
      } catch {
        if (!cancelled) setStatus('onbekend')
      }
    }
    check()
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F8F7F5' }}>
      <div
        className="max-w-md w-full rounded-xl p-8 text-center"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
      >
        {(info.logoUrl || info.bedrijfsnaam) && (
          <div className="mb-6 flex justify-center">
            {info.logoUrl ? (
              <img src={info.logoUrl} alt={info.bedrijfsnaam || ''} className="max-h-12 object-contain" />
            ) : (
              <span className="text-lg font-bold" style={{ color: '#1A1A1A', letterSpacing: '-0.3px' }}>
                {info.bedrijfsnaam}
              </span>
            )}
          </div>
        )}

        {status === 'laden' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1A535C' }} />
            <p className="text-sm" style={{ color: '#6B6B66' }}>Betaling controleren...</p>
          </div>
        )}

        {status === 'betaald' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F2EC' }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: '#3A7D52' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#1A1A1A', letterSpacing: '-0.3px' }}>
              Betaling ontvangen<span style={{ color: '#F15025' }}>.</span>
            </h2>
            <p className="text-sm" style={{ color: '#6B6B66' }}>
              Bedankt voor uw betaling{info.bedrijfsnaam ? ` aan ${info.bedrijfsnaam}` : ''}.
              {info.nummer ? ` Factuur ${info.nummer} is voldaan.` : ' De factuur is voldaan.'}
            </p>
            <p className="text-xs" style={{ color: '#9B9B95' }}>U kunt dit venster sluiten.</p>
          </div>
        )}

        {status === 'in_verwerking' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F5F2E8' }}>
              <Clock className="h-8 w-8" style={{ color: '#8A7A4A' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#1A1A1A', letterSpacing: '-0.3px' }}>
              Betaling in verwerking<span style={{ color: '#F15025' }}>.</span>
            </h2>
            <p className="text-sm" style={{ color: '#6B6B66' }}>
              We hebben nog geen bevestiging van uw betaling ontvangen. Is de betaling gelukt,
              dan wordt {info.nummer ? `factuur ${info.nummer}` : 'de factuur'} binnen enkele
              minuten automatisch bijgewerkt.
            </p>
            {token && (
              <p className="text-sm" style={{ color: '#6B6B66' }}>
                Betaling geannuleerd of mislukt?{' '}
                <Link to={`/betalen/${token}`} className="font-medium hover:opacity-80" style={{ color: '#1A535C' }}>
                  Probeer het opnieuw
                </Link>
              </p>
            )}
          </div>
        )}

        {status === 'onbekend' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F2EC' }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: '#3A7D52' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#1A1A1A', letterSpacing: '-0.3px' }}>
              Bedankt<span style={{ color: '#F15025' }}>.</span>
            </h2>
            <p className="text-sm" style={{ color: '#6B6B66' }}>
              Als uw betaling is gelukt, wordt de factuur automatisch als betaald gemarkeerd.
            </p>
            {factuurId && (
              <p className="text-xs font-mono" style={{ color: '#9B9B95' }}>
                Referentie: {factuurId.substring(0, 8)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
