import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Users,
  FolderKanban,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  parseCSV,
  parseContactpersonen,
  importKlanten,
  importActiviteiten,
  clearImportData,
  generateKlantenTemplate,
  generateActiviteitenTemplate,
} from '@/services/importService'
import type { CSVKlantRij, CSVActiviteitRij, ImportResultaat } from '@/types'
import { ImportAIChat } from './ImportAIChat'

type ImportStap = 'upload' | 'preview' | 'importing' | 'resultaat'

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function KlantenImportPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'klanten' | 'activiteiten'>('klanten')
  const [stap, setStap] = useState<ImportStap>('upload')
  const [klantenData, setKlantenData] = useState<CSVKlantRij[]>([])
  const [activiteitenData, setActiviteitenData] = useState<CSVActiviteitRij[]>([])
  const [resultaat, setResultaat] = useState<ImportResultaat | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [showVoorbeeld, setShowVoorbeeld] = useState(false)
  const [showAITip, setShowAITip] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStap('upload')
    setKlantenData([])
    setActiviteitenData([])
    setResultaat(null)
    setImporting(false)
    setProgress(0)
    setFileName('')
    setShowVoorbeeld(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleTabChange(value: string) {
    setActiveTab(value as 'klanten' | 'activiteiten')
    reset()
  }

  // ── File handling ──

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Alleen CSV bestanden zijn toegestaan')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bestand is te groot (max 10MB)')
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
        if (!rows[0].bedrijfsnaam && rows[0].bedrijfsnaam !== '') {
          toast.error('CSV mist verplichte kolom "bedrijfsnaam". Controleer de separator (;)')
          return
        }
        setKlantenData(rows)
      } else {
        const rows = parseCSV<CSVActiviteitRij>(text)
        if (rows.length === 0) {
          toast.error('Geen data gevonden in CSV bestand')
          return
        }
        if (!rows[0].bedrijfsnaam && rows[0].bedrijfsnaam !== '') {
          toast.error('CSV mist verplichte kolom "bedrijfsnaam". Controleer de separator (;)')
          return
        }
        setActiviteitenData(rows)
      }
      setStap('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // ── Import ──

  async function handleImport() {
    setImporting(true)
    setStap('importing')
    setProgress(10)

    try {
      let result: ImportResultaat
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 90))
      }, 200)

      if (activeTab === 'klanten') {
        result = await importKlanten(klantenData)
      } else {
        result = await importActiviteiten(activiteitenData)
      }

      clearInterval(interval)
      setProgress(100)
      setResultaat(result)
      setStap('resultaat')

      if (result.geimporteerd > 0) {
        toast.success(`${result.geimporteerd} ${activeTab === 'klanten' ? 'klanten' : 'activiteiten'} geimporteerd`)
      }
    } catch (error) {
      toast.error('Fout bij importeren: ' + (error instanceof Error ? error.message : 'Onbekende fout'))
      setStap('preview')
    } finally {
      setImporting(false)
    }
  }

  // ── Template download ──

  function handleDownloadTemplate() {
    if (activeTab === 'klanten') {
      downloadCSV('klanten_import_template.csv', generateKlantenTemplate())
    } else {
      downloadCSV('activiteiten_import_template.csv', generateActiviteitenTemplate())
    }
    toast.success('Template gedownload')
  }

  // ── Preview stats ──

  const previewData = activeTab === 'klanten' ? klantenData : activiteitenData
  const previewCount = previewData.length
  const previewHeaders = previewData.length > 0 ? Object.keys(previewData[0]) : []

  // Klanten-specific stats
  const klantenMetContacten = klantenData.filter((r) => r.contactpersonen?.trim()).length
  const totaalContacten = klantenData.reduce((sum, r) => {
    if (!r.contactpersonen?.trim()) return sum
    return sum + parseContactpersonen(r.contactpersonen).length
  }, 0)

  // Activiteiten-specific stats
  const aantalProjecten = activiteitenData.filter((r) => r.type?.toLowerCase().trim() === 'project').length
  const aantalOffertes = activiteitenData.filter((r) => r.type?.toLowerCase().trim() === 'offerte').length

  // Missende kolommen check
  const expectedKlantenKolommen = ['bedrijfsnaam', 'adres', 'postcode', 'plaats', 'telefoon', 'email', 'kvk_nummer', 'btw_nummer', 'omzet_totaal', 'accountmanager', 'status', 'klant_sinds', 'laatst_actief', 'aantal_projecten', 'aantal_offertes', 'offertes_akkoord', 'totaal_offertewaarde', 'contactpersonen']
  const expectedActiviteitenKolommen = ['bedrijfsnaam', 'datum', 'type', 'omschrijving', 'bedrag', 'status']
  const expectedKolommen = activeTab === 'klanten' ? expectedKlantenKolommen : expectedActiviteitenKolommen
  const missendeKolommen = expectedKolommen.filter((k) => !previewHeaders.includes(k))

  // Result - extract contact count from details
  const contactenGemaakt = resultaat?.fout_details.find((d) => d.startsWith('_contactpersonen:'))
  const contactCount = contactenGemaakt ? parseInt(contactenGemaakt.split(':')[1]) : 0
  const echteDetails = resultaat?.fout_details.filter((d) => !d.startsWith('_')) || []

  // ── Voorbeeld tabel data ──
  const voorbeeldKlanten = [
    { bedrijfsnaam: 'KWS vegetables Netherlands BV', adres: 'Middenweg 52', postcode: '1619 BN', plaats: 'ANDIJK', telefoon: '0228-591462', email: '', contactpersonen: '' },
    { bedrijfsnaam: 'Renolit Nederland B.V', adres: 'Kraanspoor 56', postcode: '1033SE', plaats: 'Amsterdam', telefoon: '0228-355 355', email: 'natasja.degraaf@renolit.com', contactpersonen: 'Broers - van Schaik, Rosemarie <roos.broers@renolit.com>, Dries Zwaan <dries.zwaan@renolit.com>' },
    { bedrijfsnaam: 'Tabor College', adres: 'Postbus 34', postcode: '1620 AA', plaats: 'Hoorn', telefoon: '0229 284 151', email: '', contactpersonen: 'Stef Macke <sj.macke@tabor.nl>, Peter Mol <pcj.mol@tabor.nl>' },
  ]
  const voorbeeldActiviteiten = [
    { bedrijfsnaam: 'WestCord hotel Jakarta', datum: '2025-10-02', type: 'project', omschrijving: 'Plaat douche', bedrag: '', status: '' },
    { bedrijfsnaam: 'WestCord hotel Jakarta', datum: '2025-10-02', type: 'offerte', omschrijving: 'Plaat douche', bedrag: '595.0', status: 'In afwachting' },
    { bedrijfsnaam: 'Renolit Nederland B.V', datum: '2026-01-08', type: 'offerte', omschrijving: 'Verlichte DOK nummers', bedrag: '3625.0', status: 'Akkoord' },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/klanten')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground font-display">Importeren</h1>
          <p className="text-sm text-muted-foreground">Importeer klanten, contactpersonen en activiteiten via CSV</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="klanten" className="gap-2">
            <Users className="w-4 h-4" />
            Klanten & Contacten
          </TabsTrigger>
          <TabsTrigger value="activiteiten" className="gap-2">
            <FolderKanban className="w-4 h-4" />
            Activiteiten
          </TabsTrigger>
        </TabsList>

        <TabsContent value="klanten" className="mt-6 space-y-4">
          {renderImportContent()}
        </TabsContent>
        <TabsContent value="activiteiten" className="mt-6 space-y-4">
          {renderImportContent()}
        </TabsContent>
      </Tabs>

      {/* AI Data Assistent */}
      <Card>
        <CardContent className="p-0">
          <ImportAIChat />
        </CardContent>
      </Card>
    </div>
  )

  function renderImportContent() {
    return (
      <>
        {/* Stap 1: Template + Upload */}
        {stap === 'upload' && (
          <div className="space-y-4">
            {/* Template download + voorbeeld + wis data */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download template
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoorbeeld(!showVoorbeeld)}
              >
                {showVoorbeeld ? 'Verberg' : 'Bekijk'} voorbeeld
                {showVoorbeeld ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 ml-auto"
                onClick={() => {
                  const verwijderd = clearImportData()
                  toast.success(`Importdata gewist (${verwijderd} keys verwijderd)`)
                }}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Wis alle importdata
              </Button>
            </div>

            {/* Voorbeeld tabel */}
            {showVoorbeeld && (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          {Object.keys(activeTab === 'klanten' ? voorbeeldKlanten[0] : voorbeeldActiviteiten[0]).map((key) => (
                            <th key={key} className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-label text-[#8a8680] whitespace-nowrap">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {(activeTab === 'klanten' ? voorbeeldKlanten : voorbeeldActiviteiten).map((row, i) => (
                          <tr key={i} className="hover:bg-muted/20">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                                {val || <span className="text-muted-foreground">-</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Tip */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <button
                onClick={() => setShowAITip(!showAITip)}
                className="flex items-center gap-2 w-full text-left"
              >
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Data uit een ander systeem (Exact, James PRO, Pipedrive)?
                </span>
                {showAITip ? <ChevronUp className="w-4 h-4 text-blue-600 ml-auto" /> : <ChevronDown className="w-4 h-4 text-blue-600 ml-auto" />}
              </button>
              {showAITip && (
                <div className="mt-3 text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <p>1. Exporteer je {activeTab === 'klanten' ? 'klanten' : 'projecten/offertes'} als CSV of Excel</p>
                  <p>2. Open ChatGPT, Claude of Gemini en stuur:</p>
                  <pre className="bg-blue-100 dark:bg-blue-900/50 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap mt-1">
                    {activeTab === 'klanten'
                      ? `"Converteer dit bestand naar CSV met puntkomma (;) als separator.
Gebruik exact deze kolommen:
bedrijfsnaam;adres;postcode;plaats;telefoon;email;kvk_nummer;btw_nummer;omzet_totaal;accountmanager;status;klant_sinds;laatst_actief;aantal_projecten;aantal_offertes;offertes_akkoord;totaal_offertewaarde;contactpersonen
Regels:
- Alleen bedrijfsnaam is verplicht, rest mag leeg
- Datums in JJJJ-MM-DD format
- Bedragen als getal met punt als decimaal (1500.50), geen \u20AC-teken
- status = 'actief' of 'inactief'
- contactpersonen per bedrijf als: Naam <email> telefoon, Naam <email>
  Scheid meerdere contacten met komma-spatie"`
                      : `"Converteer dit bestand naar CSV met puntkomma (;) als separator.
Gebruik exact deze kolommen:
bedrijfsnaam;datum;type;omschrijving;bedrag;status
Regels:
- E\u00E9n rij per project of offerte
- bedrijfsnaam = exact de naam zoals in mijn klantendatabase
- datum = JJJJ-MM-DD
- type = 'project' of 'offerte'
- omschrijving = wat is er gedaan
- bedrag = getal (alleen bij offertes, leeg bij projecten)
- status = 'Akkoord', 'In afwachting' of 'Niet akkoord' (alleen bij offertes)"`
                    }
                  </pre>
                  <p>3. Upload het resultaat hier</p>
                </div>
              )}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                Sleep een CSV bestand hierheen of klik om te selecteren
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Alleen .csv bestanden, max 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

        {/* Stap 2: Preview */}
        {stap === 'preview' && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-2 flex-wrap">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{fileName}</span>
              <Badge variant="secondary" className="text-xs">{previewCount} rijen gevonden</Badge>
              <Badge variant="secondary" className="text-xs">{previewHeaders.length} kolommen herkend</Badge>
            </div>

            {/* Extra stats */}
            {activeTab === 'klanten' && (
              <p className="text-sm text-muted-foreground">
                Waarvan {klantenMetContacten} met contactpersonen (totaal {totaalContacten} contacten)
              </p>
            )}
            {activeTab === 'activiteiten' && (
              <p className="text-sm text-muted-foreground">
                {aantalProjecten} projecten, {aantalOffertes} offertes
              </p>
            )}

            {/* Missing columns warning */}
            {missendeKolommen.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Missende kolommen</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    {missendeKolommen.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Preview table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                      <tr className="border-b">
                        <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-label text-[#8a8680]">#</th>
                        {previewHeaders.map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-label text-[#8a8680] whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {previewData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          {previewHeaders.map((h) => (
                            <td key={h} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                              {(row as unknown as Record<string, string>)[h] || <span className="text-muted-foreground">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewCount > 5 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
                      ... en {previewCount - 5} meer rijen
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={reset}>
                Terug
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                <Upload className="w-4 h-4 mr-2" />
                Importeer {previewCount} {activeTab === 'klanten' ? 'klanten' : 'activiteiten'}
              </Button>
            </div>
          </div>
        )}

        {/* Stap 3: Importing */}
        {stap === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">
              {activeTab === 'klanten' ? 'Klanten' : 'Activiteiten'} importeren...
            </p>
            <p className="text-xs text-muted-foreground">
              {previewCount} rijen verwerken
            </p>
            <Progress value={progress} className="w-64" />
          </div>
        )}

        {/* Stap 4: Resultaat */}
        {stap === 'resultaat' && resultaat && (
          <div className="space-y-4">
            {/* Success banner */}
            {resultaat.geimporteerd > 0 && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  {resultaat.geimporteerd} {activeTab === 'klanten' ? 'klanten' : 'activiteiten'} geimporteerd
                  {activeTab === 'klanten' && contactCount > 0 && `, ${contactCount} contactpersonen aangemaakt`}
                  {resultaat.overgeslagen > 0 && `, ${resultaat.overgeslagen} overgeslagen`}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">{resultaat.geimporteerd}</p>
                  <p className="text-xs text-green-600 dark:text-green-500">Geimporteerd</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600" />
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

            {/* Error details */}
            {echteDetails.length > 0 && (
              <details className="border rounded-lg">
                <summary className="px-3 py-2 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50">
                  Foutdetails ({echteDetails.length})
                </summary>
                <div className="px-3 pb-3 space-y-1 max-h-48 overflow-y-auto">
                  {echteDetails.map((fout, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">{fout}</p>
                  ))}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={reset}>
                Nog een bestand importeren
              </Button>
              <Button onClick={() => navigate('/klanten')}>
                Bekijk klanten
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }
}
