import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUp, ArrowRight, Check, Menu, X,
  Shield, Zap, Users,
  Minus, Plus, ChevronDown,
  Phone, MessageCircle,
  Sparkles, Send, Brain, Database,
  FileText, BarChart3, Calendar, ClipboardCheck,
  Layers, Clock, Mail, PenTool,
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

function useFadeUp() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const children = el.querySelectorAll('.lf-fade-up')
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.1 }
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
  bg: '#FAFAF8',
  fg: '#1a1a1a',
  coral: '#E8866A',
  sage: '#7EB5A6',
  gold: '#C4A882',
  purple: '#9B8EC4',
  blue: '#8BAFD4',
  border: '#E8E5DE',
}

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
  'Daan AI-assistent',
]

const FAQ_ITEMS = [
  {
    q: 'Is Doen. geschikt voor mijn branche?',
    a: 'Doen. is gebouwd voor de creatieve maakbranche — signbedrijven, interieurbouwers, reclamemakers, standbouwers, schilders, installateurs en meer. Als je iets maakt met je handen en offertes, werkbonnen en facturen nodig hebt, past Doen. perfect.',
  },
  {
    q: 'Wat kost Doen. na de proefperiode?',
    a: 'Doen. kost €49 per maand per bedrijf. Geen kosten per gebruiker — je kunt onbeperkt medewerkers toevoegen. Alle features zijn inbegrepen, inclusief AI-tools.',
  },
  {
    q: 'Kan ik mijn data importeren?',
    a: 'Ja, je kunt klanten, producten en prijslijsten importeren via CSV. Ons team helpt je gratis met de migratie vanuit je huidige systeem.',
  },
  {
    q: 'Hoe werkt de AI Signing Visualizer?',
    a: 'Upload een foto van een gevel, voertuig of pui. Beschrijf wat je wilt (bijv. "LED doosletters boven de deur") en onze AI genereert een fotorealistische mockup. Je kunt deze direct aan een offerte koppelen en naar je klant sturen.',
  },
  {
    q: 'Is mijn data veilig?',
    a: 'Absoluut. Doen. draait op Supabase met enterprise-grade beveiliging. Je data wordt versleuteld opgeslagen en er worden dagelijks backups gemaakt. We delen nooit data met derden.',
  },
  {
    q: 'Kan ik Doen. op mijn telefoon gebruiken?',
    a: 'Ja. Doen. werkt volledig in de browser en is geoptimaliseerd voor mobiel. Je monteurs kunnen werkbonnen invullen, foto\'s toevoegen en klanten laten tekenen — allemaal op hun telefoon.',
  },
]

