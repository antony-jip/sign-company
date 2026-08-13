import { useEffect, useState, useCallback } from 'react'
import { Clock, CalendarClock, X, AlertCircle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { getIngeplandeBerichten, cancelIngeplandBericht } from '@/services/emailService'
import type { IngeplandBericht } from '@/types'
import { logger } from '@/utils/logger'
import { cn } from '@/lib/utils'

function formatScheduledAt(iso: string): string {
  const d = new Date(iso)
  const nu = new Date()
  const morgen = new Date(nu)
  morgen.setDate(morgen.getDate() + 1)
  const isVandaag = d.toDateString() === nu.toDateString()
  const isMorgen = d.toDateString() === morgen.toDateString()
  const tijd = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (isVandaag) return `Vandaag ${tijd}`
  if (isMorgen) return `Morgen ${tijd}`
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + tijd
}

const STATUS_LABEL: Record<IngeplandBericht['status'], string> = {
  wachtend: 'Wachtend',
  // De database kent deze stand sinds migratie 120, de UI niet. Een bericht dat
  // erin blijft hangen (proces gestorven tussen claim en afronding) rendde
  // daardoor zonder label en zonder annuleerknop: onzichtbaar vastgelopen.
  verwerken: 'Bezig met versturen',
  verzonden: 'Verzonden',
  geannuleerd: 'Geannuleerd',
  mislukt: 'Mislukt',
}

export function IngeplandeBerichtenLijst() {
  const [berichten, setBerichten] = useState<IngeplandBericht[]>([])
  const [loading, setLoading] = useState(true)
  const [annulerenId, setAnnulerenId] = useState<string | null>(null)

  const laden = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await getIngeplandeBerichten()
      setBerichten(data)
    } catch (err) {
      logger.error('Ingeplande berichten ophalen mislukt:', err)
      if (!silent) toast.error('Kon ingeplande berichten niet laden')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void laden()
    const interval = setInterval(() => { void laden(true) }, 20000)
    return () => clearInterval(interval)
  }, [laden])

  const handleCancel = useCallback(async (id: string) => {
    setAnnulerenId(id)
    try {
      await cancelIngeplandBericht(id)
      setBerichten(prev => prev.map(b => b.id === id ? { ...b, status: 'geannuleerd' } : b))
      toast.success('Ingepland bericht geannuleerd')
    } catch (err) {
      logger.error('Annuleren mislukt:', err)
      toast.error('Annuleren mislukt')
    } finally {
      setAnnulerenId(null)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex-1 px-6 py-5 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[86px] rounded-[14px] bg-petrol/[0.04] dark:bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (berichten.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 rounded-[18px] bg-petrol/[0.06] dark:bg-white/[0.06] flex items-center justify-center mb-4">
          <CalendarClock className="h-6 w-6 text-petrol/70 dark:text-[#7FB5BF]" strokeWidth={1.8} />
        </div>
        <p className="font-heading text-[15px] font-bold text-foreground">
          Niets ingepland<span className="text-flame">.</span>
        </p>
        <p className="text-[12.5px] text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
          Plan een bericht in vanuit Nieuw bericht of een antwoord, dan wacht het hier op zijn moment.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-5">
        <div className="flex items-center gap-2.5 mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-petrol/65 dark:text-foreground/60">
          <span className="font-semibold whitespace-nowrap">
            Ingepland<span className="text-flame tracking-normal">.</span>
          </span>
          <span className="flex-1 h-px bg-gradient-to-r from-petrol/[0.14] to-transparent dark:from-white/10" aria-hidden />
          <span className="tabular-nums tracking-normal text-petrol/40 dark:text-foreground/40">{berichten.length}</span>
        </div>
        <div className="space-y-2">
          {berichten.map(b => {
            const isWachtend = b.status === 'wachtend'
            const isAnnuleren = annulerenId === b.id
            return (
              <div
                key={b.id}
                className={cn(
                  'relative overflow-hidden rounded-[14px] pl-5 pr-4 py-3 bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(26,83,92,0.05)]',
                  !isWachtend && b.status !== 'verwerken' && 'opacity-70',
                )}
              >
                <span
                  className={cn(
                    'absolute left-0 inset-y-0 w-[3px]',
                    b.status === 'verzonden' && 'bg-emerald-500/70',
                    b.status === 'mislukt' && 'bg-[#C0451A]/70',
                    b.status === 'geannuleerd' && 'bg-muted-foreground/30',
                    b.status === 'verwerken' && 'bg-amber-500/70',
                    isWachtend && 'bg-petrol/60 dark:bg-[#2A7A86]',
                  )}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-petrol dark:text-[#7FB5BF] flex-shrink-0" />
                      <span className="text-[12px] font-mono tabular-nums text-petrol dark:text-[#7FB5BF] font-semibold">
                        {formatScheduledAt(b.scheduled_at)}
                      </span>
                      {!isWachtend && (
                        <span className={cn(
                          'font-mono text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full leading-none',
                          b.status === 'verzonden' && 'bg-emerald-100 text-emerald-700',
                          b.status === 'geannuleerd' && 'bg-muted text-muted-foreground',
                          b.status === 'mislukt' && 'bg-red-100 text-red-700',
                          // Amber, want dit is geen eindstand: de cron heeft hem
                          // geclaimd en pakt alleen 'wachtend' op, dus blijft hij
                          // hier hangen dan komt er niemand meer langs.
                          b.status === 'verwerken' && 'bg-amber-100 text-amber-800',
                        )}>
                          {STATUS_LABEL[b.status]}
                        </span>
                      )}
                      {b.bron === 'outbox' && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full leading-none bg-petrol/[0.09] text-petrol dark:text-[#7FB5BF] dark:bg-[#2A7A86]/20">
                          Outbox
                        </span>
                      )}
                      {isWachtend && (b.retry_count ?? 0) > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          poging {(b.retry_count ?? 0) + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-semibold text-foreground truncate">
                      {b.onderwerp || '(geen onderwerp)'}
                    </p>
                    <p className="text-[12.5px] text-muted-foreground truncate">
                      Aan {b.ontvanger}
                    </p>
                    {b.foutmelding && (
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-red-700">
                        <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>{b.foutmelding}</span>
                      </div>
                    )}
                    {b.status === 'verzonden' && b.verzonden_op && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700">
                        <Check className="h-3 w-3 flex-shrink-0" />
                        <span>Verzonden op {new Date(b.verzonden_op).toLocaleString('nl-NL')}</span>
                      </div>
                    )}
                  </div>
                  {isWachtend && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      disabled={isAnnuleren}
                      className="h-8 px-3 rounded-lg text-[12px] font-medium text-[#C0451A] bg-[#C0451A]/[0.06] hover:bg-[#C0451A]/[0.12] transition-colors flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                      {isAnnuleren ? 'Annuleren...' : 'Annuleren'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
