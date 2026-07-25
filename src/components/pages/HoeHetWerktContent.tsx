'use client'

import {
  ArrowLeft, CalendarClock, Check, CheckCircle2, CloudRain, Download, Send, Sparkles, Sun,
} from 'lucide-react'
import CTASection from '@/components/home/CTASection'
import Journey from '@/components/home/Journey'
import {
  spaceGrotesk, PETROL, PETROL_DEEP, FLAME, INK, MUTED, LINE, BG, CARD,
  HAIRLINE, PANEL_SHADOW, STATUS, SERIF_ITALIC,
} from '@/components/app-ui/tokens'

/* ─────────────────────────────────────────────────────────────────
   Hero · kop, één zin, en meteen het diagram. Geen aanloop: wie
   hier binnenkomt vanuit een outreach-mail ziet de hele flow voor
   de eerste scroll. De pijn staat op de homepage, niet hier.
   ───────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="bg-bg">
      <div className="container-site pt-28 md:pt-40 pb-4 md:pb-8">
        <h1
          className="font-heading font-bold text-petrol leading-[1.0] mb-6 max-w-3xl"
          style={{ fontSize: 'clamp(34px, 5.2vw, 68px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
        >
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span className="hero-line" style={{ animationDelay: '0.05s' }}>
              Van aanvraag tot betaald.
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span className="hero-line" style={{ animationDelay: '0.15s' }}>
              In zeven stappen<span className="text-flame">.</span>
            </span>
          </span>
        </h1>

        <p
          className="hero-fade text-[16px] md:text-[19px] leading-[1.6] text-muted max-w-xl"
          style={{ animationDelay: '0.3s' }}
        >
          Eén klus, van de eerste klantvraag tot de betaalde factuur. Elk scherm
          hieronder komt uit de app.
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
   De zeven stappen · per stap één regel en het scherm erbij.
   Laten zien wint van vertellen, dus geen body-paragraaf en geen
   zonder/met-vergelijking: die boodschap staat op de homepage.
   ───────────────────────────────────────────────────────────────── */

type FlowStep = {
  nr: string
  title: string
  line: string
}

const flowSteps: FlowStep[] = [
  {
    nr: '01',
    title: 'Aanvraag binnen',
    line: 'Via je website, je mail of de telefoon: alles landt op één plek, gekoppeld aan de klant. Daan vat samen wat er gevraagd wordt.',
  },
  {
    nr: '02',
    title: 'Offerte uit template',
    line: 'Je producten en marges staan klaar, dus calculeren kost minuten. Na het versturen zie je wie hem opent, en wie je moet opvolgen.',
  },
  {
    nr: '03',
    title: 'Klant in het portaal',
    line: 'Eén link, geen inlog. Tekening, offerte en factuur staan op volgorde. Je klant keurt goed of reageert met één klik.',
  },
  {
    nr: '04',
    title: 'Akkoord, direct in de planning',
    line: 'Sleep het project naar een dag en zet je monteur erbij. De werkbon maakt zichzelf en schuift mee als je verplaatst.',
  },
  {
    nr: '05',
    title: 'Op locatie',
    line: "Je monteur werkt vanaf zijn telefoon: uren, foto's en de handtekening van de klant. Jij ziet het live in het project.",
  },
  {
    nr: '06',
    title: 'Factuur de deur uit',
    line: 'Offerte wordt factuur in één klik, met Mollie-betaallink. De gegevens gaan door naar Exact Online, geen dubbele invoer.',
  },
  {
    nr: '07',
    title: 'Gedaan',
    line: 'Alles afgehandeld en terug te vinden bij de klant. Wat de klus werkelijk verdiend heeft, lees je af in de nacalculatie.',
  },
]

