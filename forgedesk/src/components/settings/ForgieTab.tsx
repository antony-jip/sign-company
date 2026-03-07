import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Upload, Trash2, Save, FileText, Loader2, CheckCircle2, Bot } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { toast } from 'sonner'
import {
  importCsvToForgie,
  getForgieImports,
  deleteForgieImport,
  type ForgieImport,
} from '@/services/forgieChatService'

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Detect delimiter
  const firstLine = lines[0]
  const delimiter = firstLine.includes(';') ? ';' : ','

  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, j) => {
      if (h) row[h] = values[j] || ''
    })
    rows.push(row)
  }

  return rows
}

export function ForgieTab() {
  const { user } = useAuth()
  const { settings, updateSettings } = useAppSettings()
  const [bedrijfscontext, setBedrijfscontext] = useState(settings.forgie_bedrijfscontext || '')
  const [saving, setSaving] = useState(false)
  const [imports, setImports] = useState<ForgieImport[]>([])
  const [loadingImports, setLoadingImports] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [previewData, setPreviewData] = useState<{ name: string; rows: Array<Record<string, string>>; headers: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBedrijfscontext(settings.forgie_bedrijfscontext || '')
  }, [settings.forgie_bedrijfscontext])

  useEffect(() => {
    loadImports()
  }, [])

  const loadImports = useCallback(async () => {
    setLoadingImports(true)
    try {
      const data = await getForgieImports()
      setImports(data)
    } catch {
      // ignore
    } finally {
      setLoadingImports(false)
    }
  }, [])

  const handleSaveContext = useCallback(async () => {
    setSaving(true)
    try {
      await updateSettings({ forgie_bedrijfscontext: bedrijfscontext })
      toast.success('Bedrijfscontext opgeslagen')
    } catch {
      toast.error('Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }, [bedrijfscontext, updateSettings, settings])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return

      const rows = parseCsv(text)
      if (rows.length === 0) {
        toast.error('Geen data gevonden in het bestand')
        return
      }

      const headers = Object.keys(rows[0])
      setPreviewData({ name: file.name, rows, headers })
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleImport = useCallback(async () => {
    if (!previewData) return
    setUploading(true)
    try {
      const result = await importCsvToForgie(previewData.name, previewData.rows)
      toast.success(`${result.count} rijen geïmporteerd`)
      setPreviewData(null)
      loadImports()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import mislukt')
    } finally {
      setUploading(false)
    }
  }, [previewData, loadImports])

  const handleDeleteImport = useCallback(async (bestandsnaam: string) => {
    try {
      await deleteForgieImport(bestandsnaam)
      toast.success('Import verwijderd')
      loadImports()
    } catch {
      toast.error('Verwijderen mislukt')
    }
  }, [loadImports])

  const handleToggleForgie = useCallback(async (enabled: boolean) => {
    try {
      await updateSettings({ forgie_enabled: enabled })
      toast.success(enabled ? 'Forgie ingeschakeld' : 'Forgie uitgeschakeld')
    } catch {
      toast.error('Instelling opslaan mislukt')
    }
  }, [updateSettings])

  return (
    <div className="space-y-6">
      {/* Forgie aan/uit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forgie assistent</CardTitle>
          <CardDescription>
            Schakel de Forgie AI-assistent in of uit. Wanneer uitgeschakeld wordt het vosje niet meer getoond.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="forgie-toggle" className="flex items-center gap-2 cursor-pointer">
              <Bot className="w-4 h-4 text-muted-foreground" />
              <span>Forgie tonen</span>
            </Label>
            <Switch
              id="forgie-toggle"
              checked={settings.forgie_enabled ?? true}
              onCheckedChange={handleToggleForgie}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bedrijfscontext */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bedrijfscontext</CardTitle>
          <CardDescription>
            Vertel Forgie over je bedrijf. Deze informatie wordt meegegeven bij elke vraag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={bedrijfscontext}
            onChange={e => setBedrijfscontext(e.target.value.slice(0, 500))}
            placeholder="Bijv: Wij zijn een signbedrijf in Enkhuizen, gespecialiseerd in lichtreclames en gevelbelettering. We werken met 4 monteurs."
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {bedrijfscontext.length}/500 tekens
            </span>
            <Button
              size="sm"
              onClick={handleSaveContext}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bedrijfshistorie importeren</CardTitle>
          <CardDescription>
            Upload een CSV bestand met je oude bedrijfsdata. Forgie kan dan vragen beantwoorden over je hele historie — ook van voor FORGEdesk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              CSV uploaden
            </Button>
          </div>

          {/* Preview */}
          {previewData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{previewData.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {previewData.rows.length} rijen
                </Badge>
              </div>

              {/* Preview table */}
              <div className="border rounded-lg overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {previewData.headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {previewData.headers.map(h => (
                          <td key={h} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {previewData.rows.length > 5 && (
                      <tr className="border-t">
                        <td colSpan={previewData.headers.length} className="px-3 py-1.5 text-muted-foreground italic">
                          ...en nog {previewData.rows.length - 5} rijen meer
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={uploading}
                  className="gap-1.5"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Importeren
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewData(null)}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          )}

          {/* Imported files list */}
          {loadingImports ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Imports laden...
            </div>
          ) : imports.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Geïmporteerde bestanden
              </p>
              {imports.map(imp => (
                <div
                  key={imp.bestandsnaam}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{imp.bestandsnaam}</p>
                      <p className="text-xs text-muted-foreground">
                        {imp.count} rijen &middot; {new Date(imp.created_at).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 flex-shrink-0"
                    onClick={() => handleDeleteImport(imp.bestandsnaam)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Nog geen bestanden geïmporteerd.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
