'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/admin/orders'
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Inloggen mislukt.')
        setBusy(false)
        return
      }
      router.replace(next)
      router.refresh()
    } catch {
      setError('Er ging iets mis. Probeer opnieuw.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm rounded-[6px] border border-ink/15 bg-paper p-8 shadow-hard-sm">
      <p className="label-caps text-accent-dark">Kunstdoekje</p>
      <h1 className="mt-2 font-serif text-3xl">Beheer</h1>
      <p className="mt-2 text-sm text-ink/60">Log in om bestellingen te beheren.</p>

      <label className="mt-6 block text-sm font-semibold text-ink">Wachtwoord</label>
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-2 w-full rounded-[3px] border border-ink/25 bg-canvas px-4 py-3 text-ink outline-none focus:border-accent"
        placeholder="••••••••"
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary mt-6 w-full justify-center disabled:opacity-60">
        {busy ? 'Bezig…' : 'Inloggen'}
      </button>
    </form>
  )
}

export default function AdminLogin() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <Suspense fallback={<div className="h-10" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
