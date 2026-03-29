import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom'
import { BackButton } from '@/components/shared/BackButton'
import { useTabDirtyState } from '@/hooks/useTabDirtyState'
import { useEmailCompose } from '@/hooks/useEmailCompose'
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
  FolderPlus,
  FolderOpen,
  Bold,
  Italic,
  Underline,
  List,
  Link2,
} from 'lucide-react'
import { getKlanten, getProjecten, getOffertes, createOfferte, createOfferteItem, updateKlant, createKlant, getOfferte, getOfferteItems, updateOfferte, deleteOfferteItem, getOfferteVersies, createOfferteVersie, getFactuur, createPortaal, createPortaalItem, getPortaalItems, createProject, syncOfferteItems, getRecentOfferteItemSuggesties, getNextOfferteNummer, OfferteConflictError } from '@/services/supabaseService'
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
import { KlantStatusWarning } from '@/components/shared/KlantStatusWarning'
import { safeSetItem } from '@/utils/localStorageUtils'
import { useQuoteClipboard } from '@/hooks/useQuoteClipboard'
import { useQuoteVersioning } from '@/hooks/useQuoteVersioning'
import { useContactManagement } from '@/hooks/useContactManagement'

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
  const { settings, offertePrefix, offerteGeldigheidDagen, standaardBtw, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur, logoUrl, profile, offerteToonM2, emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte } = useAppSettings()
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
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [projectNaam, setProjectNaam] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [klantSearch, setKlantSearch] = useState('')
  const [showKlantResults, setShowKlantResults] = useState(false)
  const [showNieuwBedrijf, setShowNieuwBedrijf] = useState(false)
  const [showNbUitgebreid, setShowNbUitgebreid] = useState(false)
  const [nbData, setNbData] = useState({ bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: '', adres: '', postcode: '', stad: '', website: '', kvk_nummer: '', btw_nummer: '' })
  const [nbCreating, setNbCreating] = useState(false)
  const klantWrapperRef = useRef<HTMLDivElement>(null)
  const [offerteTitel, setOfferteTitel] = useState(paramTitel)
  const [itemCount, setItemCount] = useState(1)
  const [contactpersoon, setContactpersoon] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const contact = useContactManagement({
    selectedKlant,
    setKlanten,
    setSelectedContactId,
    setContactpersoon,
  })
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

  // ── FIX 12: Versie tracking (extracted to hook) ──
  const versioning = useQuoteVersioning({
    userId: user?.id,
    quoteId: editOfferteId || autoSaveIdRef.current,
    performAutoSave: () => performAutoSaveRef.current(),
    snapshotData: { offerteTitel, items, notities, voorwaarden, introTekst, outroTekst, geldigTot },
    restoreSnapshot: (snapshot) => {
      setOfferteTitel(snapshot.offerteTitel)
      setItems(snapshot.items)
      setNotities(snapshot.notities)
      setVoorwaarden(snapshot.voorwaarden)
      setIntroTekst(snapshot.introTekst)
      setOutroTekst(snapshot.outroTekst)
      setGeldigTot(snapshot.geldigTot)
    },
  })

  // ── Autosave state ──
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveIdRef = useRef<string | null>(null) // tracks created offerte id for new quotes
  const hasUnsavedChangesRef = useRef(false)
  const performAutoSaveRef = useRef<() => Promise<void>>(async () => {})
  const saveLockRef = useRef(false) // prevents race between autosave and manual save
  const lastKnownUpdatedAtRef = useRef<string | null>(null) // optimistic locking: tracks server updated_at

  // ── Computed ──
  const selectedKlant = klanten.find((k) => k.id === selectedKlantId)
  const selectedProject = projecten.find((p) => p.id === selectedProjectId)
  const klantProjecten = useMemo(() =>
    projecten.filter((p) => p.klant_id === selectedKlantId),
    [projecten, selectedKlantId]
  )

  const filteredKlanten = useMemo(() => {
    const list = klantSearch
      ? klanten.filter((k) => {
          const s = klantSearch.toLowerCase()
          return k.bedrijfsnaam.toLowerCase().includes(s) || k.contactpersoon.toLowerCase().includes(s) || k.email.toLowerCase().includes(s)
        })
      : klanten
    return list.slice(0, 8)
  }, [klantSearch, klanten])

  // Close klant dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (klantWrapperRef.current && !klantWrapperRef.current.contains(e.target as Node)) {
        setShowKlantResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleCreateNieuwBedrijf() {
    if (!nbData.bedrijfsnaam.trim()) return
    setNbCreating(true)
    try {
      const cpArray = nbData.contactpersoon.trim() ? [{
        id: crypto.randomUUID(), naam: nbData.contactpersoon.trim(), functie: '', email: nbData.email.trim(), telefoon: nbData.telefoon.trim(), is_primair: true,
      }] : []
      const nieuw = await createKlant({
        bedrijfsnaam: nbData.bedrijfsnaam.trim(), contactpersoon: nbData.contactpersoon.trim(), email: nbData.email.trim(), telefoon: nbData.telefoon.trim(),
        adres: nbData.adres.trim(), postcode: nbData.postcode.trim(), stad: nbData.stad.trim(), land: 'Nederland',
        website: nbData.website.trim(), kvk_nummer: nbData.kvk_nummer.trim(), btw_nummer: nbData.btw_nummer.trim(),
        status: 'actief', tags: [], notities: '', contactpersonen: cpArray, user_id: user?.id || '',
      } as any)
      const updated = await getKlanten(); setKlanten(updated)
      setSelectedKlantId(nieuw.id); setKlantSearch('')
      setNbData({ bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: '', adres: '', postcode: '', stad: '', website: '', kvk_nummer: '', btw_nummer: '' })
      setShowNieuwBedrijf(false); setShowKlantResults(false); setShowNbUitgebreid(false)
      toast.success(`Bedrijf "${nieuw.bedrijfsnaam}" aangemaakt`)
    } catch (err) { logger.error('Fout bij aanmaken bedrijf:', err); toast.error('Fout bij aanmaken bedrijf') }
    finally { setNbCreating(false) }
  }

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
    Promise.all([
      getKlanten(),
      getProjecten(),
      !editOfferteId ? getNextOfferteNummer(offertePrefix).catch(() => null) : Promise.resolve(null),
    ])
      .then(([klantenData, projectenData, nummer]) => {
        if (!cancelled) {
          setKlanten(klantenData)
          setProjecten(projectenData)
          if (nummer) setOfferteNummer(nummer)
        }
      })
      .catch((err) => {
        logger.error('Failed to fetch data:', err)
        if (!cancelled) toast.error('Kon data niet laden')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── Load suggesties voor item omschrijvingen (single query) ──
  useEffect(() => {
    let cancelled = false
    getRecentOfferteItemSuggesties()
      .then((suggesties) => {
        if (!cancelled) setOmschrijvingSuggesties(suggesties)
      })
      .catch(() => {
        // Silent fail — suggesties zijn optioneel
      })
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
        if (offerte.versie) versioning.setVersieNummer(offerte.versie)
        // FIX 16: Load afrondingskorting
        if (offerte.afrondingskorting_excl_btw) setAfrondingskorting(offerte.afrondingskorting_excl_btw)
        // Load uren correctie
        if (offerte.uren_correctie) setUrenCorrectie(offerte.uren_correctie)
        // Track status for factureren workflow
        setOfferteStatus(offerte.status)
        // Optimistic locking: track server timestamp
        lastKnownUpdatedAtRef.current = offerte.updated_at
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
            versioning.setVersieHistorie(versies.map(v => ({ id: v.id, versie_nummer: v.versie_nummer, notitie: v.notitie, created_at: v.created_at })))
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
  const clipboard = useQuoteClipboard(items, setItems)

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
    // Geen nieuwe offerte aanmaken zonder nummer — voorkom lege nummers in DB
    const currentId = editOfferteId || autoSaveIdRef.current
    if (!currentId && !offerteNummer) return
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
        // Update existing (met optimistic locking) — geen status meesturen om pipeline wijzigingen niet te overschrijven
        const saved = await updateOfferte(currentId, {
          klant_id: selectedKlantId,
          klant_naam: klant?.bedrijfsnaam,
          ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
          ...(selectedContactId ? { contactpersoon_id: selectedContactId } : {}),
          titel: offerteTitel,
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
          versie: versioning.versieNummer,
        }, lastKnownUpdatedAtRef.current || undefined)
        lastKnownUpdatedAtRef.current = saved.updated_at

        // Sync items via batch upsert (geen delete-all/recreate-all)
        await syncOfferteItems(currentId, items as any, user.id)
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
          versie: versioning.versieNummer,
        })
        autoSaveIdRef.current = newOfferte.id
        lastKnownUpdatedAtRef.current = newOfferte.updated_at

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
      if (err instanceof OfferteConflictError) {
        setAutoSaveStatus('idle')
        toast.error('Deze offerte is door iemand anders gewijzigd. Herlaad de pagina.', {
          duration: 10000,
          action: { label: 'Herlaad', onClick: () => window.location.reload() },
        })
        return // Stop autosave loop bij conflict
      }
      logger.error('Autosave failed:', err)
      setAutoSaveStatus('idle')
    } finally {
      saveLockRef.current = false
    }
  }, [user?.id, selectedKlantId, selectedProjectId, selectedContactId, offerteTitel, items, geldigTot, notities, voorwaarden, introTekst, outroTekst, editOfferteId, offerteNummer, isSaving, klanten, afrondingskorting, versioning.versieNummer])

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
  }, [items, offerteTitel, notities, voorwaarden, introTekst, outroTekst, geldigTot, selectedKlantId, selectedProjectId, selectedContactId, showKlantSelector, afrondingskorting, urenCorrectie])

  // Save on unmount (navigating away) — fire-and-forget
  useEffect(() => {
    return () => {
      if (hasUnsavedChangesRef.current) {
        performAutoSaveRef.current()
      }
    }
  }, [])



  // ── FIX 11: Dupliceer offerte ──
  const [isDuplicating, setIsDuplicating] = useState(false)
  const handleDupliceerOfferte = async () => {
    if (!user?.id || !selectedKlantId) {
      toast.error('Kan niet dupliceren zonder klant')
      return
    }
    setIsDuplicating(true)
    try {
      const nieuweNummer = await getNextOfferteNummer(offertePrefix)
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
        const saved = await updateOfferte(existingId, {
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
          versie: versioning.versieNummer,
        }, lastKnownUpdatedAtRef.current || undefined)
        lastKnownUpdatedAtRef.current = saved.updated_at
        savedOfferteId = existingId

        // Sync items via batch upsert
        await syncOfferteItems(existingId, items as any, user.id)
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
          versie: versioning.versieNummer,
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
          // Bepaal bekijk-URL via portaal (nieuw) of publiek_token (fallback)
          const savedOfferte = await getOfferte(savedOfferteId).catch(() => null)
          let bekijkUrl: string | undefined

          if (selectedProjectId && user?.id) {
            try {
              const portaal = await createPortaal(selectedProjectId, user.id)
              const bestaandeItems = await getPortaalItems(portaal.id)
              if (!bestaandeItems.find(i => i.type === 'offerte' && i.offerte_id === savedOfferteId)) {
                await createPortaalItem({
                  user_id: user.id,
                  project_id: selectedProjectId,
                  portaal_id: portaal.id,
                  type: 'offerte',
                  offerte_id: savedOfferteId,
                  titel: `Offerte ${offerteNummer}`,
                  omschrijving: offerteTitel,
                  label: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(round2(subtotaal + btwBedrag)),
                  status: 'verstuurd',
                  zichtbaar_voor_klant: true,
                  bedrag: round2(subtotaal + btwBedrag),
                  volgorde: 0,
                })
              }
              bekijkUrl = `${window.location.origin}/portaal/${portaal.token}`
            } catch (err) {
              logger.error('Portaal aanmaken mislukt, fallback naar publiek_token:', err)
            }
          }
          if (!bekijkUrl && savedOfferte?.publiek_token) {
            bekijkUrl = `${window.location.origin}/offerte-bekijken/${savedOfferte.publiek_token}`
          }

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
      if (err instanceof OfferteConflictError) {
        toast.error('Deze offerte is door iemand anders gewijzigd. Herlaad de pagina om de laatste versie te zien.', {
          duration: 10000,
          action: { label: 'Herlaad', onClick: () => window.location.reload() },
        })
      } else {
        logger.error('Failed to save offerte:', err)
        toast.error('Kon offerte niet opslaan')
      }
    } finally {
      setIsSaving(false)
      saveLockRef.current = false
    }
  }

  const handleDownloadPdf = async () => {
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
        versie: versioning.versieNummer,
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
      const doc = await generateOffertePDF(offerteData, offerteItems, selectedKlant, {
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

  // ── Email compose (extracted to hook) ──
  const email = useEmailCompose()

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
    // Toon de keuze dialog
    email.setShowVerstuurKeuze(true)
  }

  const handleKeuzeEmail = () => {
    email.setShowVerstuurKeuze(false)
    // Pre-fill email fields
    const selectedCp = selectedContactId
      ? selectedKlant?.contactpersonen?.find(c => c.id === selectedContactId)
      : selectedKlant?.contactpersonen?.[0]
    const contactEmail = selectedCp?.email || selectedKlant?.email || ''
    const klantNaam = selectedCp?.naam || selectedKlant?.contactpersoon || selectedKlant?.bedrijfsnaam || ''
    setEmailTo(contactEmail)
    setEmailSubject(`Offerte ${offerteNummer} - ${offerteTitel}`)
    const signature = emailHandtekening ? `\n\n${emailHandtekening}` : `\n\nMet vriendelijke groet,\n${bedrijfsnaam || ''}`
    setEmailBody(
      introTekst
        ? introTekst + signature
        : `Beste ${klantNaam},\n\nHierbij ontvangt u onze offerte ${offerteNummer} voor "${offerteTitel}".\n\nHet totaalbedrag van deze offerte is ${formatCurrency(round2(subtotaal + btwBedrag))} (incl. BTW).\n\nDe offerte is geldig tot ${geldigTot ? new Date(geldigTot).toLocaleDateString('nl-NL') : '-'}.\n\nMocht u vragen hebben of aanvullende informatie wensen, neem dan gerust contact met ons op.${signature}`
    )
    setEmailBijlagen([{ naam: `${offerteNummer}.pdf`, grootte: 0 }])
    setEmailScheduled(false)
    setEmailScheduleDate('')
    setEmailCc('')
    setEmailBcc('')
    setShowEmailCompose(true)
    setTimeout(() => emailSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleKeuzePortaal = async () => {
    if (!user?.id || !selectedKlant || !selectedProjectId) {
      toast.error('Portaal vereist een gekoppeld project')
      email.setShowVerstuurKeuze(false)
      // Fallback naar email
      handleKeuzeEmail()
      return
    }
    email.setIsSendingPortaal(true)
    try {
      const savedQuoteId = editOfferteId || autoSaveIdRef.current
      if (!savedQuoteId) { toast.error('Offerte nog niet opgeslagen'); return }

      // Maak portaal aan (of hergebruik) + deel offerte
      const portaal = await createPortaal(selectedProjectId, user.id)
      const bestaandeItems = await getPortaalItems(portaal.id)
      if (!bestaandeItems.find(i => i.type === 'offerte' && i.offerte_id === savedQuoteId)) {
        await createPortaalItem({
          user_id: user.id,
          project_id: selectedProjectId,
          portaal_id: portaal.id,
          type: 'offerte',
          offerte_id: savedQuoteId,
          titel: `Offerte ${offerteNummer}`,
          omschrijving: offerteTitel,
          label: formatCurrency(round2(subtotaal + btwBedrag)),
          status: 'verstuurd',
          zichtbaar_voor_klant: true,
          bedrag: round2(subtotaal + btwBedrag),
          volgorde: 0,
        })
      }

      // Update offerte status
      if (savedQuoteId) {
        await updateOfferte(savedQuoteId, {
          status: 'verzonden',
          verstuurd_op: new Date().toISOString(),
          verzendwijze: 'via_portaal',
        })
      }

      // Stuur email notificatie naar klant
      const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`
      const selectedCp = selectedContactId
        ? selectedKlant.contactpersonen?.find(c => c.id === selectedContactId)
        : selectedKlant.contactpersonen?.[0]
      const contactEmail = selectedCp?.email || selectedKlant.email || ''
      const klantNaam = selectedCp?.naam || selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam || ''

      if (contactEmail) {
        try {
          const { buildPortalEmailHtml } = await import('@/utils/emailTemplate')
          const htmlBody = buildPortalEmailHtml({
            heading: `Er staat een nieuwe offerte voor u klaar.`,
            itemTitel: `Offerte ${offerteNummer} — ${offerteTitel}`,
            beschrijving: `Bedrag: ${formatCurrency(round2(subtotaal + btwBedrag))} incl. BTW`,
            ctaLabel: 'Bekijk in portaal →',
            ctaUrl: portaalUrl,
            bedrijfsnaam,
            logoUrl: profile?.logo_url || undefined,
          })
          const plainBody = `Beste ${klantNaam},\n\nEr staat een nieuwe offerte voor u klaar: ${offerteTitel}\nBedrag: ${formatCurrency(round2(subtotaal + btwBedrag))}\n\nBekijk het hier: ${portaalUrl}\n\nMet vriendelijke groet,\n${bedrijfsnaam || ''}`
          await sendEmail(contactEmail, `Nieuwe offerte: ${offerteTitel}`, plainBody, { html: htmlBody })
          toast.success(`Offerte gedeeld via portaal · Notificatie verstuurd naar ${contactEmail}`)
        } catch (err) {
          logger.error('Email notificatie mislukt:', err)
          toast.success('Offerte gedeeld via portaal (email notificatie mislukt)')
        }
      } else {
        toast.success('Offerte gedeeld via portaal')
      }

      email.setShowVerstuurKeuze(false)
    } catch (err) {
      logger.error('Portaal delen mislukt:', err)
      toast.error('Kon offerte niet delen via portaal')
    } finally {
      email.setIsSendingPortaal(false)
    }
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

      // Bepaal bekijk-URL via portaal (nieuw) of publiek_token (fallback)
      const savedQuoteId = editOfferteId || autoSaveIdRef.current
      const savedOfferte = savedQuoteId ? await getOfferte(savedQuoteId).catch(() => null) : null
      let bekijkUrl: string | undefined

      if (selectedProjectId && user?.id && savedQuoteId) {
        try {
          const portaal = await createPortaal(selectedProjectId, user.id)
          // Voorkom dubbele portaal_items voor dezelfde offerte
          const bestaandeItems = await getPortaalItems(portaal.id)
          if (!bestaandeItems.find(i => i.type === 'offerte' && i.offerte_id === savedQuoteId)) {
            await createPortaalItem({
              user_id: user.id,
              project_id: selectedProjectId,
              portaal_id: portaal.id,
              type: 'offerte',
              offerte_id: savedQuoteId,
              titel: `Offerte ${offerteNummer}`,
              omschrijving: offerteTitel,
              label: formatCurrency(round2(subtotaal + btwBedrag)),
              status: 'verstuurd',
              zichtbaar_voor_klant: true,
              bedrag: round2(subtotaal + btwBedrag),
              volgorde: 0,
            })
          }
          bekijkUrl = `${window.location.origin}/portaal/${portaal.token}`
        } catch (err) {
          logger.error('Portaal aanmaken mislukt, fallback naar publieke link:', err)
        }
      }

      // Fallback: gebruik oude publiek_token link
      if (!bekijkUrl && savedOfferte?.publiek_token) {
        bekijkUrl = `${window.location.origin}/offerte-bekijken/${savedOfferte.publiek_token}`
      }

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
        handtekeningAfbeelding: handtekeningAfbeelding || undefined,
        handtekeningAfbeeldingGrootte: handtekeningAfbeeldingGrootte || undefined,
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
          const doc = await generateOffertePDF(offerteData, pdfItems, selectedKlant, {
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
          verzendwijze: 'via_email_pdf',
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
      <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 min-h-full" style={{ backgroundColor: '#F8F7F5' }}>
        <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-12 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              className="h-10 w-10 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB' }}
              onClick={() => {
                const from = (location.state as { from?: string })?.from
                navigate(from || '/offertes')
              }}
            >
              <ArrowLeft className="h-4 w-4" style={{ color: '#6B6B66' }} />
            </button>
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#F15025' }}>
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1A1A1A' }}>Nieuwe Offerte</h1>
              <p className="text-[13px]" style={{ color: '#6B6B66' }}>Selecteer een klant en vul de details in</p>
            </div>
          </div>

        <div className="space-y-4">
          {/* Step 1: Klant + Contactpersoon — merged */}
          <div className="rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB' }}>
            <div className="h-[3px] rounded-t-xl" style={{ background: 'linear-gradient(90deg, #F15025, #F1502560)' }} />
            <div className="flex items-center gap-3 px-5 pt-4 pb-1">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg text-white text-[11px] font-bold" style={{ backgroundColor: '#F15025' }}>1</div>
              <div>
                <span className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>Klant & contactpersoon</span>
                <p className="text-[11px]" style={{ color: '#9B9B95' }}>Wie is de opdrachtgever?</p>
              </div>
            </div>
            <div className="px-5 pb-5 pt-3 space-y-3">
              <div className="space-y-2" ref={klantWrapperRef}>
                {!selectedKlant && (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9B9B95' }} />
                      <Input value={klantSearch} onChange={(e) => { setKlantSearch(e.target.value); setShowKlantResults(true); setShowNieuwBedrijf(false) }} onFocus={() => setShowKlantResults(true)} placeholder="Zoek op bedrijfsnaam, contactpersoon of email..." className="pl-10 h-10 rounded-lg text-[13px]" style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }} />
                    </div>
                    {showKlantResults && !showNieuwBedrijf && (
                      <div className="absolute z-50 w-full mt-1 rounded-lg border bg-[#FEFDFB] shadow-lg max-h-[320px] overflow-y-auto" style={{ border: '1px solid #EBEBEB' }}>
                        <button className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-[#1A535C] hover:bg-[#E2F0F0]/50 transition-colors border-b" style={{ borderColor: '#EBEBEB' }} onClick={() => { setShowNieuwBedrijf(true); setNbData((p) => ({ ...p, bedrijfsnaam: klantSearch })) }}>
                          <Plus className="w-4 h-4" /><span className="text-[13px] font-medium">Nieuw bedrijf toevoegen{klantSearch.trim() ? `: "${klantSearch.trim()}"` : ''}</span>
                        </button>
                        {filteredKlanten.length === 0 ? (
                          <div className="py-4 text-center text-[13px]" style={{ color: '#9B9B95' }}>Geen klanten gevonden</div>
                        ) : filteredKlanten.map((klant) => (
                          <button key={klant.id} className="w-full text-left px-3 py-2 hover:bg-[#F4F2EE] transition-colors border-b last:border-0" style={{ borderColor: '#EBEBEB' }} onClick={() => { setSelectedKlantId(klant.id); setKlantSearch(''); setShowKlantResults(false) }}>
                            <p className="text-[13px] font-medium" style={{ color: '#1A1A1A' }}>{klant.bedrijfsnaam}</p>
                            <div className="flex items-center gap-2">
                              {klant.contactpersoon && <span className="text-[11px]" style={{ color: '#6B6B66' }}>{klant.contactpersoon}</span>}
                              {klant.stad && <span className="text-[11px]" style={{ color: '#9B9B95' }}>{klant.stad}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showNieuwBedrijf && (
                      <div className="mt-2 rounded-lg p-4 space-y-3" style={{ border: '1px solid #EBEBEB', backgroundColor: '#F8F7F5' }}>
                        <div className="flex items-center gap-2 mb-1"><Building2 className="h-4 w-4" style={{ color: '#1A535C' }} /><span className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>Nieuw bedrijf</span></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input value={nbData.bedrijfsnaam} onChange={(e) => setNbData({ ...nbData, bedrijfsnaam: e.target.value })} placeholder="Bedrijfsnaam *" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} autoFocus />
                          <Input value={nbData.stad} onChange={(e) => setNbData({ ...nbData, stad: e.target.value })} placeholder="Stad" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                        </div>
                        <button onClick={() => setShowNbUitgebreid(!showNbUitgebreid)} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#9B9B95' }}>
                          {showNbUitgebreid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}{showNbUitgebreid ? 'Minder gegevens' : 'Meer gegevens (adres, KvK, etc.)'}
                        </button>
                        {showNbUitgebreid && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input value={nbData.contactpersoon} onChange={(e) => setNbData({ ...nbData, contactpersoon: e.target.value })} placeholder="Contactpersoon" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                            <Input value={nbData.email} onChange={(e) => setNbData({ ...nbData, email: e.target.value })} placeholder="E-mail" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                            <Input value={nbData.telefoon} onChange={(e) => setNbData({ ...nbData, telefoon: e.target.value })} placeholder="Telefoon" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                            <Input value={nbData.adres} onChange={(e) => setNbData({ ...nbData, adres: e.target.value })} placeholder="Adres" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                            <Input value={nbData.postcode} onChange={(e) => setNbData({ ...nbData, postcode: e.target.value })} placeholder="Postcode" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                            <Input value={nbData.website} onChange={(e) => setNbData({ ...nbData, website: e.target.value })} placeholder="Website" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                            <Input value={nbData.kvk_nummer} onChange={(e) => setNbData({ ...nbData, kvk_nummer: e.target.value })} placeholder="KvK-nummer" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                            <Input value={nbData.btw_nummer} onChange={(e) => setNbData({ ...nbData, btw_nummer: e.target.value })} placeholder="BTW-nummer" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={handleCreateNieuwBedrijf} disabled={!nbData.bedrijfsnaam.trim() || nbCreating} className="h-8 px-3 text-[12px] font-semibold rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5" style={{ backgroundColor: '#1A535C' }}><Plus className="h-3.5 w-3.5" />{nbCreating ? 'Aanmaken...' : 'Bedrijf aanmaken'}</button>
                          <button onClick={() => { setShowNieuwBedrijf(false); setShowKlantResults(true) }} className="h-8 px-3 text-[12px] font-medium rounded-lg" style={{ color: '#6B6B66' }}>Annuleren</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedKlant && (
                <div className="rounded-lg p-3" style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-[10px]">{selectedKlant.bedrijfsnaam[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[13px] truncate" style={{ color: '#1A1A1A' }}>{selectedKlant.bedrijfsnaam}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {selectedKlant.email && <span className="flex items-center gap-1 text-[11px]" style={{ color: '#6B6B66' }}><Mail className="h-3 w-3" />{selectedKlant.email}</span>}
                        {selectedKlant.telefoon && <span className="flex items-center gap-1 text-[11px] font-mono" style={{ color: '#6B6B66' }}><Phone className="h-3 w-3" />{selectedKlant.telefoon}</span>}
                      </div>
                    </div>
                    <button className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#F4F2EE]" onClick={() => { setSelectedKlantId(''); setSelectedProjectId(''); setContactpersoon(''); setSelectedContactId('') }}>
                      <X className="h-3.5 w-3.5" style={{ color: '#9B9B95' }} />
                    </button>
                  </div>
                </div>
              )}
              {selectedKlantId && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#9B9B95' }}>Project <span className="text-[11px] font-normal normal-case tracking-normal">(optioneel)</span></Label>
                  {klantProjecten.length > 0 ? (
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="h-10 rounded-lg text-[13px]" style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}><SelectValue placeholder="Koppel aan een project..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geen"><span style={{ color: '#9B9B95' }}>Geen project</span></SelectItem>
                        {klantProjecten.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2"><span className="font-medium">{project.naam}</span><Badge variant="outline" className="text-2xs px-1.5 py-0">{project.status}</Badge></div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : <p className="text-[11px] py-1" style={{ color: '#9B9B95' }}>Geen projecten gevonden voor deze klant</p>}
                </div>
              )}
              {/* Contactpersoon — inline under klant */}
              {selectedKlant && (
                <div className="pt-2 border-t space-y-2" style={{ borderColor: '#EBEBEB' }}>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: '#9B9B95' }}>Contactpersoon</Label>
                  {(selectedKlant.contactpersonen?.length > 0 || selectedKlant.contactpersoon) && (
                    <div className="space-y-1.5">
                      {selectedKlant.contactpersonen?.map((cp) => (
                        <button key={cp.id} onClick={() => contact.handleSelectContact(cp.id)} className={cn('w-full text-left rounded-lg p-2.5 transition-all')} style={{ border: selectedContactId === cp.id ? '1px solid #1A535C' : '0.5px solid #EBEBEB', backgroundColor: selectedContactId === cp.id ? '#E2F0F0' : 'transparent' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ backgroundColor: selectedContactId === cp.id ? '#1A535C' : '#EBEBEB', color: selectedContactId === cp.id ? '#FFFFFF' : '#6B6B66' }}>{cp.naam[0]?.toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium truncate" style={{ color: '#1A1A1A' }}>{cp.naam}</p>
                              {cp.functie && <p className="text-[11px] truncate" style={{ color: '#9B9B95' }}>{cp.functie}</p>}
                            </div>
                            {cp.is_primair && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>primair</span>}
                          </div>
                        </button>
                      ))}
                      {(!selectedKlant.contactpersonen || selectedKlant.contactpersonen.length === 0) && selectedKlant.contactpersoon && (
                        <div className="rounded-lg p-2.5" style={{ border: '1px solid #1A535C', backgroundColor: '#E2F0F0' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ backgroundColor: '#1A535C', color: '#FFFFFF' }}>{selectedKlant.contactpersoon[0]?.toUpperCase()}</div>
                            <p className="text-[13px] font-medium" style={{ color: '#1A1A1A' }}>{selectedKlant.contactpersoon}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!contact.showNewContact ? (
                    <button onClick={() => contact.setShowNewContact(true)} className="w-full flex items-center gap-2 text-[11px] py-2 px-3 rounded-lg transition-colors hover:bg-[#F8F7F5]" style={{ border: '1px dashed #EBEBEB', color: '#9B9B95' }}>
                      <UserPlus className="h-3.5 w-3.5" />Nieuwe contactpersoon toevoegen
                    </button>
                  ) : (
                    <div className="rounded-lg p-3.5 space-y-2" style={{ border: '1px solid #EBEBEB', backgroundColor: '#F8F7F5' }}>
                      <p className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: '#1A1A1A' }}><UserPlus className="h-3.5 w-3.5" style={{ color: '#1A535C' }} />Nieuwe contactpersoon</p>
                      <Input value={contact.newContactNaam} onChange={(e) => contact.setNewContactNaam(e.target.value)} placeholder="Naam *" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} autoFocus />
                      <Input value={contact.newContactFunctie} onChange={(e) => contact.setNewContactFunctie(e.target.value)} placeholder="Functie" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                      <Input value={contact.newContactEmail} onChange={(e) => contact.setNewContactEmail(e.target.value)} placeholder="E-mailadres" type="email" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                      <Input value={contact.newContactTelefoon} onChange={(e) => contact.setNewContactTelefoon(e.target.value)} placeholder="Telefoonnummer" className="h-9 text-[13px] rounded-lg" style={{ border: '1px solid #EBEBEB' }} />
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={contact.handleAddContact} disabled={!contact.newContactNaam.trim()} className="h-7 px-3 text-[11px] font-semibold rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1" style={{ backgroundColor: '#1A535C' }}><Plus className="h-3 w-3" />Toevoegen</button>
                        <button onClick={() => { contact.setShowNewContact(false); contact.setNewContactNaam(''); contact.setNewContactFunctie(''); contact.setNewContactEmail(''); contact.setNewContactTelefoon('') }} className="h-7 px-3 text-[11px] font-medium rounded-lg" style={{ color: '#6B6B66' }}>Annuleren</button>
                      </div>
                    </div>
                  )}
                  {!contact.showNewContact && (
                    <div className="space-y-1 pt-2" style={{ borderTop: '0.5px solid #EBEBEB' }}>
                      <Label className="text-[11px]" style={{ color: '#9B9B95' }}>Of typ een naam</Label>
                      <Input value={contactpersoon} onChange={(e) => { setContactpersoon(e.target.value); setSelectedContactId('') }} placeholder="Contactpersoon naam..." className="h-9 text-[13px] rounded-lg" style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Offerte details + items — merged */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB' }}>
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #3A6B8C, #3A6B8C60)' }} />
            <div className="flex items-center gap-3 px-5 pt-4 pb-1">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg text-white text-[11px] font-bold" style={{ backgroundColor: '#3A6B8C' }}>2</div>
              <div>
                <span className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>Offerte details</span>
                <p className="text-[11px]" style={{ color: '#9B9B95' }}>Titel, nummer en geldigheid</p>
              </div>
            </div>
            <div className="px-5 pb-5 pt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="offerte-titel" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9B9B95' }}>Titel</Label>
                <Input id="offerte-titel" value={offerteTitel} onChange={(e) => setOfferteTitel(e.target.value)} placeholder="bijv. Gevelreclame nieuwe locatie, Autobelettering wagenpark..." className="text-[14px] h-10 rounded-lg" style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="offerte-nummer" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9B9B95' }}>Nummer</Label>
                  <Input id="offerte-nummer" value={offerteNummer} readOnly className="text-[13px] font-mono h-10 rounded-lg" style={{ backgroundColor: '#EBEBEB', border: '1px solid #EBEBEB', color: '#6B6B66' }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="geldig-tot" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9B9B95' }}>Geldig tot</Label>
                  <Input id="geldig-tot" type="date" value={geldigTot} onChange={(e) => setGeldigTot(e.target.value)} className="text-[13px] font-mono h-10 rounded-lg" style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Start button with inline item count */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9B9B95' }}>Items</span>
              {ITEM_COUNT_OPTIONS.map((count) => (
                <button key={count} onClick={() => setItemCount(count)} className="h-8 w-8 rounded-lg text-[13px] font-bold transition-all" style={{ border: itemCount === count ? '2px solid #1A535C' : '0.5px solid #EBEBEB', backgroundColor: itemCount === count ? '#1A535C' : '#F8F7F5', color: itemCount === count ? '#FFFFFF' : '#1A1A1A' }}>
                  {count}
                </button>
              ))}
            </div>
            <button onClick={handleStartEditing} disabled={!canStartEditing} className="h-10 px-6 text-[14px] font-bold text-white rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-2" style={{ backgroundColor: '#F15025' }}>
              Items toevoegen
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────
  // MAIN LAYOUT: Two columns — Left: scrollable content, Right: sticky sidebar (380px)
  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 min-h-full" style={{ backgroundColor: '#F8F7F5' }}>
    <div className="relative pb-6 px-4 md:px-6 pt-0">
      {/* ──── HEADER BAR ──── */}
      <div className="sticky top-0 z-10 bg-[#F8F7F5]/80 backdrop-blur-sm border-b border-[#EBEBEB] px-6 py-3 mb-6 -mx-4 md:-mx-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Title + meta */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link to="/offertes" className="text-[#9B9B95] hover:text-[#6B6B66] transition-colors flex-shrink-0"><ArrowLeft className="h-4 w-4" /></Link>
              <h1 className="text-xl font-bold text-[#1A1A1A] tracking-[-0.3px] truncate">{isEditMode ? 'Offerte bewerken' : 'Nieuwe offerte'}</h1>
              <span className="text-[13px] font-mono text-[#9B9B95] flex-shrink-0">{offerteNummer}</span>
              {versioning.versieNummer > 1 && (
                <button onClick={() => versioning.setShowVersieHistorie(!versioning.showVersieHistorie)} className="text-[11px] font-mono text-[#6A5A8A] hover:underline flex-shrink-0">v{versioning.versieNummer}</button>
              )}
              {geldigTot && (() => {
                const days = Math.floor((new Date(geldigTot).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                if (days < 0) return <span className="text-xs text-[#C0451A] font-medium flex-shrink-0">Verlopen<span className="text-[#F15025]">.</span></span>
                if (days < 7) return <span className="text-xs text-[#C0451A] flex-shrink-0">Nog {days}d</span>
                return <span className="text-xs text-[#9B9B95] flex-shrink-0">t/m <span className="font-mono">{new Date(geldigTot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span></span>
              })()}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {autoSaveStatus === 'saving' && <span className="flex items-center gap-1.5 text-xs text-[#8A7A4A]"><div className="h-1.5 w-1.5 rounded-full bg-[#8A7A4A] animate-pulse" />Opslaan...</span>}
              {autoSaveStatus === 'saved' && <span className="flex items-center gap-1.5 text-xs text-[#3A7D52]"><Check className="h-3 w-3" />Opgeslagen</span>}
              {!autoSaveStatus && <p className="text-[13px] text-[#9B9B95]">{isEditMode ? selectedKlant?.bedrijfsnaam || '' : 'Selecteer een klant en vul de details in'}</p>}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleDownloadPdf} className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-lg border border-[#EBEBEB] text-[#6B6B66] hover:text-[#1A1A1A] hover:border-[#EBEBEB] hover:bg-[#F8F7F5] transition-colors">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={() => saveOfferte('concept')} disabled={isSaving} className="inline-flex items-center gap-1.5 h-8 px-4 text-[12px] font-medium rounded-lg bg-[#1A535C] text-white hover:bg-[#164850] transition-colors disabled:opacity-50">
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isSaving ? 'Opslaan...' : 'Opslaan'}</span>
            </button>
            {/* Verstuur split button */}
            <div className="relative">
              <button onClick={handleVerstuurOfferte} disabled={isSaving} className="inline-flex items-center gap-1.5 h-9 px-5 text-sm font-semibold rounded-lg bg-[#F15025] text-white hover:bg-[#D94520] transition-colors disabled:opacity-50">
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Verstuur</span>
                <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
              </button>
              {email.showVerstuurKeuze && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => email.setShowVerstuurKeuze(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-[#FFFFFF] rounded-xl border border-[#EBEBEB] shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-hidden">
                    <button
                      onClick={handleKeuzePortaal}
                      disabled={email.isSendingPortaal || !selectedProjectId}
                      className="w-full text-left px-4 py-3 hover:bg-[#F8F7F5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-b border-[#EBEBEB]/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-[#1A535C] flex items-center justify-center flex-shrink-0">
                          <Send className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">Via portaal</p>
                          <p className="text-[11px] text-[#9B9B95] leading-snug">Klant bekijkt online + email notificatie</p>
                        </div>
                      </div>
                      {!selectedProjectId && <p className="text-[10px] text-[#C0451A] mt-1 ml-9">Koppel eerst een project</p>}
                      {email.isSendingPortaal && <p className="text-[10px] text-[#1A535C] mt-1 ml-9 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#1A535C] animate-pulse" />Delen...</p>}
                    </button>
                    <button
                      onClick={handleKeuzeEmail}
                      className="w-full text-left px-4 py-3 hover:bg-[#F8F7F5] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-[#F15025] flex items-center justify-center flex-shrink-0">
                          <Mail className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">Via email</p>
                          <p className="text-[11px] text-[#9B9B95] leading-snug">PDF bijlage + gepersonaliseerde email</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

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
                      <button onClick={() => { handleDupliceerOfferte(); setShowActionsMenu(false) }} disabled={isDuplicating} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-muted flex items-center gap-2 disabled:opacity-50">
                        <Copy className="h-3.5 w-3.5" />{isDuplicating ? 'Dupliceren...' : 'Dupliceer offerte'}
                      </button>
                      <button onClick={() => { versioning.handleNieuweVersie(); setShowActionsMenu(false) }} disabled={versioning.isSavingVersie} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-muted flex items-center gap-2 disabled:opacity-50">
                        <Clock className="h-3.5 w-3.5" />{versioning.isSavingVersie ? 'Opslaan...' : `Nieuwe versie (v${versioning.versieNummer})`}
                      </button>
                      <button onClick={() => { setShowKlantSelector(true); setShowActionsMenu(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-muted flex items-center gap-2">
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

      {/* ──── PROJECT KOPPELING ──── */}
      {!selectedProjectId && selectedKlantId && isEditMode && (
        <div className="mb-4">
          {!showProjectForm ? (
            <button
              type="button"
              onClick={() => { setShowProjectForm(true); setProjectNaam(offerteTitel || '') }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-[#1A535C]/30 text-[#1A535C] hover:bg-[#1A535C]/5 transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Project erbij aanmaken
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-[#1A535C]/30 bg-[#1A535C]/5 px-3 py-2">
              <FolderPlus className="h-3.5 w-3.5 text-[#1A535C] shrink-0" />
              <input
                type="text"
                value={projectNaam}
                onChange={(e) => setProjectNaam(e.target.value)}
                placeholder="Projectnaam"
                className="flex-1 h-8 px-2 py-1 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-[#1A535C]/20 focus:border-[#1A535C]"
                autoFocus
              />
              <button
                type="button"
                onClick={async () => {
                  if (!projectNaam.trim() || !selectedKlantId) return
                  setIsCreatingProject(true)
                  try {
                    const project = await createProject({
                      klant_id: selectedKlantId,
                      naam: projectNaam.trim(),
                      beschrijving: '',
                      budget: 0,
                      status: 'gepland',
                      prioriteit: 'medium',
                      besteed: 0,
                      voortgang: 0,
                      team_leden: [],
                      bron_offerte_id: editOfferteId || undefined,
                      eind_datum: geldigTot || undefined,
                    })
                    setSelectedProjectId(project.id)
                    if (editOfferteId) {
                      await updateOfferte(editOfferteId, { project_id: project.id })
                    }
                    setShowProjectForm(false)
                    toast.success(`Project "${projectNaam.trim()}" aangemaakt en gekoppeld`)
                  } catch (err) {
                    logger.error('Kon project niet aanmaken:', err)
                    toast.error('Kon project niet aanmaken')
                  } finally {
                    setIsCreatingProject(false)
                  }
                }}
                disabled={!projectNaam.trim() || isCreatingProject}
                className="h-8 px-3 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#1A535C' }}
              >
                {isCreatingProject ? 'Aanmaken...' : 'Aanmaken'}
              </button>
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
      {selectedProjectId && selectedProject && isEditMode && (
        <div className="mb-4">
          <Link
            to={`/projecten/${selectedProjectId}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#1A535C] hover:text-[#1A535C]/80 transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Project: {selectedProject.naam}
          </Link>
        </div>
      )}

      {/* ──── VERSIE HISTORIE ──── */}
      {versioning.showVersieHistorie && versioning.versieHistorie.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />Versie historie
                <Badge variant="outline" className="text-2xs">{versioning.versieHistorie.length} versies</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {versioning.versieHistorie.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-border dark:border-border px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">Versie {v.versie_nummer}</span>
                    <span className="text-xs text-muted-foreground ml-2">{new Date(v.created_at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {v.notitie && <p className="text-xs text-muted-foreground mt-0.5">{v.notitie}</p>}
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => versioning.handleHerstelVersie(v.id)}>Herstel</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ──── TWO-COLUMN GRID ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: Scrollable content                                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="space-y-5 min-w-0">
          {/* ── Introductietekst ── */}
          <div className="bg-[#FFFFFF] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Introductietekst <span className="font-normal text-[#9B9B95] normal-case tracking-normal">optioneel</span></h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { label: 'Standaard', tekst: `Beste ${selectedKlant?.contactpersoon || selectedKlant?.bedrijfsnaam || '{klant_naam}'}, hierbij ontvangt u onze offerte voor de door u gevraagde werkzaamheden.` },
                { label: 'Na gesprek', tekst: `Geachte heer/mevrouw ${selectedKlant?.contactpersoon || selectedKlant?.bedrijfsnaam || '{klant_naam}'}, naar aanleiding van ons gesprek sturen wij u hierbij onze offerte.` },
                { label: 'Bedankt', tekst: `Beste ${selectedKlant?.contactpersoon || selectedKlant?.bedrijfsnaam || '{klant_naam}'}, bedankt voor uw aanvraag. Hierbij onze offerte.` },
              ].map((tmpl) => (
                <button key={tmpl.label} onClick={() => setIntroTekst(tmpl.tekst)} className="text-xs px-2.5 py-1 border border-[#EBEBEB] rounded-md hover:bg-[#F8F7F5] text-[#6B6B66] transition-colors">{tmpl.label}</button>
              ))}
            </div>
            <Textarea value={introTekst} onChange={(e) => setIntroTekst(e.target.value)} placeholder="Beste ..., hierbij ontvangt u onze offerte voor..." rows={3} className="resize-y text-sm border-[#EBEBEB] bg-[#F8F7F5] focus:bg-white focus:border-[#1A535C]/30 rounded-lg transition-colors" />
          </div>

          {/* ── Items ── */}
          <div className="bg-[#FFFFFF] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">
                Offerte items <span className="font-mono text-[#9B9B95] font-normal">{items.length}</span>
              </h3>
            </div>
            <div>
              <QuoteItemsTable
                items={items}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onRemoveItem={handleRemoveItem}
                userId={user?.id}
                onUpdateItemWithCalculatie={handleUpdateItemWithCalculatie}
                onUpdateItemWithVariantCalculatie={handleUpdateItemWithVariantCalculatie}
                suggesties={omschrijvingSuggesties}
                onCopyItem={clipboard.handleCopyItem}
                onCopyAllItems={clipboard.handleCopyAllItems}
                clipboardCount={clipboard.clipboardCount}
                onPasteItems={clipboard.handlePasteItems}
                onClearClipboard={clipboard.handleClearClipboard}
                toonM2={offerteToonM2}
                projectId={selectedProjectId || undefined}
                klantId={selectedKlantId || undefined}
                offerteId={editOfferteId || autoSaveIdRef.current || undefined}
              />
            </div>
          </div>

          {/* ── Afsluittekst ── */}
          <div className="bg-[#FFFFFF] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Afsluittekst <span className="font-normal text-[#9B9B95] normal-case tracking-normal">optioneel</span></h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { label: 'Standaard', tekst: 'Wij zien uw reactie graag tegemoet.' },
                { label: 'Met vragen', tekst: 'Mocht u vragen hebben of aanvullende informatie wensen, neem dan gerust contact met ons op.' },
                { label: 'Dank', tekst: 'Wij danken u voor uw vertrouwen en hopen u van dienst te mogen zijn.' },
              ].map((tmpl) => (
                <button key={tmpl.label} onClick={() => setOutroTekst(tmpl.tekst)} className="text-xs px-2.5 py-1 border border-[#EBEBEB] rounded-md hover:bg-[#F8F7F5] text-[#6B6B66] transition-colors">{tmpl.label}</button>
              ))}
            </div>
            <Textarea value={outroTekst} onChange={(e) => setOutroTekst(e.target.value)} placeholder="Wij zien uw reactie graag tegemoet." rows={2} className="resize-y text-sm border-[#EBEBEB] bg-[#F8F7F5] focus:bg-white focus:border-[#1A535C]/30 rounded-lg transition-colors" />
          </div>

          {/* ── Notities & Voorwaarden ── */}
          <div className="bg-[#FFFFFF] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Notities & Voorwaarden</h3>
            </div>
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-wider">Notities</label>
                  <Textarea value={notities} onChange={(e) => setNotities(e.target.value)} placeholder="Interne notities of opmerkingen voor de klant..." rows={4} className="text-sm border-[#EBEBEB] bg-[#F8F7F5] focus:bg-white focus:border-[#1A535C]/30 rounded-lg transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-wider">Voorwaarden</label>
                  <Textarea value={voorwaarden} onChange={(e) => setVoorwaarden(e.target.value)} rows={4} className="text-sm border-[#EBEBEB] bg-[#F8F7F5] focus:bg-white focus:border-[#1A535C]/30 rounded-lg transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* INLINE EMAIL COMPOSE — bottom of left column                   */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div ref={emailSectionRef}>
            {email.showEmailCompose && (
              <div className="bg-[#FFFFFF] rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#EBEBEB]/60">
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">Email versturen</h3>
                  <button onClick={() => setShowEmailCompose(false)} className="text-[#9B9B95] hover:text-[#1A1A1A] transition-colors"><X className="h-4 w-4" /></button>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {/* Email velden */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#9B9B95] w-16 flex-shrink-0">Aan</span>
                      <input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="email@voorbeeld.nl" type="email" className="flex-1 text-sm px-3 py-2 border border-[#EBEBEB] rounded-lg bg-[#F8F7F5] focus:outline-none focus:border-[#1A535C]/40 focus:bg-white transition-colors" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#9B9B95] w-16 flex-shrink-0">CC</span>
                      <input value={emailCc} onChange={(e) => setEmailCc(e.target.value)} placeholder="Optioneel" className="flex-1 text-sm px-3 py-2 border border-[#EBEBEB] rounded-lg bg-[#F8F7F5] focus:outline-none focus:border-[#1A535C]/40 focus:bg-white transition-colors" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#9B9B95] w-16 flex-shrink-0">BCC</span>
                      <input value={emailBcc} onChange={(e) => setEmailBcc(e.target.value)} placeholder="Optioneel" className="flex-1 text-sm px-3 py-2 border border-[#EBEBEB] rounded-lg bg-[#F8F7F5] focus:outline-none focus:border-[#1A535C]/40 focus:bg-white transition-colors" />
                    </div>
                  </div>

                  {/* Onderwerp */}
                  <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Onderwerp..." className="w-full text-sm font-medium px-3 py-2 border border-[#EBEBEB] rounded-lg focus:outline-none focus:border-[#1A535C]/40 transition-colors" />

                  {/* Bericht */}
                  <div className="border border-[#EBEBEB] rounded-lg bg-[#F8F7F5] focus-within:border-[#1A535C]/40 focus-within:bg-white transition-colors overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#EBEBEB]/30">
                      {[
                        { cmd: 'bold', icon: <Bold className="h-3.5 w-3.5" />, title: 'Vet' },
                        { cmd: 'italic', icon: <Italic className="h-3.5 w-3.5" />, title: 'Cursief' },
                        { cmd: 'underline', icon: <Underline className="h-3.5 w-3.5" />, title: 'Onderstreept' },
                        { cmd: 'insertUnorderedList', icon: <List className="h-3.5 w-3.5" />, title: 'Opsomming' },
                        { cmd: 'createLink', icon: <Link2 className="h-3.5 w-3.5" />, title: 'Link' },
                      ].map((btn) => (
                        <button
                          key={btn.cmd}
                          title={btn.title}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            if (btn.cmd === 'createLink') {
                              const url = prompt('URL invoeren:')
                              if (url) document.execCommand('createLink', false, url)
                            } else {
                              document.execCommand(btn.cmd)
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#EBEBEB]/40 text-[#9B9B95] hover:text-[#1A1A1A] transition-colors"
                        >
                          {btn.icon}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={8}
                      className="w-full text-sm px-3 py-3 bg-transparent focus:outline-none resize-y leading-relaxed border-none"
                      placeholder="Schrijf je bericht..."
                    />
                    {handtekeningAfbeelding && (
                      <div className="px-3 pb-3">
                        <img src={handtekeningAfbeelding} alt="" style={{ maxHeight: handtekeningAfbeeldingGrootte || 64, maxWidth: 200, objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>

                  {/* Bijlagen */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {emailBijlagen.map((bijlage, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-[#F8F7F5] rounded-lg text-sm">
                        <FileText className="h-3.5 w-3.5 text-[#C03A18]" />
                        <span className="text-[#1A1A1A] font-mono text-xs">{bijlage.naam}</span>
                        {idx > 0 && <button onClick={() => setEmailBijlagen((prev) => prev.filter((_, i) => i !== idx))} className="text-[#9B9B95] hover:text-[#C03A18] transition-colors"><X className="h-3 w-3" /></button>}
                      </div>
                    ))}
                    <button onClick={handleAddBijlage} className="flex items-center gap-1 px-2 py-1.5 text-xs text-[#1A535C] hover:underline">
                      <Paperclip className="h-3 w-3" />Bijlage
                    </button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf,.doc,.docx" />
                  </div>

                  {/* Inplannen */}
                  <div className="border-t border-[#EBEBEB]/40 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={emailScheduled} onChange={(e) => setEmailScheduled(e.target.checked)} className="h-3.5 w-3.5 rounded border-[#EBEBEB] text-[#1A535C] focus:ring-[#1A535C]/30" />
                      <CalendarClock className="h-3.5 w-3.5 text-[#9B9B95]" />
                      <span className="text-xs text-[#6B6B66]">Inplannen</span>
                    </label>
                    {emailScheduled && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 ml-6">
                        {(() => {
                          const morgen = new Date(); morgen.setDate(morgen.getDate() + 1)
                          const morgenStr = morgen.toISOString().split('T')[0]
                          return [
                            { label: 'Morgen 08:00', datum: morgenStr, tijd: '08:00' },
                            { label: 'Morgen 10:00', datum: morgenStr, tijd: '10:00' },
                            { label: 'Morgen 14:00', datum: morgenStr, tijd: '14:00' },
                          ].map((opt) => (
                            <button key={opt.label} onClick={() => { setEmailScheduleDate(opt.datum); setEmailScheduleTime(opt.tijd) }} className="text-xs px-2.5 py-1 border border-[#EBEBEB] rounded-md hover:bg-[#F8F7F5] text-[#6B6B66] transition-colors">{opt.label}</button>
                          ))
                        })()}
                        <input type="date" value={emailScheduleDate} onChange={(e) => setEmailScheduleDate(e.target.value)} className="text-xs px-2 py-1 border border-[#EBEBEB] rounded-md w-32" />
                        <input type="time" value={emailScheduleTime} onChange={(e) => setEmailScheduleTime(e.target.value)} className="text-xs px-2 py-1 border border-[#EBEBEB] rounded-md w-20" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#EBEBEB]/60 bg-[#F8F7F5]/50">
                  <button onClick={() => setShowEmailCompose(false)} className="text-sm text-[#9B9B95] hover:text-[#6B6B66] transition-colors">Annuleren</button>
                  <button
                    onClick={handleSendEmailInline}
                    disabled={!emailTo.trim() || !emailSubject.trim() || isSendingEmail}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-[#F15025] text-white hover:bg-[#D94520] disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSendingEmail ? 'Verzenden...' : emailScheduled ? 'Inplannen' : 'Verstuur'}
                  </button>
                </div>
              </div>
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
              {/* Render sidebar sections: pinned group (sticky) + unpinned */}
              {(() => {
                const showFactureren = isEditMode && (offerteStatus === 'goedgekeurd' || offerteStatus === 'gefactureerd' || !!geconverteerdNaarFactuurId)
                const isVisible = (id: typeof sidebarLayout.order[number]) => {
                  if (id === 'factureren' && !showFactureren) return false
                  if (id === 'inkoop' && !user?.id) return false
                  return true
                }
                const visibleOrder = sidebarLayout.order.filter(isVisible)
                const pinnedIds = visibleOrder.filter(id => sidebarLayout.pinned.has(id))
                const unpinnedIds = visibleOrder.filter(id => !sidebarLayout.pinned.has(id))

                const renderSection = (sectionId: typeof sidebarLayout.order[number]) => {
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
                      isDragging && 'opacity-40',
                      isDragOver && 'pt-1',
                    )}
                  >
                    {/* Drop indicator */}
                    {isDragOver && !isDragging && (
                      <div className="h-1 bg-primary/50 rounded-full mb-2 mx-4 animate-pulse" />
                    )}

                    {/* Drag handle + pin bar */}
                    <div className={cn(
                      'flex items-center gap-1.5 mb-1 transition-opacity',
                      isPinned
                        ? 'opacity-100'
                        : 'opacity-0 group-hover/sidebar-section:opacity-100'
                    )}>
                      <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground">
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>
                      <button
                        onClick={() => sidebarLayout.togglePin(sectionId)}
                        className={cn(
                          'p-1 rounded transition-colors',
                          isPinned
                            ? 'text-primary bg-primary/15 hover:bg-primary/25'
                            : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted'
                        )}
                        title={isPinned ? 'Losmaken' : 'Vastzetten (sticky)'}
                      >
                        <Pin className={cn('h-3.5 w-3.5', isPinned && 'fill-current')} />
                      </button>
                      <span className="text-2xs text-muted-foreground/40 ml-0.5">
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
                          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB' }}>
                            <button onClick={() => setKlantPanelOpen(!klantPanelOpen)} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] transition-colors" style={{ borderBottom: '0.5px solid #EBEBEB' }}>
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-[10px]">{selectedKlant.bedrijfsnaam[0]?.toUpperCase()}</span>
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-[13px] font-semibold truncate" style={{ color: '#1A1A1A' }}>{selectedKlant.bedrijfsnaam}</p>
                                <p className="text-[11px] truncate" style={{ color: '#9B9B95' }}>{contactpersoon ? `t.a.v. ${contactpersoon}` : 'Geen contactpersoon'}</p>
                              </div>
                              {klantPanelOpen ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9B9B95' }} /> : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9B9B95' }} />}
                            </button>

                            {klantPanelOpen && (
                              <div className="px-4 py-3 space-y-2.5">
                                <div className="text-[11px] space-y-0.5" style={{ color: '#6B6B66' }}>
                                  {selectedKlant.telefoon && <p className="flex items-center gap-1.5 font-mono"><Phone className="h-3 w-3" style={{ color: '#9B9B95' }} />{selectedKlant.telefoon}</p>}
                                  {selectedKlant.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" style={{ color: '#9B9B95' }} />{selectedKlant.email}</p>}
                                  {(selectedKlant.adres || selectedKlant.stad) && (
                                    <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" style={{ color: '#9B9B95' }} />{[selectedKlant.adres, selectedKlant.postcode, selectedKlant.stad].filter(Boolean).join(', ')}</p>
                                  )}
                                </div>

                                <KlantStatusWarning klant={selectedKlant} className="mt-1" />

                                {selectedKlant.contactpersonen?.length > 0 && (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9B9B95' }}>Contactpersoon</label>
                                    <Select value={selectedContactId} onValueChange={(val) => contact.handleSelectContact(val)}>
                                      <SelectTrigger className="h-8 text-[12px] rounded-lg" style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}><SelectValue placeholder="Selecteer..." /></SelectTrigger>
                                      <SelectContent>
                                        {selectedKlant.contactpersonen.map((cp) => (
                                          <SelectItem key={cp.id} value={cp.id}>
                                            <div className="flex items-center gap-1.5"><span>{cp.naam}</span>{cp.is_primair && <span className="text-[10px]" style={{ color: '#1A535C' }}>(primair)</span>}</div>
                                          </SelectItem>
                                        ))}
                                        <SelectItem value="__new__"><span style={{ color: '#1A535C' }}>+ Nieuw</span></SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {(selectedKlant.kvk_nummer || selectedKlant.btw_nummer) && (
                                  <div className="text-[11px] font-mono space-y-0.5 pt-2" style={{ color: '#6B6B66', borderTop: '0.5px solid #EBEBEB' }}>
                                    {selectedKlant.kvk_nummer && <p>KvK: {selectedKlant.kvk_nummer}</p>}
                                    {selectedKlant.btw_nummer && <p>BTW: {selectedKlant.btw_nummer}</p>}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: '0.5px solid #EBEBEB' }}>
                                  {selectedKlant.telefoon && <a href={`tel:${selectedKlant.telefoon}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors" style={{ backgroundColor: '#E2F0E8', color: '#2D6B48' }}><Phone className="h-3 w-3" />Bellen</a>}
                                  {selectedKlant.email && <a href={`mailto:${selectedKlant.email}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}><Mail className="h-3 w-3" />Email</a>}
                                  <Link to={`/klanten/${selectedKlant.id}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors" style={{ backgroundColor: '#EBEBEB', color: '#6B6B66' }}><ExternalLink className="h-3 w-3" />Profiel</Link>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl p-5 text-center" style={{ border: '1.5px dashed #EBEBEB', backgroundColor: '#F8F7F5' }}>
                            <Building2 className="h-7 w-7 mx-auto mb-1.5" style={{ color: '#9B9B95' }} />
                            <p className="text-[12px]" style={{ color: '#9B9B95' }}>Geen klant geselecteerd</p>
                            <button className="mt-2 h-7 px-3 text-[11px] font-semibold rounded-lg text-white transition-all hover:opacity-90" style={{ backgroundColor: '#1A535C' }} onClick={() => setShowKlantSelector(true)}>Klant kiezen</button>
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
                                <p className="text-2xs uppercase tracking-label text-[#4A9960]/80 dark:text-[#6ACA80]/80 font-medium">Gefactureerd</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <p className="text-2xs text-[#4A9960]/60 dark:text-[#6ACA80]/60">Offerte bedrag</p>
                                  <p className="text-sm font-bold text-[#4A9960] dark:text-[#6ACA80]">{formatCurrency(round2(subtotaal + btwBedrag))}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[#4A9960]/40 dark:text-[#6ACA80]/40 flex-shrink-0" />
                                <div className="flex-1 text-right">
                                  <p className="text-2xs text-[#4A9960]/60 dark:text-[#6ACA80]/60">Factuur</p>
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
                                  <Badge className={cn('text-2xs',
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
                                <p className="text-2xs uppercase tracking-label text-white/80 font-medium">Klaar om te factureren</p>
                              </div>
                              <p className="text-2xs text-white/60">Offerte bedrag incl BTW</p>
                              <p className="text-xl font-bold text-white font-mono">{formatCurrency(round2(subtotaal + btwBedrag))}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-2xs text-white/60"><span className="font-mono">{formatCurrency(subtotaal)}</span> excl BTW</p>
                                <p className="text-2xs text-white/60">+<span className="font-mono">{formatCurrency(btwBedrag)}</span> BTW</p>
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
                        <div className="bg-mod-klanten-light dark:bg-mod-klanten-light/15 p-4">
                          <p className="text-2xs uppercase tracking-label text-foreground/70 font-medium">Totaal incl BTW</p>
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
                              <p className="text-2xs text-foreground/50 mt-0.5">Enter = bevestig, Esc = annuleer</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setGewenstTotaal(round2(subtotaal + btwBedrag + ((afrondingskorting + urenCorrectieBedrag) * (1 + (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))).toFixed(2))
                                setIsEditingTotaal(true)
                              }}
                              className="text-xl font-bold font-mono text-foreground mt-0.5 hover:underline underline-offset-2 decoration-foreground/40 cursor-pointer text-left"
                              title="Klik om totaal aan te passen"
                            >
                              {formatCurrency(round2(subtotaal + btwBedrag + ((afrondingskorting + urenCorrectieBedrag) * (1 + (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))))}
                            </button>
                          )}
                          {afrondingskorting !== 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-2xs text-white/60">Korting: {formatCurrency(afrondingskorting)} excl BTW</p>
                              <button onClick={() => setAfrondingskorting(0)} className="text-2xs text-white/50 hover:text-white underline">Herstel</button>
                            </div>
                          )}
                          {urenCorrectieBedrag !== 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-2xs text-white/60">Uren correctie: {urenCorrectieBedrag > 0 ? '+' : ''}{formatCurrency(urenCorrectieBedrag)} excl BTW</p>
                              <button onClick={() => setUrenCorrectie({})} className="text-2xs text-white/50 hover:text-white underline">Herstel</button>
                            </div>
                          )}
                          {optionelSubtotaal > 0 && (
                            <p className="text-2xs text-white/60 mt-1">+ {formatCurrency(round2(optionelSubtotaal + optionelBtw))} aan opties</p>
                          )}
                        </div>

                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-background/80 dark:bg-muted/50 p-2.5">
                              <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">Subtotaal</p>
                              <p className="text-sm font-medium font-mono text-foreground mt-0.5">{formatCurrency(round2(subtotaal + afrondingskorting + urenCorrectieBedrag))}</p>
                            </div>
                            <div className="rounded-lg bg-background/80 dark:bg-muted/50 p-2.5">
                              <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">BTW</p>
                              <p className="text-sm font-medium font-mono text-foreground mt-0.5">{formatCurrency(round2(btwBedrag + (afrondingskorting + urenCorrectieBedrag) * (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))}</p>
                            </div>
                          </div>
                          {afrondingskorting !== 0 && (
                            <div className="rounded-lg bg-amber-50/80 dark:bg-amber-900/20 p-2.5 border border-amber-200/50 dark:border-amber-800/30">
                              <p className="text-2xs uppercase tracking-label text-amber-600 font-medium">Afrondingskorting</p>
                              <p className="text-sm font-medium font-mono text-amber-700 mt-0.5">{formatCurrency(afrondingskorting)}</p>
                            </div>
                          )}

                          <Separator className="opacity-50" />

                          <div className="space-y-2">
                            <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">Inkoop / Verkoop</p>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-red-400" /><span className="text-xs text-muted-foreground">Inkoop</span></div>
                                <span className="text-xs font-medium font-mono text-red-600 dark:text-red-400">{totaalInkoop > 0 ? formatCurrency(totaalInkoop) : '—'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-green-400" /><span className="text-xs text-muted-foreground">Verkoop</span></div>
                                <span className="text-xs font-medium font-mono text-foreground">{formatCurrency(round2(subtotaal + afrondingskorting + urenCorrectieBedrag))}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs text-muted-foreground">Winst</span></div>
                                <span className="text-xs font-medium font-mono text-emerald-600 dark:text-emerald-400">{totaalInkoop > 0 ? formatCurrency(winstExBtw) : '—'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">Marge</p>
                            <div className={cn('rounded-lg p-3', margeColor.bg)}>
                              <div className="flex items-center justify-between">
                                <Percent className={cn('h-4 w-4', margeColor.text)} />
                                <span className={cn('text-lg font-bold font-mono', margeColor.text)}>{totaalInkoop > 0 ? `${margePercentage.toFixed(1)}%` : '—'}</span>
                              </div>
                              {totaalInkoop > 0 && (
                                <div className="mt-2 h-1.5 rounded-full bg-secondary dark:bg-muted">
                                  <div className={cn('h-full rounded-full transition-all', margeColor.bar)} style={{ width: `${Math.min(100, Math.max(0, margePercentage))}%` }} />
                                </div>
                              )}
                            </div>
                          </div>

                          {itemMarges.some(m => m.hasCalc) && (
                            <>
                              <Separator className="opacity-50" />
                              <div className="space-y-2">
                                <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">Per item</p>
                                <div className="space-y-1.5">
                                  {itemMarges.map((m, idx) => {
                                    if (!m.hasCalc) return null
                                    const c = getMargeColorSidebar(m.pct)
                                    return (
                                      <div key={idx} className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{m.beschrijving || `Item ${idx + 1}`}</span>
                                        <span className={cn('text-xs font-medium font-mono', c.text)}>{m.pct.toFixed(1)}%</span>
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
                                <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">{materiaalKosten > 0 ? 'Uren & Materiaal' : 'Uren'}</p>
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
                                          <span className={cn('text-xs font-medium font-mono min-w-[3rem] text-right', correctie !== 0 ? 'text-purple-700 dark:text-purple-400' : 'text-purple-600')}>
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
                                      <span className="text-2xs text-muted-foreground">Uren correctie</span>
                                      <span className={cn('text-2xs font-medium', urenCorrectieBedrag > 0 ? 'text-green-600' : 'text-red-500')}>
                                        {urenCorrectieBedrag > 0 ? '+' : ''}{formatCurrency(urenCorrectieBedrag)}
                                      </span>
                                    </div>
                                  )}
                                  {materiaalKosten > 0 && (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5 text-blue-500" /><span className="text-xs text-muted-foreground">Materiaal</span></div>
                                      <span className="text-xs font-medium font-mono text-blue-600">{formatCurrency(materiaalKosten)}</span>
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
                          className="w-full flex items-center gap-2 px-4 py-3 bg-background/80 dark:bg-muted/50 border-b border-border dark:border-border hover:bg-muted dark:hover:bg-muted transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold text-foreground">Inkoopoffertes</p>
                            <p className="text-xs text-muted-foreground">Leveranciersprijzen</p>
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
                }

                return (
                  <>
                    {pinnedIds.length > 0 && (
                      <div className="lg:sticky lg:top-4 z-10 bg-background rounded-xl">
                        {pinnedIds.map(id => renderSection(id))}
                      </div>
                    )}
                    {unpinnedIds.map(id => renderSection(id))}
                  </>
                )
              })()}
            </div>
          </div>
        </div>{/* end RIGHT SIDEBAR */}
      </div>
    </div>
    </div>
  )
}
