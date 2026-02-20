import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
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
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getCalculatieProducten, getCalculatieTemplates } from '@/services/supabaseService'
import type { CalculatieRegel, CalculatieProduct, CalculatieTemplate } from '@/types'
import { logger } from '../../utils/logger'

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

/** Bereken verkoopprijs op basis van inkoop + marge */
function berekenVerkoopVanInkoop(inkoop: number, margePerc: number): number {
  return inkoop * (1 + margePerc / 100)
}

/** Bereken marge% op basis van inkoop en verkoop */
function berekenMarge(inkoop: number, verkoop: number): number {
  if (inkoop === 0) return 0
  return ((verkoop - inkoop) / inkoop) * 100
}

export function CalculatieModal({
  open,
  onClose,
  initialRegels,
  itemBeschrijving,
  onConfirm,
}: CalculatieModalProps) {
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
    if (open) {
      if (initialRegels && initialRegels.length > 0) {
        setRegels(initialRegels)
      } else {
        // Start met 1 lege regel zodat de gebruiker meteen kan beginnen
        setRegels([createEmptyRegel({ marge: standaardMarge, btw: standaardBtw })])
      }
      setBeschrijving(itemBeschrijving || '')
      // Laad catalogus producten en templates
      getCalculatieProducten().then(setProducten).catch(logger.error)
      getCalculatieTemplates().then(setTemplates).catch(logger.error)
    }
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

  const laadTemplate = useCallback((template: CalculatieTemplate) => {
    // Waarschuw als er al regels zijn
    if (regels.length > 0 && regels.some((r) => r.product_naam.trim())) {
      const confirmed = window.confirm('Let op: dit vervangt alle huidige calculatie-regels. Doorgaan?')
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
      const regelInkoop = r.aantal * r.inkoop_prijs
      const regelVerkoop = r.aantal * r.verkoop_prijs
      const kortingBedrag = regelVerkoop * (r.korting_percentage / 100)
      totaalInkoop += regelInkoop
      totaalVerkoop += regelVerkoop - kortingBedrag
      totaalKorting += kortingBedrag
    })

    const margeBedrag = totaalVerkoop - totaalInkoop
    const margePercentage = totaalInkoop > 0 ? (margeBedrag / totaalInkoop) * 100 : 0

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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-5 w-5 text-blue-600" />
            Calculatie maken
          </DialogTitle>
          <DialogDescription>
            Bouw hier de prijs op uit losse onderdelen. Vul inkoop- en verkoopprijzen in,
            de marge wordt automatisch berekend.
          </DialogDescription>
        </DialogHeader>

        {/* Beschrijving */}
        <div className="space-y-2">
          <Label htmlFor="calc-beschrijving" className="text-sm font-medium">
            Omschrijving offerte-regel
          </Label>
          <Input
            id="calc-beschrijving"
            value={beschrijving}
            onChange={(e) => setBeschrijving(e.target.value)}
            placeholder="Bijv. Gevelreclame doosletter incl. montage"
            className="font-medium"
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
                <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[250px]">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
                    Kies een template:
                  </p>
                  {templates.filter(t => t.actief).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => laadTemplate(t)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="font-medium">{t.naam}</span>
                      {t.beschrijving && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {t.beschrijving}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                  <p>Kies een product per regel via het dropdown menu in de "Product" kolom</p>
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
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {/* Kolom headers met uitleg tooltips */}
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400 min-w-[200px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          Product
                          <HelpCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>De naam van het product, materiaal of de dienst.<br />Kies uit je catalogus of typ een naam.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-center px-2 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 mx-auto">
                          Aantal
                          <HelpCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Hoeveel stuks, m&sup2;, uren, etc.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-center px-2 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-20">
                    Eenh.
                  </th>
                  <th className="text-right px-2 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-28">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Inkoop
                          <HelpCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Wat jij betaalt per eenheid (inkoopprijs).<br />Dit ziet de klant NIET op de offerte.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-28">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Verkoop
                          <HelpCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Wat de klant betaalt per eenheid (verkoopprijs).<br />Wordt automatisch berekend op basis van inkoop + marge.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Marge%
                          <HelpCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Je winstmarge in procenten.<br />Pas dit aan om de verkoopprijs te wijzigen,<br />of wijzig de verkoopprijs om de marge te zien.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Korting%
                          <HelpCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Korting die je de klant geeft op deze regel.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-center px-2 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-16">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 mx-auto">
                          Nacalc.
                          <HelpCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Vink aan als dit een nacalculatie-post is.<br />Deze regel wordt achteraf verrekend<br />op basis van werkelijke kosten.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-28">
                    Regeltotaal
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {regels.map((regel, index) => {
                  const regelVerkoop = regel.aantal * regel.verkoop_prijs
                  const kortingBedrag = regelVerkoop * (regel.korting_percentage / 100)
                  const regelTotaal = regelVerkoop - kortingBedrag
                  const regelInkoop = regel.aantal * regel.inkoop_prijs
                  const isWinst = regelTotaal > regelInkoop

                  return (
                    <tr
                      key={regel.id}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-900'
                          : 'bg-gray-50/50 dark:bg-gray-800/20'
                      } hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors`}
                    >
                      {/* Product */}
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          {producten.length > 0 ? (
                            <Select
                              value={regel.product_id || '__custom__'}
                              onValueChange={(val) => {
                                if (val === '__custom__') {
                                  updateRegel(regel.id, { product_id: undefined })
                                } else {
                                  const p = producten.find((pr) => pr.id === val)
                                  if (p) vulRegelMetProduct(regel.id, p)
                                }
                              }}
                            >
                              <SelectTrigger className="border-0 bg-transparent shadow-none h-8 w-[60px] px-1 flex-shrink-0">
                                <Package className="h-3.5 w-3.5 text-gray-400" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__custom__">
                                  <span className="text-gray-500">Handmatig invoeren</span>
                                </SelectItem>
                                {producten.filter(p => p.actief).map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                                        {p.categorie}
                                      </Badge>
                                      <span>{p.naam}</span>
                                      <span className="text-gray-400 text-xs ml-auto">
                                        {formatCurrency(p.verkoop_prijs)}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                          <Input
                            value={regel.product_naam}
                            onChange={(e) => updateRegel(regel.id, { product_naam: e.target.value })}
                            placeholder="Productnaam..."
                            className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-8 text-sm flex-1"
                          />
                        </div>
                      </td>

                      {/* Aantal */}
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={regel.aantal || ''}
                          onChange={(e) => updateRegel(regel.id, { aantal: Math.max(0, parseFloat(e.target.value) || 0) })}
                          min={0}
                          step={1}
                          className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-8 text-center text-sm"
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
                        <Input
                          type="number"
                          value={regel.inkoop_prijs || ''}
                          onChange={(e) => updateRegel(regel.id, { inkoop_prijs: Math.max(0, parseFloat(e.target.value) || 0) })}
                          min={0}
                          step={0.01}
                          className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-8 text-right text-sm"
                          placeholder="0,00"
                        />
                      </td>

                      {/* Verkoop */}
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={regel.verkoop_prijs || ''}
                          onChange={(e) => updateRegel(regel.id, { verkoop_prijs: Math.max(0, parseFloat(e.target.value) || 0) })}
                          min={0}
                          step={0.01}
                          className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-8 text-right text-sm"
                          placeholder="0,00"
                        />
                      </td>

                      {/* Marge % */}
                      <td className="px-2 py-1.5">
                        <div className="relative">
                          <Input
                            type="number"
                            value={Math.round(regel.marge_percentage * 10) / 10 || ''}
                            onChange={(e) => updateRegel(regel.id, { marge_percentage: parseFloat(e.target.value) || 0 })}
                            step={1}
                            className={`border-0 bg-transparent shadow-none focus-visible:ring-1 h-8 text-right text-sm pr-6 ${
                              regel.marge_percentage > 0
                                ? 'text-green-600 dark:text-green-400'
                                : regel.marge_percentage < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : ''
                            }`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </td>

                      {/* Korting % */}
                      <td className="px-2 py-1.5">
                        <div className="relative">
                          <Input
                            type="number"
                            value={regel.korting_percentage || ''}
                            onChange={(e) => updateRegel(regel.id, { korting_percentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                            min={0}
                            max={100}
                            step={1}
                            className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-8 text-right text-sm pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </td>

                      {/* Nacalculatie */}
                      <td className="px-2 py-1.5 text-center">
                        <Checkbox
                          checked={regel.nacalculatie}
                          onCheckedChange={(checked) => updateRegel(regel.id, { nacalculatie: !!checked })}
                          className="mx-auto"
                        />
                      </td>

                      {/* Regeltotaal */}
                      <td className="px-3 py-1.5 text-right">
                        <span className={`font-medium text-sm ${
                          isWinst
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(regelTotaal)}
                        </span>
                      </td>

                      {/* Verwijderen */}
                      <td className="px-1 py-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRegel(regel.id)}
                          className="h-7 w-7 text-gray-400 hover:text-red-500"
                          disabled={regels.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
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
            className="w-full mt-3 border-dashed border-2 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Regel toevoegen
          </Button>
        </div>

        <Separator />

        {/* ======== TOTALEN SAMENVATTING ======== */}
        <div className="grid grid-cols-2 gap-4">
          {/* Uitleg blok links */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              Zo werkt de calculatie
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1.5">
              <li><strong>Inkoop:</strong> Wat jij betaalt (ziet de klant niet)</li>
              <li><strong>Marge:</strong> Je winstopslag in %. Pas dit aan of wijzig de verkoopprijs direct</li>
              <li><strong>Verkoop:</strong> Wat de klant betaalt. Wordt de eenheidsprijs op de offerte</li>
              <li><strong>Nacalc.:</strong> Vink aan als kosten achteraf worden verrekend</li>
            </ul>
          </div>

          {/* Totalen blok rechts */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Totaal inkoop</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {formatCurrency(totalen.totaalInkoop)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Totaal verkoop</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(totalen.totaalVerkoop)}
              </span>
            </div>
            {totalen.totaalKorting > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Totaal korting</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  - {formatCurrency(totalen.totaalKorting)}
                </span>
              </div>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Marge ({Math.round(totalen.margePercentage)}%)
              </span>
              <span className={`font-bold ${
                totalen.margeBedrag >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(totalen.margeBedrag)}
              </span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-900 dark:text-white">Verkooptotaal</span>
              <span className="text-blue-600 dark:text-blue-400">
                {formatCurrency(totalen.totaalVerkoop)}
              </span>
            </div>
          </div>
        </div>

        {/* ======== FOOTER KNOPPEN ======== */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button
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
