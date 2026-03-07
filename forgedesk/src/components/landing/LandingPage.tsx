import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Users, Receipt, CalendarDays, ClipboardList, BarChart3,
  ArrowRight, Check, Star, Menu, X, ChevronRight, Zap, Shield, Clock,
  Mail, Send, TrendingUp, ArrowUp,
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

@keyframes float1 { 0%,100% { transform: translateY(0px) rotate(2deg) } 50% { transform: translateY(-8px) rotate(2deg) } }
@keyframes float2 { 0%,100% { transform: translateY(0px) rotate(-1deg) } 50% { transform: translateY(-6px) rotate(-1deg) } }
@keyframes float3 { 0%,100% { transform: translateY(0px) rotate(1deg) } 50% { transform: translateY(-10px) rotate(1deg) } }
@keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
@keyframes grow-line { from { height: 0 } to { height: 100% } }
@keyframes pop-in { from { transform: scale(0); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes mini-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }

.float-1 { animation: float1 4s ease-in-out infinite; }
.float-2 { animation: float2 4.5s ease-in-out infinite; animation-delay: 0.5s; }
.float-3 { animation: float3 5s ease-in-out infinite; animation-delay: 1s; }
.marquee-track { animation: marquee 30s linear infinite; }
.marquee-track:hover { animation-play-state: paused; }
.mini-float { animation: mini-float 3s ease-in-out infinite; }

/* Scroll reveal classes */
.reveal-up { opacity: 0; transform: translateY(20px); }
.reveal-left { opacity: 0; transform: translateX(-30px); }
.reveal-right { opacity: 0; transform: translateX(30px); }
.reveal-scale { opacity: 0; transform: scale(0.95); }
.revealed { opacity: 1 !important; transform: none !important; transition: all 0.7s cubic-bezier(0.22,1,0.36,1); }
.reveal-delay-1 { transition-delay: 0.1s; }
.reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; }
.reveal-delay-4 { transition-delay: 0.4s; }
.reveal-delay-5 { transition-delay: 0.5s; }
.reveal-delay-6 { transition-delay: 0.6s; }

/* Nav link underline animation */
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

