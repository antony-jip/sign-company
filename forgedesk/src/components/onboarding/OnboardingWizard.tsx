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
      <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-6">
        <Building2 className="w-6 h-6 text-neutral-700" />
      </div>
      <h2 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
        Hoe heet je bedrijf?
      </h2>
      <p className="text-[14px] text-neutral-500 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
        Dit verschijnt op je offertes en facturen.
      </p>
      <Input
        value={naam}
        onChange={(e) => setNaam(e.target.value)}
        placeholder="Bijv. Sign Solutions B.V."
        className="h-12 rounded-xl border-neutral-200 bg-white text-center text-[16px] font-medium focus:border-black focus:ring-black mb-6"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && naam.trim()) onNext()
        }}
      />
      <Button
        onClick={onNext}
        disabled={!naam.trim() || isSaving}
        className="h-11 bg-black text-white hover:bg-neutral-800 rounded-xl font-semibold text-[14px] px-8 group"
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

      // Upload to Supabase Storage (only if orgId available)
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
      // Show preview even if upload failed — user can continue
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
      <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-6">
        <Image className="w-6 h-6 text-neutral-700" />
      </div>
      <h2 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
        Upload je bedrijfslogo
      </h2>
      <p className="text-[14px] text-neutral-500 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
        Dit wordt getoond op je offertes en facturen.
      </p>

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 mb-6 transition-colors cursor-pointer ${
          preview ? 'border-emerald-300 bg-emerald-50/50' : 'border-neutral-300 hover:border-neutral-400 bg-white'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 text-neutral-400 animate-spin mx-auto" />
        ) : preview ? (
          <img src={preview} alt="Logo preview" className="w-24 h-24 object-contain mx-auto rounded-lg" />
        ) : (
          <>
            <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
            <p className="text-[13px] text-neutral-600" style={{ fontFamily: 'Inter, sans-serif' }}>
              Sleep je logo hierheen of <span className="text-black font-semibold">klik om te uploaden</span>
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">PNG, JPG, SVG — max 400×400px</p>
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
          className="h-11 rounded-xl border-neutral-300 text-[14px] px-6"
          disabled={isSaving}
        >
          Overslaan
        </Button>
        <Button
          onClick={onNext}
          disabled={!preview || isSaving}
          className="h-11 bg-black text-white hover:bg-neutral-800 rounded-xl font-semibold text-[14px] px-8 group"
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

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-6 h-6 text-neutral-700" />
        </div>
        <h2 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Bedrijfsgegevens
        </h2>
        <p className="text-[14px] text-neutral-500" style={{ fontFamily: 'Inter, sans-serif' }}>
          Deze gegevens komen op je offertes en facturen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1 space-y-1.5">
            <Label className="text-[12.5px] font-medium text-neutral-700">Adres</Label>
            <Input
              value={gegevens.adres}
              onChange={(e) => update('adres', e.target.value)}
              placeholder="Straat + nr"
              className="h-11 rounded-xl border-neutral-200 bg-white text-[13.5px] focus:border-black focus:ring-black"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-neutral-700">Postcode</Label>
            <Input
              value={gegevens.postcode}
              onChange={(e) => update('postcode', e.target.value)}
              placeholder="1234 AB"
              className="h-11 rounded-xl border-neutral-200 bg-white text-[13.5px] focus:border-black focus:ring-black"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-neutral-700">Plaats</Label>
            <Input
              value={gegevens.plaats}
              onChange={(e) => update('plaats', e.target.value)}
              placeholder="Amsterdam"
              className="h-11 rounded-xl border-neutral-200 bg-white text-[13.5px] focus:border-black focus:ring-black"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12.5px] font-medium text-neutral-700">
            <Phone className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            Telefoon
          </Label>
          <Input
            value={gegevens.telefoon}
            onChange={(e) => update('telefoon', e.target.value)}
            placeholder="06-12345678"
            className="h-11 rounded-xl border-neutral-200 bg-white text-[13.5px] focus:border-black focus:ring-black"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-neutral-700">
              KvK-nummer <span className="text-neutral-400 font-normal">Optioneel</span>
            </Label>
            <Input
              value={gegevens.kvk_nummer}
              onChange={(e) => update('kvk_nummer', e.target.value)}
              placeholder="12345678"
              className="h-11 rounded-xl border-neutral-200 bg-white text-[13.5px] focus:border-black focus:ring-black"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-neutral-700">
              BTW-nummer <span className="text-neutral-400 font-normal">Optioneel</span>
            </Label>
            <Input
              value={gegevens.btw_nummer}
              onChange={(e) => update('btw_nummer', e.target.value)}
              placeholder="NL123456789B01"
              className="h-11 rounded-xl border-neutral-200 bg-white text-[13.5px] focus:border-black focus:ring-black"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center mt-8">
        <Button
          onClick={onSkip}
          variant="outline"
          className="h-11 rounded-xl border-neutral-300 text-[14px] px-6"
          disabled={isSaving}
        >
          Overslaan
        </Button>
        <Button
          onClick={onNext}
          disabled={isSaving}
          className="h-11 bg-black text-white hover:bg-neutral-800 rounded-xl font-semibold text-[14px] px-8 group"
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-6">
          <Rocket className="w-6 h-6 text-neutral-700" />
        </div>
        <h2 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Hoe wil je beginnen?
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Zelf beginnen */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-neutral-700" />
            <h3 className="text-[15px] font-bold text-black" style={{ fontFamily: 'Manrope, sans-serif' }}>Zelf beginnen</h3>
          </div>
          <p className="text-[13px] text-neutral-500 mb-5" style={{ fontFamily: 'Inter, sans-serif' }}>
            Voeg je eerste klant toe en ga direct aan de slag.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11.5px] font-medium text-neutral-600">Bedrijfsnaam</Label>
              <Input
                value={klant.bedrijfsnaam}
                onChange={(e) => updateKlant('bedrijfsnaam', e.target.value)}
                placeholder="Naam van je klant"
                className="h-9 rounded-lg border-neutral-200 bg-white text-[13px] focus:border-black focus:ring-black"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px] font-medium text-neutral-600">Contactpersoon</Label>
              <Input
                value={klant.contactpersoon}
                onChange={(e) => updateKlant('contactpersoon', e.target.value)}
                placeholder="Naam contactpersoon"
                className="h-9 rounded-lg border-neutral-200 bg-white text-[13px] focus:border-black focus:ring-black"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11.5px] font-medium text-neutral-600">Email</Label>
                <Input
                  value={klant.email}
                  onChange={(e) => updateKlant('email', e.target.value)}
                  placeholder="email@klant.nl"
                  className="h-9 rounded-lg border-neutral-200 bg-white text-[13px] focus:border-black focus:ring-black"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11.5px] font-medium text-neutral-600">Telefoon</Label>
                <Input
                  value={klant.telefoon}
                  onChange={(e) => updateKlant('telefoon', e.target.value)}
                  placeholder="06-..."
                  className="h-9 rounded-lg border-neutral-200 bg-white text-[13px] focus:border-black focus:ring-black"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={onKlantToevoegen}
            disabled={!klant.bedrijfsnaam.trim() || isSaving}
            className="w-full h-10 mt-4 bg-black text-white hover:bg-neutral-800 rounded-xl font-semibold text-[13px]"
          >
            {savingAction === 'klant' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Klant toevoegen & afronden
          </Button>
        </div>

        {/* Card 2: Met voorbeelddata */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-neutral-700" />
            <h3 className="text-[15px] font-bold text-black" style={{ fontFamily: 'Manrope, sans-serif' }}>Met voorbeelddata</h3>
          </div>
          <p className="text-[13px] text-neutral-500 mb-5" style={{ fontFamily: 'Inter, sans-serif' }}>
            We vullen de app met 3 klanten, een offerte en een project zodat je kunt rondkijken.
          </p>

          <div className="space-y-2 mb-5">
            {[
              { icon: Users, text: '3 voorbeeldklanten' },
              { icon: FileText, text: '1 offerte met regelitems' },
              { icon: Building2, text: '1 project' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-neutral-600" />
                </div>
                <span className="text-[13px] text-neutral-600" style={{ fontFamily: 'Inter, sans-serif' }}>{text}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={onDemoData}
            disabled={isSaving}
            variant="outline"
            className="w-full h-10 rounded-xl border-neutral-300 font-semibold text-[13px]"
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
        className="block mx-auto mt-6 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors"
        style={{ fontFamily: 'Inter, sans-serif' }}
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

      // If no org yet but user exists, find or create one
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
              // User can still go through the wizard, data will be saved when columns exist
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

  // Use localOrgId (which may have been created by the wizard) instead of context organisatieId
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
      // Try saving just the name without onboarding_stap (column may not exist yet)
      try {
        if (effectiveOrgId) await updateOrganisatie(effectiveOrgId, { naam: bedrijfsnaam.trim() })
      } catch {
        // Continue anyway — name save is not critical for flow
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
      // Continue anyway — step tracking is not critical
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
      // Try saving just the business details without onboarding_stap
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
      // Create 3 demo clients
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

      // Create 1 project linked to first client
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

      // Create 1 offerte linked to first client
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

      // Create 3 offerte items
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

      // Create 3 taken
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

  // Skip step 4
  const handleStep4Skip = async () => {
    await finishOnboarding()
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F3F0' }}>
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  const steps = ['Bedrijfsnaam', 'Logo', 'Gegevens', 'Beginnen']

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F4F3F0' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Progress bar */}
      <div className="px-5 pt-6 pb-4">
        <div className="max-w-2xl mx-auto">
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-2">
            {steps.map((label, idx) => (
              <div key={label} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx <= currentStep ? 'bg-black' : 'bg-neutral-200'
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {steps.map((label, idx) => (
              <span
                key={label}
                className={`text-[11px] font-medium transition-colors ${
                  idx <= currentStep ? 'text-black' : 'text-neutral-400'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Back button */}
      {currentStep > 0 && (
        <div className="px-5">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => goToStep(currentStep - 1)}
              className="flex items-center gap-1 text-[13px] text-neutral-500 hover:text-black transition-colors"
              disabled={isSaving}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Vorige
            </button>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full transition-opacity duration-300">
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
