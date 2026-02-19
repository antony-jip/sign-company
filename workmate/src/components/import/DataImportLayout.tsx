import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Upload,
  FileText,
  Users,
  Mail,
  AlertCircle,
  CheckCircle2,
  Download,
  Trash2,
  ArrowRight,
  Loader2,
  Table,
  X,
  FileSpreadsheet,
  Info,
} from 'lucide-react'
import { createKlant } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Klant } from '@/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ImportType = 'klanten' | 'contactpersonen' | 'emailadressen'

type ImportStep = 'select-type' | 'upload' | 'mapping' | 'preview' | 'importing' | 'result'

interface FieldMapping {
  csvColumn: string
  targetField: string
}

interface ImportResult {
  total: number
  success: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

// ---------------------------------------------------------------------------
// Target field definitions per import type
// ---------------------------------------------------------------------------

const TARGET_FIELDS: Record<ImportType, Array<{ value: string; label: string; required?: boolean }>> = {
  klanten: [
    { value: 'bedrijfsnaam', label: 'Bedrijfsnaam', required: true },
    { value: 'contactpersoon', label: 'Contactpersoon' },
    { value: 'email', label: 'E-mailadres' },
    { value: 'telefoon', label: 'Telefoon' },
    { value: 'adres', label: 'Adres' },
    { value: 'postcode', label: 'Postcode' },
    { value: 'stad', label: 'Stad' },
    { value: 'land', label: 'Land' },
    { value: 'website', label: 'Website' },
    { value: 'kvk_nummer', label: 'KVK-nummer' },
    { value: 'btw_nummer', label: 'BTW-nummer' },
    { value: 'status', label: 'Status' },
    { value: 'notities', label: 'Notities' },
  ],
  contactpersonen: [
    { value: 'contactpersoon', label: 'Naam contactpersoon', required: true },
    { value: 'email', label: 'E-mailadres' },
    { value: 'telefoon', label: 'Telefoon' },
    { value: 'bedrijfsnaam', label: 'Bedrijfsnaam' },
    { value: 'adres', label: 'Adres' },
    { value: 'postcode', label: 'Postcode' },
    { value: 'stad', label: 'Stad' },
    { value: 'notities', label: 'Notities' },
  ],
  emailadressen: [
    { value: 'email', label: 'E-mailadres', required: true },
    { value: 'naam', label: 'Naam' },
    { value: 'bedrijfsnaam', label: 'Bedrijfsnaam' },
  ],
}

// ---------------------------------------------------------------------------
// Auto-detect mapping based on common Dutch / English header names
// ---------------------------------------------------------------------------

const AUTO_DETECT_MAP: Record<string, string> = {
  email: 'email',
  'e-mail': 'email',
  emailadres: 'email',
  'e-mailadres': 'email',
  mail: 'email',
  naam: 'contactpersoon',
  name: 'contactpersoon',
  contactpersoon: 'contactpersoon',
  contact: 'contactpersoon',
  telefoon: 'telefoon',
  phone: 'telefoon',
  tel: 'telefoon',
  telefoonnummer: 'telefoon',
  bedrijf: 'bedrijfsnaam',
  bedrijfsnaam: 'bedrijfsnaam',
  company: 'bedrijfsnaam',
  adres: 'adres',
  address: 'adres',
  straat: 'adres',
  stad: 'stad',
  city: 'stad',
  plaats: 'stad',
  woonplaats: 'stad',
  postcode: 'postcode',
  'postal code': 'postcode',
  zip: 'postcode',
  zipcode: 'postcode',
  land: 'land',
  country: 'land',
  website: 'website',
  site: 'website',
  url: 'website',
  kvk: 'kvk_nummer',
  'kvk-nummer': 'kvk_nummer',
  kvk_nummer: 'kvk_nummer',
  btw: 'btw_nummer',
  'btw-nummer': 'btw_nummer',
  btw_nummer: 'btw_nummer',
  status: 'status',
  notities: 'notities',
  opmerkingen: 'notities',
  notes: 'notities',
}

// ---------------------------------------------------------------------------
// CSV Template definitions
// ---------------------------------------------------------------------------

const CSV_TEMPLATES: Record<ImportType, { headers: string[]; sampleRow: string[] }> = {
  klanten: {
    headers: ['bedrijfsnaam', 'contactpersoon', 'email', 'telefoon', 'adres', 'postcode', 'stad', 'land'],
    sampleRow: ['Voorbeeld BV', 'Jan de Vries', 'jan@voorbeeld.nl', '020-1234567', 'Keizersgracht 100', '1015 AA', 'Amsterdam', 'Nederland'],
  },
  contactpersonen: {
    headers: ['contactpersoon', 'email', 'telefoon', 'bedrijfsnaam', 'adres', 'postcode', 'stad'],
    sampleRow: ['Piet Jansen', 'piet@bedrijf.nl', '030-7654321', 'Bedrijf BV', 'Oudegracht 50', '3511 AB', 'Utrecht'],
  },
  emailadressen: {
    headers: ['email', 'naam', 'bedrijfsnaam'],
    sampleRow: ['info@voorbeeld.nl', 'Jan de Vries', 'Voorbeeld BV'],
  },
}

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      row.push(current.trim())
      current = ''
    } else if (char === '\n' && !inQuotes) {
      row.push(current.trim())
      if (row.some((cell) => cell !== '')) rows.push(row)
      row = []
      current = ''
    } else if (char !== '\r') {
      current += char
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim())
    if (row.some((cell) => cell !== '')) rows.push(row)
  }
  return rows
}

