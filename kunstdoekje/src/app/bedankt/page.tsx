'use client'

import { useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCart } from '@/lib/cart'

function Bedankt() {
  const params = useSearchParams()
  const order = params.get('order')
  const { clear } = useCart()

  // Na terugkeer van Mollie de winkelwagen legen (definitieve status komt via webhook)
  useEffect(() => {
    clear()
  }, [clear])

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-2xl text-accent">
        ✓
      </div>
      <h1 className="mt-6 font-serif text-3xl">Bedankt voor je bestelling!</h1>
      {order && (
        <p className="mt-2 text-ink/60">
          Je bestelnummer is <span className="font-medium text-ink">{order}</span>.
        </p>
      )}
      <p className="mt-4 text-ink/70">
        Zodra je betaling is verwerkt, ontvang je een bevestiging per e-mail. We gaan direct voor je
        aan de slag — elk doek wordt op bestelling voor je geprint.
      </p>
      <Link href="/shop" className="mt-8 inline-block rounded-xl bg-ink px-6 py-3.5 font-medium text-canvas hover:bg-ink/90">
        Verder kijken
      </Link>
    </div>
  )
}

export default function BedanktPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-ink/50">Laden…</div>}>
      <Bedankt />
    </Suspense>
  )
}
