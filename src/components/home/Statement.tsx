import Link from 'next/link'

/* Eén typografisch moment, geen cards. De volledige flow staat op /hoe-het-werkt.
   Geen entree-animatie: deze zin draagt de hele positionering en mag niet
   afhangen van een observer die in een niet-renderende tab niet vuurt. */
export default function Statement() {
  return (
    <section className="bg-white">
      <div className="container-site pt-4 pb-16 md:pt-6 md:pb-32">
        <blockquote className="max-w-3xl mx-auto text-center">
          <p
            className="font-heading font-bold text-petrol leading-[1.08] mb-7"
            style={{ fontSize: 'clamp(28px, 3.8vw, 46px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Je hebt vast al iets voor offertes en facturen. Maar portaal, mail en
            opvolging, waar het werk echt gewonnen wordt, doe je er nu naast<span className="text-flame">.</span>
          </p>
          <Link
            href="/hoe-het-werkt"
            className="group inline-flex items-center gap-2 text-[15px] md:text-[16px] font-semibold text-ink"
          >
            <span className="relative">
              Zie een hele werkdag in doen.
              <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-ink/30" />
            </span>
            <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </blockquote>
      </div>
    </section>
  )
}
