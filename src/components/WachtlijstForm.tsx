'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const FLAME = '#F15025'
const PETROL = '#1A535C'

export default function WachtlijstForm({ variant = 'default' }: { variant?: 'default' | 'dark' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [focused, setFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')

    try {
      const res = await fetch('/api/wachtlijst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) throw new Error()

      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  const isDark = variant === 'dark'
  const hasValue = email.length > 0
  const labelFloating = focused || hasValue

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <SuccessBurst isDark={isDark} key="success" />
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            {/* Floating-label input */}
            <div className="flex-1 relative min-w-0">
              <label
                htmlFor="wachtlijst-email"
                className={`absolute left-4 pointer-events-none transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  labelFloating
                    ? 'top-1 text-[10px] font-mono font-bold tracking-[0.12em] uppercase'
                    : 'top-1/2 -translate-y-1/2 text-[14px]'
                }`}
                style={{
                  color: labelFloating
                    ? focused
                      ? FLAME
                      : isDark
                        ? 'rgba(255,255,255,0.55)'
                        : '#9B9B95'
                    : isDark
                      ? 'rgba(255,255,255,0.4)'
                      : '#9B9B95',
                }}
              >
                {labelFloating ? 'Jouw email' : 'je@email.nl'}
              </label>
              <input
                id="wachtlijst-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                required
                autoComplete="email"
                className={`w-full px-4 pt-5 pb-2 rounded-xl text-[14px] outline-none transition-all duration-200 ${
                  isDark
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-white text-ink border border-ink/10'
                }`}
                style={{
                  boxShadow: focused
                    ? `0 0 0 3px ${FLAME}22, 0 2px 8px rgba(241,80,37,0.12)`
                    : isDark
                      ? 'none'
                      : '0 1px 2px rgba(0,0,0,0.03)',
                  borderColor: focused ? FLAME : undefined,
                }}
              />
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={status === 'loading'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="inline-flex items-center justify-center gap-2 font-semibold text-[14px] text-white px-6 h-[56px] rounded-xl whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              style={{
                backgroundColor: FLAME,
                boxShadow: '0 4px 14px rgba(241,80,37,0.3)',
              }}
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span>Bezig…</span>
                </>
              ) : (
                <>
                  <span>Schrijf je in</span>
                  <span aria-hidden>→</span>
                </>
              )}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {status === 'error' && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[13px] mt-3"
            style={{ color: FLAME }}
          >
            Er ging iets mis. Probeer het opnieuw.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Success state met sparkle-burst en gedeelde-checkmark-animation. */
function SuccessBurst({ isDark }: { isDark: boolean }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative text-center py-5"
    >
      {/* Sparkles around checkmark */}
      <div className="relative w-14 h-14 mx-auto mb-4">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{
            backgroundColor: FLAME,
            boxShadow: '0 4px 18px rgba(241,80,37,0.4), 0 0 0 6px rgba(241,80,37,0.12)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <motion.path
              d="M5 12l5 5 9-11"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </motion.div>
        {/* 6 sparkles shooting out */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const distance = 32
          return (
            <motion.span
              key={angle}
              aria-hidden
              className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: FLAME }}
              initial={{ x: -3, y: -3, scale: 0, opacity: 1 }}
              animate={{
                x: -3 + Math.cos(rad) * distance,
                y: -3 + Math.sin(rad) * distance,
                scale: [0, 1.2, 0],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.04, ease: 'easeOut' }}
            />
          )
        })}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className={`font-heading text-[22px] font-extrabold leading-none tracking-tight ${isDark ? 'text-white' : ''}`}
        style={!isDark ? { color: PETROL } : undefined}
      >
        Goed bezig<span style={{ color: FLAME }}>.</span>
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className={`text-[14px] mt-2 ${isDark ? 'text-white/60' : ''}`}
        style={!isDark ? { color: '#6B6B66' } : undefined}
      >
        Je hoort van ons zodra doen. live gaat.
      </motion.p>
    </motion.div>
  )
}
