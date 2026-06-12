import QuoteForm from '@/components/QuoteForm'

export const metadata = { title: 'Maatwerk — Kunstdoekje' }

export default function Maatwerk() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-accent">Maatwerk</p>
      <h1 className="mt-3 font-serif text-4xl">Elk formaat mogelijk</h1>
      <p className="mt-4 text-lg text-ink/70">
        Past geen van de standaardformaten bij jouw muur? We maken je Kunstdoekje vrijwel op elk
        gewenst formaat. Vertel ons je wensen en je ontvangt snel een prijsopgave op maat.
      </p>

      <div className="mt-10">
        <QuoteForm type="maatwerk" showFormaat />
      </div>
    </div>
  )
}
