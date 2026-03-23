import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { ImportOperationResult } from '@/types'

interface ImportResultaatProps {
  resultaat: ImportOperationResult
  type: 'bedrijfsdata' | 'contactpersonen'
}

export function ImportResultaat({ resultaat, type }: ImportResultaatProps) {
  const label = type === 'bedrijfsdata' ? 'records' : 'contactpersonen'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            Import voltooid
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
            {resultaat.geimporteerd} {label} geïmporteerd
            {resultaat.overgeslagen > 0 && ` · ${resultaat.overgeslagen} overgeslagen`}
            {resultaat.fouten > 0 && ` · ${resultaat.fouten} fouten`}
          </p>
        </div>
      </div>

      {resultaat.foutMeldingen.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {resultaat.foutMeldingen.map((msg, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs p-2 rounded bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400"
            >
              <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      {resultaat.overgeslagen > 0 && resultaat.fouten === 0 && (
        <div className="flex items-start gap-2 text-xs p-2 rounded bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{resultaat.overgeslagen} rijen overgeslagen (duplicaten of lege rijen)</span>
        </div>
      )}
    </div>
  )
}
