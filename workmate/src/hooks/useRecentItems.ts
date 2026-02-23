import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'workmate_recent_items'
const MAX_ITEMS = 10

export interface RecentItem {
  path: string
  label: string
  subtitle: string
  type: 'klant' | 'project' | 'offerte' | 'deal' | 'factuur' | 'werkbon' | 'pagina'
  visitedAt: string
}

let listeners: Array<() => void> = []

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function getSnapshot(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

let cachedItems: RecentItem[] | null = null
let cachedRaw: string | null = null

function getSnapshotStable(): RecentItem[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedItems = raw ? JSON.parse(raw) : []
  }
  return cachedItems ?? []
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function trackRecentItem(item: Omit<RecentItem, 'visitedAt'>): void {
  const items = getSnapshot()
  const filtered = items.filter((i) => i.path !== item.path)
  const newItem: RecentItem = { ...item, visitedAt: new Date().toISOString() }
  const updated = [newItem, ...filtered].slice(0, MAX_ITEMS)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // storage full — ignore
  }
  cachedRaw = null
  cachedItems = null
  emitChange()
}

export function useRecentItems(): RecentItem[] {
  return useSyncExternalStore(subscribe, getSnapshotStable, () => [])
}

/**
 * Hook that returns a function to track page visits.
 * Call trackVisit() in click handlers or navigation callbacks.
 */
export function useTrackRecent() {
  return useCallback((item: Omit<RecentItem, 'visitedAt'>) => {
    trackRecentItem(item)
  }, [])
}
