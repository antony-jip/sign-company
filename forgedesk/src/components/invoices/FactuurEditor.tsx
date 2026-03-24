import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { BackButton } from '@/components/shared/BackButton'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  AlertTriangle,
  MinusCircle,
  FileDown,
  ChevronRight,
  ClipboardList,
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
  deleteFactuur,
  getOffertes,
  getOfferteItems,
  updateOfferte,
  updateProject,
  getOffertesByProject,
  getFacturenByProject,
  getProjecten,
  getKlant,
  generateBetaalToken,
  getHerinneringTemplates,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Klant, Factuur, FactuurItem, Offerte, OfferteItem, HerinneringTemplate, Project } from '@/types'
import { round2 } from '@/utils/budgetUtils'
import { generateFactuurPDF } from '@/services/pdfService'
import { generateUBLInvoice, downloadUBLXml } from '@/services/ublService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { sendEmail } from '@/services/gmailService'
import { factuurVerzendTemplate } from '@/services/emailTemplateService'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { logger } from '../../utils/logger'
import { KlantStatusWarning } from '@/components/shared/KlantStatusWarning'
import { useUnsavedWarning } from '@/hooks/useUnsavedWarning'
import { AuditLogPanel } from '@/components/shared/AuditLogPanel'
import { confirm } from '@/components/shared/ConfirmDialog'
import { logWijziging } from '@/utils/auditLogger'

// ============ TYPES ============

