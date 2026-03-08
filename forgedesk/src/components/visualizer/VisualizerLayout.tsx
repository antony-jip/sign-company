import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Palette, Upload, X, Image as ImageIcon, Sparkles,
  Loader2, Download, Save, RefreshCw, Trash2, Eye, Link2, Filter,
  Send, Bot, Plus, Maximize2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  getSigningVisualisaties,
  getVisualizerCredits,
  gebruikCredit,
  createSigningVisualisatie,
  deleteSigningVisualisatie,
  getProjecten,
  getOffertes,
} from '@/services/supabaseService'
import type { SigningVisualisatie, Project, Offerte } from '@/types'
import { VisualisatieLightbox } from './VisualisatieLightbox'

type GeneratieStatus = 'idle' | 'claude' | 'genereren' | 'klaar' | 'fout'

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
  { label: '1:1', value: '1:1', desc: 'Vierkant' },
  { label: '4:3', value: '4:3', desc: 'Landschap' },
  { label: '16:9', value: '16:9', desc: 'Breed' },
  { label: '3:4', value: '3:4', desc: 'Portret' },
  { label: '9:16', value: '9:16', desc: 'Story' },
  { label: '3:2', value: '3:2', desc: 'Foto' },
  { label: '21:9', value: '21:9', desc: 'Ultra breed' },
]

