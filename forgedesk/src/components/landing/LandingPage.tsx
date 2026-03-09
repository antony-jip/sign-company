import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUp, Check, Menu, X,
  Shield, Zap, Users,
  TrendingDown, TrendingUp,
  Minus, Plus, ChevronRight,
  Phone, MessageCircle,
  Sparkles, Image, Send, MessageSquare, Brain, Database,
  Wand2, Mail, FileText, BarChart3, Eye,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setIsVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, isVisible }
}

function useScrollY() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const h = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return scrollY
}

function useTypewriter(phrases: string[], typingSpeed = 50, pauseMs = 2500) {
  const [text, setText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const current = phrases[phraseIndex]
    if (!current) return

    if (!isDeleting && charIndex < current.length) {
      const t = setTimeout(() => {
        setText(current.slice(0, charIndex + 1))
        setCharIndex((c: number) => c + 1)
      }, typingSpeed)
      return () => clearTimeout(t)
    }

    if (!isDeleting && charIndex === current.length) {
      const t = setTimeout(() => setIsDeleting(true), pauseMs)
      return () => clearTimeout(t)
    }

    if (isDeleting && charIndex > 0) {
      const t = setTimeout(() => {
        setText(current.slice(0, charIndex - 1))
        setCharIndex((c: number) => c - 1)
      }, 30)
      return () => clearTimeout(t)
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false)
      setPhraseIndex((i: number) => (i + 1) % phrases.length)
    }
  }, [charIndex, isDeleting, phraseIndex, phrases, typingSpeed, pauseMs])

  return text
}

function useCountUp(end: number, duration = 2000, trigger = false) {
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!trigger || started.current) return
    started.current = true
    let startTime: number | null = null

    function step(ts: number) {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [trigger, end, duration])

  return value
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const children = el.querySelectorAll(
      '.reveal-up, .reveal-left, .reveal-right, .reveal-scale'
    )
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
          }
        })
      },
      { threshold: 0.15 }
    )
    children.forEach((c: Element) => obs.observe(c))
    return () => obs.disconnect()
  }, [])

  return ref
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const COLORS = {
  blush: '#EDCFC4',
  'blush-d': '#B8806A',
  sage: '#B8CCBE',
  'sage-d': '#4E7A58',
  mist: '#BCCAD6',
  'mist-d': '#4A6E8A',
  cream: '#E2DCCB',
  'cream-d': '#8A7E60',
  lavender: '#D5CCE6',
  'lavender-d': '#6B5B8A',
  peach: '#F5D5C8',
  'peach-d': '#C4735A',
}

const TYPEWRITER_PHRASES = [
  'Van eerste schets tot laatste factuur.',
  'Van offerte tot werkbon in een klik.',
  'Van planning tot betaling zonder gedoe.',
]

const STEP_COLORS = [
  { bg: 'bg-blush', text: 'text-blush-deep', border: 'border-t-[#B8806A]' },
  { bg: 'bg-sage', text: 'text-sage-deep', border: 'border-t-[#4E7A58]' },
  { bg: 'bg-mist', text: 'text-mist-deep', border: 'border-t-[#4A6E8A]' },
  { bg: 'bg-cream', text: 'text-cream-deep', border: 'border-t-[#8A7E60]' },
  { bg: 'bg-blush', text: 'text-blush-deep', border: 'border-t-[#B8806A]' },
]

const STEP_LABELS = ['Klant', 'Offerte', 'Planning', 'Werkbon', 'Factuur']

const PRICING_FEATURES = [
  'Onbeperkt medewerkers',
  'Offertes met margeberekening',
  'Projectbeheer',
  'Werkbonnen met handtekening',
  'Facturatie',
  'Planning & kalender',
  'Tijdregistratie',
  'Klantenbeheer (CRM)',
  'Documentbeheer',
  'Rapportages',
  'Email integratie',
  'Voorraad & bestelbonnen',
  'AI Signing Visualizer',
  'Forgie AI-assistent',
]

const MARQUEE_ITEMS = [
  { label: 'Signbedrijven', color: 'bg-blush text-[#B8806A] border border-[#B8806A]/20' },
  { label: 'Interieurbouwers', color: 'bg-sage text-[#4E7A58] border border-[#4E7A58]/20' },
  { label: 'Reclamemakers', color: 'bg-mist text-[#4A6E8A] border border-[#4A6E8A]/20' },
  { label: 'Standbouwers', color: 'bg-cream text-[#8A7E60] border border-[#8A7E60]/20' },
  { label: 'Schilders', color: 'bg-lavender text-[#6B5B8A] border border-[#6B5B8A]/20' },
  { label: 'Installateurs', color: 'bg-peach text-[#C4735A] border border-[#C4735A]/20' },
  { label: 'Drukkerijen', color: 'bg-mist text-[#4A6E8A] border border-[#4A6E8A]/20' },
  { label: 'Wrappers', color: 'bg-blush text-[#B8806A] border border-[#B8806A]/20' },
  { label: 'Productiebedrijven', color: 'bg-sage text-[#4E7A58] border border-[#4E7A58]/20' },
  { label: 'Meubelmakers', color: 'bg-cream text-[#8A7E60] border border-[#8A7E60]/20' },
]

// ═══════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════

