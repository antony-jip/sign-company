import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
// BackButton removed — inline back link in header
import { useTabDirtyState } from '@/hooks/useTabDirtyState'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
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
  RefreshCw,
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
  ChevronRight,
  Pencil,
  Bell,
  BellOff,
  Clock,
  Package,
  User2,
  CalendarDays,
} from 'lucide-react'
import { List as TabList, Wrench as TabWrench, Euro as TabEuro, PenLine as TabPenLine, Mail as TabMail, Ruler as TabRuler } from 'lucide-react'
import { getEmailsVoorProject, type ProjectMail } from '@/services/emailProjectService'
import { sanitizeEmailHTML } from '@/lib/sanitize'
import { callForgie } from '@/services/forgieService'
import { DatePicker } from '@/components/ui/date-picker'
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
  deleteTaak,
  getOffertesByProject,
  createOfferte,
  createOfferteItem,
  updateOfferte,
  updateOfferteItem,
  deleteOfferte,
  createDocument,
  deleteDocument,
  getProjectFotos,
  createProjectFoto,
  createTekeningGoedkeuring,
  getTekeningGoedkeuringen,
  getKlant,
  getKlanten,
  updateKlant,
  getContactpersonenByKlant,
  updateContactpersoonDB,
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
  updateMontageAfspraak,
  deleteMontageAfspraak,
  getSigningVisualisatiesByProject,
  getOfferteItems,
  getProfile,
  getDocumentStyle,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { uploadFile, uploadMontageBijlage } from '@/services/storageService'
import { getOrgId } from '@/services/supabaseHelpers'
import { analyzeProject } from '@/services/aiService'
import { sendEmail } from '@/services/gmailService'
import { tekeningGoedkeuringTemplate } from '@/services/emailTemplateService'
// ProjectTasksTable removed — using TaskChecklistView in TakenOfferteGrid
import { ProjectPhotoGallery } from './ProjectPhotoGallery'
import { ProjectMaatjesTab } from '@/components/maatjes/ProjectMaatjesTab'
import { getProjectMaatjes } from '@/services/maatjeService'
import { VisualisatieGallery } from '@/components/visualizer/VisualisatieGallery'
import { WerkbonVanProjectDialog } from '@/components/werkbonnen/WerkbonVanProjectDialog'
import { AddEditClient } from '@/components/clients/AddEditClient'
import { PakbonVanProjectDialog } from '@/components/leveringsbonnen/PakbonVanProjectDialog'
// SpectrumBar removed — using text-based phase in header
import { getFase } from '@/utils/projectFases'
// ProjectKaart removed — using inline sticky header
import { PortaalCompactBlock } from './cockpit/PortaalCompactBlock'
import { ActiviteitCard } from './cockpit/ActiviteitCard'
import { KlantCard } from './cockpit/KlantCard'
import { TeamCard } from './cockpit/TeamCard'
import { ProjectMailComposer, type ProjectMailComposerHandle } from './ProjectMailComposer'
import { ActiesCard } from './cockpit/ActiesCard'
import { confirm } from '@/components/shared/ConfirmDialog'
import { TaskChecklistView } from './cockpit/TaskChecklistView'
import { BriefingCard } from './cockpit/BriefingCard'
import { TakenOfferteGrid } from './cockpit/TakenOfferteGrid'
import { ProjectFaseBar } from './cockpit/ProjectFaseBar'
import { BestandenSection } from './cockpit/BestandenSection'
import { ActiviteitFeed, buildActivityFeed, type ActivityEvent } from './cockpit/ActiviteitFeed'
const PdfPreviewDialog = React.lazy(() => import('@/components/shared/PdfPreviewDialog').then(m => ({ default: m.PdfPreviewDialog })))
import { generateOpdrachtbevestigingPDF } from '@/services/pdfService'
import { useProjectSidebarConfig } from '@/hooks/useProjectSidebarConfig'
import type { Taak, Project, Document, Offerte, TekeningGoedkeuring, Klant, Tijdregistratie, Medewerker, ProjectToewijzing, Werkbon, Factuur, Uitgave, MontageAfspraak, MontageBijlage, ProjectFoto, AuditLogEntry, Contactpersoon, ContactpersoonRecord, Maatje } from '@/types'
import { berekenBudgetStatus } from '@/utils/budgetUtils'
import { logger } from '../../utils/logger'
import { logWijziging, logCreate } from '@/utils/auditLogger'
import { getAuditLogForProject } from '@/services/supabaseService'
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { getStatusPillClass } from '@/utils/statusColors'
import { Skeleton } from '@/components/ui/skeleton'

function ProjectDetailSkeleton() {
  return (
    <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 bg-background">
      <div>
        {/* Header (breadcrumb + titel + subline + tabs) */}
        <div className="px-8 pt-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <div className="flex items-baseline gap-4">
            <Skeleton className="h-8 w-72" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-1 border-b border-border mt-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-3 py-2.5">
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Two-column body grid */}
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8 px-4 md:px-8 py-4 md:py-8">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Voortgang/Fase card — 5 stage cirkels */}
            <div className="doen-slate-surface rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-between gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                    {i < 4 && <Skeleton className="h-[2px] flex-1" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Briefing card */}
            <div className="doen-slate-surface rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>

            {/* Taken + Offertes grid (2 columns op md+) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, col) => (
                <div key={col} className="doen-slate-surface rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 rounded" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2.5 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Activiteit feed */}
            <div className="doen-slate-surface rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="w-full lg:w-[300px] xl:w-[320px] flex-shrink-0 space-y-4 lg:self-start">
            {/* Klant card */}
            <div className="doen-slate-surface rounded-2xl p-5">
              <Skeleton className="h-3 w-16 mb-3" />
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-3 w-32 mb-4" />
              <div className="space-y-2 pt-3 border-t border-border/40">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>

            {/* Acties grid */}
            <div className="doen-slate-surface rounded-2xl p-5">
              <Skeleton className="h-3 w-16 mb-3" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Bestanden */}
            <div className="doen-slate-surface rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  'akkoord-klant': 'Akkoord klant',
  'ingepland': 'Ingepland',
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
  { value: 'akkoord-klant', label: 'Akkoord klant' },
  { value: 'ingepland', label: 'Ingepland' },
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
    case 'akkoord-klant': return 'bg-[#1A535C]'
    case 'ingepland': return 'bg-[#2A5580]'
    case 'afgerond': return 'bg-[#1A535C]'
    case 'on-hold': return 'bg-[#5A5A55]'
    case 'te-factureren': return 'bg-[#2D6B48]'
    case 'gefactureerd': return 'bg-[#2D6B48]'
    default: return 'bg-[#5A5A55]'
  }
}

