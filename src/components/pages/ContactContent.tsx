'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionReveal from '../SectionReveal'

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
    <div className="pt-32 md:pt-40">
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <div className="max-w-2xl mx-auto">
            <SectionReveal>
              <p className="font-mono text-sm text-flame mb-4">Contact</p>
              <h1 className="hero-heading font-heading text-petrol mb-6">
                Laten we praten<span className="text-flame">.</span>
              </h1>
              <p className="text-muted text-lg mb-12">
                Een vraag, een idee, of gewoon nieuwsgierig? We reageren binnen
                een werkdag. Gewoon doen<span className="text-flame">.</span>
              </p>
            </SectionReveal>

            {/* Contact info */}
            <SectionReveal delay={0.2}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                <a
                  href="mailto:info@doen.team"
                  className="bg-white rounded-xl p-6 border border-ink/[0.04] hover:border-flame/20 transition-colors duration-200 group"
                >
                  <p className="font-mono text-xs text-muted mb-2">Email</p>
                  <p className="text-petrol font-medium group-hover:text-flame transition-colors">
                    info@doen.team
                  </p>
                </a>
                <a
                  href="https://wa.me/31612345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl p-6 border border-ink/[0.04] hover:border-flame/20 transition-colors duration-200 group"
                >
                  <p className="font-mono text-xs text-muted mb-2">WhatsApp</p>
                  <p className="text-petrol font-medium group-hover:text-flame transition-colors">
                    Stuur een bericht
                  </p>
                </a>
              </div>
            </SectionReveal>

            {/* Form */}
            <SectionReveal delay={0.3}>
              <div className="bg-white rounded-2xl p-8 md:p-10 border border-ink/[0.04]">
                <AnimatePresence mode="wait">
                  {formState === 'success' ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-8"
                    >
                      <p className="font-heading text-xl text-petrol mb-2">
                        Bericht verstuurd<span className="text-flame">.</span>
                      </p>
                      <p className="text-muted text-sm">
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
                        <label htmlFor="naam" className="block text-sm font-medium text-ink mb-1.5">
                          Naam
                        </label>
                        <input
                          id="naam"
                          type="text"
                          required
                          value={formData.naam}
                          onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg text-sm bg-bg border border-ink/10 focus:border-flame outline-none transition-colors min-h-[48px]"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg text-sm bg-bg border border-ink/10 focus:border-flame outline-none transition-colors min-h-[48px]"
                        />
                      </div>
                      <div>
                        <label htmlFor="bericht" className="block text-sm font-medium text-ink mb-1.5">
                          Bericht
                        </label>
                        <textarea
                          id="bericht"
                          required
                          rows={5}
                          value={formData.bericht}
                          onChange={(e) => setFormData({ ...formData, bericht: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg text-sm bg-bg border border-ink/10 focus:border-flame outline-none transition-colors resize-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={formState === 'loading'}
                        className="bg-flame text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-flame/90 transition-colors duration-200 disabled:opacity-60 min-h-[48px]"
                      >
                        {formState === 'loading' ? 'Versturen...' : 'Verstuur bericht.'}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>
    </div>
  )
}
