import Link from 'next/link'

/* De rode lijn door de site: doen. draait al een half jaar het echte werk bij
   Sign Company. Dat is het sterkste argument richting een vakgenoot, dus het
   hoort niet alleen op /over te staan.

   Drie vormen, zodat dezelfde boodschap past bij het ritme van de pagina en
   niet als hetzelfde blok blijft terugkomen:
   - `regel`   : één zin onder een hero of formulier
   - `band`    : sectiebreed op petrol-deep, met de cijfers erbij
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
              Wij gebruiken het zelf, elke dag<span className="text-flame">.</span>
            </h2>
            <p className="text-[16px] md:text-[17px] leading-[1.65]" style={{ color: 'rgba(226,240,241,0.82)' }}>
              doen. is niet gebouwd om te verkopen. Het is gebouwd omdat wij het nodig hadden.
              Al {EIGEN_GEBRUIK_DUUR} loopt het complete werk van Sign Company erdoorheen: elke
              aanvraag, elke offerte, elke werkbon en elke factuur. Wat niet werkte hebben we
              eruit gesloopt voordat jij het zag.
            </p>
            <Link
              href="/over"
              className="group inline-flex items-center gap-2 mt-6 text-[15px] font-semibold text-white"
            >
              <span className="relative">
                Lees hoe het ontstond
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
