// Resolutie van feature-flags (migratie 200). Bewust zonder imports: dit
// bestand is pure logica zodat het rechtstreeks te testen is en zowel de
// context als losse code het kan gebruiken.
//
// Een flag heeft DRIE standen, geen twee. 'onbekend' betekent "de database
// heeft hier niets over gezegd" en dat is iets anders dan 'uit'. Daardoor
// kan één mechanisme twee soorten schakelaars dragen:
//
//   nieuwe code aanzetten → staatAan(): pas waar als er expliciet 'aan'
//                           staat. Onbekend, geen rij, mislukte query:
//                           allemaal niet-aan, dus de nieuwe code blijft
//                           slapen.
//   bestaande code doven  → staatUit(): pas waar als er expliciet 'uit'
//                           staat. Onbekend betekent hier dus "laat de
//                           werkende feature staan".
//
// Beide falen naar de bestaande situatie. Een hapering in de database zet
// nooit een halve rewrite live en dooft nooit een werkende module.

export type FlagStand = 'aan' | 'uit' | 'onbekend'

export interface FeatureFlagRij {
  naam: string
  // NULL = de globale rij die voor alle organisaties geldt.
  organisatie_id: string | null
  aan: boolean
}

// Rangorde:
//  1. globale rij op false → 'uit'. Harde stop; een org-rij kan dit niet
//     overrulen, anders is de noodstop geen noodstop.
//  2. rij van deze organisatie → die beslist (opt-in tijdens een pilot,
//     opt-out tijdens een uitrol).
//  3. globale rij op true → 'aan' voor wie geen eigen rij heeft.
//  4. niets → 'onbekend'.
export function bepaalStand(
  naam: string,
  rijen: readonly FeatureFlagRij[],
  organisatieId: string | null,
): FlagStand {
  const vanDezeFlag = rijen.filter((r) => r.naam === naam)
  const globaal = vanDezeFlag.find((r) => r.organisatie_id == null)

  if (globaal && !globaal.aan) return 'uit'

  const perOrg = organisatieId
    ? vanDezeFlag.find((r) => r.organisatie_id === organisatieId)
    : undefined
  if (perOrg) return perOrg.aan ? 'aan' : 'uit'

  if (globaal) return 'aan'
  return 'onbekend'
}

export function staatAan(
  naam: string,
  rijen: readonly FeatureFlagRij[],
  organisatieId: string | null,
): boolean {
  return bepaalStand(naam, rijen, organisatieId) === 'aan'
}

export function staatUit(
  naam: string,
  rijen: readonly FeatureFlagRij[],
  organisatieId: string | null,
): boolean {
  return bepaalStand(naam, rijen, organisatieId) === 'uit'
}

// Fail closed op transportniveau: mislukt het ophalen, dan is er geen
// enkele rij en staat dus geen enkele flag op 'aan'. De fout gaat naar
// onFout zodat de aanroeper hem kan loggen; de app draait door op de
// bestaande situatie in plaats van te gokken.
export async function veiligeFlags(
  laad: () => Promise<FeatureFlagRij[]>,
  onFout?: (fout: unknown) => void,
): Promise<FeatureFlagRij[]> {
  try {
    return await laad()
  } catch (fout) {
    onFout?.(fout)
    return []
  }
}

// Modules die achter een flag hangen, op pad. Staat de flag expliciet uit,
// dan verdwijnt de module uit elk menu én is de route gesloten — een
// menu-item dat naar een dichte deur wijst is erger dan geen menu-item.
export const MODULE_FLAGS: Record<string, string> = {
  '/visualizer': 'module_studio',
}

export function moduleUitgezet(
  pad: string,
  isUit: (flagNaam: string) => boolean,
): boolean {
  const flag = MODULE_FLAGS[pad]
  return !!flag && isUit(flag)
}

// Generiek over NavItem zodat navigatie.ts niets van flags hoeft te weten
// en er geen kringverwijzing tussen de twee bestanden ontstaat.
export function zonderUitgezetteModules<T extends { path: string }>(
  items: readonly T[],
  isUit: (flagNaam: string) => boolean,
): T[] {
  return items.filter((item) => !moduleUitgezet(item.path, isUit))
}
