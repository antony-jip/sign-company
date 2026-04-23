'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, MessageCircle, Clock, type LucideIcon } from 'lucide-react'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'
import AnimatedLink from '../AnimatedLink'

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'
const MUTED_SOFT = '#9B9B95'

export default function ContactContent() {
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [formData, setFormData] = useState({ naam: '', email: '', bericht: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('loading')
    await new Promise((r) => setTimeout(r, 900))
    setFormState('success')
    setFormData({ naam: '', email: '', bericht: '' })
  }

  return (
    <div className="pt-28 md:pt-36">
      <section className="pb-20 md:pb-32 relative overflow-hidden">
        {/* Ambient radial behind */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 20% 0%, rgba(241,80,37,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(26,83,92,0.04) 0%, transparent 50%)',
          }}
        />

        <div className="container-site relative">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20">
            {/* Left: info (2 cols) */}
            <div className="lg:col-span-2">
              <SectionReveal>
                <p
                  className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4"
                  style={{ color: FLAME }}
                >
                  Contact
                </p>
                <h1
                  className="font-heading text-[44px] md:text-[56px] font-extrabold tracking-[-2.5px] leading-[0.95] mb-6"
                  style={{ color: PETROL }}
                >
                  Vraag stellen
                  <span style={{ color: FLAME }}>?</span>
                  <br />
                  <span style={{ color: MUTED_SOFT }}>Gewoon doen</span>
                  <span style={{ color: FLAME }}>.</span>
                </h1>
                <p className="text-[17px] leading-relaxed mb-10 max-w-md" style={{ color: MUTED }}>
                  Nieuwsgierig, een idee, of wil je weten of doen. bij je past? Vertel
                  wat je bezighoudt. We reageren binnen één werkdag.
                </p>
              </SectionReveal>

              <SectionReveal delay={0.15}>
                <div className="space-y-3">
                  <ContactCard
                    icon={Mail}
                    label="Email"
                    value="hello@doen.team"
                    href="mailto:hello@doen.team"
                  />
                  <ContactCard
                    icon={Clock}
                    label="Reactietijd"
                    value="Binnen één werkdag"
                  />
                  <ContactCard
                    icon={MessageCircle}
                    label="Liever chatten"
                    value="hello@doen.team"
                    subtitle="Mail en we plannen direct een gesprek in"
                    href="mailto:hello@doen.team?subject=Plan%20een%20demo"
                  />
                </div>
              </SectionReveal>

              {/* Wachtlijst inline CTA */}
              <SectionReveal delay={0.25}>
                <div
                  className="mt-10 rounded-2xl p-6"
                  style={{
                    backgroundColor: 'rgba(26,83,92,0.04)',
                    border: '1px solid rgba(26,83,92,0.08)',
                  }}
                >
                  <p className="text-[13px] font-semibold mb-1" style={{ color: PETROL }}>
                    Liever direct beginnen<span style={{ color: FLAME }}>?</span>
                  </p>
                  <p className="text-[13px] mb-4" style={{ color: MUTED }}>
                    Schrijf je in voor early access — we mailen zodra doen. live gaat.
                  </p>
                  <WachtlijstForm />
                </div>
              </SectionReveal>
            </div>

            {/* Right: form (3 cols) */}
            <div className="lg:col-span-3">
              <SectionReveal delay={0.1}>
                <div
                  className="rounded-3xl p-8 md:p-12 relative overflow-hidden"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(26,83,92,0.08)',
                    boxShadow:
                      '0 1px 2px rgba(26,83,92,0.04), 0 8px 24px rgba(26,83,92,0.05), 0 24px 60px rgba(26,83,92,0.04)',
                  }}
                >
                  {/* Corner accent */}
                  <div
                    aria-hidden
                    className="absolute -top-24 -right-24 w-48 h-48 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${FLAME}11 0%, transparent 70%)` }}
                  />

                  <AnimatePresence mode="wait">
                    {formState === 'success' ? (
                      <SuccessState key="success" />
                    ) : (
                      <motion.form
                        key="form"
                        onSubmit={handleSubmit}
                        className="space-y-5 relative"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p
                          className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-6"
                          style={{ color: MUTED_SOFT }}
                        >
                          Stuur een bericht
                        </p>

                        <FloatingField
                          id="naam"
                          label="Naam"
                          value={formData.naam}
                          onChange={(v) => setFormData({ ...formData, naam: v })}
                          required
                        />
                        <FloatingField
                          id="email"
                          label="Email"
                          type="email"
                          value={formData.email}
                          onChange={(v) => setFormData({ ...formData, email: v })}
                          required
                          autoComplete="email"
                        />
                        <FloatingField
                          id="bericht"
                          label="Bericht"
                          value={formData.bericht}
                          onChange={(v) => setFormData({ ...formData, bericht: v })}
                          required
                          multiline
                        />

                        <motion.button
                          type="submit"
                          disabled={formState === 'loading'}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                          className="w-full inline-flex items-center justify-center gap-2 font-semibold text-[15px] text-white h-14 rounded-xl disabled:opacity-70 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: FLAME,
                            boxShadow: '0 6px 18px rgba(241,80,37,0.3)',
                          }}
                        >
                          {formState === 'loading' ? (
                            <>
                              <svg
                                className="animate-spin"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                              </svg>
                              <span>Versturen…</span>
                            </>
                          ) : (
                            <>
                              <span>Verstuur bericht</span>
                              <span aria-hidden>→</span>
                            </>
                          )}
                        </motion.button>

                        <p className="text-[11px] mt-4 text-center" style={{ color: MUTED_SOFT }}>
                          Door te versturen ga je akkoord dat we je éénmalig mogen terug-mailen.
                        </p>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </SectionReveal>
            </div>
          </div>

          {/* Footer wayfinding */}
          <SectionReveal delay={0.3}>
            <div
              className="mt-20 pt-10 text-center"
              style={{ borderTop: '1px solid rgba(26,83,92,0.08)' }}
            >
              <p className="text-[13px] mb-4" style={{ color: MUTED_SOFT }}>
                Of ontdek eerst meer
              </p>
              <div
                className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[14px]"
                style={{ color: PETROL }}
              >
                <AnimatedLink href="/hoe-het-werkt" accent={FLAME}>
                  Hoe het werkt
                </AnimatedLink>
                <AnimatedLink href="/features" accent={FLAME}>
                  Alle modules
                </AnimatedLink>
                <AnimatedLink href="/prijzen" accent={FLAME}>
                  Prijzen
                </AnimatedLink>
                <AnimatedLink href="/over" accent={FLAME}>
                  Waarom doen.
                </AnimatedLink>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */

