import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom'
import { useTabDirtyState } from '@/hooks/useTabDirtyState'
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
  Minus,
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  TrendingDown,
  DollarSign,
  MoreHorizontal,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Upload,
  GripVertical,
  Pin,
} from 'lucide-react'
import { getKlanten, getProjecten, getOffertes, createOfferte, createOfferteItem, updateKlant, getOfferte, getOfferteItems, updateOfferte, deleteOfferteItem, getOfferteVersies, createOfferteVersie, getFactuur } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Klant, Project, Contactpersoon, Factuur } from '@/types'
import { round2 } from '@/utils/budgetUtils'
import { generateOffertePDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { sendEmail } from '@/services/gmailService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { cn, formatCurrency } from '@/lib/utils'
import { initAutofillDefaults, saveAutofillValue, labelToAutofillField } from '@/utils/autofillUtils'
import { QuoteItemsTable, type QuoteLineItem, type DetailRegel, type PrijsVariant, type OmschrijvingSuggestie, DEFAULT_DETAIL_LABELS } from './QuoteItemsTable'
import { ForgeQuotePreview } from './ForgeQuotePreview'
import { InkoopOffertePaneel } from './InkoopOffertePaneel'
import { useSidebarLayout, type SidebarSectionId } from '@/hooks/useSidebarLayout'
import type { CalculatieRegel, InkoopRegel } from '@/types'
import { logger } from '../../utils/logger'
import { safeSetItem } from '@/utils/localStorageUtils'

const DEFAULT_VOORWAARDEN = `1. Deze offerte is geldig gedurende de aangegeven termijn.
2. Betaling dient te geschieden binnen 30 dagen na factuurdatum.
3. Alle genoemde bedragen zijn exclusief BTW, tenzij anders vermeld.
4. Levertijd wordt in overleg bepaald na akkoord op deze offerte.
5. Op al onze leveringen en diensten zijn onze algemene voorwaarden van toepassing.
6. Kleuren en materialen kunnen licht afwijken van getoonde voorbeelden.
7. Wijzigingen na akkoord kunnen tot meerkosten leiden.
8. Garantie: 2 jaar op materiaal en constructie, 1 jaar op elektronica.`

const ITEM_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const

// Steps removed — now a permanent two-column layout

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
  const { setDirty } = useTabDirtyState()
  const [searchParams] = useSearchParams()
  const { id: routeId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { settings, offertePrefix, offerteGeldigheidDagen, standaardBtw, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur, logoUrl, profile, offerteToonM2, emailHandtekening } = useAppSettings()
  const documentStyle = useDocumentStyle()
  const [showKlantSelector, setShowKlantSelector] = useState(true)
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

  // ── Offerte status & linked factuur (for factureren workflow) ──
  const [offerteStatus, setOfferteStatus] = useState<string>('concept')
  const [geconverteerdNaarFactuurId, setGeconverteerdNaarFactuurId] = useState<string | null>(null)
  const [linkedFactuur, setLinkedFactuur] = useState<Factuur | null>(null)

  // ── FIX 7: Client details panel ──
  const [klantPanelOpen, setKlantPanelOpen] = useState(true)

  // ── Sidebar collapsed on mobile ──
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // ── Inkoop offerte paneel ──
  const [inkoopPaneelOpen, setInkoopPaneelOpen] = useState(false)

  // ── Sidebar layout (drag reorder + sticky pin) ──
  const sidebarLayout = useSidebarLayout()

  // ── FIX 16: Afrondingskorting ──
  const [isEditingTotaal, setIsEditingTotaal] = useState(false)
  const [gewenstTotaal, setGewenstTotaal] = useState('')
  const [afrondingskorting, setAfrondingskorting] = useState(0)

  // ── Uren correctie — handmatige +/- vanuit sidebar ──
  const [urenCorrectie, setUrenCorrectie] = useState<Record<string, number>>({})

  // ── Step 1: Items ──
  const [items, setItems] = useState<QuoteLineItem[]>([])
  const [notities, setNotities] = useState('')
  const [voorwaarden, setVoorwaarden] = useState(DEFAULT_VOORWAARDEN)
  const [introTekst, setIntroTekst] = useState('')
  const [outroTekst, setOutroTekst] = useState('')

  // ── Suggesties voor item omschrijvingen ──
  const [omschrijvingSuggesties, setOmschrijvingSuggesties] = useState<OmschrijvingSuggestie[]>([])

  // ── FIX 12: Versie tracking state (must be before performAutoSave) ──
  const [versieNummer, setVersieNummer] = useState(1)
  const [isSavingVersie, setIsSavingVersie] = useState(false)
  const [versieHistorie, setVersieHistorie] = useState<Array<{ id: string; versie_nummer: number; notitie?: string; created_at: string }>>([])
  const [showVersieHistorie, setShowVersieHistorie] = useState(false)

  // ── Autosave state ──
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveIdRef = useRef<string | null>(null) // tracks created offerte id for new quotes
  const hasUnsavedChangesRef = useRef(false)
  const performAutoSaveRef = useRef<() => Promise<void>>(async () => {})
  const saveLockRef = useRef(false) // prevents race between autosave and manual save

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
  const verplichtePrijsItems = prijsItems.filter((i) => !i.is_optioneel)
  const optionelePrijsItems = prijsItems.filter((i) => i.is_optioneel)

  const subtotaal = round2(verplichtePrijsItems.reduce((sum, item) => {
    const data = getActivePriceData(item)
    const bruto = data.aantal * data.eenheidsprijs
    return sum + round2(bruto - bruto * (data.korting_percentage / 100))
  }, 0))

  const btwBedrag = round2(verplichtePrijsItems.reduce((sum, item) => {
    const data = getActivePriceData(item)
    const bruto = data.aantal * data.eenheidsprijs
    const netto = round2(bruto - bruto * (data.korting_percentage / 100))
    return sum + round2(netto * (data.btw_percentage / 100))
  }, 0))

  // FIX 13: Optioneel subtotaal
  const optionelSubtotaal = round2(optionelePrijsItems.reduce((sum, item) => {
    const data = getActivePriceData(item)
    const bruto = data.aantal * data.eenheidsprijs
    return sum + round2(bruto - bruto * (data.korting_percentage / 100))
  }, 0))

  const optionelBtw = round2(optionelePrijsItems.reduce((sum, item) => {
    const data = getActivePriceData(item)
    const bruto = data.aantal * data.eenheidsprijs
    const netto = round2(bruto - bruto * (data.korting_percentage / 100))
    return sum + round2(netto * (data.btw_percentage / 100))
  }, 0))

  // Inkoop = sum of all calculatie_regels inkoop_prijs * aantal (verplichte items only)
  const totaalInkoop = useMemo(() => {
    return round2(verplichtePrijsItems.reduce((sum, item) => {
      const data = getActivePriceData(item)
      if (data.calculatie_regels && data.calculatie_regels.length > 0) {
        return sum + data.calculatie_regels.reduce((s, r) => s + round2(r.inkoop_prijs * r.aantal), 0)
      }
      return sum
    }, 0))
  }, [verplichtePrijsItems])

  const winstExBtw = round2(subtotaal - totaalInkoop)
  const margePercentage = subtotaal > 0 ? Math.round(((winstExBtw / subtotaal) * 100) * 10) / 10 : 0

  // ── Uren overzicht per configureerbaar veld + materiaalkosten ──
  // Haalt uren uit twee bronnen:
  //   1. Calculatieregels — matcht productnaam/categorie tegen geconfigureerde uren-velden
  //      (ongeacht eenheid — ook "stuks" wordt meegeteld als de naam matcht)
  //   2. Detail velden (namefields) — matcht op label, pakt getal uit waarde
  const urenVelden = (settings.calculatie_uren_velden && settings.calculatie_uren_velden.length > 0)
    ? settings.calculatie_uren_velden
    : ['Montage', 'Voorbereiding', 'Ontwerp & DTP', 'Applicatie']

  const { urenPerVeld, totaalUren, materiaalKosten, tariefPerVeld } = useMemo(() => {
    const urenMap: Record<string, number> = {}
    const tariefMap: Record<string, { totaalPrijs: number; totaalAantal: number }> = {}
    let totaal = 0
    let materiaal = 0

    // Initialiseer alle velden op 0
    urenVelden.forEach((veld) => {
      urenMap[veld] = 0
      tariefMap[veld] = { totaalPrijs: 0, totaalAantal: 0 }
    })

    verplichtePrijsItems.forEach((item) => {
      const data = getActivePriceData(item)

      // Bron 1: Calculatieregels — match productnaam/categorie tegen uren-velden
      if (data.calculatie_regels && data.calculatie_regels.length > 0) {
        data.calculatie_regels.forEach((r) => {
          const categorieLower = (r.categorie || '').toLowerCase()
          const naamLower = (r.product_naam || '').toLowerCase()

          // Check of deze regel matcht met een geconfigureerd uren-veld
          for (const veld of urenVelden) {
            const veldLower = veld.toLowerCase()
            if (categorieLower.includes(veldLower) || naamLower.includes(veldLower)) {
              urenMap[veld] = (urenMap[veld] || 0) + r.aantal
              totaal += r.aantal
              // Track tarief voor +/- berekening
              tariefMap[veld].totaalPrijs += round2(r.verkoop_prijs * r.aantal)
              tariefMap[veld].totaalAantal += r.aantal
              break
            }
          }

          if (categorieLower.includes('materiaal') || categorieLower === 'materiaal') {
            materiaal += round2(r.verkoop_prijs * r.aantal)
          }
        })
      }

      // Bron 2: Detail velden (namefields) — bijv. label "Voorbereiding", waarde "4" of "4 uur"
      if (item.detail_regels && item.detail_regels.length > 0) {
        item.detail_regels.forEach((dr) => {
          const labelLower = (dr.label || '').toLowerCase()
          const waarde = (dr.waarde || '').trim()
          if (!waarde) return

          // Probeer een getal uit de waarde te halen (bijv. "4", "4 uur", "2.5")
          const numMatch = waarde.match(/^[\d]+([.,]\d+)?/)
          if (!numMatch) return
          const uren = parseFloat(numMatch[0].replace(',', '.'))
          if (isNaN(uren) || uren <= 0) return

          // Match tegen geconfigureerde uren-velden
          for (const veld of urenVelden) {
            const veldLower = veld.toLowerCase()
            if (labelLower.includes(veldLower) || veldLower.includes(labelLower)) {
              urenMap[veld] = (urenMap[veld] || 0) + uren
              totaal += uren
              break
            }
          }
        })
      }
    })

    // Bereken gemiddeld tarief per veld (verkoop_prijs per uur)
    const tarieven: Record<string, number> = {}
    urenVelden.forEach((veld) => {
      tarieven[veld] = tariefMap[veld].totaalAantal > 0
        ? round2(tariefMap[veld].totaalPrijs / tariefMap[veld].totaalAantal)
        : 0
    })

    return { urenPerVeld: urenMap, totaalUren: totaal, materiaalKosten: round2(materiaal), tariefPerVeld: tarieven }
  }, [verplichtePrijsItems, urenVelden])

  // Bereken uren correctie bedrag (ex BTW)
  const urenCorrectieBedrag = useMemo(() => {
    let bedrag = 0
    for (const veld of Object.keys(urenCorrectie)) {
      const correctie = urenCorrectie[veld] || 0
      const tarief = tariefPerVeld[veld] || 0
      bedrag += correctie * tarief
    }
    return round2(bedrag)
  }, [urenCorrectie, tariefPerVeld])

  // Effectieve uren = basis + correctie
  const effectieveUrenPerVeld = useMemo(() => {
    const result: Record<string, number> = {}
    urenVelden.forEach((veld) => {
      result[veld] = (urenPerVeld[veld] || 0) + (urenCorrectie[veld] || 0)
    })
    return result
  }, [urenPerVeld, urenCorrectie, urenVelden])

  const effectieveTotaalUren = useMemo(() => {
    return Object.values(effectieveUrenPerVeld).reduce((sum, u) => sum + u, 0)
  }, [effectieveUrenPerVeld])

  // ── Initialize autofill defaults (seeds localStorage on first use) ──
  useEffect(() => {
    initAutofillDefaults()
  }, [])

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
        if (offerte.contactpersoon_id) setSelectedContactId(offerte.contactpersoon_id)
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
            breedte_mm: item.breedte_mm,
            hoogte_mm: item.hoogte_mm,
            oppervlakte_m2: item.oppervlakte_m2,
            afmeting_vrij: item.afmeting_vrij,
            foto_url: item.foto_url,
            foto_op_offerte: item.foto_op_offerte,
            is_optioneel: item.is_optioneel,
            interne_notitie: item.interne_notitie,
            bijlage_url: item.bijlage_url,
            bijlage_type: item.bijlage_type,
            bijlage_naam: item.bijlage_naam,
          }))

        if (mappedItems.length > 0) {
          setItems(mappedItems)
          setItemCount(mappedItems.length)
        }

        // FIX 12: Load versie nummer
        if (offerte.versie) setVersieNummer(offerte.versie)
        // FIX 16: Load afrondingskorting
        if (offerte.afrondingskorting_excl_btw) setAfrondingskorting(offerte.afrondingskorting_excl_btw)
        // Load uren correctie
        if (offerte.uren_correctie) setUrenCorrectie(offerte.uren_correctie)
        // Track status for factureren workflow
        setOfferteStatus(offerte.status)
        if (offerte.geconverteerd_naar_factuur_id) {
          setGeconverteerdNaarFactuurId(offerte.geconverteerd_naar_factuur_id)
          // Load linked factuur data for the workflow card
          getFactuur(offerte.geconverteerd_naar_factuur_id).then(factuur => {
            if (!cancelled && factuur) setLinkedFactuur(factuur)
          }).catch(() => {/* silent */})
        }
        // Load versie historie
        getOfferteVersies(editOfferteId).then(versies => {
          if (!cancelled) {
            setVersieHistorie(versies.map(v => ({ id: v.id, versie_nummer: v.versie_nummer, notitie: v.notitie, created_at: v.created_at })))
          }
        }).catch(() => {/* silent */})

        // Go straight to editing (skip klant selector)
        setShowKlantSelector(false)
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

  // ── Inkoop regel → calculatie item ──
  const handleInkoopRegelToevoegen = useCallback((regel: InkoopRegel) => {
    const newItem = createEmptyItem(regel.omschrijving)
    newItem.aantal = regel.aantal
    newItem.eenheidsprijs = 0 // Verkoopprijs leeg, gebruiker vult zelf in
    newItem.totaal = 0
    // Sla inkoopprijs op in calculatie
    newItem.calculatie_regels = [{
      id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product_naam: regel.omschrijving,
      categorie: 'Materiaal',
      eenheid: regel.eenheid || 'stuks',
      aantal: regel.aantal,
      inkoop_prijs: round2(regel.prijs_per_stuk),
      verkoop_prijs: 0,
      marge_percentage: 0,
      korting_percentage: 0,
      nacalculatie: false,
      btw_percentage: standaardBtw,
      notitie: '',
    }]
    newItem.heeft_calculatie = true
    setItems(prev => [...prev, newItem])
    toast.success(`"${regel.omschrijving}" toegevoegd aan offerte items`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standaardBtw, settings.offerte_regel_velden])

  // ── Inkoop regel → prijsvariant op laatste item ──
  const handleInkoopRegelAlsPrijsvariant = useCallback((regel: InkoopRegel, leverancier: string) => {
    if (items.length === 0) {
      // Geen items, maak er een aan
      handleInkoopRegelToevoegen(regel)
      return
    }
    // Voeg toe als prijsvariant op het laatste item
    const lastItem = items[items.length - 1]
    const variantLabel = leverancier ? `${leverancier}` : `Optie ${String.fromCharCode(65 + (lastItem.prijs_varianten?.length || 0))}`
    const newVariant: PrijsVariant = {
      id: `dr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: variantLabel,
      aantal: regel.aantal,
      eenheidsprijs: round2(regel.prijs_per_stuk),
      btw_percentage: lastItem.btw_percentage || standaardBtw,
      korting_percentage: 0,
      calculatie_regels: [{
        id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_naam: regel.omschrijving,
        categorie: 'Materiaal',
        eenheid: regel.eenheid || 'stuks',
        aantal: regel.aantal,
        inkoop_prijs: round2(regel.prijs_per_stuk),
        verkoop_prijs: round2(regel.prijs_per_stuk),
        marge_percentage: 0,
        korting_percentage: 0,
        nacalculatie: false,
        btw_percentage: standaardBtw,
        notitie: `Inkoop via ${leverancier}`,
      }],
      heeft_calculatie: true,
    }

    const existingVarianten = lastItem.prijs_varianten || []
    if (existingVarianten.length === 0) {
      // Maak eerst een variant van de huidige prijs
      const firstVariant: PrijsVariant = {
        id: `dr-${Date.now()}-a-${Math.random().toString(36).slice(2, 7)}`,
        label: 'Optie A',
        aantal: lastItem.aantal,
        eenheidsprijs: lastItem.eenheidsprijs,
        btw_percentage: lastItem.btw_percentage,
        korting_percentage: lastItem.korting_percentage,
        calculatie_regels: lastItem.calculatie_regels,
        heeft_calculatie: lastItem.heeft_calculatie,
      }
      setItems(prev => prev.map(item =>
        item.id === lastItem.id
          ? { ...item, prijs_varianten: [firstVariant, newVariant], actieve_variant_id: firstVariant.id }
          : item
      ))
    } else {
      setItems(prev => prev.map(item =>
        item.id === lastItem.id
          ? { ...item, prijs_varianten: [...existingVarianten, newVariant] }
          : item
      ))
    }
    toast.success(`Prijsvariant "${variantLabel}" toegevoegd`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, standaardBtw, handleInkoopRegelToevoegen])

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
          const bruto = round2(updated.aantal * updated.eenheidsprijs)
          updated.totaal = round2(bruto - round2(bruto * (updated.korting_percentage / 100)))
        }
        return updated
      })
    )
  }

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter((item) => item.id !== id))
  }

  // ── Clipboard helpers ──
  const CLIPBOARD_KEY = 'forgedesk_clipboard_items'

  const [clipboardCount, setClipboardCount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CLIPBOARD_KEY) || '[]').length
    } catch { return 0 }
  })

  const handleCopyItem = useCallback((item: QuoteLineItem) => {
    try {
      const existing = JSON.parse(localStorage.getItem(CLIPBOARD_KEY) || '[]')
      const { id, ...template } = item
      // Limit clipboard to 50 items to prevent unbounded growth
      const updated = [...existing.slice(-49), template]
      if (!safeSetItem(CLIPBOARD_KEY, JSON.stringify(updated))) {
        toast.error('Onvoldoende opslagruimte voor klembord')
        return
      }
      setClipboardCount(updated.length)
      toast.success('Item gekopieerd naar klembord')
    } catch {
      toast.error('Kon item niet kopiëren')
    }
  }, [])

  const handlePasteItems = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CLIPBOARD_KEY) || '[]')
      if (stored.length === 0) return

      const pastedItems: QuoteLineItem[] = stored.map((template: Omit<QuoteLineItem, 'id'>) => ({
        ...template,
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }))

      setItems(prev => [...prev, ...pastedItems])
      localStorage.removeItem(CLIPBOARD_KEY)
      setClipboardCount(0)
      toast.success(`${pastedItems.length} item${pastedItems.length === 1 ? '' : 's'} geplakt`)
    } catch {
      toast.error('Kon items niet plakken')
    }
  }, [])

  const handleCopyAllItems = useCallback(() => {
    try {
      const pricedItems = items.filter(i => i.soort === 'prijs' && i.beschrijving.trim())
      if (pricedItems.length === 0) {
        toast.error('Geen items om te kopiëren')
        return
      }
      const templates = pricedItems.map(({ id, ...rest }) => rest)
      if (!safeSetItem(CLIPBOARD_KEY, JSON.stringify(templates))) {
        toast.error('Onvoldoende opslagruimte voor klembord')
        return
      }
      setClipboardCount(templates.length)
      toast.success(`${templates.length} item${templates.length === 1 ? '' : 's'} gekopieerd naar klembord`)
    } catch {
      toast.error('Kon items niet kopiëren')
    }
  }, [items])

  const handleClearClipboard = useCallback(() => {
    localStorage.removeItem(CLIPBOARD_KEY)
    setClipboardCount(0)
    toast.success('Klembord geleegd')
  }, [])

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
        const bruto = round2(updated.aantal * updated.eenheidsprijs)
        updated.totaal = round2(bruto - round2(bruto * (updated.korting_percentage / 100)))
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

  // ── Autosave logic (debounced) ──
  const performAutoSave = useCallback(async () => {
    if (!user?.id || !selectedKlantId || !offerteTitel.trim() || items.length === 0) return
    if (isSaving || saveLockRef.current) return

    saveLockRef.current = true
    setAutoSaveStatus('saving')
    try {
      const klant = klanten.find((k) => k.id === selectedKlantId)
      const verplichtePrijsItemsLocal = items.filter((i) => i.soort === 'prijs' && !i.is_optioneel)
      const rawSub = round2(verplichtePrijsItemsLocal.reduce((sum, item) => {
        const data = getActivePriceData(item)
        const bruto = data.aantal * data.eenheidsprijs
        return sum + round2(bruto - bruto * (data.korting_percentage / 100))
      }, 0))
      const effectiefSub = round2(rawSub + afrondingskorting + urenCorrectieBedrag)
      const effectiefBtw = round2(effectiefSub * (rawSub > 0 ? round2(verplichtePrijsItemsLocal.reduce((sum, item) => {
        const data = getActivePriceData(item)
        const bruto = data.aantal * data.eenheidsprijs
        const netto = round2(bruto - bruto * (data.korting_percentage / 100))
        return sum + round2(netto * (data.btw_percentage / 100))
      }, 0)) / rawSub : 0.21))

      const currentId = editOfferteId || autoSaveIdRef.current
      const heeftUrenCorrectie = Object.values(urenCorrectie).some(v => v !== 0)

      if (currentId) {
        // Update existing
        await updateOfferte(currentId, {
          klant_id: selectedKlantId,
          klant_naam: klant?.bedrijfsnaam,
          ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
          ...(selectedContactId ? { contactpersoon_id: selectedContactId } : {}),
          titel: offerteTitel,
          status: 'concept',
          subtotaal: effectiefSub,
          btw_bedrag: effectiefBtw,
          totaal: round2(effectiefSub + effectiefBtw),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
          intro_tekst: introTekst,
          outro_tekst: outroTekst,
          ...(afrondingskorting !== 0 ? { afrondingskorting_excl_btw: afrondingskorting } : {}),
          ...(heeftUrenCorrectie ? { uren_correctie: urenCorrectie } : {}),
          versie: versieNummer,
        })

        // Delete old items, re-create
        const oldItems = await getOfferteItems(currentId)
        await Promise.all(oldItems.map((item) => deleteOfferteItem(item.id)))
        await Promise.all(
          items.map((item, index) =>
            createOfferteItem({
              user_id: user.id,
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
              breedte_mm: item.breedte_mm,
              hoogte_mm: item.hoogte_mm,
              oppervlakte_m2: item.oppervlakte_m2,
              afmeting_vrij: item.afmeting_vrij,
              foto_url: item.foto_url,
              foto_op_offerte: item.foto_op_offerte,
              is_optioneel: item.is_optioneel,
              interne_notitie: item.interne_notitie,
              bijlage_url: item.bijlage_url,
              bijlage_type: item.bijlage_type,
              bijlage_naam: item.bijlage_naam,
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
          ...(selectedContactId ? { contactpersoon_id: selectedContactId } : {}),
          nummer: offerteNummer,
          titel: offerteTitel,
          status: 'concept',
          subtotaal: effectiefSub,
          btw_bedrag: effectiefBtw,
          totaal: round2(effectiefSub + effectiefBtw),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
          intro_tekst: introTekst,
          outro_tekst: outroTekst,
          ...(afrondingskorting !== 0 ? { afrondingskorting_excl_btw: afrondingskorting } : {}),
          ...(heeftUrenCorrectie ? { uren_correctie: urenCorrectie } : {}),
          versie: versieNummer,
        })
        autoSaveIdRef.current = newOfferte.id

        await Promise.all(
          items.map((item, index) =>
            createOfferteItem({
              user_id: user.id,
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
              breedte_mm: item.breedte_mm,
              hoogte_mm: item.hoogte_mm,
              oppervlakte_m2: item.oppervlakte_m2,
              afmeting_vrij: item.afmeting_vrij,
              foto_url: item.foto_url,
              foto_op_offerte: item.foto_op_offerte,
              is_optioneel: item.is_optioneel,
              interne_notitie: item.interne_notitie,
              bijlage_url: item.bijlage_url,
              bijlage_type: item.bijlage_type,
              bijlage_naam: item.bijlage_naam,
            })
          )
        )
      }

      hasUnsavedChangesRef.current = false
      setDirty(false)
      setAutoSaveStatus('saved')
      // Reset indicator after 3 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } catch (err) {
      logger.error('Autosave failed:', err)
      setAutoSaveStatus('idle')
    } finally {
      saveLockRef.current = false
    }
  }, [user?.id, selectedKlantId, selectedProjectId, selectedContactId, offerteTitel, items, geldigTot, notities, voorwaarden, introTekst, outroTekst, editOfferteId, offerteNummer, isSaving, klanten, afrondingskorting, versieNummer])

  // Keep ref in sync so unmount handler can call latest version
  useEffect(() => {
    performAutoSaveRef.current = performAutoSave
  }, [performAutoSave])

  // Debounced autosave: trigger 2s after last change (only when editing)
  useEffect(() => {
    if (showKlantSelector) return
    if (!selectedKlantId || !offerteTitel.trim() || items.length === 0) return

    hasUnsavedChangesRef.current = true
    setDirty(true)

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSaveRef.current()
    }, 2000)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [items, offerteTitel, notities, voorwaarden, introTekst, outroTekst, geldigTot, selectedKlantId, selectedProjectId, showKlantSelector])

  // Save on unmount (navigating away) — fire-and-forget
  useEffect(() => {
    return () => {
      if (hasUnsavedChangesRef.current) {
        performAutoSaveRef.current()
      }
    }
  }, [])

  // Warn user about unsaved changes when closing tab/browser
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

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

  // ── FIX 11: Dupliceer offerte ──
  const [isDuplicating, setIsDuplicating] = useState(false)
  const handleDupliceerOfferte = async () => {
    if (!user?.id || !selectedKlantId) {
      toast.error('Kan niet dupliceren zonder klant')
      return
    }
    setIsDuplicating(true)
    try {
      const allOffertes = await getOffertes()
      const nieuweNummer = generateOfferteNummer(offertePrefix, allOffertes)
      const klant = klanten.find((k) => k.id === selectedKlantId)

      const prijsItemsLocal = items.filter((i) => i.soort === 'prijs')
      const sub = round2(prijsItemsLocal.reduce((sum, item) => {
        const data = getActivePriceData(item)
        const bruto = data.aantal * data.eenheidsprijs
        return sum + round2(bruto - bruto * (data.korting_percentage / 100))
      }, 0))
      const btw = round2(prijsItemsLocal.reduce((sum, item) => {
        const data = getActivePriceData(item)
        const bruto = data.aantal * data.eenheidsprijs
        const netto = round2(bruto - bruto * (data.korting_percentage / 100))
        return sum + round2(netto * (data.btw_percentage / 100))
      }, 0))

      const newGeldigTot = new Date()
      newGeldigTot.setDate(newGeldigTot.getDate() + offerteGeldigheidDagen)

      const newOfferte = await createOfferte({
        user_id: user.id,
        klant_id: selectedKlantId,
        klant_naam: klant?.bedrijfsnaam,
        ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
        ...(selectedContactId ? { contactpersoon_id: selectedContactId } : {}),
        nummer: nieuweNummer,
        titel: offerteTitel,
        status: 'concept',
        subtotaal: sub,
        btw_bedrag: btw,
        totaal: round2(sub + btw),
        geldig_tot: newGeldigTot.toISOString().split('T')[0],
        notities,
        voorwaarden,
        intro_tekst: introTekst,
        outro_tekst: outroTekst,
      })

      await Promise.all(
        items.map((item, index) =>
          createOfferteItem({
            user_id: user.id,
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
            breedte_mm: item.breedte_mm,
            hoogte_mm: item.hoogte_mm,
            oppervlakte_m2: item.oppervlakte_m2,
            afmeting_vrij: item.afmeting_vrij,
            foto_url: item.foto_url,
            foto_op_offerte: item.foto_op_offerte,
            is_optioneel: item.is_optioneel,
            interne_notitie: item.interne_notitie,
            bijlage_url: item.bijlage_url,
            bijlage_type: item.bijlage_type,
            bijlage_naam: item.bijlage_naam,
          })
        )
      )

      toast.success(`Offerte gedupliceerd als ${nieuweNummer}`)
      navigate(`/offertes/${newOfferte.id}/bewerken`)
    } catch (err) {
      logger.error('Dupliceer offerte failed:', err)
      toast.error('Kon offerte niet dupliceren')
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleNieuweVersie = async () => {
    if (!user?.id) return
    const quoteId = editOfferteId || autoSaveIdRef.current
    if (!quoteId) {
      toast.error('Sla de offerte eerst op')
      return
    }
    setIsSavingVersie(true)
    try {
      // Save current state first
      await performAutoSave()

      // Create snapshot
      const snapshot = JSON.stringify({ offerteTitel, items, notities, voorwaarden, introTekst, outroTekst, geldigTot })
      await createOfferteVersie({
        user_id: user.id,
        offerte_id: quoteId,
        versie_nummer: versieNummer,
        snapshot,
      })

      const newVersie = versieNummer + 1
      setVersieNummer(newVersie)

      // Update offerte versie
      await updateOfferte(quoteId, { versie: newVersie })

      // Refresh versie historie
      const versies = await getOfferteVersies(quoteId)
      setVersieHistorie(versies.map(v => ({ id: v.id, versie_nummer: v.versie_nummer, notitie: v.notitie, created_at: v.created_at })))

      toast.success(`Versie ${versieNummer} opgeslagen, nu op v${newVersie}`)
    } catch (err) {
      logger.error('Nieuwe versie opslaan failed:', err)
      toast.error('Kon versie niet opslaan')
    } finally {
      setIsSavingVersie(false)
    }
  }

  const handleHerstelVersie = async (versieId: string) => {
    const quoteId = editOfferteId || autoSaveIdRef.current
    if (!quoteId) return
    try {
      const versies = await getOfferteVersies(quoteId)
      const versie = versies.find(v => v.id === versieId)
      if (!versie) return
      const snapshot = JSON.parse(versie.snapshot) as {
        offerteTitel: string
        items: QuoteLineItem[]
        notities: string
        voorwaarden: string
        introTekst: string
        outroTekst: string
        geldigTot: string
      }
      setOfferteTitel(snapshot.offerteTitel)
      setItems(snapshot.items)
      setNotities(snapshot.notities)
      setVoorwaarden(snapshot.voorwaarden)
      setIntroTekst(snapshot.introTekst)
      setOutroTekst(snapshot.outroTekst)
      setGeldigTot(snapshot.geldigTot)
      toast.success(`Versie ${versie.versie_nummer} hersteld`)
      setShowVersieHistorie(false)
    } catch (err) {
      logger.error('Herstel versie failed:', err)
      toast.error('Kon versie niet herstellen')
    }
  }

  // ── Start editing: pick klant, then generate items ──
  const canStartEditing = selectedKlantId && offerteTitel.trim().length > 0

  const handleStartEditing = () => {
    if (items.length === 0) {
      const newItems: QuoteLineItem[] = Array.from({ length: itemCount }, (_, i) =>
        createEmptyItem(`Item ${i + 1}`)
      )
      setItems(newItems)
    }
    setShowKlantSelector(false)
  }

  // ── Save ──
  const saveOfferte = async (status: 'concept' | 'verzonden') => {
    if (isSaving || saveLockRef.current) return
    if (!user?.id) {
      toast.error('Je moet ingelogd zijn om een offerte op te slaan')
      return
    }
    // Cancel any pending autosave timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    saveLockRef.current = true
    setIsSaving(true)
    try {
      let savedOfferteId: string

      if ((isEditMode && editOfferteId) || autoSaveIdRef.current) {
        const existingId = editOfferteId || autoSaveIdRef.current!
        // Update existing offerte
        const effectiefSubtotaal = round2(subtotaal + afrondingskorting + urenCorrectieBedrag)
        const effectiefBtw = round2(effectiefSubtotaal * (subtotaal > 0 ? btwBedrag / subtotaal : 0.21))
        const heeftUrenCorrectie = Object.values(urenCorrectie).some(v => v !== 0)
        await updateOfferte(existingId, {
          klant_id: selectedKlantId,
          klant_naam: selectedKlant?.bedrijfsnaam,
          ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
          ...(selectedContactId ? { contactpersoon_id: selectedContactId } : {}),
          titel: offerteTitel,
          status,
          subtotaal: effectiefSubtotaal,
          btw_bedrag: effectiefBtw,
          totaal: round2(effectiefSubtotaal + effectiefBtw),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
          intro_tekst: introTekst,
          outro_tekst: outroTekst,
          ...(afrondingskorting !== 0 ? { afrondingskorting_excl_btw: afrondingskorting } : {}),
          ...(heeftUrenCorrectie ? { uren_correctie: urenCorrectie } : {}),
          versie: versieNummer,
        })
        savedOfferteId = existingId

        // Delete old items, then re-create
        const oldItems = await getOfferteItems(existingId)
        await Promise.all(oldItems.map((item) => deleteOfferteItem(item.id)))

        await Promise.all(
          items.map((item, index) =>
            createOfferteItem({
              user_id: user.id,
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
              breedte_mm: item.breedte_mm,
              hoogte_mm: item.hoogte_mm,
              oppervlakte_m2: item.oppervlakte_m2,
              afmeting_vrij: item.afmeting_vrij,
              foto_url: item.foto_url,
              foto_op_offerte: item.foto_op_offerte,
              is_optioneel: item.is_optioneel,
              interne_notitie: item.interne_notitie,
              bijlage_url: item.bijlage_url,
              bijlage_type: item.bijlage_type,
              bijlage_naam: item.bijlage_naam,
            })
          )
        )
      } else {
        // Create new offerte
        const newEffectiefSub = round2(subtotaal + afrondingskorting + urenCorrectieBedrag)
        const newEffectiefBtw = round2(newEffectiefSub * (subtotaal > 0 ? btwBedrag / subtotaal : 0.21))
        const newHeeftUrenCorrectie = Object.values(urenCorrectie).some(v => v !== 0)
        const newOfferte = await createOfferte({
          user_id: user.id,
          klant_id: selectedKlantId,
          klant_naam: selectedKlant?.bedrijfsnaam,
          ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
          ...(selectedContactId ? { contactpersoon_id: selectedContactId } : {}),
          ...(paramDealId ? { deal_id: paramDealId } : {}),
          nummer: offerteNummer,
          titel: offerteTitel,
          status,
          subtotaal: newEffectiefSub,
          btw_bedrag: newEffectiefBtw,
          totaal: round2(newEffectiefSub + newEffectiefBtw),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
          intro_tekst: introTekst,
          outro_tekst: outroTekst,
          ...(afrondingskorting !== 0 ? { afrondingskorting_excl_btw: afrondingskorting } : {}),
          ...(newHeeftUrenCorrectie ? { uren_correctie: urenCorrectie } : {}),
          versie: versieNummer,
        })
        savedOfferteId = newOfferte.id

        await Promise.all(
          items.map((item, index) =>
            createOfferteItem({
              user_id: user.id,
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
              breedte_mm: item.breedte_mm,
              hoogte_mm: item.hoogte_mm,
              oppervlakte_m2: item.oppervlakte_m2,
              afmeting_vrij: item.afmeting_vrij,
              foto_url: item.foto_url,
              foto_op_offerte: item.foto_op_offerte,
              is_optioneel: item.is_optioneel,
              interne_notitie: item.interne_notitie,
              bijlage_url: item.bijlage_url,
              bijlage_type: item.bijlage_type,
              bijlage_naam: item.bijlage_naam,
            })
          )
        )
      }

      // Save autofill values from all items' detail regels
      items.forEach((item) => {
        if (item.detail_regels) {
          item.detail_regels.forEach((regel) => {
            const field = labelToAutofillField(regel.label)
            if (field && regel.waarde) {
              saveAutofillValue(field, regel.waarde)
            }
          })
        }
      })

      if (status === 'verzonden' && selectedKlant?.email) {
        try {
          // Haal opgeslagen offerte op voor publiek_token
          const savedOfferte = await getOfferte(savedOfferteId).catch(() => null)
          const bekijkUrl = savedOfferte?.publiek_token
            ? `${window.location.origin}/offerte-bekijken/${savedOfferte.publiek_token}`
            : undefined

          const { subject, html, text } = offerteVerzendTemplate({
            klantNaam: selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam,
            offerteNummer,
            offerteTitel,
            totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(round2(subtotaal + btwBedrag)),
            geldigTot,
            bedrijfsnaam,
            primaireKleur,
            handtekening: emailHandtekening || undefined,
            logoUrl: profile?.logo_url || undefined,
            bekijkUrl,
          })
          await sendEmail(selectedKlant.email, subject, text, { html })
        } catch (emailErr) {
          logger.error('Email verzenden mislukt:', emailErr)
          toast.error('Offerte opgeslagen maar email niet verzonden')
        }
      }

      hasUnsavedChangesRef.current = false
      const toastMsg = isEditMode
        ? 'Offerte bijgewerkt'
        : status === 'concept'
          ? 'Offerte opgeslagen als concept'
          : 'Offerte verzonden naar klant'

      toast.success(toastMsg, {
        action: {
          label: 'Maak factuur',
          onClick: () => {
            const params = new URLSearchParams({
              offerte_id: savedOfferteId,
              klant_id: selectedKlantId,
            })
            if (offerteTitel) params.set('titel', offerteTitel)
            if (selectedProjectId) params.set('project_id', selectedProjectId)
            navigate(`/facturen/nieuw?${params.toString()}`)
          },
        },
        duration: 8000,
      })
      navigate(`/offertes/${savedOfferteId}/bewerken`, { state: { from: (location.state as { from?: string })?.from || '/offertes' } })
    } catch (err) {
      logger.error('Failed to save offerte:', err)
      toast.error('Kon offerte niet opslaan')
    } finally {
      setIsSaving(false)
      saveLockRef.current = false
    }
  }

  const handleDownloadPdf = () => {
    if (!selectedKlant) {
      toast.error('Selecteer eerst een klant')
      return
    }
    try {
      toast.info('PDF wordt gegenereerd...')
      const pdfSubtotaal = round2(subtotaal + afrondingskorting)
      const pdfBtw = round2(pdfSubtotaal * (subtotaal > 0 ? btwBedrag / subtotaal : 0.21))
      const offerteData = {
        id: '',
        user_id: user?.id || '',
        klant_id: selectedKlantId,
        nummer: offerteNummer,
        titel: offerteTitel,
        status: 'concept' as const,
        subtotaal: pdfSubtotaal,
        btw_bedrag: pdfBtw,
        totaal: round2(pdfSubtotaal + pdfBtw),
        geldig_tot: geldigTot,
        notities,
        voorwaarden,
        versie: versieNummer,
        ...(afrondingskorting !== 0 ? { afrondingskorting_excl_btw: afrondingskorting } : {}),
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
        soort: item.soort,
        extra_velden: item.extra_velden,
        detail_regels: item.detail_regels,
        breedte_mm: item.breedte_mm,
        hoogte_mm: item.hoogte_mm,
        oppervlakte_m2: item.oppervlakte_m2,
        foto_url: item.foto_url,
        foto_op_offerte: item.foto_op_offerte,
        is_optioneel: item.is_optioneel,
        bijlage_url: item.bijlage_url,
        bijlage_type: item.bijlage_type,
        bijlage_naam: item.bijlage_naam,
        created_at: new Date().toISOString(),
      }))
      const doc = generateOffertePDF(offerteData, offerteItems, selectedKlant, {
        ...profile,
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

  const emailSectionRef = useRef<HTMLDivElement>(null)

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
    // Pre-fill email fields — use selected contactpersoon (FIX 7)
    const selectedCp = selectedContactId
      ? selectedKlant.contactpersonen?.find(c => c.id === selectedContactId)
      : selectedKlant.contactpersonen?.[0]
    const contactEmail = selectedCp?.email || selectedKlant.email || ''
    const klantNaam = selectedCp?.naam || selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam || ''
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
    // Scroll to email section
    setTimeout(() => emailSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleSendEmailInline = async () => {
    if (!emailTo.trim() || !emailSubject.trim()) {
      toast.error('Vul een ontvanger en onderwerp in')
      return
    }
    setIsSendingEmail(true)
    try {
      // Ensure offerte is saved before sending
      let quoteId = editOfferteId || autoSaveIdRef.current
      if (!quoteId) {
        // Force save first
        await performAutoSave()
        quoteId = editOfferteId || autoSaveIdRef.current
      }

      // Haal offerte op voor publiek_token
      const savedQuoteId = editOfferteId || autoSaveIdRef.current
      const savedOfferte = savedQuoteId ? await getOfferte(savedQuoteId).catch(() => null) : null
      const bekijkUrl = savedOfferte?.publiek_token
        ? `${window.location.origin}/offerte-bekijken/${savedOfferte.publiek_token}`
        : undefined

      const klantNaam = selectedKlant?.contactpersoon || selectedKlant?.bedrijfsnaam || ''
      const { html: templateHtml, text: templateText } = offerteVerzendTemplate({
        klantNaam,
        offerteNummer,
        offerteTitel,
        totaalBedrag: formatCurrency(round2(subtotaal + btwBedrag)),
        geldigTot,
        bedrijfsnaam,
        primaireKleur,
        handtekening: emailHandtekening || undefined,
        logoUrl: profile?.logo_url || undefined,
        bekijkUrl,
      })

      // Genereer PDF bijlage
      let attachments: Array<{ filename: string; content: string; encoding: 'base64' }> = []
      if (selectedKlant) {
        try {
          const offerteData = {
            nummer: offerteNummer,
            titel: offerteTitel,
            subtotaal,
            btw_bedrag: btwBedrag,
            totaal: round2(subtotaal + btwBedrag),
            geldig_tot: geldigTot,
            notities,
            voorwaarden,
            intro_tekst: introTekst,
            outro_tekst: outroTekst,
            ...(afrondingskorting !== 0 ? { afrondingskorting_excl_btw: afrondingskorting } : {}),
          } as Parameters<typeof generateOffertePDF>[0]
          const pdfItems = items.map((item, index) => ({
            id: item.id,
            offerte_id: '',
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
            is_optioneel: item.is_optioneel,
          })) as Parameters<typeof generateOffertePDF>[1]
          const doc = generateOffertePDF(offerteData, pdfItems, selectedKlant, {
            ...profile,
            primaireKleur: primaireKleur || '#2563eb',
          }, documentStyle)
          const pdfBase64 = doc.output('datauristring').split(',')[1]
          attachments = [{ filename: `${offerteNummer}.pdf`, content: pdfBase64, encoding: 'base64' as const }]
        } catch (pdfErr) {
          logger.error('PDF genereren mislukt, email wordt zonder bijlage verstuurd:', pdfErr)
        }
      }

      await sendEmail(emailTo.trim(), emailSubject.trim(), templateText, { html: templateHtml, attachments })
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

  // ── Actions dropdown state ──
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  // ── Helper: marge color for sidebar (unified: ≥65% green, 50-64% orange, <50% red) ──
  const getMargeColorSidebar = (pct: number) => {
    if (pct >= 65) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', bar: 'bg-green-500' }
    if (pct >= 50) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', bar: 'bg-amber-500' }
    return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', bar: 'bg-red-500' }
  }

  const margeColor = getMargeColorSidebar(margePercentage)

  // ── Per-item marge for sidebar summary ──
  const itemMarges = useMemo(() => {
    return verplichtePrijsItems.map((item) => {
      const data = getActivePriceData(item)
      const inkoop = (data.calculatie_regels || []).reduce((s, r) => s + round2(r.inkoop_prijs * r.aantal), 0)
      const bruto = data.aantal * data.eenheidsprijs
      const verkoop = round2(bruto - bruto * (data.korting_percentage / 100))
      const marge = round2(verkoop - inkoop)
      const pct = verkoop > 0 ? Math.round(((marge / verkoop) * 100) * 10) / 10 : 0
      return { beschrijving: item.beschrijving, inkoop: round2(inkoop), verkoop, marge, pct, hasCalc: (data.calculatie_regels || []).length > 0 }
    })
  }, [verplichtePrijsItems])

  // ── Render ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────
  // KLANT SELECTOR (shown when no klant is selected yet, or new offerte)
  // ────────────────────────────────────────────────────────────────────
  if (showKlantSelector && !isEditMode) {
    return (
      <div className="pb-12">
        <div className="space-y-5 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => {
              const from = (location.state as { from?: string })?.from
              navigate(from || '/offertes')
            }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Nieuwe Offerte</h1>
              <p className="text-sm text-muted-foreground">Selecteer een klant en vul de offerte details in.</p>
            </div>
          </div>

          {/* Klant selectie + Contactpersoon */}
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Klant</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input value={klantSearch} onChange={(e) => setKlantSearch(e.target.value)} placeholder="Zoek op bedrijfsnaam, contactpersoon of email..." className="pl-10" />
                  </div>
                  <Select value={selectedKlantId} onValueChange={(val) => { setSelectedKlantId(val); setKlantSearch('') }}>
                    <SelectTrigger><SelectValue placeholder="Selecteer een klant..." /></SelectTrigger>
                    <SelectContent>
                      {filteredKlanten.map((klant) => (
                        <SelectItem key={klant.id} value={klant.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{klant.bedrijfsnaam}</span>
                            {klant.contactpersoon && (<><span className="text-muted-foreground/60">-</span><span className="text-muted-foreground">{klant.contactpersoon}</span></>)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedKlant && (
                  <div className="bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 border border-primary/15 dark:border-primary/25 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white font-bold text-lg">{selectedKlant.bedrijfsnaam[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground">{selectedKlant.bedrijfsnaam}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                          {selectedKlant.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{selectedKlant.email}</span>}
                          {selectedKlant.telefoon && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{selectedKlant.telefoon}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => { setSelectedKlantId(''); setSelectedProjectId(''); setContactpersoon(''); setSelectedContactId('') }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                {selectedKlantId && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5"><FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />Project<span className="text-xs text-muted-foreground font-normal">(optioneel)</span></Label>
                    {klantProjecten.length > 0 ? (
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger><SelectValue placeholder="Koppel aan een project..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="geen"><span className="text-muted-foreground">Geen project</span></SelectItem>
                          {klantProjecten.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center gap-2"><span className="font-medium">{project.naam}</span><Badge variant="outline" className="text-[10px] px-1.5 py-0">{project.status}</Badge></div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <p className="text-xs text-muted-foreground py-2">Geen projecten gevonden voor deze klant</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rechter kolom: Contactpersoon (2/5) */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"><Contact className="h-3.5 w-3.5 text-white" /></div>
                  Contactpersoon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedKlant ? (
                  <>
                    {(selectedKlant.contactpersonen?.length > 0 || selectedKlant.contactpersoon) && (
                      <div className="space-y-1.5">
                        {selectedKlant.contactpersonen?.map((cp) => (
                          <button key={cp.id} onClick={() => handleSelectContact(cp.id)} className={cn('w-full text-left rounded-lg border p-2.5 transition-all', selectedContactId === cp.id ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-border dark:border-border hover:border-border hover:bg-background')}>
                            <div className="flex items-center gap-2">
                              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold', selectedContactId === cp.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>{cp.naam[0]?.toUpperCase()}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{cp.naam}</p>
                                {cp.functie && <p className="text-[11px] text-muted-foreground truncate">{cp.functie}</p>}
                              </div>
                              {cp.is_primair && <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">primair</span>}
                            </div>
                          </button>
                        ))}
                        {(!selectedKlant.contactpersonen || selectedKlant.contactpersonen.length === 0) && selectedKlant.contactpersoon && (
                          <div className="rounded-lg border border-primary/50 bg-primary/5 ring-1 ring-primary/20 p-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">{selectedKlant.contactpersoon[0]?.toUpperCase()}</div>
                              <p className="text-sm font-medium text-foreground">{selectedKlant.contactpersoon}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!showNewContact ? (
                      <button onClick={() => setShowNewContact(true)} className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors py-2 px-2 rounded-lg hover:bg-background">
                        <UserPlus className="h-3.5 w-3.5" />Nieuwe contactpersoon toevoegen
                      </button>
                    ) : (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                        <p className="text-xs font-medium text-blue-700 flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" />Nieuwe contactpersoon</p>
                        <Input value={newContactNaam} onChange={(e) => setNewContactNaam(e.target.value)} placeholder="Naam *" className="h-8 text-sm" autoFocus />
                        <Input value={newContactFunctie} onChange={(e) => setNewContactFunctie(e.target.value)} placeholder="Functie" className="h-8 text-sm" />
                        <Input value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} placeholder="E-mailadres" type="email" className="h-8 text-sm" />
                        <Input value={newContactTelefoon} onChange={(e) => setNewContactTelefoon(e.target.value)} placeholder="Telefoonnummer" className="h-8 text-sm" />
                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" onClick={handleAddContact} disabled={!newContactNaam.trim()} className="h-7 text-xs gap-1"><Plus className="h-3 w-3" />Toevoegen</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setShowNewContact(false); setNewContactNaam(''); setNewContactFunctie(''); setNewContactEmail(''); setNewContactTelefoon('') }} className="h-7 text-xs">Annuleren</Button>
                        </div>
                      </div>
                    )}
                    {!showNewContact && (
                      <div className="space-y-1.5 pt-1 border-t border-border">
                        <Label className="text-[11px] text-muted-foreground">Of typ een naam</Label>
                        <Input value={contactpersoon} onChange={(e) => { setContactpersoon(e.target.value); setSelectedContactId('') }} placeholder="Contactpersoon naam..." className="h-8 text-sm" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2"><User className="h-5 w-5 text-muted-foreground/60" /></div>
                    <p className="text-sm text-muted-foreground">Selecteer eerst een klant</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Offerte details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"><FileText className="h-3.5 w-3.5 text-white" /></div>
                Offerte details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="offerte-titel">Offerte titel</Label>
                <Input id="offerte-titel" value={offerteTitel} onChange={(e) => setOfferteTitel(e.target.value)} placeholder="bijv. Gevelreclame nieuwe locatie, Autobelettering wagenpark..." className="text-base" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offerte-nummer" className="flex items-center gap-1.5"><Hash className="h-3 w-3 text-muted-foreground" />Nummer</Label>
                  <Input id="offerte-nummer" value={offerteNummer} readOnly className="bg-background dark:bg-foreground/80 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="geldig-tot" className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-muted-foreground" />Geldig tot</Label>
                  <Input id="geldig-tot" type="date" value={geldigTot} onChange={(e) => setGeldigTot(e.target.value)} className="text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hoeveel items? */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center"><Plus className="h-3.5 w-3.5 text-white" /></div>
                Hoeveel items heeft je offerte?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Elk item is een complete prijsberekening. Je kunt later altijd items toevoegen of verwijderen.</p>
              <div className="flex items-center gap-2">
                {ITEM_COUNT_OPTIONS.map((count) => (
                  <button key={count} onClick={() => setItemCount(count)} className={cn('h-12 w-12 rounded-xl text-lg font-bold transition-all border-2', itemCount === count ? 'border-primary bg-gradient-to-br from-accent to-primary text-white shadow-md scale-110' : 'border-border dark:border-border bg-card text-foreground hover:border-border')}>
                    {count}
                  </button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">{itemCount === 1 ? 'item' : 'items'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Start button */}
          <div className="flex justify-end">
            <Button onClick={handleStartEditing} disabled={!canStartEditing} className="px-8" size="lg">
              Items toevoegen
              <FileText className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────
  // MAIN LAYOUT: Two columns — Left: scrollable content, Right: sticky sidebar (380px)
  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="pb-12">
      {/* ──── HEADER BAR ──── */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent dark:from-primary/10 dark:via-accent/10 border border-primary/10 dark:border-primary/20 px-6 py-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Back + Title + Badges */}
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="hover:bg-white/50 dark:hover:bg-foreground/80/50 flex-shrink-0" onClick={() => {
              const from = (location.state as { from?: string })?.from
              navigate(from || '/offertes')
            }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground font-display truncate">{isEditMode ? 'Offerte Bewerken' : 'Nieuwe Offerte'}</h1>
                <Badge variant="outline" className="text-xs font-mono bg-white/50 dark:bg-foreground/80/50 flex-shrink-0"><Hash className="h-3 w-3 mr-1" />{offerteNummer}</Badge>
                {versieNummer > 1 && (
                  <Badge variant="outline" className="text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 cursor-pointer flex-shrink-0" onClick={() => setShowVersieHistorie(!showVersieHistorie)}>v{versieNummer}</Badge>
                )}
                {geldigTot && (() => {
                  const days = Math.floor((new Date(geldigTot).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  if (days < 0) return <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 flex-shrink-0">Verlopen</Badge>
                  if (days < 7) return <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200 flex-shrink-0">Verloopt over {days} {days === 1 ? 'dag' : 'dagen'}</Badge>
                  return <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 flex-shrink-0"><Calendar className="h-3 w-3 mr-1" />Geldig t/m {new Date(geldigTot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</Badge>
                })()}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {autoSaveStatus === 'saving' && <span className="flex items-center gap-1.5 text-xs text-amber-600"><div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />Opslaan...</span>}
                {autoSaveStatus === 'saved' && <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Check className="h-3 w-3" />Opgeslagen</span>}
              </div>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => saveOfferte('concept')} disabled={isSaving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isSaving ? 'Opslaan...' : 'Opslaan'}</span>
            </Button>
            <Button size="sm" onClick={handleVerstuurOfferte} disabled={isSaving} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Verstuur</span>
            </Button>

            {/* Actions dropdown */}
            {isEditMode && (
              <div className="relative">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowActionsMenu(!showActionsMenu)}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {showActionsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-card rounded-lg border border-border dark:border-border shadow-lg py-1 w-48">
                      <button onClick={() => { handleDupliceerOfferte(); setShowActionsMenu(false) }} disabled={isDuplicating} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-foreground/80 flex items-center gap-2 disabled:opacity-50">
                        <Copy className="h-3.5 w-3.5" />{isDuplicating ? 'Dupliceren...' : 'Dupliceer offerte'}
                      </button>
                      <button onClick={() => { handleNieuweVersie(); setShowActionsMenu(false) }} disabled={isSavingVersie} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-foreground/80 flex items-center gap-2 disabled:opacity-50">
                        <Clock className="h-3.5 w-3.5" />{isSavingVersie ? 'Opslaan...' : `Nieuwe versie (v${versieNummer})`}
                      </button>
                      <button onClick={() => { setShowKlantSelector(true); setShowActionsMenu(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-foreground/80 flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />Klant wijzigen
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──── VERSIE HISTORIE ──── */}
      {showVersieHistorie && versieHistorie.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />Versie historie
                <Badge variant="outline" className="text-[10px]">{versieHistorie.length} versies</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {versieHistorie.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-border dark:border-border px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">Versie {v.versie_nummer}</span>
                    <span className="text-xs text-muted-foreground ml-2">{new Date(v.created_at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {v.notitie && <p className="text-xs text-muted-foreground mt-0.5">{v.notitie}</p>}
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleHerstelVersie(v.id)}>Herstel</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ──── TWO-COLUMN GRID ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: Scrollable content                                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="space-y-5 min-w-0">
          {/* ── Introductietekst ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><Mail className="h-3.5 w-3.5 text-white" /></div>
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
                  <Button key={tmpl.label} variant="outline" size="sm" className="text-xs h-7" onClick={() => setIntroTekst(tmpl.tekst)}>{tmpl.label}</Button>
                ))}
              </div>
              <Textarea value={introTekst} onChange={(e) => setIntroTekst(e.target.value)} placeholder="Beste ..., hierbij ontvangt u onze offerte voor..." rows={3} className="resize-y" />
            </CardContent>
          </Card>

          {/* ── Items ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center"><FileText className="h-3.5 w-3.5 text-white" /></div>
                  Offerte items
                  <span className="text-xs text-muted-foreground font-normal ml-1">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <QuoteItemsTable
                items={items}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onRemoveItem={handleRemoveItem}
                userId={user?.id}
                onUpdateItemWithCalculatie={handleUpdateItemWithCalculatie}
                onUpdateItemWithVariantCalculatie={handleUpdateItemWithVariantCalculatie}
                suggesties={omschrijvingSuggesties}
                onCopyItem={handleCopyItem}
                onCopyAllItems={handleCopyAllItems}
                clipboardCount={clipboardCount}
                onPasteItems={handlePasteItems}
                onClearClipboard={handleClearClipboard}
                toonM2={offerteToonM2}
                projectId={selectedProjectId || undefined}
                klantId={selectedKlantId || undefined}
                offerteId={editOfferteId || autoSaveIdRef.current || undefined}
              />
            </CardContent>
          </Card>

          {/* ── Afsluittekst ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><FileText className="h-3.5 w-3.5 text-white" /></div>
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
                  <Button key={tmpl.label} variant="outline" size="sm" className="text-xs h-7" onClick={() => setOutroTekst(tmpl.tekst)}>{tmpl.label}</Button>
                ))}
              </div>
              <Textarea value={outroTekst} onChange={(e) => setOutroTekst(e.target.value)} placeholder="Wij zien uw reactie graag tegemoet." rows={2} className="resize-y" />
            </CardContent>
          </Card>

          {/* ── Notities & Voorwaarden ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-muted-foreground to-foreground/60 flex items-center justify-center"><FileText className="h-3.5 w-3.5 text-white" /></div>
                Notities & Voorwaarden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notities</Label>
                  <Textarea value={notities} onChange={(e) => setNotities(e.target.value)} placeholder="Interne notities of opmerkingen voor de klant..." rows={4} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Voorwaarden</Label>
                  <Textarea value={voorwaarden} onChange={(e) => setVoorwaarden(e.target.value)} rows={4} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* INLINE EMAIL COMPOSE — bottom of left column                   */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div ref={emailSectionRef}>
            {showEmailCompose && (
              <Card className="border-2 border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center"><Send className="h-3.5 w-3.5 text-white" /></div>
                      Offerte versturen
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setShowEmailCompose(false)}><X className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3"><Label className="text-sm font-medium w-20 flex-shrink-0">Aan</Label><Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="email@voorbeeld.nl" type="email" className="h-9" /></div>
                  <div className="flex items-center gap-3"><Label className="text-sm font-medium w-20 flex-shrink-0">CC</Label><Input value={emailCc} onChange={(e) => setEmailCc(e.target.value)} placeholder="cc@voorbeeld.nl (meerdere met komma)" className="h-9" /></div>
                  <div className="flex items-center gap-3"><Label className="text-sm font-medium w-20 flex-shrink-0">BCC</Label><Input value={emailBcc} onChange={(e) => setEmailBcc(e.target.value)} placeholder="bcc@voorbeeld.nl" className="h-9" /></div>
                  <div className="flex items-center gap-3"><Label className="text-sm font-medium w-20 flex-shrink-0">Onderwerp</Label><Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Onderwerp..." className="h-9" /></div>

                  <Separator />

                  {/* Bijlagen */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Bijlagen</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAddBijlage}><Paperclip className="h-3 w-3" />Bijlage toevoegen</Button>
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf,.doc,.docx" />
                      </div>
                    </div>
                    {emailBijlagen.map((bijlage, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="w-7 h-7 rounded flex items-center justify-center bg-red-500 text-white text-[8px] font-bold flex-shrink-0">PDF</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{bijlage.naam}</p>
                          {idx === 0 && <p className="text-xs text-muted-foreground">Offerte PDF — Automatisch bijgevoegd</p>}
                        </div>
                        {idx > 0 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEmailBijlagen((prev) => prev.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>}
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <Mail className="h-3.5 w-3.5" />
                      Email preview — HTML template
                    </div>
                    <div className="text-sm text-foreground/80 space-y-2">
                      <p>Beste {selectedKlant?.contactpersoon || selectedKlant?.bedrijfsnaam || 'klant'},</p>
                      <p>Hierbij ontvangt u onze offerte <strong>{offerteNummer}</strong> voor <strong>{offerteTitel}</strong>.</p>
                      <div className="bg-card rounded border border-border p-3 text-xs space-y-1">
                        <p><strong>Totaalbedrag:</strong> {formatCurrency(round2(subtotaal + btwBedrag))}</p>
                        <p><strong>Geldig tot:</strong> {geldigTot ? new Date(geldigTot).toLocaleDateString('nl-NL') : '-'}</p>
                      </div>
                      <div className="flex items-center gap-2 py-1">
                        <span className="inline-block px-4 py-2 rounded-md text-xs font-semibold text-white" style={{ backgroundColor: primaireKleur || '#2941aa' }}>
                          Offerte bekijken →
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Heeft u vragen? Neem gerust contact op.</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">De klant ontvangt een professionele HTML email met uw bedrijfslogo, huisstijlkleur en een directe link naar de offerte.</p>
                  </div>

                  <Separator />

                  {/* Inplannen */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={emailScheduled} onChange={(e) => setEmailScheduled(e.target.checked)} className="rounded border-border" />
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Inplannen</span>
                    </label>
                    {emailScheduled && (
                      <div className="pl-7 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const morgen = new Date(); morgen.setDate(morgen.getDate() + 1)
                            const morgenStr = morgen.toISOString().split('T')[0]
                            return [
                              { label: 'Morgenochtend 08:00', datum: morgenStr, tijd: '08:00' },
                              { label: 'Morgen 10:00', datum: morgenStr, tijd: '10:00' },
                              { label: 'Morgen 14:00', datum: morgenStr, tijd: '14:00' },
                            ].map((opt) => (
                              <Button key={opt.label} variant="outline" size="sm" className="text-xs h-7" onClick={() => { setEmailScheduleDate(opt.datum); setEmailScheduleTime(opt.tijd) }}>{opt.label}</Button>
                            ))
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="date" value={emailScheduleDate} onChange={(e) => setEmailScheduleDate(e.target.value)} className="h-8 w-40" />
                          <Input type="time" value={emailScheduleTime} onChange={(e) => setEmailScheduleTime(e.target.value)} className="h-8 w-28" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" onClick={() => setShowEmailCompose(false)}>Annuleren</Button>
                    <Button onClick={handleSendEmailInline} disabled={!emailTo.trim() || !emailSubject.trim() || isSendingEmail} className="gap-2">
                      <Send className="h-4 w-4" />{isSendingEmail ? 'Verzenden...' : emailScheduled ? 'Inplannen' : 'Verstuur email'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>{/* end LEFT COLUMN */}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* RIGHT SIDEBAR: Configurable order + sticky pin                 */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="lg:block">
          <div className="space-y-0">

            {/* ── Mobile collapse toggle ── */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border dark:border-border bg-card mb-4"
            >
              <span className="text-sm font-semibold">Klant & Samenvatting</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">{formatCurrency(round2(subtotaal + btwBedrag))}</span>
                {sidebarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </div>
            </button>

            <div className={cn('space-y-0', sidebarCollapsed && 'hidden lg:block')}>
              {/* Render sidebar sections in configured order */}
              {sidebarLayout.order.map((sectionId) => {
                // Determine visibility
                const showFactureren = isEditMode && (offerteStatus === 'goedgekeurd' || offerteStatus === 'gefactureerd' || !!geconverteerdNaarFactuurId)
                if (sectionId === 'factureren' && !showFactureren) return null
                if (sectionId === 'inkoop' && !user?.id) return null

                const isPinned = sidebarLayout.pinned.has(sectionId)
                const isDragging = sidebarLayout.draggedSection === sectionId
                const isDragOver = sidebarLayout.dragOverSection === sectionId

                return (
                  <div
                    key={sectionId}
                    draggable
                    onDragStart={(e) => sidebarLayout.handleDragStart(e, sectionId)}
                    onDragEnd={sidebarLayout.handleDragEnd}
                    onDragEnter={(e) => sidebarLayout.handleDragEnter(e, sectionId)}
                    onDragLeave={sidebarLayout.handleDragLeave}
                    onDragOver={sidebarLayout.handleDragOver}
                    onDrop={(e) => sidebarLayout.handleDrop(e, sectionId)}
                    className={cn(
                      'group/sidebar-section pb-4 transition-all',
                      isPinned && 'lg:sticky lg:top-4 z-10',
                      isDragging && 'opacity-40',
                      isDragOver && 'pt-1',
                    )}
                  >
                    {/* Drop indicator */}
                    {isDragOver && !isDragging && (
                      <div className="h-1 bg-primary/50 rounded-full mb-2 mx-4 animate-pulse" />
                    )}

                    {/* Drag handle + pin bar */}
                    <div className="flex items-center gap-1 mb-1 opacity-0 group-hover/sidebar-section:opacity-100 transition-opacity">
                      <div className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground">
                        <GripVertical className="h-3 w-3" />
                      </div>
                      <button
                        onClick={() => sidebarLayout.togglePin(sectionId)}
                        className={cn(
                          'p-0.5 rounded transition-colors',
                          isPinned
                            ? 'text-primary bg-primary/10 hover:bg-primary/20'
                            : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted'
                        )}
                        title={isPinned ? 'Losmaken' : 'Vastzetten (sticky)'}
                      >
                        <Pin className={cn('h-3 w-3', isPinned && 'fill-current')} />
                      </button>
                      <span className="text-[9px] text-muted-foreground/40 ml-0.5">
                        {sectionId === 'klant' && 'Klant'}
                        {sectionId === 'factureren' && 'Factureren'}
                        {sectionId === 'samenvatting' && 'Samenvatting'}
                        {sectionId === 'inkoop' && 'Inkoop'}
                      </span>
                    </div>

                    {/* ── KLANTGEGEVENS ── */}
                    {sectionId === 'klant' && (
                      <>
                        {selectedKlant ? (
                          <div className="rounded-xl border border-border dark:border-border bg-card overflow-hidden shadow-sm">
                            <button onClick={() => setKlantPanelOpen(!klantPanelOpen)} className="w-full flex items-center gap-2 px-4 py-3 bg-background/80 dark:bg-foreground/80/50 border-b border-border dark:border-border hover:bg-muted dark:hover:bg-foreground/80 transition-colors">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-sm">{selectedKlant.bedrijfsnaam[0]?.toUpperCase()}</span>
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{selectedKlant.bedrijfsnaam}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{contactpersoon ? `t.a.v. ${contactpersoon}` : 'Geen contactpersoon'}</p>
                              </div>
                              {klantPanelOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                            </button>

                            {klantPanelOpen && (
                              <div className="p-4 space-y-3">
                                <div className="text-xs text-foreground space-y-0.5">
                                  {selectedKlant.telefoon && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" />{selectedKlant.telefoon}</p>}
                                  {selectedKlant.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground" />{selectedKlant.email}</p>}
                                  {(selectedKlant.adres || selectedKlant.stad) && (
                                    <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground" />{[selectedKlant.adres, selectedKlant.postcode, selectedKlant.stad].filter(Boolean).join(', ')}</p>
                                  )}
                                </div>

                                {selectedKlant.contactpersonen?.length > 0 && (
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Contactpersoon</label>
                                    <Select value={selectedContactId} onValueChange={(val) => handleSelectContact(val)}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecteer..." /></SelectTrigger>
                                      <SelectContent>
                                        {selectedKlant.contactpersonen.map((cp) => (
                                          <SelectItem key={cp.id} value={cp.id}>
                                            <div className="flex items-center gap-1.5"><span>{cp.naam}</span>{cp.is_primair && <span className="text-[9px] text-primary">(primair)</span>}</div>
                                          </SelectItem>
                                        ))}
                                        <SelectItem value="__new__"><span className="text-blue-600">+ Nieuw</span></SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {(selectedKlant.kvk_nummer || selectedKlant.btw_nummer) && (
                                  <div className="text-xs text-foreground space-y-0.5 pt-2 border-t border-border dark:border-border">
                                    {selectedKlant.kvk_nummer && <p>KvK: {selectedKlant.kvk_nummer}</p>}
                                    {selectedKlant.btw_nummer && <p>BTW: {selectedKlant.btw_nummer}</p>}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border dark:border-border">
                                  {selectedKlant.telefoon && <a href={`tel:${selectedKlant.telefoon}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"><Phone className="h-3 w-3" />Bellen</a>}
                                  {selectedKlant.email && <a href={`mailto:${selectedKlant.email}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"><Mail className="h-3 w-3" />Email</a>}
                                  <Link to={`/klanten/${selectedKlant.id}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-background text-foreground/70 border border-border hover:bg-muted transition-colors"><ExternalLink className="h-3 w-3" />Profiel</Link>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border-2 border-dashed border-border dark:border-border p-6 text-center">
                            <Building2 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Geen klant geselecteerd</p>
                            <Button variant="outline" size="sm" className="mt-2 text-xs h-7" onClick={() => setShowKlantSelector(true)}>Klant kiezen</Button>
                          </div>
                        )}
                      </>
                    )}

                    {/* ── FACTUREREN ── */}
                    {sectionId === 'factureren' && (
                      <div className="rounded-xl border border-border dark:border-border bg-card overflow-hidden shadow-sm">
                        {geconverteerdNaarFactuurId ? (
                          <>
                            <div className="bg-[#E8F5EC] dark:bg-[#162018] p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-4 w-4 text-[#4A9960] dark:text-[#6ACA80]" />
                                <p className="text-[10px] uppercase tracking-wider text-[#4A9960]/80 dark:text-[#6ACA80]/80 font-medium">Gefactureerd</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <p className="text-[10px] text-[#4A9960]/60 dark:text-[#6ACA80]/60">Offerte bedrag</p>
                                  <p className="text-sm font-bold text-[#4A9960] dark:text-[#6ACA80]">{formatCurrency(round2(subtotaal + btwBedrag))}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[#4A9960]/40 dark:text-[#6ACA80]/40 flex-shrink-0" />
                                <div className="flex-1 text-right">
                                  <p className="text-[10px] text-[#4A9960]/60 dark:text-[#6ACA80]/60">Factuur</p>
                                  <p className="text-sm font-bold text-[#4A9960] dark:text-[#6ACA80]">{linkedFactuur ? formatCurrency(linkedFactuur.totaal) : '...'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 space-y-2">
                              {linkedFactuur && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">{linkedFactuur.nummer}</span>
                                  </div>
                                  <Badge className={cn('text-[10px]',
                                    linkedFactuur.status === 'betaald' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                    linkedFactuur.status === 'verzonden' && 'bg-blue-100 text-blue-700 border-blue-200',
                                    linkedFactuur.status === 'concept' && 'bg-muted text-foreground/70 border-border',
                                    linkedFactuur.status === 'vervallen' && 'bg-red-100 text-red-700 border-red-200',
                                    linkedFactuur.status === 'gecrediteerd' && 'bg-orange-100 text-orange-700 border-orange-200',
                                  )}>
                                    {linkedFactuur.status.charAt(0).toUpperCase() + linkedFactuur.status.slice(1)}
                                  </Badge>
                                </div>
                              )}
                              {linkedFactuur && linkedFactuur.status !== 'betaald' && linkedFactuur.betaald_bedrag > 0 && (
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Betaald</span>
                                  <span className="font-medium text-emerald-600">{formatCurrency(linkedFactuur.betaald_bedrag)}</span>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-8 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                                onClick={() => navigate(`/facturen/${geconverteerdNaarFactuurId}`)}
                              >
                                <Receipt className="h-3.5 w-3.5" />Bekijk factuur
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Receipt className="h-4 w-4 text-white" />
                                <p className="text-[10px] uppercase tracking-wider text-white/80 font-medium">Klaar om te factureren</p>
                              </div>
                              <p className="text-[10px] text-white/60">Offerte bedrag incl BTW</p>
                              <p className="text-xl font-bold text-white">{formatCurrency(round2(subtotaal + btwBedrag))}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-[10px] text-white/60">{formatCurrency(subtotaal)} excl BTW</p>
                                <p className="text-[10px] text-white/60">+{formatCurrency(btwBedrag)} BTW</p>
                              </div>
                            </div>
                            <div className="p-3">
                              <Button
                                size="sm"
                                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
                                onClick={() => {
                                  const quoteId = editOfferteId || autoSaveIdRef.current
                                  if (!quoteId) return
                                  const params = new URLSearchParams({ offerte_id: quoteId, klant_id: selectedKlantId })
                                  if (offerteTitel) params.set('titel', offerteTitel)
                                  if (selectedProjectId) params.set('project_id', selectedProjectId)
                                  navigate(`/facturen/nieuw?${params.toString()}`)
                                }}
                              >
                                <Receipt className="h-4 w-4" />Factuur aanmaken
                                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ── SAMENVATTING ── */}
                    {sectionId === 'samenvatting' && (
                      <div className="rounded-xl border border-border dark:border-border bg-card overflow-hidden shadow-sm">
                        <div className="bg-mist dark:bg-mist/15 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-foreground/70 font-medium">Totaal incl BTW</p>
                          {isEditingTotaal ? (
                            <div className="mt-1">
                              <div className="flex items-center gap-1">
                                <span className="text-foreground font-bold text-lg">€</span>
                                <input
                                  type="number"
                                  value={gewenstTotaal}
                                  onChange={(e) => setGewenstTotaal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = parseFloat(gewenstTotaal)
                                      if (!isNaN(val) && val > 0) {
                                        const gemBtw = subtotaal > 0 ? btwBedrag / subtotaal : 0.21
                                        const kortingExcl = round2((val / (1 + gemBtw)) - subtotaal)
                                        setAfrondingskorting(kortingExcl)
                                      }
                                      setIsEditingTotaal(false)
                                    }
                                    if (e.key === 'Escape') setIsEditingTotaal(false)
                                  }}
                                  autoFocus
                                  step={0.01}
                                  className="bg-foreground/10 text-foreground font-bold text-lg rounded px-2 py-0.5 w-32 border-0 outline-none placeholder:text-foreground/40"
                                  placeholder={round2(subtotaal + btwBedrag).toFixed(2)}
                                />
                              </div>
                              <p className="text-[9px] text-foreground/50 mt-0.5">Enter = bevestig, Esc = annuleer</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setGewenstTotaal(round2(subtotaal + btwBedrag + ((afrondingskorting + urenCorrectieBedrag) * (1 + (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))).toFixed(2))
                                setIsEditingTotaal(true)
                              }}
                              className="text-xl font-bold text-foreground mt-0.5 hover:underline underline-offset-2 decoration-foreground/40 cursor-pointer text-left"
                              title="Klik om totaal aan te passen"
                            >
                              {formatCurrency(round2(subtotaal + btwBedrag + ((afrondingskorting + urenCorrectieBedrag) * (1 + (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))))}
                            </button>
                          )}
                          {afrondingskorting !== 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-white/60">Korting: {formatCurrency(afrondingskorting)} excl BTW</p>
                              <button onClick={() => setAfrondingskorting(0)} className="text-[9px] text-white/50 hover:text-white underline">Herstel</button>
                            </div>
                          )}
                          {urenCorrectieBedrag !== 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-white/60">Uren correctie: {urenCorrectieBedrag > 0 ? '+' : ''}{formatCurrency(urenCorrectieBedrag)} excl BTW</p>
                              <button onClick={() => setUrenCorrectie({})} className="text-[9px] text-white/50 hover:text-white underline">Herstel</button>
                            </div>
                          )}
                          {optionelSubtotaal > 0 && (
                            <p className="text-[10px] text-white/60 mt-1">+ {formatCurrency(round2(optionelSubtotaal + optionelBtw))} aan opties</p>
                          )}
                        </div>

                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-background/80 dark:bg-foreground/80/50 p-2.5">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Subtotaal</p>
                              <p className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(round2(subtotaal + afrondingskorting + urenCorrectieBedrag))}</p>
                            </div>
                            <div className="rounded-lg bg-background/80 dark:bg-foreground/80/50 p-2.5">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">BTW</p>
                              <p className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(round2(btwBedrag + (afrondingskorting + urenCorrectieBedrag) * (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))}</p>
                            </div>
                          </div>
                          {afrondingskorting !== 0 && (
                            <div className="rounded-lg bg-amber-50/80 dark:bg-amber-900/20 p-2.5 border border-amber-200/50 dark:border-amber-800/30">
                              <p className="text-[9px] uppercase tracking-wider text-amber-600 font-medium">Afrondingskorting</p>
                              <p className="text-sm font-semibold text-amber-700 mt-0.5">{formatCurrency(afrondingskorting)}</p>
                            </div>
                          )}

                          <Separator className="opacity-50" />

                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Inkoop / Verkoop</p>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-red-400" /><span className="text-xs text-muted-foreground">Inkoop</span></div>
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400">{totaalInkoop > 0 ? formatCurrency(totaalInkoop) : '—'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-green-400" /><span className="text-xs text-muted-foreground">Verkoop</span></div>
                                <span className="text-xs font-semibold text-foreground">{formatCurrency(round2(subtotaal + afrondingskorting + urenCorrectieBedrag))}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs text-muted-foreground">Winst</span></div>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{totaalInkoop > 0 ? formatCurrency(winstExBtw) : '—'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Marge</p>
                            <div className={cn('rounded-lg p-3', margeColor.bg)}>
                              <div className="flex items-center justify-between">
                                <Percent className={cn('h-4 w-4', margeColor.text)} />
                                <span className={cn('text-lg font-bold', margeColor.text)}>{totaalInkoop > 0 ? `${margePercentage.toFixed(1)}%` : '—'}</span>
                              </div>
                              {totaalInkoop > 0 && (
                                <div className="mt-2 h-1.5 rounded-full bg-secondary dark:bg-foreground/70">
                                  <div className={cn('h-full rounded-full transition-all', margeColor.bar)} style={{ width: `${Math.min(100, Math.max(0, margePercentage))}%` }} />
                                </div>
                              )}
                            </div>
                          </div>

                          {itemMarges.some(m => m.hasCalc) && (
                            <>
                              <Separator className="opacity-50" />
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Per item</p>
                                <div className="space-y-1.5">
                                  {itemMarges.map((m, idx) => {
                                    if (!m.hasCalc) return null
                                    const c = getMargeColorSidebar(m.pct)
                                    return (
                                      <div key={idx} className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{m.beschrijving || `Item ${idx + 1}`}</span>
                                        <span className={cn('text-xs font-semibold', c.text)}>{m.pct.toFixed(1)}%</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </>
                          )}

                          {(totaalUren > 0 || effectieveTotaalUren > 0 || materiaalKosten > 0) && (
                            <>
                              <Separator className="opacity-50" />
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{materiaalKosten > 0 ? 'Uren & Materiaal' : 'Uren'}</p>
                                <div className="space-y-1.5">
                                  {urenVelden.map((veld) => {
                                    const basisUren = urenPerVeld[veld] || 0
                                    const correctie = urenCorrectie[veld] || 0
                                    const effectief = basisUren + correctie
                                    const tarief = tariefPerVeld[veld] || 0
                                    if (effectief <= 0 && basisUren <= 0) return null
                                    return (
                                      <div key={veld} className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <Clock className="h-3.5 w-3.5 text-purple-500" />
                                          <span className="text-xs text-muted-foreground">{veld}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {tarief > 0 && (
                                            <button
                                              onClick={() => setUrenCorrectie(prev => ({ ...prev, [veld]: (prev[veld] || 0) - 1 }))}
                                              disabled={effectief <= 0}
                                              className="h-5 w-5 rounded flex items-center justify-center bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/60 text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                              title={`-1 uur ${veld} (${formatCurrency(tarief)}/u)`}
                                            >
                                              <Minus className="h-3 w-3" />
                                            </button>
                                          )}
                                          <span className={cn('text-xs font-semibold min-w-[3rem] text-right', correctie !== 0 ? 'text-purple-700 dark:text-purple-400' : 'text-purple-600')}>
                                            {effectief} uur
                                          </span>
                                          {tarief > 0 && (
                                            <button
                                              onClick={() => setUrenCorrectie(prev => ({ ...prev, [veld]: (prev[veld] || 0) + 1 }))}
                                              className="h-5 w-5 rounded flex items-center justify-center bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/60 text-purple-600 transition-colors"
                                              title={`+1 uur ${veld} (${formatCurrency(tarief)}/u)`}
                                            >
                                              <Plus className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {effectieveTotaalUren > 0 && (
                                    <div className="flex items-center justify-between pt-1 border-t border-border dark:border-border">
                                      <div className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-amber-500" /><span className="text-xs font-medium text-foreground">Totaal uren</span></div>
                                      <span className="text-xs font-bold text-amber-600">{effectieveTotaalUren} uur</span>
                                    </div>
                                  )}
                                  {urenCorrectieBedrag !== 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground">Uren correctie</span>
                                      <span className={cn('text-[10px] font-medium', urenCorrectieBedrag > 0 ? 'text-green-600' : 'text-red-500')}>
                                        {urenCorrectieBedrag > 0 ? '+' : ''}{formatCurrency(urenCorrectieBedrag)}
                                      </span>
                                    </div>
                                  )}
                                  {materiaalKosten > 0 && (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5 text-blue-500" /><span className="text-xs text-muted-foreground">Materiaal</span></div>
                                      <span className="text-xs font-semibold text-blue-600">{formatCurrency(materiaalKosten)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          <Separator className="opacity-50" />
                          <div className="flex flex-wrap gap-1.5">
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleVerstuurOfferte}>
                              <Send className="h-3 w-3" />Verstuur
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleDownloadPdf}>
                              <Download className="h-3 w-3" />PDF
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => saveOfferte('concept')} disabled={isSaving}>
                              <Save className="h-3 w-3" />{isSaving ? '...' : 'Opslaan'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── INKOOPOFFERTES ── */}
                    {sectionId === 'inkoop' && (
                      <div className="rounded-xl border border-border dark:border-border bg-card overflow-hidden shadow-sm">
                        <button
                          onClick={() => setInkoopPaneelOpen(!inkoopPaneelOpen)}
                          className="w-full flex items-center gap-2 px-4 py-3 bg-background/80 dark:bg-foreground/80/50 border-b border-border dark:border-border hover:bg-muted dark:hover:bg-foreground/80 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-foreground">Inkoopoffertes</p>
                            <p className="text-[11px] text-muted-foreground">Leveranciersprijzen</p>
                          </div>
                          {inkoopPaneelOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        </button>
                        {inkoopPaneelOpen && (
                          <div className="p-4">
                            <InkoopOffertePaneel
                              userId={user!.id}
                              offerteId={editOfferteId || autoSaveIdRef.current || undefined}
                              onRegelToevoegen={handleInkoopRegelToevoegen}
                              onRegelAlsPrijsvariant={handleInkoopRegelAlsPrijsvariant}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>{/* end RIGHT SIDEBAR */}
      </div>
    </div>
  )
}
