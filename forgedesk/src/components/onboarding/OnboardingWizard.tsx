import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  updateOrganisatie,
  getOrganisatie,
  getProfile,
  createKlant,
  createProject,
  createOfferte,
  createOfferteItem,
  createTaak,
} from '@/services/supabaseService'
import { Loader2, ArrowLeft, ArrowRight, Layers, Sparkles } from 'lucide-react'
import { logger } from '../../utils/logger'
import { ParticleField } from './ParticleField'

const MONO = { fontFamily: '"DM Mono", ui-monospace, monospace' } as const

// ── Wordmark ────────────────────────────────────────────────────────────

function Wordmark() {
  return (
    <div className="inline-flex items-baseline gap-[1px] font-heading">
      <span className="text-[17px] font-bold tracking-tight text-ink">doen</span>
      <motion.span
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
        className="text-[17px] font-bold text-flame leading-none"
      >
        .
      </motion.span>
    </div>
  )
}

// ── Progress (01 · 02 · 03) ─────────────────────────────────────────────

function OnboardingProgress({ currentStep }: { currentStep: number }) {
  return (
    <div
      className="flex items-center gap-2 text-[11px] uppercase tracking-wider"
      style={MONO}
    >
      {[0, 1, 2].map((idx) => (
        <span key={idx} className="flex items-center gap-2">
          <span
            className={
              idx === currentStep
                ? 'text-flame font-semibold'
                : idx < currentStep
                  ? 'text-ink/50'
                  : 'text-muted-hex'
            }
          >
            0{idx + 1}
          </span>
          {idx < 2 && <span className="text-muted-hex/50">·</span>}
        </span>
      ))}
    </div>
  )
}

// ── Shared step-shell ───────────────────────────────────────────────────

const stepTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: 'easeOut' as const },
}

const inputClass =
  'h-10 rounded-lg bg-white/60 border border-sand text-[13px] focus:ring-0 focus:border-petrol transition-colors'

const labelStyle = {
  fontSize: 11,
  fontWeight: 500,
  color: '#5A5A55',
  letterSpacing: '0.02em',
} as const

const stepLabelClass =
  'text-[11px] uppercase tracking-wider text-muted-hex mb-3 block'

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480 }} className="mx-auto w-full">
      <motion.div
        {...stepTransition}
        className="rounded-xl bg-white p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
      >
        {children}
      </motion.div>
    </div>
  )
}

function StepHeading({
  label,
  heading,
  punctuation,
  subtitle,
}: {
  label: string
  heading: string
  punctuation: string
  subtitle: string
}) {
  return (
    <>
      <span className={stepLabelClass} style={MONO}>
        {label}
      </span>
      <h2
        className="font-heading text-ink mb-1"
        style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.15 }}
      >
        {heading}
        <span className="text-flame">{punctuation}</span>
      </h2>
      <p className="text-[13px] text-text-sec mb-6" style={{ lineHeight: 1.55 }}>
        {subtitle}
      </p>
    </>
  )
}

