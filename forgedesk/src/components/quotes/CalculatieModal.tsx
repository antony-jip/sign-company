import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
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
  FileDown,
  BookTemplate,
  Save,
  Settings,
  Loader2,
  Minus,
  Copy,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import { berekenMarkupPercentage, berekenVerkoopVanMarkup } from '@/utils/margeBerekening'
import { berekenCalculatieTotalen, berekenRegeltotaal } from '@/utils/calculatieBerekening'
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

/** Vaste opstartkosten die je makkelijk vergeet door te rekenen. */
const OPSTARTKOSTEN_BEDRAG = 50

function maakOpstartkostenRegel(btw: number): CalculatieRegel {
  return {
    id: `opstart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_naam: 'Opstartkosten',
    categorie: '',
    eenheid: 'stuks',
    aantal: 1,
    inkoop_prijs: 0,
    verkoop_prijs: OPSTARTKOSTEN_BEDRAG,
    marge_percentage: 0,
    korting_percentage: 0,
    nacalculatie: false,
    btw_percentage: btw,
    notitie: '',
    is_opstartkosten: true,
  }
}

interface CalculatieModalProps {
  open: boolean
  onClose: () => void
  /** De huidige calculatieregels (als je een bestaande calculatie bewerkt) */
  initialRegels?: CalculatieRegel[]
  /** Of dit het eerste offerte-item is — alleen dan tonen we de opstartkosten-optie */
  isEersteItem?: boolean
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

const NUM_INPUT_CLS = 'border-0 bg-transparent dark:bg-transparent shadow-none focus-visible:ring-1 h-8 w-full px-2 text-right text-sm font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

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
  isEersteItem = false,
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
      // Start met 1 lege regel zodat de gebruiker meteen kan beginnen.
      // Bij het eerste item staan de opstartkosten standaard aan (vergeet je snel).
      const start = [createEmptyRegel({ marge: standaardMarge, btw: standaardBtw })]
      if (isEersteItem) start.push(maakOpstartkostenRegel(standaardBtw))
      setRegels(start)
    }
    setBeschrijving(itemBeschrijving || '')
    // Laad catalogus producten en templates
    getCalculatieProducten().then(p => { if (!cancelled) setProducten(p) }).catch(logger.error)
    getCalculatieTemplates().then(t => { if (!cancelled) setTemplates(t) }).catch(logger.error)
    return () => { cancelled = true }
  }, [open, initialRegels, itemBeschrijving, standaardMarge, standaardBtw, isEersteItem])

  // ---- Regel CRUD ----

  const addRegel = useCallback(() => {
    setRegels((prev) => [...prev, createEmptyRegel({ marge: standaardMarge, btw: standaardBtw })])
  }, [standaardMarge, standaardBtw])

  const removeRegel = useCallback((id: string) => {
    setRegels((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const duplicateRegel = useCallback((id: string) => {
    setRegels((prev) => {
      const idx = prev.findIndex((r) => r.id === id)
      if (idx === -1) return prev
      const kopie: CalculatieRegel = {
        ...prev[idx],
        id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        is_opstartkosten: false,
      }
      return [...prev.slice(0, idx + 1), kopie, ...prev.slice(idx + 1)]
    })
  }, [])

  // Enter in een bedrag/aantal-veld van de laatste regel voegt een nieuwe regel
  // toe en zet de focus erop, zodat je zonder muis kunt doortypen.
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const focusNieuweRegelRef = useRef(false)

  const handleRegelEnter = useCallback((e: React.KeyboardEvent, regel: CalculatieRegel, isLaatste: boolean) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    const target = e.target as HTMLElement
    if (target.tagName !== 'INPUT' || (target as HTMLInputElement).type !== 'number') return
    if (!isLaatste) return
    const heeftInhoud = regel.product_naam.trim() !== '' || regel.verkoop_prijs > 0 || regel.inkoop_prijs > 0
    if (!heeftInhoud) return
    focusNieuweRegelRef.current = true
    addRegel()
  }, [addRegel])

  useEffect(() => {
    if (!focusNieuweRegelRef.current) return
    focusNieuweRegelRef.current = false
    const rijen = tbodyRef.current?.querySelectorAll('tr')
    const laatste = rijen?.[rijen.length - 1]
    laatste?.querySelector<HTMLElement>('input')?.focus()
  }, [regels.length])

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

  const totalen = useMemo(() => berekenCalculatieTotalen(regels), [regels])

  const zichtbareRegels = regels.filter((r) => !r.is_opstartkosten)

  // ---- Afronden ----

  const STAP = 5
  const volgendeStap = round2(Math.floor(totalen.totaalVerkoop / STAP) * STAP + STAP)
  const vorigeStap = round2(Math.ceil(totalen.totaalVerkoop / STAP) * STAP - STAP)
  const kanOmlaag = vorigeStap > 0 && vorigeStap < totalen.totaalVerkoop

  // ---- Opstartkosten ----

  const opstartkostenRegel = regels.find((r) => r.is_opstartkosten)
  const heeftOpstartkosten = !!opstartkostenRegel
  const opstartkostenBedrag = opstartkostenRegel?.verkoop_prijs ?? OPSTARTKOSTEN_BEDRAG

  const toggleOpstartkosten = useCallback((aan: boolean) => {
    setRegels((prev) => {
      const zonder = prev.filter((r) => !r.is_opstartkosten)
      return aan ? [...zonder, maakOpstartkostenRegel(standaardBtw)] : zonder
    })
  }, [standaardBtw])

  const setOpstartkostenBedrag = useCallback((bedrag: number) => {
    setRegels((prev) => prev.map((r) => (r.is_opstartkosten ? { ...r, verkoop_prijs: round2(bedrag) } : r)))
  }, [])

  // Zet het verkooptotaal op een doelbedrag door de verkoopprijs van de laatste
  // regel-met-waarde bij te stellen, zodat de regels blijven optellen tot het
  // doel. De marge van die regel wordt mee herberekend.
  const zetVerkooptotaalOp = useCallback((doel: number) => {
    setRegels((prev) => {
      if (doel <= 0) return prev

      let idx = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (!prev[i].is_opstartkosten && round2(prev[i].aantal * prev[i].verkoop_prijs) > 0) { idx = i; break }
      }
      if (idx === -1) return prev

      const setVerkoop = (rij: CalculatieRegel, verkoop: number): CalculatieRegel => ({
        ...rij,
        verkoop_prijs: verkoop,
        marge_percentage: berekenMarge(rij.inkoop_prijs, verkoop),
      })

      const huidig = berekenCalculatieTotalen(prev).totaalVerkoop
      const overige = round2(huidig - berekenRegeltotaal(prev[idx]))
      if (doel < overige) return prev // kan niet lager dan de overige regels samen
      const kortingFactor = 1 - (prev[idx].korting_percentage || 0) / 100
      if (kortingFactor <= 0) return prev
      const benodigdRegelVerkoop = round2(round2(doel - overige) / kortingFactor)
      const nieuweVerkoop = round2(benodigdRegelVerkoop / (prev[idx].aantal || 1))

      let next = prev.map((r, i) => (i === idx ? setVerkoop(r, nieuweVerkoop) : r))

      // Corrigeer eventuele cent-afwijking door afrondingen per regel
      for (let pass = 0; pass < 3; pass++) {
        const verschil = round2(doel - berekenCalculatieTotalen(next).totaalVerkoop)
        if (verschil === 0) break
        const vp = round2(next[idx].verkoop_prijs + verschil / (next[idx].aantal || 1))
        next = next.map((r, i) => (i === idx ? setVerkoop(r, vp) : r))
      }

      return next
    })
  }, [])

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
                <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border/70 rounded-[14px] shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] p-1.5 min-w-[250px]">
                  <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/60 px-2 py-1">
                    Kies een template:
                  </p>
                  {templates.filter(t => t.actief).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => laadTemplate(t)}
                      className="w-full text-left px-2.5 py-2 text-sm rounded-[8px] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
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
                    className="w-full text-left px-2.5 py-2 text-sm rounded-[8px] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors flex items-center gap-2 text-muted-foreground"
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
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/60 min-w-[200px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          Product                        </TooltipTrigger>
                        <TooltipContent>
                          <p>De naam van het product, materiaal of de dienst.<br />Kies uit je catalogus of typ een naam.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/60 w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Aantal                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Hoeveel stuks, m&sup2;, uren, etc.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-left px-2 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/60 w-20">
                    Eenh.
                  </th>
                  <th className="text-right px-2 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/60 w-32">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Inkoop                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Wat jij betaalt per eenheid (inkoopprijs).<br />Dit ziet de klant NIET op de offerte.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 pl-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/60 w-32 border-l border-[#1A535C]/10 dark:border-[#5BB5B5]/10">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Verkoop                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Wat de klant betaalt per eenheid (verkoopprijs).<br />Wordt automatisch berekend op basis van inkoop + marge.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-2 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/60 w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                          Marge%                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Markup = winst t.o.v. inkoop.<br />Voorbeeld: inkoop &euro;100, verkoop &euro;200 &rarr; 100% markup.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground dark:text-muted-foreground/60 w-32">
                    Regeltotaal
                  </th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody ref={tbodyRef}>
                {zichtbareRegels.map((regel, index) => {
                  const regelTotaal = berekenRegeltotaal(regel)
                  const regelInkoop = round2(regel.aantal * regel.inkoop_prijs)
                  const isWinst = regelTotaal > regelInkoop
                  const isLaatste = index === zichtbareRegels.length - 1

                  return (
                    <React.Fragment key={regel.id}>
                    <tr
                      onKeyDown={(e) => handleRegelEnter(e, regel, isLaatste)}
                      className="group border-b border-border/40 dark:border-border/40 bg-card hover:bg-[hsl(var(--status-green-bg))]/40 dark:hover:bg-[#1A5C5E]/10 transition-colors"
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

                      {/* Acties */}
                      <td className="px-1 py-1.5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateRegel(regel.id)}
                            className="h-7 w-7 text-muted-foreground/60 hover:text-[#1A535C]"
                            title="Regel dupliceren"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRegel(regel.id)}
                            className="h-7 w-7 text-muted-foreground/60 hover:text-red-500"
                            disabled={zichtbareRegels.length <= 1}
                            title="Regel verwijderen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
            className="w-full mt-2 h-8 border-dashed text-muted-foreground hover:border-[#1A5C5E]/40 hover:bg-[hsl(var(--status-green-bg))]/50 dark:hover:bg-[#1A5C5E]/10"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Regel toevoegen
          </Button>
        </div>

        {/* ======== SAMENVATTING — één coherente kaart ======== */}
        <div className="overflow-hidden rounded-xl border border-border">
          {isEersteItem && (
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
              <Checkbox
                id="calc-opstartkosten"
                checked={heeftOpstartkosten}
                onCheckedChange={(v) => toggleOpstartkosten(v === true)}
                className="border-[#1A535C] data-[state=checked]:bg-[#1A535C] data-[state=checked]:border-[#1A535C]"
              />
              <label
                htmlFor="calc-opstartkosten"
                className="flex flex-1 cursor-pointer select-none items-baseline gap-2"
              >
                <span className="text-sm font-medium text-foreground">Opstartkosten meerekenen</span>
                <span className="text-xs text-muted-foreground">kosten die je snel vergeet</span>
              </label>
              <div className={`flex shrink-0 items-center gap-1 rounded-md border px-2 transition-colors ${
                heeftOpstartkosten ? 'border-border bg-background' : 'border-transparent opacity-40'
              }`}>
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  disabled={!heeftOpstartkosten}
                  value={opstartkostenBedrag || ''}
                  onChange={(e) => setOpstartkostenBedrag(parseFloat(e.target.value) || 0)}
                  aria-label="Opstartkosten bedrag"
                  className="h-7 w-16 border-0 bg-transparent dark:bg-transparent px-1 text-right text-sm font-mono font-semibold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
            <div className="flex items-center gap-6">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground">Inkoop</span>
                <span className="font-mono tabular-nums text-base text-foreground/70">{formatCurrency(totalen.totaalInkoop)}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground">Verkoop</span>
                <span className="font-mono tabular-nums text-base text-foreground">{formatCurrency(totalen.totaalVerkoop)}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground">Marge</span>
                <span className={`font-mono tabular-nums text-base font-medium ${
                  totalen.margeBedrag >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(totalen.margeBedrag)}
                </span>
                <span className="text-sm text-muted-foreground/70">({Math.round(totalen.margePercentage)}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Verkooptotaal<span className="text-[#F15025]">.</span>
                </div>
                <div className="font-mono tabular-nums text-2xl font-bold text-[#1A535C] dark:text-white">
                  {formatCurrency(totalen.totaalVerkoop)}
                </div>
              </div>
              {totalen.totaalVerkoop > 0 && (
                <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => zetVerkooptotaalOp(vorigeStap)}
                    disabled={!kanOmlaag}
                    aria-label="€ 5 omlaag"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[#1A535C] transition-colors hover:bg-[#1A535C] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#1A535C] dark:text-white"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => zetVerkooptotaalOp(volgendeStap)}
                    aria-label="€ 5 omhoog"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[#1A535C] transition-colors hover:bg-[#1A535C] hover:text-white dark:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
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
