'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const modules = [
  { label: 'Projecten', href: '/features/projecten', color: '#1A535C', image: '/images/modules/projecten.jpg' },
  { label: 'Offertes', href: '/features/offertes', color: '#F15025', image: '/images/modules/offertes.jpg' },
  { label: 'Klantportaal', href: '/features/portaal', color: '#6A5A8A', image: '/images/modules/klantportaal.jpg' },
  { label: 'Planning', href: '/features/planning', color: '#9A5A48', image: '/images/modules/planning.jpg' },
  { label: 'Werkbonnen', href: '/features/werkbonnen', color: '#1A535C', image: '/images/modules/werkbonnen.jpg' },
  { label: 'Facturen', href: '/features/facturen', color: '#2D6B48', image: '/images/modules/facturen.jpg' },
  { label: 'Visualizer', href: '/features/visualizer', color: '#9A5A48', image: '/images/modules/visualizer.jpg' },
  { label: 'AI-assistent', href: '/features/ai', color: '#1A535C', image: '/images/modules/ai-assistant.jpg' },
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
            <Link href={mod.href} className="group block w-[300px] md:w-[340px]">
              {/* Card */}
              <div
                className="rounded-2xl overflow-hidden transition-all duration-500 group-hover:-translate-y-[4px]"
                style={{ border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 4px rgba(100,80,40,0.04)' }}
              >
                {/* Illustration area with padding */}
                <div className="bg-white p-6 pb-4">
                  <Image
                    src={mod.image}
                    alt={mod.label}
                    width={1000}
                    height={1000}
                    className="w-full h-auto rounded-xl transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>

                {/* Label bar */}
                <div className="px-6 pb-5 pt-1 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.color }} />
                      <span className="text-[15px] font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
                        {mod.label}
                      </span>
                    </div>
                    <ChevronRight
                      className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 transition-all duration-300"
                      style={{ color: mod.color }}
                    />
                  </div>
                </div>

                {/* Accent bar bottom */}
                <div
                  className="h-[3px] transition-all duration-300 opacity-0 group-hover:opacity-100"
                  style={{ background: `linear-gradient(90deg, ${mod.color}, ${mod.color}30)` }}
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
