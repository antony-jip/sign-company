import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus, Calculator, ChevronDown, ChevronUp, Copy, Check, X, Ruler, ToggleLeft, ToggleRight, Lock, AlertTriangle, Paperclip, Clipboard, Upload, Image as ImageIcon } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { CalculatieModal } from './CalculatieModal'
import { AutofillInput } from './AutofillInput'
import { INKOOP_DRAG_TYPE, type InkoopDragData } from './InkoopOffertePaneel'
import { labelToAutofillField } from '@/utils/autofillUtils'
import type { CalculatieRegel } from '@/types'
import { round2 } from '@/utils/budgetUtils'
import { uploadFile, downloadFile, deleteFile } from '@/services/storageService'
import { createDocument, getSigningVisualisatiesByOfferte } from '@/services/supabaseService'
import type { SigningVisualisatie } from '@/types'

// ============================================================
// OFFERTE ITEMS
//
// Elk item is 1 complete "calculatie":
//   1. Item naam (titel bovenaan)
//   2. Beschrijving-regels — dynamisch: toevoegen, verwijderen, aanpassen
//      Default: Omschrijving, Aantal, Afmeting, Materiaal, Lay-out, Montage, Opmerking
//   3. Prijsberekening — Aantal × Prijs [Calculator] | BTW | Korting | = Totaal
//
// De Calculator (CalculatieModal) zit achter de prijs voor
// gedetailleerde inkoop/verkoop/marge berekening.
// ============================================================

export interface DetailRegel {
  id: string
  label: string
  waarde: string
}

export const DEFAULT_DETAIL_LABELS = [
  'Omschrijving',
  'Aantal',
  'Afmeting',
  'Materiaal',
  'Lay-out',
  'Montage',
  'Opmerking',
]

export interface PrijsVariant {
  id: string
  label: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  calculatie_regels?: CalculatieRegel[]
  heeft_calculatie?: boolean
}

export interface QuoteLineItem {
  id: string
  soort: 'prijs' | 'tekst'
  beschrijving: string
  extra_velden: Record<string, string>
  detail_regels?: DetailRegel[]
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  totaal: number
  calculatie_regels?: CalculatieRegel[]
  heeft_calculatie?: boolean
  prijs_varianten?: PrijsVariant[]
  actieve_variant_id?: string
  // Afmetingen (FIX 9)
  breedte_mm?: number
  hoogte_mm?: number
  oppervlakte_m2?: number
  afmeting_vrij?: boolean
  // Foto (FIX 10)
  foto_url?: string
  foto_op_offerte?: boolean
  // Optioneel item (FIX 13)
  is_optioneel?: boolean
  // Interne notitie (FIX 15)
  interne_notitie?: string
  // Bijlage tekening/foto per item
  bijlage_url?: string
  bijlage_type?: 'image/jpeg' | 'image/png' | 'application/pdf'
  bijlage_naam?: string
}

export interface OmschrijvingSuggestie {
  beschrijving: string
  eenheid?: string
  laatstePrijs?: number
}

interface QuoteItemsTableProps {
  items: QuoteLineItem[]
  onAddItem: () => void
  onUpdateItem: (id: string, field: keyof QuoteLineItem, value: QuoteLineItem[keyof QuoteLineItem]) => void
  onRemoveItem: (id: string) => void
  userId?: string
  onUpdateItemWithCalculatie?: (
    id: string,
    data: {
      beschrijving: string
      eenheidsprijs: number
      calculatie_regels: CalculatieRegel[]
    }
  ) => void
  onUpdateItemWithVariantCalculatie?: (
    itemId: string,
    variantId: string,
    data: {
      beschrijving: string
      eenheidsprijs: number
      calculatie_regels: CalculatieRegel[]
    }
  ) => void
  suggesties?: OmschrijvingSuggestie[]
  onCopyItem?: (item: QuoteLineItem) => void
  onCopyAllItems?: () => void
  clipboardCount?: number
  onPasteItems?: () => void
  onClearClipboard?: () => void
  toonM2?: boolean
  projectId?: string
  klantId?: string
  offerteId?: string
}

function calculateLineTotaal(item: QuoteLineItem): number {
  // If item has variants, use the active variant for the total
  if (item.prijs_varianten && item.prijs_varianten.length > 0) {
    const active = item.prijs_varianten.find(v => v.id === item.actieve_variant_id) || item.prijs_varianten[0]
    const bruto = round2(active.aantal * active.eenheidsprijs)
    return round2(bruto - bruto * (active.korting_percentage / 100))
  }
  const bruto = round2(item.aantal * item.eenheidsprijs)
  return round2(bruto - bruto * (item.korting_percentage / 100))
}

function calculateVariantTotaal(variant: PrijsVariant): number {
  const bruto = round2(variant.aantal * variant.eenheidsprijs)
  return round2(bruto - bruto * (variant.korting_percentage / 100))
}

