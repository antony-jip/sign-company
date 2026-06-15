import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Check, Link2, Trash2, CloudOff, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '@/utils/logger'
import { confirm } from '@/components/shared/ConfirmDialog'
import { tik } from '@/utils/haptics'
import type { Maatje, MaatjeAnnotatie } from '@/types'
import {
  getLosseMaatjes,
  createMaatje,
  updateMaatje,
  koppelMaatjes,
  ontkoppelMaatjes,
  verwijderMaatje,
  getMaatjeWeergaveUrl,
} from '@/services/maatjeService'
import { getCached, fetchQuery } from '@/lib/queryCache'
import { comprimeerFoto, FotoVerwerkingsFout } from '@/utils/beeldCompressie'
import { wachtrijToevoegen, wachtrijAlles, wachtrijVerwijderen } from '@/utils/maatjeOfflineQueue'
import { MaatjeEditor } from './MaatjeEditor'
import { MaatjeKoppelSheet } from './MaatjeKoppelSheet'

interface EditorState {
  fotoBron: Blob | string
  annotaties: MaatjeAnnotatie[]
  titel: string | null
  maatjeId?: string
}

function meldOpgeslagen() {
  tik(12)
  toast.success(
    <span>Opgeslagen<span className="text-[#F15025]">.</span></span>,
  )
}

