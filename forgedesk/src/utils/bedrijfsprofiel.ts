import type { Bedrijfsprofiel, DocumentStyle, Profile } from '@/types'

/**
 * Een offerte kan onder een tweede bedrijf uitgaan (migratie 189). Wat er dan
 * wisselt is de identiteit (naam, adres, KvK, btw, IBAN, logo) en het papier
 * (briefpapier, vervolgpapier, modus, veilige zones). Lettertypen, kleuren,
 * marges en tabelstijl blijven van de organisatie, precies zoals de migratie
 * het bedoelt: alleen de identiteit en het papier wisselen mee.
 *
 * Deze functie is bewust puur en kent geen database, zodat het samenvoegen los
 * van een PDF-run te testen is.
 */

/** De velden die de PDF-service van een bedrijfsprofiel gebruikt. */
export type PdfIdentiteit = Pick<
  Profile,
  | 'bedrijfsnaam'
  | 'bedrijfs_adres'
  | 'bedrijfs_telefoon'
  | 'bedrijfs_email'
  | 'bedrijfs_website'
  | 'kvk_nummer'
  | 'btw_nummer'
  | 'iban'
  | 'logo_url'
>

/** Lege tekst leest in de PDF als "niet invullen", niet als "val terug". */
function tekst(waarde: string | null | undefined): string {
  return waarde ?? ''
}

function getal(waarde: number | null | undefined): number | undefined {
  return waarde ?? undefined
}

/**
 * Legt de identiteit van het gekozen bedrijf over het standaardprofiel heen.
 *
 * Overschrijft altijd, ook met een lege waarde. Anders zou een tweede bedrijf
 * zonder IBAN het rekeningnummer van het eerste bedrijf op zijn factuurregel
 * krijgen, en dat is precies het soort verwarring dat je niet naar een klant
 * wilt sturen.
 */
export function pasIdentiteitToe<T extends Partial<Profile>>(
  basis: T,
  profiel: Bedrijfsprofiel | null | undefined,
): T {
  if (!profiel) return basis
  const identiteit: PdfIdentiteit = {
    bedrijfsnaam: tekst(profiel.bedrijfsnaam),
    bedrijfs_adres: tekst(profiel.bedrijfs_adres),
    bedrijfs_telefoon: tekst(profiel.bedrijfs_telefoon),
    bedrijfs_email: tekst(profiel.bedrijfs_email),
    bedrijfs_website: tekst(profiel.bedrijfs_website),
    kvk_nummer: tekst(profiel.kvk_nummer),
    btw_nummer: tekst(profiel.btw_nummer),
    iban: tekst(profiel.iban),
    logo_url: tekst(profiel.logo_url),
  }
  // telefoon en email van de gebruiker zelf zijn de terugval in de PDF-header.
  // Bij een tweede bedrijf horen die er niet op, dus die gaan ook leeg mee.
  return { ...basis, ...identiteit, telefoon: '', email: '' }
}

/**
 * Legt het papier van het gekozen bedrijf over de huisstijl heen.
 *
 * Ook hier geldt: altijd overschrijven. Heeft het tweede bedrijf geen eigen
 * briefpapier, dan hoort de PDF blanco te zijn met de eigen kop erop, niet het
 * briefpapier van het eerste bedrijf.
 */
export function pasPapierToe(
  basis: DocumentStyle,
  profiel: Bedrijfsprofiel | null | undefined,
): DocumentStyle {
  if (!profiel) return basis
  return {
    ...basis,
    briefpapier_url: tekst(profiel.briefpapier_url),
    vervolgpapier_url: tekst(profiel.vervolgpapier_url),
    briefpapier_modus: profiel.briefpapier_modus || 'geen',
    briefpapier_toon_branding: !!profiel.briefpapier_toon_branding,
    briefpapier_safe_zone_boven: getal(profiel.briefpapier_safe_zone_boven),
    briefpapier_safe_zone_onder: getal(profiel.briefpapier_safe_zone_onder),
    briefpapier_safe_zone_links: getal(profiel.briefpapier_safe_zone_links),
    briefpapier_safe_zone_rechts: getal(profiel.briefpapier_safe_zone_rechts),
  }
}
