import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Users, Receipt, CalendarDays, ClipboardList, BarChart3,
  ArrowRight, Check, Star, Menu, X, ChevronRight, Zap, Shield, Clock,
  Mail, Newspaper, Send, TrendingUp, Minus, Plus, Sparkles,
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

function useCountUp(end: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      setValue(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, start])
  return value
}

// ── CSS-IN-JS STYLES ──
const styles = `
@keyframes float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-12px) } }
@keyframes float-slow { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-8px) } }
@keyframes float-delayed { 0%,100% { transform: translateY(0px) rotate(0deg) } 50% { transform: translateY(-16px) rotate(2deg) } }
@keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
@keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
@keyframes pulse-glow { 0%,100% { opacity: 0.4 } 50% { opacity: 0.8 } }
@keyframes gradient-shift { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
@keyframes slide-up-fade { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
@keyframes typewriter-cursor { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
.animate-float { animation: float 6s ease-in-out infinite }
.animate-float-slow { animation: float-slow 8s ease-in-out infinite }
.animate-float-delayed { animation: float-delayed 7s ease-in-out infinite }
.animate-shimmer { background-size: 200% 100%; animation: shimmer 3s linear infinite }
.animate-marquee { animation: marquee 30s linear infinite }
.animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite }
.animate-gradient-shift { background-size: 200% 200%; animation: gradient-shift 6s ease infinite }
.animate-slide-up { animation: slide-up-fade 0.6s ease-out forwards }
.animate-cursor { animation: typewriter-cursor 1s step-end infinite }
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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/20' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              <svg className="w-4 h-4 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" /><path d="M8 20h8" /><path d="M12 16v4" />
              </svg>
            </div>
            <span className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>FORGEdesk</span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {links.map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)} className="px-3.5 py-2 text-[13.5px] text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-[13.5px] text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-white/5">Inloggen</Link>
            <Link to="/register" className="px-5 py-2.5 text-[13.5px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20">
              Gratis starten
            </Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-400 hover:text-white">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/5 px-5 pb-6 pt-2">
          {links.map((item) => (
            <button key={item.id} onClick={() => scrollTo(item.id)} className="block w-full text-left px-3 py-3 text-[15px] text-slate-300 hover:text-white rounded-lg hover:bg-white/5">{item.label}</button>
          ))}
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/10">
            <Link to="/login" className="px-4 py-3 text-center text-[15px] text-white rounded-xl bg-white/5 border border-white/10">Inloggen</Link>
            <Link to="/register" className="px-4 py-3 text-center text-[15px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl">Gratis starten</Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── HERO ──
function Hero() {
  const { ref, isVisible } = useInView(0.05)
  const [wordIndex, setWordIndex] = useState(0)
  const rotatingWords = ['Offertes', 'Facturen', 'Planning', 'E-mail', 'Werkbonnen']

  useEffect(() => {
    const timer = setInterval(() => setWordIndex(i => (i + 1) % rotatingWords.length), 2200)
    return () => clearInterval(timer)
  }, [])

  return (
    <section ref={ref} className="relative min-h-[100vh] flex items-center overflow-hidden bg-slate-950">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/6 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/4 rounded-full blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-20 sm:pt-36 sm:pb-28 w-full">
        <div className="grid lg:grid-cols-[1fr,auto] gap-12 lg:gap-20 items-center">
          {/* Left — text content */}
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[12.5px] font-medium text-emerald-400 tracking-wide">Eén prijs, alles erin — €49/maand</span>
            </div>

            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Jij runt je bedrijf.
              <br />
              <span className="relative">
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300 bg-clip-text text-transparent animate-gradient-shift">
                  Wij regelen de rest.
                </span>
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-xl mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Professionele{' '}
              <span className="relative inline-block min-w-[130px] text-emerald-400 font-semibold">
                <span key={wordIndex} className="animate-slide-up inline-block">{rotatingWords[wordIndex]}</span>
              </span>
              {' '}in minuten. Zodat jij tijd hebt voor het echte werk.
            </p>

            <p className="text-[15px] text-slate-500 mb-10 max-w-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
              Offertes, facturen, e-mail, nieuwsbrieven, planning, klantenbeheer en werkbonnen. Eén app voor je hele bedrijf.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                to="/register"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-[15px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:opacity-90 transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02]"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-shimmer opacity-30" />
                <span className="relative">14 dagen gratis proberen</span>
                <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-[15px] font-medium text-slate-300 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all"
              >
                Bekijk features
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { icon: Zap, text: 'Direct aan de slag' },
                { icon: Shield, text: 'Geen creditcard nodig' },
                { icon: Clock, text: 'Onbeperkt gebruikers' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-[13px] text-slate-500">
                  <Icon className="w-3.5 h-3.5 text-emerald-500/70" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating UI cards */}
          <div className={`hidden lg:block relative w-[380px] h-[480px] transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            {/* Card: Email notification */}
            <div className="absolute top-0 right-0 w-[280px] rounded-2xl bg-slate-800/80 border border-white/10 backdrop-blur-xl p-5 shadow-2xl animate-float">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Mail className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Nieuwe e-mail</p>
                  <p className="text-[11px] text-slate-500">Zojuist ontvangen</p>
                </div>
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed">Bakkerij Jansen heeft gereageerd op je offerte. &ldquo;Ziet er goed uit, graag plannen!&rdquo;</p>
              <div className="flex gap-2 mt-3">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-[11px] text-emerald-400 font-medium">Beantwoorden</span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] text-slate-400 font-medium">Archiveren</span>
              </div>
            </div>

            {/* Card: Offerte status */}
            <div className="absolute top-[140px] -left-4 w-[260px] rounded-2xl bg-slate-800/80 border border-white/10 backdrop-blur-xl p-5 shadow-2xl animate-float-delayed" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center"><FileText className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-white">OFF-2024-087</p>
                  <p className="text-[11px] text-emerald-400 font-medium">Goedgekeurd!</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-400">Lichtreclame De Haven</span>
                <span className="text-[15px] font-bold text-white">€ 6.200</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
              </div>
            </div>

            {/* Card: Nieuwsbrief stats */}
            <div className="absolute bottom-[40px] right-[10px] w-[240px] rounded-2xl bg-slate-800/80 border border-white/10 backdrop-blur-xl p-5 shadow-2xl animate-float-slow" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Send className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Nieuwsbrief verstuurd</p>
                  <p className="text-[11px] text-slate-500">248 ontvangers</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-white/5"><p className="text-[14px] font-bold text-emerald-400">67%</p><p className="text-[10px] text-slate-500">Geopend</p></div>
                <div className="text-center p-2 rounded-lg bg-white/5"><p className="text-[14px] font-bold text-cyan-400">23%</p><p className="text-[10px] text-slate-500">Geklikt</p></div>
                <div className="text-center p-2 rounded-lg bg-white/5"><p className="text-[14px] font-bold text-violet-400">4</p><p className="text-[10px] text-slate-500">Leads</p></div>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── STATS BAR ──
