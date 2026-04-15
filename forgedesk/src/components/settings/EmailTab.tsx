import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
  Mail,
  Lock,
  Server,
  Info,
  ExternalLink,
  FileText,
  Users,
  ImageIcon,
  X,
  Minus,
  Plus,
  Loader2,
  UserCircle,
  Trash2,
  Send,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getProfile, getAppSettings, updateAppSettings, getMedewerkers, updateMedewerker } from '@/services/supabaseService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import { sendEmail } from '@/services/gmailService'
import { factuurHerinneringTemplate } from '@/services/emailTemplateService'
import { uploadFile, downloadFile } from '@/services/storageService'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import type { Medewerker } from '@/types'
import { SubTabNav } from './SubTabNav'
import type { SubTab } from './settingsShared'
import { EmailSettings, DEFAULT_EMAIL_SETTINGS, EMAIL_PROVIDER_DEFAULTS } from './settingsShared'
import type { EmailProvider } from './settingsShared'

const EMAIL_TABS: SubTab[] = [
  { id: 'handtekening', label: 'Handtekening', icon: FileText },
  { id: 'teamleden', label: 'Team Handtekeningen', icon: Users },
  { id: 'verbinding', label: 'Verbinding', icon: Server },
  { id: 'algemeen', label: 'Algemeen', icon: Mail },
]

