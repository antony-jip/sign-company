import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import { Trash2, Plus, Calculator, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { CalculatieModal } from './CalculatieModal'
import type { CalculatieRegel } from '@/types'

// ============================================================
// OFFERTE ITEMS TABEL
//
// Elke offerte-regel is een "blok" met:
//   - Omschrijving (altijd zichtbaar, hoofdtekst)
//   - Extra tekstvelden (bijv. Materiaal, Lay-out, Montage, Opmerking)
//     → Deze zijn instelbaar in Instellingen > Calculatie
//   - Prijsregel: Waarde + BTW + Korting + Calculatie-knop
//
// Regels ZONDER prijs zijn ook mogelijk (soort = 'tekst')
// ============================================================

export interface QuoteLineItem {
  id: string
  /** Soort regel: 'prijs' = normale prijsregel, 'tekst' = alleen tekst (geen prijs) */
  soort: 'prijs' | 'tekst'
  beschrijving: string
  /** Extra tekstvelden per label, bijv. { "Materiaal": "Dibond 3mm", "Montage": "Incl. montage" } */
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
  onAddItem: (soort: 'prijs' | 'tekst') => void
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
  if (item.soort === 'tekst') return 0
  const bruto = item.aantal * item.eenheidsprijs
  const kortingBedrag = bruto * (item.korting_percentage / 100)
  return bruto - kortingBedrag
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

  // Calculatie modal state
  const [calculatieOpen, setCalculatieOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  // Track welke item-blokken zijn ingeklapt
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())

  const activeItem = items.find((i) => i.id === activeItemId)

  // Alleen prijsregels tellen mee voor totalen
  const prijsItems = items.filter((i) => i.soort === 'prijs')
  const subtotaal = prijsItems.reduce((sum, item) => sum + calculateLineTotaal(item), 0)

  const btwTotalen = prijsItems.reduce(
    (acc, item) => {
      const lineTotaal = calculateLineTotaal(item)
      const btwBedrag = lineTotaal * (item.btw_percentage / 100)
      const key = `${item.btw_percentage}%`
      acc[key] = (acc[key] || 0) + btwBedrag
      return acc
    },
    {} as Record<string, number>
  )

  const totaalBtw = Object.values(btwTotalen).reduce((sum, val) => sum + val, 0)
  const totaal = subtotaal + totaalBtw

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
    <div className="space-y-3">
      {/* ========= ITEM BLOKKEN ========= */}
      {items.map((item, index) => {
        const isCollapsed = collapsedItems.has(item.id)
        const isPrijs = item.soort === 'prijs'
        const lineTotaal = calculateLineTotaal(item)

        return (
          <div
            key={item.id}
            className={`rounded-lg border transition-colors ${
              isPrijs
                ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30'
            }`}
          >
            {/* ---- HEADER: soort badge + omschrijving + acties ---- */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => toggleCollapse(item.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              >
                {isCollapsed
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronUp className="h-4 w-4" />
                }
              </button>

              <Badge
                variant={isPrijs ? 'default' : 'secondary'}
                className="text-[10px] px-1.5 py-0 flex-shrink-0"
              >
                {isPrijs ? 'Prijs' : 'Tekst'}
              </Badge>

              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                #{index + 1}
              </span>

              <Input
                value={item.beschrijving}
                onChange={(e) => onUpdateItem(item.id, 'beschrijving', e.target.value)}
                placeholder="Omschrijving..."
                className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-8 text-sm font-medium flex-1"
              />

              {isPrijs && item.heeft_calculatie && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-200 dark:border-blue-800 flex-shrink-0">
                  Calc
                </Badge>
              )}

              {isPrijs && (
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-shrink-0 min-w-[80px] text-right">
                  {formatCurrency(lineTotaal)}
                </span>
              )}

              <div className="flex items-center gap-0.5 flex-shrink-0">
                {isPrijs && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openCalculatie(item.id)}
                          className={`h-7 w-7 ${
                            item.heeft_calculatie
                              ? 'text-blue-500 hover:text-blue-700'
                              : 'text-gray-400 hover:text-blue-500'
                          }`}
                        >
                          <Calculator className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.heeft_calculatie ? 'Calculatie bewerken' : 'Calculatie maken'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.id)}
                  className="h-7 w-7 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* ---- BODY: extra velden + prijsvelden (ingeklapt = verborgen) ---- */}
            {!isCollapsed && (
              <div className="px-3 py-2 space-y-2">
                {/* Extra tekstvelden (Materiaal, Lay-out, Montage, Opmerking, etc.) */}
                {regelVelden.length > 0 && (
                  <div className="space-y-1.5">
                    {regelVelden.map((label) => (
                      <div key={label} className="flex items-start gap-3">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 flex-shrink-0 pt-2 text-right">
                          {label}
                        </label>
                        <Input
                          value={item.extra_velden?.[label] || ''}
                          onChange={(e) => updateExtraVeld(item.id, label, e.target.value)}
                          placeholder={`${label}...`}
                          className="border-gray-200 dark:border-gray-700 h-8 text-sm flex-1"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Prijsvelden (alleen bij soort=prijs) */}
                {isPrijs && (
                  <>
                    {regelVelden.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-800 my-2" />
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          Aantal
                        </label>
                        <Input
                          type="number"
                          value={item.aantal || ''}
                          onChange={(e) => onUpdateItem(item.id, 'aantal', Math.max(0, parseFloat(e.target.value) || 0))}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          Eenheidsprijs
                        </label>
                        <Input
                          type="number"
                          value={item.eenheidsprijs || ''}
                          onChange={(e) => onUpdateItem(item.id, 'eenheidsprijs', Math.max(0, parseFloat(e.target.value) || 0))}
                          min={0}
                          step={0.01}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          BTW
                        </label>
                        <Select
                          value={String(item.btw_percentage)}
                          onValueChange={(value) => onUpdateItem(item.id, 'btw_percentage', parseInt(value))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="21">21%</SelectItem>
                            <SelectItem value="9">9%</SelectItem>
                            <SelectItem value="0">0%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          Korting %
                        </label>
                        <Input
                          type="number"
                          value={item.korting_percentage || ''}
                          onChange={(e) => onUpdateItem(item.id, 'korting_percentage', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                          min={0}
                          max={100}
                          step={0.5}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          Totaal
                        </label>
                        <div className="h-8 flex items-center text-sm font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(lineTotaal)}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Lege staat */}
      {items.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nog geen regels toegevoegd. Voeg een prijsregel of tekstregel toe.
          </p>
        </div>
      )}

      {/* ========= TOEVOEGEN KNOPPEN ========= */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => onAddItem('prijs')}
          className="flex-1 border-dashed border-2 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Prijsregel toevoegen
        </Button>
        <Button
          variant="outline"
          onClick={() => onAddItem('tekst')}
          className="flex-1 border-dashed border-2 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tekstregel toevoegen
        </Button>
      </div>

      {/* ========= TOTALEN FOOTER ========= */}
      <div className="flex justify-end">
        <div className="w-80 space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotaal</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(subtotaal)}</span>
          </div>

          {Object.entries(btwTotalen).map(([percentage, bedrag]) => (
            <div key={percentage} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>BTW {percentage}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(bedrag)}</span>
            </div>
          ))}

          {Object.keys(btwTotalen).length === 0 && (
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>BTW</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(0)}</span>
            </div>
          )}

          <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
            <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white">
              <span>Totaal</span>
              <span>{formatCurrency(totaal)}</span>
            </div>
          </div>
        </div>
      </div>

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
