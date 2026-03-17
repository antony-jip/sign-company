import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, RotateCcw, PlusCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'

interface SmartCalculatorProps {
  onAddToOfferte?: (data: {
    beschrijving: string
    subtotaal: number
    marge: number
    btw: number
    totaal: number
  }) => void
}

export function SmartCalculator({ onAddToOfferte }: SmartCalculatorProps) {
  const [uren, setUren] = useState<number>(0)
  const [uurtarief, setUurtarief] = useState<number>(0)
  const [materiaalkosten, setMateriaalkosten] = useState<number>(0)
  const [margePercentage, setMargePercentage] = useState<number>(15)
  const [btwPercentage, setBtwPercentage] = useState<number>(21)

  const berekening = useMemo(() => {
    const arbeidskosten = round2(uren * uurtarief)
    const kosten = round2(arbeidskosten + materiaalkosten)
    const margeBedrag = round2(kosten * (margePercentage / 100))
    const subtotaal = round2(kosten + margeBedrag)
    const btw = round2(subtotaal * (btwPercentage / 100))
    const totaal = round2(subtotaal + btw)

    return {
      arbeidskosten,
      kosten,
      margeBedrag,
      subtotaal,
      btw,
      totaal,
    }
  }, [uren, uurtarief, materiaalkosten, margePercentage, btwPercentage])

  const handleClear = () => {
    setUren(0)
    setUurtarief(0)
    setMateriaalkosten(0)
    setMargePercentage(15)
    setBtwPercentage(21)
  }

  const handleAddToOfferte = () => {
    if (onAddToOfferte && berekening.subtotaal > 0) {
      onAddToOfferte({
        beschrijving: `Berekening: ${uren}u x ${formatCurrency(uurtarief)} + ${formatCurrency(materiaalkosten)} materiaal`,
        subtotaal: berekening.subtotaal,
        marge: berekening.margeBedrag,
        btw: berekening.btw,
        totaal: berekening.totaal,
      })
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-blue-600" />
          Slimme Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="calc-uren" className="text-sm font-medium">
              Aantal uren
            </Label>
            <Input
              id="calc-uren"
              type="number"
              value={uren || ''}
              onChange={(e) => setUren(parseFloat(e.target.value) || 0)}
              placeholder="0"
              min={0}
              step={0.5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calc-uurtarief" className="text-sm font-medium">
              Uurtarief (&euro;)
            </Label>
            <Input
              id="calc-uurtarief"
              type="number"
              value={uurtarief || ''}
              onChange={(e) => setUurtarief(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
              min={0}
              step={0.50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calc-materiaal" className="text-sm font-medium">
              Materiaalkosten (&euro;)
            </Label>
            <Input
              id="calc-materiaal"
              type="number"
              value={materiaalkosten || ''}
              onChange={(e) => setMateriaalkosten(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
              min={0}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calc-marge" className="text-sm font-medium">
              Marge (%)
            </Label>
            <Input
              id="calc-marge"
              type="number"
              value={margePercentage || ''}
              onChange={(e) => setMargePercentage(parseFloat(e.target.value) || 0)}
              placeholder="15"
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">BTW Tarief</Label>
          <Select value={String(btwPercentage)} onValueChange={(v) => setBtwPercentage(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="21">21% (standaard)</SelectItem>
              <SelectItem value="9">9% (verlaagd)</SelectItem>
              <SelectItem value="0">0% (vrijgesteld)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Calculated Results */}
        <div className="space-y-3 bg-background dark:bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground dark:text-muted-foreground/60">Arbeidskosten</span>
            <span className="font-medium text-foreground dark:text-muted-foreground/20">
              {formatCurrency(berekening.arbeidskosten)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground dark:text-muted-foreground/60">Materiaalkosten</span>
            <span className="font-medium text-foreground dark:text-muted-foreground/20">
              {formatCurrency(materiaalkosten)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground dark:text-muted-foreground/60">
              Marge ({margePercentage}%)
            </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              + {formatCurrency(berekening.margeBedrag)}
            </span>
          </div>

          <Separator className="my-1" />

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground dark:text-muted-foreground/60">Subtotaal</span>
            <span className="font-semibold text-foreground dark:text-muted-foreground/20">
              {formatCurrency(berekening.subtotaal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground dark:text-muted-foreground/60">BTW ({btwPercentage}%)</span>
            <span className="font-medium text-foreground dark:text-muted-foreground/20">
              {formatCurrency(berekening.btw)}
            </span>
          </div>

          <Separator className="my-1" />

          <div className="flex justify-between text-lg font-bold">
            <span className="text-foreground dark:text-white">Totaal</span>
            <span className="text-blue-600 dark:text-blue-400">
              {formatCurrency(berekening.totaal)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClear}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Wissen
          </Button>
          {onAddToOfferte && (
            <Button
              onClick={handleAddToOfferte}
              disabled={berekening.subtotaal === 0}
              className="flex-1"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Toevoegen aan offerte
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
