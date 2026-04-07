import React, { useState, useEffect, useCallback } from 'react'
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
  Clock,
  Save,
  LayoutGrid,
  PanelLeft,
  Link2,
  BookOpen,
  Percent,
  Tag,
  Sparkles,
  Bell,
  Building2,
  Image,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getAppSettings, updateAppSettings } from '@/services/supabaseService'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '../../utils/logger'

// Already-extracted tab components
import { HuisstijlTab } from './HuisstijlTab'
import { CalculatieTab } from './CalculatieTab'
import { ForgieTab } from './ForgieTab'
import { ExactTab } from './ExactTab'
import { confirm } from '@/components/shared/ConfirmDialog'
import { PortaalTab } from './PortaalTab'
import { SidebarTab } from './SidebarTab'
import { TeamledenTab } from './TeamledenTab'
import { AbonnementTab } from './AbonnementTab'
import { OfferteOpvolgingTab } from './OfferteOpvolgingTab'
import { GeneralLedgerSettings } from '../financial/GeneralLedgerSettings'
import { VATCodesSettings } from '../financial/VATCodesSettings'
import { DiscountsSettings } from '../financial/DiscountsSettings'
import { KennisbankTab } from './KennisbankTab'
import { ChangelogPage } from '../changelog/ChangelogPage'

// Newly-extracted tab components
import { ProfielTab } from './ProfielTab'
import { BedrijfTab } from './BedrijfTab'
import { EmailTab, EmailTemplatesSubTab } from './EmailTab'
import { IntegratiesTab } from './IntegratiesTab'
import { BeveiligingTab } from './BeveiligingTab'
import { WeergaveTab } from './WeergaveTab'

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

const settingsSections: SettingsSection[] = [
  { id: 'algemeen', label: 'Algemeen', icon: Home, tabs: [
    { id: 'profiel', label: 'Profiel', icon: FileText },
    { id: 'bedrijf', label: 'Bedrijf', icon: Building2 },
    { id: 'weergave', label: 'Voorkeuren', icon: Sliders },
  ]},
  { id: 'gebruikers', label: 'Gebruikers', icon: Users, tabs: [
    { id: 'teamleden', label: 'Teamleden', icon: Users },
  ]},
  { id: 'financieel', label: 'Financieel', icon: CreditCard, tabs: [
    { id: 'abonnement', label: 'Abonnement', icon: CreditCard },
    { id: 'grootboek', label: 'Grootboekrekening', icon: BookOpen },
    { id: 'btw-codes', label: 'BTW Codes', icon: Percent },
    { id: 'kortingen', label: 'Kortingen', icon: Tag },
  ]},
  { id: 'offertes', label: 'Offertes', icon: FileText, tabs: [
    { id: 'calculatie', label: 'Calculatie', icon: Calculator },
    { id: 'opvolging', label: 'Opvolging', icon: Clock },
  ]},
  { id: 'projecten', label: 'Projecten', icon: LayoutGrid, tabs: [
    { id: 'sidebar', label: 'Sidebar', icon: PanelLeft },
  ]},
  { id: 'facturen', label: 'Facturen', icon: Receipt, tabs: [
    { id: 'factuur-opvolging', label: 'Opvolging', icon: Bell },
  ]},
  { id: 'email-settings', label: 'E-mail', icon: Mail, tabs: [
    { id: 'email', label: 'E-mail', icon: Mail },
  ]},
  { id: 'producten', label: 'Documenten', icon: FileText, tabs: [
    { id: 'briefpapier', label: 'Briefpapier', icon: Image },
    { id: 'tekeningen', label: 'Tekeningen', icon: Image },
    { id: 'documenten', label: 'Documenten', icon: FileText },
  ]},
  { id: 'integraties-all', label: 'Integraties', icon: Puzzle, tabs: [
    { id: 'integraties', label: 'Integraties', icon: Puzzle },
    { id: 'portaal', label: 'Portaal', icon: Link2 },
  ]},
  { id: 'apparaten', label: 'Apparaten', icon: Monitor, tabs: [
    { id: 'beveiliging', label: 'Beveiliging', icon: Shield },
  ]},
  { id: 'daan-ai', label: 'Daan AI', icon: Sparkles, tabs: [
    { id: 'forgie', label: 'Daan AI', icon: Sparkles },
  ]},
  { id: 'whats-new', label: "What's new", icon: Sparkles, tabs: [
    { id: 'changelog', label: "What's new", icon: Sparkles },
  ]},
]

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
    case 'opvolging': return <OfferteOpvolgingTab />
    case 'factuur-opvolging': return <EmailTemplatesSubTab />
    case 'kb-artikelen': return <KennisbankTab />
    case 'changelog': return <ChangelogPage />
    default: return null
  }
}

