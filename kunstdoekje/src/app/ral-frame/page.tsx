import Image from 'next/image'
import RalConfigurator from '@/components/ral/RalConfigurator'
import RalHero from '@/components/ral/RalHero'
import { RAL_HERO_IMAGES } from '@/lib/ral'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Frame in RAL-kleur · maatwerk art frame op kleur gespoten',
  description:
    'Laat je aluminium art frame professioneel spuiten in élke gewenste RAL-kleur. 100+ kleuren ter inspiratie, elk formaat mogelijk. Kies je kleur en stel je frame samen.',
  alternates: { canonical: '/ral-frame' },
}

const STAPPEN = [
  { n: '1', t: 'Kies je kleur & formaat' },
  { n: '2', t: 'Vul het contactformulier in' },
  { n: '3', t: 'Ontvang je betaallink' },
  { n: '4', t: 'Levering in ±6 weken' },
]

// Bento-spans voor de inspiratiegalerij (4 koloms desktop, 3 rijen).
const GALLERIJ_SPAN = [
  'md:col-span-2 md:row-span-2',
  '',
  '',
  '',
  '',
  'md:col-span-2',
  'md:col-span-2',
]

export default function RalFramePage() {
  return (
    <div>
      <RalHero />

      {/* Intro */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="font-serif text-3xl md:text-4xl">
          Perfect afgestemd op jouw <em className="font-accent font-normal normal-case italic tracking-normal text-accent">interieur</em>
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-ink/70">
          Standaard kies je uit zwart, zilver of wit · maar wil je dat je frame écht naadloos
          aansluit? Laat ’m spuiten in elke RAL-kleur. Van zachte pasteltinten tot diepe
          statementkleuren.
        </p>
        <div className="mx-auto mt-8 max-w-xl rounded-[4px] border border-accent/30 bg-accent/[0.08] p-5">
          <p className="font-semibold">Alle 200+ RAL-kleuren beschikbaar</p>
          <p className="mt-1 text-sm text-ink/65">
            Bonus: bij elke RAL-frame bestelling ontvang je <strong>50% korting</strong> op een los
            kunstdoek · de kortingscode sturen we per mail.
          </p>
        </div>
      </section>

      {/* Inspiratiegalerij */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-3 [grid-auto-rows:140px] md:grid-cols-4 md:[grid-auto-rows:170px]">
          {RAL_HERO_IMAGES.map((src, i) => (
            <div
              key={src}
              className={`group relative overflow-hidden rounded-[4px] border border-ink/15 bg-black/5 ${GALLERIJ_SPAN[i] ?? ''}`}
            >
              <Image
                src={src}
                alt="Maatwerk frame in RAL-kleur in een interieur"
                fill
                sizes="(max-width:768px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Configurator */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <RalConfigurator />
      </section>

      {/* Hoe werkt het */}
      <section className="border-t border-ink/15 bg-paper">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center font-serif text-3xl">Hoe werkt het?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STAPPEN.map((s) => (
              <div key={s.n} className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent font-serif text-lg text-accent-dark">
                  {s.n}
                </span>
                <p className="mt-4 font-semibold leading-snug">{s.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
