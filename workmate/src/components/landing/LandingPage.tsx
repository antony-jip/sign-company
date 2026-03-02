import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Users,
  Receipt,
  CalendarDays,
  ClipboardList,
  BarChart3,
  ArrowRight,
  Check,
  Star,
  Menu,
  X,
  ChevronRight,
  Zap,
  Shield,
  Clock,
} from 'lucide-react'

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}

// ── NAVBAR ──
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              <svg className="w-4 h-4 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
              </svg>
            </div>
            <span className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Workmate
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Features', id: 'features' },
              { label: 'Hoe het werkt', id: 'hoe-het-werkt' },
              { label: 'Prijzen', id: 'prijzen' },
              { label: 'Reviews', id: 'reviews' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="px-3.5 py-2 text-[13.5px] text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-[13.5px] text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              Inloggen
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 text-[13.5px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
            >
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
          {[
            { label: 'Features', id: 'features' },
            { label: 'Hoe het werkt', id: 'hoe-het-werkt' },
            { label: 'Prijzen', id: 'prijzen' },
            { label: 'Reviews', id: 'reviews' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="block w-full text-left px-3 py-3 text-[15px] text-slate-300 hover:text-white rounded-lg hover:bg-white/5"
            >
              {item.label}
            </button>
          ))}
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/10">
            <Link to="/login" className="px-4 py-3 text-center text-[15px] text-white rounded-xl bg-white/5 border border-white/10">
              Inloggen
            </Link>
            <Link to="/register" className="px-4 py-3 text-center text-[15px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl">
              Gratis starten
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── HERO ──
function Hero() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section ref={ref} className="relative min-h-[100vh] flex items-center overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/6 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/4 rounded-full blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-20 sm:pt-36 sm:pb-28 w-full">
        <div className={`max-w-3xl transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12.5px] font-medium text-emerald-400 tracking-wide">Nu beschikbaar voor MKB</span>
          </div>

          <h1
            className="text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-white mb-6"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Alles voor je bedrijf.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300 bg-clip-text text-transparent">
              In één app.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-xl mb-10" style={{ fontFamily: 'Inter, sans-serif' }}>
            Offertes, facturen, planning, klantenbeheer en werkbonnen — alles wat je nodig hebt om je bedrijf professioneel te runnen. Zonder gedoe.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-14">
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[15px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:opacity-90 transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30"
            >
              Gratis starten
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[15px] font-medium text-slate-300 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Bekijk features
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              { icon: Zap, text: 'Direct aan de slag' },
              { icon: Shield, text: 'Veilig & betrouwbaar' },
              { icon: Clock, text: '14 dagen gratis proberen' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-[13px] text-slate-500">
                <Icon className="w-3.5 h-3.5 text-emerald-500/70" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className={`mt-16 sm:mt-20 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 bg-slate-900">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-8 py-1 rounded-md bg-white/5 text-[11px] text-slate-500 font-mono">app.workmate.nl</div>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Openstaand', value: '€ 24.850', accent: 'from-emerald-500/20 to-emerald-500/5', text: 'text-emerald-400' },
                  { label: 'Offertes', value: '12', accent: 'from-cyan-500/20 to-cyan-500/5', text: 'text-cyan-400' },
                  { label: 'Projecten', value: '8', accent: 'from-violet-500/20 to-violet-500/5', text: 'text-violet-400' },
                  { label: 'Deze maand', value: '€ 18.200', accent: 'from-amber-500/20 to-amber-500/5', text: 'text-amber-400' },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-lg bg-gradient-to-b ${stat.accent} border border-white/5 p-4`}>
                    <p className="text-[11px] text-slate-500 mb-1">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.text}`} style={{ fontFamily: 'Manrope, sans-serif' }}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { project: 'Gevelreclame Bakkerij Jansen', status: 'In productie', amount: '€ 3.450' },
                  { project: 'Autobelettering Van Dijk Transport', status: 'Offerte verstuurd', amount: '€ 1.890' },
                  { project: 'Lichtreclame Restaurant De Haven', status: 'Montage gepland', amount: '€ 6.200' },
                ].map((row) => (
                  <div key={row.project} className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[13px] text-slate-300 truncate mr-4">{row.project}</span>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="hidden sm:inline text-[11px] text-slate-500 bg-white/5 px-2.5 py-1 rounded-full">{row.status}</span>
                      <span className="text-[13px] font-semibold text-white">{row.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FEATURES ──
const FEATURES = [
  {
    icon: FileText,
    title: 'Offertes',
    description: 'Maak professionele offertes met calculatie, marge-overzicht en digitale handtekening. Verstuur direct per e-mail.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: Users,
    title: 'Klantenbeheer',
    description: 'Alle klantgegevens op één plek. Contactpersonen, projecthistorie, communicatielogboek en notities.',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    icon: Receipt,
    title: 'Facturatie',
    description: 'Van offerte naar factuur in één klik. Automatische nummerreeksen, BTW-berekening en betalingsherinneringen.',
    color: 'from-violet-500 to-violet-600',
  },
  {
    icon: CalendarDays,
    title: 'Planning',
    description: "Montageplanning met weekoverzicht, medewerker-agenda's en conflictdetectie. Alles op één kalender.",
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: ClipboardList,
    title: 'Werkbonnen',
    description: 'Digitale werkbonnen met foto-upload, materiaalregistratie en klanthandtekening. Onderweg en op locatie.',
    color: 'from-rose-500 to-rose-600',
  },
  {
    icon: BarChart3,
    title: 'Rapportages',
    description: 'Real-time inzicht in omzet, marges, openstaande posten en teamproductiviteit. Data die je helpt groeien.',
    color: 'from-blue-500 to-blue-600',
  },
]

function Features() {
  const { ref, isVisible } = useInView(0.1)

  return (
    <section id="features" className="relative py-24 sm:py-32 bg-slate-950">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`text-center mb-16 sm:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-[13px] font-semibold text-emerald-400 tracking-widest uppercase mb-4">Features</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Alles wat je nodig hebt
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Zes krachtige modules die naadloos samenwerken. Van eerste klantcontact tot laatste factuur.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 sm:p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`absolute -inset-px rounded-2xl bg-gradient-to-b ${feature.color} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 blur-xl`} />
              <div className="relative">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-[17px] font-bold text-white mb-2.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {feature.description}
                </p>
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
    { number: '01', title: 'Account aanmaken', description: 'Maak gratis een account aan en stel je bedrijfsprofiel in. Importeer bestaande klanten met één klik.' },
    { number: '02', title: 'Eerste offerte versturen', description: 'Maak een professionele offerte met calculatie en verstuur direct. Je klant kan online goedkeuren.' },
    { number: '03', title: 'Groei je bedrijf', description: 'Plan montages, maak werkbonnen, factureer automatisch en houd real-time grip op je marges.' },
  ]

  return (
    <section id="hoe-het-werkt" className="relative py-24 sm:py-32 bg-[#0B0F14]">
      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`text-center mb-16 sm:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-[13px] font-semibold text-emerald-400 tracking-widest uppercase mb-4">Hoe het werkt</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            In drie stappen aan de slag
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Geen ingewikkelde setup. Geen eindeloze configuratie. Start vandaag.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px bg-gradient-to-r from-emerald-500/30 to-transparent" />
              )}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 mb-6">
                  <span className="text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {step.title}
                </h3>
                <p className="text-[14.5px] leading-relaxed text-slate-400 max-w-xs mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {step.description}
                </p>
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

  const included = [
    'Onbeperkt offertes & facturen',
    'Klantenbeheer (CRM)',
    'Montageplanning',
    'Digitale werkbonnen',
    'E-mail integratie',
    'Rapportages & dashboards',
    'Nacalculatie & marges',
    'PDF export & templates',
    'Onbeperkt gebruikers',
    'Gratis updates & support',
  ]

  return (
    <section id="prijzen" className="relative py-24 sm:py-32 bg-slate-950">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div ref={ref} className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`text-center mb-16 sm:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-[13px] font-semibold text-emerald-400 tracking-widest uppercase mb-4">Prijzen</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Eén prijs. Alles erin.
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Geen verborgen kosten, geen beperkingen per tier. Gewoon alles wat je nodig hebt voor een eerlijke prijs.
          </p>
        </div>

        <div className={`max-w-lg mx-auto transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
          <div className="relative rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-8 sm:p-10">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-emerald-500/10 to-transparent blur-2xl opacity-50 pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span className="text-[12px] font-semibold text-emerald-400">Alles-in-één</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-5xl sm:text-6xl font-extrabold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>€49</span>
                <span className="text-slate-500 text-lg">/maand</span>
              </div>
              <p className="text-[14px] text-slate-400 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
                Per bedrijf. Inclusief alle modules en onbeperkt gebruikers.
              </p>
              <Link
                to="/register"
                className="group flex items-center justify-center gap-2 w-full py-3.5 text-[15px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:opacity-90 transition-all shadow-xl shadow-emerald-500/20 mb-8"
              >
                14 dagen gratis proberen
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {included.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-[13.5px] text-slate-300" style={{ fontFamily: 'Inter, sans-serif' }}>{item}</span>
                  </div>
                ))}
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
    { quote: 'Eindelijk een tool die snapt hoe een reclamemaker werkt. Offertes met calculatie en marge — precies wat ik nodig had.', author: 'Mark de Vries', role: 'Eigenaar, DeVries Signing', avatar: 'MV' },
    { quote: 'Onze montageplanning was altijd chaos. Nu ziet iedereen in het team wat er vandaag moet gebeuren. Scheelt mij uren per week.', author: 'Sandra Bakker', role: 'Projectleider, Bakker Reclame', avatar: 'SB' },
    { quote: 'Van offerte naar factuur in twee klikken. Mijn boekhouder is blij, mijn klanten zijn blij, en ik heb meer tijd voor het echte werk.', author: 'Peter van Houten', role: 'Directeur, Van Houten Signs', avatar: 'PH' },
  ]

  return (
    <section id="reviews" className="relative py-24 sm:py-32 bg-[#0B0F14]">
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
              className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
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
    <section className="relative py-24 sm:py-32 bg-slate-950 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/8 rounded-full blur-[120px]" />

      <div ref={ref} className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Klaar om je bedrijf te
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              stroomlijnen?
            </span>
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Probeer Workmate 14 dagen gratis. Geen creditcard nodig, geen verplichtingen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-[15px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:opacity-90 transition-all shadow-xl shadow-emerald-500/20"
            >
              Gratis starten
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
                  <rect x="2" y="4" width="20" height="12" rx="2" />
                  <path d="M8 20h8" />
                  <path d="M12 16v4" />
                </svg>
              </div>
              <span className="text-[15px] font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>Workmate</span>
            </div>
            <p className="text-[13px] text-slate-500 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              De alles-in-één werkplek voor MKB-bedrijven in de signing & reclamebranche.
            </p>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Product</h4>
            <ul className="space-y-2.5">
              {['Features', 'Prijzen', 'Integraties', 'Updates'].map((item) => (
                <li key={item}>
                  <button onClick={() => document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })} className="text-[13px] text-slate-500 hover:text-white transition-colors">
                    {item}
                  </button>
                </li>
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
          <p className="text-[12px] text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
            © {new Date().getFullYear()} Workmate. Alle rechten voorbehouden.
          </p>
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
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <ClosingCTA />
      <Footer />
    </div>
  )
}
