import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlignLeft, AlignCenter, AlignRight, ImagePlus, RefreshCw, Trash2, Copy, X, Palette, Image as Images, Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { uploadAfbeelding, getGebruikteLabels } from '@/services/nieuwsbriefService'
import { RijkeTekstVeld } from './RijkeTekstVeld'
import { FotoBank } from './FotoBank'
import { bewaarBlok } from './blokBibliotheek'
import {
  type Blok, type Uitlijning, type NieuwsbriefStijl, type Kolom, type BlokOpmaak,
  BLOK_LABEL, FONT_OPTIES, STANDAARD_STIJL,
} from './nieuwsbriefBlokken'

const INPUT = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-petrol focus:ring-2 focus:ring-petrol/10 dark:focus:border-white/25 dark:focus:ring-white/10'
const LABEL = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground'

function Veld({ label, children }: { label: string; children: ReactNode }) {
  return <div><span className={LABEL}>{label}</span>{children}</div>
}

function Tekst({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Veld label={label}><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={INPUT} /></Veld>
}

function Url({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Veld label={label}><input value={value} onChange={e => onChange(e.target.value)} placeholder="https://..." spellCheck={false} className={cn(INPUT, 'font-mono text-[12px]')} /></Veld>
}

function Keuze<T extends string | number>({ label, value, opties, onChange }: { label: string; value: T; opties: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Veld label={label}>
      <div className="flex flex-wrap gap-1">
        {opties.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors',
              value === o.value ? 'border-petrol bg-petrol/10 text-petrol dark:border-white/30 dark:bg-white/10 dark:text-foreground' : 'border-border text-muted-foreground hover:border-petrol/40 hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Veld>
  )
}

function UitlijnKeuze({ value, onChange }: { value: Uitlijning; onChange: (v: Uitlijning) => void }) {
  const items: { v: Uitlijning; Icon: typeof AlignLeft; t: string }[] = [
    { v: 'links', Icon: AlignLeft, t: 'Links' }, { v: 'midden', Icon: AlignCenter, t: 'Midden' }, { v: 'rechts', Icon: AlignRight, t: 'Rechts' },
  ]
  return (
    <Veld label="Uitlijning">
      <div className="inline-flex rounded-lg border border-border p-0.5">
        {items.map(({ v, Icon, t }) => (
          <button key={v} type="button" title={t} onClick={() => onChange(v)} className={cn('rounded-md p-1.5 transition-colors', value === v ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </Veld>
  )
}

function AfbeeldingVeld({ label, url, onChange, onKiesMetAlt }: { label: string; url: string; onChange: (url: string) => void; onKiesMetAlt?: (url: string, alt: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  const upload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setBezig(true)
    try {
      onChange(await uploadAfbeelding(file))
      toast.success('Afbeelding geüpload')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload mislukt')
    } finally {
      setBezig(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }
  return (
    <Veld label={label}>
      <div
        className="overflow-hidden rounded-lg border border-dashed border-border bg-background"
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
        onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files) }}
      >
        {url ? (
          <div className="relative">
            <img src={url} alt="" className="block max-h-40 w-full object-cover" />
            <button type="button" onClick={() => onChange('')} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80" aria-label="Afbeelding verwijderen">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={bezig} className="flex w-full flex-col items-center gap-1.5 px-3 py-6 text-center text-[12px] text-muted-foreground hover:text-foreground disabled:opacity-60">
            {bezig ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5 text-petrol" />}
            {bezig ? 'Uploaden...' : 'Kies een foto of sleep ’m hierheen'}
            <span className="text-[11px] text-muted-foreground/70">JPG, PNG of WebP, max 10MB</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files)} />
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <button type="button" onClick={() => setBankOpen(true)} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-petrol/30 bg-petrol/[0.06] px-2.5 py-1.5 text-[12px] font-semibold text-petrol transition-colors hover:bg-petrol/[0.12] dark:border-white/20 dark:bg-white/[0.05] dark:text-foreground">
          <Images className="h-3.5 w-3.5" /> Fotobank
        </button>
        <input value={url} onChange={e => onChange(e.target.value)} placeholder="of plak een URL" spellCheck={false} className={cn(INPUT, 'min-w-0 font-mono text-[11px]')} />
      </div>
      <FotoBank open={bankOpen} onSluit={() => setBankOpen(false)} onKies={(urls, items) => { if (onKiesMetAlt) onKiesMetAlt(urls[0], items[0]?.titel ?? ''); else onChange(urls[0]); setBankOpen(false) }} />
    </Veld>
  )
}

function Schuif({ label, value, min, max, step = 1, eenheid = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; eenheid?: string; onChange: (v: number) => void }) {
  return (
    <Veld label={`${label}: ${value}${eenheid}`}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-[#1A535C]" />
    </Veld>
  )
}

function OptioneleKleur({ label, value, standaard, onChange }: { label: string; value: string | undefined; standaard: string; onChange: (v: string | undefined) => void }) {
  return (
    <Veld label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || standaard} onChange={e => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded-md border border-border bg-background p-0.5" />
        <span className="flex-1 font-mono text-[12px] uppercase text-muted-foreground">{value || 'Standaard'}</span>
        {value && <button type="button" onClick={() => onChange(undefined)} className="text-[11px] font-medium text-petrol hover:underline dark:text-foreground">Reset</button>}
      </div>
    </Veld>
  )
}

function KleurVeld({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Veld label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded-md border border-border bg-background p-0.5" />
        <input value={value} onChange={e => onChange(e.target.value)} spellCheck={false} className={cn(INPUT, 'font-mono text-[12px] uppercase')} />
      </div>
    </Veld>
  )
}

interface Props {
  blok: Blok | null
  stijl: NieuwsbriefStijl
  onChange: (blok: Blok) => void
  onStijlChange: (stijl: NieuwsbriefStijl) => void
  onDupliceer: () => void
  onVerwijder: () => void
  onSluit: () => void
}

export function BlokInspector({ blok, stijl, onChange, onStijlChange, onDupliceer, onVerwijder, onSluit }: Props) {
  if (!blok) return <StijlPaneel stijl={stijl} onChange={onStijlChange} />

  const set = <K extends keyof Blok>(velden: Partial<Extract<Blok, { type: typeof blok.type }>>) => onChange({ ...blok, ...velden } as Blok & Record<K, unknown>)

  let velden: ReactNode = null
  switch (blok.type) {
    case 'header':
      velden = <>
        <Tekst label="Bedrijfsnaam" value={blok.naam} onChange={v => set({ naam: v })} />
        <AfbeeldingVeld label="Logo (optioneel, vervangt de naam)" url={blok.logoUrl} onChange={v => set({ logoUrl: v })} />
        <Tekst label="Onderregel" value={blok.tagline} onChange={v => set({ tagline: v })} placeholder="Bijv. Nieuwsbrief september" />
        <UitlijnKeuze value={blok.uitlijning} onChange={v => set({ uitlijning: v })} />
      </>
      break
    case 'kop':
      velden = <>
        <Veld label="Tekst"><textarea value={blok.tekst} onChange={e => set({ tekst: e.target.value })} rows={2} className={cn(INPUT, 'resize-none font-semibold')} /></Veld>
        <Keuze label="Grootte" value={blok.niveau} opties={[{ value: 1, label: 'Groot' }, { value: 2, label: 'Middel' }, { value: 3, label: 'Klein' }]} onChange={v => set({ niveau: v })} />
        <UitlijnKeuze value={blok.uitlijning} onChange={v => set({ uitlijning: v })} />
        <OptioneleKleur label="Kleur" value={blok.kleur} standaard={stijl.tekst} onChange={v => set({ kleur: v })} />
      </>
      break
    case 'tekst':
      velden = <>
        <Veld label="Tekst"><RijkeTekstVeld value={blok.html} onChange={v => set({ html: v })} rows={6} /></Veld>
        <Keuze label="Lettergrootte" value={blok.grootte} opties={[{ value: 'klein', label: 'Klein' }, { value: 'normaal', label: 'Normaal' }, { value: 'groot', label: 'Groot' }]} onChange={v => set({ grootte: v })} />
        <UitlijnKeuze value={blok.uitlijning} onChange={v => set({ uitlijning: v })} />
        <Schuif label="Regelafstand" value={blok.regelafstand ?? 1.65} min={1.2} max={2.2} step={0.05} onChange={v => set({ regelafstand: v })} />
        <OptioneleKleur label="Tekstkleur" value={blok.kleur} standaard={stijl.secundair} onChange={v => set({ kleur: v })} />
      </>
      break
    case 'afbeelding':
      velden = <>
        <AfbeeldingVeld label="Afbeelding" url={blok.url} onChange={v => set({ url: v })} onKiesMetAlt={(url, alt) => set({ url, alt: blok.alt || alt })} />
        <Tekst label="Alt-tekst (voor als de foto niet laadt)" value={blok.alt} onChange={v => set({ alt: v })} />
        <Tekst label="Bijschrift" value={blok.bijschrift} onChange={v => set({ bijschrift: v })} />
        <Url label="Link bij klikken (optioneel)" value={blok.link} onChange={v => set({ link: v })} />
        <Schuif label="Breedte" value={blok.breedtePct ?? (blok.breedte === 'vol' ? 100 : 75)} min={20} max={100} step={5} eenheid="%" onChange={v => set({ breedtePct: v, breedte: v === 100 ? 'vol' : 'smal' })} />
        <div className="-mt-2 flex gap-1">{[25, 33, 50, 66, 75, 100].map(p => <button key={p} type="button" onClick={() => set({ breedtePct: p, breedte: p === 100 ? 'vol' : 'smal' })} className={cn('rounded-md border px-2 py-0.5 font-mono text-[11px]', (blok.breedtePct ?? (blok.breedte === 'vol' ? 100 : 75)) === p ? 'border-petrol text-petrol dark:border-white/30 dark:text-foreground' : 'border-border text-muted-foreground hover:border-petrol/40')}>{p}%</button>)}</div>
        <UitlijnKeuze value={blok.uitlijning ?? 'midden'} onChange={v => set({ uitlijning: v })} />
        <Schuif label="Hoekradius" value={blok.radius ?? 8} min={0} max={32} step={2} eenheid="px" onChange={v => set({ radius: v })} />
      </>
      break
    case 'knop':
      velden = <>
        <Tekst label="Knoptekst" value={blok.tekst} onChange={v => set({ tekst: v })} />
        <Url label="Link" value={blok.url} onChange={v => set({ url: v })} />
        <Keuze label="Stijl" value={blok.stijl} opties={[{ value: 'vol', label: 'Gevuld' }, { value: 'omlijnd', label: 'Omlijnd' }]} onChange={v => set({ stijl: v })} />
        <Keuze label="Breedte" value={blok.breedte} opties={[{ value: 'auto', label: 'Op maat' }, { value: 'vol', label: 'Volle breedte' }]} onChange={v => set({ breedte: v })} />
        <Keuze label="Formaat" value={blok.grootte ?? 'normaal'} opties={[{ value: 'klein', label: 'Klein' }, { value: 'normaal', label: 'Normaal' }, { value: 'groot', label: 'Groot' }]} onChange={v => set({ grootte: v })} />
        <UitlijnKeuze value={blok.uitlijning} onChange={v => set({ uitlijning: v })} />
        <OptioneleKleur label="Knopkleur" value={blok.kleur} standaard={stijl.accent} onChange={v => set({ kleur: v })} />
        <Schuif label="Hoekradius" value={blok.radius ?? 8} min={0} max={30} step={2} eenheid="px" onChange={v => set({ radius: v })} />
      </>
      break
    case 'afbeelding_tekst':
      velden = <>
        <AfbeeldingVeld label="Afbeelding" url={blok.url} onChange={v => set({ url: v })} onKiesMetAlt={(url, alt) => set({ url, alt: blok.alt || alt })} />
        <Tekst label="Alt-tekst" value={blok.alt} onChange={v => set({ alt: v })} />
        <Keuze label="Foto staat" value={blok.positie} opties={[{ value: 'links', label: 'Links' }, { value: 'rechts', label: 'Rechts' }]} onChange={v => set({ positie: v })} />
        <Tekst label="Kop" value={blok.kop} onChange={v => set({ kop: v })} />
        <Veld label="Tekst"><RijkeTekstVeld value={blok.html} onChange={v => set({ html: v })} rows={4} /></Veld>
        <Tekst label="Knoptekst (optioneel)" value={blok.knopTekst} onChange={v => set({ knopTekst: v })} />
        {blok.knopTekst && <Url label="Knop-link" value={blok.knopUrl} onChange={v => set({ knopUrl: v })} />}
      </>
      break
    case 'kolommen': {
      const setKolom = (i: 0 | 1, v: Partial<Kolom>) => {
        const kolommen: [Kolom, Kolom] = [{ ...blok.kolommen[0] }, { ...blok.kolommen[1] }]
        kolommen[i] = { ...kolommen[i], ...v }
        set({ kolommen })
      }
      velden = <>
        <Keuze label="Verhouding" value={blok.verhouding ?? '1:1'} opties={[{ value: '1:1', label: 'Gelijk' }, { value: '1:2', label: 'Smal · breed' }, { value: '2:1', label: 'Breed · smal' }]} onChange={v => set({ verhouding: v })} />
        {([0, 1] as const).map(i => (
        <div key={i} className="space-y-3 rounded-xl border border-border/60 p-3">
          <div className="text-[12px] font-bold text-foreground">{i === 0 ? 'Linker kolom' : 'Rechter kolom'}</div>
          <AfbeeldingVeld label="Afbeelding (optioneel)" url={blok.kolommen[i].url} onChange={v => setKolom(i, { url: v })} />
          <Tekst label="Kop" value={blok.kolommen[i].kop} onChange={v => setKolom(i, { kop: v })} />
          <Veld label="Tekst"><RijkeTekstVeld value={blok.kolommen[i].html} onChange={v => setKolom(i, { html: v })} rows={3} /></Veld>
          <Tekst label="Knoptekst (optioneel)" value={blok.kolommen[i].knopTekst} onChange={v => setKolom(i, { knopTekst: v })} />
          {blok.kolommen[i].knopTekst && <Url label="Knop-link" value={blok.kolommen[i].knopUrl} onChange={v => setKolom(i, { knopUrl: v })} />}
        </div>
        ))}
      </>
      break
    }
    case 'quote':
      velden = <>
        <Veld label="Citaat"><textarea value={blok.tekst} onChange={e => set({ tekst: e.target.value })} rows={3} className={cn(INPUT, 'resize-none')} /></Veld>
        <Tekst label="Van wie" value={blok.bron} onChange={v => set({ bron: v })} placeholder="Naam, bedrijf" />
      </>
      break
    case 'highlight':
      velden = <>
        <Keuze label="Kleur" value={blok.variant} opties={[{ value: 'zacht', label: 'Zacht grijs' }, { value: 'accent', label: 'Accentkleur' }, { value: 'donker', label: 'Donker' }]} onChange={v => set({ variant: v })} />
        <Tekst label="Kop" value={blok.kop} onChange={v => set({ kop: v })} />
        <Veld label="Tekst"><RijkeTekstVeld value={blok.html} onChange={v => set({ html: v })} rows={4} /></Veld>
        <Tekst label="Knoptekst (optioneel)" value={blok.knopTekst} onChange={v => set({ knopTekst: v })} />
        {blok.knopTekst && <Url label="Knop-link" value={blok.knopUrl} onChange={v => set({ knopUrl: v })} />}
      </>
      break
    case 'lijn':
      velden = <>
        <Schuif label="Dikte" value={blok.dikte ?? 1} min={1} max={8} eenheid="px" onChange={v => set({ dikte: v })} />
        <Schuif label="Breedte" value={blok.breedtePct ?? 100} min={10} max={100} step={5} eenheid="%" onChange={v => set({ breedtePct: v })} />
        <OptioneleKleur label="Kleur" value={blok.kleur} standaard="#EBEBEB" onChange={v => set({ kleur: v })} />
      </>
      break
    case 'ruimte':
      velden = <Veld label={`Hoogte: ${blok.hoogte}px`}>
        <input type="range" min={4} max={96} step={4} value={blok.hoogte} onChange={e => set({ hoogte: Number(e.target.value) })} className="w-full accent-[#1A535C]" />
      </Veld>
      break
    case 'footer':
      velden = <>
        <Tekst label="Ondertekening" value={blok.bedrijfsnaam} onChange={v => set({ bedrijfsnaam: v })} />
        <Tekst label="Adres of slogan" value={blok.adres} onChange={v => set({ adres: v })} />
        <Tekst label="Telefoon" value={blok.telefoon} onChange={v => set({ telefoon: v })} />
        <Url label="Website" value={blok.website} onChange={v => set({ website: v })} />
        <Url label="LinkedIn" value={blok.linkedin} onChange={v => set({ linkedin: v })} />
        <Url label="Instagram" value={blok.instagram} onChange={v => set({ instagram: v })} />
        <Url label="Facebook" value={blok.facebook} onChange={v => set({ facebook: v })} />
      </>
      break
    case 'html':
      velden = <>
        <Veld label="HTML">
          <textarea value={blok.html} onChange={e => set({ html: e.target.value })} rows={12} spellCheck={false} className={cn(INPUT, 'resize-y font-mono text-[12px] leading-relaxed')} />
        </Veld>
        <p className="text-[12px] leading-relaxed text-muted-foreground">Gebruik inline styles en tabellen; mailclients negeren CSS-klassen. Breedte max 536px.</p>
      </>
      break
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="text-[14px] font-bold text-foreground">{BLOK_LABEL[blok.type]}<span className="text-flame">.</span></span>
        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" title="Bewaar als eigen blok" onClick={() => {
            const naam = window.prompt('Naam voor dit blok (komt in het palet onder "Eigen blokken")', BLOK_LABEL[blok.type])
            if (!naam?.trim()) return
            bewaarBlok(naam.trim(), blok)
              .then(() => toast.success('Blok bewaard in je palet'))
              .catch(err => { toast.error('Kon het blok niet bewaren'); console.error('[nieuwsbrief] blok bewaren mislukt:', err) })
          }} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Bookmark className="h-4 w-4" /></button>
          <button type="button" title="Dupliceren" onClick={onDupliceer} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Copy className="h-4 w-4" /></button>
          <button type="button" title="Verwijderen" onClick={onVerwijder} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#C0451A] dark:hover:text-[#FF8866]"><Trash2 className="h-4 w-4" /></button>
          <button type="button" title="Sluiten" onClick={onSluit} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {velden}
        <BlokOpmaakVelden opmaak={blok.opmaak} onChange={opmaak => onChange({ ...blok, opmaak })} />
      </div>
    </div>
  )
}

function BlokOpmaakVelden({ opmaak, onChange }: { opmaak: BlokOpmaak | undefined; onChange: (o: BlokOpmaak | undefined) => void }) {
  const [open, setOpen] = useState(!!opmaak && Object.keys(opmaak).length > 0)
  const [labels, setLabels] = useState<string[]>([])
  const o = opmaak ?? {}

  useEffect(() => {
    if (!open) return
    let actief = true
    getGebruikteLabels()
      .then(l => { if (actief) setLabels(l) })
      .catch(err => console.error('[nieuwsbrief] labels laden mislukt:', err))
    return () => { actief = false }
  }, [open])
  const set = (v: Partial<BlokOpmaak>) => {
    const volgende = { ...o, ...v }
    ;(Object.keys(volgende) as Array<keyof BlokOpmaak>).forEach(k => { if (volgende[k] === undefined || volgende[k] === false || volgende[k] === 0) delete volgende[k] })
    onChange(Object.keys(volgende).length ? volgende : undefined)
  }
  return (
    <div className="rounded-xl border border-border/60">
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="text-[12px] font-bold text-foreground">Blok-opmaak</span>
        <span className="text-[11px] text-muted-foreground">{open ? 'Verberg' : 'Achtergrond, ruimte, mobiel, doelgroep'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border/60 p-3">
          <OptioneleKleur label="Achtergrond van dit blok" value={o.achtergrond} standaard="#F5F4F1" onChange={v => set({ achtergrond: v })} />
          <Schuif label="Ruimte boven" value={o.ruimteBoven ?? 0} min={0} max={64} step={4} eenheid="px" onChange={v => set({ ruimteBoven: v })} />
          <Schuif label="Ruimte onder" value={o.ruimteOnder ?? 0} min={0} max={64} step={4} eenheid="px" onChange={v => set({ ruimteOnder: v })} />
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={!!o.verbergMobiel} onChange={e => set({ verbergMobiel: e.target.checked })} className="h-4 w-4 accent-[#1A535C]" />
            Verberg dit blok op telefoons
          </label>
          <div className="space-y-1.5 border-t border-border/60 pt-3">
            <div className="text-[12px] font-semibold text-foreground">Alleen voor klanten met label</div>
            <input
              list="doen-klantlabels"
              value={o.alleenLabel ?? ''}
              onChange={e => set({ alleenLabel: e.target.value.trim() || undefined })}
              placeholder="Iedereen ziet dit blok"
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-petrol dark:focus:border-white/25"
            />
            <datalist id="doen-klantlabels">
              {labels.map(l => <option key={l} value={l} />)}
            </datalist>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Andere ontvangers krijgen dit blok niet te zien. In de preview en de testmail staat het er wel, anders kun
              je het niet controleren.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const THEMAS: { naam: string; stijl: Partial<NieuwsbriefStijl> }[] = [
  { naam: 'Sign Company', stijl: { accent: '#F15025', tekst: '#1A1A1A', secundair: '#57574F', kaart: '#FFFFFF', achtergrond: '#F5F4F1' } },
  { naam: 'Petrol', stijl: { accent: '#1A535C', tekst: '#10282C', secundair: '#4E6366', kaart: '#FFFFFF', achtergrond: '#E9EFEF' } },
  { naam: 'Warm', stijl: { accent: '#B5530D', tekst: '#2B1D12', secundair: '#6B5A4C', kaart: '#FFFCF8', achtergrond: '#F3E9DD' } },
  { naam: 'Donker', stijl: { accent: '#F15025', tekst: '#F5F4F1', secundair: '#C9C7C0', kaart: '#1E1E1C', achtergrond: '#111110' } },
  { naam: 'Frisgroen', stijl: { accent: '#2E7D5B', tekst: '#14251E', secundair: '#4F6A5E', kaart: '#FFFFFF', achtergrond: '#EAF3EE' } },
  { naam: 'Inkt', stijl: { accent: '#1A1A1A', tekst: '#1A1A1A', secundair: '#57574F', kaart: '#FFFFFF', achtergrond: '#FFFFFF' } },
]

function StijlPaneel({ stijl, onChange }: { stijl: NieuwsbriefStijl; onChange: (s: NieuwsbriefStijl) => void }) {
  const set = (v: Partial<NieuwsbriefStijl>) => onChange({ ...stijl, ...v })
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Palette className="h-4 w-4 text-petrol" />
        <span className="text-[14px] font-bold text-foreground">Vormgeving<span className="text-flame">.</span></span>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <p className="text-[12px] leading-relaxed text-muted-foreground">Klik op een blok in het midden om het te bewerken. Hier stel je de kleuren en het lettertype van de hele nieuwsbrief in.</p>
        <Veld label="Thema">
          <div className="grid grid-cols-3 gap-1.5">
            {THEMAS.map(t => (
              <button key={t.naam} type="button" onClick={() => onChange({ ...stijl, ...t.stijl })} className="rounded-lg border border-border p-1.5 text-left transition-colors hover:border-petrol/50">
                <span className="flex gap-1">
                  {[t.stijl.accent, t.stijl.tekst, t.stijl.achtergrond].map((k, i) => <span key={i} className="h-4 flex-1 rounded" style={{ background: k, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }} />)}
                </span>
                <span className="mt-1 block text-[11px] font-semibold text-foreground">{t.naam}</span>
              </button>
            ))}
          </div>
        </Veld>
        <KleurVeld label="Accentkleur (knoppen, links)" value={stijl.accent} onChange={v => set({ accent: v })} />
        <KleurVeld label="Tekstkleur" value={stijl.tekst} onChange={v => set({ tekst: v })} />
        <KleurVeld label="Secundaire tekst" value={stijl.secundair} onChange={v => set({ secundair: v })} />
        <KleurVeld label="Achtergrond rondom" value={stijl.achtergrond} onChange={v => set({ achtergrond: v })} />
        <KleurVeld label="Kaart" value={stijl.kaart} onChange={v => set({ kaart: v })} />
        <Veld label="Lettertype">
          <select value={stijl.font} onChange={e => set({ font: e.target.value })} className={INPUT}>
            {FONT_OPTIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            {!FONT_OPTIES.some(f => f.value === stijl.font) && <option value={stijl.font}>Eigen</option>}
          </select>
        </Veld>
        <button type="button" onClick={() => onChange({ ...STANDAARD_STIJL })} className="text-[12px] font-medium text-petrol hover:underline dark:text-foreground">Terug naar de huisstijl</button>
      </div>
    </div>
  )
}
