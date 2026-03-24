import { useState, useEffect, useMemo } from 'react'
import { getOpvolgLog, getDefaultOpvolgSchema, updateOfferte } from '@/services/supabaseService'
import type { OpvolgSchema, OpvolgStap, OpvolgLogEntry } from '@/types'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

interface Props {
  offerteId: string
  verstuurdOp?: string
  schemaId?: string
  opvolgingActief?: boolean
  organisatieId: string
}

function formatDatum(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function getPlannedDate(verstuurdOp: string, dagenNaVersturen: number): Date {
  const d = new Date(verstuurdOp)
  d.setDate(d.getDate() + dagenNaVersturen)
  return d
}

export function OfferteOpvolgTimeline({ offerteId, verstuurdOp, schemaId: _schemaId, opvolgingActief, organisatieId }: Props) {
  const [logEntries, setLogEntries] = useState<OpvolgLogEntry[]>([])
  const [schema, setSchema] = useState<OpvolgSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [actief, setActief] = useState(opvolgingActief ?? true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [log, defaultSchema] = await Promise.all([
          getOpvolgLog(offerteId),
          getDefaultOpvolgSchema(organisatieId),
        ])
        if (!cancelled) {
          setLogEntries(log)
          setSchema(defaultSchema)
        }
      } catch (err) {
        logger.error('Fout bij laden opvolg timeline:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [offerteId, organisatieId])

  const stappen = schema?.stappen || []
  const logByStapId = useMemo(() => {
    const map = new Map<string, OpvolgLogEntry>()
    for (const entry of logEntries) {
      map.set(entry.stap_id, entry)
    }
    return map
  }, [logEntries])

  const handleToggle = async (checked: boolean) => {
    setToggling(true)
    try {
      await updateOfferte(offerteId, { opvolging_actief: checked })
      setActief(checked)
      toast.success(checked ? 'Opvolging hervat' : 'Opvolging gepauzeerd')
    } catch {
      toast.error('Kon opvolging niet wijzigen')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
      </div>
    )
  }

  if (stappen.length === 0) return null

  const verzendwijzeLabels: Record<string, string> = {
    via_portaal: 'Portaal',
    via_email_pdf: 'E-mail PDF',
    via_handmatig: 'Handmatig',
  }

  return (
    <div className="rounded-xl border border-[#E6E4E0] bg-[#FAFAF8] p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A5C5E]">
          Opvolging
        </h3>
        <div className="flex items-center gap-2">
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : actief ? (
            <Play className="h-3 w-3 text-[#1A5C5E]" />
          ) : (
            <Pause className="h-3 w-3 text-muted-foreground" />
          )}
          <Switch
            checked={actief}
            onCheckedChange={handleToggle}
            disabled={toggling}
            className="scale-75"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-4 space-y-3">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[#E6E4E0]" />
        {stappen.map((stap) => {
          const logEntry = logByStapId.get(stap.id)
          const isExecuted = logEntry?.resultaat === 'verstuurd'
          const isSkipped = logEntry && logEntry.resultaat !== 'verstuurd'
          const plannedDate = verstuurdOp ? getPlannedDate(verstuurdOp, stap.dagen_na_versturen) : null
          const isPast = plannedDate && plannedDate < new Date()

          return (
            <div key={stap.id} className="relative flex items-start gap-2.5">
              {/* Timeline dot */}
              <div className="absolute -left-4 top-0.5 z-10">
                {isExecuted ? (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white text-[8px] font-bold">
                    ✓
                  </span>
                ) : isSkipped ? (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#E6E4E0] text-[#A0A098] text-[9px]">
                    —
                  </span>
                ) : (
                  <span className={cn(
                    'flex h-3.5 w-3.5 items-center justify-center rounded-full border-2',
                    isPast && actief ? 'border-[#F15025] bg-[#FDE8E2]' : 'border-[#E6E4E0] bg-[#FEFDFB]'
                  )} />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className={cn(
                  'text-xs font-medium',
                  isExecuted ? 'text-emerald-700' : isSkipped ? 'text-muted-foreground line-through' : 'text-foreground'
                )}>
                  {stap.onderwerp.replace(/\{.*?\}/g, '').trim() || `Stap ${stap.stap_nummer}`}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {logEntry
                    ? formatDatum(logEntry.created_at)
                    : plannedDate
                      ? `Gepland: ${formatDatum(plannedDate.toISOString())}`
                      : `+${stap.dagen_na_versturen}d`
                  }
                  {isSkipped && (
                    <span className="ml-1 italic">
                      {logEntry.resultaat === 'overgeslagen_bekeken' && '(al bekeken)'}
                      {logEntry.resultaat === 'overgeslagen_gereageerd' && '(al gereageerd)'}
                      {logEntry.resultaat === 'overgeslagen_inactief' && '(gepauzeerd)'}
                      {logEntry.resultaat === 'fout' && '(fout)'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Verzendwijze badge */}
      {_schemaId && (
        <Badge variant="outline" className="text-[10px] border-[#E6E4E0] text-muted-foreground">
          Schema actief
        </Badge>
      )}
    </div>
  )
}

export function OfferteOpvolgTimelineWithVerzendwijze({ verzendwijze, ...props }: Props & { verzendwijze?: string }) {
  const verzendwijzeLabels: Record<string, string> = {
    via_portaal: 'Portaal',
    via_email_pdf: 'E-mail PDF',
    via_handmatig: 'Handmatig',
  }

  return (
    <div className="space-y-2">
      <OfferteOpvolgTimeline {...props} />
      {verzendwijze && (
        <Badge variant="outline" className="text-[10px] border-[#E6E4E0] text-[#1A5C5E]">
          {verzendwijzeLabels[verzendwijze] || verzendwijze}
        </Badge>
      )}
    </div>
  )
}
