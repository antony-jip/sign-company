import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Maatje, MaatjeAnnotatie } from '@/types'
import {
  getLosseMaatjes,
  createMaatje,
  updateMaatje,
  getMaatjeWeergaveUrl,
} from '@/services/maatjeService'
import { comprimeerFoto, FotoVerwerkingsFout } from '@/utils/beeldCompressie'
import { MaatjeEditor } from './MaatjeEditor'

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

function MaatjeKaart({ maatje, onOpenen }: { maatje: Maatje; onOpenen: (m: Maatje) => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let actief = true
    getMaatjeWeergaveUrl(maatje.foto_render_url).then((u) => { if (actief) setUrl(u) })
    return () => { actief = false }
  }, [maatje.foto_render_url])

  return (
    <button
      type="button"
      onClick={() => onOpenen(maatje)}
      className="group block overflow-hidden rounded-xl bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
    >
      <div className="aspect-square w-full bg-[#F8F7F5]">
        {url && <img src={url} alt={maatje.titel ?? 'Maatje'} className="h-full w-full object-cover" />}
      </div>
      {maatje.titel && (
        <div className="truncate px-2.5 py-2 text-[12px] font-medium text-[#1A1A1A]">{maatje.titel}</div>
      )}
    </button>
  )
}

export function MaatjeKladblok() {
  const [maatjes, setMaatjes] = useState<Maatje[]>([])
  const [laden, setLaden] = useState(true)
  const [editor, setEditor] = useState<EditorState | null>(null)
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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.3px] text-[#1A1A1A]">Maatjes</h1>
          <p className="mt-1 text-[13px] text-[#6B6B66]">Kladblok met losse maatjes, nog niet gekoppeld.</p>
        </div>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#F15025] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(241,80,37,0.3)] transition-transform active:scale-[0.97]"
        >
          <Camera className="h-4 w-4" strokeWidth={2} />
          Foto maken
        </button>
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
            <MaatjeKaart key={m.id} maatje={m} onOpenen={opMaatjeOpenen} />
          ))}
        </div>
      )}

      {editor && (
        <MaatjeEditor
          fotoBron={editor.fotoBron}
          beginAnnotaties={editor.annotaties}
          beginTitel={editor.titel}
          onBewaren={bewaarVanuitEditor}
          onAnnuleren={() => setEditor(null)}
        />
      )}
    </div>
  )
}
