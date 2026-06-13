import QuoteForm from '@/components/QuoteForm'

export const metadata = {
  title: 'Eigen foto op doek · voor je art frame',
  description: 'Upload je eigen foto en ontvang hem als wisselbaar kunstdoek op fluweel of decostof, passend in het Kunstdoekje art frame.',
  alternates: { canonical: '/eigen-foto' },
}

export default function EigenFoto() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-accent" data-reveal>Eigen foto</p>
      <h1 className="mt-3 font-serif text-4xl">Jouw foto als kunstdoek</h1>
      <p className="mt-4 text-lg text-ink/70">
        Een dierbare herinnering, eigen fotografie of een ontwerp? We printen jouw beeld op luxe
        velvet of deco stof · als wisselbaar doek voor je lijst.
      </p>

      <div className="mt-8 rounded-2xl bg-white/50 p-6 text-sm text-ink/70">
        <p className="font-medium text-ink">Tips voor het beste resultaat</p>
        <ul className="mt-2 space-y-1" data-reveal-group>
          <li>• Gebruik een zo hoog mogelijke resolutie (minimaal ~100 DPI op het gewenste formaat).</li>
          <li>• Liggend of staand beeld dat past bij de verhouding van je formaat.</li>
          <li>• Twijfel je over de kwaliteit? Stuur je foto en we beoordelen het gratis.</li>
        </ul>
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-2xl">Stuur ons je wens</h2>
        <p className="mt-2 text-ink/65">
          Vertel ons het gewenste formaat en je beeld; we sturen je een prijsopgave en uploadlink.
        </p>
        <div className="mt-6">
          <QuoteForm type="maatwerk" showFormaat />
        </div>
      </div>

      <p className="mt-6 text-xs text-ink/50">
        Binnenkort kun je je foto hier direct uploaden en samenstellen. Nu nog even via dit formulier.
      </p>
    </div>
  )
}
