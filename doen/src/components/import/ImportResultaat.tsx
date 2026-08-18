import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { ImportOperationResult } from '@/types'

interface ImportResultaatProps {
  resultaat: ImportOperationResult
  type: 'bedrijfsdata' | 'contactpersonen'
}

export function ImportResultaat({ resultaat, type }: ImportResultaatProps) {
  const label = type === 'bedrijfsdata' ? 'records' : 'contactpersonen'

  // De uitslag volgt wat er echt gebeurd is. Eerder stond hier onvoorwaardelijk
  // een groen "Import voltooid", ook bij nul geïmporteerde regels en honderden
  // fouten — dan denkt iemand dat zijn klantenbestand binnen is.
  const niksBinnen = resultaat.geimporteerd === 0
  const stemming = niksBinnen && resultaat.fouten > 0
    ? 'fout'
    : resultaat.fouten > 0 || niksBinnen
      ? 'deels'
      : 'goed'

  const kop = stemming === 'fout'
    ? 'Import mislukt'
    : stemming === 'deels'
      ? 'Import deels gelukt'
      : 'Import voltooid'

  const stijl = {
    goed: {
      vak: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      titel: 'text-green-800 dark:text-green-300',
      tekst: 'text-green-700 dark:text-green-400',
      Icon: CheckCircle2,
      icoon: 'text-green-600',
    },
    deels: {
      vak: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      titel: 'text-amber-800 dark:text-amber-300',
      tekst: 'text-amber-700 dark:text-amber-400',
      Icon: AlertTriangle,
      icoon: 'text-amber-600',
    },
    fout: {
      vak: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      titel: 'text-red-800 dark:text-red-300',
      tekst: 'text-red-700 dark:text-red-400',
      Icon: XCircle,
      icoon: 'text-red-600',
    },
  }[stemming]

  const { Icon } = stijl
  const namen = resultaat.overgeslagenNamen ?? []

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${stijl.vak}`}>
        <Icon className={`w-5 h-5 flex-shrink-0 ${stijl.icoon}`} />
        <div>
          <p className={`text-sm font-semibold ${stijl.titel}`}>{kop}</p>
          <p className={`text-xs mt-0.5 ${stijl.tekst}`}>
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

      {namen.length > 0 && (
        <div className="text-xs p-3 rounded bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 space-y-1.5">
          <p className="font-semibold">
            Overgeslagen omdat er al een relatie met (bijna) dezelfde naam bestond:
          </p>
          <ul className="max-h-32 overflow-y-auto space-y-0.5 list-disc pl-4">
            {namen.slice(0, 50).map((naam, i) => (
              <li key={i}>{naam}</li>
            ))}
          </ul>
          {namen.length > 50 && <p>…en nog {namen.length - 50} andere.</p>}
          <p>Klopt dit niet? Voeg die relatie handmatig toe onder Klanten.</p>
        </div>
      )}

      {resultaat.overgeslagen > 0 && namen.length === 0 && resultaat.fouten === 0 && (
        <div className="flex items-start gap-2 text-xs p-2 rounded bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{resultaat.overgeslagen} rijen overgeslagen · stonden er al in of waren leeg</span>
        </div>
      )}
    </div>
  )
}
