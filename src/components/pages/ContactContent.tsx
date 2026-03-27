'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

export default function ContactContent() {
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success'>('idle')
  const [formData, setFormData] = useState({ naam: '', email: '', bericht: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('loading')
    await new Promise((r) => setTimeout(r, 800))
    setFormState('success')
    setFormData({ naam: '', email: '', bericht: '' })
  }

  return (
    <div className="pt-28 md:pt-36">
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

            {/* Left: info */}
            <div>
              <SectionReveal>
                <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-flame mb-4">Contact</p>
                <h1 className="font-heading text-[40px] md:text-[48px] font-bold text-petrol tracking-[-2.5px] leading-[0.95] mb-6">
                  Vraag stellen<span className="text-flame">?</span><br />
                  Gewoon doen<span className="text-flame">.</span>
                </h1>
                <p className="text-[17px] leading-relaxed mb-10" style={{ color: '#6B6B66' }}>
                  Nieuwsgierig, een idee, of wil je weten of doen. bij je past? We reageren binnen een werkdag.
                </p>
              </SectionReveal>

              <SectionReveal delay={0.15}>
                <div className="space-y-4">
                  <a
                    href="mailto:hello@doen.team"
                    className="flex items-center gap-4 rounded-xl p-5 transition-all duration-200 group"
                    style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1A535C10' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A535C" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4L12 13 2 4" /></svg>
                    </div>
                    <div>
                      <p className="text-[13px] mb-0.5" style={{ color: '#9B9B95' }}>Email</p>
                      <p className="text-[15px] font-semibold group-hover:text-flame transition-colors" style={{ color: '#1A535C' }}>hello@doen.team</p>
                    </div>
                  </a>
                </div>
              </SectionReveal>

              {/* Wachtlijst CTA */}
              <SectionReveal delay={0.25}>
                <div className="mt-12 rounded-xl p-6" style={{ backgroundColor: '#1A535C08', border: '1px solid #1A535C12' }}>
                  <p className="text-[14px] font-semibold mb-1" style={{ color: '#1A535C' }}>
                    Liever direct beginnen<span className="text-flame">?</span>
                  </p>
                  <p className="text-[13px] mb-4" style={{ color: '#6B6B66' }}>
                    Schrijf je in voor early access. We mailen je zodra doen. live gaat.
                  </p>
                  <WachtlijstForm />
                </div>
              </SectionReveal>
            </div>

            {/* Right: form */}
            <div>
              <SectionReveal delay={0.1}>
                <div className="rounded-2xl p-8 md:p-10" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 8px rgba(0,0,0,0.03)' }}>
                  <AnimatePresence mode="wait">
                    {formState === 'success' ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                      >
                        <p className="font-heading text-[24px] font-bold mb-2" style={{ color: '#1A535C' }}>
                          Verstuurd<span className="text-flame">.</span>
                        </p>
                        <p className="text-[15px]" style={{ color: '#6B6B66' }}>
                          We reageren binnen een werkdag.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="form"
                        onSubmit={handleSubmit}
                        className="space-y-5"
                      >
                        <div>
                          <label htmlFor="naam" className="block text-[13px] font-medium mb-1.5" style={{ color: '#1A1A1A' }}>
                            Naam
                          </label>
                          <input
                            id="naam"
                            type="text"
                            required
                            value={formData.naam}
                            onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg text-[14px] outline-none transition-all duration-200"
                            style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}
                            onFocus={(e) => e.target.style.borderColor = '#1A535C'}
                            onBlur={(e) => e.target.style.borderColor = '#EBEBEB'}
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-[13px] font-medium mb-1.5" style={{ color: '#1A1A1A' }}>
                            Email
                          </label>
                          <input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg text-[14px] outline-none transition-all duration-200"
                            style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}
                            onFocus={(e) => e.target.style.borderColor = '#1A535C'}
                            onBlur={(e) => e.target.style.borderColor = '#EBEBEB'}
                          />
                        </div>
                        <div>
                          <label htmlFor="bericht" className="block text-[13px] font-medium mb-1.5" style={{ color: '#1A1A1A' }}>
                            Bericht
                          </label>
                          <textarea
                            id="bericht"
                            required
                            rows={5}
                            value={formData.bericht}
                            onChange={(e) => setFormData({ ...formData, bericht: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg text-[14px] outline-none transition-all duration-200 resize-none"
                            style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}
                            onFocus={(e) => e.target.style.borderColor = '#1A535C'}
                            onBlur={(e) => e.target.style.borderColor = '#EBEBEB'}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={formState === 'loading'}
                          className="w-full text-white font-semibold text-[15px] py-3.5 rounded-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                          style={{ backgroundColor: '#F15025' }}
                        >
                          {formState === 'loading' ? 'Versturen...' : 'Verstuur bericht'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </SectionReveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
