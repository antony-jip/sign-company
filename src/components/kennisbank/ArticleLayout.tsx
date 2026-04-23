'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, Clock, Calendar } from 'lucide-react'
import type { Article } from '@/data/kennisbank/articles'

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'
const MUTED_SOFT = '#9B9B95'

export default function ArticleLayout({ article }: { article: Article }) {
  const [activeId, setActiveId] = useState<string>(article.sections[0]?.id ?? '')
  const contentRef = useRef<HTMLDivElement>(null)

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find entries that are intersecting and pick the one closest to top
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          // Sort by boundingClientRect.top ascending, pick topmost visible
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setActiveId(visible[0].target.id)
        }
      },
      {
        // Section is considered "active" when its top is between 20% and 40% of viewport
        rootMargin: '-20% 0% -60% 0%',
        threshold: 0,
      }
    )

    const sections = article.sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [article.sections])

  function handleTocClick(e: React.MouseEvent, id: string) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      const offset = 100 // account for sticky nav
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
      setActiveId(id)
    }
  }

  const formattedDate = new Date(article.updatedAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="pt-28 md:pt-36 pb-20 md:pb-32">
      <div className="container-site">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link
            href="/kennisbank"
            className="inline-flex items-center gap-1.5 text-[13px] font-mono tracking-wider uppercase transition-colors"
            style={{ color: MUTED }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kennisbank</span>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-12 lg:gap-16">
          {/* Article content */}
          <article ref={contentRef} className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Category eyebrow */}
              <p
                className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase mb-4"
                style={{ color: FLAME }}
              >
                {article.category}
              </p>

              {/* Title */}
              <h1
                className="font-heading text-[36px] md:text-[52px] font-extrabold tracking-[-2px] leading-[1.02] mb-6"
                style={{ color: PETROL }}
              >
                {article.title}
                <span style={{ color: FLAME }}>.</span>
              </h1>

              {/* Excerpt */}
              <p className="text-[18px] md:text-[20px] leading-[1.6] mb-8" style={{ color: MUTED }}>
                {article.excerpt}
              </p>

              {/* Meta */}
              <div
                className="flex flex-wrap items-center gap-5 pb-8 mb-12"
                style={{ borderBottom: '1px solid rgba(26,83,92,0.08)' }}
              >
                <div className="flex items-center gap-2 text-[12px] font-mono" style={{ color: MUTED_SOFT }}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{article.readingTime} min leestijd</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-mono" style={{ color: MUTED_SOFT }}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Bijgewerkt {formattedDate}</span>
                </div>
              </div>
            </motion.div>

            {/* Sections */}
            <div className="space-y-14">
              {article.sections.map((section, i) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="scroll-mt-24"
                >
                  <h2
                    className="font-heading text-[24px] md:text-[30px] font-extrabold tracking-[-1px] leading-tight mb-5"
                    style={{ color: PETROL }}
                  >
                    {section.title}
                    <span style={{ color: FLAME }}>.</span>
                  </h2>
                  <div>{section.content}</div>
                </motion.section>
              ))}
            </div>

            {/* Bottom helper */}
            <div
              className="mt-20 pt-8 text-center"
              style={{ borderTop: '1px solid rgba(26,83,92,0.08)' }}
            >
              <p className="text-[14px] mb-3" style={{ color: MUTED }}>
                Deze uitleg niet wat je zocht?
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 text-[14px] font-semibold transition-opacity hover:opacity-70"
                style={{ color: PETROL }}
              >
                Stel je vraag direct
                <span style={{ color: FLAME }}>.</span>
              </Link>
            </div>
          </article>

          {/* Sticky TOC sidebar (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p
                className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase mb-4 pb-3"
                style={{ color: MUTED_SOFT, borderBottom: '1px solid rgba(26,83,92,0.08)' }}
              >
                In dit artikel
              </p>
              <nav className="relative">
                {/* Active indicator */}
                <div
                  aria-hidden
                  className="absolute left-0 top-0 w-[2px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    backgroundColor: FLAME,
                    height: '28px',
                    transform: `translateY(${article.sections.findIndex((s) => s.id === activeId) * 36}px)`,
                  }}
                />
                <ul className="relative space-y-0">
                  {article.sections.map((section) => {
                    const isActive = activeId === section.id
                    return (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          onClick={(e) => handleTocClick(e, section.id)}
                          className="block pl-4 py-1.5 text-[13px] transition-colors duration-200"
                          style={{
                            color: isActive ? PETROL : MUTED,
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {section.title}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
