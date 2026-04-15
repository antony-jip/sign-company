import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Check,
  CheckCircle2,
} from 'lucide-react'

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Zwak', color: 'bg-[#C03A18]' }
  if (score <= 2) return { score, label: 'Matig', color: 'bg-[#E8B931]' }
  return { score, label: 'Sterk', color: 'bg-[#2D6B48]' }
}

export function RegisterPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
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
    if (password.length < 8) {
      toast.error('Wachtwoord moet minimaal 8 tekens zijn')
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
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="flex flex-col items-center justify-center flex-1 p-6 sm:p-10 bg-[#FEFDFB] relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: 'rgba(241, 80, 37, 0.03)' }} />

        <div className="w-full max-w-[380px] relative z-10">
          {/* Logo */}
          <div className="mb-12">
            <Link to="/" className="inline-block">
              <img src="/logos/doen-logo.svg" alt="doen." className="h-9" />
            </Link>
          </div>

          <h1 className="text-[28px] font-extrabold text-[#1A1A1A] tracking-[-0.03em] leading-tight mb-2">
            Tijd om te doen.
          </h1>
          <p className="text-[15px] text-[#9B9B95] mb-8">
            30 dagen gratis — geen creditcard, geen gedoe.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="register-email" className="text-[13px] font-medium text-[#6B6B66]">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8]" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-[#E6E4E0] bg-white text-[14px] focus:border-[#1A535C] focus:ring-[#1A535C]/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all"
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password" className="text-[13px] font-medium text-[#6B6B66]">Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8]" />
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimaal 8 tekens"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl border-[#E6E4E0] bg-white text-[14px] focus:border-[#1A535C] focus:ring-[#1A535C]/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C0BDB8] hover:text-[#6B6B66] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-all ${level <= passwordStrength.score ? passwordStrength.color : 'bg-[#EEEEED]'}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-[#9B9B95]">{passwordStrength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-[13px] font-medium text-[#6B6B66]">Wachtwoord bevestigen</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8]" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Herhaal je wachtwoord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 h-12 rounded-xl border-[#E6E4E0] bg-white text-[14px] focus:border-[#1A535C] focus:ring-[#1A535C]/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all ${!passwordsMatch ? 'border-[#C03A18] focus:ring-[#C03A18]/20' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {confirmPassword && passwordsMatch && (
                  <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2D6B48]" />
                )}
              </div>
              {!passwordsMatch && <p className="text-[11px] text-[#C03A18]">Wachtwoorden komen niet overeen</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold text-[15px] transition-all group bg-[#F15025] hover:bg-[#D94520] text-white mt-3 shadow-[0_2px_8px_rgba(241,80,37,0.25)]"
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

          <p className="text-center text-[13px] text-[#B0ADA8] mt-6">
            Al een account?{' '}
            <Link to="/login" className="text-[#1A535C] hover:underline font-semibold">
              Inloggen
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Petrol brand panel with animated shapes */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{ background: '#112F35' }}
      >
        <style>{`
          @keyframes float-1 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(30px, -40px) rotate(8deg); } }
          @keyframes float-2 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-20px, 30px) rotate(-5deg); } }
          @keyframes float-3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(15px, -20px) scale(1.08); } }
          @keyframes float-4 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-25px, -15px) rotate(12deg); } }
          @keyframes pulse-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
          .reg-float-1 { animation: float-1 8s ease-in-out infinite; }
          .reg-float-2 { animation: float-2 10s ease-in-out infinite; }
          .reg-float-3 { animation: float-3 12s ease-in-out infinite; }
          .reg-float-4 { animation: float-4 9s ease-in-out infinite; }
          .reg-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        `}</style>

        {/* Animated blobs */}
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full blur-[100px] reg-float-1" style={{ background: 'radial-gradient(circle, rgba(126, 200, 208, 0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-10 -left-10 w-[350px] h-[350px] rounded-full blur-[90px] reg-float-2" style={{ background: 'radial-gradient(circle, rgba(241, 80, 37, 0.1) 0%, transparent 70%)' }} />
        <div className="absolute top-[30%] left-[15%] w-[200px] h-[200px] rounded-full blur-[60px] reg-float-3" style={{ background: 'rgba(126, 200, 208, 0.08)' }} />

        {/* Geometric shapes */}
        <div className="absolute top-[18%] right-[18%] w-28 h-28 rounded-3xl border border-white/[0.06] reg-float-4" style={{ background: 'rgba(126, 200, 208, 0.04)' }} />
        <div className="absolute bottom-[25%] left-[20%] w-16 h-16 rounded-2xl border border-white/[0.05] reg-float-1" style={{ background: 'rgba(241, 80, 37, 0.03)', animationDelay: '2s' }} />
        <div className="absolute top-[60%] right-[15%] w-20 h-20 rounded-full border border-white/[0.04] reg-float-2" style={{ background: 'rgba(126, 200, 208, 0.03)', animationDelay: '4s' }} />
        <div className="absolute top-[10%] left-[35%] w-3 h-3 rounded-full reg-pulse-glow" style={{ background: '#7EC8D0' }} />
        <div className="absolute bottom-[18%] right-[25%] w-2 h-2 rounded-full reg-pulse-glow" style={{ background: '#F15025', animationDelay: '2s' }} />
        <div className="absolute top-[50%] left-[8%] w-2.5 h-2.5 rounded-full reg-pulse-glow" style={{ background: '#7EC8D0', animationDelay: '3s' }} />
        <div className="absolute bottom-[45%] right-[40%] w-2 h-2 rounded-full reg-pulse-glow" style={{ background: '#F15025', animationDelay: '1s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Top spacer */}
          <div />

          {/* Center */}
          <div className="max-w-md">
            <h2 className="text-[48px] font-extrabold text-white leading-[1.05] tracking-[-0.03em] mb-6">
              Stoppen met<br />uitzoeken,<br />beginnen met<br /><span className="text-[#F15025]">doen.</span>
            </h2>

            <div className="flex items-end gap-3 mb-3">
              <span className="text-[56px] font-extrabold text-white font-mono tracking-tighter leading-none">€49</span>
              <span className="text-[17px] text-white/50 font-medium pb-2.5">/maand</span>
            </div>
            <p className="text-[14px] text-white/40 mb-8">Inclusief 2 gebruikers — daarna €10 per extra gebruiker</p>

            {/* Benefits */}
            <div className="flex flex-wrap gap-2">
              {['Alle features', 'Geen verborgen kosten', 'Altijd opzegbaar'].map((b) => (
                <div key={b} className="flex items-center gap-1.5 text-[12px] font-semibold text-white/70 bg-white/[0.08] border border-white/[0.10] rounded-full px-3.5 py-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#7EC8D0]" />
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-[11px] text-white/20">30 dagen gratis uitproberen — geen creditcard nodig</p>
        </div>
      </div>
    </div>
  )
}
