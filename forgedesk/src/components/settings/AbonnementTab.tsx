import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Check,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Sparkles,
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
      {/* Status card */}
      {trialStatus === 'actief' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Doen. Pro — €49/maand
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Actief
              </Badge>
            </div>
            <Button
              onClick={handleManage}
              disabled={isLoading}
              variant="outline"
            >
              {loadingAction === 'portal' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Abonnement beheren
            </Button>
          </CardContent>
        </Card>
      ) : trialStatus === 'verlopen' || trialStatus === 'opgezegd' ? (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              {trialStatus === 'verlopen'
                ? 'Je proefperiode is verlopen'
                : 'Je abonnement is opgezegd'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Je data staat veilig — activeer een abonnement om verder te werken.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Abonnement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Je gebruikt momenteel de gratis proefperiode.
              Nog <strong>{trialDagenOver} dagen</strong> resterend.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan card (toon bij trial, verlopen of opgezegd) */}
      {trialStatus !== 'actief' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Doen. Pro — €49/maand
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              onClick={handleActivate}
              disabled={isLoading}
              size="lg"
              className="w-full sm:w-auto"
            >
              {loadingAction === 'activate' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Abonnement activeren →
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
