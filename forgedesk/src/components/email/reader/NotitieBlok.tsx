import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { NoemTextarea, stuurNoemMeldingen } from '@/components/shared/NoemTextarea'
import { logger } from '@/utils/logger'
import { getNotities, notitiesBeschikbaar, voegNotitieToe, verwijderNotitie, type EmailNotitie } from '@/services/teamInboxService'
import { useToewijzing } from '@/components/email/shell/toewijzing'
import { ToewijsAvatar } from '@/components/email/shell/ToewijsMenu'

interface Props {
  emailId: string
  threadId?: string | null
  compact?: boolean
}

function tijdLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Interne notities onder een gesprek in een gedeeld postvak. Ze gaan nooit
 * naar de klant: het is een blok voor de organisatie, met @-noemen zodat een
 * collega een melding krijgt.
 */
export function NotitieBlok({ emailId, threadId, compact }: Props) {
  const { user } = useAuth()
  const { zoek } = useToewijzing()
  const [notities, zetNotities] = useState<EmailNotitie[]>([])
  const [tekst, zetTekst] = useState('')
  const [bezig, zetBezig] = useState(false)
  const [beschikbaar, zetBeschikbaar] = useState(notitiesBeschikbaar())
  const genoemd = useRef<string[]>([])

  useEffect(() => {
    let actueel = true
    zetNotities([])
    getNotities(emailId, threadId)
      .then((lijst) => { if (actueel) { zetNotities(lijst); zetBeschikbaar(notitiesBeschikbaar()) } })
      .catch(() => { if (actueel) zetBeschikbaar(notitiesBeschikbaar()) })
    return () => { actueel = false }
  }, [emailId, threadId])

  const bewaar = useCallback(async () => {
    const schoon = tekst.trim()
    if (!schoon || bezig) return
    zetBezig(true)
    try {
      const nieuw = await voegNotitieToe(emailId, threadId, schoon)
      if (nieuw) {
        zetNotities((oud) => [...oud, nieuw])
        zetTekst('')
        if (genoemd.current.length) {
          void stuurNoemMeldingen({
            userIds: genoemd.current,
            tekst: schoon,
            link: `/email?mail=${emailId}`,
            bron: 'mailnotitie',
          })
          genoemd.current = []
        }
      }
    } catch (e) {
      logger.error('Notitie opslaan mislukt:', e)
      toast.error(e instanceof Error ? e.message : 'Notitie opslaan mislukt')
      zetBeschikbaar(notitiesBeschikbaar())
    } finally {
      zetBezig(false)
    }
  }, [tekst, bezig, emailId, threadId])

  const wis = useCallback(async (id: string) => {
    const vorige = notities
    zetNotities((oud) => oud.filter((n) => n.id !== id))
    try {
      await verwijderNotitie(id)
    } catch {
      zetNotities(vorige)
      toast.error('Notitie verwijderen mislukt')
    }
  }, [notities])

  const rijen = useMemo(() => notities.map((n) => ({ notitie: n, schrijver: zoek(n.userId) })), [notities, zoek])

  if (!beschikbaar) return null

  return (
    <section className={cn('rounded-xl border border-dashed border-petrol/25 bg-petrol/[0.03]', compact ? 'p-3' : 'p-4')}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-petrol/70">
        Interne notitie
        <span className="ml-2 font-sans normal-case tracking-normal text-muted-foreground">alleen voor je collega's, gaat nooit naar de klant</span>
      </p>

      {rijen.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {rijen.map(({ notitie, schrijver }) => (
            <li key={notitie.id} className="group flex items-start gap-2.5">
              {schrijver && <ToewijsAvatar doel={schrijver} formaat={20} titel={schrijver.naam} />}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">
                  {schrijver?.naam || 'Collega'} · <span className="font-mono tabular-nums">{tijdLabel(notitie.createdAt)}</span>
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-[1.5] text-foreground/85 [overflow-wrap:anywhere]">{notitie.tekst}</p>
              </div>
              {notitie.userId === user?.id && (
                <button
                  type="button"
                  onClick={() => void wis(notitie.id)}
                  title="Notitie verwijderen"
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-[#C0451A] group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <NoemTextarea
          value={tekst}
          onChange={(e) => zetTekst(e.target.value)}
          onNoem={(ids) => { genoemd.current = ids }}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void bewaar() } }}
          rows={2}
          placeholder="Notitie voor je collega's. Noem iemand met @"
          className="resize-none text-[13px]"
        />
        <div className="mt-2 flex items-center justify-end gap-3">
          <span className="text-[11px] text-muted-foreground">Cmd + Enter</span>
          <button
            type="button"
            onClick={() => void bewaar()}
            disabled={!tekst.trim() || bezig}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-petrol px-3 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {bezig && <Loader2 className="h-3 w-3 animate-spin" />}
            Notitie plaatsen
          </button>
        </div>
      </div>
    </section>
  )
}
