import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Clock, FileSpreadsheet, Users, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getImportLogs } from '@/services/supabaseService'
import { BedrijfsdataUpload } from './BedrijfsdataUpload'
import { ContactpersonenUpload } from './ContactpersonenUpload'
import { LosseContacten } from './LosseContacten'
import type { ImportLog } from '@/types'

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function DataImportPage() {
  const { organisatieId } = useAuth()
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => {
    if (!organisatieId) return
    getImportLogs(organisatieId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false))
  }, [organisatieId])

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          Data importeren
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importeer je bestaande klanten, projecten, offertes en facturen vanuit je oude software.
        </p>
      </div>

      {/* Section 1: Bedrijfsdata */}
      <BedrijfsdataUpload />

      {/* Section 2: Contactpersonen */}
      <ContactpersonenUpload />

      {/* Section 3: Losse contacten */}
      {organisatieId && <LosseContacten organisatieId={organisatieId} />}

      {/* Import geschiedenis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Import geschiedenis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Laden...</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nog geen imports uitgevoerd.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Datum</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Bestand</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">Geïmporteerd</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">Overgeslagen</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">Fouten</th>
                    <th className="text-center py-2 pl-4 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {log.type === 'bedrijfsdata' ? (
                            <FileSpreadsheet className="w-3.5 h-3.5 text-[#1A535C]" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-[#1A535C]" />
                          )}
                          <span className="text-xs capitalize">{log.type}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground truncate max-w-[200px]">
                        {log.bestandsnaam || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-green-600">
                        {log.aantal_geimporteerd}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-amber-600">
                        {log.aantal_overgeslagen}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-red-600">
                        {log.aantal_fouten}
                      </td>
                      <td className="py-2.5 pl-4 text-center">
                        {log.status === 'voltooid' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        ) : log.status === 'met_fouten' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
