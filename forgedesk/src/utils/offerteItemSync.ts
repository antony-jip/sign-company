const OFFERTE_ITEM_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Bepaalt per sync welke items behouden (update-by-id), welke nieuw (insert) en
 * welke oude rijen verwijderd moeten worden. Een item wordt behouden als het een
 * echt UUID heeft dat nog bij deze offerte bestaat; anders (new-*, onbekend of
 * vreemd UUID) wordt het een verse insert. Pure functie zodat het id-behoud —
 * de kern van de sync-fix — los te testen is van de Supabase-calls.
 */
export function partitionOfferteItemSync(
  itemIds: Array<string | undefined>,
  existingIds: Iterable<string>,
): { keptIds: string[]; insertIndices: number[]; deleteIds: string[] } {
  const existing = new Set(existingIds)
  const keptIds: string[] = []
  const insertIndices: number[] = []
  itemIds.forEach((rawId, index) => {
    if (rawId && OFFERTE_ITEM_UUID_RE.test(rawId) && existing.has(rawId)) {
      keptIds.push(rawId)
    } else {
      insertIndices.push(index)
    }
  })
  const keptSet = new Set(keptIds)
  const deleteIds = [...existing].filter(id => !keptSet.has(id))
  return { keptIds, insertIndices, deleteIds }
}
