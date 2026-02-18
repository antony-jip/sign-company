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
} from 'lucide-react'
import {
  getFacturen,
  createFactuur,
  updateFactuur,
  deleteFactuur,
  getKlanten,
  getOffertes,
  getOfferteItems,
  createFactuurItem,
} from '@/services/supabaseService'
import type { Factuur, FactuurItem, Klant, Offerte, OfferteItem } from '@/types'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { exportCSV, exportExcel } from '@/lib/export'

// ============ TYPES ============

type FactuurStatus = Factuur['status']
type FilterStatus = 'alle' | FactuurStatus
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
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    border: 'border-l-gray-400',
    dot: 'bg-gray-400',
  },
  verzonden: {
    label: 'Verzonden',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  betaald: {
    label: 'Betaald',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
  },
  vervallen: {
    label: 'Vervallen',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    border: 'border-l-red-500',
    dot: 'bg-red-500',
  },
  gecrediteerd: {
    label: 'Gecrediteerd',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    border: 'border-l-purple-500',
    dot: 'bg-purple-500',
  },
}

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'concept', label: 'Concept' },
  { value: 'verzonden', label: 'Verzonden' },
  { value: 'betaald', label: 'Betaald' },
  { value: 'vervallen', label: 'Vervallen' },
  { value: 'gecrediteerd', label: 'Gecrediteerd' },
]

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'datum', label: 'Datum' },
  { value: 'bedrag', label: 'Bedrag' },
  { value: 'klantnaam', label: 'Klantnaam' },
]

// ============ DEMO DATA ============

