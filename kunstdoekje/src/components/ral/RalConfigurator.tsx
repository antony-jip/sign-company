'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatEuro } from '@/lib/pricing'
import { RAL_CATEGORIEEN, RAL_MATEN, type RalColor, type RalMaat } from '@/lib/ral'

/**
 * Live 3D box-canvas: het doek hangt licht gedraaid aan de muur zodat de
 * gespoten zijkanten zichtbaar zijn. Die zijkanten kleuren soepel mee met de
 * gekozen RAL-kleur · precies wat je in het echt ziet.
 */
function CanvasMockup({ hex, code, naam }: { hex?: string; code?: string; naam?: string }) {
  const c = hex ?? '#A6A6A6'
  const W = 296
  const H = 210
  const D = 30
  const trans = 'background-color 0.55s cubic-bezier(0.22,1,0.36,1)'

  // Eén zijkant: gekleurd vlak + schaduw/hooglicht-overlay voor 3D-diepte.
  const Zijkant = ({
    w,
    h,
    transform,
    overlay,
  }: {
    w: number
    h: number
    transform: string
    overlay: string
  }) => (
    <div
      className="absolute left-1/2 top-1/2 overflow-hidden"
      style={{ width: w, height: h, transform: `translate(-50%,-50%) ${transform}`, backgroundColor: c, transition: trans }}
    >
      <div className="absolute inset-0" style={{ background: overlay }} />
    </div>
  )

  return (
    <div className="rounded-[4px] border border-ink/15 bg-[radial-gradient(120%_90%_at_40%_20%,#FCFBF4,#EBE9DB)] p-6 sm:p-8">
      <div className="relative flex min-h-[300px] items-center justify-center [perspective:1500px]">
        {/* drukschaduw op de muur */}
        <div className="absolute bottom-6 left-1/2 h-7 w-3/4 -translate-x-1/2 rounded-[50%] bg-ink/25 blur-xl" />

        <div
          className="relative"
          style={{
            width: W,
            height: H,
            transformStyle: 'preserve-3d',
            transform: 'rotateX(6deg) rotateY(-27deg)',
          }}
        >
          {/* zijkanten (de gespoten randen) */}
          <Zijkant w={D} h={H} transform={`rotateY(90deg) translateZ(${W / 2}px)`} overlay="rgba(0,0,0,0.20)" />
          <Zijkant w={D} h={H} transform={`rotateY(-90deg) translateZ(${W / 2}px)`} overlay="rgba(0,0,0,0.34)" />
          <Zijkant w={W} h={D} transform={`rotateX(90deg) translateZ(${H / 2}px)`} overlay="rgba(255,255,255,0.10)" />
          <Zijkant w={W} h={D} transform={`rotateX(-90deg) translateZ(${H / 2}px)`} overlay="rgba(0,0,0,0.30)" />

          {/* voorzijde: het doek */}
          <div
            className="absolute left-1/2 top-1/2 overflow-hidden"
            style={{ width: W, height: H, transform: `translate(-50%,-50%) translateZ(${D / 2}px)` }}
          >
            <Image src="/home/fluweel-3.webp" alt="" fill sizes="300px" className="object-cover" />
            <span
              key={c}
              className="kd-sheen pointer-events-none absolute -inset-y-6 left-0 w-2/5 bg-gradient-to-r from-transparent via-white/35 to-transparent"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3 text-center">
        <span
          className="h-9 w-9 shrink-0 rounded-full border border-ink/15 shadow-inner"
          style={{ backgroundColor: c, transition: trans }}
        />
        <span>
          <span className="block font-serif text-lg leading-tight">
            {code ? `RAL ${code}` : 'Geborsteld aluminium'}
          </span>
          <span className="block text-sm text-ink/55">{naam ?? 'Kies hiernaast je kleur'}</span>
        </span>
      </div>
    </div>
  )
}