function Stappen() {
  return (
    <section className="bg-white">
      <div className="container-site pt-4 md:pt-8 pb-16 md:pb-24">
        <div className="border-b border-petrol/10">
          {flowSteps.map((step) => (
            <StepBlock key={step.nr} step={step} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StepBlock({ step }: { step: FlowStep }) {
  return (
    <div
      id={`stap-${step.nr}`}
      className="border-t border-petrol/10 py-8 md:py-12 grid md:grid-cols-2 gap-6 md:gap-14 items-center scroll-mt-24"
    >
      <div>
        <p className="text-[13px] font-semibold text-flame mb-2">Stap {Number(step.nr)} van 7</p>
        <h2
          className="font-heading text-[24px] md:text-[30px] font-bold text-petrol leading-tight mb-3"
          style={{ letterSpacing: '-0.025em' }}
        >
          {step.title}
          <span className="text-flame">.</span>
        </h2>
        <p className="text-[15px] md:text-[16px] leading-[1.6] text-muted max-w-md">{step.line}</p>
      </div>

      <div className="md:justify-self-end">
        <StepMockup nr={step.nr} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   De zeven schermen · nagebouwd in de vormtaal van de échte app.

   Tokens komen uit @/components/app-ui/tokens, dezelfde bron als de
   klikbare showcase op de homepage. Wat de app doet en hier terugkomt:
   witte panelen met hairline-rand en zachte schaduw, cijfers in Space
   Grotesk met tabular-nums, een status als woord met flame-punt
   ("Gepland.") in plaats van een gekleurde pil, en secundaire bijzinnen
   in serif-italic.
   ───────────────────────────────────────────────────────────────── */

function StepMockup({ nr }: { nr: string }) {
  switch (nr) {
    case '01': return <MockupAanvraag />
    case '02': return <MockupOfferte />
    case '03': return <MockupPortaal />
    case '04': return <MockupPlanning />
    case '05': return <MockupWerkbon />
    case '06': return <MockupFactuur />
    case '07': return <MockupGedaan />
    default: return null
  }
}

/* Het paneel zoals de app het tekent: hairline-rand, zachte diepte,
   geen harde border. */
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`w-full max-w-[440px] rounded-[12px] overflow-hidden ${spaceGrotesk.className} ${className}`}
      style={{ backgroundColor: CARD, border: `1px solid ${HAIRLINE}`, boxShadow: PANEL_SHADOW }}
    >
      {children}
    </div>
  )
}

/* Statusnotatie van de app: het woord in zijn eigen kleur, punt in flame. */
function Status({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[11.5px] font-semibold shrink-0" style={{ color }}>
      {label}
      <span style={{ color: FLAME }}>.</span>
    </span>
  )
}

function Serif({ children }: { children: React.ReactNode }) {
  return (
    <span className="italic font-normal" style={{ color: MUTED, fontFamily: SERIF_ITALIC }}>
      {children}
    </span>
  )
}

/* Kolomkop-label: mono, klein, wijd gespatieerd. */
function Kop({ children, color = MUTED }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase" style={{ color }}>
      {children}
    </p>
  )
}

/* 01 · Aanvragen-inbox met de samenvatting van Daan. */
function MockupAanvraag() {
  return (
    <Panel>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
        <p className="font-heading text-[15px] font-bold leading-none inline-flex items-baseline gap-2" style={{ color: INK }}>
          Aanvragen<span style={{ color: FLAME }}>.</span>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: MUTED }}>12</span>
        </p>
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ backgroundColor: 'rgba(241,80,37,0.10)', color: FLAME }}
        >
          <span className="w-1.5 h-1.5 rounded-full motion-safe:animate-pulse" style={{ backgroundColor: FLAME }} />
          1 nieuw
        </span>
      </div>

      <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="flex items-start gap-2.5">
          <span
            className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ backgroundColor: '#7BA89A' }}
          >
            J
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-bold truncate" style={{ color: INK }}>Jansen Bouw</p>
              <span className="text-[10px] tabular-nums shrink-0" style={{ color: MUTED }}>08:15</span>
            </div>
            <p className="text-[10.5px] truncate" style={{ color: MUTED }}>contact@jansenbouw.nl · via signcompany.nl</p>
            <p className="text-[12px] leading-[1.5] mt-1.5" style={{ color: INK }}>
              Interesse in gevelreclame voor ons nieuwe pand. Ongeveer 8 meter breed, met LED-verlichting.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3" style={{ backgroundColor: 'rgba(26,83,92,0.04)' }}>
        <p className="inline-flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3 h-3" style={{ color: PETROL }} strokeWidth={2} />
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: PETROL }}>Daan</span>
          <Serif>vat samen</Serif>
        </p>
        <p className="text-[11.5px] leading-[1.5]" style={{ color: INK }}>
          Nieuwe klant, gevelreclame ±8 m met verlichting. Vraagt om een inmeetafspraak.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-bold text-white" style={{ backgroundColor: FLAME }}>
            Maak project
          </span>
          <span className="inline-flex items-center h-7 px-3 rounded-md text-[11px] font-semibold" style={{ color: MUTED, border: `1px solid ${LINE}`, backgroundColor: CARD }}>
            Beantwoord
          </span>
        </div>
      </div>
    </Panel>
  )
}

