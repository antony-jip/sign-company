import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTabDirtyState } from '@/hooks/useTabDirtyState'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, FileText, Plus, Trash2, GripVertical,
  Camera, MapPin, ChevronUp, ChevronDown, ImagePlus, X,
  Maximize2, Pen, RotateCcw,
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import type { Werkbon, WerkbonItem, WerkbonAfbeelding, WerkbonFoto, Klant, Project, Offerte } from '@/types'
import {
  getWerkbon, createWerkbon, updateWerkbon,
  getWerkbonItems, createWerkbonItem, updateWerkbonItem, deleteWerkbonItem,
  createWerkbonAfbeelding, deleteWerkbonAfbeelding,
  getWerkbonFotos, createWerkbonFoto, deleteWerkbonFoto,
  getKlanten, getProjecten, getOffertes,
} from '@/services/supabaseService'
import { generateWerkbonInstructiePDF } from '@/services/werkbonPdfService'

// Resize image voor localStorage limiet
function resizeImage(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context failed')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('Blob creation failed')) },
        'image/jpeg',
        0.8
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image loading failed')) }
    img.src = url
  })
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  concept: { label: 'Concept', color: 'text-[var(--color-cream-text)]', bg: 'bg-[var(--color-cream)]' },
  definitief: { label: 'Definitief', color: 'text-[var(--color-mist-text)]', bg: 'bg-[var(--color-mist)]' },
  afgerond: { label: 'Afgerond', color: 'text-[var(--color-sage-text)]', bg: 'bg-[var(--color-sage)]' },
}

