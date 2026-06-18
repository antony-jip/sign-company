import React, { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '../../utils/logger'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Palette, X, Image as ImageIcon, Sparkles,
  Loader2, Download, Save, Trash2, Eye, Link2,
  Send, Maximize2, RotateCcw, Mail, Plus, ChevronDown,
  MessageSquare, SquarePen, PanelLeft,
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
  createPortaal,
  createPortaalItem,
  getPortaalItems,
  getVisualizerChats,
  upsertVisualizerChat,
  deleteVisualizerChat,
} from '@/services/supabaseService'
import supabase from '@/services/supabaseClient'
import { uploadFile, downloadFile } from '@/services/storageService'
import type { SigningVisualisatie, Project, Offerte, VisualizerChat } from '@/types'
import { VisualisatieLightbox } from './VisualisatieLightbox'
import { CreditsPakketDialog } from './CreditsPakketDialog'

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

const RESOLUTIE_OPTIES = [
  { label: '1K', credit: 1, desc: 'Snel' },
  { label: '2K', credit: 1, desc: 'Standaard' },
  { label: '4K', credit: 2, desc: 'Print' },
] as const

const VOORBEELD_PROMPTS = [
  'LED doosletters boven de entree, warmwit',
  'Gevelreclame met ons logo op dit pand',
  'Volledige belettering op deze bedrijfsbus',
  'Lichtbak naast de voordeur, strak en modern',
]

