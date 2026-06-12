'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart'
import { unitPriceCents, formatEuro, priceKey, combidealUnitCents, COMBIDEAL_PCT } from '@/lib/pricing'
import type { Artwork, Fabric, Format, FormatFabricPrice, FrameColor } from '@/lib/types'

interface Props {
  artwork: Artwork
  formats: Format[]
  fabrics: Fabric[]
  frameColors: FrameColor[]
  prices: FormatFabricPrice[]
}

const STOF_INFO: Record<string, { tekst: string; tag?: string }> = {
  velvet: { tekst: 'Diepe kleuren, voelbaar zacht', tag: 'Populair' },
  deco: { tekst: 'Mat en strak, tijdloos' },
}

export default function Configurator({ artwork, formats, fabrics, frameColors, prices }: Props) {
  const { add, heeftFrame } = useCart()

  // Maatwerk-formaten apart (prijs op aanvraag) — niet selecteerbaar in de standaard config
  const standaardFormats = useMemo(() => formats.filter((f) => !f.is_maatwerk), [formats])

  const [formatId, setFormatId] = useState(standaardFormats[0]?.id ?? '')
  const [fabricId, setFabricId] = useState(fabrics[0]?.id ?? '')
  const [metLijst, setMetLijst] = useState(true)
  const [frameColorId, setFrameColorId] = useState(frameColors[0]?.id ?? '')
  const [aantal, setAantal] = useState(1)
  const [toegevoegd, setToegevoegd] = useState(false)

  const format = standaardFormats.find((f) => f.id === formatId)
  const fabric = fabrics.find((f) => f.id === fabricId)
  const frameColor = frameColors.find((f) => f.id === frameColorId)

  // Prijs uit de matrix (formaat × stof)
  const priceMap = useMemo(
    () => new Map(prices.map((p) => [priceKey(p.format_id, p.fabric_id), p])),
    [prices],
  )
  const price = format && fabric ? priceMap.get(priceKey(format.id, fabric.id)) : undefined
  const unit = price && frameColor ? unitPriceCents({ price, frameColor, metLijst }) : 0
  const combidealActief = !metLijst && heeftFrame
  const effectief = combidealActief ? combidealUnitCents(unit) : unit
  const losDoek = price?.doek_price_cents ?? 0

  // Prijs voor een specifieke optie-knop (zelfde overige keuzes)
  const prijsVoor = (fmtId: string, fabId: string) => {
    const p = priceMap.get(priceKey(fmtId, fabId))
    if (!p || !frameColor) return null
    const u = unitPriceCents({ price: p, frameColor, metLijst })
    return combidealActief ? combidealUnitCents(u) : u
  }

  // Grootste hoogte voor de proportionele formaat-preview
  const maxHoogte = Math.max(...standaardFormats.map((f) => f.hoogte_cm || 1))

  function handleAdd() {
    if (!format || !fabric || !frameColor) return
    add({
      artworkId: artwork.id,
      artworkTitel: artwork.titel,
      artworkImage: artwork.image_url,
      formatId: format.id,
      formatLabel: format.label,
      fabricId: fabric.id,
      fabricLabel: fabric.label,
      frameColorId: frameColor.id,
      frameColorLabel: frameColor.label,
      metLijst,
      aantal,
      unitPriceCents: unit,
    })
    setToegevoegd(true)
    setTimeout(() => setToegevoegd(false), 4000)
  }

  return (
    <div className="space-y-8">
      {/* Formaat — proportionele preview + prijs per knop */}
      <fieldset>
        <legend className="label-caps mb-3 text-ink/50">01 — Formaat (cm)</legend>
        <div className="grid grid-cols-4 gap-2">
          {standaardFormats.map((f) => {
            const actief = f.id === formatId
            const p = fabric ? prijsVoor(f.id, fabric.id) : null
            const h = Math.max(18, Math.round(((f.hoogte_cm || 1) / maxHoogte) * 38))
            const w = Math.max(12, Math.round(h * ((f.breedte_cm || 1) / (f.hoogte_cm || 1))))
            return (
              <button
                key={f.id}
                onClick={() => setFormatId(f.id)}
                className={`flex flex-col items-center gap-1.5 rounded-[3px] border px-2 pb-2.5 pt-3 transition ${
                  actief
                    ? 'border-ink bg-accent/10 shadow-hard-sm'
                    : 'border-ink/15 hover:border-ink/50'
                }`}
              >
                <span className="flex h-10 items-end">
                  <span
                    className={`block border ${actief ? 'border-ink bg-paper' : 'border-ink/40'}`}
                    style={{ width: w, height: h }}
                  />
                </span>
                <span className="text-[13px] font-semibold">{f.label}</span>
                <span className={`text-[11px] ${actief ? 'font-semibold text-accent-dark' : 'text-muted'}`}>
                  {p ? formatEuro(p) : '—'}
                </span>
              </button>
            )
          })}
        </div>
        <Link href="/maatwerk" className="mt-2.5 inline-block text-xs text-accent-dark hover:underline">
          Ander formaat nodig? Vraag maatwerk aan →
        </Link>
      </fieldset>

      {/* Stof — materiaalkaarten met meerprijs */}
      <fieldset>
        <legend className="label-caps mb-3 text-ink/50">02 — Stof</legend>
        <div className="grid grid-cols-2 gap-2">
          {fabrics.map((f) => {
            const actief = f.id === fabricId
            const info = STOF_INFO[f.key] ?? { tekst: f.beschrijving ?? '' }
            const eigen = format ? prijsVoor(format.id, f.id) : null
            const huidig = format && fabric ? prijsVoor(format.id, fabric.id) : null
            const diff = eigen != null && huidig != null ? eigen - (fabric?.id === f.id ? eigen : huidig) : 0
            return (
              <button
                key={f.id}
                onClick={() => setFabricId(f.id)}
                className={`relative rounded-[3px] border px-4 py-3.5 text-left transition ${
                  actief ? 'border-ink bg-accent/10 shadow-hard-sm' : 'border-ink/15 hover:border-ink/50'
                }`}
              >
                {info.tag && (
                  <span className="absolute -top-2 right-3 bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-canvas">
                    {info.tag}
                  </span>
                )}
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{f.label}</span>
                  <span className={`text-[11px] ${actief ? 'text-accent-dark' : 'text-muted'}`}>
                    {actief ? 'gekozen' : diff > 0 ? `+${formatEuro(diff)}` : diff < 0 ? `−${formatEuro(-diff)}` : ''}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-ink/60">{info.tekst}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Met / zonder lijst */}
      <fieldset>
        <legend className="label-caps mb-3 text-ink/50">03 — Frame</legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMetLijst(true)}
            className={`rounded-[3px] border px-4 py-3.5 text-left transition ${
              metLijst ? 'border-ink bg-accent/10 shadow-hard-sm' : 'border-ink/15 hover:border-ink/50'
            }`}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">Compleet</span>
              {price && frameColor && (
                <span className={`text-[11px] ${metLijst ? 'text-accent-dark' : 'text-muted'}`}>
                  {formatEuro(unitPriceCents({ price, frameColor, metLijst: true }))}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-xs text-ink/60">Doek + aluminium frame</span>
          </button>
          <button
            onClick={() => setMetLijst(false)}
            className={`relative rounded-[3px] border px-4 py-3.5 text-left transition ${
              !metLijst ? 'border-ink bg-accent/10 shadow-hard-sm' : 'border-ink/15 hover:border-ink/50'
            }`}
          >
            {heeftFrame && (
              <span className="absolute -top-2 right-3 bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                −{COMBIDEAL_PCT}%
              </span>
            )}
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">Alleen doek</span>
              {price && (
                <span className={`text-[11px] ${!metLijst ? 'text-accent-dark' : 'text-muted'}`}>
                  {formatEuro(heeftFrame ? combidealUnitCents(losDoek) : losDoek)}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-xs text-ink/60">Heb je al een frame?</span>
          </button>
        </div>
      </fieldset>

      {/* Lijstkleur (alleen bij compleet) */}
      {metLijst && (
        <fieldset>
          <legend className="label-caps mb-3 text-ink/50">04 — Framekleur</legend>
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
      )}

      {/* Atelierbon — live samenvatting */}
      <div className="rounded-[3px] border border-ink/25 bg-paper p-5">
        <div className="flex items-baseline justify-between border-b border-dashed border-ink/25 pb-3">
          <p className="label-caps text-ink/50">Jouw samenstelling</p>
          {artwork.woo_sku && <p className="label-caps text-accent-dark">Nº {artwork.woo_sku}</p>}
        </div>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">{artwork.titel}</dt>
            <dd className="shrink-0">{format?.label} cm</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">{fabric?.label}{metLijst ? ` · frame ${frameColor?.label?.toLowerCase()}` : ' · zonder frame'}</dt>
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
          <span className="text-right">
            {combidealActief && (
              <span className="mr-2 text-sm text-muted line-through">{formatEuro(unit * aantal)}</span>
            )}
            <span className={`font-serif text-3xl ${combidealActief ? 'text-accent-dark' : ''}`}>
              {formatEuro(effectief * aantal)}
            </span>
          </span>
        </div>
        {combidealActief && (
          <p className="mt-1 text-right text-xs font-semibold text-accent-dark">
            Combideal: −{COMBIDEAL_PCT}% omdat je een frame bestelt
          </p>
        )}
        {metLijst && (
          <p className="mt-1 text-right text-xs text-ink/50">
            Extra los doek erbij? Nu −{COMBIDEAL_PCT}%: <strong>{formatEuro(combidealUnitCents(losDoek))}</strong>{' '}
            <span className="line-through">{formatEuro(losDoek)}</span>
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <button onClick={handleAdd} className="btn-primary w-full !py-5">
          {toegevoegd ? '✓ Toegevoegd aan je tas' : <>In winkelwagen — {formatEuro(effectief * aantal)}</>}
        </button>
        {toegevoegd && (
          <div className="flex items-center justify-between rounded-[3px] border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
            <span>Mooi gekozen. Nog een doek erbij{heeftFrame ? ` met −${COMBIDEAL_PCT}%` : ''}?</span>
            <span className="flex shrink-0 gap-4">
              <Link href="/shop" className="font-semibold text-accent-dark hover:underline">Verder kijken</Link>
              <Link href="/cart" className="font-semibold hover:underline">Naar je tas →</Link>
            </span>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-ink/50">
          <span>✓ Veilig betalen met iDEAL</span>
          <span>✓ 30 dagen bedenktijd</span>
          <span>✓ Geprint in Nederland</span>
        </div>
      </div>

      {/* Sticky bestelbalk op mobiel */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/20 bg-canvas/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">
              {format?.label} cm · {fabric?.label}
            </p>
            <p className="font-serif text-xl">{formatEuro(effectief * aantal)}</p>
          </div>
          <button onClick={handleAdd} className="btn-primary shrink-0 !px-6 !py-3 !text-[12px]">
            {toegevoegd ? '✓ Toegevoegd' : 'In winkelwagen'}
          </button>
        </div>
      </div>
      <div className="h-16 lg:hidden" />
    </div>
  )
}
