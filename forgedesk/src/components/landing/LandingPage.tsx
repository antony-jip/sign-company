import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Users, Receipt, FolderOpen,
  ArrowRight, ArrowUp, Check, Menu, X,
  Phone, ChevronDown, MessageSquare,
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

// ── CSS-IN-JS STYLES ──
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

html { scroll-behavior: smooth; }
::selection { background: #F0D9D0; }

/* Hero card staggered animations */
@keyframes heroFadeIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes heroPop {
  0% { opacity: 0; transform: scale(0.8); }
  70% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes heroFadeSimple {
  from { opacity: 0; }
  to { opacity: 1; }
}
.hero-card-1 { animation: heroFadeSimple 0.6s ease-out 0s both; }
.hero-card-2 { animation: heroFadeIn 0.6s ease-out 0.5s both; }
.hero-card-3 { animation: heroPop 0.5s ease-out 1.2s both; }
.hero-card-4 { animation: heroFadeIn 0.6s ease-out 1.8s both; }
.hero-card-5 { animation: heroFadeIn 0.6s ease-out 2.4s both; }
.hero-card-6 { animation: heroFadeIn 0.6s ease-out 2.0s both; }

/* SVG line draw */
@keyframes drawLine {
  from { stroke-dashoffset: 1000; }
  to { stroke-dashoffset: 0; }
}
.draw-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 3s ease-out 0.3s both;
}

/* Chain fill */
.chain-line-fill {
  stroke-dasharray: 800;
  stroke-dashoffset: 800;
  transition: stroke-dashoffset 2s ease-out;
}
.chain-line-fill.visible {
  stroke-dashoffset: 0;
}

/* Bounce chevron */
@keyframes bounceChevron {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}
.bounce-slow { animation: bounceChevron 2s ease-in-out infinite; }

/* Scroll reveal */
.reveal-up { opacity: 0; transform: translateY(24px); }
.reveal-left { opacity: 0; transform: translateX(-40px); }
.reveal-right { opacity: 0; transform: translateX(40px); }
.reveal-scale { opacity: 0; transform: scale(0.95); }
.revealed { opacity: 1 !important; transform: none !important; transition: all 0.7s cubic-bezier(0.22,1,0.36,1); }
.reveal-delay-1 { transition-delay: 0.1s; }
.reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; }
.reveal-delay-4 { transition-delay: 0.4s; }
.reveal-delay-5 { transition-delay: 0.5s; }
.reveal-delay-6 { transition-delay: 0.6s; }

/* Nav link underline */
.nav-link { position: relative; }
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1.5px;
  background: #1A1A1A;
  transition: width 0.3s ease;
}
.nav-link:hover::after { width: 100%; }

/* Focus visible */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px #C49585;
}

