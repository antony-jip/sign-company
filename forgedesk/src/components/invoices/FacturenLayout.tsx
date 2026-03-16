import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Plus,
  FileInput,
  Loader2,
  Search,
  ArrowUpDown,
  Euro,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  Eye,
  Pencil,
  CreditCard,
  Bell,
  Trash2,
  X,
  Download,
  ArrowUp,
  ArrowDown,
  FileDown,
  Send,
  Link,
  Globe,
  Copy,
  Receipt,
  Share2,
} from 'lucide-react'
import {
  getFacturen,
  createFactuur,
  updateFactuur,
  updateFactuurStatus,
  deleteFactuur,
  getKlanten,
  getOffertes,
  getOfferteItems,
  createFactuurItem,
  getHerinneringTemplates,
  generateBetaalToken,
} from '@/services/supabaseService'
import type { Factuur, FactuurItem, Klant, Offerte, OfferteItem, HerinneringTemplate } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import { toast } from 'sonner'
import { exportCSV, exportExcel } from '@/lib/export'
import { sendEmail } from '@/services/gmailService'
import { factuurHerinneringTemplate, factuurVerzendTemplate } from '@/services/emailTemplateService'
import { generateFactuurPDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '../../utils/logger'
import { SkeletonTable } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { PaginationControls } from '@/components/ui/pagination-controls'

// ============ TYPES ============

type FactuurStatus = Factuur['status']
type FactuurType = NonNullable<Factuur['factuur_type']>
type FilterStatus = 'alle' | FactuurStatus | 'verlopen'
type SortField = 'datum' | 'bedrag' | 'klantnaam'
type SortDir = 'asc' | 'desc'

interface LineItem {
  id: string
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
}

interface FactuurFormData {
  klant_id: string
  offerte_id?: string
  project_id?: string
  titel: string
  factuurdatum: string
  vervaldatum: string
  voorwaarden: string
  notities: string
  items: LineItem[]
}

// ============ CONSTANTS ============

const STATUS_CONFIG: Record<FactuurStatus, { label: string; color: string; border: string; dot: string }> = {
  concept: {
    label: 'Concept',
    color: 'badge-cream',
    border: 'border-l-[var(--color-cream-border)]',
    dot: 'bg-[var(--color-cream-text)]',
  },
  verzonden: {
    label: 'Verzonden',
    color: 'badge-mist',
    border: 'border-l-[var(--color-mist-border)]',
    dot: 'bg-[var(--color-mist-text)]',
  },
  betaald: {
    label: 'Betaald',
    color: 'badge-sage',
    border: 'border-l-[var(--color-sage-border)]',
    dot: 'bg-[var(--color-sage-text)]',
  },
  vervallen: {
    label: 'Vervallen',
    color: 'badge-coral',
    border: 'border-l-[var(--color-coral-border)]',
    dot: 'bg-[var(--color-coral-text)]',
  },
  gecrediteerd: {
    label: 'Gecrediteerd',
    color: 'badge-lavender',
    border: 'border-l-[var(--color-lavender-border)]',
    dot: 'bg-[var(--color-lavender-text)]',
  },
}

const TYPE_CONFIG: Record<FactuurType, { label: string; prefix: string; color: string }> = {
  standaard: { label: 'Factuur', prefix: 'FAC', color: '' },
  voorschot: { label: 'Voorschot', prefix: 'VS', color: 'badge-lavender' },
  creditnota: { label: 'Creditnota', prefix: 'CN', color: 'badge-coral' },
  eindafrekening: { label: 'Eindafrekening', prefix: 'EA', color: 'badge-sage' },
}

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'concept', label: 'Concept' },
  { value: 'verzonden', label: 'Verzonden' },
  { value: 'betaald', label: 'Betaald' },
  { value: 'vervallen', label: 'Vervallen' },
  { value: 'verlopen', label: 'Verlopen' },
  { value: 'gecrediteerd', label: 'Gecrediteerd' },
]

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'datum', label: 'Datum' },
  { value: 'bedrag', label: 'Bedrag' },
  { value: 'klantnaam', label: 'Klantnaam' },
]


// ============ HELPERS ============

function createEmptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    beschrijving: '',
    aantal: 1,
    eenheidsprijs: 0,
    btw_percentage: 21,
    korting_percentage: 0,
  }
}

function calcLineTotal(item: LineItem): number {
  const subtotaal = item.aantal * item.eenheidsprijs
  const korting = subtotaal * (item.korting_percentage / 100)
  return round2(subtotaal - korting)
}

function calcSubtotaal(items: LineItem[]): number {
  return round2(items.reduce((sum, item) => sum + calcLineTotal(item), 0))
}

function calcBtwBedrag(items: LineItem[]): number {
  return round2(items.reduce((sum, item) => {
    const lineTotal = calcLineTotal(item)
    return sum + round2(lineTotal * (item.btw_percentage / 100))
  }, 0))
}

