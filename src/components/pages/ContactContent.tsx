'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function ContactContent() {
  const reduce = useReducedMotion() ?? false
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
        setErrorMsg(data.error ?? 'Er ging iets mis. Probeer het opnieuw of mail direct naar hello@doen.team.')
        setFormState('error')
        return
      }
      setFormState('success')
      setFormData({ naam: '', email: '', bericht: '' })
    } catch {
      setErrorMsg('Geen verbinding. Probeer het opnieuw of mail direct naar hello@doen.team.')
      setFormState('error')
    }
  }

  return (
    <div className="bg-bg">
      <section className="container-site pt-28 md:pt-44 pb-14 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-20">
          {/* Links: intro + gegevens.
              Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade). */}
          <div className="lg:col-span-2">
            <div>
              <h1
                className="font-heading font-bold text-petrol leading-[1.0] mb-6"
                style={{ fontSize: 'clamp(38px, 5vw, 64px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                  <span className="hero-line" style={{ animationDelay: '0.05s' }}>
                    Vraag stellen?
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                  <span className="hero-line text-muted" style={{ animationDelay: '0.15s' }}>
                    Gewoon doen<span className="text-flame">.</span>
                  </span>
                </span>
              </h1>
              <p className="hero-fade text-[16px] md:text-[17px] leading-[1.6] text-ink max-w-md mb-6 md:mb-10" style={{ animationDelay: '0.3s' }}>
                Nieuwsgierig, een idee, of wil je weten of doen. bij je past?
                Vertel wat je bezighoudt. We reageren binnen één werkdag.
              </p>
            </div>

            <div className="hero-fade" style={{ animationDelay: '0.4s' }}>
              <dl>
                <div className="flex items-baseline justify-between gap-4 py-4 border-t border-petrol/10">
                  <dt className="text-[14px] text-muted shrink-0">Email</dt>
                  <dd>
                    <a href="mailto:hello@doen.team" className="text-[15px] font-semibold text-petrol hover:text-flame transition-colors">
                      hello@doen.team
                    </a>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-4 border-t border-petrol/10">
                  <dt className="text-[14px] text-muted shrink-0">Reactietijd</dt>
                  <dd className="text-[15px] font-semibold text-petrol">Binnen één werkdag</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-4 border-t border-b border-petrol/10">
                  <dt className="text-[14px] text-muted shrink-0">Demo plannen</dt>
                  <dd>
                    <a
                      href="mailto:hello@doen.team?subject=Plan%20een%20demo"
                      className="text-[15px] font-semibold text-petrol hover:text-flame transition-colors"
                    >
                      Mail ons, we plannen direct iets in
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Liever direct beginnen */}
            <div className="hero-fade" style={{ animationDelay: '0.5s' }}>
              <div className="relative overflow-hidden rounded-[8px] bg-petrol-deep p-7 md:p-8 mt-8 md:mt-10">
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse 90% 100% at 90% 0%, rgba(42,111,122,0.5) 0%, rgba(42,111,122,0) 65%)',
                  }}
                />
                <p
                  className="relative font-heading font-bold text-white leading-[1.05] mb-2"
                  style={{ fontSize: 'clamp(24px, 2.6vw, 30px)', letterSpacing: '-0.03em' }}
                >
                  Liever direct beginnen<span className="text-flame">?</span>
                </p>
                <p className="relative text-[14px] leading-[1.55] mb-6" style={{ color: 'rgba(226,240,241,0.82)' }}>
                  Maak een account en zet je eerste offerte vandaag de deur uit.
                </p>
                <a
                  href="https://app.doen.team/register"
                  className="relative group inline-flex items-center gap-2.5 text-[15px] font-semibold text-white bg-flame px-7 h-[54px] rounded-[6px] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Start gratis</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
                </a>
                <p className="relative text-[13px] mt-5" style={{ color: 'rgba(226,240,241,0.55)' }}>
                  30 dagen gratis · geen creditcard · maandelijks opzegbaar
                </p>
              </div>
            </div>
          </div>

          {/* Rechts: formulier */}
          <div className="hero-fade lg:col-span-3" style={{ animationDelay: '0.35s' }}>
            <div className="bg-white rounded-[8px] border border-petrol/10 p-6 md:p-12">
              <AnimatePresence mode="wait">
                {formState === 'success' ? (
                  <SuccessState key="success" reduce={reduce} />
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2
                      className="font-heading font-bold text-petrol leading-[1.1] mb-8"
                      style={{ fontSize: 'clamp(24px, 3vw, 32px)', letterSpacing: '-0.03em' }}
                    >
                      Stuur een bericht<span className="text-flame">.</span>
                    </h2>

                    <Field
                      id="naam"
                      label="Naam"
                      value={formData.naam}
                      onChange={(v) => setFormData({ ...formData, naam: v })}
                      required
                      autoComplete="name"
                    />
                    <Field
                      id="email"
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(v) => setFormData({ ...formData, email: v })}
                      required
                      autoComplete="email"
                    />
                    <Field
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
                        className="text-[14px] leading-snug px-4 py-3 rounded-[6px] border border-flame/25 bg-flame/5"
                        style={{ color: '#A03318' }}
                      >
                        {errorMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={formState === 'loading'}
                      className="group w-full inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white bg-flame h-[54px] rounded-[6px] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {formState === 'loading' ? (
                        <>
                          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          <span>Versturen…</span>
                        </>
                      ) : (
                        <>
                          <span>Verstuur bericht</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
                        </>
                      )}
                    </button>

                    <p className="text-[13px] text-center text-muted">
                      Door te versturen ga je akkoord dat we je éénmalig mogen terugmailen.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Wayfinding: op mobiel verborgen, dezelfde links staan in de footer */}
        <div className="hero-fade hidden md:block" style={{ animationDelay: '0.5s' }}>
          <div className="mt-20 pt-10 text-center border-t border-petrol/10">
            <p className="text-[14px] text-muted mb-4">Of ontdek eerst meer</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
                { href: '/features', label: 'Alle modules' },
                { href: '/prijzen', label: 'Prijzen' },
                { href: '/over', label: 'Ons verhaal' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink"
                >
                  <span className="relative">
                    {link.label}
                    <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-ink/30" />
                  </span>
                  <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */

function Field({
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
  const commonClasses =
    'w-full px-4 rounded-[6px] bg-bg text-ink text-[16px] border border-petrol/15 outline-none transition-[border-color,box-shadow] duration-200 focus:border-flame focus:ring-[3px] focus:ring-flame/15'

  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-ink mb-2">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={5}
          className={`${commonClasses} py-3 resize-none`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          className={`${commonClasses} h-[50px]`}
        />
      )}
    </div>
  )
}

function SuccessState({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easing }}
      className="text-center py-12"
    >
      <div className="w-14 h-14 rounded-full bg-flame flex items-center justify-center mx-auto mb-6">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <motion.path
            d="M5 12l5 5 9-11"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easing }}
          />
        </svg>
      </div>
      <p
        className="font-heading font-bold text-petrol leading-none mb-3"
        style={{ fontSize: 'clamp(26px, 3vw, 32px)', letterSpacing: '-0.03em' }}
      >
        Verstuurd<span className="text-flame">.</span>
      </p>
      <p className="text-[15px] max-w-xs mx-auto leading-[1.6] text-muted">
        We reageren binnen één werkdag. Kijk voor de zekerheid ook in je spam-folder.
      </p>
    </motion.div>
  )
}