function StatsBar() {
  const { ref, isVisible } = useInView(0.3)
  const bedrijven = useCountUp(500, 2000, isVisible)
  const offertes = useCountUp(12000, 2500, isVisible)
  const bespaard = useCountUp(15, 2000, isVisible)

  return (
    <section ref={ref} className="relative py-16 bg-slate-950 border-y border-white/5">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: `${bedrijven}+`, label: 'Actieve bedrijven', color: 'text-emerald-400' },
            { value: `${offertes.toLocaleString('nl-NL')}+`, label: 'Offertes verstuurd', color: 'text-cyan-400' },
            { value: `${bespaard} uur`, label: 'Bespaard per week', color: 'text-violet-400' },
            { value: '€49', label: 'Vast per maand', color: 'text-amber-400' },
          ].map(({ value, label, color }) => (
            <div key={label}>
              <p className={`text-3xl sm:text-4xl font-extrabold ${color} mb-1`} style={{ fontFamily: 'Manrope, sans-serif' }}>{value}</p>
              <p className="text-[13px] text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FEATURES — BENTO GRID ──
const FEATURES = [
  {
    icon: Mail, title: 'E-mail', tag: 'USP',
    description: 'Volledig e-mailclient ingebouwd. Ontvang, beantwoord en archiveer — direct vanuit FORGEdesk. Geen Outlook meer nodig.',
    color: 'from-blue-500 to-cyan-500', size: 'lg',
  },
  {
    icon: Newspaper, title: 'Nieuwsbrieven', tag: 'USP',
    description: 'Ontwerp en verstuur professionele nieuwsbrieven naar je klanten. Met open/klik statistieken en lead tracking.',
    color: 'from-violet-500 to-fuchsia-500', size: 'lg',
  },
  {
    icon: FileText, title: 'Offertes & Calculatie',
    description: 'Professionele offertes met marge-overzicht, digitale handtekening en automatische follow-ups.',
    color: 'from-emerald-500 to-emerald-600', size: 'sm',
  },
  {
    icon: Receipt, title: 'Facturatie',
    description: 'Van offerte naar factuur in één klik. Automatische nummerreeksen en betalingsherinneringen.',
    color: 'from-amber-500 to-orange-500', size: 'sm',
  },
  {
    icon: Users, title: 'Klantenbeheer (CRM)',
    description: 'Compleet klantoverzicht: contacten, projecthistorie, communicatie en notities op één plek.',
    color: 'from-cyan-500 to-cyan-600', size: 'sm',
  },
  {
    icon: CalendarDays, title: 'Planning & Montage',
    description: "Montageplanning, medewerker-agenda's en conflictdetectie. Iedereen weet wat er moet gebeuren.",
    color: 'from-rose-500 to-rose-600', size: 'sm',
  },
  {
    icon: ClipboardList, title: 'Werkbonnen',
    description: "Digitale werkbonnen met foto's, materiaalregistratie en klanthandtekening. Op locatie en onderweg.",
    color: 'from-pink-500 to-rose-500', size: 'sm',
  },
  {
    icon: BarChart3, title: 'Rapportages & Inzicht',
    description: 'Real-time dashboards voor omzet, marges, openstaande posten en teamproductiviteit.',
    color: 'from-indigo-500 to-blue-500', size: 'sm',
  },
]

function Features() {
  const { ref, isVisible } = useInView(0.05)

  return (
    <section id="features" className="relative py-24 sm:py-32 bg-slate-950">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`text-center mb-16 sm:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-[13px] font-semibold text-emerald-400 tracking-widest uppercase mb-4">Alles in de box</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Geen losse tools meer.<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Eén werkplek.</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            8 modules die naadloos samenwerken. Van klantcontact tot factuur, van e-mail tot nieuwsbrief.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500 overflow-hidden ${
                f.size === 'lg' ? 'lg:col-span-2 p-8' : 'p-6'
              } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {/* Hover glow */}
              <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500 blur-xl`} />

              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className={`${f.size === 'lg' ? 'text-[18px]' : 'text-[16px]'} font-bold text-white`} style={{ fontFamily: 'Manrope, sans-serif' }}>{f.title}</h3>
                    {f.tag && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{f.tag}</span>
                    )}
                  </div>
                </div>
                <p className={`${f.size === 'lg' ? 'text-[15px]' : 'text-[13.5px]'} leading-relaxed text-slate-400`} style={{ fontFamily: 'Inter, sans-serif' }}>
                  {f.description}
                </p>

                {/* Large card mockup preview */}
                {f.size === 'lg' && f.icon === Mail && (
                  <div className="mt-6 rounded-xl bg-slate-800/50 border border-white/5 p-4 overflow-hidden">
                    <div className="space-y-2">
                      {[
                        { from: 'Bakkerij Jansen', subject: 'Re: Offerte gevelreclame', time: '10:32', unread: true },
                        { from: 'Van Dijk Transport', subject: 'Factuur ontvangen, bedankt!', time: '09:15', unread: true },
                        { from: 'Restaurant De Haven', subject: 'Planning montage woensdag', time: 'Gisteren', unread: false },
                      ].map((mail) => (
                        <div key={mail.from} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${mail.unread ? 'bg-white/[0.03]' : ''} hover:bg-white/[0.05] transition-colors`}>
                          <div className="flex items-center gap-3 min-w-0">
                            {mail.unread && <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className={`text-[12px] ${mail.unread ? 'text-white font-semibold' : 'text-slate-400'} truncate`}>{mail.from}</p>
                              <p className="text-[11px] text-slate-500 truncate">{mail.subject}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-600 flex-shrink-0 ml-3">{mail.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {f.size === 'lg' && f.icon === Newspaper && (
                  <div className="mt-6 rounded-xl bg-slate-800/50 border border-white/5 p-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] text-slate-300 font-medium">Campagne: Winteracties 2025</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] text-emerald-400 font-semibold">Verstuurd</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Verstuurd', value: '248', color: 'text-white' },
                        { label: 'Geopend', value: '67%', color: 'text-emerald-400' },
                        { label: 'Geklikt', value: '23%', color: 'text-cyan-400' },
                        { label: 'Leads', value: '4', color: 'text-violet-400' },
                      ].map((s) => (
                        <div key={s.label} className="text-center p-2 rounded-lg bg-white/[0.03]">
                          <p className={`text-[14px] font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── TIME SAVINGS SECTION ──
function TimeSavings() {
  const { ref, isVisible } = useInView(0.1)

  const comparisons = [
    { task: 'Offerte opmaken', before: '45 min', after: '5 min', icon: FileText },
    { task: 'Factuur versturen', before: '20 min', after: '2 klikken', icon: Receipt },
    { task: 'E-mail beantwoorden', before: 'Alt-tab chaos', after: 'Direct in FORGEdesk', icon: Mail },
    { task: 'Nieuwsbrief versturen', before: 'Mailchimp + export', after: 'Ingebouwd', icon: Newspaper },
    { task: 'Planning maken', before: 'Excel + WhatsApp', after: 'Drag & drop', icon: CalendarDays },
    { task: 'Werkbon invullen', before: 'Papieren bon', after: 'Digitaal + foto', icon: ClipboardList },
  ]

  return (
    <section className="relative py-24 sm:py-32 bg-[#0B0F14]">
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-[13px] font-semibold text-emerald-400 tracking-widest uppercase mb-4">Meer tijd voor het echte werk</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Bespaar uren.{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Elke week.</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Geen Excel. Geen alt-tabben tussen 6 tools. Alles op één plek, zodat jij kunt doen waar je goed in bent.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisons.map((c, i) => (
            <div
              key={c.task}
              className={`group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <c.icon className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                <span className="text-[14px] font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>{c.task}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center py-2.5 rounded-lg bg-red-500/[0.06] border border-red-500/10">
                  <p className="text-[11px] text-red-400/60 mb-0.5">Voorheen</p>
                  <p className="text-[13px] text-red-400 font-medium line-through decoration-red-500/30">{c.before}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <div className="flex-1 text-center py-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                  <p className="text-[11px] text-emerald-400/60 mb-0.5">Nu</p>
                  <p className="text-[13px] text-emerald-400 font-semibold">{c.after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── HOW IT WORKS ──
function HowItWorks() {
  const { ref, isVisible } = useInView(0.1)

  const steps = [
    { number: '01', title: 'Account aanmaken', description: 'Maak gratis een account aan en stel je bedrijfsprofiel in. Importeer bestaande klanten met één klik.', icon: Zap },
    { number: '02', title: 'Eerste offerte versturen', description: 'Maak een professionele offerte met calculatie en verstuur direct. Je klant kan online goedkeuren.', icon: FileText },
    { number: '03', title: 'Groei je bedrijf', description: 'Plan montages, maak werkbonnen, factureer automatisch en houd real-time grip op je marges.', icon: TrendingUp },
  ]

  return (
    <section id="hoe-het-werkt" className="relative py-24 sm:py-32 bg-slate-950">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`text-center mb-16 sm:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-[13px] font-semibold text-emerald-400 tracking-widest uppercase mb-4">Hoe het werkt</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            In drie stappen live
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative group transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[calc(100%-8px)] w-[calc(100%-100px)] h-px">
                  <div className="w-full h-px bg-gradient-to-r from-emerald-500/30 to-transparent" />
                </div>
              )}
              <div className="text-center p-8 rounded-2xl border border-white/[0.04] bg-white/[0.01] group-hover:border-emerald-500/10 group-hover:bg-emerald-500/[0.02] transition-all duration-500">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="text-[12px] font-bold text-emerald-500/50 mb-2 tracking-widest">STAP {step.number}</div>
                <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>{step.title}</h3>
                <p className="text-[14px] leading-relaxed text-slate-400 max-w-xs mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── PRICING ──
function Pricing() {
  const { ref, isVisible } = useInView(0.1)
  const [teamSize, setTeamSize] = useState(5)

  const included = [
    'Onbeperkt offertes & facturen',
    'Volledige e-mail client',
    'Nieuwsbrieven builder',
    'Klantenbeheer (CRM)',
    'Montageplanning',
    'Digitale werkbonnen',
    'Rapportages & dashboards',
    'Nacalculatie & marges',
    'PDF export & templates',
    'Onbeperkt gebruikers',
    'Gratis updates & support',
    'Geen verborgen kosten',
  ]

  return (
    <section id="prijzen" className="relative py-24 sm:py-32 bg-[#0B0F14]">
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`text-center mb-16 sm:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-[13px] font-semibold text-emerald-400 tracking-widest uppercase mb-4">Transparante prijs</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Geen tiers. Geen verrassingen.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Gewoon €49 per maand.</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Of je nu 2 of 25 medewerkers hebt. Of je 10 of 1000 offertes per maand stuurt. De prijs blijft hetzelfde.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className={`grid lg:grid-cols-[1fr,1.2fr] gap-6 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Team size calculator */}
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8">
              <h3 className="text-[17px] font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Bereken je kosten</h3>

              <div className="mb-8">
                <label className="text-[13px] text-slate-400 mb-3 block">Hoeveel medewerkers heb je?</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setTeamSize(Math.max(1, teamSize - 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-4xl font-extrabold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>{teamSize}</span>
                    <p className="text-[12px] text-slate-500 mt-1">{teamSize === 1 ? 'medewerker' : 'medewerkers'}</p>
                  </div>
                  <button onClick={() => setTeamSize(Math.min(100, teamSize + 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 p-6 text-center">
                <p className="text-[12px] text-emerald-400/60 uppercase tracking-widest font-semibold mb-2">Jouw prijs</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-extrabold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>€49</span>
                  <span className="text-slate-500 text-lg">/maand</span>
                </div>
                <p className="text-[13px] text-emerald-400 mt-2 font-medium">
                  = €{(49 / teamSize).toFixed(2).replace('.', ',')} per medewerker
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Altijd. Ongeacht je teamgrootte.</p>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[12px] text-slate-400 text-center">
                  Bij {teamSize >= 10 ? 'vergelijkbare' : 'andere'} tools betaal je{' '}
                  <span className="text-red-400 font-semibold">€{(teamSize * 15).toLocaleString('nl-NL')}/maand</span>
                  {' '}voor {teamSize} gebruikers
                </p>
              </div>
            </div>

            {/* Feature list */}
            <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-transparent p-8 relative overflow-hidden">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-emerald-500/10 to-transparent blur-2xl opacity-40 pointer-events-none" />

              <div className="relative">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span className="text-[12px] font-semibold text-emerald-400">Alles inbegrepen</span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Alles. Echt alles.</h3>
                <p className="text-[14px] text-slate-400 mb-8">Geen add-ons, geen upsells, geen &ldquo;premium&rdquo; features.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {included.map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-[13px] text-slate-300" style={{ fontFamily: 'Inter, sans-serif' }}>{item}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/register"
                  className="group flex items-center justify-center gap-2 w-full py-4 text-[15px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:opacity-90 transition-all shadow-xl shadow-emerald-500/20"
                >
                  14 dagen gratis proberen
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── TESTIMONIALS ──
function Testimonials() {
  const { ref, isVisible } = useInView(0.1)

  const testimonials = [
    { quote: 'Eindelijk een tool die snapt hoe een reclamemaker werkt. Offertes met calculatie en marge — precies wat ik nodig had. En de ingebouwde e-mail is een game-changer.', author: 'Mark de Vries', role: 'Eigenaar, DeVries Signing', avatar: 'MV' },
    { quote: 'Onze montageplanning was altijd chaos. Nu ziet iedereen in het team wat er vandaag moet gebeuren. En de nieuwsbrieffunctie levert ons daadwerkelijk nieuwe klanten op.', author: 'Sandra Bakker', role: 'Projectleider, Bakker Reclame', avatar: 'SB' },
    { quote: 'Van offerte naar factuur in twee klikken. €49 voor ons hele team van 12 man — dat is belachelijk goedkoop voor wat je krijgt. Ik betaalde meer aan Mailchimp alleen.', author: 'Peter van Houten', role: 'Directeur, Van Houten Signs', avatar: 'PH' },
  ]

  return (
    <section id="reviews" className="relative py-24 sm:py-32 bg-slate-950">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`text-center mb-16 sm:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-[13px] font-semibold text-emerald-400 tracking-widest uppercase mb-4">Reviews</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Wat onze gebruikers zeggen
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.author}
              className={`group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-[15px] leading-relaxed text-slate-300 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-xs font-bold text-emerald-400">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-white">{t.author}</p>
                  <p className="text-[12px] text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CLOSING CTA ──
function ClosingCTA() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section className="relative py-24 sm:py-32 bg-[#0B0F14] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/8 rounded-full blur-[150px] animate-pulse-glow" />

      <div ref={ref} className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="text-[13px] text-slate-300">Geen creditcard nodig</span>
            <span className="text-[13px] text-slate-500">|</span>
            <span className="text-[13px] text-emerald-400 font-semibold">14 dagen gratis</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Klaar om te stoppen
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-gradient-shift">
              met rommelen?
            </span>
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Weg met die 6 losse tools. Eén werkplek, €49/maand, onbeperkt gebruikers. Start nu.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group relative inline-flex items-center justify-center gap-2 px-10 py-4.5 text-[16px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:opacity-90 transition-all shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02]"
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-shimmer opacity-20" />
              <span className="relative">Gratis starten</span>
              <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-[15px] font-medium text-slate-300 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all"
            >
              Ik heb al een account
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ──
function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/5 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="12" rx="2" /><path d="M8 20h8" /><path d="M12 16v4" />
                </svg>
              </div>
              <span className="text-[15px] font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>FORGEdesk</span>
            </div>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              De alles-in-één werkplek voor MKB-bedrijven. Offertes, facturen, e-mail, planning en meer.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[12px] font-semibold text-emerald-400">€49/maand — alles erin</span>
            </div>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Product</h4>
            <ul className="space-y-2.5">
              {['Features', 'Prijzen', 'Integraties', 'Updates'].map((item) => (
                <li key={item}><button onClick={() => document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })} className="text-[13px] text-slate-500 hover:text-white transition-colors">{item}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Bedrijf</h4>
            <ul className="space-y-2.5">
              {['Over ons', 'Blog', 'Vacatures', 'Contact'].map((item) => (
                <li key={item}><span className="text-[13px] text-slate-500 hover:text-white transition-colors cursor-pointer">{item}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Support</h4>
            <ul className="space-y-2.5">
              {['Helpcentrum', 'Documentatie', 'Status', 'Privacybeleid'].map((item) => (
                <li key={item}><span className="text-[13px] text-slate-500 hover:text-white transition-colors cursor-pointer">{item}</span></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-slate-600">© {new Date().getFullYear()} FORGEdesk. Alle rechten voorbehouden.</p>
          <div className="flex gap-6">
            {['Voorwaarden', 'Privacy', 'Cookies'].map((item) => (
              <span key={item} className="text-[12px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── MAIN LANDING PAGE ──
export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <TimeSavings />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <ClosingCTA />
      <Footer />
    </div>
  )
}
