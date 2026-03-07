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
// Dialog removed - email settings now inline
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
  Mail,
  Lock,
  Server,
  Info,
  ExternalLink,
  FileText,
  Type,
  Users,
  Receipt,
  Globe,
  Phone,
  CreditCard,
  Briefcase,
  ArrowRight,
  Monitor,
  PanelLeft,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { usePalette, PALETTES, APP_THEMES } from '@/contexts/PaletteContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { getProfile, updateProfile, getAppSettings, updateAppSettings } from '@/services/supabaseService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import supabase from '@/services/supabaseClient'
import { useNavigate } from 'react-router-dom'
import type { AppSettings, PipelineStap } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '../../utils/logger'
import { HuisstijlTab } from './HuisstijlTab'
import { CalculatieTab } from './CalculatieTab'

// Shared sub-tab navigation component
interface SubTab {
  id: string
  label: string
  icon: React.ElementType
}

function SubTabNav({ tabs, active, onChange }: { tabs: SubTab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted dark:bg-foreground/80 rounded-xl overflow-x-auto mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              isActive
                ? 'bg-card text-foreground dark:text-white shadow-sm'
                : 'text-muted-foreground dark:text-muted-foreground/60 hover:text-foreground/70 dark:hover:text-muted-foreground/50'
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// Font systeem constanten
const DEFAULT_FONT = 'Inter'

type FontSize = 'klein' | 'normaal' | 'groot' | 'extra-groot'

const BESCHIKBARE_FONT_SIZES: { value: FontSize; label: string; beschrijving: string; cssValue: string }[] = [
  { value: 'klein', label: 'Klein', beschrijving: 'Compact weergave', cssValue: '14px' },
  { value: 'normaal', label: 'Normaal', beschrijving: 'Standaard grootte', cssValue: '16px' },
  { value: 'groot', label: 'Groot', beschrijving: 'Beter leesbaar', cssValue: '18px' },
  { value: 'extra-groot', label: 'Extra groot', beschrijving: 'Maximale leesbaarheid', cssValue: '20px' },
]

const FONT_STORAGE_KEY = 'forgedesk_weergave_instellingen'

function getFontSettings(): { font_family: string; font_size: FontSize } {
  try {
    const stored = localStorage.getItem(FONT_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        font_family: DEFAULT_FONT,
        font_size: parsed.font_size || 'normaal',
      }
    }
  } catch { /* ignore */ }
  return { font_family: DEFAULT_FONT, font_size: 'normaal' }
}

function saveFontSettings(data: { font_family?: string; font_size?: FontSize }) {
  try {
    const current = getFontSettings()
    const updated = { ...current, ...data, updated_at: new Date().toISOString() }
    localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

function applyFontFamily(font: string) {
  document.documentElement.style.setProperty('--font-family', `'${font}'`)
}

function applyFontSize(size: FontSize) {
  const config = BESCHIKBARE_FONT_SIZES.find((s) => s.value === size)
  document.documentElement.style.setProperty('--font-size', config?.cssValue ?? '16px')
}

const settingsTabs = [
  { id: 'profiel', label: 'Profiel', icon: User, description: 'Uw persoonlijke gegevens' },
  { id: 'bedrijf', label: 'Bedrijf', icon: Building2, description: 'Bedrijfsinformatie en logo' },
  { id: 'facturatie', label: 'Facturatie', icon: Receipt, description: 'Factuur prefix, betaaltermijn en teksten' },
  { id: 'huisstijl', label: 'Huisstijl', icon: FileText, description: 'Document styling en briefpapier' },
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
    case 'facturatie': return <FacturatieTab />
    case 'huisstijl': return <HuisstijlTab />
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
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted dark:bg-foreground/80 rounded-lg flex-shrink-0">
          <Settings className="w-6 h-6 text-muted-foreground dark:text-muted-foreground/60" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground dark:text-white font-display truncate">
            Instellingen
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 truncate">
            Beheer uw profiel, bedrijfsgegevens en voorkeuren
          </p>
        </div>
      </div>

      {/* Two-column layout: sidebar nav + content */}
      <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-12rem)]">
        {/* Left sidebar navigation */}
        <nav className="w-full md:w-56 flex-shrink-0">
          <Card className="md:sticky md:top-6">
            <div className="p-2 space-y-0.5 md:block flex overflow-x-auto scrollbar-hide md:overflow-visible gap-1 md:gap-0">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex-shrink-0 md:flex-shrink flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm'
                        : 'text-muted-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-foreground/80 hover:text-foreground dark:hover:text-muted-foreground/30'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                    <div className="min-w-0">
                      <span className={`text-sm block truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {tab.label}
                      </span>
                      <span className={`text-[11px] hidden md:block truncate ${isActive ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-muted-foreground/60 dark:text-muted-foreground'}`}>
                        {tab.description}
                      </span>
                    </div>
                  </button>
                )
              })}

              {/* Separator + Team link */}
              <div className="my-2 border-t border-border dark:border-border hidden md:block" />
              <button
                onClick={() => navigate('/team')}
                className="w-full flex-shrink-0 md:flex-shrink flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 text-muted-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-foreground/80 hover:text-foreground dark:hover:text-muted-foreground/30"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm block truncate font-medium">Teamleden</span>
                  <span className="text-[11px] hidden md:block truncate text-muted-foreground/60 dark:text-muted-foreground">Medewerkers, rollen en verlof</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
              </button>
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

// ============ PROFIEL TAB ============

const PROFIEL_TABS: SubTab[] = [
  { id: 'gegevens', label: 'Gegevens', icon: User },
  { id: 'foto', label: 'Profielfoto', icon: Camera },
]

