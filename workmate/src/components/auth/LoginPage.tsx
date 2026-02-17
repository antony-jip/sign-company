import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, Globe, Loader2, Sparkles } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center wm-login-bg p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-float" />
        <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-white/15 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-white/10 rounded-full animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md animate-scale-in relative z-10">
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-2">
            {/* Workmate Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">Workmate</span>
            </div>
            <CardTitle className="text-2xl font-bold">Welkom terug</CardTitle>
            <CardDescription className="text-base">Log in op je account</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="naam@bedrijf.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Voer je wachtwoord in"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
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

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bezig met inloggen...
                  </>
                ) : (
                  'Inloggen'
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">of</span>
                </div>
              </div>

              {/* Google Login */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                disabled={isLoading}
                onClick={() => toast.info('Google login is nog niet geconfigureerd')}
              >
                <Globe className="mr-2 h-4 w-4" />
                Inloggen met Google
              </Button>

              {/* Register Link */}
              <p className="text-center text-sm text-muted-foreground">
                Nog geen account?{' '}
                <Link
                  to="/register"
                  className="text-primary hover:underline font-medium"
                >
                  Registreer
                </Link>
              </p>

              {/* Demo Mode Notice */}
              <p className="text-center text-xs text-muted-foreground/60 mt-4">
                Demo modus: gebruik elk email/wachtwoord als Supabase niet geconfigureerd is
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