function Navbar() {
  const scrollY = useScrollY()
  const [mobileOpen, setMobileOpen] = useState(false)
  const scrolled = scrollY > 20

  const scrollTo = useCallback((id: string) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-[#E8E5DE] shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
              style={{
                background: `linear-gradient(135deg, ${COLORS.blush}, ${COLORS.mist})`,
              }}
            >
              F
            </div>
            <span className="font-black text-[#0A0A0A] text-lg tracking-tight">
              FORGEdesk
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollTo('features')}
              className="nav-link-hover text-sm font-medium text-[#555] hover:text-[#0A0A0A] transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo('ai-tools')}
              className="nav-link-hover text-sm font-medium text-[#555] hover:text-[#0A0A0A] transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#6B5B8A]" />
              AI Tools
            </button>
            <button
              onClick={() => scrollTo('hoe-het-werkt')}
              className="nav-link-hover text-sm font-medium text-[#555] hover:text-[#0A0A0A] transition-colors"
            >
              Hoe het werkt
            </button>
            <button
              onClick={() => scrollTo('prijzen')}
              className="nav-link-hover text-sm font-medium text-[#555] hover:text-[#0A0A0A] transition-colors"
            >
              Prijzen
            </button>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-[#555] hover:text-[#0A0A0A] transition-colors"
            >
              Inloggen
            </Link>
            <Link
              to="/register"
              className="bg-[#0A0A0A] text-white rounded-[12px] px-5 py-2.5 text-sm font-bold hover:bg-[#1a1a1a] transition-colors"
            >
              Gratis proberen
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X className="w-6 h-6 text-[#0A0A0A]" />
            ) : (
              <Menu className="w-6 h-6 text-[#0A0A0A]" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center gap-8">
          <button
            className="absolute top-4 right-6 p-2"
            onClick={() => setMobileOpen(false)}
            aria-label="Sluiten"
          >
            <X className="w-6 h-6" />
          </button>
          {['features', 'hoe-het-werkt', 'prijzen'].map((id) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-2xl font-bold text-[#0A0A0A] capitalize"
            >
              {id === 'hoe-het-werkt' ? 'Hoe het werkt' : id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
          <Link
            to="/login"
            className="text-xl font-medium text-[#555]"
            onClick={() => setMobileOpen(false)}
          >
            Inloggen
          </Link>
          <Link
            to="/register"
            className="bg-[#0A0A0A] text-white rounded-[14px] px-10 py-4 text-lg font-bold"
            onClick={() => setMobileOpen(false)}
          >
            Gratis proberen
          </Link>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════

function FloatingCards({ scrollY }: { scrollY: number }) {
  const cards = [
    {
      title: 'Offerte OFF-2026-048',
      sub: 'Bakkerij Jansen',
      amount: '2.087,25',
      color: '#B8806A',
      top: '5%',
      right: '5%',
      speed: 0.03,
      delay: '0s',
    },
    {
      title: 'Planning',
      sub: 'Ma 14 mrt - Montage',
      amount: '09:00 - 14:00',
      color: '#4E7A58',
      top: '25%',
      right: '25%',
      speed: 0.05,
      delay: '1s',
    },
    {
      title: 'Werkbon WB-018',
      sub: 'Getekend door klant',
      amount: '1.765,00',
      color: '#4A6E8A',
      top: '50%',
      right: '10%',
      speed: 0.02,
      delay: '2s',
    },
    {
      title: 'Factuur F-031',
      sub: 'Betaald',
      amount: '2.087,25',
      color: '#8A7E60',
      top: '15%',
      right: '45%',
      speed: 0.04,
      delay: '0.5s',
    },
  ]

  return (
    <div className="relative w-full h-[400px] md:h-[500px]">
      {cards.map((card, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-2xl shadow-lg border border-[#E8E5DE] p-4 w-[200px] md:w-[220px]"
          style={{
            top: card.top,
            right: card.right,
            borderTop: `3px solid ${card.color}`,
            transform: `translateY(${scrollY * card.speed * (i % 2 === 0 ? -1 : 1)}px)`,
            animation: `float ${4 + i}s ease-in-out infinite`,
            animationDelay: card.delay,
          }}
        >
          <div className="text-xs font-bold text-[#0A0A0A] truncate">
            {card.title}
          </div>
          <div className="text-xs text-[#999] mt-1">{card.sub}</div>
          <div className="text-sm font-bold text-[#0A0A0A] mt-2">
            {card.amount.startsWith('0') ? card.amount : `\u20AC${card.amount}`}
          </div>
        </div>
      ))}
    </div>
  )
}

function Hero() {
  const scrollY = useScrollY()
  const typewriterText = useTypewriter(TYPEWRITER_PHRASES)
  const revealRef = useScrollReveal()

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden" ref={revealRef}>
      {/* Mesh gradient background with floating orbs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 80% 20%, rgba(237,207,196,0.25), transparent),
            radial-gradient(ellipse 40% 40% at 20% 70%, rgba(213,204,230,0.2), transparent),
            radial-gradient(ellipse 50% 50% at 90% 40%, rgba(188,202,214,0.2), transparent)
          `,
        }}
      />
      {/* Floating gradient orbs */}
      <div className="absolute top-20 right-[15%] w-64 h-64 rounded-full opacity-20 animate-pulse-soft pointer-events-none"
        style={{ background: `radial-gradient(circle, ${COLORS.lavender}, transparent 70%)` }} />
      <div className="absolute bottom-10 left-[10%] w-48 h-48 rounded-full opacity-15 animate-pulse-soft pointer-events-none"
        style={{ background: `radial-gradient(circle, ${COLORS.peach}, transparent 70%)`, animationDelay: '1.5s' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-0">
          {/* Left — Text */}
          <div className="lg:w-1/2">
            {/* Badge */}
            <div className="reveal-up inline-flex items-center gap-2 bg-lavender/60 text-[#6B5B8A] rounded-full px-4 py-1.5 text-sm font-semibold mb-6 border border-lavender">
              <Sparkles className="w-3.5 h-3.5" />
              Nu met AI-tools — Visualizer & Forgie
            </div>

            {/* Heading */}
            <h1 className="reveal-up reveal-delay-1 text-[36px] md:text-[62px] leading-[1.05] font-extrabold text-[#0A0A0A]">
              <span
                className="font-black"
                style={{
                  background: `linear-gradient(135deg, ${COLORS['blush-d']}, ${COLORS['sage-d']})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Smeed
              </span>{' '}
              je bedrijf tot een geoliede machine.
            </h1>

            {/* Sub */}
            <p className="reveal-up reveal-delay-2 text-[17px] md:text-[19px] text-[#555] max-w-[480px] mt-6 leading-relaxed">
              Voor iedereen die iets maakt met zijn handen en geen gedoe wil in
              de backoffice.{' '}
              <span className="text-[#0A0A0A] font-semibold">
                Offertes, projecten, werkbonnen, facturen
              </span>{' '}
              — alles in een app.
            </p>

            {/* Typewriter */}
            <div className="reveal-up reveal-delay-3 mt-3 text-[17px] text-[#B8806A] font-medium h-7">
              {typewriterText}
              <span className="cursor-blink">|</span>
            </div>

            {/* CTA */}
            <div className="reveal-up reveal-delay-4 mt-10 flex flex-col sm:flex-row items-start gap-4">
              <Link
                to="/register"
                className="bg-[#0A0A0A] text-white px-10 py-5 rounded-[14px] text-[17px] font-bold hover:bg-[#1a1a1a] transition-all hover:shadow-lg hover:shadow-black/10 w-full sm:w-auto text-center"
              >
                Start 30 dagen gratis
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById('ai-tools')
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                }}
                className="flex items-center gap-2 text-[#6B5B8A] font-semibold hover:text-[#0A0A0A] transition-colors py-5"
              >
                <Wand2 className="w-4 h-4" />
                Ontdek AI-tools
              </button>
            </div>

            {/* Trust */}
            <div className="reveal-up reveal-delay-5 mt-8 flex flex-wrap gap-6 text-[13px] text-[#999]">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Direct aan de slag
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Geen creditcard nodig
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Onbeperkt medewerkers
              </span>
            </div>
          </div>

          {/* Right — Floating cards + AI card */}
          <div className="lg:w-1/2 reveal-scale reveal-delay-2 relative">
            <FloatingCards scrollY={scrollY} />
            {/* AI-powered mini card */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-lavender/50 p-4 max-w-[200px] animate-float-slow"
              style={{ animationDelay: '3s' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-lavender flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-[#6B5B8A]" />
                </div>
                <span className="text-xs font-bold text-[#6B5B8A]">Forgie AI</span>
              </div>
              <p className="text-xs text-[#555]">Omzet maart: <span className="font-bold text-[#0A0A0A]">€24.850</span></p>
              <p className="text-[10px] text-[#4E7A58] mt-1">+12% vs vorige maand</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// WAT IS FORGE
// ═══════════════════════════════════════════════════════════

function ForgeExplainer() {
  const revealRef = useScrollReveal()

  return (
    <section className="bg-[#F7F6F3] py-20" ref={revealRef}>
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="reveal-up text-[36px] md:text-[40px] font-black tracking-tight">
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS['blush-d']}, ${COLORS['sage-d']})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            FORGE
          </span>
        </h2>
        <p className="reveal-up reveal-delay-1 text-[18px] text-[#555] mt-2 italic">
          To forge: smeden, bouwen, vormgeven.
        </p>
        <p className="reveal-up reveal-delay-2 text-[18px] text-[#555] mt-4 font-medium">
          Jij smeedt lichtreclames, interieurs, stands. Wij smeden je
          bedrijfsvoering.
        </p>
        <div className="reveal-up reveal-delay-3 border-t border-[#E8E5DE] max-w-[200px] mx-auto mt-8" />
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// DE FLOW — Interactive Walkthrough
// ═══════════════════════════════════════════════════════════

function StepKlant() {
  return (
    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
      <div className="lg:w-[40%] order-2 lg:order-1">
        <h3 className="text-[28px] md:text-[32px] font-black text-[#0A0A0A]">
          Klant aanmaken
        </h3>
        <p className="text-[#555] mt-4 text-[16px] leading-relaxed">
          Nieuwe klant belt. In 30 seconden staat alles erin — naam, bedrijf,
          contactgegevens, notities.
        </p>
      </div>
      <div className="lg:w-[55%] order-1 lg:order-2">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-[#E8E5DE]">
          <div className="text-sm font-bold text-[#0A0A0A] mb-4">
            Nieuwe klant
          </div>
          <div className="space-y-3">
            {[
              { label: 'Bedrijf', value: 'Bakkerij Jansen' },
              { label: 'Naam', value: 'Kees Jansen' },
              { label: 'Email', value: 'kees@bakkerijjansen.nl' },
              { label: 'Telefoon', value: '0228 351 960' },
            ].map((field) => (
              <div key={field.label}>
                <label className="text-xs text-[#999] block mb-1">
                  {field.label}
                </label>
                <div className="border border-[#E8E5DE] rounded-xl px-3 py-2.5 text-sm text-[#0A0A0A] bg-[#FAFAF8] hover:ring-2 hover:ring-blush/50 transition-all">
                  {field.value}
                </div>
              </div>
            ))}
            <div className="mt-4">
              <span className="inline-block bg-blush text-[#B8806A] rounded-full px-3 py-1 text-xs font-semibold">
                3 projecten - 12.400 omzet
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepOfferte() {
  return (
    <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
      {/* Left: offerte table + marge panel */}
      <div className="lg:w-[60%] order-1 lg:order-1">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E8E5DE] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E5DE] bg-[#FAFAF8]">
            <div className="text-sm font-bold text-[#0A0A0A]">
              OFF-2026-048 - Bakkerij Jansen
            </div>
            <span className="text-xs bg-cream text-[#8A7E60] rounded-full px-2.5 py-0.5 font-semibold">
              Concept
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ display: 'table' }}>
              <thead>
                <tr className="border-b border-[#E8E5DE] text-[#999] text-xs">
                  <th className="text-left px-4 py-2 font-medium">#</th>
                  <th className="text-left px-4 py-2 font-medium">
                    Omschrijving
                  </th>
                  <th className="text-right px-4 py-2 font-medium">Aantal</th>
                  <th className="text-left px-4 py-2 font-medium">Eenheid</th>
                  <th className="text-right px-4 py-2 font-medium">Prijs</th>
                  <th className="text-right px-4 py-2 font-medium">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    n: 1,
                    desc: 'LED lichtreclame',
                    qty: 1,
                    unit: 'stuk',
                    price: 960,
                    total: 960,
                  },
                  {
                    n: 2,
                    desc: 'Montage',
                    qty: 5,
                    unit: 'uur',
                    price: 85,
                    total: 425,
                  },
                  {
                    n: 3,
                    desc: 'Voorbereiding',
                    qty: 4,
                    unit: 'uur',
                    price: 85,
                    total: 340,
                  },
                ].map((row) => (
                  <tr
                    key={row.n}
                    className="border-b border-[#E8E5DE] hover:bg-mist/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-[#999]">{row.n}</td>
                    <td className="px-4 py-2.5 font-medium text-[#0A0A0A]">
                      {row.desc}
                    </td>
                    <td className="px-4 py-2.5 text-right">{row.qty}</td>
                    <td className="px-4 py-2.5 text-[#999]">{row.unit}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatCurrency(row.price)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-5 py-3 border-t border-[#E8E5DE] bg-[#FAFAF8]">
            <div className="flex justify-end gap-8 text-sm">
              <div className="text-[#999]">
                Subtotaal:{' '}
                <span className="text-[#0A0A0A] font-medium">
                  {formatCurrency(1725)}
                </span>
              </div>
              <div className="text-[#999]">
                BTW 21%:{' '}
                <span className="text-[#0A0A0A] font-medium">
                  {formatCurrency(362.25)}
                </span>
              </div>
              <div className="font-bold text-[#0A0A0A]">
                Totaal: {formatCurrency(2087.25)}
              </div>
            </div>
          </div>
        </div>

        {/* Marge panel below table */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#E8E5DE] p-5 mt-4">
          <div className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">
            Marge overzicht
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-xs text-[#999]">Inkoop</div>
              <div className="text-sm font-bold text-red-500">
                {formatCurrency(915)}
              </div>
            </div>
            <div className="bg-[#F7F6F3] rounded-xl p-3">
              <div className="text-xs text-[#999]">Verkoop</div>
              <div className="text-sm font-bold text-[#0A0A0A]">
                {formatCurrency(1725)}
              </div>
            </div>
            <div className="bg-sage/20 rounded-xl p-3">
              <div className="text-xs text-[#999]">Winst</div>
              <div className="text-sm font-bold text-[#4E7A58]">
                {formatCurrency(810)}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs font-bold text-[#0A0A0A]">
              MARGE: 47.0%
            </span>
            <div className="flex-1 h-2 bg-blush/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#B8806A]"
                style={{ width: '47%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: text */}
      <div className="lg:w-[35%] order-2 lg:order-2 lg:pt-8">
        <h3 className="text-[28px] md:text-[32px] font-black text-[#0A0A0A]">
          Altijd overzicht over je marge
        </h3>
        <p className="text-[#555] mt-4 text-[16px] leading-relaxed">
          Terwijl je je offerte bouwt, zie je{' '}
          <span className="text-[#0A0A0A] font-semibold">real-time</span> je
          inkoop, verkoop, winst en marge per regel. Geen verrassingen achteraf.
          Je weet{' '}
          <span className="text-[#0A0A0A] font-semibold">
            precies wat je overhoudt
          </span>
          .
        </p>
      </div>
    </div>
  )
}

function StepPlanning() {
  const planningItems = [
    {
      day: 'Ma 14',
      color: 'bg-blush',
      task: 'Montage lichtreclame',
      client: 'Bakkerij Jansen',
      time: '09:00-14:00',
    },
    {
      day: 'Di 15',
      color: 'bg-sage',
      task: 'Opmeting gevel',
      client: 'Matec Amsterdam',
      time: '10:00-11:30',
    },
    {
      day: 'Wo 16',
      color: 'bg-mist',
      task: 'Productie intern',
      client: '',
      time: 'hele dag',
    },
    {
      day: 'Do 17',
      color: 'bg-cream',
      task: 'Montage gevelletters',
      client: 'Advocatenkantoor Bos',
      time: '08:00-16:00',
    },
  ]

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
      <div className="lg:w-[40%] order-2 lg:order-1">
        <h3 className="text-[28px] md:text-[32px] font-black text-[#0A0A0A]">
          Plan het werk. Zie het overzicht.
        </h3>
        <p className="text-[#555] mt-4 text-[16px] leading-relaxed">
          Sleep montages op de tijdlijn, wijs teams toe, synchroniseer met
          Google Calendar. Overzicht voor kantoor en buitendienst.
        </p>
      </div>
      <div className="lg:w-[55%] order-1 lg:order-2">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-[#E8E5DE]">
          <div className="text-sm font-bold text-[#0A0A0A] mb-4">
            Weekoverzicht
          </div>
          <div className="space-y-3">
            {planningItems.map((item) => (
              <div
                key={item.day}
                className="flex items-center gap-3 group cursor-default"
              >
                <div className="text-xs font-bold text-[#999] w-12 shrink-0">
                  {item.day}
                </div>
                <div
                  className={`flex-1 ${item.color} rounded-xl px-4 py-3 group-hover:translate-x-1 transition-transform`}
                >
                  <div className="text-sm font-semibold text-[#0A0A0A]">
                    {item.task}
                    {item.client && (
                      <span className="text-[#555] font-normal">
                        {' '}
                        - {item.client}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#999] mt-0.5">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepWerkbon() {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true)
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
      <div className="lg:w-[55%] order-1 lg:order-1" ref={ref}>
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-[#E8E5DE]">
          <div className="text-sm font-bold text-[#0A0A0A]">WB-2026-018</div>
          <div className="text-xs text-[#999] mt-1">
            Montage lichtreclame - Bakkerij Jansen - Hoorn
          </div>

          <div className="mt-4 space-y-2">
            {[
              { desc: 'Arbeid: Joris', detail: '6u', amount: 720 },
              { desc: 'Materiaal: LED module', detail: '1x', amount: 960 },
              { desc: 'Transport', detail: '', amount: 85 },
            ].map((line) => (
              <div
                key={line.desc}
                className="flex justify-between items-center text-sm border-b border-[#E8E5DE] pb-2"
              >
                <span className="text-[#0A0A0A]">
                  {line.desc}
                  {line.detail && (
                    <span className="text-[#999] ml-1">{line.detail}</span>
                  )}
                </span>
                <span className="font-medium">{formatCurrency(line.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-sm font-bold pt-1">
              <span>Totaal</span>
              <span>{formatCurrency(1765)}</span>
            </div>
          </div>

          {/* Signature */}
          <div className="mt-6 pt-4 border-t border-[#E8E5DE]">
            <svg
              viewBox="0 0 300 60"
              className={`w-48 h-12 ${inView ? 'signature-animate' : ''}`}
            >
              <path
                d="M20,40 C40,10 60,50 80,30 C100,10 120,45 140,35 C160,25 180,50 200,30 C220,10 240,45 260,35"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="2"
                className="signature-path"
              />
            </svg>
            <div className="text-xs text-[#999] mt-1">
              Getekend: K. Jansen - 14 mrt 2026
            </div>
          </div>
        </div>
      </div>
      <div className="lg:w-[40%] order-2 lg:order-2">
        <h3 className="text-[28px] md:text-[32px] font-black text-[#0A0A0A]">
          Digitaal. Op locatie. Klaar.
        </h3>
        <p className="text-[#555] mt-4 text-[16px] leading-relaxed">
          Monteur vult werkbon in op zijn telefoon. Foto's erbij, uren noteren,
          klant tekent ter plekke. Alles digitaal. Alles gekoppeld aan het
          project.
        </p>
      </div>
    </div>
  )
}

function StepFactuur() {
  return (
    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
      <div className="lg:w-[40%] order-2 lg:order-1">
        <h3 className="text-[28px] md:text-[32px] font-black text-[#0A0A0A]">
          Van werkbon naar factuur. Een klik.
        </h3>
        <p className="text-[#555] mt-4 text-[16px] leading-relaxed">
          De werkbon is goedgekeurd? Een klik en de factuur staat klaar. Alle
          regels, uren en materialen worden overgenomen. Nul dubbel werk.
        </p>
      </div>
      <div className="lg:w-[55%] order-1 lg:order-2">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-[#E8E5DE] relative overflow-hidden">
          <div className="text-sm font-bold text-[#0A0A0A]">
            F-2026-031 - Bakkerij Jansen
          </div>

          <div className="mt-4 text-[36px] font-black text-[#0A0A0A]">
            {formatCurrency(2087.25)}
          </div>

          {/* BETAALD stamp */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#4E7A58] text-4xl font-black -rotate-12 opacity-20 select-none pointer-events-none">
            BETAALD
          </div>

          <div className="mt-3">
            <span className="inline-block bg-sage text-[#4E7A58] rounded-full px-3 py-1 text-xs font-semibold">
              Betaald op 18 mrt 2026
            </span>
          </div>

          <div className="mt-4 text-xs text-[#999]">
            Automatisch aangemaakt vanuit werkbon WB-2026-018
          </div>
        </div>
      </div>
    </div>
  )
}

function FlowSection() {
  const [activeStep, setActiveStep] = useState(0)
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in')
  const revealRef = useScrollReveal()

  const switchStep = useCallback(
    (idx: number) => {
      if (idx === activeStep) return
      setFadeState('out')
      setTimeout(() => {
        setActiveStep(idx)
        setFadeState('in')
      }, 150)
    },
    [activeStep]
  )

  const stepComponents = [
    <StepKlant key="klant" />,
    <StepOfferte key="offerte" />,
    <StepPlanning key="planning" />,
    <StepWerkbon key="werkbon" />,
    <StepFactuur key="factuur" />,
  ]

  return (
    <section id="hoe-het-werkt" className="py-24 bg-white" ref={revealRef}>
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="reveal-up text-[36px] md:text-[44px] font-black text-center text-[#0A0A0A]">
          Zo werkt het. Van A tot Z.
        </h2>
        <p className="reveal-up reveal-delay-1 text-[#555] text-center mt-3 text-lg">
          Klik op een stap om te zien hoe FORGEdesk eruitziet.
        </p>

        {/* Steps bar */}
        <div className="reveal-up reveal-delay-2 mt-12 flex flex-wrap justify-center items-center gap-2 md:gap-0">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && (
                <div className="hidden md:block w-8 h-0.5 bg-[#E8E5DE] relative">
                  <div
                    className="absolute inset-0 bg-[#0A0A0A] transition-transform duration-500 origin-left"
                    style={{
                      transform: `scaleX(${i <= activeStep ? 1 : 0})`,
                    }}
                  />
                </div>
              )}
              <button
                onClick={() => switchStep(i)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  i === activeStep
                    ? `${STEP_COLORS[i].bg} ${STEP_COLORS[i].text} font-bold`
                    : 'bg-transparent text-[#999] border border-[#E8E5DE] hover:border-[#ccc]'
                }`}
              >
                {i + 1}. {label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Content area */}
        <div
          className="mt-12 min-h-[400px] md:min-h-[500px] transition-all duration-300"
          style={{
            opacity: fadeState === 'in' ? 1 : 0,
            transform:
              fadeState === 'in' ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          {stepComponents[activeStep]}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// MARGE CALCULATOR SPOTLIGHT
// ═══════════════════════════════════════════════════════════

function MargeSpotlight() {
  const [montageUren, setMontageUren] = useState(5)
  const [voorbereidingUren, setVoorbereidingUren] = useState(4)
  const revealRef = useScrollReveal()

  const inkoop = 915
  const verkoop =
    960 + montageUren * 85 + voorbereidingUren * 85
  const btw = verkoop * 0.21
  const totaal = verkoop + btw
  const winst = verkoop - inkoop
  const marge = verkoop > 0 ? Math.round((winst / verkoop) * 1000) / 10 : 0
  const totalUren = montageUren + voorbereidingUren

  const margeColor =
    marge >= 40 ? '#4E7A58' : marge >= 25 ? '#8A7E60' : '#dc2626'
  const barColor =
    marge >= 40
      ? 'bg-[#4E7A58]'
      : marge >= 25
      ? 'bg-[#8A7E60]'
      : 'bg-red-500'

  return (
    <section id="features" className="bg-[#F7F6F3] py-24" ref={revealRef}>
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="reveal-up text-[36px] md:text-[40px] font-black text-center text-[#0A0A0A]">
          De gamechanger: altijd je marge in beeld.
        </h2>
        <p className="reveal-up reveal-delay-1 text-center text-[#555] max-w-2xl mx-auto mt-4 text-lg">
          Terwijl je een offerte bouwt, berekent FORGEdesk real-time je inkoop,
          verkoop en marge. Regel voor regel. Geen spreadsheet nodig.
        </p>

        <div className="reveal-scale reveal-delay-2 bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-[#E8E5DE] max-w-md mx-auto mt-12">
          {/* Total */}
          <div className="text-xs font-bold text-[#999] uppercase tracking-wider">
            Totaal incl BTW
          </div>
          <div className="text-[32px] md:text-[36px] font-black text-[#0A0A0A] mt-1">
            {formatCurrency(totaal)}
          </div>

          {/* Subtotaal / BTW */}
          <div className="flex gap-3 mt-4">
            <div className="flex-1 bg-[#F7F6F3] rounded-xl p-3 text-center">
              <div className="text-xs text-[#999]">Subtotaal</div>
              <div className="text-sm font-bold text-[#0A0A0A]">
                {formatCurrency(verkoop)}
              </div>
            </div>
            <div className="flex-1 bg-[#F7F6F3] rounded-xl p-3 text-center">
              <div className="text-xs text-[#999]">BTW</div>
              <div className="text-sm font-bold text-[#0A0A0A]">
                {formatCurrency(btw)}
              </div>
            </div>
          </div>

          {/* Inkoop / Verkoop / Winst */}
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm text-[#999]">
                <TrendingDown className="w-4 h-4 text-red-500" /> Inkoop
              </span>
              <span className="text-sm font-bold text-red-500">
                {formatCurrency(inkoop)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm text-[#999]">
                <TrendingUp className="w-4 h-4" /> Verkoop
              </span>
              <span className="text-sm font-bold text-[#0A0A0A]">
                {formatCurrency(verkoop)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#0A0A0A]">Winst</span>
              <span
                className="text-sm font-bold"
                style={{ color: margeColor }}
              >
                {formatCurrency(winst)}
              </span>
            </div>
          </div>

          {/* Marge bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#999] uppercase tracking-wider">
                Marge
              </span>
              <span
                className="text-lg font-black"
                style={{ color: margeColor }}
              >
                {marge.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-blush/30 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(marge, 100)}%` }}
              />
            </div>
          </div>

          {/* Per item */}
          <div className="mt-5 text-xs text-[#999]">
            <span className="font-medium text-[#0A0A0A]">Per item:</span>{' '}
            Lichtreclame 1 — {marge.toFixed(1)}%
          </div>

          {/* Uren — interactive */}
          <div className="mt-6 pt-4 border-t border-[#E8E5DE]">
            <div className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">
              Uren
            </div>
            <div className="space-y-2">
              <UrenRow
                label="Montage"
                value={montageUren}
                onChange={setMontageUren}
              />
              <UrenRow
                label="Voorbereiding"
                value={voorbereidingUren}
                onChange={setVoorbereidingUren}
              />
            </div>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#E8E5DE]">
              <span className="text-sm font-medium text-[#0A0A0A]">
                Totaal uren
              </span>
              <span className="text-sm font-bold text-[#0A0A0A]">
                {totalUren} uur
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function UrenRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#555]">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-lg border border-[#E8E5DE] flex items-center justify-center hover:bg-[#F7F6F3] transition-colors"
          aria-label={`${label} minus`}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-sm font-bold w-8 text-center">{value} uur</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-lg border border-[#E8E5DE] flex items-center justify-center hover:bg-[#F7F6F3] transition-colors"
          aria-label={`${label} plus`}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MARQUEE STRIP
// ═══════════════════════════════════════════════════════════

function MarqueeStrip() {
  const revealRef = useScrollReveal()
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <section className="bg-white py-10 overflow-hidden" ref={revealRef}>
      <p className="reveal-up text-center text-sm font-semibold text-[#999] uppercase tracking-wider mb-6">
        Gebouwd voor de creatieve maakbranche
      </p>
      <div className="relative">
        <div className="flex gap-4 animate-marquee w-max">
          {items.map((item, i) => (
            <span
              key={i}
              className={`inline-block ${item.color} rounded-full px-5 py-2 text-sm font-semibold whitespace-nowrap`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// AI SIGNING VISUALIZER
// ═══════════════════════════════════════════════════════════

function VisualizerSection() {
  const revealRef = useScrollReveal()
  const [activeType, setActiveType] = useState(0)

  const signingTypes = [
    {
      name: 'LED Doosletters',
      desc: 'Verlichte 3D letters met LED achterverlichting',
      color: 'blush',
      colorDeep: '#B8806A',
      effect: 'Warmwit licht, halo-effect op gevel',
    },
    {
      name: 'Neon',
      desc: 'Klassieke of moderne flex-neon signing',
      color: 'lavender',
      colorDeep: '#6B5B8A',
      effect: 'Gloeiend neoneffect, zichtbaar dag & nacht',
    },
    {
      name: 'Freesletters',
      desc: 'Strak uitgesneden letters, onverlicht',
      color: 'mist',
      colorDeep: '#4A6E8A',
      effect: 'Aluminium of RVS, professionele uitstraling',
    },
    {
      name: 'Gevelreclame',
      desc: 'Full-color prints op dibond of acrylaat',
      color: 'sage',
      colorDeep: '#4E7A58',
      effect: 'Fotokwaliteit, weerbestendig',
    },
  ]

  const current = signingTypes[activeType]

  return (
    <section id="ai-tools" className="bg-white py-24 relative overflow-hidden" ref={revealRef}>
      {/* Subtle background orb */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${COLORS.mist}, transparent 70%)` }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center">
          <div className="reveal-up inline-flex items-center gap-2 bg-mist/60 text-[#4A6E8A] rounded-full px-4 py-1.5 text-sm font-semibold mb-6 border border-mist">
            <Sparkles className="w-4 h-4" />
            Uniek in de branche
          </div>
          <h2 className="reveal-up reveal-delay-1 text-[36px] md:text-[44px] font-black text-[#0A0A0A]">
            Signing Visualizer
          </h2>
          <p className="reveal-up reveal-delay-2 text-[18px] text-[#555] max-w-2xl mx-auto mt-4">
            Laat je klant zien hoe hun signing eruitziet — nog vóórdat je begint
            met produceren. Upload een foto, beschrijf wat je wilt, en AI genereert
            een fotorealistische mockup in seconden.
          </p>
        </div>

        {/* Interactive visualizer demo */}
        <div className="reveal-up reveal-delay-3 mt-16">
          <div className="bg-[#F7F6F3] rounded-3xl p-6 md:p-10 border border-[#E8E5DE]">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left: mock gevel preview */}
              <div className="lg:w-[60%]">
                <div className="relative bg-gradient-to-b from-[#87CEEB] via-[#B0C4DE] to-[#D4CFC4] rounded-2xl overflow-hidden aspect-[16/10]">
                  {/* Building facade mock */}
                  <div className="absolute bottom-0 left-0 right-0 h-[70%] bg-[#E8E0D0] border-t-4 border-[#C4B8A4]">
                    {/* Windows */}
                    <div className="flex justify-center gap-6 mt-8">
                      <div className="w-16 h-20 bg-[#8FAABD] rounded-t-lg border-2 border-[#C4B8A4]" />
                      <div className="w-20 h-24 bg-[#6A8FA8] rounded-t-lg border-2 border-[#C4B8A4]" />
                      <div className="w-16 h-20 bg-[#8FAABD] rounded-t-lg border-2 border-[#C4B8A4]" />
                    </div>
                    {/* Door */}
                    <div className="flex justify-center mt-4">
                      <div className="w-14 h-20 bg-[#6B5B4B] rounded-t-lg border-2 border-[#C4B8A4]" />
                    </div>
                  </div>

                  {/* Signing text on building */}
                  <div className="absolute top-[22%] left-0 right-0 text-center">
                    <div
                      className="inline-block text-2xl md:text-3xl font-black tracking-wider px-6 py-2 transition-all duration-500"
                      style={{
                        color: current.colorDeep,
                        textShadow: activeType === 0
                          ? `0 0 20px ${current.colorDeep}40, 0 0 40px ${current.colorDeep}20`
                          : activeType === 1
                          ? `0 0 15px ${current.colorDeep}, 0 0 30px ${current.colorDeep}80, 0 0 60px ${current.colorDeep}40`
                          : 'none',
                      }}
                    >
                      BAKKERIJ JANSEN
                    </div>
                  </div>

                  {/* Type label */}
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-bold" style={{ color: current.colorDeep }}>
                    {current.name}
                  </div>
                </div>
              </div>

              {/* Right: controls */}
              <div className="lg:w-[40%]">
                <h3 className="text-lg font-bold text-[#0A0A0A] mb-1">Kies een signingtype</h3>
                <p className="text-sm text-[#999] mb-5">Klik om het resultaat te zien op de gevel</p>

                <div className="space-y-3">
                  {signingTypes.map((type, i) => (
                    <button
                      key={type.name}
                      onClick={() => setActiveType(i)}
                      className={`w-full text-left rounded-xl p-4 transition-all duration-300 border ${
                        i === activeType
                          ? `bg-${type.color}/30 border-[${type.colorDeep}]/30 shadow-sm`
                          : 'bg-white border-[#E8E5DE] hover:border-[#ccc]'
                      }`}
                      style={i === activeType ? {
                        backgroundColor: `${type.colorDeep}10`,
                        borderColor: `${type.colorDeep}30`,
                      } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-[#0A0A0A]">{type.name}</div>
                          <div className="text-xs text-[#555] mt-0.5">{type.desc}</div>
                        </div>
                        {i === activeType && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: type.colorDeep }}>
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      {i === activeType && (
                        <div className="mt-2 pt-2 border-t border-[#E8E5DE]">
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: type.colorDeep }}>
                            <Eye className="w-3 h-3" />
                            {type.effect}
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How it works - 3 steps */}
        <div className="reveal-up reveal-delay-4 grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-[#F7F6F3] rounded-2xl p-6 text-center border border-[#E8E5DE] hover:border-blush/50 hover:shadow-sm transition-all">
            <div className="w-12 h-12 bg-blush rounded-xl flex items-center justify-center mx-auto">
              <Image className="w-6 h-6 text-[#B8806A]" />
            </div>
            <h3 className="font-bold text-[#0A0A0A] mt-4">1. Upload een foto</h3>
            <p className="text-sm text-[#555] mt-2">
              Van een gebouw, voertuig, pui of schets. Voeg optioneel een logo toe
              (PNG met transparante achtergrond werkt het best).
            </p>
          </div>
          <div className="bg-[#F7F6F3] rounded-2xl p-6 text-center border border-[#E8E5DE] hover:border-sage/50 hover:shadow-sm transition-all">
            <div className="w-12 h-12 bg-sage rounded-xl flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6 text-[#4E7A58]" />
            </div>
            <h3 className="font-bold text-[#0A0A0A] mt-4">2. Beschrijf het resultaat</h3>
            <p className="text-sm text-[#555] mt-2">
              Bijvoorbeeld: &quot;LED doosletters boven de deur, warmwit&quot; of
              &quot;Neonlogo op de gevel&quot;. AI begrijpt precies wat je bedoelt.
            </p>
          </div>
          <div className="bg-[#F7F6F3] rounded-2xl p-6 text-center border border-[#E8E5DE] hover:border-mist/50 hover:shadow-sm transition-all">
            <div className="w-12 h-12 bg-mist rounded-xl flex items-center justify-center mx-auto">
              <Send className="w-6 h-6 text-[#4A6E8A]" />
            </div>
            <h3 className="font-bold text-[#0A0A0A] mt-4">3. Verstuur naar je klant</h3>
            <p className="text-sm text-[#555] mt-2">
              Koppel de visualisatie direct aan een offerte en verstuur het als
              professionele presentatie. Je klant ziet meteen het eindresultaat.
            </p>
          </div>
        </div>

        {/* Tech tags */}
        <div className="reveal-up reveal-delay-5 flex flex-wrap justify-center gap-3 mt-10">
          {['Nano Banana 2 model', '4 signingtypes', 'Tot 4K resolutie', 'Chat-verfijning', 'Koppel aan offerte'].map((tag) => (
            <span key={tag} className="bg-white border border-[#E8E5DE] rounded-full px-4 py-1.5 text-xs font-semibold text-[#555]">
              {tag}
            </span>
          ))}
        </div>

        <p className="reveal-up reveal-delay-5 text-center text-[#999] text-sm mt-6">
          Geen enkel ander bedrijfsvoeringspakket biedt AI-visualisaties voor de
          signbranche. Dit is exclusief in FORGEdesk.
        </p>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// FORGIE AI ASSISTANT
// ═══════════════════════════════════════════════════════════

function ForgieSection() {
  const revealRef = useScrollReveal()
  const [activeChat, setActiveChat] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [showAnswer, setShowAnswer] = useState(true)

  const conversations = [
    {
      question: 'Wat is mijn omzet deze maand?',
      answer: 'Je omzet in maart 2026 is **€ 24.850**. Dat is 12% meer dan vorige maand. Je hebt 8 facturen verstuurd, waarvan er 3 nog openstaan (€ 7.200).',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      question: 'Welke offertes staan er open?',
      answer: 'Je hebt **5 openstaande offertes** met een totale waarde van **€ 18.340**. De oudste is van 2 weken geleden (Bakkerij Jansen, €2.087). Wil je dat ik een follow-up mail opstel?',
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      question: 'Schrijf een follow-up mail voor Bakkerij Jansen',
      answer: 'Hier is een concept:\n\nBeste heer Jansen,\n\nGraag herinner ik u aan onze offerte OFF-2026-048 voor de LED lichtreclame. Heeft u nog vragen? Ik help u graag verder.\n\nMet vriendelijke groet',
      icon: <Mail className="w-3.5 h-3.5" />,
    },
  ]

  const switchChat = useCallback((idx: number) => {
    if (idx === activeChat) return
    setShowAnswer(false)
    setIsTyping(true)
    setActiveChat(idx)
    setTimeout(() => {
      setIsTyping(false)
      setShowAnswer(true)
    }, 1200)
  }, [activeChat])

  return (
    <section className="bg-[#F7F6F3] py-24" ref={revealRef}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          {/* Left: explanation */}
          <div className="lg:w-[55%]">
            <div className="reveal-up inline-flex items-center gap-2 bg-sage text-[#4E7A58] rounded-full px-4 py-1.5 text-sm font-semibold mb-6 border border-sage-deep/20">
              <Brain className="w-4 h-4" />
              AI-assistent
            </div>
            <h2 className="reveal-up reveal-delay-1 text-[36px] md:text-[44px] font-black text-[#0A0A0A]">
              Maak kennis met Forgie.
            </h2>
            <p className="reveal-up reveal-delay-2 text-[18px] text-[#555] mt-4 leading-relaxed">
              Forgie is je persoonlijke AI-assistent die alles weet over jouw bedrijf.
              Stel gewoon een vraag in het Nederlands — over klanten, offertes, facturen,
              projecten of omzet — en Forgie geeft direct antwoord op basis van jouw
              eigen data.
            </p>
            <p className="reveal-up reveal-delay-3 text-[16px] text-[#555] mt-4 leading-relaxed">
              Nieuw met AI? Geen zorgen. Forgie werkt net als een chat: typ je vraag en
              krijg een helder antwoord. Geen technische kennis nodig. Forgie kan ook
              e-mails herschrijven, vertalen, samenvatten en professioneler maken.
            </p>

            <div className="reveal-up reveal-delay-4 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-sm text-[#555] bg-white rounded-xl px-3 py-2.5 border border-[#E8E5DE]">
                <Database className="w-4 h-4 text-[#4E7A58] shrink-0" />
                <span>Jouw bedrijfsdata</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#555] bg-white rounded-xl px-3 py-2.5 border border-[#E8E5DE]">
                <Shield className="w-4 h-4 text-[#4E7A58] shrink-0" />
                <span>Veilig en privé</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#555] bg-white rounded-xl px-3 py-2.5 border border-[#E8E5DE]">
                <Zap className="w-4 h-4 text-[#4E7A58] shrink-0" />
                <span>Claude Sonnet</span>
              </div>
            </div>
          </div>

          {/* Right: interactive chat mockup */}
          <div className="reveal-scale reveal-delay-3 lg:w-[45%]">
            <div className="bg-white rounded-3xl shadow-xl border border-[#E8E5DE] overflow-hidden">
              {/* Chat header */}
              <div className="px-5 py-4 border-b border-[#E8E5DE] bg-[#FAFAF8] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center">
                    <span className="text-sm">🦊</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0A0A0A]">Forgie</div>
                    <div className="text-xs text-[#4E7A58]">Online — je bedrijfsgeheugen</div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#4E7A58] animate-pulse" />
              </div>

              {/* Chat messages */}
              <div className="p-5 space-y-4 min-h-[220px]">
                <div className="flex justify-end">
                  <div className="bg-[#0A0A0A] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]">
                    {conversations[activeChat].question}
                  </div>
                </div>
                {isTyping ? (
                  <div className="flex justify-start">
                    <div className="bg-[#F7F6F3] rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-[#999] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                ) : showAnswer ? (
                  <div className="flex justify-start">
                    <div className="bg-[#F7F6F3] text-[#0A0A0A] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm max-w-[85%] leading-relaxed whitespace-pre-line">
                      {conversations[activeChat].answer.split('**').map((part, i) =>
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Suggestion chips — clickable */}
              <div className="px-5 pb-4 border-t border-[#E8E5DE] pt-3">
                <div className="text-[10px] text-[#999] uppercase tracking-wider mb-2 font-semibold">Probeer een vraag</div>
                <div className="flex flex-wrap gap-2">
                  {conversations.map((conv, i) => (
                    <button
                      key={i}
                      onClick={() => switchChat(i)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        i === activeChat
                          ? 'bg-sage text-[#4E7A58] border border-[#4E7A58]/20'
                          : 'bg-[#F7F6F3] border border-[#E8E5DE] text-[#555] hover:border-sage-deep/30 hover:bg-sage/30'
                      }`}
                    >
                      {conv.icon}
                      {conv.question.length > 30 ? conv.question.slice(0, 30) + '...' : conv.question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// PRICING
// ═══════════════════════════════════════════════════════════

function PricingSection() {
  const { ref: priceRef, isVisible: priceVisible } = useInView(0.3)
  const priceValue = useCountUp(49, 1500, priceVisible)
  const [employees, setEmployees] = useState(5)
  const revealRef = useScrollReveal()

  const teamleader = employees * 37.5
  const gripp = employees <= 5 ? 249 : employees <= 10 ? 399 : 599
  const simplicate = employees <= 5 ? 199 : employees <= 10 ? 349 : 499
  const forge = 49
  const maxSaving = Math.max(teamleader, gripp, simplicate) - forge

  return (
    <section id="prijzen" className="bg-white py-24" ref={revealRef}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Price counter */}
        <div ref={priceRef}>
          <div className="text-[80px] md:text-[120px] font-black text-[#0A0A0A] leading-none reveal-up">
            <span>{priceValue}</span>
          </div>
          <div className="reveal-up reveal-delay-1 text-[24px] text-[#999] -mt-2">
            /maand
          </div>
          <p className="reveal-up reveal-delay-2 text-xl text-[#555] mt-4">
            Per bedrijf. Onbeperkt medewerkers. Alle features.
          </p>
          <div className="reveal-up reveal-delay-2 inline-flex items-center gap-2 bg-lavender/40 text-[#6B5B8A] rounded-full px-4 py-1.5 text-sm font-semibold mt-4 border border-lavender">
            <Sparkles className="w-3.5 h-3.5" />
            Inclusief AI-tools
          </div>
        </div>

        {/* Feature checklist */}
        <div className="reveal-up reveal-delay-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-12 max-w-xl mx-auto text-left">
          {PRICING_FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#4E7A58] shrink-0" />
              <span className="text-sm text-[#555]">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="reveal-up reveal-delay-4 mt-10">
          <Link
            to="/register"
            className="inline-block bg-[#0A0A0A] text-white px-10 py-5 rounded-[14px] text-[17px] font-bold hover:bg-[#1a1a1a] transition-colors"
          >
            Start 30 dagen gratis
          </Link>
          <p className="text-sm text-[#999] mt-3">Geen creditcard nodig</p>
        </div>

        {/* Comparison slider */}
        <div className="reveal-up reveal-delay-5 mt-16 bg-[#F7F6F3] rounded-3xl p-6 md:p-10">
          <h3 className="text-lg font-bold text-[#0A0A0A]">
            Hoeveel medewerkers heb je?
          </h3>
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-[#999]">1</span>
            <input
              type="range"
              min={1}
              max={20}
              value={employees}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmployees(parseInt(e.target.value))}
              className="flex-1 accent-[#0A0A0A] h-2"
            />
            <span className="text-sm text-[#999]">20</span>
          </div>
          <p className="text-sm text-[#555] mt-2">
            {employees} medewerker{employees > 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <ComparisonCard
              name="Teamleader"
              price={teamleader}
              isWinner={false}
            />
            <ComparisonCard name="Gripp" price={gripp} isWinner={false} />
            <ComparisonCard
              name="Simplicate"
              price={simplicate}
              isWinner={false}
            />
            <ComparisonCard
              name="FORGEdesk"
              price={forge}
              isWinner={true}
            />
          </div>

          {maxSaving > 0 && (
            <p className="mt-6 text-[#4E7A58] font-bold text-lg">
              Bespaar tot {formatCurrency(maxSaving)}/maand
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function ComparisonCard({
  name,
  price,
  isWinner,
}: {
  name: string
  price: number
  isWinner: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-center ${
        isWinner
          ? 'bg-sage text-[#4E7A58] ring-2 ring-[#4E7A58]'
          : 'bg-white border border-[#E8E5DE]'
      }`}
    >
      <div className={`text-sm font-medium ${isWinner ? 'font-bold' : 'text-[#999]'}`}>
        {name}
      </div>
      <div
        className={`text-2xl font-black mt-1 ${
          isWinner ? 'text-[#4E7A58]' : 'text-[#0A0A0A]'
        }`}
      >
        {formatCurrency(price)}
      </div>
      <div className="text-xs text-[#999] mt-0.5">/maand</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TESTIMONIALS
// ═══════════════════════════════════════════════════════════

function TestimonialsSection() {
  const revealRef = useScrollReveal()

  return (
    <section className="bg-[#F7F6F3] py-24" ref={revealRef}>
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="reveal-up text-[36px] md:text-[40px] font-black text-center text-[#0A0A0A]">
          Wat vakmensen zeggen.
        </h2>

        {/* Main testimonial */}
        <div className="reveal-up reveal-delay-1 bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[#E8E5DE] mt-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${COLORS.blush}, transparent 70%)` }} />
          <blockquote className="text-[20px] md:text-[24px] font-medium leading-relaxed text-[#0A0A0A] relative z-10">
            &ldquo;Ik stond bij een klant en kon in 10 seconden laten zien hoeveel uur
            ik had berekend per lichtreclame. Met mijn vorige tool moest ik 8
            losse calculaties openen.&rdquo;
          </blockquote>
          <div className="mt-6 text-sm text-[#555] relative z-10">
            — Antony B. - Sign Company, Enkhuizen
          </div>
        </div>

        {/* Three testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="reveal-up reveal-delay-2 bg-gradient-to-br from-blush to-blush/60 rounded-2xl p-8 border border-blush-deep/10">
            <blockquote className="text-[15px] font-medium leading-relaxed text-[#0A0A0A]">
              &ldquo;Eindelijk een tool die begrijpt hoe wij werken. Geen overbodige
              features, geen enterprise onzin.&rdquo;
            </blockquote>
            <div className="mt-4 text-sm text-[#B8806A] font-semibold">
              — Marco V. - Interieurbouwer
            </div>
          </div>
          <div className="reveal-up reveal-delay-3 bg-gradient-to-br from-sage to-sage/60 rounded-2xl p-8 border border-sage-deep/10">
            <blockquote className="text-[15px] font-medium leading-relaxed text-[#0A0A0A]">
              &ldquo;De margeberekening bespaart me uren per week. Ik zie direct wat ik
              overhoud.&rdquo;
            </blockquote>
            <div className="mt-4 text-sm text-[#4E7A58] font-semibold">
              — Sandra K. - Reclamemakers
            </div>
          </div>
          <div className="reveal-up reveal-delay-4 bg-gradient-to-br from-lavender to-lavender/60 rounded-2xl p-8 border border-[#6B5B8A]/10">
            <blockquote className="text-[15px] font-medium leading-relaxed text-[#0A0A0A]">
              &ldquo;Forgie AI is briljant. Ik vraag gewoon: welke offertes staan open?
              En krijg direct een helder overzicht.&rdquo;
            </blockquote>
            <div className="mt-4 text-sm text-[#6B5B8A] font-semibold">
              — Pieter D. - Signbedrijf
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// CTA + FOOTER
// ═══════════════════════════════════════════════════════════

function CTAFooter() {
  const revealRef = useScrollReveal()

  return (
    <footer ref={revealRef}>
      {/* CTA */}
      <div className="bg-[#0A0A0A] rounded-t-3xl py-24 text-center text-white relative overflow-hidden">
        {/* Pastel orbs on dark background */}
        <div className="absolute top-10 left-[10%] w-48 h-48 rounded-full opacity-10 animate-pulse-soft pointer-events-none"
          style={{ background: `radial-gradient(circle, ${COLORS.blush}, transparent 70%)` }} />
        <div className="absolute bottom-10 right-[15%] w-64 h-64 rounded-full opacity-10 animate-pulse-soft pointer-events-none"
          style={{ background: `radial-gradient(circle, ${COLORS.lavender}, transparent 70%)`, animationDelay: '1.5s' }} />
        <div className="absolute top-[40%] right-[40%] w-32 h-32 rounded-full opacity-8 animate-pulse-soft pointer-events-none"
          style={{ background: `radial-gradient(circle, ${COLORS.sage}, transparent 70%)`, animationDelay: '3s' }} />

        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <div className="reveal-up inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/70 rounded-full px-4 py-1.5 text-sm font-semibold mb-6 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            Met AI-tools ingebouwd
          </div>
          <h2 className="reveal-up text-[36px] md:text-[44px] font-black">
            Klaar om te beginnen?
          </h2>
          <p className="reveal-up reveal-delay-1 text-white/50 mt-3 text-lg">
            30 dagen gratis. Geen creditcard. Direct aan de slag.
          </p>
          <div className="reveal-up reveal-delay-1 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="bg-white text-[#0A0A0A] px-10 py-5 rounded-[14px] text-[17px] font-bold hover:bg-gray-100 transition-all hover:shadow-lg hover:shadow-white/10 w-full sm:w-auto"
            >
              Start 30 dagen gratis
            </Link>
            <a
              href="https://wa.me/31612345678"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/30 text-white px-10 py-5 rounded-[14px] text-[17px] font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
          </div>
          {/* Feature tags */}
          <div className="reveal-up reveal-delay-2 flex flex-wrap justify-center gap-3 mt-8">
            {['Offertes', 'Planning', 'Werkbonnen', 'Facturen', 'AI Visualizer', 'Forgie AI'].map((tag) => (
              <span key={tag} className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white/40">
                {tag}
              </span>
            ))}
          </div>
          <p className="reveal-up reveal-delay-2 text-sm text-white/50 mt-6">
            30 dagen gratis - Geen creditcard - Direct starten
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#0A0A0A] border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs"
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.blush}, ${COLORS.mist})`,
                  }}
                >
                  F
                </div>
                <span className="font-black text-white text-lg">
                  FORGEdesk
                </span>
              </div>
              <p className="text-sm text-white/40">
                Door vakmensen, voor vakmensen.
              </p>
              <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[10px] text-white/40 mt-2">
                <Sparkles className="w-2.5 h-2.5" />
                AI-Powered
              </div>
              <p className="text-xs text-white/30 mt-1">
                Gebouwd in Enkhuizen
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-bold text-white text-sm mb-3">Product</h4>
              <ul className="space-y-2">
                {['Features', 'Prijzen', 'Integraties', 'Updates'].map(
                  (item) => (
                    <li key={item}>
                      <span className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                        {item}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Bedrijf */}
            <div>
              <h4 className="font-bold text-white text-sm mb-3">Bedrijf</h4>
              <ul className="space-y-2">
                {['Over ons', 'Blog', 'Contact', 'Partners'].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-bold text-white text-sm mb-3">Support</h4>
              <ul className="space-y-2">
                {['Helpcentrum', 'Documentatie', 'Status', 'Privacy'].map(
                  (item) => (
                    <li key={item}>
                      <span className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                        {item}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-10 pt-6">
            <p className="text-xs text-white/30 text-center">
              2026 FORGEdesk. Alle rechten voorbehouden.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ═══════════════════════════════════════════════════════════
// BACK TO TOP
// ═══════════════════════════════════════════════════════════

function BackToTop() {
  const scrollY = useScrollY()
  const visible = scrollY > 500

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-[#0A0A0A] text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-[#1a1a1a] ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      aria-label="Terug naar boven"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ═══════════════════════════════════════════════════════════
// MAIN LANDING PAGE
// ═══════════════════════════════════════════════════════════

export default function LandingPage() {
  return (
    <div className="landing-noise bg-white font-sans antialiased">
      <Navbar />
      <Hero />
      <ForgeExplainer />
      <FlowSection />
      <MargeSpotlight />
      <MarqueeStrip />
      <VisualizerSection />
      <ForgieSection />
      <PricingSection />
      <TestimonialsSection />
      <CTAFooter />
      <BackToTop />
    </div>
  )
}
