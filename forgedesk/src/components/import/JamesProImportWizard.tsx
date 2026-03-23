import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { ImportUploadZone } from './ImportUploadZone'
import { ImportPreview } from './ImportPreview'
import { ImportProgress } from './ImportProgress'
import { buildSamenvatting, type ParseResult, type JamesProImportData, type ImportSamenvatting, type ImportResultaat } from '@/services/jamesProImportService'
import { Database, FileSpreadsheet, HelpCircle, Users, FolderOpen, FileText, Receipt, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'

type Stap = 1 | 2 | 3 | 4

export function JamesProImportWizard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stap, setStap] = useState<Stap>(1)

  // Parsed data per type
  const [parsedData, setParsedData] = useState<JamesProImportData>({
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
    if (stap === 2) {
      const sam = buildSamenvatting(parsedData)
      setSamenvatting(sam)
      setStap(3)
    } else if (stap === 3) {
      setStap(4)
    }
  }, [stap, parsedData])

  const handleTerug = useCallback(() => {
    if (stap === 2) setStap(1)
    else if (stap === 3) setStap(2)
  }, [stap])

  const handleComplete = useCallback((_result: ImportResultaat) => {
    // Result is shown in ImportProgress component
  }, [])

  const stepLabels = ['Bron kiezen', 'Bestanden uploaden', 'Controleren', 'Importeren']

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Data importeren</h1>
        <p className="text-sm text-muted-foreground mt-1">Importeer je klanten, projecten, offertes en facturen</p>
      </div>

      {/* Step indicator */}
      {stap > 1 && (
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
      )}

      {/* Stap 1: Bron kiezen */}
      {stap === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* James PRO - Primary */}
          <Card
            className="cursor-pointer group hover:border-[#1A5C5E]/30 hover:bg-[#1A5C5E]/[0.03] transition-all col-span-1 md:col-span-1"
            onClick={() => setStap(2)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="rounded-xl bg-[#1A5C5E]/10 p-4 group-hover:bg-[#1A5C5E]/15 transition-colors">
                <Database className="h-8 w-8 text-[#1A5C5E]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">James PRO</h3>
                <p className="text-xs text-muted-foreground mt-1">Upload je exports en we regelen de rest</p>
              </div>
              <Button size="sm" className="mt-auto w-full">
                Importeren <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Excel / CSV - Secondary */}
          <Card
            className="cursor-pointer group hover:border-[#E6E4E0] transition-all"
            onClick={() => navigate('/klanten/importeren')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="rounded-xl bg-[#F4F2EE] p-4 group-hover:bg-[#E6E4E0]/60 transition-colors">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Excel / CSV</h3>
                <p className="text-xs text-muted-foreground mt-1">Importeer klanten vanuit een spreadsheet</p>
              </div>
              <Button variant="outline" size="sm" className="mt-auto w-full">
                Openen <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Ander systeem - Tertiary */}
          <Card className="group transition-all">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="rounded-xl bg-[#F4F2EE] p-4">
                <HelpCircle className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Ander systeem</h3>
                <p className="text-xs text-muted-foreground mt-1">Neem contact op voor een maatwerkimport</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="mt-auto w-full">
                <a href="mailto:support@forgedesk.nl" target="_blank" rel="noopener noreferrer">
                  Contact opnemen
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stap 2: Upload bestanden */}
      {stap === 2 && (
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

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={handleTerug}>
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Terug
            </Button>
            <Button onClick={handleVolgende} disabled={totalFiles === 0}>
              Volgende <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Stap 3: Controleren */}
      {stap === 3 && samenvatting && (
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

      {/* Stap 4: Importeren */}
      {stap === 4 && user?.id && (
        <ImportProgress
          data={parsedData}
          userId={user.id}
          onComplete={handleComplete}
        />
      )}
    </div>
  )
}
