'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { User, Hammer, FileText, MonitorCheck, CalendarClock, Receipt, Smile, type LucideIcon } from 'lucide-react'

type Step = { icon: LucideIcon; label: string; sub: string; final?: boolean }

const STEPS: Step[] = [
  { icon: User, label: 'Klant', sub: 'doet aanvraag' },
  { icon: Hammer, label: 'Project', sub: 'alles op één plek' },
  { icon: FileText, label: 'Offerte', sub: 'calculeer en verstuur' },
  { icon: MonitorCheck, label: 'Portaal', sub: 'klant keurt goed' },
  { icon: CalendarClock, label: 'Planning', sub: 'werkbon en montage' },
  { icon: Receipt, label: 'Factuur', sub: 'incasseer eenvoudig' },
  { icon: Smile, label: 'Gedaan', sub: '', final: true },
]

/* Eén rij, de hele reis in één oogopslag. Ondersteunt de quote hieronder
   met een beeld in plaats van nog meer tekst. */
export default function Journey() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const reduce = useReducedMotion() ?? false
  const show = reduce || inView

  return (
    <section ref={ref} className="bg-white">
      <div className="container-site pt-16 pb-10 md:pt-24 md:pb-14">
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 md:overflow-visible">
          <div className="flex items-start gap-1 md:gap-2 min-w-[720px] md:min-w-0 md:justify-center">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.label} className="flex items-start">
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={show ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: reduce ? 0 : 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center text-center w-[92px] md:w-[104px]"
                  >
                    <div
                      className={`flex items-center justify-center rounded-full shrink-0 ${
                        step.final ? 'w-16 h-16 bg-petrol-deep' : 'w-14 h-14 bg-white border border-petrol/20'
                      }`}
                      style={
                        step.final
                          ? { boxShadow: '0 0 0 6px rgba(241,80,37,0.08), 0 12px 28px -10px rgba(13,52,60,0.4)' }
                          : undefined
                      }
                    >
                      <Icon
                        className={step.final ? 'w-6 h-6 text-white' : 'w-5 h-5 text-petrol'}
                        strokeWidth={1.8}
                      />
                    </div>
                    <p className="mt-3 text-[14px] font-semibold text-petrol leading-tight">
                      {step.label}
                      <span className="text-flame">.</span>
                    </p>
                    {step.sub && (
                      <p className="mt-0.5 text-[11px] text-muted leading-tight">{step.sub}</p>
                    )}
                  </motion.div>

                  {i < STEPS.length - 1 && (
                    <div
                      aria-hidden
                      className="w-6 md:w-8 h-px bg-petrol/15 mt-7 shrink-0"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
