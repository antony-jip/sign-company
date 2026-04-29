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
        <p className="text-[13px] text-[#6B6B66] hidden sm:block">
          Al een account?{' '}
          <Link to="/login" className="text-[#1A535C] font-semibold hover:underline underline-offset-4">
            Inloggen
          </Link>
        </p>
      } />

      <main className="relative z-10 flex-1 max-w-[1200px] w-full mx-auto px-6 sm:px-10 pt-8 sm:pt-12 pb-12 grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="lg:col-span-7 lg:pt-6"
        >
          <motion.p variants={item} className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1A535C]/70 mb-5">
            <span className="inline-block w-6 h-px bg-[#1A535C]/40 align-middle mr-3" />
            Aanmelden
          </motion.p>

          <motion.h1
            variants={item}
            className="font-heading font-extrabold tracking-[-0.025em] text-[#191919]"
            style={{ lineHeight: 1.02 }}
          >
            <span className="block text-[40px] sm:text-[52px] lg:text-[60px] xl:text-[68px]">
              Eerst even
            </span>
            <span className="block text-[40px] sm:text-[52px] lg:text-[60px] xl:text-[68px]">
              dit formulier
              <DropInDot delay={0.55} />
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 text-[16px] sm:text-[17px] text-[#5A5A55] leading-[1.6] max-w-[460px]"
          >
            Daarna ben je los van Excel, losse mapjes en post-its. En aan
            het{' '}
            <span className="text-[#191919] font-semibold">
              doen<span style={{ color: '#F15025' }}>.</span>
            </span>
          </motion.p>

          <motion.div variants={item} className="mt-8 max-w-[460px]">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-[26px] sm:text-[28px] font-extrabold tracking-tight text-[#1A535C] leading-none tabular-nums">
                €<CountUp target={79} duration={900} delay={400} />
              </span>
              <span className="text-[13px] text-[#5A5A55] font-medium">/maand</span>
            </div>
            <p className="mt-2.5 text-[13px] text-[#5A5A55] leading-[1.55]">
              Tot <span className="font-semibold text-[#191919]">10 gebruikers</span> inbegrepen
              <span className="mx-2 text-[#F15025]">·</span>
              30 dagen gratis
              <span className="mx-2 text-[#F15025]">·</span>
              geen creditcard
            </p>
            <p className="mt-1.5 text-[12px] text-[#9B9B95]">
              Meer gebruikers? Staffel op maat — even mailen, dan regelen we het.
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
            <h2 className="font-heading text-[22px] font-extrabold text-[#191919] tracking-[-0.02em] mb-1">
              Aan de slag<span style={{ color: '#F15025' }}>.</span>
            </h2>
            <p className="text-[13.5px] text-[#5A5A55] mb-6">
              Maak een account. Kost je een minuut.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="register-email" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A5A55]">
                  E-mailadres
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8] pointer-events-none" aria-hidden />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="naam@bedrijf.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-[#EBEBEB] bg-[#F8F7F5] text-[14px] focus:border-[#1A535C] focus:bg-white focus-visible:ring-[#1A535C]/20 transition-all"
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="register-password" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A5A55]">
                  Wachtwoord
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8] pointer-events-none" aria-hidden />
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimaal 10 tekens, sterk"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-12 h-11 rounded-xl border-[#EBEBEB] bg-[#F8F7F5] text-[14px] focus:border-[#1A535C] focus:bg-white focus-visible:ring-[#1A535C]/20 transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-[#C0BDB8] hover:text-[#5A5A55] transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]/30"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter check={passwordCheck} hasInput={password.length > 0} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A5A55]">
                  Wachtwoord bevestigen
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8] pointer-events-none" aria-hidden />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Herhaal je wachtwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 h-11 rounded-xl border-[#EBEBEB] bg-[#F8F7F5] text-[14px] focus:border-[#1A535C] focus:bg-white focus-visible:ring-[#1A535C]/20 transition-all ${!passwordsMatch ? 'border-[#C03A18] focus-visible:ring-[#C03A18]/20' : ''}`}
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

              <p className="text-[11px] text-[#9B9B95] text-center pt-1">
                Door aan te melden ga je akkoord met onze voorwaarden.
              </p>
            </form>

            <p className="text-center text-[12px] text-[#9B9B95] mt-5 sm:hidden">
              Al een account?{' '}
              <Link to="/login" className="text-[#1A535C] font-semibold hover:underline">
                Inloggen
              </Link>
            </p>
          </DoenFormCard>
        </motion.section>
      </main>

      <DoenAuthFooter />
    </DoenAuthShell>
  )
}

/* ─── Shared chrome (also used by LoginPage) ───────────────────────── */

export function DoenAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#F8F7F5] overflow-hidden">
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

      {/* Soft gradient layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 100% 0%, rgba(241,80,37,0.06), transparent 60%),
            radial-gradient(ellipse 70% 50% at 0% 100%, rgba(26,83,92,0.07), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 30%)
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
      className="fixed top-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none z-0 mix-blend-multiply"
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
    <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 sm:p-7 shadow-[0_4px_40px_-12px_rgba(26,83,92,0.18)] border border-white/60 max-w-[440px] lg:ml-auto">
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
        <p className="text-[11px] text-[#9B9B95]">
          © {new Date().getFullYear()} doen<span style={{ color: '#F15025' }}>.</span> — gemaakt voor doeners.
        </p>
        <p className="text-[11px] text-[#9B9B95] tracking-[0.12em] uppercase">
          Slim gedaan<span style={{ color: '#F15025' }}>.</span>
        </p>
      </div>
    </footer>
  )
}
