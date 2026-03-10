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
  Sliders,
  Bell,
  Trash2,
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
  ArrowRight,
  Monitor,
  PanelLeft,
  ImageIcon,
  X,
  UserCircle,
  Minus,
  Plus,
  Loader2,
  Package,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { usePalette, APP_THEMES, ACCENT_PALETTES } from '@/contexts/PaletteContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { getProfile, updateProfile, getAppSettings, updateAppSettings, getMedewerkers, updateMedewerker } from '@/services/supabaseService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import supabase from '@/services/supabaseClient'
import { useNavigate } from 'react-router-dom'
import type { AppSettings, Medewerker } from '@/types'
import { uploadFile, downloadFile } from '@/services/storageService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '../../utils/logger'
import { HuisstijlTab } from './HuisstijlTab'
import { CalculatieTab } from './CalculatieTab'
import { ForgieTab } from './ForgieTab'
import { Sparkles } from 'lucide-react'

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
  { id: 'documenten', label: 'Documenten', icon: FileText, description: 'Offertes, facturen en nummering' },
  { id: 'huisstijl', label: 'Huisstijl', icon: Palette, description: 'Document styling en briefpapier' },
  { id: 'calculatie', label: 'Calculatie', icon: Calculator, description: 'Producten, marges en eenheden' },
  { id: 'email', label: 'Email', icon: Mail, description: 'Handtekening, afzender en SMTP' },
  { id: 'integraties', label: 'Integraties', icon: Puzzle, description: 'Koppelingen met externe diensten' },
  { id: 'beveiliging', label: 'Beveiliging', icon: Shield, description: 'Wachtwoord en sessies' },
  { id: 'weergave', label: 'Weergave', icon: Sliders, description: 'Thema, taal en lay-out' },
  { id: 'forgie', label: 'Forgie AI', icon: Sparkles, description: 'AI assistent, visualizer en data import' },
] as const

