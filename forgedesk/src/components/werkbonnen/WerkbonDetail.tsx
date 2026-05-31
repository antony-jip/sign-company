import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/shared/BackButton'
import { useTabDirtyState } from '@/hooks/useTabDirtyState'
import { useDebouncedCallback } from '@/hooks/useDebounce'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import {
  Save, FileText, Plus, ClipboardCheck, Printer, Share2, Lock, Eye,
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
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { logCreate } from '@/utils/auditLogger'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import type { Werkbon, WerkbonItem, WerkbonFoto, WerkbonAfbeelding, WerkbonAfbeeldingLayout, WerkbonBlokType, WerkbonTekstPositie, Klant, Project, Offerte } from '@/types'
import {
  getWerkbon, createWerkbon, updateWerkbon,
  getWerkbonItems, createWerkbonItem, updateWerkbonItem, deleteWerkbonItem,
  createWerkbonAfbeelding, updateWerkbonAfbeelding, deleteWerkbonAfbeelding,
  getWerkbonFotos, createWerkbonFoto, deleteWerkbonFoto,
  getKlanten, getProjecten, getOffertes,
  getMontageAfspraak, updateMontageAfspraak,
} from '@/services/supabaseService'
import { generateWerkbonInstructiePDF } from '@/services/werkbonPdfService'
import { uploadFile, downloadFile, getSignedUrl } from '@/services/storageService'
import { sanitizeStorageFilename } from '@/utils/storageHelpers'
import { pdfEerstePaginaNaarImage } from '@/utils/pdfToImage'
import {
  CANVAS_DROP_CASCADE_START_MM,
  CANVAS_DROP_CASCADE_OFFSET_MM,
  CANVAS_LOGO_DEFAULT_MM,
  CANVAS_SOFT_CAP_ELEMENTS,
  CANVAS_Z_INDEX_DEFAULTS,
  getImageBlobRatio,
  deriveCanvasSize,
} from '@/utils/werkbonCanvas'
import { WerkbonItemCard } from './WerkbonItemCard'
import { WerkbonHeaderForm } from './WerkbonHeaderForm'
import { WerkbonMonteurFeedback } from './WerkbonMonteurFeedback'

const PdfPreviewDialog = React.lazy(() =>
  import('@/components/shared/PdfPreviewDialog').then((m) => ({ default: m.PdfPreviewDialog })),
)

// Resolve a URL: if it's a storage path, convert to a signed URL.
// Returns '' on failure so render-laag een placeholder kan tonen ipv broken image.
async function resolveUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url
  try { return await getSignedUrl(url) } catch (err) {
    logger.warn('Kon storage URL niet resolven:', url, err)
    return ''
  }
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
  const { medewerkers } = useMedewerkers()
  const {
    profile, primaireKleur,
    werkbonMonteurUren, werkbonMonteurOpmerkingen,
    werkbonMonteurFotos, werkbonKlantHandtekening, werkbonBriefpapier,
    werkbonCanvasVersie,
  } = useAppSettings()
  const canvasActief = werkbonCanvasVersie >= 1
  const fase2Actief = werkbonCanvasVersie >= 2
  const fase3Actief = werkbonCanvasVersie >= 3
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
  const [aanmakerUserId, setAanmakerUserId] = useState<string | undefined>(undefined)
  const [toonBriefpapier, setToonBriefpapier] = useState(true)
  const [contactNaam, setContactNaam] = useState('')
  const [contactTelefoon, setContactTelefoon] = useState('')
  const [montageAfspraakId, setMontageAfspraakId] = useState<string | undefined>(undefined)

  // Monteur secties
  const [urenGewerkt, setUrenGewerkt] = useState<number | undefined>()
  const [monteurOpmerkingen, setMonteurOpmerkingen] = useState('')
  const [klantNaamGetekend, setKlantNaamGetekend] = useState('')
  const [handtekeningData, setHandtekeningData] = useState<string | undefined>()

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Live PDF-preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [previewNonce, setPreviewNonce] = useState(0)
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bumpPreview = useCallback(() => {
    if (!showPdfPreview) return
    if (bumpTimer.current) clearTimeout(bumpTimer.current)
    bumpTimer.current = setTimeout(() => setPreviewNonce((n) => n + 1), 600)
  }, [showPdfPreview])
  useEffect(() => () => { if (bumpTimer.current) clearTimeout(bumpTimer.current) }, [])

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
          setAanmakerUserId(wb.user_id)
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
          setMontageAfspraakId(wb.montage_afspraak_id || undefined)
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
      } catch (err) {
        logger.error('Fout bij laden:', err)
        if (!cancelled) toast.error('Fout bij laden')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [id, isNew, navigate, werkbonBriefpapier])

  // Bouwt het pdfData-object dat alle 3 PDF-flows (download/print/share) en
  // de live preview delen. Resolve van aanmaker-naam loopt via medewerkers
  // op user_id, met fallback op huidige user voor concept-werkbonnen.
  const buildWerkbonPdfData = useCallback(() => {
    const aanmakerNaam = medewerkers.find((m) => m.user_id === (aanmakerUserId || userId))?.naam
    return {
      werkbon_nummer: werkbonNummer,
      titel,
      datum,
      locatie_adres: locatieAdres,
      locatie_stad: locatieStad,
      locatie_postcode: locatiePostcode,
      contact_naam: contactNaam,
      contact_telefoon: contactTelefoon,
      toon_briefpapier: toonBriefpapier,
      status,
      uren_gewerkt: urenGewerkt,
      monteur_opmerkingen: monteurOpmerkingen,
      klant_handtekening: handtekeningData,
      klant_naam_getekend: klantNaamGetekend,
      aanmaker_naam: aanmakerNaam,
    }
  }, [
    werkbonNummer, titel, datum, locatieAdres, locatieStad, locatiePostcode,
    contactNaam, contactTelefoon, toonBriefpapier, status,
    urenGewerkt, monteurOpmerkingen, handtekeningData, klantNaamGetekend,
    medewerkers, aanmakerUserId, userId,
  ])

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
    bumpPreview()
  }, [klanten, setDirty, bumpPreview])

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
    bumpPreview()
  }, [setDirty, bumpPreview])

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
        logCreate({ user, entityType: 'werkbon', entityId: created.id })
        setWerkbonId(created.id)
        setWerkbonNummer(created.werkbon_nummer)
        toast.success(`Werkbon ${created.werkbon_nummer} aangemaakt`)
        navigate(`/werkbonnen/${created.id}`, { replace: true })
      } else {
        await updateWerkbon(werkbonId, data)
        toast.success('Werkbon opgeslagen')
      }
      setDirty(false)
    } catch (err) {
      logger.error('Fout bij opslaan werkbon:', err)
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

  const handleAfronden = useCallback(async () => {
    if (!klantId) { toast.error('Selecteer een klant'); return }
    try {
      setIsSaving(true)
      const medewerkerNaam = profile?.naam || user?.email || 'Onbekend'
      await updateWerkbon(werkbonId, {
        status: 'afgerond',
        uren_gewerkt: urenGewerkt,
        monteur_opmerkingen: monteurOpmerkingen ? `${monteurOpmerkingen}\n\nAfgerond door: ${medewerkerNaam}` : `Afgerond door: ${medewerkerNaam}`,
        klant_handtekening: handtekeningData,
        klant_naam_getekend: klantNaamGetekend || undefined,
        getekend_op: handtekeningData ? new Date().toISOString() : undefined,
      })
      setStatus('afgerond')
      setDirty(false)
      toast.success('Werkbon afgerond')

      // Sluit gekoppelde montage automatisch — fire-and-forget, faalt stil
      if (montageAfspraakId) {
        getMontageAfspraak(montageAfspraakId)
          .then(async (afspraak) => {
            if (!afspraak || afspraak.status === 'afgerond') return
            await updateMontageAfspraak(montageAfspraakId, { status: 'afgerond' })
            toast.success('Montage automatisch afgerond')
          })
          .catch((err) => logger.warn('Kon montage niet automatisch afronden:', err))
      }
    } catch (err) {
      logger.error('Fout bij afronden werkbon:', err)
      toast.error('Kon werkbon niet afronden')
    } finally {
      setIsSaving(false)
    }
    bumpPreview()
  }, [werkbonId, klantId, urenGewerkt, monteurOpmerkingen, handtekeningData, klantNaamGetekend, profile, user, setDirty, montageAfspraakId, bumpPreview])

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
        logCreate({ user, entityType: 'werkbon', entityId: created.id })
        currentWerkbonId = created.id
        setWerkbonId(created.id)
        setWerkbonNummer(created.werkbon_nummer)
        toast.success(`Werkbon ${created.werkbon_nummer} aangemaakt`)
        navigate(`/werkbonnen/${created.id}`, { replace: true })
      } catch (err) {
        logger.error('Kon werkbon niet opslaan:', err)
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
      bumpPreview()
    } catch (err) {
      logger.error('Kon item niet toevoegen:', err)
      toast.error('Kon item niet toevoegen')
    }
  }, [werkbonId, userId, klantId, projectId, offerteId, titel, datum, status,
    locatieAdres, locatieStad, locatiePostcode, toonBriefpapier,
    werkbonItems.length, setDirty, navigate, bumpPreview])

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
    bumpPreview()
  }, [setDirty, debouncedUpdateItem, bumpPreview])

  // Item verwijderen
  const handleItemVerwijderen = useCallback(async (itemId: string) => {
    await deleteWerkbonItem(itemId)
    setWerkbonItems((prev) => prev.filter((i) => i.id !== itemId))
    toast.success('Item verwijderd')
    bumpPreview()
  }, [bumpPreview])

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
    bumpPreview()
  }, [bumpPreview])

  // Afbeelding toevoegen aan item
  const handleAfbeeldingToevoegen = useCallback(async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Alleen afbeeldingen toegestaan'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Bestand te groot (max 10MB)'); return }

    try {
      const resized = await resizeImage(file, 1200)
      const resizedFile = new File([resized], file.name, { type: 'image/jpeg' })
      const safeName = sanitizeStorageFilename(file.name)
      const storagePath = `werkbon-afbeeldingen/${itemId}/${Date.now()}-${safeName}`
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
      bumpPreview()
    } catch (err) {
      logger.error('Fout bij uploaden afbeelding:', err)
      const msg = err instanceof Error ? err.message : 'Onbekende fout'
      toast.error(`Upload mislukt: ${msg}`)
    }
    e.target.value = ''
  }, [bumpPreview])

  // Afbeelding verwijderen
  const handleAfbeeldingVerwijderen = useCallback(async (itemId: string, afbId: string) => {
    await deleteWerkbonAfbeelding(afbId)
    setWerkbonItems((prev) => prev.map((item) =>
      item.id === itemId
        ? { ...item, afbeeldingen: item.afbeeldingen.filter((a) => a.id !== afbId) }
        : item
    ))
    toast.success('Afbeelding verwijderd')
    bumpPreview()
  }, [bumpPreview])

  // Meerdere afbeeldingen uploaden via desktop drop.
  // Fase 2: PDF-bestanden worden geaccepteerd en geconverteerd naar PNG
  // (eerste pagina) voor weergave; originele PDF blijft beschikbaar via
  // layout.pdf_bron_url voor download/herrendering.
  const handleAfbeeldingenDropped = useCallback(async (itemId: string, files: File[]) => {
    if (!canvasActief) return
    const bruikbareFiles = files.filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf',
    )
    if (bruikbareFiles.length === 0) return

    const item = werkbonItems.find((i) => i.id === itemId)
    if (!item) return
    const huidigAantal = item.afbeeldingen.length

    // Fase 3: 2-image cap vervalt; soft-cap waarschuwing bij > 6 elementen
    // op een werkblad maar geen hard-block. Fase < 3: bestaande cap blijft.
    let teVerwerken: File[]
    let overgeslagen: number
    if (fase3Actief) {
      teVerwerken = bruikbareFiles
      overgeslagen = 0
      const totaal = huidigAantal + teVerwerken.length
      if (totaal > CANVAS_SOFT_CAP_ELEMENTS) {
        toast.info(`${totaal} elementen op het werkblad. Veel elementen kan de preview vertragen.`)
      }
    } else {
      const beschikbaar = Math.max(0, 2 - huidigAantal)
      if (beschikbaar === 0) {
        toast.error('Max 2 afbeeldingen per item')
        return
      }
      teVerwerken = bruikbareFiles.slice(0, beschikbaar)
      overgeslagen = bruikbareFiles.length - teVerwerken.length
    }

    // Default canvas-positie cascade voor fase 3: per nieuw element komt (5+i*10, 5+i*10) mm
    // binnen het werkblad. cascadeIndex is de index binnen deze drop-batch, dus overlap
    // met bestaande elementen wordt geaccepteerd (gebruiker rangschikt zelf verder).
    // Bij fase < 3 wordt enkel blok_type gezet, identiek aan fase-2-gedrag.
    //
    // `ratio` (bron breedte/hoogte) wordt vlak vóór de createWerkbonAfbeelding-call
    // gelezen via getImageBlobRatio. Met die ratio bepaalt deriveCanvasSize de
    // element-afmetingen — geen object-contain letterbox in de editor, dus het
    // selectie-frame valt strak om de zichtbare pixels (fix bug 1).
    const makeLayout = (
      blokType: WerkbonBlokType,
      cascadeIndex: number,
      ratio: number | null,
      extra: Partial<WerkbonAfbeeldingLayout> = {},
    ): WerkbonAfbeeldingLayout => {
      if (!fase3Actief) {
        return { blok_type: blokType, ...extra }
      }
      const isLogo = blokType === 'logo'
      const { w, h } = ratio !== null
        ? deriveCanvasSize(ratio, isLogo)
        : { w: isLogo ? CANVAS_LOGO_DEFAULT_MM : 80, h: isLogo ? CANVAS_LOGO_DEFAULT_MM : 60 }
      return {
        blok_type: blokType,
        canvas_x_mm: CANVAS_DROP_CASCADE_START_MM + cascadeIndex * CANVAS_DROP_CASCADE_OFFSET_MM,
        canvas_y_mm: CANVAS_DROP_CASCADE_START_MM + cascadeIndex * CANVAS_DROP_CASCADE_OFFSET_MM,
        canvas_breedte_mm: w,
        canvas_hoogte_mm: h,
        z_index: CANVAS_Z_INDEX_DEFAULTS[blokType],
        ...extra,
      }
    }

    const nieuweAfbeeldingen: WerkbonAfbeelding[] = []
    let lastError: string | null = null

    for (const file of teVerwerken) {
      const isPdf = file.type === 'application/pdf'

      if (isPdf && !fase2Actief) {
        toast.info('PDF-bestanden vereisen fase 2')
        continue
      }

      if (isPdf) {
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} is te groot (max 25MB)`)
          continue
        }
        try {
          const pngBlob = await pdfEerstePaginaNaarImage(file, { maxBreedtePx: 1200 })
          const pngBaseName = file.name.replace(/\.pdf$/i, '.png')
          const pngFile = new File([pngBlob], pngBaseName, { type: 'image/png' })

          const safePdfName = sanitizeStorageFilename(file.name)
          const safePngName = sanitizeStorageFilename(pngBaseName)
          const timestamp = Date.now()
          const pngStoragePath = `werkbon-afbeeldingen/${itemId}/${timestamp}-${safePngName}`
          const pdfStoragePath = `werkbon-pdfs/${itemId}/${timestamp}-${safePdfName}`

          const [uploadedPngPath, uploadedPdfPath, ratio] = await Promise.all([
            uploadFile(pngFile, pngStoragePath),
            uploadFile(file, pdfStoragePath),
            fase3Actief ? getImageBlobRatio(pngBlob) : Promise.resolve(null),
          ])
          const displayUrl = await resolveUrl(uploadedPngPath)

          const afb = await createWerkbonAfbeelding({
            werkbon_item_id: itemId,
            url: uploadedPngPath,
            type: 'overig',
            omschrijving: file.name,
            layout: makeLayout('pdf', nieuweAfbeeldingen.length, ratio, { pdf_bron_url: uploadedPdfPath }),
          })
          afb.url = displayUrl
          nieuweAfbeeldingen.push(afb)
        } catch (err) {
          logger.error('Fout bij verwerken PDF:', err)
          const msg = err instanceof Error ? err.message : 'Onbekende fout'
          lastError = `${file.name}: PDF kon niet worden ingelezen (${msg})`
          toast.error(`PDF-verwerking mislukt voor ${file.name}`)
        }
        continue
      }

      if (file.size > 10 * 1024 * 1024) {
        lastError = `${file.name} is te groot (max 10MB)`
        continue
      }
      try {
        const resized = await resizeImage(file, 1200)
        const resizedFile = new File([resized], file.name, { type: 'image/jpeg' })
        const safeName = sanitizeStorageFilename(file.name)
        const storagePath = `werkbon-afbeeldingen/${itemId}/${Date.now()}-${safeName}`
        const [uploadedPath, ratio] = await Promise.all([
          uploadFile(resizedFile, storagePath),
          fase3Actief ? getImageBlobRatio(resized) : Promise.resolve(null),
        ])
        const displayUrl = await resolveUrl(uploadedPath)

        const afb = await createWerkbonAfbeelding({
          werkbon_item_id: itemId,
          url: uploadedPath,
          type: 'overig',
          omschrijving: file.name,
          layout: makeLayout('foto', nieuweAfbeeldingen.length, ratio),
        })
        afb.url = displayUrl
        nieuweAfbeeldingen.push(afb)
      } catch (err) {
        logger.error('Fout bij uploaden afbeelding:', err)
        lastError = err instanceof Error ? err.message : 'Onbekende fout'
      }
    }

    if (nieuweAfbeeldingen.length > 0) {
      setWerkbonItems((prev) => prev.map((item) =>
        item.id === itemId
          ? { ...item, afbeeldingen: [...item.afbeeldingen, ...nieuweAfbeeldingen] }
          : item
      ))
      toast.success(`${nieuweAfbeeldingen.length} afbeelding${nieuweAfbeeldingen.length > 1 ? 'en' : ''} toegevoegd`)
      bumpPreview()
    }
    if (overgeslagen > 0) {
      toast.info(`${overgeslagen} bestand(en) overgeslagen (max 2 per item)`)
    }
    if (lastError && nieuweAfbeeldingen.length === 0) {
      toast.error(`Upload mislukt: ${lastError}`)
    } else if (lastError) {
      toast.error(`Upload mislukt voor sommige bestanden: ${lastError}`)
    }
  }, [werkbonItems, bumpPreview, canvasActief, fase2Actief, fase3Actief])

  // Canvas-element verplaatsen (fase 3) — schrijft canvas_x_mm/y_mm naar layout.
  const handleCanvasElementMove = useCallback(async (
    itemId: string,
    afbId: string,
    x_mm: number,
    y_mm: number,
  ) => {
    if (!fase3Actief) return
    const item = werkbonItems.find((i) => i.id === itemId)
    const afb = item?.afbeeldingen.find((a) => a.id === afbId)
    if (!afb) return
    const nieuweLayout: WerkbonAfbeeldingLayout = {
      ...(afb.layout ?? {}),
      canvas_x_mm: x_mm,
      canvas_y_mm: y_mm,
    }
    setWerkbonItems((prev) => prev.map((it) =>
      it.id === itemId
        ? { ...it, afbeeldingen: it.afbeeldingen.map((a) =>
            a.id === afbId ? { ...a, layout: nieuweLayout } : a
          ) }
        : it
    ))
    try {
      await updateWerkbonAfbeelding(afbId, { layout: nieuweLayout })
      bumpPreview()
    } catch (err) {
      logger.error('Kon canvas-positie niet opslaan:', err)
      toast.error('Kon positie niet opslaan')
    }
  }, [werkbonItems, fase3Actief, bumpPreview])

  // Canvas-element vergroten/verkleinen (fase 3) — schrijft canvas_breedte_mm/hoogte_mm.
  const handleCanvasElementResize = useCallback(async (
    itemId: string,
    afbId: string,
    w_mm: number,
    h_mm: number,
  ) => {
    if (!fase3Actief) return
    const item = werkbonItems.find((i) => i.id === itemId)
    const afb = item?.afbeeldingen.find((a) => a.id === afbId)
    if (!afb) return
    const nieuweLayout: WerkbonAfbeeldingLayout = {
      ...(afb.layout ?? {}),
      canvas_breedte_mm: w_mm,
      canvas_hoogte_mm: h_mm,
    }
    setWerkbonItems((prev) => prev.map((it) =>
      it.id === itemId
        ? { ...it, afbeeldingen: it.afbeeldingen.map((a) =>
            a.id === afbId ? { ...a, layout: nieuweLayout } : a
          ) }
        : it
    ))
    try {
      await updateWerkbonAfbeelding(afbId, { layout: nieuweLayout })
      bumpPreview()
    } catch (err) {
      logger.error('Kon canvas-grootte niet opslaan:', err)
      toast.error('Kon grootte niet opslaan')
    }
  }, [werkbonItems, fase3Actief, bumpPreview])

  // Afbeelding-grootte wisselen (klein / normaal / groot → schaal_percentage in layout)
  const handleAfbeeldingGrootteWijzig = useCallback(async (itemId: string, afbId: string, grootte: 'klein' | 'normaal' | 'groot') => {
    const percentage = grootte === 'klein' ? 33 : grootte === 'normaal' ? 50 : 100
    let nieuweLayout: WerkbonAfbeeldingLayout | undefined
    setWerkbonItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item
      return {
        ...item,
        afbeeldingen: item.afbeeldingen.map((a) => {
          if (a.id !== afbId) return a
          const layout: WerkbonAfbeeldingLayout = {
            ...(a.layout ?? {}),
            blok_type: a.layout?.blok_type ?? 'foto',
            schaal_percentage: percentage,
          }
          nieuweLayout = layout
          return { ...a, layout }
        }),
      }
    }))
    bumpPreview()
    if (!nieuweLayout) return
    try {
      await updateWerkbonAfbeelding(afbId, { layout: nieuweLayout })
    } catch (err) {
      logger.error('Kon afbeelding-grootte niet opslaan:', err)
      toast.error('Kon grootte niet opslaan')
    }
  }, [bumpPreview])

  const handleAfbeeldingSchaalWijzig = useCallback(async (
    itemId: string,
    afbId: string,
    schaalPercentage: number,
  ) => {
    if (!canvasActief) return
    const item = werkbonItems.find((i) => i.id === itemId)
    const afb = item?.afbeeldingen.find((a) => a.id === afbId)
    if (!afb) return
    const huidigeLayout = afb.layout ?? {}
    const nieuweLayout: WerkbonAfbeeldingLayout = { ...huidigeLayout, schaal_percentage: schaalPercentage }
    setWerkbonItems((prev) => prev.map((it) =>
      it.id === itemId
        ? { ...it, afbeeldingen: it.afbeeldingen.map((a) =>
            a.id === afbId ? { ...a, layout: nieuweLayout } : a
          ) }
        : it
    ))
    try {
      await updateWerkbonAfbeelding(afbId, { layout: nieuweLayout })
      bumpPreview()
    } catch (err) {
      logger.error('Kon afbeelding-schaal niet opslaan:', err)
      toast.error('Kon schaal niet opslaan')
    }
  }, [werkbonItems, canvasActief, bumpPreview])

  const handleAfbeeldingBlokTypeWijzig = useCallback(async (
    itemId: string,
    afbId: string,
    blokType: WerkbonBlokType,
  ) => {
    if (!canvasActief) return
    let nieuweLayout: WerkbonAfbeeldingLayout | undefined
    setWerkbonItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item
      return {
        ...item,
        afbeeldingen: item.afbeeldingen.map((a) => {
          if (a.id !== afbId) return a
          const layout: WerkbonAfbeeldingLayout = {
            ...(a.layout ?? {}),
            blok_type: blokType,
          }
          nieuweLayout = layout
          return { ...a, layout }
        }),
      }
    }))
    bumpPreview()
    if (!nieuweLayout) return
    try {
      await updateWerkbonAfbeelding(afbId, { layout: nieuweLayout })
    } catch (err) {
      logger.error('Kon blok-type niet opslaan:', err)
      toast.error('Kon blok-type niet opslaan')
    }
  }, [bumpPreview, canvasActief])

  const handleAfbeeldingTekstPositieWijzig = useCallback(async (
    itemId: string,
    afbId: string,
    positie: WerkbonTekstPositie,
  ) => {
    if (!canvasActief) return
    const item = werkbonItems.find((i) => i.id === itemId)
    const afb = item?.afbeeldingen.find((a) => a.id === afbId)
    if (!afb) return
    const huidigeLayout = afb.layout ?? {}
    const nieuweLayout: WerkbonAfbeeldingLayout = { ...huidigeLayout, tekst_positie: positie }
    setWerkbonItems((prev) => prev.map((it) =>
      it.id === itemId
        ? { ...it, afbeeldingen: it.afbeeldingen.map((a) =>
            a.id === afbId ? { ...a, layout: nieuweLayout } : a
          ) }
        : it
    ))
    try {
      await updateWerkbonAfbeelding(afbId, { layout: nieuweLayout })
      bumpPreview()
    } catch (err) {
      logger.error('Kon tekst-positie niet opslaan:', err)
      toast.error('Kon tekst-positie niet opslaan')
    }
  }, [werkbonItems, canvasActief, bumpPreview])

  // Afbeelding-reorder binnen item via drag-drop
  const handleAfbeeldingReorder = useCallback(async (itemId: string, draggedAfbId: string, targetAfbId: string) => {
    if (!canvasActief) return
    let herordendeAfbeeldingen: WerkbonAfbeelding[] | null = null
    setWerkbonItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item
      const draggedIdx = item.afbeeldingen.findIndex((a) => a.id === draggedAfbId)
      const targetIdx = item.afbeeldingen.findIndex((a) => a.id === targetAfbId)
      if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return item
      const next = [...item.afbeeldingen]
      const [dragged] = next.splice(draggedIdx, 1)
      const insertIdx = next.findIndex((a) => a.id === targetAfbId)
      next.splice(insertIdx, 0, dragged)
      const metVolgorde = next.map((a, i) => ({
        ...a,
        layout: { ...(a.layout ?? {}), blok_type: a.layout?.blok_type ?? 'foto', volgorde: i },
      }))
      herordendeAfbeeldingen = metVolgorde
      return { ...item, afbeeldingen: metVolgorde }
    }))
    bumpPreview()
    if (!herordendeAfbeeldingen) return
    try {
      for (const afb of herordendeAfbeeldingen as WerkbonAfbeelding[]) {
        await updateWerkbonAfbeelding(afb.id, { layout: afb.layout })
      }
    } catch (err) {
      logger.error('Kon afbeelding-volgorde niet opslaan:', err)
      toast.error('Kon volgorde niet opslaan')
    }
  }, [bumpPreview, canvasActief])

  // Foto toevoegen (monteur voor/na)
  const handleFotoToevoegen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: WerkbonFoto['type']) => {
    if (!werkbonId) { toast.error('Sla de werkbon eerst op'); return }
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) return

    let uploaded = 0
    let lastError: string | null = null
    for (const file of files) {
      try {
        const resized = await resizeImage(file, 1200)
        const resizedFile = new File([resized], file.name, { type: 'image/jpeg' })
        const safeName = sanitizeStorageFilename(file.name)
        const storagePath = `werkbon-fotos/${werkbonId}/${Date.now()}-${safeName}`
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
        uploaded++
      } catch (err) {
        logger.error('Fout bij uploaden foto:', err)
        lastError = err instanceof Error ? err.message : 'Onbekende fout'
      }
    }
    if (uploaded > 0) { toast.success(`${uploaded} foto${uploaded > 1 ? "'s" : ''} toegevoegd`); bumpPreview() }
    else toast.error(`Upload mislukt: ${lastError ?? 'Onbekende fout'}`)
    e.target.value = ''
  }, [werkbonId, userId, bumpPreview])

  // Foto verwijderen
  const handleFotoVerwijderen = useCallback(async (fotoId: string) => {
    await deleteWerkbonFoto(fotoId)
    setFotos((prev) => prev.filter((f) => f.id !== fotoId))
    toast.success('Foto verwijderd')
    bumpPreview()
  }, [bumpPreview])

  const handleDownloadFotos = useCallback(async () => {
    if (fotos.length === 0) return
    try {
      toast.info('Foto\'s worden voorbereid...')
      const { buildZip } = await import('@/utils/zipBuilder')
      const entries = await Promise.all(
        fotos.map(async (foto, i) => {
          const res = await fetch(foto.url)
          const blob = await res.blob()
          const ext = blob.type.includes('png') ? 'png' : 'jpg'
          const prefix = foto.type === 'voor' ? 'voor' : foto.type === 'na' ? 'na' : 'overig'
          return { name: `${prefix}-${i + 1}.${ext}`, data: new Uint8Array(await blob.arrayBuffer()) }
        })
      )
      const zip = buildZip(entries)
      const url = URL.createObjectURL(zip)
      const a = document.createElement('a')
      a.href = url
      a.download = `werkbon-${werkbonNummer || 'fotos'}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Fout bij downloaden fotos:', err)
      toast.error('Kon foto\'s niet downloaden')
    }
  }, [fotos, werkbonNummer])

  // Monteur field handlers
  const handleUrenChange = useCallback((val: number | undefined) => {
    setUrenGewerkt(val); setDirty(true); bumpPreview()
  }, [setDirty, bumpPreview])

  const handleOpmerkingenChange = useCallback((val: string) => {
    setMonteurOpmerkingen(val); setDirty(true); bumpPreview()
  }, [setDirty, bumpPreview])

  const handleKlantNaamChange = useCallback((val: string) => {
    setKlantNaamGetekend(val); setDirty(true); bumpPreview()
  }, [setDirty, bumpPreview])

  const handleHandtekeningChange = useCallback((data: string | undefined) => {
    setHandtekeningData(data); setDirty(true); bumpPreview()
  }, [setDirty, bumpPreview])

  // PDF download
  const handleDownloadPDF = useCallback(async () => {
    const klant = klanten.find((k) => k.id === klantId)
    const project = projecten.find((p) => p.id === projectId)
    const bedrijfsProfiel = { ...profile, primaireKleur }

    try {
      const doc = await generateWerkbonInstructiePDF(
        buildWerkbonPdfData(),
        werkbonItems,
        klant || {},
        project?.naam || '',
        bedrijfsProfiel,
        documentStyle,
        { fotos }
      )
      doc.save(`werkbon-${werkbonNummer || 'nieuw'}.pdf`)
      toast.success(<>PDF gedownload<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      console.error('PDF generatie fout:', err)
      toast.error('Kon PDF niet genereren')
    }
  }, [
    klanten, klantId, projecten, projectId, profile, primaireKleur, documentStyle,
    werkbonItems, werkbonNummer, fotos, buildWerkbonPdfData,
  ])

  // Print werkbon (open PDF in nieuw venster met print dialog)
  const handlePrint = useCallback(async () => {
    const klant = klanten.find((k) => k.id === klantId)
    const project = projecten.find((p) => p.id === projectId)
    const bedrijfsProfiel = { ...profile, primaireKleur }

    try {
      const doc = await generateWerkbonInstructiePDF(
        buildWerkbonPdfData(),
        werkbonItems,
        klant || {},
        project?.naam || '',
        bedrijfsProfiel,
        documentStyle,
        { fotos }
      )
      const blobUrl = doc.output('bloburl')
      const printWindow = window.open(blobUrl as unknown as string)
      if (printWindow) {
        printWindow.onload = () => printWindow.print()
      }
    } catch (err) {
      console.error('PDF generatie fout:', err)
      toast.error('Kon PDF niet genereren')
    }
  }, [
    klanten, klantId, projecten, projectId, profile, primaireKleur, documentStyle,
    werkbonItems, fotos, buildWerkbonPdfData,
  ])

  // Deel werkbon PDF via WhatsApp / native share
  const handleShare = useCallback(async () => {
    const klant = klanten.find((k) => k.id === klantId)
    const project = projecten.find((p) => p.id === projectId)
    const bedrijfsProfiel = { ...profile, primaireKleur }
    const bestandsnaam = `werkbon-${werkbonNummer || 'nieuw'}.pdf`

    const doc = await generateWerkbonInstructiePDF(
      buildWerkbonPdfData(),
      werkbonItems,
      klant || {},
      project?.naam || '',
      bedrijfsProfiel,
      documentStyle
    )

    const pdfBlob = doc.output('blob')
    const file = new File([pdfBlob], bestandsnaam, { type: 'application/pdf' })
    const deelTekst = `Werkbon ${werkbonNummer}${titel ? ` - ${titel}` : ''}`

    const deelViaWhatsApp = () => {
      doc.save(bestandsnaam)
      const tekst = encodeURIComponent(`${deelTekst}\nZie bijgevoegde PDF.`)
      window.open(`https://wa.me/?text=${tekst}`, '_blank')
      toast.success('PDF gedownload — voeg toe in WhatsApp')
    }

    // Native Web Share API (mobiel: WhatsApp, Mail, etc.)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: deelTekst,
          text: deelTekst,
          files: [file],
        })
        toast.success('Werkbon gedeeld')
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        // Share API faalde, fallback naar WhatsApp
        deelViaWhatsApp()
      }
    } else {
      deelViaWhatsApp()
    }
  }, [
    klanten, klantId, projecten, projectId, profile, primaireKleur, documentStyle,
    werkbonNummer, titel, werkbonItems, buildWerkbonPdfData,
  ])

  // Genereer PDF-blob voor de live preview-dialog
  const generatePreviewPdf = useCallback(async (): Promise<Blob> => {
    const klant = klanten.find((k) => k.id === klantId)
    const project = projecten.find((p) => p.id === projectId)
    const bedrijfsProfiel = { ...profile, primaireKleur }
    const doc = await generateWerkbonInstructiePDF(
      buildWerkbonPdfData(),
      werkbonItems,
      klant || {},
      project?.naam || '',
      bedrijfsProfiel,
      documentStyle,
      { fotos },
    )
    return doc.output('blob') as Blob
  }, [
    klanten, klantId, projecten, projectId, profile, primaireKleur, documentStyle,
    werkbonItems, fotos, buildWerkbonPdfData,
  ])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="relative -m-3 sm:-m-4 md:-m-6 -mb-20 md:-mb-6 min-h-full" style={{ backgroundColor: 'hsl(var(--background))' }}>
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-5 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton fallbackPath="/werkbonnen" />
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F15025' }}>
            <ClipboardCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {isNew ? 'Nieuwe werkbon' : <span>Werkbon <span className="font-mono">{werkbonNummer}</span></span>}
            </h1>
            {!isNew && (
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_CONFIG[status]?.bg, STATUS_CONFIG[status]?.color)}>
                {STATUS_CONFIG[status]?.label || status}<span style={{ color: '#F15025' }}>.</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!isNew && (
            <>
              <div className="hidden md:contents">
                <button onClick={() => setShowPdfPreview(true)} className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors hover:bg-muted" style={{ border: '1px solid hsl(var(--border))' }} title="Live preview">
                  <Eye className="h-4 w-4 text-foreground/70" />
                </button>
                <button onClick={handlePrint} className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors hover:bg-muted" style={{ border: '1px solid hsl(var(--border))' }} title="Printen">
                  <Printer className="h-4 w-4 text-foreground/70" />
                </button>
                <button onClick={handleDownloadPDF} className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors hover:bg-muted" style={{ border: '1px solid hsl(var(--border))' }} title="Download PDF">
                  <FileText className="h-4 w-4 text-foreground/70" />
                </button>
                <button onClick={handleShare} className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors hover:bg-muted" style={{ border: '1px solid hsl(var(--border))' }} title="Deel via WhatsApp">
                  <Share2 className="h-3.5 w-3.5 text-foreground/70" />
                </button>
              </div>
              <Select value={status} onValueChange={(v) => { setStatus(v as Werkbon['status']); setDirty(true); bumpPreview() }}>
                <SelectTrigger className="w-[120px] h-8 text-[12px] rounded-lg" style={{ border: '1px solid hsl(var(--border))' }}>
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
          {status !== 'afgerond' && !isNew && (
            <button
              onClick={handleAfronden}
              disabled={isSaving}
              className="h-9 px-4 text-[13px] font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 bg-[#F15025]"
            >
              <ClipboardCheck className="h-3.5 w-3.5" /> Afronden
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 px-4 text-[13px] font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            style={{ backgroundColor: '#1A535C' }}
          >
            <Save className="h-3.5 w-3.5" /> {isSaving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>

      {status === 'afgerond' && !isNew && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-[hsl(var(--status-green-bg))] rounded-xl text-[13px] text-[#2D6B48] border border-[#C5E0D0]">
          <ClipboardCheck className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Deze werkbon is <strong>afgerond</strong>. Zet de status terug naar Concept om te bewerken.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Linker kolom: meta info — sticky tijdens scroll vanaf lg-breakpoint */}
        <div className="lg:sticky lg:top-4">
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
        </div>

        {/* Rechter kolom: items + monteur secties */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9B9B95' }}>Items ({werkbonItems.length})</h2>
              <button
                onClick={handleItemToevoegen}
                className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-semibold rounded-lg text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#F15025' }}
              >
                <Plus className="h-3.5 w-3.5" /> Item toevoegen
              </button>
            </div>

            {werkbonItems.length === 0 ? (
              <button
                onClick={handleItemToevoegen}
                className="w-full py-8 text-center rounded-xl border-2 border-dashed hover:border-[#F15025]/30 transition-colors group"
                style={{ borderColor: '#EBEBEB', backgroundColor: 'hsl(var(--card))' }}
              >
                <ClipboardCheck className="h-6 w-6 mx-auto mb-2 text-[#F15025] opacity-30 group-hover:opacity-60 transition-opacity" />
                <p className="text-[13px] text-muted-foreground group-hover:text-[#F15025] transition-colors">
                  Voeg een item toe
                </p>
              </button>
            ) : (
              <>
                {werkbonItems.map((item, idx) => (
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
                    onImageGrootteChange={handleAfbeeldingGrootteWijzig}
                    onImageBlokTypeChange={handleAfbeeldingBlokTypeWijzig}
                    onImageSchaalChange={handleAfbeeldingSchaalWijzig}
                    onImageTekstPositieChange={handleAfbeeldingTekstPositieWijzig}
                    onLightbox={setLightboxUrl}
                    onAfbeeldingenDropped={handleAfbeeldingenDropped}
                    onAfbeeldingReorder={handleAfbeeldingReorder}
                    onCanvasElementMove={handleCanvasElementMove}
                    onCanvasElementResize={handleCanvasElementResize}
                  />
                ))}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleItemToevoegen}
                    className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-semibold rounded-lg border border-[#F15025]/30 text-[#F15025] hover:bg-[#F15025] hover:text-white hover:border-[#F15025] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Item toevoegen
                  </button>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Monteur secties */}
          <WerkbonMonteurFeedback
            showUren={werkbonMonteurUren}
            showOpmerkingen={werkbonMonteurOpmerkingen}
            showFotos={werkbonMonteurFotos}
            showHandtekening={werkbonKlantHandtekening}
            readOnly={status === 'afgerond'}
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
            onDownloadFotos={handleDownloadFotos}
            onAfronden={handleAfronden}
            isSaving={isSaving}
            status={status}
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

      {/* Live PDF-preview */}
      {showPdfPreview && (
        <React.Suspense fallback={null}>
          <PdfPreviewDialog
            open={showPdfPreview}
            onOpenChange={setShowPdfPreview}
            title={`Werkbon ${werkbonNummer || 'concept'}`}
            generatePdf={generatePreviewPdf}
            refreshNonce={previewNonce}
          />
        </React.Suspense>
      )}
    </div>
    </div>
  )
}
