import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getKlanten, getMedewerkers, getContactpersonenDB } from '@/services/supabaseService'
import { supabase, isSupabaseConfigured } from '@/services/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { cn, getInitials } from '@/lib/utils'
import { logger } from '@/utils/logger'
import { extractSenderEmail, extractSenderName } from '@/components/email/emailHelpers'
import { isGeldigEmail, parseOntvangers } from '@/components/email/composer/document'
import type { Ontvanger as MailOntvanger } from '@/lib/mail/types'
import type { Klant, ContactpersoonRecord, Medewerker } from '@/types'

export interface Ontvanger {
  email: string
  naam: string
  bijschrift: string
  soort: 'klant' | 'contactpersoon' | 'medewerker' | 'recent'
  /** Bedrijf achter het adres, voor de ondertitel van een chip. */
  bedrijf?: string
}

const MAX_SUGGESTIES = 8
const RECENT_DAGEN = 90
const RECENT_MAX_RIJEN = 400

// ─── Recente afzenders ───────────────────────────────────────────
// Eén query per sessie: van/aan van de eigen mail uit de laatste 90 dagen.
// RLS op emails_list_view beperkt dit al tot de ingelogde gebruiker.

interface RecentAdres {
  email: string
  naam: string
  aantal: number
}

let recentCache: Promise<RecentAdres[]> | null = null

