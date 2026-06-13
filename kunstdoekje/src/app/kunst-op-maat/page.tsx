import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kunstwerk op maat · kies elk kunstwerk in jouw formaat',
  description:
    'Verliefd op een kunstwerk maar past het formaat niet? Kies je favoriet op Artvee.com en wij maken het op jouw maat · op fluweel of decostof. Offerte binnen 24 uur.',
  alternates: { canonical: '/kunst-op-maat' },
}

const MAILTO =
  'mailto:info@kunstdoekje.nl?subject=Kunstwerk%20op%20maat%20aanvraag&body=Hoi!%20Ik%20wil%20graag%20dit%20kunstwerk%20op%20maat%20laten%20maken%3A%0D%0A%0D%0AArtvee%20link%3A%20%5Bplak%20hier%20je%20link%5D%0D%0A%0D%0AGewenste%20afmetingen%3A%20%5Bbijv.%2060x80cm%5D%0D%0AMateriaal%3A%20%5Bdecostof%20of%20fluweel%5D%0D%0A%0D%0AGraag%20een%20offerte!%20Bedankt.'

const STAPPEN = [
  { nr: '1', titel: 'Zoek je kunstwerk', tekst: 'Ga naar Artvee.com en kies je favoriete kunstwerk. Kopieer de link van die pagina.' },
  { nr: '2', titel: 'Mail ons de link', tekst: 'Stuur de link naar info@kunstdoekje.nl met je gewenste afmetingen en materiaal.' },
  { nr: '3', titel: 'Ontvang je offerte', tekst: 'Binnen 24 uur krijg je een persoonlijke offerte met exacte prijs en levertijd.' },
  { nr: '4', titel: 'Hang het op!', tekst: 'We maken je doek met zorg en sturen het veilig verpakt naar je toe. Genieten maar.' },
]

const VOORDELEN = [
  {
    titel: 'Elke maat mogelijk',
    tekst: 'Van 30 × 40 cm tot 200 × 150 cm en alles ertussenin. Jouw muur bepaalt wat perfect past.',
    icon: <path d="M4 7V4h16v3M9 20h6M12 4v16" />,
  },
  {
    titel: 'Museumkwaliteit',
    tekst: 'Artvee verzamelt de mooiste digitale kunstwerken uit musea wereldwijd · in hoge resolutie.',
    icon: <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" />,
  },
  {
    titel: 'Rechtenvrij',
    tekst: 'Alle kunstwerken op Artvee zijn vrij van auteursrecht. Gebruik ze zonder zorgen.',
    icon: <path d="M12 15v2M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z" />,
  },
]

export default function KunstOpMaat() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="label-caps reg-mark inline-block pl-4 text-accent-dark">Nieuw · op-maat service</p>
            <h1 className="mt-6 font-serif text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-tight">
              Kies jouw{' '}
              <em className="font-accent font-normal normal-case italic tracking-normal text-accent">kunstwerk</em>{' '}
              in de perfecte maat
            </h1>
            <p className="mt-6 max-w-md text-xl leading-relaxed text-ink/75">
              Verliefd op een kunstwerk, maar past het formaat niet in jouw ruimte? Wij maken elk
              kunstwerk precies zoals jij het wilt.
            </p>
            <p className="mt-4 max-w-md text-ink/60">
              Kies je favoriet op Artvee.com en wij zorgen dat het perfect bij je past · van klassieke
              meesters tot moderne kunst, op elk gewenst formaat.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href={MAILTO} className="btn-primary group">
                Mail je aanvraag
                <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
              </a>
              <a href="https://artvee.com" target="_blank" rel="noopener noreferrer" className="btn-ghost">
                Ontdek Artvee.com
              </a>
            </div>
            <p className="mt-4 text-sm text-ink/55">
              <span className="font-bold text-accent">✓</span> Reactie binnen 24 uur gegarandeerd
            </p>
          </div>

          <div className="relative">
            <div className="rounded-[4px] border border-ink/15 bg-paper p-3 shadow-hard-gold sm:p-4">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src="https://kunstdoekje.nl/wp-content/uploads/2025/09/DSC_9537_websize.webp"
                  alt="Kunstwerk op maat van Kunstdoekje"
                  fill
                  priority
                  sizes="(max-width:1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Zo werkt het */}
      <section className="border-t border-ink/15 bg-paper">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center">
            <h2 className="font-serif text-4xl md:text-5xl">
              Zo makkelijk <em className="font-accent font-normal normal-case italic tracking-normal text-accent">werkt het</em>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink/65">
              Van inspiratie naar jouw unieke kunstwerk in vier simpele stappen.
            </p>
          </div>
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STAPPEN.map((s) => (
              <div
                key={s.nr}
                className="group flex flex-col rounded-[4px] border border-ink/15 bg-canvas p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-ink/40 hover:shadow-hard-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent font-serif text-lg text-accent-dark">
                  {s.nr}
                </span>
                <h3 className="mt-5 font-serif text-2xl">{s.titel}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink/65">{s.tekst}</p>
              </div>
            ))}
          </div>

          {/* E-mail highlight */}
          <div className="mt-14 rounded-[4px] border border-accent/30 bg-accent/[0.08] p-8 text-center">
            <h3 className="font-serif text-2xl">Direct contact gewenst?</h3>
            <p className="mt-2 text-ink/70">Mail ons je Artvee-link en gewenste maat.</p>
            <a href={MAILTO} className="mt-4 inline-block font-semibold text-accent-dark hover:underline">
              info@kunstdoekje.nl
            </a>
          </div>
        </div>
      </section>

      {/* Voordelen */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="font-serif text-4xl md:text-5xl">
            Waarom <em className="font-accent font-normal normal-case italic tracking-normal text-accent">maatwerk</em>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink/65">
            Jouw kunst, jouw maat, jouw ruimte. Precies zoals jij het wilt.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {VOORDELEN.map((v) => (
            <div key={v.titel} className="rounded-[4px] border border-ink/15 bg-paper p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 text-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                  {v.icon}
                </svg>
              </div>
              <h3 className="mt-5 font-serif text-2xl">{v.titel}</h3>
              <p className="mt-2.5 text-ink/65">{v.tekst}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-4">
          <a href={MAILTO} className="btn-primary">Mail je aanvraag</a>
          <Link href="/shop" className="btn-ghost">Of bekijk de collectie</Link>
        </div>
      </section>
    </div>
  )
}
