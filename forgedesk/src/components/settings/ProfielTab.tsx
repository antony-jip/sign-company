import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getProfile, updateProfile } from '@/services/supabaseService'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'

export function ProfielTab() {
  const { user } = useAuth()
  const { refreshProfile } = useAppSettings()
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [functie, setFunctie] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
  )
}
