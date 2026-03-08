import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Upload, X, Image as ImageIcon, Sparkles,
  Loader2, Download, Save, RefreshCw, Trash2, Palette,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  createSigningVisualisatie,
  getVisualizerCredits,
  gebruikCredit,
} from '@/services/supabaseService'
import type { SigningVisualisatie } from '@/types'

interface SigningVisualizerDialogProps {
  isOpen: boolean
  onClose: () => void
  offerte_id?: string
  project_id?: string
  klant_id?: string
  onVisualisatieOpgeslagen?: (v: SigningVisualisatie) => void
}

type GeneratieStatus = 'idle' | 'claude' | 'uploaden' | 'genereren' | 'klaar' | 'fout'

const STATUS_LABELS: Record<GeneratieStatus, string> = {
  idle: '',
  claude: 'Claude analyseert foto\'s...',
  uploaden: 'Uploaden naar AI...',
  genereren: 'Mockup genereren...',
  klaar: 'Klaar!',
  fout: 'Fout opgetreden',
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

  // Simple state: photo, logo, description
  const [gebouwFoto, setGebouwFoto] = useState<string | null>(null)
  const [gebouwFotoNaam, setGebouwFotoNaam] = useState('')
  const [logoFoto, setLogoFoto] = useState<string | null>(null)
  const [logoFotoNaam, setLogoFotoNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')

  // Generation state
  const [generatieStatus, setGeneratieStatus] = useState<GeneratieStatus>('idle')
  const [resultaat, setResultaat] = useState<{
    url: string
    fal_request_id: string
    generatie_tijd_ms: number
    prompt_gebruikt: string
  } | null>(null)
  const [creditSaldo, setCreditSaldo] = useState(0)

  // Load credits
  useEffect(() => {
    if (!user?.id || !isOpen) return
    getVisualizerCredits(user.id).then(c => setCreditSaldo(c.saldo)).catch(() => {})
  }, [user?.id, isOpen])

  // Resize image to stay under Vercel's 4.5MB request limit
  const resizeImage = useCallback((dataUrl: string, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = dataUrl
    })
  }, [])

  const processFile = useCallback(async (file: File, type: 'gebouw' | 'logo') => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Alleen JPG, PNG en WEBP'); return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const raw = reader.result as string
      // Resize: gebouw max 1200px, logo max 800px — keeps payload under Vercel limit
      const resized = await resizeImage(raw, type === 'gebouw' ? 1200 : 800, 0.8)
      if (type === 'gebouw') { setGebouwFoto(resized); setGebouwFotoNaam(file.name) }
      else { setLogoFoto(resized); setLogoFotoNaam(file.name) }
    }
    reader.readAsDataURL(file)
  }, [resizeImage])

  // File handling
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'gebouw' | 'logo') => {
    const file = e.target.files?.[0]
    if (file) processFile(file, type)
  }, [processFile])

  const handleDrop = useCallback((e: React.DragEvent, type: 'gebouw' | 'logo') => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file, type)
  }, [processFile])

  // Generate mockup
  const handleGenereer = useCallback(async () => {
    if (!user?.id || !gebouwFoto || !beschrijving.trim()) return

    if (creditSaldo <= 0) {
      toast.error('Geen credits meer. Koop credits aan in de instellingen.')
      return
    }

    try {
      // Use credit first
      const newCredits = await gebruikCredit(user.id, '')
      setCreditSaldo(newCredits.saldo)

      setGeneratieStatus('claude')

      const response = await fetch('/api/generate-signing-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gebouw_foto_base64: gebouwFoto,
          logo_base64: logoFoto || undefined,
          beschrijving: beschrijving.trim(),
        }),
      })

      setGeneratieStatus('genereren')

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Generatie mislukt')
      }

      const data = await response.json()
      setResultaat(data)
      setGeneratieStatus('klaar')
      toast.success('Mockup gegenereerd!')
    } catch (error: unknown) {
      setGeneratieStatus('fout')
      const msg = error instanceof Error ? error.message : 'Onbekende fout'
      toast.error(`Mislukt: ${msg}`)
    }
  }, [user?.id, gebouwFoto, logoFoto, beschrijving, creditSaldo])

  // Save result
  const handleOpslaan = useCallback(async () => {
    if (!user?.id || !resultaat || !gebouwFoto) return
    try {
      const visualisatie = await createSigningVisualisatie({
        user_id: user.id,
        offerte_id,
        project_id,
        klant_id,
        gebouw_foto_url: gebouwFoto,
        logo_url: logoFoto || undefined,
        prompt_gebruikt: resultaat.prompt_gebruikt,
        aangepaste_prompt: beschrijving,
        signing_type: 'led_verlicht',
        kleur_instelling: 'auto',
        resolutie: '2K',
        resultaat_url: resultaat.url,
        status: 'klaar',
        api_kosten_eur: 0.11,
        wisselkoers_gebruikt: 0.92,
        doorberekend_aan_klant: false,
        fal_request_id: resultaat.fal_request_id,
        generatie_tijd_ms: resultaat.generatie_tijd_ms,
      })
      toast.success('Opgeslagen!')
      onVisualisatieOpgeslagen?.(visualisatie)
      onClose()
    } catch {
      toast.error('Opslaan mislukt')
    }
  }, [user?.id, resultaat, gebouwFoto, logoFoto, beschrijving, offerte_id, project_id, klant_id, onVisualisatieOpgeslagen, onClose])

  const handleDownload = useCallback(() => {
    if (!resultaat?.url) return
    const a = document.createElement('a')
    a.href = resultaat.url
    a.download = `signing-mockup-${Date.now()}.png`
    a.target = '_blank'
    a.click()
  }, [resultaat])

  const handleOpnieuw = useCallback(() => {
    setResultaat(null)
    setGeneratieStatus('idle')
  }, [])

  const isGenerating = ['claude', 'uploaden', 'genereren'].includes(generatieStatus)

  // ── Result view ──
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
                {gebouwFoto && <img src={gebouwFoto} alt="Origineel" className="w-full h-full object-cover" />}
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
            <span>1 credit gebruikt</span>
            <span>|</span>
            <span>Generatietijd: {(resultaat.generatie_tijd_ms / 1000).toFixed(1)}s</span>
          </div>

          {/* Show the Claude-generated prompt */}
          <details className="text-xs">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
              Gebruikte AI prompt bekijken
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-lg whitespace-pre-wrap font-mono text-muted-foreground">
              {resultaat.prompt_gebruikt}
            </pre>
          </details>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleOpslaan} className="gap-2">
              <Save className="h-4 w-4" /> Opslaan{offerte_id ? ' bij offerte' : ''}
            </Button>
            <Button variant="outline" onClick={handleOpnieuw} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Opnieuw
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

  // ── Main form: 3 simple steps ──
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Signing Visualizer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* STAP 1: Gebouwfoto */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              📸 Foto van het gebouw
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
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'gebouw')}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Sleep foto hierheen of <span className="text-primary font-medium">klik om te uploaden</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Tip: rechte foto, goede belichting</p>
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

          {/* STAP 2: Logo (optioneel) */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              🎨 Logo / artwork <span className="text-muted-foreground font-normal">(optioneel)</span>
            </Label>
            {logoFoto ? (
              <div className="relative rounded-lg overflow-hidden border bg-muted inline-block">
                <img src={logoFoto} alt="Logo" className="max-h-20 object-contain p-2" />
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
                className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => logoInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'logo')}
              >
                <ImageIcon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">PNG met transparante achtergrond werkt het best</p>
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

          {/* STAP 3: Wat wil je zien? */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              ✍️ Wat wil je zien?
            </Label>
            <Textarea
              value={beschrijving}
              onChange={(e) => setBeschrijving(e.target.value)}
              placeholder='bijv. "LED doosletters boven de deur, warmwit, modern" of "Neon bord in het raam met ons logo"'
              className="text-sm"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Claude AI analyseert je foto en maakt de perfecte mockup
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-2 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Kosten: <span className="font-medium text-foreground">1 credit</span> per mockup
            </div>
            <div className="text-xs text-muted-foreground">
              Saldo: <span className={cn('font-medium', creditSaldo < 5 ? 'text-orange-500' : 'text-foreground')}>{creditSaldo} credits</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Annuleren
            </Button>
            <Button
              onClick={handleGenereer}
              disabled={!gebouwFoto || !beschrijving.trim() || isGenerating || creditSaldo <= 0}
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
              Claude analyseert je foto en maakt een mockup — ca. 15-30 seconden
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
