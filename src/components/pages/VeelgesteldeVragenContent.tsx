'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { categories, faqs, type CategoryId } from '@/data/faq'

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

function CategoryBlock({ id, label }: { id: CategoryId; label: string }) {
  const items = faqs.filter((f) => f.category === id)
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div>
      <h2
        className="font-heading font-bold text-petrol leading-[1.05] mb-1"
        style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', letterSpacing: '-0.02em' }}
      >
        {label}
        <span className="text-flame">.</span>
      </h2>
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
  )
}

export default function VeelgesteldeVragenContent() {
  return (
    <div className="bg-bg">
      <section className="bg-white">
        <div className="container-site pt-28 pb-12 md:pt-44 md:pb-16">
          <h1
            className="font-heading font-bold text-petrol leading-[1.0] mb-5"
            style={{ fontSize: 'clamp(34px, 5.2vw, 64px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
          >
            Veelgestelde vragen<span className="text-flame">.</span>
          </h1>
          <p className="text-[16px] md:text-[18px] text-muted max-w-xl leading-[1.6]">
            Alles wat signmakers ons vragen voordat ze beginnen, op één plek: over de prijs, het
            product, security, support en techniek.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-site pb-20 md:pb-32">
          <div className="space-y-14 md:space-y-20">
            {categories.map((c) => (
              <CategoryBlock key={c.id} id={c.id} label={c.label} />
            ))}
          </div>

          <p className="mt-16 text-[15px] text-muted">
            Staat je vraag er niet bij?{' '}
            <Link href="/contact" className="font-semibold text-petrol hover:text-flame transition-colors">
              Stel hem direct
            </Link>
            , je krijgt binnen een werkdag antwoord.
          </p>
        </div>
      </section>
    </div>
  )
}
