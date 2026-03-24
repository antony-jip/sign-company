import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Upload, Clock, FileSpreadsheet, Users, CheckCircle2, AlertTriangle, XCircle, Trash2, AlertOctagon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getImportLogs, deleteImportLog, deleteAllImportLogs, opschonenAlleImportData } from '@/services/supabaseService'
import { BedrijfsdataUpload } from './BedrijfsdataUpload'
import { ContactpersonenUpload } from './ContactpersonenUpload'
import { ImportHulpBanner } from './ImportHulpBanner'
import { LosseContacten } from './LosseContacten'
import type { ImportLog } from '@/types'
import { toast } from 'sonner'
import { confirm } from '@/components/shared/ConfirmDialog'

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
  const [opschonenDialogOpen, setOpschonenDialogOpen] = useState(false)
  const [opschonenLoading, setOpschonenLoading] = useState(false)

  function loadLogs() {
    if (!organisatieId) return
    setLogsLoading(true)
    getImportLogs(organisatieId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false))
  }

  useEffect(() => {
    loadLogs()
  }, [organisatieId])

  async function handleDeleteLog(id: string) {
    try {
      await deleteImportLog(id)
      setLogs((prev) => prev.filter((l) => l.id !== id))
      toast.success('Import log verwijderd')
    } catch {
      toast.error('Fout bij verwijderen van log')
    }
  }

  async function handleClearHistory() {
    if (!organisatieId) return
    const confirmed = await confirm({ message: 'Weet je zeker dat je alle import geschiedenis wilt wissen?', variant: 'destructive', confirmLabel: 'Verwijderen' })
    if (!confirmed) return
    try {
      await deleteAllImportLogs(organisatieId)
      setLogs([])
      toast.success('Import geschiedenis gewist')
    } catch {
      toast.error('Fout bij wissen van geschiedenis')
    }
  }

  async function handleOpschonen() {
    if (!organisatieId) return
    setOpschonenLoading(true)
    try {
      await opschonenAlleImportData(organisatieId)
      setLogs([])
      setOpschonenDialogOpen(false)
      toast.success('Alle geïmporteerde data is verwijderd. Je kunt opnieuw beginnen.')
    } catch (error) {
      toast.error('Fout bij opschonen van data')
    } finally {
      setOpschonenLoading(false)
    }
  }

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

      {/* AI tip */}
      <div className="rounded-xl border border-[#1A535C]/15 bg-[#1A535C]/[0.03] p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Tip: heb je een export uit je oude software?</p>
        <p className="text-sm text-muted-foreground">
          Plak je export in ChatGPT of Claude met deze instructie:
        </p>
        <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg italic leading-relaxed">
          &quot;Zet deze data om naar CSV met ; als scheidingsteken en deze kolommen:
          type;bedrijfsnaam;naam;nummer;datum;bedrag;adres;postcode;plaats;telefoon;email;kvk_nummer;btw_nummer;verantwoordelijke.
          Type is: relatie, project, offerte, of factuur.
          Bij relatie: vul bedrijfsnaam + adres/postcode/plaats/telefoon/email/kvk/btw in.
          Bij project/offerte/factuur: vul bedrijfsnaam + naam/nummer/datum/bedrag in.&quot;
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Import geschiedenis
            </CardTitle>
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearHistory}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Geschiedenis wissen
              </Button>
            )}
          </div>
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
                    <th className="text-center py-2 px-4 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-center py-2 pl-4 text-xs font-medium text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 group">
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
                      <td className="py-2.5 px-4 text-center">
                        {log.status === 'voltooid' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        ) : log.status === 'met_fouten' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-2.5 pl-4 text-center">
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteLog(log.id)}
                          title="Verwijder log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data opschonen */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <AlertOctagon className="w-5 h-5" />
            Data opschonen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Verwijder alle geïmporteerde data (contactpersonen, klant historie, import logs en geïmporteerde klanten).
            Handmatig aangemaakte klanten blijven behouden. Handig als je opnieuw wilt beginnen met importeren.
          </p>
          <Button
            variant="destructive"
            onClick={() => setOpschonenDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Alle import data verwijderen
          </Button>
        </CardContent>
      </Card>

      {/* Hulp banner */}
      <ImportHulpBanner />

      {/* Opschonen bevestigingsdialog */}
      <Dialog open={opschonenDialogOpen} onOpenChange={setOpschonenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertOctagon className="w-5 h-5" />
              Data opschonen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">
              Dit verwijdert <strong>alle</strong> geïmporteerde data:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Alle contactpersonen</li>
              <li>Alle klant historie (projecten, offertes, facturen)</li>
              <li>Alle import logs</li>
              <li>Alle geïmporteerde klanten (handmatige klanten blijven behouden)</li>
            </ul>
            <p className="text-sm font-medium text-destructive">
              Dit kan niet ongedaan worden!
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpschonenDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleOpschonen}
              disabled={opschonenLoading}
            >
              {opschonenLoading ? 'Bezig met opschonen...' : 'Ja, alles verwijderen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
