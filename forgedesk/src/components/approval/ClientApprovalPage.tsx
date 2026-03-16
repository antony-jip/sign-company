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
  getProfile,
} from '@/services/supabaseService'
import { downloadFile } from '@/services/storageService'
import type { TekeningGoedkeuring, Document, Offerte, OfferteItem, Klant, Project, Profile } from '@/types'
import { round2 } from '@/utils/budgetUtils'
import { logger } from '../../utils/logger'

function getFileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="h-10 w-10 text-red-500" />
  if (type.includes('image') || type.includes('jpeg') || type.includes('png'))
    return <FileImage className="h-10 w-10 text-primary" />
  return <File className="h-10 w-10 text-muted-foreground/60" />
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
  const bruto = round2(item.aantal * item.eenheidsprijs)
  return round2(bruto - round2(bruto * (item.korting_percentage / 100)))
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
  const [companyProfile, setCompanyProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRevisieForm, setShowRevisieForm] = useState(false)
  const [revisieOpmerkingen, setRevisieOpmerkingen] = useState('')
  const [goedgekeurdDoor, setGoedgekeurdDoor] = useState('')
  const [activeTab, setActiveTab] = useState<'tekeningen' | 'offerte'>('tekeningen')
  const [showBericht, setShowBericht] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [docUrls, setDocUrls] = useState<Record<string, string>>({})
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

        // Mark as bekeken if verzonden + update tracking
        const trackingUpdates: Partial<TekeningGoedkeuring> = {
          eerste_bekeken_op: gk.eerste_bekeken_op || new Date().toISOString(),
          laatst_bekeken_op: new Date().toISOString(),
          aantal_keer_bekeken: (gk.aantal_keer_bekeken || 0) + 1,
        }
        if (gk.status === 'verzonden') {
          trackingUpdates.status = 'bekeken'
        }
        await updateTekeningGoedkeuringByToken(token!, trackingUpdates)
        setGoedkeuring(prev => prev ? { ...prev, ...trackingUpdates } : null)

        // Fetch related data
        const allDocs = await getDocumenten()
        const filteredDocs = allDocs.filter(d => gk.document_ids.includes(d.id))
        setDocumenten(filteredDocs)

        // Resolve storage paths to public URLs
        const urls: Record<string, string> = {}
        for (const doc of filteredDocs) {
          if (doc.storage_path) {
            try {
              urls[doc.id] = await downloadFile(doc.storage_path)
            } catch { /* ignore */ }
          }
        }
        setDocUrls(urls)

        const [klantData, projectData] = await Promise.all([
          getKlant(gk.klant_id),
          getProject(gk.project_id),
          getProfile(gk.user_id!).then((p) => {
            if (p) setCompanyProfile(p)
          }).catch(() => {}),
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
        logger.error('Fout bij laden:', err)
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
      const apiBase = import.meta.env.VITE_APP_URL || (import.meta.env.VITE_VERCEL_URL ? `https://${import.meta.env.VITE_VERCEL_URL}` : '')
      const response = await fetch(`${apiBase}/api/goedkeuring-reactie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          status: 'goedgekeurd',
          goedgekeurd_door: goedgekeurdDoor.trim(),
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Fout bij goedkeuren')
      }
      setGoedkeuring(prev => prev ? {
        ...prev,
        status: 'goedgekeurd',
        goedgekeurd_door: goedgekeurdDoor.trim(),
        goedgekeurd_op: new Date().toISOString(),
      } : null)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 4000)
    } catch (err) {
      logger.error('Fout bij goedkeuren:', err)
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
      const apiBase = import.meta.env.VITE_APP_URL || (import.meta.env.VITE_VERCEL_URL ? `https://${import.meta.env.VITE_VERCEL_URL}` : '')
      const response = await fetch(`${apiBase}/api/goedkeuring-reactie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          status: 'revisie',
          revisie_opmerkingen: revisieOpmerkingen.trim(),
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Fout bij revisie aanvragen')
      }
      setGoedkeuring(prev => prev ? {
        ...prev,
        status: 'revisie',
        revisie_opmerkingen: revisieOpmerkingen.trim(),
      } : null)
      toast.success('Revisie aangevraagd. We gaan ermee aan de slag!')
    } catch (err) {
      logger.error('Fout bij revisie:', err)
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
          <p className="text-muted-foreground mt-4 text-sm">Even geduld, we laden alles voor u...</p>
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
          <h1 className="text-xl font-bold text-foreground mb-2">Link niet geldig</h1>
          <p className="text-muted-foreground">
            Deze goedkeuringslink is niet (meer) geldig. Neem contact op met het bedrijf als u denkt dat dit een fout is.
          </p>
        </div>
      </div>
    )
  }

  const isDecided = goedkeuring.status === 'goedgekeurd' || goedkeuring.status === 'revisie'
  const currentStap = getStapIndex(goedkeuring.status)

  // Offerte totals
  const offerteSubtotaal = round2(offerteItems.reduce((sum, item) => sum + calculateLineTotaal(item), 0))
  const btwGroups: Record<number, number> = {}
  offerteItems.forEach((item) => {
    const lineTotaal = calculateLineTotaal(item)
    btwGroups[item.btw_percentage] = round2((btwGroups[item.btw_percentage] || 0) + round2(lineTotaal * (item.btw_percentage / 100)))
  })
  const totaalBtw = round2(Object.values(btwGroups).reduce((sum, val) => sum + val, 0))
  const offerteTotaal = offerteSubtotaal + totaalBtw

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-wm-pale/20 to-primary/5">
      <Toaster position="top-center" richColors />

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-sm mx-4 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Goedgekeurd!</h2>
            <p className="text-muted-foreground">
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
              className="absolute -top-3 -right-3 z-10 h-8 w-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-medium text-foreground text-sm">{previewDoc.naam}</p>
              </div>
              {isImageType(previewDoc.type) && docUrls[previewDoc.id] ? (
                <div className="bg-background p-4 flex items-center justify-center min-h-[300px]">
                  <img
                    src={docUrls[previewDoc.id]}
                    alt={previewDoc.naam}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              ) : isImageType(previewDoc.type) ? (
                <div className="bg-background p-4 flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Afbeelding laden...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-background p-8 flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    {getFileIcon(previewDoc.type)}
                    <p className="text-sm text-muted-foreground mt-3">{previewDoc.naam}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{formatFileSize(previewDoc.grootte)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {companyProfile?.logo_url ? (
                <img
                  src={companyProfile.logo_url}
                  alt={companyProfile.bedrijfsnaam || 'Bedrijfslogo'}
                  className="h-10 object-contain flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-[#3D3522] flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-foreground">Tekening Goedkeuring</h1>
                {project && (
                  <p className="text-sm text-muted-foreground">Project: {project.naam}</p>
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
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <div className="flex items-center justify-between relative">
            {/* Connection line */}
            <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-secondary" />
            <div
              className="absolute top-5 left-[10%] h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-700"
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
                      : 'bg-muted text-muted-foreground/60'
                  }`}>
                    <StapIcon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    isActive ? 'text-foreground' : 'text-muted-foreground/60'
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
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <button
              onClick={() => setShowBericht(!showBericht)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-background transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Bericht van het bedrijf
              </div>
              {showBericht ? <ChevronUp className="h-4 w-4 text-muted-foreground/60" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/60" />}
            </button>
            {showBericht && (
              <div className="px-5 pb-4 border-t border-border">
                <div className="bg-blue-50/50 rounded-xl p-4 mt-3">
                  <p className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">{goedkeuring.email_bericht}</p>
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
          <div className="flex bg-white rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setActiveTab('tekeningen')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'tekeningen'
                  ? 'bg-blue-600 text-white'
                  : 'text-muted-foreground hover:bg-background'
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
                  : 'text-muted-foreground hover:bg-background'
              }`}
            >
              <Receipt className="h-4 w-4 inline mr-2" />
              Offerte
            </button>
          </div>
        )}

        {/* Tekeningen Tab */}
        {activeTab === 'tekeningen' && (
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Tekeningen & Bestanden</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Bekijk de onderstaande bestanden en geef uw goedkeuring of vraag een revisie aan.
              </p>
            </div>

            <div className="p-6 space-y-3">
              {documenten.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Geen bestanden gevonden.</p>
              ) : (
                documenten.map((doc) => (
                  <div key={doc.id} className="space-y-0">
                    <div
                      className="flex items-center gap-4 bg-background rounded-xl p-4 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{doc.naam}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{formatFileSize(doc.grootte)}</span>
                          <span className="text-xs text-muted-foreground/60">{formatDate(doc.created_at)}</span>
                          {isImageType(doc.type) && (
                            <span className="inline-flex items-center gap-1 text-xs text-accent bg-wm-pale/40 px-1.5 py-0.5 rounded">
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
              <div className="px-6 py-3 bg-background border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {documenten.length} bestand{documenten.length > 1 ? 'en' : ''} ter goedkeuring
                </span>
                <span className="text-xs text-muted-foreground/60">
                  Totaal {formatFileSize(documenten.reduce((sum, d) => sum + d.grootte, 0))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Offerte Tab */}
        {activeTab === 'offerte' && offerte && (
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">{offerte.titel}</h2>
                  <p className="text-sm text-muted-foreground">{offerte.nummer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Geldig tot</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(offerte.geldig_tot)}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-2 px-1 font-semibold text-muted-foreground w-8">#</th>
                    <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Beschrijving</th>
                    <th className="text-right py-2 px-1 font-semibold text-muted-foreground w-16">Aantal</th>
                    <th className="text-right py-2 px-1 font-semibold text-muted-foreground w-24">Prijs</th>
                    <th className="text-right py-2 px-1 font-semibold text-muted-foreground w-16">BTW</th>
                    <th className="text-right py-2 px-1 font-semibold text-muted-foreground w-24">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {offerteItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-border hover:bg-background/50">
                      <td className="py-2.5 px-1 text-muted-foreground/60">{index + 1}</td>
                      <td className="py-2.5 px-1 text-foreground">{item.beschrijving}</td>
                      <td className="py-2.5 px-1 text-right text-foreground/70 font-mono">{item.aantal}</td>
                      <td className="py-2.5 px-1 text-right text-foreground/70 font-mono">{formatCurrency(item.eenheidsprijs)}</td>
                      <td className="py-2.5 px-1 text-right text-muted-foreground font-mono">{item.btw_percentage}%</td>
                      <td className="py-2.5 px-1 text-right font-medium text-foreground font-mono">
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
                    <span className="text-muted-foreground">Subtotaal</span>
                    <span className="font-medium">{formatCurrency(offerteSubtotaal)}</span>
                  </div>
                  {Object.entries(btwGroups).map(([pct, bedrag]) => (
                    <div key={pct} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">BTW {pct}%</span>
                      <span className="font-medium">{formatCurrency(bedrag)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t-2 border-border pt-2 mt-2">
                    <span className="text-base font-bold">Totaal</span>
                    <span className="text-base font-bold text-blue-600">{formatCurrency(offerteTotaal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            {offerte.voorwaarden && (
              <div className="px-6 pb-4">
                <div className="bg-background rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Voorwaarden</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offerte.voorwaarden}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approval Actions */}
        {!isDecided && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Uw beoordeling
            </h2>

            {!showRevisieForm ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Uw naam (voor goedkeuring)
                    </label>
                    <input
                      type="text"
                      value={goedgekeurdDoor}
                      onChange={e => setGoedgekeurdDoor(e.target.value)}
                      placeholder="Uw volledige naam..."
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleGoedkeuren}
                      disabled={isSubmitting || !goedgekeurdDoor.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-muted disabled:to-secondary disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-green-200 disabled:shadow-none"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      {isSubmitting ? 'Bezig...' : 'Goedkeuren'}
                    </button>
                    <button
                      onClick={() => setShowRevisieForm(true)}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:from-muted disabled:to-secondary text-white font-medium rounded-xl transition-all shadow-lg shadow-amber-200 disabled:shadow-none"
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
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Wat moet er aangepast worden?
                    </label>
                    <textarea
                      value={revisieOpmerkingen}
                      onChange={e => setRevisieOpmerkingen(e.target.value)}
                      placeholder="Beschrijf zo duidelijk mogelijk wat er aangepast moet worden..."
                      rows={4}
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Tip: wees zo specifiek mogelijk, verwijs naar bestands- of itemnamen.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRevisieForm(false)}
                      className="flex-1 px-6 py-3 border border-border text-foreground/70 font-medium rounded-xl hover:bg-background transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={handleRevisie}
                      disabled={isSubmitting || !revisieOpmerkingen.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:from-muted disabled:to-secondary disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
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
          <p className="text-xs text-muted-foreground/60">
            Verstuurd op {formatDate(goedkeuring.created_at)}
          </p>
          {companyProfile?.bedrijfsnaam && (
            <p className="text-xs text-muted-foreground/50">
              {companyProfile.bedrijfsnaam}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
