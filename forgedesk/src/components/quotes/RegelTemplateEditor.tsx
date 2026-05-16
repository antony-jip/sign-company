import React, { useState, useEffect } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Settings, GripVertical, X, Plus, Check, FileText, Save, Pencil, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface RegelTemplate {
  naam: string
  labels: string[]
}

interface RegelTemplateEditorProps {
  labels: string[]
  templates: RegelTemplate[]
  onSaveDefault: (labels: string[]) => Promise<void> | void
  onSaveTemplates: (templates: RegelTemplate[]) => Promise<void> | void
  onApplyTemplate: (labels: string[]) => void
}

export function RegelTemplateEditor({
  labels,
  templates,
  onSaveDefault,
  onSaveTemplates,
  onApplyTemplate,
}: RegelTemplateEditorProps) {
  const [open, setOpen] = useState(false)
  const [editLabels, setEditLabels] = useState<string[]>(labels)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  useEffect(() => {
    if (open) {
      setEditLabels(labels)
      setNewLabel('')
      setShowSaveAs(false)
      setNewTemplateName('')
    }
  }, [open, labels])

  const addLabel = () => {
    const v = newLabel.trim()
    if (!v) return
    if (editLabels.includes(v)) {
      toast.error('Dit label bestaat al')
      return
    }
    setEditLabels([...editLabels, v])
    setNewLabel('')
  }

  const removeAt = (idx: number) => {
    setEditLabels(editLabels.filter((_, i) => i !== idx))
  }

  const updateAt = (idx: number, value: string) => {
    setEditLabels(editLabels.map((l, i) => (i === idx ? value : l)))
  }

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = 'move'
    setDragIdx(idx)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (dragIdx === null || dragIdx === idx) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIdx !== idx) setDragOverIdx(idx)
  }

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }
    const next = [...editLabels]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(targetIdx, 0, moved)
    setEditLabels(next)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const cleanLabels = () => editLabels.map((l) => l.trim()).filter(Boolean)

  const handleSaveDefault = async () => {
    const cleaned = cleanLabels()
    if (cleaned.length === 0) {
      toast.error('Minimaal één label vereist')
      return
    }
    try {
      setSaving(true)
      await onSaveDefault(cleaned)
      toast.success('Standaard opgeslagen')
      setOpen(false)
    } catch (err) {
      toast.error('Kon niet opslaan')
    } finally {
      setSaving(false)
    }
  }

  const handleApply = (t: RegelTemplate) => {
    onApplyTemplate(t.labels)
    setOpen(false)
  }

  const handleLoadIntoEditor = (t: RegelTemplate) => {
    setEditLabels(t.labels)
    toast.success(`"${t.naam}" geladen in editor`)
  }

  const deleteTemplate = async (naam: string) => {
    try {
      const next = templates.filter((t) => t.naam !== naam)
      await onSaveTemplates(next)
      toast.success(`Template "${naam}" verwijderd`)
    } catch {
      toast.error('Kon template niet verwijderen')
    }
  }

  const handleSaveAsTemplate = async () => {
    const naam = newTemplateName.trim()
    if (!naam) {
      toast.error('Geef een naam op')
      return
    }
    if (templates.some((t) => t.naam.toLowerCase() === naam.toLowerCase())) {
      toast.error('Naam bestaat al')
      return
    }
    const cleaned = cleanLabels()
    if (cleaned.length === 0) {
      toast.error('Minimaal één label vereist')
      return
    }
    try {
      setSaving(true)
      await onSaveTemplates([...templates, { naam, labels: cleaned }])
      toast.success(`Template "${naam}" opgeslagen`)
      setShowSaveAs(false)
      setNewTemplateName('')
    } catch {
      toast.error('Kon template niet opslaan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-2 p-1 rounded-md text-[#9B9B95] hover:text-[#1A535C] hover:bg-[rgba(26,83,92,0.06)] transition-colors"
          title="Standaard rij-labels instellen"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0">
        <div className="px-4 pt-3 pb-2 border-b border-border/60">
          <h4 className="font-heading text-[13px] font-bold text-[#1A1A1A]">
            Rij-labels<span className="text-[#F15025]">.</span>
          </h4>
          <p className="text-[11px] text-[#9B9B95] mt-0.5">
            Velden die elk nieuw offerte-item standaard krijgt.
          </p>
        </div>

        {/* Templates */}
        {templates.length > 0 && (
          <div className="px-3 py-2 border-b border-border/60 space-y-1">
            <div className="flex items-center justify-between gap-1.5 pl-1 pb-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#9B9B95] font-semibold">
                <FileText className="h-3 w-3" />
                Templates
              </div>
              <span className="text-[10px] text-[#9B9B95]">
                Klik om toe te passen
              </span>
            </div>
            {templates.map((t) => (
              <div
                key={t.naam}
                className="flex items-center gap-1.5 group rounded-md border border-[#EBEBEB] hover:border-[rgba(26,83,92,0.25)] hover:bg-[rgba(26,83,92,0.03)] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleApply(t)}
                  className="flex-1 text-left px-2.5 py-2 min-w-0"
                  title={`Toepassen: ${t.labels.join(' · ')}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#1A1A1A] truncate">
                      {t.naam}
                    </span>
                    <span className="text-[10px] text-[#9B9B95] font-normal flex-shrink-0">
                      {t.labels.length} velden
                    </span>
                    <ArrowRight className="h-3 w-3 text-[#F15025] opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
                  </div>
                  <div className="text-[10px] text-[#9B9B95] truncate mt-0.5">
                    {t.labels.join(' · ')}
                  </div>
                </button>
                <div className="flex items-center gap-0.5 pr-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLoadIntoEditor(t)
                    }}
                    className="text-[#9B9B95] hover:text-[#1A535C] p-1 rounded transition-colors"
                    title="Bewerk in editor"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteTemplate(t.naam)
                    }}
                    className="text-[#9B9B95] hover:text-[#C44830] p-1 rounded transition-colors"
                    title="Verwijder template"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Editor */}
        <div className="px-3 py-2 space-y-1 max-h-72 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-[#9B9B95] font-semibold pl-1 pb-0.5">
            Labels
          </div>
          {editLabels.map((label, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-1.5 group rounded transition-colors',
                dragOverIdx === idx && dragIdx !== null ? 'bg-primary/5 ring-1 ring-primary/30' : '',
                dragIdx === idx ? 'opacity-40' : ''
              )}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <button
                type="button"
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
                className="text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0 p-0.5 cursor-grab active:cursor-grabbing"
                title="Sleep om volgorde te wijzigen"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
              <Input
                value={label}
                onChange={(e) => updateAt(idx, e.target.value)}
                className="flex-1 h-7 text-xs"
              />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="text-muted-foreground/50 hover:text-red-500 flex-shrink-0 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                title="Verwijder"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-1.5 pt-1">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addLabel()
                }
              }}
              placeholder="Nieuw label..."
              className="flex-1 h-7 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addLabel}
              className="h-7 px-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Save-as-template */}
        {showSaveAs ? (
          <div className="px-3 py-2 border-t border-border/60 bg-[rgba(26,83,92,0.03)] space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-[#9B9B95] font-semibold pl-1">
              Opslaan als template
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveAsTemplate()
                  }
                }}
                placeholder="Template-naam..."
                className="flex-1 h-7 text-xs"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSaveAsTemplate}
                disabled={saving}
                className="h-7 px-2 text-xs bg-[#1A535C] hover:bg-[#163E45] text-white"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSaveAs(false)
                  setNewTemplateName('')
                }}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* Footer acties */}
        <div className="px-3 py-2 border-t border-border/60 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveAs((v) => !v)}
            className="h-7 px-2 text-xs text-[#6B6B66] hover:text-[#1A1A1A]"
          >
            <Save className="h-3 w-3 mr-1" />
            Bewaar als template
          </Button>
          <Button
            type="button"
            onClick={handleSaveDefault}
            disabled={saving}
            size="sm"
            className="h-7 px-3 text-xs bg-[#F15025] hover:bg-[#D9421C] text-white"
          >
            <Check className="h-3 w-3 mr-1" />
            {saving ? 'Opslaan...' : 'Standaard'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
