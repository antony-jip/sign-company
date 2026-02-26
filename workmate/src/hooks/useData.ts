import { useState, useEffect, useCallback } from 'react'
import * as db from '@/services/supabaseService'
import type { Klant, Project, Taak, Offerte, OfferteItem, Email, CalendarEvent, Document as DocType, Grootboek, BtwCode, Korting } from '@/types'

interface UseDataResult<T> {
  data: T[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function useServiceData<T>(fetcher: () => Promise<T[]>): UseDataResult<T> {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (e: any) {
      setError(e.message || 'Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}

export function useKlanten() {
  return useServiceData<Klant>(db.getKlanten)
}

export function useProjecten() {
  return useServiceData<Project>(db.getProjecten)
}

export function useTaken() {
  return useServiceData<Taak>(db.getTaken)
}

export function useTakenByProject(projectId: string) {
  const fetcher = useCallback(() => db.getTakenByProject(projectId), [projectId])
  return useServiceData<Taak>(fetcher)
}

export function useOffertes() {
  return useServiceData<Offerte>(db.getOffertes)
}

export function useOfferteItems(offerteId: string) {
  const fetcher = useCallback(() => db.getOfferteItems(offerteId), [offerteId])
  return useServiceData<OfferteItem>(fetcher)
}

export function useEmails() {
  return useServiceData<Email>(db.getEmails)
}

export function useEvents() {
  return useServiceData<CalendarEvent>(db.getEvents)
}

export function useDocumenten() {
  return useServiceData<DocType>(db.getDocumenten)
}

export function useGrootboek() {
  return useServiceData<Grootboek>(db.getGrootboek)
}

export function useBtwCodes() {
  return useServiceData<BtwCode>(db.getBtwCodes)
}

export function useKortingen() {
  return useServiceData<Korting>(db.getKortingen)
}
