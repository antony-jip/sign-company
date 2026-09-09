'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { faqs } from '@/data/faq'
import FaqAnswer from '@/components/FaqAnswer'

/* Acht vragen die de koop beslissen. De rest beantwoorden we via /contact. */
/* Vijf op de home, niet acht. Dit blok staat op scherm acht en telde 357
   woorden; wie daar nog leest heeft geen productvragen meer maar twijfels
   over geld, contract en het overstappen zelf. De rest (gebruikersaantallen,
   portaal, mobiel) staat op /veelgestelde-vragen en wordt hierboven al
   beantwoord. */
const HOME_QUESTIONS = [
  'Kan ik doen. eerst gratis proberen?',
  'Hoeveel kost doen. na de proefperiode?',
  'Moet ik een contract tekenen?',
  'Kan ik doen. koppelen aan mijn boekhouding?',
  'Wat gebeurt er met mijn data als ik opzeg?',
]


export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)
  const items = HOME_QUESTIONS.map((q) => faqs.find((f) => f.q === q)).filter(
    (f): f is NonNullable<typeof f> => Boolean(f)
  )

  return (
    <section className="tegel tegel-licht">
      <div className="container-site">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-20">
          <div>
            <h2
              className="font-heading font-bold text-petrol leading-[1.05] mb-5"
              style={{ fontSize: 'clamp(30px, 4vw, 48px)', letterSpacing: '-0.03em' }}
            >
              Nog vragen<span className="text-flame">?</span>
            </h2>
            <p className="tekst-body text-muted max-w-xs mb-3">
              <Link href="/veelgestelde-vragen" className="font-semibold text-petrol hover:text-flame transition-colors">
                Bekijk alle vragen
              </Link>
              , of{' '}
              <Link href="/contact" className="font-semibold text-petrol hover:text-flame transition-colors">
                stel je eigen vraag
              </Link>
              . Je krijgt binnen een werkdag antwoord.
            </p>
          </div>

          <div className="border-t border-petrol/10">
            {items.map((item, i) => {
              const isOpen = open === i
              return (
                <div key={item.q} className="border-b border-petrol/10">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-6 py-5 text-left group"
                  >
                    <span className="tekst-body font-semibold text-ink group-hover:text-petrol transition-colors">
                      {item.q}
                    </span>
                    <Plus
                      className="w-4 h-4 shrink-0 text-flame transition-transform duration-300"
                      style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                      strokeWidth={2.5}
                    />
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out-expo"
                    style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <FaqAnswer text={item.a} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
