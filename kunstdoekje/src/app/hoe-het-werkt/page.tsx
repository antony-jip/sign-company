import Image from 'next/image'
import Link from 'next/link'
import { getFrameColors, getFormats, getPrices } from '@/lib/catalog'
import { formatEuro, vanafCompleetCents } from '@/lib/pricing'
import type { Format } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Hoe het werkt · fluweel, wisselen in 30 sec & standaardmaten',
  description:
    'Zo werkt het Kunstdoekje art frame: kunst op luxe fluweel, één keer ophangen en in 30 seconden van doek wisselen. Acht standaardmaten die elke muur vullen.',
  alternates: { canonical: '/hoe-het-werkt' },
}

const STAPPEN = [
  { n: '1', t: 'Kies je kunst', d: 'Ruim 1000 doeken · van oude meesters tot moderne en AI-kunst. Of upload je eigen foto.' },
  { n: '2', t: 'Kies maat & stof', d: 'Acht standaardmaten, fluweel of deco. De kunst zelf kies je gratis.' },
  { n: '3', t: 'Hang het frame op', d: 'Eén keer, met heldere instructie erbij. Daarna nooit meer boren.' },
  { n: '4', t: 'Wissel in 30 seconden', d: 'Pees in de gleuf drukken en klaar. Nieuw seizoen, nieuwe sfeer.' },
]