export function SettingsLayout() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'algemeen'
  const resolvedSection = tabToSectionMap[initialTab] || initialTab
  const validSection = settingsSections.some(s => s.id === resolvedSection) ? resolvedSection : 'algemeen'

  const [activeSection, setActiveSection] = useState(validSection)
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>({})
  const navigate = useNavigate()

  const currentSection = settingsSections.find(s => s.id === activeSection)
  const currentSubTab = currentSection?.tabs.length
    ? (activeSubTabs[activeSection] || currentSection.tabs[0].id)
    : null

  const setSubTab = useCallback((tabId: string) => {
    setActiveSubTabs(prev => ({ ...prev, [activeSection]: tabId }))
  }, [activeSection])

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-[-0.3px] text-[#1A1A1A]">
          Instellingen<span className="text-[#F15025]">.</span>
        </h1>
        <p className="text-[13px] text-[#9B9B95] mt-0.5">
          Beheer je profiel, bedrijfsgegevens en voorkeuren
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 min-h-[calc(100vh-12rem)]">
        <nav className="w-full md:w-48 flex-shrink-0">
          <div className="md:sticky md:top-6">
            <div className="md:hidden flex overflow-x-auto gap-0.5 p-1 bg-[#F3F2F0] rounded-lg">
              {settingsSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all whitespace-nowrap',
                      isActive
                        ? 'bg-[#FFFFFF] text-[#1A1A1A] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                        : 'text-[#9B9B95] hover:text-[#6B6B66]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {section.label}
                  </button>
                )
              })}
            </div>

            <div className="hidden md:block space-y-0.5">
              {settingsSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150',
                      isActive
                        ? 'text-[#1A1A1A] font-semibold bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
                        : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#FFFFFF]/50'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-[#1A535C]' : 'text-[#9B9B95]')} />
                    <span className="text-[13px] truncate">{section.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          {currentSection && currentSection.tabs.length > 1 && (
            <SubTabNav
              tabs={currentSection.tabs}
              active={currentSubTab || ''}
              onChange={setSubTab}
            />
          )}

          {currentSection && currentSection.tabs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground/70 mb-1">Factuur-instellingen</h3>
              <p className="text-[13px] text-muted-foreground max-w-[280px]">
                Factuur-instellingen komen binnenkort beschikbaar.
              </p>
            </div>
          ) : currentSubTab ? (
            renderTabContent(currentSubTab)
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── DocumentenTab (inline — small enough to keep here) ───

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
  const [offerteGeldigheid, setOfferteGeldigheid] = useState('30')
  const [standaardBtw, setStandaardBtw] = useState('21')
  const [offerteIntroTekst, setOfferteIntroTekst] = useState('')
  const [offerteOutroTekst, setOfferteOutroTekst] = useState('')

  const [werkbonMonteurUren, setWerkbonMonteurUren] = useState(true)
  const [werkbonMonteurOpmerkingen, setWerkbonMonteurOpmerkingen] = useState(true)
  const [werkbonMonteurFotos, setWerkbonMonteurFotos] = useState(false)
  const [werkbonKlantHandtekening, setWerkbonKlantHandtekening] = useState(false)
  const [werkbonBriefpapier, setWerkbonBriefpapier] = useState(true)

  const [factuurIntroTekst, setFactuurIntroTekst] = useState('')
  const [factuurOutroTekst, setFactuurOutroTekst] = useState('')
  const [factuurPrefix, setFactuurPrefix] = useState('FAC')
  const [creditnotaPrefix, setCreditnotaPrefix] = useState('CN')
  const [werkbonPrefix, setWerkbonPrefix] = useState('WB')
  const [projectPrefix, setProjectPrefix] = useState('PRJ')
  const [betaaltermijn, setBetaaltermijn] = useState('30')
  const [voorwaarden, setVoorwaarden] = useState('')
  const [standaardUurtarief, setStandaardUurtarief] = useState('75')

  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const data = await getAppSettings(user.id)
      setOffertePrefix(data.offerte_prefix || 'OFF')
      setOfferteGeldigheid(String(data.offerte_geldigheid_dagen || 30))
      setStandaardBtw(String(data.standaard_btw || 21))
      setOfferteIntroTekst(data.offerte_intro_tekst || '')
      setOfferteOutroTekst(data.offerte_outro_tekst || '')
      setWerkbonMonteurUren(data.werkbon_monteur_uren ?? true)
      setWerkbonMonteurOpmerkingen(data.werkbon_monteur_opmerkingen ?? true)
      setWerkbonMonteurFotos(data.werkbon_monteur_fotos ?? false)
      setWerkbonKlantHandtekening(data.werkbon_klant_handtekening ?? false)
      setWerkbonBriefpapier(data.werkbon_briefpapier ?? true)
      setFactuurPrefix(data.factuur_prefix || 'FAC')
      setCreditnotaPrefix(data.creditnota_prefix || 'CN')
      setWerkbonPrefix(data.werkbon_prefix || 'WB')
      setProjectPrefix(data.project_prefix || 'PRJ')
      setBetaaltermijn(String(data.factuur_betaaltermijn_dagen || 30))
      setVoorwaarden(data.factuur_voorwaarden || '')
      setStandaardUurtarief(String(data.standaard_uurtarief || 75))
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
        offerte_geldigheid_dagen: parseInt(offerteGeldigheid) || 30,
        standaard_btw: parseFloat(standaardBtw) || 21,
        offerte_intro_tekst: offerteIntroTekst,
        offerte_outro_tekst: offerteOutroTekst,
        werkbon_monteur_uren: werkbonMonteurUren,
        werkbon_monteur_opmerkingen: werkbonMonteurOpmerkingen,
        werkbon_monteur_fotos: werkbonMonteurFotos,
        werkbon_klant_handtekening: werkbonKlantHandtekening,
        werkbon_briefpapier: werkbonBriefpapier,
        factuur_prefix: factuurPrefix,
        creditnota_prefix: creditnotaPrefix,
        werkbon_prefix: werkbonPrefix,
        project_prefix: projectPrefix,
        factuur_betaaltermijn_dagen: parseInt(betaaltermijn) || 30,
        factuur_voorwaarden: voorwaarden,
        standaard_uurtarief: parseFloat(standaardUurtarief) || 75,
        factuur_intro_tekst: factuurIntroTekst,
        factuur_outro_tekst: factuurOutroTekst,
      })
      await refreshSettings()
      toast.success('Opgeslagen.')
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
      <SubTabNav tabs={DOCUMENTEN_TABS} active={subTab} onChange={setSubTab} />

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offerte-prefix">Offerte prefix</Label>
                  <Input id="offerte-prefix" value={offertePrefix} onChange={(e) => setOffertePrefix(e.target.value.toUpperCase())} placeholder="OFF" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {offertePrefix}-2026-0001</p>
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
                  <Input id="factuur-prefix" value={factuurPrefix} onChange={(e) => setFactuurPrefix(e.target.value.toUpperCase())} placeholder="FAC" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {factuurPrefix}-2026-0001</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditnota-prefix">Creditnota prefix</Label>
                  <Input id="creditnota-prefix" value={creditnotaPrefix} onChange={(e) => setCreditnotaPrefix(e.target.value.toUpperCase())} placeholder="CN" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {creditnotaPrefix}-2026-0001</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="werkbon-prefix">Werkbon prefix</Label>
                  <Input id="werkbon-prefix" value={werkbonPrefix} onChange={(e) => setWerkbonPrefix(e.target.value.toUpperCase())} placeholder="WB" maxLength={5} />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Voorbeeld: {werkbonPrefix}-2026-0001</p>
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
                <div className="space-y-2">
                  <Label htmlFor="standaard-uurtarief">Standaard uurtarief</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">&euro;</span>
                    <Input id="standaard-uurtarief" type="number" value={standaardUurtarief} onChange={(e) => setStandaardUurtarief(e.target.value)} min="0" className="pl-7" />
                  </div>
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
              <CardDescription>Bepaal wat de monteur ziet en kan doen op de werkbon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

