import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Download,
  Clock,
  Shield,
  Edit3,
  X,
} from 'lucide-react'
import { toast, Toaster } from 'sonner'

// ============ TYPES ============

interface PubliekOfferte {
  id: string
  nummer: string
  titel: string
  status: string
  subtotaal: number
  btw_bedrag: number
  totaal: number
  geldig_tot: string
  notities?: string
  voorwaarden?: string
  intro_tekst?: string
  outro_tekst?: string
  klant_naam?: string
  created_at: string
  geaccepteerd_door?: string
  geaccepteerd_op?: string
  wijziging_opmerking?: string
  wijziging_ingediend_op?: string
  afrondingskorting_excl_btw?: number
  aangepast_totaal?: number
  gekozen_items?: string[]
  gekozen_varianten?: Record<string, string>
}

interface PubliekItemPrijsVariant {
  id: string
  label: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
}

interface PubliekItem {
  id: string
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  totaal: number
  volgorde: number
  soort?: 'prijs' | 'tekst'
  is_optioneel?: boolean
  foto_url?: string
  foto_op_offerte?: boolean
  prijs_varianten?: PubliekItemPrijsVariant[]
  actieve_variant_id?: string
}

interface Bedrijf {
  bedrijfsnaam?: string
  bedrijfs_adres?: string
  bedrijfs_telefoon?: string
  bedrijfs_email?: string
  bedrijfs_website?: string
  kvk_nummer?: string
  btw_nummer?: string
  iban?: string
  logo_url?: string
}

interface Klant {
  bedrijfsnaam?: string
  contactpersoon?: string
  email?: string
  adres?: string
  postcode?: string
  stad?: string
}

// ============ HELPERS ============

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(round2(amount))
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dagenTotVerlopen(geldigTot: string): number {
  if (!geldigTot) return Infinity
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const eind = new Date(geldigTot)
  eind.setHours(0, 0, 0, 0)
  return Math.ceil((eind.getTime() - vandaag.getTime()) / (1000 * 60 * 60 * 24))
}

// Get effective item values based on selected variant
function getEffectiveItemValues(item: PubliekItem, selectedVariantId?: string): { aantal: number; eenheidsprijs: number; btw_percentage: number; korting_percentage: number } {
  if (selectedVariantId && item.prijs_varianten?.length) {
    const variant = item.prijs_varianten.find(v => v.id === selectedVariantId)
    if (variant) {
      return {
        aantal: variant.aantal,
        eenheidsprijs: variant.eenheidsprijs,
        btw_percentage: variant.btw_percentage,
        korting_percentage: variant.korting_percentage,
      }
    }
  }
  return {
    aantal: item.aantal,
    eenheidsprijs: item.eenheidsprijs,
    btw_percentage: item.btw_percentage,
    korting_percentage: item.korting_percentage || 0,
  }
}

function getEffectiveItemTotal(item: PubliekItem, selectedVariantId?: string): number {
  const v = getEffectiveItemValues(item, selectedVariantId)
  return round2(v.aantal * v.eenheidsprijs * (1 - v.korting_percentage / 100))
}

// BTW groepering with selection awareness
function groepeerBtwMetSelectie(
  items: PubliekItem[],
  selectedItems: Set<string>,
  selectedVariants: Record<string, string>,
  hasOptionalItems: boolean
): { percentage: number; basis: number; btw: number }[] {
  const map = new Map<number, { basis: number; btw: number }>()
  for (const item of items) {
    if (item.soort === 'tekst') continue
    // Skip unselected items (only filter if there are optional items)
    if (hasOptionalItems && !selectedItems.has(item.id)) continue
    const v = getEffectiveItemValues(item, selectedVariants[item.id])
    const korting = v.korting_percentage || 0
    const regelExcl = round2(v.aantal * v.eenheidsprijs * (1 - korting / 100))
    const regelBtw = round2(regelExcl * v.btw_percentage / 100)
    const existing = map.get(v.btw_percentage) || { basis: 0, btw: 0 }
    existing.basis += regelExcl
    existing.btw += regelBtw
    map.set(v.btw_percentage, existing)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([percentage, vals]) => ({ percentage, basis: round2(vals.basis), btw: round2(vals.btw) }))
}

