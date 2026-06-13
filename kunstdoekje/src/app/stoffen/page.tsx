import Image from 'next/image'
import Link from 'next/link'
import { getFabrics, getPrices } from '@/lib/catalog'
import { formatEuro } from '@/lib/pricing'
import { STOFFEN } from '@/lib/stoffen'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Deco vs Fluweel · vergelijk de stoffen',
  description:
    'Deco of fluweel? Vergelijk beide luxe stoffen van Kunstdoekje op textuur, kleurdiepte en sfeer, en kies de stof die het beste bij jouw kunstwerk en interieur past.',
  alternates: { canonical: '/stoffen' },
}

export default async function StoffenPage() {
  // "Vanaf"-prijs per stof: laagste losse-doekprijs uit de matrix.
  const vanafPerStof = new Map<string, number>()
  try {
    const [fabrics, prices] = await Promise.all([getFabrics(), getPrices()])
    for (const stof of STOFFEN) {
      const fab = fabrics.find((f) => f.key === stof.key)
      const rows = fab ? prices.filter((p) => p.fabric_id === fab.id) : []
      if (rows.length) vanafPerStof.set(stof.key, Math.min(...rows.map((p) => p.doek_price_cents)))
    }
  } catch {
    /* prijzen zijn nice-to-have */
  }

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-10 pt-16 text-center" data-reveal>
        <p className="label-caps reg-mark inline-block pl-4 text-ink/50">De stoffen</p>
        <h1 className="mt-5 font-serif text-[clamp(38px,7vw,68px)] leading-[0.95] tracking-tight">
          Deco <em className="font-accent text-[0.7em] font-normal normal-case italic tracking-normal text-accent">vs</em> Fluweel
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink/70">
          Beide stoffen zijn van topkwaliteit en op bestelling geprint in Nederland. De keuze hangt
          af van de sfeer die je zoekt · vergelijk ze hieronder.
        </p>
      </section>

      {/* Vergelijking */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-2" data-reveal-group>
          {STOFFEN.map((stof) => {
            const vanaf = vanafPerStof.get(stof.key)
            return (
              <article
                key={stof.key}
                className={`group relative overflow-hidden rounded-[4px] border bg-paper transition-all duration-300 hover:-translate-y-1 hover:shadow-hard-sm ${
                  stof.populair ? 'border-accent/35' : 'border-ink/15'
                }`}
              >
                {stof.populair && (
                  <span className="absolute right-4 top-4 z-10 rounded-full bg-ink px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-canvas">
                    Meest gekozen
                  </span>
                )}
                <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                  <Image
                    src={stof.img}
                    alt={stof.alt}
                    fill
                    sizes="(max-width:768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="p-6 sm:p-8">
                  <h2 className="font-serif text-3xl">{stof.naam}</h2>
                  <p className="mt-1 text-sm text-ink/55">{stof.ondertitel}</p>

                  {vanaf ? (
                    <p className="mt-4 inline-flex items-baseline gap-2 rounded-[3px] bg-canvas px-3 py-2">
                      <span className="label-caps text-ink/45">Los doek v.a.</span>
                      <span className="font-serif text-2xl">{formatEuro(vanaf)}</span>
                    </p>
                  ) : null}

                  <p className="mt-4 text-sm leading-relaxed text-ink/70">{stof.beschrijving}</p>

                  <dl className="mt-6 grid grid-cols-2 gap-3">
                    {stof.eigenschappen.map((e) => (
                      <div key={e.label} className="rounded-[3px] border border-ink/10 bg-canvas px-3 py-2.5">
                        <dt className="label-caps text-ink/40">{e.label}</dt>
                        <dd className="mt-1 text-[13px] font-semibold text-ink">{e.waarde}</dd>
                      </div>
                    ))}
                  </dl>

                  <Link
                    href="/shop"
                    className={`mt-6 flex w-full items-center justify-center gap-2 rounded-[3px] border px-4 py-3.5 text-[13px] font-semibold uppercase tracking-[0.14em] transition ${
                      stof.populair
                        ? 'border-ink bg-ink text-canvas hover:border-accent hover:bg-accent hover:text-ink'
                        : 'border-ink/40 text-ink hover:border-ink hover:bg-ink hover:text-canvas'
                    }`}
                  >
                    Kies {stof.naam.toLowerCase()} →
                  </Link>
                </div>
              </article>
            )
          })}
        </div>

        {/* Advies */}
        <div className="mt-8 rounded-[4px] border border-accent/30 bg-accent/[0.08] p-8 text-center" data-reveal>
          <h3 className="font-serif text-2xl">Ons advies?</h3>
          <p className="mx-auto mt-2 max-w-xl text-ink/70">
            Twijfel je? Kies <strong>fluweel</strong>. De stof neemt meer kleur op dan deco, waardoor
            je kunstwerk diepte krijgt en echt tot leven komt. Liever mat en strak in een moderne
            ruimte? Dan is deco precies goed.
          </p>
          <Link href="/shop" className="btn-primary mt-6">Bekijk de collectie →</Link>
        </div>
      </section>
    </div>
  )
}
