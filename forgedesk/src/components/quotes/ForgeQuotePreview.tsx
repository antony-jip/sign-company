import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { getOfferte, getOfferteItems, getKlant, updateOfferte, updateProject, getProject, createProject } from '@/services/supabaseService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { generateOffertePDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { Receipt, ArrowLeft, ExternalLink, FolderPlus, ArrowRight, Pencil, Download, ChevronRight, Image as ImageIcon, Paperclip } from 'lucide-react'
import { downloadFile } from '@/services/storageService'
import type { Offerte, OfferteItem, Klant } from '@/types'
import type { PrijsVariant } from './QuoteItemsTable'
import { round2 } from '@/utils/budgetUtils'
import { logger } from '../../utils/logger'

interface PreviewItem {
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  prijs_varianten?: PrijsVariant[]
  actieve_variant_id?: string
  bijlage_url?: string
  bijlage_type?: string
  bijlage_naam?: string
}

interface ForgeQuotePreviewProps {
  offerte?: {
    nummer: string
    titel: string
    status: string
    klant_id: string
    geldig_tot: string
    notities: string
    voorwaarden: string
    intro_tekst?: string
    outro_tekst?: string
    created_at: string
  }
  items?: PreviewItem[]
}

function calculateLineTotaal(item: { aantal: number; eenheidsprijs: number; korting_percentage: number }) {
  const bruto = round2(item.aantal * item.eenheidsprijs)
  return round2(bruto - round2(bruto * (item.korting_percentage / 100)))
}

