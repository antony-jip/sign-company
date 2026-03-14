import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resendConfirmation } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Mail, ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { BRAND_COLORS, staggerContainer, staggerItem, scaleIn } from '@/components/onboarding/constants'

export function CheckInboxPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = async () => {
    if (!email || cooldown > 0) return
    setIsResending(true)
    try {
      await resendConfirmation(email)
      toast.success('Mail opnieuw verstuurd!')
      setCooldown(60)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Versturen mislukt. Probeer opnieuw.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 15% 5%, #7EB5A620 0%, transparent 60%),
          radial-gradient(ellipse 60% 45% at 90% 20%, #E8866A18 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 50% 95%, #9B8EC415 0%, transparent 50%),
          radial-gradient(ellipse 45% 35% at 80% 70%, #C4A88212 0%, transparent 45%),
          hsl(var(--background))
        `,
      }}
    >
      {/* Ambient orbs */}
      <div className="absolute top-[-100px] right-[-40px] w-[450px] h-[450px] rounded-full blur-[100px] opacity-25 pointer-events-none" style={{ background: 'linear-gradient(135deg, #7EB5A6, #8BAFD4)' }} />
      <div className="absolute bottom-[-80px] left-[-60px] w-[350px] h-[350px] rounded-full blur-[90px] opacity-20 pointer-events-none" style={{ background: 'linear-gradient(225deg, #E8866A, #9B8EC4)' }} />

      <motion.div
        className="w-full max-w-md text-center relative z-10 bg-card/60 backdrop-blur-xl rounded-3xl border border-border/50 shadow-[0_8px_40px_rgba(0,0,0,0.04)] p-8 sm:p-10"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Animated envelope icon */}
        <motion.div
          className="relative w-16 h-16 mx-auto mb-6"
          variants={scaleIn}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(126, 181, 166, 0.15)' }}
          >
            <Mail className="w-7 h-7" style={{ color: '#7EB5A6' }} />
          </div>
          {/* Pulsing sparkle */}
          <motion.div
            className="absolute -top-1 -right-1"
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-4 h-4" style={{ color: '#E8866A' }} />
          </motion.div>
        </motion.div>

        {/* Brand accent line */}
        <motion.div className="flex items-center justify-center gap-1.5 mb-5" variants={staggerItem}>
          {BRAND_COLORS.map((color) => (
            <div key={color} className="h-1 w-6 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </motion.div>

        <motion.h1
          className="text-2xl font-bold text-foreground mb-2 font-display"
          variants={staggerItem}
        >
          Check je inbox!
        </motion.h1>

        <motion.p
          className="text-[15px] text-muted-foreground mb-8 leading-relaxed"
          variants={staggerItem}
        >
          We hebben een bevestigingsmail gestuurd naar{' '}
          {email && <span className="font-semibold text-foreground">{email}</span>}
          {!email && 'je emailadres'}. Klik op de link in de mail om je account te activeren.
        </motion.p>

        <motion.div variants={staggerItem}>
          <Button
            onClick={handleResend}
            variant="outline"
            className="h-11 rounded-xl text-[14px] font-medium px-6"
            disabled={isResending || cooldown > 0}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Versturen...
              </>
            ) : cooldown > 0 ? (
              `Opnieuw versturen (${cooldown}s)`
            ) : (
              'Opnieuw versturen'
            )}
          </Button>
        </motion.div>

        <motion.p
          className="text-[13px] text-muted-foreground/70 mt-6 mb-8"
          variants={staggerItem}
        >
          Tip: Check ook je spam folder.
        </motion.p>

        <motion.div variants={staggerItem}>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-[13.5px] text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar inloggen
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