function genId(): string {
  return `dr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Margin calculation per item (FIX 8) ──
function calculateItemMargin(regels?: CalculatieRegel[]): { inkoop: number; verkoop: number; marge: number; percentage: number } | null {
  if (!regels || regels.length === 0) return null
  const inkoop = round2(regels.reduce((s, r) => s + r.inkoop_prijs * r.aantal, 0))
  const verkoop = round2(regels.reduce((s, r) => s + r.verkoop_prijs * r.aantal, 0))
  const marge = round2(verkoop - inkoop)
  const percentage = verkoop > 0 ? Math.round((marge / verkoop) * 1000) / 10 : 0
  return { inkoop, verkoop, marge, percentage }
}

// ── Image compression utility ──
function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w)
          w = maxWidth
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not supported')); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Upload bijlage to storage and return stored path ──
// Path must start with userId for Supabase RLS policy: auth.uid() = foldername[1]
async function uploadBijlage(file: File, itemId: string, userId?: string): Promise<{ url: string; type: string; naam: string }> {
  const ext = file.name.split('.').pop() || 'jpg'
  const prefix = userId || 'local'
  const storagePath = `${prefix}/offerte-bijlagen/${itemId}/${Date.now()}.${ext}`

  if (file.type === 'application/pdf') {
    await uploadFile(file, storagePath)
    return { url: storagePath, type: file.type, naam: file.name }
  }

  // Compress image before uploading
  const compressedDataUrl = await compressImage(file)
  const response = await fetch(compressedDataUrl)
  const blob = await response.blob()
  const compressedFile = new File([blob], file.name, { type: 'image/jpeg' })
  await uploadFile(compressedFile, storagePath)
  return { url: storagePath, type: 'image/jpeg', naam: file.name }
}

// ── Save bijlage also as project photo ──
async function saveBijlageToProject(
  storagePath: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  projectId: string,
  klantId: string | undefined,
  userId: string,
  itemBeschrijving: string
) {
  try {
    await createDocument({
      user_id: userId,
      project_id: projectId,
      klant_id: klantId || null,
      naam: fileName,
      type: fileType,
      grootte: fileSize,
      map: "Situatiefoto's",
      storage_path: storagePath,
      status: 'definitief',
      tags: ['foto', 'situatie', 'offerte-bijlage'],
      gedeeld_met: [],
      beschrijving: itemBeschrijving ? `Bijlage bij: ${itemBeschrijving}` : '',
    })
  } catch {
    // Non-critical: don't block the bijlage upload itself
  }
}

// ── Hook to resolve storage path to displayable URL ──
function useBijlageUrl(storagePath?: string): string {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!storagePath) { setUrl(''); return }
    // If it's already a data URL or http URL, use directly
    if (storagePath.startsWith('data:') || storagePath.startsWith('http')) {
      setUrl(storagePath)
      return
    }
    let cancelled = false
    downloadFile(storagePath).then(resolved => {
      if (!cancelled) setUrl(resolved)
    }).catch(() => {
      if (!cancelled) setUrl('')
    })
    return () => { cancelled = true }
  }, [storagePath])
  return url
}

// ── BijlageDropZone component ──
function BijlageDropZone({
  item,
  isDragOver,
  isUploading,
  onDragOver,
  onDragLeave,
  onDrop,
  onPaste,
  onFileSelect,
  onRemove,
  visualisaties = [],
  onSelectVisualisatie,
}: {
  item: QuoteLineItem
  isDragOver: boolean
  isUploading: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onPaste: (e: React.ClipboardEvent) => void
  onFileSelect: (file: File) => void
  onRemove: () => void
  visualisaties?: SigningVisualisatie[]
  onSelectVisualisatie?: (v: SigningVisualisatie) => void
}) {
  const resolvedUrl = useBijlageUrl(item.bijlage_url)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expanded, setExpanded] = useState(false)
  const hasBijlage = !!(item.bijlage_url && resolvedUrl)
  const hasContent = hasBijlage || visualisaties.length > 0
  const [sectionOpen, setSectionOpen] = useState(hasBijlage)

  return (
    <div
      className="px-4 py-2 border-b border-border dark:border-border outline-none"
      onPaste={onPaste}
      tabIndex={0}
    >
      <button
        type="button"
        onClick={() => setSectionOpen(!sectionOpen)}
        className="flex items-center gap-2 w-full text-left"
      >
        <div className="flex items-center justify-center h-5 w-5 rounded bg-violet-100 dark:bg-violet-900/30">
          <ImageIcon className="h-3 w-3 text-violet-500 dark:text-violet-400" />
        </div>
        <span className="text-xs font-bold text-text-tertiary uppercase tracking-label">Tekening / Bijlage</span>
        {!sectionOpen && hasContent && (
          <span className="text-2xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
            {hasBijlage ? item.bijlage_naam || '1 bestand' : `${visualisaties.length} voorbeeld${visualisaties.length > 1 ? 'en' : ''}`}
          </span>
        )}
        <ChevronDown className={cn(
          'h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform duration-200',
          sectionOpen && 'rotate-180'
        )} />
      </button>

      {!sectionOpen ? null : isUploading ? (
        <div className="mt-2 rounded-lg border-2 border-dashed border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 flex items-center justify-center gap-2 py-4">
          <div className="h-4 w-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">Uploaden...</span>
        </div>
      ) : item.bijlage_url && resolvedUrl ? (
        <div className="mt-2 relative group rounded-lg overflow-hidden bg-muted/40 dark:bg-muted/20 border border-border">
          {item.bijlage_type === 'application/pdf' ? (
            <div className="flex items-center gap-3 p-4">
              <div className="h-12 w-12 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex items-center justify-center flex-shrink-0">
                <Paperclip className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.bijlage_naam || 'Document.pdf'}</p>
                <p className="text-xs text-muted-foreground">PDF document</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img
                src={resolvedUrl}
                alt={item.beschrijving || 'Item bijlage'}
                onClick={() => setExpanded(!expanded)}
                className={cn(
                  'w-full rounded-lg object-contain cursor-pointer transition-all duration-200',
                  expanded ? 'max-h-[400px]' : 'max-h-[120px]'
                )}
              />
              <button
                onClick={() => setExpanded(!expanded)}
                className="absolute bottom-2 right-2 text-2xs font-medium px-2 py-1 rounded-md bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                {expanded ? 'Kleiner' : 'Groter'}
              </button>
            </div>
          )}
          {/* Delete button */}
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-card/90 dark:bg-card/90 border border-border dark:border-border text-muted-foreground/60 hover:text-red-500 hover:border-red-300 dark:hover:border-red-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm backdrop-blur-sm"
            title="Bijlage verwijderen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            'mt-2 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer',
            'flex flex-col items-center justify-center gap-1.5 py-3',
            isDragOver
              ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 scale-[1.01] shadow-sm'
              : 'border-border hover:border-violet-300 dark:hover:border-violet-700 hover:bg-gradient-to-br hover:from-violet-50/50 hover:to-indigo-50/50 dark:hover:from-violet-950/20 dark:hover:to-indigo-950/20'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={cn(
            'h-7 w-7 rounded-full flex items-center justify-center transition-colors',
            isDragOver
              ? 'bg-violet-100 dark:bg-violet-900/40'
              : 'bg-muted dark:bg-muted'
          )}>
            <Upload className={cn(
              'h-3.5 w-3.5 transition-colors',
              isDragOver
                ? 'text-violet-500 dark:text-violet-400'
                : 'text-muted-foreground/60 dark:text-muted-foreground'
            )} />
          </div>
          <div className="text-center">
            <p className={cn(
              'text-xs font-medium transition-colors',
              isDragOver
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-muted-foreground dark:text-muted-foreground/60'
            )}>
              {isDragOver ? 'Laat los om te uploaden' : 'Sleep, plak of klik om te uploaden'}
            </p>
            <p className="text-2xs text-muted-foreground/60 dark:text-muted-foreground mt-0.5">JPG, PNG of PDF — max 10MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileSelect(file)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {/* ── Gegenereerde visualisaties van deze offerte ── */}
      {visualisaties.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-1.5">
            Gegenereerde voorbeelden
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {visualisaties.map((v) => (
              <div
                key={v.id}
                onClick={() => onSelectVisualisatie?.(v)}
                className="relative group cursor-pointer rounded-md overflow-hidden border border-border dark:border-border hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-md transition-all w-[80px] flex-shrink-0"
                title="Klik om als tekening te gebruiken"
              >
                <img
                  src={v.resultaat_url}
                  alt="Visualisatie voorbeeld"
                  className="w-full h-[56px] object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="text-white text-2xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded">
                    Gebruiken
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getMargeColor(pct: number): { text: string; bg: string; bar: string } {
  if (pct >= 65) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', bar: 'bg-green-500' }
  if (pct >= 50) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', bar: 'bg-amber-500' }
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', bar: 'bg-red-500' }
}

function AutocompleteInput({
  value,
  onChange,
  suggesties,
  placeholder,
  className,
}: {
  value: string
  onChange: (val: string) => void
  suggesties: OmschrijvingSuggestie[]
  placeholder?: string
  className?: string
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = value.trim().length > 0
    ? suggesties.filter((s) =>
        s.beschrijving.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
    : suggesties.slice(0, 8)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      onChange(filtered[focusedIndex].beschrijving)
      setShowSuggestions(false)
      setFocusedIndex(-1)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }, [showSuggestions, filtered, focusedIndex, onChange])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (suggesties.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setShowSuggestions(true)
          setFocusedIndex(-1)
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border dark:border-border rounded-lg shadow-lg max-h-48 overflow-auto">
          {filtered.map((s, i) => (
            <button
              key={s.beschrijving}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2',
                i === focusedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted dark:hover:bg-muted'
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(s.beschrijving)
                setShowSuggestions(false)
              }}
            >
              <span className="truncate">{s.beschrijving}</span>
              {s.laatstePrijs != null && s.laatstePrijs > 0 && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatCurrency(s.laatstePrijs)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function QuoteItemsTable({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  userId,
  onUpdateItemWithCalculatie,
  onUpdateItemWithVariantCalculatie,
  suggesties = [],
  onCopyItem,
  onCopyAllItems,
  clipboardCount = 0,
  onPasteItems,
  onClearClipboard,
  toonM2 = true,
  projectId,
  klantId,
  offerteId,
}: QuoteItemsTableProps) {
  // Calculatie modal
  const [calculatieOpen, setCalculatieOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null)
  // Collapsed state per item
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())
  // Inkoop drag-drop state
  const [inkoopDropTargetId, setInkoopDropTargetId] = useState<string | null>(null)
  // Bijlage upload state
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
  // Visualisaties voor deze offerte (voor in de tekening/bijlage sectie)
  const [visualisaties, setVisualisaties] = useState<SigningVisualisatie[]>([])
  useEffect(() => {
    if (!offerteId) return
    let cancelled = false
    getSigningVisualisatiesByOfferte(offerteId).then(items => {
      if (!cancelled) setVisualisaties(items)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [offerteId])

  const activeItem = items.find((i) => i.id === activeItemId)
  const activeVariant = activeItem?.prijs_varianten?.find(v => v.id === activeVariantId)

  const openCalculatie = (itemId: string, variantId?: string) => {
    setActiveItemId(itemId)
    setActiveVariantId(variantId || null)
    setCalculatieOpen(true)
  }

  const handleCalculatieConfirm = (data: {
    regels: CalculatieRegel[]
    totaalVerkoop: number
    totaalInkoop: number
    beschrijving: string
  }) => {
    if (!activeItemId) return
    // If this is for a variant, delegate to variant handler
    if (activeVariantId && onUpdateItemWithVariantCalculatie) {
      onUpdateItemWithVariantCalculatie(activeItemId, activeVariantId, {
        beschrijving: data.beschrijving,
        eenheidsprijs: data.totaalVerkoop,
        calculatie_regels: data.regels,
      })
    } else if (onUpdateItemWithCalculatie) {
      onUpdateItemWithCalculatie(activeItemId, {
        beschrijving: data.beschrijving,
        eenheidsprijs: data.totaalVerkoop,
        calculatie_regels: data.regels,
      })
    } else {
      onUpdateItem(activeItemId, 'beschrijving', data.beschrijving)
      onUpdateItem(activeItemId, 'eenheidsprijs', data.totaalVerkoop)
    }
    setCalculatieOpen(false)
    setActiveItemId(null)
    setActiveVariantId(null)
  }

  // ── Prijs varianten handlers ──
  const addPrijsVariant = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    const existingVarianten = item.prijs_varianten || []

    // If no variants yet, create the first one from existing price fields + a new empty one
    if (existingVarianten.length === 0) {
      const firstVariant: PrijsVariant = {
        id: genId(),
        label: 'Optie A',
        aantal: item.aantal,
        eenheidsprijs: item.eenheidsprijs,
        btw_percentage: item.btw_percentage,
        korting_percentage: item.korting_percentage,
        calculatie_regels: item.calculatie_regels,
        heeft_calculatie: item.heeft_calculatie,
      }
      const secondVariant: PrijsVariant = {
        id: genId(),
        label: 'Optie B',
        aantal: item.aantal,
        eenheidsprijs: 0,
        btw_percentage: item.btw_percentage,
        korting_percentage: 0,
      }
      onUpdateItem(itemId, 'prijs_varianten', [firstVariant, secondVariant])
      onUpdateItem(itemId, 'actieve_variant_id', firstVariant.id)
    } else {
      // Add a new variant based on the last one
      const lastVariant = existingVarianten[existingVarianten.length - 1]
      const letter = String.fromCharCode(65 + existingVarianten.length) // A, B, C, ...
      const newVariant: PrijsVariant = {
        id: genId(),
        label: `Optie ${letter}`,
        aantal: lastVariant.aantal,
        eenheidsprijs: 0,
        btw_percentage: lastVariant.btw_percentage,
        korting_percentage: 0,
      }
      onUpdateItem(itemId, 'prijs_varianten', [...existingVarianten, newVariant])
    }
  }

  const removePrijsVariant = (itemId: string, variantId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item || !item.prijs_varianten) return

    const updated = item.prijs_varianten.filter(v => v.id !== variantId)

    // If only one variant left, collapse back to single price
    if (updated.length <= 1) {
      const remaining = updated[0]
      if (remaining) {
        onUpdateItem(itemId, 'aantal', remaining.aantal)
        onUpdateItem(itemId, 'eenheidsprijs', remaining.eenheidsprijs)
        onUpdateItem(itemId, 'btw_percentage', remaining.btw_percentage)
        onUpdateItem(itemId, 'korting_percentage', remaining.korting_percentage)
        onUpdateItem(itemId, 'calculatie_regels', remaining.calculatie_regels || [])
        onUpdateItem(itemId, 'heeft_calculatie', remaining.heeft_calculatie || false)
      }
      onUpdateItem(itemId, 'prijs_varianten', undefined as unknown as PrijsVariant[])
      onUpdateItem(itemId, 'actieve_variant_id', undefined as unknown as string)
    } else {
      onUpdateItem(itemId, 'prijs_varianten', updated)
      // If the removed variant was active, switch to the first remaining
      if (item.actieve_variant_id === variantId) {
        onUpdateItem(itemId, 'actieve_variant_id', updated[0].id)
      }
    }
  }

  const updatePrijsVariantField = (
    itemId: string,
    variantId: string,
    field: keyof PrijsVariant,
    value: string | number | boolean | CalculatieRegel[] | undefined
  ) => {
    const item = items.find((i) => i.id === itemId)
    if (!item || !item.prijs_varianten) return
    const updated = item.prijs_varianten.map(v =>
      v.id === variantId ? { ...v, [field]: value } : v
    )
    onUpdateItem(itemId, 'prijs_varianten', updated)
  }

  const setActieveVariant = (itemId: string, variantId: string) => {
    onUpdateItem(itemId, 'actieve_variant_id', variantId)
  }

  // ── Inkoop drag-drop handlers ──
  const handleInkoopDragOver = (e: React.DragEvent, itemId: string) => {
    if (e.dataTransfer.types.includes(INKOOP_DRAG_TYPE)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setInkoopDropTargetId(itemId)
    }
  }

  const handleInkoopDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the item entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setInkoopDropTargetId(null)
    }
  }

  const handleInkoopDrop = (e: React.DragEvent, itemId: string) => {
    e.preventDefault()
    setInkoopDropTargetId(null)
    const raw = e.dataTransfer.getData(INKOOP_DRAG_TYPE)
    if (!raw) return
    try {
      const data: InkoopDragData = JSON.parse(raw)
      const item = items.find(i => i.id === itemId)
      if (!item) return

      // Sla de inkoopprijs op in calculatie en vul verkoopprijs
      const calcRegel: CalculatieRegel = {
        id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_naam: data.omschrijving,
        categorie: 'Materiaal',
        eenheid: data.eenheid || 'stuks',
        aantal: data.aantal,
        inkoop_prijs: round2(data.prijs_per_stuk),
        verkoop_prijs: round2(data.prijs_per_stuk),
        marge_percentage: 0,
        korting_percentage: 0,
        nacalculatie: false,
        btw_percentage: 21,
        notitie: data.leverancier ? `Inkoop via ${data.leverancier}` : '',
      }

      // Update the item with the dropped inkoop data
      if (onUpdateItemWithCalculatie) {
        const existingRegels = item.calculatie_regels || []
        onUpdateItemWithCalculatie(itemId, {
          beschrijving: item.beschrijving || data.omschrijving,
          eenheidsprijs: round2(data.prijs_per_stuk * data.aantal),
          calculatie_regels: [...existingRegels, calcRegel],
        })
      } else {
        onUpdateItem(itemId, 'eenheidsprijs', round2(data.prijs_per_stuk))
        onUpdateItem(itemId, 'aantal', data.aantal)
        if (!item.beschrijving) {
          onUpdateItem(itemId, 'beschrijving', data.omschrijving)
        }
      }
    } catch {
      // Invalid drag data
    }
  }

  const toggleCollapse = (id: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Detail regels handlers ──
  const getDetailRegels = (item: QuoteLineItem): DetailRegel[] => {
    return item.detail_regels || []
  }

  const updateDetailRegels = (itemId: string, regels: DetailRegel[]) => {
    onUpdateItem(itemId, 'detail_regels', regels)
  }

  const addDetailRegel = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const regels = getDetailRegels(item)
    updateDetailRegels(itemId, [...regels, { id: genId(), label: '', waarde: '' }])
  }

  const removeDetailRegel = (itemId: string, regelId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const regels = getDetailRegels(item).filter((r) => r.id !== regelId)
    updateDetailRegels(itemId, regels)
  }

  const duplicateDetailRegel = (itemId: string, regelId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const regels = getDetailRegels(item)
    const idx = regels.findIndex((r) => r.id === regelId)
    if (idx === -1) return
    const original = regels[idx]
    const copy = { ...original, id: genId(), waarde: '' }
    const updated = [...regels]
    updated.splice(idx + 1, 0, copy)
    updateDetailRegels(itemId, updated)
  }

  const updateDetailRegelField = (
    itemId: string,
    regelId: string,
    field: 'label' | 'waarde',
    value: string
  ) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const regels = getDetailRegels(item).map((r) =>
      r.id === regelId ? { ...r, [field]: value } : r
    )
    updateDetailRegels(itemId, regels)
  }

  return (
    <div className="space-y-4">
      {/* ========= ITEM BLOKKEN ========= */}
      {items.map((item, index) => {
        const isCollapsed = collapsedItems.has(item.id)
        const lineTotaal = calculateLineTotaal(item)
        const detailRegels = getDetailRegels(item)

        return (
          <div
            key={item.id}
            className="rounded-xl border border-border dark:border-border bg-card overflow-hidden shadow-sm"
          >
            {/* ──── HEADER: nummer + item naam + optioneel badge + totaal + acties ──── */}
            <div className={cn(
              "flex items-center gap-3 px-4 py-2 border-b border-border dark:border-border",
              item.is_optioneel
                ? "bg-amber-50/60 dark:bg-amber-900/10 border-dashed"
                : "bg-background/80 dark:bg-muted/50"
            )}>
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0",
                item.is_optioneel
                  ? "bg-amber-200 dark:bg-amber-800/50"
                  : "bg-gradient-to-br from-accent to-primary"
              )}>
                <span className={cn("text-xs font-bold", item.is_optioneel ? "text-amber-700 dark:text-amber-300" : "text-white")}>{index + 1}</span>
              </div>

              <AutocompleteInput
                value={item.beschrijving}
                onChange={(val) => onUpdateItem(item.id, 'beschrijving', val)}
                suggesties={suggesties}
                placeholder="Item naam..."
                className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-9 text-sm font-semibold flex-1 placeholder:font-normal"
              />

              {/* FIX 13: Optioneel badge */}
              {item.is_optioneel && (
                <span className="text-2xs font-bold uppercase tracking-label text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
                  Optioneel
                </span>
              )}

              {/* FIX 15: Interne notitie indicator */}
              {item.interne_notitie && (
                <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0" title="Heeft interne notitie">
                  <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                </div>
              )}

              <span className={cn(
                "text-base font-bold font-mono flex-shrink-0 min-w-[90px] text-right tabular-nums",
                item.is_optioneel ? "text-muted-foreground" : "text-foreground"
              )}>
                {formatCurrency(lineTotaal)}
              </span>

              {/* Optioneel toggle */}
              <button
                onClick={() => onUpdateItem(item.id, 'is_optioneel', !item.is_optioneel)}
                className={cn(
                  "flex-shrink-0 p-1 rounded transition-colors",
                  item.is_optioneel
                    ? "text-amber-600 dark:text-amber-400 hover:text-amber-700"
                    : "text-muted-foreground/50 hover:text-amber-500 dark:text-muted-foreground dark:hover:text-amber-400"
                )}
                title={item.is_optioneel ? 'Maak verplicht' : 'Maak optioneel'}
              >
                {item.is_optioneel ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              </button>

              <button
                onClick={() => toggleCollapse(item.id)}
                className="text-muted-foreground/60 hover:text-muted-foreground dark:hover:text-muted-foreground/50 flex-shrink-0 p-1"
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>

              {onCopyItem && (
                <button
                  onClick={() => onCopyItem(item)}
                  className="text-muted-foreground/60 hover:text-blue-500 flex-shrink-0 p-1"
                  title="Kopieer naar klembord"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-muted-foreground/60 hover:text-red-500 flex-shrink-0 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* ──── BODY: afmetingen + foto + beschrijving-regels + prijsberekening ──── */}
            {!isCollapsed && (
              <>
                {/* ── FIX 9: Afmetingen B×H ── */}
                <div className="px-4 py-2.5 border-b border-border dark:border-border">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-text-tertiary uppercase tracking-label">Afmetingen</span>
                    <button
                      onClick={() => onUpdateItem(item.id, 'afmeting_vrij', !item.afmeting_vrij)}
                      className="ml-auto flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors"
                      title={item.afmeting_vrij ? 'Schakel naar B×H invoer' : 'Schakel naar vrije tekst'}
                    >
                      {item.afmeting_vrij ? <ToggleRight className="h-3.5 w-3.5 text-primary" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {item.afmeting_vrij ? 'Vrij tekst' : 'B × H'}
                    </button>
                  </div>

                  {item.afmeting_vrij ? (
                    // Free-text fallback: use the "Afmeting" detail regel if exists, or show an input
                    <Input
                      value={(() => {
                        const afmetingRegel = detailRegels.find(r => r.label.toLowerCase() === 'afmeting')
                        return afmetingRegel?.waarde || ''
                      })()}
                      onChange={(e) => {
                        const afmetingRegel = detailRegels.find(r => r.label.toLowerCase() === 'afmeting')
                        if (afmetingRegel) {
                          updateDetailRegelField(item.id, afmetingRegel.id, 'waarde', e.target.value)
                        }
                      }}
                      placeholder="Bijv. 3000 x 1500 mm, 2 m²"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="space-y-0.5 w-24">
                        <label className="text-2xs text-muted-foreground">Breedte (mm)</label>
                        <Input
                          type="number"
                          value={item.breedte_mm || ''}
                          onChange={(e) => {
                            const b = Math.max(0, parseFloat(e.target.value) || 0)
                            onUpdateItem(item.id, 'breedte_mm', b)
                            const h = item.hoogte_mm || 0
                            if (b > 0 && h > 0) {
                              onUpdateItem(item.id, 'oppervlakte_m2', Math.round((b / 1000) * (h / 1000) * 10000) / 10000)
                            }
                          }}
                          min={0}
                          className="h-8 text-sm"
                        />
                      </div>
                      <span className="text-muted-foreground text-sm pt-4">×</span>
                      <div className="space-y-0.5 w-24">
                        <label className="text-2xs text-muted-foreground">Hoogte (mm)</label>
                        <Input
                          type="number"
                          value={item.hoogte_mm || ''}
                          onChange={(e) => {
                            const h = Math.max(0, parseFloat(e.target.value) || 0)
                            onUpdateItem(item.id, 'hoogte_mm', h)
                            const b = item.breedte_mm || 0
                            if (b > 0 && h > 0) {
                              onUpdateItem(item.id, 'oppervlakte_m2', Math.round((b / 1000) * (h / 1000) * 10000) / 10000)
                            }
                          }}
                          min={0}
                          className="h-8 text-sm"
                        />
                      </div>
                      {toonM2 && ((item.breedte_mm || 0) > 0 && (item.hoogte_mm || 0) > 0) && (
                        <div className="pt-4 flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">=</span>
                          <span className="text-sm font-medium font-mono text-foreground tabular-nums">
                            {(item.oppervlakte_m2 || ((item.breedte_mm || 0) / 1000) * ((item.hoogte_mm || 0) / 1000)).toFixed(2)} m²
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── TEKENING / BIJLAGE per item ── */}
                <BijlageDropZone
                  item={item}
                  isDragOver={dragOverItemId === item.id}
                  isUploading={uploadingItemId === item.id}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverItemId(item.id) }}
                  onDragLeave={() => setDragOverItemId(null)}
                  onDrop={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOverItemId(null)
                    const file = e.dataTransfer.files?.[0]
                    if (!file) return
                    if (!file.type.match(/^(image\/(jpeg|png)|application\/pdf)$/)) {
                      alert('Alleen JPG, PNG of PDF bestanden')
                      return
                    }
                    if (file.size > 10 * 1024 * 1024) {
                      alert('Bestand is te groot (max 10MB)')
                      return
                    }
                    setUploadingItemId(item.id)
                    try {
                      const result = await uploadBijlage(file, item.id, userId)
                      onUpdateItem(item.id, 'bijlage_url', result.url)
                      onUpdateItem(item.id, 'bijlage_type', result.type as 'image/jpeg')
                      onUpdateItem(item.id, 'bijlage_naam', result.naam)
                      if (projectId && userId) {
                        saveBijlageToProject(result.url, result.naam, result.type, file.size, projectId, klantId, userId, item.beschrijving)
                      }
                    } catch (err) {
                      alert('Upload mislukt: ' + (err instanceof Error ? err.message : 'Onbekende fout'))
                    } finally {
                      setUploadingItemId(null)
                    }
                  }}
                  onPaste={async (e) => {
                    const items_clipboard = e.clipboardData?.items
                    if (!items_clipboard) return
                    for (const clipItem of Array.from(items_clipboard)) {
                      if (clipItem.type.startsWith('image/')) {
                        e.preventDefault()
                        const file = clipItem.getAsFile()
                        if (!file) return
                        setUploadingItemId(item.id)
                        try {
                          const result = await uploadBijlage(file, item.id, userId)
                          onUpdateItem(item.id, 'bijlage_url', result.url)
                          onUpdateItem(item.id, 'bijlage_type', result.type as 'image/jpeg')
                          onUpdateItem(item.id, 'bijlage_naam', result.naam)
                          if (projectId && userId) {
                            saveBijlageToProject(result.url, result.naam, result.type, file.size, projectId, klantId, userId, item.beschrijving)
                          }
                        } catch (err) {
                          alert('Plakken mislukt: ' + (err instanceof Error ? err.message : 'Onbekende fout'))
                        } finally {
                          setUploadingItemId(null)
                        }
                        return
                      }
                    }
                  }}
                  onFileSelect={async (file) => {
                    if (file.size > 10 * 1024 * 1024) {
                      alert('Bestand is te groot (max 10MB)')
                      return
                    }
                    setUploadingItemId(item.id)
                    try {
                      const result = await uploadBijlage(file, item.id, userId)
                      onUpdateItem(item.id, 'bijlage_url', result.url)
                      onUpdateItem(item.id, 'bijlage_type', result.type as 'image/jpeg')
                      onUpdateItem(item.id, 'bijlage_naam', result.naam)
                      if (projectId && userId) {
                        saveBijlageToProject(result.url, result.naam, result.type, file.size, projectId, klantId, userId, item.beschrijving)
                      }
                    } catch (err) {
                      alert('Upload mislukt: ' + (err instanceof Error ? err.message : 'Onbekende fout'))
                    } finally {
                      setUploadingItemId(null)
                    }
                  }}
                  onRemove={async () => {
                    // Delete from storage if it's a storage path (not a data URL or http URL)
                    if (item.bijlage_url && !item.bijlage_url.startsWith('data:') && !item.bijlage_url.startsWith('http')) {
                      try { await deleteFile(item.bijlage_url) } catch { /* silent */ }
                    }
                    onUpdateItem(item.id, 'bijlage_url', '')
                    onUpdateItem(item.id, 'bijlage_type', '' as 'image/jpeg')
                    onUpdateItem(item.id, 'bijlage_naam', '')
                  }}
                  visualisaties={visualisaties}
                  onSelectVisualisatie={(v) => {
                    onUpdateItem(item.id, 'bijlage_url', v.resultaat_url)
                    onUpdateItem(item.id, 'bijlage_type', 'image/jpeg')
                    onUpdateItem(item.id, 'bijlage_naam', `visualisatie-${v.id.slice(0, 8)}.png`)
                  }}
                />

                {/* ── FIX 15: Interne notitie ── */}
                <div className="px-4 py-2 border-b border-border dark:border-border">
                  <button
                    onClick={() => {
                      // Toggle: if empty, open with empty string; if has content, collapse
                      if (!item.interne_notitie && item.interne_notitie !== '') {
                        onUpdateItem(item.id, 'interne_notitie', ' ')
                        // Will be cleared to empty string by user
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    <Lock className="h-3 w-3" />
                    Interne notitie
                    {item.interne_notitie && item.interne_notitie.trim() && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    )}
                  </button>
                  {(item.interne_notitie !== undefined && item.interne_notitie !== null) && (
                    <div className="mt-1.5">
                      <textarea
                        value={item.interne_notitie || ''}
                        onChange={(e) => onUpdateItem(item.id, 'interne_notitie', e.target.value)}
                        placeholder="Interne notitie — niet zichtbaar voor klant"
                        rows={2}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-900/20 text-foreground placeholder:text-amber-400 dark:placeholder:text-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-300 dark:focus:ring-amber-700 resize-y"
                      />
                      <button
                        onClick={() => onUpdateItem(item.id, 'interne_notitie', undefined as unknown as string)}
                        className="text-2xs text-muted-foreground hover:text-red-500 mt-0.5"
                      >
                        Notitie verwijderen
                      </button>
                    </div>
                  )}
                </div>

                {/* Beschrijving-regels (dynamisch) */}
                <div className="px-4 py-2 space-y-1 border-b border-border dark:border-border">
                  {detailRegels.map((regel) => (
                    <div key={regel.id} className="flex items-center gap-1.5 group">
                      {/* Verwijder knop */}
                      <button
                        onClick={() => removeDetailRegel(item.id, regel.id)}
                        className="text-muted-foreground/50 hover:text-red-500 dark:text-muted-foreground dark:hover:text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        title="Verwijder rij"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      {/* Dupliceer knop */}
                      <button
                        onClick={() => duplicateDetailRegel(item.id, regel.id)}
                        className="text-muted-foreground/50 hover:text-blue-500 dark:text-muted-foreground dark:hover:text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        title="Dupliceer rij"
                      >
                        <Copy className="h-3 w-3" />
                      </button>

                      {/* Label */}
                      <Input
                        value={regel.label}
                        onChange={(e) => updateDetailRegelField(item.id, regel.id, 'label', e.target.value)}
                        placeholder="Label..."
                        className="w-28 flex-shrink-0 h-8 text-xs font-medium border-transparent bg-transparent hover:border-border dark:hover:border-border focus-visible:border-border shadow-none text-muted-foreground"
                      />

                      <span className="text-muted-foreground/50 dark:text-muted-foreground flex-shrink-0">:</span>

                      {/* Waarde — with autofill for omschrijving/materiaal/lay-out/montage */}
                      {labelToAutofillField(regel.label) ? (
                        <AutofillInput
                          field={labelToAutofillField(regel.label)!}
                          value={regel.waarde}
                          onChange={(val) => updateDetailRegelField(item.id, regel.id, 'waarde', val)}
                          placeholder="Vul in..."
                          className="flex-1 h-8 text-sm"
                        />
                      ) : (
                        <Input
                          value={regel.waarde}
                          onChange={(e) => updateDetailRegelField(item.id, regel.id, 'waarde', e.target.value)}
                          placeholder="Vul in..."
                          className="flex-1 h-8 text-sm"
                        />
                      )}
                    </div>
                  ))}

                  {/* Rij toevoegen */}
                  <button
                    onClick={() => addDetailRegel(item.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors pt-1"
                  >
                    <Plus className="h-3 w-3" />
                    Beschrijving toevoegen
                  </button>
                </div>

                {/* ──── PRIJSBEREKENING ──── */}
                <div
                  className={cn(
                    'px-4 py-2 bg-background/50 dark:bg-muted/30 transition-all',
                    inkoopDropTargetId === item.id && 'ring-2 ring-primary/40 ring-inset bg-primary/5'
                  )}
                  onDragOver={(e) => handleInkoopDragOver(e, item.id)}
                  onDragLeave={handleInkoopDragLeave}
                  onDrop={(e) => handleInkoopDrop(e, item.id)}
                >
                  {/* Modus: enkele prijs (geen varianten) */}
                  {(!item.prijs_varianten || item.prijs_varianten.length === 0) && (
                    <>
                      <div className="flex items-end gap-3 flex-wrap">
                        {/* Aantal */}
                        <div className="space-y-1 w-20">
                          <label className="text-xs font-medium text-muted-foreground">Aantal</label>
                          <Input
                            type="number"
                            value={item.aantal || ''}
                            onChange={(e) => onUpdateItem(item.id, 'aantal', Math.max(0, parseFloat(e.target.value) || 0))}
                            min={0}
                            step={1}
                            className="h-9 text-sm"
                          />
                        </div>

                        <span className="text-muted-foreground pb-2 text-sm">&times;</span>

                        {/* Prijs per stuk */}
                        <div className="space-y-1 flex-1 min-w-[140px] max-w-[200px]">
                          <label className="text-xs font-medium text-muted-foreground">Prijs per stuk</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&euro;</span>
                            <Input
                              type="number"
                              value={item.eenheidsprijs || ''}
                              onChange={(e) => onUpdateItem(item.id, 'eenheidsprijs', Math.max(0, parseFloat(e.target.value) || 0))}
                              min={0}
                              step={0.01}
                              className="h-9 text-sm pl-7 pr-10"
                            />
                            <button
                              onClick={() => openCalculatie(item.id)}
                              className={cn(
                                'absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center transition-colors',
                                item.heeft_calculatie
                                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                  : 'bg-muted text-muted-foreground hover:bg-blue-100 hover:text-blue-600 dark:bg-muted dark:text-muted-foreground/60 dark:hover:bg-blue-900/40 dark:hover:text-blue-400'
                              )}
                              title={item.heeft_calculatie ? 'Calculatie bewerken' : 'Calculatie openen'}
                            >
                              <Calculator className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* BTW */}
                        <div className="space-y-1 w-24">
                          <label className="text-xs font-medium text-muted-foreground">BTW</label>
                          <Select
                            value={String(item.btw_percentage)}
                            onValueChange={(value) => onUpdateItem(item.id, 'btw_percentage', parseInt(value))}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="21">21%</SelectItem>
                              <SelectItem value="9">9%</SelectItem>
                              <SelectItem value="0">0%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Korting */}
                        <div className="space-y-1 w-24">
                          <label className="text-xs font-medium text-muted-foreground">Korting</label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={item.korting_percentage || ''}
                              onChange={(e) => onUpdateItem(item.id, 'korting_percentage', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                              min={0}
                              max={100}
                              step={0.5}
                              className="h-9 text-sm pr-7"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                          </div>
                        </div>

                        {/* = Totaal */}
                        <div className="space-y-1 ml-auto">
                          <label className="text-xs font-medium text-muted-foreground text-right block">Totaal</label>
                          <div className="h-9 flex items-center justify-end">
                            <span className="text-base font-bold font-mono text-foreground tabular-nums">
                              {formatCurrency(lineTotaal)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Calculatie indicator */}
                      {item.heeft_calculatie && item.calculatie_regels && item.calculatie_regels.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border dark:border-border">
                          <button
                            onClick={() => openCalculatie(item.id)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Calculator className="h-3 w-3" />
                            Calculatie: {item.calculatie_regels.length} regels —
                            Inkoop {formatCurrency(round2(item.calculatie_regels.reduce((s, r) => s + r.inkoop_prijs * r.aantal, 0)))} |
                            Verkoop {formatCurrency(round2(item.calculatie_regels.reduce((s, r) => s + r.verkoop_prijs * r.aantal, 0)))}
                          </button>

                          {/* FIX 8: Marge indicator per item */}
                          {(() => {
                            const margeData = calculateItemMargin(item.calculatie_regels)
                            if (!margeData) return null
                            const colors = getMargeColor(margeData.percentage)
                            return (
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className={cn('text-xs font-semibold', colors.text)}>
                                  Marge: {margeData.percentage.toFixed(1)}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({formatCurrency(margeData.marge)})
                                </span>
                                <div className="flex-1 h-1.5 rounded-full bg-secondary dark:bg-foreground/70 max-w-[120px]">
                                  <div
                                    className={cn('h-full rounded-full transition-all', colors.bar)}
                                    style={{ width: `${Math.min(100, Math.max(0, margeData.percentage))}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Dupliceer prijs knop */}
                      <div className="mt-2 pt-2 border-t border-border dark:border-border">
                        <button
                          onClick={() => addPrijsVariant(item.id)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                          Prijsvariant toevoegen
                        </button>
                      </div>
                    </>
                  )}

                  {/* Modus: meerdere prijsvarianten */}
                  {item.prijs_varianten && item.prijs_varianten.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-text-tertiary uppercase tracking-label">
                          Prijsopties — beide op offerte, vink de standaard aan
                        </span>
                      </div>

                      {item.prijs_varianten.map((variant) => {
                        const isActive = variant.id === item.actieve_variant_id
                        const variantTotaal = calculateVariantTotaal(variant)

                        return (
                          <div
                            key={variant.id}
                            className={cn(
                              'rounded-lg border p-3 transition-all',
                              isActive
                                ? 'border-primary/50 bg-primary/5 dark:border-primary/40 dark:bg-primary/10 ring-1 ring-primary/20'
                                : 'border-border dark:border-border bg-card'
                            )}
                          >
                            {/* Variant header: label + active toggle + remove */}
                            <div className="flex items-center gap-2 mb-2">
                              <button
                                onClick={() => setActieveVariant(item.id, variant.id)}
                                className={cn(
                                  'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                  isActive
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-border dark:border-border hover:border-primary/50'
                                )}
                                title={isActive ? 'Standaard optie (telt mee in offerte-totaal)' : 'Maak dit de standaard optie'}
                              >
                                {isActive && <Check className="h-3 w-3" />}
                              </button>

                              <Input
                                value={variant.label}
                                onChange={(e) => updatePrijsVariantField(item.id, variant.id, 'label', e.target.value)}
                                placeholder="Optie naam..."
                                className="h-7 text-xs font-semibold border-transparent bg-transparent hover:border-border dark:hover:border-border focus-visible:border-border shadow-none flex-1 max-w-[180px]"
                              />

                              {isActive && (
                                <span className="text-2xs font-medium text-primary bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded">
                                  standaard
                                </span>
                              )}
                              {!isActive && (
                                <span className="text-2xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  meerprijs
                                </span>
                              )}

                              <span className="text-sm font-bold font-mono text-foreground tabular-nums ml-auto mr-2">
                                {formatCurrency(variantTotaal)}
                              </span>

                              <button
                                onClick={() => removePrijsVariant(item.id, variant.id)}
                                className="text-muted-foreground/50 hover:text-red-500 dark:text-muted-foreground dark:hover:text-red-400 flex-shrink-0 p-0.5"
                                title="Verwijder variant"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Variant prijsvelden */}
                            <div className="flex items-end gap-2 flex-wrap">
                              {/* Aantal */}
                              <div className="space-y-0.5 w-16">
                                <label className="text-2xs font-medium text-muted-foreground">Aantal</label>
                                <Input
                                  type="number"
                                  value={variant.aantal || ''}
                                  onChange={(e) => updatePrijsVariantField(item.id, variant.id, 'aantal', Math.max(0, parseFloat(e.target.value) || 0))}
                                  min={0}
                                  step={1}
                                  className="h-8 text-xs"
                                />
                              </div>

                              <span className="text-muted-foreground pb-1.5 text-xs">&times;</span>

                              {/* Prijs per stuk */}
                              <div className="space-y-0.5 flex-1 min-w-[120px] max-w-[180px]">
                                <label className="text-2xs font-medium text-muted-foreground">Prijs per stuk</label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">&euro;</span>
                                  <Input
                                    type="number"
                                    value={variant.eenheidsprijs || ''}
                                    onChange={(e) => updatePrijsVariantField(item.id, variant.id, 'eenheidsprijs', Math.max(0, parseFloat(e.target.value) || 0))}
                                    min={0}
                                    step={0.01}
                                    className="h-8 text-xs pl-6 pr-9"
                                  />
                                  <button
                                    onClick={() => openCalculatie(item.id, variant.id)}
                                    className={cn(
                                      'absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center transition-colors',
                                      variant.heeft_calculatie
                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                        : 'bg-muted text-muted-foreground hover:bg-blue-100 hover:text-blue-600 dark:bg-muted dark:text-muted-foreground/60'
                                    )}
                                    title={variant.heeft_calculatie ? 'Calculatie bewerken' : 'Calculatie openen'}
                                  >
                                    <Calculator className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {/* BTW */}
                              <div className="space-y-0.5 w-20">
                                <label className="text-2xs font-medium text-muted-foreground">BTW</label>
                                <Select
                                  value={String(variant.btw_percentage)}
                                  onValueChange={(value) => updatePrijsVariantField(item.id, variant.id, 'btw_percentage', parseInt(value))}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="21">21%</SelectItem>
                                    <SelectItem value="9">9%</SelectItem>
                                    <SelectItem value="0">0%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Korting */}
                              <div className="space-y-0.5 w-20">
                                <label className="text-2xs font-medium text-muted-foreground">Korting</label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    value={variant.korting_percentage || ''}
                                    onChange={(e) => updatePrijsVariantField(item.id, variant.id, 'korting_percentage', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    className="h-8 text-xs pr-6"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                </div>
                              </div>
                            </div>

                            {/* Variant calculatie indicator */}
                            {variant.heeft_calculatie && variant.calculatie_regels && variant.calculatie_regels.length > 0 && (
                              <div className="mt-1.5 pt-1.5 border-t border-border dark:border-border">
                                <button
                                  onClick={() => openCalculatie(item.id, variant.id)}
                                  className="text-2xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <Calculator className="h-2.5 w-2.5" />
                                  Calculatie: {variant.calculatie_regels.length} regels —
                                  Inkoop {formatCurrency(round2(variant.calculatie_regels.reduce((s, r) => s + r.inkoop_prijs * r.aantal, 0)))} |
                                  Verkoop {formatCurrency(round2(variant.calculatie_regels.reduce((s, r) => s + r.verkoop_prijs * r.aantal, 0)))}
                                </button>

                                {/* FIX 8: Marge indicator per variant */}
                                {(() => {
                                  const margeData = calculateItemMargin(variant.calculatie_regels)
                                  if (!margeData) return null
                                  const colors = getMargeColor(margeData.percentage)
                                  return (
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className={cn('text-2xs font-semibold', colors.text)}>
                                        Marge: {margeData.percentage.toFixed(1)}%
                                      </span>
                                      <span className="text-2xs text-muted-foreground">
                                        ({formatCurrency(margeData.marge)})
                                      </span>
                                      <div className="flex-1 h-1 rounded-full bg-secondary dark:bg-foreground/70 max-w-[100px]">
                                        <div
                                          className={cn('h-full rounded-full transition-all', colors.bar)}
                                          style={{ width: `${Math.min(100, Math.max(0, margeData.percentage))}%` }}
                                        />
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Variant toevoegen knop */}
                      <button
                        onClick={() => addPrijsVariant(item.id)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors pt-1"
                      >
                        <Plus className="h-3 w-3" />
                        Prijsvariant toevoegen
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )
      })}

      {/* ========= LEGE STAAT ========= */}
      {items.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border dark:border-border p-10 text-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm font-medium text-foreground">Nog geen items</p>
          <p className="text-xs text-muted-foreground mt-1">
            Voeg een item toe om je offerte op te bouwen
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => onAddItem()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Eerste item toevoegen
            </Button>
            {clipboardCount > 0 && onPasteItems && (
              <Button
                variant="outline"
                onClick={onPasteItems}
                className="gap-2 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Clipboard className="h-4 w-4" />
                Plak items ({clipboardCount})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ========= TOEVOEGEN + PLAKKEN KNOPPEN ========= */}
      {items.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddItem()}
            className="flex-1 py-3 rounded-xl border-2 border-dashed border-border dark:border-border text-sm font-medium text-muted-foreground hover:text-accent hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Item toevoegen
          </button>

          {clipboardCount > 0 && onPasteItems && (
            <button
              onClick={onPasteItems}
              className="py-3 px-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600 text-sm font-medium text-blue-600 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2"
            >
              <Clipboard className="h-4 w-4" />
              Plak items ({clipboardCount})
            </button>
          )}

          {clipboardCount > 0 && onClearClipboard && (
            <button
              onClick={onClearClipboard}
              className="py-3 px-3 rounded-xl border-2 border-dashed border-border dark:border-border text-sm text-muted-foreground hover:text-red-500 hover:border-red-300 dark:hover:border-red-600 transition-colors flex items-center gap-2"
              title="Klembord legen"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {onCopyAllItems && items.filter(i => i.soort === 'prijs' && i.beschrijving.trim()).length > 1 && (
            <button
              onClick={onCopyAllItems}
              className="py-3 px-4 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-600 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Kopieer alle items
            </button>
          )}
        </div>
      )}

      {/* ========= CALCULATIE MODAL ========= */}
      <CalculatieModal
        open={calculatieOpen}
        onClose={() => {
          setCalculatieOpen(false)
          setActiveItemId(null)
          setActiveVariantId(null)
        }}
        initialRegels={activeVariant?.calculatie_regels || activeItem?.calculatie_regels}
        itemBeschrijving={activeVariant ? `${activeItem?.beschrijving} — ${activeVariant.label}` : activeItem?.beschrijving}
        onConfirm={handleCalculatieConfirm}
      />
    </div>
  )
}