/* 02 · Offerte bewerken: regels met inkoop, marge en verkoop. */
function MockupOfferte() {
  const regels = [
    { naam: 'Gevelreclame frame 800×60', inkoop: '1.180,00', marge: '36%', totaal: '1.850,00' },
    { naam: 'LED-verlichting 5 m', inkoop: '215,00', marge: '38%', totaal: '340,00' },
    { naam: 'Montage · 2 monteurs', inkoop: '260,00', marge: '38%', totaal: '420,00' },
  ]
  return (
    <Panel>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold mb-1.5" style={{ color: MUTED }}>
          <ArrowLeft className="w-3 h-3" strokeWidth={2} /> Offertes
          <span>·</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] tabular-nums" style={{ backgroundColor: BG, border: `1px solid ${LINE}` }}>
            OFF-2026-236
          </span>
        </p>
        <div className="flex items-end justify-between gap-3">
          <p className="font-heading text-[17px] font-bold leading-none" style={{ color: INK }}>
            Offerte bewerken<span style={{ color: FLAME }}>.</span>
            <span className="ml-2 text-[10.5px]"><Serif>t/m 16 jun</Serif></span>
          </p>
          <Status label="Concept" color={STATUS.gepland} />
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 pb-1.5" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex-1"><Kop>Regel</Kop></div>
          <div className="w-[54px] text-right"><Kop>Inkoop</Kop></div>
          <div className="w-[34px] text-right"><Kop>Marge</Kop></div>
          <div className="w-[58px] text-right"><Kop>Verkoop</Kop></div>
        </div>
        {regels.map((r) => (
          <div key={r.naam} className="flex items-center gap-2 py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
            <p className="flex-1 text-[11.5px] truncate" style={{ color: INK }}>{r.naam}</p>
            <p className="w-[54px] text-right text-[11px] tabular-nums" style={{ color: MUTED }}>{r.inkoop}</p>
            <p className="w-[34px] text-right text-[11px] font-semibold tabular-nums" style={{ color: STATUS.afgerond }}>{r.marge}</p>
            <p className="w-[58px] text-right text-[11.5px] font-bold tabular-nums" style={{ color: INK }}>{r.totaal}</p>
          </div>
        ))}
        <div className="flex items-baseline justify-between pt-2.5">
          <p className="text-[11px] font-semibold" style={{ color: MUTED }}>
            Totaal <Serif>excl. btw</Serif>
          </p>
          <p className="font-heading text-[19px] font-bold leading-none tabular-nums" style={{ color: INK }}>€ 2.610,00</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: `1px solid ${LINE}`, backgroundColor: BG }}>
        <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold" style={{ color: MUTED, border: `1px solid ${LINE}`, backgroundColor: CARD }}>
          <Download className="w-3 h-3" strokeWidth={2} /> PDF
        </span>
        <span className="inline-flex items-center h-8 px-3 rounded-md text-[11px] font-bold text-white" style={{ backgroundColor: PETROL_DEEP }}>
          Opslaan
        </span>
        <span
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[11px] font-bold text-white ml-auto"
          style={{ backgroundColor: FLAME, boxShadow: '0 6px 16px rgba(241,80,37,0.28)' }}
        >
          <Send className="w-3 h-3" strokeWidth={2.4} /> Verstuur
        </span>
      </div>
    </Panel>
  )
}