// ============ COMPONENT ============

export function OffertePubliekPagina() {
  const { token } = useParams<{ token: string }>()
  const [offerte, setOfferte] = useState<PubliekOfferte | null>(null)
  const [items, setItems] = useState<PubliekItem[]>([])
  const [bedrijf, setBedrijf] = useState<Bedrijf | null>(null)
  const [klant, setKlant] = useState<Klant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)

  // Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [showWijzigingModal, setShowWijzigingModal] = useState(false)

  // Accept form
  const [acceptNaam, setAcceptNaam] = useState('')
  const [acceptAkkoord, setAcceptAkkoord] = useState(false)
  const [acceptLoading, setAcceptLoading] = useState(false)

  // Wijziging form
  const [wijzigingNaam, setWijzigingNaam] = useState('')
  const [wijzigingOpmerking, setWijzigingOpmerking] = useState('')
  const [wijzigingLoading, setWijzigingLoading] = useState(false)

  // Option selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  // Confetti / success
  const [showSuccess, setShowSuccess] = useState(false)
  const successTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    async function load() {
      if (!token) {
        setNotFound(true)
        setIsLoading(false)
        return
      }
      try {
        const resp = await fetch(`/api/offerte-publiek?token=${encodeURIComponent(token)}`)
        if (!resp.ok) {
          setNotFound(true)
          setIsLoading(false)
          return
        }
        const data = await resp.json()
        setOfferte(data.offerte)
        setItems(data.items || [])
        setBedrijf(data.bedrijf)
        setKlant(data.klant)
      } catch {
        setNotFound(true)
      } finally {
        setIsLoading(false)
        // Trigger fade-in
        requestAnimationFrame(() => setFadeIn(true))
      }
    }
    load()
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [token])

  // Derived: check if offerte has optional items or variants
  const hasOptionalItems = useMemo(() => items.some(i => i.is_optioneel), [items])
  const hasVariants = useMemo(() => items.some(i => i.prijs_varianten && i.prijs_varianten.length > 0), [items])
  const hasSelections = hasOptionalItems || hasVariants

  // Initialize selection state when items load
  useEffect(() => {
    if (items.length === 0) return
    // If offerte already has saved selections (after acceptance), use those
    if (offerte?.gekozen_items) {
      setSelectedItems(new Set(offerte.gekozen_items))
      setSelectedVariants(offerte.gekozen_varianten || {})
      return
    }
    // Default: all non-text items selected, optional items deselected
    const initial = new Set<string>()
    const initialVariants: Record<string, string> = {}
    for (const item of items) {
      if (item.soort === 'tekst') continue
      if (!item.is_optioneel) {
        initial.add(item.id)
      }
      // Set active variant if defined
      if (item.actieve_variant_id && item.prijs_varianten?.length) {
        initialVariants[item.id] = item.actieve_variant_id
      }
    }
    setSelectedItems(initial)
    setSelectedVariants(initialVariants)
  }, [items, offerte?.gekozen_items, offerte?.gekozen_varianten])

  // Accepteren
  const handleAccepteren = useCallback(async () => {
    if (!token || acceptNaam.trim().length < 2 || !acceptAkkoord) return
    setAcceptLoading(true)
    try {
      const resp = await fetch('/api/offerte-accepteren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          naam: acceptNaam.trim(),
          gekozen_items: hasOptionalItems ? Array.from(selectedItems) : undefined,
          gekozen_varianten: Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        toast.error(data.error || 'Er ging iets mis')
        return
      }
      // Succes
      setShowAcceptModal(false)
      setOfferte((prev: PubliekOfferte | null) => prev ? {
        ...prev,
        status: 'goedgekeurd',
        geaccepteerd_door: acceptNaam.trim(),
        geaccepteerd_op: new Date().toISOString(),
      } : prev)
      setShowSuccess(true)
      successTimerRef.current = setTimeout(() => setShowSuccess(false), 4000)
    } catch {
      toast.error('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setAcceptLoading(false)
    }
  }, [token, acceptNaam, acceptAkkoord, selectedItems, selectedVariants, hasOptionalItems])

  // Wijziging aanvragen
  const handleWijziging = useCallback(async () => {
    if (!token || wijzigingOpmerking.trim().length < 10) return
    setWijzigingLoading(true)
    try {
      const resp = await fetch('/api/offerte-wijziging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, naam: wijzigingNaam.trim() || undefined, opmerking: wijzigingOpmerking.trim() }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        toast.error(data.error || 'Er ging iets mis')
        return
      }
      setShowWijzigingModal(false)
      setOfferte((prev: PubliekOfferte | null) => prev ? {
        ...prev,
        status: 'wijziging_gevraagd',
        wijziging_opmerking: wijzigingOpmerking.trim(),
        wijziging_ingediend_op: new Date().toISOString(),
      } : prev)
      toast.success('Wijziging aanvraag verstuurd!')
    } catch {
      toast.error('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setWijzigingLoading(false)
    }
  }, [token, wijzigingNaam, wijzigingOpmerking])

  // PDF download (client-side with jsPDF)
  const handleDownloadPDF = useCallback(async () => {
    if (!offerte) return
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageW = 210
      let y = 20

      // Bedrijfsnaam
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(bedrijf?.bedrijfsnaam || 'Offerte', 14, y)
      y += 10

      // Offerte info
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Offerte: ${offerte.nummer}`, 14, y)
      doc.text(`Datum: ${formatDate(offerte.created_at)}`, pageW - 14, y, { align: 'right' })
      y += 5
      if (offerte.geldig_tot) {
        doc.text(`Geldig tot: ${formatDate(offerte.geldig_tot)}`, 14, y)
        y += 5
      }

      // Klant
      if (klant) {
        y += 3
        doc.setFont('helvetica', 'bold')
        doc.text('Aan:', 14, y)
        doc.setFont('helvetica', 'normal')
        y += 5
        if (klant.bedrijfsnaam) { doc.text(klant.bedrijfsnaam, 14, y); y += 4 }
        if (klant.contactpersoon) { doc.text(`t.a.v. ${klant.contactpersoon}`, 14, y); y += 4 }
        if (klant.adres) { doc.text(klant.adres, 14, y); y += 4 }
        if (klant.postcode || klant.stad) { doc.text(`${klant.postcode || ''} ${klant.stad || ''}`.trim(), 14, y); y += 4 }
      }

      // Intro
      if (offerte.intro_tekst) {
        y += 4
        doc.setFontSize(9)
        const introLines = doc.splitTextToSize(offerte.intro_tekst, pageW - 28)
        doc.text(introLines, 14, y)
        y += introLines.length * 4 + 2
      }

      // Items tabel
      y += 4
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Omschrijving', 14, y)
      doc.text('Aantal', 110, y, { align: 'right' })
      doc.text('Prijs', 140, y, { align: 'right' })
      doc.text('BTW', 160, y, { align: 'right' })
      doc.text('Totaal', pageW - 14, y, { align: 'right' })
      y += 2
      doc.setDrawColor(200, 200, 200)
      doc.line(14, y, pageW - 14, y)
      y += 4

      doc.setFont('helvetica', 'normal')
      for (const item of items) {
        if (y > 270) { doc.addPage(); y = 20 }
        const lines = doc.splitTextToSize(item.beschrijving, 90)
        doc.text(lines, 14, y)
        if (item.soort !== 'tekst') {
          doc.text(String(item.aantal), 110, y, { align: 'right' })
          doc.text(formatCurrency(item.eenheidsprijs), 140, y, { align: 'right' })
          doc.text(`${item.btw_percentage}%`, 160, y, { align: 'right' })
          doc.text(formatCurrency(item.totaal), pageW - 14, y, { align: 'right' })
        }
        y += lines.length * 4 + 2
      }

      // Totalen
      y += 4
      doc.line(120, y, pageW - 14, y)
      y += 5
      doc.text('Subtotaal', 120, y)
      doc.text(formatCurrency(offerte.subtotaal), pageW - 14, y, { align: 'right' })
      y += 5
      doc.text('BTW', 120, y)
      doc.text(formatCurrency(offerte.btw_bedrag), pageW - 14, y, { align: 'right' })
      y += 2
      doc.line(120, y, pageW - 14, y)
      y += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Totaal incl. BTW', 120, y)
      doc.text(formatCurrency(offerte.aangepast_totaal ?? offerte.totaal), pageW - 14, y, { align: 'right' })

      // Outro
      if (offerte.outro_tekst) {
        y += 10
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const outroLines = doc.splitTextToSize(offerte.outro_tekst, pageW - 28)
        doc.text(outroLines, 14, y)
      }

      doc.save(`Offerte-${offerte.nummer}.pdf`)
    } catch {
      toast.error('PDF downloaden mislukt')
    }
  }, [offerte, items, bedrijf, klant])

  // ============ LOADING STATE ============
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Toaster position="top-center" richColors />
        <div className="max-w-[720px] mx-auto p-4 md:p-8 space-y-6">
          <div className="flex flex-col items-center gap-4 pt-8">
            <Skeleton className="h-14 w-32 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="space-y-3 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
            <Skeleton className="h-12 w-full mt-4" />
          </div>
        </div>
      </div>
    )
  }

  // ============ NOT FOUND ============
  if (notFound || !offerte) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <div className="bg-white rounded-2xl shadow-sm border max-w-md w-full p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Offerte niet gevonden</h2>
          <p className="text-sm text-gray-500">
            Deze offerte link is niet geldig of verlopen. Neem contact op met het bedrijf voor een nieuwe offerte.
          </p>
        </div>
      </div>
    )
  }

  // ============ DERIVED STATE ============
  const isVerlopen = offerte.geldig_tot && offerte.geldig_tot < new Date().toISOString().split('T')[0]
  const isGeaccepteerd = offerte.status === 'goedgekeurd'
  const isAfgewezen = offerte.status === 'afgewezen'
  const isGefactureerd = offerte.status === 'gefactureerd'
  const isWijzigingGevraagd = offerte.status === 'wijziging_gevraagd'
  const kanActie = !isVerlopen && !isGeaccepteerd && !isAfgewezen && !isGefactureerd
  const dagenOver = dagenTotVerlopen(offerte.geldig_tot)
  const btwGroepen = groepeerBtwMetSelectie(items, selectedItems, selectedVariants, hasOptionalItems)

  // Compute live total based on selections
  const berekendeSubtotaal = useMemo(() => {
    let sum = 0
    for (const item of items) {
      if (item.soort === 'tekst') continue
      if (hasOptionalItems && !selectedItems.has(item.id)) continue
      sum += getEffectiveItemTotal(item, selectedVariants[item.id])
    }
    return round2(sum)
  }, [items, selectedItems, selectedVariants, hasOptionalItems])

  const berekendeBtw = useMemo(() => {
    return round2(btwGroepen.reduce((sum, g) => sum + g.btw, 0))
  }, [btwGroepen])

  // Use live-computed totals if there are selections to make, otherwise use server totals
  const subtotaalBedrag = hasSelections ? berekendeSubtotaal : offerte.subtotaal
  const btwBedrag = hasSelections ? berekendeBtw : offerte.btw_bedrag
  const totaalBedrag = hasSelections ? round2(berekendeSubtotaal + berekendeBtw) : (offerte.aangepast_totaal ?? offerte.totaal)

  return (
    <div className={`min-h-screen bg-[#f8f9fa] transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <Toaster position="top-center" richColors />

      {/* Success confetti overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Offerte geaccepteerd!</h3>
            <p className="text-sm text-gray-500">
              Bedankt voor uw vertrouwen. We nemen snel contact met u op.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-[720px] mx-auto p-4 md:p-8 space-y-6 pb-32 md:pb-8">

        {/* ── Terug naar portaal knop ── */}
        {(() => {
          const params = new URLSearchParams(window.location.search)
          const terugUrl = params.get('terug')
          if (!terugUrl) return null
          return (
            <div className="pt-2">
              <a
                href={terugUrl}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Terug naar portaal
              </a>
            </div>
          )
        })()}

        {/* ── Header: Logo + Bedrijfsnaam ── */}
        <div className="text-center space-y-3 pt-4 md:pt-8">
          {bedrijf?.logo_url ? (
            <img
              src={bedrijf.logo_url}
              alt={bedrijf.bedrijfsnaam || 'Bedrijfslogo'}
              className="h-16 md:h-20 mx-auto object-contain drop-shadow-sm"
            />
          ) : (
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
          )}
        </div>

        {/* ── Status banners ── */}
        {isVerlopen && (
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-700">Deze offerte is verlopen op <span className="font-mono">{formatDate(offerte.geldig_tot)}</span></p>
              <p className="text-sm text-gray-500 mt-1">Neem contact op voor een nieuwe offerte.</p>
            </div>
          </div>
        )}

        {isGeaccepteerd && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">
                Deze offerte is geaccepteerd op {formatDateTime(offerte.geaccepteerd_op || '')}
                {offerte.geaccepteerd_door ? ` door ${offerte.geaccepteerd_door}` : ''}
              </p>
              <p className="text-sm text-green-600 mt-1">Bedankt voor uw vertrouwen. We nemen snel contact met u op.</p>
            </div>
          </div>
        )}

        {isWijzigingGevraagd && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <Edit3 className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800">
                Wijziging aangevraagd op {formatDateTime(offerte.wijziging_ingediend_op || '')}
              </p>
              <p className="text-sm text-orange-600 mt-1">We bekijken uw verzoek en komen bij u terug.</p>
            </div>
          </div>
        )}

        {/* ── Main card ── */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">

          {/* Offerte header */}
          <div className="p-6 md:p-8 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">{offerte.titel || `Offerte ${offerte.nummer}`}</h1>
                <p className="text-sm text-gray-500">Offerte {offerte.nummer}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-3xl md:text-4xl font-bold text-gray-900">{formatCurrency(totaalBedrag)}</p>
                <p className="text-xs text-gray-400">incl. BTW</p>
              </div>
            </div>

            {/* Meta info */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Datum</p>
                <p className="font-medium font-mono text-gray-700">{formatDate(offerte.created_at)}</p>
              </div>
              {offerte.geldig_tot && (
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Geldig tot</p>
                  <p className={`font-medium font-mono ${!isVerlopen && dagenOver <= 7 ? 'text-red-600' : 'text-gray-700'}`}>
                    {formatDate(offerte.geldig_tot)}
                    {!isVerlopen && dagenOver <= 7 && dagenOver > 0 && (
                      <span className="text-xs ml-1">({dagenOver} {dagenOver === 1 ? 'dag' : 'dagen'} resterend)</span>
                    )}
                  </p>
                </div>
              )}
              {(klant?.bedrijfsnaam || offerte.klant_naam) && (
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Klant</p>
                  <p className="font-medium text-gray-700">{klant?.bedrijfsnaam || offerte.klant_naam}</p>
                  {klant?.contactpersoon && <p className="text-xs text-gray-500">t.a.v. {klant.contactpersoon}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Intro tekst */}
          {offerte.intro_tekst && (
            <div className="px-6 md:px-8 py-4 border-b border-gray-100">
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{offerte.intro_tekst}</p>
            </div>
          )}

          {/* Items tabel */}
          {items.length > 0 && (
            <div className="px-6 md:px-8 py-6">
              {/* Info banner when there are selectable options */}
              {hasSelections && kanActie && (
                <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                  <span>
                    {hasOptionalItems && hasVariants
                      ? 'Selecteer de gewenste opties en kies uw voorkeur bij de staffelprijzen.'
                      : hasOptionalItems
                      ? 'Vink de optionele items aan die u wenst.'
                      : 'Kies uw voorkeur bij de staffelprijzen.'}
                  </span>
                </div>
              )}
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      {hasOptionalItems && <th className="pb-3 pl-2 pr-2 font-medium w-8"></th>}
                      <th className="pb-3 pr-4 pl-2 font-medium">Omschrijving</th>
                      <th className="pb-3 pr-4 text-right font-medium whitespace-nowrap">Aantal</th>
                      <th className="pb-3 pr-4 text-right font-medium whitespace-nowrap hidden md:table-cell">Eenheid</th>
                      <th className="pb-3 pr-4 text-right font-medium whitespace-nowrap">Prijs excl.</th>
                      <th className="pb-3 pr-4 text-right font-medium whitespace-nowrap hidden md:table-cell">BTW</th>
                      <th className="pb-3 pl-4 text-right font-medium whitespace-nowrap">Totaal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: PubliekItem) => {
                      const isSelected = selectedItems.has(item.id)
                      const effectiveValues = item.soort !== 'tekst' ? getEffectiveItemValues(item, selectedVariants[item.id]) : null
                      const effectiveTotal = item.soort !== 'tekst' ? getEffectiveItemTotal(item, selectedVariants[item.id]) : 0
                      const isDeselected = hasOptionalItems && !isSelected && item.soort !== 'tekst'

                      return (
                        <React.Fragment key={item.id}>
                          <tr className={`border-b border-gray-50 last:border-0 transition-opacity ${isDeselected ? 'opacity-40' : ''}`}>
                            {/* Checkbox column */}
                            {hasOptionalItems && (
                              <td className="py-3 pl-2 pr-2 align-top">
                                {item.soort !== 'tekst' && (
                                  item.is_optioneel && kanActie ? (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked: boolean) => {
                                        setSelectedItems(prev => {
                                          const next = new Set(prev)
                                          if (checked) next.add(item.id)
                                          else next.delete(item.id)
                                          return next
                                        })
                                      }}
                                      className="mt-0.5"
                                    />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-gray-300 mt-0.5" />
                                  )
                                )}
                              </td>
                            )}
                            <td className="py-3 pr-4 pl-2">
                              <span className="text-gray-800">{item.beschrijving}</span>
                              {item.is_optioneel && (
                                <span className="ml-2 text-2xs uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Optioneel</span>
                              )}
                            </td>
                            {item.soort === 'tekst' ? (
                              <td colSpan={5} />
                            ) : (
                              <>
                                <td className="py-3 pr-4 text-right text-gray-600 tabular-nums">{effectiveValues?.aantal ?? item.aantal}</td>
                                <td className="py-3 pr-4 text-right text-gray-500 hidden md:table-cell">stuk</td>
                                <td className="py-3 pr-4 text-right text-gray-600 tabular-nums">{formatCurrency(effectiveValues?.eenheidsprijs ?? item.eenheidsprijs)}</td>
                                <td className="py-3 pr-4 text-right text-gray-500 hidden md:table-cell">{effectiveValues?.btw_percentage ?? item.btw_percentage}%</td>
                                <td className="py-3 pl-4 text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(effectiveTotal)}</td>
                              </>
                            )}
                          </tr>
                          {/* Variant selector row */}
                          {item.prijs_varianten && item.prijs_varianten.length > 0 && kanActie && !isDeselected && (
                            <tr className="border-b border-gray-50">
                              {hasOptionalItems && <td />}
                              <td colSpan={6} className="py-2 pl-2 pr-4">
                                <div className="flex items-center gap-2 pl-1">
                                  <span className="text-xs text-gray-500 shrink-0">Kies variant:</span>
                                  <select
                                    value={selectedVariants[item.id] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setSelectedVariants(prev => {
                                        if (!val) {
                                          const next = { ...prev }
                                          delete next[item.id]
                                          return next
                                        }
                                        return { ...prev, [item.id]: val }
                                      })
                                    }}
                                    className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-[300px]"
                                  >
                                    <option value="">Standaard — {item.aantal} x {formatCurrency(item.eenheidsprijs)}</option>
                                    {item.prijs_varianten.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.label} — {v.aantal} x {formatCurrency(v.eenheidsprijs)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totalen sectie */}
          <div className="bg-gray-50/50 border-t border-gray-100 px-6 md:px-8 py-6">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotaal</span>
                <span className="tabular-nums">{formatCurrency(subtotaalBedrag)}</span>
              </div>
              {btwGroepen.map((g) => (
                <div key={g.percentage} className="flex justify-between text-sm text-gray-500">
                  <span>BTW {g.percentage}% over {formatCurrency(g.basis)}</span>
                  <span className="tabular-nums">{formatCurrency(g.btw)}</span>
                </div>
              ))}
              {offerte.afrondingskorting_excl_btw != null && offerte.afrondingskorting_excl_btw !== 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Afrondingskorting</span>
                  <span className="tabular-nums">-{formatCurrency(Math.abs(offerte.afrondingskorting_excl_btw))}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Totaal incl. BTW</span>
                <span className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">
                  {formatCurrency(totaalBedrag)}
                </span>
              </div>
            </div>
          </div>

          {/* Outro tekst */}
          {offerte.outro_tekst && (
            <div className="px-6 md:px-8 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{offerte.outro_tekst}</p>
            </div>
          )}

          {/* Voorwaarden */}
          {offerte.voorwaarden && (
            <div className="px-6 md:px-8 py-4 border-t border-gray-100 bg-gray-50/30">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-medium">Voorwaarden</p>
              <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{offerte.voorwaarden}</p>
            </div>
          )}
        </div>

        {/* ── PDF Download ── */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="gap-2 text-gray-600 hover:text-gray-900"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* ── Action buttons (desktop) ── */}
        {kanActie && (
          <div className="hidden md:flex gap-3">
            <Button
              onClick={() => setShowAcceptModal(true)}
              className="flex-1 h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Offerte accepteren
            </Button>
            <Button
              onClick={() => setShowWijzigingModal(true)}
              variant="outline"
              className="flex-1 h-14 text-base font-semibold rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <Edit3 className="h-5 w-5 mr-2" />
              Wijziging aanvragen
            </Button>
          </div>
        )}

        {/* Verlopen disabled buttons */}
        {isVerlopen && !isGeaccepteerd && !isAfgewezen && !isGefactureerd && (
          <div className="hidden md:flex gap-3">
            <div className="flex-1 h-14 flex items-center justify-center text-sm text-gray-400 bg-gray-100 rounded-xl cursor-not-allowed" title="Deze offerte is niet meer geldig">
              Offerte accepteren
            </div>
            <div className="flex-1 h-14 flex items-center justify-center text-sm text-gray-400 bg-gray-100 rounded-xl cursor-not-allowed" title="Deze offerte is niet meer geldig">
              Wijziging aanvragen
            </div>
          </div>
        )}

        {/* Veilig tekst */}
        {kanActie && (
          <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            Veilig en versleuteld
          </p>
        )}

        {/* ── Footer ── */}
        <div className="text-center text-xs text-gray-400 pb-4 space-y-1">
          <p>{bedrijf?.bedrijfsnaam}{bedrijf?.kvk_nummer ? ` · KvK ${bedrijf.kvk_nummer}` : ''}</p>
          {bedrijf?.bedrijfs_adres && <p>{bedrijf.bedrijfs_adres}</p>}
          {bedrijf?.bedrijfs_telefoon && <p>{bedrijf.bedrijfs_telefoon}</p>}
        </div>
      </div>

      {/* ── Sticky mobile action bar ── */}
      {kanActie && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 p-4 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40">
          <Button
            onClick={() => setShowAcceptModal(true)}
            className="flex-1 h-12 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Accepteren
          </Button>
          <Button
            onClick={() => setShowWijzigingModal(true)}
            variant="outline"
            className="flex-1 h-12 text-sm font-semibold rounded-xl border-orange-200 text-orange-700"
          >
            <Edit3 className="h-4 w-4 mr-1.5" />
            Wijziging
          </Button>
        </div>
      )}

      {/* ── Accept Modal ── */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 animate-in fade-in duration-200" onClick={() => setShowAcceptModal(false)}>
          <div
            className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Offerte accepteren</h3>
                <button onClick={() => setShowAcceptModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Samenvatting */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Offerte {offerte.nummer}</p>
                  <p className="text-xs text-gray-400">{offerte.titel}</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totaalBedrag)}</p>
              </div>

              {/* Geselecteerde opties samenvatting */}
              {hasOptionalItems && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-medium text-gray-600">Geselecteerde items:</p>
                  {items.filter(i => i.soort !== 'tekst' && selectedItems.has(i.id)).map(i => (
                    <div key={i.id} className="flex justify-between">
                      <span className="truncate mr-2">{i.is_optioneel ? '✓ ' : ''}{i.beschrijving}</span>
                      <span className="shrink-0 tabular-nums">{formatCurrency(getEffectiveItemTotal(i, selectedVariants[i.id]))}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tekst */}
              <p className="text-sm text-gray-600">
                Door uw naam in te vullen en op Bevestigen te klikken, gaat u akkoord met deze offerte
                {bedrijf?.bedrijfsnaam ? ` van ${bedrijf.bedrijfsnaam}` : ''}
                {hasOptionalItems ? ' met bovenstaande selectie' : ''}.
              </p>

              {/* Naam input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Uw volledige naam *</label>
                <Input
                  value={acceptNaam}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAcceptNaam(e.target.value)}
                  placeholder="Vul uw volledige naam in"
                  className="h-12"
                  autoFocus
                />
              </div>

              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={acceptAkkoord}
                  onCheckedChange={(checked: boolean) => setAcceptAkkoord(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-600">Ik ga akkoord met deze offerte</span>
              </label>

              {/* Bevestig knop */}
              <Button
                onClick={handleAccepteren}
                disabled={acceptLoading || acceptNaam.trim().length < 2 || !acceptAkkoord}
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-40"
              >
                {acceptLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Bevestigen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Wijziging Modal ── */}
      {showWijzigingModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 animate-in fade-in duration-200" onClick={() => setShowWijzigingModal(false)}>
          <div
            className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Wijziging aanvragen</h3>
                <button onClick={() => setShowWijzigingModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Wat wilt u aangepast hebben? *</label>
                <textarea
                  value={wijzigingOpmerking}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWijzigingOpmerking(e.target.value)}
                  placeholder="Beschrijf uw gewenste wijziging (minimaal 10 tekens)..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm min-h-[120px] focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  autoFocus
                />
                <p className="text-xs text-gray-400">{wijzigingOpmerking.length}/10 tekens minimum</p>
              </div>

              {/* Naam */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Uw naam <span className="text-gray-400">(optioneel)</span></label>
                <Input
                  value={wijzigingNaam}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWijzigingNaam(e.target.value)}
                  placeholder="Uw naam"
                  className="h-12"
                />
              </div>

              {/* Verstuur */}
              <Button
                onClick={handleWijziging}
                disabled={wijzigingLoading || wijzigingOpmerking.trim().length < 10}
                className="w-full h-12 text-base font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl disabled:opacity-40"
              >
                {wijzigingLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Edit3 className="h-5 w-5 mr-2" />
                    Verstuur opmerking
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
