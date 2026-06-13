import QuoteForm from '@/components/QuoteForm'

export const metadata = {
  title: 'Contact',
  description: 'Vragen over je art frame of kunstdoek? Neem contact op met Kunstdoekje · we helpen je graag.',
  alternates: { canonical: '/contact' },
}

export default function Contact({
  searchParams,
}: {
  searchParams: { onderwerp?: string; ral?: string; formaat?: string; prijs?: string }
}) {
  // Prefill vanuit de RAL-frame configurator (of andere bron met query-params)
  const { onderwerp, ral, formaat, prijs } = searchParams
  const heeftAanvraag = Boolean(onderwerp || ral || formaat)
  const initialBericht = heeftAanvraag
    ? [
        onderwerp ? `Aanvraag: ${onderwerp}` : '',
        ral ? `Kleur: ${ral}` : '',
        formaat ? `Formaat: ${formaat}` : '',
        prijs ? `Prijs: ${prijs}` : '',
        '',
        'Graag ontvang ik een betaallink. Bedankt!',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-serif text-4xl">Contact</h1>
      <div className="mt-8 grid gap-12 md:grid-cols-[1fr_300px]">
        <div>
          <p className="text-ink/70">
            {heeftAanvraag
              ? 'Je keuze staat alvast in het bericht. Vul je gegevens aan en verstuur · je ontvangt snel een betaallink.'
              : 'Een vraag over je bestelling, een kunstdoek of de mogelijkheden? Stuur ons een bericht en we reageren zo snel mogelijk.'}
          </p>
          <div className="mt-8">
            <QuoteForm type="contact" initialFormaat={formaat ?? ''} initialBericht={initialBericht} />
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
