import React from 'react'
import { AlertTriangle, Ban } from 'lucide-react'
import type { Klant } from '@/types'
import { klantStatusConfig } from '@/types'

interface KlantStatusWarningProps {
  klant: Klant | null | undefined
  className?: string
}

export function KlantStatusWarning({ klant, className }: KlantStatusWarningProps) {
  if (!klant?.klant_status || klant.klant_status === 'normaal') return null

  const cfg = klantStatusConfig[klant.klant_status]
  if (!cfg) return null

  const isBlocking = klant.klant_status === 'niet_helpen' || klant.klant_status === 'geblokkeerd'
  const isWarning = klant.klant_status === 'vooruit_betalen'

  if (!isBlocking && !isWarning) return null

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${className || ''}`}
      style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
    >
      {isBlocking ? (
        <Ban className="w-4 h-4 flex-shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      )}
      <span>
        {isBlocking
          ? `Deze klant heeft status '${cfg.label}'`
          : `Let op: deze klant heeft status '${cfg.label}'`
        }
      </span>
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
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ml-2"
      style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
    >
      {cfg.label}
    </span>
  )
}
