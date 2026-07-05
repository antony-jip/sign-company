import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { BackButton } from '@/components/shared/BackButton'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Save,
  Download,
  Send,
  FileText,
  Search,
  Building2,
  Plus,
  Trash2,
  Euro,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Receipt,
  X,
  Copy,
  MoreHorizontal,
  CreditCard,
  Bell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MinusCircle,
  FileDown,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  RefreshCw,
  ClipboardCheck,
  Paperclip,
} from 'lucide-react'
import {
  getKlanten,
  getFacturen,
  getFactuur,
  getFactuurItems,
  createFactuur,
  createFactuurItem,
  updateFactuur,
  updateFactuurStatus,
  generateFactuurNummer as generateFactuurNrDb,
  deleteFactuur,
  getOffertes,
  getOfferteItems,
  updateOfferte,
  updateProject,
  getProject,
  getOffertesByProject,
  getFacturenByProject,
  getProjecten,
  getKlant,
  generateBetaalToken,
  getHerinneringTemplates,
  getGrootboek,
  getKostenplaatsen,
  getWerkbonnenByKlant,
  getWerkbon,
  getWerkbonItems,
  getWerkbonFotos,
  getContactpersonenByKlant,
  createContactpersoonDB,
  updateContactpersoonDB,
  updateKlant,
} from '@/services/supabaseService'
import { generateWerkbonInstructiePDF } from '@/services/werkbonPdfService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useTrialGuard } from '@/hooks/useTrialGuard'
import { TrialGuardDialog } from '@/components/shared/TrialGuardDialog'
import type { Klant, Factuur, FactuurItem, Offerte, OfferteItem, OfferteItemDetailRegel, HerinneringTemplate, Project, Grootboek, Kostenplaats, Werkbon, FactuurBijlage, BoekhoudPakket } from '@/types'

const BOEKHOUD_PAKKET_NAAM: Record<BoekhoudPakket, string> = {
  snelstart: 'SnelStart',
  moneybird: 'Moneybird',
  eboekhouden: 'e-Boekhouden',
}
import { round2 } from '@/utils/budgetUtils'
import { generateFactuurPDF, generateOffertePDF } from '@/services/pdfService'
import { getFactuurClipboard } from '@/utils/factuurClipboard'
import { genereerEnUploadFactuurPdf, downloadFactuurPdfFromStorage } from '@/services/factuurPdfService'
import { generateUBLInvoice, downloadUBLXml } from '@/services/ublService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { sendEmail } from '@/services/gmailService'
import { factuurVerzendTemplate, factuurHerinneringTemplate } from '@/services/emailTemplateService'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { factuurBetaalTokenExpiry } from '@/lib/tokenExpiry'
import { logger } from '../../utils/logger'
import { KlantStatusWarning } from '@/components/shared/KlantStatusWarning'
import { KlantContactSelector, type ResolvedContactpersoon } from '@/components/shared/KlantContactSelector'
import { FactuurBijlagenSectie } from '@/components/invoices/FactuurBijlagenSectie'
import { getFactuurBijlagen } from '@/services/factuurBijlagenService'
import { useUnsavedWarning } from '@/hooks/useUnsavedWarning'
import { AuditLogPanel } from '@/components/shared/AuditLogPanel'
import { confirm } from '@/components/shared/ConfirmDialog'
import { logWijziging, logCreate } from '@/utils/auditLogger'
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { Skeleton } from '@/components/ui/skeleton'

// ============ TYPES ============

interface LineItem {
  id: string
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  grootboek_code: string
  detail_regels?: OfferteItemDetailRegel[]
}

// ============ HELPERS ============

function createEmptyLineItem(defaultBtw: number = 21): LineItem {
  return {
    id: crypto.randomUUID(),
    beschrijving: '',
    aantal: 1,
    eenheidsprijs: 0,
    btw_percentage: defaultBtw,
    korting_percentage: 0,
    grootboek_code: '',
    detail_regels: [],
  }
}

function calcLineTotal(item: LineItem): number {
  const subtotaal = round2(item.aantal * item.eenheidsprijs)
  const korting = round2(subtotaal * (item.korting_percentage / 100))
  return round2(subtotaal - korting)
}

function calcSubtotaal(items: LineItem[]): number {
  return round2(items.reduce((sum, item) => sum + calcLineTotal(item), 0))
}

function calcBtwGroups(items: LineItem[]): Record<number, number> {
  const groups: Record<number, number> = {}
  items.forEach((item) => {
    const lineTotal = calcLineTotal(item)
    const btwBedrag = round2(lineTotal * (item.btw_percentage / 100))
    groups[item.btw_percentage] = round2((groups[item.btw_percentage] || 0) + btwBedrag)
  })
  return groups
}

