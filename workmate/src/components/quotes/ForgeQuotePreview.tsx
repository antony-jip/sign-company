import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { getOfferte, getOfferteItems, getKlant, updateOfferte, updateProject, getProject, createProject } from '@/services/supabaseService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { generateOffertePDF } from '@/services/pdfService'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { Receipt, ArrowLeft, ExternalLink, FolderPlus, ArrowRight } from 'lucide-react'
import type { Offerte, OfferteItem, Klant } from '@/types'
import { logger } from '../../utils/logger'

interface ForgeQuotePreviewProps {
  offerte?: {
    nummer: string
    titel: string
    status: string
    klant_id: string
    geldig_tot: string
    notities: string
    voorwaarden: string
    created_at: string
  }
  items?: {
    beschrijving: string
    aantal: number
    eenheidsprijs: number
    btw_percentage: number
    korting_percentage: number
  }[]
}

function calculateLineTotaal(item: { aantal: number; eenheidsprijs: number; korting_percentage: number }) {
  const bruto = item.aantal * item.eenheidsprijs
  return bruto - bruto * (item.korting_percentage / 100)
}

export function ForgeQuotePreview({ offerte: propOfferte, items: propItems }: ForgeQuotePreviewProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, primaireKleur, pipelineStappen, valuta } = useAppSettings()

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
      created_at: fetchedOfferte.created_at,
    }
    itemsData = fetchedItems.map((i) => ({
      beschrijving: i.beschrijving,
      aantal: i.aantal,
      eenheidsprijs: i.eenheidsprijs,
      btw_percentage: i.btw_percentage,
      korting_percentage: i.korting_percentage,
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

      // Auto-activate project when quote is approved
      if (newStatus === 'goedgekeurd' && fetchedOfferte.project_id) {
        try {
          const project = await getProject(fetchedOfferte.project_id)
          if (project && project.status === 'gepland') {
            await updateProject(project.id, { status: 'actief' })
            toast.success(`Project "${project.naam}" is nu actief`)
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
          bedrijfsnaam: bedrijfsnaam || 'Uw Bedrijf',
          bedrijfs_adres: bedrijfsAdres || '',
          kvk_nummer: kvkNummer || '',
          btw_nummer: btwNummer || '',
          primaireKleur: primaireKleur || '#2563eb',
        }
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-500 dark:text-gray-400">Offerte laden...</p>
        </div>
      </div>
    )
  }

  if (!offerteData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Offerte niet gevonden.</p>
      </div>
    )
  }

  const items = itemsData || []

  // Calculate totals
  const subtotaal = items.reduce((sum, item) => sum + calculateLineTotaal(item), 0)

  const btwGroups: Record<number, number> = {}
  items.forEach((item) => {
    const lineTotaal = calculateLineTotaal(item)
    const btwBedrag = lineTotaal * (item.btw_percentage / 100)
    btwGroups[item.btw_percentage] = (btwGroups[item.btw_percentage] || 0) + btwBedrag
  })

  const totaalBtw = Object.values(btwGroups).reduce((sum, val) => sum + val, 0)
  const totaal = subtotaal + totaalBtw

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action bar - only shown when accessed via route (service data available) */}
      {fetchedOfferte && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3">
            {/* Back navigation */}
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Terug
            </button>

            {/* Breadcrumb links */}
            {fetchedKlant && (
              <button
                onClick={() => navigate(`/klanten/${fetchedKlant.id}`)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {fetchedKlant.bedrijfsnaam}
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
            {fetchedOfferte.project_id && (
              <button
                onClick={() => navigate(`/projecten/${fetchedOfferte.project_id}`)}
                className="inline-flex items-center gap-1 text-xs text-accent dark:text-primary hover:underline"
              >
                Bekijk project
                <ExternalLink className="h-3 w-3" />
              </button>
            )}

            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
              <select
                value={offerteData.status}
                onChange={(e) => handleStatusUpdate(e.target.value as Offerte['status'])}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Conversieketen indicator */}
            {(fetchedOfferte.project_id || fetchedOfferte.geconverteerd_naar_factuur_id) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                <Badge className={getStatusColor(fetchedOfferte.status) + ' text-[10px]'}>
                  {fetchedOfferte.nummer}
                </Badge>
                {fetchedOfferte.project_id && (
                  <>
                    <ArrowRight className="h-3 w-3" />
                    <button
                      onClick={() => navigate(`/projecten/${fetchedOfferte.project_id}`)}
                      className="text-accent dark:text-primary hover:underline font-medium"
                    >
                      Project
                    </button>
                  </>
                )}
                {fetchedOfferte.geconverteerd_naar_factuur_id && (
                  <>
                    <ArrowRight className="h-3 w-3" />
                    <button
                      onClick={() => navigate('/facturen')}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      Factuur
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Maak Project button - voor goedgekeurde offertes zonder project */}
            {fetchedOfferte.status === 'goedgekeurd' && !fetchedOfferte.project_id && (
              <button
                onClick={handleMaakProject}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <FolderPlus className="h-4 w-4" />
                Maak Project
              </button>
            )}

            {/* Factureer button - only for goedgekeurde offertes */}
            {fetchedOfferte.status === 'goedgekeurd' && (
              <button
                onClick={() => navigate(`/facturen?convert_offerte=${fetchedOfferte.id}`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Receipt className="h-4 w-4" />
                Factureer
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      )}

      {/* A4-like document */}
      <div className="bg-white dark:bg-gray-900 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-10 pt-10 pb-6">
          <div className="flex justify-between items-start">
            {/* Company Logo & Info */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md flex-shrink-0" style={{ backgroundColor: primaireKleur }}>
                <span className="text-white font-bold text-2xl">{(bedrijfsnaam || 'W')[0].toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{bedrijfsnaam || 'Uw Bedrijf'}</h2>
                {companyStraat && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{companyStraat}</p>}
                {companyPostcodeStad && <p className="text-sm text-gray-500 dark:text-gray-400">{companyPostcodeStad}</p>}
                {kvkNummer && <p className="text-sm text-gray-500 dark:text-gray-400">KVK: {kvkNummer}</p>}
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              OFFERTE
            </h1>
            <p className="text-lg text-blue-600 dark:text-blue-400 font-semibold mt-1">
              {offerteData.nummer}
            </p>
          </div>

          {/* Client Info & Quote Details */}
          <div className="grid grid-cols-2 gap-8">
            {/* Client */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Klantgegevens
              </h3>
              {klant ? (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{klant.bedrijfsnaam}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">t.a.v. {klant.contactpersoon}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{klant.adres}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {klant.postcode} {klant.stad}
                  </p>
                  {klant.btw_nummer && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      BTW: {klant.btw_nummer}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Klant niet gevonden</p>
              )}
            </div>

            {/* Quote Details */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Offertegegevens
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Nummer:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{offerteData.nummer}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Datum:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(offerteData.created_at)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Geldig tot:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(offerteData.geldig_tot)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title Bar */}
        <div className="mx-10 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {offerteData.titel}
          </h3>
        </div>

        {/* Items Table */}
        <div className="mx-10 mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-10">
                  #
                </th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                  Beschrijving
                </th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-20">
                  Aantal
                </th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-28">
                  Eenheidsprijs
                </th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-16">
                  BTW
                </th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300 w-28">
                  Totaal
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const lineTotaal = calculateLineTotaal(item)
                return (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      index % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'
                    }`}
                  >
                    <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {item.beschrijving}
                      {item.korting_percentage > 0 && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                          (-{item.korting_percentage}% korting)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                      {item.aantal}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(item.eenheidsprijs)}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-500 dark:text-gray-400">
                      {item.btw_percentage}%
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(lineTotaal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mx-10 mb-8 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 py-1">
              <span>Subtotaal</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(subtotaal)}
              </span>
            </div>

            {Object.entries(btwGroups)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([percentage, bedrag]) => (
                <div
                  key={percentage}
                  className="flex justify-between text-sm text-gray-600 dark:text-gray-400 py-1"
                >
                  <span>BTW {percentage}%</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(bedrag)}
                  </span>
                </div>
              ))}

            <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-3 mt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900 dark:text-white">Totaal</span>
                <span className="text-lg font-bold" style={{ color: primaireKleur }}>
                  {formatCurrency(totaal, valuta)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="mx-10 pb-10 space-y-6">
          {offerteData.notities && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Notities
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {offerteData.notities}
              </p>
            </div>
          )}

          {offerteData.voorwaarden && (
            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Voorwaarden
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {offerteData.voorwaarden}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {[bedrijfsnaam, kvkNummer ? `KVK: ${kvkNummer}` : null, btwNummer ? `BTW: ${btwNummer}` : null].filter(Boolean).join(' | ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
