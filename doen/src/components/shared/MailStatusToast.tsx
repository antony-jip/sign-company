interface MailStatusToastProps {
  /** Statuswoord · de punt hoort erachter, dus houd het één woord. */
  titel: string
  /** Korte context achter het middenpunt: naar wie, of wanneer hij weggaat. */
  onder?: string
  /** Nog bezig · dan wacht de punt op zijn plek in plaats van te landen. */
  bezig?: boolean
}

/**
 * Eén vorm voor de hele verzendhandeling, zodat bezig en klaar op elkaar
 * lijken: zelfde regel, zelfde teksthoogte, punt op dezelfde plek. Wisselt
 * alleen van stand.
 *
 * Bewust zonder eigen kader: de Toaster zet al een matglas-kaart om elke
 * melding, en een tweede kaart daarbinnen las als een banner.
 *
 * Het gebaar zit in de punt. Tijdens het versturen klopt hij rustig in petrol;
 * bij succes komt hij in een boog binnen en landt als de flame-punt achter het
 * woord. Zie index.css · punt-baan / punt-vlucht / punt-wacht.
 */
export function MailStatusToast({ titel, onder, bezig = false }: MailStatusToastProps) {
  return (
    // min-w-0 is wat truncate hier werkend maakt: zonder dat weigert een
    // flex-item te krimpen en duwt een lang adres de melding open.
    <p className="text-[12px] leading-none truncate min-w-0">
      <span className="font-semibold text-foreground">
        {titel}
        <span className="punt-baan" aria-hidden>
          <span className={bezig ? 'punt-wacht' : 'punt-vlucht'} />
        </span>
      </span>
      {onder && <span className="text-muted-foreground"> · {onder}</span>}
    </p>
  )
}
