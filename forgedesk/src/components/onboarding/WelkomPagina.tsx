import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, SkipForward } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FEATURES, BRAND_COLORS, slideVariants, snappySpring, staggerContainer, staggerItem, scaleIn } from './constants'
import { FeatureIllustrations } from './FeatureIllustrations'

const TOTAL_SLIDES = FEATURES.length + 1 // 6 features + 1 CTA

export function WelkomPagina() {
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(1)

  const goTo = useCallback((index: number) => {
    setDirection(index > currentSlide ? 1 : -1)
    setCurrentSlide(index)
  }, [currentSlide])

  const next = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setDirection(1)
      setCurrentSlide((s) => s + 1)
    }
  }, [currentSlide])

  const prev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide((s) => s - 1)
    }
  }, [currentSlide])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') goTo(TOTAL_SLIDES - 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev, goTo])

  const isFeatureSlide = currentSlide < FEATURES.length
  const currentFeature = isFeatureSlide ? FEATURES[currentSlide] : null
  const currentColor = currentFeature?.color || '#9B8EC4'
  const nextColor = FEATURES[(currentSlide + 1) % FEATURES.length]?.color || '#E8866A'

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 20% 10%, ${currentColor}18 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 85% 30%, ${nextColor}14 0%, transparent 55%),
          radial-gradient(ellipse 70% 50% at 50% 90%, #9B8EC412 0%, transparent 55%),
          hsl(var(--background))
        `,
        transition: 'background 0.8s ease',
      }}
    >
      {/* Ambient orbs */}
      <motion.div
        className="absolute top-[-120px] right-[-60px] w-[500px] h-[500px] rounded-full blur-[100px] opacity-25 pointer-events-none"
        animate={{ background: `linear-gradient(135deg, ${currentColor}, ${nextColor})` }}
        transition={{ duration: 1.5 }}
      />
      <motion.div
        className="absolute bottom-[-100px] left-[-80px] w-[400px] h-[400px] rounded-full blur-[90px] opacity-20 pointer-events-none"
        style={{ background: 'linear-gradient(225deg, #E8866A, #9B8EC4)' }}
      />

      {/* Progress bar */}
      <div className="px-5 pt-6 pb-2 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
              </svg>
            </div>
            <span className="text-[15px] font-extrabold tracking-[-0.04em] font-display">
              FORGE<span className="font-medium text-muted-foreground">desk</span>
            </span>
          </div>

          {/* Progress indicators */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className="flex-1 h-1.5 rounded-full transition-all duration-300 hover:opacity-80"
                style={{
                  backgroundColor: idx <= currentSlide
                    ? (idx < FEATURES.length ? FEATURES[idx].color : '#9B8EC4')
                    : 'hsl(var(--muted))',
                  opacity: idx <= currentSlide ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center px-5 py-8 relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          {isFeatureSlide ? (
            <motion.div
              key={`feature-${currentSlide}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={snappySpring}
              className="w-full max-w-4xl mx-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Left: Text content */}
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {/* Feature icon */}
                  <motion.div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                    style={{ backgroundColor: `${currentFeature!.color}18` }}
                    variants={scaleIn}
                  >
                    <currentFeature!.icon className="w-6 h-6" style={{ color: currentFeature!.color }} />
                  </motion.div>

                  <motion.h2
                    className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4 font-display leading-tight"
                    variants={staggerItem}
                  >
                    {currentFeature!.title}
                  </motion.h2>

                  <motion.p
                    className="text-lg text-muted-foreground leading-relaxed mb-5"
                    variants={staggerItem}
                  >
                    {currentFeature!.description}
                  </motion.p>

                  {/* Detail pill */}
                  <motion.div
                    className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: `${currentFeature!.color}12`,
                      color: currentFeature!.color,
                    }}
                    variants={staggerItem}
                  >
                    {currentFeature!.detail}
                  </motion.div>
                </motion.div>

                {/* Right: Illustration */}
                <motion.div
                  className="flex justify-center"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...snappySpring, delay: 0.15 }}
                >
                  <div className="bg-card/40 backdrop-blur-sm rounded-3xl border border-border/40 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    {React.createElement(FeatureIllustrations[currentSlide])}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            /* Final CTA slide */
            <motion.div
              key="cta"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={snappySpring}
              className="w-full max-w-2xl mx-auto text-center"
            >
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {/* Feature icons in a row */}
                <motion.div className="flex items-center justify-center gap-3 mb-8" variants={staggerItem}>
                  {FEATURES.map((f, i) => (
                    <motion.div
                      key={i}
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${f.color}15` }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 + i * 0.06 }}
                    >
                      <f.icon className="w-5 h-5" style={{ color: f.color }} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Brand accent line */}
                <motion.div className="flex items-center justify-center gap-1.5 mb-6" variants={staggerItem}>
                  {BRAND_COLORS.map((color) => (
                    <div key={color} className="h-1 w-8 rounded-full" style={{ backgroundColor: color }} />
                  ))}
                </motion.div>

                <motion.h2
                  className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4 font-display"
                  variants={staggerItem}
                >
                  Klaar om te beginnen?
                </motion.h2>

                <motion.p
                  className="text-lg text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed"
                  variants={staggerItem}
                >
                  Stel je bedrijf in en ga direct aan de slag. Het duurt maar 2 minuten.
                </motion.p>

                <motion.div variants={staggerItem}>
                  <Button
                    onClick={() => navigate('/onboarding')}
                    className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-[15px] px-8 group"
                  >
                    Mijn bedrijf instellen
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </motion.div>

                <motion.p
                  className="text-[13px] text-muted-foreground/60 mt-6"
                  variants={staggerItem}
                >
                  30 dagen gratis, geen creditcard nodig.
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation controls */}
      <div className="px-5 pb-6 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Left: Back */}
          <div className="w-32">
            {currentSlide > 0 && (
              <motion.button
                onClick={prev}
                className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Vorige
              </motion.button>
            )}
          </div>

          {/* Center: Slide dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: idx === currentSlide
                    ? (idx < FEATURES.length ? FEATURES[idx].color : '#9B8EC4')
                    : 'hsl(var(--muted-foreground))',
                  opacity: idx === currentSlide ? 1 : 0.25,
                  transform: idx === currentSlide ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* Right: Next or Skip */}
          <div className="w-32 flex justify-end">
            {isFeatureSlide ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => goTo(TOTAL_SLIDES - 1)}
                  className="text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <SkipForward className="inline w-3 h-3 mr-0.5 -mt-0.5" />
                  Skip
                </button>
                <Button
                  onClick={next}
                  size="sm"
                  className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-[13px] px-4 group"
                >
                  Volgende
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
