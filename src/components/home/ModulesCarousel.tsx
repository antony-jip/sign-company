'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const modules = [
  { label: 'Projecten', href: '/features/projecten', color: '#1A535C', placeholder: '/images/modules/projecten.png' },
  { label: 'Offertes', href: '/features/offertes', color: '#F15025', placeholder: '/images/modules/offertes.png' },
  { label: 'Klantportaal', href: '/features/portaal', color: '#6A5A8A', placeholder: '/images/modules/portaal.png' },
  { label: 'Planning', href: '/features/planning', color: '#9A5A48', placeholder: '/images/modules/planning.png' },
  { label: 'Werkbonnen', href: '/features/werkbonnen', color: '#1A535C', placeholder: '/images/modules/werkbonnen.png' },
  { label: 'Facturen', href: '/features/facturen', color: '#2D6B48', placeholder: '/images/modules/facturen.png' },
  { label: 'Visualizer', href: '/features/visualizer', color: '#9A5A48', placeholder: '/images/modules/visualizer.png' },
  { label: 'AI-assistent', href: '/features/ai', color: '#1A535C', placeholder: '/images/modules/ai.png' },
]

export default function ModulesCarousel() {
  const ref = useRef(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  function updateScroll() {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  function scroll(dir: -1 | 1) {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 340, behavior: 'smooth' })
    setTimeout(updateScroll, 400)
  }

  return (
    <section className="py-20 md:py-28" ref={ref}>
      {/* Header */}
      <div className="container-site flex items-end justify-between mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] leading-[1.1]">
            Ontdek de modules<span className="text-flame">.</span>
          </h2>
        </motion.div>

        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
            style={{ border: '1px solid #E6E4E0' }}
          >
            <ChevronLeft className="w-4 h-4 text-petrol" />
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
            style={{ backgroundColor: '#1A535C' }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </motion.div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={updateScroll}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pl-[max(1rem,calc((100vw-1200px)/2+1rem))] pr-8"
        style={{ scrollbarWidth: 'none' }}
      >
        {modules.map((mod, i) => (
          <motion.div
            key={mod.label}
            className="flex-shrink-0 snap-start"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href={mod.href} className="group block">
              <div
                className="relative w-[280px] md:w-[320px] aspect-square rounded-2xl overflow-hidden transition-all duration-500 group-hover:-translate-y-[4px] group-hover:shadow-xl"
              >
                {/* Placeholder bg with module color */}
                <div
                  className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundColor: mod.color + '0C' }}
                >
                  {/* Decorative elements as placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-20 h-20 rounded-3xl opacity-10 transition-all duration-500 group-hover:opacity-20 group-hover:scale-110"
                      style={{ backgroundColor: mod.color }}
                    />
                  </div>
                  {/* Dot pattern */}
                  <div className="absolute top-6 right-6 grid grid-cols-3 gap-1.5 opacity-[0.07]">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <div key={j} className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.color }} />
                    ))}
                  </div>
                  {/* Arc */}
                  <svg className="absolute bottom-0 left-0 w-32 h-32 opacity-[0.05]" viewBox="0 0 120 120" fill="none">
                    <path d="M 0 120 A 120 120 0 0 1 120 0" stroke={mod.color} strokeWidth="20" />
                  </svg>
                </div>

                {/* Label pill */}
                <div className="absolute bottom-5 left-5">
                  <span
                    className="inline-flex items-center px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 group-hover:shadow-md backdrop-blur-sm"
                    style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#1A1A1A' }}
                  >
                    {mod.label}
                  </span>
                </div>

                {/* Hover accent bar */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: mod.color }}
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
