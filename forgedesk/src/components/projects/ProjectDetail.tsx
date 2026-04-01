import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
// BackButton removed — inline back link in header
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
  Paperclip,
  Trash2,
  CheckCheck,
  Sparkles,
  Loader2,
  CreditCard,
  AlertTriangle,
  ClipboardCheck,
  FileCheck,
  Camera,
  Wrench,
  X,
  Eye,
  Printer,
  MoreHorizontal,
  ChevronDown,
  Bell,
  BellOff,
  Clock,
  Package,
} from 'lucide-react'
// Card/Badge removed — using DOEN text-based styling
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  updateKlant,
  getTijdregistratiesByProject,
  getMedewerkers,
  getProjectToewijzingen,
  createProjectToewijzing,
  deleteProjectToewijzing,
  getWerkbonnenByProject,
  createWerkbon,
  deleteWerkbon,
  getFactuur,
  getFacturenByProject,
  getUitgavenByProject,
  getMontageAfsprakenByProject,
  createMontageAfspraak,
  getSigningVisualisatiesByProject,
  getOfferteItems,
  getProfile,
  getDocumentStyle,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { uploadFile, uploadMontageBijlage } from '@/services/storageService'
import { analyzeProject } from '@/services/aiService'
import { sendEmail } from '@/services/gmailService'
import { tekeningGoedkeuringTemplate } from '@/services/emailTemplateService'
// ProjectTasksTable removed — using TaskChecklistView in TakenOfferteGrid
import { ProjectPhotoGallery } from './ProjectPhotoGallery'
import { VisualisatieGallery } from '@/components/visualizer/VisualisatieGallery'
import { WerkbonVanProjectDialog } from '@/components/werkbonnen/WerkbonVanProjectDialog'
import { PakbonVanProjectDialog } from '@/components/leveringsbonnen/PakbonVanProjectDialog'
// SpectrumBar removed — using text-based phase in header
import { getFase } from '@/utils/projectFases'
// ProjectKaart removed — using inline sticky header
import { PortaalCompactBlock } from './cockpit/PortaalCompactBlock'
import { confirm } from '@/components/shared/ConfirmDialog'
import { TaskChecklistView } from './cockpit/TaskChecklistView'
import { BriefingCard } from './cockpit/BriefingCard'
import { TakenOfferteGrid } from './cockpit/TakenOfferteGrid'
import { ProjectFaseBar } from './cockpit/ProjectFaseBar'
import { MontageSection } from './cockpit/MontageSection'
import { BestandenSection } from './cockpit/BestandenSection'
import { ActiviteitFeed } from './cockpit/ActiviteitFeed'
import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog'
import { generateOpdrachtbevestigingPDF } from '@/services/pdfService'
import { useProjectSidebarConfig } from '@/hooks/useProjectSidebarConfig'
import type { Taak, Project, Document, Offerte, TekeningGoedkeuring, Klant, Tijdregistratie, Medewerker, ProjectToewijzing, Werkbon, Factuur, Uitgave, MontageAfspraak, MontageBijlage, ProjectFoto } from '@/types'
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
  'te-plannen': 'Te plannen',
}

const statusOpties = [
  { value: 'actief', label: 'Actief' },
  { value: 'te-plannen', label: 'Te plannen' },
  { value: 'gepland', label: 'Gepland' },
  { value: 'in-review', label: 'In review' },
  { value: 'te-factureren', label: 'Te factureren' },
  { value: 'gefactureerd', label: 'Gefactureerd' },
  { value: 'on-hold', label: 'On-hold' },
  { value: 'afgerond', label: 'Afgerond' },
]

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-[#2D6B48]'
    case 'gepland': return 'bg-[#2A5580]'
    case 'te-plannen': return 'bg-[#F15025]'
    case 'in-review': return 'bg-[#5A5A55]'
    case 'afgerond': return 'bg-[#1A535C]'
    case 'on-hold': return 'bg-[#5A5A55]'
    case 'te-factureren': return 'bg-[#2D6B48]'
    case 'gefactureerd': return 'bg-[#2D6B48]'
    default: return 'bg-[#5A5A55]'
  }
}

type ProjectTab = 'overzicht' | 'werkbon' | 'financieel' | 'notities'



