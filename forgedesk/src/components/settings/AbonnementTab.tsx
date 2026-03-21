import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Check,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'

const FEATURES = [
  'Onbeperkt klanten en projecten',
  'Offertes en facturen',
  'Werkbonnen en planning',
  'AI-assistent Daan',
  'Geen verborgen kosten',
  'Maandelijks opzegbaar',
]

export function AbonnementTab() {
  const { trialStatus, trialDagenOver, organisatie, session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<'activate' | 'portal' | null>(null)

  // Handle return from Stripe
  useEffect(() => {
    const result = searchParams.get('abonnement')
    if (result === 'success') {
      toast.success('Abonnement geactiveerd! Welkom bij Doen. Pro.')
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
      if (data.url) {
        window.location.href = data.url
      }
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
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Kon portaal niet openen')
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-[20px] font-bold tracking-[-0.03em] text-foreground font-display">Abonnement</h2>
        <p className="text-[13px] text-muted-foreground">Plan, facturatie en gebruikslimieten</p>
      </div>

      {/* Status card */}
      {trialStatus === 'actief' ? (
        <Card className="rounded-xl overflow-hidden border-border/50">
          {/* Spectrum gradient strip */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #F15025, #1A535C)' }} />
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="text-[18px] font-bold font-display tracking-[-0.03em]">Doen. Pro</h3>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[24px] font-bold font-mono tabular-nums">EUR 49</span>
                <span className="text-[13px] text-muted-foreground">/ maand</span>
              </div>
              <p className="text-[12px] text-[#A0A098] mt-1">Gewoon doen.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">Status:</span>
              <Badge className="bg-[#1A535C]/10 text-[#1A535C] border-[#1A535C]/20 dark:bg-[#2A7A86]/20 dark:text-[#2A7A86]">
                Actief
              </Badge>
            </div>
            <Button
              onClick={handleManage}
              disabled={isLoading}
              variant="outline"
              className="border-[#E6E4E0]"
            >
              {loadingAction === 'portal' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Abonnement beheren
            </Button>
          </CardContent>
        </Card>
      ) : trialStatus === 'verlopen' || trialStatus === 'opgezegd' ? (
        <Card className="border-[#F15025]/20 dark:border-[#F15025]/30 rounded-xl overflow-hidden">
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #F15025, #1A535C)' }} />
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-[#F15025]" />
              <h3 className="text-[18px] font-bold font-display tracking-[-0.03em] text-[#F15025]">
                {trialStatus === 'verlopen'
                  ? 'Je proefperiode is verlopen'
                  : 'Je abonnement is opgezegd'}
              </h3>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Je data staat veilig — activeer een abonnement om verder te werken.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl overflow-hidden border-border/50">
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #F15025, #1A535C)' }} />
          <CardContent className="pt-6">
            <h3 className="text-[18px] font-bold font-display tracking-[-0.03em]">Proefperiode</h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              Je gebruikt momenteel de gratis proefperiode.
              Nog <strong className="font-mono">{trialDagenOver} dagen</strong> resterend.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan card (toon bij trial, verlopen of opgezegd) */}
      {trialStatus !== 'actief' && (
        <Card className="rounded-xl overflow-hidden border-border/50">
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #F15025, #1A535C)' }} />
          <CardContent className="pt-6 space-y-5">
            <div>
              <h3 className="text-[18px] font-bold font-display tracking-[-0.03em]">Doen. Pro</h3>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[24px] font-bold font-mono tabular-nums">EUR 49</span>
                <span className="text-[13px] text-muted-foreground">/ maand</span>
              </div>
              <p className="text-[12px] text-[#A0A098] mt-2">Gewoon doen.</p>
            </div>
            <ul className="space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-[13px]">
                  <Check className="w-4 h-4 text-[#1A535C] dark:text-[#2A7A86] flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              onClick={handleActivate}
              disabled={isLoading}
              size="lg"
              className="w-full sm:w-auto bg-[#1A535C] hover:bg-[#1A535C]/90 text-white"
            >
              {loadingAction === 'activate' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Abonnement activeren
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
