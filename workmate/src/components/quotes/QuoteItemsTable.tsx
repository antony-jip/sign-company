import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Trash2, Plus, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CalculatieModal } from './CalculatieModal'
import type { CalculatieRegel } from '@/types'

export interface QuoteLineItem {
  id: string
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  totaal: number
  /** Calculatieregels die bij dit item horen (voor nacalculatie/inzicht) */
  calculatie_regels?: CalculatieRegel[]
  /** Of dit item een calculatie heeft */
  heeft_calculatie?: boolean
}

interface QuoteItemsTableProps {
  items: QuoteLineItem[]
  onAddItem: () => void
  onUpdateItem: (id: string, field: keyof QuoteLineItem, value: string | number) => void
  onRemoveItem: (id: string) => void
  /** Update een item met calculatiedata (regels + totaal) */
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
  // State voor de calculatie modal
  const [calculatieOpen, setCalculatieOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  const activeItem = items.find((i) => i.id === activeItemId)

  const subtotaal = items.reduce((sum, item) => sum + calculateLineTotaal(item), 0)

  const btwTotalen = items.reduce(
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

  // Open calculatie modal voor een specifiek item
  const openCalculatie = (itemId: string) => {
    setActiveItemId(itemId)
    setCalculatieOpen(true)
  }

  // Verwerk de calculatie resultaten
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
      // Fallback: update individuele velden
      onUpdateItem(activeItemId, 'beschrijving', data.beschrijving)
      onUpdateItem(activeItemId, 'eenheidsprijs', data.totaalVerkoop)
    }

    setCalculatieOpen(false)
    setActiveItemId(null)
  }

  return (
    <div className="space-y-4">
      {/* Tabel */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 min-w-[280px]">
                Omschrijving
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-24">
                Aantal
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-36">
                Eenheidsprijs
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-28">
                BTW %
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-28">
                Korting %
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-36">
                Totaal
              </th>
              <th className="px-2 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const lineTotaal = calculateLineTotaal(item)
              return (
                <tr
                  key={item.id}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/20'
                  } hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors`}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <Input
                        value={item.beschrijving}
                        onChange={(e) => onUpdateItem(item.id, 'beschrijving', e.target.value)}
                        placeholder="Beschrijving van het item..."
                        className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-9 flex-1"
                      />
                      {item.heeft_calculatie && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-200 dark:border-blue-800 flex-shrink-0">
                          Calc
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={item.aantal || ''}
                      onChange={(e) => onUpdateItem(item.id, 'aantal', Math.max(0, parseFloat(e.target.value) || 0))}
                      min={0}
                      step={1}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-9 text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={item.eenheidsprijs || ''}
                      onChange={(e) => onUpdateItem(item.id, 'eenheidsprijs', Math.max(0, parseFloat(e.target.value) || 0))}
                      min={0}
                      step={0.01}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-9 text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Select
                      value={String(item.btw_percentage)}
                      onValueChange={(value) => onUpdateItem(item.id, 'btw_percentage', parseInt(value))}
                    >
                      <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="21">21%</SelectItem>
                        <SelectItem value="9">9%</SelectItem>
                        <SelectItem value="0">0%</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={item.korting_percentage || ''}
                      onChange={(e) => onUpdateItem(item.id, 'korting_percentage', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      min={0}
                      max={100}
                      step={0.5}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-9 text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(lineTotaal)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-0.5">
                      {/* Calculatie knop - opent de calculatie modal */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openCalculatie(item.id)}
                              className={`h-8 w-8 ${
                                item.heeft_calculatie
                                  ? 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                                  : 'text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400'
                              }`}
                            >
                              <Calculator className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.heeft_calculatie ? 'Calculatie bewerken' : 'Calculatie maken'}</p>
                            <p className="text-xs text-gray-400">
                              Bouw de prijs op uit losse onderdelen
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(item.id)}
                        className="h-8 w-8 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  Nog geen items toegevoegd. Klik op "Item Toevoegen" om te beginnen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Item toevoegen knop */}
      <Button
        variant="outline"
        onClick={onAddItem}
        className="w-full border-dashed border-2 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        Item Toevoegen
      </Button>

      {/* Totalen footer */}
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

      {/* Calculatie Modal */}
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