function calcBtwBedrag(items: LineItem[]): number {
  return round2(Object.values(calcBtwGroups(items)).reduce((sum, v) => sum + v, 0))
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getDefaultVervaldatum(factuurdatum: string, dagen: number = 30): string {
  const d = new Date(factuurdatum)
  d.setDate(d.getDate() + dagen)
  return d.toISOString().split('T')[0]
}

function buildFactuurNummer(prefix: string, volgnummer: number): string {
  const jaar = new Date().getFullYear().toString()
  const resolvedPrefix = prefix.replace('{jaar}', jaar)
  return `${resolvedPrefix}${volgnummer}`
}

function generateFactuurNummer(prefix: string, existing: { nummer: string }[], startNummer = 1): string {
  const jaar = new Date().getFullYear().toString()
  const resolvedPrefix = prefix.replace('{jaar}', jaar)
  const maxNr = existing
    .filter((f) => f.nummer.startsWith(resolvedPrefix))
    .reduce((max, f) => {
      const tail = f.nummer.slice(resolvedPrefix.length)
      const n = /^\d+$/.test(tail) ? parseInt(tail, 10) : 0
      return Math.max(max, n)
    }, 0)
  const nextNr = Math.max(maxNr, Math.max(0, startNummer - 1)) + 1
  return buildFactuurNummer(prefix, nextNr)
}

function generateTypedNummer(existing: { nummer: string }[], prefix: string): string {
  const year = new Date().getFullYear()
  const schoonPrefix = prefix.replace(/-+$/, '')
  const fullPrefix = `${schoonPrefix}-${year}-`
  const maxNum = existing
    .filter((f) => f.nummer.startsWith(fullPrefix))
    .reduce((max, f) => {
      const num = parseInt(f.nummer.replace(fullPrefix, ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
  return `${fullPrefix}${String(maxNum + 1).padStart(3, '0')}`
}

const STANDAARD_VERZEND_BERICHT = 'Hartelijk dank voor de opdracht, hierbij ontvang je onze factuur.'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  concept: { label: 'Concept', color: 'bg-bg-hover text-text-tertiary' },
  open: { label: 'Open', color: 'bg-[#1A535C15] text-petrol' },
  verzonden: { label: 'Verzonden', color: 'bg-[#8BAFD415] text-[#5a8ab5]' },
  betaald: { label: 'Betaald', color: 'bg-[#16a34a12] text-[#16a34a]' },
  vervallen: { label: 'Vervallen', color: 'bg-[#ef444412] text-[#ef4444]' },
  gecrediteerd: { label: 'Gecrediteerd', color: 'bg-wm-pale/30 text-accent dark:bg-accent/30 dark:text-wm-pale' },
}

// ============ MAIN COMPONENT ============

export function FactuurEditor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id: routeId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { medewerkers } = useMedewerkers()
  const { isBlocked: isTrialBlocked, showDialog: showTrialDialog, setShowDialog: setShowTrialDialog } = useTrialGuard()
  const {
    settings,
    standaardBtw,
    factuurPrefix,
    factuurStartNummer,
    creditnotaDoornummeren,
    factuurBetaaltermijnDagen,
    factuurVoorwaarden,
    factuurIntroTekst,
    factuurOutroTekst,
    bedrijfsnaam,
    primaireKleur,
    emailHandtekening,
    profile,
  } = useAppSettings()
  const documentStyle = useDocumentStyle()

  // ============ STATE ============

  const [klanten, setKlanten] = useState<Klant[]>([])
  const [allFacturen, setAllFacturen] = useState<Factuur[]>([])
  const [allOffertes, setAllOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Unsaved changes warning
  useUnsavedWarning(isDirty)

  // Existing factuur data (for edit mode)
  const [existingFactuur, setExistingFactuur] = useState<Factuur | null>(null)

  // Query params
  const paramKlantId = searchParams.get('klant_id') || ''
  const paramOfferteId = searchParams.get('offerte_id') || ''
  const paramProjectId = searchParams.get('project_id') || ''
  const paramTitel = searchParams.get('titel') || ''
  const paramCreditVoor = searchParams.get('credit_voor') || ''
  const editFactuurId = routeId || ''

  // Form state
  const [klantId, setKlantId] = useState('')
  const [contactpersoonId, setContactpersoonId] = useState('')
  const [resolvedCp, setResolvedCp] = useState<ResolvedContactpersoon | null>(null)
  const [factuurStandaardCpId, setFactuurStandaardCpId] = useState<string | null>(null)

  // Per-factuur adres-override: voorgevuld met het klantadres, vrij aanpasbaar.
  // Leeg veld valt terug op de klantkaart; ingevuld veld wint op de PDF.
  const [adresOverrideOpen, setAdresOverrideOpen] = useState(false)
  const [adresBedrijfsnaam, setAdresBedrijfsnaam] = useState('')
  const [adresTav, setAdresTav] = useState('')
  const [adresRegel, setAdresRegel] = useState('')
  const [adresPostcode, setAdresPostcode] = useState('')
  const [adresPlaats, setAdresPlaats] = useState('')
  const [adresOokOpKlant, setAdresOokOpKlant] = useState(false)
  const [klantSearch, setKlantSearch] = useState('')
  const [showKlantSelector, setShowKlantSelector] = useState(true)
  const [offerteId, setOfferteId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [titel, setTitel] = useState('')
  const [nummer, setNummer] = useState('')
  const [factuurdatum, setFactuurdatum] = useState(getTodayString())
  const [vervaldatum, setVervaldatum] = useState(getDefaultVervaldatum(getTodayString(), factuurBetaaltermijnDagen))
  const [voorwaarden, setVoorwaarden] = useState(factuurVoorwaarden)
  const [notities, setNotities] = useState('')
  const [introTekst, setIntroTekst] = useState(factuurIntroTekst)
  const [outroTekst, setOutroTekst] = useState(factuurOutroTekst)
  const [items, setItems] = useState<LineItem[]>([createEmptyLineItem(standaardBtw)])

  // Kostenplaats
  const [kostenplaatsId, setKostenplaatsId] = useState('')
  const [kostenplaatsen, setKostenplaatsen] = useState<Kostenplaats[]>([])

  // Werkbon koppeling
  const [werkbonId, setWerkbonId] = useState('')
  const [werkbonnen, setWerkbonnen] = useState<Werkbon[]>([])

  // Grootboekrekeningen
  const [grootboekrekeningen, setGrootboekrekeningen] = useState<Grootboek[]>([])

  // Credit factuur state
  const [isCreditFactuur, setIsCreditFactuur] = useState(false)
  const [creditVoorFactuurId, setCreditVoorFactuurId] = useState('')
  const [creditVoorNummer, setCreditVoorNummer] = useState('')

  // Factureerpercentage (DEEL 2)
  const [factureerPercentage, setFactureerPercentage] = useState(100)
  const [origineleItems, setOrigineleItems] = useState<LineItem[]>([])
  const [hasOfferteItems, setHasOfferteItems] = useState(false)

  // Te factureren projecten (DEEL 3)
  const [teFacturerenProjecten, setTeFacturerenProjecten] = useState<(Project & { offerteBedrag: number })[]>([])

  // Track form modifications after initial load
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (!isLoading && !initialLoadDone.current) {
      // Skip first render after data loads
      initialLoadDone.current = true
      return
    }
    if (initialLoadDone.current) setIsDirty(true)
  }, [titel, nummer, klantId, items, notities, voorwaarden, factuurdatum, vervaldatum])

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [persoonlijkBericht, setPersoonlijkBericht] = useState(STANDAARD_VERZEND_BERICHT)
  const [isSending, setIsSending] = useState(false)
  const [boekhoudSyncing, setBoekhoudSyncing] = useState(false)
  const [dialogBijlagen, setDialogBijlagen] = useState<FactuurBijlage[]>([])
  const [selectedBijlageIds, setSelectedBijlageIds] = useState<Set<string>>(new Set())
  const [stuurOfferteMee, setStuurOfferteMee] = useState(false)
  const [creditnotaDialogOpen, setCreditnotaDialogOpen] = useState(false)
  const [creditReden, setCreditReden] = useState('')
  const [herinneringDialogOpen, setHerinneringDialogOpen] = useState(false)
  const [herinneringTemplates, setHerinneringTemplates] = useState<HerinneringTemplate[]>([])
  const [herinneringType, setHerinneringType] = useState<HerinneringTemplate['type']>('herinnering_1')
  const [herinneringPreview, setHerinneringPreview] = useState('')
  const [extraTekstOpen, setExtraTekstOpen] = useState(false)

  // ============ DATA LOADING ============

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [klantenData, facturenData, herinneringData, offertesData, grootboekData, kostenplaatsenData] = await Promise.all([
          getKlanten().catch(() => []),
          getFacturen().catch(() => []),
          getHerinneringTemplates().catch(() => []),
          getOffertes().catch(() => []),
          getGrootboek().catch(() => []),
          getKostenplaatsen().catch(() => []),
        ])
        if (!cancelled) {
          setKlanten(klantenData)
          setAllFacturen(facturenData)
          setHerinneringTemplates(herinneringData)
          setAllOffertes(offertesData)
          setGrootboekrekeningen(grootboekData)
          setKostenplaatsen(kostenplaatsenData.filter((k: Kostenplaats) => k.actief))
        }

        // Edit mode: load existing factuur
        if (editFactuurId) {
          try {
            const [factuur, factuurItems] = await Promise.all([
              getFactuur(editFactuurId),
              getFactuurItems(editFactuurId),
            ])
            if (!cancelled && factuur) {
              setExistingFactuur(factuur)
              setIsEditMode(true)
              setKlantId(factuur.klant_id)
              setContactpersoonId(factuur.contactpersoon_id || '')
              setShowKlantSelector(false)
              setOfferteId(factuur.offerte_id || '')
              setProjectId(factuur.project_id || '')
              setTitel(factuur.titel)
              setNummer(factuur.nummer)
              setFactuurdatum(factuur.factuurdatum)
              setVervaldatum(factuur.vervaldatum)
              setVoorwaarden(factuur.voorwaarden || '')
              setNotities(factuur.notities || '')
              setIntroTekst(factuur.intro_tekst || '')
              setOutroTekst(factuur.outro_tekst || '')
              setKostenplaatsId(factuur.kostenplaats_id || '')
              setWerkbonId((factuur as any).werkbon_id || '')

              // Credit factuur state
              if (factuur.factuur_type === 'creditnota' || factuur.factuur_type === 'credit') {
                setIsCreditFactuur(true)
                setCreditVoorFactuurId(factuur.credit_voor_factuur_id || factuur.gerelateerde_factuur_id || '')
                // Zoek originele factuur nummer
                const origFactuur = facturenData.find((f: Factuur) => f.id === (factuur.credit_voor_factuur_id || factuur.gerelateerde_factuur_id))
                if (origFactuur) setCreditVoorNummer(origFactuur.nummer)
              }

              if (factuurItems.length > 0) {
                setItems(
                  factuurItems
                    .sort((a, b) => a.volgorde - b.volgorde)
                    .map((fi) => ({
                      id: fi.id,
                      beschrijving: fi.beschrijving,
                      aantal: fi.aantal,
                      eenheidsprijs: fi.eenheidsprijs,
                      btw_percentage: fi.btw_percentage,
                      korting_percentage: fi.korting_percentage,
                      grootboek_code: fi.grootboek_code || '',
                      detail_regels: fi.detail_regels || [],
                    }))
                )
              }
            }
          } catch (err) {
            logger.error('Failed to load factuur for editing:', err)
            if (!cancelled) toast.error('Kon factuur niet laden')
          }
        } else {
          // New factuur: blijft een concept zonder nummer. Het volgnummer wordt
          // pas bij "Verwerken" toegekend (zie handleSave), zodat afgebroken
          // concepten geen gat in de factuurnummer-reeks veroorzaken.

          // Pre-fill from query params
          if (paramKlantId) {
            setKlantId(paramKlantId)
            setShowKlantSelector(false)
          }
          if (paramTitel) setTitel(paramTitel)
          if (paramProjectId) setProjectId(paramProjectId)

          // Import from project (DEEL 2): auto-fill klant, titel, offerte items
          if (paramProjectId && !paramOfferteId) {
            try {
              const projectenData = await getProjecten()
              const project = projectenData.find((p) => p.id === paramProjectId)
              if (project) {
                setKlantId(project.klant_id)
                setShowKlantSelector(false)
                setTitel(project.naam)
                setProjectId(project.id)

                // Find linked offerte and import items
                const projectOffertes = await getOffertesByProject(project.id).catch(() => [])
                const offerte = projectOffertes.find((o) => o.status === 'goedgekeurd') || projectOffertes[0]
                if (offerte) {
                  setOfferteId(offerte.id)

                  const offerteItems = await getOfferteItems(offerte.id).catch(() => [])
                  if (offerteItems.length > 0) {
                    const mapped = offerteItems
                      .filter((oi) => !oi.is_optioneel)
                      .sort((a, b) => a.volgorde - b.volgorde)
                      .map((oi) => ({
                        id: crypto.randomUUID(),
                        beschrijving: oi.beschrijving,
                        aantal: oi.aantal,
                        eenheidsprijs: oi.eenheidsprijs,
                        btw_percentage: oi.btw_percentage,
                        korting_percentage: oi.korting_percentage,
                        grootboek_code: oi.grootboek_code || '',
                        detail_regels: oi.detail_regels || [],
                      }))
                    setItems(mapped)
                    setOrigineleItems(mapped.map((item) => ({ ...item })))
                    setHasOfferteItems(true)
                  } else {
                    setItems([{
                      id: crypto.randomUUID(),
                      beschrijving: offerte.titel,
                      aantal: 1,
                      eenheidsprijs: offerte.subtotaal,
                      btw_percentage: offerte.subtotaal > 0 ? Math.round((offerte.btw_bedrag / offerte.subtotaal) * 100) : 21,
                      korting_percentage: 0,
                      grootboek_code: '',
                    }])
                    setOrigineleItems([{
                      id: crypto.randomUUID(),
                      beschrijving: offerte.titel,
                      aantal: 1,
                      eenheidsprijs: offerte.subtotaal,
                      btw_percentage: offerte.subtotaal > 0 ? Math.round((offerte.btw_bedrag / offerte.subtotaal) * 100) : 21,
                      korting_percentage: 0,
                      grootboek_code: '',
                    }])
                    setHasOfferteItems(true)
                  }
                }
              }
            } catch (err) {
              logger.error('Failed to import project data:', err)
            }
          }

          // Load te factureren projecten (DEEL 3)
          try {
            const projectenData = await getProjecten()
            const tfProjecten = projectenData.filter((p) => p.status === 'te-factureren')
            const enriched = await Promise.all(
              tfProjecten.map(async (project) => {
                const projectOffertes = await getOffertesByProject(project.id).catch(() => [])
                const offerteBedrag = round2(projectOffertes.reduce((sum, o) => sum + o.totaal, 0))
                return { ...project, offerteBedrag }
              })
            )
            if (!cancelled) setTeFacturerenProjecten(enriched)
          } catch (err) {
            logger.error('Fetch te factureren projecten:', err)
          }

          // Import from offerte
          if (paramOfferteId) {
            try {
              const offerteItems = await getOfferteItems(paramOfferteId)
              const allOffertes = await getOffertes().catch(() => [])
              const offerte = allOffertes.find((o) => o.id === paramOfferteId)
              if (offerte) {
                // Waarschuwing bij dubbele facturatie
                if (offerte.status === 'gefactureerd' || offerte.geconverteerd_naar_factuur_id) {
                  const doorgaan = await confirm({
                    message: `Let op: offerte ${offerte.nummer} is al eerder gefactureerd` +
                    (offerte.geconverteerd_naar_factuur_op ? ` op ${new Date(offerte.geconverteerd_naar_factuur_op).toLocaleDateString('nl-NL')}` : '') +
                    '.\n\nWil je toch een nieuwe factuur aanmaken?',
                    confirmLabel: 'Doorgaan'
                  })
                  if (!doorgaan) {
                    navigate('/facturen')
                    return
                  }
                }
                setOfferteId(offerte.id)
                setKlantId(offerte.klant_id)
                setShowKlantSelector(false)
                setTitel(offerte.titel)
                if (offerte.project_id) setProjectId(offerte.project_id)
                if (offerte.notities) setNotities(offerte.notities)
                if (offerte.intro_tekst) setIntroTekst(offerte.intro_tekst)
                // Outro bewust NIET uit de offerte overnemen · de factuur houdt
                // zijn eigen standaard-outro (factuurOutroTekst).

                if (offerteItems.length > 0) {
                  setItems(
                    offerteItems
                      .filter((oi) => !oi.is_optioneel)
                      .sort((a, b) => a.volgorde - b.volgorde)
                      .map((oi) => ({
                        id: crypto.randomUUID(),
                        beschrijving: oi.beschrijving,
                        aantal: oi.aantal,
                        eenheidsprijs: oi.eenheidsprijs,
                        btw_percentage: oi.btw_percentage,
                        korting_percentage: oi.korting_percentage,
                        grootboek_code: oi.grootboek_code || '',
                        detail_regels: oi.detail_regels || [],
                      }))
                  )
                } else {
                  setItems([
                    {
                      id: crypto.randomUUID(),
                      beschrijving: offerte.titel,
                      aantal: 1,
                      eenheidsprijs: offerte.subtotaal,
                      btw_percentage: offerte.subtotaal > 0 ? Math.round((offerte.btw_bedrag / offerte.subtotaal) * 100) : 21,
                      korting_percentage: 0,
                      grootboek_code: '',
                    },
                  ])
                }
              }
            } catch (err) {
              logger.error('Failed to import offerte items:', err)
            }
          }

          // Credit factuur: importeer van originele factuur
          if (paramCreditVoor) {
            try {
              const [origFactuur, origItems] = await Promise.all([
                getFactuur(paramCreditVoor),
                getFactuurItems(paramCreditVoor),
              ])
              if (origFactuur && !cancelled) {
                setIsCreditFactuur(true)
                setCreditVoorFactuurId(origFactuur.id)
                setCreditVoorNummer(origFactuur.nummer)
                setKlantId(origFactuur.klant_id)
                setShowKlantSelector(false)
                setTitel(`Credit: ${origFactuur.titel}`)
                setProjectId(origFactuur.project_id || '')
                setOfferteId(origFactuur.offerte_id || '')
                setNummer(creditnotaDoornummeren
                  ? await generateFactuurNrDb(factuurPrefix, factuurStartNummer)
                  : generateTypedNummer(facturenData, 'CR'))
                setKostenplaatsId(origFactuur.kostenplaats_id || '')
                if (origFactuur.voorwaarden) setVoorwaarden(origFactuur.voorwaarden)
                if (origFactuur.intro_tekst) setIntroTekst(origFactuur.intro_tekst)
                if (origFactuur.outro_tekst) setOutroTekst(origFactuur.outro_tekst)

                if (origItems.length > 0) {
                  setItems(
                    origItems
                      .sort((a, b) => a.volgorde - b.volgorde)
                      .map((fi) => ({
                        id: crypto.randomUUID(),
                        beschrijving: fi.beschrijving,
                        aantal: fi.aantal,
                        eenheidsprijs: round2(-fi.eenheidsprijs),
                        btw_percentage: fi.btw_percentage,
                        korting_percentage: fi.korting_percentage,
                        grootboek_code: fi.grootboek_code || '',
                        detail_regels: fi.detail_regels || [],
                      }))
                  )
                } else {
                  setItems([{
                    id: crypto.randomUUID(),
                    beschrijving: origFactuur.titel,
                    aantal: 1,
                    eenheidsprijs: round2(-origFactuur.subtotaal),
                    btw_percentage: origFactuur.subtotaal > 0 ? Math.round((origFactuur.btw_bedrag / origFactuur.subtotaal) * 100) : 21,
                    korting_percentage: 0,
                    grootboek_code: '',
                  }])
                }
              }
            } catch (err) {
              logger.error('Failed to import credit factuur:', err)
              toast.error('Kon originele factuur niet laden voor creditering')
            }
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [editFactuurId, paramKlantId, paramOfferteId, paramProjectId, paramTitel, paramCreditVoor, factuurPrefix, standaardBtw, factuurBetaaltermijnDagen, factuurVoorwaarden, factuurIntroTekst, factuurOutroTekst])

  // Werkbonnen laden bij klant-selectie
  useEffect(() => {
    if (!klantId) { setWerkbonnen([]); return }
    getWerkbonnenByKlant(klantId).then(setWerkbonnen).catch(() => setWerkbonnen([]))
  }, [klantId])

  // Standaard factuur-contact ophalen bij klant-selectie; voorvullen alleen voor nieuwe facturen.
  useEffect(() => {
    if (!klantId) { setFactuurStandaardCpId(null); return }
    let cancelled = false
    getContactpersonenByKlant(klantId).then((cps) => {
      if (cancelled) return
      const std = cps.find((c) => c.is_factuur_standaard)
      setFactuurStandaardCpId(std?.id || null)
      if (!isEditMode && std) {
        setContactpersoonId(std.id)
      }
    }).catch(() => { if (!cancelled) setFactuurStandaardCpId(null) })
    return () => { cancelled = true }
  }, [klantId, isEditMode])

  // Open "Extra tekst" automatisch zodra de data geladen is met aanwezige content.
  // Voorwaarden wordt bewust uitgesloten · die wordt standaard gevuld vanuit settings.
  useEffect(() => {
    if (!isLoading && (outroTekst.trim() || notities.trim())) {
      setExtraTekstOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // Laad bijlagen voor de verzend-dialog. Default alle bijlagen aangevinkt.
  useEffect(() => {
    if (!sendDialogOpen || !existingFactuur?.id) return
    let cancelled = false
    getFactuurBijlagen(existingFactuur.id)
      .then((data) => {
        if (cancelled) return
        setDialogBijlagen(data)
        setSelectedBijlageIds(new Set(data.map((b) => b.id)))
      })
      .catch((err) => {
        logger.error('Bijlagen voor verzend-dialog laden mislukt:', err)
        setDialogBijlagen([])
        setSelectedBijlageIds(new Set())
      })
    return () => { cancelled = true }
  }, [sendDialogOpen, existingFactuur?.id])

  // ============ PERCENTAGE EFFECT ============

  // Recalculate items when factureerPercentage changes
  useEffect(() => {
    if (!hasOfferteItems || origineleItems.length === 0) return
    const pct = Math.max(0, Math.min(100, factureerPercentage))
    setItems((prev) =>
      prev.map((item, idx) => {
        const orig = origineleItems[idx]
        if (!orig) return item
        return {
          ...item,
          eenheidsprijs: round2(orig.eenheidsprijs * (pct / 100)),
        }
      })
    )
  }, [factureerPercentage, origineleItems, hasOfferteItems])

  // Original offerte subtotaal for percentage display
  const origineleSubtotaal = useMemo(() => {
    if (origineleItems.length === 0) return 0
    return round2(origineleItems.reduce((sum, item) => {
      const sub = round2(item.aantal * item.eenheidsprijs)
      const korting = round2(sub * (item.korting_percentage / 100))
      return sum + round2(sub - korting)
    }, 0))
  }, [origineleItems])

  // Filtered te factureren projecten (exclude current project)
  const filteredTeFacturerenProjecten = useMemo(() => {
    return teFacturerenProjecten.filter((p) => p.id !== paramProjectId)
  }, [teFacturerenProjecten, paramProjectId])

  // ============ COMPUTED ============

  const selectedKlant = useMemo(() => klanten.find((k) => k.id === klantId), [klanten, klantId])

  // Voorvullen adresblok: in edit-mode wint een opgeslagen override, anders het
  // klantadres. Open het blok automatisch als er al een override staat.
  useEffect(() => {
    if (!selectedKlant) return
    const ov = isEditMode ? existingFactuur : null
    setAdresBedrijfsnaam(ov?.factuur_bedrijfsnaam || selectedKlant.bedrijfsnaam || '')
    setAdresTav(ov?.factuur_tav || selectedKlant.contactpersoon || '')
    setAdresRegel(ov?.factuur_adres || selectedKlant.adres || '')
    setAdresPostcode(ov?.factuur_postcode || selectedKlant.postcode || '')
    setAdresPlaats(ov?.factuur_plaats || selectedKlant.stad || '')
    if (ov && (ov.factuur_bedrijfsnaam || ov.factuur_tav || ov.factuur_adres || ov.factuur_postcode || ov.factuur_plaats)) {
      setAdresOverrideOpen(true)
    }
  }, [selectedKlant, isEditMode, existingFactuur])

  const filteredKlanten = useMemo(() => {
    if (!klantSearch.trim()) return klanten
    const q = klantSearch.toLowerCase()
    return klanten.filter(
      (k) =>
        k.bedrijfsnaam.toLowerCase().includes(q) ||
        (k.contactpersoon || '').toLowerCase().includes(q) ||
        (k.email || '').toLowerCase().includes(q)
    )
  }, [klanten, klantSearch])

  const validItems = useMemo(() => items.filter((i) => i.beschrijving.trim()), [items])
  const subtotaal = useMemo(() => calcSubtotaal(validItems), [validItems])
  const btwGroups = useMemo(() => calcBtwGroups(validItems), [validItems])
  const btwBedrag = useMemo(() => calcBtwBedrag(validItems), [validItems])
  const totaal = useMemo(() => round2(subtotaal + btwBedrag), [subtotaal, btwBedrag])

  // Een negatief totaal is per definitie een creditfactuur, ook zonder dat je
  // expliciet vanuit een originele factuur crediteert.
  const isCredit = isCreditFactuur || totaal < 0

  const currentStatus = existingFactuur?.status || 'concept'
  const isVervallen = existingFactuur ? existingFactuur.vervaldatum < getTodayString() && currentStatus !== 'betaald' && currentStatus !== 'gecrediteerd' : false
  const isReadOnly = !!(existingFactuur && (currentStatus === 'betaald' || currentStatus === 'gecrediteerd'))

  const dagenVervallen = useMemo(() => {
    if (!existingFactuur) return 0
    const vervaldatum = new Date(existingFactuur.vervaldatum)
    const vandaag = new Date()
    return Math.max(0, Math.floor((vandaag.getTime() - vervaldatum.getTime()) / (1000 * 60 * 60 * 24)))
  }, [existingFactuur])

  // Te factureren offertes: goedgekeurd maar nog geen factuur
  const teFacturerenOffertes = useMemo(() => {
    const gefactuurdeOfferteIds = new Set(
      allFacturen
        .filter((f) => f.offerte_id)
        .map((f) => f.offerte_id)
    )
    return allOffertes
      .filter((o) => o.status === 'goedgekeurd' && !gefactuurdeOfferteIds.has(o.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [allOffertes, allFacturen])

  // ============ ITEM HANDLERS ============

  const handleSelectKlant = useCallback((kId: string) => {
    setKlantId(kId)
    setShowKlantSelector(false)
    setKlantSearch('')
  }, [])

  const handleChangeKlant = useCallback(() => {
    setShowKlantSelector(true)
    setKlantSearch('')
  }, [])

  const [heeftKlembord] = useState(() => !!getFactuurClipboard())

  const handlePlakFactuur = useCallback(() => {
    const data = getFactuurClipboard()
    if (!data) {
      toast.error('Geen gekopieerde factuur gevonden')
      return
    }
    setItems(
      data.items.length > 0
        ? data.items.map((i) => ({ id: crypto.randomUUID(), ...i }))
        : [createEmptyLineItem(standaardBtw)],
    )
    if (data.titel && !titel.trim()) setTitel(data.titel)
    if (data.intro_tekst) setIntroTekst(data.intro_tekst)
    if (data.outro_tekst) setOutroTekst(data.outro_tekst)
    if (data.voorwaarden) setVoorwaarden(data.voorwaarden)
    if (data.notities) setNotities(data.notities)
    toast.success('Gekopieerde factuur geplakt')
  }, [standaardBtw, titel])

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyLineItem(standaardBtw)])
  }, [standaardBtw])

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const handleUpdateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    )
  }, [])

  const handleAddDetailRegel = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, detail_regels: [...(i.detail_regels || []), { id: crypto.randomUUID(), label: '', waarde: '' }] }
          : i,
      ),
    )
  }, [])

  const handleUpdateDetailRegel = useCallback((itemId: string, detailId: string, field: 'label' | 'waarde', value: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, detail_regels: (i.detail_regels || []).map((d) => (d.id === detailId ? { ...d, [field]: value } : d)) }
          : i,
      ),
    )
  }, [])

  const handleRemoveDetailRegel = useCallback((itemId: string, detailId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, detail_regels: (i.detail_regels || []).filter((d) => d.id !== detailId) }
          : i,
      ),
    )
  }, [])

  const handleDuplicateItem = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      if (idx === -1) return prev
      const copy = { ...prev[idx], id: crypto.randomUUID() }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }, [])

  // ============ SAVE ============

  const handleSave = useCallback(async (verwerken = false) => {
    if (isTrialBlocked) {
      setShowTrialDialog(true)
      return
    }
    if (!klantId) {
      toast.error('Selecteer een klant')
      return
    }
    if (!titel.trim()) {
      toast.error('Vul een titel in')
      return
    }
    if (validItems.length === 0) {
      toast.error('Voeg minimaal een regelitem toe')
      return
    }

    try {
      setIsSaving(true)

      // "Verwerken" maakt het concept definitief: nu pas een volgnummer toekennen
      // (DB-bewust, zodat de reeks aansluit) en de status op 'open' zetten. De
      // factuur is dan klaar om te versturen; pas bij daadwerkelijk versturen
      // wordt de status 'verzonden'. Een al toegekend nummer (bv. creditnota
      // CR-…) blijft behouden.
      const effectiefNummer = verwerken
        ? (nummer || await generateFactuurNrDb(factuurPrefix, factuurStartNummer))
        : nummer
      const doelStatus: Factuur['status'] = verwerken ? 'open' : 'concept'

      // Adres-override: alleen opslaan wat afwijkt van de klantkaart, zodat een
      // ongewijzigd blok aan de klant gekoppeld blijft. '' = geen override.
      const overrideVal = (value: string, klantValue?: string): string =>
        value.trim() && value.trim() !== (klantValue ?? '').trim() ? value.trim() : ''

      let adresOverride: Partial<Factuur> = {
        factuur_bedrijfsnaam: overrideVal(adresBedrijfsnaam, selectedKlant?.bedrijfsnaam),
        factuur_tav: overrideVal(adresTav, selectedKlant?.contactpersoon),
        factuur_adres: overrideVal(adresRegel, selectedKlant?.adres),
        factuur_postcode: overrideVal(adresPostcode, selectedKlant?.postcode),
        factuur_plaats: overrideVal(adresPlaats, selectedKlant?.stad),
      }

      // Expliciete keuze om het adres ook op de klantkaart op te slaan. Daarna
      // houdt de klant het adres bij en is de per-factuur override overbodig.
      if (adresOokOpKlant && klantId) {
        try {
          const klantAdres = {
            bedrijfsnaam: adresBedrijfsnaam.trim(),
            contactpersoon: adresTav.trim(),
            adres: adresRegel.trim(),
            postcode: adresPostcode.trim(),
            stad: adresPlaats.trim(),
          }
          await updateKlant(klantId, klantAdres)
          setKlanten((prev) => prev.map((k) => (k.id === klantId ? { ...k, ...klantAdres } : k)))
          adresOverride = {
            factuur_bedrijfsnaam: '', factuur_tav: '', factuur_adres: '',
            factuur_postcode: '', factuur_plaats: '',
          }
        } catch (err) {
          logger.error('Adres op klantkaart bijwerken mislukt:', err)
          toast.error('Adres kon niet op de klantkaart opgeslagen worden')
        }
      }

      if (isEditMode && existingFactuur) {
        const updates: Partial<Factuur> = {
          ...adresOverride,
          klant_id: klantId,
          klant_naam: selectedKlant?.bedrijfsnaam || '',
          contactpersoon_id: contactpersoonId || undefined,
          titel,
          factuurdatum,
          vervaldatum,
          voorwaarden,
          notities,
          intro_tekst: introTekst || undefined,
          outro_tekst: outroTekst || undefined,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
          kostenplaats_id: kostenplaatsId || undefined,
          werkbon_id: werkbonId || undefined,
          ...(verwerken ? { nummer: effectiefNummer, status: 'open' as const } : {}),
        }
        const updated = await updateFactuur(existingFactuur.id, updates)
        setExistingFactuur({ ...existingFactuur, ...updated })
        setNummer(updated.nummer ?? nummer)
        setIsDirty(false)
        toast.success(verwerken ? `Factuur ${effectiefNummer} verwerkt` : 'Factuur bijgewerkt')
      } else {
        const betaalToken = generateBetaalToken()
        const betaalLink = `${window.location.origin}/betalen/${betaalToken}`

        const newFactuur = await createFactuur({
          ...adresOverride,
          user_id: user?.id || '',
          klant_id: klantId,
          klant_naam: selectedKlant?.bedrijfsnaam || '',
          contactpersoon_id: contactpersoonId || undefined,
          offerte_id: offerteId || undefined,
          project_id: projectId || undefined,
          nummer: effectiefNummer,
          titel,
          status: doelStatus,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
          betaald_bedrag: 0,
          factuurdatum,
          vervaldatum,
          notities,
          voorwaarden,
          intro_tekst: introTekst || undefined,
          outro_tekst: outroTekst || undefined,
          bron_type: offerteId ? 'offerte' : 'handmatig',
          bron_offerte_id: offerteId || undefined,
          bron_project_id: projectId || undefined,
          betaal_token: betaalToken,
          betaal_token_verloopt_op: factuurBetaalTokenExpiry(),
          betaal_link: betaalLink,
          factuur_type: isCredit ? 'creditnota' : 'standaard',
          kostenplaats_id: kostenplaatsId || undefined,
          werkbon_id: werkbonId || undefined,
          credit_voor_factuur_id: creditVoorFactuurId || undefined,
          gerelateerde_factuur_id: creditVoorFactuurId || undefined,
        })
        logCreate({ user, entityType: 'factuur', entityId: newFactuur.id, omschrijving: isCreditFactuur ? 'Creditnota' : undefined })

        for (let i = 0; i < validItems.length; i++) {
          const item = validItems[i]
          await createFactuurItem({
            user_id: user?.id || '',
            factuur_id: newFactuur.id,
            beschrijving: item.beschrijving,
            aantal: item.aantal,
            eenheidsprijs: item.eenheidsprijs,
            btw_percentage: item.btw_percentage,
            korting_percentage: item.korting_percentage,
            totaal: calcLineTotal(item),
            volgorde: i + 1,
            grootboek_code: item.grootboek_code || '',
            detail_regels: (item.detail_regels || []).filter((r) => r.label || r.waarde),
          })
        }

        // Credit factuur: markeer origineel als gecrediteerd
        if (isCreditFactuur && creditVoorFactuurId) {
          try {
            await updateFactuur(creditVoorFactuurId, { status: 'gecrediteerd' })
          } catch (err) {
            logger.error('Kon originele factuur niet als gecrediteerd markeren:', err)
          }
        }

        // Update offerte met factuur link (bidirectioneel) en zet status op gefactureerd
        if (offerteId) {
          try {
            // Haal bestaande offerte op voor factuur_ids array
            const bestaandeOfferte = allOffertes.find((o) => o.id === offerteId)
            const bestaandeFactuurIds = bestaandeOfferte?.factuur_ids || []
            await updateOfferte(offerteId, {
              geconverteerd_naar_factuur_id: newFactuur.id,
              status: 'gefactureerd',
              factuur_ids: [...bestaandeFactuurIds, newFactuur.id],
              geconverteerd_naar_factuur_op: bestaandeOfferte?.geconverteerd_naar_factuur_op || new Date().toISOString(),
            })
          } catch (err) {
            logger.error('Kon offerte status niet bijwerken:', err)
          }

          // Update project status als alle offertes nu gefactureerd zijn
          if (projectId) {
            try {
              const projectOffertes = await getOffertesByProject(projectId)
              const alleGefactureerd = projectOffertes.length > 0 && projectOffertes.every(
                (o) => o.id === offerteId ? true : o.status === 'gefactureerd'
              )
              if (alleGefactureerd) {
                const huidigProject = await getProject(projectId).catch(() => null)
                await updateProject(projectId, { status: 'afgerond' })
                if (user?.id && huidigProject?.status) {
                  const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
                  logWijziging({ userId: user.id, entityType: 'project', entityId: projectId, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: huidigProject.status, nieuweWaarde: 'afgerond' })
                }
                toast.info('Project status bijgewerkt naar afgerond')
              }
            } catch (err) {
              logger.error('Kon project status niet bijwerken:', err)
            }
          }
        }

        // DEEL 4: Update project status na opslaan
        if (projectId && !offerteId) {
          try {
            const [projectOffertes, projectFacturen] = await Promise.all([
              getOffertesByProject(projectId).catch(() => []),
              getFacturenByProject(projectId).catch(() => []),
            ])
            const offerteTotaal = round2(projectOffertes.reduce((sum, o) => sum + o.totaal, 0))
            // Include the just-created factuur in the total
            const gefactureerdTotaal = round2(
              projectFacturen
                .filter((f) => f.status !== 'gecrediteerd')
                .reduce((sum, f) => sum + f.totaal, 0) + totaal
            )
            if (offerteTotaal > 0 && gefactureerdTotaal >= offerteTotaal) {
              const huidigProject = await getProject(projectId).catch(() => null)
              await updateProject(projectId, { status: 'gefactureerd' })
              if (user?.id && huidigProject?.status) {
                const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
                logWijziging({ userId: user.id, entityType: 'project', entityId: projectId, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: huidigProject.status, nieuweWaarde: 'gefactureerd' })
              }
              toast.info('Project status bijgewerkt naar gefactureerd')
            }
          } catch (err) {
            logger.error('Kon project status niet bijwerken:', err)
          }
        }

        // Check of er nog meer offertes te factureren zijn
        const opslaanMelding = verwerken ? `Factuur ${effectiefNummer} verwerkt` : 'Concept opgeslagen'
        const nextOfferte = teFacturerenOffertes.find((o) => o.id !== offerteId)
        if (nextOfferte) {
          toast.success(opslaanMelding, {
            action: {
              label: `Volgende: ${nextOfferte.nummer}`,
              onClick: () => {
                const params = new URLSearchParams({
                  offerte_id: nextOfferte.id,
                  klant_id: nextOfferte.klant_id,
                })
                if (nextOfferte.titel) params.set('titel', nextOfferte.titel)
                if (nextOfferte.project_id) params.set('project_id', nextOfferte.project_id)
                navigate(`/facturen/nieuw?${params.toString()}`)
              },
            },
            duration: 8000,
          })
        } else {
          toast.success(opslaanMelding)
        }
        navigate(`/facturen/${newFactuur.id}`)
        return
      }
    } catch (err) {
      logger.error('Fout bij opslaan factuur:', err)
      toast.error('Kon factuur niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [
    klantId, contactpersoonId, selectedKlant, titel, validItems, isEditMode, existingFactuur,
    factuurdatum, vervaldatum, voorwaarden, notities, introTekst, outroTekst,
    subtotaal, btwBedrag, totaal, nummer, offerteId, projectId, user, navigate,
    kostenplaatsId, isCreditFactuur, creditVoorFactuurId,
    isTrialBlocked, setShowTrialDialog, factuurPrefix, factuurStartNummer,
  ])

  // ============ PDF ============

  const handleDownloadPdf = useCallback(async () => {
    if (!selectedKlant) {
      toast.error('Selecteer eerst een klant')
      return
    }

    const pdfNummer = nummer || 'CONCEPT'
    const filename = `Factuur-${pdfNummer}.pdf`

    // Storage-first: lees gepersisteerde PDF als die bestaat.
    if (existingFactuur?.pdf_storage_path) {
      try {
        const blob = await downloadFactuurPdfFromStorage(existingFactuur.pdf_storage_path)
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast.success(<>PDF gedownload<span style={{ color: '#F15025' }}>.</span></>)
          return
        }
      } catch (storageErr) {
        logger.warn('PDF Storage-download mislukt, val terug op on-the-fly:', storageErr)
      }
    }

    // Fallback: on-the-fly generatie (oude facturen zonder pdf_storage_path,
    // of Storage-failure).
    const bedrijfsProfiel = { ...profile, primaireKleur }
    const factuurData = {
      nummer: pdfNummer,
      titel,
      datum: factuurdatum,
      vervaldatum,
      subtotaal,
      btw_bedrag: btwBedrag,
      totaal,
      notities: notities || undefined,
      betaalvoorwaarden: voorwaarden || undefined,
      factuur_type: (isCredit ? 'creditnota' : existingFactuur?.factuur_type || 'standaard') as string,
      betaal_link: existingFactuur?.betaal_link || undefined,
      credit_voor_nummer: creditVoorNummer || undefined,
      outro_tekst: outroTekst || undefined,
      factuur_bedrijfsnaam: adresBedrijfsnaam || undefined,
      factuur_tav: adresTav || undefined,
      factuur_adres: adresRegel || undefined,
      factuur_postcode: adresPostcode || undefined,
      factuur_plaats: adresPlaats || undefined,
    }

    const pdfItems: OfferteItem[] = validItems.map((item, idx) => ({
      id: item.id,
      offerte_id: '',
      beschrijving: item.beschrijving,
      aantal: item.aantal,
      eenheidsprijs: item.eenheidsprijs,
      btw_percentage: item.btw_percentage,
      korting_percentage: item.korting_percentage,
      totaal: calcLineTotal(item),
      volgorde: idx + 1,
      detail_regels: item.detail_regels || [],
      created_at: new Date().toISOString(),
    }))

    try {
      const doc = generateFactuurPDF(factuurData, pdfItems, selectedKlant, bedrijfsProfiel, documentStyle)
      doc.save(filename)
      toast.success(<>PDF gedownload<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('Fout bij genereren PDF:', err)
      toast.error('Kon PDF niet genereren')
    }
  }, [selectedKlant, profile, primaireKleur, nummer, titel, factuurdatum, vervaldatum, subtotaal, btwBedrag, totaal, notities, voorwaarden, validItems, documentStyle, existingFactuur, creditVoorNummer, isCreditFactuur])

  // ============ UBL XML ============

  const handleDownloadUbl = useCallback(() => {
    if (!selectedKlant) {
      toast.error('Selecteer eerst een klant')
      return
    }

    try {
      // Zoek kostenplaats code voor UBL
      const selectedKostenplaats = kostenplaatsen.find((k) => k.id === kostenplaatsId)
      const xml = generateUBLInvoice({
        factuur: {
          nummer,
          titel,
          factuurdatum,
          vervaldatum,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
          factuur_type: isCredit ? 'creditnota' : (existingFactuur?.factuur_type || 'standaard'),
          notities: notities || '',
          voorwaarden: voorwaarden || '',
          kostenplaats_code: selectedKostenplaats ? `${selectedKostenplaats.code} - ${selectedKostenplaats.naam}` : undefined,
          credit_voor_nummer: creditVoorNummer || undefined,
        },
        items: validItems.map((item, idx) => ({
          beschrijving: item.beschrijving,
          aantal: item.aantal,
          eenheidsprijs: item.eenheidsprijs,
          btw_percentage: item.btw_percentage,
          korting_percentage: item.korting_percentage,
          totaal: calcLineTotal(item),
          volgorde: idx + 1,
          grootboek_code: item.grootboek_code || undefined,
        })),
        klant: selectedKlant,
        profiel: profile || {},
      })
      downloadUBLXml(xml, `factuur-${nummer}.xml`)
      toast.success('UBL XML gedownload')
    } catch (err) {
      logger.error('Fout bij genereren UBL:', err)
      toast.error('Kon UBL XML niet genereren')
    }
  }, [selectedKlant, profile, nummer, titel, factuurdatum, vervaldatum, subtotaal, btwBedrag, totaal, notities, voorwaarden, validItems, existingFactuur])

  // ============ STANDAARD FACTUUR-CONTACT ============

  const handleToggleStandaard = useCallback(async (newValue: boolean) => {
    if (!resolvedCp || !klantId || !user?.id) return
    try {
      if (newValue) {
        if (factuurStandaardCpId && factuurStandaardCpId !== resolvedCp.id) {
          await updateContactpersoonDB(factuurStandaardCpId, { is_factuur_standaard: false })
        }
        if (resolvedCp.source === 'jsonb') {
          const klant = klanten.find((k) => k.id === klantId)
          const jsonbCp = klant?.contactpersonen?.find((c) => c.id === resolvedCp.id)
          if (!klant || !jsonbCp) return
          const parts = (jsonbCp.naam || '').trim().split(/\s+/)
          const created = await createContactpersoonDB({
            klant_id: klantId,
            voornaam: parts[0] || '',
            achternaam: parts.slice(1).join(' '),
            email: jsonbCp.email || '',
            telefoon: jsonbCp.telefoon || '',
            functie: jsonbCp.functie || '',
            notities: '',
            user_id: user.id,
            is_factuur_standaard: true,
          })
          const cleaned = (klant.contactpersonen || []).filter((c) => c.id !== resolvedCp.id)
          await updateKlant(klantId, { contactpersonen: cleaned })
          const fresh = await getKlanten()
          setKlanten(fresh)
          setContactpersoonId(created.id)
          setFactuurStandaardCpId(created.id)
        } else {
          await updateContactpersoonDB(resolvedCp.id, { is_factuur_standaard: true })
          setFactuurStandaardCpId(resolvedCp.id)
        }
        toast.success(`${resolvedCp.naam} is nu de standaard factuur-contact`)
      } else if (resolvedCp.source === 'db' && factuurStandaardCpId === resolvedCp.id) {
        await updateContactpersoonDB(resolvedCp.id, { is_factuur_standaard: false })
        setFactuurStandaardCpId(null)
        toast.success('Standaard factuur-contact verwijderd')
      }
    } catch (err) {
      logger.error('Standaard factuur-contact opslaan mislukt:', err)
      toast.error('Kon standaard niet opslaan')
    }
  }, [resolvedCp, klantId, factuurStandaardCpId, klanten, user])

  // ============ SEND EMAIL ============

  const handleSendFactuur = useCallback(async () => {
    if (!existingFactuur || !selectedKlant) return
    const ontvangerEmail = resolvedCp?.email || selectedKlant.email || ''
    if (!ontvangerEmail) {
      toast.error('Geen email-adres bekend voor deze klant · voeg een contactpersoon toe.')
      return
    }

    try {
      setIsSending(true)

      const { subject, html } = factuurVerzendTemplate({
        klantNaam: resolvedCp?.naam || selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam,
        factuurNummer: nummer,
        factuurTitel: titel,
        totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaal),
        vervaldatum: formatDate(vervaldatum),
        bedrijfsnaam,
        primaireKleur,
        handtekening: emailHandtekening || undefined,
        logoUrl: profile?.logo_url || undefined,
        betaalUrl: existingFactuur.betaal_link || undefined,
        persoonlijkBericht: persoonlijkBericht.trim() || undefined,
      })

      // Generate PDF attachment · eerst proberen via Storage (persistente kopie),
      // bij ELKE failure fallback naar on-the-fly generatie zodat de email nooit
      // door een Storage-issue geblokkeerd wordt.
      let attachments: Array<{
        filename: string;
        content?: string;
        encoding?: 'base64';
        storagePath?: string;
        bucket?: string;
        cleanupAfter?: boolean;
      }> | undefined
      try {
        const bedrijfsProfiel = { ...profile, primaireKleur }
        const factuurData = {
          nummer,
          titel,
          datum: factuurdatum,
          vervaldatum,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
          notities: notities || undefined,
          betaalvoorwaarden: voorwaarden || undefined,
          factuur_type: (isCredit ? 'creditnota' : existingFactuur.factuur_type || 'standaard') as string,
          betaal_link: existingFactuur.betaal_link || undefined,
          outro_tekst: outroTekst || undefined,
          factuur_bedrijfsnaam: adresBedrijfsnaam || undefined,
          factuur_tav: adresTav || undefined,
          factuur_adres: adresRegel || undefined,
          factuur_postcode: adresPostcode || undefined,
          factuur_plaats: adresPlaats || undefined,
        }
        const pdfItems: OfferteItem[] = validItems.map((item, idx) => ({
          id: item.id,
          offerte_id: '',
          beschrijving: item.beschrijving,
          aantal: item.aantal,
          eenheidsprijs: item.eenheidsprijs,
          btw_percentage: item.btw_percentage,
          korting_percentage: item.korting_percentage,
          totaal: calcLineTotal(item),
          volgorde: idx + 1,
          detail_regels: item.detail_regels || [],
          created_at: new Date().toISOString(),
        }))

        let pdfBase64: string | null = null

        if (existingFactuur.organisatie_id) {
          try {
            const result = await genereerEnUploadFactuurPdf({
              factuurId: existingFactuur.id,
              organisatieId: existingFactuur.organisatie_id,
              factuurData,
              items: pdfItems,
              klant: selectedKlant,
              bedrijfsProfiel,
              docStyle: documentStyle,
            })
            if (result) {
              pdfBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => {
                  const dataUrl = reader.result as string
                  resolve(dataUrl.split(',')[1])
                }
                reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
                reader.readAsDataURL(result.blob)
              })
            }
          } catch (storageErr) {
            logger.warn('PDF Storage-upload of Blob-conversie mislukt, val terug op on-the-fly:', storageErr)
          }
        }

        if (!pdfBase64) {
          const doc = generateFactuurPDF(factuurData, pdfItems, selectedKlant, bedrijfsProfiel, documentStyle)
          pdfBase64 = doc.output('datauristring').split(',')[1]
        }

        attachments = [{ filename: `Factuur-${nummer}.pdf`, content: pdfBase64, encoding: 'base64' }]
      } catch (pdfErr) {
        logger.warn('PDF bijlage genereren mislukt, email wordt zonder bijlage verstuurd:', pdfErr)
        toast.warning('PDF bijlage kon niet gegenereerd worden · email wordt zonder bijlage verstuurd')
      }

      // Werkbon PDF als extra bijlage (als gekoppeld)
      if (werkbonId && attachments) {
        try {
          const wb = await getWerkbon(werkbonId)
          const wbItems = await getWerkbonItems(wb.id)
          const wbFotos = await getWerkbonFotos(wb.id)
          const project = projectId ? await getProject(projectId).catch(() => null) : null
          const bedrijfsProfiel = { ...profile, primaireKleur }
          const aanmakerNaamWb = wb.user_id ? medewerkers.find((m) => m.user_id === wb.user_id)?.naam : undefined
          const wbDoc = generateWerkbonInstructiePDF(
            {
              werkbon_nummer: wb.werkbon_nummer,
              titel: wb.titel,
              datum: wb.datum,
              locatie_adres: wb.locatie_adres,
              locatie_stad: wb.locatie_stad,
              locatie_postcode: wb.locatie_postcode,
              contact_naam: wb.contact_naam,
              contact_telefoon: wb.contact_telefoon,
              toon_briefpapier: wb.toon_briefpapier ?? true,
              status: wb.status,
              uren_gewerkt: wb.uren_gewerkt,
              monteur_opmerkingen: wb.monteur_opmerkingen,
              klant_handtekening: wb.klant_handtekening,
              klant_naam_getekend: wb.klant_naam_getekend,
              aanmaker_naam: aanmakerNaamWb,
            },
            wbItems,
            selectedKlant,
            project?.naam || '',
            bedrijfsProfiel,
            documentStyle,
            { fotos: wbFotos }
          )
          const wbBase64 = wbDoc.output('datauristring').split(',')[1]
          attachments.push({ filename: `Werkbon-${wb.werkbon_nummer}.pdf`, content: wbBase64, encoding: 'base64' })
        } catch (wbErr) {
          logger.warn('Werkbon PDF bijlage mislukt:', wbErr)
        }
      }

      // Gekoppelde offerte als PDF meesturen (optioneel, standaard aan zolang
      // er een offerte gekoppeld is). Mislukt de generatie, dan gaat de mail
      // gewoon zonder de offerte de deur uit.
      if (stuurOfferteMee && offerteId && attachments) {
        try {
          const offerte = allOffertes.find((o) => o.id === offerteId)
          if (offerte) {
            const offerteItems = await getOfferteItems(offerteId)
            const bedrijfsProfiel = { ...profile, primaireKleur }
            const offerteDoc = await generateOffertePDF(offerte, offerteItems, selectedKlant, bedrijfsProfiel, documentStyle)
            const offerteBase64 = offerteDoc.output('datauristring').split(',')[1]
            attachments.push({ filename: `Offerte-${offerte.nummer}.pdf`, content: offerteBase64, encoding: 'base64' })
          }
        } catch (offErr) {
          logger.warn('Offerte PDF bijlage mislukt:', offErr)
        }
      }

      // Geselecteerde factuur-bijlagen (klant-inkooporders e.d.) meesturen.
      // Bucket 'factuur-bijlagen' is persistent; send-email mag niet opruimen.
      if (attachments) {
        const geselecteerd = dialogBijlagen.filter((b) => selectedBijlageIds.has(b.id))
        for (const bij of geselecteerd) {
          attachments.push({
            filename: bij.bestandsnaam,
            storagePath: bij.storage_path,
            bucket: 'factuur-bijlagen',
            cleanupAfter: false,
          })
        }
      }

      await sendEmail(ontvangerEmail, subject, '', { html, attachments })

      const updated = await updateFactuur(existingFactuur.id, { status: 'verzonden' })
      setExistingFactuur({ ...existingFactuur, ...updated, status: 'verzonden' })

      // Update gekoppeld project naar 'gefactureerd'
      if (existingFactuur.project_id) {
        try {
          const huidigProject = await getProject(existingFactuur.project_id).catch(() => null)
          await updateProject(existingFactuur.project_id, { status: 'gefactureerd' })
          if (user?.id && huidigProject?.status) {
            const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
            logWijziging({ userId: user.id, entityType: 'project', entityId: existingFactuur.project_id, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: huidigProject.status, nieuweWaarde: 'gefactureerd' })
          }
        } catch (err) { logger.error('Update project status na verzenden:', err) }
      }

      setSendDialogOpen(false)
      setPersoonlijkBericht(STANDAARD_VERZEND_BERICHT)
      toast.success(`Factuur ${nummer} verzonden naar ${ontvangerEmail}`)
    } catch (err) {
      logger.error('Fout bij verzenden factuur:', err)
      toast.error('Kon factuur niet verzenden')
    } finally {
      setIsSending(false)
    }
  }, [existingFactuur, selectedKlant, resolvedCp, nummer, titel, totaal, vervaldatum, bedrijfsnaam, primaireKleur, emailHandtekening, profile, factuurdatum, subtotaal, btwBedrag, notities, voorwaarden, validItems, isCreditFactuur, documentStyle, werkbonId, projectId, dialogBijlagen, selectedBijlageIds, medewerkers, stuurOfferteMee, offerteId, allOffertes, persoonlijkBericht])

  // Live e-mailvoorbeeld voor het verzendvenster: exact dezelfde template als
  // de daadwerkelijke verzending, zodat persoonlijk bericht én standaardtekst
  // samen zichtbaar zijn vóór het versturen.
  const verzendVoorbeeldHtml = useMemo(() => {
    if (!selectedKlant) return ''
    try {
      const { html } = factuurVerzendTemplate({
        klantNaam: resolvedCp?.naam || selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam,
        factuurNummer: nummer,
        factuurTitel: titel,
        totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaal),
        vervaldatum: formatDate(vervaldatum),
        bedrijfsnaam,
        primaireKleur,
        handtekening: emailHandtekening || undefined,
        logoUrl: profile?.logo_url || undefined,
        betaalUrl: existingFactuur?.betaal_link || undefined,
        persoonlijkBericht: persoonlijkBericht.trim() || undefined,
      })
      return html
    } catch {
      return ''
    }
  }, [selectedKlant, resolvedCp, nummer, titel, totaal, vervaldatum, bedrijfsnaam, primaireKleur, emailHandtekening, profile, existingFactuur, persoonlijkBericht])

  // ============ MARK AS PAID ============

  const handleMarkAsBetaald = useCallback(async () => {
    if (!existingFactuur) return

    try {
      const updates: Partial<Factuur> = {
        status: 'betaald',
        betaald_bedrag: existingFactuur.totaal,
        betaaldatum: getTodayString(),
      }
      const updated = await updateFactuurStatus(existingFactuur.id, updates)
      setExistingFactuur({ ...existingFactuur, ...updated, ...updates })
      if (user?.id) {
        const naam = user.user_metadata?.voornaam ? `${user.user_metadata.voornaam} ${user.user_metadata.achternaam || ''}`.trim() : user.email || ''
        logWijziging({ userId: user.id, entityType: 'factuur', entityId: existingFactuur.id, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: existingFactuur.status, nieuweWaarde: 'betaald' })
      }
      // Update gekoppeld project naar 'gefactureerd'
      if (existingFactuur.project_id) {
        try {
          const huidigProject = await getProject(existingFactuur.project_id).catch(() => null)
          await updateProject(existingFactuur.project_id, { status: 'gefactureerd' })
          if (user?.id && huidigProject?.status) {
            const naam = medewerkers.find(m => m.user_id === user.id)?.naam ?? user.email ?? ''
            logWijziging({ userId: user.id, entityType: 'project', entityId: existingFactuur.project_id, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: huidigProject.status, nieuweWaarde: 'gefactureerd' })
          }
        } catch (err) { logger.error('Update project status na betaling:', err) }
      }
      toast.success(`${nummer} gemarkeerd als betaald`)
    } catch (err) {
      logger.error('Markeer als betaald:', err)
      toast.error('Kon status niet bijwerken')
    }
  }, [existingFactuur, nummer, user])

  // ============ DELETE ============

  const handleDeleteFactuur = useCallback(async () => {
    if (!existingFactuur) return

    try {
      await deleteFactuur(existingFactuur.id)
      toast.success(`${nummer} verwijderd`)
      navigate('/facturen')
    } catch (err) {
      logger.error('Delete factuur:', err)
      toast.error('Kon factuur niet verwijderen')
    }
  }, [existingFactuur, nummer, navigate])

  // ============ CREDITNOTA ============

  const handleCreateCreditnota = useCallback(async () => {
    if (!existingFactuur) return
    if (isTrialBlocked) {
      setShowTrialDialog(true)
      return
    }
    if (!creditReden.trim()) {
      toast.error('Vul een reden in voor de creditnota')
      return
    }

    try {
      setIsSaving(true)
      const cnNummer = creditnotaDoornummeren
        ? await generateFactuurNrDb(factuurPrefix, factuurStartNummer)
        : generateTypedNummer(allFacturen, 'CN')

      const cnToken = generateBetaalToken()
      const creditnota: Omit<Factuur, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user?.id || '',
        klant_id: existingFactuur.klant_id,
        klant_naam: selectedKlant?.bedrijfsnaam || existingFactuur.klant_naam || '',
        offerte_id: existingFactuur.offerte_id,
        project_id: existingFactuur.project_id,
        nummer: cnNummer,
        titel: `Creditnota voor ${existingFactuur.nummer}`,
        status: 'concept',
        subtotaal: round2(-existingFactuur.subtotaal),
        btw_bedrag: round2(-existingFactuur.btw_bedrag),
        totaal: round2(-existingFactuur.totaal),
        betaald_bedrag: 0,
        factuurdatum: getTodayString(),
        vervaldatum: getDefaultVervaldatum(getTodayString()),
        notities: `Creditnota: ${creditReden}`,
        voorwaarden: existingFactuur.voorwaarden,
        factuur_type: 'creditnota',
        betaal_token: cnToken,
        betaal_token_verloopt_op: factuurBetaalTokenExpiry(),
        betaal_link: `${window.location.origin}/betalen/${cnToken}`,
        gerelateerde_factuur_id: existingFactuur.id,
        credit_reden: creditReden,
      }

      const saved = await createFactuur(creditnota)

      // Kopieer items als negatieve bedragen (zelfde patroon als
      // factuurService.createCreditnota) · zonder regels kan de creditnota
      // niet naar de boekhouding gesynct worden.
      const origineleItems = await getFactuurItems(existingFactuur.id)
      for (const item of origineleItems) {
        await createFactuurItem({
          user_id: user?.id || '',
          factuur_id: saved.id,
          beschrijving: item.beschrijving,
          aantal: -item.aantal,
          eenheidsprijs: round2(item.eenheidsprijs),
          btw_percentage: item.btw_percentage,
          korting_percentage: item.korting_percentage,
          totaal: round2(-item.totaal),
          volgorde: item.volgorde,
          detail_regels: item.detail_regels || [],
        } as Omit<FactuurItem, 'id' | 'created_at'>)
      }

      logCreate({ user, entityType: 'factuur', entityId: saved.id, omschrijving: `Creditnota op factuur ${existingFactuur.nummer}` })

      // Mark original as gecrediteerd
      await updateFactuur(existingFactuur.id, { status: 'gecrediteerd' })
      setExistingFactuur({ ...existingFactuur, status: 'gecrediteerd' })

      setCreditnotaDialogOpen(false)
      toast.success(`Creditnota ${cnNummer} aangemaakt`)
      navigate(`/facturen/${saved.id}`)
    } catch (err) {
      logger.error('Aanmaken creditnota:', err)
      toast.error('Fout bij aanmaken creditnota')
    } finally {
      setIsSaving(false)
    }
  }, [existingFactuur, creditReden, allFacturen, selectedKlant, user, navigate, isTrialBlocked, setShowTrialDialog])

  // ============ HERINNERING ============

  const getVolgendeHerinnering = useCallback((): HerinneringTemplate['type'] | null => {
    if (!existingFactuur || dagenVervallen <= 0) return null
    if (!existingFactuur.herinnering_1_verstuurd && dagenVervallen >= 7) return 'herinnering_1'
    if (!existingFactuur.herinnering_2_verstuurd && dagenVervallen >= 14) return 'herinnering_2'
    if (!existingFactuur.herinnering_3_verstuurd && dagenVervallen >= 21) return 'herinnering_3'
    if (!existingFactuur.aanmaning_verstuurd && dagenVervallen >= 30) return 'aanmaning'
    return null
  }, [existingFactuur, dagenVervallen])

  const replaceHerinneringVars = useCallback((text: string) => {
    if (!existingFactuur || !selectedKlant) return text
    return text
      .replace(/{klant_naam}/g, selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam)
      .replace(/{factuur_nummer}/g, existingFactuur.nummer)
      .replace(/{factuur_bedrag}/g, formatCurrency(existingFactuur.totaal))
      .replace(/{vervaldatum}/g, formatDate(existingFactuur.vervaldatum))
      .replace(/{dagen_verlopen}/g, String(dagenVervallen))
      .replace(/{bedrijfsnaam}/g, bedrijfsnaam || '')
      .replace(/{betaal_link}/g, existingFactuur.betaal_link || '')
  }, [existingFactuur, selectedKlant, dagenVervallen, bedrijfsnaam])

  const openHerinneringDialog = useCallback(() => {
    if (!existingFactuur || !selectedKlant) return
    const type = getVolgendeHerinnering() || 'herinnering_1'
    const template = herinneringTemplates.find((t) => t.type === type)
    if (template) {
      setHerinneringPreview(replaceHerinneringVars(template.inhoud))
    }
    setHerinneringType(type)
    setHerinneringDialogOpen(true)
  }, [existingFactuur, selectedKlant, getVolgendeHerinnering, herinneringTemplates, replaceHerinneringVars])

  const handleVerstuurHerinnering = useCallback(async () => {
    if (!existingFactuur || !selectedKlant?.email) {
      toast.error('Geen emailadres gevonden voor deze klant')
      return
    }

    const template = herinneringTemplates.find((t) => t.type === herinneringType)
    if (!template) {
      toast.error('Geen herinnering template gevonden')
      return
    }

    try {
      setIsSending(true)
      const onderwerp = replaceHerinneringVars(template.onderwerp)

      try {
        const { html } = factuurHerinneringTemplate({
          klantNaam: selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam,
          factuurNummer: existingFactuur.nummer,
          factuurTitel: existingFactuur.titel,
          totaalBedrag: formatCurrency(existingFactuur.totaal),
          vervaldatum: formatDate(existingFactuur.vervaldatum),
          dagenVervallen,
          bedrijfsnaam,
          primaireKleur,
          logoUrl: profile?.logo_url || undefined,
          betaalUrl: existingFactuur.betaal_link || undefined,
        })
        await sendEmail(selectedKlant.email, onderwerp, herinneringPreview, { html })
      } catch (err) {
        logger.error('Verstuur herinnering email:', err)
        toast.warning('Email niet verzonden (SMTP niet geconfigureerd). Herinnering is wel gemarkeerd.')
      }

      const fieldMap: Record<string, string> = {
        herinnering_1: 'herinnering_1_verstuurd',
        herinnering_2: 'herinnering_2_verstuurd',
        herinnering_3: 'herinnering_3_verstuurd',
        aanmaning: 'aanmaning_verstuurd',
      }
      const updateField = fieldMap[herinneringType]
      const updates: Partial<Factuur> = { [updateField]: new Date().toISOString() }

      await updateFactuur(existingFactuur.id, updates)
      setExistingFactuur({ ...existingFactuur, ...updates })

      toast.success(`${template.type === 'aanmaning' ? 'Aanmaning' : 'Herinnering'} verstuurd voor ${existingFactuur.nummer}`)
      setHerinneringDialogOpen(false)
    } catch (err) {
      logger.error('Verstuur herinnering:', err)
      toast.error('Fout bij versturen herinnering')
    } finally {
      setIsSending(false)
    }
  }, [existingFactuur, selectedKlant, herinneringTemplates, herinneringType, herinneringPreview, replaceHerinneringVars, dagenVervallen, bedrijfsnaam, primaireKleur, profile])

  // ============ EXACT SYNC ============

  const handleSyncExact = useCallback(async (attachmentOnly: boolean) => {
    if (!existingFactuur) return

    const loadingMsg = attachmentOnly ? 'Bijlage opnieuw versturen...' : 'Synchroniseren met Exact...'
    const toastId = toast.loading(loadingMsg)

    try {
      const session = await import('@/services/supabaseClient').then(m => m.default?.auth.getSession())
      const token = session?.data?.session?.access_token
      if (!token) { toast.error('Niet ingelogd', { id: toastId }); return }

      // Lazy PDF: zonder pdf_storage_path heeft de server geen bijlage om te
      // koppelen. Geldt voor zowel initial sync als retry · anders krijg je
      // op retry een 400 "Geen PDF beschikbaar".
      if (!existingFactuur.pdf_storage_path && existingFactuur.organisatie_id) {
        try {
          const bedrijfsProfiel = { ...profile, primaireKleur }
          const factuurData = {
            nummer,
            titel,
            datum: factuurdatum,
            vervaldatum,
            subtotaal,
            btw_bedrag: btwBedrag,
            totaal,
            notities: notities || undefined,
            betaalvoorwaarden: voorwaarden || undefined,
            factuur_type: (isCredit ? 'creditnota' : existingFactuur.factuur_type || 'standaard') as string,
            betaal_link: existingFactuur.betaal_link || undefined,
            outro_tekst: outroTekst || undefined,
          }
          const pdfItems: OfferteItem[] = validItems.map((item, idx) => ({
            id: item.id,
            offerte_id: '',
            beschrijving: item.beschrijving,
            aantal: item.aantal,
            eenheidsprijs: item.eenheidsprijs,
            btw_percentage: item.btw_percentage,
            korting_percentage: item.korting_percentage,
            totaal: calcLineTotal(item),
            volgorde: idx + 1,
            detail_regels: item.detail_regels || [],
            created_at: new Date().toISOString(),
          }))
          await genereerEnUploadFactuurPdf({
            factuurId: existingFactuur.id,
            organisatieId: existingFactuur.organisatie_id,
            factuurData,
            items: pdfItems,
            klant: selectedKlant || {},
            bedrijfsProfiel,
            docStyle: documentStyle,
          })
        } catch (pdfErr) {
          logger.warn('Lazy PDF upload vóór sync mislukt, sync gaat door zonder bijlage:', pdfErr)
        }
      }

      const res = await fetch('/api/exact-sync-factuur', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ factuur_id: existingFactuur.id, attachment_only: attachmentOnly }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Sync mislukt')
      }
      const data = await res.json() as {
        exact_entry_id: string
        document_id: string | null
        bijlage_synced: boolean
      }

      setExistingFactuur({
        ...existingFactuur,
        exact_entry_id: data.exact_entry_id,
        exact_synced_at: existingFactuur.exact_synced_at || new Date().toISOString(),
        exact_document_id: data.document_id,
        exact_bijlage_gesynced_op: data.bijlage_synced
          ? new Date().toISOString()
          : existingFactuur.exact_bijlage_gesynced_op,
      })

      const successMsg = attachmentOnly
        ? 'Bijlage opnieuw verstuurd naar Exact Online'
        : 'Factuur gesynchroniseerd met Exact Online'
      toast.success(successMsg, { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync mislukt'
      toast.error(msg, { id: toastId })
    }
  }, [existingFactuur, profile, primaireKleur, nummer, titel, factuurdatum, vervaldatum, subtotaal, btwBedrag, totaal, notities, voorwaarden, validItems, isCreditFactuur, selectedKlant, documentStyle])

  // ============ BOEKHOUD SYNC (SnelStart / Moneybird / e-Boekhouden) ============

  const handleSyncBoekhouding = useCallback(async () => {
    if (!existingFactuur || boekhoudSyncing) return
    const pakket = settings.boekhoud_pakket
    if (!pakket) return
    // De server boekt de DB-staat; met onopgeslagen wijzigingen zouden
    // boeking (oude regels) en PDF (nieuwe editor-staat) uiteenlopen.
    if (isDirty) {
      toast.error('Sla de factuur eerst op voordat je naar de boekhouding synct')
      return
    }
    setBoekhoudSyncing(true)
    const pakketNaam = BOEKHOUD_PAKKET_NAAM[pakket]
    const toastId = toast.loading(`Synchroniseren met ${pakketNaam}...`)

    try {
      const session = await import('@/services/supabaseClient').then(m => m.default?.auth.getSession())
      const token = session?.data?.session?.access_token
      if (!token) { toast.error('Niet ingelogd', { id: toastId }); return }

      // Alleen Moneybird accepteert een PDF-bijlage; genereer die lazy,
      // zelfde patroon als handleSyncExact.
      if (pakket === 'moneybird' && !existingFactuur.pdf_storage_path && existingFactuur.organisatie_id) {
        try {
          const bedrijfsProfiel = { ...profile, primaireKleur }
          const factuurData = {
            nummer,
            titel,
            datum: factuurdatum,
            vervaldatum,
            subtotaal,
            btw_bedrag: btwBedrag,
            totaal,
            notities: notities || undefined,
            betaalvoorwaarden: voorwaarden || undefined,
            factuur_type: (isCredit ? 'creditnota' : existingFactuur.factuur_type || 'standaard') as string,
            betaal_link: existingFactuur.betaal_link || undefined,
            outro_tekst: outroTekst || undefined,
          }
          const pdfItems: OfferteItem[] = validItems.map((item, idx) => ({
            id: item.id,
            offerte_id: '',
            beschrijving: item.beschrijving,
            aantal: item.aantal,
            eenheidsprijs: item.eenheidsprijs,
            btw_percentage: item.btw_percentage,
            korting_percentage: item.korting_percentage,
            totaal: calcLineTotal(item),
            volgorde: idx + 1,
            detail_regels: item.detail_regels || [],
            created_at: new Date().toISOString(),
          }))
          await genereerEnUploadFactuurPdf({
            factuurId: existingFactuur.id,
            organisatieId: existingFactuur.organisatie_id,
            factuurData,
            items: pdfItems,
            klant: selectedKlant || {},
            bedrijfsProfiel,
            docStyle: documentStyle,
          })
        } catch (pdfErr) {
          logger.warn('Lazy PDF upload vóór boekhoud-sync mislukt, sync gaat door zonder bijlage:', pdfErr)
        }
      }

      const res = await fetch(`/api/${pakket}-sync-factuur`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ factuur_id: existingFactuur.id }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Sync mislukt')
      }
      const data = await res.json() as { extern_id: string; waarschuwing?: string }

      setExistingFactuur({
        ...existingFactuur,
        boekhoud_pakket: pakket,
        boekhoud_extern_id: data.extern_id,
        boekhoud_synced_at: new Date().toISOString(),
      })

      if (data.waarschuwing) {
        toast.warning(data.waarschuwing, { id: toastId, duration: 10000 })
      } else {
        toast.success(`Factuur gesynchroniseerd met ${pakketNaam}`, { id: toastId })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync mislukt'
      toast.error(msg, { id: toastId })
    } finally {
      setBoekhoudSyncing(false)
    }
  }, [existingFactuur, boekhoudSyncing, isDirty, settings.boekhoud_pakket, profile, primaireKleur, nummer, titel, factuurdatum, vervaldatum, subtotaal, btwBedrag, totaal, notities, voorwaarden, validItems, isCredit, selectedKlant, documentStyle, outroTekst])

  // ============ LOADING ============

  if (isLoading) {
    return <FactuurEditorSkeleton />
  }

  // ============ RENDER ============

  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 pt-3">
        <BackButton fallbackPath="/facturen" />
      </div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-[-0.03em]">
                  {isEditMode
                    ? (nummer ? `${isCreditFactuur ? 'Creditfactuur' : 'Factuur'} ${nummer}` : 'Concept')
                    : (isCreditFactuur ? 'Nieuwe creditfactuur' : 'Nieuwe factuur')}
                </h1>
              </div>
              <p className="text-xs font-mono text-muted-foreground">{nummer || 'Concept'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit mode actions */}
            {isEditMode && existingFactuur && (
              <>
                {/* Send button + verzendadres-preview. Mailen kan pas nadat de
                    factuur is verwerkt (nummer toegekend, status verzonden). */}
                {(currentStatus === 'open' || currentStatus === 'verzonden' || currentStatus === 'vervallen' || isVervallen) && (() => {
                  const sendEmail = resolvedCp?.email || selectedKlant?.email || ''
                  const sendName = resolvedCp?.naam || 'Hoofdadres'
                  return (
                    <div className="flex items-center gap-2">
                      {sendEmail && (
                        <span
                          className="hidden xl:inline-flex items-center gap-1 text-xs text-muted-foreground max-w-[280px] truncate"
                          title={`Versturen naar ${sendEmail}`}
                        >
                          <span aria-hidden>→</span>
                          <span className="truncate">
                            {sendName} · <span className="font-mono">{sendEmail}</span>
                          </span>
                        </span>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setSendDialogOpen(true)}
                        disabled={!sendEmail}
                        title={sendEmail ? `Versturen naar ${sendEmail}` : 'Geen verzendadres bekend'}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Versturen
                      </Button>
                    </div>
                  )
                })()}

                {/* Mark as paid */}
                {(currentStatus === 'open' || currentStatus === 'verzonden' || currentStatus === 'vervallen' || isVervallen) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAsBetaald}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Markeer als betaald
                  </Button>
                )}

                {/* Reminder button */}
                {isVervallen && getVolgendeHerinnering() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openHerinneringDialog}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/30"
                  >
                    <Bell className="h-4 w-4 mr-1" />
                    Herinnering
                  </Button>
                )}

                {/* Exact Online sync */}
                {settings.exact_online_connected && existingFactuur && (
                  existingFactuur.exact_synced_at ? (
                    <div className="flex items-center gap-1">
                      <Badge
                        className="bg-[hsl(var(--status-green-bg))] text-[#2D6B48] text-xs gap-1"
                        title={`Exact gesynchroniseerd op ${new Date(existingFactuur.exact_synced_at).toLocaleDateString('nl-NL')}`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Exact
                      </Badge>
                      {existingFactuur.exact_bijlage_gesynced_op ? (
                        <Badge
                          className="bg-[hsl(var(--status-green-bg))] text-[#2D6B48] text-xs gap-1"
                          title={`Bijlage gesynchroniseerd op ${new Date(existingFactuur.exact_bijlage_gesynced_op).toLocaleDateString('nl-NL')}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Bijlage
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1 bg-[#FEF3E2] text-[#C56A1A] border-[#FEA060]/40 hover:bg-[#FCEED1]"
                          onClick={() => handleSyncExact(true)}
                          title="Bijlage ontbreekt in Exact · klik om opnieuw te proberen"
                        >
                          <AlertCircle className="w-3 h-3" />
                          Bijlage opnieuw
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-petrol border-petrol/20 hover:bg-petrol/5 gap-1"
                      onClick={() => handleSyncExact(false)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync Exact
                    </Button>
                  )
                )}

                {/* Boekhoudpakket sync (SnelStart / Moneybird / e-Boekhouden).
                    De badge hangt aan de factuur-historie, de knop aan het
                    actieve pakket · zo blijft de gesynct-status zichtbaar na
                    een pakketwissel of wissel naar "Geen". */}
                {existingFactuur?.boekhoud_synced_at && existingFactuur.boekhoud_pakket && (
                  <Badge
                    className="bg-[hsl(var(--status-green-bg))] text-[#2D6B48] text-xs gap-1"
                    title={`${BOEKHOUD_PAKKET_NAAM[existingFactuur.boekhoud_pakket]} gesynchroniseerd op ${new Date(existingFactuur.boekhoud_synced_at).toLocaleDateString('nl-NL')}`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {BOEKHOUD_PAKKET_NAAM[existingFactuur.boekhoud_pakket]}
                  </Badge>
                )}
                {settings.boekhoud_pakket && existingFactuur && !existingFactuur.boekhoud_synced_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-petrol border-petrol/20 hover:bg-petrol/5 gap-1"
                    onClick={handleSyncBoekhouding}
                    disabled={boekhoudSyncing}
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', boekhoudSyncing && 'animate-spin')} />
                    Sync {BOEKHOUD_PAKKET_NAAM[settings.boekhoud_pakket]}
                  </Button>
                )}

                {/* More actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadPdf}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadUbl}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Download UBL XML
                    </DropdownMenuItem>
                    {(currentStatus === 'open' || currentStatus === 'verzonden' || isVervallen) && (
                      <DropdownMenuItem onClick={handleMarkAsBetaald}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Markeer als betaald
                      </DropdownMenuItem>
                    )}
                    {isVervallen && getVolgendeHerinnering() && (
                      <DropdownMenuItem onClick={openHerinneringDialog}>
                        <Bell className="h-4 w-4 mr-2" />
                        Herinnering versturen
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {currentStatus !== 'gecrediteerd' && currentStatus !== 'concept' && (
                      <DropdownMenuItem onClick={() => { setCreditReden(''); setCreditnotaDialogOpen(true) }}>
                        <MinusCircle className="h-4 w-4 mr-2" />
                        Creditnota aanmaken
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verwijderen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            <Button
              size="sm"
              variant={currentStatus === 'concept' ? 'outline' : 'default'}
              onClick={() => handleSave(false)}
              disabled={isSaving || isReadOnly}
              title={isReadOnly ? `Factuur is ${currentStatus} en kan niet meer worden gewijzigd` : undefined}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {isEditMode ? 'Bijwerken' : 'Opslaan'}
            </Button>

            {currentStatus === 'concept' && !isReadOnly && (
              <Button
                size="sm"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="bg-flame text-white hover:bg-flame/90"
                title="Kent een definitief factuurnummer toe (status wordt Open). De factuur is daarna klaar om te versturen."
              >
                <Send className="h-4 w-4 mr-1" />
                Verwerken
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status bar for existing invoices · tekst + Flame punt, geen kleurig vlak */}
      {isEditMode && existingFactuur && (
        <div className="px-8 pt-3">
          <div className="flex items-center gap-3 text-sm text-foreground/70">
            {(() => {
              const iconClass = cn(
                'h-3.5 w-3.5',
                currentStatus === 'betaald' && 'text-[#3A7D52]',
                currentStatus === 'verzonden' && !isVervallen && 'text-[#3A5A9A]',
                currentStatus === 'concept' && 'text-[#8A7A4A]',
                currentStatus === 'gecrediteerd' && 'text-[#6A5A8A]',
                isVervallen && 'text-[#C0451A]',
              )
              if (currentStatus === 'betaald') return <CheckCircle2 className={iconClass} />
              if (currentStatus === 'verzonden' && !isVervallen) return <Send className={iconClass} />
              if (currentStatus === 'concept') return <FileText className={iconClass} />
              if (currentStatus === 'gecrediteerd') return <MinusCircle className={iconClass} />
              if (isVervallen) return <AlertTriangle className={iconClass} />
              return null
            })()}
            <span className="text-foreground">
              {currentStatus === 'betaald' && <>Betaald op <span className="font-mono">{formatDate(existingFactuur.betaaldatum || '')}</span><span className="text-flame">.</span></>}
              {currentStatus === 'verzonden' && !isVervallen && <>Verstuurd · wachtend op betaling<span className="text-flame">.</span></>}
              {currentStatus === 'open' && <>Verwerkt · klaar om te versturen<span className="text-flame">.</span></>}
              {currentStatus === 'concept' && <>Concept · nog niet verstuurd<span className="text-flame">.</span></>}
              {currentStatus === 'gecrediteerd' && <>Gecrediteerd<span className="text-flame">.</span></>}
              {isVervallen && <>{dagenVervallen} dag{dagenVervallen !== 1 ? 'en' : ''} vervallen<span className="text-flame">.</span></>}
            </span>
            {existingFactuur.betaal_link && currentStatus !== 'betaald' && (
              <span className="ml-auto text-xs text-muted-foreground truncate max-w-[420px]" title={existingFactuur.betaal_link}>
                {existingFactuur.betaal_link}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content: Two-column layout */}
      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:items-start">
        {/* LEFT PANEL: Klant & Meta · sticky met intern scroll bij lange inhoud */}
        <div className="space-y-4 lg:sticky lg:top-[88px] lg:self-start lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto lg:pr-1">
          {/* Klant selectie */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-petrol">
                <Building2 className="h-4 w-4" />
                Klant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <KlantContactSelector
                klantId={klantId}
                onKlantChange={(id) => {
                  setKlantId(id)
                  setContactpersoonId('')
                }}
                contactpersoonId={contactpersoonId}
                onContactpersoonChange={setContactpersoonId}
                onContactpersoonResolved={setResolvedCp}
                pinnedContactpersoonId={factuurStandaardCpId || undefined}
                klanten={klanten}
                onKlantenRefresh={() => getKlanten().then(setKlanten).catch(() => {})}
                contactLabelAccent
                compactContactList
              />
              {resolvedCp && (
                <label className="mt-3 flex items-center gap-2 text-xs cursor-pointer text-muted-foreground">
                  <Checkbox
                    checked={factuurStandaardCpId === resolvedCp.id}
                    onCheckedChange={(v) => handleToggleStandaard(v === true)}
                  />
                  Altijd gebruiken voor facturen van deze klant
                </label>
              )}
              {selectedKlant && !resolvedCp?.email && !selectedKlant.email && (
                <p className="mt-2 text-[11px] text-flame">
                  Geen email-adres bekend · voeg een contactpersoon met email toe.
                </p>
              )}
              {selectedKlant && (
                <KlantStatusWarning klant={selectedKlant} className="mt-3" />
              )}
            </CardContent>
          </Card>

          {/* Factuuradres / geadresseerde · per factuur aanpasbaar */}
          {selectedKlant && (
            <Card>
              <CardHeader className="pb-3">
                <button
                  type="button"
                  onClick={() => setAdresOverrideOpen((o) => !o)}
                  className="w-full flex items-center gap-2 text-sm font-medium text-petrol"
                >
                  <MapPin className="h-4 w-4" />
                  Factuuradres
                  {adresOverrideOpen ? (
                    <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              {adresOverrideOpen && (
                <CardContent className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Voorgevuld met het klantadres. Pas aan voor alleen deze factuur. De wijziging verschijnt direct op de PDF.
                  </p>
                  <div>
                    <Label className="text-xs">Bedrijfsnaam</Label>
                    <Input value={adresBedrijfsnaam} onChange={(e) => setAdresBedrijfsnaam(e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">t.a.v. (geadresseerde)</Label>
                    <Input value={adresTav} onChange={(e) => setAdresTav(e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Adres</Label>
                    <Input value={adresRegel} onChange={(e) => setAdresRegel(e.target.value)} className="text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Postcode</Label>
                      <Input value={adresPostcode} onChange={(e) => setAdresPostcode(e.target.value)} className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Plaats</Label>
                      <Input value={adresPlaats} onChange={(e) => setAdresPlaats(e.target.value)} className="text-sm" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground">
                    <Checkbox checked={adresOokOpKlant} onCheckedChange={(v) => setAdresOokOpKlant(v === true)} />
                    Adres ook op de klantkaart opslaan
                  </label>
                </CardContent>
              )}
            </Card>
          )}

          {/* Factuur gegevens */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-petrol">
                <FileText className="h-4 w-4" />
                Factuurgegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Factuurnummer</Label>
                <Input value={nummer} readOnly className="bg-muted/50 text-sm font-mono" />
              </div>
              <div>
                <Label className="text-xs">Titel</Label>
                <Input
                  value={titel}
                  onChange={(e) => setTitel(e.target.value)}
                  placeholder="Bijv. Gevelreclame installatie"
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Factuurdatum</Label>
                  <DatePicker
                    value={factuurdatum}
                    onChange={(v) => {
                      setFactuurdatum(v)
                      setVervaldatum(getDefaultVervaldatum(v, factuurBetaaltermijnDagen))
                    }}
                    asInput
                    className="text-sm"
                  />
                  {!isReadOnly && factuurdatum !== getTodayString() && (
                    <button
                      type="button"
                      onClick={() => {
                        const vandaag = getTodayString()
                        setFactuurdatum(vandaag)
                        setVervaldatum(getDefaultVervaldatum(vandaag, factuurBetaaltermijnDagen))
                      }}
                      className="mt-1 text-[11px] text-muted-foreground hover:text-flame"
                    >
                      Vandaag
                    </button>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Vervaldatum</Label>
                  <DatePicker
                    value={vervaldatum}
                    onChange={setVervaldatum}
                    asInput
                    className="text-sm"
                  />
                  {!isReadOnly && (
                    <div className="mt-1 flex items-center gap-2">
                      {[14, 30].map((dagen) => (
                        <button
                          key={dagen}
                          type="button"
                          onClick={() => setVervaldatum(getDefaultVervaldatum(factuurdatum, dagen))}
                          className="text-[11px] text-muted-foreground hover:text-flame"
                        >
                          +{dagen}d
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {offerteId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                  <Receipt className="h-3 w-3" />
                  Vanuit offerte geimporteerd
                </div>
              )}
              {isCreditFactuur && creditVoorNummer && (
                <div className="flex items-center gap-2 text-xs text-flame bg-flame-light rounded-lg px-3 py-2">
                  <MinusCircle className="h-3 w-3" />
                  Creditfactuur voor {creditVoorNummer}
                </div>
              )}
              {isCreditFactuur && existingFactuur?.credit_reden && (
                <div className="flex items-start gap-2 text-xs text-flame bg-flame-light rounded-lg px-3 py-2">
                  <MinusCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>Reden: {existingFactuur.credit_reden}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financieel overzicht */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-petrol">
                <Euro className="h-4 w-4" />
                Financieel
                {isCredit && (
                  <span className="ml-auto inline-flex items-center text-[11px] font-semibold text-[#C03A18] bg-[#FDE8E2] rounded px-1.5 py-0.5">
                    Creditfactuur<span className="text-flame">.</span>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-sans">Subtotaal</span>
                <span className="font-mono tabular-nums">{formatCurrency(subtotaal)}</span>
              </div>
              {Object.entries(btwGroups).map(([pct, bedrag]) => (
                <div key={pct} className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-sans">BTW <span className="font-mono">{pct}%</span></span>
                  <span className="font-mono tabular-nums">{formatCurrency(bedrag)}</span>
                </div>
              ))}
              <Separator className="bg-sand" />
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-semibold text-flame">Totaal incl. BTW</span>
                <span className="text-xl font-bold font-mono tabular-nums text-flame">{formatCurrency(totaal)}</span>
              </div>
              {existingFactuur && existingFactuur.betaald_bedrag > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Betaald</span>
                    <span className="font-mono">{formatCurrency(existingFactuur.betaald_bedrag)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Openstaand</span>
                    <span className="font-mono">{formatCurrency(round2(totaal - existingFactuur.betaald_bedrag))}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Bijlagen */}
          {existingFactuur?.id && existingFactuur?.organisatie_id ? (
            <FactuurBijlagenSectie
              factuurId={existingFactuur.id}
              organisatieId={existingFactuur.organisatie_id}
              exactDocumentId={existingFactuur.exact_document_id}
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-petrol">
                  <Paperclip className="h-4 w-4" />
                  Bijlagen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Sla eerst de factuur op om bijlagen toe te voegen.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Herinnering status (edit mode only) */}
          {isEditMode && existingFactuur && (currentStatus === 'verzonden' || isVervallen) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Herinneringen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['herinnering_1_verstuurd', 'herinnering_2_verstuurd', 'herinnering_3_verstuurd', 'aanmaning_verstuurd'].map((field, idx) => {
                  const labels = ['1e herinnering', '2e herinnering', '3e herinnering', 'Aanmaning']
                  const value = (existingFactuur as unknown as Record<string, unknown>)[field] as string | undefined
                  return (
                    <div key={field} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{labels[idx]}</span>
                      {value ? (
                        <span className="text-emerald-600 font-mono">{formatDate(value)}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Te factureren offertes */}
          {teFacturerenOffertes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Te factureren ({teFacturerenOffertes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {teFacturerenOffertes.map((offerte) => {
                  const isHuidige = offerte.id === offerteId
                  return (
                    <button
                      key={offerte.id}
                      onClick={() => {
                        if (!isHuidige) {
                          navigate(`/facturen/nieuw?offerte_id=${offerte.id}&klant_id=${offerte.klant_id}`)
                        }
                      }}
                      disabled={isHuidige}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 group',
                        isHuidige
                          ? 'bg-primary/10 border border-primary/30 cursor-default'
                          : 'hover:bg-accent cursor-pointer'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isHuidige && (
                            <Badge variant="outline" className="text-2xs px-1 h-4 border-primary/40 text-primary">
                              Huidig
                            </Badge>
                          )}
                          <span className="font-mono font-medium truncate">{offerte.nummer}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {offerte.klant_naam || 'Klant'} · {offerte.titel}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                          <span className="font-mono">{formatCurrency(offerte.totaal)}</span>
                        </div>
                      </div>
                      {!isHuidige && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT PANEL: Items & Teksten */}
        <div className="space-y-4">
          {/* Intro tekst · staat boven de regels zoals 'ie ook op de PDF verschijnt */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Intro tekst</CardTitle>
                {introTekst.trim() && (
                  <button
                    type="button"
                    onClick={() => setIntroTekst('')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Wissen
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={introTekst}
                onChange={(e) => setIntroTekst(e.target.value)}
                placeholder="Optionele intro tekst bovenaan de factuur..."
                rows={2}
                className="text-sm"
                enableAiTone={false}
              />
            </CardContent>
          </Card>

          {/* Factureerpercentage (DEEL 2) */}
          {hasOfferteItems && paramProjectId && (
            <Card className={cn(
              'border',
              factureerPercentage !== 100
                ? 'bg-flame-light border-flame-border'
                : 'border-border'
            )}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Label className="text-sm font-medium whitespace-nowrap">Factureerpercentage:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={factureerPercentage}
                      onChange={(e) => setFactureerPercentage(Number(e.target.value) || 0)}
                      className="w-20 text-center font-mono"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  {factureerPercentage !== 100 && (
                    <Badge className="bg-flame/10 text-flame-text border-flame-border text-xs">
                      Deelfactuur
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground font-mono">
                    {formatCurrency(subtotaal)} van {formatCurrency(origineleSubtotaal)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Factuurregels ({items.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  {!isReadOnly && heeftKlembord && (
                    <Button size="sm" variant="ghost" onClick={handlePlakFactuur} title="Regels en teksten van een gekopieerde factuur overnemen">
                      <Copy className="h-4 w-4 mr-1" />
                      Plak gekopieerde factuur
                    </Button>
                  )}
                  {!isReadOnly && (
                    <Button size="sm" variant="outline" onClick={handleAddItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Regel
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isReadOnly && (
                <div className="mb-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Deze factuur is {currentStatus === 'betaald' ? 'betaald' : 'gecrediteerd'} en kan niet meer worden gewijzigd.
                </div>
              )}
              {/* Table header · kolomlabels in tertiary uppercase, geen gekleurd vlak */}
              <div className="hidden md:grid md:grid-cols-[1fr_70px_95px_60px_75px_100px_100px_36px] gap-2 px-3 py-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <span>Omschrijving</span>
                <span className="text-right">Aantal</span>
                <span className="text-right">Prijs</span>
                <span className="text-right">BTW%</span>
                <span className="text-right">Kort.%</span>
                <span>Grootboek</span>
                <span className="text-right">Totaal</span>
                <span />
              </div>

              <div className="divide-y divide-[#EBEBEB]">
                {items.map((item) => (
                  <div key={item.id} className="transition-colors hover:bg-background">
                  <div
                    className="grid grid-cols-1 md:grid-cols-[1fr_70px_95px_60px_75px_100px_100px_36px] gap-2 px-3 py-3"
                  >
                    <Input
                      value={item.beschrijving}
                      onChange={(e) => handleUpdateItem(item.id, 'beschrijving', e.target.value)}
                      placeholder="Omschrijving..."
                      className="text-sm"
                      disabled={isReadOnly}
                    />
                    <Input
                      type="number"
                      value={item.aantal}
                      onChange={(e) => handleUpdateItem(item.id, 'aantal', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      step="0.01"
                      disabled={isReadOnly}
                    />
                    <Input
                      type="number"
                      value={item.eenheidsprijs}
                      onChange={(e) => handleUpdateItem(item.id, 'eenheidsprijs', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      step="0.01"
                      title="Negatief bedrag (-) = creditregel"
                      disabled={isReadOnly}
                    />
                    <Input
                      type="number"
                      value={item.btw_percentage}
                      onChange={(e) => handleUpdateItem(item.id, 'btw_percentage', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      step="1"
                      disabled={isReadOnly}
                    />
                    <Input
                      type="number"
                      value={item.korting_percentage}
                      onChange={(e) => handleUpdateItem(item.id, 'korting_percentage', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      max={100}
                      step="1"
                      disabled={isReadOnly}
                    />
                    {grootboekrekeningen.length > 0 ? (
                      <Select
                        value={item.grootboek_code || '_leeg'}
                        onValueChange={(val) => handleUpdateItem(item.id, 'grootboek_code', val === '_leeg' ? '' : val)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-9 text-xs font-mono px-1.5 truncate">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_leeg">—</SelectItem>
                          {grootboekrekeningen.map((gb) => (
                            <SelectItem key={gb.id} value={gb.code}>
                              {gb.code} - {gb.naam}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center text-xs text-muted-foreground">—</div>
                    )}
                    <div className="flex items-center justify-end text-sm font-mono font-semibold tabular-nums text-ink">
                      {formatCurrency(calcLineTotal(item))}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isReadOnly && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDuplicateItem(item.id)}
                            title="Dupliceer"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {items.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                              title="Verwijder"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {((item.detail_regels && item.detail_regels.length > 0) || !isReadOnly) && (
                    <div className="px-3 pb-3 md:pl-6 space-y-1.5">
                      {(item.detail_regels || []).map((d) => (
                        <div key={d.id} className="flex items-center gap-2">
                          <Input
                            value={d.label}
                            onChange={(e) => handleUpdateDetailRegel(item.id, d.id, 'label', e.target.value)}
                            placeholder="Label (bijv. Afmeting)"
                            className="h-8 text-xs max-w-[200px]"
                            disabled={isReadOnly}
                          />
                          <Input
                            value={d.waarde}
                            onChange={(e) => handleUpdateDetailRegel(item.id, d.id, 'waarde', e.target.value)}
                            placeholder="Waarde (bijv. 200 × 100 cm)"
                            className="h-8 text-xs flex-1"
                            disabled={isReadOnly}
                          />
                          {!isReadOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 flex-shrink-0"
                              onClick={() => handleRemoveDetailRegel(item.id, d.id)}
                              title="Detailregel verwijderen"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleAddDetailRegel(item.id)}
                          className="text-[11px] text-muted-foreground hover:text-flame"
                        >
                          + Detail toevoegen
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                ))}
              </div>

              {/* Totaal rij */}
              {validItems.length > 0 && (
                <div className="hidden md:grid md:grid-cols-[1fr_70px_95px_60px_75px_100px_100px_36px] gap-2 px-3 py-3 border-t-2 border-border">
                  <span className="text-sm font-semibold text-petrol">Totaal</span>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span className="text-right text-sm font-bold font-mono tabular-nums text-petrol">{formatCurrency(subtotaal)}</span>
                  <span />
                </div>
              )}

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-flame hover:text-[#D94520] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Regel toevoegen
                </button>
              )}
            </CardContent>
          </Card>

          {/* Extra tekst (Intro, Outro, Voorwaarden, Notities) · standaard ingeklapt */}
          <Card>
            <button
              type="button"
              onClick={() => setExtraTekstOpen((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-muted/30 rounded-t-lg transition-colors"
              aria-expanded={extraTekstOpen}
            >
              <span className="text-sm font-medium">
                Extra tekst
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  outro, voorwaarden en notities
                </span>
              </span>
              {extraTekstOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {extraTekstOpen && (
              <CardContent className="space-y-4 pt-0">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Outro tekst (onder de regels op de PDF)</Label>
                    {outroTekst.trim() && (
                      <button
                        type="button"
                        onClick={() => setOutroTekst('')}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Wissen
                      </button>
                    )}
                  </div>
                  <Textarea
                    value={outroTekst}
                    onChange={(e) => setOutroTekst(e.target.value)}
                    placeholder="Optionele outro tekst onder de factuurregels..."
                    rows={2}
                    className="text-sm mt-1"
                    enableAiTone={false}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Betaalvoorwaarden</Label>
                    <Textarea
                      value={voorwaarden}
                      onChange={(e) => setVoorwaarden(e.target.value)}
                      placeholder="Betaalvoorwaarden..."
                      rows={3}
                      className="text-sm mt-1"
                      enableAiTone={false}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Interne notities (niet op PDF)</Label>
                      {notities.trim() && (
                        <button
                          type="button"
                          onClick={() => setNotities('')}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Wissen
                        </button>
                      )}
                    </div>
                    <Textarea
                      value={notities}
                      onChange={(e) => setNotities(e.target.value)}
                      placeholder="Notities (niet zichtbaar op factuur)..."
                      rows={3}
                      className="text-sm mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* ── Nog te factureren blok (DEEL 3) ── */}
      {filteredTeFacturerenProjecten.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" style={{ color: '#F15025' }} />
              Nog te factureren
              <Badge variant="secondary" className="text-xs ml-1">
                Nog {filteredTeFacturerenProjecten.length} project{filteredTeFacturerenProjecten.length !== 1 ? 'en' : ''} te factureren
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {filteredTeFacturerenProjecten.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-muted-foreground truncate">{project.klant_naam || '-'}</span>
                    <span className="font-medium truncate">{project.naam}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {project.offerteBedrag > 0 ? formatCurrency(project.offerteBedrag) : '-'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/facturen/nieuw?project_id=${project.id}`)}
                      className="text-xs font-semibold"
                      style={{ color: '#F15025' }}
                    >
                      Factureer →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ DIALOGS ============ */}

      {/* Send factuur dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={(open) => { setSendDialogOpen(open); if (!open) setPersoonlijkBericht(STANDAARD_VERZEND_BERICHT) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-flame" />
              Factuur versturen
            </DialogTitle>
            <DialogDescription>
              Factuur {nummer} gaat naar {resolvedCp?.naam || 'het hoofdadres'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Aan</span>
              <span className="text-right">
                {resolvedCp?.naam && <span className="font-medium">{resolvedCp.naam}</span>}
                <span className="font-mono text-xs text-muted-foreground">
                  {resolvedCp?.naam ? ` · ` : ''}{resolvedCp?.email || selectedKlant?.email}
                </span>
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Bedrag</span>
              <span className="font-mono font-semibold">{formatCurrency(totaal)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Vervaldatum</span>
              <span className="font-mono">{formatDate(vervaldatum)}</span>
            </div>
            {(() => {
              const werkbon = werkbonId ? werkbonnen.find((w) => w.id === werkbonId) : undefined
              const extraSelected = dialogBijlagen.filter((b) => selectedBijlageIds.has(b.id))
              const extraGrootte = extraSelected.reduce((sum, b) => sum + b.grootte, 0)
              const totaalMb = extraGrootte / 1024 / 1024
              const tooGroot = totaalMb > 23
              return (
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Bijlagen</span>
                    {extraSelected.length > 0 && (
                      <span className={cn('font-mono text-xs', tooGroot ? 'text-amber-600 font-semibold' : 'text-muted-foreground')}>
                        {totaalMb.toFixed(1)} MB
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1.5 py-1">
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="flex-1 truncate">Factuur-{nummer}.pdf</span>
                      <span className="text-[10px] text-muted-foreground/70">automatisch</span>
                    </div>
                    {werkbon && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1.5 py-1">
                        <Paperclip className="h-3 w-3 shrink-0" />
                        <span className="flex-1 truncate">Werkbon-{werkbon.werkbon_nummer}.pdf</span>
                        <span className="text-[10px] text-muted-foreground/70">gekoppeld</span>
                      </div>
                    )}
                    {offerteId && (() => {
                      const offerte = allOffertes.find((o) => o.id === offerteId)
                      return (
                        <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-background rounded px-1.5 py-1">
                          <Checkbox
                            checked={stuurOfferteMee}
                            onCheckedChange={(checked) => setStuurOfferteMee(!!checked)}
                          />
                          <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">Offerte{offerte ? `-${offerte.nummer}` : ''}.pdf</span>
                          <span className="text-[10px] text-muted-foreground/70">gekoppeld</span>
                        </label>
                      )
                    })()}
                    {dialogBijlagen.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {dialogBijlagen.map((bij) => (
                          <label
                            key={bij.id}
                            className="flex items-center gap-2 text-xs cursor-pointer hover:bg-background rounded px-1.5 py-1"
                          >
                            <Checkbox
                              checked={selectedBijlageIds.has(bij.id)}
                              onCheckedChange={(checked) => {
                                setSelectedBijlageIds((prev) => {
                                  const next = new Set(prev)
                                  if (checked) next.add(bij.id)
                                  else next.delete(bij.id)
                                  return next
                                })
                              }}
                            />
                            <span className="flex-1 truncate" title={bij.bestandsnaam}>{bij.bestandsnaam}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {(bij.grootte / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {tooGroot && (
                    <p className="text-[11px] text-amber-700 leading-snug">
                      Totale bijlage-grootte boven 23 MB. Gmail-grens (25 MB) komt in zicht. Vink minder bijlagen aan.
                    </p>
                  )}
                </div>
              )
            })()}
            <div className="border-t pt-3 space-y-1.5">
              <label htmlFor="factuur-persoonlijk-bericht" className="text-muted-foreground text-xs uppercase tracking-wider">
                Persoonlijk bericht (optioneel)
              </label>
              <Textarea
                id="factuur-persoonlijk-bericht"
                value={persoonlijkBericht}
                onChange={(e) => setPersoonlijkBericht(e.target.value)}
                placeholder="Voeg een persoonlijk bericht toe dat bovenaan de e-mail verschijnt…"
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            {verzendVoorbeeldHtml && (
              <div className="border-t pt-3 space-y-1.5">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">E-mailvoorbeeld</span>
                <iframe
                  title="E-mailvoorbeeld"
                  srcDoc={verzendVoorbeeldHtml}
                  className="w-full h-72 rounded-md border border-border bg-white"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleSendFactuur} disabled={isSending}>
              {isSending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Versturen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Factuur verwijderen
            </DialogTitle>
            <DialogDescription>
              Weet je zeker dat je factuur {nummer} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDeleteFactuur}>
              <Trash2 className="h-4 w-4 mr-1" />
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creditnota dialog */}
      <Dialog open={creditnotaDialogOpen} onOpenChange={setCreditnotaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="h-5 w-5 text-red-500" />
              Creditnota aanmaken
            </DialogTitle>
            <DialogDescription>
              Maak een creditnota aan voor factuur {nummer}.
              De originele factuur wordt gemarkeerd als gecrediteerd.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Credit bedrag:</span>{' '}
              <span className="font-mono font-semibold text-red-600">{formatCurrency(-(existingFactuur?.totaal || 0))}</span>
            </div>
            <div>
              <Label className="text-sm">Reden voor creditnota</Label>
              <Textarea
                value={creditReden}
                onChange={(e) => setCreditReden(e.target.value)}
                placeholder="Bijv. Foutieve facturatie, retour, annulering..."
                rows={3}
                className="text-sm mt-1"
                enableAiTone={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditnotaDialogOpen(false)}>Annuleren</Button>
            <Button
              variant="destructive"
              onClick={handleCreateCreditnota}
              disabled={isSaving || !creditReden.trim()}
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MinusCircle className="h-4 w-4 mr-1" />}
              Creditnota aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Herinnering dialog */}
      <Dialog open={herinneringDialogOpen} onOpenChange={setHerinneringDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Betalingsherinnering
            </DialogTitle>
            <DialogDescription>
              Verstuur een herinnering voor factuur {nummer} ({dagenVervallen} dag{dagenVervallen !== 1 ? 'en' : ''} vervallen).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Type</Label>
              <Select
                value={herinneringType}
                onValueChange={(v) => setHerinneringType(v as HerinneringTemplate['type'])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="herinnering_1">1e Herinnering</SelectItem>
                  <SelectItem value="herinnering_2">2e Herinnering</SelectItem>
                  <SelectItem value="herinnering_3">3e Herinnering</SelectItem>
                  <SelectItem value="aanmaning">Aanmaning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {herinneringPreview && (
              <div>
                <Label className="text-sm">Voorbeeld</Label>
                <div className="mt-1 p-3 rounded-lg bg-muted/50 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {herinneringPreview}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHerinneringDialogOpen(false)}>Annuleren</Button>
            <Button
              onClick={handleVerstuurHerinnering}
              disabled={isSending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bell className="h-4 w-4 mr-1" />}
              Versturen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log */}
      {existingFactuur && (
        <div className="rounded-xl border border-border bg-card p-5">
          <AuditLogPanel entityType="factuur" entityId={existingFactuur.id} />
        </div>
      )}
      <TrialGuardDialog open={showTrialDialog} onOpenChange={setShowTrialDialog} />
    </div>
  )
}

// ============ SKELETON ============

function FactuurEditorSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 pt-3">
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Header · mimic sticky top-bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="hidden xl:block h-3 w-52" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-8 pt-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Content: Two-column layout */}
      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:items-start">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          {/* Klant card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-16" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>

          {/* Factuurgegevens card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financieel card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
              </div>
              <Separator className="bg-sand" />
              <div className="flex justify-between items-baseline pt-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardContent>
          </Card>

          {/* Bijlagen card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-4">
          {/* Intro tekst card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-20" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-14 w-full rounded-md" />
            </CardContent>
          </Card>

          {/* Factuurregels card · items table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-32" />
                </CardTitle>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </CardHeader>
            <CardContent>
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-[1fr_70px_95px_60px_75px_100px_100px_36px] gap-2 px-3 py-2 mb-1 border-b border-border">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10 ml-auto" />
                <Skeleton className="h-3 w-10 ml-auto" />
                <Skeleton className="h-3 w-8 ml-auto" />
                <Skeleton className="h-3 w-10 ml-auto" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12 ml-auto" />
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#EBEBEB]">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-[1fr_70px_95px_60px_75px_100px_100px_36px] gap-2 px-3 py-3"
                  >
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                    <Skeleton className="h-4 w-16 ml-auto self-center" />
                    <Skeleton className="h-7 w-7 rounded self-center" />
                  </div>
                ))}
              </div>

              {/* Totaal rij */}
              <div className="hidden md:grid md:grid-cols-[1fr_70px_95px_60px_75px_100px_100px_36px] gap-2 px-3 py-3 border-t-2 border-border">
                <Skeleton className="h-4 w-16" />
                <span />
                <span />
                <span />
                <span />
                <span />
                <Skeleton className="h-4 w-20 ml-auto" />
                <span />
              </div>

              <Skeleton className="mt-3 h-4 w-32" />
            </CardContent>
          </Card>

          {/* Extra tekst (collapsible header · alleen header zichtbaar) */}
          <Card>
            <div className="w-full flex items-center justify-between px-6 py-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
