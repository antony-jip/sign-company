import React, { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { ImportUploadZone } from './ImportUploadZone'
import { ImportPreview } from './ImportPreview'
import { ImportProgress } from './ImportProgress'
import { buildSamenvatting, type ParseResult, type ImportData, type ImportSamenvatting, type ImportResultaat } from '@/services/universalImportService'
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'

type Stap = 1 | 2 | 3
import { Users, FolderOpen, FileText, Receipt } from 'lucide-react'

export function ImportWizard() {
  const { user } = useAuth()
  const [stap, setStap] = useState<Stap>(1)

  // Parsed data per type
  const [parsedData, setParsedData] = useState<ImportData>({
    klanten: [],
    projecten: [],
    offertes: [],
    facturen: [],
  })
  const [fileCounts, setFileCounts] = useState({ klanten: 0, projecten: 0, offertes: 0, facturen: 0 })
  const [samenvatting, setSamenvatting] = useState<ImportSamenvatting | null>(null)

  const totalFiles = Object.values(fileCounts).filter(c => c > 0).length

  const handleParsed = useCallback((result: ParseResult) => {
    setParsedData(prev => ({ ...prev, [result.type]: result.rows }))
    setFileCounts(prev => ({ ...prev, [result.type]: result.count }))
  }, [])

  const handleVolgende = useCallback(() => {
    if (stap === 1) {
      const sam = buildSamenvatting(parsedData)
      setSamenvatting(sam)
      setStap(2)
    } else if (stap === 2) {
      setStap(3)
    }
  }, [stap, parsedData])

  const handleTerug = useCallback(() => {
    if (stap === 2) setStap(1)
  }, [stap])

  const handleComplete = useCallback((_result: ImportResultaat) => {
    // Result is shown in ImportProgress component
  }, [])

  const stepLabels = ['Bestanden uploaden', 'Controleren', 'Importeren']

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Data importeren</h1>
        <p className="text-sm text-muted-foreground mt-1">Importeer je klanten, projecten, offertes en facturen vanuit CSV of Excel</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => {
          const stepNum = (i + 1) as Stap
          const isActive = stepNum === stap
          const isDone = stepNum < stap
          return (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
              <Badge
                variant={isActive ? 'default' : 'secondary'}
                className={`text-[10px] ${isDone ? 'bg-green-100 text-green-700 border-green-200' : ''}`}
              >
                {label}
              </Badge>
            </React.Fragment>
          )
        })}
      </div>

      {/* Stap 1: Upload bestanden */}
      {stap === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImportUploadZone
              type="klanten"
              label="Klanten"
              icon={Users}
              accept=".csv,.xls,.xlsx"
              onParsed={handleParsed}
            />
            <ImportUploadZone
              type="projecten"
              label="Projecten"
              icon={FolderOpen}
              accept=".csv,.xls,.xlsx"
              onParsed={handleParsed}
            />
            <ImportUploadZone
              type="offertes"
              label="Offertes"
              icon={FileText}
              accept=".csv,.xls,.xlsx"
              onParsed={handleParsed}
            />
            <ImportUploadZone
              type="facturen"
              label="Facturen"
              icon={Receipt}
              accept=".csv,.xls,.xlsx"
              onParsed={handleParsed}
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button onClick={handleVolgende} disabled={totalFiles === 0}>
              Volgende <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Stap 2: Controleren */}
      {stap === 2 && samenvatting && (
        <div className="space-y-4">
          <ImportPreview samenvatting={samenvatting} />

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={handleTerug}>
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Terug
            </Button>
            <Button onClick={handleVolgende}>
              Start import <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Stap 3: Importeren */}
      {stap === 3 && user?.id && (
        <ImportProgress
          data={parsedData}
          userId={user.id}
          onComplete={handleComplete}
        />
      )}
    </div>
  )
}

export default ImportWizard
