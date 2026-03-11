import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useTabDirtyState } from '@/hooks/useTabDirtyState'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  LayoutGrid,
  List,
  Upload,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  File,
  CalendarDays,
  Users,
  TrendingUp,
  Target,
  Briefcase,
  Eye,
  Send,
  Mail,
  Receipt,
  CheckCircle2,
  RotateCcw,
  Clock,
  Link2,
  Copy,
  Pencil,
  Paperclip,
  ExternalLink,
  Trash2,
  RefreshCw,
  CheckCheck,
  Sparkles,
  Loader2,
  FileEdit,
  CreditCard,
  Save,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Shield,
  UserPlus,
  ClipboardCheck,
  Check,
  GripVertical,
  Camera,
  Wrench,
  MapPin,
  X,
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
  DialogTrigger,
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
  getFactuur,
  getFacturenByProject,
  getUitgavenByProject,
  getMontageAfsprakenByProject,
  createMontageAfspraak,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { analyzeProject } from '@/services/aiService'
import { sendEmail } from '@/services/gmailService'
import { tekeningGoedkeuringTemplate } from '@/services/emailTemplateService'
import { ProjectTasksTable } from './ProjectTasksTable'
import { ProjectPhotoGallery } from './ProjectPhotoGallery'
import { VisualisatieGallery } from '@/components/visualizer/VisualisatieGallery'
import { WerkbonVanProjectDialog } from '@/components/werkbonnen/WerkbonVanProjectDialog'
import { ProjectPortaalTab } from './ProjectPortaalTab'
import { ProjectProgressIndicator } from './ProjectProgressIndicator'
import type { Taak, Project, Document, Offerte, TekeningGoedkeuring, Klant, Tijdregistratie, Medewerker, ProjectToewijzing, Werkbon, Factuur, Uitgave, MontageAfspraak, ProjectFoto } from '@/types'
import { berekenBudgetStatus } from '@/utils/budgetUtils'
import { getStatusBadgeClass } from '@/utils/statusColors'
import { logger } from '../../utils/logger'
import { KlantStatusBadgeInline } from '@/components/shared/KlantStatusWarning'
import { AuditLogPanel } from '@/components/shared/AuditLogPanel'
import { logWijziging } from '@/utils/auditLogger'

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
  'te-factureren': 'Te factureren',
}

const goedkeuringStatusLabels: Record<string, string> = {
  verzonden: 'Verzonden',
  bekeken: 'Bekeken',
  goedgekeurd: 'Goedgekeurd',
  revisie: 'Revisie gevraagd',
}

const taakStatusKolommen: Array<{ key: string; label: string; kleur: string; bgKleur: string }> = [
  { key: 'todo', label: 'Todo', kleur: 'border-t-muted-foreground/40', bgKleur: 'from-muted-foreground/40 to-muted-foreground' },
  { key: 'bezig', label: 'Bezig', kleur: 'border-t-blue-500', bgKleur: 'from-blue-400 to-blue-600' },
  { key: 'review', label: 'Review', kleur: 'border-t-yellow-500', bgKleur: 'from-yellow-400 to-orange-500' },
  { key: 'klaar', label: 'Klaar', kleur: 'border-t-green-500', bgKleur: 'from-emerald-400 to-green-600' },
]

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

function getGoedkeuringStatusIcon(status: string) {
  switch (status) {
    case 'goedgekeurd': return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'revisie': return <RotateCcw className="h-4 w-4 text-amber-600" />
    case 'bekeken': return <Eye className="h-4 w-4 text-accent" />
    default: return <Clock className="h-4 w-4 text-blue-600" />
  }
}

