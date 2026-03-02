import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, User, Loader2, ArrowRight, Check, Zap, Shield, Users } from 'lucide-react'

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Zwak', color: 'bg-red-500' }
  if (score <= 2) return { score, label: 'Matig', color: 'bg-orange-500' }
  if (score <= 3) return { score, label: 'Redelijk', color: 'bg-yellow-500' }
  if (score <= 4) return { score, label: 'Sterk', color: 'bg-green-500' }
  return { score, label: 'Zeer sterk', color: 'bg-emerald-600' }
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const passwordsMatch = confirmPassword === '' || password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voornaam || !achternaam || !email || !password || !confirmPassword) {
      toast.error('Vul alle velden in')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Voer een geldig emailadres in')
      return
    }
    if (password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens zijn')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Wachtwoorden komen niet overeen')
      return
    }
    if (!agreeTerms) {
      toast.error('Je moet akkoord gaan met de algemene voorwaarden')
      return
    }
    setIsLoading(true)
    try {
      await register(email, password, { voornaam, achternaam })
      toast.success('Account succesvol aangemaakt')
      navigate('/')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Registreren mislukt. Probeer opnieuw.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Left: Branding panel */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/6 rounded-full blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-5 h-5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>Workmate</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Start vandaag.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Gratis proberen.
            </span>
          </h2>
          <p className="text-[15px] text-slate-400 leading-relaxed mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            Maak een account aan en ontdek hoe Workmate je bedrijf efficiënter maakt. 14 dagen gratis, geen creditcard nodig.
          </p>
          <div className="space-y-4">
            {[
              { icon: Zap, text: 'Binnen 2 minuten aan de slag' },
              { icon: Shield, text: 'Veilige data opslag in Nederland' },
              { icon: Users, text: 'Onbeperkt gebruikers' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[14px] text-slate-300" style={{ fontFamily: 'Inter, sans-serif' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[12px] text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
          © {new Date().getFullYear()} Workmate. Alle rechten voorbehouden.
        </p>
      </div>

      {/* Right: Register form */}
      <div className="flex items-center justify-center flex-1 p-5 sm:p-8 bg-white dark:bg-slate-900 lg:rounded-l-[2rem]">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="12" rx="2" />
                  <path d="M8 20h8" />
                  <path d="M12 16v4" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>Workmate</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Account aanmaken
          </h1>
          <p className="text-[14.5px] text-slate-500 dark:text-slate-400 mb-7" style={{ fontFamily: 'Inter, sans-serif' }}>
            14 dagen gratis. Geen creditcard nodig.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="voornaam" className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">Voornaam</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="voornaam"
                    placeholder="Jan"
                    value={voornaam}
                    onChange={(e) => setVoornaam(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13.5px]"
                    disabled={isLoading}
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="achternaam" className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">Achternaam</Label>
                <Input
                  id="achternaam"
                  placeholder="de Vries"
                  value={achternaam}
                  onChange={(e) => setAchternaam(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13.5px]"
                  disabled={isLoading}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-email" className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13.5px]"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password" className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimaal 6 tekens"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13.5px]"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-all ${level <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">{passwordStrength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">Bevestig wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Herhaal je wachtwoord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-9 h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13.5px] ${!passwordsMatch ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {confirmPassword && passwordsMatch && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>
              {!passwordsMatch && <p className="text-[11px] text-red-500">Wachtwoorden komen niet overeen</p>}
            </div>

            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="terms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-[12.5px] font-normal text-slate-600 dark:text-slate-400 cursor-pointer leading-snug">
                Ik ga akkoord met de <span className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium">algemene voorwaarden</span>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl font-semibold text-[14px] group mt-2"
              disabled={isLoading || !agreeTerms}
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

          <p className="text-center text-[13.5px] text-slate-500 dark:text-slate-400 mt-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            Al een account?{' '}
            <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
              Inloggen
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
