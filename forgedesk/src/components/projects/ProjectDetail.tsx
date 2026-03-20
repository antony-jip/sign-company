import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useTabDirtyState } from '@/hooks/useTabDirtyState'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Upload,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  File,
  Send,
  Mail,
  Receipt,
  CheckCircle2,
  Copy,
  Pencil,
  Paperclip,
  Trash2,
  CheckCheck,
  Sparkles,
  Loader2,
  CreditCard,
  Save,
  AlertTriangle,
  ClipboardCheck,
  Check,
  GripVertical,
  Camera,
  Wrench,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  cn,
  formatCurrency,
  formatDate,
  getStatusColor,
  getPriorityColor,
  getInitials,
} from '@/lib/utils'
import {
  getProject,
  updateProject,
  createProject,
  getTakenByProject,
  getDocumenten,
  createTaak,
  updateTaak,
  getOffertesByProject,
  updateOfferte,
  createDocument,
  deleteDocument,
  getProjectFotos,
  createProjectFoto,
  createTekeningGoedkeuring,
  getTekeningGoedkeuringen,
  getKlant,
  getKlanten,
  getTijdregistratiesByProject,
  getMedewerkers,
  getProjectToewijzingen,
  createProjectToewijzing,
  deleteProjectToewijzing,
  getWerkbonnenByProject,
  deleteWerkbon,
  getFactuur,
  getFacturenByProject,
  getUitgavenByProject,
  getMontageAfsprakenByProject,
  createMontageAfspraak,
  getSigningVisualisatiesByProject,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { analyzeProject } from '@/services/aiService'
import { sendEmail } from '@/services/gmailService'
import { tekeningGoedkeuringTemplate } from '@/services/emailTemplateService'
// ProjectTasksTable removed — using TaskChecklistView in TakenOfferteGrid
import { ProjectPhotoGallery } from './ProjectPhotoGallery'
import { VisualisatieGallery } from '@/components/visualizer/VisualisatieGallery'
import { WerkbonVanProjectDialog } from '@/components/werkbonnen/WerkbonVanProjectDialog'
import { SpectrumBar } from '@/components/ui/SpectrumBar'
import { getSpectrumPercentage } from '@/utils/spectrumUtils'
import { ProjectKaart } from './cockpit/ProjectKaart'
import { PortaalCompactCard } from './cockpit/PortaalSidebarCard'
import { TaskChecklistView } from './cockpit/TaskChecklistView'
import { BriefingCard } from './cockpit/BriefingCard'
import { TakenOfferteGrid } from './cockpit/TakenOfferteGrid'
import { MontageSection } from './cockpit/MontageSection'
import { BestandenSection } from './cockpit/BestandenSection'
import { ActiviteitFeed } from './cockpit/ActiviteitFeed'
import { useProjectSidebarConfig } from '@/hooks/useProjectSidebarConfig'
import type { Taak, Project, Document, Offerte, TekeningGoedkeuring, Klant, Tijdregistratie, Medewerker, ProjectToewijzing, Werkbon, Factuur, Uitgave, MontageAfspraak, ProjectFoto } from '@/types'
import { berekenBudgetStatus } from '@/utils/budgetUtils'
import { logger } from '../../utils/logger'
import { logWijziging } from '@/utils/auditLogger'

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
  'te-factureren': 'Te factureren',
  gefactureerd: 'Gefactureerd',
}

type ProjectTab = 'overzicht' | 'werkbon' | 'financieel' | 'notities'



function getFileIcon(type: string, size: string = 'h-8 w-8') {
  if (type.includes('pdf')) return <FileText className={`${size} text-red-500`} />
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv'))
    return <FileSpreadsheet className={`${size} text-green-600`} />
  if (type.includes('zip') || type.includes('archive'))
    return <FileArchive className={`${size} text-yellow-600`} />
  if (type.includes('image') || type.includes('jpeg') || type.includes('png'))
    return <FileImage className={`${size} text-primary`} />
  if (type.includes('illustrator') || type.includes('acad'))
    return <File className={`${size} text-orange-500`} />
  return <File className={`${size} text-muted-foreground/60`} />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}