function ProfielTab() {
  const { user } = useAuth()
  const { refreshProfile } = useAppSettings()
  const [subTab, setSubTab] = useState('gegevens')
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [functie, setFunctie] = useState('')
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
        setFunctie(profile.functie || '')
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
      logger.error('Fout bij laden profiel:', err)
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
        functie,
        telefoon,
      })
      await refreshProfile()
      toast.success('Profiel succesvol opgeslagen')
    } catch (err: any) {
      logger.error('Fout bij opslaan profiel:', err)
      const msg = err?.message || err?.details || 'Onbekende fout'
      toast.error(`Kon profiel niet opslaan: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <SubTabNav tabs={PROFIEL_TABS} active={subTab} onChange={setSubTab} />

      {subTab === 'gegevens' && (
        <Card>
          <CardHeader>
            <CardTitle>Persoonlijke Gegevens</CardTitle>
            <CardDescription>Uw naam, functie en contactinformatie</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voornaam">Voornaam</Label>
                <Input id="voornaam" value={voornaam} onChange={(e) => setVoornaam(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="achternaam">Achternaam</Label>
                <Input id="achternaam" value={achternaam} onChange={(e) => setAchternaam(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="functie">Functie</Label>
              <Input id="functie" value={functie} onChange={(e) => setFunctie(e.target.value)} placeholder="Bijv. Eigenaar, Projectleider, Verkoper" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} readOnly disabled className="bg-background dark:bg-foreground/80 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Email kan niet worden gewijzigd</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefoon">Telefoon</Label>
                <Input id="telefoon" value={telefoon} onChange={(e) => setTelefoon(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving || isLoading}>
                {isSaving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {subTab === 'foto' && (
        <Card>
          <CardHeader>
            <CardTitle>Profielfoto</CardTitle>
            <CardDescription>Upload een profielfoto die zichtbaar is voor uw team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div
                className="relative w-24 h-24 rounded-full bg-muted dark:bg-foreground/80 border-2 border-dashed border-border dark:border-border flex items-center justify-center cursor-pointer group overflow-hidden hover:border-blue-400 transition-colors"
                onClick={handleAvatarClick}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground/60">
                    <User className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground dark:text-white">Profielfoto</p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-1">
                  Klik op de cirkel om een foto te uploaden. JPG, PNG tot 5MB.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving || isLoading}>
                {isSaving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// ============ BEDRIJF TAB ============

const BEDRIJF_TABS: SubTab[] = [
  { id: 'algemeen', label: 'Algemeen', icon: Building2 },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'financieel', label: 'Financieel', icon: CreditCard },
]

function BedrijfTab() {
  const { user } = useAuth()
  const { refreshProfile } = useAppSettings()
  const [bedrijfsnaam, setBedrijfsnaam] = useState('')
  const [adres, setAdres] = useState('')
  const [postcode, setPostcode] = useState('')
  const [stad, setStad] = useState('')
  const [bedrijfsTelefoon, setBedrijfsTelefoon] = useState('')
  const [bedrijfsEmail, setBedrijfsEmail] = useState('')
  const [bedrijfsWebsite, setBedrijfsWebsite] = useState('')
  const [kvkNummer, setKvkNummer] = useState('')
  const [btwNummer, setBtwNummer] = useState('')
  const [iban, setIban] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [subTab, setSubTab] = useState('algemeen')

  const loadCompanyData = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const profile = await getProfile(user.id)
      if (profile) {
        setBedrijfsnaam(profile.bedrijfsnaam || '')
        setBedrijfsTelefoon(profile.bedrijfs_telefoon || '')
        setBedrijfsEmail(profile.bedrijfs_email || '')
        setBedrijfsWebsite(profile.bedrijfs_website || '')
        setKvkNummer(profile.kvk_nummer || '')
        setBtwNummer(profile.btw_nummer || '')
        setIban(profile.iban || '')
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
      logger.error('Fout bij laden bedrijfsgegevens:', err)
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
        bedrijfs_telefoon: bedrijfsTelefoon,
        bedrijfs_email: bedrijfsEmail,
        bedrijfs_website: bedrijfsWebsite,
        kvk_nummer: kvkNummer,
        btw_nummer: btwNummer,
        iban,
        ...(logoPreview ? { logo_url: logoPreview } : {}),
      })
      await refreshProfile()
      toast.success('Bedrijfsgegevens succesvol opgeslagen')
    } catch (err: any) {
      logger.error('Fout bij opslaan bedrijfsgegevens:', err)
      const msg = err?.message || err?.details || 'Onbekende fout'
      toast.error(`Kon bedrijfsgegevens niet opslaan: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  const saveButton = (
    <div className="flex justify-end mt-6">
      <Button onClick={handleSave} disabled={isSaving || isLoading}>{isSaving ? 'Opslaan...' : 'Opslaan'}</Button>
    </div>
  )

  return (
    <>
      <SubTabNav tabs={BEDRIJF_TABS} active={subTab} onChange={setSubTab} />

      {subTab === 'algemeen' && (
        <Card>
          <CardHeader>
            <CardTitle>Bedrijfsgegevens</CardTitle>
            <CardDescription>Naam, adres en logo van uw bedrijf</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-20 rounded-lg bg-muted dark:bg-foreground/80 border-2 border-dashed border-border dark:border-border flex items-center justify-center cursor-pointer group overflow-hidden hover:border-blue-400 transition-colors" onClick={handleLogoClick}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground/60">
                    <Upload className="w-6 h-6" />
                    <span className="text-[10px] mt-1">Logo</span>
                  </div>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground dark:text-white">Bedrijfslogo</p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-1">Upload uw bedrijfslogo. PNG of SVG aanbevolen.</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="bedrijfsnaam">Bedrijfsnaam</Label>
              <Input id="bedrijfsnaam" value={bedrijfsnaam} onChange={(e) => setBedrijfsnaam(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adres">Adres</Label>
              <Input id="adres" value={adres} onChange={(e) => setAdres(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stad">Stad</Label>
                <Input id="stad" value={stad} onChange={(e) => setStad(e.target.value)} />
              </div>
            </div>
            {saveButton}
          </CardContent>
        </Card>
      )}

      {subTab === 'contact' && (
        <Card>
          <CardHeader>
            <CardTitle>Contactgegevens</CardTitle>
            <CardDescription>Telefoon, e-mail en website van uw bedrijf</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrijfs-telefoon">Telefoon</Label>
                <Input id="bedrijfs-telefoon" type="tel" value={bedrijfsTelefoon} onChange={(e) => setBedrijfsTelefoon(e.target.value)} placeholder="+31 (0)20 1234567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrijfs-email">E-mail</Label>
                <Input id="bedrijfs-email" type="email" value={bedrijfsEmail} onChange={(e) => setBedrijfsEmail(e.target.value)} placeholder="info@bedrijf.nl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrijfs-website">Website</Label>
                <Input id="bedrijfs-website" value={bedrijfsWebsite} onChange={(e) => setBedrijfsWebsite(e.target.value)} placeholder="www.bedrijf.nl" />
              </div>
            </div>
            {saveButton}
          </CardContent>
        </Card>
      )}

      {subTab === 'financieel' && (
        <Card>
          <CardHeader>
            <CardTitle>Juridisch &amp; Financieel</CardTitle>
            <CardDescription>Deze gegevens worden weergegeven op facturen en offertes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kvk">KvK Nummer</Label>
                <Input id="kvk" value={kvkNummer} onChange={(e) => setKvkNummer(e.target.value)} placeholder="12345678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="btw">BTW Nummer</Label>
                <Input id="btw" value={btwNummer} onChange={(e) => setBtwNummer(e.target.value)} placeholder="NL123456789B01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input id="iban" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="NL00 BANK 0123 4567 89" />
              </div>
            </div>
            {saveButton}
          </CardContent>
        </Card>
      )}
    </>
  )
}

// ============ FACTURATIE TAB ============

const FACTURATIE_TABS: SubTab[] = [
  { id: 'nummering', label: 'Nummering', icon: Receipt },
  { id: 'teksten', label: 'Teksten', icon: FileText },
]

function FacturatieTab() {
  const { user } = useAuth()
  const { refreshSettings } = useAppSettings()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [subTab, setSubTab] = useState('nummering')
  const [factuurPrefix, setFactuurPrefix] = useState('FAC')
  const [betaaltermijn, setBetaaltermijn] = useState('30')
  const [voorwaarden, setVoorwaarden] = useState('')
  const [introTekst, setIntroTekst] = useState('')
  const [outroTekst, setOutroTekst] = useState('')

  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const data = await getAppSettings(user.id)
      setFactuurPrefix(data.factuur_prefix || 'FAC')
      setBetaaltermijn(String(data.factuur_betaaltermijn_dagen || 30))
      setVoorwaarden(data.factuur_voorwaarden || '')
      setIntroTekst(data.factuur_intro_tekst || '')
      setOutroTekst(data.factuur_outro_tekst || '')
    } catch (err) {
      logger.error('Fout bij laden factuurinstellingen:', err)
      toast.error('Kon factuurinstellingen niet laden')
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
        factuur_prefix: factuurPrefix,
        factuur_betaaltermijn_dagen: parseInt(betaaltermijn) || 30,
        factuur_voorwaarden: voorwaarden,
        factuur_intro_tekst: introTekst,
        factuur_outro_tekst: outroTekst,
      })
      await refreshSettings()
      toast.success('Factuurinstellingen opgeslagen')
    } catch (err) {
      logger.error('Fout bij opslaan factuurinstellingen:', err)
      toast.error('Kon factuurinstellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground dark:text-muted-foreground/60">
          Factuurinstellingen laden...
        </CardContent>
      </Card>
    )
  }

  const saveButton = (
    <div className="flex justify-end mt-6">
      <Button onClick={handleSave} disabled={isSaving}>
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? 'Opslaan...' : 'Instellingen opslaan'}
      </Button>
    </div>
  )

  return (
    <>
      <SubTabNav tabs={FACTURATIE_TABS} active={subTab} onChange={setSubTab} />

      {subTab === 'nummering' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Factuurnummering
            </CardTitle>
            <CardDescription>Stel het prefix en de nummering van facturen in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="factuur-prefix">Factuur prefix</Label>
                <Input id="factuur-prefix" value={factuurPrefix} onChange={(e) => setFactuurPrefix(e.target.value)} placeholder="FAC" />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {factuurPrefix}-2026-0001</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="betaaltermijn">Betaaltermijn (dagen)</Label>
                <Input id="betaaltermijn" type="number" value={betaaltermijn} onChange={(e) => setBetaaltermijn(e.target.value)} min="1" max="365" />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Standaard aantal dagen dat de klant heeft om te betalen</p>
              </div>
            </div>
            {saveButton}
          </CardContent>
        </Card>
      )}

      {subTab === 'teksten' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Standaard Teksten
            </CardTitle>
            <CardDescription>Teksten die automatisch op elke factuur verschijnen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intro-tekst">Introductietekst</Label>
              <Textarea id="intro-tekst" value={introTekst} onChange={(e) => setIntroTekst(e.target.value)} placeholder="Bijv. Hierbij ontvangt u de factuur voor de geleverde werkzaamheden." rows={2} />
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Wordt bovenaan de factuur weergegeven, onder de klantgegevens</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outro-tekst">Afsluittekst</Label>
              <Textarea id="outro-tekst" value={outroTekst} onChange={(e) => setOutroTekst(e.target.value)} placeholder="Bijv. Wij verzoeken u vriendelijk het bedrag binnen de gestelde termijn over te maken." rows={2} />
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Wordt onderaan de factuurregels weergegeven</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="voorwaarden">Betalingsvoorwaarden</Label>
              <Textarea id="voorwaarden" value={voorwaarden} onChange={(e) => setVoorwaarden(e.target.value)} placeholder="Bijv. Op al onze overeenkomsten zijn onze algemene voorwaarden van toepassing, gedeponeerd bij de KvK." rows={3} />
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Kleine print onderaan de factuur met juridische voorwaarden</p>
            </div>
            {saveButton}
          </CardContent>
        </Card>
      )}
    </>
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

const AANPASSINGEN_TABS: SubTab[] = [
  { id: 'branche', label: 'Branche', icon: Briefcase },
  { id: 'offertes', label: 'Offertes', icon: FileText },
  { id: 'pipeline', label: 'Pipeline', icon: ArrowRight },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'dashboard', label: 'Dashboard', icon: Settings },
]