export default async function HoeHetWerkt() {
  let formats: Format[] = []
  let vanaf = 0
  try {
    const [f, prices, frameColors] = await Promise.all([getFormats(), getPrices(), getFrameColors()])
    formats = f.filter((x) => !x.is_maatwerk)
    vanaf = vanafCompleetCents(prices, frameColors)
  } catch {
    /* catalogus nog niet beschikbaar */
  }
  const maxHoogte = Math.max(1, ...formats.map((f) => f.hoogte_cm || 1))

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div data-reveal-group>
            <p className="label-caps reg-mark inline-block pl-4 text-ink/50">Hoe het werkt</p>
            <h1 className="mt-6 font-serif text-[clamp(40px,6vw,76px)] leading-[0.95] tracking-tight">
              Hang één keer op.
              <br />
              <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">Wissel</em> voor altijd.
            </h1>
            <p className="mt-6 max-w-md text-xl leading-relaxed text-ink/75">
              Een Kunstdoekje is kunst op fluweel met een pees rondom. Je drukt ’m in de gleuf van
              het aluminium frame · en je muur verandert mee met je smaak.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/shop" className="btn-primary group">
                Bekijk de collectie
                <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
              </Link>
              {vanaf > 0 && (
                <p className="text-sm text-ink/55">
                  Elk werk compleet <span className="font-semibold text-ink">v.a. {formatEuro(vanaf)}</span>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[4px] border border-ink/15 bg-paper p-3 shadow-hard-gold sm:p-4" data-reveal>
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src="/home/hero.jpg"
                alt="Kunstdoekje art frame met fluwelen doek in een modern interieur"
                fill
                priority
                sizes="(max-width:1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stappen */}
      <section className="border-y border-ink/15 bg-paper">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center" data-reveal>
            <h2 className="font-serif text-4xl md:text-5xl">
              Van muur naar <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">galerie</em>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink/65">
              Vier stappen. En daarna wissel je zo vaak je wilt.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-reveal-group>
            {STAPPEN.map((s) => (
              <div
                key={s.n}
                className="group flex flex-col rounded-[4px] border border-ink/15 bg-canvas p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-ink/40 hover:shadow-hard-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent font-serif text-lg text-accent-dark">
                  {s.n}
                </span>
                <h3 className="mt-5 font-serif text-2xl">{s.t}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink/65">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fluweel · de kwaliteit */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <div className="order-2 md:order-1" data-reveal>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-[4px] border border-ink/15">
                <Image src="/home/fluweel-2.webp" alt="Detail van een fluwelen kunstdoek" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div className="relative aspect-square overflow-hidden rounded-[4px] border border-ink/15">
                <Image src="/home/fluweel-4.webp" alt="Fluweel houdt het licht vast" fill sizes="25vw" className="object-cover" />
              </div>
              <div className="relative aspect-square overflow-hidden rounded-[4px] border border-ink/15">
                <Image src="/home/fluweel-5.webp" alt="Diepe kleuren op fluweel" fill sizes="25vw" className="object-cover" />
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2" data-reveal>
            <p className="label-caps reg-mark pl-4 text-ink/50">De stof</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              Fluweel dat het licht <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">vasthoudt</em>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/75">
              Fluweel absorbeert licht in plaats van het te weerkaatsen. Daardoor krijgen kleuren een
              diepte die een glad canvas mist · dieper zwart, rijker rood, zachtere overgangen.
            </p>
            <p className="mt-4 max-w-md text-ink/65">
              Je ziet het verschil van een afstand, en je voelt het van dichtbij: warm, zacht, met een
              subtiele glans die meebeweegt met het licht in je kamer. Liever mat en strak? Decostof
              geeft dezelfde kleurvaste print met een rustige, moderne uitstraling.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink/70">
              <li className="flex items-center gap-2"><span className="text-accent">✓</span> Op bestelling geprint in Nederland</li>
              <li className="flex items-center gap-2"><span className="text-accent">✓</span> Kleurvast · geen vervaging</li>
              <li className="flex items-center gap-2"><span className="text-accent">✓</span> Pees rondom: kaarsrecht gespannen, geen golvingen</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Wisselen · het gemak */}
      <section className="bg-ink text-canvas">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:items-center md:gap-16">
            <div data-reveal>
              <p className="label-caps reg-mark pl-4 text-canvas/50">Het wisselen</p>
              <h2 className="mt-5 font-serif text-4xl leading-tight md:text-5xl">
                Klaar in <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">30 seconden</em>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-canvas/75">
                Geen gereedschap, geen gedoe. Het frame blijft aan de muur; alleen het doek erin
                verander je. Een nieuw seizoen, een andere stemming, een feestje · je muur beweegt mee.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3" data-reveal-group>
              {[
                { n: '1', t: 'Doek eruit', d: 'Til het oude doek zo uit de gleuf.' },
                { n: '2', t: 'Pees erin', d: 'Druk de pees van het nieuwe doek in de gleuf.' },
                { n: '3', t: 'Klaar', d: 'Strak gespannen, recht aan de muur.' },
              ].map((s) => (
                <div key={s.n} className="rounded-[4px] border border-canvas/15 bg-canvas/[0.04] p-5">
                  <span className="font-accent text-3xl italic text-accent">{s.n}</span>
                  <p className="mt-3 font-serif text-lg">{s.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-canvas/60">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Standaardmaten */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center" data-reveal>
          <p className="label-caps reg-mark inline-block pl-4 text-ink/50">De maten</p>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">
            Een maat die jouw muur <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">vult</em>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink/65">
            Van een intieme 45 × 70 tot een statige 120 × 180 · er is altijd een formaat dat past. Eén
            prijs per maat en stof; welk kunstwerk je kiest maakt voor de prijs niet uit.
          </p>
        </div>

        {formats.length > 0 && (
          <div className="mt-14 grid grid-cols-4 gap-x-4 gap-y-8 sm:grid-cols-8">
            {formats.map((f) => {
              const h = Math.max(28, Math.round(((f.hoogte_cm || 1) / maxHoogte) * 84))
              const w = Math.max(18, Math.round(h * ((f.breedte_cm || 1) / (f.hoogte_cm || 1))))
              return (
                <div key={f.id} className="flex flex-col items-center gap-2">
                  <span className="flex h-24 items-end">
                    <span className="block border-2 border-ink/40 bg-paper" style={{ width: w, height: h }} />
                  </span>
                  <span className="text-[13px] font-semibold">{f.label}</span>
                  <span className="text-[11px] text-muted">cm</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link href="/shop" className="btn-primary">Kies je kunst</Link>
          <Link href="/maatwerk" className="btn-ghost">Past geen maat? Vraag maatwerk →</Link>
        </div>
      </section>
    </div>
  )
}
