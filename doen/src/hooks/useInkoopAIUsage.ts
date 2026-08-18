import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabaseClient'

export interface RouteUsage {
  used: number
  cap: number
  remaining: number
  percent: number
  warning: boolean
  blocked: boolean
}

export interface InkoopAIUsage {
  extract: RouteUsage
  analyze: RouteUsage
  maand: string
}

const STALE_MS = 5 * 60 * 1000

interface CacheState {
  data: InkoopAIUsage | null
  lastFetched: number
  inFlight: Promise<InkoopAIUsage | null> | null
}

const cache: CacheState = { data: null, lastFetched: 0, inFlight: null }
const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

async function fetchUsage(): Promise<InkoopAIUsage | null> {
  if (!supabase) return null
  const session = (await supabase.auth.getSession()).data.session
  if (!session?.access_token) return null

  const res = await fetch('/api/inkoop-ai-usage', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function refresh(force: boolean): Promise<void> {
  if (!force && cache.data && Date.now() - cache.lastFetched < STALE_MS) return
  if (cache.inFlight) {
    await cache.inFlight
    return
  }
  cache.inFlight = fetchUsage()
  try {
    const data = await cache.inFlight
    if (data) {
      cache.data = data
      cache.lastFetched = Date.now()
      notify()
    }
  } catch {
    // Niet-kritiek — banner blijft hidden bij netwerk-fout
  } finally {
    cache.inFlight = null
  }
}

export function useInkoopAIUsage(): { data: InkoopAIUsage | null; refetch: () => void } {
  const { isAuthenticated } = useAuth()
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) return
    const listener = () => setTick(t => t + 1)
    listeners.add(listener)
    refresh(false)
    return () => { listeners.delete(listener) }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    const onFocus = () => { refresh(false) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [isAuthenticated])

  const refetch = useCallback(() => { void refresh(true) }, [])

  return { data: cache.data, refetch }
}
