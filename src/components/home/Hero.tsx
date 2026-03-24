'use client'

import { motion } from 'framer-motion'
import WachtlijstForm from '../WachtlijstForm'

const words = ['Doe', 'waar', 'je', 'goed', 'in', 'bent.']

export default function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden dot-grid">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg via-bg to-flame/[0.03] pointer-events-none" />

      <div className="container-site relative z-10 pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="max-w-4xl">
          {/* Staggered headline */}
          <h1 className="hero-heading font-heading text-petrol mb-6">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.2 + i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`inline-block mr-[0.25em] ${
                  word === 'bent.' ? '' : ''
                }`}
              >
                {word.endsWith('.') ? (
                  <>
                    {word.slice(0, -1)}
                    <span className="text-flame">.</span>
                  </>
                ) : (
                  word
                )}
              </motion.span>
            ))}
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="text-muted text-lg md:text-xl max-w-xl mb-10 leading-relaxed"
          >
            Van offerte tot factuur — alles op een plek. Bedrijfssoftware die
            meedenkt, zodat jij kunt doen waar je goed in bent.
          </motion.p>

          {/* Waitlist form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <WachtlijstForm />
            <p className="text-xs text-muted/60 mt-3">
              Eerste 30 dagen gratis. Geen creditcard nodig.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Gedaan ticker */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden marquee-fade">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="flex animate-marquee whitespace-nowrap py-4"
        >
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex items-center">
              {[
                'offerte verstuurd',
                'factuur betaald',
                'project opgeleverd',
                'montage gepland',
                'werkbon getekend',
                'klant akkoord',
              ].map((item, i) => (
                <span
                  key={`${setIndex}-${i}`}
                  className="font-mono text-sm text-muted/30 mx-6 whitespace-nowrap"
                >
                  {item}<span className="text-flame/40">.</span>
                  <span className="mx-4 text-flame/20">&#10022;</span>
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
