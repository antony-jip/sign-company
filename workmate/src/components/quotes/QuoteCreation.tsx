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
  ClipboardList,
  Building2,
  Contact,
  LayoutTemplate,
} from 'lucide-react'
import { getKlanten, createOfferte, createOfferteItem, getOfferteTemplates } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Klant, OfferteTemplate, OfferteTemplateRegel } from '@/types'
import { generateOffertePDF } from '@/services/pdfService'
import { sendEmail } from '@/services/gmailService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { formatCurrency } from '@/lib/utils'
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
// PREMADE TEMPLATES - vooringestelde offerte-templates voor reclame bedrijven
// Elke calculatie-item heeft tekstvelden: Omschrijving, Aantal, Afmeting,
// Materiaal, Lay-out, Montage, Opmerking + een Prijs-regel
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
    naam: 'Offerte algemeen inclusief calculatie',
    beschrijving: 'Standaard offerte met calculatie-item',
    icon: '📋',
    regels: [
      makeCalcItem('Item 1'),
      makePrijsRegel('Totaal item 1'),
    ],
  },
  {
    id: 'tpl-offerte-3-items',
    naam: 'Offerte incl. calculatie 3 items',
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
    naam: 'Offerte incl. calculatie 4 items',
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
    naam: 'Offerte lichtreclame inclusief calculatie',
    beschrijving: 'Lichtreclame (LED, neon, doosletters)',
    icon: '💡',
    regels: [
      makeCalcItem('Lichtreclame'),
      makePrijsRegel('Lichtreclame incl. montage'),
    ],
  },
  {
    id: 'tpl-teksten-borden',
    naam: 'Teksten en borden incl. calculatie',
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
]

