import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Search,
  ArrowLeft,
  Loader2,
  Package,
  AlertTriangle,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import { useAuth } from '@/contexts/AuthContext'
import type { ProboOptie } from '@/types'
import { logger } from '../../utils/logger'

// ── Types ──

interface ProboProduct {
  code: string
  name: string
  category?: string
  [key: string]: unknown
}

// Probo /products/configure response types
interface ProboOptionChild {
  code: string
  name?: string
  description?: string
  type_code?: string // "width", "height", "amount", "radio", "checkbox", etc.
  value?: string | null
  default_value?: string
  min_value?: string
  max_value?: string
  step_size?: string
  scale?: string
  reversible?: boolean
  last_option?: boolean
  images?: Array<{ language: string; url: string }>
  // Flat option properties (from /products/product/{code})
  type?: string
  values?: Array<{ code: string; name?: string; [key: string]: unknown }>
  required?: boolean
  children?: ProboOptionChild[]
}

interface ProboAvailableOption {
  code: string
  name?: string
  children: ProboOptionChild[]
}

interface ProboSelectedOption {
  code: string
  value: string
  parent_code?: string
  name?: string
}

interface ProboConfigureResponse {
  products?: Array<{
    code: string
    name?: string
    available_options?: ProboAvailableOption[]
    selected_options?: ProboSelectedOption[]
    can_order?: boolean
    // From /products/product/{code} endpoint
    options?: ProboOptionChild[]
    [key: string]: unknown
  }>
  // Price fields (when can_order is true)
  products_purchase_price?: number
  products_purchase_price_incl_vat?: number
  products_purchase_base_price?: number
  products_sales_price?: number
  products_sales_price_incl_vat?: number
  purchase_shipping_price?: number
  products_purchase_rush_surcharge?: number
}

interface ProboPriceResult {
  inkoop_excl: number
  inkoop_incl: number
  inkoop_basis: number
  advies_verkoop: number
  advies_verkoop_incl: number
  verzendkosten: number
  rush_toeslag: number
}

export interface ProboPickerResult {
  product_code: string
  customer_code?: string
  product_naam: string
  opties: ProboOptie[]
  inkoop_excl: number
  inkoop_incl: number
  advies_verkoop: number
  omschrijving: string
}

interface ProboProductPickerProps {
  onSelect: (result: ProboPickerResult) => void
  onCancel: () => void
}

// ── Auto-categorization for API products ──

// Maps keyword patterns (in product code or name) to category names.
// Order matters: first match wins.
const CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['banner', 'spandoek', 'mesh'], category: 'Banners & spandoeken' },
  { keywords: ['dibond', 'acrylic', 'acryl', 'forex', 're-board', 'reboard', 'corrugat', 'golfkarton', 'rigid', 'board', 'alumini', 'pvc-board'], category: 'Plaat materiaal' },
  { keywords: ['sticker', 'decal', 'folie', 'foil', 'vinyl', 'wrap', 'window', 'floor', 'wall-decal', 'magnet'], category: 'Stickers & folie' },
  { keywords: ['textile', 'textiel', 'fabric', 'flag', 'vlag', 'deco-fabric', 'backlit-textile'], category: 'Textiel' },
  { keywords: ['wallpaper', 'wall-paper', 'wall-textile', 'walltex', 'behang', 'wandbekleding'], category: 'Wandbekleding' },
  { keywords: ['roll-up', 'rollup', 'pop-up', 'popup', 'x-banner', 'a-frame', 'display', 'stoepbord'], category: 'Displays' },
  { keywords: ['poster', 'canvas', 'photo-paper', 'fotopapier', 'backlit-paper', 'papier', 'paper', 'fine-art'], category: 'Papier & canvas' },
  { keywords: ['mat', 'carpet', 'doormat'], category: 'Overig' },
]

function categorizeProduct(code: string, name: string): string {
  const lower = `${code} ${name}`.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category
    }
  }
  return 'Overig'
}

// ── Cache ──

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const productListCache: { entry: CacheEntry<ProboProduct[]> | null } = { entry: null }
const PRODUCT_LIST_TTL = 60 * 60 * 1000

// ── Helpers ──

