import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import {
  CheckCircle2,
  RotateCcw,
  FileText,
  FileImage,
  File,
  Eye,
  Building2,
  Clock,
  Receipt,
  Mail,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  ZoomIn,
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

function isImageType(type: string): boolean {
  return type.includes('image') || type.includes('jpeg') || type.includes('png') || type.includes('svg') || type.includes('webp')
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

// Progress stepper statuses
const stappen = [
  { key: 'verzonden', label: 'Verstuurd', icon: Send },
  { key: 'bekeken', label: 'Bekeken', icon: Eye },
  { key: 'besluit', label: 'Besluit', icon: CheckCircle2 },
]

function getStapIndex(status: string): number {
  if (status === 'verzonden') return 0
  if (status === 'bekeken') return 1
  return 2
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
  const [showBericht, setShowBericht] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

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
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 4000)
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
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-500 mt-4 text-sm">Even geduld, we laden alles voor u...</p>
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

  const isDecided = goedkeuring.status === 'goedgekeurd' || goedkeuring.status === 'revisie'
  const currentStap = getStapIndex(goedkeuring.status)

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

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-sm mx-4 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Goedgekeurd!</h2>
            <p className="text-gray-500">
              Bedankt voor uw goedkeuring. We gaan direct aan de slag!
            </p>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute -top-3 -right-3 z-10 h-8 w-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-medium text-gray-900 text-sm">{previewDoc.naam}</p>
              </div>
              {isImageType(previewDoc.type) ? (
                <div className="bg-gray-50 p-4 flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    <FileImage className="h-20 w-20 text-purple-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Afbeelding preview</p>
                    <p className="text-xs text-gray-400 mt-1">{previewDoc.naam} ({formatFileSize(previewDoc.grootte)})</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-8 flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    {getFileIcon(previewDoc.type)}
                    <p className="text-sm text-gray-500 mt-3">{previewDoc.naam}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatFileSize(previewDoc.grootte)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
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
            {goedkeuring.revisie_nummer > 1 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                Revisie {goedkeuring.revisie_nummer}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Progress Stepper */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between relative">
            {/* Connection line */}
            <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-gray-200" />
            <div
              className="absolute top-5 left-[10%] h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700"
              style={{ width: `${currentStap >= 2 ? 80 : currentStap * 40}%` }}
            />

            {stappen.map((stap, index) => {
              const Icon = stap.icon
              const isActive = index <= currentStap
              const isCurrent = index === currentStap

              // Voor stap 3 (besluit): toon specifiek icoon op basis van status
              let StapIcon = Icon
              let activeColor = 'bg-blue-600'
              if (index === 2 && goedkeuring.status === 'goedgekeurd') {
                StapIcon = CheckCircle2
                activeColor = 'bg-green-600'
              } else if (index === 2 && goedkeuring.status === 'revisie') {
                StapIcon = RotateCcw
                activeColor = 'bg-amber-500'
              }

              return (
                <div key={stap.key} className="relative flex flex-col items-center z-10 flex-1">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? `${activeColor} text-white shadow-lg ${isCurrent ? 'ring-4 ring-blue-100 scale-110' : ''}`
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <StapIcon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    isActive ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {index === 2 && goedkeuring.status === 'goedgekeurd' ? 'Goedgekeurd' :
                     index === 2 && goedkeuring.status === 'revisie' ? 'Revisie' : stap.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Original Message */}
        {goedkeuring.email_bericht && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowBericht(!showBericht)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Bericht van het bedrijf
              </div>
              {showBericht ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {showBericht && (
              <div className="px-5 pb-4 border-t border-gray-100">
                <div className="bg-blue-50/50 rounded-xl p-4 mt-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{goedkeuring.email_bericht}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Banner */}
        {isDecided && (
          <div className={`rounded-xl p-5 ${
            goedkeuring.status === 'goedgekeurd'
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              {goedkeuring.status === 'goedgekeurd' ? (
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="h-5 w-5 text-amber-600" />
                </div>
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
                <p className={`text-sm mt-0.5 ${
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
                  <div key={doc.id} className="space-y-0">
                    <div
                      className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{doc.naam}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">{formatFileSize(doc.grootte)}</span>
                          <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
                          {isImageType(doc.type) && (
                            <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                              <ZoomIn className="h-3 w-3" />
                              Preview
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewDoc(doc)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Bekijk
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary bar */}
            {documenten.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {documenten.length} bestand{documenten.length > 1 ? 'en' : ''} ter goedkeuring
                </span>
                <span className="text-xs text-gray-400">
                  Totaal {formatFileSize(documenten.reduce((sum, d) => sum + d.grootte, 0))}
                </span>
              </div>
            )}
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
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
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
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Uw beoordeling
            </h2>

            {!showRevisieForm ? (
              <>
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleGoedkeuren}
                      disabled={isSubmitting || !goedgekeurdDoor.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-green-200 disabled:shadow-none"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      {isSubmitting ? 'Bezig...' : 'Goedkeuren'}
                    </button>
                    <button
                      onClick={() => setShowRevisieForm(true)}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-medium rounded-xl transition-all shadow-lg shadow-amber-200 disabled:shadow-none"
                    >
                      <RotateCcw className="h-5 w-5" />
                      Revisie Aanvragen
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Tip: wees zo specifiek mogelijk, verwijs naar bestands- of itemnamen.
                    </p>
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
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
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
        <div className="text-center py-4 space-y-1">
          <p className="text-xs text-gray-400">
            Verstuurd op {formatDate(goedkeuring.created_at)}
          </p>
          {klant && (
            <p className="text-xs text-gray-300">
              {klant.bedrijfsnaam || klant.contactpersoon}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