function renderTabContent(tabId: string) {
  switch (tabId) {
    case 'profiel': return <ProfielTab />
    case 'bedrijf': return <BedrijfTab />
    case 'documenten': return <DocumentenTab />
    case 'huisstijl': return <HuisstijlTab />
    case 'calculatie': return <CalculatieTab />
    case 'email': return <EmailTab />
    case 'integraties': return <IntegratiesTab />
    case 'beveiliging': return <BeveiligingTab />
    case 'weergave': return <WeergaveTab />
    case 'forgie': return <ForgieTab />
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

// ============ DOCUMENTEN TAB ============

const DOCUMENTEN_TABS: SubTab[] = [
  { id: 'offertes', label: 'Offertes', icon: FileText },
  { id: 'facturen', label: 'Facturen', icon: Receipt },
]

function DocumentenTab() {
  const { user } = useAuth()
  const { refreshSettings } = useAppSettings()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [subTab, setSubTab] = useState('offertes')

  // Offerte velden
  const [offertePrefix, setOffertePrefix] = useState('OFF')
  const [offerteGeldigheid, setOfferteGeldigheid] = useState('30')
  const [standaardBtw, setStandaardBtw] = useState('21')
  const [offerteIntroTekst, setOfferteIntroTekst] = useState('')
  const [offerteOutroTekst, setOfferteOutroTekst] = useState('')

  // Factuur velden
  const [factuurPrefix, setFactuurPrefix] = useState('FAC')
  const [creditnotaPrefix, setCreditnotaPrefix] = useState('CN')
  const [werkbonPrefix, setWerkbonPrefix] = useState('WB')
  const [betaaltermijn, setBetaaltermijn] = useState('30')
  const [voorwaarden, setVoorwaarden] = useState('')
  const [herinnering1, setHerinnering1] = useState('')
  const [herinnering2, setHerinnering2] = useState('')
  const [aanmaningTekst, setAanmaningTekst] = useState('')
  const [standaardUurtarief, setStandaardUurtarief] = useState('75')

  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const data = await getAppSettings(user.id)
      // Offertes
      setOffertePrefix(data.offerte_prefix || 'OFF')
      setOfferteGeldigheid(String(data.offerte_geldigheid_dagen || 30))
      setStandaardBtw(String(data.standaard_btw || 21))
      setOfferteIntroTekst(data.offerte_intro_tekst || '')
      setOfferteOutroTekst(data.offerte_outro_tekst || '')
      // Facturen
      setFactuurPrefix(data.factuur_prefix || 'FAC')
      setCreditnotaPrefix(data.creditnota_prefix || 'CN')
      setWerkbonPrefix(data.werkbon_prefix || 'WB')
      setBetaaltermijn(String(data.factuur_betaaltermijn_dagen || 30))
      setVoorwaarden(data.factuur_voorwaarden || '')
      setHerinnering1(data.herinnering_1_tekst || '')
      setHerinnering2(data.herinnering_2_tekst || '')
      setAanmaningTekst(data.aanmaning_tekst || '')
      setStandaardUurtarief(String(data.standaard_uurtarief || 75))
    } catch (err) {
      logger.error('Fout bij laden documentinstellingen:', err)
      toast.error('Kon documentinstellingen niet laden')
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
        // Offertes
        offerte_prefix: offertePrefix,
        offerte_geldigheid_dagen: parseInt(offerteGeldigheid) || 30,
        standaard_btw: parseFloat(standaardBtw) || 21,
        offerte_intro_tekst: offerteIntroTekst,
        offerte_outro_tekst: offerteOutroTekst,
        // Facturen
        factuur_prefix: factuurPrefix,
        creditnota_prefix: creditnotaPrefix,
        werkbon_prefix: werkbonPrefix,
        factuur_betaaltermijn_dagen: parseInt(betaaltermijn) || 30,
        factuur_voorwaarden: voorwaarden,
        herinnering_1_tekst: herinnering1,
        herinnering_2_tekst: herinnering2,
        aanmaning_tekst: aanmaningTekst,
        standaard_uurtarief: parseFloat(standaardUurtarief) || 75,
      })
      await refreshSettings()
      toast.success('Documentinstellingen opgeslagen')
    } catch (err) {
      logger.error('Fout bij opslaan documentinstellingen:', err)
      toast.error('Kon documentinstellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground dark:text-muted-foreground/60">
          Documentinstellingen laden...
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
      <SubTabNav tabs={DOCUMENTEN_TABS} active={subTab} onChange={setSubTab} />

      {subTab === 'offertes' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Offerte Instellingen
              </CardTitle>
              <CardDescription>Nummering, geldigheid en standaardteksten voor offertes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offerte-prefix">Offerte prefix</Label>
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
                  <Label htmlFor="offerte-geldigheid">Geldigheidsduur (dagen)</Label>
                  <Input
                    id="offerte-geldigheid"
                    type="number"
                    min="1"
                    value={offerteGeldigheid}
                    onChange={(e) => setOfferteGeldigheid(e.target.value)}
                  />
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
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="offerte-intro">Standaard introductietekst</Label>
                  <Textarea
                    id="offerte-intro"
                    value={offerteIntroTekst}
                    onChange={(e) => setOfferteIntroTekst(e.target.value)}
                    placeholder="Bijv. Naar aanleiding van ons gesprek doen wij u hierbij een vrijblijvende offerte toekomen."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Wordt bovenaan de offerte weergegeven</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerte-outro">Standaard afsluittekst</Label>
                  <Textarea
                    id="offerte-outro"
                    value={offerteOutroTekst}
                    onChange={(e) => setOfferteOutroTekst(e.target.value)}
                    placeholder="Bijv. Wij vertrouwen erop u een passend aanbod te hebben gedaan."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Wordt onderaan de offerte weergegeven</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {saveButton}
        </div>
      )}

      {subTab === 'facturen' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Factuur Instellingen
              </CardTitle>
              <CardDescription>Nummering, betaaltermijnen en herinneringsteksten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prefixes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="factuur-prefix">Factuur prefix</Label>
                  <Input id="factuur-prefix" value={factuurPrefix} onChange={(e) => setFactuurPrefix(e.target.value.toUpperCase())} placeholder="FAC" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {factuurPrefix}-2026-0001</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditnota-prefix">Creditnota prefix</Label>
                  <Input id="creditnota-prefix" value={creditnotaPrefix} onChange={(e) => setCreditnotaPrefix(e.target.value.toUpperCase())} placeholder="CN" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {creditnotaPrefix}-2026-0001</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="werkbon-prefix">Werkbon prefix</Label>
                  <Input id="werkbon-prefix" value={werkbonPrefix} onChange={(e) => setWerkbonPrefix(e.target.value.toUpperCase())} placeholder="WB" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {werkbonPrefix}-2026-0001</p>
                </div>
              </div>

              <Separator />

              {/* Betaling */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="betaaltermijn">Betaaltermijn (dagen)</Label>
                  <Input id="betaaltermijn" type="number" value={betaaltermijn} onChange={(e) => setBetaaltermijn(e.target.value)} min="1" max="365" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standaard-uurtarief">Standaard uurtarief</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">&euro;</span>
                    <Input id="standaard-uurtarief" type="number" value={standaardUurtarief} onChange={(e) => setStandaardUurtarief(e.target.value)} min="0" className="pl-7" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voorwaarden">Standaard betalingsvoorwaarden</Label>
                <Textarea id="voorwaarden" value={voorwaarden} onChange={(e) => setVoorwaarden(e.target.value)} placeholder="Bijv. Op al onze overeenkomsten zijn onze algemene voorwaarden van toepassing, gedeponeerd bij de KvK." rows={3} />
              </div>

              <Separator />

              {/* Herinneringen */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground dark:text-white">Herinneringsteksten</p>
                <div className="space-y-2">
                  <Label htmlFor="herinnering1">Herinnering 1</Label>
                  <Textarea id="herinnering1" value={herinnering1} onChange={(e) => setHerinnering1(e.target.value)} placeholder="Bijv. Wellicht is het u ontgaan, maar wij hebben nog geen betaling ontvangen voor onderstaande factuur." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="herinnering2">Herinnering 2</Label>
                  <Textarea id="herinnering2" value={herinnering2} onChange={(e) => setHerinnering2(e.target.value)} placeholder="Bijv. Ondanks onze eerdere herinnering hebben wij nog geen betaling ontvangen." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aanmaning">Aanmaning</Label>
                  <Textarea id="aanmaning" value={aanmaningTekst} onChange={(e) => setAanmaningTekst(e.target.value)} placeholder="Bijv. Indien wij binnen 7 dagen geen betaling ontvangen, zijn wij genoodzaakt verdere stappen te ondernemen." rows={2} />
                </div>
              </div>
            </CardContent>
          </Card>
          {saveButton}
        </div>
      )}
    </>
  )
}

