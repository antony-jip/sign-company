import type { ReactElement } from 'react'
import { toast } from 'sonner'
import { logger } from './logger'

interface BackgroundSendOptions {
  loading: string
  success: string
  error?: string
  /**
   * Eigen bevestiging in plaats van de standaard success-toast · zie
   * VerzondenToast. `success` blijft de schermlezer-tekst.
   *
   * Geeft dit null terug, dan zwijgt de toast helemaal. Dat is voor schermen
   * die het resultaat zelf al tonen · een antwoord dat in de gespreksdraad
   * landt bevestigt beter dan een kaartje in de hoek. Pas op het moment van
   * slagen aangeroepen, dus de keuze mag afhangen van waar je dan staat.
   */
  successRender?: () => ReactElement | null
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
        if (opts.successRender) {
          const inhoud = opts.successRender()
          // Niet over de loading-toast heen leggen: sonner zet de
          // dismiss-timer stil zolang `type` op 'loading' staat, en
          // toast.custom() schrijft dat type niet over. De bevestiging bleef
          // dan staan tot je 'm wegveegde. Oude weg, nieuwe erbij.
          toast.dismiss(toastId)
          if (inhoud) toast.custom(() => inhoud, { duration: 3500 })
        } else {
          toast.success(opts.success, { id: toastId })
        }
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
