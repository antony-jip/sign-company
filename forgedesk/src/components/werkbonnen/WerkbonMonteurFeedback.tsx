import React, { useState, useCallback, useRef } from 'react'
import { Camera, X, Pen, RotateCcw, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WerkbonFoto } from '@/types'

interface WerkbonMonteurFeedbackProps {
  // Visibility toggles
  showUren: boolean
  showOpmerkingen: boolean
  showFotos: boolean
  showHandtekening: boolean
  // Values
  urenGewerkt: number | undefined
  monteurOpmerkingen: string
  fotos: WerkbonFoto[]
  klantNaamGetekend: string
  handtekeningData: string | undefined
  // Callbacks
  onUrenChange: (val: number | undefined) => void
  onOpmerkingenChange: (val: string) => void
  onFotoToevoegen: (e: React.ChangeEvent<HTMLInputElement>, type: WerkbonFoto['type']) => void
  onFotoVerwijderen: (fotoId: string) => void
  onKlantNaamChange: (val: string) => void
  onHandtekeningChange: (data: string | undefined) => void
  onLightbox: (url: string) => void
}

export const WerkbonMonteurFeedback = React.memo(function WerkbonMonteurFeedback({
  showUren, showOpmerkingen, showFotos, showHandtekening,
  urenGewerkt, monteurOpmerkingen, fotos,
  klantNaamGetekend, handtekeningData,
  onUrenChange, onOpmerkingenChange, onFotoToevoegen, onFotoVerwijderen,
  onKlantNaamChange, onHandtekeningChange, onLightbox,
}: WerkbonMonteurFeedbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEditingSignature, setIsEditingSignature] = useState(!handtekeningData)

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing])

  const endDraw = useCallback(() => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) onHandtekeningChange(canvas.toDataURL('image/png'))
  }, [onHandtekeningChange])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    onHandtekeningChange(undefined)
    setIsEditingSignature(true)
  }, [onHandtekeningChange])

  if (!showUren && !showOpmerkingen && !showFotos && !showHandtekening) return null

  return (
    <>
      {showUren && (
        <Card>
          <CardHeader><CardTitle className="text-base">Uren gewerkt</CardTitle></CardHeader>
          <CardContent>
            <Input
              type="number"
              min={0}
              step={0.25}
              defaultValue={urenGewerkt ?? ''}
              onBlur={(e) => onUrenChange(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Bijv. 4.5"
              className="max-w-[200px] font-mono"
            />
          </CardContent>
        </Card>
      )}

      {showOpmerkingen && (
        <Card>
          <CardHeader><CardTitle className="text-base">Opmerkingen monteur</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              defaultValue={monteurOpmerkingen}
              onBlur={(e) => onOpmerkingenChange(e.target.value)}
              placeholder="Bijzonderheden, problemen, opmerkingen..."
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {showFotos && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" /> Foto's monteur</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFotoToevoegen(e, 'voor')} />
                <Button variant="outline" size="sm" asChild><span><Camera className="h-4 w-4 mr-1" /> Voor foto</span></Button>
              </label>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFotoToevoegen(e, 'na')} />
                <Button variant="outline" size="sm" asChild><span><Camera className="h-4 w-4 mr-1" /> Na foto</span></Button>
              </label>
            </div>
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {fotos.map((foto) => (
                  <div key={foto.id} className="relative group rounded-lg overflow-hidden border">
                    <img src={foto.url} alt={foto.omschrijving || ''} className="w-full aspect-[4/3] object-cover cursor-pointer" onClick={() => onLightbox(foto.url)} />
                    <div className="absolute top-1 left-1">
                      <Badge variant="secondary" className="text-2xs">{foto.type === 'voor' ? 'Voor' : foto.type === 'na' ? 'Na' : 'Overig'}</Badge>
                    </div>
                    <Button
                      variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => onFotoVerwijderen(foto.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showHandtekening && (
        <Card>
          <CardHeader><CardTitle className="text-base">Handtekening klant</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Naam</Label>
              <Input
                defaultValue={klantNaamGetekend}
                onBlur={(e) => onKlantNaamChange(e.target.value)}
                placeholder="Naam ondertekenaar"
                className="max-w-[300px]"
              />
            </div>
            {handtekeningData && !isEditingSignature ? (
              <div className="space-y-2">
                <img src={handtekeningData} alt="Handtekening" className="border rounded-lg bg-card max-w-[300px]" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingSignature(true)}>
                    <Pen className="h-3 w-3 mr-1" /> Bewerken
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSignature}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Wissen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={150}
                  className="border rounded-lg bg-card cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearSignature}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Wissen
                  </Button>
                  {handtekeningData && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingSignature(false)}>
                      Opslaan
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
})
