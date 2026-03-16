import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Palette, Upload, X, Image as ImageIcon, Sparkles,
  Loader2, Download, Save, Trash2, Eye, Link2, Filter,
  Send, Plus, Maximize2, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  getSigningVisualisaties,
  getVisualizerCredits,
  createSigningVisualisatie,
  deleteSigningVisualisatie,
  getProjecten,
  getOffertes,
} from '@/services/supabaseService'
import supabase from '@/services/supabaseClient'
import { uploadFile } from '@/services/storageService'
import type { SigningVisualisatie, Project, Offerte } from '@/types'
import { VisualisatieLightbox } from './VisualisatieLightbox'
import { CreditsPakketDialog } from './CreditsPakketDialog'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // ── Form state ──
  const [foto, setFoto] = useState<string | null>(null)
  const [fotoNaam, setFotoNaam] = useState('')
  const [logoFoto, setLogoFoto] = useState<string | null>(null)
  const [logoFotoNaam, setLogoFotoNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [ratio, setRatio] = useState('4:3')
  const [resolutie, setResolutie] = useState('2K')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedOfferte, setSelectedOfferte] = useState('')

  // ── Generation state ──
  const [generatieStatus, setGeneratieStatus] = useState<GeneratieStatus>('idle')
  const [resultaat, setResultaat] = useState<{
    url: string
    fal_request_id: string
    generatie_tijd_ms: number
    prompt_gebruikt: string
    api_kosten_usd?: number
  } | null>(null)
  const [creditSaldo, setCreditSaldo] = useState(0)

  // ── Chat state ──
  const [chatBerichten, setChatBerichten] = useState<ChatBericht[]>([])
  const [chatInput, setChatInput] = useState('')
  const [inChatModus, setInChatModus] = useState(false)
  const [showSavePanel, setShowSavePanel] = useState(false)

  // ── Library state ──
  const [visualisaties, setVisualisaties] = useState<SigningVisualisatie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [filterKoppeling, setFilterKoppeling] = useState<'alle' | 'gekoppeld' | 'los'>('alle')
  const [showCreditsPakket, setShowCreditsPakket] = useState(false)

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

    // Handle Stripe payment return
    const params = new URLSearchParams(window.location.search)
    if (params.get('betaling') === 'succes') {
      toast.success('Betaling geslaagd! Credits worden bijgeschreven.')
      // Refresh credits after short delay (webhook needs time to process)
      setTimeout(() => {
        getVisualizerCredits(user.id).then(c => setCreditSaldo(c.saldo)).catch(() => {})
      }, 2000)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('betaling') === 'geannuleerd') {
      toast.info('Betaling geannuleerd')
      window.history.replaceState({}, '', window.location.pathname)
    }
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

  // ── Scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (inChatModus) scrollToBottom()
  }, [chatBerichten, inChatModus, scrollToBottom])

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

  // Auth headers voor server-side credit check
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

  // ── Generate (eerste keer) ──
  const handleGenereer = useCallback(async () => {
    if (!user?.id || !foto || !beschrijving.trim()) return
    if (creditSaldo <= 0) {
      toast.error('Geen credits meer — koop credits bij')
      setShowCreditsPakket(true)
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
          resolutie,
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

      // Credits saldo verversen (server heeft afgeschreven)
      getVisualizerCredits(user.id).then(c => setCreditSaldo(c.saldo)).catch(() => {})

      setChatBerichten(prev => [...prev, {
        id: crypto.randomUUID(),
        rol: 'assistant',
        tekst: 'Hier is je visualisatie! Wil je iets aanpassen? Beschrijf het hieronder.',
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
  }, [user?.id, foto, logoFoto, beschrijving, ratio, creditSaldo, getAuthHeaders])

  // ── Chat verfijning ──
  const handleChatVerfijning = useCallback(async () => {
    if (!user?.id || !chatInput.trim() || !foto) return
    if (creditSaldo <= 0) {
      toast.error('Geen credits meer — koop credits bij')
      setShowCreditsPakket(true)
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
          resolutie,
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
        tekst: `Aanpassing mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}. Probeer het opnieuw.`,
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

  // ── Helper: convert base64 data URL to File ──
  const base64ToFile = useCallback((dataUrl: string, filename: string): File => {
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new File([arr], filename, { type: mime })
  }, [])

  // ── Save result ──
  const handleOpslaan = useCallback(async () => {
    if (!user?.id || !resultaat || !foto) return
    try {
      // Upload base64 foto's naar storage i.p.v. direct in DB
      const ts = Date.now()
      let gebouwFotoUrl = foto
      let logoUrl = logoFoto || undefined

      // Upload gebouw foto als het base64 is
      if (foto.startsWith('data:')) {
        const gebouwFile = base64ToFile(foto, `gebouw-${ts}.jpg`)
        const path = `${user.id}/visualizer/${ts}-gebouw.jpg`
        await uploadFile(gebouwFile, path)
        gebouwFotoUrl = path
      }

      // Upload logo als het base64 is
      if (logoFoto && logoFoto.startsWith('data:')) {
        const logoFile = base64ToFile(logoFoto, `logo-${ts}.png`)
        const path = `${user.id}/visualizer/${ts}-logo.png`
        await uploadFile(logoFile, path)
        logoUrl = path
      }

      const project = projecten.find(p => p.id === selectedProject)
      await createSigningVisualisatie({
        user_id: user.id,
        offerte_id: selectedOfferte || undefined,
        project_id: selectedProject || undefined,
        klant_id: project?.klant_id || undefined,
        gebouw_foto_url: gebouwFotoUrl,
        logo_url: logoUrl,
        prompt_gebruikt: resultaat.prompt_gebruikt,
        aangepaste_prompt: beschrijving,
        signing_type: 'led_verlicht',
        kleur_instelling: 'auto',
        resolutie: resolutie as '1K' | '2K' | '4K',
        resultaat_url: resultaat.url,
        status: 'klaar',
        api_kosten_eur: resultaat.api_kosten_usd ?? 0.12,
        wisselkoers_gebruikt: 0.92,
        doorberekend_aan_klant: false,
        fal_request_id: resultaat.fal_request_id,
        generatie_tijd_ms: resultaat.generatie_tijd_ms,
      })
      toast.success('Opgeslagen in bibliotheek!')
      handleNieuweSessie()
      ladenBibliotheek()
    } catch (err) {
      console.error('Opslaan mislukt:', err)
      toast.error(`Opslaan mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`)
    }
  }, [user?.id, resultaat, foto, logoFoto, beschrijving, selectedProject, selectedOfferte, projecten, ladenBibliotheek, base64ToFile])

  const handleNieuweSessie = useCallback(() => {
    setResultaat(null)
    setGeneratieStatus('idle')
    setFoto(null)
    setFotoNaam('')
    setLogoFoto(null)
    setLogoFotoNaam('')
    setBeschrijving('')
    setRatio('4:3')
    setResolutie('2K')
    setSelectedProject('')
    setSelectedOfferte('')
    setChatBerichten([])
    setChatInput('')
    setInChatModus(false)
    setShowSavePanel(false)
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

  const sessieCredits = chatBerichten.filter(b => b.rol === 'assistant' && b.afbeelding_url).length

  // ═══════════════════════════════════════════════════════════════════
  // CHAT MODUS — Forgie-style design met pastel kleuren
  // ═══════════════════════════════════════════════════════════════════
  if (inChatModus) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sage/20 rounded-lg">
              <Palette className="w-5 h-5 text-sage-deep" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Visualizer</h1>
              <p className="text-xs text-muted-foreground">
                {sessieCredits} credit{sessieCredits !== 1 ? 's' : ''} gebruikt
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {resultaat && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(resultaat.url, resultaat.fal_request_id)}
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSavePanel(!showSavePanel)}
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Opslaan
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNieuweSessie}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Nieuw
            </Button>
          </div>
        </div>

        {/* ── Save panel (schuift open) ── */}
        {showSavePanel && resultaat && (
          <div className="mx-4 mb-3 p-4 bg-sage/10 border border-sage/20 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-sm font-medium text-sage-deep">
              <Link2 className="h-4 w-4" />
              Opslaan in bibliotheek
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedProject}
                onChange={(e) => { setSelectedProject(e.target.value); setSelectedOfferte('') }}
                className="text-sm bg-background border rounded-xl px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-sage/50"
              >
                <option value="">Geen project koppelen</option>
                {projecten.map(p => (
                  <option key={p.id} value={p.id}>{p.naam} — {p.klant_naam}</option>
                ))}
              </select>
              {selectedProject && (
                <select
                  value={selectedOfferte}
                  onChange={(e) => setSelectedOfferte(e.target.value)}
                  className="text-sm bg-background border rounded-xl px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-sage/50"
                >
                  <option value="">Geen offerte</option>
                  {filteredOffertes.map(o => (
                    <option key={o.id} value={o.id}>{o.nummer || o.titel}</option>
                  ))}
                </select>
              )}
              <Button
                onClick={handleOpslaan}
                className="rounded-xl bg-sage-deep hover:bg-sage-deep/90 gap-1.5"
              >
                <Save className="h-4 w-4" /> Opslaan
              </Button>
            </div>
          </div>
        )}

        {/* ── Chat berichten ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 scrollbar-thin">
          {chatBerichten.map((bericht) => (
            <div
              key={bericht.id}
              className={cn(
                'flex gap-3',
                bericht.rol === 'user' ? 'justify-end' : 'justify-start',
                bericht.rol === 'systeem' ? 'justify-center' : '',
              )}
            >
              {/* AI avatar */}
              {bericht.rol === 'assistant' && (
                <div className="flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-sage-deep" />
                </div>
              )}

              <div className={cn(
                'space-y-2',
                bericht.rol === 'user' ? 'max-w-[80%]' : bericht.rol === 'assistant' ? 'max-w-[85%]' : '',
              )}>
                {/* Systeem berichten */}
                {bericht.rol === 'systeem' && (
                  <div className="text-xs text-destructive bg-destructive/10 rounded-xl px-4 py-2">
                    {bericht.tekst}
                  </div>
                )}

                {/* Tekst bubble */}
                {bericht.rol !== 'systeem' && (
                  <div className={cn(
                    'rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
                    bericht.rol === 'user'
                      ? 'bg-mist/20 text-foreground'
                      : 'bg-card border text-foreground',
                  )}>
                    {bericht.tekst}
                  </div>
                )}

                {/* Afbeelding */}
                {bericht.afbeelding_url && (
                  <div
                    className={cn(
                      'rounded-2xl overflow-hidden border cursor-pointer transition-all hover:shadow-lg',
                      bericht.rol === 'user' ? 'max-w-[280px]' : '',
                    )}
                    onClick={() => {
                      if (bericht.afbeelding_url) {
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
                  <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                    <span>{(bericht.generatie_tijd_ms / 1000).toFixed(1)}s</span>
                    <span>·</span>
                    <span>1 credit</span>
                    {bericht.prompt_gebruikt && (
                      <>
                        <span>·</span>
                        <button
                          className="hover:text-foreground transition-colors underline underline-offset-2"
                          onClick={() => toast.info(bericht.prompt_gebruikt || '', { duration: 10000 })}
                        >
                          prompt bekijken
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator — bouncing dots like Forgie */}
          {isGenerating && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-sage-deep" />
              </div>
              <div className="bg-card border rounded-2xl p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-sage-deep/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-sage-deep/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-sage-deep/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span className="text-xs">
                    {generatieStatus === 'claude' ? 'Analyseren...' : 'Genereren...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar — Forgie style ── */}
        <div className="flex-shrink-0 border-t bg-card p-4">
          <div className="flex items-center gap-2">
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Beschrijf wat je wilt aanpassen..."
              disabled={isGenerating}
              className="flex-1 rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage/50 disabled:opacity-50"
            />
            <Button
              size="icon"
              onClick={handleChatVerfijning}
              disabled={!chatInput.trim() || isGenerating || creditSaldo <= 0}
              className="rounded-xl h-11 w-11 bg-sage-deep hover:bg-sage-deep/90"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            1 credit per aanpassing · {creditSaldo} credits over
          </p>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // START SCHERM — Generator formulier
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col mod-strip mod-strip-visualizer">
      {/* Header bar */}
      <ModuleHeader
        module="visualizer"
        icon={Palette}
        title="Signing Visualizer"
        subtitle="Upload een foto of ontwerp, beschrijf het gewenste resultaat — AI doet de rest"
        actions={
          <button
            onClick={() => setShowCreditsPakket(true)}
            className={cn(
              'text-sm font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer flex-shrink-0',
              creditSaldo < 5
                ? 'bg-blush/20 text-blush-deep hover:bg-blush/30'
                : 'bg-sage/20 text-sage-deep hover:bg-sage/30',
            )}
          >
            {creditSaldo} credits {creditSaldo < 5 ? '— bijkopen' : ''}
          </button>
        }
      />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-8 p-4 sm:p-6">

      {/* Generator form */}
      <div className="border rounded-2xl bg-card p-6">
        <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-6">
          {/* Col 1: Foto */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Foto / ontwerp</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Gebouw, voertuig, schets of bestaand ontwerp
            </p>
            {foto ? (
              <div className="relative rounded-xl overflow-hidden border bg-muted">
                <img src={foto} alt="Upload" className="w-full aspect-[4/3] object-cover" />
                <Button variant="destructive" size="sm" className="absolute top-2 right-2 rounded-lg"
                  onClick={() => { setFoto(null); setFotoNaam('') }}>
                  <X className="h-3 w-3" />
                </Button>
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                  {fotoNaam}
                </span>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-sage/30 rounded-xl aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:border-sage/60 hover:bg-sage/5 transition-all"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'foto')}
              >
                <Upload className="h-8 w-8 text-sage-deep/40 mb-2" />
                <p className="text-sm text-muted-foreground text-center px-4">
                  Sleep hierheen of <span className="text-sage-deep font-medium">klik</span>
                </p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => handleFileUpload(e, 'foto')} />
          </div>

          {/* Col 2: Logo */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Logo / artwork <span className="text-muted-foreground font-normal">(optioneel)</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              PNG met transparante achtergrond werkt het best
            </p>
            {logoFoto ? (
              <div className="relative rounded-xl overflow-hidden border bg-muted aspect-[4/3] flex items-center justify-center">
                <img src={logoFoto} alt="Logo" className="max-h-full max-w-full object-contain p-4" />
                <Button variant="destructive" size="sm" className="absolute top-2 right-2 rounded-lg"
                  onClick={() => { setLogoFoto(null); setLogoFotoNaam('') }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-mist/30 rounded-xl aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:border-mist/60 hover:bg-mist/5 transition-all"
                onClick={() => logoInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'logo')}
              >
                <ImageIcon className="h-8 w-8 text-mist-deep/40 mb-2" />
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
            <Label className="text-sm font-medium mb-1.5 block">Wat wil je zien?</Label>
            <Textarea
              value={beschrijving}
              onChange={(e) => setBeschrijving(e.target.value)}
              placeholder='bijv. "LED doosletters boven de deur, warmwit" of "Maak dit ontwerp fotorealistisch op een echte bus"'
              className="text-sm flex-1 min-h-[100px] rounded-xl focus:ring-sage/50"
            />

            {/* Ratio + Resolutie */}
            <div className="mt-3 mb-3 space-y-3">
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
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                        ratio === opt.value
                          ? 'bg-sage-deep text-white shadow-sm'
                          : 'bg-sage/10 text-sage-deep hover:bg-sage/20',
                      )}
                      title={opt.desc}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Resolutie</Label>
                <div className="flex gap-1.5">
                  {([
                    { label: '1K', credit: 1 },
                    { label: '2K', credit: 1 },
                    { label: '4K', credit: 2 },
                  ] as const).map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setResolutie(opt.label)}
                      className={cn(
                        'flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-center',
                        resolutie === opt.label
                          ? 'bg-sage-deep text-white shadow-sm'
                          : 'bg-sage/10 text-sage-deep hover:bg-sage/20',
                      )}
                    >
                      {opt.label}
                      <span className={cn(
                        'block text-2xs font-normal mt-0.5',
                        resolutie === opt.label ? 'text-white/70' : 'text-sage-deep/50',
                      )}>
                        {opt.credit === 1 ? '1 credit' : '2 credits'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenereer}
              disabled={!foto || !beschrijving.trim() || isGenerating || creditSaldo <= 0}
              className="gap-2 w-full rounded-xl bg-sage-deep hover:bg-sage-deep/90"
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
                  Genereer Visualisatie — {resolutie === '4K' ? '2 credits' : '1 credit'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ Library ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Bibliotheek</h2>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            {(['alle', 'gekoppeld', 'los'] as const).map((val) => (
              <button
                key={val}
                onClick={() => setFilterKoppeling(val)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  filterKoppeling === val
                    ? 'bg-sage/20 text-sage-deep'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {val === 'alle' ? 'Alle' : val === 'gekoppeld' ? 'Aan project' : 'Losse mockups'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-sage-deep/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-sage-deep/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-sage-deep/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
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
                  className="group relative border rounded-2xl overflow-hidden bg-card hover:shadow-lg transition-all"
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
                        <Badge className="badge-sage text-2xs">{project.naam}</Badge>
                      )}
                      {offerte && (
                        <Badge className="badge-mist text-2xs">{offerte.nummer || offerte.titel}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(v.created_at).toLocaleDateString('nl-NL')}</span>
                      <span>1 credit</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" className="h-6 w-6 p-0 rounded-lg"
                      onClick={() => setLightboxIndex(index)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="secondary" className="h-6 w-6 p-0 rounded-lg"
                      onClick={() => handleDownload(v.resultaat_url, v.id)}>
                      <Download className="h-3 w-3" />
                    </Button>
                    {deleteConfirmId === v.id ? (
                      <Button size="sm" variant="destructive" className="h-6 px-2 text-2xs rounded-lg"
                        onClick={() => handleDelete(v.id)}>
                        Bevestig
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" className="h-6 w-6 p-0 rounded-lg"
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

      {/* Credits Pakket Dialog */}
      <CreditsPakketDialog
        isOpen={showCreditsPakket}
        onClose={() => setShowCreditsPakket(false)}
        onCreditsToegevoegd={(nieuwSaldo) => setCreditSaldo(nieuwSaldo)}
      />
      </div>
      </div>
    </div>
  )
}
