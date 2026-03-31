import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'

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
    <div className="min-h-screen flex">
      {/* Left: Petrol brand panel with animated shapes */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 relative overflow-hidden"
        style={{ background: '#112F35' }}
      >
        {/* Animated floating shapes */}
        <style>{`
          @keyframes float-1 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(30px, -40px) rotate(8deg); } }
          @keyframes float-2 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-20px, 30px) rotate(-5deg); } }
          @keyframes float-3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(15px, -20px) scale(1.08); } }
          @keyframes float-4 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-25px, -15px) rotate(12deg); } }
          @keyframes pulse-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
          .float-1 { animation: float-1 8s ease-in-out infinite; }
          .float-2 { animation: float-2 10s ease-in-out infinite; }
          .float-3 { animation: float-3 12s ease-in-out infinite; }
          .float-4 { animation: float-4 9s ease-in-out infinite; }
          .pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        `}</style>

        {/* Large teal gradient blob - top right */}
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full blur-[100px] float-1" style={{ background: 'radial-gradient(circle, rgba(126, 200, 208, 0.15) 0%, transparent 70%)' }} />

        {/* Orange accent blob - bottom left */}
        <div className="absolute bottom-10 -left-10 w-[350px] h-[350px] rounded-full blur-[90px] float-2" style={{ background: 'radial-gradient(circle, rgba(241, 80, 37, 0.1) 0%, transparent 70%)' }} />

        {/* Small teal circle */}
        <div className="absolute top-[30%] left-[15%] w-[200px] h-[200px] rounded-full blur-[60px] float-3" style={{ background: 'rgba(126, 200, 208, 0.08)' }} />

        {/* Geometric shapes */}
        <div className="absolute top-[20%] right-[20%] w-24 h-24 rounded-3xl border border-white/[0.06] float-4" style={{ background: 'rgba(126, 200, 208, 0.04)' }} />
        <div className="absolute bottom-[30%] left-[25%] w-16 h-16 rounded-2xl border border-white/[0.05] float-1" style={{ background: 'rgba(241, 80, 37, 0.03)', animationDelay: '2s' }} />
        <div className="absolute top-[55%] right-[12%] w-20 h-20 rounded-full border border-white/[0.04] float-2" style={{ background: 'rgba(126, 200, 208, 0.03)', animationDelay: '4s' }} />
        <div className="absolute top-[12%] left-[40%] w-3 h-3 rounded-full pulse-glow" style={{ background: '#7EC8D0' }} />
        <div className="absolute bottom-[20%] right-[30%] w-2 h-2 rounded-full pulse-glow" style={{ background: '#F15025', animationDelay: '2s' }} />
        <div className="absolute top-[45%] left-[10%] w-2.5 h-2.5 rounded-full pulse-glow" style={{ background: '#7EC8D0', animationDelay: '3s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div>
            <Link to="/" className="inline-block">
              <span className="text-[32px] font-extrabold text-white tracking-[-0.04em]">
                doen<span className="text-[#F15025]" style={{ textShadow: '0 0 20px rgba(241, 80, 37, 0.5)' }}>.</span>
              </span>
            </Link>
          </div>

          {/* Center headline */}
          <div className="max-w-md">
            <h2 className="text-[48px] font-extrabold text-white leading-[1.05] tracking-[-0.03em] mb-6">
              Niet praten,<br />gewoon<br /><span className="text-[#7EC8D0]">doen.</span>
            </h2>
            <p className="text-[16px] text-white/50 leading-relaxed max-w-sm">
              Offertes, facturen, planning en werkbonnen — alles vanuit één plek. Minder gedoe, meer gedaan.
            </p>
          </div>

          {/* Footer */}
          <p className="text-[11px] text-white/20">© {new Date().getFullYear()} doen. Alle rechten voorbehouden.</p>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex flex-col items-center justify-center flex-1 p-6 sm:p-10 bg-[#FEFDFB] relative">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: 'rgba(241, 80, 37, 0.03)' }} />

        <div className="w-full max-w-[380px] relative z-10">
          {/* Mobile logo */}
          <div className="mb-12 lg:hidden">
            <Link to="/" className="inline-block">
              <span className="text-[28px] font-extrabold text-[#1A1A1A] tracking-[-0.04em]">
                doen<span className="text-[#F15025]">.</span>
              </span>
            </Link>
          </div>

          <h1 className="text-[28px] font-extrabold text-[#1A1A1A] tracking-[-0.03em] leading-tight mb-2">
            Weer aan de slag
          </h1>
          <p className="text-[15px] text-[#9B9B95] mb-8">
            Log in en doe waar je goed in bent
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-[#6B6B66]">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8]" />
                <Input
                  id="email"
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-medium text-[#6B6B66]">Wachtwoord</Label>
                <Link to="/wachtwoord-vergeten" className="text-[12px] text-[#1A535C] hover:underline font-medium">
                  Vergeten?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Voer je wachtwoord in"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl border-[#E6E4E0] bg-white text-[14px] focus:border-[#1A535C] focus:ring-[#1A535C]/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all"
                  disabled={isLoading}
                  autoComplete="current-password"
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
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold text-[15px] transition-all group bg-[#1A535C] hover:bg-[#164A52] text-white mt-3 shadow-[0_2px_8px_rgba(26,83,92,0.25)]"
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
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-[13px] text-[#B0ADA8] mt-8">
            Nog geen account?{' '}
            <Link to="/registreren" className="text-[#F15025] hover:underline font-semibold">
              Gratis uitproberen
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