export function ForgeQuotePreview({ offerte: propOfferte, items: propItems }: ForgeQuotePreviewProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur, pipelineStappen, valuta, logoUrl, profile } = useAppSettings()
  const documentStyle = useDocumentStyle()

  // Parse address components from combined string
  const adresParts = bedrijfsAdres ? bedrijfsAdres.split(', ') : []
  const companyStraat = adresParts[0] || ''
  const companyPostcodeStad = adresParts.length >= 3 ? `${adresParts[1]} ${adresParts[2]}` : adresParts[1] || ''

  // State for service-layer data (used when accessed via route, i.e. no props)
  const [fetchedOfferte, setFetchedOfferte] = useState<Offerte | null>(null)
  const [fetchedKlant, setFetchedKlant] = useState<Klant | null>(null)
  const [fetchedItems, setFetchedItems] = useState<OfferteItem[]>([])
  const [isLoading, setIsLoading] = useState(!propOfferte && !!id)

  // Fetch data from service layer when accessed via route (no props provided)
  useEffect(() => {
    if (propOfferte || !id) return

    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      try {
        const offerte = await getOfferte(id!)
        if (cancelled) return

        if (!offerte) {
          setFetchedOfferte(null)
          setIsLoading(false)
          return
        }

        setFetchedOfferte(offerte)

        const [klant, items] = await Promise.all([
          getKlant(offerte.klant_id),
          getOfferteItems(offerte.id),
        ])

        if (cancelled) return

        setFetchedKlant(klant)
        setFetchedItems(items)
      } catch (err) {
        logger.error('Failed to load offerte data:', err)
        toast.error('Kon offerte niet laden')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [id, propOfferte])

  // Determine the data source: props (inline usage) or fetched state (route usage)
  let offerteData: typeof propOfferte | undefined = propOfferte
  let itemsData: typeof propItems | undefined = propItems
  let klant: Klant | undefined | null

  if (!offerteData && fetchedOfferte) {
    offerteData = {
      nummer: fetchedOfferte.nummer,
      titel: fetchedOfferte.titel,
      status: fetchedOfferte.status,
      klant_id: fetchedOfferte.klant_id,
      geldig_tot: fetchedOfferte.geldig_tot,
      notities: fetchedOfferte.notities,
      voorwaarden: fetchedOfferte.voorwaarden,
      intro_tekst: fetchedOfferte.intro_tekst,
      outro_tekst: fetchedOfferte.outro_tekst,
      created_at: fetchedOfferte.created_at,
    }
    itemsData = fetchedItems.map((i) => ({
      beschrijving: i.beschrijving,
      aantal: i.aantal,
      eenheidsprijs: i.eenheidsprijs,
      btw_percentage: i.btw_percentage,
      korting_percentage: i.korting_percentage,
      prijs_varianten: i.prijs_varianten,
      actieve_variant_id: i.actieve_variant_id,
      bijlage_url: i.bijlage_url,
      bijlage_type: i.bijlage_type,
      bijlage_naam: i.bijlage_naam,
    }))
    klant = fetchedKlant
  }

  if (offerteData && !klant && propOfferte) {
    // When used inline via props, klant is not available from service layer
    klant = undefined
  }

  // Handle status update via service layer
  async function handleStatusUpdate(newStatus: Offerte['status']) {
    if (!fetchedOfferte?.id) return
    try {
      const updated = await updateOfferte(fetchedOfferte.id, { status: newStatus })
      setFetchedOfferte(updated)
      toast.success(`Status bijgewerkt naar "${newStatus}"`)

      // Auto-activate or create project when quote is approved
      if (newStatus === 'goedgekeurd') {
        try {
          if (fetchedOfferte.project_id) {
            // Activate existing project
            const project = await getProject(fetchedOfferte.project_id)
            if (project && project.status === 'gepland') {
              await updateProject(project.id, { status: 'actief' })
              toast.success(`Project "${project.naam}" is nu actief`)
            }
          } else {
            // Auto-create project from approved quote
            const project = await createProject({
              user_id: fetchedOfferte.user_id,
              klant_id: fetchedOfferte.klant_id,
              naam: fetchedOfferte.titel,
              beschrijving: `Aangemaakt vanuit offerte ${fetchedOfferte.nummer}`,
              status: 'actief',
              prioriteit: 'medium',
              start_datum: new Date().toISOString().split('T')[0],
              eind_datum: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
              budget: fetchedOfferte.totaal || 0,
              besteed: 0,
              voortgang: 0,
              team_leden: [],
              bron_offerte_id: fetchedOfferte.id,
            })
            const updatedWithProject = await updateOfferte(fetchedOfferte.id, {
              project_id: project.id,
              geconverteerd_naar_project_id: project.id,
            })
            setFetchedOfferte(updatedWithProject)
            toast.success(`Project "${project.naam}" automatisch aangemaakt`)
          }
        } catch {
          // Non-critical: don't block the status update
        }
      }
    } catch (err) {
      logger.error('Failed to update offerte status:', err)
      toast.error('Kon status niet bijwerken')
    }
  }

  // Maak project van goedgekeurde offerte
  async function handleMaakProject() {
    if (!fetchedOfferte) return
    try {
      const project = await createProject({
        user_id: fetchedOfferte.user_id,
        klant_id: fetchedOfferte.klant_id,
        naam: fetchedOfferte.titel,
        beschrijving: `Aangemaakt vanuit offerte ${fetchedOfferte.nummer}`,
        status: 'actief',
        prioriteit: 'medium',
        start_datum: new Date().toISOString().split('T')[0],
        eind_datum: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        budget: fetchedOfferte.totaal || 0,
        besteed: 0,
        voortgang: 0,
        team_leden: [],
        bron_offerte_id: fetchedOfferte.id,
      })

      // Update offerte met project link
      const updatedOfferte = await updateOfferte(fetchedOfferte.id, {
        project_id: project.id,
        geconverteerd_naar_project_id: project.id,
      })
      setFetchedOfferte(updatedOfferte)
      toast.success(`Project "${project.naam}" aangemaakt`)
      navigate(`/projecten/${project.id}`)
    } catch (err) {
      logger.error('Failed to create project from offerte:', err)
      toast.error('Kon project niet aanmaken')
    }
  }

  // Handle PDF download
  function handleDownloadPDF() {
    if (!fetchedOfferte || !fetchedItems.length) return
    try {
      const doc = generateOffertePDF(
        fetchedOfferte,
        fetchedItems,
        fetchedKlant || {},
        {
          ...profile,
          primaireKleur: primaireKleur || '#2563eb',
        },
        documentStyle
      )
      doc.save(`${fetchedOfferte.nummer}.pdf`)
      toast.success('PDF gedownload')
    } catch (err) {
      logger.error('Failed to generate PDF:', err)
      toast.error('Kon PDF niet genereren')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground dark:text-muted-foreground/60">Offerte laden...</p>
        </div>
      </div>
    )
  }

  if (!offerteData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground dark:text-muted-foreground/60">Offerte niet gevonden.</p>
      </div>
    )
  }

  const items = itemsData || []

  // Resolve bijlage storage paths to displayable URLs
  const [bijlageUrls, setBijlageUrls] = useState<Record<number, string>>({})
  const bijlageItems = useMemo(() =>
    items.map((item, idx) => ({ idx, url: item.bijlage_url, type: item.bijlage_type })).filter(i => i.url),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.map(i => i.bijlage_url).join(',')]
  )

  useEffect(() => {
    let cancelled = false
    async function resolve() {
      const urls: Record<number, string> = {}
      for (const { idx, url } of bijlageItems) {
        if (!url) continue
        if (url.startsWith('data:') || url.startsWith('http')) {
          urls[idx] = url
        } else {
          try {
            const resolved = await downloadFile(url)
            if (!cancelled) urls[idx] = resolved
          } catch { /* skip */ }
        }
      }
      if (!cancelled) setBijlageUrls(urls)
    }
    if (bijlageItems.length > 0) resolve()
    else setBijlageUrls({})
    return () => { cancelled = true }
  }, [bijlageItems])

  // Calculate totals
  const subtotaal = round2(items.reduce((sum, item) => sum + calculateLineTotaal(item), 0))

  const btwGroups: Record<number, number> = {}
  items.forEach((item) => {
    const lineTotaal = calculateLineTotaal(item)
    const btwBedrag = round2(lineTotaal * (item.btw_percentage / 100))
    btwGroups[item.btw_percentage] = round2((btwGroups[item.btw_percentage] || 0) + btwBedrag)
  })

  const totaalBtw = round2(Object.values(btwGroups).reduce((sum, val) => sum + val, 0))
  const totaal = subtotaal + totaalBtw

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action bar - only shown when accessed via route (service data available) */}
      {fetchedOfferte && (
        <div className="mb-6 space-y-3">
          {/* Row 1: Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/60 px-1">
            <button
              onClick={() => navigate('/offertes')}
              className="hover:text-foreground/70 dark:hover:text-muted-foreground/30 transition-colors"
            >
              Offertes
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            {fetchedKlant && (
              <>
                <button
                  onClick={() => navigate(`/klanten/${fetchedKlant.id}`)}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {fetchedKlant.bedrijfsnaam}
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
            <span className="text-foreground dark:text-white font-medium">{offerteData.nummer}</span>
          </div>

          {/* Row 2: Title + Status + Actions */}
          <div className="flex items-start justify-between gap-4 px-1">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/60" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-[-0.02em] text-foreground dark:text-white truncate">
                  {offerteData.titel}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={offerteData.status}
                    onChange={(e) => handleStatusUpdate(e.target.value as Offerte['status'])}
                    className="text-xs border border-border rounded-md px-2 py-0.5 bg-card dark:bg-muted text-foreground/70 dark:text-muted-foreground/50"
                  >
                    {(pipelineStappen && pipelineStappen.length > 0
                      ? pipelineStappen.filter(s => s.actief).sort((a, b) => a.volgorde - b.volgorde)
                      : [
                          { key: 'concept', label: 'Concept' },
                          { key: 'verzonden', label: 'Verzonden' },
                          { key: 'bekeken', label: 'Bekeken' },
                          { key: 'goedgekeurd', label: 'Goedgekeurd' },
                          { key: 'afgewezen', label: 'Afgewezen' },
                        ]
                    ).map(stap => (
                      <option key={stap.key} value={stap.key}>{stap.label}</option>
                    ))}
                  </select>
                  {/* Conversieketen */}
                  {fetchedOfferte.project_id && (
                    <button
                      onClick={() => navigate(`/projecten/${fetchedOfferte.project_id}`)}
                      className="inline-flex items-center gap-1 text-xs text-accent dark:text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Project
                    </button>
                  )}
                  {fetchedOfferte.geconverteerd_naar_factuur_id && (
                    <button
                      onClick={() => navigate('/facturen')}
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Factuur
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate(`/offertes/${fetchedOfferte.id}/bewerken`, { state: { from: location.pathname } })}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground/70 dark:text-muted-foreground/50 bg-card dark:bg-muted border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Bewerk offerte
              </button>
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Row 3: Next step card (only for goedgekeurd) */}
          {fetchedOfferte.status === 'goedgekeurd' && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 mx-1">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Volgende stap:</span>
              <div className="flex items-center gap-2">
                {fetchedOfferte.project_id ? (
                  <button
                    onClick={() => navigate(`/projecten/${fetchedOfferte.project_id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Bekijk Project
                  </button>
                ) : (
                  <button
                    onClick={handleMaakProject}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Maak Project
                  </button>
                )}
                <button
                  onClick={() => navigate('/montage')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Plan Montage
                </button>
                <button
                  onClick={() => navigate(`/facturen?convert_offerte=${fetchedOfferte.id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Factureer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* A4-like document */}
      <div className="bg-white dark:bg-card shadow-xl rounded-lg border border-border dark:border-border overflow-hidden">
        {/* Header */}
        <div className="px-10 pt-10 pb-6">
          <div className="flex justify-between items-start">
            {/* Company Logo & Info */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md flex-shrink-0" style={{ backgroundColor: primaireKleur }}>
                <span className="text-white font-bold text-2xl">{(bedrijfsnaam || 'W')[0].toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground dark:text-white">{bedrijfsnaam || 'Uw Bedrijf'}</h2>
                {companyStraat && <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 mt-1">{companyStraat}</p>}
                {companyPostcodeStad && <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">{companyPostcodeStad}</p>}
                {kvkNummer && <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">KVK: {kvkNummer}</p>}
              </div>
            </div>

            {/* Status Badge */}
            {offerteData.status && (
              <Badge className={getStatusColor(offerteData.status)}>
                {offerteData.status.charAt(0).toUpperCase() + offerteData.status.slice(1)}
              </Badge>
            )}
          </div>

          {/* Title */}
          <div className="mt-8 mb-6">
            <h1 className="text-3xl font-bold text-foreground dark:text-white tracking-tight">
              OFFERTE
            </h1>
            <p className="text-lg text-blue-600 dark:text-blue-400 font-medium font-mono mt-1">
              {offerteData.nummer}
            </p>
          </div>

          {/* Client Info & Quote Details */}
          <div className="grid grid-cols-2 gap-8">
            {/* Client */}
            <div className="bg-background dark:bg-muted/50 rounded-lg p-4">
              <h3 className="text-xs font-bold text-text-tertiary dark:text-muted-foreground/60 uppercase tracking-label mb-2">
                Klantgegevens
              </h3>
              {klant ? (
                <div className="space-y-1">
                  <p className="font-medium text-foreground dark:text-white">{klant.bedrijfsnaam}</p>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">t.a.v. {klant.contactpersoon}</p>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">{klant.adres}</p>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">
                    {klant.postcode} {klant.stad}
                  </p>
                  {klant.btw_nummer && (
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-2">
                      BTW: {klant.btw_nummer}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Klant niet gevonden</p>
              )}
            </div>

            {/* Quote Details */}
            <div className="bg-background dark:bg-muted/50 rounded-lg p-4">
              <h3 className="text-xs font-bold text-text-tertiary dark:text-muted-foreground/60 uppercase tracking-label mb-2">
                Offertegegevens
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground/60">Nummer:</span>
                  <span className="font-medium font-mono text-foreground dark:text-white">{offerteData.nummer}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground/60">Datum:</span>
                  <span className="font-medium font-mono text-foreground dark:text-white">
                    {formatDate(offerteData.created_at)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground/60">Geldig tot:</span>
                  <span className="font-medium font-mono text-foreground dark:text-white">
                    {formatDate(offerteData.geldig_tot)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title Bar */}
        <div className="mx-10 mb-4">
          <h3 className="text-lg font-bold tracking-[-0.02em] text-foreground dark:text-white">
            {offerteData.titel}
          </h3>
        </div>

        {/* Introductietekst */}
        {offerteData.intro_tekst && (
          <div className="mx-10 mb-6">
            <p className="text-sm text-foreground/70 dark:text-muted-foreground/50 leading-relaxed whitespace-pre-wrap">
              {offerteData.intro_tekst}
            </p>
          </div>
        )}

        {/* Items Table */}
        <div className="mx-10 mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border dark:border-border">
                <th className="text-left py-3 px-2 font-bold text-text-tertiary dark:text-muted-foreground/50 text-xs uppercase tracking-label w-10">
                  #
                </th>
                <th className="text-left py-3 px-2 font-bold text-text-tertiary dark:text-muted-foreground/50 text-xs uppercase tracking-label">
                  Beschrijving
                </th>
                <th className="text-right py-3 px-2 font-bold text-text-tertiary dark:text-muted-foreground/50 text-xs uppercase tracking-label w-20">
                  Aantal
                </th>
                <th className="text-right py-3 px-2 font-bold text-text-tertiary dark:text-muted-foreground/50 text-xs uppercase tracking-label w-28">
                  Eenheidsprijs
                </th>
                <th className="text-right py-3 px-2 font-bold text-text-tertiary dark:text-muted-foreground/50 text-xs uppercase tracking-label w-16">
                  BTW
                </th>
                <th className="text-right py-3 px-2 font-bold text-text-tertiary dark:text-muted-foreground/50 text-xs uppercase tracking-label w-28">
                  Totaal
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const hasVarianten = item.prijs_varianten && item.prijs_varianten.length > 0

                if (hasVarianten) {
                  // Render item with multiple price variants
                  return (
                    <React.Fragment key={index}>
                      {/* Item header row spanning full width */}
                      <tr className={`border-b border-border dark:border-border ${index % 2 === 0 ? '' : 'bg-background/50 dark:bg-muted/20'}`}>
                        <td className="py-3 px-2 text-muted-foreground dark:text-muted-foreground/60 align-top">{index + 1}</td>
                        <td colSpan={5} className="py-3 px-2">
                          <span className="font-medium text-foreground dark:text-muted-foreground/20">{item.beschrijving}</span>
                        </td>
                      </tr>
                      {/* Variant sub-rows */}
                      {item.prijs_varianten!.map((variant) => {
                        const isActive = variant.id === item.actieve_variant_id
                        const variantBruto = variant.aantal * variant.eenheidsprijs
                        const variantTotaal = variantBruto - variantBruto * (variant.korting_percentage / 100)
                        return (
                          <tr
                            key={variant.id}
                            className={`border-b border-border dark:border-border/50 ${
                              isActive
                                ? 'bg-blue-50/50 dark:bg-blue-900/10'
                                : 'bg-background/30 dark:bg-muted/10'
                            }`}
                          >
                            <td className="py-2 px-2" />
                            <td className="py-2 px-2 text-foreground/70 dark:text-muted-foreground/50">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-blue-500' : 'bg-border dark:bg-muted-foreground'}`} />
                                <span className="text-xs font-medium">{variant.label}</span>
                                {isActive ? (
                                  <span className="text-2xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded">
                                    standaard
                                  </span>
                                ) : (
                                  <span className="text-2xs font-medium text-muted-foreground bg-muted px-1 py-0.5 rounded">
                                    alternatief
                                  </span>
                                )}
                              </span>
                              {variant.korting_percentage > 0 && (
                                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                  (-{variant.korting_percentage}% korting)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right text-muted-foreground dark:text-muted-foreground/60 text-xs font-mono">
                              {variant.aantal}
                            </td>
                            <td className="py-2 px-2 text-right text-muted-foreground dark:text-muted-foreground/60 text-xs font-mono">
                              {formatCurrency(variant.eenheidsprijs)}
                            </td>
                            <td className="py-2 px-2 text-right text-muted-foreground/60 dark:text-muted-foreground text-xs font-mono">
                              {variant.btw_percentage}%
                            </td>
                            <td className="py-2 px-2 text-right text-xs font-medium text-foreground/70 dark:text-muted-foreground/50 font-mono">
                              {formatCurrency(variantTotaal)}
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                }

                // Regular item without variants
                const lineTotaal = calculateLineTotaal(item)
                return (
                  <tr
                    key={index}
                    className={`border-b border-border dark:border-border ${
                      index % 2 === 0 ? '' : 'bg-background/50 dark:bg-muted/20'
                    }`}
                  >
                    <td className="py-3 px-2 text-muted-foreground dark:text-muted-foreground/60">{index + 1}</td>
                    <td className="py-3 px-2 text-foreground dark:text-muted-foreground/20">
                      {item.beschrijving}
                      {item.korting_percentage > 0 && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                          (-{item.korting_percentage}% korting)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-foreground/70 dark:text-muted-foreground/50 font-mono">
                      {item.aantal}
                    </td>
                    <td className="py-3 px-2 text-right text-foreground/70 dark:text-muted-foreground/50 font-mono">
                      {formatCurrency(item.eenheidsprijs)}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground dark:text-muted-foreground/60 font-mono">
                      {item.btw_percentage}%
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-foreground dark:text-muted-foreground/20 font-mono">
                      {formatCurrency(lineTotaal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Bijlagen per item */}
        {Object.keys(bijlageUrls).length > 0 && (
          <div className="mx-10 mb-6 space-y-4">
            <h4 className="font-bold text-text-tertiary dark:text-muted-foreground/50 text-xs uppercase tracking-label flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Bijlagen
            </h4>
            {items.map((item, index) => {
              const url = bijlageUrls[index]
              if (!url) return null
              const isPdf = item.bijlage_type === 'application/pdf'
              return (
                <div key={index} className="border border-border dark:border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-background/50 dark:bg-muted/30 border-b border-border dark:border-border flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{index + 1}.</span>
                    <span className="text-sm font-medium text-foreground dark:text-white">{item.beschrijving}</span>
                    {item.bijlage_naam && (
                      <span className="ml-auto text-xs text-muted-foreground">{item.bijlage_naam}</span>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-center bg-card dark:bg-muted">
                    {isPdf ? (
                      <div className="flex items-center gap-3 py-4">
                        <Paperclip className="h-6 w-6 text-rose-500" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.bijlage_naam || 'Document.pdf'}</p>
                          <p className="text-xs text-muted-foreground">PDF bijlage</p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt={item.beschrijving || 'Bijlage'}
                        className="max-h-[400px] max-w-full object-contain rounded"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Totals */}
        <div className="mx-10 mb-8 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground dark:text-muted-foreground/60 py-1">
              <span>Subtotaal</span>
              <span className="font-medium text-foreground dark:text-muted-foreground/20 font-mono">
                {formatCurrency(subtotaal)}
              </span>
            </div>

            {Object.entries(btwGroups)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([percentage, bedrag]) => (
                <div
                  key={percentage}
                  className="flex justify-between text-sm text-muted-foreground dark:text-muted-foreground/60 py-1"
                >
                  <span className="font-mono">BTW {percentage}%</span>
                  <span className="font-medium text-foreground dark:text-muted-foreground/20 font-mono">
                    {formatCurrency(bedrag)}
                  </span>
                </div>
              ))}

            <div className="border-t-2 border-border dark:border-border pt-3 mt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-foreground dark:text-white">Totaal</span>
                <span className="text-lg font-bold font-mono" style={{ color: primaireKleur }}>
                  {formatCurrency(totaal, valuta)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Afsluittekst */}
        {offerteData.outro_tekst && (
          <div className="mx-10 mb-6">
            <p className="text-sm text-foreground/70 dark:text-muted-foreground/50 leading-relaxed whitespace-pre-wrap">
              {offerteData.outro_tekst}
            </p>
          </div>
        )}

        {/* Notes & Terms */}
        <div className="mx-10 pb-10 space-y-6">
          {offerteData.notities && (
            <div>
              <h4 className="font-bold text-text-tertiary dark:text-muted-foreground/50 text-xs uppercase tracking-label mb-2">
                Notities
              </h4>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 leading-relaxed whitespace-pre-wrap">
                {offerteData.notities}
              </p>
            </div>
          )}

          {offerteData.voorwaarden && (
            <div className="bg-background dark:bg-muted/30 rounded-lg p-4">
              <h4 className="font-bold text-text-tertiary dark:text-muted-foreground/50 text-xs uppercase tracking-label mb-2">
                Voorwaarden
              </h4>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 leading-relaxed whitespace-pre-wrap">
                {offerteData.voorwaarden}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border dark:border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground">
              {[bedrijfsnaam, kvkNummer ? `KVK: ${kvkNummer}` : null, btwNummer ? `BTW: ${btwNummer}` : null].filter(Boolean).join(' | ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
