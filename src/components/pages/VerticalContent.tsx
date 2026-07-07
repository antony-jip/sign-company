import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SectionReveal from '../SectionReveal'
import SerifItalic from '../SerifItalic'
import type { Vertical } from '@/data/verticals'
import { modules } from '@/data/modules'

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'

export default function VerticalContent({ vertical }: { vertical: Vertical }) {
  return (
    <div className="pt-28 md:pt-36" style={{ backgroundColor: '#F3F2ED' }}>
      {/* Kop */}
      <section className="pb-20 md:pb-28">
        <div className="container-site">
          <SectionReveal>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-7">
                <span className="relative inline-flex items-center justify-center w-2 h-2">
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: FLAME, opacity: 0.45 }} />
                  <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FLAME }} />
                </span>
                <span className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase" style={{ color: MUTED }}>
                  {vertical.eyebrow}
                </span>
              </div>

              <h1
                className="font-heading font-bold tracking-[-2px] md:tracking-[-3px] leading-[0.98] mb-7"
                style={{ fontSize: 'clamp(38px, 5.2vw, 72px)', color: PETROL }}
              >
                <span className="block">
                  {vertical.h1Lead}
                  <span style={{ color: FLAME }}>.</span>
                </span>
                <span className="block" style={{ color: MUTED }}>
                  {vertical.h1Accent}
                  <span style={{ color: FLAME }}>.</span>
                </span>
              </h1>

              <p className="text-[16px] md:text-[19px] leading-[1.6] max-w-2xl mb-9" style={{ color: '#3F3F3A' }}>
                {vertical.intro}
              </p>

              <div className="flex flex-wrap items-center gap-5 md:gap-6">
                <a
                  href="https://app.doen.team/register"
                  className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white px-7 h-[56px] rounded-[6px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                  style={{ backgroundColor: FLAME, boxShadow: '0 8px 24px rgba(241,80,37,0.25)' }}
                >
                  <span>Start gratis</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
                </a>
                <Link
                  href="/hoe-het-werkt"
                  className="inline-flex items-center gap-2 text-[15px] font-semibold transition-all group"
                  style={{ color: PETROL }}
                >
                  <span className="relative">
                    Of zie hoe het werkt
                    <span
                      className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                      style={{ backgroundColor: PETROL }}
                    />
                  </span>
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              </div>
              <p className="text-[12px] mt-6" style={{ color: MUTED }}>
                Geen creditcard nodig. Maandelijks opzegbaar.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Herkenning */}
      <section className="py-20 md:py-28" style={{ backgroundColor: '#F5F4F1' }}>
        <div className="container-site">
          <SectionReveal>
            <h2
              className="font-heading font-bold tracking-[-1px] md:tracking-[-2px] leading-[1.0] mb-12 md:mb-16 max-w-2xl"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: PETROL }}
            >
              <SerifItalic>Herkenbaar</SerifItalic>
              <span style={{ color: FLAME }}>?</span>
            </h2>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {vertical.pains.map((pain, i) => (
              <SectionReveal key={pain.title} delay={0.08 * i}>
                <div
                  className="p-6 md:p-7 rounded-2xl h-full"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(26,83,92,0.08)',
                    boxShadow: '0 1px 2px rgba(20,40,40,0.04)',
                  }}
                >
                  <h3 className="font-heading text-[17px] md:text-[19px] font-bold tracking-tight mb-2.5 leading-snug" style={{ color: PETROL }}>
                    {pain.title}
                    <span style={{ color: FLAME }}>.</span>
                  </h3>
                  <p className="text-[14px] md:text-[15px] leading-relaxed" style={{ color: MUTED }}>
                    {pain.body}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Wat doen. daarvoor regelt */}
      <section className="py-20 md:py-28">
        <div className="container-site">
          <SectionReveal>
            <h2
              className="font-heading font-bold tracking-[-1px] md:tracking-[-2px] leading-[1.0] mb-12 md:mb-16 max-w-2xl"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: PETROL }}
            >
              Wat doen<span style={{ color: FLAME }}>.</span>{' '}
              <span style={{ color: MUTED }}>daarvoor regelt</span>
              <span style={{ color: FLAME }}>.</span>
            </h2>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {vertical.highlights.map((highlight, i) => {
              const mod = modules.find((m) => m.href === highlight.href)
              if (!mod) return null
              const Icon = mod.icon
              return (
                <SectionReveal key={highlight.href} delay={0.08 * i}>
                  <Link
                    href={mod.href}
                    className="group flex gap-5 p-6 md:p-7 rounded-2xl h-full transition-shadow duration-300 hover:shadow-lg"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(26,83,92,0.08)',
                      boxShadow: '0 1px 2px rgba(20,40,40,0.04)',
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#F3F2ED' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: PETROL }} />
                    </div>
                    <div>
                      <h3 className="font-heading text-[16px] md:text-[18px] font-bold tracking-tight mb-1.5 leading-snug transition-colors group-hover:text-[#F15025]" style={{ color: PETROL }}>
                        {mod.label}
                        <span style={{ color: FLAME }}>.</span>
                      </h3>
                      <p className="text-[14px] md:text-[15px] leading-relaxed" style={{ color: MUTED }}>
                        {highlight.blurb}
                      </p>
                    </div>
                  </Link>
                </SectionReveal>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
