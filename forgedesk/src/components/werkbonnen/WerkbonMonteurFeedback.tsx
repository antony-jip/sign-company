import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Camera, X, Pen, RotateCcw, Lock, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { WerkbonFoto } from '@/types'

interface WerkbonMonteurFeedbackProps {
  showUren: boolean
  showOpmerkingen: boolean
  showFotos: boolean
  showHandtekening: boolean
  readOnly?: boolean
  urenGewerkt: number | undefined
  monteurOpmerkingen: string
  fotos: WerkbonFoto[]
  klantNaamGetekend: string
  handtekeningData: string | undefined
  onUrenChange: (val: number | undefined) => void
  onOpmerkingenChange: (val: string) => void
  onFotoToevoegen: (e: React.ChangeEvent<HTMLInputElement>, type: WerkbonFoto['type']) => void
  onFotoVerwijderen: (fotoId: string) => void
  onKlantNaamChange: (val: string) => void
  onHandtekeningChange: (data: string | undefined) => void
  onLightbox: (url: string) => void
  onDownloadFotos?: () => void
}

export const WerkbonMonteurFeedback = React.memo(function WerkbonMonteurFeedback({
  showUren, showOpmerkingen, showFotos, showHandtekening,
  readOnly = false,
  urenGewerkt, monteurOpmerkingen, fotos,
  klantNaamGetekend, handtekeningData,
  onUrenChange, onOpmerkingenChange, onFotoToevoegen, onFotoVerwijderen,
  onKlantNaamChange, onHandtekeningChange, onLightbox, onDownloadFotos,
}: WerkbonMonteurFeedbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEditingSignature, setIsEditingSignature] = useState(!handtekeningData)
  const [fullscreenSignature, setFullscreenSignature] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoords(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = e.currentTarget
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoords(e, canvas)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000'
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing])

  const endDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(false)
    const canvas = e.currentTarget
    onHandtekeningChange(canvas.toDataURL('image/png'))
  }, [onHandtekeningChange])

  const clearCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const clearSignature = useCallback(() => {
    clearCanvas(canvasRef.current)
    clearCanvas(fullscreenCanvasRef.current)
    onHandtekeningChange(undefined)
    setIsEditingSignature(true)
  }, [onHandtekeningChange, clearCanvas])

  const handleFullscreenDone = useCallback(() => {
    const canvas = fullscreenCanvasRef.current
    if (canvas) {
      const data = canvas.toDataURL('image/png')
      onHandtekeningChange(data)
      setIsEditingSignature(false)
    }
    setFullscreenSignature(false)
  }, [onHandtekeningChange])

  useEffect(() => {
    if (fullscreenSignature && fullscreenCanvasRef.current) {
      const ctx = fullscreenCanvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, fullscreenCanvasRef.current.width, fullscreenCanvasRef.current.height)
    }
  }, [fullscreenSignature])

  if (!showUren && !showOpmerkingen && !showFotos && !showHandtekening) return null

  const voorFotos = fotos.filter(f => f.type === 'voor')
  const naFotos = fotos.filter(f => f.type === 'na')
  const overigFotos = fotos.filter(f => f.type === 'overig')

  return (
    <>
      {/* Uren */}
      {showUren && (
        <div className="bg-white rounded-xl border border-[#F0EFEC] p-4">
          <h3 className="text-[13px] font-bold text-[#1A1A1A] mb-2">Uren gewerkt</h3>
          <Input
            type="number"
            min={0}
            step={0.25}
            defaultValue={urenGewerkt ?? ''}
            onBlur={(e) => onUrenChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Bijv. 4.5"
            className="max-w-[200px] font-mono text-base h-11"
            disabled={readOnly}
          />
        </div>
      )}

      {/* Opmerkingen */}
      {showOpmerkingen && (
        <div className="bg-white rounded-xl border border-[#F0EFEC] p-4">
          <h3 className="text-[13px] font-bold text-[#1A1A1A] mb-2">Opmerkingen monteur</h3>
          <Textarea
            defaultValue={monteurOpmerkingen}
            onBlur={(e) => onOpmerkingenChange(e.target.value)}
            placeholder="Bijzonderheden, problemen, opmerkingen..."
            rows={3}
            className="text-base"
            disabled={readOnly}
          />
        </div>
      )}

      {/* Foto's — prominent voor mobiel */}
      {showFotos && (
        <div className="bg-white rounded-xl border border-[#F0EFEC] p-4 space-y-4" ref={containerRef}>
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-2">
              <Camera className="h-4 w-4" /> Foto's
              {fotos.length > 0 && <span className="text-[11px] font-mono text-[#9B9B95]">{fotos.length}</span>}
              {readOnly && <Lock className="h-3 w-3 text-[#9B9B95]" />}
            </h3>
            {fotos.length > 0 && onDownloadFotos && (
              <button
                onClick={onDownloadFotos}
                className="hidden md:flex items-center gap-1.5 text-[12px] font-medium text-[#6B6B66] hover:text-[#1A1A1A] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download alle
              </button>
            )}
          </div>

          {/* Grote camera knoppen — mobile-first */}
          {!readOnly && (
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => onFotoToevoegen(e, 'voor')} />
                <div className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-[#1A535C]/20 bg-[#1A535C]/[0.03] hover:bg-[#1A535C]/[0.06] active:bg-[#1A535C]/[0.10] transition-colors">
                  <Camera className="h-6 w-6 text-[#1A535C]" />
                  <span className="text-[13px] font-semibold text-[#1A535C]">Voor foto</span>
                </div>
              </label>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => onFotoToevoegen(e, 'na')} />
                <div className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-[#F15025]/20 bg-[#F15025]/[0.03] hover:bg-[#F15025]/[0.06] transition-colors">
                  <Camera className="h-6 w-6 text-[#F15025]" />
                  <span className="text-[13px] font-semibold text-[#F15025]">Na foto</span>
                </div>
              </label>
            </div>
          )}

          {/* Voor foto's */}
          {voorFotos.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-[#9B9B95] uppercase tracking-widest mb-2">Voor</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {voorFotos.map((foto) => (
                  <div key={foto.id} className="relative group rounded-xl overflow-hidden border border-[#F0EFEC]">
                    <img src={foto.url} alt={foto.omschrijving || ''} className="w-full aspect-[4/3] object-cover cursor-pointer" onClick={() => onLightbox(foto.url)} />
                    {!readOnly && (
                      <button
                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 md:opacity-0 active:opacity-100 transition-opacity"
                        onClick={() => onFotoVerwijderen(foto.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Na foto's */}
          {naFotos.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-[#9B9B95] uppercase tracking-widest mb-2">Na</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {naFotos.map((foto) => (
                  <div key={foto.id} className="relative group rounded-xl overflow-hidden border border-[#F0EFEC]">
                    <img src={foto.url} alt={foto.omschrijving || ''} className="w-full aspect-[4/3] object-cover cursor-pointer" onClick={() => onLightbox(foto.url)} />
                    {!readOnly && (
                      <button
                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                        onClick={() => onFotoVerwijderen(foto.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overig foto's */}
          {overigFotos.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-[#9B9B95] uppercase tracking-widest mb-2">Overig</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {overigFotos.map((foto) => (
                  <div key={foto.id} className="relative group rounded-xl overflow-hidden border border-[#F0EFEC]">
                    <img src={foto.url} alt={foto.omschrijving || ''} className="w-full aspect-[4/3] object-cover cursor-pointer" onClick={() => onLightbox(foto.url)} />
                    {!readOnly && (
                      <button
                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                        onClick={() => onFotoVerwijderen(foto.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {fotos.length === 0 && readOnly && (
            <p className="text-sm text-[#9B9B95] italic">Geen foto's toegevoegd</p>
          )}
        </div>
      )}

      {/* Handtekening klant */}
      {showHandtekening && (
        <div className="bg-white rounded-xl border border-[#F0EFEC] p-4 space-y-3">
          <h3 className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-2">
            <Pen className="h-4 w-4" /> Handtekening klant
            {readOnly && <Lock className="h-3 w-3 text-[#9B9B95]" />}
          </h3>

          <div>
            <Label className="text-[12px] text-[#6B6B66]">Naam</Label>
            <Input
              defaultValue={klantNaamGetekend}
              onBlur={(e) => onKlantNaamChange(e.target.value)}
              placeholder="Naam ondertekenaar"
              className="max-w-full text-base h-11"
              disabled={readOnly}
            />
          </div>

          {readOnly && handtekeningData ? (
            <div>
              <img src={handtekeningData} alt="Handtekening" className="border rounded-xl bg-[#F8F7F5] w-full max-w-[400px]" />
            </div>
          ) : readOnly && !handtekeningData ? (
            <p className="text-sm text-[#9B9B95] italic">Nog niet ondertekend</p>
          ) : handtekeningData && !isEditingSignature ? (
            <div className="space-y-2">
              <img src={handtekeningData} alt="Handtekening" className="border rounded-xl bg-[#F8F7F5] w-full max-w-[400px]" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-10 px-4 text-[13px]" onClick={() => setIsEditingSignature(true)}>
                  <Pen className="h-3.5 w-3.5 mr-1.5" /> Bewerken
                </Button>
                <Button variant="outline" size="sm" className="h-10 px-4 text-[13px]" onClick={clearSignature}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Wissen
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Inline canvas */}
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="border rounded-xl bg-[#F8F7F5] cursor-crosshair touch-none w-full"
                style={{ maxWidth: '100%', height: 'auto', aspectRatio: '3/1' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-10 px-4 text-[13px]" onClick={clearSignature}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Wissen
                </Button>
                <Button
                  variant="outline" size="sm" className="h-10 px-4 text-[13px] md:hidden"
                  onClick={() => setFullscreenSignature(true)}
                >
                  Volledig scherm
                </Button>
                {handtekeningData && (
                  <Button variant="default" size="sm" className="h-10 px-4 text-[13px]" onClick={() => setIsEditingSignature(false)}>
                    Klaar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen signature modal — mobiel */}
      <Dialog open={fullscreenSignature} onOpenChange={setFullscreenSignature}>
        <DialogContent className="max-w-[100vw] max-h-[100dvh] w-screen h-[100dvh] p-0 rounded-none border-none">
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EFEC]">
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">Ondertekenen</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-10" onClick={() => {
                  clearCanvas(fullscreenCanvasRef.current)
                }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button size="sm" className="h-10 px-5" onClick={handleFullscreenDone}>
                  Klaar
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <canvas
                ref={fullscreenCanvasRef}
                width={1200}
                height={600}
                className="border-2 border-dashed border-[#C0BDB8] rounded-2xl bg-[#F8F7F5] cursor-crosshair touch-none w-full h-full"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <div className="px-4 py-3 border-t border-[#F0EFEC] text-center text-[12px] text-[#9B9B95]">
              Teken met je vinger op het scherm
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})
