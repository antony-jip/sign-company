'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart'
import { formatEuro } from '@/lib/pricing'

export default function CheckoutPage() {
  const { items, subtotalCents } = useCart()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    naam: '', email: '', telefoon: '', adres: '', postcode: '', plaats: '', opmerking: '',
  })

  if (items.length === 0 && !busy) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl">Je winkelwagen is leeg</h1>
        <button onClick={() => router.push('/shop')} className="mt-6 rounded-xl bg-ink px-6 py-3 text-canvas">
          Naar de shop
        </button>
      </div>
    )
  }

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            artworkId: i.artworkId,
            customUploadId: i.customUploadId,
            formatId: i.formatId,
            fabricId: i.fabricId,
            frameColorId: i.frameColorId,
            metLijst: i.metLijst,
            aantal: i.aantal,
          })),
          customer: form,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Er ging iets mis')
      // Door naar Mollie
      window.location.href = data.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm outline-none focus:border-accent'

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-6 py-12 md:grid-cols-[1fr_360px]">
      {/* Formulier */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="font-serif text-3xl">Afrekenen</h1>

        <div>
          <label className="mb-1 block text-sm">Naam</label>
          <input className={inputCls} value={form.naam} onChange={(e) => update('naam', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm">E-mailadres *</label>
          <input type="email" className={inputCls} value={form.email} onChange={(e) => update('email', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm">Telefoon</label>
          <input className={inputCls} value={form.telefoon} onChange={(e) => update('telefoon', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm">Adres</label>
          <input className={inputCls} value={form.adres} onChange={(e) => update('adres', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm">Postcode</label>
            <input className={inputCls} value={form.postcode} onChange={(e) => update('postcode', e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm">Plaats</label>
            <input className={inputCls} value={form.plaats} onChange={(e) => update('plaats', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm">Opmerking (optioneel)</label>
          <textarea className={inputCls} rows={3} value={form.opmerking} onChange={(e) => update('opmerking', e.target.value)} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-ink py-4 font-medium text-canvas transition hover:bg-ink/90 disabled:opacity-60"
        >
          {busy ? 'Bezig…' : `Betaal ${formatEuro(subtotalCents)} met iDEAL`}
        </button>
        <p className="text-center text-xs text-ink/50">Je wordt doorgestuurd naar een beveiligde betaalpagina (Mollie).</p>
      </form>

      {/* Samenvatting */}
      <aside className="h-fit rounded-xl border border-black/10 p-5">
        <p className="font-medium">Jouw bestelling</p>
        <ul className="mt-4 space-y-3">
          {items.map((i) => (
            <li key={i.lineId} className="flex justify-between text-sm">
              <span className="text-ink/70">
                {i.aantal}× {i.artworkTitel}
                <span className="block text-xs text-ink/50">
                  {i.formatLabel} · {i.fabricLabel} · {i.metLijst ? i.frameColorLabel : 'zonder lijst'}
                </span>
              </span>
              <span>{formatEuro(i.unitPriceCents * i.aantal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-black/10 pt-4 font-medium">
          <span>Subtotaal</span>
          <span>{formatEuro(subtotalCents)}</span>
        </div>
      </aside>
    </div>
  )
}
