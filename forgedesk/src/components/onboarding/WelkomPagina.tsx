import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, FileText, Wrench, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { getProfile } from '@/services/supabaseService'
import { ParticleField } from './ParticleField'

const MONO = { fontFamily: '"DM Mono", ui-monospace, monospace' } as const

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 },
  },
}

const cards = [
  {
    title: 'Offertes die opvallen.',
    emphasis: 'PDF in 4 minuten. Mooier dan de concurrent.',
    Icon: FileText,
    bg: 'bg-mod-offertes-light/60',
    border: 'border-mod-offertes-border/50',
    hoverBorder: 'hover:border-mod-offertes',
    accent: 'text-mod-offertes-text',
    iconColor: 'text-mod-offertes',
  },
  {
    title: 'Je team weet wat te doen.',
    emphasis: 'Monteur opent de app, ziet klus. Geen belletjes meer.',
    Icon: Wrench,
    bg: 'bg-mod-planning-light/70',
    border: 'border-mod-planning-border/50',
    hoverBorder: 'hover:border-mod-planning',
    accent: 'text-mod-planning-text',
    iconColor: 'text-mod-planning',
  },
  {
    title: 'Klanten zien zelf hoe ver je bent.',
    emphasis: "Portaal met foto's, statusupdates, goedkeuringen.",
    Icon: Eye,
    bg: 'bg-mod-klanten-light/60',
    border: 'border-mod-klanten-border/50',
    hoverBorder: 'hover:border-mod-klanten',
    accent: 'text-mod-klanten-text',
    iconColor: 'text-mod-klanten',
  },
]

function Wordmark() {
  return (
    <div className="inline-flex items-baseline gap-[1px] font-heading">
      <span className="text-[17px] font-bold tracking-tight text-ink">doen</span>
      <motion.span
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
        className="text-[17px] font-bold text-flame leading-none"
      >
        .
      </motion.span>
    </div>
  )
}

export function WelkomPagina() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [voornaam, setVoornaam] = useState('')

  useEffect(() => {
    if (!user) return
    setVoornaam(user.user_metadata?.voornaam || '')
    ;(async () => {
      try {
        const profile = await getProfile(user.id)
        if (profile?.voornaam) setVoornaam(profile.voornaam)
      } catch {
        // stil — fallback blijft user_metadata
      }
    })()
  }, [user])

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#F8F7F5] overflow-hidden">
      <ParticleField />
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-2xl"
      >
        <motion.div variants={item} className="mb-10">
          <Wordmark />
        </motion.div>

        <motion.h1
          variants={item}
          className="font-heading font-extrabold text-ink mb-2"
          style={{ fontSize: '34px', letterSpacing: '-0.5px', lineHeight: 1.1, fontWeight: 800 }}
        >
          Je hele bedrijf. Eén plek<span className="text-flame">.</span>
        </motion.h1>

        {voornaam && (
          <motion.p
            variants={item}
            className="text-[15px] text-text-sec mb-6"
          >
            Welkom, {voornaam}.
          </motion.p>
        )}

        <motion.p
          variants={item}
          className="text-[15px] text-text-sec mb-10 max-w-lg"
          style={{ lineHeight: 1.55 }}
        >
          Portaal voor je klanten. Offertes, projecten en planning op één plek. Koppelingen met Exact en Mollie.{' '}
          <span className="text-petrol font-medium">Aangedreven door Claude.</span>
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {cards.map((c) => (
            <motion.div
              key={c.title}
              variants={item}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`group relative ${c.bg} ${c.border} ${c.hoverBorder} border rounded-xl p-5 cursor-default transition-[box-shadow,border-color] duration-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]`}
            >
              <c.Icon
                className={`absolute top-5 right-5 w-5 h-5 ${c.iconColor}`}
                strokeWidth={1.75}
              />
              <p className={`font-heading font-semibold text-[15px] ${c.accent} mb-1 pr-8`}>
                {c.title}
              </p>
              <p className="text-[13px] text-ink/70 pr-8" style={{ lineHeight: 1.45 }}>
                {c.emphasis}
              </p>
              <ArrowRight
                className={`absolute bottom-4 right-5 w-4 h-4 ${c.iconColor} opacity-0 group-hover:opacity-100 group-hover:translate-x-[2px] transition-all duration-200`}
              />
            </motion.div>
          ))}
        </div>

        <motion.div variants={item} className="flex flex-col items-start gap-2 mb-16">
          <Button
            onClick={() => navigate('/onboarding')}
            className="h-11 px-6 rounded-lg bg-flame hover:bg-flame-text text-white font-semibold text-[14px] shadow-sm hover:shadow-md transition-all group"
          >
            Mijn bedrijf instellen
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <span
            className="text-[11px] uppercase tracking-wider text-muted-hex"
            style={MONO}
          >
            ± 2 min
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-[11px] uppercase tracking-wider text-muted-hex"
          style={MONO}
        >
          account aangemaakt<span className="text-flame">.</span>
          <span className="mx-1.5 text-muted-hex/60">∙</span>
          proefperiode gestart<span className="text-flame">.</span>
          <span className="mx-1.5 text-muted-hex/60">∙</span>
          30 dagen klaar voor jou<span className="text-flame">.</span>
        </motion.p>
      </motion.div>
    </div>
  )
}
