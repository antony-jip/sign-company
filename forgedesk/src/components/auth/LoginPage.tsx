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
        <p className="text-[13px] text-white/60 hidden sm:block">
          Nog geen account?{' '}
          <Link to="/registreren" className="text-flame font-semibold hover:underline underline-offset-4">
            Gratis uitproberen
          </Link>
        </p>
      } />

      {/* items-center i.p.v. items-start: de inhoud zat in de bovenste 45% en
          liet de halve pagina leeg hangen. */}
      <main className="relative z-10 flex-1 max-w-[1200px] w-full mx-auto px-6 sm:px-10 py-12 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="lg:col-span-7"
        >
          {/* Serif-cursief op één woord: zelfde handschrift als de
              dashboard-hero ("Klaar om te afronden"), zodat de deur en het
              product op elkaar rijmen. */}
          <motion.h1
            variants={item}
            className="font-heading font-extrabold tracking-[-0.03em] text-white"
            style={{ lineHeight: 0.98 }}
          >
            <span className="block text-[44px] sm:text-[60px] lg:text-[72px] xl:text-[84px]">
              Welkom
            </span>
            <span className="block text-[44px] sm:text-[60px] lg:text-[72px] xl:text-[84px]">
              <span
                style={{
                  fontFamily: '"Instrument Serif", serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                }}
              >
                terug
              </span>
              <DropInDot delay={0.5} />
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-7 text-[17px] sm:text-[18px] text-white/65 leading-[1.6] max-w-[440px]"
          >
            Offertes, werkbonnen, planning en facturen op één plek.
            Inloggen en weer aan het{' '}
            <span className="text-white font-semibold">
              doen<span style={{ color: '#F15025' }}>.</span>
            </span>
          </motion.p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 180, damping: 22, mass: 0.9 }}
          className="lg:col-span-5 w-full"
        >
          <DoenFormCard accentColor="#1A535C">
            <h2 className="font-heading text-[22px] font-extrabold text-foreground dark:text-foreground tracking-[-0.02em] mb-1">
              Aanmelden<span style={{ color: '#F15025' }}>.</span>
            </h2>
            <p className="text-[13px] text-foreground/70 mb-6">
              Log in op je doen.-account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
                  E-mailadres
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground/70 pointer-events-none" aria-hidden />
                  <Input
                    id="email"
                    type="email"
                    placeholder="naam@bedrijf.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-border bg-background text-[14px] focus:border-petrol focus:bg-white dark:focus:border-[#4E96A3] dark:focus:bg-white/[0.06] focus-visible:ring-petrol/20 dark:focus-visible:ring-[#4E96A3]/25 transition-all"
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
                    Wachtwoord
                  </Label>
                  <Link to="/wachtwoord-vergeten" className="text-[12px] text-petrol dark:text-[#8FC3CC] hover:underline underline-offset-4 font-medium">
                    Vergeten?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground/70 pointer-events-none" aria-hidden />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Voer je wachtwoord in"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-12 h-11 rounded-xl border-border bg-background text-[14px] focus:border-petrol focus:bg-white dark:focus:border-[#4E96A3] dark:focus:bg-white/[0.06] focus-visible:ring-petrol/20 dark:focus-visible:ring-[#4E96A3]/25 transition-all"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-muted-foreground/70 hover:text-foreground/70 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrol/30"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                // Arbitrary background i.p.v. bg-flame: de Button-default zet
                // een linear-gradient op de shorthand, die wint anders.
                className="w-full h-12 rounded-xl font-semibold text-[15px] transition-all group text-white mt-3 [background:linear-gradient(135deg,#F1602F_0%,#D8431C_100%)] hover:[background:linear-gradient(135deg,#F15025_0%,#C63B16_100%)] [box-shadow:0_8px_24px_-8px_rgba(241,80,37,0.55)] hover:[box-shadow:0_10px_28px_-8px_rgba(241,80,37,0.7)]"
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

            <p className="text-center text-[12px] text-muted-foreground mt-5 sm:hidden">
              Nog geen account?{' '}
              <Link to="/registreren" className="text-flame font-semibold hover:underline">
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