const offerteStatusOpties = [
  { value: 'concept', label: 'Concept', kleur: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'verzonden', label: 'Verzonden', kleur: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
]

const steps = [
  { number: 0, label: 'Overzicht', icon: ClipboardList },
  { number: 1, label: 'Klant Selecteren', icon: User },
  { number: 2, label: 'Items Toevoegen', icon: FileText },
  { number: 3, label: 'Preview', icon: Eye },
]

function generateOfferteNummer(prefix: string = 'OFF'): string {
  const year = new Date().getFullYear()
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `${prefix}-${year}-${num}`
}

export function QuoteCreation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { offertePrefix, offerteGeldigheidDagen, standaardBtw, valuta, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur, profile } = useAppSettings()
  const [currentStep, setCurrentStep] = useState(0) // Start at overview step
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Templates voor importeren (user-created + premade)
  const [offerteTemplates, setOfferteTemplates] = useState<OfferteTemplate[]>([])
  const [showTemplateSelect, setShowTemplateSelect] = useState(false)

  // Query params van bijv. projecten-pagina
  const paramKlantId = searchParams.get('klant_id') || ''
  const paramProjectId = searchParams.get('project_id') || ''
  const paramTitel = searchParams.get('titel') || ''

  useEffect(() => {
    getKlanten()
      .then((data) => setKlanten(data))
      .catch((err) => {
        console.error('Failed to fetch klanten:', err)
        toast.error('Kon klanten niet laden')
      })
      .finally(() => setIsLoading(false))
    // Laad offerte templates
    getOfferteTemplates()
      .then((data) => setOfferteTemplates(data.filter((t) => t.actief)))
      .catch(console.error)
  }, [])

  // Step 0: Overview fields
  const [offerteOmschrijving, setOfferteOmschrijving] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [offerteInitStatus, setOfferteInitStatus] = useState<string>('concept')
  const [contactpersoon, setContactpersoon] = useState('')
  const [vestiging, setVestiging] = useState('')

  // Step 1: Client & basic info - pre-fill vanuit query params
  const [selectedKlantId, setSelectedKlantId] = useState(paramKlantId)
  const [klantSearch, setKlantSearch] = useState('')
  const [offerteTitel, setOfferteTitel] = useState(paramTitel)
  const [geldigTot, setGeldigTot] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + offerteGeldigheidDagen)
    return d.toISOString().split('T')[0]
  })
  const [offerteNummer] = useState(() => generateOfferteNummer(offertePrefix))

  // Step 2: Items
  const [items, setItems] = useState<QuoteLineItem[]>([])
  const [notities, setNotities] = useState('')
  const [voorwaarden, setVoorwaarden] = useState(DEFAULT_VOORWAARDEN)

  // Computed
  const selectedKlant = klanten.find((k) => k.id === selectedKlantId)

  // All available templates = user templates + premade
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

  // When selected klant changes, auto-fill contactpersoon
  useEffect(() => {
    if (selectedKlant?.contactpersoon && !contactpersoon) {
      setContactpersoon(selectedKlant.contactpersoon)
    }
  }, [selectedKlant])

  // Item handlers
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
        // Recalculate totaal (alleen voor prijsregels)
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

  // Verwerk calculatieresultaat: update beschrijving, prijs en sla calculatieregels op
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
        // Herbereken totaal
        const bruto = updated.aantal * updated.eenheidsprijs
        updated.totaal = bruto - bruto * (updated.korting_percentage / 100)
        return updated
      })
    )
  }

  // Template importeren: voeg alle regels van een template toe aan de huidige items
  const handleImportTemplate = (template: OfferteTemplate | typeof PREMADE_TEMPLATES[0] & { _icon?: string }) => {
    const regels = 'regels' in template ? template.regels : []
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
    setShowTemplateSelect(false)
    toast.success(`Template "${template.naam}" geïmporteerd (${regels.length} regels)`)
  }

  // Apply selected template from overview
  const handleApplyOverviewTemplate = (templateId: string) => {
    if (!templateId) return
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

  // Handle proceeding from overview step
  const handleOverviewNext = () => {
    // Use omschrijving as title if title is empty
    if (!offerteTitel && offerteOmschrijving) {
      setOfferteTitel(offerteOmschrijving)
    }
    // Apply template if selected and items are empty
    if (selectedTemplateId && items.length === 0) {
      handleApplyOverviewTemplate(selectedTemplateId)
    }
    setCurrentStep(1)
  }

  // Step validation
  const canProceedStep0 = offerteOmschrijving.trim().length > 0
  const canProceedStep1 = selectedKlantId && offerteTitel.trim().length > 0
  const canProceedStep2 = items.length > 0

  // Calculate preview totals (alleen prijsregels)
  const prijsItems = items.filter((i) => i.soort === 'prijs')
  const subtotaal = prijsItems.reduce((sum, item) => {
    const bruto = item.aantal * item.eenheidsprijs
    return sum + (bruto - bruto * (item.korting_percentage / 100))
  }, 0)

  const saveOfferte = async (status: 'concept' | 'verzonden') => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const btwBedrag = prijsItems.reduce((sum, item) => {
        const bruto = item.aantal * item.eenheidsprijs
        const netto = bruto - bruto * (item.korting_percentage / 100)
        return sum + netto * (item.btw_percentage / 100)
      }, 0)

      const newOfferte = await createOfferte({
        user_id: user?.id || 'demo',
        klant_id: selectedKlantId,
        ...(paramProjectId ? { project_id: paramProjectId } : {}),
        nummer: offerteNummer,
        titel: offerteTitel,
        status,
        subtotaal,
        btw_bedrag: btwBedrag,
        totaal: subtotaal + btwBedrag,
        geldig_tot: geldigTot,
        notities: notities || offerteOmschrijving,
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

      // Send email to klant when status is 'verzonden'
      if (status === 'verzonden' && selectedKlant?.email) {
        try {
          const { subject, html } = offerteVerzendTemplate({
            klantNaam: selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam,
            offerteNummer: offerteNummer,
            offerteTitel: offerteTitel,
            totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(subtotaal + btwBedrag),
            geldigTot: geldigTot,
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
      toast.error('Kon offerte niet opslaan. Probeer het opnieuw.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveConcept = () => {
    saveOfferte('concept')
  }

  const handleVerzenden = () => {
    saveOfferte('verzonden')
  }

  const handleDownloadPdf = () => {
    if (!selectedKlant) {
      toast.error('Selecteer eerst een klant')
      return
    }
    try {
      toast.info('PDF wordt gegenereerd...')
      const btwBedrag = prijsItems.reduce((sum, item) => {
        const bruto = item.aantal * item.eenheidsprijs
        const netto = bruto - bruto * (item.korting_percentage / 100)
        return sum + netto * (item.btw_percentage / 100)
      }, 0)
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link to="/offertes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Nieuwe Offerte</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {offerteNummer}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 dark:bg-primary/20 text-accent dark:text-primary'
                      : isCompleted
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 cursor-pointer'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? 'bg-gradient-to-r from-accent to-primary text-white'
                        : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.number + 1}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      currentStep > step.number
                        ? 'bg-green-400 dark:bg-green-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ==================== STEP 0: OVERVIEW ==================== */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                  <ClipboardList className="h-4 w-4 text-white" />
                </div>
                Offerte toevoegen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Omschrijving */}
              <div className="space-y-2">
                <Label htmlFor="overzicht-omschrijving" className="text-sm font-medium">
                  Omschrijving
                </Label>
                <Input
                  id="overzicht-omschrijving"
                  value={offerteOmschrijving}
                  onChange={(e) => setOfferteOmschrijving(e.target.value)}
                  placeholder="bijv. Gevelreclame nieuwe locatie, Autobelettering bedrijfswagen..."
                  className="text-base"
                  autoFocus
                />
              </div>

              {/* Template */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <LayoutTemplate className="h-3.5 w-3.5 text-muted-foreground" />
                  Template
                </Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies een template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geen">
                      <span className="text-muted-foreground">Geen template - leeg beginnen</span>
                    </SelectItem>
                    {/* Premade templates */}
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Standaard templates
                    </div>
                    {PREMADE_TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        <div className="flex items-center gap-2">
                          <span>{tpl.icon}</span>
                          <span className="font-medium">{tpl.naam}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {/* User templates */}
                    {offerteTemplates.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                          Eigen templates
                        </div>
                        {offerteTemplates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            <div className="flex items-center gap-2">
                              <span>📄</span>
                              <span className="font-medium">{tpl.naam}</span>
                              <span className="text-xs text-muted-foreground">({tpl.regels.length} regels)</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {/* Template preview */}
                {selectedTemplateId && selectedTemplateId !== 'geen' && (() => {
                  const tpl = allTemplates.find((t) => t.id === selectedTemplateId)
                  if (!tpl) return null
                  const tekstRegels = tpl.regels.filter((r: OfferteTemplateRegel) => r.soort === 'tekst')
                  const prijsRegels = tpl.regels.filter((r: OfferteTemplateRegel) => r.soort === 'prijs')
                  return (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Template bevat:</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="bg-primary/10 text-accent dark:text-primary px-2 py-0.5 rounded-full font-medium">
                          {tekstRegels.length} calculatie-item{tekstRegels.length !== 1 ? 's' : ''}
                        </span>
                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                          {prijsRegels.length} prijsregel{prijsRegels.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {tekstRegels.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Tekstvelden per item:</span>{' '}
                          {Object.keys(tekstRegels[0]?.extra_velden || {}).join(', ') || 'Geen'}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Offertestatus */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Offertestatus</Label>
                <div className="flex items-center gap-2">
                  {offerteStatusOpties.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setOfferteInitStatus(opt.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        offerteInitStatus === opt.value
                          ? 'border-primary bg-primary/10 text-accent dark:text-primary'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-muted-foreground hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contactpersoon */}
              <div className="space-y-2">
                <Label htmlFor="overzicht-contact" className="text-sm font-medium flex items-center gap-1.5">
                  <Contact className="h-3.5 w-3.5 text-muted-foreground" />
                  Contactpersoon
                </Label>
                <Input
                  id="overzicht-contact"
                  value={contactpersoon}
                  onChange={(e) => setContactpersoon(e.target.value)}
                  placeholder="Naam contactpersoon..."
                />
              </div>

              {/* Vestiging */}
              <div className="space-y-2">
                <Label htmlFor="overzicht-vestiging" className="text-sm font-medium flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Vestiging
                </Label>
                <Input
                  id="overzicht-vestiging"
                  value={vestiging}
                  onChange={(e) => setVestiging(e.target.value)}
                  placeholder="Locatie / vestiging..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Step 0 Navigation */}
          <div className="flex justify-end">
            <Button
              onClick={handleOverviewNext}
              disabled={!canProceedStep0}
              className="bg-gradient-to-r from-accent to-primary border-0"
            >
              Volgende
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ==================== STEP 1: CLIENT ==================== */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                Klant Selecteren
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={klantSearch}
                  onChange={(e) => setKlantSearch(e.target.value)}
                  placeholder="Zoek op bedrijfsnaam, contactpersoon of email..."
                  className="pl-10"
                />
              </div>

              {/* Client Select */}
              <Select value={selectedKlantId} onValueChange={setSelectedKlantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een klant..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredKlanten.map((klant) => (
                    <SelectItem key={klant.id} value={klant.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{klant.bedrijfsnaam}</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-gray-500">{klant.contactpersoon}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected Client Card */}
              {selectedKlant && (
                <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-accent dark:text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">
                        {selectedKlant.bedrijfsnaam}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedKlant.contactpersoon}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedKlant.adres}, {selectedKlant.postcode} {selectedKlant.stad}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedKlant.email} | {selectedKlant.telefoon}
                      </p>
                    </div>
                    <Badge className={`${selectedKlant.status === 'actief' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                      {selectedKlant.status}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                Offerte Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="offerte-titel">Offerte Titel</Label>
                  <Input
                    id="offerte-titel"
                    value={offerteTitel}
                    onChange={(e) => setOfferteTitel(e.target.value)}
                    placeholder="bijv. Gevelreclame nieuwe locatie"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerte-nummer">Offerte Nummer</Label>
                  <Input
                    id="offerte-nummer"
                    value={offerteNummer}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="geldig-tot">Geldig tot</Label>
                  <Input
                    id="geldig-tot"
                    type="date"
                    value={geldigTot}
                    onChange={(e) => setGeldigTot(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 1 Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(0)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vorige
            </Button>
            <Button onClick={() => setCurrentStep(2)} disabled={!canProceedStep1}>
              Volgende
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ==================== STEP 2: ITEMS ==================== */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                Offerte Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Template importeren */}
              {allTemplates.length > 0 && (
                <div className="mb-4">
                  {!showTemplateSelect ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateSelect(true)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Template importeren
                    </Button>
                  ) : (
                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-accent dark:text-primary">
                          Kies een template om te importeren
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTemplateSelect(false)}
                          className="text-xs"
                        >
                          Annuleren
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        De regels uit de template worden toegevoegd aan je huidige offerte items.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {allTemplates.map((tpl) => (
                          <button
                            key={tpl.id}
                            onClick={() => handleImportTemplate(tpl as any)}
                            className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-primary dark:hover:border-primary hover:shadow-sm transition-all"
                          >
                            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              <span>{(tpl as any)._icon || '📄'}</span>
                              {tpl.naam}
                            </p>
                            {tpl.beschrijving && (
                              <p className="text-xs text-muted-foreground mt-0.5">{tpl.beschrijving}</p>
                            )}
                            <p className="text-xs text-primary mt-1">
                              {tpl.regels.length} regel(s)
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
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
              <CardHeader className="pb-3">
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

          {/* Step 2 Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vorige
            </Button>
            <Button onClick={() => setCurrentStep(3)} disabled={!canProceedStep2}>
              Volgende
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ==================== STEP 3: PREVIEW ==================== */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Preview */}
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

          {/* Step 3 Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vorige
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="secondary" onClick={handleSaveConcept} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Opslaan...' : 'Opslaan als Concept'}
              </Button>
              <Button onClick={handleVerzenden} disabled={isSaving} className="bg-gradient-to-r from-accent to-primary border-0">
                <Send className="h-4 w-4 mr-2" />
                {isSaving ? 'Verzenden...' : 'Verzenden'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
