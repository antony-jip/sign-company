import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  GripVertical, ChevronUp, ChevronDown, Trash2, ImagePlus, X, Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WerkbonItem, WerkbonBlokType, WerkbonTekstPositie } from '@/types'
import { resolveSchaal } from '@/services/werkbonService'
import { WerkbonDropZone } from './WerkbonDropZone'
import { AfbeeldingResizeHandle } from './AfbeeldingResizeHandle'
import { WerkbonCanvas } from './WerkbonCanvas'
import { useAppSettings } from '@/contexts/AppSettingsContext'

interface WerkbonItemCardProps {
  item: WerkbonItem
  index: number
  totalItems: number
  onUpdate: (itemId: string, updates: Partial<WerkbonItem>) => Promise<void>
  onDelete: (itemId: string) => void
  onMove: (itemId: string, direction: 'up' | 'down') => void
  onImageAdd: (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => void
  onImageDelete: (itemId: string, afbId: string) => void
  onImageGrootteChange: (itemId: string, afbId: string, grootte: 'klein' | 'normaal' | 'groot') => void
  onImageBlokTypeChange: (itemId: string, afbId: string, blokType: WerkbonBlokType) => void
  onImageSchaalChange?: (itemId: string, afbId: string, schaalPercentage: number) => void | Promise<void>
  onImageTekstPositieChange: (itemId: string, afbId: string, positie: WerkbonTekstPositie) => void
  onLightbox: (url: string) => void
  onAfbeeldingenDropped?: (itemId: string, files: File[]) => void | Promise<void>
  onAfbeeldingReorder?: (itemId: string, draggedAfbId: string, targetAfbId: string) => void | Promise<void>
  // Fase 3 canvas-mutaties · alleen gebruikt wanneer werkbon_canvas_versie >= 3.
  onCanvasElementMove?: (itemId: string, afbId: string, x_mm: number, y_mm: number) => void | Promise<void>
  onCanvasElementResize?: (itemId: string, afbId: string, w_mm: number, h_mm: number) => void | Promise<void>
}

const GROOTTE_OPTIES: ReadonlyArray<'klein' | 'normaal' | 'groot'> = ['klein', 'normaal', 'groot']
const GROOTTE_LABEL: Record<'klein' | 'normaal' | 'groot', string> = {
  klein: 'Klein',
  normaal: 'Normaal',
  groot: 'Groot',
}

const TEKST_POSITIE_OPTIES: ReadonlyArray<WerkbonTekstPositie> = ['links', 'rechts', 'boven', 'onder']
const TEKST_POSITIE_LABEL: Record<WerkbonTekstPositie, string> = {
  links: 'Links',
  rechts: 'Rechts',
  boven: 'Boven',
  onder: 'Onder',
}

const AFB_DRAG_MIME = 'text/afb-id'

/** Debounced text field · local state for fast typing, debounced callback for persistence */
function useDebouncedField(initialValue: string, onCommit: (val: string) => void, delay = 500) {
  const [localValue, setLocalValue] = useState(initialValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  useEffect(() => { setLocalValue(initialValue) }, [initialValue])

  const handleChange = useCallback((val: string) => {
    setLocalValue(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => commitRef.current(val), delay)
  }, [delay])

  return [localValue, handleChange] as const
}

export const WerkbonItemCard = React.memo(function WerkbonItemCard({
  item, index, totalItems, onUpdate, onDelete, onMove, onImageAdd, onImageDelete, onImageGrootteChange, onImageBlokTypeChange, onImageSchaalChange, onImageTekstPositieChange, onLightbox,
  onAfbeeldingenDropped, onAfbeeldingReorder, onCanvasElementMove, onCanvasElementResize,
}: WerkbonItemCardProps) {
  const { werkbonCanvasVersie } = useAppSettings()
  const canvasActief = werkbonCanvasVersie >= 1
  const fase2Actief = werkbonCanvasVersie >= 2
  const fase3Actief = werkbonCanvasVersie >= 3
  const [schaalPreview, setSchaalPreview] = useState<Record<string, number>>({})
  const aantalFotos = item.afbeeldingen.filter((a) => (a.layout?.blok_type ?? 'foto') !== 'logo').length
  const [omschrijving, setOmschrijving] = useDebouncedField(
    item.omschrijving,
    (val) => onUpdate(item.id, { omschrijving: val }),
  )
  const [notitie, setNotitie] = useDebouncedField(
    item.interne_notitie || '',
    (val) => onUpdate(item.id, { interne_notitie: val || undefined }),
  )

  const [draggedAfbId, setDraggedAfbId] = useState<string | null>(null)

  const handleDimensionChange = useCallback((field: 'afmeting_breedte_mm' | 'afmeting_hoogte_mm', val: string) => {
    onUpdate(item.id, { [field]: val ? Number(val) : undefined })
  }, [item.id, onUpdate])

  const handleAfbDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, afbId: string) => {
    e.dataTransfer.setData(AFB_DRAG_MIME, afbId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedAfbId(afbId)
  }, [])

  const handleAfbDragEnd = useCallback(() => {
    setDraggedAfbId(null)
  }, [])

  const handleAfbDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(AFB_DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleAfbDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetAfbId: string) => {
    if (!onAfbeeldingReorder) return
    const draggedId = e.dataTransfer.getData(AFB_DRAG_MIME)
    if (!draggedId || draggedId === targetAfbId) return
    e.preventDefault()
    e.stopPropagation()
    setDraggedAfbId(null)
    void onAfbeeldingReorder(item.id, draggedId, targetAfbId)
  }, [item.id, onAfbeeldingReorder])

  return (
    <WerkbonDropZone itemId={item.id} onFilesDropped={onAfbeeldingenDropped ?? (() => {})} disabled={!canvasActief || !onAfbeeldingenDropped || fase3Actief}>
      <Card className="overflow-hidden rounded-xl border-black/[0.06]">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GripVertical className="h-4 w-4" />
              <Badge variant="outline" className="text-xs font-mono">#{index + 1}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7" onClick={() => onMove(item.id, 'up')} disabled={index === 0}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7" onClick={() => onMove(item.id, 'down')} disabled={index === totalItems - 1}>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7 text-destructive" onClick={() => onDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Omschrijving</Label>
            <Textarea
              value={omschrijving}
              onChange={(e) => setOmschrijving(e.target.value)}
              className="text-base font-medium min-h-[60px]"
              placeholder="Omschrijving van het item"
              enableAiTone={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Breedte (mm)</Label>
              <Input
                type="number"
                min={0}
                defaultValue={item.afmeting_breedte_mm || ''}
                onBlur={(e) => handleDimensionChange('afmeting_breedte_mm', e.target.value)}
                placeholder="bijv. 1200"
                className="font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Hoogte (mm)</Label>
              <Input
                type="number"
                min={0}
                defaultValue={item.afmeting_hoogte_mm || ''}
                onBlur={(e) => handleDimensionChange('afmeting_hoogte_mm', e.target.value)}
                placeholder="bijv. 800"
                className="font-mono"
              />
            </div>
          </div>

          {fase3Actief ? (
            <WerkbonCanvas
              itemId={item.id}
              afbeeldingen={item.afbeeldingen}
              onElementMove={(afbId, x, y) => { void onCanvasElementMove?.(item.id, afbId, x, y) }}
              onElementResize={(afbId, w, h) => { void onCanvasElementResize?.(item.id, afbId, w, h) }}
              onElementDelete={(afbId) => onImageDelete(item.id, afbId)}
              onFilesDropped={onAfbeeldingenDropped ?? (() => {})}
            />
          ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Afbeeldingen <span className="text-muted-foreground font-normal">({item.afbeeldingen.length}/2)</span></Label>
              {item.afbeeldingen.length < 2 && (
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageAdd(item.id, e)} />
                  <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ImagePlus className="h-3 w-3" /> Toevoegen
                  </span>
                </label>
              )}
            </div>
            {item.afbeeldingen.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {item.afbeeldingen.map((afb) => {
                  const schaalOpgeslagen = resolveSchaal(afb)
                  const schaal = schaalPreview[afb.id] ?? schaalOpgeslagen
                  const huidigeGrootte: 'klein' | 'normaal' | 'groot' =
                    schaal <= 40 ? 'klein' : schaal <= 75 ? 'normaal' : 'groot'
                  const huidigBlokType: WerkbonBlokType = afb.layout?.blok_type ?? 'foto'
                  const isLogo = huidigBlokType === 'logo'
                  const huidigeTekstPositie: WerkbonTekstPositie = afb.layout?.tekst_positie ?? 'onder'
                  const toonTekstPositieRadio = fase2Actief && !isLogo && aantalFotos === 1
                  const wordtGedragen = draggedAfbId === afb.id
                  return (
                    <div
                      key={afb.id}
                      draggable={canvasActief}
                      onDragStart={(e) => handleAfbDragStart(e, afb.id)}
                      onDragEnd={handleAfbDragEnd}
                      onDragOver={handleAfbDragOver}
                      onDrop={(e) => handleAfbDrop(e, afb.id)}
                      className={`rounded-lg overflow-hidden border transition-opacity ${wordtGedragen ? 'opacity-40' : ''}`}
                    >
                      <div className="relative group">
                        {canvasActief && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onImageBlokTypeChange(item.id, afb.id, isLogo ? 'foto' : 'logo')
                            }}
                            aria-pressed={isLogo}
                            title={isLogo ? 'Schakel naar foto' : 'Schakel naar logo (40×40mm rechtsboven in PDF)'}
                            className={`absolute top-1 right-1 z-10 px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider transition-colors ${
                              isLogo
                                ? 'bg-[#FFFFFF] text-flame border-2 border-flame'
                                : 'bg-white/80 text-muted-foreground'
                            }`}
                          >
                            {isLogo ? 'LOGO' : 'FOTO'}
                          </button>
                        )}
                        {afb.url ? (
                          <div className="w-full aspect-[4/3] flex items-center justify-center cursor-pointer" style={{ backgroundColor: '#F8F7F5' }} onClick={() => onLightbox(afb.url)}>
                            <img
                              src={afb.url}
                              alt={afb.omschrijving || 'Afbeelding'}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            Afbeelding niet beschikbaar
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 active:opacity-100">
                          {afb.url && (
                            <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => onLightbox(afb.url)}>
                              <Maximize2 className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => onImageDelete(item.id, afb.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {fase2Actief && onImageSchaalChange && (
                          <AfbeeldingResizeHandle
                            schaalPercentage={schaal}
                            onSchaalChange={(s) => setSchaalPreview((prev) => ({ ...prev, [afb.id]: s }))}
                            onSchaalCommit={(s) => {
                              setSchaalPreview((prev) => {
                                const next = { ...prev }
                                delete next[afb.id]
                                return next
                              })
                              void onImageSchaalChange(item.id, afb.id, s)
                            }}
                            disabled={!canvasActief}
                          />
                        )}
                      </div>
                      <div className="flex gap-0.5 px-1 py-1 border-t" style={{ backgroundColor: '#F8F7F5', borderColor: '#EBEBEB' }}>
                        {GROOTTE_OPTIES.map((g) => {
                          const active = huidigeGrootte === g
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => onImageGrootteChange(item.id, afb.id, g)}
                              className={`flex-1 h-7 text-[10px] uppercase tracking-wider rounded transition-colors ${active ? 'font-semibold text-white' : 'text-muted-foreground hover:bg-white'}`}
                              style={active ? { backgroundColor: '#F15025' } : undefined}
                              aria-pressed={active}
                            >
                              {GROOTTE_LABEL[g]}
                            </button>
                          )
                        })}
                      </div>
                      {toonTekstPositieRadio && (
                        <div className="flex gap-0.5 px-1 py-1 border-t" style={{ backgroundColor: '#F8F7F5', borderColor: '#EBEBEB' }}>
                          {TEKST_POSITIE_OPTIES.map((p) => {
                            const active = huidigeTekstPositie === p
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => onImageTekstPositieChange(item.id, afb.id, p)}
                                className={`flex-1 h-7 text-[10px] uppercase tracking-wider rounded transition-colors ${active ? 'font-semibold text-white' : 'text-muted-foreground hover:bg-[#FFFFFF]'}`}
                                style={active ? { backgroundColor: '#1A535C' } : undefined}
                                aria-pressed={active}
                                title={`Tekst ${p} van afbeelding`}
                              >
                                {TEKST_POSITIE_LABEL[p]}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {afb.omschrijving && (
                        <p className="text-2xs text-muted-foreground truncate px-1 py-0.5">{afb.omschrijving}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg p-6 text-center">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageAdd(item.id, e)} />
                  <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">Upload een foto (max 2)</p>
                </label>
              </div>
            )}
          </div>
          )}

          <div>
            <Label className="text-xs">Notitie voor monteur</Label>
            <Textarea
              value={notitie}
              onChange={(e) => setNotitie(e.target.value)}
              placeholder="Bijv. Let op: rechts 5mm extra voor omslag"
              className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 min-h-[50px]"
              rows={2}
              enableAiTone={false}
            />
          </div>
        </CardContent>
      </Card>
    </WerkbonDropZone>
  )
})
