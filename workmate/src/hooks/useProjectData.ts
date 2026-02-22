import { useState, useEffect, useCallback } from 'react'
import {
  getProject,
  updateProject,
  getTakenByProject,
  getDocumentenByProject,
  getOffertesByProject,
  getTekeningGoedkeuringen,
  getKlant,
  getTijdregistratiesByProject,
  getMedewerkers,
  getProjectToewijzingen,
  getWerkbonnenByProject,
  getUitgavenByProject,
} from '@/services/supabaseService'
import type {
  Project,
  Klant,
  Taak,
  Document,
  Offerte,
  TekeningGoedkeuring,
  Tijdregistratie,
  Medewerker,
  ProjectToewijzing,
  Werkbon,
  Uitgave,
} from '@/types'
import { logger } from '@/utils/logger'
import { toast } from 'sonner'

export interface ProjectData {
  project: Project | null
  klant: Klant | null
  taken: Taak[]
  documenten: Document[]
  offertes: Offerte[]
  goedkeuringen: TekeningGoedkeuring[]
  tijdregistraties: Tijdregistratie[]
  medewerkers: Medewerker[]
  toewijzingen: ProjectToewijzing[]
  werkbonnen: Werkbon[]
  uitgaven: Uitgave[]
  isLoading: boolean
  setProject: React.Dispatch<React.SetStateAction<Project | null>>
  setTaken: React.Dispatch<React.SetStateAction<Taak[]>>
  setDocumenten: React.Dispatch<React.SetStateAction<Document[]>>
  setOffertes: React.Dispatch<React.SetStateAction<Offerte[]>>
  setGoedkeuringen: React.Dispatch<React.SetStateAction<TekeningGoedkeuring[]>>
  setToewijzingen: React.Dispatch<React.SetStateAction<ProjectToewijzing[]>>
  refetchTaken: () => Promise<void>
  refetchDocumenten: () => Promise<void>
  refetchOffertes: () => Promise<void>
  refetchGoedkeuringen: () => Promise<void>
}

export function useProjectData(id: string | undefined): ProjectData {
  const [project, setProject] = useState<Project | null>(null)
  const [klant, setKlant] = useState<Klant | null>(null)
  const [taken, setTaken] = useState<Taak[]>([])
  const [documenten, setDocumenten] = useState<Document[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [goedkeuringen, setGoedkeuringen] = useState<TekeningGoedkeuring[]>([])
  const [tijdregistraties, setTijdregistraties] = useState<Tijdregistratie[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [toewijzingen, setToewijzingen] = useState<ProjectToewijzing[]>([])
  const [werkbonnen, setWerkbonnen] = useState<Werkbon[]>([])
  const [uitgaven, setUitgaven] = useState<Uitgave[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetchTaken = useCallback(async () => {
    if (!id) return
    try {
      const data = await getTakenByProject(id)
      setTaken(data)

      // Auto-update project voortgang based on tasks
      if (data.length > 0) {
        const klaarCount = data.filter(t => t.status === 'klaar').length
        const newVoortgang = Math.round((klaarCount / data.length) * 100)
        setProject(prev => {
          if (prev && prev.voortgang !== newVoortgang) {
            updateProject(id, { voortgang: newVoortgang }).catch(() => {})
            return { ...prev, voortgang: newVoortgang }
          }
          return prev
        })
      }
    } catch (err) {
      logger.error('Fout bij ophalen taken:', err)
    }
  }, [id])

  const refetchDocumenten = useCallback(async () => {
    if (!id) return
    try {
      const data = await getDocumentenByProject(id)
      setDocumenten(data)
    } catch (err) {
      logger.error('Fout bij ophalen documenten:', err)
    }
  }, [id])

  const refetchOffertes = useCallback(async () => {
    if (!id) return
    try {
      const data = await getOffertesByProject(id)
      setOffertes(data)
    } catch (err) {
      logger.error('Fout bij ophalen offertes:', err)
    }
  }, [id])

  const refetchGoedkeuringen = useCallback(async () => {
    if (!id) return
    try {
      const data = await getTekeningGoedkeuringen(id)
      setGoedkeuringen(data)
    } catch (err) {
      logger.error('Fout bij ophalen goedkeuringen:', err)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      if (!id) return
      setIsLoading(true)
      try {
        const [
          projectData,
          takenData,
          documentenData,
          offertesData,
          goedkeuringenData,
          tijdData,
          medewerkersData,
          toewijzingenData,
          werkbonnenData,
          uitgavenData,
        ] = await Promise.all([
          getProject(id),
          getTakenByProject(id),
          getDocumentenByProject(id),
          getOffertesByProject(id),
          getTekeningGoedkeuringen(id),
          getTijdregistratiesByProject(id),
          getMedewerkers(),
          getProjectToewijzingen(id),
          getWerkbonnenByProject(id),
          getUitgavenByProject(id),
        ])
        if (!cancelled) {
          setProject(projectData)
          setTaken(takenData)
          setDocumenten(documentenData)
          setOffertes(offertesData)
          setGoedkeuringen(goedkeuringenData)
          setTijdregistraties(tijdData)
          setMedewerkers(medewerkersData || [])
          setToewijzingen(toewijzingenData || [])
          setWerkbonnen(werkbonnenData || [])
          setUitgaven(uitgavenData || [])
        }

        if (projectData?.klant_id) {
          const klantData = await getKlant(projectData.klant_id)
          if (!cancelled) setKlant(klantData)
        }
      } catch (err) {
        logger.error('Fout bij ophalen projectgegevens:', err)
        if (!cancelled) toast.error('Kon projectgegevens niet laden')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [id])

  return {
    project,
    klant,
    taken,
    documenten,
    offertes,
    goedkeuringen,
    tijdregistraties,
    medewerkers,
    toewijzingen,
    werkbonnen,
    uitgaven,
    isLoading,
    setProject,
    setTaken,
    setDocumenten,
    setOffertes,
    setGoedkeuringen,
    setToewijzingen,
    refetchTaken,
    refetchDocumenten,
    refetchOffertes,
    refetchGoedkeuringen,
  }
}