export default function RalConfigurator() {
  const [catKey, setCatKey] = useState(RAL_CATEGORIEEN[0].key)
  const [kleur, setKleur] = useState<RalColor | null>(null)
  const [eigenRal, setEigenRal] = useState('')
  const [maat, setMaat] = useState<RalMaat | null>(null)

  const categorie = RAL_CATEGORIEEN.find((c) => c.key === catKey) ?? RAL_CATEGORIEEN[0]

  // Effectieve kleur: gekozen swatch of eigen RAL-code
  const gekozenKleur = useMemo(() => {
    if (eigenRal.trim()) return { code: eigenRal.trim().replace(/^ral\s*/i, ''), naam: 'Eigen kleur', hex: '#CCCCCC' }
    return kleur
  }, [eigenRal, kleur])

  const contactHref = useMemo(() => {
    const p = new URLSearchParams({ onderwerp: 'RAL-frame bestelling' })
    if (gekozenKleur) p.set('ral', `RAL ${gekozenKleur.code} · ${gekozenKleur.naam}`)
    if (maat) {
      p.set('formaat', `${maat.label} cm`)
      p.set('prijs', formatEuro(maat.prijsCents))
    }
    return `/contact?${p.toString()}`
  }, [gekozenKleur, maat])

  const klaar = Boolean(gekozenKleur && maat)

  return (
    <div className="space-y-16">
      {/* 1. Kleur kiezen */}
      <div id="kies-kleur" className="scroll-mt-28">
        <div className="text-center">
          <p className="label-caps reg-mark inline-block pl-4 text-ink/50">Stap 1</p>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl">Kies je kleur</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink/65">
            Hieronder onze populairste keuzes ter inspiratie · <strong>élke RAL-kleur is mogelijk</strong>.
            Heb je een specifieke code? Vul ’m onderaan in.
          </p>
        </div>

        {/* Live preview (links, plakt mee) + kiezer (rechts) */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div className="lg:sticky lg:top-28 lg:h-fit">
            <CanvasMockup hex={gekozenKleur?.hex} code={gekozenKleur?.code} naam={gekozenKleur?.naam} />
          </div>

          <div>
            {/* Categorie-tabs */}
            <div className="flex flex-wrap gap-2">
              {RAL_CATEGORIEEN.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCatKey(c.key)}
                  className={`rounded-full border px-4 py-2 text-[12px] font-semibold transition ${
                    c.key === catKey
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-ink/20 text-ink/60 hover:border-ink/50 hover:text-ink'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Kleurraster */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categorie.kleuren.map((k) => {
                const actief = !eigenRal && kleur?.code === k.code && kleur?.naam === k.naam
                return (
                  <button
                    key={`${k.code}-${k.naam}`}
                    type="button"
                    onClick={() => {
                      setKleur(k)
                      setEigenRal('')
                    }}
                    className={`group flex flex-col items-center rounded-[4px] border p-3 transition ${
                      actief ? 'border-ink bg-accent/10 shadow-hard-sm' : 'border-ink/15 hover:border-ink/50'
                    }`}
                  >
                    <span
                      className="mb-2.5 h-14 w-full rounded-[3px] border border-ink/10 shadow-inner transition-transform group-hover:scale-[1.03]"
                      style={{ backgroundColor: k.hex }}
                    />
                    <span className="text-[13px] font-bold">RAL {k.code}</span>
                    <span className="text-[11px] text-muted">{k.naam}</span>
                  </button>
                )
              })}
            </div>

            {/* Eigen RAL-code */}
            <div className="mt-6 rounded-[4px] border border-ink/15 bg-paper p-5">
              <p className="text-sm font-semibold">Andere kleur in gedachten?</p>
              <p className="mt-1 text-xs text-ink/55">Vul je eigen RAL-code in · alle 200+ kleuren zijn mogelijk.</p>
              <input
                value={eigenRal}
                onChange={(e) => {
                  setEigenRal(e.target.value)
                  if (e.target.value.trim()) setKleur(null)
                }}
                placeholder="bv. RAL 7016"
                className="mt-3 w-48 rounded-[3px] border border-ink/25 bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Formaat kiezen */}
      <div>
        <div className="text-center">
          <p className="label-caps reg-mark inline-block pl-4 text-ink/50">Stap 2</p>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl">Kies je formaat</h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RAL_MATEN.map((m) => {
            const actief = maat?.label === m.label
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => setMaat(m)}
                className={`rounded-[4px] border px-4 py-5 text-center transition ${
                  actief ? 'border-ink bg-accent/10 shadow-hard-sm' : 'border-ink/15 hover:border-ink/50'
                }`}
              >
                <span className="block font-serif text-xl">{m.label}</span>
                <span className="mt-1 block text-[11px] uppercase tracking-wide text-muted">cm</span>
                <span className="mt-2 block font-semibold text-accent-dark">{formatEuro(m.prijsCents)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Samenvatting + CTA */}
      <div className="rounded-[4px] border border-ink/25 bg-paper p-6 sm:p-8">
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-5">
            <span
              className="h-16 w-16 shrink-0 rounded-[4px] border border-ink/15 shadow-inner"
              style={{ backgroundColor: gekozenKleur?.hex ?? '#EEEDE0' }}
            />
            <div>
              <p className="label-caps text-ink/45">Jouw RAL-frame</p>
              <p className="mt-1 font-serif text-2xl">
                {gekozenKleur ? `RAL ${gekozenKleur.code}` : 'Kies een kleur'}
                {gekozenKleur && <span className="ml-2 text-base text-ink/55">{gekozenKleur.naam}</span>}
              </p>
              <p className="mt-0.5 text-sm text-ink/60">
                {maat ? `${maat.label} cm · ${formatEuro(maat.prijsCents)}` : 'Kies een formaat'}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            {klaar ? (
              <Link href={contactHref} className="btn-primary w-full sm:w-auto">
                Stel samen via contact →
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center justify-center rounded-[3px] border border-ink/20 px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-ink/40">
                Kies kleur &amp; formaat
              </span>
            )}
          </div>
        </div>
        <p className="mt-4 border-t border-dashed border-ink/20 pt-4 text-xs text-ink/55">
          Je keuze wordt meegestuurd naar het contactformulier. Je ontvangt een betaallink; het frame
          wordt op bestelling gespoten (±6 weken). <strong>Bonus: 50% korting op een los kunstdoek</strong> ·
          de code volgt per mail.
        </p>
      </div>
    </div>
  )
}
