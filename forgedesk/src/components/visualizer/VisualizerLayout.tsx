import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Palette, Plus, Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { round2 } from '@/utils/budgetUtils'
import { SIGNING_TYPE_LABELS } from '@/utils/visualizerDefaults'
import {
  getSigningVisualisaties,
  getVisualizerStats,
  deleteSigningVisualisatie,
} from '@/services/supabaseService'
import type { SigningVisualisatie, SigningType, VisualizerStats } from '@/types'
import { SigningVisualizerDialog } from './SigningVisualizerDialog'
import { VisualisatieLightbox } from './VisualisatieLightbox'
import {
  Eye, Download, Trash2,
} from 'lucide-react'

type FilterType = 'alle' | 'aan_offerte' | 'standalone'
type FilterSigning = 'alle' | SigningType

export function VisualizerLayout() {
  const { user } = useAuth()
  const [visualisaties, setVisualisaties] = useState<SigningVisualisatie[]>([])
  const [stats, setStats] = useState<VisualizerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('alle')
  const [filterSigning, setFilterSigning] = useState<FilterSigning>('alle')

  const laden = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const [items, s] = await Promise.all([
        getSigningVisualisaties(user.id),
        getVisualizerStats(user.id),
      ])
      setVisualisaties(items)
      setStats(s)
    } catch {
      toast.error('Fout bij laden visualisaties')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    laden().then(() => { if (cancelled) return })
    return () => { cancelled = true }
  }, [laden])

  const handleDelete = useCallback(async (id: string) => {
    if (!user?.id) return
    try {
      await deleteSigningVisualisatie(id, user.id)
      setVisualisaties(prev => prev.filter(v => v.id !== id))
      setDeleteConfirmId(null)
      toast.success('Visualisatie verwijderd')
    } catch {
      toast.error('Verwijderen mislukt')
    }
  }, [user?.id])

  const handleDownload = useCallback((v: SigningVisualisatie) => {
    const a = document.createElement('a')
    a.href = v.resultaat_url
    a.download = `mockup-${v.signing_type}-${v.id.slice(0, 8)}.png`
    a.target = '_blank'
    a.click()
  }, [])

  // Filter
  const gefilterd = visualisaties.filter(v => {
    if (filterType === 'aan_offerte' && !v.offerte_id) return false
    if (filterType === 'standalone' && v.offerte_id) return false
    if (filterSigning !== 'alle' && v.signing_type !== filterSigning) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted dark:bg-foreground/80 rounded-lg">
              <Palette className="w-6 h-6 text-muted-foreground dark:text-muted-foreground/60" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-white font-display">
                Signing Visualizer
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-gegenereerde mockups voor klantpresentaties
              </p>
            </div>
          </div>
          {stats && (
            <p className="text-xs text-muted-foreground mt-2 ml-14">
              {stats.totaal_gegenereerd} mockups gegenereerd | €{round2(stats.totaal_kosten_eur)} API-kosten | €{round2(stats.totaal_doorberekend_eur)} doorberekend
            </p>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nieuwe Visualisatie
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1.5">
          {([
            ['alle', 'Alle'],
            ['aan_offerte', 'Aan offerte gekoppeld'],
            ['standalone', 'Standalone'],
          ] as [FilterType, string][]).map(([val, label]) => (
            <Button
              key={val}
              size="sm"
              variant={filterType === val ? 'default' : 'outline'}
              onClick={() => setFilterType(val)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex gap-1.5">
          {([
            ['alle', 'Alle types'],
            ['led_verlicht', 'LED'],
            ['neon', 'Neon'],
            ['dag_onverlicht', 'Dag'],
            ['dag_nacht', 'Dag/Nacht'],
          ] as [FilterSigning, string][]).map(([val, label]) => (
            <Button
              key={val}
              size="sm"
              variant={filterSigning === val ? 'default' : 'outline'}
              onClick={() => setFilterSigning(val)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : gefilterd.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-muted rounded-full mb-4">
            <Palette className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">
            {visualisaties.length === 0
              ? 'Nog geen visualisaties — genereer de eerste mockup'
              : 'Geen resultaten voor deze filters'}
          </p>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Palette className="h-4 w-4" /> Nieuwe Visualisatie
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {gefilterd.map((v, index) => (
            <div
              key={v.id}
              className="group relative border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all"
            >
              <div
                className="aspect-[16/10] cursor-pointer overflow-hidden"
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={v.resultaat_url}
                  alt={`${SIGNING_TYPE_LABELS[v.signing_type]} mockup`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Badge variant="outline" className="text-xs">
                    {SIGNING_TYPE_LABELS[v.signing_type]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{v.kleur_instelling}</span>
                  {v.offerte_id && (
                    <Badge variant="secondary" className="text-xs ml-auto">Offerte</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(v.created_at).toLocaleDateString('nl-NL')}</span>
                  <span>€{round2(v.api_kosten_eur)}</span>
                </div>
              </div>

              {/* Actions overlay */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary" className="h-7 w-7 p-0"
                  onClick={() => setLightboxIndex(index)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="secondary" className="h-7 w-7 p-0"
                  onClick={() => handleDownload(v)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {deleteConfirmId === v.id ? (
                  <Button size="sm" variant="destructive" className="h-7 px-2 text-xs"
                    onClick={() => handleDelete(v.id)}>
                    Bevestig
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" className="h-7 w-7 p-0"
                    onClick={() => setDeleteConfirmId(v.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <SigningVisualizerDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onVisualisatieOpgeslagen={() => {
          setDialogOpen(false)
          laden()
        }}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <VisualisatieLightbox
          visualisaties={gefilterd}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
