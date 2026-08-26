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

import { modules } from '@/data/modules'

export const EIGEN_GEBRUIK_DUUR = 'een half jaar'

export function EigenGebruikRegel({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[15px] text-muted ${className}`}>
      <span className="font-semibold text-petrol">Wij draaien er zelf op.</span> Sign Company
      doet al {EIGEN_GEBRUIK_DUUR} zijn hele werk in doen., van offerte tot factuur.
    </p>
  )
}

export function EigenGebruikNotitie({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[14px] leading-[1.6] text-muted ${className}`}>
      Geen demo-verhaal: ons eigen signbedrijf werkt hier al {EIGEN_GEBRUIK_DUUR} mee.
    </p>
  )
}

/* De bewijsvorm. Staat op de home direct onder de hero, want dit is het enige
   klantbewijs dat doen. nu heeft en het stond veel te laag op de pagina.
   Licht vlak, omdat de hero al petrol-deep is en twee donkere secties op
   elkaar het beeld doodslaan.

   Let op: het beeld is sfeerbeeld uit de eigen fotoserie, geen documentaire
   foto van Sign Company. Zet er dus geen naam van een persoon onder. Zodra er
   een echte foto van de ploeg is, hoort die hier. */
export function EigenGebruikBewijs() {
  return (
    <section className="bg-white">
      <div className="container-site py-14 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-16 items-center">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[10px] bg-petrol-deep/5">
            <Image
              src="/images/fotos/overleg-aan-de-werkbank.webp"
              alt="Twee medewerkers rollen een geprint vel uit op de werkbank in de werkplaats, bestelbus in de open deur, printer op de achtergrond"
              fill
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-cover"
            />
          </div>

          <div>
            <h2
              className="font-heading font-bold text-petrol leading-[1.04]"
              style={{ fontSize: 'clamp(26px, 3.4vw, 42px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Geen demo-verhaal<span className="text-flame">.</span> Ons eigen bedrijf draait erop<span className="text-flame">.</span>
            </h2>
            <p className="mt-5 text-[16px] md:text-[17px] leading-[1.65] text-ink max-w-xl">
              Sign Company zet sinds 1983 namen op panden. Al {EIGEN_GEBRUIK_DUUR} loopt
              het complete werk van dat bedrijf door doen.: elke aanvraag, elke offerte,
              elke werkbon, elke factuur. Wat ons irriteerde, is eruit gesloopt voordat
              jij het zag.
            </p>

            <dl className="mt-7 grid grid-cols-3 gap-x-6 border-t border-petrol/10 pt-5">
              {[
                { cijfer: '½ jaar', label: 'dagelijks in gebruik' },
                { cijfer: '1983', label: 'signbedrijf sinds' },
                { cijfer: String(modules.length), label: 'modules, één systeem' },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="font-heading text-[22px] md:text-[26px] font-bold text-petrol leading-none">
                    {s.cijfer}
                    <span className="text-flame">.</span>
                  </dt>
                  <dd className="mt-2 text-[13px] leading-[1.45] text-muted">{s.label}</dd>
                </div>
              ))}
            </dl>

            <Link
              href="/over"
              className="group inline-flex items-center gap-2 mt-6 text-[15px] font-semibold text-petrol"
            >
              <span className="relative">
                Lees waarom we het bouwden
                <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-petrol/30" />
              </span>
              <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
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
      <div className="container-site relative py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <h2
              className="font-heading font-bold text-white leading-[1.06] mb-4"
              style={{ fontSize: 'clamp(26px, 3.4vw, 42px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Wij draaien er zelf op<span className="text-flame">.</span> Elke dag, elke klus<span className="text-flame">.</span>
            </h2>
            <p className="text-[16px] md:text-[17px] leading-[1.65]" style={{ color: 'rgba(226,240,241,0.82)' }}>
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
                <dd className="mt-2 text-[13px] leading-[1.45]" style={{ color: 'rgba(226,240,241,0.65)' }}>
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
