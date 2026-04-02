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
import { generateOffertePDF, generateOpdrachtbevestigingPDF } from '@/services/pdfService'
import { WerkbonAanmaakDialog } from '@/components/werkbonnen/WerkbonAanmaakDialog'
import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog'
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
import { CustomerSelector } from './CustomerSelector'
import { QuoteHeader } from './QuoteHeader'
import { QuoteSidebar } from './QuoteSidebar'
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
  const selectedKlant = klanten.find((k) => k.id === selectedKlantId)
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
  const [verstuurdOp, setVerstuurdOp] = useState<string | undefined>()
  const [verstuurdNaar, setVerstuurdNaar] = useState<string | undefined>()

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

  const autoSaveIdRef = useRef<string | null>(null)
  const performAutoSaveRef = useRef<() => Promise<void>>(async () => {})

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
  const hasUnsavedChangesRef = useRef(false)
  const saveLockRef = useRef(false)
  const lastKnownUpdatedAtRef = useRef<string | null>(null)

  // ── Computed ──
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
        setVerstuurdOp(offerte.verstuurd_op || undefined)
        setVerstuurdNaar(offerte.verstuurd_naar || undefined)
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
    contact.setShowNewContact(false)
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
    email.setEmailTo(contactEmail)
    email.setEmailSubject(`Offerte ${offerteNummer} - ${offerteTitel}`)
    email.setEmailBody(
      introTekst
        ? introTekst
        : `Beste ${klantNaam},\n\nHierbij ontvangt u onze offerte voor "${offerteTitel}".\n\nMocht u vragen hebben of aanvullende informatie wensen, neem dan gerust contact met ons op.\n\nMet vriendelijke groet,`
    )
    email.setEmailBijlagen([{ naam: `${offerteNummer}.pdf`, grootte: 0 }])
    email.setEmailScheduled(false)
    email.setEmailScheduleDate('')
    email.setEmailCc('')
    email.setEmailBcc('')
    email.setShowEmailCompose(true)
    setTimeout(() => email.emailSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
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
    if (!email.emailTo.trim() || !email.emailSubject.trim()) {
      toast.error('Vul een ontvanger en onderwerp in')
      return
    }
    email.setIsSendingEmail(true)
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
        customBody: email.emailBody || undefined,
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
          toast.warning('PDF kon niet gegenereerd worden — email wordt zonder bijlage verstuurd')
        }
      }

      // Voeg user-uploaded bijlagen toe (naast de PDF)
      if (email.emailExtraBijlagen && email.emailExtraBijlagen.length > 0) {
        for (const bijlage of email.emailExtraBijlagen) {
          attachments.push({ filename: bijlage.naam, content: bijlage.base64, encoding: 'base64' as const })
        }
      }

      await sendEmail(email.emailTo.trim(), email.emailSubject.trim(), templateText, { html: templateHtml, attachments })
      if (quoteId) {
        await updateOfferte(quoteId, {
          status: 'verzonden',
          verstuurd_op: new Date().toISOString(),
          verstuurd_naar: email.emailTo.trim(),
          verzendwijze: 'via_email_pdf',
        })
        setVerstuurdOp(new Date().toISOString())
        setVerstuurdNaar(email.emailTo.trim())
      }
      if (email.emailScheduled && email.emailScheduleDate) {
        toast.success(`Email ingepland voor ${new Date(email.emailScheduleDate + 'T' + email.emailScheduleTime).toLocaleString('nl-NL')}`)
      } else {
        toast.success(`Offerte verstuurd naar ${email.emailTo.trim()}`)
      }
      email.setShowEmailCompose(false)
    } catch (err) {
      logger.error('Failed to send email:', err)
      toast.error('Kon email niet verzenden')
    } finally {
      email.setIsSendingEmail(false)
    }
  }


  // ── Actions dropdown state ──
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showWerkbonDialog, setShowWerkbonDialog] = useState(false)
  const [showObPreview, setShowObPreview] = useState(false)

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
      <CustomerSelector
        locationState={location.state}
        navigate={navigate}
        klantSearch={klantSearch}
        setKlantSearch={setKlantSearch}
        showKlantResults={showKlantResults}
        setShowKlantResults={setShowKlantResults}
        showNieuwBedrijf={showNieuwBedrijf}
        setShowNieuwBedrijf={setShowNieuwBedrijf}
        selectedKlantId={selectedKlantId}
        setSelectedKlantId={setSelectedKlantId}
        selectedKlant={selectedKlant}
        klantWrapperRef={klantWrapperRef}
        filteredKlanten={filteredKlanten}
        nbData={nbData}
        setNbData={setNbData}
        showNbUitgebreid={showNbUitgebreid}
        setShowNbUitgebreid={setShowNbUitgebreid}
        nbCreating={nbCreating}
        handleCreateNieuwBedrijf={handleCreateNieuwBedrijf}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        klantProjecten={klantProjecten}
        selectedContactId={selectedContactId}
        setSelectedContactId={setSelectedContactId}
        contactpersoon={contactpersoon}
        setContactpersoon={setContactpersoon}
        contact={contact}
        offerteTitel={offerteTitel}
        setOfferteTitel={setOfferteTitel}
        offerteNummer={offerteNummer}
        geldigTot={geldigTot}
        setGeldigTot={setGeldigTot}
        itemCount={itemCount}
        setItemCount={setItemCount}
        handleStartEditing={handleStartEditing}
        canStartEditing={!!canStartEditing}
      />
    )
  }

  // ────────────────────────────────────────────────────────────────────
  // MAIN LAYOUT: Two columns — Left: scrollable content, Right: sticky sidebar (380px)
  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 min-h-full" style={{ backgroundColor: '#F8F7F5' }}>
    <div className="relative pb-6 px-4 md:px-6 pt-0">
      {/* ──── HEADER BAR ──── */}
      <QuoteHeader
        isEditMode={isEditMode}
        offerteNummer={offerteNummer}
        geldigTot={geldigTot}
        autoSaveStatus={autoSaveStatus}
        selectedKlant={selectedKlant}
        isSaving={isSaving}
        selectedProjectId={selectedProjectId}
        verstuurdOp={verstuurdOp}
        verstuurdNaar={verstuurdNaar}
        versioning={versioning}
        email={email}
        showActionsMenu={showActionsMenu}
        setShowActionsMenu={setShowActionsMenu}
        isDuplicating={isDuplicating}
        handleDownloadPdf={handleDownloadPdf}
        saveOfferte={saveOfferte}
        handleVerstuurOfferte={handleVerstuurOfferte}
        handleKeuzePortaal={handleKeuzePortaal}
        handleKeuzeEmail={handleKeuzeEmail}
        handleDupliceerOfferte={handleDupliceerOfferte}
        setShowKlantSelector={setShowKlantSelector}
        onWerkbon={isEditMode ? () => setShowWerkbonDialog(true) : undefined}
        onOpdrachtbevestiging={isEditMode ? () => setShowObPreview(true) : undefined}
      />

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
          <div ref={email.emailSectionRef}>
            {email.showEmailCompose && (
              <div className="bg-[#FFFFFF] rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#EBEBEB]/60">
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">Email versturen</h3>
                  <button onClick={() => email.setShowEmailCompose(false)} className="text-[#9B9B95] hover:text-[#1A1A1A] transition-colors"><X className="h-4 w-4" /></button>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {/* Email velden */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#9B9B95] w-16 flex-shrink-0">Aan</span>
                      <input value={email.emailTo} onChange={(e) => email.setEmailTo(e.target.value)} placeholder="email@voorbeeld.nl" type="email" className="flex-1 text-sm px-3 py-2 border border-[#EBEBEB] rounded-lg bg-[#F8F7F5] focus:outline-none focus:border-[#1A535C]/40 focus:bg-white transition-colors" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#9B9B95] w-16 flex-shrink-0">CC</span>
                      <input value={email.emailCc} onChange={(e) => email.setEmailCc(e.target.value)} placeholder="Optioneel" className="flex-1 text-sm px-3 py-2 border border-[#EBEBEB] rounded-lg bg-[#F8F7F5] focus:outline-none focus:border-[#1A535C]/40 focus:bg-white transition-colors" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#9B9B95] w-16 flex-shrink-0">BCC</span>
                      <input value={email.emailBcc} onChange={(e) => email.setEmailBcc(e.target.value)} placeholder="Optioneel" className="flex-1 text-sm px-3 py-2 border border-[#EBEBEB] rounded-lg bg-[#F8F7F5] focus:outline-none focus:border-[#1A535C]/40 focus:bg-white transition-colors" />
                    </div>
                  </div>

                  {/* Onderwerp */}
                  <input value={email.emailSubject} onChange={(e) => email.setEmailSubject(e.target.value)} placeholder="Onderwerp..." className="w-full text-sm font-medium px-3 py-2 border border-[#EBEBEB] rounded-lg focus:outline-none focus:border-[#1A535C]/40 transition-colors" />

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
                      value={email.emailBody}
                      onChange={(e) => email.setEmailBody(e.target.value)}
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
                    {email.emailBijlagen.map((bijlage: { naam: string; grootte: number }, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-[#F8F7F5] rounded-lg text-sm">
                        <FileText className="h-3.5 w-3.5 text-[#C03A18]" />
                        <span className="text-[#1A1A1A] font-mono text-xs">{bijlage.naam}</span>
                        {idx > 0 && <button onClick={() => email.setEmailBijlagen((prev: { naam: string; grootte: number }[]) => prev.filter((_: { naam: string; grootte: number }, i: number) => i !== idx))} className="text-[#9B9B95] hover:text-[#C03A18] transition-colors"><X className="h-3 w-3" /></button>}
                      </div>
                    ))}
                    <button onClick={email.handleAddBijlage} className="flex items-center gap-1 px-2 py-1.5 text-xs text-[#1A535C] hover:underline">
                      <Paperclip className="h-3 w-3" />Bijlage
                    </button>
                    <input ref={email.fileInputRef} type="file" multiple className="hidden" onChange={email.handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf,.doc,.docx" />
                  </div>

                  {/* Inplannen */}
                  <div className="border-t border-[#EBEBEB]/40 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={email.emailScheduled} onChange={(e) => email.setEmailScheduled(e.target.checked)} className="h-3.5 w-3.5 rounded border-[#EBEBEB] text-[#1A535C] focus:ring-[#1A535C]/30" />
                      <CalendarClock className="h-3.5 w-3.5 text-[#9B9B95]" />
                      <span className="text-xs text-[#6B6B66]">Inplannen</span>
                    </label>
                    {email.emailScheduled && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 ml-6">
                        {(() => {
                          const morgen = new Date(); morgen.setDate(morgen.getDate() + 1)
                          const morgenStr = morgen.toISOString().split('T')[0]
                          return [
                            { label: 'Morgen 08:00', datum: morgenStr, tijd: '08:00' },
                            { label: 'Morgen 10:00', datum: morgenStr, tijd: '10:00' },
                            { label: 'Morgen 14:00', datum: morgenStr, tijd: '14:00' },
                          ].map((opt) => (
                            <button key={opt.label} onClick={() => { email.setEmailScheduleDate(opt.datum); email.setEmailScheduleTime(opt.tijd) }} className="text-xs px-2.5 py-1 border border-[#EBEBEB] rounded-md hover:bg-[#F8F7F5] text-[#6B6B66] transition-colors">{opt.label}</button>
                          ))
                        })()}
                        <input type="date" value={email.emailScheduleDate} onChange={(e) => email.setEmailScheduleDate(e.target.value)} className="text-xs px-2 py-1 border border-[#EBEBEB] rounded-md w-32" />
                        <input type="time" value={email.emailScheduleTime} onChange={(e) => email.setEmailScheduleTime(e.target.value)} className="text-xs px-2 py-1 border border-[#EBEBEB] rounded-md w-20" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#EBEBEB]/60 bg-[#F8F7F5]/50">
                  <button onClick={() => email.setShowEmailCompose(false)} className="text-sm text-[#9B9B95] hover:text-[#6B6B66] transition-colors">Annuleren</button>
                  <button
                    onClick={handleSendEmailInline}
                    disabled={!email.emailTo.trim() || !email.emailSubject.trim() || email.isSendingEmail}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-[#F15025] text-white hover:bg-[#D94520] disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {email.isSendingEmail ? 'Verzenden...' : email.emailScheduled ? 'Inplannen' : 'Verstuur'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>{/* end LEFT COLUMN */}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* RIGHT SIDEBAR: Configurable order + sticky pin                 */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <QuoteSidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          subtotaal={subtotaal}
          btwBedrag={btwBedrag}
          formatCurrencyFn={formatCurrency}
          isEditMode={isEditMode}
          offerteStatus={offerteStatus}
          geconverteerdNaarFactuurId={geconverteerdNaarFactuurId}
          userId={user?.id}
          sidebarLayout={sidebarLayout}
          selectedKlant={selectedKlant}
          contactpersoon={contactpersoon}
          klantPanelOpen={klantPanelOpen}
          setKlantPanelOpen={setKlantPanelOpen}
          selectedContactId={selectedContactId}
          contact={contact}
          setShowKlantSelector={setShowKlantSelector}
          linkedFactuur={linkedFactuur}
          navigate={navigate}
          editOfferteId={editOfferteId}
          autoSaveIdRef={autoSaveIdRef}
          selectedKlantId={selectedKlantId}
          offerteTitel={offerteTitel}
          selectedProjectId={selectedProjectId}
          isEditingTotaal={isEditingTotaal}
          setIsEditingTotaal={setIsEditingTotaal}
          gewenstTotaal={gewenstTotaal}
          setGewenstTotaal={setGewenstTotaal}
          afrondingskorting={afrondingskorting}
          setAfrondingskorting={setAfrondingskorting}
          urenCorrectieBedrag={urenCorrectieBedrag}
          urenCorrectie={urenCorrectie}
          setUrenCorrectie={setUrenCorrectie}
          optionelSubtotaal={optionelSubtotaal}
          optionelBtw={optionelBtw}
          totaalInkoop={totaalInkoop}
          winstExBtw={winstExBtw}
          margePercentage={margePercentage}
          margeColor={margeColor}
          getMargeColorSidebar={getMargeColorSidebar}
          itemMarges={itemMarges}
          totaalUren={totaalUren}
          effectieveTotaalUren={effectieveTotaalUren}
          materiaalKosten={materiaalKosten}
          urenVelden={urenVelden}
          urenPerVeld={urenPerVeld}
          tariefPerVeld={tariefPerVeld}
          handleVerstuurOfferte={handleVerstuurOfferte}
          handleDownloadPdf={handleDownloadPdf}
          saveOfferte={saveOfferte}
          isSaving={isSaving}
          inkoopPaneelOpen={inkoopPaneelOpen}
          setInkoopPaneelOpen={setInkoopPaneelOpen}
          handleInkoopRegelToevoegen={handleInkoopRegelToevoegen}
          handleInkoopRegelAlsPrijsvariant={handleInkoopRegelAlsPrijsvariant}
        />{/* end RIGHT SIDEBAR */}
      </div>
    </div>

      {/* Werkbon Dialog */}
      {showWerkbonDialog && editOfferteId && selectedKlant && (
        <WerkbonAanmaakDialog
          open={showWerkbonDialog}
          onOpenChange={setShowWerkbonDialog}
          offerte={{
            id: editOfferteId,
            klant_id: selectedKlantId,
            klant_naam: selectedKlant.bedrijfsnaam,
            project_id: selectedProjectId || undefined,
            nummer: offerteNummer,
            titel: offerteTitel,
            status: 'concept',
            subtotaal,
            btw_bedrag: btwBedrag,
            totaal: round2(subtotaal + btwBedrag),
            geldig_tot: geldigTot,
            notities: '',
            voorwaarden: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          items={items.filter(i => i.soort === 'prijs').map((item, idx) => ({
            ...item,
            offerte_id: editOfferteId,
            volgorde: idx,
            created_at: new Date().toISOString(),
          }))}
          klant={selectedKlant}
        />
      )}

      {/* Opdrachtbevestiging Preview */}
      {showObPreview && editOfferteId && (
        <PdfPreviewDialog
          open={showObPreview}
          onOpenChange={setShowObPreview}
          title={`Opdrachtbevestiging ${offerteNummer}`}
          generatePdf={async () => {
            const [offerte, offerteItems] = await Promise.all([
              getOfferte(editOfferteId),
              getOfferteItems(editOfferteId),
            ])
            if (!offerte) throw new Error('Offerte niet gevonden')
            const doc = await generateOpdrachtbevestigingPDF(
              offerte,
              offerteItems,
              selectedKlant || {},
              { primaireKleur: primaireKleur || '#2563eb' },
              documentStyle,
            )
            return doc.output('blob')
          }}
        />
      )}
    </div>
  )
}
