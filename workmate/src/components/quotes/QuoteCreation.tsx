import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom'
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
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  Send,
  Download,
  User,
  FileText,
  Eye,
  Search,
  Building2,
  Contact,
  FolderOpen,
  TrendingUp,
  Percent,
  ShoppingCart,
  X,
  Plus,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Clock,
  Wrench,
  Paperclip,
  CalendarClock,
  Trash2,
} from 'lucide-react'
import { getKlanten, getProjecten, getOffertes, createOfferte, createOfferteItem, updateKlant, getOfferte, getOfferteItems, updateOfferte, deleteOfferteItem } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Klant, Project, Contactpersoon } from '@/types'
import { round2 } from '@/utils/budgetUtils'
import { generateOffertePDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { sendEmail } from '@/services/gmailService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { cn, formatCurrency } from '@/lib/utils'
import { QuoteItemsTable, type QuoteLineItem, type DetailRegel, type PrijsVariant, type OmschrijvingSuggestie, DEFAULT_DETAIL_LABELS } from './QuoteItemsTable'
import { ForgeQuotePreview } from './ForgeQuotePreview'
import type { CalculatieRegel } from '@/types'
import { logger } from '../../utils/logger'

const DEFAULT_VOORWAARDEN = `1. Deze offerte is geldig gedurende de aangegeven termijn.
2. Betaling dient te geschieden binnen 30 dagen na factuurdatum.
3. Alle genoemde bedragen zijn exclusief BTW, tenzij anders vermeld.
4. Levertijd wordt in overleg bepaald na akkoord op deze offerte.
5. Op al onze leveringen en diensten zijn onze algemene voorwaarden van toepassing.
6. Kleuren en materialen kunnen licht afwijken van getoonde voorbeelden.
7. Wijzigingen na akkoord kunnen tot meerkosten leiden.
8. Garantie: 2 jaar op materiaal en constructie, 1 jaar op elektronica.`

const ITEM_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const

const steps = [
  { number: 0, label: 'Klant & Details', icon: User },
  { number: 1, label: 'Items invullen', icon: FileText },
  { number: 2, label: 'Preview', icon: Eye },
]

function generateOfferteNummer(prefix: string = 'OFF', existingOffertes: { nummer: string }[] = []): string {
  const year = new Date().getFullYear()
  const jaarPrefix = `${prefix}-${year}-`
  const maxNr = existingOffertes
    .filter((o) => o.nummer.startsWith(jaarPrefix))
    .reduce((max, o) => Math.max(max, parseInt(o.nummer.replace(jaarPrefix, ''), 10) || 0), 0)
  return `${jaarPrefix}${String(maxNr + 1).padStart(3, '0')}`
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function QuoteCreation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { id: routeId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { settings, offertePrefix, offerteGeldigheidDagen, standaardBtw, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur } = useAppSettings()
  const documentStyle = useDocumentStyle()
  const [currentStep, setCurrentStep] = useState(0)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Query params van bijv. projecten-pagina
  const paramKlantId = searchParams.get('klant_id') || ''
  const paramProjectId = searchParams.get('project_id') || ''
  const paramDealId = searchParams.get('deal_id') || ''
  const paramTitel = searchParams.get('titel') || ''
  // Support both /offertes/:id (routeId) and /offertes/nieuw?edit=id (search param)
  const editOfferteId = routeId || searchParams.get('edit') || ''

  // ── Step 0: Klant + Project + Details ──
  const [selectedKlantId, setSelectedKlantId] = useState(paramKlantId)
  const [selectedProjectId, setSelectedProjectId] = useState(paramProjectId)
  const [klantSearch, setKlantSearch] = useState('')
  const [offerteTitel, setOfferteTitel] = useState(paramTitel)
  const [itemCount, setItemCount] = useState(1)
  const [contactpersoon, setContactpersoon] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [showNewContact, setShowNewContact] = useState(false)
  const [newContactNaam, setNewContactNaam] = useState('')
  const [newContactFunctie, setNewContactFunctie] = useState('')
  const [newContactEmail, setNewContactEmail] = useState('')
  const [newContactTelefoon, setNewContactTelefoon] = useState('')
  const [geldigTot, setGeldigTot] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + offerteGeldigheidDagen)
    return d.toISOString().split('T')[0]
  })
  const [offerteNummer, setOfferteNummer] = useState('')

  // ── Step 1: Items ──
  const [items, setItems] = useState<QuoteLineItem[]>([])
  const [notities, setNotities] = useState('')
  const [voorwaarden, setVoorwaarden] = useState(DEFAULT_VOORWAARDEN)
  const [introTekst, setIntroTekst] = useState('')
  const [outroTekst, setOutroTekst] = useState('')

  // ── Suggesties voor item omschrijvingen ──
  const [omschrijvingSuggesties, setOmschrijvingSuggesties] = useState<OmschrijvingSuggestie[]>([])

  // ── Autosave state ──
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveIdRef = useRef<string | null>(null) // tracks created offerte id for new quotes

  // ── Computed ──
  const selectedKlant = klanten.find((k) => k.id === selectedKlantId)
  const selectedProject = projecten.find((p) => p.id === selectedProjectId)
  const klantProjecten = useMemo(() =>
    projecten.filter((p) => p.klant_id === selectedKlantId),
    [projecten, selectedKlantId]
  )

  const filteredKlanten = useMemo(() => {
    if (!klantSearch) return klanten
    const search = klantSearch.toLowerCase()
    return klanten.filter(
      (k) =>
        k.bedrijfsnaam.toLowerCase().includes(search) ||
        k.contactpersoon.toLowerCase().includes(search) ||
        k.email.toLowerCase().includes(search)
    )
  }, [klantSearch, klanten])

  // ── Helper: get active price data from item (supports variants) ──
  const getActivePriceData = (item: QuoteLineItem) => {
    if (item.prijs_varianten && item.prijs_varianten.length > 0) {
      const active = item.prijs_varianten.find(v => v.id === item.actieve_variant_id) || item.prijs_varianten[0]
      return {
        aantal: active.aantal,
        eenheidsprijs: active.eenheidsprijs,
        btw_percentage: active.btw_percentage,
        korting_percentage: active.korting_percentage,
        calculatie_regels: active.calculatie_regels,
      }
    }
    return {
      aantal: item.aantal,
      eenheidsprijs: item.eenheidsprijs,
      btw_percentage: item.btw_percentage,
      korting_percentage: item.korting_percentage,
      calculatie_regels: item.calculatie_regels,
    }
  }

  // ── Calculations for sticky bar ──
  const prijsItems = items.filter((i) => i.soort === 'prijs')

  const subtotaal = round2(prijsItems.reduce((sum, item) => {
    const data = getActivePriceData(item)
    const bruto = data.aantal * data.eenheidsprijs
    return sum + round2(bruto - bruto * (data.korting_percentage / 100))
  }, 0))

  const btwBedrag = round2(prijsItems.reduce((sum, item) => {
    const data = getActivePriceData(item)
    const bruto = data.aantal * data.eenheidsprijs
    const netto = round2(bruto - bruto * (data.korting_percentage / 100))
    return sum + round2(netto * (data.btw_percentage / 100))
  }, 0))

  // Inkoop = sum of all calculatie_regels inkoop_prijs * aantal
  const totaalInkoop = useMemo(() => {
    return round2(prijsItems.reduce((sum, item) => {
      const data = getActivePriceData(item)
      if (data.calculatie_regels && data.calculatie_regels.length > 0) {
        return sum + data.calculatie_regels.reduce((s, r) => s + round2(r.inkoop_prijs * r.aantal), 0)
      }
      return sum
    }, 0))
  }, [prijsItems])

  const winstExBtw = round2(subtotaal - totaalInkoop)
  const margePercentage = subtotaal > 0 ? Math.round(((winstExBtw / subtotaal) * 100) * 10) / 10 : 0

  // ── Montage & Voorbereiding uren uit calculatie-regels ──
  const { montageUren, voorbereidingUren, materiaalKosten } = useMemo(() => {
    let montage = 0
    let voorbereiding = 0
    let materiaal = 0
    prijsItems.forEach((item) => {
      const data = getActivePriceData(item)
      if (data.calculatie_regels && data.calculatie_regels.length > 0) {
        data.calculatie_regels.forEach((r) => {
          const isUur = r.eenheid === 'uur'
          const categorieLower = (r.categorie || '').toLowerCase()
          const naamLower = (r.product_naam || '').toLowerCase()
          if (isUur && (categorieLower.includes('montage') || naamLower.includes('montage'))) {
            montage += r.aantal
          } else if (isUur && (categorieLower.includes('voorbereiding') || naamLower.includes('voorbereiding') || naamLower.includes('voorbereid'))) {
            voorbereiding += r.aantal
          }
          if (categorieLower.includes('materiaal') || categorieLower === 'materiaal') {
            materiaal += round2(r.verkoop_prijs * r.aantal)
          }
        })
      }
    })
    return { montageUren: montage, voorbereidingUren: voorbereiding, materiaalKosten: round2(materiaal) }
  }, [prijsItems])

  // ── Data fetching ──
  useEffect(() => {
    let cancelled = false
    Promise.all([getKlanten(), getProjecten(), getOffertes().catch(() => [])])
      .then(([klantenData, projectenData, offertesData]) => {
        if (!cancelled) {
          setKlanten(klantenData)
          setProjecten(projectenData)
          // Don't overwrite nummer in edit mode — it gets set from the loaded offerte
          if (!editOfferteId) {
            setOfferteNummer(generateOfferteNummer(offertePrefix, offertesData))
          }
        }
      })
      .catch((err) => {
        logger.error('Failed to fetch data:', err)
        if (!cancelled) toast.error('Kon data niet laden')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── Load suggesties voor item omschrijvingen ──
  useEffect(() => {
    let cancelled = false
    async function loadSuggesties() {
      try {
        const offertes = await getOffertes()
        if (cancelled) return
        // Load items from last 20 offertes to get unique descriptions
        const recentOffertes = offertes.slice(0, 20)
        const allItems = await Promise.all(
          recentOffertes.map((o) => getOfferteItems(o.id).catch(() => []))
        )
        if (cancelled) return
        const beschrijvingMap = new Map<string, OmschrijvingSuggestie>()
        allItems.flat().forEach((item) => {
          if (item.beschrijving && item.beschrijving.trim()) {
            const key = item.beschrijving.trim().toLowerCase()
            if (!beschrijvingMap.has(key)) {
              beschrijvingMap.set(key, {
                beschrijving: item.beschrijving.trim(),
                laatstePrijs: item.eenheidsprijs,
              })
            }
          }
        })
        setOmschrijvingSuggesties(Array.from(beschrijvingMap.values()))
      } catch {
        // Silent fail — suggesties zijn optioneel
      }
    }
    loadSuggesties()
    return () => { cancelled = true }
  }, [])

  // ── Edit mode: load existing offerte ──
  useEffect(() => {
    if (!editOfferteId || isLoading) return
    let cancelled = false

    async function loadEditData() {
      try {
        const [offerte, offerteItems] = await Promise.all([
          getOfferte(editOfferteId),
          getOfferteItems(editOfferteId),
        ])
        if (cancelled || !offerte) return

        setIsEditMode(true)
        setSelectedKlantId(offerte.klant_id)
        setSelectedProjectId(offerte.project_id || '')
        setOfferteTitel(offerte.titel)
        setOfferteNummer(offerte.nummer)
        setGeldigTot(offerte.geldig_tot?.split('T')[0] || '')
        setNotities(offerte.notities || '')
        setVoorwaarden(offerte.voorwaarden || DEFAULT_VOORWAARDEN)
        setIntroTekst(offerte.intro_tekst || '')
        setOutroTekst(offerte.outro_tekst || '')

        // Map OfferteItem[] → QuoteLineItem[]
        const mappedItems: QuoteLineItem[] = offerteItems
          .sort((a, b) => (a.volgorde || 0) - (b.volgorde || 0))
          .map((item) => ({
            id: item.id,
            soort: (item.soort || 'prijs') as 'prijs' | 'tekst',
            beschrijving: item.beschrijving,
            extra_velden: item.extra_velden || {},
            detail_regels: item.detail_regels,
            aantal: item.aantal,
            eenheidsprijs: item.eenheidsprijs,
            btw_percentage: item.btw_percentage,
            korting_percentage: item.korting_percentage,
            totaal: item.totaal || 0,
            calculatie_regels: item.calculatie_regels,
            heeft_calculatie: item.heeft_calculatie,
            prijs_varianten: item.prijs_varianten,
            actieve_variant_id: item.actieve_variant_id,
          }))

        if (mappedItems.length > 0) {
          setItems(mappedItems)
          setItemCount(mappedItems.length)
        }

        // Start on step 1 (items) so user can edit right away
        setCurrentStep(1)
      } catch (err) {
        logger.error('Failed to load offerte for edit:', err)
        toast.error('Kon offerte niet laden voor bewerking')
      }
    }

    loadEditData()
    return () => { cancelled = true }
  }, [editOfferteId, isLoading])

  // Auto-fill from project params
  useEffect(() => {
    if (paramProjectId && projecten.length > 0) {
      const project = projecten.find((p) => p.id === paramProjectId)
      if (project) {
        setSelectedKlantId(project.klant_id)
        setSelectedProjectId(project.id)
        if (!offerteTitel && project.naam) {
          setOfferteTitel(project.naam)
        }
      }
    }
  }, [paramProjectId, projecten])

  // Auto-fill contactpersoon from klant
  useEffect(() => {
    if (!selectedKlant) return
    // Try to select primary contact from contactpersonen array
    const primair = selectedKlant.contactpersonen?.find(c => c.is_primair)
    if (primair) {
      setSelectedContactId(primair.id)
      setContactpersoon(primair.naam)
    } else if (selectedKlant.contactpersonen?.length > 0) {
      setSelectedContactId(selectedKlant.contactpersonen[0].id)
      setContactpersoon(selectedKlant.contactpersonen[0].naam)
    } else if (selectedKlant.contactpersoon) {
      setSelectedContactId('')
      setContactpersoon(selectedKlant.contactpersoon)
    }
    setShowNewContact(false)
  }, [selectedKlant])

  // Reset project when klant changes
  useEffect(() => {
    if (selectedKlantId && selectedProjectId) {
      const project = projecten.find((p) => p.id === selectedProjectId)
      if (project && project.klant_id !== selectedKlantId) {
        setSelectedProjectId('')
      }
    }
  }, [selectedKlantId])

  // ── Helper: maak een leeg calculatie-item met default beschrijving-regels ──
  const createEmptyItem = (label?: string): QuoteLineItem => {
    // Gebruik offerte_regel_velden uit settings, of de defaults
    const labels = (settings.offerte_regel_velden && settings.offerte_regel_velden.length > 0)
      ? settings.offerte_regel_velden
      : DEFAULT_DETAIL_LABELS

    const detail_regels: DetailRegel[] = labels.map((l, i) => ({
      id: `dr-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      label: l,
      waarde: '',
    }))

    return {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      soort: 'prijs',
      beschrijving: label || '',
      extra_velden: {},
      detail_regels,
      aantal: 1,
      eenheidsprijs: 0,
      btw_percentage: standaardBtw,
      korting_percentage: 0,
      totaal: 0,
    }
  }

  // ── Item handlers ──
  const handleAddItem = () => {
    setItems([...items, createEmptyItem()])
  }

  const handleUpdateItem = (id: string, field: keyof QuoteLineItem, value: QuoteLineItem[keyof QuoteLineItem]) => {
    setItems(prev =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (updated.soort === 'prijs') {
          const bruto = updated.aantal * updated.eenheidsprijs
          updated.totaal = bruto - bruto * (updated.korting_percentage / 100)
        }
        return updated
      })
    )
  }

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter((item) => item.id !== id))
  }

  const handleUpdateItemWithCalculatie = (
    id: string,
    data: {
      beschrijving: string
      eenheidsprijs: number
      calculatie_regels: CalculatieRegel[]
    }
  ) => {
    setItems(prev =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = {
          ...item,
          beschrijving: data.beschrijving,
          eenheidsprijs: data.eenheidsprijs,
          calculatie_regels: data.calculatie_regels,
          heeft_calculatie: true,
        }
        const bruto = updated.aantal * updated.eenheidsprijs
        updated.totaal = bruto - bruto * (updated.korting_percentage / 100)
        return updated
      })
    )
  }

  const handleUpdateItemWithVariantCalculatie = (
    itemId: string,
    variantId: string,
    data: {
      beschrijving: string
      eenheidsprijs: number
      calculatie_regels: CalculatieRegel[]
    }
  ) => {
    setItems(prev =>
      prev.map((item) => {
        if (item.id !== itemId || !item.prijs_varianten) return item
        const updatedVarianten = item.prijs_varianten.map(v => {
          if (v.id !== variantId) return v
          return {
            ...v,
            eenheidsprijs: data.eenheidsprijs,
            calculatie_regels: data.calculatie_regels,
            heeft_calculatie: true,
          }
        })
        return { ...item, prijs_varianten: updatedVarianten }
      })
    )
  }

  // ── Autosave logic (debounced 3 sec) ──
  const performAutoSave = useCallback(async () => {
    if (!user?.id || !selectedKlantId || !offerteTitel.trim() || items.length === 0) return
    if (isSaving) return

    setAutoSaveStatus('saving')
    try {
      const klant = klanten.find((k) => k.id === selectedKlantId)
      const prijsItems = items.filter((i) => i.soort === 'prijs')
      const sub = round2(prijsItems.reduce((sum, item) => {
        const data = getActivePriceData(item)
        const bruto = data.aantal * data.eenheidsprijs
        return sum + round2(bruto - bruto * (data.korting_percentage / 100))
      }, 0))
      const btw = round2(prijsItems.reduce((sum, item) => {
        const data = getActivePriceData(item)
        const bruto = data.aantal * data.eenheidsprijs
        const netto = round2(bruto - bruto * (data.korting_percentage / 100))
        return sum + round2(netto * (data.btw_percentage / 100))
      }, 0))

      const currentId = editOfferteId || autoSaveIdRef.current

      if (currentId) {
        // Update existing
        await updateOfferte(currentId, {
          klant_id: selectedKlantId,
          klant_naam: klant?.bedrijfsnaam,
          ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
          titel: offerteTitel,
          status: 'concept',
          subtotaal: sub,
          btw_bedrag: btw,
          totaal: round2(sub + btw),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
          intro_tekst: introTekst,
          outro_tekst: outroTekst,
        })

        // Delete old items, re-create
        const oldItems = await getOfferteItems(currentId)
        await Promise.all(oldItems.map((item) => deleteOfferteItem(item.id)))
        await Promise.all(
          items.map((item, index) =>
            createOfferteItem({
              offerte_id: currentId,
              beschrijving: item.beschrijving,
              aantal: item.aantal,
              eenheidsprijs: item.eenheidsprijs,
              btw_percentage: item.btw_percentage,
              korting_percentage: item.korting_percentage,
              totaal: item.totaal,
              volgorde: index + 1,
              soort: item.soort,
              extra_velden: item.extra_velden,
              detail_regels: item.detail_regels,
              calculatie_regels: item.calculatie_regels,
              heeft_calculatie: item.heeft_calculatie,
              prijs_varianten: item.prijs_varianten,
              actieve_variant_id: item.actieve_variant_id,
            })
          )
        )
      } else {
        // Create new as concept
        const newOfferte = await createOfferte({
          user_id: user.id,
          klant_id: selectedKlantId,
          klant_naam: klant?.bedrijfsnaam,
          ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
          nummer: offerteNummer,
          titel: offerteTitel,
          status: 'concept',
          subtotaal: sub,
          btw_bedrag: btw,
          totaal: round2(sub + btw),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
          intro_tekst: introTekst,
          outro_tekst: outroTekst,
        })
        autoSaveIdRef.current = newOfferte.id

        await Promise.all(
          items.map((item, index) =>
            createOfferteItem({
              offerte_id: newOfferte.id,
              beschrijving: item.beschrijving,
              aantal: item.aantal,
              eenheidsprijs: item.eenheidsprijs,
              btw_percentage: item.btw_percentage,
              korting_percentage: item.korting_percentage,
              totaal: item.totaal,
              volgorde: index + 1,
              soort: item.soort,
              extra_velden: item.extra_velden,
              detail_regels: item.detail_regels,
              calculatie_regels: item.calculatie_regels,
              heeft_calculatie: item.heeft_calculatie,
              prijs_varianten: item.prijs_varianten,
              actieve_variant_id: item.actieve_variant_id,
            })
          )
        )
      }

      setAutoSaveStatus('saved')
      // Reset indicator after 3 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } catch (err) {
      logger.error('Autosave failed:', err)
      setAutoSaveStatus('idle')
    }
  }, [user?.id, selectedKlantId, selectedProjectId, offerteTitel, items, geldigTot, notities, voorwaarden, introTekst, outroTekst, editOfferteId, offerteNummer, isSaving, klanten])

  // Debounced autosave: trigger 3s after last change (only on step 1/2)
  useEffect(() => {
    if (currentStep < 1) return
    if (!selectedKlantId || !offerteTitel.trim() || items.length === 0) return

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave()
    }, 3000)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [items, offerteTitel, notities, voorwaarden, geldigTot, selectedKlantId, selectedProjectId, currentStep])

  // ── Contactpersoon toevoegen ──
  const handleAddContact = async () => {
    if (!selectedKlant || !newContactNaam.trim()) {
      toast.error('Vul minimaal een naam in')
      return
    }
    const newContact: Contactpersoon = {
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      naam: newContactNaam.trim(),
      functie: newContactFunctie.trim(),
      email: newContactEmail.trim(),
      telefoon: newContactTelefoon.trim(),
      is_primair: !selectedKlant.contactpersonen?.length,
    }
    const updatedContactpersonen = [...(selectedKlant.contactpersonen || []), newContact]
    try {
      await updateKlant(selectedKlant.id, { contactpersonen: updatedContactpersonen })
      // Update local state
      setKlanten(prev => prev.map(k =>
        k.id === selectedKlant.id ? { ...k, contactpersonen: updatedContactpersonen } : k
      ))
      setSelectedContactId(newContact.id)
      setContactpersoon(newContact.naam)
      setShowNewContact(false)
      setNewContactNaam('')
      setNewContactFunctie('')
      setNewContactEmail('')
      setNewContactTelefoon('')
      toast.success(`${newContact.naam} toegevoegd als contactpersoon`)
    } catch {
      toast.error('Kon contactpersoon niet opslaan')
    }
  }

  const handleSelectContact = (contactId: string) => {
    if (contactId === '__new__') {
      setShowNewContact(true)
      setSelectedContactId('')
      return
    }
    if (contactId === '__manual__') {
      setSelectedContactId('')
      setShowNewContact(false)
      return
    }
    const contact = selectedKlant?.contactpersonen?.find(c => c.id === contactId)
    if (contact) {
      setSelectedContactId(contact.id)
      setContactpersoon(contact.naam)
      setShowNewContact(false)
    }
  }

  // ── Step navigation ──
  const canProceedStep0 = selectedKlantId && offerteTitel.trim().length > 0
  const canProceedStep1 = items.length > 0

  const handleStep0Next = () => {
    // Genereer het gekozen aantal lege items als er nog geen items zijn
    if (items.length === 0) {
      const newItems: QuoteLineItem[] = Array.from({ length: itemCount }, (_, i) =>
        createEmptyItem(`Item ${i + 1}`)
      )
      setItems(newItems)
    }
    setCurrentStep(1)
  }

  // ── Save ──
  const saveOfferte = async (status: 'concept' | 'verzonden') => {
    if (isSaving) return
    if (!user?.id) {
      toast.error('Je moet ingelogd zijn om een offerte op te slaan')
      return
    }
    setIsSaving(true)
    try {
      let savedOfferteId: string

      if ((isEditMode && editOfferteId) || autoSaveIdRef.current) {
        const existingId = editOfferteId || autoSaveIdRef.current!
        // Update existing offerte
        await updateOfferte(existingId, {
          klant_id: selectedKlantId,
          klant_naam: selectedKlant?.bedrijfsnaam,
          ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
          titel: offerteTitel,
          status,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal: round2(subtotaal + btwBedrag),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
          intro_tekst: introTekst,
          outro_tekst: outroTekst,
        })
        savedOfferteId = existingId

        // Delete old items, then re-create
        const oldItems = await getOfferteItems(existingId)
        await Promise.all(oldItems.map((item) => deleteOfferteItem(item.id)))

        await Promise.all(
          items.map((item, index) =>
            createOfferteItem({
              offerte_id: existingId,
              beschrijving: item.beschrijving,
              aantal: item.aantal,
              eenheidsprijs: item.eenheidsprijs,
              btw_percentage: item.btw_percentage,
              korting_percentage: item.korting_percentage,
              totaal: item.totaal,
              volgorde: index + 1,
              soort: item.soort,
              extra_velden: item.extra_velden,
              detail_regels: item.detail_regels,
              calculatie_regels: item.calculatie_regels,
              heeft_calculatie: item.heeft_calculatie,
              prijs_varianten: item.prijs_varianten,
              actieve_variant_id: item.actieve_variant_id,
            })
          )
        )
      } else {
        // Create new offerte
        const newOfferte = await createOfferte({
          user_id: user.id,
          klant_id: selectedKlantId,
          klant_naam: selectedKlant?.bedrijfsnaam,
          ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
          ...(paramDealId ? { deal_id: paramDealId } : {}),
          nummer: offerteNummer,
          titel: offerteTitel,
          status,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal: round2(subtotaal + btwBedrag),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
          intro_tekst: introTekst,
          outro_tekst: outroTekst,
        })
        savedOfferteId = newOfferte.id

        await Promise.all(
          items.map((item, index) =>
            createOfferteItem({
              offerte_id: newOfferte.id,
              beschrijving: item.beschrijving,
              aantal: item.aantal,
              eenheidsprijs: item.eenheidsprijs,
              btw_percentage: item.btw_percentage,
              korting_percentage: item.korting_percentage,
              totaal: item.totaal,
              volgorde: index + 1,
              soort: item.soort,
              extra_velden: item.extra_velden,
              detail_regels: item.detail_regels,
              calculatie_regels: item.calculatie_regels,
              heeft_calculatie: item.heeft_calculatie,
              prijs_varianten: item.prijs_varianten,
              actieve_variant_id: item.actieve_variant_id,
            })
          )
        )
      }

      if (status === 'verzonden' && selectedKlant?.email) {
        try {
          const { subject, html } = offerteVerzendTemplate({
            klantNaam: selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam,
            offerteNummer,
            offerteTitel,
            totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(round2(subtotaal + btwBedrag)),
            geldigTot,
          })
          await sendEmail(selectedKlant.email, subject, '', { html })
        } catch (emailErr) {
          logger.error('Email verzenden mislukt:', emailErr)
          toast.error('Offerte opgeslagen maar email niet verzonden')
        }
      }

      toast.success(
        isEditMode
          ? 'Offerte bijgewerkt'
          : status === 'concept'
            ? 'Offerte opgeslagen als concept'
            : 'Offerte verzonden naar klant'
      )
      navigate(`/offertes/${savedOfferteId}/bewerken`, { state: { from: (location.state as { from?: string })?.from || '/offertes' } })
    } catch (err) {
      logger.error('Failed to save offerte:', err)
      toast.error('Kon offerte niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPdf = () => {
    if (!selectedKlant) {
      toast.error('Selecteer eerst een klant')
      return
    }
    try {
      toast.info('PDF wordt gegenereerd...')
      const offerteData = {
        id: '',
        user_id: user?.id || '',
        klant_id: selectedKlantId,
        nummer: offerteNummer,
        titel: offerteTitel,
        status: 'concept' as const,
        subtotaal,
        btw_bedrag: btwBedrag,
        totaal: round2(subtotaal + btwBedrag),
        geldig_tot: geldigTot,
        notities,
        voorwaarden,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const offerteItems = items.map((item, index) => ({
        id: item.id,
        offerte_id: '',
        beschrijving: item.beschrijving,
        aantal: item.aantal,
        eenheidsprijs: item.eenheidsprijs,
        btw_percentage: item.btw_percentage,
        korting_percentage: item.korting_percentage,
        totaal: item.totaal,
        volgorde: index + 1,
        created_at: new Date().toISOString(),
      }))
      const doc = generateOffertePDF(offerteData, offerteItems, selectedKlant, {
        bedrijfsnaam: bedrijfsnaam || 'Uw Bedrijf',
        bedrijfs_adres: bedrijfsAdres || '',
        kvk_nummer: kvkNummer || '',
        btw_nummer: btwNummer || '',
        primaireKleur: primaireKleur || '#2563eb',
      }, documentStyle)
      doc.save(`${offerteNummer}.pdf`)
      toast.success('PDF gedownload')
    } catch (err) {
      logger.error('Failed to generate PDF:', err)
      toast.error('Kon PDF niet genereren')
    }
  }

  // ── Verstuur offerte → navigeer naar email compose pagina ──
  // ── Inline email compose state ──
  const [showEmailCompose, setShowEmailCompose] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailCc, setEmailCc] = useState('')
  const [emailBcc, setEmailBcc] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailBijlagen, setEmailBijlagen] = useState<{ naam: string; grootte: number }[]>([])
  const [emailScheduled, setEmailScheduled] = useState(false)
  const [emailScheduleDate, setEmailScheduleDate] = useState('')
  const [emailScheduleTime, setEmailScheduleTime] = useState('08:00')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleVerstuurOfferte = async () => {
    if (!user?.id || !selectedKlant) {
      toast.error('Selecteer eerst een klant')
      return
    }
    // Save first as concept
    const quoteId = editOfferteId || autoSaveIdRef.current
    if (!quoteId) {
      toast.info('Offerte wordt eerst opgeslagen...')
      await saveOfferte('concept')
    }
    // Pre-fill email fields
    const contactEmail = selectedKlant.contactpersonen?.[0]?.email || selectedKlant.email || ''
    const klantNaam = selectedKlant.contactpersonen?.[0]?.naam || selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam || ''
    setEmailTo(contactEmail)
    setEmailSubject(`Offerte ${offerteNummer} - ${offerteTitel}`)
    setEmailBody(
      introTekst
        ? introTekst
        : `Beste ${klantNaam},\n\nHierbij ontvangt u onze offerte ${offerteNummer} voor "${offerteTitel}".\n\nHet totaalbedrag van deze offerte is ${formatCurrency(round2(subtotaal + btwBedrag))} (incl. BTW).\n\nDe offerte is geldig tot ${geldigTot ? new Date(geldigTot).toLocaleDateString('nl-NL') : '-'}.\n\nMocht u vragen hebben of aanvullende informatie wensen, neem dan gerust contact met ons op.\n\nMet vriendelijke groet,\n${bedrijfsnaam || ''}`
    )
    setEmailBijlagen([{ naam: `${offerteNummer}.pdf`, grootte: 0 }])
    setEmailScheduled(false)
    setEmailScheduleDate('')
    setEmailCc('')
    setEmailBcc('')
    setShowEmailCompose(true)
  }

  const handleSendEmailInline = async () => {
    if (!emailTo.trim() || !emailSubject.trim()) {
      toast.error('Vul een ontvanger en onderwerp in')
      return
    }
    setIsSendingEmail(true)
    try {
      const quoteId = editOfferteId || autoSaveIdRef.current
      await sendEmail(emailTo.trim(), emailSubject.trim(), emailBody, { html: emailBody.replace(/\n/g, '<br>') })
      if (quoteId) {
        await updateOfferte(quoteId, {
          status: 'verzonden',
          verstuurd_op: new Date().toISOString(),
          verstuurd_naar: emailTo.trim(),
        })
      }
      if (emailScheduled && emailScheduleDate) {
        toast.success(`Email ingepland voor ${new Date(emailScheduleDate + 'T' + emailScheduleTime).toLocaleString('nl-NL')}`)
      } else {
        toast.success(`Offerte verstuurd naar ${emailTo.trim()}`)
      }
      setShowEmailCompose(false)
    } catch (err) {
      logger.error('Failed to send email:', err)
      toast.error('Kon email niet verzenden')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleAddBijlage = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newBijlagen = Array.from(files).map((f) => ({
        naam: f.name,
        grootte: f.size,
      }))
      setEmailBijlagen((prev) => [...prev, ...newBijlagen])
    }
    e.target.value = ''
  }

  // Keep old handler structure for saving before send but don't navigate away
  const _saveBeforeSend = async () => {
    const quoteId = editOfferteId || autoSaveIdRef.current
    if (!quoteId) return
    try {
      await updateOfferte(quoteId, {
        klant_id: selectedKlantId,
        klant_naam: selectedKlant?.bedrijfsnaam,
        ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
        titel: offerteTitel,
        status: 'concept',
        subtotaal,
        btw_bedrag: btwBedrag,
        totaal: round2(subtotaal + btwBedrag),
        geldig_tot: geldigTot,
        notities,
        voorwaarden,
        intro_tekst: introTekst,
        outro_tekst: outroTekst,
      })
      const existingItems = await getOfferteItems(quoteId)
      await Promise.all(existingItems.map((item) => deleteOfferteItem(item.id)))
      await Promise.all(
        items.map((item, index) =>
          createOfferteItem({
            offerte_id: quoteId,
            beschrijving: item.beschrijving,
            aantal: item.aantal,
            eenheidsprijs: item.eenheidsprijs,
            btw_percentage: item.btw_percentage,
            korting_percentage: item.korting_percentage,
            totaal: item.totaal,
            volgorde: index + 1,
            soort: item.soort,
            extra_velden: item.extra_velden,
            detail_regels: item.detail_regels,
            calculatie_regels: item.calculatie_regels,
            heeft_calculatie: item.heeft_calculatie,
            prijs_varianten: item.prijs_varianten,
            actieve_variant_id: item.actieve_variant_id,
          })
        )
      )
    } catch (err) {
      logger.error('Failed to save before sending:', err)
    }
  }

  // ── Render ──
  return (
    <div className="pb-36">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* ──── Page Header met introductie ──── */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent dark:from-primary/10 dark:via-accent/10 border border-primary/10 dark:border-primary/20 p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="mt-0.5 hover:bg-white/50 dark:hover:bg-gray-800/50"
                onClick={() => {
                  const from = (location.state as { from?: string })?.from
                  navigate(from || '/offertes')
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-foreground font-display">{isEditMode ? 'Offerte Bewerken' : 'Nieuwe Offerte'}</h1>
                  <Badge variant="outline" className="text-xs font-mono bg-white/50 dark:bg-gray-800/50">
                    <Hash className="h-3 w-3 mr-1" />
                    {offerteNummer}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                    Stel een professionele offerte samen voor je klant.
                  </p>
                  {/* Autosave indicator */}
                  {autoSaveStatus === 'saving' && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      Opslaan...
                    </span>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3 w-3" />
                      Opgeslagen
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Verstuur offerte + badges */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {/* Verstuur offerte button - visible on step 1+ when klant is selected */}
              {currentStep >= 1 && selectedKlant && (
                <Button
                  onClick={handleVerstuurOfferte}
                  className="bg-gradient-to-r from-accent to-primary border-0 gap-2"
                  size="sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  Verstuur offerte
                </Button>
              )}

            {/* Quick info badges rechts */}
            {selectedKlant && (
              <div className="hidden lg:flex flex-col items-end gap-1.5 flex-shrink-0">
                <Badge className="gap-1.5 bg-white/80 dark:bg-gray-800/80 text-foreground border border-gray-200 dark:border-gray-700 shadow-sm">
                  <Building2 className="h-3 w-3 text-primary" />
                  {selectedKlant.bedrijfsnaam}
                </Badge>
                {contactpersoon && (
                  <Badge variant="outline" className="gap-1.5 bg-white/60 dark:bg-gray-800/60">
                    <User className="h-3 w-3" />
                    t.a.v. {contactpersoon}
                  </Badge>
                )}
                {selectedProject && (
                  <Badge variant="outline" className="gap-1.5 bg-white/60 dark:bg-gray-800/60">
                    <FolderOpen className="h-3 w-3" />
                    {selectedProject.naam}
                  </Badge>
                )}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* ──── Step Indicator ──── */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-0">
            {steps.map((step, index) => {
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number

              return (
                <React.Fragment key={step.number}>
                  <button
                    onClick={() => {
                      if (step.number <= currentStep) setCurrentStep(step.number)
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200',
                      isActive && 'bg-primary/10 dark:bg-primary/20 text-accent dark:text-primary shadow-sm',
                      isCompleted && 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 cursor-pointer',
                      !isActive && !isCompleted && 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                        isActive && 'bg-gradient-to-r from-accent to-primary text-white',
                        isCompleted && 'bg-green-600 text-white',
                        !isActive && !isCompleted && 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.number + 1}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-10 h-0.5 mx-1',
                        currentStep > step.number ? 'bg-green-400 dark:bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* ================================================================ */}
        {/* STEP 0: KLANT + CONTACTPERSOON + DETAILS                        */}
        {/* ================================================================ */}
        {currentStep === 0 && (
          <div className="space-y-5">

            {/* ── Klant selectie + Contactpersoon (twee kolommen) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

              {/* Linker kolom: Klant zoeken (3/5) */}
              <Card className="lg:col-span-3">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                      <Building2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    Voor wie is deze offerte?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Klant zoeken + selecteren */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Klant</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={klantSearch}
                        onChange={(e) => setKlantSearch(e.target.value)}
                        placeholder="Zoek op bedrijfsnaam, contactpersoon of email..."
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedKlantId} onValueChange={(val) => {
                      setSelectedKlantId(val)
                      setKlantSearch('')
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer een klant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredKlanten.map((klant) => (
                          <SelectItem key={klant.id} value={klant.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{klant.bedrijfsnaam}</span>
                              {klant.contactpersoon && (
                                <>
                                  <span className="text-gray-400">-</span>
                                  <span className="text-gray-500">{klant.contactpersoon}</span>
                                </>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Geselecteerde klant kaart */}
                  {selectedKlant && (
                    <div className="bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 border border-primary/15 dark:border-primary/25 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-white font-bold text-lg">{selectedKlant.bedrijfsnaam[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{selectedKlant.bedrijfsnaam}</h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                            {selectedKlant.email && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {selectedKlant.email}
                              </span>
                            )}
                            {selectedKlant.telefoon && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {selectedKlant.telefoon}
                              </span>
                            )}
                            {(selectedKlant.adres || selectedKlant.stad) && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {[selectedKlant.adres, selectedKlant.postcode, selectedKlant.stad].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => {
                          setSelectedKlantId('')
                          setSelectedProjectId('')
                          setContactpersoon('')
                          setSelectedContactId('')
                        }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Project selectie (alleen als klant geselecteerd is) */}
                  {selectedKlantId && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        Project
                        <span className="text-xs text-muted-foreground font-normal">(optioneel)</span>
                      </Label>
                      {klantProjecten.length > 0 ? (
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Koppel aan een project..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geen">
                              <span className="text-muted-foreground">Geen project</span>
                            </SelectItem>
                            {klantProjecten.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{project.naam}</span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {project.status}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">Geen projecten gevonden voor deze klant</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rechter kolom: Contactpersoon (2/5) */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Contact className="h-3.5 w-3.5 text-white" />
                    </div>
                    Contactpersoon
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedKlant ? (
                    <>
                      {/* Contactpersonen lijst */}
                      {(selectedKlant.contactpersonen?.length > 0 || selectedKlant.contactpersoon) && (
                        <div className="space-y-1.5">
                          {/* Bestaande contactpersonen uit array */}
                          {selectedKlant.contactpersonen?.map((cp) => (
                            <button
                              key={cp.id}
                              onClick={() => handleSelectContact(cp.id)}
                              className={cn(
                                'w-full text-left rounded-lg border p-2.5 transition-all',
                                selectedContactId === cp.id
                                  ? 'border-primary/50 bg-primary/5 dark:border-primary/40 dark:bg-primary/10 ring-1 ring-primary/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                                  selectedContactId === cp.id
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                )}>
                                  {cp.naam[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{cp.naam}</p>
                                  {cp.functie && <p className="text-[11px] text-muted-foreground truncate">{cp.functie}</p>}
                                </div>
                                {cp.is_primair && (
                                  <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                                    primair
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}

                          {/* Fallback: single contactpersoon string (als er geen array is) */}
                          {(!selectedKlant.contactpersonen || selectedKlant.contactpersonen.length === 0) && selectedKlant.contactpersoon && (
                            <div className="rounded-lg border border-primary/50 bg-primary/5 dark:border-primary/40 dark:bg-primary/10 ring-1 ring-primary/20 p-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                  {selectedKlant.contactpersoon[0]?.toUpperCase()}
                                </div>
                                <p className="text-sm font-medium text-foreground">{selectedKlant.contactpersoon}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Nieuwe contactpersoon toevoegen */}
                      {!showNewContact ? (
                        <button
                          onClick={() => setShowNewContact(true)}
                          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Nieuwe contactpersoon toevoegen
                        </button>
                      ) : (
                        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-3 space-y-2">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                            <UserPlus className="h-3.5 w-3.5" />
                            Nieuwe contactpersoon
                          </p>
                          <Input
                            value={newContactNaam}
                            onChange={(e) => setNewContactNaam(e.target.value)}
                            placeholder="Naam *"
                            className="h-8 text-sm bg-white dark:bg-gray-900"
                            autoFocus
                          />
                          <Input
                            value={newContactFunctie}
                            onChange={(e) => setNewContactFunctie(e.target.value)}
                            placeholder="Functie (bijv. Directeur)"
                            className="h-8 text-sm bg-white dark:bg-gray-900"
                          />
                          <Input
                            value={newContactEmail}
                            onChange={(e) => setNewContactEmail(e.target.value)}
                            placeholder="E-mailadres"
                            type="email"
                            className="h-8 text-sm bg-white dark:bg-gray-900"
                          />
                          <Input
                            value={newContactTelefoon}
                            onChange={(e) => setNewContactTelefoon(e.target.value)}
                            placeholder="Telefoonnummer"
                            className="h-8 text-sm bg-white dark:bg-gray-900"
                          />
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={handleAddContact}
                              disabled={!newContactNaam.trim()}
                              className="h-7 text-xs gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Toevoegen
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowNewContact(false)
                                setNewContactNaam('')
                                setNewContactFunctie('')
                                setNewContactEmail('')
                                setNewContactTelefoon('')
                              }}
                              className="h-7 text-xs"
                            >
                              Annuleren
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Handmatig contactpersoon invullen als alternatief */}
                      {!showNewContact && (
                        <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                          <Label className="text-[11px] text-muted-foreground">Of typ een naam</Label>
                          <Input
                            value={contactpersoon}
                            onChange={(e) => {
                              setContactpersoon(e.target.value)
                              setSelectedContactId('')
                            }}
                            placeholder="Contactpersoon naam..."
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Selecteer eerst een klant
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        De contactpersonen verschijnen hier
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Offerte details ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  Offerte details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="offerte-titel">Offerte titel</Label>
                  <Input
                    id="offerte-titel"
                    value={offerteTitel}
                    onChange={(e) => setOfferteTitel(e.target.value)}
                    placeholder="bijv. Gevelreclame nieuwe locatie, Autobelettering wagenpark..."
                    className="text-base"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offerte-nummer" className="flex items-center gap-1.5">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      Nummer
                    </Label>
                    <Input
                      id="offerte-nummer"
                      value={offerteNummer}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="geldig-tot" className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      Geldig tot
                    </Label>
                    <Input
                      id="geldig-tot"
                      type="date"
                      value={geldigTot}
                      onChange={(e) => setGeldigTot(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Hoeveel items? ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Plus className="h-3.5 w-3.5 text-white" />
                  </div>
                  Hoeveel items heeft je offerte?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Elk item is een complete prijsberekening met omschrijving en details. Je kunt later altijd nog items toevoegen of verwijderen.
                </p>
                <div className="flex items-center gap-2">
                  {ITEM_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      onClick={() => setItemCount(count)}
                      className={cn(
                        'h-12 w-12 rounded-xl text-lg font-bold transition-all border-2',
                        itemCount === count
                          ? 'border-primary bg-gradient-to-br from-accent to-primary text-white shadow-md scale-110'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      {count}
                    </button>
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">
                    {itemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ── Offerte Teksten ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  Offerte Teksten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notities</Label>
                    <Textarea
                      value={notities}
                      onChange={(e) => setNotities(e.target.value)}
                      placeholder="Interne notities of opmerkingen voor de klant..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Voorwaarden</Label>
                    <Textarea
                      value={voorwaarden}
                      onChange={(e) => setVoorwaarden(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-end">
              <Button
                onClick={handleStep0Next}
                disabled={!canProceedStep0}
                className="bg-gradient-to-r from-accent to-primary border-0 px-8"
                size="lg"
              >
                Items toevoegen
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 1: ITEMS                                                    */}
        {/* ================================================================ */}
        {currentStep === 1 && (
          <div className="space-y-5">
            {/* ── Introductietekst ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Mail className="h-3.5 w-3.5 text-white" />
                  </div>
                  Introductietekst
                  <span className="text-xs text-muted-foreground font-normal ml-1">optioneel</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Standaard', tekst: `Beste ${selectedKlant?.contactpersoon || selectedKlant?.bedrijfsnaam || '{klant_naam}'}, hierbij ontvangt u onze offerte voor de door u gevraagde werkzaamheden.` },
                    { label: 'Na gesprek', tekst: `Geachte heer/mevrouw ${selectedKlant?.contactpersoon || selectedKlant?.bedrijfsnaam || '{klant_naam}'}, naar aanleiding van ons gesprek sturen wij u hierbij onze offerte.` },
                    { label: 'Bedankt', tekst: `Beste ${selectedKlant?.contactpersoon || selectedKlant?.bedrijfsnaam || '{klant_naam}'}, bedankt voor uw aanvraag. Hierbij onze offerte.` },
                  ].map((tmpl) => (
                    <Button
                      key={tmpl.label}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setIntroTekst(tmpl.tekst)}
                    >
                      {tmpl.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={introTekst}
                  onChange={(e) => setIntroTekst(e.target.value)}
                  placeholder="Beste ..., hierbij ontvangt u onze offerte voor..."
                  rows={3}
                  className="resize-y"
                />
              </CardContent>
            </Card>

            {/* ── Items ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  Vul je items in
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteItemsTable
                  items={items}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItemWithCalculatie={handleUpdateItemWithCalculatie}
                  onUpdateItemWithVariantCalculatie={handleUpdateItemWithVariantCalculatie}
                  suggesties={omschrijvingSuggesties}
                />
              </CardContent>
            </Card>

            {/* ── Afsluittekst ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  Afsluittekst
                  <span className="text-xs text-muted-foreground font-normal ml-1">optioneel</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Standaard', tekst: 'Wij zien uw reactie graag tegemoet.' },
                    { label: 'Met vragen', tekst: 'Mocht u vragen hebben of aanvullende informatie wensen, neem dan gerust contact met ons op.' },
                    { label: 'Dank', tekst: 'Wij danken u voor uw vertrouwen en hopen u van dienst te mogen zijn.' },
                  ].map((tmpl) => (
                    <Button
                      key={tmpl.label}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setOutroTekst(tmpl.tekst)}
                    >
                      {tmpl.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={outroTekst}
                  onChange={(e) => setOutroTekst(e.target.value)}
                  placeholder="Wij zien uw reactie graag tegemoet."
                  rows={2}
                  className="resize-y"
                />
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vorige
              </Button>
              <Button onClick={() => setCurrentStep(2)} disabled={!canProceedStep1} className="px-8">
                Preview bekijken
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: PREVIEW                                                  */}
        {/* ================================================================ */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <ForgeQuotePreview
              offerte={{
                nummer: offerteNummer,
                titel: offerteTitel,
                status: 'concept',
                klant_id: selectedKlantId,
                geldig_tot: geldigTot,
                notities,
                voorwaarden,
                intro_tekst: introTekst,
                outro_tekst: outroTekst,
                created_at: new Date().toISOString(),
              }}
              items={items.map((item) => {
                const data = getActivePriceData(item)
                return {
                  beschrijving: item.beschrijving,
                  aantal: data.aantal,
                  eenheidsprijs: data.eenheidsprijs,
                  btw_percentage: data.btw_percentage,
                  korting_percentage: data.korting_percentage,
                  prijs_varianten: item.prijs_varianten,
                  actieve_variant_id: item.actieve_variant_id,
                }
              })}
            />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vorige
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="secondary" onClick={() => saveOfferte('concept')} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Opslaan...' : 'Opslaan als Concept'}
                </Button>
                <Button onClick={handleVerstuurOfferte} disabled={isSaving} className="bg-gradient-to-r from-accent to-primary border-0">
                  <Send className="h-4 w-4 mr-2" />
                  {isSaving ? 'Verzenden...' : 'Verstuur per email'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* INLINE EMAIL COMPOSE                                             */}
      {/* ================================================================ */}
      {showEmailCompose && (
        <div className="max-w-5xl mx-auto mt-6">
          <Card className="border-2 border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Send className="h-3.5 w-3.5 text-white" />
                  </div>
                  Offerte versturen
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowEmailCompose(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aan */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium w-20 flex-shrink-0">Aan</Label>
                <Input
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@voorbeeld.nl"
                  type="email"
                  className="h-9"
                />
              </div>

              {/* CC */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium w-20 flex-shrink-0">CC</Label>
                <Input
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="cc@voorbeeld.nl (meerdere adressen met komma)"
                  className="h-9"
                />
              </div>

              {/* BCC */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium w-20 flex-shrink-0">BCC</Label>
                <Input
                  value={emailBcc}
                  onChange={(e) => setEmailBcc(e.target.value)}
                  placeholder="bcc@voorbeeld.nl"
                  className="h-9"
                />
              </div>

              {/* Onderwerp */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium w-20 flex-shrink-0">Onderwerp</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Onderwerp..."
                  className="h-9"
                />
              </div>

              <Separator />

              {/* Bijlagen */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Bijlagen</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAddBijlage}>
                      <Paperclip className="h-3 w-3" />
                      Bijlage toevoegen
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf,.doc,.docx"
                    />
                  </div>
                </div>
                {emailBijlagen.map((bijlage, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="w-7 h-7 rounded flex items-center justify-center bg-red-500 text-white text-[8px] font-bold flex-shrink-0">
                      PDF
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{bijlage.naam}</p>
                      {idx === 0 && <p className="text-xs text-muted-foreground">Offerte PDF — Automatisch bijgevoegd</p>}
                    </div>
                    {idx > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEmailBijlagen((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              {/* Body */}
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                className="resize-y"
                placeholder="Schrijf uw bericht hier..."
              />

              <Separator />

              {/* Inplannen */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailScheduled}
                      onChange={(e) => setEmailScheduled(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Inplannen</span>
                  </label>
                </div>
                {emailScheduled && (
                  <div className="pl-7 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const morgen = new Date()
                        morgen.setDate(morgen.getDate() + 1)
                        const morgenStr = morgen.toISOString().split('T')[0]
                        return [
                          { label: 'Morgenochtend 08:00', datum: morgenStr, tijd: '08:00' },
                          { label: 'Morgen 10:00', datum: morgenStr, tijd: '10:00' },
                          { label: 'Morgen 14:00', datum: morgenStr, tijd: '14:00' },
                        ].map((opt) => (
                          <Button
                            key={opt.label}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => { setEmailScheduleDate(opt.datum); setEmailScheduleTime(opt.tijd) }}
                          >
                            {opt.label}
                          </Button>
                        ))
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={emailScheduleDate}
                        onChange={(e) => setEmailScheduleDate(e.target.value)}
                        className="h-8 w-40"
                      />
                      <Input
                        type="time"
                        value={emailScheduleTime}
                        onChange={(e) => setEmailScheduleTime(e.target.value)}
                        className="h-8 w-28"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setShowEmailCompose(false)}>
                  Annuleren
                </Button>
                <Button
                  onClick={handleSendEmailInline}
                  disabled={!emailTo.trim() || !emailSubject.trim() || isSendingEmail}
                  className="bg-gradient-to-r from-accent to-primary border-0 gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSendingEmail ? 'Verzenden...' : emailScheduled ? 'Inplannen' : 'Verstuur email'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* STICKY BOTTOM BAR — Inkoop, Marge, Winst                        */}
      {/* Altijd zichtbaar in stap 1 en 2                                  */}
      {/* ================================================================ */}
      {(currentStep === 1 || currentStep === 2) && (
        <div className="sticky bottom-0 z-50 bg-card/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-5xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Financial metrics + uren */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Materiaal */}
                {materiaalKosten > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Materiaal</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(materiaalKosten)}</p>
                      </div>
                    </div>
                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                  </>
                )}

                {/* Montage uren */}
                {montageUren > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Montage</p>
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{montageUren} uur</p>
                      </div>
                    </div>
                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                  </>
                )}

                {/* Voorbereiding uren */}
                {voorbereidingUren > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Voorbereiding</p>
                        <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{voorbereidingUren} uur</p>
                      </div>
                    </div>
                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                  </>
                )}

                {/* Marge % */}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center',
                    margePercentage >= 30 ? 'bg-green-100 dark:bg-green-900/30' :
                    margePercentage >= 15 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    'bg-red-100 dark:bg-red-900/30'
                  )}>
                    <Percent className={cn(
                      'h-4 w-4',
                      margePercentage >= 30 ? 'text-green-600 dark:text-green-400' :
                      margePercentage >= 15 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    )} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Marge</p>
                    <p className={cn(
                      'text-sm font-bold',
                      margePercentage >= 30 ? 'text-green-600 dark:text-green-400' :
                      margePercentage >= 15 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    )}>
                      {totaalInkoop > 0 ? `${margePercentage.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Totaal */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="hidden md:block">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Subtotaal</p>
                  <p className="text-sm font-medium text-muted-foreground text-right">{formatCurrency(subtotaal)}</p>
                </div>
                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 hidden md:block" />
                <div className="hidden md:block">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">BTW</p>
                  <p className="text-sm font-medium text-muted-foreground text-right">{formatCurrency(btwBedrag)}</p>
                </div>
                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 hidden md:block" />
                <div className="bg-gradient-to-r from-accent to-primary rounded-xl px-5 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">Totaal incl BTW</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(round2(subtotaal + btwBedrag))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
