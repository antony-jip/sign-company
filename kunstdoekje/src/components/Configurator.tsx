'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart'
import { unitPriceCents, formatEuro, priceKey } from '@/lib/pricing'
import type { Artwork, Fabric, Format, FormatFabricPrice, FrameColor } from '@/lib/types'

interface Props {
  artwork: Artwork
  formats: Format[]
  fabrics: Fabric[]
  frameColors: FrameColor[]
  prices: FormatFabricPrice[]
}

export default function Configurator({ artwork, formats, fabrics, frameColors, prices }: Props) {
  const { add } = useCart()

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

  const unit =
    price && frameColor ? unitPriceCents({ price, frameColor, metLijst }) : 0

  // Prijs van het losse doek (zonder lijst) — het herhaalaankoop-prijspunt
  const losDoek = price?.doek_price_cents ?? 0

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
    setTimeout(() => setToegevoegd(false), 2500)
  }

  return (
    <div className="space-y-7">
      {/* Formaat */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Formaat (cm)</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {standaardFormats.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormatId(f.id)}
              className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                f.id === formatId
                  ? 'border-accent bg-accent/10 font-medium'
                  : 'border-black/10 hover:border-black/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link href="/maatwerk" className="mt-2 inline-block text-xs text-accent hover:underline">
          Ander formaat nodig? Vraag maatwerk aan →
        </Link>
      </fieldset>

      {/* Stof */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Stof</legend>
        <div className="flex flex-wrap gap-2">
          {fabrics.map((f) => (
            <button
              key={f.id}
              onClick={() => setFabricId(f.id)}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                f.id === fabricId
                  ? 'border-accent bg-accent/10 font-medium'
                  : 'border-black/10 hover:border-black/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Met / zonder lijst */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Lijst</legend>
        <div className="flex gap-2">
          <button
            onClick={() => setMetLijst(true)}
            className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition ${
              metLijst ? 'border-accent bg-accent/10' : 'border-black/10 hover:border-black/30'
            }`}
          >
            <span className="block font-medium">Compleet</span>
            <span className="text-xs text-ink/60">Doek + aluminium lijst</span>
          </button>
          <button
            onClick={() => setMetLijst(false)}
            className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition ${
              !metLijst ? 'border-accent bg-accent/10' : 'border-black/10 hover:border-black/30'
            }`}
          >
            <span className="block font-medium">Alleen doek</span>
            <span className="text-xs text-ink/60">Heb je al een lijst?</span>
          </button>
        </div>
      </fieldset>

      {/* Lijstkleur (alleen bij compleet) */}
      {metLijst && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Lijstkleur</legend>
          <div className="flex flex-wrap gap-2">
            {frameColors.map((f) => (
              <button
                key={f.id}
                onClick={() => setFrameColorId(f.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  f.id === frameColorId
                    ? 'border-accent bg-accent/10 font-medium'
                    : 'border-black/10 hover:border-black/30'
                }`}
              >
                {f.hex && (
                  <span
                    className="h-4 w-4 rounded-full border border-black/20"
                    style={{ backgroundColor: f.hex }}
                  />
                )}
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Aantal + prijs */}
      <div className="flex items-end justify-between border-t border-black/10 pt-5">
        <div>
          <span className="block text-sm text-ink/60">Prijs</span>
          <span className="font-serif text-3xl">{formatEuro(unit)}</span>
          {metLijst && (
            <span className="mt-1 block text-xs text-ink/50">
              Los doek bijbestellen later: {formatEuro(losDoek)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-black/10">
            <button onClick={() => setAantal((a) => Math.max(1, a - 1))} className="px-3 py-2">−</button>
            <span className="w-8 text-center text-sm">{aantal}</span>
            <button onClick={() => setAantal((a) => a + 1)} className="px-3 py-2">+</button>
          </div>
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="w-full rounded-xl bg-ink py-4 font-medium text-canvas transition hover:bg-ink/90"
      >
        {toegevoegd ? '✓ Toegevoegd aan winkelwagen' : 'In winkelwagen'}
      </button>

      <p className="text-center text-xs text-ink/50">
        Op bestelling geprint in Nederland · Gratis verzending vanaf €50
      </p>
    </div>
  )
}
