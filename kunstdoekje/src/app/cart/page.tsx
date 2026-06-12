'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/cart'
import { formatEuro } from '@/lib/pricing'

export default function CartPage() {
  const { items, remove, setAantal, subtotalCents, heeftFrame, kortingCents, effectiveUnitCents } = useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl">Je winkelwagen is leeg</h1>
        <p className="mt-3 text-ink/60">Ontdek de collectie en stel je eerste kunstdoek samen.</p>
        <Link href="/shop" className="btn-primary mt-8">
          Naar de shop
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-serif text-4xl">Winkelwagen</h1>

      {/* Combideal-upsell */}
      {heeftFrame && (
        <div className="mt-6 flex flex-col items-start gap-4 rounded-[3px] border border-ink/30 bg-accent/10 p-5 shadow-hard-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-lg uppercase">
              Combideal actief — <span className="text-accent-dark">losse doeken −25%</span>
            </p>
            <p className="mt-1 text-sm text-ink/70">
              Je bestelt een frame. Elk extra los doek (zonder frame) krijgt automatisch 25% korting —
              zo wissel je vanaf dag één.
            </p>
          </div>
          <Link href="/shop" className="btn-primary shrink-0 !py-3">
            Kies een extra doek
          </Link>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {items.map((i) => (
          <div key={i.lineId} className="flex gap-4 rounded-xl border border-black/10 p-4">
            <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-black/5">
              {i.artworkImage && (
                <Image src={i.artworkImage} alt={i.artworkTitel} fill className="object-cover" sizes="80px" />
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{i.artworkTitel}</p>
                  <p className="text-sm text-ink/60">
                    {i.formatLabel} cm · {i.fabricLabel} · {i.metLijst ? `frame ${i.frameColorLabel}` : 'zonder frame'}
                  </p>
                </div>
                <button onClick={() => remove(i.lineId)} className="text-sm text-ink/40 hover:text-ink">
                  Verwijderen
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="flex items-center rounded-lg border border-black/10">
                  <button onClick={() => setAantal(i.lineId, i.aantal - 1)} className="px-3 py-1.5">−</button>
                  <span className="w-8 text-center text-sm">{i.aantal}</span>
                  <button onClick={() => setAantal(i.lineId, i.aantal + 1)} className="px-3 py-1.5">+</button>
                </div>
                <span className="text-right font-medium">
                  {effectiveUnitCents(i) < i.unitPriceCents ? (
                    <>
                      <span className="mr-2 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent-dark">−25%</span>
                      <span className="mr-2 text-sm text-muted line-through">{formatEuro(i.unitPriceCents * i.aantal)}</span>
                      {formatEuro(effectiveUnitCents(i) * i.aantal)}
                    </>
                  ) : (
                    formatEuro(i.unitPriceCents * i.aantal)
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-end gap-1 border-t border-black/10 pt-6">
        {kortingCents > 0 && (
          <div className="flex w-full max-w-xs justify-between text-sm font-semibold text-accent-dark">
            <span>Combideal-korting</span>
            <span>−{formatEuro(kortingCents)}</span>
          </div>
        )}
        <div className="flex w-full max-w-xs justify-between text-sm text-ink/60">
          <span>Subtotaal</span>
          <span>{formatEuro(subtotalCents)}</span>
        </div>
        <p className="text-xs text-ink/50">Verzendkosten worden in de checkout berekend.</p>
        <Link
          href="/checkout"
          className="btn-primary mt-4"
        >
          Afrekenen →
        </Link>
      </div>
    </div>
  )
}
