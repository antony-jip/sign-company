import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Palette,
  Type,
  Upload,
  Image,
  LayoutTemplate,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getDocumentStyle, upsertDocumentStyle, uploadBriefpapier, uploadVervolgpapier } from '@/services/supabaseService'
import {
  BESCHIKBARE_FONTS,
  DOCUMENT_TEMPLATES,
  getDefaultDocumentStyle,
  loadGoogleFonts,
} from '@/lib/documentTemplates'
import type { DocumentStyle, DocumentTemplateId, BriefpapierModus } from '@/types'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { generateBriefpapierSVG, svgToPng } from '@/lib/briefpapierGenerator'

// ============ SUB-TAB NAVIGATION ============

interface SubTab {
  id: string
  label: string
  icon: React.ElementType
}

function SubTabNav({ tabs, active, onChange }: { tabs: SubTab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted dark:bg-foreground/80 rounded-xl overflow-x-auto mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              isActive
                ? 'bg-white dark:bg-foreground/70 text-foreground dark:text-white shadow-sm'
                : 'text-muted-foreground dark:text-muted-foreground/60 hover:text-foreground/70 dark:hover:text-muted-foreground/50'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

const HUISSTIJL_TABS: SubTab[] = [
  { id: 'template', label: 'Template & Kleuren', icon: LayoutTemplate },
  { id: 'typografie', label: 'Typografie', icon: Type },
  { id: 'layout', label: 'Layout', icon: Maximize2 },
  { id: 'briefpapier', label: 'Briefpapier', icon: Image },
]

// ============ LIVE PREVIEW COMPONENT ============

function DocumentPreview({ style, logoUrl, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer }: {
  style: DocumentStyle
  logoUrl: string
  bedrijfsnaam: string
  bedrijfsAdres: string
  kvkNummer: string
  btwNummer: string
}) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // Load fonts for preview
  useEffect(() => {
    loadGoogleFonts([style.heading_font, style.body_font])
  }, [style.heading_font, style.body_font])

  const primaryRgb = hexToRgb(style.primaire_kleur)
  const headerKleurRgb = hexToRgb(style.tabel_header_kleur)

  // A4 ratio: 210mm x 297mm
  const containerClass = fullscreen
    ? 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8'
    : 'relative'

  const pageClass = fullscreen
    ? 'w-[595px] h-[842px] bg-white shadow-2xl overflow-hidden'
    : 'w-full aspect-[210/297] bg-white shadow-lg border border-border dark:border-border overflow-hidden rounded-lg'

  return (
    <div className={containerClass}>
      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 z-10"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}

      <div className="relative group">
        {!fullscreen && (
          <button
            onClick={() => setFullscreen(true)}
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-foreground/80/90 rounded-lg p-1.5 shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5 text-muted-foreground dark:text-muted-foreground/50" />
          </button>
        )}

        <div ref={previewRef} className={pageClass}>
          {/* Briefpapier achtergrond - pagina 1 */}
          {style.briefpapier_modus !== 'geen' && style.briefpapier_url && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 pointer-events-none"
              style={{ backgroundImage: `url(${style.briefpapier_url})` }}
            />
          )}

          <div
            className="relative h-full flex flex-col"
            style={{
              paddingTop: `${(style.marge_boven / 297) * 100}%`,
              paddingBottom: `${(style.marge_onder / 297) * 100}%`,
              paddingLeft: `${(style.marge_links / 210) * 100}%`,
              paddingRight: `${(style.marge_rechts / 210) * 100}%`,
            }}
          >
            {/* Header */}
            {style.toon_header && (
              <div className="flex items-start justify-between mb-[3%]">
                {/* Logo + Company name */}
                <div className={`flex items-center gap-[2%] ${
                  style.logo_positie === 'rechts' ? 'order-2' : ''
                } ${style.logo_positie === 'midden' ? 'w-full justify-center' : ''}`}>
                  {logoUrl && (
                    <div
                      className="flex-shrink-0 bg-contain bg-no-repeat bg-center"
                      style={{
                        width: `${Math.max(8, style.logo_grootte * 0.12)}%`,
                        height: `${Math.max(4, style.logo_grootte * 0.06)}%`,
                        backgroundImage: `url(${logoUrl})`,
                        minWidth: '24px',
                        minHeight: '16px',
                      }}
                    />
                  )}
                  <div>
                    <p
                      style={{
                        fontFamily: `'${style.heading_font}', sans-serif`,
                        color: style.primaire_kleur,
                        fontSize: fullscreen ? '14px' : 'clamp(7px, 1.4vw, 14px)',
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {bedrijfsnaam || 'Uw Bedrijf'}
                    </p>
                  </div>
                </div>

                {/* Company details */}
                {style.logo_positie !== 'midden' && (
                  <div
                    className={`text-right ${style.logo_positie === 'rechts' ? 'order-1 text-left' : ''}`}
                    style={{
                      fontFamily: `'${style.body_font}', sans-serif`,
                      color: '#666',
                      fontSize: fullscreen ? '7px' : 'clamp(4px, 0.7vw, 7px)',
                      lineHeight: 1.5,
                    }}
                  >
                    {bedrijfsAdres && <p>{bedrijfsAdres}</p>}
                    {kvkNummer && <p>KvK: {kvkNummer}</p>}
                    {btwNummer && <p>BTW: {btwNummer}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            <div
              className="w-full mb-[2%]"
              style={{ height: '1px', backgroundColor: style.primaire_kleur }}
            />

            {/* Document title */}
            <p
              style={{
                fontFamily: `'${style.heading_font}', sans-serif`,
                color: style.primaire_kleur,
                fontSize: fullscreen ? '12px' : 'clamp(6px, 1.2vw, 12px)',
                fontWeight: 700,
                marginBottom: '1%',
              }}
            >
              Offerte
            </p>
            <div
              style={{
                fontFamily: `'${style.body_font}', sans-serif`,
                color: style.tekst_kleur,
                fontSize: fullscreen ? '7px' : 'clamp(4px, 0.7vw, 7px)',
                lineHeight: 1.6,
                marginBottom: '2%',
              }}
            >
              <p>Nummer: OFF-2024-001</p>
              <p>Datum: 22-02-2026</p>
            </div>

            {/* Client info block */}
            <div
              style={{
                fontFamily: `'${style.body_font}', sans-serif`,
                color: style.tekst_kleur,
                fontSize: fullscreen ? '7px' : 'clamp(4px, 0.7vw, 7px)',
                lineHeight: 1.6,
                marginBottom: '3%',
              }}
            >
              <p style={{ fontWeight: 600 }}>Aan:</p>
              <p style={{ fontWeight: 700 }}>Voorbeeld Klant B.V.</p>
              <p>Klantenstraat 123</p>
              <p>1234 AB Amsterdam</p>
            </div>

            {/* Items table */}
            <div className="mb-[3%]">
              <table className="w-full" style={{ fontSize: fullscreen ? '6.5px' : 'clamp(3.5px, 0.65vw, 6.5px)' }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: style.tabel_header_kleur,
                      color: '#ffffff',
                      fontFamily: `'${style.body_font}', sans-serif`,
                    }}
                  >
                    <th className="text-left py-[0.5%] px-[1%]">#</th>
                    <th className="text-left py-[0.5%] px-[1%]">Omschrijving</th>
                    <th className="text-center py-[0.5%] px-[1%]">Aantal</th>
                    <th className="text-right py-[0.5%] px-[1%]">Prijs</th>
                    <th className="text-right py-[0.5%] px-[1%]">Totaal</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: `'${style.body_font}', sans-serif`, color: style.tekst_kleur }}>
                  {[
                    { nr: 1, omschr: 'Gevelreclame paneel 3x1m dibond', aantal: 2, prijs: 450, totaal: 900 },
                    { nr: 2, omschr: 'Montage incl. hoogwerker', aantal: 1, prijs: 350, totaal: 350 },
                    { nr: 3, omschr: 'Ontwerp en DTP werkzaamheden', aantal: 4, prijs: 85, totaal: 340 },
                  ].map((item, idx) => (
                    <tr
                      key={item.nr}
                      style={{
                        backgroundColor:
                          style.tabel_stijl === 'striped' && idx % 2 === 1
                            ? `${style.tabel_header_kleur}10`
                            : 'transparent',
                        borderBottom: style.tabel_stijl === 'grid' ? '1px solid #e5e7eb' : 'none',
                      }}
                    >
                      <td className="py-[0.4%] px-[1%]">{item.nr}</td>
                      <td className="py-[0.4%] px-[1%]">{item.omschr}</td>
                      <td className="text-center py-[0.4%] px-[1%]">{item.aantal}</td>
                      <td className="text-right py-[0.4%] px-[1%]">&euro; {item.prijs.toFixed(2)}</td>
                      <td className="text-right py-[0.4%] px-[1%]">&euro; {item.totaal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div
              className="flex justify-end mb-[3%]"
              style={{
                fontFamily: `'${style.body_font}', sans-serif`,
                fontSize: fullscreen ? '7px' : 'clamp(4px, 0.7vw, 7px)',
                color: style.tekst_kleur,
              }}
            >
              <div className="w-[40%]">
                <div className="flex justify-between py-[0.3%]">
                  <span>Subtotaal:</span>
                  <span>&euro; 1.590,00</span>
                </div>
                <div className="flex justify-between py-[0.3%]">
                  <span>BTW 21%:</span>
                  <span>&euro; 333,90</span>
                </div>
                <div
                  className="flex justify-between py-[0.5%] mt-[0.5%]"
                  style={{
                    borderTop: `1.5px solid ${style.primaire_kleur}`,
                    fontWeight: 700,
                    color: style.primaire_kleur,
                    fontSize: fullscreen ? '8.5px' : 'clamp(5px, 0.85vw, 8.5px)',
                  }}
                >
                  <span>Totaal:</span>
                  <span>&euro; 1.923,90</span>
                </div>
              </div>
            </div>

            {/* Spacer to push footer down */}
            <div className="flex-1" />

            {/* Footer */}
            {style.toon_footer && (
              <div
                style={{
                  borderTop: '1px solid #d1d5db',
                  paddingTop: '1%',
                  fontFamily: `'${style.body_font}', sans-serif`,
                  fontSize: fullscreen ? '6px' : 'clamp(3.5px, 0.6vw, 6px)',
                  color: '#9ca3af',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  {style.footer_tekst || [bedrijfsnaam, kvkNummer ? `KvK: ${kvkNummer}` : '', btwNummer ? `BTW: ${btwNummer}` : ''].filter(Boolean).join(' | ')}
                </span>
                <span>Pagina 1 van {style.briefpapier_modus === 'eerste_en_vervolg' ? '2' : '1'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pagina 2 preview (bij modus eerste_en_vervolg) */}
        {style.briefpapier_modus === 'eerste_en_vervolg' && (
          <div className={cn(pageClass, 'mt-3')}>
            {/* Vervolgpapier achtergrond */}
            {style.vervolgpapier_url && (
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 pointer-events-none"
                style={{ backgroundImage: `url(${style.vervolgpapier_url})` }}
              />
            )}
            <div
              className="relative h-full flex flex-col"
              style={{
                paddingTop: `${(style.marge_boven / 297) * 100}%`,
                paddingBottom: `${(style.marge_onder / 297) * 100}%`,
                paddingLeft: `${(style.marge_links / 210) * 100}%`,
                paddingRight: `${(style.marge_rechts / 210) * 100}%`,
              }}
            >
              {/* Vervolg content placeholder */}
              <div
                style={{
                  fontFamily: `'${style.body_font}', sans-serif`,
                  color: style.tekst_kleur,
                  fontSize: fullscreen ? '7px' : 'clamp(4px, 0.7vw, 7px)',
                  lineHeight: 1.8,
                  opacity: 0.4,
                }}
              >
                <p>Vervolginhoud pagina 2...</p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                <p>Sed do eiusmod tempor incididunt ut labore et dolore.</p>
              </div>
              <div className="flex-1" />
              {style.toon_footer && (
                <div
                  style={{
                    borderTop: '1px solid #d1d5db',
                    paddingTop: '1%',
                    fontFamily: `'${style.body_font}', sans-serif`,
                    fontSize: fullscreen ? '6px' : 'clamp(3.5px, 0.6vw, 6px)',
                    color: '#9ca3af',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    {style.footer_tekst || [bedrijfsnaam, kvkNummer ? `KvK: ${kvkNummer}` : '', btwNummer ? `BTW: ${btwNummer}` : ''].filter(Boolean).join(' | ')}
                  </span>
                  <span>Pagina 2 van 2</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ]
}

// ============ COLLAPSIBLE SECTION ============

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-border dark:border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-background dark:bg-foreground/80/50 hover:bg-muted dark:hover:bg-foreground/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-muted-foreground dark:text-muted-foreground/60" />
          <span className="font-medium text-sm text-foreground/70 dark:text-muted-foreground/50">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground/60" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
        )}
      </button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

// ============ COLOR PICKER ============

function ColorPicker({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-md border border-border dark:border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
          }}
          className="w-24 h-8 text-xs font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

// ============ MAIN COMPONENT ============

export function HuisstijlTab() {
  const { user } = useAuth()
  const { profile, logoUrl, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer } = useAppSettings()

  const [style, setStyle] = useState<DocumentStyle>(() => getDefaultDocumentStyle(user?.id || ''))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [uploadingBriefpapier, setUploadingBriefpapier] = useState(false)
  const [uploadingVervolgpapier, setUploadingVervolgpapier] = useState(false)
  const [generatingBriefpapier, setGeneratingBriefpapier] = useState(false)
  const [subTab, setSubTab] = useState('template')
  const briefpapierInputRef = useRef<HTMLInputElement>(null)
  const vervolgpapierInputRef = useRef<HTMLInputElement>(null)
  const savedStyleRef = useRef<DocumentStyle | null>(null)

  // Load existing style
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      try {
        const existing = await getDocumentStyle(user!.id)
        if (!cancelled) {
          if (existing) {
            setStyle(existing)
            savedStyleRef.current = existing
          } else {
            const def = getDefaultDocumentStyle(user!.id)
            setStyle(def)
            savedStyleRef.current = def
          }
        }
      } catch (err) {
        logger.error('Error loading document style:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  // Track changes
  const updateStyle = useCallback((updates: Partial<DocumentStyle>) => {
    setStyle((prev) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }, [])

  // Apply template
  const applyTemplate = useCallback((templateId: DocumentTemplateId) => {
    const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    updateStyle({
      template: templateId,
      ...template.defaults,
    })
  }, [updateStyle])

  // Save
  const handleSave = useCallback(async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      const saved = await upsertDocumentStyle(user.id, style)
      setStyle(saved)
      savedStyleRef.current = saved
      setHasChanges(false)
      toast.success('Huisstijl opgeslagen')
    } catch (err) {
      logger.error('Error saving document style:', err)
      toast.error('Opslaan mislukt')
    } finally {
      setIsSaving(false)
    }
  }, [user?.id, style])

  // Reset to saved
  const handleReset = useCallback(() => {
    if (savedStyleRef.current) {
      setStyle(savedStyleRef.current)
      setHasChanges(false)
    }
  }, [])

  // Briefpapier upload
  const handleBriefpapierUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Ongeldig bestandstype. Gebruik JPG, PNG of WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bestand is te groot (max 10MB)')
      return
    }

    setUploadingBriefpapier(true)
    try {
      const url = await uploadBriefpapier(user.id, file)
      updateStyle({ briefpapier_url: url, briefpapier_modus: 'achtergrond' })
      toast.success('Briefpapier geüpload')
    } catch (err) {
      logger.error('Error uploading briefpapier:', err)
      toast.error('Upload mislukt')
    } finally {
      setUploadingBriefpapier(false)
      if (briefpapierInputRef.current) briefpapierInputRef.current.value = ''
    }
  }, [user?.id, updateStyle])

  // Vervolgpapier upload
  const handleVervolgpapierUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Ongeldig bestandstype. Gebruik JPG, PNG of WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bestand is te groot (max 10MB)')
      return
    }

    setUploadingVervolgpapier(true)
    try {
      const url = await uploadVervolgpapier(user.id, file)
      updateStyle({ vervolgpapier_url: url })
      toast.success('Vervolgpapier geüpload')
    } catch (err) {
      logger.error('Error uploading vervolgpapier:', err)
      toast.error('Upload mislukt')
    } finally {
      setUploadingVervolgpapier(false)
      if (vervolgpapierInputRef.current) vervolgpapierInputRef.current.value = ''
    }
  }, [user?.id, updateStyle])

  // Auto-genereer briefpapier + vervolgpapier
  const handleGenereerBriefpapier = useCallback(async () => {
    if (!user?.id) return
    if (!bedrijfsnaam) {
      toast.error('Vul eerst je bedrijfsgegevens in bij Instellingen → Bedrijf')
      return
    }

    setGeneratingBriefpapier(true)
    try {
      const config = {
        bedrijfsnaam,
        adres: bedrijfsAdres || '',
        telefoon: profile?.bedrijfs_telefoon || '',
        email: profile?.bedrijfs_email || '',
        website: profile?.bedrijfs_website || '',
        kvkNummer: kvkNummer || '',
        btwNummer: btwNummer || '',
        iban: profile?.iban || '',
        logoDataUrl: logoUrl || undefined,
        primaireKleur: style.primaire_kleur,
        secundaireKleur: style.secundaire_kleur,
        accentKleur: style.accent_kleur,
      }

      // Genereer briefpapier (pagina 1)
      const briefpapierSvg = generateBriefpapierSVG({ ...config, type: 'briefpapier' })
      const briefpapierBlob = await svgToPng(briefpapierSvg)
      const briefpapierFile = new File([briefpapierBlob], 'briefpapier.png', { type: 'image/png' })
      const briefpapierUrl = await uploadBriefpapier(user.id, briefpapierFile)

      // Genereer vervolgpapier (pagina 2+)
      const vervolgpapierSvg = generateBriefpapierSVG({ ...config, type: 'vervolgpapier' })
      const vervolgpapierBlob = await svgToPng(vervolgpapierSvg)
      const vervolgpapierFile = new File([vervolgpapierBlob], 'vervolgpapier.png', { type: 'image/png' })
      const vervolgpapierUrl = await uploadVervolgpapier(user.id, vervolgpapierFile)

      updateStyle({
        briefpapier_url: briefpapierUrl,
        vervolgpapier_url: vervolgpapierUrl,
        briefpapier_modus: 'eerste_en_vervolg',
      })
      toast.success('Briefpapier en vervolgpapier succesvol gegenereerd')
    } catch (err) {
      logger.error('Error generating briefpapier:', err)
      toast.error('Genereren mislukt. Probeer het opnieuw.')
    } finally {
      setGeneratingBriefpapier(false)
    }
  }, [user?.id, bedrijfsnaam, bedrijfsAdres, kvkNummer, btwNummer, logoUrl, profile, style, updateStyle])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with save/reset */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground dark:text-white">Document Huisstijl</h2>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">
            Pas de stijl van uw offertes, facturen en andere documenten aan
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Ongedaan maken
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving || !hasChanges}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>

      <SubTabNav tabs={HUISSTIJL_TABS} active={subTab} onChange={setSubTab} />

      {/* Two column layout: editor + preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: Editor controls */}
        <div className="space-y-4">
          {subTab === 'template' && (
          <>
          {/* Template keuze */}
          <Section title="Template" icon={LayoutTemplate} defaultOpen={true}>
            <div className="grid grid-cols-2 gap-3">
              {DOCUMENT_TEMPLATES.map((tmpl) => {
                const isActive = style.template === tmpl.id
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => applyTemplate(tmpl.id)}
                    className={`relative text-left p-3 rounded-lg border-2 transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                        : 'border-border dark:border-border hover:border-border dark:hover:border-border'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-blue-500" />
                      </div>
                    )}
                    <p className={`font-medium text-sm ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-foreground/80 dark:text-muted-foreground/30'}`}>
                      {tmpl.naam}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
                      {tmpl.preview_beschrijving}
                    </p>
                    {/* Color dots */}
                    <div className="flex gap-1 mt-2">
                      {[tmpl.defaults.primaire_kleur, tmpl.defaults.secundaire_kleur, tmpl.defaults.accent_kleur].map((kleur, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full border border-white dark:border-border shadow-sm"
                          style={{ backgroundColor: kleur }}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Kleuren */}
          <Section title="Kleuren" icon={Palette}>
            <div className="grid grid-cols-2 gap-4">
              <ColorPicker label="Primaire kleur" value={style.primaire_kleur} onChange={(v) => updateStyle({ primaire_kleur: v })} />
              <ColorPicker label="Secundaire kleur" value={style.secundaire_kleur} onChange={(v) => updateStyle({ secundaire_kleur: v })} />
              <ColorPicker label="Accent kleur" value={style.accent_kleur} onChange={(v) => updateStyle({ accent_kleur: v })} />
              <ColorPicker label="Tekst kleur" value={style.tekst_kleur} onChange={(v) => updateStyle({ tekst_kleur: v })} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <ColorPicker label="Tabel header kleur" value={style.tabel_header_kleur} onChange={(v) => updateStyle({ tabel_header_kleur: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Tabel stijl</Label>
                <Select value={style.tabel_stijl} onValueChange={(v) => updateStyle({ tabel_stijl: v as 'striped' | 'grid' | 'plain' })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="striped">Gestreept</SelectItem>
                    <SelectItem value="grid">Rasterlijnen</SelectItem>
                    <SelectItem value="plain">Minimaal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>
          </>
          )}

          {subTab === 'typografie' && (
          <>
          {/* Lettertypen */}
          <Section title="Lettertypen" icon={Type} defaultOpen={true}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Koptekst font</Label>
                <Select value={style.heading_font} onValueChange={(v) => updateStyle({ heading_font: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BESCHIKBARE_FONTS.map((f) => (
                      <SelectItem key={f.naam} value={f.naam}>
                        <span style={{ fontFamily: `'${f.naam}', ${f.categorie}` }}>{f.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground/60">({f.categorie})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Bodytekst font</Label>
                <Select value={style.body_font} onValueChange={(v) => updateStyle({ body_font: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BESCHIKBARE_FONTS.map((f) => (
                      <SelectItem key={f.naam} value={f.naam}>
                        <span style={{ fontFamily: `'${f.naam}', ${f.categorie}` }}>{f.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground/60">({f.categorie})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                Basisgrootte: {style.font_grootte_basis}pt
              </Label>
              <input
                type="range"
                min={8}
                max={14}
                step={1}
                value={style.font_grootte_basis}
                onChange={(e) => updateStyle({ font_grootte_basis: parseInt(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>8pt</span>
                <span>14pt</span>
              </div>
            </div>
          </Section>
          </>
          )}

          {subTab === 'layout' && (
          <>
          {/* Marges & Layout */}
          <Section title="Marges & Layout" icon={Maximize2}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Boven ({style.marge_boven}mm)</Label>
                <input
                  type="range"
                  min={5}
                  max={40}
                  value={style.marge_boven}
                  onChange={(e) => updateStyle({ marge_boven: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Onder ({style.marge_onder}mm)</Label>
                <input
                  type="range"
                  min={5}
                  max={40}
                  value={style.marge_onder}
                  onChange={(e) => updateStyle({ marge_onder: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Links ({style.marge_links}mm)</Label>
                <input
                  type="range"
                  min={10}
                  max={40}
                  value={style.marge_links}
                  onChange={(e) => updateStyle({ marge_links: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Rechts ({style.marge_rechts}mm)</Label>
                <input
                  type="range"
                  min={10}
                  max={40}
                  value={style.marge_rechts}
                  onChange={(e) => updateStyle({ marge_rechts: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <Separator />

            {/* Logo positie & grootte */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Logo positie</Label>
                <Select value={style.logo_positie} onValueChange={(v) => updateStyle({ logo_positie: v as 'links' | 'rechts' | 'midden' })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="links">Links</SelectItem>
                    <SelectItem value="midden">Midden</SelectItem>
                    <SelectItem value="rechts">Rechts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Logo grootte ({style.logo_grootte}%)</Label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={style.logo_grootte}
                  onChange={(e) => updateStyle({ logo_grootte: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
          </Section>

          {/* Header & Footer */}
          <Section title="Header & Footer" icon={Eye} defaultOpen={false}>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground/70 dark:text-muted-foreground/50">Header tonen</Label>
              <Switch
                checked={style.toon_header}
                onCheckedChange={(v) => updateStyle({ toon_header: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground/70 dark:text-muted-foreground/50">Footer tonen</Label>
              <Switch
                checked={style.toon_footer}
                onCheckedChange={(v) => updateStyle({ toon_footer: v })}
              />
            </div>
            {style.toon_footer && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                  Aangepaste footer tekst (laat leeg voor standaard)
                </Label>
                <Input
                  value={style.footer_tekst}
                  onChange={(e) => updateStyle({ footer_tekst: e.target.value })}
                  placeholder="Bijv: Bedrijfsnaam | KvK: 12345678 | BTW: NL..."
                  className="h-9 text-sm"
                />
              </div>
            )}
          </Section>
          </>
          )}

          {subTab === 'briefpapier' && (
          <>
          {/* Auto-generatie */}
          <Section title="Briefpapier" icon={Image}>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
              Genereer automatisch briefpapier op basis van je bedrijfsgegevens, of upload je eigen ontwerp.
            </p>

            {/* Auto-genereer knop */}
            <div className="rounded-lg border border-border dark:border-border p-3 bg-muted/30 space-y-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleGenereerBriefpapier}
                disabled={generatingBriefpapier || uploadingBriefpapier}
              >
                {generatingBriefpapier ? (
                  <>
                    <div className="w-3.5 h-3.5 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <Palette className="w-3.5 h-3.5 mr-1.5" />
                    Automatisch genereren
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground dark:text-muted-foreground/60">
                Genereert briefpapier en vervolgpapier op basis van je bedrijfsgegevens en huisstijl.
              </p>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground dark:text-muted-foreground/60">
              <Separator className="flex-1" />
              <span>of upload je eigen briefpapier</span>
              <Separator className="flex-1" />
            </div>

            {/* Upload knoppen */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => briefpapierInputRef.current?.click()}
                disabled={uploadingBriefpapier || generatingBriefpapier}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {uploadingBriefpapier ? 'Uploaden...' : 'Briefpapier uploaden'}
              </Button>
              {style.briefpapier_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateStyle({ briefpapier_url: '', briefpapier_modus: 'geen', vervolgpapier_url: '' })}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Verwijderen
                </Button>
              )}
            </div>

            <input
              ref={briefpapierInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleBriefpapierUpload}
              className="hidden"
            />

            {style.briefpapier_url && (
              <>
                <div className="rounded-lg border border-border dark:border-border p-2 bg-background dark:bg-foreground/80/50">
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <Check className="w-3.5 h-3.5" />
                    Briefpapier geüpload
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Briefpapier modus</Label>
                  <Select
                    value={style.briefpapier_modus}
                    onValueChange={(v) => updateStyle({ briefpapier_modus: v as BriefpapierModus })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="achtergrond">Alle pagina&apos;s</SelectItem>
                      <SelectItem value="alleen_eerste_pagina">Alleen eerste pagina</SelectItem>
                      <SelectItem value="eerste_en_vervolg">Eerste pagina + vervolgpapier</SelectItem>
                      <SelectItem value="geen">Uitgeschakeld</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Vervolgpapier upload (alleen bij modus eerste_en_vervolg) */}
                {style.briefpapier_modus === 'eerste_en_vervolg' && (
                  <div className="space-y-2 pt-2 border-t border-border dark:border-border">
                    <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">Vervolgpapier (pagina 2+)</Label>
                    {style.vervolgpapier_url ? (
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-border dark:border-border p-2 bg-background dark:bg-foreground/80/50 flex-1">
                          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <Check className="w-3.5 h-3.5" />
                            Vervolgpapier geüpload
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStyle({ vervolgpapier_url: '' })}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => vervolgpapierInputRef.current?.click()}
                        disabled={uploadingVervolgpapier}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        {uploadingVervolgpapier ? 'Uploaden...' : 'Vervolgpapier uploaden'}
                      </Button>
                    )}
                    <input
                      ref={vervolgpapierInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleVervolgpapierUpload}
                      className="hidden"
                    />
                    <p className="text-[11px] text-muted-foreground dark:text-muted-foreground/60">
                      Achtergrond voor pagina 2 en verder. Gebruik een compactere header dan het briefpapier.
                    </p>
                  </div>
                )}
              </>
            )}
          </Section>
          </>
          )}
        </div>

        {/* RIGHT: Live Preview */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground/70 dark:text-muted-foreground/50">
                Live voorbeeld
              </h3>
              <span className="text-xs text-muted-foreground/60 dark:text-muted-foreground">
                Klik om te vergroten
              </span>
            </div>
            <DocumentPreview
              style={style}
              logoUrl={logoUrl}
              bedrijfsnaam={bedrijfsnaam}
              bedrijfsAdres={bedrijfsAdres}
              kvkNummer={kvkNummer}
              btwNummer={btwNummer}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
