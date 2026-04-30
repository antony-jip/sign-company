import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { DoenAuthShell, DoenAuthHeader, DoenAuthFooter, DoenFormCard, DropInDot } from './RegisterPage'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
  },
}

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
    <DoenAuthShell>
      <DoenAuthHeader rightSlot={
        <p className="text-[13px] text-[#6B6B66] hidden sm:block">
          Nog geen account?{' '}
          <Link to="/registreren" className="text-[#F15025] font-semibold hover:underline underline-offset-4">
            Gratis uitproberen
          </Link>
        </p>
      } />

      <main className="relative z-10 flex-1 max-w-[1200px] w-full mx-auto px-6 sm:px-10 pt-8 sm:pt-12 pb-12 grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="lg:col-span-7 lg:pt-6"
        >
          <motion.p variants={item} className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1A535C]/70 mb-5">
            <span className="inline-block w-6 h-px bg-[#1A535C]/40 align-middle mr-3" />
            Inloggen
          </motion.p>

          <motion.h1
            variants={item}
            className="font-heading font-extrabold tracking-[-0.025em] text-[#191919]"
            style={{ lineHeight: 1.02 }}
          >
            <span className="block text-[40px] sm:text-[52px] lg:text-[60px] xl:text-[68px]">
              Welkom
            </span>
            <span className="block text-[40px] sm:text-[52px] lg:text-[60px] xl:text-[68px]">
              terug
              <DropInDot delay={0.5} />
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 text-[16px] sm:text-[17px] text-[#5A5A55] leading-[1.6] max-w-[460px]"
          >
            Inloggen en weer aan het{' '}
            <span className="text-[#191919] font-semibold">
              doen<span style={{ color: '#F15025' }}>.</span>
            </span>{' '}
            Geen tijd te verspillen.
          </motion.p>

          <motion.p
            variants={item}
            className="mt-8 text-[12px] uppercase tracking-[0.18em] font-semibold text-[#9B9B95]"
          >
            Offertes <span className="mx-2 text-[#F15025]">·</span>
            Werkbonnen <span className="mx-2 text-[#F15025]">·</span>
            Planning <span className="mx-2 text-[#F15025]">·</span>
            Facturen
          </motion.p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 180, damping: 22, mass: 0.9 }}
          className="lg:col-span-5 lg:pt-2 w-full"
        >
          <DoenFormCard accentColor="#1A535C">
            <h2 className="font-heading text-[22px] font-extrabold text-[#191919] tracking-[-0.02em] mb-1">
              Aanmelden<span style={{ color: '#F15025' }}>.</span>
            </h2>
            <p className="text-[13.5px] text-[#5A5A55] mb-6">
              Log in op je doen.-account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A5A55]">
                  E-mailadres
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8] pointer-events-none" aria-hidden />
                  <Input
                    id="email"
                    type="email"
                    placeholder="naam@bedrijf.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-[#EBEBEB] bg-[#F8F7F5] text-[14px] focus:border-[#1A535C] focus:bg-white focus-visible:ring-[#1A535C]/20 transition-all"
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A5A55]">
                    Wachtwoord
                  </Label>
                  <Link to="/wachtwoord-vergeten" className="text-[12px] text-[#1A535C] hover:underline underline-offset-4 font-medium">
                    Vergeten?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#C0BDB8] pointer-events-none" aria-hidden />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Voer je wachtwoord in"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-12 h-11 rounded-xl border-[#EBEBEB] bg-[#F8F7F5] text-[14px] focus:border-[#1A535C] focus:bg-white focus-visible:ring-[#1A535C]/20 transition-all"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-[#C0BDB8] hover:text-[#5A5A55] transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]/30"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-semibold text-[14px] transition-all group bg-[#1A535C] hover:bg-[#164A52] text-white mt-2 shadow-[0_6px_20px_-8px_rgba(26,83,92,0.55)]"
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

            <p className="text-center text-[12px] text-[#9B9B95] mt-5 sm:hidden">
              Nog geen account?{' '}
              <Link to="/registreren" className="text-[#F15025] font-semibold hover:underline">
                Gratis uitproberen
              </Link>
            </p>
          </DoenFormCard>
        </motion.section>
      </main>

      <DoenAuthFooter />
    </DoenAuthShell>
  )
}