type ProjectTab = 'overzicht' | 'werkbon' | 'financieel' | 'email' | 'notities' | 'maatjes'



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
  const { navigateWithTab } = useNavigateWithTab()
  const { setDirty } = useTabDirtyState()
  const location = useLocation()
  const { user } = useAuth()
  const { medewerkers } = useMedewerkers()
  const { offertePrefix, offerteGeldigheidDagen, standaardBtw, bedrijfsnaam, primaireKleur, emailHandtekening } = useAppSettings()
  const { config: sidebarConfig } = useProjectSidebarConfig()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const mailComposerRef = useRef<ProjectMailComposerHandle>(null)
  const [mailComposerOpen, setMailComposerOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 48)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  const [activeTab, setActiveTab] = useState<ProjectTab>(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    return (['overzicht', 'werkbon', 'financieel', 'email', 'notities', 'maatjes'].includes(tabParam || '') ? tabParam : 'overzicht') as ProjectTab
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
  const [editKlantOpen, setEditKlantOpen] = useState(false)
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([])
  const [projectTaken, setProjectTaken] = useState<Taak[]>([])
  const [projectDocumenten, setProjectDocumenten] = useState<Document[]>([])
  const [projectOffertes, setProjectOffertes] = useState<Offerte[]>([])
  const [offerteFactuurMap, setOfferteFactuurMap] = useState<Record<string, Factuur>>({})
  const [goedkeuringen, setGoedkeuringen] = useState<TekeningGoedkeuring[]>([])
  const [obPreviewOfferte, setObPreviewOfferte] = useState<Offerte | null>(null)
  const [showObOfferteSelect, setShowObOfferteSelect] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [editingNaam, setEditingNaam] = useState(false)
  const [naamDraft, setNaamDraft] = useState('')
  const [showNieuwCp, setShowNieuwCp] = useState(false)
  const [nieuwCpNaam, setNieuwCpNaam] = useState('')
  const [nieuwCpEmail, setNieuwCpEmail] = useState('')
  const [nieuwCpTelefoon, setNieuwCpTelefoon] = useState('')
  const [nieuwCpFunctie, setNieuwCpFunctie] = useState('')
  const [dbContacten, setDbContacten] = useState<ContactpersoonRecord[]>([])
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
    if (project.contactpersoon_id) {
      params.set('contactpersoon_id', project.contactpersoon_id)
    }
    navigate(`/offertes/nieuw?${params.toString()}`, { state: { from: location.pathname } })
  }

  // Snelle prijsopgave vanuit de Offertes-card: maakt een concept-offerte
  // met één regel (bedrag excl. btw, 21% btw) en koppelt aan dit project.
  const handleQuickOfferte = async (bedrag: number) => {
    if (!project || !id) return
    try {
      const subtotaal = Math.round(bedrag * 100) / 100
      const btw = Math.round(subtotaal * 0.21 * 100) / 100
      const totaal = Math.round((subtotaal + btw) * 100) / 100
      const titel = project.naam || 'Offerte'
      const offerte = await createOfferte({
        klant_id: project.klant_id,
        klant_naam: klant?.bedrijfsnaam || project.klant_naam || '',
        project_id: id,
        titel,
        nummer: '',
        status: 'concept',
        subtotaal,
        btw_bedrag: btw,
        totaal,
        geldig_tot: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notities: '',
        voorwaarden: '',
      })
      await createOfferteItem({
        offerte_id: offerte.id,
        beschrijving: titel,
        aantal: 1,
        eenheidsprijs: subtotaal,
        btw_percentage: 21,
        korting_percentage: 0,
        totaal: subtotaal,
        volgorde: 0,
        soort: 'prijs',
      })
      logCreate({ user, medewerkers: alleMedewerkers, entityType: 'offerte', entityId: offerte.id })
      const offertes = await getOffertesByProject(id)
      setProjectOffertes(offertes)
      toast.success('Offerte aangemaakt', {
        action: {
          label: 'Openen',
          onClick: () => navigate(`/offertes/${offerte.id}/bewerken`, { state: { from: location.pathname } }),
        },
      })
    } catch (err) {
      logger.error('Fout bij aanmaken snelle offerte:', err)
      toast.error('Kon offerte niet aanmaken')
      throw err
    }
  }

  // Inline prijs-edit van een concept-offerte vanuit de cockpit. WYSIWYG op het
  // getoonde (incl. btw) bedrag; ex-btw + 21% wordt eruit afgeleid. Alleen voor
  // simpele 1-regel offertes — meerdere regels gaan naar de volledige editor.
  const handleUpdateOffertePrice = async (offerte: Offerte, bedragInclBtw: number) => {
    if (!id) return
    const totaal = Math.round(bedragInclBtw * 100) / 100
    const subtotaal = Math.round((totaal / 1.21) * 100) / 100
    const btw = Math.round((totaal - subtotaal) * 100) / 100
    try {
      const items = await getOfferteItems(offerte.id).catch(() => [])
      if (items.length > 1) {
        toast.info('Open de offerte om meerdere regels aan te passen')
        navigate(`/offertes/${offerte.id}/bewerken`, { state: { from: location.pathname } })
        return
      }
      await updateOfferte(offerte.id, { subtotaal, btw_bedrag: btw, totaal })
      if (items.length === 1) {
        await updateOfferteItem(items[0].id, { eenheidsprijs: subtotaal, totaal: subtotaal, aantal: 1, btw_percentage: 21 })
      } else {
        await createOfferteItem({
          offerte_id: offerte.id,
          beschrijving: offerte.titel || project?.naam || 'Prijs',
          aantal: 1,
          eenheidsprijs: subtotaal,
          btw_percentage: 21,
          korting_percentage: 0,
          totaal: subtotaal,
          volgorde: 0,
          soort: 'prijs',
        })
      }
      const offertes = await getOffertesByProject(id)
      setProjectOffertes(offertes)
      toast.success('Prijs bijgewerkt')
    } catch (err) {
      logger.error('Kon offerteprijs niet bijwerken:', err)
      toast.error('Kon prijs niet bijwerken')
      throw err
    }
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
  const [projectEmails, setProjectEmails] = useState<ProjectMail[]>([])
  const [projectMaatjes, setProjectMaatjes] = useState<Maatje[]>([])
  const [emailsLoading, setEmailsLoading] = useState(false)
  const [expandedMailId, setExpandedMailId] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)

  const handleSamenvatThread = useCallback(async () => {
    if (aiSummaryLoading || projectEmails.length === 0) return
    setAiSummaryLoading(true)
    try {
      const sorted = [...projectEmails].sort((a, b) =>
        new Date(a.datum).getTime() - new Date(b.datum).getTime(),
      )
      const text = sorted
        .map((m) => {
          const datumLabel = new Date(m.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
          const sender = (m.from_name || m.van || '').replace(/<[^>]+>/g, '').trim() || m.van
          const body = (m.body_text || (m.body_html || '').replace(/<[^>]*>/g, ' '))
            .replace(/\s+/g, ' ')
            .trim()
          return `[${datumLabel}] ${sender}\nOnderwerp: ${m.onderwerp || '(geen)'}\n${body}`
        })
        .join('\n\n---\n\n')
        .slice(0, 8000)
      const res = await callForgie('summarize-thread', text)
      if (res?.result) setAiSummary(res.result.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout'
      toast.error(`Daan kon de thread niet samenvatten: ${msg}`)
    } finally {
      setAiSummaryLoading(false)
    }
  }, [aiSummaryLoading, projectEmails])
  const [hasVisualisaties, setHasVisualisaties] = useState(false)
  const [montageDialogOpen, setMontageDialogOpen] = useState(false)
  const [editingMontageId, setEditingMontageId] = useState<string | null>(null)
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
    setEditingMontageId(null)
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

  const handleEditMontage = (m: MontageAfspraak) => {
    setEditingMontageId(m.id)
    setMontageTitel(m.titel || '')
    setMontageLocatie(m.locatie || '')
    setMontageDatum(m.datum || '')
    setMontageStartTijd(m.start_tijd || '08:00')
    setMontageEindTijd(m.eind_tijd || '17:00')
    setMontageNotities(m.notities || '')
    setMontageMonteurs(m.monteurs || [])
    setMontageBijlagen(m.bijlagen || [])
    setMontageWerkbonId(m.werkbon_id || '')
    setMontageDialogOpen(true)
  }

  const handleDeleteMontage = async (m: MontageAfspraak) => {
    const ok = await confirm({
      message: `Montage "${m.titel}" verwijderen? Dit kan niet ongedaan worden gemaakt.`,
      variant: 'destructive',
      confirmLabel: 'Verwijderen',
    })
    if (!ok) return
    try {
      await deleteMontageAfspraak(m.id)
      setProjectMontages(prev => prev.filter(x => x.id !== m.id))
      toast.success(`Montage "${m.titel}" verwijderd`)
    } catch (err) {
      logger.error('Montage verwijderen mislukt:', err)
      toast.error('Kon montage niet verwijderen')
    }
  }

  const handleSaveMontage = async () => {
    if (!montageTitel.trim()) { toast.error('Vul een titel in'); return }
    if (!montageDatum) { toast.error('Selecteer een datum'); return }
    if (!montageLocatie.trim()) { toast.error('Vul een locatie in'); return }

    try {
      setIsSavingMontage(true)
      const werkbonNummer = montageWerkbonId ? projectWerkbonnen.find(w => w.id === montageWerkbonId)?.werkbon_nummer : undefined

      if (editingMontageId) {
        const updated = await updateMontageAfspraak(editingMontageId, {
          titel: montageTitel,
          datum: montageDatum,
          start_tijd: montageStartTijd,
          eind_tijd: montageEindTijd,
          locatie: montageLocatie,
          monteurs: montageMonteurs,
          notities: montageNotities,
          werkbon_id: montageWerkbonId || undefined,
          werkbon_nummer: werkbonNummer,
          bijlagen: montageBijlagen.length > 0 ? montageBijlagen : undefined,
        })
        setProjectMontages(prev => prev.map(x => x.id === editingMontageId ? updated : x))
        setMontageDialogOpen(false)
        setEditingMontageId(null)
        toast.success('Montage bijgewerkt')
        setDirty(false)
        return
      }

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
        werkbon_nummer: werkbonNummer,
        bijlagen: montageBijlagen.length > 0 ? montageBijlagen : undefined,
        status: 'gepland',
      })
      logCreate({ user, medewerkers: alleMedewerkers, entityType: 'montage', entityId: newMontage.id })
      setProjectMontages(prev => [...prev, newMontage])
      setMontageDialogOpen(false)
      toast.success('Montage ingepland')
      setDirty(false)
    } catch (err) {
      logger.error('Kon montage niet opslaan:', err)
      toast.error(editingMontageId ? 'Kon montage niet bijwerken' : 'Kon montage niet inplannen')
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

      logCreate({ user, medewerkers: alleMedewerkers, entityType: 'project', entityId: newProject.id })

      // Kopieer taken (zonder datums / bestede tijd)
      for (const taak of projectTaken) {
        const newTaak = await createTaak({
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
        logCreate({ user, medewerkers: alleMedewerkers, entityType: 'taak', entityId: newTaak.id })
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

          // Gekoppelde email-threads (laad onafhankelijk, los van overige Promise.all)
          setEmailsLoading(true)
          getEmailsVoorProject(id)
            .then((mails) => { if (!cancelled) setProjectEmails(mails) })
            .catch(() => { /* stil — RLS kan niets opleveren */ })
            .finally(() => { if (!cancelled) setEmailsLoading(false) })

          // Check if visualisaties exist for conditional rendering
          getSigningVisualisatiesByProject(id).then(viz => {
            if (!cancelled) setHasVisualisaties(viz.length > 0)
          }).catch(() => {})

          // Gekoppelde maatjes — tab verschijnt alleen als er minstens één is
          getProjectMaatjes(id).then(m => {
            if (!cancelled) setProjectMaatjes(m)
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

  useEffect(() => {
    if (!klant?.id) { setDbContacten([]); return }
    let cancelled = false
    getContactpersonenByKlant(klant.id)
      .then((rows) => { if (!cancelled) setDbContacten(rows) })
      .catch(() => { if (!cancelled) setDbContacten([]) })
    return () => { cancelled = true }
  }, [klant?.id])

  const gemergedeContactpersonen = useMemo<Contactpersoon[]>(() => {
    const jsonbCps = klant?.contactpersonen || []
    const jsonbEmails = new Set(jsonbCps.map((c) => c.email?.toLowerCase()).filter(Boolean))
    const fromDb: Contactpersoon[] = dbContacten
      .filter((c) => !jsonbEmails.has(c.email?.toLowerCase()))
      .map((c) => ({
        id: c.id,
        naam: [c.voornaam, c.achternaam].filter(Boolean).join(' ') || c.email,
        functie: c.functie || '',
        email: c.email || '',
        telefoon: c.telefoon || '',
        is_primair: false,
      }))
    return [...jsonbCps, ...fromDb]
  }, [klant, dbContacten])

  // ── File upload handler ──
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    const orgId = await getOrgId()

    for (const file of fileArray) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
        const storagePath = orgId
          ? `projects/${orgId}/${id}/${crypto.randomUUID()}.${ext}`
          : `projects/${id}/${crypto.randomUUID()}.${ext}`
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
    toast.success(<>Link gekopieerd naar klembord<span style={{ color: '#F15025' }}>.</span></>)
  }

  const recenteActiviteiten = useMemo(
    () => project ? buildActivityFeed(project, projectOffertes, projectMontages, projectWerkbonnen, projectFacturen, projectTaken, projectFotos, auditEntries, alleMedewerkers) : [],
    [project, projectOffertes, projectMontages, projectWerkbonnen, projectFacturen, projectTaken, projectFotos, auditEntries, alleMedewerkers]
  )

  // Audit-events laden ná de initiële page-load. Stable deps via .join(',')
  // op de id-arrays zodat we niet refetchen bij elke React-rerender — alleen
  // wanneer er een entity is bijgekomen of weggegaan.
  const offerteIdsKey = useMemo(() => projectOffertes.map(o => o.id).join(','), [projectOffertes])
  const werkbonIdsKey = useMemo(() => projectWerkbonnen.map(w => w.id).join(','), [projectWerkbonnen])
  const factuurIdsKey = useMemo(() => projectFacturen.map(f => f.id).join(','), [projectFacturen])
  const taakIdsKey = useMemo(() => projectTaken.map(t => t.id).join(','), [projectTaken])

  useEffect(() => {
    if (!id || isLoading) return
    let cancelled = false
    const offerteIds = offerteIdsKey ? offerteIdsKey.split(',') : []
    const werkbonIds = werkbonIdsKey ? werkbonIdsKey.split(',') : []
    const factuurIds = factuurIdsKey ? factuurIdsKey.split(',') : []
    const taakIds = taakIdsKey ? taakIdsKey.split(',') : []
    getAuditLogForProject(id, { offerteIds, werkbonIds, factuurIds, taakIds })
      .then((entries) => { if (!cancelled) setAuditEntries(entries) })
      .catch(() => { /* fire-and-forget — feed valt terug op derived events */ })
    return () => { cancelled = true }
  }, [id, isLoading, offerteIdsKey, werkbonIdsKey, factuurIdsKey, taakIdsKey])

  if (isLoading) {
    return <ProjectDetailSkeleton />
  }

  if (!project) {
    return (
      <div className="h-[calc(100dvh-122px)] flex flex-col items-center justify-center bg-background">
        <p className="text-lg font-semibold text-foreground">Project niet gevonden</p>
        <p className="text-sm text-muted-foreground mt-1">Het project met ID "{id}" bestaat niet.</p>
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
        const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
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

  // Primaire actie + overflow-menu. Desktop toont deze zwevend rechtsboven,
  // mobiel inline in de header — zelfde knoppen, geen duplicatie van logica.
  const projectActieKnoppen = (
    <>
      {(() => {
        const activeOfferte = projectOffertes.find(o => !['afgewezen', 'verlopen', 'gefactureerd'].includes(o.status)) || projectOffertes[0]
        if (!activeOfferte) {
          // In de factureer-fase (Gedaan / te-factureren) is de logische
          // volgende stap een factuur, niet nog een offerte.
          const factureerFase = ['afgerond', 'te-factureren', 'gefactureerd'].includes(project.status)
          if (factureerFase) {
            return (
              <button
                onClick={() => {
                  const params = new URLSearchParams({ klant_id: project.klant_id || '', project_id: id || '', titel: project.naam || '' })
                  navigate(`/facturen/nieuw?${params.toString()}`, { state: { from: location.pathname } })
                }}
                className="btn-primary-flame"
              >
                <Receipt className="h-3.5 w-3.5" />
                Factuur maken
              </button>
            )
          }
          return (
            <button onClick={openNieuweOfferte} className="btn-primary-flame">
              <Pencil className="h-3.5 w-3.5" />
              Offerte maken
            </button>
          )
        }
        const isGefactureerd = !!activeOfferte.geconverteerd_naar_factuur_id
        return (
          <>
            <button
              onClick={() => navigate(`/offertes/${activeOfferte.id}/bewerken`, { state: { from: location.pathname } })}
              className="btn-primary-flame"
            >
              <Pencil className="h-3.5 w-3.5" />
              Offerte bewerken
            </button>
            <button
              onClick={() => handleCreateFactuurFromOfferte(activeOfferte)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#1A535C]/30 bg-card text-[#1A535C] hover:bg-[#1A535C] hover:text-white transition-colors text-[13px] font-medium"
              title={isGefactureerd ? `Factuur openen` : 'Factuur maken van deze offerte'}
            >
              <Receipt className="h-3.5 w-3.5" />
              {isGefactureerd ? 'Factuur' : 'Maak factuur'}
            </button>
          </>
        )
      })()}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center text-foreground/70 hover:bg-[var(--cream-bg)] hover:text-foreground transition-colors">
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
              const oudeStatus = project.status
              const updated = await updateProject(id!, { status: 'afgerond' })
              setProject(updated)
              if (user?.id) {
                const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
                logWijziging({ userId: user.id, entityType: 'project', entityId: id!, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: oudeStatus, nieuweWaarde: 'afgerond' })
              }
              toast.success('Project gearchiveerd')
            } catch (err) { logger.error('Kon project niet archiveren:', err); toast.error('Kon project niet archiveren') }
          }}>
            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
            Archiveren
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  return (
    <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 bg-background">

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

      {/* Mobile floating camera button — clears MobileBottomNav (h-14) */}
      <div className="fixed right-4 z-40 md:hidden bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)]">
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

      {/* ══════════ CONTENT AREA — scrolls with main, no inner scroll ══════════ */}
      <div ref={scrollAreaRef}>

      {/* ══════════ HEADER + TABS ══════════ */}
      <div className="px-4 md:px-8 pt-4 md:pt-5">

        {/* Row 0: breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px] mb-2">
          {(() => {
            const fromPath = (location.state as { from?: string } | null)?.from
            const fromLabel = fromPath
              ? fromPath.startsWith('/klanten/') ? 'Klant'
              : fromPath.startsWith('/offertes/') ? 'Offerte'
              : fromPath.startsWith('/facturen/') ? 'Factuur'
              : fromPath.startsWith('/werkbonnen/') ? 'Werkbon'
              : fromPath === '/klanten' ? 'Klanten'
              : fromPath === '/offertes' ? 'Offertes'
              : fromPath === '/facturen' ? 'Facturen'
              : fromPath === '/werkbonnen' ? 'Werkbonnen'
              : fromPath === '/taken' ? 'Taken'
              : 'Projecten'
              : 'Projecten'
            const handleBack = () => {
              if (fromPath) navigate(fromPath)
              else if (window.history.length > 2 && location.key !== 'default') navigate(-1)
              else navigate('/projecten')
            }
            return (
              <button
                type="button"
                onClick={handleBack}
                className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A535C] dark:text-petrol-light rounded-lg px-2 py-1 -ml-1.5 hover:bg-[rgba(26,83,92,0.08)] dark:hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-[#F15025] group-hover:-translate-x-0.5 transition-transform" />
                {fromLabel}
              </button>
            )
          })()}
          <span className="text-muted-foreground/70">·</span>
          <span className="font-mono text-[11px] font-medium text-foreground/70 bg-[rgba(26,83,92,0.05)] dark:bg-white/[0.05] border border-[rgba(26,83,92,0.08)] dark:border-white/10 rounded-md px-1.5 py-0.5">
            {project.project_nummer || `PRJ-${id?.slice(0, 8).toUpperCase()}`}
          </span>
        </div>

        {/* Row 1: H1 + status pill */}
        <div className="flex items-baseline gap-4 min-w-0 flex-wrap">
          {editingNaam ? (
            <input
              autoFocus
              value={naamDraft}
              onChange={(e) => setNaamDraft(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={async () => {
                const trimmed = naamDraft.trim()
                if (!trimmed || trimmed === project.naam) {
                  setEditingNaam(false)
                  return
                }
                try {
                  const updated = await updateProject(id!, { naam: trimmed })
                  setProject(updated)
                  toast.success('Projectnaam gewijzigd')
                } catch (err) {
                  logger.error('updateProject naam:', err)
                  toast.error('Kon naam niet wijzigen')
                } finally {
                  setEditingNaam(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
                if (e.key === 'Escape') { setNaamDraft(project.naam); setEditingNaam(false) }
              }}
              className="text-[32px] font-extrabold text-foreground tracking-[-0.5px] leading-none flex-1 min-w-0"
              style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', padding: 0, margin: 0, caretColor: '#F15025' }}
            />
          ) : (
            <h1
              onClick={() => { setNaamDraft(project.naam); setEditingNaam(true) }}
              title="Klik om te wijzigen"
              className="text-[32px] font-extrabold text-foreground truncate tracking-[-0.5px] leading-none cursor-text"
            >
              {project.naam}<span className="text-[#F15025]">.</span>
            </h1>
          )}

          {/* Status verwijderd uit header — al wijzigbaar via de
              Voortgang-strip in het Overzicht-tab. */}
        </div>

        {/* Row 2: subline — klant · plaats + datum-hint */}
        <div className="mt-2 text-[13.5px] flex items-center gap-2 flex-wrap">
          {klant && (
            <Link to={`/klanten/${klant.id}`} className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-[#1A535C] transition-colors">
              <span className="font-semibold">{klant.bedrijfsnaam || klant.contactpersoon}</span>
              {klant.stad && <span className="text-muted-foreground font-normal"> · {klant.stad}</span>}
            </Link>
          )}
          {project.created_at && (
            <>
              <span className="text-muted-foreground/70">·</span>
              <span
                className="text-[12.5px] text-muted-foreground"
                style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
              >
                aangemaakt {new Date(project.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </>
          )}
          <span className="text-muted-foreground/70">·</span>
          <DatePicker
            value={project.eind_datum}
            onChange={async (d) => {
              try {
                const updated = await updateProject(id!, { eind_datum: d || undefined })
                setProject(updated)
                toast.success('Deadline ingesteld')
              } catch (err) {
                logger.error('updateProject eind_datum:', err)
                toast.error('Kon deadline niet wijzigen')
              }
            }}
            align="start"
            trigger={
              <button className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-[#1A535C] transition-colors" title="Deadline instellen">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                {project.eind_datum
                  ? <span className="font-medium text-foreground/80">deadline {new Date(project.eind_datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                  : <span className="text-muted-foreground/60">+ deadline</span>}
              </button>
            }
          />
        </div>

        {/* Row 3: acties — mobiel inline (desktop toont ze zwevend rechtsboven) */}
        <div className="md:hidden mt-4 flex flex-wrap items-center gap-2">
          {projectActieKnoppen}
        </div>

        {/* TAB BAR — flame underline, duotone icoon per tab */}
        <div className="flex items-center gap-1 border-b border-border mt-5 sticky top-0 z-10 bg-background">
          {([
            { key: 'overzicht' as ProjectTab,  label: 'Overzicht',  count: 0,                          Icon: TabList    },
            { key: 'werkbon' as ProjectTab,    label: 'Werkbon',    count: projectWerkbonnen.length,   Icon: TabWrench  },
            { key: 'financieel' as ProjectTab, label: 'Financieel', count: projectFacturen.length,     Icon: TabEuro    },
            { key: 'email' as ProjectTab,      label: 'E-mail',     count: projectEmails.length,       Icon: TabMail    },
            { key: 'notities' as ProjectTab,   label: 'Notities',   count: 0,                          Icon: TabPenLine },
            ...(projectMaatjes.length > 0
              ? [{ key: 'maatjes' as ProjectTab, label: 'Maatjes', count: projectMaatjes.length, Icon: TabRuler }]
              : []),
          ]).map((tab) => {
            const TabIcon = tab.Icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'relative inline-flex items-center gap-2 px-3.5 py-2.5 text-[14px] rounded-t-lg transition-all duration-200 -mb-px',
                  isActive
                    ? 'text-[#1A535C] dark:text-foreground font-bold bg-[#1A535C]/[0.05] dark:bg-white/[0.05]'
                    : 'text-foreground/55 font-medium hover:text-foreground hover:bg-foreground/[0.035]'
                )}
              >
                <TabIcon className="h-4 w-4 flex-shrink-0 transition-colors" strokeWidth={isActive ? 2.1 : 1.75} />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    'font-mono text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums transition-colors',
                    isActive
                      ? 'bg-[#1A535C] text-white'
                      : 'bg-[rgba(26,83,92,0.08)] dark:bg-white/[0.06] text-foreground/70'
                  )}>{tab.count}</span>
                )}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] rounded-t-full bg-[#F15025]"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════ OVERZICHT TAB ══════════ */}
      {activeTab === 'overzicht' && (
      <div>
      <div className="flex flex-col lg:flex-row gap-6 md:gap-8 px-4 md:px-8 py-4 md:py-8">

        {/* ── Left column (65%) ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Mail-composer (inline, opens when "Mail contactpersoon" geklikt) */}
          <ProjectMailComposer
            ref={mailComposerRef}
            project={project}
            klant={klant}
            contactpersoon={project.contactpersoon_id
              ? gemergedeContactpersonen.find((c) => c.id === project.contactpersoon_id) || null
              : null}
            userId={user?.id}
            medewerkerNaam={medewerkers.find((m) => m.user_id === user?.id)?.naam}
            open={mailComposerOpen}
            onOpenChange={setMailComposerOpen}
          />

          {/* Fase indicator */}
          <ProjectFaseBar
            status={project.status}
            totaalBedrag={totaalBedrag}
            deadline={project.eind_datum}
            onStatusChange={async (newStatus) => {
              try {
                const oudeStatus = project.status
                const updated = await updateProject(id!, { status: newStatus })
                setProject(updated)
                if (user?.id) {
                  const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
                  logWijziging({ userId: user.id, entityType: 'project', entityId: id!, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: oudeStatus, nieuweWaarde: newStatus })
                }
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
            montageAfspraken={projectMontages}
            medewerkers={alleMedewerkers}
            projectId={id!}
            onMontageEdit={handleEditMontage}
            onMontageDelete={handleDeleteMontage}
            onNewTaak={() => setNieuweTaakOpen(true)}
            onNewOfferte={openNieuweOfferte}
            onQuickOfferte={handleQuickOfferte}
            onUpdateOffertePrice={handleUpdateOffertePrice}
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
            onTaakDelete={async (taak) => {
              const ok = await confirm({
                message: `Taak "${taak.titel}" verwijderen? Dit kan niet ongedaan worden gemaakt.`,
                variant: 'destructive',
                confirmLabel: 'Verwijderen',
              })
              if (!ok) return
              try {
                await deleteTaak(taak.id)
                setProjectTaken((prev) => prev.filter((t) => t.id !== taak.id))
                toast.success(`Taak "${taak.titel}" verwijderd`)
              } catch (err) {
                logger.error('Taak verwijderen mislukt:', err)
                toast.error('Kon taak niet verwijderen')
              }
            }}
            onOpdrachtbevestiging={(offerte) => setObPreviewOfferte(offerte)}
            onOfferteDelete={async (offerte) => {
              const ok = await confirm({
                message: `Offerte ${offerte.nummer} verwijderen? Dit kan niet ongedaan worden gemaakt.`,
                variant: 'destructive',
                confirmLabel: 'Verwijderen',
              })
              if (!ok) return
              try {
                await deleteOfferte(offerte.id)
                setProjectOffertes((prev) => prev.filter((o) => o.id !== offerte.id))
                toast.success(`Offerte ${offerte.nummer} verwijderd`)
              } catch (err) {
                logger.error('Offerte verwijderen mislukt:', err)
                toast.error('Kon offerte niet verwijderen')
              }
            }}
          />

          {/* Activiteit */}
          <ActiviteitCard events={recenteActiviteiten} />

          {/* Portaal — één compact-strip voor actieve én niet-actieve state */}
          <PortaalCompactBlock projectId={id!} />

          {/* Verzonden emails */}
          {(() => {
            const verzonden = projectOffertes.filter(o => o.verstuurd_op && o.verstuurd_naar)
            if (verzonden.length === 0) return null
            return (
              <div className="doen-slate-surface rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Send className="h-4 w-4 text-[#1A535C] dark:text-petrol-light" strokeWidth={1.75} />
                  <h3 className="font-heading text-[15px] font-bold text-foreground">
                    Verzonden<span className="text-[#F15025]">.</span>
                  </h3>
                  <span className="font-mono text-[10px] font-semibold bg-[rgba(26,83,92,0.08)] dark:bg-white/[0.06] text-[#1A535C] dark:text-petrol-light rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums">{verzonden.length}</span>
                </div>
                <div className="space-y-1">
                  {verzonden.slice(0, 5).map((o) => (
                    <div key={`email-${o.id}`} className="flex items-center gap-3 text-[12.5px] px-2 py-2 rounded-lg hover:bg-card/60 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--status-blue-bg))] border border-[#3A5A9A]/20 flex items-center justify-center flex-shrink-0">
                        <Send className="h-3 w-3 text-[#3A5A9A]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground truncate">Offerte {o.nummer}</div>
                        <div className="text-foreground/70 truncate text-[11.5px]">
                          {o.verstuurd_naar}
                          <span className="text-muted-foreground/70"> · </span>
                          <span className="font-mono">{new Date(o.verstuurd_op!).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

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
              <div className="doen-slate-surface rounded-2xl p-4 flex items-center justify-between gap-4 doen-slate-surface-active">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#F15025] doen-pulse flex-shrink-0" aria-hidden />
                  <span
                    className="text-[13.5px] text-foreground font-medium"
                  >
                    {suggestion.text}
                  </span>
                </div>
                <button
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[#F15025] text-white px-4 py-2 rounded-xl shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 flex-shrink-0"
                  onClick={suggestion.action}
                >
                  Doen<span>.</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })()}

        </div>

        {/* ── Right column (sidebar, 35%) ── */}
        <div className="w-full lg:w-[300px] xl:w-[320px] flex-shrink-0 space-y-4 lg:self-start lg:sticky lg:top-20">

          {klant && (
            <KlantCard
              klant={klant}
              project={project}
              contactpersonen={gemergedeContactpersonen}
              onContactpersoonChange={async (cpId) => {
                const updated = await updateProject(id!, { contactpersoon_id: cpId || undefined })
                setProject(updated)
              }}
              onContactpersoonAdd={async (cp) => {
                const updatedCps = [...(klant.contactpersonen || []), cp]
                await updateKlant(klant.id, { contactpersonen: updatedCps })
                setKlant({ ...klant, contactpersonen: updatedCps })
                const updated = await updateProject(id!, { contactpersoon_id: cp.id })
                setProject(updated)
              }}
              onContactpersoonEdit={async (cp) => {
                const inJsonb = (klant.contactpersonen || []).some((c) => c.id === cp.id)
                if (inJsonb) {
                  const updatedCps = (klant.contactpersonen || []).map((c) => (c.id === cp.id ? { ...c, ...cp } : c))
                  await updateKlant(klant.id, { contactpersonen: updatedCps })
                  setKlant({ ...klant, contactpersonen: updatedCps })
                } else {
                  // DB-record uit contactpersonen-tabel — split naam best-effort
                  const parts = cp.naam.trim().split(/\s+/)
                  const voornaam = parts[0] || ''
                  const achternaam = parts.slice(1).join(' ')
                  await updateContactpersoonDB(cp.id, {
                    voornaam,
                    achternaam,
                    email: cp.email,
                    telefoon: cp.telefoon,
                    functie: cp.functie,
                  })
                  setDbContacten((prev) => prev.map((r) =>
                    r.id === cp.id
                      ? { ...r, voornaam, achternaam, email: cp.email, telefoon: cp.telefoon, functie: cp.functie }
                      : r,
                  ))
                }
              }}
              onEditKlant={() => setEditKlantOpen(true)}
              onMail={() => {
                setMailComposerOpen(true)
                setTimeout(() => mailComposerRef.current?.scrollIntoView(), 80)
              }}
            />
          )}

          <TeamCard
            teamLeden={project.team_leden || []}
            medewerkers={alleMedewerkers}
            onChange={async (ids) => {
              try {
                const updated = await updateProject(id!, { team_leden: ids })
                setProject(updated)
              } catch (err) {
                logger.error('updateProject team_leden:', err)
                toast.error('Kon team niet bijwerken')
              }
            }}
          />

          <ActiesCard
            onOfferte={openNieuweOfferte}
            onWerkbon={() => setShowWerkbonDialog(true)}
            onMontage={handleOpenMontageDialog}
            onFactuur={() => {
              const params = new URLSearchParams({ klant_id: project.klant_id || '', project_id: id || '', titel: project.naam || '' })
              navigate(`/facturen/nieuw?${params.toString()}`, { state: { from: location.pathname } })
            }}
            onPakbon={() => setShowPakbonDialog(true)}
            onBevestiging={() => setShowObOfferteSelect(s => !s)}
          />

          {/* Opdrachtbevestiging — uitklap onder Acties */}
          {showObOfferteSelect && (
            <div className="rounded-xl bg-card shadow-[0_1px_3px_rgba(130,100,60,0.04)] overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h4 className="text-[11px] font-semibold text-foreground/70 uppercase tracking-[0.08em]">Kies offerte voor bevestiging</h4>
              </div>
              {projectOffertes.length === 0 ? (
                <p className="text-[12px] text-muted-foreground text-center py-6">Maak eerst een offerte</p>
              ) : (
                <div>
                  {projectOffertes.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => { setObPreviewOfferte(o); setShowObOfferteSelect(false) }}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--cream-bg)] transition-colors text-left border-b border-border last:border-0"
                    >
                      <span className="text-[13px] font-medium text-foreground truncate">{o.titel || o.nummer}</span>
                      <span className="font-mono text-[11px] text-muted-foreground ml-2 flex-shrink-0">{o.nummer}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bestanden — eigen card-shell */}
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

          {/* Situatiefoto's — eigen card-shell (Pad B shell-tweaks toegepast) */}
          <ProjectPhotoGallery
            projectId={id!}
            userId={user?.id || ''}
            photos={projectFotos}
            onPhotosChanged={fetchProjectFotos}
          />

          {/* Visualisaties (conditioneel, behouden) */}
          {hasVisualisaties && (
            <div>
              <h3 className="text-[11px] font-semibold text-foreground/70 uppercase tracking-[0.08em] mb-3">Studio</h3>
              <VisualisatieGallery project_id={project.id} klant_id={project.klant_id} compact />
            </div>
          )}

        </div>
      </div>
      </div>
      )}

      {/* ══════════ WERKBON TAB ══════════ */}
      {activeTab === 'werkbon' && (
      <div className="px-4 md:px-8 py-4 md:py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground tracking-[-0.3px]">Werkbonnen</h2>
          <button
            onClick={() => setShowWerkbonDialog(true)}
            className="text-sm text-[#F15025] font-medium hover:underline"
          >
            + Nieuwe werkbon
          </button>
        </div>
        {projectWerkbonnen.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Nog geen werkbonnen</p>
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
                  className="group bg-card rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all"
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
                              .then(() => { setProjectWerkbonnen(prev => prev.filter(w => w.id !== wb.id)); toast.success(<>Werkbon verwijderd<span style={{ color: '#F15025' }}>.</span></>) })
                              .catch(() => toast.error('Kon werkbon niet verwijderen'))
                          }
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:text-[#C03A18] transition-colors opacity-0 group-hover:opacity-100"
                        title="Verwijderen"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{wb.titel || wb.werkbon_nummer}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{wb.werkbon_nummer}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-mono text-muted-foreground">{new Date(wb.datum).toLocaleDateString('nl-NL')}</span>
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
      <div className="px-4 md:px-8 py-4 md:py-6 space-y-8">
        {/* Totalen overzicht */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Geoffreerd', bedrag: projectOffertes.reduce((s, o) => s + o.totaal, 0), accent: '#1A535C' },
            { label: 'Gefactureerd', bedrag: projectFacturen.reduce((s, f) => s + f.totaal, 0), accent: '#3A5A9A' },
            { label: 'Betaald', bedrag: projectFacturen.reduce((s, f) => s + (f.betaald_bedrag || 0), 0), accent: '#2D6B48' },
            { label: 'Openstaand', bedrag: projectFacturen.reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0), accent: '#C0451A' },
          ].map((item) => (
            <div key={item.label} className="bg-card rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="h-1" style={{ backgroundColor: item.accent }} />
              <div className="p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: item.accent + 'AA' }}>{item.label}</p>
                <p className="text-xl font-bold font-mono text-foreground">
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
            <div className="bg-card rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="h-1 bg-[#C0451A]" />
              <div className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[#C03A18]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {bs.niveau === 'overschreden'
                      ? `Budget overschreden: ${bs.percentage.toFixed(0)}%`
                      : `Budget waarschuwing: ${bs.percentage.toFixed(0)}% verbruikt`}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
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
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Offertes</h3>
              <button onClick={openNieuweOfferte} className="text-sm text-[#F15025] font-medium hover:underline">+ Nieuwe offerte</button>
            </div>
            <div className="space-y-3">
              {projectOffertes.map((offerte) => {
                const linkedFactuur = offerteFactuurMap[offerte.id]
                const offerteStatusLabel = offerte.status === 'concept' ? 'Concept' : offerte.status === 'verzonden' ? 'Verzonden' : offerte.status === 'goedgekeurd' ? 'Goedgekeurd' : offerte.status === 'afgewezen' ? 'Afgewezen' : offerte.status === 'gefactureerd' ? 'Gefactureerd' : offerte.status
                const isStalled = (offerte.status === 'verzonden' || offerte.status === 'bekeken') && offerte.verstuurd_op && Math.floor((Date.now() - new Date(offerte.verstuurd_op).getTime()) / 86400000) > 14
                const accentColor = isStalled ? '#D4621A' : offerte.status === 'goedgekeurd' || offerte.status === 'gefactureerd' ? '#2D6B48' : offerte.status === 'afgewezen' ? '#C0451A' : '#F15025'
                return (
                  <div key={offerte.id} className="bg-card rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                    <div className="h-1" style={{ backgroundColor: accentColor }} />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{offerte.titel}</p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{offerte.nummer}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-mono font-semibold text-foreground">{formatCurrency(offerte.totaal)}</p>
                          <span className="text-xs" style={{ color: accentColor }}>
                            {offerteStatusLabel}<span className="text-[#F15025]">.</span>
                          </span>
                        </div>
                      </div>
                      {(offerte.status === 'verzonden' || offerte.status === 'bekeken') && offerte.verstuurd_op && (() => {
                        const days = Math.floor((Date.now() - new Date(offerte.verstuurd_op).getTime()) / 86400000)
                        return (
                          <div className={`flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg text-xs ${days > 7 ? 'bg-[hsl(var(--status-amber-bg))]' : 'bg-background'}`}>
                            <span className="flex items-center gap-1 font-mono font-semibold">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {days}d open
                            </span>
                            <span className="text-[#EBEBEB]">·</span>
                            {offerte.opvolging_actief !== false ? (
                              <span className="flex items-center gap-1 text-[#2D6B48]">
                                <Bell className="w-3 h-3" /> Opvolging actief
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <BellOff className="w-3 h-3" /> Gepauzeerd
                              </span>
                            )}
                          </div>
                        )
                      })()}
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
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
                            className="text-sm font-medium text-[#2D6B48] hover:underline"
                          >
                            Factureren
                          </button>
                        )}
                        {!offerte.geconverteerd_naar_factuur_id && (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                message: `Offerte ${offerte.nummer} verwijderen? Dit kan niet ongedaan worden gemaakt.`,
                                variant: 'destructive',
                                confirmLabel: 'Verwijderen',
                              })
                              if (!ok) return
                              try {
                                await deleteOfferte(offerte.id)
                                setProjectOffertes((prev) => prev.filter((o) => o.id !== offerte.id))
                                toast.success(`Offerte ${offerte.nummer} verwijderd`)
                              } catch (err) {
                                logger.error('Offerte verwijderen mislukt:', err)
                                toast.error('Kon offerte niet verwijderen')
                              }
                            }}
                            className="ml-auto inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground/70 hover:bg-[hsl(var(--status-flame-bg))] hover:text-[#C03A18] transition-colors"
                            title={`Offerte ${offerte.nummer} verwijderen`}
                            aria-label={`Offerte ${offerte.nummer} verwijderen`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {offerte.geconverteerd_naar_factuur_id && linkedFactuur && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-foreground/70">
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
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Facturen</h3>
            <div className="space-y-3">
              {projectFacturen.map((factuur) => {
                const factuurStatusLabel = factuur.status === 'betaald' ? 'Betaald' : factuur.status === 'verzonden' ? 'Verzonden' : factuur.status === 'vervallen' ? 'Verlopen' : factuur.status
                const accentColor = factuur.status === 'betaald' ? '#2D6B48' : factuur.status === 'vervallen' ? '#C0451A' : '#3A5A9A'
                return (
                  <div key={factuur.id}
                    className="bg-card rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all"
                    onClick={() => navigate(`/facturen/${factuur.id}`, { state: { from: location.pathname } })}
                  >
                    <div className="h-1" style={{ backgroundColor: accentColor }} />
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-mono font-medium text-foreground">{factuur.nummer}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{new Date(factuur.factuurdatum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-semibold text-foreground">{formatCurrency(factuur.totaal)}</p>
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
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Uitgaven</h3>
            <div className="space-y-3">
              {projectUitgaven.map((uitgave) => {
                const uitgaveStatusLabel = uitgave.status === 'betaald' ? 'Betaald' : uitgave.status === 'verlopen' ? 'Verlopen' : 'Open'
                const accentColor = uitgave.status === 'betaald' ? '#2D6B48' : uitgave.status === 'verlopen' ? '#C0451A' : '#8A7A4A'
                return (
                  <div key={uitgave.id}
                    className="bg-card rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all"
                    onClick={() => navigate('/uitgaven')}
                  >
                    <div className="h-1" style={{ backgroundColor: accentColor }} />
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-mono font-medium text-foreground">{uitgave.uitgave_nummer}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{new Date(uitgave.datum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-semibold text-foreground">{formatCurrency(uitgave.bedrag_incl_btw)}</p>
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

      {/* ══════════ E-MAIL TAB ══════════
          Alle e-mailthreads die aan dit project gekoppeld zijn (via de
          read-sidebar of compose-sidebar). Eén rij per mail, klikken
          opent de body inline zodat het team de communicatie hier
          kan lezen zonder naar de email-module te schakelen. */}
      {activeTab === 'email' && (
      <div className="px-4 md:px-8 py-4 md:py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground tracking-[-0.3px]">E-mailcommunicatie</h2>
        </div>

        {/* Daan-samenvatting bovenin — vat hele thread samen vanuit project-perspectief */}
        {projectEmails.length > 0 && !emailsLoading && (
          <div className="mb-5 rounded-xl border border-[#1A535C]/15 bg-gradient-to-br from-[#1A535C]/[0.04] to-[#F15025]/[0.03] p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-card shadow-sm flex items-center justify-center flex-shrink-0">
                {aiSummaryLoading ? (
                  <Loader2 className="h-4 w-4 text-[#F15025] animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-[#F15025]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-foreground">
                    Daan
                    <span className="text-[10px] font-normal text-muted-foreground ml-1.5 uppercase tracking-[0.06em]">
                      Projectsamenvatting
                    </span>
                  </span>
                  {aiSummary && !aiSummaryLoading && (
                    <button
                      type="button"
                      onClick={handleSamenvatThread}
                      className="text-[11px] text-[#1A535C] hover:text-[#0F3C44] inline-flex items-center gap-1 transition-colors"
                      title="Opnieuw samenvatten"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Opnieuw
                    </button>
                  )}
                </div>
                {aiSummaryLoading ? (
                  <p className="text-[13px] text-foreground/70">
                    Daan analyseert {projectEmails.length} bericht{projectEmails.length === 1 ? '' : 'en'}.
                  </p>
                ) : aiSummary ? (
                  <div className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {aiSummary}
                  </div>
                ) : (
                  <div>
                    <p className="text-[12px] text-foreground/70 mb-2">
                      Laat Daan deze {projectEmails.length} bericht{projectEmails.length === 1 ? '' : 'en'} samenvatten — afspraken, openstaande vragen en status in één blik.
                    </p>
                    <button
                      type="button"
                      onClick={handleSamenvatThread}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A535C] text-white text-[12px] font-medium hover:bg-[#0F3C44] transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Samenvatten
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {emailsLoading ? (
          <p className="text-[13px] text-muted-foreground">Laden.</p>
        ) : projectEmails.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <TabMail className="mx-auto text-muted-foreground/80 mb-2 h-7 w-7" strokeWidth={1.5} />
            <p className="text-[13px] text-foreground/70">Nog geen e-mails gekoppeld aan dit project.</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Open een mail in de mail-module, kies "Koppel aan project" in de zijbalk en selecteer dit project.
            </p>
          </div>
        ) : (
          <div className="doen-panel rounded-xl divide-y divide-border overflow-hidden">
            {projectEmails.map((mail) => {
              const senderLabel = (mail.from_name || mail.van || '').replace(/<[^>]+>/g, '').trim() || mail.van
              const preview = (mail.body_text || '').replace(/\s+/g, ' ').trim().slice(0, 140)
              const isExpanded = expandedMailId === mail.id
              const bodyHtml = mail.body_html ? sanitizeEmailHTML(mail.body_html) : ''
              return (
                <div key={mail.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedMailId(isExpanded ? null : mail.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-background transition-colors duration-150 flex items-start gap-3',
                      isExpanded && 'bg-background',
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1A535C]/[0.06] flex items-center justify-center flex-shrink-0">
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-[#1A535C] transition-transform duration-150',
                          !isExpanded && '-rotate-90',
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn('text-[13px] text-foreground truncate', !mail.gelezen && 'font-semibold')}>
                          {senderLabel}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap ml-auto flex-shrink-0">
                          {new Date(mail.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="text-[13px] text-[#3A3A36] truncate">{mail.onderwerp || '(geen onderwerp)'}</div>
                      {!isExpanded && preview && (
                        <div className="text-[12px] text-muted-foreground truncate mt-0.5">{preview}</div>
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-5 pt-1 bg-background">
                      <div className="ml-12 mr-2 text-[11px] text-muted-foreground mb-3">
                        van {mail.van}  ·  aan {mail.aan}
                      </div>
                      {bodyHtml ? (
                        <div
                          className="ml-12 mr-2 text-[13px] text-foreground leading-relaxed prose prose-sm max-w-none [&_a]:text-[#1A535C] [&_a]:underline"
                          dangerouslySetInnerHTML={{ __html: bodyHtml }}
                        />
                      ) : mail.body_text ? (
                        <pre className="ml-12 mr-2 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                          {mail.body_text}
                        </pre>
                      ) : (
                        <p className="ml-12 mr-2 text-[12px] text-muted-foreground italic">
                          Geen body opgeslagen — open de mail in de e-mailmodule om te lezen.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* ══════════ NOTITIES TAB ══════════ */}
      {activeTab === 'notities' && (
      <div className="px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground tracking-[-0.3px]">Notities</h2>
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
            className="resize-y bg-background rounded-lg p-4 border-none focus:ring-1 focus:ring-[#1A535C]/20 transition-colors text-sm leading-relaxed"
          />
          {project.updated_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Laatst gewijzigd: <span className="font-mono">{formatDate(project.updated_at)}</span>
            </p>
          )}
        </div>
      </div>
      )}

      {activeTab === 'maatjes' && (
        <ProjectMaatjesTab projectId={id!} />
      )}

      </div>
      {/* ══════════ /SCROLL AREA ══════════ */}

      {/* ══════════ ACTIES — desktop: zwevend rechtsboven, glass bij scroll ══════════ */}
      {/* Mobiel worden dezelfde knoppen inline in de header getoond (zie Row 3). */}
      <div
        className={cn(
          "hidden md:flex absolute top-4 right-6 z-20 items-center gap-2 rounded-xl transition-all",
          scrolled && "bg-card/70 backdrop-blur-md border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-2 py-1.5"
        )}
      >
        {projectActieKnoppen}
      </div>

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

      {/* Klant bewerken dialog */}
      {klant && (
        <AddEditClient
          open={editKlantOpen}
          onOpenChange={setEditKlantOpen}
          klant={klant}
          onSaved={(updated) => { setKlant(updated); setEditKlantOpen(false) }}
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

      {/* Nieuwe taak dialog — zelfde stijl als /taken edit-dialog */}
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
        <DialogContent className="sm:max-w-[540px] p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="sr-only"><DialogTitle>Nieuwe taak</DialogTitle></DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Titel als inline groot input */}
            <div className="px-7 pt-7 pb-2 flex items-start justify-between gap-3">
              <Input
                autoFocus
                value={nieuweTaakTitel}
                onChange={(e) => setNieuweTaakTitel(e.target.value)}
                placeholder="Titel van de taak"
                className="border-0 shadow-none px-0 h-auto py-0 bg-transparent text-[20px] font-bold text-foreground placeholder:text-muted-foreground placeholder:font-medium focus-visible:ring-0 tracking-[-0.3px] flex-1 min-w-0"
              />
            </div>

            {/* Toewijzen — avatar-bolletjes */}
            <div className="px-7 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Toewijzen aan</p>
              <div className="flex flex-wrap gap-1.5">
                {alleMedewerkers.filter((m) => m.status === 'actief').map((mw) => {
                  const selected = nieuweTaakToegewezen === mw.naam
                  const c = mw.naam.charCodeAt(0) % 5
                  const colors = [
                    'bg-[hsl(var(--status-green-bg))] text-[#3A7D52]',
                    'bg-[hsl(var(--status-blue-bg))] text-[#3A5A9A]',
                    'bg-[hsl(var(--status-amber-bg))] text-[#8A7A4A]',
                    'bg-muted text-foreground/70',
                    'bg-[hsl(var(--status-violet-bg))] text-[#6A5A8A]',
                  ]
                  return (
                    <button
                      key={mw.id}
                      type="button"
                      onClick={() => setNieuweTaakToegewezen(selected ? '' : mw.naam)}
                      className={cn(
                        'inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[12px] font-medium transition-all border',
                        selected
                          ? 'border-[#1A535C] bg-[#1A535C]/[0.08] text-[#1A535C]'
                          : 'border-transparent bg-background text-foreground/70 hover:bg-muted'
                      )}
                    >
                      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold uppercase flex-shrink-0', colors[c])}>
                        {mw.naam.charAt(0)}
                      </span>
                      {mw.naam.split(' ')[0]}
                    </button>
                  )
                })}
                {alleMedewerkers.filter((m) => m.status === 'actief').length === 0 && (
                  <span
                    className="text-[12px] text-muted-foreground"
                    style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                  >
                    geen medewerkers beschikbaar
                  </span>
                )}
              </div>
            </div>

            {/* Deadline — eigen sectie met snel-pillen */}
            <div className="px-7 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Deadline</p>
              <div className="flex items-center gap-2 flex-wrap">
                <DatePicker
                  value={nieuweTaakDeadline}
                  onChange={(v) => setNieuweTaakDeadline(v || '')}
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-[13px] font-medium hover:border-[#1A535C]/30 transition-colors"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-foreground/70" />
                      <span className={cn(!nieuweTaakDeadline && 'text-muted-foreground')}>
                        {nieuweTaakDeadline
                          ? new Date(nieuweTaakDeadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'Kies datum'}
                      </span>
                    </button>
                  }
                />
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Vandaag', days: 0 },
                    { label: 'Morgen',  days: 1 },
                    { label: '+3d',     days: 3 },
                    { label: '+7d',     days: 7 },
                  ].map(({ label, days }) => {
                    const d = new Date()
                    d.setDate(d.getDate() + days)
                    const val = d.toISOString().split('T')[0]
                    const isSelected = nieuweTaakDeadline === val
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setNieuweTaakDeadline(isSelected ? '' : val)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-md text-[11.5px] font-semibold transition-all',
                          isSelected
                            ? 'bg-[#1A535C] text-white shadow-[0_1px_3px_rgba(20,62,71,0.2)]'
                            : 'bg-background text-foreground/70 hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                  {nieuweTaakDeadline && (
                    <button
                      type="button"
                      onClick={() => setNieuweTaakDeadline('')}
                      className="ml-1 text-[11px] font-medium text-muted-foreground hover:text-[#C03A18] hover:underline transition-colors"
                    >
                      Wissen
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Briefing textarea */}
            <div className="px-7 pb-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Briefing</p>
              <Textarea
                value={nieuweTaakBeschrijving}
                onChange={(e) => setNieuweTaakBeschrijving(e.target.value)}
                placeholder="Briefing toevoegen…"
                rows={5}
                className="resize-y bg-background border border-border focus-visible:border-[#1A535C] dark:focus-visible:border-white/30 focus-visible:ring-[3px] focus-visible:ring-[rgba(26,83,92,0.12)] dark:focus-visible:ring-white/10 text-[14px] leading-relaxed rounded-lg"
              />
            </div>
          </div>

          {/* Footer — project-context links + acties rechts */}
          <div className="border-t border-border px-7 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 flex items-center gap-2 text-[12px] text-muted-foreground">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[#1A535C] flex-shrink-0" />
              <span className="truncate">
                <span className="font-semibold text-foreground/70">{project?.naam}</span>
                {klant && <span className="text-muted-foreground/70"> · {klant.bedrijfsnaam || klant.contactpersoon}</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => setNieuweTaakOpen(false)}>
              Annuleren
            </Button>
            <Button
              disabled={!nieuweTaakTitel.trim()}
              onClick={async () => {
                try {
                  const newTaak = await createTaak({
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
                  logCreate({ user, medewerkers: alleMedewerkers, entityType: 'taak', entityId: newTaak.id })
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
            </div>
          </div>
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
              <DatePicker
                value={kopieStartDatum}
                onChange={(v) => setKopieStartDatum(v)}
                asInput
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
      <Dialog open={montageDialogOpen} onOpenChange={(open) => { setMontageDialogOpen(open); if (!open) setEditingMontageId(null) }}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-500" />
              {editingMontageId ? 'Montage wijzigen' : 'Montage inplannen'}
            </DialogTitle>
            <DialogDescription>
              {editingMontageId
                ? `Wijzig de montage voor ${project?.naam || 'dit project'}.`
                : `Plan een montage in voor ${project?.naam || 'dit project'}.`}
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
                <DatePicker value={montageDatum} onChange={(v) => setMontageDatum(v)} asInput className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-sm">Start</Label>
                <Input type="time" value={montageStartTijd} onChange={(e) => setMontageStartTijd(e.target.value)} className="mt-1 h-9 [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
              <div>
                <Label className="text-sm">Eind</Label>
                <Input type="time" value={montageEindTijd} onChange={(e) => setMontageEindTijd(e.target.value)} className="mt-1 h-9 [color-scheme:light] dark:[color-scheme:dark]" />
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
                    logCreate({ user, medewerkers: alleMedewerkers, entityType: 'werkbon', entityId: wb.id })
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
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-border bg-background"
                    >
                      {bijlage.type === 'pdf' ? (
                        <FileText className="h-3 w-3 text-[#C03A18]" />
                      ) : (
                        <Paperclip className="h-3 w-3 text-foreground/70" />
                      )}
                      <span className="truncate max-w-[120px]">{bijlage.naam}</span>
                      <button
                        type="button"
                        title="Bekijken"
                        onClick={() => window.open(bijlage.url, '_blank')}
                        className="text-muted-foreground hover:text-[#1A535C] ml-0.5"
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
                        className="text-muted-foreground hover:text-[#1A535C]"
                      >
                        <Printer className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMontageBijlagen(prev => prev.filter(b => b.id !== bijlage.id))}
                        className="text-muted-foreground hover:text-[#C03A18] ml-0.5"
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
            <Button variant="outline" onClick={() => { setMontageDialogOpen(false); setEditingMontageId(null) }}>Annuleren</Button>
            <Button onClick={handleSaveMontage} disabled={isSavingMontage}>
              {isSavingMontage ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wrench className="h-4 w-4 mr-1" />}
              {editingMontageId ? 'Opslaan' : 'Inplannen'}
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
            if (!user) throw new Error('Niet ingelogd')
            const [offerteItems, profile, docStyle] = await Promise.all([
              getOfferteItems(obPreviewOfferte.id),
              getProfile(user.id),
              getDocumentStyle(user.id),
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