/** Determine if a child option is a numeric input */
function isNumericOption(child: ProboOptionChild): boolean {
  const tc = child.type_code?.toLowerCase() || ''
  const code = child.code?.toLowerCase() || ''
  return (
    tc === 'width' || tc === 'height' || tc === 'amount' ||
    tc === 'number' || tc === 'integer' || tc === 'input' ||
    code === 'width' || code === 'height' || code === 'amount' ||
    child.type === 'number'
  )
}

/** Determine if a child option is a radio/select */
function isRadioOption(child: ProboOptionChild): boolean {
  const tc = child.type_code?.toLowerCase() || ''
  return tc === 'radio' || tc === 'select' || tc === 'dropdown'
}

/** Get display label for numeric input */
function getNumericLabel(child: ProboOptionChild): string {
  if (child.name) return child.name
  const code = child.type_code || child.code
  switch (code?.toLowerCase()) {
    case 'width': return 'Breedte (cm)'
    case 'height': return 'Hoogte (cm)'
    case 'amount': return 'Aantal'
    default: return code || 'Waarde'
  }
}

// ── Component ──

export function ProboProductPicker({ onSelect, onCancel }: ProboProductPickerProps) {
  const { session } = useAuth()
  const token = session?.access_token || ''

  // Navigation state
  const [step, setStep] = useState<'browse' | 'configure'>('browse')

  // Browse state
  const [apiProducts, setApiProducts] = useState<ProboProduct[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Configure wizard state
  const [productCode, setProductCode] = useState('')
  const [productName, setProductName] = useState('')
  const [isLoadingConfigure, setIsLoadingConfigure] = useState(false)
  const [configureError, setConfigureError] = useState<string | null>(null)

  // Probo configure response
  const [availableOptions, setAvailableOptions] = useState<ProboAvailableOption[]>([])
  const [selectedOptions, setSelectedOptions] = useState<ProboSelectedOption[]>([])
  const [canOrder, setCanOrder] = useState(false)

  // Current step option values (user input for current available_options)
  const [currentValues, setCurrentValues] = useState<Record<string, string>>({})

  // Price state
  const [priceResult, setPriceResult] = useState<ProboPriceResult | null>(null)
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch API products ──

  const fetchApiProducts = useCallback(async () => {
    if (productListCache.entry && Date.now() < productListCache.entry.expiresAt) {
      setApiProducts(productListCache.entry.data)
      return
    }
    setIsLoadingProducts(true)
    try {
      const response = await fetch('/api/probo-products', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) { setApiProducts([]); return }
      const data = await response.json() as { products: ProboProduct[] }
      const prods = Array.isArray(data.products) ? data.products : []
      productListCache.entry = { data: prods, expiresAt: Date.now() + PRODUCT_LIST_TTL }
      setApiProducts(prods)
    } catch {
      setApiProducts([])
    } finally {
      setIsLoadingProducts(false)
    }
  }, [token])

  useEffect(() => { fetchApiProducts() }, [fetchApiProducts])

  useEffect(() => {
    if (step === 'browse') {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [step])

  // ── Combined product list ──

  const allProducts = useMemo(() => {
    // Use only API products (these are guaranteed to exist in Probo)
    // and auto-categorize them based on their code/name
    return apiProducts.map((p) => ({
      ...p,
      category: p.category || categorizeProduct(p.code, p.name),
    }))
  }, [apiProducts])

  const filteredProducts = useMemo(() => {
    let list = allProducts
    if (selectedCategory) list = list.filter((p) => p.category === selectedCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.category && String(p.category).toLowerCase().includes(q))
      )
    }
    return list
  }, [allProducts, searchQuery, selectedCategory])

  const categories = useMemo(() => {
    // Build categories dynamically from actual API products
    const catMap = new Map<string, number>()
    for (const p of allProducts) {
      const cat = p.category || 'Overig'
      catMap.set(String(cat), (catMap.get(String(cat)) || 0) + 1)
    }
    return Array.from(catMap.entries())
      .sort((a, b) => {
        if (a[0] === 'Overig') return 1
        if (b[0] === 'Overig') return -1
        return b[1] - a[1]
      })
      .map(([name, count]) => ({ name, count, icon: '' }))
  }, [allProducts])

  // ── Configure: call Probo API ──

  const callConfigure = useCallback(async (
    code: string,
    options: Array<{ code: string; value?: string }>,
  ) => {
    setIsLoadingConfigure(true)
    setConfigureError(null)
    try {
      const response = await fetch('/api/probo-configure', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_code: code, options }),
      })

      if (!response.ok) {
        const err = await response.json() as { error?: string }
        throw new Error(err.error || `Configuratie mislukt (${response.status})`)
      }

      const data = await response.json() as ProboConfigureResponse
      const product = data.products?.[0]

      if (!product) {
        throw new Error('Geen productdata ontvangen van Probo')
      }

      // Parse available_options (from /products/configure endpoint)
      if (product.available_options) {
        setAvailableOptions(product.available_options)
        setSelectedOptions(product.selected_options || [])
        setCanOrder(product.can_order || false)

        // Pre-fill default values for available options
        const defaults: Record<string, string> = {}
        for (const group of product.available_options) {
          for (const child of group.children || []) {
            if (child.value) {
              defaults[child.code] = String(child.value)
            } else if (child.default_value) {
              defaults[child.code] = child.default_value
            }
          }
        }
        setCurrentValues(defaults)
        return
      }

      // Fallback: parse flat options (from /products/product/{code} endpoint)
      if (product.options) {
        const converted: ProboAvailableOption[] = []
        const numericOpts = product.options.filter((o) =>
          o.type === 'number' || ['width', 'height', 'amount'].includes(o.code)
        )
        const selectOpts = product.options.filter((o) =>
          o.values && o.values.length > 0 && o.type !== 'number' && !['width', 'height', 'amount'].includes(o.code)
        )
        const toggleOpts = product.options.filter((o) =>
          o.type !== 'number' && !['width', 'height', 'amount'].includes(o.code) &&
          (!o.values || o.values.length === 0)
        )

        if (numericOpts.length > 0) {
          converted.push({
            code: 'dimensions',
            name: 'Afmeting & Aantal',
            children: numericOpts.map((o) => ({
              code: o.code,
              name: o.name,
              type_code: ['width', 'height'].includes(o.code) ? o.code : 'amount',
              default_value: o.default_value,
              min_value: '0',
            })),
          })
        }
        if (selectOpts.length > 0) {
          converted.push({
            code: 'options',
            name: 'Opties',
            children: selectOpts.map((o) => ({
              code: o.code,
              name: o.name,
              type_code: 'radio',
              values: o.values,
            })),
          })
        }
        if (toggleOpts.length > 0) {
          converted.push({
            code: 'extras',
            name: 'Extra opties',
            children: toggleOpts.map((o) => ({
              code: o.code,
              name: o.name,
              type_code: 'checkbox',
            })),
          })
        }

        setAvailableOptions(converted)
        setSelectedOptions([])
        setCanOrder(false)

        const defaults: Record<string, string> = {}
        for (const opt of product.options) {
          if (opt.default_value) defaults[opt.code] = opt.default_value
          else if (opt.values?.length) defaults[opt.code] = opt.values[0].code
        }
        setCurrentValues(defaults)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Configuratie mislukt'
      setConfigureError(msg)
      logger.error('Probo configure error:', err)
    } finally {
      setIsLoadingConfigure(false)
    }
  }, [token])

  // ── Select product ──

  const handleSelectProduct = useCallback(async (product: ProboProduct) => {
    setProductCode(product.code)
    setProductName(product.name)
    setStep('configure')
    setAvailableOptions([])
    setSelectedOptions([])
    setCanOrder(false)
    setCurrentValues({})
    setPriceResult(null)
    setPriceError(null)

    // Initial configure call (no options selected yet)
    await callConfigure(product.code, [])
  }, [callConfigure])

  // ── Next step: send current values to configure ──

  const handleNextStep = useCallback(async () => {
    // Build options from selected + current values
    const options: Array<{ code: string; value?: string }> = []

    // Include previously selected options
    for (const so of selectedOptions) {
      options.push({ code: so.code, value: so.value })
    }

    // Include current step values
    for (const [code, value] of Object.entries(currentValues)) {
      if (value && value !== '' && value !== '__toggle_off__') {
        if (value === '__toggle_on__') {
          options.push({ code })
        } else {
          options.push({ code, value })
        }
      }
    }

    await callConfigure(productCode, options)
  }, [productCode, selectedOptions, currentValues, callConfigure])

  // ── Calculate price ──

  const handleCalculatePrice = useCallback(async () => {
    setIsCalculatingPrice(true)
    setPriceError(null)
    try {
      // Build final options list
      const options: ProboOptie[] = []
      for (const so of selectedOptions) {
        options.push({ code: so.code, value: so.value })
      }
      for (const [code, value] of Object.entries(currentValues)) {
        if (value && value !== '' && value !== '__toggle_off__') {
          if (value === '__toggle_on__') {
            options.push({ code })
          } else {
            options.push({ code, value })
          }
        }
      }

      const response = await fetch('/api/probo-price', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_code: productCode, options }),
      })

      if (!response.ok) {
        const err = await response.json() as { error?: string }
        throw new Error(err.error || `Prijsberekening mislukt (${response.status})`)
      }

      const data = await response.json() as ProboPriceResult
      setPriceResult(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Prijsberekening mislukt'
      setPriceError(msg)
      logger.error('Probo prijs ophalen mislukt:', err)
    } finally {
      setIsCalculatingPrice(false)
    }
  }, [productCode, selectedOptions, currentValues, token])

  // ── Apply ──

  const handleApply = useCallback(() => {
    if (!priceResult) return

    const parts = [productName]
    const w = currentValues.width || selectedOptions.find((o) => o.code === 'width')?.value
    const h = currentValues.height || selectedOptions.find((o) => o.code === 'height')?.value
    if (w && h) parts.push(`${w}×${h}cm`)
    else if (w) parts.push(`${w}cm`)

    const opties: ProboOptie[] = []
    for (const so of selectedOptions) {
      opties.push({ code: so.code, value: so.value })
    }
    for (const [code, value] of Object.entries(currentValues)) {
      if (value && value !== '' && value !== '__toggle_off__') {
        if (value === '__toggle_on__') {
          opties.push({ code })
        } else {
          opties.push({ code, value })
        }
      }
    }

    onSelect({
      product_code: productCode,
      product_naam: productName,
      opties,
      inkoop_excl: round2(priceResult.inkoop_excl),
      inkoop_incl: round2(priceResult.inkoop_incl),
      advies_verkoop: round2(priceResult.advies_verkoop),
      omschrijving: parts.join(' - '),
    })
  }, [productCode, productName, selectedOptions, currentValues, priceResult, onSelect])

  // ── Render a single option child ──

  const renderChild = useCallback((child: ProboOptionChild) => {
    if (isNumericOption(child)) {
      return (
        <div key={child.code} className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">
            {getNumericLabel(child)}
          </Label>
          <Input
            type="number"
            value={currentValues[child.code] || ''}
            onChange={(e) => setCurrentValues((prev) => ({ ...prev, [child.code]: e.target.value }))}
            placeholder={child.default_value || getNumericLabel(child)}
            className="h-10 text-sm"
            min={child.min_value ? Number(child.min_value) : 0}
            max={child.max_value ? Number(child.max_value) : undefined}
            step={child.step_size ? Number(child.step_size) : undefined}
          />
          {child.description && (
            <p className="text-xs text-muted-foreground">{child.description}</p>
          )}
        </div>
      )
    }

    // Radio/select options (has images or explicit radio type)
    if (isRadioOption(child) || (child.values && child.values.length > 0)) {
      const values = child.values || []
      return (
        <div key={child.code} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {child.name || child.code}
          </Label>
          <div className="grid gap-1.5">
            {values.map((v) => {
              const isSelected = currentValues[child.code] === v.code
              const imageUrl = child.images?.find((img) => img.language === 'nl')?.url
                || child.images?.[0]?.url

              return (
                <button
                  key={v.code}
                  onClick={() => setCurrentValues((prev) => ({ ...prev, [child.code]: v.code }))}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                      : 'border-border hover:bg-muted hover:border-muted-foreground/30'
                  )}
                >
                  {/* Radio indicator */}
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    isSelected ? 'border-emerald-500' : 'border-muted-foreground/40'
                  )}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>
                  {/* Image thumbnail */}
                  {imageUrl && (
                    <img src={imageUrl} alt={v.name || v.code} className="w-10 h-10 object-contain rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{v.name || v.code}</p>
                    {(v as ProboOptionChild).description && (
                      <p className="text-xs text-muted-foreground">{(v as ProboOptionChild).description}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    // Checkbox/toggle option
    const isChecked = currentValues[child.code] === '__toggle_on__'
    return (
      <div key={child.code} className="flex items-center gap-3 py-1">
        <input
          type="checkbox"
          id={`probo-opt-${child.code}`}
          checked={isChecked}
          onChange={(e) => setCurrentValues((prev) => ({
            ...prev,
            [child.code]: e.target.checked ? '__toggle_on__' : '__toggle_off__',
          }))}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor={`probo-opt-${child.code}`} className="text-sm text-foreground cursor-pointer">
          {child.name || child.code}
          {child.description && (
            <span className="text-muted-foreground ml-1">— {child.description}</span>
          )}
        </Label>
      </div>
    )
  }, [currentValues])

  // ════════════════════════════════
  // STEP 1: Browse products
  // ════════════════════════════════

  if (step === 'browse') {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedCategory(null) }}
            placeholder="Zoek Probo product (bijv. textielframe, banner, forex)..."
            className="h-8 text-sm pl-8"
          />
        </div>

        {isLoadingProducts && (
          <div className="flex items-center justify-center py-2 gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Controleren op eigen producten...
          </div>
        )}

        {/* Category chips */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-1.5">
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Alle categorieën
              </button>
            )}
            {!selectedCategory && categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted hover:border-muted-foreground/20 transition-colors"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className="text-muted-foreground/60 ml-0.5">({cat.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Product list */}
        <div className="max-h-[280px] overflow-y-auto space-y-0.5">
          {filteredProducts.length === 0 && searchQuery && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Geen producten gevonden voor &quot;{searchQuery}&quot;
            </p>
          )}
          {(searchQuery || selectedCategory ? filteredProducts : []).map((product) => (
            <button
              key={product.code}
              onClick={() => handleSelectProduct(product)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors group"
            >
              <Package className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{product.code}</p>
              </div>
              {product.category === 'Mijn producten' && (
                <span className="text-2xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                  eigen
                </span>
              )}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
          ))}

          {!searchQuery && !selectedCategory && (
            <p className="text-xs text-muted-foreground text-center py-3">
              Kies een categorie of zoek op productnaam
            </p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onCancel}>
            Annuleren
          </Button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════
  // STEP 2: Configure wizard
  // ════════════════════════════════

  const currentStepGroup = availableOptions.length > 0 ? availableOptions[0] : null
  const hasMoreSteps = availableOptions.length > 1
  const stepNumber = selectedOptions.length > 0 ? Math.ceil(selectedOptions.length / 2) + 1 : 1

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setStep('browse')
            setAvailableOptions([])
            setSelectedOptions([])
            setCanOrder(false)
            setCurrentValues({})
            setPriceResult(null)
            setPriceError(null)
            setConfigureError(null)
          }}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{productName}</p>
          <p className="text-xs text-muted-foreground font-mono">{productCode}</p>
        </div>
        {selectedOptions.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Stap {stepNumber}
          </span>
        )}
      </div>

      {/* Selected options summary */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((so) => (
            <span
              key={so.code}
              className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
            >
              {so.name || so.code}: {so.value}
            </span>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoadingConfigure && (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Opties laden...
        </div>
      )}

      {/* Error */}
      {configureError && !isLoadingConfigure && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 space-y-2">
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {configureError}
          </p>
          <p className="text-xs text-muted-foreground">
            Dit product is mogelijk niet beschikbaar via de API.
            Probeer een ander product of configureer dit product in je Probo webshop.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => { setStep('browse'); setConfigureError(null) }}
          >
            Terug naar producten
          </Button>
        </div>
      )}

      {/* Current step options */}
      {!isLoadingConfigure && !configureError && currentStepGroup && !canOrder && (
        <>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {currentStepGroup.name || currentStepGroup.code}
            </h3>
          </div>

          <div className="space-y-4">
            {currentStepGroup.children.map(renderChild)}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={onCancel}
            >
              Annuleren
            </Button>
            <div className="flex items-center gap-2">
              {selectedOptions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1"
                  onClick={() => {
                    // Go back: re-configure without last selected options
                    // Reset to initial state
                    callConfigure(productCode, [])
                  }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Vorige stap
                </Button>
              )}
              <Button
                size="sm"
                className="text-xs h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleNextStep}
                disabled={isLoadingConfigure}
              >
                {isLoadingConfigure ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    Volgende stap
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Configuration complete - show price */}
      {!isLoadingConfigure && !configureError && (canOrder || (availableOptions.length === 0 && selectedOptions.length > 0)) && (
        <>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-3">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              Configuratie compleet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Alle opties zijn ingesteld. Bereken nu de inkoopprijs.
            </p>
          </div>

          {!priceResult && (
            <Button
              onClick={handleCalculatePrice}
              disabled={isCalculatingPrice}
              className="w-full gap-2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isCalculatingPrice ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Berekenen...</>
              ) : (
                'Bereken inkoopprijs'
              )}
            </Button>
          )}

          {priceError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3">
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {priceError}
              </p>
            </div>
          )}

          {priceResult && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Inkoopprijs</span>
                  <span className="font-semibold text-foreground">{formatCurrency(round2(priceResult.inkoop_basis))} excl BTW</span>
                </div>
                {priceResult.rush_toeslag > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Rush toeslag</span>
                    <span className="font-medium text-amber-600">{formatCurrency(round2(priceResult.rush_toeslag))}</span>
                  </div>
                )}
                <div className={cn('flex items-center justify-between text-xs', priceResult.rush_toeslag > 0 && 'pt-1 border-t border-emerald-200 dark:border-emerald-700')}>
                  <span className="font-medium text-foreground">Totaal inkoop</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(round2(priceResult.inkoop_excl))} excl BTW</span>
                </div>
                {priceResult.verzendkosten > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Verzendkosten</span>
                    <span className="font-medium text-foreground">{formatCurrency(round2(priceResult.verzendkosten))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200 dark:border-emerald-700">
                  <span className="text-muted-foreground">Advies verkoopprijs</span>
                  <span className="font-medium text-blue-600">{formatCurrency(round2(priceResult.advies_verkoop))}</span>
                </div>
              </div>

              <Button
                onClick={handleApply}
                className="w-full gap-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-3.5 w-3.5" />
                Gebruik als inkoopprijs
              </Button>
            </div>
          )}

          {/* Back / Cancel */}
          {!priceResult && (
            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onCancel}>
                Annuleren
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => callConfigure(productCode, [])}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Opnieuw configureren
              </Button>
            </div>
          )}
        </>
      )}

      {/* No options available and not complete - show manual price calc */}
      {!isLoadingConfigure && !configureError && availableOptions.length === 0 && selectedOptions.length === 0 && !canOrder && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Geen opties beschikbaar via de configure endpoint.
            Je kunt handmatig een prijs berekenen.
          </p>
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Breedte (cm)</Label>
              <Input
                type="number"
                value={currentValues.width || ''}
                onChange={(e) => setCurrentValues((prev) => ({ ...prev, width: e.target.value }))}
                placeholder="100"
                className="h-10"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Hoogte (cm)</Label>
              <Input
                type="number"
                value={currentValues.height || ''}
                onChange={(e) => setCurrentValues((prev) => ({ ...prev, height: e.target.value }))}
                placeholder="100"
                className="h-10"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Aantal</Label>
              <Input
                type="number"
                value={currentValues.amount || '1'}
                onChange={(e) => setCurrentValues((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="1"
                className="h-10"
                min={1}
              />
            </div>
          </div>
          <Button
            onClick={handleCalculatePrice}
            disabled={isCalculatingPrice}
            className="w-full gap-2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isCalculatingPrice ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Berekenen...</>
            ) : (
              'Bereken inkoopprijs'
            )}
          </Button>

          {priceError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3">
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {priceError}
              </p>
            </div>
          )}

          {priceResult && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Totaal inkoop</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(round2(priceResult.inkoop_excl))} excl BTW</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200 dark:border-emerald-700">
                  <span className="text-muted-foreground">Advies verkoopprijs</span>
                  <span className="font-medium text-blue-600">{formatCurrency(round2(priceResult.advies_verkoop))}</span>
                </div>
              </div>
              <Button
                onClick={handleApply}
                className="w-full gap-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-3.5 w-3.5" />
                Gebruik als inkoopprijs
              </Button>
            </div>
          )}

          <div className="flex justify-between pt-1">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onCancel}>
              Annuleren
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
