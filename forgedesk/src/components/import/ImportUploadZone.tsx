import React, { useCallback, useRef, useState } from 'react'
import { type LucideIcon, Upload, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { parseJamesProFile, type ImportType, type ParseResult } from '@/services/jamesProImportService'

interface ImportUploadZoneProps {
  type: ImportType
  label: string
  icon: LucideIcon
  accept: string
  onParsed: (result: ParseResult) => void
}

export function ImportUploadZone({ type, label, icon: Icon, accept, onParsed }: ImportUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<ParseResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setIsParsing(true)
    setResult(null)
    try {
      const parsed = await parseJamesProFile(file, type)
      setResult(parsed)
      onParsed(parsed)
    } catch {
      const errorResult: ParseResult = { type, rows: [], count: 0, error: 'Bestand kon niet worden gelezen' }
      setResult(errorResult)
      onParsed(errorResult)
    } finally {
      setIsParsing(false)
    }
  }, [type, onParsed])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setFileName(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
    onParsed({ type, rows: [], count: 0 })
  }, [type, onParsed])

  const hasError = result?.error
  const hasSuccess = result && !result.error && result.count > 0

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed p-6 transition-all duration-200
        ${isDragging ? 'border-[#1A5C5E] bg-[#1A5C5E]/5' : ''}
        ${hasSuccess ? 'border-green-300 bg-green-50/50' : ''}
        ${hasError ? 'border-red-300 bg-red-50/50' : ''}
        ${!isDragging && !hasSuccess && !hasError ? 'border-[#E6E4E0] hover:border-[#1A5C5E]/40 hover:bg-[#FAFAF8]' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`rounded-lg p-2.5 ${hasSuccess ? 'bg-green-100 text-green-700' : hasError ? 'bg-red-100 text-red-600' : 'bg-[#F4F2EE] text-muted-foreground'}`}>
          {hasSuccess ? <CheckCircle2 className="h-5 w-5" /> : hasError ? <AlertCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <Badge variant="secondary" className="mt-1 text-[9px]">Niet verplicht</Badge>
        </div>

        {isParsing && (
          <p className="text-xs text-muted-foreground animate-pulse">Bestand verwerken...</p>
        )}

        {fileName && !isParsing && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{fileName}</p>
            <button onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {hasSuccess && (
          <p className="text-xs font-medium text-green-700">
            <span className="font-mono">{result.count.toLocaleString('nl-NL')}</span> {label.toLowerCase()} gevonden
          </p>
        )}

        {hasError && (
          <p className="text-xs text-red-600">{result.error}</p>
        )}

        {!fileName && !isParsing && (
          <p className="text-xs text-muted-foreground">
            <Upload className="inline h-3 w-3 mr-1" />
            Sleep bestand of klik om te uploaden
          </p>
        )}
      </div>
    </div>
  )
}
