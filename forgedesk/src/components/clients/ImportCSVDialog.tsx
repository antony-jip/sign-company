import React, { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { importKlantenFromCSV, importHistorieFromCSV } from '@/services/importService'
import type { CSVKlantRij, CSVHistorieRij, ImportResultaat } from '@/types'
import { logger } from '../../utils/logger'

interface ImportCSVDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

type ImportStap = 'upload' | 'preview' | 'importing' | 'resultaat'

function parseCSV<T extends Record<string, string>>(text: string, separator = ';'): T[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"/, '').replace(/"$/, ''))
  const rows: T[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map((v) => v.trim().replace(/^"/, '').replace(/"$/, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    rows.push(row as T)
  }

  return rows
}

export function ImportCSVDialog({ open, onOpenChange, onImportComplete }: ImportCSVDialogProps) {
  const [activeTab, setActiveTab] = useState<'klanten' | 'historie'>('klanten')
  const [stap, setStap] = useState<ImportStap>('upload')
  const [klantenData, setKlantenData] = useState<CSVKlantRij[]>([])
  const [historieData, setHistorieData] = useState<CSVHistorieRij[]>([])
  const [resultaat, setResultaat] = useState<ImportResultaat | null>(null)
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStap('upload')
    setKlantenData([])
    setHistorieData([])
    setResultaat(null)
    setImporting(false)
    setFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Alleen CSV bestanden zijn toegestaan')
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      if (!text) return

      if (activeTab === 'klanten') {
        const rows = parseCSV<CSVKlantRij>(text)
        if (rows.length === 0) {
          toast.error('Geen data gevonden in CSV bestand')
          return
        }
        if (!rows[0].bedrijfsnaam) {
          toast.error('CSV mist verplichte kolom "bedrijfsnaam". Controleer de separator (;)')
          return
        }
        setKlantenData(rows)
      } else {
        const rows = parseCSV<CSVHistorieRij>(text)
        if (rows.length === 0) {
          toast.error('Geen data gevonden in CSV bestand')
          return
        }
        if (!rows[0].bedrijfsnaam) {
          toast.error('CSV mist verplichte kolom "bedrijfsnaam". Controleer de separator (;)')
          return
        }
        setHistorieData(rows)
      }
      setStap('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    setImporting(true)
    setStap('importing')

    try {
      let result: ImportResultaat
      if (activeTab === 'klanten') {
        result = await importKlantenFromCSV(klantenData)
      } else {
        result = await importHistorieFromCSV(historieData)
      }
      setResultaat(result)
      setStap('resultaat')

      if (result.geimporteerd > 0) {
        toast.success(`${result.geimporteerd} ${activeTab === 'klanten' ? 'klanten' : 'historie records'} geimporteerd`)
        onImportComplete()
      }
    } catch (error) {
      logger.error(error)
      toast.error('Fout bij importeren')
      setStap('preview')
    } finally {
      setImporting(false)
    }
  }

  const previewData = activeTab === 'klanten' ? klantenData : historieData
  const previewCount = previewData.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import vanuit James PRO</DialogTitle>
          <DialogDescription>
            Importeer klanten en historiedata via CSV bestanden (separator: ;)
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'klanten' | 'historie'); reset() }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="klanten">Klanten CSV</TabsTrigger>
            <TabsTrigger value="historie">Historie CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="klanten" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Importeer klantgegevens: bedrijfsnaam, adres, contact, KvK, BTW, omzet, etc.
            </p>
          </TabsContent>
          <TabsContent value="historie" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Importeer projecthistorie en offertes voor de AI-kennisbank. Klanten moeten eerst geimporteerd zijn.
            </p>
          </TabsContent>
        </Tabs>

        {/* Upload stap */}
        {stap === 'upload' && (
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              Klik om een CSV bestand te selecteren
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTab === 'klanten' ? 'workmate_klanten_import.csv' : 'workmate_historie_import.csv'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Preview stap */}
        {stap === 'preview' && (
          <div className="space-y-3 overflow-auto flex-1 min-h-0">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{fileName}</span>
              <Badge variant="secondary" className="text-xs">{previewCount} rijen</Badge>
            </div>

            {/* Preview tabel */}
            <div className="border rounded-lg overflow-auto max-h-[40vh]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Bedrijfsnaam</th>
                    {activeTab === 'klanten' ? (
                      <>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Plaats</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Omzet</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Specialisaties</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Conversie</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Projecten</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(activeTab === 'klanten' ? klantenData : historieData).slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium">{row.bedrijfsnaam}</td>
                      {activeTab === 'klanten' ? (
                        <>
                          <td className="px-3 py-1.5">{(row as CSVKlantRij).plaats}</td>
                          <td className="px-3 py-1.5">
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {(row as CSVKlantRij).status}
                            </Badge>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {(row as CSVKlantRij).omzet_totaal ? `€${parseFloat((row as CSVKlantRij).omzet_totaal).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-1.5">{(row as CSVHistorieRij).specialisaties}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {(row as CSVHistorieRij).conversie_percentage ? `${(row as CSVHistorieRij).conversie_percentage}%` : '-'}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {(row as CSVHistorieRij).projecten_samenvatting
                              ? (row as CSVHistorieRij).projecten_samenvatting.split(' | ').length
                              : 0}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewCount > 50 && (
                <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
                  ... en {previewCount - 50} meer rijen
                </div>
              )}
            </div>
          </div>
        )}

        {/* Importing stap */}
        {stap === 'importing' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">
              {activeTab === 'klanten' ? 'Klanten' : 'Historie'} importeren...
            </p>
            <p className="text-xs text-muted-foreground">
              {previewCount} rijen verwerken
            </p>
            <Progress value={50} className="w-64" />
          </div>
        )}

        {/* Resultaat stap */}
        {stap === 'resultaat' && resultaat && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">{resultaat.geimporteerd}</p>
                  <p className="text-xs text-green-600 dark:text-green-500">Geimporteerd</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <SkipForward className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{resultaat.overgeslagen}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Overgeslagen</p>
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg border",
                resultaat.fouten > 0
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
                  : "bg-muted/50 border-border"
              )}>
                <AlertCircle className={cn("w-5 h-5", resultaat.fouten > 0 ? "text-red-600" : "text-muted-foreground")} />
                <div>
                  <p className={cn("text-lg font-bold", resultaat.fouten > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>{resultaat.fouten}</p>
                  <p className="text-xs text-muted-foreground">Fouten</p>
                </div>
              </div>
            </div>

            {resultaat.fout_details.length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-32">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
                  Foutdetails
                </div>
                <div className="p-3 space-y-1">
                  {resultaat.fout_details.map((fout, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">{fout}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          {stap === 'preview' && (
            <>
              <Button variant="outline" onClick={reset}>
                Terug
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                <Upload className="w-4 h-4 mr-2" />
                Importeer {previewCount} {activeTab === 'klanten' ? 'klanten' : 'records'}
              </Button>
            </>
          )}
          {stap === 'resultaat' && (
            <>
              <Button variant="outline" onClick={reset}>
                Nog een bestand importeren
              </Button>
              <Button onClick={() => handleClose(false)}>
                Sluiten
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