function getFileIcon(type: string, size: string = 'h-8 w-8') {
  if (type.includes('pdf')) return <FileText className={`${size} text-[#C03A18]`} />
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv'))
    return <FileSpreadsheet className={`${size} text-[#2D6B48]`} />
  if (type.includes('zip') || type.includes('archive'))
    return <FileArchive className={`${size} text-[#C44830]`} />
  if (type.includes('image') || type.includes('jpeg') || type.includes('png'))
    return <FileImage className={`${size} text-primary`} />
  if (type.includes('illustrator') || type.includes('acad'))
    return <File className={`${size} text-[#F15025]`} />
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
  const [obPreviewOfferte, setObPreviewOfferte] = useState<Offerte | null>(null)
  const [showObOfferteSelect, setShowObOfferteSelect] = useState(false)
  const [showNieuwCp, setShowNieuwCp] = useState(false)
  const [nieuwCpNaam, setNieuwCpNaam] = useState('')
  const [nieuwCpEmail, setNieuwCpEmail] = useState('')
  const [nieuwCpTelefoon, setNieuwCpTelefoon] = useState('')
  const [nieuwCpFunctie, setNieuwCpFunctie] = useState('')
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
    navigate(`/offertes/nieuw?${params.toString()}`, { state: { from: location.pathname } })
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
  const [showPakbonDialog, setShowPakbonDialog] = useState(false)
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
  const [montageBijlagen, setMontageBijlagen] = useState<MontageBijlage[]>([])
  const [montageWerkbonId, setMontageWerkbonId] = useState('')
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
    setMontageBijlagen([])
    setMontageWerkbonId('')
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
        werkbon_id: montageWerkbonId || undefined,
        werkbon_nummer: montageWerkbonId ? projectWerkbonnen.find(w => w.id === montageWerkbonId)?.werkbon_nummer : undefined,
        bijlagen: montageBijlagen.length > 0 ? montageBijlagen : undefined,
        status: 'gepland',
      })
      setProjectMontages(prev => [...prev, newMontage])
      setMontageDialogOpen(false)
      toast.success('Montage ingepland')
      setDirty(false)
    } catch (err) {
      logger.error('Kon montage niet inplannen:', err)
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
    } catch (err) {
      logger.error('Kon offerte status niet wijzigen:', err)
      toast.error('Kon status niet wijzigen')
    }
  }

  const handleCreateFactuurFromOfferte = (offerte: Offerte) => {
    if (!project) return

    // Duplicate check: als offerte al een factuur heeft, navigeer daarheen
    if (offerte.geconverteerd_naar_factuur_id) {
      toast.info(`Offerte ${offerte.nummer} is al gefactureerd`)
      navigate(`/facturen/${offerte.geconverteerd_naar_factuur_id}/bewerken`, { state: { from: location.pathname } })
      return
    }

    // Navigeer naar FactuurEditor met pre-fill params
    const params = new URLSearchParams({
      offerte_id: offerte.id,
      klant_id: offerte.klant_id,
      project_id: id || '',
      titel: offerte.titel,
    })
    navigate(`/facturen/nieuw?${params.toString()}`, { state: { from: location.pathname } })
  }

  const openKopieDialog = async () => {
    if (!project) return
    setKopieNaam(`${project.naam} (kopie)`)
    setKopieKlantId(project.klant_id || '')
    setKopieStartDatum(new Date().toISOString().split('T')[0])
    try {
      const klanten = await getKlanten()
      setAlleKlanten(klanten)
    } catch (err) {
      logger.error('Kon klanten niet ophalen:', err)
      toast.error('Kon klanten niet ophalen')
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
    } catch (err) {
      logger.error('AI analyse mislukt:', err)
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
        const storagePath = `projects/${id}/${file.name}`
        await uploadFile(file, storagePath)
        await createDocument({
          user_id: user?.id || '',
          project_id: id || null,
          klant_id: project?.klant_id || null,
          naam: file.name,
          type: file.type || 'application/octet-stream',
          grootte: file.size,
          map: 'Tekeningen',
          storage_path: storagePath,
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
      <div className="h-[calc(100vh-56px)] flex flex-col items-center justify-center bg-[#F8F7F5]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A535C] border-t-transparent" />
        <p className="text-sm text-[#9B9B95] mt-4">Project laden...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-[calc(100vh-56px)] flex flex-col items-center justify-center bg-[#F8F7F5]">
        <p className="text-lg font-semibold text-[#1A1A1A]">Project niet gevonden</p>
        <p className="text-sm text-[#9B9B95] mt-1">Het project met ID "{id}" bestaat niet.</p>
        <Link to="/projecten" className="text-sm text-[#1A535C] hover:underline mt-4">Terug naar projecten</Link>
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
        const naam = user.user_metadata?.voornaam ? `${user.user_metadata.voornaam} ${user.user_metadata.achternaam || ''}`.trim() : user.email || ''
        logWijziging({ userId: user.id, entityType: 'project', entityId: id!, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: oudeStatus, nieuweWaarde: newStatus })
      }
      toast.success(`Status gewijzigd naar ${statusLabels[newStatus] || newStatus}`)
    } catch (err) {
      logger.error('Kon project status niet wijzigen:', err)
      toast.error('Kon status niet wijzigen')
    }
  }

  const totaalBedrag = projectOffertes.reduce((sum, o) => sum + (o.totaal || 0), 0)
  const fase = getFase(project.status)

  return (
    <div className="-m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 h-[calc(100vh-56px)] flex flex-col bg-[#F8F7F5]">

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
          className="flex items-center justify-center h-14 w-14 rounded-full bg-[#1A535C] text-white shadow-lg shadow-[#1A535C]/25 active:scale-95 transition-transform cursor-pointer"
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

      {/* ══════════ STICKY HEADER + TABS ══════════ */}
      <div className="sticky top-0 z-10 bg-[#F8F7F5]/95 backdrop-blur-md px-8 pt-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Row 1: back + name + status + number */}
            <div className="flex items-center gap-3">
              <Link to="/projecten" className="text-[#9B9B95] hover:text-[#6B6B66] transition-colors flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-[22px] font-extrabold text-[#1A1A1A] truncate tracking-[-0.4px]">{project.naam}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-sm text-[#1A1A1A] flex-shrink-0 flex items-center gap-1 cursor-pointer hover:bg-[#EBEBEB]/40 rounded-md px-2 py-0.5 -mx-2 transition-colors group">
                    <span className={cn('w-1.5 h-1.5 rounded-full', getStatusDotColor(project.status))} />
                    {statusLabels[project.status] || project.status}<span className="text-[#F15025]">.</span>
                    <ChevronDown className="h-3 w-3 text-[#9B9B95] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {statusOpties.map((s) => (
                    <DropdownMenuItem
                      key={s.value}
                      onClick={() => {
                        if (s.value !== project.status) handleCockpitStatusChange(s.value as Project['status'])
                      }}
                      className={cn('flex items-center gap-2 text-xs', s.value === project.status && 'font-semibold')}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getStatusDotColor(s.value))} />
                      {s.label}
                      {s.value === project.status && <CheckCircle2 className="w-3 h-3 ml-auto text-[#1A535C]" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {project.project_nummer && (
                <span className="font-mono text-[13px] text-[#9B9B95] flex-shrink-0">{project.project_nummer}</span>
              )}
            </div>
            {/* Row 2: klant + contactpersoon + bedrag + deadline */}
            <div className="flex items-center gap-2 ml-7 mt-0.5 text-[13px]">
              {klant && (
                <Link to={`/klanten/${klant.id}`} className="text-[#6B6B66] hover:text-[#1A1A1A] transition-colors">
                  {klant.bedrijfsnaam || klant.contactpersoon}
                  {klant.stad && ` · ${klant.stad}`}
                </Link>
              )}
              {totaalBedrag > 0 && (
                <>
                  <span className="text-[#EBEBEB]">·</span>
                  <span className="font-mono text-[#1A1A1A]">{formatCurrency(totaalBedrag)}</span>
                </>
              )}
              {isValidDate && daysLeft !== null && (
                <>
                  <span className="text-[#EBEBEB]">·</span>
                  <span className={cn('font-mono', daysLeft < 0 ? 'text-[#C03A18] font-medium' : 'text-[#9B9B95]')}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d over deadline` : `${daysLeft}d`}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: CTA + menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Offerte CTA — altijd zichtbaar */}
            {(() => {
              const activeOfferte = projectOffertes.find(o => !['afgewezen', 'verlopen', 'gefactureerd'].includes(o.status)) || projectOffertes[0]
              if (!activeOfferte) {
                return (
                  <button onClick={openNieuweOfferte} className="bg-[#F15025] hover:bg-[#D94520] text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors shadow-sm">
                    Offerte maken
                  </button>
                )
              }
              return (
                <button onClick={() => navigate(`/offertes/${activeOfferte.id}/bewerken`, { state: { from: location.pathname } })} className="bg-[#F15025] hover:bg-[#D94520] text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors shadow-sm">
                  Offerte bewerken
                </button>
              )
            })()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#EBEBEB]/50 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openKopieDialog}>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Kopiëren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAiAnalysis}>
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                AI Analyse
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                try {
                  const updated = await updateProject(id!, { status: 'afgerond' })
                  setProject(updated)
                  toast.success('Project gearchiveerd')
                } catch (err) { logger.error('Kon project niet archiveren:', err); toast.error('Kon project niet archiveren') }
              }}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                Archiveren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* TAB BAR — inside sticky header */}
        <div className="flex items-center gap-6 border-b border-[#EBEBEB] mt-2">
        {([
          { key: 'overzicht' as ProjectTab, label: 'Overzicht' },
          { key: 'werkbon' as ProjectTab, label: 'Werkbon' },
          { key: 'financieel' as ProjectTab, label: 'Financieel' },
          { key: 'notities' as ProjectTab, label: 'Notities' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'relative py-3.5 text-[14px] transition-colors',
              activeTab === tab.key
                ? 'text-[#1A1A1A] font-bold'
                : 'text-[#6B6B66] hover:text-[#1A1A1A]'
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1A535C] rounded-t-full" />
            )}
          </button>
        ))}
        </div>
      </div>

      {/* ══════════ OVERZICHT TAB ══════════ */}
      {activeTab === 'overzicht' && (
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col lg:flex-row gap-8 px-8 py-6">

        {/* ── Left column (65%) ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Fase indicator */}
          <ProjectFaseBar
            status={project.status}
            onStatusChange={async (newStatus) => {
              try {
                const updated = await updateProject(id!, { status: newStatus })
                setProject(updated)
                toast.success(`Status: ${statusLabels[newStatus] || newStatus}`)
              } catch (err) {
                logger.error('Kon status niet wijzigen:', err)
                toast.error('Kon status niet wijzigen')
              }
            }}
          />

          {/* Briefing */}
          <BriefingCard
            beschrijving={project.beschrijving || ''}
            projectNaam={project.naam}
            klantNaam={klant?.bedrijfsnaam}
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
              } catch (err) {
                logger.error('Kon taak status niet wijzigen:', err)
                toast.error('Kon status niet wijzigen')
              }
            }}
            onOpdrachtbevestiging={(offerte) => setObPreviewOfferte(offerte)}
          />

          {/* Portaal — pronkstuk */}
          <div className="rounded-xl p-5">
            <PortaalCompactBlock projectId={id!} />
          </div>

          {/* "Doen" suggestie */}
          {(() => {
            const allTasksDone = projectTaken.length > 0 && projectTaken.every(t => t.status === 'klaar')

            let suggestion: { text: string; action: () => void } | null = null

            if (project.status === 'actief' && allTasksDone) {
              suggestion = {
                text: 'Alle taken afgerond. Klaar voor montage?',
                action: () => handleCockpitStatusChange('montage' as any),
              }
            } else if (project.status === 'te-factureren') {
              suggestion = {
                text: 'Klaar om te factureren.',
                action: () => {
                  const params = new URLSearchParams({ klant_id: project.klant_id || '', project_id: id || '', titel: project.naam || '' })
                  navigate(`/facturen/nieuw?${params.toString()}`, { state: { from: location.pathname } })
                },
              }
            }

            if (!suggestion) return null
            return (
              <div className="flex items-center justify-between py-3">
                <span className="text-[13px] text-[#6B6B66]">{suggestion.text}</span>
                <button className="text-[13px] font-semibold text-[#F15025] hover:underline" onClick={suggestion.action}>
                  Doen<span className="text-[#F15025]">.</span>
                </button>
              </div>
            )
          })()}

        </div>

        {/* ── Right column (sidebar, 35%) ── */}
        <div className="w-full lg:w-[300px] xl:w-[320px] flex-shrink-0 space-y-5 lg:self-start lg:sticky lg:top-20">

          {/* Klant & Contactpersoon */}
          {klant && (
            <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5">
              {/* Bedrijfsgegevens */}
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-[#1A535C] flex items-center justify-center text-white text-[14px] font-bold flex-shrink-0">
                  {(klant.bedrijfsnaam || klant.contactpersoon || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/klanten/${klant.id}`} className="text-[14px] font-bold text-[#1A1A1A] hover:text-[#1A535C] transition-colors truncate block tracking-[-0.2px]">
                    {klant.bedrijfsnaam || klant.contactpersoon}
                  </Link>
                  {klant.contactpersoon && klant.bedrijfsnaam && (
                    <p className="text-[12px] text-[#6B6B66] mt-0.5">{klant.contactpersoon}</p>
                  )}
                </div>
              </div>
              {(() => {
                const projectCp = project.contactpersoon_id ? klant.contactpersonen?.find(c => c.id === project.contactpersoon_id) : null
                const displayEmail = projectCp?.email || klant.email
                const displayTelefoon = projectCp?.telefoon || klant.telefoon
                return (
                  <div className="space-y-1.5 text-[12px] text-[#6B6B66] mb-4">
                    {klant.adres && (
                      <p>{klant.adres}{klant.postcode || klant.stad ? `, ${[klant.postcode, klant.stad].filter(Boolean).join(' ')}` : ''}</p>
                    )}
                    {displayTelefoon && (
                      <p>
                        <a href={`tel:${displayTelefoon}`} className="hover:text-[#1A1A1A] transition-colors">{displayTelefoon}</a>
                      </p>
                    )}
                    {displayEmail && (
                      <p>
                        <a href={`mailto:${displayEmail}`} className="hover:text-[#1A535C] transition-colors">{displayEmail}</a>
                        {projectCp && klant.email && projectCp.email !== klant.email && (
                          <span className="block text-[10px] text-[#9B9B95] mt-0.5">Bedrijf: {klant.email}</span>
                        )}
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Contactpersoon selectie */}
              <div className="border-t border-[#EBEBEB]/60 pt-4 mt-4">
                <h4 className="text-[11px] font-semibold text-[#9B9B95] uppercase tracking-wider mb-2">Contactpersoon</h4>
                {(() => {
                  const activeCp = klant.contactpersonen?.find(cp => cp.id === project.contactpersoon_id)
                  return (
                    <div className="space-y-2">
                      <select
                        value={project.contactpersoon_id || ''}
                        onChange={async (e) => {
                          try {
                            const updated = await updateProject(id!, { contactpersoon_id: e.target.value || undefined })
                            setProject(updated)
                            const cp = klant.contactpersonen?.find(c => c.id === e.target.value)
                            toast.success(cp ? `Contactpersoon: ${cp.naam}` : 'Contactpersoon verwijderd')
                          } catch (err) {
                            logger.error('Kon contactpersoon niet wijzigen:', err)
                          }
                        }}
                        className="w-full text-[13px] font-medium text-[#1A1A1A] bg-[#F8F7F5] rounded-lg px-3 py-2.5 border-none outline-none cursor-pointer hover:bg-[#F4F2EE] transition-colors appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B95' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                      >
                        <option value="">Selecteer contactpersoon...</option>
                        {klant.contactpersonen?.map((cp) => (
                          <option key={cp.id} value={cp.id}>{cp.naam}{cp.functie ? ` — ${cp.functie}` : ''}</option>
                        ))}
                      </select>
                      {activeCp && (activeCp.email || activeCp.telefoon) && (
                        <div className="px-3 py-2 rounded-lg bg-[#E2F0F0]/40 text-[11px] text-[#1A535C] space-y-0.5">
                          {activeCp.email && <p><a href={`mailto:${activeCp.email}`} className="hover:underline">{activeCp.email}</a></p>}
                          {activeCp.telefoon && <p><a href={`tel:${activeCp.telefoon}`} className="hover:underline">{activeCp.telefoon}</a></p>}
                        </div>
                      )}
                      {!showNieuwCp ? (
                        <button
                          onClick={() => setShowNieuwCp(true)}
                          className="text-[11px] font-medium text-[#1A535C] hover:underline"
                        >
                          + Nieuw contactpersoon
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          <input
                            value={nieuwCpNaam}
                            onChange={(e) => setNieuwCpNaam(e.target.value)}
                            placeholder="Naam"
                            className="w-full text-[12px] text-[#1A1A1A] placeholder:text-[#9B9B95] bg-[#F8F7F5] rounded-lg px-3 py-2 border-none focus:outline-none focus:ring-2 focus:ring-[#1A535C]/20"
                            autoFocus
                          />
                          <input
                            value={nieuwCpEmail}
                            onChange={(e) => setNieuwCpEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full text-[12px] text-[#1A1A1A] placeholder:text-[#9B9B95] bg-[#F8F7F5] rounded-lg px-3 py-2 border-none focus:outline-none focus:ring-2 focus:ring-[#1A535C]/20"
                          />
                          <div className="flex gap-1.5">
                            <input
                              value={nieuwCpTelefoon}
                              onChange={(e) => setNieuwCpTelefoon(e.target.value)}
                              placeholder="Telefoon"
                              className="flex-1 min-w-0 text-[12px] text-[#1A1A1A] placeholder:text-[#9B9B95] bg-[#F8F7F5] rounded-lg px-3 py-2 border-none focus:outline-none focus:ring-2 focus:ring-[#1A535C]/20"
                            />
                            <input
                              value={nieuwCpFunctie}
                              onChange={(e) => setNieuwCpFunctie(e.target.value)}
                              placeholder="Functie"
                              className="flex-1 min-w-0 text-[12px] text-[#1A1A1A] placeholder:text-[#9B9B95] bg-[#F8F7F5] rounded-lg px-3 py-2 border-none focus:outline-none focus:ring-2 focus:ring-[#1A535C]/20"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-3 pt-1">
                            <button
                              onClick={() => { setShowNieuwCp(false); setNieuwCpNaam(''); setNieuwCpEmail(''); setNieuwCpTelefoon(''); setNieuwCpFunctie('') }}
                              className="text-[11px] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors"
                            >
                              Annuleren
                            </button>
                            <button
                              disabled={!nieuwCpNaam.trim()}
                              onClick={async () => {
                                if (!nieuwCpNaam.trim()) return
                                try {
                                  const newCp = { id: crypto.randomUUID(), naam: nieuwCpNaam.trim(), email: nieuwCpEmail.trim(), telefoon: nieuwCpTelefoon.trim(), functie: nieuwCpFunctie.trim(), is_primair: false }
                                  const updatedCps = [...(klant.contactpersonen || []), newCp]
                                  await updateKlant(klant.id, { contactpersonen: JSON.stringify(updatedCps) as any })
                                  setKlant({ ...klant, contactpersonen: updatedCps })
                                  const updated = await updateProject(id!, { contactpersoon_id: newCp.id })
                                  setProject(updated)
                                  setShowNieuwCp(false); setNieuwCpNaam(''); setNieuwCpEmail(''); setNieuwCpTelefoon(''); setNieuwCpFunctie('')
                                  toast.success(`${newCp.naam} toegevoegd en geselecteerd`)
                                } catch (err) {
                                  logger.error('Kon contactpersoon niet aanmaken:', err)
                                  toast.error('Kon contactpersoon niet aanmaken')
                                }
                              }}
                              className="text-[11px] font-semibold text-[#1A535C] hover:underline disabled:opacity-30 disabled:no-underline transition-colors"
                            >
                              Toevoegen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Acties */}
          <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[13px] font-bold text-[#1A1A1A] tracking-[-0.2px] mb-3">Acties</h3>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: 'Taak', color: '#1A535C', icon: <Plus className="h-3.5 w-3.5" />, onClick: () => setNieuweTaakOpen(true) },
                { label: 'Offerte', color: '#F15025', icon: <Receipt className="h-3.5 w-3.5" />, onClick: openNieuweOfferte },
                { label: 'Werkbon', color: '#6B6B66', icon: <ClipboardCheck className="h-3.5 w-3.5" />, onClick: () => setShowWerkbonDialog(true) },
                { label: 'Pakbon', color: '#6B6B66', icon: <Package className="h-3.5 w-3.5" />, onClick: () => setShowPakbonDialog(true) },
                { label: 'Montage', color: '#6B6B66', icon: <Wrench className="h-3.5 w-3.5" />, onClick: handleOpenMontageDialog },
                { label: 'Factuur', color: '#6B6B66', icon: <CreditCard className="h-3.5 w-3.5" />, onClick: () => {
                  const params = new URLSearchParams({ klant_id: project.klant_id || '', project_id: id || '', titel: project.naam || '' })
                  navigate(`/facturen/nieuw?${params.toString()}`, { state: { from: location.pathname } })
                }},
                ...(() => {
                  const cpEmail = project.contactpersoon_id ? klant?.contactpersonen?.find(c => c.id === project.contactpersoon_id)?.email : undefined
                  const emailTo = cpEmail || klant?.email
                  return emailTo ? [{ label: 'Email', color: '#6B6B66', icon: <Mail className="h-3.5 w-3.5" />, onClick: () => window.location.href = `mailto:${emailTo}` }] : []
                })(),
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-lg hover:bg-[#F8F7F5] transition-colors"
                >
                  <span style={{ color: btn.color }}>{btn.icon}</span>
                  <span className="text-[10px] font-medium text-[#6B6B66]">{btn.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-[#EBEBEB]/60">
              <button
                onClick={() => setShowObOfferteSelect(!showObOfferteSelect)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg text-[#1A535C] hover:bg-[#E2F0F0]/40 transition-colors"
              >
                <FileCheck className="h-3.5 w-3.5" />
                Opdrachtbevestiging
                <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${showObOfferteSelect ? 'rotate-180' : ''}`} />
              </button>
              {showObOfferteSelect && (
                <div className="mt-1 rounded-lg bg-[#F8F7F5] overflow-hidden">
                  {projectOffertes.length === 0 ? (
                    <p className="text-[11px] text-[#9B9B95] text-center py-4">Maak eerst een offerte</p>
                  ) : (
                    projectOffertes.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => { setObPreviewOfferte(o); setShowObOfferteSelect(false) }}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F4F2EE] transition-colors text-left"
                      >
                        <span className="text-[12px] font-medium text-[#1A1A1A] truncate">{o.titel || o.nummer}</span>
                        <span className="text-[11px] font-mono text-[#9B9B95] ml-2 flex-shrink-0">{o.nummer}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Montage */}
          <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5">
            <MontageSection
              montageAfspraken={projectMontages}
              onInplannen={handleOpenMontageDialog}
            />
          </div>

          {/* Bestanden */}
          <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5">
            <BestandenSection
              documenten={projectDocumenten}
              onUpload={() => fileInputRef.current?.click()}
              onDelete={async (docId, naam) => {
                try {
                  await deleteDocument(docId)
                  toast.success(`"${naam}" verwijderd`)
                  await fetchDocumenten()
                } catch (err) {
                  logger.error('Kon bestand niet verwijderen:', err)
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
            <div>
              <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Visualizer</h3>
              <VisualisatieGallery project_id={project.id} klant_id={project.klant_id} compact />
            </div>
          )}

          {/* Activiteit */}
          <div>
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
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A1A1A] tracking-[-0.3px]">Werkbonnen</h2>
          <button
            onClick={() => setShowWerkbonDialog(true)}
            className="text-sm text-[#F15025] font-medium hover:underline"
          >
            + Nieuwe werkbon
          </button>
        </div>
        {projectWerkbonnen.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#9B9B95]">Nog geen werkbonnen</p>
            <button onClick={() => setShowWerkbonDialog(true)} className="text-sm text-[#1A535C] hover:underline mt-1">
              Maak een werkbon aan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectWerkbonnen.map((wb) => {
              const wbStatusLabel = wb.status === 'concept' ? 'Concept' : wb.status === 'definitief' ? 'Definitief' : wb.status === 'afgerond' ? 'Afgerond' : wb.status
              const accentColor = wb.status === 'afgerond' ? '#2D6B48' : wb.status === 'definitief' ? '#3A5A9A' : '#C44830'
              return (
                <div
                  key={wb.id}
                  className="group bg-[#FFFFFF] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all"
                  onClick={() => navigate(`/werkbonnen/${wb.id}`, { state: { from: location.pathname } })}
                >
                  <div className="h-1" style={{ backgroundColor: accentColor }} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: accentColor + 'AA' }}>Werkbon</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          const confirmed = await confirm({ message: `Werkbon ${wb.werkbon_nummer} verwijderen?`, variant: 'destructive', confirmLabel: 'Verwijderen' })
                          if (confirmed) {
                            deleteWerkbon(wb.id)
                              .then(() => { setProjectWerkbonnen(prev => prev.filter(w => w.id !== wb.id)); toast.success('Werkbon verwijderd') })
                              .catch(() => toast.error('Kon werkbon niet verwijderen'))
                          }
                        }}
                        className="p-1 rounded-md text-[#9B9B95] hover:text-[#C03A18] transition-colors opacity-0 group-hover:opacity-100"
                        title="Verwijderen"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{wb.titel || wb.werkbon_nummer}</p>
                    <p className="text-xs font-mono text-[#9B9B95] mt-0.5">{wb.werkbon_nummer}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-mono text-[#9B9B95]">{new Date(wb.datum).toLocaleDateString('nl-NL')}</span>
                      <span className="text-xs" style={{ color: accentColor }}>
                        {wbStatusLabel}<span className="text-[#F15025]">.</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* ══════════ FINANCIEEL TAB ══════════ */}
      {activeTab === 'financieel' && (
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
        {/* Totalen overzicht */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Geoffreerd', bedrag: projectOffertes.reduce((s, o) => s + o.totaal, 0), accent: '#1A535C' },
            { label: 'Gefactureerd', bedrag: projectFacturen.reduce((s, f) => s + f.totaal, 0), accent: '#3A5A9A' },
            { label: 'Betaald', bedrag: projectFacturen.reduce((s, f) => s + (f.betaald_bedrag || 0), 0), accent: '#2D6B48' },
            { label: 'Openstaand', bedrag: projectFacturen.reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0), accent: '#C0451A' },
          ].map((item) => (
            <div key={item.label} className="bg-[#FFFFFF] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="h-1" style={{ backgroundColor: item.accent }} />
              <div className="p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: item.accent + 'AA' }}>{item.label}</p>
                <p className="text-xl font-bold font-mono text-[#1A1A1A]">
                  {formatCurrency(item.bedrag)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Budget waarschuwing */}
        {(() => {
          const bs = berekenBudgetStatus(project, projectTijdregistraties)
          if (bs.budget <= 0 || bs.niveau === 'normaal') return null
          return (
            <div className="bg-[#FFFFFF] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="h-1 bg-[#C0451A]" />
              <div className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[#C03A18]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    {bs.niveau === 'overschreden'
                      ? `Budget overschreden: ${bs.percentage.toFixed(0)}%`
                      : `Budget waarschuwing: ${bs.percentage.toFixed(0)}% verbruikt`}
                  </p>
                  <p className="text-xs text-[#9B9B95] font-mono mt-0.5">
                    {formatCurrency(bs.verbruikt)} van {formatCurrency(bs.budget)}
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Offertes */}
        {projectOffertes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Offertes</h3>
              <button onClick={openNieuweOfferte} className="text-sm text-[#F15025] font-medium hover:underline">+ Nieuwe offerte</button>
            </div>
            <div className="space-y-3">
              {projectOffertes.map((offerte) => {
                const linkedFactuur = offerteFactuurMap[offerte.id]
                const offerteStatusLabel = offerte.status === 'concept' ? 'Concept' : offerte.status === 'verzonden' ? 'Verzonden' : offerte.status === 'goedgekeurd' ? 'Goedgekeurd' : offerte.status === 'afgewezen' ? 'Afgewezen' : offerte.status === 'gefactureerd' ? 'Gefactureerd' : offerte.status
                const isStalled = (offerte.status === 'verzonden' || offerte.status === 'bekeken') && offerte.verstuurd_op && Math.floor((Date.now() - new Date(offerte.verstuurd_op).getTime()) / 86400000) > 14
                const accentColor = isStalled ? '#D4621A' : offerte.status === 'goedgekeurd' || offerte.status === 'gefactureerd' ? '#2D6B48' : offerte.status === 'afgewezen' ? '#C0451A' : '#F15025'
                return (
                  <div key={offerte.id} className="bg-[#FFFFFF] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                    <div className="h-1" style={{ backgroundColor: accentColor }} />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">{offerte.titel}</p>
                          <p className="text-xs font-mono text-[#9B9B95] mt-0.5">{offerte.nummer}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-mono font-semibold text-[#1A1A1A]">{formatCurrency(offerte.totaal)}</p>
                          <span className="text-xs" style={{ color: accentColor }}>
                            {offerteStatusLabel}<span className="text-[#F15025]">.</span>
                          </span>
                        </div>
                      </div>
                      {(offerte.status === 'verzonden' || offerte.status === 'bekeken') && offerte.verstuurd_op && (() => {
                        const days = Math.floor((Date.now() - new Date(offerte.verstuurd_op).getTime()) / 86400000)
                        return (
                          <div className={`flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg text-xs ${days > 7 ? 'bg-[#FEF3E8]' : 'bg-[#F8F7F5]'}`}>
                            <span className="flex items-center gap-1 font-mono font-semibold">
                              <Clock className="w-3 h-3 text-[#9B9B95]" />
                              {days}d open
                            </span>
                            <span className="text-[#EBEBEB]">·</span>
                            {offerte.opvolging_actief !== false ? (
                              <span className="flex items-center gap-1 text-[#2D6B48]">
                                <Bell className="w-3 h-3" /> Opvolging actief
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[#9B9B95]">
                                <BellOff className="w-3 h-3" /> Gepauzeerd
                              </span>
                            )}
                          </div>
                        )
                      })()}
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#EBEBEB]/40">
                        <button
                          onClick={() => navigate(`/offertes/${offerte.id}/bewerken`, { state: { from: location.pathname } })}
                          className="text-sm font-medium text-[#1A535C] hover:underline"
                        >
                          Bewerken
                        </button>
                        <button
                          onClick={() => {
                            setEmailOfferteId(offerte.id)
                            setEmailOnderwerp(`Offerte ${offerte.nummer} - ${offerte.titel}`)
                            setEmailBericht(
                              `Beste ${project.klant_naam || 'klant'},\n\nHierbij ontvangt u onze offerte "${offerte.titel}" (${offerte.nummer}) ter waarde van ${formatCurrency(offerte.totaal)}.\n\nDeze offerte is geldig tot ${formatDate(offerte.geldig_tot)}.\n\nMocht u vragen hebben, neem dan gerust contact met ons op.\n\nMet vriendelijke groet`
                            )
                            setEmailOfferteOpen(true)
                          }}
                          className="text-sm font-medium text-[#1A535C] hover:underline"
                        >
                          Mail
                        </button>
                        {!offerte.geconverteerd_naar_factuur_id && (
                          <button
                            onClick={() => handleCreateFactuurFromOfferte(offerte)}
                            className="text-sm font-medium text-[#2D6B48] hover:underline ml-auto"
                          >
                            Factureren
                          </button>
                        )}
                      </div>
                      {offerte.geconverteerd_naar_factuur_id && linkedFactuur && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-[#6B6B66]">
                          <CheckCircle2 className="h-3 w-3 text-[#3A7D52]" />
                          <span className="font-mono">{linkedFactuur.nummer}</span>
                          <span className="text-[#EBEBEB]">·</span>
                          <span>{linkedFactuur.status}<span className="text-[#F15025]">.</span></span>
                          <span className="text-[#EBEBEB]">·</span>
                          <span className="font-mono">{formatCurrency(linkedFactuur.totaal)}</span>
                          <button
                            onClick={() => navigate(`/facturen/${offerte.geconverteerd_naar_factuur_id}`, { state: { from: location.pathname } })}
                            className="text-[#1A535C] font-medium hover:underline ml-auto"
                          >
                            Bekijken
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Facturen */}
        {projectFacturen.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Facturen</h3>
            <div className="space-y-3">
              {projectFacturen.map((factuur) => {
                const factuurStatusLabel = factuur.status === 'betaald' ? 'Betaald' : factuur.status === 'verzonden' ? 'Verzonden' : factuur.status === 'vervallen' ? 'Verlopen' : factuur.status
                const accentColor = factuur.status === 'betaald' ? '#2D6B48' : factuur.status === 'vervallen' ? '#C0451A' : '#3A5A9A'
                return (
                  <div key={factuur.id}
                    className="bg-[#FFFFFF] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all"
                    onClick={() => navigate(`/facturen/${factuur.id}`, { state: { from: location.pathname } })}
                  >
                    <div className="h-1" style={{ backgroundColor: accentColor }} />
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-mono font-medium text-[#1A1A1A]">{factuur.nummer}</p>
                        <p className="text-xs text-[#9B9B95] font-mono mt-0.5">{new Date(factuur.factuurdatum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-semibold text-[#1A1A1A]">{formatCurrency(factuur.totaal)}</p>
                        <span className="text-xs" style={{ color: accentColor }}>
                          {factuurStatusLabel}<span className="text-[#F15025]">.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Uitgaven */}
        {projectUitgaven.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Uitgaven</h3>
            <div className="space-y-3">
              {projectUitgaven.map((uitgave) => {
                const uitgaveStatusLabel = uitgave.status === 'betaald' ? 'Betaald' : uitgave.status === 'verlopen' ? 'Verlopen' : 'Open'
                const accentColor = uitgave.status === 'betaald' ? '#2D6B48' : uitgave.status === 'verlopen' ? '#C0451A' : '#8A7A4A'
                return (
                  <div key={uitgave.id}
                    className="bg-[#FFFFFF] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all"
                    onClick={() => navigate('/uitgaven')}
                  >
                    <div className="h-1" style={{ backgroundColor: accentColor }} />
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-mono font-medium text-[#1A1A1A]">{uitgave.uitgave_nummer}</p>
                        <p className="text-xs text-[#9B9B95] font-mono mt-0.5">{new Date(uitgave.datum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-semibold text-[#1A1A1A]">{formatCurrency(uitgave.bedrag_incl_btw)}</p>
                        <span className="text-xs" style={{ color: accentColor }}>
                          {uitgaveStatusLabel}<span className="text-[#F15025]">.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* ══════════ NOTITIES TAB ══════════ */}
      {activeTab === 'notities' && (
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1A1A1A] tracking-[-0.3px]">Notities</h2>
            <button
              disabled={briefingSaving}
              onClick={handleSaveBriefing}
              className="text-sm text-[#1A535C] hover:underline disabled:opacity-50"
            >
              {briefingSaving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
          <Textarea
            value={briefingText}
            onChange={(e) => setBriefingText(e.target.value)}
            placeholder="Voeg hier de projectbriefing en notities toe..."
            rows={20}
            className="resize-y bg-[#F8F7F5] rounded-lg p-4 border-none focus:ring-1 focus:ring-[#1A535C]/20 transition-colors text-sm leading-relaxed"
          />
          {project.updated_at && (
            <p className="text-xs text-[#9B9B95] mt-2">
              Laatst gewijzigd: <span className="font-mono">{formatDate(project.updated_at)}</span>
            </p>
          )}
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

      {/* Pakbon aanmaken dialog */}
      {project && (
        <PakbonVanProjectDialog
          open={showPakbonDialog}
          onOpenChange={setShowPakbonDialog}
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
                <li>Budget: <span className="font-mono">{formatCurrency(project.budget)}</span></li>
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
        <DialogContent className="max-w-[560px]">
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
              <Input value={montageTitel} onChange={(e) => setMontageTitel(e.target.value)} placeholder="Bijv. Montage gevelreclame" className="mt-1 h-9" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-sm">Datum</Label>
                <Input type="date" value={montageDatum} onChange={(e) => setMontageDatum(e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-sm">Start</Label>
                <Input type="time" value={montageStartTijd} onChange={(e) => setMontageStartTijd(e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-sm">Eind</Label>
                <Input type="time" value={montageEindTijd} onChange={(e) => setMontageEindTijd(e.target.value)} className="mt-1 h-9" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Locatie</Label>
              <Input value={montageLocatie} onChange={(e) => setMontageLocatie(e.target.value)} placeholder="Adres / locatie" className="mt-1 h-9" />
            </div>
            {alleMedewerkers.length > 0 && (
              <div>
                <Label className="text-sm">Monteurs</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {alleMedewerkers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMontageMonteurs(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                      className={cn(
                        'h-7 w-7 rounded-full text-[9px] font-bold transition-colors flex items-center justify-center',
                        montageMonteurs.includes(m.id)
                          ? 'bg-primary text-white ring-2 ring-primary/30'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                      title={m.naam}
                    >
                      {m.naam.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Werkbon koppelen */}
            <div>
              <Label className="text-sm flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Werkbon koppelen
              </Label>
              <Select value={montageWerkbonId} onValueChange={async (v) => {
                if (v === '__new__') {
                  try {
                    const wb = await createWerkbon({
                      user_id: user?.id || '',
                      klant_id: project?.klant_id || '',
                      project_id: id || '',
                      titel: project?.naam || '',
                      datum: new Date().toISOString().split('T')[0],
                      status: 'concept',
                      toon_briefpapier: false,
                    })
                    setProjectWerkbonnen(prev => [...prev, wb])
                    setMontageWerkbonId(wb.id)
                    toast.success(`Werkbon ${wb.werkbon_nummer} aangemaakt`)
                  } catch (err) {
                    logger.error('Kon werkbon niet aanmaken:', err)
                    toast.error('Kon werkbon niet aanmaken')
                  }
                } else {
                  setMontageWerkbonId(v === '__none__' ? '' : v)
                }
              }}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Geen werkbon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Geen werkbon</SelectItem>
                  {projectWerkbonnen.map((wb) => {
                    const st = wb.status === 'concept' ? 'Open' : wb.status === 'definitief' ? 'In uitvoering' : 'Afgetekend'
                    return (
                      <SelectItem key={wb.id} value={wb.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs">{wb.werkbon_nummer}</span>
                          <span className="text-muted-foreground text-xs truncate">{wb.titel}</span>
                          <span className="text-[10px] text-muted-foreground/60">{st}</span>
                        </span>
                      </SelectItem>
                    )
                  })}
                  <SelectItem value="__new__">
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Plus className="h-3 w-3" /> Nieuwe werkbon
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Notities</Label>
              <Textarea value={montageNotities} onChange={(e) => setMontageNotities(e.target.value)} placeholder="Optioneel..." rows={2} className="mt-1 min-h-[50px]" />
            </div>

            {/* Bijlagen — compact */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  Bijlagen
                </Label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files) return
                      for (const file of Array.from(files)) {
                        try {
                          const bijlage = await uploadMontageBijlage(file)
                          setMontageBijlagen(prev => [...prev, bijlage])
                        } catch (err) {
                          logger.error('Kon montage bijlage niet uploaden:', err)
                          toast.error(`Kon ${file.name} niet uploaden`)
                        }
                      }
                      e.target.value = ''
                    }}
                  />
                  <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="h-3 w-3" /> Bestand
                  </span>
                </label>
              </div>
              {montageBijlagen.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {montageBijlagen.map((bijlage) => (
                    <span
                      key={bijlage.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-[#E6E4E0] bg-[#FAFAF8]"
                    >
                      {bijlage.type === 'pdf' ? (
                        <FileText className="h-3 w-3 text-[#C03A18]" />
                      ) : (
                        <Paperclip className="h-3 w-3 text-[#5A5A55]" />
                      )}
                      <span className="truncate max-w-[120px]">{bijlage.naam}</span>
                      <button
                        type="button"
                        title="Bekijken"
                        onClick={() => window.open(bijlage.url, '_blank')}
                        className="text-[#A0A098] hover:text-[#1A535C] ml-0.5"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Printen"
                        onClick={() => {
                          const w = window.open(bijlage.url, '_blank')
                          if (w) { w.addEventListener('load', () => w.print()) }
                        }}
                        className="text-[#A0A098] hover:text-[#1A535C]"
                      >
                        <Printer className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMontageBijlagen(prev => prev.filter(b => b.id !== bijlage.id))}
                        className="text-[#A0A098] hover:text-[#C03A18] ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
      {/* Opdrachtbevestiging Preview Dialog */}
      {obPreviewOfferte && (
        <PdfPreviewDialog
          open={!!obPreviewOfferte}
          onOpenChange={(open) => { if (!open) setObPreviewOfferte(null) }}
          title={`Opdrachtbevestiging ${obPreviewOfferte.nummer}`}
          generatePdf={async () => {
            const [offerteItems, profile, docStyle] = await Promise.all([
              getOfferteItems(obPreviewOfferte.id),
              getProfile(),
              getDocumentStyle(),
            ])
            const doc = await generateOpdrachtbevestigingPDF(
              obPreviewOfferte,
              offerteItems,
              klant || {},
              { ...profile, primaireKleur: primaireKleur || '#2563eb' },
              docStyle,
            )
            return doc.output('blob')
          }}
        />
      )}
    </div>
  )
}

/* InfoRow and TaakCard removed — using DOEN text-based layout and TaskChecklistView */