/* 03 · Het klantportaal, dus geen app-chrome maar de publieke pagina:
   petrol-header met stippatroon, feed-kaart met flame-accent bovenaan. */
function MockupPortaal() {
  return (
    <Panel>
      <div className="relative overflow-hidden" style={{ backgroundColor: PETROL }}>
        <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.08]" aria-hidden>
          <defs>
            <pattern id="portaal-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="2" fill={FLAME} />
              <circle cx="16" cy="16" r="1.5" fill="#ffffff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#portaal-dots)" />
        </svg>
        <div className="relative px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-heading text-[14px] font-extrabold text-white leading-none tracking-tight">Mark Signing</p>
            <p className="text-[10.5px] text-white/60 truncate mt-1">Gevelreclame nieuw pand</p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <CalendarClock className="w-3 h-3" strokeWidth={2} />
            <span className="tabular-nums">Geldig tot 16 juni 2026</span>
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: BG }} className="px-3 py-3.5">
        <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: FLAME }} />
        <div className="rounded-b-[10px] bg-white px-4 py-3.5" style={{ border: '0.5px solid #E8E6E1' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: INK }}>Offerte gevelreclame</p>
              <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Frame, verlichting en montage</p>
            </div>
            <Status label="verstuurd" color={STATUS.verstuurd} />
          </div>
          <p className="text-[17px] font-medium mt-2 tabular-nums" style={{ color: INK }}>
            € 2.610,00
            <span className="ml-1.5 text-[10.5px] font-normal" style={{ color: MUTED }}>excl. btw</span>
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-flex items-center justify-center gap-1.5 flex-1 h-9 rounded-lg text-[12px] font-bold text-white" style={{ backgroundColor: FLAME }}>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Akkoord geven
            </span>
            <span className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-[12px] font-semibold" style={{ color: PETROL, border: `1px solid ${LINE}` }}>
              Vragen stellen
            </span>
          </div>
          <p className="text-[10px] mt-2.5 text-center" style={{ color: MUTED }}>Geen account of wachtwoord nodig.</p>
        </div>
      </div>
    </Panel>
  )
}

/* 04 · Weekplanning: dagkoppen met weer, blokken met statusstreep. */
function MockupPlanning() {
  const dagen = [
    { d: 'Ma', datum: '18/5', temp: '15°', regen: true, vandaag: true },
    { d: 'Di', datum: '19/5', temp: '15°', regen: true },
    { d: 'Wo', datum: '20/5', temp: '14°', regen: true },
    { d: 'Do', datum: '21/5', temp: '16°', regen: false },
    { d: 'Vr', datum: '22/5', temp: '18°', regen: false },
  ]
  return (
    <Panel>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
        <p className="font-heading text-[15px] font-bold leading-none inline-flex items-baseline gap-2" style={{ color: INK }}>
          Planning<span style={{ color: FLAME }}>.</span>
          <span className="text-[11px] font-semibold" style={{ color: MUTED }}>week 21</span>
        </p>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: FLAME }}>
          <span className="rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: FLAME, width: 15, height: 15 }}>2</span>
          Te plannen
        </span>
      </div>

      <div className="grid grid-cols-5" style={{ borderBottom: `1px solid ${LINE}` }}>
        {dagen.map((d) => (
          <div
            key={d.d}
            className="px-1.5 py-2 text-center"
            style={{ backgroundColor: d.vandaag ? 'rgba(26,83,92,0.05)' : 'transparent' }}
          >
            <p className="text-[10px] font-bold" style={{ color: d.vandaag ? PETROL : INK }}>{d.d}</p>
            <p className="text-[9px] tabular-nums" style={{ color: MUTED }}>{d.datum}</p>
            <p className="inline-flex items-center justify-center gap-0.5 mt-1 text-[9px] tabular-nums" style={{ color: MUTED }}>
              {d.regen ? <CloudRain className="w-2.5 h-2.5" strokeWidth={2} /> : <Sun className="w-2.5 h-2.5" strokeWidth={2} />}
              {d.temp}
            </p>
          </div>
        ))}
      </div>

      <div className="p-3 space-y-2" style={{ backgroundColor: BG }}>
        <PlanBlok
          tijd="08:00 – 12:00"
          titel="Montage gevelreclame"
          klant="Jansen Bouw · Beemster"
          ref="WB-2026-039"
          stripe="#4A7AC7"
          bg="#E8EEF9"
          tekst={STATUS.actief}
          status="Gepland"
          crew="Mark + Sophie"
        />
        <PlanBlok
          tijd="13:00 – 15:00"
          titel="Inmeten reclamezuil"
          klant="Café De Zon"
          stripe="#CBC9C4"
          bg="#F3F2EF"
          tekst="#9B9B95"
          status="Afgerond"
        />
      </div>
    </Panel>
  )
}

