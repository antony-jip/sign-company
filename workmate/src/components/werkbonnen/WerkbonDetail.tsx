import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Send, FileText, Receipt, Plus, Trash2,
  Pen, RotateCcw, Camera, MapPin, Clock, Car
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { DocumentChainIndicator } from '@/components/shared/DocumentChainIndicator'
import { useAuth } from '@/contexts/AuthContext'
import type { Werkbon, WerkbonRegel, WerkbonFoto, Klant, Project, Medewerker } from '@/types'
import {
  getWerkbon, createWerkbon, updateWerkbon,
  getWerkbonRegels, createWerkbonRegel, updateWerkbonRegel, deleteWerkbonRegel,
  getWerkbonFotos, createWerkbonFoto, deleteWerkbonFoto,
  getKlanten, getProjecten, getProjectenByKlant, getMedewerkers,
  createFactuur, createFactuurItem,
} from '@/services/supabaseService'
import { round2 } from '@/utils/budgetUtils'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  concept: { label: 'Concept', color: 'text-gray-700', bg: 'bg-gray-100' },
  ingediend: { label: 'Ingediend', color: 'text-blue-700', bg: 'bg-blue-100' },
  goedgekeurd: { label: 'Goedgekeurd', color: 'text-green-700', bg: 'bg-green-100' },
  gefactureerd: { label: 'Gefactureerd', color: 'text-purple-700', bg: 'bg-purple-100' },
}