// ---------------------------------------------------------------------------
// Helper: download a CSV string as a file
// ---------------------------------------------------------------------------

function downloadCSV(filename: string, headers: string[], sampleRow: string[]) {
  const csvContent = [headers.join(';'), sampleRow.join(';')].join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataImportLayout() {
  const { user } = useAuth()
  // State
  const [step, setStep] = useState<ImportStep>('select-type')
  const [importType, setImportType] = useState<ImportType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derived
  const dataRows = firstRowIsHeader ? parsedData.slice(1) : parsedData
  const displayHeaders = firstRowIsHeader && parsedData.length > 0 ? parsedData[0] : headers

  // -------------------------------------------------------------------------
  // Import type selection
  // -------------------------------------------------------------------------

  function handleSelectType(type: ImportType) {
    setImportType(type)
    setStep('upload')
    resetFileState()
  }

  function resetFileState() {
    setFile(null)
    setParsedData([])
    setHeaders([])
    setMappings([])
    setParseError(null)
    setImportResult(null)
    setFirstRowIsHeader(true)
  }

  function handleReset() {
    setStep('select-type')
    setImportType(null)
    resetFileState()
  }

  // -------------------------------------------------------------------------
  // File handling
  // -------------------------------------------------------------------------

  function processFile(f: File) {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setParseError('Alleen CSV-bestanden zijn toegestaan.')
      return
    }
    setFile(f)
    setParseError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        if (!text || text.trim().length === 0) {
          setParseError('Het bestand is leeg.')
          return
        }
        const rows = parseCSV(text)
        if (rows.length < 2) {
          setParseError('Het bestand bevat onvoldoende gegevens (minimaal een kopregel en een datarij vereist).')
          return
        }
        setParsedData(rows)

        // Auto-detect mappings
        const csvHeaders = rows[0]
        setHeaders(csvHeaders)
        const targetFields = importType ? TARGET_FIELDS[importType] : []
        const autoMappings: FieldMapping[] = csvHeaders.map((header) => {
          const normalised = header.toLowerCase().replace(/[^a-z0-9\-_]/g, '')
          const detectedField = AUTO_DETECT_MAP[normalised]
          const isValidTarget = detectedField && targetFields.some((tf) => tf.value === detectedField)
          return {
            csvColumn: header,
            targetField: isValidTarget ? detectedField : '',
          }
        })
        setMappings(autoMappings)
        setStep('mapping')
      } catch {
        setParseError('Er is een fout opgetreden bij het verwerken van het bestand.')
      }
    }
    reader.onerror = () => {
      setParseError('Kan het bestand niet lezen.')
    }
    reader.readAsText(f)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) processFile(droppedFile)
    },
    [importType],
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) processFile(selectedFile)
  }

  // -------------------------------------------------------------------------
  // Mapping
  // -------------------------------------------------------------------------

  function updateMapping(csvColumn: string, targetField: string) {
    setMappings((prev) =>
      prev.map((m) => (m.csvColumn === csvColumn ? { ...m, targetField } : m)),
    )
  }

  function getActiveMappings(): FieldMapping[] {
    return mappings.filter((m) => m.targetField !== '')
  }

  function getMappingValidationErrors(): string[] {
    if (!importType) return []
    const errors: string[] = []
    const requiredFields = TARGET_FIELDS[importType].filter((f) => f.required)
    const mappedTargets = getActiveMappings().map((m) => m.targetField)

    for (const rf of requiredFields) {
      if (!mappedTargets.includes(rf.value)) {
        errors.push(`Verplicht veld "${rf.label}" is niet gekoppeld.`)
      }
    }

    // Check for duplicate target field mappings
    const seen = new Set<string>()
    for (const target of mappedTargets) {
      if (seen.has(target)) {
        const fieldLabel = TARGET_FIELDS[importType].find((f) => f.value === target)?.label ?? target
        errors.push(`Veld "${fieldLabel}" is meer dan eens gekoppeld.`)
        break
      }
      seen.add(target)
    }

    return errors
  }

  // -------------------------------------------------------------------------
  // Preview data
  // -------------------------------------------------------------------------

  function getPreviewRows(): Record<string, string>[] {
    const active = getActiveMappings()
    return dataRows.slice(0, 5).map((row) => {
      const mapped: Record<string, string> = {}
      for (const m of active) {
        const colIndex = displayHeaders.indexOf(m.csvColumn)
        if (colIndex >= 0 && colIndex < row.length) {
          mapped[m.targetField] = row[colIndex]
        }
      }
      return mapped
    })
  }

  // -------------------------------------------------------------------------
  // Import execution
  // -------------------------------------------------------------------------

  async function handleImport() {
    if (!importType) return
    setStep('importing')

    const active = getActiveMappings()
    const result: ImportResult = { total: dataRows.length, success: 0, failed: 0, errors: [] }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const mapped: Record<string, string> = {}
      for (const m of active) {
        const colIndex = displayHeaders.indexOf(m.csvColumn)
        if (colIndex >= 0 && colIndex < row.length) {
          mapped[m.targetField] = row[colIndex]
        }
      }

      try {
        if (importType === 'klanten' || importType === 'contactpersonen') {
          await createKlant({
            user_id: user?.id || '',
            bedrijfsnaam: mapped.bedrijfsnaam || '',
            contactpersoon: mapped.contactpersoon || '',
            email: mapped.email || '',
            telefoon: mapped.telefoon || '',
            adres: mapped.adres || '',
            postcode: mapped.postcode || '',
            stad: mapped.stad || '',
            land: mapped.land || 'Nederland',
            website: mapped.website || '',
            kvk_nummer: mapped.kvk_nummer || '',
            btw_nummer: mapped.btw_nummer || '',
            status: (['actief', 'inactief', 'prospect'].includes(mapped.status) ? mapped.status : 'prospect') as Klant['status'],
            tags: [],
            notities: mapped.notities || '',
            contactpersonen: [],
          })
          result.success++
        } else if (importType === 'emailadressen') {
          if (!mapped.email) {
            result.failed++
            result.errors.push({ row: i + 1, message: 'Geen e-mailadres opgegeven.' })
            continue
          }
          // Import email addresses as contacts (Klant records) with prospect status
          await createKlant({
            user_id: user?.id || '',
            bedrijfsnaam: mapped.bedrijfsnaam || '',
            contactpersoon: mapped.naam || '',
            email: mapped.email,
            telefoon: '',
            adres: '',
            postcode: '',
            stad: '',
            land: 'Nederland',
            website: '',
            kvk_nummer: '',
            btw_nummer: '',
            status: 'prospect',
            tags: ['import', 'emaillijst'],
            notities: 'Geimporteerd via e-mailadres import',
            contactpersonen: [],
          })
          result.success++
        }
      } catch (err) {
        result.failed++
        const message = err instanceof Error ? err.message : 'Onbekende fout'
        result.errors.push({ row: i + 1, message })
      }
    }

    setImportResult(result)
    setStep('result')
  }

  // -------------------------------------------------------------------------
  // Template download
  // -------------------------------------------------------------------------

  function handleDownloadTemplate() {
    if (!importType) return
    const template = CSV_TEMPLATES[importType]
    const typeLabel = importType === 'klanten' ? 'klanten' : importType === 'contactpersonen' ? 'contactpersonen' : 'emailadressen'
    downloadCSV(`${typeLabel}_template.csv`, template.headers, template.sampleRow)
  }

  // -------------------------------------------------------------------------
  // Format file size
  // -------------------------------------------------------------------------

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // -------------------------------------------------------------------------
  // Render: step indicators
  // -------------------------------------------------------------------------

  function renderStepIndicator() {
    const steps = [
      { key: 'select-type', label: 'Type kiezen' },
      { key: 'upload', label: 'Bestand uploaden' },
      { key: 'mapping', label: 'Velden koppelen' },
      { key: 'preview', label: 'Controleren' },
    ]

    const currentIndex = steps.findIndex((s) => s.key === step) ?? 0
    const effectiveIndex = step === 'importing' || step === 'result' ? 3 : currentIndex

    return (
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                i <= effectiveIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {i < effectiveIndex ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                'text-sm hidden sm:inline',
                i <= effectiveIndex ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
            )}
          </div>
        ))}
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: type selection step
  // -------------------------------------------------------------------------

  function renderTypeSelection() {
    const types: Array<{ type: ImportType; icon: typeof Users; title: string; description: string }> = [
      {
        type: 'klanten',
        icon: Users,
        title: 'Klanten',
        description: 'Importeer bedrijven en klantgegevens inclusief adres, contactpersoon en KVK-nummer.',
      },
      {
        type: 'contactpersonen',
        icon: FileText,
        title: 'Contactpersonen',
        description: 'Importeer individuele contactpersonen met naam, e-mail en telefoonnummer.',
      },
      {
        type: 'emailadressen',
        icon: Mail,
        title: 'E-mailadressen',
        description: 'Importeer een lijst met e-mailadressen voor mailings en communicatie.',
      },
    ]

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Wat wilt u importeren?</h3>
          <p className="text-sm text-muted-foreground">
            Kies het type gegevens dat u wilt importeren.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {types.map(({ type, icon: Icon, title, description }) => (
            <Card
              key={type}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                importType === type && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => handleSelectType(type)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: upload step
  // -------------------------------------------------------------------------

  function renderUpload() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">CSV-bestand uploaden</h3>
            <p className="text-sm text-muted-foreground">
              Upload een CSV-bestand met uw{' '}
              {importType === 'klanten'
                ? 'klantgegevens'
                : importType === 'contactpersonen'
                  ? 'contactpersonen'
                  : 'e-mailadressen'}
              .
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Template downloaden
          </Button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          )}
        >
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Sleep een CSV-bestand hierheen of klik om te bladeren
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Alleen .csv bestanden worden geaccepteerd
              </p>
            </div>
          </div>
        </div>

        {/* File info */}
        {file && !parseError && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                resetFileState()
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Fout bij verwerken</p>
              <p className="text-sm">{parseError}</p>
            </div>
          </div>
        )}

        {/* Template info */}
        {importType && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Tip</p>
              <p className="text-sm">
                Gebruik de &quot;Template downloaden&quot; knop om een voorbeeldbestand te
                downloaden met de juiste kolomindeling voor{' '}
                {importType === 'klanten'
                  ? 'klanten'
                  : importType === 'contactpersonen'
                    ? 'contactpersonen'
                    : 'e-mailadressen'}
                .
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={handleReset}>
            Terug
          </Button>
          <div />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: mapping step
  // -------------------------------------------------------------------------

  function renderMapping() {
    if (!importType) return null
    const targetFields = TARGET_FIELDS[importType]
    const validationErrors = getMappingValidationErrors()

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Velden koppelen</h3>
          <p className="text-sm text-muted-foreground">
            Koppel de kolommen uit uw CSV-bestand aan de juiste velden. Automatisch herkende
            koppelingen zijn al ingevuld.
          </p>
        </div>

        {/* First row is header checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="first-row-header"
            checked={firstRowIsHeader}
            onCheckedChange={(checked) => setFirstRowIsHeader(checked === true)}
          />
          <Label htmlFor="first-row-header" className="text-sm">
            Eerste rij bevat kolomnamen
          </Label>
        </div>

        {/* File info */}
        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            <span>
              {file.name} &mdash; {dataRows.length} rij{dataRows.length !== 1 ? 'en' : ''} gevonden
            </span>
          </div>
        )}

        {/* Mapping table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">CSV-kolom</th>
                    <th className="text-left p-3 font-medium">Voorbeeld data</th>
                    <th className="text-left p-3 font-medium">Koppelen aan</th>
                  </tr>
                </thead>
                <tbody>
                  {displayHeaders.map((header, idx) => {
                    const mapping = mappings.find((m) => m.csvColumn === header)
                    const previewValues = dataRows
                      .slice(0, 3)
                      .map((row) => row[idx] || '')
                      .filter(Boolean)

                    return (
                      <tr key={`${header}-${idx}`} className="border-b last:border-b-0">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">{header || `Kolom ${idx + 1}`}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {previewValues.length > 0 ? (
                              previewValues.map((val, vi) => (
                                <Badge key={vi} variant="secondary" className="text-xs font-normal max-w-[200px] truncate">
                                  {val}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic">Geen data</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Select
                            value={mapping?.targetField || '_none'}
                            onValueChange={(value) => updateMapping(header, value === '_none' ? '' : value)}
                          >
                            <SelectTrigger className="w-[220px]">
                              <SelectValue placeholder="-- Niet koppelen --" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">-- Niet koppelen --</SelectItem>
                              {targetFields.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                  {field.required ? ' *' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-sm">{err}</p>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep('upload')}>
            Terug
          </Button>
          <Button
            onClick={() => setStep('preview')}
            disabled={validationErrors.length > 0 || getActiveMappings().length === 0}
          >
            Volgende
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: preview step
  // -------------------------------------------------------------------------

  function renderPreview() {
    if (!importType) return null
    const previewRows = getPreviewRows()
    const activeFields = getActiveMappings().map((m) => m.targetField)
    const targetFields = TARGET_FIELDS[importType]

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Controleren en importeren</h3>
          <p className="text-sm text-muted-foreground">
            Controleer de gekoppelde gegevens hieronder. De eerste {Math.min(5, dataRows.length)} van{' '}
            {dataRows.length} rij{dataRows.length !== 1 ? 'en' : ''} worden getoond.
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <Table className="h-3 w-3 mr-1" />
            {dataRows.length} rij{dataRows.length !== 1 ? 'en' : ''}
          </Badge>
          <Badge variant="outline">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {activeFields.length} veld{activeFields.length !== 1 ? 'en' : ''} gekoppeld
          </Badge>
          <Badge variant="secondary">
            {importType === 'klanten'
              ? 'Klanten'
              : importType === 'contactpersonen'
                ? 'Contactpersonen'
                : 'E-mailadressen'}
          </Badge>
        </div>

        {/* Preview table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground w-12">#</th>
                    {activeFields.map((field) => {
                      const fieldDef = targetFields.find((f) => f.value === field)
                      return (
                        <th key={field} className="text-left p-3 font-medium">
                          {fieldDef?.label ?? field}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length > 0 ? (
                    previewRows.map((row, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        {activeFields.map((field) => (
                          <td key={field} className="p-3 max-w-[250px] truncate">
                            {row[field] || (
                              <span className="text-muted-foreground italic">Leeg</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={activeFields.length + 1}
                        className="p-6 text-center text-muted-foreground"
                      >
                        Geen gegevens om weer te geven.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {dataRows.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            ... en nog {dataRows.length - 5} andere rij{dataRows.length - 5 !== 1 ? 'en' : ''}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep('mapping')}>
            Terug
          </Button>
          <Button onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            {dataRows.length} rij{dataRows.length !== 1 ? 'en' : ''} importeren
          </Button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: importing step
  // -------------------------------------------------------------------------

  function renderImporting() {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-lg font-semibold">Gegevens worden geimporteerd...</p>
          <p className="text-sm text-muted-foreground mt-1">
            {dataRows.length} rij{dataRows.length !== 1 ? 'en' : ''} worden verwerkt. Even
            geduld a.u.b.
          </p>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: result step
  // -------------------------------------------------------------------------

  function renderResult() {
    if (!importResult) return null
    const hasErrors = importResult.failed > 0
    const allFailed = importResult.success === 0 && importResult.failed > 0

    return (
      <div className="space-y-4">
        {/* Summary card */}
        <Card
          className={cn(
            'border-2',
            allFailed
              ? 'border-destructive/50 bg-destructive/5'
              : hasErrors
                ? 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20'
                : 'border-green-500/50 bg-green-50 dark:bg-green-950/20',
          )}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full',
                  allFailed
                    ? 'bg-destructive/10'
                    : hasErrors
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-green-100 dark:bg-green-900/30',
                )}
              >
                {allFailed ? (
                  <X className="h-6 w-6 text-destructive" />
                ) : hasErrors ? (
                  <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {allFailed
                    ? 'Import mislukt'
                    : hasErrors
                      ? 'Import voltooid met fouten'
                      : 'Import succesvol afgerond'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.success} van {importResult.total} rij
                  {importResult.total !== 1 ? 'en' : ''} succesvol geimporteerd.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 bg-background rounded-lg border">
                <p className="text-2xl font-bold">{importResult.total}</p>
                <p className="text-xs text-muted-foreground">Totaal</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg border">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importResult.success}
                </p>
                <p className="text-xs text-muted-foreground">Gelukt</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg border">
                <p
                  className={cn(
                    'text-2xl font-bold',
                    importResult.failed > 0
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  {importResult.failed}
                </p>
                <p className="text-xs text-muted-foreground">Mislukt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error details */}
        {importResult.errors.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Foutdetails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {importResult.errors.map((error, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 bg-destructive/5 rounded text-sm border border-destructive/10"
                  >
                    <Badge variant="destructive" className="text-xs flex-shrink-0">
                      Rij {error.row}
                    </Badge>
                    <span className="text-muted-foreground">{error.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={handleReset}>
            Nieuwe import starten
          </Button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Upload className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Data Importeren</h1>
        </div>
        <p className="text-muted-foreground">
          Importeer klanten, contacten en andere gegevens vanuit CSV bestanden
        </p>
      </div>

      <Separator />

      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Step content */}
      {step === 'select-type' && renderTypeSelection()}
      {step === 'upload' && renderUpload()}
      {step === 'mapping' && renderMapping()}
      {step === 'preview' && renderPreview()}
      {step === 'importing' && renderImporting()}
      {step === 'result' && renderResult()}
    </div>
  )
}
