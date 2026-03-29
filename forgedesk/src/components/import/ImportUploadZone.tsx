import React, { useCallback, useRef, useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, type LucideIcon } from 'lucide-react'
import type { ParseResult } from '@/services/universalImportService'

interface ImportUploadZoneProps {
  type: string
  label: string
  icon: LucideIcon
  accept: string
  onParsed: (result: ParseResult) => void
}

export function ImportUploadZone({ type, label, icon: Icon, accept, onParsed }: ImportUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setError(null)
    try {
      const { parseImportFile } = await import('@/services/universalImportService')
      const result = await parseImportFile(file, type as 'klanten' | 'projecten' | 'offertes' | 'facturen')
      if (result.error) {
        setError(result.error)
      }
      onParsed(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    }
  }, [type, onParsed])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 hover:border-muted-foreground/40 transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      {fileName ? (
        error ? (
          <AlertCircle className="h-8 w-8 text-destructive" />
        ) : (
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        )
      ) : (
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      )}
      <span className="text-sm font-medium">{label}</span>
      {fileName && !error && <span className="text-xs text-muted-foreground">{fileName}</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
      {!fileName && <span className="text-xs text-muted-foreground">Sleep een bestand of klik om te uploaden</span>}
    </div>
  )
}
