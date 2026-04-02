import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Phone, CreditCard, Upload, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getProfile, updateProfile } from '@/services/supabaseService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import supabase from '@/services/supabaseClient'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { confirm } from '@/components/shared/ConfirmDialog'
import { SubTabNav } from './SubTabNav'
import type { SubTab } from './settingsShared'

const BEDRIJF_TABS: SubTab[] = [
  { id: 'algemeen', label: 'Algemeen', icon: Building2 },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'financieel', label: 'Financieel', icon: CreditCard },
]

export function BedrijfTab() {
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
        logo_url: logoPreview || '',
      })
      await refreshProfile()
      toast.success('Opgeslagen.')
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
        <Card className="border-border/50 rounded-xl">
          <CardContent className="space-y-6 pt-6">
            {bedrijfsnaam && (
              <h2 className="text-[18px] font-bold tracking-[-0.03em] font-display text-foreground">
                {bedrijfsnaam}
              </h2>
            )}

            <div className="flex items-center gap-6">
              <div
                className="relative w-32 h-20 rounded-lg bg-[#F4F2EE] dark:bg-muted border-2 border-dashed border-[#E6E4E0] dark:border-border flex items-center justify-center cursor-pointer group overflow-hidden hover:border-[#1A535C]/50 transition-colors"
                onClick={handleLogoClick}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center text-[#A0A098]">
                    <Upload className="w-6 h-6" />
                    <span className="text-2xs mt-1">Logo</span>
                  </div>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground dark:text-white">Bedrijfslogo</p>
                <p className="text-xs text-[#A0A098] mt-1">Upload uw bedrijfslogo. PNG of SVG aanbevolen.</p>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLogoPreview('') }}
                    className="text-xs text-[#C03A18] hover:underline mt-1"
                  >
                    Logo verwijderen
                  </button>
                )}
                <p className="text-[10px] text-[#9B9B95] mt-2">Als je een logo hebt, wordt de bedrijfsnaam niet in de email header getoond.</p>
              </div>
            </div>

            <div className="border-t border-[#E6E4E0] dark:border-border" style={{ margin: '24px 0', borderWidth: '0.5px' }} />

            <div className="space-y-1.5">
              <label htmlFor="bedrijfsnaam" className="text-[11px] text-[#A0A098] block">Bedrijfsnaam</label>
              <Input id="bedrijfsnaam" value={bedrijfsnaam} onChange={(e) => setBedrijfsnaam(e.target.value)} className="bg-[#F4F2EE] dark:bg-muted border-[#E6E4E0] rounded-lg focus-visible:ring-[#1A535C]" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="adres" className="text-[11px] text-[#A0A098] block">Adres</label>
              <Input id="adres" value={adres} onChange={(e) => setAdres(e.target.value)} className="bg-[#F4F2EE] dark:bg-muted border-[#E6E4E0] rounded-lg focus-visible:ring-[#1A535C]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="postcode" className="text-[11px] text-[#A0A098] block">Postcode</label>
                <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} className="bg-[#F4F2EE] dark:bg-muted border-[#E6E4E0] rounded-lg focus-visible:ring-[#1A535C] font-mono" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="stad" className="text-[11px] text-[#A0A098] block">Stad</label>
                <Input id="stad" value={stad} onChange={(e) => setStad(e.target.value)} className="bg-[#F4F2EE] dark:bg-muted border-[#E6E4E0] rounded-lg focus-visible:ring-[#1A535C]" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving || isLoading} className="bg-[#1A535C] hover:bg-[#1A535C]/90 text-white">{isSaving ? 'Opslaan...' : 'Opslaan'}</Button>
            </div>
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
        <Card className="border-border/50 rounded-xl">
          <CardHeader>
            <CardTitle className="text-[20px] font-bold font-display tracking-[-0.03em]">Juridisch &amp; Financieel</CardTitle>
            <CardDescription className="text-[13px]">Deze gegevens worden weergegeven op facturen en offertes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="kvk" className="text-[11px] text-[#A0A098] block">KvK Nummer</label>
                <Input id="kvk" value={kvkNummer} onChange={(e) => setKvkNummer(e.target.value)} placeholder="12345678" className="font-mono bg-[#F4F2EE] dark:bg-muted border-[#E6E4E0] rounded-lg focus-visible:ring-[#1A535C]" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="btw" className="text-[11px] text-[#A0A098] block">BTW Nummer</label>
                <Input id="btw" value={btwNummer} onChange={(e) => setBtwNummer(e.target.value)} placeholder="NL123456789B01" className="font-mono bg-[#F4F2EE] dark:bg-muted border-[#E6E4E0] rounded-lg focus-visible:ring-[#1A535C]" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="iban" className="text-[11px] text-[#A0A098] block">IBAN</label>
                <Input id="iban" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="NL00 BANK 0123 4567 89" className="font-mono bg-[#F4F2EE] dark:bg-muted border-[#E6E4E0] rounded-lg focus-visible:ring-[#1A535C]" />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={handleSave} disabled={isSaving || isLoading} className="bg-[#1A535C] hover:bg-[#1A535C]/90 text-white">{isSaving ? 'Opslaan...' : 'Opslaan'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DemoDataSection />
    </>
  )
}

function DemoDataSection() {
  const { user } = useAuth()
  const [hasDemoData, setHasDemoData] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured() || !supabase) {
      setChecked(true)
      return
    }
    supabase
      .from('klanten')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_demo_data', true)
      .then(({ count }) => {
        setHasDemoData((count ?? 0) > 0)
        setChecked(true)
      })
  }, [user?.id])

  if (!checked || !hasDemoData) return null

  const handleDelete = async () => {
    if (!user?.id || !supabase) return
    if (!await confirm({ message: 'Weet je zeker dat je alle voorbeelddata wilt verwijderen? Dit kan niet ongedaan worden.', variant: 'destructive', confirmLabel: 'Verwijderen' })) return

    setIsDeleting(true)
    try {
      await supabase.from('taken').delete().eq('user_id', user.id).eq('is_demo_data', true)

      const { data: demoOffertes } = await supabase
        .from('offertes')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_demo_data', true)
      const demoOfferteIds = (demoOffertes || []).map((o: { id: string }) => o.id)

      if (demoOfferteIds.length > 0) {
        await supabase.from('offerte_items').delete().in('offerte_id', demoOfferteIds)
      }

      await supabase.from('offertes').delete().eq('user_id', user.id).eq('is_demo_data', true)

      await supabase.from('projecten').delete().eq('user_id', user.id).eq('is_demo_data', true)

      await supabase.from('klanten').delete().eq('user_id', user.id).eq('is_demo_data', true)

      toast.success('Voorbeelddata verwijderd')
      setHasDemoData(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Verwijderen mislukt')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-[#F15025]/20 dark:border-[#F15025]/30 mt-6 rounded-xl">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Voorbeelddata</h3>
            <p className="text-sm text-muted-foreground">
              Er staat nog voorbeelddata in je account van de onboarding.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="border-[#F15025]/30 text-[#F15025] hover:bg-[#F15025]/5 dark:border-[#F15025]/40 dark:text-[#F15025] dark:hover:bg-[#F15025]/10 flex-shrink-0"
          >
            {isDeleting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
            Verwijderen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
