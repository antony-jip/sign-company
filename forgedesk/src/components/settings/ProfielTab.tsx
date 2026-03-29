import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Camera } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getProfile, updateProfile } from '@/services/supabaseService'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { SubTabNav } from './SubTabNav'
import type { SubTab } from './settingsShared'

const PROFIEL_TABS: SubTab[] = [
  { id: 'gegevens', label: 'Gegevens', icon: User },
  { id: 'foto', label: 'Profielfoto', icon: Camera },
]

export function ProfielTab() {
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
      toast.success('Opgeslagen.')
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
                <Input id="email" value={email} readOnly disabled className="bg-background dark:bg-muted cursor-not-allowed" />
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
                className="relative w-24 h-24 rounded-full bg-muted dark:bg-muted border-2 border-dashed border-border dark:border-border flex items-center justify-center cursor-pointer group overflow-hidden hover:border-primary/50 transition-colors"
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
