import QuoteForm from '@/components/QuoteForm'

export const metadata = {
  title: 'Contact',
  description: 'Vragen over je art frame of kunstdoek? Neem contact op met Kunstdoekje — we helpen je graag.',
  alternates: { canonical: '/contact' },
}

export default function Contact() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl">Contact</h1>
      <div className="mt-8 grid gap-12 md:grid-cols-[1fr_300px]">
        <div>
          <p className="text-ink/70">
            Een vraag over je bestelling, een kunstdoek of de mogelijkheden? Stuur ons een bericht
            en we reageren zo snel mogelijk.
          </p>
          <div className="mt-8">
            <QuoteForm type="contact" />
          </div>
        </div>
        <aside className="h-fit rounded-xl border border-black/10 p-6 text-sm">
          <p className="font-medium">Kunstdoekje</p>
          <ul className="mt-3 space-y-2 text-ink/65">
            <li>info@kunstdoekje.nl</li>
            <li>+31 (0)85 060 8476</li>
            <li>Enkhuizen, Nederland</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
