'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const OPTIES: { value: string; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'In behandeling' },
  { value: 'paid', label: 'Betaald' },
  { value: 'failed', label: 'Mislukt' },
  { value: 'expired', label: 'Verlopen' },
  { value: 'canceled', label: 'Geannuleerd' },
  { value: 'refunded', label: 'Terugbetaald' },
]

export default function OrderStatusControl({ id, current }: { id: string; current: string }) {
  const router = useRouter()
  const [status, setStatus] = useState(current)
  const [busy, setBusy] = useState(false)
  const dirty = status !== current

  async function save() {
    setBusy(true)
    try {
      await fetch(`/api/admin/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-[3px] border border-ink/25 bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
      >
        {OPTIES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={!dirty || busy}
        className="rounded-[3px] border border-ink bg-ink px-3 py-2 text-sm font-semibold text-canvas transition disabled:opacity-40"
      >
        {busy ? 'Bezig…' : 'Opslaan'}
      </button>
    </div>
  )
}
