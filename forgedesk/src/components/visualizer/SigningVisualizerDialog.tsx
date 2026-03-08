import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Upload, X, Image as ImageIcon, Lightbulb, Sparkles,
  ChevronDown, ChevronUp, Loader2, Download, Save,
  RefreshCw, Trash2, Info, Palette, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { round2 } from '@/utils/budgetUtils'
import {
  DEFAULT_VISUALIZER_INSTELLINGEN,
  berekenDoorberekendBedrag,
  bouwPrompt,
  KOSTEN_PER_RESOLUTIE_USD,
  SIGNING_TYPE_LABELS,
  SIGNING_TYPE_TOOLTIPS,
  KLEUR_PRESETS,
} from '@/utils/visualizerDefaults'
import {
  getVisualizerInstellingen,
  createSigningVisualisatie,
  logVisualizerActie,
  getVisualizerCredits,
  gebruikCredit,
} from '@/services/supabaseService'
import type { SigningVisualisatie, SigningType, VisualizerInstellingen } from '@/types'

interface SigningVisualizerDialogProps {
  isOpen: boolean
  onClose: () => void
  offerte_id?: string
  project_id?: string
  klant_id?: string
  onVisualisatieOpgeslagen?: (v: SigningVisualisatie) => void
}

type GeneratieStatus = 'idle' | 'verbinding' | 'uploaden' | 'verwerken' | 'ophalen' | 'klaar' | 'fout'

const STATUS_LABELS: Record<GeneratieStatus, string> = {
  idle: '',
  verbinding: 'Verbinding maken...',
  uploaden: "Foto's uploaden...",
  verwerken: 'AI verwerkt...',
  ophalen: 'Mockup ophalen...',
  klaar: 'Klaar!',
  fout: 'Fout opgetreden',
}

const SIGNING_TYPE_ICONS: Record<string, string> = {
  led_verlicht: '💡',
  neon: '🌈',
  dag_onverlicht: '☀️',
  dag_nacht: '🌗',
}