function PlanBlok({
  tijd, titel, klant, ref: refnr, stripe, bg, tekst, status, crew,
}: {
  tijd: string; titel: string; klant: string; ref?: string
  stripe: string; bg: string; tekst: string; status: string; crew?: string
}) {
  return (
    <div className="rounded-[8px] overflow-hidden flex" style={{ backgroundColor: bg }}>
      <div className="w-[3px] shrink-0" style={{ backgroundColor: stripe }} />
      <div className="flex-1 min-w-0 px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-semibold tabular-nums" style={{ color: tekst }}>{tijd}</p>
          <Status label={status} color={tekst} />
        </div>
        <p className="text-[12px] font-bold truncate mt-0.5" style={{ color: INK }}>{titel}</p>
        <p className="text-[10.5px] truncate" style={{ color: MUTED }}>{klant}</p>
        {(refnr || crew) && (
          <p className="flex items-center gap-2 mt-1 text-[9.5px] tabular-nums" style={{ color: MUTED }}>
            {refnr && <span className="px-1.5 py-0.5 rounded-[3px]" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>{refnr}</span>}
            {crew && <span>{crew}</span>}
          </p>
        )}
      </div>
    </div>
  )
}

/* 05 · De werkbon op de telefoon van de monteur. De app zet hier geen
   randen om de kaarten, alleen een lichte schaduw op een warme grijstint. */
function MockupWerkbon() {
  const kaarten = [
    { label: 'Uren', waarde: '6:45', sub: 'Mark 3:30 · Sophie 3:15' },
    { label: "Foto's", waarde: '3', sub: 'gevel voor, tijdens, na' },
  ]
  return (
    <div className={`w-full max-w-[260px] rounded-[22px] overflow-hidden ${spaceGrotesk.className}`} style={{ backgroundColor: BG, border: `1px solid ${HAIRLINE}`, boxShadow: PANEL_SHADOW }}>
      <div className="px-4 pt-4 pb-3">
        <p className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: MUTED }}>WB-2026-039</span>
          <span className="text-[11px]" style={{ color: MUTED }}>
            In uitvoering<span style={{ color: FLAME }}>.</span>
          </span>
        </p>
        <p className="text-[16px] font-semibold leading-tight mt-0.5" style={{ color: INK }}>Montage gevelreclame</p>
      </div>

      <div className="px-3 pb-3 space-y-2.5">
        <div className="bg-white rounded-xl p-3.5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <Kop>Klant</Kop>
          <p className="text-[13px] font-medium mt-1" style={{ color: INK }}>Jansen Bouw</p>
          <div className="flex gap-5 mt-2.5">
            <div>
              <Kop>Datum</Kop>
              <p className="text-[11.5px] mt-0.5 tabular-nums" style={{ color: INK }}>20 mei</p>
            </div>
            <div>
              <Kop>Locatie</Kop>
              <p className="text-[11.5px] mt-0.5" style={{ color: INK }}>Beemster</p>
            </div>
          </div>
        </div>

        {kaarten.map((k) => (
          <div key={k.label} className="bg-white rounded-xl p-3.5 flex items-center justify-between gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div className="min-w-0">
              <Kop>{k.label}</Kop>
              <p className="text-[10.5px] truncate mt-0.5" style={{ color: MUTED }}>{k.sub}</p>
            </div>
            <p className="text-[19px] font-semibold leading-none tabular-nums shrink-0" style={{ color: INK }}>{k.waarde}</p>
          </div>
        ))}

        <div className="bg-white rounded-xl p-3.5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <Kop>Handtekening klant</Kop>
          <div className="mt-2 h-9 rounded-lg flex items-center px-3" style={{ backgroundColor: BG }}>
            <svg width="76" height="20" viewBox="0 0 76 20" aria-hidden>
              <path d="M2 15 C 10 2, 16 18, 24 9 S 38 2, 46 12 S 60 4, 74 8" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="ml-auto text-[9.5px]" style={{ color: MUTED }}>M. Jansen</span>
          </div>
        </div>

        <div className="h-10 rounded-xl flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-white" style={{ backgroundColor: FLAME }}>
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Werkbon afronden
        </div>
      </div>
    </div>
  )
}

