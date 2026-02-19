import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  Copy,
  Building2,
  Contact,
  LayoutTemplate,
  FolderOpen,
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react'
import { getKlanten, getProjecten, getProjectenByKlant, createOfferte, createOfferteItem, getOfferteTemplates } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Klant, Project, OfferteTemplate, OfferteTemplateRegel } from '@/types'
import { generateOffertePDF } from '@/services/pdfService'
import { sendEmail } from '@/services/gmailService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { cn, formatCurrency } from '@/lib/utils'
import { QuoteItemsTable, type QuoteLineItem } from './QuoteItemsTable'
import { ForgeQuotePreview } from './ForgeQuotePreview'
import type { CalculatieRegel } from '@/types'

const DEFAULT_VOORWAARDEN = `1. Deze offerte is geldig gedurende de aangegeven termijn.
2. Betaling dient te geschieden binnen 30 dagen na factuurdatum.
3. Alle genoemde bedragen zijn exclusief BTW, tenzij anders vermeld.
4. Levertijd wordt in overleg bepaald na akkoord op deze offerte.
5. Op al onze leveringen en diensten zijn onze algemene voorwaarden van toepassing.
6. Kleuren en materialen kunnen licht afwijken van getoonde voorbeelden.
7. Wijzigingen na akkoord kunnen tot meerkosten leiden.
8. Garantie: 2 jaar op materiaal en constructie, 1 jaar op elektronica.`

// ============================================================
// PREMADE TEMPLATES
// ============================================================

function makeCalcItem(beschrijving: string): OfferteTemplateRegel {
  return {
    soort: 'tekst',
    beschrijving,
    extra_velden: {
      'Aantal': '',
      'Afmeting': '',
      'Materiaal': '',
      'Lay-out': '',
      'Montage': '',
      'Opmerking': '',
    },
    aantal: 0,
    eenheidsprijs: 0,
    btw_percentage: 0,
    korting_percentage: 0,
  }
}

function makePrijsRegel(beschrijving: string): OfferteTemplateRegel {
  return {
    soort: 'prijs',
    beschrijving,
    extra_velden: {},
    aantal: 1,
    eenheidsprijs: 0,
    btw_percentage: 21,
    korting_percentage: 0,
  }
}

