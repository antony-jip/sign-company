import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { signUp } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Check } from 'lucide-react'
import { firstBlockingError } from '@/lib/passwordValidation'
import { usePasswordCheck } from '@/lib/usePasswordCheck'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { ParticleField } from '../onboarding/ParticleField'
import { AuthProcesVisual } from './AuthProcesVisual'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
  },
}

export function RegisterPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const userInputs = useMemo(() => (email ? [email] : []), [email])
  const passwordCheck = usePasswordCheck(password, userInputs)
  const passwordsMatch = confirmPassword === '' || password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !confirmPassword) {
      toast.error('Vul alle velden in')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Voer een geldig emailadres in')
      return
    }
    const blocker = firstBlockingError(passwordCheck)
    if (blocker) {
      toast.error(blocker)
      return
    }
    if (password !== confirmPassword) {
      toast.error('Wachtwoorden komen niet overeen')
      return
    }

    setIsLoading(true)
    try {
      await signUp(email, password)
      navigate(`/check-inbox?email=${encodeURIComponent(email)}`)
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          toast.error('Dit emailadres is al in gebruik')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.error('Registreren mislukt. Probeer opnieuw.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DoenAuthShell>
      <DoenAuthHeader rightSlot={
        <p className="text-[13px] text-foreground/70 hidden sm:block">
          Al een account?{' '}
          <Link to="/login" className="text-[#1A535C] dark:text-[#8FC3CC] font-semibold hover:underline underline-offset-4">
            Inloggen
          </Link>
        </p>
      } />

      <main id="aanmelden" className="relative z-10 max-w-[1200px] w-full mx-auto px-6 sm:px-10 pt-8 sm:pt-12 pb-10 grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="lg:col-span-7 lg:pt-6"
        >
          <motion.p variants={item} className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1A535C]/70 dark:text-[#8FC3CC]/80 mb-5">
            <span className="inline-block w-6 h-px bg-[#1A535C]/40 dark:bg-[#8FC3CC]/40 align-middle mr-3" />
            Aanmelden
          </motion.p>

          <motion.h1
            variants={item}
            className="font-heading font-extrabold tracking-[-0.025em] text-[#191919] dark:text-foreground"
            style={{ lineHeight: 1.02 }}
          >
            <span className="block text-[40px] sm:text-[52px] lg:text-[60px] xl:text-[68px]">
              Eén project.
            </span>
            <span className="block text-[40px] sm:text-[52px] lg:text-[60px] xl:text-[68px]">
              Alles geregeld
              <DropInDot delay={0.55} />
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 text-[16px] sm:text-[17px] text-foreground/70 leading-[1.6] max-w-[460px]"
          >
            Klant, offerte, planning, factuur. Alles op één plek.
            Geen losse mapjes, geen WhatsApp-chaos, geen vrijdagavond admin.
          </motion.p>

          <motion.div variants={item} className="mt-8 max-w-[460px]">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-[26px] sm:text-[28px] font-extrabold tracking-tight text-[#1A535C] dark:text-[#8FC3CC] leading-none tabular-nums">
                €<CountUp target={79} duration={900} delay={400} />
              </span>
              <span className="text-[13px] text-foreground/70 font-medium">/maand</span>
            </div>
            <p className="mt-2.5 text-[13px] text-foreground/70 leading-[1.55]">
              Tot <span className="font-semibold text-[#191919] dark:text-foreground">10 gebruikers</span> inbegrepen
              <span className="mx-2 text-[#F15025]">·</span>
              30 dagen gratis
              <span className="mx-2 text-[#F15025]">·</span>
              geen creditcard
            </p>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Meer gebruikers? Staffel op maat. Even mailen, dan regelen we het.
            </p>
          </motion.div>

        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 180, damping: 22, mass: 0.9 }}
          className="lg:col-span-5 lg:pt-2 w-full"
        >
          <DoenFormCard accentColor="#F15025">
            <h2 className="font-heading text-[22px] font-extrabold text-[#191919] dark:text-foreground tracking-[-0.02em] mb-1">
              Aan de slag<span style={{ color: '#F15025' }}>.</span>
            </h2>
            <p className="text-[13.5px] text-foreground/70 mb-6">
              Maak een account. Kost je een minuut.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="register-email" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
                  E-mailadres
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground/70 pointer-events-none" aria-hidden />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="naam@bedrijf.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-border bg-background text-[14px] focus:border-[#1A535C] focus:bg-white dark:focus:border-[#4E96A3] dark:focus:bg-white/[0.06] focus-visible:ring-[#1A535C]/20 dark:focus-visible:ring-[#4E96A3]/25 transition-all"
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="register-password" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
                  Wachtwoord
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground/70 pointer-events-none" aria-hidden />
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimaal 10 tekens, sterk"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-12 h-11 rounded-xl border-border bg-background text-[14px] focus:border-[#1A535C] focus:bg-white dark:focus:border-[#4E96A3] dark:focus:bg-white/[0.06] focus-visible:ring-[#1A535C]/20 dark:focus-visible:ring-[#4E96A3]/25 transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-muted-foreground/70 hover:text-foreground/70 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]/30"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter check={passwordCheck} hasInput={password.length > 0} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
                  Wachtwoord bevestigen
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground/70 pointer-events-none" aria-hidden />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Herhaal je wachtwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 h-11 rounded-xl border-border bg-background text-[14px] focus:border-[#1A535C] focus:bg-white dark:focus:border-[#4E96A3] dark:focus:bg-white/[0.06] focus-visible:ring-[#1A535C]/20 dark:focus-visible:ring-[#4E96A3]/25 transition-all ${!passwordsMatch ? 'border-[#C03A18] focus-visible:ring-[#C03A18]/20' : ''}`}
                    disabled={isLoading}
                    autoComplete="new-password"
                    aria-invalid={!passwordsMatch}
                    aria-describedby={!passwordsMatch ? 'confirm-password-error' : undefined}
                  />
                  {confirmPassword && passwordsMatch && (
                    <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2D6B48] pointer-events-none" aria-hidden />
                  )}
                </div>
                {!passwordsMatch && (
                  <p id="confirm-password-error" role="alert" className="text-[11px] text-[#C03A18]">
                    Wachtwoorden komen niet overeen
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-semibold text-[14px] transition-all group bg-[#F15025] hover:bg-[#D94520] text-white mt-2 shadow-[0_6px_20px_-8px_rgba(241,80,37,0.55)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Account aanmaken...
                  </>
                ) : (
                  <>
                    Aan de slag
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center pt-1">
                Door aan te melden ga je akkoord met onze voorwaarden.
              </p>
            </form>

            <p className="text-center text-[12px] text-muted-foreground mt-5 sm:hidden">
              Al een account?{' '}
              <Link to="/login" className="text-[#1A535C] dark:text-[#8FC3CC] font-semibold hover:underline">
                Inloggen
              </Link>
            </p>
          </DoenFormCard>
        </motion.section>
      </main>

      {/* CONVERSION SECTION 1 — Workflow proof: see the product before you sign up */}
      <section className="relative z-10 max-w-[1280px] w-full mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <div className="text-center mb-10 sm:mb-14">
          <p
            className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase mb-3 text-[#F15025]"
            style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}
          >
            Hoe het werkt
          </p>
          <h2 className="font-heading text-[28px] sm:text-[36px] lg:text-[44px] font-extrabold tracking-[-0.03em] leading-[1.05] text-[#191919] dark:text-foreground">
            Klant tot factuur. In één flow<span style={{ color: '#F15025' }}>.</span>
          </h2>
          <p className="mt-3 text-[15px] sm:text-[16px] text-foreground/70 max-w-[520px] mx-auto leading-[1.6]">
            Niets meer overtypen tussen 8 systemen. Eén klant, één project, één plek waar alles samenkomt.
          </p>
        </div>

        <AuthProcesVisual />
      </section>

      {/* CONVERSION SECTION 2 — Why doen: anchored pricing + risk reversal + transition help */}
      <section className="relative z-10 max-w-[1200px] w-full mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <div className="text-center mb-10 sm:mb-12">
          <p
            className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase mb-3 text-[#F15025]"
            style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}
          >
            Waarom doen
          </p>
          <h2 className="font-heading text-[26px] sm:text-[32px] lg:text-[38px] font-extrabold tracking-[-0.025em] leading-[1.1] text-[#191919] dark:text-foreground">
            Drie redenen om vandaag te beginnen<span style={{ color: '#F15025' }}>.</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 max-w-[820px] mx-auto">
          <ConversionCard
            kicker="01 · Prijs"
            title="€79 per maand."
            body="Minder dan 1 uur monteurstijd per week. Goedkoper dan de tijd die je nu kwijt bent aan losse Excel- en WhatsApp-werk."
          />
          <ConversionCard
            kicker="02 · Geen risico"
            title="Maandelijks opzegbaar."
            body="Geen contract. Geen sales-call. Geen automatische verlenging. Wij vragen je actief om door te gaan na de proefperiode."
            highlight
          />
        </div>
      </section>

      {/* CONVERSION SECTION 2.5 — Migration deep-dive: kill the switching-cost objection */}
      <section className="relative z-10 max-w-[1200px] w-full mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <div className="text-center mb-10 sm:mb-12">
          <p
            className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase mb-3 text-[#F15025]"
            style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}
          >
            Overstappen
          </p>
          <h2 className="font-heading text-[26px] sm:text-[32px] lg:text-[38px] font-extrabold tracking-[-0.025em] leading-[1.1] text-[#191919] dark:text-foreground">
            Eenvoudig overzetten uit ieder pakket<span style={{ color: '#F15025' }}>.</span>
          </h2>
          <p className="mt-3 text-[14px] sm:text-[15px] text-foreground/70 max-w-[520px] mx-auto leading-[1.6]">
            Werk je nu met een ander pakket of in Excel? Twee opties. Kies wat bij je past. Je data komt netjes mee.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-5 max-w-[920px] mx-auto">
          <MigrationOption
            kicker="Doe het zelf"
            badge="~ 30–60 minuten"
            title="Helder stappenplan. Geen technische kennis nodig."
            steps={[
              'Klanten, producten en prijslijsten exporteren uit je huidige pakket (CSV).',
              'Uploaden in doen. via de import-wizard.',
              'Stapsgewijze begeleiding. Je ziet direct of het klopt.',
              'Klaar. Begin meteen met je eerste offerte.',
            ]}
          />
          <MigrationOption
            kicker="Of laat ons het doen"
            badge="Geen extra kosten"
            title="Stuur ons je export. Wij zetten alles netjes klaar."
            steps={[
              'Stuur je export-bestand uit je huidige pakket of Excel.',
              'Wij mappen klanten, producten, prijslijsten en categorieën.',
              'Je krijgt een ingerichte werkomgeving terug. Controleer en ga.',
              'Inbegrepen bij je proefperiode. Geen rekening achteraf.',
            ]}
            highlight
          />
        </div>

        <p className="mt-8 text-center text-[12px] text-muted-foreground">
          Onbekend exportformaat? Mail{' '}
          <a href="mailto:hello@doen.team" className="text-[#1A535C] dark:text-[#8FC3CC] font-semibold hover:underline underline-offset-4">
            hello@doen.team
          </a>
          . We kijken samen wat het beste werkt.
        </p>
      </section>

      {/* CONVERSION SECTION 3 — Final close: zero-risk reframe + scroll back to form */}
      <section className="relative z-10 max-w-[820px] w-full mx-auto px-6 sm:px-10 py-12 sm:py-16 text-center">
        <h2 className="font-heading text-[30px] sm:text-[42px] lg:text-[52px] font-extrabold tracking-[-0.03em] leading-[1.05] text-[#191919] dark:text-foreground">
          Beginnen kost je niks<span style={{ color: '#F15025' }}>.</span>
        </h2>
        <p className="mt-5 text-[15px] sm:text-[17px] text-foreground/70 leading-[1.6] max-w-[560px] mx-auto">
          30 dagen volledig gratis. Geen creditcard. Geen verplichting na de proef.
          Past het niet? Stoppen kan altijd, in 1 klik.
        </p>
        <a
          href="#aanmelden"
          className="inline-flex items-center justify-center gap-2 mt-8 h-12 px-7 rounded-xl font-semibold text-[15px] bg-[#F15025] hover:bg-[#D94520] text-white transition-all group shadow-[0_8px_28px_-10px_rgba(241,80,37,0.6)]"
        >
          Begin gratis
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </a>
        <p className="mt-4 text-[12px] text-muted-foreground uppercase tracking-[0.14em]">
          30 dagen gratis · Geen creditcard · Maandelijks opzegbaar
        </p>
      </section>

      <DoenAuthFooter />
    </DoenAuthShell>
  )
}

function MigrationOption({
  kicker,
  badge,
  title,
  steps,
  highlight = false,
}: {
  kicker: string
  badge: string
  title: string
  steps: string[]
  highlight?: boolean
}) {
  return (
    <div
      className={`relative bg-white dark:bg-card rounded-2xl p-7 sm:p-8 border ${
        highlight ? 'border-[#1A535C]/30 dark:border-[#4E96A3]/35' : 'border-border dark:border-white/10'
      } shadow-[0_2px_24px_-8px_rgba(26,83,92,0.08)] flex flex-col`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <p
          className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
          style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}
        >
          {kicker}
        </p>
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full whitespace-nowrap ${
            highlight ? 'text-white' : 'text-[#1A535C] dark:text-[#8FC3CC]'
          }`}
          style={{
            background: highlight ? '#1A535C' : '#1A535C14',
            fontFamily: '"DM Mono", ui-monospace, monospace',
          }}
        >
          {badge}
        </span>
      </div>
      <h3 className="font-heading text-[18px] sm:text-[20px] font-extrabold tracking-tight text-[#191919] dark:text-foreground leading-[1.25] mb-5">
        {title}
      </h3>
      <ul className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-[13.5px] text-foreground/70 leading-[1.55]">
            <span
              className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full mt-0.5 text-white text-[10px] font-bold"
              style={{ background: highlight ? '#1A535C' : '#1A535C99', fontFamily: '"DM Mono", ui-monospace, monospace' }}
            >
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConversionCard({
  kicker,
  title,
  body,
  highlight = false,
}: {
  kicker: string
  title: string
  body: string
  highlight?: boolean
}) {
  return (
    <div
      className={`relative bg-white dark:bg-card rounded-2xl p-6 sm:p-7 border ${
        highlight ? 'border-[#F15025]/30 dark:border-[#F15025]/40' : 'border-border dark:border-white/10'
      } shadow-[0_2px_24px_-8px_rgba(26,83,92,0.08)]`}
    >
      {highlight && (
        <span
          className="absolute -top-2 right-5 text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full text-white"
          style={{ background: '#F15025', fontFamily: '"DM Mono", ui-monospace, monospace' }}
        >
          Belangrijkste
        </span>
      )}
      <p
        className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-3 text-muted-foreground"
        style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}
      >
        {kicker}
      </p>
      <h3 className="font-heading text-[20px] sm:text-[22px] font-extrabold tracking-tight text-[#191919] dark:text-foreground leading-tight">
        {title}
      </h3>
      <p className="mt-3 text-[14px] text-foreground/70 leading-[1.55]">{body}</p>
    </div>
  )
}

/* ─── Shared chrome (also used by LoginPage) ───────────────────────── */

export function DoenAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      <style>{`
        @keyframes doen-dot-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.18); opacity: 0.85; }
        }
        .doen-dot-pulse { animation: doen-dot-pulse 2.4s ease-in-out infinite; display: inline-block; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .doen-dot-pulse { animation: none !important; }
        }
      `}</style>

      {/* Soft gradient layers — light */}
      <div
        className="absolute inset-0 pointer-events-none dark:hidden"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 100% 0%, rgba(241,80,37,0.06), transparent 60%),
            radial-gradient(ellipse 70% 50% at 0% 100%, rgba(26,83,92,0.07), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 30%)
          `,
        }}
        aria-hidden
      />
      {/* Gradient layers — dark: diepe petrol-nacht met flame-glow */}
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 100% 0%, rgba(241,80,37,0.14), transparent 60%),
            radial-gradient(ellipse 70% 50% at 0% 100%, rgba(58,162,178,0.12), transparent 60%),
            radial-gradient(ellipse 60% 45% at 50% 115%, rgba(241,80,37,0.07), transparent 70%),
            linear-gradient(180deg, rgba(6,18,22,0.6) 0%, transparent 35%)
          `,
        }}
        aria-hidden
      />

      {/* Cursor-following flame glow — Stripe-grade detail */}
      <CursorFlameSpot />

      {/* Animated particle field */}
      <ParticleField />

      {children}
    </div>
  )
}

function CursorFlameSpot() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return

    let raf = 0
    let targetX = -1000
    let targetY = -1000
    let currentX = -1000
    let currentY = -1000

    const handleMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }

    const tick = () => {
      currentX += (targetX - currentX) * 0.09
      currentY += (targetY - currentY) * 0.09
      el.style.transform = `translate3d(${currentX - 200}px, ${currentY - 200}px, 0)`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', handleMove)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed top-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none z-0 mix-blend-multiply dark:mix-blend-screen"
      style={{
        background: 'radial-gradient(circle, rgba(241,80,37,0.10) 0%, rgba(241,80,37,0.04) 35%, transparent 70%)',
        willChange: 'transform',
        transform: 'translate3d(-1000px, -1000px, 0)',
      }}
    />
  )
}

export function DropInDot({ delay = 0.5 }: { delay?: number }) {
  return (
    <motion.span
      initial={{ y: -55, scale: 0.3, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 420, damping: 13, mass: 0.7 }}
      style={{ display: 'inline-block', color: '#F15025', transformOrigin: 'center' }}
    >
      .
    </motion.span>
  )
}

export function CountUp({ target, duration = 900, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    let raf = 0
    let startTime = 0
    const tick = (now: number) => {
      if (!startTime) startTime = now
      const elapsed = now - startTime - delay
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])

  return <>{value}</>
}

export function DoenAuthHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  return (
    <header className="relative z-10 max-w-[1200px] w-full mx-auto px-6 sm:px-10 pt-7 sm:pt-9 flex items-center justify-between">
      <Link to="/" aria-label="doen." className="inline-flex items-center">
        <img src="/logos/doen-logo.svg" alt="doen." className="h-8 sm:h-9 w-auto" />
      </Link>
      {rightSlot}
    </header>
  )
}

export function DoenFormCard({
  children,
  accentColor = '#1A535C',
}: {
  children: React.ReactNode
  accentColor?: string
}) {
  return (
    <div className="relative bg-card/95 backdrop-blur-sm rounded-2xl p-6 sm:p-7 shadow-[0_4px_40px_-12px_rgba(26,83,92,0.18)] dark:shadow-[0_4px_50px_-12px_rgba(241,80,37,0.18),0_2px_24px_-8px_rgba(0,0,0,0.5)] border border-white/60 dark:border-white/15 max-w-[440px] lg:ml-auto">
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}66, transparent)`,
        }}
        aria-hidden
      />
      {children}
    </div>
  )
}

export function DoenAuthFooter() {
  return (
    <footer className="relative z-10 max-w-[1200px] w-full mx-auto px-6 sm:px-10 pb-7 pt-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} doen<span style={{ color: '#F15025' }}>.</span> Gemaakt voor doeners.
        </p>
        <p className="text-[11px] text-muted-foreground tracking-[0.12em] uppercase">
          Slim gedaan<span style={{ color: '#F15025' }}>.</span>
        </p>
      </div>
    </footer>
  )
}