/* 06 · Factuur met betaalstatus, Mollie-link en Exact-koppeling. */
function MockupFactuur() {
  return (
    <Panel>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold mb-1.5" style={{ color: MUTED }}>
          <ArrowLeft className="w-3 h-3" strokeWidth={2} /> Facturen
        </p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-heading text-[17px] font-bold leading-none" style={{ color: INK }}>Factuur 2026234</p>
            <p className="text-[10.5px] mt-1.5 inline-flex items-center gap-1.5" style={{ color: INK }}>
              <Send className="w-3 h-3" style={{ color: PETROL }} strokeWidth={2} />
              Verstuurd · <Serif>wachtend op betaling</Serif>
            </p>
          </div>
          <p className="font-heading text-[20px] font-bold leading-none tabular-nums shrink-0" style={{ color: INK }}>€ 3.158,10</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2" style={{ borderBottom: `1px solid ${LINE}` }}>
        <RegelRij label="Subtotaal excl. btw" waarde="€ 2.610,00" />
        <RegelRij label="Btw 21%" waarde="€ 548,10" />
      </div>

      <div className="px-4 py-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold"
          style={{ color: '#2D6B48', border: '1px solid rgba(45,107,72,0.30)', backgroundColor: 'rgba(45,107,72,0.07)' }}
        >
          <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Markeer als betaald
        </span>
        <span
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
          style={{ color: '#2D6B48', border: '1px solid rgba(45,107,72,0.30)', backgroundColor: 'rgba(45,107,72,0.07)' }}
        >
          <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Exact
        </span>
      </div>

      <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: BG, borderTop: `1px solid ${LINE}` }}>
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] shrink-0" style={{ color: MUTED }}>Betaallink</span>
        <span className="text-[10px] truncate" style={{ color: '#9B9B95' }}>app.doen.team/betalen/3d752882-ddc7-…</span>
      </div>
    </Panel>
  )
}

function RegelRij({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[11.5px]" style={{ color: MUTED }}>{label}</p>
      <p className="text-[11.5px] font-semibold tabular-nums" style={{ color: INK }}>{waarde}</p>
    </div>
  )
}

/* 07 · Project afgerond: de fase-indicator uit de projectlijst plus de
   nacalculatie, want daar staat wat de klus echt heeft opgeleverd. */
