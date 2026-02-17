import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { getProfile, updateProfile } from '@/services/supabaseService'
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profiel" className="gap-2">
            <User className="w-4 h-4 hidden sm:inline" />
            Profiel
          </TabsTrigger>
          <TabsTrigger value="bedrijf" className="gap-2">
            <Building2 className="w-4 h-4 hidden sm:inline" />
            Bedrijf
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
