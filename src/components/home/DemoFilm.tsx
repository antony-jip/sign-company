import DemoVideo from '@/components/DemoVideo'

/* De demofilm op de homepage: de hele klus van aanvraag tot betaling in twee
   minuten, full-bleed over de paginabreedte. */
export default function DemoFilm() {
  return (
    <section className="pt-14 md:pt-28">
      <div className="container-site">
        <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 max-w-5xl">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
          >
            Liever kijken<span className="text-flame">?</span>
          </h2>
          <p className="text-[15px] md:text-[16px] text-muted max-w-sm leading-[1.55]">
            Eén klus, van eerste mail tot betaalde factuur. In twee minuten, met geluid.
          </p>
        </div>
      </div>

      {/* Full-bleed: de video pakt de hele paginabreedte */}
      <div className="mt-6 md:mt-10">
        <DemoVideo />
      </div>
    </section>
  )
}