// ============ EMAIL TAB ============

const EMAIL_TABS: SubTab[] = [
  { id: 'handtekening', label: 'Handtekening', icon: FileText },
  { id: 'teamleden', label: 'Team Handtekeningen', icon: Users },
  { id: 'verbinding', label: 'Verbinding', icon: Server },
  { id: 'algemeen', label: 'Algemeen', icon: Mail },
]

function SignatureImageUpload({
  imageUrl,
  onImageChange,
  imageSize,
  onImageSizeChange,
  label = 'Afbeelding in handtekening',
}: {
  imageUrl: string
  onImageChange: (url: string) => void
  imageSize?: number
  onImageSizeChange?: (size: number) => void
  label?: string
}) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const currentSize = imageSize ?? 64

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecteer een afbeelding (PNG, JPG, SVG)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Afbeelding mag maximaal 2MB zijn')
      return
    }
    try {
      setIsUploading(true)
      // Upload path must start with user_id for Supabase RLS policies
      const userId = user?.id || 'local'
      const path = `${userId}/handtekeningen/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      await uploadFile(file, path)
      const url = await downloadFile(path)
      onImageChange(url)
      toast.success('Afbeelding geüpload')
    } catch (err) {
      logger.error('Fout bij uploaden afbeelding:', err)
      toast.error('Kon afbeelding niet uploaden. Controleer of Supabase Storage is geconfigureerd.')
    } finally {
      setIsUploading(false)
      // Reset file input so the same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
        Voeg een bedrijfslogo of profielfoto toe aan de handtekening (max 2MB)
      </p>
      {imageUrl ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="relative border rounded-lg p-2 bg-white dark:bg-muted">
              <img
                src={imageUrl}
                alt="Handtekening afbeelding"
                style={{ maxHeight: `${currentSize}px`, maxWidth: `${Math.round(currentSize * 2.5)}px` }}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {isUploading ? 'Uploaden...' : 'Vervangen'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onImageChange('')} className="text-destructive hover:text-destructive">
                <X className="w-3.5 h-3.5 mr-1.5" />
                Verwijderen
              </Button>
            </div>
          </div>
          {onImageSizeChange && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Afbeelding grootte</Label>
                <span className="text-xs text-muted-foreground">{currentSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  type="range"
                  min={24}
                  max={200}
                  step={4}
                  value={currentSize}
                  onChange={(e) => onImageSizeChange(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-3 w-full p-4 border-2 border-dashed rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          <div className="p-2 bg-muted rounded-lg">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{isUploading ? 'Uploaden...' : 'Afbeelding toevoegen'}</p>
            <p className="text-xs text-muted-foreground">PNG, JPG of SVG — bijv. bedrijfslogo of foto</p>
          </div>
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  )
}

function SignaturePreview({
  naam,
  handtekening,
  afbeelding,
  afbeeldingGrootte,
}: {
  naam: string
  handtekening: string
  afbeelding: string
  afbeeldingGrootte?: number
}) {
  if (!handtekening && !afbeelding) return null
  const imgSize = afbeeldingGrootte ?? 64
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Voorbeeld</Label>
      <div className="border rounded-lg p-4 bg-white dark:bg-muted/30 space-y-3">
        <div className="border-t border-muted pt-3">
          {afbeelding && (
            <img
              src={afbeelding}
              alt="Logo"
              style={{ maxHeight: `${imgSize}px`, maxWidth: `${Math.round(imgSize * 2.5)}px` }}
              className="object-contain mb-2"
            />
          )}
          <div className="text-sm whitespace-pre-line text-foreground/80">
            {handtekening || `Met vriendelijke groet,\n\n${naam}`}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmailTab() {
  const { user } = useAuth()
  const { refreshSettings, profile, emailFetchLimit: currentFetchLimit } = useAppSettings()
  const [subTab, setSubTab] = useState('handtekening')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [emailHandtekening, setEmailHandtekening] = useState('')
  const [afzenderNaam, setAfzenderNaam] = useState('')
  const [handtekeningAfbeelding, setHandtekeningAfbeelding] = useState('')
  const [afbeeldingGrootte, setAfbeeldingGrootte] = useState(64)
  const [emailFetchLimit, setEmailFetchLimit] = useState(currentFetchLimit || 200)

  // Team signatures (admin only)
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [savingMwId, setSavingMwId] = useState<string | null>(null)
  const [teamEdits, setTeamEdits] = useState<Record<string, { handtekening: string; afbeelding: string }>>({})
  const isAdmin = true // TODO: koppel aan app_rol wanneer rollen geïmplementeerd zijn

  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const data = await getAppSettings(user.id)
      setEmailHandtekening(data.email_handtekening || '')
      setAfzenderNaam(data.afzender_naam || '')
      setHandtekeningAfbeelding(data.handtekening_afbeelding || '')
      setAfbeeldingGrootte(data.handtekening_afbeelding_grootte ?? 64)
    } catch (err) {
      logger.error('Fout bij laden e-mailinstellingen:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const loadTeam = useCallback(async () => {
    try {
      setTeamLoading(true)
      const data = await getMedewerkers()
      setMedewerkers(data.filter(m => m.status === 'actief'))
      // Init edits
      const edits: Record<string, { handtekening: string; afbeelding: string }> = {}
      data.forEach(m => {
        edits[m.id] = { handtekening: m.email_handtekening || '', afbeelding: m.handtekening_afbeelding || '' }
      })
      setTeamEdits(edits)
    } catch (err) {
      logger.error('Fout bij laden teamleden:', err)
    } finally {
      setTeamLoading(false)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])
  useEffect(() => { if (subTab === 'teamleden') loadTeam() }, [subTab, loadTeam])

  const handleSave = async () => {
    if (!user?.id) return
    try {
      setIsSaving(true)
      await updateAppSettings(user.id, {
        email_handtekening: emailHandtekening,
        afzender_naam: afzenderNaam,
        handtekening_afbeelding: handtekeningAfbeelding,
        handtekening_afbeelding_grootte: afbeeldingGrootte,
      })
      await refreshSettings()
      toast.success('E-mailinstellingen opgeslagen')
    } catch (err) {
      logger.error('Fout bij opslaan e-mailinstellingen:', err)
      toast.error('Kon e-mailinstellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveTeamMember = async (mw: Medewerker) => {
    const edits = teamEdits[mw.id]
    if (!edits) return
    try {
      setSavingMwId(mw.id)
      await updateMedewerker(mw.id, {
        email_handtekening: edits.handtekening,
        handtekening_afbeelding: edits.afbeelding,
      })
      toast.success(`Handtekening van ${mw.naam} opgeslagen`)
    } catch (err) {
      logger.error('Fout bij opslaan teamlid handtekening:', err)
      toast.error(`Kon handtekening van ${mw.naam} niet opslaan`)
    } finally {
      setSavingMwId(null)
    }
  }

  const handleApplyToAll = async () => {
    if (!emailHandtekening && !handtekeningAfbeelding) {
      toast.error('Stel eerst je eigen handtekening in')
      return
    }
    const count = medewerkers.length
    if (count === 0) {
      toast.error('Geen actieve teamleden gevonden')
      return
    }
    try {
      setIsSaving(true)
      for (const mw of medewerkers) {
        // Personaliseer: vervang eigen naam door teamlid naam
        const personalised = emailHandtekening
          .replace(afzenderNaam || '', mw.naam)
        await updateMedewerker(mw.id, {
          email_handtekening: personalised,
          handtekening_afbeelding: handtekeningAfbeelding,
        })
      }
      await loadTeam()
      toast.success(`Handtekening toegepast op ${count} teamleden`)
    } catch (err) {
      logger.error('Fout bij toepassen op team:', err)
      toast.error('Kon handtekening niet op alle teamleden toepassen')
    } finally {
      setIsSaving(false)
    }
  }

  // Check email connection
  const [emailConnected, setEmailConnected] = useState(false)
  const checkEmailStatus = useCallback(() => {
    const localSettings = getLocalEmailSettings()
    setEmailConnected(!!(localSettings?.gmail_address && localSettings?.app_password))
  }, [])
  useEffect(() => { checkEmailStatus() }, [checkEmailStatus])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground dark:text-muted-foreground/60">
          E-mailinstellingen laden...
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
      <SubTabNav tabs={EMAIL_TABS} active={subTab} onChange={setSubTab} />

      {subTab === 'handtekening' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                E-mail Handtekening
              </CardTitle>
              <CardDescription>Wordt automatisch toegevoegd aan uitgaande e-mails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="afzender-naam">Standaard afzendernaam</Label>
                <Input
                  id="afzender-naam"
                  value={afzenderNaam}
                  onChange={(e) => setAfzenderNaam(e.target.value)}
                  placeholder="Bijv. Jan de Vries - Sign Company B.V."
                />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  De naam die ontvangers zien als afzender
                </p>
              </div>

              <SignatureImageUpload
                imageUrl={handtekeningAfbeelding}
                onImageChange={setHandtekeningAfbeelding}
                imageSize={afbeeldingGrootte}
                onImageSizeChange={setAfbeeldingGrootte}
              />

              <div className="space-y-2">
                <Label htmlFor="email-handtekening">Handtekening tekst</Label>
                <Textarea
                  id="email-handtekening"
                  value={emailHandtekening}
                  onChange={(e) => setEmailHandtekening(e.target.value)}
                  placeholder={"Met vriendelijke groet,\n\nJan de Vries\nSales Manager\nSign Company B.V.\nTel: 020-1234567"}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  Naam, functie, telefoonnummer en bedrijfsgegevens
                </p>
              </div>

              <SignaturePreview
                naam={afzenderNaam}
                handtekening={emailHandtekening}
                afbeelding={handtekeningAfbeelding}
                afbeeldingGrootte={afbeeldingGrootte}
              />
            </CardContent>
          </Card>
          {saveButton}
        </div>
      )}

      {subTab === 'teamleden' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Handtekeningen
              </CardTitle>
              <CardDescription>
                Beheer de e-mail handtekeningen van alle teamleden vanuit één plek
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin && medewerkers.length > 0 && (
                <div className="flex items-center justify-between p-3 mb-6 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-sm">Pas jouw handtekening toe op alle teamleden (met naam gepersonaliseerd)</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleApplyToAll} disabled={isSaving}>
                    {isSaving ? 'Toepassen...' : 'Toepassen op iedereen'}
                  </Button>
                </div>
              )}

              {teamLoading ? (
                <p className="text-center text-muted-foreground py-8">Teamleden laden...</p>
              ) : medewerkers.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground">Geen actieve teamleden gevonden</p>
                  <p className="text-xs text-muted-foreground/60">Voeg teamleden toe via Teamleden in het menu</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {medewerkers.map((mw) => {
                    const edits = teamEdits[mw.id] || { handtekening: '', afbeelding: '' }
                    return (
                      <Card key={mw.id} className="border-muted">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Avatar / info */}
                            <div className="flex-shrink-0">
                              {mw.avatar_url ? (
                                <img src={mw.avatar_url} alt={mw.naam} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                  <UserCircle className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-3">
                              <div>
                                <p className="font-medium text-sm">{mw.naam}</p>
                                <p className="text-xs text-muted-foreground">{mw.functie || mw.rol} — {mw.email}</p>
                              </div>

                              <SignatureImageUpload
                                imageUrl={edits.afbeelding}
                                onImageChange={(url) => setTeamEdits(prev => ({
                                  ...prev,
                                  [mw.id]: { ...prev[mw.id], afbeelding: url },
                                }))}
                                label="Handtekening afbeelding"
                              />

                              <div className="space-y-1">
                                <Label className="text-xs">Handtekening tekst</Label>
                                <Textarea
                                  value={edits.handtekening}
                                  onChange={(e) => setTeamEdits(prev => ({
                                    ...prev,
                                    [mw.id]: { ...prev[mw.id], handtekening: e.target.value },
                                  }))}
                                  placeholder={`Met vriendelijke groet,\n\n${mw.naam}\n${mw.functie || ''}`}
                                  rows={4}
                                />
                              </div>

                              <SignaturePreview
                                naam={mw.naam}
                                handtekening={edits.handtekening}
                                afbeelding={edits.afbeelding}
                              />

                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveTeamMember(mw)}
                                  disabled={savingMwId === mw.id}
                                  className="gap-1.5"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {savingMwId === mw.id ? 'Opslaan...' : 'Opslaan'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {subTab === 'verbinding' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                E-mail Verbinding
              </CardTitle>
              <CardDescription>
                {emailConnected
                  ? 'E-mail is verbonden en geconfigureerd'
                  : 'Configureer SMTP en IMAP om e-mails te verzenden en ontvangen vanuit FORGE'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailConnected && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-300">E-mail verbinding actief</span>
                </div>
              )}
            </CardContent>
          </Card>
          <EmailSettingsInline onSaved={checkEmailStatus} />
        </div>
      )}

      {subTab === 'algemeen' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              E-mail Voorkeuren
            </CardTitle>
            <CardDescription>Aantal emails dat bij opstarten wordt geladen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Aantal mails bij opstarten</Label>
              <Select
                value={String(emailFetchLimit)}
                onValueChange={(val) => setEmailFetchLimit(Number(val))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Meer emails laden kan trager zijn bij een grote inbox.</p>
            </div>
            <div className="flex justify-end mt-6">
              <Button
                onClick={async () => {
                  if (!user?.id) return
                  try {
                    setIsSaving(true)
                    await updateAppSettings(user.id, { email_fetch_limit: emailFetchLimit })
                    await refreshSettings()
                    toast.success('E-mail voorkeuren opgeslagen')
                  } catch (err) {
                    console.error('[SettingsLayout] Email voorkeuren opslaan mislukt:', err)
                    toast.error('Kon voorkeuren niet opslaan')
                  } finally {
                    setIsSaving(false)
                  }
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
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
  const { user } = useAuth()
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const supabaseConnected = !!supabaseUrl && supabaseUrl !== 'your-supabase-url-here'
  // Anthropic key is server-side only (configured via ANTHROPIC_API_KEY env var on Vercel)
  const anthropicConfigured = supabaseConnected

  // Mollie state
  const [mollieEnabled, setMollieEnabled] = useState(false)
  const [mollieApiKey, setMollieApiKey] = useState('')
  const [mollieSaving, setMollieSaving] = useState(false)
  const [mollieLoaded, setMollieLoaded] = useState(false)

  // Exact Online state
  const [exactClientId, setExactClientId] = useState('')
  const [exactClientSecret, setExactClientSecret] = useState('')
  const [exactConnected, setExactConnected] = useState(false)
  const [exactSaving, setExactSaving] = useState(false)

  // KvK API state
  const [kvkApiKey, setKvkApiKey] = useState('')
  const [kvkSaving, setKvkSaving] = useState(false)

  // Probo Prints state
  const [proboEnabled, setProboEnabled] = useState(false)
  const [proboApiKey, setProboApiKey] = useState('')
  const [proboSaving, setProboSaving] = useState(false)
  const [proboTesting, setProboTesting] = useState(false)
  const [proboTestResult, setProboTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    getAppSettings(user.id).then((s) => {
      setMollieEnabled(s.mollie_enabled ?? false)
      setMollieApiKey(s.mollie_api_key ?? '')
      setMollieLoaded(true)
      setExactClientId(s.exact_online_client_id ?? '')
      setExactClientSecret(s.exact_online_client_secret ?? '')
      setExactConnected(s.exact_online_connected ?? false)
      setKvkApiKey(s.kvk_api_key ?? '')
      setProboEnabled(s.probo_enabled ?? false)
      setProboApiKey(s.probo_api_key ?? '')
    }).catch(() => {})
  }, [user?.id])

  const handleMollieSave = async () => {
    if (!user?.id) return
    setMollieSaving(true)
    try {
      await updateAppSettings(user.id, { mollie_enabled: mollieEnabled, mollie_api_key: mollieApiKey })
      toast.success('Mollie instellingen opgeslagen')
    } catch (err) {
      logger.error('Fout bij opslaan Mollie instellingen:', err)
      toast.error('Kon Mollie instellingen niet opslaan')
    } finally {
      setMollieSaving(false)
    }
  }

  const handleExactSave = async () => {
    if (!user?.id) return
    setExactSaving(true)
    try {
      await updateAppSettings(user.id, {
        exact_online_client_id: exactClientId,
        exact_online_client_secret: exactClientSecret,
      })
      toast.success('Exact Online instellingen opgeslagen')
    } catch (err) {
      logger.error('Fout bij opslaan Exact Online instellingen:', err)
      toast.error('Kon Exact Online instellingen niet opslaan')
    } finally {
      setExactSaving(false)
    }
  }

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
      id: 'anthropic',
      name: 'Anthropic (Forgie)',
      description: 'AI-functionaliteit aangedreven door Claude',
      connected: anthropicConfigured,
      icon: (
        <div className="w-10 h-10 bg-blush/30 dark:bg-blush-deep/30 rounded-lg flex items-center justify-center">
          <span className="text-blush-deep font-bold text-sm">AI</span>
        </div>
      ),
    },
    {
      id: 'kvk',
      name: 'KvK API',
      description: 'Kamer van Koophandel opzoeken voor bedrijfsgegevens',
      connected: !!kvkApiKey,
      icon: (
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">KvK</span>
        </div>
      ),
      details: 'Optioneel — zonder API key worden demogegevens gebruikt',
    },
    {
      id: 'probo',
      name: 'Probo Prints',
      description: 'Live inkoopprijzen ophalen voor print- en signmaterialen',
      connected: proboEnabled && !!proboApiKey,
      icon: (
        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">PRB</span>
        </div>
      ),
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

                {/* Anthropic - server-side configured */}
                {integration.id === 'anthropic' && (
                  <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground mt-2">
                    De Anthropic API key wordt veilig op de server geconfigureerd (ANTHROPIC_API_KEY environment variable). Forgie gebruikt Claude voor AI-functies.
                  </p>
                )}

              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ── Mollie Instellingen ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-orange-700 dark:text-orange-400" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Mollie Betalingen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Vul je Mollie API key in. Klanten kunnen dan direct betalen via de betaalpagina.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="mollie-enabled" className="text-sm font-medium">
                  Mollie betalingen inschakelen
                </Label>
                <Switch
                  id="mollie-enabled"
                  checked={mollieEnabled}
                  onCheckedChange={setMollieEnabled}
                />
              </div>

              {mollieEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="mollie-api-key" className="text-sm font-medium">
                    Mollie API key
                  </Label>
                  <Input
                    id="mollie-api-key"
                    type="password"
                    value={mollieApiKey}
                    onChange={(e) => setMollieApiKey(e.target.value)}
                    placeholder="live_... of test_..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Je vindt je API key in het{' '}
                    <a
                      href="https://my.mollie.com/dashboard/developers/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline inline-flex items-center gap-0.5"
                    >
                      Mollie Dashboard <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleMollieSave} disabled={mollieSaving} size="sm">
                  {mollieSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Exact Online Instellingen ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-base font-semibold text-foreground">Exact Online</h3>
                <Badge
                  className={
                    exactConnected
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-muted text-muted-foreground dark:bg-foreground/80 dark:text-muted-foreground/60'
                  }
                >
                  {exactConnected ? (
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
              <p className="text-sm text-muted-foreground">
                Koppel Exact Online om facturen, relaties en boekingen automatisch te synchroniseren.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="exact-client-id" className="text-sm font-medium">
                    Client ID
                  </Label>
                  <Input
                    id="exact-client-id"
                    value={exactClientId}
                    onChange={(e) => setExactClientId(e.target.value)}
                    placeholder="Exact Online Client ID"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exact-client-secret" className="text-sm font-medium">
                    Client Secret
                  </Label>
                  <Input
                    id="exact-client-secret"
                    type="password"
                    value={exactClientSecret}
                    onChange={(e) => setExactClientSecret(e.target.value)}
                    placeholder="Exact Online Client Secret"
                    className="font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Maak een app aan in het{' '}
                  <a
                    href="https://apps.exactonline.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-0.5"
                  >
                    Exact Online App Center <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  om je Client ID en Secret te verkrijgen.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={handleExactSave} disabled={exactSaving} size="sm" variant="outline">
                  {exactSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
                <Button
                  size="sm"
                  disabled={!exactClientId || !exactClientSecret}
                  onClick={() => toast.info('Exact Online OAuth koppeling wordt binnenkort ondersteund')}
                  className="gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Verbinden
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KvK API Instellingen ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">KvK</span>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">KvK API</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Zoek bedrijfsgegevens op via de Kamer van Koophandel. Zonder API key wordt de testomgeving gebruikt.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kvk-api-key" className="text-sm font-medium">
                  KvK API key (optioneel)
                </Label>
                <Input
                  id="kvk-api-key"
                  type="password"
                  value={kvkApiKey}
                  onChange={(e) => setKvkApiKey(e.target.value)}
                  placeholder="l7xx..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Vraag een API key aan via{' '}
                  <a
                    href="https://developers.kvk.nl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-0.5"
                  >
                    developers.kvk.nl <ExternalLink className="w-3 h-3" />
                  </a>
                  . Zonder key worden testgegevens gebruikt.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    if (!user?.id) return
                    setKvkSaving(true)
                    try {
                      await updateAppSettings(user.id, {
                        kvk_api_key: kvkApiKey,
                        kvk_api_enabled: !!kvkApiKey,
                      })
                      toast.success('KvK instellingen opgeslagen')
                    } catch (err) {
                      logger.error('Fout bij opslaan KvK instellingen:', err)
                      toast.error('Kon KvK instellingen niet opslaan')
                    } finally {
                      setKvkSaving(false)
                    }
                  }}
                  disabled={kvkSaving}
                  size="sm"
                >
                  {kvkSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Probo Prints Instellingen ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-foreground">Probo Prints</h3>
                  <Badge
                    className={
                      proboEnabled && proboApiKey
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-muted text-muted-foreground dark:bg-foreground/80 dark:text-muted-foreground/60'
                    }
                  >
                    {proboEnabled && proboApiKey ? (
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
                <p className="text-sm text-muted-foreground mt-1">
                  Koppel je Probo account om live inkoopprijzen op te halen in de calculatie.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="probo-enabled" className="text-sm font-medium">
                  Probo integratie inschakelen
                </Label>
                <Switch
                  id="probo-enabled"
                  checked={proboEnabled}
                  onCheckedChange={setProboEnabled}
                />
              </div>

              {proboEnabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="probo-api-key" className="text-sm font-medium">
                      Probo API Token
                    </Label>
                    <Input
                      id="probo-api-key"
                      type="password"
                      value={proboApiKey}
                      onChange={(e) => { setProboApiKey(e.target.value); setProboTestResult(null) }}
                      placeholder="Basic auth token..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Je vindt je API token in het{' '}
                      <a
                        href="https://www.proboprints.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline inline-flex items-center gap-0.5"
                      >
                        Probo Dashboard <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>

                  {/* Test verbinding */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={proboTesting || !proboApiKey}
                      onClick={async () => {
                        setProboTesting(true)
                        setProboTestResult(null)
                        try {
                          // Save first so the API route can read the key
                          if (user?.id) {
                            await updateAppSettings(user.id, {
                              probo_api_key: proboApiKey,
                              probo_enabled: true,
                            })
                          }
                          const token = (await import('@/contexts/AuthContext')).useAuth as unknown
                          void token
                          // Use session from context
                          const response = await fetch('/api/probo-products', {
                            headers: {
                              'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`,
                            },
                          })
                          if (!response.ok) {
                            const err = await response.json() as { error?: string }
                            throw new Error(err.error || `Fout ${response.status}`)
                          }
                          const data = await response.json() as { products: unknown[] }
                          setProboTestResult({
                            success: true,
                            message: `Verbonden — ${Array.isArray(data.products) ? data.products.length : 0} producten beschikbaar`,
                          })
                        } catch (err) {
                          setProboTestResult({
                            success: false,
                            message: err instanceof Error ? err.message : 'Verbinding mislukt',
                          })
                        } finally {
                          setProboTesting(false)
                        }
                      }}
                      className="gap-1.5"
                    >
                      {proboTesting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Testen...</>
                      ) : (
                        'Verbinding testen'
                      )}
                    </Button>
                    {proboTestResult && (
                      <div className={`flex items-center gap-2 text-xs ${proboTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {proboTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {proboTestResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    if (!user?.id) return
                    setProboSaving(true)
                    try {
                      await updateAppSettings(user.id, {
                        probo_api_key: proboApiKey,
                        probo_enabled: proboEnabled,
                      })
                      toast.success('Probo instellingen opgeslagen')
                    } catch (err) {
                      logger.error('Fout bij opslaan Probo instellingen:', err)
                      toast.error('Kon Probo instellingen niet opslaan')
                    } finally {
                      setProboSaving(false)
                    }
                  }}
                  disabled={proboSaving}
                  size="sm"
                >
                  {proboSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
  { label: 'Offertes', section: 'Verkoop' },
  { label: 'Facturen', section: 'Verkoop' },
  { label: 'Projecten', section: 'Productie' },
  { label: 'Taken', section: 'Productie' },
  { label: 'Montage', section: 'Productie' },
  { label: 'Werkbonnen', section: 'Productie' },
  { label: 'Visualizer', section: 'Productie' },
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
  const { language, setLanguage } = useLanguage()
  const { settings, updateSettings } = useAppSettings()
  const { appThemeId, setAppThemeId, accentId, setAccentId } = usePalette()
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
        <CardDescription>Kies een thema — elk thema heeft zijn eigen kleuren</CardDescription>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        {/* Accent kleur picker */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Accentkleur
              </p>
              <p className="text-xs text-muted-foreground">
                Kies een accentkleur — verandert de sidebar indicator, logo en focus ring
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {ACCENT_PALETTES.map((a) => {
              const isActive = accentId === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setAccentId(a.id)
                    toast.success(`Accent "${a.naam}" geactiveerd`)
                  }}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 transition-all duration-200',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40 hover:shadow-sm'
                  )}
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{ background: a.gradientStart }}
                  />
                  <span className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                    {a.naam}
                  </span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-1" />}
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
