import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardCheck, FileText, Loader2 } from 'lucide-react'
import { BackButton } from '@/components/shared/BackButton'
import { useTabDirtyState } from '@/hooks/useTabDirtyState'
import { logger } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type {
  Werkbon, WerkbonItem, WerkbonFoto, Klant, Project, Offerte,
} from '@/types'
import {
  getWerkbon, updateWerkbon,
  getWerkbonItems,
  getWerkbonFotos, createWerkbonFoto, deleteWerkbonFoto,
  getKlanten, getProjecten, getOffertes,
  getMontageAfspraak, updateMontageAfspraak,
} from '@/services/supabaseService'
import { uploadFile } from '@/services/storageService'
import { resolveWerkbonUrl, resizeWerkbonImage, opmerkingenMetAfronder } from '@/utils/werkbonMedia'
import { bufferWerkbonFeedback, clearWerkbonFeedback, flushWerkbonFeedbackQueue } from '@/utils/werkbonOfflineQueue'
import { sanitizeStorageFilename } from '@/utils/storageHelpers'
import { generateWerkbonInstructiePDF } from '@/services/werkbonPdfService'
import { WerkbonMonteurFeedback } from './WerkbonMonteurFeedback'

const PdfPreviewDialog = React.lazy(() =>
  import('@/components/shared/PdfPreviewDialog').then((m) => ({ default: m.PdfPreviewDialog })),
)

const STATUS_LABEL: Record<Werkbon['status'], string> = {
  concept: 'Open',
  definitief: 'In uitvoering',
  afgerond: 'Afgetekend',
  gefactureerd: 'Gefactureerd',
}

const resolveUrl = resolveWerkbonUrl
const resizeImage = resizeWerkbonImage

