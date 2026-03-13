import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { X } from 'lucide-react'

const DISMISS_KEY = 'forgedesk_trial_banner_dismissed'

export function TrialBanner() {
  const { trialStatus, trialDagenOver } = useAuth()
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  // Actief abonnement → toon niets
  if (trialStatus === 'actief') return null

  // Dismissed door gebruiker (alleen voor trial banners)
  if (dismissed && trialStatus === 'trial') return null

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const isDismissable = trialStatus === 'trial'

  let bgClass: string
  let message: React.ReactNode

  if (trialStatus === 'trial' && trialDagenOver > 7) {
    bgClass = 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
    message = (
      <span>Je hebt nog <strong>{trialDagenOver} dagen</strong> gratis uitproberen</span>
    )
  } else if (trialStatus === 'trial' && trialDagenOver <= 7) {
    bgClass = 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
    message = (
      <span>
        Nog <strong>{trialDagenOver} dagen</strong> trial —{' '}
        <Link to="/instellingen?tab=abonnement" className="underline font-semibold hover:no-underline">
          Kies je abonnement →
        </Link>
      </span>
    )
  } else if (trialStatus === 'verlopen') {
    bgClass = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    message = (
      <span>
        Je proefperiode is verlopen —{' '}
        <Link to="/instellingen?tab=abonnement" className="underline font-semibold hover:no-underline">
          Kies een abonnement om verder te werken →
        </Link>
      </span>
    )
  } else if (trialStatus === 'opgezegd') {
    bgClass = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    message = (
      <span>
        Je abonnement is opgezegd —{' '}
        <Link to="/instellingen?tab=abonnement" className="underline font-semibold hover:no-underline">
          Heractiveer om verder te werken →
        </Link>
      </span>
    )
  } else {
    return null
  }

  return (
    <div className={`w-full flex items-center justify-center px-4 py-2 text-[13px] font-medium ${bgClass}`} style={{ minHeight: 36 }}>
      <span className="text-center">{message}</span>
      {isDismissable && (
        <button
          onClick={handleDismiss}
          className="ml-3 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Sluiten"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
