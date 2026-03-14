import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  updateOrganisatie,
  getOrganisatie,
  createOrganisatie,
  getProfile,
  updateProfile,
  createKlant,
  createProject,
  createOfferte,
  createOfferteItem,
  createTaak,
} from '@/services/supabaseService'
import supabase from '@/services/supabaseClient'
import {
  ArrowRight, ArrowLeft, Upload, Image, Loader2,
  Building2, MapPin, Phone, FileText, Users, Package, Rocket, SkipForward
} from 'lucide-react'

// Step accent colors matching the marketing palette
const STEP_COLORS = [
  { bg: 'rgba(126, 181, 166, 0.12)', text: '#7EB5A6' }, // sage
  { bg: 'rgba(232, 134, 106, 0.12)', text: '#E8866A' }, // coral
  { bg: 'rgba(139, 175, 212, 0.12)', text: '#8BAFD4' }, // blue
  { bg: 'rgba(155, 142, 196, 0.12)', text: '#9B8EC4' }, // purple
]

// ============ STEP 1: Company Name ============

function StepBedrijfsnaam({
  naam,
  setNaam,
  onNext,
  isSaving,
}: {
  naam: string
  setNaam: (v: string) => void
  onNext: () => void
  isSaving: boolean
}) {
  return (
    <div className="text-center max-w-md mx-auto">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: STEP_COLORS[0].bg }}
      >
        <Building2 className="w-6 h-6" style={{ color: STEP_COLORS[0].text }} />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2 font-display">
        Hoe heet je bedrijf?
      </h2>
      <p className="text-[14px] text-muted-foreground mb-8">
        Dit verschijnt op je offertes en facturen.
      </p>
      <Input
        value={naam}
        onChange={(e) => setNaam(e.target.value)}
        placeholder="Bijv. Sign Solutions B.V."
        className="h-12 rounded-xl text-center text-[16px] font-medium mb-6"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && naam.trim()) onNext()
        }}
      />
      <Button
        onClick={onNext}
        disabled={!naam.trim() || isSaving}
        className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-[14px] px-8 group"
      >
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Volgende
        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
      </Button>
    </div>
  )
}

// ============ STEP 2: Logo Upload ============

