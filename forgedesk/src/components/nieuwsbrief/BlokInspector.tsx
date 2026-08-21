import { useRef, useState, type ReactNode } from 'react'
import { AlignLeft, AlignCenter, AlignRight, ImagePlus, RefreshCw, Trash2, Copy, X, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { uploadAfbeelding } from '@/services/nieuwsbriefService'
import { RijkeTekstVeld } from './RijkeTekstVeld'
import {
  type Blok, type Uitlijning, type NieuwsbriefStijl, type Kolom,
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

function AfbeeldingVeld({ label, url, onChange }: { label: string; url: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = useState(false)
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
      <input value={url} onChange={e => onChange(e.target.value)} placeholder="of plak een afbeeldings-URL" spellCheck={false} className={cn(INPUT, 'mt-1.5 font-mono text-[11px]')} />
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
      </>
      break
    case 'tekst':
      velden = <>
        <Veld label="Tekst"><RijkeTekstVeld value={blok.html} onChange={v => set({ html: v })} rows={6} /></Veld>
        <Keuze label="Lettergrootte" value={blok.grootte} opties={[{ value: 'klein', label: 'Klein' }, { value: 'normaal', label: 'Normaal' }, { value: 'groot', label: 'Groot' }]} onChange={v => set({ grootte: v })} />
        <UitlijnKeuze value={blok.uitlijning} onChange={v => set({ uitlijning: v })} />
      </>
      break
    case 'afbeelding':
      velden = <>
        <AfbeeldingVeld label="Afbeelding" url={blok.url} onChange={v => set({ url: v })} />
        <Tekst label="Alt-tekst (voor als de foto niet laadt)" value={blok.alt} onChange={v => set({ alt: v })} />
        <Tekst label="Bijschrift" value={blok.bijschrift} onChange={v => set({ bijschrift: v })} />
        <Url label="Link bij klikken (optioneel)" value={blok.link} onChange={v => set({ link: v })} />
        <Keuze label="Breedte" value={blok.breedte} opties={[{ value: 'vol', label: 'Volle breedte' }, { value: 'smal', label: 'Smaller' }]} onChange={v => set({ breedte: v })} />
      </>
      break
    case 'knop':
      velden = <>
        <Tekst label="Knoptekst" value={blok.tekst} onChange={v => set({ tekst: v })} />
        <Url label="Link" value={blok.url} onChange={v => set({ url: v })} />
        <Keuze label="Stijl" value={blok.stijl} opties={[{ value: 'vol', label: 'Gevuld' }, { value: 'omlijnd', label: 'Omlijnd' }]} onChange={v => set({ stijl: v })} />
        <Keuze label="Breedte" value={blok.breedte} opties={[{ value: 'auto', label: 'Op maat' }, { value: 'vol', label: 'Volle breedte' }]} onChange={v => set({ breedte: v })} />
        <UitlijnKeuze value={blok.uitlijning} onChange={v => set({ uitlijning: v })} />
      </>
      break
    case 'afbeelding_tekst':
      velden = <>
        <AfbeeldingVeld label="Afbeelding" url={blok.url} onChange={v => set({ url: v })} />
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
      velden = ([0, 1] as const).map(i => (
        <div key={i} className="space-y-3 rounded-xl border border-border/60 p-3">
          <div className="text-[12px] font-bold text-foreground">{i === 0 ? 'Linker kolom' : 'Rechter kolom'}</div>
          <AfbeeldingVeld label="Afbeelding (optioneel)" url={blok.kolommen[i].url} onChange={v => setKolom(i, { url: v })} />
          <Tekst label="Kop" value={blok.kolommen[i].kop} onChange={v => setKolom(i, { kop: v })} />
          <Veld label="Tekst"><RijkeTekstVeld value={blok.kolommen[i].html} onChange={v => setKolom(i, { html: v })} rows={3} /></Veld>
          <Tekst label="Knoptekst (optioneel)" value={blok.kolommen[i].knopTekst} onChange={v => setKolom(i, { knopTekst: v })} />
          {blok.kolommen[i].knopTekst && <Url label="Knop-link" value={blok.kolommen[i].knopUrl} onChange={v => setKolom(i, { knopUrl: v })} />}
        </div>
      ))
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
      velden = <p className="text-[13px] text-muted-foreground">Een dunne lijn over de volle breedte. Geen instellingen.</p>
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
          <button type="button" title="Dupliceren" onClick={onDupliceer} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Copy className="h-4 w-4" /></button>
          <button type="button" title="Verwijderen" onClick={onVerwijder} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#C0451A] dark:hover:text-[#FF8866]"><Trash2 className="h-4 w-4" /></button>
          <button type="button" title="Sluiten" onClick={onSluit} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">{velden}</div>
    </div>
  )
}

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
