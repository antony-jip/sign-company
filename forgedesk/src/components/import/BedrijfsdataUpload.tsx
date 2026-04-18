import React, { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, Download, FileSpreadsheet, AlertCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  parseCSV,
  valideerBedrijfsdata,
  importeerBedrijfsdata,
  generateBedrijfsdataTemplate,
  downloadCSV,
} from '@/services/importService'
import { ImportPreview } from './ImportPreview'
import { ImportResultaat as ImportResultaatComponent } from './ImportResultaat'
import { ImportHelp } from './ImportHelp'
import type { ImportOperationResult } from '@/types'
import { cn } from '@/lib/utils'

export function BedrijfsdataUpload() {
  const { user, organisatieId } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')
  const [fouten, setFouten] = useState<string[]>([])
  const [waarschuwingen, setWaarschuwingen] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [resultaat, setResultaat] = useState<ImportOperationResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setResultaat(null)
    setFouten([])
    setWaarschuwingen([])
    setFileName(file.name)

    if (file.size > 10 * 1024 * 1024) {
      setFouten([`Bestand is te groot (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum is 10MB.`])
      setIsValid(false)
      return
    }

    try {
      const { headers: h, rows: r } = await parseCSV(file)
      setHeaders(h)
      setRows(r)

      if (r.length === 0) {
        setFouten(['Het bestand bevat geen data.'])
        setIsValid(false)
        return
      }

      const validatie = valideerBedrijfsdata(h, r)
      setFouten(validatie.fouten)
      setWaarschuwingen(validatie.waarschuwingen)
      setIsValid(validatie.isValid)
    } catch (err) {
      setFouten([`Fout bij het lezen van het bestand: ${err instanceof Error ? err.message : 'onbekend formaat'}`])
      setIsValid(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleImport = async () => {
    if (!organisatieId || !user?.id) {
      toast.error('Kan niet importeren — je bent niet ingelogd of je organisatie is niet gevonden. Herlaad de pagina.')
      return
    }
    setImporting(true)
    setProgress({ current: 0, total: rows.length })

    try {
      const result = await importeerBedrijfsdata(
        rows,
        organisatieId,
        user.id,
        fileName,
        (current, total) => setProgress({ current, total }),
      )
      setResultaat(result)
    } catch (err) {
      setResultaat({
        geimporteerd: 0,
        overgeslagen: 0,
        fouten: 1,
        foutMeldingen: [err instanceof Error ? err.message : 'Onbekende fout'],
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#1A535C]" />
          Bedrijfsdata
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Upload één CSV-bestand met al je bedrijfsdata. Gebruik de eerste kolom om aan te geven
          wat voor type regel het is: relatie, project, offerte of factuur.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template download */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCSV(generateBedrijfsdataTemplate(), 'bedrijfsdata_template.csv')}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download template
        </Button>

        {/* Upload zone */}
        {!resultaat && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-[#1A535C] bg-[#1A535C]/5'
                : 'border-muted-foreground/20 hover:border-muted-foreground/40'
            )}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Sleep je CSV-bestand hierheen of <span className="text-[#1A535C] font-medium">klik om te uploaden</span>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">.csv bestanden</p>
            {fileName && (
              <p className="text-xs font-medium mt-2 text-[#1A535C]">{fileName}</p>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {/* Validation errors */}
        {fouten.length > 0 && (
          <div className="space-y-1.5">
            {fouten.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {waarschuwingen.length > 0 && (
          <div className="space-y-1.5">
            {waarschuwingen.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && isValid && !resultaat && (
          <ImportPreview headers={headers} rows={rows} type="bedrijfsdata" />
        )}

        {/* Import button + progress */}
        {isValid && rows.length > 0 && !resultaat && (
          <div className="space-y-3">
            {importing && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Bezig met importeren... {progress.current.toLocaleString('nl-NL')} / {progress.total.toLocaleString('nl-NL')} rijen</span>
                  <span>{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
                </div>
                <Progress value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} />
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={importing}
              className="bg-[#1A535C] hover:bg-[#1A535C]/90 text-white gap-2"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importeren...' : `Importeer ${rows.length.toLocaleString('nl-NL')} rijen`}
            </Button>
          </div>
        )}

        {/* Result */}
        {resultaat && <ImportResultaatComponent resultaat={resultaat} type="bedrijfsdata" />}

        {/* New import button */}
        {resultaat && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResultaat(null)
              setHeaders([])
              setRows([])
              setFileName('')
              setFouten([])
              setWaarschuwingen([])
              setIsValid(false)
              if (fileRef.current) fileRef.current.value = ''
            }}
          >
            Nieuw bestand uploaden
          </Button>
        )}

        <ImportHelp type="bedrijfsdata" />
      </CardContent>
    </Card>
  )
}