function getDefaultVervaldatum(factuurdatum: string): string {
  const d = new Date(factuurdatum)
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function generateFactuurNummer(existing: Factuur[]): string {
  const year = new Date().getFullYear()
  const prefix = `FAC-${year}-`
  const maxNum = existing
    .filter((f) => f.nummer.startsWith(prefix))
    .reduce((max, f) => {
      const num = parseInt(f.nummer.replace(prefix, ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`
}

function generateTypedNummer(existing: Factuur[], prefix: string): string {
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

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

// ============ COMPONENT ============

export function FacturenLayout() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const { user } = useAuth()
  // App settings (bedrijfsprofiel for PDF generation)
  const { profile, primaireKleur, emailHandtekening, bedrijfsnaam, factuurBetaaltermijnDagen, factuurVoorwaarden } = useAppSettings()
  const documentStyle = useDocumentStyle()

  // Data state
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter & sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [sortField, setSortField] = useState<SortField>('datum')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [offerteDialogOpen, setOfferteDialogOpen] = useState(false)
  const [editingFactuur, setEditingFactuur] = useState<Factuur | null>(null)
  const [viewingFactuur, setViewingFactuur] = useState<Factuur | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState<FactuurFormData>({
    klant_id: '',
    titel: '',
    factuurdatum: getTodayString(),
    vervaldatum: getDefaultVervaldatum(getTodayString()),
    voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
    notities: '',
    items: [createEmptyLineItem()],
  })

  // Herinnering state
  const [herinneringTemplates, setHerinneringTemplates] = useState<HerinneringTemplate[]>([])
  const [herinneringDialogOpen, setHerinneringDialogOpen] = useState(false)
  const [herinneringFactuur, setHerinneringFactuur] = useState<Factuur | null>(null)
  const [herinneringType, setHerinneringType] = useState<HerinneringTemplate['type']>('herinnering_1')
  const [herinneringPreview, setHerinneringPreview] = useState('')

  // Creditnota / Voorschot state
  const [creditnotaDialogOpen, setCreditnotaDialogOpen] = useState(false)
  const [creditnotaFactuur, setCreditnotaFactuur] = useState<Factuur | null>(null)
  const [creditReden, setCreditReden] = useState('')
  const [voorschotDialogOpen, setVoorschotDialogOpen] = useState(false)
  const [voorschotOfferte, setVoorschotOfferte] = useState<Offerte | null>(null)
  const [voorschotPercentage, setVoorschotPercentage] = useState(30)
  const [eindafrekeningDialogOpen, setEindafrekeningDialogOpen] = useState(false)
  const [eindafrekeningFactuur, setEindafrekeningFactuur] = useState<Factuur | null>(null)

  // URL params for workflow integration
  const [searchParams, setSearchParams] = useSearchParams()

  // ============ DATA LOADING ============

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [facturenData, klantenData, offertesData, herinneringData] = await Promise.all([
          getFacturen().catch(() => []),
          getKlanten().catch(() => []),
          getOffertes().catch(() => []),
          getHerinneringTemplates().catch(() => []),
        ])

        if (!cancelled) {
          setFacturen(facturenData)
          setKlanten(klantenData)
          setOffertes(offertesData)
          setHerinneringTemplates(herinneringData)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  // ============ COMPUTED VALUES ============

  const statistics = useMemo(() => {
    const openStatuses: FactuurStatus[] = ['verzonden', 'vervallen']
    const openFacturen = facturen.filter((f) => openStatuses.includes(f.status))
    const totaalOpenstaand = round2(openFacturen.reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0))

    const betaaldDezeMaand = round2(facturen
      .filter((f) => f.status === 'betaald' && f.betaaldatum && isThisMonth(f.betaaldatum))
      .reduce((sum, f) => sum + f.betaald_bedrag, 0))

    const vervallenCount = facturen.filter((f) => f.status === 'vervallen').length

    const betaaldeFacturen = facturen.filter((f) => f.status === 'betaald' && f.betaaldatum && f.factuurdatum)
    let gemiddeldeBetaaltermijn = 0
    if (betaaldeFacturen.length > 0) {
      const totalDays = betaaldeFacturen.reduce((sum, f) => {
        const factuurdatum = new Date(f.factuurdatum)
        const betaaldatum = new Date(f.betaaldatum!)
        return sum + Math.max(0, Math.floor((betaaldatum.getTime() - factuurdatum.getTime()) / (1000 * 60 * 60 * 24)))
      }, 0)
      gemiddeldeBetaaltermijn = Math.round(totalDays / betaaldeFacturen.length)
    }

    return { totaalOpenstaand, betaaldDezeMaand, vervallenCount, gemiddeldeBetaaltermijn }
  }, [facturen])

  const filteredFacturen = useMemo(() => {
    let result = [...facturen]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (f) =>
          f.nummer.toLowerCase().includes(q) ||
          f.titel.toLowerCase().includes(q) ||
          (f.klant_naam || '').toLowerCase().includes(q)
      )
    }

    if (filterStatus === 'verlopen') {
      const vandaag = getTodayString()
      result = result.filter((f) => f.vervaldatum < vandaag && f.status !== 'betaald' && f.status !== 'gecrediteerd')
    } else if (filterStatus !== 'alle') {
      result = result.filter((f) => f.status === filterStatus)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'datum':
          cmp = new Date(a.factuurdatum).getTime() - new Date(b.factuurdatum).getTime()
          break
        case 'bedrag':
          cmp = a.totaal - b.totaal
          break
        case 'klantnaam':
          cmp = (a.klant_naam || '').localeCompare(b.klant_naam || '', 'nl')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [facturen, searchQuery, filterStatus, sortField, sortDir])

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterStatus, sortField, sortDir])

  const totalPages = Math.ceil(filteredFacturen.length / PAGE_SIZE)
  const paginatedFacturen = useMemo(
    () => filteredFacturen.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredFacturen, currentPage]
  )

  const goedgekeurdeOffertes = useMemo(() => {
    return offertes.filter((o) => o.status === 'goedgekeurd')
  }, [offertes])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: facturen.length }
    for (const f of facturen) {
      counts[f.status] = (counts[f.status] || 0) + 1
    }
    return counts
  }, [facturen])

  // ============ BULK SELECTION ============

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredFacturen.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredFacturen.map((f) => f.id)))
    }
  }

  async function handleBulkStatusChange(newStatus: FactuurStatus) {
    if (selectedIds.size === 0) return
    try {
      const updates: Partial<Factuur> = { status: newStatus }
      if (newStatus === 'betaald') updates.betaald_op = new Date().toISOString()
      await Promise.all(
        [...selectedIds].map((id) => updateFactuur(id, updates))
      )
      setFacturen((prev) =>
        prev.map((f) => selectedIds.has(f.id) ? { ...f, ...updates } : f)
      )
      toast.success(`${selectedIds.size} factu${selectedIds.size === 1 ? 'ur' : 'ren'} gewijzigd naar ${STATUS_CONFIG[newStatus].label}`)
      setSelectedIds(new Set())
    } catch (err) {
      logger.error('Fout bij bulk statuswijziging:', err)
      toast.error('Kon status niet wijzigen')
    }
  }

  // ============ HANDLERS ============

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir('desc')
      }
    },
    [sortField]
  )

  const resetForm = useCallback(() => {
    setFormData({
      klant_id: '',
      titel: '',
      factuurdatum: getTodayString(),
      vervaldatum: getDefaultVervaldatum(getTodayString()),
      voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
      notities: '',
      items: [createEmptyLineItem()],
    })
    setEditingFactuur(null)
  }, [])

  const handleOpenCreate = useCallback(() => {
    resetForm()
    setCreateDialogOpen(true)
  }, [resetForm])

  const handleOpenEdit = useCallback(
    (factuur: Factuur) => {
      setEditingFactuur(factuur)
      setFormData({
        klant_id: factuur.klant_id,
        titel: factuur.titel,
        factuurdatum: factuur.factuurdatum,
        vervaldatum: factuur.vervaldatum,
        voorwaarden: factuur.voorwaarden,
        notities: factuur.notities,
        items: [
          {
            id: crypto.randomUUID(),
            beschrijving: factuur.titel,
            aantal: 1,
            eenheidsprijs: factuur.subtotaal,
            btw_percentage: factuur.subtotaal > 0 ? Math.round((factuur.btw_bedrag / factuur.subtotaal) * 100) : 21,
            korting_percentage: 0,
          },
        ],
      })
      setCreateDialogOpen(true)
    },
    []
  )

  const handleSaveFactuur = useCallback(async () => {
    if (!formData.klant_id) {
      toast.error('Selecteer een klant')
      return
    }
    if (!formData.titel.trim()) {
      toast.error('Vul een titel in')
      return
    }
    if (formData.items.length === 0 || formData.items.every((i) => !i.beschrijving.trim())) {
      toast.error('Voeg minimaal een regelitem toe')
      return
    }

    const validItems = formData.items.filter((i) => i.beschrijving.trim())
    const subtotaal = calcSubtotaal(validItems)
    const btwBedrag = calcBtwBedrag(validItems)
    const totaal = round2(subtotaal + btwBedrag)

    const selectedKlant = klanten.find((k) => k.id === formData.klant_id)

    try {
      setIsSaving(true)

      if (editingFactuur) {
        const updates: Partial<Factuur> = {
          klant_id: formData.klant_id,
          klant_naam: selectedKlant?.bedrijfsnaam || '',
          titel: formData.titel,
          factuurdatum: formData.factuurdatum,
          vervaldatum: formData.vervaldatum,
          voorwaarden: formData.voorwaarden,
          notities: formData.notities,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
        }

        const updated = await updateFactuur(editingFactuur.id, updates)
        setFacturen((prev) => prev.map((f) => (f.id === editingFactuur.id ? { ...f, ...updated } : f)))
        toast.success('Factuur bijgewerkt')
      } else {
        const nummer = generateFactuurNummer(facturen)
        const betaalToken = generateBetaalToken()
        const betaalLink = `${window.location.origin}/betalen/${betaalToken}`
        const newFactuur: Omit<Factuur, 'id' | 'created_at' | 'updated_at'> = {
          user_id: user?.id || '',
          klant_id: formData.klant_id,
          klant_naam: selectedKlant?.bedrijfsnaam || '',
          offerte_id: formData.offerte_id,
          project_id: formData.project_id,
          nummer,
          titel: formData.titel,
          status: 'concept',
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
          betaald_bedrag: 0,
          factuurdatum: formData.factuurdatum,
          vervaldatum: formData.vervaldatum,
          notities: formData.notities,
          voorwaarden: formData.voorwaarden,
          betaal_token: betaalToken,
          betaal_link: betaalLink,
          factuur_type: 'standaard',
        }

        try {
          const saved = await createFactuur(newFactuur)
          // Create line items
          for (let i = 0; i < validItems.length; i++) {
            const item = validItems[i]
            await createFactuurItem({
              user_id: user?.id || '',
              factuur_id: saved.id,
              beschrijving: item.beschrijving,
              aantal: item.aantal,
              eenheidsprijs: item.eenheidsprijs,
              btw_percentage: item.btw_percentage,
              korting_percentage: item.korting_percentage,
              totaal: calcLineTotal(item),
              volgorde: i + 1,
            })
          }
          setFacturen((prev) => [saved, ...prev])
        } catch {
          // Fallback: add locally with temporary ID
          const localFactuur: Factuur = {
            ...newFactuur,
            id: `local-f-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setFacturen((prev) => [localFactuur, ...prev])
        }
        toast.success('Factuur aangemaakt')
      }

      setCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      logger.error('Fout bij opslaan factuur:', err)
      toast.error('Kon factuur niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [formData, klanten, facturen, editingFactuur, resetForm])

  const handleMarkAsBetaald = useCallback(
    async (factuur: Factuur) => {
      const updates: Partial<Factuur> = {
        status: 'betaald',
        betaald_bedrag: factuur.totaal,
        betaaldatum: getTodayString(),
      }

      try {
        const updated = await updateFactuurStatus(factuur.id, updates)
        setFacturen((prev) => prev.map((f) => (f.id === factuur.id ? { ...f, ...updated } : f)))
      } catch {
        toast.error('Kon status niet bijwerken')
        return
      }
      toast.success(`${factuur.nummer} gemarkeerd als betaald`)
    },
    []
  )

  const handleSendReminder = useCallback(
    async (factuur: Factuur) => {
      // Find the klant to get their email address
      const klant = klanten.find((k) => k.id === factuur.klant_id)
      if (!klant?.email) {
        toast.error('Geen emailadres gevonden voor deze klant')
        return
      }

      const updates: Partial<Factuur> = {
        betalingsherinnering_verzonden: true,
      }

      try {
        await updateFactuur(factuur.id, updates)
      } catch {
        toast.error('Kon herinnering niet verzenden')
        return
      }

      // Send the actual reminder email
      try {
        const vervalDate = new Date(factuur.vervaldatum)
        const dagenVervallen = Math.max(0, Math.floor((Date.now() - vervalDate.getTime()) / (1000 * 60 * 60 * 24)))
        const { subject, html } = factuurHerinneringTemplate({
          klantNaam: klant.contactpersoon || klant.bedrijfsnaam,
          factuurNummer: factuur.nummer,
          factuurTitel: factuur.titel,
          totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(factuur.totaal),
          vervaldatum: formatDate(factuur.vervaldatum),
          dagenVervallen,
        })
        await sendEmail(klant.email, subject, '', { html })
      } catch (emailErr) {
        logger.error('Herinnering email verzenden mislukt:', emailErr)
        // Still update the flag since the intent was to send - but warn the user
        setFacturen((prev) =>
          prev.map((f) =>
            f.id === factuur.id
              ? { ...f, ...updates, updated_at: new Date().toISOString() }
              : f
          )
        )
        toast.error('Herinnering gemarkeerd maar email niet verzonden')
        return
      }

      setFacturen((prev) =>
        prev.map((f) =>
          f.id === factuur.id
            ? { ...f, ...updates, updated_at: new Date().toISOString() }
            : f
        )
      )
      toast.success(`Herinnering verzonden voor ${factuur.nummer}`)
    },
    [klanten]
  )

  const handleDeleteFactuur = useCallback(
    async (factuur: Factuur) => {
      try {
        await deleteFactuur(factuur.id)
      } catch {
        toast.error('Kon factuur niet verwijderen')
        return
      }
      setFacturen((prev) => prev.filter((f) => f.id !== factuur.id))
      setViewingFactuur(null)
      toast.success(`${factuur.nummer} verwijderd`)
    },
    []
  )

  const handleConvertOfferte = useCallback(
    async (offerte: Offerte) => {
      let items: OfferteItem[] = []
      try {
        items = await getOfferteItems(offerte.id)
      } catch {
        // Use empty items if fetch fails
      }

      const lineItems: LineItem[] =
        items.length > 0
          ? items.map((item) => ({
              id: crypto.randomUUID(),
              beschrijving: item.beschrijving,
              aantal: item.aantal,
              eenheidsprijs: item.eenheidsprijs,
              btw_percentage: item.btw_percentage,
              korting_percentage: item.korting_percentage,
            }))
          : [
              {
                id: crypto.randomUUID(),
                beschrijving: offerte.titel,
                aantal: 1,
                eenheidsprijs: offerte.subtotaal,
                btw_percentage: offerte.subtotaal > 0 ? Math.round((offerte.btw_bedrag / offerte.subtotaal) * 100) : 21,
                korting_percentage: 0,
              },
            ]

      setFormData({
        klant_id: offerte.klant_id,
        offerte_id: offerte.id,
        project_id: offerte.project_id || undefined,
        titel: offerte.titel,
        factuurdatum: getTodayString(),
        vervaldatum: getDefaultVervaldatum(getTodayString()),
        voorwaarden: offerte.voorwaarden || 'Betaling binnen 30 dagen na factuurdatum.',
        notities: offerte.notities || '',
        items: lineItems,
      })

      setOfferteDialogOpen(false)
      setCreateDialogOpen(true)
      toast.info(`Offerte ${offerte.nummer} geconverteerd naar factuur`)
    },
    []
  )

  // Handle URL-based workflow triggers (e.g. from quote detail or client profile)
  useEffect(() => {
    if (isLoading) return // Wait for data to load first

    const convertOfferteId = searchParams.get('convert_offerte')
    const klantId = searchParams.get('klant')

    if (convertOfferteId && offertes.length > 0) {
      const offerte = offertes.find((o) => o.id === convertOfferteId)
      if (offerte) {
        // Navigate to full-page editor with offerte prefill
        navigate(`/facturen/nieuw?offerte_id=${offerte.id}&klant_id=${offerte.klant_id}`, { replace: true })
      }
    } else if (klantId && klanten.length > 0) {
      // Navigate to editor with klant prefilled
      navigate(`/facturen/nieuw?klant_id=${klantId}`, { replace: true })
    }
  }, [isLoading, searchParams, offertes, klanten, navigate])

  const handleAddLineItem = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyLineItem()],
    }))
  }, [])

  const handleRemoveLineItem = useCallback((id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }))
  }, [])

  const handleUpdateLineItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    }))
  }, [])

  const handleExportCSV = useCallback(() => {
    const headers = ['Nummer', 'Klant', 'Titel', 'Status', 'Factuurdatum', 'Vervaldatum', 'Subtotaal', 'BTW', 'Totaal']
    const rows = filteredFacturen.map((f) => ({
      Nummer: f.nummer,
      Klant: f.klant_naam || '',
      Titel: f.titel,
      Status: STATUS_CONFIG[f.status].label,
      Factuurdatum: formatDate(f.factuurdatum),
      Vervaldatum: formatDate(f.vervaldatum),
      Subtotaal: f.subtotaal,
      BTW: f.btw_bedrag,
      Totaal: f.totaal,
    }))
    exportCSV('facturen', headers, rows)
    toast.success('CSV gedownload')
  }, [filteredFacturen])

  const handleExportExcel = useCallback(() => {
    const headers = ['Nummer', 'Klant', 'Titel', 'Status', 'Factuurdatum', 'Vervaldatum', 'Subtotaal', 'BTW', 'Totaal']
    const rows = filteredFacturen.map((f) => ({
      Nummer: f.nummer,
      Klant: f.klant_naam || '',
      Titel: f.titel,
      Status: STATUS_CONFIG[f.status].label,
      Factuurdatum: formatDate(f.factuurdatum),
      Vervaldatum: formatDate(f.vervaldatum),
      Subtotaal: f.subtotaal,
      BTW: f.btw_bedrag,
      Totaal: f.totaal,
    }))
    exportExcel('facturen', headers, rows, 'Facturen')
    toast.success('Excel gedownload')
  }, [filteredFacturen])

  const handleDownloadPdf = useCallback(
    (factuur: Factuur) => {
      const klant = klanten.find((k) => k.id === factuur.klant_id) || {}

      const bedrijfsProfiel = {
        ...profile,
        primaireKleur,
      }

      const factuurData = {
        nummer: factuur.nummer,
        titel: factuur.titel,
        datum: factuur.factuurdatum,
        vervaldatum: factuur.vervaldatum,
        subtotaal: factuur.subtotaal,
        btw_bedrag: factuur.btw_bedrag,
        totaal: factuur.totaal,
        notities: factuur.notities || undefined,
        betaalvoorwaarden: factuur.voorwaarden || undefined,
        factuur_type: factuur.factuur_type || 'standaard',
        betaal_link: factuur.betaal_link || undefined,
      }

      // Build items from factuur data (single line item based on totals)
      const items: OfferteItem[] = [
        {
          id: '',
          offerte_id: '',
          beschrijving: factuur.titel,
          aantal: 1,
          eenheidsprijs: factuur.subtotaal,
          btw_percentage: factuur.subtotaal > 0 ? Math.round((factuur.btw_bedrag / factuur.subtotaal) * 100) : 21,
          korting_percentage: 0,
          totaal: factuur.subtotaal,
          volgorde: 1,
          created_at: new Date().toISOString(),
        },
      ]

      try {
        const doc = generateFactuurPDF(factuurData, items, klant, bedrijfsProfiel, documentStyle)
        doc.save(`factuur-${factuur.nummer}.pdf`)
        toast.success(`PDF gedownload voor ${factuur.nummer}`)
      } catch (err) {
        logger.error('Fout bij genereren PDF:', err)
        toast.error('Kon PDF niet genereren')
      }
    },
    [klanten, profile, primaireKleur]
  )

  const handleSendFactuur = useCallback(
    async (factuur: Factuur) => {
      const klant = klanten.find((k) => k.id === factuur.klant_id)
      if (!klant?.email) {
        toast.error('Geen emailadres gevonden voor deze klant')
        return
      }

      try {
        const { subject, html } = factuurVerzendTemplate({
          klantNaam: klant.contactpersoon || klant.bedrijfsnaam,
          factuurNummer: factuur.nummer,
          factuurTitel: factuur.titel,
          totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(factuur.totaal),
          vervaldatum: formatDate(factuur.vervaldatum),
          bedrijfsnaam,
          primaireKleur,
          handtekening: emailHandtekening || undefined,
          logoUrl: profile?.logo_url || undefined,
          betaalUrl: factuur.betaal_link || undefined,
        })

        await sendEmail(klant.email, subject, '', { html })

        // Update status to 'verzonden'
        const updates: Partial<Factuur> = { status: 'verzonden' }

        try {
          const updated = await updateFactuur(factuur.id, updates)
          setFacturen((prev) => prev.map((f) => (f.id === factuur.id ? { ...f, ...updated } : f)))
        } catch {
          // Still update locally even if DB update fails
          setFacturen((prev) =>
            prev.map((f) =>
              f.id === factuur.id
                ? { ...f, ...updates, updated_at: new Date().toISOString() }
                : f
            )
          )
        }

        toast.success(`Factuur ${factuur.nummer} verzonden naar ${klant.email}`)
      } catch (err) {
        logger.error('Fout bij verzenden factuur:', err)
        toast.error('Kon factuur niet verzenden')
      }
    },
    [klanten, bedrijfsnaam, primaireKleur, emailHandtekening]
  )

  // ============ HERINNERING LOGIC ============

  const getDagenVerlopen = useCallback((factuur: Factuur): number => {
    const vervaldatum = new Date(factuur.vervaldatum)
    const vandaag = new Date()
    return Math.max(0, Math.floor((vandaag.getTime() - vervaldatum.getTime()) / (1000 * 60 * 60 * 24)))
  }, [])

  const getVolgendeHerinnering = useCallback((factuur: Factuur): HerinneringTemplate['type'] | null => {
    const dagen = getDagenVerlopen(factuur)
    if (dagen <= 0) return null
    if (!factuur.herinnering_1_verstuurd && dagen >= 7) return 'herinnering_1'
    if (!factuur.herinnering_2_verstuurd && dagen >= 14) return 'herinnering_2'
    if (!factuur.herinnering_3_verstuurd && dagen >= 21) return 'herinnering_3'
    if (!factuur.aanmaning_verstuurd && dagen >= 30) return 'aanmaning'
    return null
  }, [getDagenVerlopen])

  const openHerinneringDialog = useCallback((factuur: Factuur) => {
    const type = getVolgendeHerinnering(factuur) || 'herinnering_1'
    const template = herinneringTemplates.find((t) => t.type === type)
    const klant = klanten.find((k) => k.id === factuur.klant_id)
    if (template && klant) {
      const preview = template.inhoud
        .replace(/{klant_naam}/g, klant.contactpersoon || klant.bedrijfsnaam)
        .replace(/{factuur_nummer}/g, factuur.nummer)
        .replace(/{factuur_bedrag}/g, formatCurrency(factuur.totaal))
        .replace(/{vervaldatum}/g, formatDate(factuur.vervaldatum))
        .replace(/{dagen_verlopen}/g, String(getDagenVerlopen(factuur)))
        .replace(/{bedrijfsnaam}/g, bedrijfsnaam || '')
      setHerinneringPreview(preview)
    }
    setHerinneringFactuur(factuur)
    setHerinneringType(type)
    setHerinneringDialogOpen(true)
  }, [getVolgendeHerinnering, herinneringTemplates, klanten, getDagenVerlopen, bedrijfsnaam])

  const handleVerstuurHerinnering = useCallback(async () => {
    if (!herinneringFactuur) return
    const klant = klanten.find((k) => k.id === herinneringFactuur.klant_id)
    if (!klant?.email) {
      toast.error('Geen emailadres gevonden voor deze klant')
      return
    }

    const template = herinneringTemplates.find((t) => t.type === herinneringType)
    if (!template) {
      toast.error('Geen herinnering template gevonden')
      return
    }

    try {
      const onderwerp = template.onderwerp
        .replace(/{factuur_nummer}/g, herinneringFactuur.nummer)

      // Try to send email (may fail if SMTP not configured)
      try {
        await sendEmail(klant.email, onderwerp, herinneringPreview, {})
      } catch {
        toast.warning('Email niet verzonden (SMTP niet geconfigureerd). Herinnering is wel gemarkeerd.')
      }

      // Mark herinnering as sent
      const fieldMap: Record<string, string> = {
        herinnering_1: 'herinnering_1_verstuurd',
        herinnering_2: 'herinnering_2_verstuurd',
        herinnering_3: 'herinnering_3_verstuurd',
        aanmaning: 'aanmaning_verstuurd',
      }
      const updateField = fieldMap[herinneringType]
      const updates: Partial<Factuur> = { [updateField]: new Date().toISOString() }

      await updateFactuur(herinneringFactuur.id, updates)
      setFacturen((prev) => prev.map((f) => f.id === herinneringFactuur.id ? { ...f, ...updates } : f))

      toast.success(`${template.type === 'aanmaning' ? 'Aanmaning' : 'Herinnering'} gemarkeerd voor ${herinneringFactuur.nummer}`)
      setHerinneringDialogOpen(false)
    } catch (err) {
      toast.error('Fout bij versturen herinnering')
    }
  }, [herinneringFactuur, klanten, herinneringTemplates, herinneringType, herinneringPreview])

  // ============ CREDITNOTA / VOORSCHOT LOGIC ============

  const handleOpenCreditnota = useCallback((factuur: Factuur) => {
    setCreditnotaFactuur(factuur)
    setCreditReden('')
    setCreditnotaDialogOpen(true)
  }, [])

  const handleCreateCreditnota = useCallback(async () => {
    if (!creditnotaFactuur) return
    if (!creditReden.trim()) {
      toast.error('Vul een reden in voor de creditnota')
      return
    }

    try {
      setIsSaving(true)
      const nummer = generateTypedNummer(facturen, 'CN')
      const selectedKlant = klanten.find((k) => k.id === creditnotaFactuur.klant_id)

      const cnToken = generateBetaalToken()
      const creditnota: Omit<Factuur, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user?.id || '',
        klant_id: creditnotaFactuur.klant_id,
        klant_naam: selectedKlant?.bedrijfsnaam || creditnotaFactuur.klant_naam || '',
        offerte_id: creditnotaFactuur.offerte_id,
        project_id: creditnotaFactuur.project_id,
        nummer,
        titel: `Creditnota voor ${creditnotaFactuur.nummer}`,
        status: 'concept',
        subtotaal: round2(-creditnotaFactuur.subtotaal),
        btw_bedrag: round2(-creditnotaFactuur.btw_bedrag),
        totaal: round2(-creditnotaFactuur.totaal),
        betaald_bedrag: 0,
        factuurdatum: getTodayString(),
        vervaldatum: getDefaultVervaldatum(getTodayString()),
        notities: `Creditnota: ${creditReden}`,
        voorwaarden: creditnotaFactuur.voorwaarden,
        factuur_type: 'creditnota',
        betaal_token: cnToken,
        betaal_link: `${window.location.origin}/betalen/${cnToken}`,
        gerelateerde_factuur_id: creditnotaFactuur.id,
        credit_reden: creditReden,
      }

      const saved = await createFactuur(creditnota)

      // Mark original as gecrediteerd
      await updateFactuur(creditnotaFactuur.id, { status: 'gecrediteerd' })
      setFacturen((prev) => prev.map((f) =>
        f.id === creditnotaFactuur.id ? { ...f, status: 'gecrediteerd' } : f
      ))
      setFacturen((prev) => [saved, ...prev])

      setCreditnotaDialogOpen(false)
      toast.success(`Creditnota ${nummer} aangemaakt`)
    } catch {
      toast.error('Fout bij aanmaken creditnota')
    } finally {
      setIsSaving(false)
    }
  }, [creditnotaFactuur, creditReden, facturen, klanten])

  const handleOpenVoorschot = useCallback((offerte: Offerte) => {
    setVoorschotOfferte(offerte)
    setVoorschotPercentage(30)
    setVoorschotDialogOpen(true)
    setOfferteDialogOpen(false)
  }, [])

  const handleCreateVoorschot = useCallback(async () => {
    if (!voorschotOfferte) return
    if (voorschotPercentage <= 0 || voorschotPercentage >= 100) {
      toast.error('Percentage moet tussen 1 en 99 zijn')
      return
    }

    try {
      setIsSaving(true)
      const nummer = generateTypedNummer(facturen, 'VS')
      const selectedKlant = klanten.find((k) => k.id === voorschotOfferte.klant_id)

      const subtotaal = round2(voorschotOfferte.subtotaal * (voorschotPercentage / 100))
      const btwBedrag = round2(voorschotOfferte.btw_bedrag * (voorschotPercentage / 100))
      const totaal = round2(subtotaal + btwBedrag)

      const vsToken = generateBetaalToken()
      const voorschotFactuur: Omit<Factuur, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user?.id || '',
        klant_id: voorschotOfferte.klant_id,
        klant_naam: selectedKlant?.bedrijfsnaam || voorschotOfferte.klant_naam || '',
        offerte_id: voorschotOfferte.id,
        project_id: voorschotOfferte.project_id || undefined,
        nummer,
        titel: `Voorschotfactuur ${voorschotPercentage}% — ${voorschotOfferte.titel}`,
        status: 'concept',
        subtotaal,
        btw_bedrag: btwBedrag,
        totaal,
        betaald_bedrag: 0,
        factuurdatum: getTodayString(),
        vervaldatum: getDefaultVervaldatum(getTodayString()),
        notities: `Voorschot ${voorschotPercentage}% van offerte ${voorschotOfferte.nummer}`,
        voorwaarden: factuurVoorwaarden || `Betaling binnen ${factuurBetaaltermijnDagen} dagen na factuurdatum.`,
        factuur_type: 'voorschot',
        betaal_token: vsToken,
        betaal_link: `${window.location.origin}/betalen/${vsToken}`,
        gerelateerde_factuur_id: undefined,
        voorschot_percentage: voorschotPercentage,
      }

      const saved = await createFactuur(voorschotFactuur)
      setFacturen((prev) => [saved, ...prev])

      setVoorschotDialogOpen(false)
      toast.success(`Voorschotfactuur ${nummer} aangemaakt (${voorschotPercentage}%)`)
    } catch {
      toast.error('Fout bij aanmaken voorschotfactuur')
    } finally {
      setIsSaving(false)
    }
  }, [voorschotOfferte, voorschotPercentage, facturen, klanten])

  const handleOpenEindafrekening = useCallback((factuur: Factuur) => {
    setEindafrekeningFactuur(factuur)
    setEindafrekeningDialogOpen(true)
  }, [])

  const betaaldeVoorschotten = useMemo(() => {
    if (!eindafrekeningFactuur) return []
    // Find voorschotfacturen for the same offerte that are betaald
    return facturen.filter((f) =>
      f.factuur_type === 'voorschot' &&
      f.offerte_id === eindafrekeningFactuur.offerte_id &&
      f.status === 'betaald' &&
      !f.is_voorschot_verrekend
    )
  }, [eindafrekeningFactuur, facturen])

  const handleCreateEindafrekening = useCallback(async () => {
    if (!eindafrekeningFactuur) return

    try {
      setIsSaving(true)
      const nummer = generateTypedNummer(facturen, 'EA')
      const selectedKlant = klanten.find((k) => k.id === eindafrekeningFactuur.klant_id)

      const voorschotTotaal = round2(betaaldeVoorschotten.reduce((s, f) => s + f.totaal, 0))
      const voorschotSubtotaal = round2(betaaldeVoorschotten.reduce((s, f) => s + f.subtotaal, 0))
      const restSubtotaal = round2(eindafrekeningFactuur.subtotaal - voorschotSubtotaal)
      const restBtw = round2(restSubtotaal * (eindafrekeningFactuur.subtotaal > 0 ? eindafrekeningFactuur.btw_bedrag / eindafrekeningFactuur.subtotaal : 0.21))
      const restBedrag = round2(restSubtotaal + restBtw)

      const eaToken = generateBetaalToken()
      const eindafrekening: Omit<Factuur, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user?.id || '',
        klant_id: eindafrekeningFactuur.klant_id,
        klant_naam: selectedKlant?.bedrijfsnaam || eindafrekeningFactuur.klant_naam || '',
        offerte_id: eindafrekeningFactuur.offerte_id,
        project_id: eindafrekeningFactuur.project_id,
        nummer,
        titel: `Eindafrekening — ${eindafrekeningFactuur.titel}`,
        status: 'concept',
        subtotaal: restSubtotaal,
        btw_bedrag: restBtw,
        totaal: restBedrag,
        betaald_bedrag: 0,
        factuurdatum: getTodayString(),
        vervaldatum: getDefaultVervaldatum(getTodayString()),
        notities: `Eindafrekening na ${betaaldeVoorschotten.length} voorschot(ten) (${formatCurrency(voorschotTotaal)} verrekend)`,
        voorwaarden: eindafrekeningFactuur.voorwaarden,
        factuur_type: 'eindafrekening',
        betaal_token: eaToken,
        betaal_link: `${window.location.origin}/betalen/${eaToken}`,
        gerelateerde_factuur_id: eindafrekeningFactuur.id,
        verrekende_voorschot_ids: betaaldeVoorschotten.map((f) => f.id),
      }

      const saved = await createFactuur(eindafrekening)

      // Mark voorschotten as verrekend
      for (const vs of betaaldeVoorschotten) {
        await updateFactuur(vs.id, { is_voorschot_verrekend: true })
      }
      setFacturen((prev) => prev.map((f) =>
        betaaldeVoorschotten.some((vs) => vs.id === f.id)
          ? { ...f, is_voorschot_verrekend: true }
          : f
      ))
      setFacturen((prev) => [saved, ...prev])

      setEindafrekeningDialogOpen(false)
      toast.success(`Eindafrekening ${nummer} aangemaakt — ${formatCurrency(restBedrag)} resterend`)
    } catch {
      toast.error('Fout bij aanmaken eindafrekening')
    } finally {
      setIsSaving(false)
    }
  }, [eindafrekeningFactuur, betaaldeVoorschotten, facturen, klanten])

  const verlopenCount = useMemo(() => {
    const vandaag = getTodayString()
    return facturen.filter((f) => f.vervaldatum < vandaag && f.status !== 'betaald' && f.status !== 'gecrediteerd').length
  }, [facturen])

  const verlopenTotaal = useMemo(() => {
    const vandaag = getTodayString()
    return round2(facturen
      .filter((f) => f.vervaldatum < vandaag && f.status !== 'betaald' && f.status !== 'gecrediteerd')
      .reduce((sum, f) => sum + f.totaal, 0))
  }, [facturen])

  // ============ RENDER ============

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted animate-shimmer" />
            <div className="space-y-2">
              <div className="h-6 w-28 rounded-lg animate-shimmer" />
              <div className="h-3 w-44 rounded-lg animate-shimmer" />
            </div>
          </div>
          <div className="h-9 w-36 rounded-lg animate-shimmer" />
        </div>
        <SkeletonTable rows={6} cols={5} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col mod-strip mod-strip-facturen">
      {/* ── Header bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/40 bg-background flex-shrink-0 rounded-t-2xl">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #E8866A, #C4604A)' }}>
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="page-title text-foreground truncate">Facturen</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredFacturen.length} van {facturen.length} facturen
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                <Download className="h-4 w-4" />
                Exporteer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                Exporteer als CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                Exporteer als Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => setOfferteDialogOpen(true)}
            className="gap-2 hidden sm:flex"
            size="sm"
          >
            <FileInput className="h-4 w-4" />
            Vanuit offerte
          </Button>
          <Button
            onClick={() => navigate('/facturen/nieuw')}
            className="gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nieuwe factuur</span>
            <span className="sm:hidden">Nieuw</span>
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-6 p-4 sm:p-6">

      {/* ── Statistics ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stat-cards-stagger">
        <div className="stat-card-gradient-blush stat-card-hover stat-card-glow relative overflow-hidden rounded-2xl p-5">
          <p className="text-2xs font-extrabold uppercase tracking-[0.1em] text-text-tertiary mb-3">
            Totaal openstaand
          </p>
          <p className="display-number display-number-lg text-foreground font-mono">
            {formatCurrency(statistics.totaalOpenstaand)}
          </p>
          <p className="text-xs font-semibold text-[#3A7D52] mt-3">
            nog te ontvangen
          </p>
        </div>

        <div className="stat-card-gradient-sage stat-card-hover stat-card-glow relative overflow-hidden rounded-2xl p-5">
          <p className="text-2xs font-extrabold uppercase tracking-[0.1em] text-text-tertiary mb-3">
            Betaald deze maand
          </p>
          <p className="display-number display-number-lg text-foreground font-mono">
            {formatCurrency(statistics.betaaldDezeMaand)}
          </p>
          <p className="text-xs font-semibold text-[#3A7D52] mt-3">
            ontvangen
          </p>
        </div>

        <div className="stat-card-hover relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, var(--color-coral), color-mix(in srgb, var(--color-coral) 70%, white))', border: '1px solid var(--color-coral-border)' }}>
          <p className="text-2xs font-extrabold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--color-coral-text)' }}>
            Vervallen facturen
          </p>
          <p className="display-number display-number-lg text-foreground">
            {verlopenCount}
          </p>
          <p className="text-xs font-semibold mt-3" style={{ color: 'var(--color-coral-text)' }}>
            {verlopenTotaal > 0 ? formatCurrency(verlopenTotaal) : 'actie vereist'}
          </p>
          {verlopenCount > 0 && (
            <button
              className="text-xs font-bold hover:underline mt-1"
              style={{ color: 'var(--color-coral-text)' }}
              onClick={() => setFilterStatus('verlopen')}
            >
              Toon verlopen →
            </button>
          )}
        </div>

        <div className="stat-card-hover relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, var(--color-cream), color-mix(in srgb, var(--color-cream) 70%, white))', border: '1px solid var(--color-cream-border)' }}>
          <p className="text-2xs font-extrabold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--color-cream-text)' }}>
            Gem. betaaltermijn
          </p>
          <p className="display-number display-number-lg text-foreground">
            {statistics.gemiddeldeBetaaltermijn} <span className="text-[18px]">dagen</span>
          </p>
          <p className="text-xs font-semibold mt-3" style={{ color: 'var(--color-cream-text)' }}>
            gemiddeld
          </p>
        </div>
      </div>

      {/* ── Search + Filters ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op nummer, titel of klant..."
            className="pl-10 rounded-xl bg-card/70 backdrop-blur-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTER_OPTIONS.map((option) => {
          const count = statusCounts[option.value] || 0
          return (
            <button
              key={option.value}
              onClick={() => setFilterStatus(option.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5',
                filterStatus === option.value
                  ? 'bg-primary/12 text-accent dark:bg-primary/20 dark:text-wm-light ring-1 ring-primary/25 shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {option.value !== 'alle' && (
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    STATUS_CONFIG[option.value as FactuurStatus]?.dot
                  )}
                />
              )}
              {option.label}
              <span className="text-2xs opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* ── Sort toolbar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowUpDown className="w-3.5 h-3.5" />
        <span className="font-medium">Sorteer:</span>
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSort(option.value)}
            className={cn(
              'px-2 py-1 rounded-lg transition-colors',
              sortField === option.value
                ? 'text-accent dark:text-wm-light font-semibold bg-primary/8 dark:bg-primary/15'
                : 'hover:text-foreground hover:bg-muted/50'
            )}
          >
            {option.label}
            {sortField === option.value && (
              <span className="ml-1 inline-flex">
                {sortDir === 'asc' ? (
                  <ArrowUp className="h-3 w-3 inline" />
                ) : (
                  <ArrowDown className="h-3 w-3 inline" />
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Mobile card view ── */}
      <div className="md:hidden space-y-2 -mx-1">
        {filteredFacturen.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Geen facturen gevonden</p>
        )}
        {paginatedFacturen.map((factuur) => {
          const config = STATUS_CONFIG[factuur.status]
          const isOverdue = factuur.status === 'verzonden' && new Date(factuur.vervaldatum) < new Date()
          const openstaand = factuur.totaal - factuur.betaald_bedrag
          return (
            <div
              key={`mobile-${factuur.id}`}
              onClick={() => setViewingFactuur(factuur)}
              className={cn(
                'p-4 rounded-xl border bg-card cursor-pointer active:bg-muted/50 transition-colors border-l-3',
                isOverdue ? 'border-l-[var(--color-coral-border)]' : config.border
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-semibold text-foreground">{factuur.nummer}</span>
                    {factuur.factuur_type && factuur.factuur_type !== 'standaard' && (
                      <Badge variant="secondary" className={cn('text-2xs px-1 py-0 h-4', TYPE_CONFIG[factuur.factuur_type].color)}>
                        {TYPE_CONFIG[factuur.factuur_type].label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {factuur.klant_naam || 'Onbekende klant'}
                  </p>
                </div>
                <Badge variant="secondary" className={cn('text-2xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0', config.color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full mr-1 inline-block', config.dot)} />
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{formatDate(factuur.factuurdatum)}</span>
                  {isOverdue && (
                    <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Verlopen
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {openstaand > 0 && openstaand < factuur.totaal && (
                    <span className="text-2xs text-muted-foreground">open: <span className="font-mono">{formatCurrency(openstaand)}</span></span>
                  )}
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(factuur.totaal)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Desktop Table ─────────────────────────────────────────────────── */}
      <div className="hidden md:block rounded-xl border border-black/[0.06] bg-card/80 dark:bg-card/80 backdrop-blur-sm overflow-hidden -mx-3 sm:mx-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={filteredFacturen.length > 0 && selectedIds.size === filteredFacturen.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecteer alles"
                  />
                </th>
                {[
                  { key: 'nummer', label: 'Nummer', hide: '' },
                  { key: 'klant', label: 'Klant', hide: '' },
                  { key: 'titel', label: 'Titel', hide: 'hidden md:table-cell' },
                  { key: 'factuurdatum', label: 'Datum', hide: 'hidden sm:table-cell' },
                  { key: 'vervaldatum', label: 'Vervaldatum', hide: 'hidden lg:table-cell' },
                  { key: 'bedrag', label: 'Bedrag', hide: '' },
                  { key: 'status', label: 'Status', hide: '' },
                  { key: 'verlopen', label: 'Verlopen', hide: 'hidden lg:table-cell' },
                  { key: 'bekeken', label: 'Online', hide: 'hidden lg:table-cell' },
                  { key: 'acties', label: '', hide: 'hidden md:table-cell' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-label text-text-tertiary ${col.hide}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 row-stagger">
              {filteredFacturen.length === 0 && (
                <tr>
                  <td colSpan={12}>
                    <EmptyState
                      module="facturen"
                      title="Nog geen facturen"
                      description={searchQuery || filterStatus !== 'alle'
                        ? 'Probeer een ander filter of zoekterm.'
                        : 'Keur een offerte goed en factureer je eerste sign-opdracht.'}
                    />
                  </td>
                </tr>
              )}
              {paginatedFacturen.map((factuur) => {
                const config = STATUS_CONFIG[factuur.status]
                const isOverdue =
                  factuur.status === 'verzonden' &&
                  new Date(factuur.vervaldatum) < new Date()

                return (
                  <tr
                    key={factuur.id}
                    className={cn(
                      'group hover:bg-bg-subtle/60 transition-colors',
                      'border-l-2',
                      isOverdue ? 'border-l-[var(--color-coral-border)]' : config.border,
                      factuur.status === 'betaald' && 'factuur-row-betaald',
                      isOverdue && 'factuur-row-verlopen',
                      selectedIds.has(factuur.id) && 'bg-primary/5'
                    )}
                  >
                    <td className="w-10 px-3 py-3">
                      <Checkbox
                        checked={selectedIds.has(factuur.id)}
                        onCheckedChange={() => toggleSelect(factuur.id)}
                        aria-label={`Selecteer ${factuur.nummer}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingFactuur(factuur)}
                          className="text-sm font-mono font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {factuur.nummer}
                        </button>
                        {factuur.factuur_type && factuur.factuur_type !== 'standaard' && (
                          <Badge variant="secondary" className={cn('text-2xs px-1 py-0 h-4', TYPE_CONFIG[factuur.factuur_type].color)}>
                            {TYPE_CONFIG[factuur.factuur_type].label}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/klanten/${factuur.klant_id}`}
                        className="text-sm text-foreground/80 hover:text-primary dark:hover:text-wm-light hover:underline transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {factuur.klant_naam || 'Onbekende klant'}
                      </a>
                    </td>
                    <td className="px-4 py-3 max-w-[220px] hidden md:table-cell">
                      <span className="text-sm text-foreground/80 truncate block">
                        {factuur.titel}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(factuur.factuurdatum)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'text-sm',
                            isOverdue
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-muted-foreground'
                          )}
                        >
                          {formatDate(factuur.vervaldatum)}
                        </span>
                        {isOverdue && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Vervallen" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-foreground">
                        {formatCurrency(factuur.totaal)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', config.color)}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', config.dot)} />
                        {config.label}
                        {isOverdue && ' (vervallen)'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {isOverdue && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-red-600">{getDagenVerlopen(factuur)}d</span>
                          <div className="flex gap-0.5">
                            {factuur.herinnering_1_verstuurd && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Herinnering 1" />}
                            {factuur.herinnering_2_verstuurd && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Herinnering 2" />}
                            {factuur.herinnering_3_verstuurd && <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Herinnering 3" />}
                            {factuur.aanmaning_verstuurd && <span className="w-1.5 h-1.5 rounded-full bg-red-600" title="Aanmaning" />}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {factuur.online_bekeken ? (
                        <div className="flex items-center gap-1.5" title={factuur.online_bekeken_op ? `Bekeken op ${new Date(factuur.online_bekeken_op).toLocaleString('nl-NL')}` : 'Online bekeken'}>
                          <Globe className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs text-accent font-medium">Bekeken</span>
                        </div>
                      ) : factuur.betaal_link ? (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setViewingFactuur(factuur)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Bekijken
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigateWithTab({ path: `/facturen/${factuur.id}/bewerken`, label: factuur.nummer || 'Factuur', id: `/facturen/${factuur.id}` })}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPdf(factuur)}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          {factuur.betaal_link && (<>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(factuur.betaal_link!).then(() => {
                                toast.success('Betaallink gekopieerd naar klembord')
                              }).catch(() => {
                                toast.error('Kon link niet kopiëren')
                              })
                            }}>
                              <Link className="h-4 w-4 mr-2" />
                              Kopieer betaallink
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              const url = factuur.betaal_link!
                              if (navigator.share) {
                                try { await navigator.share({ title: `Factuur ${factuur.nummer}`, url }) } catch { /* cancelled */ }
                              } else {
                                await navigator.clipboard.writeText(url)
                                toast.success('Link gekopieerd naar klembord')
                              }
                            }}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Deel factuur
                            </DropdownMenuItem>
                          </>)}
                          {factuur.status === 'concept' && (
                            <DropdownMenuItem onClick={() => handleSendFactuur(factuur)}>
                              <Send className="h-4 w-4 mr-2" />
                              Verstuur factuur
                            </DropdownMenuItem>
                          )}
                          {(factuur.status === 'verzonden' || factuur.status === 'vervallen') && (
                            <DropdownMenuItem onClick={() => handleMarkAsBetaald(factuur)}>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Markeer als betaald
                            </DropdownMenuItem>
                          )}
                          {(factuur.status === 'verzonden' || factuur.status === 'vervallen') && getVolgendeHerinnering(factuur) && (
                            <DropdownMenuItem onClick={() => openHerinneringDialog(factuur)}>
                              <Bell className="h-4 w-4 mr-2" />
                              Verstuur {getVolgendeHerinnering(factuur) === 'aanmaning' ? 'aanmaning' : 'herinnering'}
                            </DropdownMenuItem>
                          )}
                          {factuur.status !== 'gecrediteerd' && factuur.factuur_type !== 'creditnota' && (
                            <DropdownMenuItem onClick={() => handleOpenCreditnota(factuur)}>
                              <X className="h-4 w-4 mr-2" />
                              Maak creditnota
                            </DropdownMenuItem>
                          )}
                          {factuur.offerte_id && factuur.factuur_type !== 'voorschot' && factuur.factuur_type !== 'creditnota' && (
                            <DropdownMenuItem onClick={() => handleOpenEindafrekening(factuur)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Maak eindafrekening
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteFactuur(factuur)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginatie */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredFacturen.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      {/* ── View Factuur Dialog ────────────────────────────────────── */}
      <Dialog open={!!viewingFactuur} onOpenChange={(open) => !open && setViewingFactuur(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              {viewingFactuur?.nummer}
            </DialogTitle>
            <DialogDescription>Factuurdetails bekijken</DialogDescription>
          </DialogHeader>
          {viewingFactuur && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-1">Klant</p>
                  <a
                    href={`/klanten/${viewingFactuur.klant_id}`}
                    className="text-sm font-medium text-accent dark:text-wm-light hover:underline"
                  >
                    {viewingFactuur.klant_naam || 'Onbekende klant'}
                  </a>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-1">Status</p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-lg',
                      STATUS_CONFIG[viewingFactuur.status].color
                    )}
                  >
                    {STATUS_CONFIG[viewingFactuur.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-1">Titel</p>
                  <p className="text-sm">{viewingFactuur.titel}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-1">Factuurdatum</p>
                  <p className="text-sm">{formatDate(viewingFactuur.factuurdatum)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-1">Vervaldatum</p>
                  <p className="text-sm">{formatDate(viewingFactuur.vervaldatum)}</p>
                </div>
                {viewingFactuur.betaaldatum && (
                  <div>
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-1">Betaaldatum</p>
                    <p className="text-sm">{formatDate(viewingFactuur.betaaldatum)}</p>
                  </div>
                )}
              </div>

              {/* Cross-entity links */}
              {(viewingFactuur.offerte_id || viewingFactuur.project_id) && (
                <div className="flex items-center gap-3 text-xs">
                  {viewingFactuur.offerte_id && (
                    <a
                      href={`/offertes/${viewingFactuur.offerte_id}/preview`}
                      className="inline-flex items-center gap-1 text-accent dark:text-wm-light hover:underline"
                    >
                      <FileInput className="h-3 w-3" />
                      Bekijk offerte
                    </a>
                  )}
                  {viewingFactuur.project_id && (
                    <a
                      href={`/projecten/${viewingFactuur.project_id}`}
                      className="inline-flex items-center gap-1 text-accent dark:text-primary hover:underline"
                    >
                      <FileText className="h-3 w-3" />
                      Bekijk project
                    </a>
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotaal</span>
                  <span className="font-mono">{formatCurrency(viewingFactuur.subtotaal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">BTW</span>
                  <span className="font-mono">{formatCurrency(viewingFactuur.btw_bedrag)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Totaal</span>
                  <span className="font-mono">{formatCurrency(viewingFactuur.totaal)}</span>
                </div>
                {viewingFactuur.betaald_bedrag > 0 && viewingFactuur.betaald_bedrag < viewingFactuur.totaal && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Betaald</span>
                    <span className="font-mono">{formatCurrency(viewingFactuur.betaald_bedrag)}</span>
                  </div>
                )}
              </div>

              {viewingFactuur.notities && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-1">Notities</p>
                    <p className="text-sm text-foreground/80">{viewingFactuur.notities}</p>
                  </div>
                </>
              )}

              {viewingFactuur.voorwaarden && (
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-1">Betalingsvoorwaarden</p>
                  <p className="text-sm text-foreground/80">{viewingFactuur.voorwaarden}</p>
                </div>
              )}

              {viewingFactuur.factuur_type && viewingFactuur.factuur_type !== 'standaard' && (
                <div className={cn(
                  'flex items-center gap-2 text-xs px-3 py-2 rounded-lg',
                  TYPE_CONFIG[viewingFactuur.factuur_type].color
                )}>
                  <FileText className="h-3.5 w-3.5" />
                  {TYPE_CONFIG[viewingFactuur.factuur_type].label}
                  {viewingFactuur.credit_reden && ` — ${viewingFactuur.credit_reden}`}
                  {viewingFactuur.voorschot_percentage && ` — ${viewingFactuur.voorschot_percentage}%`}
                </div>
              )}

              {viewingFactuur.betalingsherinnering_verzonden && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                  <Bell className="h-3.5 w-3.5" />
                  Betalingsherinnering is verzonden
                </div>
              )}

              {/* Online betaling info */}
              {viewingFactuur.betaal_link && (
                <div className="space-y-2">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Link className="h-3.5 w-3.5" />
                      <span>Betaallink</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(viewingFactuur.betaal_link!).then(() => {
                          toast.success('Betaallink gekopieerd')
                        }).catch(() => {})
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      Kopieer
                    </Button>
                  </div>
                  {viewingFactuur.online_bekeken && (
                    <div className="flex items-center gap-2 text-xs text-accent bg-primary/8 dark:bg-primary/15 px-3 py-2 rounded-lg">
                      <Globe className="h-3.5 w-3.5" />
                      Online bekeken{viewingFactuur.online_bekeken_op ? ` op ${new Date(viewingFactuur.online_bekeken_op).toLocaleString('nl-NL')}` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {viewingFactuur && (viewingFactuur.status === 'verzonden' || viewingFactuur.status === 'vervallen') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleMarkAsBetaald(viewingFactuur)
                  setViewingFactuur(null)
                }}
                className="gap-1"
              >
                <CreditCard className="h-4 w-4" />
                Markeer als betaald
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewingFactuur) navigateWithTab({ path: `/facturen/${viewingFactuur.id}/bewerken`, label: viewingFactuur.nummer || 'Factuur', id: `/facturen/${viewingFactuur.id}` })
              }}
              className="gap-1"
            >
              <Pencil className="h-4 w-4" />
              Bewerken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Dialog ──────────────────────────────────── */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              {editingFactuur ? 'Factuur bewerken' : 'Nieuwe factuur'}
            </DialogTitle>
            <DialogDescription>
              {editingFactuur
                ? `Bewerk factuur ${editingFactuur.nummer}`
                : 'Maak een nieuwe factuur aan voor een klant.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-5 pb-4">
              {/* Klant + Titel */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="klant">Klant</Label>
                  <Select
                    value={formData.klant_id}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, klant_id: val }))}
                  >
                    <SelectTrigger id="klant">
                      <SelectValue placeholder="Selecteer klant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {klanten.map((klant) => (
                        <SelectItem key={klant.id} value={klant.id}>
                          {klant.bedrijfsnaam}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titel">Titel</Label>
                  <Input
                    id="titel"
                    value={formData.titel}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titel: e.target.value }))}
                    placeholder="Bijv. Gevelreclame montage"
                  />
                </div>
              </div>

              {/* Datum + Vervaldatum */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="factuurdatum">Factuurdatum</Label>
                  <Input
                    id="factuurdatum"
                    type="date"
                    value={formData.factuurdatum}
                    onChange={(e) => {
                      const newDate = e.target.value
                      setFormData((prev) => ({
                        ...prev,
                        factuurdatum: newDate,
                        vervaldatum: getDefaultVervaldatum(newDate),
                      }))
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vervaldatum">Vervaldatum (standaard 30 dagen)</Label>
                  <Input
                    id="vervaldatum"
                    type="date"
                    value={formData.vervaldatum}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vervaldatum: e.target.value }))}
                  />
                </div>
              </div>

              {/* Voorwaarden */}
              <div className="space-y-2">
                <Label htmlFor="voorwaarden">Betalingsvoorwaarden</Label>
                <Input
                  id="voorwaarden"
                  value={formData.voorwaarden}
                  onChange={(e) => setFormData((prev) => ({ ...prev, voorwaarden: e.target.value }))}
                  placeholder="Bijv. Betaling binnen 30 dagen na factuurdatum."
                />
              </div>

              {/* Notities */}
              <div className="space-y-2">
                <Label htmlFor="notities">Notities</Label>
                <Input
                  id="notities"
                  value={formData.notities}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notities: e.target.value }))}
                  placeholder="Interne notities..."
                />
              </div>

              <Separator />

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Regelitems</Label>
                  <Button variant="outline" size="sm" onClick={handleAddLineItem} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Regel toevoegen
                  </Button>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-label text-text-tertiary">Beschrijving</th>
                        <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-label text-text-tertiary w-20">Aantal</th>
                        <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-label text-text-tertiary w-28">Prijs</th>
                        <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-label text-text-tertiary w-20">BTW %</th>
                        <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-label text-text-tertiary w-24">Korting %</th>
                        <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-label text-text-tertiary w-28">Totaal</th>
                        <th className="px-3 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border/50">
                      {formData.items.map((item) => (
                        <tr key={item.id} className="group">
                          <td className="px-3 py-2">
                            <Input
                              value={item.beschrijving}
                              onChange={(e) => handleUpdateLineItem(item.id, 'beschrijving', e.target.value)}
                              placeholder="Omschrijving..."
                              className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={item.aantal}
                              onChange={(e) => handleUpdateLineItem(item.id, 'aantal', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm text-right border-0 bg-transparent shadow-none focus-visible:ring-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.eenheidsprijs}
                              onChange={(e) => handleUpdateLineItem(item.id, 'eenheidsprijs', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm text-right border-0 bg-transparent shadow-none focus-visible:ring-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={item.btw_percentage}
                              onChange={(e) => handleUpdateLineItem(item.id, 'btw_percentage', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm text-right border-0 bg-transparent shadow-none focus-visible:ring-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={item.korting_percentage}
                              onChange={(e) => handleUpdateLineItem(item.id, 'korting_percentage', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm text-right border-0 bg-transparent shadow-none focus-visible:ring-1"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-sm font-mono font-medium text-foreground">
                              {formatCurrency(calcLineTotal(item))}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {formData.items.length > 1 && (
                              <button
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="text-muted-foreground/60 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotaal</span>
                      <span className="font-mono font-medium">{formatCurrency(calcSubtotaal(formData.items))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">BTW</span>
                      <span className="font-mono font-medium">{formatCurrency(calcBtwBedrag(formData.items))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-bold">
                      <span>Totaal</span>
                      <span className="font-mono">{formatCurrency(round2(calcSubtotaal(formData.items) + calcBtwBedrag(formData.items)))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                resetForm()
              }}
              disabled={isSaving}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleSaveFactuur}
              disabled={isSaving}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingFactuur ? 'Opslaan' : 'Factuur aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Vanuit Offerte Dialog ─────────────────────────────────── */}
      <Dialog open={offerteDialogOpen} onOpenChange={setOfferteDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileInput className="h-5 w-5 text-primary" />
              Factuur vanuit offerte
            </DialogTitle>
            <DialogDescription>
              Selecteer een goedgekeurde offerte om te converteren naar een factuur.
              Alle regels worden automatisch overgenomen.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            {goedgekeurdeOffertes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Geen goedgekeurde offertes</p>
                <p className="text-xs mt-1">
                  Alleen goedgekeurde offertes kunnen omgezet worden naar een factuur.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {goedgekeurdeOffertes.map((offerte) => (
                  <div
                    key={offerte.id}
                    className="p-4 rounded-xl border border-border hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono font-semibold text-accent dark:text-wm-light">
                            {offerte.nummer}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-2xs px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          >
                            Goedgekeurd
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {offerte.titel}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {offerte.klant_naam || 'Onbekende klant'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-mono font-bold text-foreground">
                          {formatCurrency(offerte.totaal)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(offerte.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => {
                        setOfferteDialogOpen(false)
                        navigate(`/facturen/nieuw?offerte_id=${offerte.id}&klant_id=${offerte.klant_id}`)
                      }}>
                        Volledige factuur
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 flex-1 text-purple-700 border-purple-200 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/30" onClick={() => handleOpenVoorschot(offerte)}>
                        Voorschotfactuur
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Creditnota Dialog ── */}
      <Dialog open={creditnotaDialogOpen} onOpenChange={setCreditnotaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              Creditnota aanmaken
            </DialogTitle>
            <DialogDescription>
              Maak een creditnota aan voor factuur {creditnotaFactuur?.nummer}.
              De originele factuur wordt gemarkeerd als gecrediteerd.
            </DialogDescription>
          </DialogHeader>
          {creditnotaFactuur && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 dark:bg-muted/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Originele factuur</span>
                  <span className="font-mono font-semibold">{creditnotaFactuur.nummer}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bedrag</span>
                  <span className="font-mono font-semibold">{formatCurrency(creditnotaFactuur.totaal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Creditnota bedrag</span>
                  <span className="font-mono font-semibold text-red-600">{formatCurrency(-creditnotaFactuur.totaal)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reden creditnota *</Label>
                <Input
                  value={creditReden}
                  onChange={(e) => setCreditReden(e.target.value)}
                  placeholder="Bijv. Foutieve facturatie, annulering..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditnotaDialogOpen(false)} disabled={isSaving}>Annuleren</Button>
            <Button variant="destructive" onClick={handleCreateCreditnota} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
              Creditnota aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Voorschot Dialog ── */}
      <Dialog open={voorschotDialogOpen} onOpenChange={setVoorschotDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              Voorschotfactuur aanmaken
            </DialogTitle>
            <DialogDescription>
              Maak een voorschotfactuur aan op basis van offerte {voorschotOfferte?.nummer}.
            </DialogDescription>
          </DialogHeader>
          {voorschotOfferte && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 dark:bg-muted/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Offerte</span>
                  <span className="font-mono font-semibold">{voorschotOfferte.nummer}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Offerte totaal</span>
                  <span className="font-mono font-semibold">{formatCurrency(voorschotOfferte.totaal)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Voorschot percentage</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={voorschotPercentage}
                    onChange={(e) => setVoorschotPercentage(parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <div className="flex gap-1">
                    {[25, 30, 50].map((pct) => (
                      <Button key={pct} variant="outline" size="sm" className="h-7 text-xs" onClick={() => setVoorschotPercentage(pct)}>
                        {pct}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 space-y-1">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-purple-700 dark:text-purple-300">Voorschotbedrag</span>
                  <span className="font-mono text-purple-700 dark:text-purple-300">
                    {formatCurrency(round2(voorschotOfferte.totaal * (voorschotPercentage / 100)))}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Resterend na voorschot</span>
                  <span className="font-mono">{formatCurrency(round2(voorschotOfferte.totaal * ((100 - voorschotPercentage) / 100)))}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoorschotDialogOpen(false)} disabled={isSaving}>Annuleren</Button>
            <Button onClick={handleCreateVoorschot} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
              Voorschotfactuur aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Eindafrekening Dialog ── */}
      <Dialog open={eindafrekeningDialogOpen} onOpenChange={setEindafrekeningDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-500" />
              Eindafrekening aanmaken
            </DialogTitle>
            <DialogDescription>
              Maak een eindafrekening aan met verrekening van betaalde voorschotten.
            </DialogDescription>
          </DialogHeader>
          {eindafrekeningFactuur && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 dark:bg-muted/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Originele factuur</span>
                  <span className="font-mono font-semibold">{eindafrekeningFactuur.nummer}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Totaalbedrag</span>
                  <span className="font-mono font-semibold">{formatCurrency(eindafrekeningFactuur.totaal)}</span>
                </div>
              </div>

              {betaaldeVoorschotten.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Betaalde voorschotten te verrekenen</Label>
                  <div className="space-y-1">
                    {betaaldeVoorschotten.map((vs) => (
                      <div key={vs.id} className="flex justify-between text-sm p-2 rounded bg-emerald-50 dark:bg-emerald-900/20">
                        <span className="font-mono text-emerald-700 dark:text-emerald-300">{vs.nummer}</span>
                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">-{formatCurrency(vs.totaal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Geen betaalde voorschotten gevonden voor deze offerte
                </div>
              )}

              <Separator />
              <div className="flex justify-between text-sm font-bold p-2 rounded bg-teal-50 dark:bg-teal-900/20">
                <span className="text-teal-700 dark:text-teal-300">Resterend bedrag</span>
                <span className="font-mono text-teal-700 dark:text-teal-300">
                  {formatCurrency(round2(
                    eindafrekeningFactuur.totaal - betaaldeVoorschotten.reduce((s, f) => s + f.totaal, 0)
                  ))}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEindafrekeningDialogOpen(false)} disabled={isSaving}>Annuleren</Button>
            <Button onClick={handleCreateEindafrekening} disabled={isSaving || betaaldeVoorschotten.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
              Eindafrekening aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Herinnering Dialog ── */}
      <Dialog open={herinneringDialogOpen} onOpenChange={setHerinneringDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              {herinneringType === 'aanmaning' ? 'Aanmaning versturen' : 'Herinnering versturen'}
            </DialogTitle>
            <DialogDescription>
              Factuur {herinneringFactuur?.nummer} — {getDagenVerlopen(herinneringFactuur || {} as Factuur)} dagen verlopen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Type</Label>
              <div className="flex gap-2 mt-1">
                {(['herinnering_1', 'herinnering_2', 'herinnering_3', 'aanmaning'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={herinneringType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setHerinneringType(type)
                      const template = herinneringTemplates.find((t) => t.type === type)
                      const klant = klanten.find((k) => k.id === herinneringFactuur?.klant_id)
                      if (template && klant && herinneringFactuur) {
                        setHerinneringPreview(
                          template.inhoud
                            .replace(/{klant_naam}/g, klant.contactpersoon || klant.bedrijfsnaam)
                            .replace(/{factuur_nummer}/g, herinneringFactuur.nummer)
                            .replace(/{factuur_bedrag}/g, formatCurrency(herinneringFactuur.totaal))
                            .replace(/{vervaldatum}/g, formatDate(herinneringFactuur.vervaldatum))
                            .replace(/{dagen_verlopen}/g, String(getDagenVerlopen(herinneringFactuur)))
                            .replace(/{bedrijfsnaam}/g, bedrijfsnaam || '')
                        )
                      }
                    }}
                  >
                    {type === 'herinnering_1' ? 'H1' : type === 'herinnering_2' ? 'H2' : type === 'herinnering_3' ? 'H3' : 'Aanm.'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Preview</Label>
              <div className="mt-1 p-3 rounded-lg bg-muted/50 dark:bg-muted/30 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                {herinneringPreview || 'Geen template beschikbaar'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHerinneringDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleVerstuurHerinnering}>
              <Bell className="h-4 w-4 mr-1" /> Verstuur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      </div>
    </div>
  )
}