function laadRecenteAdressen(): Promise<RecentAdres[]> {
  if (recentCache) return recentCache
  recentCache = (async () => {
    if (!isSupabaseConfigured() || !supabase) return []
    const sinds = new Date(Date.now() - RECENT_DAGEN * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('emails_list_view')
      .select('van, aan, datum')
      .gte('datum', sinds)
      .in('map', ['inbox', 'verzonden', 'archief', 'opvolgen', 'beantwoord'])
      .order('datum', { ascending: false })
      .limit(RECENT_MAX_RIJEN)
    if (error) throw error
    const per = new Map<string, RecentAdres>()
    const tel = (email: string, naam: string) => {
      const sleutel = email.trim().toLowerCase()
      if (!sleutel || !isGeldigEmail(sleutel)) return
      const bestaand = per.get(sleutel)
      if (bestaand) {
        bestaand.aantal += 1
        if (!bestaand.naam && naam) bestaand.naam = naam
      } else {
        per.set(sleutel, { email: email.trim(), naam, aantal: 1 })
      }
    }
    for (const rij of (data || []) as { van: string; aan: string }[]) {
      if (rij.van) {
        const naam = extractSenderName(rij.van)
        const email = extractSenderEmail(rij.van)
        tel(email, naam !== email ? naam : '')
      }
      if (rij.aan) {
        for (const o of parseOntvangers(rij.aan)) tel(o.email, o.naam || '')
      }
    }
    return Array.from(per.values()).sort((a, b) => b.aantal - a.aantal)
  })().catch((err) => {
    logger.warn('Recente adressen laden mislukt:', err)
    recentCache = null
    return []
  })
  return recentCache
}

/** Alleen voor tests en na het versturen van een nieuwe mail. */
export function wisRecenteAdressenCache(): void {
  recentCache = null
}

// ─── Ranking ─────────────────────────────────────────────────────

const BRON_RANG: Record<Ontvanger['soort'], number> = { recent: 0, klant: 1, contactpersoon: 2, medewerker: 3 }

function isPrefixMatch(o: Ontvanger, q: string): boolean {
  const email = o.email.toLowerCase()
  const domein = email.split('@')[1] || ''
  if (email.startsWith(q) || domein.startsWith(q)) return true
  const woorden = `${o.naam} ${o.bedrijf || ''}`.toLowerCase().split(/[\s\-_.,]+/).filter(Boolean)
  return woorden.some((w) => w.startsWith(q))
}

function bevat(o: Ontvanger, q: string): boolean {
  return o.email.toLowerCase().includes(q) ||
    o.naam.toLowerCase().includes(q) ||
    (o.bedrijf || '').toLowerCase().includes(q)
}

/**
 * Alle adressen die de app kent: recente afzenders uit de eigen mail,
 * klanten, hun contactpersonen (JSONB én tabel) en collega's. Elke composer
 * zoekt hiermee in dezelfde bak.
 *
 * Volgorde: prefix op naam, e-mail of domein bovenaan; daarbinnen recent >
 * klant > contactpersoon > collega. Daarna de losse "bevat"-treffers in
 * dezelfde bronvolgorde.
 */
export function useOntvangerZoeker() {
  const { organisatieId, user } = useAuth()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [dbContacten, setDbContacten] = useState<ContactpersoonRecord[]>([])
  const [collegas, setCollegas] = useState<Medewerker[]>([])
  const [recent, setRecent] = useState<RecentAdres[]>([])
  const geladenRef = useRef(false)
  const eigenAdres = (user?.email || '').toLowerCase()

  const laad = useCallback(() => {
    if (geladenRef.current) return
    geladenRef.current = true
    getKlanten().then(setKlanten).catch((err) => logger.warn('Klanten laden mislukt:', err))
    getMedewerkers().then(setCollegas).catch((err) => logger.warn('Medewerkers laden mislukt:', err))
    laadRecenteAdressen().then(setRecent)
    if (organisatieId) {
      getContactpersonenDB(organisatieId).then(setDbContacten).catch((err) => logger.warn('Contactpersonen laden mislukt:', err))
    }
  }, [organisatieId])

  const bak = useMemo((): Ontvanger[] => {
    const uit: Ontvanger[] = []
    for (const r of recent) {
      if (r.email.toLowerCase() === eigenAdres) continue
      uit.push({ email: r.email, naam: r.naam || r.email, bijschrift: 'recent', soort: 'recent' })
    }
    for (const k of klanten) {
      const klantNaam = k.bedrijfsnaam || k.contactpersoon || ''
      if (k.email) {
        uit.push({ email: k.email, naam: k.contactpersoon || klantNaam, bijschrift: '', soort: 'klant', bedrijf: k.bedrijfsnaam || undefined })
      }
      for (const cp of k.contactpersonen || []) {
        if (!cp.email) continue
        uit.push({ email: cp.email, naam: cp.naam || cp.email, bijschrift: klantNaam ? `bij ${klantNaam}` : '', soort: 'contactpersoon', bedrijf: k.bedrijfsnaam || undefined })
      }
    }
    for (const c of dbContacten) {
      if (!c.email) continue
      const naam = [c.voornaam, c.achternaam].filter(Boolean).join(' ').trim() || c.email
      const klant = c.klant_id ? klanten.find((k) => k.id === c.klant_id) : undefined
      const klantNaam = klant?.bedrijfsnaam || c.klant?.bedrijfsnaam || ''
      uit.push({ email: c.email, naam, bijschrift: klantNaam ? `bij ${klantNaam}` : '', soort: 'contactpersoon', bedrijf: klantNaam || undefined })
    }
    for (const mw of collegas) {
      if (!mw.email || mw.status !== 'actief') continue
      uit.push({ email: mw.email, naam: mw.naam || mw.email, bijschrift: 'collega', soort: 'medewerker' })
    }
    return uit
  }, [recent, klanten, dbContacten, collegas, eigenAdres])

  const zoek = useCallback((query: string): Ontvanger[] => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const treffers: { o: Ontvanger; rang: number }[] = []
    for (const o of bak) {
      if (isPrefixMatch(o, q)) treffers.push({ o, rang: BRON_RANG[o.soort] })
      else if (bevat(o, q)) treffers.push({ o, rang: 10 + BRON_RANG[o.soort] })
    }
    treffers.sort((a, b) => a.rang - b.rang)

    // Zelfde adres uit meerdere bronnen: de best gerangschikte wint, maar
    // naam en bedrijf van een klant- of contactrecord zijn rijker dan wat
    // een mailkop meegeeft.
    const perEmail = new Map<string, Ontvanger>()
    for (const { o } of treffers) {
      const sleutel = o.email.toLowerCase()
      const bestaand = perEmail.get(sleutel)
      if (!bestaand) {
        perEmail.set(sleutel, { ...o })
        continue
      }
      if (bestaand.soort === 'recent' && o.soort !== 'recent') {
        bestaand.naam = o.naam
        bestaand.bedrijf = o.bedrijf
        bestaand.bijschrift = o.bijschrift || bestaand.bijschrift
      }
    }
    return Array.from(perEmail.values()).slice(0, MAX_SUGGESTIES)
  }, [bak])

  return { zoek, laad }
}

// ─── Lijst ───────────────────────────────────────────────────────

