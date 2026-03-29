import React from 'react'
import { cn } from '@/lib/utils'

interface ImportPreviewProps {
  headers?: string[]
  rows?: Record<string, string>[]
  type?: 'bedrijfsdata' | 'contactpersonen'
  maxRows?: number
  samenvatting?: import('@/services/universalImportService').ImportSamenvatting
}

const TYPE_COLORS: Record<string, string> = {
  relatie: 'bg-[#1A535C]/10 dark:bg-[#1A535C]/20',
  project: 'bg-gray-100 dark:bg-gray-800/50',
  offerte: 'bg-[#F15025]/10 dark:bg-[#F15025]/20',
  factuur: 'bg-green-50 dark:bg-green-900/20',
}

function getFilledColumns(row: Record<string, string>, headers: string[]): string[] {
  return headers.filter((h) => (row[h] || '').trim() !== '')
}

export function ImportPreview({ headers = [], rows = [], type, maxRows = 10, samenvatting }: ImportPreviewProps) {
  if (samenvatting) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-medium">Samenvatting:</span>
          <span className="px-2 py-0.5 rounded bg-[#1A535C]/10 text-[#1A535C] dark:text-[#4ECDC4] font-medium">
            {samenvatting.klanten} klanten
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
            {samenvatting.projecten.total} projecten
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="px-2 py-0.5 rounded bg-[#F15025]/10 text-[#F15025] font-medium">
            {samenvatting.offertes.total} offertes
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
            {samenvatting.facturen.total} facturen
          </span>
        </div>
        {samenvatting.warnings.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
            {samenvatting.warnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        )}
      </div>
    )
  }

  const preview = rows.slice(0, maxRows)

  if (type === 'bedrijfsdata') {
    const counts = { relatie: 0, project: 0, offerte: 0, factuur: 0 }
    for (const row of rows) {
      const t = (row.type || '').toLowerCase().trim() as keyof typeof counts
      if (t in counts) counts[t]++
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-medium">Gevonden:</span>
          <span className="px-2 py-0.5 rounded bg-[#1A535C]/10 text-[#1A535C] dark:text-[#4ECDC4] font-medium">
            {counts.relatie} relaties
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
            {counts.project} projecten
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="px-2 py-0.5 rounded bg-[#F15025]/10 text-[#F15025] font-medium">
            {counts.offerte} offertes
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
            {counts.factuur} facturen
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {preview.map((row, i) => {
                  const rowType = (row.type || '').toLowerCase().trim()
                  const filled = getFilledColumns(row, headers)
                  return (
                    <tr key={i} className={cn('border-b last:border-0', TYPE_COLORS[rowType] || '')}>
                      <td className="px-3 py-2 font-medium whitespace-nowrap w-20">
                        {row.type}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {filled.filter((h) => h !== 'type').map((h) => (
                            <span key={h}>
                              <span className="text-muted-foreground">{h}:</span>{' '}
                              <span className="font-medium">{row[h]}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {rows.length > maxRows && (
          <p className="text-xs text-muted-foreground text-center">
            ...en nog {rows.length - maxRows} rijen
          </p>
        )}
      </div>
    )
  }

  // Contactpersonen preview
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Gevonden: {rows.length} contactpersonen</p>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground capitalize">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 whitespace-nowrap">
                      {row[h] || <span className="text-muted-foreground/30">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > maxRows && (
        <p className="text-xs text-muted-foreground text-center">
          ...en nog {rows.length - maxRows} rijen
        </p>
      )}
    </div>
  )
}
