export interface Spec {
  label: string
  waarde: string
}

export interface GevuldeRegel {
  label: string
  waarde: string
}

/**
 * De labels die de klant in zijn document gebruikt zijn niet de labels van de
 * offerte. "Formaat" en "Afmeting" zijn hetzelfde veld, "Oplage" hoort bij
 * Aantal. Per doen.-label de woorden die erop uitkomen, allemaal kleingeschreven.
 */
const SYNONIEMEN: Record<string, string[]> = {
  aantal: ['aantal', 'oplage', 'omvang', 'stuks', 'hoeveelheid'],
  materiaal: ['materiaal', 'materialen', 'drager', 'substraat'],
  formaat: ['formaat', 'afmeting', 'afmetingen', 'maat', 'maten', 'grootte'],
  'lay-out': ['lay-out', 'layout', 'opmaak', 'ontwerp', 'bestanden', 'prepress'],
  montage: ['montage', 'plaatsing', 'installatie', 'monteren'],
  opmerking: ['opmerking', 'opmerkingen', 'bijzonderheden', 'extra', 'diversen'],
  afwerking: ['afwerking', 'verwerking', 'nabewerking'],
  bedrukking: ['bedrukking', 'druk', 'print', 'printen', 'kleuren'],
  levering: ['levering', 'transport', 'bezorging', 'verzending'],
  inclusief: ['inclusief', 'incl', 'meegeleverd'],
}

function normaliseer(tekst: string): string {
  return tekst.trim().toLowerCase().replace(/[:\s]+$/, '')
}

/** Past een spec-label op een offerte-label? Exact, via synoniemen, of bevat. */
function hoortBij(offerteLabel: string, specLabel: string): boolean {
  const doel = normaliseer(offerteLabel)
  const bron = normaliseer(specLabel)
  if (!doel || !bron) return false
  if (doel === bron) return true

  const woorden = SYNONIEMEN[doel]
  if (woorden?.includes(bron)) return true

  // Andersom ook: een offerte-label als "Kitt:" matcht "kit" uit het document.
  return doel.length >= 4 && (bron.startsWith(doel) || doel.startsWith(bron))
}

/**
 * Herkent of een label over hetzelfde veld gaat als een van de vaste
 * offerte-labels, bijvoorbeeld om te zien of een item al een eigen
 * formaat-regel heeft ("Afmeting", "Maat", "Formaat").
 */
export function isLabelVoor(offerteLabel: string, label: string): boolean {
  return hoortBij(offerteLabel, label)
}

/**
 * Vult de vaste labelrijen van de offerte met wat er in het document stond.
 * Wat nergens op past komt er als extra rij onder, want weggooien is erger dan
 * een rij te veel: dan mis je een spec die de klant wél heeft opgegeven.
 * Rijen zonder waarde blijven staan, zodat de vorm van de offerte gelijk blijft.
 */
export function vulDetailRegels(labels: string[], specs: Spec[]): GevuldeRegel[] {
  const gebruikt = new Set<number>()

  const gevuld = labels.map((label) => {
    const treffers: string[] = []
    specs.forEach((spec, i) => {
      if (gebruikt.has(i) || !hoortBij(label, spec.label)) return
      gebruikt.add(i)
      treffers.push(spec.waarde.trim())
    })
    return { label, waarde: treffers.filter(Boolean).join(' · ') }
  })

  const rest = specs
    .map((spec, i) => ({ spec, i }))
    .filter(({ i }) => !gebruikt.has(i))
    .map(({ spec }) => ({ label: spec.label.trim(), waarde: spec.waarde.trim() }))
    .filter((r) => r.label && r.waarde)

  return [...gevuld, ...rest]
}
