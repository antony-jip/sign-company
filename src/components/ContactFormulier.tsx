'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1]

/* Eén formulier voor twee plekken: de vraagbaak op /contact en het
   plannen van een rondleiding. Beide posten naar /api/contact, dat
   alleen naam, e-mail en bericht kent. De extra velden van de
   rondleiding (bedrijf, wanneer het schikt) worden daarom in het
   bericht gevouwen, zodat de mail compleet aankomt zonder dat de
   API-route mee hoeft te veranderen. */

export default function ContactFormulier({
  titel,
  knopLabel = 'Verstuur bericht',
  beginBericht = '',
  berichtLabel = 'Bericht',
  berichtHint,
  berichtVerplicht = true,
  terugvalBericht = '',
  extra = false,
  idPrefix = 'contact',
  succesTitel = 'Verstuurd',
  succesTekst = 'We reageren binnen één werkdag. Kijk voor de zekerheid ook in je spam-folder.',
}: {
  titel: string
  knopLabel?: string
  beginBericht?: string
  berichtLabel?: string
  berichtHint?: string
  /** Uit op het rondleidingsformulier: naam, mail en een moment is genoeg. */
  berichtVerplicht?: boolean
  /** Gaat mee als het bericht leeg mag zijn en leeg blijft, zodat de mail leesbaar aankomt. */
  terugvalBericht?: string
  extra?: boolean
  idPrefix?: string
  succesTitel?: string
  succesTekst?: string
}) {
  const reduce = useReducedMotion() ?? false
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [formData, setFormData] = useState({
    naam: '',
    email: '',
    bedrijf: '',
    moment: '',
    bericht: beginBericht,
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('loading')
    setErrorMsg(null)

    const regels = [formData.bericht.trim() || terugvalBericht]
    if (extra) {
      if (formData.bedrijf.trim()) regels.push(`Bedrijf: ${formData.bedrijf.trim()}`)
      if (formData.moment.trim()) regels.push(`Schikt: ${formData.moment.trim()}`)
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naam: formData.naam,
          email: formData.email,
          bericht: regels.filter(Boolean).join('\n\n'),
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setErrorMsg(data.error ?? 'Er ging iets mis. Probeer het later nog eens.')
        setFormState('error')
        return
      }
      setFormState('success')
      setFormData({ naam: '', email: '', bedrijf: '', moment: '', bericht: '' })
    } catch {
      setErrorMsg('Geen verbinding. Probeer het later nog eens.')
      setFormState('error')
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {formState === 'success' ? (
        <SuccessState key="success" reduce={reduce} titel={succesTitel} tekst={succesTekst} />
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
            {titel}
            <span className="text-flame">.</span>
          </h2>

          <Field
            id={`${idPrefix}-naam`}
            label="Naam"
            value={formData.naam}
            onChange={(v) => setFormData({ ...formData, naam: v })}
            required
            autoComplete="name"
          />
          <Field
            id={`${idPrefix}-email`}
            label="Email"
            type="email"
            value={formData.email}
            onChange={(v) => setFormData({ ...formData, email: v })}
            required
            autoComplete="email"
          />
          {extra && (
            <>
              <Field
                id={`${idPrefix}-bedrijf`}
                label="Bedrijf"
                value={formData.bedrijf}
                onChange={(v) => setFormData({ ...formData, bedrijf: v })}
                autoComplete="organization"
              />
              <Field
                id={`${idPrefix}-moment`}
                label="Wanneer schikt het"
                hint="Bijvoorbeeld: dinsdagochtend, of na vijven"
                value={formData.moment}
                onChange={(v) => setFormData({ ...formData, moment: v })}
              />
            </>
          )}
          <Field
            id={`${idPrefix}-bericht`}
            label={berichtLabel}
            hint={berichtHint}
            value={formData.bericht}
            onChange={(v) => setFormData({ ...formData, bericht: v })}
            required={berichtVerplicht}
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
                <span>{knopLabel}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </>
            )}
          </button>

          <p className="text-[13px] text-center text-muted">
            We gebruiken je naam, e-mailadres en bericht alleen om je vraag te
            beantwoorden. Zie de{' '}
            <Link href="/privacy" className="font-semibold text-petrol underline underline-offset-2 hover:text-flame transition-colors">
              privacyverklaring
            </Link>
            .
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────────────────── */

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  type = 'text',
  multiline = false,
  required,
  autoComplete,
}: {
  id: string
  label: string
  hint?: string
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
        {hint && <span className="ml-2 font-normal text-muted">{hint}</span>}
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

function SuccessState({ reduce, titel, tekst }: { reduce: boolean; titel: string; tekst: string }) {
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
        {titel}
        <span className="text-flame">.</span>
      </p>
      <p className="text-[15px] max-w-xs mx-auto leading-[1.6] text-muted">{tekst}</p>
    </motion.div>
  )
}
