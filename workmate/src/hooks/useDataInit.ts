import { useState, useEffect } from 'react'
import {
  mockKlanten, mockProjecten, mockTaken, mockOffertes, mockOfferteItems,
  mockEmails, mockEvents, mockGrootboek, mockBtwCodes, mockKortingen, mockDocumenten
} from '@/data/mockData'

const INIT_KEY = 'workmate_initialized'

const seedData: Record<string, any[]> = {
  workmate_klanten: mockKlanten,
  workmate_projecten: mockProjecten,
  workmate_taken: mockTaken,
  workmate_offertes: mockOffertes,
  workmate_offerte_items: mockOfferteItems,
  workmate_documenten: mockDocumenten,
  workmate_emails: mockEmails,
  workmate_events: mockEvents,
  workmate_grootboek: mockGrootboek,
  workmate_btw_codes: mockBtwCodes,
  workmate_kortingen: mockKortingen,
}

export function useDataInit() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(INIT_KEY)) {
      Object.entries(seedData).forEach(([key, data]) => {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify(data))
        }
      })
      localStorage.setItem(INIT_KEY, 'true')
    }
    setIsReady(true)
  }, [])

  return { isReady }
}
