import React from 'react'
import { AlertTriangle, Ban, StickyNote } from 'lucide-react'
import type { Klant } from '@/types'
import { klantStatusConfig } from '@/types'
import { useFunctie } from '@/hooks/useFunctie'

interface KlantStatusWarningProps {
  klant: Klant | null | undefined
  className?: string
  /** Kleinere balk voor telefoonschermen (werkbon voor de monteur). */
  compact?: boolean
}

export function KlantStatusWarning({ klant, className, compact }: KlantStatusWarningProps) {
  const notitieAlsWaarschuwing = useFunctie('klant_waarschuwing')
  if (!klant) return null

  const status = klant.klant_status && klant.klant_status !== 'normaal' ? klant.klant_status : null
  const cfg = status ? klantStatusConfig[status] : null
  const isBlocking = status === 'niet_helpen' || status === 'geblokkeerd'
  const isWarning = status === 'vooruit_betalen'
  const toonStatus = !!cfg && (isBlocking || isWarning)

  const notitie = klant.gepinde_notitie?.trim() || ''
  const toonNotitie = notitieAlsWaarschuwing && klant.gepinde_notitie_waarschuwing === true && notitie.length > 0

  if (!toonStatus && !toonNotitie) return null

  const balk = compact
    ? 'flex items-start gap-2 px-3 py-2 rounded-lg text-[13px] font-medium'
    : 'flex items-start gap-2 px-4 py-2.5 rounded-lg text-sm font-medium'
  const icoon = compact ? 'w-3.5 h-3.5 flex-shrink-0 mt-0.5' : 'w-4 h-4 flex-shrink-0 mt-0.5'

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {toonStatus && cfg && (
        <div className={balk} style={{ color: cfg.color, backgroundColor: cfg.bgColor }}>
          {isBlocking ? <Ban className={icoon} /> : <AlertTriangle className={icoon} />}
          <span>
            {isBlocking
              ? `Deze klant heeft status '${cfg.label}'`
              : `Let op: deze klant heeft status '${cfg.label}'`
            }
          </span>
        </div>
      )}
      {toonNotitie && (
        <div className={`${balk} bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200/70 dark:border-amber-800/60`}>
          <StickyNote className={`${icoon} text-amber-600 dark:text-amber-400`} />
          <span className="whitespace-pre-wrap">{notitie}</span>
        </div>
      )}
    </div>
  )
}

interface KlantStatusBadgeInlineProps {
  klant: Klant | null | undefined
}

export function KlantStatusBadgeInline({ klant }: KlantStatusBadgeInlineProps) {
  if (!klant?.klant_status || klant.klant_status === 'normaal') return null

  const cfg = klantStatusConfig[klant.klant_status]
  if (!cfg) return null

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ml-2"
      style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
    >
      {cfg.label}
    </span>
  )
}
