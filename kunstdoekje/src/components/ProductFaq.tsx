/**
 * Conversiegerichte FAQ op de productpagina — focus op luxe en kwaliteit.
 * Native <details>: geen client-JS nodig, eerste vraag staat open.
 */
const VRAGEN = [
  {
    v: 'Hoe luxe voelt de stof?',
    a: 'Fluweel absorbeert licht, geeft diepere kleuren en voelt zacht aan — het verschil met een standaard canvasdoek zie én voel je. Liever mat en strak? Kies dan decostof. Zelfde kunst, andere beleving.',
  },
  {
    v: 'Welke kwaliteit heeft het frame?',
    a: 'Een aluminium wisselframe dat je één keer ophangt en jaren meegaat. Het doek heeft rondom een pees die je in de gleuf drukt — strak gespannen, zonder golvingen. Een framekleur in elke gewenste RAL-kleur is op aanvraag mogelijk.',
  },
  {
    v: 'Hoe snel wissel ik van doek?',
    a: 'In zo’n 30 seconden, zonder gereedschap. Druk de pees van het nieuwe doek in de gleuf en klaar. Zo wisselt je muur mee met je smaak — of met het seizoen.',
  },
  {
    v: 'Waar wordt mijn doek gemaakt?',
    a: 'Elk doek wordt op bestelling voor je geprint in Nederland. Geen voorraad, geen overproductie — jouw doek wordt voor jou gemaakt.',
  },
  {
    v: 'Wat als het toch niet past bij mijn interieur?',
    a: 'Je hebt 30 dagen bedenktijd. En dankzij het wisselsysteem hoef je nooit meer te boren als je smaak verandert — je wisselt gewoon het doek.',
  },
]

export default function ProductFaq() {
  return (
    <div className="mt-10">
      <p className="label-caps reg-mark pl-4 text-ink/50">Goed om te weten</p>
      <div className="mt-4 border-t border-ink/20">
        {VRAGEN.map((q, i) => (
          <details key={q.v} open={i === 0} className="group border-b border-ink/20">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
              <span className="font-serif text-sm font-extrabold uppercase tracking-tight">{q.v}</span>
              <span className="font-accent shrink-0 text-xl italic text-accent transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-5 pr-8 text-sm leading-relaxed text-ink/70">{q.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
