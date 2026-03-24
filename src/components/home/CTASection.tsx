'use client'

import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

export default function CTASection() {
  return (
    <section id="wachtlijst" className="py-20 md:py-32">
      <div className="container-site">
        <div className="max-w-xl mx-auto text-center">
          <SectionReveal>
            <h2 className="section-heading font-heading text-petrol mb-4">
              Slim gedaan<span className="text-flame">.</span> Doe je mee?
            </h2>
            <p className="text-muted mb-10">
              Doe waar je goed in bent. De rest regelen wij.
            </p>
          </SectionReveal>
          <SectionReveal delay={0.2}>
            <div className="flex justify-center">
              <WachtlijstForm />
            </div>
            <p className="text-xs text-muted/60 mt-3">
              Eerste 30 dagen gratis. Geen creditcard nodig.
            </p>
          </SectionReveal>
        </div>
      </div>
    </section>
  )
}
