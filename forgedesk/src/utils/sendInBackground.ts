import type { ReactElement } from 'react'
import { toast } from 'sonner'
import { logger } from './logger'

interface BackgroundSendOptions {
  loading: string
  success: string
  error?: string
  /** Eigen laadmelding · `loading` blijft de schermlezer-tekst. */
  loadingRender?: () => ReactElement
  /** Eigen bevestiging · `success` blijft de schermlezer-tekst. */
  successRender?: () => ReactElement
}

/**
 * Voert een verzend-taak op de achtergrond uit zodat de UI direct kan sluiten.
 * Toont een live toast (laden → verzonden), en bij falen een error-toast met
 * een 'Opnieuw'-knop die exact dezelfde taak nogmaals draait. De payload blijft
 * in de closure van `task` bewaard, dus retry verliest geen concept.
 *
 * Elke overgang ruimt de vorige toast op en zet er een verse neer, in plaats
 * van er een over te schrijven op id. Sonner merget dan namelijk velden van de
 * oude toast mee: `type: 'loading'` houdt de dismiss-timer stil (de melding
 * bleef staan tot je 'm wegveegde) en een eerder gezette `jsx` overschaduwt de
 * fouttekst.
 */
export function sendInBackground(task: () => Promise<void>, opts: BackgroundSendOptions): void {
  const run = () => {
    const toastId = opts.loadingRender
      ? toast.custom(opts.loadingRender, { duration: Infinity })
      : toast.loading(opts.loading)
    task()
      .then(() => {
        toast.dismiss(toastId)
        if (opts.successRender) toast.custom(opts.successRender, { duration: 3500 })
        else toast.success(opts.success)
      })
      .catch((err) => {
        logger.error('Achtergrond-verzending mislukt:', err)
        // Toon de echte foutboodschap (bv. "staat in de outbox") als die er is
        const boodschap = err instanceof Error && err.message
          ? err.message
          : (opts.error ?? 'Verzenden mislukt')
        toast.dismiss(toastId)
        toast.error(boodschap, {
          duration: 10000,
          action: { label: 'Opnieuw', onClick: run },
        })
      })
  }
  run()
}
