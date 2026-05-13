import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Paperclip,
  FileIcon,
  ExternalLink,
  Trash2,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  getFactuurBijlagen,
  uploadFactuurBijlage,
  deleteFactuurBijlage,
  updateFactuurBijlageType,
  getSignedUrl,
} from '@/services/factuurBijlagenService'
import { supabase } from '@/services/supabaseHelpers'
import type { FactuurBijlage } from '@/types'

const MAX_BIJLAGEN = 5
const MAX_GROOTTE = 20 * 1024 * 1024
const ACCEPT = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
].join(',')

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
  factuurId: string
  organisatieId: string
  exactDocumentId?: string | null
  onCountChange?: (count: number) => void
}

export function FactuurBijlagenSectie({ factuurId, organisatieId, exactDocumentId, onCountChange }: Props) {
  const [bijlagen, setBijlagen] = useState<FactuurBijlage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [retryingSync, setRetryingSync] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const pendingDeletesRef = useRef<Map<string, { bijlage: FactuurBijlage; timer: number }>>(new Map())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getFactuurBijlagen(factuurId)
      .then((data) => {
        if (cancelled) return
        setBijlagen(data)
        onCountChange?.(data.length)
      })
      .catch((err) => {
        console.error('Bijlagen laden mislukt', err)
        toast.error('Bijlagen konden niet geladen worden')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [factuurId, onCountChange, reloadTrigger])

  useEffect(() => {
    return () => {
      pendingDeletesRef.current.forEach(({ bijlage, timer }) => {
        clearTimeout(timer)
        deleteFactuurBijlage(bijlage.id).catch((err) =>
          console.error('Bijlage flush-delete mislukt', err),
        )
      })
      pendingDeletesRef.current.clear()
    }
  }, [])

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files)
      if (fileArr.length === 0) return

      const huidigAantal = bijlagen.length + pendingDeletesRef.current.size
      const ruimte = MAX_BIJLAGEN - huidigAantal
      if (ruimte <= 0) {
        toast.error(`Maximum van ${MAX_BIJLAGEN} bijlagen bereikt`)
        return
      }
      const teVerwerken = fileArr.slice(0, ruimte)
      if (fileArr.length > ruimte) {
        toast.warning(`Alleen de eerste ${ruimte} bestanden worden geüpload`)
      }

      setUploading(true)
      try {
        const nieuwe: FactuurBijlage[] = []
        for (const file of teVerwerken) {
          if (file.size > MAX_GROOTTE) {
            toast.error(`${file.name} is groter dan ${MAX_GROOTTE / 1024 / 1024}MB`)
            continue
          }
          try {
            const bijlage = await uploadFactuurBijlage(factuurId, file, 'overig', organisatieId)
            nieuwe.push(bijlage)
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Upload mislukt'
            toast.error(`${file.name}: ${msg}`)
          }
        }
        if (nieuwe.length > 0) {
          setBijlagen((prev) => {
            const next = [...prev, ...nieuwe]
            onCountChange?.(next.length)
            return next
          })
          toast.success(
            nieuwe.length === 1
              ? 'Bijlage geüpload'
              : `${nieuwe.length} bijlagen geüpload`,
          )
        }
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [bijlagen.length, factuurId, organisatieId, onCountChange],
  )

  const handleDelete = useCallback(
    (bijlage: FactuurBijlage) => {
      setBijlagen((prev) => {
        const next = prev.filter((b) => b.id !== bijlage.id)
        onCountChange?.(next.length)
        return next
      })

      const timer = window.setTimeout(() => {
        deleteFactuurBijlage(bijlage.id)
          .catch((err) => {
            console.error('Bijlage verwijderen mislukt', err)
            toast.error('Verwijderen mislukt')
            setBijlagen((prev) => {
              const next = [...prev, bijlage].sort((a, b) =>
                a.aangemaakt_op.localeCompare(b.aangemaakt_op),
              )
              onCountChange?.(next.length)
              return next
            })
          })
          .finally(() => {
            pendingDeletesRef.current.delete(bijlage.id)
          })
      }, 5000)

      pendingDeletesRef.current.set(bijlage.id, { bijlage, timer })

      toast(`${bijlage.bestandsnaam} verwijderd`, {
        duration: 5000,
        action: {
          label: 'Ongedaan maken',
          onClick: () => {
            const pending = pendingDeletesRef.current.get(bijlage.id)
            if (!pending) return
            clearTimeout(pending.timer)
            pendingDeletesRef.current.delete(bijlage.id)
            setBijlagen((prev) => {
              const next = [...prev, bijlage].sort((a, b) =>
                a.aangemaakt_op.localeCompare(b.aangemaakt_op),
              )
              onCountChange?.(next.length)
              return next
            })
          },
        },
      })
    },
    [onCountChange],
  )

  const handleTypeChange = useCallback(
    async (bijlageId: string, nieuweType: 'inkooporder' | 'overig') => {
      const vorige = bijlagen.find((b) => b.id === bijlageId)?.type
      setBijlagen((prev) =>
        prev.map((b) => (b.id === bijlageId ? { ...b, type: nieuweType } : b)),
      )
      try {
        await updateFactuurBijlageType(bijlageId, nieuweType)
      } catch (err) {
        console.error('Type wijzigen mislukt', err)
        toast.error('Type kon niet worden bijgewerkt')
        if (vorige) {
          setBijlagen((prev) =>
            prev.map((b) => (b.id === bijlageId ? { ...b, type: vorige } : b)),
          )
        }
      }
    },
    [bijlagen],
  )

  const handleRetrySync = useCallback(async () => {
    if (!exactDocumentId) return
    setRetryingSync(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Geen actieve sessie')

      const res = await fetch('/api/exact-sync-factuur', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ factuur_id: factuurId, bijlagen_only: true }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Sync mislukt')
      }
      const data = (await res.json()) as { bijlagen_synced: number; bijlagen_failed: number; bijlagen_geprobeerd: number }
      setReloadTrigger((t) => t + 1)
      if (data.bijlagen_failed > 0) {
        toast.warning(`${data.bijlagen_synced} gesynced, ${data.bijlagen_failed} mislukt`)
      } else if (data.bijlagen_synced > 0) {
        toast.success(`${data.bijlagen_synced} bijlage(n) gesynced naar Exact`)
      } else {
        toast.info('Geen bijlagen om te syncen')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync mislukt'
      toast.error(msg)
    } finally {
      setRetryingSync(false)
    }
  }, [exactDocumentId, factuurId])

  const handlePreview = useCallback(async (bijlage: FactuurBijlage) => {
    try {
      const url = await getSignedUrl(bijlage.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Signed URL mislukt', err)
      toast.error('Bijlage kon niet geopend worden')
    }
  }, [])

  const maxBereikt = bijlagen.length >= MAX_BIJLAGEN
  const exactGekoppeld = Boolean(exactDocumentId)
  const aantalNietGesynced = exactGekoppeld
    ? bijlagen.filter((b) => !b.exact_synced_op).length
    : 0

  return (
    <Card className="bg-[#1A535C0D] border-petrol-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-petrol">
          <Paperclip className="h-4 w-4" />
          Bijlagen
          {bijlagen.length > 0 && (
            <Badge variant="outline" className="ml-auto font-mono text-[10px] h-5">
              {bijlagen.length}/{MAX_BIJLAGEN}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
            Bijlagen laden
          </div>
        ) : (
          <>
            {bijlagen.map((bijlage) => (
              <div
                key={bijlage.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-sand bg-white"
              >
                <FileIcon className="h-4 w-4 text-petrol shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate" title={bijlage.bestandsnaam}>
                      {bijlage.bestandsnaam}
                    </span>
                    {exactGekoppeld && (
                      bijlage.exact_synced_op ? (
                        <CheckCircle2
                          className="h-3 w-3 text-emerald-600 shrink-0"
                          aria-label="Gesynced naar Exact"
                        />
                      ) : (
                        <AlertTriangle
                          className="h-3 w-3 text-amber-500 shrink-0"
                          aria-label="Nog niet gesynced naar Exact"
                        />
                      )
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {formatBytes(bijlage.grootte)}
                  </div>
                </div>
                <Select
                  value={bijlage.type}
                  onValueChange={(v) => handleTypeChange(bijlage.id, v as 'inkooporder' | 'overig')}
                >
                  <SelectTrigger className="h-7 text-[11px] w-[110px] px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inkooporder" className="text-xs">Inkooporder</SelectItem>
                    <SelectItem value="overig" className="text-xs">Overig</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handlePreview(bijlage)}
                  title="Openen"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(bijlage)}
                  title="Verwijderen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <label
              className={cn(
                'block border-2 border-dashed rounded-lg p-3 text-center transition-colors',
                maxBereikt
                  ? 'border-sand bg-muted/30 cursor-not-allowed opacity-60'
                  : dragActive
                  ? 'border-petrol bg-petrol/10 cursor-pointer'
                  : 'border-sand hover:border-petrol hover:bg-petrol/5 cursor-pointer',
              )}
              onDragOver={(e) => {
                if (maxBereikt) return
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                if (maxBereikt) return
                if (e.dataTransfer.files.length > 0) {
                  void handleUpload(e.dataTransfer.files)
                }
              }}
              title={maxBereikt ? `Maximum van ${MAX_BIJLAGEN} bijlagen bereikt` : undefined}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                disabled={maxBereikt || uploading}
                onChange={(e) => {
                  if (e.target.files) void handleUpload(e.target.files)
                }}
              />
              {uploading ? (
                <div className="flex items-center justify-center text-xs text-petrol">
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Uploaden
                </div>
              ) : (
                <div className="flex items-center justify-center text-xs text-muted-foreground gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  <span>
                    {maxBereikt
                      ? `Maximum bereikt`
                      : bijlagen.length === 0
                      ? 'Sleep een PDF of klik om te uploaden'
                      : 'Nog een bijlage toevoegen'}
                  </span>
                </div>
              )}
            </label>
            <p className="text-[10px] text-muted-foreground/70 px-1">
              PDF, JPG, PNG, DOCX, XLSX · max 20 MB per bestand
            </p>
            {aantalNietGesynced > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetrySync}
                disabled={retryingSync}
                className="w-full text-xs h-8 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
              >
                {retryingSync ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                {aantalNietGesynced} bijlage{aantalNietGesynced === 1 ? '' : 'n'} opnieuw syncen naar Exact
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
