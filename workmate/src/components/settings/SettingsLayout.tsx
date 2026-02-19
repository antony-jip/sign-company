import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
// Tabs removed - using custom left sidebar navigation
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  User,
  Building2,
  Puzzle,
  Shield,
  Palette,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Sliders,
  Bell,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Calculator,
  Package,
  HelpCircle,
  Edit2,
  Copy,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getProfile, updateProfile, getAppSettings, updateAppSettings } from '@/services/supabaseService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import supabase from '@/services/supabaseClient'
import type { AppSettings, PipelineStap, CalculatieProduct, CalculatieTemplate, CalculatieRegel, OfferteTemplate, OfferteTemplateRegel } from '@/types'
import {
  getCalculatieProducten,
  createCalculatieProduct,
  updateCalculatieProduct,
  deleteCalculatieProduct,
  getCalculatieTemplates,
  createCalculatieTemplate,
  deleteCalculatieTemplate,
  getOfferteTemplates,
  createOfferteTemplate,
  updateOfferteTemplate,
  deleteOfferteTemplate,
} from '@/services/supabaseService'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

const settingsTabs = [
  { id: 'profiel', label: 'Profiel', icon: User, description: 'Uw persoonlijke gegevens' },
  { id: 'bedrijf', label: 'Bedrijf', icon: Building2, description: 'Bedrijfsinformatie en logo' },
  { id: 'calculatie', label: 'Calculatie', icon: Calculator, description: 'Producten, marges en eenheden' },
  { id: 'aanpassingen', label: 'Aanpassingen', icon: Sliders, description: 'Pipeline, statussen en workflows' },
  { id: 'meldingen', label: 'Meldingen', icon: Bell, description: 'E-mail en pushnotificaties' },
  { id: 'integraties', label: 'Integraties', icon: Puzzle, description: 'Koppelingen met externe diensten' },
  { id: 'beveiliging', label: 'Beveiliging', icon: Shield, description: 'Wachtwoord en sessies' },
  { id: 'weergave', label: 'Weergave', icon: Palette, description: 'Thema, taal en lay-out' },
] as const

function renderTabContent(tabId: string) {
  switch (tabId) {
    case 'profiel': return <ProfielTab />
    case 'bedrijf': return <BedrijfTab />
    case 'calculatie': return <CalculatieTab />
    case 'aanpassingen': return <AanpassingenTab />
    case 'meldingen': return <MeldingenTab />
    case 'integraties': return <IntegratiesTab />
    case 'beveiliging': return <BeveiligingTab />
    case 'weergave': return <WeergaveTab />
    default: return null
  }
}

