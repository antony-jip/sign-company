import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, FileText, CalendarDays, BarChart3 } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Vul alle velden in')
      return
    }
    setIsLoading(true)
    try {
      await login(email, password)
      toast.success('Succesvol ingelogd')
      navigate('/')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Inloggen mislukt. Controleer je gegevens.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-foreground">
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Left: Branding panel */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden">
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
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg" style={{ boxShadow: '0 4px 14px hsl(var(--primary) / 0.3)' }}>
              <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>FORGEdesk</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Van offerte tot
            <br />
            <span className="text-primary-foreground" style={{ color: 'hsl(var(--primary))' }}>
              montage op locatie.
            </span>
          </h2>
          <p className="text-[15px] text-white/50 leading-relaxed mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            Beheer je sign-projecten, plan montages, stuur offertes en factureer — alles vanuit één werkplek.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: FileText, label: 'Offertes & Facturen' },
              { icon: CalendarDays, label: 'Planning' },
              { icon: BarChart3, label: 'Rapportages' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-[13px] text-white/50 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                <Icon className="w-3.5 h-3.5 text-white/40" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[12px] text-white/25" style={{ fontFamily: 'Inter, sans-serif' }}>
          © {new Date().getFullYear()} FORGEdesk. Alle rechten voorbehouden.
        </p>
      </div>

      {/* Right: Login form */}
      <div className="flex items-center justify-center flex-1 p-5 sm:p-8 bg-background lg:rounded-l-[2rem]">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="12" rx="2" />
                  <path d="M8 20h8" />
                  <path d="M12 16v4" />
                </svg>
              </div>
              <span className="text-lg font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>FORGEdesk</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Welkom terug
          </h1>
          <p className="text-[14.5px] text-muted-foreground mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            Log in op je FORGEdesk account
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium text-foreground/70">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-border bg-muted/50 focus:bg-card transition-colors"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-medium text-foreground/70">Wachtwoord</Label>
                <button
                  type="button"
                  onClick={() => toast.info('Neem contact op met de beheerder voor een wachtwoord reset.')}
                  className="text-[12.5px] text-primary hover:underline font-medium"
                >
                  Vergeten?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Voer je wachtwoord in"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 rounded-xl border-border bg-muted/50 focus:bg-card transition-colors"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-[14px] transition-all group"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig met inloggen...
                </>
              ) : (
                <>
                  Inloggen
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-[13.5px] text-muted-foreground mt-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            Nog geen account?{' '}
            <Link to="/register" className="text-primary hover:underline font-semibold">
              Gratis registreren
            </Link>
          </p>

          <p className="text-center text-[11px] text-muted-foreground/60 mt-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            Demo: gebruik demo@forgedesk.nl / demo1234
          </p>
        </div>
      </div>
    </div>
  )
}
