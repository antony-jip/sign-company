import { toast } from 'sonner'
import { logger } from './logger'

interface BackgroundSendOptions {
  loading: string
  success: string
  error?: string
}

/**
 * Voert een verzend-taak op de achtergrond uit zodat de UI direct kan sluiten.
 * Toont een live toast (laden → verzonden), en bij falen een error-toast met
 * een 'Opnieuw'-knop die exact dezelfde taak nogmaals draait. De payload blijft
 * in de closure van `task` bewaard, dus retry verliest geen concept.
 */
export function sendInBackground(task: () => Promise<void>, opts: BackgroundSendOptions): void {
  const run = () => {
    const toastId = toast.loading(opts.loading)
    task()
      .then(() => {
        toast.success(opts.success, { id: toastId })
      })
      .catch((err) => {
        logger.error('Achtergrond-verzending mislukt:', err)
        // Toon de echte foutboodschap (bv. "staat in de outbox") als die er is
        const boodschap = err instanceof Error && err.message
          ? err.message
          : (opts.error ?? 'Verzenden mislukt')
        toast.error(boodschap, {
          id: toastId,
          duration: 10000,
          action: { label: 'Opnieuw', onClick: run },
        })
      })
  }
  run()
}
