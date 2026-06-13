'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useCart } from '@/lib/cart'
import { formatEuro, frameOnlyUnitCents } from '@/lib/pricing'
import type { Fabric, Format, FormatFabricPrice, FrameColor } from '@/lib/types'

const FRAME_IMG = 'https://kunstdoekje.nl/wp-content/uploads/2023/12/frames.png'

/**
 * Losse-frame configurator: kies formaat + kleur en leg de aluminium
 * wissellijst (zonder doek) zo in je tas. Prijs = de frame-component uit de
 * matrix, stof-onafhankelijk.
 */
export default function FrameConfigurator({
  formats,
  fabrics,
  frameColors,
  prices,
}: {
  formats: Format[]
  fabrics: Fabric[]
  frameColors: FrameColor[]
  prices: FormatFabricPrice[]
}) {
  const { add } = useCart()

  const standaardFormats = useMemo(() => formats.filter((f) => !f.is_maatwerk), [formats])
  const deco = useMemo(() => fabrics.find((f) => f.key === 'deco') ?? fabrics[0], [fabrics])

  const [formatId, setFormatId] = useState(standaardFormats[0]?.id ?? '')
  const [frameColorId, setFrameColorId] = useState(frameColors[0]?.id ?? '')
  const [aantal, setAantal] = useState(1)
  const [toegevoegd, setToegevoegd] = useState(false)

  const format = standaardFormats.find((f) => f.id === formatId)
  const frameColor = frameColors.find((f) => f.id === frameColorId)

  const prijsVoor = (fmtId: string) =>
    frameColor && deco
      ? frameOnlyUnitCents({ formatId: fmtId, frameColor, decoFabricId: deco.id, prices })
      : 0
  const unit = format ? prijsVoor(format.id) : 0

  const maxHoogte = Math.max(...standaardFormats.map((f) => f.hoogte_cm || 1))

  function handleAdd() {
    if (!format || !frameColor || !deco) return
    add({
      artworkTitel: `Los frame · ${frameColor.label}`,
      artworkImage: FRAME_IMG,
      formatId: format.id,
      formatLabel: format.label,
      fabricId: deco.id,
      fabricLabel: 'Aluminium wissellijst',
      frameColorId: frameColor.id,
      frameColorLabel: frameColor.label,
      metLijst: true,
      aantal,
      unitPriceCents: unit,
      frameOnly: true,
    })
    setToegevoegd(true)
    setTimeout(() => setToegevoegd(false), 4000)
  }

  return (
    <div className="space-y-8">
      {/* Formaat */}
      <fieldset>
        <legend className="label-caps mb-3 text-ink/50">01 · Formaat (cm)</legend>
        <div className="grid grid-cols-4 gap-2">
          {standaardFormats.map((f) => {
            const actief = f.id === formatId
            const p = prijsVoor(f.id)
            const h = Math.max(18, Math.round(((f.hoogte_cm || 1) / maxHoogte) * 38))
            const w = Math.max(12, Math.round(h * ((f.breedte_cm || 1) / (f.hoogte_cm || 1))))
            return (
              <button
                key={f.id}
                onClick={() => setFormatId(f.id)}
                className={`flex flex-col items-center gap-1.5 rounded-[3px] border px-2 pb-2.5 pt-3 transition ${
                  actief ? 'border-ink bg-accent/10 shadow-hard-sm' : 'border-ink/15 hover:border-ink/50'
                }`}
              >
                <span className="flex h-10 items-end">
                  <span
                    className={`block border-2 ${actief ? 'border-ink' : 'border-ink/40'}`}
                    style={{ width: w, height: h }}
                  />
                </span>
                <span className="text-[13px] font-semibold">{f.label}</span>
                <span className={`text-[11px] ${actief ? 'font-semibold text-accent-dark' : 'text-muted'}`}>
                  {p ? formatEuro(p) : '·'}
                </span>
              </button>
            )
          })}
        </div>
        <Link href="/maatwerk" className="mt-2.5 inline-block text-xs text-accent-dark hover:underline">
          Ander formaat nodig? Vraag maatwerk aan →
        </Link>
      </fieldset>

      {/* Framekleur */}
      <fieldset>
        <legend className="label-caps mb-3 text-ink/50">02 · Framekleur</legend>
        <div className="flex flex-wrap gap-2">
          {frameColors.map((f) => (
            <button
              key={f.id}
              onClick={() => setFrameColorId(f.id)}
              className={`flex items-center gap-2 rounded-[3px] border px-3.5 py-2 text-sm transition ${
                f.id === frameColorId
                  ? 'border-ink bg-accent/10 font-semibold shadow-hard-sm'
                  : 'border-ink/15 hover:border-ink/50'
              }`}
            >
              {f.hex && (
                <span className="h-4 w-4 rounded-full border border-ink/30" style={{ backgroundColor: f.hex }} />
              )}
              {f.label}
              {f.surcharge_cents > 0 && <span className="text-[11px] text-muted">+{formatEuro(f.surcharge_cents)}</span>}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Atelierbon */}
      <div className="rounded-[3px] border border-ink/25 bg-paper p-5">
        <div className="flex items-baseline justify-between border-b border-dashed border-ink/25 pb-3">
          <p className="label-caps text-ink/50">Jouw frame</p>
          <p className="label-caps text-accent-dark">Aluminium wissellijst</p>
        </div>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">Frame {frameColor?.label?.toLowerCase()}</dt>
            <dd className="shrink-0">{format?.label} cm</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">Aantal</dt>
            <dd className="shrink-0 flex items-center gap-2">
              <span className="flex items-center rounded-[3px] border border-ink/20">
                <button onClick={() => setAantal((a) => Math.max(1, a - 1))} className="px-2.5 py-0.5">−</button>
                <span className="w-7 text-center text-sm">{aantal}</span>
                <button onClick={() => setAantal((a) => a + 1)} className="px-2.5 py-0.5">+</button>
              </span>
            </dd>
          </div>
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-ink/25 pt-3">
          <span className="label-caps text-ink/50">Totaal <span className="normal-case tracking-normal">(incl. btw)</span></span>
          <span className="font-serif text-3xl">{formatEuro(unit * aantal)}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <button onClick={handleAdd} className="btn-primary w-full !py-5">
          {toegevoegd ? '✓ Toegevoegd aan je tas' : <>In winkelwagen · {formatEuro(unit * aantal)}</>}
        </button>
        {toegevoegd && (
          <div className="flex items-center justify-between rounded-[3px] border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
            <span>Frame in je tas. Kies er een mooi doek bij.</span>
            <span className="flex shrink-0 gap-4">
              <Link href="/shop" className="font-semibold text-accent-dark hover:underline">Kies doeken</Link>
              <Link href="/cart" className="font-semibold hover:underline">Naar je tas →</Link>
            </span>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-ink/50">
          <span>✓ Aluminium, voor jaren wisselen</span>
          <span>✓ Veilig betalen met iDEAL</span>
          <span>✓ 30 dagen bedenktijd</span>
        </div>
      </div>
    </div>
  )
}