/* Noise overlay */
.noise-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* Focus visible */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px #C49585;
}
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
      scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-[#E8E6E0] shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          {/* Left: Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #C49585, #5A8264)', fontFamily: 'Manrope, sans-serif' }}>
              F
            </div>
            <span className="text-[17px] font-bold text-[#1A1A1A] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              FORGEdesk
            </span>
          </button>

          {/* Center: Nav links */}
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

          {/* Right: Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-[14px] text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Inloggen
            </Link>
            <Link to="/register" className="px-6 py-2.5 text-[14px] font-semibold text-white bg-[#1A1A1A] rounded-[12px] hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Gratis starten <span className="ml-1">→</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-[#1A1A1A]">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — full screen */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#F0D9D0]/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center gap-6">
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
              className="px-6 py-3 text-center text-[16px] font-semibold text-white bg-[#1A1A1A] rounded-[14px]"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Gratis starten →
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── HERO — "De Smederij" ──
function Hero() {
  const { ref, isVisible } = useInView(0.05)
  const scrollY = useScrollY()

  return (
    <section ref={ref} className="relative min-h-[100vh] flex items-center overflow-hidden bg-white">
      {/* Subtle mesh gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[70%] h-[70%] opacity-[0.12]"
          style={{
            background: 'radial-gradient(ellipse at 80% 20%, #F0D9D0 0%, transparent 50%), radial-gradient(ellipse at 60% 40%, #CDD5DE 0%, transparent 50%), radial-gradient(ellipse at 90% 60%, #EDE8D8 0%, transparent 50%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-20 sm:pt-36 sm:pb-28 w-full">
        <div className="grid lg:grid-cols-[55%,45%] gap-12 lg:gap-8 items-center">
          {/* Left — text content */}
          <div>
            {/* Badge */}
            <div className={`reveal-up ${isVisible ? 'revealed reveal-delay-1' : ''}`}>
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium"
                style={{ background: 'rgba(240,217,208,0.5)', color: '#C49585', fontFamily: 'Inter, sans-serif' }}>
                🔥 Eén prijs, alles erin — €49/maand
              </span>
            </div>

            {/* Heading */}
            <h1 className={`mt-8 text-[40px] sm:text-[56px] lg:text-[72px] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#1A1A1A] reveal-up ${isVisible ? 'revealed reveal-delay-2' : ''}`}
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              <span style={{
                background: 'linear-gradient(135deg, #C49585, #5A8264)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Smeed
              </span>{' '}
              je bedrijf tot een geoliede machine.
            </h1>

            {/* Subheading */}
            <p className={`mt-6 text-xl text-[#6B6B6B] max-w-lg leading-relaxed reveal-up ${isVisible ? 'revealed reveal-delay-3' : ''}`}
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Van eerste schets tot laatste factuur. FORGEdesk is de app die signmakers, interieurbouwers en productiebedrijven écht snappen.
            </p>

            {/* CTA buttons */}
            <div className={`mt-10 flex flex-col sm:flex-row gap-4 reveal-up ${isVisible ? 'revealed reveal-delay-4' : ''}`}>
              <Link to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-[16px] font-semibold text-white bg-[#1A1A1A] rounded-[14px] hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] transition-all"
                style={{ fontFamily: 'Inter, sans-serif' }}>
                Start 30 dagen gratis <span>→</span>
              </Link>
              <button
                onClick={() => document.getElementById('hoe-het-werkt')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-[16px] text-[#1A1A1A] bg-transparent border-2 border-[#E8E6E0] rounded-[14px] hover:border-[#1A1A1A] transition-all"
                style={{ fontFamily: 'Inter, sans-serif' }}>
                Bekijk hoe het werkt
              </button>
            </div>

            {/* Trust badges */}
            <div className={`mt-12 flex flex-wrap gap-6 text-[13px] text-[#A0A0A0] reveal-up ${isVisible ? 'revealed reveal-delay-5' : ''}`}
              style={{ fontFamily: 'Inter, sans-serif' }}>
              <span>⚡ Direct aan de slag</span>
              <span>·</span>
              <span>🔓 Geen creditcard nodig</span>
              <span>·</span>
              <span>👥 Onbeperkt medewerkers</span>
            </div>
          </div>

          {/* Right — Floating Cards */}
          <div className={`hidden lg:block relative w-full h-[500px] transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Card 1 — Offerte goedgekeurd */}
            <div
              className="float-1 absolute top-0 right-0 w-[280px] bg-white rounded-2xl shadow-xl border border-[#E8E6E0] p-5"
              style={{ transform: `translateY(${scrollY * 0.08}px) rotate(2deg)` }}
            >
              <div className="w-full h-1 rounded-full bg-blush-deep mb-4" />
              <p className="text-[14px] font-semibold text-[#1A1A1A]">Offerte goedgekeurd! ✅</p>
              <p className="text-[12px] text-[#A0A0A0] mt-1">OFF-2026-087</p>
              <p className="text-[13px] text-[#6B6B6B] mt-2">Lichtreclame De Haven</p>
              <p className="text-[22px] font-bold text-[#1A1A1A] mt-2">€ 6.200</p>
              <div className="mt-3 h-2 rounded-full bg-[#E8E6E0] overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-sage-deep" />
              </div>
            </div>

            {/* Card 2 — E-mail */}
            <div
              className="float-2 absolute top-[180px] left-0 w-[260px] bg-white rounded-2xl shadow-lg border border-[#E8E6E0] p-5"
              style={{ transform: `translateY(${scrollY * 0.05}px) rotate(-1deg)` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-mist flex items-center justify-center text-[16px]">📧</div>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">Nieuwe e-mail</p>
              </div>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">Bakkerij Jansen heeft gereageerd op je offerte.</p>
              <div className="flex gap-2 mt-3">
                <span className="px-3 py-1.5 rounded-lg border border-[#E8E6E0] text-[12px] text-[#1A1A1A] font-medium hover:bg-[#F4F3F0] cursor-pointer transition-colors">Bekijken</span>
                <span className="px-3 py-1.5 rounded-lg border border-[#E8E6E0] text-[12px] text-[#6B6B6B] hover:bg-[#F4F3F0] cursor-pointer transition-colors">Archiveren</span>
              </div>
            </div>

            {/* Card 3 — Maandomzet */}
            <div
              className="float-3 absolute bottom-[20px] right-[30px] w-[240px] bg-white rounded-2xl shadow-lg border border-[#E8E6E0] p-5"
              style={{ transform: `translateY(${scrollY * 0.06}px) rotate(1deg)` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center text-[16px]">📊</div>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">Maandomzet</p>
              </div>
              <p className="text-[24px] font-bold text-[#1A1A1A]">€ 14.850</p>
              <p className="text-[13px] text-sage-deep font-medium mt-1">↑ 23% vs. vorige maand</p>
              {/* Mini bar chart */}
              <div className="flex items-end gap-2 mt-3 h-[40px]">
                <div className="flex-1 rounded-sm bg-blush" style={{ height: '50%' }} />
                <div className="flex-1 rounded-sm bg-sage" style={{ height: '70%' }} />
                <div className="flex-1 rounded-sm bg-mist" style={{ height: '60%' }} />
                <div className="flex-1 rounded-sm bg-sage-deep" style={{ height: '100%' }} />
              </div>
            </div>
          </div>

          {/* Mobile cards — 2 side by side under text */}
          <div className="lg:hidden grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl shadow-lg border border-[#E8E6E0] p-4">
              <div className="w-full h-1 rounded-full bg-blush-deep mb-3" />
              <p className="text-[13px] font-semibold text-[#1A1A1A]">Offerte goedgekeurd! ✅</p>
              <p className="text-[11px] text-[#A0A0A0] mt-1">OFF-2026-087</p>
              <p className="text-[18px] font-bold text-[#1A1A1A] mt-2">€ 6.200</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-[#E8E6E0] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-sage flex items-center justify-center text-[12px]">📊</div>
                <p className="text-[13px] font-semibold text-[#1A1A1A]">Maandomzet</p>
              </div>
              <p className="text-[18px] font-bold text-[#1A1A1A]">€ 14.850</p>
              <p className="text-[12px] text-sage-deep font-medium mt-1">↑ 23%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── SOCIAL PROOF STRIP ──
function SocialProofStrip() {
  const badges = [
    { emoji: '🔧', label: 'Signbedrijven', bg: 'bg-blush/30' },
    { emoji: '🏗️', label: 'Interieurbouw', bg: 'bg-sage/30' },
    { emoji: '🎨', label: 'Reclamemakers', bg: 'bg-mist/30' },
    { emoji: '🖨️', label: 'Drukkerijen', bg: 'bg-cream/30' },
    { emoji: '📐', label: 'Standbouwers', bg: 'bg-blush/30' },
    { emoji: '🔩', label: 'Installateurs', bg: 'bg-sage/30' },
    { emoji: '🎭', label: 'Evenementen', bg: 'bg-mist/30' },
    { emoji: '🖌️', label: 'Schilders', bg: 'bg-cream/30' },
  ]

  return (
    <section className="relative py-12 bg-[#F4F3F0]">
      {/* Wave top transition */}
      <div className="absolute top-0 left-0 right-0 -translate-y-[99%]">
        <svg viewBox="0 0 1440 60" fill="none" className="w-full" preserveAspectRatio="none">
          <path d="M0 60L1440 60L1440 0C1440 0 1080 40 720 40C360 40 0 0 0 0L0 60Z" fill="#F4F3F0" />
        </svg>
      </div>

      <p className="text-sm text-[#A0A0A0] text-center mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        Vertrouwd door signbedrijven, interieurbouwers en productiebedrijven
      </p>

      {/* Marquee */}
      <div className="overflow-hidden">
        <div className="marquee-track flex gap-4 w-max">
          {[...badges, ...badges].map((b, i) => (
            <span key={i} className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium border border-[#E8E6E0] whitespace-nowrap ${b.bg}`}
              style={{ fontFamily: 'Inter, sans-serif' }}>
              {b.emoji} {b.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FEATURES — "Wat je allemaal kunt smeden" ──
function Features() {
  const { ref, isVisible } = useInView(0.05)

  return (
    <section id="features" className="relative py-24 sm:py-32 bg-white">
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className={`text-center mb-16 sm:mb-20 reveal-up ${isVisible ? 'revealed' : ''}`}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A1A] mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Alles onder één dak.
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Geen 5 losse tools meer. FORGEdesk verbindt je hele werkproces — van eerste klantcontact tot laatste factuur.
          </p>
        </div>

        {/* Masonry grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* ROW 1 */}
          {/* Large card — Offertes & Calculaties */}
          <div className={`md:col-span-2 bg-blush/20 rounded-3xl p-8 sm:p-10 min-h-[340px] flex flex-col sm:flex-row gap-8 items-start reveal-left ${isVisible ? 'revealed reveal-delay-1' : ''}`}>
            <div className="flex-1">
              <div className="w-12 h-12 rounded-full bg-blush flex items-center justify-center text-[24px] mb-4">📐</div>
              <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Offertes & Calculaties</h3>
              <p className="text-[15px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Bouw je offerte op met regels, materialen en uren. Je klant ziet een strakke PDF — jij ziet je marge.
              </p>
            </div>
            <div className={`w-full sm:w-[260px] bg-white rounded-2xl shadow-sm border border-[#E8E6E0] p-5 flex-shrink-0 reveal-up ${isVisible ? 'revealed reveal-delay-3' : ''}`}>
              <div className="space-y-3 text-[13px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>1. Lichtreclame LED</span>
                  <span>12u · €2.400</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>2. Montage</span>
                  <span>4u · €480</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>3. Transport</span>
                  <span>€150</span>
                </div>
                <div className="border-t border-[#E8E6E0] pt-3 flex justify-between font-bold text-[#1A1A1A]">
                  <span>Totaal</span>
                  <span>€3.030</span>
                </div>
              </div>
            </div>
          </div>

          {/* Small card — Projecten */}
          <div className={`bg-sage/20 rounded-3xl p-8 reveal-up ${isVisible ? 'revealed reveal-delay-2' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-sage flex items-center justify-center text-[24px] mb-4">📊</div>
            <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Projecten</h3>
            <p className="text-[15px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Van offerte naar project in één klik. Wijs teams toe, plan deadlines, houd voortgang bij.
            </p>
          </div>

          {/* ROW 2 */}
          {/* Small card — Werkbonnen */}
          <div className={`bg-mist/20 rounded-3xl p-8 reveal-up ${isVisible ? 'revealed reveal-delay-3' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center text-[24px] mb-4">📋</div>
            <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Werkbonnen</h3>
            <p className="text-[15px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Monteur op locatie? Werkbon invullen, foto's toevoegen, klant laten tekenen. Direct digitaal.
            </p>
          </div>

          {/* Large card — Facturatie */}
          <div className={`md:col-span-2 bg-cream/20 rounded-3xl p-8 sm:p-10 min-h-[340px] flex flex-col sm:flex-row gap-8 items-start reveal-right ${isVisible ? 'revealed reveal-delay-4' : ''}`}>
            <div className="flex-1">
              <div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center text-[24px] mb-4">💰</div>
              <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Facturatie</h3>
              <p className="text-[15px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Werkbon wordt factuur. Offerte wordt factuur. Voorschotfactuur, creditnota, herinnering — alles in één flow.
              </p>
            </div>
            <div className={`w-full sm:w-[240px] bg-white rounded-2xl shadow-sm border border-[#E8E6E0] p-5 flex-shrink-0 reveal-up ${isVisible ? 'revealed reveal-delay-6' : ''}`}>
              <p className="text-[12px] text-[#A0A0A0] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>F-2026-042</p>
              <p className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Manrope, sans-serif' }}>Abovo Media</p>
              <p className="text-[22px] font-bold text-[#1A1A1A] mt-2">€8.450,00</p>
              <span className="inline-block mt-3 px-3 py-1 rounded-full bg-sage/30 text-sage-deep text-[12px] font-medium">
                Betaald ✓
              </span>
            </div>
          </div>

          {/* ROW 3 — Three medium cards */}
          <div className={`bg-blush/15 rounded-3xl p-8 reveal-up ${isVisible ? 'revealed reveal-delay-3' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-blush flex items-center justify-center text-[24px] mb-4">👥</div>
            <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Klantenbeheer</h3>
            <p className="text-[15px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Alle klanten, contactpersonen, projecthistorie en communicatie op één plek.
            </p>
          </div>

          <div className={`bg-mist/15 rounded-3xl p-8 reveal-up ${isVisible ? 'revealed reveal-delay-4' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center text-[24px] mb-4">✉️</div>
            <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>E-mail</h3>
            <p className="text-[15px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Verstuur en ontvang email vanuit FORGEdesk. Elke mail aan de juiste klant gekoppeld.
            </p>
          </div>

          <div className={`bg-sage/15 rounded-3xl p-8 reveal-up ${isVisible ? 'revealed reveal-delay-5' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-sage flex items-center justify-center text-[24px] mb-4">📅</div>
            <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Planning</h3>
            <p className="text-[15px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Montages plannen, teams toewijzen, agenda synchroniseren. Overzicht voor kantoor én buitendienst.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── HOE HET WERKT — "Van idee tot factuur" ──
function HowItWorks() {
  const { ref, isVisible } = useInView(0.1)

  const steps = [
    { num: '1', bg: 'bg-blush', textColor: 'text-blush-deep', title: 'Account aanmaken', desc: 'Vul je bedrijfsgegevens in, upload je logo — je huisstijl staat in 2 minuten klaar.', side: 'left' as const },
    { num: '2', bg: 'bg-sage', textColor: 'text-sage-deep', title: 'Eerste offerte maken', desc: 'Kies een klant, voeg regels toe, genereer een PDF. Verstuur \'m direct vanuit de app.', side: 'right' as const },
    { num: '3', bg: 'bg-mist', textColor: 'text-mist-deep', title: 'Aan de slag', desc: 'Offerte akkoord? Eén klik naar project. Plan de montage. Vul de werkbon in. Maak de factuur.', side: 'left' as const },
    { num: '4', bg: 'bg-cream', textColor: 'text-cream-deep', title: 'Groei', desc: 'Houd je pipeline bij. Zie welke facturen openstaan. Weet je marge. Neem betere beslissingen.', side: 'right' as const },
  ]

  return (
    <section id="hoe-het-werkt" className="relative py-24 sm:py-32 bg-[#F4F3F0]">
      <div ref={ref} className="max-w-3xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className={`text-center mb-16 sm:mb-20 reveal-up ${isVisible ? 'revealed' : ''}`}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A1A] mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            In 30 minuten je eerste offerte
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Geen implementatietraject. Geen consultant. Gewoon beginnen.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-[#E8E6E0] hidden md:block">
            <div
              className="w-full bg-gradient-to-b from-blush-deep via-sage-deep to-cream-deep rounded-full"
              style={{
                height: isVisible ? '100%' : '0%',
                transition: 'height 2s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          </div>

          {/* Mobile line — left aligned */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#E8E6E0] md:hidden">
            <div
              className="w-full bg-gradient-to-b from-blush-deep via-sage-deep to-cream-deep rounded-full"
              style={{
                height: isVisible ? '100%' : '0%',
                transition: 'height 2s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          </div>

          <div className="space-y-16">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {/* Desktop layout */}
                <div className="hidden md:grid md:grid-cols-[1fr,auto,1fr] md:gap-8 md:items-center">
                  {/* Left content or spacer */}
                  {step.side === 'left' ? (
                    <div />
                  ) : (
                    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-[#E8E6E0] ${
                      isVisible ? 'revealed' : ''
                    } reveal-left`}
                      style={{ transitionDelay: `${0.5 + i * 0.3}s` }}>
                      <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{step.title}</h3>
                      <p className="text-[14px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>{step.desc}</p>
                    </div>
                  )}

                  {/* Circle */}
                  <div className={`w-12 h-12 rounded-full ${step.bg} flex items-center justify-center z-10 ${
                    isVisible ? 'revealed' : 'reveal-scale'
                  }`}
                    style={{ transitionDelay: `${0.4 + i * 0.3}s` }}>
                    <span className={`text-lg font-bold ${step.textColor}`} style={{ fontFamily: 'Manrope, sans-serif' }}>{step.num}</span>
                  </div>

                  {/* Right content or spacer */}
                  {step.side === 'left' ? (
                    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-[#E8E6E0] ${
                      isVisible ? 'revealed' : ''
                    } reveal-right`}
                      style={{ transitionDelay: `${0.5 + i * 0.3}s` }}>
                      <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{step.title}</h3>
                      <p className="text-[14px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>{step.desc}</p>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>

                {/* Mobile layout — circle left, card right */}
                <div className="md:hidden flex gap-6 items-start">
                  <div className={`w-12 h-12 rounded-full ${step.bg} flex items-center justify-center flex-shrink-0 z-10 ${
                    isVisible ? 'revealed' : 'reveal-scale'
                  }`}
                    style={{ transitionDelay: `${0.4 + i * 0.3}s` }}>
                    <span className={`text-lg font-bold ${step.textColor}`} style={{ fontFamily: 'Manrope, sans-serif' }}>{step.num}</span>
                  </div>
                  <div className={`bg-white rounded-2xl p-6 shadow-sm border border-[#E8E6E0] flex-1 ${
                    isVisible ? 'revealed' : ''
                  } reveal-right`}
                    style={{ transitionDelay: `${0.5 + i * 0.3}s` }}>
                    <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{step.title}</h3>
                    <p className="text-[14px] text-[#6B6B6B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── PRICING — "Eén smeedprijs" ──
function Pricing() {
  const { ref, isVisible } = useInView(0.1)

  const features = [
    'Onbeperkt offertes & facturen',
    'Onbeperkt medewerkers',
    'Projecten & planning',
    'Werkbonnen met handtekening',
    'Email integratie',
    'CRM & klantenbeheer',
    "PDF's in je huisstijl",
    'Calculatie per offerte-regel',
    'Betalingsherinneringen',
    'Rapportages',
    '30 dagen gratis',
    'Geen contract',
  ]

  const miniCards = [
    { label: '📐 Offertes', bg: 'bg-blush', rotate: '-6deg', delay: 1 },
    { label: '📊 Projecten', bg: 'bg-sage', rotate: '-2deg', delay: 2 },
    { label: '📋 Werkbonnen', bg: 'bg-mist', rotate: '2deg', delay: 3 },
    { label: '💰 Facturen', bg: 'bg-cream', rotate: '6deg', delay: 4 },
  ]

  return (
    <section id="prijzen" className="relative py-24 sm:py-32 bg-white">
      <div ref={ref} className="max-w-xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className={`text-center mb-12 reveal-up ${isVisible ? 'revealed' : ''}`}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A1A] mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            €49 per maand. Dat is het.
          </h2>
          <p className="text-lg text-[#6B6B6B] max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Geen per-gebruiker kosten. Geen add-ons. Geen verrassingen. Je hele team, alle features, één factuur.
          </p>
        </div>

        {/* Floating mini cards */}
        <div className="flex justify-center gap-3 mb-10">
          {miniCards.map((card) => (
            <div
              key={card.label}
              className={`mini-float w-[100px] sm:w-[120px] rounded-xl p-3 shadow-md ${card.bg} text-center text-[13px] font-medium text-[#1A1A1A] reveal-scale ${isVisible ? 'revealed' : ''}`}
              style={{
                transform: `rotate(${card.rotate})`,
                transitionDelay: `${card.delay * 0.1}s`,
                fontFamily: 'Inter, sans-serif',
                animationDelay: `${card.delay * 0.3}s`,
              }}
            >
              {card.label}
            </div>
          ))}
        </div>

        {/* Pricing card */}
        <div className={`bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-[#E8E6E0] reveal-scale ${isVisible ? 'revealed reveal-delay-2' : ''}`}>
          <div className="text-center">
            <span className="inline-block px-4 py-1 rounded-full bg-sage/30 text-sage-deep text-sm font-medium mb-4"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Meest gekozen
            </span>
            <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>FORGEdesk</h3>
            <div className="flex items-baseline justify-center">
              <span className="text-[64px] font-extrabold text-[#1A1A1A] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>€49</span>
              <span className="text-xl text-[#A0A0A0] ml-2" style={{ fontFamily: 'Inter, sans-serif' }}>/maand</span>
            </div>
            <p className="text-[#6B6B6B] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>Per bedrijf · Onbeperkt medewerkers</p>
          </div>

          <div className="border-t border-[#E8E6E0] my-8" />

          {/* Feature list — 2 columns on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-sage-deep flex-shrink-0" />
                <span className="text-[14px] text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>{f}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link to="/register"
            className="mt-8 w-full inline-flex items-center justify-center gap-2 px-8 py-4 text-[16px] font-semibold text-white bg-[#1A1A1A] rounded-[14px] hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] transition-all"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            Start je gratis proefperiode →
          </Link>
          <p className="text-sm text-[#A0A0A0] text-center mt-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Geen creditcard nodig. Direct aan de slag.
          </p>
        </div>

        {/* Comparison */}
        <div className={`mt-10 text-center text-sm text-[#A0A0A0] space-y-1 reveal-up ${isVisible ? 'revealed reveal-delay-4' : ''}`}
          style={{ fontFamily: 'Inter, sans-serif' }}>
          <p>Teamleader: €37+/gebruiker · Gripp: €153/3 users · Simplicate: €140/5 users</p>
          <p className="font-medium text-[#1A1A1A]">FORGEdesk: €49 totaal. Onbeperkt alles.</p>
        </div>
      </div>
    </section>
  )
}

// ── TESTIMONIALS — "Uit de werkplaats" ──
function Testimonials() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section id="reviews" className="relative py-24 sm:py-32 bg-[#F4F3F0]">
      <div ref={ref} className="max-w-4xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className={`text-center mb-16 reveal-up ${isVisible ? 'revealed' : ''}`}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A1A] mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Wat vakmensen zeggen
          </h2>
        </div>

        {/* Main quote */}
        <div className={`bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-[#E8E6E0] mb-6 reveal-up ${isVisible ? 'revealed reveal-delay-1' : ''}`}>
          <p className="text-[18px] sm:text-[22px] font-medium leading-relaxed text-[#1A1A1A] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            "Ik stond bij een klant en kon in 10 seconden laten zien hoeveel uur ik had berekend per lichtreclame. Met James PRO moest ik 8 losse calculaties openen. Dat is het verschil."
          </p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-[15px] text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>
              — <span className="font-semibold text-[#1A1A1A]">Antony B.</span> · Sign Company
            </p>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
          </div>
        </div>

        {/* Two smaller quotes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className={`bg-blush/20 rounded-2xl p-8 reveal-up ${isVisible ? 'revealed reveal-delay-3' : ''}`}>
            <p className="text-[15px] text-[#1A1A1A] leading-relaxed mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              "Eindelijk een app die snapt hoe wij werken. Geen overbodige troep, gewoon offerte → project → factuur."
            </p>
            <p className="text-[14px] text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>
              — <span className="font-semibold text-[#1A1A1A]">Mark de Vries</span> · SignWorks
            </p>
            <div className="flex gap-0.5 mt-2">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
            </div>
          </div>

          <div className={`bg-sage/20 rounded-2xl p-8 reveal-up ${isVisible ? 'revealed reveal-delay-4' : ''}`}>
            <p className="text-[15px] text-[#1A1A1A] leading-relaxed mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              "De monteurs vinden het fijn. Werkbon op hun telefoon, foto erbij, klant tekent ter plekke. Scheelt mij een uur admin per dag."
            </p>
            <p className="text-[14px] text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>
              — <span className="font-semibold text-[#1A1A1A]">Sandra Jansen</span> · Van Dijk Reclame
            </p>
            <div className="flex gap-0.5 mt-2">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── CTA — "Begin met smeden" ──
function CtaSection() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section className="relative bg-[#1A1A1A] py-24 sm:py-32">
      {/* Wave top transition */}
      <div className="absolute top-0 left-0 right-0 -translate-y-[99%]">
        <svg viewBox="0 0 1440 60" fill="none" className="w-full" preserveAspectRatio="none">
          <path d="M0 60L1440 60L1440 0C1440 0 1080 40 720 40C360 40 0 0 0 0L0 60Z" fill="#1A1A1A" />
        </svg>
      </div>

      <div ref={ref} className={`max-w-3xl mx-auto px-5 sm:px-8 text-center reveal-up ${isVisible ? 'revealed' : ''}`}>
        <h2 className="text-[32px] sm:text-[40px] font-extrabold text-white tracking-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Klaar om te beginnen?
        </h2>
        <p className="text-lg text-[#A0A0A0] mb-10" style={{ fontFamily: 'Inter, sans-serif' }}>
          30 dagen gratis. Geen creditcard. Geen contract.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-[16px] font-semibold text-[#1A1A1A] bg-white rounded-[14px] hover:-translate-y-0.5 hover:shadow-xl transition-all"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            Start gratis proefperiode →
          </Link>
          <a href="https://wa.me/31612345678" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-[16px] text-white border border-white/30 rounded-[14px] hover:bg-white/10 transition-all"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            WhatsApp ons
          </a>
        </div>

        <p className="mt-6 text-sm text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>
          📱 Direct contact via WhatsApp
        </p>
      </div>
    </section>
  )
}

// ── FOOTER ──
function Footer() {
  return (
    <footer className="bg-[#1A1A1A] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 mb-12">
          {/* Left — branding */}
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
            <p className="text-[14px] text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>Gebouwd in Enkhuizen 🇳🇱</p>
          </div>

          {/* Middle — Product */}
          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Product</h4>
            <div className="space-y-2.5">
              {['Features', 'Prijzen', 'Hoe het werkt'].map((label) => (
                <button key={label} onClick={() => document.getElementById(label.toLowerCase().replace(/ /g, '-'))?.scrollIntoView({ behavior: 'smooth' })}
                  className="block text-[14px] text-[#6B6B6B] hover:text-white transition-colors nav-link"
                  style={{ fontFamily: 'Inter, sans-serif' }}>
                  {label}
                </button>
              ))}
              <Link to="/login" className="block text-[14px] text-[#6B6B6B] hover:text-white transition-colors nav-link"
                style={{ fontFamily: 'Inter, sans-serif' }}>Inloggen</Link>
              <Link to="/register" className="block text-[14px] text-[#6B6B6B] hover:text-white transition-colors nav-link"
                style={{ fontFamily: 'Inter, sans-serif' }}>Registreren</Link>
            </div>
          </div>

          {/* Right — Contact */}
          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Contact</h4>
            <div className="space-y-2.5 text-[14px] text-[#6B6B6B]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <p>📱 WhatsApp support</p>
              <p>✉️ info@forgedesk.nl</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-[13px] text-[#6B6B6B] text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            © 2026 FORGEdesk
          </p>
        </div>
      </div>
    </footer>
  )
}

// ── BACK TO TOP BUTTON ──
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
      style={{ animation: 'slide-up-fade 0.3s ease-out' }}
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
      <div className="noise-overlay" />
      <Navbar />
      <Hero />
      <SocialProofStrip />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CtaSection />
      <Footer />
      <BackToTop />
    </div>
  )
}