function formatDateNL(s: string | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function WerkbonMonteurView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setDirty } = useTabDirtyState()
  const { user } = useAuth()
  const { medewerkers } = useMedewerkers()
  const {
    profile, primaireKleur,
    werkbonMonteurUren, werkbonMonteurOpmerkingen,
    werkbonMonteurFotos, werkbonKlantHandtekening,
  } = useAppSettings()
  const documentStyle = useDocumentStyle()
  const userId = user?.id || ''

  const [werkbon, setWerkbon] = useState<Werkbon | null>(null)
  const [werkbonItems, setWerkbonItems] = useState<WerkbonItem[]>([])
  const [fotos, setFotos] = useState<WerkbonFoto[]>([])
  const [klant, setKlant] = useState<Klant | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [offerte, setOfferte] = useState<Offerte | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [urenGewerkt, setUrenGewerkt] = useState<number | undefined>()
  const [monteurOpmerkingen, setMonteurOpmerkingen] = useState('')
  const [klantNaamGetekend, setKlantNaamGetekend] = useState('')
  const [handtekeningData, setHandtekeningData] = useState<string | undefined>()

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [previewNonce, setPreviewNonce] = useState(0)
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bumpPreview = useCallback(() => {
    if (!showPdfPreview) return
    if (bumpTimer.current) clearTimeout(bumpTimer.current)
    bumpTimer.current = setTimeout(() => setPreviewNonce((n) => n + 1), 600)
  }, [showPdfPreview])
  useEffect(() => () => { if (bumpTimer.current) clearTimeout(bumpTimer.current) }, [])

  // ── Autosave van monteur-feedback (uren/opmerkingen/naam/handtekening) ──
  // Zonder dit ging alles behalve foto's pas bij afronden naar de DB; weg-
  // navigeren of een crash op locatie betekende dataverlies. userChangedRef
  // voorkomt dat het inladen zelf als wijziging telt.
  const userChangedRef = useRef(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      if (!id) return
      try {
        setIsLoading(true)
        const wb = await getWerkbon(id)
        if (!wb) {
          if (!cancelled) setNotFound(true)
          return
        }
        if (cancelled) return
        setWerkbon(wb)
        setUrenGewerkt(wb.uren_gewerkt)
        setMonteurOpmerkingen(wb.monteur_opmerkingen || '')
        setKlantNaamGetekend(wb.klant_naam_getekend || '')
        setHandtekeningData(wb.klant_handtekening)

        const [wbItems, wbFotos, klanten, projecten, offertes] = await Promise.all([
          getWerkbonItems(wb.id),
          getWerkbonFotos(wb.id),
          getKlanten(),
          getProjecten(),
          getOffertes(),
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
        setKlant(klanten.find((k) => k.id === wb.klant_id) || null)
        setProject(wb.project_id ? projecten.find((p) => p.id === wb.project_id) || null : null)
        setOfferte(wb.offerte_id ? offertes.find((o) => o.id === wb.offerte_id) || null : null)
      } catch (err) {
        logger.error('Fout bij laden werkbon:', err)
        if (!cancelled) toast.error('Fout bij laden werkbon')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [id])

  const handleUrenChange = useCallback((val: number | undefined) => {
    userChangedRef.current = true; setUrenGewerkt(val); setDirty(true); bumpPreview()
  }, [setDirty, bumpPreview])

  const handleOpmerkingenChange = useCallback((val: string) => {
    userChangedRef.current = true; setMonteurOpmerkingen(val); setDirty(true); bumpPreview()
  }, [setDirty, bumpPreview])

  const handleKlantNaamChange = useCallback((val: string) => {
    userChangedRef.current = true; setKlantNaamGetekend(val); setDirty(true); bumpPreview()
  }, [setDirty, bumpPreview])

  const handleHandtekeningChange = useCallback((data: string | undefined) => {
    userChangedRef.current = true; setHandtekeningData(data); setDirty(true); bumpPreview()
  }, [setDirty, bumpPreview])

  // Debounced autosave zodra de monteur iets wijzigt (niet bij afgeronde werkbon).
  useEffect(() => {
    if (!userChangedRef.current) return
    if (!werkbon || werkbon.status === 'afgerond') return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      const payload = {
        uren_gewerkt: urenGewerkt,
        monteur_opmerkingen: monteurOpmerkingen || undefined,
        klant_handtekening: handtekeningData,
        klant_naam_getekend: klantNaamGetekend || undefined,
        getekend_op: handtekeningData ? new Date().toISOString() : undefined,
      }
      try {
        await updateWerkbon(werkbon.id, payload)
        clearWerkbonFeedback(werkbon.id)
        setDirty(false)
      } catch (err) {
        // Geen dekking op locatie: buffer lokaal en sync zodra er verbinding is.
        logger.error('Autosave werkbon-feedback mislukt, gebufferd voor retry:', err)
        bufferWerkbonFeedback(werkbon.id, payload, Date.now())
      }
    }, 1000)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [urenGewerkt, monteurOpmerkingen, klantNaamGetekend, handtekeningData, werkbon, setDirty])

  // Gebufferde offline-feedback opnieuw proberen bij mount en zodra de
  // verbinding terugkomt.
  useEffect(() => {
    flushWerkbonFeedbackQueue()
    const onOnline = () => { flushWerkbonFeedbackQueue() }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  // Laatste waarden vasthouden voor een flush bij wegnavigeren (de debounce
  // van 1s zou anders de allerlaatste wijziging kunnen verliezen).
  const feedbackRef = useRef({ urenGewerkt, monteurOpmerkingen, klantNaamGetekend, handtekeningData, werkbon })
  feedbackRef.current = { urenGewerkt, monteurOpmerkingen, klantNaamGetekend, handtekeningData, werkbon }
  useEffect(() => () => {
    if (!userChangedRef.current) return
    const f = feedbackRef.current
    if (!f.werkbon || f.werkbon.status === 'afgerond') return
    const payload = {
      uren_gewerkt: f.urenGewerkt,
      monteur_opmerkingen: f.monteurOpmerkingen || undefined,
      klant_handtekening: f.handtekeningData,
      klant_naam_getekend: f.klantNaamGetekend || undefined,
      getekend_op: f.handtekeningData ? new Date().toISOString() : undefined,
    }
    updateWerkbon(f.werkbon.id, payload)
      .then(() => clearWerkbonFeedback(f.werkbon!.id))
      .catch(() => bufferWerkbonFeedback(f.werkbon!.id, payload, Date.now()))
  }, [])

  const handleFotoToevoegen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: WerkbonFoto['type']) => {
    if (!werkbon) return
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return

    let uploaded = 0
    let lastError: string | null = null
    // Parallel met een kleine concurrency-limiet: veel sneller dan serieel
    // wanneer de monteur meerdere foto's tegelijk kiest, zonder een zwakke
    // mobiele verbinding te verzadigen. Elke foto verschijnt zodra hij klaar is.
    const queue = [...files]
    const uploadFoto = async (file: File) => {
      try {
        const resized = await resizeImage(file, 1200)
        const resizedFile = new File([resized], file.name, { type: 'image/jpeg' })
        const safeName = sanitizeStorageFilename(file.name)
        const storagePath = `werkbon-fotos/${werkbon.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`
        const uploadedPath = await uploadFile(resizedFile, storagePath)
        const displayUrl = await resolveUrl(uploadedPath)
        const foto = await createWerkbonFoto({
          user_id: userId,
          werkbon_id: werkbon.id,
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
    const worker = async () => { let f; while ((f = queue.shift())) await uploadFoto(f) }
    await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker))
    if (uploaded > 0) { toast.success(`${uploaded} foto${uploaded > 1 ? "'s" : ''} toegevoegd`); bumpPreview() }
    else toast.error(`Upload mislukt: ${lastError ?? 'Onbekende fout'}`)
    e.target.value = ''
  }, [werkbon, userId, bumpPreview])

  const handleFotoVerwijderen = useCallback(async (fotoId: string) => {
    await deleteWerkbonFoto(fotoId)
    setFotos((prev) => prev.filter((f) => f.id !== fotoId))
    toast.success('Foto verwijderd')
    bumpPreview()
  }, [bumpPreview])

  const handleAfronden = useCallback(async () => {
    if (!werkbon) return
    try {
      setIsSaving(true)
      const medewerkerNaam = profile?.naam || user?.email || 'Onbekend'
      const nieuweOpmerkingen = opmerkingenMetAfronder(monteurOpmerkingen, medewerkerNaam)
      await updateWerkbon(werkbon.id, {
        status: 'afgerond',
        uren_gewerkt: urenGewerkt,
        monteur_opmerkingen: nieuweOpmerkingen,
        klant_handtekening: handtekeningData,
        klant_naam_getekend: klantNaamGetekend || undefined,
        getekend_op: handtekeningData ? new Date().toISOString() : undefined,
      })
      setWerkbon((prev) => prev ? { ...prev, status: 'afgerond' } : prev)
      setDirty(false)
      toast.success('Werkbon afgerond')

      if (werkbon.montage_afspraak_id) {
        getMontageAfspraak(werkbon.montage_afspraak_id)
          .then(async (afspraak) => {
            if (!afspraak || afspraak.status === 'afgerond') return
            await updateMontageAfspraak(werkbon.montage_afspraak_id!, { status: 'afgerond' })
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
  }, [werkbon, urenGewerkt, monteurOpmerkingen, handtekeningData, klantNaamGetekend, profile, user, setDirty, bumpPreview])

  const generatePreviewPdf = useCallback(async (): Promise<Blob> => {
    if (!werkbon) throw new Error('Werkbon niet geladen')
    const aanmakerNaam = medewerkers.find((m) => m.user_id === (werkbon.user_id || userId))?.naam
    const bedrijfsProfiel = { ...profile, primaireKleur }
    const pdfData = {
      werkbon_nummer: werkbon.werkbon_nummer,
      titel: werkbon.titel,
      datum: werkbon.datum,
      locatie_adres: werkbon.locatie_adres,
      locatie_stad: werkbon.locatie_stad,
      locatie_postcode: werkbon.locatie_postcode,
      contact_naam: werkbon.contact_naam,
      contact_telefoon: werkbon.contact_telefoon,
      toon_briefpapier: werkbon.toon_briefpapier,
      status: werkbon.status,
      uren_gewerkt: urenGewerkt,
      monteur_opmerkingen: monteurOpmerkingen,
      klant_handtekening: handtekeningData,
      klant_naam_getekend: klantNaamGetekend,
      aanmaker_naam: aanmakerNaam,
    }
    const doc = await generateWerkbonInstructiePDF(
      pdfData,
      werkbonItems,
      klant || {},
      project?.naam || '',
      bedrijfsProfiel,
      documentStyle,
      { fotos },
    )
    return doc.output('blob') as Blob
  }, [
    werkbon, werkbonItems, klant, project, fotos, profile, primaireKleur, documentStyle,
    medewerkers, userId, urenGewerkt, monteurOpmerkingen, handtekeningData, klantNaamGetekend,
  ])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" style={{ backgroundColor: '#F8F7F5' }}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !werkbon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center" style={{ backgroundColor: '#F8F7F5' }}>
        <ClipboardCheck className="h-10 w-10 mb-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
        <p className="text-[15px] font-medium" style={{ color: 'hsl(var(--foreground))' }}>
          Werkbon niet gevonden<span style={{ color: '#F15025' }}>.</span>
        </p>
        <button
          type="button"
          onClick={() => navigate('/werkbonnen')}
          className="mt-4 text-[13px] font-medium" style={{ color: '#1A535C' }}
        >
          Terug naar overzicht
        </button>
      </div>
    )
  }

  const klantLabel = klant?.bedrijfsnaam || klant?.contactpersoon || ''
  const locatieParts = [werkbon.locatie_adres, [werkbon.locatie_postcode, werkbon.locatie_stad].filter(Boolean).join(' ')].filter(Boolean)
  const locatieLabel = locatieParts.join(', ')
  const statusLabel = STATUS_LABEL[werkbon.status] || werkbon.status

  return (
    <div className="-m-3 sm:-m-4 md:-m-6 min-h-full" style={{ backgroundColor: '#F8F7F5' }}>
      <div className="px-4 py-4 pb-32 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BackButton fallbackPath="/werkbonnen" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[12px] font-mono font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {werkbon.werkbon_nummer}
              </span>
              <span className="text-[12px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {statusLabel}<span style={{ color: '#F15025' }}>.</span>
              </span>
            </div>
            <h1 className="text-[18px] font-semibold leading-tight truncate" style={{ color: 'hsl(var(--foreground))' }}>
              {werkbon.titel || klantLabel || 'Werkbon'}
            </h1>
          </div>
        </div>

        {/* PDF bekijken */}
        <button
          type="button"
          onClick={() => setShowPdfPreview(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-[13px] font-medium transition-colors active:bg-[#F1EFEB]"
          style={{ color: 'hsl(var(--foreground))', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
        >
          <FileText className="h-4 w-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          PDF bekijken
        </button>

        {/* Read-only header info */}
        <section
          className="bg-white rounded-xl p-4 space-y-3"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
        >
          {klantLabel && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Klant</div>
              <div className="text-[15px] font-medium" style={{ color: 'hsl(var(--foreground))' }}>{klantLabel}</div>
            </div>
          )}

          {(project || offerte) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {project && (
                <a
                  href={`/projecten/${project.id}`}
                  className="text-[13px] underline-offset-2 hover:underline"
                  style={{ color: '#1A535C' }}
                >
                  {project.naam}
                </a>
              )}
              {offerte && (
                <a
                  href={`/offertes/${offerte.id}`}
                  className="text-[13px] font-mono underline-offset-2 hover:underline"
                  style={{ color: '#1A535C' }}
                >
                  {offerte.nummer}
                </a>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
            {werkbon.datum && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Datum</div>
                <div className="text-[13px]" style={{ color: 'hsl(var(--foreground))' }}>{formatDateNL(werkbon.datum)}</div>
              </div>
            )}
            {locatieLabel && (
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Locatie</div>
                <div className="text-[13px]" style={{ color: 'hsl(var(--foreground))' }}>{locatieLabel}</div>
              </div>
            )}
          </div>

          {(werkbon.contact_naam || werkbon.contact_telefoon) && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Contact op locatie</div>
              <div className="text-[13px]" style={{ color: 'hsl(var(--foreground))' }}>
                {werkbon.contact_naam}
                {werkbon.contact_naam && werkbon.contact_telefoon && (
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}> · </span>
                )}
                {werkbon.contact_telefoon && (
                  <a href={`tel:${werkbon.contact_telefoon}`} style={{ color: '#1A535C' }}>
                    {werkbon.contact_telefoon}
                  </a>
                )}
              </div>
            </div>
          )}

          {klant?.contactpersoon && klant.contactpersoon !== klantLabel && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Contactpersoon</div>
              <div className="text-[13px]" style={{ color: 'hsl(var(--foreground))' }}>{klant.contactpersoon}</div>
            </div>
          )}
        </section>

        {/* Items · read-only */}
        {werkbonItems.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest px-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Items ({werkbonItems.length})
            </h2>
            <div className="space-y-3">
              {werkbonItems.map((item, idx) => {
                const heeftAfmeting = item.afmeting_breedte_mm || item.afmeting_hoogte_mm
                // Alle afbeeldingen tonen: de monteur op locatie moet elke
                // tekening/foto kunnen zien (was gekapt op 2).
                const thumbs = item.afbeeldingen
                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-xl p-4 space-y-3"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-[12px] font-mono font-semibold flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-snug whitespace-pre-wrap" style={{ color: 'hsl(var(--foreground))' }}>
                          {item.omschrijving || 'Geen omschrijving'}
                        </p>
                        {heeftAfmeting && (
                          <p className="mt-1 text-[12px] font-mono" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            {item.afmeting_breedte_mm ?? '?'} × {item.afmeting_hoogte_mm ?? '?'} mm
                          </p>
                        )}
                      </div>
                    </div>

                    {item.interne_notitie && (
                      <div
                        className="rounded-lg px-3 py-2 text-[13px] whitespace-pre-wrap"
                        style={{ backgroundColor: '#F1EFEB', color: 'hsl(var(--foreground))' }}
                      >
                        {item.interne_notitie}
                      </div>
                    )}

                    {thumbs.length > 0 && (
                      <div className={cn('grid gap-2', thumbs.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                        {thumbs.map((afb) => (
                          <button
                            key={afb.id}
                            type="button"
                            onClick={() => afb.url && setLightboxUrl(afb.url)}
                            className="block rounded-lg overflow-hidden bg-[#F1EFEB]"
                          >
                            {afb.url ? (
                              <img
                                src={afb.url}
                                alt={afb.omschrijving || ''}
                                className="w-full aspect-[4/3] object-cover"
                              />
                            ) : (
                              <div className="w-full aspect-[4/3] flex items-center justify-center text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Afbeelding niet beschikbaar
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {/* Monteur feedback · volledig bewerkbaar */}
        <section className="space-y-3">
          <WerkbonMonteurFeedback
            showUren={werkbonMonteurUren}
            showOpmerkingen={werkbonMonteurOpmerkingen}
            showFotos={werkbonMonteurFotos}
            showHandtekening={werkbonKlantHandtekening}
            readOnly={werkbon.status === 'afgerond'}
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
            onAfronden={handleAfronden}
            isSaving={isSaving}
            status={werkbon.status}
          />
        </section>
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

      {/* PDF preview */}
      {showPdfPreview && (
        <React.Suspense fallback={null}>
          <PdfPreviewDialog
            open={showPdfPreview}
            onOpenChange={setShowPdfPreview}
            title={`Werkbon ${werkbon.werkbon_nummer || 'concept'}`}
            generatePdf={generatePreviewPdf}
            refreshNonce={previewNonce}
          />
        </React.Suspense>
      )}
    </div>
  )
}

export default WerkbonMonteurView
