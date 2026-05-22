import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Palette,
  CheckCircle2,
  Sun,
  Sliders,
  Save,
  Type,
  Monitor,
  Plus,
  Mail,
} from 'lucide-react'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { usePalette, APP_THEMES, ACCENT_PALETTES } from '@/contexts/PaletteContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { QUICK_ACTIONS, type QuickActionsPosition } from '@/components/dashboard/FloatingQuickActions'
import { SubTabNav } from './SubTabNav'
import type { SubTab } from './settingsShared'
import {
  FontSize,
  BESCHIKBARE_FONT_SIZES,
  getFontSettings,
  saveFontSettings,
  applyFontSize,
} from './settingsShared'

const ALL_SIDEBAR_ITEMS = [
  // Dashboard staat alleen achter het doen.-logo, niet als nav-item — niet toggable
  { label: 'Projecten', section: 'Werk' },
  { label: 'Offertes', section: 'Werk' },
  { label: 'Facturen', section: 'Werk' },
  { label: 'Klanten', section: 'Werk' },
  { label: 'Werkbonnen', section: 'Werk' },
  { label: 'Planning', section: 'Planning' },
  { label: 'Taken', section: 'Planning' },
  { label: 'Email', section: 'Communicatie' },
  { label: 'Portaal', section: 'Communicatie' },
  { label: 'Financieel', section: 'Beheer' },
  { label: 'Inkoopfacturen', section: 'Beheer' },
  // Visualizer: tijdelijk verborgen tot feature wordt gelanceerd
]

const WEERGAVE_TABS: SubTab[] = [
  { id: 'layout', label: 'Layout', icon: Monitor },
  { id: 'voorkeuren', label: 'Voorkeuren', icon: Sliders },
  { id: 'navigatie', label: 'Navigatie', icon: Settings },
]

