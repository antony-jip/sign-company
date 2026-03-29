import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/shared/BackButton'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import {
  ShoppingCart, Plus, Trash2, Save, ArrowLeft, Loader2,
  Package, Check, FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn, formatCurrency } from '@/lib/utils'
import type { Bestelbon, BestelbonRegel, Leverancier, Project } from '@/types'
import {
  getBestelbon, createBestelbon, updateBestelbon,
  getBestelbonRegels, createBestelbonRegel, updateBestelbonRegel, deleteBestelbonRegel,
  getLeveranciers, getProjecten, generateBestelbonNummer,
} from '@/services/supabaseService'
import { round2 } from '@/utils/budgetUtils'
import { generateBestelbonPDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { useAppSettings } from '@/contexts/AppSettingsContext'

// ============ HELPERS ============

type RegelForm = BestelbonRegel & { _isNew?: boolean }

function createEmptyRegel(): Omit<BestelbonRegel, 'id' | 'bestelbon_id' | 'created_at' | 'user_id'> {
  return {
    omschrijving: '',
    aantal: 1,
    prijs_per_eenheid: 0,
    eenheid: 'stuk',
    btw_percentage: 21,
    totaal: 0,
    aantal_ontvangen: 0,
    volledig_ontvangen: false,
  }
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

// ============ COMPONENT ============

export function BestelbonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'nieuw'
  const { profile, primaireKleur } = useAppSettings()
  const documentStyle = useDocumentStyle()

  // Data
  const [leveranciers, setLeveranciers] = useState<Leverancier[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)

  // Form state — mapped to actual Bestelbon type fields
  const [bestelbonNummer, setBestelbonNummer] = useState('')
  const [leverancierId, setLeverancierId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [referentie, setReferentie] = useState('')
  const [besteldOp, setBesteldOp] = useState(getTodayString())
  const [verwachteLevering, setVerwachteLevering] = useState('')
  const [status, setStatus] = useState<Bestelbon['status']>('concept')
  const [opmerkingen, setOpmerkingen] = useState('')
  const [regels, setRegels] = useState<RegelForm[]>([])
  const [bestelbonId, setBestelbonId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      const [levData, projData] = await Promise.all([
        getLeveranciers().catch(() => []),
        getProjecten().catch(() => []),
      ])
      if (cancelled) return
      setLeveranciers(levData)
      setProjecten(projData)

      if (!isNew && id) {
        try {
          const bst = await getBestelbon(id)
          if (!bst) {
            toast.error('Bestelbon niet gevonden')
            navigate('/bestelbonnen')
            return
          }
          setBestelbonId(bst.id)
          setBestelbonNummer(bst.bestelbon_nummer)
          setLeverancierId(bst.leverancier_id || '')
          setProjectId(bst.project_id || '')
          setReferentie(bst.referentie || '')
          setBesteldOp(bst.besteld_op || '')
          setVerwachteLevering(bst.verwachte_levering || '')
          setStatus(bst.status)
          setOpmerkingen(bst.opmerkingen || '')

          const regelData = await getBestelbonRegels(bst.id)
          setRegels(regelData)
        } catch (err) {
          logger.error('Load bestelbon failed:', err)
          toast.error('Fout bij laden bestelbon')
          navigate('/bestelbonnen')
        }
      } else {
        const nr = await generateBestelbonNummer()
        if (!cancelled) setBestelbonNummer(nr)
      }
      if (!cancelled) setIsLoading(false)
    }
    loadData()
    return () => { cancelled = true }
  }, [id, isNew, navigate])

  // ============ REGELS ============

  const handleAddRegel = useCallback(() => {
    const newRegel: RegelForm = {
      ...createEmptyRegel(),
      id: `temp-${Date.now()}`,
      user_id: '',
      bestelbon_id: bestelbonId || '',
      created_at: new Date().toISOString(),
      _isNew: true,
    }
    setRegels((prev) => [...prev, newRegel])
  }, [bestelbonId])

  const handleUpdateRegel = useCallback((regelId: string, field: string, value: string | number) => {
    setRegels((prev) => prev.map((r) => r.id === regelId ? { ...r, [field]: value } : r))
  }, [])

  const handleRemoveRegel = useCallback((regelId: string) => {
    setRegels((prev) => prev.filter((r) => r.id !== regelId))
  }, [])

  const berekenTotaal = useMemo(() => {
    return round2(regels.reduce((sum, r) => sum + round2(r.aantal * r.prijs_per_eenheid), 0))
  }, [regels])

  // ============ ONTVANGST ============

  const handleUpdateOntvangen = useCallback((regelId: string, aantal: number) => {
    setRegels((prev) => prev.map((r) => r.id === regelId ? { ...r, aantal_ontvangen: Math.max(0, Math.min(r.aantal, aantal)) } : r))
  }, [])

  const ontvangenStatus = useMemo((): Bestelbon['status'] | null => {
    if (regels.length === 0) return null
    const alleDone = regels.every((r) => (r.aantal_ontvangen || 0) >= r.aantal)
    const someStarted = regels.some((r) => (r.aantal_ontvangen || 0) > 0)
    if (alleDone) return 'ontvangen'
    if (someStarted) return 'deels_ontvangen'
    return null
  }, [regels])

  // ============ SAVE ============

  const handleSave = useCallback(async () => {
    if (!referentie.trim()) {
      toast.error('Vul een referentie / onderwerp in')
      return
    }

    setIsSaving(true)
    try {
      const validRegels = regels.filter((r) => r.omschrijving.trim())
      const subtotaal = round2(validRegels.reduce((s, r) => s + round2(r.aantal * r.prijs_per_eenheid), 0))
      const btwBedrag = round2(validRegels.reduce((s, r) => s + round2(round2(r.aantal * r.prijs_per_eenheid) * (r.btw_percentage || 21) / 100), 0))
      const totaal = round2(subtotaal + btwBedrag)

      // Determine auto-status based on ontvangst
      let autoStatus = status
      if (status !== 'concept' && status !== 'geannuleerd') {
        const alleDone = validRegels.length > 0 && validRegels.every((r) => (r.aantal_ontvangen || 0) >= r.aantal)
        const someStarted = validRegels.some((r) => (r.aantal_ontvangen || 0) > 0)
        if (alleDone) autoStatus = 'ontvangen'
        else if (someStarted) autoStatus = 'deels_ontvangen'
      }

      if (isNew) {
        const newBst: Omit<Bestelbon, 'id' | 'bestelbon_nummer' | 'created_at' | 'updated_at'> = {
          user_id: '',
          leverancier_id: leverancierId || '',
          project_id: projectId || undefined,
          status: autoStatus,
          besteld_op: besteldOp || undefined,
          verwachte_levering: verwachteLevering || undefined,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
          opmerkingen: opmerkingen || undefined,
          referentie: referentie.trim(),
        }
        const saved = await createBestelbon(newBst)
        setBestelbonId(saved.id)

        for (const r of validRegels) {
          await createBestelbonRegel({
            user_id: '',
            bestelbon_id: saved.id,
            omschrijving: r.omschrijving,
            aantal: r.aantal,
            prijs_per_eenheid: r.prijs_per_eenheid,
            eenheid: r.eenheid,
            btw_percentage: r.btw_percentage || 21,
            totaal: round2(r.aantal * r.prijs_per_eenheid),
            aantal_ontvangen: r.aantal_ontvangen || 0,
            volledig_ontvangen: (r.aantal_ontvangen || 0) >= r.aantal,
          })
        }

        toast.success(`Bestelbon ${bestelbonNummer} aangemaakt`)
        navigate(`/bestelbonnen/${saved.id}`, { replace: true })
      } else if (bestelbonId) {
        await updateBestelbon(bestelbonId, {
          leverancier_id: leverancierId || '',
          project_id: projectId || undefined,
          status: autoStatus,
          besteld_op: besteldOp || undefined,
          verwachte_levering: verwachteLevering || undefined,
          subtotaal,
          btw_bedrag: btwBedrag,
          totaal,
          opmerkingen: opmerkingen || undefined,
          referentie: referentie.trim(),
        })
        setStatus(autoStatus)

        // Sync regels — update existing, create new, delete removed
        const existingRegels = await getBestelbonRegels(bestelbonId).catch(() => [])
        const currentIds = new Set(regels.filter((r) => !r._isNew).map((r) => r.id))

        // Delete removed
        for (const existing of existingRegels) {
          if (!currentIds.has(existing.id)) {
            await deleteBestelbonRegel(existing.id)
          }
        }

        // Update / create
        for (const r of validRegels) {
          if (r._isNew || r.id.startsWith('temp-')) {
            const created = await createBestelbonRegel({
              user_id: '',
              bestelbon_id: bestelbonId,
              omschrijving: r.omschrijving,
              aantal: r.aantal,
              prijs_per_eenheid: r.prijs_per_eenheid,
              eenheid: r.eenheid,
              btw_percentage: r.btw_percentage || 21,
              totaal: round2(r.aantal * r.prijs_per_eenheid),
              aantal_ontvangen: r.aantal_ontvangen || 0,
              volledig_ontvangen: (r.aantal_ontvangen || 0) >= r.aantal,
            })
            setRegels((prev) => prev.map((pr) => pr.id === r.id ? { ...created } : pr))
          } else {
            await updateBestelbonRegel(r.id, {
              omschrijving: r.omschrijving,
              aantal: r.aantal,
              prijs_per_eenheid: r.prijs_per_eenheid,
              eenheid: r.eenheid,
              btw_percentage: r.btw_percentage || 21,
              totaal: round2(r.aantal * r.prijs_per_eenheid),
              aantal_ontvangen: r.aantal_ontvangen || 0,
              volledig_ontvangen: (r.aantal_ontvangen || 0) >= r.aantal,
            })
          }
        }

        toast.success(`Bestelbon ${bestelbonNummer} opgeslagen`)
      }
    } catch (err) {
      logger.error('Save bestelbon failed:', err)
      toast.error('Fout bij opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [isNew, bestelbonNummer, leverancierId, projectId, referentie, besteldOp, verwachteLevering, status, opmerkingen, regels, bestelbonId, navigate])

  // ============ PDF ============

  const handleDownloadPdf = useCallback(() => {
    const leverancier = leveranciers.find((l) => l.id === leverancierId)
    try {
      const doc = generateBestelbonPDF(
        {
          nummer: bestelbonNummer,
          onderwerp: referentie,
          besteldatum: besteldOp,
          verwachte_leverdatum: verwachteLevering,
          notities: opmerkingen,
          totaal_bedrag: berekenTotaal,
        },
        regels.filter((r) => r.omschrijving.trim()).map((r) => ({
          beschrijving: r.omschrijving,
          aantal: r.aantal,
          eenheidsprijs: r.prijs_per_eenheid,
          eenheid: r.eenheid,
        })),
        leverancier ? { naam: leverancier.bedrijfsnaam, adres: leverancier.adres, postcode: leverancier.postcode, stad: leverancier.stad } : {},
        { ...profile, primaireKleur },
        documentStyle
      )
      doc.save(`bestelbon-${bestelbonNummer}.pdf`)
      toast.success('PDF gedownload')
    } catch (err) {
      logger.error('Generate bestelbon PDF failed:', err)
      toast.error('Kon PDF niet genereren')
    }
  }, [bestelbonNummer, referentie, besteldOp, verwachteLevering, opmerkingen, berekenTotaal, regels, leveranciers, leverancierId, profile, primaireKleur, documentStyle])

  // ============ RENDER ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton fallbackPath="/bestelbonnen" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{isNew ? 'Nieuwe bestelbon' : bestelbonNummer}</h1>
            <p className="text-sm text-muted-foreground">{isNew ? 'Maak een nieuwe bestelbon aan' : 'Bestelbon bewerken'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-2">
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
            size="sm"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Opslaan
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Gegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Referentie / Onderwerp *</Label>
              <Input value={referentie} onChange={(e) => setReferentie(e.target.value)} placeholder="Bijv. Materialen badkamer renovatie" />
            </div>
            <div>
              <Label>Leverancier</Label>
              <Select value={leverancierId} onValueChange={setLeverancierId}>
                <SelectTrigger><SelectValue placeholder="Selecteer leverancier" /></SelectTrigger>
                <SelectContent>
                  {leveranciers.filter((l) => l.actief).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.bedrijfsnaam || l.contactpersoon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Selecteer project" /></SelectTrigger>
                <SelectContent>
                  {projecten.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Besteld op</Label>
                <Input type="date" value={besteldOp} onChange={(e) => setBesteldOp(e.target.value)} />
              </div>
              <div>
                <Label>Verwachte levering</Label>
                <Input type="date" value={verwachteLevering} onChange={(e) => setVerwachteLevering(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Bestelbon['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concept">Concept</SelectItem>
                  <SelectItem value="besteld">Besteld</SelectItem>
                  <SelectItem value="deels_ontvangen">Deels ontvangen</SelectItem>
                  <SelectItem value="ontvangen">Ontvangen</SelectItem>
                  <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opmerkingen</Label>
              <textarea
                value={opmerkingen}
                onChange={(e) => setOpmerkingen(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                placeholder="Opmerkingen..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regels */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Regels</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddRegel} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Regel toevoegen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {regels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm">Geen regels. Klik op "Regel toevoegen" om te beginnen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                <div className="col-span-4">Omschrijving</div>
                <div className="col-span-1 text-right">Aantal</div>
                <div className="col-span-1">Eenheid</div>
                <div className="col-span-2 text-right">Prijs</div>
                <div className="col-span-2 text-right">Totaal</div>
                <div className="col-span-1 text-center">Ontv.</div>
                <div className="col-span-1" />
              </div>

              {regels.map((regel) => (
                <div key={regel.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Input
                      value={regel.omschrijving}
                      onChange={(e) => handleUpdateRegel(regel.id, 'omschrijving', e.target.value)}
                      placeholder="Omschrijving"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number"
                      min={0}
                      value={regel.aantal}
                      onChange={(e) => handleUpdateRegel(regel.id, 'aantal', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      value={regel.eenheid || 'stuk'}
                      onChange={(e) => handleUpdateRegel(regel.id, 'eenheid', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={regel.prijs_per_eenheid}
                      onChange={(e) => handleUpdateRegel(regel.id, 'prijs_per_eenheid', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-semibold text-foreground dark:text-white">
                    {formatCurrency(round2(regel.aantal * regel.prijs_per_eenheid))}
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number"
                      min={0}
                      max={regel.aantal}
                      value={regel.aantal_ontvangen || 0}
                      onChange={(e) => handleUpdateOntvangen(regel.id, parseFloat(e.target.value) || 0)}
                      className={cn(
                        'text-sm text-center',
                        (regel.aantal_ontvangen || 0) >= regel.aantal
                          ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20'
                          : (regel.aantal_ontvangen || 0) > 0
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                          : ''
                      )}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveRegel(regel.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-semibold text-foreground/70 dark:text-muted-foreground/50">Totaal</span>
                <span className="text-lg font-bold text-foreground dark:text-white">{formatCurrency(berekenTotaal)}</span>
              </div>

              {ontvangenStatus && (
                <div className={cn(
                  'flex items-center gap-2 text-xs px-3 py-2 rounded-lg',
                  ontvangenStatus === 'ontvangen' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20'
                )}>
                  {ontvangenStatus === 'ontvangen' ? <Check className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                  {ontvangenStatus === 'ontvangen' ? 'Alle regels volledig ontvangen' : 'Sommige regels deels ontvangen'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
