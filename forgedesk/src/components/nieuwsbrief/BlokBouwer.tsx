import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Heading1, Type, Image as ImageIcon, MousePointerClick, LayoutTemplate, Columns2, Quote, Sparkles as SparklesIcon,
  Minus, MoveVertical, PanelTop, PanelBottom, Code2, GripVertical, ChevronUp, ChevronDown, Copy, Trash2, Plus, Undo2, Redo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlokInspector } from './BlokInspector'
import { resolveMergeTags } from './nieuwsbriefShell'
import {
  type Blok, type BlokType, type NieuwsbriefDocument, type NieuwsbriefStijl,
  BLOK_LABEL, BLOK_OMSCHRIJVING, BLOK_VOLGORDE, BLOK_AFSTAND, maakBlok, kloonBlok, renderBlok,
} from './nieuwsbriefBlokken'

const BLOK_ICOON: Record<BlokType, typeof Type> = {
  header: PanelTop, kop: Heading1, tekst: Type, afbeelding: ImageIcon, knop: MousePointerClick, afbeelding_tekst: LayoutTemplate,
  kolommen: Columns2, quote: Quote, highlight: SparklesIcon, lijn: Minus, ruimte: MoveVertical, footer: PanelBottom, html: Code2,
}

const MIME_NIEUW = 'application/x-nieuwsbrief-blok'
const MIME_VERPLAATS = 'application/x-nieuwsbrief-verplaats'

interface Props {
  document: NieuwsbriefDocument
  onChange: (doc: NieuwsbriefDocument) => void
  disabled?: boolean
}

function useGeschiedenis(doc: NieuwsbriefDocument, onChange: (d: NieuwsbriefDocument) => void) {
  const verleden = useRef<NieuwsbriefDocument[]>([])
  const toekomst = useRef<NieuwsbriefDocument[]>([])
  const [, forceer] = useState(0)

  const zet = useCallback((volgende: NieuwsbriefDocument, opties: { samenvoegen?: boolean } = {}) => {
    if (!opties.samenvoegen) {
      verleden.current = [...verleden.current.slice(-49), doc]
      toekomst.current = []
    }
    onChange(volgende)
    forceer(n => n + 1)
  }, [doc, onChange])

  const undo = useCallback(() => {
    const vorige = verleden.current.pop()
    if (!vorige) return
    toekomst.current.push(doc)
    onChange(vorige)
    forceer(n => n + 1)
  }, [doc, onChange])

  const redo = useCallback(() => {
    const volgende = toekomst.current.pop()
    if (!volgende) return
    verleden.current.push(doc)
    onChange(volgende)
    forceer(n => n + 1)
  }, [doc, onChange])

  return { zet, undo, redo, kanUndo: verleden.current.length > 0, kanRedo: toekomst.current.length > 0 }
}