export function EmailTemplatesSubTab() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState<string | null>(null)

  const [herinnering1, setHerinnering1] = useState('')
  const [herinnering1Onderwerp, setHerinnering1Onderwerp] = useState('Herinnering: Factuur {factuur_nummer}')
  const [herinnering2, setHerinnering2] = useState('')
  const [herinnering2Onderwerp, setHerinnering2Onderwerp] = useState('2e herinnering: Factuur {factuur_nummer}')
  const [aanmaningTekst, setAanmaningTekst] = useState('')
  const [aanmaningOnderwerp, setAanmaningOnderwerp] = useState('Aanmaning: Factuur {factuur_nummer}')

  useEffect(() => {
    if (!user?.id) return
    getAppSettings(user.id).then((data) => {
      setHerinnering1(data.herinnering_1_tekst || '')
      setHerinnering1Onderwerp(data.herinnering_1_onderwerp || 'Herinnering: Factuur {factuur_nummer}')
      setHerinnering2(data.herinnering_2_tekst || '')
      setHerinnering2Onderwerp(data.herinnering_2_onderwerp || '2e herinnering: Factuur {factuur_nummer}')
      setAanmaningTekst(data.aanmaning_tekst || '')
      setAanmaningOnderwerp(data.aanmaning_onderwerp || 'Aanmaning: Factuur {factuur_nummer}')
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      await updateAppSettings(user.id, {
        herinnering_1_tekst: herinnering1,
        herinnering_1_onderwerp: herinnering1Onderwerp,
        herinnering_2_tekst: herinnering2,
        herinnering_2_onderwerp: herinnering2Onderwerp,
        aanmaning_tekst: aanmaningTekst,
        aanmaning_onderwerp: aanmaningOnderwerp,
      })
      toast.success('Templates opgeslagen.')
    } catch (err) {
      logger.error('Fout bij opslaan templates:', err)
      toast.error('Kon templates niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async (key: string, onderwerp: string, inhoud: string, placeholder: string) => {
    if (!user?.id || !user?.email) return
    setIsSendingTest(key)
    try {
      const p = await getProfile(user.id)
      const vars: Record<string, string> = {
        klant_naam: 'Jan de Vries',
        factuur_nummer: 'FAC-2026-0001',
        factuur_bedrag: '€ 1.250,00',
        vervaldatum: '15 maart 2026',
        dagen_verlopen: '7',
        bedrijfsnaam: p?.bedrijfsnaam || 'Uw Bedrijf',
        betaal_link: `${window.location.origin}/betalen/test-voorbeeld`,
      }
      const replaceVars = (s: string) => Object.entries(vars).reduce((r, [k, v]) => r.replace(new RegExp(`\\{${k}\\}`, 'g'), v), s)
      const sub = replaceVars(onderwerp)
      const body = replaceVars(inhoud || placeholder)
      const { html } = factuurHerinneringTemplate({
        klantNaam: vars.klant_naam,
        factuurNummer: vars.factuur_nummer,
        factuurTitel: 'Voorbeeld factuur',
        totaalBedrag: vars.factuur_bedrag,
        vervaldatum: vars.vervaldatum,
        dagenVervallen: 7,
        bedrijfsnaam: vars.bedrijfsnaam,
        logoUrl: p?.logo_url || undefined,
        betaalUrl: vars.betaal_link,
      })
      await sendEmail(user.email, `[TEST] ${sub}`, body, { html })
      toast.success(`Testmail verstuurd naar ${user.email}`)
    } catch (err) {
      logger.error('Fout bij versturen testmail:', err)
      toast.error('Kon testmail niet versturen — controleer je email instellingen')
    } finally {
      setIsSendingTest(null)
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  const templates = [
    { key: 'h1', label: 'Herinnering 1', onderwerp: herinnering1Onderwerp, setOnderwerp: setHerinnering1Onderwerp, inhoud: herinnering1, setInhoud: setHerinnering1, placeholder: 'Bijv. Wellicht is het u ontgaan, maar wij hebben nog geen betaling ontvangen voor factuur {factuur_nummer}.' },
    { key: 'h2', label: 'Herinnering 2', onderwerp: herinnering2Onderwerp, setOnderwerp: setHerinnering2Onderwerp, inhoud: herinnering2, setInhoud: setHerinnering2, placeholder: 'Bijv. Ondanks onze eerdere herinnering hebben wij nog geen betaling ontvangen voor factuur {factuur_nummer}.' },
    { key: 'aanmaning', label: 'Aanmaning', onderwerp: aanmaningOnderwerp, setOnderwerp: setAanmaningOnderwerp, inhoud: aanmaningTekst, setInhoud: setAanmaningTekst, placeholder: 'Bijv. Indien wij binnen 7 dagen geen betaling ontvangen voor factuur {factuur_nummer}, zijn wij genoodzaakt verdere stappen te ondernemen.' },
  ] as const

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Betalingsherinneringen
          </CardTitle>
          <CardDescription>
            Email templates voor factuur herinneringen en aanmaningen. Verstuurd via je eigen email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/50 px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Beschikbare variabelen:</p>
            <div className="flex flex-wrap gap-1.5">
              {['{klant_naam}', '{factuur_nummer}', '{factuur_bedrag}', '{vervaldatum}', '{dagen_verlopen}', '{bedrijfsnaam}', '{betaal_link}'].map((v) => (
                <code key={v} className="rounded bg-background px-1.5 py-0.5 text-xs font-mono border">{v}</code>
              ))}
            </div>
          </div>
          {templates.map((t) => (
            <div key={t.key} className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t.label}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  disabled={isSendingTest === t.key}
                  onClick={() => handleSendTest(t.key, t.onderwerp, t.inhoud, t.placeholder)}
                >
                  {isSendingTest === t.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Testmail
                </Button>
              </div>
              <Input value={t.onderwerp} onChange={(e) => t.setOnderwerp(e.target.value)} placeholder="Onderwerp" className="text-xs h-8" />
              <Textarea value={t.inhoud} onChange={(e) => t.setInhoud(e.target.value)} placeholder={t.placeholder} rows={2} className="text-xs" />
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        Offerte opvolging templates worden apart beheerd onder <strong>Offertes → Opvolging</strong>.
        Portaal email templates staan onder <strong>Integraties → Portaal</strong>.
      </p>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
    </div>
  )
}

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
            <div className="relative border border-border rounded-lg p-2 bg-card">
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
      <Label className="text-xs uppercase tracking-label text-muted-foreground">Voorbeeld</Label>
      <div className="border border-border rounded-lg p-4 bg-card space-y-3">
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

export function EmailTab() {
  const { user, isAdmin } = useAuth()
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
      toast.success('Opgeslagen.')
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

  // Email connection settings — lifted to EmailTab so they survive sub-tab switches
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(DEFAULT_EMAIL_SETTINGS)
  const [emailConnected, setEmailConnected] = useState(false)

  const checkEmailStatus = useCallback(() => {
    setEmailConnected(!!emailSettings.gmail_address && !!emailSettings.app_password)
  }, [emailSettings])

  // Load email settings from Supabase (or sessionStorage cache) on mount
  useEffect(() => {
    async function loadEmailSettings() {
      // 1. Try sessionStorage cache first (fast)
      try {
        const cached = sessionStorage.getItem('doen_email_settings')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.gmail_address && parsed.app_password) {
            setEmailSettings(prev => ({ ...prev, ...parsed }))
            setEmailConnected(true)
          }
        }
      } catch (err) { /* ignore */ }

      // 2. Load from API endpoint (source of truth, handles decryption server-side)
      try {
        const { loadEmailSettingsFromDb } = await import('@/services/gmailService')
        const dbSettings = await loadEmailSettingsFromDb()
        if (dbSettings?.gmail_address) {
          const merged = {
            ...DEFAULT_EMAIL_SETTINGS,
            ...dbSettings,
            smtp_encryption: 'TLS' as const,
            accept_self_signed: false,
          }
          setEmailSettings(merged)
          setEmailConnected(true)
          // Update cache
          sessionStorage.setItem('doen_email_settings', JSON.stringify(merged))
        }
      } catch (err) {
        console.error('Email settings laden mislukt:', err)
      }
    }
    loadEmailSettings()
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
                  : 'Configureer SMTP en IMAP om e-mails te verzenden en ontvangen vanuit doen.'}
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
          <EmailSettingsInline
            onSaved={checkEmailStatus}
            settings={emailSettings}
            setSettings={setEmailSettings}
            isConnected={emailConnected}
          />
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
                    toast.success('Opgeslagen.')
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

function EmailSettingsInline({
  onSaved,
  settings,
  setSettings,
  isConnected,
}: {
  onSaved: () => void
  settings: EmailSettings
  setSettings: (s: EmailSettings) => void
  isConnected: boolean
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [provider, setProvider] = useState<EmailProvider>(
    settings.smtp_host.includes('office365') || settings.smtp_host.includes('outlook') ? 'outlook'
    : settings.smtp_host.includes('gmail') || !settings.smtp_host ? 'gmail'
    : 'overig'
  )

  const handleProviderChange = (p: EmailProvider) => {
    setProvider(p)
    const defaults = EMAIL_PROVIDER_DEFAULTS[p]
    setSettings({ ...settings, ...defaults })
  }

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
      // Save via API endpoint (server-side encryptie, supabaseAdmin bypass RLS)
      const { saveEmailSettingsToDb, clearEmailCache } = await import('@/services/gmailService')
      await saveEmailSettingsToDb({
        gmail_address: settings.gmail_address,
        app_password: settings.app_password,
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        imap_host: settings.imap_host,
        imap_port: settings.imap_port,
      })

      // Wis de cache van de vorige mailbox zodat de inbox-view alleen nog
      // mails van het zojuist gekoppelde adres toont.
      await clearEmailCache()

      // Cache in sessionStorage for quick loads
      sessionStorage.setItem('doen_email_settings', JSON.stringify(settings))

      setSuccess('E-mailinstellingen opgeslagen!')
      onSaved()
    } catch (err: unknown) {
      setError(`Opslaan mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`)
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
        parts.push(result.imap_ok ? 'IMAP: OK' : 'IMAP: Mislukt')
        parts.push(result.smtp_ok ? 'SMTP: OK' : 'SMTP: Mislukt')
        const msg = parts.join(' | ')
        setError(result.error ? `${msg}. ${result.error}` : msg)
      }
    } catch (err: unknown) {
      setError(`Test mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`)
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { deleteEmailSettingsFromDb, clearEmailCache } = await import('@/services/gmailService')
        await deleteEmailSettingsFromDb()
        await clearEmailCache()
      }
    } catch (err) { /* ignore */ }
    sessionStorage.removeItem('doen_email_settings')
    localStorage.removeItem('doen_email_settings')
    setSettings(DEFAULT_EMAIL_SETTINGS)
    setSuccess('')
    setError('')
    onSaved()
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 bg-[#F15025]/10 dark:bg-[#F15025]/20 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-[#F15025]" />
          </div>
          E-mail Instellingen
        </CardTitle>
        <CardDescription>
          Configureer SMTP (verzenden) en IMAP (ontvangen) om e-mails te beheren vanuit doen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Provider keuze */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">E-mail provider</Label>
            <div className="flex gap-2">
              {([['gmail', 'Gmail'], ['outlook', 'Outlook / Microsoft 365'], ['overig', 'Overig']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleProviderChange(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${provider === key ? 'bg-[#1A535C] text-white border-[#1A535C]' : 'bg-white text-[#6B6B66] border-[#EBEBEB] hover:border-[#1A535C]/30'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* SMTP Server */}
          <div className="space-y-2">
            <Label htmlFor="smtp_host" className="flex items-center gap-2 text-sm font-medium">
              <Server className="w-3.5 h-3.5 text-muted-foreground" />
              SMTP Serveradres
            </Label>
            <Input
              id="smtp_host"
              placeholder={provider === 'outlook' ? 'smtp.office365.com' : 'smtp.gmail.com'}
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
              placeholder={provider === 'outlook' ? 'outlook.office365.com' : 'imap.gmail.com'}
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

          {/* Provider-specifieke instructies */}
          {provider === 'gmail' && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-medium">Gmail instellen</p>
                  <p>
                    Gebruik een <strong>App Wachtwoord</strong> in plaats van je gewone wachtwoord.
                    Ga naar{' '}
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
                      Google App Wachtwoorden <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    om er een aan te maken. 2FA moet ingeschakeld zijn.
                  </p>
                </div>
              </div>
            </div>
          )}
          {provider === 'outlook' && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-medium">Outlook / Microsoft 365 instellen</p>
                  <p>
                    Gebruik een <strong>App Wachtwoord</strong>. Ga naar{' '}
                    <a href="https://account.live.com/proofs/AppPassword" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
                      Microsoft App Wachtwoorden <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    om er een aan te maken. 2FA moet ingeschakeld zijn.
                  </p>
                  <p>
                    Voor <strong>Microsoft 365 zakelijk</strong>: je beheerder moet SMTP AUTH inschakelen.
                    Ga naar Admin Center &rarr; Users &rarr; Mail &rarr; "Authenticated SMTP".
                  </p>
                </div>
              </div>
            </div>
          )}

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
              <Button variant="ghost" onClick={handleDisconnect} className="gap-2 text-[#F15025] hover:text-[#F15025]/80 hover:bg-[#F15025]/5">
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
