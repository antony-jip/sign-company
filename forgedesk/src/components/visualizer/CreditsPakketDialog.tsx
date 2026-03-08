import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Coins, Star, Zap, Crown, CreditCard, Loader2, Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CREDITS_PAKKETTEN } from '@/utils/visualizerDefaults'
import { voegCreditsToe } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { CreditsPakket } from '@/types'

interface CreditsPakketDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreditsToegevoegd?: (nieuwSaldo: number) => void
  supportEmail?: string
}

const PAKKET_ICONS: Record<string, React.ElementType> = {
  starter: Zap,
  professional: Star,
  enterprise: Crown,
}

const PAKKET_KLEUREN: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  starter: {
    bg: 'bg-mist/10',
    border: 'border-mist/60 hover:border-mist',
    icon: 'text-mist-deep',
    badge: 'bg-mist/20 text-mist-deep',
  },
  professional: {
    bg: 'bg-blush/10',
    border: 'border-blush/60 hover:border-blush',
    icon: 'text-blush-deep',
    badge: 'bg-blush text-white',
  },
  enterprise: {
    bg: 'bg-sage/10',
    border: 'border-sage/60 hover:border-sage',
    icon: 'text-sage-deep',
    badge: 'bg-sage/20 text-sage-deep',
  },
}

const API_BASE = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL || '')

export function CreditsPakketDialog({
  isOpen,
  onClose,
  onCreditsToegevoegd,
}: CreditsPakketDialogProps) {
  const { user } = useAuth()
  const [geselecteerdPakket, setGeselecteerdPakket] = useState<CreditsPakket | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleStripeCheckout = useCallback(async (pakket: CreditsPakket) => {
    if (!user?.id) {
      toast.error('Je moet ingelogd zijn om credits te kopen')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pakket_id: pakket.id,
          user_id: user.id,
          user_email: user.email,
          success_url: `${window.location.origin}/visualizer?betaling=succes`,
          cancel_url: `${window.location.origin}/visualizer?betaling=geannuleerd`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Checkout sessie aanmaken mislukt')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Geen checkout URL ontvangen')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Onbekende fout'
      toast.error(`Betaling starten mislukt: ${msg}`)
      setIsLoading(false)
    }
  }, [user?.id, user?.email])

  // For demo/dev: add credits directly
  const handleDemoCredits = useCallback(async (pakket: CreditsPakket) => {
    if (!user?.id) return
    try {
      const result = await voegCreditsToe(user.id, pakket.credits, `${pakket.naam} pakket (demo)`)
      onCreditsToegevoegd?.(result.saldo)
      toast.success(`${pakket.credits} credits toegevoegd!`)
      onClose()
    } catch {
      toast.error('Credits toevoegen mislukt')
    }
  }, [user?.id, onCreditsToegevoegd, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-blush/20">
              <Coins className="h-5 w-5 text-blush-deep" />
            </div>
            Credits aanschaffen
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Elke visualisatie kost 1 credit (4K kost 2 credits). Kies een pakket:
        </p>

        <div className="space-y-3 mt-1">
          {CREDITS_PAKKETTEN.map((pakket) => {
            const Icon = PAKKET_ICONS[pakket.id] || Coins
            const kleuren = PAKKET_KLEUREN[pakket.id] || PAKKET_KLEUREN.starter
            const isSelected = geselecteerdPakket?.id === pakket.id

            return (
              <button
                key={pakket.id}
                onClick={() => setGeselecteerdPakket(pakket)}
                className={cn(
                  'relative flex items-center w-full p-4 rounded-xl border-2 transition-all text-left gap-4',
                  isSelected
                    ? `${kleuren.bg} border-current shadow-md ring-2 ring-offset-2 ${kleuren.icon} ring-current/20`
                    : `border-border/50 ${kleuren.border}`
                )}
              >
                {pakket.populair && (
                  <Badge className={cn('absolute -top-2 right-3 text-xs', kleuren.badge)}>
                    Meest gekozen
                  </Badge>
                )}

                <div className={cn('p-2.5 rounded-lg shrink-0', kleuren.bg)}>
                  <Icon className={cn('h-5 w-5', kleuren.icon)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{pakket.naam}</span>
                    <span className="text-xs text-muted-foreground">
                      {pakket.credits} credits
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{pakket.beschrijving}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-bold">€{pakket.prijs_eur.toFixed(2).replace('.', ',')}</div>
                  <div className="text-xs text-muted-foreground">
                    €{pakket.prijs_per_credit_eur.toFixed(2).replace('.', ',')}/credit
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {geselecteerdPakket && (
          <div className="mt-4 space-y-3">
            <Button
              className="w-full gap-2 bg-sage-deep hover:bg-sage-deep/90 text-white h-12 text-base font-medium"
              onClick={() => handleStripeCheckout(geselecteerdPakket)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {isLoading
                ? 'Doorsturen naar betaling...'
                : `Afrekenen — €${geselecteerdPakket.prijs_eur.toFixed(2).replace('.', ',')}`
              }
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              Veilig betalen via Stripe — iDEAL & creditcard
            </div>

            {import.meta.env.DEV && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => handleDemoCredits(geselecteerdPakket)}
              >
                🛠 Dev: credits direct toevoegen
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