export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setDirty } = useTabDirtyState()
  const location = useLocation()
  const { user } = useAuth()
  const { offertePrefix, offerteGeldigheidDagen, standaardBtw, bedrijfsnaam, primaireKleur, emailHandtekening } = useAppSettings()
  const { config: sidebarConfig } = useProjectSidebarConfig()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<ProjectTab>(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    return (['overzicht', 'werkbon', 'financieel', 'notities'].includes(tabParam || '') ? tabParam : 'overzicht') as ProjectTab
  })
  const handleTabChange = (tab: ProjectTab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }
  // takenWeergave removed — using TaskChecklistView only
  const [nieuweTaakOpen, setNieuweTaakOpen] = useState(false)
  const [nieuweTaakTitel, setNieuweTaakTitel] = useState('')
  const [nieuweTaakBeschrijving, setNieuweTaakBeschrijving] = useState('')
  const [nieuweTaakToegewezen, setNieuweTaakToegewezen] = useState('')
  const [nieuweTaakDeadline, setNieuweTaakDeadline] = useState('')
  const [nieuweTaakStatus, setNieuweTaakStatus] = useState<Taak['status']>('todo')
  const [nieuweTaakPrioriteit, setNieuweTaakPrioriteit] = useState<Taak['prioriteit']>('medium')

  const [project, setProject] = useState<Project | null>(null)
  const [klant, setKlant] = useState<Klant | null>(null)
  const [projectTaken, setProjectTaken] = useState<Taak[]>([])
  const [projectDocumenten, setProjectDocumenten] = useState<Document[]>([])
  const [projectOffertes, setProjectOffertes] = useState<Offerte[]>([])
  const [offerteFactuurMap, setOfferteFactuurMap] = useState<Record<string, Factuur>>({})
  const [goedkeuringen, setGoedkeuringen] = useState<TekeningGoedkeuring[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  // AI analysis state
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false)
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null)


  // Offerte aanmaken - navigeert naar de volledige offerte-pagina
  const openNieuweOfferte = () => {
    if (!project) return
    const params = new URLSearchParams({
      project_id: id || '',
      klant_id: project.klant_id || '',
      titel: project.naam || '',
    })
    navigate(`/offertes/nieuw?${params.toString()}`)
  }

  // ── Verstuur naar klant dialog ──
  const [verstuurOpen, setVerstuurOpen] = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [selectedOfferteId, setSelectedOfferteId] = useState<string>('')
  const [verstuurOnderwerp, setVerstuurOnderwerp] = useState('')
  const [verstuurBericht, setVerstuurBericht] = useState('')
  const [isVersturen, setIsVersturen] = useState(false)

  // Briefing state
  const [briefingOpen, setBriefingOpen] = useState(false)
  const [briefingText, setBriefingText] = useState('')
  const [briefingSaving, setBriefingSaving] = useState(false)

  // Budget tracking state
  const [projectTijdregistraties, setProjectTijdregistraties] = useState<Tijdregistratie[]>([])

  // Project rechten state
  const [alleMedewerkers, setAlleMedewerkers] = useState<Medewerker[]>([])
  const [projectToewijzingen, setProjectToewijzingen] = useState<ProjectToewijzing[]>([])
  const [projectWerkbonnen, setProjectWerkbonnen] = useState<Werkbon[]>([])
  const [showWerkbonDialog, setShowWerkbonDialog] = useState(false)
  const [goedkeuringenOpen, setGoedkeuringenOpen] = useState(false)
  const [projectFotos, setProjectFotos] = useState<ProjectFoto[]>([])
  const [projectMontages, setProjectMontages] = useState<MontageAfspraak[]>([])
  const [projectFacturen, setProjectFacturen] = useState<Factuur[]>([])
  const [projectUitgaven, setProjectUitgaven] = useState<Uitgave[]>([])
  const [hasVisualisaties, setHasVisualisaties] = useState(false)
  const [montageDialogOpen, setMontageDialogOpen] = useState(false)
  const [montageTitel, setMontageTitel] = useState('')
  const [montageDatum, setMontageDatum] = useState('')
  const [montageStartTijd, setMontageStartTijd] = useState('08:00')
  const [montageEindTijd, setMontageEindTijd] = useState('17:00')
  const [montageLocatie, setMontageLocatie] = useState('')
  const [montageNotities, setMontageNotities] = useState('')
  const [montageMonteurs, setMontageMonteurs] = useState<string[]>([])
  const [isSavingMontage, setIsSavingMontage] = useState(false)
  const [toewijzingMedewerkerId, setToewijzingMedewerkerId] = useState('')
  const [toewijzingRol, setToewijzingRol] = useState<ProjectToewijzing['rol']>('medewerker')

  // Project kopiëren state
  const [kopieDialogOpen, setKopieDialogOpen] = useState(false)
  const [kopieNaam, setKopieNaam] = useState('')
  const [kopieKlantId, setKopieKlantId] = useState('')
  const [kopieStartDatum, setKopieStartDatum] = useState(new Date().toISOString().split('T')[0])
  const [alleKlanten, setAlleKlanten] = useState<Klant[]>([])
  const [kopieBezig, setKopieBezig] = useState(false)

  // Email offerte state (simple offerte mail)
  const [emailOfferteOpen, setEmailOfferteOpen] = useState(false)
  const [emailOnderwerp, setEmailOnderwerp] = useState('')
  const [emailBericht, setEmailBericht] = useState('')
  const [emailOfferteId, setEmailOfferteId] = useState<string | null>(null)
  const [isEmailVerzenden, setIsEmailVerzenden] = useState(false)

  // Initialize briefing text when project loads
  useEffect(() => {
    if (project?.beschrijving) {
      setBriefingText(project.beschrijving)
    }
  }, [project?.beschrijving])

  const handleOpenMontageDialog = () => {
    setMontageTitel(project?.naam ? `Montage: ${project.naam}` : '')
    setMontageLocatie(klant?.adres ? `${klant.adres}${klant.stad ? `, ${klant.stad}` : ''}` : '')
    setMontageDatum('')
    setMontageStartTijd('08:00')
    setMontageEindTijd('17:00')
    setMontageNotities('')
    setMontageMonteurs([])
    setMontageDialogOpen(true)
  }

  const handleSaveMontage = async () => {
    if (!montageTitel.trim()) { toast.error('Vul een titel in'); return }
    if (!montageDatum) { toast.error('Selecteer een datum'); return }
    if (!montageLocatie.trim()) { toast.error('Vul een locatie in'); return }

    try {
      setIsSavingMontage(true)
      const newMontage = await createMontageAfspraak({
        user_id: user?.id || '',
        project_id: id || '',
        project_naam: project?.naam || '',
        klant_id: project?.klant_id || '',
        klant_naam: klant?.bedrijfsnaam || '',
        titel: montageTitel,
        beschrijving: '',
        datum: montageDatum,
        start_tijd: montageStartTijd,
        eind_tijd: montageEindTijd,
        locatie: montageLocatie,
        monteurs: montageMonteurs,
        materialen: [],
        notities: montageNotities,
        status: 'gepland',
      })
      setProjectMontages(prev => [...prev, newMontage])
      setMontageDialogOpen(false)
      toast.success('Montage ingepland')
      setDirty(false)
    } catch {
      toast.error('Kon montage niet inplannen')
    } finally {
      setIsSavingMontage(false)
    }
  }

  const handleSaveBriefing = async () => {
    if (!project || !id) return
    setBriefingSaving(true)
    try {
      const updated = await updateProject(id, { beschrijving: briefingText })
      setProject(updated)
      toast.success('Briefing opgeslagen')
      setDirty(false)
      setBriefingOpen(false)
    } catch (err) {
      logger.error('Fout bij opslaan briefing:', err)
      toast.error('Kon briefing niet opslaan')
    } finally {
      setBriefingSaving(false)
    }
  }

  const handleOfferteStatusChange = async (offerteId: string, newStatus: Offerte['status']) => {
    try {
      await updateOfferte(offerteId, { status: newStatus })
      setProjectOffertes((prev) =>
        prev.map((o) => (o.id === offerteId ? { ...o, status: newStatus } : o))
      )
      const statusLabels: Record<string, string> = {
        concept: 'Concept', verzonden: 'Verzonden', bekeken: 'Bekeken',
        goedgekeurd: 'Goedgekeurd', afgewezen: 'Afgewezen', verlopen: 'Verlopen', gefactureerd: 'Gefactureerd',
      }
      toast.success(`Status gewijzigd naar ${statusLabels[newStatus] || newStatus}`)
    } catch {
      toast.error('Kon status niet wijzigen')
    }
  }

  const handleCreateFactuurFromOfferte = (offerte: Offerte) => {
    if (!project) return

    // Duplicate check: als offerte al een factuur heeft, navigeer daarheen
    if (offerte.geconverteerd_naar_factuur_id) {
      toast.info(`Offerte ${offerte.nummer} is al gefactureerd`)
      navigate(`/facturen/${offerte.geconverteerd_naar_factuur_id}/bewerken`)
      return
    }

    // Navigeer naar FactuurEditor met pre-fill params
    const params = new URLSearchParams({
      offerte_id: offerte.id,
      klant_id: offerte.klant_id,
      project_id: id || '',
      titel: offerte.titel,
    })
    navigate(`/facturen/nieuw?${params.toString()}`)
  }

  const openKopieDialog = async () => {
    if (!project) return
    setKopieNaam(`${project.naam} (kopie)`)
    setKopieKlantId(project.klant_id || '')
    setKopieStartDatum(new Date().toISOString().split('T')[0])
    try {
      const klanten = await getKlanten()
      setAlleKlanten(klanten)
    } catch {
      setAlleKlanten([])
    }
    setKopieDialogOpen(true)
  }

  const handleKopieerProject = async () => {
    if (!project || !user || !kopieNaam.trim()) return
    setKopieBezig(true)
    try {
      const gekozenKlant = alleKlanten.find(k => k.id === kopieKlantId)
      const newProject = await createProject({
        user_id: user.id,
        naam: kopieNaam.trim(),
        klant_id: kopieKlantId || project.klant_id,
        beschrijving: project.beschrijving,
        status: 'gepland',
        prioriteit: project.prioriteit,
        start_datum: kopieStartDatum,
        eind_datum: undefined,
        budget: project.budget,
        besteed: 0,
        voortgang: 0,
        team_leden: [...project.team_leden],
        budget_waarschuwing_pct: project.budget_waarschuwing_pct,
        bron_project_id: project.id,
      })

      // Kopieer taken (zonder datums / bestede tijd)
      for (const taak of projectTaken) {
        await createTaak({
          user_id: user.id,
          project_id: newProject.id,
          titel: taak.titel,
          beschrijving: taak.beschrijving,
          status: 'todo',
          prioriteit: taak.prioriteit,
          toegewezen_aan: taak.toegewezen_aan,
          deadline: undefined,
          geschatte_tijd: taak.geschatte_tijd,
          bestede_tijd: 0,
        })
      }

      toast.success(`Project "${kopieNaam}" aangemaakt met ${projectTaken.length} taken`)
      setKopieDialogOpen(false)
      navigate(`/projecten/${newProject.id}`)
    } catch (err) {
      logger.error('Fout bij kopiëren project:', err)
      toast.error('Kon project niet kopiëren')
    } finally {
      setKopieBezig(false)
    }
  }

  const fetchTaken = useCallback(async () => {
    if (!id) return
    try {
      const taken = await getTakenByProject(id)
      setProjectTaken(taken)
    } catch (err) {
      logger.error('Fout bij ophalen taken:', err)
    }
  }, [id])

  const fetchOffertes = useCallback(async () => {
    if (!id) return
    try {
      const offertes = await getOffertesByProject(id)
      setProjectOffertes(offertes)
    } catch (err) {
      logger.error('Fout bij ophalen offertes:', err)
    }
  }, [id])

  const fetchDocumenten = useCallback(async () => {
    if (!id) return
    try {
      const allDocs = await getDocumenten()
      setProjectDocumenten(allDocs.filter((d) => d.project_id === id))
    } catch (err) {
      logger.error('Fout bij ophalen documenten:', err)
    }
  }, [id])

  const fetchProjectFotos = useCallback(async () => {
    if (!id) return
    try {
      const fotos = await getProjectFotos(id)
      setProjectFotos(fotos)
    } catch (err) {
      logger.error('Fout bij ophalen project foto\'s:', err)
    }
  }, [id])

  const fetchGoedkeuringen = useCallback(async () => {
    if (!id) return
    try {
      const gk = await getTekeningGoedkeuringen(id)
      setGoedkeuringen(gk)
    } catch (err) {
      logger.error('Fout bij ophalen goedkeuringen:', err)
    }
  }, [id])

  const handleAiAnalysis = async () => {
    if (!project) return
    setAiAnalysisLoading(true)
    setAiAnalysisOpen(true)
    setAiAnalysisResult(null)
    try {
      const result = await analyzeProject({
        naam: project.naam,
        beschrijving: project.beschrijving || '',
        status: project.status,
        budget: project.budget,
        besteed: project.besteed,
        voortgang: project.voortgang,
        taken: projectTaken.map((t) => ({
          titel: t.titel,
          status: t.status,
          prioriteit: t.prioriteit,
        })),
      })
      setAiAnalysisResult(result)
    } catch {
      setAiAnalysisResult('Kon de analyse niet uitvoeren. Probeer het later opnieuw.')
    } finally {
      setAiAnalysisLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      if (!id) return
      setIsLoading(true)
      try {
        const [projectData, takenData, allDocumenten, offertesData, goedkeuringenData, tijdData, medewerkersData, toewijzingenData, werkbonnenData, montageData, fotosData, facturenData, uitgavenData] = await Promise.all([
          getProject(id),
          getTakenByProject(id),
          getDocumenten(),
          getOffertesByProject(id),
          getTekeningGoedkeuringen(id),
          getTijdregistratiesByProject(id),
          getMedewerkers(),
          getProjectToewijzingen(id),
          getWerkbonnenByProject(id),
          getMontageAfsprakenByProject(id).catch(() => []),
          getProjectFotos(id).catch(() => []),
          getFacturenByProject(id).catch(() => [] as Factuur[]),
          getUitgavenByProject(id).catch(() => [] as Uitgave[]),
        ])
        if (!cancelled) {
          setProject(projectData)
          setProjectTaken(takenData)
          setProjectDocumenten(allDocumenten.filter((d) => d.project_id === id))
          setProjectOffertes(offertesData)
          setGoedkeuringen(goedkeuringenData)
          setProjectTijdregistraties(tijdData)
          setAlleMedewerkers(medewerkersData || [])
          setProjectToewijzingen(toewijzingenData || [])
          setProjectWerkbonnen(werkbonnenData || [])
          setProjectMontages(montageData || [])
          setProjectFotos(fotosData || [])
          setProjectFacturen(facturenData || [])
          setProjectUitgaven(uitgavenData || [])

          // Check if visualisaties exist for conditional rendering
          getSigningVisualisatiesByProject(id).then(viz => {
            if (!cancelled) setHasVisualisaties(viz.length > 0)
          }).catch(() => {})
        }

        // Fetch linked facturen for gefactureerde offertes
        const gefactuurdeOffertes = offertesData.filter((o: Offerte) => o.geconverteerd_naar_factuur_id)
        if (gefactuurdeOffertes.length > 0 && !cancelled) {
          Promise.all(
            gefactuurdeOffertes.map((o: Offerte) =>
              getFactuur(o.geconverteerd_naar_factuur_id!).then((f) => [o.id, f] as const).catch(() => null)
            )
          ).then((results) => {
            if (cancelled) return
            const map: Record<string, Factuur> = {}
            for (const r of results) {
              if (r && r[1]) map[r[0]] = r[1]
            }
            setOfferteFactuurMap(map)
          })
        }

        // Fetch klant data
        if (projectData?.klant_id) {
          const klantData = await getKlant(projectData.klant_id)
          if (!cancelled) {
            setKlant(klantData)
          }
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

  // ── File upload handler ──
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    for (const file of fileArray) {
      try {
        await createDocument({
          user_id: user?.id || '',
          project_id: id || null,
          klant_id: project?.klant_id || null,
          naam: file.name,
          type: file.type || 'application/octet-stream',
          grootte: file.size,
          map: 'Tekeningen',
          storage_path: `projects/${id}/${file.name}`,
          status: 'concept',
          tags: ['tekening'],
          gedeeld_met: [],
        })
      } catch (err) {
        logger.error(`Fout bij uploaden ${file.name}:`, err)
        toast.error(`Kon "${file.name}" niet uploaden`)
      }
    }
    toast.success(`${fileArray.length} bestand${fileArray.length > 1 ? 'en' : ''} geüpload`)
    await fetchDocumenten()
  }

  // ── Verstuur naar klant ──
  const openVerstuurDialog = () => {
    if (!project || !klant) {
      toast.error('Klantgegevens niet beschikbaar')
      return
    }
    setSelectedDocIds([])
    setSelectedOfferteId('')
    setVerstuurOnderwerp(`Tekeningen - ${project.naam}`)
    setVerstuurBericht(
      `Beste ${klant.contactpersoon || project.klant_naam || 'klant'},\n\nBijgaand ontvangt u de tekening(en) voor het project "${project.naam}".\n\nGraag ontvangen wij uw goedkeuring of eventuele opmerkingen via de link in deze e-mail.\n\nMet vriendelijke groet`
    )
    setVerstuurOpen(true)
  }

  const handleVerstuurNaarKlant = async () => {
    if (!project || !klant || selectedDocIds.length === 0) {
      toast.error('Selecteer minimaal één bestand om te versturen')
      return
    }
    setIsVersturen(true)
    try {
      const gk = await createTekeningGoedkeuring({
        user_id: user?.id || '',
        project_id: id!,
        klant_id: project.klant_id,
        document_ids: selectedDocIds,
        offerte_id: selectedOfferteId || undefined,
        status: 'verzonden',
        email_aan: klant.email,
        email_onderwerp: verstuurOnderwerp,
        email_bericht: verstuurBericht,
        revisie_nummer: 1,
      })

      // Actually send the email with the approval link
      try {
        const goedkeurUrl = `${window.location.origin}/goedkeuring/${gk.token}`
        const { subject, html } = tekeningGoedkeuringTemplate({
          klantNaam: klant.contactpersoon || klant.bedrijfsnaam,
          projectNaam: project.naam,
          beschrijving: verstuurBericht,
          goedkeurUrl,
          bedrijfsnaam: bedrijfsnaam || undefined,
          primaireKleur: primaireKleur || undefined,
          handtekening: emailHandtekening || undefined,
        })
        await sendEmail(klant.email, subject, '', { html })
      } catch (emailErr) {
        logger.error('Goedkeuring email mislukt:', emailErr)
        toast.error('Goedkeuring aangemaakt, maar email niet verzonden')
      }

      // Update offerte status if attached
      if (selectedOfferteId) {
        await updateOfferte(selectedOfferteId, { status: 'verzonden' })
      }

      toast.success('Tekeningen verstuurd naar klant!')
      setVerstuurOpen(false)
      await Promise.all([fetchGoedkeuringen(), fetchOffertes()])
    } catch (err) {
      logger.error('Fout bij versturen:', err)
      toast.error('Kon niet versturen naar klant')
    } finally {
      setIsVersturen(false)
    }
  }

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    )
  }

  const copyApprovalLink = (token: string) => {
    const link = `${window.location.origin}/goedkeuring/${token}`
    navigator.clipboard.writeText(link)
    toast.success('Link gekopieerd naar klembord')
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Button variant="ghost" asChild>
          <Link to="/projecten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Link>
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground mt-4">Project laden...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/projecten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Link>
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-medium text-foreground">Project niet gevonden</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Het project met ID "{id}" bestaat niet.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const eindDatum = project.eind_datum ? new Date(project.eind_datum ?? "") : null
  const isValidDate = eindDatum && !isNaN(eindDatum.getTime())
  const isOverdue = isValidDate && eindDatum < new Date() && project.status !== 'afgerond'
  const daysLeft = isValidDate ? Math.ceil((eindDatum.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
  const takenKlaar = projectTaken.filter(t => t.status === 'klaar').length
  const takenTotaal = projectTaken.length
  // projectFotos loaded from state via getProjectFotos

  const handleCockpitStatusChange = async (newStatus: Project['status']) => {
    try {
      const oudeStatus = project.status
      const updated = await updateProject(id!, { status: newStatus })
      setProject(updated)
      if (user?.id) {
        const naam = user.voornaam ? `${user.voornaam} ${user.achternaam || ''}`.trim() : user.email || ''
        logWijziging({ userId: user.id, entityType: 'project', entityId: id!, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: oudeStatus, nieuweWaarde: newStatus })
      }
      toast.success(`Status gewijzigd naar ${statusLabels[newStatus] || newStatus}`)
    } catch {
      toast.error('Kon status niet wijzigen')
    }
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-[#F4F3F0]">
      {/* Spectrum voortgangsstrip */}
      <SpectrumBar percentage={getSpectrumPercentage(project.status)} height={4} />

      {/* ── Hidden file inputs ── */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(e.target.files)
            e.target.value = ''
          }
        }}
      />

      {/* Mobile floating camera button */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <label
          className="flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 active:scale-95 transition-transform cursor-pointer"
        >
          <Camera className="h-6 w-6" />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0]
                if (!file.type.startsWith('image/')) return
                try {
                  await createProjectFoto(
                    { user_id: user?.id || '', project_id: id || '', omschrijving: file.name, type: 'situatie' },
                    file,
                  )
                  toast.success('Foto geüpload')
                  await fetchProjectFotos()
                } catch (err) {
                  logger.error('Fout bij uploaden foto:', err)
                  toast.error('Kon foto niet uploaden')
                }
              }
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {/* ══════════ PROJECT KAART (always visible) ══════════ */}
      <div className="p-5 pb-0">
        <ProjectKaart
          project={project}
          klant={klant}
          offertes={projectOffertes}
          taken={projectTaken}
          montageAfspraken={projectMontages}
          werkbonnen={projectWerkbonnen}
          facturen={projectFacturen}
          onCreateOfferte={openNieuweOfferte}
          onCreateWerkbon={() => setShowWerkbonDialog(true)}
          onCreateMontage={handleOpenMontageDialog}
          onCopyProject={openKopieDialog}
          onCreateFactuur={() => {
            const params = new URLSearchParams({
              klant_id: project.klant_id || '',
              project_id: id || '',
              titel: project.naam || '',
            })
            navigate(`/facturen/nieuw?${params.toString()}`)
          }}
          onArchive={async () => {
            try {
              const updated = await updateProject(id!, { status: 'afgerond' })
              setProject(updated)
              toast.success('Project gearchiveerd')
            } catch { toast.error('Kon project niet archiveren') }
          }}
        />
      </div>

      {/* ══════════ TAB BAR ══════════ */}
      <div className="flex items-center gap-0.5 border-b border-[hsl(35,15%,87%)] bg-transparent px-7 mt-4">
        {([
          { key: 'overzicht' as ProjectTab, label: 'Overzicht' },
          { key: 'werkbon' as ProjectTab, label: 'Werkbon', count: projectWerkbonnen.length },
          { key: 'financieel' as ProjectTab, label: 'Financieel' },
          { key: 'notities' as ProjectTab, label: 'Notities' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm transition-all duration-200 relative',
              activeTab === tab.key
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'ml-1.5 text-2xs rounded-full px-1.5 py-0.5 font-mono transition-colors',
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground/60'
              )}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-foreground rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ══════════ OVERZICHT TAB ══════════ */}
      {activeTab === 'overzicht' && (
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col lg:flex-row gap-5 p-5">
        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Briefing */}
          <BriefingCard
            beschrijving={project.beschrijving || ''}
            onSave={async (text) => {
              const updated = await updateProject(id!, { beschrijving: text })
              setProject(updated)
              toast.success('Briefing opgeslagen')
            }}
          />

          {/* Taken + Offerte grid */}
          <TakenOfferteGrid
            taken={projectTaken}
            offertes={projectOffertes}
            medewerkers={alleMedewerkers}
            projectId={id!}
            onNewTaak={() => setNieuweTaakOpen(true)}
            onNewOfferte={openNieuweOfferte}
            onTaakStatusChange={async (taakId, newStatus) => {
              try {
                await updateTaak(taakId, { status: newStatus })
                await fetchTaken()
                if (newStatus === 'klaar') {
                  const taak = projectTaken.find(t => t.id === taakId)
                  if (taak) toast.success(`"${taak.titel}" afgerond`)
                }
              } catch {
                toast.error('Kon status niet wijzigen')
              }
            }}
          />

          {/* Portaal (conditioneel — toont alleen bij actief portaal) */}
          <PortaalCompactCard projectId={id!} />

        </div>{/* einde main content */}

        {/* ── Sidebar ── */}
        <div className="w-full lg:w-[260px] xl:w-[280px] flex-shrink-0 space-y-5 lg:self-start lg:sticky lg:top-4">

          {/* Montage */}
          <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] p-4">
            <MontageSection
              montageAfspraken={projectMontages}
              onInplannen={handleOpenMontageDialog}
            />
          </div>

          {/* Bestanden */}
          <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] p-4">
            <BestandenSection
              documenten={projectDocumenten}
              onUpload={() => fileInputRef.current?.click()}
              onDelete={async (docId, naam) => {
                try {
                  await deleteDocument(docId)
                  toast.success(`"${naam}" verwijderd`)
                  await fetchDocumenten()
                } catch {
                  toast.error('Kon bestand niet verwijderen')
                }
              }}
            />
          </div>

          {/* Situatiefoto's */}
          <ProjectPhotoGallery
            projectId={id!}
            userId={user?.id || ''}
            photos={projectFotos}
            onPhotosChanged={fetchProjectFotos}
          />

          {/* Visualisaties (conditioneel) */}
          {hasVisualisaties && (
            <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] p-4">
              <h3 className="text-[13px] font-medium text-foreground mb-3">Visualizer</h3>
              <VisualisatieGallery project_id={project.id} klant_id={project.klant_id} compact />
            </div>
          )}

          {/* Activiteit */}
          <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] p-4">
            <ActiviteitFeed
              project={project}
              offertes={projectOffertes}
              montageAfspraken={projectMontages}
              werkbonnen={projectWerkbonnen}
              facturen={projectFacturen}
              taken={projectTaken}
              fotos={projectFotos}
              medewerkers={alleMedewerkers}
            />
          </div>

        </div>
      </div>
      </div>
      )}

      {/* ══════════ WERKBON TAB ══════════ */}
      {activeTab === 'werkbon' && (
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <Card className="border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                  <ClipboardCheck className="h-3.5 w-3.5 text-white" />
                </div>
                Werkbonnen
                <span className="text-xs text-muted-foreground font-normal">{projectWerkbonnen.length}</span>
              </CardTitle>
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setShowWerkbonDialog(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Nieuwe werkbon
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projectWerkbonnen.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Nog geen werkbonnen aangemaakt</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWerkbonDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Werkbon aanmaken
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {projectWerkbonnen.map((wb) => (
                  <div
                    key={wb.id}
                    className="group flex items-center justify-between p-3 rounded-lg border border-[hsl(35,15%,90%)] hover:border-[hsl(35,15%,80%)] hover:bg-[hsl(35,15%,98%)] cursor-pointer transition-all"
                    onClick={() => navigate(`/werkbonnen/${wb.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <ClipboardCheck className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold font-mono">{wb.werkbon_nummer}</p>
                        {wb.titel && <p className="text-xs text-muted-foreground">{wb.titel}</p>}
                        <p className="text-xs text-muted-foreground font-mono">{new Date(wb.datum).toLocaleDateString('nl-NL')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        wb.status === 'concept' ? 'bg-muted text-foreground/70' :
                        wb.status === 'definitief' ? 'bg-blue-100 text-blue-700' :
                        wb.status === 'afgerond' ? 'bg-green-100 text-green-700' :
                        'bg-muted text-foreground/70'
                      }`}>
                        {wb.status === 'concept' ? 'Concept' : wb.status === 'definitief' ? 'Definitief' : wb.status === 'afgerond' ? 'Afgerond' : wb.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`Werkbon ${wb.werkbon_nummer} verwijderen?`)) {
                            deleteWerkbon(wb.id)
                              .then(() => {
                                setProjectWerkbonnen(prev => prev.filter(w => w.id !== wb.id))
                                toast.success('Werkbon verwijderd')
                              })
                              .catch(() => toast.error('Kon werkbon niet verwijderen'))
                          }
                        }}
                        className="p-1.5 rounded-md text-muted-foreground/30 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Verwijderen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* ══════════ FINANCIEEL TAB ══════════ */}
      {activeTab === 'financieel' && (
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Totalen overzicht */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Geoffreerd', bedrag: projectOffertes.reduce((s, o) => s + o.totaal, 0), kleur: 'text-foreground' },
            { label: 'Gefactureerd', bedrag: projectFacturen.reduce((s, f) => s + f.totaal, 0), kleur: 'text-blue-600' },
            { label: 'Betaald', bedrag: projectFacturen.reduce((s, f) => s + (f.betaald_bedrag || 0), 0), kleur: 'text-emerald-600' },
            { label: 'Openstaand', bedrag: projectFacturen.reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0), kleur: 'text-amber-600' },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className={cn('text-lg font-semibold font-mono', item.kleur)}>
                {formatCurrency(item.bedrag)}
              </p>
            </div>
          ))}
        </div>

        {/* Budget waarschuwing */}
        {(() => {
          const bs = berekenBudgetStatus(project, projectTijdregistraties)
          if (bs.budget <= 0 || bs.niveau === 'normaal') return null
          return (
            <div className={`flex items-center gap-3 rounded-lg px-4 py-2 ${
              bs.niveau === 'overschreden'
                ? 'bg-red-50 border border-red-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${
                bs.niveau === 'overschreden' ? 'text-red-500' : 'text-amber-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {bs.niveau === 'overschreden'
                    ? `Budget overschreden: ${bs.percentage.toFixed(0)}%`
                    : `Budget waarschuwing: ${bs.percentage.toFixed(0)}% verbruikt`}
                </p>
                <p className="text-2xs text-muted-foreground font-mono">
                  {formatCurrency(bs.verbruikt)} van {formatCurrency(bs.budget)}
                </p>
              </div>
            </div>
          )
        })()}

        {/* Offertes */}
        {projectOffertes.length > 0 && (
          <Card className="border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5 text-white" />
                  </div>
                  Offertes
                  <span className="text-xs text-muted-foreground font-normal">{projectOffertes.length}</span>
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={openNieuweOfferte}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectOffertes.map((offerte) => {
                  const linkedFactuur = offerteFactuurMap[offerte.id]
                  return (
                    <div key={offerte.id} className="bg-background rounded-lg px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{offerte.titel}</p>
                        {offerte.status !== 'gefactureerd' ? (
                          <select
                            value={offerte.status}
                            onChange={(e) => handleOfferteStatusChange(offerte.id, e.target.value as Offerte['status'])}
                            className={`${getStatusColor(offerte.status)} text-2xs px-1.5 py-0.5 rounded-full border-0 cursor-pointer appearance-none font-medium focus:ring-1 focus:ring-primary/30 focus:outline-none`}
                          >
                            <option value="concept">Concept</option>
                            <option value="verzonden">Verzonden</option>
                            <option value="bekeken">Bekeken</option>
                            <option value="goedgekeurd">Goedgekeurd</option>
                            <option value="afgewezen">Afgewezen</option>
                            <option value="verlopen">Verlopen</option>
                          </select>
                        ) : (
                          <Badge className={`${getStatusColor(offerte.status)} text-2xs px-1.5 py-0 flex-shrink-0`}>
                            {offerte.status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">{offerte.nummer}</span>
                        <span className="text-sm font-bold text-foreground font-mono">{formatCurrency(offerte.totaal)}</span>
                      </div>
                      <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                          onClick={() => navigate(`/offertes/${offerte.id}/bewerken`, { state: { from: location.pathname } })}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Bewerken
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                          onClick={() => {
                            setEmailOfferteId(offerte.id)
                            setEmailOnderwerp(`Offerte ${offerte.nummer} - ${offerte.titel}`)
                            setEmailBericht(
                              `Beste ${project.klant_naam || 'klant'},\n\nHierbij ontvangt u onze offerte "${offerte.titel}" (${offerte.nummer}) ter waarde van ${formatCurrency(offerte.totaal)}.\n\nDeze offerte is geldig tot ${formatDate(offerte.geldig_tot)}.\n\nMocht u vragen hebben, neem dan gerust contact met ons op.\n\nMet vriendelijke groet`
                            )
                            setEmailOfferteOpen(true)
                          }}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Mail
                        </Button>
                      </div>
                      {!offerte.geconverteerd_naar_factuur_id && (
                        <div className="flex items-center justify-between bg-emerald-50 rounded-md px-2.5 py-1.5 border border-emerald-200 mt-1">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs text-emerald-700">Factureren</span>
                          </div>
                          <Button size="sm" className="h-6 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleCreateFactuurFromOfferte(offerte)}
                          >
                            Factureren &rarr;
                          </Button>
                        </div>
                      )}
                      {offerte.geconverteerd_naar_factuur_id && (
                        <div className="flex items-center justify-between bg-blue-50 rounded-md px-2.5 py-1.5 border border-blue-200 mt-1">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs text-blue-700">
                              {linkedFactuur ? (
                                <>{linkedFactuur.nummer} · <span className={linkedFactuur.status === 'betaald' ? 'text-emerald-600 font-medium' : ''}>{linkedFactuur.status}</span> · <span className="font-mono">{formatCurrency(linkedFactuur.totaal)}</span></>
                              ) : 'Gefactureerd'}
                            </span>
                          </div>
                          <Button variant="outline" size="sm" className="h-6 px-2.5 text-xs"
                            onClick={() => navigate(`/facturen/${offerte.geconverteerd_naar_factuur_id}`)}
                          >
                            Bekijk factuur
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Facturen */}
        {projectFacturen.length > 0 && (
          <Card className="border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-500/10">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                Facturen
                <span className="text-xs text-muted-foreground font-normal">{projectFacturen.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectFacturen.map((factuur) => (
                  <div key={factuur.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-background cursor-pointer transition-colors"
                    onClick={() => navigate(`/facturen/${factuur.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium font-mono">{factuur.nummer}</p>
                      <p className="text-xs text-muted-foreground font-mono">{new Date(factuur.factuurdatum).toLocaleDateString('nl-NL')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono">{formatCurrency(factuur.totaal)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        factuur.status === 'betaald' ? 'bg-emerald-100 text-emerald-700' :
                        factuur.status === 'vervallen' ? 'bg-red-100 text-red-700' :
                        factuur.status === 'verzonden' ? 'bg-blue-100 text-blue-700' :
                        'bg-muted text-foreground/70'
                      }`}>
                        {factuur.status === 'betaald' ? 'Betaald' : factuur.status === 'verzonden' ? 'Verzonden' : factuur.status === 'vervallen' ? 'Verlopen' : factuur.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Uitgaven */}
        {projectUitgaven.length > 0 && (
          <Card className="border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1 rounded-md bg-orange-500/10">
                  <Wallet className="h-3.5 w-3.5 text-orange-600" />
                </div>
                Uitgaven
                <span className="text-xs text-muted-foreground font-normal">{projectUitgaven.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectUitgaven.map((uitgave) => (
                  <div key={uitgave.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-background cursor-pointer transition-colors"
                    onClick={() => navigate('/uitgaven')}
                  >
                    <div>
                      <p className="text-sm font-medium font-mono">{uitgave.uitgave_nummer}</p>
                      <p className="text-xs text-muted-foreground font-mono">{new Date(uitgave.datum).toLocaleDateString('nl-NL')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono">{formatCurrency(uitgave.bedrag_incl_btw)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        uitgave.status === 'betaald' ? 'bg-emerald-100 text-emerald-700' :
                        uitgave.status === 'verlopen' ? 'bg-red-100 text-red-700' :
                        'bg-muted text-foreground/70'
                      }`}>
                        {uitgave.status === 'betaald' ? 'Betaald' : uitgave.status === 'verlopen' ? 'Verlopen' : 'Open'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {/* ══════════ NOTITIES TAB ══════════ */}
      {activeTab === 'notities' && (
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl mx-auto">
          <Card className="border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Notities & Briefing</CardTitle>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  disabled={briefingSaving}
                  onClick={handleSaveBriefing}
                >
                  {briefingSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                  Opslaan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={briefingText}
                onChange={(e) => setBriefingText(e.target.value)}
                placeholder="Voeg hier de projectbriefing en notities toe..."
                rows={16}
                className="resize-y border-[hsl(35,15%,87%)] focus:border-primary/40 transition-colors text-sm leading-relaxed"
              />
              {project.updated_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Laatst gewijzigd: {formatDate(project.updated_at)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* ══════════ DIALOGS (shared across all tabs) ══════════ */}

      {/* Werkbon aanmaken dialog */}
      {project && (
        <WerkbonVanProjectDialog
          open={showWerkbonDialog}
          onOpenChange={setShowWerkbonDialog}
          projectId={project.id}
          klantId={project.klant_id}
          klant={klant}
          offertes={projectOffertes}
        />
      )}

      {/* Nieuwe taak dialog */}
      <Dialog open={nieuweTaakOpen} onOpenChange={(open) => {
        setNieuweTaakOpen(open)
        if (!open) {
          setNieuweTaakTitel('')
          setNieuweTaakBeschrijving('')
          setNieuweTaakToegewezen('')
          setNieuweTaakDeadline('')
          setNieuweTaakStatus('todo')
          setNieuweTaakPrioriteit('medium')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe taak toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een nieuwe taak toe aan dit project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="taak-titel">Titel</Label>
              <Input
                id="taak-titel"
                placeholder="Titel van de taak..."
                value={nieuweTaakTitel}
                onChange={(e) => setNieuweTaakTitel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taak-beschrijving">Beschrijving</Label>
              <Input
                id="taak-beschrijving"
                placeholder="Beschrijving..."
                value={nieuweTaakBeschrijving}
                onChange={(e) => setNieuweTaakBeschrijving(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={nieuweTaakStatus} onValueChange={(v) => setNieuweTaakStatus(v as Taak['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="bezig">Bezig</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="klaar">Klaar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioriteit</Label>
                <Select value={nieuweTaakPrioriteit} onValueChange={(v) => setNieuweTaakPrioriteit(v as Taak['prioriteit'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laag">Laag</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hoog">Hoog</SelectItem>
                    <SelectItem value="kritiek">Kritiek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taak-toegewezen">Toegewezen aan</Label>
                <Select value={nieuweTaakToegewezen} onValueChange={setNieuweTaakToegewezen}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer teamlid..." />
                  </SelectTrigger>
                  <SelectContent>
                    {alleMedewerkers.map((m) => (
                      <SelectItem key={m.id} value={m.naam}>
                        {m.naam}
                      </SelectItem>
                    ))}
                    {projectToewijzingen.length > 0 && alleMedewerkers.length === 0 && (
                      <SelectItem value="_empty" disabled>Geen medewerkers gevonden</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taak-deadline">Deadline</Label>
                <Input
                  id="taak-deadline"
                  type="date"
                  value={nieuweTaakDeadline}
                  onChange={(e) => setNieuweTaakDeadline(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNieuweTaakOpen(false)}>
              Annuleren
            </Button>
            <Button
              disabled={!nieuweTaakTitel.trim()}
              onClick={async () => {
                try {
                  await createTaak({
                    user_id: user?.id || '',
                    project_id: id!,
                    titel: nieuweTaakTitel.trim(),
                    beschrijving: nieuweTaakBeschrijving.trim(),
                    status: nieuweTaakStatus,
                    prioriteit: nieuweTaakPrioriteit,
                    toegewezen_aan: nieuweTaakToegewezen.trim(),
                    deadline: nieuweTaakDeadline || new Date().toISOString().split('T')[0],
                    geschatte_tijd: 0,
                    bestede_tijd: 0,
                  })
                  toast.success(`Taak "${nieuweTaakTitel}" toegevoegd`)
                  setNieuweTaakOpen(false)
                  setNieuweTaakTitel('')
                  setNieuweTaakBeschrijving('')
                  setNieuweTaakToegewezen('')
                  setNieuweTaakDeadline('')
                  setNieuweTaakStatus('todo')
                  setNieuweTaakPrioriteit('medium')
                  await fetchTaken()
                } catch (err) {
                  logger.error('Fout bij aanmaken taak:', err)
                  toast.error('Kon taak niet aanmaken')
                }
              }}
            >
              Taak toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          {/* Email offerte dialog */}
          <Dialog open={emailOfferteOpen} onOpenChange={(open) => {
            setEmailOfferteOpen(open)
            if (!open) {
              setEmailOnderwerp('')
              setEmailBericht('')
              setEmailOfferteId(null)
            }
          }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-accent" />
                  Offerte versturen via e-mail
                </DialogTitle>
                <DialogDescription>
                  Verstuur deze offerte naar {project.klant_naam || 'de klant'}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email-aan">Aan</Label>
                  <Input
                    id="email-aan"
                    value={klant?.email || project.klant_naam || 'Klant'}
                    readOnly
                    className="bg-background dark:bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-onderwerp">Onderwerp</Label>
                  <Input
                    id="email-onderwerp"
                    value={emailOnderwerp}
                    onChange={(e) => setEmailOnderwerp(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-bericht">Bericht</Label>
                  <Textarea
                    id="email-bericht"
                    value={emailBericht}
                    onChange={(e) => setEmailBericht(e.target.value)}
                    rows={8}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEmailOfferteOpen(false)}>
                  Annuleren
                </Button>
                <Button
                  disabled={isEmailVerzenden || !emailOnderwerp.trim()}
                  className=""
                  onClick={async () => {
                    setIsEmailVerzenden(true)
                    try {
                      if (emailOfferteId) {
                        await updateOfferte(emailOfferteId, { status: 'verzonden' })
                      }
                      toast.success('Offerte succesvol verzonden via e-mail!')
                      setEmailOfferteOpen(false)
                      setEmailOnderwerp('')
                      setEmailBericht('')
                      setEmailOfferteId(null)
                      await fetchOffertes()
                    } catch (err) {
                      logger.error('Fout bij verzenden offerte:', err)
                      toast.error('Kon offerte niet verzenden')
                    } finally {
                      setIsEmailVerzenden(false)
                    }
                  }}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {isEmailVerzenden ? 'Verzenden...' : 'Versturen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>




      {/* ── AI Analyse dialog ── */}
      <Dialog open={aiAnalysisOpen} onOpenChange={setAiAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Projectanalyse
            </DialogTitle>
            <DialogDescription>
              AI-gegenereerde analyse van {project.naam}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {aiAnalysisLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground">Analyse wordt uitgevoerd...</p>
              </div>
            ) : aiAnalysisResult ? (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                {aiAnalysisResult}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiAnalysisOpen(false)}>
              Sluiten
            </Button>
            <Button
              onClick={handleAiAnalysis}
              disabled={aiAnalysisLoading}
              className=""
            >
              {aiAnalysisLoading
                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                : <Sparkles className="h-4 w-4 mr-1.5" />
              }
              Opnieuw analyseren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Verstuur naar klant dialog ── */}
      <Dialog open={verstuurOpen} onOpenChange={(open) => {
        setVerstuurOpen(open)
        if (!open) {
          setSelectedDocIds([])
          setSelectedOfferteId('')
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-accent" />
              Verstuur naar klant ter goedkeuring
            </DialogTitle>
            <DialogDescription>
              Selecteer bestanden en eventueel een offerte om naar {klant?.contactpersoon || project.klant_naam || 'de klant'} te versturen.
              De klant ontvangt een link om de bestanden te bekijken en goed te keuren of revisie aan te vragen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Bestanden selectie */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  Selecteer bestanden
                </Label>
                {projectDocumenten.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      if (selectedDocIds.length === projectDocumenten.length) {
                        setSelectedDocIds([])
                      } else {
                        setSelectedDocIds(projectDocumenten.map(d => d.id))
                      }
                    }}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    {selectedDocIds.length === projectDocumenten.length ? 'Deselecteer' : 'Selecteer alles'}
                  </Button>
                )}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-lg p-2">
                {projectDocumenten.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Geen bestanden. Upload eerst bestanden.
                  </p>
                ) : (
                  projectDocumenten.map((doc) => (
                    <label
                      key={doc.id}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                        selectedDocIds.includes(doc.id)
                          ? 'bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/30'
                          : 'bg-background dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDocSelection(doc.id)}
                        className="rounded border-border text-accent focus:ring-primary"
                      />
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.type, 'h-5 w-5')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.naam}</p>
                        <span className="text-2xs text-muted-foreground">{formatFileSize(doc.grootte)}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedDocIds.length > 0 && (
                <p className="text-xs text-accent">{selectedDocIds.length} bestand(en) geselecteerd</p>
              )}
            </div>

            {/* Offerte bijvoegen */}
            {projectOffertes.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-600" />
                  Offerte bijvoegen (optioneel)
                </Label>
                <select
                  value={selectedOfferteId}
                  onChange={e => setSelectedOfferteId(e.target.value)}
                  className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2 bg-card text-foreground dark:text-white"
                >
                  <option value="">Geen offerte bijvoegen</option>
                  {projectOffertes.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.nummer} - {o.titel} ({formatCurrency(o.totaal)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label>Aan</Label>
              <Input
                value={klant?.email || project.klant_naam || ''}
                readOnly
                className="bg-background dark:bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Onderwerp</Label>
              <Input
                value={verstuurOnderwerp}
                onChange={e => setVerstuurOnderwerp(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Bericht</Label>
              <Textarea
                value={verstuurBericht}
                onChange={e => setVerstuurBericht(e.target.value)}
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerstuurOpen(false)}>
              Annuleren
            </Button>
            <Button
              disabled={isVersturen || selectedDocIds.length === 0 || !verstuurOnderwerp.trim()}
              className=""
              onClick={handleVerstuurNaarKlant}
            >
              <Send className="mr-1.5 h-4 w-4" />
              {isVersturen ? 'Versturen...' : `Verstuur (${selectedDocIds.length} bestanden)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Kopieer project dialog ── */}
      <Dialog open={kopieDialogOpen} onOpenChange={(open) => {
        setKopieDialogOpen(open)
        if (!open) { setKopieNaam(''); setKopieKlantId(''); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-accent" />
              Project kopiëren
            </DialogTitle>
            <DialogDescription>
              Taken en teamleden worden gekopieerd. Tijdregistraties, facturen en documenten niet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Projectnaam</Label>
              <Input
                value={kopieNaam}
                onChange={(e) => setKopieNaam(e.target.value)}
                placeholder="Naam van het nieuwe project"
              />
            </div>
            <div className="space-y-2">
              <Label>Klant</Label>
              <select
                value={kopieKlantId}
                onChange={(e) => setKopieKlantId(e.target.value)}
                className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2 bg-card text-foreground dark:text-white"
              >
                <option value="">Zelfde klant behouden</option>
                {alleKlanten.map((k) => (
                  <option key={k.id} value={k.id}>{k.bedrijfsnaam}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input
                type="date"
                value={kopieStartDatum}
                onChange={(e) => setKopieStartDatum(e.target.value)}
              />
            </div>
            <div className="bg-background dark:bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>Wordt gekopieerd:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{projectTaken.length} taken (status wordt reset naar 'todo')</li>
                <li>{project.team_leden.length} teamleden</li>
                <li>Budget: {formatCurrency(project.budget)}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKopieDialogOpen(false)}>Annuleren</Button>
            <Button
              disabled={kopieBezig || !kopieNaam.trim()}
              className=""
              onClick={handleKopieerProject}
            >
              {kopieBezig ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {kopieBezig ? 'Kopiëren...' : 'Project kopiëren'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Montage inplannen dialog */}
      <Dialog open={montageDialogOpen} onOpenChange={setMontageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-500" />
              Montage inplannen
            </DialogTitle>
            <DialogDescription>
              Plan een montage in voor {project?.naam || 'dit project'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Titel</Label>
              <Input value={montageTitel} onChange={(e) => setMontageTitel(e.target.value)} placeholder="Bijv. Montage gevelreclame" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Datum</Label>
              <Input type="date" value={montageDatum} onChange={(e) => setMontageDatum(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm">Start</Label>
                <Input type="time" value={montageStartTijd} onChange={(e) => setMontageStartTijd(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Eind</Label>
                <Input type="time" value={montageEindTijd} onChange={(e) => setMontageEindTijd(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Locatie</Label>
              <Input value={montageLocatie} onChange={(e) => setMontageLocatie(e.target.value)} placeholder="Adres / locatie" className="mt-1" />
            </div>
            {alleMedewerkers.length > 0 && (
              <div>
                <Label className="text-sm">Monteurs</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {alleMedewerkers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMontageMonteurs(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                      className={cn(
                        'px-2 py-1 rounded-md text-xs border transition-colors',
                        montageMonteurs.includes(m.id)
                          ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted dark:bg-muted dark:border-border'
                      )}
                    >
                      {m.naam}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-sm">Notities</Label>
              <Textarea value={montageNotities} onChange={(e) => setMontageNotities(e.target.value)} placeholder="Optioneel..." rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMontageDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSaveMontage} disabled={isSavingMontage}>
              {isSavingMontage ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wrench className="h-4 w-4 mr-1" />}
              Inplannen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ────────────── Info Row Component ────────────── */

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border dark:border-border last:border-0">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      {children || <span className="text-sm font-medium text-foreground">{value}</span>}
    </div>
  )
}

/* ────────────── Taak Card Component ────────────── */

const statusIcons: Record<string, { label: string; color: string }> = {
  todo: { label: 'Todo', color: 'text-muted-foreground' },
  bezig: { label: 'Bezig', color: 'text-blue-500' },
  review: { label: 'Review', color: 'text-amber-500' },
  klaar: { label: 'Klaar', color: 'text-emerald-500' },
}

function TaakCard({ taak, onStatusChange }: { key?: React.Key; taak: Taak; onStatusChange?: (status: Taak['status']) => void }) {
  const isOverdue = new Date(taak.deadline ?? "") < new Date() && taak.status !== 'klaar'
  const isDone = taak.status === 'klaar'
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', taak.id)
        e.dataTransfer.effectAllowed = 'move'
        setIsDragging(true)
      }}
      onDragEnd={() => {
        setIsDragging(false)
      }}
      className={cn(
        'group rounded-lg border bg-card p-2.5 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-sm',
        isDragging && 'opacity-50',
        isDone ? 'opacity-60 border-border/40' : 'border-border/60 hover:border-border',
      )}
    >
      <div className="flex items-start gap-2">
        {/* Quick check button */}
        <button
          onClick={() => onStatusChange?.(isDone ? 'todo' : 'klaar')}
          className={cn(
            'mt-0.5 flex-shrink-0 h-4 w-4 rounded border transition-all duration-150',
            isDone
              ? 'bg-emerald-500 border-emerald-500 text-white flex items-center justify-center'
              : 'border-border/80 hover:border-primary/50 hover:bg-primary/5'
          )}
        >
          {isDone && <Check className="h-2.5 w-2.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium leading-tight',
            isDone ? 'line-through text-muted-foreground' : 'text-foreground'
          )}>{taak.titel}</p>

          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge className={`${getPriorityColor(taak.prioriteit)} text-2xs px-1 py-0`}>
              {taak.prioriteit}
            </Badge>
            {taak.toegewezen_aan && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-wm-pale flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[7px] font-bold">
                    {getInitials(taak.toegewezen_aan)}
                  </span>
                </div>
              </div>
            )}
            {taak.deadline && (
              <span className={cn(
                'text-2xs ml-auto font-mono',
                isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground/60'
              )}>
                {formatDate(taak.deadline)}
              </span>
            )}
          </div>
        </div>

        {/* Drag handle */}
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
      </div>

      {/* Quick status move */}
      {!isDone && onStatusChange && (
        <div className="flex items-center gap-0.5 mt-2 pt-1.5 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
          {(['todo', 'bezig', 'review', 'klaar'] as const).map((s) => {
            const si = statusIcons[s]
            return (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={cn(
                  'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs transition-colors',
                  taak.status === s
                    ? `${si.color} bg-muted font-medium`
                    : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/50'
                )}
              >
                {si.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