/* Gradient text */
.text-gradient-forge {
  background: linear-gradient(135deg, #F0D9D0 0%, #C49585 30%, #1A1A1A 70%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Mobile hero scroll strip */
.hero-scroll-strip {
  display: flex;
  overflow-x: auto;
  gap: 1rem;
  padding: 1rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.hero-scroll-strip::-webkit-scrollbar { display: none; }
`

// ── NAVBAR ──
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const links = [
    { label: 'Features', id: 'features' },
    { label: 'Hoe het werkt', id: 'hoe-het-werkt' },
    { label: 'Prijzen', id: 'prijzen' },
    { label: 'Reviews', id: 'reviews' },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#FAFAF7]/90 backdrop-blur-xl border-b border-[#E8E6E0] shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #C49585, #5A8264)', fontFamily: 'Manrope, sans-serif' }}>
              F
            </div>
            <span className="text-[17px] font-bold text-[#1A1A1A] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              FORGEdesk
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {links.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="nav-link px-4 py-2 text-[14px] text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-[14px] text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Inloggen
            </Link>
            <Link to="/register" className="px-6 py-2.5 text-[14px] font-semibold text-white bg-[#0A0A0A] rounded-[12px] hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Gratis starten →
            </Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-[#1A1A1A]">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#FAFAF7]/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center gap-6">
          {links.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-[28px] font-bold text-[#1A1A1A] hover:text-[#C49585] transition-colors"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {item.label}
            </button>
          ))}
          <div className="flex flex-col gap-4 mt-8 w-64">
            <Link to="/login" onClick={() => setMobileOpen(false)}
              className="px-6 py-3 text-center text-[16px] text-[#1A1A1A] border-2 border-[#E8E6E0] rounded-[14px]"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Inloggen
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}
              className="px-6 py-3 text-center text-[16px] font-semibold text-white bg-[#0A0A0A] rounded-[14px]"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Gratis starten →
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── HERO — Workshop Canvas ──
function Hero() {
  const { ref, isVisible } = useInView(0.05)
  const scrollY = useScrollY()

  const parallaxStyle = {
    transform: `translateY(${scrollY * 0.3}px)`,
    opacity: Math.max(0, 1 - scrollY / 600),
  }

  return (
    <section ref={ref} className="relative min-h-screen bg-[#FAFAF7] overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">

          {/* LEFT — Text */}
          <div className="lg:w-[38%] flex-shrink-0 mb-10 lg:mb-0 lg:pt-8">
            <div className="mb-6">
              <span className="text-xl font-bold tracking-tight text-[#1A1A1A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                FORGEdesk
              </span>
              <p className="text-lg text-[#6B6B6B] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                Je hele werkproces. Een app.
              </p>
            </div>

            <h1 className="text-[40px] lg:text-[48px] font-black tracking-tight leading-[1.1] max-w-md mb-8"
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              <span className="text-gradient-forge">Smeed</span> je bedrijf tot een geoliede machine.
            </h1>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Link to="/register"
                className="inline-flex items-center justify-center bg-[#0A0A0A] hover:bg-[#222] text-white font-bold px-10 py-5 rounded-[14px] text-[17px] transition-all hover:-translate-y-0.5"
                style={{ fontFamily: 'Inter, sans-serif' }}>
                Start 30 dagen gratis <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center text-[#1A1A1A] underline underline-offset-4 font-medium text-base hover:text-[#555] transition-colors py-3"
                style={{ fontFamily: 'Inter, sans-serif' }}>
                Bekijk hoe het werkt
              </button>
            </div>

            <p className="text-sm text-[#A0A0A0] mt-6" style={{ fontFamily: 'Inter, sans-serif' }}>
              Direct aan de slag · Geen creditcard · Onbeperkt medewerkers
            </p>
          </div>

          {/* RIGHT — Workshop Canvas (desktop) */}
          <div className="hidden lg:block lg:w-[62%]">
            <div className="relative bg-[#F4F3F0] rounded-3xl min-h-[520px] p-6" style={parallaxStyle}>
              {/* SVG connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
                <path className="draw-line" d="M 140,95 Q 200,100 260,130" fill="none" stroke="#E8E6E0" strokeWidth="2" strokeDasharray="6,6" opacity="0.4" />
                <path className="draw-line" d="M 380,210 Q 390,240 370,270" fill="none" stroke="#E8E6E0" strokeWidth="2" strokeDasharray="6,6" opacity="0.4" />
                <path className="draw-line" d="M 350,300 Q 300,340 280,360" fill="none" stroke="#E8E6E0" strokeWidth="2" strokeDasharray="6,6" opacity="0.4" />
                <path className="draw-line" d="M 280,420 Q 350,430 420,400" fill="none" stroke="#E8E6E0" strokeWidth="2" strokeDasharray="6,6" opacity="0.4" />
              </svg>

              {/* ELEMENT 1 — Klantkaart */}
              <div className="hero-card-1 absolute top-6 left-6 bg-white rounded-2xl shadow-md p-5 w-[220px] z-10" style={{ borderTop: '3px solid #F0D9D0' }}>
                <p className="font-bold text-[#1A1A1A] text-sm mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Bakkerij Jansen</p>
                <div className="flex items-center gap-2 text-sm text-[#6B6B6B] mb-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span style={{ fontFamily: 'Inter, sans-serif' }}>0228 351960</span>
                </div>
                <p className="text-xs text-[#A0A0A0] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>3 projecten · €12.400 omzet</p>
              </div>

              {/* ELEMENT 2 — Offerte card */}
              <div className="hero-card-2 absolute top-16 left-[260px] bg-white rounded-2xl shadow-md p-5 w-[260px] z-10" style={{ borderTop: '3px solid #C8D5CC' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>OFF-2026-048</p>
                <p className="font-bold text-[#1A1A1A] text-sm mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Lichtreclame voorgevel</p>
                <div className="space-y-1 text-xs text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <div className="flex justify-between"><span>LED module · 8u</span><span>€960</span></div>
                  <div className="flex justify-between"><span>Montage · 4u</span><span>€480</span></div>
                  <div className="flex justify-between"><span>Transport</span><span>€85</span></div>
                </div>
                <div className="border-t border-gray-100 mt-3 pt-2 flex justify-between">
                  <span className="text-xs text-[#A0A0A0]">Totaal</span>
                  <span className="font-bold text-sm text-[#1A1A1A]">€1.525</span>
                </div>
              </div>

              {/* ELEMENT 3 — Goedgekeurd notificatie */}
              <div className="hero-card-3 absolute top-[180px] left-[420px] bg-[#C8D5CC] rounded-xl shadow-lg px-4 py-2 z-20">
                <span className="text-white font-semibold text-sm flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <Check className="w-4 h-4" />
                  Offerte goedgekeurd
                </span>
              </div>

              {/* ELEMENT 4 — Planning blok */}
              <div className="hero-card-4 absolute top-[260px] left-[240px] bg-white rounded-2xl shadow-md p-4 w-[200px] z-10" style={{ borderTop: '3px solid #CDD5DE' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Ma 14 mrt</p>
                <p className="font-bold text-[#1A1A1A] text-sm mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>Montage lichtreclame</p>
                <p className="text-xs text-[#6B6B6B] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Team: Joris, Mark</p>
                <p className="text-xs text-[#A0A0A0]" style={{ fontFamily: 'Inter, sans-serif' }}>09:00 - 14:00</p>
              </div>

              {/* ELEMENT 5 — Factuur mini */}
              <div className="hero-card-5 absolute bottom-6 right-6 bg-white rounded-2xl shadow-md p-4 w-[200px] z-10" style={{ borderTop: '3px solid #EDE8D8' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>F-2026-031</p>
                <p className="font-bold text-[#1A1A1A] text-lg mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>€1.525,00</p>
                <span className="inline-block bg-[#C8D5CC] text-white text-xs font-semibold px-3 py-1 rounded-full" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Betaald
                </span>
              </div>

              {/* ELEMENT 6 — Omzet indicator */}
              <div className="hero-card-6 absolute top-[280px] left-6 rounded-xl p-3 w-[140px] z-10" style={{ background: 'rgba(237,232,216,0.5)' }}>
                <p className="font-bold text-[#1A1A1A] text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>€14.850</p>
                <p className="text-xs font-semibold text-[#5A8264]" style={{ fontFamily: 'Inter, sans-serif' }}>↑ 23%</p>
                <div className="flex items-end gap-1.5 mt-2 h-8">
                  <div className="w-5 rounded-sm" style={{ height: '40%', background: 'rgba(240,217,208,0.6)' }} />
                  <div className="w-5 rounded-sm" style={{ height: '65%', background: 'rgba(200,213,204,0.6)' }} />
                  <div className="w-5 rounded-sm" style={{ height: '50%', background: 'rgba(205,213,222,0.6)' }} />
                  <div className="w-5 rounded-sm" style={{ height: '100%', background: 'rgba(154,142,110,0.4)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE — Horizontal scroll strip */}
          <div className="lg:hidden">
            <div className="hero-scroll-strip -mx-5">
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-5 w-[220px]" style={{ borderTop: '3px solid #F0D9D0' }}>
                <p className="font-bold text-[#1A1A1A] text-sm mb-2">Bakkerij Jansen</p>
                <div className="flex items-center gap-2 text-sm text-[#6B6B6B] mb-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>0228 351960</span>
                </div>
                <p className="text-xs text-[#A0A0A0] mt-2">3 projecten · €12.400 omzet</p>
              </div>
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-5 w-[260px]" style={{ borderTop: '3px solid #C8D5CC' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1">OFF-2026-048</p>
                <p className="font-bold text-[#1A1A1A] text-sm mb-3">Lichtreclame voorgevel</p>
                <div className="space-y-1 text-xs text-[#6B6B6B]">
                  <div className="flex justify-between"><span>LED module · 8u</span><span>€960</span></div>
                  <div className="flex justify-between"><span>Montage · 4u</span><span>€480</span></div>
                  <div className="flex justify-between"><span>Transport</span><span>€85</span></div>
                </div>
                <div className="border-t border-gray-100 mt-3 pt-2 flex justify-between">
                  <span className="text-xs text-[#A0A0A0]">Totaal</span>
                  <span className="font-bold text-sm text-[#1A1A1A]">€1.525</span>
                </div>
              </div>
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-4 w-[200px]" style={{ borderTop: '3px solid #CDD5DE' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1">Ma 14 mrt</p>
                <p className="font-bold text-[#1A1A1A] text-sm mb-1">Montage lichtreclame</p>
                <p className="text-xs text-[#6B6B6B] mb-1">Team: Joris, Mark</p>
                <p className="text-xs text-[#A0A0A0]">09:00 - 14:00</p>
              </div>
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-4 w-[200px]" style={{ borderTop: '3px solid #EDE8D8' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1">F-2026-031</p>
                <p className="font-bold text-[#1A1A1A] text-lg mb-2">€1.525,00</p>
                <span className="inline-block bg-[#C8D5CC] text-white text-xs font-semibold px-3 py-1 rounded-full">Betaald</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="flex justify-center mt-16 lg:mt-12">
          <div className="bounce-slow text-[#A0A0A0]">
            <ChevronDown className="w-6 h-6" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FEATURE 1: OFFERTES ──
function OfferteShowcase() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section id="features" className="py-20 lg:py-32 bg-[#F4F3F0]">
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          <div className="lg:w-[40%] mb-10 lg:mb-0">
            <h2 className={`text-[32px] lg:text-[36px] font-black tracking-tight leading-tight mb-6 reveal-left ${isVisible ? 'revealed' : ''}`}
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              Offertes die indruk maken
            </h2>
            <p className={`text-lg text-[#6B6B6B] leading-relaxed reveal-left ${isVisible ? 'revealed reveal-delay-2' : ''}`}
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Bouw je offerte op met regels, calculaties en materiaallijsten.
              Je klant ziet een strakke <strong className="text-[#1A1A1A]">PDF</strong> — jij ziet je <strong className="text-[#1A1A1A]">marge</strong>.
            </p>
          </div>

          <div className="lg:w-[55%]">
            <div className={`bg-white rounded-2xl shadow-xl p-6 lg:p-8 border border-[#E8E6E0] reveal-right ${isVisible ? 'revealed reveal-delay-1' : ''}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: 'Manrope, sans-serif' }}>Sign Company</p>
                  <p className="text-sm text-[#A0A0A0]" style={{ fontFamily: 'Inter, sans-serif' }}>Enkhuizen</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold">OFF-2026-048</p>
                  <p className="text-sm text-[#6B6B6B]">14 maart 2026</p>
                </div>
              </div>

              <p className="text-sm text-[#6B6B6B] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Klant: <span className="text-[#1A1A1A] font-medium">Bakkerij Jansen</span>
              </p>

              <div className="border-t border-[#E8E6E0]">
                <div className="grid grid-cols-12 gap-2 py-3 text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Omschrijving</div>
                  <div className="col-span-2 text-right">Aantal</div>
                  <div className="col-span-2 text-right">Prijs</div>
                  <div className="col-span-2 text-right">Totaal</div>
                </div>
                {[
                  { nr: '1', desc: 'LED lichtreclame', qty: '1', price: '960,00', total: '960,00' },
                  { nr: '2', desc: 'Montage', qty: '4u', price: '120,00', total: '480,00' },
                  { nr: '3', desc: 'Transport', qty: '1', price: '85,00', total: '85,00' },
                ].map((row) => (
                  <div key={row.nr} className="grid grid-cols-12 gap-2 py-3 text-sm border-b border-[#F4F3F0]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div className="col-span-1 text-[#A0A0A0]">{row.nr}</div>
                    <div className="col-span-5 text-[#1A1A1A]">{row.desc}</div>
                    <div className="col-span-2 text-right text-[#6B6B6B]">{row.qty}</div>
                    <div className="col-span-2 text-right text-[#6B6B6B]">€{row.price}</div>
                    <div className="col-span-2 text-right text-[#1A1A1A]">€{row.total}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col items-end gap-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div className="flex justify-between w-48 text-sm">
                  <span className="text-[#A0A0A0]">Subtotaal</span>
                  <span className="text-[#1A1A1A]">€1.525,00</span>
                </div>
                <div className="flex justify-between w-48 text-sm">
                  <span className="text-[#A0A0A0]">BTW 21%</span>
                  <span className="text-[#1A1A1A]">€320,25</span>
                </div>
                <div className="flex justify-between w-48 text-lg font-bold border-t border-[#E8E6E0] pt-2 mt-1">
                  <span className="text-[#6B6B6B]">Totaal</span>
                  <span className="text-[#1A1A1A]">€1.845,25</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FEATURE 2: PLANNING ──
function PlanningShowcase() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section className="py-20 lg:py-32 bg-white">
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col-reverse lg:flex-row lg:items-center lg:gap-16">
          <div className="lg:w-[55%]">
            <div className={`bg-white rounded-2xl shadow-xl p-6 border border-[#E8E6E0] reveal-left ${isVisible ? 'revealed reveal-delay-1' : ''}`}>
              <div className="space-y-4">
                {[
                  { day: 'Ma 14', color: '#F0D9D0', border: '#F0D9D0', bg: 'rgba(247,236,231,0.5)', title: 'Montage lichtreclame', detail: 'Bakkerij Jansen', time: '09:00 - 14:00' },
                  { day: 'Di 15', color: '#C8D5CC', border: '#C8D5CC', bg: 'rgba(228,235,230,0.5)', title: 'Opmeting gevel', detail: 'Matec Amsterdam', time: '10:00 - 11:30' },
                  { day: 'Wo 16', color: '#CDD5DE', border: '#CDD5DE', bg: 'rgba(230,234,240,0.5)', title: 'Productie', detail: 'intern', time: 'hele dag' },
                ].map((item) => (
                  <div key={item.day} className="flex items-stretch gap-4">
                    <div className="w-16 flex-shrink-0 text-sm font-bold text-[#6B6B6B] pt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {item.day}
                    </div>
                    <div className="flex-1 rounded-xl p-4" style={{ borderLeft: `4px solid ${item.border}`, background: item.bg }}>
                      <p className="font-bold text-[#1A1A1A] text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>{item.title}</p>
                      <p className="text-xs text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>{item.detail} · {item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-[40%] mb-10 lg:mb-0">
            <h2 className={`text-[32px] lg:text-[36px] font-black tracking-tight leading-tight mb-6 reveal-right ${isVisible ? 'revealed' : ''}`}
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              Planning die werkt
            </h2>
            <p className={`text-lg text-[#6B6B6B] leading-relaxed reveal-right ${isVisible ? 'revealed reveal-delay-2' : ''}`}
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Plan montages, wijs teams toe, synchroniseer met je agenda.
              <strong className="text-[#1A1A1A]"> Overzicht</strong> voor kantoor en <strong className="text-[#1A1A1A]">buitendienst</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FEATURE 3: WERKBONNEN ──
function WerkbonnenShowcase() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section className="py-20 lg:py-32 bg-[#F4F3F0]">
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          <div className="lg:w-[40%] mb-10 lg:mb-0">
            <h2 className={`text-[32px] lg:text-[36px] font-black tracking-tight leading-tight mb-6 reveal-left ${isVisible ? 'revealed' : ''}`}
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              Werkbonnen op locatie
            </h2>
            <p className={`text-lg text-[#6B6B6B] leading-relaxed reveal-left ${isVisible ? 'revealed reveal-delay-2' : ''}`}
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Je team vult werkbonnen in op locatie. Met uren, materiaal en <strong className="text-[#1A1A1A]">digitale handtekening</strong>. Direct in het systeem.
            </p>
          </div>

          <div className="lg:w-[55%]">
            <div className={`bg-white rounded-2xl shadow-xl p-6 border border-[#E8E6E0] reveal-right ${isVisible ? 'revealed reveal-delay-1' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>WB-2026-018</p>
                  <p className="font-bold text-[#1A1A1A] mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>Montage lichtreclame</p>
                  <p className="text-sm text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>Bakkerij Jansen · Hoorn</p>
                </div>
              </div>

              <div className="border-t border-[#F4F3F0] pt-4 space-y-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B6B6B]">Arbeid: Joris · 6u</span>
                  <span className="text-[#1A1A1A]">€720</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B6B6B]">Materiaal: LED module</span>
                  <span className="text-[#1A1A1A]">€960</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-[#E8E6E0] pt-3 mt-3">
                  <span>Totaal</span>
                  <span>€1.680</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F4F3F0]">
                <svg className="w-40 h-10 mb-1" viewBox="0 0 160 40">
                  <path
                    d="M 10,30 Q 20,5 40,25 T 70,20 Q 85,15 100,25 T 140,18"
                    fill="none"
                    stroke="#A0A0A0"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="text-xs text-[#A0A0A0]" style={{ fontFamily: 'Inter, sans-serif' }}>Getekend door: K. Jansen</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FEATURE 4: FACTURATIE ──
function FacturatieShowcase() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section className="py-20 lg:py-32 bg-white">
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col-reverse lg:flex-row lg:items-center lg:gap-16">
          <div className="lg:w-[55%]">
            <div className={`relative bg-white rounded-2xl shadow-xl p-6 border border-[#E8E6E0] overflow-hidden reveal-left ${isVisible ? 'revealed reveal-delay-1' : ''}`}>
              {/* BETAALD stamp */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ transform: 'translate(-50%, -50%) rotate(-12deg)' }}>
                <span className="text-3xl font-black text-[#5A8264] tracking-wider" style={{ opacity: 0.2, fontFamily: 'Manrope, sans-serif' }}>BETAALD</span>
              </div>

              <div className="relative z-10" style={{ fontFamily: 'Inter, sans-serif' }}>
                <p className="text-xs text-[#A0A0A0] uppercase tracking-wider font-semibold">F-2026-031</p>
                <p className="font-bold text-[#1A1A1A] text-2xl mt-2 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>€1.845,25</p>

                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-block bg-[#C8D5CC] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Betaald op 18 mrt
                  </span>
                </div>

                <div className="border-t border-[#F4F3F0] pt-4 space-y-2 text-sm text-[#6B6B6B]">
                  <div className="flex justify-between">
                    <span>Bakkerij Jansen</span>
                    <span className="text-[#1A1A1A]">Hoorn</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lichtreclame voorgevel</span>
                    <span className="text-[#1A1A1A]">€1.525,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTW 21%</span>
                    <span className="text-[#1A1A1A]">€320,25</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-[40%] mb-10 lg:mb-0">
            <h2 className={`text-[32px] lg:text-[36px] font-black tracking-tight leading-tight mb-6 reveal-right ${isVisible ? 'revealed' : ''}`}
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              Facturatie zonder gedoe
            </h2>
            <p className={`text-lg text-[#6B6B6B] leading-relaxed reveal-right ${isVisible ? 'revealed reveal-delay-2' : ''}`}
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Factureer direct vanuit je projecten. Automatische <strong className="text-[#1A1A1A]">herinneringen</strong>,
              BTW-berekening en altijd inzicht in je <strong className="text-[#1A1A1A]">cashflow</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── HOE HET WERKT — De keten ──
function HowItWorks() {
  const { ref, isVisible } = useInView(0.3)

  const steps = [
    { label: 'Klant aanmaken', color: '#F0D9D0', icon: <Users className="w-6 h-6" /> },
    { label: 'Offerte versturen', color: '#C8D5CC', icon: <FileText className="w-6 h-6" /> },
    { label: 'Project plannen', color: '#CDD5DE', icon: <FolderOpen className="w-6 h-6" /> },
    { label: 'Factuur incasseren', color: '#EDE8D8', icon: <Receipt className="w-6 h-6" /> },
  ]

  return (
    <section id="hoe-het-werkt" className="py-20 lg:py-32 bg-[#F4F3F0]">
      <div ref={ref} className="max-w-5xl mx-auto px-5 sm:px-8">
        <h2 className="text-[36px] lg:text-[40px] font-black tracking-tight text-center mb-16" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Van idee tot factuur
        </h2>

        {/* Desktop: horizontal chain */}
        <div className="hidden md:block relative">
          <svg className="absolute top-10 left-[12%] right-[12%] h-4 w-[76%] overflow-visible" preserveAspectRatio="none">
            <line x1="0" y1="8" x2="100%" y2="8" stroke="#E8E6E0" strokeWidth="2" />
            <defs>
              <linearGradient id="chainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F0D9D0" />
                <stop offset="33%" stopColor="#C8D5CC" />
                <stop offset="66%" stopColor="#CDD5DE" />
                <stop offset="100%" stopColor="#EDE8D8" />
              </linearGradient>
            </defs>
            <line
              x1="0" y1="8" x2="100%" y2="8"
              stroke="url(#chainGradient)"
              strokeWidth="3"
              className={`chain-line-fill ${isVisible ? 'visible' : ''}`}
            />
          </svg>

          <div className="grid grid-cols-4 gap-8 relative z-10">
            {steps.map((step, i) => (
              <div
                key={step.label}
                className="flex flex-col items-center text-center"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'scale(1)' : 'scale(0)',
                  transition: `all 0.5s ease-out ${0.3 + i * 0.4}s`,
                }}
              >
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white mb-4 shadow-sm"
                  style={{ background: step.color }}>
                  {step.icon}
                </div>
                <p className="text-sm font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Manrope, sans-serif' }}>{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical */}
        <div className="md:hidden space-y-6">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                style={{ background: step.color }}>
                {step.icon}
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Manrope, sans-serif' }}>{step.label}</p>
                {i < steps.length - 1 && <ChevronDown className="w-4 h-4 text-[#E8E6E0]" />}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[#6B6B6B] mt-12 text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
          In 30 minuten je eerste offerte. Geen implementatie. Geen consultant.
        </p>
      </div>
    </section>
  )
}

// ── PRICING — Statement ──
function Pricing() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section id="prijzen" className="py-20 lg:py-32 bg-white">
      <div ref={ref} className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
        <div className={`mb-4 reveal-up ${isVisible ? 'revealed' : ''}`}>
          <span className="text-[80px] lg:text-[120px] font-black tracking-tight text-[#1A1A1A] leading-none" style={{ fontFamily: 'Manrope, sans-serif' }}>€49</span>
          <span className="text-[20px] lg:text-[24px] text-[#A0A0A0] ml-1" style={{ fontFamily: 'Inter, sans-serif' }}>/maand</span>
        </div>

        <p className={`text-lg lg:text-xl text-[#6B6B6B] mt-4 mb-10 reveal-up ${isVisible ? 'revealed reveal-delay-1' : ''}`}
          style={{ fontFamily: 'Inter, sans-serif' }}>
          Per bedrijf. Onbeperkt medewerkers. Alle features.
        </p>

        <div className={`reveal-up ${isVisible ? 'revealed reveal-delay-2' : ''}`}>
          <Link to="/register"
            className="inline-flex items-center justify-center bg-[#0A0A0A] hover:bg-[#222] text-white font-bold px-12 py-5 rounded-[16px] text-lg transition-all hover:-translate-y-0.5"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            Start 30 dagen gratis <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>

        <p className={`text-sm text-[#A0A0A0] mt-6 reveal-up ${isVisible ? 'revealed reveal-delay-3' : ''}`}
          style={{ fontFamily: 'Inter, sans-serif' }}>
          Geen creditcard · Geen contract · Opzeggen wanneer je wilt
        </p>

        <div className={`mt-16 pt-10 border-t border-[#E8E6E0] reveal-up ${isVisible ? 'revealed reveal-delay-4' : ''}`}>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-[#A0A0A0]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span>Teamleader €37+/user</span>
            <span>·</span>
            <span>Gripp €153/3 users</span>
            <span>·</span>
            <span>Simplicate €140/5 users</span>
          </div>
          <p className="text-base font-bold text-[#1A1A1A] mt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            FORGEdesk: €49 totaal
          </p>
        </div>
      </div>
    </section>
  )
}

// ── TESTIMONIALS ──
function Testimonials() {
  const { ref, isVisible } = useInView(0.1)

  const reviews = [
    {
      quote: 'Sinds we FORGEdesk gebruiken, zijn we 30% sneller met offertes. Klanten krijgen binnen een uur een professionele offerte in hun inbox.',
      name: 'Mark de Vries',
      role: 'Eigenaar, DeVries Signing',
      bg: 'rgba(240,217,208,0.2)',
    },
    {
      quote: 'Eindelijk software die snapt hoe een creatief bedrijf werkt. Geen overbodige functies, gewoon precies wat je nodig hebt.',
      name: 'Lisa Bakker',
      role: 'Directeur, Studio Bakker',
      bg: 'rgba(200,213,204,0.2)',
    },
    {
      quote: 'De werkbonnen-functie is een game-changer. Onze monteurs vullen alles in op locatie en het staat direct in het systeem.',
      name: 'Tom Hendriks',
      role: 'Projectleider, Hendriks Reclame',
      bg: 'rgba(205,213,222,0.2)',
    },
  ]

  return (
    <section id="reviews" className="py-20 lg:py-32 bg-[#F4F3F0]">
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-black text-[#1A1A1A] tracking-tight reveal-up ${isVisible ? 'revealed' : ''}`}
            style={{ fontFamily: 'Manrope, sans-serif' }}>
            Wat gebruikers zeggen
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((t, index) => (
            <div
              key={t.name}
              className={`rounded-2xl p-8 reveal-up ${isVisible ? `revealed reveal-delay-${index + 1}` : ''}`}
              style={{ background: t.bg }}
            >
              <MessageSquare className="w-8 h-8 text-[#E8E6E0] mb-4" />
              <p className="text-[#1A1A1A] leading-relaxed mb-6 text-base" style={{ fontFamily: 'Inter, sans-serif' }}>
                "{t.quote}"
              </p>
              <div>
                <p className="font-bold text-[#1A1A1A]" style={{ fontFamily: 'Manrope, sans-serif' }}>{t.name}</p>
                <p className="text-sm text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ──
function CtaSection() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section className="bg-[#0A0A0A] py-20 lg:py-32">
      <div ref={ref} className={`max-w-4xl mx-auto px-5 sm:px-8 text-center reveal-up ${isVisible ? 'revealed' : ''}`}>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Klaar om te smeden?
        </h2>
        <p className="text-lg text-[#A0A0A0] max-w-xl mx-auto mb-10" style={{ fontFamily: 'Inter, sans-serif' }}>
          30 dagen gratis proberen. Geen creditcard nodig. Geen verplichtingen.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register"
            className="inline-flex items-center justify-center bg-white hover:bg-gray-100 text-[#1A1A1A] font-bold px-10 py-5 rounded-[14px] text-[17px] transition-all hover:-translate-y-0.5"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            Start 30 dagen gratis <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
          <a href="https://wa.me/31612345678" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-transparent hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-[14px] transition-all text-base border border-white/20"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            <MessageSquare className="w-5 h-5 mr-2" />
            Stel een vraag
          </a>
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ──
function Footer() {
  return (
    <footer className="bg-[#0A0A0A] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #C49585, #5A8264)', fontFamily: 'Manrope, sans-serif' }}>
                F
              </div>
              <span className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                FORGEdesk
              </span>
            </div>
            <p className="text-[14px] text-[#6B6B6B] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Door vakmensen, voor vakmensen.</p>
            <p className="text-[14px] text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>Gebouwd in Enkhuizen</p>
          </div>

          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Product</h4>
            <div className="space-y-2.5">
              {['Features', 'Prijzen', 'Hoe het werkt'].map((label) => (
                <button key={label} onClick={() => document.getElementById(label.toLowerCase().replace(/ /g, '-'))?.scrollIntoView({ behavior: 'smooth' })}
                  className="block text-[14px] text-[#6B6B6B] hover:text-white transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}>
                  {label}
                </button>
              ))}
              <Link to="/login" className="block text-[14px] text-[#6B6B6B] hover:text-white transition-colors"
                style={{ fontFamily: 'Inter, sans-serif' }}>Inloggen</Link>
              <Link to="/register" className="block text-[14px] text-[#6B6B6B] hover:text-white transition-colors"
                style={{ fontFamily: 'Inter, sans-serif' }}>Registreren</Link>
            </div>
          </div>

          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Contact</h4>
            <div className="space-y-2.5 text-[14px] text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <p>WhatsApp support</p>
              <p>info@forgedesk.nl</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-[13px] text-[#6B6B6B] text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            © 2026 FORGEdesk
          </p>
        </div>
      </div>
    </footer>
  )
}

// ── BACK TO TOP ──
function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const h = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-white shadow-lg border border-[#E8E6E0] flex items-center justify-center text-[#1A1A1A] hover:-translate-y-0.5 transition-all z-50"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  )
}

// ── MAIN LANDING PAGE ──
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <Navbar />
      <Hero />
      <OfferteShowcase />
      <PlanningShowcase />
      <WerkbonnenShowcase />
      <FacturatieShowcase />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CtaSection />
      <Footer />
      <BackToTop />
    </div>
  )
}