const demoFacturen: Factuur[] = [
  {
    id: 'demo-f-1',
    user_id: 'demo',
    klant_id: 'demo-k-1',
    klant_naam: 'Bakkerij Van Dijk B.V.',
    offerte_id: undefined,
    project_id: undefined,
    nummer: 'FAC-2026-001',
    titel: 'Gevelreclame en lichtreclame bakkerij',
    status: 'betaald',
    subtotaal: 3450.00,
    btw_bedrag: 724.50,
    totaal: 4174.50,
    betaald_bedrag: 4174.50,
    factuurdatum: '2026-01-10',
    vervaldatum: '2026-02-09',
    betaaldatum: '2026-01-28',
    betalingsherinnering_verzonden: false,
    notities: 'Montage inclusief hoogwerker.',
    voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-28T14:00:00Z',
  },
  {
    id: 'demo-f-2',
    user_id: 'demo',
    klant_id: 'demo-k-2',
    klant_naam: 'Autobedrijf Jansen',
    offerte_id: undefined,
    project_id: undefined,
    nummer: 'FAC-2026-002',
    titel: 'Autobelettering 3x bestelbus',
    status: 'verzonden',
    subtotaal: 2850.00,
    btw_bedrag: 598.50,
    totaal: 3448.50,
    betaald_bedrag: 0,
    factuurdatum: '2026-02-01',
    vervaldatum: '2026-03-03',
    betaaldatum: undefined,
    betalingsherinnering_verzonden: false,
    notities: 'Wrap design inclusief.',
    voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
    created_at: '2026-02-01T10:30:00Z',
    updated_at: '2026-02-01T10:30:00Z',
  },
  {
    id: 'demo-f-3',
    user_id: 'demo',
    klant_id: 'demo-k-3',
    klant_naam: 'Restaurant De Gouden Leeuw',
    offerte_id: undefined,
    project_id: undefined,
    nummer: 'FAC-2026-003',
    titel: 'Terrasschermen met logo-opdruk',
    status: 'vervallen',
    subtotaal: 1890.00,
    btw_bedrag: 396.90,
    totaal: 2286.90,
    betaald_bedrag: 0,
    factuurdatum: '2026-01-05',
    vervaldatum: '2026-02-04',
    betaaldatum: undefined,
    betalingsherinnering_verzonden: true,
    notities: '6 terrasschermen 150x200cm.',
    voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
    created_at: '2026-01-05T14:00:00Z',
    updated_at: '2026-02-05T09:00:00Z',
  },
  {
    id: 'demo-f-4',
    user_id: 'demo',
    klant_id: 'demo-k-4',
    klant_naam: 'Fysiotherapie Centrum Oost',
    offerte_id: undefined,
    project_id: undefined,
    nummer: 'FAC-2026-004',
    titel: 'Raambelettering en zuil',
    status: 'concept',
    subtotaal: 1250.00,
    btw_bedrag: 262.50,
    totaal: 1512.50,
    betaald_bedrag: 0,
    factuurdatum: '2026-02-15',
    vervaldatum: '2026-03-17',
    betaaldatum: undefined,
    betalingsherinnering_verzonden: false,
    notities: 'Wacht op goedkeuring ontwerp.',
    voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
    created_at: '2026-02-15T11:00:00Z',
    updated_at: '2026-02-15T11:00:00Z',
  },
  {
    id: 'demo-f-5',
    user_id: 'demo',
    klant_id: 'demo-k-5',
    klant_naam: 'Bouwbedrijf De Vries & Zn.',
    offerte_id: undefined,
    project_id: undefined,
    nummer: 'FAC-2026-005',
    titel: 'Bouwborden en hekwerkdoeken project Zuidas',
    status: 'betaald',
    subtotaal: 4200.00,
    btw_bedrag: 882.00,
    totaal: 5082.00,
    betaald_bedrag: 5082.00,
    factuurdatum: '2026-02-03',
    vervaldatum: '2026-03-05',
    betaaldatum: '2026-02-12',
    betalingsherinnering_verzonden: false,
    notities: '4 bouwborden 244x122cm + 2 hekwerkdoeken.',
    voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
    created_at: '2026-02-03T08:30:00Z',
    updated_at: '2026-02-12T16:00:00Z',
  },
  {
    id: 'demo-f-6',
    user_id: 'demo',
    klant_id: 'demo-k-1',
    klant_naam: 'Bakkerij Van Dijk B.V.',
    offerte_id: undefined,
    project_id: undefined,
    nummer: 'FAC-2025-048',
    titel: 'Creditnota lichtreclame aanpassing',
    status: 'gecrediteerd',
    subtotaal: -350.00,
    btw_bedrag: -73.50,
    totaal: -423.50,
    betaald_bedrag: 0,
    factuurdatum: '2025-12-20',
    vervaldatum: '2026-01-19',
    betaaldatum: undefined,
    betalingsherinnering_verzonden: false,
    notities: 'Correctie op FAC-2025-045 wegens kleurfout.',
    voorwaarden: '',
    created_at: '2025-12-20T10:00:00Z',
    updated_at: '2025-12-20T10:00:00Z',
  },
]

const demoKlanten: Klant[] = [
  { id: 'demo-k-1', user_id: 'demo', bedrijfsnaam: 'Bakkerij Van Dijk B.V.', contactpersoon: 'Jan van Dijk', email: 'jan@bakkerijvandijk.nl', telefoon: '020-1234567', adres: 'Kalverstraat 12', postcode: '1012 AB', stad: 'Amsterdam', land: 'Nederland', website: 'www.bakkerijvandijk.nl', kvk_nummer: '12345678', btw_nummer: 'NL123456789B01', status: 'actief', tags: ['horeca', 'vaste klant'], notities: '', contactpersonen: [], created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'demo-k-2', user_id: 'demo', bedrijfsnaam: 'Autobedrijf Jansen', contactpersoon: 'Pieter Jansen', email: 'pieter@autojansen.nl', telefoon: '030-9876543', adres: 'Industrieweg 45', postcode: '3542 AE', stad: 'Utrecht', land: 'Nederland', website: 'www.autojansen.nl', kvk_nummer: '87654321', btw_nummer: 'NL987654321B01', status: 'actief', tags: ['automotive'], notities: '', contactpersonen: [], created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'demo-k-3', user_id: 'demo', bedrijfsnaam: 'Restaurant De Gouden Leeuw', contactpersoon: 'Maria Goudsmit', email: 'info@goudeleeuw.nl', telefoon: '010-5551234', adres: 'Marktplein 8', postcode: '3011 DT', stad: 'Rotterdam', land: 'Nederland', website: 'www.goudenleeuw.nl', kvk_nummer: '11223344', btw_nummer: 'NL112233445B01', status: 'actief', tags: ['horeca'], notities: '', contactpersonen: [], created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'demo-k-4', user_id: 'demo', bedrijfsnaam: 'Fysiotherapie Centrum Oost', contactpersoon: 'Dr. Henk Bakker', email: 'info@fysio-oost.nl', telefoon: '020-6789012', adres: 'Linnaeusstraat 92', postcode: '1093 EK', stad: 'Amsterdam', land: 'Nederland', website: 'www.fysio-oost.nl', kvk_nummer: '55667788', btw_nummer: 'NL556677889B01', status: 'actief', tags: ['zorg'], notities: '', contactpersonen: [], created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'demo-k-5', user_id: 'demo', bedrijfsnaam: 'Bouwbedrijf De Vries & Zn.', contactpersoon: 'Klaas de Vries', email: 'klaas@devriesbouw.nl', telefoon: '070-3456789', adres: 'Bouwlaan 33', postcode: '2516 CK', stad: 'Den Haag', land: 'Nederland', website: 'www.devriesbouw.nl', kvk_nummer: '99887766', btw_nummer: 'NL998877665B01', status: 'actief', tags: ['bouw', 'vaste klant'], notities: '', contactpersonen: [], created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
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
  return subtotaal - korting
}

function calcSubtotaal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + calcLineTotal(item), 0)
}