function StepLogo({
  organisatieId,
  onNext,
  onSkip,
  isSaving,
}: {
  organisatieId: string | null
  onNext: () => void
  onSkip: () => void
  isSaving: boolean
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const maxSize = 400
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas niet beschikbaar')); return }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Kon afbeelding niet verwerken'))
        }, 'image/png')
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Ongeldig bestand')) }
      img.src = url
    })
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecteer een afbeelding')
      return
    }
    setUploading(true)
    try {
      const resized = await resizeImage(file)
      const previewUrl = URL.createObjectURL(resized)
      setPreview(previewUrl)

      if (supabase && organisatieId) {
        const path = `logos/${organisatieId}.png`
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(path, resized, { upsert: true, contentType: 'image/png' })
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
        try {
          await updateOrganisatie(organisatieId, { logo_url: urlData.publicUrl, onboarding_stap: 2 })
        } catch {
          await updateOrganisatie(organisatieId, { logo_url: urlData.publicUrl }).catch(() => {})
        }
      }

      toast.success('Logo geüpload!')
    } catch (error: unknown) {
      if (!preview) toast.error(error instanceof Error ? error.message : 'Upload mislukt, je kunt dit later instellen.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="text-center max-w-md mx-auto">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: STEP_COLORS[1].bg }}
      >
        <Image className="w-6 h-6" style={{ color: STEP_COLORS[1].text }} />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2 font-display">
        Upload je bedrijfslogo
      </h2>
      <p className="text-[14px] text-muted-foreground mb-8">
        Dit wordt getoond op je offertes en facturen.
      </p>

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 mb-6 transition-colors cursor-pointer ${
          preview ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-500/10' : 'border-border hover:border-muted-foreground/40 bg-card'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mx-auto" />
        ) : preview ? (
          <img src={preview} alt="Logo preview" className="w-24 h-24 object-contain mx-auto rounded-lg" />
        ) : (
          <>
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-[13px] text-muted-foreground">
              Sleep je logo hierheen of <span className="text-foreground font-semibold">klik om te uploaden</span>
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">PNG, JPG, SVG — max 400×400px</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          onClick={onSkip}
          variant="outline"
          className="h-11 rounded-xl text-[14px] px-6"
          disabled={isSaving}
        >
          Overslaan
        </Button>
        <Button
          onClick={onNext}
          disabled={!preview || isSaving}
          className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-[14px] px-8 group"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Volgende
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  )
}

// ============ STEP 3: Business Details ============

interface BedrijfsgegevensState {
  adres: string
  postcode: string
  plaats: string
  telefoon: string
  kvk_nummer: string
  btw_nummer: string
}

function StepBedrijfsgegevens({
  gegevens,
  setGegevens,
  onNext,
  onSkip,
  isSaving,
}: {
  gegevens: BedrijfsgegevensState
  setGegevens: (v: BedrijfsgegevensState) => void
  onNext: () => void
  onSkip: () => void
  isSaving: boolean
}) {
  const update = (field: keyof BedrijfsgegevensState, value: string) => {
    setGegevens({ ...gegevens, [field]: value })
  }

  const inputClassName = "h-11 rounded-xl text-[13.5px]"

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: STEP_COLORS[2].bg }}
        >
          <MapPin className="w-6 h-6" style={{ color: STEP_COLORS[2].text }} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2 font-display">
          Bedrijfsgegevens
        </h2>
        <p className="text-[14px] text-muted-foreground">
          Deze gegevens komen op je offertes en facturen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1 space-y-1.5">
            <Label className="text-[12.5px] font-medium text-foreground/70">Adres</Label>
            <Input
              value={gegevens.adres}
              onChange={(e) => update('adres', e.target.value)}
              placeholder="Straat + nr"
              className={inputClassName}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-foreground/70">Postcode</Label>
            <Input
              value={gegevens.postcode}
              onChange={(e) => update('postcode', e.target.value)}
              placeholder="1234 AB"
              className={inputClassName}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-foreground/70">Plaats</Label>
            <Input
              value={gegevens.plaats}
              onChange={(e) => update('plaats', e.target.value)}
              placeholder="Amsterdam"
              className={inputClassName}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12.5px] font-medium text-foreground/70">
            <Phone className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            Telefoon
          </Label>
          <Input
            value={gegevens.telefoon}
            onChange={(e) => update('telefoon', e.target.value)}
            placeholder="06-12345678"
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-foreground/70">
              KvK-nummer <span className="text-muted-foreground font-normal">Optioneel</span>
            </Label>
            <Input
              value={gegevens.kvk_nummer}
              onChange={(e) => update('kvk_nummer', e.target.value)}
              placeholder="12345678"
              className={inputClassName}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-foreground/70">
              BTW-nummer <span className="text-muted-foreground font-normal">Optioneel</span>
            </Label>
            <Input
              value={gegevens.btw_nummer}
              onChange={(e) => update('btw_nummer', e.target.value)}
              placeholder="NL123456789B01"
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center mt-8">
        <Button
          onClick={onSkip}
          variant="outline"
          className="h-11 rounded-xl text-[14px] px-6"
          disabled={isSaving}
        >
          Overslaan
        </Button>
        <Button
          onClick={onNext}
          disabled={isSaving}
          className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-[14px] px-8 group"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Volgende
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  )
}

// ============ STEP 4: Get Started ============

interface EersteKlantState {
  bedrijfsnaam: string
  contactpersoon: string
  email: string
  telefoon: string
}