export function VisualizerLayout() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // ── Composer / sessie ──
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
  const [showSavePanel, setShowSavePanel] = useState(false)

  // ── View / menu's ──
  const [view, setView] = useState<'chat' | 'bibliotheek'>('chat')
  const [attachOpen, setAttachOpen] = useState(false)
  const [ratioOpen, setRatioOpen] = useState(false)
  const [resOpen, setResOpen] = useState(false)

  // ── Chat-geschiedenis (org-breed) ──
  const [chats, setChats] = useState<VisualizerChat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ── Library state ──
  const [visualisaties, setVisualisaties] = useState<SigningVisualisatie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [filterKoppeling, setFilterKoppeling] = useState<'alle' | 'gekoppeld' | 'los'>('alle')
  const [showCreditsPakket, setShowCreditsPakket] = useState(false)
  const [shareDropdownId, setShareDropdownId] = useState<string | null>(null)
  const [shareEmailVis, setShareEmailVis] = useState<SigningVisualisatie | null>(null)
  const [shareEmailTo, setShareEmailTo] = useState('')
  const [shareEmailSubject, setShareEmailSubject] = useState('')
  const [shareEmailBody, setShareEmailBody] = useState('')
  const [isSendingShareEmail, setIsSendingShareEmail] = useState(false)

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
    } catch (err) { /* ignore */ }
    setIsLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ladenBibliotheek()
    getVisualizerCredits(user.id).then(c => { if (!cancelled) setCreditSaldo(c.saldo) }).catch(() => {})
    getProjecten().then(p => { if (!cancelled) setProjecten(p) }).catch(() => {})
    getOffertes().then(o => { if (!cancelled) setOffertes(o) }).catch(() => {})
    getVisualizerChats().then(c => { if (!cancelled) setChats(c) }).catch(() => {})

    // Handle Stripe payment return
    const params = new URLSearchParams(window.location.search)
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (params.get('betaling') === 'succes') {
      toast.success('Betaling geslaagd! Credits worden bijgeschreven.')
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          getVisualizerCredits(user.id).then(c => { if (!cancelled) setCreditSaldo(c.saldo) }).catch(() => {})
        }
      }, 2000)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('betaling') === 'geannuleerd') {
      toast.info('Betaling geannuleerd')
      window.history.replaceState({}, '', window.location.pathname)
    }
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId) }
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
    e.target.value = ''
  }, [processFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file, 'foto')
  }, [processFile])

  // ── Scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (view === 'chat') scrollToBottom()
  }, [chatBerichten, view, scrollToBottom])

  useEffect(() => {
    if (view === 'chat' && generatieStatus === 'klaar') {
      setTimeout(() => chatInputRef.current?.focus(), 200)
    }
  }, [view, generatieStatus])

  // ── Build chat history for API ──
  const buildChatGeschiedenis = useCallback(() => {
    return chatBerichten
      .filter(b => b.rol !== 'systeem')
      .map(b => ({ rol: b.rol as 'user' | 'assistant', tekst: b.tekst }))
  }, [chatBerichten])

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

  // ── Chat persisteren (org-breed) na elke ronde ──
  const persistChat = useCallback(async (berichten: ChatBericht[]) => {
    if (!berichten.length) return
    const eersteUser = berichten.find(b => b.rol === 'user')
    const titel = (eersteUser?.tekst || 'Nieuwe visualisatie').slice(0, 60)
    const serialized = berichten.map(b => ({
      id: b.id,
      rol: b.rol,
      tekst: b.tekst,
      // base64-uploads niet meeschrijven (te zwaar); resultaat-URL's wel
      afbeelding_url: b.afbeelding_url?.startsWith('data:') ? undefined : b.afbeelding_url,
      generatie_tijd_ms: b.generatie_tijd_ms,
      prompt_gebruikt: b.prompt_gebruikt,
      fal_request_id: b.fal_request_id,
      timestamp: b.timestamp.getTime(),
    }))
    try {
      const saved = await upsertVisualizerChat({
        id: activeChatId || undefined,
        titel,
        berichten: serialized,
        foto,
        foto_naam: fotoNaam,
        logo_foto: logoFoto,
        ratio,
        resolutie,
      })
      setActiveChatId(saved.id)
      setChats(prev => [saved, ...prev.filter(c => c.id !== saved.id)])
    } catch { /* stil — persistentie mag verzenden nooit blokkeren */ }
  }, [activeChatId, foto, fotoNaam, logoFoto, ratio, resolutie])

  // ── Eén verzend-flow: eerste bericht = eerste generatie, daarna verfijnen ──
  const isGenerating = ['claude', 'genereren'].includes(generatieStatus)

  const handleSend = useCallback(async () => {
    if (!user?.id || isGenerating) return
    const tekst = chatInput.trim()
    if (!tekst) return
    const eersteKeer = chatBerichten.length === 0
    const metBeeld = !!foto
    if (metBeeld && creditSaldo <= 0) {
      toast.error('Geen credits meer — koop credits bij')
      setShowCreditsPakket(true)
      return
    }

    setChatInput('')
    if (eersteKeer) setBeschrijving(tekst)

    const userMsg: ChatBericht = {
      id: crypto.randomUUID(),
      rol: 'user',
      tekst,
      afbeelding_url: metBeeld && eersteKeer ? foto : undefined,
      timestamp: new Date(),
    }
    const metUser = [...chatBerichten, userMsg]
    setChatBerichten(metUser)

    try {
      setGeneratieStatus('claude')
      const headers = await getAuthHeaders()

      if (metBeeld) {
        // ── Beeld genereren (kost credits) ──
        const geschiedenis = eersteKeer ? [] : buildChatGeschiedenis()
        const response = await fetch('/api/generate-signing-mockup', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            gebouw_foto_base64: foto,
            logo_base64: logoFoto || undefined,
            beschrijving: tekst,
            ratio,
            resolutie,
            chat_geschiedenis: geschiedenis,
          }),
        })
        setGeneratieStatus('genereren')
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Generatie mislukt') }
        const data = await response.json()
        setResultaat(data)
        getVisualizerCredits(user.id).then(c => setCreditSaldo(c.saldo)).catch(() => {})
        const aiMsg: ChatBericht = {
          id: crypto.randomUUID(),
          rol: 'assistant',
          tekst: data.toelichting?.trim() || (eersteKeer ? 'Hier is je visualisatie.' : 'Aangepast.'),
          afbeelding_url: data.url,
          generatie_tijd_ms: data.generatie_tijd_ms,
          prompt_gebruikt: data.prompt_gebruikt,
          fal_request_id: data.fal_request_id,
          timestamp: new Date(),
        }
        const metAI = [...metUser, aiMsg]
        setChatBerichten(metAI)
        setGeneratieStatus('klaar')
        persistChat(metAI)
      } else {
        // ── Gratis tekst-chat (brainstormen, geen foto nodig) ──
        const geschiedenis = [...buildChatGeschiedenis(), { rol: 'user' as const, tekst }]
        const response = await fetch('/api/visualizer-chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ berichten: geschiedenis }),
        })
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Antwoord mislukt') }
        const data = await response.json()
        const aiMsg: ChatBericht = {
          id: crypto.randomUUID(),
          rol: 'assistant',
          tekst: data.tekst || '…',
          timestamp: new Date(),
        }
        const metAI = [...metUser, aiMsg]
        setChatBerichten(metAI)
        setGeneratieStatus('klaar')
        persistChat(metAI)
      }
    } catch (error: unknown) {
      setGeneratieStatus('fout')
      setChatBerichten([...metUser, {
        id: crypto.randomUUID(),
        rol: 'systeem',
        tekst: `Mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}. Probeer het opnieuw.`,
        timestamp: new Date(),
      }])
    }
  }, [user?.id, isGenerating, chatInput, chatBerichten, foto, logoFoto, ratio, resolutie, creditSaldo, buildChatGeschiedenis, getAuthHeaders, persistChat])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // ── Helper: convert base64 data URL to File ──
  const base64ToFile = useCallback((dataUrl: string, filename: string): File => {
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new File([arr], filename, { type: mime })
  }, [])

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
    setShowSavePanel(false)
    setActiveChatId(null)
  }, [])

  // ── Chat-geschiedenis: openen / verwijderen ──
  const openChat = useCallback((chat: VisualizerChat) => {
    setActiveChatId(chat.id)
    setChatBerichten((chat.berichten || []).map(b => ({
      id: b.id,
      rol: b.rol,
      tekst: b.tekst,
      afbeelding_url: b.afbeelding_url,
      generatie_tijd_ms: b.generatie_tijd_ms,
      prompt_gebruikt: b.prompt_gebruikt,
      fal_request_id: b.fal_request_id,
      timestamp: new Date(b.timestamp),
    })))
    setFoto(chat.foto ?? null)
    setFotoNaam(chat.foto_naam ?? '')
    setLogoFoto(chat.logo_foto ?? null)
    setLogoFotoNaam('')
    setBeschrijving(chat.berichten?.find(b => b.rol === 'user')?.tekst || '')
    setRatio(chat.ratio || '4:3')
    setResolutie(chat.resolutie || '2K')
    setSelectedProject('')
    setSelectedOfferte('')
    setChatInput('')
    setShowSavePanel(false)
    setGeneratieStatus('idle')
    setView('chat')
    // Laatste resultaat herstellen zodat download/opslaan werkt
    const laatste = [...(chat.berichten || [])].reverse().find(b => b.rol === 'assistant' && b.afbeelding_url)
    setResultaat(laatste?.afbeelding_url ? {
      url: laatste.afbeelding_url,
      fal_request_id: laatste.fal_request_id || '',
      generatie_tijd_ms: laatste.generatie_tijd_ms || 0,
      prompt_gebruikt: laatste.prompt_gebruikt || '',
    } : null)
  }, [])

  const verwijderChat = useCallback(async (id: string) => {
    try { await deleteVisualizerChat(id) } catch { /* negeer */ }
    setChats(prev => prev.filter(c => c.id !== id))
    if (id === activeChatId) handleNieuweSessie()
  }, [activeChatId, handleNieuweSessie])

  // ── Save result ──
  const handleOpslaan = useCallback(async () => {
    if (!user?.id || !resultaat || !foto) return
    try {
      const ts = Date.now()
      let gebouwFotoUrl = foto
      let logoUrl = logoFoto || undefined

      if (foto.startsWith('data:')) {
        const gebouwFile = base64ToFile(foto, `gebouw-${ts}.jpg`)
        const path = `${user.id}/visualizer/${ts}-gebouw.jpg`
        await uploadFile(gebouwFile, path)
        gebouwFotoUrl = path
      }

      if (logoFoto && logoFoto.startsWith('data:')) {
        const logoFile = base64ToFile(logoFoto, `logo-${ts}.png`)
        const path = `${user.id}/visualizer/${ts}-logo.png`
        await uploadFile(logoFile, path)
        logoUrl = path
      }

      // Resultaat naar eigen storage halen — de fal-URL is tijdelijk en kan verlopen.
      // Lukt het niet (bijv. CORS), dan vallen we terug op de fal-URL zodat opslaan nooit blokkeert.
      let resultaatUrl = resultaat.url
      try {
        if (/^https?:\/\//.test(resultaat.url)) {
          const res = await fetch(resultaat.url)
          if (res.ok) {
            const blob = await res.blob()
            const mime = blob.type || 'image/png'
            const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
            const resultFile = new File([blob], `resultaat-${ts}.${ext}`, { type: mime })
            const path = `${user.id}/visualizer/${ts}-resultaat.${ext}`
            await uploadFile(resultFile, path)
            resultaatUrl = await downloadFile(path)
          }
        }
      } catch (err) {
        logger.error('Resultaat in eigen storage opslaan mislukt, val terug op fal-URL:', err)
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
        resultaat_url: resultaatUrl,
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
  }, [user?.id, resultaat, foto, logoFoto, beschrijving, selectedProject, selectedOfferte, projecten, ladenBibliotheek, base64ToFile, handleNieuweSessie, resolutie])

  const handleDownload = useCallback((url: string, id: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `visualizer-mockup-${id.slice(0, 8)}.png`
    a.target = '_blank'
    a.click()
  }, [])

  const handleShareViaPortaal = useCallback(async (v: SigningVisualisatie) => {
    if (!user?.id || !v.project_id) return
    try {
      const portaal = await createPortaal(v.project_id, user.id)
      const bestaandeItems = await getPortaalItems(portaal.id)
      if (!bestaandeItems.find(i => i.type === 'tekening' && i.titel === 'Visualisatie mockup')) {
        await createPortaalItem({
          user_id: user.id,
          project_id: v.project_id,
          portaal_id: portaal.id,
          type: 'tekening',
          titel: 'Visualisatie mockup',
          omschrijving: v.prompt_gebruikt?.slice(0, 100) || '',
          status: 'verstuurd',
          zichtbaar_voor_klant: true,
          volgorde: 0,
          foto_url: v.resultaat_url,
        })
      }
      toast.success('Visualisatie gedeeld via portaal')
      setShareDropdownId(null)
    } catch (err) {
      logger.error('Delen via portaal mislukt:', err)
      toast.error('Kon niet delen via portaal')
    }
  }, [user?.id])

  const handleOpenShareEmail = useCallback((v: SigningVisualisatie) => {
    const project = projecten.find(p => p.id === v.project_id)
    setShareEmailVis(v)
    setShareEmailTo('')
    setShareEmailSubject(`Visualisatie${project ? ` — ${project.naam}` : ''}`)
    setShareEmailBody(`Hallo,\n\nBijgaand een visualisatie van het gewenste ontwerp.\n\nMet vriendelijke groet`)
    setShareDropdownId(null)
  }, [projecten])

  const handleSendShareEmail = useCallback(async () => {
    if (!shareEmailVis || !shareEmailTo.trim()) return
    setIsSendingShareEmail(true)
    try {
      const { sendEmail } = await import('@/services/gmailService')
      const imgHtml = `<p><img src="${shareEmailVis.resultaat_url}" alt="Visualisatie" style="max-width:600px;border-radius:8px;" /></p>`
      const bodyHtml = shareEmailBody.split('\n').map(l => `<p>${l || '&nbsp;'}</p>`).join('') + imgHtml
      await sendEmail(shareEmailTo.trim(), shareEmailSubject.trim(), shareEmailBody, { html: bodyHtml })
      toast.success(`Visualisatie verstuurd naar ${shareEmailTo.trim()}`)
      setShareEmailVis(null)
    } catch (err) {
      logger.error('Email versturen mislukt:', err)
      toast.error('Kon email niet versturen')
    } finally {
      setIsSendingShareEmail(false)
    }
  }, [shareEmailVis, shareEmailTo, shareEmailSubject, shareEmailBody])

  const handleDelete = useCallback(async (id: string) => {
    if (!user?.id) return
    try {
      await deleteSigningVisualisatie(id, user.id)
      setVisualisaties(prev => prev.filter(v => v.id !== id))
      setDeleteConfirmId(null)
      toast.success('Verwijderd')
    } catch (err) {
      logger.error('Visualisatie verwijderen mislukt:', err)
      toast.error('Verwijderen mislukt')
    }
  }, [user?.id])

  const gefilterd = visualisaties.filter(v => {
    if (filterKoppeling === 'gekoppeld' && !v.project_id && !v.offerte_id) return false
    if (filterKoppeling === 'los' && (v.project_id || v.offerte_id)) return false
    return true
  })

  const sessieGestart = chatBerichten.length > 0
  const creditKost = resolutie === '4K' ? 2 : 1
  const huidigeRatio = RATIO_OPTIES.find(r => r.value === ratio)

  // ── Bijlage-preview in de composer ──
  const Bijlage = ({ src, label, onRemove }: { src: string; label: string; onRemove: () => void }) => (
    <div className="group/chip relative bg-background border border-border rounded-xl p-1.5">
      <div className="relative overflow-hidden rounded-lg">
        <img src={src} alt={label} className="h-20 w-28 object-cover" />
        <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-2xs font-medium px-2 py-0.5">{label}</span>
      </div>
      {!sessieGestart && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-card border border-border rounded-full p-1 text-muted-foreground hover:text-destructive hover:border-destructive/40 shadow-sm transition-colors"
          title="Verwijderen"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )

  // ── Composer (herbruikbaar in lege staat én lopende sessie) ──
  const composer = (
    <>
      <div className="rounded-[26px] border border-border/80 bg-card shadow-[0_2px_18px_rgba(26,83,92,0.07)] px-3 pt-3 pb-2 transition-all focus-within:border-petrol/30 focus-within:shadow-[0_6px_28px_rgba(26,83,92,0.14)]">
        {(foto || logoFoto) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {foto && <Bijlage src={foto} label="Foto" onRemove={() => { setFoto(null); setFotoNaam('') }} />}
            {logoFoto && <Bijlage src={logoFoto} label="Logo" onRemove={() => { setLogoFoto(null); setLogoFotoNaam('') }} />}
          </div>
        )}

        <textarea
          ref={chatInputRef}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={foto
            ? (sessieGestart ? 'Beschrijf wat je wilt aanpassen...' : 'Beschrijf wat je wilt zien — bijv. LED doosletters boven de entree, warmwit')
            : 'Stel een vraag of beschrijf je idee — voeg met + een foto toe om te visualiseren'}
          rows={2}
          disabled={isGenerating}
          className="w-full resize-none bg-transparent px-2 py-1 text-[15px] placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 leading-relaxed min-h-[52px]"
        />

        <div className="flex items-center gap-1.5 mt-1">
          <Popover open={attachOpen} onOpenChange={setAttachOpen}>
            <PopoverTrigger asChild>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-full border border-border text-foreground/70 hover:bg-muted/60 hover:text-foreground transition-colors flex-shrink-0"
                title="Foto of logo toevoegen"
              >
                <Plus className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-1.5">
              <button
                onClick={() => { setAttachOpen(false); fileInputRef.current?.click() }}
                className="w-full text-left px-2.5 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4 text-petrol" />
                {foto ? 'Foto vervangen' : 'Foto toevoegen'}
              </button>
              <button
                onClick={() => { setAttachOpen(false); logoInputRef.current?.click() }}
                className="w-full text-left px-2.5 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#F15025]" />
                {logoFoto ? 'Logo vervangen' : 'Logo toevoegen'}
                <span className="text-2xs text-muted-foreground ml-auto">optioneel</span>
              </button>
            </PopoverContent>
          </Popover>

          <Popover open={ratioOpen} onOpenChange={setRatioOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-foreground/70 hover:text-foreground hover:bg-muted/60 rounded-full border border-border/70 px-3 py-1.5 transition-colors">
                <Maximize2 className="w-3.5 h-3.5" />
                {huidigeRatio?.label || ratio}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1.5">
              <div className="grid grid-cols-2 gap-1">
                {RATIO_OPTIES.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setRatio(opt.value); setRatioOpen(false) }}
                    className={cn(
                      'text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors',
                      ratio === opt.value ? 'bg-petrol text-white' : 'hover:bg-muted/60 text-foreground',
                    )}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className={cn('block text-2xs', ratio === opt.value ? 'text-white/70' : 'text-muted-foreground')}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={resOpen} onOpenChange={setResOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-foreground/70 hover:text-foreground hover:bg-muted/60 rounded-full border border-border/70 px-3 py-1.5 transition-colors">
                {resolutie}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-1.5">
              {RESOLUTIE_OPTIES.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => { setResolutie(opt.label); setResOpen(false) }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 text-sm rounded-lg transition-colors',
                    resolutie === opt.label ? 'bg-petrol text-white' : 'hover:bg-muted/60 text-foreground',
                  )}
                >
                  <span className="font-medium">{opt.label} <span className={cn('font-normal text-xs', resolutie === opt.label ? 'text-white/70' : 'text-muted-foreground')}>{opt.desc}</span></span>
                  <span className={cn('text-2xs', resolutie === opt.label ? 'text-white/70' : 'text-muted-foreground')}>{opt.credit} credit{opt.credit > 1 ? 's' : ''}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <div className="flex-1" />

          <span className="text-2xs text-muted-foreground hidden sm:inline mr-1">
            {foto ? `${creditKost} credit${creditKost > 1 ? 's' : ''}` : 'gratis chatten'}
          </span>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!chatInput.trim() || isGenerating || (!!foto && creditSaldo <= 0)}
            className="rounded-full h-9 w-9 bg-[#F15025] hover:bg-[#D94520] text-white flex-shrink-0 shadow-sm"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <p className="text-2xs text-muted-foreground text-center mt-2">
        {creditSaldo} credits over · Enter verzendt · Shift+Enter = nieuwe regel
      </p>
    </>
  )

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {view === 'chat' && (
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="h-8 w-8 -ml-1 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                title="Zijbalk in-/uitklappen"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <div className="p-2 bg-petrol-light rounded-lg">
              <Palette className="w-4 h-4 text-petrol" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-[-0.3px] leading-none">
                Visualizer<span className="text-[#F15025]">.</span>
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Claude vertelt wat-ie maakt · Gemini genereert</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab toggle */}
            <div className="inline-flex rounded-lg bg-muted/60 p-0.5">
              {([
                { key: 'chat', label: 'Chat', count: 0 },
                { key: 'bibliotheek', label: 'Bibliotheek', count: visualisaties.length },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                    view === t.key
                      ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                      : 'text-muted-foreground hover:text-foreground/80',
                  )}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span className={cn(
                      'text-2xs font-mono rounded-full px-1.5 py-0.5 leading-none',
                      view === t.key ? 'bg-petrol-light text-petrol' : 'bg-muted text-muted-foreground',
                    )}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreditsPakket(true)}
              className="text-xs font-mono font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer bg-background border border-border text-foreground hover:border-petrol/30"
            >
              <span>{creditSaldo}</span> credits{creditSaldo < 5 && <span className="text-[#F15025] ml-1">· bijkopen</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════ CHAT ═══════════════ */}
      {view === 'chat' && (
        <div className="flex-1 min-h-0 flex">
          {/* ── Sidebar met gesprekken ── */}
          {sidebarOpen && (
            <aside className="w-64 flex-shrink-0 border-r border-border bg-card/40 flex flex-col">
              <div className="p-3">
                <button
                  onClick={handleNieuweSessie}
                  className="w-full flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:border-petrol/40 hover:shadow-sm transition-all"
                >
                  <SquarePen className="w-4 h-4 text-petrol" /> Nieuwe visualisatie
                </button>
              </div>
              <div className="px-4 pb-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Recent</div>
              <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 scrollbar-thin">
                {chats.length === 0 ? (
                  <p className="px-2.5 py-2 text-xs text-muted-foreground">Nog geen gesprekken</p>
                ) : chats.map(c => (
                  <div
                    key={c.id}
                    onClick={() => openChat(c)}
                    className={cn(
                      'group/chat flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors',
                      activeChatId === c.id ? 'bg-petrol-light/15 text-foreground' : 'hover:bg-muted/60 text-foreground/80',
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                    <span className="flex-1 truncate text-[13px]">{c.titel}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); verwijderChat(c.id) }}
                      className="opacity-0 group-hover/chat:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* ── Hoofdpaneel ── */}
          <div
            className="flex-1 min-h-0 flex flex-col bg-gradient-to-b from-petrol-light/[0.07] via-background to-background"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
          {!sessieGestart ? (
            <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-8">
              <div className="w-full max-w-2xl flex flex-col items-center">
                <div className="p-3 bg-petrol-light/15 rounded-2xl ring-1 ring-petrol/10 mb-5">
                  <Sparkles className="w-6 h-6 text-petrol" />
                </div>
                <h2 className="text-[28px] leading-tight font-bold text-foreground tracking-[-0.5px] text-center">Waar wil je over sparren<span className="text-[#F15025]">?</span></h2>
                <p className="text-sm text-muted-foreground mt-2.5 text-center max-w-md leading-relaxed">
                  Stel een vraag of brainstorm over signing — gratis. Voeg een foto toe met <span className="font-medium text-foreground">+</span> en Gemini visualiseert je idee op locatie.
                </p>

                <div className="w-full mt-7">{composer}</div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {VOORBEELD_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => { setChatInput(p); chatInputRef.current?.focus() }}
                      className="text-xs text-foreground/70 bg-card border border-border rounded-full px-3 py-1.5 hover:border-petrol/40 hover:text-foreground hover:shadow-sm transition-all"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col w-full max-w-3xl mx-auto">
              {/* Actie-balk */}
              <div className="flex items-center justify-end gap-1 px-4 pt-3 flex-shrink-0">
              {resultaat && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(resultaat.url, resultaat.fal_request_id)} className="text-muted-foreground hover:text-foreground gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowSavePanel(!showSavePanel)} className="text-muted-foreground hover:text-foreground gap-1.5">
                    <Save className="w-3.5 h-3.5" /> Opslaan
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={handleNieuweSessie} className="text-muted-foreground hover:text-foreground gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Nieuw
              </Button>
            </div>

          {/* Save panel */}
          {showSavePanel && resultaat && (
            <div className="mx-4 mt-3 p-4 bg-petrol-light border border-petrol-border rounded-2xl space-y-3 animate-in slide-in-from-top-2 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium text-petrol">
                <Link2 className="h-4 w-4" /> Opslaan in bibliotheek
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedProject}
                  onChange={(e) => { setSelectedProject(e.target.value); setSelectedOfferte('') }}
                  className="text-sm bg-background border rounded-xl px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-petrol/50"
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
                    className="text-sm bg-background border rounded-xl px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-petrol/50"
                  >
                    <option value="">Geen offerte</option>
                    {filteredOffertes.map(o => (
                      <option key={o.id} value={o.id}>{o.nummer || o.titel}</option>
                    ))}
                  </select>
                )}
                <Button onClick={handleOpslaan} className="rounded-xl bg-petrol hover:bg-petrol/90 gap-1.5">
                  <Save className="h-4 w-4" /> Opslaan
                </Button>
              </div>
            </div>
          )}

          {/* Berichten */}
          <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
              <div className="space-y-4">
                {chatBerichten.map((bericht) => (
                  <div
                    key={bericht.id}
                    className={cn(
                      'flex gap-3',
                      bericht.rol === 'user' ? 'justify-end' : 'justify-start',
                      bericht.rol === 'systeem' ? 'justify-center' : '',
                    )}
                  >
                    {bericht.rol === 'assistant' && (
                      <div className="flex-shrink-0 mt-1">
                        <Sparkles className="w-4 h-4 text-petrol" />
                      </div>
                    )}

                    <div className={cn(
                      'space-y-2',
                      bericht.rol === 'user' ? 'max-w-[80%]' : bericht.rol === 'assistant' ? 'w-full max-w-[92%]' : '',
                    )}>
                      {bericht.rol === 'systeem' && (
                        <div className="text-xs text-destructive bg-destructive/10 rounded-xl px-4 py-2">
                          {bericht.tekst}
                        </div>
                      )}

                      {/* Assistent met beeld → één gebundelde kaart: toelichting boven, resultaat eronder */}
                      {bericht.rol === 'assistant' && bericht.afbeelding_url ? (
                        <div className="rounded-2xl border bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                          <p className="px-4 pt-3 pb-2.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{bericht.tekst}</p>
                          <div className="relative group/img">
                            <img
                              src={bericht.afbeelding_url}
                              alt="Resultaat"
                              onClick={() => window.open(bericht.afbeelding_url!, '_blank')}
                              className="block w-full h-auto cursor-zoom-in"
                            />
                            <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => window.open(bericht.afbeelding_url!, '_blank')}
                                className="h-8 w-8 rounded-lg bg-black/55 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                                title="Vergroten"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownload(bericht.afbeelding_url!, bericht.fal_request_id || bericht.id)}
                                className="h-8 w-8 rounded-lg bg-black/55 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {bericht.rol !== 'systeem' && (
                            <div className={cn(
                              'rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed',
                              bericht.rol === 'user'
                                ? 'bg-mod-klanten-light text-foreground'
                                : 'bg-card border text-foreground',
                            )}>
                              {bericht.tekst}
                            </div>
                          )}

                          {bericht.afbeelding_url && (
                            <div
                              className={cn(
                                'rounded-2xl overflow-hidden border cursor-zoom-in transition-all hover:shadow-lg',
                                bericht.rol === 'user' ? 'max-w-[260px]' : '',
                              )}
                              onClick={() => bericht.afbeelding_url && window.open(bericht.afbeelding_url, '_blank')}
                            >
                              <img
                                src={bericht.afbeelding_url}
                                alt={bericht.rol === 'user' ? 'Upload' : 'Resultaat'}
                                className="w-full h-auto"
                              />
                            </div>
                          )}
                        </>
                      )}

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

                {isGenerating && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-petrol" />
                    </div>
                    <div className="bg-card border rounded-2xl p-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="flex gap-1">
                          <span className="w-2 h-2 bg-petrol/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-petrol/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-petrol/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                        <span className="text-xs">
                          {!foto ? 'Aan het typen...' : generatieStatus === 'claude' ? 'Bedenken wat ik ga maken...' : 'Beeld genereren...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
          </div>

          {/* ── Composer ── */}
          <div className="flex-shrink-0 px-4 pb-4 pt-1">
            {composer}
          </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ═══════════════ BIBLIOTHEEK ═══════════════ */}
      {view === 'bibliotheek' && (
        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 bg-gradient-to-b from-petrol-light/[0.05] via-background to-background">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{gefilterd.length}</span> {gefilterd.length === 1 ? 'visualisatie' : 'visualisaties'}
            </p>
            <div className="inline-flex rounded-lg bg-muted/60 p-0.5">
              {(['alle', 'gekoppeld', 'los'] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setFilterKoppeling(val)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    filterKoppeling === val
                      ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                      : 'text-muted-foreground hover:text-foreground/80',
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
                <span className="w-2 h-2 bg-petrol/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-petrol/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-petrol/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : gefilterd.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <div className="p-3 bg-petrol-light/15 rounded-2xl ring-1 ring-petrol/10 mb-4">
                <ImageIcon className="w-6 h-6 text-petrol" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {visualisaties.length === 0 ? 'Nog geen visualisaties' : 'Geen resultaten voor dit filter'}
              </p>
              {visualisaties.length === 0 && (
                <button onClick={() => setView('chat')} className="mt-3 text-sm font-medium text-petrol hover:underline underline-offset-2">
                  Maak je eerste in de Chat
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gefilterd.map((v, index) => {
                const project = projecten.find(p => p.id === v.project_id)
                const offerte = offertes.find(o => o.id === v.offerte_id)
                return (
                  <div
                    key={v.id}
                    className="group relative rounded-xl overflow-hidden bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all"
                  >
                    <div className="aspect-[16/10] cursor-pointer overflow-hidden" onClick={() => setLightboxIndex(index)}>
                      <img
                        src={v.resultaat_url}
                        alt="Mockup"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-center gap-1 flex-wrap mb-1">
                        {project && <Badge className="badge-petrol text-2xs">{project.naam}</Badge>}
                        {offerte && <Badge className="badge-blauw text-2xs">{offerte.nummer || offerte.titel}</Badge>}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(v.created_at).toLocaleDateString('nl-NL')}</span>
                        <span>1 credit</span>
                      </div>
                    </div>

                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="secondary" className="h-6 w-6 p-0 rounded-lg" onClick={() => setLightboxIndex(index)} title="Bekijken">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <div className="relative">
                        <Button size="sm" variant="secondary" className="h-6 w-6 p-0 rounded-lg" onClick={() => setShareDropdownId(shareDropdownId === v.id ? null : v.id)} title="Delen">
                          <Send className="h-3 w-3" />
                        </Button>
                        {shareDropdownId === v.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShareDropdownId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-card rounded-lg border border-border shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden">
                              {v.project_id && (
                                <button onClick={() => handleShareViaPortaal(v)} className="w-full text-left px-3 py-2 text-xs hover:bg-background transition-colors flex items-center gap-2">
                                  <Send className="h-3 w-3 text-[#1A535C]" /> Via portaal
                                </button>
                              )}
                              <button onClick={() => handleOpenShareEmail(v)} className="w-full text-left px-3 py-2 text-xs hover:bg-background transition-colors flex items-center gap-2">
                                <Mail className="h-3 w-3 text-[#F15025]" /> Via email
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <Button size="sm" variant="secondary" className="h-6 w-6 p-0 rounded-lg" onClick={() => handleDownload(v.resultaat_url, v.id)} title="Download">
                        <Download className="h-3 w-3" />
                      </Button>
                      {deleteConfirmId === v.id ? (
                        <Button size="sm" variant="destructive" className="h-6 px-2 text-2xs rounded-lg" onClick={() => handleDelete(v.id)}>
                          Bevestig
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" className="h-6 w-6 p-0 rounded-lg" onClick={() => setDeleteConfirmId(v.id)}>
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
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFileUpload(e, 'foto')} />
      <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFileUpload(e, 'logo')} />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <VisualisatieLightbox
          visualisaties={gefilterd}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Inline email compose voor delen */}
      {shareEmailVis && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShareEmailVis(null)}>
          <div className="bg-card rounded-xl w-full max-w-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <h3 className="text-sm font-semibold text-foreground">Visualisatie delen via email</h3>
              <button onClick={() => setShareEmailVis(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <img src={shareEmailVis.resultaat_url} alt="" className="w-full max-h-48 object-cover rounded-lg" />
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground w-16 flex-shrink-0">Aan</span>
                <input value={shareEmailTo} onChange={(e) => setShareEmailTo(e.target.value)} placeholder="email@voorbeeld.nl" type="email" className="flex-1 text-sm px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-[#1A535C]/40 focus:bg-white transition-colors" />
              </div>
              <input value={shareEmailSubject} onChange={(e) => setShareEmailSubject(e.target.value)} placeholder="Onderwerp..." className="w-full text-sm font-medium px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-[#1A535C]/40 transition-colors" />
              <textarea
                value={shareEmailBody}
                onChange={(e) => setShareEmailBody(e.target.value)}
                rows={4}
                className="w-full text-sm px-3 py-3 border border-border rounded-lg bg-background focus:outline-none focus:border-[#1A535C]/40 focus:bg-white transition-colors resize-y leading-relaxed"
                placeholder="Bericht..."
              />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 bg-background/50">
              <button onClick={() => setShareEmailVis(null)} className="text-sm text-muted-foreground hover:text-foreground/70 transition-colors">Annuleren</button>
              <button
                onClick={handleSendShareEmail}
                disabled={!shareEmailTo.trim() || isSendingShareEmail}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-[#F15025] text-white hover:bg-[#D94520] disabled:opacity-40 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                {isSendingShareEmail ? 'Verzenden...' : 'Verstuur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credits Pakket Dialog */}
      <CreditsPakketDialog
        isOpen={showCreditsPakket}
        onClose={() => setShowCreditsPakket(false)}
        onCreditsToegevoegd={(nieuwSaldo) => setCreditSaldo(nieuwSaldo)}
      />
    </div>
  )
}

export default VisualizerLayout
