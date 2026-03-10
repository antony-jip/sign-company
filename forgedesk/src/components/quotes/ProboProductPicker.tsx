import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  ArrowLeft,
  Loader2,
  Package,
  AlertTriangle,
  RefreshCw,
  Check,
  ChevronRight,
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

interface ProboProductOptionValue {
  code: string
  name?: string
  [key: string]: unknown
}

interface ProboProductOption {
  code: string
  name?: string
  type?: string
  values?: ProboProductOptionValue[]
  required?: boolean
  default_value?: string
  [key: string]: unknown
}

interface ProboProductDetail {
  code: string
  name: string
  options?: ProboProductOption[]
  [key: string]: unknown
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

// ── Static Probo Product Catalog ──
// These are the standard Probo product codes organized by category.
// GET /products only returns "composed products" (pre-configured in webshop).
// For individual products we need the /products/configure endpoint.

interface CatalogProduct {
  code: string
  name: string
  category: string
}

interface CatalogCategory {
  name: string
  icon: string
  products: CatalogProduct[]
}

const PROBO_CATALOG: CatalogCategory[] = [
  {
    name: 'Banners',
    icon: '🏳️',
    products: [
      { code: 'banner-510', name: 'Banner 510g', category: 'Banners' },
      { code: 'banner-440', name: 'Banner 440g', category: 'Banners' },
      { code: 'banner-mesh', name: 'Mesh banner', category: 'Banners' },
      { code: 'banner-510-blockout', name: 'Banner 510g Blockout', category: 'Banners' },
    ],
  },
  {
    name: 'Plaat / Rigid',
    icon: '🪧',
    products: [
      { code: 'forex-print', name: 'Forex print', category: 'Plaat / Rigid' },
      { code: 'forex-coloured', name: 'Forex gekleurd', category: 'Plaat / Rigid' },
      { code: 'dibond', name: 'Dibond', category: 'Plaat / Rigid' },
      { code: 'dibond-brushed', name: 'Dibond Brushed', category: 'Plaat / Rigid' },
      { code: 'acrylic', name: 'Acrylaat / Plexiglas', category: 'Plaat / Rigid' },
      { code: 're-board', name: 'Re-board', category: 'Plaat / Rigid' },
      { code: 'corrugated-board', name: 'Golfkarton', category: 'Plaat / Rigid' },
      { code: 'canvasboard', name: 'Canvas op board', category: 'Plaat / Rigid' },
    ],
  },
  {
    name: 'Stickers / Folie',
    icon: '🏷️',
    products: [
      { code: 'sticker', name: 'Sticker', category: 'Stickers / Folie' },
      { code: 'window-decal', name: 'Raamdecoratie', category: 'Stickers / Folie' },
      { code: 'window-perforated', name: 'Geperforeerde raamfolie', category: 'Stickers / Folie' },
      { code: 'floor-sticker', name: 'Vloersticker', category: 'Stickers / Folie' },
      { code: 'wall-decal', name: 'Muursticker', category: 'Stickers / Folie' },
      { code: 'car-wrap', name: 'Autowrap folie', category: 'Stickers / Folie' },
      { code: 'magnetic-foil', name: 'Magneetfolie', category: 'Stickers / Folie' },
    ],
  },
  {
    name: 'Textiel',
    icon: '🧵',
    products: [
      { code: 'textile-frame', name: 'Textielframe', category: 'Textiel' },
      { code: 'textile-flag', name: 'Textielvlag', category: 'Textiel' },
      { code: 'deco-fabric', name: 'Deko stof', category: 'Textiel' },
      { code: 'backlit-textile', name: 'Backlit textiel', category: 'Textiel' },
    ],
  },
  {
    name: 'Wandbekleding',
    icon: '🖼️',
    products: [
      { code: 'wall-paper', name: 'Behang', category: 'Wandbekleding' },
      { code: 'wall-textile', name: 'Wandtextiel', category: 'Wandbekleding' },
      { code: 'walltex-pro', name: 'Walltex Pro', category: 'Wandbekleding' },
    ],
  },
  {
    name: 'Displays',
    icon: '🪧',
    products: [
      { code: 'roll-up', name: 'Roll-up banner', category: 'Displays' },
      { code: 'pop-up-straight', name: 'Pop-up (recht)', category: 'Displays' },
      { code: 'pop-up-curved', name: 'Pop-up (gebogen)', category: 'Displays' },
      { code: 'x-banner', name: 'X-banner', category: 'Displays' },
      { code: 'a-frame', name: 'A-frame / stoepbord', category: 'Displays' },
    ],
  },
  {
    name: 'Papier / Canvas',
    icon: '📄',
    products: [
      { code: 'poster', name: 'Poster', category: 'Papier / Canvas' },
      { code: 'canvas', name: 'Canvas', category: 'Papier / Canvas' },
      { code: 'photo-paper', name: 'Fotopapier', category: 'Papier / Canvas' },
      { code: 'backlit-paper', name: 'Backlit papier', category: 'Papier / Canvas' },
    ],
  },
  {
    name: 'Overig',
    icon: '📦',
    products: [
      { code: 'outdoor-mat', name: 'Buitenmat', category: 'Overig' },
      { code: 'table-display', name: 'Tafel display', category: 'Overig' },
    ],
  },
]

// Flat list for searching
const ALL_CATALOG_PRODUCTS: CatalogProduct[] = PROBO_CATALOG.flatMap((c) => c.products)

// ── Cache ──

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const productListCache: { entry: CacheEntry<ProboProduct[]> | null } = { entry: null }
const productDetailCache = new Map<string, CacheEntry<ProboProductDetail>>()
const PRODUCT_LIST_TTL = 60 * 60 * 1000  // 1 hour
const PRODUCT_DETAIL_TTL = 30 * 60 * 1000  // 30 min

// ── Component ──

export function ProboProductPicker({ onSelect, onCancel }: ProboProductPickerProps) {
  const { session } = useAuth()
  const token = session?.access_token || ''

  // Step state
  const [step, setStep] = useState<'search' | 'configure'>('search')

  // Search state
  const [apiProducts, setApiProducts] = useState<ProboProduct[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Configure state
  const [selectedProduct, setSelectedProduct] = useState<ProboProductDetail | null>(null)
  const [selectedProductCode, setSelectedProductCode] = useState<string>('')
  const [selectedProductName, setSelectedProductName] = useState<string>('')
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [optionValues, setOptionValues] = useState<Record<string, string>>({})
  const [configureError, setConfigureError] = useState<string | null>(null)

  // Price state
  const [priceResult, setPriceResult] = useState<ProboPriceResult | null>(null)
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch API products (composed products) ──

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
      if (!response.ok) {
        // Don't error — we still have the static catalog
        setApiProducts([])
        return
      }
      const data = await response.json() as { products: ProboProduct[] }
      const prods = Array.isArray(data.products) ? data.products : []
      productListCache.entry = { data: prods, expiresAt: Date.now() + PRODUCT_LIST_TTL }
      setApiProducts(prods)
    } catch {
      // Silent fail — static catalog is the fallback
      setApiProducts([])
    } finally {
      setIsLoadingProducts(false)
    }
  }, [token])

  useEffect(() => {
    fetchApiProducts()
  }, [fetchApiProducts])

  // Focus search on mount
  useEffect(() => {
    if (step === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [step])

  // ── Combined product list: API products + static catalog ──

  const allProducts = useMemo(() => {
    // Merge API products (composed) with static catalog
    const combined: ProboProduct[] = []

    // Add API products first (user's own composed products)
    for (const p of apiProducts) {
      combined.push({ ...p, category: 'Mijn producten' })
    }

    // Add static catalog products
    for (const p of ALL_CATALOG_PRODUCTS) {
      // Don't duplicate if already in API products
      if (!combined.some((c) => c.code === p.code)) {
        combined.push({ code: p.code, name: p.name, category: p.category })
      }
    }

    return combined
  }, [apiProducts])

  // ── Filtered products ──

  const filteredProducts = useMemo(() => {
    let list = allProducts

    // Filter by category
    if (selectedCategory) {
      list = list.filter((p) => p.category === selectedCategory)
    }

    // Filter by search query
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

  // ── Categories for sidebar ──

  const categories = useMemo(() => {
    const cats: Array<{ name: string; count: number; icon: string }> = []

    // Add "Mijn producten" if there are API products
    if (apiProducts.length > 0) {
      cats.push({ name: 'Mijn producten', count: apiProducts.length, icon: '⭐' })
    }

    // Add static categories
    for (const cat of PROBO_CATALOG) {
      cats.push({ name: cat.name, count: cat.products.length, icon: cat.icon })
    }

    return cats
  }, [apiProducts])

  // ── Select product → load detail via configure endpoint ──

  const handleSelectProduct = useCallback(async (product: ProboProduct) => {
    const code = product.code
    setSelectedProductCode(code)
    setSelectedProductName(product.name)
    setConfigureError(null)

    // Check cache
    const cached = productDetailCache.get(code)
    if (cached && Date.now() < cached.expiresAt) {
      setSelectedProduct(cached.data)
      const defaults: Record<string, string> = {}
      if (cached.data.options) {
        for (const opt of cached.data.options) {
          if (opt.default_value) defaults[opt.code] = opt.default_value
          else if (opt.values?.length) defaults[opt.code] = opt.values[0].code
        }
      }
      setOptionValues(defaults)
      setPriceResult(null)
      setPriceError(null)
      setStep('configure')
      return
    }

    setIsLoadingDetail(true)
    setStep('configure')
    try {
      // Try the product detail endpoint first
      const detailResponse = await fetch(`/api/probo-product-detail?code=${encodeURIComponent(code)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (detailResponse.ok) {
        const data = await detailResponse.json() as { product: ProboProductDetail }
        productDetailCache.set(code, { data: data.product, expiresAt: Date.now() + PRODUCT_DETAIL_TTL })
        setSelectedProduct(data.product)
        const defaults: Record<string, string> = {}
        if (data.product.options) {
          for (const opt of data.product.options) {
            if (opt.default_value) defaults[opt.code] = opt.default_value
            else if (opt.values?.length) defaults[opt.code] = opt.values[0].code
          }
        }
        setOptionValues(defaults)
        setPriceResult(null)
        setPriceError(null)
        return
      }

      // Fallback: try the configure endpoint
      const configResponse = await fetch('/api/probo-configure', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_code: code }),
      })

      if (!configResponse.ok) {
        const err = await configResponse.json() as { error?: string }
        throw new Error(err.error || `Product niet beschikbaar (${configResponse.status})`)
      }

      const configData = await configResponse.json() as { products?: Array<{ options?: ProboProductOption[]; name?: string; [key: string]: unknown }> }

      // Parse configure response - it returns products[0] with options
      const productConfig = configData.products?.[0]
      if (productConfig) {
        const detail: ProboProductDetail = {
          code,
          name: (productConfig.name as string) || product.name,
          options: productConfig.options || [],
        }
        productDetailCache.set(code, { data: detail, expiresAt: Date.now() + PRODUCT_DETAIL_TTL })
        setSelectedProduct(detail)
        const defaults: Record<string, string> = {}
        if (detail.options) {
          for (const opt of detail.options) {
            if (opt.default_value) defaults[opt.code] = opt.default_value
            else if (opt.values?.length) defaults[opt.code] = opt.values[0].code
          }
        }
        setOptionValues(defaults)
        setPriceResult(null)
        setPriceError(null)
      } else {
        throw new Error('Geen productopties ontvangen van Probo')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon product niet laden'
      setConfigureError(msg)
      toast.error(msg)
      logger.error('Probo product laden mislukt:', err)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [token])

  // ── Calculate price ──

  const handleCalculatePrice = useCallback(async () => {
    if (!selectedProduct) return
    setIsCalculatingPrice(true)
    setPriceError(null)
    try {
      // Build options array
      const options: ProboOptie[] = Object.entries(optionValues)
        .filter(([, value]) => value !== '')
        .map(([code, value]) => {
          const opt = selectedProduct.options?.find((o) => o.code === code)
          const isNumeric = opt?.type === 'number' || ['width', 'height', 'amount'].includes(code)
          if (isNumeric) return { code, value }
          return value === '__toggle__' ? { code } : { code, value }
        })

      const response = await fetch('/api/probo-price', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_code: selectedProduct.code,
          options,
        }),
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
  }, [selectedProduct, optionValues, token])

  // ── Apply price ──

  const handleApply = useCallback(() => {
    if (!selectedProduct || !priceResult) return

    const parts = [selectedProduct.name]
    const w = optionValues.width
    const h = optionValues.height
    if (w && h) parts.push(`${w}×${h}cm`)
    else if (w) parts.push(`${w}cm`)

    const materialOpt = selectedProduct.options?.find((o) =>
      o.code.includes('material') || o.code.includes('foil') || o.code.includes('vinyl')
    )
    if (materialOpt && optionValues[materialOpt.code]) {
      const val = materialOpt.values?.find((v) => v.code === optionValues[materialOpt.code])
      if (val?.name) parts.push(val.name)
    }

    const opties: ProboOptie[] = Object.entries(optionValues)
      .filter(([, value]) => value !== '')
      .map(([code, value]) => value === '__toggle__' ? { code } : { code, value })

    onSelect({
      product_code: selectedProduct.code,
      product_naam: selectedProduct.name,
      opties,
      inkoop_excl: round2(priceResult.inkoop_excl),
      inkoop_incl: round2(priceResult.inkoop_incl),
      advies_verkoop: round2(priceResult.advies_verkoop),
      omschrijving: parts.join(' - '),
    })
  }, [selectedProduct, priceResult, optionValues, onSelect])

  // ── Render option input ──

  const renderOption = useCallback((opt: ProboProductOption) => {
    const isNumeric = opt.type === 'number' || ['width', 'height', 'amount'].includes(opt.code)
    const hasValues = opt.values && opt.values.length > 0

    if (isNumeric) {
      return (
        <div key={opt.code} className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            {opt.name || opt.code}
            {opt.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <Input
            type="number"
            value={optionValues[opt.code] || ''}
            onChange={(e) => setOptionValues((prev) => ({ ...prev, [opt.code]: e.target.value }))}
            placeholder={opt.default_value || '0'}
            className="h-8 text-sm"
            min={0}
          />
        </div>
      )
    }

    if (hasValues) {
      return (
        <div key={opt.code} className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            {opt.name || opt.code}
            {opt.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <Select
            value={optionValues[opt.code] || ''}
            onValueChange={(val) => setOptionValues((prev) => ({ ...prev, [opt.code]: val }))}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecteer..." />
            </SelectTrigger>
            <SelectContent>
              {opt.values!.map((v) => (
                <SelectItem key={v.code} value={v.code}>
                  <span className="text-xs">{v.name || v.code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    // Boolean toggle option
    return (
      <div key={opt.code} className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`probo-opt-${opt.code}`}
          checked={optionValues[opt.code] === '__toggle__'}
          onChange={(e) => setOptionValues((prev) => ({
            ...prev,
            [opt.code]: e.target.checked ? '__toggle__' : '',
          }))}
          className="h-3.5 w-3.5 rounded border-border"
        />
        <Label htmlFor={`probo-opt-${opt.code}`} className="text-xs text-muted-foreground cursor-pointer">
          {opt.name || opt.code}
        </Label>
      </div>
    )
  }, [optionValues])

  // ════════════════════════════════
  // STEP 1: Search + Browse
  // ════════════════════════════════

  if (step === 'search') {
    return (
      <div className="space-y-3">
        {/* Search input */}
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

        {/* Loading indicator */}
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
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Alle categorieën
              </button>
            )}
            {!selectedCategory && categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-border hover:bg-muted hover:border-muted-foreground/20 transition-colors"
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
                <p className="text-[11px] text-muted-foreground font-mono">{product.code}</p>
              </div>
              {product.category === 'Mijn producten' && (
                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                  eigen
                </span>
              )}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
          ))}

          {/* Show prompt to select category or search when nothing is shown */}
          {!searchQuery && !selectedCategory && (
            <p className="text-xs text-muted-foreground text-center py-3">
              Kies een categorie of zoek op productnaam
            </p>
          )}
        </div>

        {/* Cancel */}
        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onCancel}>
            Annuleren
          </Button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════
  // STEP 2: Configure + Price
  // ════════════════════════════════

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setStep('search')
            setSelectedProduct(null)
            setPriceResult(null)
            setConfigureError(null)
          }}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {selectedProduct?.name || selectedProductName || 'Product laden...'}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono">{selectedProduct?.code || selectedProductCode}</p>
        </div>
      </div>

      {/* Loading detail */}
      {isLoadingDetail && (
        <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Opties laden...
        </div>
      )}

      {/* Configure error */}
      {configureError && !isLoadingDetail && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 space-y-2">
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {configureError}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Dit product is mogelijk niet beschikbaar via de API.
            Probeer een ander product of configureer dit product in je Probo webshop.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              setStep('search')
              setConfigureError(null)
            }}
          >
            Terug naar producten
          </Button>
        </div>
      )}

      {/* Options */}
      {selectedProduct && !isLoadingDetail && (
        <>
          {selectedProduct.options && selectedProduct.options.length > 0 ? (
            <div className="space-y-2.5">
              {/* Render numeric options first (width, height, amount) */}
              {selectedProduct.options
                .filter((o) => o.type === 'number' || ['width', 'height', 'amount'].includes(o.code))
                .map(renderOption)
              }

              {/* Then selection options */}
              {selectedProduct.options
                .filter((o) => o.type !== 'number' && !['width', 'height', 'amount'].includes(o.code) && o.values && o.values.length > 0)
                .map(renderOption)
              }

              {/* Then toggle options */}
              <div className="space-y-1.5 pt-1">
                {selectedProduct.options
                  .filter((o) => o.type !== 'number' && !['width', 'height', 'amount'].includes(o.code) && (!o.values || o.values.length === 0))
                  .map(renderOption)
                }
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">
              Geen configureerbare opties gevonden. Klik op &quot;Bereken inkoopprijs&quot; om de basisprijs op te halen.
            </p>
          )}

          {/* Calculate button */}
          <Button
            onClick={handleCalculatePrice}
            disabled={isCalculatingPrice}
            className="w-full gap-2 h-9"
            variant="outline"
          >
            {isCalculatingPrice ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Berekenen...</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5" />Bereken inkoopprijs</>
            )}
          </Button>

          {/* Price error */}
          {priceError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3">
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {priceError}
              </p>
            </div>
          )}

          {/* Price result */}
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
        </>
      )}
    </div>
  )
}