/** Het stuk dat matcht vet, de rest gewoon. */
function Gemarkeerd({ tekst, query }: { tekst: string; query?: string }) {
  const q = (query || '').trim().toLowerCase()
  if (!q || !tekst) return <>{tekst}</>
  const idx = tekst.toLowerCase().indexOf(q)
  if (idx === -1) return <>{tekst}</>
  return (
    <>
      {tekst.slice(0, idx)}
      <strong className="font-semibold text-foreground">{tekst.slice(idx, idx + q.length)}</strong>
      {tekst.slice(idx + q.length)}
    </>
  )
}

interface OntvangerLijstProps {
  suggesties: Ontvanger[]
  actief: number
  onKies: (ontvanger: Ontvanger) => void
  className?: string
  /** Zoekterm om de match in de lijst te markeren. */
  query?: string
}

export function OntvangerLijst({ suggesties, actief, onKies, className, query }: OntvangerLijstProps) {
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
            s.soort === 'klant' ? 'rounded-lg bg-petrol/[0.08]' : s.soort === 'medewerker' ? 'rounded-full bg-petrol/[0.12]' : s.soort === 'recent' ? 'rounded-full bg-muted' : 'rounded-full bg-flame/[0.08]'
          )}>
            <span className={cn('text-[10px] font-semibold', s.soort === 'contactpersoon' ? 'text-flame' : s.soort === 'recent' ? 'text-muted-foreground' : 'text-petrol')}>
              {getInitials(s.naam)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground/90">
              <Gemarkeerd tekst={s.naam} query={query} />
              {s.bijschrift && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{s.bijschrift}</span>}
            </div>
            <div className="truncate text-[11px] text-muted-foreground"><Gemarkeerd tekst={s.email} query={query} /></div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Chips ───────────────────────────────────────────────────────

function naarMailOntvanger(o: Ontvanger): MailOntvanger {
  return {
    email: o.email,
    naam: o.naam && o.naam !== o.email ? o.naam : undefined,
    bedrijf: o.bedrijf,
    bron: o.soort === 'medewerker' ? 'collega' : o.soort,
  }
}

interface OntvangerChipsProps {
  value: MailOntvanger[]
  onChange: (volgende: MailOntvanger[]) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  lijstClassName?: string
  inputRef?: React.RefObject<HTMLInputElement>
  autoFocus?: boolean
  onBlur?: () => void
  /** Rechts in het veld, bijvoorbeeld de Cc/Bcc-schakelaars. */
  rechts?: React.ReactNode
}

/**
 * Adresveld met chips: naam met bedrijf als ondertitel, Backspace haalt de
 * laatste weg, Enter, komma, Tab en blur maken een chip van vrije invoer.
 * Een ongeldig adres blijft staan als rode chip zodat je het ziet.
 */
export function OntvangerChips({
  value, onChange, placeholder, className, inputClassName, lijstClassName, inputRef, autoFocus, onBlur, rechts,
}: OntvangerChipsProps) {
  const { zoek, laad } = useOntvangerZoeker()
  const [concept, setConcept] = useState('')
  const [suggesties, setSuggesties] = useState<Ontvanger[]>([])
  const [open, setOpen] = useState(false)
  const [actief, setActief] = useState(0)
  const eigenInputRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? eigenInputRef

  useEffect(() => {
    if (!open) { setSuggesties([]); return }
    setSuggesties(zoek(concept))
    setActief(0)
  }, [concept, open, zoek])

  const voegToe = useCallback((nieuw: MailOntvanger[]) => {
    const bestaand = new Set(value.map((v) => v.email.toLowerCase()))
    const uniek = nieuw.filter((n) => n.email && !bestaand.has(n.email.toLowerCase()))
    if (uniek.length) onChange([...value, ...uniek])
  }, [value, onChange])

  const commit = useCallback((tekst: string) => {
    const schoon = tekst.trim().replace(/[,;]\s*$/, '')
    setConcept('')
    setSuggesties([])
    if (!schoon) return
    voegToe(parseOntvangers(schoon))
  }, [voegToe])

  const kies = (o: Ontvanger) => {
    setConcept('')
    setSuggesties([])
    setOpen(false)
    voegToe([naarMailOntvanger(o)])
  }

  return (
    <div
      className={cn('relative flex-1 flex flex-wrap items-center gap-1.5 min-w-0', className)}
      onClick={() => ref.current?.focus()}
    >
      {value.map((o, i) => {
        const geldig = isGeldigEmail(o.email)
        const naam = (o.naam || '').trim()
        return (
          <span
            key={`${o.email}-${i}`}
            title={o.email}
            className={cn(
              'group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border text-[12px] leading-5 max-w-full',
              geldig
                ? 'border-petrol/15 bg-petrol/[0.06] text-petrol'
                : 'border-[#C0451A]/30 bg-[#FDE8E4] text-[#C0451A]',
            )}
          >
            <span className="flex flex-col min-w-0 leading-tight py-0.5">
              <span className="truncate font-medium">{naam || o.email}</span>
              {(naam || o.bedrijf) && (
                <span className={cn('truncate text-[10px]', geldig ? 'text-petrol/60' : 'text-[#C0451A]/70')}>
                  {o.bedrijf || o.email}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(value.filter((_, idx) => idx !== i)) }}
              className={cn('h-4 w-4 rounded-full flex items-center justify-center transition-colors flex-shrink-0', geldig ? 'text-petrol/50 hover:text-[#C03A18]' : 'text-[#C0451A]/60 hover:text-[#C0451A]')}
              aria-label={`${o.email} verwijderen`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )
      })}
      <input
        ref={ref}
        type="text"
        autoComplete="off"
        autoFocus={autoFocus}
        value={concept}
        placeholder={value.length === 0 ? placeholder : ''}
        className={cn('flex-1 min-w-[120px] bg-transparent border-0 outline-none text-[14px] text-foreground placeholder:text-muted-foreground', inputClassName)}
        onFocus={() => { laad(); setOpen(true) }}
        onChange={(e) => {
          const val = e.target.value
          if (/[,;]$/.test(val)) { commit(val); return }
          setOpen(true)
          setConcept(val)
        }}
        onPaste={(e) => {
          const tekst = e.clipboardData.getData('text/plain')
          if (!tekst || !/[,;<\n]/.test(tekst)) return
          e.preventDefault()
          commit(`${concept}${tekst}`)
        }}
        onKeyDown={(e) => {
          if (open && suggesties.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            setActief((i) => (e.key === 'ArrowDown' ? i + 1 : i - 1 + suggesties.length) % suggesties.length)
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (open && suggesties.length > 0) {
              e.preventDefault()
              kies(suggesties[actief])
            } else if (concept.trim()) {
              e.preventDefault()
              commit(concept)
            }
          } else if (e.key === 'Escape') {
            if (open && (suggesties.length > 0 || concept)) {
              e.stopPropagation()
              setOpen(false)
              setSuggesties([])
            }
          } else if (e.key === 'Backspace' && !concept && value.length > 0) {
            e.preventDefault()
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => {
          setOpen(false)
          commit(concept)
          onBlur?.()
        }}
      />
      {rechts}
      {open && <OntvangerLijst suggesties={suggesties} actief={actief} onKies={kies} className={lijstClassName} query={concept} />}
    </div>
  )
}

// ─── Tekstveld (bestaande aanroepers) ────────────────────────────

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
  /** Chips in plaats van een komma-gescheiden tekstveld; `value` blijft de adresregel. */
  chips?: boolean
}

/** Laatste adres in een `a@x.nl, b@y.nl`-reeks vervangen, de rest laten staan. */
function vervangLaatste(waarde: string, email: string): string {
  const knip = waarde.lastIndexOf(',')
  if (knip === -1) return email
  return `${waarde.slice(0, knip + 1)} ${email}`.replace(/,\s+/g, ', ')
}

function ontvangersNaarRegel(lijst: MailOntvanger[]): string {
  return lijst.map((o) => (o.naam ? `${/[,;<>"]/.test(o.naam) ? `"${o.naam.replace(/"/g, '')}"` : o.naam} <${o.email}>` : o.email)).join(', ')
}

/**
 * Adresveld met contact-suggesties. Bewust vrij van composer-specifieke
 * opmaak: elke composer geeft zijn eigen input-classes mee.
 */
export function OntvangerInput({
  value, onChange, placeholder, className, inputClassName, lijstClassName, type = 'email', onBlur, inputRef, chips = false,
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

  const chipWaarde = useMemo(() => (chips ? parseOntvangers(value) : []), [chips, value])

  if (chips) {
    return (
      <OntvangerChips
        value={chipWaarde}
        onChange={(lijst) => onChange(ontvangersNaarRegel(lijst))}
        placeholder={placeholder}
        className={className}
        inputClassName={inputClassName}
        lijstClassName={lijstClassName}
        inputRef={inputRef}
        onBlur={onBlur}
      />
    )
  }

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
      {open && <OntvangerLijst suggesties={suggesties} actief={actief} onKies={kies} className={lijstClassName} query={huidigeTerm} />}
    </div>
  )
}
