import { ArrowRight } from 'lucide-react'

/* De afsluiter waar de knoop wordt doorgehakt. Eén e-mailveld hier, het
   wachtwoord in de app: Supabase blijft achter app.doen.team, dus dit
   formulier is een GET die het adres meeneeft naar het registratiescherm.

   Gedeeld door /prijzen en /demo. Beide pagina's eindigen met dezelfde
   handeling, dus die hoort niet twee keer in de codebase te staan. */

const ZEKERHEDEN = ['30 dagen gratis', 'geen creditcard', 'maandelijks opzegbaar']

const STAPPEN = ['Vul je e-mailadres in', 'Wij bellen voor je onboarding', 'Jouw eerste offerte de deur uit']

export function AanmeldKaart({ veldId = 'aanmeld-email' }: { veldId?: string }) {
  return (
    <form
      action="https://app.doen.team/register"
      method="get"
      className="rounded-[12px] bg-white border border-petrol/10 p-7 md:p-9 shadow-[0_1px_2px_rgba(20,40,40,0.04),0_24px_56px_-32px_rgba(13,52,60,0.35)]"
    >
      <h3 className="font-heading text-[26px] md:text-[28px] font-bold text-petrol leading-none">
        Aan de slag<span className="text-flame">.</span>
      </h3>
      <label htmlFor={veldId} className="mt-6 block text-[14px] font-semibold text-ink">
        E-mailadres
      </label>
      <input
        id={veldId}
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="naam@bedrijf.nl"
        className="mt-2 w-full h-[52px] px-4 rounded-[6px] bg-bg text-ink text-[16px] border border-petrol/15 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/60 focus:border-flame focus:ring-[3px] focus:ring-flame/15"
      />

      <button
        type="submit"
        className="group mt-5 w-full inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white bg-flame h-[54px] rounded-[6px] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span>Start gratis</span>
        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
      </button>

      <p className="mt-4 text-center text-[13px] text-muted">
        Hierna kies je alleen nog een wachtwoord.
      </p>
    </form>
  )
}

export default function AanmeldSectie({
  kop = 'Vandaag nog aan de slag',
  intro = 'Geen verkoopgesprek. Account maken, en gaan.',
  veldId,
}: {
  kop?: string
  intro?: string
  veldId?: string
}) {
  return (
    <section id="aanmelden" className="bg-white scroll-mt-24">
      <div className="container-site py-16 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-12 lg:gap-20 items-start">
          <div>
            <h2
              className="font-heading font-bold text-petrol leading-[1.0] mb-4"
              style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              {kop}
              <span className="text-flame">.</span>
            </h2>
            <p className="text-[16px] md:text-[17px] text-muted leading-[1.6] max-w-md mb-8">{intro}</p>

            <ol className="border-t border-petrol/10">
              {STAPPEN.map((stap, i) => (
                <li key={stap} className="flex items-center gap-5 py-4 border-b border-petrol/10">
                  <span className="font-heading text-[15px] font-bold text-flame tabular-nums shrink-0">
                    0{i + 1}
                  </span>
                  <span className="text-[16px] font-semibold text-ink leading-snug">{stap}</span>
                </li>
              ))}
            </ol>

            <ul className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              {ZEKERHEDEN.map((punt) => (
                <li key={punt} className="flex items-center gap-2.5 text-[15px] font-semibold text-petrol">
                  <span aria-hidden className="text-flame">✓</span>
                  <span>
                    {punt}
                    <span className="text-flame">.</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <AanmeldKaart veldId={veldId} />
        </div>
      </div>
    </section>
  )
}
