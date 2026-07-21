import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Home,
  Users,
  FileText,
  Receipt,
  Package,
  Palette,
  Puzzle,
  Shield,
  Mail,
  Monitor,
  Sliders,
  CreditCard,
  Calculator,
  Save,
  LayoutGrid,
  PanelLeft,
  Link2,
  BookOpen,
  Percent,
  Tag,
  Sparkles,
  Building2,
  Image,
  Upload,
  Search,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getAppSettings, updateAppSettings } from '@/services/supabaseService'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '../../utils/logger'
import { DEFAULT_OFFERTE_VOORWAARDEN } from '@/utils/defaults'

// Already-extracted tab components
import { HuisstijlTab } from './HuisstijlTab'
import { CalculatieTab } from './CalculatieTab'
import { ForgieTab } from './ForgieTab'
import { confirm } from '@/components/shared/ConfirmDialog'
import { PortaalTab } from './PortaalTab'
import { SidebarTab } from './SidebarTab'
import { TeamledenTab } from './TeamledenTab'
import { AbonnementTab } from './AbonnementTab'
import { GeneralLedgerSettings } from '../financial/GeneralLedgerSettings'
import { VATCodesSettings } from '../financial/VATCodesSettings'
import { DiscountsSettings } from '../financial/DiscountsSettings'
import { KostenplaatsenTab } from './KostenplaatsenTab'
import { KennisbankTab } from './KennisbankTab'
import { ChangelogPage } from '../changelog/ChangelogPage'
import { DataImportPage } from '../import/DataImportPage'

function ImportTab() {
  return <DataImportPage />
}

// Newly-extracted tab components
import { ProfielTab } from './ProfielTab'
import { BedrijfTab } from './BedrijfTab'
import { EmailTab } from './EmailTab'
import { IntegratiesTab } from './IntegratiesTab'
import { BeveiligingTab } from './BeveiligingTab'
import { WeergaveTab } from './WeergaveTab'
import { InkoopfactuurInboxSetup } from '../inkoopfacturen/InkoopfactuurInboxSetup'

// Communicatie supertab (achter feature flag doen_communicatie_tab_enabled)
import { CommunicatieTab } from './communicatie/CommunicatieTab'
import { OfferteOpvolgingSubTab } from './communicatie/OfferteOpvolgingSubTab'
import { FactuurOpvolgingSubTab } from './communicatie/FactuurOpvolgingSubTab'
import { MessageSquare } from 'lucide-react'

// Shared
import { SubTabNav } from './SubTabNav'
import type { SubTab } from './settingsShared'

// ─── Settings navigation ───

interface SettingsSection {
  id: string
  label: string
  icon: React.ElementType
  tabs: { id: string; label: string; icon: React.ElementType }[]
}

interface SettingsGroup {
  id: string
  label: string
  sections: SettingsSection[]
}

