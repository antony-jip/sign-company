import QuoteForm from '@/components/QuoteForm'

export const metadata = { title: 'Zakelijk — Kunstdoekje voor bedrijven' }

const voordelen = [
  { t: 'Sfeer & uitstraling', d: 'Geef je kantoor, praktijk, hotel of restaurant een warme, professionele uitstraling.' },
  { t: 'Eenvoudig wisselen', d: 'Wissel kunst per seizoen of campagne — één lijst, eindeloze mogelijkheden.' },
  { t: 'Akoestiek-optie', d: 'Zachte stof helpt galm te dempen; ideaal voor open ruimtes en kantoortuinen.' },
  { t: 'Eigen huisstijl', d: 'Plaats je eigen beelden, branding of fotografie op het doek.' },
]

export default function Zakelijk() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-accent">Zakelijk</p>
      <h1 className="mt-3 font-serif text-4xl">Kunstdoeken voor bedrijven</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink/70">
        Van kantoor en horeca tot zorg en retail: wisselbare kunstdoeken brengen sfeer, identiteit en
        rust in elke ruimte. We denken graag mee over een passende inrichting en maken een voorstel op maat.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {voordelen.map((v) => (
          <div key={v.t} className="rounded-xl border border-black/10 p-6">
            <p className="font-medium">{v.t}</p>
            <p className="mt-1 text-sm text-ink/65">{v.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl bg-white/50 p-8">
        <h2 className="font-serif text-2xl">Vraag een zakelijk voorstel aan</h2>
        <p className="mt-2 text-ink/65">Vertel ons over je ruimte en wensen — we nemen snel contact op.</p>
        <div className="mt-6">
          <QuoteForm type="zakelijk" showBedrijf showFormaat />
        </div>
      </div>
    </div>
  )
}
