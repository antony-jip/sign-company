/* Het waarom, direct na de belofte. Typografie doet het werk: één grote
   gedachte en drie regels die zeggen waar doen. voor staat. Geen kaarten,
   geen iconen, geen entree-animatie: dit moet er staan, altijd. */

const OVERTUIGINGEN = [
  {
    kop: 'Vakwerk verdient vakgereedschap',
    regel:
      'Je rekent in vierkante meters en PMS-kleuren, niet in kantoorlogica. Software hoort dat te snappen, niet jij de software.',
  },
  {
    kop: 'Maken gaat voor administreren',
    regel:
      'Elk uur achter een offerte die je half opnieuw uitrekent, is een uur dat niet aan de gevel hangt. Dat uur halen we terug.',
  },
  {
    kop: 'Gebouwd in de werkplaats',
    regel:
      'Door een signbedrijf dat sinds 1983 namen op panden zet en er zelf elke dag op draait. Wat niet werkte, ging eruit voordat jij het zag.',
  },
]

export default function Manifest() {
  return (
    <section className="bg-bg">
      <div className="container-site py-16 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20 lg:items-center">
          <div>
            <h2
              className="font-heading font-bold text-petrol leading-[1.0]"
              style={{ fontSize: 'clamp(34px, 4.8vw, 64px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Kijk om je heen<span className="text-flame">.</span>
            </h2>
            <p className="mt-6 md:mt-8 text-[18px] md:text-[22px] leading-[1.5] text-ink max-w-xl font-medium">
              De bakker op de hoek, de bus van de loodgieter, het bord bij de
              bouwplaats, de naam op het stadion. Allemaal gemaakt door mensen
              zoals jij. Signmakers maken bedrijven zichtbaar.
            </p>
            <p className="mt-5 text-[16px] md:text-[17px] leading-[1.65] text-muted max-w-xl">
              Daar mag je trots op zijn. En daar hoort gereedschap bij dat net zo
              goed is als je werk. Daarom bestaat doen.
            </p>
          </div>

          <ul className="border-t border-petrol/10 lg:mt-3">
            {OVERTUIGINGEN.map((o, i) => (
              <li key={o.kop} className="border-b border-petrol/10 py-6 md:py-7">
                <div className="flex items-baseline gap-4">
                  <span className="font-heading text-[14px] font-bold text-flame shrink-0 w-7">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading text-[20px] md:text-[23px] font-bold text-ink leading-[1.1]">
                      {o.kop}
                      <span className="text-flame">.</span>
                    </h3>
                    <p className="mt-2 text-[15px] md:text-[16px] leading-[1.6] text-muted">{o.regel}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
