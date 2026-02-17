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
} from 'lucide-react'
import { getKlanten, createOfferte, createOfferteItem } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Klant } from '@/types'
import { generateOffertePDF } from '@/services/pdfService'
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

const steps = [
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
  const [currentStep, setCurrentStep] = useState(1)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
  }, [])

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

  // Item handlers
  const handleAddItem = () => {
    const newItem: QuoteLineItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      beschrijving: '',
      aantal: 1,
      eenheidsprijs: 0,
      btw_percentage: standaardBtw,
      korting_percentage: 0,
      totaal: 0,
    }
    setItems([...items, newItem])
  }

  const handleUpdateItem = (id: string, field: keyof QuoteLineItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        // Recalculate totaal
        const bruto = updated.aantal * updated.eenheidsprijs
        updated.totaal = bruto - bruto * (updated.korting_percentage / 100)
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

  // Step validation
  const canProceedStep1 = selectedKlantId && offerteTitel.trim().length > 0
  const canProceedStep2 = items.length > 0

  // Calculate preview totals
  const subtotaal = items.reduce((sum, item) => {
    const bruto = item.aantal * item.eenheidsprijs
    return sum + (bruto - bruto * (item.korting_percentage / 100))
  }, 0)

  const saveOfferte = async (status: 'concept' | 'verzonden') => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const btwBedrag = items.reduce((sum, item) => {
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
      const btwBedrag = items.reduce((sum, item) => {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nieuwe Offerte</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
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
                    // Allow navigating to previous steps or current
                    if (step.number <= currentStep) setCurrentStep(step.number)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : isCompleted
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 cursor-pointer'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.number}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
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

      {/* Step Content */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
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
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {selectedKlant.bedrijfsnaam}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedKlant.contactpersoon}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        {selectedKlant.adres}, {selectedKlant.postcode} {selectedKlant.stad}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
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
                <FileText className="h-5 w-5 text-blue-600" />
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
          <div className="flex justify-end">
            <Button onClick={() => setCurrentStep(2)} disabled={!canProceedStep1}>
              Volgende
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Offerte Items
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
              <Button onClick={handleVerzenden} disabled={isSaving}>
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
