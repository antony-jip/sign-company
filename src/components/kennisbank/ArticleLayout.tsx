'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, Clock, Calendar } from 'lucide-react'
import type { Article } from '@/data/kennisbank/articles'

const TOC_ROW_HEIGHT = 36

export default function ArticleLayout({ article }: { article: Article }) {
  const [activeId, setActiveId] = useState<string>(article.sections[0]?.id ?? '')
  const contentRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setActiveId(visible[0].target.id)
        }
      },
      {
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
    <div className="bg-bg pt-28 md:pt-40 pb-14 md:pb-32">
      <div className="container-site">
        {/* Terug naar de kennisbank */}
        <div className="mb-6 md:mb-8">
          <Link
            href="/kennisbank"
            className="inline-flex items-center gap-1 text-[15px] font-semibold text-muted transition-colors hover:text-petrol"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kennisbank</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-12 lg:gap-16">
          {/* Artikel */}
          <article ref={contentRef} className="min-w-0">
            {/* Paginakop: entree via CSS-keyframes (globals.css: .hero-line / .hero-fade) */}
            <div>
              <p className="hero-fade text-[14px] font-semibold text-petrol mb-4" style={{ animationDelay: '0.05s' }}>
                {article.category}
              </p>

              <h1
                className="font-heading font-bold text-petrol leading-[1.02] mb-4 md:mb-6"
                style={{ fontSize: 'clamp(30px, 4.4vw, 56px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                  <span className="hero-line" style={{ animationDelay: '0.15s' }}>
                    {article.title}
                    <span className="text-flame">.</span>
                  </span>
                </span>
              </h1>

              <p className="hero-fade text-[17px] md:text-[19px] leading-[1.6] text-muted mb-6 md:mb-8" style={{ animationDelay: '0.3s' }}>
                {article.excerpt}
              </p>

              <div className="hero-fade flex flex-wrap items-center gap-x-6 gap-y-2 pb-6 md:pb-8 mb-8 md:mb-12 border-b border-petrol/10" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-2 text-[15px] text-muted">
                  <Clock className="w-4 h-4" />
                  <span>{article.readingTime} min leestijd</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[15px] text-muted">
                  <Calendar className="w-4 h-4" />
                  <span>Bijgewerkt {formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Secties */}
            <div className="space-y-10 md:space-y-14">
              {article.sections.map((section) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="scroll-mt-24"
                >
                  <h2
                    className="font-heading font-bold text-petrol leading-[1.1] mb-5"
                    style={{ fontSize: 'clamp(24px, 3vw, 32px)', letterSpacing: '-0.03em' }}
                  >
                    {section.title}
                    <span className="text-flame">.</span>
                  </h2>
                  <div>{section.content}</div>
                </motion.section>
              ))}
            </div>

            {/* Afsluiter */}
            <div className="mt-12 md:mt-20 pt-8 border-t border-petrol/10">
              <p className="text-[15px] text-muted mb-3">Deze uitleg niet wat je zocht?</p>
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ink"
              >
                <span className="relative">
                  Stel je vraag direct
                  <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-ink/30" />
                </span>
                <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </article>

          {/* Sticky inhoudsopgave (alleen desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-[13px] font-semibold text-ink mb-3 pb-3 border-b border-petrol/10">
                In dit artikel
              </p>
              <nav className="relative">
                <div
                  aria-hidden
                  className="absolute left-0 top-1 w-[2px] rounded-full bg-flame transition-all duration-300 ease-out-expo"
                  style={{
                    height: '28px',
                    transform: `translateY(${article.sections.findIndex((s) => s.id === activeId) * TOC_ROW_HEIGHT}px)`,
                  }}
                />
                <ul className="relative">
                  {article.sections.map((section) => {
                    const isActive = activeId === section.id
                    return (
                      <li key={section.id} style={{ height: `${TOC_ROW_HEIGHT}px` }}>
                        <a
                          href={`#${section.id}`}
                          onClick={(e) => handleTocClick(e, section.id)}
                          className={`flex items-center h-full pl-4 text-[15px] leading-snug transition-colors duration-200 ${
                            isActive ? 'text-petrol font-semibold' : 'text-muted hover:text-ink'
                          }`}
                        >
                          <span className="truncate">{section.title}</span>
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
