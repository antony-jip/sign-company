'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart'
import { unitPriceCents, formatEuro, priceKey, combidealUnitCents, COMBIDEAL_PCT } from '@/lib/pricing'
import type { Artwork, FormatFabricPrice } from '@/lib/types'
import { useProductConfig } from './product/ProductConfigContext'

interface Props {
  artwork: Artwork
  prices: FormatFabricPrice[]
}

const STOF_INFO: Record<string, { tekst: string; tag?: string }> = {
  velvet: { tekst: 'Diepe kleuren, voelbaar zacht', tag: 'Populair' },
  deco: { tekst: 'Mat en strak, tijdloos' },
}

// Materiaal-hint per stof (plush fluweel met glans vs. matte deco)
const STOF_SWATCH: Record<string, string> = {
  velvet:
    'radial-gradient(circle at 34% 28%, rgba(255,255,255,0.42), rgba(0,0,0,0) 52%), linear-gradient(145deg, #6E5A63, #382E35)',
  deco: 'linear-gradient(145deg, #D7D2C7, #B7B1A4)',
}

export default function Configurator({ artwork, prices }: Props) {
  const { add, heeftFrame } = useCart()

  // Gedeelde keuzestaat · de interieur-preview reageert live op deze waarden.
  const {
    formats: standaardFormats,
    fabrics,
    frameColors,
    formatId,
    setFormatId,
    fabricId,
    setFabricId,
    frameColorId,
    setFrameColorId,
    metLijst,
    setMetLijst,
    format,
    fabric,
    frameColor,
  } = useProductConfig()

  const [aantal, setAantal] = useState(1)
  const [toegevoegd, setToegevoegd] = useState(false)

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

  // Grootste (lange) zijde voor de proportionele formaat-preview
  const maxHoogte = Math.max(...standaardFormats.map((f) => f.hoogte_cm || 1))
  const liggend = Boolean(artwork.is_liggend)

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

  const actiefRing = 'border-ink bg-accent/[0.07] shadow-hard-sm'
  const rustRing = 'border-ink/15 hover:border-ink/45'

  return (
    <div className="space-y-7">
      {/* 01 · Formaat */}
      <fieldset>
        <StapKop nr="01" titel="Formaat" waarde={format ? `${format.label} cm` : undefined} />
        <div className="grid grid-cols-4 gap-2">
          {standaardFormats.map((f) => {
            const actief = f.id === formatId
            const p = fabric ? prijsVoor(f.id, fabric.id) : null
            const lang = Math.max(16, Math.round(((f.hoogte_cm || 1) / maxHoogte) * 38))
            const kort = Math.max(11, Math.round(lang * ((f.breedte_cm || 1) / (f.hoogte_cm || 1))))
            const w = liggend ? lang : kort
            const h = liggend ? kort : lang
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormatId(f.id)}
                className={`group flex flex-col items-center gap-1.5 rounded-[4px] border px-2 pb-2.5 pt-3 transition ${
                  actief ? actiefRing : rustRing
                }`}
              >
                <span className="flex h-11 items-end">
                  <span
                    className={`block rounded-[1px] border-2 transition-colors ${
                      actief ? 'border-ink bg-paper' : 'border-ink/35 group-hover:border-ink/55'
                    }`}
                    style={{ width: w, height: h }}
                  />
                </span>
                <span className="text-[12px] font-bold leading-none">{f.label}</span>
                <span
                  className={`text-[11px] leading-none ${actief ? 'font-semibold text-accent-dark' : 'text-muted'}`}
                >
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

      {/* 02 · Stof */}
      <fieldset>
        <StapKop nr="02" titel="Stof" waarde={fabric?.label} />
        <div className="grid grid-cols-2 gap-2.5">
          {fabrics.map((f) => {
            const actief = f.id === fabricId
            const info = STOF_INFO[f.key] ?? { tekst: f.beschrijving ?? '' }
            const eigen = format ? prijsVoor(format.id, f.id) : null
            const huidig = format && fabric ? prijsVoor(format.id, fabric.id) : null
            const diff =
              eigen != null && huidig != null ? eigen - (fabric?.id === f.id ? eigen : huidig) : 0
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFabricId(f.id)}
                className={`relative flex items-start gap-3 rounded-[4px] border p-3.5 text-left transition ${
                  actief ? actiefRing : rustRing
                }`}
              >
                {info.tag && (
                  <span className="absolute -top-2 right-3 rounded-[2px] bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-canvas">
                    {info.tag}
                  </span>
                )}
                <span
                  className="mt-0.5 h-9 w-9 shrink-0 rounded-[3px] border border-ink/15 shadow-inner"
                  style={{ background: STOF_SWATCH[f.key] ?? '#cfcabf' }}
                />
                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{f.label}</span>
                    <span className={`shrink-0 text-[11px] ${actief ? 'text-accent-dark' : 'text-muted'}`}>
                      {actief ? 'gekozen' : diff > 0 ? `+${formatEuro(diff)}` : diff < 0 ? `−${formatEuro(-diff)}` : ''}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink/60">{info.tekst}</span>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* 03 · Frame */}
      <fieldset>
        <StapKop nr="03" titel="Frame" waarde={metLijst ? 'Compleet' : 'Alleen doek'} />
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setMetLijst(true)}
            className={`flex items-start gap-3 rounded-[4px] border p-3.5 text-left transition ${
              metLijst ? actiefRing : rustRing
            }`}
          >
            <FrameIcoon ingelijst />
            <span className="min-w-0">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">Compleet</span>
                {price && frameColor && (
                  <span className={`shrink-0 text-[11px] ${metLijst ? 'text-accent-dark' : 'text-muted'}`}>
                    {formatEuro(unitPriceCents({ price, frameColor, metLijst: true }))}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-ink/60">Doek + aluminium frame</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMetLijst(false)}
            className={`relative flex items-start gap-3 rounded-[4px] border p-3.5 text-left transition ${
              !metLijst ? actiefRing : rustRing
            }`}
          >
            {heeftFrame && (
              <span className="absolute -top-2 right-3 rounded-[2px] bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                −{COMBIDEAL_PCT}%
              </span>
            )}
            <FrameIcoon />
            <span className="min-w-0">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">Alleen doek</span>
                {price && (
                  <span className={`shrink-0 text-[11px] ${!metLijst ? 'text-accent-dark' : 'text-muted'}`}>
                    {formatEuro(heeftFrame ? combidealUnitCents(losDoek) : losDoek)}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-ink/60">Heb je al een frame?</span>
            </span>
          </button>
        </div>
      </fieldset>

      {/* 04 · Framekleur (alleen bij compleet) */}
      {metLijst && (
        <fieldset>
          <StapKop nr="04" titel="Framekleur" waarde={frameColor?.label} />
          <div className="flex flex-wrap gap-2">
            {frameColors.map((f) => {
              const actief = f.id === frameColorId
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFrameColorId(f.id)}
                  className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm transition ${
                    actief ? 'border-ink bg-accent/[0.07] font-semibold shadow-hard-sm' : 'border-ink/15 hover:border-ink/45'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full border transition ${
                      actief ? 'border-ink ring-1 ring-accent ring-offset-1 ring-offset-paper' : 'border-ink/25'
                    }`}
                    style={{ backgroundColor: f.hex || '#fff' }}
                  />
                  {f.label}
                  {f.surcharge_cents > 0 && (
                    <span className="text-[11px] text-muted">+{formatEuro(f.surcharge_cents)}</span>
                  )}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {/* Atelierbon · live samenvatting */}
      <div className="rounded-[4px] border border-ink/25 bg-paper p-5 shadow-hard-sm">
        <div className="flex items-baseline justify-between border-b border-dashed border-ink/25 pb-3">
          <p className="label-caps text-ink/50">Jouw samenstelling</p>
          {artwork.woo_sku && <p className="label-caps text-accent-dark">Nº {artwork.woo_sku}</p>}
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="truncate font-medium">{artwork.titel}</dt>
            <dd className="shrink-0 text-ink/60">{format?.label} cm</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink/60">
              {fabric?.label}
              {metLijst ? ` · frame ${frameColor?.label?.toLowerCase()}` : ' · zonder frame'}
            </dt>
            <dd className="flex shrink-0 items-center overflow-hidden rounded-[3px] border border-ink/20">
              <button
                type="button"
                aria-label="Eén minder"
                onClick={() => setAantal((a) => Math.max(1, a - 1))}
                className="px-2.5 py-1 text-ink/70 transition hover:bg-ink/[0.06] hover:text-ink"
              >
                −
              </button>
              <span className="w-7 text-center text-sm font-semibold">{aantal}</span>
              <button
                type="button"
                aria-label="Eén meer"
                onClick={() => setAantal((a) => a + 1)}
                className="px-2.5 py-1 text-ink/70 transition hover:bg-ink/[0.06] hover:text-ink"
              >
                +
              </button>
            </dd>
          </div>
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-ink/25 pt-3">
          <span className="label-caps text-ink/50">
            Totaal <span className="normal-case tracking-normal">(incl. btw)</span>
          </span>
          <span className="text-right">
            {combidealActief && (
              <span className="mr-2 text-sm text-muted line-through">{formatEuro(unit * aantal)}</span>
            )}
            <span className={`font-serif text-3xl ${combidealActief ? 'text-accent-dark' : ''}`}>
              {formatEuro(effectief * aantal)}
            </span>
          </span>
        </div>
        {combidealActief ? (
          <p className="mt-1.5 text-right text-xs font-semibold text-accent-dark">
            Combideal: −{COMBIDEAL_PCT}% omdat je een frame bestelt
          </p>
        ) : (
          metLijst && (
            <p className="mt-1.5 text-right text-xs text-ink/50">
              Extra los doek erbij? Nu −{COMBIDEAL_PCT}%:{' '}
              <strong>{formatEuro(combidealUnitCents(losDoek))}</strong>{' '}
              <span className="line-through">{formatEuro(losDoek)}</span>
            </p>
          )
        )}
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <button onClick={handleAdd} className="btn-primary w-full !py-5">
          {toegevoegd ? '✓ Toegevoegd aan je tas' : <>In winkelwagen · {formatEuro(effectief * aantal)}</>}
        </button>
        {toegevoegd && (
          <div className="kd-fade flex items-center justify-between rounded-[4px] border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
            <span>Mooi gekozen. Nog een doek erbij{heeftFrame ? ` met −${COMBIDEAL_PCT}%` : ''}?</span>
            <span className="flex shrink-0 gap-4">
              <Link href="/shop" className="font-semibold text-accent-dark hover:underline">
                Verder kijken
              </Link>
              <Link href="/cart" className="font-semibold hover:underline">
                Naar je tas →
              </Link>
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

/** Stap-kop met nummer, titel en de huidige keuze rechts. */
function StapKop({ nr, titel, waarde }: { nr: string; titel: string; waarde?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <legend className="label-caps text-ink/50">
        <span className="text-accent-dark">{nr}</span> · {titel}
      </legend>
      {waarde && <span className="truncate text-[11px] font-semibold text-ink/70">{waarde}</span>}
    </div>
  )
}

/** Klein icoon: ingelijst doek vs. kaal doek. */
function FrameIcoon({ ingelijst = false }: { ingelijst?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-9 w-9 shrink-0 text-ink/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      {ingelijst ? (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="1" />
          <rect x="6.5" y="7.5" width="11" height="9" rx="0.5" className="text-accent" stroke="currentColor" />
        </>
      ) : (
        <rect x="5" y="5.5" width="14" height="13" rx="1" />
      )}
    </svg>
  )
}
