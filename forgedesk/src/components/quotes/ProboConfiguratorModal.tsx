import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  ArrowLeft,
  Loader2,
  Package,
  AlertTriangle,
  Check,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Image as ImageIcon,
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
  images?: Array<{ language: string; url: string }>
  [key: string]: unknown
}

interface ProboOptionChild {
  code: string
  name?: string
  description?: string
  type_code?: string
  value?: string | null
  default_value?: string
  min_value?: string
  max_value?: string
  step_size?: string
  scale?: string
  reversible?: boolean
  last_option?: boolean
  images?: Array<{ language: string; url: string }>
  type?: string
  values?: Array<{ code: string; name?: string; description?: string; images?: Array<{ language: string; url: string }>; [key: string]: unknown }>
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
    options?: ProboOptionChild[]
    images?: Array<{ language: string; url: string }>
    [key: string]: unknown
  }>
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

interface ProboConfiguratorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: ProboPickerResult) => void
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

interface CacheEntry<T> { data: T; expiresAt: number }
const productListCache: { entry: CacheEntry<ProboProduct[]> | null } = { entry: null }
const PRODUCT_LIST_TTL = 60 * 60 * 1000

// ── Helpers ──

function isNumericOption(child: ProboOptionChild): boolean {
  const tc = (child.type_code || '').toLowerCase()
  const code = (child.code || '').toLowerCase()
  return (
    tc === 'width' || tc === 'height' || tc === 'amount' ||
    tc === 'number' || tc === 'integer' || tc === 'input' ||
    code === 'width' || code === 'height' || code === 'amount' ||
    child.type === 'number'
  )
}

function isRadioOption(child: ProboOptionChild): boolean {
  const tc = (child.type_code || '').toLowerCase()
  return tc === 'radio' || tc === 'select' || tc === 'dropdown' ||
    (!!child.values && child.values.length > 0)
}

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

function getOptionImage(child: ProboOptionChild): string | undefined {
  return child.images?.find((img) => img.language === 'nl')?.url
    || child.images?.find((img) => img.language === 'all')?.url
    || child.images?.[0]?.url
}

function getProductImage(product: ProboProduct): string | undefined {
  return product.images?.find((img: { language: string; url: string }) => img.language === 'nl')?.url
    || product.images?.find((img: { language: string; url: string }) => img.language === 'all')?.url
    || product.images?.[0]?.url
}

// ── Component ──

