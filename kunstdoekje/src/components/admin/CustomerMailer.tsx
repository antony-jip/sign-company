'use client'

import { useState } from 'react'

type Template = { label: string; subject: (nr: string) => string; body: string }

const TEMPLATES: Template[] = [
  {
    label: 'Verzonden',
    subject: (nr) => `Je bestelling ${nr} is verzonden`,
    body: 'Goed nieuws! Je bestelling is zojuist verzonden en is onderweg naar je toe.\n\nHeb je vragen? Je kunt gewoon op deze mail antwoorden.\n\nGroet,\nKunstdoekje',
  },
  {
    label: 'In productie',
    subject: (nr) => `Update over je bestelling ${nr}`,
    body: 'We zijn je kunstdoek aan het maken — het wordt op bestelling in Nederland geprint. Zodra het verzonden is, laten we het je weten.\n\nGroet,\nKunstdoekje',
  },
  {
    label: 'Vraag',
    subject: (nr) => `Vraag over je bestelling ${nr}`,
    body: 'Hoi,\n\n',
  },
]

export default function CustomerMailer({
  id,
  email,
  orderNumber,
}: {
  id: string
  email: string
  orderNumber: string
}) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function applyTemplate(t: Template) {
    setSubject(t.subject(orderNumber))
    setMessage(t.body)
    setDone(false)
    setError('')
  }

  async function send() {
    setBusy(true)
    setError('')
    setDone(false)
    try {
      const res = await fetch(`/api/admin/orders/${id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Versturen mislukt.')
      } else {
        setDone(true)
        setMessage('')
        setSubject('')
      }
    } catch {
      setError('Er ging iets mis.')
    } finally {
      setBusy(false)
    }
  }

  const canSend = subject.trim() && message.trim() && !busy

  return (
    <section className="mt-6 rounded-[5px] border border-ink/15 bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/45">Mail de klant</h2>
        <span className="text-xs text-ink/50">naar {email}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => applyTemplate(t)}
            className="rounded-full border border-ink/25 px-3 py-1 text-xs font-semibold text-ink/65 transition hover:border-ink hover:text-ink"
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Onderwerp"
        className="mt-3 w-full rounded-[3px] border border-ink/25 bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Je bericht aan de klant…"
        rows={6}
        className="mt-2 w-full resize-y rounded-[3px] border border-ink/25 bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={send}
          disabled={!canSend}
          className="rounded-[3px] border border-ink bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:border-accent hover:bg-accent hover:text-ink disabled:opacity-40"
        >
          {busy ? 'Versturen…' : 'Verstuur e-mail'}
        </button>
        {done && <span className="text-sm text-green-700">Verstuurd ✓</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </section>
  )
}
