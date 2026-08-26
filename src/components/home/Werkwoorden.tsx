import Link from 'next/link'
import LoopVideo from '@/components/LoopVideo'

/* Vier werkwoorden in plaats van elf zelfstandige naamwoorden.

   De home legde het product uit als een inventaris: elf modules op een rij.
   Kit.com hangt zijn hele site aan vier werkwoorden (Grow/Send/Automate/Earn)
   en herhaalt die in het menu, op de home en in de footer. Dit is de
   Nederlandse variant, en het is dezelfde volgorde als een signklus echt
   loopt: binnenhalen, plannen, maken, factureren.

   Bewust geen uitleg per module: dat doet /features. Hier staat alleen de
   belofte plus het beeld. Beeld is de bestaande moduleloop, geen nieuw werk. */

export type Werkwoord = {
  kop: string
  belofte: string
  regel: string
  video: string
  videoLabel: string
  href: string
  linkLabel: string
}

export const WERKWOORDEN: Werkwoord[] = [
  {
    kop: 'Binnenhalen',
    belofte:
      'Een aanvraag komt binnen, je rekent hem door met je eigen materialen en marges, en de offerte ligt er dezelfde middag. Je klant keurt goed op één link, zonder inlog.',
    regel: 'Aanvragen · Offertes · Klantportaal',
    video: 'module-offertes',
    videoLabel: 'Een offerte wordt gecalculeerd en verstuurd in doen.',
    href: '/features/offertes',
    linkLabel: 'Zo maak je een offerte',
  },
  {
    kop: 'Plannen',
    belofte:
      'Sleep de klus naar een dag en je week staat. Het weerbericht loopt mee voor buitenmontages, en alles wat naast de montage moet gebeuren staat apart, per collega.',
    regel: 'Planning · Taken',
    video: 'module-planning',
    videoLabel: 'De montageplanning van een week wordt in elkaar gesleept',
    href: '/features/planning',
    linkLabel: 'Zo plan je je week',
  },
  {
    kop: 'Maken',
    belofte:
      'De werkbon maak je in één klik vanuit de offerte, alle regels staan er al op. Je monteur ziet zijn klus op zijn telefoon en vult aan met uren, foto’s en een handtekening.',
    regel: 'Werkbonnen · Studio',
    video: 'module-werkbonnen',
    videoLabel: 'Een werkbon wordt gemaakt en op locatie afgetekend',
    href: '/features/werkbonnen',
    linkLabel: 'Zo loopt een werkbon',
  },
  {
    kop: 'Factureren',
    belofte:
      'Van offerte naar factuur in één klik, met een betaallink erin. Inkoopfacturen leest Daan zelf uit, en wat klaar is gaat door naar Exact Online.',
    regel: 'Facturen · Inkoop · Exact Online',
    video: 'module-facturen',
    videoLabel: 'Een factuur wordt gemaakt vanuit de offerte en verstuurd',
    href: '/features/facturen',
    linkLabel: 'Zo factureer je',
  },
]

export default function Werkwoorden() {
  return (
    <section className="bg-white">
      <div className="container-site py-16 md:py-32">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-12 md:mb-20">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Van eerste mail tot betaalde factuur<span className="text-flame">.</span>
          </h2>
          <p className="text-[15px] md:text-[16px] text-muted max-w-sm leading-[1.55]">
            Vier stappen. Eén systeem eronder, zodat je niets overtypt en niets
            twee keer bedenkt.
          </p>
        </div>

        <div className="flex flex-col gap-16 md:gap-28">
          {WERKWOORDEN.map((w, i) => (
            <div
              key={w.kop}
              className="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-16 items-center"
            >
              <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <p className="font-heading text-[13px] font-bold text-flame mb-3">
                  0{i + 1}
                </p>
                <h3
                  className="font-heading font-bold text-ink leading-[1.02]"
                  style={{ fontSize: 'clamp(28px, 3.4vw, 44px)', letterSpacing: '-0.03em' }}
                >
                  {w.kop}
                  <span className="text-flame">.</span>
                </h3>
                <p className="mt-4 text-[16px] md:text-[17px] leading-[1.65] text-muted max-w-xl">
                  {w.belofte}
                </p>
                <p className="mt-5 text-[14px] font-semibold text-petrol">{w.regel}</p>
                <Link
                  href={w.href}
                  className="group inline-flex items-center gap-2 mt-4 text-[15px] font-semibold text-petrol"
                >
                  <span className="relative">
                    {w.linkLabel}
                    <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-petrol/30" />
                  </span>
                  <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>

              <LoopVideo
                bron={w.video}
                label={w.videoLabel}
                className={i % 2 === 1 ? 'lg:order-1' : ''}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
