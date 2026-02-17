import { useState, useEffect } from 'react'

const storageKeys = [
  'workmate_klanten',
  'workmate_projecten',
  'workmate_taken',
  'workmate_offertes',
  'workmate_offerte_items',
  'workmate_documenten',
  'workmate_emails',
  'workmate_events',
  'workmate_grootboek',
  'workmate_btw_codes',
  'workmate_kortingen',
  'workmate_nieuwsbrieven',
]

export function useDataInit() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Ensure all localStorage keys exist as empty arrays if not present
    for (const key of storageKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]')
      }
    }
    setIsReady(true)
  }, [])

  return { isReady }
}
