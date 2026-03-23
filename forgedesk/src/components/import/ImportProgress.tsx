import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Users, FolderOpen, FileText, Receipt, CheckCircle2, XCircle, Clock, ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { importJamesProData, type JamesProImportData, type ImportProgress as ImportProgressType, type ImportResultaat, type ImportType } from '@/services/jamesProImportService'

interface ImportProgressProps {
  data: JamesProImportData
  userId: string
  onComplete: (result: ImportResultaat) => void
}

interface StepState {
  status: 'wacht' | 'bezig' | 'klaar' | 'fout'
  current: number
  total: number
  error?: string
}

const typeConfig: Record<ImportType, { label: string; icon: React.ElementType }> = {
  klanten: { label: 'Klanten', icon: Users },
  projecten: { label: 'Projecten', icon: FolderOpen },
  offertes: { label: 'Offertes', icon: FileText },
  facturen: { label: 'Facturen', icon: Receipt },
}

export function ImportProgress({ data, userId, onComplete }: ImportProgressProps) {
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [resultaat, setResultaat] = useState<ImportResultaat | null>(null)
  const [steps, setSteps] = useState<Record<ImportType, StepState>>({
    klanten: { status: 'wacht', current: 0, total: data.klanten.length },
    projecten: { status: 'wacht', current: 0, total: data.projecten.length },
    offertes: { status: 'wacht', current: 0, total: data.offertes.length },
    facturen: { status: 'wacht', current: 0, total: data.facturen.length },
  })
  const isRunning = useRef(false)

  const handleProgress = useCallback((p: ImportProgressType) => {
    setSteps(prev => ({
      ...prev,
      [p.type]: { status: p.status, current: p.current, total: p.total, error: p.error },
    }))
  }, [])

  const startImport = useCallback(async () => {
    if (isRunning.current) return
    isRunning.current = true
    setIsStarted(true)

    try {
      const result = await importJamesProData(data, userId, handleProgress)
      setResultaat(result)
      setIsComplete(true)
      onComplete(result)
    } catch (err) {
      // Mark current step as fout
      setSteps(prev => {
        const updated = { ...prev }
        for (const key of Object.keys(updated) as ImportType[]) {
          if (updated[key].status === 'bezig') {
            updated[key] = { ...updated[key], status: 'fout', error: err instanceof Error ? err.message : 'Onbekende fout' }
          }
        }
        return updated
      })
    } finally {
      isRunning.current = false
    }
  }, [data, userId, handleProgress, onComplete])

  const types: ImportType[] = ['klanten', 'projecten', 'offertes', 'facturen']

  return (
    <div className="space-y-6">
      {/* Progress bars */}
      <div className="space-y-4">
        {types.map(type => {
          const step = steps[type]
          const config = typeConfig[type]
          const Icon = config.icon
          const pct = step.total > 0 ? Math.round((step.current / step.total) * 100) : 0

          if (step.total === 0 && step.status === 'wacht') return null

          return (
            <Card key={type}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground flex-1">{config.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {step.current.toLocaleString('nl-NL')}/{step.total.toLocaleString('nl-NL')}
                    </span>
                    <StatusIcon status={step.status} />
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[#E6E4E0] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      step.status === 'fout' ? 'bg-red-500' : 'bg-[#F15025]'
                    } ${step.status === 'bezig' ? 'animate-pulse' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {step.error && (
                  <p className="text-xs text-red-600 mt-1">{step.error}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Start button */}
      {!isStarted && (
        <Button onClick={startImport} className="w-full">
          Start import
        </Button>
      )}

      {/* Running indicator */}
      {isStarted && !isComplete && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Importeren...
        </div>
      )}

      {/* Result summary */}
      {isComplete && resultaat && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-semibold text-foreground">Import voltooid</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <ResultLine label="Klanten geïmporteerd" value={resultaat.klanten.imported} />
              <ResultLine label="Klanten overgeslagen" value={resultaat.klanten.skipped} />
              <ResultLine label="Projecten geïmporteerd" value={resultaat.projecten.imported} />
              <ResultLine label="Projecten gekoppeld" value={resultaat.projecten.linked} />
              <ResultLine label="Offertes geïmporteerd" value={resultaat.offertes.imported} />
              <ResultLine label="Offertes → klant" value={resultaat.offertes.linkedKlant} />
              <ResultLine label="Facturen geïmporteerd" value={resultaat.facturen.imported} />
              <ResultLine label="Facturen → klant" value={resultaat.facturen.linkedKlant} />
            </div>

            {/* Error list */}
            {[...resultaat.klanten.errors, ...resultaat.projecten.errors, ...resultaat.offertes.errors, ...resultaat.facturen.errors].length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
                <p className="text-xs font-medium text-red-700">Fouten tijdens import:</p>
                {[...resultaat.klanten.errors, ...resultaat.projecten.errors, ...resultaat.offertes.errors, ...resultaat.facturen.errors].slice(0, 10).map((err, i) => (
                  <p key={i} className="text-xs text-red-600">{err}</p>
                ))}
              </div>
            )}

            <Button variant="outline" asChild className="w-full">
              <Link to="/klanten">
                Bekijk klanten <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: StepState['status'] }) {
  switch (status) {
    case 'wacht':
      return <Clock className="h-4 w-4 text-muted-foreground/50" />
    case 'bezig':
      return <Loader2 className="h-4 w-4 text-[#F15025] animate-spin" />
    case 'klaar':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'fout':
      return <XCircle className="h-4 w-4 text-red-600" />
  }
}

function ResultLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground">{value.toLocaleString('nl-NL')}</span>
    </div>
  )
}