const PREMADE_TEMPLATES: Array<{
  id: string
  naam: string
  beschrijving: string
  icon: string
  regels: OfferteTemplateRegel[]
}> = [
  {
    id: 'tpl-textielframes',
    naam: 'Textielframes',
    beschrijving: 'Textielframes met print en montage',
    icon: '🖼️',
    regels: [
      makeCalcItem('Textielframe'),
      makePrijsRegel('Textielframe incl. print'),
    ],
  },
  {
    id: 'tpl-autobelettering',
    naam: 'Autobelettering',
    beschrijving: 'Voertuigbelettering en wrapping',
    icon: '🚗',
    regels: [
      makeCalcItem('Autobelettering'),
      makePrijsRegel('Autobelettering incl. montage'),
    ],
  },
  {
    id: 'tpl-offerte-algemeen',
    naam: 'Offerte algemeen',
    beschrijving: 'Standaard offerte met calculatie-item',
    icon: '📋',
    regels: [
      makeCalcItem('Item 1'),
      makePrijsRegel('Totaal item 1'),
    ],
  },
  {
    id: 'tpl-offerte-3-items',
    naam: 'Offerte 3 items',
    beschrijving: 'Offerte met 3 calculatie-items',
    icon: '📦',
    regels: [
      makeCalcItem('Item 1'),
      makePrijsRegel('Totaal item 1'),
      makeCalcItem('Item 2'),
      makePrijsRegel('Totaal item 2'),
      makeCalcItem('Item 3'),
      makePrijsRegel('Totaal item 3'),
    ],
  },
  {
    id: 'tpl-offerte-4-items',
    naam: 'Offerte 4 items',
    beschrijving: 'Offerte met 4 calculatie-items',
    icon: '📦',
    regels: [
      makeCalcItem('Item 1'),
      makePrijsRegel('Totaal item 1'),
      makeCalcItem('Item 2'),
      makePrijsRegel('Totaal item 2'),
      makeCalcItem('Item 3'),
      makePrijsRegel('Totaal item 3'),
      makeCalcItem('Item 4'),
      makePrijsRegel('Totaal item 4'),
    ],
  },
  {
    id: 'tpl-lichtreclame',
    naam: 'Lichtreclame',
    beschrijving: 'LED, neon, doosletters',
    icon: '💡',
    regels: [
      makeCalcItem('Lichtreclame'),
      makePrijsRegel('Lichtreclame incl. montage'),
    ],
  },
  {
    id: 'tpl-teksten-borden',
    naam: 'Teksten & borden',
    beschrijving: 'Borden, panelen en bewegwijzering',
    icon: '🪧',
    regels: [
      makeCalcItem('Teksten en borden'),
      makePrijsRegel('Teksten en borden incl. montage'),
    ],
  },
  {
    id: 'tpl-vlaggen',
    naam: 'Vlaggen',
    beschrijving: 'Vlaggen, banieren en beachflags',
    icon: '🚩',
    regels: [
      makeCalcItem('Vlaggen'),
      makePrijsRegel('Vlaggen incl. levering'),
    ],
  },
  {
    id: 'tpl-gevelreclame',
    naam: 'Gevelreclame',
    beschrijving: 'Gevelborden, letters en signing',
    icon: '🏢',
    regels: [
      makeCalcItem('Gevelreclame'),
      makePrijsRegel('Gevelreclame incl. montage'),
    ],
  },
  {
    id: 'tpl-raambelettering',
    naam: 'Raambelettering',
    beschrijving: 'Raamfolie, etched glass, fullcolor',
    icon: '🪟',
    regels: [
      makeCalcItem('Raambelettering'),
      makePrijsRegel('Raambelettering incl. montage'),
    ],
  },
  {
    id: 'tpl-wayfinding',
    naam: 'Wayfinding',
    beschrijving: 'Bewegwijzering en wayfinding systeem',
    icon: '🧭',
    regels: [
      makeCalcItem('Wayfinding systeem'),
      makePrijsRegel('Wayfinding incl. montage'),
    ],
  },
  {
    id: 'tpl-wrapping',
    naam: 'Wrapping',
    beschrijving: 'Full wrap, partial wrap',
    icon: '🎨',
    regels: [
      makeCalcItem('Wrapping'),
      makePrijsRegel('Wrapping incl. montage'),
    ],
  },
]

const steps = [
  { number: 0, label: 'Klant & Template', icon: User },
  { number: 1, label: 'Items', icon: FileText },
  { number: 2, label: 'Preview', icon: Eye },
]

