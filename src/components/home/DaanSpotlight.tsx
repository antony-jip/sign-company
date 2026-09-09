import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

/* Eén ding krijgt een spotlight, de rest staat in de index.

   Daan en het geheugen zijn wat geen enkele boekhoud- of projecttool voor
   signbedrijven heeft, en ze stonden als één regel in een lijst van elf. Dit
   is het blok dat kit.com voor Subscriber Signals en MCP gebruikt: donker
   vlak, badge, drie regels, twee CTA's.

   Badge in het bestaande patroon uit Modules.tsx (flame-rand, 11px), niet het
   vervallen eyebrow-canon. */

const REGELS = [
  'Het PO-nummer van die aannemer, anders blijft je factuur twee weken liggen.',
  'Montage bij het Wilgenhof kan alleen maandag, dan is de zaak dicht.',
  'Marktstraat 12: hoogwerker nodig, laden via het achterterrein.',
]

export default function DaanSpotlight() {
  return (
    <section className="relative overflow-hidden bg-petrol-deep">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 85% at 12% 0%, rgba(42,111,122,0.45) 0%, rgba(42,111,122,0) 62%)',
        }}
      />
      <div className="container-site relative tegel">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <span className="inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded-full border border-flame/60 text-flame">
              Daan AI
            </span>
            <h2
              className="font-heading font-bold text-white leading-[1.02] mt-4"
              style={{ fontSize: 'clamp(28px, 3.8vw, 48px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Je slimste collega onthoudt wat jij vergeet<span className="text-flame">.</span>
            </h2>
            <p className="mt-5 tekst-body max-w-xl" style={{ color: 'rgba(226,240,241,0.82)' }}>
              Daan leest mee met je mail, je offertes en je klussen, en houdt vast wat
              blijvend is over een klant of een pand. Daarna handelt de rest van het
              systeem daarnaar, ook als een collega de klus oppakt.
            </p>

            <ul className="mt-7 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
              {REGELS.map((r) => (
                <li
                  key={r}
                  className="tekst-body flex items-start gap-3 py-3.5 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(226,240,241,0.82)' }}
                >
                  <span aria-hidden className="text-flame font-bold shrink-0 mt-px">
                    ·
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/features/geheugen" className="knop knop-groot knop-flame group">
                <span>Zo werkt het geheugen</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </Link>
              <Link href="/features/ai" className="knop knop-groot knop-lijn-wit group">
                <span>Alles wat Daan doet</span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          <div className="productbeeld relative aspect-[4/3] w-full overflow-hidden rounded-card bg-white/5">
            <Image
              src="/images/fotos/p-email-daan.webp"
              alt="Ondernemer kijkt met een koffie in de hand op zijn telefoon in de deuropening van de werkplaats, een collega draagt een ingepakt paneel naar de bus"
              fill
              sizes="(max-width: 1024px) 100vw, 520px"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