function MockupGedaan() {
  const fases = ['Aanvraag', 'Offerte', 'Akkoord', 'Planning', 'Montage', 'Factuur']
  return (
    <Panel>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold mb-1.5" style={{ color: MUTED }}>
          <ArrowLeft className="w-3 h-3" strokeWidth={2} /> Projecten
          <span>·</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] tabular-nums" style={{ backgroundColor: BG, border: `1px solid ${LINE}` }}>
            PRJ-2026-044
          </span>
        </p>
        <div className="flex items-end justify-between gap-3">
          <p className="font-heading text-[16px] font-bold leading-tight" style={{ color: INK }}>
            Gevelreclame Jansen Bouw<span style={{ color: FLAME }}>.</span>
          </p>
          <Status label="Afgerond" color={STATUS.afgerond} />
        </div>
      </div>

      <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between mb-2">
          <Kop>Fase 6 van 6</Kop>
          <span className="text-[9.5px] tabular-nums" style={{ color: MUTED }}>doorlooptijd 12 dagen</span>
        </div>
        <div className="flex items-center gap-1">
          {fases.map((f) => (
            <div key={f} className="flex-1 min-w-0">
              <div className="h-1 rounded-full" style={{ backgroundColor: STATUS.afgerond }} />
              <p className="text-[8px] font-semibold truncate mt-1" style={{ color: MUTED }}>{f}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <Kop color={PETROL}>Nacalculatie</Kop>
          <span className="text-[9.5px]"><Serif>begroot tegen werkelijk</Serif></span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Cijfer label="Begroot" waarde="€ 940" />
          <Cijfer label="Werkelijk" waarde="€ 884" />
          <Cijfer label="Marge" waarde="36%" accent />
        </div>
      </div>
    </Panel>
  )
}

function Cijfer({ label, waarde, accent }: { label: string; waarde: string; accent?: boolean }) {
  return (
    <div className="rounded-[8px] px-2.5 py-2" style={{ backgroundColor: BG, border: `1px solid ${LINE}` }}>
      <Kop>{label}</Kop>
      <p
        className="font-heading text-[15px] font-bold leading-none mt-1 tabular-nums"
        style={{ color: accent ? STATUS.afgerond : INK }}
      >
        {waarde}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Uitkomst · wat die zeven stappen samen opleveren. Drie feiten
   op petrol-deep, geen pijnverhaal, geen herhaling van de modules.
   ───────────────────────────────────────────────────────────────── */

const uitkomsten = [
  {
    title: 'Eén keer invoeren',
    body: 'De offerte wordt de werkbon wordt de factuur. Niks overtikken, dus ook geen verschillen tussen je documenten.',
  },
  {
    title: 'Je klant hoeft niks te installeren',
    body: 'Geen inlog, geen wachtwoord, geen WeTransfer. Eén link waarop hij alles ziet en goedkeurt.',
  },
  {
    title: 'Je weet wat een klus verdient',
    body: 'Geschreven uren en inkoop naast je calculatie. Na afloop zie je zwart op wit wat er onder de streep overbleef.',
  },
]

function Uitkomst() {
  return (
    <section className="relative overflow-hidden bg-petrol-deep">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 90% at 50% 0%, rgba(42,111,122,0.5) 0%, rgba(42,111,122,0) 60%)',
        }}
      />
      <div className="container-site relative py-14 md:py-24">
        <h2
          className="font-heading font-bold text-white leading-[1.05] max-w-2xl mb-10 md:mb-14"
          style={{ fontSize: 'clamp(26px, 3.6vw, 44px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
        >
          Zeven stappen, één systeem<span className="text-flame">.</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-x-10 gap-y-8">
          {uitkomsten.map((u) => (
            <div key={u.title} className="border-t border-white/15 pt-5">
              <h3 className="font-heading text-[18px] md:text-[20px] font-bold text-white leading-tight mb-2">
                {u.title}
                <span className="text-flame">.</span>
              </h3>
              <p className="text-[15px] leading-[1.6]" style={{ color: 'rgba(226,240,241,0.82)' }}>
                {u.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HoeHetWerktContent() {
  return (
    <>
      <Hero />
      <Journey className="bg-bg" padding="pt-2 pb-6 md:pt-4 md:pb-8" />
      <Stappen />
      <Uitkomst />
      <CTASection />
    </>
  )
}
