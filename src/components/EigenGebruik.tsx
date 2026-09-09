import Link from 'next/link'
import Image from 'next/image'

/* De rode lijn door de site: doen. draait al een half jaar het echte werk bij
   Sign Company. Dat is het sterkste argument richting een vakgenoot, dus het
   hoort niet alleen op /over te staan.

   Drie vormen, zodat dezelfde boodschap past bij het ritme van de pagina en
   niet als hetzelfde blok blijft terugkomen:
   - `regel`   : één zin onder een hero of formulier
   - `band`    : sectiebreed op petrol-deep, met de cijfers erbij
   - `bewijs`  : lichte sectie met werkbeeld, direct onder een donkere hero
   - `notitie` : compacte inline-variant naast andere tekst

   Alleen claims die kloppen. "Een half jaar in gebruik" komt van Antony zelf.
   "Sinds 1983" staat op signcompany.nl. Het aantal modules komt uit
   src/data/modules.ts, zodat het meebeweegt als er een module bij komt.
   Schrijf hier nooit iets als "geen losse tools meer": de boekhouding loopt
   via Exact en de mail via de eigen mailbox, dus dat zou niet kloppen. */

import { ArrowRight } from 'lucide-react'
import { modules } from '@/data/modules'
import { ZEKERHEID_REGEL } from '@/data/cta'

export const EIGEN_GEBRUIK_DUUR = 'een half jaar'

export function EigenGebruikRegel({ className = '' }: { className?: string }) {
  return (
    <p className={`tekst-body text-muted ${className}`}>
      <span className="font-semibold text-petrol">Wij draaien er zelf op.</span> Sign Company
      doet al {EIGEN_GEBRUIK_DUUR} zijn hele werk in doen., van offerte tot factuur.
    </p>
  )
}

export function EigenGebruikNotitie({ className = '' }: { className?: string }) {
  return (
    <p className={`tekst-caption text-muted ${className}`}>
      Geen demo-verhaal: ons eigen signbedrijf werkt hier al {EIGEN_GEBRUIK_DUUR} mee.
    </p>
  )
}

/* De bewijsvorm. Staat op de home direct onder de hero, want dit is het enige
   klantbewijs dat doen. nu heeft en het stond veel te laag op de pagina.
   Licht vlak, omdat de hero al petrol-deep is en twee donkere secties op
   elkaar het beeld doodslaan.

   Hier stond sfeerbeeld met de aantekening dat er een echte foto van de ploeg
   hoorde te komen. Die is er nu: Antony en Jos bij de bus. Namen mogen er dus
   wel onder, en dat hoort ook, want dit blok claimt precies dat het geen
   demo-verhaal is.

   Duotoon in plaats van de kale foto: grijswaarden tussen petrol-deep en de
   bg-tint. Opmaak, het bestand zelf blijft ongemoeid. Wil je hem in kleur,
   haal dan de twee blend-lagen weg. */
