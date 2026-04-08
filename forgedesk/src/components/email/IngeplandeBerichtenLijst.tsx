import { useEffect, useState, useCallback } from 'react'
import { Clock, X, AlertCircle, Check, FileText } from 'lucide-react'
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
  verzonden: 'Verzonden',
  geannuleerd: 'Geannuleerd',
  mislukt: 'Mislukt',
}

export function IngeplandeBerichtenLijst() {
  const [berichten, setBerichten] = useState<IngeplandBericht[]>([])
  const [loading, setLoading] = useState(true)
  const [annulerenId, setAnnulerenId] = useState<string | null>(null)

  const laden = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getIngeplandeBerichten()
      setBerichten(data)
    } catch (err) {
      logger.error('Ingeplande berichten ophalen mislukt:', err)
      toast.error('Kon ingeplande berichten niet laden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void laden()
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
      <div className="flex-1 flex items-center justify-center text-[13px] text-[#9B9B95]">
        Laden...
      </div>
    )
  }

  if (berichten.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <Clock className="h-10 w-10 text-[#B0ADA8] mb-3" />
        <p className="text-[14px] text-[#6B6B66] font-medium">Geen ingeplande berichten</p>
        <p className="text-[12px] text-[#9B9B95] mt-1">Plan een email in vanuit Nieuw bericht of een Reply</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-4">
        <h2 className="text-[15px] font-semibold text-[#1A1A1A] mb-3">Ingeplande berichten</h2>
        <div className="space-y-2">
          {berichten.map(b => {
            const isWachtend = b.status === 'wachtend'
            const isAnnuleren = annulerenId === b.id
            return (
              <div
                key={b.id}
                className={cn(
                  'border border-[#EBEBEB] rounded-xl px-4 py-3 bg-white',
                  !isWachtend && 'opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-[#1A535C] flex-shrink-0" />
                      <span className="text-[12px] font-mono text-[#1A535C] font-medium">
                        {formatScheduledAt(b.scheduled_at)}
                      </span>
                      {!isWachtend && (
                        <span className={cn(
                          'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded',
                          b.status === 'verzonden' && 'bg-emerald-100 text-emerald-700',
                          b.status === 'geannuleerd' && 'bg-[#F0EFEC] text-[#9B9B95]',
                          b.status === 'mislukt' && 'bg-red-100 text-red-700',
                        )}>
                          {STATUS_LABEL[b.status]}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-medium text-[#1A1A1A] truncate">
                      Aan: {b.ontvanger}
                    </p>
                    <p className="text-[13px] text-[#6B6B66] truncate">{b.onderwerp}</p>
                    {b.metadata && 'type' in b.metadata && b.metadata.type === 'offerte_verzenden' && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[#1A535C] bg-[#1A535C]/[0.07] px-2 py-0.5 rounded">
                        <FileText className="h-3 w-3" />
                        <span>Offerte {b.metadata.offerte_nummer}</span>
                      </div>
                    )}
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