export function WerkbonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const isNew = id === 'nieuw'
  const userId = user?.id || ''

  // Data
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [filteredProjecten, setFilteredProjecten] = useState<Project[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [regels, setRegels] = useState<WerkbonRegel[]>([])
  const [fotos, setFotos] = useState<WerkbonFoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form
  const [klantId, setKlantId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [locatieAdres, setLocatieAdres] = useState('')
  const [locatieStad, setLocatieStad] = useState('')
  const [locatiePostcode, setLocatiePostcode] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [startTijd, setStartTijd] = useState('08:00')
  const [eindTijd, setEindTijd] = useState('16:00')
  const [pauzeMinuten, setPauzeMinuten] = useState(30)
  const [kilometers, setKilometers] = useState(0)
  const [kmTarief, setKmTarief] = useState(0.23)
  const [omschrijving, setOmschrijving] = useState('')
  const [interneNotitie, setInterneNotitie] = useState('')
  const [status, setStatus] = useState<Werkbon['status']>('concept')
  const [werkbonNummer, setWerkbonNummer] = useState('')
  const [werkbonId, setWerkbonId] = useState('')

  // Handtekening
  const [klantNaamGetekend, setKlantNaamGetekend] = useState('')
  const [handtekeningData, setHandtekeningData] = useState<string | undefined>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Full werkbon data for chain indicator
  const [werkbonData, setWerkbonData] = useState<Werkbon | null>(null)

  // Factuur dialog
  const [factureerDialogOpen, setFactureerDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [kl, pr, mw] = await Promise.all([
          getKlanten(),
          getProjecten(),
          getMedewerkers(),
        ])
        if (cancelled) return
        setKlanten(kl)
        setProjecten(pr)
        setMedewerkers(mw)

        if (!isNew && id) {
          const wb = await getWerkbon(id)
          if (!wb) {
            toast.error('Werkbon niet gevonden')
            navigate('/werkbonnen')
            return
          }
          if (cancelled) return
          setWerkbonData(wb)
          setWerkbonId(wb.id)
          setWerkbonNummer(wb.werkbon_nummer)
          setKlantId(wb.klant_id)
          setProjectId(wb.project_id)
          setLocatieAdres(wb.locatie_adres)
          setLocatieStad(wb.locatie_stad || '')
          setLocatiePostcode(wb.locatie_postcode || '')
          setDatum(wb.datum)
          setStartTijd(wb.start_tijd || '08:00')
          setEindTijd(wb.eind_tijd || '16:00')
          setPauzeMinuten(wb.pauze_minuten ?? 30)
          setKilometers(wb.kilometers || 0)
          setKmTarief(wb.km_tarief || 0.23)
          setOmschrijving(wb.omschrijving || '')
          setInterneNotitie(wb.interne_notitie || '')
          setStatus(wb.status)
          setKlantNaamGetekend(wb.klant_naam_getekend || '')
          setHandtekeningData(wb.klant_handtekening)
          setFilteredProjecten(pr.filter((p) => p.klant_id === wb.klant_id))

          const [wbRegels, wbFotos] = await Promise.all([
            getWerkbonRegels(wb.id),
            getWerkbonFotos(wb.id),
          ])
          if (cancelled) return
          setRegels(wbRegels)
          setFotos(wbFotos)
        }
      } catch (err) {
        if (!cancelled) toast.error('Fout bij laden')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [id, isNew, navigate])

  // Pre-fill from URL params (e.g. from ProjectDetail)
  useEffect(() => {
    if (!isNew || isLoading) return
    const paramProject = searchParams.get('project_id')
    const paramKlant = searchParams.get('klant_id')
    if (paramProject) {
      setProjectId(paramProject)
      const project = projecten.find((p) => p.id === paramProject)
      if (project && !klantId) {
        setKlantId(project.klant_id)
        const kl = klanten.find((k) => k.id === project.klant_id)
        if (kl) {
          setLocatieAdres(kl.adres || '')
          setLocatieStad(kl.stad || '')
          setLocatiePostcode(kl.postcode || '')
        }
      }
      setSearchParams({}, { replace: true })
    } else if (paramKlant) {
      setKlantId(paramKlant)
      const kl = klanten.find((k) => k.id === paramKlant)
      if (kl) {
        setLocatieAdres(kl.adres || '')
        setLocatieStad(kl.stad || '')
        setLocatiePostcode(kl.postcode || '')
      }
      setSearchParams({}, { replace: true })
    }
  }, [isNew, isLoading, searchParams, projecten, klanten, klantId, setSearchParams])

  // Filter projecten bij klant selectie
  const handleKlantChange = useCallback((newKlantId: string) => {
    setKlantId(newKlantId)
    setProjectId('')
    const kl = klanten.find((k) => k.id === newKlantId)
    if (kl) {
      setLocatieAdres(kl.adres || '')
      setLocatieStad(kl.stad || '')
      setLocatiePostcode(kl.postcode || '')
    }
    setFilteredProjecten(projecten.filter((p) => p.klant_id === newKlantId))
  }, [klanten, projecten])

  // Save werkbon
  const handleSave = useCallback(async () => {
    if (!klantId) { toast.error('Selecteer een klant'); return }
    if (!projectId) { toast.error('Selecteer een project'); return }
    if (!datum) { toast.error('Vul een datum in'); return }

    try {
      setIsSaving(true)
      const data = {
        user_id: userId,
        klant_id: klantId,
        project_id: projectId,
        locatie_adres: locatieAdres,
        locatie_stad: locatieStad || undefined,
        locatie_postcode: locatiePostcode || undefined,
        datum,
        start_tijd: startTijd || undefined,
        eind_tijd: eindTijd || undefined,
        pauze_minuten: pauzeMinuten,
        kilometers: kilometers || undefined,
        km_tarief: kmTarief || undefined,
        omschrijving: omschrijving || undefined,
        interne_notitie: interneNotitie || undefined,
        status,
        klant_handtekening: handtekeningData,
        klant_naam_getekend: klantNaamGetekend || undefined,
        getekend_op: handtekeningData ? new Date().toISOString() : undefined,
      }

      if (isNew) {
        const created = await createWerkbon(data as Parameters<typeof createWerkbon>[0])
        setWerkbonId(created.id)
        setWerkbonNummer(created.werkbon_nummer)
        toast.success(`Werkbon ${created.werkbon_nummer} aangemaakt`)
        navigate(`/werkbonnen/${created.id}`, { replace: true })
      } else {
        await updateWerkbon(werkbonId, data)
        toast.success('Werkbon opgeslagen')
      }
    } catch (err) {
      toast.error('Fout bij opslaan werkbon')
    } finally {
      setIsSaving(false)
    }
  }, [
    klantId, projectId, datum, userId, locatieAdres, locatieStad, locatiePostcode,
    startTijd, eindTijd, pauzeMinuten, kilometers, kmTarief, omschrijving,
    interneNotitie, status, handtekeningData, klantNaamGetekend, isNew, werkbonId, navigate,
  ])

  // Indienen
  const handleIndienen = useCallback(async () => {
    await handleSave()
    if (werkbonId) {
      await updateWerkbon(werkbonId, { status: 'ingediend' })
      setStatus('ingediend')
      toast.success('Werkbon ingediend')
    }
  }, [handleSave, werkbonId])

  // Regel toevoegen
  const handleRegelToevoegen = useCallback(async (type: WerkbonRegel['type']) => {
    if (!werkbonId) {
      toast.error('Sla de werkbon eerst op')
      return
    }
    const newRegel = await createWerkbonRegel({
      user_id: userId,
      werkbon_id: werkbonId,
      type,
      omschrijving: type === 'arbeid' ? 'Arbeid' : type === 'materiaal' ? 'Materiaal' : 'Overig',
      uren: type === 'arbeid' ? 1 : undefined,
      uurtarief: type === 'arbeid' ? 55 : undefined,
      aantal: type !== 'arbeid' ? 1 : undefined,
      prijs_per_eenheid: type !== 'arbeid' ? 0 : undefined,
      totaal: type === 'arbeid' ? 55 : 0,
      factureerbaar: true,
    })
    setRegels((prev) => [...prev, newRegel])
  }, [werkbonId, userId])

  // Regel bijwerken
  const handleRegelUpdate = useCallback(async (regelId: string, field: string, value: string | number | boolean) => {
    const regel = regels.find((r) => r.id === regelId)
    if (!regel) return

    const updates: Partial<WerkbonRegel> = { [field]: value }

    // Herbereken totaal
    const uren = field === 'uren' ? Number(value) : (regel.uren || 0)
    const uurtarief = field === 'uurtarief' ? Number(value) : (regel.uurtarief || 0)
    const aantal = field === 'aantal' ? Number(value) : (regel.aantal || 0)
    const prijs = field === 'prijs_per_eenheid' ? Number(value) : (regel.prijs_per_eenheid || 0)

    if (regel.type === 'arbeid') {
      updates.totaal = round2(uren * uurtarief)
    } else {
      updates.totaal = round2(aantal * prijs)
    }

    await updateWerkbonRegel(regelId, updates)
    setRegels((prev) => prev.map((r) => r.id === regelId ? { ...r, ...updates } : r))
  }, [regels])

  // Regel verwijderen
  const handleRegelVerwijderen = useCallback(async (regelId: string) => {
    await deleteWerkbonRegel(regelId)
    setRegels((prev) => prev.filter((r) => r.id !== regelId))
    toast.success('Regel verwijderd')
  }, [])

  // Totalen
  const totalen = useMemo(() => {
    const subtotaal = round2(regels.filter((r) => r.factureerbaar).reduce((sum, r) => sum + r.totaal, 0))
    const kmKosten = round2((kilometers || 0) * (kmTarief || 0))
    const totaalExcl = round2(subtotaal + kmKosten)
    const btw = round2(totaalExcl * 0.21)
    const totaalIncl = round2(totaalExcl + btw)
    return { subtotaal, kmKosten, totaalExcl, btw, totaalIncl }
  }, [regels, kilometers, kmTarief])

  // Handtekening canvas
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

  // Foto toevoegen (base64)
  const handleFotoToevoegen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: WerkbonFoto['type']) => {
    if (!werkbonId) { toast.error('Sla de werkbon eerst op'); return }
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const url = ev.target?.result as string
      const foto = await createWerkbonFoto({
        user_id: userId,
        werkbon_id: werkbonId,
        type,
        url,
        omschrijving: file.name,
      })
      setFotos((prev) => [...prev, foto])
      toast.success('Foto toegevoegd')
    }
    reader.readAsDataURL(file)
  }, [werkbonId, userId])

  // Foto verwijderen
  const handleFotoVerwijderen = useCallback(async (fotoId: string) => {
    await deleteWerkbonFoto(fotoId)
    setFotos((prev) => prev.filter((f) => f.id !== fotoId))
    toast.success('Foto verwijderd')
  }, [])

  // Werkbon → Factuur conversie
  const handleFactureer = useCallback(async () => {
    try {
      const factureerRegels = regels.filter((r) => r.factureerbaar)
      const klant = klanten.find((k) => k.id === klantId)
      const project = projecten.find((p) => p.id === projectId)

      const factuurItems: { beschrijving: string; aantal: number; eenheidsprijs: number; btw_percentage: number; korting_percentage: number; totaal: number; volgorde: number }[] = []
      let volgorde = 0

      for (const regel of factureerRegels) {
        volgorde++
        if (regel.type === 'arbeid') {
          factuurItems.push({
            beschrijving: `${regel.omschrijving}${regel.medewerker_id ? ` - ${medewerkers.find((m) => m.id === regel.medewerker_id)?.naam || ''}` : ''}`,
            aantal: regel.uren || 1,
            eenheidsprijs: regel.uurtarief || 0,
            btw_percentage: 21,
            korting_percentage: 0,
            totaal: regel.totaal,
            volgorde,
          })
        } else {
          factuurItems.push({
            beschrijving: regel.omschrijving,
            aantal: regel.aantal || 1,
            eenheidsprijs: regel.prijs_per_eenheid || 0,
            btw_percentage: 21,
            korting_percentage: 0,
            totaal: regel.totaal,
            volgorde,
          })
        }
      }

      // Kilometers
      if (kilometers > 0 && kmTarief > 0) {
        volgorde++
        factuurItems.push({
          beschrijving: `Kilometervergoeding (${kilometers} km × €${kmTarief.toFixed(2)})`,
          aantal: kilometers,
          eenheidsprijs: kmTarief,
          btw_percentage: 21,
          korting_percentage: 0,
          totaal: round2(kilometers * kmTarief),
          volgorde,
        })
      }

      const subtotaal = round2(factuurItems.reduce((sum, i) => sum + i.totaal, 0))
      const btw = round2(subtotaal * 0.21)

      const factuur = await createFactuur({
        user_id: userId,
        klant_id: klantId,
        klant_naam: klant?.bedrijfsnaam,
        project_id: projectId,
        nummer: `F-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
        titel: `Werkbon ${werkbonNummer} - ${project?.naam || ''}`,
        status: 'concept',
        subtotaal,
        btw_bedrag: btw,
        totaal: round2(subtotaal + btw),
        betaald_bedrag: 0,
        factuurdatum: new Date().toISOString().split('T')[0],
        vervaldatum: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notities: `Werkbon: ${werkbonNummer}`,
        voorwaarden: '',
        bron_type: 'project',
        bron_project_id: projectId,
        werkbon_id: werkbonId,
        factuur_type: 'standaard',
        betaaltermijn_dagen: 30,
      })

      for (const item of factuurItems) {
        await createFactuurItem({ ...item, factuur_id: factuur.id })
      }

      await updateWerkbon(werkbonId, { status: 'gefactureerd', factuur_id: factuur.id })
      setStatus('gefactureerd')
      setFactureerDialogOpen(false)
      toast.success('Factuur aangemaakt vanuit werkbon')
      navigate(`/facturen`)
    } catch (err) {
      toast.error('Fout bij aanmaken factuur')
    }
  }, [regels, klantId, projectId, klanten, projecten, medewerkers, kilometers, kmTarief, userId, werkbonNummer, werkbonId, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/werkbonnen')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {isNew ? 'Nieuwe werkbon' : `Werkbon ${werkbonNummer}`}
            </h1>
            {!isNew && (
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1', STATUS_CONFIG[status].bg, STATUS_CONFIG[status].color)}>
                {STATUS_CONFIG[status].label}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'concept' && (
            <Button variant="outline" onClick={handleIndienen} disabled={isNew}>
              <Send className="h-4 w-4 mr-1" /> Indienen
            </Button>
          )}
          {status === 'goedgekeurd' && (
            <Button variant="outline" onClick={() => setFactureerDialogOpen(true)}>
              <Receipt className="h-4 w-4 mr-1" /> Maak factuur
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" /> {isSaving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>

      {/* Keten indicator */}
      {werkbonData && (
        <DocumentChainIndicator type="werkbon" werkbon={werkbonData} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linker kolom: formulier */}
        <div className="lg:col-span-2 space-y-6">
          {/* Klant & Project */}
          <Card>
            <CardHeader><CardTitle className="text-base">Klant & Project</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label>Project *</Label>
                  <Select value={projectId} onValueChange={setProjectId} disabled={!klantId}>
                    <SelectTrigger><SelectValue placeholder="Selecteer project" /></SelectTrigger>
                    <SelectContent>
                      {filteredProjecten.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Locatie */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Locatie</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Adres</Label>
                <Input value={locatieAdres} onChange={(e) => setLocatieAdres(e.target.value)} placeholder="Straat + huisnummer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Postcode</Label>
                  <Input value={locatiePostcode} onChange={(e) => setLocatiePostcode(e.target.value)} placeholder="1234 AB" />
                </div>
                <div>
                  <Label>Stad</Label>
                  <Input value={locatieStad} onChange={(e) => setLocatieStad(e.target.value)} placeholder="Amsterdam" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datum & Tijd */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Datum & Tijd</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Datum *</Label>
                  <Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
                </div>
                <div>
                  <Label>Starttijd</Label>
                  <Input type="time" value={startTijd} onChange={(e) => setStartTijd(e.target.value)} />
                </div>
                <div>
                  <Label>Eindtijd</Label>
                  <Input type="time" value={eindTijd} onChange={(e) => setEindTijd(e.target.value)} />
                </div>
                <div>
                  <Label>Pauze (min)</Label>
                  <Input type="number" min={0} value={pauzeMinuten} onChange={(e) => setPauzeMinuten(Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kilometers */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Kilometers</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kilometers</Label>
                  <Input type="number" min={0} value={kilometers} onChange={(e) => setKilometers(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Tarief per km</Label>
                  <Input type="number" min={0} step={0.01} value={kmTarief} onChange={(e) => setKmTarief(Number(e.target.value))} />
                </div>
              </div>
              {kilometers > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Totaal: {formatCurrency(round2(kilometers * kmTarief))}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Regels */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Regels</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleRegelToevoegen('arbeid')} disabled={isNew}>
                    <Plus className="h-3 w-3 mr-1" /> Arbeid
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRegelToevoegen('materiaal')} disabled={isNew}>
                    <Plus className="h-3 w-3 mr-1" /> Materiaal
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRegelToevoegen('overig')} disabled={isNew}>
                    <Plus className="h-3 w-3 mr-1" /> Overig
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {regels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {isNew ? 'Sla de werkbon eerst op, dan kun je regels toevoegen' : 'Nog geen regels. Voeg arbeid of materiaal toe.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {regels.map((regel) => (
                    <div key={regel.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          regel.type === 'arbeid' ? 'bg-blue-100 text-blue-700' :
                          regel.type === 'materiaal' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {regel.type === 'arbeid' ? 'Arbeid' : regel.type === 'materiaal' ? 'Materiaal' : 'Overig'}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={regel.factureerbaar}
                              onChange={(e) => handleRegelUpdate(regel.id, 'factureerbaar', e.target.checked)}
                              className="rounded"
                            />
                            Factureerbaar
                          </label>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                            onClick={() => handleRegelVerwijderen(regel.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <Input
                        value={regel.omschrijving}
                        onChange={(e) => handleRegelUpdate(regel.id, 'omschrijving', e.target.value)}
                        placeholder="Omschrijving"
                        className="h-8 text-sm"
                      />

                      {regel.type === 'arbeid' ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Medewerker</Label>
                            <Select value={regel.medewerker_id || ''} onValueChange={(v) => handleRegelUpdate(regel.id, 'medewerker_id', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kies" /></SelectTrigger>
                              <SelectContent>
                                {medewerkers.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Uren</Label>
                            <Input type="number" min={0} step={0.25} value={regel.uren || 0}
                              onChange={(e) => handleRegelUpdate(regel.id, 'uren', Number(e.target.value))}
                              className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Uurtarief</Label>
                            <Input type="number" min={0} step={0.01} value={regel.uurtarief || 0}
                              onChange={(e) => handleRegelUpdate(regel.id, 'uurtarief', Number(e.target.value))}
                              className="h-8 text-sm" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Aantal</Label>
                            <Input type="number" min={0} step={1} value={regel.aantal || 0}
                              onChange={(e) => handleRegelUpdate(regel.id, 'aantal', Number(e.target.value))}
                              className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Eenheid</Label>
                            <Input value={regel.eenheid || 'stuks'}
                              onChange={(e) => handleRegelUpdate(regel.id, 'eenheid', e.target.value)}
                              className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Prijs/eenheid</Label>
                            <Input type="number" min={0} step={0.01} value={regel.prijs_per_eenheid || 0}
                              onChange={(e) => handleRegelUpdate(regel.id, 'prijs_per_eenheid', Number(e.target.value))}
                              className="h-8 text-sm" />
                          </div>
                        </div>
                      )}

                      <div className="text-right text-sm font-medium">
                        Totaal: {formatCurrency(regel.totaal)}
                        {!regel.factureerbaar && <span className="text-xs text-muted-foreground ml-1">(niet factureerbaar)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Omschrijving */}
          <Card>
            <CardHeader><CardTitle className="text-base">Werkzaamheden</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Omschrijving (zichtbaar op werkbon/PDF)</Label>
                <Textarea value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)}
                  placeholder="Wat is er gedaan?" rows={3} />
              </div>
              <div>
                <Label>Interne notitie (niet op PDF)</Label>
                <Textarea value={interneNotitie} onChange={(e) => setInterneNotitie(e.target.value)}
                  placeholder="Interne opmerkingen..." rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Foto's */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" /> Foto&apos;s</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                {(['voor', 'na', 'overig'] as const).map((type) => (
                  <label key={type} className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span><Plus className="h-3 w-3 mr-1" /> {type === 'voor' ? 'Voor' : type === 'na' ? 'Na' : 'Overig'}</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleFotoToevoegen(e, type)} disabled={isNew} />
                  </label>
                ))}
              </div>
              {fotos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nog geen foto&apos;s</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {fotos.map((foto) => (
                    <div key={foto.id} className="relative group border rounded-lg overflow-hidden">
                      <img src={foto.url} alt={foto.omschrijving || ''} className="w-full h-32 object-cover" />
                      <div className="absolute top-1 left-1">
                        <span className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                          {foto.type === 'voor' ? 'Voor' : foto.type === 'na' ? 'Na' : 'Overig'}
                        </span>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="absolute top-1 right-1 h-6 w-6 bg-black/40 text-white opacity-0 group-hover:opacity-100"
                        onClick={() => handleFotoVerwijderen(foto.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Handtekening */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Pen className="h-4 w-4" /> Handtekening klant</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Naam</Label>
                <Input value={klantNaamGetekend} onChange={(e) => setKlantNaamGetekend(e.target.value)}
                  placeholder="Naam van de ondertekenaar" />
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

        {/* Rechter kolom: sidebar */}
        <div className="space-y-6">
          {/* Totalen */}
          <Card className="sticky top-6">
            <CardHeader><CardTitle className="text-base">Totalen</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotaal regels</span>
                <span className="font-medium">{formatCurrency(totalen.subtotaal)}</span>
              </div>
              {totalen.kmKosten > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Kilometers</span>
                  <span className="font-medium">{formatCurrency(totalen.kmKosten)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Totaal excl. BTW</span>
                <span className="font-medium">{formatCurrency(totalen.totaalExcl)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>BTW (21%)</span>
                <span>{formatCurrency(totalen.btw)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Totaal incl. BTW</span>
                <span>{formatCurrency(totalen.totaalIncl)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          {!isNew && (
            <Card>
              <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
              <CardContent>
                <Select value={status} onValueChange={(v) => setStatus(v as Werkbon['status'])}
                  disabled={status === 'gefactureerd'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concept">Concept</SelectItem>
                    <SelectItem value="ingediend">Ingediend</SelectItem>
                    <SelectItem value="goedgekeurd">Goedgekeurd</SelectItem>
                    <SelectItem value="gefactureerd" disabled>Gefactureerd</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Factureer dialog */}
      <Dialog open={factureerDialogOpen} onOpenChange={setFactureerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Factuur aanmaken vanuit werkbon</DialogTitle>
            <DialogDescription>
              Er wordt een concept-factuur aangemaakt met alle factureerbare regels uit werkbon {werkbonNummer}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Factureerbare regels:</span><span className="font-medium">{regels.filter((r) => r.factureerbaar).length}</span></div>
            <div className="flex justify-between"><span>Subtotaal:</span><span className="font-medium">{formatCurrency(totalen.subtotaal)}</span></div>
            {totalen.kmKosten > 0 && (
              <div className="flex justify-between"><span>Kilometers:</span><span className="font-medium">{formatCurrency(totalen.kmKosten)}</span></div>
            )}
            <Separator />
            <div className="flex justify-between font-bold"><span>Totaal incl. BTW:</span><span>{formatCurrency(totalen.totaalIncl)}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFactureerDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleFactureer}>Factuur aanmaken</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
