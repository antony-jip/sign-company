/**
 * De teksten op de offertepagina die de gebruiker zelf mag aanpassen
 * (Instellingen → Portaal → Offertepagina). Ze staan in
 * app_settings.portaal_instellingen; een leeg veld valt terug op de standaard.
 */
export interface KlantpaginaTeksten {
  akkoord_intro: string
  bedankt_kop: string
  bedankt_tekst: string
}

export const STANDAARD_KLANTPAGINA_TEKSTEN: KlantpaginaTeksten = {
  akkoord_intro: 'Naam en handtekening, dan gaan we voor je aan de slag.',
  bedankt_kop: 'Bedankt voor je opdracht',
  bedankt_tekst: 'Zodra we je opdracht verwerkt hebben, krijg je van ons een opdrachtbevestiging.',
}

/** Sleutels zoals ze in portaal_instellingen staan. */
export const KLANTPAGINA_TEKST_SLEUTELS = {
  akkoord_intro: 'offerte_akkoord_intro',
  bedankt_kop: 'offerte_bedankt_kop',
  bedankt_tekst: 'offerte_bedankt_tekst',
} as const

export function klantpaginaTeksten(bron?: Partial<Record<keyof KlantpaginaTeksten, string | null>> | null): KlantpaginaTeksten {
  const kies = (sleutel: keyof KlantpaginaTeksten) => {
    const waarde = bron?.[sleutel]
    return typeof waarde === 'string' && waarde.trim() ? waarde.trim() : STANDAARD_KLANTPAGINA_TEKSTEN[sleutel]
  }
  return {
    akkoord_intro: kies('akkoord_intro'),
    bedankt_kop: kies('bedankt_kop').replace(/[.!]+$/, ''),
    bedankt_tekst: kies('bedankt_tekst'),
  }
}

/** Leest de drie teksten uit een portaal_instellingen-object. */
export function tekstenUitInstellingen(instellingen?: Record<string, unknown> | null): KlantpaginaTeksten {
  return klantpaginaTeksten({
    akkoord_intro: instellingen?.[KLANTPAGINA_TEKST_SLEUTELS.akkoord_intro] as string | undefined,
    bedankt_kop: instellingen?.[KLANTPAGINA_TEKST_SLEUTELS.bedankt_kop] as string | undefined,
    bedankt_tekst: instellingen?.[KLANTPAGINA_TEKST_SLEUTELS.bedankt_tekst] as string | undefined,
  })
}
