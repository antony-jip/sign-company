'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { faqs } from '@/data/faq'

/* Acht vragen die de koop beslissen. De rest beantwoorden we via /contact. */
const HOME_QUESTIONS = [
  'Kan ik doen. eerst gratis proberen?',
  'Hoeveel kost doen. na de proefperiode?',
  'Moet ik een contract tekenen?',
  'Wat als ik meer dan 10 gebruikers heb?',
  'Kan mijn monteur alles vanaf zijn telefoon?',
  'Hoe werkt het klantportaal?',
  'Kan ik doen. koppelen aan mijn boekhouding?',
  'Wat gebeurt er met mijn data als ik opzeg?',
]

/* Rendert alleen **vet** uit de antwoord-strings; meer markdown is er niet. */
function Answer({ text }: { text: string }) {
  const parts = text.split('**')
  return (
    <p className="text-[15px] leading-[1.65] text-muted max-w-2xl pb-6">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-ink">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </p>
  )
}

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)
  const items = HOME_QUESTIONS.map((q) => faqs.find((f) => f.q === q)).filter(
    (f): f is NonNullable<typeof f> => Boolean(f)
  )

  return (
    <section className="bg-white">
      <div className="container-site py-16 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-20">
          <div>
            <h2
              className="font-heading font-bold text-petrol leading-[1.05] mb-5"
              style={{ fontSize: 'clamp(30px, 4vw, 48px)', letterSpacing: '-0.03em' }}
            >
              Nog vragen<span className="text-flame">?</span>
            </h2>
            <p className="text-[15px] text-muted leading-[1.6] max-w-xs">
              Staat je vraag er niet bij?{' '}
              <Link href="/contact" className="font-semibold text-petrol hover:text-flame transition-colors">
                Stel hem direct
              </Link>
              , je krijgt binnen een werkdag antwoord.
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
                    <span className="text-[16px] md:text-[17px] font-semibold text-ink group-hover:text-petrol transition-colors">
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
                      <Answer text={item.a} />
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
