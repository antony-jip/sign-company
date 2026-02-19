import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, User, Loader2, Sparkles } from 'lucide-react'

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
    } catch (error: any) {
      toast.error(error?.message || 'Registreren mislukt. Probeer opnieuw.')
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
      </div>

      <div className="w-full max-w-md animate-scale-in relative z-10">
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-2">
            {/* Workmate Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#386150] via-[#58B09C] to-[#CAF7E2] flex items-center justify-center shadow-lg shadow-[#58B09C]/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">Workmate</span>
            </div>
            <CardTitle className="text-2xl font-bold">Account aanmaken</CardTitle>
            <CardDescription className="text-base">Maak een nieuw account aan om te beginnen</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voornaam">Voornaam</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="voornaam"
                      type="text"
                      placeholder="Jan"
                      value={voornaam}
                      onChange={(e) => setVoornaam(e.target.value)}
                      className="pl-10 h-11"
                      disabled={isLoading}
                      autoComplete="given-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="achternaam">Achternaam</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="achternaam"
                      type="text"
                      placeholder="de Vries"
                      value={achternaam}
                      onChange={(e) => setAchternaam(e.target.value)}
                      className="pl-10 h-11"
                      disabled={isLoading}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="register-email"
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
                <Label htmlFor="register-password">Wachtwoord</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimaal 6 tekens"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    disabled={isLoading}
                    autoComplete="new-password"
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
                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            level <= passwordStrength.score
                              ? passwordStrength.color
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sterkte: {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Bevestig Wachtwoord</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Herhaal je wachtwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 h-11 ${
                      !passwordsMatch ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {!passwordsMatch && (
                  <p className="text-xs text-destructive">Wachtwoorden komen niet overeen</p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-snug">
                  Ik ga akkoord met de{' '}
                  <span className="text-primary hover:underline cursor-pointer">
                    algemene voorwaarden
                  </span>
                </Label>
              </div>

              {/* Register Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#386150] to-[#58B09C] hover:from-[#2d5243] hover:to-[#4a9d8a] text-white shadow-lg shadow-[#58B09C]/25 transition-all duration-200"
                disabled={isLoading || !agreeTerms}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Account aanmaken...
                  </>
                ) : (
                  'Account aanmaken'
                )}
              </Button>

              {/* Login Link */}
              <p className="text-center text-sm text-muted-foreground">
                Al een account?{' '}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Inloggen
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
