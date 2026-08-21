import { useEffect, useMemo, useState } from 'react'
import { Search, X, Check, Image as Images, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FotoBankItem {
  url: string
  titel: string
  categorie: 'project' | 'oplossing' | 'product' | 'site' | 'archief'
  groep: string
  w: number
  h: number
  datum: string
}

const CATEGORIE_LABEL: Record<FotoBankItem['categorie'] | 'alle', string> = {
  alle: 'Alles', project: 'Projecten', oplossing: 'Oplossingen', product: 'Producten', site: 'Site', archief: 'Archief',
}

let cache: FotoBankItem[] | null = null

// De index wordt gebouwd met scripts/fotobank-signcompany.mjs uit de lokale
// werkkopie van signcompany-next en als statisch bestand meegeleverd.
export async function laadFotoBank(): Promise<FotoBankItem[]> {
  if (cache) return cache
  const res = await fetch('/fotobank-signcompany.json', { cache: 'force-cache' })
  if (!res.ok) throw new Error('Fotobank niet gevonden')
  const data = await res.json() as { items: FotoBankItem[] }
  cache = data.items
  return cache
}

interface Props {
  open: boolean
  meerdere?: boolean
  onKies: (urls: string[], items: FotoBankItem[]) => void
  onSluit: () => void
}

export function FotoBank({ open, meerdere = false, onKies, onSluit }: Props) {
  const [items, setItems] = useState<FotoBankItem[]>([])
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [zoek, setZoek] = useState('')
  const [categorie, setCategorie] = useState<FotoBankItem['categorie'] | 'alle'>('alle')
  const [groep, setGroep] = useState<string>('')
  const [gekozen, setGekozen] = useState<string[]>([])
  const [limiet, setLimiet] = useState(120)

  useEffect(() => {
    if (!open) return
    setGekozen([])
    setLimiet(120)
    if (items.length > 0) return
    setLaden(true)
    laadFotoBank().then(setItems).catch(e => setFout(e instanceof Error ? e.message : 'Laden mislukt')).finally(() => setLaden(false))
  }, [open, items.length])

  const groepen = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of items) if (categorie === 'alle' || i.categorie === categorie) m.set(i.groep, (m.get(i.groep) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40)
  }, [items, categorie])

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter(i =>
      (categorie === 'alle' || i.categorie === categorie)
      && (!groep || i.groep === groep)
      && q.every(t => i.titel.toLowerCase().includes(t) || i.groep.toLowerCase().includes(t) || i.url.toLowerCase().includes(t)),
    )
  }, [items, zoek, categorie, groep])

  if (!open) return null

  const toggle = (url: string) => {
    if (!meerdere) { const item = items.find(i => i.url === url)!; onKies([url], [item]); return }
    setGekozen(prev => (prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onSluit} />
      <div className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Images className="h-5 w-5 text-petrol" />
          <div>
            <h2 className="text-[18px] font-extrabold tracking-[-0.3px] text-foreground">Fotobank Sign Company<span className="text-flame">.</span></h2>
            <p className="text-[12px] text-muted-foreground">{items.length} foto's van signcompany.nl. Ze laden rechtstreeks vanaf de site, dus altijd scherp in de mail.</p>
          </div>
          <button type="button" onClick={onSluit} className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Sluiten"><X className="h-[18px] w-[18px]" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input autoFocus value={zoek} onChange={e => setZoek(e.target.value)} placeholder="Zoek op project, plaats, product..." className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-petrol dark:focus:border-white/25" />
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border p-0.5">
            {(Object.keys(CATEGORIE_LABEL) as Array<FotoBankItem['categorie'] | 'alle'>).map(c => (
              <button key={c} type="button" onClick={() => { setCategorie(c); setGroep('') }} className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors', categorie === c ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {CATEGORIE_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        {groepen.length > 1 && categorie !== 'alle' && (
          <div className="flex gap-1.5 overflow-x-auto border-b border-border/60 px-5 py-2">
            <button type="button" onClick={() => setGroep('')} className={cn('flex-shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium', !groep ? 'border-petrol bg-petrol/10 text-petrol dark:border-white/30 dark:text-foreground' : 'border-border text-muted-foreground')}>Alle</button>
            {groepen.map(([g, n]) => (
              <button key={g} type="button" onClick={() => setGroep(g === groep ? '' : g)} className={cn('flex-shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium', groep === g ? 'border-petrol bg-petrol/10 text-petrol dark:border-white/30 dark:text-foreground' : 'border-border text-muted-foreground hover:border-petrol/40')}>
                {g} <span className="font-mono opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {laden ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" /> Fotobank laden...</div>
          ) : fout ? (
            <div className="py-16 text-center text-[13px] text-muted-foreground">{fout}. Draai <code className="font-mono">node scripts/fotobank-signcompany.mjs</code> om de index te bouwen.</div>
          ) : gefilterd.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-muted-foreground">Geen foto's gevonden voor deze zoekopdracht.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {gefilterd.slice(0, limiet).map(i => {
                  const aan = gekozen.includes(i.url)
                  return (
                    <button key={i.url} type="button" onClick={() => toggle(i.url)} title={`${i.titel}\n${i.w}×${i.h}`} className={cn('group relative overflow-hidden rounded-xl border-2 bg-muted text-left transition-all hover:-translate-y-[1px] hover:shadow-md', aan ? 'border-flame' : 'border-transparent hover:border-petrol/40')}>
                      <div className="aspect-[4/3] w-full overflow-hidden bg-[#ECEBE7]">
                        <img src={i.url} alt={i.titel} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      </div>
                      <div className="px-2 py-1.5">
                        <div className="truncate text-[12px] font-semibold text-foreground">{i.titel}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{i.groep || CATEGORIE_LABEL[i.categorie]} · {i.w}×{i.h}</div>
                      </div>
                      {aan && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-flame text-white"><Check className="h-3.5 w-3.5" /></span>}
                    </button>
                  )
                })}
              </div>
              {gefilterd.length > limiet && (
                <div className="pt-4 text-center">
                  <button type="button" onClick={() => setLimiet(l => l + 120)} className="rounded-xl border border-border px-4 py-2 text-[13px] font-medium text-foreground hover:border-petrol/50">Toon meer ({gefilterd.length - limiet} resterend)</button>
                </div>
              )}
            </>
          )}
        </div>

        {meerdere && (
          <div className="flex items-center gap-3 border-t border-border px-5 py-3">
            <span className="text-[13px] text-muted-foreground"><span className="font-mono font-semibold text-foreground">{gekozen.length}</span> gekozen</span>
            <button type="button" disabled={gekozen.length === 0} onClick={() => onKies(gekozen, gekozen.map(u => items.find(i => i.url === u)!).filter(Boolean))} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-flame px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#E04520] disabled:opacity-60">
              <Check className="h-4 w-4" /> Gebruik deze foto's
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
