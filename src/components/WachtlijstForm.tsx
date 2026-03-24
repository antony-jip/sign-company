'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function WachtlijstForm({ variant = 'default' }: { variant?: 'default' | 'dark' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')

    // Simulate API call, replace with Supabase or API route later
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  const isDark = variant === 'dark'

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-center py-4 ${isDark ? 'text-white' : 'text-petrol'}`}
          >
            <p className="font-heading text-xl">
              Goed bezig<span className="text-flame">.</span>
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-muted'}`}>
              We melden ons.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="je@email.nl"
              required
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-sans outline-none transition-all duration-200 min-w-0 ${
                isDark
                  ? 'bg-white/10 text-white placeholder:text-white/40 border border-white/20 focus:border-flame'
                  : 'bg-white text-ink placeholder:text-muted/50 border border-ink/10 focus:border-flame shadow-sm'
              }`}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-flame text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-flame/90 transition-colors duration-200 whitespace-nowrap disabled:opacity-60 min-h-[48px]"
            >
              {status === 'loading' ? 'Even wachten...' : 'Ik doe mee.'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      {status === 'error' && (
        <p className="text-flame text-sm mt-2">Er ging iets mis. Probeer het opnieuw.</p>
      )}
    </div>
  )
}
