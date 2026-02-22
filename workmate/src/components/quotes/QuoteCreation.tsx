import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  Clock,
  Trash2,
  Copy,
  MessageSquare,
} from 'lucide-react'
import { getKlanten, getProjecten, getOffertes, getOfferte, getOfferteItems, createOfferte, createOfferteItem, updateOfferte, updateOfferteItem, deleteOfferteItem, deleteOfferte } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Klant, Project, Offerte, OfferteItem } from '@/types'
import { round2 } from '@/utils/budgetUtils'
import { generateOffertePDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { sendEmail } from '@/services/gmailService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { cn, formatCurrency } from '@/lib/utils'
import { QuoteItemsTable, type QuoteLineItem, type DetailRegel, DEFAULT_DETAIL_LABELS } from './QuoteItemsTable'
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

const DEFAULT_INLEIDING = `Hierbij ontvangt u onze offerte voor de door u gevraagde werkzaamheden. Graag lichten wij ons aanbod hieronder toe.`

const DEFAULT_AFSLUITING = `Wij vertrouwen erop u hiermee een passend aanbod te hebben gedaan. Mocht u vragen hebben of de offerte willen bespreken, neem dan gerust contact met ons op.\n\nMet vriendelijke groet,`

const BUILTIN_VOORWAARDEN: { naam: string; tekst: string }[] = [
  {
    naam: 'Standaard',
    tekst: `1. Deze offerte is geldig gedurende de aangegeven termijn.
2. Betaling dient te geschieden binnen 30 dagen na factuurdatum.
3. Alle genoemde bedragen zijn exclusief BTW, tenzij anders vermeld.
4. Levertijd wordt in overleg bepaald na akkoord op deze offerte.
5. Op al onze leveringen en diensten zijn onze algemene voorwaarden van toepassing.
6. Kleuren en materialen kunnen licht afwijken van getoonde voorbeelden.
7. Wijzigingen na akkoord kunnen tot meerkosten leiden.
8. Garantie: 2 jaar op materiaal en constructie, 1 jaar op elektronica.`,
  },
  {
    naam: 'Kort',
    tekst: `1. Offerte geldig gedurende aangegeven termijn.
2. Betaling binnen 30 dagen na factuurdatum.
3. Alle bedragen excl. BTW.
4. Algemene voorwaarden van toepassing.`,
  },
  {
    naam: 'Uitgebreid',
    tekst: `1. Deze offerte is geldig gedurende de aangegeven termijn.
2. Betaling dient te geschieden binnen 30 dagen na factuurdatum.
3. Alle genoemde bedragen zijn exclusief BTW, tenzij anders vermeld.
4. Levertijd wordt in overleg bepaald na akkoord op deze offerte.
5. Op al onze leveringen en diensten zijn onze algemene voorwaarden van toepassing.
6. Kleuren en materialen kunnen licht afwijken van getoonde voorbeelden.
7. Wijzigingen na akkoord kunnen tot meerkosten leiden.
8. Garantie: 2 jaar op materiaal en constructie, 1 jaar op elektronica.
9. Eigendomsvoorbehoud: geleverde zaken blijven ons eigendom tot volledige betaling.
10. Annulering na akkoord: reeds gemaakte kosten worden in rekening gebracht.
11. Intellectueel eigendom: ontwerpen blijven eigendom van opdrachtnemer tot volledige betaling.
12. Overmacht: bij onvoorziene omstandigheden behouden wij ons het recht voor de levertijd aan te passen.`,
  },
]

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
  const [searchParams] = useSearchParams()
  const { id: editId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { settings, updateSettings, offertePrefix, offerteGeldigheidDagen, standaardBtw, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur } = useAppSettings()
  const documentStyle = useDocumentStyle()
  const [currentStep, setCurrentStep] = useState(0)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false)
  const [templateNaam, setTemplateNaam] = useState('')

  // Edit/duplicate mode
  const isDuplicate = searchParams.get('duplicate') === 'true'
  const isEditMode = !!editId && !isDuplicate
  const pageTitle = isEditMode ? 'Offerte bewerken' : isDuplicate ? 'Offerte dupliceren' : 'Nieuwe Offerte'

  // Query params van bijv. projecten-pagina
  const paramKlantId = searchParams.get('klant_id') || ''
  const paramProjectId = searchParams.get('project_id') || ''
  const paramDealId = searchParams.get('deal_id') || ''
  const paramTitel = searchParams.get('titel') || ''

  // ── Step 0: Klant + Project + Details ──
  const [selectedKlantId, setSelectedKlantId] = useState(paramKlantId)
  const [selectedProjectId, setSelectedProjectId] = useState(paramProjectId)
  const [klantSearch, setKlantSearch] = useState('')
  const [offerteTitel, setOfferteTitel] = useState(paramTitel)
  const [itemCount, setItemCount] = useState(1)
  const [contactpersoon, setContactpersoon] = useState('')
  const [aanhef, setAanhef] = useState('')
  const [inleidingTekst, setInleidingTekst] = useState(DEFAULT_INLEIDING)
  const [afsluitingTekst, setAfsluitingTekst] = useState(DEFAULT_AFSLUITING)
  const [geldigTot, setGeldigTot] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + offerteGeldigheidDagen)
    return d.toISOString().split('T')[0]
  })
  const [offerteNummer, setOfferteNummer] = useState('')
  const [originalItemIds, setOriginalItemIds] = useState<string[]>([])

  // ── Step 1: Items ──
  const [items, setItems] = useState<QuoteLineItem[]>([])
  const [notities, setNotities] = useState('')
  const [voorwaarden, setVoorwaarden] = useState(DEFAULT_VOORWAARDEN)

  // ── Navigation guard (beforeunload only, BrowserRouter doesn't support useBlocker) ──
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Mark dirty on any change
  const markDirty = useCallback(() => setIsDirty(true), [])

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

  // ── Calculations for sticky bar ──
  const prijsItems = items.filter((i) => i.soort === 'prijs')

  const subtotaal = round2(prijsItems.reduce((sum, item) => {
    const bruto = item.aantal * item.eenheidsprijs
    return sum + round2(bruto - bruto * (item.korting_percentage / 100))
  }, 0))

  const btwBedrag = round2(prijsItems.reduce((sum, item) => {
    const bruto = item.aantal * item.eenheidsprijs
    const netto = round2(bruto - bruto * (item.korting_percentage / 100))
    return sum + round2(netto * (item.btw_percentage / 100))
  }, 0))

  // Inkoop = sum of all calculatie_regels inkoop_prijs * aantal
  const totaalInkoop = useMemo(() => {
    return round2(prijsItems.reduce((sum, item) => {
      if (item.calculatie_regels && item.calculatie_regels.length > 0) {
        return sum + item.calculatie_regels.reduce((s, r) => s + round2(r.inkoop_prijs * r.aantal), 0)
      }
      return sum
    }, 0))
  }, [prijsItems])

  const winstExBtw = round2(subtotaal - totaalInkoop)
  const margePercentage = subtotaal > 0 ? Math.round(((winstExBtw / subtotaal) * 100) * 10) / 10 : 0

  // Montage-uren: som van alle calculatie_regels waarvan product_naam 'montage' bevat
  const totaalMontageUren = useMemo(() => {
    let totaal = 0
    prijsItems.forEach(item => {
      if (item.calculatie_regels && item.calculatie_regels.length > 0) {
        item.calculatie_regels
          .filter(r => r.product_naam.toLowerCase().includes('montage'))
          .forEach(r => { totaal += r.aantal })
      }
    })
    return totaal
  }, [prijsItems])

  // ── Data fetching ──
  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const [klantenData, projectenData, offertesData] = await Promise.all([
          getKlanten(),
          getProjecten(),
          getOffertes().catch(() => []),
        ])
        if (cancelled) return
        setKlanten(klantenData)
        setProjecten(projectenData)

        // Edit or duplicate mode: load existing offerte
        if (editId) {
          const [offerte, offerteItems] = await Promise.all([
            getOfferte(editId),
            getOfferteItems(editId),
          ])
          if (cancelled || !offerte) return

          setSelectedKlantId(isDuplicate ? '' : offerte.klant_id)
          setSelectedProjectId(offerte.project_id || '')
          setOfferteTitel(offerte.titel)
          setGeldigTot(isDuplicate
            ? (() => { const d = new Date(); d.setDate(d.getDate() + offerteGeldigheidDagen); return d.toISOString().split('T')[0] })()
            : offerte.geldig_tot
          )
          setOfferteNummer(isDuplicate
            ? generateOfferteNummer(offertePrefix, offertesData)
            : offerte.nummer
          )
          setNotities(offerte.notities || '')
          setVoorwaarden(offerte.voorwaarden || DEFAULT_VOORWAARDEN)
          setContactpersoon(offerte.klant_naam || '')
          setAanhef(offerte.aanhef || '')
          setInleidingTekst(offerte.inleiding_tekst || DEFAULT_INLEIDING)
          setAfsluitingTekst(offerte.afsluiting_tekst || DEFAULT_AFSLUITING)
          setOriginalItemIds(offerteItems.map(i => i.id))

          // Convert OfferteItems to QuoteLineItems
          const loadedItems: QuoteLineItem[] = offerteItems.map((item) => {
            const labels = (settings.offerte_regel_velden && settings.offerte_regel_velden.length > 0)
              ? settings.offerte_regel_velden
              : DEFAULT_DETAIL_LABELS
            const defaultRegels: { id: string; label: string; waarde: string }[] = labels.map((l, i) => ({
              id: `dr-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
              label: l,
              waarde: '',
            }))

            return {
              id: isDuplicate ? `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` : item.id,
              soort: 'prijs' as const,
              beschrijving: item.beschrijving,
              extra_velden: {},
              detail_regels: item.detail_regels
                ? (item.detail_regels as { label: string; waarde: string }[]).map((dr, i) => ({
                    id: `dr-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                    label: dr.label,
                    waarde: dr.waarde,
                  }))
                : defaultRegels,
              aantal: item.aantal,
              eenheidsprijs: item.eenheidsprijs,
              btw_percentage: item.btw_percentage,
              korting_percentage: item.korting_percentage,
              totaal: item.totaal,
            }
          })
          setItems(loadedItems)

          if (isDuplicate) {
            setCurrentStep(0)
          } else {
            setCurrentStep(1)
          }
        } else {
          setOfferteNummer(generateOfferteNummer(offertePrefix, offertesData))
        }
      } catch (err) {
        logger.error('Failed to fetch data:', err)
        if (!cancelled) toast.error('Kon data niet laden')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [editId])

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

  // Auto-fill contactpersoon + aanhef from klant
  useEffect(() => {
    if (selectedKlant?.contactpersoon && !contactpersoon) {
      setContactpersoon(selectedKlant.contactpersoon)
    }
    if (selectedKlant && !aanhef) {
      const naam = selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam || ''
      if (naam) setAanhef(`Beste ${naam},`)
    }
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
    markDirty()
  }

  const handleUpdateItem = (id: string, field: keyof QuoteLineItem, value: QuoteLineItem[keyof QuoteLineItem]) => {
    markDirty()
    setItems(
      items.map((item) => {
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
    setItems(items.filter((item) => item.id !== id))
    markDirty()
  }

  const handleDuplicateItem = (id: string) => {
    const source = items.find((item) => item.id === id)
    if (!source) return
    const newItem: QuoteLineItem = {
      ...source,
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      beschrijving: `${source.beschrijving} (kopie)`,
      detail_regels: source.detail_regels?.map((r, i) => ({
        ...r,
        id: `dr-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      })),
      calculatie_regels: source.calculatie_regels?.map(r => ({
        ...r,
        id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      })),
    }
    const idx = items.findIndex((item) => item.id === id)
    const newItems = [...items]
    newItems.splice(idx + 1, 0, newItem)
    setItems(newItems)
    markDirty()
    toast.success('Item gedupliceerd')
  }

  // ── Voorwaarden templates ──
  const customTemplates = settings.voorwaarden_templates || []
  const allVoorwaardenTemplates = [...BUILTIN_VOORWAARDEN, ...customTemplates]

  const handleSaveVoorwaardenTemplate = async () => {
    if (!templateNaam.trim()) return
    const newTemplate = { naam: templateNaam.trim(), tekst: voorwaarden }
    const updated = [...customTemplates, newTemplate]
    try {
      await updateSettings({ voorwaarden_templates: updated })
      toast.success(`Template "${templateNaam}" opgeslagen`)
      setShowSaveTemplateInput(false)
      setTemplateNaam('')
    } catch {
      toast.error('Kon template niet opslaan')
    }
  }

  const handleDeleteVoorwaardenTemplate = async (naam: string) => {
    const updated = customTemplates.filter(t => t.naam !== naam)
    try {
      await updateSettings({ voorwaarden_templates: updated })
      toast.success('Template verwijderd')
    } catch {
      toast.error('Kon template niet verwijderen')
    }
  }

  const handleUpdateItemWithCalculatie = (
    id: string,
    data: {
      beschrijving: string
      eenheidsprijs: number
      calculatie_regels: CalculatieRegel[]
    }
  ) => {
    setItems(
      items.map((item) => {
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

  // ── Delete (edit mode only) ──
  const handleDeleteOfferte = async () => {
    if (!editId) return
    setIsSaving(true)
    try {
      await deleteOfferte(editId)
      setIsDirty(false)
      toast.success('Offerte verwijderd')
      navigate('/offertes')
    } catch (err) {
      logger.error('Failed to delete offerte:', err)
      toast.error('Kon offerte niet verwijderen')
    } finally {
      setIsSaving(false)
    }
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
      // Filter detail_regels: only non-empty ones
      const buildDetailRegels = (item: QuoteLineItem) => {
        const regels = (item.detail_regels || []).filter(r => r.waarde.trim() !== '')
        return regels.length > 0 ? regels.map(r => ({ label: r.label, waarde: r.waarde })) : undefined
      }

      if (isEditMode && editId) {
        // ── UPDATE existing offerte ──
        await updateOfferte(editId, {
          klant_id: selectedKlantId,
          ...(selectedProjectId && selectedProjectId !== 'geen' ? { project_id: selectedProjectId } : {}),
          titel: offerteTitel,
          aanhef: aanhef,
          inleiding_tekst: inleidingTekst,
          afsluiting_tekst: afsluitingTekst,
          status,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal: round2(subtotaal + btwBedrag),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
        })

        // Delete removed items
        const currentItemIds = items.filter(i => !i.id.startsWith('new-')).map(i => i.id)
        const deletedIds = originalItemIds.filter(id => !currentItemIds.includes(id))
        await Promise.all(deletedIds.map(id => deleteOfferteItem(id)))

        // Update existing + create new items
        await Promise.all(
          items.map((item, index) => {
            const itemData = {
              beschrijving: item.beschrijving,
              detail_regels: buildDetailRegels(item),
              aantal: item.aantal,
              eenheidsprijs: item.eenheidsprijs,
              btw_percentage: item.btw_percentage,
              korting_percentage: item.korting_percentage,
              totaal: item.totaal,
              volgorde: index + 1,
            }
            if (item.id.startsWith('new-')) {
              return createOfferteItem({ ...itemData, offerte_id: editId })
            }
            return updateOfferteItem(item.id, itemData)
          })
        )

        setIsDirty(false)
        toast.success('Offerte bijgewerkt')
        navigate('/offertes')
      } else {
        // ── CREATE new offerte ──
        const newOfferte = await createOfferte({
          user_id: user.id,
          klant_id: selectedKlantId,
          ...(selectedProjectId && selectedProjectId !== 'geen' ? { project_id: selectedProjectId } : {}),
          ...(paramDealId ? { deal_id: paramDealId } : {}),
          nummer: offerteNummer,
          titel: offerteTitel,
          aanhef: aanhef,
          inleiding_tekst: inleidingTekst,
          afsluiting_tekst: afsluitingTekst,
          status,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal: round2(subtotaal + btwBedrag),
          geldig_tot: geldigTot,
          notities,
          voorwaarden,
        })

        await Promise.all(
          items.map((item, index) =>
            createOfferteItem({
              offerte_id: newOfferte.id,
              beschrijving: item.beschrijving,
              detail_regels: buildDetailRegels(item),
              aantal: item.aantal,
              eenheidsprijs: item.eenheidsprijs,
              btw_percentage: item.btw_percentage,
              korting_percentage: item.korting_percentage,
              totaal: item.totaal,
              volgorde: index + 1,
            })
          )
        )

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

        setIsDirty(false)
        toast.success(
          status === 'concept'
            ? 'Offerte opgeslagen als concept'
            : 'Offerte verzonden naar klant'
        )
        navigate('/offertes')
      }
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
        aanhef,
        inleiding_tekst: inleidingTekst,
        afsluiting_tekst: afsluitingTekst,
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
        detail_regels: (item.detail_regels || [])
          .filter(r => r.waarde.trim() !== '')
          .map(r => ({ label: r.label, waarde: r.waarde })),
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

  // ── Render ──
  return (
    <div className="pb-36">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* ──── Page Header ──── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isDirty && !window.confirm('Je hebt onopgeslagen wijzigingen. Weet je zeker dat je terug wilt?')) return
                navigate('/offertes')
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">{pageTitle}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{offerteNummer}</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {/* Quick info badges */}
            {selectedKlant && (
              <>
                <Badge variant="outline" className="gap-1.5">
                  <Building2 className="h-3 w-3" />
                  {selectedKlant.bedrijfsnaam}
                </Badge>
                {selectedProject && (
                  <Badge variant="outline" className="gap-1.5">
                    <FolderOpen className="h-3 w-3" />
                    {selectedProject.naam}
                  </Badge>
                )}
              </>
            )}
            {/* Duplicate button (edit mode only) */}
            {isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/offertes/${editId}/bewerken?duplicate=true`)}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Dupliceer
              </Button>
            )}
            {/* Delete button (edit mode only) */}
            {isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Verwijder
              </Button>
            )}
          </div>
        </div>

        {/* ──── Step Indicator ──── */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-0">
            {steps.map((step, index) => {
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              const Icon = step.icon

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
        {/* STEP 0: KLANT + PROJECT + TEMPLATE + DETAILS (samengevoegd)      */}
        {/* ================================================================ */}
        {currentStep === 0 && (
          <div className="space-y-5">
            {/* ── Klant selectie ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  Klant & Project
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

                {/* Selected klant info card */}
                {selectedKlant && (
                  <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-accent dark:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground">{selectedKlant.bedrijfsnaam}</h4>
                        <p className="text-xs text-muted-foreground">{selectedKlant.contactpersoon}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[selectedKlant.adres, selectedKlant.postcode, selectedKlant.stad].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setSelectedKlantId('')
                        setSelectedProjectId('')
                        setContactpersoon('')
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

            {/* ── Offerte details ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  Offerte Details
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offerte-nummer">Nummer</Label>
                    <Input
                      id="offerte-nummer"
                      value={offerteNummer}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="geldig-tot">Geldig tot</Label>
                    <Input
                      id="geldig-tot"
                      type="date"
                      value={geldigTot}
                      onChange={(e) => setGeldigTot(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactpersoon" className="flex items-center gap-1.5">
                      <Contact className="h-3 w-3 text-muted-foreground" />
                      Contactpersoon
                    </Label>
                    <Input
                      id="contactpersoon"
                      value={contactpersoon}
                      onChange={(e) => setContactpersoon(e.target.value)}
                      placeholder="Naam..."
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
          <div className="space-y-6">
            {/* ── Items ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-sm">
                    <ShoppingCart className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Items & Prijzen</h2>
                    <p className="text-xs text-muted-foreground">
                      {items.length} {items.length === 1 ? 'item' : 'items'} — vul de details en prijzen in
                    </p>
                  </div>
                </div>
              </div>

              <QuoteItemsTable
                items={items}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onRemoveItem={handleRemoveItem}
                onDuplicateItem={handleDuplicateItem}
                onUpdateItemWithCalculatie={handleUpdateItemWithCalculatie}
              />
            </div>

            {/* ── Offerte Teksten ── */}
            <div className="rounded-xl border border-teal-200/60 dark:border-teal-800/40 bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-gray-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-teal-100/60 dark:border-teal-800/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
                    <MessageSquare className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Offerte Teksten</h3>
                    <p className="text-[11px] text-muted-foreground">Aanhef, inleiding en afsluiting op de offerte voor je klant</p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="aanhef" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aanhef</Label>
                  <Input
                    id="aanhef"
                    value={aanhef}
                    onChange={(e) => { setAanhef(e.target.value); markDirty() }}
                    placeholder="Beste [naam],"
                    className="text-sm bg-white/80 dark:bg-gray-900/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inleiding" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inleidende tekst</Label>
                  <Textarea
                    id="inleiding"
                    value={inleidingTekst}
                    onChange={(e) => { setInleidingTekst(e.target.value); markDirty() }}
                    placeholder="Hierbij ontvangt u onze offerte..."
                    className="text-sm min-h-[56px] bg-white/80 dark:bg-gray-900/50 resize-none"
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="afsluiting" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Afsluitende tekst</Label>
                  <Textarea
                    id="afsluiting"
                    value={afsluitingTekst}
                    onChange={(e) => { setAfsluitingTekst(e.target.value); markDirty() }}
                    placeholder="Met vriendelijke groet,..."
                    className="text-sm min-h-[68px] bg-white/80 dark:bg-gray-900/50 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* ── Notities & Voorwaarden ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notities</h3>
                </div>
                <div className="p-4">
                  <Textarea
                    value={notities}
                    onChange={(e) => { setNotities(e.target.value); markDirty() }}
                    placeholder="Opmerkingen die op de offerte getoond worden..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Voorwaarden</h3>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      if (val === '__save__') {
                        setShowSaveTemplateInput(true)
                        return
                      }
                      if (val.startsWith('__delete__:')) {
                        handleDeleteVoorwaardenTemplate(val.replace('__delete__:', ''))
                        return
                      }
                      const tmpl = allVoorwaardenTemplates.find(t => t.naam === val)
                      if (tmpl) {
                        setVoorwaarden(tmpl.tekst)
                        markDirty()
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs border-dashed">
                      <SelectValue placeholder="Template laden..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allVoorwaardenTemplates.map((tmpl, i) => (
                        <SelectItem key={`${tmpl.naam}-${i}`} value={tmpl.naam} className="text-xs">
                          {tmpl.naam}
                          {i >= BUILTIN_VOORWAARDEN.length && (
                            <span className="ml-1 text-muted-foreground">(eigen)</span>
                          )}
                        </SelectItem>
                      ))}
                      <SelectItem value="__save__" className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        + Huidige opslaan als template
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 space-y-2">
                  {showSaveTemplateInput && (
                    <div className="flex gap-2">
                      <Input
                        value={templateNaam}
                        onChange={(e) => setTemplateNaam(e.target.value)}
                        placeholder="Template naam..."
                        className="text-xs h-8 flex-1"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVoorwaardenTemplate(); if (e.key === 'Escape') setShowSaveTemplateInput(false) }}
                      />
                      <Button size="sm" className="h-8 text-xs px-3" onClick={handleSaveVoorwaardenTemplate} disabled={!templateNaam.trim()}>
                        <Save className="h-3 w-3 mr-1" />
                        Opslaan
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => setShowSaveTemplateInput(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <Textarea
                    value={voorwaarden}
                    onChange={(e) => { setVoorwaarden(e.target.value); markDirty() }}
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vorige
              </Button>
              <Button onClick={() => setCurrentStep(2)} disabled={!canProceedStep1} className="bg-gradient-to-r from-accent to-primary border-0 px-8" size="lg">
                Preview bekijken
                <Eye className="h-4 w-4 ml-2" />
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
                aanhef,
                inleiding_tekst: inleidingTekst,
                afsluiting_tekst: afsluitingTekst,
                status: 'concept',
                klant_id: selectedKlantId,
                geldig_tot: geldigTot,
                notities,
                voorwaarden,
                created_at: new Date().toISOString(),
              }}
              items={items.map((item) => ({
                beschrijving: item.beschrijving,
                aantal: item.aantal,
                eenheidsprijs: item.eenheidsprijs,
                btw_percentage: item.btw_percentage,
                korting_percentage: item.korting_percentage,
              }))}
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
                  {isSaving ? 'Opslaan...' : isEditMode ? 'Opslaan' : 'Opslaan als Concept'}
                </Button>
                {!isEditMode && (
                  <Button onClick={() => saveOfferte('verzonden')} disabled={isSaving} className="bg-gradient-to-r from-accent to-primary border-0">
                    <Send className="h-4 w-4 mr-2" />
                    {isSaving ? 'Verzenden...' : 'Verzenden'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* STICKY BOTTOM BAR — Inkoop, Montage, Marge, Winst, Totaal      */}
      {/* Altijd zichtbaar — glaseffect                                   */}
      {/* ================================================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border-t border-white/20 dark:border-gray-700/50 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Inkoop + Montage-uren + Marge + Winst */}
            <div className="flex items-center gap-5">
              {/* Inkoop */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-100/80 dark:bg-orange-900/30 flex items-center justify-center backdrop-blur-sm">
                  <ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Inkoop</p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(totaalInkoop)}
                  </p>
                </div>
              </div>

              <div className="w-px h-10 bg-gray-300/50 dark:bg-gray-600/50" />

              {/* Montage-uren */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100/80 dark:bg-blue-900/30 flex items-center justify-center backdrop-blur-sm">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Montage</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {totaalMontageUren > 0 ? `${totaalMontageUren} uur` : '—'}
                  </p>
                </div>
              </div>

              <div className="w-px h-10 bg-gray-300/50 dark:bg-gray-600/50" />

              {/* Marge % */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center backdrop-blur-sm',
                  margePercentage >= 30 ? 'bg-green-100/80 dark:bg-green-900/30' :
                  margePercentage >= 15 ? 'bg-yellow-100/80 dark:bg-yellow-900/30' :
                  'bg-red-100/80 dark:bg-red-900/30'
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

              <div className="w-px h-10 bg-gray-300/50 dark:bg-gray-600/50" />

              {/* Winst ex BTW */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center backdrop-blur-sm',
                  winstExBtw > 0 ? 'bg-green-100/80 dark:bg-green-900/30' : 'bg-gray-100/80 dark:bg-gray-800/50'
                )}>
                  <TrendingUp className={cn(
                    'h-4 w-4',
                    winstExBtw > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                  )} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Winst</p>
                  <p className={cn(
                    'text-sm font-bold',
                    winstExBtw > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  )}>
                    {formatCurrency(winstExBtw)}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Subtotaal + BTW = Totaal ex BTW */}
            <div className="flex items-center gap-4">
              <div className="w-px h-10 bg-gray-300/50 dark:bg-gray-600/50" />

              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Subtotaal</p>
                  <p className="text-sm font-medium text-muted-foreground text-right">{formatCurrency(subtotaal)}</p>
                </div>
                <div className="w-px h-10 bg-gray-300/50 dark:bg-gray-600/50" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">BTW</p>
                  <p className="text-sm font-medium text-muted-foreground text-right">{formatCurrency(btwBedrag)}</p>
                </div>
                <div className="w-px h-10 bg-gray-300/50 dark:bg-gray-600/50" />
                <div className="bg-gradient-to-r from-accent to-primary rounded-xl px-5 py-2 shadow-lg shadow-primary/20">
                  <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">Totaal ex BTW</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(subtotaal)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation dialog ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offerte verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je offerte "{offerteTitel}" ({offerteNummer}) wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOfferte}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
