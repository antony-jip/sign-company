import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import SectionReveal from '../SectionReveal'
import SerifItalic from '../SerifItalic'
import { PRICE_PER_MONTH } from '@/data/pricing'

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'

// Tarieven James PRO volgens jamespro.nl/tarieven, geraadpleegd juli 2026:
// €113 p/mnd per gebruiker; opzetkosten €495 (Basic), €749 (Business),
// €2.490 (Enterprise); 14 dagen proefperiode. Alleen geverifieerde feiten
// vergelijken — geen aannames over features van James PRO.
const JAMES_PER_USER = 113
const JAMES_SETUP_BASIC = 495
const VOORBEELD_GEBRUIKERS = 5

const vergelijking = [
  {
    label: 'Prijsmodel',
    james: `€ ${JAMES_PER_USER} per maand, per gebruiker`,
    doen: `€ ${PRICE_PER_MONTH} per maand, flat — tot 10 gebruikers`,
  },
  {
    label: 'Opzetkosten',
    james: '€ 495 tot € 2.490 eenmalig, afhankelijk van pakket',
    doen: '€ 0',
  },
  {
    label: 'Proefperiode',
    james: '14 dagen gratis',
    doen: '30 dagen gratis, geen creditcard',
  },
  {
    label: 'Projecten, offertes en facturen',
    james: 'Onbeperkt',
    doen: 'Onbeperkt',
  },
  {
    label: 'Contract',
    james: 'Zie voorwaarden James PRO',
    doen: 'Maandelijks opzegbaar',
  },
]

const inbegrepen = [
  'Alle 10 modules — projecten, offertes, planning, werkbonnen, facturen',
  'Klantportaal — één link, geen inlog voor je klant',
  'Daan AI — vat mails samen, leest inkoopfacturen uit',
  'Eigen mailbox per gebruiker (IMAP/SMTP)',
  'Mollie-betaallinks en koppeling met Exact Online',
  'Nederlandse support en een live onboarding-sessie',
]

