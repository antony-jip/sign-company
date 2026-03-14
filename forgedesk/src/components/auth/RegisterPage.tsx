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

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL || 'https://forgedesk.io'

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
  { icon: FileText, text: 'Offertes maken en versturen', color: '#E8866A' },
  { icon: Receipt, text: 'Facturen genereren', color: '#7EB5A6' },
  { icon: Users, text: 'Klanten en projecten beheren', color: '#8BAFD4' },
  { icon: ClipboardList, text: 'Werkbonnen voor je team', color: '#C4A882' },
  { icon: Calendar, text: 'Planning en montage-afspraken', color: '#9B8EC4' },
  { icon: Sparkles, text: 'AI-assistent helpt met teksten', color: '#D4836A' },
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
    <div className="min-h-screen flex bg-background">
      {/* Left: Form */}
      <div className="flex items-center justify-center flex-1 p-5 sm:p-8">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <a href={MARKETING_URL} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="12" rx="2" />
                  <path d="M8 20h8" />
                  <path d="M12 16v4" />
                </svg>
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight font-display">FORGEdesk</span>
            </a>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1.5 font-display">
            Gratis uitproberen
          </h1>
          <p className="text-[14.5px] text-muted-foreground mb-7">
            30 dagen gratis, geen creditcard nodig.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="register-email" className="text-[12.5px] font-medium text-foreground/70">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11 rounded-xl border-border bg-muted/50 text-[13.5px] focus:bg-card focus:border-foreground transition-colors"
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password" className="text-[12.5px] font-medium text-foreground/70">Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimaal 8 tekens"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 h-11 rounded-xl border-border bg-muted/50 text-[13.5px] focus:bg-card focus:border-foreground transition-colors"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-all ${level <= passwordStrength.score ? passwordStrength.color : 'bg-muted'}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{passwordStrength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-[12.5px] font-medium text-foreground/70">Wachtwoord bevestigen</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Herhaal je wachtwoord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-9 h-11 rounded-xl border-border bg-muted/50 text-[13.5px] focus:bg-card focus:border-foreground transition-colors ${!passwordsMatch ? 'border-red-400 focus:ring-red-400' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {confirmPassword && passwordsMatch && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>
              {!passwordsMatch && <p className="text-[11px] text-red-500">Wachtwoorden komen niet overeen</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-[14px] group mt-2"
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

          <p className="text-center text-[13.5px] text-muted-foreground mt-6">
            Al een account?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Inloggen
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Branded panel (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 bg-foreground relative overflow-hidden lg:rounded-l-[2rem]">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: 'hsl(var(--primary) / 0.08)' }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: 'hsl(var(--ring) / 0.06)' }} />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 text-[13px] font-medium text-white/60 bg-white/5 border border-white/10 rounded-full px-4 py-2">
            30 dagen gratis uitproberen
          </div>
        </div>

        {/* Visual illustration */}
        <div className="relative z-10 flex justify-center">
          <svg width="280" height="200" viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
            <rect x="40" y="130" width="200" height="8" rx="4" fill="#7EB5A6" opacity="0.3" />
            <rect x="90" y="40" width="100" height="72" rx="8" stroke="#8BAFD4" strokeWidth="2" fill="#8BAFD4" fillOpacity="0.08" />
            <rect x="96" y="46" width="88" height="56" rx="4" fill="#8BAFD4" fillOpacity="0.06" />
            <polyline points="106,86 118,74 130,80 142,66 154,72 166,58 174,62" fill="none" stroke="#7EB5A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <line x1="106" y1="92" x2="174" y2="92" stroke="#8BAFD4" strokeWidth="1" opacity="0.2" />
            <rect x="130" y="112" width="20" height="18" rx="2" fill="#8BAFD4" opacity="0.15" />
            <rect x="120" y="128" width="40" height="4" rx="2" fill="#8BAFD4" opacity="0.2" />
            <g transform="translate(32, 70) rotate(-30)">
              <rect x="0" y="8" width="6" height="40" rx="3" fill="#D4836A" opacity="0.5" />
              <circle cx="3" cy="6" r="8" stroke="#D4836A" strokeWidth="2" fill="none" opacity="0.4" />
              <rect x="1" y="0" width="4" height="8" fill="#D4836A" opacity="0.3" />
            </g>
            <g transform="translate(220, 55) rotate(15)">
              <rect x="0" y="0" width="10" height="60" rx="2" fill="#C4A882" opacity="0.35" />
              {[0, 1, 2, 3, 4, 5].map(i => (
                <line key={i} x1="0" y1={8 + i * 10} x2={i % 2 === 0 ? 6 : 4} y2={8 + i * 10} stroke="#C4A882" strokeWidth="1" opacity="0.5" />
              ))}
            </g>
            <g transform="translate(210, 105) rotate(35)">
              <polygon points="0,0 4,-3 35,3 35,7 4,13 0,10" fill="#9B8EC4" opacity="0.4" />
              <polygon points="35,3 42,5 35,7" fill="#6B5B8A" opacity="0.5" />
            </g>
            <rect x="48" y="95" width="28" height="36" rx="3" fill="#E8866A" fillOpacity="0.1" stroke="#E8866A" strokeWidth="1.5" opacity="0.4" />
            <line x1="54" y1="106" x2="70" y2="106" stroke="#E8866A" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
            <line x1="54" y1="112" x2="68" y2="112" stroke="#E8866A" strokeWidth="1.2" strokeLinecap="round" opacity="0.25" />
            <line x1="54" y1="118" x2="64" y2="118" stroke="#E8866A" strokeWidth="1.2" strokeLinecap="round" opacity="0.2" />
            <circle cx="72" cy="150" r="12" stroke="#C4A882" strokeWidth="1.5" opacity="0.35" />
            <text x="67" y="155" fill="#C4A882" opacity="0.5" fontSize="13" fontWeight="700">€</text>
            <circle cx="190" cy="35" r="3" fill="#9B8EC4" opacity="0.2" />
            <circle cx="210" cy="45" r="2" fill="#7EB5A6" opacity="0.25" />
            <circle cx="60" cy="50" r="2.5" fill="#E8866A" opacity="0.2" />
            <circle cx="250" cy="90" r="2" fill="#8BAFD4" opacity="0.2" />
          </svg>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-4 font-display">
            Alles wat je nodig hebt voor je sign-bedrijf
          </h2>
          <p className="text-[15px] text-white/50 leading-relaxed mb-8">
            €49/maand — alles inbegrepen, geen verborgen kosten. Opzeggen wanneer je wilt.
          </p>

          <div className="space-y-2.5">
            {features.map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-[14px] text-white/60">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[12px] text-white/25">
          © {new Date().getFullYear()} FORGEdesk. Alle rechten voorbehouden.
        </p>
      </div>
    </div>
  )
}
