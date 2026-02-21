import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  PackageCheck, Plus, Trash2, Save, ArrowLeft, Loader2,
  Package, FileDown, Pen, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Leveringsbon, LeveringsbonRegel, Klant, Project } from '@/types'
import {
  getLeveringsbon, createLeveringsbon, updateLeveringsbon,
  getLeveringsbonRegels, createLeveringsbonRegel, updateLeveringsbonRegel, deleteLeveringsbonRegel,
  getKlanten, getProjecten,
} from '@/services/supabaseService'
import { generateLeveringsbonPDF } from '@/services/pdfService'
import { useAppSettings } from '@/contexts/AppSettingsContext'

// ============ HELPERS ============

type RegelForm = LeveringsbonRegel & { _isNew?: boolean }

function createEmptyRegel(): Omit<LeveringsbonRegel, 'id' | 'leveringsbon_id' | 'created_at' | 'user_id'> {
  return {
    omschrijving: '',
    aantal: 1,
    eenheid: 'stuk',
    opmerking: '',
  }
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

// ============ COMPONENT ============

export function LeveringsbonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'nieuw'
  const { profile, primaireKleur } = useAppSettings()

  // Data
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [filteredProjecten, setFilteredProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)

  // Form state — mapped to actual Leveringsbon type fields
  const [leveringsbonNummer, setLeveringsbonNummer] = useState('')
  const [klantId, setKlantId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [datum, setDatum] = useState(getTodayString())
  const [locatieAdres, setLocatieAdres] = useState('')
  const [locatieStad, setLocatieStad] = useState('')
  const [locatiePostcode, setLocatiePostcode] = useState('')
  const [status, setStatus] = useState<Leveringsbon['status']>('concept')
  const [omschrijving, setOmschrijving] = useState('')
  const [opmerkingenKlant, setOpmerkingenKlant] = useState('')
  const [regels, setRegels] = useState<RegelForm[]>([])
  const [leveringsbonId, setLeveringsbonId] = useState<string | null>(null)

  // Handtekening
  const [klantNaamGetekend, setKlantNaamGetekend] = useState('')
  const [handtekeningData, setHandtekeningData] = useState<string | undefined>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      const [klData, projData] = await Promise.all([
        getKlanten().catch(() => []),
        getProjecten().catch(() => []),
      ])
      if (cancelled) return
      setKlanten(klData)
      setProjecten(projData)

      if (!isNew && id) {
        try {
          const lb = await getLeveringsbon(id)
          if (!lb) {
            toast.error('Leveringsbon niet gevonden')
            navigate('/leveringsbonnen')
            return
          }
          setLeveringsbonId(lb.id)
          setLeveringsbonNummer(lb.leveringsbon_nummer)
          setKlantId(lb.klant_id || '')
          setProjectId(lb.project_id || '')
          setDatum(lb.datum || '')
          setLocatieAdres(lb.locatie_adres || '')
          setLocatieStad(lb.locatie_stad || '')
          setLocatiePostcode(lb.locatie_postcode || '')
          setStatus(lb.status)
          setOmschrijving(lb.omschrijving || '')
          setOpmerkingenKlant(lb.opmerkingen_klant || '')
          setKlantNaamGetekend(lb.klant_naam_getekend || '')
          setHandtekeningData(lb.klant_handtekening || undefined)

          // Filter projects for this klant
          if (lb.klant_id) {
            setFilteredProjecten(projData.filter((p) => p.klant_id === lb.klant_id))
          }

          const regelData = await getLeveringsbonRegels(lb.id)
          setRegels(regelData)
        } catch {
          toast.error('Fout bij laden leveringsbon')
          navigate('/leveringsbonnen')
        }
      }
      if (!cancelled) setIsLoading(false)
    }
    loadData()
    return () => { cancelled = true }
  }, [id, isNew, navigate])

  // ============ KLANT SELECT ============

  const handleKlantChange = useCallback((newKlantId: string) => {
    setKlantId(newKlantId)
    setProjectId('')
    const kl = klanten.find((k) => k.id === newKlantId)
    if (kl) {
      setLocatieAdres(kl.adres || '')
      setLocatieStad(kl.stad || '')
      setLocatiePostcode(kl.postcode || '')
      setFilteredProjecten(projecten.filter((p) => p.klant_id === newKlantId))
    }
  }, [klanten, projecten])

  // ============ REGELS ============

  const handleAddRegel = useCallback(() => {
    const newRegel: RegelForm = {
      ...createEmptyRegel(),
      id: `temp-${Date.now()}`,
      user_id: '',
      leveringsbon_id: leveringsbonId || '',
      created_at: new Date().toISOString(),
      _isNew: true,
    }
    setRegels((prev) => [...prev, newRegel])
  }, [leveringsbonId])

  const handleUpdateRegel = useCallback((regelId: string, field: string, value: string | number) => {
    setRegels((prev) => prev.map((r) => r.id === regelId ? { ...r, [field]: value } : r))
  }, [])

  const handleRemoveRegel = useCallback((regelId: string) => {
    setRegels((prev) => prev.filter((r) => r.id !== regelId))
  }, [])

  // ============ HANDTEKENING ============

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing])

  const endDraw = useCallback(() => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      setHandtekeningData(canvas.toDataURL('image/png'))
    }
  }, [])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setHandtekeningData(undefined)
  }, [])

  // ============ SAVE ============

  const handleSave = useCallback(async () => {
    if (!klantId) {
      toast.error('Selecteer een klant')
      return
    }

    setIsSaving(true)
    try {
      const validRegels = regels.filter((r) => r.omschrijving.trim())

      // Determine status
      let finalStatus = status
      if (handtekeningData && klantNaamGetekend.trim()) {
        finalStatus = 'getekend'
      }

      if (isNew) {
        const newLb: Omit<Leveringsbon, 'id' | 'leveringsbon_nummer' | 'created_at' | 'updated_at'> = {
          user_id: '',
          klant_id: klantId,
          project_id: projectId || undefined,
          datum,
          locatie_adres: locatieAdres,
          locatie_stad: locatieStad || undefined,
          locatie_postcode: locatiePostcode || undefined,
          status: finalStatus,
          omschrijving: omschrijving || undefined,
          opmerkingen_klant: opmerkingenKlant || undefined,
          klant_handtekening: handtekeningData || undefined,
          klant_naam_getekend: klantNaamGetekend || undefined,
          getekend_op: handtekeningData ? new Date().toISOString() : undefined,
        }
        const saved = await createLeveringsbon(newLb)
        setLeveringsbonId(saved.id)
        setLeveringsbonNummer(saved.leveringsbon_nummer)

        for (const r of validRegels) {
          await createLeveringsbonRegel({
            user_id: '',
            leveringsbon_id: saved.id,
            omschrijving: r.omschrijving,
            aantal: r.aantal,
            eenheid: r.eenheid,
            opmerking: r.opmerking || undefined,
          })
        }

        toast.success(`Leveringsbon ${saved.leveringsbon_nummer} aangemaakt`)
        navigate(`/leveringsbonnen/${saved.id}`, { replace: true })
      } else if (leveringsbonId) {
        await updateLeveringsbon(leveringsbonId, {
          klant_id: klantId,
          project_id: projectId || undefined,
          datum,
          locatie_adres: locatieAdres,
          locatie_stad: locatieStad || undefined,
          locatie_postcode: locatiePostcode || undefined,
          status: finalStatus,
          omschrijving: omschrijving || undefined,
          opmerkingen_klant: opmerkingenKlant || undefined,
          klant_handtekening: handtekeningData || undefined,
          klant_naam_getekend: klantNaamGetekend || undefined,
          getekend_op: handtekeningData ? new Date().toISOString() : undefined,
        })
        setStatus(finalStatus)

        // Sync regels
        const existingRegels = await getLeveringsbonRegels(leveringsbonId).catch(() => [])
        const currentIds = new Set(regels.filter((r) => !r._isNew).map((r) => r.id))

        for (const existing of existingRegels) {
          if (!currentIds.has(existing.id)) {
            await deleteLeveringsbonRegel(existing.id)
          }
        }

        for (const r of validRegels) {
          if (r._isNew || r.id.startsWith('temp-')) {
            const created = await createLeveringsbonRegel({
              user_id: '',
              leveringsbon_id: leveringsbonId,
              omschrijving: r.omschrijving,
              aantal: r.aantal,
              eenheid: r.eenheid,
              opmerking: r.opmerking || undefined,
            })
            setRegels((prev) => prev.map((pr) => pr.id === r.id ? { ...created } : pr))
          } else {
            await updateLeveringsbonRegel(r.id, {
              omschrijving: r.omschrijving,
              aantal: r.aantal,
              eenheid: r.eenheid,
              opmerking: r.opmerking || undefined,
            })
          }
        }

        toast.success(`Leveringsbon ${leveringsbonNummer} opgeslagen`)
      }
    } catch {
      toast.error('Fout bij opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [isNew, leveringsbonNummer, klantId, projectId, datum, locatieAdres, locatieStad, locatiePostcode, status, omschrijving, opmerkingenKlant, handtekeningData, klantNaamGetekend, regels, leveringsbonId, navigate])

  // ============ PDF ============

  const handleDownloadPdf = useCallback(() => {
    const klant = klanten.find((k) => k.id === klantId)
    try {
      const doc = generateLeveringsbonPDF(
        {
          nummer: leveringsbonNummer,
          onderwerp: omschrijving || '',
          leverdatum: datum,
          notities: opmerkingenKlant,
          handtekening_data: handtekeningData,
        },
        regels.filter((r) => r.omschrijving.trim()).map((r) => ({
          beschrijving: r.omschrijving,
          aantal: r.aantal,
          eenheid: r.eenheid,
        })),
        klant || {},
        { ...profile, primaireKleur }
      )
      doc.save(`leveringsbon-${leveringsbonNummer}.pdf`)
      toast.success('PDF gedownload')
    } catch {
      toast.error('Kon PDF niet genereren')
    }
  }, [leveringsbonNummer, omschrijving, datum, opmerkingenKlant, handtekeningData, regels, klanten, klantId, profile, primaireKleur])

  // ============ RENDER ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/leveringsbonnen')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <PackageCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{isNew ? 'Nieuwe leveringsbon' : leveringsbonNummer}</h1>
            <p className="text-sm text-muted-foreground">{isNew ? 'Maak een nieuwe leveringsbon aan' : 'Leveringsbon bewerken'}</p>
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
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
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
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">Klant & Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Klant *</Label>
              <Select value={klantId} onValueChange={handleKlantChange}>
                <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                <SelectContent>
                  {klanten.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.bedrijfsnaam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Selecteer project" /></SelectTrigger>
                <SelectContent>
                  {filteredProjecten.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Omschrijving</Label>
              <Input value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} placeholder="Korte omschrijving van de levering" />
            </div>
            <div>
              <Label>Datum</Label>
              <Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">Locatie & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Adres</Label>
              <Input value={locatieAdres} onChange={(e) => setLocatieAdres(e.target.value)} placeholder="Straat en huisnummer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Postcode</Label>
                <Input value={locatiePostcode} onChange={(e) => setLocatiePostcode(e.target.value)} placeholder="1234 AB" />
              </div>
              <div>
                <Label>Stad</Label>
                <Input value={locatieStad} onChange={(e) => setLocatieStad(e.target.value)} placeholder="Stad" />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Leveringsbon['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concept">Concept</SelectItem>
                  <SelectItem value="geleverd">Geleverd</SelectItem>
                  <SelectItem value="getekend">Getekend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opmerkingen klant</Label>
              <textarea
                value={opmerkingenKlant}
                onChange={(e) => setOpmerkingenKlant(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                placeholder="Opmerkingen van de klant..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regels - NO PRICES (pure delivery proof) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">Geleverde items</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddRegel} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Item toevoegen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {regels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm">Geen items. Klik op "Item toevoegen" om te beginnen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header - NO PRICE COLUMNS */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                <div className="col-span-5">Omschrijving</div>
                <div className="col-span-2 text-right">Aantal</div>
                <div className="col-span-2">Eenheid</div>
                <div className="col-span-2">Opmerking</div>
                <div className="col-span-1" />
              </div>

              {regels.map((regel) => (
                <div key={regel.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input
                      value={regel.omschrijving}
                      onChange={(e) => handleUpdateRegel(regel.id, 'omschrijving', e.target.value)}
                      placeholder="Omschrijving"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      value={regel.aantal}
                      onChange={(e) => handleUpdateRegel(regel.id, 'aantal', parseFloat(e.target.value) || 0)}
                      className="text-sm text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={regel.eenheid || 'stuk'}
                      onChange={(e) => handleUpdateRegel(regel.id, 'eenheid', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={regel.opmerking || ''}
                      onChange={(e) => handleUpdateRegel(regel.id, 'opmerking', e.target.value)}
                      placeholder="Opmerking"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveRegel(regel.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Handtekening */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pen className="h-4 w-4" /> Handtekening klant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Naam</Label>
            <Input
              value={klantNaamGetekend}
              onChange={(e) => setKlantNaamGetekend(e.target.value)}
              placeholder="Naam van de ondertekenaar"
            />
          </div>
          <div className="border rounded-lg p-2">
            {handtekeningData && !canvasRef.current?.getContext('2d') ? (
              <img src={handtekeningData} alt="Handtekening" className="w-full h-40 object-contain" />
            ) : (
              <canvas
                ref={canvasRef}
                width={500}
                height={160}
                className="w-full h-40 cursor-crosshair bg-white rounded touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            )}
          </div>
          <Button variant="outline" size="sm" onClick={clearSignature}>
            <RotateCcw className="h-3 w-3 mr-1" /> Wissen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
