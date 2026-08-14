interface VerzondenToastProps {
  /** Statuswoord · de flame-punt komt er zelf achteraan gevlogen. */
  titel?: string
  /** Korte context achter het middenpunt: naar wie, of wanneer hij weggaat. */
  onder?: string
}

/**
 * Bevestiging na het verzenden, voor de gevallen waar de UI het zelf niet laat
 * zien. Bewust zonder eigen kader: de Toaster zet al een matglas-kaart om elke
 * melding, en een tweede kaart daarbinnen las als een banner.
 *
 * Het gebaar zit in de punt. Die komt in een boog binnen en landt achter het
 * woord: de punt is de mail. Zie index.css · punt-baan / punt-vlucht.
 */
export function VerzondenToast({ titel = 'Verzonden', onder }: VerzondenToastProps) {
  return (
    // min-w-0 is wat truncate hier werkend maakt: zonder dat weigert een
    // flex-item te krimpen en duwt een lang adres de melding open.
    <p className="text-[12px] leading-none truncate min-w-0">
      <span className="font-semibold text-foreground">
        {titel}
        <span className="punt-baan" aria-hidden>
          <span className="punt-vlucht" />
        </span>
      </span>
      {onder && <span className="text-muted-foreground"> · {onder}</span>}
    </p>
  )
}
