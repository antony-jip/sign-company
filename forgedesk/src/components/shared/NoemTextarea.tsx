import { useState, useRef, useCallback, useMemo, useEffect, forwardRef } from 'react'
import { Textarea, type TextareaProps } from '@/components/ui/textarea'
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { useFunctie } from '@/hooks/useFunctie'
import supabase from '@/services/supabaseClient'
import { logger } from '@/utils/logger'
import { cn } from '@/lib/utils'
import type { Medewerker } from '@/types'

/**
 * Textarea die bij "@" een lijstje collega's toont en de gekozen namen als
 * "@Voornaam Achternaam" invoegt. onNoem krijgt telkens alle user_id's die in
 * dit veld gekozen zijn sinds het laatste reset; de ouder stuurt ze bij
 * opslaan door via stuurNoemMeldingen. Met de schakelaar 'noemen' uit is het
 * een gewone Textarea.
 */
export interface NoemTextareaProps extends TextareaProps {
  onNoem?: (userIds: string[]) => void
}

interface NoemStand {
  start: number
  zoek: string
}

const MAX_ZOEK = 30

function zoekNoemStand(tekst: string, cursor: number): NoemStand | null {
  const voor = tekst.slice(0, cursor)
  const at = voor.lastIndexOf('@')
  if (at === -1) return null
  if (at > 0 && !/[\s(]/.test(voor[at - 1])) return null
  const zoek = voor.slice(at + 1)
  if (zoek.length > MAX_ZOEK || /[\n@]/.test(zoek)) return null
  return { start: at, zoek }
}

function schrijfWaarde(textarea: HTMLTextAreaElement, waarde: string, cursor: number) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(textarea, waarde)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  requestAnimationFrame(() => {
    textarea.setSelectionRange(cursor, cursor)
    textarea.focus()
  })
}

export const NoemTextarea = forwardRef<HTMLTextAreaElement, NoemTextareaProps>(function NoemTextarea(
  { onNoem, onChange, onKeyDown, onBlur, ...props },
  ref,
) {
  const aan = useFunctie('noemen')
  const { medewerkers } = useMedewerkers()
  const eigenRef = useRef<HTMLTextAreaElement | null>(null)
  const zetRef = useCallback((node: HTMLTextAreaElement | null) => {
    eigenRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  const [stand, setStand] = useState<NoemStand | null>(null)
  const [actief, setActief] = useState(0)
  const gekozenRef = useRef<Set<string>>(new Set())

  const kandidaten = useMemo(() => {
    if (!stand) return []
    const zoek = stand.zoek.trim().toLowerCase()
    return medewerkers
      .filter((m) => m.status !== 'inactief')
      .filter((m) => !zoek || m.naam.toLowerCase().includes(zoek))
      .slice(0, 8)
  }, [medewerkers, stand])

  useEffect(() => { setActief(0) }, [stand?.zoek])

  const sluit = useCallback(() => setStand(null), [])

  const bepaalStand = useCallback((el: HTMLTextAreaElement) => {
    setStand(zoekNoemStand(el.value, el.selectionStart ?? el.value.length))
  }, [])

  const kies = useCallback((m: Medewerker) => {
    const el = eigenRef.current
    if (!el || !stand) return
    const cursor = el.selectionStart ?? el.value.length
    const invoeging = `@${m.naam} `
    const nieuw = el.value.slice(0, stand.start) + invoeging + el.value.slice(cursor)
    schrijfWaarde(el, nieuw, stand.start + invoeging.length)
    setStand(null)
    if (m.user_id) {
      gekozenRef.current.add(m.user_id)
      onNoem?.(Array.from(gekozenRef.current))
    }
  }, [stand, onNoem])

  if (!aan) {
    return <Textarea ref={ref} onChange={onChange} onKeyDown={onKeyDown} onBlur={onBlur} {...props} />
  }

  const open = stand !== null && kandidaten.length > 0

  return (
    <div className="relative">
      <Textarea
        ref={zetRef}
        onChange={(e) => {
          onChange?.(e)
          bepaalStand(e.currentTarget)
        }}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActief((i) => (i + 1) % kandidaten.length); return }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActief((i) => (i - 1 + kandidaten.length) % kandidaten.length); return }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); kies(kandidaten[actief]); return }
            if (e.key === 'Escape') { e.preventDefault(); sluit(); return }
          }
          onKeyDown?.(e)
        }}
        onKeyUp={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') bepaalStand(e.currentTarget)
        }}
        onClick={(e) => bepaalStand(e.currentTarget)}
        onBlur={(e) => {
          // Een tik op een kandidaat blurt eerst; onMouseDown hieronder houdt de focus.
          sluit()
          onBlur?.(e)
        }}
        aria-autocomplete="list"
        aria-expanded={open}
        {...props}
      />
      {open && (
        <ul
          role="listbox"
          aria-label="Collega noemen"
          className="absolute left-3 top-full z-30 mt-1 w-64 max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          {kandidaten.map((m, i) => (
            <li
              key={m.id}
              role="option"
              aria-selected={i === actief}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => kies(m)}
              onMouseEnter={() => setActief(i)}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center gap-2 px-3 text-[13px] text-foreground',
                i === actief ? 'bg-petrol/10 dark:bg-white/[0.08]' : '',
              )}
            >
              <span className="truncate">{m.naam}</span>
              {!m.user_id && <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">geen login</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

/**
 * Meldt de genoemde collega's via api/noem-collega (service_role, want
 * notificaties zijn user-only). Best effort: een mislukte melding mag het
 * opslaan van de notitie niet breken.
 */
export async function stuurNoemMeldingen(input: { userIds: string[]; tekst: string; link: string; bron: string }): Promise<void> {
  if (input.userIds.length === 0 || !supabase) return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    const respons = await fetch('/api/noem-collega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ userIds: input.userIds, tekst: input.tekst.slice(0, 300), link: input.link, bron: input.bron }),
    })
    if (!respons.ok) logger.warn('[noemen] melding versturen mislukt:', respons.status)
  } catch (err) {
    logger.warn('[noemen] melding versturen mislukt:', err)
  }
}
