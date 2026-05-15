/**
 * Bepaalt de kleur voor een visueel slot in het klantportaal op basis
 * van de bedrijfsinstellingen. Geeft de brand-default terug wanneer
 * white-label uitstaat, anders de org-specifieke primaire kleur (voor
 * primary/light-bg) of een derivaat. Accent blijft expliciet brand-only
 * (Flame) omdat dat de doen.-signatuur is en niet door white-label
 * overschreven hoort te worden.
 *
 * Gebruik in portaal-componenten:
 *   const bg = getOrgColor(appSettings, portaalInstellingen, 'primary')
 */
export type OrgColorSlot = 'primary' | 'accent' | 'light-bg'

const DEFAULTS: Record<OrgColorSlot, string> = {
  primary: '#1A535C',
  accent: '#F15025',
  'light-bg': '#E6F0F1',
}

interface SettingsSource {
  primaire_kleur?: string | null
}

interface PortaalSource {
  bedrijfskleuren_gebruiken?: boolean | null
}

export function getOrgColor(
  settings: SettingsSource | null | undefined,
  portaal: PortaalSource | null | undefined,
  slot: OrgColorSlot,
): string {
  if (!portaal?.bedrijfskleuren_gebruiken) return DEFAULTS[slot]
  if (slot === 'accent') return DEFAULTS.accent
  const primair = settings?.primaire_kleur?.trim()
  if (!primair) return DEFAULTS[slot]
  if (slot === 'primary') return primair
  if (slot === 'light-bg') return `${primair}1F`
  return DEFAULTS[slot]
}
