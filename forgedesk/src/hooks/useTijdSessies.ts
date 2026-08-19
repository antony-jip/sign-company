import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { logger } from '@/utils/logger'
import { supabase, isSupabaseConfigured } from '@/services/supabaseClient'
import {
  getTijdSessies, startTijdSessie, stopTijdSessie,
  sessieSeconden, isVerlopen,
} from '@/services/tijdSessieService'
import type { StopResultaat } from '@/services/tijdSessieService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { TijdSessie, Medewerker } from '@/types'

const POLL_MS = 30_000

export interface InklokDoel {
  projectId?: string
  projectNaam?: string
  omschrijving?: string
}

interface Opties {
  projectId?: string
  projectNaam?: string
  medewerker?: Medewerker | null
}

/**
 * Lopende inklok-sessies van de hele organisatie. De tabel bevat maximaal één
 * rij per ingeklokte collega, dus alles ophalen is goedkoper dan twee queries
 * (project-sessies plus je eigen sessie die elders kan lopen).
 */
export function useTijdSessies({ projectId, projectNaam, medewerker }: Opties) {
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const [alleSessies, setAlleSessies] = useState<TijdSessie[]>([])
  const [laden, setLaden] = useState(true)
  const [bezig, setBezig] = useState(false)
  const [nuMs, setNuMs] = useState(() => Date.now())
  const gemountRef = useRef(true)
  const kanaalIdRef = useRef(Math.random().toString(36).slice(2))

  const uurtarief = medewerker?.uurtarief || settings.standaard_uurtarief || 0

  const herlaad = useCallback(async () => {
    try {
      const data = await getTijdSessies()
      if (gemountRef.current) setAlleSessies(data)
    } catch (err) {
      logger.error('Kon lopende tijdsessies niet laden:', err)
    } finally {
      if (gemountRef.current) setLaden(false)
    }
  }, [])

  useEffect(() => {
    gemountRef.current = true
    herlaad()
    return () => { gemountRef.current = false }
  }, [herlaad])

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return
    // Unieke kanaalnaam: de hook draait tegelijk in de projectkaart en in de
    // bovenbalk, en twee abonnementen op dezelfde naam verdragen elkaar niet.
    const kanaal = supabase
      .channel(`tijd-sessies-${kanaalIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tijd_sessies' }, () => herlaad())
      .subscribe()

    const poll = setInterval(herlaad, POLL_MS)
    function bijZichtbaar() {
      if (document.visibilityState === 'visible') herlaad()
    }
    document.addEventListener('visibilitychange', bijZichtbaar)

    return () => {
      supabase?.removeChannel(kanaal)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', bijZichtbaar)
    }
  }, [herlaad])

  // Alleen tikken als er iets loopt, anders rendert elke seconde voor niets.
  useEffect(() => {
    if (alleSessies.length === 0) return
    const tik = setInterval(() => setNuMs(Date.now()), 1000)
    return () => clearInterval(tik)
  }, [alleSessies.length])

  const projectSessies = useMemo(
    () => (projectId ? alleSessies.filter((s) => s.project_id === projectId) : []),
    [alleSessies, projectId],
  )

  const eigenSessie = useMemo(
    () => (user?.id ? alleSessies.find((s) => s.user_id === user.id) || null : null),
    [alleSessies, user?.id],
  )

  const eigenSessieElders = eigenSessie && eigenSessie.project_id !== projectId ? eigenSessie : null

  // Doel is optioneel: de projectkaart klokt in op haar eigen project, de
  // urenpagina op het project dat je daar in de lijst kiest.
  const inklokken = useCallback(async (doel?: InklokDoel): Promise<StopResultaat | null> => {
    const doelProject = doel?.projectId || projectId
    if (!user?.id || !doelProject || bezig) return null
    setBezig(true)
    try {
      const { vorige } = await startTijdSessie(user.id, {
        project_id: doelProject,
        project_naam: doel?.projectNaam ?? projectNaam,
        medewerker_id: medewerker?.id,
        medewerker_naam: medewerker?.naam,
        omschrijving: doel?.omschrijving,
        uurtarief,
      })
      await herlaad()
      return vorige
    } finally {
      if (gemountRef.current) setBezig(false)
    }
  }, [user?.id, projectId, projectNaam, medewerker?.id, medewerker?.naam, uurtarief, bezig, herlaad])

  const uitklokken = useCallback(async (): Promise<StopResultaat | null> => {
    if (!eigenSessie || bezig) return null
    setBezig(true)
    try {
      const resultaat = await stopTijdSessie(eigenSessie, uurtarief)
      await herlaad()
      return resultaat
    } finally {
      if (gemountRef.current) setBezig(false)
    }
  }, [eigenSessie, uurtarief, bezig, herlaad])

  return {
    projectSessies,
    eigenSessie,
    eigenSessieElders,
    laden,
    bezig,
    inklokken,
    uitklokken,
    herlaad,
    secondenVan: (sessie: TijdSessie) => sessieSeconden(sessie, nuMs),
    isVerlopen: (sessie: TijdSessie) => isVerlopen(sessie, nuMs),
  }
}