export function WerkbonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setDirty } = useTabDirtyState()
  const { user } = useAuth()
  const {
    profile, primaireKleur,
    werkbonMonteurUren, werkbonMonteurOpmerkingen,
    werkbonMonteurFotos, werkbonKlantHandtekening, werkbonBriefpapier,
  } = useAppSettings()
  const documentStyle = useDocumentStyle()
  const isNew = id === 'nieuw'
  const userId = user?.id || ''

  // Data
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [werkbonItems, setWerkbonItems] = useState<WerkbonItem[]>([])
  const [fotos, setFotos] = useState<WerkbonFoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form
  const [klantId, setKlantId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [offerteId, setOfferteId] = useState('')
  const [titel, setTitel] = useState('')
  const [locatieAdres, setLocatieAdres] = useState('')
  const [locatieStad, setLocatieStad] = useState('')
  const [locatiePostcode, setLocatiePostcode] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<Werkbon['status']>('concept')
  const [werkbonNummer, setWerkbonNummer] = useState('')
  const [werkbonId, setWerkbonId] = useState('')
  const [toonBriefpapier, setToonBriefpapier] = useState(true)

  // Monteur secties
  const [urenGewerkt, setUrenGewerkt] = useState<number | undefined>()
  const [monteurOpmerkingen, setMonteurOpmerkingen] = useState('')
  const [klantNaamGetekend, setKlantNaamGetekend] = useState('')
  const [handtekeningData, setHandtekeningData] = useState<string | undefined>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEditingSignature, setIsEditingSignature] = useState(false)

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Laad data
  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [kl, pr, off] = await Promise.all([
          getKlanten(),
          getProjecten(),
          getOffertes(),
        ])
        if (cancelled) return
        setKlanten(kl)
        setProjecten(pr)
        setOffertes(off)

        if (!isNew && id) {
          const wb = await getWerkbon(id)
          if (!wb) {
            toast.error('Werkbon niet gevonden')
            navigate('/werkbonnen')
            return
          }
          if (cancelled) return
          setWerkbonId(wb.id)
          setWerkbonNummer(wb.werkbon_nummer)
          setKlantId(wb.klant_id)
          setProjectId(wb.project_id || '')
          setOfferteId(wb.offerte_id || '')
          setTitel(wb.titel || '')
          setLocatieAdres(wb.locatie_adres || '')
          setLocatieStad(wb.locatie_stad || '')
          setLocatiePostcode(wb.locatie_postcode || '')
          setDatum(wb.datum)
          setStatus(wb.status)
          setToonBriefpapier(wb.toon_briefpapier ?? werkbonBriefpapier)
          setUrenGewerkt(wb.uren_gewerkt)
          setMonteurOpmerkingen(wb.monteur_opmerkingen || '')
          setKlantNaamGetekend(wb.klant_naam_getekend || '')
          setHandtekeningData(wb.klant_handtekening)
          setIsEditingSignature(!wb.klant_handtekening)

          const [wbItems, wbFotos] = await Promise.all([
            getWerkbonItems(wb.id),
            getWerkbonFotos(wb.id),
          ])
          if (cancelled) return
          setWerkbonItems(wbItems)
          setFotos(wbFotos)
        }
      } catch {
        if (!cancelled) toast.error('Fout bij laden')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [id, isNew, navigate, werkbonBriefpapier])

  // Klant change → prefill locatie
  const handleKlantChange = useCallback((newKlantId: string) => {
    setKlantId(newKlantId)
    setDirty(true)
    const kl = klanten.find((k) => k.id === newKlantId)
    if (kl) {
      setLocatieAdres(kl.adres || '')
      setLocatieStad(kl.stad || '')
      setLocatiePostcode(kl.postcode || '')
    }
  }, [klanten, setDirty])

  // Save
  const handleSave = useCallback(async () => {
    if (!klantId) { toast.error('Selecteer een klant'); return }

    try {
      setIsSaving(true)
      const data = {
        user_id: userId,
        klant_id: klantId,
        project_id: projectId || undefined,
        offerte_id: offerteId || undefined,
        titel: titel || undefined,
        locatie_adres: locatieAdres || undefined,
        locatie_stad: locatieStad || undefined,
        locatie_postcode: locatiePostcode || undefined,
        datum,
        status,
        toon_briefpapier: toonBriefpapier,
        uren_gewerkt: urenGewerkt,
        monteur_opmerkingen: monteurOpmerkingen || undefined,
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
      setDirty(false)
    } catch {
      toast.error('Fout bij opslaan werkbon')
    } finally {
      setIsSaving(false)
    }
  }, [
    klantId, projectId, offerteId, titel, datum, userId,
    locatieAdres, locatieStad, locatiePostcode,
    status, toonBriefpapier, urenGewerkt, monteurOpmerkingen,
    handtekeningData, klantNaamGetekend, isNew, werkbonId, navigate, setDirty,
  ])

  // Item toevoegen
  const handleItemToevoegen = useCallback(async () => {
    if (!werkbonId) { toast.error('Sla de werkbon eerst op'); return }
    const newItem = await createWerkbonItem({
      user_id: userId,
      werkbon_id: werkbonId,
      volgorde: werkbonItems.length + 1,
      omschrijving: 'Nieuw item',
    })
    setWerkbonItems((prev) => [...prev, newItem])
    setDirty(true)
  }, [werkbonId, userId, werkbonItems.length, setDirty])

  // Item bijwerken
  const handleItemUpdate = useCallback(async (itemId: string, updates: Partial<WerkbonItem>) => {
    await updateWerkbonItem(itemId, updates)
    setWerkbonItems((prev) => prev.map((i) => i.id === itemId ? { ...i, ...updates } : i))
    setDirty(true)
  }, [setDirty])

  // Item verwijderen
  const handleItemVerwijderen = useCallback(async (itemId: string) => {
    await deleteWerkbonItem(itemId)
    setWerkbonItems((prev) => prev.filter((i) => i.id !== itemId))
    toast.success('Item verwijderd')
  }, [])

  // Item herordenen
  const handleItemMove = useCallback(async (itemId: string, direction: 'up' | 'down') => {
    setWerkbonItems((prev) => {
      const idx = prev.findIndex((i) => i.id === itemId)
      if (idx === -1) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      const temp = next[idx]
      next[idx] = next[newIdx]
      next[newIdx] = temp
      // Update volgorde
      next.forEach((item, i) => {
        if (item.volgorde !== i + 1) {
          updateWerkbonItem(item.id, { volgorde: i + 1 })
        }
        item.volgorde = i + 1
      })
      return next
    })
  }, [])

  // Afbeelding toevoegen aan item
  const handleAfbeeldingToevoegen = useCallback(async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Alleen afbeeldingen toegestaan'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Bestand te groot (max 10MB)'); return }

    try {
      const resized = await resizeImage(file, 1200)
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const url = ev.target?.result as string
        const afb = await createWerkbonAfbeelding({
          werkbon_item_id: itemId,
          url,
          type: 'overig',
          omschrijving: file.name,
        })
        setWerkbonItems((prev) => prev.map((item) =>
          item.id === itemId
            ? { ...item, afbeeldingen: [...item.afbeeldingen, afb] }
            : item
        ))
        toast.success('Afbeelding toegevoegd')
      }
      reader.readAsDataURL(resized)
    } catch {
      toast.error('Fout bij verwerken afbeelding')
    }
    e.target.value = ''
  }, [])

  // Afbeelding verwijderen
  const handleAfbeeldingVerwijderen = useCallback(async (itemId: string, afbId: string) => {
    await deleteWerkbonAfbeelding(afbId)
    setWerkbonItems((prev) => prev.map((item) =>
      item.id === itemId
        ? { ...item, afbeeldingen: item.afbeeldingen.filter((a) => a.id !== afbId) }
        : item
    ))
    toast.success('Afbeelding verwijderd')
  }, [])

  // Foto toevoegen (monteur voor/na)
  const handleFotoToevoegen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: WerkbonFoto['type']) => {
    if (!werkbonId) { toast.error('Sla de werkbon eerst op'); return }
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Alleen afbeeldingen toegestaan'); return }

    try {
      const resized = await resizeImage(file, 1200)
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
      reader.readAsDataURL(resized)
    } catch {
      toast.error('Fout bij verwerken foto')
    }
    e.target.value = ''
  }, [werkbonId, userId])

  // Foto verwijderen
  const handleFotoVerwijderen = useCallback(async (fotoId: string) => {
    await deleteWerkbonFoto(fotoId)
    setFotos((prev) => prev.filter((f) => f.id !== fotoId))
    toast.success('Foto verwijderd')
  }, [])

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
    if (canvas) setHandtekeningData(canvas.toDataURL('image/png'))
  }, [])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setHandtekeningData(undefined)
    setIsEditingSignature(true)
  }, [])

  // PDF download
  const handleDownloadPDF = useCallback(() => {
    const klant = klanten.find((k) => k.id === klantId)
    const project = projecten.find((p) => p.id === projectId)
    const bedrijfsProfiel = { ...profile, primaireKleur }

    const doc = generateWerkbonInstructiePDF(
      {
        werkbon_nummer: werkbonNummer,
        titel,
        datum,
        locatie_adres: locatieAdres,
        locatie_stad: locatieStad,
        locatie_postcode: locatiePostcode,
        toon_briefpapier: toonBriefpapier,
      },
      werkbonItems,
      klant || {},
      project?.naam || '',
      bedrijfsProfiel,
      documentStyle
    )

    doc.save(`werkbon-${werkbonNummer || 'nieuw'}.pdf`)
    toast.success('PDF gedownload')
  }, [
    klanten, klantId, projecten, projectId, profile, primaireKleur, documentStyle,
    werkbonNummer, titel, datum, locatieAdres, locatieStad, locatiePostcode,
    toonBriefpapier, werkbonItems,
  ])

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
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1', STATUS_CONFIG[status]?.bg, STATUS_CONFIG[status]?.color)}>
                {STATUS_CONFIG[status]?.label || status}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <Button variant="outline" onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Select value={status} onValueChange={(v) => { setStatus(v as Werkbon['status']); setDirty(true) }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concept">Concept</SelectItem>
                  <SelectItem value="definitief">Definitief</SelectItem>
                  <SelectItem value="afgerond">Afgerond</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" /> {isSaving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linker kolom: meta info */}
        <div className="space-y-6">
          {/* Klant & Koppeling */}
          <Card>
            <CardHeader><CardTitle className="text-base">Klant & Koppeling</CardTitle></CardHeader>
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
                <Label>Offerte (optioneel)</Label>
                <Select value={offerteId} onValueChange={(v) => { setOfferteId(v); setDirty(true) }}>
                  <SelectTrigger><SelectValue placeholder="Geen offerte" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen</SelectItem>
                    {offertes.filter((o) => !klantId || o.klant_id === klantId).map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.nummer} - {o.titel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Project (optioneel)</Label>
                <Select value={projectId} onValueChange={(v) => { setProjectId(v); setDirty(true) }}>
                  <SelectTrigger><SelectValue placeholder="Geen project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen</SelectItem>
                    {projecten.filter((p) => !klantId || p.klant_id === klantId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Titel</Label>
                <Input value={titel} onChange={(e) => { setTitel(e.target.value); setDirty(true) }} placeholder="Bijv. Montage gevelreclame" />
              </div>
              <div>
                <Label>Datum</Label>
                <Input type="date" value={datum} onChange={(e) => { setDatum(e.target.value); setDirty(true) }} />
              </div>
            </CardContent>
          </Card>

          {/* Locatie */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Locatie</CardTitle>
                {(locatieAdres || locatieStad) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([locatieAdres, locatiePostcode, locatieStad].filter(Boolean).join(' '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" /> Navigeer
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Adres</Label>
                <Input value={locatieAdres} onChange={(e) => { setLocatieAdres(e.target.value); setDirty(true) }} placeholder="Straat + huisnummer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Postcode</Label>
                  <Input value={locatiePostcode} onChange={(e) => { setLocatiePostcode(e.target.value); setDirty(true) }} placeholder="1234 AB" />
                </div>
                <div>
                  <Label>Stad</Label>
                  <Input value={locatieStad} onChange={(e) => { setLocatieStad(e.target.value); setDirty(true) }} placeholder="Amsterdam" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rechter kolom: items + monteur secties */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items als kaarten */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Items ({werkbonItems.length})</h2>
              <Button size="sm" onClick={handleItemToevoegen} disabled={isNew}>
                <Plus className="h-4 w-4 mr-1" /> Item toevoegen
              </Button>
            </div>

            {werkbonItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">
                    {isNew ? 'Sla de werkbon eerst op om items toe te voegen' : 'Nog geen items. Voeg een item toe.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              werkbonItems.map((item, idx) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-4">
                    {/* Item header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                        <Badge variant="outline" className="text-xs">#{idx + 1}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleItemMove(item.id, 'up')} disabled={idx === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleItemMove(item.id, 'down')} disabled={idx === werkbonItems.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleItemVerwijderen(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Omschrijving */}
                    <div>
                      <Label className="text-xs">Omschrijving</Label>
                      <Textarea
                        value={item.omschrijving}
                        onChange={(e) => handleItemUpdate(item.id, { omschrijving: e.target.value })}
                        className="text-base font-medium min-h-[60px]"
                        placeholder="Omschrijving van het item"
                      />
                    </div>

                    {/* Afmetingen */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Breedte (mm)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.afmeting_breedte_mm || ''}
                          onChange={(e) => handleItemUpdate(item.id, { afmeting_breedte_mm: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="bijv. 1200"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Hoogte (mm)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.afmeting_hoogte_mm || ''}
                          onChange={(e) => handleItemUpdate(item.id, { afmeting_hoogte_mm: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="bijv. 800"
                        />
                      </div>
                    </div>

                    {/* Afmetingen display */}
                    {(item.afmeting_breedte_mm || item.afmeting_hoogte_mm) && (
                      <div className="bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-lg font-bold text-foreground">
                          {item.afmeting_breedte_mm || '?'} &times; {item.afmeting_hoogte_mm || '?'} mm
                        </span>
                      </div>
                    )}

                    {/* Afbeeldingen */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Afbeeldingen</Label>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleAfbeeldingToevoegen(item.id, e)}
                          />
                          <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ImagePlus className="h-3 w-3" /> Toevoegen
                          </span>
                        </label>
                      </div>
                      {item.afbeeldingen.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {item.afbeeldingen.map((afb) => (
                            <div key={afb.id} className="relative group rounded-lg overflow-hidden border bg-muted/30">
                              <img
                                src={afb.url}
                                alt={afb.omschrijving || 'Afbeelding'}
                                className="w-full aspect-[4/3] object-cover cursor-pointer"
                                onClick={() => setLightboxUrl(afb.url)}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setLightboxUrl(afb.url)}>
                                  <Maximize2 className="h-3 w-3" />
                                </Button>
                                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleAfbeeldingVerwijderen(item.id, afb.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              {afb.omschrijving && (
                                <p className="text-[10px] text-muted-foreground truncate px-1 py-0.5">{afb.omschrijving}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed rounded-lg p-6 text-center">
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAfbeeldingToevoegen(item.id, e)} />
                            <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-xs text-muted-foreground">Klik om afbeelding toe te voegen</p>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Interne notitie */}
                    <div>
                      <Label className="text-xs">Notitie voor monteur</Label>
                      <Textarea
                        value={item.interne_notitie || ''}
                        onChange={(e) => handleItemUpdate(item.id, { interne_notitie: e.target.value || undefined })}
                        placeholder="Bijv. Let op: rechts 5mm extra voor omslag"
                        className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 min-h-[50px]"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Separator />

          {/* Monteur secties (op basis van instellingen) */}
          {werkbonMonteurUren && (
            <Card>
              <CardHeader><CardTitle className="text-base">Uren gewerkt</CardTitle></CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min={0}
                  step={0.25}
                  value={urenGewerkt ?? ''}
                  onChange={(e) => { setUrenGewerkt(e.target.value ? Number(e.target.value) : undefined); setDirty(true) }}
                  placeholder="Bijv. 4.5"
                  className="max-w-[200px]"
                />
              </CardContent>
            </Card>
          )}

          {werkbonMonteurOpmerkingen && (
            <Card>
              <CardHeader><CardTitle className="text-base">Opmerkingen monteur</CardTitle></CardHeader>
              <CardContent>
                <Textarea
                  value={monteurOpmerkingen}
                  onChange={(e) => { setMonteurOpmerkingen(e.target.value); setDirty(true) }}
                  placeholder="Bijzonderheden, problemen, opmerkingen..."
                  rows={3}
                />
              </CardContent>
            </Card>
          )}

          {werkbonMonteurFotos && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" /> Foto's monteur</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFotoToevoegen(e, 'voor')} />
                    <Button variant="outline" size="sm" asChild><span><Camera className="h-4 w-4 mr-1" /> Voor foto</span></Button>
                  </label>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFotoToevoegen(e, 'na')} />
                    <Button variant="outline" size="sm" asChild><span><Camera className="h-4 w-4 mr-1" /> Na foto</span></Button>
                  </label>
                </div>
                {fotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {fotos.map((foto) => (
                      <div key={foto.id} className="relative group rounded-lg overflow-hidden border">
                        <img src={foto.url} alt={foto.omschrijving || ''} className="w-full aspect-[4/3] object-cover cursor-pointer" onClick={() => setLightboxUrl(foto.url)} />
                        <div className="absolute top-1 left-1">
                          <Badge variant="secondary" className="text-[10px]">{foto.type === 'voor' ? 'Voor' : foto.type === 'na' ? 'Na' : 'Overig'}</Badge>
                        </div>
                        <Button
                          variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => handleFotoVerwijderen(foto.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {werkbonKlantHandtekening && (
            <Card>
              <CardHeader><CardTitle className="text-base">Handtekening klant</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Naam</Label>
                  <Input
                    value={klantNaamGetekend}
                    onChange={(e) => { setKlantNaamGetekend(e.target.value); setDirty(true) }}
                    placeholder="Naam ondertekenaar"
                    className="max-w-[300px]"
                  />
                </div>
                {handtekeningData && !isEditingSignature ? (
                  <div className="space-y-2">
                    <img src={handtekeningData} alt="Handtekening" className="border rounded-lg bg-white max-w-[300px]" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditingSignature(true)}>
                        <Pen className="h-3 w-3 mr-1" /> Bewerken
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearSignature}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Wissen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <canvas
                      ref={canvasRef}
                      width={300}
                      height={150}
                      className="border rounded-lg bg-white cursor-crosshair touch-none"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={endDraw}
                      onMouseLeave={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={endDraw}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={clearSignature}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Wissen
                      </Button>
                      {handtekeningData && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditingSignature(false)}>
                          Opslaan
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="sr-only"><DialogTitle>Afbeelding</DialogTitle></DialogHeader>
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Volledig scherm" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
