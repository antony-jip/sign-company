import { useState, useEffect } from 'react'

/**
 * `legacyKey` vangt hernoemde keys op: staat er nog niks onder `key` maar wel
 * onder de oude naam, dan verhuist die waarde eenmalig mee (en ruimt de oude
 * op). Gebruikt voor de `forgedesk-*` → `doen-*` merknaam-migratie.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  legacyKey?: string,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) return JSON.parse(item)
      if (legacyKey) {
        const legacy = window.localStorage.getItem(legacyKey)
        if (legacy) {
          window.localStorage.removeItem(legacyKey)
          return JSON.parse(legacy)
        }
      }
      return initialValue
    } catch (err) {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (err) {
      // ignore
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}
