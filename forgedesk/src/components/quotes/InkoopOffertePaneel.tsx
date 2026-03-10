import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
  GripVertical,
  Copy,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { round2 } from '@/utils/budgetUtils'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  getInkoopOffertes,
  getInkoopOffertesByOfferte,
  createInkoopOfferte,
  createInkoopRegel,
  deleteInkoopOfferte,
} from '@/services/supabaseService'
import type { InkoopOfferte, InkoopRegel } from '@/types'
import { logger } from '../../utils/logger'

// Drag data type for inkoop regels
export const INKOOP_DRAG_TYPE = 'application/x-forgedesk-inkoop-regel'

export interface InkoopDragData {
  omschrijving: string
  aantal: number
  eenheid?: string
  prijs_per_stuk: number
  totaal: number
  leverancier: string
}

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
  offerteId?: string
  onRegelToevoegen: (regel: InkoopRegel) => void
  onRegelAlsPrijsvariant?: (regel: InkoopRegel, leverancier: string) => void
}

export function InkoopOffertePaneel({ userId, offerteId, onRegelToevoegen, onRegelAlsPrijsvariant }: InkoopOffertePaneelProps) {
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

  // Leverancier autofill
  const [showLeverancierSuggesties, setShowLeverancierSuggesties] = useState(false)
  const leverancierInputRef = useRef<HTMLInputElement>(null)

  // Geanalyseerde regels (bewerkbaar)
  const [geanalyseerdeRegels, setGeanalyseerdeRegels] = useState<GeanalyseerdeRegel[]>([])
  const [showResultaat, setShowResultaat] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Verwijder bevestiging
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const leverancierWrapperRef = useRef<HTMLDivElement>(null)

  // Unieke leverancier namen uit opgeslagen offertes (voor autofill)
  const leverancierSuggesties = useMemo(() => {
    const namen = [...new Set(offertes.map(o => o.leverancier_naam))]
    if (!leverancierNaam.trim()) return namen
    return namen.filter(n => n.toLowerCase().includes(leverancierNaam.toLowerCase()))
  }, [offertes, leverancierNaam])

  // Laad offertes (gefilterd op offerte als offerteId meegegeven)
  const loadOffertes = useCallback(async () => {
    try {
      const data = offerteId
        ? await getInkoopOffertesByOfferte(offerteId)
        : await getInkoopOffertes(userId)
      setOffertes(data)
    } catch (err) {
      logger.error('Inkoop offertes laden mislukt:', err)
    }
  }, [userId, offerteId])

  // Laad bij mount
  useEffect(() => {
    loadOffertes()
  }, [loadOffertes])

  // Klik buiten leverancier suggesties
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (leverancierWrapperRef.current && !leverancierWrapperRef.current.contains(e.target as Node)) {
        setShowLeverancierSuggesties(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
        ...(offerteId ? { offerte_id: offerteId } : {}),
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

  // Drag start handler voor inkoop regels
  const handleDragStart = useCallback((e: React.DragEvent, regel: InkoopRegel, leverancier: string) => {
    const dragData: InkoopDragData = {
      omschrijving: regel.omschrijving,
      aantal: regel.aantal,
      eenheid: regel.eenheid,
      prijs_per_stuk: regel.prijs_per_stuk,
      totaal: regel.totaal,
      leverancier,
    }
    e.dataTransfer.setData(INKOOP_DRAG_TYPE, JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'copy'
    // Voeg een drag image hint toe
    const el = e.currentTarget as HTMLElement
    el.style.opacity = '0.6'
    setTimeout(() => { el.style.opacity = '1' }, 0)
  }, [])

  // Hele offerte toevoegen aan calculatie
  const handleAlleRegelsToevoegen = useCallback((offerte: InkoopOfferte) => {
    if (!offerte.regels) return
    offerte.regels.forEach(regel => onRegelToevoegen(regel))
    toast.success(`${offerte.regels.length} regels toegevoegd`)
  }, [onRegelToevoegen])

  const regelTotaal = round2(geanalyseerdeRegels.reduce((s, r) => s + round2(r.totaal), 0))

  // ── STATE A: Leeg + upload knop ──
  if (!showUpload && offertes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Nog geen inkoopoffertes</p>
          <p className="text-xs text-muted-foreground/60">Upload een offerte van je leverancier om prijzen over te nemen</p>
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
          <h4 className="text-sm font-semibold text-foreground">Inkoopofferte uploaden</h4>
          <Button variant="ghost" size="sm" onClick={() => { setShowUpload(false); setShowResultaat(false); setGeanalyseerdeRegels([]) }}>
            Annuleren
          </Button>
        </div>

        {!showResultaat ? (
          <div className="space-y-3">
            {/* Leverancier naam met autofill */}
            <div className="space-y-1" ref={leverancierWrapperRef}>
              <label className="text-xs font-medium text-muted-foreground">Leverancier *</label>
              <div className="relative">
                <Input
                  ref={leverancierInputRef}
                  value={leverancierNaam}
                  onChange={(e) => {
                    setLeverancierNaam(e.target.value)
                    setShowLeverancierSuggesties(true)
                  }}
                  onFocus={() => setShowLeverancierSuggesties(true)}
                  placeholder="Naam leverancier"
                  className="h-9 text-sm"
                />
                {showLeverancierSuggesties && leverancierSuggesties.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-auto">
                    {leverancierSuggesties.map((naam) => (
                      <button
                        key={naam}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setLeverancierNaam(naam)
                          setShowLeverancierSuggesties(false)
                        }}
                      >
                        {naam}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
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
                  <p className="text-sm font-medium text-foreground">{bestandNaam}</p>
                  <p className="text-xs text-muted-foreground">Klik om te wijzigen</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">PDF of afbeelding uploaden</p>
                  <p className="text-xs text-muted-foreground/60">jpg, png, pdf</p>
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
            <p className="text-xs text-muted-foreground">{geanalyseerdeRegels.length} regels gevonden — pas aan indien nodig</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Omschrijving</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-14">Aantal</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-20">Prijs/stk</th>
                    <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-20">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {geanalyseerdeRegels.map((regel, idx) => (
                    <tr key={idx} className={regel.confidence < 0.7 ? 'bg-orange-50 dark:bg-orange-950/20' : ''}>
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
                <tfoot className="border-t bg-muted/50">
                  <tr>
                    <td colSpan={3} className="px-2 py-1.5 text-right font-semibold text-foreground">Totaal</td>
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
      <p className="text-[11px] text-muted-foreground/60">
        Sleep een regel naar een offerte-item, of gebruik de knoppen.
      </p>

      {offertes.map((offerte) => {
        const isExpanded = expandedOffertes.has(offerte.id)
        return (
          <Card key={offerte.id} className="overflow-hidden">
            <CardHeader className="p-3 pb-0 cursor-pointer" onClick={() => toggleExpanded(offerte.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
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
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
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
                    <div
                      key={regel.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, regel, offerte.leverancier_naam)}
                      className={cn(
                        'group rounded-lg cursor-grab active:cursor-grabbing transition-colors px-2.5 py-2',
                        regel.twijfelachtig ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-muted/50 hover:bg-muted'
                      )}
                    >
                      {/* Omschrijving - volledige breedte, niet afgekapt */}
                      <div className="flex items-start gap-1.5 mb-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-muted-foreground" />
                        <span className="text-xs text-foreground/80 leading-snug break-words">{regel.omschrijving}</span>
                      </div>
                      {/* Prijs + acties */}
                      <div className="flex items-center gap-2 pl-[18px]">
                        <span className="text-muted-foreground tabular-nums text-[11px]">{formatCurrency(round2(regel.prijs_per_stuk))}/stk</span>
                        <span className="font-semibold tabular-nums text-xs">{formatCurrency(round2(regel.totaal))}</span>
                        <div className="flex items-center gap-0.5 ml-auto shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); onRegelToevoegen(regel) }}
                            className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                            title="Toevoegen als offerte-item"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          {onRegelAlsPrijsvariant && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onRegelAlsPrijsvariant(regel, offerte.leverancier_naam) }}
                              className="p-1 rounded hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors"
                              title="Toevoegen als prijsvariant"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Alle regels toevoegen */}
                {offerte.regels.length > 1 && (
                  <button
                    onClick={() => handleAlleRegelsToevoegen(offerte)}
                    className="mt-2 flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                  >
                    <ArrowRight className="h-3 w-3" />
                    Alle {offerte.regels.length} regels toevoegen
                  </button>
                )}
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