export function WeergaveTab() {
  const { settings, updateSettings } = useAppSettings()
  const { appThemeId, setAppThemeId, accentId, setAccentId } = usePalette()
  // Lees opgeslagen sidebar_items en filter items eruit die niet meer bestaan
  // in ALL_SIDEBAR_ITEMS (bijv. verwijderde tools). Als er nog niets is
  // opgeslagen → alles staat default aan. Bewust GEEN auto-merge van nieuwe
  // items: dat triggerde een bug waarbij uitgezette items na opslaan terug
  // werden gezet, omdat ze als 'nieuw' werden gezien.
  const mergeSidebarItems = useCallback((saved: string[] | undefined) => {
    if (!saved || saved.length === 0) return ALL_SIDEBAR_ITEMS.map((i) => i.label)
    const allLabels = ALL_SIDEBAR_ITEMS.map((i) => i.label)
    return saved.filter((s) => allLabels.includes(s))
  }, [])

  const [sidebarItems, setSidebarItems] = useState<string[]>(() => mergeSidebarItems(settings.sidebar_items))
  const [isSavingSidebar, setIsSavingSidebar] = useState(false)

  useEffect(() => {
    setSidebarItems(mergeSidebarItems(settings.sidebar_items))
  }, [settings.sidebar_items, mergeSidebarItems])

  const toggleSidebarItem = (label: string) => {
    setSidebarItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  const handleSaveSidebar = async () => {
    try {
      setIsSavingSidebar(true)
      await updateSettings({ sidebar_items: sidebarItems })
      toast.success('Navigatie opgeslagen — sidebar bijgewerkt')
    } catch (err) {
      logger.error(err)
      toast.error('Kon navigatie niet opslaan')
    } finally {
      setIsSavingSidebar(false)
    }
  }

  const handleResetSidebar = () => {
    setSidebarItems(ALL_SIDEBAR_ITEMS.map((i) => i.label))
  }

  /** Heeft de gebruiker iets gewijzigd t.o.v. de opgeslagen waarde? */
  const hasUnsavedNavChanges = useMemo(() => {
    const savedRaw = settings.sidebar_items
    const saved = Array.isArray(savedRaw) && savedRaw.length > 0
      ? mergeSidebarItems(savedRaw)
      : ALL_SIDEBAR_ITEMS.map(i => i.label)
    if (saved.length !== sidebarItems.length) return true
    const a = new Set(saved)
    return sidebarItems.some(item => !a.has(item))
  }, [sidebarItems, settings.sidebar_items, mergeSidebarItems])

  const [subTab, setSubTab] = useState('layout')
  // Font size state (font family is fixed to Inter)
  const [fontSize, setFontSize] = useState<FontSize>(() => getFontSettings().font_size)
  const { layoutMode, setLayoutMode } = useSidebar()

  const handleSelectFontSize = (size: FontSize) => {
    setFontSize(size)
    applyFontSize(size)
    saveFontSettings({ font_size: size })
    const sizeLabel = BESCHIKBARE_FONT_SIZES.find((s) => s.value === size)?.label ?? size
    toast.success(`Lettergrootte "${sizeLabel}" ingesteld`)
  }

  const [autoCollapse, setAutoCollapse] = useState(() => {
    const stored = localStorage.getItem('doen_autoCollapse')
    return stored !== null ? JSON.parse(stored) : true
  })

  return (
    <>
    <SubTabNav tabs={WEERGAVE_TABS} active={subTab} onChange={setSubTab} variant="underline" />

    {false && subTab === 'thema' && (
    <Card className="doen-slate-surface border-0 shadow-none rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Thema &amp; Kleuren
        </CardTitle>
        <CardDescription>Kies een thema. Elk thema heeft zijn eigen kleuren</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Theme Picker */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Sun className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                App Thema
              </p>
              <p className="text-xs text-muted-foreground">
                Kies een volledig thema. Verandert achtergrond, kaarten, sidebar en sfeer
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {APP_THEMES.map((t) => {
              const isActive = appThemeId === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setAppThemeId(t.id)
                    toast.success(`Thema "${t.naam}" geactiveerd`)
                  }}
                  className={cn(
                    'relative group rounded-xl border-2 p-3 transition-all duration-200 text-left',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/40 hover:shadow-sm'
                  )}
                >
                  {/* Mini UI mockup */}
                  <div
                    className="rounded-lg overflow-hidden mb-2.5 border border-border/30"
                    style={{ background: t.preview.bg }}
                  >
                    <div className="flex h-16">
                      {/* Mini sidebar */}
                      <div
                        className="w-5 flex-shrink-0 border-r"
                        style={{
                          background: t.preview.sidebar,
                          borderColor: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        }}
                      >
                        <div className="mt-2 mx-1 space-y-1">
                          <div className="h-1 rounded-full" style={{ background: t.preview.accent, opacity: 0.7 }} />
                          <div className="h-1 rounded-full" style={{ background: t.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
                          <div className="h-1 rounded-full" style={{ background: t.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
                        </div>
                      </div>
                      {/* Mini content */}
                      <div className="flex-1 p-1.5 space-y-1.5">
                        <div className="h-1.5 w-10 rounded-full" style={{ background: t.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }} />
                        <div
                          className="rounded-md p-1"
                          style={{
                            background: t.preview.card,
                            border: `1px solid ${t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                          }}
                        >
                          <div className="h-1 w-8 rounded-full" style={{ background: t.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }} />
                          <div className="h-1 w-12 rounded-full mt-0.5" style={{ background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }} />
                        </div>
                        <div className="flex gap-1">
                          <div className="h-2 w-6 rounded" style={{ background: t.preview.accent, opacity: 0.8 }} />
                          <div className="h-2 w-6 rounded" style={{ background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>
                    {t.naam}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    {t.beschrijving}
                  </p>
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Accent kleur picker */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Accentkleur
              </p>
              <p className="text-xs text-muted-foreground">
                Kies een accentkleur. Verandert de sidebar indicator, logo en focus ring
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {ACCENT_PALETTES.map((a) => {
              const isActive = accentId === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setAccentId(a.id)
                    toast.success(`Accent "${a.naam}" geactiveerd`)
                  }}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 transition-all duration-200',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40 hover:shadow-sm'
                  )}
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{ background: a.gradientStart }}
                  />
                  <span className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                    {a.naam}
                  </span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-1" />}
                </button>
              )
            })}
          </div>
        </div>

      </CardContent>
    </Card>
    )}

    {subTab === 'layout' && (
    <Card className="doen-slate-surface border-0 shadow-none rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Layout &amp; Lettergrootte
        </CardTitle>
        <CardDescription>Navigatie-indeling en tekstgrootte</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layout Mode */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Navigatie layout
              </p>
              <p className="text-xs text-muted-foreground">
                Kies tussen een zijbalk of horizontale navigatie bovenin
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setLayoutMode('sidebar')
                toast.success('Zijbalk navigatie ingesteld')
              }}
              className={cn(
                'relative rounded-xl border-2 p-4 transition-all duration-200 text-left',
                layoutMode === 'sidebar'
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/40 hover:shadow-sm'
              )}
            >
              {/* Mini mockup - sidebar layout */}
              <div className="rounded-lg overflow-hidden mb-3 border border-border/30 bg-muted/30">
                <div className="flex h-14">
                  <div className="w-6 border-r border-border/30 bg-muted/50 flex flex-col items-center pt-1.5 gap-1">
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-0.5 rounded-full bg-primary/50" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="flex-1 p-1.5">
                    <div className="w-full h-1 bg-muted-foreground/10 rounded mb-1.5" />
                    <div className="grid grid-cols-3 gap-1">
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                    </div>
                  </div>
                </div>
              </div>
              <p className={cn('text-sm font-semibold', layoutMode === 'sidebar' ? 'text-primary' : 'text-foreground')}>
                Zijbalk
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Navigatie aan de linkerkant
              </p>
              {layoutMode === 'sidebar' && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>

            <button
              onClick={() => {
                setLayoutMode('topnav')
                toast.success('Top navigatie ingesteld')
              }}
              className={cn(
                'relative rounded-xl border-2 p-4 transition-all duration-200 text-left',
                layoutMode === 'topnav'
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/40 hover:shadow-sm'
              )}
            >
              {/* Mini mockup - topnav layout */}
              <div className="rounded-lg overflow-hidden mb-3 border border-border/30 bg-muted/30">
                <div className="flex flex-col h-14">
                  <div className="h-3 border-b border-border/30 bg-muted/50 flex items-center px-1.5 gap-1">
                    <div className="w-2 h-1 rounded-sm bg-primary/50" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="flex-1 p-1.5">
                    <div className="grid grid-cols-3 gap-1">
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                      <div className="h-3 bg-muted-foreground/10 rounded" />
                    </div>
                  </div>
                </div>
              </div>
              <p className={cn('text-sm font-semibold', layoutMode === 'topnav' ? 'text-primary' : 'text-foreground')}>
                Top navigatie
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Navigatie bovenin de pagina
              </p>
              {layoutMode === 'topnav' && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          </div>
        </div>

        <Separator />

        {/* Font Size Selector */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Type className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Lettergrootte
              </p>
              <p className="text-xs text-muted-foreground">
                Pas de tekstgrootte aan voor betere leesbaarheid
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BESCHIKBARE_FONT_SIZES.map((size) => (
              <button
                key={size.value}
                onClick={() => handleSelectFontSize(size.value)}
                className={cn(
                  'p-3 rounded-lg border text-center transition-all',
                  fontSize === size.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                )}
              >
                <span className="text-sm font-medium">{size.label}</span>
                <p className="text-2xs text-muted-foreground mt-0.5">{size.beschrijving}</p>
              </button>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
    )}

    {subTab === 'voorkeuren' && (
    <>
    {/* Eén kaart met alle aan/uit-toggles — UI-zichtbaarheid */}
    <Card className="doen-slate-surface border-0 shadow-none rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="w-5 h-5" />
          Voorkeuren
        </CardTitle>
        <CardDescription>Gedrag van de applicatie</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-[rgba(26,83,92,0.08)]">
        {/* Auto-collapse Sidebar */}
        <div className="flex items-center justify-between py-4 first:pt-0">
          <div className="flex items-start gap-3">
            <PanelLeft className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Sidebar automatisch inklappen
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Klap de sidebar automatisch in op mobiele apparaten
              </p>
            </div>
          </div>
          <Switch
            checked={autoCollapse}
            onCheckedChange={(checked) => {
              setAutoCollapse(checked)
              localStorage.setItem('doen_autoCollapse', JSON.stringify(checked))
              toast.success(
                checked
                  ? 'Sidebar klapt automatisch in op mobiel'
                  : 'Sidebar blijft zichtbaar op mobiel'
              )
            }}
          />
        </div>

        {/* Email snelknop */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Email snelknop
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envelopje aan de rechterrand om snel naar de inbox te springen
              </p>
            </div>
          </div>
          <Switch
            checked={settings.email_edge_button ?? true}
            onCheckedChange={(checked) => {
              updateSettings({ email_edge_button: checked })
              toast.success(checked ? 'Email knop ingeschakeld' : 'Email knop uitgeschakeld')
            }}
          />
        </div>

        {/* Snelkoppelingen aan/uit */}
        <div className="flex items-center justify-between py-4 last:pb-0">
          <div className="flex items-start gap-3">
            <Plus className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Snelkoppelingen (+)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Floating + knop voor snelle acties als nieuw project of factuur
              </p>
            </div>
          </div>
          <Switch
            checked={settings.quick_actions_enabled ?? true}
            onCheckedChange={(checked) => {
              updateSettings({ quick_actions_enabled: checked })
              toast.success(checked ? 'Snelkoppelingen ingeschakeld' : 'Snelkoppelingen uitgeschakeld')
            }}
          />
        </div>
      </CardContent>
    </Card>

    {/* Tweede kaart: details van snelkoppelingen — alleen als aan */}
    {(settings.quick_actions_enabled ?? true) && (
    <Card className="mt-4 doen-slate-surface border-0 shadow-none rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Snelkoppelingen aanpassen
        </CardTitle>
        <CardDescription>Positie en welke acties op de + knop verschijnen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Positie kiezer */}
        <div>
          <Label className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-2 block">
            Positie
          </Label>
          {(() => {
            const currentPos: QuickActionsPosition = settings.quick_actions_position ?? 'bottom-right'
            const positions: { id: QuickActionsPosition; label: string; desc: string }[] = [
              { id: 'bottom-right', label: 'Rechtsonder', desc: 'Altijd zichtbaar in de hoek' },
              { id: 'bottom-right-hover', label: 'Rechtsonder (subtiel)', desc: 'Doorzichtig, vol bij hover' },
              { id: 'right-edge', label: 'Rechter zijkant', desc: 'Verticaal pinnetje, schuift uit bij hover' },
              { id: 'hidden', label: 'Verborgen', desc: 'Geen knop tonen' },
            ]
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {positions.map((p) => {
                  const isActive = currentPos === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        updateSettings({ quick_actions_position: p.id })
                        toast.success(`Positie: ${p.label}`)
                      }}
                      className={cn(
                        'text-left rounded-lg border p-3 transition-colors',
                        isActive
                          ? 'border-[#1A535C] bg-[#1A535C]/[0.04]'
                          : 'border-border hover:bg-background',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-sm font-medium', isActive ? 'text-[#1A535C]' : 'text-foreground')}>
                          {p.label}
                        </span>
                        {isActive && <CheckCircle2 className="h-4 w-4 text-[#1A535C]" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>

        <Separator />

        {/* Items */}
        <div>
          <Label className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-2 block">
            Welke acties tonen
          </Label>
          <div className="space-y-2">
            {(() => {
              const activeItems: string[] = Array.isArray(settings.quick_action_items)
                ? settings.quick_action_items
                : QUICK_ACTIONS.map(a => a.id)
              return QUICK_ACTIONS.map((item) => {
                const Icon = item.icon
                const enabled = activeItems.includes(item.id)
                return (
                  <div key={item.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}18` }}>
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => {
                        // Bouw nieuwe lijst op vanuit de master volgorde zodat de
                        // volgorde stabiel blijft, ongeacht aan/uit-volgorde.
                        const next = checked
                          ? QUICK_ACTIONS.map(a => a.id).filter(id => activeItems.includes(id) || id === item.id)
                          : activeItems.filter(i => i !== item.id)
                        updateSettings({ quick_action_items: next })
                        toast.success(checked ? `${item.label} toegevoegd` : `${item.label} verwijderd`)
                      }}
                    />
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
    )}
    </>
    )}

    {subTab === 'navigatie' && (
    <Card className="doen-slate-surface border-0 shadow-none rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="w-5 h-5" />
          Navigatie aanpassen
        </CardTitle>
        <CardDescription>
          Klik items aan of uit. Wat hier aan staat verschijnt in je sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Aan-count summary */}
        <div className="flex items-baseline justify-between pb-3 border-b border-[rgba(26,83,92,0.1)]">
          <span className="text-[13px] text-foreground/70">
            <span className="font-mono font-bold text-[#1A535C] tabular-nums">{sidebarItems.length}</span>
            <span className="text-muted-foreground/70"> / </span>
            <span className="font-mono tabular-nums text-muted-foreground">{ALL_SIDEBAR_ITEMS.length}</span>
            <span className="ml-1.5">items zichtbaar</span>
          </span>
          {sidebarItems.length < ALL_SIDEBAR_ITEMS.length && (
            <button
              type="button"
              onClick={handleResetSidebar}
              className="text-[12px] font-medium text-[#1A535C] hover:text-[#0F3D44] hover:underline"
            >
              Alles aanzetten
            </button>
          )}
        </div>

        {/* Groepeer per sectie — chip-style */}
        {['Werk', 'Planning', 'Communicatie', 'Beheer'].map((section) => {
          const sectionItems = ALL_SIDEBAR_ITEMS.filter((i) => i.section === section)
          if (sectionItems.length === 0) return null
          const aanInSection = sectionItems.filter(i => sidebarItems.includes(i.label)).length
          return (
            <div key={section}>
              <div className="flex items-baseline gap-2 mb-2.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70">
                  {section}
                </h4>
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                  · {aanInSection}/{sectionItems.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sectionItems.map((item) => {
                  const isOn = sidebarItems.includes(item.label)
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => toggleSidebarItem(item.label)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 border',
                        isOn
                          ? 'bg-white text-foreground border-[rgba(26,83,92,0.18)] shadow-[0_1px_2px_rgba(20,62,71,0.06)] hover:border-[rgba(26,83,92,0.3)]'
                          : 'bg-transparent text-muted-foreground border-[rgba(26,83,92,0.12)] border-dashed hover:text-foreground/70 hover:bg-white/50 hover:border-[rgba(26,83,92,0.2)]',
                      )}
                      aria-pressed={isOn}
                    >
                      {isOn && (
                        <span
                          aria-hidden
                          className="w-1.5 h-1.5 rounded-full bg-[#2D6B48] flex-shrink-0"
                        />
                      )}
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Instellingen (altijd aan) — kleine fixed-footer */}
        <div className="flex items-center gap-2 pt-2 border-t border-[rgba(26,83,92,0.08)]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[rgba(26,83,92,0.05)] text-foreground/70 border border-[rgba(26,83,92,0.08)]">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[#9B9B95] flex-shrink-0" />
            Instellingen
          </span>
          <span
            className="text-[12px] text-muted-foreground"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            · altijd zichtbaar
          </span>
        </div>

        {/* Notice: alleen voor sidebar-modus */}
        <p
          className="text-[12px] text-muted-foreground"
          style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
        >
          · deze instellingen gelden alleen voor de zijbalk-navigatie. Met top-navigatie als layout zijn alle items altijd zichtbaar.
        </p>

        {/* Save action */}
        <div className="flex items-center justify-between pt-2 border-t border-[rgba(26,83,92,0.08)]">
          <span className="text-[12px] text-muted-foreground">
            {hasUnsavedNavChanges
              ? <span className="text-[#F15025] font-semibold">Onopgeslagen wijzigingen</span>
              : 'Alle wijzigingen opgeslagen'}
          </span>
          <button
            type="button"
            onClick={handleSaveSidebar}
            disabled={isSavingSidebar || !hasUnsavedNavChanges}
            className="inline-flex items-center gap-2 bg-[#F15025] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[#D03A18] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:bg-[#9B9B95] disabled:shadow-none"
          >
            {isSavingSidebar
              ? <>Opslaan...</>
              : hasUnsavedNavChanges
                ? <><Save className="h-4 w-4" />Navigatie opslaan</>
                : <><CheckCircle2 className="h-4 w-4" />Opgeslagen</>}
          </button>
        </div>
      </CardContent>
    </Card>
    )}

    </>
  )
}