export default function VergelijkJamesProContent() {
  const jamesMaand = VOORBEELD_GEBRUIKERS * JAMES_PER_USER
  const jamesJaar1 = jamesMaand * 12 + JAMES_SETUP_BASIC
  const doenJaar1 = PRICE_PER_MONTH * 12
  const besparing = jamesJaar1 - doenJaar1

  return (
    <div className="pt-28 md:pt-36" style={{ backgroundColor: '#F3F2ED' }}>
      {/* Kop */}
      <section className="pb-16 md:pb-24">
        <div className="container-site">
          <SectionReveal>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-7">
                <span className="relative inline-flex items-center justify-center w-2 h-2">
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: FLAME, opacity: 0.45 }} />
                  <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FLAME }} />
                </span>
                <span className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase" style={{ color: MUTED }}>
                  Vergelijking
                </span>
              </div>

              <h1
                className="font-heading font-bold tracking-[-2px] md:tracking-[-3px] leading-[0.98] mb-7"
                style={{ fontSize: 'clamp(38px, 5.2vw, 72px)', color: PETROL }}
              >
                <span className="block">
                  doen<span style={{ color: FLAME }}>.</span> of James PRO<span style={{ color: FLAME }}>?</span>
                </span>
                <span className="block" style={{ color: MUTED }}>
                  <SerifItalic>Vergelijk</SerifItalic> zelf
                  <span style={{ color: FLAME }}>.</span>
                </span>
              </h1>

              <p className="text-[16px] md:text-[19px] leading-[1.6] max-w-2xl" style={{ color: '#3F3F3A' }}>
                James PRO is een gevestigde naam in de signbranche, en niet voor niets.
                Wij bouwden doen. omdat wij het anders wilden: één vaste prijs voor je
                hele team, geen opzetkosten, en AI die meewerkt. Hieronder de feiten
                naast elkaar — beslis zelf wat bij je bedrijf past.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Vergelijkingstabel */}
      <section className="pb-20 md:pb-28">
        <div className="container-site">
          <SectionReveal>
            <div
              className="max-w-4xl rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(26,83,92,0.10)', boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 24px 56px -30px rgba(19,62,69,0.2)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: 560 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(26,83,92,0.10)' }}>
                      <th className="px-5 md:px-7 py-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}></th>
                      <th className="px-5 md:px-7 py-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}>
                        James PRO
                      </th>
                      <th className="px-5 md:px-7 py-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: PETROL, backgroundColor: '#F5F4F1' }}>
                        doen.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vergelijking.map((row) => (
                      <tr key={row.label} style={{ borderBottom: '1px solid rgba(26,83,92,0.06)' }}>
                        <td className="px-5 md:px-7 py-5 text-[13px] md:text-[14px] font-semibold align-top" style={{ color: PETROL }}>
                          {row.label}
                        </td>
                        <td className="px-5 md:px-7 py-5 text-[13px] md:text-[14px] align-top" style={{ color: MUTED }}>
                          {row.james}
                        </td>
                        <td className="px-5 md:px-7 py-5 text-[13px] md:text-[14px] align-top font-medium" style={{ color: '#1A1A1A', backgroundColor: '#F5F4F1' }}>
                          {row.doen}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-5 md:px-7 py-4 text-[12px]" style={{ color: MUTED, borderTop: '1px solid rgba(26,83,92,0.06)' }}>
                Tarieven James PRO volgens{' '}
                <a href="https://www.jamespro.nl/tarieven" rel="nofollow noopener" target="_blank" className="underline">
                  jamespro.nl/tarieven
                </a>
                , geraadpleegd juli 2026. Prijzen kunnen wijzigen — klopt er iets niet meer? Mail ons, dan passen we het aan.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Rekenvoorbeeld */}
      <section className="py-20 md:py-28" style={{ backgroundColor: '#F5F4F1' }}>
        <div className="container-site">
          <SectionReveal>
            <h2
              className="font-heading font-bold tracking-[-1px] md:tracking-[-2px] leading-[1.0] mb-10 md:mb-14 max-w-2xl"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: PETROL }}
            >
              Reken het na<span style={{ color: FLAME }}>.</span>{' '}
              <span style={{ color: MUTED }}>Met {VOORBEELD_GEBRUIKERS} gebruikers</span>
              <span style={{ color: FLAME }}>.</span>
            </h2>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl">
            <SectionReveal>
              <div className="p-7 md:p-9 rounded-2xl h-full" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(26,83,92,0.10)' }}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] mb-4" style={{ color: MUTED }}>
                  James PRO · jaar 1
                </p>
                <p className="font-heading text-[34px] md:text-[42px] font-bold tracking-tight mb-3" style={{ color: MUTED }}>
                  € {jamesJaar1.toLocaleString('nl-NL')}
                </p>
                <p className="text-[13px] md:text-[14px] leading-relaxed" style={{ color: MUTED }}>
                  {VOORBEELD_GEBRUIKERS} × € {JAMES_PER_USER} per maand × 12, plus € {JAMES_SETUP_BASIC} eenmalige opzetkosten (Basic-pakket).
                </p>
              </div>
            </SectionReveal>
            <SectionReveal delay={0.08}>
              <div className="p-7 md:p-9 rounded-2xl h-full" style={{ backgroundColor: '#0F3A42', boxShadow: '0 24px 56px -30px rgba(19,62,69,0.4)' }}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  doen. · jaar 1
                </p>
                <p className="font-heading text-[34px] md:text-[42px] font-bold tracking-tight mb-3 text-white">
                  € {doenJaar1.toLocaleString('nl-NL')}
                </p>
                <p className="text-[13px] md:text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  € {PRICE_PER_MONTH} flat per maand × 12, voor je hele team tot 10 gebruikers. Geen opzetkosten.
                </p>
                <p className="mt-5 pt-5 text-[14px] md:text-[15px] font-semibold text-white" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  Verschil: € {besparing.toLocaleString('nl-NL')} in jaar één<span style={{ color: FLAME }}>.</span>
                </p>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Wat bij doen. inbegrepen zit */}
      <section className="py-20 md:py-28">
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 max-w-5xl items-start">
            <SectionReveal>
              <h2
                className="font-heading font-bold tracking-[-1px] md:tracking-[-2px] leading-[1.0] mb-6"
                style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: PETROL }}
              >
                Wat er bij doen<span style={{ color: FLAME }}>.</span>{' '}
                <span style={{ color: MUTED }}>altijd in zit</span>
                <span style={{ color: FLAME }}>.</span>
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.6] mb-8" style={{ color: '#3F3F3A' }}>
                Geen pakketten, geen add-ons, geen prijs per gebruiker. Wat je ziet is
                wat je krijgt — en het beste oordeel vel je zelf, in je eigen omgeving,
                met je eigen offertes.
              </p>
              <Link
                href="/prijzen"
                className="inline-flex items-center gap-2 text-[15px] font-semibold transition-all group"
                style={{ color: PETROL }}
              >
                <span className="relative">
                  Bekijk de volledige prijsopbouw
                  <span
                    className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                    style={{ backgroundColor: PETROL }}
                  />
                </span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: FLAME }} />
              </Link>
            </SectionReveal>
            <SectionReveal delay={0.1}>
              <ul className="space-y-4">
                {inbegrepen.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: '#FEE8E2' }}
                    >
                      <Check className="w-3.5 h-3.5" style={{ color: FLAME }} strokeWidth={2.5} />
                    </span>
                    <span className="text-[14px] md:text-[15px] leading-relaxed" style={{ color: '#3F3F3A' }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionReveal>
          </div>
        </div>
      </section>
    </div>
  )
}