interface LineItem {
  id: string
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
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

function generateFactuurNummer(prefix: string, existing: { nummer: string }[]): string {
  const year = new Date().getFullYear()
  const jaarPrefix = `${prefix}-${year}-`
  const maxNr = existing
    .filter((f) => f.nummer.startsWith(jaarPrefix))
    .reduce((max, f) => Math.max(max, parseInt(f.nummer.replace(jaarPrefix, ''), 10) || 0), 0)
  return `${jaarPrefix}${String(maxNr + 1).padStart(3, '0')}`
}

function generateTypedNummer(existing: { nummer: string }[], prefix: string): string {
  const year = new Date().getFullYear()
  const fullPrefix = `${prefix}-${year}-`
  const maxNum = existing
    .filter((f) => f.nummer.startsWith(fullPrefix))
    .reduce((max, f) => {
      const num = parseInt(f.nummer.replace(fullPrefix, ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
  return `${fullPrefix}${String(maxNum + 1).padStart(3, '0')}`
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  concept: { label: 'Concept', color: 'bg-bg-hover text-text-tertiary' },
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
  const {
    settings,
    standaardBtw,
    factuurPrefix,
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
  const editFactuurId = routeId || ''

  // Form state
  const [klantId, setKlantId] = useState('')
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
  const [isSending, setIsSending] = useState(false)
  const [creditnotaDialogOpen, setCreditnotaDialogOpen] = useState(false)
  const [creditReden, setCreditReden] = useState('')
  const [herinneringDialogOpen, setHerinneringDialogOpen] = useState(false)
  const [herinneringTemplates, setHerinneringTemplates] = useState<HerinneringTemplate[]>([])
  const [herinneringType, setHerinneringType] = useState<HerinneringTemplate['type']>('herinnering_1')
  const [herinneringPreview, setHerinneringPreview] = useState('')

  // ============ DATA LOADING ============

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [klantenData, facturenData, herinneringData, offertesData] = await Promise.all([
          getKlanten().catch(() => []),
          getFacturen().catch(() => []),
          getHerinneringTemplates().catch(() => []),
          getOffertes().catch(() => []),
        ])
        if (!cancelled) {
          setKlanten(klantenData)
          setAllFacturen(facturenData)
          setHerinneringTemplates(herinneringData)
          setAllOffertes(offertesData)
        }

        // Edit mode: load existing factuur
        if (editFactuurId) {
          try {
            const [factuur, factuurItems] = await Promise.all([
              getFactuur(editFactuurId),
              getFactuurItems(editFactuurId),
            ])
            if (!cancelled) {
              setExistingFactuur(factuur)
              setIsEditMode(true)
              setKlantId(factuur.klant_id)
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
                    }))
                )
              }
            }
          } catch (err) {
            logger.error('Failed to load factuur for editing:', err)
            if (!cancelled) toast.error('Kon factuur niet laden')
          }
        } else {
          // New factuur: generate nummer
          if (!cancelled) {
            setNummer(generateFactuurNummer(factuurPrefix, facturenData))
          }

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
                  if (offerte.voorwaarden) setVoorwaarden(offerte.voorwaarden)
                  if (offerte.intro_tekst) setIntroTekst(offerte.intro_tekst)
                  if (offerte.outro_tekst) setOutroTekst(offerte.outro_tekst)

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
                    }])
                    setOrigineleItems([{
                      id: crypto.randomUUID(),
                      beschrijving: offerte.titel,
                      aantal: 1,
                      eenheidsprijs: offerte.subtotaal,
                      btw_percentage: offerte.subtotaal > 0 ? Math.round((offerte.btw_bedrag / offerte.subtotaal) * 100) : 21,
                      korting_percentage: 0,
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
          } catch {
            // Non-critical
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
                if (offerte.voorwaarden) setVoorwaarden(offerte.voorwaarden)
                if (offerte.intro_tekst) setIntroTekst(offerte.intro_tekst)
                if (offerte.outro_tekst) setOutroTekst(offerte.outro_tekst)
                if (offerte.notities) setNotities(offerte.notities)

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
                    },
                  ])
                }
              }
            } catch (err) {
              logger.error('Failed to import offerte items:', err)
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
  }, [editFactuurId, paramKlantId, paramOfferteId, paramProjectId, paramTitel, factuurPrefix, standaardBtw, factuurBetaaltermijnDagen, factuurVoorwaarden, factuurIntroTekst, factuurOutroTekst])

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

  const currentStatus = existingFactuur?.status || 'concept'
  const isVervallen = existingFactuur ? existingFactuur.vervaldatum < getTodayString() && currentStatus !== 'betaald' && currentStatus !== 'gecrediteerd' : false

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

  const handleSave = useCallback(async () => {
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

      if (isEditMode && existingFactuur) {
        const updates: Partial<Factuur> = {
          klant_id: klantId,
          klant_naam: selectedKlant?.bedrijfsnaam || '',
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
        }
        const updated = await updateFactuur(existingFactuur.id, updates)
        setExistingFactuur({ ...existingFactuur, ...updated })
        setIsDirty(false)
        toast.success('Factuur bijgewerkt')
      } else {
        const betaalToken = generateBetaalToken()
        const betaalLink = `${window.location.origin}/betalen/${betaalToken}`

        const newFactuur = await createFactuur({
          user_id: user?.id || '',
          klant_id: klantId,
          klant_naam: selectedKlant?.bedrijfsnaam || '',
          offerte_id: offerteId || undefined,
          project_id: projectId || undefined,
          nummer,
          titel,
          status: 'concept',
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
          betaal_link: betaalLink,
          factuur_type: 'standaard',
        })

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
          })
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
                await updateProject(projectId, { status: 'afgerond' })
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
              await updateProject(projectId, { status: 'gefactureerd' })
              toast.info('Project status bijgewerkt naar gefactureerd')
            }
          } catch (err) {
            logger.error('Kon project status niet bijwerken:', err)
          }
        }

        // Check of er nog meer offertes te factureren zijn
        const nextOfferte = teFacturerenOffertes.find((o) => o.id !== offerteId)
        if (nextOfferte) {
          toast.success(`Factuur ${nummer} aangemaakt`, {
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
          toast.success(`Factuur ${nummer} aangemaakt`)
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
    klantId, selectedKlant, titel, validItems, isEditMode, existingFactuur,
    factuurdatum, vervaldatum, voorwaarden, notities, introTekst, outroTekst,
    subtotaal, btwBedrag, totaal, nummer, offerteId, projectId, user, navigate,
  ])

  // ============ PDF ============

  const handleDownloadPdf = useCallback(() => {
    if (!selectedKlant) {
      toast.error('Selecteer eerst een klant')
      return
    }

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
      factuur_type: (existingFactuur?.factuur_type || 'standaard') as 'standaard' | 'voorschot' | 'creditnota' | 'eindafrekening',
      betaal_link: existingFactuur?.betaal_link || undefined,
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
      created_at: new Date().toISOString(),
    }))

    try {
      const doc = generateFactuurPDF(factuurData, pdfItems, selectedKlant, bedrijfsProfiel, documentStyle)
      doc.save(`factuur-${nummer}.pdf`)
      toast.success('PDF gedownload')
    } catch (err) {
      logger.error('Fout bij genereren PDF:', err)
      toast.error('Kon PDF niet genereren')
    }
  }, [selectedKlant, profile, primaireKleur, nummer, titel, factuurdatum, vervaldatum, subtotaal, btwBedrag, totaal, notities, voorwaarden, validItems, documentStyle, existingFactuur])

  // ============ UBL XML ============

  const handleDownloadUbl = useCallback(() => {
    if (!selectedKlant) {
      toast.error('Selecteer eerst een klant')
      return
    }

    try {
      const xml = generateUBLInvoice({
        factuur: {
          nummer,
          titel,
          factuurdatum,
          vervaldatum,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
          factuur_type: existingFactuur?.factuur_type || 'standaard',
          notities: notities || '',
          voorwaarden: voorwaarden || '',
        },
        items: validItems.map((item, idx) => ({
          beschrijving: item.beschrijving,
          aantal: item.aantal,
          eenheidsprijs: item.eenheidsprijs,
          btw_percentage: item.btw_percentage,
          korting_percentage: item.korting_percentage,
          totaal: calcLineTotal(item),
          volgorde: idx + 1,
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

  // ============ SEND EMAIL ============

  const handleSendFactuur = useCallback(async () => {
    if (!existingFactuur || !selectedKlant?.email) {
      toast.error('Geen emailadres gevonden voor deze klant')
      return
    }

    try {
      setIsSending(true)

      const { subject, html } = factuurVerzendTemplate({
        klantNaam: selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam,
        factuurNummer: nummer,
        factuurTitel: titel,
        totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaal),
        vervaldatum: formatDate(vervaldatum),
        bedrijfsnaam,
        primaireKleur,
        handtekening: emailHandtekening || undefined,
        logoUrl: profile?.logo_url || undefined,
        betaalUrl: existingFactuur.betaal_link || undefined,
      })

      await sendEmail(selectedKlant.email, subject, '', { html })

      const updated = await updateFactuur(existingFactuur.id, { status: 'verzonden' })
      setExistingFactuur({ ...existingFactuur, ...updated, status: 'verzonden' })

      // Update gekoppeld project naar 'gefactureerd'
      if (existingFactuur.project_id) {
        try { await updateProject(existingFactuur.project_id, { status: 'gefactureerd' }) } catch { /* ignore */ }
      }

      setSendDialogOpen(false)
      toast.success(`Factuur ${nummer} verzonden naar ${selectedKlant.email}`)
    } catch (err) {
      logger.error('Fout bij verzenden factuur:', err)
      toast.error('Kon factuur niet verzenden')
    } finally {
      setIsSending(false)
    }
  }, [existingFactuur, selectedKlant, nummer, titel, totaal, vervaldatum, bedrijfsnaam, primaireKleur, emailHandtekening])

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
        const naam = user.voornaam ? `${user.voornaam} ${user.achternaam || ''}`.trim() : user.email || ''
        logWijziging({ userId: user.id, entityType: 'factuur', entityId: existingFactuur.id, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: existingFactuur.status, nieuweWaarde: 'betaald' })
      }
      // Update gekoppeld project naar 'gefactureerd'
      if (existingFactuur.project_id) {
        try { await updateProject(existingFactuur.project_id, { status: 'gefactureerd' }) } catch { /* ignore */ }
      }
      toast.success(`${nummer} gemarkeerd als betaald`)
    } catch {
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
    } catch {
      toast.error('Kon factuur niet verwijderen')
    }
  }, [existingFactuur, nummer, navigate])

  // ============ CREDITNOTA ============

  const handleCreateCreditnota = useCallback(async () => {
    if (!existingFactuur) return
    if (!creditReden.trim()) {
      toast.error('Vul een reden in voor de creditnota')
      return
    }

    try {
      setIsSaving(true)
      const cnNummer = generateTypedNummer(allFacturen, 'CN')

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
        betaal_link: `${window.location.origin}/betalen/${cnToken}`,
        gerelateerde_factuur_id: existingFactuur.id,
        credit_reden: creditReden,
      }

      const saved = await createFactuur(creditnota)

      // Mark original as gecrediteerd
      await updateFactuur(existingFactuur.id, { status: 'gecrediteerd' })
      setExistingFactuur({ ...existingFactuur, status: 'gecrediteerd' })

      setCreditnotaDialogOpen(false)
      toast.success(`Creditnota ${cnNummer} aangemaakt`)
      navigate(`/facturen/${saved.id}`)
    } catch {
      toast.error('Fout bij aanmaken creditnota')
    } finally {
      setIsSaving(false)
    }
  }, [existingFactuur, creditReden, allFacturen, selectedKlant, user, navigate])

  // ============ HERINNERING ============

  const getVolgendeHerinnering = useCallback((): HerinneringTemplate['type'] | null => {
    if (!existingFactuur || dagenVervallen <= 0) return null
    if (!existingFactuur.herinnering_1_verstuurd && dagenVervallen >= 7) return 'herinnering_1'
    if (!existingFactuur.herinnering_2_verstuurd && dagenVervallen >= 14) return 'herinnering_2'
    if (!existingFactuur.herinnering_3_verstuurd && dagenVervallen >= 21) return 'herinnering_3'
    if (!existingFactuur.aanmaning_verstuurd && dagenVervallen >= 30) return 'aanmaning'
    return null
  }, [existingFactuur, dagenVervallen])

  const openHerinneringDialog = useCallback(() => {
    if (!existingFactuur || !selectedKlant) return
    const type = getVolgendeHerinnering() || 'herinnering_1'
    const template = herinneringTemplates.find((t) => t.type === type)
    if (template) {
      const preview = template.inhoud
        .replace(/{klant_naam}/g, selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam)
        .replace(/{factuur_nummer}/g, existingFactuur.nummer)
        .replace(/{factuur_bedrag}/g, formatCurrency(existingFactuur.totaal))
        .replace(/{vervaldatum}/g, formatDate(existingFactuur.vervaldatum))
        .replace(/{dagen_verlopen}/g, String(dagenVervallen))
        .replace(/{bedrijfsnaam}/g, bedrijfsnaam || '')
      setHerinneringPreview(preview)
    }
    setHerinneringType(type)
    setHerinneringDialogOpen(true)
  }, [existingFactuur, selectedKlant, getVolgendeHerinnering, herinneringTemplates, dagenVervallen, bedrijfsnaam])

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
      const onderwerp = template.onderwerp.replace(/{factuur_nummer}/g, existingFactuur.nummer)

      try {
        await sendEmail(selectedKlant.email, onderwerp, herinneringPreview, {})
      } catch {
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

      toast.success(`${template.type === 'aanmaning' ? 'Aanmaning' : 'Herinnering'} gemarkeerd voor ${existingFactuur.nummer}`)
      setHerinneringDialogOpen(false)
    } catch {
      toast.error('Fout bij versturen herinnering')
    } finally {
      setIsSending(false)
    }
  }, [existingFactuur, selectedKlant, herinneringTemplates, herinneringType, herinneringPreview])

  // ============ LOADING ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ============ RENDER ============

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-3">
        <BackButton fallbackPath="/facturen" />
      </div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-[-0.03em]">
                  {isEditMode ? `Factuur ${nummer}` : 'Nieuwe factuur'}
                </h1>
                {isEditMode && existingFactuur && (
                  <Badge className={cn('text-2xs px-1.5 h-5', STATUS_CONFIG[currentStatus]?.color)}>
                    {isVervallen ? 'Vervallen' : STATUS_CONFIG[currentStatus]?.label || currentStatus}
                  </Badge>
                )}
              </div>
              <p className="text-xs font-mono text-muted-foreground">{nummer}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit mode actions */}
            {isEditMode && existingFactuur && (
              <>
                {/* Send button */}
                {(currentStatus === 'concept') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSendDialogOpen(true)}
                    disabled={!selectedKlant?.email}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Versturen
                  </Button>
                )}

                {/* Mark as paid */}
                {(currentStatus === 'verzonden' || currentStatus === 'vervallen' || isVervallen) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAsBetaald}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Betaald
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
                    {currentStatus === 'concept' && selectedKlant?.email && (
                      <DropdownMenuItem onClick={() => setSendDialogOpen(true)}>
                        <Send className="h-4 w-4 mr-2" />
                        Factuur versturen
                      </DropdownMenuItem>
                    )}
                    {(currentStatus === 'verzonden' || isVervallen) && (
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
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={validItems.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {isEditMode ? 'Bijwerken' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </div>

      {/* Status bar for existing invoices */}
      {isEditMode && existingFactuur && (
        <div className="px-6 pt-4">
          <div className={cn(
            'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm',
            currentStatus === 'betaald' && 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300',
            currentStatus === 'verzonden' && !isVervallen && 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
            currentStatus === 'concept' && 'bg-background border-border text-foreground/70 dark:bg-muted dark:border-border dark:text-muted-foreground/50',
            currentStatus === 'gecrediteerd' && 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300',
            isVervallen && 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
          )}>
            {currentStatus === 'betaald' && <CheckCircle2 className="h-4 w-4" />}
            {currentStatus === 'verzonden' && !isVervallen && <Send className="h-4 w-4" />}
            {currentStatus === 'concept' && <FileText className="h-4 w-4" />}
            {currentStatus === 'gecrediteerd' && <MinusCircle className="h-4 w-4" />}
            {isVervallen && <AlertTriangle className="h-4 w-4" />}
            <span>
              {currentStatus === 'betaald' && <>Betaald op <span className="font-mono">{formatDate(existingFactuur.betaaldatum || '')}</span></>}
              {currentStatus === 'verzonden' && !isVervallen && 'Verstuurd — wachtend op betaling'}
              {currentStatus === 'concept' && 'Concept — nog niet verstuurd'}
              {currentStatus === 'gecrediteerd' && 'Gecrediteerd'}
              {isVervallen && `${dagenVervallen} dag${dagenVervallen !== 1 ? 'en' : ''} vervallen`}
            </span>
            {existingFactuur.betaal_link && currentStatus !== 'betaald' && (
              <span className="ml-auto text-xs opacity-70">
                Betaallink: {existingFactuur.betaal_link}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content: Two-column layout */}
      <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* LEFT PANEL: Klant & Meta */}
        <div className="space-y-4">
          {/* Klant selectie */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Klant
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showKlantSelector ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Zoek klant..."
                      value={klantSearch}
                      onChange={(e) => setKlantSearch(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredKlanten.map((klant) => (
                      <button
                        key={klant.id}
                        onClick={() => handleSelectKlant(klant.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors',
                          klant.id === klantId && 'bg-accent'
                        )}
                      >
                        <div className="font-medium">{klant.bedrijfsnaam}</div>
                        {klant.contactpersoon && (
                          <div className="text-xs text-muted-foreground">{klant.contactpersoon}</div>
                        )}
                      </button>
                    ))}
                    {filteredKlanten.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Geen klanten gevonden
                      </p>
                    )}
                  </div>
                </div>
              ) : selectedKlant ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{selectedKlant.bedrijfsnaam}</span>
                    <Button variant="ghost" size="sm" onClick={handleChangeKlant}>
                      <X className="h-3 w-3 mr-1" />
                      Wijzig
                    </Button>
                  </div>
                  {selectedKlant.contactpersoon && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {selectedKlant.contactpersoon}
                    </div>
                  )}
                  {selectedKlant.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {selectedKlant.email}
                    </div>
                  )}
                  {selectedKlant.telefoon && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {selectedKlant.telefoon}
                    </div>
                  )}
                  {selectedKlant.adres && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {selectedKlant.adres}{selectedKlant.stad ? `, ${selectedKlant.stad}` : ''}
                    </div>
                  )}
                  <KlantStatusWarning klant={selectedKlant} className="mt-2" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Geen klant geselecteerd</p>
              )}
            </CardContent>
          </Card>

          {/* Factuur gegevens */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
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
                  <Input
                    type="date"
                    value={factuurdatum}
                    onChange={(e) => {
                      setFactuurdatum(e.target.value)
                      setVervaldatum(getDefaultVervaldatum(e.target.value, factuurBetaaltermijnDagen))
                    }}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Vervaldatum</Label>
                  <Input
                    type="date"
                    value={vervaldatum}
                    onChange={(e) => setVervaldatum(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              {offerteId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                  <Receipt className="h-3 w-3" />
                  Vanuit offerte geimporteerd
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financieel overzicht */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Financieel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotaal</span>
                <span className="font-mono">{formatCurrency(subtotaal)}</span>
              </div>
              {Object.entries(btwGroups).map(([pct, bedrag]) => (
                <div key={pct} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">BTW <span className="font-mono">{pct}%</span></span>
                  <span className="font-mono">{formatCurrency(bedrag)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Totaal incl. BTW</span>
                <span className="text-lg font-mono">{formatCurrency(totaal)}</span>
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
                          {offerte.klant_naam || 'Klant'} — {offerte.titel}
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
          {/* Intro tekst */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Intro tekst</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={introTekst}
                onChange={(e) => setIntroTekst(e.target.value)}
                placeholder="Optionele intro tekst bovenaan de factuur..."
                rows={2}
                className="text-sm"
              />
            </CardContent>
          </Card>

          {/* Factureerpercentage (DEEL 2) */}
          {hasOfferteItems && paramProjectId && (
            <Card>
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
                      className="w-20 text-center"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
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
                <Button size="sm" variant="outline" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Regel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-[1fr_80px_100px_70px_70px_100px_36px] gap-2 px-2 mb-2 text-xs font-bold uppercase tracking-label text-text-tertiary">
                <span>Omschrijving</span>
                <span className="text-right">Aantal</span>
                <span className="text-right">Prijs</span>
                <span className="text-right">BTW%</span>
                <span className="text-right">Korting%</span>
                <span className="text-right">Totaal</span>
                <span />
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_70px_70px_100px_36px] gap-2 p-2 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <Input
                      value={item.beschrijving}
                      onChange={(e) => handleUpdateItem(item.id, 'beschrijving', e.target.value)}
                      placeholder="Omschrijving..."
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      value={item.aantal}
                      onChange={(e) => handleUpdateItem(item.id, 'aantal', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      step="0.01"
                    />
                    <Input
                      type="number"
                      value={item.eenheidsprijs}
                      onChange={(e) => handleUpdateItem(item.id, 'eenheidsprijs', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      step="0.01"
                    />
                    <Input
                      type="number"
                      value={item.btw_percentage}
                      onChange={(e) => handleUpdateItem(item.id, 'btw_percentage', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      step="1"
                    />
                    <Input
                      type="number"
                      value={item.korting_percentage}
                      onChange={(e) => handleUpdateItem(item.id, 'korting_percentage', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      max={100}
                      step="1"
                    />
                    <div className="flex items-center justify-end text-sm font-mono font-medium tabular-nums">
                      {formatCurrency(calcLineTotal(item))}
                    </div>
                    <div className="flex items-center gap-1">
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
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddItem}
                className="mt-3 w-full border-dashed border"
              >
                <Plus className="h-4 w-4 mr-1" />
                Regel toevoegen
              </Button>
            </CardContent>
          </Card>

          {/* Outro tekst */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Outro tekst</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={outroTekst}
                onChange={(e) => setOutroTekst(e.target.value)}
                placeholder="Optionele outro tekst onder de factuurregels..."
                rows={2}
                className="text-sm"
              />
            </CardContent>
          </Card>

          {/* Voorwaarden & Notities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Betaalvoorwaarden</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={voorwaarden}
                  onChange={(e) => setVoorwaarden(e.target.value)}
                  placeholder="Betaalvoorwaarden..."
                  rows={3}
                  className="text-sm"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Interne notities</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notities}
                  onChange={(e) => setNotities(e.target.value)}
                  placeholder="Notities (niet zichtbaar op factuur)..."
                  rows={3}
                  className="text-sm"
                />
              </CardContent>
            </Card>
          </div>
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
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" />
              Factuur versturen
            </DialogTitle>
            <DialogDescription>
              Verstuur factuur {nummer} naar {selectedKlant?.email || 'klant'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Aan:</span>{' '}
              <span className="font-medium">{selectedKlant?.email}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Bedrag:</span>{' '}
              <span className="font-mono font-semibold">{formatCurrency(totaal)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Vervaldatum:</span>{' '}
              <span className="font-mono">{formatDate(vervaldatum)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSendFactuur} disabled={isSending}>
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
    </div>
  )
}
