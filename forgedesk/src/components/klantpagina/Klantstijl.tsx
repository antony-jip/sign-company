import React, { useState } from 'react'
import { Mail, Phone } from 'lucide-react'
import { isLichteKleur, kopKleur } from '@/utils/offerteKlantpagina'

/** Bellen en mailen via de bedrijfsgegevens, op elke klantpagina hetzelfde. */
export function ContactKnoppen({ telefoon, email, onderwerp }: { telefoon?: string | null; email?: string | null; onderwerp?: string }) {
  if (!telefoon && !email) return null
  const knop = 'inline-flex h-10 items-center gap-2 rounded-lg bg-[#F8F7F5] px-4 text-sm font-medium text-[#1A535C] transition-colors hover:bg-[#F1F0EC]'
  return (
    <div className="flex flex-wrap gap-2">
      {telefoon && (
        <a href={`tel:${telefoon.replace(/[^\d+]/g, '')}`} className={knop}>
          <Phone className="h-4 w-4" />
          Bellen
        </a>
      )}
      {email && (
        <a href={`mailto:${email}${onderwerp ? `?subject=${encodeURIComponent(onderwerp)}` : ''}`} className={knop}>
          <Mail className="h-4 w-4" />
          Mailen
        </a>
      )}
    </div>
  )
}

/**
 * De bouwstenen van alles wat de klant van een doen.-gebruiker te zien krijgt:
 * de offertepagina en het projectportaal. Eén set, zodat een klant die van het
 * portaal naar de offerte klikt niet in een andere huisstijl belandt. Alles met
 * vaste kleuren: deze pagina's volgen bewust niet het thema van de app.
 */

export const knopPrimair =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#D24620] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#BD3F1C] disabled:opacity-40'

export const knopPetrol =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#1A535C] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#15464E] disabled:opacity-40'

export const tekstLink =
  'inline-flex items-center gap-1.5 text-sm font-medium text-[#1A535C] underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline'

export const invoerVeld =
  'w-full rounded-xl border border-[#EBEBEB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#9B9B95] focus:border-[#1A535C] focus:outline-none focus:ring-2 focus:ring-[#1A535C]/30'

/** Statuskleuren uit de doen.-canon; het woord eindigt altijd op de Flame-punt. */
export const STATUS_KLEUR = {
  open: '#3A5A9A',
  goed: '#3A7D52',
  aandacht: '#C0451A',
  wacht: '#8A7A4A',
  neutraal: '#6B6B66',
} as const

interface KlantKopProps {
  kleur?: string | null
  logoUrl?: string | null
  bedrijfsnaam?: string | null
  /** Breedte van de inhoud, gelijk aan die van de pagina eronder. */
  breedte?: string
  children?: React.ReactNode
}

/**
 * De kop met de kopkleur uit de portaalinstellingen, het white-label-vlak van
 * de gebruiker. Het logo staat op een witte plaat: logo's zijn meestal voor een
 * lichte ondergrond gemaakt en verdwenen op een donkere kopkleur.
 */
export function KlantKop({ kleur, logoUrl, bedrijfsnaam, breedte = 'max-w-5xl', children }: KlantKopProps) {
  const achtergrond = kopKleur(kleur)
  const licht = isLichteKleur(achtergrond)
  return (
    <header
      style={{ backgroundColor: achtergrond }}
      className={licht ? 'border-b border-[#EBEBEB]' : undefined}
    >
      <div className={`mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-8 ${breedte}`}>
        {logoUrl ? (
          <span className="inline-flex h-10 min-w-0 items-center rounded-lg bg-[#FFFFFF] px-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
            <img src={logoUrl} alt={bedrijfsnaam || 'Logo'} className="h-7 w-auto max-w-[150px] object-contain" />
          </span>
        ) : (
          <span className={`min-w-0 truncate text-lg font-extrabold tracking-[-0.3px] ${licht ? 'text-[#1A1A1A]' : 'text-white'}`}>
            {bedrijfsnaam}
          </span>
        )}
        {children && (
          <div className={`flex shrink-0 items-center gap-4 text-sm ${licht ? 'text-[#6B6B66]' : 'text-white/80'}`}>
            {children}
          </div>
        )}
      </div>
    </header>
  )
}

export function Paneel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl bg-[#FFFFFF] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] md:p-8 ${className}`}>
      {children}
    </section>
  )
}

export function Etiket({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-medium uppercase tracking-wider text-[#9B9B95] ${className}`}>{children}</p>
  )
}

export function StatusWoord({ kleur, groot = false, children }: { kleur: string; groot?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-baseline font-semibold ${groot ? 'text-base tracking-[-0.3px]' : 'text-xs'}`}
      style={{ color: kleur }}
    >
      {children}<span className="text-[#D24620]">.</span>
    </span>
  )
}

interface KaartProps {
  etiket: React.ReactNode
  status?: React.ReactNode
  acties?: React.ReactNode
  children: React.ReactNode
}

/** Eén item in het portaal: soort en status boven, inhoud, acties onder een lijn. */
export function Kaart({ etiket, status, acties, children }: KaartProps) {
  return (
    <article className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="px-5 py-5 md:px-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <Etiket>{etiket}</Etiket>
          {status}
        </div>
        {children}
      </div>
      {acties && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[#EBEBEB] px-5 py-4 md:px-6">
          {acties}
        </div>
      )}
    </article>
  )
}

export function Gezicht({ naam, fotoUrl, grootte }: { naam: string; fotoUrl?: string | null; grootte: number }) {
  const [fotoKapot, setFotoKapot] = useState(false)
  const delen = naam.trim().split(/\s+/).filter(Boolean)
  const initialen = `${delen[0]?.[0] ?? ''}${delen.length > 1 ? delen[delen.length - 1][0] : ''}`.toUpperCase()

  if (fotoUrl && !fotoKapot) {
    return (
      <img
        src={fotoUrl}
        alt={naam}
        onError={() => setFotoKapot(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: grootte, height: grootte }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1A535C] font-semibold text-white"
      style={{ width: grootte, height: grootte, fontSize: Math.round(grootte * 0.36) }}
    >
      {initialen}
    </span>
  )
}

/** Subtiele afzender onderaan, zonder link: de pagina is van het bedrijf, geen reclamevlak. */
export function MogelijkGemaaktDoor() {
  return (
    <p className="text-center text-[11px] text-[#9B9B95]">
      mogelijk gemaakt door{' '}
      <span className="font-extrabold" style={{ fontFamily: '"Instrument Sans", sans-serif' }}>
        doen<span className="text-[#D24620]">.</span>
      </span>
    </p>
  )
}
