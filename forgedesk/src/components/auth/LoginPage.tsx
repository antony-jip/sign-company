import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, FileText, CalendarDays, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL || 'https://forgedesk.io'

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}
const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

const features = [
  { icon: FileText, label: 'Offertes & Facturen', color: '#E8866A' },
  { icon: CalendarDays, label: 'Planning', color: '#9B8EC4' },
  { icon: BarChart3, label: 'Rapportages', color: '#7EB5A6' },
]

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
      {/* Left: Branding panel */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{ background: 'rgba(126, 181, 166, 0.12)' }}
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ background: 'rgba(232, 134, 106, 0.1)' }}
            animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-[90px]"
            style={{ background: 'rgba(155, 142, 196, 0.08)' }}
            animate={{ x: [0, 25, 0], y: [0, -15, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Logo */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <a href={MARKETING_URL} className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg" style={{ boxShadow: '0 4px 14px hsl(var(--primary) / 0.3)' }}>
              <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight font-display">FORGEdesk</span>
          </a>
        </motion.div>

        {/* Animated SVG illustration */}
        <motion.div
          className="relative z-10 flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <svg width="320" height="230" viewBox="0 0 320 230" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
            {/* Desk */}
            <motion.rect x="40" y="155" width="240" height="8" rx="4" fill="#7EB5A6" opacity="0.3"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0.5 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            {/* Monitor */}
            <motion.rect x="100" y="40" width="120" height="85" rx="10" stroke="#8BAFD4" strokeWidth="2" fill="#8BAFD4" fillOpacity="0.06"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.4 }}
            />
            <rect x="108" y="48" width="104" height="68" rx="5" fill="#8BAFD4" fillOpacity="0.04" />
            {/* Chart line */}
            <motion.polyline
              points="118,96 132,82 148,88 162,72 176,78 190,62 200,66"
              fill="none" stroke="#7EB5A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Chart dots */}
            {[
              { cx: 118, cy: 96, delay: 0.9 },
              { cx: 148, cy: 88, delay: 1.0 },
              { cx: 176, cy: 78, delay: 1.1 },
              { cx: 200, cy: 66, delay: 1.2 },
            ].map((dot, i) => (
              <motion.circle key={i} cx={dot.cx} cy={dot.cy} r="3" fill="#7EB5A6"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: dot.delay }}
              />
            ))}
            {/* Monitor stand */}
            <motion.rect x="145" y="125" width="30" height="20" rx="3" fill="#8BAFD4" opacity="0.15"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            />
            <motion.rect x="130" y="143" width="60" height="5" rx="2.5" fill="#8BAFD4" opacity="0.2"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0.5 }}
              transition={{ duration: 0.3, delay: 0.55 }}
            />
            {/* Wrench — left */}
            <motion.g transform="translate(32, 75) rotate(-30)"
              initial={{ opacity: 0, rotate: -60 }} animate={{ opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.8 }}
            >
              <rect x="0" y="8" width="6" height="45" rx="3" fill="#D4836A" opacity="0.5" />
              <circle cx="3" cy="6" r="9" stroke="#D4836A" strokeWidth="2" fill="none" opacity="0.4" />
            </motion.g>
            {/* Ruler — right */}
            <motion.g transform="translate(255, 55) rotate(15)"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.9 }}
            >
              <rect x="0" y="0" width="12" height="70" rx="3" fill="#C4A882" opacity="0.35" />
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <line key={i} x1="0" y1={8 + i * 9} x2={i % 2 === 0 ? 7 : 5} y2={8 + i * 9} stroke="#C4A882" strokeWidth="1" opacity="0.5" />
              ))}
            </motion.g>
            {/* Document — left bottom */}
            <motion.g
              initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 1.0 }}
            >
              <rect x="48" y="100" width="32" height="42" rx="4" fill="#E8866A" fillOpacity="0.1" stroke="#E8866A" strokeWidth="1.5" opacity="0.45" />
              {[0, 1, 2].map(i => (
                <line key={i} x1="55" y1={113 + i * 8} x2={73 - i * 4} y2={113 + i * 8} stroke="#E8866A" strokeWidth="1.2" strokeLinecap="round" opacity={0.3 - i * 0.05} />
              ))}
            </motion.g>
            {/* Euro coin */}
            <motion.g
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 1.1 }}
            >
              <circle cx="80" cy="175" r="14" stroke="#C4A882" strokeWidth="1.5" opacity="0.4" />
              <text x="74" y="180" fill="#C4A882" opacity="0.5" fontSize="14" fontWeight="700">€</text>
            </motion.g>
            {/* Floating particles */}
            {[
              { cx: 220, cy: 35, r: 3, color: '#9B8EC4', delay: 1.2 },
              { cx: 245, cy: 50, r: 2, color: '#7EB5A6', delay: 1.3 },
              { cx: 60, cy: 50, r: 2.5, color: '#E8866A', delay: 1.4 },
              { cx: 285, cy: 100, r: 2, color: '#8BAFD4', delay: 1.5 },
              { cx: 50, cy: 170, r: 2, color: '#9B8EC4', delay: 1.6 },
            ].map((p, i) => (
              <motion.circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.color} opacity="0.3"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: p.delay }}
              />
            ))}
          </svg>
        </motion.div>

        {/* Text content */}
        <motion.div
          className="relative z-10 max-w-md"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h2
            className="text-4xl font-extrabold text-white leading-tight mb-4 font-display"
            variants={staggerItem}
          >
            Van offerte tot
            <br />
            <span style={{ color: '#7EB5A6' }}>
              montage op locatie.
            </span>
          </motion.h2>
          <motion.p
            className="text-[15px] text-white/50 leading-relaxed mb-8"
            variants={staggerItem}
          >
            Beheer je sign-projecten, plan montages, stuur offertes en factureer — alles vanuit één werkplek.
          </motion.p>
          <motion.div className="flex flex-wrap gap-3" variants={staggerItem}>
            {features.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 text-[13px] text-white/60 bg-white/5 border border-white/10 rounded-full px-4 py-2 hover:bg-white/8 transition-colors">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                {label}
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.p
          className="relative z-10 text-[12px] text-white/25"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          © {new Date().getFullYear()} FORGEdesk. Alle rechten voorbehouden.
        </motion.p>
      </div>

      {/* Right: Login form */}
      <div className="flex items-center justify-center flex-1 p-5 sm:p-8 bg-background lg:rounded-l-[2rem]">
        <motion.div
          className="w-full max-w-[400px]"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div className="flex items-center gap-2.5 mb-10 lg:hidden" variants={staggerItem}>
            <a href={MARKETING_URL} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="12" rx="2" />
                  <path d="M8 20h8" />
                  <path d="M12 16v4" />
                </svg>
              </div>
              <span className="text-lg font-bold text-foreground font-display">FORGEdesk</span>
            </a>
          </motion.div>

          <motion.h1 className="text-2xl font-bold text-foreground mb-1.5 font-display" variants={staggerItem}>
            Welkom terug
          </motion.h1>
          <motion.p className="text-[14.5px] text-muted-foreground mb-8" variants={staggerItem}>
            Log in op je FORGEdesk account
          </motion.p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div className="space-y-2" variants={staggerItem}>
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
            </motion.div>

            <motion.div className="space-y-2" variants={staggerItem}>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-medium text-foreground/70">Wachtwoord</Label>
                <Link
                  to="/wachtwoord-vergeten"
                  className="text-[12.5px] text-primary hover:underline font-medium"
                >
                  Vergeten?
                </Link>
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
            </motion.div>

            <motion.div variants={staggerItem}>
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
            </motion.div>
          </form>

          <motion.p className="text-center text-[13.5px] text-muted-foreground mt-8" variants={staggerItem}>
            Nog geen account?{' '}
            <Link to="/registreren" className="text-primary hover:underline font-semibold">
              Gratis registreren →
            </Link>
          </motion.p>

          <motion.p className="text-center text-[11px] text-muted-foreground/60 mt-6" variants={staggerItem}>
            Demo: gebruik demo@forgedesk.nl / demo1234
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
