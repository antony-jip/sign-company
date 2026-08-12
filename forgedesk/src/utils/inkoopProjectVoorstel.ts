import type { InkoopFactuur, Project } from '@/types'
import { isLopendProject } from './bijlageVoorstel'

/**
 * Welk project stelt een inkoopfactuur voor?
 *
 * De extractie leest twee losse velden van de factuur (migratie 197):
 * `referentie_kenmerk` (het PO-/order-/referentienummer dat wij aan de
 * leverancier hebben doorgegeven) en `vermoedelijk_project` (de
 * projectaanduiding zoals die letterlijk op de factuur staat). Dat is ruwe
 * leverancierstekst, geen koppeling.
 *
 * Dit bestand maakt daar een VOORSTEL van, niets meer. De gebruiker bevestigt
 * het in de projectkiezer. Bewust deterministisch en zonder AI-call: twee
 * tekstvelden tegen de eigen projectlijst is een vergelijking, geen oordeel.
 *
 * Bij twijfel geven we niets terug. Een inkoopfactuur op het verkeerde project
 * vervuilt de nacalculatie stil, en dat is erger dan zelf uit de lijst kiezen.
 */

export type VoorstelReden = 'nummer' | 'naam'
export type VoorstelBron = 'referentie_kenmerk' | 'vermoedelijk_project'

export interface InkoopProjectVoorstel {
  project: Project
  reden: VoorstelReden
  bron: VoorstelBron
  /** De tekst op de factuur waar het voorstel op rust. */
  gevonden_tekst: string
}

/** Alleen letters en cijfers: "P-2026/014" en "P 2026 014" worden hetzelfde. */
function alleenAlfanumeriek(waarde: string): string {
  return waarde.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function genormaliseerdeNaam(waarde: string): string {
  return waarde.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Projectnummers vergelijken we per woord, niet als losse substring in de hele
 * tekst. Anders vindt nummer "14" een match in elk bedrag en elke datum.
 */
function woorden(tekst: string): string[] {
  return tekst.split(/\s+/).map(alleenAlfanumeriek).filter(Boolean)
}

// Een nummer van één of twee tekens is geen identificatie maar een cijfer dat
// overal opduikt. Vanaf drie vergelijken we exact, vanaf vier mag het nummer
// ook binnen een langer woord zitten ("PO2026014" bevat "2026014").
const MIN_NUMMER_EXACT = 3
const MIN_NUMMER_IN_WOORD = 4

// Een projectnaam zoeken we wel als substring, want die staat vaak middenin een
// regelomschrijving. Te korte namen ("Vlag") zouden dan alles matchen.
const MIN_NAAM_LENGTE = 5

function nummerKomtVoor(projectNummer: string, tekst: string): boolean {
  const nummer = alleenAlfanumeriek(projectNummer)
  if (nummer.length < MIN_NUMMER_EXACT) return false
  // Staat er niets anders in het veld dan het nummer, dan mogen de spaties er
  // ook tussen zitten: "P 2026 014" is hetzelfde kenmerk als "P2026-014".
  if (alleenAlfanumeriek(tekst) === nummer) return true
  return woorden(tekst).some(woord =>
    woord === nummer || (nummer.length >= MIN_NUMMER_IN_WOORD && woord.includes(nummer))
  )
}

/**
 * De naam moet op woordgrenzen vallen, niet als kale substring. Zonder die eis
 * matcht project "Bakker" op "Levering Bakkerstraat 12" en project "Jansen" op
 * "Jansen Bouw B.V.", ook als dat een heel ander Jansen is. Klantachternamen van
 * vijf tot acht tekens zijn precies hoe projecten in de praktijk heten, en
 * `vermoedelijk_project` mag ook uit een leveradres komen, dus straatnamen
 * komen echt langs.
 *
 * Meerdere woorden blijven werken: "nieuwbouw kantoor" matcht binnen een langere
 * regel, zolang begin en eind op een grens liggen.
 */
function naamKomtVoor(projectNaam: string, tekst: string): boolean {
  const naam = genormaliseerdeNaam(projectNaam)
  if (naam.length < MIN_NAAM_LENGTE) return false

  const hooiberg = genormaliseerdeNaam(tekst)
  let vanaf = 0
  for (;;) {
    const index = hooiberg.indexOf(naam, vanaf)
    if (index === -1) return false
    const ervoor = hooiberg[index - 1]
    const erna = hooiberg[index + naam.length]
    if (!isWoordteken(ervoor) && !isWoordteken(erna)) return true
    vanaf = index + 1
  }
}

/** Undefined (begin of eind van de tekst) telt als grens, niet als teken. */
function isWoordteken(teken: string | undefined): boolean {
  return teken !== undefined && /[a-z0-9]/.test(teken)
}

/** Projecten die nog kosten kunnen ontvangen; templates doen niet mee. */
export function voorstelbareProjecten(projecten: Project[]): Project[] {
  return projecten.filter(p => !p.is_template && isLopendProject(p))
}

/**
 * Eén match is een voorstel, meerdere is een keuze. Een projectnummer weegt
 * zwaarder dan een naam: dat nummer hebben wij zelf aan de leverancier
 * doorgegeven, terwijl een naam ook toevallig in een omschrijving kan staan.
 * Daarom pas naar de namen kijken als geen enkel nummer raakt.
 */
export function stelProjectVoor(
  factuur: Pick<InkoopFactuur, 'referentie_kenmerk' | 'vermoedelijk_project'>,
  projecten: Project[]
): InkoopProjectVoorstel | null {
  const bronnen: { bron: VoorstelBron; tekst: string }[] = []
  for (const bron of ['referentie_kenmerk', 'vermoedelijk_project'] as const) {
    const tekst = (factuur[bron] || '').trim()
    if (tekst) bronnen.push({ bron, tekst })
  }
  if (bronnen.length === 0) return null

  const kandidaten = voorstelbareProjecten(projecten)

  for (const reden of ['nummer', 'naam'] as const) {
    const treffers: InkoopProjectVoorstel[] = []
    for (const project of kandidaten) {
      const veld = reden === 'nummer' ? project.project_nummer : project.naam
      if (!veld) continue
      const raakt = bronnen.find(({ tekst }) =>
        reden === 'nummer' ? nummerKomtVoor(veld, tekst) : naamKomtVoor(veld, tekst)
      )
      if (raakt) treffers.push({ project, reden, bron: raakt.bron, gevonden_tekst: raakt.tekst })
    }
    // Twee projecten die beide raken betekent dat de tekst niet onderscheidend
    // is. Dan is er niets voor te stellen en kiest de gebruiker zelf.
    if (treffers.length === 1) return treffers[0]
    if (treffers.length > 1) return null
  }

  return null
}
