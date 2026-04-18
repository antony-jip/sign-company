import React, { useEffect, useState, useRef } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { ImportData, ImportResultaat } from '@/services/universalImportService'

interface ImportProgressProps {
  data: ImportData
  userId: string
  onComplete: (result: ImportResultaat) => void
}

export function ImportProgress({ data, userId, onComplete }: ImportProgressProps) {
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [result, setResult] = useState<ImportResultaat | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    async function run() {
      try {
        const { importData: runImport } = await import('@/services/universalImportService')
        const res = await runImport(data, userId, () => {})
        if (!mountedRef.current) return
        setResult(res)
        setStatus('done')
        onComplete(res)
      } catch (err) {
        if (!mountedRef.current) return
        setError(err instanceof Error ? err.message : 'Onbekende fout bij importeren')
        setStatus('error')
      }
    }
    run()
    return () => { mountedRef.current = false }
  }, [data, userId, onComplete])

  if (status === 'running') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Bezig met importeren...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-destructive">
        <p className="text-sm font-medium">Fout bij importeren</p>
        <p className="text-xs">{error}</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">Import voltooid</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border p-3">
          <p className="font-medium">Klanten</p>
          <p className="text-muted-foreground">{result.klanten.imported} geïmporteerd, {result.klanten.skipped} overgeslagen</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="font-medium">Projecten</p>
          <p className="text-muted-foreground">{result.projecten.imported} geïmporteerd, {result.projecten.linked} gekoppeld</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="font-medium">Offertes</p>
          <p className="text-muted-foreground">{result.offertes.imported} geïmporteerd</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="font-medium">Facturen</p>
          <p className="text-muted-foreground">{result.facturen.imported} geïmporteerd</p>
        </div>
      </div>
      {result.unmatchedNames.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm">
          <p className="font-medium text-yellow-800">Niet gekoppeld ({result.unmatchedNames.length})</p>
          <p className="text-yellow-700 text-xs mt-1">{result.unmatchedNames.join(', ')}</p>
        </div>
      )}
    </div>
  )
}
