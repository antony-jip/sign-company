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
import type { WerkbonItem } from '@/types'

interface WerkbonItemCardProps {
  item: WerkbonItem
  index: number
  totalItems: number
  onUpdate: (itemId: string, updates: Partial<WerkbonItem>) => Promise<void>
  onDelete: (itemId: string) => void
  onMove: (itemId: string, direction: 'up' | 'down') => void
  onImageAdd: (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => void
  onImageDelete: (itemId: string, afbId: string) => void
  onLightbox: (url: string) => void
}

/** Debounced text field — local state for fast typing, debounced callback for persistence */
function useDebouncedField(initialValue: string, onCommit: (val: string) => void, delay = 500) {
  const [localValue, setLocalValue] = useState(initialValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  // Sync with external changes (e.g. after save)
  useEffect(() => { setLocalValue(initialValue) }, [initialValue])

  const handleChange = useCallback((val: string) => {
    setLocalValue(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => commitRef.current(val), delay)
  }, [delay])

  return [localValue, handleChange] as const
}

export const WerkbonItemCard = React.memo(function WerkbonItemCard({
  item, index, totalItems, onUpdate, onDelete, onMove, onImageAdd, onImageDelete, onLightbox,
}: WerkbonItemCardProps) {
  const [omschrijving, setOmschrijving] = useDebouncedField(
    item.omschrijving,
    (val) => onUpdate(item.id, { omschrijving: val }),
  )
  const [notitie, setNotitie] = useDebouncedField(
    item.interne_notitie || '',
    (val) => onUpdate(item.id, { interne_notitie: val || undefined }),
  )

  const handleDimensionChange = useCallback((field: 'afmeting_breedte_mm' | 'afmeting_hoogte_mm', val: string) => {
    onUpdate(item.id, { [field]: val ? Number(val) : undefined })
  }, [item.id, onUpdate])

  return (
    <Card className="overflow-hidden rounded-xl border-black/[0.06]">
      <CardContent className="p-4 space-y-4">
        {/* Item header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GripVertical className="h-4 w-4" />
            <Badge variant="outline" className="text-xs font-mono">#{index + 1}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(item.id, 'up')} disabled={index === 0}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(item.id, 'down')} disabled={index === totalItems - 1}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Omschrijving — local state, debounced save */}
        <div>
          <Label className="text-xs">Omschrijving</Label>
          <Textarea
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            className="text-base font-medium min-h-[60px]"
            placeholder="Omschrijving van het item"
          />
        </div>

        {/* Afmetingen */}
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

        {/* Afmetingen display */}
        {(item.afmeting_breedte_mm || item.afmeting_hoogte_mm) && (
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-lg font-bold font-mono text-foreground">
              {item.afmeting_breedte_mm || '?'} &times; {item.afmeting_hoogte_mm || '?'} mm
            </span>
          </div>
        )}

        {/* Afbeeldingen */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Afbeeldingen</Label>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageAdd(item.id, e)} />
              <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ImagePlus className="h-3 w-3" /> Toevoegen
              </span>
            </label>
          </div>
          {item.afbeeldingen.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {item.afbeeldingen.map((afb) => (
                <div key={afb.id} className="relative group rounded-lg overflow-hidden border bg-muted/30">
                  <img
                    src={afb.url}
                    alt={afb.omschrijving || 'Afbeelding'}
                    className="w-full aspect-[4/3] object-cover cursor-pointer"
                    onClick={() => onLightbox(afb.url)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => onLightbox(afb.url)}>
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => onImageDelete(item.id, afb.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {afb.omschrijving && (
                    <p className="text-2xs text-muted-foreground truncate px-1 py-0.5">{afb.omschrijving}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-6 text-center">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageAdd(item.id, e)} />
                <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">Klik om afbeelding toe te voegen</p>
              </label>
            </div>
          )}
        </div>

        {/* Interne notitie — local state, debounced save */}
        <div>
          <Label className="text-xs">Notitie voor monteur</Label>
          <Textarea
            value={notitie}
            onChange={(e) => setNotitie(e.target.value)}
            placeholder="Bijv. Let op: rechts 5mm extra voor omslag"
            className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 min-h-[50px]"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  )
})
