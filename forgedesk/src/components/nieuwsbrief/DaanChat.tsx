import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Image as Images, RotateCcw, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { chatMetDaan, type DaanChatBericht } from '@/services/nieuwsbriefService'
import { nieuwId, type NieuwsbriefDocument } from './nieuwsbriefBlokken'
import { pasDaanActieToe, type DaanStand } from './daanActies'
import { FotoBank } from './FotoBank'

/**
 * Chat-dok onder de bouwer. Je praat met Daan zoals je met een collega praat;
 * hij antwoordt kort en de nieuwsbrief verandert terwijl hij praat: elke actie
 * wordt met een korte pauze toegepast, zodat je ziet wát er verandert. Per
 * Daan-beurt kun je de hele beurt in één keer terugdraaien.
 */

interface Regel extends DaanChatBericht {
  id: string
  stappen?: string[]
  vorige?: DaanStand
  teruggedraaid?: boolean
}

interface Props {
  doc: NieuwsbriefDocument
  onderwerp: string
  preheader: string
  onDoc: (doc: NieuwsbriefDocument) => void
  onOnderwerp: (onderwerp: string, preheader: string) => void
  disabled?: boolean
}

const STAP_PAUZE = 420

const VOORBEELDEN = [
  'Maak de intro korter en persoonlijker',
  'Zet een knop naar de projectenpagina onder de eerste alinea',
  'Voeg een quote van een klant toe',
  'Bedenk een beter onderwerp',
]

