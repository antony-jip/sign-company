import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Palette,
  CheckCircle2,
  Sun,
  Sliders,
  Save,
  Mail,
  FileText,
  Users,
  Type,
  Monitor,
  Plus,
  LayoutGrid,
  GripVertical,
  Zap,
  BookTemplate,
  FolderKanban,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { usePalette, APP_THEMES, ACCENT_PALETTES } from '@/contexts/PaletteContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { getCalculatieTemplates } from '@/services/supabaseService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '../../utils/logger'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { WIDGET_REGISTRY } from '@/components/dashboard/FORGEdeskDashboard'
import { useNavigate } from 'react-router-dom'
import type { CalculatieTemplate } from '@/types'
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
  { label: 'Dashboard', section: 'Overzicht' },
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
]

const WEERGAVE_TABS: SubTab[] = [
  { id: 'layout', label: 'Layout', icon: Monitor },
  { id: 'voorkeuren', label: 'Voorkeuren', icon: Sliders },
  { id: 'navigatie', label: 'Navigatie', icon: Settings },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'snelkoppelingen', label: 'Snelkoppelingen', icon: Zap },
]

export function WeergaveTab() {
  const { language, setLanguage } = useLanguage()
  const { settings, updateSettings } = useAppSettings()
  const { appThemeId, setAppThemeId, accentId, setAccentId } = usePalette()
  // Merge opgeslagen sidebar_items met ALL_SIDEBAR_ITEMS:
  // - Items die in ALL_SIDEBAR_ITEMS staan maar niet in opgeslagen list → toevoegen (nieuw item = default aan)
  // - Items die in opgeslagen list staan maar niet in ALL_SIDEBAR_ITEMS → verwijderen (verwijderd item)
  const mergeSidebarItems = useCallback((saved: string[] | undefined) => {
    if (!saved || saved.length === 0) return ALL_SIDEBAR_ITEMS.map((i) => i.label)
    const allLabels = ALL_SIDEBAR_ITEMS.map((i) => i.label)
    // Behoud opgeslagen items die nog bestaan + voeg nieuwe items toe
    const existing = saved.filter((s) => allLabels.includes(s))
    const newItems = allLabels.filter((l) => !saved.includes(l))
    return [...existing, ...newItems]
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
      toast.success('Opgeslagen.')
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
  const [compactMode, setCompactMode] = useState(() => {
    const stored = localStorage.getItem('doen_compactMode')
    return stored !== null ? JSON.parse(stored) : false
  })

  return (
    <>
    <SubTabNav tabs={WEERGAVE_TABS} active={subTab} onChange={setSubTab} />

    {false && subTab === 'thema' && (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Thema &amp; Kleuren
        </CardTitle>
        <CardDescription>Kies een thema — elk thema heeft zijn eigen kleuren</CardDescription>
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
                Kies een volledig thema — verandert achtergrond, kaarten, sidebar en sfeer
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
                Kies een accentkleur — verandert de sidebar indicator, logo en focus ring
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
    <Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="w-5 h-5" />
          Voorkeuren
        </CardTitle>
        <CardDescription>Taal en gedrag van de applicatie</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">
              {language === 'nl' ? 'NL' : 'EN'}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Taal
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'nl' ? 'Nederlands' : 'English'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {language === 'nl' ? 'NL' : 'EN'}
            </span>
            <Switch
              checked={language === 'en'}
              onCheckedChange={(checked) => setLanguage(checked ? 'en' : 'nl')}
            />
          </div>
        </div>

        <Separator />

        {/* Auto-collapse Sidebar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Sidebar automatisch inklappen
            </p>
            <p className="text-xs text-muted-foreground">
              Klap de sidebar automatisch in op mobiele apparaten
            </p>
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

        <Separator />

        {/* Compact Mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Compacte modus
            </p>
            <p className="text-xs text-muted-foreground">
              Verminder witruimte en gebruik kleinere elementen
            </p>
          </div>
          <Switch
            checked={compactMode}
            onCheckedChange={(checked) => {
              setCompactMode(checked)
              localStorage.setItem('doen_compactMode', JSON.stringify(checked))
              toast.success(
                checked
                  ? 'Compacte modus ingeschakeld'
                  : 'Standaard modus ingeschakeld'
              )
            }}
          />
        </div>
      </CardContent>
    </Card>

    {/* Snelkoppelingen */}
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Snelkoppelingen (+)
            </CardTitle>
            <CardDescription className="mt-1.5">Toon de + knop rechtsonder voor snelle acties</CardDescription>
          </div>
          <Switch
            checked={settings.quick_actions_enabled ?? true}
            onCheckedChange={(checked) => {
              updateSettings({ quick_actions_enabled: checked })
              toast.success(checked ? 'Snelkoppelingen ingeschakeld' : 'Snelkoppelingen uitgeschakeld')
            }}
          />
        </div>
      </CardHeader>
      {(settings.quick_actions_enabled ?? true) && (
      <CardContent className="space-y-3">
        {(() => {
          const activeItems: string[] = Array.isArray(settings.quick_action_items) ? settings.quick_action_items : ['project', 'mail', 'offerte', 'klant']
          return [
            { id: 'project', label: 'Nieuw project', icon: FolderKanban, color: '#8BAFD4' },
            { id: 'mail', label: 'Nieuwe mail', icon: Mail, color: '#7BABC7' },
            { id: 'offerte', label: 'Nieuwe offerte', icon: FileText, color: '#E8866A' },
            { id: 'klant', label: 'Nieuwe klant', icon: Users, color: '#6B9FCC' },
          ].map((item) => {
            const Icon = item.icon
            const enabled = activeItems.includes(item.id)
            return (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}18` }}>
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    const updated = checked
                      ? [...activeItems, item.id]
                      : activeItems.filter((i: string) => i !== item.id)
                    updateSettings({ quick_action_items: updated })
                    toast.success(checked ? `${item.label} toegevoegd` : `${item.label} verwijderd`)
                  }}
                />
              </div>
            )
          })
        })()}
      </CardContent>
      )}
    </Card>
    </>
    )}

    {subTab === 'navigatie' && (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="w-5 h-5" />
          Navigatie aanpassen
        </CardTitle>
        <CardDescription>
          Kies welke menu-items zichtbaar zijn in de sidebar. Schakel items uit die je niet gebruikt,
          zodat de navigatie overzichtelijker wordt. Instellingen is altijd zichtbaar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Groepeer per sectie */}
        {['Overzicht', 'Werk', 'Planning', 'Communicatie', 'Beheer'].map((section) => {
          const sectionItems = ALL_SIDEBAR_ITEMS.filter((i) => i.section === section)
          return (
            <div key={section}>
              <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-2">
                {section}
              </h4>
              <div className="space-y-2">
                {sectionItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-background dark:hover:bg-muted/30"
                  >
                    <span className="text-sm text-foreground dark:text-white">{item.label}</span>
                    <Switch
                      checked={sidebarItems.includes(item.label)}
                      onCheckedChange={() => toggleSidebarItem(item.label)}
                    />
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
            </div>
          )
        })}

        {/* Instellingen (altijd aan) */}
        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-background dark:bg-muted/30">
          <span className="text-sm text-foreground dark:text-white">Instellingen</span>
          <span className="text-xs text-muted-foreground dark:text-muted-foreground/60">Altijd zichtbaar</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={handleResetSidebar}>
            Alles aanzetten
          </Button>
          <Button size="sm" onClick={handleSaveSidebar} disabled={isSavingSidebar}>
            <Save className="h-4 w-4 mr-1.5" />
            {isSavingSidebar ? 'Opslaan...' : 'Navigatie opslaan'}
          </Button>
        </div>
      </CardContent>
    </Card>
    )}

    {subTab === 'dashboard' && <DashboardSettingsTab />}

    {subTab === 'snelkoppelingen' && <SnelkoppelingenTab />}
    </>
  )
}

function DashboardSettingsTab() {
  const dashLayout = useDashboardLayout()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5" />
          Dashboard aanpassen
        </CardTitle>
        <CardDescription>
          Kies welke widgets zichtbaar zijn op je dashboard en sleep ze in de gewenste volgorde.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active widgets */}
        <div>
          <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-3">
            Actieve widgets
          </h4>
          <div className="space-y-1.5">
            {dashLayout.order.map((id) => {
              const def = WIDGET_REGISTRY[id]
              if (!def) return null
              const IconComp = def.icon
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={(e) => dashLayout.handleDragStart(e, id)}
                  onDragEnd={dashLayout.handleDragEnd}
                  onDragEnter={(e) => dashLayout.handleDragEnter(e, id)}
                  onDragLeave={dashLayout.handleDragLeave}
                  onDragOver={dashLayout.handleDragOver}
                  onDrop={(e) => dashLayout.handleDrop(e, id)}
                  className={cn(
                    'flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-background dark:hover:bg-muted/30 transition-colors group',
                    dashLayout.draggedWidget === id && 'opacity-40',
                    dashLayout.dragOverWidget === id && 'ring-2 ring-primary/30',
                  )}
                >
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex-shrink-0">
                    <IconComp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{def.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{def.description}</p>
                  </div>
                  <Switch
                    checked={true}
                    onCheckedChange={() => dashLayout.toggleWidget(id)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Hidden widgets */}
        {dashLayout.allWidgets.filter(id => dashLayout.hidden.has(id)).length > 0 && (
          <div>
            <Separator className="mb-4" />
            <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-label mb-3">
              Beschikbare widgets
            </h4>
            <div className="space-y-1.5">
              {dashLayout.allWidgets.filter(id => dashLayout.hidden.has(id)).map((id) => {
                const def = WIDGET_REGISTRY[id]
                if (!def) return null
                const IconComp = def.icon
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-background dark:hover:bg-muted/30 transition-colors opacity-60"
                  >
                    <div className="w-4" />
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted flex-shrink-0">
                      <IconComp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{def.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{def.description}</p>
                    </div>
                    <Switch
                      checked={false}
                      onCheckedChange={() => dashLayout.toggleWidget(id)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={dashLayout.resetLayout}>
            Standaard herstellen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SnelkoppelingenTab() {
  const { settings, updateSettings } = useAppSettings()
  const [templates, setTemplates] = useState<CalculatieTemplate[]>([])
  const [selected, setSelected] = useState<string[]>(settings.snelofferte_templates || [])
  const [isSaving, setIsSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getCalculatieTemplates().then(setTemplates).catch(logger.error)
  }, [])

  useEffect(() => {
    setSelected(settings.snelofferte_templates || [])
  }, [settings.snelofferte_templates])

  const activeTemplates = templates.filter(t => t.actief)

  const toggleTemplate = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await updateSettings({ snelofferte_templates: selected })
      toast.success('Snelkoppelingen opgeslagen')
    } catch (err) {
      logger.error('Snelkoppelingen opslaan mislukt:', err)
      toast.error('Kon snelkoppelingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Snelkoppelingen
        </CardTitle>
        <CardDescription>
          Kies welke calculatie-templates als snelkoppeling verschijnen in het &ldquo;Nieuwe offerte&rdquo; formulier.
          Geselecteerde templates worden als chips getoond voor snel laden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTemplates.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <BookTemplate className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Je hebt nog geen calculatie-templates.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/instellingen?tab=calculatie')}
            >
              Templates aanmaken
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {activeTemplates.map(t => {
                const isSelected = selected.includes(t.id)
                return (
                  <div
                    key={t.id}
                    className={cn(
                      'flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-petrol/5 border border-petrol/20'
                        : 'hover:bg-muted/50 border border-transparent'
                    )}
                    onClick={() => toggleTemplate(t.id)}
                  >
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => toggleTemplate(t.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t.naam}</p>
                      {t.beschrijving && (
                        <p className="text-xs text-muted-foreground truncate">{t.beschrijving}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.regels.length} regels
                    </Badge>
                  </div>
                )
              })}
            </div>

            {selected.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  Voorbeeld snelkoppelingen
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selected.map(id => {
                    const t = activeTemplates.find(x => x.id === id)
                    if (!t) return null
                    return (
                      <span
                        key={id}
                        className="px-2.5 py-1 text-[11px] font-medium border border-petrol/30 text-petrol rounded-full bg-petrol/5"
                      >
                        {t.naam}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/instellingen?tab=calculatie')}
              >
                <BookTemplate className="h-4 w-4 mr-1.5" />
                Templates beheren
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1.5" />
                {isSaving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