function ContactCard({
  icon: Icon,
  label,
  value,
  subtitle,
  href,
}: {
  icon: LucideIcon
  label: string
  value: string
  subtitle?: string
  href?: string
}) {
  const content = (
    <>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200"
        style={{ backgroundColor: 'rgba(26,83,92,0.08)' }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color: PETROL }} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: MUTED_SOFT }}>
          {label}
        </p>
        <p className="text-[15px] font-semibold transition-colors" style={{ color: PETROL }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-[12px] mt-1" style={{ color: MUTED }}>
            {subtitle}
          </p>
        )}
      </div>
    </>
  )

  if (href) {
    return (
      <motion.a
        href={href}
        whileHover={{ x: 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="flex items-center gap-4 rounded-xl p-4 group"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(26,83,92,0.06)' }}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <div
      className="flex items-center gap-4 rounded-xl p-4"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(26,83,92,0.06)' }}
    >
      {content}
    </div>
  )
}

function FloatingField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  multiline = false,
  required,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  multiline?: boolean
  required?: boolean
  autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0
  const isFloating = focused || hasValue

  const commonClasses = `w-full px-4 rounded-xl outline-none transition-all duration-200 text-[14px]`
  const baseStyle: React.CSSProperties = {
    backgroundColor: '#FAFAF7',
    border: `1.5px solid ${focused ? FLAME : '#EBEBEB'}`,
    boxShadow: focused ? `0 0 0 3px ${FLAME}18` : 'none',
    color: '#1A1A1A',
  }

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={`absolute left-4 pointer-events-none transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFloating ? 'top-2 text-[10px] font-mono font-bold tracking-[0.12em] uppercase' : 'top-4 text-[14px]'
        }`}
        style={{
          color: isFloating ? (focused ? FLAME : MUTED_SOFT) : MUTED_SOFT,
        }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          rows={5}
          className={`${commonClasses} pt-7 pb-3 resize-none`}
          style={baseStyle}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          autoComplete={autoComplete}
          className={`${commonClasses} pt-7 pb-3 h-14`}
          style={baseStyle}
        />
      )}
    </div>
  )
}

function SuccessState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="text-center py-12"
    >
      <div className="relative w-16 h-16 mx-auto mb-6">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{
            backgroundColor: FLAME,
            boxShadow: '0 4px 20px rgba(241,80,37,0.4), 0 0 0 8px rgba(241,80,37,0.12)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
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
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const distance = 38
          return (
            <motion.span
              key={angle}
              aria-hidden
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
              style={{ backgroundColor: FLAME }}
              initial={{ x: -4, y: -4, scale: 0, opacity: 1 }}
              animate={{
                x: -4 + Math.cos(rad) * distance,
                y: -4 + Math.sin(rad) * distance,
                scale: [0, 1.2, 0],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.9, delay: 0.25 + i * 0.04, ease: 'easeOut' }}
            />
          )
        })}
      </div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="font-heading text-[28px] font-extrabold leading-none tracking-tight mb-2"
        style={{ color: PETROL }}
      >
        Verstuurd<span style={{ color: FLAME }}>.</span>
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="text-[15px] max-w-xs mx-auto leading-relaxed"
        style={{ color: MUTED }}
      >
        We reageren binnen één werkdag. Kijk ook in je spam-folder, voor de zekerheid.
      </motion.p>
    </motion.div>
  )
}
