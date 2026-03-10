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
  const [products, setProducts] = useState<ProboProduct[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)

  // Configure state
  const [selectedProduct, setSelectedProduct] = useState<ProboProductDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [optionValues, setOptionValues] = useState<Record<string, string>>({})

  // Price state
  const [priceResult, setPriceResult] = useState<ProboPriceResult | null>(null)
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch products ──

  const fetchProducts = useCallback(async () => {
    if (productListCache.entry && Date.now() < productListCache.entry.expiresAt) {
      setProducts(productListCache.entry.data)
      return
    }

    setIsLoadingProducts(true)
    setProductError(null)
    try {
      const response = await fetch('/api/probo-products', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) {
        const err = await response.json() as { error?: string }
        throw new Error(err.error || `Fout ${response.status}`)
      }
      const data = await response.json() as { products: ProboProduct[] }
      const prods = Array.isArray(data.products) ? data.products : []
      productListCache.entry = { data: prods, expiresAt: Date.now() + PRODUCT_LIST_TTL }
      setProducts(prods)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon producten niet laden'
      setProductError(msg)
      logger.error('Probo products laden mislukt:', err)
    } finally {
      setIsLoadingProducts(false)
    }
  }, [token])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Focus search on mount
  useEffect(() => {
    if (step === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [step])

  // ── Filtered products ──

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase()
    return products.filter((p) =>
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  // ── Select product → load detail ──

  const handleSelectProduct = useCallback(async (product: ProboProduct) => {
    // Check cache
    const cached = productDetailCache.get(product.code)
    if (cached && Date.now() < cached.expiresAt) {
      setSelectedProduct(cached.data)
      // Set defaults
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
      const response = await fetch(`/api/probo-product-detail?code=${encodeURIComponent(product.code)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) {
        const err = await response.json() as { error?: string }
        throw new Error(err.error || `Fout ${response.status}`)
      }
      const data = await response.json() as { product: ProboProductDetail }
      productDetailCache.set(product.code, { data: data.product, expiresAt: Date.now() + PRODUCT_DETAIL_TTL })
      setSelectedProduct(data.product)
      // Set defaults
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kon product niet laden')
      logger.error('Probo product detail laden mislukt:', err)
      setStep('search')
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
          // Numeric fields pass value, toggles/booleans only code
          const opt = selectedProduct.options?.find((o) => o.code === code)
          const isNumeric = opt?.type === 'number' || ['width', 'height', 'amount'].includes(code)
          if (isNumeric) return { code, value }
          // Selection with value
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

    // Build omschrijving
    const parts = [selectedProduct.name]
    const w = optionValues.width
    const h = optionValues.height
    if (w && h) parts.push(`${w}×${h}cm`)
    else if (w) parts.push(`${w}cm`)

    // Add key option selections to description
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
  // STEP 1: Search
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek Probo product..."
            className="h-8 text-sm pl-8"
          />
        </div>

        {/* Loading */}
        {isLoadingProducts && (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Producten laden...
          </div>
        )}

        {/* Error */}
        {productError && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 space-y-2">
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {productError}
            </p>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={fetchProducts}>
              Opnieuw proberen
            </Button>
          </div>
        )}

        {/* Product list */}
        {!isLoadingProducts && !productError && (
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {filteredProducts.length === 0 && searchQuery && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Geen producten gevonden voor &quot;{searchQuery}&quot;
              </p>
            )}
            {filteredProducts.map((product) => (
              <button
                key={product.code}
                onClick={() => handleSelectProduct(product)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors"
              >
                <Package className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{product.code}</p>
                </div>
              </button>
            ))}
          </div>
        )}

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
          onClick={() => { setStep('search'); setSelectedProduct(null); setPriceResult(null) }}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {selectedProduct?.name || 'Product laden...'}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono">{selectedProduct?.code}</p>
        </div>
      </div>

      {/* Loading detail */}
      {isLoadingDetail && (
        <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Opties laden...
        </div>
      )}

      {/* Options */}
      {selectedProduct && !isLoadingDetail && (
        <>
          <div className="space-y-2.5">
            {/* Render numeric options first (width, height, amount) */}
            {selectedProduct.options
              ?.filter((o) => o.type === 'number' || ['width', 'height', 'amount'].includes(o.code))
              .map(renderOption)
            }

            {/* Then selection options */}
            {selectedProduct.options
              ?.filter((o) => o.type !== 'number' && !['width', 'height', 'amount'].includes(o.code) && o.values && o.values.length > 0)
              .map(renderOption)
            }

            {/* Then toggle options */}
            <div className="space-y-1.5 pt-1">
              {selectedProduct.options
                ?.filter((o) => o.type !== 'number' && !['width', 'height', 'amount'].includes(o.code) && (!o.values || o.values.length === 0))
                .map(renderOption)
              }
            </div>
          </div>

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
