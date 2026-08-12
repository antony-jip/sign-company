import { useCallback, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, FileText, AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { gooiBijBudgetError } from '@/lib/aiBudgetError'
import { logger } from '@/utils/logger'

export interface UitgeschrevenPost {
  titel: string
  pagina: number
  specs: { label: string; waarde: string }[]
  aantal: number
  eenheid?: string
  breedte_cm?: number
  hoogte_cm?: number
  open_punten: string[]
  beschrijving: string
}

interface OfferteUitschrijvenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  klantId?: string
  onPostenToevoegen: (posten: UitgeschrevenPost[]) => void
}

const MAX_MB = 10

/**
 * Leest een specificatiedocument van de klant en zet het om in offerteregels.
 * Twee ronden achter elkaar: eerst splitsen (letterlijk overnemen), daarna
 * formuleren (in de eigen schrijfstijl). Prijzen blijven leeg; die reken je zelf.
 */
export function OfferteUitschrijvenDialog({ open, onOpenChange, klantId, onPostenToevoegen }: OfferteUitschrijvenDialogProps) {
  const { session } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bestandNaam, setBestandNaam] = useState('')
  const [bestandBase64, setBestandBase64] = useState('')
  const [bezig, setBezig] = useState<'' | 'splitsen' | 'formuleren'>('')
  const [posten, setPosten] = useState<UitgeschrevenPost[]>([])
  const [opmerkingen, setOpmerkingen] = useState<string[]>([])
  const [uitgevinkt, setUitgevinkt] = useState<Set<number>>(new Set())

  const reset = useCallback(() => {
    setBestandNaam('')
    setBestandBase64('')
    setPosten([])
    setOpmerkingen([])
    setUitgevinkt(new Set())
    setBezig('')
  }, [])

  const handleBestand = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Alleen PDF')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Bestand is te groot (max ${MAX_MB} MB)`)
      return
    }
    setBestandNaam(file.name)
    setPosten([])
    const reader = new FileReader()
    reader.onload = () => setBestandBase64(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const roep = useCallback(async (payload: Record<string, unknown>) => {
    const token = session?.access_token
    const response = await fetch('/api/offerte-uitschrijven', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      await gooiBijBudgetError(response)
      const fout = await response.json().catch(() => ({})) as { error?: string }
      throw new Error(fout.error || 'Aanvraag mislukt')
    }
    return await response.json()
  }, [session])

  const handleLezen = useCallback(async () => {
    if (!bestandBase64) { toast.error('Kies eerst een PDF'); return }
    setBezig('splitsen')
    try {
      const gesplitst = await roep({ fase: 'splitsen', bestand_base64: bestandBase64 }) as {
        posten?: Omit<UitgeschrevenPost, 'beschrijving'>[]
        algemene_opmerkingen?: string[]
      }
      const ruw = gesplitst.posten || []
      if (!ruw.length) {
        toast.error('Geen posten gevonden in dit document')
        setBezig('')
        return
      }
      setOpmerkingen(gesplitst.algemene_opmerkingen || [])
      setPosten(ruw.map((p) => ({ ...p, open_punten: p.open_punten || [], beschrijving: '' })))

      setBezig('formuleren')
      const geformuleerd = await roep({ fase: 'formuleren', posten: ruw, klant_id: klantId }) as {
        regels?: { index: number; beschrijving: string }[]
      }
      const perIndex = new Map((geformuleerd.regels || []).map((r) => [r.index, r.beschrijving]))
      setPosten(ruw.map((p, i) => ({
        ...p,
        open_punten: p.open_punten || [],
        beschrijving: perIndex.get(i) || p.titel,
      })))
    } catch (err) {
      logger.error('Uitschrijven mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Uitschrijven mislukt')
    } finally {
      setBezig('')
    }
  }, [bestandBase64, klantId, roep])

  const gekozen = posten.filter((_, i) => !uitgevinkt.has(i))

  const handleToevoegen = useCallback(() => {
    if (!gekozen.length) return
    onPostenToevoegen(gekozen)
    toast.success(`${gekozen.length} ${gekozen.length === 1 ? 'regel' : 'regels'} toegevoegd`)
    reset()
    onOpenChange(false)
  }, [gekozen, onPostenToevoegen, onOpenChange, reset])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Uitschrijven vanuit document</DialogTitle>
          <DialogDescription>
            Daan knipt het specificatiedocument van de klant op in posten en schrijft de regels uit. Prijzen blijven leeg.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleBestand} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!!bezig}>
              <Upload className="h-4 w-4 mr-2" />
              PDF kiezen
            </Button>
            {bestandNaam && (
              <span className="inline-flex items-center gap-2 text-[13px] text-text-sec min-w-0">
                <FileText className="h-3.5 w-3.5 shrink-0 text-petrol" />
                <span className="truncate max-w-[240px]">{bestandNaam}</span>
              </span>
            )}
            <Button onClick={handleLezen} disabled={!bestandBase64 || !!bezig} className="ml-auto bg-petrol hover:bg-petrol/90 text-white">
              {bezig && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {bezig === 'splitsen' ? 'Document lezen...' : bezig === 'formuleren' ? 'Regels schrijven...' : 'Lezen'}
            </Button>
          </div>

          {opmerkingen.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Geldt voor de hele opdracht</p>
              <ul className="space-y-1">
                {opmerkingen.map((o, i) => (
                  <li key={i} className="text-[13px] text-foreground">{o}</li>
                ))}
              </ul>
            </div>
          )}

          {posten.map((post, i) => {
            const uit = uitgevinkt.has(i)
            return (
              <div key={i} className={cn('rounded-lg border px-4 py-3 transition-colors', uit ? 'border-border/60 bg-muted/20 opacity-60' : 'border-border')}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!uit}
                    onChange={() => setUitgevinkt((prev) => {
                      const next = new Set(prev)
                      if (next.has(i)) next.delete(i); else next.add(i)
                      return next
                    })}
                    className="mt-1 h-4 w-4 rounded border-border accent-petrol"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[13px] font-semibold text-foreground">{post.titel}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">p. {post.pagina}</span>
                      {post.aantal > 1 && <span className="text-[11px] text-muted-foreground">{post.aantal}x</span>}
                    </div>

                    <textarea
                      value={post.beschrijving}
                      onChange={(e) => setPosten((prev) => prev.map((p, idx) => idx === i ? { ...p, beschrijving: e.target.value } : p))}
                      rows={2}
                      className="mt-2 w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] leading-relaxed text-foreground outline-none focus:border-petrol"
                    />

                    {post.specs.length > 0 && (
                      <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                        {post.specs.map((s, si) => (
                          <div key={si} className="flex gap-2 text-[12px] min-w-0">
                            <span className="w-24 shrink-0 text-muted-foreground">{s.label}</span>
                            <span className="truncate text-foreground" title={s.waarde}>{s.waarde}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {post.open_punten.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {post.open_punten.map((op, oi) => (
                          <span key={oi} className="inline-flex items-center gap-1 rounded-md bg-flame/[0.08] px-2 py-0.5 text-[11px] text-flame">
                            <AlertTriangle className="h-3 w-3" />
                            {op}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {posten.length > 0 && (
            <span className="mr-auto text-[13px] text-muted-foreground">
              {gekozen.length} van {posten.length} posten · open punten komen als interne notitie mee
            </span>
          )}
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false) }}>
            <X className="h-4 w-4 mr-1.5" />
            Sluiten
          </Button>
          <Button onClick={handleToevoegen} disabled={!gekozen.length || !!bezig} className="bg-flame hover:bg-flame/90 text-white">
            Toevoegen als regels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