export function SettingsLayout() {
  const [activeTab, setActiveTab] = useState('profiel')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">
            Instellingen
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Beheer uw profiel, bedrijfsgegevens en voorkeuren
          </p>
        </div>
      </div>

      {/* Two-column layout: sidebar nav + content */}
      <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
        {/* Left sidebar navigation */}
        <nav className="w-56 flex-shrink-0">
          <Card className="sticky top-6">
            <div className="p-2 space-y-0.5">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                    <div className="min-w-0">
                      <span className={`text-sm block truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {tab.label}
                      </span>
                      <span className={`text-[11px] block truncate ${isActive ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-gray-400 dark:text-gray-500'}`}>
                        {tab.description}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        </nav>

        {/* Right content area */}
        <div className="flex-1 min-w-0">
          {renderTabContent(activeTab)}
        </div>
      </div>
    </div>
  )
}

// ============ CALCULATIE TAB ============
// Hier stel je alles in voor het calculatiesysteem bij offertes.
// Producten, categorieën, eenheden en standaard marges.

function CalculatieTab() {
  const { user } = useAuth()
  const { settings, updateSettings, refreshSettings } = useAppSettings()

  // ---- Producten catalogus ----
  const [producten, setProducten] = useState<CalculatieProduct[]>([])
  const [templates, setTemplates] = useState<CalculatieTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // ---- Instellingen velden ----
  const [standaardMarge, setStandaardMarge] = useState(settings.calculatie_standaard_marge ?? 35)
  const [categorieen, setCategorieen] = useState<string[]>(
    settings.calculatie_categorieen || ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig']
  )
  const [eenheden, setEenheden] = useState<string[]>(
    settings.calculatie_eenheden || ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set']
  )
  const [toonInkoopInOfferte, setToonInkoopInOfferte] = useState(settings.calculatie_toon_inkoop_in_offerte ?? false)
  const [regelVelden, setRegelVelden] = useState<string[]>(
    settings.offerte_regel_velden || ['Materiaal', 'Lay-out', 'Montage', 'Opmerking']
  )
  const [nieuwVeld, setNieuwVeld] = useState('')
  const [nieuweCat, setNieuweCat] = useState('')
  const [nieuweEenheid, setNieuweEenheid] = useState('')

  // ---- Nieuw product formulier ----
  const [showProductForm, setShowProductForm] = useState(false)
  const [editProductId, setEditProductId] = useState<string | null>(null)
  const [productNaam, setProductNaam] = useState('')
  const [productCategorie, setProductCategorie] = useState('')
  const [productEenheid, setProductEenheid] = useState('stuks')
  const [productInkoop, setProductInkoop] = useState(0)
  const [productVerkoop, setProductVerkoop] = useState(0)
  const [productMarge, setProductMarge] = useState(35)
  const [productBtw, setProductBtw] = useState(21)
  const [productNotitie, setProductNotitie] = useState('')

  // Laden
  useEffect(() => {
    Promise.all([getCalculatieProducten(), getCalculatieTemplates()])
      .then(([prods, tmps]) => {
        setProducten(prods)
        setTemplates(tmps)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    setStandaardMarge(settings.calculatie_standaard_marge ?? 35)
    setCategorieen(settings.calculatie_categorieen || ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig'])
    setEenheden(settings.calculatie_eenheden || ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set'])
    setToonInkoopInOfferte(settings.calculatie_toon_inkoop_in_offerte ?? false)
    setRegelVelden(settings.offerte_regel_velden || ['Materiaal', 'Lay-out', 'Montage', 'Opmerking'])
  }, [settings])

  // ---- Opslaan algemene instellingen ----
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)
      await updateSettings({
        calculatie_standaard_marge: standaardMarge,
        calculatie_categorieen: categorieen,
        calculatie_eenheden: eenheden,
        calculatie_toon_inkoop_in_offerte: toonInkoopInOfferte,
        offerte_regel_velden: regelVelden,
      })
      toast.success('Calculatie-instellingen opgeslagen')
    } catch (err) {
      console.error(err)
      toast.error('Kon instellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  // ---- Product CRUD ----
  const resetProductForm = () => {
    setProductNaam('')
    setProductCategorie('')
    setProductEenheid('stuks')
    setProductInkoop(0)
    setProductVerkoop(0)
    setProductMarge(standaardMarge)
    setProductBtw(21)
    setProductNotitie('')
    setEditProductId(null)
    setShowProductForm(false)
  }

  const handleEditProduct = (p: CalculatieProduct) => {
    setEditProductId(p.id)
    setProductNaam(p.naam)
    setProductCategorie(p.categorie)
    setProductEenheid(p.eenheid)
    setProductInkoop(p.inkoop_prijs)
    setProductVerkoop(p.verkoop_prijs)
    setProductMarge(p.standaard_marge)
    setProductBtw(p.btw_percentage)
    setProductNotitie(p.notitie)
    setShowProductForm(true)
  }

  const handleSaveProduct = async () => {
    if (!productNaam.trim()) {
      toast.error('Vul een productnaam in')
      return
    }
    try {
      setIsSaving(true)
      if (editProductId) {
        const updated = await updateCalculatieProduct(editProductId, {
          naam: productNaam,
          categorie: productCategorie,
          eenheid: productEenheid,
          inkoop_prijs: productInkoop,
          verkoop_prijs: productVerkoop,
          standaard_marge: productMarge,
          btw_percentage: productBtw,
          notitie: productNotitie,
        })
        setProducten((prev) => prev.map((p) => (p.id === editProductId ? updated : p)))
        toast.success('Product bijgewerkt')
      } else {
        const newProduct = await createCalculatieProduct({
          user_id: user?.id || 'demo',
          naam: productNaam,
          categorie: productCategorie,
          eenheid: productEenheid,
          inkoop_prijs: productInkoop,
          verkoop_prijs: productVerkoop,
          standaard_marge: productMarge,
          btw_percentage: productBtw,
          actief: true,
          notitie: productNotitie,
        })
        setProducten((prev) => [...prev, newProduct])
        toast.success('Product toegevoegd aan catalogus')
      }
      resetProductForm()
    } catch (err) {
      console.error(err)
      toast.error('Kon product niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteCalculatieProduct(id)
      setProducten((prev) => prev.filter((p) => p.id !== id))
      toast.success('Product verwijderd')
    } catch (err) {
      console.error(err)
      toast.error('Kon product niet verwijderen')
    }
  }

  const handleToggleProductActief = async (p: CalculatieProduct) => {
    try {
      const updated = await updateCalculatieProduct(p.id, { actief: !p.actief })
      setProducten((prev) => prev.map((pr) => (pr.id === p.id ? updated : pr)))
    } catch (err) {
      console.error(err)
    }
  }

  // ---- Offerte regel velden beheer ----
  const addRegelVeld = () => {
    if (nieuwVeld.trim() && !regelVelden.includes(nieuwVeld.trim())) {
      setRegelVelden([...regelVelden, nieuwVeld.trim()])
      setNieuwVeld('')
    }
  }

  const removeRegelVeld = (veld: string) => {
    setRegelVelden(regelVelden.filter((v) => v !== veld))
  }

  // ---- Categorieën en eenheden beheer ----
  const addCategorie = () => {
    if (nieuweCat.trim() && !categorieen.includes(nieuweCat.trim())) {
      setCategorieen([...categorieen, nieuweCat.trim()])
      setNieuweCat('')
    }
  }

  const removeCategorie = (cat: string) => {
    setCategorieen(categorieen.filter((c) => c !== cat))
  }

  const addEenheid = () => {
    if (nieuweEenheid.trim() && !eenheden.includes(nieuweEenheid.trim())) {
      setEenheden([...eenheden, nieuweEenheid.trim()])
      setNieuweEenheid('')
    }
  }

  const removeEenheid = (e: string) => {
    setEenheden(eenheden.filter((ee) => ee !== e))
  }

  // Groepeer producten per categorie
  const productenPerCategorie = producten.reduce((acc, p) => {
    const cat = p.categorie || 'Overig'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, CalculatieProduct[]>)

  return (
    <div className="space-y-6">
      {/* ---- INTRO UITLEG ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Calculatie Instellingen
          </CardTitle>
          <CardDescription>
            Stel hier je calculatiesysteem in. Deze instellingen bepalen hoe je prijzen opbouwt
            bij het maken van offertes. Je kunt producten, categorieën, eenheden en marges instellen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              Hoe werkt het calculatiesysteem?
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li><strong>1. Producten toevoegen:</strong> Voeg je materialen, diensten en producten toe met inkoop- en verkoopprijzen.</li>
              <li><strong>2. Offerte maken:</strong> Bij het aanmaken van een offerte klik je op het rekenmachine-icoon naast een regel.</li>
              <li><strong>3. Calculatie opbouwen:</strong> In het calculatiescherm voeg je producten toe, pas je aantallen aan en zie je direct je marge.</li>
              <li><strong>4. Automatisch doorrekenen:</strong> De verkoopprijs wordt automatisch berekend en op de offerte gezet.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ---- STANDAARD WAARDEN ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Standaard waarden</CardTitle>
          <CardDescription>
            Deze waarden worden automatisch ingevuld bij nieuwe calculatieregels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calc-marge">
                Standaard marge (%)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="calc-marge"
                  type="number"
                  value={standaardMarge}
                  onChange={(e) => setStandaardMarge(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={500}
                  step={1}
                  className="w-32"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Dit is de marge die standaard wordt ingevuld bij nieuwe regels
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Toon inkoopprijs in offerte</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={toonInkoopInOfferte}
                  onCheckedChange={setToonInkoopInOfferte}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {toonInkoopInOfferte ? 'Inkoopprijzen zijn zichtbaar' : 'Inkoopprijzen zijn verborgen (aanbevolen)'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Offerte regel velden */}
          <div className="space-y-3">
            <Label>Offerte regel velden</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Welke extra tekstvelden wil je per offerte-regel? Bijv. Materiaal, Lay-out, Montage, Opmerking.
              Deze velden verschijnen onder de omschrijving van elke regel.
            </p>
            <div className="flex flex-wrap gap-2">
              {regelVelden.map((veld) => (
                <Badge
                  key={veld}
                  variant="secondary"
                  className="gap-1 pl-2.5 pr-1 py-1"
                >
                  {veld}
                  <button
                    onClick={() => removeRegelVeld(veld)}
                    className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {regelVelden.length === 0 && (
                <span className="text-xs text-gray-400 italic">Geen extra velden — alleen omschrijving en prijs</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={nieuwVeld}
                onChange={(e) => setNieuwVeld(e.target.value)}
                placeholder="Nieuw veld bijv. Montage..."
                className="w-48"
                onKeyDown={(e) => e.key === 'Enter' && addRegelVeld()}
              />
              <Button variant="outline" size="sm" onClick={addRegelVeld} disabled={!nieuwVeld.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
            </div>
          </div>

          <Separator />

          {/* Categorieën */}
          <div className="space-y-3">
            <Label>Product categorieën</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Categorieën helpen je producten te organiseren. Bijv. Materiaal, Arbeid, Transport.
            </p>
            <div className="flex flex-wrap gap-2">
              {categorieen.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="gap-1 pl-2.5 pr-1 py-1"
                >
                  {cat}
                  <button
                    onClick={() => removeCategorie(cat)}
                    className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={nieuweCat}
                onChange={(e) => setNieuweCat(e.target.value)}
                placeholder="Nieuwe categorie..."
                className="w-48"
                onKeyDown={(e) => e.key === 'Enter' && addCategorie()}
              />
              <Button variant="outline" size="sm" onClick={addCategorie} disabled={!nieuweCat.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
            </div>
          </div>

          <Separator />

          {/* Eenheden */}
          <div className="space-y-3">
            <Label>Eenheden</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Eenheden bepalen hoe je producten telt. Bijv. stuks, m&sup2;, uur, meter.
            </p>
            <div className="flex flex-wrap gap-2">
              {eenheden.map((e) => (
                <Badge
                  key={e}
                  variant="outline"
                  className="gap-1 pl-2.5 pr-1 py-1"
                >
                  {e}
                  <button
                    onClick={() => removeEenheid(e)}
                    className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={nieuweEenheid}
                onChange={(e) => setNieuweEenheid(e.target.value)}
                placeholder="Nieuwe eenheid..."
                className="w-48"
                onKeyDown={(e) => e.key === 'Enter' && addEenheid()}
              />
              <Button variant="outline" size="sm" onClick={addEenheid} disabled={!nieuweEenheid.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Opslaan...' : 'Instellingen opslaan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- PRODUCTEN CATALOGUS ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Producten Catalogus
              </CardTitle>
              <CardDescription>
                Voeg hier je producten, materialen en diensten toe. Deze kun je snel kiezen bij het maken van een calculatie.
              </CardDescription>
            </div>
            <Button onClick={() => { resetProductForm(); setShowProductForm(true) }} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Product toevoegen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Product formulier */}
          {showProductForm && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 space-y-4">
              <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                {editProductId ? 'Product bewerken' : 'Nieuw product toevoegen'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Productnaam *</Label>
                  <Input
                    value={productNaam}
                    onChange={(e) => setProductNaam(e.target.value)}
                    placeholder="Bijv. Dibond plaat 3mm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Categorie</Label>
                  <Select value={productCategorie} onValueChange={setProductCategorie}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kies categorie..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorieen.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Eenheid</Label>
                  <Select value={productEenheid} onValueChange={setProductEenheid}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eenheden.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Inkoopprijs per eenheid</Label>
                  <Input
                    type="number"
                    value={productInkoop || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setProductInkoop(val)
                      setProductVerkoop(val * (1 + productMarge / 100))
                    }}
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Verkoopprijs per eenheid</Label>
                  <Input
                    type="number"
                    value={productVerkoop || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setProductVerkoop(val)
                      if (productInkoop > 0) {
                        setProductMarge(((val - productInkoop) / productInkoop) * 100)
                      }
                    }}
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Marge (%)</Label>
                  <Input
                    type="number"
                    value={Math.round(productMarge * 10) / 10 || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setProductMarge(val)
                      setProductVerkoop(productInkoop * (1 + val / 100))
                    }}
                    step={1}
                    placeholder="35"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">BTW tarief</Label>
                  <Select value={String(productBtw)} onValueChange={(v) => setProductBtw(parseInt(v))}>
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
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Notitie (optioneel)</Label>
                  <Input
                    value={productNotitie}
                    onChange={(e) => setProductNotitie(e.target.value)}
                    placeholder="Eventuele toelichting..."
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={resetProductForm}>
                  Annuleren
                </Button>
                <Button size="sm" onClick={handleSaveProduct} disabled={isSaving || !productNaam.trim()}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {editProductId ? 'Bijwerken' : 'Toevoegen'}
                </Button>
              </div>
            </div>
          )}

          {/* Producten lijst per categorie */}
          {isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Laden...</p>
          ) : producten.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nog geen producten in je catalogus.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Voeg producten toe zodat je ze snel kunt kiezen bij het maken van een calculatie.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(Object.entries(productenPerCategorie) as [string, CalculatieProduct[]][]).map(([categorie, prods]) => (
                <div key={categorie}>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {categorie} ({prods.length})
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Product</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-20">Eenheid</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-24">Inkoop</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-24">Verkoop</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-20">Marge</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-16">BTW</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-16">Actief</th>
                          <th className="w-20" />
                        </tr>
                      </thead>
                      <tbody>
                        {prods.map((p) => (
                          <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-2">
                              <span className="font-medium text-gray-900 dark:text-white">{p.naam}</span>
                              {p.notitie && (
                                <span className="block text-xs text-gray-400 dark:text-gray-500">{p.notitie}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{p.eenheid}</td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                              {formatCurrency(p.inkoop_prijs)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(p.verkoop_prijs)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-medium ${
                                p.standaard_marge > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {Math.round(p.standaard_marge)}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">
                              {p.btw_percentage}%
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Switch
                                checked={p.actief}
                                onCheckedChange={() => handleToggleProductActief(p)}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditProduct(p)}
                                  className="h-7 w-7 text-gray-400 hover:text-blue-500"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="h-7 w-7 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- OFFERTE TEMPLATES ---- */}
      <OfferteTemplatesSection />
    </div>
  )
}

// ============ OFFERTE TEMPLATES SECTION ============
// Beheer offerte templates die je kunt importeren bij het aanmaken van offertes.

function OfferteTemplatesSection() {
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const [offerteTemplates, setOfferteTemplates] = useState<OfferteTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Form state
  const [tplNaam, setTplNaam] = useState('')
  const [tplBeschrijving, setTplBeschrijving] = useState('')
  const [tplRegels, setTplRegels] = useState<OfferteTemplateRegel[]>([])

  useEffect(() => {
    getOfferteTemplates()
      .then(setOfferteTemplates)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const regelVelden = settings.offerte_regel_velden || ['Materiaal', 'Lay-out', 'Montage', 'Opmerking']

  const resetForm = () => {
    setTplNaam('')
    setTplBeschrijving('')
    setTplRegels([])
    setEditId(null)
    setShowForm(false)
  }

  const addRegel = (soort: 'prijs' | 'tekst') => {
    setTplRegels([
      ...tplRegels,
      {
        soort,
        beschrijving: '',
        extra_velden: {},
        aantal: soort === 'prijs' ? 1 : 0,
        eenheidsprijs: 0,
        btw_percentage: soort === 'prijs' ? (settings.standaard_btw || 21) : 0,
        korting_percentage: 0,
      },
    ])
  }

  const updateRegel = (index: number, updates: Partial<OfferteTemplateRegel>) => {
    setTplRegels(tplRegels.map((r, i) => (i === index ? { ...r, ...updates } : r)))
  }

  const removeRegel = (index: number) => {
    setTplRegels(tplRegels.filter((_, i) => i !== index))
  }

  const handleEdit = (t: OfferteTemplate) => {
    setEditId(t.id)
    setTplNaam(t.naam)
    setTplBeschrijving(t.beschrijving)
    setTplRegels([...t.regels])
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!tplNaam.trim()) {
      toast.error('Vul een template naam in')
      return
    }
    try {
      setIsSaving(true)
      if (editId) {
        const updated = await updateOfferteTemplate(editId, {
          naam: tplNaam,
          beschrijving: tplBeschrijving,
          regels: tplRegels,
        })
        setOfferteTemplates((prev) => prev.map((t) => (t.id === editId ? updated : t)))
        toast.success('Template bijgewerkt')
      } else {
        const newTpl = await createOfferteTemplate({
          user_id: user?.id || 'demo',
          naam: tplNaam,
          beschrijving: tplBeschrijving,
          regels: tplRegels,
          actief: true,
        })
        setOfferteTemplates((prev) => [...prev, newTpl])
        toast.success('Template aangemaakt')
      }
      resetForm()
    } catch (err) {
      console.error(err)
      toast.error('Kon template niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteOfferteTemplate(id)
      setOfferteTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success('Template verwijderd')
    } catch (err) {
      toast.error('Kon template niet verwijderen')
    }
  }

  const handleToggleActief = async (t: OfferteTemplate) => {
    try {
      const updated = await updateOfferteTemplate(t.id, { actief: !t.actief })
      setOfferteTemplates((prev) => prev.map((tp) => (tp.id === t.id ? updated : tp)))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-600" />
              Offerte Templates
            </CardTitle>
            <CardDescription>
              Maak herbruikbare offerte templates aan. Bij het maken van een offerte kun je een template
              importeren zodat de regels automatisch worden ingevuld. Bijv. voor autobelettering, gevelreclame, etc.
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Template maken
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Formulier voor nieuw/bewerken */}
        {showForm && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 space-y-4">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white">
              {editId ? 'Template bewerken' : 'Nieuwe offerte template'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Template naam *</Label>
                <Input
                  value={tplNaam}
                  onChange={(e) => setTplNaam(e.target.value)}
                  placeholder="Bijv. Autobelettering"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Beschrijving</Label>
                <Input
                  value={tplBeschrijving}
                  onChange={(e) => setTplBeschrijving(e.target.value)}
                  placeholder="Korte uitleg waarvoor deze template is..."
                />
              </div>
            </div>

            {/* Template regels */}
            <div className="space-y-2">
              <Label className="text-xs">Template regels</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Voeg de regels toe die standaard in de offerte komen wanneer deze template wordt geimporteerd.
              </p>
              {tplRegels.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">Nog geen regels. Voeg een prijs- of tekstregel toe.</p>
              ) : (
                <div className="space-y-2">
                  {tplRegels.map((regel, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={regel.soort === 'prijs' ? 'default' : 'secondary'} className="text-[10px]">
                            {regel.soort === 'prijs' ? 'Prijsregel' : 'Tekstregel'}
                          </Badge>
                          <span className="text-xs text-gray-500">#{idx + 1}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRegel(idx)}
                          className="h-6 w-6 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        value={regel.beschrijving}
                        onChange={(e) => updateRegel(idx, { beschrijving: e.target.value })}
                        placeholder="Omschrijving..."
                        className="text-sm"
                      />
                      {/* Extra velden */}
                      {regelVelden.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {regelVelden.map((veld) => (
                            <div key={veld} className="space-y-0.5">
                              <Label className="text-[10px] text-gray-400">{veld}</Label>
                              <Input
                                value={regel.extra_velden[veld] || ''}
                                onChange={(e) =>
                                  updateRegel(idx, {
                                    extra_velden: { ...regel.extra_velden, [veld]: e.target.value },
                                  })
                                }
                                placeholder={`${veld}...`}
                                className="text-xs h-8"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Prijs velden - alleen voor prijsregels */}
                      {regel.soort === 'prijs' && (
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-gray-400">Aantal</Label>
                            <Input
                              type="number"
                              value={regel.aantal || ''}
                              onChange={(e) => updateRegel(idx, { aantal: parseFloat(e.target.value) || 0 })}
                              className="text-xs h-8"
                              min={0}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-gray-400">Prijs</Label>
                            <Input
                              type="number"
                              value={regel.eenheidsprijs || ''}
                              onChange={(e) => updateRegel(idx, { eenheidsprijs: parseFloat(e.target.value) || 0 })}
                              className="text-xs h-8"
                              min={0}
                              step={0.01}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-gray-400">BTW %</Label>
                            <Input
                              type="number"
                              value={regel.btw_percentage}
                              onChange={(e) => updateRegel(idx, { btw_percentage: parseFloat(e.target.value) || 0 })}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-gray-400">Korting %</Label>
                            <Input
                              type="number"
                              value={regel.korting_percentage || ''}
                              onChange={(e) => updateRegel(idx, { korting_percentage: parseFloat(e.target.value) || 0 })}
                              className="text-xs h-8"
                              min={0}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addRegel('prijs')}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Prijsregel
                </Button>
                <Button variant="outline" size="sm" onClick={() => addRegel('tekst')}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Tekstregel
                </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Annuleren
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !tplNaam.trim()}>
                <Save className="h-4 w-4 mr-1.5" />
                {editId ? 'Bijwerken' : 'Opslaan'}
              </Button>
            </div>
          </div>
        )}

        {/* Template lijst */}
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Laden...</p>
        ) : offerteTemplates.length === 0 ? (
          <div className="text-center py-8">
            <Copy className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nog geen offerte templates.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Maak templates aan zodat je bij het maken van een offerte snel regels kunt importeren.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {offerteTemplates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{t.naam}</p>
                  {t.beschrijving && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.beschrijving}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {t.regels.length} regel(s)
                    </span>
                    {t.regels.length > 0 && (
                      <span className="text-xs text-gray-400">
                        ({t.regels.filter((r) => r.soort === 'prijs').length} prijs, {t.regels.filter((r) => r.soort === 'tekst').length} tekst)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={t.actief}
                    onCheckedChange={() => handleToggleActief(t)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(t)}
                    className="h-7 w-7 text-gray-400 hover:text-blue-500"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(t.id)}
                    className="h-7 w-7 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============ PROFIEL TAB ============

function ProfielTab() {
  const { user } = useAuth()
  const { refreshProfile } = useAppSettings()
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadProfile = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const profile = await getProfile(user.id)
      if (profile) {
        setVoornaam(profile.voornaam || '')
        setAchternaam(profile.achternaam || '')
        setTelefoon(profile.telefoon || '')
        setEmail(profile.email || user.email || '')
        if (profile.avatar_url) {
          setAvatarPreview(profile.avatar_url)
        }
      } else {
        // No profile yet, use auth metadata as fallback
        setEmail(user.email || '')
        setVoornaam(user.user_metadata?.voornaam || '')
        setAchternaam(user.user_metadata?.achternaam || '')
      }
    } catch (err) {
      console.error('Fout bij laden profiel:', err)
      toast.error('Kon profiel niet laden')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Gebruiker niet gevonden')
      return
    }
    try {
      setIsSaving(true)
      await updateProfile(user.id, {
        voornaam,
        achternaam,
        telefoon,
      })
      await refreshProfile()
      toast.success('Profiel succesvol opgeslagen')
    } catch (err) {
      console.error('Fout bij opslaan profiel:', err)
      toast.error('Kon profiel niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profiel Instellingen</CardTitle>
        <CardDescription>Beheer uw persoonlijke gegevens en profielfoto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex items-center gap-6">
          <div
            className="relative w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer group overflow-hidden hover:border-blue-400 transition-colors"
            onClick={handleAvatarClick}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <User className="w-10 h-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Profielfoto</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Klik op de cirkel om een foto te uploaden. JPG, PNG tot 5MB.
            </p>
          </div>
        </div>

        <Separator />

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="voornaam">Voornaam</Label>
            <Input
              id="voornaam"
              value={voornaam}
              onChange={(e) => setVoornaam(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="achternaam">Achternaam</Label>
            <Input
              id="achternaam"
              value={achternaam}
              onChange={(e) => setAchternaam(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} readOnly disabled className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Email kan niet worden gewijzigd</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefoon">Telefoon</Label>
            <Input
              id="telefoon"
              value={telefoon}
              onChange={(e) => setTelefoon(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ BEDRIJF TAB ============

function BedrijfTab() {
  const { user } = useAuth()
  const { refreshProfile } = useAppSettings()
  const [bedrijfsnaam, setBedrijfsnaam] = useState('')
  const [adres, setAdres] = useState('')
  const [postcode, setPostcode] = useState('')
  const [stad, setStad] = useState('')
  const [kvkNummer, setKvkNummer] = useState('')
  const [btwNummer, setBtwNummer] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const loadCompanyData = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const profile = await getProfile(user.id)
      if (profile) {
        setBedrijfsnaam(profile.bedrijfsnaam || '')
        setKvkNummer(profile.kvk_nummer || '')
        setBtwNummer(profile.btw_nummer || '')
        if (profile.logo_url) setLogoPreview(profile.logo_url)
        // Parse bedrijfs_adres back into components if stored as combined string
        if (profile.bedrijfs_adres) {
          const adresParts = profile.bedrijfs_adres.split(', ')
          if (adresParts.length >= 3) {
            setAdres(adresParts[0] || '')
            setPostcode(adresParts[1] || '')
            setStad(adresParts[2] || '')
          } else {
            setAdres(profile.bedrijfs_adres)
          }
        }
      }
    } catch (err) {
      console.error('Fout bij laden bedrijfsgegevens:', err)
      toast.error('Kon bedrijfsgegevens niet laden')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadCompanyData()
  }, [loadCompanyData])

  const handleLogoClick = () => {
    logoInputRef.current?.click()
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Gebruiker niet gevonden')
      return
    }
    try {
      setIsSaving(true)
      // Combine address components into a single bedrijfs_adres string
      const bedrijfsAdres = [adres, postcode, stad].filter(Boolean).join(', ')
      await updateProfile(user.id, {
        bedrijfsnaam,
        bedrijfs_adres: bedrijfsAdres,
        kvk_nummer: kvkNummer,
        btw_nummer: btwNummer,
        ...(logoPreview ? { logo_url: logoPreview } : {}),
      })
      await refreshProfile()
      toast.success('Bedrijfsgegevens succesvol opgeslagen')
    } catch (err) {
      console.error('Fout bij opslaan bedrijfsgegevens:', err)
      toast.error('Kon bedrijfsgegevens niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bedrijfsgegevens</CardTitle>
        <CardDescription>Deze gegevens worden gebruikt op offertes en facturen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="flex items-center gap-6">
          <div
            className="relative w-32 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer group overflow-hidden hover:border-blue-400 transition-colors"
            onClick={handleLogoClick}
          >
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <Upload className="w-6 h-6" />
                <span className="text-[10px] mt-1">Logo</span>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Bedrijfslogo</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Upload uw bedrijfslogo. PNG of SVG aanbevolen.
            </p>
          </div>
        </div>

        <Separator />

        {/* Form Fields */}
        <div className="space-y-2">
          <Label htmlFor="bedrijfsnaam">Bedrijfsnaam</Label>
          <Input
            id="bedrijfsnaam"
            value={bedrijfsnaam}
            onChange={(e) => setBedrijfsnaam(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adres">Adres</Label>
          <Input
            id="adres"
            value={adres}
            onChange={(e) => setAdres(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stad">Stad</Label>
            <Input
              id="stad"
              value={stad}
              onChange={(e) => setStad(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="kvk">KvK Nummer</Label>
            <Input
              id="kvk"
              value={kvkNummer}
              onChange={(e) => setKvkNummer(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="btw">BTW Nummer</Label>
            <Input
              id="btw"
              value={btwNummer}
              onChange={(e) => setBtwNummer(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ AANPASSINGEN TAB ============

const BRANCHE_PRESETS: { key: AppSettings['branche_preset']; label: string; beschrijving: string }[] = [
  { key: 'sign_company', label: 'Reclame & Signbedrijf', beschrijving: 'Borden, wraps, lichtreclame, belettering' },
  { key: 'bouw', label: 'Bouw & Renovatie', beschrijving: 'Aannemerij, verbouwing, installatie' },
  { key: 'ict', label: 'ICT & Software', beschrijving: 'Webdev, consultancy, managed services' },
  { key: 'marketing', label: 'Marketing & Reclame', beschrijving: 'Campagnes, design, branding' },
  { key: 'detailhandel', label: 'Detailhandel', beschrijving: 'Winkel, webshop, groothandel' },
  { key: 'horeca', label: 'Horeca', beschrijving: 'Restaurant, catering, evenementen' },
  { key: 'zorg', label: 'Zorg & Welzijn', beschrijving: 'Thuiszorg, praktijk, coaching' },
  { key: 'custom', label: 'Aangepast', beschrijving: 'Stel alles zelf in' },
]

const KLEUR_OPTIES = [
  '#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706',
  '#0891b2', '#4f46e5', '#be185d', '#1d4ed8', '#15803d',
]

function AanpassingenTab() {
  const { user } = useAuth()
  const { refreshSettings } = useAppSettings()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Local form state
  const [branchePreset, setBranchePreset] = useState<AppSettings['branche_preset']>('sign_company')
  const [branche, setBranche] = useState('')
  const [valuta, setValuta] = useState('EUR')
  const [standaardBtw, setStandaardBtw] = useState('21')
  const [offertePrefix, setOffertePrefix] = useState('OFF')
  const [offerteGeldigheid, setOfferteGeldigheid] = useState('30')
  const [autoFollowUp, setAutoFollowUp] = useState(true)
  const [followUpDagen, setFollowUpDagen] = useState('7')
  const [emailHandtekening, setEmailHandtekening] = useState('')
  const [primaireKleur, setPrimaireKleur] = useState('#2563eb')
  const [secundaireKleur, setSecundaireKleur] = useState('#7c3aed')
  const [pipelineStappen, setPipelineStappen] = useState<PipelineStap[]>([])
  const [toonConversieRate, setToonConversieRate] = useState(true)
  const [toonDagenOpen, setToonDagenOpen] = useState(true)
  const [toonFollowUpIndicatoren, setToonFollowUpIndicatoren] = useState(true)

  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const data = await getAppSettings(user.id)
      setSettings(data)
      setBranchePreset(data.branche_preset)
      setBranche(data.branche)
      setValuta(data.valuta)
      setStandaardBtw(String(data.standaard_btw))
      setOffertePrefix(data.offerte_prefix)
      setOfferteGeldigheid(String(data.offerte_geldigheid_dagen))
      setAutoFollowUp(data.auto_follow_up)
      setFollowUpDagen(String(data.follow_up_dagen))
      setEmailHandtekening(data.email_handtekening)
      setPrimaireKleur(data.primaire_kleur)
      setSecundaireKleur(data.secundaire_kleur)
      setPipelineStappen(data.pipeline_stappen)
      setToonConversieRate(data.toon_conversie_rate)
      setToonDagenOpen(data.toon_dagen_open)
      setToonFollowUpIndicatoren(data.toon_follow_up_indicatoren)
    } catch (err) {
      console.error('Fout bij laden instellingen:', err)
      toast.error('Kon instellingen niet laden')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleBrancheChange = (preset: AppSettings['branche_preset']) => {
    setBranchePreset(preset)
    const found = BRANCHE_PRESETS.find((b) => b.key === preset)
    if (found && preset !== 'custom') {
      setBranche(found.label)
    }
  }

  const handleAddPipelineStap = () => {
    const newStap: PipelineStap = {
      key: `custom_${Date.now()}`,
      label: 'Nieuwe stap',
      kleur: 'blue',
      volgorde: pipelineStappen.length,
      actief: true,
    }
    setPipelineStappen([...pipelineStappen, newStap])
  }

  const handleRemovePipelineStap = (index: number) => {
    const stap = pipelineStappen[index]
    if (['concept', 'goedgekeurd', 'afgewezen'].includes(stap.key)) {
      toast.error('Deze standaard stap kan niet worden verwijderd')
      return
    }
    setPipelineStappen(pipelineStappen.filter((_, i) => i !== index))
  }

  const handleUpdatePipelineStap = (index: number, updates: Partial<PipelineStap>) => {
    setPipelineStappen(
      pipelineStappen.map((stap, i) => (i === index ? { ...stap, ...updates } : stap))
    )
  }

  const handleSave = async () => {
    if (!user?.id) return
    try {
      setIsSaving(true)
      await updateAppSettings(user.id, {
        branche_preset: branchePreset,
        branche,
        valuta,
        valuta_symbool: valuta === 'EUR' ? '\u20AC' : valuta === 'USD' ? '$' : valuta === 'GBP' ? '\u00A3' : valuta,
        standaard_btw: parseFloat(standaardBtw) || 21,
        offerte_prefix: offertePrefix,
        offerte_geldigheid_dagen: parseInt(offerteGeldigheid) || 30,
        auto_follow_up: autoFollowUp,
        follow_up_dagen: parseInt(followUpDagen) || 7,
        email_handtekening: emailHandtekening,
        primaire_kleur: primaireKleur,
        secundaire_kleur: secundaireKleur,
        pipeline_stappen: pipelineStappen,
        toon_conversie_rate: toonConversieRate,
        toon_dagen_open: toonDagenOpen,
        toon_follow_up_indicatoren: toonFollowUpIndicatoren,
      })
      await refreshSettings()
      toast.success('Aanpassingen opgeslagen')
    } catch (err) {
      console.error('Fout bij opslaan aanpassingen:', err)
      toast.error('Kon aanpassingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-500 dark:text-gray-400">
          Instellingen laden...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Branche Selectie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            Branche & Sector
          </CardTitle>
          <CardDescription>
            Kies uw branche voor geoptimaliseerde instellingen en terminologie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {BRANCHE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handleBrancheChange(preset.key)}
                className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  branchePreset === preset.key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{preset.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{preset.beschrijving}</p>
              </button>
            ))}
          </div>
          {branchePreset === 'custom' && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="custom-branche">Aangepaste branche naam</Label>
              <Input
                id="custom-branche"
                value={branche}
                onChange={(e) => setBranche(e.target.value)}
                placeholder="Bijv. Grafische Vormgeving"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offerte & Valuta Instellingen */}
      <Card>
        <CardHeader>
          <CardTitle>Offerte Instellingen</CardTitle>
          <CardDescription>Configureer standaardwaarden voor offertes en facturatie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valuta">Valuta</Label>
              <Select value={valuta} onValueChange={setValuta}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">Dollar (USD)</SelectItem>
                  <SelectItem value="GBP">Pond (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="standaard-btw">Standaard BTW %</Label>
              <Input
                id="standaard-btw"
                type="number"
                min="0"
                max="100"
                value={standaardBtw}
                onChange={(e) => setStandaardBtw(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offerte-geldigheid">Geldigheid (dagen)</Label>
              <Input
                id="offerte-geldigheid"
                type="number"
                min="1"
                value={offerteGeldigheid}
                onChange={(e) => setOfferteGeldigheid(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="offerte-prefix">Offerte Prefix</Label>
              <Input
                id="offerte-prefix"
                value={offertePrefix}
                onChange={(e) => setOffertePrefix(e.target.value.toUpperCase())}
                placeholder="OFF"
                maxLength={5}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Voorbeeld: {offertePrefix}-2026-0001
              </p>
            </div>
            <div className="space-y-2">
              <Label>Automatische Follow-up</Label>
              <div className="flex items-center gap-4">
                <Switch
                  checked={autoFollowUp}
                  onCheckedChange={setAutoFollowUp}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {autoFollowUp ? 'Actief' : 'Uit'}
                </span>
                {autoFollowUp && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">na</span>
                    <Input
                      type="number"
                      min="1"
                      className="w-20"
                      value={followUpDagen}
                      onChange={(e) => setFollowUpDagen(e.target.value)}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">dagen</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Aanpassing */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stappen</CardTitle>
          <CardDescription>Pas de offerte pipeline stappen aan voor uw workflow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {pipelineStappen.map((stap, index) => (
              <div
                key={stap.key}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      stap.kleur === 'gray' ? '#9ca3af' :
                      stap.kleur === 'blue' ? '#3b82f6' :
                      stap.kleur === 'purple' ? '#8b5cf6' :
                      stap.kleur === 'green' ? '#22c55e' :
                      stap.kleur === 'red' ? '#ef4444' :
                      stap.kleur === 'orange' ? '#f97316' :
                      stap.kleur === 'teal' ? '#14b8a6' :
                      '#6b7280'
                  }}
                />
                <Input
                  value={stap.label}
                  onChange={(e) => handleUpdatePipelineStap(index, { label: e.target.value })}
                  className="flex-1 h-8"
                />
                <Select
                  value={stap.kleur}
                  onValueChange={(v) => handleUpdatePipelineStap(index, { kleur: v })}
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gray">Grijs</SelectItem>
                    <SelectItem value="blue">Blauw</SelectItem>
                    <SelectItem value="purple">Paars</SelectItem>
                    <SelectItem value="green">Groen</SelectItem>
                    <SelectItem value="red">Rood</SelectItem>
                    <SelectItem value="orange">Oranje</SelectItem>
                    <SelectItem value="teal">Teal</SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  checked={stap.actief}
                  onCheckedChange={(checked) => handleUpdatePipelineStap(index, { actief: checked })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePipelineStap(index)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleAddPipelineStap} className="gap-2">
            <Plus className="w-4 h-4" />
            Stap Toevoegen
          </Button>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding & Kleuren</CardTitle>
          <CardDescription>Pas de visuele identiteit aan voor offertes en communicatie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Primaire kleur</Label>
              <div className="flex flex-wrap gap-2">
                {KLEUR_OPTIES.map((kleur) => (
                  <button
                    key={`prim-${kleur}`}
                    onClick={() => setPrimaireKleur(kleur)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      primaireKleur === kleur
                        ? 'border-gray-900 dark:border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: kleur }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={primaireKleur}
                  onChange={(e) => setPrimaireKleur(e.target.value)}
                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                />
                <Input
                  value={primaireKleur}
                  onChange={(e) => setPrimaireKleur(e.target.value)}
                  className="w-24 h-8 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Secundaire kleur</Label>
              <div className="flex flex-wrap gap-2">
                {KLEUR_OPTIES.map((kleur) => (
                  <button
                    key={`sec-${kleur}`}
                    onClick={() => setSecundaireKleur(kleur)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      secundaireKleur === kleur
                        ? 'border-gray-900 dark:border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: kleur }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={secundaireKleur}
                  onChange={(e) => setSecundaireKleur(e.target.value)}
                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                />
                <Input
                  value={secundaireKleur}
                  onChange={(e) => setSecundaireKleur(e.target.value)}
                  className="w-24 h-8 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Voorbeeld</p>
            <div className="flex items-center gap-3">
              <div
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: primaireKleur }}
              >
                Primaire Knop
              </div>
              <div
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: secundaireKleur }}
              >
                Secundaire Knop
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: primaireKleur + '20', color: primaireKleur }}
              >
                Badge
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Handtekening */}
      <Card>
        <CardHeader>
          <CardTitle>Email Handtekening</CardTitle>
          <CardDescription>Wordt automatisch toegevoegd aan uitgaande emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={emailHandtekening}
            onChange={(e) => setEmailHandtekening(e.target.value)}
            placeholder="Met vriendelijke groet,&#10;&#10;Jan de Vries&#10;Sales Manager&#10;Uw Bedrijf B.V.&#10;Tel: 020-1234567"
            rows={5}
          />
        </CardContent>
      </Card>

      {/* Dashboard Weergave */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Weergave</CardTitle>
          <CardDescription>Bepaal welke indicatoren u wilt zien in de pipeline en dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Conversie rate tonen</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Percentage goedgekeurde offertes</p>
            </div>
            <Switch checked={toonConversieRate} onCheckedChange={setToonConversieRate} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dagen open tonen</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Hoeveel dagen een offerte al openstaat</p>
            </div>
            <Switch checked={toonDagenOpen} onCheckedChange={setToonDagenOpen} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Follow-up indicatoren</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Bel- en follow-up iconen op offerte kaarten</p>
            </div>
            <Switch checked={toonFollowUpIndicatoren} onCheckedChange={setToonFollowUpIndicatoren} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Opslaan...' : 'Alle Aanpassingen Opslaan'}
        </Button>
      </div>
    </div>
  )
}

// ============ MELDINGEN TAB ============

function MeldingenTab() {
  const { user } = useAuth()
  const { refreshSettings } = useAppSettings()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [meldingFollowUp, setMeldingFollowUp] = useState(true)
  const [meldingVerlopen, setMeldingVerlopen] = useState(true)
  const [meldingNieuweOfferte, setMeldingNieuweOfferte] = useState(true)
  const [meldingStatusWijziging, setMeldingStatusWijziging] = useState(true)

  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const data = await getAppSettings(user.id)
      setMeldingFollowUp(data.melding_follow_up)
      setMeldingVerlopen(data.melding_verlopen)
      setMeldingNieuweOfferte(data.melding_nieuwe_offerte)
      setMeldingStatusWijziging(data.melding_status_wijziging)
    } catch (err) {
      console.error('Fout bij laden meldingen:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    if (!user?.id) return
    try {
      setIsSaving(true)
      await updateAppSettings(user.id, {
        melding_follow_up: meldingFollowUp,
        melding_verlopen: meldingVerlopen,
        melding_nieuwe_offerte: meldingNieuweOfferte,
        melding_status_wijziging: meldingStatusWijziging,
      })
      await refreshSettings()
      toast.success('Meldingsinstellingen opgeslagen')
    } catch (err) {
      console.error('Fout bij opslaan meldingen:', err)
      toast.error('Kon meldingsinstellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-500 dark:text-gray-400">
          Meldingsinstellingen laden...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Melding Voorkeuren
          </CardTitle>
          <CardDescription>
            Configureer welke meldingen u wilt ontvangen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Follow-up herinneringen */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Follow-up Herinneringen
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ontvang meldingen wanneer een follow-up is gepland of achterstallig
                </p>
              </div>
            </div>
            <Switch checked={meldingFollowUp} onCheckedChange={setMeldingFollowUp} />
          </div>

          {/* Verlopen offertes */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Verlopen Offertes
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Waarschuwing wanneer offertes hun geldigheidsdatum naderen of overschrijden
                </p>
              </div>
            </div>
            <Switch checked={meldingVerlopen} onCheckedChange={setMeldingVerlopen} />
          </div>

          {/* Nieuwe offerte bevestiging */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Nieuwe Offerte Bevestiging
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Bevestiging wanneer een nieuwe offerte is aangemaakt
                </p>
              </div>
            </div>
            <Switch checked={meldingNieuweOfferte} onCheckedChange={setMeldingNieuweOfferte} />
          </div>

          {/* Status wijzigingen */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#CAF7E2]/20 dark:bg-[#386150]/20 border border-[#58B09C]/30 dark:border-[#58B09C]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#CAF7E2]/30 dark:bg-[#386150]/30 flex items-center justify-center">
                <Settings className="w-5 h-5 text-[#386150] dark:text-[#7dd3b8]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Status Wijzigingen
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Melding wanneer een offerte van status verandert (bijv. bekeken, goedgekeurd)
                </p>
              </div>
            </div>
            <Switch checked={meldingStatusWijziging} onCheckedChange={setMeldingStatusWijziging} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Opslaan...' : 'Meldingen Opslaan'}
        </Button>
      </div>
    </div>
  )
}

// ============ INTEGRATIES TAB ============

function IntegratiesTab() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const supabaseConnected = !!supabaseUrl && supabaseUrl !== 'your-supabase-url-here'
  // OpenAI key is now server-side only (configured via OPENAI_API_KEY env var on Vercel)
  const openaiConfigured = supabaseConnected

  const integrations = [
    {
      id: 'supabase',
      name: 'Supabase',
      description: 'Database en authenticatie backend',
      connected: supabaseConnected,
      icon: (
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
          <span className="text-green-700 dark:text-green-400 font-bold text-sm">SB</span>
        </div>
      ),
      details: supabaseConnected ? `URL: ${supabaseUrl.substring(0, 30)}...` : 'Demo modus actief - data wordt lokaal opgeslagen',
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'E-mail integratie voor inbox synchronisatie',
      connected: false,
      icon: (
        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
          <span className="text-red-700 dark:text-red-400 font-bold text-sm">GM</span>
        </div>
      ),
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'AI-functionaliteit voor tekst generatie en analyse',
      connected: openaiConfigured,
      icon: (
        <div className="w-10 h-10 bg-[#CAF7E2]/30 dark:bg-[#386150]/30 rounded-lg flex items-center justify-center">
          <span className="text-[#386150] dark:text-[#7dd3b8] font-bold text-sm">AI</span>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {integrations.map((integration) => (
        <Card key={integration.id}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {integration.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {integration.name}
                  </h3>
                  <Badge
                    className={
                      integration.connected
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }
                  >
                    {integration.connected ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verbonden
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Niet verbonden
                      </span>
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {integration.description}
                </p>
                {integration.details && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                    {integration.details}
                  </p>
                )}

                {/* OpenAI - server-side configured */}
                {integration.id === 'openai' && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    De OpenAI API key wordt veilig op de server geconfigureerd (OPENAI_API_KEY environment variable).
                  </p>
                )}

                {/* Gmail/Email setup info */}
                {integration.id === 'gmail' && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Email werkt via SMTP. Configureer je Gmail-adres en App Wachtwoord in de email instellingen.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ============ BEVEILIGING TAB ============

function BeveiligingTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const { user } = useAuth()

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Vul alle wachtwoordvelden in')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Wachtwoord moet minimaal 8 tekens bevatten')
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Wachtwoord moet minimaal één hoofdletter bevatten')
      return
    }
    if (!/[a-z]/.test(newPassword)) {
      toast.error('Wachtwoord moet minimaal één kleine letter bevatten')
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error('Wachtwoord moet minimaal één cijfer bevatten')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Nieuwe wachtwoorden komen niet overeen')
      return
    }
    if (newPassword === currentPassword) {
      toast.error('Nieuw wachtwoord moet verschillen van het huidige wachtwoord')
      return
    }

    setIsChanging(true)
    try {
      if (isSupabaseConfigured() && supabase) {
        // First verify current password by re-signing in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: currentPassword,
        })
        if (signInError) {
          toast.error('Huidig wachtwoord is onjuist')
          return
        }
        // Now update the password
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        })
        if (updateError) {
          toast.error(`Kon wachtwoord niet wijzigen: ${updateError.message}`)
          return
        }
        toast.success('Wachtwoord succesvol gewijzigd')
      } else {
        // Demo mode - update password in localStorage
        const storedUser = localStorage.getItem('workmate_demo_user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          const storedPw = localStorage.getItem('workmate_demo_password') || 'demo'
          if (currentPassword !== storedPw) {
            toast.error('Huidig wachtwoord is onjuist (standaard: "demo")')
            return
          }
          localStorage.setItem('workmate_demo_password', newPassword)
          toast.success('Wachtwoord succesvol gewijzigd (demo modus)')
        }
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Error changing password:', err)
      toast.error('Er is een fout opgetreden bij het wijzigen van het wachtwoord')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Wachtwoord Wijzigen
          </CardTitle>
          <CardDescription>
            Kies een sterk wachtwoord van minimaal 8 tekens met hoofdletters, kleine letters en cijfers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Huidig Wachtwoord</Label>
            <div className="relative max-w-md">
              <Input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nieuw Wachtwoord</Label>
              <Input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Bevestig Wachtwoord</Label>
              <Input
                id="confirm-password"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={isChanging}>
            {isChanging ? 'Wijzigen...' : 'Wachtwoord Wijzigen'}
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Tweefactorauthenticatie</CardTitle>
          <CardDescription>
            Voeg een extra beveiligingslaag toe aan uw account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between max-w-md">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                2FA Inschakelen
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {twoFactorEnabled
                  ? 'Tweefactorauthenticatie is actief'
                  : 'Beveilig uw account met een extra verificatiestap'}
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={(checked) => {
                setTwoFactorEnabled(checked)
                toast.info(
                  checked
                    ? 'Tweefactorauthenticatie geactiveerd (placeholder)'
                    : 'Tweefactorauthenticatie gedeactiveerd'
                )
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Actieve Sessies</CardTitle>
          <CardDescription>
            Bekijk en beheer apparaten die bij uw account zijn ingelogd
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Huidige sessie
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Browser - Laatst actief: Nu
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Actief
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Chrome - Windows
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Laatst actief: 2 dagen geleden
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                Beëindigen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============ WEERGAVE TAB ============

// Alle mogelijke sidebar items met hun labels en secties
const ALL_SIDEBAR_ITEMS = [
  { label: 'Dashboard', section: 'Overzicht' },
  { label: 'Projecten', section: 'Werk' },
  { label: 'Taken', section: 'Werk' },
  { label: 'Klanten', section: 'Werk' },
  { label: 'Offertes', section: 'Werk' },
  { label: 'Documenten', section: 'Werk' },
  { label: 'Email', section: 'Communicatie' },
  { label: 'Nieuwsbrieven', section: 'Communicatie' },
  { label: 'Kalender', section: 'Communicatie' },
  { label: 'Financieel', section: 'Beheer' },
  { label: 'Importeren', section: 'Beheer' },
  { label: 'AI Assistent', section: 'Beheer' },
]

function WeergaveTab() {
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { settings, updateSettings } = useAppSettings()
  const [sidebarItems, setSidebarItems] = useState<string[]>(
    settings.sidebar_items || ALL_SIDEBAR_ITEMS.map((i) => i.label)
  )
  const [isSavingSidebar, setIsSavingSidebar] = useState(false)

  useEffect(() => {
    setSidebarItems(settings.sidebar_items || ALL_SIDEBAR_ITEMS.map((i) => i.label))
  }, [settings.sidebar_items])

  const toggleSidebarItem = (label: string) => {
    setSidebarItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  const handleSaveSidebar = async () => {
    try {
      setIsSavingSidebar(true)
      await updateSettings({ sidebar_items: sidebarItems })
      toast.success('Navigatie-instellingen opgeslagen')
    } catch (err) {
      console.error(err)
      toast.error('Kon navigatie niet opslaan')
    } finally {
      setIsSavingSidebar(false)
    }
  }

  const handleResetSidebar = () => {
    setSidebarItems(ALL_SIDEBAR_ITEMS.map((i) => i.label))
  }

  const [autoCollapse, setAutoCollapse] = useState(() => {
    const stored = localStorage.getItem('workmate_autoCollapse')
    return stored !== null ? JSON.parse(stored) : true
  })
  const [compactMode, setCompactMode] = useState(() => {
    const stored = localStorage.getItem('workmate_compactMode')
    return stored !== null ? JSON.parse(stored) : false
  })

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Weergave Instellingen
        </CardTitle>
        <CardDescription>
          Pas het uiterlijk en gedrag van de applicatie aan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'light' ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-blue-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Thema
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {theme === 'light' ? 'Licht thema actief' : 'Donker thema actief'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {theme === 'light' ? 'Licht' : 'Donker'}
            </span>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </div>

        <Separator />

        {/* Language Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400">
              {language === 'nl' ? 'NL' : 'EN'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Taal
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'nl' ? 'Nederlands' : 'English'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'nl' ? 'NL' : 'EN'}
            </span>
            <Switch
              checked={language === 'en'}
              onCheckedChange={(checked) => setLanguage(checked ? 'en' : 'nl')}
            />
          </div>
        </div>

        <Separator />

        {/* Auto-collapse Sidebar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Sidebar automatisch inklappen
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Klap de sidebar automatisch in op mobiele apparaten
            </p>
          </div>
          <Switch
            checked={autoCollapse}
            onCheckedChange={(checked) => {
              setAutoCollapse(checked)
              localStorage.setItem('workmate_autoCollapse', JSON.stringify(checked))
              toast.success(
                checked
                  ? 'Sidebar klapt automatisch in op mobiel'
                  : 'Sidebar blijft zichtbaar op mobiel'
              )
            }}
          />
        </div>

        <Separator />

        {/* Compact Mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Compacte modus
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Verminder witruimte en gebruik kleinere elementen
            </p>
          </div>
          <Switch
            checked={compactMode}
            onCheckedChange={(checked) => {
              setCompactMode(checked)
              localStorage.setItem('workmate_compactMode', JSON.stringify(checked))
              toast.success(
                checked
                  ? 'Compacte modus ingeschakeld'
                  : 'Standaard modus ingeschakeld'
              )
            }}
          />
        </div>
      </CardContent>
    </Card>

    {/* Sidebar Navigatie Aanpassen */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="w-5 h-5" />
          Navigatie aanpassen
        </CardTitle>
        <CardDescription>
          Kies welke menu-items zichtbaar zijn in de sidebar. Schakel items uit die je niet gebruikt,
          zodat de navigatie overzichtelijker wordt. Instellingen is altijd zichtbaar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Groepeer per sectie */}
        {['Overzicht', 'Werk', 'Communicatie', 'Beheer'].map((section) => {
          const sectionItems = ALL_SIDEBAR_ITEMS.filter((i) => i.section === section)
          return (
            <div key={section}>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {section}
              </h4>
              <div className="space-y-2">
                {sectionItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <span className="text-sm text-gray-900 dark:text-white">{item.label}</span>
                    <Switch
                      checked={sidebarItems.includes(item.label)}
                      onCheckedChange={() => toggleSidebarItem(item.label)}
                    />
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
            </div>
          )
        })}

        {/* Instellingen (altijd aan) */}
        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/30">
          <span className="text-sm text-gray-900 dark:text-white">Instellingen</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Altijd zichtbaar</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={handleResetSidebar}>
            Alles aanzetten
          </Button>
          <Button size="sm" onClick={handleSaveSidebar} disabled={isSavingSidebar}>
            <Save className="h-4 w-4 mr-1.5" />
            {isSavingSidebar ? 'Opslaan...' : 'Navigatie opslaan'}
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  )
}
