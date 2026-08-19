'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Loader2 } from 'lucide-react'

/* De bezoeker zet zijn eigen naam op een pand. Geen upload, geen account:
   één veld, drie panden, en binnen een halve minuut zijn eigen bedrijf op de
   gevel. Dat is de enige belofte op deze pagina die hij niet hoeft te geloven. */

const PANDEN = [
  { id: 'gevel', label: 'Winkelpui', bron: '/images/studio/gevel.jpg' },
  { id: 'bedrijfspand', label: 'Bedrijfspand', bron: '/images/studio/bedrijfspand.jpg' },
  { id: 'bus', label: 'Bus', bron: '/images/studio/bus.jpg' },
] as const

type PandId = (typeof PANDEN)[number]['id']

export default function StudioProef() {
  const [naam, setNaam] = useState('')
  const [pand, setPand] = useState<PandId>('gevel')
  const [bezig, setBezig] = useState(false)
  const [beeld, setBeeld] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)

  const gekozen = PANDEN.find((p) => p.id === pand)!
  const magVersturen = naam.trim().length >= 2 && !bezig

  async function maak(e: React.FormEvent) {
    e.preventDefault()
    if (!magVersturen) return
    setBezig(true)
    setFout(null)
    setBeeld(null)
    try {
      const antwoord = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam: naam.trim(), pand }),
      })
      const data = await antwoord.json()
      if (!antwoord.ok) setFout(data?.fout ?? 'Er ging iets mis. Probeer het nog een keer.')
      else setBeeld(data.beeld)
    } catch {
      setFout('Geen verbinding. Probeer het nog een keer.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <section className="bg-white">
      <div className="container-site py-16 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-10 lg:gap-16 items-start">
          <div>
            <h2
              className="font-heading font-bold text-petrol leading-[1.02] mb-4"
              style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', letterSpacing: '-0.03em' }}
            >
              Zet je eigen naam
              <br />
              op de gevel<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] md:text-[16px] leading-[1.6] text-muted mb-8 max-w-md">
              Dit is Studio, zoals het in doen. zit. Vul je bedrijfsnaam in, kies
              een pand en kijk wat eruit komt. Geen account nodig.
            </p>

            <form onSubmit={maak} className="space-y-5">
              <div>
                <label htmlFor="studio-naam" className="block text-[13px] font-semibold text-ink mb-2">
                  Je bedrijfsnaam
                </label>
                <input
                  id="studio-naam"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  maxLength={28}
                  placeholder="Van Dijk Signing"
                  className="w-full h-[52px] px-4 rounded-[6px] border border-petrol/20 bg-bg text-[16px] text-ink placeholder:text-muted/70 focus:outline-none focus:border-petrol/50 focus:ring-2 focus:ring-petrol/15 transition-shadow"
                />
              </div>

              <fieldset>
                <legend className="block text-[13px] font-semibold text-ink mb-2">Waarop</legend>
                <div className="flex flex-wrap gap-2">
                  {PANDEN.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPand(p.id)}
                      aria-pressed={pand === p.id}
                      className={[
                        'px-4 h-[42px] rounded-full text-[14px] font-medium transition-colors duration-200',
                        pand === p.id
                          ? 'bg-petrol text-white'
                          : 'bg-bg text-ink border border-petrol/15 hover:border-petrol/40',
                      ].join(' ')}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={!magVersturen}
                className="group inline-flex items-center gap-2.5 text-[15px] font-semibold text-white px-7 h-[54px] rounded-[6px] bg-flame transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
              >
                {bezig ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Bezig met monteren</span>
                  </>
                ) : (
                  <>
                    <span>Laat maar zien</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
                  </>
                )}
              </button>

              {fout && (
                <p role="alert" className="text-[14px] text-[#C0451A] max-w-md">
                  {fout}
                </p>
              )}
              <p className="text-[13px] text-muted max-w-md">
                Vijf per uur. In doen. zelf werkt Studio ook op je eigen foto&apos;s.
              </p>
            </form>
          </div>

          <div className="relative aspect-[10/7] w-full overflow-hidden rounded-[10px] bg-bg border border-petrol/10">
            <Image
              key={beeld ?? gekozen.bron}
              src={beeld ?? gekozen.bron}
              alt={
                beeld
                  ? `${naam} op de ${gekozen.label.toLowerCase()}, gemaakt met Studio`
                  : `${gekozen.label} zonder belettering`
              }
              fill
              unoptimized={Boolean(beeld)}
              sizes="(max-width: 1024px) 100vw, 700px"
              className="object-cover motion-safe:transition-opacity motion-safe:duration-500"
            />
            {bezig && (
              <div className="absolute inset-0 flex items-end bg-petrol-deep/45">
                <p className="w-full px-5 py-4 text-[14px] font-medium text-white">
                  Letters plaatsen, licht en schaduw laten kloppen. Dit duurt een halve minuut.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