function StepBeginnen({
  klant,
  setKlant,
  onKlantToevoegen,
  onDemoData,
  onSkip,
  isSaving,
  savingAction,
}: {
  klant: EersteKlantState
  setKlant: (v: EersteKlantState) => void
  onKlantToevoegen: () => void
  onDemoData: () => void
  onSkip: () => void
  isSaving: boolean
  savingAction: 'klant' | 'demo' | null
}) {
  const updateKlant = (field: keyof EersteKlantState, value: string) => {
    setKlant({ ...klant, [field]: value })
  }

  const inputClassName = "h-9 rounded-lg text-[13px]"

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: STEP_COLORS[3].bg }}
        >
          <Rocket className="w-6 h-6" style={{ color: STEP_COLORS[3].text }} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2 font-display">
          Hoe wil je beginnen?
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Zelf beginnen */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5" style={{ color: '#7EB5A6' }} />
            <h3 className="text-[15px] font-bold text-foreground font-display">Zelf beginnen</h3>
          </div>
          <p className="text-[13px] text-muted-foreground mb-5">
            Voeg je eerste klant toe en ga direct aan de slag.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11.5px] font-medium text-foreground/60">Bedrijfsnaam</Label>
              <Input
                value={klant.bedrijfsnaam}
                onChange={(e) => updateKlant('bedrijfsnaam', e.target.value)}
                placeholder="Naam van je klant"
                className={inputClassName}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px] font-medium text-foreground/60">Contactpersoon</Label>
              <Input
                value={klant.contactpersoon}
                onChange={(e) => updateKlant('contactpersoon', e.target.value)}
                placeholder="Naam contactpersoon"
                className={inputClassName}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11.5px] font-medium text-foreground/60">Email</Label>
                <Input
                  value={klant.email}
                  onChange={(e) => updateKlant('email', e.target.value)}
                  placeholder="email@klant.nl"
                  className={inputClassName}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11.5px] font-medium text-foreground/60">Telefoon</Label>
                <Input
                  value={klant.telefoon}
                  onChange={(e) => updateKlant('telefoon', e.target.value)}
                  placeholder="06-..."
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={onKlantToevoegen}
            disabled={!klant.bedrijfsnaam.trim() || isSaving}
            className="w-full h-10 mt-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-[13px]"
          >
            {savingAction === 'klant' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Klant toevoegen & afronden
          </Button>
        </div>

        {/* Card 2: Met voorbeelddata */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5" style={{ color: '#E8866A' }} />
            <h3 className="text-[15px] font-bold text-foreground font-display">Met voorbeelddata</h3>
          </div>
          <p className="text-[13px] text-muted-foreground mb-5">
            We vullen de app met 3 klanten, een offerte en een project zodat je kunt rondkijken.
          </p>

          <div className="space-y-2 mb-5">
            {[
              { icon: Users, text: '3 voorbeeldklanten', color: '#8BAFD4' },
              { icon: FileText, text: '1 offerte met regelitems', color: '#9B8EC4' },
              { icon: Building2, text: '1 project', color: '#7EB5A6' },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <span className="text-[13px] text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={onDemoData}
            disabled={isSaving}
            variant="outline"
            className="w-full h-10 rounded-xl font-semibold text-[13px]"
          >
            {savingAction === 'demo' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Voorbeelddata laden
          </Button>
        </div>
      </div>

      {/* Skip link */}
      <button
        onClick={onSkip}
        disabled={isSaving}
        className="block mx-auto mt-6 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <SkipForward className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
        Overslaan — ik kijk later wel rond
      </button>
    </div>
  )
}

// ============ MAIN WIZARD ============

export function OnboardingWizard() {
  const navigate = useNavigate()
  const { organisatieId, user } = useAuth()
  const [localOrgId, setLocalOrgId] = useState<string | null>(organisatieId)
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [savingAction, setSavingAction] = useState<'klant' | 'demo' | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Step 1 state
  const [bedrijfsnaam, setBedrijfsnaam] = useState('')
  // Step 3 state
  const [gegevens, setGegevens] = useState<BedrijfsgegevensState>({
    adres: '', postcode: '', plaats: '', telefoon: '', kvk_nummer: '', btw_nummer: ''
  })
  // Step 4 state
  const [eersteKlant, setEersteKlant] = useState<EersteKlantState>({
    bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: ''
  })

  // Keep localOrgId in sync with context
  useEffect(() => {
    if (organisatieId) setLocalOrgId(organisatieId)
  }, [organisatieId])

  // Ensure organisation exists, then resume at correct step
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      let orgId = organisatieId

      if (!orgId && user?.id) {
        try {
          const profile = await getProfile(user.id)
          if (profile?.organisatie_id) {
            orgId = profile.organisatie_id
          } else {
            try {
              const org = await createOrganisatie('Mijn Bedrijf', user.id)
              await updateProfile(user.id, { organisatie_id: org.id, rol: 'admin' } as Parameters<typeof updateProfile>[1])
              orgId = org.id
            } catch {
              // createOrganisatie may fail if onboarding columns don't exist yet
            }
          }
          if (!cancelled && orgId) setLocalOrgId(orgId)
        } catch {
          // Continue without org
        }
      }

      if (!orgId) {
        if (!cancelled) setIsLoaded(true)
        return
      }

      try {
        const org = await getOrganisatie(orgId)
        if (org && !cancelled) {
          if (org.onboarding_stap && org.onboarding_stap > 0) {
            setCurrentStep(Math.min(org.onboarding_stap, 3))
          }
          if (org.naam && org.naam !== 'Mijn Bedrijf') setBedrijfsnaam(org.naam)
          if (org.adres) setGegevens((prev) => ({ ...prev, adres: org.adres || '' }))
          if (org.postcode) setGegevens((prev) => ({ ...prev, postcode: org.postcode || '' }))
          if (org.plaats) setGegevens((prev) => ({ ...prev, plaats: org.plaats || '' }))
          if (org.telefoon) setGegevens((prev) => ({ ...prev, telefoon: org.telefoon || '' }))
          if (org.kvk_nummer) setGegevens((prev) => ({ ...prev, kvk_nummer: org.kvk_nummer || '' }))
          if (org.btw_nummer) setGegevens((prev) => ({ ...prev, btw_nummer: org.btw_nummer || '' }))
        }
      } catch {
        // Continue anyway
      }
      if (!cancelled) setIsLoaded(true)
    }
    init()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisatieId, user?.id])

  const effectiveOrgId = localOrgId || organisatieId

  const goToStep = useCallback(async (step: number) => {
    setCurrentStep(step)
  }, [])

  const finishOnboarding = useCallback(async () => {
    const orgId = localOrgId || organisatieId
    if (!orgId) {
      navigate('/')
      return
    }
    try {
      await updateOrganisatie(orgId, { onboarding_compleet: true, onboarding_stap: 4 })
    } catch {
      try {
        await updateOrganisatie(orgId, { onboarding_compleet: true })
      } catch {
        // Continue to dashboard anyway
      }
    }
    navigate('/')
  }, [localOrgId, organisatieId, navigate])

  // Step 1 handler
  const handleStep1Next = async () => {
    if (!bedrijfsnaam.trim()) return
    setIsSaving(true)
    try {
      if (effectiveOrgId) {
        await updateOrganisatie(effectiveOrgId, { naam: bedrijfsnaam.trim(), onboarding_stap: 1 })
      }
    } catch {
      try {
        if (effectiveOrgId) await updateOrganisatie(effectiveOrgId, { naam: bedrijfsnaam.trim() })
      } catch {
        // Continue anyway
      }
    } finally {
      setIsSaving(false)
      goToStep(1)
    }
  }

  // Step 2 handlers
  const handleStep2Next = async () => {
    setIsSaving(true)
    try {
      if (effectiveOrgId) await updateOrganisatie(effectiveOrgId, { onboarding_stap: 2 })
    } catch {
      // Continue anyway
    } finally {
      setIsSaving(false)
      goToStep(2)
    }
  }

  const handleStep2Skip = async () => {
    setIsSaving(true)
    try {
      if (effectiveOrgId) await updateOrganisatie(effectiveOrgId, { onboarding_stap: 2 })
    } catch {
      // Continue anyway
    } finally {
      setIsSaving(false)
      goToStep(2)
    }
  }

  // Step 3 handlers
  const handleStep3Next = async () => {
    setIsSaving(true)
    try {
      if (effectiveOrgId) {
        await updateOrganisatie(effectiveOrgId, {
          adres: gegevens.adres,
          postcode: gegevens.postcode,
          plaats: gegevens.plaats,
          telefoon: gegevens.telefoon,
          kvk_nummer: gegevens.kvk_nummer,
          btw_nummer: gegevens.btw_nummer,
          onboarding_stap: 3,
        })
      }
    } catch {
      try {
        if (effectiveOrgId) {
          await updateOrganisatie(effectiveOrgId, {
            adres: gegevens.adres,
            postcode: gegevens.postcode,
            plaats: gegevens.plaats,
            telefoon: gegevens.telefoon,
            kvk_nummer: gegevens.kvk_nummer,
            btw_nummer: gegevens.btw_nummer,
          })
        }
      } catch {
        // Continue anyway
      }
    } finally {
      setIsSaving(false)
      goToStep(3)
    }
  }

  const handleStep3Skip = async () => {
    setIsSaving(true)
    try {
      if (effectiveOrgId) await updateOrganisatie(effectiveOrgId, { onboarding_stap: 3 })
    } catch {
      // Continue
    } finally {
      setIsSaving(false)
      goToStep(3)
    }
  }

  // Step 4: Add first client
  const handleAddKlant = async () => {
    if (!user?.id || !eersteKlant.bedrijfsnaam.trim()) return
    setIsSaving(true)
    setSavingAction('klant')
    try {
      await createKlant({
        user_id: user.id,
        bedrijfsnaam: eersteKlant.bedrijfsnaam.trim(),
        contactpersoon: eersteKlant.contactpersoon,
        email: eersteKlant.email,
        telefoon: eersteKlant.telefoon,
        adres: '', postcode: '', stad: '', land: 'Nederland',
        website: '', kvk_nummer: '', btw_nummer: '',
        status: 'actief', tags: [], notities: '', contactpersonen: [],
      })
      toast.success('Klant toegevoegd!')
      await finishOnboarding()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Klant toevoegen mislukt')
    } finally {
      setIsSaving(false)
      setSavingAction(null)
    }
  }

  // Step 4: Load demo data
  const handleDemoData = async () => {
    if (!user?.id) return
    setIsSaving(true)
    setSavingAction('demo')
    try {
      const klant1 = await createKlant({
        user_id: user.id,
        bedrijfsnaam: 'Bakkerij De Gouden Korenaar',
        contactpersoon: 'Jan Bakker',
        email: 'jan@goudenkorenaar.nl',
        telefoon: '020-1234567',
        adres: 'Hoofdstraat 12', postcode: '1012 AB', stad: 'Amsterdam', land: 'Nederland',
        website: '', kvk_nummer: '', btw_nummer: '',
        status: 'actief', tags: [], notities: '', contactpersonen: [],
        is_demo_data: true,
      } as Parameters<typeof createKlant>[0])

      await createKlant({
        user_id: user.id,
        bedrijfsnaam: 'Installatiebedrijf Jansen',
        contactpersoon: 'Pieter Jansen',
        email: 'info@jansen-installatie.nl',
        telefoon: '010-7654321',
        adres: 'Industrieweg 8', postcode: '3012 CD', stad: 'Rotterdam', land: 'Nederland',
        website: '', kvk_nummer: '', btw_nummer: '',
        status: 'actief', tags: [], notities: '', contactpersonen: [],
        is_demo_data: true,
      } as Parameters<typeof createKlant>[0])

      await createKlant({
        user_id: user.id,
        bedrijfsnaam: 'Restaurant Het Anker',
        contactpersoon: 'Lisa van Dijk',
        email: 'info@hetanker.nl',
        telefoon: '030-9876543',
        adres: 'Havenstraat 3', postcode: '3511 AA', stad: 'Utrecht', land: 'Nederland',
        website: '', kvk_nummer: '', btw_nummer: '',
        status: 'actief', tags: [], notities: '', contactpersonen: [],
        is_demo_data: true,
      } as Parameters<typeof createKlant>[0])

      await createProject({
        user_id: user.id,
        klant_id: klant1.id,
        naam: 'Gevelreclame Bakkerij',
        beschrijving: 'Ontwerp en montage van gevelletters voor Bakkerij De Gouden Korenaar',
        status: 'actief',
        prioriteit: 'medium',
        budget: 1800,
        besteed: 0,
        voortgang: 0,
        team_leden: [],
        is_demo_data: true,
      } as Parameters<typeof createProject>[0])

      const offerte = await createOfferte({
        user_id: user.id,
        klant_id: klant1.id,
        klant_naam: 'Bakkerij De Gouden Korenaar',
        nummer: 'OFF-2024-001',
        titel: 'Offerte gevelletters',
        status: 'concept',
        subtotaal: 1800,
        btw_bedrag: 378,
        totaal: 2178,
        geldig_tot: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notities: '',
        voorwaarden: '',
        is_demo_data: true,
      } as Parameters<typeof createOfferte>[0])

      await createOfferteItem({
        user_id: user.id,
        offerte_id: offerte.id,
        beschrijving: 'Gevelletters RVS',
        aantal: 1,
        eenheidsprijs: 1200,
        btw_percentage: 21,
        korting_percentage: 0,
        totaal: 1200,
        volgorde: 1,
      })

      await createOfferteItem({
        user_id: user.id,
        offerte_id: offerte.id,
        beschrijving: 'Montage',
        aantal: 1,
        eenheidsprijs: 450,
        btw_percentage: 21,
        korting_percentage: 0,
        totaal: 450,
        volgorde: 2,
      })

      await createOfferteItem({
        user_id: user.id,
        offerte_id: offerte.id,
        beschrijving: 'Transport',
        aantal: 1,
        eenheidsprijs: 150,
        btw_percentage: 21,
        korting_percentage: 0,
        totaal: 150,
        volgorde: 3,
      })

      const taakBase = {
        user_id: user.id,
        prioriteit: 'medium' as const,
        status: 'todo' as const,
        beschrijving: '',
        toegewezen_aan: '',
        geschatte_tijd: 0,
        bestede_tijd: 0,
        is_demo_data: true,
      }

      await createTaak({ ...taakBase, titel: 'Ontwerp goedkeuren' } as Parameters<typeof createTaak>[0])
      await createTaak({ ...taakBase, titel: 'Materiaal bestellen' } as Parameters<typeof createTaak>[0])
      await createTaak({ ...taakBase, titel: 'Montage inplannen' } as Parameters<typeof createTaak>[0])

      toast.success('Voorbeelddata geladen!')
      await finishOnboarding()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Voorbeelddata laden mislukt')
    } finally {
      setIsSaving(false)
      setSavingAction(null)
    }
  }

  const handleStep4Skip = async () => {
    await finishOnboarding()
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const steps = ['Bedrijfsnaam', 'Logo', 'Gegevens', 'Beginnen']

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{
      background: `
        radial-gradient(ellipse 80% 60% at 20% 10%, ${STEP_COLORS[currentStep].text}18 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 85% 30%, #E8866A14 0%, transparent 55%),
        radial-gradient(ellipse 70% 50% at 50% 90%, #9B8EC412 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 10% 70%, #7EB5A610 0%, transparent 50%),
        radial-gradient(ellipse 40% 35% at 75% 80%, #C4A88210 0%, transparent 45%),
        hsl(var(--background))
      `,
      transition: 'background 0.8s ease'
    }}>
      {/* Animated accent orbs */}
      <div className="absolute top-[-120px] right-[-60px] w-[500px] h-[500px] rounded-full blur-[100px] opacity-25 pointer-events-none transition-all duration-1000" style={{ background: `linear-gradient(135deg, ${STEP_COLORS[currentStep].text}, ${STEP_COLORS[(currentStep + 1) % 4].text})` }} />
      <div className="absolute bottom-[-100px] left-[-80px] w-[400px] h-[400px] rounded-full blur-[90px] opacity-20 pointer-events-none transition-all duration-1000" style={{ background: `linear-gradient(225deg, #E8866A, #9B8EC4)` }} />
      <div className="absolute top-[40%] left-[60%] w-[250px] h-[250px] rounded-full blur-[80px] opacity-15 pointer-events-none transition-all duration-1000" style={{ background: STEP_COLORS[(currentStep + 2) % 4].text }} />

      {/* Header with logo + progress */}
      <div className="px-5 pt-6 pb-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
              </svg>
            </div>
            <span className="text-[15px] font-extrabold tracking-[-0.04em] font-display">
              FORGE<span className="font-medium text-muted-foreground">desk</span>
            </span>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-2">
            {steps.map((label, idx) => (
              <div key={label} className="flex-1">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: idx <= currentStep
                      ? STEP_COLORS[currentStep].text
                      : 'hsl(var(--muted))'
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {steps.map((label, idx) => (
              <span
                key={label}
                className={`text-[11px] font-medium transition-colors ${
                  idx <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Back button */}
      {currentStep > 0 && (
        <div className="px-5 relative z-10">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => goToStep(currentStep - 1)}
              className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              disabled={isSaving}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Vorige
            </button>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-5 relative z-10">
        <div className="w-full transition-opacity duration-300 bg-card/60 backdrop-blur-xl rounded-3xl border border-border/50 shadow-[0_8px_40px_rgba(0,0,0,0.04)] max-w-3xl mx-auto p-8 sm:p-12">
          {currentStep === 0 && (
            <StepBedrijfsnaam
              naam={bedrijfsnaam}
              setNaam={setBedrijfsnaam}
              onNext={handleStep1Next}
              isSaving={isSaving}
            />
          )}
          {currentStep === 1 && (
            <StepLogo
              organisatieId={effectiveOrgId}
              onNext={handleStep2Next}
              onSkip={handleStep2Skip}
              isSaving={isSaving}
            />
          )}
          {currentStep === 2 && (
            <StepBedrijfsgegevens
              gegevens={gegevens}
              setGegevens={setGegevens}
              onNext={handleStep3Next}
              onSkip={handleStep3Skip}
              isSaving={isSaving}
            />
          )}
          {currentStep === 3 && (
            <StepBeginnen
              klant={eersteKlant}
              setKlant={setEersteKlant}
              onKlantToevoegen={handleAddKlant}
              onDemoData={handleDemoData}
              onSkip={handleStep4Skip}
              isSaving={isSaving}
              savingAction={savingAction}
            />
          )}
        </div>
      </div>
    </div>
  )
}