function PrimaryButton({
  onClick,
  disabled,
  isSaving,
  children,
  className = '',
}: {
  onClick: () => void
  disabled?: boolean
  isSaving: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isSaving}
      className={`h-11 px-5 rounded-lg bg-flame hover:bg-flame-text disabled:opacity-40 text-white font-semibold text-[13px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group ${className}`}
    >
      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
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
    <StepCard>
      <StepHeading
        label="Stap 1 van 3"
        heading="Je bedrijf"
        punctuation="."
        subtitle="Vul je bedrijfsgegevens in. Dit komt op je offertes en facturen."
      />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label style={labelStyle}>Bedrijfsnaam</Label>
          <Input
            value={gegevens.naam}
            onChange={(e) => update('naam', e.target.value)}
            placeholder="Jouw Bedrijf B.V."
            autoFocus
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label style={labelStyle}>
              KVK-nummer{' '}
              <span style={{ color: '#A0A098', fontWeight: 400 }}>optioneel</span>
            </Label>
            <Input
              value={gegevens.kvk_nummer}
              onChange={(e) => update('kvk_nummer', e.target.value)}
              placeholder="12345678"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="space-y-1.5">
            <Label style={labelStyle}>
              BTW-nummer{' '}
              <span style={{ color: '#A0A098', fontWeight: 400 }}>optioneel</span>
            </Label>
            <Input
              value={gegevens.btw_nummer}
              onChange={(e) => update('btw_nummer', e.target.value)}
              placeholder="NL123456789B01"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label style={labelStyle}>Adres</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={gegevens.adres}
              onChange={(e) => update('adres', e.target.value)}
              placeholder="Straat + nr"
              className={inputClass}
            />
            <Input
              value={gegevens.postcode}
              onChange={(e) => update('postcode', e.target.value)}
              placeholder="1234 AB"
              className={inputClass}
            />
            <Input
              value={gegevens.plaats}
              onChange={(e) => update('plaats', e.target.value)}
              placeholder="Plaats"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label style={labelStyle}>Email</Label>
            <Input
              value={gegevens.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="info@jouwbedrijf.nl"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label style={labelStyle}>Telefoon</Label>
            <Input
              value={gegevens.telefoon}
              onChange={(e) => update('telefoon', e.target.value)}
              placeholder="06-12345678"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>
      </div>

      <PrimaryButton
        onClick={onNext}
        disabled={!gegevens.naam.trim()}
        isSaving={isSaving}
        className="w-full mt-8"
      >
        Volgende
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </PrimaryButton>
    </StepCard>
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
  const options = [
    {
      id: 'schoon' as const,
      Icon: Layers,
      title: 'Schone lei',
      description: 'Leeg beginnen, alles zelf invoeren',
    },
    {
      id: 'demo' as const,
      Icon: Sparkles,
      title: 'Demo data',
      description: 'Voorbeeldklanten en offertes om te verkennen',
    },
  ]

  return (
    <StepCard>
      <StepHeading
        label="Stap 2 van 3"
        heading="Hoe wil je beginnen"
        punctuation="?"
        subtitle="Je kunt altijd later nog data importeren of verwijderen."
      />

      <div className="space-y-2.5">
        {options.map(({ id, Icon, title, description }) => {
          const selected = keuze === id
          return (
            <button
              key={id}
              onClick={() => setKeuze(id)}
              className={`w-full text-left rounded-lg px-5 py-4 flex items-center gap-3 transition-all ${
                selected
                  ? 'bg-petrol-light border-petrol border'
                  : 'bg-white border border-sand hover:border-petrol/40'
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${selected ? 'text-petrol' : 'text-muted-hex'}`}
                strokeWidth={1.75}
              />
              <div>
                <p className="text-[14px] font-semibold text-ink">{title}</p>
                <p className="text-[12px] text-text-sec mt-0.5">{description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-center mt-4">
        <button
          className="text-[11px] uppercase tracking-wider text-muted-hex hover:text-ink transition-colors"
          style={MONO}
          onClick={() => toast('Importeren is binnenkort beschikbaar.')}
        >
          Ik heb een Excel bestand om te importeren
        </button>
      </p>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          disabled={isSaving}
          className="h-11 px-5 flex-1 rounded-lg bg-transparent border border-sand text-text-sec hover:border-text-sec text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>
        <PrimaryButton
          onClick={onNext}
          disabled={!keuze}
          isSaving={isSaving}
          className="flex-1"
        >
          Volgende
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </PrimaryButton>
      </div>
    </StepCard>
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
    <StepCard>
      <StepHeading
        label="Stap 3 van 3"
        heading="Klaar"
        punctuation="."
        subtitle="Je account is ingericht. Begin met je eerste klant of offerte."
      />

      <PrimaryButton
        onClick={onFinish}
        isSaving={isSaving}
        className="w-full mt-2"
      >
        Aan de slag
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </PrimaryButton>
    </StepCard>
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
            logger.error('Onboarding: profile zonder organisatie_id', { userId: user.id })
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
          const dbStap = org.onboarding_stap ?? 0
          if (dbStap >= 4 || org.onboarding_compleet) {
            setCurrentStep(2)
          } else if (dbStap >= 3) {
            setCurrentStep(2)
          } else if (dbStap >= 1) {
            setCurrentStep(1)
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
      <div className="relative min-h-screen flex items-center justify-center bg-[#F8F7F5] overflow-hidden">
        <ParticleField />
        <Loader2 className="relative z-10 w-6 h-6 animate-spin text-muted-hex" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F8F7F5] overflow-hidden">
      <ParticleField />

      <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4">
        <Wordmark />
        <OnboardingProgress currentStep={currentStep} />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-5">
        <div className="w-full">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <div key="step-0">
                <StepBedrijfsgegevens
                  gegevens={gegevens}
                  setGegevens={setGegevens}
                  onNext={handleStep1Next}
                  isSaving={isSaving}
                />
              </div>
            )}
            {currentStep === 1 && (
              <div key="step-1">
                <StepBeginnen
                  keuze={startKeuze}
                  setKeuze={setStartKeuze}
                  onNext={handleStep2Next}
                  onBack={() => setCurrentStep(0)}
                  isSaving={isSaving}
                />
              </div>
            )}
            {currentStep === 2 && (
              <div key="step-2">
                <StepKlaar
                  onFinish={handleFinish}
                  isSaving={isSaving}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
