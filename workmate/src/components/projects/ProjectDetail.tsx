import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
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
  getOffertesByProject,
  updateOfferte,
  createDocument,
  deleteDocument,
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
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { analyzeProject } from '@/services/aiService'
import { sendEmail } from '@/services/gmailService'
import { tekeningGoedkeuringTemplate } from '@/services/emailTemplateService'
import { ProjectTasksTable } from './ProjectTasksTable'
import type { Taak, Project, Document, Offerte, TekeningGoedkeuring, Klant, Tijdregistratie, Medewerker, ProjectToewijzing, Werkbon, Factuur } from '@/types'
import { berekenBudgetStatus } from '@/utils/budgetUtils'
import { logger } from '../../utils/logger'

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
  { key: 'todo', label: 'Todo', kleur: 'border-t-gray-400', bgKleur: 'from-gray-400 to-gray-500' },
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
  return <File className={`${size} text-gray-400`} />
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

  const handleSaveBriefing = async () => {
    if (!project || !id) return
    setBriefingSaving(true)
    try {
      const updated = await updateProject(id, { beschrijving: briefingText })
      setProject(updated)
      toast.success('Briefing opgeslagen')
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
        eind_datum: '',
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
          deadline: '',
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
        const [projectData, takenData, allDocumenten, offertesData, goedkeuringenData, tijdData, medewerkersData, toewijzingenData, werkbonnenData] = await Promise.all([
          getProject(id),
          getTakenByProject(id),
          getDocumenten(),
          getOffertesByProject(id),
          getTekeningGoedkeuringen(id),
          getTijdregistratiesByProject(id),
          getMedewerkers(),
          getProjectToewijzingen(id),
          getWerkbonnenByProject(id),
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

  const eindDatum = project.eind_datum ? new Date(project.eind_datum) : null
  const isValidDate = eindDatum && !isNaN(eindDatum.getTime())
  const isOverdue = isValidDate && eindDatum < new Date() && project.status !== 'afgerond'
  const daysLeft = isValidDate ? Math.ceil((eindDatum.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
  const takenKlaar = projectTaken.filter(t => t.status === 'klaar').length
  const takenTotaal = projectTaken.length

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Hidden file input ── */}
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
                  {klant.bedrijfsnaam}
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Project Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3D3522] via-accent to-[#3D3522] p-6 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-wm-pale rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-6 w-6 text-wm-pale" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white font-display">{project.naam}</h1>
                  <p className="text-sm text-wm-pale/70 mt-0.5 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {project.klant_naam || 'Onbekende klant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${getStatusColor(project.status)} text-sm px-3 py-1`}>
                  {statusLabels[project.status] || project.status}
                </Badge>
                <Badge className={`${getPriorityColor(project.prioriteit)} text-sm px-3 py-1`}>
                  {project.prioriteit.charAt(0).toUpperCase() + project.prioriteit.slice(1)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAiAnalysis}
                  disabled={aiAnalysisLoading}
                  className="h-8 px-3 text-wm-pale hover:text-white hover:bg-white/10 border border-white/10"
                >
                  {aiAnalysisLoading
                    ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    : <Sparkles className="h-4 w-4 mr-1.5" />
                  }
                  AI Analyse
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/facturen?klant=${project.klant_id}`)}
                  className="h-8 px-3 text-emerald-200 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  <Receipt className="h-4 w-4 mr-1.5" />
                  Factuur
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openKopieDialog}
                  className="h-8 px-3 text-wm-pale hover:text-white hover:bg-white/10 border border-white/10"
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Kopiëren
                </Button>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="h-3.5 w-3.5 text-wm-pale" />
                  <span className="text-[10px] text-wm-pale/80 uppercase tracking-wider font-medium">Voortgang</span>
                </div>
                <p className="text-xl font-bold">{project.voortgang}%</p>
                <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-wm-pale rounded-full"
                    style={{ width: `${project.voortgang}%` }}
                  />
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-wm-light" />
                  <span className="text-[10px] text-wm-pale/80 uppercase tracking-wider font-medium">Goedkeuring</span>
                </div>
                {goedkeuringen.length > 0 ? (
                  <>
                    <p className="text-xl font-bold">
                      {goedkeuringen.filter(g => g.status === 'goedgekeurd').length}/{goedkeuringen.length}
                    </p>
                    <p className="text-[10px] mt-0.5 text-wm-pale/60">
                      {goedkeuringen.some(g => g.status === 'revisie')
                        ? `${goedkeuringen.filter(g => g.status === 'revisie').length} revisie(s)`
                        : 'goedgekeurd'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold">-</p>
                    <p className="text-[10px] mt-0.5 text-wm-pale/60">nog niet verstuurd</p>
                  </>
                )}
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays className="h-3.5 w-3.5 text-wm-pale" />
                  <span className="text-[10px] text-wm-pale/80 uppercase tracking-wider font-medium">Deadline</span>
                </div>
                <p className={`text-xl font-bold ${isOverdue ? 'text-amber-400' : ''}`}>
                  {!isValidDate ? '-' : isOverdue ? `${Math.abs(daysLeft)}d` : project.status === 'afgerond' ? 'Klaar' : `${daysLeft}d`}
                </p>
                <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-amber-300/80' : 'text-wm-pale/60'}`}>
                  {!isValidDate ? 'geen deadline' : isOverdue ? 'verlopen' : project.status === 'afgerond' ? 'afgerond' : 'resterend'}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-300" />
                  <span className="text-[10px] text-wm-pale/80 uppercase tracking-wider font-medium">Taken</span>
                </div>
                <p className="text-xl font-bold">{takenKlaar}/{takenTotaal}</p>
                <p className="text-[10px] mt-0.5 text-wm-pale/60">afgerond</p>
              </div>
            </div>

            {/* Budget waarschuwing */}
            {(() => {
              const bs = berekenBudgetStatus(project, projectTijdregistraties)
              if (bs.budget <= 0 || bs.niveau === 'normaal') return null
              return (
                <div className={`mt-4 flex items-center gap-3 rounded-lg px-4 py-2 ${
                  bs.niveau === 'overschreden'
                    ? 'bg-red-500/20 border border-red-400/30'
                    : 'bg-amber-500/20 border border-amber-400/30'
                }`}>
                  <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                    bs.niveau === 'overschreden' ? 'text-red-300' : 'text-amber-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {bs.niveau === 'overschreden'
                        ? `Budget overschreden: ${bs.percentage.toFixed(0)}%`
                        : `Budget waarschuwing: ${bs.percentage.toFixed(0)}% verbruikt`}
                    </p>
                    <p className="text-xs text-wm-pale/70">
                      {formatCurrency(bs.verbruikt)} van {formatCurrency(bs.budget)} gebruikt
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          bs.niveau === 'overschreden' ? 'bg-red-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(bs.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
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
                      <div key={offerte.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{offerte.titel}</span>
                          <span className="text-xs text-muted-foreground">{offerte.nummer}</span>
                          <Badge className={`${getStatusColor(offerte.status)} text-[10px] px-1.5 py-0`}>
                            {offerte.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold">{formatCurrency(offerte.totaal)}</span>
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
      <Card className="border-gray-200/80 dark:border-gray-700/80">
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
                className={takenWeergave === 'board' ? 'bg-gradient-to-r from-accent to-primary border-0' : ''}
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                Board
              </Button>
              <Button
                variant={takenWeergave === 'tabel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTakenWeergave('tabel')}
                className={takenWeergave === 'tabel' ? 'bg-gradient-to-r from-accent to-primary border-0' : ''}
              >
                <List className="mr-1.5 h-4 w-4" />
                Tabel
              </Button>
            </div>
            <Dialog open={nieuweTaakOpen} onOpenChange={(open) => {
              setNieuweTaakOpen(open)
              if (!open) {
                setNieuweTaakTitel('')
                setNieuweTaakBeschrijving('')
                setNieuweTaakToegewezen('')
                setNieuweTaakDeadline('')
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-accent to-primary border-0">
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
                      <Label htmlFor="taak-toegewezen">Toegewezen aan</Label>
                      <Input
                        id="taak-toegewezen"
                        placeholder="Naam..."
                        value={nieuweTaakToegewezen}
                        onChange={(e) => setNieuweTaakToegewezen(e.target.value)}
                      />
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
                    className="bg-gradient-to-r from-accent to-primary border-0"
                    onClick={async () => {
                      try {
                        await createTaak({
                          user_id: user?.id || '',
                          project_id: id!,
                          titel: nieuweTaakTitel.trim(),
                          beschrijving: nieuweTaakBeschrijving.trim(),
                          status: 'todo',
                          prioriteit: 'medium',
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {taakStatusKolommen.map((kolom) => {
                const kolomTaken = projectTaken.filter((t) => t.status === kolom.key)

                return (
                  <div key={kolom.key} className="space-y-3">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-t-2 border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${kolom.bgKleur}`} />
                        <h3 className="text-sm font-semibold text-foreground">{kolom.label}</h3>
                      </div>
                      <span className="text-xs text-muted-foreground bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 font-medium">
                        {kolomTaken.length}
                      </span>
                    </div>

                    {kolomTaken.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        Geen taken
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {kolomTaken.map((taak) => (
                          <TaakCard key={taak.id} taak={taak} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Table View */}
          {takenWeergave === 'tabel' && (
            <Card className="border-gray-200/80 dark:border-gray-700/80">
              <CardContent className="p-0">
                <ProjectTasksTable taken={projectTaken} />
              </CardContent>
            </Card>
          )}

          {/* ── Goedkeuringen Sectie ── */}
          {goedkeuringen.length > 0 && (
            <Card className="border-gray-200/80 dark:border-gray-700/80">
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
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2"
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
        </div>

        {/* ────────────── Rechter Sidebar ────────────── */}
        <div className="space-y-6">
          {/* ── Team ── */}
          <Card className="border-gray-200/80 dark:border-gray-700/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                Team
                <span className="text-xs text-muted-foreground font-normal ml-auto">{project.team_leden.length} leden</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.team_leden.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen teamleden toegewezen.</p>
              ) : (
                <div className="space-y-2">
                  {project.team_leden.map((lid) => (
                    <div
                      key={lid}
                      className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2"
                    >
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-wm-pale flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {getInitials(lid)}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">{lid}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Projectrechten ── */}
          <Card className="border-gray-200/80 dark:border-gray-700/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
                Rechten
                <span className="text-xs text-muted-foreground font-normal ml-auto">{projectToewijzingen.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Bestaande toewijzingen */}
              {projectToewijzingen.length > 0 && (
                <div className="space-y-1.5">
                  {projectToewijzingen.map((tw) => {
                    const mw = alleMedewerkers.find(m => m.id === tw.medewerker_id)
                    return (
                      <div key={tw.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                          {getInitials(mw?.naam || '?')}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate flex-1">{mw?.naam || 'Onbekend'}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                          tw.rol === 'eigenaar' ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                          tw.rol === 'viewer' ? 'border-gray-300 bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                          'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {tw.rol}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                          onClick={async () => {
                            try {
                              await deleteProjectToewijzing(tw.id)
                              setProjectToewijzingen(prev => prev.filter(t => t.id !== tw.id))
                              toast.success('Toewijzing verwijderd')
                            } catch { toast.error('Kon toewijzing niet verwijderen') }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Toevoegen */}
              <div className="flex items-center gap-2">
                <select
                  value={toewijzingMedewerkerId}
                  onChange={(e) => setToewijzingMedewerkerId(e.target.value)}
                  className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Medewerker...</option>
                  {alleMedewerkers
                    .filter(m => m.status === 'actief' && !projectToewijzingen.some(t => t.medewerker_id === m.id))
                    .map(m => <option key={m.id} value={m.id}>{m.naam}</option>)
                  }
                </select>
                <select
                  value={toewijzingRol}
                  onChange={(e) => setToewijzingRol(e.target.value as ProjectToewijzing['rol'])}
                  className="w-24 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="medewerker">Medewerker</option>
                  <option value="eigenaar">Eigenaar</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                  disabled={!toewijzingMedewerkerId}
                  onClick={async () => {
                    if (!toewijzingMedewerkerId || !user) return
                    try {
                      const created = await createProjectToewijzing({
                        user_id: user.id,
                        project_id: id!,
                        medewerker_id: toewijzingMedewerkerId,
                        rol: toewijzingRol,
                      })
                      setProjectToewijzingen(prev => [...prev, created])
                      setToewijzingMedewerkerId('')
                      toast.success('Medewerker toegewezen')
                    } catch { toast.error('Kon niet toewijzen') }
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Werkbonnen ── */}
          <Card className="border-gray-200/80 dark:border-gray-700/80">
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
                  onClick={() => navigate(`/werkbonnen/nieuw`)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projectWerkbonnen.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Geen werkbonnen</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectWerkbonnen.map((wb) => (
                    <div
                      key={wb.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/werkbonnen/${wb.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium font-mono">{wb.werkbon_nummer}</p>
                        <p className="text-xs text-muted-foreground">{new Date(wb.datum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        wb.status === 'concept' ? 'bg-gray-100 text-gray-700' :
                        wb.status === 'ingediend' ? 'bg-blue-100 text-blue-700' :
                        wb.status === 'goedgekeurd' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {wb.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>


          {/* ── Offertes ── */}
          <Card className="border-gray-200/80 dark:border-gray-700/80">
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
              {projectOffertes.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Geen offertes</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-accent dark:text-primary mt-1 h-auto p-0"
                    onClick={openNieuweOfferte}
                  >
                    Eerste offerte aanmaken
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectOffertes.map((offerte) => {
                    const linkedFactuur = offerteFactuurMap[offerte.id]
                    return (
                      <div
                        key={offerte.id}
                        className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2.5 space-y-1.5"
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
                          <span className="text-sm font-bold text-foreground">{formatCurrency(offerte.totaal)}</span>
                        </div>
                        <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => navigate(`/offertes/${offerte.id}/preview`, { state: { from: location.pathname } })}
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
                        {offerte.status === 'goedgekeurd' && !offerte.geconverteerd_naar_factuur_id && (
                          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-md px-2.5 py-1.5 border border-emerald-200 dark:border-emerald-800 mt-1">
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs text-emerald-700 dark:text-emerald-300">Klaar om te factureren</span>
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
                                    {formatCurrency(linkedFactuur.totaal)}
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
                    className="bg-gray-50 dark:bg-gray-800"
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
                  className="bg-gradient-to-r from-accent to-primary border-0"
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

          {/* ── Bestanden (drag & drop + upload button) ── */}
          <Card className="border-gray-200/80 dark:border-gray-700/80">
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
                    : 'border-gray-300 dark:border-gray-700 hover:border-primary'
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
                      className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
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
              className="bg-gradient-to-r from-accent to-primary border-0"
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
                          : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDocSelection(doc.id)}
                        className="rounded border-gray-300 text-accent focus:ring-primary"
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
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                className="bg-gray-50 dark:bg-gray-800"
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
              className="bg-gradient-to-r from-accent to-primary border-0"
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
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
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
              className="bg-gradient-to-r from-accent to-primary border-0"
              onClick={handleKopieerProject}
            >
              {kopieBezig ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {kopieBezig ? 'Kopiëren...' : 'Project kopiëren'}
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
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      {children || <span className="text-sm font-medium text-foreground">{value}</span>}
    </div>
  )
}

/* ────────────── Taak Card Component ────────────── */

function TaakCard({ taak }: { key?: React.Key; taak: Taak }) {
  const isOverdue = new Date(taak.deadline) < new Date() && taak.status !== 'klaar'

  return (
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-gray-200/80 dark:border-gray-700/80">
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium text-foreground leading-tight">{taak.titel}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={`${getPriorityColor(taak.prioriteit)} text-[10px] px-1.5 py-0`}>
            {taak.prioriteit}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-wm-pale flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-semibold">
                {getInitials(taak.toegewezen_aan)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {taak.toegewezen_aan}
            </span>
          </div>
          <span
            className={`text-xs ${
              isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
            }`}
          >
            {formatDate(taak.deadline)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
