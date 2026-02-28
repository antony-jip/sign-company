import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom'
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
  Save,
  Download,
  Send,
  FileText,
  Search,
  Building2,
  Plus,
  Trash2,
  Calendar,
  Hash,
  Euro,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Eye,
  Receipt,
  X,
  Copy,
} from 'lucide-react'
import {
  getKlanten,
  getFacturen,
  getFactuur,
  getFactuurItems,
  createFactuur,
  createFactuurItem,
  updateFactuur,
  getOffertes,
  getOfferteItems,
  generateBetaalToken,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Klant, Factuur, FactuurItem, Offerte, OfferteItem } from '@/types'
import { round2 } from '@/utils/budgetUtils'
import { generateFactuurPDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { sendEmail } from '@/services/gmailService'
import { factuurVerzendTemplate } from '@/services/emailTemplateService'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { logger } from '../../utils/logger'

// ============ TYPES ============

interface LineItem {
  id: string
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
}

// ============ HELPERS ============

function createEmptyLineItem(defaultBtw: number = 21): LineItem {
  return {
    id: crypto.randomUUID(),
    beschrijving: '',
    aantal: 1,
    eenheidsprijs: 0,
    btw_percentage: defaultBtw,
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

function calcBtwGroups(items: LineItem[]): Record<number, number> {
  const groups: Record<number, number> = {}
  items.forEach((item) => {
    const lineTotal = calcLineTotal(item)
    const btwBedrag = round2(lineTotal * (item.btw_percentage / 100))
    groups[item.btw_percentage] = round2((groups[item.btw_percentage] || 0) + btwBedrag)
  })
  return groups
}

function calcBtwBedrag(items: LineItem[]): number {
  return round2(Object.values(calcBtwGroups(items)).reduce((sum, v) => sum + v, 0))
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getDefaultVervaldatum(factuurdatum: string, dagen: number = 30): string {
  const d = new Date(factuurdatum)
  d.setDate(d.getDate() + dagen)
  return d.toISOString().split('T')[0]
}

function generateFactuurNummer(prefix: string, existing: { nummer: string }[]): string {
  const year = new Date().getFullYear()
  const jaarPrefix = `${prefix}-${year}-`
  const maxNr = existing
    .filter((f) => f.nummer.startsWith(jaarPrefix))
    .reduce((max, f) => Math.max(max, parseInt(f.nummer.replace(jaarPrefix, ''), 10) || 0), 0)
  return `${jaarPrefix}${String(maxNr + 1).padStart(3, '0')}`
}

// ============ MAIN COMPONENT ============

export function FactuurEditor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id: routeId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const {
    settings,
    standaardBtw,
    factuurPrefix,
    factuurBetaaltermijnDagen,
    factuurVoorwaarden,
    factuurIntroTekst,
    factuurOutroTekst,
    bedrijfsnaam,
    primaireKleur,
    emailHandtekening,
    profile,
  } = useAppSettings()
  const documentStyle = useDocumentStyle()

  // ============ STATE ============

  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Existing factuur data (for edit mode)
  const [existingFactuur, setExistingFactuur] = useState<Factuur | null>(null)

  // Query params
  const paramKlantId = searchParams.get('klant_id') || ''
  const paramOfferteId = searchParams.get('offerte_id') || ''
  const paramProjectId = searchParams.get('project_id') || ''
  const paramTitel = searchParams.get('titel') || ''
  const editFactuurId = routeId || ''

  // Form state
  const [klantId, setKlantId] = useState('')
  const [klantSearch, setKlantSearch] = useState('')
  const [showKlantSelector, setShowKlantSelector] = useState(true)
  const [offerteId, setOfferteId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [titel, setTitel] = useState('')
  const [nummer, setNummer] = useState('')
  const [factuurdatum, setFactuurdatum] = useState(getTodayString())
  const [vervaldatum, setVervaldatum] = useState(getDefaultVervaldatum(getTodayString(), factuurBetaaltermijnDagen))
  const [voorwaarden, setVoorwaarden] = useState(factuurVoorwaarden)
  const [notities, setNotities] = useState('')
  const [introTekst, setIntroTekst] = useState(factuurIntroTekst)
  const [outroTekst, setOutroTekst] = useState(factuurOutroTekst)
  const [items, setItems] = useState<LineItem[]>([createEmptyLineItem(standaardBtw)])

  // ============ DATA LOADING ============

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const klantenData = await getKlanten().catch(() => [])
        if (!cancelled) setKlanten(klantenData)

        // Edit mode: load existing factuur
        if (editFactuurId) {
          try {
            const [factuur, factuurItems] = await Promise.all([
              getFactuur(editFactuurId),
              getFactuurItems(editFactuurId),
            ])
            if (!cancelled) {
              setExistingFactuur(factuur)
              setIsEditMode(true)
              setKlantId(factuur.klant_id)
              setShowKlantSelector(false)
              setOfferteId(factuur.offerte_id || '')
              setProjectId(factuur.project_id || '')
              setTitel(factuur.titel)
              setNummer(factuur.nummer)
              setFactuurdatum(factuur.factuurdatum)
              setVervaldatum(factuur.vervaldatum)
              setVoorwaarden(factuur.voorwaarden || '')
              setNotities(factuur.notities || '')
              setIntroTekst(factuur.intro_tekst || '')
              setOutroTekst(factuur.outro_tekst || '')

              if (factuurItems.length > 0) {
                setItems(
                  factuurItems
                    .sort((a, b) => a.volgorde - b.volgorde)
                    .map((fi) => ({
                      id: fi.id,
                      beschrijving: fi.beschrijving,
                      aantal: fi.aantal,
                      eenheidsprijs: fi.eenheidsprijs,
                      btw_percentage: fi.btw_percentage,
                      korting_percentage: fi.korting_percentage,
                    }))
                )
              }
            }
          } catch (err) {
            logger.error('Failed to load factuur for editing:', err)
            if (!cancelled) toast.error('Kon factuur niet laden')
          }
        } else {
          // New factuur: generate nummer
          const bestaande = await getFacturen().catch(() => [])
          if (!cancelled) {
            setNummer(generateFactuurNummer(factuurPrefix, bestaande))
          }

          // Pre-fill from query params
          if (paramKlantId) {
            setKlantId(paramKlantId)
            setShowKlantSelector(false)
          }
          if (paramTitel) setTitel(paramTitel)
          if (paramProjectId) setProjectId(paramProjectId)

          // Import from offerte
          if (paramOfferteId) {
            try {
              const offerteItems = await getOfferteItems(paramOfferteId)
              const allOffertes = await getOffertes().catch(() => [])
              const offerte = allOffertes.find((o) => o.id === paramOfferteId)
              if (offerte) {
                setOfferteId(offerte.id)
                setKlantId(offerte.klant_id)
                setShowKlantSelector(false)
                setTitel(offerte.titel)
                if (offerte.project_id) setProjectId(offerte.project_id)
                if (offerte.voorwaarden) setVoorwaarden(offerte.voorwaarden)

                if (offerteItems.length > 0) {
                  setItems(
                    offerteItems
                      .filter((oi) => !oi.is_optioneel)
                      .sort((a, b) => a.volgorde - b.volgorde)
                      .map((oi) => ({
                        id: crypto.randomUUID(),
                        beschrijving: oi.beschrijving,
                        aantal: oi.aantal,
                        eenheidsprijs: oi.eenheidsprijs,
                        btw_percentage: oi.btw_percentage,
                        korting_percentage: oi.korting_percentage,
                      }))
                  )
                } else {
                  // Fallback: single line from offerte totals
                  setItems([
                    {
                      id: crypto.randomUUID(),
                      beschrijving: offerte.titel,
                      aantal: 1,
                      eenheidsprijs: offerte.subtotaal,
                      btw_percentage: offerte.subtotaal > 0 ? Math.round((offerte.btw_bedrag / offerte.subtotaal) * 100) : 21,
                      korting_percentage: 0,
                    },
                  ])
                }
              }
            } catch (err) {
              logger.error('Failed to import offerte items:', err)
            }
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [editFactuurId, paramKlantId, paramOfferteId, paramProjectId, paramTitel, factuurPrefix, standaardBtw, factuurBetaaltermijnDagen, factuurVoorwaarden, factuurIntroTekst, factuurOutroTekst])

  // ============ COMPUTED ============

  const selectedKlant = useMemo(() => klanten.find((k) => k.id === klantId), [klanten, klantId])

  const filteredKlanten = useMemo(() => {
    if (!klantSearch.trim()) return klanten
    const q = klantSearch.toLowerCase()
    return klanten.filter(
      (k) =>
        k.bedrijfsnaam.toLowerCase().includes(q) ||
        (k.contactpersoon || '').toLowerCase().includes(q) ||
        (k.email || '').toLowerCase().includes(q)
    )
  }, [klanten, klantSearch])

  const validItems = useMemo(() => items.filter((i) => i.beschrijving.trim()), [items])
  const subtotaal = useMemo(() => calcSubtotaal(validItems), [validItems])
  const btwGroups = useMemo(() => calcBtwGroups(validItems), [validItems])
  const btwBedrag = useMemo(() => calcBtwBedrag(validItems), [validItems])
  const totaal = useMemo(() => round2(subtotaal + btwBedrag), [subtotaal, btwBedrag])

  // ============ HANDLERS ============

  const handleSelectKlant = useCallback((kId: string) => {
    setKlantId(kId)
    setShowKlantSelector(false)
    setKlantSearch('')
  }, [])

  const handleChangeKlant = useCallback(() => {
    setShowKlantSelector(true)
    setKlantSearch('')
  }, [])

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyLineItem(standaardBtw)])
  }, [standaardBtw])

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const handleUpdateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    )
  }, [])

  const handleDuplicateItem = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      if (idx === -1) return prev
      const copy = { ...prev[idx], id: crypto.randomUUID() }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!klantId) {
      toast.error('Selecteer een klant')
      return
    }
    if (!titel.trim()) {
      toast.error('Vul een titel in')
      return
    }
    if (validItems.length === 0) {
      toast.error('Voeg minimaal een regelitem toe')
      return
    }

    try {
      setIsSaving(true)

      if (isEditMode && existingFactuur) {
        // Update existing factuur
        const updates: Partial<Factuur> = {
          klant_id: klantId,
          klant_naam: selectedKlant?.bedrijfsnaam || '',
          titel,
          factuurdatum,
          vervaldatum,
          voorwaarden,
          notities,
          intro_tekst: introTekst || undefined,
          outro_tekst: outroTekst || undefined,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
        }
        await updateFactuur(existingFactuur.id, updates)
        toast.success('Factuur bijgewerkt')
        navigate('/facturen')
      } else {
        // Create new factuur
        const betaalToken = generateBetaalToken()
        const betaalLink = `${window.location.origin}/betalen/${betaalToken}`

        const newFactuur = await createFactuur({
          user_id: user?.id || '',
          klant_id: klantId,
          klant_naam: selectedKlant?.bedrijfsnaam || '',
          offerte_id: offerteId || undefined,
          project_id: projectId || undefined,
          nummer,
          titel,
          status: 'concept',
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
          betaald_bedrag: 0,
          factuurdatum,
          vervaldatum,
          notities,
          voorwaarden,
          intro_tekst: introTekst || undefined,
          outro_tekst: outroTekst || undefined,
          bron_type: offerteId ? 'offerte' : 'handmatig',
          bron_offerte_id: offerteId || undefined,
          bron_project_id: projectId || undefined,
          betaal_token: betaalToken,
          betaal_link: betaalLink,
        })

        // Create line items
        for (let i = 0; i < validItems.length; i++) {
          const item = validItems[i]
          await createFactuurItem({
            factuur_id: newFactuur.id,
            beschrijving: item.beschrijving,
            aantal: item.aantal,
            eenheidsprijs: item.eenheidsprijs,
            btw_percentage: item.btw_percentage,
            korting_percentage: item.korting_percentage,
            totaal: calcLineTotal(item),
            volgorde: i + 1,
          })
        }

        toast.success(`Factuur ${nummer} aangemaakt`)
        navigate('/facturen')
      }
    } catch (err) {
      logger.error('Fout bij opslaan factuur:', err)
      toast.error('Kon factuur niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [
    klantId, selectedKlant, titel, validItems, isEditMode, existingFactuur,
    factuurdatum, vervaldatum, voorwaarden, notities, introTekst, outroTekst,
    subtotaal, btwBedrag, totaal, nummer, offerteId, projectId, user, navigate,
  ])

  const handleDownloadPdf = useCallback(() => {
    if (!selectedKlant) {
      toast.error('Selecteer eerst een klant')
      return
    }

    const bedrijfsProfiel = { ...profile, primaireKleur }
    const factuurData = {
      nummer,
      titel,
      datum: factuurdatum,
      vervaldatum,
      subtotaal,
      btw_bedrag: btwBedrag,
      totaal,
      notities: notities || undefined,
      betaalvoorwaarden: voorwaarden || undefined,
      factuur_type: 'standaard' as const,
    }

    const pdfItems: OfferteItem[] = validItems.map((item, idx) => ({
      id: item.id,
      offerte_id: '',
      beschrijving: item.beschrijving,
      aantal: item.aantal,
      eenheidsprijs: item.eenheidsprijs,
      btw_percentage: item.btw_percentage,
      korting_percentage: item.korting_percentage,
      totaal: calcLineTotal(item),
      volgorde: idx + 1,
      created_at: new Date().toISOString(),
    }))

    try {
      const doc = generateFactuurPDF(factuurData, pdfItems, selectedKlant, bedrijfsProfiel, documentStyle)
      doc.save(`factuur-${nummer}.pdf`)
      toast.success('PDF gedownload')
    } catch (err) {
      logger.error('Fout bij genereren PDF:', err)
      toast.error('Kon PDF niet genereren')
    }
  }, [selectedKlant, profile, primaireKleur, nummer, titel, factuurdatum, vervaldatum, subtotaal, btwBedrag, totaal, notities, voorwaarden, validItems, documentStyle])

  // ============ LOADING ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ============ RENDER ============

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/facturen">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                {isEditMode ? `Factuur ${nummer} bewerken` : 'Nieuwe factuur'}
              </h1>
              <p className="text-xs text-muted-foreground">{nummer}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={validItems.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {isEditMode ? 'Bijwerken' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content: Two-column layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* LEFT PANEL: Klant & Meta */}
        <div className="space-y-4">
          {/* Klant selectie */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Klant
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showKlantSelector ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Zoek klant..."
                      value={klantSearch}
                      onChange={(e) => setKlantSearch(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredKlanten.map((klant) => (
                      <button
                        key={klant.id}
                        onClick={() => handleSelectKlant(klant.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors',
                          klant.id === klantId && 'bg-accent'
                        )}
                      >
                        <div className="font-medium">{klant.bedrijfsnaam}</div>
                        {klant.contactpersoon && (
                          <div className="text-xs text-muted-foreground">{klant.contactpersoon}</div>
                        )}
                      </button>
                    ))}
                    {filteredKlanten.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Geen klanten gevonden
                      </p>
                    )}
                  </div>
                </div>
              ) : selectedKlant ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{selectedKlant.bedrijfsnaam}</span>
                    <Button variant="ghost" size="sm" onClick={handleChangeKlant}>
                      <X className="h-3 w-3 mr-1" />
                      Wijzig
                    </Button>
                  </div>
                  {selectedKlant.contactpersoon && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {selectedKlant.contactpersoon}
                    </div>
                  )}
                  {selectedKlant.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {selectedKlant.email}
                    </div>
                  )}
                  {selectedKlant.telefoon && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {selectedKlant.telefoon}
                    </div>
                  )}
                  {selectedKlant.adres && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {selectedKlant.adres}{selectedKlant.stad ? `, ${selectedKlant.stad}` : ''}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Geen klant geselecteerd</p>
              )}
            </CardContent>
          </Card>

          {/* Factuur gegevens */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Factuurgegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Factuurnummer</Label>
                <Input value={nummer} readOnly className="bg-muted/50 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Titel</Label>
                <Input
                  value={titel}
                  onChange={(e) => setTitel(e.target.value)}
                  placeholder="Bijv. Gevelreclame installatie"
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Factuurdatum</Label>
                  <Input
                    type="date"
                    value={factuurdatum}
                    onChange={(e) => {
                      setFactuurdatum(e.target.value)
                      setVervaldatum(getDefaultVervaldatum(e.target.value, factuurBetaaltermijnDagen))
                    }}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Vervaldatum</Label>
                  <Input
                    type="date"
                    value={vervaldatum}
                    onChange={(e) => setVervaldatum(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              {offerteId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 rounded-md px-3 py-2">
                  <Receipt className="h-3 w-3" />
                  Vanuit offerte geimporteerd
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financieel overzicht */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Financieel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotaal</span>
                <span>{formatCurrency(subtotaal)}</span>
              </div>
              {Object.entries(btwGroups).map(([pct, bedrag]) => (
                <div key={pct} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">BTW {pct}%</span>
                  <span>{formatCurrency(bedrag)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Totaal incl. BTW</span>
                <span className="text-lg">{formatCurrency(totaal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: Items & Teksten */}
        <div className="space-y-4">
          {/* Intro tekst */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Intro tekst</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={introTekst}
                onChange={(e) => setIntroTekst(e.target.value)}
                placeholder="Optionele intro tekst bovenaan de factuur..."
                rows={2}
                className="text-sm"
              />
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Factuurregels ({items.length})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Regel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-[1fr_80px_100px_70px_70px_100px_36px] gap-2 px-2 mb-2 text-xs font-medium text-muted-foreground">
                <span>Omschrijving</span>
                <span className="text-right">Aantal</span>
                <span className="text-right">Prijs</span>
                <span className="text-right">BTW%</span>
                <span className="text-right">Korting%</span>
                <span className="text-right">Totaal</span>
                <span />
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_70px_70px_100px_36px] gap-2 p-2 rounded-md border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <Input
                      value={item.beschrijving}
                      onChange={(e) => handleUpdateItem(item.id, 'beschrijving', e.target.value)}
                      placeholder="Omschrijving..."
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      value={item.aantal}
                      onChange={(e) => handleUpdateItem(item.id, 'aantal', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      step="0.01"
                    />
                    <Input
                      type="number"
                      value={item.eenheidsprijs}
                      onChange={(e) => handleUpdateItem(item.id, 'eenheidsprijs', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      step="0.01"
                    />
                    <Input
                      type="number"
                      value={item.btw_percentage}
                      onChange={(e) => handleUpdateItem(item.id, 'btw_percentage', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      step="1"
                    />
                    <Input
                      type="number"
                      value={item.korting_percentage}
                      onChange={(e) => handleUpdateItem(item.id, 'korting_percentage', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                      min={0}
                      max={100}
                      step="1"
                    />
                    <div className="flex items-center justify-end text-sm font-medium tabular-nums">
                      {formatCurrency(calcLineTotal(item))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDuplicateItem(item.id)}
                        title="Dupliceer"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Verwijder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddItem}
                className="mt-3 w-full border-dashed border"
              >
                <Plus className="h-4 w-4 mr-1" />
                Regel toevoegen
              </Button>
            </CardContent>
          </Card>

          {/* Outro tekst */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Outro tekst</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={outroTekst}
                onChange={(e) => setOutroTekst(e.target.value)}
                placeholder="Optionele outro tekst onder de factuurregels..."
                rows={2}
                className="text-sm"
              />
            </CardContent>
          </Card>

          {/* Voorwaarden & Notities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Betaalvoorwaarden</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={voorwaarden}
                  onChange={(e) => setVoorwaarden(e.target.value)}
                  placeholder="Betaalvoorwaarden..."
                  rows={3}
                  className="text-sm"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Interne notities</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notities}
                  onChange={(e) => setNotities(e.target.value)}
                  placeholder="Notities (niet zichtbaar op factuur)..."
                  rows={3}
                  className="text-sm"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