export function DaanChat({ doc, onderwerp, preheader, onDoc, onOnderwerp, disabled }: Props) {
  const [open, setOpen] = useState(true)
  const [regels, setRegels] = useState<Regel[]>([])
  const [invoer, setInvoer] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [bankOpen, setBankOpen] = useState(false)
  const [bezig, setBezig] = useState<null | 'denkt' | 'past aan'>(null)
  const lijstRef = useRef<HTMLDivElement>(null)
  const invoerRef = useRef<HTMLTextAreaElement>(null)

  // De nieuwste stand, ook midden in een reeks stappen (state loopt achter).
  const standRef = useRef<DaanStand>({ doc, onderwerp, preheader })
  standRef.current = { doc, onderwerp, preheader }

  useEffect(() => {
    lijstRef.current?.scrollTo({ top: lijstRef.current.scrollHeight, behavior: 'smooth' })
  }, [regels, bezig])

  const zetStand = useCallback((stand: DaanStand) => {
    const vorige = standRef.current
    standRef.current = stand
    if (stand.doc !== vorige.doc) onDoc(stand.doc)
    if (stand.onderwerp !== vorige.onderwerp || stand.preheader !== vorige.preheader) onOnderwerp(stand.onderwerp, stand.preheader)
  }, [onDoc, onOnderwerp])

  const verstuur = useCallback(async (tekst: string) => {
    const vraag = tekst.trim()
    if (!vraag || bezig || disabled) return
    const mijn: Regel = { id: nieuwId(), rol: 'user', tekst: vraag }
    const geschiedenis: DaanChatBericht[] = [...regels.filter(r => !r.teruggedraaid || r.rol === 'user').map(r => ({ rol: r.rol, tekst: r.tekst })), { rol: 'user', tekst: vraag }]
    setRegels(prev => [...prev, mijn])
    setInvoer('')
    setBezig('denkt')
    const snapshot = standRef.current
    try {
      const { antwoord, acties } = await chatMetDaan(geschiedenis, snapshot.doc.blokken, snapshot.onderwerp, snapshot.preheader, fotos)
      const daanId = nieuwId()
      setRegels(prev => [...prev, { id: daanId, rol: 'daan', tekst: antwoord, stappen: [], vorige: acties.length ? snapshot : undefined }])
      if (acties.length > 0) {
        setBezig('past aan')
        for (const a of acties) {
          const stap = pasDaanActieToe(standRef.current, a)
          if (!stap) continue
          zetStand(stap.stand)
          setRegels(prev => prev.map(r => (r.id === daanId ? { ...r, stappen: [...(r.stappen ?? []), stap.omschrijving] } : r)))
          await new Promise(r => setTimeout(r, STAP_PAUZE))
        }
      }
      setFotos([])
    } catch (err) {
      const fout = err instanceof Error ? err.message : 'Daan reageert niet'
      setRegels(prev => [...prev, { id: nieuwId(), rol: 'daan', tekst: `Dat lukte niet: ${fout}` }])
    } finally {
      setBezig(null)
      requestAnimationFrame(() => invoerRef.current?.focus())
    }
  }, [bezig, disabled, regels, fotos, zetStand])

  const draaiTerug = useCallback((regel: Regel) => {
    if (!regel.vorige) return
    zetStand(regel.vorige)
    setRegels(prev => prev.map(r => (r.id === regel.id ? { ...r, teruggedraaid: true } : r)))
    toast.success('Teruggedraaid')
  }, [zetStand])

  return (
    <div className={cn('flex flex-shrink-0 flex-col border-t border-border bg-card transition-[max-height] duration-300', open ? 'max-h-[46vh]' : 'max-h-12')}>
      <FotoBank open={bankOpen} meerdere onKies={(urls) => { setFotos(prev => Array.from(new Set([...prev, ...urls])).slice(0, 6)); setBankOpen(false) }} onSluit={() => setBankOpen(false)} />
      <button type="button" onClick={() => setOpen(v => !v)} className="flex h-12 flex-shrink-0 items-center gap-2.5 px-4 text-left md:px-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-petrol text-white"><Sparkles className="h-3.5 w-3.5" /></span>
        <span className="text-[14px] font-bold text-foreground">Praat met Daan<span className="text-flame">.</span></span>
        <span className="hidden text-[12px] text-muted-foreground sm:inline">{bezig === 'denkt' ? 'Daan denkt na...' : bezig === 'past aan' ? 'Daan past de nieuwsbrief aan...' : 'Zeg wat er anders moet; je ziet het meteen veranderen.'}</span>
        <span className="ml-auto text-muted-foreground">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</span>
      </button>

      {open && (
        <>
          <div ref={lijstRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 md:px-6">
            {regels.length === 0 ? (
              <div className="flex flex-wrap gap-2 pb-2">
                {VOORBEELDEN.map(v => (
                  <button key={v} type="button" disabled={disabled} onClick={() => verstuur(v)} className="rounded-full border border-border px-3 py-1.5 text-[12px] text-foreground transition-colors hover:border-petrol/50 hover:text-petrol disabled:opacity-50 dark:hover:text-foreground">{v}</button>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5 py-1">
                {regels.map(r => (
                  <div key={r.id} className={cn('flex', r.rol === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed', r.rol === 'user' ? 'rounded-br-md bg-petrol text-white' : 'rounded-bl-md bg-muted text-foreground', r.teruggedraaid && 'opacity-60')}>
                      <p>{r.tekst}</p>
                      {r.stappen && r.stappen.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 border-t border-black/5 pt-1.5 text-[11.5px] text-muted-foreground dark:border-white/10">
                          {r.stappen.map((s, i) => <li key={i} className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-flame" />{s}</li>)}
                        </ul>
                      )}
                      {r.vorige && !r.teruggedraaid && !bezig && (
                        <button type="button" onClick={() => draaiTerug(r)} className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-petrol hover:underline dark:text-foreground"><RotateCcw className="h-3 w-3" /> Maak ongedaan</button>
                      )}
                      {r.teruggedraaid && <p className="mt-1 text-[11px] italic text-muted-foreground">Teruggedraaid</p>}
                    </div>
                  </div>
                ))}
                {bezig && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5">
                      {[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-petrol/60" style={{ animationDelay: `${i * 140}ms` }} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={e => { e.preventDefault(); verstuur(invoer) }}
            className="flex flex-shrink-0 items-end gap-2 border-t border-border/60 px-4 py-2.5 md:px-6"
          >
            <button type="button" onClick={() => setBankOpen(true)} disabled={disabled || !!bezig} title="Foto uit de fotobank meegeven" className={cn('relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-petrol/50 hover:text-petrol disabled:opacity-50', fotos.length > 0 && 'border-petrol text-petrol')}>
              <Images className="h-[18px] w-[18px]" />
              {fotos.length > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-flame px-1 text-[10px] font-bold text-white">{fotos.length}</span>}
            </button>
            <textarea
              ref={invoerRef}
              value={invoer}
              onChange={e => setInvoer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); verstuur(invoer) } }}
              rows={1}
              disabled={disabled || !!bezig}
              placeholder={fotos.length > 0 ? `Wat moet Daan met ${fotos.length === 1 ? 'deze foto' : 'deze foto’s'} doen?` : 'Bijvoorbeeld: maak de kop korter en zet er een knop onder'}
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] text-foreground outline-none focus:border-petrol disabled:opacity-60 dark:focus:border-white/25"
            />
            <button type="submit" disabled={disabled || !!bezig || !invoer.trim()} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-flame text-white transition-all hover:bg-[#E04520] disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </div>
  )
}