function getGoedkeuringStatusColor(status: string) {
  switch (status) {
    case 'goedgekeurd': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'revisie': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
    case 'bekeken': return 'bg-wm-pale/30 text-[#3D3522] dark:bg-accent/30 dark:text-wm-pale'
    default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  }
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setDirty } = useTabDirtyState()
  const location = useLocation()
  const { user } = useAuth()
  const { offertePrefix, offerteGeldigheidDagen, standaardBtw, bedrijfsnaam, primaireKleur, emailHandtekening } = useAppSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [takenWeergave, setTakenWeergave] = useState<'board' | 'tabel'>('board')
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
  const [projectFotos, setProjectFotos] = useState<ProjectFoto[]>([])
  const [projectMontages, setProjectMontages] = useState<MontageAfspraak[]>([])
  const [projectFacturen, setProjectFacturen] = useState<Factuur[]>([])
  const [projectUitgaven, setProjectUitgaven] = useState<Uitgave[]>([])
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

  return (
    <div className="space-y-6 animate-fade-in-up">
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

      {/* ── Back + Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/projecten">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Projecten
            </Link>
          </Button>
          {klant && (
            <>
              <span className="text-muted-foreground text-xs">/</span>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                <Link to={`/klanten/${klant.id}`}>
                  {klant.bedrijfsnaam}<KlantStatusBadgeInline klant={klant} />
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Project Header — compact */}
        <div className={`h-1 w-full rounded-t-lg ${getStatusBadgeClass(project.status)}`} style={{ border: 'none' }} />
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blush to-sage flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <div>
                <div>
                  <h1 className="text-xl font-medium text-foreground leading-tight">{project.naam}</h1>
                  {project.project_nummer && (
                    <span className="text-xs text-gray-400 font-mono">{project.project_nummer}</span>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  {project.klant_naam || 'Onbekende klant'}
                  {project.vestiging_naam && (
                    <span className="text-muted-foreground/60">· {project.vestiging_naam}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={project.status}
                onChange={async (e) => {
                  const newStatus = e.target.value as Project['status']
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
                }}
                className={`${getStatusColor(project.status)} text-xs px-2.5 py-0.5 rounded-full border-0 cursor-pointer appearance-none font-medium focus:ring-1 focus:ring-primary/30 focus:outline-none pr-6 bg-no-repeat bg-[right_4px_center] bg-[length:12px]`}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
              >
                <option value="gepland">Gepland</option>
                <option value="actief">Actief</option>
                <option value="in-review">In review</option>
                <option value="te-factureren">Te factureren</option>
                <option value="on-hold">On-hold</option>
                <option value="afgerond">Afgerond</option>
              </select>
              <Badge className={`${getPriorityColor(project.prioriteit)} text-xs px-2.5 py-0.5`}>
                {project.prioriteit.charAt(0).toUpperCase() + project.prioriteit.slice(1)}
              </Badge>
              <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
              <Button
                variant="ghost"
                size="sm"
                onClick={openKopieDialog}
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Kopiëren
              </Button>
              <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
              {projectOffertes.length > 0 ? (
                <Button
                  size="sm"
                  onClick={() => navigate(`/offertes/${projectOffertes[0].id}/detail`, { state: { from: location.pathname } })}
                  className="h-7 px-3 text-xs font-semibold"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Ga naar offerte
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={openNieuweOfferte}
                  className="h-7 px-3 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Maak offerte
                </Button>
              )}
            </div>
          </div>


          {/* Budget waarschuwing */}
          {(() => {
            const bs = berekenBudgetStatus(project, projectTijdregistraties)
            if (bs.budget <= 0 || bs.niveau === 'normaal') return null
            return (
              <div className={`mt-3 flex items-center gap-3 rounded-lg px-4 py-2 ${
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
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {formatCurrency(bs.verbruikt)} van {formatCurrency(bs.budget)}
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Te factureren banner ── */}
      {project.status === 'te-factureren' && (
        <Card className="border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">Project gereed voor facturatie</h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">
                  Maak een factuur aan vanuit een offerte of ga direct naar facturen.
                </p>
                {projectOffertes.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {projectOffertes.filter(o => o.status !== 'gefactureerd').map((offerte) => (
                      <div key={offerte.id} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{offerte.titel}</span>
                          <span className="text-xs text-muted-foreground font-mono">{offerte.nummer}</span>
                          <Badge className={`${getStatusColor(offerte.status)} text-[10px] px-1.5 py-0`}>
                            {offerte.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold font-mono">{formatCurrency(offerte.totaal)}</span>
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => handleCreateFactuurFromOfferte(offerte)}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Factuur aanmaken
                          </Button>
                        </div>
                      </div>
                    ))}
                    {projectOffertes.every(o => o.status === 'gefactureerd') && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Alle offertes zijn gefactureerd
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => {
                        const params = new URLSearchParams({
                          klant_id: project.klant_id || '',
                          project_id: id || '',
                          titel: project.naam || '',
                        })
                        navigate(`/facturen/nieuw?${params.toString()}`)
                      }}
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      Nieuwe factuur aanmaken
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Briefing Sectie ── */}
      <Card className="border-border/80 dark:border-border/80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <FileEdit className="h-3.5 w-3.5 text-white" />
              </div>
              Briefing
            </CardTitle>
            <div className="flex items-center gap-2">
              {briefingOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  disabled={briefingSaving}
                  onClick={handleSaveBriefing}
                >
                  {briefingSaving ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  Opslaan
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setBriefingOpen(!briefingOpen)}
              >
                {briefingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {briefingOpen ? (
          <CardContent className="pt-2">
            <Textarea
              value={briefingText}
              onChange={(e) => setBriefingText(e.target.value)}
              placeholder="Voeg hier de projectbriefing toe... Beschrijf het project, de wensen van de klant, bijzonderheden, etc."
              rows={6}
              className="resize-y"
            />
          </CardContent>
        ) : (
          <CardContent className="pt-0 pb-3">
            {briefingText ? (
              <p
                className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setBriefingOpen(true)}
              >
                {briefingText}
              </p>
            ) : (
              <p
                className="text-sm text-muted-foreground/60 italic cursor-pointer hover:text-muted-foreground transition-colors"
                onClick={() => setBriefingOpen(true)}
              >
                Klik om een briefing toe te voegen...
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Main Layout: Taken + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ────────────── Taken (hoofdcontent) ────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={takenWeergave === 'board' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTakenWeergave('board')}
                className=""
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                Board
              </Button>
              <Button
                variant={takenWeergave === 'tabel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTakenWeergave('tabel')}
                className=""
              >
                <List className="mr-1.5 h-4 w-4" />
                Tabel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/taken')}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Taken overzicht
              </Button>
            </div>
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
              <DialogTrigger asChild>
                <Button size="sm" className="">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nieuwe Taak
                </Button>
              </DialogTrigger>
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
                    className=""
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
          </div>

          {/* Board View */}
          {takenWeergave === 'board' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {taakStatusKolommen.map((kolom) => {
                const kolomTaken = projectTaken.filter((t) => t.status === kolom.key)

                return (
                  <div key={kolom.key} className="flex flex-col">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${kolom.bgKleur}`} />
                        <h3 className="text-xs font-semibold text-foreground">{kolom.label}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 font-medium">
                          {kolomTaken.length}
                        </span>
                        <button
                          onClick={() => {
                            setNieuweTaakStatus(kolom.key as Taak['status'])
                            setNieuweTaakOpen(true)
                          }}
                          className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
                          title={`Taak toevoegen in ${kolom.label}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div
                      className="flex-1 min-h-[80px] flex flex-col gap-1.5 rounded-lg mt-2 p-1 transition-colors"
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5', 'ring-1', 'ring-primary/20') }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('bg-primary/5', 'ring-1', 'ring-primary/20') }}
                      onDrop={async (e) => {
                        e.preventDefault()
                        e.currentTarget.classList.remove('bg-primary/5', 'ring-1', 'ring-primary/20')
                        const taakId = e.dataTransfer.getData('text/plain')
                        if (!taakId) return
                        try {
                          await updateTaak(taakId, { status: kolom.key as Taak['status'] })
                          await fetchTaken()
                        } catch {
                          toast.error('Kon status niet wijzigen')
                        }
                      }}
                    >
                      {kolomTaken.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground/40 text-[11px] border border-dashed border-border/50 rounded-lg">
                          Sleep taken hierheen
                        </div>
                      ) : (
                        kolomTaken.map((taak) => (
                          <TaakCard
                            key={taak.id}
                            taak={taak}
                            onStatusChange={async (newStatus) => {
                              try {
                                await updateTaak(taak.id, { status: newStatus })
                                await fetchTaken()
                                if (newStatus === 'klaar') toast.success(`"${taak.titel}" afgerond`)
                              } catch {
                                toast.error('Kon status niet wijzigen')
                              }
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Table View */}
          {takenWeergave === 'tabel' && (
            <Card className="border-border/80 dark:border-border/80">
              <CardContent className="p-0">
                <ProjectTasksTable taken={projectTaken} />
              </CardContent>
            </Card>
          )}

          {/* ── Goedkeuringen Sectie ── */}
          {goedkeuringen.length > 0 && (
            <Card className="border-border/80 dark:border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  Klant Goedkeuringen
                  <span className="text-xs text-muted-foreground font-normal">{goedkeuringen.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {goedkeuringen.map((gk) => (
                  <div
                    key={gk.id}
                    className="bg-background dark:bg-foreground/80/50 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getGoedkeuringStatusIcon(gk.status)}
                        <span className="text-sm font-medium text-foreground">
                          {gk.document_ids.length} bestand(en)
                          {gk.offerte_id && ' + offerte'}
                        </span>
                      </div>
                      <Badge className={`${getGoedkeuringStatusColor(gk.status)} text-[10px] px-2`}>
                        {goedkeuringStatusLabels[gk.status] || gk.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Verstuurd naar {gk.email_aan} op {formatDate(gk.created_at)}
                      {gk.revisie_nummer > 1 && ` (revisie ${gk.revisie_nummer})`}
                    </div>

                    {gk.status === 'goedgekeurd' && gk.goedgekeurd_door && (
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2 text-xs text-green-700 dark:text-green-400">
                        Goedgekeurd door <strong>{gk.goedgekeurd_door}</strong>
                        {gk.goedgekeurd_op && ` op ${formatDate(gk.goedgekeurd_op)}`}
                      </div>
                    )}

                    {gk.status === 'revisie' && gk.revisie_opmerkingen && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                        <strong>Revisie opmerkingen:</strong> {gk.revisie_opmerkingen}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => copyApprovalLink(gk.token)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Link kopiëren
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => window.open(`/goedkeuring/${gk.token}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Openen
                      </Button>
                      {gk.status === 'revisie' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900"
                          onClick={() => {
                            // Pre-fill verstuur dialog for re-sending revised drawings
                            setSelectedDocIds(gk.document_ids)
                            setSelectedOfferteId(gk.offerte_id || '')
                            setVerstuurOnderwerp(`Revisie - ${project.naam}`)
                            setVerstuurBericht(
                              `Beste ${klant?.contactpersoon || project.klant_naam || 'klant'},\n\nHierbij ontvangt u de aangepaste tekening(en) voor het project "${project.naam}".\n\nWij hebben de volgende aanpassingen verwerkt:\n- ${gk.revisie_opmerkingen}\n\nGraag ontvangen wij opnieuw uw goedkeuring.\n\nMet vriendelijke groet`
                            )
                            setVerstuurOpen(true)
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Opnieuw versturen
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── Klantportaal Sectie ── */}
          {project && (
            <ProjectPortaalTab projectId={project.id} projectNaam={project.naam} />
          )}

          {/* Audit Log */}
          {project && (
            <AuditLogPanel entityType="project" entityId={project.id} />
          )}
        </div>

        {/* ────────────── Rechter Sidebar ────────────── */}
        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto scrollbar-thin">
          {/* ── Projectvoortgang ── */}
          <Card className="border-border/80 dark:border-border/80">
            <CardContent className="pt-5 pb-4">
              <ProjectProgressIndicator
                projectStatus={project.status}
                offertes={projectOffertes}
                werkbonnen={projectWerkbonnen}
                facturen={projectFacturen}
              />
            </CardContent>
          </Card>

          {/* ── Klant & Contact ── */}
          {klant && (
            <Card className="border-blush/40 bg-blush/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blush to-blush-deep flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-white" />
                  </div>
                  Klant & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Link to={`/klanten/${klant.id}`} className="text-sm font-semibold text-foreground hover:underline">
                    {klant.bedrijfsnaam}
                  </Link>
                  {klant.adres && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {klant.adres}
                      {klant.postcode && `, ${klant.postcode}`}
                      {klant.stad && ` ${klant.stad}`}
                    </p>
                  )}
                </div>
                {klant.contactpersoon && (
                  <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border/40">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blush to-blush-deep flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {getInitials(klant.contactpersoon)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{klant.contactpersoon}</p>
                      {klant.telefoon && <p className="text-[11px] text-muted-foreground">{klant.telefoon}</p>}
                      {klant.email && <p className="text-[11px] text-muted-foreground truncate">{klant.email}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Team ── */}
          <Card className="border-sage/40 bg-sage/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sage to-sage-deep flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-white" />
                  </div>
                  Team
                  <span className="text-xs text-muted-foreground font-normal">{project.team_leden.length} leden</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {project.team_leden.length > 0 && (
                <div className="space-y-2 mb-3">
                  {project.team_leden.map((lid) => (
                    <div
                      key={lid}
                      className="flex items-center gap-2.5 bg-background rounded-lg px-3 py-2 border border-border/40 group"
                    >
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-sage to-sage-deep flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {getInitials(lid)}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate flex-1">{lid}</span>
                      <button
                        onClick={async () => {
                          try {
                            const nieuwTeam = project.team_leden.filter(l => l !== lid)
                            const updated = await updateProject(id!, { team_leden: nieuwTeam })
                            setProject(updated)
                            toast.success(`${lid} verwijderd uit team`)
                          } catch { toast.error('Kon teamlid niet verwijderen') }
                        }}
                        className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Verwijderen"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {alleMedewerkers.length > 0 ? (
                <select
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                  value=""
                  onChange={async (e) => {
                    const mw = alleMedewerkers.find(m => m.id === e.target.value)
                    if (!mw || project.team_leden.includes(mw.naam)) return
                    try {
                      const nieuwTeam = [...project.team_leden, mw.naam]
                      const updated = await updateProject(id!, { team_leden: nieuwTeam })
                      setProject(updated)
                      toast.success(`${mw.naam} toegevoegd aan team`)
                    } catch { toast.error('Kon teamlid niet toevoegen') }
                  }}
                >
                  <option value="">Medewerker toevoegen...</option>
                  {alleMedewerkers
                    .filter(m => !project.team_leden.includes(m.naam))
                    .map(m => <option key={m.id} value={m.id}>{m.naam}{m.functie ? ` — ${m.functie}` : ''}</option>)
                  }
                </select>
              ) : project.team_leden.length === 0 ? (
                <p className="text-sm text-muted-foreground">Voeg medewerkers toe via Instellingen → Team</p>
              ) : null}
            </CardContent>
          </Card>

          {/* ── Montage Planning ── */}
          {projectMontages.length > 0 && (
          <Card className="border-border/80 dark:border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="p-1 rounded-md bg-blue-500/10">
                    <Wrench className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  Montage
                  <span className="text-xs text-muted-foreground font-normal">{projectMontages.length}</span>
                </CardTitle>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={handleOpenMontageDialog}
                  title="Montage inplannen"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(
                <div className="space-y-2">
                  {projectMontages.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-background dark:hover:bg-foreground/80/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/montage')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.titel}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3 flex-shrink-0" />
                          <span>{new Date(m.datum).toLocaleDateString('nl-NL')} {m.start_tijd}–{m.eind_tijd}</span>
                        </div>
                        {m.locatie && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{m.locatie}</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        m.status === 'gepland' ? 'bg-blue-100 text-blue-700' :
                        m.status === 'onderweg' ? 'bg-amber-100 text-amber-700' :
                        m.status === 'bezig' ? 'bg-green-100 text-green-700' :
                        m.status === 'afgerond' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* ── Werkbonnen ── */}
          {projectWerkbonnen.length > 0 && (
          <Card className="border-border/80 dark:border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="p-1 rounded-md bg-amber-500/10">
                    <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  Werkbonnen
                  <span className="text-xs text-muted-foreground font-normal">{projectWerkbonnen.length}</span>
                </CardTitle>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => setShowWerkbonDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                  {projectWerkbonnen.map((wb) => (
                    <div
                      key={wb.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-background dark:hover:bg-foreground/80/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/werkbonnen/${wb.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium font-mono">{wb.werkbon_nummer}</p>
                        <p className="text-xs text-muted-foreground">{new Date(wb.datum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        wb.status === 'concept' ? 'bg-muted text-foreground/70' :
                        wb.status === 'definitief' ? 'bg-blue-100 text-blue-700' :
                        wb.status === 'afgerond' ? 'bg-green-100 text-green-700' :
                        'bg-muted text-foreground/70'
                      }`}>
                        {wb.status === 'concept' ? 'Concept' : wb.status === 'definitief' ? 'Definitief' : wb.status === 'afgerond' ? 'Afgerond' : wb.status}
                      </span>
                    </div>
                  ))}
                </div>
            </CardContent>
          </Card>
          )}

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

          {/* ── Facturen ── */}
          {projectFacturen.length > 0 && (
            <Card className="border-border/80 dark:border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 rounded-md bg-emerald-500/10">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    Facturen
                    <span className="text-xs text-muted-foreground font-normal">{projectFacturen.length}</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projectFacturen.map((factuur) => (
                    <div
                      key={factuur.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-background dark:hover:bg-foreground/80/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/facturen/${factuur.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium font-mono">{factuur.nummer}</p>
                        <p className="text-xs text-muted-foreground">{new Date(factuur.factuurdatum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono">{formatCurrency(factuur.totaal)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          factuur.status === 'betaald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          factuur.status === 'vervallen' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          factuur.status === 'verzonden' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
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

          {/* ── Uitgaven ── */}
          {projectUitgaven.length > 0 && (
            <Card className="border-border/80 dark:border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1 rounded-md bg-orange-500/10">
                      <Wallet className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    Uitgaven
                    <span className="text-xs text-muted-foreground font-normal">{projectUitgaven.length}</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projectUitgaven.map((uitgave) => (
                    <div
                      key={uitgave.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-background dark:hover:bg-foreground/80/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/uitgaven')}
                    >
                      <div>
                        <p className="text-sm font-medium font-mono">{uitgave.uitgave_nummer}</p>
                        <p className="text-xs text-muted-foreground">{new Date(uitgave.datum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono">{formatCurrency(uitgave.bedrag_incl_btw)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          uitgave.status === 'betaald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          uitgave.status === 'verlopen' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
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

          {/* ── Signing Visualisaties ── */}
          <Card className="border-border/80 dark:border-border/80">
            <CardContent className="pt-5">
              <VisualisatieGallery project_id={project.id} klant_id={project.klant_id} compact />
            </CardContent>
          </Card>

          {/* ── Offertes ── */}
          {projectOffertes.length > 0 && (
          <Card className="border-border/80 dark:border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5 text-white" />
                  </div>
                  Offertes
                  <span className="text-xs text-muted-foreground font-normal">{projectOffertes.length}</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={openNieuweOfferte}
                  title="Nieuwe offerte"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(
                <div className="space-y-2">
                  {projectOffertes.map((offerte) => {
                    const linkedFactuur = offerteFactuurMap[offerte.id]
                    return (
                      <div
                        key={offerte.id}
                        className="bg-background dark:bg-foreground/80/50 rounded-lg px-3 py-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{offerte.titel}</p>
                          {/* Quick status change */}
                          {offerte.status !== 'gefactureerd' ? (
                            <select
                              value={offerte.status}
                              onChange={(e) => handleOfferteStatusChange(offerte.id, e.target.value as Offerte['status'])}
                              className={`${getStatusColor(offerte.status)} text-[10px] px-1.5 py-0.5 rounded-full border-0 cursor-pointer appearance-none font-medium focus:ring-1 focus:ring-primary/30 focus:outline-none`}
                            >
                              <option value="concept">Concept</option>
                              <option value="verzonden">Verzonden</option>
                              <option value="bekeken">Bekeken</option>
                              <option value="goedgekeurd">Goedgekeurd</option>
                              <option value="afgewezen">Afgewezen</option>
                              <option value="verlopen">Verlopen</option>
                            </select>
                          ) : (
                            <Badge className={`${getStatusColor(offerte.status)} text-[10px] px-1.5 py-0 flex-shrink-0`}>
                              {offerte.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{offerte.nummer}</span>
                          <span className="text-sm font-bold text-foreground font-mono">{formatCurrency(offerte.totaal)}</span>
                        </div>
                        <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => navigate(`/offertes/${offerte.id}/detail`, { state: { from: location.pathname } })}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Bekijk
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => navigate(`/offertes/${offerte.id}/bewerken`, { state: { from: location.pathname } })}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Bewerk
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
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
                        {/* Factureren row */}
                        {!offerte.geconverteerd_naar_factuur_id && (
                          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-md px-2.5 py-1.5 border border-emerald-200 dark:border-emerald-800 mt-1">
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs text-emerald-700 dark:text-emerald-300">Factureren</span>
                            </div>
                            <Button
                              size="sm"
                              className="h-6 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleCreateFactuurFromOfferte(offerte)}
                            >
                              Factureren &rarr;
                            </Button>
                          </div>
                        )}
                        {offerte.geconverteerd_naar_factuur_id && (
                          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-md px-2.5 py-1.5 border border-blue-200 dark:border-blue-800 mt-1">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs text-blue-700 dark:text-blue-300">
                                {linkedFactuur ? (
                                  <>
                                    {linkedFactuur.nummer}
                                    <span className="mx-1">&middot;</span>
                                    <span className={
                                      linkedFactuur.status === 'betaald' ? 'text-emerald-600 dark:text-emerald-400 font-medium' :
                                      linkedFactuur.status === 'vervallen' ? 'text-red-600 dark:text-red-400 font-medium' :
                                      ''
                                    }>
                                      {linkedFactuur.status === 'betaald' ? 'Betaald' :
                                       linkedFactuur.status === 'verzonden' ? 'Verzonden' :
                                       linkedFactuur.status === 'concept' ? 'Concept' :
                                       linkedFactuur.status === 'vervallen' ? 'Vervallen' :
                                       linkedFactuur.status === 'gecrediteerd' ? 'Gecrediteerd' :
                                       linkedFactuur.status}
                                    </span>
                                    <span className="mx-1">&middot;</span>
                                    <span className="font-mono">{formatCurrency(linkedFactuur.totaal)}</span>
                                  </>
                                ) : 'Gefactureerd'}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30"
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
              )}
            </CardContent>
          </Card>
          )}


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
                    className="bg-background dark:bg-foreground/80"
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

          {/* ── Situatiefoto's ── */}
          <ProjectPhotoGallery
            projectId={id!}
            userId={user?.id || ''}
            photos={projectFotos}
            onPhotosChanged={fetchProjectFotos}
          />

          {/* ── Bestanden (drag & drop + upload button) ── */}
          <Card className="border-border/80 dark:border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  Bestanden
                  <span className="text-xs text-muted-foreground font-normal">{projectDocumenten.length}</span>
                </CardTitle>
                <div className="flex items-center gap-1">
                  {projectDocumenten.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={openVerstuurDialog}
                      title="Verstuur naar klant"
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Verstuur
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => fileInputRef.current?.click()}
                    title="Bestand uploaden"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Drag & drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/10 dark:bg-primary/20'
                    : 'border-border dark:border-border hover:border-primary'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const files = Array.from(e.dataTransfer.files)
                  if (files.length > 0) {
                    handleFileUpload(files)
                  }
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className={`h-5 w-5 transition-colors ${
                    isDragging
                      ? 'text-accent dark:text-primary'
                      : 'text-muted-foreground opacity-60'
                  }`} />
                  <p className={`text-xs font-medium ${isDragging ? 'text-accent dark:text-primary' : 'text-muted-foreground'}`}>
                    {isDragging ? 'Laat los om te uploaden' : 'Sleep bestanden of klik om te uploaden'}
                  </p>
                </div>
              </div>

              {/* Bestandenlijst */}
              {projectDocumenten.length > 0 && (
                <div className="space-y-2">
                  {projectDocumenten.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2.5 bg-background dark:bg-foreground/80/50 rounded-lg px-3 py-2 group hover:bg-muted dark:hover:bg-foreground/80 transition-colors cursor-pointer"
                    >
                      <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        {getFileIcon(doc.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-accent dark:group-hover:text-primary transition-colors">
                          {doc.naam}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.grootte)}</span>
                          <Badge className={`${getStatusColor(doc.status)} text-[9px] px-1 py-0`}>
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            await deleteDocument(doc.id)
                            toast.success(`"${doc.naam}" verwijderd`)
                            await fetchDocumenten()
                          } catch (err) {
                            logger.error('Fout bij verwijderen:', err)
                            toast.error('Kon bestand niet verwijderen')
                          }
                        }}
                        title="Verwijderen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Snelle toevoeg-links voor lege categorieën ── */}
          {(projectOffertes.length === 0 || projectWerkbonnen.length === 0 || projectMontages.length === 0) && (
            <div className="flex flex-wrap gap-2">
              {projectOffertes.length === 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={openNieuweOfferte}>
                  <Plus className="h-3 w-3 mr-1" /> Offerte
                </Button>
              )}
              {projectWerkbonnen.length === 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowWerkbonDialog(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Werkbon
                </Button>
              )}
              {projectMontages.length === 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleOpenMontageDialog}>
                  <Plus className="h-3 w-3 mr-1" /> Montage
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

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
                          : 'bg-background dark:bg-foreground/80/50 hover:bg-muted dark:hover:bg-foreground/80 border border-transparent'
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
                        <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.grootte)}</span>
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
                className="bg-background dark:bg-foreground/80"
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
            <div className="bg-background dark:bg-foreground/80/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
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
                          : 'bg-background border-border text-muted-foreground hover:bg-muted dark:bg-foreground/80 dark:border-border'
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
            'text-[13px] font-medium leading-tight',
            isDone ? 'line-through text-muted-foreground' : 'text-foreground'
          )}>{taak.titel}</p>

          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge className={`${getPriorityColor(taak.prioriteit)} text-[9px] px-1 py-0`}>
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
                'text-[10px] ml-auto',
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
                  'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-colors',
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
