// ============================================================
// LOCALSTORAGE UTILITIES
//
// Safe localStorage operations with quota management.
// When quota is exceeded, automatically cleans up expendable data
// (files, clipboard, activity logs) and retries.
// ============================================================

/** Keys ordered by priority for cleanup (first = least important, removed first). */
const CLEANUP_KEYS_ORDERED = [
  'forgedesk_files',           // base64 file data — largest offender
  'forgedesk_clipboard_items', // clipboard — ephemeral data
  'forgedesk_ai_chats',       // AI chat history — can be regenerated
] as const

/** Prefixes for per-entity keys that can be cleaned up. */
const CLEANUP_PREFIXES = [
  'forgedesk_activiteiten_',   // per-customer activity logs
  'forgedesk_import_',         // temporary import data
] as const

/**
 * Attempt to free localStorage space by removing expendable data.
 * Returns the number of keys removed.
 */
export function freeLocalStorageSpace(): number {
  let removed = 0

  // 1. Remove known large/expendable keys
  for (const key of CLEANUP_KEYS_ORDERED) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key)
      removed++
    }
  }

  // 2. Remove prefix-matched keys (activity logs, import data)
  const prefixKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    for (const prefix of CLEANUP_PREFIXES) {
      if (key.startsWith(prefix)) {
        prefixKeys.push(key)
        break
      }
    }
  }
  for (const key of prefixKeys) {
    localStorage.removeItem(key)
    removed++
  }

  return removed
}

/**
 * Safely set a localStorage item. On quota exceeded, cleans up
 * expendable data and retries once. Returns true on success.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    // Quota exceeded — try to free space and retry
    const freed = freeLocalStorageSpace()
    if (freed === 0) return false
    try {
      localStorage.setItem(key, value)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Get an approximate total size of localStorage in bytes.
 */
export function getLocalStorageSize(): number {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    const value = localStorage.getItem(key)
    if (value) {
      total += key.length * 2 + value.length * 2 // UTF-16
    }
  }
  return total
}