// ═══════════════════════════════════════════════════════════
// NAVBAR — Glassmorphism
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'lf-glass-nav bg-[#FAFAF8]/70 border-b border-[#E8E5DE]/60 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/logos/doen-logo.svg" alt="doen." className="h-9" />
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Features', id: 'features' },
              { label: 'Hoe het werkt', id: 'hoe-het-werkt' },
              { label: 'Prijzen', id: 'prijzen' },
              { label: 'FAQ', id: 'faq' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-sm font-medium text-[#777] hover:text-[#1a1a1a] transition-colors duration-300"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-[#777] hover:text-[#1a1a1a] transition-colors"
            >
              Inloggen
            </Link>
            <Link
              to="/register"
              className="bg-[#1a1a1a] text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-[#333] transition-all duration-300 hover:shadow-lg hover:shadow-black/10"
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
              <X className="w-6 h-6 text-[#1a1a1a]" />
            ) : (
              <Menu className="w-6 h-6 text-[#1a1a1a]" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#FAFAF8] flex flex-col items-center justify-center gap-8">
          <button
            className="absolute top-5 right-6 p-2"
            onClick={() => setMobileOpen(false)}
            aria-label="Sluiten"
          >
            <X className="w-6 h-6" />
          </button>
          {[
            { label: 'Features', id: 'features' },
            { label: 'Hoe het werkt', id: 'hoe-het-werkt' },
            { label: 'Prijzen', id: 'prijzen' },
            { label: 'FAQ', id: 'faq' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-2xl font-semibold text-[#1a1a1a]"
            >
              {item.label}
            </button>
          ))}
          <Link
            to="/login"
            className="text-xl font-medium text-[#777]"
            onClick={() => setMobileOpen(false)}
          >
            Inloggen
          </Link>
          <Link
            to="/register"
            className="bg-[#1a1a1a] text-white rounded-full px-10 py-4 text-lg font-semibold"
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
// HERO — Gradient orbs + floating cards + massive whitespace
// ═══════════════════════════════════════════════════════════

function FloatingCards({ scrollY }: { scrollY: number }) {
  const cards = [
    {
      title: 'Offerte OFF-048',
      sub: 'Bakkerij Jansen',
      amount: '€ 2.087',
      accent: COLORS.coral,
      top: '8%',
      right: '8%',
      speed: 0.03,
    },
    {
      title: 'Planning',
      sub: 'Ma 14 mrt — Montage',
      amount: '09:00 – 14:00',
      accent: COLORS.sage,
      top: '30%',
      right: '55%',
      speed: 0.05,
    },
    {
      title: 'Werkbon WB-018',
      sub: 'Getekend door klant',
      amount: '€ 1.765',
      accent: COLORS.blue,
      top: '55%',
      right: '12%',
      speed: 0.02,
    },
  ]

  return (
    <div className="relative w-full h-[350px] md:h-[420px]">
      {cards.map((card, i) => (
        <div
          key={i}
          className="lf-float-card absolute bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-[#E8E5DE]/80 p-5 w-[200px]"
          style={{
            top: card.top,
            right: card.right,
            borderLeft: `3px solid ${card.accent}`,
            transform: `translateY(${scrollY * card.speed * (i % 2 === 0 ? -1 : 1)}px)`,
            animation: `float ${5 + i}s ease-in-out infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        >
          <div className="text-xs font-bold text-[#1a1a1a]">{card.title}</div>
          <div className="text-xs text-[#999] mt-1">{card.sub}</div>
          <div className="text-sm font-bold text-[#1a1a1a] mt-2 font-outfit">
            {card.amount}
          </div>
        </div>
      ))}
    </div>
  )
}

function Hero() {
  const scrollY = useScrollY()
  const fadeRef = useFadeUp()

  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden bg-[#FAFAF8]" ref={fadeRef}>
      {/* Gradient orbs */}
      <div
        className="lf-orb absolute -top-20 right-[10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${COLORS.coral}20, transparent 70%)` }}
      />
      <div
        className="lf-orb-slow absolute bottom-0 left-[5%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${COLORS.purple}18, transparent 70%)` }}
      />
      <div
        className="lf-orb absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${COLORS.sage}15, transparent 70%)`, animationDelay: '4s' }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-8">
          {/* Left — Text */}
          <div className="lg:w-[55%]">
            {/* Badge */}
            <div className="lf-fade-up inline-flex items-center gap-2 bg-white border border-[#E8E5DE] rounded-full px-4 py-2 text-sm font-medium text-[#777] mb-8 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#9B8EC4]" />
              Nu met AI-tools ingebouwd
            </div>

            {/* Heading */}
            <h1 className="lf-fade-up lf-delay-1 text-[40px] md:text-[64px] lg:text-[72px] leading-[1.02] font-extrabold text-[#1a1a1a] tracking-tight">
              Jouw hele bedrijf.{' '}
              <span className="lf-serif-accent font-normal" style={{ color: COLORS.coral }}>
                Één app.
              </span>
            </h1>

            {/* Sub */}
            <p className="lf-fade-up lf-delay-2 text-[17px] md:text-[19px] text-[#777] max-w-[520px] mt-8 leading-relaxed">
              Offertes, werkbonnen, planning, facturen — alles wat je nodig hebt als{' '}
              <span className="text-[#1a1a1a] font-semibold">creatief maakbedrijf</span>. Zonder gedoe, zonder dubbel werk.
            </p>

            {/* CTA */}
            <div className="lf-fade-up lf-delay-3 mt-10 flex flex-col sm:flex-row items-start gap-4">
              <Link
                to="/register"
                className="group bg-[#1a1a1a] text-white px-8 py-4 rounded-full text-[16px] font-semibold hover:bg-[#333] transition-all duration-300 hover:shadow-xl hover:shadow-black/10 flex items-center gap-2"
              >
                Start gratis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById('hoe-het-werkt')
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-[#777] font-medium hover:text-[#1a1a1a] transition-colors py-4 text-[16px]"
              >
                Bekijk hoe het werkt
              </button>
            </div>

            {/* Trust */}
            <div className="lf-fade-up lf-delay-4 mt-10 flex flex-wrap gap-6 text-sm text-[#aaa]">
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

          {/* Right — Floating cards */}
          <div className="lg:w-[45%] lf-fade-up lf-delay-2">
            <FloatingCards scrollY={scrollY} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// THREE ICONS — Glow circles
// ═══════════════════════════════════════════════════════════

function ThreeIcons() {
  const fadeRef = useFadeUp()

  const items = [
    {
      icon: <FileText className="w-7 h-7" />,
      color: COLORS.coral,
      title: 'Offertes & facturen',
      desc: 'Bouw offertes met real-time margeberekening. Eén klik van werkbon naar factuur.',
    },
    {
      icon: <Calendar className="w-7 h-7" />,
      color: COLORS.sage,
      title: 'Planning & werkbonnen',
      desc: 'Plan montages, wijs teams toe, laat klanten tekenen op locatie.',
    },
    {
      icon: <Brain className="w-7 h-7" />,
      color: COLORS.purple,
      title: 'AI-tools ingebouwd',
      desc: 'Signing Visualizer voor mockups. Daan AI als je persoonlijke assistent.',
    },
  ]

  return (
    <section id="features" className="lf-section bg-[#FAFAF8] py-24 md:py-36" ref={fadeRef}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-16 md:mb-20">
          <p className="lf-fade-up text-sm font-semibold text-[#C4A882] uppercase tracking-widest mb-4">
            Alles-in-één platform
          </p>
          <h2 className="lf-fade-up lf-delay-1 text-[32px] md:text-[48px] font-extrabold text-[#1a1a1a] tracking-tight leading-tight">
            Gebouwd voor wie{' '}
            <span className="lf-serif-accent font-normal" style={{ color: COLORS.sage }}>
              iets maakt
            </span>
          </h2>
          <p className="lf-fade-up lf-delay-2 text-[17px] text-[#777] max-w-xl mx-auto mt-5">
            Signbedrijven, interieurbouwers, reclamemakers — Doen. begrijpt jouw werkproces.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {items.map((item, i) => (
            <div
              key={i}
              className={`lf-fade-up lf-delay-${i + 1} text-center md:text-left`}
            >
              {/* Glow icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 relative" style={{ color: item.color }}>
                <div className="absolute inset-0 rounded-2xl opacity-15" style={{ backgroundColor: item.color }} />
                <div className="absolute -inset-3 rounded-3xl opacity-8 blur-xl" style={{ backgroundColor: item.color }} />
                <div className="relative z-10" style={{ color: item.color }}>
                  {item.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-3">{item.title}</h3>
              <p className="text-[15px] text-[#777] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// HOE HET WERKT — Tabs + numbered steps
// ═══════════════════════════════════════════════════════════

const BOSS_STEPS = [
  {
    num: '01',
    title: 'Klant aanmaken',
    desc: 'Nieuwe klant belt? In 30 seconden staat alles erin — bedrijf, contactgegevens, notities.',
    icon: <Users className="w-5 h-5" />,
    color: COLORS.coral,
  },
  {
    num: '02',
    title: 'Offerte met margeberekening',
    desc: 'Bouw je offerte regel voor regel. Zie real-time je inkoop, verkoop en marge. Geen verrassingen.',
    icon: <FileText className="w-5 h-5" />,
    color: COLORS.sage,
  },
  {
    num: '03',
    title: 'Planning inrichten',
    desc: 'Sleep montages op de tijdlijn, wijs teams toe. Overzicht voor kantoor en buitendienst.',
    icon: <Calendar className="w-5 h-5" />,
    color: COLORS.blue,
  },
  {
    num: '04',
    title: 'Factuur versturen',
    desc: 'Werkbon goedgekeurd? Eén klik en de factuur staat klaar. Alle regels worden overgenomen.',
    icon: <BarChart3 className="w-5 h-5" />,
    color: COLORS.gold,
  },
]

const MONTEUR_STEPS = [
  {
    num: '01',
    title: 'Planning ontvangen',
    desc: 'Je ziet meteen wat er vandaag op de planning staat. Adres, tijdstip, projectdetails.',
    icon: <Clock className="w-5 h-5" />,
    color: COLORS.coral,
  },
  {
    num: '02',
    title: 'Werkbon invullen',
    desc: 'Op locatie uren noteren, materialen bijhouden, foto\'s toevoegen. Alles digitaal.',
    icon: <ClipboardCheck className="w-5 h-5" />,
    color: COLORS.sage,
  },
  {
    num: '03',
    title: 'Klant laten tekenen',
    desc: 'Klant tekent ter plekke op je telefoon. Werkbon is direct compleet en gekoppeld aan het project.',
    icon: <PenTool className="w-5 h-5" />,
    color: COLORS.blue,
  },
  {
    num: '04',
    title: 'Klaar. Alles gesynct.',
    desc: 'Kantoor ziet real-time wat er op locatie is gedaan. Nul dubbel werk, nul papier.',
    icon: <Layers className="w-5 h-5" />,
    color: COLORS.gold,
  },
]

function HowItWorksSection() {
  const [activeTab, setActiveTab] = useState(0)
  const fadeRef = useFadeUp()
  const steps = activeTab === 0 ? BOSS_STEPS : MONTEUR_STEPS

  return (
    <section id="hoe-het-werkt" className="lf-section bg-white py-24 md:py-36" ref={fadeRef}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-14 md:mb-20">
          <p className="lf-fade-up text-sm font-semibold text-[#C4A882] uppercase tracking-widest mb-4">
            Hoe het werkt
          </p>
          <h2 className="lf-fade-up lf-delay-1 text-[32px] md:text-[48px] font-extrabold text-[#1a1a1a] tracking-tight">
            Van A tot Z.{' '}
            <span className="lf-serif-accent font-normal" style={{ color: COLORS.coral }}>
              Zonder gedoe.
            </span>
          </h2>
        </div>

        {/* Tabs */}
        <div className="lf-fade-up lf-delay-2 flex justify-center mb-14">
          <div className="inline-flex bg-bg-subtle rounded-full p-1.5">
            {['Voor de baas', 'Voor de monteur'].map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === i
                    ? 'bg-white text-[#1a1a1a] shadow-sm'
                    : 'text-[#999] hover:text-[#555]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* SVG connection line (desktop) */}
          <svg className="hidden md:block absolute top-[52px] left-[calc(12.5%+28px)] w-[calc(75%-56px)] h-1 pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100%" y2="0" stroke={COLORS.border} strokeWidth="2" strokeDasharray="6 4" />
          </svg>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
            {steps.map((step, i) => (
              <div key={`${activeTab}-${i}`} className="lf-fade-up text-center" style={{ transitionDelay: `${(i + 3) * 0.1}s` }}>
                {/* Number circle */}
                <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-full border-2 bg-white z-10 mb-5" style={{ borderColor: step.color }}>
                  <span className="text-sm font-bold font-outfit" style={{ color: step.color }}>{step.num}</span>
                </div>
                {/* Icon */}
                <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${step.color}15`, color: step.color }}>
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{step.title}</h3>
                <p className="text-sm text-[#777] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// DAAN AI — Chat mockup
// ═══════════════════════════════════════════════════════════

function ForgieSection() {
  const fadeRef = useFadeUp()
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
    <section className="lf-section bg-[#FAFAF8] py-24 md:py-36" ref={fadeRef}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* Left: explanation */}
          <div className="lg:w-[50%]">
            <p className="lf-fade-up text-sm font-semibold text-[#9B8EC4] uppercase tracking-widest mb-4">
              AI-assistent
            </p>
            <h2 className="lf-fade-up lf-delay-1 text-[32px] md:text-[48px] font-extrabold text-[#1a1a1a] tracking-tight leading-tight">
              Maak kennis met{' '}
              <span className="lf-serif-accent font-normal" style={{ color: COLORS.purple }}>
                Daan
              </span>
            </h2>
            <p className="lf-fade-up lf-delay-2 text-[17px] text-[#777] mt-6 leading-relaxed">
              Daan is je persoonlijke AI-assistent die alles weet over jouw bedrijf.
              Stel een vraag over klanten, offertes, facturen of omzet — en krijg direct antwoord.
            </p>
            <p className="lf-fade-up lf-delay-3 text-[15px] text-[#999] mt-4 leading-relaxed">
              Daan kan ook e-mails opstellen, vertalen en samenvatten. Geen technische kennis nodig.
            </p>

            <div className="lf-fade-up lf-delay-4 mt-8 flex flex-wrap gap-3">
              {[
                { icon: <Database className="w-4 h-4" />, label: 'Jouw data' },
                { icon: <Shield className="w-4 h-4" />, label: 'Veilig & privé' },
                { icon: <Zap className="w-4 h-4" />, label: 'Claude Sonnet' },
              ].map((tag) => (
                <div key={tag.label} className="flex items-center gap-2 text-sm text-[#777] bg-white rounded-full px-4 py-2 border border-[#E8E5DE]">
                  <span className="text-[#7EB5A6]">{tag.icon}</span>
                  {tag.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: chat mockup */}
          <div className="lf-fade-up lf-delay-3 lg:w-[50%] w-full">
            <div className="bg-white rounded-3xl shadow-xl border border-[#E8E5DE] overflow-hidden">
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-[#E8E5DE] bg-[#FAFAF8] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#9B8EC4]/15 flex items-center justify-center">
                    <span className="text-base font-bold text-[#9B8EC4]">D</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#1a1a1a]">Daan</div>
                    <div className="text-xs text-[#7EB5A6]">Online</div>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#7EB5A6] animate-pulse" />
              </div>

              {/* Chat messages */}
              <div className="p-6 space-y-4 min-h-[200px]">
                <div className="flex justify-end">
                  <div className="bg-[#1a1a1a] text-white rounded-2xl rounded-br-md px-4 py-3 text-sm max-w-[80%]">
                    {conversations[activeChat].question}
                  </div>
                </div>
                {isTyping ? (
                  <div className="flex justify-start">
                    <div className="bg-bg-subtle rounded-2xl rounded-bl-md px-5 py-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-[#bbb] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                ) : showAnswer ? (
                  <div className="flex justify-start">
                    <div className="bg-bg-subtle text-[#1a1a1a] rounded-2xl rounded-bl-md px-4 py-3 text-sm max-w-[85%] leading-relaxed whitespace-pre-line">
                      {conversations[activeChat].answer.split('**').map((part, i) =>
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Suggestion chips */}
              <div className="px-6 pb-5 border-t border-[#E8E5DE] pt-4">
                <div className="text-2xs text-[#bbb] uppercase tracking-widest mb-2.5 font-semibold">Probeer een vraag</div>
                <div className="flex flex-wrap gap-2">
                  {conversations.map((conv, i) => (
                    <button
                      key={i}
                      onClick={() => switchChat(i)}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-300 ${
                        i === activeChat
                          ? 'bg-[#9B8EC4]/15 text-[#9B8EC4] border border-[#9B8EC4]/25'
                          : 'bg-bg-subtle border border-[#E8E5DE] text-[#777] hover:border-[#9B8EC4]/30'
                      }`}
                    >
                      {conv.icon}
                      {conv.question.length > 28 ? conv.question.slice(0, 28) + '…' : conv.question}
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
// STATS — Dark section
// ═══════════════════════════════════════════════════════════

function StatsSection() {
  const fadeRef = useFadeUp()
  const { ref: countRef, isVisible: countVisible } = useInView(0.3)
  const stat1 = useCountUp(49, 1500, countVisible)
  const stat2 = useCountUp(14, 1500, countVisible)
  const stat3 = useCountUp(30, 1500, countVisible)

  return (
    <section className="bg-[#1a1a1a] py-20 md:py-28 relative overflow-hidden" ref={fadeRef}>
      {/* Subtle orbs on dark bg */}
      <div className="lf-orb absolute top-0 left-[10%] w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${COLORS.coral}10, transparent 70%)` }} />
      <div className="lf-orb-slow absolute bottom-0 right-[15%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${COLORS.purple}08, transparent 70%)` }} />

      <div className="max-w-6xl mx-auto px-6 lg:px-10 relative z-10" ref={countRef}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 text-center">
          <div className="lf-fade-up">
            <div className="text-[56px] md:text-[72px] font-extrabold text-white leading-none font-outfit">
              €{stat1}
            </div>
            <div className="text-white/40 text-sm mt-2 font-medium">per maand — alles inbegrepen</div>
          </div>
          <div className="lf-fade-up lf-delay-1">
            <div className="text-[56px] md:text-[72px] font-extrabold text-white leading-none font-outfit">
              {stat2}
            </div>
            <div className="text-white/40 text-sm mt-2 font-medium">features — van offerte tot factuur</div>
          </div>
          <div className="lf-fade-up lf-delay-2">
            <div className="text-[56px] md:text-[72px] font-extrabold text-white leading-none font-outfit">
              {stat3}
            </div>
            <div className="text-white/40 text-sm mt-2 font-medium">dagen gratis proberen</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// PRICING — Single plan, €49/maand
// ═══════════════════════════════════════════════════════════

function PricingSection() {
  const fadeRef = useFadeUp()
  const { ref: priceRef, isVisible: priceVisible } = useInView(0.3)
  const priceValue = useCountUp(49, 1500, priceVisible)

  return (
    <section id="prijzen" className="lf-section bg-[#FAFAF8] py-24 md:py-36" ref={fadeRef}>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
        <p className="lf-fade-up text-sm font-semibold text-[#C4A882] uppercase tracking-widest mb-4">
          Eenvoudige prijzen
        </p>
        <h2 className="lf-fade-up lf-delay-1 text-[32px] md:text-[48px] font-extrabold text-[#1a1a1a] tracking-tight">
          Eén prijs.{' '}
          <span className="lf-serif-accent font-normal" style={{ color: COLORS.coral }}>
            Alles erin.
          </span>
        </h2>

        {/* Pricing card */}
        <div className="lf-fade-up lf-delay-2 mt-14 bg-white rounded-3xl border border-[#E8E5DE] p-8 md:p-12 shadow-sm max-w-lg mx-auto" ref={priceRef}>
          {/* Price */}
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-[72px] md:text-[96px] font-extrabold text-[#1a1a1a] leading-none lf-price-number">
              €{priceValue}
            </span>
            <span className="text-[20px] text-[#999] font-medium">/maand</span>
          </div>
          <p className="text-[#777] text-base mt-2">
            Per bedrijf. Onbeperkt medewerkers.
          </p>

          {/* Divider */}
          <div className="border-t border-[#E8E5DE] my-8" />

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-left">
            {PRICING_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#7EB5A6] shrink-0" />
                <span className="text-sm text-[#555]">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-8 py-4 rounded-full text-[16px] font-semibold hover:bg-[#333] transition-all duration-300 hover:shadow-xl hover:shadow-black/10"
            >
              Start 30 dagen gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-sm text-[#bbb] mt-3">Geen creditcard nodig</p>
          </div>
        </div>

        {/* AI badge */}
        <div className="lf-fade-up lf-delay-3 mt-6 inline-flex items-center gap-2 text-sm text-[#9B8EC4] font-medium">
          <Sparkles className="w-4 h-4" />
          Inclusief AI Signing Visualizer & Daan AI
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// FAQ — Accordion
// ═══════════════════════════════════════════════════════════

function FAQItem({ item, isOpen, onToggle }: { item: typeof FAQ_ITEMS[0]; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-[#E8E5DE]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-[16px] md:text-[17px] font-semibold text-[#1a1a1a] pr-8 group-hover:text-[#E8866A] transition-colors">
          {item.q}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#999] shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div className={`lf-accordion-content ${isOpen ? 'is-open' : ''}`}>
        <div className="lf-accordion-inner">
          <p className="text-[15px] text-[#777] leading-relaxed pb-6">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0)
  const fadeRef = useFadeUp()

  return (
    <section id="faq" className="lf-section bg-white py-24 md:py-36" ref={fadeRef}>
      <div className="max-w-3xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <p className="lf-fade-up text-sm font-semibold text-[#C4A882] uppercase tracking-widest mb-4">
            FAQ
          </p>
          <h2 className="lf-fade-up lf-delay-1 text-[32px] md:text-[48px] font-extrabold text-[#1a1a1a] tracking-tight">
            Veelgestelde{' '}
            <span className="lf-serif-accent font-normal" style={{ color: COLORS.sage }}>
              vragen
            </span>
          </h2>
        </div>

        <div className="lf-fade-up lf-delay-2">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
// CTA + FOOTER
// ═══════════════════════════════════════════════════════════

function CTAFooter() {
  const fadeRef = useFadeUp()

  return (
    <footer ref={fadeRef}>
      {/* CTA */}
      <div className="bg-[#1a1a1a] py-24 md:py-32 text-center text-white relative overflow-hidden">
        {/* Gradient orbs on dark */}
        <div className="lf-orb absolute top-10 left-[10%] w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${COLORS.coral}12, transparent 70%)` }} />
        <div className="lf-orb-slow absolute bottom-10 right-[15%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${COLORS.purple}10, transparent 70%)` }} />

        <div className="max-w-3xl mx-auto px-6 lg:px-10 relative z-10">
          <h2 className="lf-fade-up text-[36px] md:text-[52px] font-extrabold tracking-tight">
            Klaar om te{' '}
            <span className="lf-serif-accent font-normal" style={{ color: COLORS.coral }}>
              beginnen?
            </span>
          </h2>
          <p className="lf-fade-up lf-delay-1 text-white/50 mt-4 text-lg">
            30 dagen gratis. Geen creditcard. Direct aan de slag.
          </p>
          <div className="lf-fade-up lf-delay-2 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group bg-white text-[#1a1a1a] px-8 py-4 rounded-full text-[16px] font-semibold hover:bg-gray-100 transition-all duration-300 hover:shadow-xl hover:shadow-white/10 flex items-center gap-2"
            >
              Start gratis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="https://wa.me/31612345678"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 text-white px-8 py-4 rounded-full text-[16px] font-semibold hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
          </div>
          <div className="lf-fade-up lf-delay-3 flex flex-wrap justify-center gap-3 mt-10">
            {['Offertes', 'Planning', 'Werkbonnen', 'Facturen', 'AI Visualizer', 'Daan AI'].map((tag) => (
              <span key={tag} className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/40 font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#141414] py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.coral}, ${COLORS.sage})`,
                  }}
                >
                  D
                </div>
                <span className="font-black text-white text-lg">Doen.</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed">
                Door vakmensen, voor vakmensen.
              </p>
              <p className="text-xs text-white/25 mt-2">Gebouwd in Enkhuizen</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'Prijzen', 'AI Tools', 'Updates'].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bedrijf */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Bedrijf</h4>
              <ul className="space-y-2.5">
                {['Over ons', 'Contact', 'Partners'].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Support</h4>
              <ul className="space-y-2.5">
                {['Helpcentrum', 'Documentatie', 'Privacy'].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-6">
            <p className="text-xs text-white/25 text-center">
              © 2026 Doen. Alle rechten voorbehouden.
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
      className={`fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-[#1a1a1a] text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-[#333] ${
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
// MAIN LANDING PAGE
// ═══════════════════════════════════════════════════════════

export default function LandingPage() {
  return (
    <div className="landing-noise bg-[#FAFAF8] font-sans antialiased">
      <Navbar />
      <Hero />
      <ThreeIcons />
      <HowItWorksSection />
      <ForgieSection />
      <StatsSection />
      <PricingSection />
      <FAQSection />
      <CTAFooter />
      <BackToTop />
    </div>
  )
}
