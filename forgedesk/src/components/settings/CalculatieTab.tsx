import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calculator,
  Package,
  HelpCircle,
  Edit2,
  Copy,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Check,
  ChevronRight,
  Layers,
  Zap,
  Star,
  Settings,
  ArrowRight,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { AppSettings, CalculatieProduct, CalculatieTemplate, CalculatieRegel, OfferteTemplate, OfferteTemplateRegel } from '@/types'
import {
  getCalculatieProducten,
  createCalculatieProduct,
  updateCalculatieProduct,
  deleteCalculatieProduct,
  getCalculatieTemplates,
  createCalculatieTemplate,
  updateCalculatieTemplate,
  deleteCalculatieTemplate,
  getOfferteTemplates,
  createOfferteTemplate,
  updateOfferteTemplate,
  deleteOfferteTemplate,
} from '@/services/supabaseService'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import { logger } from '../../utils/logger'
import { confirm } from '@/components/shared/ConfirmDialog'

// ============ STARTER TEMPLATES ============
// Pre-built calculatie templates for sign companies — installable with 1 click

function makeRegel(overrides: Partial<CalculatieRegel>): CalculatieRegel {
  return {
    id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_naam: '',
    categorie: '',
    eenheid: 'stuks',
    aantal: 1,
    inkoop_prijs: 0,
    verkoop_prijs: 0,
    marge_percentage: 35,
    korting_percentage: 0,
    nacalculatie: false,
    btw_percentage: 21,
    notitie: '',
    ...overrides,
  }
}

