'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, MessageCircle, Clock, ArrowRight, type LucideIcon } from 'lucide-react'
import SectionReveal from '../SectionReveal'
import AnimatedLink from '../AnimatedLink'
import PageBackdrop from '../PageBackdrop'
import { TrimCorners, FlameStamp } from '../brand/BrandMarks'
import SerifItalic from '../SerifItalic'

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'
const MUTED_SOFT = '#6B6B66'

export default function ContactContent() {
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [formData, setFormData] = useState({ naam: '', email: '', bericht: '' })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('loading')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setErrorMsg(data.error ?? 'Er ging iets mis. Probeer het opnieuw of mail direct naar info@signcompany.nl.')
        setFormState('error')
        return
      }
      setFormState('success')
      setFormData({ naam: '', email: '', bericht: '' })
    } catch {
      setErrorMsg('Geen verbinding. Probeer het opnieuw of mail direct naar info@signcompany.nl.')
      setFormState('error')
    }
  }

  return (
    <div className="pt-28 md:pt-36" style={{ backgroundColor: '#F3F2ED' }}>
      <section className="pb-20 md:pb-32 relative overflow-hidden">
        <PageBackdrop variant="flame" />
        <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />
        <FlameStamp size={420} opacity={0.05} style={{ bottom: -180, right: -180 }} />

        <div className="container-site relative">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 md:gap-12 lg:gap-20">
            {/* Left: info (2 cols) */}
            <div className="lg:col-span-2">
              <SectionReveal>
                <div className="inline-flex items-center gap-2 mb-6">
                  <span className="relative inline-flex items-center justify-center w-2 h-2">
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: FLAME, opacity: 0.45 }} />
                    <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FLAME }} />
                  </span>
                  <span className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase" style={{ color: MUTED }}>
                    Contact
                  </span>
                </div>
                <h1
                  className="font-heading font-bold tracking-[-1px] md:tracking-[-3px] leading-[1.0] md:leading-[0.92] mb-5 md:mb-6"
                  style={{ fontSize: 'clamp(36px, 6.5vw, 72px)', color: PETROL }}
                >
                  <span className="block">Vraag stellen<span style={{ color: FLAME }}>?</span></span>
                  <span className="block" style={{ color: '#6B6B66' }}>
                    <SerifItalic style={{ letterSpacing: '-1px' }}>Gewoon</SerifItalic> doen
                    <span style={{ color: FLAME }}>.</span>
                  </span>
                </h1>
                <p className="text-[15px] md:text-[18px] leading-[1.6] mb-8 md:mb-10 max-w-md" style={{ color: '#3F3F3A' }}>
                  <span className="md:hidden">Vraag, idee of nieuwsgierig? Mail ons. Reactie binnen één werkdag.</span>
                  <span className="hidden md:inline">
                    Nieuwsgierig, een idee, of wil je weten of doen. bij je past? Vertel
                    wat je bezighoudt. We reageren binnen één werkdag.
                  </span>
                </p>
              </SectionReveal>

              <SectionReveal delay={0.15}>
                <div className="space-y-3">
                  <ContactCard
                    icon={Mail}
                    label="Email"
                    value="info@signcompany.nl"
                    href="mailto:info@signcompany.nl"
                  />
                  <ContactCard
                    icon={Clock}
                    label="Reactietijd"
                    value="Binnen één werkdag"
                  />
                  <ContactCard
                    icon={MessageCircle}
                    label="Liever chatten"
                    value="Plan een gesprek"
                    subtitle="Mail ons, we plannen direct iets in"
                    href="mailto:info@signcompany.nl?subject=Plan%20een%20demo"
                  />
                </div>
              </SectionReveal>

              {/* Inline register CTA — branded petrol card */}
              <SectionReveal delay={0.25}>
                <div
                  className="mt-10 rounded-[14px] p-6 md:p-7 relative overflow-hidden"
                  style={{
                    backgroundColor: '#0F3A42',
                    boxShadow: '0 16px 32px -14px rgba(20,40,40,0.30)',
                  }}
                >
                  <div
                    aria-hidden
                    className="absolute -top-16 -right-16 w-[220px] h-[220px] rounded-full pointer-events-none"
                    style={{ backgroundColor: FLAME, opacity: 0.14, filter: 'blur(70px)' }}
                  />
                  <p className="relative font-mono text-[10px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Liever direct
                  </p>
                  <p className="relative font-heading text-[22px] md:text-[26px] font-bold tracking-[-0.5px] leading-[1.1] text-white mb-2">
                    Begin nu<span style={{ color: FLAME }}>.</span>
                  </p>
                  <p className="relative text-[13.5px] mb-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    Maak een account en zet je eerste offerte vandaag de deur uit.
                  </p>
                  <a
                    href="https://app.doen.team/register"
                    className="relative inline-flex items-center justify-center gap-2 font-semibold text-[14px] text-white px-6 h-[48px] rounded-full whitespace-nowrap transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: FLAME,
                      boxShadow: '0 8px 22px rgba(241,80,37,0.36)',
                    }}
                  >
                    <span>Start gratis</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </a>
                </div>
              </SectionReveal>
            </div>

            {/* Right: form (3 cols) */}
            <div className="lg:col-span-3">
              <SectionReveal delay={0.1}>
                <div
                  className="rounded-[16px] p-6 md:p-12 relative overflow-hidden"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #1A535C',
                    boxShadow:
                      '0 1px 2px rgba(26,83,92,0.04), 0 16px 32px -14px rgba(20,40,40,0.18)',
                  }}
                >
                  {/* Flame accent strip top */}
                  <div
                    aria-hidden
                    className="absolute top-0 left-0 right-0 h-[3px]"
                    style={{ backgroundColor: FLAME }}
                  />
                  {/* Corner glow */}
                  <div
                    aria-hidden
                    className="absolute -top-24 -right-24 w-56 h-56 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${FLAME}16 0%, transparent 70%)` }}
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
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-px" style={{ backgroundColor: FLAME }} />
                          <p
                            className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase"
                            style={{ color: MUTED_SOFT }}
                          >
                            Stuur een bericht
                          </p>
                        </div>
                        <p className="font-heading text-[24px] md:text-[28px] font-bold tracking-[-0.5px] leading-[1.15] mb-6 md:mb-8" style={{ color: PETROL }}>
                          Wat kunnen we voor je <SerifItalic>doen</SerifItalic><span style={{ color: FLAME }}>?</span>
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

                        {formState === 'error' && errorMsg && (
                          <p
                            role="alert"
                            className="text-[13px] leading-snug px-3 py-2 rounded-[8px]"
                            style={{
                              color: '#A03318',
                              backgroundColor: 'rgba(241,80,37,0.08)',
                              border: '1px solid rgba(241,80,37,0.25)',
                            }}
                          >
                            {errorMsg}
                          </p>
                        )}

                        <motion.button
                          type="submit"
                          disabled={formState === 'loading'}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                          className="w-full inline-flex items-center justify-center gap-2 font-semibold text-[15px] text-white h-14 rounded-full disabled:opacity-70 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: FLAME,
                            boxShadow: '0 8px 24px rgba(241,80,37,0.32)',
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
                              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
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
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="flex items-center gap-4 rounded-[12px] p-4 group transition-shadow"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(26,83,92,0.10)',
          boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 6px 14px -8px rgba(20,40,40,0.10)',
        }}
      >
        {content}
        <span aria-hidden className="ml-auto opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" style={{ color: FLAME }}>→</span>
      </motion.a>
    )
  }

  return (
    <div
      className="flex items-center gap-4 rounded-[12px] p-4"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(26,83,92,0.10)',
        boxShadow: '0 1px 2px rgba(20,40,40,0.04)',
      }}
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

  const commonClasses = `w-full px-4 rounded-xl outline-none transition-all duration-200 text-[16px]`
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
