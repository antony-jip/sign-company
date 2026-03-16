import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Check,
  FileText, Receipt, Users, ClipboardList, Calendar, Sparkles
} from 'lucide-react'

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Zwak', color: 'bg-red-500' }
  if (score <= 2) return { score, label: 'Matig', color: 'bg-orange-500' }
  return { score, label: 'Sterk', color: 'bg-emerald-500' }
}

const features = [
  { icon: FileText, text: 'Offertes maken en versturen' },
  { icon: Receipt, text: 'Facturen genereren' },
  { icon: Users, text: 'Klanten en projecten beheren' },
  { icon: ClipboardList, text: 'Werkbonnen voor je team' },
  { icon: Calendar, text: 'Planning en montage-afspraken' },
  { icon: Sparkles, text: 'AI-assistent helpt met teksten' },
]

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
    <div className="min-h-screen flex" style={{ backgroundColor: '#F4F3F0' }}>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Left: Form */}
      <div className="flex items-center justify-center flex-1 p-5 sm:p-8">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
              </svg>
            </div>
            <span className="text-lg font-bold text-black tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>FORGEdesk</span>
          </div>

          <h1 className="text-2xl font-bold text-black mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Gratis uitproberen
          </h1>
          <p className="text-[14.5px] text-neutral-500 mb-7" style={{ fontFamily: 'Inter, sans-serif' }}>
            30 dagen gratis, geen creditcard nodig.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="register-email" className="text-xs font-medium text-neutral-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11 rounded-xl border-neutral-200 bg-white text-sm focus:border-black focus:ring-black"
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password" className="text-xs font-medium text-neutral-700">Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimaal 8 tekens"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 h-11 rounded-xl border-neutral-200 bg-white text-sm focus:border-black focus:ring-black"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-all ${level <= passwordStrength.score ? passwordStrength.color : 'bg-neutral-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500">{passwordStrength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-medium text-neutral-700">Wachtwoord bevestigen</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Herhaal je wachtwoord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-9 h-11 rounded-xl border-neutral-200 bg-white text-sm focus:border-black focus:ring-black ${!passwordsMatch ? 'border-red-400 focus:ring-red-400' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {confirmPassword && passwordsMatch && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>
              {!passwordsMatch && <p className="text-xs text-red-500">Wachtwoorden komen niet overeen</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-black text-white hover:bg-neutral-800 rounded-xl font-semibold text-[14px] group mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Account aanmaken...
                </>
              ) : (
                <>
                  Account aanmaken
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            Al een account?{' '}
            <Link to="/login" className="text-black hover:underline font-semibold">
              Inloggen
            </Link>
          </p>
        </div>
      </div>

      {/* Right: USPs (desktop only) */}
      <div className="hidden lg:flex flex-col justify-center flex-1 p-12 max-w-xl">
        <div className="max-w-md">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-full px-4 py-2 mb-6">
              30 dagen gratis uitproberen
            </div>

            <h2 className="text-3xl font-extrabold text-black leading-tight mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Alles wat je nodig hebt voor je sign-bedrijf
            </h2>

            <div className="space-y-1 text-[14px] text-neutral-600" style={{ fontFamily: 'Inter, sans-serif' }}>
              <p>Geen creditcard nodig</p>
              <p>€49/maand — alles inbegrepen, geen verborgen kosten</p>
              <p>Geen verplichtingen — opzeggen wanneer je wilt</p>
            </div>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-neutral-700" />
                </div>
                <span className="text-[14px] text-neutral-700" style={{ fontFamily: 'Inter, sans-serif' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
