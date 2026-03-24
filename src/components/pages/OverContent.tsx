'use client'

import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

export default function OverContent() {
  return (
    <div className="pt-32 md:pt-40">
      {/* Hero */}
      <section className="pb-20 md:pb-32">
        <div className="container-site max-w-3xl">
          <SectionReveal>
            <p className="font-mono text-sm text-flame mb-4">Over ons</p>
            <h1 className="hero-heading font-heading text-petrol mb-8">
              We kennen het vak<span className="text-flame">.</span>
              <br />
              Omdat we het zelf doen<span className="text-flame">.</span>
            </h1>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="space-y-6 text-ink/80 leading-relaxed">
              <p>
                We zijn signmakers. We staan in de werkplaats, rijden naar montages,
                maken offertes en sturen facturen. En we misten software die paste
                bij hoe wij werken.
              </p>
              <p>
                Alles wat er was, was te ingewikkeld, te duur of niet gemaakt voor
                ons vak. Enterprise-systemen voor multinationals, of simpele
                factuurtjes-apps die de helft misten. Niets ertussenin.
              </p>
              <p>
                Dus bouwden we het zelf.
              </p>
              <p>
                doen<span className="text-flame">.</span> is geboren uit frustratie
                en vakmanschap. Gebouwd door mensen die weten hoe een werkdag eruitziet.
                Die snappen dat je monteur om 7 uur in z&apos;n busje zit en geen
                handleiding gaat lezen. Die weten dat een offerte soms in de lunchpauze
                af moet.
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
                  desc: 'Van gevelreclame tot voertuigbelettering. We komen uit dit vak. We weten hoe een werkdag eruitziet.',
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
                  className="bg-white rounded-2xl p-8 border border-black/[0.05]"
                  style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}
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

      {/* Filosofie */}
      <section className="pb-20 md:pb-32">
        <div className="container-site max-w-3xl">
          <SectionReveal>
            <h2 className="section-heading font-heading text-petrol mb-8">
              Onze filosofie<span className="text-flame">.</span>
            </h2>
          </SectionReveal>
          <SectionReveal delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Alles erin',
                  desc: 'Geen modules bijkopen. Geen premium-tier. Iedereen krijgt alles. Planning, klantportaal, AI — het zit erin.',
                },
                {
                  title: 'Eerlijke prijs',
                  desc: 'Geen per-user pricing die meegroeit tot je bankrekening leeg is. Een vaste prijs voor je hele team.',
                },
                {
                  title: 'Gebouwd voor het vak',
                  desc: 'Geen generieke bedrijfssoftware. Elk scherm, elke workflow is ontworpen voor hoe projectmatige bedrijven werken.',
                },
                {
                  title: 'Geen lock-in',
                  desc: 'Jouw data is van jou. Export wanneer je wilt. Maandelijks opzegbaar. Je blijft omdat het werkt.',
                },
              ].map((item, i) => (
                <div key={i} className="py-4">
                  <h3 className="font-heading text-lg text-petrol tracking-tight mb-2">
                    {item.title}<span className="text-flame">.</span>
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </SectionReveal>
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
