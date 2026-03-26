import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Check,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Users,
  Plus,
  ArrowRight,
} from 'lucide-react'

const FEATURES = [
  'Onbeperkt klanten en projecten',
  'Offertes, facturen en werkbonnen',
  'Montageplanning met drag-and-drop',
  'Klantportaal',
  'Email integratie',
  'AI-assistent Daan',
  'Geen opzetkosten',
  'Geen verborgen kosten',
  'Maandelijks opzegbaar',
  'Eenvoudig data overzetten',
]

export function AbonnementTab() {
  const { trialStatus, trialDagenOver, organisatie, session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<'activate' | 'portal' | null>(null)

  useEffect(() => {
    const result = searchParams.get('abonnement')
    if (result === 'success') {
      toast.success('Abonnement geactiveerd! Welkom bij Doen.')
      searchParams.delete('abonnement')
      setSearchParams(searchParams, { replace: true })
    } else if (result === 'canceled') {
      toast('Betaling geannuleerd')
      searchParams.delete('abonnement')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleActivate = async () => {
    if (!organisatie?.id || !session?.access_token) return
    setIsLoading(true)
    setLoadingAction('activate')
    try {
      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ organisatie_id: organisatie.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Er ging iets mis')
      if (data.url) window.location.href = data.url
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Kon abonnement niet starten')
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  const handleManage = async () => {
    if (!organisatie?.id || !session?.access_token) return
    setIsLoading(true)
    setLoadingAction('portal')
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ organisatie_id: organisatie.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Er ging iets mis')
      if (data.url) window.location.href = data.url
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Kon portaal niet openen')
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  const isActive = trialStatus === 'actief'
  const isExpired = trialStatus === 'verlopen' || trialStatus === 'opgezegd'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-bold tracking-tight" style={{ color: '#1A1A1A' }}>Abonnement</h2>
        <p className="text-[13px]" style={{ color: '#9B9B95' }}>Plan, facturatie en gebruikers</p>
      </div>

      {/* Status banner */}
      {isActive && (
        <div className="flex items-center justify-between rounded-xl p-5" style={{ backgroundColor: '#E2F0F0', border: '1px solid #C0DDDD' }}>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5" style={{ color: '#1A535C' }} />
            <div>
              <span className="text-[14px] font-bold" style={{ color: '#1A535C' }}>Abonnement actief</span>
              <p className="text-[12px]" style={{ color: '#1A535C', opacity: 0.6 }}>Je hebt volledige toegang tot alle features.</p>
            </div>
          </div>
          <Button onClick={handleManage} disabled={isLoading} variant="outline" className="border-[#1A535C]/20 text-[#1A535C]">
            {loadingAction === 'portal' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
            Beheren
          </Button>
        </div>
      )}

      {isExpired && (
        <div className="flex items-center gap-3 rounded-xl p-5" style={{ backgroundColor: '#FDE8E2', border: '1px solid #F0C8BC' }}>
          <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: '#C03A18' }} />
          <div>
            <span className="text-[14px] font-bold" style={{ color: '#C03A18' }}>
              {trialStatus === 'verlopen' ? 'Je proefperiode is verlopen' : 'Je abonnement is opgezegd'}
            </span>
            <p className="text-[12px]" style={{ color: '#C03A18', opacity: 0.7 }}>Je data staat veilig. Activeer een abonnement om verder te werken.</p>
          </div>
        </div>
      )}

      {!isActive && !isExpired && trialDagenOver !== undefined && (
        <div className="flex items-center gap-3 rounded-xl p-5" style={{ backgroundColor: '#F5F2E8', border: '1px solid #E5DCC8' }}>
          <div className="text-[24px] font-bold font-mono" style={{ color: '#8A7A4A' }}>{trialDagenOver}</div>
          <div>
            <span className="text-[14px] font-bold" style={{ color: '#8A7A4A' }}>dagen proefperiode over</span>
            <p className="text-[12px]" style={{ color: '#8A7A4A', opacity: 0.7 }}>Alle features beschikbaar, geen beperkingen.</p>
          </div>
        </div>
      )}

      {/* Pricing card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E6E4E0' }}>
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #F15025, #1A535C)' }} />
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            {/* Left: pricing */}
            <div>
              <h3 className="font-heading text-[22px] font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
                Gewoon doen<span style={{ color: '#F15025' }}>.</span>
              </h3>

              <div className="flex items-baseline gap-1.5 mt-3">
                <span className="text-[42px] font-bold font-mono tracking-tight" style={{ color: '#1A1A1A' }}>€49</span>
                <span className="text-[15px]" style={{ color: '#9B9B95' }}>/ maand</span>
              </div>

              <div className="flex items-center gap-2 mt-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#F8F7F5' }}>
                <Users className="h-4 w-4" style={{ color: '#1A535C' }} />
                <span className="text-[13px] font-medium" style={{ color: '#1A1A1A' }}>
                  <strong>3 gebruikers</strong> inbegrepen
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#F8F7F5' }}>
                <Plus className="h-4 w-4" style={{ color: '#1A535C' }} />
                <span className="text-[13px] font-medium" style={{ color: '#1A1A1A' }}>
                  Extra gebruiker <strong>€10/maand</strong>
                </span>
              </div>

              <p className="text-[13px] mt-4" style={{ color: '#9B9B95' }}>
                Geen opzetkosten. Maandelijks opzegbaar. Eenvoudig data overzetten.
              </p>

              {!isActive && (
                <button
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="mt-6 h-12 px-8 text-[15px] font-bold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2"
                  style={{ backgroundColor: '#F15025' }}
                >
                  {loadingAction === 'activate' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Abonnement activeren
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Right: features */}
            <div className="flex-shrink-0 md:w-[300px]">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#9B9B95' }}>Wat je krijgt</p>
              <ul className="space-y-2.5">
                {FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px]" style={{ color: '#1A1A1A' }}>
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#1A535C' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
