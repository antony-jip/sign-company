import React, { useState, useEffect } from 'react'
import { Clock, ChevronDown, ChevronUp, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAuditLog } from '@/services/supabaseService'
import type { AuditLogEntry } from '@/types'

interface AuditLogPanelProps {
  entityType: AuditLogEntry['entity_type']
  entityId: string
  maxItems?: number
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Zojuist'
  if (diffMin < 60) return `${diffMin} min geleden`
  if (diffHour < 24) return `${diffHour} uur geleden`
  if (diffDay < 7) return `${diffDay} dagen geleden`

  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function beschrijfActie(entry: AuditLogEntry): string {
  const wie = entry.medewerker_naam || 'Iemand'

  switch (entry.actie) {
    case 'aangemaakt':
      return `${wie} heeft dit aangemaakt`
    case 'verwijderd':
      return `${wie} heeft dit verwijderd`
    case 'verstuurd':
      return entry.omschrijving || `${wie} heeft dit verstuurd`
    case 'goedgekeurd':
      return entry.omschrijving || `${wie} heeft dit goedgekeurd`
    case 'status_gewijzigd':
      if (entry.oude_waarde && entry.nieuwe_waarde) {
        return `${wie} heeft de status gewijzigd van '${entry.oude_waarde}' naar '${entry.nieuwe_waarde}'`
      }
      return entry.omschrijving || `${wie} heeft de status gewijzigd`
    case 'gewijzigd':
      if (entry.veld && entry.oude_waarde && entry.nieuwe_waarde) {
        return `${wie} heeft ${entry.veld} gewijzigd van '${entry.oude_waarde}' naar '${entry.nieuwe_waarde}'`
      }
      if (entry.veld) {
        return `${wie} heeft ${entry.veld} gewijzigd`
      }
      return entry.omschrijving || `${wie} heeft een wijziging aangebracht`
    default:
      return entry.omschrijving || `${wie} heeft een actie uitgevoerd`
  }
}

export function AuditLogPanel({ entityType, entityId, maxItems = 10 }: AuditLogPanelProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!entityId || !expanded) return
    setLoading(true)
    getAuditLog(entityType, entityId, 50)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [entityType, entityId, expanded])

  const visibleEntries = showAll ? entries : entries.slice(0, maxItems)

  return (
    <div className="border-t border-border mt-4 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
      >
        <Clock className="w-4 h-4" />
        <span>Geschiedenis</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
      </button>

      {expanded && (
        <div className="mt-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2.5 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-2">
              Nog geen geschiedenis beschikbaar
            </p>
          ) : (
            <div className="relative pl-4">
              {/* Verticale tijdlijn */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-3">
                {visibleEntries.map((entry) => (
                  <div key={entry.id} className="relative flex gap-3">
                    {/* Tijdlijn dot */}
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-background border-2 border-muted-foreground/30 z-10" />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">
                        {beschrijfActie(entry)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatRelativeTime(entry.created_at)}
                        </span>
                        {entry.medewerker_naam && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                            <User className="w-2.5 h-2.5" />
                            {entry.medewerker_naam}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {entries.length > maxItems && !showAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(true)}
                  className="mt-2 text-xs h-7 text-muted-foreground"
                >
                  Toon meer ({entries.length - maxItems} meer)
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
