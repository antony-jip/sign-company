import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import {
  CheckCircle2,
  RotateCcw,
  FileText,
  FileImage,
  File,
  Download,
  Eye,
  Building2,
  Clock,
  Receipt,
} from 'lucide-react'
import {
  getTekeningGoedkeuringByToken,
  updateTekeningGoedkeuringByToken,
  getDocumenten,
  getOfferte,
  getOfferteItems,
  getKlant,
  getProject,
} from '@/services/supabaseService'
import type { TekeningGoedkeuring, Document, Offerte, OfferteItem, Klant, Project } from '@/types'

function getFileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="h-10 w-10 text-red-500" />
  if (type.includes('image') || type.includes('jpeg') || type.includes('png'))
    return <FileImage className="h-10 w-10 text-purple-500" />
  return <File className="h-10 w-10 text-gray-400" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function calculateLineTotaal(item: { aantal: number; eenheidsprijs: number; korting_percentage: number }) {
  const bruto = item.aantal * item.eenheidsprijs
  return bruto - bruto * (item.korting_percentage / 100)
}

export function ClientApprovalPage() {
  const { token } = useParams<{ token: string }>()
  const [goedkeuring, setGoedkeuring] = useState<TekeningGoedkeuring | null>(null)
  const [documenten, setDocumenten] = useState<Document[]>([])
  const [offerte, setOfferte] = useState<Offerte | null>(null)
  const [offerteItems, setOfferteItems] = useState<OfferteItem[]>([])
  const [klant, setKlant] = useState<Klant | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRevisieForm, setShowRevisieForm] = useState(false)
  const [revisieOpmerkingen, setRevisieOpmerkingen] = useState('')
  const [goedgekeurdDoor, setGoedgekeurdDoor] = useState('')
  const [activeTab, setActiveTab] = useState<'tekeningen' | 'offerte'>('tekeningen')

  useEffect(() => {
    if (!token) return

    async function fetchData() {
      setIsLoading(true)
      try {
        const gk = await getTekeningGoedkeuringByToken(token!)
        if (!gk) {
          setIsLoading(false)
          return
        }
        setGoedkeuring(gk)

        // Mark as bekeken if verzonden
        if (gk.status === 'verzonden') {
          await updateTekeningGoedkeuringByToken(token!, { status: 'bekeken' })
          setGoedkeuring(prev => prev ? { ...prev, status: 'bekeken' } : null)
        }

        // Fetch related data
        const allDocs = await getDocumenten()
        setDocumenten(allDocs.filter(d => gk.document_ids.includes(d.id)))

        const [klantData, projectData] = await Promise.all([
          getKlant(gk.klant_id),
          getProject(gk.project_id),
        ])
        setKlant(klantData)
        setProject(projectData)

        if (gk.offerte_id) {
          const [offerteData, itemsData] = await Promise.all([
            getOfferte(gk.offerte_id),
            getOfferteItems(gk.offerte_id),
          ])
          setOfferte(offerteData)
          setOfferteItems(itemsData)
        }
      } catch (err) {
        console.error('Fout bij laden:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token])

  const handleGoedkeuren = async () => {
    if (!token || !goedgekeurdDoor.trim()) {
      toast.error('Vul uw naam in om goed te keuren')
      return
    }
    setIsSubmitting(true)
    try {
      await updateTekeningGoedkeuringByToken(token, {
        status: 'goedgekeurd',
        goedgekeurd_door: goedgekeurdDoor.trim(),
        goedgekeurd_op: new Date().toISOString(),
      })
      setGoedkeuring(prev => prev ? {
        ...prev,
        status: 'goedgekeurd',
        goedgekeurd_door: goedgekeurdDoor.trim(),
        goedgekeurd_op: new Date().toISOString(),
      } : null)
      toast.success('Tekening(en) goedgekeurd! Bedankt.')
    } catch (err) {
      console.error('Fout bij goedkeuren:', err)
      toast.error('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevisie = async () => {
    if (!token || !revisieOpmerkingen.trim()) {
      toast.error('Vul uw opmerkingen in voor de revisie')
      return
    }
    setIsSubmitting(true)
    try {
      await updateTekeningGoedkeuringByToken(token, {
        status: 'revisie',
        revisie_opmerkingen: revisieOpmerkingen.trim(),
      })
      setGoedkeuring(prev => prev ? {
        ...prev,
        status: 'revisie',
        revisie_opmerkingen: revisieOpmerkingen.trim(),
      } : null)
      toast.success('Revisie aangevraagd. We gaan ermee aan de slag!')
    } catch (err) {
      console.error('Fout bij revisie:', err)
      toast.error('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-500 mt-4">Laden...</p>
        </div>
      </div>
    )
  }

  // Not found
  if (!goedkeuring) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link niet geldig</h1>
          <p className="text-gray-500">
            Deze goedkeuringslink is niet (meer) geldig. Neem contact op met het bedrijf als u denkt dat dit een fout is.
          </p>
        </div>
      </div>
    )
  }

  // Already decided
  const isDecided = goedkeuring.status === 'goedgekeurd' || goedkeuring.status === 'revisie'

  // Offerte totals
  const offerteSubtotaal = offerteItems.reduce((sum, item) => sum + calculateLineTotaal(item), 0)
  const btwGroups: Record<number, number> = {}
  offerteItems.forEach((item) => {
    const lineTotaal = calculateLineTotaal(item)
    btwGroups[item.btw_percentage] = (btwGroups[item.btw_percentage] || 0) + lineTotaal * (item.btw_percentage / 100)
  })
  const totaalBtw = Object.values(btwGroups).reduce((sum, val) => sum + val, 0)
  const offerteTotaal = offerteSubtotaal + totaalBtw

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tekening Goedkeuring</h1>
              {project && (
                <p className="text-sm text-gray-500">Project: {project.naam}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Status Banner */}
        {isDecided && (
          <div className={`rounded-xl p-5 ${
            goedkeuring.status === 'goedgekeurd'
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              {goedkeuring.status === 'goedgekeurd' ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <RotateCcw className="h-6 w-6 text-amber-600 flex-shrink-0" />
              )}
              <div>
                <h2 className={`font-semibold ${
                  goedkeuring.status === 'goedgekeurd' ? 'text-green-800' : 'text-amber-800'
                }`}>
                  {goedkeuring.status === 'goedgekeurd'
                    ? `Goedgekeurd door ${goedkeuring.goedgekeurd_door}`
                    : 'Revisie aangevraagd'
                  }
                </h2>
                <p className={`text-sm ${
                  goedkeuring.status === 'goedgekeurd' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {goedkeuring.status === 'goedgekeurd'
                    ? `Op ${goedkeuring.goedgekeurd_op ? formatDate(goedkeuring.goedgekeurd_op) : 'onbekend'}`
                    : goedkeuring.revisie_opmerkingen
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {offerte && (
          <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setActiveTab('tekeningen')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'tekeningen'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileImage className="h-4 w-4 inline mr-2" />
              Tekeningen ({documenten.length})
            </button>
            <button
              onClick={() => setActiveTab('offerte')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'offerte'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Receipt className="h-4 w-4 inline mr-2" />
              Offerte
            </button>
          </div>
        )}

        {/* Tekeningen Tab */}
        {activeTab === 'tekeningen' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Tekeningen & Bestanden</h2>
              <p className="text-sm text-gray-500 mt-1">
                Bekijk de onderstaande bestanden en geef uw goedkeuring of vraag een revisie aan.
              </p>
            </div>

            <div className="p-6 space-y-3">
              {documenten.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Geen bestanden gevonden.</p>
              ) : (
                documenten.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {getFileIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.naam}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{formatFileSize(doc.grootte)}</span>
                        <span className="text-xs text-gray-400">{doc.type}</span>
                        <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Bekijk
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Offerte Tab */}
        {activeTab === 'offerte' && offerte && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{offerte.titel}</h2>
                  <p className="text-sm text-gray-500">{offerte.nummer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Geldig tot</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(offerte.geldig_tot)}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-1 font-semibold text-gray-600 w-8">#</th>
                    <th className="text-left py-2 px-1 font-semibold text-gray-600">Beschrijving</th>
                    <th className="text-right py-2 px-1 font-semibold text-gray-600 w-16">Aantal</th>
                    <th className="text-right py-2 px-1 font-semibold text-gray-600 w-24">Prijs</th>
                    <th className="text-right py-2 px-1 font-semibold text-gray-600 w-16">BTW</th>
                    <th className="text-right py-2 px-1 font-semibold text-gray-600 w-24">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {offerteItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2.5 px-1 text-gray-400">{index + 1}</td>
                      <td className="py-2.5 px-1 text-gray-900">{item.beschrijving}</td>
                      <td className="py-2.5 px-1 text-right text-gray-700">{item.aantal}</td>
                      <td className="py-2.5 px-1 text-right text-gray-700">{formatCurrency(item.eenheidsprijs)}</td>
                      <td className="py-2.5 px-1 text-right text-gray-500">{item.btw_percentage}%</td>
                      <td className="py-2.5 px-1 text-right font-medium text-gray-900">
                        {formatCurrency(calculateLineTotaal(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mt-4">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotaal</span>
                    <span className="font-medium">{formatCurrency(offerteSubtotaal)}</span>
                  </div>
                  {Object.entries(btwGroups).map(([pct, bedrag]) => (
                    <div key={pct} className="flex justify-between text-sm">
                      <span className="text-gray-500">BTW {pct}%</span>
                      <span className="font-medium">{formatCurrency(bedrag)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t-2 border-gray-300 pt-2 mt-2">
                    <span className="text-base font-bold">Totaal</span>
                    <span className="text-base font-bold text-blue-600">{formatCurrency(offerteTotaal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            {offerte.voorwaarden && (
              <div className="px-6 pb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Voorwaarden</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{offerte.voorwaarden}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approval Actions */}
        {!isDecided && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Uw beoordeling</h2>

            {!showRevisieForm ? (
              <>
                {/* Goedkeuren */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Uw naam (voor goedkeuring)
                    </label>
                    <input
                      type="text"
                      value={goedgekeurdDoor}
                      onChange={e => setGoedgekeurdDoor(e.target.value)}
                      placeholder="Uw volledige naam..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleGoedkeuren}
                      disabled={isSubmitting || !goedgekeurdDoor.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      {isSubmitting ? 'Bezig...' : 'Goedkeuren'}
                    </button>
                    <button
                      onClick={() => setShowRevisieForm(true)}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors"
                    >
                      <RotateCcw className="h-5 w-5" />
                      Revisie Aanvragen
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Revisie Form */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wat moet er aangepast worden?
                    </label>
                    <textarea
                      value={revisieOpmerkingen}
                      onChange={e => setRevisieOpmerkingen(e.target.value)}
                      placeholder="Beschrijf zo duidelijk mogelijk wat er aangepast moet worden..."
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRevisieForm(false)}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={handleRevisie}
                      disabled={isSubmitting || !revisieOpmerkingen.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                    >
                      <RotateCcw className="h-5 w-5" />
                      {isSubmitting ? 'Verzenden...' : 'Revisie Versturen'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            {goedkeuring.revisie_nummer > 1 && `Revisie ${goedkeuring.revisie_nummer} · `}
            Verstuurd op {formatDate(goedkeuring.created_at)}
          </p>
        </div>
      </div>
    </div>
  )
}
