import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Upload,
  Loader2,
  Trash2,
  Plus,
  FileText,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { round2 } from '@/utils/budgetUtils'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  getInkoopOffertes,
  createInkoopOfferte,
  createInkoopRegel,
  deleteInkoopOfferte,
} from '@/services/supabaseService'
import type { InkoopOfferte, InkoopRegel } from '@/types'
import { logger } from '../../utils/logger'

// Analyseer-response regel
interface GeanalyseerdeRegel {
  omschrijving: string
  aantal: number
  eenheid?: string
  prijs_per_stuk: number
  totaal: number
  confidence: number
}

interface InkoopOffertePaneelProps {
  userId: string
  onRegelToevoegen: (regel: InkoopRegel) => void
}

export function InkoopOffertePaneel({ userId, onRegelToevoegen }: InkoopOffertePaneelProps) {
  const { session } = useAuth()

  // Opgeslagen offertes
  const [offertes, setOffertes] = useState<InkoopOfferte[]>([])
  const [expandedOffertes, setExpandedOffertes] = useState<Set<string>>(new Set())

  // Upload flow
  const [showUpload, setShowUpload] = useState(false)
  const [leverancierNaam, setLeverancierNaam] = useState('')
  const [bestandNaam, setBestandNaam] = useState('')
  const [bestandBase64, setBestandBase64] = useState('')
  const [bestandType, setBestandType] = useState<'pdf' | 'image'>('pdf')
  const [isAnalysing, setIsAnalysing] = useState(false)

  // Geanalyseerde regels (bewerkbaar)
  const [geanalyseerdeRegels, setGeanalyseerdeRegels] = useState<GeanalyseerdeRegel[]>([])
  const [showResultaat, setShowResultaat] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Verwijder bevestiging
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Laad offertes
  const loadOffertes = useCallback(async () => {
    try {
      const data = await getInkoopOffertes(userId)
      setOffertes(data)
    } catch (err) {
      logger.error('Inkoop offertes laden mislukt:', err)
    }
  }, [userId])

  // Laad bij mount
  useEffect(() => {
    loadOffertes()
  }, [loadOffertes])

  // Bestand selecteren
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isPdf = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      toast.error('Alleen PDF of afbeelding (JPG/PNG) bestanden')
      return
    }

    setBestandNaam(file.name)
    setBestandType(isPdf ? 'pdf' : 'image')

    const reader = new FileReader()
    reader.onload = () => {
      setBestandBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  // Analyseer
  const handleAnalyseer = useCallback(async () => {
    if (!leverancierNaam.trim()) {
      toast.error('Vul een leveranciersnaam in')
      return
    }
    if (!bestandBase64) {
      toast.error('Selecteer eerst een bestand')
      return
    }

    setIsAnalysing(true)
    try {
      const token = session?.access_token
      const response = await fetch('/api/analyze-inkoop-offerte', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bestand_base64: bestandBase64,
          bestand_type: bestandType,
          leverancier: leverancierNaam.trim(),
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Analyse mislukt')
      }

      const data = await response.json() as { regels: GeanalyseerdeRegel[] }
      setGeanalyseerdeRegels(data.regels || [])
      setShowResultaat(true)
    } catch (err) {
      logger.error('Analyse mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Analyse mislukt')
    } finally {
      setIsAnalysing(false)
    }
  }, [leverancierNaam, bestandBase64, bestandType, session])

  // Regel bewerken
  const updateRegel = useCallback((index: number, field: keyof GeanalyseerdeRegel, value: string | number) => {
    setGeanalyseerdeRegels(prev => {
      const copy = [...prev]
      const regel = { ...copy[index] }
      if (field === 'omschrijving' || field === 'eenheid') {
        (regel as Record<string, unknown>)[field] = value
      } else if (field === 'aantal' || field === 'prijs_per_stuk' || field === 'totaal') {
        (regel as Record<string, unknown>)[field] = Number(value) || 0
      }
      // Herbereken totaal als aantal of prijs wijzigt
      if (field === 'aantal' || field === 'prijs_per_stuk') {
        regel.totaal = round2(regel.aantal * regel.prijs_per_stuk)
      }
      copy[index] = regel
      return copy
    })
  }, [])

  // Opslaan
  const handleOpslaan = useCallback(async () => {
    if (!geanalyseerdeRegels.length) return
    setIsSaving(true)
    try {
      const totaal = round2(geanalyseerdeRegels.reduce((sum, r) => sum + round2(r.totaal), 0))
      const offerte = await createInkoopOfferte({
        user_id: userId,
        leverancier_naam: leverancierNaam.trim(),
        datum: new Date().toISOString().split('T')[0],
        totaal,
      })

      await Promise.all(geanalyseerdeRegels.map((regel) =>
        createInkoopRegel({
          user_id: userId,
          inkoop_offerte_id: offerte.id,
          omschrijving: regel.omschrijving,
          aantal: regel.aantal,
          eenheid: regel.eenheid,
          prijs_per_stuk: round2(regel.prijs_per_stuk),
          totaal: round2(regel.totaal),
          twijfelachtig: regel.confidence < 0.7,
        })
      ))

      toast.success('Inkoopofferte opgeslagen')
      // Reset upload state
      setShowUpload(false)
      setShowResultaat(false)
      setGeanalyseerdeRegels([])
      setLeverancierNaam('')
      setBestandNaam('')
      setBestandBase64('')
      // Herlaad
      await loadOffertes()
    } catch (err) {
      logger.error('Opslaan mislukt:', err)
      toast.error('Kon inkoopofferte niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [geanalyseerdeRegels, userId, leverancierNaam, loadOffertes])

  // Verwijderen
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteInkoopOfferte(id)
      setOffertes(prev => prev.filter(o => o.id !== id))
      setDeleteConfirmId(null)
      toast.success('Inkoopofferte verwijderd')
    } catch (err) {
      logger.error('Verwijderen mislukt:', err)
      toast.error('Kon inkoopofferte niet verwijderen')
    }
  }, [])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedOffertes(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }, [])

  const regelTotaal = round2(geanalyseerdeRegels.reduce((s, r) => s + round2(r.totaal), 0))

  // ── STATE A: Leeg + upload knop ──
  if (!showUpload && offertes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <FileText className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Nog geen inkoopoffertes</p>
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload offerte
          </Button>
        </div>
      </div>
    )
  }

  // ── STATE B: Upload flow ──
  if (showUpload) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">Inkoopofferte uploaden</h4>
          <Button variant="ghost" size="sm" onClick={() => { setShowUpload(false); setShowResultaat(false); setGeanalyseerdeRegels([]) }}>
            Annuleren
          </Button>
        </div>

        {!showResultaat ? (
          <div className="space-y-3">
            {/* Leverancier naam */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Leverancier *</label>
              <Input
                value={leverancierNaam}
                onChange={(e) => setLeverancierNaam(e.target.value)}
                placeholder="Naam leverancier"
                className="h-9 text-sm"
              />
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileSelect}
              />
              {bestandNaam ? (
                <div className="space-y-1">
                  <FileText className="h-8 w-8 text-primary mx-auto" />
                  <p className="text-sm font-medium text-gray-700">{bestandNaam}</p>
                  <p className="text-xs text-gray-400">Klik om te wijzigen</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="h-8 w-8 text-gray-300 mx-auto" />
                  <p className="text-sm text-gray-500">PDF of afbeelding uploaden</p>
                  <p className="text-xs text-gray-400">jpg, png, pdf</p>
                </div>
              )}
            </div>

            {/* Analyseer knop */}
            <Button
              onClick={handleAnalyseer}
              disabled={isAnalysing || !bestandBase64 || !leverancierNaam.trim()}
              className="w-full gap-2"
            >
              {isAnalysing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Offerte wordt uitgelezen...
                </>
              ) : (
                'Analyseer'
              )}
            </Button>
          </div>
        ) : (
          /* Bewerkbare tabel met resultaten */
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{geanalyseerdeRegels.length} regels gevonden — pas aan indien nodig</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-500">Omschrijving</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-500 w-14">Aantal</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-500 w-20">Prijs/stk</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-500 w-20">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {geanalyseerdeRegels.map((regel, idx) => (
                    <tr key={idx} className={regel.confidence < 0.7 ? 'bg-orange-50' : ''}>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          {regel.confidence < 0.7 && <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />}
                          <input
                            className="w-full bg-transparent border-0 text-xs focus:ring-0 p-0"
                            value={regel.omschrijving}
                            onChange={(e) => updateRegel(idx, 'omschrijving', e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className="w-full bg-transparent border-0 text-xs text-right focus:ring-0 p-0 tabular-nums"
                          value={regel.aantal}
                          onChange={(e) => updateRegel(idx, 'aantal', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-transparent border-0 text-xs text-right focus:ring-0 p-0 tabular-nums"
                          value={regel.prijs_per_stuk}
                          onChange={(e) => updateRegel(idx, 'prijs_per_stuk', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums font-medium">
                        {formatCurrency(round2(regel.totaal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-2 py-1.5 text-right font-semibold text-gray-700">Totaal</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums">{formatCurrency(regelTotaal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <Button onClick={handleOpslaan} disabled={isSaving} className="w-full gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Opslaan
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ── STATE C: Opgeslagen offertes ──
  return (
    <div className="space-y-3">
      {offertes.map((offerte) => {
        const isExpanded = expandedOffertes.has(offerte.id)
        return (
          <Card key={offerte.id} className="overflow-hidden">
            <CardHeader className="p-3 pb-0 cursor-pointer" onClick={() => toggleExpanded(offerte.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                  <CardTitle className="text-sm font-semibold truncate">{offerte.leverancier_naam}</CardTitle>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold tabular-nums">{formatCurrency(offerte.totaal)}</span>
                  {deleteConfirmId === offerte.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => handleDelete(offerte.id)}>
                        Ja
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setDeleteConfirmId(null)}>
                        Nee
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(offerte.id) }}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            {isExpanded && offerte.regels && (
              <CardContent className="p-3 pt-2">
                <div className="space-y-1">
                  {offerte.regels.map((regel) => (
                    <div key={regel.id} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${regel.twijfelachtig ? 'bg-orange-50' : 'bg-gray-50'}`}>
                      <span className="flex-1 truncate text-gray-700">{regel.omschrijving}</span>
                      <span className="text-gray-500 tabular-nums whitespace-nowrap">{formatCurrency(round2(regel.prijs_per_stuk))}/stk</span>
                      <span className="font-medium tabular-nums whitespace-nowrap">{formatCurrency(round2(regel.totaal))}</span>
                      <button
                        onClick={() => onRegelToevoegen(regel)}
                        className="p-0.5 rounded hover:bg-primary/10 text-primary transition-colors"
                        title="Toevoegen aan calculatie"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Nieuwe offerte uploaden */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowUpload(true)}
        className="w-full gap-2 text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        Nieuwe inkoopofferte
      </Button>
    </div>
  )
}