export function VisualizerLayout() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // ── Form state ──
  const [foto, setFoto] = useState<string | null>(null)
  const [fotoNaam, setFotoNaam] = useState('')
  const [logoFoto, setLogoFoto] = useState<string | null>(null)
  const [logoFotoNaam, setLogoFotoNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [ratio, setRatio] = useState('4:3')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedOfferte, setSelectedOfferte] = useState('')

  // ── Generation state ──
  const [generatieStatus, setGeneratieStatus] = useState<GeneratieStatus>('idle')
  const [resultaat, setResultaat] = useState<{
    url: string
    fal_request_id: string
    generatie_tijd_ms: number
    prompt_gebruikt: string
  } | null>(null)
  const [creditSaldo, setCreditSaldo] = useState(0)

  // ── Chat state ──
  const [chatBerichten, setChatBerichten] = useState<ChatBericht[]>([])
  const [chatInput, setChatInput] = useState('')
  const [inChatModus, setInChatModus] = useState(false)

  // ── Library state ──
  const [visualisaties, setVisualisaties] = useState<SigningVisualisatie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [filterKoppeling, setFilterKoppeling] = useState<'alle' | 'gekoppeld' | 'los'>('alle')

  // ── Data for linking ──
  const [projecten, setProjecten] = useState<Project[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])

  // ── Load data ──
  const ladenBibliotheek = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const items = await getSigningVisualisaties(user.id)
      setVisualisaties(items)
    } catch { /* ignore */ }
    setIsLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    ladenBibliotheek()
    getVisualizerCredits(user.id).then(c => setCreditSaldo(c.saldo)).catch(() => {})
    getProjecten().then(setProjecten).catch(() => {})
    getOffertes().then(setOffertes).catch(() => {})
  }, [user?.id, ladenBibliotheek])

  const filteredOffertes = selectedProject
    ? offertes.filter(o => o.project_id === selectedProject)
    : offertes

  // ── Image handling ──
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

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatBerichten])

  // ── Focus chat input when entering chat mode ──
  useEffect(() => {
    if (inChatModus && generatieStatus === 'klaar') {
      setTimeout(() => chatInputRef.current?.focus(), 200)
    }
  }, [inChatModus, generatieStatus])

  // ── Build chat history for API ──
  const buildChatGeschiedenis = useCallback(() => {
    return chatBerichten
      .filter(b => b.rol !== 'systeem')
      .map(b => ({ rol: b.rol as 'user' | 'assistant', tekst: b.tekst }))
  }, [chatBerichten])

  // ── Generate (eerste keer) ──
  const handleGenereer = useCallback(async () => {
    if (!user?.id || !foto || !beschrijving.trim()) return
    if (creditSaldo <= 0) {
      toast.error('Geen credits meer')
      return
    }

    try {
      const newCredits = await gebruikCredit(user.id, '')
      setCreditSaldo(newCredits.saldo)
      setGeneratieStatus('claude')
      setInChatModus(true)

      // Start chat met het eerste bericht
      setChatBerichten([{
        id: crypto.randomUUID(),
        rol: 'user',
        tekst: beschrijving.trim(),
        afbeelding_url: foto,
        timestamp: new Date(),
      }])

      const response = await fetch('/api/generate-signing-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        tekst: `Generatie mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        timestamp: new Date(),
      }])
    }
  }, [user?.id, foto, logoFoto, beschrijving, ratio, creditSaldo])

  // ── Chat verfijning ──
  const handleChatVerfijning = useCallback(async () => {
    if (!user?.id || !chatInput.trim() || !foto) return
    if (creditSaldo <= 0) {
      toast.error('Geen credits meer')
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
      const newCredits = await gebruikCredit(user.id, '')
      setCreditSaldo(newCredits.saldo)
      setGeneratieStatus('claude')

      const response = await fetch('/api/generate-signing-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        tekst: `Aanpassing mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}. Probeer het opnieuw.`,
        timestamp: new Date(),
      }])
    }
  }, [user?.id, chatInput, foto, logoFoto, ratio, creditSaldo, buildChatGeschiedenis])

  // ── Handle Enter in chat ──
  const handleChatKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleChatVerfijning()
    }
  }, [handleChatVerfijning])

  // ── Save result (pas koppelen aan project bij opslaan) ──
  const handleOpslaan = useCallback(async () => {
    if (!user?.id || !resultaat || !foto) return
    try {
      const project = projecten.find(p => p.id === selectedProject)
      await createSigningVisualisatie({
        user_id: user.id,
        offerte_id: selectedOfferte || undefined,
        project_id: selectedProject || undefined,
        klant_id: project?.klant_id || undefined,
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
      toast.success('Opgeslagen in bibliotheek!')
      handleNieuweSessie()
      ladenBibliotheek()
    } catch {
      toast.error('Opslaan mislukt')
    }
  }, [user?.id, resultaat, foto, logoFoto, beschrijving, selectedProject, selectedOfferte, projecten, ladenBibliotheek])

  // ── Nieuwe sessie ──
  const handleNieuweSessie = useCallback(() => {
    setResultaat(null)
    setGeneratieStatus('idle')
    setFoto(null)
    setFotoNaam('')
    setLogoFoto(null)
    setLogoFotoNaam('')
    setBeschrijving('')
    setRatio('4:3')
    setSelectedProject('')
    setSelectedOfferte('')
    setChatBerichten([])
    setChatInput('')
    setInChatModus(false)
  }, [])

  const handleDownload = useCallback((url: string, id: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `visualizer-mockup-${id.slice(0, 8)}.png`
    a.target = '_blank'
    a.click()
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!user?.id) return
    try {
      await deleteSigningVisualisatie(id, user.id)
      setVisualisaties(prev => prev.filter(v => v.id !== id))
      setDeleteConfirmId(null)
      toast.success('Verwijderd')
    } catch {
      toast.error('Verwijderen mislukt')
    }
  }, [user?.id])

  const isGenerating = ['claude', 'genereren'].includes(generatieStatus)

  const gefilterd = visualisaties.filter(v => {
    if (filterKoppeling === 'gekoppeld' && !v.project_id && !v.offerte_id) return false
    if (filterKoppeling === 'los' && (v.project_id || v.offerte_id)) return false
    return true
  })

  // Bereken totaal gebruikte credits in deze sessie
  const sessieCredits = chatBerichten.filter(b => b.rol === 'assistant' && b.afbeelding_url).length

  return (
    <div className="space-y-8">
      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted dark:bg-foreground/80 rounded-lg">
          <Palette className="w-6 h-6 text-muted-foreground dark:text-muted-foreground/60" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white font-display">
            Signing Visualizer
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload een foto of ontwerp, beschrijf het gewenste resultaat — AI doet de rest
          </p>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          <span className={cn('font-medium', creditSaldo < 5 ? 'text-orange-500' : 'text-foreground')}>{creditSaldo}</span> credits
        </div>
      </div>

      {/* ═══ Chat modus: volledige chat-interface ═══ */}
      {inChatModus ? (
        <div className="border rounded-xl bg-card overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Visualizer Chat</span>
              {sessieCredits > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {sessieCredits} credit{sessieCredits !== 1 ? 's' : ''} gebruikt
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {resultaat && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                    onClick={() => handleDownload(resultaat.url, resultaat.fal_request_id)}>
                    <Download className="h-3 w-3" /> Download
                  </Button>
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1.5"
                    onClick={() => {/* trigger save panel */ document.getElementById('save-panel')?.scrollIntoView({ behavior: 'smooth' })}}>
                    <Save className="h-3 w-3" /> Opslaan
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5"
                onClick={handleNieuweSessie}>
                <Plus className="h-3 w-3" /> Nieuw
              </Button>
            </div>
          </div>

          {/* Chat berichten */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {chatBerichten.map((bericht) => (
              <div
                key={bericht.id}
                className={cn(
                  'flex gap-3 max-w-[85%]',
                  bericht.rol === 'user' ? 'ml-auto flex-row-reverse' : '',
                  bericht.rol === 'systeem' ? 'mx-auto max-w-none justify-center' : '',
                )}
              >
                {/* Avatar */}
                {bericht.rol !== 'systeem' && (
                  <div className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs',
                    bericht.rol === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {bericht.rol === 'user' ? 'JIJ' : <Bot className="h-3.5 w-3.5" />}
                  </div>
                )}

                {/* Bericht content */}
                <div className={cn(
                  'space-y-2',
                  bericht.rol === 'systeem' ? 'text-center' : '',
                )}>
                  {/* Systeem berichten */}
                  {bericht.rol === 'systeem' && (
                    <div className="text-xs text-orange-500 bg-orange-500/10 rounded-lg px-3 py-2">
                      {bericht.tekst}
                    </div>
                  )}

                  {/* Tekst */}
                  {bericht.rol !== 'systeem' && (
                    <div className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm',
                      bericht.rol === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md',
                    )}>
                      {bericht.tekst}
                    </div>
                  )}

                  {/* Afbeelding */}
                  {bericht.afbeelding_url && (
                    <div className={cn(
                      'rounded-xl overflow-hidden border shadow-sm cursor-pointer hover:shadow-md transition-shadow',
                      bericht.rol === 'user' ? 'max-w-[300px]' : 'max-w-[500px]',
                    )}
                      onClick={() => {
                        if (bericht.rol === 'assistant' && bericht.afbeelding_url) {
                          window.open(bericht.afbeelding_url, '_blank')
                        }
                      }}
                    >
                      <img
                        src={bericht.afbeelding_url}
                        alt={bericht.rol === 'user' ? 'Upload' : 'AI Resultaat'}
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Metadata */}
                  {bericht.generatie_tijd_ms && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{(bericht.generatie_tijd_ms / 1000).toFixed(1)}s</span>
                      <span>·</span>
                      <span>1 credit</span>
                      {bericht.prompt_gebruikt && (
                        <>
                          <span>·</span>
                          <button
                            className="hover:text-foreground transition-colors underline underline-offset-2"
                            onClick={() => {
                              toast.info(bericht.prompt_gebruikt || '', { duration: 10000 })
                            }}
                          >
                            prompt bekijken
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Tijdstip */}
                  {bericht.rol !== 'systeem' && (
                    <div className="text-[10px] text-muted-foreground/60">
                      {bericht.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isGenerating && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {generatieStatus === 'claude' ? 'Analyseren...' : 'Genereren...'}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Opslaan panel (onder chat, boven input) */}
          {resultaat && generatieStatus === 'klaar' && (
            <div id="save-panel" className="px-4 py-3 border-t bg-muted/20">
              <div className="flex items-center gap-3">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <select
                  value={selectedProject}
                  onChange={(e) => { setSelectedProject(e.target.value); setSelectedOfferte('') }}
                  className="text-xs bg-background border rounded-md px-2 py-1.5 flex-1"
                >
                  <option value="">Geen project</option>
                  {projecten.map(p => (
                    <option key={p.id} value={p.id}>{p.naam} — {p.klant_naam}</option>
                  ))}
                </select>
                {selectedProject && (
                  <select
                    value={selectedOfferte}
                    onChange={(e) => setSelectedOfferte(e.target.value)}
                    className="text-xs bg-background border rounded-md px-2 py-1.5 flex-1"
                  >
                    <option value="">Geen offerte</option>
                    {filteredOffertes.map(o => (
                      <option key={o.id} value={o.id}>{o.nummer || o.titel}</option>
                    ))}
                  </select>
                )}
                <Button size="sm" onClick={handleOpslaan} className="gap-1.5 text-xs h-7">
                  <Save className="h-3 w-3" /> Opslaan in bibliotheek
                </Button>
              </div>
            </div>
          )}

          {/* Chat input */}
          <div className="px-4 py-3 border-t bg-card">
            <div className="flex items-end gap-2">
              <Textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Beschrijf wat je wilt aanpassen... (Enter = verzenden)"
                className="text-sm min-h-[40px] max-h-[120px] resize-none"
                rows={1}
                disabled={isGenerating}
              />
              <Button
                onClick={handleChatVerfijning}
                disabled={!chatInput.trim() || isGenerating || creditSaldo <= 0}
                size="sm"
                className="h-10 w-10 p-0 flex-shrink-0"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-muted-foreground">
                Elke aanpassing kost 1 credit · Shift+Enter voor nieuwe regel
              </p>
              <span className={cn(
                'text-[10px] font-medium',
                creditSaldo < 5 ? 'text-orange-500' : 'text-muted-foreground',
              )}>
                {creditSaldo} credits over
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ═══ Generator form (start scherm) ═══ */
        <div className="border rounded-xl bg-card p-6">
          <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-6">
            {/* Col 1: Referentiefoto */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Foto / ontwerp
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Gebouw, voertuig, schets of bestaand ontwerp
              </p>
              {foto ? (
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  <img src={foto} alt="Upload" className="w-full aspect-[4/3] object-cover" />
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
                  className="border-2 border-dashed rounded-lg aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'foto')}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Sleep hierheen of <span className="text-primary font-medium">klik</span>
                  </p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => handleFileUpload(e, 'foto')} />
            </div>

            {/* Col 2: Logo (optioneel) */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Logo / artwork <span className="text-muted-foreground font-normal">(optioneel)</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                PNG met transparante achtergrond werkt het best
              </p>
              {logoFoto ? (
                <div className="relative rounded-lg overflow-hidden border bg-muted aspect-[4/3] flex items-center justify-center">
                  <img src={logoFoto} alt="Logo" className="max-h-full max-w-full object-contain p-4" />
                  <Button variant="destructive" size="sm" className="absolute top-2 right-2"
                    onClick={() => { setLogoFoto(null); setLogoFotoNaam('') }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'logo')}
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Logo of artwork toevoegen
                  </p>
                </div>
              )}
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => handleFileUpload(e, 'logo')} />
            </div>

            {/* Col 3: Beschrijving + Ratio + Generate */}
            <div className="flex flex-col">
              <Label className="text-sm font-medium mb-2 block">
                Wat wil je zien?
              </Label>
              <Textarea
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                placeholder='bijv. "LED doosletters boven de deur, warmwit" of "Maak dit ontwerp fotorealistisch op een echte bus" of "Gevelreclame met neon letters"'
                className="text-sm flex-1 min-h-[100px]"
              />

              {/* Ratio selector */}
              <div className="mt-3 mb-3">
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
                      title={opt.desc}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenereer}
                disabled={!foto || !beschrijving.trim() || isGenerating || creditSaldo <= 0}
                className="gap-2 w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {generatieStatus === 'claude' ? 'Analyseren...' : 'Genereren...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Genereer Visualisatie — 1 credit
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Library ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground dark:text-white">Bibliotheek</h2>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {(['alle', 'gekoppeld', 'los'] as const).map((val) => (
              <Button
                key={val}
                size="sm"
                variant={filterKoppeling === val ? 'default' : 'outline'}
                onClick={() => setFilterKoppeling(val)}
                className="text-xs h-7"
              >
                {val === 'alle' ? 'Alle' : val === 'gekoppeld' ? 'Aan project' : 'Losse mockups'}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : gefilterd.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {visualisaties.length === 0
              ? 'Nog geen visualisaties — genereer je eerste hierboven'
              : 'Geen resultaten voor dit filter'}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {gefilterd.map((v, index) => {
              const project = projecten.find(p => p.id === v.project_id)
              const offerte = offertes.find(o => o.id === v.offerte_id)
              return (
                <div
                  key={v.id}
                  className="group relative border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all"
                >
                  <div className="aspect-[16/10] cursor-pointer overflow-hidden"
                    onClick={() => setLightboxIndex(index)}>
                    <img
                      src={v.resultaat_url}
                      alt="Mockup"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      {project && (
                        <Badge variant="secondary" className="text-[10px]">{project.naam}</Badge>
                      )}
                      {offerte && (
                        <Badge variant="outline" className="text-[10px]">{offerte.nummer || offerte.titel}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(v.created_at).toLocaleDateString('nl-NL')}</span>
                      <span>1 credit</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" className="h-6 w-6 p-0"
                      onClick={() => setLightboxIndex(index)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="secondary" className="h-6 w-6 p-0"
                      onClick={() => handleDownload(v.resultaat_url, v.id)}>
                      <Download className="h-3 w-3" />
                    </Button>
                    {deleteConfirmId === v.id ? (
                      <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px]"
                        onClick={() => handleDelete(v.id)}>
                        Bevestig
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" className="h-6 w-6 p-0"
                        onClick={() => setDeleteConfirmId(v.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <VisualisatieLightbox
          visualisaties={gefilterd}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
