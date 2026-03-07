import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Users, Receipt, FolderOpen,
  ArrowRight, ArrowUp, Check, Menu, X,
  Phone, ChevronDown, MessageSquare,
  CalendarDays, ClipboardCheck, PenLine, Stamp,
  BarChart3, Clock, Shield, Zap,
  Building2, Wrench, Palette, Lightbulb, Store,
  Star, ChevronLeft, ChevronRight,
} from 'lucide-react'

// ── HOOKS ──

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true) }, { threshold })
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

function useTypewriter(phrases: string[], typingSpeed = 80, pauseMs = 2000) {
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
      }, typingSpeed / 2)
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

// ── STYLES ──

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

html { scroll-behavior: smooth; }
::selection { background: #F0D9D0; }

body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }

/* Noise overlay */
.noise-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
}

/* Scroll reveal */
.reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1); }
.reveal.visible { opacity: 1; transform: translateY(0); }
.reveal-left { opacity: 0; transform: translateX(-40px); transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1); }
.reveal-left.visible { opacity: 1; transform: translateX(0); }
.reveal-right { opacity: 0; transform: translateX(40px); transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1); }
.reveal-right.visible { opacity: 1; transform: translateX(0); }

/* Hero canvas animations */
@keyframes heroFloat1 { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(0deg); } }
@keyframes heroFloat2 { 0%,100% { transform: translateY(0) rotate(1deg); } 50% { transform: translateY(-8px) rotate(-1deg); } }
@keyframes heroFloat3 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
@keyframes heroPop { 0% { opacity:0; transform:scale(.7); } 60% { opacity:1; transform:scale(1.05); } 100% { opacity:1; transform:scale(1); } }
@keyframes heroDash { to { stroke-dashoffset: 0; } }

.hero-card-1 { animation: heroFloat1 6s ease-in-out infinite; }
.hero-card-2 { animation: heroFloat2 5s ease-in-out infinite 0.5s; }
.hero-card-3 { animation: heroFloat3 7s ease-in-out infinite 1s; }
.hero-card-4 { animation: heroPop 0.6s cubic-bezier(.16,1,.3,1) forwards 0.8s; opacity: 0; }
.hero-card-5 { animation: heroPop 0.6s cubic-bezier(.16,1,.3,1) forwards 1.2s; opacity: 0; }

.hero-svg-line { stroke-dasharray: 200; stroke-dashoffset: 200; animation: heroDash 1.5s ease forwards 1.5s; }

/* Marquee */
@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
.marquee-track { animation: marquee 30s linear infinite; }
.marquee-track:hover { animation-play-state: paused; }

/* Feature hover effects */
.feature-row { transition: background-color 0.3s ease, transform 0.2s ease; }
.feature-row:hover { transform: translateX(4px); }

/* Signature SVG draw */
.sig-path { stroke-dasharray: 300; stroke-dashoffset: 300; transition: stroke-dashoffset 1.2s ease; }
.sig-draw .sig-path { stroke-dashoffset: 0; }

/* Stamp animation */
@keyframes stampDrop { 0% { opacity:0; transform:scale(2) rotate(-20deg); } 100% { opacity:1; transform:scale(1) rotate(0deg); } }

/* Counter pulse */
@keyframes pulse-ring { 0% { transform:scale(1); opacity:0.4; } 100% { transform:scale(1.4); opacity:0; } }

/* Wave separator */
.wave-sep { position: relative; }
.wave-sep::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0; right: 0;
  height: 60px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 60'%3E%3Cpath fill='%23ffffff' d='M0,40 C360,80 720,0 1440,40 L1440,60 L0,60 Z'/%3E%3C/svg%3E") no-repeat center;
  background-size: cover;
}

/* Cursor blink */
@keyframes blink { 0%,50% { opacity:1; } 51%,100% { opacity:0; } }
.cursor-blink { animation: blink 1s step-end infinite; }

