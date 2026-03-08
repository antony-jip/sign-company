import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Palette, Upload, X, Image as ImageIcon, Sparkles,
  Loader2, Download, Save, RefreshCw, Trash2, Eye, Link2, Filter,
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

export function VisualizerLayout() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // ── Form state ──
  const [gebouwFoto, setGebouwFoto] = useState<string | null>(null)
  const [gebouwFotoNaam, setGebouwFotoNaam] = useState('')
  const [logoFoto, setLogoFoto] = useState<string | null>(null)
  const [logoFotoNaam, setLogoFotoNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
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

  // Filter offertes by selected project
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

  const processFile = useCallback(async (file: File, type: 'gebouw' | 'logo') => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Alleen JPG, PNG en WEBP'); return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const raw = reader.result as string
      const resized = await resizeImage(raw, type === 'gebouw' ? 1200 : 800, 0.8)
      if (type === 'gebouw') { setGebouwFoto(resized); setGebouwFotoNaam(file.name) }
      else { setLogoFoto(resized); setLogoFotoNaam(file.name) }
    }
    reader.readAsDataURL(file)
  }, [resizeImage])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'gebouw' | 'logo') => {
    const file = e.target.files?.[0]
    if (file) processFile(file, type)
  }, [processFile])

  const handleDrop = useCallback((e: React.DragEvent, type: 'gebouw' | 'logo') => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file, type)
  }, [processFile])

  // ── Generate ──
  const handleGenereer = useCallback(async () => {
    if (!user?.id || !gebouwFoto || !beschrijving.trim()) return
    if (creditSaldo <= 0) {
      toast.error('Geen credits meer')
      return
    }

    try {
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
      toast.error(`Mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
    }
  }, [user?.id, gebouwFoto, logoFoto, beschrijving, creditSaldo])

  // ── Save result ──
  const handleOpslaan = useCallback(async () => {
    if (!user?.id || !resultaat || !gebouwFoto) return
    try {
      const project = projecten.find(p => p.id === selectedProject)
      await createSigningVisualisatie({
        user_id: user.id,
        offerte_id: selectedOfferte || undefined,
        project_id: selectedProject || undefined,
        klant_id: project?.klant_id || undefined,
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
      toast.success('Opgeslagen in bibliotheek!')
      // Reset form
      setResultaat(null)
      setGeneratieStatus('idle')
      setGebouwFoto(null)
      setGebouwFotoNaam('')
      setLogoFoto(null)
      setLogoFotoNaam('')
      setBeschrijving('')
      setSelectedProject('')
      setSelectedOfferte('')
      ladenBibliotheek()
    } catch {
      toast.error('Opslaan mislukt')
    }
  }, [user?.id, resultaat, gebouwFoto, logoFoto, beschrijving, selectedProject, selectedOfferte, projecten, ladenBibliotheek])

  const handleDownload = useCallback((url: string, id: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `signing-mockup-${id.slice(0, 8)}.png`
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

  // ── Filter library ──
  const gefilterd = visualisaties.filter(v => {
    if (filterKoppeling === 'gekoppeld' && !v.project_id && !v.offerte_id) return false
    if (filterKoppeling === 'los' && (v.project_id || v.offerte_id)) return false
    return true
  })

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
            Upload een foto, beschrijf wat je wilt — AI doet de rest
          </p>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          <span className={cn('font-medium', creditSaldo < 5 ? 'text-orange-500' : 'text-foreground')}>{creditSaldo}</span> credits
        </div>
      </div>

      {/* ═══ Inline Generator ═══ */}
      <div className="border rounded-xl bg-card p-6">
        {generatieStatus === 'klaar' && resultaat ? (
          /* ── Result view ── */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Origineel</Label>
                <div className="rounded-lg overflow-hidden border bg-muted aspect-[4/3]">
                  {gebouwFoto && <img src={gebouwFoto} alt="Origineel" className="w-full h-full object-cover" />}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">AI Mockup</Label>
                <div className="rounded-lg overflow-hidden border bg-muted aspect-[4/3]">
                  <img src={resultaat.url} alt="Mockup" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>1 credit gebruikt</span>
              <span>|</span>
              <span>{(resultaat.generatie_tijd_ms / 1000).toFixed(1)}s</span>
            </div>

            {/* Link to project/offerte before saving */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <select
                value={selectedProject}
                onChange={(e) => { setSelectedProject(e.target.value); setSelectedOfferte('') }}
                className="text-sm bg-background border rounded-md px-2 py-1.5 flex-1"
              >
                <option value="">Geen project</option>
                {projecten.map(p => (
                  <option key={p.id} value={p.id}>{p.naam} — {p.klant_naam}</option>
                ))}
              </select>
              <select
                value={selectedOfferte}
                onChange={(e) => setSelectedOfferte(e.target.value)}
                className="text-sm bg-background border rounded-md px-2 py-1.5 flex-1"
              >
                <option value="">Geen offerte</option>
                {filteredOffertes.map(o => (
                  <option key={o.id} value={o.id}>{o.nummer || o.titel} — {o.klant_naam}</option>
                ))}
              </select>
            </div>

            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                AI prompt bekijken
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg whitespace-pre-wrap font-mono text-muted-foreground text-xs">
                {resultaat.prompt_gebruikt}
              </pre>
            </details>

            <div className="flex items-center gap-2">
              <Button onClick={handleOpslaan} className="gap-2">
                <Save className="h-4 w-4" /> Opslaan in bibliotheek
              </Button>
              <Button variant="outline" onClick={() => { setResultaat(null); setGeneratieStatus('idle') }} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Opnieuw
              </Button>
              <Button variant="outline" onClick={() => handleDownload(resultaat.url, 'new')} className="gap-2">
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button variant="ghost" onClick={() => { setResultaat(null); setGeneratieStatus('idle') }} className="gap-2 ml-auto">
                <Trash2 className="h-4 w-4" /> Weggooien
              </Button>
            </div>
          </div>
        ) : (
          /* ── Generator form ── */
          <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-6">
            {/* Col 1: Gebouwfoto */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Foto van het gebouw
              </Label>
              {gebouwFoto ? (
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  <img src={gebouwFoto} alt="Gebouw" className="w-full aspect-[4/3] object-cover" />
                  <Button variant="destructive" size="sm" className="absolute top-2 right-2"
                    onClick={() => { setGebouwFoto(null); setGebouwFotoNaam('') }}>
                    <X className="h-3 w-3" />
                  </Button>
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {gebouwFotoNaam}
                  </span>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'gebouw')}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Sleep foto hierheen of <span className="text-primary font-medium">klik</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Rechte foto, goede belichting</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => handleFileUpload(e, 'gebouw')} />
            </div>

            {/* Col 2: Logo */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Logo <span className="text-muted-foreground font-normal">(optioneel)</span>
              </Label>
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
                  className="border-2 border-dashed rounded-lg aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'logo')}
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    PNG met transparante achtergrond
                  </p>
                </div>
              )}
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => handleFileUpload(e, 'logo')} />
            </div>

            {/* Col 3: Description + Generate */}
            <div className="flex flex-col">
              <Label className="text-sm font-medium mb-2 block">
                Wat wil je zien?
              </Label>
              <Textarea
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                placeholder='bijv. "LED doosletters boven de deur, warmwit, modern" of "Neon bord in het raam"'
                className="text-sm flex-1 min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1.5 mb-3">
                Claude AI analyseert je foto en maakt de perfecte mockup
              </p>

              {/* Optional: link to project */}
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedProject}
                  onChange={(e) => { setSelectedProject(e.target.value); setSelectedOfferte('') }}
                  className="text-xs bg-background border rounded-md px-2 py-1.5 flex-1 text-muted-foreground"
                >
                  <option value="">Koppel aan project...</option>
                  {projecten.map(p => (
                    <option key={p.id} value={p.id}>{p.naam}</option>
                  ))}
                </select>
                {selectedProject && (
                  <select
                    value={selectedOfferte}
                    onChange={(e) => setSelectedOfferte(e.target.value)}
                    className="text-xs bg-background border rounded-md px-2 py-1.5 flex-1 text-muted-foreground"
                  >
                    <option value="">Koppel aan offerte...</option>
                    {filteredOffertes.map(o => (
                      <option key={o.id} value={o.id}>{o.nummer || o.titel}</option>
                    ))}
                  </select>
                )}
              </div>

              <Button
                onClick={handleGenereer}
                disabled={!gebouwFoto || !beschrijving.trim() || isGenerating || creditSaldo <= 0}
                className="gap-2 w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {generatieStatus === 'claude' ? "Claude analyseert foto's..." : 'Mockup genereren...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Genereer Mockup — 1 credit
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

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
              ? 'Nog geen mockups — genereer je eerste hierboven'
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