export function BlokBouwer({ document: doc, onChange, disabled }: Props) {
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null)
  const [sleepDoel, setSleepDoel] = useState<number | null>(null)
  const [sleeptBlok, setSleeptBlok] = useState<string | null>(null)
  const [paletOpen, setPaletOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { zet, undo, redo, kanUndo, kanRedo } = useGeschiedenis(doc, onChange)

  const blokken = doc.blokken
  const actief = useMemo(() => blokken.find(b => b.id === geselecteerd) ?? null, [blokken, geselecteerd])
  const bewerkbaar = !disabled

  const vervangBlokken = useCallback((nieuw: Blok[], samenvoegen = false) => zet({ ...doc, blokken: nieuw }, { samenvoegen }), [doc, zet])

  const voegToe = useCallback((type: BlokType, index?: number) => {
    const blok = maakBlok(type)
    const i = index ?? (geselecteerd ? blokken.findIndex(b => b.id === geselecteerd) + 1 : blokken.length)
    const nieuw = [...blokken]
    nieuw.splice(i < 0 ? blokken.length : i, 0, blok)
    vervangBlokken(nieuw)
    setGeselecteerd(blok.id)
    setInspectorOpen(true)
    setPaletOpen(false)
    requestAnimationFrame(() => canvasRef.current?.querySelector<HTMLElement>(`[data-blok-id="${blok.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [blokken, geselecteerd, vervangBlokken])

  const verplaats = useCallback((id: string, naarIndex: number) => {
    const van = blokken.findIndex(b => b.id === id)
    if (van < 0) return
    const nieuw = [...blokken]
    const [blok] = nieuw.splice(van, 1)
    const doel = naarIndex > van ? naarIndex - 1 : naarIndex
    nieuw.splice(doel, 0, blok)
    vervangBlokken(nieuw)
  }, [blokken, vervangBlokken])

  const schuif = useCallback((id: string, richting: -1 | 1) => {
    const i = blokken.findIndex(b => b.id === id)
    const j = i + richting
    if (i < 0 || j < 0 || j >= blokken.length) return
    const nieuw = [...blokken]
    ;[nieuw[i], nieuw[j]] = [nieuw[j], nieuw[i]]
    vervangBlokken(nieuw)
  }, [blokken, vervangBlokken])

  const dupliceer = useCallback((id: string) => {
    const i = blokken.findIndex(b => b.id === id)
    if (i < 0) return
    const kopie = kloonBlok(blokken[i])
    const nieuw = [...blokken]
    nieuw.splice(i + 1, 0, kopie)
    vervangBlokken(nieuw)
    setGeselecteerd(kopie.id)
  }, [blokken, vervangBlokken])

  const verwijder = useCallback((id: string) => {
    vervangBlokken(blokken.filter(b => b.id !== id))
    if (geselecteerd === id) { setGeselecteerd(null); setInspectorOpen(false) }
  }, [blokken, geselecteerd, vervangBlokken])

  // Veldwijzigingen in de inspector komen per toetsaanslag binnen; die
  // voegen we samen tot één undo-stap per blok-selectie.
  const laatsteBewerkt = useRef<string | null>(null)
  const werkBlokBij = useCallback((blok: Blok) => {
    const samenvoegen = laatsteBewerkt.current === blok.id
    laatsteBewerkt.current = blok.id
    vervangBlokken(blokken.map(b => (b.id === blok.id ? blok : b)), samenvoegen)
  }, [blokken, vervangBlokken])
  useEffect(() => { laatsteBewerkt.current = null }, [geselecteerd])

  const werkStijlBij = useCallback((stijl: NieuwsbriefStijl) => zet({ ...doc, stijl }, { samenvoegen: laatsteBewerkt.current === '__stijl' }), [doc, zet])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handler = (e: KeyboardEvent) => {
      if (!bewerkbaar) return
      const doelwit = e.target as HTMLElement
      if (doelwit.closest('input, textarea, [contenteditable="true"], select')) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
      if (!geselecteerd) return
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); verwijder(geselecteerd) }
      if (e.key === 'Escape') { setGeselecteerd(null); setInspectorOpen(false) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); dupliceer(geselecteerd) }
      if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); schuif(geselecteerd, -1) }
      if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); schuif(geselecteerd, 1) }
    }
    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [bewerkbaar, geselecteerd, verwijder, dupliceer, schuif, undo, redo])

  const handleDropOp = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault()
    setSleepDoel(null)
    setSleeptBlok(null)
    if (!bewerkbaar) return
    const nieuwType = e.dataTransfer.getData(MIME_NIEUW) as BlokType
    const verplaatsId = e.dataTransfer.getData(MIME_VERPLAATS)
    if (nieuwType && nieuwType in BLOK_LABEL) voegToe(nieuwType, index)
    else if (verplaatsId) verplaats(verplaatsId, index)
  }, [bewerkbaar, voegToe, verplaats])

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    if (!bewerkbaar) return
    const soorten = Array.from(e.dataTransfer.types)
    if (!soorten.includes(MIME_NIEUW) && !soorten.includes(MIME_VERPLAATS)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = soorten.includes(MIME_NIEUW) ? 'copy' : 'move'
    if (sleepDoel !== index) setSleepDoel(index)
  }, [bewerkbaar, sleepDoel])

  const dropZone = (index: number) => (
    <div
      key={`drop-${index}`}
      data-drop-index={index}
      onDragOver={e => handleDragOver(index, e)}
      onDragLeave={() => setSleepDoel(prev => (prev === index ? null : prev))}
      onDrop={e => handleDropOp(index, e)}
      className={cn('group/drop relative z-10 transition-all', sleeptBlok || sleepDoel != null ? 'h-6 -my-3' : 'h-3 -my-1.5')}
    >
      <div className={cn('pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-flame transition-opacity', sleepDoel === index ? 'opacity-100' : 'opacity-0')} />
      {bewerkbaar && sleepDoel == null && !sleeptBlok && (
        <button
          type="button"
          onClick={() => { setPaletOpen(true); setInvoegIndex(index) }}
          className="absolute left-1/2 top-1/2 z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-sm transition-all hover:border-flame hover:text-flame focus-visible:opacity-100 group-hover/drop:opacity-100"
          aria-label="Blok invoegen"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )

  const [invoegIndex, setInvoegIndex] = useState<number | null>(null)

  const palet = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="text-[14px] font-bold text-foreground">Blokken<span className="text-flame">.</span></span>
        <span className="ml-auto text-[11px] text-muted-foreground">sleep of klik</span>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {BLOK_VOLGORDE.map(type => {
          const Icon = BLOK_ICOON[type]
          return (
            <button
              key={type}
              type="button"
              draggable={bewerkbaar}
              disabled={!bewerkbaar}
              onDragStart={e => { e.dataTransfer.setData(MIME_NIEUW, type); e.dataTransfer.effectAllowed = 'copy' }}
              onDragEnd={() => setSleepDoel(null)}
              onClick={() => voegToe(type, invoegIndex ?? undefined)}
              className="group flex w-full cursor-grab items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition-all hover:border-border hover:bg-background active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-petrol/[0.08] text-petrol transition-colors group-hover:bg-petrol group-hover:text-white dark:bg-white/[0.06] dark:text-foreground">
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-foreground">{BLOK_LABEL[type]}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{BLOK_OMSCHRIJVING[type]}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const canvas = (
    <div
      ref={canvasRef}
      tabIndex={0}
      className="nb-canvas flex min-h-0 flex-1 flex-col overflow-y-auto outline-none"
      style={{ background: doc.stijl.achtergrond }}
      onClick={e => { if (e.target === e.currentTarget) { setGeselecteerd(null); setInspectorOpen(false) } }}
    >
      <div className="sticky top-0 z-20 flex items-center gap-1 border-b border-black/5 bg-white/70 px-3 py-1.5 backdrop-blur dark:bg-black/20">
        <button type="button" onClick={undo} disabled={!kanUndo || !bewerkbaar} title="Ongedaan maken (Cmd+Z)" className="rounded-md p-1.5 text-[#57574F] transition-colors hover:bg-black/5 disabled:opacity-30 dark:text-white/70"><Undo2 className="h-4 w-4" /></button>
        <button type="button" onClick={redo} disabled={!kanRedo || !bewerkbaar} title="Opnieuw (Cmd+Shift+Z)" className="rounded-md p-1.5 text-[#57574F] transition-colors hover:bg-black/5 disabled:opacity-30 dark:text-white/70"><Redo2 className="h-4 w-4" /></button>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-[#9B9B95]">{blokken.length} {blokken.length === 1 ? 'blok' : 'blokken'}</span>
        <button type="button" onClick={() => setPaletOpen(true)} className="ml-2 inline-flex items-center gap-1 rounded-md bg-petrol px-2.5 py-1 text-[12px] font-semibold text-white lg:hidden"><Plus className="h-3.5 w-3.5" /> Blok</button>
      </div>

      <div className="mx-auto w-full max-w-[600px] px-3 py-6" onClick={e => { if (e.target === e.currentTarget) { setGeselecteerd(null); setInspectorOpen(false) } }}>
        <div
          className="rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(26,26,26,0.12)]"
          style={{ background: doc.stijl.kaart, padding: '32px 32px 24px', fontFamily: doc.stijl.font, color: doc.stijl.tekst }}
        >
          {blokken.length === 0 && (
            <div
              onDragOver={e => handleDragOver(0, e)}
              onDrop={e => handleDropOp(0, e)}
              className={cn('rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors', sleepDoel === 0 ? 'border-flame bg-flame/5' : 'border-[#D9D7D0]')}
            >
              <p className="text-[15px] font-semibold text-[#1A1A1A]">Je nieuwsbrief is nog leeg</p>
              <p className="mt-1 text-[13px] text-[#9B9B95]">Sleep een blok uit de lijst hierheen, of klik op een blok om het toe te voegen.</p>
            </div>
          )}
          {blokken.length > 0 && dropZone(0)}
          {blokken.map((blok, i) => {
            const isActief = geselecteerd === blok.id
            const laatste = i === blokken.length - 1
            return (
              <div key={blok.id} className="contents">
                <div
                  data-blok-id={blok.id}
                  draggable={bewerkbaar}
                  onDragStart={e => {
                    e.dataTransfer.setData(MIME_VERPLAATS, blok.id)
                    e.dataTransfer.effectAllowed = 'move'
                    setSleeptBlok(blok.id)
                  }}
                  onDragEnd={() => { setSleeptBlok(null); setSleepDoel(null) }}
                  onClick={e => { e.stopPropagation(); if (!bewerkbaar) return; setGeselecteerd(blok.id); setInspectorOpen(true) }}
                  className={cn(
                    'group/blok relative rounded-md transition-shadow',
                    bewerkbaar && 'cursor-pointer',
                    isActief ? 'shadow-[0_0_0_2px_#F15025]' : bewerkbaar && 'hover:shadow-[0_0_0_1.5px_rgba(26,83,92,0.45)]',
                    sleeptBlok === blok.id && 'opacity-40',
                  )}
                  style={{ marginBottom: laatste ? 0 : BLOK_AFSTAND[blok.type] ?? 20 }}
                >
                  {bewerkbaar && (
                    <div className={cn(
                      'absolute -right-2 -top-3 z-20 flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-md transition-opacity',
                      isActief ? 'opacity-100' : 'opacity-0 group-hover/blok:opacity-100',
                    )}>
                      <span className="flex cursor-grab items-center px-1 text-muted-foreground active:cursor-grabbing" title="Sleep om te verplaatsen"><GripVertical className="h-3.5 w-3.5" /></span>
                      <button type="button" title="Omhoog" disabled={i === 0} onClick={e => { e.stopPropagation(); schuif(blok.id, -1) }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                      <button type="button" title="Omlaag" disabled={laatste} onClick={e => { e.stopPropagation(); schuif(blok.id, 1) }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                      <button type="button" title="Dupliceren" onClick={e => { e.stopPropagation(); dupliceer(blok.id) }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                      <button type="button" title="Verwijderen" onClick={e => { e.stopPropagation(); verwijder(blok.id) }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-[#C0451A]"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  <div
                    className="nb-blok pointer-events-none select-none [&_a]:pointer-events-none"
                    style={{ fontSize: 15, lineHeight: 1.65 }}
                    dangerouslySetInnerHTML={{ __html: resolveMergeTags(renderBlok(blok, doc.stijl)) }}
                  />
                  {isActief && (
                    <span className="absolute -left-2 -top-3 z-20 rounded-md bg-flame px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{BLOK_LABEL[blok.type]}</span>
                  )}
                </div>
                {dropZone(i + 1)}
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-center text-[11px] text-[#9B9B95]">Dit is een werkweergave. Bekijk de preview voor het echte mailbeeld.</p>
      </div>
    </div>
  )

  return (
    <div className="relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
      <aside className="hidden min-h-0 border-r border-border bg-card lg:block">{palet}</aside>
      {canvas}
      <aside className={cn('hidden min-h-0 border-l border-border bg-card lg:block')}>
        <BlokInspector
          blok={actief}
          stijl={doc.stijl}
          onChange={werkBlokBij}
          onStijlChange={s => { laatsteBewerkt.current = '__stijl'; werkStijlBij(s) }}
          onDupliceer={() => actief && dupliceer(actief.id)}
          onVerwijder={() => actief && verwijder(actief.id)}
          onSluit={() => { setGeselecteerd(null); setInspectorOpen(false) }}
        />
      </aside>

      {paletOpen && (
        <div className="absolute inset-0 z-40 flex lg:hidden" onClick={() => { setPaletOpen(false); setInvoegIndex(null) }}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative ml-auto h-full w-[300px] max-w-[90%] bg-card shadow-2xl" onClick={e => e.stopPropagation()}>{palet}</div>
        </div>
      )}
      {paletOpen && invoegIndex != null && (
        <div className="absolute inset-0 z-40 hidden lg:flex" onClick={() => { setPaletOpen(false); setInvoegIndex(null) }}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative m-auto max-h-[80%] w-[520px] overflow-hidden rounded-2xl bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              <span className="text-[14px] font-bold text-foreground">Blok invoegen<span className="text-flame">.</span></span>
            </div>
            <div className="grid max-h-[60vh] grid-cols-2 gap-1 overflow-y-auto p-3">
              {BLOK_VOLGORDE.map(type => {
                const Icon = BLOK_ICOON[type]
                return (
                  <button key={type} type="button" onClick={() => { voegToe(type, invoegIndex); setInvoegIndex(null) }} className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition-all hover:border-border hover:bg-background">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-petrol/[0.08] text-petrol group-hover:bg-petrol group-hover:text-white dark:bg-white/[0.06] dark:text-foreground"><Icon className="h-4 w-4" strokeWidth={1.9} /></span>
                    <span className="min-w-0"><span className="block text-[13px] font-semibold text-foreground">{BLOK_LABEL[type]}</span><span className="block truncate text-[11px] text-muted-foreground">{BLOK_OMSCHRIJVING[type]}</span></span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {inspectorOpen && actief && (
        <div className="absolute inset-0 z-40 flex lg:hidden" onClick={() => setInspectorOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative ml-auto h-full w-[340px] max-w-[92%] bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
            <BlokInspector
              blok={actief}
              stijl={doc.stijl}
              onChange={werkBlokBij}
              onStijlChange={werkStijlBij}
              onDupliceer={() => dupliceer(actief.id)}
              onVerwijder={() => verwijder(actief.id)}
              onSluit={() => setInspectorOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