export function EigenGebruikBewijs() {
  return (
    <section className="tegel-licht">
      {/* Halve pagina beeld, halve pagina tekst, en het beeld loopt links de
          rand uit. De foto stond eerder in een kolom van 420px met een
          bijschrift eronder, en dan is het een illustratie bij een verhaal.
          Dit blok claimt dat het geen demo-verhaal is; dan moeten die twee
          mensen ook echt op ware grootte in beeld staan.

          Geen tegel-padding op de sectie zelf: de foto raakt boven en onder
          de rand, de tekstkolom houdt zijn eigen lucht. */}
      <div className="grid grid-cols-1 items-stretch lg:grid-cols-2">
        <div className="productbeeld relative isolate min-h-[380px] lg:min-h-[620px]">
          <Image
            src="/images/maker/antony-en-jos.webp"
            alt="Antony en Jos Bootsma bij de open zijdeur van de bestelbus voor de werkplaats van Sign Company"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-[50%_28%] saturate-[0.88] contrast-[1.03]"
          />
          {/* Half ontzadigd met een petrol-waas, geen duotoon: anders zie je
              twee mensen in zwart-wit in plaats van twee mensen. `color`
              verschuift de kleurtoon en laat de helderheid staan. isolate is
              nodig, anders blendt deze laag met de pagina in plaats van met
              de foto. */}
          <span aria-hidden className="absolute inset-0 bg-petrol/[0.12] mix-blend-color" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
            style={{ background: 'linear-gradient(to top, rgba(13,52,60,0.72) 0%, rgba(13,52,60,0) 100%)' }}
          />
          <p className="absolute bottom-0 left-0 right-0 p-5 tekst-fijn text-white">
            Antony en Jos Bootsma · Sign Company, sinds 1983
          </p>
        </div>

        <div className="flex flex-col justify-center px-6 py-14 md:px-12 md:py-20 lg:px-16">
          <h2
            className="font-heading font-bold text-petrol leading-[1.02] max-w-xl"
            style={{ fontSize: 'clamp(28px, 3.6vw, 46px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Geen demo-verhaal<span className="text-flame">.</span> Ons eigen bedrijf draait erop<span className="text-flame">.</span>
          </h2>
          <p className="mt-5 tekst-body text-ink max-w-xl">
            Sign Company zet sinds 1983 namen op panden. Al {EIGEN_GEBRUIK_DUUR} loopt
            het complete werk van dat bedrijf door doen.: elke aanvraag, elke offerte,
            elke werkbon, elke factuur. Wat ons irriteerde, is eruit gesloopt voordat
            jij het zag.
          </p>

          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-x-6 border-t border-petrol/10 pt-6">
            {[
              { cijfer: '½ jaar', label: 'dagelijks in gebruik' },
              { cijfer: '1983', label: 'signbedrijf sinds' },
              { cijfer: String(modules.length), label: 'modules, één systeem' },
            ].map((s) => (
              <div key={s.label}>
                <dt className="font-heading text-[24px] md:text-[30px] font-bold text-petrol leading-none">
                  {s.cijfer}
                  <span className="text-flame">.</span>
                </dt>
                <dd className="mt-2 tekst-caption text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>

          {/* De knop hoort hier. Tussen de hero-knop en de volgende CTA lag
              zes schermen niets, en dit is het punt waarop de lezer het
              warmst is: hij heeft net gelezen dat het bedrijf er zelf op
              draait. */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href="https://app.doen.team/register" className="knop knop-groot knop-flame group">
              <span>Start gratis</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </a>
            <Link href="/over" className="knop knop-groot knop-lijn group">
              <span>Lees waarom we het bouwden</span>
              <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
          <p className="mt-4 tekst-fijn text-muted">{ZEKERHEID_REGEL}</p>
        </div>
      </div>
    </section>
  )
}

/* De uitgebreide vorm. Gebruik deze één keer per pagina, niet vaker. */
export function EigenGebruikBand() {
  return (
    <section className="relative overflow-hidden bg-petrol-deep">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 90% at 15% 0%, rgba(42,111,122,0.45) 0%, rgba(42,111,122,0) 60%)',
        }}
      />
      <div className="container-site relative tegel">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <h2
              className="font-heading font-bold text-white leading-[1.06] mb-4"
              style={{ fontSize: 'clamp(26px, 3.4vw, 42px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Wij draaien er zelf op<span className="text-flame">.</span> Elke dag, elke klus<span className="text-flame">.</span>
            </h2>
            <p className="tekst-body" style={{ color: 'rgba(226,240,241,0.82)' }}>
              doen. is niet bedacht in een vergaderzaal. Het is gebouwd omdat wij het zelf
              nodig hadden, tussen de montages door. Al {EIGEN_GEBRUIK_DUUR} loopt het complete
              werk van Sign Company erdoorheen: elke aanvraag, elke offerte, elke werkbon,
              elke factuur. Wat ons irriteerde, hebben we eruit gesloopt. Wat ons sneller
              maakte, zit erin. Dat is de software die je krijgt.
            </p>
            <Link
              href="/over"
              className="group inline-flex items-center gap-2 mt-6 text-[15px] font-semibold text-white"
            >
              <span className="relative">
                Lees waarom we het bouwden
                <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-white/40" />
              </span>
              <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>

          <dl className="grid grid-cols-3 gap-x-6 border-t border-white/15 pt-6">
            {[
              { cijfer: '½ jaar', label: 'in dagelijks gebruik bij Sign Company' },
              { cijfer: '1983', label: 'signbedrijf sinds' },
              { cijfer: String(modules.length), label: 'modules, één systeem' },
            ].map((s) => (
              <div key={s.label}>
                <dt className="font-heading text-[22px] md:text-[26px] font-bold text-white leading-none">
                  {s.cijfer}
                  <span className="text-flame">.</span>
                </dt>
                <dd className="mt-2 tekst-caption" style={{ color: 'rgba(226,240,241,0.65)' }}>
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
