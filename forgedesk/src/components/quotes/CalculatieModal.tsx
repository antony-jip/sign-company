import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import {
  Calculator,
  Plus,
  Trash2,
  Package,
  HelpCircle,
  FileDown,
  BookTemplate,
  Save,
  Settings,
  Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import { berekenMarkupPercentage, berekenVerkoopVanMarkup } from '@/utils/margeBerekening'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getCalculatieProducten, getCalculatieTemplates } from '@/services/supabaseService'
import type { CalculatieRegel, CalculatieProduct, CalculatieTemplate } from '@/types'
import { logger } from '../../utils/logger'
import { confirm } from '@/components/shared/ConfirmDialog'
import { ProductCatalogusCombobox } from '@/components/shared/ProductCatalogusCombobox'

// ============================================================
// CALCULATIE MODAL
// Dit scherm opent wanneer je op het rekenmachine-icoon klikt
// bij een offerte-regel. Hier bouw je de prijs op uit losse
// onderdelen (producten, arbeid, materiaal, etc.)
// ============================================================

interface CalculatieModalProps {
  open: boolean
  onClose: () => void
  /** De huidige calculatieregels (als je een bestaande calculatie bewerkt) */
  initialRegels?: CalculatieRegel[]
  /** De beschrijving van het offerte-item (wordt als titel getoond) */
  itemBeschrijving?: string
  /** Callback wanneer je de calculatie bevestigt */
  onConfirm: (data: {
    regels: CalculatieRegel[]
    totaalVerkoop: number
    totaalInkoop: number
    beschrijving: string
  }) => void
}

/** Maakt een lege calculatieregel aan */
function createEmptyRegel(defaults?: { marge: number; btw: number }): CalculatieRegel {
  return {
    id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_naam: '',
    categorie: '',
    eenheid: 'stuks',
    aantal: 1,
    inkoop_prijs: 0,
    verkoop_prijs: 0,
    marge_percentage: defaults?.marge ?? 35,
    korting_percentage: 0,
    nacalculatie: false,
    btw_percentage: defaults?.btw ?? 21,
    notitie: '',
  }
}


function berekenVerkoopVanInkoop(inkoop: number, margePerc: number): number {
  return round2(berekenVerkoopVanMarkup(inkoop, margePerc))
}

function berekenMarge(inkoop: number, verkoop: number): number {
  return Math.round(berekenMarkupPercentage(inkoop, verkoop) * 10) / 10
}

const NUM_INPUT_CLS = 'border-0 bg-transparent shadow-none focus-visible:ring-1 h-8 w-full px-2 text-right text-sm font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function CurrencyCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <Input
        type="number"
        autoFocus
        value={value || ''}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
        min={0}
        step={0.01}
        className={NUM_INPUT_CLS}
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`w-full h-8 px-2 text-right text-sm font-mono tabular-nums hover:bg-muted/40 rounded transition-colors ${
        value > 0 ? 'text-foreground' : 'text-muted-foreground/40'
      }`}
    >
      {formatCurrency(value || 0)}
    </button>
  )
}