// Gegroepeerd op wat de gebruiker komt doen, niet op welke module het raakt.
// De tab-id's zijn bewust ongewijzigd: daar hangen alle ?tab=-deeplinks aan.
const settingsGroups: SettingsGroup[] = [
  { id: 'account', label: 'Account', sections: [
    { id: 'algemeen', label: 'Profiel', icon: Home, tabs: [
      { id: 'profiel', label: 'Profiel', icon: FileText },
      { id: 'weergave', label: 'Voorkeuren', icon: Sliders },
    ]},
    { id: 'financieel', label: 'Abonnement', icon: CreditCard, tabs: [
      { id: 'abonnement', label: 'Abonnement', icon: CreditCard },
    ]},
    { id: 'apparaten', label: 'Beveiliging', icon: Shield, tabs: [
      { id: 'beveiliging', label: 'Beveiliging', icon: Shield },
    ]},
  ]},
  { id: 'bedrijf', label: 'Bedrijf', sections: [
    { id: 'bedrijfsgegevens', label: 'Bedrijfsgegevens', icon: Building2, tabs: [
      { id: 'bedrijf', label: 'Bedrijfsgegevens', icon: Building2 },
    ]},
    { id: 'gebruikers', label: 'Team', icon: Users, tabs: [
      { id: 'teamleden', label: 'Teamleden', icon: Users },
    ]},
    { id: 'boekhouding', label: 'Boekhouding', icon: BookOpen, tabs: [
      { id: 'grootboek', label: 'Grootboekrekening', icon: BookOpen },
      { id: 'btw-codes', label: 'BTW Codes', icon: Percent },
      { id: 'kortingen', label: 'Kortingen', icon: Tag },
      // Bestond als compleet beheerscherm maar hing nergens in de navigatie,
      // terwijl FactuurEditor de tabel wel uitleest.
      { id: 'kostenplaatsen', label: 'Kostenplaatsen', icon: LayoutGrid },
    ]},
  ]},
  { id: 'werk', label: 'Werk', sections: [
    { id: 'offertes', label: 'Offertes', icon: FileText, tabs: [
      { id: 'calculatie', label: 'Calculatie', icon: Calculator },
      { id: 'offerte-opvolging', label: 'Opvolging', icon: MessageSquare },
    ]},
    // De opvolg-editors zaten achter de Communicatie-feature-vlag, die uit
    // staat en nergens aan te zetten is. De teksten worden wel echt door de
    // trigger-jobs gebruikt, dus ze horen gewoon bereikbaar te zijn.
    { id: 'facturen', label: 'Facturen', icon: Receipt, tabs: [
      { id: 'factuur-opvolging', label: 'Herinneringen', icon: MessageSquare },
    ]},
    { id: 'projecten', label: 'Projecten', icon: LayoutGrid, tabs: [
      { id: 'sidebar', label: 'Sidebar', icon: PanelLeft },
    ]},
    { id: 'producten', label: 'Documenten', icon: FileText, tabs: [
      { id: 'briefpapier', label: 'Briefpapier', icon: Image },
      { id: 'tekeningen', label: 'Tekeningen', icon: Image },
      { id: 'documenten', label: 'Documenten', icon: FileText },
    ]},
    // Deze drie waren alleen via lockedSubTab bereikbaar en werden daardoor
    // nooit getoond: alle template-, lettertype- en marge-instellingen stonden
    // in de code maar konden niet meer gewijzigd worden.
    { id: 'huisstijl', label: 'Huisstijl', icon: Palette, tabs: [
      { id: 'huisstijl-template', label: 'Template & Kleuren', icon: Palette },
      { id: 'huisstijl-typografie', label: 'Typografie', icon: FileText },
      { id: 'huisstijl-layout', label: 'Layout', icon: LayoutGrid },
    ]},
  ]},
  { id: 'koppelingen', label: 'Koppelingen', sections: [
    { id: 'email-settings', label: 'E-mail', icon: Mail, tabs: [
      { id: 'email', label: 'E-mail', icon: Mail },
    ]},
    { id: 'communicatie', label: 'Communicatie', icon: MessageSquare, tabs: [
      { id: 'communicatie', label: 'Communicatie', icon: MessageSquare },
    ]},
    { id: 'integraties-all', label: 'Integraties', icon: Puzzle, tabs: [
      { id: 'integraties', label: 'Integraties', icon: Puzzle },
      { id: 'portaal', label: 'Portaal', icon: Link2 },
    ]},
    { id: 'inkoopfacturen-settings', label: 'Inkoopfacturen', icon: Receipt, tabs: [
      { id: 'inkoopfactuur-inbox', label: 'Inbox Setup', icon: Mail },
    ]},
    { id: 'importeren', label: 'Importeren', icon: Upload, tabs: [
      { id: 'import', label: 'Importeren', icon: Upload },
    ]},
  ]},
  { id: 'doen', label: 'doen.', sections: [
    { id: 'daan-ai', label: 'Daan AI', icon: Sparkles, tabs: [
      { id: 'forgie', label: 'Daan AI', icon: Sparkles },
    ]},
    { id: 'whats-new', label: "What's new", icon: Sparkles, tabs: [
      { id: 'changelog', label: "What's new", icon: Sparkles },
    ]},
  ]},
]

const settingsSections: SettingsSection[] = settingsGroups.flatMap((g) => g.sections)

const tabToSectionMap: Record<string, string> = {}
settingsSections.forEach(section => {
  section.tabs.forEach(tab => {
    tabToSectionMap[tab.id] = section.id
  })
})

