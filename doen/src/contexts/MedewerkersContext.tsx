import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getMedewerkers } from '@/services/supabaseService'
import { setMedewerkersSnapshot } from '@/utils/auditLogger'
import type { Medewerker } from '@/types'

interface MedewerkersContextType {
  medewerkers: Medewerker[]
  refresh: () => Promise<void>
}

const MedewerkersContext = createContext<MedewerkersContextType>({
  medewerkers: [],
  refresh: async () => {},
})

export function MedewerkersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])

  const refresh = async () => {
    if (!user?.id) {
      setMedewerkers([])
      setMedewerkersSnapshot([])
      return
    }
    try {
      const data = await getMedewerkers()
      setMedewerkers(data)
      setMedewerkersSnapshot(data)
    } catch {
      // fire-and-forget — geen toast, audit-naam valt terug op JWT
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <MedewerkersContext.Provider value={{ medewerkers, refresh }}>
      {children}
    </MedewerkersContext.Provider>
  )
}

export function useMedewerkers() {
  return useContext(MedewerkersContext)
}
