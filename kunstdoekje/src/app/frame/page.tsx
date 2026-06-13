import Image from 'next/image'
import Link from 'next/link'
import FrameConfigurator from '@/components/FrameConfigurator'
import { getFabrics, getFormats, getFrameColors, getPrices } from '@/lib/catalog'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Los frame kopen · aluminium art frame (wissellijst)',
  description:
    'Alleen een frame nodig? Bestel los je aluminium wissellijst in elke maat en kleur. Hang ’m één keer op en wissel je doeken in 30 seconden.',
  alternates: { canonical: '/frame' },
}

const VOORDELEN = [
  { titel: 'Geborsteld aluminium', tekst: 'Mat, strak en licht · gemaakt om jaren mee te gaan.' },
  { titel: 'Slim gleufsysteem', tekst: 'Druk de pees van elk doek in de gleuf. Kaarsrecht, zonder gereedschap.' },
  { titel: 'Eén keer ophangen', tekst: 'Het frame blijft hangen; alleen het doek erin wissel je.' },
]

export default async function FramePage() {
  let formats, fabrics, frameColors, prices
  try {
    ;[formats, fabrics, frameColors, prices] = await Promise.all([
      getFormats(),
      getFabrics(),
      getFrameColors(),
      getPrices(),
    ])
  } catch {
    formats = fabrics = frameColors = prices = undefined
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/shop" className="text-sm text-ink/50 hover:text-ink">← Terug naar de collectie</Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {/* Beeld + uitleg */}
        <div className="md:sticky md:top-28 md:h-fit" data-reveal>
          <div className="rounded-[4px] border border-ink/15 bg-paper p-4 shadow-hard-sm sm:p-6">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="https://kunstdoekje.nl/wp-content/uploads/2023/12/frames.png"
                alt="Aluminium art frame in drie kleuren · zwart, zilver en wit"
                fill
                priority
                sizes="(max-width:768px) 100vw, 50vw"
                className="object-contain"
              />
            </div>
          </div>
          <dl className="mt-6 space-y-4" data-reveal-group>
            {VOORDELEN.map((v) => (
              <div key={v.titel} className="border-t border-ink/15 pt-3">
                <dt className="font-semibold">{v.titel}</dt>
                <dd className="mt-0.5 text-sm text-ink/60">{v.tekst}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Configuratie */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent">Het art frame · los</p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl">
            Alleen een <em className="font-accent text-[1.06em] font-medium normal-case italic tracking-normal text-accent">frame</em>?
          </h1>
          <p className="mt-4 text-ink/70">
            Heb je al doeken, of wil je eerst het frame? Stel hieronder je aluminium wissellijst samen · in
            elke maat en kleur. Hang ’m één keer op en wissel je doeken in 30 seconden.
          </p>

          {formats && fabrics && frameColors && prices ? (
            <div className="mt-8">
              <FrameConfigurator
                formats={formats}
                fabrics={fabrics}
                frameColors={frameColors}
                prices={prices}
              />
            </div>
          ) : (
            <p className="mt-8 text-ink/50">De frameprijzen worden geladen zodra de catalogus gekoppeld is.</p>
          )}
        </div>
      </div>
    </div>
  )
}
