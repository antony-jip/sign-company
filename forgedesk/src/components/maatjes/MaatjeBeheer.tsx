import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Check, Trash2, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '@/utils/logger'
import { confirm } from '@/components/shared/ConfirmDialog'
import { tik } from '@/utils/haptics'
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { MedewerkerFilterCombobox } from '@/components/shared/MedewerkerFilterCombobox'
import type { Maatje, MaatjeAnnotatie } from '@/types'
import {
  getLosseMaatjes,
  updateMaatje,
  koppelMaatjes,
  ontkoppelMaatjes,
  verwijderMaatje,
  getMaatjeWeergaveUrl,
} from '@/services/maatjeService'
import { MaatjeEditor } from './MaatjeEditor'
import { MaatjeKoppelSheet } from './MaatjeKoppelSheet'

interface EditorState {
  fotoBron: string
  annotaties: MaatjeAnnotatie[]
  titel: string | null
  maatjeId: string
}

function MaatjeBeheerKaart({
  maatje,
  maker,
  geselecteerd,
  onToggle,
  onOpenen,
}: {
  maatje: Maatje
  maker: string
  geselecteerd: boolean
  onToggle: (id: string) => void
  onOpenen: (m: Maatje) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let actief = true
    getMaatjeWeergaveUrl(maatje.foto_render_url).then((u) => { if (actief) setUrl(u) })
    return () => { actief = false }
  }, [maatje.foto_render_url])

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
        geselecteerd && 'ring-2 ring-[#F15025]',
      )}
    >
      <button
        type="button"
        onClick={() => onOpenen(maatje)}
        className="block w-full text-left"
      >
        <div className="aspect-square w-full bg-[#F8F7F5]">
          {url && <img src={url} alt={maatje.titel ?? 'Maatje'} className="h-full w-full object-cover animate-in fade-in-0 duration-500" />}
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <div className="min-w-0">
          {maatje.titel && <div className="truncate text-[12px] font-semibold text-[#1A1A1A]">{maatje.titel}</div>}
          <div className="truncate text-[11px] text-[#9B9B95]">{maker}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggle(maatje.id)}
        aria-label={geselecteerd ? 'Deselecteren' : 'Selecteren'}
        className={cn(
          'absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
          geselecteerd ? 'border-[#F15025] bg-[#F15025] text-white' : 'border-white bg-black/25 text-transparent hover:bg-black/35',
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </button>
    </div>
  )
}

export function MaatjeBeheer() {
  const { medewerkers } = useMedewerkers()
  const [maatjes, setMaatjes] = useState<Maatje[]>([])
  const [laden, setLaden] = useState(true)
  const [filterNaam, setFilterNaam] = useState('')
  const [selectie, setSelectie] = useState<Set<string>>(new Set())
  const [koppelOpen, setKoppelOpen] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)

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

  const naamVanMaker = useCallback(
    (userId: string | null) => medewerkers.find((m) => m.user_id === userId)?.naam ?? 'Onbekend',
    [medewerkers],
  )

  const filterUserId = useMemo(
    () => (filterNaam ? medewerkers.find((m) => m.naam === filterNaam)?.user_id ?? null : null),
    [filterNaam, medewerkers],
  )

  const zichtbaar = useMemo(
    () => (filterUserId ? maatjes.filter((m) => m.aangemaakt_door === filterUserId) : maatjes),
    [maatjes, filterUserId],
  )

  const toggle = useCallback((id: string) => {
    tik(8)
    setSelectie((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const openen = useCallback(async (m: Maatje) => {
    const url = await getMaatjeWeergaveUrl(m.foto_origineel_url)
    if (!url) { toast.error('Kon foto niet laden'); return }
    setEditor({ fotoBron: url, annotaties: m.annotaties ?? [], titel: m.titel, maatjeId: m.id })
  }, [])

  const bewaarVanuitEditor = useCallback(async (data: { annotaties: MaatjeAnnotatie[]; titel: string | null; render: Blob }) => {
    if (!editor) return
    await updateMaatje(editor.maatjeId, { titel: data.titel, annotaties: data.annotaties }, data.render)
    toast.success(<span>Opgeslagen<span className="text-[#F15025]">.</span></span>)
    setEditor(null)
    await laadMaatjes()
  }, [editor, laadMaatjes])

  const koppelVanuitEditor = useCallback(async (data: { annotaties: MaatjeAnnotatie[]; titel: string | null; render: Blob }) => {
    if (!editor) return
    await updateMaatje(editor.maatjeId, { titel: data.titel, annotaties: data.annotaties }, data.render)
    const id = editor.maatjeId
    setEditor(null)
    await laadMaatjes()
    setSelectie(new Set([id]))
    setKoppelOpen(true)
  }, [editor, laadMaatjes])

  const koppelGeselecteerde = useCallback(async (projectId: string) => {
    const ids = Array.from(selectie)
    setMaatjes((prev) => prev.filter((m) => !ids.includes(m.id)))
    setKoppelOpen(false)
    setSelectie(new Set())
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
  }, [selectie, laadMaatjes])

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
    setSelectie(new Set())
    try {
      await Promise.all(ids.map((id) => verwijderMaatje(id)))
      tik(25)
      toast.success(<span>{ids.length} verwijderd<span className="text-[#F15025]">.</span></span>)
    } catch (err) {
      logger.error('Verwijderen mislukt:', err)
      toast.error('Verwijderen mislukt')
      await laadMaatjes()
    }
  }, [selectie, laadMaatjes])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-1 flex items-start justify-between gap-4">
        <h1 className="text-[26px] font-extrabold tracking-[-0.3px] text-[#1A1A1A]">Maatjes</h1>
      </div>
      <p className="mb-6 text-[13px] text-[#6B6B66]">
        Beheer alle losse maatjes per medewerker en koppel ze alsnog aan een project.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <MedewerkerFilterCombobox
          medewerkers={medewerkers}
          value={filterNaam}
          onChange={setFilterNaam}
          allLabel="Alle medewerkers"
          className="w-64"
        />
        <span className="text-[13px] text-[#9B9B95]">
          {zichtbaar.length} los{zichtbaar.length === 1 ? '' : 'se'} maatje{zichtbaar.length === 1 ? '' : 's'}
        </span>
        {selectie.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#1A535C]">{selectie.size} geselecteerd</span>
            <button
              type="button"
              onClick={verwijderGeselecteerde}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#EBEBEB] px-3 py-2 text-[13px] font-medium text-[#6B6B66] hover:bg-[#F8F7F5]"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              Verwijderen
            </button>
            <button
              type="button"
              onClick={() => setKoppelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F15025] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(241,80,37,0.3)]"
            >
              <Link2 className="h-4 w-4" strokeWidth={2} />
              Koppel aan project
            </button>
          </div>
        )}
      </div>

      {laden ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square w-full animate-pulse rounded-xl bg-[#EFEDEA]" />
          ))}
        </div>
      ) : zichtbaar.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[14px] text-[#6B6B66]">Geen losse maatjes{filterNaam ? ` van ${filterNaam}` : ''}.</p>
          <p className="mt-1 text-[13px] text-[#9B9B95]">Maatjes maak je op de telefoon; hier koppel je ze alsnog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {zichtbaar.map((m, i) => (
            <div
              key={m.id}
              className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-300"
              style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}
            >
              <MaatjeBeheerKaart
                maatje={m}
                maker={naamVanMaker(m.aangemaakt_door)}
                geselecteerd={selectie.has(m.id)}
                onToggle={toggle}
                onOpenen={openen}
              />
            </div>
          ))}
        </div>
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