function PercentCell({
  value,
  onChange,
  min,
  max,
  colored = false,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  colored?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const colorClass = colored
    ? value > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : value < 0
        ? 'text-red-600 dark:text-red-400'
        : ''
    : ''
  if (editing) {
    return (
      <Input
        type="number"
        autoFocus
        value={Math.round(value * 10) / 10 || ''}
        onChange={(e) => {
          let v = parseFloat(e.target.value) || 0
          if (max !== undefined) v = Math.min(max, v)
          if (min !== undefined) v = Math.max(min, v)
          onChange(v)
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
        step={1}
        className={`${NUM_INPUT_CLS} ${colorClass}`}
      />
    )
  }
  const display = Math.round(value * 10) / 10
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`w-full h-8 px-2 text-right text-sm font-mono tabular-nums hover:bg-muted/40 rounded transition-colors ${
        value !== 0 ? colorClass || 'text-foreground' : 'text-muted-foreground/40'
      }`}
    >
      {display}%
    </button>
  )
}

export function CalculatieModal({
  open,
  onClose,
  initialRegels,
  itemBeschrijving,
  onConfirm,
}: CalculatieModalProps) {
  const navigate = useNavigate()
  const { settings } = useAppSettings()
  const standaardMarge = settings.calculatie_standaard_marge ?? 35
  const standaardBtw = settings.standaard_btw ?? 21
  const categorieen = settings.calculatie_categorieen || ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig']
  const eenheden = settings.calculatie_eenheden || ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set']

  // State
  const [regels, setRegels] = useState<CalculatieRegel[]>([])
  const [beschrijving, setBeschrijving] = useState(itemBeschrijving || '')
  const [producten, setProducten] = useState<CalculatieProduct[]>([])
  const [templates, setTemplates] = useState<CalculatieTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  // Laden bij openen
  useEffect(() => {
    if (!open) return
    let cancelled = false
    if (initialRegels && initialRegels.length > 0) {
      setRegels(initialRegels)
    } else {
      // Start met 1 lege regel zodat de gebruiker meteen kan beginnen
      setRegels([createEmptyRegel({ marge: standaardMarge, btw: standaardBtw })])
    }
    setBeschrijving(itemBeschrijving || '')
    // Laad catalogus producten en templates
    getCalculatieProducten().then(p => { if (!cancelled) setProducten(p) }).catch(logger.error)
    getCalculatieTemplates().then(t => { if (!cancelled) setTemplates(t) }).catch(logger.error)
    return () => { cancelled = true }
  }, [open, initialRegels, itemBeschrijving, standaardMarge, standaardBtw])

  // ---- Regel CRUD ----

  const addRegel = useCallback(() => {
    setRegels((prev) => [...prev, createEmptyRegel({ marge: standaardMarge, btw: standaardBtw })])
  }, [standaardMarge, standaardBtw])

  const removeRegel = useCallback((id: string) => {
    setRegels((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const updateRegel = useCallback((id: string, updates: Partial<CalculatieRegel>) => {
    setRegels((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, ...updates }

        // Als inkoop wijzigt en marge staat vast -> herbereken verkoop
        if ('inkoop_prijs' in updates && !('verkoop_prijs' in updates)) {
          updated.verkoop_prijs = berekenVerkoopVanInkoop(updated.inkoop_prijs, updated.marge_percentage)
        }

        // Als marge wijzigt -> herbereken verkoop op basis van inkoop
        if ('marge_percentage' in updates && !('verkoop_prijs' in updates)) {
          updated.verkoop_prijs = berekenVerkoopVanInkoop(updated.inkoop_prijs, updated.marge_percentage)
        }

        // Als verkoop handmatig wijzigt -> herbereken marge
        if ('verkoop_prijs' in updates && !('marge_percentage' in updates) && !('inkoop_prijs' in updates)) {
          updated.marge_percentage = berekenMarge(updated.inkoop_prijs, updated.verkoop_prijs)
        }

        return updated
      })
    )
  }, [])

  // ---- Product uit catalogus kiezen ----

  const vulRegelMetProduct = useCallback((regelId: string, product: CalculatieProduct) => {
    updateRegel(regelId, {
      product_id: product.id,
      product_naam: product.naam,
      categorie: product.categorie,
      eenheid: product.eenheid,
      inkoop_prijs: product.inkoop_prijs,
      verkoop_prijs: product.verkoop_prijs,
      marge_percentage: product.standaard_marge,
      btw_percentage: product.btw_percentage,
    })
  }, [updateRegel])

  // ---- Template laden ----

  const laadTemplate = useCallback(async (template: CalculatieTemplate) => {
    // Waarschuw als er al regels zijn
    if (regels.length > 0 && regels.some((r) => r.product_naam.trim())) {
      const confirmed = await confirm({ message: 'Let op: dit vervangt alle huidige calculatie-regels. Doorgaan?', confirmLabel: 'Doorgaan' })
      if (!confirmed) return
    }
    // Geef elke regel een nieuw ID zodat er geen conflicten zijn
    const nieuweRegels = template.regels.map((r) => ({
      ...r,
      id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }))
    setRegels(nieuweRegels)
    if (template.beschrijving && !beschrijving) {
      setBeschrijving(template.beschrijving)
    }
    setShowTemplates(false)
  }, [beschrijving, regels])

  // ---- Berekeningen ----

  const totalen = useMemo(() => {
    let totaalInkoop = 0
    let totaalVerkoop = 0
    let totaalKorting = 0

    regels.forEach((r) => {
      const regelInkoop = round2(r.aantal * r.inkoop_prijs)
      const regelVerkoop = round2(r.aantal * r.verkoop_prijs)
      const kortingBedrag = round2(regelVerkoop * (r.korting_percentage / 100))
      totaalInkoop += regelInkoop
      totaalVerkoop += regelVerkoop - kortingBedrag
      totaalKorting += kortingBedrag
    })

    totaalInkoop = round2(totaalInkoop)
    totaalVerkoop = round2(totaalVerkoop)
    totaalKorting = round2(totaalKorting)

    const margeBedrag = round2(totaalVerkoop - totaalInkoop)
    const margePercentage = Math.round(berekenMarkupPercentage(totaalInkoop, totaalVerkoop) * 10) / 10

    return {
      totaalInkoop,
      totaalVerkoop,
      totaalKorting,
      margeBedrag,
      margePercentage,
    }
  }, [regels])

  // ---- Bevestigen ----

  const handleConfirm = () => {
    onConfirm({
      regels,
      totaalVerkoop: totalen.totaalVerkoop,
      totaalInkoop: totalen.totaalInkoop,
      beschrijving,
    })
    onClose()
  }

  // ---- Render ----

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
            <Calculator className="h-6 w-6 text-[#1A535C]" />
            Calculatie maken
          </DialogTitle>
          <DialogDescription className="text-foreground/70 text-sm">
            Bouw hier de prijs op uit losse onderdelen. Vul inkoop- en verkoopprijzen in,
            de marge wordt automatisch berekend.
          </DialogDescription>
        </DialogHeader>

        {/* Beschrijving */}
        <div className="space-y-2">
          <Label htmlFor="calc-beschrijving" className="text-sm font-semibold text-foreground">
            Omschrijving offerte-regel
          </Label>
          <Input
            id="calc-beschrijving"
            value={beschrijving}
            onChange={(e) => setBeschrijving(e.target.value)}
            placeholder="Bijv. Gevelreclame doosletter incl. montage"
            className="font-medium h-11 text-base"
          />
        </div>

        {/* Template knoppen */}
        <div className="flex items-center gap-2 flex-wrap">
          {templates.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <BookTemplate className="h-4 w-4 mr-1.5" />
                Template laden
              </Button>
              {showTemplates && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border dark:border-border rounded-lg shadow-lg p-2 min-w-[250px]">
                  <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/60 px-2 py-1">
                    Kies een template:
                  </p>
                  {templates.filter(t => t.actief).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => laadTemplate(t)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted dark:hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">{t.naam}</span>
                      {t.beschrijving && (
                        <span className="block text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
                          {t.beschrijving}
                        </span>
                      )}
                    </button>
                  ))}
                  <Separator className="my-1" />
                  <button
                    onClick={() => {
                      setShowTemplates(false)
                      onClose()
                      navigate('/instellingen', { state: { tab: 'calculatie' } })
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted dark:hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Templates beheren
                  </button>
                </div>
              )}
            </div>
          )}

          {templates.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose()
                navigate('/instellingen', { state: { tab: 'calculatie' } })
              }}
              className="text-muted-foreground text-xs gap-1"
            >
              <Settings className="h-3.5 w-3.5" />
              Templates beheren
            </Button>
          )}

          {producten.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 text-xs cursor-help">
                    <Package className="h-3 w-3" />
                    {producten.filter(p => p.actief).length} producten in catalogus
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Kies een product per regel via het dropdown menu in de &quot;Product&quot; kolom</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

        </div>

        <Separator />

        {/* ======== CALCULATIE TABEL ======== */}
        <div className="flex-1 overflow-auto min-h-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-background dark:bg-muted/50">
                  {/* Kolom headers met uitleg tooltips */}
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground dark:text-muted-foreground/60 min-w-[200px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          Product
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>De naam van het product, materiaal of de dienst.<br />Kies uit je catalogus of typ een naam.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 py-2.5 font-medium text-muted-foreground dark:text-muted-foreground/60 w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Aantal
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Hoeveel stuks, m&sup2;, uren, etc.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-left px-2 py-2.5 font-medium text-muted-foreground dark:text-muted-foreground/60 w-20">
                    Eenh.
                  </th>
                  <th className="text-right px-2 py-2.5 font-medium text-muted-foreground dark:text-muted-foreground/60 w-32">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Inkoop
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Wat jij betaalt per eenheid (inkoopprijs).<br />Dit ziet de klant NIET op de offerte.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 pl-4 py-2.5 font-medium text-muted-foreground dark:text-muted-foreground/60 w-32 border-l border-[#1A535C]/10 dark:border-[#5BB5B5]/10">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Verkoop
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Wat de klant betaalt per eenheid (verkoopprijs).<br />Wordt automatisch berekend op basis van inkoop + marge.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 py-2.5 font-medium text-muted-foreground dark:text-muted-foreground/60 w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Marge%
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Markup = winst t.o.v. inkoop.<br />Voorbeeld: inkoop &euro;100, verkoop &euro;200 &rarr; 100% markup.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 py-2.5 font-medium text-muted-foreground dark:text-muted-foreground/60 w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Korting%
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Korting die je de klant geeft op deze regel.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium text-muted-foreground dark:text-muted-foreground/60 w-32">
                    Regeltotaal
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {regels.map((regel, index) => {
                  const regelVerkoop = round2(regel.aantal * regel.verkoop_prijs)
                  const kortingBedrag = round2(regelVerkoop * (regel.korting_percentage / 100))
                  const regelTotaal = round2(regelVerkoop - kortingBedrag)
                  const regelInkoop = round2(regel.aantal * regel.inkoop_prijs)
                  const isWinst = regelTotaal > regelInkoop

                  return (
                    <React.Fragment key={regel.id}>
                    <tr
                      className={`border-b border-border/40 dark:border-border/40 ${
                        index % 2 === 0
                          ? 'bg-card'
                          : 'bg-background/50 dark:bg-muted/20'
                      } hover:bg-[hsl(var(--status-green-bg))]/40 dark:hover:bg-[#1A5C5E]/10 transition-colors`}
                    >
                      {/* Product */}
                      <td className="px-2 py-1.5">
                        <ProductCatalogusCombobox
                          value={regel.product_naam}
                          producten={producten}
                          onSelectProduct={(p) => vulRegelMetProduct(regel.id, p)}
                          onVrijeNaam={(naam) => updateRegel(regel.id, { product_naam: naam, product_id: undefined })}
                          placeholder="Zoek of typ product..."
                        />
                      </td>

                      {/* Aantal */}
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={regel.aantal || ''}
                          onChange={(e) => updateRegel(regel.id, { aantal: Math.max(0, parseFloat(e.target.value) || 0) })}
                          min={0}
                          step={1}
                          className={NUM_INPUT_CLS}
                        />
                      </td>

                      {/* Eenheid */}
                      <td className="px-1 py-1.5">
                        <Select
                          value={regel.eenheid}
                          onValueChange={(v) => updateRegel(regel.id, { eenheid: v })}
                        >
                          <SelectTrigger className="border-0 bg-transparent shadow-none h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {eenheden.map((e) => (
                              <SelectItem key={e} value={e}>{e}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Inkoop */}
                      <td className="px-2 py-1.5">
                        <CurrencyCell
                          value={regel.inkoop_prijs}
                          onChange={(v) => updateRegel(regel.id, { inkoop_prijs: v })}
                        />
                      </td>

                      {/* Verkoop */}
                      <td className="px-2 pl-4 py-1.5 border-l border-[#1A535C]/10 dark:border-[#5BB5B5]/10">
                        <CurrencyCell
                          value={regel.verkoop_prijs}
                          onChange={(v) => updateRegel(regel.id, { verkoop_prijs: v })}
                        />
                      </td>

                      {/* Marge % */}
                      <td className="px-2 py-1.5">
                        <PercentCell
                          value={regel.marge_percentage}
                          onChange={(v) => updateRegel(regel.id, { marge_percentage: v })}
                          colored
                        />
                      </td>

                      {/* Korting % */}
                      <td className="px-2 py-1.5">
                        <PercentCell
                          value={regel.korting_percentage}
                          onChange={(v) => updateRegel(regel.id, { korting_percentage: v })}
                          min={0}
                          max={100}
                        />
                      </td>

                      {/* Regeltotaal */}
                      <td className="px-3 py-1.5 text-right">
                        {regelTotaal !== 0 && (
                          <span className={`font-semibold font-mono tabular-nums text-sm ${
                            isWinst
                              ? 'text-foreground dark:text-muted-foreground/20'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(regelTotaal)}
                          </span>
                        )}
                      </td>

                      {/* Verwijderen */}
                      <td className="px-1 py-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRegel(regel.id)}
                          className="h-7 w-7 text-muted-foreground/60 hover:text-red-500"
                          disabled={regels.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Regel toevoegen knop */}
          <Button
            variant="outline"
            size="sm"
            onClick={addRegel}
            className="w-full mt-3 border-dashed border-2 hover:border-[#1A5C5E]/40 hover:bg-[hsl(var(--status-green-bg))]/50 dark:hover:bg-[#1A5C5E]/10"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Regel toevoegen
          </Button>
        </div>

        <Separator />

        {/* ======== TOTALEN SAMENVATTING ======== */}
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-lg border border-border dark:border-border overflow-hidden">
          <div className="px-5 py-4 bg-background dark:bg-muted/50">
            <div className="text-xs text-muted-foreground dark:text-muted-foreground/60 mb-1">Totaal inkoop</div>
            <div className="font-mono tabular-nums text-lg text-foreground/70 dark:text-muted-foreground/50">
              {formatCurrency(totalen.totaalInkoop)}
            </div>
          </div>
          <div className="px-5 py-4 bg-background dark:bg-muted/50 border-l border-border/60 dark:border-border/40">
            <div className="text-xs text-muted-foreground dark:text-muted-foreground/60 mb-1">Totaal verkoop</div>
            <div className="font-mono tabular-nums text-lg text-foreground dark:text-muted-foreground/20">
              {formatCurrency(totalen.totaalVerkoop)}
            </div>
            {totalen.totaalKorting > 0 && (
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 font-mono tabular-nums">
                incl. − {formatCurrency(totalen.totaalKorting)} korting
              </div>
            )}
          </div>
          <div className="px-5 py-4 bg-background dark:bg-muted/50 border-l border-border/60 dark:border-border/40">
            <div className="text-xs text-muted-foreground dark:text-muted-foreground/60 mb-1">
              Marge <span className="text-muted-foreground/60">({Math.round(totalen.margePercentage)}%)</span>
            </div>
            <div className={`font-mono tabular-nums text-lg font-medium ${
              totalen.margeBedrag >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(totalen.margeBedrag)}
            </div>
          </div>
          <div className="px-5 py-4 bg-[#1A535C] dark:bg-[#1A535C]/80 text-white">
            <div className="text-xs text-white/70 mb-1">
              Verkooptotaal<span className="text-[#F15025]">.</span>
            </div>
            <div className="font-mono tabular-nums text-xl font-bold">
              {formatCurrency(totalen.totaalVerkoop)}
            </div>
          </div>
        </div>

        {/* ======== FOOTER KNOPPEN ======== */}
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={regels.length === 0 || !beschrijving.trim()}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Calculatie overnemen
          </Button>
        </DialogFooter>
      </DialogContent>

    </Dialog>
  )
}
