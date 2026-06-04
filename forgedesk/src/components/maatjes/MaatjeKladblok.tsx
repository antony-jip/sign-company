import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Check, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '@/utils/logger'
import type { Maatje, MaatjeAnnotatie } from '@/types'
import {
  getLosseMaatjes,
  createMaatje,
  updateMaatje,
  koppelMaatjes,
  getMaatjeWeergaveUrl,
} from '@/services/maatjeService'
import { comprimeerFoto, FotoVerwerkingsFout } from '@/utils/beeldCompressie'
import { MaatjeEditor } from './MaatjeEditor'
import { MaatjeKoppelSheet } from './MaatjeKoppelSheet'

interface EditorState {
  fotoBron: Blob | string
  annotaties: MaatjeAnnotatie[]
  titel: string | null
  maatjeId?: string
}

function meldOpgeslagen() {
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
        'group relative block overflow-hidden rounded-xl bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
        geselecteerd && 'ring-2 ring-[#F15025]',
      )}
    >
      <div className="aspect-square w-full bg-[#F8F7F5]">
        {url && <img src={url} alt={maatje.titel ?? 'Maatje'} className="h-full w-full object-cover" />}
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
  const [maatjes, setMaatjes] = useState<Maatje[]>([])
  const [laden, setLaden] = useState(true)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [selectieModus, setSelectieModus] = useState(false)
  const [selectie, setSelectie] = useState<Set<string>>(new Set())
  const [koppelOpen, setKoppelOpen] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const laadMaatjes = useCallback(async () => {
    try {
      setMaatjes(await getLosseMaatjes())
    } catch (err) {
      logger.error('Maatjes laden mislukt:', err)
      toast.error('Kon maatjes niet laden')
    } finally {
      setLaden(false)
    }
  }, [])

  useEffect(() => { laadMaatjes() }, [laadMaatjes])

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
    try {
      await koppelMaatjes(ids, projectId)
      toast.success(
        <span>{ids.length} maatje{ids.length > 1 ? 's' : ''} gekoppeld<span className="text-[#F15025]">.</span></span>,
      )
      setKoppelOpen(false)
      verlaatSelectie()
      await laadMaatjes()
    } catch (err) {
      logger.error('Koppelen mislukt:', err)
      const reden = err instanceof Error ? err.message : 'onbekende fout'
      toast.error(`Koppelen mislukt: ${reden}`)
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
      await createMaatje({ titel: data.titel, annotaties: data.annotaties }, huidig.fotoBron as Blob, data.render)
      meldOpgeslagen()
      setEditor(null)
      // Bewaren → terug naar camera voor de volgende opname
      setTimeout(() => cameraInputRef.current?.click(), 0)
    }
    await laadMaatjes()
  }, [editor, laadMaatjes])

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
            onClick={() => cameraInputRef.current?.click()}
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

      {laden ? (
        <p className="py-16 text-center text-[13px] text-[#9B9B95]">Laden...</p>
      ) : maatjes.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[14px] text-[#6B6B66]">Nog geen maatjes in het kladblok.</p>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="mt-2 text-[14px] font-semibold text-[#F15025] underline underline-offset-2"
          >
            Maak je eerste foto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {maatjes.map((m) => (
            <MaatjeKaart
              key={m.id}
              maatje={m}
              selectieModus={selectieModus}
              geselecteerd={selectie.has(m.id)}
              onKlik={opKaartKlik}
            />
          ))}
        </div>
      )}

      {selectieModus && createPortal(
        <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-[60] flex items-center justify-between gap-3 bg-[#1A535C] px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.15)]">
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
          <button
            type="button"
            onClick={() => setKoppelOpen(true)}
            disabled={selectie.size === 0}
            className="rounded-lg bg-[#F15025] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            Koppel aan project
          </button>
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
