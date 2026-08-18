// Eenvoudig klembord om een factuur te kopiëren en in een ander concept te
// plakken. Bewust localStorage (niet de DB): het is een vluchtige UI-actie,
// geen opgeslagen relatie tussen facturen.

export interface FactuurClipboardItem {
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  grootboek_code: string
}

export interface FactuurClipboard {
  titel: string
  intro_tekst: string
  outro_tekst: string
  voorwaarden: string
  notities: string
  items: FactuurClipboardItem[]
}

const KEY = 'doen_factuur_clipboard'

export function setFactuurClipboard(data: FactuurClipboard): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // localStorage vol of niet beschikbaar — kopiëren faalt stil, de UI meldt het.
  }
}

export function getFactuurClipboard(): FactuurClipboard | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as FactuurClipboard) : null
  } catch {
    return null
  }
}