export function SigningVisualizerDialog({
  isOpen,
  onClose,
  offerte_id,
  project_id,
  klant_id,
  onVisualisatieOpgeslagen,
}: SigningVisualizerDialogProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [gebouwFoto, setGebouwFoto] = useState<string | null>(null)
  const [gebouwFotoNaam, setGebouwFotoNaam] = useState('')
  const [logoFoto, setLogoFoto] = useState<string | null>(null)
  const [logoFotoNaam, setLogoFotoNaam] = useState('')
  const [signingType, setSigningType] = useState<SigningType>('led_verlicht')
  const [kleur, setKleur] = useState('wit')
  const [customKleur, setCustomKleur] = useState('#FFFFFF')
  const [isCustomKleur, setIsCustomKleur] = useState(false)
  const [breedteCm, setBreedteCm] = useState<string>('')
  const [hoogteCm, setHoogteCm] = useState<string>('')
  const [resolutie, setResolutie] = useState<'1K' | '2K' | '4K'>('2K')
  const [extraInstructies, setExtraInstructies] = useState('')
  const [doorberekenen, setDoorberekenen] = useState(true)

  // Prompt state
  const [toonPrompt, setToonPrompt] = useState(false)
  const [handmatigPrompt, setHandmatigPrompt] = useState(false)
  const [promptTekst, setPromptTekst] = useState('')

  // Generation state
  const [generatieStatus, setGeneratieStatus] = useState<GeneratieStatus>('idle')
  const [resultaat, setResultaat] = useState<{
    url: string
    fal_request_id: string
    generatie_tijd_ms: number
    api_kosten_usd: number
  } | null>(null)

  // Settings
  const [instellingen, setInstellingen] = useState<VisualizerInstellingen>(DEFAULT_VISUALIZER_INSTELLINGEN)
  const [creditSaldo, setCreditSaldo] = useState(0)

  // Load settings
  useEffect(() => {
    if (!user?.id || !isOpen) return
    let cancelled = false
    async function load() {
      try {
        const [inst, credits] = await Promise.all([
          getVisualizerInstellingen(user!.id),
          getVisualizerCredits(user!.id),
        ])
        if (cancelled) return
        setInstellingen(inst)
        setResolutie(inst.standaard_resolutie)
        setDoorberekenen(inst.standaard_doorberekenen)
        setCreditSaldo(credits.saldo)
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, isOpen])

  // Build prompt when inputs change
  useEffect(() => {
    if (handmatigPrompt) return
    const effectieveKleur = isCustomKleur ? customKleur : kleur
    const prompt = bouwPrompt(
      signingType,
      effectieveKleur,
      instellingen,
      extraInstructies,
      breedteCm ? Number(breedteCm) : undefined,
      hoogteCm ? Number(hoogteCm) : undefined,
    )
    setPromptTekst(prompt)
  }, [signingType, kleur, customKleur, isCustomKleur, breedteCm, hoogteCm, extraInstructies, instellingen, handmatigPrompt])

  const effectieveKleur = isCustomKleur ? customKleur : kleur
  const kostenUsd = KOSTEN_PER_RESOLUTIE_USD[resolutie] || 0.12
  const kostenEur = round2(kostenUsd * instellingen.usd_eur_wisselkoers)
  const doorberekendBedrag = berekenDoorberekendBedrag(kostenUsd, instellingen)

  // File handling
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'gebouw' | 'logo') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bestand is groter dan 10MB')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Alleen JPG, PNG en WEBP zijn toegestaan')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (type === 'gebouw') {
        setGebouwFoto(result)
        setGebouwFotoNaam(file.name)
      } else {
        setLogoFoto(result)
        setLogoFotoNaam(file.name)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, type: 'gebouw' | 'logo') => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bestand is groter dan 10MB')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Alleen JPG, PNG en WEBP zijn toegestaan')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (type === 'gebouw') {
        setGebouwFoto(result)
        setGebouwFotoNaam(file.name)
      } else {
        setLogoFoto(result)
        setLogoFotoNaam(file.name)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  // Generate mockup
  const handleGenereer = useCallback(async () => {
    if (!user?.id || !gebouwFoto) return

    if (creditSaldo <= 0) {
      toast.error('Geen credits beschikbaar. Koop credits aan in de instellingen.')
      return
    }

    try {
      setGeneratieStatus('verbinding')

      await logVisualizerActie({
        user_id: user.id,
        visualisatie_id: '',
        timestamp: new Date().toISOString(),
        actie: 'generatie_gestart',
      })

      setGeneratieStatus('uploaden')

      // Use credit
      const newCredits = await gebruikCredit(user.id, '')
      setCreditSaldo(newCredits.saldo)

      setGeneratieStatus('verwerken')

      const response = await fetch('/api/generate-signing-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gebouw_foto_base64: gebouwFoto,
          logo_base64: logoFoto || undefined,
          prompt: promptTekst,
          resolutie,
        }),
      })

      setGeneratieStatus('ophalen')

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Generatie mislukt')
      }

      const data = await response.json()
      setResultaat(data)
      setGeneratieStatus('klaar')

      await logVisualizerActie({
        user_id: user.id,
        visualisatie_id: '',
        timestamp: new Date().toISOString(),
        actie: 'generatie_klaar',
        api_kosten_usd: data.api_kosten_usd,
      })

      toast.success('Mockup succesvol gegenereerd!')
    } catch (error: unknown) {
      setGeneratieStatus('fout')
      const msg = error instanceof Error ? error.message : 'Onbekende fout'
      toast.error(`Generatie mislukt: ${msg}`)

      await logVisualizerActie({
        user_id: user.id,
        visualisatie_id: '',
        timestamp: new Date().toISOString(),
        actie: 'generatie_fout',
        fout_melding: msg,
      }).catch(() => {})
    }
  }, [user?.id, gebouwFoto, logoFoto, promptTekst, resolutie, creditSaldo])

  // Save result
  const handleOpslaan = useCallback(async () => {
    if (!user?.id || !resultaat || !gebouwFoto) return

    try {
      const apiKostenEur = round2(resultaat.api_kosten_usd * instellingen.usd_eur_wisselkoers)
      const visualisatie = await createSigningVisualisatie({
        user_id: user.id,
        offerte_id,
        project_id,
        klant_id,
        gebouw_foto_url: gebouwFoto,
        logo_url: logoFoto || undefined,
        prompt_gebruikt: promptTekst,
        aangepaste_prompt: extraInstructies || undefined,
        breedte_cm: breedteCm ? Number(breedteCm) : undefined,
        hoogte_cm: hoogteCm ? Number(hoogteCm) : undefined,
        kleur_instelling: effectieveKleur,
        signing_type: signingType,
        resolutie,
        resultaat_url: resultaat.url,
        status: 'klaar',
        api_kosten_eur: apiKostenEur,
        wisselkoers_gebruikt: instellingen.usd_eur_wisselkoers,
        doorberekend_aan_klant: doorberekenen,
        fal_request_id: resultaat.fal_request_id,
        generatie_tijd_ms: resultaat.generatie_tijd_ms,
      })

      toast.success('Visualisatie opgeslagen!')
      onVisualisatieOpgeslagen?.(visualisatie)
      onClose()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Opslaan mislukt'
      toast.error(msg)
    }
  }, [user?.id, resultaat, gebouwFoto, logoFoto, promptTekst, extraInstructies, breedteCm, hoogteCm, effectieveKleur, signingType, resolutie, instellingen, doorberekenen, offerte_id, project_id, klant_id, onVisualisatieOpgeslagen, onClose])

  // Download
  const handleDownload = useCallback(() => {
    if (!resultaat?.url) return
    const a = document.createElement('a')
    a.href = resultaat.url
    a.download = `signing-mockup-${signingType}-${Date.now()}.png`
    a.target = '_blank'
    a.click()
  }, [resultaat, signingType])

  // Reset for new generation
  const handleOpnieuw = useCallback(() => {
    setResultaat(null)
    setGeneratieStatus('idle')
  }, [])

  const isGenerating = ['verbinding', 'uploaden', 'verwerken', 'ophalen'].includes(generatieStatus)
  const oppervlakteM2 = breedteCm && hoogteCm ? round2((Number(breedteCm) * Number(hoogteCm)) / 10000) : null

  // Result view
  if (generatieStatus === 'klaar' && resultaat) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-green-500">✅</span> Mockup gegenereerd!
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Origineel</Label>
              <div className="relative rounded-lg overflow-hidden border bg-muted aspect-[4/3]">
                {gebouwFoto && (
                  <img src={gebouwFoto} alt="Origineel" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">AI Mockup</Label>
              <div className="relative rounded-lg overflow-hidden border bg-muted aspect-[4/3]">
                <img src={resultaat.url} alt="Mockup" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Kosten: €{round2(resultaat.api_kosten_usd * instellingen.usd_eur_wisselkoers)}</span>
            <span>|</span>
            <span>Generatietijd: {(resultaat.generatie_tijd_ms / 1000).toFixed(1)}s</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={doorberekenen}
                onChange={(e) => setDoorberekenen(e.target.checked)}
                className="rounded"
              />
              Doorberekenen aan klant (€{doorberekendBedrag} excl. BTW)
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleOpslaan} className="gap-2">
              <Save className="h-4 w-4" /> Opslaan{offerte_id ? ' bij offerte' : ''}
            </Button>
            <Button variant="outline" onClick={handleOpnieuw} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Opnieuw genereren
            </Button>
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button variant="ghost" onClick={onClose} className="gap-2 ml-auto">
              <Trash2 className="h-4 w-4" /> Weggooien
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Signing Visualizer
          </DialogTitle>
        </DialogHeader>

        {/* Guidance Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">
                Upload een rechte foto van de gevel waarop de signing komt.
              </p>
              <p className="text-blue-600 dark:text-blue-400 mt-1">
                Tips: goede belichting, frontaal, geen sterke hoeken. Hoe beter de foto, hoe realistischer de mockup.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* STAP 1: Gebouwfoto */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">1</Badge>
              Gebouwfoto uploaden
            </Label>
            {gebouwFoto ? (
              <div className="relative rounded-lg overflow-hidden border bg-muted">
                <img src={gebouwFoto} alt="Gebouw" className="w-full max-h-48 object-cover" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => { setGebouwFoto(null); setGebouwFotoNaam('') }}
                >
                  <X className="h-3 w-3" />
                </Button>
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {gebouwFotoNaam}
                </span>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'gebouw')}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Sleep foto hierheen of <span className="text-primary font-medium">klik om te uploaden</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Max 10MB — JPG, PNG of WEBP</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'gebouw')}
            />
          </div>

          {/* STAP 2: Logo */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">2</Badge>
              Logo / artwork
              <span className="text-muted-foreground font-normal">(optioneel)</span>
            </Label>
            {logoFoto ? (
              <div className="relative rounded-lg overflow-hidden border bg-muted inline-block">
                <img src={logoFoto} alt="Logo" className="max-h-24 object-contain p-2" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1"
                  onClick={() => { setLogoFoto(null); setLogoFotoNaam('') }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => logoInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'logo')}
              >
                <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  PNG met transparante achtergrond werkt het best
                </p>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'logo')}
            />
          </div>

          {/* STAP 3: Type signing */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">3</Badge>
              Type signing
            </Label>
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-2">
                {(['led_verlicht', 'neon', 'dag_onverlicht', 'dag_nacht'] as SigningType[]).map((type) => (
                  <Tooltip key={type}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSigningType(type)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left',
                          signingType === type
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/30'
                        )}
                      >
                        <span>{SIGNING_TYPE_ICONS[type]}</span>
                        {SIGNING_TYPE_LABELS[type]}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      {SIGNING_TYPE_TOOLTIPS[type]}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* STAP 4: Opties */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">4</Badge>
              Kleur & opties
            </Label>

            {/* Kleur presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {KLEUR_PRESETS.map((preset) => (
                <button
                  key={preset.waarde}
                  onClick={() => { setKleur(preset.waarde); setIsCustomKleur(false) }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all',
                    !isCustomKleur && kleur === preset.waarde
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: preset.hex }}
                  />
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setIsCustomKleur(true)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all',
                  isCustomKleur
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <Palette className="h-3 w-3" />
                Custom
              </button>
            </div>

            {isCustomKleur && (
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="color"
                  value={customKleur}
                  onChange={(e) => setCustomKleur(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <Input
                  value={customKleur}
                  onChange={(e) => setCustomKleur(e.target.value)}
                  className="w-28 text-xs"
                  placeholder="#FF6B35"
                />
              </div>
            )}

            {/* Afmetingen */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Breedte (cm)</Label>
                <Input
                  type="number"
                  value={breedteCm}
                  onChange={(e) => setBreedteCm(e.target.value)}
                  placeholder="bijv. 200"
                  className="text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Hoogte (cm)</Label>
                <Input
                  type="number"
                  value={hoogteCm}
                  onChange={(e) => setHoogteCm(e.target.value)}
                  placeholder="bijv. 60"
                  className="text-sm"
                />
              </div>
              {oppervlakteM2 !== null && (
                <div className="text-xs text-muted-foreground pt-4">
                  = {oppervlakteM2} m²
                </div>
              )}
            </div>

            {/* Resolutie */}
            <div className="mb-3">
              <Label className="text-xs text-muted-foreground mb-1 block">Resolutie output</Label>
              <div className="flex gap-2">
                {(['1K', '2K', '4K'] as const).map((res) => {
                  const kosten = round2((KOSTEN_PER_RESOLUTIE_USD[res] || 0) * instellingen.usd_eur_wisselkoers)
                  return (
                    <button
                      key={res}
                      onClick={() => setResolutie(res)}
                      className={cn(
                        'px-3 py-1.5 rounded-md border text-xs font-medium transition-all',
                        resolutie === res
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      {res} {res === '2K' && <span className="text-muted-foreground">(aanbevolen)</span>}
                      <span className="block text-muted-foreground">€{kosten}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Extra instructies */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Extra instructies (optioneel)</Label>
              <Textarea
                value={extraInstructies}
                onChange={(e) => setExtraInstructies(e.target.value)}
                placeholder='bijv. "vrijstaande letters, geen bak" of "logo links uitlijnen"'
                className="text-sm"
                rows={2}
              />
            </div>
          </div>

          {/* STAP 5: Prompt preview */}
          <div>
            <button
              onClick={() => setToonPrompt(!toonPrompt)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Badge variant="outline" className="text-xs">5</Badge>
              <Eye className="h-3.5 w-3.5" />
              Gegenereerde prompt
              {toonPrompt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {toonPrompt && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={handmatigPrompt}
                      onChange={(e) => setHandmatigPrompt(e.target.checked)}
                      className="rounded"
                    />
                    Handmatig bewerken
                  </label>
                </div>
                <Textarea
                  value={promptTekst}
                  onChange={(e) => setPromptTekst(e.target.value)}
                  readOnly={!handmatigPrompt}
                  className={cn('text-xs font-mono', !handmatigPrompt && 'bg-muted')}
                  rows={6}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-2 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Kosten: <span className="font-medium text-foreground">€{kostenEur}</span> (excl. BTW)
              {doorberekenen && (
                <span className="ml-1">— doorberekend: €{doorberekendBedrag}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Credits: <span className={cn('font-medium', creditSaldo < 5 ? 'text-orange-500' : 'text-foreground')}>{creditSaldo}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Annuleren
            </Button>
            <Button
              onClick={handleGenereer}
              disabled={!gebouwFoto || isGenerating || creditSaldo <= 0}
              className="ml-auto gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {STATUS_LABELS[generatieStatus]}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Genereer Mockup
                </>
              )}
            </Button>
          </div>

          {isGenerating && (
            <p className="text-xs text-muted-foreground text-center">
              Dit duurt ca. 10-15 seconden
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
