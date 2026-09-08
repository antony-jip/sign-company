import type { ReactNode } from 'react'

interface MailStatusToastProps {
  /** Statuswoord · de punt hoort erachter, dus houd het één woord. */
  titel: string
  /** Korte context op de regel eronder: naar wie, of wanneer hij weggaat. */
  onder?: string
  /** Nog bezig · dan wacht de punt op zijn plek in plaats van te landen. */
  bezig?: boolean
  /** Knop rechts van het statuswoord, bijvoorbeeld "Ongedaan maken". */
  actie?: ReactNode
}

/**
 * Eén vorm voor de hele verzendhandeling, zodat bezig en klaar op elkaar
 * lijken: zelfde regel, zelfde teksthoogte, punt op dezelfde plek. Wisselt
 * alleen van stand.
 *
 * Twee regels, niet één: het statuswoord staat boven met de knop ernaast, de
 * ontvanger eronder over de volle breedte. Alles op één regel liet een naam
 * als "Huisgemaeckt Keukens" vechten om ruimte met "Ongedaan maken", en dan
 * viel juist de naam weg. De knop kort nu alleen de bovenste regel in.
 *
 * Bewust zonder eigen kader: de Toaster zet al een matglas-kaart om elke
 * melding, en een tweede kaart daarbinnen las als een banner.
 *
 * Het gebaar zit in de punt. Tijdens het versturen klopt hij rustig in petrol;
 * bij succes komt hij in een boog binnen en landt als de flame-punt achter het
 * woord. Zie index.css · punt-baan / punt-vlucht / punt-wacht.
 */
export function MailStatusToast({ titel, onder, bezig = false, actie }: MailStatusToastProps) {
  return (
    // De toast-kaart groeit met zijn inhoud; zonder plafond loopt een lang
    // adres de melding zo het scherm uit. Vloer erbij zodat hij niet stompt.
    <div className="w-full min-w-[240px] max-w-[324px]">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-semibold leading-snug text-foreground">
          {titel}
          <span className="punt-baan" aria-hidden>
            <span className={bezig ? 'punt-wacht' : 'punt-vlucht'} />
          </span>
        </p>
        {actie}
      </div>
      {/* min-w-0 zit op de ouder: zonder dat weigert een flex-item te krimpen
          en duwt een lang adres de melding open in plaats van af te kappen. */}
      {onder && (
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground truncate">{onder}</p>
      )}
    </div>
  )
}

/**
 * Knop rechts in een verzendmelding ("Ongedaan maken", "Bewerken"). Krijgt een
 * eigen vlak zodat hij niet tegen de tekst aan plakt en een duidelijk raakvlak
 * heeft, ook op een touchscreen.
 */
export function MailToastKnop({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-my-1 -mr-1.5 flex-shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-petrol transition-colors hover:bg-petrol/[0.08] hover:text-flame"
    >
      {children}
    </button>
  )
}
