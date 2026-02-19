import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus, Calculator, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { CalculatieModal } from './CalculatieModal'
import type { CalculatieRegel } from '@/types'

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
}

interface QuoteItemsTableProps {
  items: QuoteLineItem[]
  onAddItem: () => void
  onUpdateItem: (id: string, field: keyof QuoteLineItem, value: any) => void
  onRemoveItem: (id: string) => void
  onUpdateItemWithCalculatie?: (
    id: string,
    data: {
      beschrijving: string
      eenheidsprijs: number
      calculatie_regels: CalculatieRegel[]
    }
  ) => void
}

function calculateLineTotaal(item: QuoteLineItem): number {
  const bruto = item.aantal * item.eenheidsprijs
  return bruto - bruto * (item.korting_percentage / 100)
}

function genId(): string {
  return `dr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function QuoteItemsTable({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onUpdateItemWithCalculatie,
}: QuoteItemsTableProps) {
  // Calculatie modal
  const [calculatieOpen, setCalculatieOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  // Collapsed state per item
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())

  const activeItem = items.find((i) => i.id === activeItemId)

  const openCalculatie = (itemId: string) => {
    setActiveItemId(itemId)
    setCalculatieOpen(true)
  }

  const handleCalculatieConfirm = (data: {
    regels: CalculatieRegel[]
    totaalVerkoop: number
    totaalInkoop: number
    beschrijving: string
  }) => {
    if (!activeItemId) return
    if (onUpdateItemWithCalculatie) {
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
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
          >
            {/* ──── HEADER: nummer + item naam + totaal + acties ──── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{index + 1}</span>
              </div>

              <Input
                value={item.beschrijving}
                onChange={(e) => onUpdateItem(item.id, 'beschrijving', e.target.value)}
                placeholder="Item naam..."
                className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-9 text-sm font-semibold flex-1 placeholder:font-normal"
              />

              <span className="text-base font-bold text-foreground flex-shrink-0 min-w-[90px] text-right tabular-nums">
                {formatCurrency(lineTotaal)}
              </span>

              <button
                onClick={() => toggleCollapse(item.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 p-1"
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>

              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* ──── BODY: beschrijving-regels + prijsberekening ──── */}
            {!isCollapsed && (
              <>
                {/* Beschrijving-regels (dynamisch) */}
                <div className="px-4 py-3 space-y-1.5 border-b border-gray-100 dark:border-gray-800">
                  {detailRegels.map((regel) => (
                    <div key={regel.id} className="flex items-center gap-1.5 group">
                      {/* Verwijder knop */}
                      <button
                        onClick={() => removeDetailRegel(item.id, regel.id)}
                        className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        title="Verwijder rij"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      {/* Dupliceer knop */}
                      <button
                        onClick={() => duplicateDetailRegel(item.id, regel.id)}
                        className="text-gray-300 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        title="Dupliceer rij"
                      >
                        <Copy className="h-3 w-3" />
                      </button>

                      {/* Label */}
                      <Input
                        value={regel.label}
                        onChange={(e) => updateDetailRegelField(item.id, regel.id, 'label', e.target.value)}
                        placeholder="Label..."
                        className="w-28 flex-shrink-0 h-8 text-xs font-medium border-transparent bg-transparent hover:border-gray-200 dark:hover:border-gray-700 focus-visible:border-gray-300 shadow-none text-muted-foreground"
                      />

                      <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">:</span>

                      {/* Waarde */}
                      <Input
                        value={regel.waarde}
                        onChange={(e) => updateDetailRegelField(item.id, regel.id, 'waarde', e.target.value)}
                        placeholder="Vul in..."
                        className="flex-1 h-8 text-sm"
                      />
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
                <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-end gap-3 flex-wrap">
                    {/* Aantal */}
                    <div className="space-y-1 w-20">
                      <label className="text-[11px] font-medium text-muted-foreground">Aantal</label>
                      <Input
                        type="number"
                        value={item.aantal || ''}
                        onChange={(e) => onUpdateItem(item.id, 'aantal', Math.max(0, parseFloat(e.target.value) || 0))}
                        min={0}
                        step={1}
                        className="h-9 text-sm"
                      />
                    </div>

                    <span className="text-muted-foreground pb-2 text-sm">×</span>

                    {/* Prijs per stuk */}
                    <div className="space-y-1 flex-1 min-w-[140px] max-w-[200px]">
                      <label className="text-[11px] font-medium text-muted-foreground">Prijs per stuk</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                        <Input
                          type="number"
                          value={item.eenheidsprijs || ''}
                          onChange={(e) => onUpdateItem(item.id, 'eenheidsprijs', Math.max(0, parseFloat(e.target.value) || 0))}
                          min={0}
                          step={0.01}
                          className="h-9 text-sm pl-7 pr-10"
                        />
                        {/* Calculator knop — prominent, altijd zichtbaar */}
                        <button
                          onClick={() => openCalculatie(item.id)}
                          className={cn(
                            'absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center transition-colors',
                            item.heeft_calculatie
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-blue-900/40 dark:hover:text-blue-400'
                          )}
                          title={item.heeft_calculatie ? 'Calculatie bewerken' : 'Calculatie openen'}
                        >
                          <Calculator className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* BTW */}
                    <div className="space-y-1 w-24">
                      <label className="text-[11px] font-medium text-muted-foreground">BTW</label>
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
                      <label className="text-[11px] font-medium text-muted-foreground">Korting</label>
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
                      <label className="text-[11px] font-medium text-muted-foreground text-right block">Totaal</label>
                      <div className="h-9 flex items-center justify-end">
                        <span className="text-base font-bold text-foreground tabular-nums">
                          {formatCurrency(lineTotaal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Calculatie indicator */}
                  {item.heeft_calculatie && item.calculatie_regels && item.calculatie_regels.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => openCalculatie(item.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Calculator className="h-3 w-3" />
                        Calculatie: {item.calculatie_regels.length} regels —
                        Inkoop {formatCurrency(item.calculatie_regels.reduce((s, r) => s + r.inkoop_prijs * r.aantal, 0))} |
                        Verkoop {formatCurrency(item.calculatie_regels.reduce((s, r) => s + r.verkoop_prijs * r.aantal, 0))}
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
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-10 text-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm font-medium text-foreground">Nog geen items</p>
          <p className="text-xs text-muted-foreground mt-1">
            Voeg een item toe om je offerte op te bouwen
          </p>
          <Button
            variant="outline"
            onClick={() => onAddItem()}
            className="mt-4 gap-2"
          >
            <Plus className="h-4 w-4" />
            Eerste item toevoegen
          </Button>
        </div>
      )}

      {/* ========= TOEVOEGEN KNOP ========= */}
      {items.length > 0 && (
        <button
          onClick={() => onAddItem()}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-muted-foreground hover:text-accent hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Item toevoegen
        </button>
      )}

      {/* ========= CALCULATIE MODAL ========= */}
      <CalculatieModal
        open={calculatieOpen}
        onClose={() => {
          setCalculatieOpen(false)
          setActiveItemId(null)
        }}
        initialRegels={activeItem?.calculatie_regels}
        itemBeschrijving={activeItem?.beschrijving}
        onConfirm={handleCalculatieConfirm}
      />
    </div>
  )
}
