'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/cart'
import { formatEuro } from '@/lib/pricing'

export default function CartPage() {
  const { items, remove, setAantal, subtotalCents } = useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl">Je winkelwagen is leeg</h1>
        <p className="mt-3 text-ink/60">Ontdek de collectie en stel je eerste kunstdoek samen.</p>
        <Link href="/shop" className="mt-8 inline-block rounded-xl bg-ink px-6 py-3.5 font-medium text-canvas hover:bg-ink/90">
          Naar de shop
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-serif text-4xl">Winkelwagen</h1>

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
                    {i.formatLabel} cm · {i.fabricLabel} · {i.metLijst ? `lijst ${i.frameColorLabel}` : 'zonder lijst'}
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
                <span className="font-medium">{formatEuro(i.unitPriceCents * i.aantal)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-end gap-1 border-t border-black/10 pt-6">
        <div className="flex w-full max-w-xs justify-between text-sm text-ink/60">
          <span>Subtotaal</span>
          <span>{formatEuro(subtotalCents)}</span>
        </div>
        <p className="text-xs text-ink/50">Verzendkosten worden in de checkout berekend.</p>
        <Link
          href="/checkout"
          className="mt-4 rounded-xl bg-ink px-8 py-4 font-medium text-canvas hover:bg-ink/90"
        >
          Afrekenen
        </Link>
      </div>
    </div>
  )
}
