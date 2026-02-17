import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { getProfile, updateProfile, getAppSettings, updateAppSettings } from '@/services/supabaseService'
import type { AppSettings, PipelineStap } from '@/types'
import { toast } from 'sonner'

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Instellingen
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Beheer uw profiel, bedrijfsgegevens en voorkeuren
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profiel" className="gap-2">
            <User className="w-4 h-4 hidden sm:inline" />
            Profiel
          </TabsTrigger>
          <TabsTrigger value="bedrijf" className="gap-2">
            <Building2 className="w-4 h-4 hidden sm:inline" />
            Bedrijf
          </TabsTrigger>
          <TabsTrigger value="aanpassingen" className="gap-2">
            <Sliders className="w-4 h-4 hidden sm:inline" />
            Aanpassingen
          </TabsTrigger>
          <TabsTrigger value="meldingen" className="gap-2">
            <Bell className="w-4 h-4 hidden sm:inline" />
            Meldingen
          </TabsTrigger>
          <TabsTrigger value="integraties" className="gap-2">
            <Puzzle className="w-4 h-4 hidden sm:inline" />
            Integraties
          </TabsTrigger>
          <TabsTrigger value="beveiliging" className="gap-2">
            <Shield className="w-4 h-4 hidden sm:inline" />
            Beveiliging
          </TabsTrigger>
          <TabsTrigger value="weergave" className="gap-2">
            <Palette className="w-4 h-4 hidden sm:inline" />
            Weergave
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiel">
          <ProfielTab />
        </TabsContent>
        <TabsContent value="bedrijf">
          <BedrijfTab />
        </TabsContent>
        <TabsContent value="aanpassingen">
          <AanpassingenTab />
        </TabsContent>
        <TabsContent value="meldingen">
          <MeldingenTab />
        </TabsContent>
        <TabsContent value="integraties">
          <IntegratiesTab />
        </TabsContent>
        <TabsContent value="beveiliging">
          <BeveiligingTab />
        </TabsContent>
        <TabsContent value="weergave">
          <WeergaveTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============ PROFIEL TAB ============

function ProfielTab() {
  const { user } = useAuth()
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
      })
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
          <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
  const [openaiKey, setOpenaiKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const supabaseConnected = !!supabaseUrl && supabaseUrl !== 'your-supabase-url-here'
  const openaiConfigured = !!(import.meta.env.VITE_OPENAI_API_KEY && import.meta.env.VITE_OPENAI_API_KEY !== 'your-openai-api-key-here')

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
      details: supabaseConnected ? `URL: ${supabaseUrl.substring(0, 30)}...` : undefined,
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
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
          <span className="text-purple-700 dark:text-purple-400 font-bold text-sm">AI</span>
        </div>
      ),
      hasApiKeyInput: true,
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

                {/* OpenAI API Key Input */}
                {integration.hasApiKeyInput && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="relative flex-1 max-w-md">
                      <Input
                        type={showKey ? 'text' : 'password'}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        toast.info('API key wordt opgeslagen in de omgevingsvariabelen. Herstart de applicatie om de wijziging door te voeren.')
                      }}
                    >
                      Opslaan
                    </Button>
                  </div>
                )}

                {/* Gmail Connect Button */}
                {integration.id === 'gmail' && !integration.connected && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.info('Gmail integratie wordt binnenkort beschikbaar')}
                    >
                      Verbind Gmail
                    </Button>
                  </div>
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

  const handleChangePassword = () => {
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
    // Password change requires Supabase auth connection
    toast.info('Wachtwoord wijzigen is beschikbaar wanneer Supabase is geconfigureerd', {
      description: 'Configureer uw Supabase-verbinding in de instellingen om wachtwoorden te beheren.',
    })
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
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
          <Button onClick={handleChangePassword}>Wachtwoord Wijzigen</Button>
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

function WeergaveTab() {
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const [autoCollapse, setAutoCollapse] = useState(() => {
    const stored = localStorage.getItem('workmate_autoCollapse')
    return stored !== null ? JSON.parse(stored) : true
  })
  const [compactMode, setCompactMode] = useState(() => {
    const stored = localStorage.getItem('workmate_compactMode')
    return stored !== null ? JSON.parse(stored) : false
  })

  return (
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
  )
}
