import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Eye, Download, Trash2, Plus, Palette, ImageIcon, Link2, FolderKanban, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { round2 } from '@/utils/budgetUtils'
import { SIGNING_TYPE_LABELS } from '@/utils/visualizerDefaults'
import {
  getSigningVisualisaties,
  getSigningVisualisatiesByOfferte,
  getSigningVisualisatiesByProject,
  getSigningVisualisatiesByKlant,
  deleteSigningVisualisatie,
  updateSigningVisualisatie,
  getProjecten,
} from '@/services/supabaseService'
import type { SigningVisualisatie, Project } from '@/types'
import { SigningVisualizerDialog } from './SigningVisualizerDialog'
import { VisualisatieLightbox } from './VisualisatieLightbox'

interface VisualisatieGalleryProps {
  offerte_id?: string
  project_id?: string
  klant_id?: string
  toon_toevoegen_knop?: boolean
  compact?: boolean
}

export function VisualisatieGallery({
  offerte_id,
  project_id,
  klant_id,
  toon_toevoegen_knop = true,
  compact = false,
}: VisualisatieGalleryProps) {
  const { user } = useAuth()
  const [visualisaties, setVisualisaties] = useState<SigningVisualisatie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [linkOpenId, setLinkOpenId] = useState<string | null>(null)
  const [projecten, setProjecten] = useState<Project[]>([])
  const [projectenLoaded, setProjectenLoaded] = useState(false)

  const laden = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      let items: SigningVisualisatie[]
      if (offerte_id) {
        items = await getSigningVisualisatiesByOfferte(offerte_id)
      } else if (project_id) {
        items = await getSigningVisualisatiesByProject(project_id)
      } else if (klant_id) {
        items = await getSigningVisualisatiesByKlant(klant_id)
      } else {
        items = await getSigningVisualisaties(user.id)
      }
      setVisualisaties(items)
    } catch {
      toast.error('Fout bij laden visualisaties')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, offerte_id, project_id, klant_id])

  useEffect(() => {
    let cancelled = false
    laden().then(() => { if (cancelled) return })
    return () => { cancelled = true }
  }, [laden])

  // Load projecten alleen als we ze nodig hebben (link dropdown geopend)
  const loadProjecten = useCallback(async () => {
    if (projectenLoaded) return
    try {
      const data = await getProjecten()
      setProjecten(data)
      setProjectenLoaded(true)
    } catch {
      toast.error('Fout bij laden projecten')
    }
  }, [projectenLoaded])

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

  const handleLinkProject = useCallback(async (visualisatieId: string, newProjectId: string | null) => {
    try {
      const project = newProjectId ? projecten.find(p => p.id === newProjectId) : null
      const updated = await updateSigningVisualisatie(visualisatieId, {
        project_id: newProjectId || undefined,
        klant_id: project?.klant_id || undefined,
      })
      setVisualisaties(prev => prev.map(v => v.id === visualisatieId ? { ...v, ...updated } : v))
      setLinkOpenId(null)
      toast.success(newProjectId ? 'Gekoppeld aan project' : 'Koppeling verwijderd')
    } catch {
      toast.error('Koppeling mislukt')
    }
  }, [projecten])

  const handleOpenLink = useCallback((id: string) => {
    setLinkOpenId(prev => prev === id ? null : id)
    loadProjecten()
  }, [loadProjecten])

  // Standalone modus = geen project_id/offerte_id prop → toon link-knop
  const isStandalone = !project_id && !offerte_id

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      {toon_toevoegen_knop && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Signing Visualisaties
            {visualisaties.length > 0 && (
              <Badge variant="secondary" className="text-xs">{visualisaties.length}</Badge>
            )}
          </h3>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Nieuwe visualisatie
          </Button>
        </div>
      )}

      {/* Empty state */}
      {visualisaties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 bg-muted rounded-full mb-3">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Nog geen visualisaties — genereer de eerste mockup
          </p>
          {toon_toevoegen_knop && (
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Nieuwe visualisatie
            </Button>
          )}
        </div>
      ) : (
        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-2')}>
          {visualisaties.map((v, index) => {
            const linkedProject = v.project_id ? projecten.find(p => p.id === v.project_id) : null

            return (
              <div
                key={v.id}
                className="group relative border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
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

                {/* Linked project badge */}
                {isStandalone && v.project_id && (
                  <div className="absolute top-2 left-2">
                    <button
                      onClick={() => handleOpenLink(v.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium hover:bg-black/70 transition-colors"
                    >
                      <FolderKanban className="w-3 h-3" />
                      {linkedProject?.naam || 'Project'}
                    </button>
                  </div>
                )}

                {/* Info */}
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {SIGNING_TYPE_LABELS[v.signing_type] || v.signing_type}
                    </Badge>
                    <span
                      className="w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: v.kleur_instelling.startsWith('#') ? v.kleur_instelling : undefined }}
                      title={v.kleur_instelling}
                    />
                    <span className="text-xs text-muted-foreground">{v.kleur_instelling}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(v.created_at).toLocaleDateString('nl-NL')}</span>
                    <span>€{round2(v.api_kosten_eur)}</span>
                  </div>
                </div>

                {/* Link to project panel */}
                {linkOpenId === v.id && (
                  <div className="border-t border-border p-2.5 bg-muted/30 animate-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                      <Link2 className="w-3 h-3" />
                      Koppel aan project
                    </div>
                    <select
                      value={v.project_id || ''}
                      onChange={(e) => handleLinkProject(v.id, e.target.value || null)}
                      className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Geen project</option>
                      {projecten.map(p => (
                        <option key={p.id} value={p.id}>{p.naam}{p.klant_naam ? ` — ${p.klant_naam}` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isStandalone && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className={cn('h-7 w-7 p-0', v.project_id && 'text-primary')}
                      onClick={() => handleOpenLink(v.id)}
                      title="Koppel aan project"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0"
                    onClick={() => setLightboxIndex(index)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDownload(v)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {deleteConfirmId === v.id ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleDelete(v.id)}
                    >
                      Bevestig
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0"
                      onClick={() => setDeleteConfirmId(v.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <SigningVisualizerDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        offerte_id={offerte_id}
        project_id={project_id}
        klant_id={klant_id}
        onVisualisatieOpgeslagen={() => {
          setDialogOpen(false)
          laden()
        }}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <VisualisatieLightbox
          visualisaties={visualisaties}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