function calcBtwBedrag(items: LineItem[]): number {
  return items.reduce((sum, item) => {
    const lineTotal = calcLineTotal(item)
    return sum + lineTotal * (item.btw_percentage / 100)
  }, 0)
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

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

// ============ COMPONENT ============

export function FacturenLayout() {
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

  // ============ DATA LOADING ============

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const [facturenData, klantenData, offertesData] = await Promise.all([
          getFacturen().catch(() => []),
          getKlanten().catch(() => []),
          getOffertes().catch(() => []),
        ])

        if (facturenData.length === 0) {
          setFacturen(demoFacturen)
        } else {
          setFacturen(facturenData)
        }

        if (klantenData.length === 0) {
          setKlanten(demoKlanten)
        } else {
          setKlanten(klantenData)
        }

        setOffertes(offertesData)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // ============ COMPUTED VALUES ============

  const statistics = useMemo(() => {
    const openStatuses: FactuurStatus[] = ['verzonden', 'vervallen']
    const openFacturen = facturen.filter((f) => openStatuses.includes(f.status))
    const totaalOpenstaand = openFacturen.reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0)

    const betaaldDezeMaand = facturen
      .filter((f) => f.status === 'betaald' && f.betaaldatum && isThisMonth(f.betaaldatum))
      .reduce((sum, f) => sum + f.betaald_bedrag, 0)

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

    if (filterStatus !== 'alle') {
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
    const totaal = subtotaal + btwBedrag

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

        if (!editingFactuur.id.startsWith('demo-')) {
          const updated = await updateFactuur(editingFactuur.id, updates)
          setFacturen((prev) => prev.map((f) => (f.id === editingFactuur.id ? { ...f, ...updated } : f)))
        } else {
          setFacturen((prev) =>
            prev.map((f) =>
              f.id === editingFactuur.id
                ? { ...f, ...updates, updated_at: new Date().toISOString() }
                : f
            )
          )
        }
        toast.success('Factuur bijgewerkt')
      } else {
        const nummer = generateFactuurNummer(facturen)
        const newFactuur: Omit<Factuur, 'id' | 'created_at' | 'updated_at'> = {
          user_id: '',
          klant_id: formData.klant_id,
          klant_naam: selectedKlant?.bedrijfsnaam || '',
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
        }

        try {
          const saved = await createFactuur(newFactuur)
          // Create line items
          for (let i = 0; i < validItems.length; i++) {
            const item = validItems[i]
            await createFactuurItem({
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
          // Fallback: add locally with demo ID
          const localFactuur: Factuur = {
            ...newFactuur,
            id: `demo-f-${Date.now()}`,
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
      console.error('Fout bij opslaan factuur:', err)
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

      if (!factuur.id.startsWith('demo-')) {
        try {
          const updated = await updateFactuur(factuur.id, updates)
          setFacturen((prev) => prev.map((f) => (f.id === factuur.id ? { ...f, ...updated } : f)))
        } catch {
          toast.error('Kon status niet bijwerken')
          return
        }
      } else {
        setFacturen((prev) =>
          prev.map((f) =>
            f.id === factuur.id
              ? { ...f, ...updates, updated_at: new Date().toISOString() }
              : f
          )
        )
      }
      toast.success(`${factuur.nummer} gemarkeerd als betaald`)
    },
    []
  )

  const handleSendReminder = useCallback(
    async (factuur: Factuur) => {
      const updates: Partial<Factuur> = {
        betalingsherinnering_verzonden: true,
      }

      if (!factuur.id.startsWith('demo-')) {
        try {
          await updateFactuur(factuur.id, updates)
        } catch {
          toast.error('Kon herinnering niet verzenden')
          return
        }
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
    []
  )

  const handleDeleteFactuur = useCallback(
    async (factuur: Factuur) => {
      if (!factuur.id.startsWith('demo-')) {
        try {
          await deleteFactuur(factuur.id)
        } catch {
          toast.error('Kon factuur niet verwijderen')
          return
        }
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

  // ============ RENDER ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Facturen laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Facturen</h1>
            <p className="text-sm text-muted-foreground">
              {filteredFacturen.length} van {facturen.length} facturen
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
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
            className="gap-2"
            size="sm"
          >
            <FileInput className="h-4 w-4" />
            Vanuit offerte
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border-0"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Nieuwe factuur
          </Button>
        </div>
      </div>

      {/* ── Statistics ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/40 bg-gradient-to-br from-blue-50/80 to-white/80 dark:from-blue-950/40 dark:to-gray-900/80 backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <Euro className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              Totaal openstaand
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(statistics.totaalOpenstaand)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            nog te ontvangen
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-white/80 dark:from-emerald-950/40 dark:to-gray-900/80 backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Betaald deze maand
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(statistics.betaaldDezeMaand)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            ontvangen
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-red-200/50 dark:border-red-800/40 bg-gradient-to-br from-red-50/80 to-white/80 dark:from-red-950/40 dark:to-gray-900/80 backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
              Vervallen facturen
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistics.vervallenCount}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            actie vereist
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-white/80 dark:from-amber-950/40 dark:to-gray-900/80 backdrop-blur-sm p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              Gem. betaaltermijn
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistics.gemiddeldeBetaaltermijn} dagen
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            gemiddeld
          </p>
        </div>
      </div>

      {/* ── Search + Filters ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op nummer, titel of klant..."
            className="pl-10 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200 dark:border-gray-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((option) => {
          const count = statusCounts[option.value] || 0
          return (
            <button
              key={option.value}
              onClick={() => setFilterStatus(option.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5',
                filterStatus === option.value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
              <span className="text-[10px] opacity-70">({count})</span>
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
                ? 'text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-900/30'
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

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
                <th className="w-1" />
                {[
                  { key: 'nummer', label: 'Nummer' },
                  { key: 'klant', label: 'Klant' },
                  { key: 'titel', label: 'Titel' },
                  { key: 'factuurdatum', label: 'Datum' },
                  { key: 'vervaldatum', label: 'Vervaldatum' },
                  { key: 'bedrag', label: 'Bedrag' },
                  { key: 'status', label: 'Status' },
                  { key: 'acties', label: '' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filteredFacturen.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <FileText className="h-10 w-10 opacity-30" />
                      <p className="text-sm font-medium">Geen facturen gevonden</p>
                      <p className="text-xs">
                        {searchQuery || filterStatus !== 'alle'
                          ? 'Probeer een ander filter of zoekterm.'
                          : 'Maak je eerste factuur aan.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {filteredFacturen.map((factuur) => {
                const config = STATUS_CONFIG[factuur.status]
                const isOverdue =
                  factuur.status === 'verzonden' &&
                  new Date(factuur.vervaldatum) < new Date()

                return (
                  <tr
                    key={factuur.id}
                    className={cn(
                      'group hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors',
                      'border-l-4',
                      isOverdue ? 'border-l-red-500' : config.border
                    )}
                  >
                    <td className="w-1" />
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewingFactuur(factuur)}
                        className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {factuur.nummer}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {factuur.klant_naam || 'Onbekende klant'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">
                        {factuur.titel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(factuur.factuurdatum)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'text-sm',
                            isOverdue
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400'
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
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(factuur.totaal)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-lg', config.color)}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', config.dot)} />
                        {config.label}
                        {isOverdue && ' (vervallen)'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(factuur)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          {(factuur.status === 'verzonden' || factuur.status === 'vervallen') && (
                            <DropdownMenuItem onClick={() => handleMarkAsBetaald(factuur)}>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Markeer als betaald
                            </DropdownMenuItem>
                          )}
                          {(factuur.status === 'verzonden' || factuur.status === 'vervallen') && (
                            <DropdownMenuItem onClick={() => handleSendReminder(factuur)}>
                              <Bell className="h-4 w-4 mr-2" />
                              Verstuur herinnering
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Klant</p>
                  <p className="text-sm font-medium">{viewingFactuur.klant_naam || 'Onbekende klant'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-lg',
                      STATUS_CONFIG[viewingFactuur.status].color
                    )}
                  >
                    {STATUS_CONFIG[viewingFactuur.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Titel</p>
                  <p className="text-sm">{viewingFactuur.titel}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Factuurdatum</p>
                  <p className="text-sm">{formatDate(viewingFactuur.factuurdatum)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Vervaldatum</p>
                  <p className="text-sm">{formatDate(viewingFactuur.vervaldatum)}</p>
                </div>
                {viewingFactuur.betaaldatum && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Betaaldatum</p>
                    <p className="text-sm">{formatDate(viewingFactuur.betaaldatum)}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotaal</span>
                  <span>{formatCurrency(viewingFactuur.subtotaal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">BTW</span>
                  <span>{formatCurrency(viewingFactuur.btw_bedrag)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Totaal</span>
                  <span>{formatCurrency(viewingFactuur.totaal)}</span>
                </div>
                {viewingFactuur.betaald_bedrag > 0 && viewingFactuur.betaald_bedrag < viewingFactuur.totaal && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Betaald</span>
                    <span>{formatCurrency(viewingFactuur.betaald_bedrag)}</span>
                  </div>
                )}
              </div>

              {viewingFactuur.notities && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notities</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{viewingFactuur.notities}</p>
                  </div>
                </>
              )}

              {viewingFactuur.voorwaarden && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Betalingsvoorwaarden</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{viewingFactuur.voorwaarden}</p>
                </div>
              )}

              {viewingFactuur.betalingsherinnering_verzonden && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                  <Bell className="h-3.5 w-3.5" />
                  Betalingsherinnering is verzonden
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
                if (viewingFactuur) handleOpenEdit(viewingFactuur)
                setViewingFactuur(null)
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

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Beschrijving</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground w-20">Aantal</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground w-28">Prijs</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground w-20">BTW %</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground w-24">Korting %</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground w-28">Totaal</th>
                        <th className="px-3 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
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
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(calcLineTotal(item))}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {formData.items.length > 1 && (
                              <button
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
                      <span className="font-medium">{formatCurrency(calcSubtotaal(formData.items))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">BTW</span>
                      <span className="font-medium">{formatCurrency(calcBtwBedrag(formData.items))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-bold">
                      <span>Totaal</span>
                      <span>{formatCurrency(calcSubtotaal(formData.items) + calcBtwBedrag(formData.items))}</span>
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
              <FileInput className="h-5 w-5 text-blue-500" />
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
                  <button
                    key={offerte.id}
                    onClick={() => handleConvertOfferte(offerte)}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {offerte.nummer}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          >
                            Goedgekeurd
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {offerte.titel}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {offerte.klant_naam || 'Onbekende klant'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(offerte.totaal)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDate(offerte.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
