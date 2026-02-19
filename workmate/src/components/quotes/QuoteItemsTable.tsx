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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Trash2, Plus, Calculator, ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { CalculatieModal } from './CalculatieModal'
import type { CalculatieRegel } from '@/types'

// ============================================================
// OFFERTE ITEMS
//
// Elk item is 1 complete "calculatie":
//   1. Omschrijving (titel van het item)
//   2. Detail-velden (Aantal, Afmeting, Materiaal, Lay-out, Montage, Opmerking)
//   3. Prijsberekening (Aantal × Prijs, BTW, Korting, Totaal)
//
// Alles in 1 blok — simpel en overzichtelijk.
// ============================================================

export interface QuoteLineItem {
  id: string
  soort: 'prijs' | 'tekst'
  beschrijving: string
  extra_velden: Record<string, string>
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
  onAddItem: (soort?: 'prijs' | 'tekst') => void
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

export function QuoteItemsTable({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onUpdateItemWithCalculatie,
}: QuoteItemsTableProps) {
  const { settings } = useAppSettings()
  const regelVelden = settings.offerte_regel_velden || []

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

  const updateExtraVeld = (itemId: string, label: string, value: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const updated = { ...item.extra_velden, [label]: value }
    onUpdateItem(itemId, 'extra_velden', updated)
  }

  return (
    <div className="space-y-4">
      {/* ========= ITEM BLOKKEN ========= */}
      {items.map((item, index) => {
        const isCollapsed = collapsedItems.has(item.id)
        const lineTotaal = calculateLineTotaal(item)

        return (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
          >
            {/* ──── HEADER: nummer + omschrijving + acties ──── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{index + 1}</span>
              </div>

              <Input
                value={item.beschrijving}
                onChange={(e) => onUpdateItem(item.id, 'beschrijving', e.target.value)}
                placeholder="Omschrijving van dit item..."
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

            {/* ──── BODY: detail-velden + prijsberekening ──── */}
            {!isCollapsed && (
              <>
                {/* Detail-velden */}
                {regelVelden.length > 0 && (
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      {regelVelden.map((label) => (
                        <div key={label} className="flex items-center gap-2">
                          <label className="text-xs font-medium text-muted-foreground w-20 flex-shrink-0 text-right">
                            {label}
                          </label>
                          <Input
                            value={item.extra_velden?.[label] || ''}
                            onChange={(e) => updateExtraVeld(item.id, label, e.target.value)}
                            placeholder={`${label}...`}
                            className="h-8 text-sm flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prijsberekening */}
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
                    <div className="space-y-1 flex-1 min-w-[120px] max-w-[180px]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-muted-foreground">Prijs per stuk</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => openCalculatie(item.id)}
                                className={cn(
                                  'text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-md transition-colors',
                                  item.heeft_calculatie
                                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400'
                                    : 'text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                                )}
                              >
                                <Calculator className="h-3 w-3" />
                                {item.heeft_calculatie ? 'Bewerk' : 'Calculatie'}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Detailcalculatie voor nauwkeurige prijsberekening</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                        <Input
                          type="number"
                          value={item.eenheidsprijs || ''}
                          onChange={(e) => onUpdateItem(item.id, 'eenheidsprijs', Math.max(0, parseFloat(e.target.value) || 0))}
                          min={0}
                          step={0.01}
                          className="h-9 text-sm pl-7"
                        />
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
            onClick={() => onAddItem('prijs')}
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
          onClick={() => onAddItem('prijs')}
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
