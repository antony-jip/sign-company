import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Euro,
  Calendar,
  Building2,
} from 'lucide-react'
import { getFactuurByBetaalToken, markFactuurBekeken, getProfile } from '@/services/supabaseService'
import type { Factuur, Profile } from '@/types'

// ============ EPC QR CODE GENERATOR (inline, no external lib) ============

/**
 * Generate EPC QR payload per European Payments Council standard
 * BCD\n002\n1\nSCT\n\nBeneficiary\nIBAN\nEURAmount\n\n\nReference\n
 */
function generateEpcPayload(
  bedrijfsnaam: string,
  iban: string,
  bedrag: number,
  referentie: string
): string {
  const lines = [
    'BCD',           // Service tag
    '002',           // Version
    '1',             // Encoding (UTF-8)
    'SCT',           // SEPA Credit Transfer
    '',              // BIC (optional)
    bedrijfsnaam.substring(0, 70),
    iban.replace(/\s/g, ''),
    `EUR${bedrag.toFixed(2)}`,
    '',              // Purpose
    '',              // Structured reference
    referentie.substring(0, 140), // Unstructured reference
    '',              // Beneficiary to originator info
  ]
  return lines.join('\n')
}

/**
 * Minimal QR Code encoder — renders to Canvas, returns data URL.
 * Uses the QR Server API for simplicity (public, free, no signup).
 * Falls back to text display if image fails.
 */
function QRCodeCanvas({
  data,
  size = 200,
}: {
  data: string
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    const encoded = encodeURIComponent(data)
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&ecc=M`

    img.onload = () => {
      canvas.width = size
      canvas.height = size
      ctx.drawImage(img, 0, 0, size, size)
      setLoaded(true)
    }
    img.onerror = () => {
      setError(true)
    }
  }, [data, size])

  if (error) {
    return (
      <div
        className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg"
        style={{ width: size, height: size }}
      >
        <p className="text-xs text-gray-400 text-center px-2">
          QR code kon niet geladen worden
        </p>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-lg ${loaded ? '' : 'animate-pulse bg-gray-100'}`}
    />
  )
}

// ============ HELPERS ============

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ============ COMPONENT ============

export function BetaalPagina() {
  const { token } = useParams<{ token: string }>()
  const [factuur, setFactuur] = useState<Factuur | null>(null)
  const [companyProfile, setCompanyProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) {
        setNotFound(true)
        setIsLoading(false)
        return
      }
      try {
        const data = await getFactuurByBetaalToken(token)
        if (!cancelled) {
          if (data) {
            setFactuur(data)
            // Mark as bekeken
            markFactuurBekeken(token).catch(() => {})
            // Load company profile for IBAN and bedrijfsnaam
            getProfile(data.user_id).then((p) => {
              if (!cancelled && p) setCompanyProfile(p)
            }).catch(() => {})
          } else {
            setNotFound(true)
          }
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  const handleCopyIban = useCallback((iban: string) => {
    navigator.clipboard.writeText(iban.replace(/\s/g, '')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [])

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Factuur laden...</p>
        </div>
      </div>
    )
  }

  // Not found
  if (notFound || !factuur) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-semibold text-gray-800">Factuur niet gevonden</h2>
            <p className="text-sm text-gray-500 text-center">
              Deze betaallink is ongeldig of verlopen. Neem contact op met het bedrijf als u
              denkt dat dit een fout is.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isBetaald = factuur.status === 'betaald'
  const isVervallen = !isBetaald && factuur.vervaldatum < new Date().toISOString().split('T')[0]

  // Use IBAN from company profile (loaded after factuur)
  const companyIban = companyProfile?.iban || null
  const companyNaam = companyProfile?.bedrijfsnaam || factuur.klant_naam || 'Betaling'

  // EPC QR data (only if we have IBAN)
  const epcData = companyIban
    ? generateEpcPayload(
        companyNaam,
        companyIban,
        Math.max(0, factuur.totaal - factuur.betaald_bedrag),
        factuur.nummer
      )
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Factuur betalen</h1>
          <p className="text-sm text-gray-500">
            {factuur.nummer}
          </p>
        </div>

        {/* Status banner */}
        {isBetaald && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-medium text-emerald-800">Deze factuur is betaald</p>
              {factuur.betaaldatum && (
                <p className="text-sm text-emerald-600">Betaald op {formatDate(factuur.betaaldatum)}</p>
              )}
            </div>
          </div>
        )}

        {isVervallen && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Deze factuur is vervallen</p>
              <p className="text-sm text-red-600">Vervaldatum was {formatDate(factuur.vervaldatum)}</p>
            </div>
          </div>
        )}

        {/* Factuur details */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{factuur.titel}</h2>
              <Badge
                variant="secondary"
                className={
                  isBetaald
                    ? 'bg-emerald-100 text-emerald-700'
                    : isVervallen
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }
              >
                {isBetaald ? 'Betaald' : isVervallen ? 'Vervallen' : 'Openstaand'}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Building2 className="h-4 w-4" />
                <span>Klant</span>
              </div>
              <div className="font-medium text-gray-900">{factuur.klant_naam || '-'}</div>

              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Factuurdatum</span>
              </div>
              <div className="font-medium text-gray-900">{formatDate(factuur.factuurdatum)}</div>

              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Vervaldatum</span>
              </div>
              <div className="font-medium text-gray-900">{formatDate(factuur.vervaldatum)}</div>
            </div>

            <Separator />

            {/* Bedragen */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotaal</span>
                <span>{formatCurrency(factuur.subtotaal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>BTW</span>
                <span>{formatCurrency(factuur.btw_bedrag)}</span>
              </div>
              {factuur.betaald_bedrag > 0 && !isBetaald && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Reeds betaald</span>
                  <span>-{formatCurrency(factuur.betaald_bedrag)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">
                  {isBetaald ? 'Totaal betaald' : 'Te betalen'}
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  <Euro className="h-5 w-5 inline mr-1" />
                  {isBetaald
                    ? formatCurrency(factuur.totaal)
                    : formatCurrency(Math.max(0, factuur.totaal - factuur.betaald_bedrag))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Betaalinformatie + QR */}
        {!isBetaald && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Betaalinformatie</h3>

              <div className="flex flex-col md:flex-row gap-6">
                {/* QR Code */}
                {epcData && (
                  <div className="flex flex-col items-center gap-3">
                    <QRCodeCanvas data={epcData} size={180} />
                    <p className="text-xs text-gray-400 text-center max-w-[180px]">
                      Scan met uw bank-app om direct te betalen
                    </p>
                  </div>
                )}

                {/* Bankgegevens */}
                <div className="flex-1 space-y-4">
                  {companyIban && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        IBAN
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-base font-mono font-semibold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg">
                          {companyIban.replace(/(.{4})/g, '$1 ').trim()}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyIban(companyIban)}
                          className="h-8 w-8 p-0"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      {companyProfile?.bedrijfsnaam && (
                        <p className="text-xs text-gray-500 mt-1">
                          t.n.v. {companyProfile.bedrijfsnaam}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Bedrag
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatCurrency(Math.max(0, factuur.totaal - factuur.betaald_bedrag))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Omschrijving / Kenmerk
                    </p>
                    <code className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg inline-block">
                      {factuur.nummer}
                    </code>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Uiterlijk betalen voor
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(factuur.vervaldatum)}
                    </p>
                  </div>
                </div>
              </div>

              {!companyIban && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  Neem contact op met het bedrijf voor de bankgegevens om deze factuur te betalen.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-8">
          Factuur {factuur.nummer} &middot; Gegenereerd door Sign Company
        </p>
      </div>
    </div>
  )
}
