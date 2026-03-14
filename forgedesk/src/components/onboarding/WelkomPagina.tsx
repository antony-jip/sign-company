import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { FEATURES, BRAND_COLORS } from './constants'
import { FeatureIllustrations } from './FeatureIllustrations'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}
const scaleIn = {
  hidden: { scale: 0.8, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
}

export function WelkomPagina() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 20% 5%, #E8866A14 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 85% 15%, #7EB5A614 0%, transparent 55%),
          radial-gradient(ellipse 70% 45% at 50% 95%, #9B8EC410 0%, transparent 50%),
          hsl(var(--background))
        `,
      }}
    >
      {/* Ambient orbs */}
      <div className="absolute top-[-120px] right-[-60px] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'linear-gradient(135deg, #7EB5A6, #8BAFD4)' }} />
      <div className="absolute bottom-[-100px] left-[-80px] w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 pointer-events-none" style={{ background: 'linear-gradient(225deg, #E8866A, #9B8EC4)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 sm:py-16">
        {/* Header */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* Logo */}
          <motion.div className="flex items-center justify-center gap-2 mb-6" variants={fadeUp}>
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
              </svg>
            </div>
            <span className="text-[15px] font-extrabold tracking-[-0.04em] font-display">
              FORGE<span className="font-medium text-muted-foreground">desk</span>
            </span>
          </motion.div>

          {/* Brand accent */}
          <motion.div className="flex items-center justify-center gap-1.5 mb-6" variants={fadeUp}>
            {BRAND_COLORS.map((color) => (
              <div key={color} className="h-1 w-8 rounded-full" style={{ backgroundColor: color }} />
            ))}
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-4 font-display leading-tight"
            variants={fadeUp}
          >
            Alles voor je creatieve
            <br />
            <span className="bg-gradient-to-r from-[#E8866A] via-[#9B8EC4] to-[#7EB5A6] bg-clip-text text-transparent">
              projecten op één plek
            </span>
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
            variants={fadeUp}
          >
            Van eerste offerte tot oplevering — FORGEdesk geeft je overzicht,
            snelheid en een professionele uitstraling.
          </motion.p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {FEATURES.map((feature, index) => {
            const Illustration = FeatureIllustrations[index]
            return (
              <motion.div
                key={feature.title}
                className="group relative bg-card/50 backdrop-blur-sm rounded-2xl border border-border/40 p-6 hover:border-border/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300"
                variants={scaleIn}
              >
                {/* Color accent top */}
                <div
                  className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full opacity-40"
                  style={{ backgroundColor: feature.color }}
                />

                {/* Illustration */}
                {Illustration && (
                  <div className="flex justify-center mb-4 -mx-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <div className="scale-[0.55] origin-top -mb-24">
                      {React.createElement(Illustration)}
                    </div>
                  </div>
                )}

                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-[15px] font-bold text-foreground font-display">
                    {feature.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-3">
                  {feature.description}
                </p>

                {/* Detail pill */}
                <div
                  className="inline-flex items-center text-[12px] font-medium px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: `${feature.color}10`,
                    color: feature.color,
                  }}
                >
                  {feature.detail}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.8 }}
        >
          <Button
            onClick={() => navigate('/onboarding')}
            className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-[15px] px-8 group shadow-lg"
            style={{ boxShadow: '0 4px 14px hsl(var(--primary) / 0.25)' }}
          >
            Mijn bedrijf instellen
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>

          <p className="text-[13px] text-muted-foreground/60 mt-4">
            30 dagen gratis, geen creditcard nodig.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
