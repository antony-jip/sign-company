'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Mail, FileText, Cog, Calendar, ClipboardCheck, Receipt, type LucideIcon } from 'lucide-react'
import SerifItalic from '@/components/SerifItalic'

type Step = { n: string; icon: LucideIcon; title: string; body: string; time: string }

const steps: Step[] = [
  { n: '01 — Lead', icon: Mail, title: 'Mail komt binnen', body: 'Daan herkent de aanvraag en maakt vast een projectje aan. Klant zit erin.', time: '+ 0 sec' },
  { n: '02 — Offerte', icon: FileText, title: 'Offerte verstuurd', body: 'Sleep regels uit je prijsboek. Klant tekent digitaal en ja-knop wordt automatisch project.', time: '+ 15 min' },
  { n: '03 — Productie', icon: Cog, title: 'Werkplaats start', body: 'Productie ziet specs, materiaal en deadline. Bestellijst gaat direct mee.', time: '+ 2 dagen' },
  { n: '04 — Planning', icon: Calendar, title: 'Montage ingepland', body: 'Sleep de job naar Jeroen. Adres, route en materiaallijst op zijn telefoon.', time: '+ 1 dag' },
  { n: '05 — Werkbon', icon: ClipboardCheck, title: 'Klant tekent', body: 'Werkbon digitaal op locatie. Foto\'s erbij, in het project. Klaar is klaar.', time: '+ op locatie' },
  { n: '06 — Factuur', icon: Receipt, title: 'gedaan', body: 'Factuur volgt direct. Herinneringen lopen automatisch. Boekhouder krijgt hem ook.', time: '+ 1 klik' },
]

export default function FlowSteps() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="relative" style={{ backgroundColor: '#F3F2ED' }}>
      <div className="container-site relative py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="w-6 h-px" style={{ backgroundColor: '#F15025' }} />
            <span className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: '#6B6B66' }}>
              De flow
            </span>
          </div>
          <h2
            className="font-heading font-bold tracking-[-1px] md:tracking-[-2.5px] leading-[1.0] md:leading-[0.95]"
            style={{ fontSize: 'clamp(32px, 5vw, 64px)', color: '#1A535C' }}
          >
            Eén opdracht<span style={{ color: '#F15025' }}>.</span>{' '}
            <span style={{ color: '#6B6B66' }}>
              <SerifItalic>Zes</SerifItalic> stappen
              <span style={{ color: '#F15025' }}>.</span>
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
          {steps.map((s, i) => {
            const Icon = s.icon
            const isLast = i === steps.length - 1
            return (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[12px] p-4 md:p-5 bg-white relative flex flex-col"
                style={{
                  border: isLast ? '1.5px solid #1A535C' : '1px solid rgba(26,83,92,0.10)',
                  boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 6px 14px -10px rgba(20,40,40,0.10)',
                }}
              >
                <span
                  className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.18em] uppercase mb-3"
                  style={{ color: '#6B6B66' }}
                >
                  {s.n}
                </span>
                <div
                  className="w-9 h-9 rounded-[8px] flex items-center justify-center mb-3"
                  style={{ backgroundColor: isLast ? 'rgba(241,80,37,0.10)' : 'rgba(26,83,92,0.07)' }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: isLast ? '#F15025' : '#1A535C' }} strokeWidth={2} />
                </div>
                <h4 className="font-heading text-[15px] md:text-[16px] font-bold tracking-tight leading-[1.15] mb-2" style={{ color: '#1A1A1A' }}>
                  {s.title}<span style={{ color: '#F15025' }}>.</span>
                </h4>
                <p className="text-[12.5px] md:text-[13px] leading-[1.55] flex-1" style={{ color: '#6B6B66' }}>
                  {s.body}
                </p>
                <span
                  className="font-mono text-[10px] tracking-[0.1em] mt-3 pt-3"
                  style={{ borderTop: '1px solid rgba(26,83,92,0.08)', color: isLast ? '#F15025' : '#1A535C' }}
                >
                  {s.time}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
