import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, Globe, Loader2, Sparkles, ArrowRight, Shield, Zap, BarChart3 } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
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
    } catch (error: any) {
      toast.error(error?.message || 'Inloggen mislukt. Controleer je gegevens.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex wm-login-bg relative overflow-hidden">
      {/* Left side — Branding */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Workmate</span>
        </div>

        {/* Hero text */}
        <div className="max-w-md space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Jouw bedrijf,<br />
            <span className="text-indigo-300">slimmer beheerd.</span>
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Alles wat je nodig hebt voor klantenbeheer, offertes, projecten en meer — in één platform.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-white/70 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              AI-Assistent
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              Live Analytics
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Veilig & Privé
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-white/30 text-sm">
          Workmate CRM — Gebouwd voor Nederlandse bedrijven
        </p>
      </div>

      {/* Right side — Login form */}
      <div className="flex items-center justify-center flex-1 p-4 md:p-8 relative z-10">
        {/* Decorative orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-[420px] animate-scale-in relative z-10">
          <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-xl">
            <CardHeader className="text-center pb-2 pt-8">
              {/* Mobile-only logo */}
              <div className="flex items-center justify-center gap-3 mb-6 lg:hidden">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-foreground">Workmate</span>
              </div>
              <CardTitle className="text-2xl font-bold">Welkom terug</CardTitle>
              <CardDescription className="text-base mt-1">Log in op je account</CardDescription>
            </CardHeader>

            <CardContent className="pb-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="naam@bedrijf.nl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 rounded-xl"
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">Wachtwoord</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Voer je wachtwoord in"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 rounded-xl"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                      Onthoud mij
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info('Wachtwoord reset is nog niet geconfigureerd. Neem contact op met de beheerder.')}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 rounded-xl group"
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

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">of</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  disabled={isLoading}
                  onClick={() => toast.info('Google login is nog niet geconfigureerd')}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Inloggen met Google
                </Button>

                <p className="text-center text-sm text-muted-foreground pt-2">
                  Nog geen account?{' '}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    Registreer
                  </Link>
                </p>

                <p className="text-center text-[11px] text-muted-foreground/50 mt-4">
                  Demo modus: gebruik elk email/wachtwoord als Supabase niet geconfigureerd is
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
