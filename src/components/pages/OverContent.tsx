'use client'

import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const team = [
  { name: 'Antony', role: 'Oprichter & Product' },
  { name: 'Daan', role: 'AI & Development' },
]

export default function OverContent() {
  return (
    <div className="pt-32 md:pt-40">
      {/* Hero */}
      <section className="pb-20 md:pb-32">
        <div className="container-site max-w-3xl">
          <SectionReveal>
            <p className="font-mono text-sm text-flame mb-4">Over ons</p>
            <h1 className="hero-heading font-heading text-petrol mb-8">
              Vakmanschap verdient beter gereedschap<span className="text-flame">.</span>
            </h1>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="space-y-6 text-ink/80 leading-relaxed">
              <p>
                We zagen dat signmakers en creatieve vakbedrijven hun avonden besteedden
                aan offertes typen in Excel, facturen kopiëren in Word en planningen
                bijhouden op whiteboards. Professionals die overdag vakwerk leveren,
                maar 's avonds vastlopen in administratie.
              </p>
              <p>
                Dat kan anders. Dat moet anders.
              </p>
              <p>
                doen<span className="text-flame">.</span> is gebouwd voor bedrijven die op
                projectbasis werken. Van eerste klantcontact tot de laatste factuur — alles
                in een systeem dat meedenkt. Geen overkill enterprise software, geen
                spreadsheet-chaos. Precies wat je nodig hebt, niets meer.
              </p>
              <p>
                We geloven dat goed gereedschap onzichtbaar is. Het staat niet in de weg,
                het helpt je sneller te werken. Zodat jij kunt doen waar je goed in bent.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Voor wie */}
      <section className="pb-20 md:pb-32 bg-white/50">
        <div className="container-site py-20">
          <SectionReveal>
            <h2 className="section-heading font-heading text-petrol mb-8">
              Voor wie<span className="text-flame">.</span>
            </h2>
          </SectionReveal>
          <SectionReveal delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Signbedrijven',
                  desc: 'Van gevelreclame tot voertuigbelettering. Je kent het vak, wij kennen de workflow.',
                },
                {
                  title: 'Creatieve vakbedrijven',
                  desc: 'Interieurbouw, standbouw, printproductie. Elk projectmatig bedrijf dat op maat werkt.',
                },
                {
                  title: 'Kleine teams',
                  desc: '2 tot 10 man. Groot genoeg voor structuur, klein genoeg om snel te schakelen.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-8 border border-ink/[0.04]"
                >
                  <h3 className="font-heading text-lg text-petrol tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Team */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <SectionReveal>
            <h2 className="section-heading font-heading text-petrol mb-10">
              Het team<span className="text-flame">.</span>
            </h2>
          </SectionReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md">
            {team.map((person, i) => (
              <SectionReveal key={i} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-6 border border-ink/[0.04]">
                  <div className="w-12 h-12 rounded-full bg-petrol/10 mb-4 flex items-center justify-center">
                    <span className="font-heading text-lg text-petrol">
                      {person.name[0]}
                    </span>
                  </div>
                  <p className="font-semibold text-petrol">{person.name}</p>
                  <p className="text-sm text-muted">{person.role}</p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 md:pb-32">
        <div className="container-site text-center">
          <SectionReveal>
            <h2 className="font-heading text-2xl text-petrol mb-6">
              Doe waar je goed in bent<span className="text-flame">.</span>
            </h2>
            <p className="text-muted mb-8">De rest regelen wij.</p>
            <div className="flex justify-center">
              <WachtlijstForm />
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  )
}