function MaatjeKaart({
  maatje,
  selectieModus,
  geselecteerd,
  onKlik,
}: {
  maatje: Maatje
  selectieModus: boolean
  geselecteerd: boolean
  onKlik: (m: Maatje) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let actief = true
    getMaatjeWeergaveUrl(maatje.foto_render_url).then((u) => { if (actief) setUrl(u) })
    return () => { actief = false }
  }, [maatje.foto_render_url])

  return (
    <button
      type="button"
      onClick={() => onKlik(maatje)}
      className={cn(
        'group relative block overflow-hidden rounded-xl bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] active:scale-[0.98]',
        geselecteerd && 'ring-2 ring-[#F15025]',
      )}
    >
      <div className="aspect-square w-full bg-[#F8F7F5]">
        {url && <img src={url} alt={maatje.titel ?? 'Maatje'} className="h-full w-full object-cover animate-in fade-in-0 duration-500" />}
      </div>
      {maatje.titel && (
        <div className="truncate px-2.5 py-2 text-[12px] font-medium text-[#1A1A1A]">{maatje.titel}</div>
      )}
      {selectieModus && (
        <span
          className={cn(
            'absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
            geselecteerd ? 'border-[#F15025] bg-[#F15025] text-white' : 'border-white bg-black/20 text-transparent',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

export function MaatjeKladblok() {
  const [maatjes, setMaatjes] = useState<Maatje[]>(() => getCached<Maatje[]>('losseMaatjes') ?? [])
  const [laden, setLaden] = useState(() => getCached('losseMaatjes') === undefined)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [selectieModus, setSelectieModus] = useState(false)
  const [selectie, setSelectie] = useState<Set<string>>(new Set())
  const [koppelOpen, setKoppelOpen] = useState(false)
  const [wachtAantal, setWachtAantal] = useState(0)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galerijInputRef = useRef<HTMLInputElement>(null)
  // Onthoudt of de laatste foto van de camera of uit de bibliotheek kwam, zodat
  // we na opslaan alleen bij camera-gebruik direct de volgende opname openen.
  const laatsteBronRef = useRef<'camera' | 'galerij'>('camera')

  const laadMaatjes = useCallback(async () => {
    try {
      setMaatjes(await fetchQuery('losseMaatjes', getLosseMaatjes))
    } catch (err) {
      logger.error('Maatjes laden mislukt:', err)
      toast.error('Kon maatjes niet laden')
    } finally {
      setLaden(false)
    }
  }, [])

  const verversWachtrij = useCallback(async () => {
    setWachtAantal((await wachtrijAlles()).length)
  }, [])

  const flushWachtrij = useCallback(async () => {
    const items = await wachtrijAlles()
    if (items.length === 0) return
    let geslaagd = 0
    for (const item of items) {
      try {
        await createMaatje({ titel: item.titel, annotaties: item.annotaties }, item.origineel, item.render)
        await wachtrijVerwijderen(item.id)
        geslaagd++
      } catch (err) {
        logger.error('Upload uit wachtrij mislukt:', err)
        break // waarschijnlijk weer offline — stoppen
      }
    }
    await verversWachtrij()
    if (geslaagd > 0) { tik(12); await laadMaatjes() }
  }, [laadMaatjes, verversWachtrij])

  useEffect(() => { laadMaatjes() }, [laadMaatjes])

  useEffect(() => {
    verversWachtrij()
    const flushAlsOnline = () => { if (typeof navigator === 'undefined' || navigator.onLine) flushWachtrij() }
    flushAlsOnline()
    window.addEventListener('online', flushAlsOnline)
    return () => window.removeEventListener('online', flushAlsOnline)
  }, [verversWachtrij, flushWachtrij])

  const opCameraBestand = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const blob = await comprimeerFoto(file)
      setEditor({ fotoBron: blob, annotaties: [], titel: null })
    } catch (err) {
      if (err instanceof FotoVerwerkingsFout) {
        toast.error('Kon deze foto niet verwerken. Probeer een andere opname.')
      } else {
        logger.error('Foto verwerken mislukt:', err)
        toast.error('Foto verwerken mislukt')
      }
    }
  }, [])

  const opMaatjeOpenen = useCallback(async (m: Maatje) => {
    const url = await getMaatjeWeergaveUrl(m.foto_origineel_url)
    if (!url) {
      toast.error('Kon foto niet laden')
      return
    }
    setEditor({ fotoBron: url, annotaties: m.annotaties ?? [], titel: m.titel, maatjeId: m.id })
  }, [])

  const verlaatSelectie = useCallback(() => {
    setSelectieModus(false)
    setSelectie(new Set())
  }, [])

  const opKaartKlik = useCallback((m: Maatje) => {
    if (selectieModus) {
      tik(8)
      setSelectie((prev) => {
        const next = new Set(prev)
        if (next.has(m.id)) next.delete(m.id)
        else next.add(m.id)
        return next
      })
    } else {
      opMaatjeOpenen(m)
    }
  }, [selectieModus, opMaatjeOpenen])

  const koppelGeselecteerde = useCallback(async (projectId: string) => {
    const ids = Array.from(selectie)
    // Optimistisch: haal ze meteen uit het kladblok-zicht.
    setMaatjes((prev) => prev.filter((m) => !ids.includes(m.id)))
    setKoppelOpen(false)
    verlaatSelectie()
    try {
      await koppelMaatjes(ids, projectId)
      tik([12, 40, 12])
      toast.success(
        <span>{ids.length} maatje{ids.length > 1 ? 's' : ''} gekoppeld<span className="text-[#F15025]">.</span></span>,
        {
          action: {
            label: 'Ongedaan maken',
            onClick: async () => {
              try { await ontkoppelMaatjes(ids) } catch (e) { logger.error('Ontkoppelen mislukt:', e) }
              await laadMaatjes()
            },
          },
        },
      )
    } catch (err) {
      logger.error('Koppelen mislukt:', err)
      const reden = err instanceof Error ? err.message : 'onbekende fout'
      toast.error(`Koppelen mislukt: ${reden}`)
      await laadMaatjes()
    }
  }, [selectie, verlaatSelectie, laadMaatjes])

  const verwijderGeselecteerde = useCallback(async () => {
    const ids = Array.from(selectie)
    if (ids.length === 0) return
    const ok = await confirm({
      title: 'Maatjes verwijderen',
      message: `${ids.length} maatje${ids.length > 1 ? 's' : ''} definitief verwijderen? De foto's gaan verloren.`,
      variant: 'destructive',
      confirmLabel: 'Verwijderen',
    })
    if (!ok) return
    setMaatjes((prev) => prev.filter((m) => !ids.includes(m.id)))
    verlaatSelectie()
    try {
      await Promise.all(ids.map((id) => verwijderMaatje(id)))
      tik(25)
      toast.success(<span>{ids.length} verwijderd<span className="text-[#F15025]">.</span></span>)
    } catch (err) {
      logger.error('Verwijderen mislukt:', err)
      toast.error('Verwijderen mislukt')
      await laadMaatjes()
    }
  }, [selectie, verlaatSelectie, laadMaatjes])

  const bewaarVanuitEditor = useCallback(async (data: { annotaties: MaatjeAnnotatie[]; titel: string | null; render: Blob }) => {
    const huidig = editor
    if (!huidig) return
    if (huidig.maatjeId) {
      await updateMaatje(huidig.maatjeId, { titel: data.titel, annotaties: data.annotaties }, data.render)
      meldOpgeslagen()
      setEditor(null)
    } else {
      const origineel = huidig.fotoBron as Blob
      try {
        await createMaatje({ titel: data.titel, annotaties: data.annotaties }, origineel, data.render)
        meldOpgeslagen()
      } catch (err) {
        // Offline? Bewaar lokaal en upload zodra er weer verbinding is.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          await wachtrijToevoegen({
            id: crypto.randomUUID(),
            titel: data.titel,
            annotaties: data.annotaties,
            origineel,
            render: data.render,
            aangemaakt: Date.now(),
          })
          tik(12)
          toast.success(<span>Opgeslagen — upload zodra je online bent<span className="text-[#F15025]">.</span></span>)
          await verversWachtrij()
        } else {
          throw err
        }
      }
      setEditor(null)
      // Bewaren → bij camera-gebruik direct de volgende opname openen.
      // Bij een import uit de bibliotheek niet (anders popt de camera ongevraagd op).
      if (laatsteBronRef.current === 'camera') {
        setTimeout(() => cameraInputRef.current?.click(), 0)
      }
    }
    await laadMaatjes()
  }, [editor, laadMaatjes, verversWachtrij])

  const koppelVanuitEditor = useCallback(async (data: { annotaties: MaatjeAnnotatie[]; titel: string | null; render: Blob }) => {
    const huidig = editor
    if (!huidig) return
    let id: string
    if (huidig.maatjeId) {
      await updateMaatje(huidig.maatjeId, { titel: data.titel, annotaties: data.annotaties }, data.render)
      id = huidig.maatjeId
    } else {
      const nieuw = await createMaatje({ titel: data.titel, annotaties: data.annotaties }, huidig.fotoBron as Blob, data.render)
      id = nieuw.id
    }
    setEditor(null)
    await laadMaatjes()
    setSelectie(new Set([id]))
    setKoppelOpen(true)
  }, [editor, laadMaatjes])

  return (
    <div className={cn('mx-auto w-full max-w-4xl px-4 py-6 md:px-8', selectieModus && 'pb-24')}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.3px] text-[#1A1A1A]">Maatjes</h1>
          <p className="mt-1 text-[13px] text-[#6B6B66]">Kladblok met losse maatjes, nog niet gekoppeld.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {maatjes.length > 0 && !selectieModus && (
            <button
              type="button"
              onClick={() => setSelectieModus(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A535C]/30 px-3 py-2.5 text-[13px] font-semibold text-[#1A535C] transition-colors hover:bg-[#1A535C]/[0.06]"
            >
              <Link2 className="h-4 w-4" strokeWidth={2} />
              Koppelen
            </button>
          )}
          <button
            type="button"
            onClick={() => { laatsteBronRef.current = 'galerij'; galerijInputRef.current?.click() }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A535C]/30 px-3 py-2.5 text-[13px] font-semibold text-[#1A535C] transition-colors hover:bg-[#1A535C]/[0.06]"
          >
            <ImagePlus className="h-4 w-4" strokeWidth={2} />
            Importeren
          </button>
          <button
            type="button"
            onClick={() => { laatsteBronRef.current = 'camera'; cameraInputRef.current?.click() }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F15025] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(241,80,37,0.3)] transition-transform active:scale-[0.97]"
          >
            <Camera className="h-4 w-4" strokeWidth={2} />
            Foto maken
          </button>
        </div>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={opCameraBestand}
      />
      {/* Zelfde verwerking, maar zonder capture → opent de fotobibliotheek i.p.v. de camera */}
      <input
        ref={galerijInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={opCameraBestand}
      />

      {wachtAantal > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#FDF1E8] px-3 py-2.5 text-[13px] font-medium text-[#9A5A2E]">
          <CloudOff className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
          {wachtAantal} foto{wachtAantal > 1 ? "'s" : ''} wacht op upload. Wordt automatisch verstuurd zodra je online bent.
        </div>
      )}

      {laden ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square w-full animate-pulse rounded-xl bg-[#EFEDEA]" />
          ))}
        </div>
      ) : maatjes.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[14px] text-[#6B6B66]">Nog geen maatjes in het kladblok.</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => { laatsteBronRef.current = 'camera'; cameraInputRef.current?.click() }}
              className="text-[14px] font-semibold text-[#F15025] underline underline-offset-2"
            >
              Maak je eerste foto
            </button>
            <span className="text-[13px] text-[#9B9B96]">of</span>
            <button
              type="button"
              onClick={() => { laatsteBronRef.current = 'galerij'; galerijInputRef.current?.click() }}
              className="text-[14px] font-semibold text-[#1A535C] underline underline-offset-2"
            >
              importeer uit je bibliotheek
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {maatjes.map((m, i) => (
            <div
              key={m.id}
              className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-300"
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <MaatjeKaart
                maatje={m}
                selectieModus={selectieModus}
                geselecteerd={selectie.has(m.id)}
                onKlik={opKaartKlik}
              />
            </div>
          ))}
        </div>
      )}

      {selectieModus && createPortal(
        <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-[60] flex items-center justify-between gap-3 bg-[#1A535C] px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom-4 duration-200">
          <button
            type="button"
            onClick={verlaatSelectie}
            className="text-[13px] font-medium text-white/80 hover:text-white"
          >
            Annuleren
          </button>
          <span className="text-[13px] font-medium text-white">
            {selectie.size === 0 ? 'Tik maatjes aan' : `${selectie.size} geselecteerd`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={verwijderGeselecteerde}
              disabled={selectie.size === 0}
              aria-label="Verwijderen"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setKoppelOpen(true)}
              disabled={selectie.size === 0}
              className="rounded-lg bg-[#F15025] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              Koppel aan project
            </button>
          </div>
        </div>,
        document.body,
      )}

      {koppelOpen && (
        <MaatjeKoppelSheet
          aantal={selectie.size}
          onKoppel={koppelGeselecteerde}
          onSluiten={() => setKoppelOpen(false)}
        />
      )}

      {editor && (
        <MaatjeEditor
          fotoBron={editor.fotoBron}
          beginAnnotaties={editor.annotaties}
          beginTitel={editor.titel}
          onBewaren={bewaarVanuitEditor}
          onKoppelen={koppelVanuitEditor}
          onAnnuleren={() => setEditor(null)}
        />
      )}
    </div>
  )
}