function generateOfferteNummer(prefix: string = 'OFF'): string {
  const year = new Date().getFullYear()
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `${prefix}-${year}-${num}`
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function QuoteCreation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { offertePrefix, offerteGeldigheidDagen, standaardBtw, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur } = useAppSettings()
  const [currentStep, setCurrentStep] = useState(0)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Templates
  const [offerteTemplates, setOfferteTemplates] = useState<OfferteTemplate[]>([])

  // Query params van bijv. projecten-pagina
  const paramKlantId = searchParams.get('klant_id') || ''
  const paramProjectId = searchParams.get('project_id') || ''
  const paramTitel = searchParams.get('titel') || ''

  // ── Step 0: Klant + Project + Template + Details ──
  const [selectedKlantId, setSelectedKlantId] = useState(paramKlantId)
  const [selectedProjectId, setSelectedProjectId] = useState(paramProjectId)
  const [klantSearch, setKlantSearch] = useState('')
  const [offerteTitel, setOfferteTitel] = useState(paramTitel)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [contactpersoon, setContactpersoon] = useState('')
  const [geldigTot, setGeldigTot] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + offerteGeldigheidDagen)
    return d.toISOString().split('T')[0]
  })
  const [offerteNummer] = useState(() => generateOfferteNummer(offertePrefix))

  // ── Step 1: Items ──
  const [items, setItems] = useState<QuoteLineItem[]>([])
  const [notities, setNotities] = useState('')
  const [voorwaarden, setVoorwaarden] = useState(DEFAULT_VOORWAARDEN)
  const [showTemplateImport, setShowTemplateImport] = useState(false)

  // ── Computed ──
  const selectedKlant = klanten.find((k) => k.id === selectedKlantId)
  const selectedProject = projecten.find((p) => p.id === selectedProjectId)
  const klantProjecten = useMemo(() =>
    projecten.filter((p) => p.klant_id === selectedKlantId),
    [projecten, selectedKlantId]
  )

  const allTemplates = useMemo(() => {
    const premade = PREMADE_TEMPLATES.map((t) => ({
      id: t.id,
      user_id: 'system',
      naam: t.naam,
      beschrijving: t.beschrijving,
      regels: t.regels,
      actief: true,
      created_at: '',
      updated_at: '',
      _icon: t.icon,
    }))
    return [...premade, ...offerteTemplates.map((t) => ({ ...t, _icon: '📄' }))]
  }, [offerteTemplates])

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

  const subtotaal = prijsItems.reduce((sum, item) => {
    const bruto = item.aantal * item.eenheidsprijs
    return sum + (bruto - bruto * (item.korting_percentage / 100))
  }, 0)

  const btwBedrag = prijsItems.reduce((sum, item) => {
    const bruto = item.aantal * item.eenheidsprijs
    const netto = bruto - bruto * (item.korting_percentage / 100)
    return sum + netto * (item.btw_percentage / 100)
  }, 0)

  // Inkoop = sum of all calculatie_regels inkoop_prijs * aantal
  const totaalInkoop = useMemo(() => {
    return prijsItems.reduce((sum, item) => {
      if (item.calculatie_regels && item.calculatie_regels.length > 0) {
        return sum + item.calculatie_regels.reduce((s, r) => s + r.inkoop_prijs * r.aantal, 0)
      }
      return sum
    }, 0)
  }, [prijsItems])

  const winstExBtw = subtotaal - totaalInkoop
  const margePercentage = subtotaal > 0 ? ((winstExBtw / subtotaal) * 100) : 0

  // ── Data fetching ──
  useEffect(() => {
    Promise.all([
      getKlanten(),
      getProjecten(),
      getOfferteTemplates(),
    ])
      .then(([klantenData, projectenData, templatesData]) => {
        setKlanten(klantenData)
        setProjecten(projectenData)
        setOfferteTemplates(templatesData.filter((t) => t.actief))
      })
      .catch((err) => {
        console.error('Failed to fetch data:', err)
        toast.error('Kon data niet laden')
      })
      .finally(() => setIsLoading(false))
  }, [])

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
    if (selectedKlant?.contactpersoon && !contactpersoon) {
      setContactpersoon(selectedKlant.contactpersoon)
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

  // ── Item handlers ──
  const handleAddItem = (soort: 'prijs' | 'tekst' = 'prijs') => {
    const newItem: QuoteLineItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      soort,
      beschrijving: '',
      extra_velden: {},
      aantal: soort === 'prijs' ? 1 : 0,
      eenheidsprijs: 0,
      btw_percentage: soort === 'prijs' ? standaardBtw : 0,
      korting_percentage: 0,
      totaal: 0,
    }
    setItems([...items, newItem])
  }

  const handleUpdateItem = (id: string, field: keyof QuoteLineItem, value: any) => {
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

  // Template importeren
  const handleImportTemplate = (template: typeof allTemplates[0]) => {
    const regels = template.regels
    const newItems: QuoteLineItem[] = regels.map((regel: OfferteTemplateRegel, idx: number) => ({
      id: `tpl-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      soort: regel.soort,
      beschrijving: regel.beschrijving,
      extra_velden: { ...regel.extra_velden },
      aantal: regel.aantal,
      eenheidsprijs: regel.eenheidsprijs,
      btw_percentage: regel.btw_percentage,
      korting_percentage: regel.korting_percentage,
      totaal: regel.soort === 'prijs'
        ? (regel.aantal * regel.eenheidsprijs) - (regel.aantal * regel.eenheidsprijs * (regel.korting_percentage / 100))
        : 0,
    }))
    setItems([...items, ...newItems])
    setShowTemplateImport(false)
    toast.success(`Template "${template.naam}" toegevoegd`)
  }

  // Apply template from step 0 selection
  const handleApplyTemplate = (templateId: string) => {
    if (!templateId || templateId === 'geen') return
    const template = allTemplates.find((t) => t.id === templateId)
    if (!template) return
    const regels = template.regels
    const newItems: QuoteLineItem[] = regels.map((regel: OfferteTemplateRegel, idx: number) => ({
      id: `tpl-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      soort: regel.soort,
      beschrijving: regel.beschrijving,
      extra_velden: { ...regel.extra_velden },
      aantal: regel.aantal,
      eenheidsprijs: regel.eenheidsprijs,
      btw_percentage: regel.btw_percentage,
      korting_percentage: regel.korting_percentage,
      totaal: regel.soort === 'prijs'
        ? (regel.aantal * regel.eenheidsprijs) - (regel.aantal * regel.eenheidsprijs * (regel.korting_percentage / 100))
        : 0,
    }))
    setItems(newItems)
  }

  // ── Step navigation ──
  const canProceedStep0 = selectedKlantId && offerteTitel.trim().length > 0
  const canProceedStep1 = items.length > 0

  const handleStep0Next = () => {
    if (selectedTemplateId && items.length === 0) {
      handleApplyTemplate(selectedTemplateId)
    }
    setCurrentStep(1)
  }

  // ── Save ──
  const saveOfferte = async (status: 'concept' | 'verzonden') => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const newOfferte = await createOfferte({
        user_id: user?.id || 'demo',
        klant_id: selectedKlantId,
        ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
        nummer: offerteNummer,
        titel: offerteTitel,
        status,
        subtotaal,
        btw_bedrag: btwBedrag,
        totaal: subtotaal + btwBedrag,
        geldig_tot: geldigTot,
        notities,
        voorwaarden,
      })

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
          })
        )
      )

      if (status === 'verzonden' && selectedKlant?.email) {
        try {
          const { subject, html } = offerteVerzendTemplate({
            klantNaam: selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam,
            offerteNummer,
            offerteTitel,
            totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(subtotaal + btwBedrag),
            geldigTot,
          })
          await sendEmail(selectedKlant.email, subject, '', { html })
        } catch (emailErr) {
          console.error('Email verzenden mislukt:', emailErr)
          toast.error('Offerte opgeslagen maar email niet verzonden')
        }
      }

      toast.success(
        status === 'concept'
          ? 'Offerte opgeslagen als concept'
          : 'Offerte verzonden naar klant'
      )
      navigate('/offertes')
    } catch (err) {
      console.error('Failed to save offerte:', err)
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
        user_id: user?.id || 'demo',
        klant_id: selectedKlantId,
        nummer: offerteNummer,
        titel: offerteTitel,
        status: 'concept' as const,
        subtotaal,
        btw_bedrag: btwBedrag,
        totaal: subtotaal + btwBedrag,
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
      })
      doc.save(`${offerteNummer}.pdf`)
      toast.success('PDF gedownload')
    } catch (err) {
      console.error('Failed to generate PDF:', err)
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
            <Link to="/offertes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Nieuwe Offerte</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{offerteNummer}</p>
            </div>
          </div>
          {/* Quick info badges */}
          {selectedKlant && (
            <div className="hidden md:flex items-center gap-2">
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
            </div>
          )}
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

            {/* ── Template selectie als kaarten ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <LayoutTemplate className="h-3.5 w-3.5 text-white" />
                  </div>
                  Start met template
                  <span className="text-xs text-muted-foreground font-normal">(optioneel)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {/* Leeg beginnen */}
                  <button
                    onClick={() => setSelectedTemplateId('geen')}
                    className={cn(
                      'text-left p-3 rounded-xl border-2 transition-all',
                      (!selectedTemplateId || selectedTemplateId === 'geen')
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className="text-xl mb-1">📝</div>
                    <p className="text-sm font-medium text-foreground">Leeg beginnen</p>
                    <p className="text-[11px] text-muted-foreground">Voeg zelf items toe</p>
                  </button>

                  {/* Premade templates */}
                  {PREMADE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={cn(
                        'text-left p-3 rounded-xl border-2 transition-all',
                        selectedTemplateId === tpl.id
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <div className="text-xl mb-1">{tpl.icon}</div>
                      <p className="text-sm font-medium text-foreground truncate">{tpl.naam}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{tpl.beschrijving}</p>
                    </button>
                  ))}

                  {/* User templates */}
                  {offerteTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={cn(
                        'text-left p-3 rounded-xl border-2 transition-all',
                        selectedTemplateId === tpl.id
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <div className="text-xl mb-1">📄</div>
                      <p className="text-sm font-medium text-foreground truncate">{tpl.naam}</p>
                      <p className="text-[11px] text-muted-foreground">{tpl.regels.length} regels</p>
                    </button>
                  ))}
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
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5 text-white" />
                    </div>
                    Offerte Items
                  </CardTitle>
                  {/* Template importeren knop */}
                  {allTemplates.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateImport(!showTemplateImport)}
                      className="gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Template importeren
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Template import panel */}
                {showTemplateImport && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        Template toevoegen aan items
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowTemplateImport(false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {allTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => handleImportTemplate(tpl)}
                          className="text-left p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-sm transition-all"
                        >
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <span>{(tpl as any)._icon || '📄'}</span>
                            {tpl.naam}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {tpl.regels.length} regels
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <QuoteItemsTable
                  items={items}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItemWithCalculatie={handleUpdateItemWithCalculatie}
                />
              </CardContent>
            </Card>

            {/* Notities & Voorwaarden */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Notities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notities}
                    onChange={(e) => setNotities(e.target.value)}
                    placeholder="Interne notities of opmerkingen voor de klant..."
                    rows={4}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Voorwaarden
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={voorwaarden}
                    onChange={(e) => setVoorwaarden(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>
            </div>

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
                  {isSaving ? 'Opslaan...' : 'Opslaan als Concept'}
                </Button>
                <Button onClick={() => saveOfferte('verzonden')} disabled={isSaving} className="bg-gradient-to-r from-accent to-primary border-0">
                  <Send className="h-4 w-4 mr-2" />
                  {isSaving ? 'Verzenden...' : 'Verzenden'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* STICKY BOTTOM BAR — Inkoop, Marge, Winst                        */}
      {/* Altijd zichtbaar in stap 1 en 2                                  */}
      {/* ================================================================ */}
      {(currentStep === 1 || currentStep === 2) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-5xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between gap-6">
              {/* Left: Inkoop info */}
              <div className="flex items-center gap-6">
                {/* Inkoop */}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Inkoop</p>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(totaalInkoop)}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />

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

                {/* Divider */}
                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />

                {/* Winst ex BTW */}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center',
                    winstExBtw > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
                  )}>
                    <TrendingUp className={cn(
                      'h-4 w-4',
                      winstExBtw > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                    )} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Winst ex BTW</p>
                    <p className={cn(
                      'text-sm font-bold',
                      winstExBtw > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    )}>
                      {formatCurrency(winstExBtw)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Totaal */}
              <div className="flex items-center gap-6">
                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />

                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Subtotaal ex BTW</p>
                    <p className="text-sm font-medium text-muted-foreground text-right">{formatCurrency(subtotaal)}</p>
                  </div>
                  <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">BTW</p>
                    <p className="text-sm font-medium text-muted-foreground text-right">{formatCurrency(btwBedrag)}</p>
                  </div>
                  <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
                  <div className="bg-gradient-to-r from-accent to-primary rounded-xl px-5 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">Totaal incl BTW</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(subtotaal + btwBedrag)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
