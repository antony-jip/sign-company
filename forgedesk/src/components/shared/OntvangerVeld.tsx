import { useCallback, useEffect, useRef, useState } from 'react'
import { getKlanten, getMedewerkers, getContactpersonenDB } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { cn, getInitials } from '@/lib/utils'
import { logger } from '@/utils/logger'
import type { Klant, ContactpersoonRecord, Medewerker } from '@/types'

export interface Ontvanger {
  email: string
  naam: string
  bijschrift: string
  soort: 'klant' | 'contactpersoon' | 'medewerker'
}

const MAX_SUGGESTIES = 8

/**
 * Alle adressen die de app kent: klanten, hun contactpersonen uit het
 * JSONB-veld én uit de contactpersonen-tabel, en collega's. Elke composer
 * zoekt hiermee in dezelfde bak, zodat een adres dat in de mailmodule
 * opduikt ook bij een offerte of project te vinden is.
 */
export function useOntvangerZoeker() {
  const { organisatieId } = useAuth()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [dbContacten, setDbContacten] = useState<ContactpersoonRecord[]>([])
  const [collegas, setCollegas] = useState<Medewerker[]>([])
  const geladenRef = useRef(false)

  const laad = useCallback(() => {
    if (geladenRef.current) return
    geladenRef.current = true
    getKlanten().then(setKlanten).catch((err) => logger.warn('Klanten laden mislukt:', err))
    getMedewerkers().then(setCollegas).catch((err) => logger.warn('Medewerkers laden mislukt:', err))
    if (organisatieId) {
      getContactpersonenDB(organisatieId).then(setDbContacten).catch((err) => logger.warn('Contactpersonen laden mislukt:', err))
    }
  }, [organisatieId])

  const zoek = useCallback((query: string): Ontvanger[] => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const treffers: Ontvanger[] = []
    const gezien = new Set<string>()

    const voegToe = (ontvanger: Ontvanger) => {
      const sleutel = ontvanger.email.toLowerCase()
      if (!ontvanger.email || gezien.has(sleutel)) return
      gezien.add(sleutel)
      treffers.push(ontvanger)
    }

    // Collega's eerst: interne adressen ken je niet uit je hoofd zoals
    // klantadressen uit lopende correspondentie.
    for (const mw of collegas) {
      if (!mw.email || mw.status !== 'actief') continue
      if (mw.naam?.toLowerCase().includes(q) || mw.email.toLowerCase().includes(q)) {
        voegToe({ email: mw.email, naam: mw.naam || mw.email, bijschrift: 'collega', soort: 'medewerker' })
      }
    }

    for (const k of klanten) {
      const klantNaam = k.bedrijfsnaam || k.contactpersoon || ''
      const klantRaak =
        k.bedrijfsnaam?.toLowerCase().includes(q) ||
        k.contactpersoon?.toLowerCase().includes(q) ||
        k.email?.toLowerCase().includes(q)
      if (klantRaak && k.email) {
        voegToe({ email: k.email, naam: klantNaam, bijschrift: '', soort: 'klant' })
      }
      for (const cp of k.contactpersonen || []) {
        if (!cp.email) continue
        const raak =
          cp.naam?.toLowerCase().includes(q) ||
          cp.email.toLowerCase().includes(q) ||
          k.bedrijfsnaam?.toLowerCase().includes(q)
        if (raak) {
          voegToe({ email: cp.email, naam: cp.naam || cp.email, bijschrift: klantNaam ? `bij ${klantNaam}` : '', soort: 'contactpersoon' })
        }
      }
      if (treffers.length >= 12) break
    }

    for (const c of dbContacten) {
      if (treffers.length >= 12) break
      if (!c.email) continue
      const naam = [c.voornaam, c.achternaam].filter(Boolean).join(' ').trim() || c.email
      const klant = c.klant_id ? klanten.find((k) => k.id === c.klant_id) : undefined
      const klantNaam = klant?.bedrijfsnaam || c.klant?.bedrijfsnaam || ''
      const raak =
        naam.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        klantNaam.toLowerCase().includes(q)
      if (raak) {
        voegToe({ email: c.email, naam, bijschrift: klantNaam ? `bij ${klantNaam}` : '', soort: 'contactpersoon' })
      }
    }

    return treffers.slice(0, MAX_SUGGESTIES)
  }, [klanten, dbContacten, collegas])

  return { zoek, laad }
}

