import { useState } from 'react'
import { Zap, ChevronRight, Mail, Sparkles, ArrowRight, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──

interface Feature {
  titel: string
  beschrijving: string
}

interface ChangelogEntry {
  versie: string
  datum: string
  label: 'Nieuw' | 'Verbeterd' | 'Fix'
  titel: string
  beschrijving: string
  features: Feature[]
}

const LABEL_STYLE: Record<string, { bg: string; text: string }> = {
  Nieuw: { bg: '#F15025', text: '#FFFFFF' },
  Verbeterd: { bg: '#1A535C', text: '#FFFFFF' },
  Fix: { bg: '#2D6B48', text: '#FFFFFF' },
}

// ── All features currently in the app ──

const APP_FEATURES = [
  { naam: 'Dashboard', desc: 'Omzet, taken, planning en activiteit in één overzicht. Widgets verplaatsen en resizen.', kleur: '#1A535C' },
  { naam: 'Projecten', desc: 'Cockpit per project met briefing, taken, offertes, montage en bestanden.', kleur: '#1A535C' },
  { naam: 'Offertes', desc: 'Professionele offertes met calculatie, PDF, autosave en versioning.', kleur: '#F15025' },
  { naam: 'Facturen', desc: 'Factureren op basis van offertes. Mollie betaallink, automatische herinneringen.', kleur: '#2D6B48' },
  { naam: 'Klantenbeheer', desc: 'Contactpersonen, vestigingen, complete klanthistorie.', kleur: '#3A6B8C' },
  { naam: 'Klantportaal', desc: 'Deel tekeningen, offertes en updates. Klant keurt goed met één klik.', kleur: '#6A5A8A' },
  { naam: 'Werkbonnen', desc: 'Opdracht voor de monteur. Neemt offerte over, foto\'s, klanthandtekening.', kleur: '#F15025' },
  { naam: 'Montageplanning', desc: 'Weekoverzicht met drag-and-drop. Weerbericht, conflict-detectie.', kleur: '#1A535C' },
  { naam: 'Takenbeheer', desc: 'Taken toewijzen met deadlines en prioriteiten. Weekplanning met tijdlijn.', kleur: '#5A5A55' },
  { naam: 'Email', desc: 'Verstuur en ontvang email vanuit de app. Automatisch gekoppeld aan klanten.', kleur: '#6A5A8A' },
  { naam: 'AI Visualizer', desc: 'Upload een foto, laat AI het eindresultaat visualiseren voor je klant.', kleur: '#9A5A48' },
  { naam: 'Financieel', desc: 'Omzet, openstaand, cashflow. Grootboek, BTW-codes, exporteer naar CSV.', kleur: '#2D6B48' },
  { naam: 'Kennisbank', desc: 'Handleidingen en procedures. Alles over Doen. op één plek.', kleur: '#1A535C' },
  { naam: 'Calculatie-templates', desc: 'Sla veelgebruikte producten op als template voor snellere offertes.', kleur: '#F15025' },
  { naam: 'Document stijl', desc: 'Logo, kleuren en lettertype. Alle documenten automatisch in jouw huisstijl.', kleur: '#9A5A48' },
  { naam: 'Automatische opvolging', desc: 'Herinneringen voor openstaande offertes. Nooit meer een deal missen.', kleur: '#F15025' },
  { naam: 'Bestelbonnen', desc: 'Materiaal bestellen bij leveranciers, gekoppeld aan projecten.', kleur: '#1A535C' },
  { naam: 'Importeren', desc: 'Klanten, producten en data importeren vanuit CSV.', kleur: '#3A6B8C' },
]

// ── Changelog entries ──

const CHANGELOG: ChangelogEntry[] = [
  {
    versie: '1.4.0',
    datum: '26 maart 2025',
    label: 'Nieuw',
    titel: 'Kennisbank & drag-and-drop planning',
    beschrijving: 'Grote update met kennisbank, verbeterde montageplanning en compactere formulieren.',
    features: [
      { titel: 'Kennisbank', beschrijving: 'Nieuwe pagina met alle handleidingen over Doen. Visueel workflow spectrum, zoekfunctie en categorie filters.' },
      { titel: 'Drag-and-drop planning', beschrijving: 'Sleep "te plannen" projecten direct naar een dag in de montageplanning. Smooth drag met custom ghost images.' },
      { titel: 'Compactere formulieren', beschrijving: 'Project aanmaken en offerte wizard in minder stappen. Alles past op één scherm.' },
      { titel: 'PDF bij factuur email', beschrijving: 'Factuur PDF wordt nu automatisch als bijlage meegestuurd bij het versturen per email.' },
      { titel: 'Dashboard redesign', beschrijving: 'Nieuwe statistieken kaarten met kleur-iconen, hit rate ring chart en hover effecten.' },
    ],
  },
  {
    versie: '1.3.0',
    datum: '18 maart 2025',
    label: 'Nieuw',
    titel: 'Klantportaal & automatische opvolging',
    beschrijving: 'Deel offertes en tekeningen met je klant via een uniek portaal. Plus automatische offerte opvolging.',
    features: [
      { titel: 'Klantportaal', beschrijving: 'Activeer een portaal per project. Klant kan offertes goedkeuren, berichten sturen en bestanden uploaden.' },
      { titel: 'Offerte opvolging', beschrijving: 'Stel automatische herinneringen in voor verstuurde offertes. Configureerbaar per aantal dagen.' },
      { titel: 'AI Visualizer', beschrijving: 'Upload een situatiefoto en laat AI visualiseren hoe het eindresultaat eruitziet.' },
    ],
  },
  {
    versie: '1.2.0',
    datum: '4 maart 2025',
    label: 'Verbeterd',
    titel: 'Werkbonnen & montageplanning',
    beschrijving: 'Werkbonnen genereren vanuit offertes en montages plannen met weerbericht integratie.',
    features: [
      { titel: 'Werkbonnen', beschrijving: 'Maak werkbonnen aan gekoppeld aan project en offerte. Alle regels worden overgenomen.' },
      { titel: 'Montageplanning', beschrijving: 'Weekoverzicht per monteur met weerbericht, conflict-detectie en status management.' },
      { titel: 'Monteur feedback', beschrijving: 'Uren registreren, opmerkingen, foto\'s uploaden en klanthandtekening op de werkbon.' },
    ],
  },
  {
    versie: '1.1.0',
    datum: '17 februari 2025',
    label: 'Nieuw',
    titel: 'Facturatie & Mollie betalingen',
    beschrijving: 'Professionele facturen met online betaallink en automatische herinneringen.',
    features: [
      { titel: 'Facturatie', beschrijving: 'Facturen aanmaken op basis van goedgekeurde offertes. PDF generatie en email verzending.' },
      { titel: 'Mollie integratie', beschrijving: 'Online betaallink op je factuur. Klant betaalt met iDEAL, creditcard of bankoverschrijving.' },
      { titel: 'Automatische herinneringen', beschrijving: 'Bij vervallen facturen: herinnering na 7, 14 en 21 dagen, aanmaning na 30 dagen.' },
    ],
  },
  {
    versie: '1.0.0',
    datum: '1 februari 2025',
    label: 'Nieuw',
    titel: 'Doen. is live',
    beschrijving: 'De eerste versie van Doen. Projecten, offertes, klanten en het dashboard.',
    features: [
      { titel: 'Projecten', beschrijving: 'Project cockpit met briefing, taken, bestanden en activiteit feed.' },
      { titel: 'Offertes', beschrijving: 'Professionele offertes met calculatie, PDF download en email verzending.' },
      { titel: 'Klantenbeheer', beschrijving: 'Klantprofielen met contactpersonen, vestigingen en volledige historie.' },
      { titel: 'Dashboard', beschrijving: 'Omzet, openstaande offertes, planning en taken in één overzicht.' },
    ],
  },
]

// ── Component ──

export function ChangelogPage() {
  const [tab, setTab] = useState<'changelog' | 'features'>('changelog')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in-up">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#1A535C' }}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-[28px] font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
              What's new<span style={{ color: '#F15025' }}>.</span>
            </h1>
            <p className="text-[14px]" style={{ color: '#6B6B66' }}>Alles wat we bouwen, in één overzicht</p>
          </div>
        </div>

        {/* Tab switch + feedback */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F4F2EE' }}>
            <button
              onClick={() => setTab('changelog')}
              className={cn('h-9 px-5 rounded-lg text-[13px] font-semibold transition-all', tab === 'changelog' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B66]')}
            >
              Changelog
            </button>
            <button
              onClick={() => setTab('features')}
              className={cn('h-9 px-5 rounded-lg text-[13px] font-semibold transition-all', tab === 'features' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B66]')}
            >
              Alle features
            </button>
          </div>

          <a
            href="mailto:hello@doen.team"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: '#F8F7F5', border: '1px solid #E6E4E0', color: '#6B6B66' }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Suggestie? hello@doen.team
          </a>
        </div>
      </div>

      {/* ── Features tab ── */}
      {tab === 'features' && (
        <div>
          <p className="text-[14px] mb-6" style={{ color: '#6B6B66' }}>
            Alles wat er nu in Doen. zit. <strong className="text-[#1A1A1A]">{APP_FEATURES.length} features</strong>, gebouwd voor creatieve maakbedrijven.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {APP_FEATURES.map((f, idx) => (
              <div
                key={f.naam}
                className="rounded-xl p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm animate-stagger-item"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E4E0', animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.kleur }} />
                  <span className="text-[14px] font-bold" style={{ color: '#1A1A1A' }}>{f.naam}</span>
                </div>
                <p className="text-[12px] leading-relaxed pl-[18px]" style={{ color: '#6B6B66' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Changelog tab ── */}
      {tab === 'changelog' && (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ backgroundColor: '#E6E4E0' }} />

          <div className="space-y-10">
            {CHANGELOG.map((entry, idx) => {
              const ls = LABEL_STYLE[entry.label]
              return (
                <div key={entry.versie} className="relative pl-12 animate-stagger-item" style={{ animationDelay: `${idx * 60}ms` }}>
                  {/* Timeline dot */}
                  <div className="absolute left-[14px] top-1 w-[12px] h-[12px] rounded-full border-2 border-white z-10" style={{ backgroundColor: ls.bg }} />

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: ls.bg, color: ls.text }}
                    >
                      {entry.label}
                    </span>
                    <span className="text-[14px] font-bold font-mono" style={{ color: '#1A1A1A' }}>{entry.versie}</span>
                    <span className="text-[12px]" style={{ color: '#9B9B95' }}>{entry.datum}</span>
                  </div>

                  {/* Title + description */}
                  <h3 className="text-[18px] font-bold tracking-tight mb-1" style={{ color: '#1A1A1A' }}>{entry.titel}</h3>
                  <p className="text-[13px] mb-4" style={{ color: '#6B6B66' }}>{entry.beschrijving}</p>

                  {/* Features */}
                  <div className="space-y-2">
                    {entry.features.map(f => (
                      <div key={f.titel} className="rounded-lg p-3" style={{ backgroundColor: '#F8F7F5' }}>
                        <span className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>{f.titel}</span>
                        <span className="text-[12px] ml-2" style={{ color: '#6B6B66' }}>{f.beschrijving}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="mt-16 text-center rounded-2xl p-8" style={{ backgroundColor: '#1A535C' }}>
        <h3 className="text-[20px] font-bold text-white mb-2">Iets missen? Laat het weten.</h3>
        <p className="text-[14px] text-white/50 mb-5">We bouwen Doen. samen met onze gebruikers.</p>
        <a
          href="mailto:hello@doen.team"
          className="inline-flex items-center gap-2 h-11 px-6 text-[14px] font-bold text-[#1A535C] bg-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Mail className="h-4 w-4" />
          hello@doen.team
        </a>
      </div>

      {/* Footer */}
      <div className="text-center mt-10 pb-8">
        <p className="text-[14px] font-heading font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
          Doen<span style={{ color: '#F15025' }}>.</span>
        </p>
        <p className="text-[12px] mt-1" style={{ color: '#9B9B95' }}>
          Gebouwd voor creatieve maakbedrijven
        </p>
      </div>
    </div>
  )
}
