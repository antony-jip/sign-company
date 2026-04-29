import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Check } from 'lucide-react'
import { firstBlockingError } from '@/lib/passwordValidation'
import { usePasswordCheck } from '@/lib/usePasswordCheck'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'

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
    <div className="min-h-screen bg-[#F8F7F5] relative overflow-hidden">
      <style>{`
        @keyframes doen-orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.05); }
        }
        @keyframes doen-orb-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 25px) scale(1.08); }
        }
        @keyframes doen-dot-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.18); opacity: 0.85; }
        }
        @keyframes doen-dot-float {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(18px, 28px); }
          66% { transform: translate(-14px, 18px); }
        }
        .doen-orb-1 { animation: doen-orb-drift 14s ease-in-out infinite; }
        .doen-orb-2 { animation: doen-orb-drift-2 18s ease-in-out infinite; }
        .doen-dot-pulse { animation: doen-dot-pulse 2.4s ease-in-out infinite; display: inline-block; transform-origin: center; }
        .doen-dot-float { animation: doen-dot-float 16s ease-in-out infinite; }
      `}</style>

      {/* Background atmosphere */}
      <div
        className="absolute -top-[220px] -right-[180px] w-[720px] h-[720px] rounded-full blur-[120px] doen-orb-1 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(26,83,92,0.16) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="absolute -bottom-[160px] -left-[120px] w-[480px] h-[480px] rounded-full blur-[110px] doen-orb-2 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(241,80,37,0.07) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="absolute top-[26%] left-[34%] w-2 h-2 rounded-full doen-dot-float pointer-events-none"
        style={{ background: '#F15025' }}
        aria-hidden
      />
      <div
        className="absolute bottom-[28%] right-[14%] w-1.5 h-1.5 rounded-full doen-dot-float pointer-events-none"
        style={{ background: '#1A535C', animationDelay: '6s' }}
        aria-hidden
      />

      {/* Top bar */}
      <header className="relative z-10 max-w-[1320px] mx-auto px-6 sm:px-10 pt-7 sm:pt-9 flex items-center justify-between">
        <Link to="/" aria-label="doen." className="inline-flex items-baseline group">
          <span className="font-heading text-[30px] sm:text-[34px] font-extrabold tracking-[-0.04em] text-[#1A1A1A] leading-none">doen</span>
          <span
            className="font-heading text-[30px] sm:text-[34px] font-extrabold leading-none doen-dot-pulse"
            style={{ color: '#F15025' }}
          >.</span>
        </Link>
        <p className="text-[13px] text-[#6B6B66] hidden sm:block">
          Al een account?{' '}
          <Link to="/login" className="text-[#1A535C] font-semibold hover:underline">
            Inloggen
          </Link>
        </p>
      </header>

      {/* Main grid */}
      <main className="relative z-10 max-w-[1320px] mx-auto px-6 sm:px-10 pt-12 sm:pt-16 lg:pt-20 pb-12 grid lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-start">
        {/* Hero — editorial side */}
        <div className="lg:col-span-7 lg:pr-4 lg:sticky lg:top-10">
          <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1A535C]/75 mb-6 sm:mb-8">
            Aanmelden
          </p>

          <h1 className="font-heading font-extrabold tracking-[-0.045em] leading-[0.92] text-[#1A1A1A]">
            <span className="block text-[52px] sm:text-[76px] lg:text-[92px] xl:text-[112px]">
              Eerst even
            </span>
            <span className="block text-[52px] sm:text-[76px] lg:text-[92px] xl:text-[112px]">
              dit formulier<span style={{ color: '#F15025' }}>.</span>
            </span>
          </h1>

          <p className="mt-7 sm:mt-8 text-[17px] sm:text-[19px] text-[#6B6B66] leading-[1.55] max-w-[480px]">
            Daarna ben je los van Excel, losse mapjes en post-its. En aan het{' '}
            <span className="text-[#1A1A1A] font-semibold">
              doen<span style={{ color: '#F15025' }}>.</span>
            </span>
          </p>

          {/* Pricing strip */}
          <div className="mt-10 sm:mt-14">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className="inline-flex items-baseline">
                <span className="font-heading text-[32px] sm:text-[38px] font-extrabold tracking-tight text-[#1A535C] leading-none">
                  €79
                </span>
                <span className="text-[14px] text-[#6B6B66] ml-1.5 font-medium">/maand</span>
              </span>
              <DotSep />
              <span className="text-[14px] text-[#1A1A1A]">
                tot <strong className="font-semibold">10 gebruikers</strong> inbegrepen
              </span>
              <DotSep />
              <span className="text-[14px] text-[#1A1A1A]">30 dagen gratis</span>
              <DotSep />
              <span className="text-[14px] text-[#1A1A1A]">geen creditcard</span>
            </div>
            <p className="text-[12px] text-[#9B9B95] mt-3 max-w-[460px]">
              Meer dan 10 gebruikers nodig? Staffel op maat — even mailen, dan
              regelen we het.
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl p-7 sm:p-9 shadow-[0_4px_40px_rgba(26,83,92,0.08)] relative">
            <h2 className="font-heading text-[22px] sm:text-[24px] font-extrabold text-[#1A1A1A] tracking-[-0.02em] mb-1.5">
              Aan de slag<span style={{ color: '#F15025' }}>.</span>
            </h2>
            <p className="text-[14px] text-[#6B6B66] mb-6">
              Maak een account. Het kost je een minuut.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="register-email" className="text-[13px] font-medium text-[#6B6B66]">
                  E-mailadres
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8]" aria-hidden />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="naam@bedrijf.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-[#EBEBEB] bg-[#F8F7F5] text-[14px] focus:border-[#1A535C] focus:bg-white focus-visible:ring-[#1A535C]/20 transition-all"
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="register-password" className="text-[13px] font-medium text-[#6B6B66]">
                  Wachtwoord
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8]" aria-hidden />
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimaal 10 tekens, sterk"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-xl border-[#EBEBEB] bg-[#F8F7F5] text-[14px] focus:border-[#1A535C] focus:bg-white focus-visible:ring-[#1A535C]/20 transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C0BDB8] hover:text-[#6B6B66] transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter check={passwordCheck} hasInput={password.length > 0} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-[13px] font-medium text-[#6B6B66]">
                  Wachtwoord bevestigen
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8]" aria-hidden />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Herhaal je wachtwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 h-12 rounded-xl border-[#EBEBEB] bg-[#F8F7F5] text-[14px] focus:border-[#1A535C] focus:bg-white focus-visible:ring-[#1A535C]/20 transition-all ${!passwordsMatch ? 'border-[#C03A18] focus-visible:ring-[#C03A18]/20' : ''}`}
                    disabled={isLoading}
                    autoComplete="new-password"
                    aria-invalid={!passwordsMatch}
                    aria-describedby={!passwordsMatch ? 'confirm-password-error' : undefined}
                  />
                  {confirmPassword && passwordsMatch && (
                    <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2D6B48]" aria-hidden />
                  )}
                </div>
                {!passwordsMatch && (
                  <p id="confirm-password-error" className="text-[11px] text-[#C03A18]">
                    Wachtwoorden komen niet overeen
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold text-[15px] transition-all group bg-[#F15025] hover:bg-[#D94520] text-white mt-3 shadow-[0_4px_18px_rgba(241,80,37,0.28)]"
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
            </form>

            <p className="text-center text-[12px] text-[#9B9B95] mt-6 sm:hidden">
              Al een account?{' '}
              <Link to="/login" className="text-[#1A535C] font-semibold hover:underline">
                Inloggen
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 max-w-[1320px] mx-auto px-6 sm:px-10 pb-8 pt-4">
        <p className="text-[11px] text-[#9B9B95]">
          © {new Date().getFullYear()} doen<span style={{ color: '#F15025' }}>.</span> — gemaakt voor doeners.
        </p>
      </footer>
    </div>
  )
}

function DotSep() {
  return (
    <span className="text-[#F15025] text-[16px] leading-none -translate-y-[1px]" aria-hidden>
      ·
    </span>
  )
}