/* Price slider custom */
input[type="range"].price-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #E5E7EB;
  outline: none;
}
input[type="range"].price-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1a1a1a;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
input[type="range"].price-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1a1a1a;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
`

// ── DATA ──

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Hoe het werkt', href: '#how-it-works' },
  { label: 'Prijzen', href: '#pricing' },
]

const TYPEWRITER_PHRASES = [
  'van offerte tot factuur.',
  'zonder gedoe.',
  'in \u00e9\u00e9n platform.',
  'voor sign makers.',
]

const INDUSTRIES = [
  { icon: Building2, label: 'Signing bedrijven' },
  { icon: Wrench, label: 'Montage teams' },
  { icon: Palette, label: 'Reclame studios' },
  { icon: Lightbulb, label: 'Lichtreclame' },
  { icon: Store, label: 'Print & sign' },
  { icon: Building2, label: 'Gevelbelettering' },
  { icon: Wrench, label: 'Wrappers' },
  { icon: Palette, label: 'Interieur signing' },
]

const FEATURES = [
  {
    id: 'offertes',
    title: 'Offertes',
    subtitle: 'Professionele offertes in minuten',
    description: 'Stel offertes samen met je eigen producten, bereken marges automatisch en verstuur als PDF.',
    icon: FileText,
    color: '#F0D9D0',
    deepColor: '#C49585',
  },
  {
    id: 'planning',
    title: 'Planning',
    subtitle: 'Visuele projectplanning',
    description: 'Sleep projecten op je timeline, wijs teams toe en houd deadlines bij in een overzichtelijk bord.',
    icon: CalendarDays,
    color: '#C8D5CC',
    deepColor: '#5A8264',
  },
  {
    id: 'werkbonnen',
    title: 'Werkbonnen',
    subtitle: 'Digitale werkbonnen met handtekening',
    description: 'Monteurs tekenen af op locatie. Foto\'s, notities en uren worden automatisch gekoppeld.',
    icon: ClipboardCheck,
    color: '#CDD5DE',
    deepColor: '#5D7A93',
  },
  {
    id: 'facturatie',
    title: 'Facturatie',
    subtitle: 'Van werkbon naar factuur in 1 klik',
    description: 'Goedgekeurde werkbonnen worden automatisch facturen. Integratie met je boekhouding.',
    icon: Receipt,
    color: '#EDE8D8',
    deepColor: '#9A8E6E',
  },
]

const STEPS = [
  { num: 1, label: 'Klant vraagt aan', desc: 'Een klant belt, mailt of vult het contactformulier in. Je maakt direct een project aan.', icon: MessageSquare },
  { num: 2, label: 'Offerte versturen', desc: 'Stel een offerte samen uit je productcatalogus. Verstuur als PDF met digitale handtekening.', icon: FileText },
  { num: 3, label: 'Inplannen', desc: 'Sleep het project op je planning. Wijs monteurs toe en plan materiaal in.', icon: CalendarDays },
  { num: 4, label: 'Uitvoeren', desc: 'Monteurs openen de werkbon in de app. Foto\'s, uren en handtekening op locatie.', icon: ClipboardCheck },
  { num: 5, label: 'Factureren', desc: 'Eén klik: werkbon wordt factuur. Automatisch naar je boekhouding.', icon: Receipt },
]

const COMPETITORS = [
  { name: 'Teamleader', base: 50 },
  { name: 'Gripp', base: 70 },
  { name: 'Simplicate', base: 60 },
]

const TESTIMONIALS = [
  {
    quote: 'FORGEdesk heeft onze doorlooptijd gehalveerd. Van offerte tot factuur gaat nu in dagen in plaats van weken.',
    name: 'Mark de Vries',
    role: 'Eigenaar, SignPro Utrecht',
    featured: true,
  },
  {
    quote: 'Eindelijk software die snapt hoe een sign bedrijf werkt. Geen overbodige features, alles wat je nodig hebt.',
    name: 'Linda Bakker',
    role: 'Operations Manager, Lichtreclame Zuid',
    featured: false,
  },
  {
    quote: 'De werkbonnen-app is een game changer. Onze monteurs zijn er dol op.',
    name: 'Jan Peters',
    role: 'Projectleider, Wrap Masters',
    featured: false,
  },
]

// ── COMPONENTS ──

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight text-gray-900">
          FORGE<span className="text-gray-400">desk</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">{l.label}</a>
          ))}
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Inloggen</Link>
          <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
            Gratis proberen <ArrowRight className="w-4 h-4" />
          </Link>
        </nav>

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2" aria-label="Menu">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t px-6 py-4 space-y-3">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700">{l.label}</a>
          ))}
          <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700">Inloggen</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)} className="block w-full text-center px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold">
            Gratis proberen
          </Link>
        </div>
      )}
    </header>
  )
}

function HeroSection() {
  const scrollY = useScrollY()
  const typed = useTypewriter(TYPEWRITER_PHRASES, 70, 2200)

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-gray-50 to-white pt-16 wave-sep">
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20">
        {/* Left: Text */}
        <div className="space-y-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blush/40 text-sm font-medium" style={{ color: '#C49585' }}>
            <Zap className="w-3.5 h-3.5" /> Gebouwd voor de sign industry
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.08] tracking-tight">
            Alles voor je sign bedrijf,{' '}
            <span className="block text-gray-400">
              {typed}
              <span className="cursor-blink text-gray-300">|</span>
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-md leading-relaxed">
            De enige tool die je hele workflow verbindt. Van eerste klantcontact tot laatste factuur.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/register" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-all hover:shadow-lg hover:shadow-gray-900/20">
              Start gratis <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
              Bekijk features <ChevronDown className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs text-gray-400 pt-1">Geen creditcard nodig. 14 dagen gratis.</p>
        </div>

        {/* Right: Workshop Canvas */}
        <div className="relative h-[480px] lg:h-[520px]" style={{ transform: `translateY(${scrollY * -0.08}px)` }}>
          {/* SVG connection lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 500" fill="none">
            <path d="M 120 140 Q 200 100 280 160" stroke="#E5E7EB" strokeWidth="2" className="hero-svg-line" />
            <path d="M 280 200 Q 340 260 300 340" stroke="#E5E7EB" strokeWidth="2" className="hero-svg-line" style={{ animationDelay: '1.8s' }} />
            <path d="M 260 340 Q 180 380 140 320" stroke="#E5E7EB" strokeWidth="2" className="hero-svg-line" style={{ animationDelay: '2.1s' }} />
          </svg>

          {/* Card 1: Offerte */}
          <div className="hero-card-1 absolute top-[10%] left-[5%] w-48 bg-white rounded-2xl shadow-lg shadow-gray-200/60 p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F0D9D0' }}>
                <FileText className="w-3.5 h-3.5" style={{ color: '#C49585' }} />
              </div>
              <span className="text-xs font-semibold text-gray-700">Offerte #247</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 bg-gray-100 rounded-full w-full" />
              <div className="h-2 bg-gray-100 rounded-full w-3/4" />
              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-gray-400">3 regels</span>
                <span className="text-xs font-bold text-gray-900">&euro;4.250</span>
              </div>
            </div>
          </div>

          {/* Card 2: Planning */}
          <div className="hero-card-2 absolute top-[8%] right-[8%] w-52 bg-white rounded-2xl shadow-lg shadow-gray-200/60 p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#C8D5CC' }}>
                <CalendarDays className="w-3.5 h-3.5" style={{ color: '#5A8264' }} />
              </div>
              <span className="text-xs font-semibold text-gray-700">Week 12</span>
            </div>
            <div className="space-y-2">
              <div className="h-5 rounded-md w-[80%]" style={{ background: '#F0D9D0' }} />
              <div className="h-5 rounded-md w-[60%] ml-[20%]" style={{ background: '#CDD5DE' }} />
              <div className="h-5 rounded-md w-[70%] ml-[10%]" style={{ background: '#C8D5CC' }} />
            </div>
          </div>

          {/* Card 3: Werkbon */}
          <div className="hero-card-3 absolute bottom-[20%] left-[8%] w-44 bg-white rounded-2xl shadow-lg shadow-gray-200/60 p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#CDD5DE' }}>
                <ClipboardCheck className="w-3.5 h-3.5" style={{ color: '#5D7A93' }} />
              </div>
              <span className="text-xs font-semibold text-gray-700">Werkbon</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-[10px] text-gray-500">Getekend</span>
            </div>
          </div>

          {/* Card 4: Status badge */}
          <div className="hero-card-4 absolute bottom-[15%] right-[12%] bg-white rounded-xl shadow-lg shadow-gray-200/60 px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs font-medium text-gray-700">3 projecten actief</span>
            </div>
          </div>

          {/* Card 5: Revenue pop */}
          <div className="hero-card-5 absolute top-[45%] right-[4%] bg-white rounded-xl shadow-lg shadow-gray-200/60 px-4 py-3 border border-gray-100">
            <div className="text-[10px] text-gray-400 mb-0.5">Deze maand</div>
            <div className="text-lg font-bold text-gray-900">&euro;12.480</div>
            <div className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-green-500" />
              <span className="text-[10px] text-green-600 font-medium">+23%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SocialProof() {
  return (
    <section className="py-6 bg-white border-y border-gray-100 overflow-hidden">
      <div className="marquee-track flex items-center gap-12 whitespace-nowrap" style={{ width: 'max-content' }}>
        {[...INDUSTRIES, ...INDUSTRIES].map((ind, i) => (
          <div key={i} className="flex items-center gap-2 text-gray-400 px-4">
            <ind.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{ind.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeaturesSection() {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)
  const { ref, isVisible } = useInView(0.1)

  return (
    <section id="features" className="py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={`max-w-2xl mb-16 reveal ${isVisible ? 'visible' : ''}`}>
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#5A8264' }}>Features</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3 leading-tight">
            Eén platform,<br />vier superkrachten.
          </h2>
          <p className="text-gray-500 mt-4 text-lg">Geen losse tools meer. Alles wat je sign bedrijf nodig heeft, naadloos verbonden.</p>
        </div>

        <div className="space-y-4">
          {FEATURES.map((feature, i) => {
            const isHovered = hoveredFeature === feature.id
            const Icon = feature.icon
            return (
              <div
                key={feature.id}
                className={`feature-row rounded-2xl border border-gray-100 overflow-hidden transition-all duration-500 reveal ${isVisible ? 'visible' : ''}`}
                style={{ transitionDelay: `${i * 100}ms`, backgroundColor: isHovered ? feature.color + '20' : 'transparent' }}
                onMouseEnter={() => setHoveredFeature(feature.id)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 lg:p-8 items-center">
                  {/* Icon + Title */}
                  <div className="lg:col-span-2 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300" style={{ background: feature.color, transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}>
                      <Icon className="w-5 h-5" style={{ color: feature.deepColor }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-500">{feature.subtitle}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="lg:col-span-2">
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>

                  {/* Mini preview */}
                  <div className="lg:col-span-1 flex justify-end">
                    <div className={`w-full max-w-[200px] h-28 rounded-xl border border-gray-100 overflow-hidden transition-all duration-500 ${isHovered ? 'shadow-lg' : 'shadow-sm'}`} style={{ background: feature.color + '30' }}>
                      {feature.id === 'offertes' && (
                        <div className="p-3 space-y-2">
                          {[1,2,3].map(r => (
                            <div key={r} className={`flex justify-between items-center transition-all duration-300 ${isHovered ? 'bg-white/70 px-2 py-1 rounded-md' : ''}`}>
                              <div className="h-2 bg-gray-200 rounded-full" style={{ width: `${50 + r * 10}%` }} />
                              <span className="text-[9px] text-gray-400">&euro;{r * 850}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.id === 'planning' && (
                        <div className="p-3 space-y-1.5">
                          {['#F0D9D0','#CDD5DE','#C8D5CC'].map((c, j) => (
                            <div
                              key={j}
                              className="h-5 rounded-md transition-all duration-500"
                              style={{
                                background: c,
                                width: `${60 + j * 10}%`,
                                marginLeft: isHovered ? `${j * 12}%` : `${j * 8}%`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {feature.id === 'werkbonnen' && (
                        <div className={`p-3 flex flex-col items-center justify-center h-full sig-draw-container ${isHovered ? 'sig-draw' : ''}`}>
                          <svg viewBox="0 0 100 40" className="w-20 h-8">
                            <path d="M 10 30 Q 25 5 40 25 Q 55 40 70 15 Q 80 5 90 20" fill="none" stroke="#5D7A93" strokeWidth="2" strokeLinecap="round" className="sig-path" />
                          </svg>
                          <span className="text-[9px] text-gray-400 mt-1">{isHovered ? 'Getekend!' : 'Teken hier'}</span>
                        </div>
                      )}
                      {feature.id === 'facturatie' && (
                        <div className="p-3 flex flex-col items-center justify-center h-full relative">
                          <Receipt className="w-8 h-8 text-gray-300" />
                          {isHovered && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'stampDrop 0.4s cubic-bezier(.16,1,.3,1) forwards' }}>
                              <div className="w-14 h-14 rounded-full border-3 flex items-center justify-center rotate-[-10deg]" style={{ borderColor: '#5A8264', borderWidth: '3px' }}>
                                <Check className="w-6 h-6" style={{ color: '#5A8264' }} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0)
  const { ref, isVisible } = useInView(0.1)

  return (
    <section id="how-it-works" className="py-28 bg-gray-50" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={`text-center max-w-2xl mx-auto mb-16 reveal ${isVisible ? 'visible' : ''}`}>
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#5D7A93' }}>Hoe het werkt</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3">
            Van eerste contact<br />tot laatste factuur.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Steps */}
          <div className={`space-y-2 reveal-left ${isVisible ? 'visible' : ''}`}>
            {STEPS.map((step, i) => {
              const active = activeStep === i
              const Icon = step.icon
              return (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-start gap-4 ${active ? 'bg-white shadow-md' : 'hover:bg-white/50'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${active ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <span className="text-sm font-bold">{step.num}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 transition-colors ${active ? 'text-gray-900' : 'text-gray-400'}`} />
                      <h3 className={`font-bold transition-colors ${active ? 'text-gray-900' : 'text-gray-500'}`}>{step.label}</h3>
                    </div>
                    {active && (
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{step.desc}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Preview */}
          <div className={`reveal-right ${isVisible ? 'visible' : ''}`}>
            <div className="bg-white rounded-2xl shadow-lg p-8 min-h-[340px] flex flex-col justify-center border border-gray-100">
              {activeStep === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blush flex items-center justify-center">
                      <Phone className="w-4 h-4" style={{ color: '#C49585' }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Inkomend verzoek</div>
                      <div className="text-xs text-gray-400">vandaag, 09:15</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-600">
                      &quot;Wij zoeken een partner voor onze nieuwe gevelbelettering. Kunnen jullie een offerte maken?&quot;
                    </div>
                    <div className="text-xs text-gray-400 mt-2">- Bakkerij Van Dijk</div>
                  </div>
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium">
                    Project aanmaken <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {activeStep === 1 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Offerte #248 - Bakkerij Van Dijk</div>
                  {['Gevelletters RVS - 80cm', 'Montage + bekabeling', 'Lichtbak boven deur'].map((item, j) => (
                    <div key={j} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{item}</span>
                      <span className="text-sm font-semibold text-gray-900">&euro;{[2400, 850, 1200][j]}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-semibold text-gray-900">Totaal</span>
                    <span className="font-bold text-gray-900">&euro;4.450</span>
                  </div>
                </div>
              )}
              {activeStep === 2 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Planning - Week 14</div>
                  {['Ma: Productie gevelletters', 'Di-Wo: Lichtbak assemblage', 'Do: Montage op locatie'].map((item, j) => (
                    <div key={j} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: [('#F0D9D0' + '30'), ('#CDD5DE' + '30'), ('#C8D5CC' + '30')][j] }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: ['#C49585', '#5D7A93', '#5A8264'][j] }} />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-gray-700">Werkbon #186 - Montage</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-100 rounded-xl h-20 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Foto 1</span>
                    </div>
                    <div className="bg-gray-100 rounded-xl h-20 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Foto 2</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">6.5 uur</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">Getekend</span>
                    </div>
                  </div>
                </div>
              )}
              {activeStep === 4 && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-sage/30 flex items-center justify-center mx-auto">
                    <Receipt className="w-7 h-7" style={{ color: '#5A8264' }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-700">Factuur #F-2024-186</div>
                    <div className="text-3xl font-extrabold text-gray-900 mt-1">&euro;4.450</div>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                    <Check className="w-4 h-4" /> Verzonden naar boekhouding
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const { ref, isVisible } = useInView(0.1)
  const price = useCountUp(49, 1500, isVisible)
  const [userCount, setUserCount] = useState(5)

  const forgePrice = 49
  const competitorPrices = COMPETITORS.map(c => ({
    ...c,
    total: Math.round(c.base * userCount * 0.8),
  }))

  return (
    <section id="pricing" className="py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={`text-center max-w-2xl mx-auto mb-16 reveal ${isVisible ? 'visible' : ''}`}>
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#C49585' }}>Prijzen</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3">
            Simpel. Eerlijk. Betaalbaar.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Price card */}
          <div className={`reveal-left ${isVisible ? 'visible' : ''}`}>
            <div className="bg-gray-900 text-white rounded-3xl p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="text-sm font-medium text-gray-400 mb-1">Alles-in-&eacute;&eacute;n</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-extrabold">&euro;{price}</span>
                  <span className="text-gray-400 text-lg">/maand</span>
                </div>
                <p className="text-gray-400 mt-3 text-sm">Per bedrijf. Onbeperkt gebruikers.</p>

                <div className="mt-8 space-y-3">
                  {['Onbeperkt offertes & facturen', 'Planning & werkbonnen', 'Onbeperkt gebruikers', 'Klantportaal', 'Mobiele app voor monteurs', 'Persoonlijke onboarding'].map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <span className="text-sm text-gray-300">{f}</span>
                    </div>
                  ))}
                </div>

                <Link to="/register" className="mt-8 w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-gray-900 font-bold hover:bg-gray-100 transition-colors">
                  Start 14 dagen gratis <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Comparison slider */}
          <div className={`reveal-right ${isVisible ? 'visible' : ''}`}>
            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Vergelijk met de rest</h3>
              <p className="text-sm text-gray-500 mb-6">Sleep de slider om te zien hoeveel je bespaart.</p>

              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Aantal gebruikers</span>
                  <span className="font-bold text-gray-900">{userCount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={userCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserCount(Number(e.target.value))}
                  className="price-slider w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>20</span>
                </div>
              </div>

              <div className="space-y-3">
                {competitorPrices.map(cp => (
                  <div key={cp.name} className="flex items-center justify-between p-3 bg-white rounded-xl">
                    <span className="text-sm text-gray-600">{cp.name}</span>
                    <span className="text-sm font-semibold text-gray-400 line-through">&euro;{cp.total}/mo</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl">
                  <span className="text-sm text-white font-semibold">FORGEdesk</span>
                  <span className="text-lg text-white font-extrabold">&euro;{forgePrice}/mo</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4 text-center">
                Bespaar tot &euro;{Math.max(...competitorPrices.map(c => c.total)) - forgePrice}/maand
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const { ref, isVisible } = useInView(0.1)
  const featured = TESTIMONIALS.find(t => t.featured)
  const others = TESTIMONIALS.filter(t => !t.featured)

  return (
    <section className="py-28 bg-gray-50" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={`text-center max-w-2xl mx-auto mb-16 reveal ${isVisible ? 'visible' : ''}`}>
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#9A8E6E' }}>Klanten</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-3">
            Wat sign makers zeggen.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Featured testimonial */}
          {featured && (
            <div className={`lg:col-span-2 rounded-2xl p-10 reveal-left ${isVisible ? 'visible' : ''}`} style={{ background: '#F0D9D0' + '30' }}>
              <div className="flex items-start gap-1 mb-6">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug mb-8">
                &ldquo;{featured.quote}&rdquo;
              </blockquote>
              <div>
                <div className="font-semibold text-gray-900">{featured.name}</div>
                <div className="text-sm text-gray-500">{featured.role}</div>
              </div>
            </div>
          )}

          {/* Side testimonials */}
          <div className={`space-y-6 reveal-right ${isVisible ? 'visible' : ''}`}>
            {others.map((t, i) => (
              <div key={i} className="rounded-2xl p-6" style={{ background: ['#C8D5CC' + '30', '#CDD5DE' + '30'][i] }}>
                <div className="flex items-start gap-1 mb-3">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-sm font-medium text-gray-800 leading-relaxed mb-4">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-500">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-28 bg-gray-900">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
          Klaar om je sign bedrijf<br />naar het volgende level te tillen?
        </h2>
        <p className="text-gray-400 mt-4 text-lg max-w-xl mx-auto">
          Start vandaag met FORGEdesk. Geen creditcard nodig, geen verplichtingen.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-gray-900 font-bold text-lg hover:bg-gray-100 transition-all hover:shadow-xl hover:shadow-white/10">
            Start gratis <ArrowRight className="w-5 h-5" />
          </Link>
          <a href="#features" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 transition-colors">
            Meer ontdekken
          </a>
        </div>
        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> 14 dagen gratis</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Geen creditcard</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Direct starten</span>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <Link to="/" className="text-xl font-bold text-white">
              FORGE<span className="text-gray-500">desk</span>
            </Link>
            <p className="text-sm mt-3 text-gray-500 leading-relaxed">
              De alles-in-&eacute;&eacute;n tool voor sign bedrijven. Van offerte tot factuur.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Prijzen</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Hoe het werkt</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Bedrijf</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-500">Over ons</span></li>
              <li><span className="text-gray-500">Contact</span></li>
              <li><span className="text-gray-500">Blog</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-500">Privacy</span></li>
              <li><span className="text-gray-500">Voorwaarden</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-sm text-gray-600">&copy; {new Date().getFullYear()} FORGEdesk. Alle rechten voorbehouden.</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
            aria-label="Terug naar boven"
          >
            <ArrowUp className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </footer>
  )
}

// ── MAIN PAGE ──

export default function LandingPage() {
  return (
    <div className="bg-white text-gray-900 antialiased">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="noise-overlay" />
      <Header />
      <HeroSection />
      <SocialProof />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  )
}
