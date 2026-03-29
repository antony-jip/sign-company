import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
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
import { Loader2, ArrowLeft, ArrowRight, Layers, Sparkles } from 'lucide-react'
import { logger } from '../../utils/logger'

// ── Spectrum Progress Strip ─────────────────────────────────────────────

const SEGMENT_COLORS: [string, string, string][] = [
  ['#F15025', '#F15025', '#F15025'],               // Stap 1: flame
  ['#D4453A', '#9A4070', '#6A5A8A'],               // Stap 2: warm midden
  ['#3A6B8C', '#2D6B48', '#1A535C'],               // Stap 3: tot petrol
]

function OnboardingProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex gap-1" style={{ padding: '0 2px' }}>
      {SEGMENT_COLORS.map((colors, idx) => {
        const isActive = idx <= currentStep
        const gradient = isActive
          ? `linear-gradient(90deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`
          : undefined
        return (
          <div
            key={idx}
            className="flex-1 transition-all duration-500"
            style={{
              height: 5,
              borderRadius: 3,
              background: isActive ? gradient : '#E6E4E0',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Step 1: Bedrijfsgegevens ────────────────────────────────────────────

interface BedrijfsgegevensState {
  naam: string
  kvk_nummer: string
  btw_nummer: string
  adres: string
  postcode: string
  plaats: string
  email: string
  telefoon: string
}

function StepBedrijfsgegevens({
  gegevens,
  setGegevens,
  onNext,
  isSaving,
}: {
  gegevens: BedrijfsgegevensState
  setGegevens: (v: BedrijfsgegevensState) => void
  onNext: () => void
  isSaving: boolean
}) {
  const update = (field: keyof BedrijfsgegevensState, value: string) => {
    setGegevens({ ...gegevens, [field]: value })
  }

  return (
    <div style={{ maxWidth: 480 }} className="mx-auto w-full">
      <div
        className="rounded-xl"
        style={{
          backgroundColor: '#FFFFFF',
          border: '0.5px solid #E6E4E0',
          padding: '28px 32px',
        }}
      >
        {/* Step indicator */}
        <p
          className="uppercase"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '1.5px',
            color: '#A0A098',
            marginBottom: 8,
          }}
        >
          Stap 1 van 3
        </p>

        {/* Title */}
        <h2
          className="font-heading"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#191919',
            letterSpacing: '-0.8px',
            marginBottom: 4,
          }}
        >
          Je bedrijf.
        </h2>

        {/* Subtitle */}
        <p style={{ fontSize: 13, color: '#5A5A55', marginBottom: 24, lineHeight: 1.5 }}>
          Vul je bedrijfsgegevens in. Dit komt op je offertes en facturen.
        </p>

        {/* Fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label style={{ fontSize: 11, fontWeight: 500, color: '#5A5A55' }}>Bedrijfsnaam</Label>
            <Input
              value={gegevens.naam}
              onChange={(e) => update('naam', e.target.value)}
              placeholder="Jouw Bedrijf B.V."
              autoFocus
              className="focus:ring-0"
              style={{
                height: 40,
                borderRadius: 6,
                backgroundColor: '#FAFAF8',
                border: '0.5px solid #E6E4E0',
                fontSize: 13,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 500, color: '#5A5A55' }}>
                KVK-nummer <span style={{ color: '#A0A098', fontWeight: 400 }}>optioneel</span>
              </Label>
              <Input
                value={gegevens.kvk_nummer}
                onChange={(e) => update('kvk_nummer', e.target.value)}
                placeholder="12345678"
                className="font-mono focus:ring-0"
                style={{
                  height: 40,
                  borderRadius: 6,
                  backgroundColor: '#FAFAF8',
                  border: '0.5px solid #E6E4E0',
                  fontSize: 13,
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 500, color: '#5A5A55' }}>
                BTW-nummer <span style={{ color: '#A0A098', fontWeight: 400 }}>optioneel</span>
              </Label>
              <Input
                value={gegevens.btw_nummer}
                onChange={(e) => update('btw_nummer', e.target.value)}
                placeholder="NL123456789B01"
                className="font-mono focus:ring-0"
                style={{
                  height: 40,
                  borderRadius: 6,
                  backgroundColor: '#FAFAF8',
                  border: '0.5px solid #E6E4E0',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ fontSize: 11, fontWeight: 500, color: '#5A5A55' }}>Adres</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={gegevens.adres}
                onChange={(e) => update('adres', e.target.value)}
                placeholder="Straat + nr"
                className="focus:ring-0"
                style={{
                  height: 40,
                  borderRadius: 6,
                  backgroundColor: '#FAFAF8',
                  border: '0.5px solid #E6E4E0',
                  fontSize: 13,
                }}
              />
              <Input
                value={gegevens.postcode}
                onChange={(e) => update('postcode', e.target.value)}
                placeholder="1234 AB"
                className="focus:ring-0"
                style={{
                  height: 40,
                  borderRadius: 6,
                  backgroundColor: '#FAFAF8',
                  border: '0.5px solid #E6E4E0',
                  fontSize: 13,
                }}
              />
              <Input
                value={gegevens.plaats}
                onChange={(e) => update('plaats', e.target.value)}
                placeholder="Plaats"
                className="focus:ring-0"
                style={{
                  height: 40,
                  borderRadius: 6,
                  backgroundColor: '#FAFAF8',
                  border: '0.5px solid #E6E4E0',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 500, color: '#5A5A55' }}>Email</Label>
              <Input
                value={gegevens.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="info@jouwbedrijf.nl"
                className="focus:ring-0"
                style={{
                  height: 40,
                  borderRadius: 6,
                  backgroundColor: '#FAFAF8',
                  border: '0.5px solid #E6E4E0',
                  fontSize: 13,
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 500, color: '#5A5A55' }}>Telefoon</Label>
              <Input
                value={gegevens.telefoon}
                onChange={(e) => update('telefoon', e.target.value)}
                placeholder="06-12345678"
                className="font-mono focus:ring-0"
                style={{
                  height: 40,
                  borderRadius: 6,
                  backgroundColor: '#FAFAF8',
                  border: '0.5px solid #E6E4E0',
                  fontSize: 13,
                }}
              />
            </div>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={onNext}
          disabled={!gegevens.naam.trim() || isSaving}
          className="w-full flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 hover:opacity-90 active:scale-[0.98] mt-6"
          style={{
            height: 42,
            borderRadius: 6,
            backgroundColor: '#1A535C',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Volgende
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Hoe wil je beginnen? ────────────────────────────────────────

function StepBeginnen({
  keuze,
  setKeuze,
  onNext,
  onBack,
  isSaving,
}: {
  keuze: 'schoon' | 'demo' | null
  setKeuze: (v: 'schoon' | 'demo') => void
  onNext: () => void
  onBack: () => void
  isSaving: boolean
}) {
  return (
    <div style={{ maxWidth: 480 }} className="mx-auto w-full">
      <div
        className="rounded-xl"
        style={{
          backgroundColor: '#FFFFFF',
          border: '0.5px solid #E6E4E0',
          padding: '28px 32px',
        }}
      >
        {/* Step indicator */}
        <p
          className="uppercase"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '1.5px',
            color: '#A0A098',
            marginBottom: 8,
          }}
        >
          Stap 2 van 3
        </p>

        <h2
          className="font-heading"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#191919',
            letterSpacing: '-0.8px',
            marginBottom: 4,
          }}
        >
          Hoe wil je beginnen?
        </h2>

        <p style={{ fontSize: 13, color: '#5A5A55', marginBottom: 24, lineHeight: 1.5 }}>
          Je kunt altijd later nog data importeren of verwijderen.
        </p>

        {/* Option cards */}
        <div className="space-y-3">
          <button
            onClick={() => setKeuze('schoon')}
            className="w-full text-left rounded-[10px] px-5 py-4 transition-all"
            style={{
              backgroundColor: keuze === 'schoon' ? '#E2F0F0' : '#FFFFFF',
              border: `1.5px solid ${keuze === 'schoon' ? '#1A535C' : '#E6E4E0'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 flex-shrink-0" style={{ color: keuze === 'schoon' ? '#1A535C' : '#A0A098' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#191919' }}>Schone lei</p>
                <p style={{ fontSize: 12, color: '#5A5A55', marginTop: 2 }}>Leeg beginnen, alles zelf invoeren</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setKeuze('demo')}
            className="w-full text-left rounded-[10px] px-5 py-4 transition-all"
            style={{
              backgroundColor: keuze === 'demo' ? '#E2F0F0' : '#FFFFFF',
              border: `1.5px solid ${keuze === 'demo' ? '#1A535C' : '#E6E4E0'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: keuze === 'demo' ? '#1A535C' : '#A0A098' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#191919' }}>Demo data</p>
                <p style={{ fontSize: 12, color: '#5A5A55', marginTop: 2 }}>Voorbeeldklanten en offertes om te verkennen</p>
              </div>
            </div>
          </button>
        </div>

        {/* Import link */}
        <p className="text-center mt-4">
          <button
            className="transition-colors hover:opacity-70"
            style={{ fontSize: 11, color: '#A0A098', textDecoration: 'underline' }}
            onClick={() => {
              // Future: open import dialog
              toast('Importeren is binnenkort beschikbaar.')
            }}
          >
            Ik heb een Excel bestand om te importeren
          </button>
        </p>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onBack}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 transition-opacity hover:opacity-70"
            style={{
              height: 42,
              borderRadius: 6,
              backgroundColor: 'transparent',
              border: '0.5px solid #E6E4E0',
              color: '#5A5A55',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </button>
          <button
            onClick={onNext}
            disabled={!keuze || isSaving}
            className="flex-1 flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 hover:opacity-90 active:scale-[0.98]"
            style={{
              height: 42,
              borderRadius: 6,
              backgroundColor: '#1A535C',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Volgende
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Klaar ───────────────────────────────────────────────────────

function StepKlaar({
  onFinish,
  isSaving,
}: {
  onFinish: () => void
  isSaving: boolean
}) {
  return (
    <div style={{ maxWidth: 480 }} className="mx-auto w-full">
      <div
        className="rounded-xl"
        style={{
          backgroundColor: '#FFFFFF',
          border: '0.5px solid #E6E4E0',
          padding: '28px 32px',
        }}
      >
        {/* Step indicator */}
        <p
          className="uppercase"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '1.5px',
            color: '#A0A098',
            marginBottom: 8,
          }}
        >
          Stap 3 van 3
        </p>

        <h2
          className="font-heading"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#191919',
            letterSpacing: '-0.8px',
            marginBottom: 4,
          }}
        >
          Klaar.
        </h2>

        <p style={{ fontSize: 13, color: '#5A5A55', marginBottom: 24, lineHeight: 1.5 }}>
          Je account is ingericht. Begin met je eerste klant of offerte.
        </p>

        <button
          onClick={onFinish}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 hover:opacity-90 active:scale-[0.98]"
          style={{
            height: 42,
            borderRadius: 6,
            backgroundColor: '#1A535C',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Aan de slag
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Main Wizard ─────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const navigate = useNavigate()
  const { organisatieId, user } = useAuth()
  const [localOrgId, setLocalOrgId] = useState<string | null>(organisatieId)
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Step 1 state
  const [gegevens, setGegevens] = useState<BedrijfsgegevensState>({
    naam: '', kvk_nummer: '', btw_nummer: '', adres: '', postcode: '', plaats: '', email: '', telefoon: '',
  })

  // Step 2 state
  const [startKeuze, setStartKeuze] = useState<'schoon' | 'demo' | null>(null)

  // Keep localOrgId in sync
  useEffect(() => {
    if (organisatieId) setLocalOrgId(organisatieId)
  }, [organisatieId])

  // Ensure org exists and resume at correct step
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
            } catch (err) {
              logger.error('Create organisatie:', err)
            }
          }
          if (!cancelled && orgId) setLocalOrgId(orgId)
        } catch (err) {
          logger.error('Fetch profile voor onboarding:', err)
        }
      }

      if (!orgId) {
        if (!cancelled) setIsLoaded(true)
        return
      }

      try {
        const org = await getOrganisatie(orgId)
        if (org && !cancelled) {
          // Map old 4-step progress to new 3-step:
          // old 0-1 → new 0, old 2 → new 0, old 3 → new 1
          if (org.onboarding_stap && org.onboarding_stap >= 3) {
            setCurrentStep(1) // was on "begin" step → map to step 2
          }
          if (org.naam && org.naam !== 'Mijn Bedrijf') {
            setGegevens(prev => ({ ...prev, naam: org.naam || '' }))
          }
          if (org.adres) setGegevens(prev => ({ ...prev, adres: org.adres || '' }))
          if (org.postcode) setGegevens(prev => ({ ...prev, postcode: org.postcode || '' }))
          if (org.plaats) setGegevens(prev => ({ ...prev, plaats: org.plaats || '' }))
          if (org.telefoon) setGegevens(prev => ({ ...prev, telefoon: org.telefoon || '' }))
          if (org.kvk_nummer) setGegevens(prev => ({ ...prev, kvk_nummer: org.kvk_nummer || '' }))
          if (org.btw_nummer) setGegevens(prev => ({ ...prev, btw_nummer: org.btw_nummer || '' }))
        }
      } catch (err) {
        logger.error('Fetch organisatie voor onboarding:', err)
      }
      if (!cancelled) setIsLoaded(true)
    }
    init()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisatieId, user?.id])

  const effectiveOrgId = localOrgId || organisatieId

  const finishOnboarding = useCallback(async () => {
    const orgId = localOrgId || organisatieId
    if (!orgId) {
      navigate('/')
      return
    }
    try {
      await updateOrganisatie(orgId, { onboarding_compleet: true, onboarding_stap: 4 })
    } catch (err) {
      logger.error('Update organisatie onboarding compleet:', err)
      try {
        await updateOrganisatie(orgId, { onboarding_compleet: true })
      } catch (err) {
        logger.error('Update organisatie onboarding fallback:', err)
      }
    }
    navigate('/')
  }, [localOrgId, organisatieId, navigate])

  // Step 1 → save bedrijfsgegevens and go to step 2
  const handleStep1Next = async () => {
    if (!gegevens.naam.trim()) return
    setIsSaving(true)
    try {
      if (effectiveOrgId) {
        await updateOrganisatie(effectiveOrgId, {
          naam: gegevens.naam.trim(),
          adres: gegevens.adres,
          postcode: gegevens.postcode,
          plaats: gegevens.plaats,
          telefoon: gegevens.telefoon,
          kvk_nummer: gegevens.kvk_nummer,
          btw_nummer: gegevens.btw_nummer,
          onboarding_stap: 1,
        })
      }
    } catch (err) {
      logger.error('Update organisatie stap 1:', err)
      try {
        if (effectiveOrgId) {
          await updateOrganisatie(effectiveOrgId, {
            naam: gegevens.naam.trim(),
            adres: gegevens.adres,
            postcode: gegevens.postcode,
            plaats: gegevens.plaats,
            telefoon: gegevens.telefoon,
            kvk_nummer: gegevens.kvk_nummer,
            btw_nummer: gegevens.btw_nummer,
          })
        }
      } catch (err) {
        logger.error('Update organisatie stap 1 fallback:', err)
      }
    } finally {
      setIsSaving(false)
      setCurrentStep(1)
    }
  }

  // Step 2 → load demo data if chosen, then go to step 3
  const handleStep2Next = async () => {
    if (!startKeuze) return
    setIsSaving(true)

    try {
      if (startKeuze === 'demo' && user?.id) {
        // Create demo data
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
          aantal: 1, eenheidsprijs: 1200, btw_percentage: 21, korting_percentage: 0, totaal: 1200, volgorde: 1,
        })
        await createOfferteItem({
          user_id: user.id,
          offerte_id: offerte.id,
          beschrijving: 'Montage',
          aantal: 1, eenheidsprijs: 450, btw_percentage: 21, korting_percentage: 0, totaal: 450, volgorde: 2,
        })
        await createOfferteItem({
          user_id: user.id,
          offerte_id: offerte.id,
          beschrijving: 'Transport',
          aantal: 1, eenheidsprijs: 150, btw_percentage: 21, korting_percentage: 0, totaal: 150, volgorde: 3,
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
      }

      // Update onboarding step
      if (effectiveOrgId) {
        try {
          await updateOrganisatie(effectiveOrgId, { onboarding_stap: 3 })
        } catch (err) {
          logger.error('Update onboarding stap:', err)
        }
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Er ging iets mis')
    } finally {
      setIsSaving(false)
      setCurrentStep(2)
    }
  }

  // Step 3 → finish
  const handleFinish = async () => {
    setIsSaving(true)
    await finishOnboarding()
    setIsSaving(false)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAF8' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#A0A098' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAFAF8' }}>
      {/* Spectrum progress strip */}
      <div className="px-5 pt-6 pb-4">
        <div style={{ maxWidth: 480 }} className="mx-auto">
          <OnboardingProgress currentStep={currentStep} />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full transition-opacity duration-300">
          {currentStep === 0 && (
            <StepBedrijfsgegevens
              gegevens={gegevens}
              setGegevens={setGegevens}
              onNext={handleStep1Next}
              isSaving={isSaving}
            />
          )}
          {currentStep === 1 && (
            <StepBeginnen
              keuze={startKeuze}
              setKeuze={setStartKeuze}
              onNext={handleStep2Next}
              onBack={() => setCurrentStep(0)}
              isSaving={isSaving}
            />
          )}
          {currentStep === 2 && (
            <StepKlaar
              onFinish={handleFinish}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  )
}
