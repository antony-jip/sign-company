import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ParticleField } from '@/components/onboarding/ParticleField'

const MONO = { fontFamily: '"DM Mono", ui-monospace, monospace' } as const

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 240, damping: 22 },
  },
}

interface EmailFocusKaartProps {
  onUitzetten: () => void
}

export function EmailFocusKaart({ onUitzetten }: EmailFocusKaartProps) {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-[#F8F7F5]">
      <ParticleField />
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-lg w-full mx-6 text-center"
      >
        <motion.div variants={item} className="mb-6">
          <span
            className="text-[11px] uppercase tracking-wider text-muted-hex"
            style={MONO}
          >
            focus modus<span className="text-flame">.</span>
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="font-heading font-extrabold text-ink mb-4"
          style={{ fontSize: '32px', letterSpacing: '-0.5px', lineHeight: 1.1 }}
        >
          De inbox kan wachten<span className="text-flame">.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="text-[15px] text-text-sec mb-10 max-w-md mx-auto"
          style={{ lineHeight: 1.55 }}
        >
          Geen ongelezen-tellers, geen nieuwe mails in zicht.
          Maak iets moois. De rest komt later wel.
        </motion.p>

        <motion.div variants={item}>
          <Button
            onClick={onUitzetten}
            variant="ghost"
            className="h-10 px-5 rounded-lg text-petrol hover:text-petrol hover:bg-petrol/5 font-medium text-[14px] group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Terug naar inbox
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
