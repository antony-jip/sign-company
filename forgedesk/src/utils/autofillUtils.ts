// ============================================================
// AUTOFILL UTILITIES
//
// LocalStorage-based autofill for offerte item detail fields:
// omschrijving, materiaal, layout, montage
// ============================================================

const AUTOFILL_FIELDS = ['omschrijving', 'materiaal', 'layout', 'montage'] as const
export type AutofillField = typeof AUTOFILL_FIELDS[number]

const MAX_VALUES_PER_FIELD = 100

const DEFAULT_SUGGESTIONS: Record<AutofillField, string[]> = {
  omschrijving: [
    'Gevelreclame',
    'Raambelettering',
    'Reclamebord',
    'Spandoek',
    'Tekstielframe',
    'Lichtreclame',
    'Autobelettering',
    'Zandstraalfolie',
    'Wrapping',
    'Bewegwijzering',
    'Vlaggen',
    'Roll-up banner',
  ],
  materiaal: [
    'Folie',
    'Folie gegoten',
    'Folie gekalanderd',
    'Dibond',
    'Dibond 3mm',
    'Forex',
    'Forex 5mm',
    'Acrylaat',
    'RVS',
    'Textiel',
    'Mesh',
    'Vinyl',
    'Aluminium',
    'Neon',
    'LED',
  ],
  layout: [
    'Zie hieronder',
    'Zie tekening',
    'Volgens aanlevering',
    'Volgens afspraak',
    'In overleg',
    'Naar eigen ontwerp',
    'Ontwerp door ons',
  ],
  montage: [
    'Inclusief',
    'Exclusief',
    'In overleg',
    'Inclusief hoogwerker',
    'Inclusief steiger',
    'Zelf montage',
    'N.v.t.',
  ],
}

function getStorageKey(field: string): string {
  return `forgedesk_autofill_${field}`
}

/** Seed localStorage with default suggestions for fields that have no data yet. */
export function initAutofillDefaults(): void {
  Object.entries(DEFAULT_SUGGESTIONS).forEach(([field, values]) => {
    const key = getStorageKey(field)
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(values))
    }
  })
}

/** Save a single value to the autofill list (most-recent-first, deduped). */
export function saveAutofillValue(field: string, value: string): void {
  if (!value || value.trim().length < 2) return
  const key = getStorageKey(field)
  const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]')

  // Remove duplicate (case-insensitive)
  const filtered = existing.filter(
    (v) => v.toLowerCase() !== value.trim().toLowerCase()
  )

  // Prepend (most recent first)
  filtered.unshift(value.trim())

  // Cap at max
  localStorage.setItem(key, JSON.stringify(filtered.slice(0, MAX_VALUES_PER_FIELD)))
}

/** Get matching suggestions for a query. */
export function getAutofillSuggestions(field: string, query: string): string[] {
  if (!query || query.length < 1) return []
  const key = getStorageKey(field)
  const values: string[] = JSON.parse(localStorage.getItem(key) || '[]')
  return values
    .filter((v) => v.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
}

/**
 * Map a detail regel label to its autofill field name.
 * Returns undefined if the label is not an autofill field.
 */
export function labelToAutofillField(label: string): AutofillField | undefined {
  const lower = label.toLowerCase().trim()
  if (lower === 'omschrijving') return 'omschrijving'
  if (lower === 'materiaal') return 'materiaal'
  if (lower === 'lay-out' || lower === 'layout') return 'layout'
  if (lower === 'montage') return 'montage'
  return undefined
}

/** Returns true if a label corresponds to an autofill-enabled field. */
export function isAutofillField(label: string): boolean {
  return labelToAutofillField(label) !== undefined
}
