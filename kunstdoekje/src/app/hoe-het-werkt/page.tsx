import Link from 'next/link'

export const metadata = {
  title: 'Hoe het werkt — het art frame met wisselsysteem',
  description: 'Zo werkt het Kunstdoekje art frame: aluminium wissellijst één keer ophangen, doek met pees in de gleuf drukken, klaar in 30 seconden.',
  alternates: { canonical: '/hoe-het-werkt' },
}

const stappen = [
  { n: '1', t: 'Kies je kunstwerk', d: 'Blader door honderden kunstdoeken — van oude meesters tot moderne en AI-kunst — of upload je eigen foto.' },
  { n: '2', t: 'Stel je doek samen', d: 'Kies je formaat, velvet of deco stof, en of je het compleet met luxe aluminium lijst wilt.' },
  { n: '3', t: 'Hang de lijst op', d: 'De lijst hang je eenmalig aan de muur, inclusief duidelijke instructies. Klaar in een paar minuten.' },
  { n: '4', t: 'Wissel wanneer je wilt', d: 'Klik het doek met het koord in de lijst. Een nieuw seizoen of nieuwe sfeer? Wissel in één minuut.' },
]

export default function HoeHetWerkt() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-accent">Hoe het werkt</p>
      <h1 className="mt-3 font-serif text-4xl">Eén lijst, eindeloos wisselen</h1>
      <p className="mt-4 text-lg text-ink/70">
        Een Kunstdoekje is een print op luxe stof met een koord dat je simpelweg in de lijst drukt.
        Investeer één keer in een mooie lijst en wissel daarna eindeloos van kunst.
      </p>

      <div className="mt-12 space-y-8">
        {stappen.map((s) => (
          <div key={s.n} className="flex gap-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 font-serif text-lg text-accent">
              {s.n}
            </div>
            <div>
              <p className="font-medium">{s.t}</p>
              <p className="mt-1 text-ink/65">{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl bg-white/50 p-8">
        <h2 className="font-serif text-2xl">Waarom een Kunstdoekje?</h2>
        <ul className="mt-4 space-y-2 text-ink/70">
          <li>• Eén lijst, oneindig veel kunstwerken — wissel naar wens.</li>
          <li>• Op bestelling geprint in Nederland, geen overproductie.</li>
          <li>• Luxe velvet of matte deco stof met diepe, kleurvaste print.</li>
          <li>• Losse doeken voordelig bij te bestellen.</li>
          <li>• Geen opslagruimte nodig en geen transportschade.</li>
        </ul>
      </div>

      <div className="mt-12 text-center">
        <Link href="/shop" className="inline-block rounded-xl bg-ink px-8 py-4 font-medium text-canvas hover:bg-ink/90">
          Bekijk de collectie
        </Link>
      </div>
    </div>
  )
}