function renderTabContent(tabId: string) {
  switch (tabId) {
    case 'profiel': return <ProfielTab />
    case 'bedrijf': return <BedrijfTab />
    case 'documenten': return <DocumentenTab />
    case 'briefpapier': return <HuisstijlTab lockedSubTab="briefpapier" />
    case 'huisstijl-template': return <HuisstijlTab lockedSubTab="template" />
    case 'huisstijl-typografie': return <HuisstijlTab lockedSubTab="typografie" />
    case 'huisstijl-layout': return <HuisstijlTab lockedSubTab="layout" />
    case 'tekeningen': return <HuisstijlTab lockedSubTab="tekeningen" />
    case 'calculatie': return <CalculatieTab />
    case 'email': return <EmailTab />
    case 'integraties': return <IntegratiesTab />
    case 'beveiliging': return <BeveiligingTab />
    case 'weergave': return <WeergaveTab />
    case 'sidebar': return <SidebarTab />
    case 'portaal': return <PortaalTab />
    case 'forgie': return <ForgieTab />
    case 'teamleden': return <TeamledenTab />
    case 'abonnement': return <AbonnementTab />
    case 'grootboek': return <GeneralLedgerSettings />
    case 'btw-codes': return <VATCodesSettings />
    case 'kortingen': return <DiscountsSettings />
    case 'kostenplaatsen': return <KostenplaatsenTab />
    case 'communicatie': return <CommunicatieTab />
    case 'offerte-opvolging': return <OfferteOpvolgingSubTab />
    case 'factuur-opvolging': return <FactuurOpvolgingSubTab />
    case 'kb-artikelen': return <KennisbankTab />
    case 'changelog': return <ChangelogPage />
    case 'import': return <ImportTab />
    case 'inkoopfactuur-inbox': return <InkoopfactuurInboxSetup />
    default: return null
  }
}