interface OntvangerLijstProps {
  suggesties: Ontvanger[]
  actief: number
  onKies: (ontvanger: Ontvanger) => void
  className?: string
}

export function OntvangerLijst({ suggesties, actief, onKies, className }: OntvangerLijstProps) {
  if (suggesties.length === 0) return null
  return (
    <div
      className={cn(
        'absolute left-0 top-full z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white py-1 shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:border dark:border-white/10 dark:bg-popover',
        className
      )}
    >
      {suggesties.map((s, idx) => (
        <button
          key={`${s.soort}-${s.email}`}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onKies(s) }}
          className={cn(
            'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors',
            idx === actief ? 'bg-background' : 'hover:bg-background'
          )}
        >
          <div className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center',
            s.soort === 'klant' ? 'rounded-lg bg-petrol/[0.08]' : s.soort === 'medewerker' ? 'rounded-full bg-petrol/[0.12]' : 'rounded-full bg-flame/[0.08]'
          )}>
            <span className={cn('text-[10px] font-semibold', s.soort === 'contactpersoon' ? 'text-flame' : 'text-petrol')}>
              {getInitials(s.naam)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground">
              {s.naam}
              {s.bijschrift && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{s.bijschrift}</span>}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">{s.email}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

interface OntvangerInputProps {
  value: string
  onChange: (waarde: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  lijstClassName?: string
  type?: string
  onBlur?: () => void
  inputRef?: React.RefObject<HTMLInputElement>
}

/** Laatste adres in een `a@x.nl, b@y.nl`-reeks vervangen, de rest laten staan. */
function vervangLaatste(waarde: string, email: string): string {
  const knip = waarde.lastIndexOf(',')
  if (knip === -1) return email
  return `${waarde.slice(0, knip + 1)} ${email}`.replace(/,\s+/g, ', ')
}

/**
 * Adresveld met contact-suggesties. Bewust vrij van composer-specifieke
 * opmaak: elke composer geeft zijn eigen input-classes mee.
 */
export function OntvangerInput({
  value, onChange, placeholder, className, inputClassName, lijstClassName, type = 'email', onBlur, inputRef,
}: OntvangerInputProps) {
  const { zoek, laad } = useOntvangerZoeker()
  const [suggesties, setSuggesties] = useState<Ontvanger[]>([])
  const [open, setOpen] = useState(false)
  const [actief, setActief] = useState(0)

  const huidigeTerm = value.split(',').pop()?.trim() || ''

  useEffect(() => {
    if (!open) return
    setSuggesties(zoek(huidigeTerm))
    setActief(0)
  }, [huidigeTerm, open, zoek])

  const kies = (ontvanger: Ontvanger) => {
    onChange(vervangLaatste(value, ontvanger.email))
    setOpen(false)
    setSuggesties([])
  }

  return (
    <div className={cn('relative flex-1 min-w-0', className)}>
      <input
        ref={inputRef}
        type={type}
        value={value}
        placeholder={placeholder}
        className={inputClassName}
        onFocus={() => { laad(); setOpen(true) }}
        onChange={(e) => { setOpen(true); onChange(e.target.value) }}
        onKeyDown={(e) => {
          if (!open || suggesties.length === 0) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActief((i) => (i + 1) % suggesties.length) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActief((i) => (i - 1 + suggesties.length) % suggesties.length) }
          else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); kies(suggesties[actief]) }
          else if (e.key === 'Escape') { setOpen(false) }
        }}
        onBlur={() => {
          setOpen(false)
          onBlur?.()
        }}
      />
      {open && <OntvangerLijst suggesties={suggesties} actief={actief} onKies={kies} className={lijstClassName} />}
    </div>
  )
}
