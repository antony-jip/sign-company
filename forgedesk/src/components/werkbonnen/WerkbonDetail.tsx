import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/shared/BackButton'
import { useTabDirtyState } from '@/hooks/useTabDirtyState'
import { useDebouncedCallback } from '@/hooks/useDebounce'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, FileText, Plus, ClipboardCheck, Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import type { Werkbon, WerkbonItem, WerkbonFoto, Klant, Project, Offerte } from '@/types'
import {
  getWerkbon, createWerkbon, updateWerkbon,
  getWerkbonItems, createWerkbonItem, updateWerkbonItem, deleteWerkbonItem,
  createWerkbonAfbeelding, deleteWerkbonAfbeelding,
  getWerkbonFotos, createWerkbonFoto, deleteWerkbonFoto,
  getKlanten, getProjecten, getOffertes,
} from '@/services/supabaseService'
import { generateWerkbonInstructiePDF } from '@/services/werkbonPdfService'
import { uploadFile, downloadFile, getSignedUrl } from '@/services/storageService'
import { WerkbonItemCard } from './WerkbonItemCard'
import { WerkbonHeaderForm } from './WerkbonHeaderForm'
import { WerkbonMonteurFeedback } from './WerkbonMonteurFeedback'

// Resolve a URL: if it's a storage path, convert to a signed URL
async function resolveUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url
  try { return await getSignedUrl(url) } catch { return url }
}

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
  concept: { label: 'Concept', color: 'text-mod-taken-text', bg: 'bg-mod-taken-light' },
  definitief: { label: 'Definitief', color: 'text-mod-klanten-text', bg: 'bg-mod-klanten-light' },
  afgerond: { label: 'Afgerond', color: 'text-mod-facturen-text', bg: 'bg-mod-facturen-light' },
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
  const [contactNaam, setContactNaam] = useState('')
  const [contactTelefoon, setContactTelefoon] = useState('')

  // Monteur secties
  const [urenGewerkt, setUrenGewerkt] = useState<number | undefined>()
  const [monteurOpmerkingen, setMonteurOpmerkingen] = useState('')
  const [klantNaamGetekend, setKlantNaamGetekend] = useState('')
  const [handtekeningData, setHandtekeningData] = useState<string | undefined>()

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
          setContactNaam(wb.contact_naam || '')
          setContactTelefoon(wb.contact_telefoon || '')
          setUrenGewerkt(wb.uren_gewerkt)
          setMonteurOpmerkingen(wb.monteur_opmerkingen || '')
          setKlantNaamGetekend(wb.klant_naam_getekend || '')
          setHandtekeningData(wb.klant_handtekening)

          const [wbItems, wbFotos] = await Promise.all([
            getWerkbonItems(wb.id),
            getWerkbonFotos(wb.id),
          ])
          if (cancelled) return
          for (const item of wbItems) {
            for (const afb of item.afbeeldingen) {
              afb.url = await resolveUrl(afb.url)
            }
          }
          for (const foto of wbFotos) {
            foto.url = await resolveUrl(foto.url)
          }
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

  // Header form field change
  const handleFieldChange = useCallback((field: string, value: string) => {
    setDirty(true)
    switch (field) {
      case 'offerteId': setOfferteId(value); break
      case 'projectId': setProjectId(value); break
      case 'titel': setTitel(value); break
      case 'datum': setDatum(value); break
      case 'locatieAdres': setLocatieAdres(value); break
      case 'locatieStad': setLocatieStad(value); break
      case 'locatiePostcode': setLocatiePostcode(value); break
      case 'contactNaam': setContactNaam(value); break
      case 'contactTelefoon': setContactTelefoon(value); break
    }
  }, [setDirty])

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
        contact_naam: contactNaam || undefined,
        contact_telefoon: contactTelefoon || undefined,
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
    locatieAdres, locatieStad, locatiePostcode, contactNaam, contactTelefoon,
    status, toonBriefpapier, urenGewerkt, monteurOpmerkingen,
    handtekeningData, klantNaamGetekend, isNew, werkbonId, navigate, setDirty,
  ])

  // Item toevoegen — auto-save werkbon als die nog niet bestaat
  const handleItemToevoegen = useCallback(async () => {
    let currentWerkbonId = werkbonId
    if (!currentWerkbonId) {
      // Auto-save de werkbon eerst
      if (!klantId) { toast.error('Selecteer eerst een klant'); return }
      try {
        const created = await createWerkbon({
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
        } as Parameters<typeof createWerkbon>[0])
        currentWerkbonId = created.id
        setWerkbonId(created.id)
        setWerkbonNummer(created.werkbon_nummer)
        toast.success(`Werkbon ${created.werkbon_nummer} aangemaakt`)
        navigate(`/werkbonnen/${created.id}`, { replace: true })
      } catch {
        toast.error('Kon werkbon niet opslaan')
        return
      }
    }
    try {
      const newItem = await createWerkbonItem({
        user_id: userId,
        werkbon_id: currentWerkbonId,
        volgorde: werkbonItems.length + 1,
        omschrijving: 'Nieuw item',
      })
      setWerkbonItems((prev) => [...prev, newItem])
      setDirty(true)
    } catch {
      toast.error('Kon item niet toevoegen')
    }
  }, [werkbonId, userId, klantId, projectId, offerteId, titel, datum, status,
    locatieAdres, locatieStad, locatiePostcode, toonBriefpapier,
    werkbonItems.length, setDirty, navigate])

  // Item bijwerken — debounced Supabase call
  const debouncedUpdateItem = useDebouncedCallback(
    (itemId: string, updates: Partial<WerkbonItem>) => {
      updateWerkbonItem(itemId, updates)
    },
    500,
  )

  const handleItemUpdate = useCallback(async (itemId: string, updates: Partial<WerkbonItem>) => {
    setWerkbonItems((prev) => prev.map((i) => i.id === itemId ? { ...i, ...updates } : i))
    setDirty(true)
    debouncedUpdateItem(itemId, updates)
  }, [setDirty, debouncedUpdateItem])

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
      const resizedFile = new File([resized], file.name, { type: 'image/jpeg' })
      const storagePath = `werkbon-afbeeldingen/${itemId}/${Date.now()}-${file.name}`
      const uploadedPath = await uploadFile(resizedFile, storagePath)
      const displayUrl = await resolveUrl(uploadedPath)

      const afb = await createWerkbonAfbeelding({
        werkbon_item_id: itemId,
        url: uploadedPath,
        type: 'overig',
        omschrijving: file.name,
      })
      // Gebruik display URL voor directe weergave, DB heeft het storage path
      afb.url = displayUrl
      setWerkbonItems((prev) => prev.map((item) =>
        item.id === itemId
          ? { ...item, afbeeldingen: [...item.afbeeldingen, afb] }
          : item
      ))
      toast.success('Afbeelding toegevoegd')
    } catch (err) {
      console.error('Fout bij uploaden afbeelding:', err)
      toast.error('Fout bij uploaden afbeelding')
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
      const resizedFile = new File([resized], file.name, { type: 'image/jpeg' })
      const storagePath = `werkbon-fotos/${werkbonId}/${Date.now()}-${file.name}`
      const uploadedPath = await uploadFile(resizedFile, storagePath)
      const displayUrl = await resolveUrl(uploadedPath)

      const foto = await createWerkbonFoto({
        user_id: userId,
        werkbon_id: werkbonId,
        type,
        url: uploadedPath,
        omschrijving: file.name,
      })
      foto.url = displayUrl
      setFotos((prev) => [...prev, foto])
      toast.success('Foto toegevoegd')
    } catch (err) {
      console.error('Fout bij uploaden foto:', err)
      toast.error('Fout bij uploaden foto')
    }
    e.target.value = ''
  }, [werkbonId, userId])

  // Foto verwijderen
  const handleFotoVerwijderen = useCallback(async (fotoId: string) => {
    await deleteWerkbonFoto(fotoId)
    setFotos((prev) => prev.filter((f) => f.id !== fotoId))
    toast.success('Foto verwijderd')
  }, [])

  // Monteur field handlers
  const handleUrenChange = useCallback((val: number | undefined) => {
    setUrenGewerkt(val); setDirty(true)
  }, [setDirty])

  const handleOpmerkingenChange = useCallback((val: string) => {
    setMonteurOpmerkingen(val); setDirty(true)
  }, [setDirty])

  const handleKlantNaamChange = useCallback((val: string) => {
    setKlantNaamGetekend(val); setDirty(true)
  }, [setDirty])

  const handleHandtekeningChange = useCallback((data: string | undefined) => {
    setHandtekeningData(data); setDirty(true)
  }, [setDirty])

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
        contact_naam: contactNaam,
        contact_telefoon: contactTelefoon,
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
    contactNaam, contactTelefoon, toonBriefpapier, werkbonItems,
  ])

  // Print werkbon (open PDF in nieuw venster met print dialog)
  const handlePrint = useCallback(() => {
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
        contact_naam: contactNaam,
        contact_telefoon: contactTelefoon,
        toon_briefpapier: toonBriefpapier,
      },
      werkbonItems,
      klant || {},
      project?.naam || '',
      bedrijfsProfiel,
      documentStyle
    )

    const blobUrl = doc.output('bloburl')
    const printWindow = window.open(blobUrl as string)
    if (printWindow) {
      printWindow.onload = () => printWindow.print()
    }
  }, [
    klanten, klantId, projecten, projectId, profile, primaireKleur, documentStyle,
    werkbonNummer, titel, datum, locatieAdres, locatieStad, locatiePostcode,
    contactNaam, contactTelefoon, toonBriefpapier, werkbonItems,
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
      <BackButton fallbackPath="/werkbonnen" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/werkbonnen')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold tracking-[-0.03em]">
              {isNew ? 'Nieuwe werkbon' : <span>Werkbon <span className="font-mono">{werkbonNummer}</span></span>}
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
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
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
        <WerkbonHeaderForm
          klantId={klantId}
          projectId={projectId}
          offerteId={offerteId}
          titel={titel}
          datum={datum}
          locatieAdres={locatieAdres}
          locatieStad={locatieStad}
          locatiePostcode={locatiePostcode}
          contactNaam={contactNaam}
          contactTelefoon={contactTelefoon}
          klanten={klanten}
          projecten={projecten}
          offertes={offertes}
          onKlantChange={handleKlantChange}
          onFieldChange={handleFieldChange}
        />

        {/* Rechter kolom: items + monteur secties */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-[-0.02em]">Items ({werkbonItems.length})</h2>
              <Button size="sm" onClick={handleItemToevoegen}>
                <Plus className="h-4 w-4 mr-1" /> Item toevoegen
              </Button>
            </div>

            {werkbonItems.length === 0 ? (
              <Card className="border-dashed rounded-xl border-black/[0.06]">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardCheck className="h-8 w-8 text-[#C44830] opacity-30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nog geen items. Voeg een item toe.
                  </p>
                </CardContent>
              </Card>
            ) : (
              werkbonItems.map((item, idx) => (
                <WerkbonItemCard
                  key={item.id}
                  item={item}
                  index={idx}
                  totalItems={werkbonItems.length}
                  onUpdate={handleItemUpdate}
                  onDelete={handleItemVerwijderen}
                  onMove={handleItemMove}
                  onImageAdd={handleAfbeeldingToevoegen}
                  onImageDelete={handleAfbeeldingVerwijderen}
                  onLightbox={setLightboxUrl}
                />
              ))
            )}
          </div>

          <Separator />

          {/* Monteur secties */}
          <WerkbonMonteurFeedback
            showUren={werkbonMonteurUren}
            showOpmerkingen={werkbonMonteurOpmerkingen}
            showFotos={werkbonMonteurFotos}
            showHandtekening={werkbonKlantHandtekening}
            urenGewerkt={urenGewerkt}
            monteurOpmerkingen={monteurOpmerkingen}
            fotos={fotos}
            klantNaamGetekend={klantNaamGetekend}
            handtekeningData={handtekeningData}
            onUrenChange={handleUrenChange}
            onOpmerkingenChange={handleOpmerkingenChange}
            onFotoToevoegen={handleFotoToevoegen}
            onFotoVerwijderen={handleFotoVerwijderen}
            onKlantNaamChange={handleKlantNaamChange}
            onHandtekeningChange={handleHandtekeningChange}
            onLightbox={setLightboxUrl}
          />
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
