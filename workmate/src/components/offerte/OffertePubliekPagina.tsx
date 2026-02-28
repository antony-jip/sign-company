import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react'
import {
  getOfferteByPubliekToken,
  updateOfferteTracking,
  respondOpOfferte,
  getOfferteItems,
  getProfile,
} from '@/services/supabaseService'
import type { Offerte, OfferteItem, Profile } from '@/types'
import { toast, Toaster } from 'sonner'

// ============ HELPERS ============

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
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

export function OffertePubliekPagina() {
  const { token } = useParams<{ token: string }>()
  const [offerte, setOfferte] = useState<Offerte | null>(null)
  const [items, setItems] = useState<OfferteItem[]>([])
  const [companyProfile, setCompanyProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reactie, setReactie] = useState<'goedgekeurd' | 'afgewezen' | 'vraag' | null>(null)
  const [vraagTekst, setVraagTekst] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) {
        setNotFound(true)
        setIsLoading(false)
        return
      }
      try {
        // Track the view
        await updateOfferteTracking(token).catch(() => {})

        const data = await getOfferteByPubliekToken(token)
        if (!cancelled) {
          if (data) {
            setOfferte(data)
            // Fetch items + company profile in parallel
            const [offerteItems] = await Promise.all([
              getOfferteItems(data.id).catch(() => [] as OfferteItem[]),
              getProfile(data.user_id).then((p) => {
                if (!cancelled && p) setCompanyProfile(p)
              }).catch(() => {}),
            ])
            if (!cancelled) setItems(offerteItems)
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

  const handleReactie = useCallback(async (type: 'goedgekeurd' | 'afgewezen' | 'vraag') => {
    if (!token) return
    if (type === 'vraag' && !vraagTekst.trim()) {
      toast.error('Stel uw vraag voordat u verstuurt')
      return
    }

    setIsSubmitting(true)
    try {
      await respondOpOfferte(token, { type, bericht: type === 'vraag' ? vraagTekst.trim() : undefined })
      setSubmitted(true)
      setReactie(type)
      toast.success(
        type === 'goedgekeurd'
          ? 'Offerte goedgekeurd! Het bedrijf is op de hoogte gesteld.'
          : type === 'afgewezen'
          ? 'Uw reactie is vastgelegd.'
          : 'Uw vraag is verstuurd!'
      )
    } catch {
      toast.error('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setIsSubmitting(false)
    }
  }, [token, vraagTekst])

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Toaster position="top-center" richColors />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Offerte laden...</p>
        </div>
      </div>
    )
  }

  // Not found
  if (notFound || !offerte) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-semibold text-gray-800">Offerte niet gevonden</h2>
            <p className="text-sm text-gray-500 text-center">
              Deze link is ongeldig of verlopen. Neem contact op met het bedrijf.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isVerlopen = offerte.geldig_tot && offerte.geldig_tot < new Date().toISOString().split('T')[0]
  const isAfgerond = offerte.status === 'goedgekeurd' || offerte.status === 'afgewezen'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <Toaster position="top-center" richColors />
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {companyProfile?.logo_url ? (
            <img
              src={companyProfile.logo_url}
              alt={companyProfile.bedrijfsnaam || 'Bedrijfslogo'}
              className="h-14 mx-auto object-contain"
            />
          ) : (
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-lg">
              <FileText className="h-7 w-7 text-white" />
            </div>
          )}
          {companyProfile?.bedrijfsnaam && (
            <p className="text-sm font-medium text-gray-600">{companyProfile.bedrijfsnaam}</p>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Offerte bekijken</h1>
          <p className="text-sm text-gray-500">{offerte.nummer}</p>
        </div>

        {/* Status */}
        {isVerlopen && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Deze offerte is verlopen</p>
              <p className="text-sm text-amber-600">Geldig tot {formatDate(offerte.geldig_tot)}</p>
            </div>
          </div>
        )}

        {isAfgerond && (
          <div className={`flex items-center gap-3 rounded-xl p-4 border ${
            offerte.status === 'goedgekeurd'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}>
            {offerte.status === 'goedgekeurd' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <ThumbsDown className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <p className={`font-medium ${
              offerte.status === 'goedgekeurd' ? 'text-emerald-800' : 'text-red-800'
            }`}>
              Deze offerte is {offerte.status === 'goedgekeurd' ? 'goedgekeurd' : 'afgewezen'}
            </p>
          </div>
        )}

        {/* Offerte details */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{offerte.titel}</h2>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Building2 className="h-4 w-4" />
                <span>Klant</span>
              </div>
              <div className="font-medium text-gray-900">{offerte.klant_naam || '-'}</div>

              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Datum</span>
              </div>
              <div className="font-medium text-gray-900">{formatDate(offerte.created_at)}</div>

              {offerte.geldig_tot && (
                <>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Geldig tot</span>
                  </div>
                  <div className="font-medium text-gray-900">{formatDate(offerte.geldig_tot)}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items tabel */}
        {items.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Regels</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="pb-2 pr-4">Omschrijving</th>
                      <th className="pb-2 pr-4 text-right">Aantal</th>
                      <th className="pb-2 pr-4 text-right">Prijs</th>
                      <th className="pb-2 pr-4 text-right">BTW</th>
                      <th className="pb-2 text-right">Totaal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-4">{item.beschrijving}</td>
                        <td className="py-2 pr-4 text-right">{item.aantal}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(item.eenheidsprijs)}</td>
                        <td className="py-2 pr-4 text-right">{item.btw_percentage}%</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(item.totaal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotaal</span>
                  <span>{formatCurrency(offerte.subtotaal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>BTW</span>
                  <span>{formatCurrency(offerte.btw_bedrag)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Totaal</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(offerte.totaal)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notities / Voorwaarden */}
        {(offerte.notities || offerte.voorwaarden) && (
          <Card>
            <CardContent className="p-6 space-y-4">
              {offerte.notities && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Opmerkingen</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{offerte.notities}</p>
                </div>
              )}
              {offerte.voorwaarden && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Voorwaarden</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{offerte.voorwaarden}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reactie sectie */}
        {!isAfgerond && !isVerlopen && !submitted && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Uw reactie</h3>
              <p className="text-sm text-gray-500">
                Wat vindt u van deze offerte? U kunt direct goedkeuren, afwijzen, of een vraag stellen.
              </p>

              {reactie === 'vraag' ? (
                <div className="space-y-3">
                  <Label>Uw vraag of opmerking</Label>
                  <textarea
                    value={vraagTekst}
                    onChange={(e) => setVraagTekst(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Typ hier uw vraag of opmerking..."
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReactie('vraag')}
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                      Verstuur vraag
                    </Button>
                    <Button variant="outline" onClick={() => setReactie(null)}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => handleReactie('goedgekeurd')}
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-12"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ThumbsUp className="h-5 w-5 mr-2" />}
                    Goedkeuren
                  </Button>
                  <Button
                    onClick={() => handleReactie('afgewezen')}
                    disabled={isSubmitting}
                    variant="outline"
                    className="flex-1 h-12 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <ThumbsDown className="h-5 w-5 mr-2" />
                    Afwijzen
                  </Button>
                  <Button
                    onClick={() => setReactie('vraag')}
                    disabled={isSubmitting}
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Vraag stellen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Success message */}
        {submitted && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h3 className="text-lg font-semibold text-gray-900">Bedankt voor uw reactie!</h3>
              <p className="text-sm text-gray-500 text-center">
                {reactie === 'goedgekeurd'
                  ? 'De offerte is goedgekeurd. Het bedrijf neemt contact met u op over de volgende stappen.'
                  : reactie === 'afgewezen'
                  ? 'Uw reactie is vastgelegd. Het bedrijf kan contact met u opnemen.'
                  : 'Uw vraag is verstuurd. Het bedrijf neemt zo snel mogelijk contact met u op.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-8">
          Offerte {offerte.nummer}{companyProfile?.bedrijfsnaam ? ` \u00b7 ${companyProfile.bedrijfsnaam}` : ''}
        </p>
      </div>
    </div>
  )
}