export function SettingsLayout({ variant = 'pagina' }: { variant?: 'pagina' | 'modal' } = {}) {
  const isModal = variant === 'modal'
  const { doenCommunicatieTabEnabled } = useAppSettings()
  const visibleSections = settingsSections.filter(
    (s) => s.id !== 'communicatie' || doenCommunicatieTabEnabled,
  )

  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'algemeen'
  const resolvedSection = tabToSectionMap[initialTab] || initialTab
  const validSection = visibleSections.some((s) => s.id === resolvedSection) ? resolvedSection : 'algemeen'

  const [activeSection, setActiveSection] = useState(validSection)
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>({})
  const [zoek, setZoek] = useState('')
  const navigate = useNavigate()

  // Zoeken kijkt ook naar de subtabs: wie "btw" typt zoekt de BTW-codes, niet
  // de categorie waar ze toevallig onder hangen.
  const zichtbareGroepen = useMemo(() => {
    const term = zoek.trim().toLowerCase()
    return settingsGroups
      .map((groep) => ({
        ...groep,
        sections: groep.sections.filter((s) => {
          if (!visibleSections.some((v) => v.id === s.id)) return false
          if (!term) return true
          return (
            s.label.toLowerCase().includes(term) ||
            s.tabs.some((t) => t.label.toLowerCase().includes(term))
          )
        }),
      }))
      .filter((groep) => groep.sections.length > 0)
  }, [zoek, visibleSections])

  // Een ?tab= die binnenkomt terwijl we al op deze pagina staan moet ook
  // aanslaan. Zonder dit blijven deeplinks vanuit het accountmenu en de
  // Aan de slag-checklist hangen op de sectie die toevallig openstond.
  const gevraagdeTab = searchParams.get('tab')
  useEffect(() => {
    if (!gevraagdeTab) return
    const sectie = tabToSectionMap[gevraagdeTab] || gevraagdeTab
    if (!visibleSections.some((s) => s.id === sectie)) return
    setActiveSection(sectie)
    if (tabToSectionMap[gevraagdeTab]) {
      setActiveSubTabs(prev => ({ ...prev, [sectie]: gevraagdeTab }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gevraagdeTab])

  const currentSection = visibleSections.find((s) => s.id === activeSection)
  const currentSubTab = currentSection?.tabs.length
    ? (activeSubTabs[activeSection] || currentSection.tabs[0].id)
    : null

  const setSubTab = useCallback((tabId: string) => {
    setActiveSubTabs(prev => ({ ...prev, [activeSection]: tabId }))
  }, [activeSection])

  return (
    <div className={cn(isModal ? 'h-full flex flex-col' : 'space-y-6')}>
      <div className={cn('flex items-baseline gap-4 min-w-0', isModal && 'px-7 pt-7 pb-5 pr-16 flex-shrink-0')}>
        <h1 className={cn('font-extrabold tracking-[-0.5px] text-foreground', isModal ? 'text-[24px]' : 'text-[32px]')}>
          Instellingen<span className="text-flame">.</span>
        </h1>
        <span
          className="text-[14px] text-foreground/70 hidden sm:inline truncate"
          style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
        >
          profiel, bedrijf, voorkeuren · alles op één plek
        </span>
      </div>

      <div className={cn(
        'flex flex-col md:flex-row gap-8',
        isModal ? 'flex-1 min-h-0 px-7 pb-7' : 'min-h-[calc(100vh-12rem)]',
      )}>
        <nav className={cn('w-full md:w-52 flex-shrink-0', isModal && 'md:overflow-y-auto')}>
          <div className={cn(!isModal && 'md:sticky md:top-6')}>
            <div className="md:hidden flex overflow-x-auto gap-0.5 p-1 doen-slate-surface rounded-xl">
              {visibleSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all whitespace-nowrap',
                      isActive
                        ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(20,62,71,0.08)]'
                        : 'text-foreground/70 hover:text-foreground'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {section.label}
                  </button>
                )
              })}
            </div>

            <div className="hidden md:block doen-slate-surface rounded-2xl p-1.5">
              <div className="relative px-1.5 pt-1.5 pb-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
                <input
                  value={zoek}
                  onChange={(e) => setZoek(e.target.value)}
                  placeholder="Zoeken"
                  aria-label="Zoek in instellingen"
                  className="w-full h-8 pl-8 pr-2 rounded-lg bg-card text-[13px] text-foreground placeholder:text-muted-foreground/70 border border-transparent focus:border-petrol/30 focus:outline-none transition-colors"
                />
              </div>

              {zichtbareGroepen.length === 0 && (
                <p className="px-3 py-6 text-[12px] text-muted-foreground text-center">
                  Niets gevonden voor &ldquo;{zoek}&rdquo;.
                </p>
              )}

              {zichtbareGroepen.map((groep) => (
                <div key={groep.id} className="pb-1">
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {groep.label}
                  </p>
                  <div className="space-y-0.5">
                    {groep.sections.map((section) => {
                      const Icon = section.icon
                      const isActive = activeSection === section.id
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={cn(
                            'group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 relative',
                            isActive
                              ? 'text-foreground font-semibold bg-card shadow-[0_1px_3px_rgba(20,62,71,0.08),0_0_0_1px_rgba(26,83,92,0.06)]'
                              : 'text-foreground/70 hover:text-foreground hover:bg-card/50'
                          )}
                        >
                          {isActive && (
                            <span
                              aria-hidden
                              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2.5px] rounded-r-full bg-flame"
                            />
                          )}
                          <Icon className={cn('w-4 h-4 transition-colors', isActive ? 'text-petrol' : 'text-muted-foreground group-hover:text-foreground/70')} />
                          <span className="text-[13px] truncate">{section.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </nav>

        <div className={cn('flex-1 min-w-0', isModal && 'overflow-y-auto pr-1')}>
          {currentSection && currentSection.tabs.length > 1 && (
            <SubTabNav
              tabs={currentSection.tabs}
              active={currentSubTab || ''}
              onChange={setSubTab}
            />
          )}

          {currentSubTab ? renderTabContent(currentSubTab) : null}
        </div>
      </div>
    </div>
  )
}

// ─── DocumentenTab (inline · small enough to keep here) ───

const DOCUMENTEN_TABS: SubTab[] = [
  { id: 'offertes', label: 'Offertes', icon: FileText },
  { id: 'facturen', label: 'Facturen', icon: Receipt },
  { id: 'werkbonnen', label: 'Werkbonnen', icon: Package },
]

function DocumentenTab() {
  const { user } = useAuth()
  const { refreshSettings } = useAppSettings()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [subTab, setSubTab] = useState('offertes')

  const [offertePrefix, setOffertePrefix] = useState('OFF')
  const [offerteStartNummer, setOfferteStartNummer] = useState('1')
  const [offerteGeldigheid, setOfferteGeldigheid] = useState('30')
  const [standaardBtw, setStandaardBtw] = useState('21')
  const [offerteIntroTekst, setOfferteIntroTekst] = useState('')
  const [offerteOutroTekst, setOfferteOutroTekst] = useState('')
  const [offerteVoorwaarden, setOfferteVoorwaarden] = useState('')

  const [werkbonMonteurUren, setWerkbonMonteurUren] = useState(true)
  const [werkbonMonteurOpmerkingen, setWerkbonMonteurOpmerkingen] = useState(true)
  const [werkbonMonteurFotos, setWerkbonMonteurFotos] = useState(false)
  const [werkbonKlantHandtekening, setWerkbonKlantHandtekening] = useState(false)
  const [werkbonBriefpapier, setWerkbonBriefpapier] = useState(true)

  const [factuurIntroTekst, setFactuurIntroTekst] = useState('')
  const [factuurOutroTekst, setFactuurOutroTekst] = useState('')
  const [factuurPrefix, setFactuurPrefix] = useState('')
  const [factuurStartNummer, setFactuurStartNummer] = useState('1')
  const [creditnotaPrefix, setCreditnotaPrefix] = useState('CN')
  const [creditnotaDoornummeren, setCreditnotaDoornummeren] = useState(false)
  const [werkbonPrefix, setWerkbonPrefix] = useState('WB')
  const [werkbonStartNummer, setWerkbonStartNummer] = useState('1')
  const [projectPrefix, setProjectPrefix] = useState('PRJ')
  const [betaaltermijn, setBetaaltermijn] = useState('30')
  const [voorwaarden, setVoorwaarden] = useState('')

  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const data = await getAppSettings(user.id)
      setOffertePrefix(data.offerte_prefix || 'OFF')
      setOfferteStartNummer(String(data.offerte_volgnummer ?? 1))
      setOfferteGeldigheid(String(data.offerte_geldigheid_dagen || 30))
      setStandaardBtw(String(data.standaard_btw || 21))
      setOfferteIntroTekst(data.offerte_intro_tekst || '')
      setOfferteOutroTekst(data.offerte_outro_tekst || '')
      setOfferteVoorwaarden(data.offerte_voorwaarden || DEFAULT_OFFERTE_VOORWAARDEN)
      setWerkbonMonteurUren(data.werkbon_monteur_uren ?? true)
      setWerkbonMonteurOpmerkingen(data.werkbon_monteur_opmerkingen ?? true)
      // Zelfde default als AppSettingsContext: stond hier op false, waardoor de
      // schakelaar uit leek te staan terwijl de werkbon-module de instelling
      // als aan behandelde.
      setWerkbonMonteurFotos(data.werkbon_monteur_fotos ?? true)
      setWerkbonKlantHandtekening(data.werkbon_klant_handtekening ?? true)
      setWerkbonBriefpapier(data.werkbon_briefpapier ?? true)
      setFactuurPrefix(data.factuur_prefix || 'FAC')
      setFactuurStartNummer(String(data.factuur_volgnummer ?? 1))
      setCreditnotaPrefix(data.creditnota_prefix || 'CN')
      setCreditnotaDoornummeren(data.creditnota_doornummeren ?? false)
      setWerkbonPrefix(data.werkbon_prefix || 'WB')
      setWerkbonStartNummer(String(data.werkbon_volgnummer ?? 1))
      setProjectPrefix(data.project_prefix || 'PRJ')
      setBetaaltermijn(String(data.factuur_betaaltermijn_dagen || 30))
      setVoorwaarden(data.factuur_voorwaarden || '')
      setFactuurIntroTekst(data.factuur_intro_tekst || '')
      setFactuurOutroTekst(data.factuur_outro_tekst || '')
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
        offerte_prefix: offertePrefix,
        offerte_volgnummer: parseInt(offerteStartNummer) || 1,
        offerte_geldigheid_dagen: parseInt(offerteGeldigheid) || 30,
        standaard_btw: parseFloat(standaardBtw) || 21,
        offerte_intro_tekst: offerteIntroTekst,
        offerte_outro_tekst: offerteOutroTekst,
        offerte_voorwaarden: offerteVoorwaarden,
        werkbon_monteur_uren: werkbonMonteurUren,
        werkbon_monteur_opmerkingen: werkbonMonteurOpmerkingen,
        werkbon_monteur_fotos: werkbonMonteurFotos,
        werkbon_klant_handtekening: werkbonKlantHandtekening,
        werkbon_briefpapier: werkbonBriefpapier,
        factuur_prefix: factuurPrefix,
        factuur_volgnummer: parseInt(factuurStartNummer) || 1,
        creditnota_prefix: creditnotaPrefix,
        creditnota_doornummeren: creditnotaDoornummeren,
        werkbon_prefix: werkbonPrefix,
        werkbon_volgnummer: parseInt(werkbonStartNummer) || 1,
        project_prefix: projectPrefix,
        factuur_betaaltermijn_dagen: parseInt(betaaltermijn) || 30,
        factuur_voorwaarden: voorwaarden,
        factuur_intro_tekst: factuurIntroTekst,
        factuur_outro_tekst: factuurOutroTekst,
      })
      await refreshSettings()
      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
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
      <SubTabNav tabs={DOCUMENTEN_TABS} active={subTab} onChange={setSubTab} variant="underline" />

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offerte-prefix">Offerte prefix</Label>
                  <Input id="offerte-prefix" value={offertePrefix} onChange={(e) => setOffertePrefix(e.target.value.toUpperCase())} placeholder="OFF" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {offertePrefix}-{new Date().getFullYear()}-{String(parseInt(offerteStartNummer) || 1).padStart(3, '0')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerte-startnummer">Begin nummer</Label>
                  <Input id="offerte-startnummer" type="number" min="1" value={offerteStartNummer} onChange={(e) => setOfferteStartNummer(e.target.value)} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Volgende offerte start hier (handig bij overstap)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerte-geldigheid">Geldigheidsduur (dagen)</Label>
                  <Input id="offerte-geldigheid" type="number" min="1" value={offerteGeldigheid} onChange={(e) => setOfferteGeldigheid(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standaard-btw">Standaard BTW %</Label>
                  <Input id="standaard-btw" type="number" min="0" max="100" value={standaardBtw} onChange={(e) => setStandaardBtw(e.target.value)} />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="offerte-intro">Standaard introductietekst</Label>
                  <Textarea id="offerte-intro" value={offerteIntroTekst} onChange={(e) => setOfferteIntroTekst(e.target.value)} placeholder="Bijv. Naar aanleiding van ons gesprek doen wij u hierbij een vrijblijvende offerte toekomen." rows={2} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Wordt bovenaan de offerte weergegeven</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerte-outro">Standaard afsluittekst</Label>
                  <Textarea id="offerte-outro" value={offerteOutroTekst} onChange={(e) => setOfferteOutroTekst(e.target.value)} placeholder="Bijv. Wij vertrouwen erop u een passend aanbod te hebben gedaan." rows={2} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Wordt onderaan de offerte weergegeven</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="offerte-voorwaarden">Voorwaarden offerte</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const doorgaan = await confirm({
                          message: 'Voorwaarden herstellen naar de standaardtekst? Je huidige tekst gaat verloren.',
                          confirmLabel: 'Herstellen',
                        })
                        if (doorgaan) setOfferteVoorwaarden(DEFAULT_OFFERTE_VOORWAARDEN)
                      }}
                    >
                      Herstel naar standaard
                    </Button>
                  </div>
                  <Textarea id="offerte-voorwaarden" value={offerteVoorwaarden} onChange={(e) => setOfferteVoorwaarden(e.target.value)} rows={8} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Verschijnt onder elke offerte. Per offerte kun je deze nog overschrijven in de offerte-editor.</p>
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
              <CardDescription>Nummering, betaaltermijnen en standaardteksten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="factuur-prefix">Factuur prefix</Label>
                  <Input id="factuur-prefix" value={factuurPrefix} onChange={(e) => setFactuurPrefix(e.target.value)} placeholder="bijv. {jaar} of FAC{jaar}" />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {factuurPrefix.replace('{jaar}', new Date().getFullYear().toString())}{parseInt(factuurStartNummer) || 1}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="factuur-startnummer">Begin nummer</Label>
                  <Input id="factuur-startnummer" type="number" min="1" value={factuurStartNummer} onChange={(e) => setFactuurStartNummer(e.target.value)} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Volgende factuur start hier (handig bij overstap)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditnota-prefix">Creditnota prefix</Label>
                  <Input id="creditnota-prefix" value={creditnotaPrefix} onChange={(e) => setCreditnotaPrefix(e.target.value.toUpperCase())} placeholder="CN" maxLength={5} disabled={creditnotaDoornummeren} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                    {creditnotaDoornummeren ? 'Niet gebruikt · creditnota volgt de factuurreeks.' : `Voorbeeld: ${creditnotaPrefix}-2026-0001`}
                  </p>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Label htmlFor="creditnota-doornummeren" className="text-[13px] font-normal text-muted-foreground">
                      Doornummeren met de normale facturen
                    </Label>
                    <Switch id="creditnota-doornummeren" checked={creditnotaDoornummeren} onCheckedChange={setCreditnotaDoornummeren} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-prefix">Project prefix</Label>
                  <Input id="project-prefix" value={projectPrefix} onChange={(e) => setProjectPrefix(e.target.value.toUpperCase())} placeholder="PRJ" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {projectPrefix}-2026-0001</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="betaaltermijn">Betaaltermijn (dagen)</Label>
                  <Input id="betaaltermijn" type="number" value={betaaltermijn} onChange={(e) => setBetaaltermijn(e.target.value)} min="1" max="365" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voorwaarden">Standaard betalingsvoorwaarden</Label>
                <Textarea id="voorwaarden" value={voorwaarden} onChange={(e) => setVoorwaarden(e.target.value)} placeholder="Bijv. Op al onze overeenkomsten zijn onze algemene voorwaarden van toepassing, gedeponeerd bij de KvK." rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="factuur-intro">Standaard introductietekst</Label>
                <Textarea id="factuur-intro" value={factuurIntroTekst} onChange={(e) => setFactuurIntroTekst(e.target.value)} placeholder="Bijv. Hierbij ontvangt u de factuur voor de uitgevoerde werkzaamheden." rows={2} />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Wordt automatisch bovenaan elke nieuwe factuur geplaatst</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="factuur-outro">Standaard afsluittekst</Label>
                <Textarea id="factuur-outro" value={factuurOutroTekst} onChange={(e) => setFactuurOutroTekst(e.target.value)} placeholder="Bijv. Wij vertrouwen op een tijdige betaling. Bij vragen kunt u contact met ons opnemen." rows={2} />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Wordt automatisch onderaan elke nieuwe factuur geplaatst</p>
              </div>
              <div className="rounded-md border bg-muted/50 px-3 py-2.5 mt-2">
                <p className="text-xs text-muted-foreground">
                  Betalingsherinneringen beheer je onder <strong>Facturen → Opvolging</strong>. Offerte opvolging onder <strong>Offertes → Opvolging</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
          {saveButton}
        </div>
      )}

      {subTab === 'werkbonnen' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Werkbon Instellingen
              </CardTitle>
              <CardDescription>Nummering en wat de monteur ziet en kan doen op de werkbon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="werkbon-prefix">Werkbon prefix</Label>
                  <Input id="werkbon-prefix" value={werkbonPrefix} onChange={(e) => setWerkbonPrefix(e.target.value.toUpperCase())} placeholder="WB" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {werkbonPrefix}-{new Date().getFullYear()}-{String(parseInt(werkbonStartNummer) || 1).padStart(3, '0')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="werkbon-startnummer">Begin nummer</Label>
                  <Input id="werkbon-startnummer" type="number" min="1" value={werkbonStartNummer} onChange={(e) => setWerkbonStartNummer(e.target.value)} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Volgende werkbon start hier (handig bij overstap)</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Monteur kan uren invullen</Label>
                    <p className="text-xs text-muted-foreground">De monteur kan gewerkte uren registreren op de werkbon</p>
                  </div>
                  <Switch checked={werkbonMonteurUren} onCheckedChange={setWerkbonMonteurUren} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Monteur kan opmerkingen toevoegen</Label>
                    <p className="text-xs text-muted-foreground">Veld voor opmerkingen of bijzonderheden van de monteur</p>
                  </div>
                  <Switch checked={werkbonMonteurOpmerkingen} onCheckedChange={setWerkbonMonteurOpmerkingen} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Monteur kan foto's maken</Label>
                    <p className="text-xs text-muted-foreground">Upload van voor/na foto's op de werkbon</p>
                  </div>
                  <Switch checked={werkbonMonteurFotos} onCheckedChange={setWerkbonMonteurFotos} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Klant handtekening tonen</Label>
                    <p className="text-xs text-muted-foreground">Handtekeningveld voor de klant op de werkbon</p>
                  </div>
                  <Switch checked={werkbonKlantHandtekening} onCheckedChange={setWerkbonKlantHandtekening} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Briefpapier op werkbon PDF</Label>
                    <p className="text-xs text-muted-foreground">Toon bedrijfslogo en gegevens op de werkbon PDF</p>
                  </div>
                  <Switch checked={werkbonBriefpapier} onCheckedChange={setWerkbonBriefpapier} />
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