function AanpassingenTab() {
  const { user } = useAuth()
  const { refreshSettings } = useAppSettings()
  const [subTab, setSubTab] = useState('branche')
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
      logger.error('Fout bij laden instellingen:', err)
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
      logger.error('Fout bij opslaan aanpassingen:', err)
      toast.error('Kon aanpassingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground dark:text-muted-foreground/60">
          Instellingen laden...
        </CardContent>
      </Card>
    )
  }

  const saveButton = (
    <div className="flex justify-end mt-6">
      <Button onClick={handleSave} disabled={isSaving} className="gap-2">
        <Save className="w-4 h-4" />
        {isSaving ? 'Opslaan...' : 'Opslaan'}
      </Button>
    </div>
  )

  return (
    <>
    <SubTabNav tabs={AANPASSINGEN_TABS} active={subTab} onChange={setSubTab} />

    {subTab === 'branche' && (
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
                    : 'border-border dark:border-border hover:border-border dark:hover:border-border'
                }`}
              >
                <p className="text-sm font-semibold text-foreground dark:text-white">{preset.label}</p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">{preset.beschrijving}</p>
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
      {saveButton}
    </div>
    )}

    {subTab === 'offertes' && (
    <div className="space-y-6">
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
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
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
                <span className="text-sm text-muted-foreground dark:text-muted-foreground/60">
                  {autoFollowUp ? 'Actief' : 'Uit'}
                </span>
                {autoFollowUp && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground dark:text-muted-foreground/60">na</span>
                    <Input
                      type="number"
                      min="1"
                      className="w-20"
                      value={followUpDagen}
                      onChange={(e) => setFollowUpDagen(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground dark:text-muted-foreground/60">dagen</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {saveButton}
    </div>
    )}

    {subTab === 'pipeline' && (
    <div className="space-y-6">
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
                className="flex items-center gap-3 p-3 rounded-lg bg-background dark:bg-foreground/80/50 border border-border dark:border-border"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
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
                  className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-red-500"
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
      {saveButton}
    </div>
    )}

    {subTab === 'branding' && (
    <div className="space-y-6">
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
                        ? 'border-border dark:border-white scale-110 shadow-lg'
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
                        ? 'border-border dark:border-white scale-110 shadow-lg'
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
          <div className="p-4 rounded-xl border border-border dark:border-border bg-card">
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mb-2">Voorbeeld</p>
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
      {saveButton}
    </div>
    )}

    {subTab === 'dashboard' && (
    <div className="space-y-6">
      {/* Dashboard Weergave */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Weergave</CardTitle>
          <CardDescription>Bepaal welke indicatoren u wilt zien in de pipeline en dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground dark:text-white">Conversie rate tonen</p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Percentage goedgekeurde offertes</p>
            </div>
            <Switch checked={toonConversieRate} onCheckedChange={setToonConversieRate} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground dark:text-white">Dagen open tonen</p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Hoeveel dagen een offerte al openstaat</p>
            </div>
            <Switch checked={toonDagenOpen} onCheckedChange={setToonDagenOpen} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground dark:text-white">Follow-up indicatoren</p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Bel- en follow-up iconen op offerte kaarten</p>
            </div>
            <Switch checked={toonFollowUpIndicatoren} onCheckedChange={setToonFollowUpIndicatoren} />
          </div>
        </CardContent>
      </Card>

      {saveButton}
    </div>
    )}
    </>
  )
}

// ============ MELDINGEN TAB ============

const MELDINGEN_TABS: SubTab[] = [
  { id: 'voorkeuren', label: 'Voorkeuren', icon: Bell },
]

function MeldingenTab() {
  const { user } = useAuth()
  const { refreshSettings } = useAppSettings()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [subTab, setSubTab] = useState('voorkeuren')
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
      logger.error('Fout bij laden meldingen:', err)
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
      logger.error('Fout bij opslaan meldingen:', err)
      toast.error('Kon meldingsinstellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground dark:text-muted-foreground/60">
          Meldingsinstellingen laden...
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <SubTabNav tabs={MELDINGEN_TABS} active={subTab} onChange={setSubTab} />
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
                <p className="text-sm font-semibold text-foreground dark:text-white">
                  Follow-up Herinneringen
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
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
                <p className="text-sm font-semibold text-foreground dark:text-white">
                  Verlopen Offertes
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
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
                <p className="text-sm font-semibold text-foreground dark:text-white">
                  Nieuwe Offerte Bevestiging
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  Bevestiging wanneer een nieuwe offerte is aangemaakt
                </p>
              </div>
            </div>
            <Switch checked={meldingNieuweOfferte} onCheckedChange={setMeldingNieuweOfferte} />
          </div>

          {/* Status wijzigingen */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-wm-pale/20 dark:bg-accent/20 border border-primary/30 dark:border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-wm-pale/30 dark:bg-accent/30 flex items-center justify-center">
                <Settings className="w-5 h-5 text-accent dark:text-wm-light" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground dark:text-white">
                  Status Wijzigingen
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
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
    </>
  )
}

// ============ INTEGRATIES TAB ============

// Local storage key for email settings in demo mode
const EMAIL_SETTINGS_KEY = 'forgedesk_email_settings'

interface EmailSettings {
  smtp_host: string
  smtp_port: number
  smtp_encryption: 'TLS' | 'SSL' | 'Geen'
  imap_host: string
  imap_port: number
  gmail_address: string
  app_password: string
  accept_self_signed: boolean
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_encryption: 'TLS',
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  gmail_address: '',
  app_password: '',
  accept_self_signed: false,
}

function getLocalEmailSettings(): EmailSettings | null {
  try {
    const stored = localStorage.getItem(EMAIL_SETTINGS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return null
}

function saveLocalEmailSettings(settings: EmailSettings): void {
  localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings))
}

function removeLocalEmailSettings(): void {
  localStorage.removeItem(EMAIL_SETTINGS_KEY)
}

function EmailSettingsInline({
  onSaved,
}: {
  onSaved: () => void
}) {
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_EMAIL_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load existing settings on mount
  useEffect(() => {
    const existing = getLocalEmailSettings()
    if (existing) {
      setSettings(existing)
    } else {
      setSettings(DEFAULT_EMAIL_SETTINGS)
    }
  }, [])

  const handleSave = async () => {
    setError('')
    setSuccess('')

    if (!settings.gmail_address) {
      setError('Vul een e-mailadres in')
      return
    }
    if (!settings.app_password) {
      setError('Vul een app-wachtwoord in')
      return
    }
    if (!settings.smtp_host) {
      setError('Vul een SMTP server in')
      return
    }

    setIsSaving(true)
    try {
      // Save locally (works in demo mode and as cache)
      saveLocalEmailSettings(settings)

      // Also try to save to Supabase if configured
      if (isSupabaseConfigured()) {
        const { saveEmailSettings } = await import('@/services/gmailService')
        await saveEmailSettings({
          gmail_address: settings.gmail_address,
          app_password: settings.app_password,
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          imap_host: settings.imap_host,
          imap_port: settings.imap_port,
        })
      }

      setSuccess('E-mailinstellingen opgeslagen!')
      onSaved()
    } catch (err: unknown) {
      // If Supabase save fails, local save already succeeded
      if (isSupabaseConfigured()) {
        setError(`Server fout: ${err instanceof Error ? err.message : 'Onbekende fout'}. Instellingen zijn lokaal opgeslagen.`)
      } else {
        setSuccess('E-mailinstellingen lokaal opgeslagen (demo modus)')
        onSaved()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setError('')
    setSuccess('')

    if (!settings.gmail_address || !settings.app_password) {
      setError('Vul eerst e-mailadres en app-wachtwoord in')
      setIsTesting(false)
      return
    }

    try {
      const { testEmailConnection } = await import('@/services/gmailService')
      const result = await testEmailConnection(
        settings.gmail_address,
        settings.app_password,
        {
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          imap_host: settings.imap_host,
          imap_port: settings.imap_port,
        }
      )

      if (result.imap_ok && result.smtp_ok) {
        setSuccess('Verbinding gelukt! IMAP en SMTP werken beide correct.')
      } else {
        const parts: string[] = []
        if (result.imap_ok) parts.push('IMAP: OK')
        else parts.push('IMAP: Mislukt')
        if (result.smtp_ok) parts.push('SMTP: OK')
        else parts.push('SMTP: Mislukt')
        const msg = parts.join(' | ')
        if (result.error) {
          setError(`${msg}. ${result.error}`)
        } else {
          setError(msg)
        }
      }
    } catch (err: unknown) {
      setError(`Test mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`)
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = () => {
    removeLocalEmailSettings()
    setSettings(DEFAULT_EMAIL_SETTINGS)
    setSuccess('')
    setError('')
    onSaved()
  }

  const isConnected = !!getLocalEmailSettings()

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          E-mail Instellingen
        </CardTitle>
        <CardDescription>
          Configureer SMTP (verzenden) en IMAP (ontvangen) om e-mails te beheren vanuit FORGE.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* SMTP Server */}
          <div className="space-y-2">
            <Label htmlFor="smtp_host" className="flex items-center gap-2 text-sm font-medium">
              <Server className="w-3.5 h-3.5 text-muted-foreground" />
              SMTP Serveradres
            </Label>
            <Input
              id="smtp_host"
              placeholder="smtp.gmail.com"
              value={settings.smtp_host}
              onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
            />
          </div>

          {/* Port + Encryption row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="smtp_port" className="text-sm font-medium">
                Poort
              </Label>
              <Input
                id="smtp_port"
                type="number"
                placeholder="587"
                value={settings.smtp_port}
                onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 587 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_encryption" className="text-sm font-medium">
                Mail encryptie
              </Label>
              <Select
                value={settings.smtp_encryption}
                onValueChange={(val) => setSettings({ ...settings, smtp_encryption: val as EmailSettings['smtp_encryption'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="TLS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TLS">TLS</SelectItem>
                  <SelectItem value="SSL">SSL</SelectItem>
                  <SelectItem value="Geen">Geen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* IMAP Server */}
          <div className="space-y-2">
            <Label htmlFor="imap_host" className="flex items-center gap-2 text-sm font-medium">
              <Server className="w-3.5 h-3.5 text-muted-foreground" />
              IMAP Serveradres (inbox ontvangen)
            </Label>
            <Input
              id="imap_host"
              placeholder="imap.gmail.com"
              value={settings.imap_host}
              onChange={(e) => setSettings({ ...settings, imap_host: e.target.value })}
            />
          </div>

          {/* IMAP Port */}
          <div className="space-y-2">
            <Label htmlFor="imap_port" className="text-sm font-medium">
              IMAP Poort
            </Label>
            <Input
              id="imap_port"
              type="number"
              placeholder="993"
              value={settings.imap_port}
              onChange={(e) => setSettings({ ...settings, imap_port: parseInt(e.target.value) || 993 })}
            />
          </div>

          <Separator />

          {/* Username (email) */}
          <div className="space-y-2">
            <Label htmlFor="gmail_address" className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Gebruikersnaam (e-mailadres)
            </Label>
            <Input
              id="gmail_address"
              type="email"
              placeholder="studio@signcompany.nl"
              value={settings.gmail_address}
              onChange={(e) => setSettings({ ...settings, gmail_address: e.target.value })}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="app_password" className="flex items-center gap-2 text-sm font-medium">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              Wachtwoord / App Wachtwoord
            </Label>
            <div className="relative">
              <Input
                id="app_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••••••"
                value={settings.app_password}
                onChange={(e) => setSettings({ ...settings, app_password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Self-signed certs */}
          <div className="flex items-center justify-between">
            <Label htmlFor="self_signed" className="text-sm text-muted-foreground">
              Zelf-ondertekende certificaten accepteren
            </Label>
            <Switch
              id="self_signed"
              checked={settings.accept_self_signed}
              onCheckedChange={(checked) => setSettings({ ...settings, accept_self_signed: checked })}
            />
          </div>

          {/* Gmail App Password info */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-medium">Gmail gebruikers</p>
                <p>
                  Gebruik een <strong>App Wachtwoord</strong> in plaats van je gewone wachtwoord.
                  Ga naar{' '}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-0.5"
                  >
                    Google App Wachtwoorden
                    <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  om er een aan te maken. 2FA moet ingeschakeld zijn.
                </p>
              </div>
            </div>
          </div>

          {/* SPF Record info */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-medium">SPF Record</p>
                <p>
                  Zorg dat je domein een geldig SPF record heeft om te voorkomen dat e-mails
                  als spam worden gemarkeerd. Voeg <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">include:_spf.google.com</code> toe
                  aan je DNS SPF record.
                </p>
              </div>
            </div>
          </div>

          {/* Error/Success messages */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
              <p className="text-xs text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
            {isConnected && (
              <Button variant="ghost" onClick={handleDisconnect} className="gap-2 text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
                Verwijderen
              </Button>
            )}
            <Button variant="outline" onClick={handleTest} disabled={isTesting} className="gap-2 ml-auto">
              <Mail className="w-4 h-4" />
              {isTesting ? 'Testen...' : 'Test verbinding'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const INTEGRATIES_TABS: SubTab[] = [
  { id: 'koppelingen', label: 'Koppelingen', icon: Puzzle },
]

function IntegratiesTab() {
  const [subTab, setSubTab] = useState('koppelingen')
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const supabaseConnected = !!supabaseUrl && supabaseUrl !== 'your-supabase-url-here'
  // OpenAI key is now server-side only (configured via OPENAI_API_KEY env var on Vercel)
  const openaiConfigured = supabaseConnected

  const [emailConnected, setEmailConnected] = useState(false)
  const [emailAddress, setEmailAddress] = useState<string | null>(null)

  // Check email connection status on mount and after save
  const checkEmailStatus = useCallback(() => {
    const localSettings = getLocalEmailSettings()
    if (localSettings && localSettings.gmail_address && localSettings.app_password) {
      setEmailConnected(true)
      setEmailAddress(localSettings.gmail_address)
    } else {
      setEmailConnected(false)
      setEmailAddress(null)
    }
  }, [])

  useEffect(() => {
    checkEmailStatus()
  }, [checkEmailStatus])

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
      name: 'Gmail / SMTP',
      description: 'E-mail verzenden via SMTP',
      connected: emailConnected,
      icon: (
        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
          <span className="text-red-700 dark:text-red-400 font-bold text-sm">GM</span>
        </div>
      ),
      details: emailConnected && emailAddress ? `Account: ${emailAddress}` : undefined,
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'AI-functionaliteit voor tekst generatie en analyse',
      connected: openaiConfigured,
      icon: (
        <div className="w-10 h-10 bg-wm-pale/30 dark:bg-accent/30 rounded-lg flex items-center justify-center">
          <span className="text-accent dark:text-wm-light font-bold text-sm">AI</span>
        </div>
      ),
    },
    {
      id: 'kvk',
      name: 'KvK API',
      description: 'Kamer van Koophandel opzoeken voor bedrijfsgegevens',
      connected: false,
      icon: (
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">KvK</span>
        </div>
      ),
      details: 'Optioneel — zonder API key worden demogegevens gebruikt',
    },
  ]

  return (
    <>
    <SubTabNav tabs={INTEGRATIES_TABS} active={subTab} onChange={setSubTab} />
    <div className="space-y-4">
      {integrations.map((integration) => (
        <Card
          key={integration.id}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {integration.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-foreground dark:text-white">
                    {integration.name}
                  </h3>
                  <Badge
                    className={
                      integration.connected
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-muted text-muted-foreground dark:bg-foreground/80 dark:text-muted-foreground/60'
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
                <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">
                  {integration.description}
                </p>
                {integration.details && (
                  <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground mt-1 font-mono">
                    {integration.details}
                  </p>
                )}

                {/* OpenAI - server-side configured */}
                {integration.id === 'openai' && (
                  <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground mt-2">
                    De OpenAI API key wordt veilig op de server geconfigureerd (OPENAI_API_KEY environment variable).
                  </p>
                )}

                {/* Gmail/Email setup info - instellingen staan hieronder inline */}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <EmailSettingsInline
        onSaved={checkEmailStatus}
      />
    </div>
    </>
  )
}

// ============ BEVEILIGING TAB ============

const BEVEILIGING_TABS: SubTab[] = [
  { id: 'wachtwoord', label: 'Wachtwoord', icon: Lock },
  { id: 'tweefactor', label: 'Tweefactor', icon: Shield },
  { id: 'sessies', label: 'Sessies', icon: Globe },
]

function BeveiligingTab() {
  const [subTab, setSubTab] = useState('wachtwoord')
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
        const storedUser = localStorage.getItem('forgedesk_demo_user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          const storedPw = localStorage.getItem('forgedesk_demo_password') || 'demo'
          if (currentPassword !== storedPw) {
            toast.error('Huidig wachtwoord is onjuist (standaard: "demo")')
            return
          }
          localStorage.setItem('forgedesk_demo_password', newPassword)
          toast.success('Wachtwoord succesvol gewijzigd (demo modus)')
        }
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      logger.error('Error changing password:', err)
      toast.error('Er is een fout opgetreden bij het wijzigen van het wachtwoord')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <>
      <SubTabNav tabs={BEVEILIGING_TABS} active={subTab} onChange={setSubTab} />

      {subTab === 'wachtwoord' && (
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
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
      )}

      {subTab === 'tweefactor' && (
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
              <p className="text-sm font-medium text-foreground dark:text-white">
                2FA Inschakelen
              </p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-1">
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
      )}

      {subTab === 'sessies' && (
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
                  <p className="text-sm font-medium text-foreground dark:text-white">
                    Huidige sessie
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                    Browser - Laatst actief: Nu
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Actief
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-background dark:bg-foreground/80/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-foreground dark:text-white">
                    Chrome - Windows
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
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
      )}
    </>
  )
}

// ============ WEERGAVE TAB ============

// Alle mogelijke sidebar items met hun labels en secties
const ALL_SIDEBAR_ITEMS = [
  // Moet exact overeenkomen met navSections in Sidebar.tsx
  { label: 'Dashboard', section: 'Overzicht' },
  { label: 'Klanten', section: 'Verkoop' },
  { label: 'Deals', section: 'Verkoop' },
  { label: 'Offertes', section: 'Verkoop' },
  { label: 'Facturen', section: 'Verkoop' },
  { label: 'Projecten', section: 'Productie' },
  { label: 'Taken', section: 'Productie' },
  { label: 'Montage', section: 'Productie' },
  { label: 'Werkbonnen', section: 'Productie' },
  { label: 'Nacalculatie', section: 'Productie' },
  { label: 'Planning', section: 'Planning' },
  { label: 'Email', section: 'Communicatie' },
  { label: 'Nieuwsbrieven', section: 'Communicatie' },
  { label: 'Financieel', section: 'Financieel' },
  { label: 'Documenten', section: 'Beheer' },
  { label: 'Rapportages', section: 'Beheer' },
  { label: 'Team', section: 'Beheer' },
]

const WEERGAVE_TABS: SubTab[] = [
  { id: 'thema', label: 'Thema & Kleuren', icon: Sun },
  { id: 'layout', label: 'Layout', icon: Monitor },
  { id: 'voorkeuren', label: 'Voorkeuren', icon: Sliders },
  { id: 'navigatie', label: 'Navigatie', icon: Settings },
]

function WeergaveTab() {
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { settings, updateSettings } = useAppSettings()
  const { paletteId, setPaletteId, appThemeId, setAppThemeId } = usePalette()
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
      logger.error(err)
      toast.error('Kon navigatie niet opslaan')
    } finally {
      setIsSavingSidebar(false)
    }
  }

  const handleResetSidebar = () => {
    setSidebarItems(ALL_SIDEBAR_ITEMS.map((i) => i.label))
  }

  const [subTab, setSubTab] = useState('thema')
  // Font size state (font family is fixed to Inter)
  const [fontSize, setFontSize] = useState<FontSize>(() => getFontSettings().font_size)
  const { layoutMode, setLayoutMode } = useSidebar()

  const handleSelectFontSize = (size: FontSize) => {
    setFontSize(size)
    applyFontSize(size)
    saveFontSettings({ font_size: size })
    const sizeLabel = BESCHIKBARE_FONT_SIZES.find((s) => s.value === size)?.label ?? size
    toast.success(`Lettergrootte "${sizeLabel}" ingesteld`)
  }

  const [autoCollapse, setAutoCollapse] = useState(() => {
    const stored = localStorage.getItem('forgedesk_autoCollapse')
    return stored !== null ? JSON.parse(stored) : true
  })
  const [compactMode, setCompactMode] = useState(() => {
    const stored = localStorage.getItem('forgedesk_compactMode')
    return stored !== null ? JSON.parse(stored) : false
  })

  return (
    <>
    <SubTabNav tabs={WEERGAVE_TABS} active={subTab} onChange={setSubTab} />

    {subTab === 'thema' && (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Thema &amp; Kleuren
        </CardTitle>
        <CardDescription>Kies een thema en kleurenpalet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Theme Picker */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Sun className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                App Thema
              </p>
              <p className="text-xs text-muted-foreground">
                Kies een volledig thema — verandert achtergrond, kaarten, sidebar en sfeer
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {APP_THEMES.map((t) => {
              const isActive = appThemeId === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setAppThemeId(t.id)
                    toast.success(`Thema "${t.naam}" geactiveerd`)
                  }}
                  className={cn(
                    'relative group rounded-xl border-2 p-3 transition-all duration-200 text-left',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/40 hover:shadow-sm'
                  )}
                >
                  {/* Mini UI mockup */}
                  <div
                    className="rounded-lg overflow-hidden mb-2.5 border border-border/30"
                    style={{ background: t.preview.bg }}
                  >
                    <div className="flex h-16">
                      {/* Mini sidebar */}
                      <div
                        className="w-5 flex-shrink-0 border-r"
                        style={{
                          background: t.preview.sidebar,
                          borderColor: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        }}
                      >
                        <div className="mt-2 mx-1 space-y-1">
                          <div className="h-1 rounded-full" style={{ background: t.preview.accent, opacity: 0.7 }} />
                          <div className="h-1 rounded-full" style={{ background: t.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
                          <div className="h-1 rounded-full" style={{ background: t.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
                        </div>
                      </div>
                      {/* Mini content */}
                      <div className="flex-1 p-1.5 space-y-1.5">
                        <div className="h-1.5 w-10 rounded-full" style={{ background: t.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }} />
                        <div
                          className="rounded-md p-1"
                          style={{
                            background: t.preview.card,
                            border: `1px solid ${t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                          }}
                        >
                          <div className="h-1 w-8 rounded-full" style={{ background: t.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }} />
                          <div className="h-1 w-12 rounded-full mt-0.5" style={{ background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }} />
                        </div>
                        <div className="flex gap-1">
                          <div className="h-2 w-6 rounded" style={{ background: t.preview.accent, opacity: 0.8 }} />
                          <div className="h-2 w-6 rounded" style={{ background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>
                    {t.naam}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {t.beschrijving}
                  </p>
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Color Palette Picker */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Kleurenpalet
              </p>
              <p className="text-xs text-muted-foreground">
                Kies je favoriete accentkleur — werkt met elk thema
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PALETTES.map((p) => {
              const isActive = paletteId === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setPaletteId(p.id)
                    toast.success(`Palet "${p.naam}" geactiveerd`)
                  }}
                  className={`relative group rounded-xl border-2 p-3 transition-all duration-200 text-left ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/40 hover:shadow-sm'
                  }`}
                >
                  {/* Color swatch */}
                  <div className="flex gap-1 mb-2.5">
                    {p.preview.map((color, i) => (
                      <div
                        key={i}
                        className={`h-6 flex-1 transition-transform duration-200 ${
                          i === 0 ? 'rounded-l-md' : i === 2 ? 'rounded-r-md' : ''
                        } ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {/* Label */}
                  <p className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {p.naam}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {p.beschrijving}
                  </p>
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

      </CardContent>
    </Card>
    )}

    {subTab === 'layout' && (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Layout &amp; Lettergrootte
        </CardTitle>
        <CardDescription>Navigatie-indeling en tekstgrootte</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layout Mode */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Navigatie layout
              </p>
              <p className="text-xs text-muted-foreground">
                Kies tussen een zijbalk of horizontale navigatie bovenin
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setLayoutMode('sidebar')
                toast.success('Zijbalk navigatie ingesteld')
              }}
              className={cn(
                'relative rounded-xl border-2 p-4 transition-all duration-200 text-left',
                layoutMode === 'sidebar'
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/40 hover:shadow-sm'
              )}
            >
              {/* Mini mockup - sidebar layout */}
              <div className="rounded-lg overflow-hidden mb-3 border border-border/30 bg-muted/30">
                <div className="flex h-14">
                  <div className="w-6 border-r border-border/30 bg-muted/50 flex flex-col items-center pt-1.5 gap-1">
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-0.5 rounded-full bg-primary/50" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="flex-1 p-1.5">
                    <div className="w-full h-1 bg-muted-foreground/10 rounded mb-1.5" />
                    <div className="grid grid-cols-3 gap-1">
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                    </div>
                  </div>
                </div>
              </div>
              <p className={cn('text-sm font-semibold', layoutMode === 'sidebar' ? 'text-primary' : 'text-foreground')}>
                Zijbalk
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Navigatie aan de linkerkant
              </p>
              {layoutMode === 'sidebar' && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>

            <button
              onClick={() => {
                setLayoutMode('topnav')
                toast.success('Top navigatie ingesteld')
              }}
              className={cn(
                'relative rounded-xl border-2 p-4 transition-all duration-200 text-left',
                layoutMode === 'topnav'
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/40 hover:shadow-sm'
              )}
            >
              {/* Mini mockup - topnav layout */}
              <div className="rounded-lg overflow-hidden mb-3 border border-border/30 bg-muted/30">
                <div className="flex flex-col h-14">
                  <div className="h-3 border-b border-border/30 bg-muted/50 flex items-center px-1.5 gap-1">
                    <div className="w-2 h-1 rounded-sm bg-primary/50" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="flex-1 p-1.5">
                    <div className="grid grid-cols-3 gap-1">
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                    </div>
                  </div>
                </div>
              </div>
              <p className={cn('text-sm font-semibold', layoutMode === 'topnav' ? 'text-primary' : 'text-foreground')}>
                Top navigatie
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Navigatie bovenin de pagina
              </p>
              {layoutMode === 'topnav' && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          </div>
        </div>

        <Separator />

        {/* Font Size Selector */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Type className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Lettergrootte
              </p>
              <p className="text-xs text-muted-foreground">
                Pas de tekstgrootte aan voor betere leesbaarheid
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BESCHIKBARE_FONT_SIZES.map((size) => (
              <button
                key={size.value}
                onClick={() => handleSelectFontSize(size.value)}
                className={cn(
                  'p-3 rounded-lg border text-center transition-all',
                  fontSize === size.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                )}
              >
                <span className="text-sm font-medium">{size.label}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{size.beschrijving}</p>
              </button>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
    )}

    {subTab === 'voorkeuren' && (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="w-5 h-5" />
          Voorkeuren
        </CardTitle>
        <CardDescription>Taal en gedrag van de applicatie</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">
              {language === 'nl' ? 'NL' : 'EN'}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Taal
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'nl' ? 'Nederlands' : 'English'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
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
            <p className="text-sm font-medium text-foreground">
              Sidebar automatisch inklappen
            </p>
            <p className="text-xs text-muted-foreground">
              Klap de sidebar automatisch in op mobiele apparaten
            </p>
          </div>
          <Switch
            checked={autoCollapse}
            onCheckedChange={(checked) => {
              setAutoCollapse(checked)
              localStorage.setItem('forgedesk_autoCollapse', JSON.stringify(checked))
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
            <p className="text-sm font-medium text-foreground">
              Compacte modus
            </p>
            <p className="text-xs text-muted-foreground">
              Verminder witruimte en gebruik kleinere elementen
            </p>
          </div>
          <Switch
            checked={compactMode}
            onCheckedChange={(checked) => {
              setCompactMode(checked)
              localStorage.setItem('forgedesk_compactMode', JSON.stringify(checked))
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
    )}

    {subTab === 'navigatie' && (
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
        {['Overzicht', 'Verkoop', 'Productie', 'Planning', 'Communicatie', 'Financieel', 'Beheer'].map((section) => {
          const sectionItems = ALL_SIDEBAR_ITEMS.filter((i) => i.section === section)
          return (
            <div key={section}>
              <h4 className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground/60 uppercase tracking-wider mb-2">
                {section}
              </h4>
              <div className="space-y-2">
                {sectionItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-background dark:hover:bg-foreground/80/30"
                  >
                    <span className="text-sm text-foreground dark:text-white">{item.label}</span>
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
        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-background dark:bg-foreground/80/30">
          <span className="text-sm text-foreground dark:text-white">Instellingen</span>
          <span className="text-xs text-muted-foreground dark:text-muted-foreground/60">Altijd zichtbaar</span>
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
    )}
    </>
  )
}
