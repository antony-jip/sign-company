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
  Loader2, Download, Save, Trash2, Palette,
  Send, Bot, Maximize2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  createSigningVisualisatie,
  getVisualizerCredits,
} from '@/services/supabaseService'
import supabase from '@/services/supabaseClient'
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

interface ChatBericht {
  id: string
  rol: 'user' | 'assistant' | 'systeem'
  tekst: string
  afbeelding_url?: string
  generatie_tijd_ms?: number
  prompt_gebruikt?: string
  fal_request_id?: string
  timestamp: Date
}

const RATIO_OPTIES = [
  { label: '1:1', value: '1:1' },
  { label: '4:3', value: '4:3' },
  { label: '16:9', value: '16:9' },
  { label: '3:4', value: '3:4' },
  { label: '9:16', value: '9:16' },
  { label: '3:2', value: '3:2' },
]

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
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  const [foto, setFoto] = useState<string | null>(null)
  const [fotoNaam, setFotoNaam] = useState('')
  const [logoFoto, setLogoFoto] = useState<string | null>(null)
  const [logoFotoNaam, setLogoFotoNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [ratio, setRatio] = useState('4:3')

  const [generatieStatus, setGeneratieStatus] = useState<GeneratieStatus>('idle')
  const [resultaat, setResultaat] = useState<{
    url: string
    fal_request_id: string
    generatie_tijd_ms: number
    prompt_gebruikt: string
  } | null>(null)
  const [creditSaldo, setCreditSaldo] = useState(0)

  // Chat state
  const [chatBerichten, setChatBerichten] = useState<ChatBericht[]>([])
  const [chatInput, setChatInput] = useState('')
  const [inChatModus, setInChatModus] = useState(false)

  useEffect(() => {
    if (!user?.id || !isOpen) return
    let cancelled = false
    getVisualizerCredits(user.id).then(c => { if (!cancelled) setCreditSaldo(c.saldo) }).catch(() => {})
    return () => { cancelled = true }
  }, [user?.id, isOpen])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatBerichten])

  useEffect(() => {
    if (inChatModus && generatieStatus === 'klaar') {
      setTimeout(() => chatInputRef.current?.focus(), 200)
    }
  }, [inChatModus, generatieStatus])

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

  const processFile = useCallback(async (file: File, type: 'foto' | 'logo') => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Alleen JPG, PNG en WEBP'); return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const raw = reader.result as string
      const resized = await resizeImage(raw, type === 'foto' ? 1200 : 800, 0.8)
      if (type === 'foto') { setFoto(resized); setFotoNaam(file.name) }
      else { setLogoFoto(resized); setLogoFotoNaam(file.name) }
    }
    reader.readAsDataURL(file)
  }, [resizeImage])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'foto' | 'logo') => {
    const file = e.target.files?.[0]
    if (file) processFile(file, type)
  }, [processFile])

  const handleDrop = useCallback((e: React.DragEvent, type: 'foto' | 'logo') => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file, type)
  }, [processFile])

  const buildChatGeschiedenis = useCallback(() => {
    return chatBerichten
      .filter(b => b.rol !== 'systeem')
      .map(b => ({ rol: b.rol as 'user' | 'assistant', tekst: b.tekst }))
  }, [chatBerichten])

  // Auth token ophalen voor server-side credit check
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    }
    return headers
  }, [])

  // Generate
  const handleGenereer = useCallback(async () => {
    if (!user?.id || !foto || !beschrijving.trim()) return
    if (creditSaldo <= 0) {
      toast.error('Geen credits meer — koop credits via Instellingen > Forgie AI')
      return
    }

    try {
      setGeneratieStatus('claude')
      setInChatModus(true)

      setChatBerichten([{
        id: crypto.randomUUID(),
        rol: 'user',
        tekst: beschrijving.trim(),
        afbeelding_url: foto,
        timestamp: new Date(),
      }])

      const headers = await getAuthHeaders()
      const response = await fetch('/api/generate-signing-mockup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gebouw_foto_base64: foto,
          logo_base64: logoFoto || undefined,
          beschrijving: beschrijving.trim(),
          ratio,
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

      // Credits saldo verversen na succesvolle generatie (server heeft afgeschreven)
      getVisualizerCredits(user.id).then(c => setCreditSaldo(c.saldo)).catch(() => {})

      setChatBerichten(prev => [...prev, {
        id: crypto.randomUUID(),
        rol: 'assistant',
        tekst: 'Hier is je visualisatie! Typ hieronder als je iets wilt aanpassen.',
        afbeelding_url: data.url,
        generatie_tijd_ms: data.generatie_tijd_ms,
        prompt_gebruikt: data.prompt_gebruikt,
        fal_request_id: data.fal_request_id,
        timestamp: new Date(),
      }])
    } catch (error: unknown) {
      setGeneratieStatus('fout')
      setChatBerichten(prev => [...prev, {
        id: crypto.randomUUID(),
        rol: 'systeem',
        tekst: `Mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        timestamp: new Date(),
      }])
    }
  }, [user?.id, foto, logoFoto, beschrijving, ratio, creditSaldo, getAuthHeaders])

  // Chat refinement
  const handleChatVerfijning = useCallback(async () => {
    if (!user?.id || !chatInput.trim() || !foto) return
    if (creditSaldo <= 0) {
      toast.error('Geen credits meer — koop credits via Instellingen > Forgie AI')
      return
    }

    const tekst = chatInput.trim()
    setChatInput('')

    setChatBerichten(prev => [...prev, {
      id: crypto.randomUUID(),
      rol: 'user',
      tekst,
      timestamp: new Date(),
    }])

    try {
      setGeneratieStatus('claude')

      const headers = await getAuthHeaders()
      const response = await fetch('/api/generate-signing-mockup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gebouw_foto_base64: foto,
          logo_base64: logoFoto || undefined,
          beschrijving: tekst,
          ratio,
          chat_geschiedenis: buildChatGeschiedenis(),
        }),
      })

      setGeneratieStatus('genereren')

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Aanpassing mislukt')
      }

      const data = await response.json()
      setResultaat(data)
      setGeneratieStatus('klaar')

      // Credits saldo verversen
      getVisualizerCredits(user.id).then(c => setCreditSaldo(c.saldo)).catch(() => {})

      setChatBerichten(prev => [...prev, {
        id: crypto.randomUUID(),
        rol: 'assistant',
        tekst: 'Aangepast! Nog iets veranderen?',
        afbeelding_url: data.url,
        generatie_tijd_ms: data.generatie_tijd_ms,
        prompt_gebruikt: data.prompt_gebruikt,
        fal_request_id: data.fal_request_id,
        timestamp: new Date(),
      }])
    } catch (error: unknown) {
      setGeneratieStatus('fout')
      setChatBerichten(prev => [...prev, {
        id: crypto.randomUUID(),
        rol: 'systeem',
        tekst: `Aanpassing mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        timestamp: new Date(),
      }])
    }
  }, [user?.id, chatInput, foto, logoFoto, ratio, creditSaldo, buildChatGeschiedenis, getAuthHeaders])

  const handleChatKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleChatVerfijning()
    }
  }, [handleChatVerfijning])

  const handleOpslaan = useCallback(async () => {
    if (!user?.id || !resultaat || !foto) return
    try {
      const visualisatie = await createSigningVisualisatie({
        user_id: user.id,
        offerte_id,
        project_id,
        klant_id,
        gebouw_foto_url: foto,
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
  }, [user?.id, resultaat, foto, logoFoto, beschrijving, offerte_id, project_id, klant_id, onVisualisatieOpgeslagen, onClose])

  const handleDownload = useCallback(() => {
    if (!resultaat?.url) return
    const a = document.createElement('a')
    a.href = resultaat.url
    a.download = `visualizer-mockup-${Date.now()}.png`
    a.target = '_blank'
    a.click()
  }, [resultaat])

  const isGenerating = ['claude', 'uploaden', 'genereren'].includes(generatieStatus)

  // ── Chat modus ──
  if (inChatModus) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4 text-primary" /> Visualizer Chat
            </DialogTitle>
            <div className="flex items-center gap-2">
              {resultaat && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleDownload}>
                    <Download className="h-3 w-3" /> Download
                  </Button>
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1.5" onClick={handleOpslaan}>
                    <Save className="h-3 w-3" /> Opslaan
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Chat berichten */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: '300px', maxHeight: '55vh' }}>
            {chatBerichten.map((bericht) => (
              <div
                key={bericht.id}
                className={cn(
                  'flex gap-3 max-w-[85%]',
                  bericht.rol === 'user' ? 'ml-auto flex-row-reverse' : '',
                  bericht.rol === 'systeem' ? 'mx-auto max-w-none justify-center' : '',
                )}
              >
                {bericht.rol !== 'systeem' && (
                  <div className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px]',
                    bericht.rol === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {bericht.rol === 'user' ? 'JIJ' : <Bot className="h-3 w-3" />}
                  </div>
                )}

                <div className="space-y-2">
                  {bericht.rol === 'systeem' && (
                    <div className="text-xs text-orange-500 bg-orange-500/10 rounded-lg px-3 py-2">
                      {bericht.tekst}
                    </div>
                  )}

                  {bericht.rol !== 'systeem' && (
                    <div className={cn(
                      'rounded-2xl px-3.5 py-2 text-sm',
                      bericht.rol === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md',
                    )}>
                      {bericht.tekst}
                    </div>
                  )}

                  {bericht.afbeelding_url && (
                    <div className={cn(
                      'rounded-xl overflow-hidden border shadow-sm',
                      bericht.rol === 'user' ? 'max-w-[200px]' : 'max-w-[400px]',
                    )}>
                      <img
                        src={bericht.afbeelding_url}
                        alt={bericht.rol === 'user' ? 'Upload' : 'AI Resultaat'}
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {bericht.generatie_tijd_ms && (
                    <div className="text-[10px] text-muted-foreground">
                      {(bericht.generatie_tijd_ms / 1000).toFixed(1)}s · 1 credit
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {generatieStatus === 'claude' ? 'Analyseren...' : 'Genereren...'}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="px-4 py-3 border-t">
            <div className="flex items-end gap-2">
              <Textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Beschrijf wat je wilt aanpassen..."
                className="text-sm min-h-[38px] max-h-[100px] resize-none"
                rows={1}
                disabled={isGenerating}
              />
              <Button
                onClick={handleChatVerfijning}
                disabled={!chatInput.trim() || isGenerating || creditSaldo <= 0}
                size="sm"
                className="h-[38px] w-[38px] p-0 flex-shrink-0"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">1 credit per aanpassing · Enter = verzenden</p>
              <span className={cn('text-[10px] font-medium', creditSaldo < 5 ? 'text-orange-500' : 'text-muted-foreground')}>
                {creditSaldo} credits
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Start formulier ──
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Signing Visualizer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Foto */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Foto / ontwerp</Label>
            <p className="text-xs text-muted-foreground mb-2">Gebouw, voertuig, schets of bestaand ontwerp</p>
            {foto ? (
              <div className="relative rounded-lg overflow-hidden border bg-muted">
                <img src={foto} alt="Upload" className="w-full max-h-48 object-cover" />
                <Button variant="destructive" size="sm" className="absolute top-2 right-2"
                  onClick={() => { setFoto(null); setFotoNaam('') }}>
                  <X className="h-3 w-3" />
                </Button>
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {fotoNaam}
                </span>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'foto')}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Sleep hierheen of <span className="text-primary font-medium">klik om te uploaden</span>
                </p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => handleFileUpload(e, 'foto')} />
          </div>

          {/* Logo */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Logo / artwork <span className="text-muted-foreground font-normal">(optioneel)</span>
            </Label>
            {logoFoto ? (
              <div className="relative rounded-lg overflow-hidden border bg-muted inline-block">
                <img src={logoFoto} alt="Logo" className="max-h-20 object-contain p-2" />
                <Button variant="destructive" size="sm" className="absolute top-1 right-1"
                  onClick={() => { setLogoFoto(null); setLogoFotoNaam('') }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                onClick={() => logoInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'logo')}
              >
                <ImageIcon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">PNG met transparante achtergrond werkt het best</p>
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => handleFileUpload(e, 'logo')} />
          </div>

          {/* Beschrijving */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Wat wil je zien?</Label>
            <Textarea
              value={beschrijving}
              onChange={(e) => setBeschrijving(e.target.value)}
              placeholder='bijv. "LED doosletters boven de deur" of "Maak dit ontwerp fotorealistisch"'
              className="text-sm"
              rows={3}
            />
          </div>

          {/* Ratio */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Maximize2 className="h-3 w-3" /> Beeldverhouding
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {RATIO_OPTIES.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRatio(opt.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    ratio === opt.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-2 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Kosten: <span className="font-medium text-foreground">1 credit</span> per generatie
            </div>
            <span className={cn('text-xs font-medium', creditSaldo < 5 ? 'text-orange-500' : 'text-muted-foreground')}>
              {creditSaldo} credits
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Annuleren</Button>
            <Button
              onClick={handleGenereer}
              disabled={!foto || !beschrijving.trim() || isGenerating || creditSaldo <= 0}
              className="ml-auto gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {generatieStatus === 'claude' ? 'Analyseren...' : 'Genereren...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Genereer Visualisatie
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
