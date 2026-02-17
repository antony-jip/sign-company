import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface QuoteLineItem {
  id: string
  beschrijving: string
  aantal: number
  eenheidsprijs: number
  btw_percentage: number
  korting_percentage: number
  totaal: number
}

interface QuoteItemsTableProps {
  items: QuoteLineItem[]
  onAddItem: () => void
  onUpdateItem: (id: string, field: keyof QuoteLineItem, value: string | number) => void
  onRemoveItem: (id: string) => void
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
}: QuoteItemsTableProps) {
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

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 min-w-[280px]">
                Beschrijving
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
              <th className="px-4 py-3 w-12" />
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
                    <Input
                      value={item.beschrijving}
                      onChange={(e) => onUpdateItem(item.id, 'beschrijving', e.target.value)}
                      placeholder="Beschrijving van het item..."
                      className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-9"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={item.aantal || ''}
                      onChange={(e) => onUpdateItem(item.id, 'aantal', parseFloat(e.target.value) || 0)}
                      min={0}
                      step={1}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-9 text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={item.eenheidsprijs || ''}
                      onChange={(e) => onUpdateItem(item.id, 'eenheidsprijs', parseFloat(e.target.value) || 0)}
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
                      onChange={(e) => onUpdateItem(item.id, 'korting_percentage', parseFloat(e.target.value) || 0)}
                      min={0}
                      max={100}
                      step={0.5}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-9 text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(lineTotaal)}
                  </td>
                  <td className="px-4 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
                      className="h-8 w-8 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      {/* Add Item Button */}
      <Button
        variant="outline"
        onClick={onAddItem}
        className="w-full border-dashed border-2 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        Item Toevoegen
      </Button>

      {/* Totals Footer */}
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
    </div>
  )
}
