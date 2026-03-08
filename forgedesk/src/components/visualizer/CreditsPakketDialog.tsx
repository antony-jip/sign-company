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
  Coins, Star, Zap, Crown, ExternalLink, Mail,
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

export function CreditsPakketDialog({
  isOpen,
  onClose,
  onCreditsToegevoegd,
  supportEmail = 'info@forgedesk.nl',
}: CreditsPakketDialogProps) {
  const { user } = useAuth()
  const [geselecteerdPakket, setGeselecteerdPakket] = useState<CreditsPakket | null>(null)
  const [verzonden, setVerzonden] = useState(false)

  const handleBetaalverzoek = useCallback(async (pakket: CreditsPakket, methode: 'whatsapp' | 'email') => {
    if (!user?.id) return

    const bericht = `Hallo, ik wil graag het ${pakket.naam} pakket bestellen (${pakket.credits} credits, €${pakket.prijs_eur}).`

    if (methode === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(bericht)}`, '_blank')
    } else {
      window.open(`mailto:${supportEmail}?subject=Credits bestelling - ${pakket.naam}&body=${encodeURIComponent(bericht)}`, '_blank')
    }

    setVerzonden(true)
    toast.success(`Betaalverzoek verstuurd via ${methode === 'whatsapp' ? 'WhatsApp' : 'e-mail'}`)
  }, [user?.id, supportEmail])

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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" /> Credits aanschaffen
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Elke visualisatie kost 1 credit. Kies een pakket om door te gaan.
        </p>

        <div className="grid grid-cols-3 gap-3 mt-2">
          {CREDITS_PAKKETTEN.map((pakket) => {
            const Icon = PAKKET_ICONS[pakket.id] || Coins
            const isSelected = geselecteerdPakket?.id === pakket.id
            return (
              <button
                key={pakket.id}
                onClick={() => setGeselecteerdPakket(pakket)}
                className={cn(
                  'relative flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/40'
                )}
              >
                {pakket.populair && (
                  <Badge className="absolute -top-2 text-xs bg-primary text-primary-foreground">
                    Meest gekozen
                  </Badge>
                )}
                <Icon className={cn('h-6 w-6 mb-2', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                <span className="font-semibold text-sm">{pakket.naam}</span>
                <span className="text-2xl font-bold mt-1">{pakket.credits}</span>
                <span className="text-xs text-muted-foreground">credits</span>
                <span className="text-lg font-semibold mt-2">€{pakket.prijs_eur}</span>
                <span className="text-xs text-muted-foreground">
                  €{pakket.prijs_per_credit_eur}/credit
                </span>
                <p className="text-xs text-muted-foreground mt-2">{pakket.beschrijving}</p>
              </button>
            )
          })}
        </div>

        {geselecteerdPakket && !verzonden && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">
              Betaalverzoek versturen voor {geselecteerdPakket.naam} (€{geselecteerdPakket.prijs_eur}):
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2 flex-1"
                onClick={() => handleBetaalverzoek(geselecteerdPakket, 'whatsapp')}
              >
                <ExternalLink className="h-4 w-4" /> WhatsApp
              </Button>
              <Button
                variant="outline"
                className="gap-2 flex-1"
                onClick={() => handleBetaalverzoek(geselecteerdPakket, 'email')}
              >
                <Mail className="h-4 w-4" /> E-mail
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              onClick={() => handleDemoCredits(geselecteerdPakket)}
            >
              Demo: credits direct toevoegen (ontwikkelmodus)
            </Button>
          </div>
        )}

        {verzonden && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm text-green-700 dark:text-green-300">
            Betaalverzoek is verstuurd. Na bevestiging van betaling worden je credits automatisch toegevoegd.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