interface StarterTemplate {
  naam: string
  beschrijving: string
  kleur: string
  icon: string
  regels: Partial<CalculatieRegel>[]
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    naam: 'Gevelreclame (freesletters)',
    beschrijving: 'Freesletters met ontwerp, productie en montage op gevel',
    kleur: 'blue',
    icon: '—',
    regels: [
      { product_naam: 'Ontwerp & DTP', categorie: 'Arbeid', eenheid: 'uur', aantal: 2, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
      { product_naam: 'Freesletters acrylaat 20mm', categorie: 'Materiaal', eenheid: 'stuks', aantal: 10, inkoop_prijs: 12, verkoop_prijs: 28, marge_percentage: 133 },
      { product_naam: 'Lak / afwerking', categorie: 'Materiaal', eenheid: 'stuks', aantal: 1, inkoop_prijs: 45, verkoop_prijs: 85, marge_percentage: 89 },
      { product_naam: 'Montage incl. bevestiging', categorie: 'Arbeid', eenheid: 'uur', aantal: 4, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
      { product_naam: 'Hoogwerker huur', categorie: 'Apparatuur', eenheid: 'dag', aantal: 1, inkoop_prijs: 150, verkoop_prijs: 225, marge_percentage: 50 },
    ],
  },
  {
    naam: 'Autobelettering',
    beschrijving: 'Voertuigbelettering met gegoten folie, print en applicatie',
    kleur: 'orange',
    icon: '—',
    regels: [
      { product_naam: 'Ontwerp & DTP', categorie: 'Arbeid', eenheid: 'uur', aantal: 3, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
      { product_naam: 'Carwrap folie (gegoten)', categorie: 'Materiaal', eenheid: 'm\u00B2', aantal: 6, inkoop_prijs: 18, verkoop_prijs: 42, marge_percentage: 133 },
      { product_naam: 'Overdruk laminaat', categorie: 'Materiaal', eenheid: 'm\u00B2', aantal: 6, inkoop_prijs: 8, verkoop_prijs: 15, marge_percentage: 87.5 },
      { product_naam: 'Printen (solvent/latex)', categorie: 'Materiaal', eenheid: 'm\u00B2', aantal: 6, inkoop_prijs: 12, verkoop_prijs: 25, marge_percentage: 108 },
      { product_naam: 'Applicatie / plakken', categorie: 'Arbeid', eenheid: 'uur', aantal: 5, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
    ],
  },
  {
    naam: 'Lichtreclame (LED)',
    beschrijving: 'Verlichte doosletters of lichtbak met LED-verlichting',
    kleur: 'yellow',
    icon: '—',
    regels: [
      { product_naam: 'Ontwerp & DTP', categorie: 'Arbeid', eenheid: 'uur', aantal: 3, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
      { product_naam: 'Doosletters aluminium', categorie: 'Materiaal', eenheid: 'stuks', aantal: 8, inkoop_prijs: 45, verkoop_prijs: 95, marge_percentage: 111 },
      { product_naam: 'LED modules', categorie: 'Materiaal', eenheid: 'set', aantal: 1, inkoop_prijs: 85, verkoop_prijs: 165, marge_percentage: 94 },
      { product_naam: 'Voeding / trafo', categorie: 'Materiaal', eenheid: 'stuks', aantal: 1, inkoop_prijs: 35, verkoop_prijs: 65, marge_percentage: 86 },
      { product_naam: 'Montage elektra + ophangen', categorie: 'Arbeid', eenheid: 'uur', aantal: 6, inkoop_prijs: 45, verkoop_prijs: 85, marge_percentage: 89 },
      { product_naam: 'Hoogwerker huur', categorie: 'Apparatuur', eenheid: 'dag', aantal: 1, inkoop_prijs: 150, verkoop_prijs: 225, marge_percentage: 50 },
    ],
  },
  {
    naam: 'Raambelettering',
    beschrijving: 'Raamfolie met print of gesneden tekst/logo',
    kleur: 'emerald',
    icon: '—',
    regels: [
      { product_naam: 'Ontwerp & DTP', categorie: 'Arbeid', eenheid: 'uur', aantal: 1.5, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
      { product_naam: 'Raamfolie (gesneden)', categorie: 'Materiaal', eenheid: 'm\u00B2', aantal: 3, inkoop_prijs: 15, verkoop_prijs: 35, marge_percentage: 133 },
      { product_naam: 'Applicatie', categorie: 'Arbeid', eenheid: 'uur', aantal: 2, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
    ],
  },
  {
    naam: 'Spandoek / Banner',
    beschrijving: 'Geprint spandoek met ringen of frame',
    kleur: 'purple',
    icon: '—',
    regels: [
      { product_naam: 'Ontwerp & DTP', categorie: 'Arbeid', eenheid: 'uur', aantal: 1, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
      { product_naam: 'Spandoekdoek 510gr PVC', categorie: 'Materiaal', eenheid: 'm\u00B2', aantal: 4, inkoop_prijs: 8, verkoop_prijs: 22, marge_percentage: 175 },
      { product_naam: 'Full color print', categorie: 'Materiaal', eenheid: 'm\u00B2', aantal: 4, inkoop_prijs: 10, verkoop_prijs: 20, marge_percentage: 100 },
      { product_naam: 'Afwerking (ringen/zoom)', categorie: 'Arbeid', eenheid: 'stuks', aantal: 1, inkoop_prijs: 15, verkoop_prijs: 35, marge_percentage: 133 },
    ],
  },
  {
    naam: 'Signing / Bewegwijzering',
    beschrijving: 'Informatie- en routeborden met panelen en montage',
    kleur: 'teal',
    icon: '—',
    regels: [
      { product_naam: 'Ontwerp & DTP', categorie: 'Arbeid', eenheid: 'uur', aantal: 3, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
      { product_naam: 'Dibond plaat 3mm', categorie: 'Materiaal', eenheid: 'm\u00B2', aantal: 2, inkoop_prijs: 28, verkoop_prijs: 55, marge_percentage: 96 },
      { product_naam: 'Full color print + laminaat', categorie: 'Materiaal', eenheid: 'm\u00B2', aantal: 2, inkoop_prijs: 22, verkoop_prijs: 45, marge_percentage: 105 },
      { product_naam: 'Montage / bevestiging', categorie: 'Arbeid', eenheid: 'uur', aantal: 3, inkoop_prijs: 40, verkoop_prijs: 75, marge_percentage: 87.5 },
    ],
  },
]

// ============ SUB-TAB DEFINITIONS ============

type CalcSubTab = 'start' | 'producten' | 'templates' | 'offerte-tpl' | 'instellingen'

const SUB_TABS: { id: CalcSubTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'start', label: 'Aan de slag', icon: Sparkles, desc: 'Overzicht & snelstart' },
  { id: 'producten', label: 'Producten', icon: Package, desc: 'Productcatalogus' },
  { id: 'templates', label: 'Calculaties', icon: Calculator, desc: 'Voorgemaakte calculaties' },
  { id: 'offerte-tpl', label: 'Offerte Templates', icon: Copy, desc: 'Offerte sjablonen' },
  { id: 'instellingen', label: 'Instellingen', icon: Settings, desc: 'Categorieën & eenheden' },
]

// ============ MAIN COMPONENT ============

export function CalculatieTab() {
  const { user } = useAuth()
  const { settings, updateSettings } = useAppSettings()
  const [subTab, setSubTab] = useState<CalcSubTab>('start')

  // Shared data
  const [producten, setProducten] = useState<CalculatieProduct[]>([])
  const [templates, setTemplates] = useState<CalculatieTemplate[]>([])
  const [offerteTemplates, setOfferteTemplates] = useState<OfferteTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getCalculatieProducten(), getCalculatieTemplates(), getOfferteTemplates()])
      .then(([prods, tmps, otmps]) => {
        setProducten(prods)
        setTemplates(tmps)
        setOfferteTemplates(otmps)
      })
      .catch(logger.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 p-1 bg-muted dark:bg-muted rounded-xl overflow-x-auto">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'bg-card text-foreground dark:text-white shadow-sm'
                  : 'text-muted-foreground dark:text-muted-foreground/60 hover:text-foreground/70 dark:hover:text-muted-foreground/50'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Sub-tab content */}
      {subTab === 'start' && (
        <StartSection
          productenCount={producten.length}
          templatesCount={templates.length}
          offerteTemplatesCount={offerteTemplates.length}
          onNavigate={setSubTab}
          onInstallStarter={async (starter: StarterTemplate) => {
            if (!user?.id) return
            try {
              const regels = starter.regels.map((r) => makeRegel(r))
              const newTpl = await createCalculatieTemplate({
                user_id: user.id,
                naam: starter.naam,
                beschrijving: starter.beschrijving,
                regels,
                actief: true,
              })
              setTemplates((prev) => [...prev, newTpl])
              toast.success(`Template "${starter.naam}" geinstalleerd!`)
            } catch (err) {
              logger.error(err)
              toast.error('Kon template niet installeren')
            }
          }}
          installedNames={templates.map((t) => t.naam)}
        />
      )}
      {subTab === 'producten' && (
        <ProductenSection
          producten={producten}
          setProducten={setProducten}
          isLoading={isLoading}
          categorieen={settings.calculatie_categorieen || ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig']}
          eenheden={settings.calculatie_eenheden || ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set']}
          standaardMarge={settings.calculatie_standaard_marge ?? 35}
        />
      )}
      {subTab === 'templates' && (
        <TemplatesSection
          templates={templates}
          setTemplates={setTemplates}
          producten={producten}
          isLoading={isLoading}
          categorieen={settings.calculatie_categorieen || ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig']}
          eenheden={settings.calculatie_eenheden || ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set']}
          standaardMarge={settings.calculatie_standaard_marge ?? 35}
          starterTemplates={STARTER_TEMPLATES}
          installedNames={templates.map((t) => t.naam)}
          onInstallStarter={async (starter: StarterTemplate) => {
            if (!user?.id) return
            try {
              const regels = starter.regels.map((r) => makeRegel(r))
              const newTpl = await createCalculatieTemplate({
                user_id: user.id,
                naam: starter.naam,
                beschrijving: starter.beschrijving,
                regels,
                actief: true,
              })
              setTemplates((prev) => [...prev, newTpl])
              toast.success(`Template "${starter.naam}" geinstalleerd!`)
            } catch (err) {
              logger.error(err)
              toast.error('Kon template niet installeren')
            }
          }}
        />
      )}
      {subTab === 'offerte-tpl' && (
        <OfferteTemplatesSubSection
          offerteTemplates={offerteTemplates}
          setOfferteTemplates={setOfferteTemplates}
          isLoading={isLoading}
        />
      )}
      {subTab === 'instellingen' && <InstellingenSection />}
    </div>
  )
}

// ============ START / AAN DE SLAG SECTION ============

function StartSection({
  productenCount,
  templatesCount,
  offerteTemplatesCount,
  onNavigate,
  onInstallStarter,
  installedNames,
}: {
  productenCount: number
  templatesCount: number
  offerteTemplatesCount: number
  onNavigate: (tab: CalcSubTab) => void
  onInstallStarter: (starter: StarterTemplate) => Promise<void>
  installedNames: string[]
}) {
  const [installing, setInstalling] = useState<string | null>(null)

  const steps = [
    {
      nr: 1,
      title: 'Producten toevoegen',
      desc: 'Voeg je materialen en diensten toe met inkoop- en verkoopprijzen',
      done: productenCount > 0,
      action: () => onNavigate('producten'),
      actionLabel: 'Naar producten',
    },
    {
      nr: 2,
      title: 'Calculatie templates maken',
      desc: 'Bouw standaard calculaties die je bij elke offerte kunt laden',
      done: templatesCount > 0,
      action: () => onNavigate('templates'),
      actionLabel: 'Naar templates',
    },
    {
      nr: 3,
      title: 'Offerte templates instellen',
      desc: 'Maak offerte sjablonen met vooringevulde regels',
      done: offerteTemplatesCount > 0,
      action: () => onNavigate('offerte-tpl'),
      actionLabel: 'Naar offerte templates',
    },
  ]

  const completedSteps = steps.filter((s) => s.done).length
  const progressPct = Math.round((completedSteps / steps.length) * 100)

  const handleInstall = async (starter: StarterTemplate) => {
    setInstalling(starter.naam)
    await onInstallStarter(starter)
    setInstalling(null)
  }

  return (
    <div className="space-y-6">
      {/* Hero intro */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex-shrink-0">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground dark:text-white mb-1">
                Calculatie & Offerte Templates
              </h2>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 leading-relaxed">
                Stel hier je prijsopbouw in. Voeg producten toe, maak calculatie templates
                en offerte sjablonen zodat je in 3 klikken een professionele offerte maakt.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground dark:text-white">
              Instellen in 3 stappen
            </h3>
            <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/60">
              {completedSteps}/{steps.length} klaar
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted dark:bg-muted rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.nr}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-xl border transition-all',
                  step.done
                    ? 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20'
                    : 'border-border dark:border-border hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-950/10'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold flex-shrink-0',
                    step.done
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                      : 'bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground/60'
                  )}
                >
                  {step.done ? <Check className="h-4 w-4" /> : step.nr}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    step.done ? 'text-green-700 dark:text-green-400' : 'text-foreground dark:text-white'
                  )}>
                    {step.title}
                    {step.done && (
                      <Badge variant="secondary" className="ml-2 text-2xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        Klaar
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">{step.desc}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={step.action} className="flex-shrink-0 text-xs">
                  {step.actionLabel}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hoe werkt het — visual flow */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-500" />
            Hoe werkt het calculatiesysteem?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { nr: '1', title: 'Producten', desc: 'Voeg materialen en diensten toe met prijzen', icon: Package, kleur: 'blue' },
              { nr: '2', title: 'Calculatie', desc: 'Maak templates met producten en marges', icon: Calculator, kleur: 'indigo' },
              { nr: '3', title: 'Offerte', desc: 'Kies een template bij het maken van een offerte', icon: Copy, kleur: 'purple' },
              { nr: '4', title: 'Klaar', desc: 'Prijs wordt automatisch berekend en ingevuld', icon: Check, kleur: 'green' },
            ].map((s, i) => (
              <div key={s.nr} className="relative text-center">
                <div className={cn(
                  'mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-2',
                  s.kleur === 'blue' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
                  s.kleur === 'indigo' && 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
                  s.kleur === 'purple' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
                  s.kleur === 'green' && 'bg-green-100 dark:bg-green-900/30 text-green-600',
                )}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-foreground dark:text-white">{s.title}</p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">{s.desc}</p>
                {i < 3 && (
                  <ArrowRight className="hidden sm:block absolute right-[-14px] top-3 h-4 w-4 text-muted-foreground/50 dark:text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Starter templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Snelstart — Kant-en-klare templates
          </CardTitle>
          <CardDescription>
            Installeer een template met 1 klik. Je kunt ze daarna aanpassen aan je eigen prijzen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STARTER_TEMPLATES.map((starter) => {
              const isInstalled = installedNames.includes(starter.naam)
              const isInstalling = installing === starter.naam
              return (
                <div
                  key={starter.naam}
                  className={cn(
                    'rounded-xl border p-4 transition-all',
                    isInstalled
                      ? 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20'
                      : 'border-border dark:border-border hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{starter.icon}</span>
                    {isInstalled && (
                      <Badge variant="secondary" className="text-2xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        <Check className="h-3 w-3 mr-0.5" />
                        Geinstalleerd
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-foreground dark:text-white">{starter.naam}</h4>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5 mb-3">{starter.beschrijving}</p>
                  <div className="text-xs text-muted-foreground/60 dark:text-muted-foreground mb-3">
                    {starter.regels.length} regels
                  </div>
                  {!isInstalled && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      disabled={isInstalling}
                      onClick={() => handleInstall(starter)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      {isInstalling ? 'Installeren...' : 'Installeren'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('producten')}
          className="p-4 rounded-xl border border-border dark:border-border hover:border-blue-300 dark:hover:border-blue-800 transition-all text-left hover:shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="text-2xl font-bold font-mono text-foreground dark:text-white">{productenCount}</span>
          </div>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Producten in catalogus</p>
        </button>
        <button
          onClick={() => onNavigate('templates')}
          className="p-4 rounded-xl border border-border dark:border-border hover:border-blue-300 dark:hover:border-blue-800 transition-all text-left hover:shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="h-4 w-4 text-indigo-500" />
            <span className="text-2xl font-bold font-mono text-foreground dark:text-white">{templatesCount}</span>
          </div>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Calculatie templates</p>
        </button>
        <button
          onClick={() => onNavigate('offerte-tpl')}
          className="p-4 rounded-xl border border-border dark:border-border hover:border-blue-300 dark:hover:border-blue-800 transition-all text-left hover:shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <Copy className="h-4 w-4 text-purple-500" />
            <span className="text-2xl font-bold font-mono text-foreground dark:text-white">{offerteTemplatesCount}</span>
          </div>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Offerte templates</p>
        </button>
      </div>
    </div>
  )
}

// ============ PRODUCTEN SECTION ============

function ProductenSection({
  producten,
  setProducten,
  isLoading,
  categorieen,
  eenheden,
  standaardMarge,
}: {
  producten: CalculatieProduct[]
  setProducten: React.Dispatch<React.SetStateAction<CalculatieProduct[]>>
  isLoading: boolean
  categorieen: string[]
  eenheden: string[]
  standaardMarge: number
}) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editProductId, setEditProductId] = useState<string | null>(null)
  const [productNaam, setProductNaam] = useState('')
  const [productCategorie, setProductCategorie] = useState('')
  const [productEenheid, setProductEenheid] = useState('stuks')
  const [productInkoop, setProductInkoop] = useState(0)
  const [productVerkoop, setProductVerkoop] = useState(0)
  const [productMarge, setProductMarge] = useState(standaardMarge)
  const [productBtw, setProductBtw] = useState(21)
  const [productNotitie, setProductNotitie] = useState('')

  const resetForm = () => {
    setProductNaam('')
    setProductCategorie('')
    setProductEenheid('stuks')
    setProductInkoop(0)
    setProductVerkoop(0)
    setProductMarge(standaardMarge)
    setProductBtw(21)
    setProductNotitie('')
    setEditProductId(null)
    setShowForm(false)
  }

  const handleEdit = (p: CalculatieProduct) => {
    setEditProductId(p.id)
    setProductNaam(p.naam)
    setProductCategorie(p.categorie)
    setProductEenheid(p.eenheid)
    setProductInkoop(p.inkoop_prijs)
    setProductVerkoop(p.verkoop_prijs)
    setProductMarge(p.standaard_marge)
    setProductBtw(p.btw_percentage)
    setProductNotitie(p.notitie)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!productNaam.trim()) {
      toast.error('Vul een productnaam in')
      return
    }
    try {
      setIsSaving(true)
      if (editProductId) {
        const updated = await updateCalculatieProduct(editProductId, {
          naam: productNaam,
          categorie: productCategorie,
          eenheid: productEenheid,
          inkoop_prijs: productInkoop,
          verkoop_prijs: productVerkoop,
          standaard_marge: productMarge,
          btw_percentage: productBtw,
          notitie: productNotitie,
        })
        setProducten((prev) => prev.map((p) => (p.id === editProductId ? updated : p)))
        toast.success('Product bijgewerkt')
      } else {
        const newProduct = await createCalculatieProduct({
          user_id: user?.id || '',
          naam: productNaam,
          categorie: productCategorie,
          eenheid: productEenheid,
          inkoop_prijs: productInkoop,
          verkoop_prijs: productVerkoop,
          standaard_marge: productMarge,
          btw_percentage: productBtw,
          actief: true,
          notitie: productNotitie,
        })
        setProducten((prev) => [...prev, newProduct])
        toast.success('Product toegevoegd aan catalogus')
      }
      resetForm()
    } catch (err) {
      logger.error(err)
      toast.error('Kon product niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Weet je zeker dat je dit product wilt verwijderen?', variant: 'destructive', confirmLabel: 'Verwijderen' })) return
    try {
      await deleteCalculatieProduct(id)
      setProducten((prev) => prev.filter((p) => p.id !== id))
      toast.success('Product verwijderd')
    } catch (err) {
      logger.error(err)
      toast.error('Kon product niet verwijderen')
    }
  }

  const handleToggleActief = async (p: CalculatieProduct) => {
    try {
      const updated = await updateCalculatieProduct(p.id, { actief: !p.actief })
      setProducten((prev) => prev.map((pr) => (pr.id === p.id ? updated : pr)))
    } catch (err) {
      logger.error(err)
    }
  }

  const productenPerCategorie = producten.reduce((acc, p) => {
    const cat = p.categorie || 'Overig'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, CalculatieProduct[]>)

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground dark:text-white">Productcatalogus</h2>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  Voeg je materialen, diensten en producten toe. Deze kun je snel kiezen bij calculaties.
                </p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Product toevoegen
            </Button>
          </div>

          {/* Inline help */}
          {producten.length === 0 && !showForm && (
            <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">
                Tip: Begin met je meestgebruikte producten
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Denk aan: montage-uren, DTP-uren, veelgebruikte folie, dibond platen, LED modules.
                Je hoeft niet alles in een keer toe te voegen — je kunt altijd later bijwerken.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product form */}
      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground dark:text-white">
                {editProductId ? 'Product bewerken' : 'Nieuw product toevoegen'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Productnaam *</Label>
                <Input
                  value={productNaam}
                  onChange={(e) => setProductNaam(e.target.value)}
                  placeholder="Bijv. Dibond plaat 3mm"
                />
                <p className="text-xs text-muted-foreground/60">De naam die je in calculaties ziet</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categorie</Label>
                <Select value={productCategorie} onValueChange={setProductCategorie}>
                  <SelectTrigger><SelectValue placeholder="Kies categorie..." /></SelectTrigger>
                  <SelectContent>
                    {categorieen.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Eenheid</Label>
                <Select value={productEenheid} onValueChange={setProductEenheid}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {eenheden.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Inkoopprijs per eenheid</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60">€</span>
                  <Input
                    type="number"
                    value={productInkoop || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setProductInkoop(val)
                      setProductVerkoop(round2(val * (1 + productMarge / 100)))
                    }}
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground/60">Wat je zelf betaalt</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Marge (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={Math.round(productMarge * 10) / 10 || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setProductMarge(val)
                      setProductVerkoop(round2(productInkoop * (1 + val / 100)))
                    }}
                    step={1}
                    placeholder="35"
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60">%</span>
                </div>
                <p className="text-xs text-muted-foreground/60">Je winstmarge</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Verkoopprijs per eenheid</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60">€</span>
                  <Input
                    type="number"
                    value={productVerkoop || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setProductVerkoop(val)
                      if (productInkoop > 0) {
                        setProductMarge(((val - productInkoop) / productInkoop) * 100)
                      }
                    }}
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground/60">Wat de klant betaalt</p>
              </div>
            </div>

            {/* Margin preview */}
            {productInkoop > 0 && productVerkoop > 0 && (
              <div className="p-3 rounded-lg bg-background dark:bg-muted/50 flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Winst per eenheid:</span>
                <span className={cn(
                  'font-semibold',
                  productVerkoop - productInkoop > 0 ? 'text-green-600' : 'text-red-500'
                )}>
                  {formatCurrency(productVerkoop - productInkoop)}
                </span>
                <span className="text-muted-foreground">Marge:</span>
                <span className={cn(
                  'font-semibold',
                  productMarge > 0 ? 'text-green-600' : 'text-red-500'
                )}>
                  {Math.round(productMarge)}%
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">BTW tarief</Label>
                <Select value={String(productBtw)} onValueChange={(v) => setProductBtw(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="21">21% (standaard)</SelectItem>
                    <SelectItem value="9">9% (verlaagd)</SelectItem>
                    <SelectItem value="0">0% (vrijgesteld)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notitie (optioneel)</Label>
                <Input
                  value={productNotitie}
                  onChange={(e) => setProductNotitie(e.target.value)}
                  placeholder="Eventuele toelichting..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Annuleren
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !productNaam.trim()}>
                <Save className="h-4 w-4 mr-1.5" />
                {editProductId ? 'Bijwerken' : 'Toevoegen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product list */}
      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Laden...</CardContent></Card>
      ) : producten.length === 0 && !showForm ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-blue-500/40 opacity-30" />
            </div>
            <p className="text-sm font-medium text-foreground/70 dark:text-muted-foreground/50 mb-1">
              Nog geen producten in je catalogus
            </p>
            <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground mb-4">
              Voeg je eerste product toe om te beginnen met calculeren.
            </p>
            <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Eerste product toevoegen
            </Button>
          </CardContent>
        </Card>
      ) : producten.length > 0 ? (
        <div className="space-y-4">
          {(Object.entries(productenPerCategorie) as [string, CalculatieProduct[]][]).map(([categorie, prods]) => (
            <Card key={categorie}>
              <CardContent className="p-0">
                <div className="px-4 py-2.5 border-b border-border dark:border-border bg-background/50 dark:bg-muted/30">
                  <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-label">
                    {categorie} <span className="text-muted-foreground/60 dark:text-muted-foreground font-normal">({prods.length})</span>
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border dark:border-border">
                        <th className="text-left px-4 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label">Product</th>
                        <th className="text-center px-3 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-20">Eenheid</th>
                        <th className="text-right px-3 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-24">Inkoop</th>
                        <th className="text-right px-3 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-24">Verkoop</th>
                        <th className="text-right px-3 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-20">Marge</th>
                        <th className="text-center px-3 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-16">Actief</th>
                        <th className="w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {prods.map((p) => (
                        <tr key={p.id} className="border-t border-border dark:border-border/50 hover:bg-background dark:hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-foreground dark:text-white">{p.naam}</span>
                            {p.notitie && <span className="block text-xs text-muted-foreground/60 dark:text-muted-foreground">{p.notitie}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center text-muted-foreground dark:text-muted-foreground/60">{p.eenheid}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground dark:text-muted-foreground/60">{formatCurrency(p.inkoop_prijs)}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-foreground dark:text-muted-foreground/20">{formatCurrency(p.verkoop_prijs)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={p.standaard_marge > 0 ? 'font-medium text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                              {Math.round(p.standaard_marge)}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Switch checked={p.actief} onCheckedChange={() => handleToggleActief(p)} />
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} className="h-7 w-7 text-muted-foreground/60 hover:text-blue-500">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-7 w-7 text-muted-foreground/60 hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ============ TEMPLATES SECTION ============

function TemplatesSection({
  templates,
  setTemplates,
  producten,
  isLoading,
  categorieen,
  eenheden,
  standaardMarge,
  starterTemplates,
  installedNames,
  onInstallStarter,
}: {
  templates: CalculatieTemplate[]
  setTemplates: React.Dispatch<React.SetStateAction<CalculatieTemplate[]>>
  producten: CalculatieProduct[]
  isLoading: boolean
  categorieen: string[]
  eenheden: string[]
  standaardMarge: number
  starterTemplates: StarterTemplate[]
  installedNames: string[]
  onInstallStarter: (starter: StarterTemplate) => Promise<void>
}) {
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const [isSaving, setIsSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showStarters, setShowStarters] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)

  // Form state
  const [tplNaam, setTplNaam] = useState('')
  const [tplBeschrijving, setTplBeschrijving] = useState('')
  const [tplRegels, setTplRegels] = useState<CalculatieRegel[]>([])

  const resetForm = () => {
    setTplNaam('')
    setTplBeschrijving('')
    setTplRegels([])
    setEditId(null)
    setShowForm(false)
  }

  const addRegel = () => {
    setTplRegels([
      ...tplRegels,
      makeRegel({ marge_percentage: standaardMarge, btw_percentage: settings.standaard_btw ?? 21 }),
    ])
  }

  const updateRegel = (id: string, updates: Partial<CalculatieRegel>) => {
    setTplRegels(tplRegels.map((r) => {
      if (r.id !== id) return r
      const updated = { ...r, ...updates }
      if ('inkoop_prijs' in updates && !('verkoop_prijs' in updates)) {
        updated.verkoop_prijs = round2(updated.inkoop_prijs * (1 + updated.marge_percentage / 100))
      }
      if ('marge_percentage' in updates && !('verkoop_prijs' in updates)) {
        updated.verkoop_prijs = round2(updated.inkoop_prijs * (1 + updated.marge_percentage / 100))
      }
      if ('verkoop_prijs' in updates && !('marge_percentage' in updates) && !('inkoop_prijs' in updates)) {
        updated.marge_percentage = updated.inkoop_prijs > 0
          ? ((updated.verkoop_prijs - updated.inkoop_prijs) / updated.inkoop_prijs) * 100
          : 0
      }
      return updated
    }))
  }

  const removeRegel = (id: string) => {
    setTplRegels(tplRegels.filter((r) => r.id !== id))
  }

  const vulRegelMetProduct = (regelId: string, product: CalculatieProduct) => {
    updateRegel(regelId, {
      product_id: product.id,
      product_naam: product.naam,
      categorie: product.categorie,
      eenheid: product.eenheid,
      inkoop_prijs: product.inkoop_prijs,
      verkoop_prijs: product.verkoop_prijs,
      marge_percentage: product.standaard_marge,
      btw_percentage: product.btw_percentage,
    })
  }

  const handleEdit = (t: CalculatieTemplate) => {
    setEditId(t.id)
    setTplNaam(t.naam)
    setTplBeschrijving(t.beschrijving)
    setTplRegels(t.regels.map((r) => ({ ...r, id: r.id || makeRegel({}).id })))
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!tplNaam.trim()) {
      toast.error('Vul een template naam in')
      return
    }
    try {
      setIsSaving(true)
      if (editId) {
        const updated = await updateCalculatieTemplate(editId, {
          naam: tplNaam,
          beschrijving: tplBeschrijving,
          regels: tplRegels,
        })
        setTemplates((prev) => prev.map((t) => (t.id === editId ? updated : t)))
        toast.success('Calculatie template bijgewerkt')
      } else {
        const newTpl = await createCalculatieTemplate({
          user_id: user?.id || '',
          naam: tplNaam,
          beschrijving: tplBeschrijving,
          regels: tplRegels,
          actief: true,
        })
        setTemplates((prev) => [...prev, newTpl])
        toast.success('Calculatie template aangemaakt')
      }
      resetForm()
    } catch (err) {
      logger.error(err)
      toast.error('Kon template niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Weet je zeker dat je deze template wilt verwijderen?', variant: 'destructive', confirmLabel: 'Verwijderen' })) return
    try {
      await deleteCalculatieTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success('Template verwijderd')
    } catch (err) {
      toast.error('Kon template niet verwijderen')
    }
  }

  const handleToggleActief = async (t: CalculatieTemplate) => {
    try {
      const updated = await updateCalculatieTemplate(t.id, { actief: !t.actief })
      setTemplates((prev) => prev.map((tp) => (tp.id === t.id ? updated : tp)))
    } catch (err) {
      logger.error(err)
    }
  }

  const berekenTotalen = (regels: CalculatieRegel[]) => {
    let inkoop = 0
    let verkoop = 0
    regels.forEach((r) => {
      inkoop += round2(r.aantal * r.inkoop_prijs)
      const rv = round2(r.aantal * r.verkoop_prijs)
      verkoop += round2(rv - rv * (r.korting_percentage / 100))
    })
    return { inkoop: round2(inkoop), verkoop: round2(verkoop), marge: round2(verkoop - inkoop) }
  }

  const handleInstall = async (starter: StarterTemplate) => {
    setInstalling(starter.naam)
    await onInstallStarter(starter)
    setInstalling(null)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground dark:text-white">Calculatie Templates</h2>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  Bouw standaard calculaties die je snel kunt laden bij het maken van een offerte.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStarters(!showStarters)}
                className="text-xs"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                Snelstart
              </Button>
              <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Template maken
              </Button>
            </div>
          </div>

          {/* Inline help */}
          {templates.length === 0 && !showForm && !showStarters && (
            <div className="mt-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
              <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium mb-1">
                Wat is een calculatie template?
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">
                Een template is een vooraf samengestelde berekening. Bijv. voor "Gevelreclame" heb je
                altijd ontwerp, materiaal en montage nodig. Door dit als template op te slaan, kun je
                bij een offerte met 1 klik alles laden en alleen de aantallen aanpassen.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Starter templates panel */}
      {showStarters && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground dark:text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Kant-en-klare templates installeren
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowStarters(false)} className="text-xs">
                Sluiten
              </Button>
            </div>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mb-4">
              Klik op "Installeren" om een template toe te voegen. Je kunt de prijzen daarna aanpassen.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {starterTemplates.map((starter) => {
                const isInstalled = installedNames.includes(starter.naam)
                return (
                  <div
                    key={starter.naam}
                    className={cn(
                      'rounded-xl border p-3 transition-all',
                      isInstalled
                        ? 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20'
                        : 'border-border dark:border-border hover:border-indigo-300'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{starter.icon}</span>
                      <h4 className="text-sm font-medium text-foreground dark:text-white">{starter.naam}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mb-2">{starter.regels.length} regels</p>
                    {isInstalled ? (
                      <Badge variant="secondary" className="text-2xs bg-green-100 text-green-700">
                        <Check className="h-3 w-3 mr-0.5" /> Geinstalleerd
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7"
                        disabled={installing === starter.naam}
                        onClick={() => handleInstall(starter)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {installing === starter.naam ? 'Bezig...' : 'Installeren'}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template form */}
      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground dark:text-white">
              {editId ? 'Template bewerken' : 'Nieuwe calculatie template'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Template naam *</Label>
                <Input
                  value={tplNaam}
                  onChange={(e) => setTplNaam(e.target.value)}
                  placeholder="Bijv. Standaard gevelreclame"
                />
                <p className="text-xs text-muted-foreground/60">Herkenbare naam voor deze calculatie</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Beschrijving</Label>
                <Input
                  value={tplBeschrijving}
                  onChange={(e) => setTplBeschrijving(e.target.value)}
                  placeholder="Korte uitleg waarvoor..."
                />
              </div>
            </div>

            <Separator />

            {/* Calculatie regels */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Calculatie regels</Label>
                {producten.length > 0 && (
                  <p className="text-xs text-muted-foreground/60">
                    Klik op het product-icoon om uit je catalogus te kiezen
                  </p>
                )}
              </div>

              {tplRegels.length === 0 ? (
                <div className="p-6 rounded-xl border-2 border-dashed border-border dark:border-border text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/50 dark:text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mb-3">
                    Voeg regels toe aan je template. Elke regel is een product of dienst met prijs.
                  </p>
                  <Button variant="outline" size="sm" onClick={addRegel} className="text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Eerste regel toevoegen
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-border dark:border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-background dark:bg-muted/50 border-b border-border dark:border-border">
                          <th className="text-left px-3 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label min-w-[180px]">Product / Dienst</th>
                          <th className="text-center px-2 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-16">Aantal</th>
                          <th className="text-center px-2 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-16">Eenh.</th>
                          <th className="text-right px-2 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-20">Inkoop</th>
                          <th className="text-right px-2 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-20">Verkoop</th>
                          <th className="text-right px-2 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-16">Marge</th>
                          <th className="text-right px-2 py-2 font-bold text-text-tertiary text-xs uppercase tracking-label w-20">Subtotaal</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {tplRegels.map((regel) => (
                          <tr key={regel.id} className="border-t border-border dark:border-border hover:bg-background/50 dark:hover:bg-muted/20">
                            <td className="px-1 py-1.5">
                              <div className="flex items-center gap-1">
                                {producten.length > 0 && (
                                  <Select
                                    value={regel.product_id || '__custom__'}
                                    onValueChange={(val) => {
                                      if (val === '__custom__') {
                                        updateRegel(regel.id, { product_id: undefined })
                                      } else {
                                        const p = producten.find((pr) => pr.id === val)
                                        if (p) vulRegelMetProduct(regel.id, p)
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="border-0 bg-transparent shadow-none h-7 w-8 px-0.5 flex-shrink-0">
                                      <Package className="h-3 w-3 text-muted-foreground/60" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__custom__">Handmatig invoeren</SelectItem>
                                      {producten.filter(p => p.actief).map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.naam} — {formatCurrency(p.verkoop_prijs)}/{p.eenheid}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                <Input
                                  value={regel.product_naam}
                                  onChange={(e) => updateRegel(regel.id, { product_naam: e.target.value })}
                                  placeholder="Productnaam..."
                                  className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-7 text-xs"
                                />
                              </div>
                            </td>
                            <td className="px-1 py-1.5">
                              <Input
                                type="number"
                                value={regel.aantal || ''}
                                onChange={(e) => updateRegel(regel.id, { aantal: parseFloat(e.target.value) || 0 })}
                                min={0}
                                className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-7 text-xs text-center"
                              />
                            </td>
                            <td className="px-1 py-1.5">
                              <Select value={regel.eenheid} onValueChange={(v) => updateRegel(regel.id, { eenheid: v })}>
                                <SelectTrigger className="border-0 bg-transparent shadow-none h-7 text-2xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {eenheden.map((e) => (
                                    <SelectItem key={e} value={e}>{e}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-1 py-1.5">
                              <Input
                                type="number"
                                value={regel.inkoop_prijs || ''}
                                onChange={(e) => updateRegel(regel.id, { inkoop_prijs: parseFloat(e.target.value) || 0 })}
                                min={0}
                                step={0.01}
                                className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-7 text-xs text-right"
                                placeholder="0,00"
                              />
                            </td>
                            <td className="px-1 py-1.5">
                              <Input
                                type="number"
                                value={regel.verkoop_prijs || ''}
                                onChange={(e) => updateRegel(regel.id, { verkoop_prijs: parseFloat(e.target.value) || 0 })}
                                min={0}
                                step={0.01}
                                className="border-0 bg-transparent shadow-none focus-visible:ring-1 h-7 text-xs text-right"
                                placeholder="0,00"
                              />
                            </td>
                            <td className="px-1 py-1.5">
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={Math.round(regel.marge_percentage * 10) / 10 || ''}
                                  onChange={(e) => updateRegel(regel.id, { marge_percentage: parseFloat(e.target.value) || 0 })}
                                  className={cn(
                                    'border-0 bg-transparent shadow-none focus-visible:ring-1 h-7 text-xs text-right pr-4',
                                    regel.marge_percentage > 0 ? 'text-green-600 dark:text-green-400' : ''
                                  )}
                                />
                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-2xs text-muted-foreground/60">%</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-right text-xs font-medium text-foreground/70 dark:text-muted-foreground/50 whitespace-nowrap">
                              {formatCurrency(regel.aantal * regel.verkoop_prijs)}
                            </td>
                            <td className="px-1 py-1.5">
                              <Button variant="ghost" size="icon" onClick={() => removeRegel(regel.id)} className="h-6 w-6 text-muted-foreground/60 hover:text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  {(() => {
                    const t = berekenTotalen(tplRegels)
                    return (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background dark:bg-muted/50">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Inkoop: <strong className="text-foreground/70 dark:text-muted-foreground/50">{formatCurrency(t.inkoop)}</strong></span>
                          <span>Verkoop: <strong className="text-foreground/70 dark:text-muted-foreground/50">{formatCurrency(t.verkoop)}</strong></span>
                          <span>
                            Marge: <strong className={t.marge >= 0 ? 'text-green-600' : 'text-red-500'}>
                              {formatCurrency(t.marge)}
                            </strong>
                            {t.inkoop > 0 && (
                              <span className="text-muted-foreground/60 ml-1">
                                ({Math.round((t.marge / t.inkoop) * 100)}%)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })()}

                  <Button variant="outline" size="sm" onClick={addRegel} className="border-dashed text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Regel toevoegen
                  </Button>
                </>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Annuleren</Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !tplNaam.trim()}>
                <Save className="h-4 w-4 mr-1.5" />
                {editId ? 'Bijwerken' : 'Opslaan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Laden...</CardContent></Card>
      ) : templates.length === 0 && !showForm ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-indigo-500/40 opacity-30" />
            </div>
            <p className="text-sm font-medium text-foreground/70 dark:text-muted-foreground/50 mb-1">
              Nog geen calculatie templates
            </p>
            <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground mb-4">
              Maak je eerste template of installeer een kant-en-klare.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowStarters(true)}>
                <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                Snelstart templates
              </Button>
              <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
                <Plus className="h-4 w-4 mr-1.5" />
                Zelf maken
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : templates.length > 0 ? (
        <div className="space-y-3">
          {templates.map((t) => {
            const totalen = berekenTotalen(t.regels)
            return (
              <Card key={t.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground dark:text-white">{t.naam}</p>
                        {!t.actief && (
                          <Badge variant="secondary" className="text-2xs">Inactief</Badge>
                        )}
                      </div>
                      {t.beschrijving && (
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">{t.beschrijving}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/60">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {t.regels.length} regel(s)
                        </span>
                        <span>Inkoop {formatCurrency(totalen.inkoop)}</span>
                        <span className="font-medium text-muted-foreground dark:text-muted-foreground/50">Verkoop {formatCurrency(totalen.verkoop)}</span>
                        <span className={totalen.marge >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                          Marge {formatCurrency(totalen.marge)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <Switch checked={t.actief} onCheckedChange={() => handleToggleActief(t)} />
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)} className="h-8 w-8 text-muted-foreground/60 hover:text-blue-500">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="h-8 w-8 text-muted-foreground/60 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

// ============ OFFERTE TEMPLATES SUB-SECTION ============

function OfferteTemplatesSubSection({
  offerteTemplates,
  setOfferteTemplates,
  isLoading,
}: {
  offerteTemplates: OfferteTemplate[]
  setOfferteTemplates: React.Dispatch<React.SetStateAction<OfferteTemplate[]>>
  isLoading: boolean
}) {
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const [isSaving, setIsSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [tplNaam, setTplNaam] = useState('')
  const [tplBeschrijving, setTplBeschrijving] = useState('')
  const [tplRegels, setTplRegels] = useState<OfferteTemplateRegel[]>([])

  const regelVelden = settings.offerte_regel_velden || ['Materiaal', 'Lay-out', 'Montage', 'Opmerking']

  const resetForm = () => {
    setTplNaam('')
    setTplBeschrijving('')
    setTplRegels([])
    setEditId(null)
    setShowForm(false)
  }

  const addRegel = (soort: 'prijs' | 'tekst') => {
    setTplRegels([
      ...tplRegels,
      {
        soort,
        beschrijving: '',
        extra_velden: {},
        aantal: soort === 'prijs' ? 1 : 0,
        eenheidsprijs: 0,
        btw_percentage: soort === 'prijs' ? (settings.standaard_btw || 21) : 0,
        korting_percentage: 0,
      },
    ])
  }

  const updateRegel = (index: number, updates: Partial<OfferteTemplateRegel>) => {
    setTplRegels(tplRegels.map((r, i) => (i === index ? { ...r, ...updates } : r)))
  }

  const removeRegel = (index: number) => {
    setTplRegels(tplRegels.filter((_, i) => i !== index))
  }

  const handleEdit = (t: OfferteTemplate) => {
    setEditId(t.id)
    setTplNaam(t.naam)
    setTplBeschrijving(t.beschrijving)
    setTplRegels([...t.regels])
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!tplNaam.trim()) {
      toast.error('Vul een template naam in')
      return
    }
    try {
      setIsSaving(true)
      if (editId) {
        const updated = await updateOfferteTemplate(editId, {
          naam: tplNaam,
          beschrijving: tplBeschrijving,
          regels: tplRegels,
        })
        setOfferteTemplates((prev) => prev.map((t) => (t.id === editId ? updated : t)))
        toast.success('Template bijgewerkt')
      } else {
        const newTpl = await createOfferteTemplate({
          user_id: user?.id || '',
          naam: tplNaam,
          beschrijving: tplBeschrijving,
          regels: tplRegels,
          actief: true,
        })
        setOfferteTemplates((prev) => [...prev, newTpl])
        toast.success('Template aangemaakt')
      }
      resetForm()
    } catch (err) {
      logger.error(err)
      toast.error('Kon template niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Weet je zeker dat je deze template wilt verwijderen?', variant: 'destructive', confirmLabel: 'Verwijderen' })) return
    try {
      await deleteOfferteTemplate(id)
      setOfferteTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success('Template verwijderd')
    } catch (err) {
      toast.error('Kon template niet verwijderen')
    }
  }

  const handleToggleActief = async (t: OfferteTemplate) => {
    try {
      const updated = await updateOfferteTemplate(t.id, { actief: !t.actief })
      setOfferteTemplates((prev) => prev.map((tp) => (tp.id === t.id ? updated : tp)))
    } catch (err) {
      logger.error(err)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                <Copy className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground dark:text-white">Offerte Templates</h2>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  Maak herbruikbare offerte sjablonen. Bij een offerte importeer je een template zodat de regels automatisch worden ingevuld.
                </p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Template maken
            </Button>
          </div>

          {offerteTemplates.length === 0 && !showForm && (
            <div className="mt-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900">
              <p className="text-sm text-purple-800 dark:text-purple-300 font-medium mb-1">
                Verschil met calculatie templates
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Een <strong>calculatie template</strong> berekent de kostprijs met inkoop, marge en verkoop.
                Een <strong>offerte template</strong> bevat de offerte-regels zoals de klant ze ziet —
                met omschrijving, aantal en prijs. Gebruik offerte templates voor terugkerende opdrachten.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground dark:text-white">
              {editId ? 'Template bewerken' : 'Nieuwe offerte template'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Template naam *</Label>
                <Input
                  value={tplNaam}
                  onChange={(e) => setTplNaam(e.target.value)}
                  placeholder="Bijv. Autobelettering"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Beschrijving</Label>
                <Input
                  value={tplBeschrijving}
                  onChange={(e) => setTplBeschrijving(e.target.value)}
                  placeholder="Korte uitleg waarvoor..."
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-xs font-medium">Template regels</Label>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                Voeg de regels toe die standaard op de offerte komen wanneer je deze template importeert.
              </p>

              {tplRegels.length === 0 ? (
                <div className="p-6 rounded-xl border-2 border-dashed border-border dark:border-border text-center">
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mb-3">
                    Voeg een prijsregel of tekstregel toe.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => addRegel('prijs')} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Prijsregel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addRegel('tekst')} className="text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Tekstregel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {tplRegels.map((regel, idx) => (
                      <div
                        key={idx}
                        className="bg-card rounded-xl border border-border dark:border-border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={regel.soort === 'prijs' ? 'default' : 'secondary'} className="text-2xs">
                              {regel.soort === 'prijs' ? 'Prijsregel' : 'Tekstregel'}
                            </Badge>
                            <span className="text-xs text-muted-foreground/60">#{idx + 1}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeRegel(idx)} className="h-6 w-6 text-muted-foreground/60 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          value={regel.beschrijving}
                          onChange={(e) => updateRegel(idx, { beschrijving: e.target.value })}
                          placeholder="Omschrijving..."
                          className="text-sm"
                        />
                        {regelVelden.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {regelVelden.map((veld) => (
                              <div key={veld} className="space-y-0.5">
                                <Label className="text-2xs text-muted-foreground/60">{veld}</Label>
                                <Input
                                  value={regel.extra_velden[veld] || ''}
                                  onChange={(e) =>
                                    updateRegel(idx, {
                                      extra_velden: { ...regel.extra_velden, [veld]: e.target.value },
                                    })
                                  }
                                  placeholder={`${veld}...`}
                                  className="text-xs h-8"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {regel.soort === 'prijs' && (
                          <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-0.5">
                              <Label className="text-2xs text-muted-foreground/60">Aantal</Label>
                              <Input
                                type="number"
                                value={regel.aantal || ''}
                                onChange={(e) => updateRegel(idx, { aantal: parseFloat(e.target.value) || 0 })}
                                className="text-xs h-8"
                                min={0}
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-2xs text-muted-foreground/60">Prijs</Label>
                              <Input
                                type="number"
                                value={regel.eenheidsprijs || ''}
                                onChange={(e) => updateRegel(idx, { eenheidsprijs: parseFloat(e.target.value) || 0 })}
                                className="text-xs h-8"
                                min={0}
                                step={0.01}
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-2xs text-muted-foreground/60">BTW %</Label>
                              <Input
                                type="number"
                                value={regel.btw_percentage}
                                onChange={(e) => updateRegel(idx, { btw_percentage: parseFloat(e.target.value) || 0 })}
                                className="text-xs h-8"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-2xs text-muted-foreground/60">Korting %</Label>
                              <Input
                                type="number"
                                value={regel.korting_percentage || ''}
                                onChange={(e) => updateRegel(idx, { korting_percentage: parseFloat(e.target.value) || 0 })}
                                className="text-xs h-8"
                                min={0}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addRegel('prijs')} className="text-xs border-dashed">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Prijsregel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addRegel('tekst')} className="text-xs border-dashed">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Tekstregel
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Annuleren</Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !tplNaam.trim()}>
                <Save className="h-4 w-4 mr-1.5" />
                {editId ? 'Bijwerken' : 'Opslaan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Laden...</CardContent></Card>
      ) : offerteTemplates.length === 0 && !showForm ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-4">
              <Copy className="h-8 w-8 text-purple-500/40 opacity-30" />
            </div>
            <p className="text-sm font-medium text-foreground/70 dark:text-muted-foreground/50 mb-1">
              Nog geen offerte templates
            </p>
            <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground mb-4">
              Maak templates aan zodat je bij het maken van een offerte snel regels kunt importeren.
            </p>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Eerste template maken
            </Button>
          </CardContent>
        </Card>
      ) : offerteTemplates.length > 0 ? (
        <div className="space-y-3">
          {offerteTemplates.map((t) => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground dark:text-white">{t.naam}</p>
                      {!t.actief && <Badge variant="secondary" className="text-2xs">Inactief</Badge>}
                    </div>
                    {t.beschrijving && (
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">{t.beschrijving}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground/60">
                      <span>{t.regels.length} regel(s)</span>
                      <span>{t.regels.filter((r) => r.soort === 'prijs').length} prijs</span>
                      <span>{t.regels.filter((r) => r.soort === 'tekst').length} tekst</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={t.actief} onCheckedChange={() => handleToggleActief(t)} />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(t)} className="h-8 w-8 text-muted-foreground/60 hover:text-blue-500">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="h-8 w-8 text-muted-foreground/60 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ============ INSTELLINGEN SECTION ============

function InstellingenSection() {
  const { settings, updateSettings } = useAppSettings()
  const [isSaving, setIsSaving] = useState(false)

  const [standaardMarge, setStandaardMarge] = useState(settings.calculatie_standaard_marge ?? 35)
  const [categorieen, setCategorieen] = useState<string[]>(
    settings.calculatie_categorieen || ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig']
  )
  const [eenheden, setEenheden] = useState<string[]>(
    settings.calculatie_eenheden || ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set']
  )
  const [toonInkoopInOfferte, setToonInkoopInOfferte] = useState(settings.calculatie_toon_inkoop_in_offerte ?? false)
  const [toonM2, setToonM2] = useState(settings.offerte_toon_m2 ?? true)
  const [regelVelden, setRegelVelden] = useState<string[]>(
    settings.offerte_regel_velden || ['Materiaal', 'Lay-out', 'Montage', 'Opmerking']
  )
  const [urenVelden, setUrenVelden] = useState<string[]>(
    (settings.calculatie_uren_velden && settings.calculatie_uren_velden.length > 0)
      ? settings.calculatie_uren_velden
      : ['Montage', 'Voorbereiding', 'Ontwerp & DTP', 'Applicatie']
  )
  const [nieuwVeld, setNieuwVeld] = useState('')
  const [nieuwUrenVeld, setNieuwUrenVeld] = useState('')
  const [nieuweCat, setNieuweCat] = useState('')
  const [nieuweEenheid, setNieuweEenheid] = useState('')

  useEffect(() => {
    setStandaardMarge(settings.calculatie_standaard_marge ?? 35)
    setCategorieen(settings.calculatie_categorieen || ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig'])
    setEenheden(settings.calculatie_eenheden || ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set'])
    setToonInkoopInOfferte(settings.calculatie_toon_inkoop_in_offerte ?? false)
    setToonM2(settings.offerte_toon_m2 ?? true)
    setRegelVelden(settings.offerte_regel_velden || ['Materiaal', 'Lay-out', 'Montage', 'Opmerking'])
    setUrenVelden((settings.calculatie_uren_velden && settings.calculatie_uren_velden.length > 0)
      ? settings.calculatie_uren_velden
      : ['Montage', 'Voorbereiding', 'Ontwerp & DTP', 'Applicatie']
    )
  }, [settings])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await updateSettings({
        calculatie_standaard_marge: standaardMarge,
        calculatie_categorieen: categorieen,
        calculatie_eenheden: eenheden,
        calculatie_toon_inkoop_in_offerte: toonInkoopInOfferte,
        offerte_toon_m2: toonM2,
        offerte_regel_velden: regelVelden,
        calculatie_uren_velden: urenVelden,
      })
      toast.success('Instellingen opgeslagen')
    } catch (err) {
      logger.error(err)
      toast.error('Kon instellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-muted-foreground to-foreground/60 shadow-md">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground dark:text-white">Basisinstellingen</h2>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                Standaard waarden, categorieën, eenheden en offerte velden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standaard waarden */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground dark:text-white">Standaard waarden</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Standaard marge (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={standaardMarge}
                  onChange={(e) => setStandaardMarge(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={500}
                  step={1}
                  className="w-28"
                />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  Wordt ingevuld bij nieuwe calculatieregels
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Toon inkoopprijs in offerte</Label>
              <div className="flex items-center gap-3">
                <Switch checked={toonInkoopInOfferte} onCheckedChange={setToonInkoopInOfferte} />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  {toonInkoopInOfferte ? 'Zichtbaar voor klant' : 'Verborgen (aanbevolen)'}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Toon m² berekening bij afmetingen</Label>
              <div className="flex items-center gap-3">
                <Switch checked={toonM2} onCheckedChange={setToonM2} />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  {toonM2 ? 'Toon m² achter breedte × hoogte' : 'Verborgen — alleen mm weergeven'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categorieën */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground dark:text-white">Product categorieën</h3>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
              Categorieën helpen je producten te organiseren. Bijv. Materiaal, Arbeid, Transport.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categorieen.map((cat) => (
              <Badge key={cat} variant="secondary" className="gap-1 pl-2.5 pr-1 py-1">
                {cat}
                <button
                  onClick={() => setCategorieen(categorieen.filter((c) => c !== cat))}
                  className="ml-1 hover:bg-secondary dark:hover:bg-muted rounded-full p-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={nieuweCat}
              onChange={(e) => setNieuweCat(e.target.value)}
              placeholder="Nieuwe categorie..."
              className="w-48"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nieuweCat.trim() && !categorieen.includes(nieuweCat.trim())) {
                  setCategorieen([...categorieen, nieuweCat.trim()])
                  setNieuweCat('')
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (nieuweCat.trim() && !categorieen.includes(nieuweCat.trim())) {
                  setCategorieen([...categorieen, nieuweCat.trim()])
                  setNieuweCat('')
                }
              }}
              disabled={!nieuweCat.trim()}
            >
              <Plus className="h-4 w-4 mr-1" /> Toevoegen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Eenheden */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground dark:text-white">Eenheden</h3>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
              Eenheden bepalen hoe je producten telt. Bijv. stuks, m², uur.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {eenheden.map((e) => (
              <Badge key={e} variant="outline" className="gap-1 pl-2.5 pr-1 py-1">
                {e}
                <button
                  onClick={() => setEenheden(eenheden.filter((ee) => ee !== e))}
                  className="ml-1 hover:bg-secondary dark:hover:bg-muted rounded-full p-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={nieuweEenheid}
              onChange={(e) => setNieuweEenheid(e.target.value)}
              placeholder="Nieuwe eenheid..."
              className="w-48"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nieuweEenheid.trim() && !eenheden.includes(nieuweEenheid.trim())) {
                  setEenheden([...eenheden, nieuweEenheid.trim()])
                  setNieuweEenheid('')
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (nieuweEenheid.trim() && !eenheden.includes(nieuweEenheid.trim())) {
                  setEenheden([...eenheden, nieuweEenheid.trim()])
                  setNieuweEenheid('')
                }
              }}
              disabled={!nieuweEenheid.trim()}
            >
              <Plus className="h-4 w-4 mr-1" /> Toevoegen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Offerte regel velden */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground dark:text-white">Offerte regel velden</h3>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
              Extra tekstvelden per offerte-regel. Deze verschijnen onder de omschrijving. Bijv. Materiaal, Lay-out, Montage.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {regelVelden.map((veld) => (
              <Badge key={veld} variant="secondary" className="gap-1 pl-2.5 pr-1 py-1">
                {veld}
                <button
                  onClick={() => setRegelVelden(regelVelden.filter((v) => v !== veld))}
                  className="ml-1 hover:bg-secondary dark:hover:bg-muted rounded-full p-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {regelVelden.length === 0 && (
              <span className="text-xs text-muted-foreground/60 italic">Geen extra velden</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={nieuwVeld}
              onChange={(e) => setNieuwVeld(e.target.value)}
              placeholder="Nieuw veld bijv. Montage..."
              className="w-48"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nieuwVeld.trim() && !regelVelden.includes(nieuwVeld.trim())) {
                  setRegelVelden([...regelVelden, nieuwVeld.trim()])
                  setNieuwVeld('')
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (nieuwVeld.trim() && !regelVelden.includes(nieuwVeld.trim())) {
                  setRegelVelden([...regelVelden, nieuwVeld.trim()])
                  setNieuwVeld('')
                }
              }}
              disabled={!nieuwVeld.trim()}
            >
              <Plus className="h-4 w-4 mr-1" /> Toevoegen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uren overzicht velden */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground dark:text-white flex items-center gap-2">
              Uren overzicht velden
              <Badge variant="outline" className="text-2xs px-1.5 py-0 font-normal text-blue-600 border-blue-200">Sidebar</Badge>
            </h3>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
              Kies welke uren-categorieën je wilt zien in het offerte-overzicht.
            </p>
            <p className="text-xs text-muted-foreground/50 dark:text-muted-foreground/40 mt-0.5">
              Deze categorieën worden automatisch herkend uit je offerte-regels en getoond als totaal in de sidebar.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Links: tags en toevoegen */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {urenVelden.map((veld, i) => {
                  const pastelColors = [
                    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
                    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
                    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
                    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
                    'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
                  ]
                  return (
                    <Badge key={veld} variant="secondary" className={`gap-1 pl-2.5 pr-1 py-1 ${pastelColors[i % pastelColors.length]}`}>
                      {veld}
                      <button
                        onClick={() => setUrenVelden(urenVelden.filter((v) => v !== veld))}
                        className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
                {urenVelden.length === 0 && (
                  <span className="text-xs text-muted-foreground/60 italic">Geen categorieën — voeg er een toe</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={nieuwUrenVeld}
                  onChange={(e) => setNieuwUrenVeld(e.target.value)}
                  placeholder="Bijv. Montage buiten, Installatie..."
                  className="w-48"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nieuwUrenVeld.trim() && !urenVelden.includes(nieuwUrenVeld.trim())) {
                      setUrenVelden([...urenVelden, nieuwUrenVeld.trim()])
                      setNieuwUrenVeld('')
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (nieuwUrenVeld.trim() && !urenVelden.includes(nieuwUrenVeld.trim())) {
                      setUrenVelden([...urenVelden, nieuwUrenVeld.trim()])
                      setNieuwUrenVeld('')
                    }
                  }}
                  disabled={!nieuwUrenVeld.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" /> Toevoegen
                </Button>
              </div>
            </div>

            {/* Rechts: live preview */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
              <p className="text-2xs font-bold text-text-tertiary uppercase tracking-label">Uren &amp; Materiaal</p>
              <div className="space-y-1.5">
                {urenVelden.map((veld, i) => {
                  const dummyUren = [5, 3, 4, 2, 6, 1, 8, 7]
                  const uren = dummyUren[i % dummyUren.length]
                  return (
                    <div key={veld} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground/70">
                        <span className="text-xs">&#9201;</span>
                        {veld}
                      </span>
                      <span className="text-foreground dark:text-white font-medium tabular-nums">{uren} uur</span>
                    </div>
                  )
                })}
              </div>
              {urenVelden.length > 0 && (
                <>
                  <div className="border-t border-border/50 pt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="flex items-center gap-2 text-foreground dark:text-white">
                        <span className="text-xs">&#128295;</span>
                        Totaal uren
                      </span>
                      <span className="text-foreground dark:text-white tabular-nums">
                        {urenVelden.reduce((sum, _, i) => sum + [5, 3, 4, 2, 6, 1, 8, 7][i % 8], 0)} uur
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground/70">
                        <span className="text-xs">&#128230;</span>
                        Materiaal
                      </span>
                      <span className="text-foreground dark:text-white font-medium tabular-nums">&euro; 420,00</span>
                    </div>
                  </div>
                </>
              )}
              {urenVelden.length === 0 && (
                <p className="text-xs text-muted-foreground/40 italic text-center py-4">Voeg categorieën toe om de preview te zien</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Opslaan...' : 'Instellingen opslaan'}
        </Button>
      </div>
    </div>
  )
}
