'use client'

import { useState } from 'react'

export default function QuoteForm({
  type = 'contact',
  showBedrijf = false,
  showFormaat = false,
}: {
  type?: 'maatwerk' | 'zakelijk' | 'contact'
  showBedrijf?: boolean
  showFormaat?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    naam: '', email: '', telefoon: '', bedrijf: '', gewenstFormaat: '', bericht: '',
  })

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...form }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Versturen mislukt')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setBusy(false)
    }
  }

  const cls = 'w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm outline-none focus:border-accent'

  if (done) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
        <p className="font-medium">Bedankt! We hebben je bericht ontvangen.</p>
        <p className="mt-1 text-sm text-ink/60">Je hoort zo snel mogelijk van ons.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input className={cls} placeholder="Naam" value={form.naam} onChange={(e) => update('naam', e.target.value)} required />
        <input className={cls} type="email" placeholder="E-mailadres" value={form.email} onChange={(e) => update('email', e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input className={cls} placeholder="Telefoon (optioneel)" value={form.telefoon} onChange={(e) => update('telefoon', e.target.value)} />
        {showBedrijf && (
          <input className={cls} placeholder="Bedrijfsnaam" value={form.bedrijf} onChange={(e) => update('bedrijf', e.target.value)} />
        )}
        {showFormaat && (
          <input className={cls} placeholder="Gewenst formaat (bv. 100 x 150 cm)" value={form.gewenstFormaat} onChange={(e) => update('gewenstFormaat', e.target.value)} />
        )}
      </div>
      <textarea className={cls} rows={5} placeholder="Je bericht" value={form.bericht} onChange={(e) => update('bericht', e.target.value)} required />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-xl bg-ink px-6 py-3.5 font-medium text-canvas hover:bg-ink/90 disabled:opacity-60">
        {busy ? 'Versturen…' : 'Versturen'}
      </button>
    </form>
  )
}
