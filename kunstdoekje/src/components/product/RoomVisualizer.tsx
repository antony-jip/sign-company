'use client'

import Image from 'next/image'
import { useState, type ReactNode } from 'react'
import { HexColorPicker } from 'react-colorful'
import type { Artwork } from '@/lib/types'
import { useProductConfig } from './ProductConfigContext'

/** Zichtbare wandhoogte (cm) waartegen formaat en silhouet worden geschaald.
 *  Ruim genomen zodat ook het grootste formaat + maatlijnen in beeld passen. */
const WALL_CM = 270
const PERSON_CM = 175

type View = 'kamer' | 'doek' | number // number = index in sfeerfoto's

// Snelkeuzes voor de muurkleur (eigen RGB-kleur via de picker)
const MUREN = [
  { naam: 'Crème', hex: '#EFEDE2' },
  { naam: 'Gebroken wit', hex: '#F6F5F0' },
  { naam: 'Warm grijs', hex: '#D7D2C7' },
  { naam: 'Salie', hex: '#C2C8B8' },
  { naam: 'Terracotta', hex: '#C68A6A' },
  { naam: 'Diepblauw', hex: '#3B4A5A' },
  { naam: 'Antraciet', hex: '#39362F' },
]

export default function RoomVisualizer({
  artwork,
  sfeerfotos,
}: {
  artwork: Artwork
  sfeerfotos: string[]
}) {
  const { format, frameColor, frameColors, frameColorId, setFrameColorId, metLijst } =
    useProductConfig()
  const [view, setView] = useState<View>('doek')
  const [wallColor, setWallColor] = useState(MUREN[0].hex)

  const breedte = format?.breedte_cm ?? 100
  const hoogte = format?.hoogte_cm ?? 140
  const liggend = Boolean(artwork.is_liggend)
  const dispBreedte = liggend ? hoogte : breedte
  const dispHoogte = liggend ? breedte : hoogte
  const artHpct = Math.min(72, (dispHoogte / WALL_CM) * 100)
  const personHpct = (PERSON_CM / WALL_CM) * 100
  const lijstHex = metLijst ? frameColor?.hex || '#1a1a1a' : null

  const artSrc = artwork.thumb_url || artwork.image_url
  const cropped = Boolean(artwork.thumb_url)
  const doekZoom = cropped ? '' : 'scale-[1.35] hover:scale-[1.4]'

  // Foto-reeks voor de pijltjes: [het doek, ...sfeerfoto's]
  const fotoCount = 1 + sfeerfotos.length
  const fotoIdx = view === 'doek' ? 0 : typeof view === 'number' ? view + 1 : -1
  const gaNaarFoto = (i: number) => setView(i <= 0 ? 'doek' : i - 1)
  const inFotoView = fotoIdx >= 0

  return (
    <div className="space-y-4">
      {/* Schakelaar: het doek ↔ schaalweergave */}
      <div className="flex items-center gap-2">
        <Tab actief={view === 'doek'} onClick={() => setView('doek')}>
          Het doek
        </Tab>
        <Tab actief={view === 'kamer'} onClick={() => setView('kamer')}>
          Op schaal
        </Tab>
      </div>

      {view === 'kamer' ? (
        /* ── Schaalweergave: doek vs. figuur van 1,75 m ─────────────────── */
        <div className="space-y-3">
          <p className="text-[11px] text-ink/45">Indicatie op ware schaal · figuur 1,75 m</p>

          <div
            className="kd-rise relative aspect-[4/3] select-none overflow-hidden rounded-[4px] border border-ink/15"
            style={{ backgroundColor: wallColor, transition: 'background-color 0.5s ease' }}
          >
            {/* zacht strijklicht voor diepte op elke muurkleur */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-ink/[0.06]" />
            {/* vloerlijn */}
            <div className="absolute inset-x-0 bottom-[12%] h-px bg-ink/12" />
            <div className="absolute inset-x-0 bottom-0 h-[12%] bg-gradient-to-b from-ink/[0.02] to-ink/[0.07]" />

            {/* Framekleur-kiezer, rechtsboven (alleen met lijst) */}
            {metLijst && frameColors.length > 0 && (
              <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-ink/10 bg-paper/85 px-2.5 py-2 shadow-sm backdrop-blur">
                {frameColors.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-label={f.label}
                    title={f.label}
                    onClick={() => setFrameColorId(f.id)}
                    className={`h-5 w-5 rounded-full border transition-all duration-200 ${
                      f.id === frameColorId
                        ? 'border-ink ring-2 ring-accent ring-offset-1 ring-offset-paper'
                        : 'border-ink/25 hover:scale-110'
                    }`}
                    style={{ backgroundColor: f.hex || '#fff' }}
                  />
                ))}
              </div>
            )}

            {/* Het ingelijste werk · gecentreerd, met maatlijnen op de randen */}
            <div
              className="absolute left-[13%] top-1/2 -translate-y-1/2"
              style={{ height: `${artHpct}%`, transition: 'height 0.5s cubic-bezier(0.22,1,0.36,1)' }}
            >
              <div
                className="relative h-full overflow-hidden"
                style={{
                  aspectRatio: `${dispBreedte} / ${dispHoogte}`,
                  padding: lijstHex ? '1px' : 0,
                  backgroundColor: lijstHex || 'transparent',
                  transition: 'background-color 0.5s ease, padding 0.4s ease',
                  boxShadow: lijstHex
                    ? '0 0 0 1px rgba(0,0,0,0.06), 16px 24px 38px -22px rgba(58,49,39,0.5)'
                    : '14px 22px 34px -20px rgba(58,49,39,0.45)',
                }}
              >
                <div className="relative h-full w-full overflow-hidden bg-black/5">
                  <Image
                    src={artSrc}
                    alt={`${artwork.titel} aan de muur, ${dispBreedte} × ${dispHoogte} cm`}
                    fill
                    sizes="(max-width:768px) 60vw, 30vw"
                    className={`object-cover ${cropped ? '' : 'scale-[1.35]'}`}
                  />
                  {!lijstHex && (
                    <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(58,49,39,0.12)]" />
                  )}
                </div>
              </div>

              {/* breedte-maat boven het werk */}
              <div className="absolute inset-x-0 -top-7 flex flex-col items-center gap-1">
                <span className="whitespace-nowrap rounded-[3px] border border-ink/15 bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink shadow-sm">
                  {dispBreedte} cm
                </span>
                <span className="relative h-1.5 w-full">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/25" />
                  <span className="absolute bottom-0 left-0 h-1.5 w-px bg-ink/25" />
                  <span className="absolute bottom-0 right-0 h-1.5 w-px bg-ink/25" />
                </span>
              </div>

              {/* hoogte-maat rechts van het werk */}
              <div className="absolute inset-y-0 left-full ml-3 flex items-center gap-1.5">
                <span className="relative h-full w-1.5">
                  <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink/25" />
                  <span className="absolute left-0 top-0 h-px w-1.5 bg-ink/25" />
                  <span className="absolute left-0 bottom-0 h-px w-1.5 bg-ink/25" />
                </span>
                <span
                  className="whitespace-nowrap rounded-[3px] border border-ink/15 bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink shadow-sm"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {dispHoogte} cm
                </span>
              </div>
            </div>

            {/* Silhouet 1,75 m · maatreferentie */}
            <div
              className="absolute bottom-[12%] right-[14%] flex items-end gap-2"
              style={{ height: `${personHpct}%` }}
            >
              <svg viewBox="0 0 50 175" className="h-full w-auto" aria-hidden>
                <g fill="rgba(58,49,39,0.13)">
                  <circle cx="25" cy="15" r="13" />
                  <path d="M10 64C10 42 16 30 25 30s15 12 15 34v38H10z" />
                  <path d="M13 102h11l-3 73h-6z" />
                  <path d="M26 102h11l-2 73h-6z" />
                </g>
              </svg>
              <div className="relative h-full w-4">
                <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/20" />
                <span className="absolute left-0 right-0 top-0 h-px bg-ink/20" />
                <span className="absolute bottom-0 left-0 right-0 h-px bg-ink/20" />
                <span className="absolute left-1/2 top-1/2 -translate-y-1/2 translate-x-2 rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">
                  1,75 m
                </span>
              </div>
            </div>
          </div>

          <MuurKiezer wallColor={wallColor} setWallColor={setWallColor} />
        </div>
      ) : (
        /* ── Het vlakke doek + sfeerfoto's, met pijltjes ────────────────── */
        <div className="relative">
          <FlatView
            src={typeof view === 'number' ? sfeerfotos[view] : artSrc}
            alt={artwork.titel}
            lijstHex={typeof view === 'number' ? null : lijstHex}
            zoomClass={typeof view === 'number' ? 'hover:scale-[1.05]' : doekZoom}
            aspect={typeof view === 'number' ? undefined : liggend ? '3 / 2' : '2 / 3'}
            contain={typeof view !== 'number'}
          />
          {inFotoView && fotoCount > 1 && (
            <>
              <Pijl richting="links" onClick={() => gaNaarFoto((fotoIdx - 1 + fotoCount) % fotoCount)} />
              <Pijl richting="rechts" onClick={() => gaNaarFoto((fotoIdx + 1) % fotoCount)} />
            </>
          )}
        </div>
      )}

      {/* Thumbnail-strip: het doek + sfeerfoto's */}
      {sfeerfotos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Thumb
            actief={view === 'doek'}
            src={artwork.image_url}
            label="Het doek"
            onClick={() => setView('doek')}
          />
          {sfeerfotos.map((src, i) => (
            <Thumb
              key={src}
              actief={view === i}
              src={src}
              label={`Sfeerbeeld ${i + 1}`}
              onClick={() => setView(i)}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-ink/50">
        De werkelijke kleurweergave is afhankelijk van je stofkeuze. Bekijk “Op schaal” voor de maten
        naast een figuur van 1,75 m.
      </p>
    </div>
  )
}

function Tab({
  actief,
  onClick,
  children,
}: {
  actief: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition ${
        actief
          ? 'border-ink bg-ink text-canvas'
          : 'border-ink/20 text-ink/55 hover:border-ink/50 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Pijl({ richting, onClick }: { richting: 'links' | 'rechts'; onClick: () => void }) {
  const links = richting === 'links'
  return (
    <button
      type="button"
      aria-label={links ? 'Vorige foto' : 'Volgende foto'}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-paper/85 text-ink shadow-sm backdrop-blur transition hover:bg-paper ${
        links ? 'left-3' : 'right-3'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={links ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
}

function FlatView({
  src,
  alt,
  lijstHex,
  zoomClass = '',
  aspect,
  contain = false,
}: {
  src: string
  alt: string
  lijstHex: string | null
  zoomClass?: string
  aspect?: string
  contain?: boolean
}) {
  return (
    <div
      className="kd-rise relative w-full overflow-hidden rounded-[4px] border border-ink/15 bg-black/5"
      style={{ aspectRatio: aspect ?? '4 / 5' }}
    >
      <div
        className="absolute inset-0"
        style={{
          padding: lijstHex ? '1px' : 0,
          backgroundColor: lijstHex || 'transparent',
          transition: 'background-color 0.5s ease',
        }}
      >
        <div key={src} className="kd-fade relative h-full w-full overflow-hidden bg-black/5">
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(max-width:768px) 100vw, 50vw"
            className={`${contain ? 'object-contain' : 'object-cover'} transition-transform duration-[1.2s] ease-out ${zoomClass}`}
          />
        </div>
      </div>
    </div>
  )
}

function Thumb({
  actief,
  src,
  label,
  onClick,
}: {
  actief: boolean
  src: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-[3px] border-2 bg-black/5 transition ${
        actief ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100'
      }`}
    >
      <Image src={src} alt="" fill sizes="64px" className="object-cover" />
    </button>
  )
}

/** Muurkleur: snelkeuzes + een mooie in-page kleurkiezer (alle RGB). */
function MuurKiezer({
  wallColor,
  setWallColor,
}: {
  wallColor: string
  setWallColor: (c: string) => void
}) {
  const [open, setOpen] = useState(false)
  const eigen = !MUREN.some((m) => m.hex.toLowerCase() === wallColor.toLowerCase())

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/45">Muurkleur</span>
      {MUREN.map((m) => {
        const actief = wallColor.toLowerCase() === m.hex.toLowerCase()
        return (
          <button
            key={m.hex}
            type="button"
            aria-label={m.naam}
            title={m.naam}
            onClick={() => setWallColor(m.hex)}
            className={`h-5 w-5 rounded-full transition ${
              actief
                ? 'ring-[1.5px] ring-ink ring-offset-2 ring-offset-canvas'
                : 'shadow-[inset_0_0_0_1px_rgba(58,49,39,0.18)] hover:shadow-[inset_0_0_0_1px_rgba(58,49,39,0.45)]'
            }`}
            style={{ backgroundColor: m.hex }}
          />
        )
      })}

      <span className="mx-0.5 h-4 w-px bg-ink/15" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Kies je eigen muurkleur"
          className={`flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-3 text-[11px] font-semibold transition ${
            eigen
              ? 'border-ink bg-accent/[0.07] text-ink shadow-hard-sm'
              : 'border-ink/20 text-ink/55 hover:border-ink/45 hover:text-ink'
          }`}
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full border border-ink/20"
            style={eigen ? { backgroundColor: wallColor } : undefined}
          >
            {!eigen && <span className="font-accent text-[13px] leading-none text-accent">+</span>}
          </span>
          Kies je eigen kleur
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" aria-hidden onClick={() => setOpen(false)} />
            <div className="kd-fade absolute bottom-full left-0 z-40 mb-2 w-[212px] rounded-[6px] border border-ink/15 bg-paper p-2.5 shadow-hard">
              <HexColorPicker color={wallColor} onChange={setWallColor} style={{ width: '100%', height: 150 }} />
              <div className="mt-2.5 flex items-center gap-2">
                <span
                  className="h-6 w-6 shrink-0 rounded-[3px] border border-ink/20"
                  style={{ backgroundColor: wallColor }}
                />
                <input
                  value={wallColor}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) setWallColor(v.startsWith('#') ? v : `#${v}`)
                  }}
                  aria-label="Hex-kleurcode"
                  className="w-full rounded-[3px] border border-ink/20 bg-canvas px-2 py-1 text-xs uppercase tracking-wide outline-none focus:border-accent"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