export function ProboConfiguratorModal({ open, onOpenChange, onSelect }: ProboConfiguratorModalProps) {
  const { session } = useAuth()
  const token = session?.access_token || ''

  // Navigation
  const [view, setView] = useState<'browse' | 'configure'>('browse')

  // Browse state
  const [apiProducts, setApiProducts] = useState<ProboProduct[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())

  // Configure state
  const [productCode, setProductCode] = useState('')
  const [productName, setProductName] = useState('')
  const [productImage, setProductImage] = useState<string | undefined>()
  const [isLoadingConfigure, setIsLoadingConfigure] = useState(false)
  const [configureError, setConfigureError] = useState<string | null>(null)

  // Probo configure response
  const [availableOptions, setAvailableOptions] = useState<ProboAvailableOption[]>([])
  const [selectedOptions, setSelectedOptions] = useState<ProboSelectedOption[]>([])
  const [canOrder, setCanOrder] = useState(false)
  const [currentValues, setCurrentValues] = useState<Record<string, string>>({})

  // Price state
  const [priceResult, setPriceResult] = useState<ProboPriceResult | null>(null)
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setView('browse')
      setSearchQuery('')
      setActiveCategories(new Set())
      setProductCode('')
      setProductName('')
      setProductImage(undefined)
      setAvailableOptions([])
      setSelectedOptions([])
      setCanOrder(false)
      setCurrentValues({})
      setPriceResult(null)
      setPriceError(null)
      setConfigureError(null)
      setTimeout(() => searchInputRef.current?.focus(), 200)
    }
  }, [open])

  // ── Fetch API products ──

  const fetchApiProducts = useCallback(async () => {
    if (productListCache.entry && Date.now() < productListCache.entry.expiresAt) {
      setApiProducts(productListCache.entry.data)
      setProductsError(null)
      return
    }
    setIsLoadingProducts(true)
    setProductsError(null)
    try {
      const response = await fetch('/api/probo-products', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` })) as { error?: string }
        setProductsError(err.error || `Fout bij ophalen producten (${response.status})`)
        setApiProducts([])
        return
      }
      const data = await response.json() as { products: ProboProduct[] }
      const prods = Array.isArray(data.products) ? data.products : []
      if (prods.length === 0) {
        logger.warn('Probo API returned 0 products', data)
      }
      productListCache.entry = { data: prods, expiresAt: Date.now() + PRODUCT_LIST_TTL }
      setApiProducts(prods)
    } catch (err) {
      logger.error('Failed to fetch Probo products:', err)
      setProductsError('Kan geen verbinding maken met Probo API')
      setApiProducts([])
    } finally {
      setIsLoadingProducts(false)
    }
  }, [token])

  useEffect(() => {
    if (open) fetchApiProducts()
  }, [open, fetchApiProducts])

  // ── Combined + filtered products ──

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
    if (activeCategories.size > 0) {
      list = list.filter((p) => p.category && activeCategories.has(String(p.category)))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.category && String(p.category).toLowerCase().includes(q))
      )
    }
    return list
  }, [allProducts, searchQuery, activeCategories])

  const categories = useMemo(() => {
    // Build categories dynamically from actual API products
    const catMap = new Map<string, number>()
    for (const p of allProducts) {
      const cat = p.category || 'Overig'
      catMap.set(String(cat), (catMap.get(String(cat)) || 0) + 1)
    }
    // Sort: most products first, "Overig" always last
    return Array.from(catMap.entries())
      .sort((a, b) => {
        if (a[0] === 'Overig') return 1
        if (b[0] === 'Overig') return -1
        return b[1] - a[1]
      })
      .map(([name, count]) => ({ name, count }))
  }, [allProducts])

  const totalProductCount = allProducts.length

  // ── Toggle category ──

  const toggleCategory = useCallback((catName: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catName)) next.delete(catName)
      else next.add(catName)
      return next
    })
  }, [])

  // ── Configure API ──

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

      if (!product) throw new Error('Geen productdata ontvangen van Probo')

      // Update product name if returned
      if (product.name) setProductName(product.name)

      // Get product image
      const img = product.images?.find((i) => i.language === 'nl')?.url
        || product.images?.find((i) => i.language === 'all')?.url
        || product.images?.[0]?.url
      if (img) setProductImage(img)

      // Parse available_options (from /products/configure)
      if (product.available_options) {
        setAvailableOptions(product.available_options)
        setSelectedOptions(product.selected_options || [])
        setCanOrder(product.can_order || false)

        const defaults: Record<string, string> = {}
        for (const group of product.available_options) {
          for (const child of group.children || []) {
            if (child.value) defaults[child.code] = String(child.value)
            else if (child.default_value) defaults[child.code] = child.default_value
          }
        }
        setCurrentValues(defaults)
        return
      }

      // Fallback: flat options (from /products/product/{code})
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
            name: 'Afmeting',
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
              images: o.images,
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
    setProductImage(getProductImage(product))
    setView('configure')
    setAvailableOptions([])
    setSelectedOptions([])
    setCanOrder(false)
    setCurrentValues({})
    setPriceResult(null)
    setPriceError(null)
    await callConfigure(product.code, [])
  }, [callConfigure])

  // ── Next step ──

  const handleNextStep = useCallback(async () => {
    const options: Array<{ code: string; value?: string }> = []
    for (const so of selectedOptions) {
      options.push({ code: so.code, value: so.value })
    }
    for (const [code, value] of Object.entries(currentValues)) {
      if (value && value !== '' && value !== '__toggle_off__') {
        options.push(value === '__toggle_on__' ? { code } : { code, value })
      }
    }
    await callConfigure(productCode, options)
  }, [productCode, selectedOptions, currentValues, callConfigure])

  // ── Calculate price ──

  const handleCalculatePrice = useCallback(async () => {
    setIsCalculatingPrice(true)
    setPriceError(null)
    try {
      const options: ProboOptie[] = []
      for (const so of selectedOptions) {
        options.push({ code: so.code, value: so.value })
      }
      for (const [code, value] of Object.entries(currentValues)) {
        if (value && value !== '' && value !== '__toggle_off__') {
          options.push(value === '__toggle_on__' ? { code } : { code, value })
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
    for (const so of selectedOptions) opties.push({ code: so.code, value: so.value })
    for (const [code, value] of Object.entries(currentValues)) {
      if (value && value !== '' && value !== '__toggle_off__') {
        opties.push(value === '__toggle_on__' ? { code } : { code, value })
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
    onOpenChange(false)
  }, [productCode, productName, selectedOptions, currentValues, priceResult, onSelect, onOpenChange])

  // ── Render option child ──

  const renderChild = useCallback((child: ProboOptionChild) => {
    if (isNumericOption(child)) {
      return (
        <div key={child.code} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {getNumericLabel(child)}
          </Label>
          <Input
            type="number"
            value={currentValues[child.code] || ''}
            onChange={(e) => setCurrentValues((prev) => ({ ...prev, [child.code]: e.target.value }))}
            placeholder={child.default_value || getNumericLabel(child)}
            className="h-11 text-base max-w-sm"
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

    if (isRadioOption(child)) {
      const values = child.values || []
      return (
        <div key={child.code} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {child.name || child.code}
          </Label>
          {child.description && (
            <p className="text-xs text-muted-foreground">{child.description}</p>
          )}
          <div className="grid gap-2">
            {values.map((v) => {
              const isSelected = currentValues[child.code] === v.code
              const imgUrl = v.images?.find((i) => i.language === 'nl')?.url
                || v.images?.find((i) => i.language === 'all')?.url
                || v.images?.[0]?.url
                || getOptionImage(child)

              return (
                <button
                  key={v.code}
                  onClick={() => setCurrentValues((prev) => ({ ...prev, [child.code]: v.code }))}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/50'
                      : 'border-border hover:bg-muted hover:border-muted-foreground/30'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    isSelected ? 'border-emerald-500' : 'border-muted-foreground/40'
                  )}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                  {imgUrl && (
                    <img src={imgUrl} alt={v.name || v.code} className="w-12 h-12 object-contain rounded border bg-white" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{v.name || v.code}</p>
                    {v.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    // Checkbox
    const isChecked = currentValues[child.code] === '__toggle_on__'
    return (
      <div key={child.code} className="flex items-center gap-3 py-1.5">
        <input
          type="checkbox"
          id={`probo-cfg-${child.code}`}
          checked={isChecked}
          onChange={(e) => setCurrentValues((prev) => ({
            ...prev,
            [child.code]: e.target.checked ? '__toggle_on__' : '__toggle_off__',
          }))}
          className="h-4 w-4 rounded border-border accent-emerald-600"
        />
        <Label htmlFor={`probo-cfg-${child.code}`} className="text-sm text-foreground cursor-pointer">
          {child.name || child.code}
          {child.description && (
            <span className="text-muted-foreground ml-1">— {child.description}</span>
          )}
        </Label>
      </div>
    )
  }, [currentValues])

  // Current step
  const currentStepGroup = availableOptions.length > 0 ? availableOptions[0] : null
  const stepNumber = selectedOptions.length > 0 ? Math.ceil(selectedOptions.length / 2) + 1 : 1

  // ════════════════════════════════
  // RENDER
  // ════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Probo Producten</DialogTitle>

        {view === 'browse' ? (
          /* ════════════ BROWSE VIEW ════════════ */
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Zoeken..."
                    className="h-9 w-64 pl-9 text-sm"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Probo producten <span className="font-semibold text-foreground">{filteredProducts.length}</span>
                {filteredProducts.length !== totalProductCount && (
                  <span className="text-muted-foreground/60"> / {totalProductCount}</span>
                )}
              </div>
            </div>

            {/* Content: sidebar + grid */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-56 flex-shrink-0 border-r overflow-y-auto py-4 px-4">
                {categories.map((cat) => (
                  <label
                    key={cat.name}
                    className="flex items-center gap-2.5 py-1.5 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={activeCategories.has(cat.name)}
                      onChange={() => toggleCategory(cat.name)}
                      className="h-4 w-4 rounded border-border accent-emerald-600"
                    />
                    <span className={cn(
                      'text-sm transition-colors',
                      activeCategories.has(cat.name) ? 'font-medium text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    )}>
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>

              {/* Product grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingProducts && (
                  <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Producten laden...
                  </div>
                )}

                {!isLoadingProducts && productsError && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 max-w-md space-y-3">
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {productsError}
                      </p>
                      <Button variant="outline" size="sm" onClick={() => { productListCache.entry = null; fetchApiProducts() }}>
                        Opnieuw proberen
                      </Button>
                    </div>
                  </div>
                )}

                {!isLoadingProducts && !productsError && filteredProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Geen producten gevonden</p>
                    {searchQuery && (
                      <p className="text-xs mt-1">Probeer een andere zoekterm</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map((product) => {
                    const imgUrl = getProductImage(product)
                    return (
                      <button
                        key={product.code}
                        onClick={() => handleSelectProduct(product)}
                        className="group flex flex-col rounded-xl border border-border bg-card hover:border-emerald-300 hover:shadow-md transition-all text-left overflow-hidden"
                      >
                        {/* Product image */}
                        <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center overflow-hidden">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-muted-foreground/40">
                              <ImageIcon className="h-8 w-8" />
                              <span className="text-[10px] font-mono">{product.code}</span>
                            </div>
                          )}
                        </div>
                        {/* Product info */}
                        <div className="p-3">
                          <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] text-muted-foreground">{product.code}</span>
                            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-0 font-semibold">
                              probo
                            </Badge>
                          </div>
                          {product.category === 'Mijn producten' && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200">
                              Eigen product
                            </Badge>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-3 border-t bg-muted/30">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        ) : (
          /* ════════════ CONFIGURE VIEW ════════════ */
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b">
              <button
                onClick={() => {
                  setView('browse')
                  setConfigureError(null)
                  setPriceResult(null)
                }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground truncate">{productName}</h2>
                <p className="text-xs text-muted-foreground font-mono">{productCode}</p>
              </div>
              {productImage && (
                <img src={productImage} alt={productName} className="h-10 w-10 object-contain rounded border bg-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-lg mx-auto space-y-6">
                {/* Loading */}
                {isLoadingConfigure && (
                  <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Opties laden van Probo...
                  </div>
                )}

                {/* Error */}
                {configureError && !isLoadingConfigure && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 space-y-3">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {configureError}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dit product is mogelijk niet beschikbaar via de API.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => { setView('browse'); setConfigureError(null) }}>
                      Terug naar producten
                    </Button>
                  </div>
                )}

                {/* Selected options summary */}
                {selectedOptions.length > 0 && !isLoadingConfigure && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOptions.map((so) => (
                      <span
                        key={so.code}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      >
                        {so.name || so.code}: {so.value}
                      </span>
                    ))}
                  </div>
                )}

                {/* Current step options */}
                {!isLoadingConfigure && !configureError && currentStepGroup && !canOrder && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {currentStepGroup.name || currentStepGroup.code}
                      </h3>
                    </div>
                    {currentStepGroup.children.map(renderChild)}
                  </div>
                )}

                {/* Configuration complete */}
                {!isLoadingConfigure && !configureError && (canOrder || (availableOptions.length === 0 && selectedOptions.length > 0)) && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Configuratie compleet
                      </p>
                    </div>

                    {!priceResult && (
                      <Button
                        onClick={handleCalculatePrice}
                        disabled={isCalculatingPrice}
                        className="w-full gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="lg"
                      >
                        {isCalculatingPrice ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Berekenen...</>
                        ) : (
                          'Bereken inkoopprijs'
                        )}
                      </Button>
                    )}

                    {priceError && (
                      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
                        <p className="text-sm text-red-600 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          {priceError}
                        </p>
                      </div>
                    )}

                    {priceResult && (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10 p-5 space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Inkoopprijs excl BTW</span>
                            <span className="font-bold text-foreground text-base">{formatCurrency(round2(priceResult.inkoop_excl))}</span>
                          </div>
                          {priceResult.verzendkosten > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Verzendkosten</span>
                              <span className="font-medium">{formatCurrency(round2(priceResult.verzendkosten))}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Advies verkoopprijs</span>
                            <span className="font-medium text-blue-600">{formatCurrency(round2(priceResult.advies_verkoop))}</span>
                          </div>
                        </div>

                        <Button
                          onClick={handleApply}
                          className="w-full gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="lg"
                        >
                          <Check className="h-4 w-4" />
                          Overnemen als inkoopprijs
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* No options and no selection → manual entry */}
                {!isLoadingConfigure && !configureError && availableOptions.length === 0 && selectedOptions.length === 0 && !canOrder && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Afmeting</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Breedte (cm)</Label>
                        <Input
                          type="number"
                          value={currentValues.width || ''}
                          onChange={(e) => setCurrentValues((prev) => ({ ...prev, width: e.target.value }))}
                          placeholder="Breedte (cm)"
                          className="h-11 text-base max-w-sm"
                          min={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Hoogte (cm)</Label>
                        <Input
                          type="number"
                          value={currentValues.height || ''}
                          onChange={(e) => setCurrentValues((prev) => ({ ...prev, height: e.target.value }))}
                          placeholder="Hoogte (cm)"
                          className="h-11 text-base max-w-sm"
                          min={0}
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-foreground">Aantal</h3>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Aantal</Label>
                      <Input
                        type="number"
                        value={currentValues.amount || '1'}
                        onChange={(e) => setCurrentValues((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="1"
                        className="h-11 text-base max-w-sm"
                        min={1}
                      />
                    </div>

                    <Button
                      onClick={handleCalculatePrice}
                      disabled={isCalculatingPrice}
                      className="w-full gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white max-w-sm"
                      size="lg"
                    >
                      {isCalculatingPrice ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Berekenen...</>
                      ) : (
                        'Bereken inkoopprijs'
                      )}
                    </Button>

                    {priceError && (
                      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 max-w-sm">
                        <p className="text-sm text-red-600 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          {priceError}
                        </p>
                      </div>
                    )}

                    {priceResult && (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10 p-5 space-y-4 max-w-sm">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Totaal inkoop</span>
                            <span className="font-bold text-foreground text-base">{formatCurrency(round2(priceResult.inkoop_excl))}</span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Advies verkoopprijs</span>
                            <span className="font-medium text-blue-600">{formatCurrency(round2(priceResult.advies_verkoop))}</span>
                          </div>
                        </div>
                        <Button
                          onClick={handleApply}
                          className="w-full gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="lg"
                        >
                          <Check className="h-4 w-4" />
                          Overnemen als inkoopprijs
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {!canOrder && !(availableOptions.length === 0 && selectedOptions.length > 0) && !isLoadingConfigure && !configureError && currentStepGroup && (
              <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Annuleren
                </Button>
                <div className="flex items-center gap-2">
                  {selectedOptions.length > 0 && (
                    <Button
                      variant="outline"
                      className="gap-1"
                      onClick={() => callConfigure(productCode, [])}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Vorige stap
                    </Button>
                  )}
                  <Button
                    className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleNextStep}
                    disabled={isLoadingConfigure}
                  >
                    {isLoadingConfigure ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Volgende stap
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Footer for complete / no-options */}
            {((canOrder || (availableOptions.length === 0 && selectedOptions.length > 0)) || (availableOptions.length === 0 && selectedOptions.length === 0 && !isLoadingConfigure && !configureError)) && (
              <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Annuleren
                </Button>
                {(canOrder || selectedOptions.length > 0) && (
                  <Button variant="outline" className="gap-1" onClick={() => callConfigure(productCode, [])}>
                    <ChevronLeft className="h-4 w-4" />
                    Opnieuw configureren
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
